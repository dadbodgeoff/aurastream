"""
Creator Media Library Schemas

Pydantic schemas for the unified Creator Media Library.
Supports all user-uploaded assets that can be injected into generation prompts.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field


# ============================================================================
# Asset Type Definitions
# ============================================================================

MediaAssetType = Literal[
    "logo",           # Brand logos
    "face",           # User faces for thumbnails
    "character",      # Character/avatar representations
    "game_skin",      # Game character skins
    "object",         # Props, items to include
    "background",     # Custom backgrounds
    "reference",      # Style reference images
    "overlay",        # Stream overlays
    "emote",          # Channel emotes
    "badge",          # Subscriber badges
    "panel",          # Channel panels
    "alert",          # Alert images
    "facecam_frame",  # Facecam borders
    "stinger",        # Transition animations
]

MEDIA_ASSET_TYPES: List[MediaAssetType] = [
    "logo", "face", "character", "game_skin", "object", "background",
    "reference", "overlay", "emote", "badge", "panel", "alert",
    "facecam_frame", "stinger"
]


# ============================================================================
# Type-Specific Metadata Schemas
# ============================================================================

class LogoMetadata(BaseModel):
    """Metadata for logo assets."""
    logo_variant: Optional[Literal["primary", "secondary", "icon", "monochrome", "watermark"]] = None
    transparent: bool = True
    brand_kit_id: Optional[str] = None


class FaceMetadata(BaseModel):
    """Metadata for face assets."""
    expression: Optional[str] = None  # happy, surprised, serious, etc.
    angle: Optional[Literal["front", "side", "three_quarter"]] = "front"
    processed: bool = False  # Background removed
    processed_url: Optional[str] = None


class CharacterMetadata(BaseModel):
    """Metadata for character/avatar assets."""
    style: Optional[str] = None  # anime, realistic, cartoon, pixel
    outfit: Optional[str] = None
    pose: Optional[str] = None
    color_scheme: Optional[List[str]] = None


class GameSkinMetadata(BaseModel):
    """Metadata for game skin assets."""
    game: Optional[str] = None  # fortnite, valorant, league, etc.
    character_name: Optional[str] = None
    skin_name: Optional[str] = None
    rarity: Optional[str] = None  # common, rare, epic, legendary


class ObjectMetadata(BaseModel):
    """Metadata for object/prop assets."""
    category: Optional[str] = None  # prop, item, weapon, food, etc.
    transparent: bool = True


class BackgroundMetadata(BaseModel):
    """Metadata for background assets."""
    style: Optional[str] = None  # gradient, scene, abstract, gaming
    mood: Optional[str] = None  # energetic, calm, dark, vibrant
    colors: Optional[List[str]] = None


class ReferenceMetadata(BaseModel):
    """Metadata for reference images."""
    source: Optional[str] = None  # youtube, twitch, custom
    video_id: Optional[str] = None
    original_creator: Optional[str] = None
    notes: Optional[str] = None


# ============================================================================
# Request Schemas
# ============================================================================

class UploadMediaRequest(BaseModel):
    """Request to upload a new media asset."""
    asset_type: MediaAssetType = Field(
        ...,
        description="Type of media asset"
    )
    display_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Display name for the asset"
    )
    description: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional description"
    )
    image_base64: str = Field(
        ...,
        description="Base64-encoded image data"
    )
    tags: Optional[List[str]] = Field(
        default=None,
        max_length=20,
        description="Tags for organization (max 20)"
    )
    is_favorite: bool = Field(
        default=False,
        description="Mark as favorite"
    )
    set_as_primary: bool = Field(
        default=False,
        description="Set as primary asset of this type"
    )
    remove_background: Optional[bool] = Field(
        default=None,
        description="Remove background from image. Defaults based on asset type (True for face/logo/character/object/emote/badge, False for background/reference/panel)"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Type-specific metadata"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "asset_type": "face",
                    "display_name": "My Streaming Face",
                    "description": "Happy expression for thumbnails",
                    "image_base64": "iVBORw0KGgo...",
                    "tags": ["happy", "front-facing"],
                    "is_favorite": True,
                    "set_as_primary": True,
                    "remove_background": True,
                    "metadata": {"expression": "happy", "angle": "front"}
                }
            ]
        }
    }


class UpdateMediaRequest(BaseModel):
    """Request to update a media asset."""
    display_name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=100
    )
    description: Optional[str] = Field(
        default=None,
        max_length=500
    )
    tags: Optional[List[str]] = Field(
        default=None,
        max_length=20
    )
    is_favorite: Optional[bool] = None
    is_primary: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None


class ListMediaRequest(BaseModel):
    """Query parameters for listing media assets."""
    asset_type: Optional[MediaAssetType] = None
    tags: Optional[List[str]] = None
    favorites_only: bool = False
    search: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
    sort_by: Literal["created_at", "updated_at", "usage_count", "display_name"] = "created_at"
    sort_order: Literal["asc", "desc"] = "desc"


# ============================================================================
# Response Schemas
# ============================================================================

class MediaAsset(BaseModel):
    """A single media asset."""
    id: str
    user_id: str
    asset_type: MediaAssetType
    display_name: str
    description: Optional[str] = None
    url: str
    storage_path: str
    thumbnail_url: Optional[str] = None
    processed_url: Optional[str] = None  # Background-removed version
    processed_storage_path: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    tags: List[str] = []
    is_favorite: bool = False
    is_primary: bool = False
    has_background_removed: bool = False
    metadata: Dict[str, Any] = {}
    usage_count: int = 0
    last_used_at: Optional[str] = None
    created_at: str
    updated_at: str

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "user_id": "user-123",
                    "asset_type": "face",
                    "display_name": "My Streaming Face",
                    "description": "Happy expression for thumbnails",
                    "url": "https://storage.example.com/faces/user-123/asset.png",
                    "storage_path": "creator-media/user-123/face/asset.png",
                    "thumbnail_url": "https://storage.example.com/faces/user-123/asset_thumb.png",
                    "processed_url": "https://storage.example.com/faces/user-123/asset_processed.png",
                    "processed_storage_path": "creator-media/user-123/face/asset_processed.png",
                    "file_size": 245000,
                    "mime_type": "image/png",
                    "width": 512,
                    "height": 512,
                    "tags": ["happy", "front-facing"],
                    "is_favorite": True,
                    "is_primary": True,
                    "has_background_removed": True,
                    "metadata": {"expression": "happy", "angle": "front"},
                    "usage_count": 15,
                    "last_used_at": "2025-01-01T12:00:00Z",
                    "created_at": "2024-12-01T10:00:00Z",
                    "updated_at": "2025-01-01T12:00:00Z"
                }
            ]
        }
    }


class UploadMediaResponse(BaseModel):
    """Response after uploading a media asset."""
    asset: MediaAsset
    message: str = "Asset uploaded successfully"


class ListMediaResponse(BaseModel):
    """Response for listing media assets."""
    assets: List[MediaAsset]
    total: int
    limit: int
    offset: int
    has_more: bool


class MediaSummary(BaseModel):
    """Summary of media assets by type."""
    asset_type: MediaAssetType
    total_count: int
    favorite_count: int
    latest_upload: Optional[str] = None


class MediaLibrarySummaryResponse(BaseModel):
    """Full summary of user's media library."""
    summaries: List[MediaSummary]
    total_assets: int
    storage_used_bytes: int


