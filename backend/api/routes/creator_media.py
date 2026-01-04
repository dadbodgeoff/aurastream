"""
Creator Media Library API Routes

Endpoints for managing user-uploaded media assets.
All assets can be injected into generation prompts.
"""

import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.api.middleware.auth import get_current_user
from backend.services.jwt_service import TokenPayload
from backend.api.schemas.creator_media import (
    MediaAssetType,
    MEDIA_ASSET_TYPES,
    UploadMediaRequest,
    UpdateMediaRequest,
    MediaAsset,
    MediaSummary,
    UploadMediaResponse,
    ListMediaResponse,
    MediaLibrarySummaryResponse,
    DeleteMediaResponse,
    BulkDeleteMediaResponse,
    MediaForPrompt,
)
from backend.api.service_dependencies import CreatorMediaServiceDep
from backend.services.creator_media import (
    MEDIA_ASSET_TYPES,
    ASSET_TYPE_DESCRIPTIONS,
    TOTAL_ASSET_LIMIT,
    MAX_PROMPT_INJECTION_ASSETS,
    can_access_media_library,
)
from backend.services.exceptions import StorageError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/media-library", tags=["Creator Media Library"])


# Helper to get service for non-endpoint functions
def _get_service():
    from backend.services.creator_media.service import get_creator_media_service
    return get_creator_media_service()


# ============================================================================
# Access Check Endpoint
# ============================================================================

