"""
Trend Intelligence Route Handlers for AuraStream.

Daily Brief, YouTube Trending, Twitch Live, and Analysis endpoints.
Provides creators with actionable insights from trending content.
"""

import json
import logging
from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path

from backend.api.middleware.auth import get_current_user, get_current_user_optional
from backend.services.jwt_service import TokenPayload
from backend.api.schemas.trends import (
    DailyBriefResponse,
    MarketOpportunityData,
    DailyAssetsData,
    YouTubeTrendingResponse,
    YouTubeVideoResponse,
    YouTubeSearchRequest,
    YouTubeSearchResponse,
    YouTubeGameTrendingResponse,
    AvailableGamesResponse,
    TwitchLiveResponse,
    TwitchStreamResponse,
    TwitchGamesResponse,
    TwitchGameResponse,
    TwitchClipsResponse,
    TwitchClipResponse,
    ThumbnailAnalysisResponse,
    VelocityAlertsResponse,
    TimingRecommendationResponse,
    TrendHistoryResponse,
    CrossPlatformResponse,
    TrendingKeywordsResponse,
    TrendingKeyword,
)
from backend.services.trends import get_youtube_collector, get_twitch_collector
from backend.api.service_dependencies import YouTubeCollectorDep, TwitchCollectorDep, GenerationServiceDep
from backend.database.redis_client import get_redis_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/trends", tags=["Trends"])

# Cache TTLs (in seconds)
YOUTUBE_TRENDING_CACHE_TTL = 60 * 30  # 30 minutes - trending doesn't change that fast
YOUTUBE_GAMES_CACHE_TTL = 60 * 15     # 15 minutes - game-specific content
YOUTUBE_SEARCH_CACHE_TTL = 60 * 10    # 10 minutes - search results

# Game ID mapping for Twitch
TWITCH_GAME_IDS = {
    "fortnite": "33214",
    "warzone": "512710",
    "valorant": "516575",
    "minecraft": "27471",
    "league_of_legends": "21779",
    "apex_legends": "511224",
    "gta": "32982",
    "roblox": "23020",
    "call_of_duty": "512710",
}

# Tier limits for rate-limited features
SEARCH_LIMITS = {"free": 0, "pro": 10, "studio": 50, "unlimited": 100}
THUMBNAIL_LIMITS = {"free": 3, "pro": 20, "studio": 1000, "unlimited": 1000}
HISTORY_DAYS = {"free": 0, "pro": 7, "studio": 30, "unlimited": 30}

# Game search terms mapping
GAME_SEARCH_TERMS = {
    "fortnite": {"query": "fortnite", "display": "Fortnite"},
    "warzone": {"query": "warzone OR call of duty warzone", "display": "Warzone"},
    "valorant": {"query": "valorant", "display": "Valorant"},
    "minecraft": {"query": "minecraft", "display": "Minecraft"},
    "arc_raiders": {"query": "arc raiders", "display": "Arc Raiders"},
    "league_of_legends": {"query": "league of legends OR lol esports", "display": "League of Legends"},
    "apex_legends": {"query": "apex legends", "display": "Apex Legends"},
    "gta": {"query": "gta 5 OR gta online OR grand theft auto", "display": "GTA"},
    "roblox": {"query": "roblox", "display": "Roblox"},
    "call_of_duty": {"query": "call of duty OR cod", "display": "Call of Duty"},
}


# ============================================================================
# Helper Functions
# ============================================================================

def _get_tier(current_user: Optional[TokenPayload]) -> str:
    """Get user tier, defaulting to 'free' if not authenticated."""
    if current_user is None:
        return "free"
    return getattr(current_user, "tier", None) or "free"


def _check_tier_access(tier: str, required_tiers: tuple) -> bool:
    """Check if user tier has access to a feature."""
    return tier in required_tiers


# ============================================================================
# Public Endpoints (All Tiers)
# ============================================================================

