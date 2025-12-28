"""
Coach Session Cleanup Worker for Aurastream.

This worker runs hourly to clean up stale coach sessions in PostgreSQL.
Sessions with status='active' that haven't been updated in 30+ minutes
are marked as 'expired' to prevent orphaned sessions.

The worker can be run in two modes:
1. Continuous mode (default): Runs as a daemon, cleaning up every hour
2. Single-run mode: Cleans up once and exits (for cron jobs)

Usage:
    # Continuous mode (recommended for Docker/systemd)
    python -m backend.workers.coach_cleanup_worker
    
    # Single-run mode (for cron jobs)
    python -m backend.workers.coach_cleanup_worker --once
    
    # Force cleanup (bypass hourly check)
    python -m backend.workers.coach_cleanup_worker --once --force
    
    # Dry run (show what would be cleaned up without making changes)
    python -m backend.workers.coach_cleanup_worker --once --dry-run
"""

import argparse
import logging
import os
import signal
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)

# Cleanup interval in seconds (1 hour)
CLEANUP_INTERVAL = 3600

# Session staleness threshold in minutes
STALE_THRESHOLD_MINUTES = 30

# Graceful shutdown flag
_shutdown_requested = False

# Track last cleanup time for hourly check
_last_cleanup_time: Optional[datetime] = None


def signal_handler(signum: int, frame) -> None:
    """
    Handle shutdown signals gracefully.
    
    Args:
        signum: Signal number received
        frame: Current stack frame (unused)
    """
    global _shutdown_requested
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    _shutdown_requested = True


def run_cleanup(force: bool = False, dry_run: bool = False) -> dict:
    """
    Execute a single coach session cleanup.
    
    Finds all sessions with status='active' that haven't been updated
    in the last 30 minutes and marks them as 'expired'.
    
    Args:
        force: If True, bypass the hourly check
        dry_run: If True, only report what would be cleaned up without making changes
        
    Returns:
        Cleanup result dictionary with keys:
            - sessions_cleaned: Number of sessions marked as expired
            - skipped: Whether cleanup was skipped
            - reason: Reason for skipping (if applicable)
            - error: Error message (if any)
            - dry_run: Whether this was a dry run
    """
    global _last_cleanup_time
    
    from backend.database.supabase_client import get_supabase_client
    
    logger.info(f"Starting coach session cleanup{'(dry run)' if dry_run else ''}...")
    start_time = time.time()
    
    # Check if we should skip (unless forced)
    if not force and _last_cleanup_time:
        elapsed = (datetime.now(timezone.utc) - _last_cleanup_time).total_seconds()
        if elapsed < CLEANUP_INTERVAL:
            remaining = CLEANUP_INTERVAL - elapsed
            logger.info(f"Cleanup skipped: too soon (next cleanup in {remaining:.0f}s)")
            return {
                "skipped": True,
                "reason": "too_soon",
                "last_cleanup": _last_cleanup_time.isoformat(),
                "next_cleanup_in_seconds": remaining
            }
    
    try:
        db = get_supabase_client()
        
        # Calculate cutoff time (30 minutes ago)
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=STALE_THRESHOLD_MINUTES)
        cutoff_iso = cutoff.isoformat()
        
        logger.info(f"Looking for active sessions not updated since {cutoff_iso}")
        
        # First, query to see what would be affected
        stale_sessions = (
            db.table("coach_sessions")
            .select("id, user_id, asset_type, updated_at, created_at")
            .eq("status", "active")
            .lt("updated_at", cutoff_iso)
            .execute()
        )
        
        sessions_to_clean = stale_sessions.data or []
        session_count = len(sessions_to_clean)
        
        if session_count == 0:
            elapsed = time.time() - start_time
            logger.info(f"No stale sessions found (took {elapsed:.2f}s)")
            _last_cleanup_time = datetime.now(timezone.utc)
            return {
                "sessions_cleaned": 0,
                "skipped": False,
                "dry_run": dry_run
            }
        
        # Log details about sessions to be cleaned
        for session in sessions_to_clean:
            session_id = session.get("id", "unknown")
            asset_type = session.get("asset_type", "unknown")
            updated_at = session.get("updated_at", "unknown")
            logger.info(f"  Stale session: {session_id} (type: {asset_type}, last update: {updated_at})")
        
        if dry_run:
            elapsed = time.time() - start_time
            logger.info(f"DRY RUN: Would expire {session_count} sessions (took {elapsed:.2f}s)")
            return {
                "sessions_cleaned": 0,
                "sessions_would_clean": session_count,
                "skipped": False,
                "dry_run": True,
                "sessions": sessions_to_clean
            }
        
        # Perform the actual cleanup
        now_iso = datetime.now(timezone.utc).isoformat()
        result = (
            db.table("coach_sessions")
            .update({
                "status": "expired",
                "ended_at": now_iso
            })
            .eq("status", "active")
            .lt("updated_at", cutoff_iso)
            .execute()
        )
        
        # Count how many were actually updated
        cleaned_count = len(result.data) if result.data else session_count
        
        elapsed = time.time() - start_time
        logger.info(f"Cleanup complete: {cleaned_count} sessions expired (took {elapsed:.2f}s)")
        
        _last_cleanup_time = datetime.now(timezone.utc)
        
        return {
            "sessions_cleaned": cleaned_count,
            "skipped": False,
            "dry_run": False
        }
        
    except Exception as e:
        elapsed = time.time() - start_time
        logger.exception(f"Unexpected error during cleanup: {e} (took {elapsed:.2f}s)")
        return {"error": str(e)}


