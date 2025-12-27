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
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import StreamingResponse

from backend.api.middleware.auth import get_current_user
from backend.api.middleware.rate_limit import (
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
    SessionAssetsResponse,
    SessionAssetResponse,
    SessionListResponse,
    SessionSummary,
)
from backend.services.jwt_service import TokenPayload
from backend.services.audit_service import get_audit_service
from backend.services.coach import (
    get_coach_service,
    get_tips_service,
    get_session_manager,
    SessionNotFoundError,
    SessionExpiredError,
)


router = APIRouter()


# =============================================================================
# Tier Access Configuration
# =============================================================================

TIER_ACCESS = {
    "free": {"coach_access": False, "feature": "tips_only", "grounding": False, "trial_eligible": True},
    "pro": {"coach_access": True, "feature": "full_coach", "grounding": False, "trial_eligible": False},
    "studio": {"coach_access": True, "feature": "full_coach", "grounding": True, "trial_eligible": False},
}


def check_premium_access(tier: str) -> bool:
    """
    Check if user has premium access for full coach.
    
    Args:
        tier: User's subscription tier
        
    Returns:
        bool: True if user has premium access, False otherwise
    """
    return TIER_ACCESS.get(tier, TIER_ACCESS["free"])["coach_access"]


async def check_trial_eligibility(user_id: str, tier: str) -> dict:
    """
    Check if user is eligible for a free coach trial.
    
    Free and Pro users get 1 trial session to experience the coach.
    
    Args:
        user_id: User's ID
        tier: User's subscription tier
        
    Returns:
        dict with trial_eligible, trial_used, and can_use_coach
    """
    from backend.database.supabase_client import get_supabase_client
    
    # Studio users have full access, no trial needed
    if check_premium_access(tier):
        return {"trial_eligible": False, "trial_used": False, "can_use_coach": True}
    
    # Check if user has used their trial
    db = get_supabase_client()
    result = db.table("users").select("coach_trial_used").eq("id", user_id).single().execute()
    
    trial_used = result.data.get("coach_trial_used", False) if result.data else False
    
    return {
        "trial_eligible": True,
        "trial_used": trial_used,
        "can_use_coach": not trial_used,
    }


