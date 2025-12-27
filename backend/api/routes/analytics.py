"""
Analytics API Routes

Enterprise-grade analytics ingestion and dashboard endpoints for Aurastream.
Handles batched event collection with validation and real-time aggregation.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Request, status
from pydantic import BaseModel, Field, field_validator

from backend.services.analytics_service import get_analytics_service, AnalyticsService

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# Constants
# =============================================================================

VALID_CATEGORIES = {"page", "modal", "wizard", "user_action", "feature", "performance", "error"}


# =============================================================================
# Schemas
# =============================================================================

class BaseEventProperties(BaseModel):
    """Base properties included with every event."""
    timestamp: int
    sessionId: str
    deviceId: str
    url: str
    userAgent: str
    screenResolution: str
    viewport: str
    timezone: str
    language: str
    userId: Optional[str] = None
    referrer: Optional[str] = None


class AnalyticsEvent(BaseModel):
    """Single analytics event."""
    id: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=128)
    category: str = Field(..., min_length=1, max_length=64)
    properties: dict[str, Any] = Field(default_factory=dict)
    base: BaseEventProperties
    createdAt: int
    sentAt: Optional[int] = None
    retryCount: Optional[int] = None

    @field_validator('category')
    @classmethod
    def validate_category(cls, v: str) -> str:
        """Validate event category against allowed values."""
        if v not in VALID_CATEGORIES:
            raise ValueError(f'Invalid category: {v}. Must be one of: {", ".join(sorted(VALID_CATEGORIES))}')
        return v

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate event name follows naming convention."""
        import re
        if not re.match(r'^[a-z][a-z0-9_]*$', v):
            raise ValueError('Event name must be lowercase alphanumeric with underscores, starting with a letter')
        return v

    @field_validator('properties')
    @classmethod
    def validate_properties(cls, v: dict) -> dict:
        """Ensure properties dict isn't too large."""
        if len(str(v)) > 10000:
            raise ValueError('Properties too large')
        return v


class AnalyticsMetadata(BaseModel):
    """Metadata about the analytics SDK."""
    sdk: str = Field(default="aurastream-analytics")
    version: str = Field(default="1.0.0")


class AnalyticsBatchRequest(BaseModel):
    """Batch of analytics events."""
    events: list[AnalyticsEvent] = Field(..., min_length=1, max_length=100)
    metadata: AnalyticsMetadata = Field(default_factory=AnalyticsMetadata)


class AnalyticsResponse(BaseModel):
    """Response for analytics ingestion."""
    success: bool
    eventsReceived: int
    eventsStored: int
    timestamp: str


class AnalyticsSummaryResponse(BaseModel):
    """Summary response for analytics dashboard."""
    totalEvents: int
    activeSessions: int
    errorRate: float
    eventBreakdown: list[dict[str, Any]]
    categoryDistribution: list[dict[str, Any]]
    recentSessions: list[dict[str, Any]]
    timeRange: str
    generatedAt: str


# =============================================================================
# Dependencies
# =============================================================================

def get_service() -> AnalyticsService:
    """Dependency to get analytics service."""
    return get_analytics_service()


# =============================================================================
# Routes
# =============================================================================

