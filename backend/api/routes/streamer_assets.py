"""
Streamer Assets Route Handlers for Aurastream.

Endpoints for managing streamer-specific assets:
- Overlays (starting soon, BRB, ending, gameplay)
- Alerts (follow, subscribe, donation, raid)
- Panels (channel info panels)
- Emotes (custom emotes by tier)
- Badges (subscriber badges)
- Facecam frame
- Stinger transition
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel

from backend.api.middleware.auth import get_current_user
from backend.services.jwt_service import TokenPayload
from backend.api.service_dependencies import StreamerAssetServiceDep
from backend.services.exceptions import BrandKitNotFoundError, AuthorizationError, StorageError


router = APIRouter()


# =============================================================================
# Response Schemas
# =============================================================================

class OverlayResponse(BaseModel):
    """Response for overlay upload."""
    id: str
    url: str
    overlay_type: str
    duration_seconds: Optional[int] = None


class AlertResponse(BaseModel):
    """Response for alert upload."""
    id: str
    alert_type: str
    image_url: str
    sound_url: Optional[str] = None
    duration_ms: int


class PanelResponse(BaseModel):
    """Response for panel upload."""
    id: str
    name: str
    image_url: str


class EmoteResponse(BaseModel):
    """Response for emote upload."""
    id: str
    name: str
    url: str
    tier: int


class BadgeResponse(BaseModel):
    """Response for badge upload."""
    id: str
    months: int
    url: str


class FacecamResponse(BaseModel):
    """Response for facecam frame upload."""
    id: str
    url: str
    position: str


class StingerResponse(BaseModel):
    """Response for stinger upload."""
    id: str
    url: str
    duration_ms: int


class DeleteResponse(BaseModel):
    """Response for asset deletion."""
    deleted: bool
    category: str
    asset_id: str


# =============================================================================
# Overlay Endpoints
# =============================================================================

@router.post(
    "/{brand_kit_id}/streamer-assets/overlays",
    response_model=OverlayResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload overlay",
    description="Upload a stream overlay (starting soon, BRB, ending, gameplay).",
    responses={
        201: {"description": "Overlay uploaded successfully"},
        400: {"description": "Invalid file type or size"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized"},
        404: {"description": "Brand kit not found"},
    },
)
async def upload_overlay(
    brand_kit_id: str,
    overlay_type: str = Form(..., description="Type: starting_soon, brb, ending, gameplay"),
    duration_seconds: Optional[int] = Form(default=None, description="Display duration in seconds"),
    file: UploadFile = File(..., description="Overlay image/video file"),
    current_user: TokenPayload = Depends(get_current_user),
    service: StreamerAssetServiceDep = None,
) -> OverlayResponse:
    """Upload a stream overlay."""
    try:
        file_data = await file.read()
        result = await service.upload_overlay(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
            overlay_type=overlay_type,
            file_data=file_data,
            content_type=file.content_type or "application/octet-stream",
            duration_seconds=duration_seconds,
        )
        return OverlayResponse(**result)
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except StorageError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# =============================================================================
# Alert Endpoints
# =============================================================================

@router.post(
    "/{brand_kit_id}/streamer-assets/alerts",
    response_model=AlertResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload alert",
    description="Upload an alert with image and optional sound.",
    responses={
        201: {"description": "Alert uploaded successfully"},
        400: {"description": "Invalid file type or size"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized"},
        404: {"description": "Brand kit not found"},
    },
)
async def upload_alert(
    brand_kit_id: str,
    alert_type: str = Form(..., description="Type: follow, subscribe, donation, raid, bits, gift_sub"),
    duration_ms: int = Form(default=3000, description="Alert duration in milliseconds"),
    image: UploadFile = File(..., description="Alert image/animation"),
    sound: Optional[UploadFile] = File(default=None, description="Alert sound (optional)"),
    current_user: TokenPayload = Depends(get_current_user),
    service: StreamerAssetServiceDep = None,
) -> AlertResponse:
    """Upload an alert with image and optional sound."""
    try:
        image_data = await image.read()
        sound_data = await sound.read() if sound else None
        
        result = await service.upload_alert(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
            alert_type=alert_type,
            image_data=image_data,
            image_content_type=image.content_type or "application/octet-stream",
            sound_data=sound_data,
            sound_content_type=sound.content_type if sound else None,
            duration_ms=duration_ms,
        )
        return AlertResponse(**result)
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except StorageError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# =============================================================================
# Panel Endpoints
# =============================================================================

@router.post(
    "/{brand_kit_id}/streamer-assets/panels",
    response_model=PanelResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload panel",
    description="Upload a channel panel image.",
    responses={
        201: {"description": "Panel uploaded successfully"},
        400: {"description": "Invalid file type or size"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized"},
        404: {"description": "Brand kit not found"},
    },
)
async def upload_panel(
    brand_kit_id: str,
    name: str = Form(..., description="Panel name (e.g., About, Schedule, Rules)"),
    file: UploadFile = File(..., description="Panel image file"),
    current_user: TokenPayload = Depends(get_current_user),
    service: StreamerAssetServiceDep = None,
) -> PanelResponse:
    """Upload a channel panel."""
    try:
        file_data = await file.read()
        result = await service.upload_panel(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
            name=name,
            file_data=file_data,
            content_type=file.content_type or "application/octet-stream",
        )
        return PanelResponse(**result)
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except StorageError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# =============================================================================
# Emote Endpoints
# =============================================================================

@router.post(
    "/{brand_kit_id}/streamer-assets/emotes",
    response_model=EmoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload emote",
    description="Upload a custom emote.",
    responses={
        201: {"description": "Emote uploaded successfully"},
        400: {"description": "Invalid file type or size"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized"},
        404: {"description": "Brand kit not found"},
    },
)
async def upload_emote(
    brand_kit_id: str,
    name: str = Form(..., description="Emote name (without prefix)"),
    tier: int = Form(default=1, description="Subscriber tier (1, 2, or 3)"),
    file: UploadFile = File(..., description="Emote image file"),
    current_user: TokenPayload = Depends(get_current_user),
    service: StreamerAssetServiceDep = None,
) -> EmoteResponse:
    """Upload a custom emote."""
    try:
        file_data = await file.read()
        result = await service.upload_emote(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
            name=name,
            tier=tier,
            file_data=file_data,
            content_type=file.content_type or "application/octet-stream",
        )
        return EmoteResponse(**result)
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except StorageError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# =============================================================================
# Badge Endpoints
# =============================================================================

@router.post(
    "/{brand_kit_id}/streamer-assets/badges",
    response_model=BadgeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload badge",
    description="Upload a subscriber badge.",
    responses={
        201: {"description": "Badge uploaded successfully"},
        400: {"description": "Invalid file type or size"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized"},
        404: {"description": "Brand kit not found"},
    },
)
async def upload_badge(
    brand_kit_id: str,
    months: int = Form(..., description="Months of subscription (1-120)"),
    file: UploadFile = File(..., description="Badge image file"),
    current_user: TokenPayload = Depends(get_current_user),
    service: StreamerAssetServiceDep = None,
) -> BadgeResponse:
    """Upload a subscriber badge."""
    try:
        file_data = await file.read()
        result = await service.upload_badge(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
            months=months,
            file_data=file_data,
            content_type=file.content_type or "application/octet-stream",
        )
        return BadgeResponse(**result)
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except StorageError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# =============================================================================
# Facecam Frame Endpoints
# =============================================================================

@router.post(
    "/{brand_kit_id}/streamer-assets/facecam",
    response_model=FacecamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload facecam frame",
    description="Upload a webcam frame overlay.",
    responses={
        201: {"description": "Facecam frame uploaded successfully"},
        400: {"description": "Invalid file type or size"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized"},
        404: {"description": "Brand kit not found"},
    },
)
async def upload_facecam(
    brand_kit_id: str,
    position: str = Form(default="bottom-right", description="Position on stream"),
    file: UploadFile = File(..., description="Frame image file"),
    current_user: TokenPayload = Depends(get_current_user),
    service: StreamerAssetServiceDep = None,
) -> FacecamResponse:
    """Upload a facecam frame."""
    try:
        file_data = await file.read()
        result = await service.upload_facecam_frame(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
            position=position,
            file_data=file_data,
            content_type=file.content_type or "application/octet-stream",
        )
        return FacecamResponse(**result)
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except StorageError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# =============================================================================
# Stinger Endpoints
# =============================================================================

@router.post(
    "/{brand_kit_id}/streamer-assets/stinger",
    response_model=StingerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload stinger",
    description="Upload a stinger transition animation.",
    responses={
        201: {"description": "Stinger uploaded successfully"},
        400: {"description": "Invalid file type or size"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized"},
        404: {"description": "Brand kit not found"},
    },
)
async def upload_stinger(
    brand_kit_id: str,
    duration_ms: int = Form(default=1000, description="Transition duration in milliseconds"),
    file: UploadFile = File(..., description="Stinger video file"),
    current_user: TokenPayload = Depends(get_current_user),
    service: StreamerAssetServiceDep = None,
) -> StingerResponse:
    """Upload a stinger transition."""
    try:
        file_data = await file.read()
        result = await service.upload_stinger(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
            duration_ms=duration_ms,
            file_data=file_data,
            content_type=file.content_type or "application/octet-stream",
        )
        return StingerResponse(**result)
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except StorageError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# =============================================================================
# Delete Endpoint
# =============================================================================

@router.delete(
    "/{brand_kit_id}/streamer-assets/{category}/{asset_id}",
    response_model=DeleteResponse,
    summary="Delete asset",
    description="Delete a streamer asset by category and ID.",
    responses={
        200: {"description": "Asset deleted successfully"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized"},
        404: {"description": "Brand kit not found"},
    },
)
async def delete_asset(
    brand_kit_id: str,
    category: str,
    asset_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    service: StreamerAssetServiceDep = None,
) -> DeleteResponse:
    """Delete a streamer asset."""
    try:
        deleted = await service.delete_asset(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
            category=category,
            asset_id=asset_id,
        )
        return DeleteResponse(deleted=deleted, category=category, asset_id=asset_id)
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())


__all__ = ["router"]
