"""
Project Asset Overrides API Routes

Endpoints for managing per-project asset settings.
Enables project-scoped background removal and other asset transformations.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from backend.api.schemas.project_asset_overrides import (
    ProjectAssetOverride,
    ProjectAssetOverrideCreate,
    ProjectAssetOverrideUpdate,
    BulkOverrideRequest,
    ProjectAssetOverridesResponse,
    RemoveBackgroundInProjectRequest,
    RemoveBackgroundInProjectResponse,
)
from backend.api.middleware.auth import get_current_user
from backend.services.jwt_service import TokenPayload
from backend.database.supabase_client import get_supabase_client

router = APIRouter(prefix="/canvas-projects/{project_id}/asset-overrides", tags=["project-asset-overrides"])


def _transform_override(data: dict) -> ProjectAssetOverride:
    """Transform database row to response model."""
    return ProjectAssetOverride(
        id=str(data["id"]),
        project_id=str(data["project_id"]),
        asset_id=str(data["asset_id"]),
        user_id=str(data["user_id"]),
        use_processed_url=data.get("use_processed_url", False),
        processed_url=data.get("processed_url"),
        custom_crop=data.get("custom_crop"),
        custom_filters=data.get("custom_filters"),
        created_at=data["created_at"],
        updated_at=data["updated_at"],
    )


async def _verify_project_ownership(
    supabase, 
    project_id: str, 
    user_id: str
) -> bool:
    """Verify the user owns the project."""
    response = supabase.table("canvas_projects") \
        .select("id") \
        .eq("id", project_id) \
        .eq("user_id", user_id) \
        .single() \
        .execute()
    return response.data is not None


@router.get("", response_model=ProjectAssetOverridesResponse)
async def list_project_overrides(
    project_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Get all asset overrides for a project.
    
    Returns the per-project settings for each asset, including whether
    to use the background-removed version.
    """
    supabase = get_supabase_client()
    
    # Verify project ownership
    if not await _verify_project_ownership(supabase, str(project_id), current_user.sub):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    response = supabase.table("project_asset_overrides") \
        .select("*") \
        .eq("project_id", str(project_id)) \
        .eq("user_id", current_user.sub) \
        .execute()
    
    overrides = [_transform_override(row) for row in response.data]
    
    return ProjectAssetOverridesResponse(
        project_id=str(project_id),
        overrides=overrides,
    )


