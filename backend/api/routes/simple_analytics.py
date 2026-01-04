"""
Simple Analytics API Routes

Clean, focused analytics endpoints. No Redis queues, no batching complexity.
"""

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from backend.api.middleware.auth import get_current_user, get_current_user_optional
from backend.services.jwt_service import TokenPayload
from backend.services.simple_analytics_service import get_simple_analytics_service, SimpleAnalyticsService

router = APIRouter()


# =============================================================================
# Schemas
# =============================================================================

class TrackVisitRequest(BaseModel):
    """Track a page visit."""
    visitorId: str = Field(..., min_length=1, max_length=64)
    pagePath: str = Field(..., min_length=1, max_length=500)
    sessionId: Optional[str] = Field(None, max_length=64)
    referrer: Optional[str] = Field(None, max_length=500)
    utmSource: Optional[str] = Field(None, max_length=100)
    utmMedium: Optional[str] = Field(None, max_length=100)
    utmCampaign: Optional[str] = Field(None, max_length=100)
    deviceType: Optional[str] = Field(None, max_length=20)
    browser: Optional[str] = Field(None, max_length=50)


class TrackEventRequest(BaseModel):
    """Track a user event."""
    eventType: str = Field(..., min_length=1, max_length=50)
    metadata: Optional[dict[str, Any]] = None


class DashboardSummaryResponse(BaseModel):
    """Dashboard summary stats."""
    totalVisitors: int
    totalPageViews: int
    totalSignups: int
    totalLogins: int
    totalGenerations: int
    successRate: float
    avgSessionMinutes: float
    conversionRate: float
    period: str


class TrendDataPoint(BaseModel):
    """Single data point in trend."""
    date: str
    visitors: int
    signups: int
    generations: int


class GenerationStatsResponse(BaseModel):
    """Generation statistics."""
    byAssetType: list[dict[str, Any]]
    totalCompleted: int
    totalFailed: int


# =============================================================================
# Public Tracking Endpoints (no auth required)
# =============================================================================

@router.post("/visit", status_code=202)
async def track_visit(
    request: Request,
    data: TrackVisitRequest,
    service: SimpleAnalyticsService = Depends(get_simple_analytics_service),
):
    """
    Track a page visit. Fire and forget - always returns success.
    
    This endpoint is designed to be called on every page load.
    It's lightweight and won't block the user experience.
    """
    # Try to get user from auth header if present
    user_id = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            from backend.services.jwt_service import decode_access_token
            token = auth_header.split(" ")[1]
            payload = decode_access_token(token)
            user_id = payload.get("sub")
        except Exception:
            pass
    
    service.track_visit(
        visitor_id=data.visitorId,
        page_path=data.pagePath,
        session_id=data.sessionId,
        user_id=user_id,
        referrer=data.referrer,
        utm_source=data.utmSource,
        utm_medium=data.utmMedium,
        utm_campaign=data.utmCampaign,
        device_type=data.deviceType,
        browser=data.browser,
    )
    
    return {"success": True}


@router.post("/event", status_code=202)
async def track_event(
    data: TrackEventRequest,
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
    service: SimpleAnalyticsService = Depends(get_simple_analytics_service),
):
    """
    Track a user event. Requires authentication for user-specific events.
    """
    user_id = current_user.sub if current_user else None
    
    service.track_event(
        event_type=data.eventType,
        user_id=user_id,
        metadata=data.metadata,
    )
    
    return {"success": True}


@router.post("/session/start", status_code=202)
async def start_session(
    visitorId: str,
    sessionId: str,
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
    service: SimpleAnalyticsService = Depends(get_simple_analytics_service),
):
    """Start or update a session."""
    user_id = current_user.sub if current_user else None
    service.start_session(sessionId, visitorId, user_id)
    return {"success": True}


# =============================================================================
# Dashboard Endpoints (admin only in production)
# =============================================================================

@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    days: int = 30,
    service: SimpleAnalyticsService = Depends(get_simple_analytics_service),
):
    """
    Get dashboard summary statistics.
    
    Returns key metrics for the specified time period.
    """
    days = max(1, min(365, days))
    return service.get_dashboard_summary(days)


@router.get("/dashboard/real-users")
async def get_real_users_stats(
    service: SimpleAnalyticsService = Depends(get_simple_analytics_service),
):
    """
    Get real user statistics (excluding @aurastream.shop test emails).
    """
    return service.get_real_users_stats()