@router.get("/daily-brief", response_model=DailyBriefResponse)
async def get_daily_brief(
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
    twitch_collector: TwitchCollectorDep = None,
    generation_service: GenerationServiceDep = None,
) -> DailyBriefResponse:
    """
    Get today's compiled daily brief with AI insights.
    
    Available to all tiers. Returns curated trending content with
    AI-generated insights, thumbnail of the day, and pattern analysis.
    
    NEW: Includes market_opportunity and daily_assets for Intel header badges.
    """
    try:
        # Get market opportunity data
        market_opportunity = None
        if current_user and twitch_collector:
            try:
                # Default to fortnite if no user preferences
                primary_category = "fortnite"
                game_id = TWITCH_GAME_IDS.get(primary_category)
                
                if game_id:
                    streams = await twitch_collector.fetch_top_streams(limit=100, game_id=game_id)
                    active_count = len(streams)
                    
                    # Determine opportunity level based on competition
                    if active_count < 100:
                        level = "high"
                        reason = f"Low competition with only {active_count} active streams"
                    elif active_count < 500:
                        level = "medium"
                        reason = f"Moderate competition with {active_count} active streams"
                    else:
                        level = "low"
                        reason = f"High competition with {active_count} active streams"
                    
                    market_opportunity = MarketOpportunityData(
                        level=level,
                        reason=reason,
                        active_streams=active_count,
                        change_percent=0.0,  # TODO: Calculate from historical data
                        primary_category=primary_category,
                    )
            except Exception as e:
                logger.warning(f"Failed to get market opportunity: {e}")
        
        # Get daily assets data
        daily_assets = None
        if current_user and generation_service:
            try:
                stats = await generation_service.get_daily_asset_stats(current_user.sub)
                daily_assets = DailyAssetsData(
                    created_today=stats.get("created_today", 0),
                    pending_review=stats.get("pending_review", 0),
                )
            except Exception as e:
                logger.warning(f"Failed to get daily asset stats: {e}")
        
        # Return basic brief with new fields
        return DailyBriefResponse(
            brief_date=date.today(),
            thumbnail_of_day=None,
            youtube_highlights=[],
            twitch_highlights=[],
            hot_games=[],
            top_clips=[],
            insights=[],
            best_upload_times=None,
            best_stream_times=None,
            title_patterns=None,
            thumbnail_patterns=None,
            trending_keywords=None,
            generated_at=datetime.utcnow(),
            market_opportunity=market_opportunity,
            daily_assets=daily_assets,
        )
        
    except Exception as e:
        logger.error(f"Failed to generate daily brief: {e}")
        # Return empty brief on error
        return DailyBriefResponse(
            brief_date=date.today(),
            thumbnail_of_day=None,
            youtube_highlights=[],
            twitch_highlights=[],
            hot_games=[],
            top_clips=[],
            insights=[],
            best_upload_times=None,
            best_stream_times=None,
            title_patterns=None,
            thumbnail_patterns=None,
            trending_keywords=None,
            generated_at=datetime.utcnow(),
            market_opportunity=None,
            daily_assets=None,
        )


@router.get("/youtube/trending", response_model=YouTubeTrendingResponse)
async def get_youtube_trending(
    category: str = Query("gaming", pattern="^(gaming|entertainment|music|education)$"),
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
) -> YouTubeTrendingResponse:
    """
    Get cached YouTube trending videos for a category.
    
    CACHE-ONLY: This endpoint reads from Redis cache populated by the
    youtube_worker. It NEVER hits the YouTube API directly.
    
    Data is refreshed every 30 minutes by the background worker.
    
    Categories: gaming, entertainment, music, education
    """
    from backend.workers.youtube_worker import get_cached_trending
    
    try:
        cached = await get_cached_trending(category)
        
        if cached:
            logger.info(f"YouTube trending cache HIT: {category}")
            videos = cached.get("videos", [])[:limit]
            return YouTubeTrendingResponse(
                videos=[YouTubeVideoResponse(**v) for v in videos],
                category=cached.get("category", category),
                region=cached.get("region", "US"),
                fetched_at=datetime.fromisoformat(cached["fetched_at"]) if cached.get("fetched_at") else datetime.utcnow(),
            )
        
        # No cache available - return empty with message
        logger.warning(f"YouTube trending cache MISS: {category} - worker may not be running")
        return YouTubeTrendingResponse(
            videos=[],
            category=category,
            region="US",
            fetched_at=datetime.utcnow(),
        )
    except Exception as e:
        logger.error(f"Error reading YouTube trending cache: {e}")
        return YouTubeTrendingResponse(
            videos=[],
            category=category,
            region="US",
            fetched_at=datetime.utcnow(),
        )


