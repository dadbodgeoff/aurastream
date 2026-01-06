"""
Alert Animation Studio API Routes

Endpoints for creating and managing 3D animated stream alerts.
Requires Pro or Studio subscription tier.
"""

import logging
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
    OBSBrowserSourceResponse,
    ExportClientResponse,
    ExportServerResponse,
    AnimationConfig,
)
from backend.api.middleware.auth import get_current_user
from backend.services.jwt_service import TokenPayload
from backend.database.supabase_client import get_supabase_client
from backend.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/alert-animations", tags=["alert-animations"])

REDIS_URL = getattr(settings, "REDIS_URL", "redis://localhost:6379")
QUEUE_NAME = "alert_animation"


def _check_pro_tier(user: TokenPayload) -> None:
    """Verify user has Pro or Studio subscription."""
    if user.subscription_tier not in ("pro", "studio"):
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
            job_id=job_id,
            project_id=str(project_id),
            user_id=current_user.sub,
            source_url=project["source_url"],
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
                job_id=job_id,
                project_id=str(project_id),
                user_id=current_user.sub,
                source_url=project["source_url"],
                depth_map_url=project.get("depth_map_url"),
                animation_config=config,
                format=data.format,
                width=width,
                height=height,
                fps=fps,
                duration_ms=duration_ms,
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
    
    base_url = getattr(settings, "FRONTEND_URL", "https://app.aurastream.io")
    url = f"{base_url}/obs/alert/{project_id}?token={obs_token}"
    
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
