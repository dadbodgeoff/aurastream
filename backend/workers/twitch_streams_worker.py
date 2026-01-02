"""
Twitch Streams Data Worker for AuraStream.

Fetches and caches Twitch stream data for tracked game categories.
Enables real-time competition analysis without live API calls.

Schedule: Every 15 minutes
- Twitch stream landscape changes frequently
- Competition analyzer has 15-min cache TTL
- Keeps data fresh without excessive API calls

Data Flow:
    Twitch API → twitch_streams_worker → Redis cache → competition_analyzer

Usage:
    # Continuous mode (recommended)
    python -m backend.workers.twitch_streams_worker
    
    # Single-run mode (for testing)
    python -m backend.workers.twitch_streams_worker --once
"""

import argparse
import asyncio
import json
import logging
import os
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

# Fetch interval (15 minutes)
FETCH_INTERVAL = 15 * 60

# Redis keys
TWITCH_STREAMS_KEY = "twitch:streams:{game_id}"
TWITCH_GAMES_KEY = "twitch:top_games"
TWITCH_LAST_FETCH_KEY = "twitch:streams:last_fetch"
CACHE_TTL = 20 * 60  # 20 minutes (slightly longer than fetch interval)

# Tracked games with Twitch IDs
# These should match the games in youtube_worker for consistency
TRACKED_GAMES = [
    {"key": "fortnite", "twitch_id": "33214", "name": "Fortnite"},
    {"key": "valorant", "twitch_id": "516575", "name": "VALORANT"},
    {"key": "minecraft", "twitch_id": "27471", "name": "Minecraft"},
    {"key": "apex_legends", "twitch_id": "511224", "name": "Apex Legends"},
    {"key": "warzone", "twitch_id": "512710", "name": "Call of Duty: Warzone"},
    {"key": "gta", "twitch_id": "32982", "name": "Grand Theft Auto V"},
    {"key": "roblox", "twitch_id": "23020", "name": "Roblox"},
    {"key": "league_of_legends", "twitch_id": "21779", "name": "League of Legends"},
]

# Graceful shutdown flag
_shutdown_requested = False


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    global _shutdown_requested
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    _shutdown_requested = True


async def get_redis_client():
    """Get async Redis client."""
    import redis.asyncio as redis
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
    return redis.from_url(redis_url, decode_responses=True)