@router.get("/twitch/live", response_model=TwitchLiveResponse)
async def get_twitch_live(
    limit: int = Query(20, ge=1, le=100),
    game_id: Optional[str] = Query(None, description="Filter by game ID"),
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
    collector: TwitchCollectorDep = None,
) -> TwitchLiveResponse:
    """
    Get current top Twitch streams with rich metadata.
    
    Available to all tiers. Returns live streams with viewer counts,
    tags, language, duration, and velocity indicators.
    """
    try:
        raw_streams = await collector.fetch_top_streams(limit=limit, game_id=game_id)
        
        now = datetime.utcnow()
        streams = []
        total_viewers = 0
        
        for stream in raw_streams:
            # Calculate stream duration in minutes
            duration_minutes = None
            if stream.started_at:
                delta = now - stream.started_at.replace(tzinfo=None)
                duration_minutes = int(delta.total_seconds() / 60)
            
            streams.append(
                TwitchStreamResponse(
                    user_id=stream.user_id,
                    user_name=stream.user_name,
                    game_id=stream.game_id,
                    game_name=stream.game_name,
                    viewer_count=stream.viewer_count,
                    peak_viewers=None,  # Not available from streams endpoint
                    thumbnail=stream.thumbnail_url.replace("{width}", "440").replace("{height}", "248"),
                    title=stream.title,
                    started_at=stream.started_at,
                    duration_minutes=duration_minutes,
                    language=stream.language,
                    tags=stream.tags[:10] if stream.tags else [],  # Limit to 10 tags
                    is_mature=stream.is_mature,
                    velocity=None,  # Calculated separately
                    insight=None,   # Generated by AI
                )
            )
            total_viewers += stream.viewer_count
        
        return TwitchLiveResponse(
            streams=streams,
            total_viewers=total_viewers,
            fetched_at=datetime.utcnow()
        )
    except Exception as e:
        logger.warning(f"Failed to fetch Twitch live streams: {e}")
        return TwitchLiveResponse(
            streams=[],
            total_viewers=0,
            fetched_at=datetime.utcnow()
        )


@router.get("/twitch/games", response_model=TwitchGamesResponse)
async def get_twitch_games(
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
    collector: TwitchCollectorDep = None,
) -> TwitchGamesResponse:
    """
    Get current top games on Twitch with rich metadata.
    
    Available to all tiers. Returns games ranked by viewer count
    with tags, languages, and trend indicators.
    
    Note: Major categories (Just Chatting, Fortnite, etc.) fetch up to 500 streams
    for more accurate viewer counts. Other games fetch top 100.
    """
    # Major categories that deserve deeper stream fetching (500 streams = 5 pages)
    # These are consistently high-viewer categories
    MAJOR_CATEGORIES = {
        "509658",   # Just Chatting
        "33214",    # Fortnite
        "512710",   # Call of Duty: Warzone
        "516575",   # Valorant
        "511224",   # Apex Legends
        "21779",    # League of Legends
        "32982",    # Grand Theft Auto V
        "32399",    # Counter-Strike
        "27471",    # Minecraft
        "491931",   # Escape from Tarkov
    }
    
    try:
        # Fetch top games
        raw_games = await collector.fetch_top_games(limit=limit)
        
        # For each game, fetch streams to get accurate viewer counts
        games = []
        
        for game in raw_games:
            try:
                # Use pagination for major categories, single request for others
                if game.id in MAJOR_CATEGORIES:
                    # Fetch up to 500 streams (5 pages) for major categories
                    game_streams = await collector.fetch_streams_paginated(
                        game_id=game.id, 
                        max_streams=500
                    )
                else:
                    # Fetch top 100 streams for other games
                    game_streams = await collector.fetch_top_streams(limit=100, game_id=game.id)
                
                # Aggregate stats from this game's streams
                total_viewers = sum(s.viewer_count for s in game_streams)
                stream_count = len(game_streams)
                
                # Aggregate tags
                tag_counts: dict[str, int] = {}
                for stream in game_streams:
                    for tag in (stream.tags or []):
                        tag_counts[tag] = tag_counts.get(tag, 0) + 1
                
                # Aggregate languages
                lang_counts: dict[str, int] = {}
                for stream in game_streams:
                    if stream.language:
                        lang_counts[stream.language] = lang_counts.get(stream.language, 0) + 1
                
                # Get top 5 tags sorted by frequency
                top_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:5]
                top_tag_names = [t[0] for t in top_tags]
                
                # Get top 3 languages sorted by frequency
                top_langs = sorted(lang_counts.items(), key=lambda x: x[1], reverse=True)[:3]
                top_lang_codes = [lang[0] for lang in top_langs]
                
                # Calculate average viewers per stream
                avg_viewers = total_viewers // stream_count if stream_count > 0 else 0
                
                games.append(
                    TwitchGameResponse(
                        game_id=game.id,
                        name=game.name,
                        twitch_viewers=total_viewers,
                        twitch_streams=stream_count,
                        youtube_videos=None,
                        youtube_total_views=None,
                        trend=None,
                        box_art_url=game.box_art_url.replace("{width}", "285").replace("{height}", "380"),
                        top_tags=top_tag_names,
                        avg_viewers_per_stream=avg_viewers,
                        top_languages=top_lang_codes,
                    )
                )
            except Exception as game_err:
                # If fetching streams for a game fails, still include it with 0 stats
                logger.warning(f"Failed to fetch streams for game {game.name}: {game_err}")
                games.append(
                    TwitchGameResponse(
                        game_id=game.id,
                        name=game.name,
                        twitch_viewers=0,
                        twitch_streams=0,
                        youtube_videos=None,
                        youtube_total_views=None,
                        trend=None,
                        box_art_url=game.box_art_url.replace("{width}", "285").replace("{height}", "380"),
                        top_tags=[],
                        avg_viewers_per_stream=0,
                        top_languages=[],
                    )
                )
        
        return TwitchGamesResponse(
            games=games,
            fetched_at=datetime.utcnow()
        )
    except Exception as e:
        logger.warning(f"Failed to fetch Twitch top games: {e}")
        return TwitchGamesResponse(
            games=[],
            fetched_at=datetime.utcnow()
        )


