"""
Prompt Coach Route Handlers for Aurastream.

This module implements all Prompt Coach endpoints:
- GET /coach/tips - Get static tips (all tiers)
- GET /coach/access - Check tier access
- POST /coach/start - Start session with context (Premium, SSE)
- POST /coach/sessions/{id}/messages - Continue chat (Premium, SSE)
- GET /coach/sessions/{id} - Get session state
- POST /coach/sessions/{id}/end - End session

Premium tier check is enforced on conversational endpoints.

Rate Limiting:
- Session start: 20 sessions per user per hour
- Messages: 10 messages per user per minute

Security Features:
- All endpoints require authentication
- Premium tier required for full coach functionality
- Session ownership verified on all session operations
- Audit logging for session start/end events
"""

import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import StreamingResponse

from backend.api.middleware.auth import get_current_user
from backend.services.rate_limit import (
    check_coach_message_rate_limit,
    check_coach_session_rate_limit,
    get_coach_rate_limit_status,
)
from backend.api.schemas.coach import (
    StartCoachRequest,
    ContinueChatRequest,
    CoachAccessResponse,
    TipsResponse,
    PromptTipResponse,
    SessionStateResponse,
    EndSessionResponse,
    GenerateFromSessionRequest,
    GenerateFromSessionResponse,
    RefineImageRequest,
    RefineImageResponse,
    SessionAssetsResponse,
    SessionAssetResponse,
    SessionListResponse,
    SessionSummary,
)
from backend.api.service_dependencies import (
    CoachServiceDep,
    TipsServiceDep,
    SessionManagerDep,
    AuditServiceDep,
    UsageLimitServiceDep,
    GenerationServiceDep,
    CoachAnalyticsServiceDep,
)
from backend.services.jwt_service import TokenPayload
from backend.services.coach import (
    SessionNotFoundError,
    SessionExpiredError,
)


router = APIRouter()


# =============================================================================
# Tier Access Configuration
# =============================================================================

TIER_ACCESS = {
    "free": {"coach_access": True, "feature": "full_coach", "grounding": False},  # Limited by monthly quota
    "pro": {"coach_access": True, "feature": "full_coach", "grounding": True},   # Pro gets grounding
    "studio": {"coach_access": True, "feature": "full_coach", "grounding": True},  # Studio tier
    "unlimited": {"coach_access": True, "feature": "full_coach", "grounding": True},  # Unlimited tier - full access
}


def check_premium_access(tier: str) -> bool:
    """
    Check if user has premium access for full coach.
    
    All tiers now have coach access, limited by monthly quotas.
    
    Args:
        tier: User's subscription tier
        
    Returns:
        bool: True if user has coach access
    """
    return TIER_ACCESS.get(tier, TIER_ACCESS["free"])["coach_access"]


async def check_usage_eligibility(user_id: str, tier: str, usage_service) -> dict:
    """
    Check if user can use coach based on monthly usage limits.
    
    Args:
        user_id: User's ID
        tier: User's subscription tier
        usage_service: Injected UsageLimitService (required)
        
    Returns:
        dict with can_use_coach, remaining, limit, resets_at
    """
    check = await usage_service.check_limit(user_id, "coach")
    
    return {
        "can_use_coach": check.can_use,
        "is_free_tier": tier == "free",
        "used": check.used,
        "limit": check.limit,
        "remaining": check.remaining,
        "resets_at": check.resets_at.isoformat() if check.resets_at else None,
    }


async def increment_coach_usage(user_id: str, usage_service) -> None:
    """Increment coach usage counter."""
    await usage_service.increment(user_id, "coach")


# =============================================================================
# Static Tips Endpoints (All Tiers)
# =============================================================================

@router.get(
    "/tips",
    response_model=TipsResponse,
    summary="Get prompt tips",
    description="""
    Get static prompt tips for an asset type.
    
    **Available to all tiers** - This endpoint provides helpful tips for
    crafting effective prompts without requiring Studio subscription.
    
    **Asset Types:**
    - twitch_emote: Tips for Twitch emotes
    - youtube_thumbnail: Tips for YouTube thumbnails
    - twitch_banner: Tips for Twitch banners
    - twitch_badge: Tips for Twitch badges
    - overlay: Tips for stream overlays
    - story_graphic: Tips for story graphics
    
    **Response includes:**
    - List of tips with examples
    - Upgrade CTA for non-premium users
    """,
    responses={
        200: {"description": "Tips retrieved successfully"},
        401: {"description": "Authentication required"},
    },
)
async def get_tips(
    asset_type: str = Query(
        "twitch_emote",
        description="Asset type to get tips for",
        examples=["twitch_emote", "youtube_thumbnail", "twitch_banner"],
    ),
    current_user: TokenPayload = Depends(get_current_user),
    tips_service: TipsServiceDep = None,
) -> TipsResponse:
    """
    Get static prompt tips for an asset type.
    
    Retrieves curated tips for crafting effective prompts based on
    the selected asset type. Available to all subscription tiers.
    
    Args:
        asset_type: Type of asset to get tips for
        current_user: Authenticated user's token payload
        tips_service: Injected TipsService
        
    Returns:
        TipsResponse: List of tips with upgrade CTA
    """
    response = tips_service.format_tips_response(asset_type)
    
    return TipsResponse(
        feature="tips_only",
        tips=[
            PromptTipResponse(
                id=tip["id"],
                title=tip["title"],
                description=tip["description"],
                example=tip["example"],
            )
            for tip in response["tips"]
        ],
        upgrade_cta=response["upgrade_cta"],
    )


