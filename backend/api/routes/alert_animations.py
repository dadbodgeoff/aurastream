"""
Alert Animation Studio API Routes

Endpoints for creating and managing 3D animated stream alerts.
Requires Pro or Studio subscription tier.

IMPORTANT: Route ordering matters in FastAPI!
Static routes (/presets, /event-presets, /suggestions) MUST come before
dynamic routes (/{project_id}) to avoid path conflicts.
"""

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from redis import Redis
from rq import Queue

from backend.api.schemas.alert_animation import (
    CreateAnimationProjectRequest,
    UpdateAnimationProjectRequest,
    ExportAnimationRequest,
    CreatePresetRequest,
    AnimationProjectResponse,
    AnimationProjectListResponse,
    AnimationPresetResponse,
    AnimationExportResponse,
    DepthMapJobResponse,
    BackgroundRemovalJobResponse,
    OBSBrowserSourceResponse,
    ExportClientResponse,
    ExportServerResponse,
    AnimationConfig,
    AnimationSuggestion,
    AnimationSuggestionResponse,
    StreamEventPresetResponse,
    StreamEventPresetsListResponse,
)
from backend.api.middleware.auth import get_current_user
from backend.services.jwt_service import TokenPayload
from backend.database.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/alert-animations", tags=["alert-animations"])

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://app.aurastream.io")
QUEUE_NAME = "alert_animation"


def _check_pro_tier(user: TokenPayload) -> None:
    """Verify user has Pro or Studio subscription."""
    if user.tier not in ("pro", "studio"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "PRO_SUBSCRIPTION_REQUIRED",
                "message": "Animation Studio requires Pro subscription",
            },
        )


def _transform_project(data: dict, exports: list = None) -> AnimationProjectResponse:
    """Transform database row to response model."""
    return AnimationProjectResponse(
        id=str(data["id"]),
        user_id=str(data["user_id"]),
        source_asset_id=str(data["source_asset_id"]) if data.get("source_asset_id") else None,
        source_url=data["source_url"],
        depth_map_url=data.get("depth_map_url"),
        depth_map_generated_at=data.get("depth_map_generated_at"),
        transparent_source_url=data.get("transparent_source_url"),
        animation_config=AnimationConfig(**data.get("animation_config", {})),
        export_format=data.get("export_format", "webm"),
        export_width=data.get("export_width", 512),
        export_height=data.get("export_height", 512),
        export_fps=data.get("export_fps", 30),
        exports=exports or [],
        name=data.get("name", "Untitled Animation"),
        thumbnail_url=data.get("thumbnail_url"),
        requires_tier="pro",
        created_at=data["created_at"],
        updated_at=data["updated_at"],
    )


def _transform_preset(data: dict) -> AnimationPresetResponse:
    """Transform preset database row to response model."""
    return AnimationPresetResponse(
        id=str(data["id"]),
        user_id=str(data["user_id"]) if data.get("user_id") else None,
        name=data["name"],
        description=data.get("description"),
        category=data["category"],
        config=data["config"],
        preview_url=data.get("preview_url"),
        icon=data.get("icon"),
    )


def _transform_export(data: dict) -> AnimationExportResponse:
    """Transform export database row to response model."""
    return AnimationExportResponse(
        id=str(data["id"]),
        format=data["format"],
        url=data["url"],
        file_size=data.get("file_size"),
        width=data["width"],
        height=data["height"],
        fps=data["fps"],
        duration_ms=data["duration_ms"],
        obs_browser_url=data.get("obs_browser_url"),
        created_at=data["created_at"],
    )


def _transform_event_preset(data: dict) -> StreamEventPresetResponse:
    """Transform stream event preset database row to response model."""
    return StreamEventPresetResponse(
        id=str(data["id"]),
        event_type=data["event_type"],
        name=data["name"],
        description=data.get("description"),
        icon=data.get("icon"),
        recommended_duration_ms=data.get("recommended_duration_ms", 3000),
        animation_config=AnimationConfig(**data["animation_config"]),
        user_id=str(data["user_id"]) if data.get("user_id") else None,
    )


# ============================================================================
# STATIC ROUTES FIRST (must come before /{project_id} routes)
# ============================================================================

