#!/usr/bin/env python3
"""
Run All Workers Once - Immediate Data Population

This script runs all scheduled workers immediately to populate data.
Use this after a fresh deployment or to manually refresh all data.

Usage:
    cd /var/www/aurastream/backend
    python scripts/run_all_workers_once.py
    
    # Or run specific workers:
    python scripts/run_all_workers_once.py --workers youtube,twitch,clips
"""

import asyncio
import argparse
import logging
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def run_youtube_worker():
    """Fetch YouTube trending data for all subscribed categories."""
    logger.info("🎬 Starting YouTube Worker...")
    try:
        from workers.youtube_worker import fetch_all_trending, fetch_all_games
        
        # Fetch trending videos
        trending_result = await fetch_all_trending()
        logger.info(f"   Trending: {trending_result}")
        
        # Fetch game-specific videos
        games_result = await fetch_all_games(force=True)
        logger.info(f"   Games: {games_result}")
        
        logger.info("✅ YouTube Worker completed")
    except Exception as e:
        logger.error(f"❌ YouTube Worker failed: {e}")
        import traceback
        traceback.print_exc()


async def run_twitch_data():
    """Fetch Twitch streams and games data."""
    logger.info("📺 Starting Twitch Data Fetch...")
    try:
        from services.trends import get_twitch_collector
        collector = get_twitch_collector()
        
        # Fetch top games
        games = await collector.fetch_top_games(limit=50)
        logger.info(f"   Fetched {len(games)} top games")
        
        # Fetch top streams
        streams = await collector.fetch_top_streams(limit=100)
        logger.info(f"   Fetched {len(streams)} top streams")
        
        logger.info("✅ Twitch Data Fetch completed")
    except Exception as e:
        logger.error(f"❌ Twitch Data Fetch failed: {e}")
        import traceback
        traceback.print_exc()


async def run_clip_radar_worker():
    """Fetch viral clips from Twitch."""
    logger.info("🎯 Starting Clip Radar Worker...")
    try:
        from workers.clip_radar_worker import run_poll
        await run_poll()
        logger.info("✅ Clip Radar Worker completed")
    except Exception as e:
        logger.error(f"❌ Clip Radar Worker failed: {e}")
        import traceback
        traceback.print_exc()


async def run_clip_radar_recap_worker():
    """Generate clip radar recaps."""
    logger.info("📊 Starting Clip Radar Recap Worker...")
    try:
        from workers.clip_radar_recap_worker import run_daily_recap
        await run_daily_recap()
        logger.info("✅ Clip Radar Recap Worker completed")
    except Exception as e:
        logger.error(f"❌ Clip Radar Recap Worker failed: {e}")
        import traceback
        traceback.print_exc()


async def run_thumbnail_intel_worker():
    """Analyze thumbnails for all categories."""
    logger.info("🖼️ Starting Thumbnail Intel Worker...")
    try:
        from workers.thumbnail_intel_worker import run_analysis
        await run_analysis()
        logger.info("✅ Thumbnail Intel Worker completed")
    except Exception as e:
        logger.error(f"❌ Thumbnail Intel Worker failed: {e}")
        import traceback
        traceback.print_exc()


async def run_playbook_worker():
    """Generate playbooks for users."""
    logger.info("📖 Starting Playbook Worker...")
    try:
        from workers.playbook_worker import run_generation
        result = await run_generation(force=True)
        logger.info(f"✅ Playbook Worker completed: {result}")
    except Exception as e:
        logger.error(f"❌ Playbook Worker failed: {e}")
        import traceback
        traceback.print_exc()


def run_analytics_flush_worker_sync():
    """Flush analytics from Redis to PostgreSQL."""
    logger.info("📈 Starting Analytics Flush Worker...")
    try:
        from workers.analytics_flush_worker import run_once
        run_once(force=True)
        logger.info("✅ Analytics Flush Worker completed")
    except Exception as e:
        logger.error(f"❌ Analytics Flush Worker failed: {e}")
        import traceback
        traceback.print_exc()


