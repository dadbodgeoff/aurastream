"""
Canvas Projects Schemas

Pydantic models for canvas project CRUD operations.
"""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class CanvasProjectCreate(BaseModel):
    """Request schema for creating a canvas project."""
    name: str = Field(default="Untitled Project", min_length=1, max_length=255)
    asset_type: str = Field(..., min_length=1, max_length=100)
    sketch_elements: list[dict[str, Any]] = Field(default_factory=list)
    placements: list[dict[str, Any]] = Field(default_factory=list)
    assets: list[dict[str, Any]] = Field(default_factory=list)  # Full MediaAsset objects
    thumbnail_url: Optional[str] = None


class CanvasProjectUpdate(BaseModel):
    """Request schema for updating a canvas project."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    sketch_elements: Optional[list[dict[str, Any]]] = None
    placements: Optional[list[dict[str, Any]]] = None
    assets: Optional[list[dict[str, Any]]] = None  # Full MediaAsset objects
    thumbnail_url: Optional[str] = None


class CanvasProjectResponse(BaseModel):
    """Response schema for a canvas project."""
    id: str
    user_id: str
    name: str
    asset_type: str
    thumbnail_url: Optional[str]
    sketch_elements: list[dict[str, Any]]
    placements: list[dict[str, Any]]
    assets: list[dict[str, Any]]  # Full MediaAsset objects for reconstruction
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CanvasProjectListItem(BaseModel):
    """Lightweight response for project list (without full canvas data)."""
    id: str
    name: str
    asset_type: str
    thumbnail_url: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CanvasProjectListResponse(BaseModel):
    """Response schema for listing canvas projects."""
    projects: list[CanvasProjectListItem]
    total: int
