"""
Playbook Generation Worker for Aurastream.

This worker generates playbook reports on a schedule, synced with YouTube data refreshes.
It runs every 4 hours to provide fresh algorithmic insights for streamers.

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
from datetime import datetime, timezone

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)

# Generation interval in seconds (4 hours - synced with YouTube data refresh)
GENERATION_INTERVAL = 4 * 60 * 60  # 4 hours

# Minimum time between generations (prevent spam)
MIN_GENERATION_GAP = 60 * 60  # 1 hour

# Graceful shutdown flag
_shutdown_requested = False


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    global _shutdown_requested
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    _shutdown_requested = True


async def check_last_generation_time() -> tuple[bool, str]:
    """
    Check if enough time has passed since the last generation.
    
    Returns:
        Tuple of (should_generate, reason)
    """
    try:
        from backend.services.playbook import get_playbook_service
        
        service = get_playbook_service()
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
        force: If True, bypass the time check
        
    Returns:
        Generation result dictionary
    """
    logger.info("=" * 60)
    logger.info("PLAYBOOK GENERATION STARTING")
    logger.info("=" * 60)
    
    start_time = time.time()
    
    try:
        # Check if we should generate
        if not force:
            should_generate, reason = await check_last_generation_time()
            logger.info(f"Generation check: {reason}")
            
            if not should_generate:
                return {
                    "skipped": True,
                    "reason": reason,
                }
        
        # Import here to avoid circular imports
        from backend.services.playbook import get_playbook_service
        
        service = get_playbook_service()
        
        logger.info("Fetching trend data...")
        logger.info("  - YouTube trending videos")
        logger.info("  - Twitch live streams")
        logger.info("  - Twitch top games")
        logger.info("  - Twitch viral clips")
        
        # Generate the playbook
        playbook = await service.generate_playbook(save_to_db=True)
        
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
        }
        
    except Exception as e:
        elapsed = time.time() - start_time
        logger.exception(f"Playbook generation failed after {elapsed:.2f}s: {e}")
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
    
    last_generation = 0
    
    # Generate immediately on startup
    logger.info("Running initial generation on startup...")
    result = run_generation_sync(force=False)
    if result.get("success"):
        last_generation = time.time()
    elif result.get("skipped"):
        # If skipped, still update last_generation to avoid immediate retry
        last_generation = time.time() - GENERATION_INTERVAL + MIN_GENERATION_GAP
    
    while not _shutdown_requested:
        now = time.time()
        
        # Check if it's time to generate
        if now - last_generation >= GENERATION_INTERVAL:
            logger.info(f"Scheduled generation triggered (interval: {GENERATION_INTERVAL/3600:.1f}h)")
            result = run_generation_sync(force=False)
            
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
