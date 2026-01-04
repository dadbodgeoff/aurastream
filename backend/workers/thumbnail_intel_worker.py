"""
Thumbnail Intelligence Worker

Runs daily at 6:00 AM EST (11:00 UTC) to analyze top-performing
YouTube gaming thumbnails using Gemini Vision.

Schedule: Daily at 6:00 AM EST
- Collects top 10 thumbnails per gaming category (8 categories)
- Sends each thumbnail to Gemini Vision individually (80 total calls)
- Aggregates patterns per category from individual analyses
- Stores results in database for API consumption
- Captures provenance for AI reasoning chains

V2 Architecture: Per-thumbnail Gemini calls for accurate analysis
"""

import asyncio
import logging
import os
import sys
import time
import uuid
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from backend.services.thumbnail_intel.service_provenance import get_provenance_thumbnail_intel_service
from backend.services.distributed_lock import worker_lock
from backend.workers.heartbeat import send_heartbeat, send_idle_heartbeat, report_execution
from backend.workers.execution_report import (
    create_report,
    submit_execution_report,
    ExecutionOutcome,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger("thumbnail_intel_worker")

WORKER_NAME = "thumbnail_intel_worker"

# Schedule: 6:00 AM EST = 11:00 UTC
SCHEDULE_HOUR_UTC = 11
SCHEDULE_MINUTE = 0


async def run_analysis():
    """Run the thumbnail intelligence analysis with distributed lock."""
    logger.info("=" * 60)
    logger.info("THUMBNAIL INTELLIGENCE ANALYSIS STARTING")
    logger.info("=" * 60)
    
    # Send heartbeat before starting
    send_heartbeat(WORKER_NAME, is_running=True)
    start_time = time.time()
    
    # Create enhanced execution report
    report = create_report(WORKER_NAME)
    
    # Use distributed lock to prevent duplicate analysis runs across instances
    # Timeout of 1800 seconds (30 minutes) to allow for full analysis completion
    async with worker_lock(
        "thumbnail_intel",
        "daily_analysis",
        timeout=1800,
        raise_on_failure=False,
    ) as acquired:
        if not acquired:
            logger.info("Thumbnail analysis already running on another instance, skipping")
            send_heartbeat(WORKER_NAME, is_running=False)
            
            # Submit skipped report
            report.outcome = ExecutionOutcome.SKIPPED
            report.custom_metrics = {"reason": "lock_held"}
            submit_execution_report(report)
            return {}
        
        try:
            service = get_provenance_thumbnail_intel_service()
            
            # Generate execution ID for provenance tracking
            execution_id = str(uuid.uuid4())[:8]
            
            # Run analysis with provenance capture
            results = await service.run_daily_analysis_with_provenance(execution_id=execution_id)
            
            duration_ms = int((time.time() - start_time) * 1000)
            logger.info(f"Analysis complete: {len(results)} categories processed")
            
            total_thumbnails = 0
            category_details = {}
            for category_key, insight in results.items():
                thumb_count = len(insight.thumbnails)
                total_thumbnails += thumb_count
                category_details[category_key] = {
                    "name": insight.category_name,
                    "thumbnails_analyzed": thumb_count,
                }
                logger.info(
                    f"  {insight.category_name}: "
                    f"{thumb_count} thumbnails analyzed"
                )
            
            # Report successful execution (basic heartbeat)
            report_execution(WORKER_NAME, success=True, duration_ms=duration_ms)
            
            # Enhanced execution report with data verification
            report.outcome = ExecutionOutcome.SUCCESS
            report.duration_ms = duration_ms
            
            # Data verification metrics
            # V2: Each thumbnail gets its own Gemini call (10 per category)
            report.data_verification.records_fetched = len(results)
            report.data_verification.records_processed = total_thumbnails
            report.data_verification.api_calls_made = total_thumbnails  # One Gemini call per thumbnail
            report.data_verification.api_calls_succeeded = total_thumbnails  # Assuming all succeeded
            report.data_verification.cache_writes = len(results)
            report.data_verification.cache_ttl_seconds = 86400  # 24 hours
            
            # Calculate completeness (10 thumbnails expected per category)
            expected_thumbnails = len(results) * 10
            if expected_thumbnails > 0:
                report.data_verification.completeness_score = round(
                    total_thumbnails / expected_thumbnails, 2
                )
            
            # Custom metrics for thumbnail intel
            report.custom_metrics = {
                "categories_processed": len(results),
                "total_thumbnails_analyzed": total_thumbnails,
                "category_details": category_details,
                "gemini_vision_calls": total_thumbnails,  # V2: One call per thumbnail
                "architecture": "per_thumbnail_v2",
            }
            
            submit_execution_report(report)
            return results
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Thumbnail analysis failed: {e}")
            report_execution(WORKER_NAME, success=False, duration_ms=duration_ms, error=str(e))
            
            # Enhanced error report
            report.outcome = ExecutionOutcome.FAILED
            report.duration_ms = duration_ms
            report.error_message = str(e)
            report.error_type = type(e).__name__
            submit_execution_report(report)
            raise


def get_seconds_until_next_run() -> int:
    """Calculate seconds until next scheduled run (6 AM EST / 11 AM UTC)."""
    now = datetime.now(timezone.utc)
    
    # Calculate next run time
    next_run = now.replace(
        hour=SCHEDULE_HOUR_UTC,
        minute=SCHEDULE_MINUTE,
        second=0,
        microsecond=0,
    )
    
    # If we've passed today's run time, schedule for tomorrow
    if now >= next_run:
        next_run = next_run.replace(day=next_run.day + 1)
    
    delta = next_run - now
    seconds = int(delta.total_seconds())
    
    # Convert to EST for logging
    est = ZoneInfo("America/New_York")
    next_run_est = next_run.astimezone(est)
    
    logger.info(
        f"Next thumbnail analysis scheduled for: "
        f"{next_run_est.strftime('%Y-%m-%d %I:%M %p %Z')} "
        f"({seconds // 3600}h {(seconds % 3600) // 60}m from now)"
    )
    
    return seconds


async def main():
    """Main worker loop."""
    logger.info("Thumbnail Intelligence Worker starting...")
    logger.info(f"Schedule: Daily at 6:00 AM EST (11:00 UTC)")
    
    # Send initial idle heartbeat
    send_idle_heartbeat(WORKER_NAME, schedule_interval_seconds=86400)  # 24 hours
    
    # Check if we should run immediately (for testing)
    run_now = os.getenv("RUN_IMMEDIATELY", "false").lower() == "true"
    
    if run_now:
        logger.info("RUN_IMMEDIATELY=true, running analysis now...")
        await run_analysis()
    
    # Main scheduling loop
    while True:
        try:
            # Calculate time until next run
            sleep_seconds = get_seconds_until_next_run()
            
            # Calculate next scheduled run time
            now = datetime.now(timezone.utc)
            next_run = now + timedelta(seconds=sleep_seconds)
            
            # Send idle heartbeat (indicates we're alive and waiting)
            send_idle_heartbeat(
                WORKER_NAME,
                next_scheduled_run=next_run,
                schedule_interval_seconds=86400,  # 24 hours
            )
            
            # Sleep until next scheduled time (in 60-second increments for heartbeats)
            logger.info(f"Sleeping for {sleep_seconds} seconds...")
            remaining = sleep_seconds
            while remaining > 0:
                await asyncio.sleep(min(60, remaining))
                remaining -= 60
                # Update idle heartbeat with remaining time
                next_run = datetime.now(timezone.utc) + timedelta(seconds=remaining)
                send_idle_heartbeat(
                    WORKER_NAME,
                    next_scheduled_run=next_run,
                    schedule_interval_seconds=86400,
                )
            
            # Run the analysis
            await run_analysis()
            
            # Small delay to prevent double-runs
            await asyncio.sleep(60)
            
        except Exception as e:
            logger.error(f"Worker error: {e}")
            report_execution(WORKER_NAME, success=False, duration_ms=0, error=str(e))
            # Wait 5 minutes before retrying on error
            await asyncio.sleep(300)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker stopped by user")
    except Exception as e:
        logger.error(f"Worker crashed: {e}")
        sys.exit(1)
