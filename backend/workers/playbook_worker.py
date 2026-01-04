"""
Playbook Generation Worker for Aurastream.

This worker generates playbook reports on a schedule, synced with YouTube data refreshes.
It runs every 4 hours to provide fresh algorithmic insights for streamers.
Captures provenance for AI reasoning chains.

The worker can be run in two modes:
1. Continuous mode (default): Runs as a daemon, generating every 4 hours
2. Single-run mode: Generates once and exits (for cron jobs or manual triggers)

Usage:
    # Continuous mode (recommended for Docker/systemd)
    python -m backend.workers.playbook_worker
    
    # Single-run mode (for cron jobs)
    python -m backend.workers.playbook_worker --once
    
    # Force generation (bypass time check)
    python -m backend.workers.playbook_worker --once --force
"""

import argparse
import asyncio
import logging
import os
import signal
import sys
import time
import uuid
from datetime import datetime, timezone

import redis.asyncio as redis

from backend.workers.heartbeat import send_heartbeat, send_idle_heartbeat, report_execution
from backend.workers.execution_report import (
    create_report,
    submit_execution_report,
    ExecutionOutcome,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)

WORKER_NAME = "playbook_worker"

# Generation interval in seconds (4 hours - synced with YouTube data refresh)
GENERATION_INTERVAL = 4 * 60 * 60  # 4 hours

# Minimum time between generations (prevent spam)
MIN_GENERATION_GAP = 60 * 60  # 1 hour

# Intel freshness threshold (max age in minutes before warning)
INTEL_FRESHNESS_THRESHOLD = 60  # 1 hour

# Lock timeout for playbook generation (10 minutes)
PLAYBOOK_LOCK_TIMEOUT = 600

# Idempotency key settings
IDEMPOTENCY_KEY_PREFIX = "playbook:idempotency:"
IDEMPOTENCY_TTL = 3600  # 1 hour

# Graceful shutdown flag
_shutdown_requested = False


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    global _shutdown_requested
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    _shutdown_requested = True


async def get_redis_client():
    """Get async Redis client."""
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
    return redis.from_url(redis_url, decode_responses=True)


def _generate_idempotency_key() -> str:
    """
    Generate an idempotency key for the current hour.
    
    This ensures only one playbook is generated per hour, preventing
    duplicates from concurrent workers or retries.
    """
    now = datetime.now(timezone.utc)
    # Round to hour for idempotency
    hour_key = now.strftime("%Y-%m-%d-%H")
    return f"playbook:{hour_key}"


async def check_intel_freshness() -> tuple[bool, float, str]:
    """
    Check if intel data is fresh enough for playbook generation.
    
    Returns:
        Tuple of (is_fresh, age_minutes, message)
        - is_fresh: True if data is less than INTEL_FRESHNESS_THRESHOLD minutes old
        - age_minutes: Age of the intel data in minutes (or -1 if no data)
        - message: Human-readable status message
    """
    try:
        redis_client = await get_redis_client()
        last_intel_run = await redis_client.get("intel:worker:last_run")
        await redis_client.aclose()
        
        if not last_intel_run:
            return False, -1, "No intel data available - intel worker may not have run yet"
        
        now = datetime.now(timezone.utc)
        last_run_dt = datetime.fromisoformat(last_intel_run)
        age_minutes = (now - last_run_dt).total_seconds() / 60
        
        if age_minutes > INTEL_FRESHNESS_THRESHOLD:
            return False, age_minutes, f"Intel data is {age_minutes:.0f} min old (threshold: {INTEL_FRESHNESS_THRESHOLD} min)"
        
        return True, age_minutes, f"Intel data is fresh ({age_minutes:.0f} min old)"
        
    except Exception as e:
        logger.warning(f"Error checking intel freshness: {e}")
        return False, -1, f"Error checking intel freshness: {e}"


