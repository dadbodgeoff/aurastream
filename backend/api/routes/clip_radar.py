"""
Clip Radar API Routes - Breaking Clips Velocity Tracker

Provides endpoints for accessing viral clip detection data.
Includes live tracking and historical daily recaps.
"""

import logging
from datetime import datetime, date, timedelta
from typing import Optional, List

from fastapi import APIRouter, Query, HTTPException, Path
from pydantic import BaseModel, Field

from backend.services.clip_radar import get_clip_radar_service, TRACKED_CATEGORIES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/clip-radar", tags=["Clip Radar"])


# =============================================================================
# Response Models
# =============================================================================


class ViralClipResponse(BaseModel):
    """A viral clip response."""
    clip_id: str
    title: str
    url: str
    thumbnail_url: str
    broadcaster_name: str
    creator_name: str
    game_id: str
    game_name: str
    language: str
    duration: float
    view_count: int
    velocity: float = Field(description="Views per minute")
    total_gained: int = Field(description="Views gained since first tracked")
    age_minutes: float
    alert_reason: str
    created_at: datetime


class ViralClipsResponse(BaseModel):
    """Response containing viral clips."""
    clips: List[ViralClipResponse]
    total: int
    last_poll: Optional[datetime] = None
    categories_tracked: int


class FreshClipResponse(BaseModel):
    """A fresh clip response."""
    clip_id: str
    title: str
    url: str
    thumbnail_url: str
    broadcaster_name: str
    creator_name: str
    game_id: str
    game_name: str
    language: str
    duration: float
    view_count: int
    velocity: float
    age_minutes: float
    created_at: datetime


class FreshClipsResponse(BaseModel):
    """Response containing fresh clips."""
    clips: List[FreshClipResponse]
    total: int
    max_age_minutes: int


class CategoryStatsResponse(BaseModel):
    """Stats for a category."""
    game_id: str
    game_name: str
    total_clips: int
    total_views: int
    avg_velocity: float
    viral_count: int


class RadarStatusResponse(BaseModel):
    """Clip radar status."""
    is_active: bool
    last_poll: Optional[datetime]
    categories_tracked: int
    category_list: List[dict]


class RadarHealthResponse(BaseModel):
    """Clip radar health status."""
    status: str = Field(description="Health status: healthy, partial, degraded, stale, no_data, error")
    last_poll: Optional[str] = None
    last_poll_age_minutes: Optional[float] = None
    success_rate: Optional[float] = None
    failed_categories: List[str] = []
    recap_healthy: Optional[bool] = None
    total_clips: Optional[int] = None
    total_viral: Optional[int] = None
    error: Optional[str] = None


class CategoryStatsWithErrorResponse(BaseModel):
    """Category stats including error tracking."""
    game_id: str
    game_name: str
    total_clips: int
    total_views: int
    avg_velocity: float
    viral_count: int
    fetch_success: bool = True
    fetch_error: Optional[str] = None


class PollResultResponse(BaseModel):
    """Result of a poll operation with error tracking."""
    success: bool
    message: str
    categories: int
    total_clips: int
    viral_clips: int
    success_rate: float
    failed_categories: List[str] = []
    by_category: List[CategoryStatsWithErrorResponse]


# =============================================================================
# Endpoints
# =============================================================================


@router.get("/viral", response_model=ViralClipsResponse)
async def get_viral_clips(
    limit: int = Query(20, ge=1, le=50, description="Maximum clips to return"),
    game_id: Optional[str] = Query(None, description="Filter by game ID"),
):
    """
    Get currently viral clips sorted by velocity.
    
    Returns clips that are gaining views rapidly (5+ views/minute).
    If no cached data exists, fetches fresh clips from Twitch API.
    """
    service = get_clip_radar_service()
    
    try:
        clips = await service.get_viral_clips(limit=limit, game_id=game_id)
        last_poll = service.get_last_poll_time()
        
        # If no viral clips in cache, try fetching fresh clips directly
        if not clips and not last_poll:
            logger.info("No cached viral clips, fetching fresh data...")
            # Trigger a poll to populate data
            try:
                await service.poll_clips()
                clips = await service.get_viral_clips(limit=limit, game_id=game_id)
                last_poll = service.get_last_poll_time()
            except Exception as poll_err:
                logger.warning(f"Auto-poll failed: {poll_err}")
        
        return ViralClipsResponse(
            clips=[
                ViralClipResponse(
                    clip_id=c.clip_id,
                    title=c.title,
                    url=c.url,
                    thumbnail_url=c.thumbnail_url,
                    broadcaster_name=c.broadcaster_name,
                    creator_name=c.creator_name,
                    game_id=c.game_id,
                    game_name=c.game_name,
                    language=c.language,
                    duration=c.duration,
                    view_count=c.view_count,
                    velocity=round(c.velocity, 2),
                    total_gained=c.total_gained,
                    age_minutes=round(c.age_minutes, 1),
                    alert_reason=c.alert_reason,
                    created_at=c.created_at,
                )
                for c in clips
            ],
            total=len(clips),
            last_poll=last_poll,
            categories_tracked=len(TRACKED_CATEGORIES),
        )
    except Exception as e:
        logger.error(f"Failed to get viral clips: {e}")
        return ViralClipsResponse(
            clips=[],
            total=0,
            last_poll=None,
            categories_tracked=len(TRACKED_CATEGORIES),
        )


