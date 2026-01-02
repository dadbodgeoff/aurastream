"""
Intel Aggregation Worker for AuraStream.

Runs hourly and daily aggregation of intel data:
- Hourly: Aggregates Redis data into PostgreSQL hourly tables (at :05)
- Daily: Rolls up hourly data into daily aggregates (at 00:15 UTC)

Schedule:
- Hourly aggregation: Every hour at :05
- Daily rollup: Once per day at 00:15 UTC

Uses Supabase client for database operations (not asyncpg).

Usage:
    # Continuous mode (recommended for Docker/systemd)
    python -m backend.workers.intel_aggregation_worker
    
    # Single-run mode (for cron jobs)
    python -m backend.workers.intel_aggregation_worker --once
    
    # Force specific aggregation
    python -m backend.workers.intel_aggregation_worker --once --hourly
    python -m backend.workers.intel_aggregation_worker --once --daily
"""

import argparse
import asyncio
import logging
import os
import signal
import sys
import time
from datetime import datetime, timezone

import redis.asyncio as redis

logger = logging.getLogger(__name__)

# Configuration
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

# Timing
HOURLY_MINUTE = 5  # Run hourly aggregation at :05
DAILY_HOUR = 0  # Run daily rollup at 00:xx UTC
DAILY_MINUTE = 15  # Run daily rollup at xx:15 UTC

# State keys
LAST_HOURLY_KEY = "intel:aggregation:last_hourly"
LAST_DAILY_KEY = "intel:aggregation:last_daily"

# Graceful shutdown flag
_shutdown_requested = False


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    global _shutdown_requested
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    _shutdown_requested = True


async def get_redis_client():
    """Get async Redis client."""
    return redis.from_url(REDIS_URL, decode_responses=True)


def get_supabase_db():
    """Get Supabase client for database operations."""
    from backend.database.supabase_client import get_supabase_client
    return get_supabase_client()


async def should_run_hourly(redis_client) -> bool:
    """Check if hourly aggregation should run."""
    now = datetime.now(timezone.utc)
    
    # Only run at :05 of each hour
    if now.minute < HOURLY_MINUTE or now.minute >= HOURLY_MINUTE + 10:
        return False
    
    # Check if already ran this hour
    last_run = await redis_client.get(LAST_HOURLY_KEY)
    if last_run:
        try:
            last_dt = datetime.fromisoformat(last_run)
            if last_dt.hour == now.hour and last_dt.date() == now.date():
                return False
        except (ValueError, TypeError):
            pass
    
    return True


async def should_run_daily(redis_client) -> bool:
    """Check if daily rollup should run."""
    now = datetime.now(timezone.utc)
    
    # Only run at 00:15 UTC
    if now.hour != DAILY_HOUR or now.minute < DAILY_MINUTE or now.minute >= DAILY_MINUTE + 10:
        return False
    
    # Check if already ran today
    last_run = await redis_client.get(LAST_DAILY_KEY)
    if last_run:
        try:
            last_dt = datetime.fromisoformat(last_run)
            if last_dt.date() == now.date():
                return False
        except (ValueError, TypeError):
            pass
    
    return True


async def run_hourly_aggregation(redis_client, db) -> dict:
    """Run hourly aggregation."""
    logger.info("Starting hourly aggregation...")
    start = time.time()
    
    try:
        from backend.services.intel.aggregation.hourly import HourlyAggregator
        
        aggregator = HourlyAggregator(redis_client, db)
        count = await aggregator.run()
        
        # Record last run
        await redis_client.set(
            LAST_HOURLY_KEY,
            datetime.now(timezone.utc).isoformat()
        )
        
        duration = time.time() - start
        logger.info(f"Hourly aggregation complete: {count} categories in {duration:.1f}s")
        
        return {
            "success": True,
            "categories_aggregated": count,
            "duration_seconds": round(duration, 2),
        }
        
    except Exception as e:
        logger.error(f"Hourly aggregation failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "duration_seconds": round(time.time() - start, 2),
        }


