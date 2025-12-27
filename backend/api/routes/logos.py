"""
Logo Management Route Handlers for Aurastream.

This module implements logo upload and management endpoints:
- POST /brand-kits/{id}/logos - Upload a logo
- GET /brand-kits/{id}/logos - List all logos
- GET /brand-kits/{id}/logos/{type} - Get specific logo URL
- DELETE /brand-kits/{id}/logos/{type} - Delete a logo
"""

from typing import Optional, Dict, Literal
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel, Field

from backend.api.middleware.auth import get_current_user
from backend.services.jwt_service import TokenPayload
from backend.services.logo_service import (
    get_logo_service,
    LogoType,
    LOGO_TYPES,
    ALLOWED_LOGO_TYPES,
    MAX_LOGO_SIZE,
)
from backend.services.brand_kit_service import get_brand_kit_service
from backend.services.exceptions import (
    BrandKitNotFoundError,
    AuthorizationError,
    StorageError,
)


router = APIRouter()


# =============================================================================
# Response Schemas
# =============================================================================

class LogoUploadResponse(BaseModel):
    """Response for logo upload."""
    type: str = Field(..., description="Logo type")
    url: str = Field(..., description="Signed URL to access the logo")
    storage_path: str = Field(..., description="Storage path")
    content_type: str = Field(..., description="MIME type")
    file_size: int = Field(..., description="File size in bytes")
    filename: Optional[str] = Field(None, description="Original filename")


class LogoListResponse(BaseModel):
    """Response for listing logos."""
    brand_kit_id: str = Field(..., description="Brand kit ID")
    logos: Dict[str, Optional[str]] = Field(
        ..., 
        description="Map of logo type to URL (null if not uploaded)"
    )
    default_logo_type: str = Field(
        default="primary",
        description="The default logo type used for asset generation"
    )


class LogoUrlResponse(BaseModel):
    """Response for getting a logo URL."""
    type: str = Field(..., description="Logo type")
    url: Optional[str] = Field(None, description="Signed URL or null if not found")


class LogoDeleteResponse(BaseModel):
    """Response for logo deletion."""
    type: str = Field(..., description="Logo type")
    deleted: bool = Field(..., description="Whether the logo was deleted")


class SetDefaultLogoRequest(BaseModel):
    """Request to set the default logo type."""
    logo_type: str = Field(..., description="Logo type to set as default")


class SetDefaultLogoResponse(BaseModel):
    """Response for setting default logo."""
    default_logo_type: str = Field(..., description="The new default logo type")


# =============================================================================
# Helper Functions
# =============================================================================

async def verify_brand_kit_ownership(user_id: str, brand_kit_id: str) -> None:
    """Verify user owns the brand kit."""
    brand_kit_service = get_brand_kit_service()
    try:
        await brand_kit_service.get(user_id, brand_kit_id)
    except BrandKitNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "BRAND_KIT_NOT_FOUND", "message": "Brand kit not found"}
        )
    except AuthorizationError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "You don't have access to this brand kit"}
        )


# =============================================================================
# Endpoints
# =============================================================================

@router.post(
    "/brand-kits/{brand_kit_id}/logos",
    response_model=LogoUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a logo",
    description="""
Upload a logo for a brand kit.

**Logo Types:**
- `primary` - Main logo (recommended for AI generation)
- `secondary` - Alternative logo
- `icon` - Icon-only version (favicon, small displays)
- `monochrome` - Single-color version
- `watermark` - Transparent watermark for overlays

**Allowed File Types:** PNG, JPEG, WebP, SVG
**Max File Size:** 10MB
""",
)
async def upload_logo(
    brand_kit_id: str,
    logo_type: str = Form(..., description="Logo type (primary, secondary, icon, monochrome, watermark)"),
    file: UploadFile = File(..., description="Logo image file"),
    current_user: TokenPayload = Depends(get_current_user),
) -> LogoUploadResponse:
    """Upload a logo for a brand kit."""
    # Validate logo type
    if logo_type not in LOGO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_LOGO_TYPE",
                "message": f"Invalid logo type: {logo_type}. Must be one of: {LOGO_TYPES}"
            }
        )
    
    # Validate content type
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_LOGO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_FILE_TYPE",
                "message": f"Invalid file type: {content_type}. Allowed: PNG, JPEG, WebP, SVG"
            }
        )
    
    # Verify brand kit ownership
    await verify_brand_kit_ownership(current_user.sub, brand_kit_id)
    
    # Read file data
    file_data = await file.read()
    
    # Validate file size
    if len(file_data) > MAX_LOGO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "FILE_TOO_LARGE",
                "message": f"File too large: {len(file_data)} bytes. Maximum: 10MB"
            }
        )
    
    # Upload logo
    logo_service = get_logo_service()
    try:
        result = await logo_service.upload_logo(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
            logo_type=logo_type,
            file_data=file_data,
            content_type=content_type,
            filename=file.filename,
        )
        return LogoUploadResponse(**result)
    except StorageError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "STORAGE_ERROR", "message": str(e)}
        )