@router.get("/fresh", response_model=FreshClipsResponse)
async def get_fresh_clips(
    limit: int = Query(20, ge=1, le=50, description="Maximum clips to return"),
    game_id: Optional[str] = Query(None, description="Filter by game ID"),
    max_age: int = Query(60, ge=5, le=120, description="Maximum clip age in minutes"),
):
    """
    Get fresh clips from the last N minutes, sorted by velocity.
    
    Unlike /viral, this returns ALL fresh clips, not just viral ones.
    Fetches directly from Twitch API - no background worker needed.
    """
    service = get_clip_radar_service()
    
    try:
        logger.info(f"Fetching fresh clips: game_id={game_id}, max_age={max_age}, limit={limit}")
        clips = await service.get_fresh_clips(
            game_id=game_id,
            limit=limit,
            max_age_minutes=max_age,
        )
        logger.info(f"Found {len(clips)} fresh clips")
        
        return FreshClipsResponse(
            clips=[
                FreshClipResponse(
                    clip_id=c.clip_id,
                    title=c.title,
                    url=c.url,
                    thumbnail_url=c.thumbnail_url,
                    broadcaster_name=c.broadcaster_name,
                    creator_name=c.creator_name,
                    game_id=c.game_id,
                    game_name=c.game_name,
                    language=c.language,
                    duration=c.duration,
                    view_count=c.view_count,
                    velocity=round(c.velocity, 2),
                    age_minutes=round(c.age_minutes, 1),
                    created_at=c.created_at,
                )
                for c in clips
            ],
            total=len(clips),
            max_age_minutes=max_age,
        )
    except Exception as e:
        logger.error(f"Failed to get fresh clips: {e}", exc_info=True)
        return FreshClipsResponse(
            clips=[],
            total=0,
            max_age_minutes=max_age,
        )


@router.get("/status", response_model=RadarStatusResponse)
async def get_radar_status():
    """
    Get clip radar status and configuration.
    
    Shows last poll time and tracked categories.
    """
    service = get_clip_radar_service()
    last_poll = service.get_last_poll_time()
    
    return RadarStatusResponse(
        is_active=last_poll is not None,
        last_poll=last_poll,
        categories_tracked=len(TRACKED_CATEGORIES),
        category_list=[
            {"game_id": gid, "game_name": gname}
            for gid, gname in TRACKED_CATEGORIES.items()
        ],
    )


@router.post("/poll", response_model=PollResultResponse)
async def trigger_poll():
    """
    Manually trigger a clip radar poll.
    
    Normally runs automatically every 5 minutes via background worker.
    Use this for testing or to force an immediate update.
    
    Returns detailed results including any failed categories.
    """
    service = get_clip_radar_service()
    
    try:
        results = await service.poll_clips()
        
        # Summarize results with error tracking
        total_clips = sum(r.total_clips for r in results.values())
        total_viral = sum(len(r.viral_clips) for r in results.values())
        failed_categories = [gid for gid, stats in results.items() if not stats.fetch_success]
        success_count = len(results) - len(failed_categories)
        success_rate = success_count / len(results) * 100 if results else 0
        
        return PollResultResponse(
            success=len(failed_categories) == 0,
            message=f"Poll complete. {total_clips} clips scanned, {total_viral} viral detected. "
                    f"Success rate: {success_rate:.1f}%",
            categories=len(results),
            total_clips=total_clips,
            viral_clips=total_viral,
            success_rate=success_rate,
            failed_categories=failed_categories,
            by_category=[
                CategoryStatsWithErrorResponse(
                    game_id=gid,
                    game_name=stats.game_name,
                    total_clips=stats.total_clips,
                    total_views=stats.total_views,
                    avg_velocity=round(stats.avg_velocity, 2),
                    viral_count=len(stats.viral_clips),
                    fetch_success=stats.fetch_success,
                    fetch_error=stats.fetch_error,
                )
                for gid, stats in results.items()
            ],
        )
    except Exception as e:
        logger.error(f"Poll failed: {e}")
        raise HTTPException(status_code=500, detail=f"Poll failed: {str(e)}")


