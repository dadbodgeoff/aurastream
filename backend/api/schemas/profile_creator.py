"""
Pydantic schemas for Profile Creator endpoints.

This module defines request/response schemas for:
- Profile picture and logo creation sessions
- Coach-guided creation flow
- Generation from session

All schemas use Pydantic v2 syntax.
"""

from typing import Optional, List, Literal, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


# ============================================================================
# Type Definitions
# ============================================================================

CreationTypeEnum = Literal["profile_picture", "streamer_logo"]

StylePresetEnum = Literal[
    "gaming",      # Bold, dynamic, gaming aesthetic
    "minimal",     # Clean, simple, modern
    "vibrant",     # Colorful, energetic
    "anime",       # Anime/manga style
    "retro",       # Pixel art, 8-bit style
    "professional", # Clean, corporate look
    "custom",      # User-defined style
]

BackgroundTypeEnum = Literal["transparent", "solid", "gradient"]

OutputSizeEnum = Literal["small", "medium", "large"]

OutputFormatEnum = Literal["png", "webp"]


# ============================================================================
# Brand Context (reused from coach)
# ============================================================================

class ColorInfo(BaseModel):
    """Color information from brand kit."""
    hex: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")
    name: str = Field(..., min_length=1, max_length=50)


class BrandContext(BaseModel):
    """Brand kit context for profile creation."""
    brand_kit_id: Optional[str] = None
    brand_name: Optional[str] = None
    primary_colors: Optional[List[ColorInfo]] = None
    accent_colors: Optional[List[ColorInfo]] = None
    tone: Optional[str] = None


# ============================================================================
# Request Schemas
# ============================================================================

class ProfileCreatorAccessRequest(BaseModel):
    """Request to check profile creator access."""
    pass  # No body needed, uses auth token


class StartProfileCreatorRequest(BaseModel):
    """Request to start a profile creator session."""
    creation_type: CreationTypeEnum = Field(
        ...,
        description="Type of creation: profile_picture or streamer_logo"
    )
    brand_context: Optional[BrandContext] = Field(
        None,
        description="Brand kit context (optional)"
    )
    initial_description: Optional[str] = Field(
        None,
        max_length=500,
        description="Initial description of what user wants"
    )
    style_preset: Optional[StylePresetEnum] = Field(
        None,
        description="Quick-start style preset"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "creation_type": "profile_picture",
                    "style_preset": "gaming",
                    "initial_description": "A cool gaming avatar with my brand colors"
                }
            ]
        }
    }


class ContinueSessionRequest(BaseModel):
    """Request to continue a profile creator session."""
    message: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="User's message to continue the conversation"
    )


class GenerateFromSessionRequest(BaseModel):
    """Request to generate from a completed session."""
    output_size: OutputSizeEnum = Field(
        default="medium",
        description="Output size: small (256px), medium (512px), large (1024px)"
    )
    output_format: OutputFormatEnum = Field(
        default="png",
        description="Output format"
    )
    background: BackgroundTypeEnum = Field(
        default="transparent",
        description="Background type"
    )
    background_color: Optional[str] = Field(
        None,
        pattern=r"^#[0-9A-Fa-f]{6}$",
        description="Background color if solid (hex)"
    )


# ============================================================================
# Response Schemas
# ============================================================================

class ProfileCreatorAccessResponse(BaseModel):
    """Response for access check."""
    can_use: bool = Field(..., description="Whether user can create")
    used: int = Field(..., description="Creations used this month")
    limit: int = Field(..., description="Monthly limit")
    remaining: int = Field(..., description="Remaining creations")
    tier: str = Field(..., description="User's subscription tier")
    resets_at: Optional[str] = Field(None, description="When usage resets")


class SessionStateResponse(BaseModel):
    """Response with session state."""
    session_id: str
    creation_type: CreationTypeEnum
    status: Literal["active", "ready", "generating", "completed", "expired"]
    style_preset: Optional[StylePresetEnum]
    refined_description: Optional[str]
    is_ready: bool = Field(default=False, description="Ready for generation")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    turns_used: int = Field(default=0)
    turns_remaining: int = Field(default=10)
    created_at: str
    expires_at: str


class GenerationResultResponse(BaseModel):
    """Response after generation."""
    job_id: str
    asset_id: Optional[str] = None
    status: Literal["queued", "processing", "completed", "failed"]
    asset_url: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    created_at: str


class GalleryItemResponse(BaseModel):
    """Single item in the gallery."""
    id: str
    creation_type: CreationTypeEnum
    asset_url: str
    thumbnail_url: Optional[str] = None
    width: int
    height: int
    style_preset: Optional[StylePresetEnum]
    prompt_used: Optional[str]
    created_at: str


class GalleryResponse(BaseModel):
    """Response for gallery listing."""
    items: List[GalleryItemResponse]
    total: int
    limit: int
    offset: int


# ============================================================================
# SSE Stream Chunk Types (same as coach)
# ============================================================================

StreamChunkTypeEnum = Literal[
    "token",
    "intent_ready",
    "done",
    "error",
]


class StreamChunkMetadata(BaseModel):
    """Metadata for stream chunks."""
    is_ready: Optional[bool] = None
    confidence: Optional[float] = None
    refined_description: Optional[str] = None
    session_id: Optional[str] = None
    turns_used: Optional[int] = None
    turns_remaining: Optional[int] = None


# ============================================================================
# Export
# ============================================================================

__all__ = [
    "CreationTypeEnum",
    "StylePresetEnum",
    "BackgroundTypeEnum",
    "OutputSizeEnum",
    "OutputFormatEnum",
    "ColorInfo",
    "BrandContext",
    "StartProfileCreatorRequest",
    "ContinueSessionRequest",
    "GenerateFromSessionRequest",
    "ProfileCreatorAccessResponse",
    "SessionStateResponse",
    "GenerationResultResponse",
    "GalleryItemResponse",
    "GalleryResponse",
    "StreamChunkTypeEnum",
    "StreamChunkMetadata",
]