@router.get(
    "/access",
    response_model=CoachAccessResponse,
    summary="Check coach access",
    description="""
    Check what coach features the user can access based on their tier.
    
    **Returns:**
    - has_access: Whether user has full coach access
    - feature: Available feature level (full_coach or tips_only)
    - grounding: Whether game context grounding is available
    - upgrade_message: Message for non-premium users
    - free_use_available: Whether free user can use their 28-day session
    - days_until_next: Days until next free use (if applicable)
    
    **Tier Access:**
    - Free: 1 session per 28 days, no grounding
    - Pro: Unlimited sessions, no grounding
    - Studio: Unlimited sessions with grounding
    """,
    responses={
        200: {"description": "Access level retrieved successfully"},
        401: {"description": "Authentication required"},
    },
)
async def check_access(
    current_user: TokenPayload = Depends(get_current_user),
    usage_service: UsageLimitServiceDep = None,
) -> CoachAccessResponse:
    """
    Check what coach features the user can access.
    
    Returns the user's access level based on their subscription tier
    and monthly usage limits.
    
    Args:
        current_user: Authenticated user's token payload
        usage_service: Injected UsageLimitService
        
    Returns:
        CoachAccessResponse: Access level information
    """
    tier = current_user.tier or "free"
    access = TIER_ACCESS.get(tier, TIER_ACCESS["free"])
    
    # Check usage limits
    usage_info = await check_usage_eligibility(current_user.sub, tier, usage_service)
    
    # Get rate limit status for users who can use coach
    rate_limits = None
    if usage_info["can_use_coach"]:
        rate_limits = await get_coach_rate_limit_status(current_user.sub, tier)
    
    # Determine effective access
    has_access = usage_info["can_use_coach"]
    
    # Build upgrade message
    upgrade_message = None
    if not has_access:
        if usage_info["is_free_tier"]:
            upgrade_message = (
                f"You've used your {usage_info['limit']} Coach session this month. "
                "Upgrade to Pro for 50 creations/month!"
            )
        else:
            upgrade_message = (
                f"You've used all {usage_info['limit']} creations this month. "
                "Usage resets at the start of next month."
            )
    elif usage_info["is_free_tier"] and usage_info["remaining"] > 0:
        upgrade_message = (
            f"You have {usage_info['remaining']} Coach session remaining this month. "
            "Upgrade to Pro for 50 creations/month!"
        )
    
    return CoachAccessResponse(
        has_access=has_access,
        feature="full_coach" if has_access else "tips_only",
        grounding=access["grounding"],
        upgrade_message=upgrade_message,
        rate_limits=rate_limits,
        trial_available=usage_info["is_free_tier"] and usage_info["can_use_coach"],
        trial_used=usage_info["is_free_tier"] and not usage_info["can_use_coach"],
    )


# =============================================================================
# Premium Coach Endpoints (SSE Streaming)
# =============================================================================

