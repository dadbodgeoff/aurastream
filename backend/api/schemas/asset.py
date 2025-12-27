"""
Pydantic schemas for asset management endpoints.

This module defines request/response schemas for:
- Asset retrieval and listing
- Asset visibility updates
- Asset metadata
"""

from typing import Optional, List, Literal
from pydantic import BaseModel, Field
from datetime import datetime


# ============================================================================
# Type Definitions
# ============================================================================

AssetTypeEnum = Literal[
    # Original types
    "thumbnail", 
    "overlay", 
    "banner", 
    "story_graphic", 
    "clip_cover",
    "logo",
    # Twitch types
    "twitch_emote",
    "twitch_emote_112",
    "twitch_emote_56",
    "twitch_emote_28",
    "twitch_badge",
    "twitch_panel",
    "twitch_banner",
    "twitch_offline",
    # TikTok types
    "tiktok_emote",
    "tiktok_emote_300",
    "tiktok_emote_200",
    "tiktok_emote_100",
    # Social types
    "tiktok_story",
    "instagram_story",
    "instagram_reel",
]


# ============================================================================
# Request Schemas
# ============================================================================

class AssetVisibilityUpdate(BaseModel):
    """Request body for updating asset visibility."""
    is_public: bool = Field(..., description="Whether the asset should be publicly accessible")


# ============================================================================
# Response Schemas
# ============================================================================

class AssetResponse(BaseModel):
    """Response schema for an asset."""
    id: str = Field(..., description="Unique asset identifier (UUID)")
    job_id: str = Field(..., description="ID of the generation job that created this asset")
    user_id: str = Field(..., description="Owner's user ID")
    asset_type: AssetTypeEnum = Field(..., description="Type of asset")
    url: str = Field(..., description="URL to access the asset")
    width: int = Field(..., description="Asset width in pixels")
    height: int = Field(..., description="Asset height in pixels")
    file_size: int = Field(..., description="File size in bytes")
    is_public: bool = Field(..., description="Whether the asset is publicly accessible")
    viral_score: Optional[int] = Field(None, ge=0, le=100, description="AI-predicted viral score (0-100)")
    created_at: datetime = Field(..., description="Asset creation timestamp")


class AssetListResponse(BaseModel):
    """Response schema for listing assets."""
    assets: List[AssetResponse] = Field(..., description="List of assets")
    total: int = Field(..., description="Total number of assets matching the filter")
    limit: int = Field(..., description="Maximum number of assets returned")
    offset: int = Field(..., description="Number of assets skipped")


# ============================================================================
# Export all schemas
# ============================================================================

__all__ = [
    "AssetTypeEnum",
    "AssetVisibilityUpdate",
    "AssetResponse",
    "AssetListResponse",
]
