"""
Clip Radar Background Worker

Polls Twitch clips every 5 minutes to detect viral content.
Run with: python -m backend.workers.clip_radar_worker
"""

import asyncio
import logging
import signal
import sys
import time
from datetime import datetime, timezone, timedelta

from backend.services.distributed_lock import worker_lock
from backend.workers.heartbeat import send_heartbeat, send_idle_heartbeat, report_execution
from backend.workers.execution_report import (
    create_report,
    submit_execution_report,
    ExecutionOutcome,
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("clip_radar_worker")

WORKER_NAME = "clip_radar_worker"

# Polling interval in seconds (5 minutes)
POLL_INTERVAL = 5 * 60

# Lock timeout for poll operation (4 minutes - less than poll interval)
POLL_LOCK_TIMEOUT = 4 * 60

# Flag for graceful shutdown
shutdown_requested = False


def handle_shutdown(signum, frame):
    """Handle shutdown signals."""
    global shutdown_requested
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    shutdown_requested = True


async def run_poll():
    """Run a single poll cycle with distributed lock."""
    from backend.services.clip_radar import get_clip_radar_service
    
    # Create enhanced execution report
    report = create_report(WORKER_NAME)
    
    # Send heartbeat before starting
    send_heartbeat(WORKER_NAME, is_running=True)
    
    # Acquire distributed lock to prevent concurrent polling across instances
    async with worker_lock(
        "clip_radar",
        "poll",
        timeout=POLL_LOCK_TIMEOUT,
        raise_on_failure=False
    ) as acquired:
        if not acquired:
            logger.info("Poll already running on another instance, skipping")
            send_heartbeat(WORKER_NAME, is_running=False)
            report.outcome = ExecutionOutcome.SKIPPED
            report.custom_metrics = {"reason": "lock_held"}
            submit_execution_report(report)
            return True  # Return True to continue the loop
        
        service = get_clip_radar_service()
        start_time = datetime.now(timezone.utc)
        
        try:
            logger.info("Starting clip radar poll...")
            
            results = await service.poll_clips()
            
            # Log summary
            total_clips = sum(r.total_clips for r in results.values())
            total_viral = sum(len(r.viral_clips) for r in results.values())
            duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
            
            logger.info(
                f"Poll complete in {duration_ms}ms: "
                f"{total_clips} clips scanned, {total_viral} viral detected"
            )
            
            # Log viral clips
            for gid, stats in results.items():
                if stats.viral_clips:
                    for clip in stats.viral_clips[:3]:  # Top 3 per category
                        logger.info(
                            f"  🔥 [{stats.game_name}] {clip.broadcaster_name}: "
                            f"{clip.title[:40]} ({clip.view_count} views, {clip.velocity:.1f}/min)"
                        )
            
            # Report successful execution
            report_execution(WORKER_NAME, success=True, duration_ms=duration_ms)
            
            # Enhanced reporting with data verification
            report.outcome = ExecutionOutcome.SUCCESS
            report.duration_ms = duration_ms
            report.data_verification.records_fetched = total_clips
            report.data_verification.records_processed = total_clips
            report.data_verification.api_calls_made = len(results)
            report.data_verification.api_calls_succeeded = len(results)
            
            # Custom metrics for clip radar
            report.custom_metrics = {
                "total_clips_scanned": total_clips,
                "viral_clips_detected": total_viral,
                "games_polled": len(results),
                "viral_by_game": {
                    stats.game_name: len(stats.viral_clips) 
                    for stats in results.values()
                },
            }
            submit_execution_report(report)
            return True
            
        except Exception as e:
            logger.error(f"Poll failed: {e}", exc_info=True)
            duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
            report_execution(WORKER_NAME, success=False, duration_ms=duration_ms, error=str(e))
            
            # Enhanced error reporting
            report.outcome = ExecutionOutcome.FAILED
            report.duration_ms = duration_ms
            report.error_message = str(e)
            report.error_type = type(e).__name__
            submit_execution_report(report)
            return False


async def main():
    """Main worker loop."""
    global shutdown_requested
    
    # Register signal handlers
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)
    
    logger.info("=" * 60)
    logger.info("Clip Radar Worker Starting")
    logger.info(f"Poll interval: {POLL_INTERVAL} seconds")
    logger.info("=" * 60)
    
    # Initial idle heartbeat
    send_idle_heartbeat(WORKER_NAME, schedule_interval_seconds=POLL_INTERVAL)
    
    # Initial poll
    await run_poll()
    
    last_poll = time.time()
    
    # Main loop
    while not shutdown_requested:
        try:
            now = time.time()
            
            # Calculate next scheduled run
            next_run = datetime.fromtimestamp(last_poll + POLL_INTERVAL, tz=timezone.utc)
            
            # Send idle heartbeat while waiting (indicates we're alive and ready)
            send_idle_heartbeat(
                WORKER_NAME,
                next_scheduled_run=next_run,
                schedule_interval_seconds=POLL_INTERVAL,
            )
            
            # Wait for next poll interval
            logger.info(f"Next poll in {POLL_INTERVAL // 60} minutes...")
            
            # Sleep in small increments to allow for graceful shutdown
            for _ in range(POLL_INTERVAL):
                if shutdown_requested:
                    break
                await asyncio.sleep(1)
            
            if not shutdown_requested:
                await run_poll()
                last_poll = time.time()
                
        except Exception as e:
            logger.error(f"Error in main loop: {e}", exc_info=True)
            # Wait a bit before retrying
            await asyncio.sleep(30)
    
    logger.info("Clip Radar Worker shutting down...")


if __name__ == "__main__":
    asyncio.run(main())