# ============================================================================
# Preset Endpoints
# ============================================================================

@router.get("/presets", response_model=list[AnimationPresetResponse])
async def list_presets(
    category: Optional[str] = Query(None),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    List all animation presets (system + user custom).
    
    Optionally filter by category: entry, loop, depth, particles
    """
    _check_pro_tier(current_user)
    
    supabase = get_supabase_client()
    
    query = supabase.table("animation_presets") \
        .select("*") \
        .or_(f"user_id.is.null,user_id.eq.{current_user.sub}")
    
    if category:
        query = query.eq("category", category)
    
    response = query.order("sort_order").execute()
    
    return [_transform_preset(row) for row in response.data]


@router.post("/presets", response_model=AnimationPresetResponse, status_code=status.HTTP_201_CREATED)
async def create_preset(
    data: CreatePresetRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Create a custom animation preset."""
    _check_pro_tier(current_user)
    
    supabase = get_supabase_client()
    
    insert_data = {
        "user_id": current_user.sub,
        "name": data.name,
        "description": data.description,
        "category": data.category,
        "config": data.config,
    }
    
    response = supabase.table("animation_presets") \
        .insert(insert_data) \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create preset",
        )
    
    return _transform_preset(response.data[0])


@router.get("/presets/{category}", response_model=list[AnimationPresetResponse])
async def list_presets_by_category(
    category: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    """List presets filtered by category."""
    _check_pro_tier(current_user)
    
    if category not in ("entry", "loop", "depth", "particles"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category. Must be: entry, loop, depth, or particles",
        )
    
    supabase = get_supabase_client()
    
    response = supabase.table("animation_presets") \
        .select("*") \
        .or_(f"user_id.is.null,user_id.eq.{current_user.sub}") \
        .eq("category", category) \
        .order("sort_order") \
        .execute()
    
    return [_transform_preset(row) for row in response.data]


@router.delete("/presets/{preset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_preset(
    preset_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Delete a custom preset (cannot delete system presets)."""
    _check_pro_tier(current_user)
    
    supabase = get_supabase_client()
    
    # Verify ownership (can only delete own presets)
    existing = supabase.table("animation_presets") \
        .select("id, user_id") \
        .eq("id", str(preset_id)) \
        .single() \
        .execute()
    
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preset not found",
        )
    
    if existing.data.get("user_id") is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete system presets",
        )
    
    if existing.data.get("user_id") != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete another user's preset",
        )
    
    supabase.table("animation_presets") \
        .delete() \
        .eq("id", str(preset_id)) \
        .execute()
    
    return None


# ============================================================================
# Stream Event Presets Endpoints
# ============================================================================

@router.get("/event-presets", response_model=StreamEventPresetsListResponse)
async def list_stream_event_presets(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    List stream event presets (system + user custom).
    
    Event types: new_subscriber, raid, donation_small, donation_medium,
    donation_large, new_follower, milestone, bits, gift_sub
    """
    _check_pro_tier(current_user)
    
    supabase = get_supabase_client()
    
    query = supabase.table("stream_event_presets") \
        .select("*") \
        .or_(f"user_id.is.null,user_id.eq.{current_user.sub}")
    
    if event_type:
        query = query.eq("event_type", event_type)
    
    response = query.order("sort_order").execute()
    
    presets = [_transform_event_preset(row) for row in response.data]
    
    return StreamEventPresetsListResponse(presets=presets)


@router.get("/event-presets/{event_type}", response_model=StreamEventPresetResponse)
async def get_stream_event_preset(
    event_type: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Get the preset for a specific stream event type.
    
    Returns user's custom preset if exists, otherwise system preset.
    """
    _check_pro_tier(current_user)
    
    valid_events = [
        "new_subscriber", "raid", "donation_small", "donation_medium",
        "donation_large", "new_follower", "milestone", "bits", "gift_sub"
    ]
    
    if event_type not in valid_events:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid event type. Must be one of: {', '.join(valid_events)}",
        )
    
    supabase = get_supabase_client()
    
    # Try user's custom preset first
    user_response = supabase.table("stream_event_presets") \
        .select("*") \
        .eq("event_type", event_type) \
        .eq("user_id", current_user.sub) \
        .single() \
        .execute()
    
    if user_response.data:
        return _transform_event_preset(user_response.data)
    
    # Fall back to system preset
    system_response = supabase.table("stream_event_presets") \
        .select("*") \
        .eq("event_type", event_type) \
        .is_("user_id", "null") \
        .single() \
        .execute()
    
    if not system_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No preset found for event type: {event_type}",
        )
    
    return _transform_event_preset(system_response.data)


# ============================================================================
# Animation Suggestions Endpoints
# ============================================================================

@router.get("/suggestions/{asset_id}", response_model=AnimationSuggestionResponse)
async def get_animation_suggestions(
    asset_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Get AI-generated animation suggestions for an asset.
    
    Returns cached suggestions if available, otherwise generates new ones.
    """
    _check_pro_tier(current_user)
    
    supabase = get_supabase_client()
    
    # Get asset with suggestions
    response = supabase.table("assets") \
        .select("id, url, asset_type, animation_suggestions") \
        .eq("id", str(asset_id)) \
        .eq("user_id", current_user.sub) \
        .single() \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )
    
    asset = response.data
    
    # Return cached suggestions if available
    if asset.get("animation_suggestions"):
        suggestions_data = asset["animation_suggestions"]
        return AnimationSuggestionResponse(
            asset_id=str(asset_id),
            suggestions=AnimationSuggestion(
                vibe=suggestions_data["vibe"],
                recommended_preset=suggestions_data["recommended_preset"],
                recommended_event=suggestions_data.get("recommended_event"),
                config=AnimationConfig(**suggestions_data["config"]),
                reasoning=suggestions_data["reasoning"],
                alternatives=suggestions_data.get("alternatives", []),
            ),
            generated_at=suggestions_data.get("generated_at"),
        )
    
    # Generate new suggestions
    from backend.services.alert_animation.suggestion_service import get_animation_suggestion_service
    
    suggestion_service = get_animation_suggestion_service()
    suggestion = await suggestion_service.analyze_asset_and_suggest(
        asset_url=asset["url"],
        asset_type=asset["asset_type"],
    )
    
    if suggestion:
        # Store for future use
        await suggestion_service.store_suggestion(str(asset_id), suggestion)
        
        return AnimationSuggestionResponse(
            asset_id=str(asset_id),
            suggestions=suggestion,
            generated_at=datetime.now(timezone.utc).isoformat(),
        )
    
    return AnimationSuggestionResponse(
        asset_id=str(asset_id),
        suggestions=None,
        generated_at=None,
    )


@router.post("/suggestions/{asset_id}/regenerate", response_model=AnimationSuggestionResponse)
async def regenerate_animation_suggestions(
    asset_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Force regenerate animation suggestions for an asset.
    
    Useful if the user wants fresh suggestions or the asset has changed.
    """
    _check_pro_tier(current_user)
    
    supabase = get_supabase_client()
    
    # Get asset
    response = supabase.table("assets") \
        .select("id, url, asset_type") \
        .eq("id", str(asset_id)) \
        .eq("user_id", current_user.sub) \
        .single() \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )
    
    asset = response.data
    
    # Generate new suggestions
    from backend.services.alert_animation.suggestion_service import get_animation_suggestion_service
    
    suggestion_service = get_animation_suggestion_service()
    suggestion = await suggestion_service.analyze_asset_and_suggest(
        asset_url=asset["url"],
        asset_type=asset["asset_type"],
    )
    
    if suggestion:
        # Store for future use
        await suggestion_service.store_suggestion(str(asset_id), suggestion)
        
        return AnimationSuggestionResponse(
            asset_id=str(asset_id),
            suggestions=suggestion,
            generated_at=datetime.now(timezone.utc).isoformat(),
        )
    
    return AnimationSuggestionResponse(
        asset_id=str(asset_id),
        suggestions=None,
        generated_at=None,
    )


# ============================================================================
# Background Removal Endpoint
# ============================================================================

@router.post("/{project_id}/remove-background", response_model=BackgroundRemovalJobResponse)
async def remove_background(
    project_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Remove background from the animation project's source image.
    
    Uses rembg (U2Net) to remove the background, creating a transparent PNG.
    Returns a job ID for polling progress.
    """
    _check_pro_tier(current_user)
    
    supabase = get_supabase_client()
    
    # Get project
    response = supabase.table("alert_animation_projects") \
        .select("*") \
        .eq("id", str(project_id)) \
        .eq("user_id", current_user.sub) \
        .single() \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animation project not found",
        )
    
    project = response.data
    
    # Check if already has transparent background
    if project.get("transparent_source_url"):
        return BackgroundRemovalJobResponse(
            job_id=str(project_id),
            status="completed",
            transparent_source_url=project["transparent_source_url"],
        )
    
    # Enqueue background removal job
    job_id = str(uuid.uuid4())
    
    try:
        redis_conn = Redis.from_url(REDIS_URL)
        queue = Queue(QUEUE_NAME, connection=redis_conn)
        
        queue.enqueue(
            "backend.workers.alert_animation_worker.remove_background_job",
            kwargs={
                "job_id": job_id,
                "project_id": str(project_id),
                "user_id": current_user.sub,
                "source_url": project["source_url"],
            },
            job_timeout=120,  # 2 minutes
        )
        
        logger.info(f"Enqueued background removal job {job_id} for project {project_id}")
        
    except Exception as e:
        logger.error(f"Failed to enqueue background removal job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start background removal",
        )
    
    return BackgroundRemovalJobResponse(
        job_id=job_id,
        status="queued",
        estimated_seconds=10,
    )


# ============================================================================
# OBS Public Endpoint (Token-based auth, no JWT Bearer)
# ============================================================================

@router.get("/obs/{project_id}", response_model=AnimationProjectResponse)
async def get_project_for_obs(
    project_id: UUID,
    token: str = Query(..., description="OBS access token"),
):
    """
    Get animation project data for OBS browser source.
    
    This endpoint uses OBS-specific token authentication instead of
    standard Bearer JWT. The token is generated via GET /{project_id}/obs-url.
    
    No subscription check - token already validates access.
    """
    from backend.services.jwt_service import decode_obs_token
    from backend.services.exceptions import TokenExpiredError, TokenInvalidError
    
    # Validate OBS token
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
    
    # Verify token is for this project
    if payload.project_id != str(project_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "TOKEN_PROJECT_MISMATCH",
                "message": "Token is not valid for this project",
            },
        )
    
    supabase = get_supabase_client()
    
    # Get project (verify user ownership via token's user_id)
    response = supabase.table("alert_animation_projects") \
        .select("*") \
        .eq("id", str(project_id)) \
        .eq("user_id", payload.sub) \
        .single() \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animation project not found",
        )
    
    return _transform_project(response.data)