async def run_daily_rollup(redis_client, db) -> dict:
    """Run daily rollup."""
    logger.info("Starting daily rollup...")
    start = time.time()
    
    try:
        from backend.services.intel.aggregation.daily import DailyRollup
        
        rollup = DailyRollup(db)
        count = await rollup.run()
        
        # Record last run
        await redis_client.set(
            LAST_DAILY_KEY,
            datetime.now(timezone.utc).isoformat()
        )
        
        duration = time.time() - start
        logger.info(f"Daily rollup complete: {count} categories in {duration:.1f}s")
        
        return {
            "success": True,
            "categories_rolled_up": count,
            "duration_seconds": round(duration, 2),
        }
        
    except Exception as e:
        logger.error(f"Daily rollup failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "duration_seconds": round(time.time() - start, 2),
        }


async def run_continuous():
    """Run the worker in continuous mode."""
    logger.info("=" * 60)
    logger.info("INTEL AGGREGATION WORKER - Starting (Continuous Mode)")
    logger.info("=" * 60)
    logger.info(f"Hourly aggregation: Every hour at :{HOURLY_MINUTE:02d}")
    logger.info(f"Daily rollup: {DAILY_HOUR:02d}:{DAILY_MINUTE:02d} UTC")
    
    # Register signal handlers
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    redis_client = await get_redis_client()
    
    try:
        db = get_supabase_db()
        logger.info("✓ Connected to Supabase")
    except Exception as e:
        logger.error(f"Failed to connect to Supabase: {e}")
        return
    
    try:
        while not _shutdown_requested:
            now = datetime.now(timezone.utc)
            
            # Check hourly aggregation
            if await should_run_hourly(redis_client):
                result = await run_hourly_aggregation(redis_client, db)
                if not result["success"]:
                    logger.warning(f"Hourly aggregation had errors: {result.get('error')}")
            
            # Check daily rollup
            if await should_run_daily(redis_client):
                result = await run_daily_rollup(redis_client, db)
                if not result["success"]:
                    logger.warning(f"Daily rollup had errors: {result.get('error')}")
            
            # Sleep for 1 minute before checking again
            await asyncio.sleep(60)
            
    finally:
        await redis_client.aclose()
        logger.info("Intel Aggregation Worker shutting down...")


async def run_once(hourly: bool = False, daily: bool = False):
    """Run a single aggregation and exit."""
    redis_client = await get_redis_client()
    
    try:
        db = get_supabase_db()
        logger.info("✓ Connected to Supabase")
    except Exception as e:
        logger.error(f"Failed to connect to Supabase: {e}")
        sys.exit(1)
    
    try:
        results = {}
        
        # If neither specified, run both
        if not hourly and not daily:
            hourly = True
            daily = True
        
        if hourly:
            results["hourly"] = await run_hourly_aggregation(redis_client, db)
        
        if daily:
            results["daily"] = await run_daily_rollup(redis_client, db)
        
        # Check for errors
        has_errors = any(not r.get("success") for r in results.values())
        
        if has_errors:
            logger.error(f"Aggregation had errors: {results}")
            sys.exit(1)
        else:
            logger.info(f"Aggregation completed successfully: {results}")
            sys.exit(0)
            
    finally:
        await redis_client.aclose()


def main():
    """Main entry point."""
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)]
    )
    
    parser = argparse.ArgumentParser(
        description="Intel Aggregation Worker - Hourly and daily data aggregation"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single aggregation and exit"
    )
    parser.add_argument(
        "--hourly",
        action="store_true",
        help="Run only hourly aggregation (with --once)"
    )
    parser.add_argument(
        "--daily",
        action="store_true",
        help="Run only daily rollup (with --once)"
    )
    
    args = parser.parse_args()
    
    # Validate environment
    logger.info("Environment check:")
    logger.info(f"  Redis URL: {'✓' if REDIS_URL else '⚠ Using default localhost'}")
    
    # Check Supabase configuration
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    logger.info(f"  Supabase URL: {'✓' if supabase_url else '✗ Not configured'}")
    logger.info(f"  Supabase Key: {'✓' if supabase_key else '✗ Not configured'}")
    
    if not supabase_url or not supabase_key:
        logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        sys.exit(1)
    
    if args.once:
        asyncio.run(run_once(hourly=args.hourly, daily=args.daily))
    else:
        asyncio.run(run_continuous())


if __name__ == "__main__":
    main()
