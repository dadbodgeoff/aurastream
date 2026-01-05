"""
Canvas Projects API Routes

CRUD endpoints for managing canvas studio projects.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.api.schemas.canvas_projects import (
    CanvasProjectCreate,
    CanvasProjectUpdate,
    CanvasProjectResponse,
    CanvasProjectListItem,
    CanvasProjectListResponse,
)
from backend.api.middleware.auth import get_current_user
from backend.services.jwt_service import TokenPayload
from backend.database.supabase_client import get_supabase_client

router = APIRouter(prefix="/canvas-projects", tags=["canvas-projects"])


@router.get("", response_model=CanvasProjectListResponse)
async def list_canvas_projects(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: TokenPayload = Depends(get_current_user),
):
    """List all canvas projects for the current user."""
    supabase = get_supabase_client()
    
    # Get total count
    count_response = supabase.table("canvas_projects") \
        .select("id", count="exact") \
        .eq("user_id", current_user.sub) \
        .execute()
    
    total = count_response.count or 0
    
    # Get projects (without full canvas data for performance)
    response = supabase.table("canvas_projects") \
        .select("id, name, asset_type, thumbnail_url, created_at, updated_at") \
        .eq("user_id", current_user.sub) \
        .order("updated_at", desc=True) \
        .range(offset, offset + limit - 1) \
        .execute()
    
    projects = [
        CanvasProjectListItem(
            id=str(p["id"]),
            name=p["name"],
            asset_type=p["asset_type"],
            thumbnail_url=p.get("thumbnail_url"),
            created_at=p["created_at"],
            updated_at=p["updated_at"],
        )
        for p in response.data
    ]
    
    return CanvasProjectListResponse(projects=projects, total=total)


@router.post("", response_model=CanvasProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_canvas_project(
    data: CanvasProjectCreate,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Create a new canvas project."""
    supabase = get_supabase_client()
    
    response = supabase.table("canvas_projects").insert({
        "user_id": current_user.sub,
        "name": data.name,
        "asset_type": data.asset_type,
        "sketch_elements": data.sketch_elements,
        "placements": data.placements,
        "assets": data.assets,
        "thumbnail_url": data.thumbnail_url,
    }).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create canvas project",
        )
    
    project = response.data[0]
    return CanvasProjectResponse(
        id=str(project["id"]),
        user_id=str(project["user_id"]),
        name=project["name"],
        asset_type=project["asset_type"],
        thumbnail_url=project.get("thumbnail_url"),
        sketch_elements=project.get("sketch_elements", []),
        placements=project.get("placements", []),
        assets=project.get("assets", []),
        created_at=project["created_at"],
        updated_at=project["updated_at"],
    )


@router.get("/{project_id}", response_model=CanvasProjectResponse)
async def get_canvas_project(
    project_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Get a specific canvas project with full data."""
    supabase = get_supabase_client()
    
    response = supabase.table("canvas_projects") \
        .select("*") \
        .eq("id", str(project_id)) \
        .eq("user_id", current_user.sub) \
        .single() \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas project not found",
        )
    
    project = response.data
    return CanvasProjectResponse(
        id=str(project["id"]),
        user_id=str(project["user_id"]),
        name=project["name"],
        asset_type=project["asset_type"],
        thumbnail_url=project.get("thumbnail_url"),
        sketch_elements=project.get("sketch_elements", []),
        placements=project.get("placements", []),
        assets=project.get("assets", []),
        created_at=project["created_at"],
        updated_at=project["updated_at"],
    )


@router.put("/{project_id}", response_model=CanvasProjectResponse)
async def update_canvas_project(
    project_id: UUID,
    data: CanvasProjectUpdate,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Update a canvas project."""
    supabase = get_supabase_client()
    
    # Build update dict with only provided fields
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.sketch_elements is not None:
        update_data["sketch_elements"] = data.sketch_elements
    if data.placements is not None:
        update_data["placements"] = data.placements
    if data.assets is not None:
        update_data["assets"] = data.assets
    if data.thumbnail_url is not None:
        update_data["thumbnail_url"] = data.thumbnail_url
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )
    
    response = supabase.table("canvas_projects") \
        .update(update_data) \
        .eq("id", str(project_id)) \
        .eq("user_id", current_user.sub) \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas project not found",
        )
    
    project = response.data[0]
    return CanvasProjectResponse(
        id=str(project["id"]),
        user_id=str(project["user_id"]),
        name=project["name"],
        asset_type=project["asset_type"],
        thumbnail_url=project.get("thumbnail_url"),
        sketch_elements=project.get("sketch_elements", []),
        placements=project.get("placements", []),
        assets=project.get("assets", []),
        created_at=project["created_at"],
        updated_at=project["updated_at"],
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_canvas_project(
    project_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Delete a canvas project."""
    supabase = get_supabase_client()
    
    response = supabase.table("canvas_projects") \
        .delete() \
        .eq("id", str(project_id)) \
        .eq("user_id", current_user.sub) \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas project not found",
        )
    
    return None