@router.get(
    "/brand-kits/{brand_kit_id}/logos",
    response_model=LogoListResponse,
    summary="List all logos",
    description="Get all logos for a brand kit with their signed URLs.",
)
async def list_logos(
    brand_kit_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> LogoListResponse:
    """List all logos for a brand kit."""
    # Verify brand kit ownership
    await verify_brand_kit_ownership(current_user.sub, brand_kit_id)
    
    # Get logos
    logo_service = get_logo_service()
    logos = await logo_service.list_logos(
        user_id=current_user.sub,
        brand_kit_id=brand_kit_id,
    )
    
    # Get default logo type
    default_logo_type = await logo_service.get_default_logo_type(
        user_id=current_user.sub,
        brand_kit_id=brand_kit_id,
    )
    
    return LogoListResponse(
        brand_kit_id=brand_kit_id, 
        logos=logos,
        default_logo_type=default_logo_type,
    )


@router.get(
    "/brand-kits/{brand_kit_id}/logos/{logo_type}",
    response_model=LogoUrlResponse,
    summary="Get logo URL",
    description="Get the signed URL for a specific logo type.",
)
async def get_logo(
    brand_kit_id: str,
    logo_type: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> LogoUrlResponse:
    """Get URL for a specific logo."""
    # Validate logo type
    if logo_type not in LOGO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_LOGO_TYPE",
                "message": f"Invalid logo type: {logo_type}. Must be one of: {LOGO_TYPES}"
            }
        )
    
    # Verify brand kit ownership
    await verify_brand_kit_ownership(current_user.sub, brand_kit_id)
    
    # Get logo URL
    logo_service = get_logo_service()
    url = await logo_service.get_logo_url(
        user_id=current_user.sub,
        brand_kit_id=brand_kit_id,
        logo_type=logo_type,
    )
    
    return LogoUrlResponse(type=logo_type, url=url)


@router.delete(
    "/brand-kits/{brand_kit_id}/logos/{logo_type}",
    response_model=LogoDeleteResponse,
    summary="Delete a logo",
    description="Delete a specific logo from a brand kit.",
)
async def delete_logo(
    brand_kit_id: str,
    logo_type: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> LogoDeleteResponse:
    """Delete a logo from a brand kit."""
    # Validate logo type
    if logo_type not in LOGO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_LOGO_TYPE",
                "message": f"Invalid logo type: {logo_type}. Must be one of: {LOGO_TYPES}"
            }
        )
    
    # Verify brand kit ownership
    await verify_brand_kit_ownership(current_user.sub, brand_kit_id)
    
    # Delete logo
    logo_service = get_logo_service()
    deleted = await logo_service.delete_logo(
        user_id=current_user.sub,
        brand_kit_id=brand_kit_id,
        logo_type=logo_type,
    )
    
    return LogoDeleteResponse(type=logo_type, deleted=deleted)


@router.put(
    "/brand-kits/{brand_kit_id}/logos/default",
    response_model=SetDefaultLogoResponse,
    summary="Set default logo",
    description="Set which logo type is used by default for asset generation.",
)
async def set_default_logo(
    brand_kit_id: str,
    data: SetDefaultLogoRequest,
    current_user: TokenPayload = Depends(get_current_user),
) -> SetDefaultLogoResponse:
    """Set the default logo type for a brand kit."""
    # Validate logo type
    if data.logo_type not in LOGO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_LOGO_TYPE",
                "message": f"Invalid logo type: {data.logo_type}. Must be one of: {LOGO_TYPES}"
            }
        )
    
    # Verify brand kit ownership
    await verify_brand_kit_ownership(current_user.sub, brand_kit_id)
    
    # Set default logo
    logo_service = get_logo_service()
    await logo_service.set_default_logo_type(
        user_id=current_user.sub,
        brand_kit_id=brand_kit_id,
        logo_type=data.logo_type,
    )
    
    return SetDefaultLogoResponse(default_logo_type=data.logo_type)


__all__ = ["router"]