async def check_last_generation_time() -> tuple[bool, str]:
    """
    Check if enough time has passed since the last generation.
    
    Returns:
        Tuple of (should_generate, reason)
    """
    try:
        from backend.services.playbook.orchestrator_provenance import get_provenance_playbook_orchestrator
        
        service = get_provenance_playbook_orchestrator()
        latest = await service.repository.get_latest_report()
        
        if not latest:
            return True, "No previous reports found"
        
        last_timestamp = latest.get("report_timestamp")
        if not last_timestamp:
            return True, "No timestamp on last report"
        
        last_dt = datetime.fromisoformat(last_timestamp.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        elapsed = (now - last_dt).total_seconds()
        
        if elapsed < MIN_GENERATION_GAP:
            return False, f"Last generation was {elapsed/60:.0f} minutes ago (min gap: {MIN_GENERATION_GAP/60:.0f} min)"
        
        return True, f"Last generation was {elapsed/3600:.1f} hours ago"
        
    except Exception as e:
        logger.warning(f"Error checking last generation time: {e}")
        return True, "Error checking - proceeding with generation"


async def run_generation(force: bool = False) -> dict:
    """
    Execute a single playbook generation.
    
    Args:
        force: If True, bypass the time check and idempotency check
        
    Returns:
        Generation result dictionary
    """
    from backend.services.distributed_lock import worker_lock, LockAcquisitionError
    
    logger.info("=" * 60)
    logger.info("PLAYBOOK GENERATION STARTING")
    logger.info("=" * 60)
    
    start_time = time.time()
    
    try:
        # Check idempotency key (unless forced)
        if not force:
            redis_client = await get_redis_client()
            idempotency_key = _generate_idempotency_key()
            full_key = f"{IDEMPOTENCY_KEY_PREFIX}{idempotency_key}"
            
            # Try to set the key (only succeeds if not already set)
            was_set = await redis_client.set(full_key, "1", nx=True, ex=IDEMPOTENCY_TTL)
            await redis_client.aclose()
            
            if not was_set:
                logger.info(f"Playbook already generated this hour (key: {idempotency_key})")
                return {
                    "skipped": True,
                    "reason": "idempotency_key_exists",
                    "idempotency_key": idempotency_key,
                }
        
        # Acquire distributed lock to prevent concurrent playbook generation
        async with worker_lock("playbook", "generation", timeout=PLAYBOOK_LOCK_TIMEOUT):
            # Check if we should generate
            if not force:
                should_generate, reason = await check_last_generation_time()
                logger.info(f"Generation check: {reason}")
                
                if not should_generate:
                    return {
                        "skipped": True,
                        "reason": reason,
                    }
            
            # Check intel freshness before generating
            is_fresh, age_minutes, freshness_msg = await check_intel_freshness()
            logger.info(f"Intel freshness check: {freshness_msg}")
            
            if not is_fresh and age_minutes > 0:
                logger.warning(
                    "Proceeding with playbook generation despite stale intel data. "
                    "Results may not reflect latest intel analysis."
                )
            elif not is_fresh and age_minutes < 0:
                logger.warning(
                    "No intel data available. Playbook will be generated without intel insights."
                )
            
            # Import here to avoid circular imports
            from backend.services.playbook.orchestrator_provenance import get_provenance_playbook_orchestrator
            
            service = get_provenance_playbook_orchestrator()
            
            # Generate execution ID for provenance tracking
            execution_id = str(uuid.uuid4())[:8]
            
            logger.info("Fetching trend data...")
            logger.info("  - YouTube trending videos")
            logger.info("  - Twitch live streams")
            logger.info("  - Twitch top games")
            logger.info("  - Twitch viral clips")
            
            # Generate the playbook with provenance capture
            playbook = await service.generate_playbook_with_provenance(
                execution_id=execution_id,
                save_to_db=True
            )
            
            elapsed = time.time() - start_time
            
            logger.info("=" * 60)
            logger.info("PLAYBOOK GENERATION COMPLETE")
            logger.info("=" * 60)
            logger.info(f"  Headline: {playbook.headline}")
            logger.info(f"  Mood: {playbook.mood}")
            logger.info(f"  Golden Hours: {len(playbook.golden_hours)}")
            logger.info(f"  Niche Opportunities: {len(playbook.niche_opportunities)}")
            logger.info(f"  Viral Hooks: {len(playbook.viral_hooks)}")
            logger.info(f"  Strategies: {len(playbook.strategies)}")
            logger.info(f"  Insight Cards: {len(playbook.insight_cards)}")
            logger.info(f"  Duration: {elapsed:.2f}s")
            logger.info(f"  Intel Data Age: {age_minutes:.0f} min" if age_minutes >= 0 else "  Intel Data: Not available")
            logger.info("=" * 60)
            
            return {
                "success": True,
                "headline": playbook.headline,
                "mood": playbook.mood,
                "golden_hours_count": len(playbook.golden_hours),
                "niche_opportunities_count": len(playbook.niche_opportunities),
                "viral_hooks_count": len(playbook.viral_hooks),
                "strategies_count": len(playbook.strategies),
                "insight_cards_count": len(playbook.insight_cards),
                "duration_seconds": elapsed,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "intel_data_age_minutes": age_minutes if age_minutes >= 0 else None,
            }
    
    except LockAcquisitionError:
        elapsed = time.time() - start_time
        logger.warning("Could not acquire playbook generation lock - another instance is already running")
        # Clear idempotency key on lock failure to allow retry
        if not force:
            try:
                redis_client = await get_redis_client()
                await redis_client.delete(f"{IDEMPOTENCY_KEY_PREFIX}{_generate_idempotency_key()}")
                await redis_client.aclose()
            except Exception:
                pass
        return {
            "skipped": True,
            "reason": "Another playbook generation is already in progress",
            "duration_seconds": elapsed,
        }
        
    except Exception as e:
        elapsed = time.time() - start_time
        logger.exception(f"Playbook generation failed after {elapsed:.2f}s: {e}")
        # Clear idempotency key on failure to allow retry
        if not force:
            try:
                redis_client = await get_redis_client()
                await redis_client.delete(f"{IDEMPOTENCY_KEY_PREFIX}{_generate_idempotency_key()}")
                await redis_client.aclose()
            except Exception:
                pass
        return {
            "success": False,
            "error": str(e),
            "duration_seconds": elapsed,
        }


def run_generation_sync(force: bool = False) -> dict:
    """Synchronous wrapper for run_generation."""
    return asyncio.run(run_generation(force=force))


def run_continuous():
    """
    Run the playbook worker in continuous mode.
    
    Generates playbook reports every 4 hours until shutdown is requested.
    """
    logger.info("=" * 60)
    logger.info("PLAYBOOK WORKER STARTING (Continuous Mode)")
    logger.info("=" * 60)
    logger.info(f"Generation interval: {GENERATION_INTERVAL / 3600:.1f} hours")
    logger.info(f"Minimum gap: {MIN_GENERATION_GAP / 60:.0f} minutes")
    
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    # Send initial idle heartbeat
    send_idle_heartbeat(WORKER_NAME, schedule_interval_seconds=GENERATION_INTERVAL)
    
    last_generation = 0
    
    # Generate immediately on startup
    logger.info("Running initial generation on startup...")
    send_heartbeat(WORKER_NAME, is_running=True)
    start_time = time.time()
    result = run_generation_sync(force=False)
    duration_ms = int((time.time() - start_time) * 1000)
    
    # Submit enhanced report
    _submit_enhanced_report(result, duration_ms)
    
    if result.get("success"):
        last_generation = time.time()
    elif result.get("skipped"):
        # If skipped, still update last_generation to avoid immediate retry
        last_generation = time.time() - GENERATION_INTERVAL + MIN_GENERATION_GAP
    
    while not _shutdown_requested:
        now = time.time()
        
        # Calculate next scheduled run
        next_run = datetime.fromtimestamp(last_generation + GENERATION_INTERVAL, tz=timezone.utc)
        
        # Send idle heartbeat every loop (indicates we're alive and waiting)
        send_idle_heartbeat(
            WORKER_NAME,
            next_scheduled_run=next_run,
            schedule_interval_seconds=GENERATION_INTERVAL,
        )
        
        # Check if it's time to generate
        if now - last_generation >= GENERATION_INTERVAL:
            logger.info(f"Scheduled generation triggered (interval: {GENERATION_INTERVAL/3600:.1f}h)")
            send_heartbeat(WORKER_NAME, is_running=True)
            start_time = time.time()
            result = run_generation_sync(force=False)
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Submit enhanced report
            _submit_enhanced_report(result, duration_ms)
            
            if result.get("success"):
                last_generation = now
            elif result.get("skipped"):
                # Don't update last_generation if skipped - will retry next interval
                pass
            else:
                # On error, wait a bit before retrying
                logger.warning("Generation failed, will retry in 30 minutes")
                last_generation = now - GENERATION_INTERVAL + (30 * 60)
        
        # Sleep for a short interval before checking again
        # This allows for responsive shutdown
        time.sleep(60)  # Check every minute
    
    logger.info("Playbook worker shutting down...")


def _submit_enhanced_report(result: dict, duration_ms: int) -> None:
    """Submit enhanced execution report with data verification."""
    report = create_report(WORKER_NAME)
    report.duration_ms = duration_ms
    
    if result.get("success"):
        report.outcome = ExecutionOutcome.SUCCESS
        report_execution(WORKER_NAME, success=True, duration_ms=duration_ms)
        
        # Data verification - playbook generates multiple insight types
        total_insights = (
            result.get("golden_hours_count", 0) +
            result.get("niche_opportunities_count", 0) +
            result.get("viral_hooks_count", 0) +
            result.get("strategies_count", 0) +
            result.get("insight_cards_count", 0)
        )
        report.data_verification.records_processed = total_insights
        report.data_verification.records_stored = 1  # One playbook stored
        
        # Mark validation as passed since we successfully generated a playbook
        report.data_verification.validation_checks_passed = 1
        report.data_verification.validation_checks_failed = 0
        
    elif result.get("skipped"):
        report.outcome = ExecutionOutcome.SKIPPED
        report.custom_metrics = {"reason": result.get("reason", "unknown")}
        # Skipped is not a validation failure
        report.data_verification.validation_checks_passed = 0
        report.data_verification.validation_checks_failed = 0
        
    else:
        report.outcome = ExecutionOutcome.FAILED
        report.error_message = result.get("error")
        report_execution(WORKER_NAME, success=False, duration_ms=duration_ms, error=result.get("error"))
        # Failed execution counts as validation failure
        report.data_verification.validation_checks_passed = 0
        report.data_verification.validation_checks_failed = 1
    
    # Custom metrics for playbook
    report.custom_metrics = {
        "headline": result.get("headline"),
        "mood": result.get("mood"),
        "golden_hours_count": result.get("golden_hours_count", 0),
        "niche_opportunities_count": result.get("niche_opportunities_count", 0),
        "viral_hooks_count": result.get("viral_hooks_count", 0),
        "strategies_count": result.get("strategies_count", 0),
        "insight_cards_count": result.get("insight_cards_count", 0),
        "intel_data_age_minutes": result.get("intel_data_age_minutes"),
    }
    
    submit_execution_report(report)


def run_once(force: bool = False):
    """
    Run a single generation and exit.
    
    Args:
        force: If True, bypass the time check
    """
    logger.info("Running single playbook generation...")
    result = run_generation_sync(force=force)
    
    if result.get("error"):
        logger.error(f"Generation failed: {result.get('error')}")
        sys.exit(1)
    elif result.get("skipped"):
        logger.info(f"Generation skipped: {result.get('reason')}")
        sys.exit(0)
    else:
        logger.info("Generation completed successfully")
        sys.exit(0)


def main():
    """Main entry point for the playbook worker."""
    parser = argparse.ArgumentParser(
        description="Playbook Worker - Generates algorithmic playbook reports for streamers"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single generation and exit (for cron jobs)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force generation even if less than minimum gap since last generation"
    )
    
    args = parser.parse_args()
    
    # Validate environment
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    google_api_key = os.environ.get("GOOGLE_API_KEY")
    twitch_client_id = os.environ.get("TWITCH_CLIENT_ID")
    
    logger.info("Environment check:")
    logger.info(f"  Supabase URL: {'✓' if supabase_url else '✗ NOT CONFIGURED'}")
    logger.info(f"  Supabase Key: {'✓' if supabase_key else '✗ NOT CONFIGURED'}")
    logger.info(f"  Google API Key: {'✓' if google_api_key else '✗ NOT CONFIGURED'}")
    logger.info(f"  Twitch Client ID: {'✓' if twitch_client_id else '✗ NOT CONFIGURED'}")
    
    if not supabase_url or not supabase_key:
        logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured")
        sys.exit(1)
    
    if not google_api_key:
        logger.warning("GOOGLE_API_KEY not configured - YouTube data will be limited")
    
    if not twitch_client_id:
        logger.warning("TWITCH_CLIENT_ID not configured - Twitch data will be limited")
    
    if args.once:
        run_once(force=args.force)
    else:
        run_continuous()


if __name__ == "__main__":
    main()