class DeleteMediaResponse(BaseModel):
    """Response after deleting a media asset."""
    success: bool
    message: str


class BulkDeleteMediaResponse(BaseModel):
    """Response after bulk deleting media assets."""
    deleted_count: int
    failed_ids: List[str] = []
    message: str


# ============================================================================
# Prompt Injection Schemas
# ============================================================================

class MediaForPrompt(BaseModel):
    """Media asset formatted for prompt injection."""
    id: str
    asset_type: MediaAssetType
    display_name: str
    url: str
    metadata: Dict[str, Any] = {}
    
    def to_prompt_context(self) -> str:
        """Generate prompt context string for this asset."""
        context_parts = [f"[{self.asset_type.upper()}] {self.display_name}"]
        
        if self.asset_type == "face":
            if self.metadata.get("expression"):
                context_parts.append(f"Expression: {self.metadata['expression']}")
            if self.metadata.get("angle"):
                context_parts.append(f"Angle: {self.metadata['angle']}")
        elif self.asset_type == "character":
            if self.metadata.get("style"):
                context_parts.append(f"Style: {self.metadata['style']}")
        elif self.asset_type == "game_skin":
            if self.metadata.get("game"):
                context_parts.append(f"Game: {self.metadata['game']}")
            if self.metadata.get("character_name"):
                context_parts.append(f"Character: {self.metadata['character_name']}")
        
        return " | ".join(context_parts)


class SelectedMediaForGeneration(BaseModel):
    """Media assets selected for a generation request."""
    face_id: Optional[str] = None
    logo_id: Optional[str] = None
    character_id: Optional[str] = None
    background_id: Optional[str] = None
    reference_ids: Optional[List[str]] = None
    object_ids: Optional[List[str]] = None
    game_skin_id: Optional[str] = None
    
    def has_any(self) -> bool:
        """Check if any media is selected."""
        return any([
            self.face_id, self.logo_id, self.character_id,
            self.background_id, self.reference_ids, self.object_ids,
            self.game_skin_id
        ])