@router.get("/access")
async def check_access(
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Check if user has access to Media Library.
    
    Media Library is available for Pro and Studio subscribers only.
    Free users will see has_access=false.
    
    NOTE: Fetches current tier from database to handle cases where
    user upgraded but hasn't refreshed their token yet.
    
    Returns:
    - has_access: Whether user can use the library
    - tier: User's current tier
    - total_limit: Maximum assets allowed (25)
    - max_per_prompt: Maximum assets per prompt injection (2)
    - upgrade_message: Message for free users
    """
    # Fetch current tier from database (not token) to handle upgrades
    from backend.database.supabase_client import get_supabase_client
    
    try:
        client = get_supabase_client()
        result = client.table("users").select("subscription_tier").eq("id", current_user.sub).execute()
        if result.data and len(result.data) > 0:
            user_tier = result.data[0].get("subscription_tier", "free")
        else:
            user_tier = getattr(current_user, "tier", "free")
    except Exception as e:
        logger.warning(f"Failed to fetch user tier from DB, using token tier: {e}")
        user_tier = getattr(current_user, "tier", "free")
    
    has_access = can_access_media_library(user_tier)
    
    return {
        "has_access": has_access,
        "tier": user_tier,
        "total_limit": TOTAL_ASSET_LIMIT if has_access else 0,
        "max_per_prompt": MAX_PROMPT_INJECTION_ASSETS if has_access else 0,
        "upgrade_message": None if has_access else (
            "Media Library is available for Pro and Studio subscribers. "
            "Upgrade to upload and inject your own assets into generations."
        ),
    }


# ============================================================================
# Upload Endpoints
# ============================================================================

@router.post("", response_model=UploadMediaResponse)
async def upload_media(
    request: UploadMediaRequest,
    current_user: TokenPayload = Depends(get_current_user),
    service: CreatorMediaServiceDep = None,
):
    """
    Upload a new media asset to the library.
    
    **Pro/Studio only** - Free users cannot access Media Library.
    
    **Limits:**
    - Total: 25 assets across all types
    - Per prompt: 2 assets max
    
    Supported asset types:
    - logo: Brand logos
    - face: User faces for thumbnails
    - character: Character/avatar representations
    - game_skin: Game character skins
    - object: Props, items to include
    - background: Custom backgrounds
    - reference: Style reference images
    - overlay: Stream overlays
    - emote: Channel emotes
    - badge: Subscriber badges
    - panel: Channel panels
    - alert: Alert images
    - facecam_frame: Facecam borders
    - stinger: Transition animations
    """
    
    # Get user tier
    user_tier = getattr(current_user, "tier", "free")
    
    try:
        asset = await service.upload(
            user_id=current_user.sub,
            asset_type=request.asset_type,
            display_name=request.display_name,
            image_base64=request.image_base64,
            description=request.description,
            tags=request.tags,
            is_favorite=request.is_favorite,
            set_as_primary=request.set_as_primary,
            remove_background=request.remove_background,
            metadata=request.metadata,
            user_tier=user_tier,
        )
        
        # Convert dataclass to Pydantic schema
        return UploadMediaResponse(asset=MediaAsset(**asset.to_dict()))
        
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except StorageError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# List & Query Endpoints
# ============================================================================

@router.get("", response_model=ListMediaResponse)
async def list_media(
    asset_type: Optional[MediaAssetType] = Query(default=None),
    tags: Optional[str] = Query(default=None, description="Comma-separated tags"),
    favorites_only: bool = Query(default=False),
    search: Optional[str] = Query(default=None, max_length=100),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    sort_by: str = Query(default="created_at", pattern="^(created_at|updated_at|usage_count|display_name)$"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    current_user: TokenPayload = Depends(get_current_user),
    service: CreatorMediaServiceDep = None,
):
    """
    List media assets with filtering and pagination.
    
    Filter by:
    - asset_type: Specific type (logo, face, character, etc.)
    - tags: Comma-separated tags (any match)
    - favorites_only: Only favorites
    - search: Search in name and description
    
    Sort by:
    - created_at (default)
    - updated_at
    - usage_count
    - display_name
    """
    
    # Parse tags
    tag_list = None
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    
    assets, total = await service.list(
        user_id=current_user.sub,
        asset_type=asset_type,
        tags=tag_list,
        favorites_only=favorites_only,
        search=search,
        limit=limit,
        offset=offset,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    
    # Convert dataclass models to Pydantic schemas
    return ListMediaResponse(
        assets=[MediaAsset(**a.to_dict()) for a in assets],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(assets) < total,
    )


@router.get("/summary", response_model=MediaLibrarySummaryResponse)
async def get_library_summary(
    current_user: TokenPayload = Depends(get_current_user),
    service: CreatorMediaServiceDep = None,
):
    """
    Get summary of the user's media library.
    
    Returns counts by asset type, total assets, and storage used.
    """
    
    summaries, total, storage = await service.get_summary(current_user.sub)
    
    # Convert dataclass models to Pydantic schemas
    return MediaLibrarySummaryResponse(
        summaries=[MediaSummary(**s.to_dict()) for s in summaries],
        total_assets=total,
        storage_used_bytes=storage,
    )


@router.get("/types")
async def get_asset_types():
    """
    Get list of supported asset types.
    
    Returns all valid asset types with descriptions.
    """
    return {
        "types": MEDIA_ASSET_TYPES,
        "descriptions": ASSET_TYPE_DESCRIPTIONS,
    }


@router.get("/primary/{asset_type}", response_model=Optional[MediaAsset])
async def get_primary_asset(
    asset_type: MediaAssetType,
    current_user: TokenPayload = Depends(get_current_user),
    service: CreatorMediaServiceDep = None,
):
    """
    Get the primary asset of a given type.
    
    Returns null if no primary is set.
    """
    
    asset = await service.get_primary(current_user.sub, asset_type)
    
    # Convert dataclass to Pydantic schema if found
    return MediaAsset(**asset.to_dict()) if asset else None


# ============================================================================
# Single Asset Endpoints
# ============================================================================

@router.get("/{asset_id}", response_model=MediaAsset)
async def get_media(
    asset_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    service: CreatorMediaServiceDep = None,
):
    """
    Get a single media asset by ID.
    """
    
    try:
        asset = await service.get(current_user.sub, asset_id)
        return MediaAsset(**asset.to_dict())
    except ValueError:
        raise HTTPException(status_code=404, detail="Media asset not found")


@router.patch("/{asset_id}", response_model=MediaAsset)
async def update_media(
    asset_id: str,
    request: UpdateMediaRequest,
    current_user: TokenPayload = Depends(get_current_user),
    service: CreatorMediaServiceDep = None,
):
    """
    Update a media asset.
    
    Can update:
    - display_name
    - description
    - tags
    - is_favorite
    - is_primary
    - metadata (merged with existing)
    """
    
    try:
        asset = await service.update(
            user_id=current_user.sub,
            asset_id=asset_id,
            display_name=request.display_name,
            description=request.description,
            tags=request.tags,
            is_favorite=request.is_favorite,
            is_primary=request.is_primary,
            metadata=request.metadata,
        )
        return MediaAsset(**asset.to_dict())
    except ValueError:
        raise HTTPException(status_code=404, detail="Media asset not found")


@router.delete("/{asset_id}", response_model=DeleteMediaResponse)
async def delete_media(
    asset_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    service: CreatorMediaServiceDep = None,
):
    """
    Delete a media asset.
    
    Removes from both storage and database.
    """
    
    try:
        await service.delete(current_user.sub, asset_id)
        return DeleteMediaResponse(success=True, message="Asset deleted")
    except ValueError:
        raise HTTPException(status_code=404, detail="Media asset not found")


# ============================================================================
# Bulk Operations
# ============================================================================

@router.post("/bulk-delete", response_model=BulkDeleteMediaResponse)
async def bulk_delete_media(
    asset_ids: List[str],
    current_user: TokenPayload = Depends(get_current_user),
    service: CreatorMediaServiceDep = None,
):
    """
    Delete multiple media assets at once.
    
    Returns count of deleted and any failed IDs.
    """
    if not asset_ids:
        raise HTTPException(status_code=400, detail="No asset IDs provided")
    
    if len(asset_ids) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 assets per request")
    
    deleted, failed = await service.bulk_delete(current_user.sub, asset_ids)
    
    return BulkDeleteMediaResponse(
        deleted_count=deleted,
        failed_ids=failed,
        message=f"Deleted {deleted} assets" + (f", {len(failed)} failed" if failed else ""),
    )


# ============================================================================
# Prompt Injection Endpoints
# ============================================================================

@router.post("/for-prompt", response_model=List[MediaForPrompt])
async def get_media_for_prompt(
    asset_ids: List[str],
    current_user: TokenPayload = Depends(get_current_user),
    service: CreatorMediaServiceDep = None,
):
    """
    Get media assets formatted for prompt injection.
    
    **Pro/Studio only** - Free users cannot access Media Library.
    **Maximum 2 assets per prompt.**
    
    Use this endpoint when preparing assets for a generation request.
    Automatically increments usage count for each asset.
    
    Returns assets with:
    - id
    - asset_type
    - display_name
    - url
    - metadata
    """
    if not asset_ids:
        return []
    
    if len(asset_ids) > MAX_PROMPT_INJECTION_ASSETS:
        raise HTTPException(
            status_code=400, 
            detail=f"Maximum {MAX_PROMPT_INJECTION_ASSETS} assets per prompt"
        )
    user_tier = getattr(current_user, "tier", "free")
    
    try:
        assets = await service.get_for_prompt(
            current_user.sub, 
            asset_ids,
            user_tier=user_tier,
        )
        # Convert dataclass models to Pydantic schemas
        return [MediaForPrompt(**a.to_dict()) for a in assets]
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Favorites Shortcuts
# ============================================================================

@router.post("/{asset_id}/favorite", response_model=MediaAsset)
async def toggle_favorite(
    asset_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    service: CreatorMediaServiceDep = None,
):
    """
    Toggle favorite status of an asset.
    """
    
    try:
        existing = await service.get(current_user.sub, asset_id)
        asset = await service.update(
            user_id=current_user.sub,
            asset_id=asset_id,
            is_favorite=not existing.is_favorite,
        )
        return MediaAsset(**asset.to_dict())
    except ValueError:
        raise HTTPException(status_code=404, detail="Media asset not found")


@router.post("/{asset_id}/set-primary", response_model=MediaAsset)
async def set_as_primary(
    asset_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    service: CreatorMediaServiceDep = None,
):
    """
    Set an asset as the primary of its type.
    
    Automatically unsets any existing primary of the same type.
    """
    
    try:
        asset = await service.update(
            user_id=current_user.sub,
            asset_id=asset_id,
            is_primary=True,
        )
        return MediaAsset(**asset.to_dict())
    except ValueError:
        raise HTTPException(status_code=404, detail="Media asset not found")
