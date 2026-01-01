"""
YouTube Trending Data Worker for Aurastream.

This worker fetches YouTube trending data on a schedule and caches it in Redis.
Users NEVER hit the YouTube API directly - they only read from cache.

QUOTA BUDGET (~1,200 units/day out of 10,000):
- Trending: 4 categories × 48 fetches/day × 1 unit = 192 units/day
- Game-specific: 10 games × 1 fetch/day × 101 units = 1,010 units/day

Schedule:
- Trending videos: Every 30 minutes (1 unit per category)
- Game-specific videos: Once daily at 5 AM UTC (101 units per game)

Usage:
    # Run as standalone worker
    python -m backend.workers.youtube_worker
    
    # Or import and call directly
    from backend.workers.youtube_worker import fetch_all_trending
    await fetch_all_trending()
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timedelta
from typing import Optional, List

import redis.asyncio as redis

from backend.services.trends.youtube_collector import (
    YouTubeCollector,
    YouTubeVideoResponse,
    get_youtube_collector,
    CATEGORY_IDS,
    TrendCategory,
)

logger = logging.getLogger(__name__)

# Redis keys
YOUTUBE_TRENDING_KEY = "youtube:trending:{category}"
YOUTUBE_GAMES_KEY = "youtube:games:{game}"
YOUTUBE_LAST_FETCH_KEY = "youtube:last_fetch:{type}"
YOUTUBE_QUOTA_USED_KEY = "youtube:quota_used:{date}"

# Cache TTLs
TRENDING_CACHE_TTL = 60 * 60  # 1 hour (fetched every 30 min, so always fresh)
GAMES_CACHE_TTL = 60 * 60 * 25  # 25 hours (fetched once daily)

# Fetch intervals (in seconds)
TRENDING_FETCH_INTERVAL = 60 * 30  # 30 minutes
GAMES_FETCH_INTERVAL = 60 * 60 * 24  # 24 hours (once daily)

# Categories to fetch
CATEGORIES: List[TrendCategory] = ["gaming", "entertainment", "music", "education"]

# Games to fetch with search (guaranteed coverage)
# Each search costs 100 units + 1 unit for video details = 101 units
# 8 games × 101 units = 808 units/day
GAMES_TO_FETCH = [
    {"key": "fortnite", "query": "fortnite gameplay", "display": "Fortnite"},
    {"key": "warzone", "query": "warzone gameplay", "display": "Warzone"},
    {"key": "arc_raiders", "query": "arc raiders gameplay", "display": "Arc Raiders"},
    {"key": "valorant", "query": "valorant gameplay", "display": "Valorant"},
    {"key": "apex_legends", "query": "apex legends gameplay", "display": "Apex Legends"},
    {"key": "gta", "query": "gta online gameplay", "display": "GTA"},
    {"key": "minecraft", "query": "minecraft gameplay", "display": "Minecraft"},
    {"key": "roblox", "query": "roblox gameplay", "display": "Roblox"},
]

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")


def _get_redis_client() -> redis.Redis:
    """Get async Redis client."""
    return redis.from_url(REDIS_URL, decode_responses=True)


def _serialize_video(video: YouTubeVideoResponse) -> dict:
    """Serialize a video response to JSON-safe dict."""
    return {
        "video_id": video.video_id,
        "title": video.title,
        "thumbnail": video.thumbnail,
        "channel_id": video.channel_id,
        "channel_title": video.channel_title,
        "category": video.category,
        "published_at": video.published_at.isoformat() if video.published_at else None,
        "view_count": video.view_count,
        "like_count": video.like_count,
        "comment_count": video.comment_count,
        "engagement_rate": video.engagement_rate,
        "viral_score": video.viral_score,
        "velocity": video.velocity,
        "insight": video.insight,
        "duration_seconds": video.duration_seconds,
        "is_live": video.is_live,
        "is_short": video.is_short,
        "tags": video.tags,
        "description": video.description,
        "default_audio_language": video.default_audio_language,
        "has_captions": video.has_captions,
        "topic_categories": video.topic_categories,
        "is_licensed": video.is_licensed,
        "is_made_for_kids": video.is_made_for_kids,
        "subscriber_count": video.subscriber_count,
    }


async def _track_quota_usage(redis_client: redis.Redis, units: int) -> int:
    """Track quota usage for the day. Returns total used today."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    key = YOUTUBE_QUOTA_USED_KEY.format(date=today)
    
    # Increment and get new total
    total = await redis_client.incrby(key, units)
    
    # Set expiry to end of day + 1 hour buffer
    await redis_client.expire(key, 60 * 60 * 25)
    
    return total


