"""
Creator Media Library Repository.

Handles all database operations for media assets:
- CRUD operations
- Querying with filters
- Aggregations and summaries
- Usage tracking
"""

import logging
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone

from backend.database.supabase_client import get_supabase_client
from backend.services.creator_media.constants import MediaAssetType
from backend.services.creator_media.models import (
    MediaAssetModel,
    MediaSummaryModel,
    ListQuery,
)

logger = logging.getLogger(__name__)

TABLE_NAME = "creator_media_assets"


class MediaRepository:
    """
    Database repository for creator media assets.
    
    Responsibilities:
    - Insert, update, delete records
    - Query with filtering and pagination
    - Aggregate summaries
    - Track usage statistics
    """
    
    def __init__(self, supabase_client=None):
        """Initialize repository."""
        self._supabase = supabase_client
    
    @property
    def db(self):
        """Lazy-load Supabase client."""
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
    async def insert(self, data: Dict[str, Any]) -> MediaAssetModel:
        """
        Insert a new media asset record.
        
        Args:
            data: Asset data dictionary
            
        Returns:
            Created MediaAssetModel
        """
        result = self.db.table(TABLE_NAME).insert(data).execute()
        
        if not result.data:
            raise ValueError("Failed to insert media asset")
        
        logger.info(f"Repository insert: id={data.get('id')}")
        return MediaAssetModel.from_db_row(result.data[0])
    
    async def get_by_id(
        self,
        user_id: str,
        asset_id: str
    ) -> Optional[MediaAssetModel]:
        """
        Get asset by ID (with ownership check).
        
        Args:
            user_id: User's ID for ownership verification
            asset_id: Asset ID
            
        Returns:
            MediaAssetModel or None if not found
        """
        result = self.db.table(TABLE_NAME) \
            .select("*") \
            .eq("id", asset_id) \
            .eq("user_id", user_id) \
            .execute()
        
        if not result.data:
            return None
        
        return MediaAssetModel.from_db_row(result.data[0])
    
    async def update(
        self,
        user_id: str,
        asset_id: str,
        data: Dict[str, Any]
    ) -> Optional[MediaAssetModel]:
        """
        Update an asset record.
        
        Args:
            user_id: User's ID for ownership verification
            asset_id: Asset ID
            data: Fields to update
            
        Returns:
            Updated MediaAssetModel or None if not found
        """
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = self.db.table(TABLE_NAME) \
            .update(data) \
            .eq("id", asset_id) \
            .eq("user_id", user_id) \
            .execute()
        
        if not result.data:
            return None
        
        logger.info(f"Repository update: id={asset_id}")
        return MediaAssetModel.from_db_row(result.data[0])
    
    async def delete(self, user_id: str, asset_id: str) -> bool:
        """
        Delete an asset record.
        
        Args:
            user_id: User's ID for ownership verification
            asset_id: Asset ID
            
        Returns:
            True if deleted
        """
        self.db.table(TABLE_NAME) \
            .delete() \
            .eq("id", asset_id) \
            .eq("user_id", user_id) \
            .execute()
        
        logger.info(f"Repository delete: id={asset_id}")
        return True
    
    async def list(self, query: ListQuery) -> Tuple[List[MediaAssetModel], int]:
        """
        List assets with filtering and pagination.
        
        Args:
            query: ListQuery with filter parameters
            
        Returns:
            Tuple of (assets list, total count)
        """
        # Build query
        db_query = self.db.table(TABLE_NAME) \
            .select("*", count="exact") \
            .eq("user_id", query.user_id)
        
        if query.asset_type:
            db_query = db_query.eq("asset_type", query.asset_type)
        
        if query.favorites_only:
            db_query = db_query.eq("is_favorite", True)
        
        if query.tags:
            db_query = db_query.overlaps("tags", query.tags)
        
        if query.search:
            db_query = db_query.or_(
                f"display_name.ilike.%{query.search}%,"
                f"description.ilike.%{query.search}%"
            )
        
        # Apply sorting
        desc = query.sort_order == "desc"
        db_query = db_query.order(query.sort_by, desc=desc)
        
        # Apply pagination
        db_query = db_query.range(query.offset, query.offset + query.limit - 1)
        
        result = db_query.execute()
        
        assets = [MediaAssetModel.from_db_row(row) for row in result.data]
        total = result.count or len(assets)
        
        return assets, total
    
    async def count_by_type(
        self,
        user_id: str,
        asset_type: MediaAssetType
    ) -> int:
        """
        Count assets of a specific type for a user.
        
        Args:
            user_id: User's ID
            asset_type: Asset type to count
            
        Returns:
            Count of assets
        """
        result = self.db.table(TABLE_NAME) \
            .select("id", count="exact") \
            .eq("user_id", user_id) \
            .eq("asset_type", asset_type) \
            .execute()
        
        return result.count or 0
    
    async def count_total(self, user_id: str) -> int:
        """
        Count total assets for a user (across all types).
        
        Args:
            user_id: User's ID
            
        Returns:
            Total count of assets
        """
        result = self.db.table(TABLE_NAME) \
            .select("id", count="exact") \
            .eq("user_id", user_id) \
            .execute()
        
        return result.count or 0
    
    async def get_primary(
        self,
        user_id: str,
        asset_type: MediaAssetType
    ) -> Optional[MediaAssetModel]:
        """
        Get the primary asset of a given type.
        
        Args:
            user_id: User's ID
            asset_type: Asset type
            
        Returns:
            Primary MediaAssetModel or None
        """
        result = self.db.table(TABLE_NAME) \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("asset_type", asset_type) \
            .eq("is_primary", True) \
            .limit(1) \
            .execute()
        
        if result.data:
            return MediaAssetModel.from_db_row(result.data[0])
        return None
    
    async def unset_primary(
        self,
        user_id: str,
        asset_type: MediaAssetType
    ) -> None:
        """
        Unset primary flag for all assets of a type.
        
        Args:
            user_id: User's ID
            asset_type: Asset type
        """
        self.db.table(TABLE_NAME) \
            .update({"is_primary": False}) \
            .eq("user_id", user_id) \
            .eq("asset_type", asset_type) \
            .eq("is_primary", True) \
            .execute()
    
    async def get_by_ids(
        self,
        user_id: str,
        asset_ids: List[str]
    ) -> List[MediaAssetModel]:
        """
        Get multiple assets by IDs.
        
        Args:
            user_id: User's ID
            asset_ids: List of asset IDs
            
        Returns:
            List of MediaAssetModel
        """
        if not asset_ids:
            return []
        
        result = self.db.table(TABLE_NAME) \
            .select("*") \
            .eq("user_id", user_id) \
            .in_("id", asset_ids) \
            .execute()
        
        return [MediaAssetModel.from_db_row(row) for row in result.data]
    
    async def increment_usage(self, asset_id: str) -> None:
        """
        Increment usage count for an asset.
        
        Args:
            asset_id: Asset ID
        """
        try:
            self.db.rpc("increment_media_usage", {"asset_id": asset_id}).execute()
        except Exception as e:
            logger.warning(f"Failed to increment usage: {e}")
    
    async def get_summary(
        self,
        user_id: str
    ) -> Tuple[List[MediaSummaryModel], int, int]:
        """
        Get summary of user's media library.
        
        Args:
            user_id: User's ID
            
        Returns:
            Tuple of (summaries by type, total count, total storage bytes)
        """
        result = self.db.table(TABLE_NAME) \
            .select("asset_type, is_favorite, file_size, created_at") \
            .eq("user_id", user_id) \
            .execute()
        
        # Aggregate by type
        type_data: Dict[str, Dict] = {}
        total_storage = 0
        
        for row in result.data:
            asset_type = row["asset_type"]
            if asset_type not in type_data:
                type_data[asset_type] = {
                    "total_count": 0,
                    "favorite_count": 0,
                    "latest_upload": None
                }
            
            type_data[asset_type]["total_count"] += 1
            if row.get("is_favorite"):
                type_data[asset_type]["favorite_count"] += 1
            
            created = row.get("created_at")
            if created:
                current_latest = type_data[asset_type]["latest_upload"]
                if not current_latest or created > current_latest:
                    type_data[asset_type]["latest_upload"] = created
            
            total_storage += row.get("file_size") or 0
        
        summaries = [
            MediaSummaryModel(
                asset_type=asset_type,
                total_count=data["total_count"],
                favorite_count=data["favorite_count"],
                latest_upload=data["latest_upload"]
            )
            for asset_type, data in type_data.items()
        ]
        
        return summaries, len(result.data), total_storage


# ============================================================================
# Singleton
# ============================================================================

_repository: Optional[MediaRepository] = None


def get_media_repository() -> MediaRepository:
    """Get or create repository singleton."""
    global _repository
    if _repository is None:
        _repository = MediaRepository()
    return _repository