@router.get("/{asset_id}", response_model=ProjectAssetOverride)
async def get_asset_override(
    project_id: UUID,
    asset_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Get the override settings for a specific asset in a project."""
    supabase = get_supabase_client()
    
    # Verify project ownership
    if not await _verify_project_ownership(supabase, str(project_id), current_user.sub):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    response = supabase.table("project_asset_overrides") \
        .select("*") \
        .eq("project_id", str(project_id)) \
        .eq("asset_id", str(asset_id)) \
        .eq("user_id", current_user.sub) \
        .single() \
        .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Override not found for this asset in this project",
        )
    
    return _transform_override(response.data)


@router.put("/{asset_id}", response_model=ProjectAssetOverride)
async def upsert_asset_override(
    project_id: UUID,
    asset_id: UUID,
    data: ProjectAssetOverrideUpdate,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Create or update override settings for an asset in a project.
    
    Use this to enable/disable background removal for a specific asset
    within a specific project without affecting other projects.
    """
    supabase = get_supabase_client()
    
    # Verify project ownership
    if not await _verify_project_ownership(supabase, str(project_id), current_user.sub):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    # Check if override exists
    existing = supabase.table("project_asset_overrides") \
        .select("id") \
        .eq("project_id", str(project_id)) \
        .eq("asset_id", str(asset_id)) \
        .eq("user_id", current_user.sub) \
        .single() \
        .execute()
    
    if existing.data:
        # Update existing
        update_data = {}
        if data.use_processed_url is not None:
            update_data["use_processed_url"] = data.use_processed_url
        if data.custom_crop is not None:
            update_data["custom_crop"] = data.custom_crop
        if data.custom_filters is not None:
            update_data["custom_filters"] = data.custom_filters
        
        if not update_data:
            # Nothing to update, return existing
            full_existing = supabase.table("project_asset_overrides") \
                .select("*") \
                .eq("id", existing.data["id"]) \
                .single() \
                .execute()
            return _transform_override(full_existing.data)
        
        response = supabase.table("project_asset_overrides") \
            .update(update_data) \
            .eq("id", existing.data["id"]) \
            .execute()
    else:
        # Create new
        insert_data = {
            "project_id": str(project_id),
            "asset_id": str(asset_id),
            "user_id": current_user.sub,
            "use_processed_url": data.use_processed_url or False,
            "custom_crop": data.custom_crop,
            "custom_filters": data.custom_filters,
        }
        
        response = supabase.table("project_asset_overrides") \
            .insert(insert_data) \
            .execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save override",
        )
    
    return _transform_override(response.data[0])


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset_override(
    project_id: UUID,
    asset_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Delete override settings for an asset in a project.
    
    This resets the asset to use its default (original) URL in this project.
    """
    supabase = get_supabase_client()
    
    # Verify project ownership
    if not await _verify_project_ownership(supabase, str(project_id), current_user.sub):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    response = supabase.table("project_asset_overrides") \
        .delete() \
        .eq("project_id", str(project_id)) \
        .eq("asset_id", str(asset_id)) \
        .eq("user_id", current_user.sub) \
        .execute()
    
    return None


@router.post("/bulk", response_model=ProjectAssetOverridesResponse)
async def bulk_upsert_overrides(
    project_id: UUID,
    data: BulkOverrideRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Set overrides for multiple assets at once.
    
    Useful when saving a project - send all asset overrides in one request.
    """
    supabase = get_supabase_client()
    
    # Verify project ownership
    if not await _verify_project_ownership(supabase, str(project_id), current_user.sub):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    results = []
    
    for override in data.overrides:
        # Upsert each override
        existing = supabase.table("project_asset_overrides") \
            .select("id") \
            .eq("project_id", str(project_id)) \
            .eq("asset_id", override.asset_id) \
            .eq("user_id", current_user.sub) \
            .single() \
            .execute()
        
        if existing.data:
            # Update
            response = supabase.table("project_asset_overrides") \
                .update({
                    "use_processed_url": override.use_processed_url,
                    "custom_crop": override.custom_crop,
                    "custom_filters": override.custom_filters,
                }) \
                .eq("id", existing.data["id"]) \
                .execute()
        else:
            # Insert
            response = supabase.table("project_asset_overrides") \
                .insert({
                    "project_id": str(project_id),
                    "asset_id": override.asset_id,
                    "user_id": current_user.sub,
                    "use_processed_url": override.use_processed_url,
                    "custom_crop": override.custom_crop,
                    "custom_filters": override.custom_filters,
                }) \
                .execute()
        
        if response.data:
            results.append(_transform_override(response.data[0]))
    
    return ProjectAssetOverridesResponse(
        project_id=str(project_id),
        overrides=results,
    )


@router.post("/remove-background", response_model=RemoveBackgroundInProjectResponse)
async def remove_background_in_project(
    project_id: UUID,
    data: RemoveBackgroundInProjectRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Remove background from an asset AND enable it for this project only.
    
    This is the project-scoped version of background removal:
    1. If the asset doesn't have background removed yet, process it
    2. Create/update the project override to use the processed URL
    3. Other projects using this asset are NOT affected
    
    **Community Assets:** When the asset_id starts with 'community_', this
    processes the community hub asset and stores the result in the user's
    personal storage. The original community asset is never modified.
    
    The asset's global `has_background_removed` flag will be set to true,
    but only THIS project will use the processed URL by default.
    """
    from backend.services.creator_media.service import CreatorMediaService
    from backend.services.creator_media.storage import MediaStorageService
    from backend.services.creator_media.repository import CreatorMediaRepository
    from backend.services.creator_media.background_removal import BackgroundRemovalService
    import httpx
    import logging
    
    logger = logging.getLogger(__name__)
    
    supabase = get_supabase_client()
    
    # Verify project ownership
    if not await _verify_project_ownership(supabase, str(project_id), current_user.sub):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    asset_id = data.asset_id
    is_community_asset = asset_id.startswith("community_")
    
    # Initialize services
    storage = MediaStorageService(supabase)
    repository = CreatorMediaRepository(supabase)
    bg_removal = BackgroundRemovalService()
    service = CreatorMediaService(
        storage=storage,
        repository=repository,
        bg_removal=bg_removal,
    )
    
    try:
        if is_community_asset:
            # Handle community asset - process and store in user's space
            real_community_id = asset_id.replace("community_", "")
            
            # Check if we already have a processed version for this user+community asset
            existing_processed = supabase.table("project_asset_overrides") \
                .select("processed_url") \
                .eq("project_id", str(project_id)) \
                .eq("asset_id", asset_id) \
                .eq("user_id", current_user.sub) \
                .single() \
                .execute()
            
            if existing_processed.data and existing_processed.data.get("processed_url"):
                # Already processed for this project
                return RemoveBackgroundInProjectResponse(
                    asset_id=asset_id,
                    project_id=str(project_id),
                    processed_url=existing_processed.data["processed_url"],
                    use_processed_url=True,
                    message="Using existing processed version",
                )
            
            # Fetch the community asset
            community_asset = supabase.table("community_hub_assets") \
                .select("*") \
                .eq("id", real_community_id) \
                .single() \
                .execute()
            
            if not community_asset.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Community asset not found: {real_community_id}",
                )
            
            asset_data = community_asset.data
            original_url = asset_data.get("url")
            
            if not original_url:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Community asset has no URL",
                )
            
            # Download the image
            logger.info(f"Downloading community asset for bg removal: {original_url}")
            async with httpx.AsyncClient() as client:
                response = await client.get(original_url, timeout=30.0)
                response.raise_for_status()
                image_bytes = response.content
            
            # Process background removal
            logger.info(f"Processing background removal for community asset: {asset_id}")
            processed_bytes = await bg_removal.remove_background(image_bytes)
            
            # Upload to storage using the storage service
            # Use a unique asset ID for the processed community asset
            from uuid import uuid4
            processed_asset_id = f"community-{real_community_id}"
            
            upload_result = await storage.upload(
                user_id=current_user.sub,
                asset_type="reference",  # Store in reference folder
                asset_id=processed_asset_id,
                data=processed_bytes,
                mime_type="image/png",
                suffix="_nobg",
            )
            
            processed_url = upload_result.url
            logger.info(f"Stored processed community asset at: {processed_url}")
            
            # Create/update project override with the processed URL
            existing = supabase.table("project_asset_overrides") \
                .select("id") \
                .eq("project_id", str(project_id)) \
                .eq("asset_id", asset_id) \
                .eq("user_id", current_user.sub) \
                .single() \
                .execute()
            
            if existing.data:
                supabase.table("project_asset_overrides") \
                    .update({
                        "use_processed_url": True,
                        "processed_url": processed_url,
                    }) \
                    .eq("id", existing.data["id"]) \
                    .execute()
            else:
                supabase.table("project_asset_overrides") \
                    .insert({
                        "project_id": str(project_id),
                        "asset_id": asset_id,
                        "user_id": current_user.sub,
                        "use_processed_url": True,
                        "processed_url": processed_url,
                    }) \
                    .execute()
            
            return RemoveBackgroundInProjectResponse(
                asset_id=asset_id,
                project_id=str(project_id),
                processed_url=processed_url,
                use_processed_url=True,
                message="Background removed from community asset for this project",
            )
        
        else:
            # Handle user's own asset - use existing service
            asset = await service.process_background_removal(
                user_id=current_user.sub,
                asset_id=asset_id,
            )
            
            if not asset.processed_url:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Background removal succeeded but no processed URL returned",
                )
            
            # Create/update project override to use processed URL
            existing = supabase.table("project_asset_overrides") \
                .select("id") \
                .eq("project_id", str(project_id)) \
                .eq("asset_id", asset_id) \
                .eq("user_id", current_user.sub) \
                .single() \
                .execute()
            
            if existing.data:
                supabase.table("project_asset_overrides") \
                    .update({"use_processed_url": True}) \
                    .eq("id", existing.data["id"]) \
                    .execute()
            else:
                supabase.table("project_asset_overrides") \
                    .insert({
                        "project_id": str(project_id),
                        "asset_id": asset_id,
                        "user_id": current_user.sub,
                        "use_processed_url": True,
                    }) \
                    .execute()
            
            return RemoveBackgroundInProjectResponse(
                asset_id=asset_id,
                project_id=str(project_id),
                processed_url=asset.processed_url,
                use_processed_url=True,
                message="Background removed and enabled for this project",
            )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Failed to download community asset: {str(e)}")