@router.get("/health", response_model=RadarHealthResponse)
async def get_radar_health():
    """
    Get clip radar health status.
    
    Returns detailed health metrics including:
    - Last poll time and age
    - Success rate of last poll
    - Failed categories
    - Recap tracking status
    
    Status values:
    - healthy: All systems operational
    - partial: Some categories failed but majority succeeded
    - degraded: Less than 50% success rate
    - stale: Last poll was more than 15 minutes ago
    - no_data: No poll data available
    - error: Error retrieving health status
    """
    service = get_clip_radar_service()
    health = service.get_poll_health()
    return RadarHealthResponse(**health)


@router.get("/categories")
async def get_tracked_categories():
    """
    Get list of categories being tracked for viral clips.
    """
    return {
        "categories": [
            {"game_id": gid, "game_name": gname}
            for gid, gname in TRACKED_CATEGORIES.items()
        ],
        "total": len(TRACKED_CATEGORIES),
    }


@router.post("/cleanup")
async def trigger_cleanup(
    max_age_hours: int = Query(24, ge=1, le=168, description="Maximum age in hours for data to keep"),
):
    """
    Manually trigger cleanup of old clip data from Redis.
    
    Removes clip tracking data older than the specified age.
    This helps prevent Redis memory from growing unbounded.
    """
    service = get_clip_radar_service()
    
    try:
        await service.cleanup_old_data(max_age_hours=max_age_hours)
        return {
            "success": True,
            "message": f"Cleanup complete. Removed data older than {max_age_hours} hours.",
        }
    except Exception as e:
        logger.error(f"Cleanup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")


# =============================================================================
# Daily Recap Models
# =============================================================================


class RecapClipResponse(BaseModel):
    """A clip in a daily recap."""
    clip_id: str
    title: str
    url: str
    thumbnail_url: str
    broadcaster_name: str
    game_id: Optional[str] = None
    game_name: Optional[str] = None
    view_count: int
    velocity: float
    alert_reason: Optional[str] = None


class CategoryRecapResponse(BaseModel):
    """Category stats in a daily recap."""
    game_id: str
    game_name: str
    total_clips: int
    total_views: int
    viral_clips_count: int
    avg_velocity: float
    peak_velocity: float
    top_clips: List[RecapClipResponse]
    hourly_activity: List[dict]


class DailyRecapResponse(BaseModel):
    """A daily recap response."""
    recap_date: str
    total_clips_tracked: int
    total_viral_clips: int
    total_views_tracked: int
    peak_velocity: float
    top_clips: List[RecapClipResponse]
    category_stats: dict
    polls_count: int
    first_poll_at: Optional[datetime] = None
    last_poll_at: Optional[datetime] = None


class RecapListResponse(BaseModel):
    """List of recent recaps."""
    recaps: List[DailyRecapResponse]
    total: int


# =============================================================================
# Recap Endpoints
# =============================================================================


@router.get("/recaps", response_model=RecapListResponse)
async def get_recent_recaps(
    days: int = Query(7, ge=1, le=30, description="Number of days to fetch"),
):
    """
    Get recent daily recaps.
    
    Returns compressed summaries of clip radar data for previous days.
    Each recap includes top clips and category breakdowns.
    """
    from backend.services.clip_radar.recap_service import get_recap_service
    
    try:
        service = get_recap_service()
        recaps = await service.get_recent_recaps(days=days)
        
        return RecapListResponse(
            recaps=[
                DailyRecapResponse(
                    recap_date=r["recap_date"],
                    total_clips_tracked=r.get("total_clips_tracked", 0),
                    total_viral_clips=r.get("total_viral_clips", 0),
                    total_views_tracked=r.get("total_views_tracked", 0),
                    peak_velocity=r.get("peak_velocity", 0),
                    top_clips=[
                        RecapClipResponse(**c) for c in r.get("top_clips", [])
                    ],
                    category_stats=r.get("category_stats", {}),
                    polls_count=r.get("polls_count", 0),
                    first_poll_at=r.get("first_poll_at"),
                    last_poll_at=r.get("last_poll_at"),
                )
                for r in recaps
            ],
            total=len(recaps),
        )
    except Exception as e:
        logger.error(f"Failed to get recaps: {e}")
        return RecapListResponse(recaps=[], total=0)