def run_continuous() -> None:
    """
    Run the cleanup worker in continuous mode.
    
    Cleans up stale coach sessions every hour until shutdown is requested.
    Uses graceful shutdown handling for SIGTERM and SIGINT signals.
    """
    logger.info("Starting coach session cleanup worker in continuous mode...")
    logger.info(f"Cleanup interval: {CLEANUP_INTERVAL} seconds")
    logger.info(f"Stale threshold: {STALE_THRESHOLD_MINUTES} minutes")
    
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    last_run = 0
    
    while not _shutdown_requested:
        now = time.time()
        
        # Check if it's time to run cleanup
        if now - last_run >= CLEANUP_INTERVAL:
            result = run_cleanup(force=False, dry_run=False)
            last_run = now
            
            # If cleanup was skipped due to recent run, adjust timing
            if result.get("skipped") and result.get("reason") == "too_soon":
                remaining = result.get("next_cleanup_in_seconds", CLEANUP_INTERVAL)
                logger.info(f"Sleeping for {remaining:.0f}s until next cleanup window")
        
        # Sleep for a short interval before checking again
        # This allows for responsive shutdown
        time.sleep(60)  # Check every minute
    
    logger.info("Coach session cleanup worker shutting down...")


def run_once(force: bool = False, dry_run: bool = False) -> None:
    """
    Run a single cleanup and exit.
    
    Args:
        force: If True, bypass the hourly check
        dry_run: If True, only report what would be cleaned up
    """
    mode_desc = "dry run " if dry_run else ""
    logger.info(f"Running single coach session {mode_desc}cleanup...")
    
    result = run_cleanup(force=force, dry_run=dry_run)
    
    if result.get("error"):
        logger.error(f"Cleanup failed: {result.get('error')}")
        sys.exit(1)
    
    if result.get("skipped"):
        logger.info(f"Cleanup skipped: {result.get('reason')}")
        sys.exit(0)
    
    if dry_run:
        would_clean = result.get("sessions_would_clean", 0)
        logger.info(f"Dry run complete: would expire {would_clean} sessions")
    else:
        cleaned = result.get("sessions_cleaned", 0)
        logger.info(f"Cleanup complete: {cleaned} sessions expired")
    
    sys.exit(0)


def main() -> None:
    """Main entry point for the coach session cleanup worker."""
    parser = argparse.ArgumentParser(
        description="Coach Session Cleanup Worker - Expires stale coach sessions in PostgreSQL"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single cleanup and exit (for cron jobs)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force cleanup even if less than 1 hour since last cleanup"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be cleaned up without making changes"
    )
    
    args = parser.parse_args()
    
    # Validate environment
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    logger.info(f"Supabase URL: {'configured' if supabase_url else 'NOT CONFIGURED'}")
    logger.info(f"Supabase Key: {'configured' if supabase_key else 'NOT CONFIGURED'}")
    logger.info(f"Stale threshold: {STALE_THRESHOLD_MINUTES} minutes")
    
    if not supabase_url or not supabase_key:
        logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured")
        sys.exit(1)
    
    if args.once:
        run_once(force=args.force, dry_run=args.dry_run)
    else:
        if args.dry_run:
            logger.warning("--dry-run is only supported with --once flag, ignoring")
        run_continuous()


if __name__ == "__main__":
    main()
