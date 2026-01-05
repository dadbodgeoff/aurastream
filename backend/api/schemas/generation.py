"""
Pydantic schemas for generation job endpoints.

This module defines request/response schemas for:
- Generation job creation
- Job status and progress tracking
- Job listing with pagination
- Brand customization for generation

All schemas use Pydantic v2 syntax with comprehensive validation
and OpenAPI documentation.
"""

from typing import Optional, List, Literal
from pydantic import BaseModel, Field
from datetime import datetime


# ============================================================================
# Type Definitions
# ============================================================================

AssetTypeEnum = Literal[
    "thumbnail",
    "overlay",
    "banner",
    "story_graphic",
    "clip_cover",
    # Twitch emotes
    "twitch_emote",
    "twitch_emote_112",
    "twitch_emote_56",
    "twitch_emote_28",
    # TikTok emotes
    "tiktok_emote",
    "tiktok_emote_300",
    "tiktok_emote_200",
    "tiktok_emote_100",
    # Other Twitch assets
    "twitch_badge",
    "twitch_panel",
    "twitch_offline",
    # Profile Creator assets
    "profile_picture",
    "streamer_logo",
]
JobStatusEnum = Literal["queued", "processing", "completed", "failed", "partial"]
LogoPositionEnum = Literal["top-left", "top-right", "bottom-left", "bottom-right", "center"]
LogoSizeEnum = Literal["small", "medium", "large"]
BrandIntensityEnum = Literal["subtle", "balanced", "strong"]
TypographyLevelEnum = Literal["display", "headline", "subheadline", "body", "caption", "accent"]
LogoTypeEnum = Literal["primary", "secondary", "icon", "watermark"]
SizeUnitEnum = Literal["percent", "px"]


# ============================================================================
# Asset Placement Schemas
# ============================================================================

class MediaAssetPlacement(BaseModel):
    """
    Precise placement data for a media asset on the generation canvas.
    
    Allows users to specify exact position, size, rotation, and opacity
    for their media assets in the generated output.
    """
    asset_id: str = Field(
        ...,
        description="ID of the media asset to place"
    )
    display_name: str = Field(
        ...,
        description="Display name of the asset"
    )
    asset_type: str = Field(
        ...,
        description="Type of the asset (face, logo, character, etc.)"
    )
    url: str = Field(
        ...,
        description="URL of the asset (preferably processed/transparent version)"
    )
    x: float = Field(
        ...,
        ge=0,
        le=100,
        description="X position as percentage (0-100) from left edge"
    )
    y: float = Field(
        ...,
        ge=0,
        le=100,
        description="Y position as percentage (0-100) from top edge"
    )
    width: float = Field(
        ...,
        gt=0,
        description="Width value (percentage or pixels based on size_unit)"
    )
    height: float = Field(
        ...,
        gt=0,
        description="Height value (percentage or pixels based on size_unit)"
    )
    size_unit: SizeUnitEnum = Field(
        default="percent",
        description="Unit for width/height values"
    )
    z_index: int = Field(
        default=1,
        ge=1,
        description="Layer order (higher = on top)"
    )
    rotation: float = Field(
        default=0,
        ge=0,
        le=360,
        description="Rotation in degrees"
    )
    opacity: float = Field(
        default=100,
        ge=0,
        le=100,
        description="Opacity percentage (0-100)"
    )


# ============================================================================
# Brand Customization Schemas
# ============================================================================

class ColorSelection(BaseModel):
    """User's color selection for generation."""
    primary_index: int = Field(
        default=0,
        ge=0,
        le=4,
        description="Index of primary color to use (0-4)"
    )
    secondary_index: Optional[int] = Field(
        default=None,
        ge=0,
        le=4,
        description="Index of secondary color (optional)"
    )
    accent_index: Optional[int] = Field(
        default=None,
        ge=0,
        le=2,
        description="Index of accent color (optional)"
    )
    use_gradient: Optional[int] = Field(
        default=None,
        ge=0,
        le=2,
        description="Index of gradient to use (optional)"
    )


