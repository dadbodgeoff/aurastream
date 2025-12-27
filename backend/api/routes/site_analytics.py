"""
Site Analytics API Routes

Production-ready analytics endpoints for:
- Visitor tracking (persistent)
- Session tracking (per visit)
- Page views with scroll depth
- Funnel conversion events
- Session end via sendBeacon
- Admin dashboard (dadbodgeoff@gmail.com only)
"""

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from backend.api.middleware.auth import get_current_user
from backend.services.jwt_service import TokenPayload
from backend.services.site_analytics_service import (
    get_site_analytics_service,
    SiteAnalyticsService,
    ANALYTICS_ADMIN_EMAIL,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# Schemas
# =============================================================================

class VisitorTrackRequest(BaseModel):
    """Track a visitor."""
    visitor_id: str = Field(..., min_length=1, max_length=64)
    referrer_source: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    country: Optional[str] = None


class SessionStartRequest(BaseModel):
    """Start a session."""
    session_id: str = Field(..., min_length=1, max_length=64)
    visitor_id: str = Field(..., min_length=1, max_length=64)
    entry_page: str = Field(..., min_length=1)
    referrer: Optional[str] = None
    device_type: Optional[str] = None
    user_agent: Optional[str] = None


class SessionEndRequest(BaseModel):
    """End a session (via sendBeacon)."""
    session_id: str = Field(..., min_length=1, max_length=64)
    visitor_id: str = Field(..., min_length=1, max_length=64)
    duration_ms: int = Field(..., ge=0)
    pages_viewed: int = Field(..., ge=0)
    exit_page: Optional[str] = None
    converted: bool = False
    conversion_event: Optional[str] = None


class PageViewRequest(BaseModel):
    """Track a page view."""
    session_id: str = Field(..., min_length=1, max_length=64)
    visitor_id: str = Field(..., min_length=1, max_length=64)
    page_path: str = Field(..., min_length=1)
    page_title: Optional[str] = None
    referrer_page: Optional[str] = None
    scroll_depth: Optional[int] = Field(None, ge=0, le=100)
    time_on_page_ms: Optional[int] = Field(None, ge=0)


class FunnelEventRequest(BaseModel):
    """Track a funnel event."""
    visitor_id: str = Field(..., min_length=1, max_length=64)
    session_id: str = Field(..., min_length=1, max_length=64)
    step: str = Field(..., min_length=1, max_length=50)
    metadata: Optional[dict[str, Any]] = None


# =============================================================================
# Dependencies
# =============================================================================

def get_service() -> SiteAnalyticsService:
    """Get analytics service."""
    return get_site_analytics_service()


async def require_analytics_admin(
    current_user: TokenPayload = Depends(get_current_user),
) -> TokenPayload:
    """Require analytics admin access."""
    if current_user.email != ANALYTICS_ADMIN_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Analytics dashboard access denied",
        )
    return current_user


# =============================================================================
# Public Tracking Endpoints (No Auth Required)
# =============================================================================

@router.post("/visitor", status_code=status.HTTP_202_ACCEPTED)
async def track_visitor(
    data: VisitorTrackRequest,
    service: SiteAnalyticsService = Depends(get_service),
) -> dict:
    """Track a visitor (creates or updates)."""
    result = service.track_visitor(
        visitor_id=data.visitor_id,
        referrer_source=data.referrer_source,
        utm_source=data.utm_source,
        utm_medium=data.utm_medium,
        utm_campaign=data.utm_campaign,
        device_type=data.device_type,
        browser=data.browser,
        os=data.os,
        country=data.country,
    )
    return result


@router.post("/session/start", status_code=status.HTTP_202_ACCEPTED)
async def start_session(
    data: SessionStartRequest,
    service: SiteAnalyticsService = Depends(get_service),
) -> dict:
    """Start a new session."""
    result = service.start_session(
        session_id=data.session_id,
        visitor_id=data.visitor_id,
        entry_page=data.entry_page,
        referrer=data.referrer,
        device_type=data.device_type,
        user_agent=data.user_agent,
    )
    return result


