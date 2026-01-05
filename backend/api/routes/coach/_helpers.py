"""
Shared helpers for Coach route handlers.

Tier access, usage checks, and SSE utilities.
"""

import json
import uuid
from typing import Optional, Dict, Any, AsyncGenerator
from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse

from backend.services.sse import get_stream_registry, get_completion_store, StreamType


# =============================================================================
# Tier Access
# =============================================================================

TIER_ACCESS = {
    "free": {"coach_access": True, "feature": "full_coach", "grounding": False},
    "pro": {"coach_access": True, "feature": "full_coach", "grounding": True},
    "studio": {"coach_access": True, "feature": "full_coach", "grounding": True},
    "unlimited": {"coach_access": True, "feature": "full_coach", "grounding": True},
}


def get_tier_access(tier: str) -> dict:
    """Get access config for a tier."""
    return TIER_ACCESS.get(tier, TIER_ACCESS["free"])


def has_coach_access(tier: str) -> bool:
    """Check if tier has coach access."""
    return get_tier_access(tier)["coach_access"]


# =============================================================================
# Usage Checks
# =============================================================================

async def check_usage(user_id: str, tier: str, usage_service) -> dict:
    """Check user's coach usage limits."""
    check = await usage_service.check_limit(user_id, "coach")
    return {
        "can_use": check.can_use,
        "is_free_tier": tier == "free",
        "used": check.used,
        "limit": check.limit,
        "remaining": check.remaining,
        "resets_at": check.resets_at.isoformat() if check.resets_at else None,
    }


def raise_if_limit_exceeded(usage_info: dict) -> None:
    """Raise 403 if usage limit exceeded."""
    if not usage_info["can_use"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "limit_exceeded",
                "message": f"You've used all {usage_info['limit']} creations this month. Upgrade to Pro for more!",
                "feature": "full_coach",
                "used": usage_info["used"],
                "limit": usage_info["limit"],
                "resets_at": usage_info["resets_at"],
            },
        )


def raise_upgrade_required() -> None:
    """Raise 403 for non-premium users."""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "error": "upgrade_required",
            "message": "Prompt Coach requires Pro or Studio subscription",
        },
    )


# =============================================================================
# SSE Streaming
# =============================================================================

async def create_sse_stream(
    stream_type: StreamType,
    user_id: str,
    chunk_generator: AsyncGenerator,
    metadata: Optional[Dict[str, Any]] = None,
) -> StreamingResponse:
    """
    Create an SSE streaming response from a chunk generator.
    
    Handles stream registration, heartbeats, completion tracking, and cleanup.
    """
    stream_id = f"coach:{stream_type.value}:{uuid.uuid4().hex[:8]}"
    registry = get_stream_registry()
    completion_store = get_completion_store()
    
    async def event_generator():
        event_counter = 0
        
        # Register stream
        try:
            await registry.register(
                stream_id=stream_id,
                stream_type=stream_type,
                user_id=user_id,
                metadata=metadata or {},
            )
        except Exception:
            pass
        
        try:
            async for chunk in chunk_generator:
                event_counter += 1
                event_data = {
                    "id": f"{stream_id}:{event_counter}",
                    "type": chunk.type,
                    "content": chunk.content,
                    "metadata": chunk.metadata,
                }
                yield f"data: {json.dumps(event_data)}\n\n"
                await registry.heartbeat(stream_id)
                
                if chunk.type == "done":
                    await completion_store.store_completion(stream_id, "done", event_data)
                    
        except Exception as e:
            event_counter += 1
            error_data = {
                "id": f"{stream_id}:{event_counter}",
                "type": "error",
                "content": str(e),
                "metadata": None,
            }
            yield f"data: {json.dumps(error_data)}\n\n"
            await completion_store.store_completion(stream_id, "error", error_data)
            
        finally:
            try:
                await registry.unregister(stream_id)
            except Exception:
                pass
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "X-Stream-ID": stream_id,
        },
    )


__all__ = [
    "TIER_ACCESS",
    "get_tier_access",
    "has_coach_access",
    "check_usage",
    "raise_if_limit_exceeded",
    "raise_upgrade_required",
    "create_sse_stream",
]
