"""
Enterprise Analytics API Routes

Comprehensive analytics endpoints for:
- Visitor/session/page tracking
- Heatmap click tracking
- User journey analysis
- Abandonment tracking
- Real-time presence
- Admin dashboard with geo, device, funnel data

Admin access: dadbodgeoff@gmail.com only
"""

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from backend.api.middleware.auth import get_current_user, get_current_user_optional
from backend.services.jwt_service import TokenPayload
from backend.services.enterprise_analytics_service import (
    get_enterprise_analytics_service,
    EnterpriseAnalyticsService,
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
    city: Optional[str] = None
    region: Optional[str] = None
    screen_resolution: Optional[str] = None
    language: Optional[str] = None


class SessionStartRequest(BaseModel):
    """Start a session."""
    session_id: str = Field(..., min_length=1, max_length=64)
    visitor_id: str = Field(..., min_length=1, max_length=64)
    entry_page: str = Field(..., min_length=1)
    referrer: Optional[str] = None
    device_type: Optional[str] = None
    user_agent: Optional[str] = None
    screen_resolution: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None


class SessionEndRequest(BaseModel):
    """End a session."""
    session_id: str = Field(..., min_length=1, max_length=64)
    visitor_id: str = Field(..., min_length=1, max_length=64)
    duration_ms: int = Field(..., ge=0)
    pages_viewed: int = Field(..., ge=0)
    exit_page: Optional[str] = None
    converted: bool = False
    conversion_event: Optional[str] = None
    page_sequence: Optional[list[str]] = None


class PageViewRequest(BaseModel):
    """Track a page view."""
    session_id: str = Field(..., min_length=1, max_length=64)
    visitor_id: str = Field(..., min_length=1, max_length=64)
    page_path: str = Field(..., min_length=1)
    page_title: Optional[str] = None
    referrer_page: Optional[str] = None
    scroll_depth: Optional[int] = Field(None, ge=0, le=100)
    time_on_page_ms: Optional[int] = Field(None, ge=0)


class ClickTrackRequest(BaseModel):
    """Track a click for heatmap."""
    session_id: str = Field(..., min_length=1, max_length=64)
    visitor_id: str = Field(..., min_length=1, max_length=64)
    page_path: str = Field(..., min_length=1)
    click_x: int = Field(..., ge=0)
    click_y: int = Field(..., ge=0)
    viewport_width: int = Field(..., ge=1)
    viewport_height: int = Field(..., ge=1)
    element_tag: Optional[str] = None
    element_id: Optional[str] = None
    element_class: Optional[str] = None
    element_text: Optional[str] = None


class FunnelEventRequest(BaseModel):
    """Track a funnel event."""
    visitor_id: str = Field(..., min_length=1, max_length=64)
    session_id: str = Field(..., min_length=1, max_length=64)
    step: str = Field(..., min_length=1, max_length=50)
    metadata: Optional[dict[str, Any]] = None


class AbandonmentRequest(BaseModel):
    """Track abandonment."""
    visitor_id: str = Field(..., min_length=1, max_length=64)
    session_id: str = Field(..., min_length=1, max_length=64)
    abandonment_type: str = Field(..., min_length=1, max_length=50)
    page_path: str = Field(..., min_length=1)
    form_id: Optional[str] = None
    step_reached: Optional[int] = None
    total_steps: Optional[int] = None
    fields_filled: Optional[list[str]] = None
    time_spent_ms: Optional[int] = None
    last_interaction: Optional[str] = None


class HeartbeatRequest(BaseModel):
    """Heartbeat for presence."""
    visitor_id: str = Field(..., min_length=1, max_length=64)
    session_id: str = Field(..., min_length=1, max_length=64)
    current_page: str = Field(..., min_length=1)


class BatchEventsRequest(BaseModel):
    """Batch multiple events."""
    events: list[dict[str, Any]] = Field(..., max_length=100)


# =============================================================================
# Dependencies
# =============================================================================

def get_service() -> EnterpriseAnalyticsService:
    """Get analytics service."""
    return get_enterprise_analytics_service()


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
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Track a visitor."""
    return service.track_visitor(
        visitor_id=data.visitor_id,
        referrer_source=data.referrer_source,
        utm_source=data.utm_source,
        utm_medium=data.utm_medium,
        utm_campaign=data.utm_campaign,
        device_type=data.device_type,
        browser=data.browser,
        os=data.os,
        country=data.country,
        city=data.city,
        region=data.region,
        screen_resolution=data.screen_resolution,
        language=data.language,
    )


@router.post("/session/start", status_code=status.HTTP_202_ACCEPTED)
async def start_session(
    data: SessionStartRequest,
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Start a new session."""
    return service.start_session(
        session_id=data.session_id,
        visitor_id=data.visitor_id,
        entry_page=data.entry_page,
        referrer=data.referrer,
        device_type=data.device_type,
        user_agent=data.user_agent,
        screen_resolution=data.screen_resolution,
        language=data.language,
        timezone_str=data.timezone,
    )


@router.post("/session/end", status_code=status.HTTP_202_ACCEPTED)
async def end_session(
    request: Request,
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """End a session. Supports sendBeacon (text/plain)."""
    content_type = request.headers.get('content-type', '')
    
    if 'text/plain' in content_type:
        import json
        body = await request.body()
        data = json.loads(body.decode())
    else:
        data = await request.json()
    
    return service.end_session(
        session_id=data['session_id'],
        visitor_id=data['visitor_id'],
        duration_ms=data['duration_ms'],
        pages_viewed=data['pages_viewed'],
        exit_page=data.get('exit_page'),
        converted=data.get('converted', False),
        conversion_event=data.get('conversion_event'),
        page_sequence=data.get('page_sequence'),
    )


@router.post("/pageview", status_code=status.HTTP_202_ACCEPTED)
async def track_page_view(
    data: PageViewRequest,
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Track a page view."""
    return service.track_page_view(
        session_id=data.session_id,
        visitor_id=data.visitor_id,
        page_path=data.page_path,
        page_title=data.page_title,
        referrer_page=data.referrer_page,
        scroll_depth=data.scroll_depth,
        time_on_page_ms=data.time_on_page_ms,
    )


@router.post("/click", status_code=status.HTTP_202_ACCEPTED)
async def track_click(
    data: ClickTrackRequest,
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Track a click for heatmap."""
    return service.track_click(
        session_id=data.session_id,
        visitor_id=data.visitor_id,
        page_path=data.page_path,
        click_x=data.click_x,
        click_y=data.click_y,
        viewport_width=data.viewport_width,
        viewport_height=data.viewport_height,
        element_tag=data.element_tag,
        element_id=data.element_id,
        element_class=data.element_class,
        element_text=data.element_text,
    )


@router.post("/funnel", status_code=status.HTTP_202_ACCEPTED)
async def track_funnel_event(
    data: FunnelEventRequest,
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Track a funnel event."""
    return service.track_funnel_event(
        visitor_id=data.visitor_id,
        session_id=data.session_id,
        step=data.step,
        metadata=data.metadata,
    )


@router.post("/abandonment", status_code=status.HTTP_202_ACCEPTED)
async def track_abandonment(
    data: AbandonmentRequest,
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Track form/flow abandonment."""
    return service.track_abandonment(
        visitor_id=data.visitor_id,
        session_id=data.session_id,
        abandonment_type=data.abandonment_type,
        page_path=data.page_path,
        form_id=data.form_id,
        step_reached=data.step_reached,
        total_steps=data.total_steps,
        fields_filled=data.fields_filled,
        time_spent_ms=data.time_spent_ms,
        last_interaction=data.last_interaction,
    )


@router.post("/heartbeat", status_code=status.HTTP_202_ACCEPTED)
async def heartbeat(
    data: HeartbeatRequest,
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Heartbeat to keep presence alive."""
    return service.heartbeat(
        visitor_id=data.visitor_id,
        session_id=data.session_id,
        current_page=data.current_page,
        is_authenticated=current_user is not None,
        user_id=current_user.sub if current_user else None,
    )


@router.post("/batch", status_code=status.HTTP_202_ACCEPTED)
async def batch_events(
    data: BatchEventsRequest,
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Process batch of events."""
    results = []
    for event in data.events:
        event_type = event.get('type')
        try:
            if event_type == 'pageview':
                results.append(service.track_page_view(**event.get('data', {})))
            elif event_type == 'click':
                results.append(service.track_click(**event.get('data', {})))
            elif event_type == 'funnel':
                results.append(service.track_funnel_event(**event.get('data', {})))
            elif event_type == 'abandonment':
                results.append(service.track_abandonment(**event.get('data', {})))
            else:
                results.append({'error': f'unknown_event_type: {event_type}'})
        except Exception as e:
            results.append({'error': str(e)})
    
    return {'processed': len(results), 'results': results}


# =============================================================================
# Admin Dashboard Endpoints
# =============================================================================

@router.get("/dashboard/summary")
async def get_dashboard_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: TokenPayload = Depends(require_analytics_admin),
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Get dashboard summary."""
    return service.get_dashboard_summary(start_date, end_date)


@router.get("/dashboard/realtime")
async def get_realtime_active(
    current_user: TokenPayload = Depends(require_analytics_admin),
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Get real-time active users."""
    return service.get_realtime_active()


@router.get("/dashboard/daily-visitors")
async def get_daily_visitors(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: TokenPayload = Depends(require_analytics_admin),
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Get daily visitor chart data."""
    data = service.get_daily_visitors(start_date, end_date)
    return {'daily': data}


@router.get("/dashboard/funnel")
async def get_funnel_data(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: TokenPayload = Depends(require_analytics_admin),
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Get funnel conversion data."""
    return service.get_funnel_data(start_date, end_date)


@router.get("/dashboard/heatmap")
async def get_heatmap_data(
    page_path: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    viewport_width: int = 1920,
    current_user: TokenPayload = Depends(require_analytics_admin),
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Get heatmap click data for a page."""
    return service.get_heatmap_data(page_path, start_date, end_date, viewport_width)


@router.get("/dashboard/journeys")
async def get_top_journeys(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 20,
    current_user: TokenPayload = Depends(require_analytics_admin),
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Get top user journeys."""
    data = service.get_top_journeys(start_date, end_date, limit)
    return {'journeys': data}


@router.get("/dashboard/abandonment")
async def get_abandonment_analysis(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    abandonment_type: Optional[str] = None,
    current_user: TokenPayload = Depends(require_analytics_admin),
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Get abandonment analysis."""
    data = service.get_abandonment_analysis(start_date, end_date, abandonment_type)
    return {'abandonment': data}


@router.get("/dashboard/geo")
async def get_geo_breakdown(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 20,
    current_user: TokenPayload = Depends(require_analytics_admin),
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Get geographic breakdown."""
    data = service.get_geo_breakdown(start_date, end_date, limit)
    return {'geo': data}


@router.get("/dashboard/devices")
async def get_device_breakdown(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: TokenPayload = Depends(require_analytics_admin),
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Get device/browser breakdown."""
    data = service.get_device_breakdown(start_date, end_date)
    return {'devices': data}


@router.get("/dashboard/flow")
async def get_page_flow(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 20,
    current_user: TokenPayload = Depends(require_analytics_admin),
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Get page flow data."""
    return service.get_page_flow(start_date, end_date, limit)


@router.get("/dashboard/pages")
async def get_top_pages(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 20,
    current_user: TokenPayload = Depends(require_analytics_admin),
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Get top pages."""
    data = service.get_top_pages(start_date, end_date, limit)
    return {'pages': data}


@router.get("/dashboard/sessions")
async def get_recent_sessions(
    limit: int = 50,
    current_user: TokenPayload = Depends(require_analytics_admin),
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Get recent sessions."""
    data = service.get_recent_sessions(limit)
    return {'sessions': data}


@router.post("/aggregate")
async def trigger_aggregation(
    date: Optional[str] = None,
    current_user: TokenPayload = Depends(require_analytics_admin),
    service: EnterpriseAnalyticsService = Depends(get_service),
) -> dict:
    """Manually trigger daily aggregation."""
    return service.aggregate_daily(date)