@router.post("/session/end", status_code=status.HTTP_202_ACCEPTED)
async def end_session(
    request: Request,
    service: SiteAnalyticsService = Depends(get_service),
) -> dict:
    """
    End a session. Supports sendBeacon (text/plain content type).
    """
    # Handle sendBeacon which sends as text/plain
    content_type = request.headers.get('content-type', '')
    
    if 'text/plain' in content_type:
        import json
        body = await request.body()
        data = json.loads(body.decode())
    else:
        data = await request.json()
    
    result = service.end_session(
        session_id=data['session_id'],
        visitor_id=data['visitor_id'],
        duration_ms=data['duration_ms'],
        pages_viewed=data['pages_viewed'],
        exit_page=data.get('exit_page'),
        converted=data.get('converted', False),
        conversion_event=data.get('conversion_event'),
    )
    return result


@router.post("/pageview", status_code=status.HTTP_202_ACCEPTED)
async def track_page_view(
    data: PageViewRequest,
    service: SiteAnalyticsService = Depends(get_service),
) -> dict:
    """Track a page view."""
    result = service.track_page_view(
        session_id=data.session_id,
        visitor_id=data.visitor_id,
        page_path=data.page_path,
        page_title=data.page_title,
        referrer_page=data.referrer_page,
        scroll_depth=data.scroll_depth,
        time_on_page_ms=data.time_on_page_ms,
    )
    return result


@router.post("/funnel", status_code=status.HTTP_202_ACCEPTED)
async def track_funnel_event(
    data: FunnelEventRequest,
    service: SiteAnalyticsService = Depends(get_service),
) -> dict:
    """Track a funnel conversion event."""
    result = service.track_funnel_event(
        visitor_id=data.visitor_id,
        session_id=data.session_id,
        step=data.step,
        metadata=data.metadata,
    )
    return result


# =============================================================================
# Admin Dashboard Endpoints (dadbodgeoff@gmail.com only)
# =============================================================================

@router.get("/dashboard/summary")
async def get_dashboard_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: TokenPayload = Depends(require_analytics_admin),
    service: SiteAnalyticsService = Depends(get_service),
) -> dict:
    """Get dashboard summary. Admin only."""
    return service.get_dashboard_summary(start_date, end_date)


@router.get("/dashboard/funnel")
async def get_funnel_data(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: TokenPayload = Depends(require_analytics_admin),
    service: SiteAnalyticsService = Depends(get_service),
) -> dict:
    """Get funnel conversion data. Admin only."""
    return service.get_funnel_data(start_date, end_date)


@router.get("/dashboard/flow")
async def get_page_flow(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 20,
    current_user: TokenPayload = Depends(require_analytics_admin),
    service: SiteAnalyticsService = Depends(get_service),
) -> dict:
    """Get page flow data for flow charts. Admin only."""
    return service.get_page_flow(start_date, end_date, limit)


@router.get("/dashboard/sessions")
async def get_recent_sessions(
    limit: int = 50,
    current_user: TokenPayload = Depends(require_analytics_admin),
    service: SiteAnalyticsService = Depends(get_service),
) -> dict:
    """Get recent sessions. Admin only."""
    sessions = service.get_recent_sessions(limit)
    return {'sessions': sessions}


@router.get("/dashboard/pages")
async def get_top_pages(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 20,
    current_user: TokenPayload = Depends(require_analytics_admin),
    service: SiteAnalyticsService = Depends(get_service),
) -> dict:
    """Get top pages by views. Admin only."""
    pages = service.get_top_pages(start_date, end_date, limit)
    return {'pages': pages}


@router.post("/aggregate")
async def trigger_aggregation(
    date: Optional[str] = None,
    current_user: TokenPayload = Depends(require_analytics_admin),
    service: SiteAnalyticsService = Depends(get_service),
) -> dict:
    """Manually trigger daily aggregation. Admin only."""
    return service.aggregate_daily(date)