@router.post(
    "/start",
    summary="Start coach session",
    description="""
    Start a new coach session with pre-loaded context.
    
    **Premium or Trial** - Requires Studio subscription OR unused free trial.
    
    Free and Pro users get 1 trial session to experience the coach.
    After the trial, upgrade to Studio for unlimited access.
    
    **Returns Server-Sent Events stream with:**
    - grounding: When searching for game context
    - grounding_complete: When search is done
    - token: Each token of the response
    - validation: Prompt validation results
    - done: Session created with session_id
    - error: If something goes wrong
    
    **Request body:**
    - brand_context: Pre-loaded brand kit context
    - asset_type: Type of asset to generate
    - mood: Mood/style selection
    - description: User's description of what they want
    - game_id/game_name: Optional game context
    
    **SSE Format:**
    Each event is a JSON object with type, content, and metadata fields.
    """,
    responses={
        200: {
            "description": "SSE stream started",
            "content": {"text/event-stream": {}},
        },
        401: {"description": "Authentication required"},
        403: {"description": "Studio subscription required or trial already used"},
        422: {"description": "Validation error"},
    },
)
async def start_coach_session(
    request: Request,
    data: StartCoachRequest,
    current_user: TokenPayload = Depends(get_current_user),
    coach_service: CoachServiceDep = None,
    audit: AuditServiceDep = None,
    usage_service: UsageLimitServiceDep = None,
):
    """
    Start a new coach session with pre-loaded context.
    
    Creates a new coaching session with all context pre-loaded from the client.
    Returns a Server-Sent Events stream with the coach's initial response,
    including prompt suggestions and validation results.
    
    Args:
        request: FastAPI request object for audit logging
        data: StartCoachRequest with brand context and user input
        current_user: Authenticated user's token payload
        coach_service: Injected CoachService
        audit: Injected AuditService
        usage_service: Injected UsageLimitService
        
    Returns:
        StreamingResponse: SSE stream with coach response
        
    Raises:
        HTTPException: 403 if user doesn't have access
        HTTPException: 429 if rate limit exceeded
    """
    tier = current_user.tier or "free"
    
    # Check usage limits - but don't increment yet
    # Usage is only counted when an image is actually generated
    usage_info = await check_usage_eligibility(current_user.sub, tier, usage_service)
    
    if not usage_info["can_use_coach"]:
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
    
    # Check rate limit for session creation (pass tier for proper limits)
    await check_coach_session_rate_limit(current_user.sub, tier)
    
    # NOTE: Usage is NOT incremented here - only when image is generated
    is_free_tier = usage_info["is_free_tier"]
    
    # Handle optional brand_context - use empty context if not provided
    brand_context_data = data.brand_context.model_dump() if data.brand_context else {
        "brand_kit_id": None,
        "colors": [],
        "tone": "professional",
        "fonts": None,
        "logo_url": None,
    }
    
    # Add media assets to brand context for session storage
    if data.media_asset_ids:
        brand_context_data["media_asset_ids"] = data.media_asset_ids
    if data.media_asset_placements:
        brand_context_data["media_asset_placements"] = [
            p.model_dump() for p in data.media_asset_placements
        ]
    
    # Add canvas snapshot to brand context for session storage
    if data.canvas_snapshot_url:
        brand_context_data["canvas_snapshot_url"] = data.canvas_snapshot_url
    if data.canvas_snapshot_description:
        brand_context_data["canvas_snapshot_description"] = data.canvas_snapshot_description
    
    # Extract preferences for coach service
    preferences_data = data.preferences.model_dump() if data.preferences else None
    
    # Generate stream ID for tracking
    stream_id = f"coach:start:{uuid.uuid4().hex[:8]}"
    
    # Import SSE services
    from backend.services.sse import (
        get_stream_registry,
        get_completion_store,
        StreamType,
    )
    registry = get_stream_registry()
    completion_store = get_completion_store()
    
    async def event_generator():
        """Generate SSE events from coach service."""
        event_counter = 0
        session_id = None
        
        # Register stream
        try:
            await registry.register(
                stream_id=stream_id,
                stream_type=StreamType.COACH_START,
                user_id=current_user.sub,
                metadata={"asset_type": data.asset_type, "mood": data.mood},
            )
        except Exception:
            pass
        
        try:
            # Send usage info at start for UI feedback
            # Note: Usage is only counted when an image is generated, not at session start
            if is_free_tier:
                event_counter += 1
                usage_event = json.dumps({
                    "id": f"{stream_id}:{event_counter}",
                    "type": "usage_info",
                    "content": f"Coach session started. You have {usage_info['remaining']} creation(s) remaining this month.",
                    "metadata": {
                        "is_free_tier": True,
                        "remaining": usage_info["remaining"],
                        "limit": usage_info["limit"],
                        "note": "Usage is only counted when you generate an image",
                    },
                })
                yield f"data: {usage_event}\n\n"
                await registry.heartbeat(stream_id)
            
            async for chunk in coach_service.start_with_context(
                user_id=current_user.sub,
                brand_context=brand_context_data,
                asset_type=data.asset_type,
                mood=data.mood,
                description=data.description,
                custom_mood=data.custom_mood,
                game_id=data.game_id,
                game_name=data.game_name,
                tier="pro" if tier in ("free", "pro") else tier,  # All users get pro-level coach access
                preferences=preferences_data,
            ):
                event_counter += 1
                event_data = {
                    "id": f"{stream_id}:{event_counter}",
                    "type": chunk.type,
                    "content": chunk.content,
                    "metadata": chunk.metadata,
                }
                yield f"data: {json.dumps(event_data)}\n\n"
                await registry.heartbeat(stream_id)
                
                # Track session_id from done event
                if chunk.type == "done" and chunk.metadata:
                    session_id = chunk.metadata.get("session_id")
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
    
    # Audit log the session start
    await audit.log(
        user_id=current_user.sub,
        action="coach.start",
        resource_type="coach_session",
        resource_id="new",
        details={
            "asset_type": data.asset_type,
            "mood": data.mood,
            "is_free_tier": is_free_tier,
        },
        ip_address=request.client.host if request.client else None,
    )
    
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


