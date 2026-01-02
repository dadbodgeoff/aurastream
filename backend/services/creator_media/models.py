"""
Creator Media Library Internal Models.

Data classes for internal service communication.
These are separate from API schemas to maintain clean separation of concerns.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any

from backend.services.creator_media.constants import MediaAssetType


@dataclass
class MediaAssetModel:
    """Internal representation of a media asset."""
    id: str
    user_id: str
    asset_type: MediaAssetType
    display_name: str
    url: str
    storage_path: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    processed_url: Optional[str] = None  # Background-removed version
    processed_storage_path: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    tags: List[str] = field(default_factory=list)
    is_favorite: bool = False
    is_primary: bool = False
    has_background_removed: bool = False  # Whether bg removal was applied
    metadata: Dict[str, Any] = field(default_factory=dict)
    usage_count: int = 0
    last_used_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @classmethod
    def from_db_row(cls, row: Dict[str, Any]) -> "MediaAssetModel":
        """Create model from database row."""
        return cls(
            id=row["id"],
            user_id=row["user_id"],
            asset_type=row["asset_type"],
            display_name=row["display_name"],
            url=row["url"],
            storage_path=row["storage_path"],
            description=row.get("description"),
            thumbnail_url=row.get("thumbnail_url"),
            processed_url=row.get("processed_url"),
            processed_storage_path=row.get("processed_storage_path"),
            file_size=row.get("file_size"),
            mime_type=row.get("mime_type"),
            width=row.get("width"),
            height=row.get("height"),
            tags=row.get("tags") or [],
            is_favorite=row.get("is_favorite", False),
            is_primary=row.get("is_primary", False),
            has_background_removed=row.get("has_background_removed", False),
            metadata=row.get("metadata") or {},
            usage_count=row.get("usage_count", 0),
            last_used_at=row.get("last_used_at"),
            created_at=row.get("created_at"),
            updated_at=row.get("updated_at"),
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        def format_datetime(val):
            """Format datetime to ISO string, handling both datetime and string inputs."""
            if val is None:
                return None
            if isinstance(val, str):
                return val
            return val.isoformat()
        
        return {
            "id": self.id,
            "user_id": self.user_id,
            "asset_type": self.asset_type,
            "display_name": self.display_name,
            "url": self.url,
            "storage_path": self.storage_path,
            "description": self.description,
            "thumbnail_url": self.thumbnail_url,
            "processed_url": self.processed_url,
            "processed_storage_path": self.processed_storage_path,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "width": self.width,
            "height": self.height,
            "tags": self.tags,
            "is_favorite": self.is_favorite,
            "is_primary": self.is_primary,
            "has_background_removed": self.has_background_removed,
            "metadata": self.metadata,
            "usage_count": self.usage_count,
            "last_used_at": format_datetime(self.last_used_at),
            "created_at": format_datetime(self.created_at),
            "updated_at": format_datetime(self.updated_at),
        }


@dataclass
class MediaSummaryModel:
    """Summary of assets by type."""
    asset_type: MediaAssetType
    total_count: int
    favorite_count: int
    latest_upload: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        def format_datetime(val):
            """Format datetime to ISO string, handling both datetime and string inputs."""
            if val is None:
                return None
            if isinstance(val, str):
                return val
            return val.isoformat()
        
        return {
            "asset_type": self.asset_type,
            "total_count": self.total_count,
            "favorite_count": self.favorite_count,
            "latest_upload": format_datetime(self.latest_upload),
        }


@dataclass
class MediaForPromptModel:
    """Asset formatted for prompt injection."""
    id: str
    asset_type: MediaAssetType
    display_name: str
    url: str
    processed_url: Optional[str] = None  # Background-removed version
    has_background_removed: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_asset(cls, asset: MediaAssetModel) -> "MediaForPromptModel":
        """Create from MediaAssetModel."""
        return cls(
            id=asset.id,
            asset_type=asset.asset_type,
            display_name=asset.display_name,
            url=asset.url,
            processed_url=asset.processed_url,
            has_background_removed=asset.has_background_removed,
            metadata=asset.metadata,
        )
    
    def get_best_url(self) -> str:
        """
        Get the best URL for generation.
        
        Returns processed (transparent) URL if available,
        otherwise returns original URL.
        """
        if self.has_background_removed and self.processed_url:
            return self.processed_url
        return self.url

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "asset_type": self.asset_type,
            "display_name": self.display_name,
            "url": self.url,
            "processed_url": self.processed_url,
            "has_background_removed": self.has_background_removed,
            "metadata": self.metadata,
        }


@dataclass
class UploadResult:
    """Result of a storage upload operation."""
    storage_path: str
    url: str
    file_size: int
    mime_type: str


@dataclass
class ListQuery:
    """Query parameters for listing assets."""
    user_id: str
    asset_type: Optional[MediaAssetType] = None
    tags: Optional[List[str]] = None
    favorites_only: bool = False
    search: Optional[str] = None
    limit: int = 50
    offset: int = 0
    sort_by: str = "created_at"
    sort_order: str = "desc"
