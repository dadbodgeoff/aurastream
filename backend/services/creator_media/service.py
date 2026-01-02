"""
Creator Media Library Main Service.

Orchestrates all media library operations by coordinating:
- Storage service for file operations
- Repository for database operations
- Prompt injector for generation integration
- Background removal for transparent assets

This is the main entry point for all media library functionality.
"""

import logging
import base64
from typing import Optional, List, Dict, Any, Tuple
from uuid import uuid4
from datetime import datetime, timezone

from backend.services.creator_media.constants import (
    MediaAssetType,
    MEDIA_ASSET_TYPES,
    TOTAL_ASSET_LIMIT,
    MAX_PROMPT_INJECTION_ASSETS,
    get_asset_limits,
    can_access_media_library,
    should_remove_background_by_default,
    can_remove_background,
)
from backend.services.creator_media.models import (
    MediaAssetModel,
    MediaSummaryModel,
    MediaForPromptModel,
    ListQuery,
)
from backend.services.creator_media.storage import (
    MediaStorageService,
    get_storage_service,
)
from backend.services.creator_media.repository import (
    MediaRepository,
    get_media_repository,
)
from backend.services.creator_media.prompt_injector import (
    PromptInjector,
    get_prompt_injector,
)
from backend.services.creator_media.background_removal import (
    BackgroundRemovalService,
    get_background_removal_service,
)

logger = logging.getLogger(__name__)