@router.get("/twitch/clips", response_model=TwitchClipsResponse)
async def get_twitch_clips(
    game_id: Optional[str] = Query(None, description="Filter by game ID"),
    period: str = Query("day", pattern="^(day|week|month|all)$"),
    limit: int = Query(20, ge=1, le=100),
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
    collector: TwitchCollectorDep = None,
) -> TwitchClipsResponse:
    """
    Get top Twitch clips for a game or overall.
    
    Available to all tiers. Returns viral clips with view counts,
    useful for thumbnail inspiration and trend analysis.
    
    Periods: day, week, month, all
    """
    try:
        # If no game_id, get clips from top games
        if not game_id:
            # Get top game
            top_games = await collector.fetch_top_games(limit=1)
            if top_games:
                game_id = top_games[0].id
            else:
                return TwitchClipsResponse(
                    clips=[],
                    game_id=None,
                    period=period,
                    fetched_at=datetime.utcnow()
                )
        
        raw_clips = await collector.fetch_clips(game_id=game_id, period=period, limit=limit)
        
        clips = [
            TwitchClipResponse(
                id=c.id,
                url=c.url,
                embed_url=c.embed_url,
                broadcaster_id=c.broadcaster_id,
                broadcaster_name=c.broadcaster_name,
                creator_id=c.creator_id,
                creator_name=c.creator_name,
                video_id=c.video_id or None,
                game_id=c.game_id,
                language=c.language,
                title=c.title,
                view_count=c.view_count,
                created_at=c.created_at,
                thumbnail_url=c.thumbnail_url,
                duration=c.duration,
            )
            for c in raw_clips
        ]
        
        return TwitchClipsResponse(
            clips=clips,
            game_id=game_id,
            period=period,
            fetched_at=datetime.utcnow()
        )
    except Exception as e:
        logger.warning(f"Failed to fetch Twitch clips: {e}")
        return TwitchClipsResponse(
            clips=[],
            game_id=game_id,
            period=period,
            fetched_at=datetime.utcnow()
        )


@router.get("/youtube/games/available", response_model=AvailableGamesResponse)
async def get_available_games(
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
) -> AvailableGamesResponse:
    """
    Get list of available games for YouTube filtering.
    
    Returns all supported games with their search terms and display names.
    """
    games = [
        {"id": key, "name": value["display"], "query": value["query"]}
        for key, value in GAME_SEARCH_TERMS.items()
    ]
    return AvailableGamesResponse(games=games)