# ============================================================================
# DYNAMIC ROUTES (/{project_id} patterns - must come AFTER static routes)
# ============================================================================

# ============================================================================
# Project CRUD Endpoints
# ============================================================================

@router.post("", response_model=AnimationProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_animation_project(
    data: CreateAnimationProjectRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Create a new animation project from an existing asset.
    
    Requires Pro or Studio subscription.
    """
    _check_pro_tier(current_user)
    
    supabase = get_supabase_client()
    
    # Build animation config
    config = data.animation_config.model_dump() if data.animation_config else {
        "entry": None,
        "loop": None,
        "depth_effect": None,
        "particles": None,
        "duration_ms": 3000,
        "loop_count": 1,
    }
    
    insert_data = {
        "user_id": current_user.sub,
        "source_asset_id": str(data.source_asset_id) if data.source_asset_id else None,
        "source_url": data.source_url,
        "name": data.name,
        "animation_config": config,
    }
    
    response = supabase.table("alert_animation_projects") \
        .insert(insert_data) \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create animation project",
        )
    
    return _transform_project(response.data[0])


@router.get("", response_model=AnimationProjectListResponse)
async def list_animation_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    List user's animation projects.
    
    Requires Pro or Studio subscription.
    """
    _check_pro_tier(current_user)
    
    supabase = get_supabase_client()
    
    # Get total count
    count_response = supabase.table("alert_animation_projects") \
        .select("id", count="exact") \
        .eq("user_id", current_user.sub) \
        .execute()
    
    total = count_response.count or 0
    
    # Get paginated projects
    offset = (page - 1) * page_size
    response = supabase.table("alert_animation_projects") \
        .select("*") \
        .eq("user_id", current_user.sub) \
        .order("updated_at", desc=True) \
        .range(offset, offset + page_size - 1) \
        .execute()
    
    projects = [_transform_project(row) for row in response.data]
    
    return AnimationProjectListResponse(
        projects=projects,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{project_id}", response_model=AnimationProjectResponse)
async def get_animation_project(
    project_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Get a specific animation project with its exports."""
    _check_pro_tier(current_user)
    
    supabase = get_supabase_client()
    
    response = supabase.table("alert_animation_projects") \
        .select("*") \
        .eq("id", str(project_id)) \
        .eq("user_id", current_user.sub) \
        .single() \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animation project not found",
        )
    
    # Get exports
    exports_response = supabase.table("alert_animation_exports") \
        .select("*") \
        .eq("project_id", str(project_id)) \
        .order("created_at", desc=True) \
        .execute()
    
    exports = [_transform_export(row) for row in exports_response.data]
    
    return _transform_project(response.data, exports)


@router.put("/{project_id}", response_model=AnimationProjectResponse)
async def update_animation_project(
    project_id: UUID,
    data: UpdateAnimationProjectRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Update animation project settings."""
    _check_pro_tier(current_user)
    
    supabase = get_supabase_client()
    
    # Verify ownership
    existing = supabase.table("alert_animation_projects") \
        .select("id") \
        .eq("id", str(project_id)) \
        .eq("user_id", current_user.sub) \
        .single() \
        .execute()
    
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animation project not found",
        )
    
    # Build update data
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.animation_config is not None:
        update_data["animation_config"] = data.animation_config.model_dump()
    if data.export_format is not None:
        update_data["export_format"] = data.export_format
    if data.export_width is not None:
        update_data["export_width"] = data.export_width
    if data.export_height is not None:
        update_data["export_height"] = data.export_height
    if data.export_fps is not None:
        update_data["export_fps"] = data.export_fps
    
    if not update_data:
        # Nothing to update
        response = supabase.table("alert_animation_projects") \
            .select("*") \
            .eq("id", str(project_id)) \
            .single() \
            .execute()
        return _transform_project(response.data)
    
    response = supabase.table("alert_animation_projects") \
        .update(update_data) \
        .eq("id", str(project_id)) \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update animation project",
        )
    
    return _transform_project(response.data[0])


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_animation_project(
    project_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Delete an animation project and all its exports."""
    _check_pro_tier(current_user)
    
    supabase = get_supabase_client()
    
    # Verify ownership
    existing = supabase.table("alert_animation_projects") \
        .select("id") \
        .eq("id", str(project_id)) \
        .eq("user_id", current_user.sub) \
        .single() \
        .execute()
    
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animation project not found",
        )
    
    # Delete (cascade will handle exports)
    supabase.table("alert_animation_projects") \
        .delete() \
        .eq("id", str(project_id)) \
        .execute()
    
    return None


# ============================================================================
# Processing Endpoints
# ============================================================================

@router.post("/{project_id}/depth-map", response_model=DepthMapJobResponse)
async def generate_depth_map(
    project_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Generate depth map for the animation project.
    
    Uses Depth Anything V2 to create a depth map from the source image.
    Returns a job ID for polling progress via SSE.
    """
    _check_pro_tier(current_user)
    
    supabase = get_supabase_client()
    
    # Get project
    response = supabase.table("alert_animation_projects") \
        .select("*") \
        .eq("id", str(project_id)) \
        .eq("user_id", current_user.sub) \
        .single() \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animation project not found",
        )
    
    project = response.data
    
    # Check if already has depth map
    if project.get("depth_map_url"):
        return DepthMapJobResponse(
            job_id=str(project_id),
            status="completed",
            depth_map_url=project["depth_map_url"],
        )
    
    # Enqueue depth map job
    job_id = str(uuid.uuid4())
    
    try:
        redis_conn = Redis.from_url(REDIS_URL)
        queue = Queue(QUEUE_NAME, connection=redis_conn)
        
        queue.enqueue(
            "backend.workers.alert_animation_worker.depth_map_job",
            kwargs={
                "job_id": job_id,
                "project_id": str(project_id),
                "user_id": current_user.sub,
                "source_url": project["source_url"],
            },
            job_timeout=300,  # 5 minutes
        )
        
        logger.info(f"Enqueued depth map job {job_id} for project {project_id}")
        
    except Exception as e:
        logger.error(f"Failed to enqueue depth map job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start depth map generation",
        )
    
    return DepthMapJobResponse(
        job_id=job_id,
        status="queued",
        estimated_seconds=5,
    )


@router.post("/{project_id}/export")
async def export_animation(
    project_id: UUID,
    data: ExportAnimationRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Export animation to WebM/GIF.
    
    By default, returns config for client-side export using MediaRecorder API.
    Set use_server_export=true for server-side FFmpeg export (Safari/mobile fallback).
    """
    _check_pro_tier(current_user)
    
    supabase = get_supabase_client()
    
    # Get project
    response = supabase.table("alert_animation_projects") \
        .select("*") \
        .eq("id", str(project_id)) \
        .eq("user_id", current_user.sub) \
        .single() \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animation project not found",
        )
    
    project = response.data
    
    # Use project defaults if not specified
    width = data.width or project.get("export_width", 512)
    height = data.height or project.get("export_height", 512)
    fps = data.fps or project.get("export_fps", 30)
    
    if data.use_server_export:
        # Server-side export (fallback)
        job_id = str(uuid.uuid4())
        
        try:
            redis_conn = Redis.from_url(REDIS_URL)
            queue = Queue(QUEUE_NAME, connection=redis_conn)
            
            config = project.get("animation_config", {})
            duration_ms = config.get("duration_ms", 3000)
            
            queue.enqueue(
                "backend.workers.alert_animation_worker.export_job",
                kwargs={
                    "job_id": job_id,
                    "project_id": str(project_id),
                    "user_id": current_user.sub,
                    "source_url": project["source_url"],
                    "depth_map_url": project.get("depth_map_url"),
                    "animation_config": config,
                    "format": data.format,
                    "width": width,
                    "height": height,
                    "fps": fps,
                    "duration_ms": duration_ms,
                },
                job_timeout=600,  # 10 minutes
            )
            
            logger.info(f"Enqueued export job {job_id} for project {project_id}")
            
        except Exception as e:
            logger.error(f"Failed to enqueue export job: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to start export",
            )
        
        return ExportServerResponse(
            job_id=job_id,
            status="queued",
        )
    
    else:
        # Client-side export
        config = AnimationConfig(**project.get("animation_config", {}))
        
        return ExportClientResponse(
            animation_config=config,
            depth_map_url=project.get("depth_map_url"),
            source_url=project["source_url"],
        )


@router.get("/{project_id}/obs-url", response_model=OBSBrowserSourceResponse)
async def get_obs_browser_source(
    project_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Get OBS browser source URL for live animation.
    
    Returns a URL that can be used as an OBS browser source to display
    the animated alert in real-time.
    """
    _check_pro_tier(current_user)
    
    supabase = get_supabase_client()
    
    # Verify ownership
    response = supabase.table("alert_animation_projects") \
        .select("export_width, export_height") \
        .eq("id", str(project_id)) \
        .eq("user_id", current_user.sub) \
        .single() \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animation project not found",
        )
    
    project = response.data
    width = project.get("export_width", 512)
    height = project.get("export_height", 512)
    
    # Generate OBS token (simple JWT for OBS access)
    from backend.services.jwt_service import create_obs_token
    obs_token = create_obs_token(str(project_id), current_user.sub)
    
    url = f"{FRONTEND_URL}/obs/alert/{project_id}?token={obs_token}"
    
    instructions = (
        "1. In OBS, add Browser Source\n"
        f"2. Set URL to: {url}\n"
        f"3. Set dimensions to {width}x{height}\n"
        "4. Check 'Shutdown source when not visible'"
    )
    
    return OBSBrowserSourceResponse(
        url=url,
        width=width,
        height=height,
        instructions=instructions,
    )


# ============================================================================
# V2 Timeline & Audio Endpoints
# ============================================================================

# Import V2 schemas for type hints
from backend.api.schemas.alert_animation_v2 import (
    UpdateTimelineRequest,
    UpdateAudioMappingsRequest,
    OBSHtmlBlobRequest,
    OBSHtmlBlobResponse,
    UpdateTimelineResponse,
    UpdateAudioMappingsResponse,
)


@router.put("/{project_id}/v2/timeline", response_model=UpdateTimelineResponse)
async def update_project_timeline_v2(
    project_id: UUID,
    data: UpdateTimelineRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Update the timeline for an animation project (V2).
    
    Enables keyframe-based animation editing with full timeline support.
    """
    _check_pro_tier(current_user)
    
    supabase = get_supabase_client()
    
    # Verify ownership
    existing = supabase.table("alert_animation_projects") \
        .select("animation_config") \
        .eq("id", str(project_id)) \
        .eq("user_id", current_user.sub) \
        .single() \
        .execute()
    
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animation project not found",
        )
    
    # Update animation_config with timeline
    config = existing.data.get("animation_config", {})
    config["timeline"] = data.timeline.model_dump()
    
    response = supabase.table("alert_animation_projects") \
        .update({
            "animation_config": config,
        }) \
        .eq("id", str(project_id)) \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update timeline",
        )
    
    return UpdateTimelineResponse(
        status="updated",
        timeline_id=data.timeline.id,
    )


@router.put("/{project_id}/v2/audio-mappings", response_model=UpdateAudioMappingsResponse)
async def update_audio_mappings(
    project_id: UUID,
    data: UpdateAudioMappingsRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Update audio reactive mappings for an animation project.
    
    V2 feature: Enables audio-reactive animations that respond to
    frequency bands, beats, and other audio analysis data.
    """
    _check_pro_tier(current_user)
    
    supabase = get_supabase_client()
    
    # Verify ownership
    existing = supabase.table("alert_animation_projects") \
        .select("animation_config") \
        .eq("id", str(project_id)) \
        .eq("user_id", current_user.sub) \
        .single() \
        .execute()
    
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animation project not found",
        )
    
    # Update animation_config with audio mappings
    config = existing.data.get("animation_config", {})
    config["audio_mappings"] = [m.model_dump() for m in data.mappings]
    if data.audio_url:
        config["audio_url"] = data.audio_url
    
    response = supabase.table("alert_animation_projects") \
        .update({
            "animation_config": config,
        }) \
        .eq("id", str(project_id)) \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update audio mappings",
        )
    
    return UpdateAudioMappingsResponse(
        status="updated",
        mappings_count=len(data.mappings),
    )


@router.post("/{project_id}/v2/obs-html-blob", response_model=OBSHtmlBlobResponse)
async def generate_obs_html_blob_endpoint(
    project_id: UUID,
    data: OBSHtmlBlobRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Generate a self-contained HTML blob for OBS Browser Source.
    
    The blob includes the embedded animation engine and doesn't require
    any server connection to render (only for triggers via SSE relay).
    
    This is useful for:
    - Offline usage
    - Reduced latency
    - Simpler OBS setup
    """
    from backend.services.alert_animation.export_service import generate_obs_html_blob
    
    _check_pro_tier(current_user)
    
    supabase = get_supabase_client()
    
    # Get project
    response = supabase.table("alert_animation_projects") \
        .select("*") \
        .eq("id", str(project_id)) \
        .eq("user_id", current_user.sub) \
        .single() \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animation project not found",
        )
    
    project = response.data
    
    # Generate HTML blob
    html = generate_obs_html_blob(
        alert_id=str(project_id),
        alert_name=project.get("name", "Alert"),
        animation_config=project.get("animation_config", {}),
        source_url=project["source_url"],
        depth_map_url=project.get("depth_map_url"),
        width=data.width,
        height=data.height,
        debug=data.include_debug,
    )
    
    instructions = (
        "1. Save this HTML to a file (e.g., my-alert.html)\n"
        "2. In OBS, add a Browser Source\n"
        "3. Check 'Local file' and select the HTML file\n"
        f"4. Set dimensions to {data.width}x{data.height}\n"
        "5. Your alert is ready! Use testAlert() in console to test."
    )
    
    return OBSHtmlBlobResponse(
        html=html,
        file_size=len(html.encode("utf-8")),
        instructions=instructions,
    )
