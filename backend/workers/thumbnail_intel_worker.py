"""
Thumbnail Intelligence Worker

Runs daily at 6:00 AM EST (11:00 UTC) to analyze top-performing
YouTube gaming thumbnails using Gemini Vision.

Schedule: Daily at 6:00 AM EST
- Collects top 3 thumbnails per gaming category
- Sends to Gemini Vision for layout/design analysis
- Stores results in database for API consumption
"""

import asyncio
import logging
import os
import sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from backend.services.thumbnail_intel import get_thumbnail_intel_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger("thumbnail_intel_worker")

# Schedule: 6:00 AM EST = 11:00 UTC
SCHEDULE_HOUR_UTC = 11
SCHEDULE_MINUTE = 0


async def run_analysis():
    """Run the thumbnail intelligence analysis."""
    logger.info("=" * 60)
    logger.info("THUMBNAIL INTELLIGENCE ANALYSIS STARTING")
    logger.info("=" * 60)
    
    try:
        service = get_thumbnail_intel_service()
        results = await service.run_daily_analysis()
        
        logger.info(f"Analysis complete: {len(results)} categories processed")
        
        for category_key, insight in results.items():
            logger.info(
                f"  {insight.category_name}: "
                f"{len(insight.thumbnails)} thumbnails analyzed"
            )
        
        return results
        
    except Exception as e:
        logger.error(f"Thumbnail analysis failed: {e}")
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
            
            # Sleep until next scheduled time
            logger.info(f"Sleeping for {sleep_seconds} seconds...")
            await asyncio.sleep(sleep_seconds)
            
            # Run the analysis
            await run_analysis()
            
            # Small delay to prevent double-runs
            await asyncio.sleep(60)
            
        except Exception as e:
            logger.error(f"Worker error: {e}")
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
