"""
SSE Recovery Endpoints.

Provides endpoints for clients to recover from disconnected SSE streams.
Enables completion data retrieval and event replay for reconnection.
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from backend.api.middleware.auth import get_current_user, TokenPayload
from backend.services.sse import (
    get_stream_registry,
    get_completion_store,
    get_stream_guardian,
    CompletionData,
    StreamMetadata,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sse", tags=["SSE Recovery"])


# =============================================================================
# Response Models
# =============================================================================

class CompletionResponse(BaseModel):
    """Response model for completion data."""
    stream_id: str
    terminal_event_type: str
    terminal_event_data: Dict[str, Any]
    completed_at: str


class EventResponse(BaseModel):
    """Response model for a single event."""
    id: str
    data: Dict[str, Any]
    timestamp: str


class EventsResponse(BaseModel):
    """Response model for events list."""
    stream_id: str
    events: List[EventResponse]
    count: int


class HealthResponse(BaseModel):
    """Response model for guardian health metrics."""
    active_count: int
    stale_count: int
    orphaned_count: int
    healthy_count: int
    checked_at: str


class StreamInfoResponse(BaseModel):
    """Response model for stream info."""
    stream_id: str
    stream_type: str
    user_id: str
    state: str
    started_at: str
    last_heartbeat: str
    metadata: Dict[str, Any]


# =============================================================================
# Recovery Endpoints
# =============================================================================

@router.get(
    "/recovery/{stream_id}",
    response_model=CompletionResponse,
    summary="Get completion data for a stream",
    description="""
    Retrieve completion data for a finished stream.
    
    Use this endpoint when reconnecting to check if the stream completed
    while the client was disconnected. If completion data exists, the client
    can skip reconnecting to the SSE stream and use the completion data directly.
    
    Returns 404 if no completion data exists (stream may still be active or
    completion data has expired).
    """,
    responses={
        200: {"description": "Completion data found"},
        404: {"description": "No completion data found"},
    },
)
async def get_recovery_data(
    stream_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> CompletionResponse:
    """Get completion data for a stream."""
    store = get_completion_store()
    registry = get_stream_registry()
    
    # Verify user owns this stream (if stream still exists)
    stream = await registry.get_stream(stream_id)
    if stream and stream.user_id != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this stream",
        )
    
    # Get completion data
    completion = await store.get_completion(stream_id)
    if not completion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No completion data found for this stream",
        )
    
    return CompletionResponse(
        stream_id=completion.stream_id,
        terminal_event_type=completion.terminal_event_type,
        terminal_event_data=completion.terminal_event_data,
        completed_at=completion.completed_at.isoformat(),
    )


@router.get(
    "/events/{stream_id}",
    response_model=EventsResponse,
    summary="Get events for replay",
    description="""
    Retrieve events for a stream to replay on reconnection.
    
    Use the `last_event_id` query parameter to get only events after
    a specific event (for resuming from where the client left off).
    
    Events are stored for a limited time (5 minutes) after the stream ends.
    """,
    responses={
        200: {"description": "Events retrieved"},
        404: {"description": "No events found"},
    },
)
async def get_events(
    stream_id: str,
    last_event_id: Optional[str] = Query(
        None,
        description="ID of the last event received (to get events after this)",
    ),
    current_user: TokenPayload = Depends(get_current_user),
) -> EventsResponse:
    """Get events for replay."""
    store = get_completion_store()
    registry = get_stream_registry()
    
    # Verify user owns this stream (if stream still exists)
    stream = await registry.get_stream(stream_id)
    if stream and stream.user_id != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this stream",
        )
    
    # Get events
    events = await store.get_events_after(stream_id, last_event_id)
    
    return EventsResponse(
        stream_id=stream_id,
        events=[
            EventResponse(
                id=e["id"],
                data=e["data"],
                timestamp=e["timestamp"],
            )
            for e in events
        ],
        count=len(events),
    )


@router.get(
    "/stream/{stream_id}",
    response_model=StreamInfoResponse,
    summary="Get stream info",
    description="""
    Get information about an active stream.
    
    Returns the current state and metadata of the stream.
    """,
    responses={
        200: {"description": "Stream info retrieved"},
        404: {"description": "Stream not found"},
    },
)
async def get_stream_info(
    stream_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> StreamInfoResponse:
    """Get stream info."""
    registry = get_stream_registry()
    
    stream = await registry.get_stream(stream_id)
    if not stream:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stream not found",
        )
    
    # Verify user owns this stream
    if stream.user_id != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this stream",
        )
    
    return StreamInfoResponse(
        stream_id=stream.stream_id,
        stream_type=stream.stream_type.value,
        user_id=stream.user_id,
        state=stream.state.value,
        started_at=stream.started_at.isoformat(),
        last_heartbeat=stream.last_heartbeat.isoformat(),
        metadata=stream.metadata,
    )


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Get SSE guardian health metrics",
    description="""
    Get health metrics for the SSE stream guardian.
    
    Returns counts of active, stale, orphaned, and healthy streams.
    Useful for monitoring and alerting.
    """,
)
async def get_health(
    current_user: TokenPayload = Depends(get_current_user),
) -> HealthResponse:
    """Get guardian health metrics."""
    guardian = get_stream_guardian()
    metrics = await guardian.get_health_metrics()
    
    return HealthResponse(
        active_count=metrics["active_count"],
        stale_count=metrics["stale_count"],
        orphaned_count=metrics["orphaned_count"],
        healthy_count=metrics["healthy_count"],
        checked_at=metrics["checked_at"],
    )


@router.post(
    "/recover/{stream_id}",
    response_model=CompletionResponse,
    summary="Attempt to recover a stream",
    description="""
    Attempt to recover completion data for a stream.
    
    This endpoint will check if the underlying job/session has completed
    and store the completion data if available. Use this when the client
    suspects the stream may have completed but no completion data exists.
    """,
    responses={
        200: {"description": "Recovery successful"},
        404: {"description": "Could not recover stream"},
    },
)
async def recover_stream(
    stream_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> CompletionResponse:
    """Attempt to recover a stream."""
    guardian = get_stream_guardian()
    registry = get_stream_registry()
    
    # Verify user owns this stream (if stream still exists)
    stream = await registry.get_stream(stream_id)
    if stream and stream.user_id != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this stream",
        )
    
    # Attempt recovery
    completion = await guardian.recover_stream(stream_id)
    if not completion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Could not recover stream - no completion data available",
        )
    
    return CompletionResponse(
        stream_id=completion.stream_id,
        terminal_event_type=completion.terminal_event_type,
        terminal_event_data=completion.terminal_event_data,
        completed_at=completion.completed_at.isoformat(),
    )


__all__ = ["router"]
