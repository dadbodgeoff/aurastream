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
import asyncio
import logging
import os
import signal
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

from backend.services.distributed_lock import worker_lock, LockAcquisitionError
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

WORKER_NAME = "coach_cleanup_worker"

# Cleanup interval in seconds (1 hour)
CLEANUP_INTERVAL = 3600

# Session staleness threshold in minutes
STALE_THRESHOLD_MINUTES = 30

# Grace period in minutes - don't expire sessions with activity in this window
# This prevents data loss from race conditions where a session becomes active
# between the query and the update
GRACE_PERIOD_MINUTES = 5

# Lock timeout for cleanup operation (5 minutes)
CLEANUP_LOCK_TIMEOUT = 300

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


async def run_cleanup_async(force: bool = False, dry_run: bool = False) -> dict:
    """
    Execute a single coach session cleanup with distributed locking.
    
    Finds all sessions with status='active' that haven't been updated
    in the last 30 minutes and marks them as 'expired'.
    
    Uses distributed locking to prevent multiple instances from cleaning
    simultaneously, which could cause data loss.
    
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
    
    # Acquire distributed lock to prevent multiple instances from cleaning simultaneously
    try:
        async with worker_lock(
            "coach_cleanup",
            "session_cleanup",
            timeout=CLEANUP_LOCK_TIMEOUT,
            raise_on_failure=False
        ) as acquired:
            if not acquired:
                logger.info("Cleanup skipped: another instance is already cleaning")
                return {"skipped": True, "reason": "lock_held"}
            
            # Perform cleanup within the lock
            return await _perform_cleanup(dry_run, start_time)
            
    except LockAcquisitionError as e:
        logger.warning(f"Lock acquisition failed: {e}")
        return {"skipped": True, "reason": "lock_acquisition_failed"}
    except Exception as e:
        elapsed = time.time() - start_time
        logger.exception(f"Unexpected error during cleanup: {e} (took {elapsed:.2f}s)")
        return {"error": str(e)}


async def _perform_cleanup(dry_run: bool, start_time: float) -> dict:
    """
    Perform the actual cleanup operation (called within distributed lock).
    
    Args:
        dry_run: If True, only report what would be cleaned up
        start_time: Time when cleanup started (for elapsed time calculation)
        
    Returns:
        Cleanup result dictionary
    """
    global _last_cleanup_time
    
    from backend.database.supabase_client import get_supabase_client
    
    try:
        db = get_supabase_client()
        
        # Calculate cutoff time (30 minutes ago)
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=STALE_THRESHOLD_MINUTES)
        cutoff_iso = cutoff.isoformat()
        
        # Calculate grace period cutoff (5 minutes ago)
        # Sessions with activity in this window are protected from cleanup
        grace_cutoff = datetime.now(timezone.utc) - timedelta(minutes=GRACE_PERIOD_MINUTES)
        grace_cutoff_iso = grace_cutoff.isoformat()
        
        logger.info(f"Looking for active sessions not updated since {cutoff_iso}")
        logger.info(f"Grace period: sessions with activity after {grace_cutoff_iso} will be protected")
        
        # First, query to see what would be affected
        # Only select sessions that are:
        # 1. Active status
        # 2. Haven't been updated in STALE_THRESHOLD_MINUTES
        stale_sessions = (
            db.table("coach_sessions")
            .select("id, user_id, asset_type, updated_at, created_at")
            .eq("status", "active")
            .lt("updated_at", cutoff_iso)
            .execute()
        )
        
        sessions_to_clean = stale_sessions.data or []
        
        if len(sessions_to_clean) == 0:
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
            logger.info(f"  Stale session candidate: {session_id} (type: {asset_type}, last update: {updated_at})")
        
        if dry_run:
            elapsed = time.time() - start_time
            logger.info(f"DRY RUN: Would expire {len(sessions_to_clean)} sessions (took {elapsed:.2f}s)")
            return {
                "sessions_cleaned": 0,
                "sessions_would_clean": len(sessions_to_clean),
                "skipped": False,
                "dry_run": True,
                "sessions": sessions_to_clean
            }
        
        # Pre-cleanup verification: verify each session is still stale before expiring
        # This prevents race conditions where a session becomes active between query and update
        sessions_expired = 0
        sessions_skipped = 0
        now_iso = datetime.now(timezone.utc).isoformat()
        
        for session in sessions_to_clean:
            session_id = session.get("id")
            if not session_id:
                continue
            
            # Re-check the session is still stale before expiring
            current = (
                db.table("coach_sessions")
                .select("updated_at, status")
                .eq("id", session_id)
                .execute()
            )
            
            if not current.data:
                logger.info(f"Skipping session {session_id} - no longer exists")
                sessions_skipped += 1
                continue
            
            current_data = current.data[0]
            current_status = current_data.get("status")
            current_updated_str = current_data.get("updated_at", "")
            
            # Skip if status is no longer active
            if current_status != "active":
                logger.info(f"Skipping session {session_id} - status changed to '{current_status}'")
                sessions_skipped += 1
                continue
            
            # Parse the updated_at timestamp
            try:
                # Handle both 'Z' suffix and '+00:00' timezone formats
                if current_updated_str.endswith("Z"):
                    current_updated = datetime.fromisoformat(current_updated_str.replace("Z", "+00:00"))
                else:
                    current_updated = datetime.fromisoformat(current_updated_str)
            except (ValueError, AttributeError) as e:
                logger.warning(f"Could not parse updated_at for session {session_id}: {e}")
                sessions_skipped += 1
                continue
            
            # Skip if session has had recent activity (within grace period)
            if current_updated > grace_cutoff:
                logger.info(f"Skipping session {session_id} - has recent activity (updated: {current_updated_str})")
                sessions_skipped += 1
                continue
            
            # Skip if session is no longer stale (updated since our initial query)
            if current_updated > cutoff:
                logger.info(f"Skipping session {session_id} - no longer stale (updated: {current_updated_str})")
                sessions_skipped += 1
                continue
            
            # Session is confirmed stale - expire it
            try:
                result = (
                    db.table("coach_sessions")
                    .update({
                        "status": "expired",
                        "ended_at": now_iso
                    })
                    .eq("id", session_id)
                    .eq("status", "active")  # Double-check status hasn't changed
                    .execute()
                )
                
                if result.data:
                    logger.info(f"Expired session {session_id}")
                    sessions_expired += 1
                else:
                    logger.info(f"Session {session_id} was not updated (may have changed)")
                    sessions_skipped += 1
                    
            except Exception as e:
                logger.error(f"Error expiring session {session_id}: {e}")
                sessions_skipped += 1
        
        elapsed = time.time() - start_time
        logger.info(
            f"Cleanup complete: {sessions_expired} sessions expired, "
            f"{sessions_skipped} skipped (took {elapsed:.2f}s)"
        )
        
        _last_cleanup_time = datetime.now(timezone.utc)
        
        return {
            "sessions_cleaned": sessions_expired,
            "sessions_skipped": sessions_skipped,
            "skipped": False,
            "dry_run": False
        }
        
    except Exception as e:
        elapsed = time.time() - start_time
        logger.exception(f"Unexpected error during cleanup: {e} (took {elapsed:.2f}s)")
        return {"error": str(e)}


def run_cleanup(force: bool = False, dry_run: bool = False) -> dict:
    """
    Synchronous wrapper for run_cleanup_async.
    
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
    return asyncio.run(run_cleanup_async(force=force, dry_run=dry_run))


