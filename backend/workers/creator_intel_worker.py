"""
Creator Intel Worker for AuraStream.

Pre-computes and caches intelligence data for all tracked game categories:
- Title Intel (keywords, tags, title patterns, phrases)
- Video Ideas (synthesized content concepts)
- Viral Analysis (trending topics, opportunity scores)

Schedule: Every 4 hours (aligned with playbook_worker)
- Syncs with YouTube data refresh cycles
- Game-specific data updates daily, trending every 30 min
- 4-hour cycle catches trending shifts while not wasting compute

Data Flow:
    youtube_worker → Redis cache → creator_intel_worker → Redis + PostgreSQL

Usage:
    # Continuous mode (recommended for Docker/systemd)
    python -m backend.workers.creator_intel_worker
    
    # Single-run mode (for cron jobs)
    python -m backend.workers.creator_intel_worker --once
    
    # Force refresh (bypass time check)
    python -m backend.workers.creator_intel_worker --once --force
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

# Generation interval (4 hours - synced with playbook_worker)
GENERATION_INTERVAL = 4 * 60 * 60

# Minimum time between generations (prevent spam)
MIN_GENERATION_GAP = 60 * 60  # 1 hour

# Retry configuration
MAX_RETRIES = 3
RETRY_BASE_DELAY = 5  # seconds

# Redis keys for storing pre-computed intel
INTEL_TITLE_KEY = "intel:title:precomputed:{game}"
INTEL_VIDEO_IDEAS_KEY = "intel:video_ideas:precomputed:{game}"
INTEL_VIRAL_KEY = "intel:viral:precomputed:{game}"
INTEL_LAST_RUN_KEY = "intel:worker:last_run"
INTEL_CACHE_TTL = 5 * 60 * 60  # 5 hours (slightly longer than run interval)

# Intel V2 analyzer keys
INTEL_V2_FORMAT_KEY = "intel:format:precomputed:{game}"
INTEL_V2_DESCRIPTION_KEY = "intel:description:precomputed:{game}"
INTEL_V2_SEMANTIC_KEY = "intel:semantic:precomputed:{game}"
INTEL_V2_REGIONAL_KEY = "intel:regional:precomputed:{game}"
INTEL_V2_LIVESTREAM_KEY = "intel:livestream:precomputed:{game}"

# Games to analyze (same as youtube_worker)
TRACKED_GAMES = [
    {"key": "fortnite", "name": "Fortnite"},
    {"key": "warzone", "name": "Warzone"},
    {"key": "valorant", "name": "Valorant"},
    {"key": "apex_legends", "name": "Apex Legends"},
    {"key": "gta", "name": "GTA"},
    {"key": "minecraft", "name": "Minecraft"},
    {"key": "roblox", "name": "Roblox"},
    {"key": "arc_raiders", "name": "Arc Raiders"},
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


async def retry_with_backoff(func, *args, max_retries=MAX_RETRIES, **kwargs):
    """
    Execute a function with exponential backoff retry.
    
    Args:
        func: Async function to execute
        *args: Positional arguments for func
        max_retries: Maximum number of retry attempts
        **kwargs: Keyword arguments for func
        
    Returns:
        Result of func or None if all retries failed
    """
    last_error = None
    for attempt in range(max_retries + 1):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            last_error = e
            if attempt < max_retries:
                delay = RETRY_BASE_DELAY * (2 ** attempt)
                logger.warning(
                    f"Attempt {attempt + 1}/{max_retries + 1} failed: {e}. "
                    f"Retrying in {delay}s..."
                )
                await asyncio.sleep(delay)
            else:
                logger.error(f"All {max_retries + 1} attempts failed: {last_error}")
    return None


async def check_last_run_time() -> tuple[bool, str]:
    """Check if enough time has passed since the last run."""
    try:
        redis_client = await get_redis_client()
        last_run = await redis_client.get(INTEL_LAST_RUN_KEY)
        await redis_client.aclose()
        
        if not last_run:
            return True, "No previous runs found"
        
        last_dt = datetime.fromisoformat(last_run)
        now = datetime.now(timezone.utc)
        elapsed = (now - last_dt).total_seconds()
        
        if elapsed < MIN_GENERATION_GAP:
            return False, f"Last run was {elapsed/60:.0f} minutes ago (min gap: {MIN_GENERATION_GAP/60:.0f} min)"
        
        return True, f"Last run was {elapsed/3600:.1f} hours ago"
        
    except Exception as e:
        logger.warning(f"Error checking last run time: {e}")
        return True, "Error checking - proceeding with generation"


async def analyze_title_intel(game_key: str) -> Optional[Dict[str, Any]]:
    """Run title intel analysis for a game with retry."""
    async def _analyze():
        from backend.services.title_intel import get_title_intel_analyzer
        
        analyzer = get_title_intel_analyzer()
        intel = await analyzer.analyze_game(game_key)
        
        if not intel:
            return None
        
        # Serialize for caching
        return {
            "game_key": intel.game_key,
            "game_name": intel.game_name,
            "analyzed_at": intel.analyzed_at,
            "video_count": intel.video_count,
            "top_keywords": [
                {
                    "keyword": k.keyword,
                    "frequency": k.frequency,
                    "avg_views": k.avg_views,
                    "velocity_score": k.velocity_score,
                    "is_trending": k.is_trending,
                    "confidence": k.confidence,
                    "tf_idf_score": k.tf_idf_score,
                }
                for k in intel.top_keywords
            ],
            "top_phrases": [
                {
                    "phrase": p.phrase,
                    "frequency": p.frequency,
                    "avg_views": p.avg_views,
                    "velocity_score": p.velocity_score,
                    "is_trending": p.is_trending,
                    "confidence": p.confidence,
                }
                for p in intel.top_phrases
            ],
            "top_tags": [
                {
                    "tag": t.tag,
                    "frequency": t.frequency,
                    "avg_views": t.avg_views,
                }
                for t in intel.top_tags
            ],
            "title_suggestions": [
                {
                    "title": s.title,
                    "hook": s.hook,
                    "views": s.views,
                    "velocity": s.velocity,
                    "template": s.template,
                    "why_it_works": s.why_it_works,
                }
                for s in intel.title_suggestions
            ],
            "trending_hooks": intel.trending_hooks,
            "trending_power_words": intel.trending_power_words,
            "data_confidence": intel.data_confidence,
            "data_freshness_hours": intel.data_freshness_hours,
        }
    
    try:
        return await retry_with_backoff(_analyze)
    except Exception as e:
        logger.error(f"Title intel analysis failed for {game_key}: {e}")
        return None


async def analyze_video_ideas(game_key: str) -> Optional[Dict[str, Any]]:
    """Generate video ideas for a game."""
    try:
        from backend.services.intel.video_idea_generator import get_video_idea_generator
        
        generator = get_video_idea_generator()
        response = await generator.generate_ideas(game_key, max_ideas=5)
        
        if not response:
            return None
        
        return {
            "game_key": response.game_key,
            "game_name": response.game_name,
            "analyzed_at": response.analyzed_at,
            "data_freshness_hours": response.data_freshness_hours,
            "overall_opportunity": response.overall_opportunity,
            "ideas": [
                {
                    "concept": idea.concept,
                    "hook": idea.hook,
                    "why_now": idea.why_now,
                    "format_suggestion": idea.format_suggestion,
                    "trending_elements": idea.trending_elements,
                    "suggested_tags": idea.suggested_tags,
                    "difficulty": idea.difficulty,
                    "opportunity_score": idea.opportunity_score,
                    "confidence": idea.confidence,
                }
                for idea in response.ideas
            ],
        }
        
    except Exception as e:
        logger.error(f"Video ideas generation failed for {game_key}: {e}")
        return None


async def analyze_viral(game_key: str) -> Optional[Dict[str, Any]]:
    """Run viral analysis for a game."""
    try:
        from backend.services.intel.viral_detector import get_viral_detector
        
        detector = get_viral_detector()
        analysis = await detector.analyze_category(game_key)
        
        if not analysis:
            return None
        
        return analysis.to_dict()
        
    except Exception as e:
        logger.error(f"Viral analysis failed for {game_key}: {e}")
        return None


async def analyze_intel_v2(game_key: str, redis_client) -> Dict[str, bool]:
    """
    Run all Intel V2 analyzers for a game.
    
    Analyzers:
    - Content Format: Duration buckets, shorts vs longform, live vs VOD
    - Description: Hashtags, timestamps, sponsors, social links
    - Semantic: Topics, tags, clusters
    - Regional: Language competition, opportunities
    - Live Stream: Premieres, scheduling, duration comparison
    """
    results = {
        "content_format": False,
        "description": False,
        "semantic": False,
        "regional": False,
        "live_stream": False,
    }
    
    # Content Format Analyzer
    try:
        from backend.services.intel.analyzers.content_format import get_content_format_analyzer
        analyzer = get_content_format_analyzer()
        result = await analyzer.analyze_with_cache(game_key)
        if result and result.data:
            key = INTEL_V2_FORMAT_KEY.format(game=game_key)
            cache_data = {
                "data": result.data,
                "category_key": result.category_key,
                "analyzer_name": result.analyzer_name,
                "confidence": result.confidence,
                "video_count": result.video_count,
                "analyzed_at": result.analyzed_at.isoformat() if result.analyzed_at else None,
            }
            await redis_client.setex(key, INTEL_CACHE_TTL, json.dumps(cache_data))
            results["content_format"] = True
            logger.debug(f"  Content format analysis complete for {game_key}")
    except Exception as e:
        logger.error(f"Content format analysis failed for {game_key}: {e}")
    
    # Description Analyzer
    try:
        from backend.services.intel.analyzers.description import get_description_analyzer
        analyzer = get_description_analyzer()
        result = await analyzer.analyze_with_cache(game_key)
        if result and result.data:
            key = INTEL_V2_DESCRIPTION_KEY.format(game=game_key)
            cache_data = {
                "data": result.data,
                "category_key": result.category_key,
                "analyzer_name": result.analyzer_name,
                "confidence": result.confidence,
                "video_count": result.video_count,
                "analyzed_at": result.analyzed_at.isoformat() if result.analyzed_at else None,
            }
            await redis_client.setex(key, INTEL_CACHE_TTL, json.dumps(cache_data))
            results["description"] = True
            logger.debug(f"  Description analysis complete for {game_key}")
    except Exception as e:
        logger.error(f"Description analysis failed for {game_key}: {e}")
    
    # Semantic Analyzer
    try:
        from backend.services.intel.analyzers.semantic import get_semantic_analyzer
        analyzer = get_semantic_analyzer()
        result = await analyzer.analyze_with_cache(game_key)
        if result and result.data:
            key = INTEL_V2_SEMANTIC_KEY.format(game=game_key)
            cache_data = {
                "data": result.data,
                "category_key": result.category_key,
                "analyzer_name": result.analyzer_name,
                "confidence": result.confidence,
                "video_count": result.video_count,
                "analyzed_at": result.analyzed_at.isoformat() if result.analyzed_at else None,
            }
            await redis_client.setex(key, INTEL_CACHE_TTL, json.dumps(cache_data))
            results["semantic"] = True
            logger.debug(f"  Semantic analysis complete for {game_key}")
    except Exception as e:
        logger.error(f"Semantic analysis failed for {game_key}: {e}")
    
    # Regional Analyzer
    try:
        from backend.services.intel.analyzers.regional import get_regional_analyzer
        analyzer = get_regional_analyzer()
        result = await analyzer.analyze_with_cache(game_key)
        if result and result.data:
            key = INTEL_V2_REGIONAL_KEY.format(game=game_key)
            cache_data = {
                "data": result.data,
                "category_key": result.category_key,
                "analyzer_name": result.analyzer_name,
                "confidence": result.confidence,
                "video_count": result.video_count,
                "analyzed_at": result.analyzed_at.isoformat() if result.analyzed_at else None,
            }
            await redis_client.setex(key, INTEL_CACHE_TTL, json.dumps(cache_data))
            results["regional"] = True
            logger.debug(f"  Regional analysis complete for {game_key}")
    except Exception as e:
        logger.error(f"Regional analysis failed for {game_key}: {e}")
    
    # Live Stream Analyzer
    try:
        from backend.services.intel.analyzers.live_stream import get_live_stream_analyzer
        analyzer = get_live_stream_analyzer()
        result = await analyzer.analyze_with_cache(game_key)
        if result and result.data:
            key = INTEL_V2_LIVESTREAM_KEY.format(game=game_key)
            cache_data = {
                "data": result.data,
                "category_key": result.category_key,
                "analyzer_name": result.analyzer_name,
                "confidence": result.confidence,
                "video_count": result.video_count,
                "analyzed_at": result.analyzed_at.isoformat() if result.analyzed_at else None,
            }
            await redis_client.setex(key, INTEL_CACHE_TTL, json.dumps(cache_data))
            results["live_stream"] = True
            logger.debug(f"  Live stream analysis complete for {game_key}")
    except Exception as e:
        logger.error(f"Live stream analysis failed for {game_key}: {e}")
    
    return results


async def store_intel_results(
    redis_client,
    game_key: str,
    title_intel: Optional[Dict],
    video_ideas: Optional[Dict],
    viral_analysis: Optional[Dict],
) -> Dict[str, bool]:
    """Store analysis results in Redis."""
    results = {"title": False, "ideas": False, "viral": False}
    
    try:
        if title_intel:
            key = INTEL_TITLE_KEY.format(game=game_key)
            await redis_client.setex(key, INTEL_CACHE_TTL, json.dumps(title_intel))
            results["title"] = True
            
        if video_ideas:
            key = INTEL_VIDEO_IDEAS_KEY.format(game=game_key)
            await redis_client.setex(key, INTEL_CACHE_TTL, json.dumps(video_ideas))
            results["ideas"] = True
            
        if viral_analysis:
            key = INTEL_VIRAL_KEY.format(game=game_key)
            await redis_client.setex(key, INTEL_CACHE_TTL, json.dumps(viral_analysis))
            results["viral"] = True
            
    except Exception as e:
        logger.error(f"Failed to store intel results for {game_key}: {e}")
    
    return results


async def run_intel_generation(force: bool = False) -> Dict[str, Any]:
    """Execute a full intel generation cycle for all games."""
    logger.info("=" * 60)
    logger.info("CREATOR INTEL WORKER - Starting")
    logger.info("=" * 60)
    
    start_time = time.time()
    
    # Check if we should run
    if not force:
        should_run, reason = await check_last_run_time()
        logger.info(f"Run check: {reason}")
        
        if not should_run:
            return {"skipped": True, "reason": reason}
    
    redis_client = await get_redis_client()
    
    results = {
        "games_processed": 0,
        "title_intel_success": 0,
        "video_ideas_success": 0,
        "viral_analysis_success": 0,
        # Intel V2 results
        "intel_v2_content_format_success": 0,
        "intel_v2_description_success": 0,
        "intel_v2_semantic_success": 0,
        "intel_v2_regional_success": 0,
        "intel_v2_live_stream_success": 0,
        "errors": [],
        "details": {},
    }
    
    try:
        for game in TRACKED_GAMES:
            game_key = game["key"]
            game_name = game["name"]
            
            logger.info(f"Processing {game_name} ({game_key})...")
            game_start = time.time()
            
            # Run V1 analyses (title, video ideas, viral)
            title_intel = await analyze_title_intel(game_key)
            video_ideas = await analyze_video_ideas(game_key)
            viral_analysis = await analyze_viral(game_key)
            
            # Store V1 results
            store_results = await store_intel_results(
                redis_client, game_key, title_intel, video_ideas, viral_analysis
            )
            
            # Run Intel V2 analyzers
            v2_results = await analyze_intel_v2(game_key, redis_client)
            
            # Track results
            results["games_processed"] += 1
            if store_results["title"]:
                results["title_intel_success"] += 1
            if store_results["ideas"]:
                results["video_ideas_success"] += 1
            if store_results["viral"]:
                results["viral_analysis_success"] += 1
            
            # Track V2 results
            if v2_results["content_format"]:
                results["intel_v2_content_format_success"] += 1
            if v2_results["description"]:
                results["intel_v2_description_success"] += 1
            if v2_results["semantic"]:
                results["intel_v2_semantic_success"] += 1
            if v2_results["regional"]:
                results["intel_v2_regional_success"] += 1
            if v2_results["live_stream"]:
                results["intel_v2_live_stream_success"] += 1
            
            game_duration = time.time() - game_start
            
            results["details"][game_key] = {
                "title_intel": store_results["title"],
                "video_ideas": store_results["ideas"],
                "viral_analysis": store_results["viral"],
                "intel_v2": v2_results,
                "duration_seconds": round(game_duration, 2),
                "keywords_count": len(title_intel.get("top_keywords", [])) if title_intel else 0,
                "ideas_count": len(video_ideas.get("ideas", [])) if video_ideas else 0,
            }
            
            v2_success = sum(1 for v in v2_results.values() if v)
            logger.info(
                f"  {game_name}: title={store_results['title']}, "
                f"ideas={store_results['ideas']}, viral={store_results['viral']}, "
                f"v2={v2_success}/5 "
                f"({game_duration:.1f}s)"
            )
            
            # Small delay between games to avoid overwhelming services
            await asyncio.sleep(0.5)
        
        # Update last run timestamp
        await redis_client.set(
            INTEL_LAST_RUN_KEY,
            datetime.now(timezone.utc).isoformat()
        )
        
    except Exception as e:
        logger.error(f"Intel generation failed: {e}")
        results["errors"].append(str(e))
    finally:
        await redis_client.aclose()
    
    elapsed = time.time() - start_time
    results["duration_seconds"] = round(elapsed, 2)
    results["generated_at"] = datetime.now(timezone.utc).isoformat()
    
    logger.info("=" * 60)
    logger.info("CREATOR INTEL WORKER - Complete")
    logger.info("=" * 60)
    logger.info(f"  Games processed: {results['games_processed']}")
    logger.info(f"  Title intel: {results['title_intel_success']}/{results['games_processed']}")
    logger.info(f"  Video ideas: {results['video_ideas_success']}/{results['games_processed']}")
    logger.info(f"  Viral analysis: {results['viral_analysis_success']}/{results['games_processed']}")
    logger.info(f"  Intel V2 Content Format: {results['intel_v2_content_format_success']}/{results['games_processed']}")
    logger.info(f"  Intel V2 Description: {results['intel_v2_description_success']}/{results['games_processed']}")
    logger.info(f"  Intel V2 Semantic: {results['intel_v2_semantic_success']}/{results['games_processed']}")
    logger.info(f"  Intel V2 Regional: {results['intel_v2_regional_success']}/{results['games_processed']}")
    logger.info(f"  Intel V2 Live Stream: {results['intel_v2_live_stream_success']}/{results['games_processed']}")
    logger.info(f"  Duration: {elapsed:.1f}s")
    logger.info("=" * 60)
    
    return results


def run_generation_sync(force: bool = False) -> Dict[str, Any]:
    """Synchronous wrapper for run_intel_generation."""
    return asyncio.run(run_intel_generation(force=force))


def run_continuous():
    """Run the worker in continuous mode."""
    logger.info("=" * 60)
    logger.info("CREATOR INTEL WORKER - Starting (Continuous Mode)")
    logger.info("=" * 60)
    logger.info(f"Generation interval: {GENERATION_INTERVAL / 3600:.1f} hours")
    logger.info(f"Minimum gap: {MIN_GENERATION_GAP / 60:.0f} minutes")
    logger.info(f"Tracked games: {len(TRACKED_GAMES)}")
    
    # Register signal handlers
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    last_generation = 0
    
    # Generate immediately on startup
    logger.info("Running initial generation on startup...")
    result = run_generation_sync(force=False)
    if result.get("skipped"):
        logger.info(f"Initial generation skipped: {result.get('reason')}")
        # Set last_generation to avoid immediate retry
        last_generation = time.time() - GENERATION_INTERVAL + MIN_GENERATION_GAP
    else:
        last_generation = time.time()
    
    while not _shutdown_requested:
        now = time.time()
        
        # Check if it's time to generate
        if now - last_generation >= GENERATION_INTERVAL:
            logger.info(f"Scheduled generation triggered (interval: {GENERATION_INTERVAL/3600:.1f}h)")
            result = run_generation_sync(force=False)
            
            if result.get("skipped"):
                pass  # Don't update last_generation
            elif result.get("errors"):
                logger.warning("Generation had errors, will retry in 30 minutes")
                last_generation = now - GENERATION_INTERVAL + (30 * 60)
            else:
                last_generation = now
        
        # Sleep for a short interval before checking again
        time.sleep(60)
    
    logger.info("Creator Intel Worker shutting down...")


def run_once(force: bool = False):
    """Run a single generation and exit."""
    logger.info("Running single intel generation...")
    result = run_generation_sync(force=force)
    
    if result.get("errors"):
        logger.error(f"Generation had errors: {result.get('errors')}")
        sys.exit(1)
    elif result.get("skipped"):
        logger.info(f"Generation skipped: {result.get('reason')}")
        sys.exit(0)
    else:
        logger.info("Generation completed successfully")
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
        description="Creator Intel Worker - Pre-computes keywords, tags, titles, and video ideas"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single generation and exit (for cron jobs)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force generation even if less than minimum gap since last run"
    )
    
    args = parser.parse_args()
    
    # Validate environment
    redis_url = os.environ.get("REDIS_URL")
    
    logger.info("Environment check:")
    logger.info(f"  Redis URL: {'✓' if redis_url else '⚠ Using default localhost'}")
    
    if args.once:
        run_once(force=args.force)
    else:
        run_continuous()


if __name__ == "__main__":
    main()
