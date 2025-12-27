"""
Pydantic schemas for Twitch asset generation endpoints.

This module defines request/response schemas for:
- Individual Twitch asset generation
- Pack generation (seasonal, emote, stream packs)
- Dimension specifications

All schemas use Pydantic v2 syntax with comprehensive validation
and OpenAPI documentation.
"""

from typing import Optional, List, Literal, Tuple
from pydantic import BaseModel, Field
from datetime import datetime


# ============================================================================
# Type Definitions
# ============================================================================

TwitchAssetType = Literal[
    "twitch_emote", "twitch_emote_112", "twitch_emote_56", "twitch_emote_28",
    "twitch_badge", "twitch_badge_36", "twitch_badge_18",
    "twitch_panel", "twitch_offline", "twitch_banner"
]

PackType = Literal["seasonal", "emote", "stream"]

PackStatusEnum = Literal["queued", "processing", "completed", "failed"]


# ============================================================================
# Request Schemas
# ============================================================================

class TwitchGenerateRequest(BaseModel):
    """Request body for generating a single Twitch asset."""
    asset_type: TwitchAssetType = Field(
        ...,
        description="Type of Twitch asset to generate",
        examples=["twitch_emote"]
    )
    brand_kit_id: Optional[str] = Field(
        None,
        description="ID of the brand kit to use for generation (optional - AI uses defaults if not provided)",
        examples=["550e8400-e29b-41d4-a716-446655440000"]
    )
    custom_prompt: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional custom prompt to guide generation (max 500 characters)",
        examples=["Excited streamer celebrating a victory"]
    )
    game_id: Optional[str] = Field(
        None,
        description="Optional game ID for game-specific styling",
        examples=["12345"]
    )
    text_overlay: Optional[str] = Field(
        None,
        max_length=100,
        description="Optional text to overlay on the asset (max 100 characters)",
        examples=["GG", "POG"]
    )
    include_logo: bool = Field(
        default=False,
        description="Whether to include the brand logo in the asset"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "asset_type": "twitch_emote",
                    "brand_kit_id": "550e8400-e29b-41d4-a716-446655440000",
                    "custom_prompt": "Excited streamer celebrating a victory",
                    "game_id": "12345",
                    "text_overlay": "GG",
                    "include_logo": False
                },
                {
                    "asset_type": "twitch_emote",
                    "custom_prompt": "Excited streamer celebrating a victory"
                }
            ]
        }
    }


class PackGenerateRequest(BaseModel):
    """Request body for generating a pack of Twitch assets."""
    pack_type: PackType = Field(
        ...,
        description="Type of asset pack to generate",
        examples=["emote"]
    )
    brand_kit_id: Optional[str] = Field(
        None,
        description="ID of the brand kit to use for generation (optional - AI uses defaults if not provided)",
        examples=["550e8400-e29b-41d4-a716-446655440000"]
    )
    custom_prompt: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional custom prompt to guide pack generation (max 500 characters)",
        examples=["Winter holiday theme with snow and festive colors"]
    )
    game_id: Optional[str] = Field(
        None,
        description="Optional game ID for game-specific styling",
        examples=["12345"]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "pack_type": "seasonal",
                    "brand_kit_id": "550e8400-e29b-41d4-a716-446655440000",
                    "custom_prompt": "Winter holiday theme with snow and festive colors",
                    "game_id": "12345"
                },
                {
                    "pack_type": "emote",
                    "custom_prompt": "Energetic gaming reactions"
                }
            ]
        }
    }


# ============================================================================
# Response Schemas
# ============================================================================

class AssetResponse(BaseModel):
    """Response schema for a generated asset."""
    id: str = Field(
        ...,
        description="Unique asset identifier (UUID)"
    )
    asset_type: str = Field(
        ...,
        description="Type of asset that was generated"
    )
    url: str = Field(
        ...,
        description="URL to access the generated asset"
    )
    width: int = Field(
        ...,
        gt=0,
        description="Width of the asset in pixels"
    )
    height: int = Field(
        ...,
        gt=0,
        description="Height of the asset in pixels"
    )
    file_size: int = Field(
        ...,
        gt=0,
        description="File size in bytes"
    )
    format: str = Field(
        ...,
        description="Image format (e.g., 'png', 'webp')"
    )
    created_at: datetime = Field(
        ...,
        description="Asset creation timestamp"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "660e8400-e29b-41d4-a716-446655440001",
                    "asset_type": "twitch_emote",
                    "url": "https://storage.example.com/assets/emote_123.png",
                    "width": 512,
                    "height": 512,
                    "file_size": 45678,
                    "format": "png",
                    "created_at": "2024-01-15T10:30:00Z"
                }
            ]
        }
    }


class PackResponse(BaseModel):
    """Response schema for a pack generation job."""
    id: str = Field(
        ...,
        description="Unique pack identifier (UUID)"
    )
    pack_type: PackType = Field(
        ...,
        description="Type of asset pack"
    )
    status: PackStatusEnum = Field(
        ...,
        description="Current pack generation status"
    )
    progress: int = Field(
        ...,
        ge=0,
        le=100,
        description="Pack generation progress percentage (0-100)"
    )
    assets: List[AssetResponse] = Field(
        default_factory=list,
        description="List of generated assets in the pack"
    )
    created_at: datetime = Field(
        ...,
        description="Pack creation timestamp"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "770e8400-e29b-41d4-a716-446655440002",
                    "pack_type": "emote",
                    "status": "completed",
                    "progress": 100,
                    "assets": [
                        {
                            "id": "660e8400-e29b-41d4-a716-446655440001",
                            "asset_type": "twitch_emote",
                            "url": "https://storage.example.com/assets/emote_123.png",
                            "width": 512,
                            "height": 512,
                            "file_size": 45678,
                            "format": "png",
                            "created_at": "2024-01-15T10:30:00Z"
                        }
                    ],
                    "created_at": "2024-01-15T10:30:00Z"
                }
            ]
        }
    }


class DimensionSpecResponse(BaseModel):
    """Response schema for dimension specifications."""
    asset_type: str = Field(
        ...,
        description="Asset type identifier"
    )
    generation_size: Tuple[int, int] = Field(
        ...,
        description="AI-optimized generation size (width, height)"
    )
    export_size: Tuple[int, int] = Field(
        ...,
        description="Platform delivery size (width, height)"
    )
    aspect_ratio: str = Field(
        ...,
        description="Human-readable aspect ratio"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "asset_type": "twitch_emote",
                    "generation_size": [1024, 1024],
                    "export_size": [512, 512],
                    "aspect_ratio": "1:1"
                }
            ]
        }
    }


# ============================================================================
# Export all schemas
# ============================================================================

__all__ = [
    # Type definitions
    "TwitchAssetType",
    "PackType",
    "PackStatusEnum",
    # Request schemas
    "TwitchGenerateRequest",
    "PackGenerateRequest",
    # Response schemas
    "AssetResponse",
    "PackResponse",
    "DimensionSpecResponse",
]
