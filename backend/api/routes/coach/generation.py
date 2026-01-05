"""
Coach generation endpoints.

POST /sessions/{id}/generate - Generate asset from session
POST /sessions/{id}/refine - Refine generated image
GET /sessions/{id}/assets - Get session's generated assets
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request

from backend.api.middleware.auth import get_current_user
from backend.api.schemas.coach import (
    GenerateFromSessionRequest,
    GenerateFromSessionResponse,
    RefineImageRequest,
    RefineImageResponse,
    SessionAssetsResponse,
    SessionAssetResponse,
)
from backend.api.service_dependencies import (
    SessionManagerDep,
    GenerationServiceDep,
    UsageLimitServiceDep,
    AuditServiceDep,
    CoachAnalyticsServiceDep,
)
from backend.services.jwt_service import TokenPayload
from backend.services.coach import SessionNotFoundError, SessionExpiredError
from backend.services.coach.intent import get_validator
from backend.services.coach.analytics import SessionOutcome

from ._helpers import has_coach_access, check_usage, raise_if_limit_exceeded, raise_upgrade_required

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/sessions/{session_id}/generate", response_model=GenerateFromSessionResponse, summary="Generate from session")
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
    """Generate an asset using the refined prompt from a coach session."""
    from backend.workers.generation_worker import enqueue_generation_job
    
    tier = current_user.tier or "free"
    
    # Check usage limits
    usage_info = await check_usage(current_user.sub, tier, usage_service)
    raise_if_limit_exceeded(usage_info)
    
    # Get session
    try:
        session = await session_manager.get_or_raise(session_id, current_user.sub)
    except SessionNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())
    except SessionExpiredError as e:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail=e.to_dict())
    
    # Ensure session has a refined prompt
    if not session.current_prompt_draft:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "no_prompt", "message": "Session has no refined prompt. Continue the conversation first."},
        )
    
    # Validate prompt quality
    validator = get_validator()
    validation_result = validator.validate(session.current_prompt_draft, session.asset_type or "thumbnail")
    
    quality_warning = None
    if validation_result.quality_score < 0.7:
        quality_warning = {
            "score": validation_result.quality_score,
            "message": "Your prompt may produce suboptimal results. Consider refining further.",
            "issues": [{"severity": i.severity, "message": i.message, "suggestion": i.suggestion} for i in validation_result.issues[:3]],
        }
    
    # Get brand kit and media assets from session/request
    brand_kit_id = session.brand_context.get("brand_kit_id") if session.brand_context else None
    
    media_asset_ids = data.media_asset_ids
    media_asset_placements = None
    canvas_snapshot_url = data.canvas_snapshot_url
    canvas_snapshot_description = data.canvas_snapshot_description
    
    # Fall back to session context if not in request
    if session.brand_context:
        if media_asset_ids is None:
            media_asset_ids = session.brand_context.get("media_asset_ids")
            if media_asset_ids:
                media_asset_placements = session.brand_context.get("media_asset_placements")
        if canvas_snapshot_url is None:
            canvas_snapshot_url = session.brand_context.get("canvas_snapshot_url")
            canvas_snapshot_description = session.brand_context.get("canvas_snapshot_description")
    
    if data.media_asset_placements:
        media_asset_placements = [p.model_dump() for p in data.media_asset_placements]
    
    # Check for canvas schema and use its structured prompt if available
    # This provides token-conscious, structured instructions to Nano Banana
    nano_banana_prompt = None
    if hasattr(session, 'canvas_schema') and session.canvas_schema:
        from backend.services.coach.intent import CanvasIntentSchema
        try:
            canvas_schema = CanvasIntentSchema.from_dict(session.canvas_schema)
            if canvas_schema.is_ready():
                # Use the structured prompt from canvas classification
                nano_banana_prompt = canvas_schema.to_nano_banana_prompt()
                logger.info(f"Using canvas schema prompt for session {session_id}")
                
                # Also get snapshot URL from canvas schema if not provided
                if not canvas_snapshot_url and canvas_schema.snapshot_url:
                    canvas_snapshot_url = canvas_schema.snapshot_url
            else:
                # Canvas has unresolved ambiguous elements
                ambiguous_count = len(canvas_schema.get_ambiguous_elements())
                logger.warning(
                    f"Canvas schema not ready for session {session_id}: "
                    f"{ambiguous_count} ambiguous elements"
                )
        except Exception as e:
            logger.warning(f"Failed to load canvas schema: {e}")
    
    # Build parameters
    parameters = {
        "coach_session_id": session_id,
        "include_logo": data.include_logo,
        "logo_type": data.logo_type,
        "logo_position": data.logo_position,
    }
    if brand_kit_id:
        parameters["brand_kit_id"] = brand_kit_id
    if hasattr(session, 'reference_assets') and session.reference_assets:
        parameters["reference_assets"] = session.reference_assets
    
    # Pass game context for auto-reference image fetching
    # This helps NanoBanana find the right skins/locations
    if session.game_context:
        # Extract game name from game_context (e.g., "Game: Fortnite\n...")
        game_context = session.game_context
        if game_context.startswith("Game: "):
            game_name = game_context.split("\n")[0].replace("Game: ", "").strip()
            parameters["game_name"] = game_name
        parameters["game_context"] = game_context
    
    # Pass nano_banana_prompt if available (structured canvas prompt)
    if nano_banana_prompt:
        parameters["nano_banana_prompt"] = nano_banana_prompt
    
    # Determine the prompt to use:
    # 1. If canvas schema provided structured prompt, use it as canvas_snapshot_description
    # 2. Otherwise use session.current_prompt_draft
    # The worker will combine canvas_snapshot_description with the snapshot image
    final_canvas_description = nano_banana_prompt if nano_banana_prompt else canvas_snapshot_description
    
    # Create generation job
    job = await generation_service.create_job(
        user_id=current_user.sub,
        brand_kit_id=brand_kit_id,
        asset_type=session.asset_type or "thumbnail",
        custom_prompt=session.current_prompt_draft,
        parameters=parameters,
        media_asset_ids=media_asset_ids,
        media_asset_placements=media_asset_placements,
        canvas_snapshot_url=canvas_snapshot_url,
        canvas_snapshot_description=final_canvas_description,
    )
    
    # Increment usage
    await usage_service.increment(current_user.sub, "coach")
    
    # Record analytics
    try:
        outcome = SessionOutcome(
            session_id=session_id,
            user_id=current_user.sub,
            asset_id=None,
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
        await coach_analytics.record_outcome(outcome)
    except Exception as e:
        logger.warning(f"Failed to record analytics: {e}")
    
    # Enqueue job
    enqueue_generation_job(job.id, current_user.sub)
    
    # Audit
    await audit.log(
        user_id=current_user.sub,
        action="coach.generate",
        resource_type="coach_session",
        resource_id=session_id,
        details={"job_id": job.id, "asset_type": session.asset_type, "quality_score": validation_result.quality_score},
        ip_address=request.client.host if request.client else None,
    )
    
    return GenerateFromSessionResponse(job_id=job.id, status="queued", message="Generation started", quality_warning=quality_warning)


@router.post("/sessions/{session_id}/refine", response_model=RefineImageResponse, summary="Refine generated image")
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
    """Refine the last generated image using multi-turn conversation."""
    from backend.workers.generation_worker import enqueue_generation_job
    from backend.services.usage_limit_service import TIER_LIMITS
    
    tier = current_user.tier or "free"
    
    # Free tier cannot refine
    if tier == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "upgrade_required", "message": "Image refinement requires Pro or Studio subscription.", "feature": "refinements"},
        )
    
    # Get session
    try:
        session = await session_manager.get_or_raise(session_id, current_user.sub)
    except SessionNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())
    except SessionExpiredError as e:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail=e.to_dict())
    
    # Check if session has an image to refine
    if not session.last_generated_asset_id and not session.gemini_history:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "no_image", "message": "No image to refine. Generate an image first."},
        )
    
    # Check refinement limits
    refinement_check = await usage_service.check_limit(current_user.sub, "refinements")
    tier_limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
    refinement_limit = tier_limits.get("refinements", 0)
    
    counted_as_creation = False
    if refinement_limit != -1 and not refinement_check.can_use:
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
    
    # Build parameters
    brand_kit_id = session.brand_context.get("brand_kit_id") if session.brand_context else None
    parameters = {
        "coach_session_id": session_id,
        "is_refinement": True,
        "refinement_text": data.refinement,
        "conversation_history": session.gemini_history,
    }
    if brand_kit_id:
        parameters["brand_kit_id"] = brand_kit_id
    
    # Create job
    job = await generation_service.create_job(
        user_id=current_user.sub,
        brand_kit_id=brand_kit_id,
        asset_type=session.asset_type or "thumbnail",
        custom_prompt=data.refinement,
        parameters=parameters,
    )
    
    # Increment usage
    if counted_as_creation:
        await usage_service.increment(current_user.sub, "creations")
    else:
        await usage_service.increment(current_user.sub, "refinements")
    
    # Update session
    session.refinements_used += 1
    await session_manager._save(session)
    
    # Enqueue
    enqueue_generation_job(job.id, current_user.sub)
    
    # Audit
    await audit.log(
        user_id=current_user.sub,
        action="coach.refine",
        resource_type="coach_session",
        resource_id=session_id,
        details={"job_id": job.id, "refinement": data.refinement[:100], "counted_as_creation": counted_as_creation},
        ip_address=request.client.host if request.client else None,
    )
    
    refinements_remaining = -1 if refinement_limit == -1 else max(0, refinement_limit - refinement_check.used - 1)
    
    return RefineImageResponse(
        job_id=job.id,
        status="queued",
        message="Refinement started",
        refinements_used=refinement_check.used + 1,
        refinements_remaining=refinements_remaining,
        counted_as_creation=counted_as_creation,
    )


@router.get("/sessions/{session_id}/assets", response_model=SessionAssetsResponse, summary="Get session assets")
async def get_session_assets(
    session_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    session_manager: SessionManagerDep = None,
) -> SessionAssetsResponse:
    """Get all assets generated from a coach session."""
    tier = current_user.tier or "free"
    if not has_coach_access(tier):
        raise_upgrade_required()
    
    # Verify session ownership
    try:
        await session_manager.get_or_raise(session_id, current_user.sub)
    except SessionNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())
    
    from backend.database.supabase_client import get_supabase_client
    db = get_supabase_client()
    
    result = db.table("assets").select("*").eq("coach_session_id", session_id).order("created_at", desc=True).execute()
    
    assets = [
        SessionAssetResponse(
            id=a["id"],
            url=a["url"],
            asset_type=a["asset_type"],
            width=a["width"],
            height=a["height"],
            created_at=a["created_at"],
        )
        for a in (result.data or [])
    ]
    
    return SessionAssetsResponse(assets=assets)


__all__ = ["router"]
