"""
Community Hub Schemas

Pydantic models for the Community Hub API - pre-loaded assets for Canvas Studio.
"""

from typing import Optional, List, Literal
from datetime import datetime
from pydantic import BaseModel, Field


# ============================================================================
# Type Definitions
# ============================================================================

MediaAssetType = Literal[
    'logo', 'face', 'character', 'game_skin', 'object', 'background',
    'reference', 'overlay', 'emote', 'badge', 'panel', 'alert',
    'facecam_frame', 'stinger'
]

MEDIA_ASSET_TYPES: List[MediaAssetType] = [
    'logo', 'face', 'character', 'game_skin', 'object', 'background',
    'reference', 'overlay', 'emote', 'badge', 'panel', 'alert',
    'facecam_frame', 'stinger'
]


# ============================================================================
# Response Models
# ============================================================================

class CommunityHubAsset(BaseModel):
    """A pre-loaded community hub asset."""
    id: str
    asset_type: MediaAssetType
    game_category: str
    display_name: str
    description: Optional[str] = None
    url: str
    storage_path: str
    thumbnail_url: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    tags: List[str] = Field(default_factory=list)
    is_featured: bool = False
    is_premium: bool = False
    usage_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CommunityHubCategory(BaseModel):
    """A game category in the community hub."""
    id: str
    slug: str
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    color: Optional[str] = None
    asset_count: int = 0
    is_active: bool = True

    class Config:
        from_attributes = True


class ListCommunityHubAssetsResponse(BaseModel):
    """Response for listing community hub assets."""
    assets: List[CommunityHubAsset]
    total: int
    limit: int
    offset: int
    has_more: bool


class ListCommunityHubCategoriesResponse(BaseModel):
    """Response for listing categories."""
    categories: List[CommunityHubCategory]


class CommunityHubSummaryResponse(BaseModel):
    """Summary stats for the community hub."""
    total_assets: int
    total_categories: int
    featured_count: int