class CreatorMediaService:
    """
    Main orchestrator service for Creator Media Library.
    
    Coordinates storage, repository, prompt injection, and background
    removal services to provide a unified API for media library operations.
    """
    
    def __init__(
        self,
        storage: Optional[MediaStorageService] = None,
        repository: Optional[MediaRepository] = None,
        injector: Optional[PromptInjector] = None,
        bg_removal: Optional[BackgroundRemovalService] = None,
    ):
        """Initialize service with dependencies."""
        self._storage = storage
        self._repository = repository
        self._injector = injector
        self._bg_removal = bg_removal
    
    @property
    def storage(self) -> MediaStorageService:
        """Lazy-load storage service."""
        if self._storage is None:
            self._storage = get_storage_service()
        return self._storage
    
    @property
    def repository(self) -> MediaRepository:
        """Lazy-load repository."""
        if self._repository is None:
            self._repository = get_media_repository()
        return self._repository
    
    @property
    def injector(self) -> PromptInjector:
        """Lazy-load prompt injector."""
        if self._injector is None:
            self._injector = get_prompt_injector()
        return self._injector
    
    @property
    def bg_removal(self) -> BackgroundRemovalService:
        """Lazy-load background removal service."""
        if self._bg_removal is None:
            self._bg_removal = get_background_removal_service()
        return self._bg_removal
    
    # ========================================================================
    # Upload Operations
    # ========================================================================
    
    async def upload(
        self,
        user_id: str,
        asset_type: MediaAssetType,
        display_name: str,
        image_base64: str,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None,
        is_favorite: bool = False,
        set_as_primary: bool = False,
        remove_background: Optional[bool] = None,
        metadata: Optional[Dict[str, Any]] = None,
        user_tier: str = "free",
    ) -> MediaAssetModel:
        """
        Upload a new media asset.
        
        Args:
            user_id: User's ID
            asset_type: Type of media asset
            display_name: Display name for the asset
            image_base64: Base64-encoded image data
            description: Optional description
            tags: Optional tags for organization
            is_favorite: Mark as favorite
            set_as_primary: Set as primary asset of this type
            remove_background: Whether to remove background (None = use default for type)
            metadata: Type-specific metadata
            user_tier: User's subscription tier
            
        Returns:
            Created MediaAssetModel
            
        Raises:
            ValueError: If validation fails
            PermissionError: If user tier doesn't have access
        """
        # Check tier access (Pro/Studio only)
        if not can_access_media_library(user_tier):
            raise PermissionError(
                "Media Library is available for Pro and Studio subscribers. "
                "Upgrade to unlock this feature."
            )
        
        # Validate asset type
        if asset_type not in MEDIA_ASSET_TYPES:
            raise ValueError(f"Invalid asset type: {asset_type}")
        
        # Check total asset limit (25 total)
        total_count = await self.repository.count_total(user_id)
        if total_count >= TOTAL_ASSET_LIMIT:
            raise ValueError(
                f"Total asset limit reached ({TOTAL_ASSET_LIMIT}). "
                "Delete some assets to upload more."
            )
        
        # Check per-type asset limits
        limits = get_asset_limits(user_tier)
        current_count = await self.repository.count_by_type(user_id, asset_type)
        if current_count >= limits.get(asset_type, 5):
            raise ValueError(
                f"Asset limit reached for {asset_type}. "
                f"Limit: {limits[asset_type]}"
            )
        
        # Decode base64
        try:
            image_data = base64.b64decode(image_base64)
        except Exception:
            raise ValueError("Invalid base64 image data")
        
        # Validate file and get MIME type
        mime_type = self.storage.validate_file(image_data)
        
        # Generate asset ID
        asset_id = str(uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        # Determine if we should remove background
        # None = use default based on asset type
        should_remove_bg = remove_background
        if should_remove_bg is None:
            should_remove_bg = should_remove_background_by_default(asset_type)
        
        # Don't allow bg removal for excluded types
        if should_remove_bg and not can_remove_background(asset_type):
            should_remove_bg = False
            logger.info(f"Background removal disabled for {asset_type} (excluded type)")
        
        # Upload original to storage
        upload_result = await self.storage.upload(
            user_id=user_id,
            asset_type=asset_type,
            asset_id=asset_id,
            data=image_data,
            mime_type=mime_type,
        )
        
        # Process background removal if requested
        processed_url = None
        processed_storage_path = None
        has_background_removed = False
        
        if should_remove_bg:
            try:
                logger.info(f"Removing background for asset {asset_id}")
                processed_data = await self.bg_removal.remove_background(image_data)
                
                # Upload processed version
                processed_result = await self.storage.upload(
                    user_id=user_id,
                    asset_type=asset_type,
                    asset_id=asset_id,
                    data=processed_data,
                    mime_type="image/png",  # Always PNG for transparency
                    suffix="_processed",
                )
                
                processed_url = processed_result.url
                processed_storage_path = processed_result.storage_path
                has_background_removed = True
                
                logger.info(f"Background removed successfully for asset {asset_id}")
                
            except Exception as e:
                # Log but don't fail - original is still uploaded
                logger.warning(f"Background removal failed for {asset_id}: {e}")
        
        try:
            # Unset existing primary if setting new one
            if set_as_primary:
                await self.repository.unset_primary(user_id, asset_type)
            
            # Insert database record
            record = {
                "id": asset_id,
                "user_id": user_id,
                "asset_type": asset_type,
                "display_name": display_name,
                "description": description,
                "url": upload_result.url,
                "storage_path": upload_result.storage_path,
                "processed_url": processed_url,
                "processed_storage_path": processed_storage_path,
                "file_size": upload_result.file_size,
                "mime_type": upload_result.mime_type,
                "tags": tags or [],
                "is_favorite": is_favorite,
                "is_primary": set_as_primary,
                "has_background_removed": has_background_removed,
                "metadata": metadata or {},
                "created_at": now,
                "updated_at": now,
            }
            
            asset = await self.repository.insert(record)
            
            logger.info(
                f"Media uploaded: user={user_id}, type={asset_type}, id={asset_id}, "
                f"bg_removed={has_background_removed}"
            )
            
            return asset
            
        except Exception as e:
            # Cleanup storage on database failure
            await self.storage.delete(upload_result.storage_path)
            if processed_storage_path:
                await self.storage.delete(processed_storage_path)
            raise
    
    # ========================================================================
    # Read Operations
    # ========================================================================
    
    async def get(self, user_id: str, asset_id: str) -> MediaAssetModel:
        """
        Get a single media asset by ID.
        
        Args:
            user_id: User's ID (for ownership verification)
            asset_id: Asset ID
            
        Returns:
            MediaAssetModel
            
        Raises:
            ValueError: If asset not found
        """
        asset = await self.repository.get_by_id(user_id, asset_id)
        if not asset:
            raise ValueError(f"Media asset not found: {asset_id}")
        return asset
    
    async def list(
        self,
        user_id: str,
        asset_type: Optional[MediaAssetType] = None,
        tags: Optional[List[str]] = None,
        favorites_only: bool = False,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> Tuple[List[MediaAssetModel], int]:
        """
        List media assets with filtering and pagination.
        
        Returns:
            Tuple of (assets list, total count)
        """
        query = ListQuery(
            user_id=user_id,
            asset_type=asset_type,
            tags=tags,
            favorites_only=favorites_only,
            search=search,
            limit=limit,
            offset=offset,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        return await self.repository.list(query)
    
    async def get_primary(
        self,
        user_id: str,
        asset_type: MediaAssetType
    ) -> Optional[MediaAssetModel]:
        """Get the primary asset of a given type."""
        return await self.repository.get_primary(user_id, asset_type)
    
    async def get_summary(
        self,
        user_id: str
    ) -> Tuple[List[MediaSummaryModel], int, int]:
        """Get summary of user's media library."""
        return await self.repository.get_summary(user_id)
    
    # ========================================================================
    # Update Operations
    # ========================================================================
    
    async def update(
        self,
        user_id: str,
        asset_id: str,
        display_name: Optional[str] = None,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None,
        is_favorite: Optional[bool] = None,
        is_primary: Optional[bool] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> MediaAssetModel:
        """
        Update a media asset.
        
        Args:
            user_id: User's ID
            asset_id: Asset ID
            display_name: New display name
            description: New description
            tags: New tags
            is_favorite: New favorite status
            is_primary: New primary status
            metadata: New metadata (merged with existing)
            
        Returns:
            Updated MediaAssetModel
        """
        # Verify ownership
        existing = await self.get(user_id, asset_id)
        
        # Build update data
        update_data: Dict[str, Any] = {}
        
        if display_name is not None:
            update_data["display_name"] = display_name
        if description is not None:
            update_data["description"] = description
        if tags is not None:
            update_data["tags"] = tags
        if is_favorite is not None:
            update_data["is_favorite"] = is_favorite
        if is_primary is not None:
            if is_primary:
                await self.repository.unset_primary(user_id, existing.asset_type)
            update_data["is_primary"] = is_primary
        if metadata is not None:
            merged = {**existing.metadata, **metadata}
            update_data["metadata"] = merged
        
        if not update_data:
            return existing
        
        result = await self.repository.update(user_id, asset_id, update_data)
        if not result:
            raise ValueError(f"Media asset not found: {asset_id}")
        
        return result
    
    # ========================================================================
    # Delete Operations
    # ========================================================================
    
    async def delete(self, user_id: str, asset_id: str) -> bool:
        """
        Delete a media asset.
        
        Args:
            user_id: User's ID
            asset_id: Asset ID
            
        Returns:
            True if deleted
        """
        # Get asset to find storage paths
        existing = await self.get(user_id, asset_id)
        
        # Delete original from storage
        await self.storage.delete(existing.storage_path)
        
        # Delete processed version if exists
        if existing.processed_storage_path:
            await self.storage.delete(existing.processed_storage_path)
        
        # Delete from database
        await self.repository.delete(user_id, asset_id)
        
        logger.info(f"Media deleted: user={user_id}, id={asset_id}")
        return True
    
    async def bulk_delete(
        self,
        user_id: str,
        asset_ids: List[str]
    ) -> Tuple[int, List[str]]:
        """
        Delete multiple media assets.
        
        Returns:
            Tuple of (deleted count, failed IDs)
        """
        deleted = 0
        failed = []
        
        for asset_id in asset_ids:
            try:
                await self.delete(user_id, asset_id)
                deleted += 1
            except Exception as e:
                logger.warning(f"Failed to delete {asset_id}: {e}")
                failed.append(asset_id)
        
        return deleted, failed
    
    # ========================================================================
    # Prompt Injection Operations
    # ========================================================================
    
    async def get_for_prompt(
        self,
        user_id: str,
        asset_ids: List[str],
        user_tier: str = "free",
    ) -> List[MediaForPromptModel]:
        """
        Get media assets formatted for prompt injection.
        
        Also increments usage count for each asset.
        Limited to MAX_PROMPT_INJECTION_ASSETS (2) per prompt.
        
        Args:
            user_id: User's ID
            asset_ids: List of asset IDs to retrieve (max 2)
            user_tier: User's subscription tier
            
        Returns:
            List of MediaForPromptModel objects
            
        Raises:
            PermissionError: If user tier doesn't have access
            ValueError: If too many assets requested
        """
        if not asset_ids:
            return []
        
        # Check tier access
        if not can_access_media_library(user_tier):
            raise PermissionError(
                "Media Library is available for Pro and Studio subscribers."
            )
        
        # Enforce max 2 assets per prompt
        if len(asset_ids) > MAX_PROMPT_INJECTION_ASSETS:
            raise ValueError(
                f"Maximum {MAX_PROMPT_INJECTION_ASSETS} assets can be injected per prompt. "
                f"Requested: {len(asset_ids)}"
            )
        
        assets = await self.repository.get_by_ids(user_id, asset_ids)
        
        # Increment usage counts
        for asset in assets:
            await self.repository.increment_usage(asset.id)
        
        return [MediaForPromptModel.from_asset(asset) for asset in assets]
    
    def build_injection_context(
        self,
        face: Optional[MediaForPromptModel] = None,
        logo: Optional[MediaForPromptModel] = None,
        character: Optional[MediaForPromptModel] = None,
        background: Optional[MediaForPromptModel] = None,
        references: Optional[List[MediaForPromptModel]] = None,
        objects: Optional[List[MediaForPromptModel]] = None,
        game_skin: Optional[MediaForPromptModel] = None,
    ) -> Dict[str, Any]:
        """Build structured injection context for generation service."""
        return self.injector.build_injection_context(
            face=face,
            logo=logo,
            character=character,
            background=background,
            references=references,
            objects=objects,
            game_skin=game_skin,
        )


# ============================================================================
# Singleton
# ============================================================================

_service: Optional[CreatorMediaService] = None


def get_creator_media_service() -> CreatorMediaService:
    """Get or create main service singleton."""
    global _service
    if _service is None:
        _service = CreatorMediaService()
    return _service
