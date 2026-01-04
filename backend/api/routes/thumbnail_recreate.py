"""
Thumbnail Recreation API Routes

Endpoints for recreating winning thumbnails with user's face.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.api.middleware.auth import get_current_user
from backend.services.jwt_service import TokenPayload
from backend.api.schemas.thumbnail_recreate import (
    RecreateRequest,
    RecreateResponse,
    RecreationStatusResponse,
    RecreationHistoryResponse,
    FaceAssetsResponse,
    FaceAsset,
    UploadFaceRequest,
    UploadFaceResponse,
)
from backend.api.service_dependencies import (
    ThumbnailRecreateServiceDep,
    UsageLimitServiceDep,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/thumbnails", tags=["Thumbnail Recreation"])


@router.post("/recreate", response_model=RecreateResponse)
async def recreate_thumbnail(
    request: RecreateRequest,
    current_user: TokenPayload = Depends(get_current_user),
    service: ThumbnailRecreateServiceDep = None,
    usage_service: UsageLimitServiceDep = None,
):
    """
    Recreate a winning thumbnail with user's face.
    
    Takes a reference thumbnail (with pre-analyzed data) and user's face,
    then generates a recreation that matches the original's style.
    
    Requires either face_image_base64 (new upload) or face_asset_id (saved face).
    
    **Usage Limits:**
    - Free: Counts toward 3 creations/month
    - Pro: Counts toward 50 creations/month
    - Studio: Unlimited
    """
    # Check usage limits (counts as a creation)
    usage = await usage_service.check_limit(current_user.sub, "creations")
    
    if not usage.can_use:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "CREATION_LIMIT_REACHED",
                "message": f"You've used all {usage.limit} creations this month",
                "used": usage.used,
                "limit": usage.limit,
                "tier": usage.tier,
                "upgrade_url": "/dashboard/settings?tab=subscription",
            }
        )
    
    # Validate face input
    if not request.face_image_base64 and not request.face_asset_id:
        # Allow recreation without face if original has no face
        if request.analysis.has_face:
            raise HTTPException(
                status_code=400,
                detail="Face image required. Provide face_image_base64 or face_asset_id."
            )
    
    try:
        result = await service.recreate(
            user_id=current_user.sub,
            video_id=request.video_id,
            thumbnail_url=request.thumbnail_url,
            analysis=request.analysis,
            face_image_base64=request.face_image_base64,
            face_asset_id=request.face_asset_id,
            custom_text=request.custom_text,
            use_brand_colors=request.use_brand_colors,
            brand_kit_id=request.brand_kit_id,
            additional_instructions=request.additional_instructions,
            # Media asset data (legacy mode - individual placements)
            media_asset_ids=request.media_asset_ids,
            media_asset_placements=[p.model_dump() for p in request.media_asset_placements] if request.media_asset_placements else None,
            # Canvas snapshot mode - single image with composition (more cost-effective)
            canvas_snapshot_url=request.canvas_snapshot_url,
            canvas_snapshot_description=request.canvas_snapshot_description,
        )
        
        # Increment usage counter after successful creation
        await usage_service.increment(current_user.sub, "creations")
        
        return RecreateResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Recreation failed: {e}")
        raise HTTPException(status_code=500, detail="Recreation failed")


@router.get("/recreate/{recreation_id}", response_model=RecreationStatusResponse)
async def get_recreation_status(
    recreation_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    service: ThumbnailRecreateServiceDep = None,
):
    """
    Check status of a thumbnail recreation.
    
    Poll this endpoint to track progress and get the result when complete.
    """
    
    try:
        result = await service.get_status(
            user_id=current_user.sub,
            recreation_id=recreation_id,
        )
        
        return RecreationStatusResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        raise HTTPException(status_code=500, detail="Status check failed")


@router.get("/recreations", response_model=RecreationHistoryResponse)
async def get_recreation_history(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: TokenPayload = Depends(get_current_user),
    service: ThumbnailRecreateServiceDep = None,
):
    """
    Get user's thumbnail recreation history.
    
    Returns past recreations with their status and results.
    """
    
    result = await service.get_history(
        user_id=current_user.sub,
        limit=limit,
        offset=offset,
    )
    
    return RecreationHistoryResponse(**result)


@router.get("/faces", response_model=FaceAssetsResponse)
async def get_face_assets(
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Get user's saved face assets.
    
    Returns faces that can be used for recreation.
    """
    from backend.database.supabase_client import get_supabase_client
    
    db = get_supabase_client()
    
    result = db.table("user_face_assets") \
        .select("*") \
        .eq("user_id", current_user.sub) \
        .order("created_at", desc=True) \
        .execute()
    
    faces = [
        FaceAsset(
            id=f["id"],
            display_name=f.get("display_name"),
            original_url=f["original_url"],
            processed_url=f.get("processed_url"),
            is_primary=f.get("is_primary", False),
            created_at=f["created_at"],
        )
        for f in result.data
    ]
    
    return FaceAssetsResponse(faces=faces, total=len(faces))


@router.post("/faces", response_model=UploadFaceResponse)
async def upload_face_asset(
    request: UploadFaceRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Upload a new face asset for recreation.
    
    The face will be processed (background removal) and saved for future use.
    """
    import base64
    from uuid import uuid4
    from datetime import datetime, timezone
    from backend.database.supabase_client import get_supabase_client
    
    db = get_supabase_client()
    
    # Validate base64 image
    try:
        image_data = base64.b64decode(request.image_base64)
        if len(image_data) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="Image too large (max 10MB)")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image")
    
    # Generate asset ID
    asset_id = str(uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Upload to storage
    storage_path = f"faces/{current_user.sub}/{asset_id}.png"
    
    try:
        # Upload original image
        db.storage.from_("user-assets").upload(
            storage_path,
            image_data,
            {"content-type": "image/png"}
        )
        
        # Get public URL
        original_url = db.storage.from_("user-assets").get_public_url(storage_path)
        
        # If setting as primary, unset other primaries
        if request.set_as_primary:
            db.table("user_face_assets") \
                .update({"is_primary": False}) \
                .eq("user_id", current_user.sub) \
                .execute()
        
        # Save asset record
        data = {
            "id": asset_id,
            "user_id": current_user.sub,
            "display_name": request.display_name,
            "original_url": original_url,
            "processed_url": None,  # TODO: Background removal
            "is_primary": request.set_as_primary,
            "created_at": now,
        }
        
        db.table("user_face_assets").insert(data).execute()
        
        face = FaceAsset(
            id=asset_id,
            display_name=request.display_name,
            original_url=original_url,
            processed_url=None,
            is_primary=request.set_as_primary,
            created_at=now,
        )
        
        return UploadFaceResponse(face=face)
        
    except Exception as e:
        logger.error(f"Face upload failed: {e}")
        raise HTTPException(status_code=500, detail="Face upload failed")


@router.delete("/faces/{face_id}")
async def delete_face_asset(
    face_id: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Delete a saved face asset.
    """
    from backend.database.supabase_client import get_supabase_client
    
    db = get_supabase_client()
    
    # Verify ownership
    result = db.table("user_face_assets") \
        .select("id") \
        .eq("id", face_id) \
        .eq("user_id", current_user.sub) \
        .execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Face asset not found")
    
    # Delete from storage and database
    storage_path = f"faces/{current_user.sub}/{face_id}.png"
    
    try:
        db.storage.from_("user-assets").remove([storage_path])
    except Exception:
        pass  # Storage deletion is best-effort
    
    db.table("user_face_assets") \
        .delete() \
        .eq("id", face_id) \
        .execute()
    
    return {"success": True, "message": "Face asset deleted"}