async def fetch_streams_for_game(
    twitch_collector,
    game: Dict[str, str],
) -> Optional[Dict[str, Any]]:
    """Fetch top streams for a specific game."""
    game_id = game["twitch_id"]
    game_name = game["name"]
    
    try:
        streams = await twitch_collector.fetch_top_streams(
            limit=100,
            game_id=game_id,
        )
        
        if not streams:
            logger.warning(f"No streams found for {game_name}")
            return None
        
        # Serialize stream data
        stream_data = []
        viewer_counts = []
        
        for stream in streams:
            viewer_counts.append(stream.viewer_count)
            stream_data.append({
                "stream_id": stream.id,
                "user_id": stream.user_id,
                "user_name": stream.user_name,
                "game_id": stream.game_id,
                "game_name": stream.game_name,
                "title": stream.title[:200] if stream.title else "",
                "viewer_count": stream.viewer_count,
                "started_at": stream.started_at.isoformat() if stream.started_at else None,
                "language": stream.language,
                "is_mature": stream.is_mature,
            })
        
        total_viewers = sum(viewer_counts)
        avg_viewers = total_viewers / len(viewer_counts) if viewer_counts else 0
        
        return {
            "game_id": game_id,
            "game_key": game["key"],
            "game_name": game_name,
            "stream_count": len(streams),
            "total_viewers": total_viewers,
            "avg_viewers_per_stream": round(avg_viewers, 2),
            "top_viewer_count": max(viewer_counts) if viewer_counts else 0,
            "viewer_counts": viewer_counts,  # For distribution analysis
            "streams": stream_data,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
        
    except Exception as e:
        logger.error(f"Failed to fetch streams for {game_name}: {e}")
        return None


async def fetch_top_games(twitch_collector) -> Optional[List[Dict[str, Any]]]:
    """Fetch current top games on Twitch."""
    try:
        games = await twitch_collector.fetch_top_games(limit=20)
        
        if not games:
            return None
        
        return [
            {
                "id": game.id,
                "name": game.name,
                "box_art_url": game.box_art_url,
            }
            for game in games
        ]
        
    except Exception as e:
        logger.error(f"Failed to fetch top games: {e}")
        return None


async def run_fetch_cycle() -> Dict[str, Any]:
    """Execute a full fetch cycle for all tracked games."""
    logger.info("=" * 60)
    logger.info("TWITCH STREAMS WORKER - Starting fetch cycle")
    logger.info("=" * 60)
    
    start_time = time.time()
    
    # Import Twitch collector
    try:
        from backend.services.trends.twitch_collector import get_twitch_collector
        twitch_collector = get_twitch_collector()
    except Exception as e:
        logger.error(f"Failed to initialize Twitch collector: {e}")
        return {"success": False, "error": str(e)}
    
    redis_client = await get_redis_client()
    
    results = {
        "games_fetched": 0,
        "total_streams": 0,
        "total_viewers": 0,
        "errors": [],
        "details": {},
    }
    
    try:
        # Fetch streams for each tracked game
        for game in TRACKED_GAMES:
            game_key = game["key"]
            game_name = game["name"]
            
            logger.info(f"Fetching streams for {game_name}...")
            
            stream_data = await fetch_streams_for_game(twitch_collector, game)
            
            if stream_data:
                # Store in Redis
                cache_key = TWITCH_STREAMS_KEY.format(game_id=game["twitch_id"])
                await redis_client.setex(
                    cache_key,
                    CACHE_TTL,
                    json.dumps(stream_data)
                )
                
                results["games_fetched"] += 1
                results["total_streams"] += stream_data["stream_count"]
                results["total_viewers"] += stream_data["total_viewers"]
                
                results["details"][game_key] = {
                    "stream_count": stream_data["stream_count"],
                    "total_viewers": stream_data["total_viewers"],
                    "avg_viewers": stream_data["avg_viewers_per_stream"],
                }
                
                logger.info(
                    f"  {game_name}: {stream_data['stream_count']} streams, "
                    f"{stream_data['total_viewers']:,} viewers"
                )
            else:
                results["errors"].append(f"No data for {game_name}")
            
            # Small delay between API calls
            await asyncio.sleep(0.3)
        
        # Fetch top games (for discovery)
        top_games = await fetch_top_games(twitch_collector)
        if top_games:
            await redis_client.setex(
                TWITCH_GAMES_KEY,
                CACHE_TTL,
                json.dumps({
                    "games": top_games,
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                })
            )
            logger.info(f"Cached top {len(top_games)} games")
        
        # Update last fetch timestamp
        await redis_client.set(
            TWITCH_LAST_FETCH_KEY,
            datetime.now(timezone.utc).isoformat()
        )
        
    except Exception as e:
        logger.error(f"Fetch cycle failed: {e}")
        results["errors"].append(str(e))
    finally:
        await redis_client.aclose()
        # TwitchCollector doesn't need explicit cleanup - uses per-request httpx clients
    
    elapsed = time.time() - start_time
    results["duration_seconds"] = round(elapsed, 2)
    results["fetched_at"] = datetime.now(timezone.utc).isoformat()
    
    logger.info("=" * 60)
    logger.info("TWITCH STREAMS WORKER - Fetch cycle complete")
    logger.info("=" * 60)
    logger.info(f"  Games fetched: {results['games_fetched']}/{len(TRACKED_GAMES)}")
    logger.info(f"  Total streams: {results['total_streams']:,}")
    logger.info(f"  Total viewers: {results['total_viewers']:,}")
    logger.info(f"  Duration: {elapsed:.1f}s")
    logger.info("=" * 60)
    
    return results


def run_fetch_sync() -> Dict[str, Any]:
    """Synchronous wrapper for run_fetch_cycle."""
    return asyncio.run(run_fetch_cycle())


def run_continuous():
    """Run the worker in continuous mode."""
    logger.info("=" * 60)
    logger.info("TWITCH STREAMS WORKER - Starting (Continuous Mode)")
    logger.info("=" * 60)
    logger.info(f"Fetch interval: {FETCH_INTERVAL / 60:.0f} minutes")
    logger.info(f"Tracked games: {len(TRACKED_GAMES)}")
    
    # Register signal handlers
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    # Fetch immediately on startup
    logger.info("Running initial fetch on startup...")
    run_fetch_sync()
    
    last_fetch = time.time()
    
    while not _shutdown_requested:
        now = time.time()
        
        # Check if it's time to fetch
        if now - last_fetch >= FETCH_INTERVAL:
            logger.info(f"Scheduled fetch triggered (interval: {FETCH_INTERVAL/60:.0f}m)")
            result = run_fetch_sync()
            
            if result.get("errors"):
                logger.warning(f"Fetch had errors: {result.get('errors')}")
            
            last_fetch = now
        
        # Sleep for a short interval
        time.sleep(30)
    
    logger.info("Twitch Streams Worker shutting down...")


def run_once():
    """Run a single fetch and exit."""
    logger.info("Running single fetch cycle...")
    result = run_fetch_sync()
    
    if result.get("errors"):
        logger.warning(f"Fetch had errors: {result.get('errors')}")
    
    logger.info("Fetch completed")
    sys.exit(0)


def main():
    """Main entry point."""
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)]
    )
    
    parser = argparse.ArgumentParser(
        description="Twitch Streams Worker - Fetches and caches Twitch stream data"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single fetch and exit (for testing)"
    )
    
    args = parser.parse_args()
    
    # Validate environment
    twitch_client_id = os.environ.get("TWITCH_CLIENT_ID")
    twitch_client_secret = os.environ.get("TWITCH_CLIENT_SECRET")
    redis_url = os.environ.get("REDIS_URL")
    
    logger.info("Environment check:")
    logger.info(f"  Twitch Client ID: {'✓' if twitch_client_id else '✗ NOT CONFIGURED'}")
    logger.info(f"  Twitch Client Secret: {'✓' if twitch_client_secret else '✗ NOT CONFIGURED'}")
    logger.info(f"  Redis URL: {'✓' if redis_url else '⚠ Using default localhost'}")
    
    if not twitch_client_id or not twitch_client_secret:
        logger.error("TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be configured")
        sys.exit(1)
    
    if args.once:
        run_once()
    else:
        run_continuous()


if __name__ == "__main__":
    main()