@router.get("/youtube/games", response_model=YouTubeGameTrendingResponse)
async def get_youtube_game_trending(
    game: Optional[str] = Query(None, description="Game filter (fortnite, warzone, etc.)"),
    sort_by: str = Query("date", pattern="^(views|likes|engagement|date|duration)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    duration_type: str = Query("any", pattern="^(short|medium|long|any)$"),
    is_live: Optional[bool] = Query(None, description="Filter by live status"),
    is_short: Optional[bool] = Query(None, description="Filter by YouTube Shorts"),
    has_captions: Optional[bool] = Query(None, description="Filter by caption availability"),
    min_views: Optional[int] = Query(None, ge=0, description="Minimum view count"),
    max_views: Optional[int] = Query(None, ge=0, description="Maximum view count"),
    min_engagement: Optional[float] = Query(None, ge=0, description="Minimum engagement rate"),
    language: Optional[str] = Query(None, description="Filter by audio language code"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=50, description="Results per page"),
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
) -> YouTubeGameTrendingResponse:
    """
    Get YouTube gaming videos filtered by game with enterprise pagination.
    
    CACHE-ONLY: This endpoint reads from Redis cache populated by the
    youtube_worker. It NEVER hits the YouTube API directly.
    
    Data is refreshed every 6 hours by the background worker.
    
    Supports filtering by:
    - Game (fortnite, warzone, valorant, minecraft, etc.)
    - Duration type (short <1min, medium 1-20min, long >20min)
    - Live status, Shorts, captions
    - View count range, engagement rate
    - Audio language
    
    Supports sorting by:
    - views, likes, engagement, date, duration
    """
    from backend.workers.youtube_worker import get_cached_game_videos
    
    try:
        # Determine game key
        game_key = game if game and game in GAME_SEARCH_TERMS else None
        game_display_name = GAME_SEARCH_TERMS[game]["display"] if game_key else None
        
        # Get cached data
        cached = await get_cached_game_videos(game_key) if game_key else None
        
        if cached:
            logger.info(f"YouTube games cache HIT: {game_key}")
            videos = [YouTubeVideoResponse(**v) for v in cached.get("videos", [])]
        else:
            # No cache or no game specified - return empty
            logger.warning(f"YouTube games cache MISS: {game_key} - worker may not be running")
            videos = []
        
        # Apply filters
        filters_applied = {}
        
        # Duration filter
        if duration_type != "any":
            filters_applied["duration_type"] = duration_type
            if duration_type == "short":
                videos = [v for v in videos if v.duration_seconds and v.duration_seconds < 60]
            elif duration_type == "medium":
                videos = [v for v in videos if v.duration_seconds and 60 <= v.duration_seconds <= 1200]
            elif duration_type == "long":
                videos = [v for v in videos if v.duration_seconds and v.duration_seconds > 1200]
        
        # Live filter
        if is_live is not None:
            filters_applied["is_live"] = is_live
            videos = [v for v in videos if v.is_live == is_live]
        
        # Shorts filter
        if is_short is not None:
            filters_applied["is_short"] = is_short
            videos = [v for v in videos if v.is_short == is_short]
        
        # Captions filter
        if has_captions is not None:
            filters_applied["has_captions"] = has_captions
            videos = [v for v in videos if v.has_captions == has_captions]
        
        # View count range
        if min_views is not None:
            filters_applied["min_views"] = min_views
            videos = [v for v in videos if v.view_count >= min_views]
        if max_views is not None:
            filters_applied["max_views"] = max_views
            videos = [v for v in videos if v.view_count <= max_views]
        
        # Engagement filter
        if min_engagement is not None:
            filters_applied["min_engagement"] = min_engagement
            videos = [v for v in videos if v.engagement_rate and v.engagement_rate >= min_engagement]
        
        # Language filter
        if language:
            filters_applied["language"] = language
            videos = [v for v in videos if v.default_audio_language and v.default_audio_language.lower().startswith(language.lower())]
        
        # Sort videos
        reverse = sort_order == "desc"
        if sort_by == "views":
            videos.sort(key=lambda v: v.view_count, reverse=reverse)
        elif sort_by == "likes":
            videos.sort(key=lambda v: v.like_count, reverse=reverse)
        elif sort_by == "engagement":
            videos.sort(key=lambda v: v.engagement_rate or 0, reverse=reverse)
        elif sort_by == "date":
            videos.sort(key=lambda v: v.published_at or datetime.min, reverse=reverse)
        elif sort_by == "duration":
            videos.sort(key=lambda v: v.duration_seconds or 0, reverse=reverse)
        
        # Calculate pagination
        total = len(videos)
        total_pages = max(1, (total + per_page - 1) // per_page)
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paginated_videos = videos[start_idx:end_idx]
        
        return YouTubeGameTrendingResponse(
            videos=paginated_videos,
            game=game_key,
            game_display_name=game_display_name,
            sort_by=sort_by,
            sort_order=sort_order,
            filters_applied=filters_applied,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
            has_more=page < total_pages,
            fetched_at=datetime.fromisoformat(cached["fetched_at"]) if cached and cached.get("fetched_at") else datetime.utcnow(),
        )
    except Exception as e:
        logger.error(f"Error reading YouTube games cache: {e}")
        return YouTubeGameTrendingResponse(
            videos=[],
            game=game,
            game_display_name=None,
            sort_by=sort_by,
            sort_order=sort_order,
            filters_applied={},
            total=0,
            page=page,
            per_page=per_page,
            total_pages=1,
            has_more=False,
            fetched_at=datetime.utcnow(),
        )


@router.get("/keywords/{category}", response_model=TrendingKeywordsResponse)
async def get_trending_keywords(
    category: str = Path(..., pattern="^(gaming|entertainment|music|education)$"),
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
) -> TrendingKeywordsResponse:
    """
    Get trending keywords for content creation in a category.
    
    CACHE-ONLY: Uses cached trending videos from youtube_worker.
    Never hits YouTube API directly.
    
    Analyzes trending videos to extract:
    - Title keywords (what words appear in successful titles)
    - Tag keywords (what tags are being used)
    - Topic keywords (YouTube's auto-detected topics)
    - Suggested caption keywords and hashtags
    
    Available to all tiers.
    """
    import re
    from collections import Counter
    from backend.workers.youtube_worker import get_cached_trending
    
    try:
        # Get cached trending videos instead of hitting YouTube
        cached = await get_cached_trending(category)
        
        if not cached or not cached.get("videos"):
            logger.warning(f"No cached trending data for keywords: {category}")
            return TrendingKeywordsResponse(
                title_keywords=[],
                tag_keywords=[],
                topic_keywords=[],
                caption_keywords=[],
                hashtags=[],
                category=category,
                generated_at=datetime.utcnow(),
            )
        
        # Convert cached data to video objects for processing
        # (Using dict access directly in the loop below)
        
        # Collect all keywords
        title_words: Counter = Counter()
        tag_words: Counter = Counter()
        topic_words: Counter = Counter()
        
        # Track views per keyword for averaging
        title_views: dict[str, list] = {}
        tag_views: dict[str, list] = {}
        
        # Common stop words to filter out
        stop_words = {
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
            "of", "with", "by", "from", "is", "it", "this", "that", "be", "are",
            "was", "were", "been", "being", "have", "has", "had", "do", "does",
            "did", "will", "would", "could", "should", "may", "might", "must",
            "i", "you", "he", "she", "we", "they", "my", "your", "his", "her",
            "its", "our", "their", "me", "him", "us", "them", "what", "which",
            "who", "whom", "how", "when", "where", "why", "all", "each", "every",
            "both", "few", "more", "most", "other", "some", "such", "no", "not",
            "only", "own", "same", "so", "than", "too", "very", "just", "can",
            "de", "la", "el", "en", "es", "un", "una", "los", "las", "del",
            "vs", "ft", "official", "video", "new", "full", "|", "-", "–", "—",
        }
        
        for video in cached["videos"]:
            views = video.get("view_count", 0)
            
            # Extract title words (2+ chars, alphanumeric)
            title = video.get("title", "")
            title_tokens = re.findall(r'\b[a-zA-Z0-9]{2,}\b', title.lower())
            for word in title_tokens:
                if word not in stop_words and len(word) > 2:
                    title_words[word] += 1
                    if word not in title_views:
                        title_views[word] = []
                    title_views[word].append(views)
            
            # Collect tags
            for tag in video.get("tags", []):
                tag_lower = tag.lower().strip()
                if tag_lower and tag_lower not in stop_words:
                    tag_words[tag_lower] += 1
                    if tag_lower not in tag_views:
                        tag_views[tag_lower] = []
                    tag_views[tag_lower].append(views)
            
            # Collect topic categories
            for topic in video.get("topic_categories", []):
                topic_lower = topic.lower().strip()
                if topic_lower:
                    topic_words[topic_lower] += 1
        
        # Build response
        title_keywords = [
            TrendingKeyword(
                keyword=word,
                count=count,
                avg_views=int(sum(title_views[word]) / len(title_views[word])) if word in title_views else None,
                avg_engagement=None,
                source="title",
            )
            for word, count in title_words.most_common(20)
            if count >= 2  # At least 2 occurrences
        ]
        
        tag_keywords = [
            TrendingKeyword(
                keyword=tag,
                count=count,
                avg_views=int(sum(tag_views[tag]) / len(tag_views[tag])) if tag in tag_views else None,
                avg_engagement=None,
                source="tag",
            )
            for tag, count in tag_words.most_common(20)
            if count >= 2
        ]
        
        topic_keywords = [
            TrendingKeyword(
                keyword=topic,
                count=count,
                avg_views=None,
                avg_engagement=None,
                source="topic",
            )
            for topic, count in topic_words.most_common(10)
        ]
        
        # Generate suggested hashtags from top keywords
        hashtags = []
        for kw in (title_keywords[:5] + tag_keywords[:5]):
            hashtag = "#" + kw.keyword.replace(" ", "").replace("-", "")
            if hashtag not in hashtags:
                hashtags.append(hashtag)
        
        # Add category-specific hashtags
        category_hashtags = {
            "gaming": ["#gaming", "#gamer", "#gameplay", "#twitch", "#streamer"],
            "entertainment": ["#entertainment", "#viral", "#trending", "#fyp", "#foryou"],
            "music": ["#music", "#newmusic", "#song", "#artist", "#musicvideo"],
            "education": ["#education", "#learning", "#tutorial", "#howto", "#tips"],
        }
        for h in category_hashtags.get(category, []):
            if h not in hashtags:
                hashtags.append(h)
        
        return TrendingKeywordsResponse(
            title_keywords=title_keywords,
            tag_keywords=tag_keywords,
            topic_keywords=topic_keywords,
            caption_keywords=[],  # Could be enhanced with AI
            hashtags=hashtags[:15],
            category=category,
            generated_at=datetime.utcnow(),
        )
    except Exception as e:
        logger.warning(f"Failed to generate trending keywords: {e}")
        return TrendingKeywordsResponse(
            title_keywords=[],
            tag_keywords=[],
            topic_keywords=[],
            caption_keywords=[],
            hashtags=[],
            category=category,
            generated_at=datetime.utcnow(),
        )


# ============================================================================
# Pro+ Endpoints (Rate Limited)
# ============================================================================

@router.post("/youtube/search", response_model=YouTubeSearchResponse)
async def search_youtube(
    data: YouTubeSearchRequest,
    current_user: TokenPayload = Depends(get_current_user),
) -> YouTubeSearchResponse:
    """
    Search YouTube for specific niche (rate limited by tier).
    
    Pro: 10 searches/day
    Studio: 50 searches/day
    Unlimited: 100 searches/day
    
    Free tier does not have access to this endpoint.
    """
    tier = _get_tier(current_user)
    limit = SEARCH_LIMITS.get(tier, 0)
    
    if limit == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="YouTube search requires Pro or higher tier"
        )
    
    # TODO: Import and use trend service when implemented
    # service = get_trend_service()
    # search_count = await service.get_user_search_count_today(current_user.sub)
    # 
    # if search_count >= limit:
    #     raise HTTPException(
    #         status_code=status.HTTP_429_TOO_MANY_REQUESTS,
    #         detail=f"Daily search limit reached ({limit} searches/day for {tier} tier)"
    #     )
    # 
    # collector = get_youtube_collector()
    # videos = await collector.search_videos(query=data.query, category=data.category, max_results=data.max_results)
    # 
    # # Record search for rate limiting
    # await service.record_user_search(current_user.sub, data.query, data.category, [v.dict() for v in videos])
    # 
    # return YouTubeSearchResponse(
    #     videos=videos,
    #     query=data.query,
    #     result_count=len(videos),
    #     rate_limit_remaining=limit - search_count - 1
    # )
    
    return YouTubeSearchResponse(
        videos=[],
        query=data.query,
        result_count=0,
        rate_limit_remaining=limit
    )


@router.get("/thumbnail/{video_id}/analysis", response_model=ThumbnailAnalysisResponse)
async def get_thumbnail_analysis(
    video_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> ThumbnailAnalysisResponse:
    """
    Get AI analysis of a specific thumbnail (rate limited by tier).
    
    Free: 3/day
    Pro: 20/day
    Studio: Unlimited (1000/day)
    
    Returns face detection, color analysis, text detection, and
    composition scoring.
    """
    _get_tier(current_user)  # Will be used for rate limiting when service is implemented
    
    # TODO: Import and use trend service when implemented
    # service = get_trend_service()
    # 
    # # Check cache first
    # analysis = await service.get_thumbnail_analysis(video_id)
    # if analysis:
    #     return analysis
    # 
    # # Check rate limit
    # analysis_count = await service.get_user_thumbnail_analysis_count_today(current_user.sub)
    # if analysis_count >= limit:
    #     raise HTTPException(
    #         status_code=status.HTTP_429_TOO_MANY_REQUESTS,
    #         detail=f"Daily thumbnail analysis limit reached ({limit}/day for {tier} tier)"
    #     )
    # 
    # # Trigger analysis
    # analysis = await service.analyze_thumbnail(video_id, current_user.sub)
    # return analysis
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Thumbnail analysis not available"
    )


@router.get("/timing/{category}", response_model=TimingRecommendationResponse)
async def get_timing_recommendation(
    category: str = Path(..., pattern="^(gaming|entertainment|music|education)$"),
    current_user: TokenPayload = Depends(get_current_user),
) -> TimingRecommendationResponse:
    """
    Get optimal posting/streaming times for a category (Pro+ only).
    
    Returns best day and hour to post/stream based on historical
    engagement data for the specified category.
    """
    tier = _get_tier(current_user)
    
    if tier == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Timing insights require Pro or higher tier"
        )
    
    # TODO: Import and use trend service when implemented
    # service = get_trend_service()
    # timing = await service.get_timing_recommendation(category)
    # if not timing:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND,
    #         detail="Timing data not available for this category"
    #     )
    # return timing
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Timing data not available for this category"
    )


