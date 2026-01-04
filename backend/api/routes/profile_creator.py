"""
Profile Creator Route Handlers for AuraStream.

Endpoints for the dedicated Profile Picture & Logo Creator feature:
- GET /profile-creator/access - Check access and remaining quota
- POST /profile-creator/start - Start creation session (SSE)
- POST /profile-creator/sessions/{id}/messages - Continue chat (SSE)
- GET /profile-creator/sessions/{id} - Get session state
- POST /profile-creator/sessions/{id}/generate - Generate from session
- GET /profile-creator/gallery - Get user's profile pics/logos

Rate Limits:
- Free: 1/month
- Pro: 5/month
- Studio: 10/month
"""

import json
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import StreamingResponse

from backend.api.middleware.auth import get_current_user
from backend.api.schemas.profile_creator import (
    StartProfileCreatorRequest,
    ContinueSessionRequest,
    GenerateFromSessionRequest,
    ProfileCreatorAccessResponse,
    SessionStateResponse,
    GenerationResultResponse,
    GalleryResponse,
    GalleryItemResponse,
)
from backend.services.jwt_service import TokenPayload
from backend.api.service_dependencies import (
    ProfileCreatorServiceDep,
    UsageLimitServiceDep,
    AuditServiceDep,
    GenerationServiceDep,
    get_usage_limit_service_dep,
    get_audit_service_dep,
    get_profile_creator_service_dep,
)


router = APIRouter()


# =============================================================================
# Helper Functions
# =============================================================================

async def check_profile_creator_access(user_id: str) -> dict:
    """Check if user can use profile creator."""
    service = get_usage_limit_service_dep()
    check = await service.check_limit(user_id, "profile_creator")
    
    return {
        "can_use": check.can_use,
        "used": check.used,
        "limit": check.limit,
        "remaining": check.remaining,
        "tier": check.tier,
        "resets_at": check.resets_at.isoformat() if check.resets_at else None,
    }


async def increment_profile_creator_usage(user_id: str) -> None:
    """Increment profile creator usage counter."""
    service = get_usage_limit_service_dep()
    await service.increment(user_id, "profile_creator")


# =============================================================================
# Access Check Endpoint
# =============================================================================

@router.get(
    "/access",
    response_model=ProfileCreatorAccessResponse,
    summary="Check profile creator access",
    description="""
    Check if user can use the Profile Creator and their remaining quota.
    
    **Limits:**
    - Free: 1 creation/month
    - Pro: 5 creations/month
    - Studio: 10 creations/month
    """,
)
async def check_access(
    current_user: TokenPayload = Depends(get_current_user),
) -> ProfileCreatorAccessResponse:
    """Check profile creator access and quota."""
    access = await check_profile_creator_access(current_user.sub)
    return ProfileCreatorAccessResponse(**access)


# =============================================================================
# Session Start Endpoint (SSE)
# =============================================================================

