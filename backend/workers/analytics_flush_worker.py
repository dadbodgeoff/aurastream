"""
Analytics Flush Worker for Aurastream.

This worker runs hourly to flush analytics data from Redis to PostgreSQL.
It ensures Redis memory usage stays low while enabling long-term SQL reporting.

The worker can be run in two modes:
1. Continuous mode (default): Runs as a daemon, flushing every hour
2. Single-run mode: Flushes once and exits (for cron jobs)

Usage:
    # Continuous mode (recommended for Docker/systemd)
    python -m backend.workers.analytics_flush_worker
    
    # Single-run mode (for cron jobs)
    python -m backend.workers.analytics_flush_worker --once
    
    # Force flush (bypass hourly check)
    python -m backend.workers.analytics_flush_worker --once --force
"""

import argparse
import asyncio
import logging
import os
import signal
import sys
import time
from datetime import datetime, timezone

from backend.workers.heartbeat import send_heartbeat, send_idle_heartbeat
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

WORKER_NAME = "analytics_flush_worker"

# Flush interval in seconds (1 hour)
FLUSH_INTERVAL = 3600

# Retry configuration
MAX_RETRIES = 3
RETRY_BASE_DELAY = 5  # seconds

# Lock timeout (10 minutes - should be enough for any flush operation)
LOCK_TIMEOUT = 600

# Graceful shutdown flag
_shutdown_requested = False


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    global _shutdown_requested
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    _shutdown_requested = True


async def run_flush_async(force: bool = False) -> dict:
    """
    Execute a single analytics flush with distributed locking.
    
    Args:
        force: If True, bypass the hourly check
        
    Returns:
        Flush result dictionary
    """
    from backend.services.analytics_service import get_analytics_service
    from backend.services.distributed_lock import worker_lock, LockAcquisitionError
    
    logger.info("Starting analytics flush...")
    start_time = time.time()
    
    try:
        async with worker_lock(
            "analytics_flush",
            "hourly_flush",
            timeout=LOCK_TIMEOUT,
            raise_on_failure=False
        ) as acquired:
            if not acquired:
                logger.info("Flush skipped: another instance is already flushing")
                return {"skipped": True, "reason": "lock_held"}
            
            # Execute the actual flush
            service = get_analytics_service()
            result = service.flush_to_postgres(force=force)
            
            elapsed = time.time() - start_time
            
            if result.get("skipped"):
                logger.info(f"Flush skipped: {result.get('reason')} (took {elapsed:.2f}s)")
            elif result.get("error"):
                logger.error(f"Flush failed: {result.get('error')} (took {elapsed:.2f}s)")
            else:
                logger.info(
                    f"Flush complete: {result.get('events_flushed', 0)} events, "
                    f"{result.get('asset_types_updated', 0)} asset types (took {elapsed:.2f}s)"
                )
            
            return result
            
    except LockAcquisitionError:
        logger.warning("Lock acquisition failed unexpectedly")
        return {"skipped": True, "reason": "lock_acquisition_failed"}
    except Exception as e:
        logger.exception(f"Unexpected error during flush: {e}")
        return {"error": str(e)}


async def flush_with_retry(force: bool = False) -> dict:
    """
    Flush with exponential backoff retry.
    
    Retries failed flushes up to MAX_RETRIES times with exponential backoff.
    
    Args:
        force: If True, bypass the hourly check
        
    Returns:
        Flush result dictionary
    """
    last_error = None
    
    for attempt in range(MAX_RETRIES + 1):
        try:
            result = await run_flush_async(force=force)
            
            # If flush was skipped due to lock, don't retry
            if result.get("skipped"):
                return result
            
            # If no error, return success
            if not result.get("error"):
                return result
            
            last_error = result.get("error")
            
        except Exception as e:
            last_error = str(e)
            logger.exception(f"Exception during flush attempt {attempt + 1}: {e}")
        
        # Retry if we haven't exhausted attempts
        if attempt < MAX_RETRIES:
            delay = RETRY_BASE_DELAY * (2 ** attempt)
            logger.warning(
                f"Flush attempt {attempt + 1}/{MAX_RETRIES + 1} failed: {last_error}. "
                f"Retrying in {delay}s..."
            )
            await asyncio.sleep(delay)
    
    logger.error(f"All {MAX_RETRIES + 1} flush attempts failed: {last_error}")
    return {"error": last_error, "retries_exhausted": True}


def run_flush(force: bool = False) -> dict:
    """
    Execute a single analytics flush (synchronous wrapper).
    
    This is a backward-compatible synchronous wrapper around the async
    flush_with_retry function.
    
    Args:
        force: If True, bypass the hourly check
        
    Returns:
        Flush result dictionary
    """
    try:
        # Get or create event loop
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None
        
        if loop is not None:
            # If we're already in an async context, create a task
            # This shouldn't happen in normal usage, but handle it gracefully
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    asyncio.run,
                    flush_with_retry(force=force)
                )
                return future.result()
        else:
            # Normal case: run the async function
            return asyncio.run(flush_with_retry(force=force))
            
    except Exception as e:
        logger.exception(f"Error in synchronous flush wrapper: {e}")
        return {"error": str(e)}