@router.post(
    "/sessions/{session_id}/messages",
    summary="Continue coach chat",
    description="""
    Send a message to continue the coach conversation.
    
    **Premium or Active Trial** - Requires Studio subscription or active trial session.
    
    **Reference Assets:**
    Users can attach up to 2 reference images from their media library per message.
    These provide visual context to help the coach understand the user's vision.
    
    **Returns Server-Sent Events stream with:**
    - token: Each token of the response
    - validation: Prompt validation results
    - done: Message processed with turns remaining
    - error: If something goes wrong
    
    **Session Limits:**
    - Maximum 10 turns per session
    - Session expires after 30 minutes of inactivity
    
    **SSE Format:**
    Each event is a JSON object with type, content, and metadata fields.
    """,
    responses={
        200: {
            "description": "SSE stream started",
            "content": {"text/event-stream": {}},
        },
        401: {"description": "Authentication required"},
        403: {"description": "Studio subscription required"},
        404: {"description": "Session not found"},
        410: {"description": "Session expired"},
        422: {"description": "Validation error"},
    },
)
async def continue_coach_chat(
    session_id: str,
    data: ContinueChatRequest,
    current_user: TokenPayload = Depends(get_current_user),
    session_manager: SessionManagerDep = None,
    coach_service: CoachServiceDep = None,
):
    """
    Continue an existing coach session with a new message.
    
    Sends a refinement message to the coach and streams the response.
    The coach will modify the previous prompt suggestion based on
    the user's feedback.
    
    Users can attach reference assets from their media library to provide
    visual context for their refinement requests.
    
    Trial users can continue their trial session until it ends.
    
    Args:
        session_id: UUID of the session to continue
        data: ContinueChatRequest with user's message and optional reference assets
        current_user: Authenticated user's token payload
        session_manager: Injected SessionManager
        coach_service: Injected CoachService
        
    Returns:
        StreamingResponse: SSE stream with coach response
        
    Raises:
        HTTPException: 403 if user doesn't have access
        HTTPException: 429 if rate limit exceeded
    """
    # For continue, we need to verify the user owns this session
    # Free tier users can continue their own session even after cooldown starts
    
    try:
        # This verifies ownership
        _ = await session_manager.get_or_raise(session_id, current_user.sub)
    except SessionNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "session_not_found", "message": "Session not found"},
        )
    
    # Premium users always have access, non-premium can continue their own sessions
    # (ownership already verified above)
    
    # Check rate limit for messages (pass tier for proper limits)
    tier = current_user.tier or "free"
    await check_coach_message_rate_limit(current_user.sub, tier)
    
    # Serialize reference assets for the coach service
    reference_assets_data = None
    if data.reference_assets:
        reference_assets_data = [
            {
                "asset_id": ref.asset_id,
                "display_name": ref.display_name,
                "asset_type": ref.asset_type,
                "url": ref.url,
                "description": ref.description,
            }
            for ref in data.reference_assets
        ]
    
    # Generate stream ID for tracking
    stream_id = f"coach:{session_id}:{uuid.uuid4().hex[:8]}"
    
    # Import SSE services
    from backend.services.sse import (
        get_stream_registry,
        get_completion_store,
        StreamType,
    )
    registry = get_stream_registry()
    completion_store = get_completion_store()
    
    async def event_generator():
        """Generate SSE events from coach service."""
        event_counter = 0
        
        # Register stream
        try:
            await registry.register(
                stream_id=stream_id,
                stream_type=StreamType.COACH_CONTINUE,
                user_id=current_user.sub,
                metadata={
                    "session_id": session_id,
                    "has_reference_assets": bool(reference_assets_data),
                },
            )
        except Exception:
            pass
        
        try:
            async for chunk in coach_service.continue_chat(
                session_id=session_id,
                user_id=current_user.sub,
                message=data.message,
                reference_assets=reference_assets_data,
            ):
                event_counter += 1
                event_data = {
                    "id": f"{stream_id}:{event_counter}",
                    "type": chunk.type,
                    "content": chunk.content,
                    "metadata": chunk.metadata,
                }
                yield f"data: {json.dumps(event_data)}\n\n"
                await registry.heartbeat(stream_id)
                
                # Store completion on done event
                if chunk.type == "done":
                    await completion_store.store_completion(stream_id, "done", event_data)
                    
        except SessionNotFoundError as e:
            event_counter += 1
            error_data = {
                "id": f"{stream_id}:{event_counter}",
                "type": "error",
                "content": "Session not found or expired",
                "metadata": e.to_dict(),
            }
            yield f"data: {json.dumps(error_data)}\n\n"
            await completion_store.store_completion(stream_id, "error", error_data)
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