@router.get("/history", response_model=TrendHistoryResponse)
async def get_trend_history(
    days: int = Query(7, ge=1, le=30),
    current_user: TokenPayload = Depends(get_current_user),
) -> TrendHistoryResponse:
    """
    Get historical trend data (Pro: 7 days, Studio: 30 days).
    
    Returns YouTube snapshots, Twitch hourly data, and velocity
    alerts for the specified time period.
    """
    tier = _get_tier(current_user)
    max_days = HISTORY_DAYS.get(tier, 0)
    
    if max_days == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Historical data requires Pro or higher tier"
        )
    
    # Clamp days to tier limit
    if days > max_days:
        days = max_days
    
    # TODO: Import and use trend service when implemented
    # service = get_trend_service()
    # history = await service.get_trend_history(days=days)
    # return history
    
    return TrendHistoryResponse(
        days=days,
        youtube_snapshots=[],
        twitch_hourly=[],
        velocity_alerts=[]
    )


# ============================================================================
# Studio-Only Endpoints
# ============================================================================

@router.get("/velocity/alerts", response_model=VelocityAlertsResponse)
async def get_velocity_alerts(
    current_user: TokenPayload = Depends(get_current_user),
) -> VelocityAlertsResponse:
    """
    Get active velocity alerts (Studio tier only).
    
    Returns real-time alerts for games/streamers/videos experiencing
    rapid growth (>50% viewer increase in 1 hour).
    """
    tier = _get_tier(current_user)
    
    if not _check_tier_access(tier, ("studio", "unlimited")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Velocity alerts require Studio tier"
        )
    
    # TODO: Import and use trend service when implemented
    # service = get_trend_service()
    # alerts = await service.get_velocity_alerts(active_only=True)
    # return VelocityAlertsResponse(alerts=alerts, total_active=len(alerts))
    
    return VelocityAlertsResponse(
        alerts=[],
        total_active=0
    )