async def _get_quota_used_today(redis_client: redis.Redis) -> int:
    """Get quota units used today."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    key = YOUTUBE_QUOTA_USED_KEY.format(date=today)
    used = await redis_client.get(key)
    return int(used) if used else 0


async def fetch_trending_category(
    collector: YouTubeCollector,
    redis_client: redis.Redis,
    category: TrendCategory,
) -> int:
    """
    Fetch trending videos for a category and cache them.
    
    Returns quota units used (1 for videos.list chart=mostPopular).
    """
    logger.info(f"Fetching trending videos for category: {category}")
    
    try:
        videos = await collector.fetch_trending(category=category, max_results=50)
        
        # Serialize and cache
        cache_data = {
            "videos": [_serialize_video(v) for v in videos],
            "category": category,
            "region": "US",
            "fetched_at": datetime.utcnow().isoformat(),
            "video_count": len(videos),
        }
        
        cache_key = YOUTUBE_TRENDING_KEY.format(category=category)
        await redis_client.setex(cache_key, TRENDING_CACHE_TTL, json.dumps(cache_data))
        
        # Track last fetch time
        last_fetch_key = YOUTUBE_LAST_FETCH_KEY.format(type=f"trending:{category}")
        await redis_client.set(last_fetch_key, datetime.utcnow().isoformat())
        
        logger.info(f"Cached {len(videos)} trending videos for {category}")
        
        # Track quota: 1 unit for videos.list with chart=mostPopular
        await _track_quota_usage(redis_client, 1)
        return 1
        
    except Exception as e:
        logger.error(f"Failed to fetch trending for {category}: {e}")
        return 0


async def fetch_game_videos(
    collector: YouTubeCollector,
    redis_client: redis.Redis,
    game: dict,
    force: bool = False,
) -> int:
    """
    Fetch videos for a specific game using search and cache them.
    
    Returns quota units used (100 for search + 1 for video details = 101).
    Skips fetch if cache is fresh (< 12 hours old) unless force=True.
    """
    game_key = game["key"]
    query = game["query"]
    display_name = game["display"]
    
    # Cache-aware: skip if we have fresh data (dev restart protection)
    if not force:
        cache_key = YOUTUBE_GAMES_KEY.format(game=game_key)
        cached = await redis_client.get(cache_key)
        if cached:
            try:
                data = json.loads(cached)
                fetched_at_str = data.get("fetched_at")
                if fetched_at_str:
                    fetched_at = datetime.fromisoformat(fetched_at_str)
                    age_hours = (datetime.utcnow() - fetched_at).total_seconds() / 3600
                    if age_hours < 12:  # Cache is fresh enough
                        logger.info(f"Skipping {display_name} - cache is {age_hours:.1f}h old (< 12h)")
                        return 0  # No quota used
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Could not parse cache for {game_key}: {e}")
    
    logger.info(f"Fetching videos for game: {display_name} (query: {query})")
    
    try:
        # search_videos costs 100 units + fetch_video_stats costs 1 unit
        # Using "relevance" instead of "viewCount" for better mix of viral + rising
        # Extended to 7 days and 35 results for better pattern analysis
        videos = await collector.search_videos(
            query=query,
            category="gaming",
            max_results=35,  # More data, same API cost
            order="relevance",  # Mix of views + recency + engagement
            published_after=datetime.utcnow() - timedelta(days=7),  # 7 days for better coverage
        )
        
        # Serialize and cache
        cache_data = {
            "videos": [_serialize_video(v) for v in videos],
            "game": game_key,
            "game_display_name": display_name,
            "fetched_at": datetime.utcnow().isoformat(),
            "video_count": len(videos),
        }
        
        cache_key = YOUTUBE_GAMES_KEY.format(game=game_key)
        await redis_client.setex(cache_key, GAMES_CACHE_TTL, json.dumps(cache_data))
        
        # Track last fetch time
        last_fetch_key = YOUTUBE_LAST_FETCH_KEY.format(type=f"games:{game_key}")
        await redis_client.set(last_fetch_key, datetime.utcnow().isoformat())
        
        logger.info(f"Cached {len(videos)} videos for {display_name}")
        
        # Track quota: 100 (search) + 1 (video details) = 101 units
        await _track_quota_usage(redis_client, 101)
        return 101
        
    except Exception as e:
        logger.error(f"Failed to fetch videos for {display_name}: {e}")
        return 0


async def fetch_all_trending() -> dict:
    """
    Fetch trending videos for all categories.
    
    Called every 30 minutes by scheduler.
    Quota cost: 4 units (1 per category).
    """
    logger.info("Starting scheduled trending fetch for all categories")
    
    collector = get_youtube_collector()
    redis_client = _get_redis_client()
    
    total_units = 0
    results = {}
    
    try:
        for category in CATEGORIES:
            units = await fetch_trending_category(collector, redis_client, category)
            total_units += units
            results[category] = "success" if units > 0 else "failed"
        
        quota_today = await _get_quota_used_today(redis_client)
        logger.info(f"Trending fetch complete. Units used: {total_units}. Total today: {quota_today}")
        
        return {
            "status": "complete",
            "categories": results,
            "units_used": total_units,
            "quota_today": quota_today,
        }
        
    finally:
        await redis_client.close()
        await collector.close()


async def fetch_all_games(force: bool = False) -> dict:
    """
    Fetch videos for all tracked games using search.
    
    Called once daily by scheduler (at 5 AM UTC).
    Quota cost: ~808 units max (101 per game × 8 games).
    
    With cache-aware fetching, restarts with fresh cache cost 0 units.
    
    Args:
        force: If True, bypass cache freshness check and fetch all games.
    """
    logger.info(f"Starting daily game videos fetch (force={force})")
    
    collector = get_youtube_collector()
    redis_client = _get_redis_client()
    
    # Check quota before proceeding
    quota_today = await _get_quota_used_today(redis_client)
    if quota_today > 8500:
        logger.warning(f"Quota usage high ({quota_today}/10000). Skipping game fetch.")
        await redis_client.close()
        return {
            "status": "skipped",
            "reason": "quota_limit",
            "quota_today": quota_today,
        }
    
    total_units = 0
    results = {}
    skipped = 0
    
    try:
        for game in GAMES_TO_FETCH:
            units = await fetch_game_videos(collector, redis_client, game, force=force)
            total_units += units
            
            if units > 0:
                results[game["key"]] = "success"
            else:
                results[game["key"]] = "skipped_fresh_cache"
                skipped += 1
            
            # Small delay between requests
            await asyncio.sleep(1)
        
        quota_today = await _get_quota_used_today(redis_client)
        logger.info(f"Game fetch complete. Units used: {total_units}. Skipped: {skipped}. Total today: {quota_today}")
        
        return {
            "status": "complete",
            "games": results,
            "units_used": total_units,
            "games_skipped": skipped,
            "quota_today": quota_today,
        }
        
    finally:
        await redis_client.close()
        await collector.close()


async def get_cached_trending(category: TrendCategory) -> Optional[dict]:
    """
    Get cached trending videos for a category.
    
    This is what the API routes should call - never hit YouTube directly!
    """
    redis_client = _get_redis_client()
    
    try:
        cache_key = YOUTUBE_TRENDING_KEY.format(category=category)
        cached = await redis_client.get(cache_key)
        
        if cached:
            return json.loads(cached)
        return None
        
    finally:
        await redis_client.close()


async def get_cached_game_videos(game_key: str) -> Optional[dict]:
    """
    Get cached videos for a specific game.
    
    This is what the API routes should call - never hit YouTube directly!
    Videos are extracted from trending by keyword matching (no extra API calls).
    """
    redis_client = _get_redis_client()
    
    try:
        cache_key = YOUTUBE_GAMES_KEY.format(game=game_key)
        cached = await redis_client.get(cache_key)
        
        if cached:
            return json.loads(cached)
        return None
        
    finally:
        await redis_client.close()


async def get_quota_status() -> dict:
    """Get current quota usage status."""
    redis_client = _get_redis_client()
    
    try:
        quota_today = await _get_quota_used_today(redis_client)
        
        return {
            "quota_used_today": quota_today,
            "quota_limit": 10000,
            "quota_remaining": 10000 - quota_today,
            "percentage_used": round((quota_today / 10000) * 100, 1),
        }
        
    finally:
        await redis_client.close()


# ============================================================================
# Scheduler / Worker Entry Point
# ============================================================================

async def run_scheduler():
    """
    Run the YouTube data fetch scheduler.
    
    Fetches trending every 30 minutes (4 units per run).
    Game-specific videos are extracted from trending (no extra API calls).
    
    Daily quota: ~192 units (well under 10,000 limit)
    """
    logger.info("Starting YouTube worker scheduler")
    
    last_trending_fetch = datetime.min
    
    while True:
        now = datetime.utcnow()
        
        # Check if trending fetch is due
        if (now - last_trending_fetch).total_seconds() >= TRENDING_FETCH_INTERVAL:
            try:
                await fetch_all_trending()
                last_trending_fetch = now
            except Exception as e:
                logger.error(f"Trending fetch failed: {e}")
        
        # Sleep for 1 minute before checking again
        await asyncio.sleep(60)


def run_worker():
    """Start the YouTube worker."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    
    logger.info("Starting YouTube data worker...")
    logger.info(f"Redis URL: {REDIS_URL}")
    logger.info(f"Trending interval: {TRENDING_FETCH_INTERVAL}s")
    logger.info("Game videos: Cache-aware fetching (skips if < 12h old)")
    
    # Check for force flag
    force = "--force" in sys.argv
    if force:
        logger.info("⚠️  Force mode enabled - will bypass cache freshness checks")
    
    # Do initial fetch immediately
    logger.info("Running initial data fetch...")
    asyncio.run(fetch_all_trending())
    asyncio.run(fetch_all_games(force=force))
    
    # Then start the scheduler
    asyncio.run(run_scheduler())


if __name__ == "__main__":
    run_worker()