def run_coach_cleanup_worker_sync():
    """Clean up old coach sessions."""
    logger.info("🧹 Starting Coach Cleanup Worker...")
    try:
        from workers.coach_cleanup_worker import run_once
        run_once(force=True)
        logger.info("✅ Coach Cleanup Worker completed")
    except Exception as e:
        logger.error(f"❌ Coach Cleanup Worker failed: {e}")
        import traceback
        traceback.print_exc()


# Worker registry - async workers
ASYNC_WORKERS = {
    'youtube': run_youtube_worker,
    'twitch': run_twitch_data,
    'clips': run_clip_radar_worker,
    'recaps': run_clip_radar_recap_worker,
    'thumbnails': run_thumbnail_intel_worker,
    'playbook': run_playbook_worker,
}

# Sync workers
SYNC_WORKERS = {
    'analytics': run_analytics_flush_worker_sync,
    'cleanup': run_coach_cleanup_worker_sync,
}

ALL_WORKERS = {**ASYNC_WORKERS, **SYNC_WORKERS}

# Default order for running all workers (data dependencies)
DEFAULT_ORDER = [
    'youtube',      # Fetch YouTube data first (needed for thumbnails)
    'twitch',       # Fetch Twitch streams
    'clips',        # Fetch Twitch clips
    'thumbnails',   # Analyze thumbnails (depends on YouTube data)
    'recaps',       # Generate clip recaps
    'playbook',     # Generate playbooks (depends on all data)
    'analytics',    # Flush analytics to PostgreSQL
    'cleanup',      # Cleanup old sessions
]


async def run_worker(name: str):
    """Run a single worker by name."""
    if name in ASYNC_WORKERS:
        await ASYNC_WORKERS[name]()
    elif name in SYNC_WORKERS:
        SYNC_WORKERS[name]()
    else:
        logger.error(f"Unknown worker: {name}")


async def main():
    parser = argparse.ArgumentParser(description='Run AuraStream workers immediately')
    parser.add_argument(
        '--workers', '-w',
        type=str,
        help=f'Comma-separated list of workers to run. Available: {", ".join(ALL_WORKERS.keys())}'
    )
    parser.add_argument(
        '--parallel', '-p',
        action='store_true',
        help='Run async workers in parallel (faster but may hit rate limits)'
    )
    args = parser.parse_args()

    # Determine which workers to run
    if args.workers:
        worker_names = [w.strip() for w in args.workers.split(',')]
        invalid = [w for w in worker_names if w not in ALL_WORKERS]
        if invalid:
            logger.error(f"Unknown workers: {invalid}")
            logger.info(f"Available workers: {list(ALL_WORKERS.keys())}")
            sys.exit(1)
    else:
        worker_names = DEFAULT_ORDER

    logger.info("=" * 60)
    logger.info("🚀 AuraStream Worker Runner")
    logger.info(f"   Workers to run: {worker_names}")
    logger.info(f"   Mode: {'Parallel' if args.parallel else 'Sequential'}")
    logger.info("=" * 60)

    if args.parallel:
        # Run async workers in parallel, sync workers after
        async_names = [n for n in worker_names if n in ASYNC_WORKERS]
        sync_names = [n for n in worker_names if n in SYNC_WORKERS]
        
        if async_names:
            tasks = [ASYNC_WORKERS[name]() for name in async_names]
            await asyncio.gather(*tasks, return_exceptions=True)
        
        for name in sync_names:
            SYNC_WORKERS[name]()
    else:
        # Run workers sequentially
        for name in worker_names:
            logger.info(f"\n{'─' * 40}")
            await run_worker(name)

    logger.info("\n" + "=" * 60)
    logger.info("✨ All workers completed!")
    logger.info("=" * 60)


if __name__ == '__main__':
    asyncio.run(main())