async def mark_trial_used(user_id: str) -> None:
    """Mark user's coach trial as used."""
    from backend.database.supabase_client import get_supabase_client
    
    db = get_supabase_client()
    db.table("users").update({"coach_trial_used": True}).eq("id", user_id).execute()


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
) -> TipsResponse:
    """
    Get static prompt tips for an asset type.
    
    Retrieves curated tips for crafting effective prompts based on
    the selected asset type. Available to all subscription tiers.
    
    Args:
        asset_type: Type of asset to get tips for
        current_user: Authenticated user's token payload
        
    Returns:
        TipsResponse: List of tips with upgrade CTA
    """
    tips_service = get_tips_service()
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
    - trial_available: Whether user can use their free trial (free/pro only)
    - trial_used: Whether user has already used their trial
    
    **Tier Access:**
    - Free/Pro: Tips only + 1 free trial session, no grounding
    - Studio: Full coach with grounding
    """,
    responses={
        200: {"description": "Access level retrieved successfully"},
        401: {"description": "Authentication required"},
    },
)
async def check_access(
    current_user: TokenPayload = Depends(get_current_user),
) -> CoachAccessResponse:
    """
    Check what coach features the user can access.
    
    Returns the user's access level based on their subscription tier,
    including whether they have full coach access and grounding capabilities.
    Also includes rate limit status for premium users and trial info for free/pro.
    
    Args:
        current_user: Authenticated user's token payload
        
    Returns:
        CoachAccessResponse: Access level information
    """
    tier = current_user.tier or "free"
    access = TIER_ACCESS.get(tier, TIER_ACCESS["free"])
    
    # Check trial eligibility for non-premium users
    trial_info = await check_trial_eligibility(current_user.sub, tier)
    
    # Get rate limit status for users who can use coach (premium or trial)
    rate_limits = None
    if access["coach_access"] or trial_info["can_use_coach"]:
        rate_limits = get_coach_rate_limit_status(current_user.sub)
    
    # Determine effective access
    has_access = access["coach_access"] or trial_info["can_use_coach"]
    
    # Build upgrade message
    upgrade_message = None
    if not access["coach_access"]:
        if trial_info["trial_used"]:
            upgrade_message = (
                "You've used your free trial! Upgrade to Studio to continue "
                "using Prompt Coach with unlimited sessions and game context."
            )
        else:
            upgrade_message = (
                "Try Prompt Coach free! You have 1 trial session to experience "
                "AI-powered prompt refinement. Upgrade to Studio for unlimited access."
            )
    
    return CoachAccessResponse(
        has_access=has_access,
        feature="full_coach" if has_access else "tips_only",
        grounding=access["grounding"],
        upgrade_message=upgrade_message,
        rate_limits=rate_limits,
        trial_available=trial_info["trial_eligible"] and not trial_info["trial_used"],
        trial_used=trial_info["trial_used"],
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
):
    """
    Start a new coach session with pre-loaded context.
    
    Creates a new coaching session with all context pre-loaded from the client.
    Returns a Server-Sent Events stream with the coach's initial response,
    including prompt suggestions and validation results.
    
    Free/Pro users can use their 1 free trial session here.
    
    Args:
        request: FastAPI request object for audit logging
        data: StartCoachRequest with brand context and user input
        current_user: Authenticated user's token payload
        
    Returns:
        StreamingResponse: SSE stream with coach response
        
    Raises:
        HTTPException: 403 if user doesn't have access (no subscription, trial used)
        HTTPException: 429 if rate limit exceeded
    """
    tier = current_user.tier or "free"
    
    # Check if user can use coach (premium or trial)
    trial_info = await check_trial_eligibility(current_user.sub, tier)
    
    if not check_premium_access(tier) and not trial_info["can_use_coach"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "upgrade_required",
                "message": "You've used your free trial! Upgrade to Studio for unlimited Prompt Coach access.",
                "feature": "full_coach",
                "trial_used": True,
            },
        )
    
    # Check rate limit for session creation
    await check_coach_session_rate_limit(current_user.sub)
    
    # Mark trial as used for non-premium users (before starting session)
    is_trial_session = not check_premium_access(tier) and trial_info["can_use_coach"]
    if is_trial_session:
        await mark_trial_used(current_user.sub)
    
    coach_service = get_coach_service()
    
    # Handle optional brand_context - use empty context if not provided
    brand_context_data = data.brand_context.model_dump() if data.brand_context else {
        "brand_kit_id": None,
        "colors": [],
        "tone": "professional",
        "fonts": None,
        "logo_url": None,
    }
    
    async def event_generator():
        """Generate SSE events from coach service."""
        try:
            # Send trial info at start for UI feedback
            if is_trial_session:
                trial_event = json.dumps({
                    "type": "trial_started",
                    "content": "This is your free trial session! Experience the full power of Prompt Coach.",
                    "metadata": {"is_trial": True},
                })
                yield f"data: {trial_event}\n\n"
            
            async for chunk in coach_service.start_with_context(
                user_id=current_user.sub,
                brand_context=brand_context_data,
                asset_type=data.asset_type,
                mood=data.mood,
                description=data.description,
                custom_mood=data.custom_mood,
                game_id=data.game_id,
                game_name=data.game_name,
                tier="studio",  # Grant full access for trial sessions
            ):
                event_data = json.dumps({
                    "type": chunk.type,
                    "content": chunk.content,
                    "metadata": chunk.metadata,
                })
                yield f"data: {event_data}\n\n"
        except Exception as e:
            error_data = json.dumps({
                "type": "error",
                "content": str(e),
                "metadata": None,
            })
            yield f"data: {error_data}\n\n"
    
    # Audit log the session start
    audit = get_audit_service()
    await audit.log(
        user_id=current_user.sub,
        action="coach.start",
        resource_type="coach_session",
        resource_id="new",
        details={
            "asset_type": data.asset_type,
            "mood": data.mood,
            "is_trial": is_trial_session,
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
        },
    )


@router.post(
    "/sessions/{session_id}/messages",
    summary="Continue coach chat",
    description="""
    Send a message to continue the coach conversation.
    
    **Premium or Active Trial** - Requires Studio subscription or active trial session.
    
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
):
    """
    Continue an existing coach session with a new message.
    
    Sends a refinement message to the coach and streams the response.
    The coach will modify the previous prompt suggestion based on
    the user's feedback.
    
    Trial users can continue their trial session until it ends.
    
    Args:
        session_id: UUID of the session to continue
        data: ContinueChatRequest with user's message
        current_user: Authenticated user's token payload
        
    Returns:
        StreamingResponse: SSE stream with coach response
        
    Raises:
        HTTPException: 403 if user doesn't have access
        HTTPException: 429 if rate limit exceeded
    """
    tier = current_user.tier or "free"
    
    # For continue, we need to verify the user owns this session
    # Trial users can continue their own session even after trial_used is True
    session_manager = get_session_manager()
    
    try:
        # This verifies ownership
        session = await session_manager.get_or_raise(session_id, current_user.sub)
    except SessionNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "session_not_found", "message": "Session not found"},
        )
    
    # Premium users always have access, non-premium can continue their own sessions
    if not check_premium_access(tier):
        # Session ownership already verified above, so they can continue
        pass
    
    # Check rate limit for messages
    await check_coach_message_rate_limit(current_user.sub)
    
    coach_service = get_coach_service()
    
    async def event_generator():
        """Generate SSE events from coach service."""
        try:
            async for chunk in coach_service.continue_chat(
                session_id=session_id,
                user_id=current_user.sub,
                message=data.message,
            ):
                event_data = json.dumps({
                    "type": chunk.type,
                    "content": chunk.content,
                    "metadata": chunk.metadata,
                })
                yield f"data: {event_data}\n\n"
        except SessionNotFoundError as e:
            error_data = json.dumps({
                "type": "error",
                "content": "Session not found or expired",
                "metadata": e.to_dict(),
            })
            yield f"data: {error_data}\n\n"
        except Exception as e:
            error_data = json.dumps({
                "type": "error",
                "content": str(e),
                "metadata": None,
            })
            yield f"data: {error_data}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
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
) -> SessionStateResponse:
    """
    Get the current state of a coach session.
    
    Retrieves the session's current status, turns used/remaining,
    and the current prompt draft.
    
    Args:
        session_id: UUID of the session
        current_user: Authenticated user's token payload
        
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
                "message": "Prompt Coach requires Studio subscription",
            },
        )
    
    session_manager = get_session_manager()
    
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
) -> EndSessionResponse:
    """
    End a coach session and get the final prompt.
    
    Marks the session as ended and returns the final prompt
    along with quality metrics and extracted keywords.
    
    Args:
        request: FastAPI request object for audit logging
        session_id: UUID of the session to end
        current_user: Authenticated user's token payload
        
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
                "message": "Prompt Coach requires Studio subscription",
            },
        )
    
    coach_service = get_coach_service()
    
    try:
        output = await coach_service.end_session(session_id, current_user.sub)
    except SessionNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.to_dict(),
        )
    
    # Audit log the session end
    audit = get_audit_service()
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
    
    **Flow:**
    1. Validates session ownership and status
    2. Creates generation job with session's refined prompt
    3. Enqueues job for background processing
    4. Links generated asset to session when complete
    
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
) -> GenerateFromSessionResponse:
    """
    Generate an asset using the refined prompt from a coach session.
    
    This enables inline generation within the coach chat - the user
    doesn't need to leave the coach to generate their asset.
    """
    from backend.services.generation_service import get_generation_service
    from backend.workers.generation_worker import enqueue_generation_job
    
    tier = current_user.tier or "free"
    
    if not check_premium_access(tier):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "upgrade_required",
                "message": "Prompt Coach requires Studio subscription",
            },
        )
    
    session_manager = get_session_manager()
    
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
    
    # Get brand kit ID from session context
    brand_kit_id = None
    if session.brand_context:
        brand_kit_id = session.brand_context.get("brand_kit_id")
    
    # Build parameters for generation
    parameters = {
        "coach_session_id": session_id,
        "include_logo": data.include_logo,
        "logo_type": data.logo_type,
        "logo_position": data.logo_position,
    }
    if brand_kit_id:
        parameters["brand_kit_id"] = brand_kit_id
    
    # Create generation job
    generation_service = get_generation_service()
    job = await generation_service.create_job(
        user_id=current_user.sub,
        brand_kit_id=brand_kit_id,
        asset_type=session.asset_type or "thumbnail",
        custom_prompt=session.current_prompt_draft,
        parameters=parameters,
    )
    
    # Enqueue for background processing
    enqueue_generation_job(job.id, current_user.sub)
    
    # Audit log
    audit = get_audit_service()
    await audit.log(
        user_id=current_user.sub,
        action="coach.generate",
        resource_type="coach_session",
        resource_id=session_id,
        details={
            "job_id": job.id,
            "asset_type": session.asset_type,
            "include_logo": data.include_logo,
        },
        ip_address=request.client.host if request.client else None,
    )
    
    return GenerateFromSessionResponse(
        job_id=job.id,
        status="queued",
        message="Generation started",
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
) -> SessionAssetsResponse:
    """Get all assets generated from a coach session."""
    tier = current_user.tier or "free"
    
    if not check_premium_access(tier):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "upgrade_required",
                "message": "Prompt Coach requires Studio subscription",
            },
        )
    
    session_manager = get_session_manager()
    
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
                "message": "Prompt Coach requires Studio subscription",
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
