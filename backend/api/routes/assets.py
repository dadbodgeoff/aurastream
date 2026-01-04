"""
Asset Management Route Handlers for Aurastream.

This module implements all asset management endpoints:
- GET /assets - List user's assets with pagination
- GET /assets/{asset_id} - Get asset details
- DELETE /assets/{asset_id} - Delete an asset
- PUT /assets/{asset_id}/visibility - Toggle asset visibility
- GET /asset/{asset_id} - Public asset access (no auth required)
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, Response
from fastapi.responses import RedirectResponse

from backend.api.middleware.auth import get_current_user
from backend.api.schemas.asset import (
    AssetResponse,
    AssetListResponse,
    AssetVisibilityUpdate,
)
from backend.api.service_dependencies import (
    GenerationServiceDep,
    StorageServiceDep,
    AuditServiceDep,
)
from backend.services.jwt_service import TokenPayload
from backend.services.exceptions import (
    AssetNotFoundError,
    AuthorizationError,
)


router = APIRouter()


def _asset_to_response(asset) -> AssetResponse:
    """Convert Asset dataclass to response schema."""
    return AssetResponse(
        id=asset.id,
        job_id=asset.job_id,
        user_id=asset.user_id,
        asset_type=asset.asset_type,
        url=asset.url,
        width=asset.width,
        height=asset.height,
        file_size=asset.file_size,
        is_public=asset.is_public,
        viral_score=asset.viral_score,
        created_at=asset.created_at,
    )


@router.get(
    "/assets",
    response_model=AssetListResponse,
    summary="List assets",
)
async def list_assets(
    asset_type: Optional[str] = Query(None, description="Filter by asset type"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of assets to return"),
    offset: int = Query(0, ge=0, description="Number of assets to skip"),
    current_user: TokenPayload = Depends(get_current_user),
    service: GenerationServiceDep = None,
) -> AssetListResponse:
    """List all assets for the current user."""
    assets = await service.list_assets(
        user_id=current_user.sub,
        asset_type=asset_type,
        limit=limit,
        offset=offset,
    )
    
    return AssetListResponse(
        assets=[_asset_to_response(asset) for asset in assets],
        total=len(assets),  # TODO: Get actual total count from service
        limit=limit,
        offset=offset,
    )


@router.get(
    "/assets/{asset_id}",
    response_model=AssetResponse,
    summary="Get asset details",
)
async def get_asset(
    asset_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    service: GenerationServiceDep = None,
) -> AssetResponse:
    """Get an asset by ID."""
    try:
        asset = await service.get_asset(current_user.sub, asset_id)
        return _asset_to_response(asset)
    except AssetNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.to_dict())


@router.delete(
    "/assets/{asset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete asset",
)
async def delete_asset(
    asset_id: str,
    request: Request,
    current_user: TokenPayload = Depends(get_current_user),
    service: GenerationServiceDep = None,
    storage: StorageServiceDep = None,
    audit: AuditServiceDep = None,
) -> Response:
    """Delete an asset."""
    try:
        # Get asset first to get storage path
        asset = await service.get_asset(current_user.sub, asset_id)
        
        # Delete from storage
        await storage.delete_asset(asset.storage_path)
        
        # Delete from database
        await service.delete_asset(current_user.sub, asset_id)
        
        # Audit log
        await audit.log(
            user_id=current_user.sub,
            action="asset.delete",
            resource_type="asset",
            resource_id=asset_id,
            ip_address=request.client.host if request.client else None,
        )
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)
        
    except AssetNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.to_dict())


@router.put(
    "/assets/{asset_id}/visibility",
    response_model=AssetResponse,
    summary="Update asset visibility",
)
async def update_visibility(
    asset_id: str,
    data: AssetVisibilityUpdate,
    request: Request,
    current_user: TokenPayload = Depends(get_current_user),
    service: GenerationServiceDep = None,
    storage: StorageServiceDep = None,
    audit: AuditServiceDep = None,
) -> AssetResponse:
    """Update asset visibility."""
    try:
        # Update visibility in database
        asset = await service.update_asset_visibility(
            current_user.sub,
            asset_id,
            data.is_public,
        )
        
        # Update storage URL based on visibility
        new_url = await storage.set_visibility(asset.storage_path, data.is_public)
        
        # Audit log
        await audit.log(
            user_id=current_user.sub,
            action="asset.visibility_update",
            resource_type="asset",
            resource_id=asset_id,
            details={"is_public": data.is_public},
            ip_address=request.client.host if request.client else None,
        )
        
        return _asset_to_response(asset)
        
    except AssetNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.to_dict())


@router.get(
    "/asset/{asset_id}",
    summary="Public asset access",
    responses={302: {"description": "Redirect to asset URL"}, 404: {"description": "Asset not found or not public"}},
)
async def get_public_asset(
    asset_id: str,
    service: GenerationServiceDep = None,
) -> RedirectResponse:
    """Get a public asset without authentication."""
    try:
        # Use a system-level query that doesn't require user ownership
        result = service.db.table(service.assets_table).select("*").eq("id", asset_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"message": "Asset not found", "code": "RESOURCE_NOT_FOUND"}})
        
        asset_data = result.data[0]
        
        # Only allow access to public assets
        if not asset_data.get("is_public", False):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"message": "Asset not found", "code": "RESOURCE_NOT_FOUND"}})
        
        # Redirect to the asset URL
        return RedirectResponse(url=asset_data["url"], status_code=status.HTTP_302_FOUND)
        
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"message": "Asset not found", "code": "RESOURCE_NOT_FOUND"}})


__all__ = ["router"]
