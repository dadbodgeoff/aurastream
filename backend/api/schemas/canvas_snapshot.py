"""
Pydantic schemas for canvas snapshot endpoints.

Canvas snapshots are temporary composite images created from the placement canvas.
They enable single-image generation mode, reducing API costs by sending one
composite image instead of multiple individual assets.
"""

from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class CanvasSnapshotUploadRequest(BaseModel):
    """Request body for uploading a canvas snapshot."""
    
    image_base64: str = Field(
        ...,
        description="Base64 encoded image data (without data URL prefix)",
        min_length=100,  # Minimum reasonable image size
    )
    mime_type: str = Field(
        default="image/png",
        description="MIME type of the image",
        pattern=r"^image/(png|jpeg|webp)$",
    )
    width: int = Field(
        ...,
        gt=0,
        le=8192,
        description="Width of the canvas in pixels",
    )
    height: int = Field(
        ...,
        gt=0,
        le=8192,
        description="Height of the canvas in pixels",
    )
    asset_type: str = Field(
        ...,
        description="Asset type being generated (for context)",
    )
    description: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Optional description of canvas contents for AI context",
    )
    included_assets: Optional[List[str]] = Field(
        default=None,
        max_length=10,
        description="Optional list of asset names included in the snapshot",
    )
    sketch_annotations: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Optional sketch annotations description",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    "mime_type": "image/png",
                    "width": 2560,
                    "height": 1440,
                    "asset_type": "thumbnail",
                    "description": "User face in bottom-right corner, logo in top-left",
                    "included_assets": ["My Face", "Channel Logo"],
                }
            ]
        }
    }


class CanvasSnapshotUploadResponse(BaseModel):
    """Response for canvas snapshot upload."""
    
    url: str = Field(
        ...,
        description="Public URL of the uploaded snapshot",
    )
    storage_path: str = Field(
        ...,
        description="Internal storage path",
    )
    file_size: int = Field(
        ...,
        description="File size in bytes",
    )
    snapshot_id: str = Field(
        ...,
        description="Unique snapshot identifier",
    )
    expires_at: datetime = Field(
        ...,
        description="Expiration time (snapshots are temporary)",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "url": "https://storage.example.com/snapshots/abc123.png",
                    "storage_path": "snapshots/user123/abc123.png",
                    "file_size": 245678,
                    "snapshot_id": "snap_abc123",
                    "expires_at": "2025-01-02T13:00:00Z",
                }
            ]
        }
    }


__all__ = [
    "CanvasSnapshotUploadRequest",
    "CanvasSnapshotUploadResponse",
]