@router.get(
    "/sessions/{session_id}",
    response_model=SessionStateResponse,
    summary="Get session state",
    description="""
    Get the current state of a coach session.
    
    **Premium only** - Requires Studio subscription.
    
    **Returns:**
    - session_id: Session UUID
    - status: active, ended, or expired
    - turns_used: Number of turns used
    - turns_remaining: Turns remaining
    - current_prompt: Current prompt draft
    - prompt_versions: Number of prompt versions
    
    **Authorization:**
    - User must own the session
    """,
    responses={
        200: {"description": "Session state retrieved successfully"},
        401: {"description": "Authentication required"},
        403: {"description": "Studio subscription required"},
        404: {"description": "Session not found"},
        410: {"description": "Session expired"},
    },
)
async def get_session_state(
    session_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    session_manager: SessionManagerDep = None,
) -> SessionStateResponse:
    """
    Get the current state of a coach session.
    
    Retrieves the session's current status, turns used/remaining,
    and the current prompt draft.
    
    Args:
        session_id: UUID of the session
        current_user: Authenticated user's token payload
        session_manager: Injected SessionManager
        
    Returns:
        SessionStateResponse: Current session state
        
    Raises:
        HTTPException: 403 if user doesn't have Studio subscription
        HTTPException: 404 if session not found
        HTTPException: 410 if session expired
    """
    tier = current_user.tier or "free"
    
    if not check_premium_access(tier):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "upgrade_required",
                "message": "Prompt Coach requires Pro or Studio subscription",
            },
        )
    
    try:
        session = await session_manager.get_or_raise(session_id, current_user.sub)
    except SessionNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.to_dict(),
        )
    except SessionExpiredError as e:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=e.to_dict(),
        )
    
    limits = await session_manager.check_limits(session)
    
    return SessionStateResponse(
        session_id=session.session_id,
        status=session.status,
        turns_used=session.turns_used,
        turns_remaining=limits["turns_remaining"],
        current_prompt=session.current_prompt_draft,
        prompt_versions=len(session.prompt_history),
    )


@router.post(
    "/sessions/{session_id}/end",
    response_model=EndSessionResponse,
    summary="End coach session",
    description="""
    End a coach session and get the final prompt.
    
    **Premium only** - Requires Studio subscription.
    
    **Returns:**
    - session_id: Session UUID
    - final_prompt: The final refined prompt
    - confidence_score: Quality confidence score (0-1)
    - keywords: Extracted keywords from the prompt
    - metadata: Session statistics
    
    **Note:** Once ended, a session cannot be continued.
    The final prompt can be used for asset generation.
    """,
    responses={
        200: {"description": "Session ended successfully"},
        401: {"description": "Authentication required"},
        403: {"description": "Studio subscription required"},
        404: {"description": "Session not found"},
    },
)
async def end_coach_session(
    request: Request,
    session_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    coach_service: CoachServiceDep = None,
    audit: AuditServiceDep = None,
) -> EndSessionResponse:
    """
    End a coach session and get the final prompt.
    
    Marks the session as ended and returns the final prompt
    along with quality metrics and extracted keywords.
    
    Args:
        request: FastAPI request object for audit logging
        session_id: UUID of the session to end
        current_user: Authenticated user's token payload
        coach_service: Injected CoachService
        audit: Injected AuditService
        
    Returns:
        EndSessionResponse: Final prompt and session metadata
        
    Raises:
        HTTPException: 403 if user doesn't have Studio subscription
        HTTPException: 404 if session not found
    """
    tier = current_user.tier or "free"
    
    if not check_premium_access(tier):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "upgrade_required",
                "message": "Prompt Coach requires Pro or Studio subscription",
            },
        )
    
    try:
        output = await coach_service.end_session(session_id, current_user.sub)
    except SessionNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.to_dict(),
        )
    
    # Audit log the session end
    await audit.log(
        user_id=current_user.sub,
        action="coach.end",
        resource_type="coach_session",
        resource_id=session_id,
        details={"prompt_versions": output.metadata.get("prompt_versions", 0)},
        ip_address=request.client.host if request.client else None,
    )
    
    return EndSessionResponse(
        session_id=session_id,
        final_prompt=output.final_prompt,
        confidence_score=output.confidence_score,
        keywords=output.keywords,
        metadata=output.metadata,
    )


# =============================================================================
# Inline Generation Endpoints
# =============================================================================