def run_continuous() -> None:
    """
    Run the cleanup worker in continuous mode.
    
    Cleans up stale coach sessions every hour until shutdown is requested.
    Uses graceful shutdown handling for SIGTERM and SIGINT signals.
    """
    logger.info("Starting coach session cleanup worker in continuous mode...")
    logger.info(f"Cleanup interval: {CLEANUP_INTERVAL} seconds")
    logger.info(f"Stale threshold: {STALE_THRESHOLD_MINUTES} minutes")
    logger.info(f"Grace period: {GRACE_PERIOD_MINUTES} minutes")
    logger.info(f"Lock timeout: {CLEANUP_LOCK_TIMEOUT} seconds")
    
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    # Send initial idle heartbeat
    send_idle_heartbeat(WORKER_NAME, schedule_interval_seconds=CLEANUP_INTERVAL)
    
    last_run = 0
    
    while not _shutdown_requested:
        now = time.time()
        
        # Calculate next scheduled run
        next_run = datetime.fromtimestamp(last_run + CLEANUP_INTERVAL, tz=timezone.utc) if last_run > 0 else None
        
        # Send idle heartbeat every loop (indicates we're alive and waiting)
        send_idle_heartbeat(
            WORKER_NAME,
            next_scheduled_run=next_run,
            schedule_interval_seconds=CLEANUP_INTERVAL,
        )
        
        # Check if it's time to run cleanup
        if now - last_run >= CLEANUP_INTERVAL:
            send_heartbeat(WORKER_NAME, is_running=True)
            start_time = time.time()
            result = run_cleanup(force=False, dry_run=False)
            duration_ms = int((time.time() - start_time) * 1000)
            last_run = now
            
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
                sessions_cleaned = result.get("sessions_cleaned", 0)
                sessions_skipped = result.get("sessions_skipped", 0)
                report.data_verification.records_processed = sessions_cleaned + sessions_skipped
                report.data_verification.records_stored = sessions_cleaned
                report.data_verification.records_skipped = sessions_skipped
                report.custom_metrics = {
                    "sessions_cleaned": sessions_cleaned,
                    "sessions_skipped": sessions_skipped,
                }
            
            submit_execution_report(report)
            
            # If cleanup was skipped due to recent run, adjust timing
            if result.get("skipped") and result.get("reason") == "too_soon":
                remaining = result.get("next_cleanup_in_seconds", CLEANUP_INTERVAL)
                logger.info(f"Sleeping for {remaining:.0f}s until next cleanup window")
        
        # Sleep for a short interval before checking again
        time.sleep(60)
    
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
        skipped = result.get("sessions_skipped", 0)
        logger.info(f"Cleanup complete: {cleaned} sessions expired, {skipped} skipped")
    
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
    redis_url = os.environ.get("REDIS_URL")
    
    logger.info(f"Supabase URL: {'configured' if supabase_url else 'NOT CONFIGURED'}")
    logger.info(f"Supabase Key: {'configured' if supabase_key else 'NOT CONFIGURED'}")
    logger.info(f"Redis URL: {'configured' if redis_url else 'NOT CONFIGURED (using default)'}")
    logger.info(f"Stale threshold: {STALE_THRESHOLD_MINUTES} minutes")
    logger.info(f"Grace period: {GRACE_PERIOD_MINUTES} minutes")
    
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
