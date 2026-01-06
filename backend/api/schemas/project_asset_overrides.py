"""
Project Asset Overrides Schemas

Pydantic models for per-project asset state management.
Enables project-scoped settings like background removal without affecting other projects.
"""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class ProjectAssetOverride(BaseModel):
    """A single project-asset override record."""
    id: str
    project_id: str
    asset_id: str
    user_id: str
    use_processed_url: bool = False
    processed_url: Optional[str] = None  # For community assets - stores user's processed version
    custom_crop: Optional[dict[str, Any]] = None
    custom_filters: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectAssetOverrideCreate(BaseModel):
    """Request to create/update a project asset override."""
    asset_id: str = Field(..., description="The media asset ID")
    use_processed_url: bool = Field(
        default=False, 
        description="Whether to use the background-removed version in this project"
    )
    custom_crop: Optional[dict[str, Any]] = Field(
        default=None,
        description="Project-specific crop settings {x, y, width, height}"
    )
    custom_filters: Optional[dict[str, Any]] = Field(
        default=None,
        description="Project-specific filter settings"
    )


class ProjectAssetOverrideUpdate(BaseModel):
    """Request to update a project asset override."""
    use_processed_url: Optional[bool] = None
    custom_crop: Optional[dict[str, Any]] = None
    custom_filters: Optional[dict[str, Any]] = None


class BulkOverrideRequest(BaseModel):
    """Request to set overrides for multiple assets at once."""
    overrides: list[ProjectAssetOverrideCreate] = Field(
        ..., 
        description="List of asset overrides to set"
    )


class ProjectAssetOverridesResponse(BaseModel):
    """Response containing all overrides for a project."""
    project_id: str
    overrides: list[ProjectAssetOverride]


class RemoveBackgroundInProjectRequest(BaseModel):
    """
    Request to remove background from an asset within a specific project.
    
    This triggers background removal on the asset (if not already done)
    AND sets the project override to use the processed URL.
    """
    asset_id: str = Field(..., description="The media asset ID to process")


class RemoveBackgroundInProjectResponse(BaseModel):
    """Response after removing background in project context."""
    asset_id: str
    project_id: str
    processed_url: str
    use_processed_url: bool = True
    message: str = "Background removed and enabled for this project"