@router.post(
    "/sessions/{session_id}/generate",
    response_model=GenerateFromSessionResponse,
    summary="Generate asset from session",
    description="""
    Trigger asset generation using the refined prompt from a coach session.
    
    **Premium only** - Requires Studio subscription.
    
    **Returns:**
    - job_id: UUID of the generation job for polling
    - status: Initial job status (queued)
    - message: Status message
    - quality_warning: Optional warning if prompt quality is low
    
    **Flow:**
    1. Validates session ownership and status
    2. Checks prompt quality (warns if below threshold)
    3. Creates generation job with session's refined prompt
    4. Records analytics for learning loop
    5. Enqueues job for background processing
    6. Links generated asset to session when complete
    
    **Polling:**
    Use GET /api/v1/jobs/{job_id} to poll for completion.
    Once completed, the asset will appear in the session's assets.
    """,
    responses={
        200: {"description": "Generation job created"},
        401: {"description": "Authentication required"},
        403: {"description": "Studio subscription required"},
        404: {"description": "Session not found"},
        400: {"description": "Session has no refined prompt"},
    },
)
async def generate_from_session(
    request: Request,
    session_id: str,
    data: GenerateFromSessionRequest,
    current_user: TokenPayload = Depends(get_current_user),
    session_manager: SessionManagerDep = None,
    generation_service: GenerationServiceDep = None,
    usage_service: UsageLimitServiceDep = None,
    audit: AuditServiceDep = None,
    coach_analytics: CoachAnalyticsServiceDep = None,
) -> GenerateFromSessionResponse:
    """
    Generate an asset using the refined prompt from a coach session.
    
    This enables inline generation within the coach chat - the user
    doesn't need to leave the coach to generate their asset.
    
    Usage is counted here (not at session start) - users only lose
    a creation when they actually generate an image.
    
    Media assets can be injected either from:
    1. Session context (set at session start)
    2. Request body (overrides session defaults)
    """
    from backend.workers.generation_worker import enqueue_generation_job
    from backend.services.coach.analytics_service import SessionOutcome
    from backend.services.coach.validator import get_validator
    
    tier = current_user.tier or "free"
    
    # Check usage limits before generating - this is where usage is counted
    usage_info = await check_usage_eligibility(current_user.sub, tier, usage_service)
    
    if not usage_info["can_use_coach"]:
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
    
    try:
        session = await session_manager.get_or_raise(session_id, current_user.sub)
    except SessionNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.to_dict(),
        )
    except SessionExpiredError as e:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=e.to_dict(),
        )
    
    # Ensure session has a refined prompt
    if not session.current_prompt_draft:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "no_prompt",
                "message": "Session has no refined prompt. Continue the conversation first.",
            },
        )
    
    # Quality gate: Validate prompt quality and warn if low
    validator = get_validator()
    validation_result = validator.validate(
        session.current_prompt_draft,
        session.asset_type or "thumbnail",
    )
    quality_warning = None
    if validation_result.quality_score < 0.7:
        quality_warning = {
            "score": validation_result.quality_score,
            "message": "Your prompt may produce suboptimal results. Consider refining further.",
            "issues": [
                {"severity": i.severity.value, "message": i.message, "suggestion": i.suggestion}
                for i in validation_result.issues[:3]  # Top 3 issues
            ],
        }
    
    # Get brand kit ID from session context
    brand_kit_id = None
    if session.brand_context:
        brand_kit_id = session.brand_context.get("brand_kit_id")
    
    # Get media assets - request overrides session defaults
    media_asset_ids = data.media_asset_ids
    media_asset_placements = None
    
    # Get canvas snapshot - request overrides session defaults
    canvas_snapshot_url = data.canvas_snapshot_url
    canvas_snapshot_description = data.canvas_snapshot_description
    
    # If not provided in request, check session context
    if media_asset_ids is None and session.brand_context:
        media_asset_ids = session.brand_context.get("media_asset_ids")
        # Also get placements from session if using session assets
        if media_asset_ids:
            session_placements = session.brand_context.get("media_asset_placements")
            if session_placements:
                media_asset_placements = session_placements
    
    # Get canvas snapshot from session if not provided in request
    if canvas_snapshot_url is None and session.brand_context:
        canvas_snapshot_url = session.brand_context.get("canvas_snapshot_url")
        canvas_snapshot_description = session.brand_context.get("canvas_snapshot_description")
    
    # Use request placements if provided
    if data.media_asset_placements:
        media_asset_placements = [p.model_dump() for p in data.media_asset_placements]
    
    # Build parameters for generation
    parameters = {
        "coach_session_id": session_id,
        "include_logo": data.include_logo,
        "logo_type": data.logo_type,
        "logo_position": data.logo_position,
    }
    if brand_kit_id:
        parameters["brand_kit_id"] = brand_kit_id
    
    # Create generation job with media assets and canvas snapshot
    job = await generation_service.create_job(
        user_id=current_user.sub,
        brand_kit_id=brand_kit_id,
        asset_type=session.asset_type or "thumbnail",
        custom_prompt=session.current_prompt_draft,
        parameters=parameters,
        media_asset_ids=media_asset_ids,
        media_asset_placements=media_asset_placements,
        canvas_snapshot_url=canvas_snapshot_url,
        canvas_snapshot_description=canvas_snapshot_description,
    )
    
    # Increment usage counter NOW - when image generation is triggered
    await increment_coach_usage(current_user.sub, usage_service)
    
    # Record analytics for learning loop
    try:
        outcome = SessionOutcome(
            session_id=session_id,
            user_id=current_user.sub,
            asset_id=None,  # Will be updated when job completes
            generation_completed=True,
            turns_used=session.turns_used,
            grounding_used=session.grounding_calls > 0,
            refinements_count=len(session.prompt_history),
            quality_score=validation_result.quality_score,
            final_intent=session.current_prompt_draft,
            asset_type=session.asset_type or "thumbnail",
            mood=session.mood,
            game_context=session.game_context,
        )
        outcome_id = await coach_analytics.record_outcome(outcome)
        # Store outcome_id in job parameters for later viral score update
        parameters["analytics_outcome_id"] = outcome_id
    except Exception as e:
        # Analytics failure should not block generation
        import logging
        logging.getLogger(__name__).warning(f"Failed to record analytics: {e}")
    
    # Enqueue for background processing
    enqueue_generation_job(job.id, current_user.sub)
    
    # Audit log
    await audit.log(
        user_id=current_user.sub,
        action="coach.generate",
        resource_type="coach_session",
        resource_id=session_id,
        details={
            "job_id": job.id,
            "asset_type": session.asset_type,
            "include_logo": data.include_logo,
            "media_asset_count": len(media_asset_ids) if media_asset_ids else 0,
            "has_canvas_snapshot": canvas_snapshot_url is not None,
            "quality_score": validation_result.quality_score,
        },
        ip_address=request.client.host if request.client else None,
    )
    
    return GenerateFromSessionResponse(
        job_id=job.id,
        status="queued",
        message="Generation started",
        quality_warning=quality_warning,
    )


