"""
Coach session management endpoints.

POST /start - Start new session (SSE)
POST /sessions/{id}/messages - Continue chat (SSE)
GET /sessions/{id} - Get session state
POST /sessions/{id}/end - End session
GET /sessions - List user's sessions
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import StreamingResponse

from backend.api.middleware.auth import get_current_user
from backend.api.schemas.coach import (
    StartCoachRequest,
    ContinueChatRequest,
    SessionStateResponse,
    EndSessionResponse,
    SessionListResponse,
    SessionSummary,
)
from backend.api.service_dependencies import (
    CoachServiceDep,
    SessionManagerDep,
    AuditServiceDep,
    UsageLimitServiceDep,
)
from backend.services.jwt_service import TokenPayload
from backend.services.rate_limit import check_coach_message_rate_limit, check_coach_session_rate_limit
from backend.services.coach import SessionNotFoundError, SessionExpiredError
from backend.services.sse import StreamType

from ._helpers import (
    has_coach_access,
    check_usage,
    raise_if_limit_exceeded,
    raise_upgrade_required,
    create_sse_stream,
)


router = APIRouter()


@router.post("/start", summary="Start coach session")
async def start_coach_session(
    request: Request,
    data: StartCoachRequest,
    current_user: TokenPayload = Depends(get_current_user),
    coach_service: CoachServiceDep = None,
    audit: AuditServiceDep = None,
    usage_service: UsageLimitServiceDep = None,
) -> StreamingResponse:
    """Start a new coach session. Returns SSE stream."""
    tier = current_user.tier or "free"
    
    # Check usage limits
    usage_info = await check_usage(current_user.sub, tier, usage_service)
    raise_if_limit_exceeded(usage_info)
    
    # Check rate limit
    await check_coach_session_rate_limit(current_user.sub, tier)
    
    # Build brand context
    brand_context_data = data.brand_context.model_dump() if data.brand_context else {
        "brand_kit_id": None, "colors": [], "tone": "professional", "fonts": None, "logo_url": None,
    }
    
    # Serialize media asset placements for the service
    media_placements_data = None
    if data.media_asset_placements:
        media_placements_data = [p.model_dump() for p in data.media_asset_placements]
    
    preferences_data = data.preferences.model_dump() if data.preferences else None
    
    # Create chunk generator
    async def generate_chunks():
        async for chunk in coach_service.start_with_context(
            user_id=current_user.sub,
            brand_context=brand_context_data,
            asset_type=data.asset_type,
            mood=data.mood,
            description=data.description,
            custom_mood=data.custom_mood,
            game_id=data.game_id,
            game_name=data.game_name,
            tier="pro" if tier in ("free", "pro") else tier,
            preferences=preferences_data,
            media_asset_placements=media_placements_data,
            canvas_snapshot_url=data.canvas_snapshot_url,
            canvas_snapshot_description=data.canvas_snapshot_description,
            canvas_context=data.canvas_context,  # NEW: Compact canvas context for classification
        ):
            yield chunk
    
    # Audit log
    await audit.log(
        user_id=current_user.sub,
        action="coach.start",
        resource_type="coach_session",
        resource_id="new",
        details={"asset_type": data.asset_type, "mood": data.mood, "is_free_tier": usage_info["is_free_tier"]},
        ip_address=request.client.host if request.client else None,
    )
    
    return await create_sse_stream(
        stream_type=StreamType.COACH_START,
        user_id=current_user.sub,
        chunk_generator=generate_chunks(),
        metadata={"asset_type": data.asset_type, "mood": data.mood},
    )


@router.post("/sessions/{session_id}/messages", summary="Continue coach chat")
async def continue_coach_chat(
    session_id: str,
    data: ContinueChatRequest,
    current_user: TokenPayload = Depends(get_current_user),
    session_manager: SessionManagerDep = None,
    coach_service: CoachServiceDep = None,
) -> StreamingResponse:
    """Continue an existing coach session. Returns SSE stream."""
    # Verify session ownership
    try:
        await session_manager.get_or_raise(session_id, current_user.sub)
    except SessionNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": "session_not_found", "message": "Session not found"})
    
    # Check rate limit
    tier = current_user.tier or "free"
    await check_coach_message_rate_limit(current_user.sub, tier)
    
    # Serialize reference assets
    reference_assets_data = None
    if data.reference_assets:
        reference_assets_data = [
            {"asset_id": ref.asset_id, "display_name": ref.display_name, "asset_type": ref.asset_type, "url": ref.url, "description": ref.description}
            for ref in data.reference_assets
        ]
    
    async def generate_chunks():
        async for chunk in coach_service.continue_chat(
            session_id=session_id,
            user_id=current_user.sub,
            message=data.message,
            reference_assets=reference_assets_data,
        ):
            yield chunk
    
    return await create_sse_stream(
        stream_type=StreamType.COACH_CONTINUE,
        user_id=current_user.sub,
        chunk_generator=generate_chunks(),
        metadata={"session_id": session_id, "has_reference_assets": bool(reference_assets_data)},
    )


@router.get("/sessions/{session_id}", response_model=SessionStateResponse, summary="Get session state")
async def get_session_state(
    session_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    session_manager: SessionManagerDep = None,
) -> SessionStateResponse:
    """Get the current state of a coach session."""
    tier = current_user.tier or "free"
    if not has_coach_access(tier):
        raise_upgrade_required()
    
    try:
        session = await session_manager.get_or_raise(session_id, current_user.sub)
    except SessionNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())
    except SessionExpiredError as e:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail=e.to_dict())
    
    limits = await session_manager.check_limits(session)
    
    return SessionStateResponse(
        session_id=session.session_id,
        status=session.status,
        turns_used=session.turns_used,
        turns_remaining=limits["turns_remaining"],
        current_prompt=session.current_prompt_draft,
        prompt_versions=len(session.prompt_history),
    )


@router.post("/sessions/{session_id}/end", response_model=EndSessionResponse, summary="End coach session")
async def end_coach_session(
    request: Request,
    session_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    coach_service: CoachServiceDep = None,
    audit: AuditServiceDep = None,
) -> EndSessionResponse:
    """End a coach session and get the final prompt."""
    tier = current_user.tier or "free"
    if not has_coach_access(tier):
        raise_upgrade_required()
    
    try:
        output = await coach_service.end_session(session_id, current_user.sub)
    except SessionNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())
    
    await audit.log(
        user_id=current_user.sub,
        action="coach.end",
        resource_type="coach_session",
        resource_id=session_id,
        details={"prompt_versions": output.get("prompt_versions", 0)},
        ip_address=request.client.host if request.client else None,
    )
    
    return EndSessionResponse(
        session_id=session_id,
        final_prompt=output.get("final_prompt", ""),
        confidence_score=output.get("confidence_score", 0.5),
        keywords=output.get("keywords", []),
        metadata=output,
    )


@router.get("/sessions", response_model=SessionListResponse, summary="List coach sessions")
async def list_sessions(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: TokenPayload = Depends(get_current_user),
) -> SessionListResponse:
    """List all coach sessions for the current user."""
    tier = current_user.tier or "free"
    if not has_coach_access(tier):
        raise_upgrade_required()
    
    from backend.database.supabase_client import get_supabase_client
    db = get_supabase_client()
    
    result = (
        db.table("coach_sessions")
        .select("*")
        .eq("user_id", current_user.sub)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    
    sessions = [
        SessionSummary(
            id=s["id"],
            asset_type=s["asset_type"],
            mood=s.get("mood"),
            status=s["status"],
            turns_used=s.get("turns_used", 0),
            current_prompt=s.get("current_prompt"),
            has_assets=len(s.get("generated_asset_ids") or []) > 0,
            created_at=s["created_at"],
            ended_at=s.get("ended_at"),
        )
        for s in (result.data or [])
    ]
    
    count_result = db.table("coach_sessions").select("id", count="exact").eq("user_id", current_user.sub).execute()
    total = count_result.count if hasattr(count_result, 'count') else len(sessions)
    
    return SessionListResponse(sessions=sessions, total=total)


__all__ = ["router"]
