"""
Logo Generation API Routes for Aurastream.

Endpoints for generating logo/PFP assets using vibe-based templates.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from backend.api.middleware.auth import get_current_user, TokenPayload
from backend.api.service_dependencies import LogoGenerationServiceDep
from backend.services.logo_generation_service import (
    LogoGenerationRequest,
    VALID_ICONS,
)
from backend.services.exceptions import ValidationError


router = APIRouter()


# =============================================================================
# Schemas
# =============================================================================

class LogoVibeResponse(BaseModel):
    """Response schema for a single logo vibe/style."""
    key: str
    name: str
    description: str
    tags: list[str] = []


class LogoVibesResponse(BaseModel):
    """Response schema for available logo vibes."""
    vibes: list[LogoVibeResponse]


class LogoIconsResponse(BaseModel):
    """Response schema for available icons."""
    icons: list[str]


class LogoFormSchemaResponse(BaseModel):
    """Response schema for logo form configuration."""
    placeholders: list[dict]


class GenerateLogoRequest(BaseModel):
    """Request schema for logo generation."""
    name: str = Field(..., min_length=1, max_length=50, description="Brand/channel name")
    icon: str = Field(..., description="Icon type (wolf, dragon, etc.)")
    vibe: str = Field(..., description="Style/vibe key")
    background_color: str = Field(..., pattern=r'^#[0-9A-Fa-f]{6}$', description="Hex color")


class GenerateLogoResponse(BaseModel):
    """Response schema for logo generation."""
    prompt: str
    dimensions: dict
    vibe_name: str
    job_id: Optional[str] = None


class LogoPreviewRequest(BaseModel):
    """Request schema for logo prompt preview (no generation)."""
    name: str = Field(..., min_length=1, max_length=50)
    icon: str
    vibe: str
    background_color: str = Field(..., pattern=r'^#[0-9A-Fa-f]{6}$')


class LogoPreviewResponse(BaseModel):
    """Response schema for logo prompt preview."""
    prompt: str
    vibe_name: str
    estimated_tokens: int


# =============================================================================
# Endpoints
# =============================================================================

@router.get(
    "/vibes",
    response_model=LogoVibesResponse,
    summary="Get available logo styles",
    description="Returns all available logo vibes/styles with descriptions."
)
async def get_logo_vibes(
    service: LogoGenerationServiceDep,
):
    """Get all available logo generation styles."""
    vibes = service.get_available_vibes()
    
    return LogoVibesResponse(
        vibes=[LogoVibeResponse(**v) for v in vibes]
    )


@router.get(
    "/icons",
    response_model=LogoIconsResponse,
    summary="Get available icons",
    description="Returns all valid icon options for logo generation."
)
async def get_logo_icons():
    """Get all available icon options."""
    return LogoIconsResponse(icons=sorted(list(VALID_ICONS)))


@router.get(
    "/form-schema",
    response_model=LogoFormSchemaResponse,
    summary="Get logo form schema",
    description="Returns the form configuration for logo generation UI."
)
async def get_logo_form_schema(
    service: LogoGenerationServiceDep,
):
    """Get the form schema for dynamic UI generation."""
    placeholders = service.get_form_schema()
    
    return LogoFormSchemaResponse(placeholders=placeholders)


@router.post(
    "/preview",
    response_model=LogoPreviewResponse,
    summary="Preview logo prompt",
    description="Generate a prompt preview without creating a generation job."
)
async def preview_logo_prompt(
    request: LogoPreviewRequest,
    current_user: TokenPayload = Depends(get_current_user),
    service: LogoGenerationServiceDep = None,
):
    """
    Preview the generated prompt without starting generation.
    
    Useful for users to see what prompt will be sent to AI.
    """
    try:
        gen_request = LogoGenerationRequest(
            name=request.name,
            icon=request.icon,
            vibe=request.vibe,
            background_color=request.background_color,
            user_id=current_user.sub
        )
        
        result = service.build_prompt(gen_request)
        
        # Rough token estimate (4 chars per token average)
        estimated_tokens = len(result.prompt) // 4
        
        return LogoPreviewResponse(
            prompt=result.prompt,
            vibe_name=result.vibe_name,
            estimated_tokens=estimated_tokens
        )
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.to_dict()
        )


@router.post(
    "/generate",
    response_model=GenerateLogoResponse,
    summary="Generate a logo",
    description="Start a logo generation job with the specified parameters."
)
async def generate_logo(
    request: GenerateLogoRequest,
    current_user: TokenPayload = Depends(get_current_user),
    service: LogoGenerationServiceDep = None,
):
    """
    Generate a logo/PFP asset.
    
    Creates a generation job and returns the job ID for tracking.
    """
    try:
        gen_request = LogoGenerationRequest(
            name=request.name,
            icon=request.icon,
            vibe=request.vibe,
            background_color=request.background_color,
            user_id=current_user.sub
        )
        
        result = service.build_prompt(gen_request)
        
        # TODO: Integrate with generation_service to create actual job
        # For now, return the prompt that would be used
        # job_id = await generation_service.create_job(
        #     user_id=current_user.sub,
        #     asset_type="logo",
        #     prompt=result.prompt,
        #     dimensions=result.dimensions
        # )
        
        return GenerateLogoResponse(
            prompt=result.prompt,
            dimensions=result.dimensions,
            vibe_name=result.vibe_name,
            job_id=None  # Will be populated when integrated with generation service
        )
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.to_dict()
        )


# =============================================================================
# Exports
# =============================================================================

__all__ = ["router"]