@router.post(
    "/sessions/{session_id}/refine",
    response_model=RefineImageResponse,
    summary="Refine generated image",
    description="""
    Refine the last generated image using multi-turn conversation.
    
    This uses Gemini's conversation context to make changes without
    re-uploading the image, making refinements ~60-80% cheaper.
    
    **Tier Access:**
    - Free: Cannot refine (must regenerate)
    - Pro: 5 free refinements/month, then counts as creation
    - Studio: Unlimited refinements
    
    **Requirements:**
    - Session must have at least one generated image
    - Session must be active (not ended/expired)
    
    **Returns:**
    - job_id: UUID for polling generation status
    - refinements_used: Total refinements this month
    - refinements_remaining: Free refinements left (-1 = unlimited)
    - counted_as_creation: Whether this used a creation credit
    """,
    responses={
        200: {"description": "Refinement job created"},
        401: {"description": "Authentication required"},
        403: {"description": "Refinement not available for tier or limit exceeded"},
        404: {"description": "Session not found"},
        400: {"description": "No image to refine"},
    },
)
async def refine_image(
    request: Request,
    session_id: str,
    data: RefineImageRequest,
    current_user: TokenPayload = Depends(get_current_user),
    session_manager: SessionManagerDep = None,
    generation_service: GenerationServiceDep = None,
    usage_service: UsageLimitServiceDep = None,
    audit: AuditServiceDep = None,
) -> RefineImageResponse:
    """
    Refine the last generated image using multi-turn conversation.
    
    Uses Gemini's conversation history to apply refinements without
    re-uploading the image, significantly reducing costs.
    """
    from backend.workers.generation_worker import enqueue_generation_job
    from backend.services.usage_limit_service import TIER_LIMITS
    
    tier = current_user.tier or "free"
    
    # Free tier cannot refine
    if tier == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "upgrade_required",
                "message": "Image refinement requires Pro or Studio subscription. Upgrade to refine your images!",
                "feature": "refinements",
            },
        )
    
    try:
        session = await session_manager.get_or_raise(session_id, current_user.sub)
    except SessionNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.to_dict(),
        )
    except SessionExpiredError as e:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=e.to_dict(),
        )
    
    # Check if session has a generated image to refine
    if not session.last_generated_asset_id and not session.gemini_history:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "no_image",
                "message": "No image to refine. Generate an image first.",
            },
        )
    
    # Check refinement limits
    refinement_check = await usage_service.check_limit(current_user.sub, "refinements")
    
    # Determine if this counts as a creation (Pro users after 5 free)
    counted_as_creation = False
    tier_limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
    refinement_limit = tier_limits.get("refinements", 0)
    
    if refinement_limit != -1 and not refinement_check.can_use:
        # Pro user exceeded free refinements - check if they have creations left
        creation_check = await usage_service.check_limit(current_user.sub, "creations")
        if not creation_check.can_use:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "limit_exceeded",
                    "message": f"You've used all {refinement_limit} free refinements and all {creation_check.limit} creations this month.",
                    "refinements_used": refinement_check.used,
                    "creations_used": creation_check.used,
                    "resets_at": refinement_check.resets_at.isoformat() if refinement_check.resets_at else None,
                },
            )
        counted_as_creation = True
    
    # Get brand kit ID from session context
    brand_kit_id = None
    if session.brand_context:
        brand_kit_id = session.brand_context.get("brand_kit_id")
    
    # Build parameters for refinement job
    parameters = {
        "coach_session_id": session_id,
        "is_refinement": True,
        "refinement_text": data.refinement,
        "conversation_history": session.gemini_history,
    }
    if brand_kit_id:
        parameters["brand_kit_id"] = brand_kit_id
    
    # Create generation job with refinement flag
    job = await generation_service.create_job(
        user_id=current_user.sub,
        brand_kit_id=brand_kit_id,
        asset_type=session.asset_type or "thumbnail",
        custom_prompt=data.refinement,  # The refinement text
        parameters=parameters,
    )
    
    # Increment appropriate usage counter
    if counted_as_creation:
        await usage_service.increment(current_user.sub, "creations")
    else:
        await usage_service.increment(current_user.sub, "refinements")
    
    # Update session refinement count
    session.refinements_used += 1
    await session_manager._save(session)
    
    # Enqueue for background processing
    enqueue_generation_job(job.id, current_user.sub)
    
    # Audit log
    await audit.log(
        user_id=current_user.sub,
        action="coach.refine",
        resource_type="coach_session",
        resource_id=session_id,
        details={
            "job_id": job.id,
            "refinement": data.refinement[:100],
            "counted_as_creation": counted_as_creation,
            "refinements_used": session.refinements_used,
        },
        ip_address=request.client.host if request.client else None,
    )
    
    # Calculate remaining refinements
    refinements_remaining = -1 if refinement_limit == -1 else max(0, refinement_limit - refinement_check.used - 1)
    
    return RefineImageResponse(
        job_id=job.id,
        status="queued",
        message="Refinement started",
        refinements_used=refinement_check.used + 1,
        refinements_remaining=refinements_remaining,
        counted_as_creation=counted_as_creation,
    )