async def run_continuous_async():
    """
    Run the flush worker in continuous mode (async version).
    
    Flushes analytics data every hour until shutdown is requested.
    """
    from backend.services.distributed_lock import close_global_lock
    
    logger.info("Starting analytics flush worker in continuous mode...")
    logger.info(f"Flush interval: {FLUSH_INTERVAL} seconds")
    
    # Send initial idle heartbeat to indicate we're ready
    send_idle_heartbeat(
        WORKER_NAME,
        schedule_interval_seconds=FLUSH_INTERVAL,
    )
    
    last_flush = 0
    
    try:
        while not _shutdown_requested:
            now = time.time()
            
            # Calculate next scheduled run time
            next_run = datetime.fromtimestamp(last_flush + FLUSH_INTERVAL, tz=timezone.utc) if last_flush > 0 else None
            
            # Send idle heartbeat every loop (indicates we're alive and waiting)
            send_idle_heartbeat(
                WORKER_NAME,
                next_scheduled_run=next_run,
                schedule_interval_seconds=FLUSH_INTERVAL,
            )
            
            # Check if it's time to flush
            if now - last_flush >= FLUSH_INTERVAL:
                send_heartbeat(WORKER_NAME, is_running=True)
                start_time = time.time()
                result = await flush_with_retry(force=False)
                duration_ms = int((time.time() - start_time) * 1000)
                last_flush = now
                
                # Submit enhanced execution report
                report = create_report(WORKER_NAME)
                report.duration_ms = duration_ms
                
                if result.get("skipped"):
                    report.outcome = ExecutionOutcome.SKIPPED
                    report.custom_metrics = {"reason": result.get("reason", "unknown")}
                elif result.get("error"):
                    report.outcome = ExecutionOutcome.FAILED
                    report.error_message = result.get("error")
                else:
                    report.outcome = ExecutionOutcome.SUCCESS
                    report.data_verification.records_processed = result.get("events_flushed", 0)
                    report.data_verification.records_stored = result.get("events_flushed", 0)
                    report.custom_metrics = {
                        "events_flushed": result.get("events_flushed", 0),
                        "asset_types_updated": result.get("asset_types_updated", 0),
                    }
                
                submit_execution_report(report)
                
                # If flush was skipped due to recent flush, adjust timing
                if result.get("skipped") and result.get("reason") == "too_soon":
                    last_flush_time = result.get("last_flush")
                    if last_flush_time:
                        try:
                            last_dt = datetime.fromisoformat(last_flush_time)
                            elapsed_since_last = (datetime.now(timezone.utc) - last_dt).total_seconds()
                            remaining = max(0, FLUSH_INTERVAL - elapsed_since_last)
                            logger.info(f"Sleeping for {remaining:.0f}s until next flush window")
                        except Exception:
                            pass
            
            # Sleep for a short interval before checking again
            await asyncio.sleep(60)
    finally:
        await close_global_lock()
    
    logger.info("Analytics flush worker shutting down...")


def run_continuous():
    """
    Run the flush worker in continuous mode.
    
    Flushes analytics data every hour until shutdown is requested.
    """
    logger.info("Starting analytics flush worker in continuous mode...")
    logger.info(f"Flush interval: {FLUSH_INTERVAL} seconds")
    
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        asyncio.run(run_continuous_async())
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt, shutting down...")


def run_once(force: bool = False):
    """
    Run a single flush and exit.
    
    Args:
        force: If True, bypass the hourly check
    """
    logger.info("Running single analytics flush...")
    result = run_flush(force=force)
    
    if result.get("error"):
        sys.exit(1)
    
    sys.exit(0)


def main():
    """Main entry point for the analytics flush worker."""
    parser = argparse.ArgumentParser(
        description="Analytics Flush Worker - Flushes Redis analytics to PostgreSQL"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single flush and exit (for cron jobs)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force flush even if less than 1 hour since last flush"
    )
    
    args = parser.parse_args()
    
    # Validate environment
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    logger.info(f"Redis URL: {redis_url}")
    logger.info(f"Supabase URL: {'configured' if supabase_url else 'NOT CONFIGURED'}")
    logger.info(f"Supabase Key: {'configured' if supabase_key else 'NOT CONFIGURED'}")
    
    if not supabase_url or not supabase_key:
        logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured")
        sys.exit(1)
    
    if args.once:
        run_once(force=args.force)
    else:
        run_continuous()


if __name__ == "__main__":
    main()
