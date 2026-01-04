"""
Pydantic schemas for Thumbnail Recreation API.

Handles the recreation flow where users recreate winning thumbnails
with their own face and optional customizations.
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field

from backend.api.schemas.thumbnail_intel import ThumbnailAnalysisResponse


# ============================================================================
# Media Asset Placement Schema (reused from generation.py)
# ============================================================================

SizeUnitEnum = Literal["percent", "px"]


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
# Recreation Request/Response Schemas
# ============================================================================

class RecreateRequest(BaseModel):
    """Request to recreate a thumbnail with user's face."""
    
    # Reference thumbnail info
    video_id: str = Field(..., description="YouTube video ID of reference thumbnail")
    thumbnail_url: str = Field(..., description="URL of reference thumbnail to recreate")
    
    # Pre-analyzed data (from existing analysis - avoids re-analysis)
    analysis: ThumbnailAnalysisResponse = Field(
        ..., 
        description="Pre-analyzed thumbnail data from Gemini"
    )
    
    # User's face - one of these must be provided (if original has face)
    face_image_base64: Optional[str] = Field(
        default=None,
        description="Base64 encoded face image (new upload)"
    )
    face_asset_id: Optional[str] = Field(
        default=None,
        description="ID of saved face asset to use"
    )
    
    # Optional customizations
    custom_text: Optional[str] = Field(
        default=None,
        description="Custom text to replace original (not recommended)"
    )
    use_brand_colors: bool = Field(
        default=False,
        description="Use brand kit colors instead of reference colors"
    )
    brand_kit_id: Optional[str] = Field(
        default=None,
        description="Brand kit ID if using brand colors"
    )
    additional_instructions: Optional[str] = Field(
        default=None,
        description="Additional generation instructions"
    )
    
    # NEW: Creator Media Library integration
    media_asset_ids: Optional[List[str]] = Field(
        default=None,
        max_length=2,
        description="Media asset IDs to include (logo, character, object, etc.). Max 2 assets."
    )
    media_asset_placements: Optional[List[MediaAssetPlacement]] = Field(
        default=None,
        max_length=2,
        description="Precise placement data for media assets. Overrides media_asset_ids if provided."
    )
    
    # Canvas snapshot mode - more cost-effective for complex compositions
    canvas_snapshot_url: Optional[str] = Field(
        default=None,
        description="URL of canvas snapshot image. When provided, uses single-image mode instead of media_asset_placements."
    )
    canvas_snapshot_description: Optional[str] = Field(
        default=None,
        description="Description of canvas contents for AI context."
    )


class RecreateResponse(BaseModel):
    """Response from recreation request."""
    
    recreation_id: str = Field(..., description="Unique recreation ID")
    job_id: str = Field(..., description="Generation job ID for polling")
    status: Literal["queued", "processing", "completed", "failed"] = Field(
        ..., 
        description="Current status"
    )
    estimated_seconds: int = Field(
        default=30,
        description="Estimated time to completion"
    )
    message: str = Field(
        default="Recreation started",
        description="Status message"
    )


class RecreationStatusResponse(BaseModel):
    """Status check response for recreation."""
    
    recreation_id: str
    job_id: str
    status: Literal["queued", "processing", "completed", "failed"]
    progress_percent: int = Field(default=0, ge=0, le=100)
    
    # Result (when completed)
    generated_thumbnail_url: Optional[str] = None
    download_url: Optional[str] = None
    asset_id: Optional[str] = None
    
    # Error (when failed)
    error_message: Optional[str] = None


class RecreationHistoryItem(BaseModel):
    """Single item in recreation history."""
    
    id: str
    reference_video_id: str
    reference_thumbnail_url: str
    generated_thumbnail_url: Optional[str]
    custom_text: Optional[str]
    status: str
    created_at: str


class RecreationHistoryResponse(BaseModel):
    """User's recreation history."""
    
    recreations: List[RecreationHistoryItem]
    total: int


class FaceAsset(BaseModel):
    """Saved face asset for recreation."""
    
    id: str
    display_name: Optional[str]
    original_url: str
    processed_url: Optional[str]  # Background removed version
    is_primary: bool
    created_at: str


class FaceAssetsResponse(BaseModel):
    """User's saved face assets."""
    
    faces: List[FaceAsset]
    total: int


class UploadFaceRequest(BaseModel):
    """Request to upload a new face asset."""
    
    image_base64: str = Field(..., description="Base64 encoded face image")
    display_name: Optional[str] = Field(default=None, description="Optional name for this face")
    set_as_primary: bool = Field(default=False, description="Set as primary face")


class UploadFaceResponse(BaseModel):
    """Response from face upload."""
    
    face: FaceAsset
    message: str = "Face uploaded successfully"