class TypographySelection(BaseModel):
    """User's typography selection for generation."""
    level: TypographyLevelEnum = Field(
        default="headline",
        description="Typography level to use for main text"
    )


class VoiceSelection(BaseModel):
    """User's voice/tone selection for generation."""
    use_tagline: bool = Field(
        default=False,
        description="Include brand tagline in generation"
    )
    use_catchphrase: Optional[int] = Field(
        default=None,
        description="Index of catchphrase to include (optional)"
    )


class BrandCustomization(BaseModel):
    """
    Complete brand customization for generation.
    
    Allows users to select specific elements from their brand kit
    to use in asset generation. All fields are optional with smart defaults.
    """
    # Color selection
    colors: Optional[ColorSelection] = Field(
        default=None,
        description="Color selection (uses defaults if not specified)"
    )

    # Typography selection
    typography: Optional[TypographySelection] = Field(
        default=None,
        description="Typography selection (uses headline if not specified)"
    )

    # Voice/tone selection
    voice: Optional[VoiceSelection] = Field(
        default=None,
        description="Voice elements to include"
    )

    # Logo options
    include_logo: bool = Field(
        default=False,
        description="Include brand logo in generated asset"
    )
    logo_type: LogoTypeEnum = Field(
        default="primary",
        description="Which logo variation to use"
    )
    logo_position: LogoPositionEnum = Field(
        default="bottom-right",
        description="Position of logo on asset"
    )
    logo_size: LogoSizeEnum = Field(
        default="medium",
        description="Size of logo (small=10%, medium=15%, large=20%)"
    )

    # Style intensity
    brand_intensity: BrandIntensityEnum = Field(
        default="balanced",
        description="How strongly to apply brand elements"
    )


# ============================================================================
# Request Schemas
# ============================================================================

class GenerateRequest(BaseModel):
    """Request body for creating a generation job."""
    asset_type: AssetTypeEnum = Field(
        ...,
        description="Type of asset to generate",
        examples=["thumbnail"]
    )
    brand_kit_id: Optional[str] = Field(
        None,
        description="ID of the brand kit to use for generation (optional - AI uses defaults if not provided)",
        examples=["550e8400-e29b-41d4-a716-446655440000"]
    )
    custom_prompt: Optional[str] = Field(
        None,
        max_length=3000,
        description="Optional custom prompt to guide generation. Canvas Studio prompts may be longer.",
        examples=["Epic gaming moment with dramatic lighting"]
    )
    brand_customization: Optional[BrandCustomization] = Field(
        default=None,
        description="Specific brand elements to use (uses smart defaults if not specified)"
    )
    media_asset_ids: Optional[List[str]] = Field(
        default=None,
        max_length=2,
        description="IDs of Creator Media Library assets to inject (max 2). Pro/Studio only.",
        examples=[["face-asset-id", "logo-asset-id"]]
    )
    media_asset_placements: Optional[List[MediaAssetPlacement]] = Field(
        default=None,
        max_length=2,
        description="Precise placement data for media assets. Overrides media_asset_ids if provided.",
        examples=[[{
            "asset_id": "face-asset-id",
            "display_name": "My Face",
            "asset_type": "face",
            "url": "https://...",
            "x": 85,
            "y": 90,
            "width": 15,
            "height": 15,
            "size_unit": "percent",
            "z_index": 1,
            "rotation": 0,
            "opacity": 100
        }]]
    )
    canvas_snapshot_url: Optional[str] = Field(
        default=None,
        description="URL of canvas snapshot image. When provided, uses single-image mode instead of media_asset_placements. More cost-effective for multiple assets.",
    )
    canvas_snapshot_description: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Description of canvas snapshot contents for AI context (asset names, positions, annotations).",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "asset_type": "thumbnail",
                    "brand_kit_id": "550e8400-e29b-41d4-a716-446655440000",
                    "custom_prompt": "Epic gaming moment with dramatic lighting",
                    "brand_customization": {
                        "colors": {"primary_index": 0},
                        "typography": {"level": "headline"},
                        "include_logo": True,
                        "logo_position": "bottom-right",
                        "brand_intensity": "balanced"
                    }
                },
                {
                    "asset_type": "thumbnail",
                    "custom_prompt": "Vibrant gaming scene with neon colors"
                },
                {
                    "asset_type": "thumbnail",
                    "custom_prompt": "Thumbnail featuring my face and logo",
                    "media_asset_ids": ["face-asset-uuid", "logo-asset-uuid"]
                }
            ]
        }
    }