@router.get("/dashboard/debug")
async def get_debug_stats(
    service: SimpleAnalyticsService = Depends(get_simple_analytics_service),
):
    """
    Debug endpoint to check raw table counts.
    """
    return service.get_debug_stats()


@router.post("/cleanup-test-data")
async def cleanup_test_data(
    service: SimpleAnalyticsService = Depends(get_simple_analytics_service),
):
    """
    Remove test data from analytics tables.
    Removes localhost visits and events from test emails.
    """
    return service.cleanup_test_data()


@router.get("/dashboard/trend", response_model=list[TrendDataPoint])
async def get_dashboard_trend(
    days: int = 30,
    service: SimpleAnalyticsService = Depends(get_simple_analytics_service),
):
    """
    Get daily trend data for charts.
    """
    days = max(1, min(365, days))
    return service.get_trend_data(days)


@router.get("/dashboard/top-pages")
async def get_top_pages(
    days: int = 30,
    limit: int = 10,
    service: SimpleAnalyticsService = Depends(get_simple_analytics_service),
):
    """Get most visited pages."""
    days = max(1, min(365, days))
    limit = max(1, min(50, limit))
    return {"pages": service.get_top_pages(days, limit)}


@router.get("/dashboard/recent-signups")
async def get_recent_signups(
    limit: int = 10,
    service: SimpleAnalyticsService = Depends(get_simple_analytics_service),
):
    """Get recent signups."""
    limit = max(1, min(50, limit))
    return {"signups": service.get_recent_signups(limit)}


@router.get("/dashboard/generations", response_model=GenerationStatsResponse)
async def get_generation_stats(
    days: int = 30,
    service: SimpleAnalyticsService = Depends(get_simple_analytics_service),
):
    """Get generation statistics by asset type."""
    days = max(1, min(365, days))
    return service.get_generation_stats(days)


# =============================================================================
# Paginated Table Endpoints (for detailed data exploration)
# =============================================================================

@router.get("/visits")
async def get_visits_paginated(
    page: int = 1,
    page_size: int = 25,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    days: int = 30,
    search: Optional[str] = None,
    filter_device_type: Optional[str] = None,
    filter_browser: Optional[str] = None,
    service: SimpleAnalyticsService = Depends(get_simple_analytics_service),
):
    """Get paginated visits with filtering and sorting."""
    page = max(1, page)
    page_size = max(1, min(100, page_size))
    days = max(1, min(365, days))
    
    return service.get_visits_paginated(
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_dir=sort_dir,
        days=days,
        search=search,
        device_type=filter_device_type,
        browser=filter_browser,
    )


@router.get("/events")
async def get_events_paginated(
    page: int = 1,
    page_size: int = 25,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    days: int = 30,
    event_type: Optional[str] = None,
    service: SimpleAnalyticsService = Depends(get_simple_analytics_service),
):
    """Get paginated user events with filtering and sorting."""
    page = max(1, page)
    page_size = max(1, min(100, page_size))
    days = max(1, min(365, days))
    
    return service.get_events_paginated(
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_dir=sort_dir,
        days=days,
        event_type=event_type,
    )


@router.get("/sessions")
async def get_sessions_paginated(
    page: int = 1,
    page_size: int = 25,
    sort_by: str = "started_at",
    sort_dir: str = "desc",
    days: int = 30,
    converted: Optional[str] = None,
    service: SimpleAnalyticsService = Depends(get_simple_analytics_service),
):
    """Get paginated sessions with filtering and sorting."""
    page = max(1, page)
    page_size = max(1, min(100, page_size))
    days = max(1, min(365, days))
    
    # Convert string to bool if provided
    converted_bool = None
    if converted == "true":
        converted_bool = True
    elif converted == "false":
        converted_bool = False
    
    return service.get_sessions_paginated(
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_dir=sort_dir,
        days=days,
        converted=converted_bool,
    )


# =============================================================================
# Maintenance Endpoints
# =============================================================================

@router.post("/refresh-stats")
async def refresh_daily_stats(
    date: Optional[str] = None,
    service: SimpleAnalyticsService = Depends(get_simple_analytics_service),
):
    """Refresh daily stats aggregation."""
    success = service.refresh_daily_stats(date)
    return {"success": success}


@router.post("/cleanup")
async def cleanup_old_data(
    days_to_keep: int = 90,
    service: SimpleAnalyticsService = Depends(get_simple_analytics_service),
):
    """Clean up old raw analytics data."""
    days_to_keep = max(30, min(365, days_to_keep))
    result = service.cleanup_old_data(days_to_keep)
    return {"success": True, "daysKept": result}