@router.get("/cross-platform", response_model=CrossPlatformResponse)
async def get_cross_platform_data(
    current_user: TokenPayload = Depends(get_current_user),
) -> CrossPlatformResponse:
    """
    Get cross-platform correlation data (Studio tier only).
    
    Returns unified trending data correlating YouTube and Twitch
    activity for games and creators.
    """
    tier = _get_tier(current_user)
    
    if not _check_tier_access(tier, ("studio", "unlimited")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-platform data requires Studio tier"
        )
    
    # TODO: Import and use trend service when implemented
    # service = get_trend_service()
    # data = await service.get_cross_platform_data()
    # return data
    
    return CrossPlatformResponse(
        hot_games=[],
        rising_creators=[],
        message="Cross-platform correlation coming soon"
    )


# ============================================================================
# Admin/Debug Endpoints
# ============================================================================

@router.get("/youtube/quota-status")
async def get_youtube_quota_status(
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
) -> dict:
    """
    Get current YouTube API quota usage status.
    
    Returns:
    - quota_used_today: Units used today
    - quota_limit: Daily limit (10,000)
    - quota_remaining: Units remaining
    - percentage_used: Percentage of quota used
    
    Available to all users for transparency.
    """
    from backend.workers.youtube_worker import get_quota_status
    
    try:
        return await get_quota_status()
    except Exception as e:
        logger.error(f"Failed to get quota status: {e}")
        return {
            "quota_used_today": 0,
            "quota_limit": 10000,
            "quota_remaining": 10000,
            "percentage_used": 0,
            "error": "Unable to fetch quota status",
        }


