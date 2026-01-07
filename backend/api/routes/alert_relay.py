"""
Alert Relay API Routes

SSE endpoints for real-time alert triggers.
Enables OBS browser sources to receive trigger events in real-time.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from sse_starlette.sse import EventSourceResponse

from backend.api.schemas.alert_animation_v2 import (
    TriggerAlertResponse,
)
from backend.api.middleware.auth import get_current_user
from backend.services.jwt_service import TokenPayload
from backend.services.alert_relay_service import get_alert_relay_service
from backend.database.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/alert-relay", tags=["alert-relay"])


def _validate_obs_token(token: str, alert_id: str) -> dict:
    """
    Validate OBS token for relay connection.
    
    Args:
        token: The OBS access token
        alert_id: The alert ID to validate against
        
    Returns:
        dict: Token payload if valid
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    from backend.services.jwt_service import decode_obs_token
    from backend.services.exceptions import TokenExpiredError, TokenInvalidError
    
    try:
        payload = decode_obs_token(token)
    except TokenExpiredError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "TOKEN_EXPIRED",
                "message": "OBS token has expired. Generate a new URL from your dashboard.",
            },
        )
    except TokenInvalidError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "TOKEN_INVALID",
                "message": str(e),
            },
        )
    
    # Verify token is for this alert
    if payload.project_id != alert_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "TOKEN_PROJECT_MISMATCH",
                "message": "Token is not valid for this alert",
            },
        )
    
    return payload


@router.get("/connect/{alert_id}")
async def connect_to_relay(
    alert_id: UUID,
    request: Request,
    token: str = Query(..., description="OBS access token for authentication"),
):
    """
    Connect to SSE relay for real-time alert triggers.
    
    This endpoint returns an SSE stream that will receive trigger events
    when the alert should play. Used by OBS browser sources.
    
    Events:
    - trigger: Alert should play
    - test: Test trigger (for preview)
    - config_update: Animation config has changed
    - ping: Keepalive (every 30 seconds)
    """
    # Validate token
    _validate_obs_token(token, str(alert_id))
    
    relay = get_alert_relay_service()
    
    return EventSourceResponse(
        relay.event_generator(str(alert_id), request),
        media_type="text/event-stream",
    )


@router.post("/trigger/{alert_id}", response_model=TriggerAlertResponse)
async def trigger_alert(
    alert_id: UUID,
    event_type: str = Query(default="trigger", description="Event type to send"),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Trigger an alert (for testing or manual triggers).
    
    Requires authentication and ownership of the alert.
    
    Event types:
    - trigger: Normal alert trigger
    - test: Test trigger for preview
    - config_update: Notify of config changes
    """
    supabase = get_supabase_client()
    
    # Verify ownership
    response = supabase.table("alert_animation_projects") \
        .select("id") \
        .eq("id", str(alert_id)) \
        .eq("user_id", current_user.sub) \
        .single() \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )
    
    relay = get_alert_relay_service()
    success = await relay.trigger(str(alert_id), event_type)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active connection for this alert",
        )
    
    return TriggerAlertResponse(
        status="triggered",
        alert_id=str(alert_id),
    )


@router.post("/test/{alert_id}", response_model=TriggerAlertResponse)
async def test_alert(
    alert_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Send a test trigger to an alert.
    
    Convenience endpoint that sends a 'test' event type.
    """
    return await trigger_alert(alert_id, "test", current_user)


@router.get("/status/{alert_id}")
async def get_relay_status(
    alert_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Check if an alert has an active relay connection.
    
    Useful for showing connection status in the dashboard.
    """
    supabase = get_supabase_client()
    
    # Verify ownership
    response = supabase.table("alert_animation_projects") \
        .select("id") \
        .eq("id", str(alert_id)) \
        .eq("user_id", current_user.sub) \
        .single() \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )
    
    relay = get_alert_relay_service()
    is_connected = relay.is_connected(str(alert_id))
    
    return {
        "alert_id": str(alert_id),
        "connected": is_connected,
    }


@router.get("/stats")
async def get_relay_stats(
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Get relay service statistics.
    
    Returns the number of active connections.
    Admin/debugging endpoint.
    """
    relay = get_alert_relay_service()
    
    return {
        "active_connections": relay.get_connection_count(),
    }