# ============================================================================
# Response Schemas
# ============================================================================

class JobResponse(BaseModel):
    """Response schema for a generation job."""
    id: str = Field(..., description="Unique job identifier (UUID)")
    user_id: str = Field(..., description="Owner's user ID")
    brand_kit_id: Optional[str] = Field(None, description="Brand kit used for generation (null if AI defaults)")
    asset_type: AssetTypeEnum = Field(..., description="Type of asset being generated")
    status: JobStatusEnum = Field(..., description="Current job status")
    progress: int = Field(..., ge=0, le=100, description="Job progress percentage (0-100)")
    error_message: Optional[str] = Field(None, description="Error message if job failed")
    created_at: datetime = Field(..., description="Job creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    completed_at: Optional[datetime] = Field(None, description="Job completion timestamp")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "660e8400-e29b-41d4-a716-446655440001",
                    "user_id": "770e8400-e29b-41d4-a716-446655440002",
                    "brand_kit_id": "550e8400-e29b-41d4-a716-446655440000",
                    "asset_type": "thumbnail",
                    "status": "completed",
                    "progress": 100,
                    "error_message": None,
                    "created_at": "2024-01-15T10:30:00Z",
                    "updated_at": "2024-01-15T10:32:00Z",
                    "completed_at": "2024-01-15T10:32:00Z"
                }
            ]
        }
    }


class JobListResponse(BaseModel):
    """Response schema for listing generation jobs."""
    jobs: List[JobResponse] = Field(..., description="List of generation jobs")
    total: int = Field(..., description="Total number of jobs matching the filter")
    limit: int = Field(..., description="Maximum number of jobs returned")
    offset: int = Field(..., description="Number of jobs skipped")


# ============================================================================
# Refinement Schemas
# ============================================================================

class RefineJobRequest(BaseModel):
    """
    Request body for refining a completed generation job.
    
    Creates a new job with the original parameters + refinement instruction.
    Dead simple: just tell us what to change.
    """
    refinement: str = Field(
        ...,
        min_length=3,
        max_length=300,
        description="What to change about the generated asset",
        examples=["Make it brighter", "Add more contrast", "Change the background to blue"]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"refinement": "Make it brighter"},
                {"refinement": "Add a glow effect to the text"},
                {"refinement": "Change the background to a darker shade"},
            ]
        }
    }


class RefineJobResponse(BaseModel):
    """Response for job refinement - returns the new job."""
    new_job: JobResponse = Field(..., description="The newly created refinement job")
    original_job_id: str = Field(..., description="ID of the original job that was refined")
    refinement_text: str = Field(..., description="The refinement instruction applied")


# ============================================================================
# Export all schemas
# ============================================================================

__all__ = [
    "AssetTypeEnum",
    "JobStatusEnum",
    "LogoPositionEnum",
    "LogoSizeEnum",
    "BrandIntensityEnum",
    "TypographyLevelEnum",
    "LogoTypeEnum",
    "SizeUnitEnum",
    "MediaAssetPlacement",
    "ColorSelection",
    "TypographySelection",
    "VoiceSelection",
    "BrandCustomization",
    "GenerateRequest",
    "JobResponse",
    "JobListResponse",
    "RefineJobRequest",
    "RefineJobResponse",
]