@router.post(
    "/start",
    summary="Start profile creator session",
    description="""
    Start a new profile creator session with SSE streaming.
    
    **Creation Types:**
    - `profile_picture`: Square avatar/profile picture
    - `streamer_logo`: Brand logo/icon
    
    **Style Presets:**
    - `gaming`: Bold, dynamic gaming aesthetic
    - `minimal`: Clean, simple, modern
    - `vibrant`: Colorful, energetic
    - `anime`: Anime/manga inspired
    - `retro`: Pixel art, 8-bit style
    - `professional`: Clean, corporate look
    - `custom`: User-defined
    
    **SSE Events:**
    - `token`: Streaming text token
    - `intent_ready`: Description is ready for generation
    - `done`: Session started successfully
    - `error`: Error occurred
    """,
    responses={
        200: {"description": "SSE stream of coach responses"},
        403: {"description": "Usage limit exceeded"},
    },
)
async def start_session(
    request: Request,
    data: StartProfileCreatorRequest,
    current_user: TokenPayload = Depends(get_current_user),
    service: ProfileCreatorServiceDep = None,
    audit_service: AuditServiceDep = None,
):
    """Start a profile creator session with SSE streaming."""
    # Check usage limit
    access = await check_profile_creator_access(current_user.sub)
    if not access["can_use"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "limit_exceeded",
                "message": f"You've used all {access['limit']} profile creations this month",
                "used": access["used"],
                "limit": access["limit"],
                "resets_at": access["resets_at"],
            }
        )
    
    # Increment usage (charge upfront when session starts)
    await increment_profile_creator_usage(current_user.sub)
    
    # Audit log
    await audit_service.log(
        user_id=current_user.sub,
        action="profile_creator.session_start",
        resource_type="profile_creator_session",
        resource_id="new",
        details={
            "creation_type": data.creation_type,
            "style_preset": data.style_preset,
            "has_brand_context": data.brand_context is not None,
        },
        ip_address=request.client.host if request.client else None,
    )
    
    # Convert brand context to dict
    brand_context = None
    if data.brand_context:
        brand_context = data.brand_context.model_dump()
    
    # Generate stream ID for tracking
    stream_id = f"profile:start:{uuid.uuid4().hex[:8]}"
    
    # Import SSE services
    from backend.services.sse import (
        get_stream_registry,
        get_completion_store,
        StreamType,
    )
    registry = get_stream_registry()
    completion_store = get_completion_store()
    
    async def generate_sse():
        """Generate SSE events from the service."""
        event_counter = 0
        
        # Register stream
        try:
            await registry.register(
                stream_id=stream_id,
                stream_type=StreamType.PROFILE_START,
                user_id=current_user.sub,
                metadata={"creation_type": data.creation_type, "style_preset": data.style_preset},
            )
        except Exception:
            pass
        
        try:
            async for chunk in service.start_session(
                user_id=current_user.sub,
                creation_type=data.creation_type,
                brand_context=brand_context,
                initial_description=data.initial_description,
                style_preset=data.style_preset,
            ):
                event_counter += 1
                event_data = {
                    "id": f"{stream_id}:{event_counter}",
                    "type": chunk.type,
                    "content": chunk.content,
                }
                if chunk.metadata:
                    event_data["metadata"] = chunk.metadata
                
                yield f"data: {json.dumps(event_data)}\n\n"
                await registry.heartbeat(stream_id)
                
                # Store completion on done event
                if chunk.type == "done":
                    await completion_store.store_completion(stream_id, "done", event_data)
                    
        except Exception as e:
            event_counter += 1
            error_data = {
                "id": f"{stream_id}:{event_counter}",
                "type": "error",
                "content": str(e),
            }
            yield f"data: {json.dumps(error_data)}\n\n"
            await completion_store.store_completion(stream_id, "error", error_data)
            
        finally:
            try:
                await registry.unregister(stream_id)
            except Exception:
                pass
    
    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "X-Stream-ID": stream_id,
        },
    )


# =============================================================================
# Continue Session Endpoint (SSE)
# =============================================================================

@router.post(
    "/sessions/{session_id}/messages",
    summary="Continue profile creator session",
    description="""
    Send a message to continue the profile creator conversation.
    
    **SSE Events:**
    - `token`: Streaming text token
    - `intent_ready`: Description is ready for generation
    - `done`: Message processed
    - `error`: Error occurred
    """,
)
async def continue_session(
    session_id: str,
    data: ContinueSessionRequest,
    current_user: TokenPayload = Depends(get_current_user),
    service: ProfileCreatorServiceDep = None,
):
    """Continue a profile creator session with SSE streaming."""
    
    # Generate stream ID for tracking
    stream_id = f"profile:{session_id}:{uuid.uuid4().hex[:8]}"
    
    # Import SSE services
    from backend.services.sse import (
        get_stream_registry,
        get_completion_store,
        StreamType,
    )
    registry = get_stream_registry()
    completion_store = get_completion_store()
    
    async def generate_sse():
        """Generate SSE events."""
        event_counter = 0
        
        # Register stream
        try:
            await registry.register(
                stream_id=stream_id,
                stream_type=StreamType.PROFILE_CONTINUE,
                user_id=current_user.sub,
                metadata={"session_id": session_id},
            )
        except Exception:
            pass
        
        try:
            async for chunk in service.continue_session(
                session_id=session_id,
                user_id=current_user.sub,
                message=data.message,
            ):
                event_counter += 1
                event_data = {
                    "id": f"{stream_id}:{event_counter}",
                    "type": chunk.type,
                    "content": chunk.content,
                }
                if chunk.metadata:
                    event_data["metadata"] = chunk.metadata
                
                yield f"data: {json.dumps(event_data)}\n\n"
                await registry.heartbeat(stream_id)
                
                # Store completion on done event
                if chunk.type == "done":
                    await completion_store.store_completion(stream_id, "done", event_data)
                    
        except Exception as e:
            event_counter += 1
            error_data = {
                "id": f"{stream_id}:{event_counter}",
                "type": "error",
                "content": str(e),
            }
            yield f"data: {json.dumps(error_data)}\n\n"
            await completion_store.store_completion(stream_id, "error", error_data)
            
        finally:
            try:
                await registry.unregister(stream_id)
            except Exception:
                pass
    
    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "X-Stream-ID": stream_id,
        },
    )


# =============================================================================
# Get Session State
# =============================================================================