@router.post(
    "",
    response_model=AnalyticsResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest Analytics Events",
    description="""
    Receive a batch of analytics events from the frontend tracker.
    
    Events are validated and stored in Redis for real-time aggregation.
    
    Rate limits:
    - 100 events per request
    - 1000 requests per minute per IP
    """,
)
async def ingest_events(
    request: Request,
    batch: AnalyticsBatchRequest,
    background_tasks: BackgroundTasks,
    service: AnalyticsService = Depends(get_service),
) -> AnalyticsResponse:
    """
    Ingest a batch of analytics events.
    
    Events are stored in Redis for real-time dashboard queries.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.info(
        f"[{request_id}] Received {len(batch.events)} events",
        extra={
            "request_id": request_id,
            "event_count": len(batch.events),
            "sdk_version": batch.metadata.version,
        }
    )
    
    # Store events
    events_data = [event.model_dump() for event in batch.events]
    stored = service.store_events(events_data)
    
    return AnalyticsResponse(
        success=True,
        eventsReceived=len(batch.events),
        eventsStored=stored,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get(
    "/health",
    summary="Analytics Health Check",
    description="Check if the analytics ingestion service is healthy.",
)
async def analytics_health(
    service: AnalyticsService = Depends(get_service),
) -> dict:
    """Health check for analytics service."""
    try:
        service.redis.ping()
        redis_status = "connected"
    except Exception:
        redis_status = "disconnected"
    
    return {
        "status": "healthy" if redis_status == "connected" else "degraded",
        "service": "analytics",
        "redis": redis_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get(
    "/summary",
    response_model=AnalyticsSummaryResponse,
    summary="Get Analytics Summary",
    description="""
    Get aggregated analytics data for the admin dashboard.
    
    Returns real-time data from Redis including:
    - Total event counts
    - Active sessions
    - Event breakdown by name
    - Category distribution
    - Recent session activity
    
    Requires admin access (whitelisted email).
    """,
)
async def get_analytics_summary(
    request: Request,
    time_range: str = "24h",
    service: AnalyticsService = Depends(get_service),
) -> AnalyticsSummaryResponse:
    """
    Get analytics summary for dashboard.
    
    Queries Redis for real-time aggregated data.
    """
    # Validate time range
    valid_ranges = ["1h", "24h", "7d", "30d"]
    if time_range not in valid_ranges:
        time_range = "24h"
    
    summary = service.get_summary(time_range)
    
    return AnalyticsSummaryResponse(**summary)


@router.delete(
    "/clear",
    summary="Clear Analytics Data",
    description="Clear all analytics data. Admin only, for testing purposes.",
)
async def clear_analytics(
    service: AnalyticsService = Depends(get_service),
) -> dict:
    """Clear all analytics data."""
    service.clear_all()
    return {
        "success": True,
        "message": "All analytics data cleared",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post(
    "/flush",
    summary="Flush Analytics to PostgreSQL",
    description="""
    Manually trigger a flush of analytics data from Redis to PostgreSQL.
    
    This is normally done automatically every hour by the analytics flush worker.
    Use this endpoint for:
    - Testing the flush functionality
    - Forcing an immediate flush before scheduled time
    - Recovery after worker issues
    
    Requires admin access.
    """,
)
async def flush_analytics(
    force: bool = False,
    service: AnalyticsService = Depends(get_service),
) -> dict:
    """
    Flush analytics data from Redis to PostgreSQL.
    
    Args:
        force: If True, bypass the hourly check and flush immediately
    """
    result = service.flush_to_postgres(force=force)
    
    return {
        "success": not result.get("error") and not result.get("skipped"),
        "result": result,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get(
    "/popular-assets",
    summary="Get Popular Asset Types",
    description="""
    Get the most popular asset types based on generation, view, and share counts.
    
    Returns a ranked list of asset types with:
    - Total generations
    - Total views
    - Total shares
    - Weighted popularity score
    
    The popularity score is calculated as: (generations * 3) + views + (shares * 2)
    """,
)
async def get_popular_assets(
    days: int = 30,
    limit: int = 10,
    service: AnalyticsService = Depends(get_service),
) -> dict:
    """
    Get the most popular asset types.
    
    Args:
        days: Number of days to look back (default 30)
        limit: Maximum number of results (default 10)
    """
    # Validate parameters
    days = max(1, min(365, days))
    limit = max(1, min(50, limit))
    
    popular = service.get_popular_asset_types(days=days, limit=limit)
    
    return {
        "assetTypes": popular,
        "days": days,
        "limit": limit,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get(
    "/flush-status",
    summary="Get Flush Status",
    description="Get the status of the last analytics flush operation.",
)
async def get_flush_status(
    service: AnalyticsService = Depends(get_service),
) -> dict:
    """Get the status of the last flush operation."""
    last_flush = service.get_last_flush_time()
    
    return {
        "lastFlush": last_flush,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