@router.get(
    "/sessions/{session_id}/assets",
    response_model=SessionAssetsResponse,
    summary="Get session assets",
    description="""
    Get all assets generated from a coach session.
    
    **Premium only** - Requires Studio subscription.
    
    **Returns:**
    List of assets generated during this coaching session.
    """,
    responses={
        200: {"description": "Assets retrieved successfully"},
        401: {"description": "Authentication required"},
        403: {"description": "Studio subscription required"},
        404: {"description": "Session not found"},
    },
)
async def get_session_assets(
    session_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    session_manager: SessionManagerDep = None,
) -> SessionAssetsResponse:
    """Get all assets generated from a coach session."""
    tier = current_user.tier or "free"
    
    if not check_premium_access(tier):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "upgrade_required",
                "message": "Prompt Coach requires Pro or Studio subscription",
            },
        )
    
    try:
        # Verify session exists and user owns it
        await session_manager.get_or_raise(session_id, current_user.sub)
    except SessionNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.to_dict(),
        )
    
    # Get assets linked to this session
    from backend.database.supabase_client import get_supabase_client
    
    db = get_supabase_client()
    result = db.table("assets").select("*").eq("coach_session_id", session_id).order("created_at", desc=True).execute()
    
    assets = []
    for asset_data in (result.data or []):
        assets.append(SessionAssetResponse(
            id=asset_data["id"],
            url=asset_data["url"],
            asset_type=asset_data["asset_type"],
            width=asset_data["width"],
            height=asset_data["height"],
            created_at=asset_data["created_at"],
        ))
    
    return SessionAssetsResponse(assets=assets)


@router.get(
    "/sessions",
    response_model=SessionListResponse,
    summary="List coach sessions",
    description="""
    List all coach sessions for the current user.
    
    **Premium only** - Requires Studio subscription.
    
    **Returns:**
    List of session summaries with status, prompt, and asset info.
    """,
    responses={
        200: {"description": "Sessions retrieved successfully"},
        401: {"description": "Authentication required"},
        403: {"description": "Studio subscription required"},
    },
)
async def list_sessions(
    limit: int = Query(20, ge=1, le=100, description="Maximum sessions to return"),
    offset: int = Query(0, ge=0, description="Number of sessions to skip"),
    current_user: TokenPayload = Depends(get_current_user),
) -> SessionListResponse:
    """List all coach sessions for the current user."""
    tier = current_user.tier or "free"
    
    if not check_premium_access(tier):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "upgrade_required",
                "message": "Prompt Coach requires Pro or Studio subscription",
            },
        )
    
    from backend.database.supabase_client import get_supabase_client
    
    db = get_supabase_client()
    
    # Get sessions from PostgreSQL
    result = (
        db.table("coach_sessions")
        .select("*")
        .eq("user_id", current_user.sub)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    
    sessions = []
    for session_data in (result.data or []):
        # Check if session has assets
        asset_ids = session_data.get("generated_asset_ids") or []
        
        sessions.append(SessionSummary(
            id=session_data["id"],
            asset_type=session_data["asset_type"],
            mood=session_data.get("mood"),
            status=session_data["status"],
            turns_used=session_data.get("turns_used", 0),
            current_prompt=session_data.get("current_prompt"),
            has_assets=len(asset_ids) > 0,
            created_at=session_data["created_at"],
            ended_at=session_data.get("ended_at"),
        ))
    
    # Get total count
    count_result = (
        db.table("coach_sessions")
        .select("id", count="exact")
        .eq("user_id", current_user.sub)
        .execute()
    )
    total = count_result.count if hasattr(count_result, 'count') else len(sessions)
    
    return SessionListResponse(sessions=sessions, total=total)


__all__ = ["router"]