@router.get(
    "/sessions/{session_id}",
    response_model=SessionStateResponse,
    summary="Get session state",
)
async def get_session(
    session_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    service: ProfileCreatorServiceDep = None,
) -> SessionStateResponse:
    """Get the current state of a profile creator session."""
    session = await service.get_session(session_id, current_user.sub)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return SessionStateResponse(
        session_id=session["session_id"],
        creation_type=session["creation_type"],
        status=session["status"],
        style_preset=session.get("style_preset"),
        refined_description=session.get("refined_description"),
        is_ready=session.get("is_ready", False),
        confidence=session.get("confidence", 0.0),
        turns_used=session.get("turns_used", 0),
        turns_remaining=session.get("turns_remaining", 10),
        created_at=str(session.get("created_at", "")),
        expires_at=str(session.get("created_at", "")),  # TODO: Calculate expiry
    )


# =============================================================================
# Generate from Session
# =============================================================================

@router.post(
    "/sessions/{session_id}/generate",
    response_model=GenerationResultResponse,
    summary="Generate from session",
    description="""
    Generate a profile picture or logo from a completed session.
    
    **Output Sizes:**
    - `small`: 256x256 pixels
    - `medium`: 512x512 pixels
    - `large`: 1024x1024 pixels
    
    **Formats:**
    - `png`: PNG with transparency support
    - `webp`: WebP for smaller file size
    """,
)
async def generate_from_session(
    request: Request,
    session_id: str,
    data: GenerateFromSessionRequest,
    current_user: TokenPayload = Depends(get_current_user),
    service: ProfileCreatorServiceDep = None,
    audit_service: AuditServiceDep = None,
    generation_service: GenerationServiceDep = None,
) -> GenerationResultResponse:
    """Generate asset from a profile creator session."""
    from backend.workers.generation_worker import enqueue_generation_job
    from datetime import datetime
    
    # Get session
    session = await service.get_session(session_id, current_user.sub)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if not session.get("is_ready"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is not ready for generation. Continue the conversation until the coach confirms the description."
        )
    
    # Map size to pixels
    size_map = {
        "small": 256,
        "medium": 512,
        "large": 1024,
    }
    size_px = size_map.get(data.output_size, 512)
    
    # Build parameters
    parameters = {
        "profile_creator_session_id": session_id,
        "width": size_px,
        "height": size_px,
        "format": data.output_format,
        "background": data.background,
        "background_color": data.background_color,
        "refined_description": session.get("refined_description"),
        "style_preset": session.get("style_preset"),
    }
    
    # Get brand kit ID if available
    brand_kit_id = None
    if session.get("brand_context"):
        brand_kit_id = session["brand_context"].get("brand_kit_id")
    
    # Create job
    job = await generation_service.create_job(
        user_id=current_user.sub,
        asset_type=session["creation_type"],
        brand_kit_id=brand_kit_id,
        custom_prompt=session.get("refined_description"),
        parameters=parameters,
    )
    
    # Enqueue for processing
    enqueue_generation_job(job.id, current_user.sub)
    
    # Audit log
    await audit_service.log(
        user_id=current_user.sub,
        action="profile_creator.generate",
        resource_type="profile_creator_session",
        resource_id=session_id,
        details={
            "job_id": job.id,
            "creation_type": session["creation_type"],
            "size": data.output_size,
            "format": data.output_format,
        },
        ip_address=request.client.host if request.client else None,
    )
    
    return GenerationResultResponse(
        job_id=job.id,
        status="queued",
        created_at=datetime.utcnow().isoformat(),
    )


# =============================================================================
# Gallery Endpoint
# =============================================================================

@router.get(
    "/gallery",
    response_model=GalleryResponse,
    summary="Get profile creator gallery",
    description="Get all profile pictures and logos created by the user.",
)
async def get_gallery(
    current_user: TokenPayload = Depends(get_current_user),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    creation_type: Optional[str] = Query(default=None, description="Filter by type"),
) -> GalleryResponse:
    """Get user's profile pictures and logos."""
    from backend.database.supabase_client import get_supabase_client
    
    supabase = get_supabase_client()
    
    # Build query
    query = supabase.table("assets").select("*", count="exact")
    query = query.eq("user_id", current_user.sub)
    query = query.in_("asset_type", ["profile_picture", "streamer_logo"])
    
    if creation_type:
        query = query.eq("asset_type", creation_type)
    
    query = query.order("created_at", desc=True)
    query = query.range(offset, offset + limit - 1)
    
    result = query.execute()
    
    items = []
    for row in result.data:
        # Handle None generation_params safely
        gen_params = row.get("generation_params") or {}
        items.append(GalleryItemResponse(
            id=row["id"],
            creation_type=row["asset_type"],
            asset_url=row["url"],
            thumbnail_url=row.get("thumbnail_url"),
            width=row.get("width", 512),
            height=row.get("height", 512),
            style_preset=gen_params.get("style_preset") if isinstance(gen_params, dict) else None,
            prompt_used=row.get("prompt_used"),
            created_at=row["created_at"],
        ))
    
    return GalleryResponse(
        items=items,
        total=result.count or len(items),
        limit=limit,
        offset=offset,
    )
