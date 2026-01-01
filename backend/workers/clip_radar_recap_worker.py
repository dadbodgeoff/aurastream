"""
Clip Radar Recap Worker - Daily compression job

Runs at 6am UTC daily to compress yesterday's clip data into PostgreSQL.
Also cleans up old Redis data.

Usage:
    # Run manually
    python -m backend.workers.clip_radar_recap_worker
    
    # Or via cron (add to crontab):
    0 6 * * * cd /app && python -m backend.workers.clip_radar_recap_worker
"""

import asyncio
import logging
import sys
from datetime import datetime, timezone, timedelta

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def run_daily_recap():
    """Run the daily recap job."""
    from backend.services.clip_radar.recap_service import get_recap_service
    
    logger.info("=" * 60)
    logger.info("CLIP RADAR DAILY RECAP - Starting")
    logger.info("=" * 60)
    
    service = get_recap_service()
    
    # Create recap for yesterday
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).date()
    logger.info(f"Creating recap for: {yesterday}")
    
    try:
        recap = await service.create_daily_recap(yesterday)
        
        if "error" in recap:
            logger.warning(f"Recap creation returned error: {recap['error']}")
        else:
            logger.info(f"Recap created successfully:")
            logger.info(f"  - Total clips tracked: {recap.get('total_clips_tracked', 0)}")
            logger.info(f"  - Viral clips: {recap.get('total_viral_clips', 0)}")
            logger.info(f"  - Total views: {recap.get('total_views_tracked', 0):,}")
            logger.info(f"  - Peak velocity: {recap.get('peak_velocity', 0):.1f} views/min")
            logger.info(f"  - Polls count: {recap.get('polls_count', 0)}")
            
            # Log top clips
            top_clips = recap.get("top_clips", [])
            if top_clips:
                logger.info(f"  - Top {len(top_clips)} clips:")
                for i, clip in enumerate(top_clips[:5], 1):
                    logger.info(f"    {i}. {clip.get('title', 'Unknown')[:50]} ({clip.get('velocity', 0):.1f} v/m)")
        
        # Cleanup old Redis data
        logger.info("Cleaning up old Redis data...")
        await service.cleanup_old_redis_data(days_to_keep=2)
        
        logger.info("=" * 60)
        logger.info("CLIP RADAR DAILY RECAP - Complete")
        logger.info("=" * 60)
        
        return recap
        
    except Exception as e:
        logger.error(f"Recap job failed: {e}", exc_info=True)
        raise


async def run_scheduler():
    """
    Run as a continuous scheduler that triggers at 6am UTC daily.
    
    For production, prefer using system cron or a task scheduler.
    This is provided for development/testing.
    """
    logger.info("Clip Radar Recap Scheduler started")
    logger.info("Will run daily at 6:00 AM UTC")
    
    while True:
        now = datetime.now(timezone.utc)
        
        # Calculate next 6am
        next_run = now.replace(hour=6, minute=0, second=0, microsecond=0)
        if now >= next_run:
            next_run += timedelta(days=1)
        
        wait_seconds = (next_run - now).total_seconds()
        logger.info(f"Next recap scheduled for: {next_run.isoformat()}")
        logger.info(f"Waiting {wait_seconds / 3600:.1f} hours...")
        
        await asyncio.sleep(wait_seconds)
        
        try:
            await run_daily_recap()
        except Exception as e:
            logger.error(f"Scheduled recap failed: {e}")
        
        # Small delay to avoid running twice
        await asyncio.sleep(60)


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Clip Radar Daily Recap Worker")
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run once immediately instead of scheduling"
    )
    parser.add_argument(
        "--date",
        type=str,
        help="Specific date to create recap for (YYYY-MM-DD)"
    )
    args = parser.parse_args()
    
    if args.once or args.date:
        # Run once
        async def run_once():
            from backend.services.clip_radar.recap_service import get_recap_service
            service = get_recap_service()
            
            if args.date:
                from datetime import date as date_type
                recap_date = date_type.fromisoformat(args.date)
            else:
                recap_date = None
            
            return await service.create_daily_recap(recap_date)
        
        result = asyncio.run(run_once())
        print(f"Recap result: {result}")
    else:
        # Run scheduler
        asyncio.run(run_scheduler())


if __name__ == "__main__":
    main()