@router.post("/youtube/refresh-games")
async def refresh_youtube_games(
    current_user: TokenPayload = Depends(get_current_user),
) -> dict:
    """
    Manually trigger a refresh of game-specific YouTube data.
    
    This will fetch fresh data for all 8 tracked games.
    Quota cost: ~808 units (101 per game).
    
    Requires authentication.
    """
    from backend.workers.youtube_worker import fetch_all_games, get_quota_status
    
    # Check quota first
    quota = await get_quota_status()
    if quota["quota_remaining"] < 1000:
        return {
            "status": "skipped",
            "reason": "Insufficient quota remaining",
            "quota": quota,
        }
    
    try:
        result = await fetch_all_games()
        return result
    except Exception as e:
        logger.error(f"Failed to refresh games: {e}")
        return {
            "status": "error",
            "error": str(e),
        }


@router.post("/youtube/refresh-trending")
async def refresh_youtube_trending(
    current_user: TokenPayload = Depends(get_current_user),
) -> dict:
    """
    Manually trigger a refresh of trending YouTube data.
    
    Quota cost: 4 units (1 per category).
    
    Requires authentication.
    """
    from backend.workers.youtube_worker import fetch_all_trending
    
    try:
        result = await fetch_all_trending()
        return result
    except Exception as e:
        logger.error(f"Failed to refresh trending: {e}")
        return {
            "status": "error",
            "error": str(e),
        }


__all__ = ["router"]
