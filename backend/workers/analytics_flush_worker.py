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

# Flush interval in seconds (1 hour)
FLUSH_INTERVAL = 3600

# Graceful shutdown flag
_shutdown_requested = False


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    global _shutdown_requested
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    _shutdown_requested = True


def run_flush(force: bool = False) -> dict:
    """
    Execute a single analytics flush.
    
    Args:
        force: If True, bypass the hourly check
        
    Returns:
        Flush result dictionary
    """
    from backend.services.analytics_service import get_analytics_service
    
    logger.info("Starting analytics flush...")
    start_time = time.time()
    
    try:
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
        
    except Exception as e:
        logger.exception(f"Unexpected error during flush: {e}")
        return {"error": str(e)}


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
    
    last_flush = 0
    
    while not _shutdown_requested:
        now = time.time()
        
        # Check if it's time to flush
        if now - last_flush >= FLUSH_INTERVAL:
            result = run_flush(force=False)
            last_flush = now
            
            # If flush was skipped due to recent flush, adjust timing
            if result.get("skipped") and result.get("reason") == "too_soon":
                # Sleep for remaining time until next hour
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
        # This allows for responsive shutdown
        time.sleep(60)  # Check every minute
    
    logger.info("Analytics flush worker shutting down...")


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