@router.get("/recaps/{recap_date}", response_model=DailyRecapResponse)
async def get_recap_by_date(
    recap_date: str = Path(..., description="Date in YYYY-MM-DD format"),
):
    """
    Get a specific daily recap by date.
    
    Returns the compressed summary for a specific day.
    """
    from backend.services.clip_radar.recap_service import get_recap_service
    
    try:
        parsed_date = date.fromisoformat(recap_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    service = get_recap_service()
    recap = await service.get_recap(parsed_date)
    
    if not recap:
        raise HTTPException(status_code=404, detail=f"No recap found for {recap_date}")
    
    return DailyRecapResponse(
        recap_date=recap["recap_date"],
        total_clips_tracked=recap.get("total_clips_tracked", 0),
        total_viral_clips=recap.get("total_viral_clips", 0),
        total_views_tracked=recap.get("total_views_tracked", 0),
        peak_velocity=recap.get("peak_velocity", 0),
        top_clips=[
            RecapClipResponse(**c) for c in recap.get("top_clips", [])
        ],
        category_stats=recap.get("category_stats", {}),
        polls_count=recap.get("polls_count", 0),
        first_poll_at=recap.get("first_poll_at"),
        last_poll_at=recap.get("last_poll_at"),
    )


@router.get("/recaps/{recap_date}/category/{game_id}", response_model=CategoryRecapResponse)
async def get_category_recap(
    recap_date: str = Path(..., description="Date in YYYY-MM-DD format"),
    game_id: str = Path(..., description="Twitch game ID"),
):
    """
    Get category-specific recap for a date.
    
    Returns detailed stats for a specific game/category including
    hourly activity breakdown and top clips.
    """
    from backend.services.clip_radar.recap_service import get_recap_service
    
    try:
        parsed_date = date.fromisoformat(recap_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    service = get_recap_service()
    recap = await service.get_category_recap(parsed_date, game_id)
    
    if not recap:
        raise HTTPException(
            status_code=404, 
            detail=f"No recap found for {recap_date} / game {game_id}"
        )
    
    return CategoryRecapResponse(
        game_id=recap["game_id"],
        game_name=recap["game_name"],
        total_clips=recap.get("total_clips", 0),
        total_views=recap.get("total_views", 0),
        viral_clips_count=recap.get("viral_clips_count", 0),
        avg_velocity=recap.get("avg_velocity", 0),
        peak_velocity=recap.get("peak_velocity", 0),
        top_clips=[
            RecapClipResponse(**c) for c in recap.get("top_clips", [])
        ],
        hourly_activity=recap.get("hourly_activity", []),
    )


@router.post("/recaps/create")
async def trigger_recap_creation(
    recap_date: Optional[str] = Query(None, description="Date to create recap for (YYYY-MM-DD)"),
):
    """
    Manually trigger recap creation.
    
    Normally runs automatically at 6am UTC daily.
    Use this for testing or to force creation of a specific date's recap.
    """
    from backend.services.clip_radar.recap_service import get_recap_service
    
    service = get_recap_service()
    
    if recap_date:
        try:
            parsed_date = date.fromisoformat(recap_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        # Default to yesterday
        parsed_date = (datetime.utcnow() - timedelta(days=1)).date()
    
    try:
        recap = await service.create_daily_recap(parsed_date)
        
        if "error" in recap:
            raise HTTPException(status_code=404, detail=recap["error"])
        
        return {
            "success": True,
            "message": f"Recap created for {parsed_date}",
            "recap_date": str(parsed_date),
            "total_clips": recap.get("total_clips_tracked", 0),
            "viral_clips": recap.get("total_viral_clips", 0),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Recap creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Recap creation failed: {str(e)}")
