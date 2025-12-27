"""
Brand Kit Route Handlers for Aurastream.

This module implements all brand kit endpoints:
- GET /brand-kits - List user's brand kits
- POST /brand-kits - Create a new brand kit
- GET /brand-kits/active - Get the active brand kit
- GET /brand-kits/{id} - Get a brand kit by ID
- PUT /brand-kits/{id} - Update a brand kit
- DELETE /brand-kits/{id} - Delete a brand kit
- POST /brand-kits/{id}/activate - Set as active brand kit

All endpoints require authentication and enforce ownership.

Security Features:
- All operations verify user ownership
- Maximum 10 brand kits per user enforced
- Audit logging for brand kit operations
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request

from backend.api.middleware.auth import get_current_user
from backend.api.schemas.brand_kit import (
    BrandKitCreate,
    BrandKitUpdate,
    BrandKitResponse,
    BrandKitListResponse,
    BrandKitFonts,
)
from backend.services.brand_kit_service import get_brand_kit_service
from backend.services.audit_service import get_audit_service
from backend.services.jwt_service import TokenPayload
from backend.services.exceptions import (
    BrandKitNotFoundError,
    BrandKitLimitExceededError,
    AuthorizationError,
)
from backend.api.schemas.brand_kit_enhanced import (
    ColorPalette,
    Typography,
    BrandVoice,
    BrandGuidelines,
)
from pydantic import BaseModel


# =============================================================================
# Extended Response Schemas
# =============================================================================

class ColorPaletteResponse(BaseModel):
    """Response for extended color palette."""
    brand_kit_id: str
    colors: ColorPalette


class TypographyResponse(BaseModel):
    """Response for typography hierarchy."""
    brand_kit_id: str
    typography: Typography


class VoiceResponse(BaseModel):
    """Response for brand voice configuration."""
    brand_kit_id: str
    voice: BrandVoice


class GuidelinesResponse(BaseModel):
    """Response for brand guidelines."""
    brand_kit_id: str
    guidelines: BrandGuidelines


router = APIRouter()


def _brand_kit_to_response(brand_kit: dict) -> BrandKitResponse:
    """
    Convert brand kit dict to response schema.
    
    Args:
        brand_kit: Brand kit dictionary from database/service
        
    Returns:
        BrandKitResponse: Pydantic schema for API response
    """
    return BrandKitResponse(
        id=brand_kit["id"],
        user_id=brand_kit["user_id"],
        name=brand_kit["name"],
        is_active=brand_kit["is_active"],
        primary_colors=brand_kit["primary_colors"],
        accent_colors=brand_kit["accent_colors"],
        fonts=BrandKitFonts(**brand_kit["fonts"]),
        logo_url=brand_kit.get("logo_url"),
        tone=brand_kit["tone"],
        style_reference=brand_kit.get("style_reference", ""),
        extracted_from=brand_kit.get("extracted_from"),
        created_at=brand_kit["created_at"],
        updated_at=brand_kit["updated_at"],
    )


# =============================================================================
# GET /brand-kits - List user's brand kits
# =============================================================================

@router.get(
    "",
    response_model=BrandKitListResponse,
    summary="List brand kits",
    description="""
    Get all brand kits for the authenticated user.
    
    **Returns:**
    - List of brand kits ordered by creation date (newest first)
    - Total count of brand kits
    - ID of the currently active brand kit (if any)
    
    **Note:** Requires authentication via Bearer token or cookie.
    """,
    responses={
        200: {"description": "Brand kits retrieved successfully"},
        401: {"description": "Authentication required"},
    },
)
async def list_brand_kits(
    current_user: TokenPayload = Depends(get_current_user),
) -> BrandKitListResponse:
    """
    List all brand kits for the current user.
    
    Retrieves all brand kits owned by the authenticated user,
    ordered by creation date (newest first).
    
    Args:
        current_user: Authenticated user's token payload
        
    Returns:
        BrandKitListResponse: List of brand kits with metadata
    """
    service = get_brand_kit_service()
    brand_kits = await service.list(current_user.sub)
    
    responses = [_brand_kit_to_response(bk) for bk in brand_kits]
    active_id = next((bk.id for bk in responses if bk.is_active), None)
    
    return BrandKitListResponse(
        brand_kits=responses,
        total=len(responses),
        active_id=active_id,
    )


# =============================================================================
# POST /brand-kits - Create a new brand kit
# =============================================================================

@router.post(
    "",
    response_model=BrandKitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create brand kit",
    description="""
    Create a new brand kit for the authenticated user.
    
    **Validation Requirements:**
    - Name: 1-100 characters, cannot be empty or whitespace only
    - Primary Colors: 1-5 hex colors in #RRGGBB format
    - Accent Colors: 0-3 hex colors in #RRGGBB format
    - Fonts: Must be from the supported fonts list
    - Tone: Must be one of: competitive, casual, educational, comedic, professional
    
    **Limits:**
    - Maximum 10 brand kits per user
    
    **Error Responses:**
    - 403: Brand kit limit exceeded (10 max)
    - 422: Validation failed
    """,
    responses={
        201: {"description": "Brand kit created successfully"},
        401: {"description": "Authentication required"},
        403: {"description": "Brand kit limit exceeded"},
        422: {"description": "Validation error"},
    },
)
async def create_brand_kit(
    data: BrandKitCreate,
    request: Request,
    current_user: TokenPayload = Depends(get_current_user),
) -> BrandKitResponse:
    """
    Create a new brand kit.
    
    Creates a new brand kit with the provided configuration.
    The brand kit is initially inactive.
    
    Args:
        data: BrandKitCreate with brand kit configuration
        request: FastAPI request object for audit logging
        current_user: Authenticated user's token payload
        
    Returns:
        BrandKitResponse: Created brand kit data
        
    Raises:
        HTTPException: 403 if brand kit limit exceeded
        HTTPException: 422 if validation fails
    """
    service = get_brand_kit_service()
    
    try:
        brand_kit = await service.create(
            user_id=current_user.sub,
            data=data,
        )
        
        # Audit log the creation
        audit = get_audit_service()
        await audit.log(
            user_id=current_user.sub,
            action="brand_kit.create",
            resource_type="brand_kit",
            resource_id=brand_kit["id"],
            details={"name": brand_kit["name"]},
            ip_address=request.client.host if request.client else None,
        )
        
        return _brand_kit_to_response(brand_kit)
        
    except BrandKitLimitExceededError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.to_dict(),
        )


# =============================================================================
# GET /brand-kits/active - Get the active brand kit
# =============================================================================

@router.get(
    "/active",
    response_model=Optional[BrandKitResponse],
    summary="Get active brand kit",
    description="""
    Get the currently active brand kit for the authenticated user.
    
    **Returns:**
    - The active brand kit if one is set
    - null if no brand kit is currently active
    
    **Note:** Only one brand kit can be active at a time per user.
    """,
    responses={
        200: {"description": "Active brand kit retrieved (or null if none)"},
        401: {"description": "Authentication required"},
    },
)
async def get_active_brand_kit(
    current_user: TokenPayload = Depends(get_current_user),
) -> Optional[BrandKitResponse]:
    """
    Get the user's active brand kit.
    
    Returns the currently active brand kit, or null if no brand kit
    is set as active.
    
    Args:
        current_user: Authenticated user's token payload
        
    Returns:
        BrandKitResponse or None: Active brand kit or null
    """
    service = get_brand_kit_service()
    brand_kit = await service.get_active(current_user.sub)
    
    if brand_kit is None:
        return None
    
    return _brand_kit_to_response(brand_kit)


# =============================================================================
# GET /brand-kits/{brand_kit_id} - Get a brand kit by ID
# =============================================================================

@router.get(
    "/{brand_kit_id}",
    response_model=BrandKitResponse,
    summary="Get brand kit",
    description="""
    Get a specific brand kit by ID.
    
    **Authorization:**
    - User must own the brand kit
    
    **Error Responses:**
    - 403: User does not own this brand kit
    - 404: Brand kit not found
    """,
    responses={
        200: {"description": "Brand kit retrieved successfully"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized to access this brand kit"},
        404: {"description": "Brand kit not found"},
    },
)
async def get_brand_kit(
    brand_kit_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> BrandKitResponse:
    """
    Get a brand kit by ID.
    
    Retrieves a specific brand kit. The user must own the brand kit
    to access it.
    
    Args:
        brand_kit_id: UUID of the brand kit
        current_user: Authenticated user's token payload
        
    Returns:
        BrandKitResponse: Brand kit data
        
    Raises:
        HTTPException: 403 if user doesn't own the brand kit
        HTTPException: 404 if brand kit not found
    """
    service = get_brand_kit_service()
    
    try:
        brand_kit = await service.get(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
        )
        
        return _brand_kit_to_response(brand_kit)
        
    except BrandKitNotFoundError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.to_dict(),
        )
    except AuthorizationError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.to_dict(),
        )


# =============================================================================
# PUT /brand-kits/{brand_kit_id} - Update a brand kit
# =============================================================================

@router.put(
    "/{brand_kit_id}",
    response_model=BrandKitResponse,
    summary="Update brand kit",
    description="""
    Update an existing brand kit.
    
    **Partial Updates:**
    - Only provided fields will be updated
    - Omitted fields retain their current values
    
    **Authorization:**
    - User must own the brand kit
    
    **Validation:**
    - Same validation rules as creation apply to updated fields
    
    **Error Responses:**
    - 403: User does not own this brand kit
    - 404: Brand kit not found
    - 422: Validation failed
    """,
    responses={
        200: {"description": "Brand kit updated successfully"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized to update this brand kit"},
        404: {"description": "Brand kit not found"},
        422: {"description": "Validation error"},
    },
)
async def update_brand_kit(
    brand_kit_id: str,
    data: BrandKitUpdate,
    request: Request,
    current_user: TokenPayload = Depends(get_current_user),
) -> BrandKitResponse:
    """
    Update a brand kit.
    
    Updates an existing brand kit with the provided data.
    Only non-null fields in the request will be updated.
    
    Args:
        brand_kit_id: UUID of the brand kit
        data: BrandKitUpdate with fields to update
        request: FastAPI request object for audit logging
        current_user: Authenticated user's token payload
        
    Returns:
        BrandKitResponse: Updated brand kit data
        
    Raises:
        HTTPException: 403 if user doesn't own the brand kit
        HTTPException: 404 if brand kit not found
        HTTPException: 422 if validation fails
    """
    service = get_brand_kit_service()
    
    try:
        brand_kit = await service.update(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
            data=data,
        )
        
        # Audit log the update
        audit = get_audit_service()
        await audit.log(
            user_id=current_user.sub,
            action="brand_kit.update",
            resource_type="brand_kit",
            resource_id=brand_kit["id"],
            details={"name": brand_kit["name"]},
            ip_address=request.client.host if request.client else None,
        )
        
        return _brand_kit_to_response(brand_kit)
        
    except BrandKitNotFoundError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.to_dict(),
        )
    except AuthorizationError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.to_dict(),
        )


# =============================================================================
# DELETE /brand-kits/{brand_kit_id} - Delete a brand kit
# =============================================================================

@router.delete(
    "/{brand_kit_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete brand kit",
    description="""
    Delete a brand kit.
    
    **Authorization:**
    - User must own the brand kit
    
    **Note:** This action is permanent and cannot be undone.
    
    **Error Responses:**
    - 403: User does not own this brand kit
    - 404: Brand kit not found
    """,
    responses={
        204: {"description": "Brand kit deleted successfully"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized to delete this brand kit"},
        404: {"description": "Brand kit not found"},
    },
)
async def delete_brand_kit(
    brand_kit_id: str,
    request: Request,
    current_user: TokenPayload = Depends(get_current_user),
) -> Response:
    """
    Delete a brand kit.
    
    Permanently deletes a brand kit. The user must own the brand kit
    to delete it.
    
    Args:
        brand_kit_id: UUID of the brand kit
        request: FastAPI request object for audit logging
        current_user: Authenticated user's token payload
        
    Returns:
        Response: Empty response with 204 status
        
    Raises:
        HTTPException: 403 if user doesn't own the brand kit
        HTTPException: 404 if brand kit not found
    """
    service = get_brand_kit_service()
    
    try:
        await service.delete(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
        )
        
        # Audit log the deletion
        audit = get_audit_service()
        await audit.log(
            user_id=current_user.sub,
            action="brand_kit.delete",
            resource_type="brand_kit",
            resource_id=brand_kit_id,
            details={},
            ip_address=request.client.host if request.client else None,
        )
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)
        
    except BrandKitNotFoundError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.to_dict(),
        )
    except AuthorizationError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.to_dict(),
        )


# =============================================================================
# POST /brand-kits/{brand_kit_id}/activate - Activate a brand kit
# =============================================================================

@router.post(
    "/{brand_kit_id}/activate",
    response_model=BrandKitResponse,
    summary="Activate brand kit",
    description="""
    Set a brand kit as the active brand kit.
    
    **Behavior:**
    - Deactivates any currently active brand kit
    - Sets the specified brand kit as active
    - Only one brand kit can be active at a time
    
    **Authorization:**
    - User must own the brand kit
    
    **Error Responses:**
    - 403: User does not own this brand kit
    - 404: Brand kit not found
    """,
    responses={
        200: {"description": "Brand kit activated successfully"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized to activate this brand kit"},
        404: {"description": "Brand kit not found"},
    },
)
async def activate_brand_kit(
    brand_kit_id: str,
    request: Request,
    current_user: TokenPayload = Depends(get_current_user),
) -> BrandKitResponse:
    """
    Activate a brand kit.
    
    Sets the specified brand kit as the active brand kit for the user.
    Any previously active brand kit will be deactivated.
    
    Args:
        brand_kit_id: UUID of the brand kit to activate
        request: FastAPI request object for audit logging
        current_user: Authenticated user's token payload
        
    Returns:
        BrandKitResponse: Activated brand kit data with is_active=True
        
    Raises:
        HTTPException: 403 if user doesn't own the brand kit
        HTTPException: 404 if brand kit not found
    """
    service = get_brand_kit_service()
    
    try:
        brand_kit = await service.activate(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
        )
        
        # Audit log the activation
        audit = get_audit_service()
        await audit.log(
            user_id=current_user.sub,
            action="brand_kit.activate",
            resource_type="brand_kit",
            resource_id=brand_kit["id"],
            details={"name": brand_kit["name"]},
            ip_address=request.client.host if request.client else None,
        )
        
        return _brand_kit_to_response(brand_kit)
        
    except BrandKitNotFoundError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.to_dict(),
        )
    except AuthorizationError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.to_dict(),
        )


# =============================================================================
# Extended Brand Kit Endpoints
# =============================================================================

@router.put(
    "/{brand_kit_id}/colors",
    response_model=ColorPaletteResponse,
    summary="Update extended colors",
    description="Update the extended color palette for a brand kit.",
    responses={
        200: {"description": "Colors updated successfully"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized"},
        404: {"description": "Brand kit not found"},
    },
)
async def update_colors(
    brand_kit_id: str,
    colors: ColorPalette,
    current_user: TokenPayload = Depends(get_current_user),
) -> ColorPaletteResponse:
    """Update extended color palette."""
    service = get_brand_kit_service()
    try:
        await service.update_colors_extended(
            current_user.sub, brand_kit_id, colors.model_dump()
        )
        return ColorPaletteResponse(brand_kit_id=brand_kit_id, colors=colors)
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())


@router.get(
    "/{brand_kit_id}/colors",
    response_model=ColorPaletteResponse,
    summary="Get extended colors",
    description="Get the extended color palette for a brand kit.",
    responses={
        200: {"description": "Colors retrieved successfully"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized"},
        404: {"description": "Brand kit not found"},
    },
)
async def get_colors(
    brand_kit_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> ColorPaletteResponse:
    """Get extended color palette."""
    service = get_brand_kit_service()
    try:
        brand_kit = await service.get(current_user.sub, brand_kit_id)
        colors_data = brand_kit.get("colors_extended", {})
        return ColorPaletteResponse(
            brand_kit_id=brand_kit_id,
            colors=ColorPalette(**colors_data) if colors_data else ColorPalette()
        )
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())


@router.put(
    "/{brand_kit_id}/typography",
    response_model=TypographyResponse,
    summary="Update typography",
    description="Update the typography hierarchy for a brand kit.",
    responses={
        200: {"description": "Typography updated successfully"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized"},
        404: {"description": "Brand kit not found"},
    },
)
async def update_typography(
    brand_kit_id: str,
    typography: Typography,
    current_user: TokenPayload = Depends(get_current_user),
) -> TypographyResponse:
    """Update typography hierarchy."""
    service = get_brand_kit_service()
    try:
        await service.update_typography(
            current_user.sub, brand_kit_id, typography.model_dump(exclude_none=True)
        )
        return TypographyResponse(brand_kit_id=brand_kit_id, typography=typography)
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())


@router.get(
    "/{brand_kit_id}/typography",
    response_model=TypographyResponse,
    summary="Get typography",
    description="Get the typography hierarchy for a brand kit.",
    responses={
        200: {"description": "Typography retrieved successfully"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized"},
        404: {"description": "Brand kit not found"},
    },
)
async def get_typography(
    brand_kit_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> TypographyResponse:
    """Get typography hierarchy."""
    service = get_brand_kit_service()
    try:
        brand_kit = await service.get(current_user.sub, brand_kit_id)
        typo_data = brand_kit.get("typography", {})
        return TypographyResponse(
            brand_kit_id=brand_kit_id,
            typography=Typography(**typo_data) if typo_data else Typography()
        )
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())


@router.put(
    "/{brand_kit_id}/voice",
    response_model=VoiceResponse,
    summary="Update brand voice",
    description="Update the brand voice configuration for a brand kit.",
    responses={
        200: {"description": "Voice updated successfully"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized"},
        404: {"description": "Brand kit not found"},
    },
)
async def update_voice(
    brand_kit_id: str,
    voice: BrandVoice,
    current_user: TokenPayload = Depends(get_current_user),
) -> VoiceResponse:
    """Update brand voice configuration."""
    service = get_brand_kit_service()
    try:
        await service.update_voice(
            current_user.sub, brand_kit_id, voice.model_dump()
        )
        return VoiceResponse(brand_kit_id=brand_kit_id, voice=voice)
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())


@router.get(
    "/{brand_kit_id}/voice",
    response_model=VoiceResponse,
    summary="Get brand voice",
    description="Get the brand voice configuration for a brand kit.",
    responses={
        200: {"description": "Voice retrieved successfully"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized"},
        404: {"description": "Brand kit not found"},
    },
)
async def get_voice(
    brand_kit_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> VoiceResponse:
    """Get brand voice configuration."""
    service = get_brand_kit_service()
    try:
        brand_kit = await service.get(current_user.sub, brand_kit_id)
        voice_data = brand_kit.get("voice", {})
        return VoiceResponse(
            brand_kit_id=brand_kit_id,
            voice=BrandVoice(**voice_data) if voice_data else BrandVoice()
        )
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())


@router.put(
    "/{brand_kit_id}/guidelines",
    response_model=GuidelinesResponse,
    summary="Update brand guidelines",
    description="Update the brand usage guidelines for a brand kit.",
    responses={
        200: {"description": "Guidelines updated successfully"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized"},
        404: {"description": "Brand kit not found"},
    },
)
async def update_guidelines(
    brand_kit_id: str,
    guidelines: BrandGuidelines,
    current_user: TokenPayload = Depends(get_current_user),
) -> GuidelinesResponse:
    """Update brand usage guidelines."""
    service = get_brand_kit_service()
    try:
        await service.update_guidelines(
            current_user.sub, brand_kit_id, guidelines.model_dump()
        )
        return GuidelinesResponse(brand_kit_id=brand_kit_id, guidelines=guidelines)
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())


@router.get(
    "/{brand_kit_id}/guidelines",
    response_model=GuidelinesResponse,
    summary="Get brand guidelines",
    description="Get the brand usage guidelines for a brand kit.",
    responses={
        200: {"description": "Guidelines retrieved successfully"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized"},
        404: {"description": "Brand kit not found"},
    },
)
async def get_guidelines(
    brand_kit_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> GuidelinesResponse:
    """Get brand usage guidelines."""
    service = get_brand_kit_service()
    try:
        brand_kit = await service.get(current_user.sub, brand_kit_id)
        guidelines_data = brand_kit.get("guidelines", {})
        return GuidelinesResponse(
            brand_kit_id=brand_kit_id,
            guidelines=BrandGuidelines(**guidelines_data) if guidelines_data else BrandGuidelines()
        )
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())


__all__ = ["router"]
