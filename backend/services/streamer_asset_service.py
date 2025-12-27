"""
Streamer Asset Service for Aurastream.

This service handles upload, retrieval, and management of streamer-specific assets
for brand kits. Supports various asset categories:
- Overlays: Stream overlays (starting, ending, brb, intermission)
- Alerts: Follow, subscribe, donation, raid alerts with optional sounds
- Panels: Twitch/YouTube panel images
- Emotes: Channel emotes with tier support
- Badges: Subscriber badges by month
- Facecam Frames: Webcam border frames
- Stingers: Transition animations

Storage: Supabase 'brand-assets' bucket
Path convention: {user_id}/{brand_kit_id}/{category}/{asset_id}.{ext}
"""

import logging
from typing import Optional, Dict, Any, Literal
from uuid import uuid4

from backend.database.supabase_client import get_supabase_client
from backend.services.brand_kit_service import get_brand_kit_service
from backend.services.exceptions import StorageError

logger = logging.getLogger(__name__)

# Bucket configuration
BUCKET_NAME = "brand-assets"

# Allowed MIME types for images
ALLOWED_IMAGE_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

# Allowed MIME types for videos
ALLOWED_VIDEO_TYPES = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
}

# Allowed MIME types for audio
ALLOWED_AUDIO_TYPES = {
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/ogg": ".ogg",
}

# Maximum file sizes
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB
MAX_AUDIO_SIZE = 5 * 1024 * 1024   # 5MB

# Asset categories
AssetCategory = Literal[
    "overlays", "alerts", "panels", "emotes", 
    "badges", "facecam_frames", "stingers"
]

# Overlay types
OverlayType = Literal["starting", "ending", "brb", "intermission"]

# Alert types
AlertType = Literal["follow", "subscribe", "donation", "raid", "bits", "host"]

# Emote tiers
EmoteTier = Literal["tier1", "tier2", "tier3", "bits"]

# Facecam positions
FacecamPosition = Literal["top_left", "top_right", "bottom_left", "bottom_right", "center"]


class StreamerAssetService:
    """
    Service for managing streamer-specific brand kit assets.
    
    Handles upload, retrieval, and deletion of various asset types
    including overlays, alerts, panels, emotes, badges, facecam frames,
    and stingers. All operations verify brand kit ownership.
    """
    
    BUCKET_NAME = BUCKET_NAME
    
    def __init__(self, supabase_client=None, brand_kit_service=None):
        """
        Initialize the streamer asset service.
        
        Args:
            supabase_client: Supabase client instance (uses singleton if not provided)
            brand_kit_service: Brand kit service instance (uses singleton if not provided)
        """
        self._supabase = supabase_client
        self._brand_kit_service = brand_kit_service
    
    @property
    def db(self):
        """Lazy-load Supabase client."""
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
    @property
    def brand_kit_service(self):
        """Lazy-load brand kit service."""
        if self._brand_kit_service is None:
            self._brand_kit_service = get_brand_kit_service()
        return self._brand_kit_service
    
    def _get_storage_path(
        self,
        user_id: str,
        brand_kit_id: str,
        category: str,
        asset_id: str,
        extension: str,
    ) -> str:
        """
        Generate storage path for an asset.
        
        Args:
            user_id: User's ID
            brand_kit_id: Brand kit UUID
            category: Asset category (overlays, alerts, etc.)
            asset_id: Unique asset identifier
            extension: File extension including dot (e.g., '.png')
            
        Returns:
            Storage path string
        """
        return f"{user_id}/{brand_kit_id}/{category}/{asset_id}{extension}"
    
    def _validate_file(
        self,
        file_data: bytes,
        content_type: str,
        category: str,
        is_audio: bool = False,
    ) -> str:
        """
        Validate file type and size.
        
        Args:
            file_data: Raw file bytes
            content_type: MIME type of the file
            category: Asset category for context in error messages
            is_audio: Whether this is an audio file
            
        Returns:
            File extension for the content type
            
        Raises:
            ValueError: If file type not allowed or file too large
        """
        if is_audio:
            allowed_types = ALLOWED_AUDIO_TYPES
            max_size = MAX_AUDIO_SIZE
            type_name = "audio"
        elif content_type in ALLOWED_VIDEO_TYPES:
            allowed_types = ALLOWED_VIDEO_TYPES
            max_size = MAX_VIDEO_SIZE
            type_name = "video"
        else:
            allowed_types = ALLOWED_IMAGE_TYPES
            max_size = MAX_IMAGE_SIZE
            type_name = "image"
        
        if content_type not in allowed_types:
            raise ValueError(
                f"Invalid {type_name} type for {category}: {content_type}. "
                f"Allowed types: {list(allowed_types.keys())}"
            )
        
        if len(file_data) > max_size:
            max_mb = max_size / (1024 * 1024)
            raise ValueError(
                f"File too large for {category}: {len(file_data)} bytes. "
                f"Maximum size: {max_size} bytes ({max_mb:.0f}MB)"
            )
        
        return allowed_types[content_type]
    
    async def _upload_file(
        self,
        user_id: str,
        brand_kit_id: str,
        category: str,
        file_data: bytes,
        content_type: str,
        asset_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Upload a file to storage and return metadata.
        
        Args:
            user_id: User's ID
            brand_kit_id: Brand kit UUID
            category: Asset category
            file_data: Raw file bytes
            content_type: MIME type of the file
            asset_id: Optional asset ID (generated if not provided)
            
        Returns:
            Dictionary with asset metadata including URL
            
        Raises:
            StorageError: If upload fails
        """
        # Generate asset ID if not provided
        if asset_id is None:
            asset_id = str(uuid4())
        
        # Determine if this is audio based on content type
        is_audio = content_type in ALLOWED_AUDIO_TYPES
        
        # Validate and get extension
        extension = self._validate_file(file_data, content_type, category, is_audio)
        
        # Generate storage path
        storage_path = self._get_storage_path(
            user_id, brand_kit_id, category, asset_id, extension
        )
        
        try:
            # Upload file to storage
            self.db.storage.from_(self.BUCKET_NAME).upload(
                path=storage_path,
                file=file_data,
                file_options={"content-type": content_type}
            )
            
            # Create signed URL with 1-year expiration
            url_result = self.db.storage.from_(self.BUCKET_NAME).create_signed_url(
                path=storage_path,
                expires_in=31536000  # 1 year in seconds
            )
            
            signed_url = url_result.get("signedURL") or url_result.get("signedUrl")
            
            logger.info(
                f"Asset uploaded: user_id={user_id}, brand_kit_id={brand_kit_id}, "
                f"category={category}, asset_id={asset_id}, size={len(file_data)}"
            )
            
            return {
                "id": asset_id,
                "url": signed_url,
                "storage_path": storage_path,
                "content_type": content_type,
                "file_size": len(file_data),
            }
            
        except Exception as e:
            logger.error(f"Asset upload failed: {e}")
            raise StorageError(f"Failed to upload {category} asset: {str(e)}")
    
    async def upload_overlay(
        self,
        user_id: str,
        brand_kit_id: str,
        overlay_type: OverlayType,
        file_data: bytes,
        content_type: str,
        duration_seconds: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Upload a stream overlay asset.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            overlay_type: Type of overlay (starting, ending, brb, intermission)
            file_data: Raw file bytes (image or video)
            content_type: MIME type of the file
            duration_seconds: Optional duration for video overlays
            
        Returns:
            Overlay metadata including URL and type
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
            ValueError: If file type not allowed or file too large
            StorageError: If upload fails
        """
        # Verify brand kit ownership
        await self.brand_kit_service.get(user_id, brand_kit_id)
        
        # Validate overlay type
        valid_overlay_types = ["starting", "ending", "brb", "intermission"]
        if overlay_type not in valid_overlay_types:
            raise ValueError(
                f"Invalid overlay type: {overlay_type}. "
                f"Must be one of: {valid_overlay_types}"
            )
        
        # Upload the file
        asset_id = f"{overlay_type}_{uuid4()}"
        result = await self._upload_file(
            user_id, brand_kit_id, "overlays", file_data, content_type, asset_id
        )
        
        # Add overlay-specific metadata
        result["overlay_type"] = overlay_type
        if duration_seconds is not None:
            result["duration_seconds"] = duration_seconds
        
        return result
    
    async def upload_alert(
        self,
        user_id: str,
        brand_kit_id: str,
        alert_type: AlertType,
        image_data: bytes,
        image_content_type: str,
        sound_data: Optional[bytes] = None,
        sound_content_type: Optional[str] = None,
        duration_ms: int = 3000,
    ) -> Dict[str, Any]:
        """
        Upload an alert asset with optional sound.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            alert_type: Type of alert (follow, subscribe, donation, raid, bits, host)
            image_data: Raw image/animation bytes
            image_content_type: MIME type of the image
            sound_data: Optional raw audio bytes
            sound_content_type: MIME type of the audio (required if sound_data provided)
            duration_ms: Alert display duration in milliseconds (default: 3000)
            
        Returns:
            Alert metadata including image URL and optional sound URL
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
            ValueError: If file type not allowed or file too large
            StorageError: If upload fails
        """
        # Verify brand kit ownership
        await self.brand_kit_service.get(user_id, brand_kit_id)
        
        # Validate alert type
        valid_alert_types = ["follow", "subscribe", "donation", "raid", "bits", "host"]
        if alert_type not in valid_alert_types:
            raise ValueError(
                f"Invalid alert type: {alert_type}. "
                f"Must be one of: {valid_alert_types}"
            )
        
        # Generate base asset ID
        base_asset_id = f"{alert_type}_{uuid4()}"
        
        # Upload image
        image_result = await self._upload_file(
            user_id, brand_kit_id, "alerts", 
            image_data, image_content_type, f"{base_asset_id}_image"
        )
        
        result = {
            "id": base_asset_id,
            "alert_type": alert_type,
            "image": image_result,
            "duration_ms": duration_ms,
        }
        
        # Upload sound if provided
        if sound_data is not None:
            if sound_content_type is None:
                raise ValueError("sound_content_type is required when sound_data is provided")
            
            sound_result = await self._upload_file(
                user_id, brand_kit_id, "alerts",
                sound_data, sound_content_type, f"{base_asset_id}_sound"
            )
            result["sound"] = sound_result
        
        logger.info(
            f"Alert uploaded: user_id={user_id}, brand_kit_id={brand_kit_id}, "
            f"alert_type={alert_type}, has_sound={sound_data is not None}"
        )
        
        return result
    
    async def upload_panel(
        self,
        user_id: str,
        brand_kit_id: str,
        name: str,
        file_data: bytes,
        content_type: str,
    ) -> Dict[str, Any]:
        """
        Upload a Twitch/YouTube panel image.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            name: Panel name/label (e.g., "About", "Schedule", "Donate")
            file_data: Raw image bytes
            content_type: MIME type of the image
            
        Returns:
            Panel metadata including URL and name
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
            ValueError: If file type not allowed or file too large
            StorageError: If upload fails
        """
        # Verify brand kit ownership
        await self.brand_kit_service.get(user_id, brand_kit_id)
        
        # Validate name
        if not name or not name.strip():
            raise ValueError("Panel name is required")
        
        # Upload the file
        asset_id = f"panel_{uuid4()}"
        result = await self._upload_file(
            user_id, brand_kit_id, "panels", file_data, content_type, asset_id
        )
        
        # Add panel-specific metadata
        result["name"] = name.strip()
        
        return result
    
    async def upload_emote(
        self,
        user_id: str,
        brand_kit_id: str,
        name: str,
        tier: EmoteTier,
        file_data: bytes,
        content_type: str,
    ) -> Dict[str, Any]:
        """
        Upload a channel emote.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            name: Emote name/code
            tier: Emote tier (tier1, tier2, tier3, bits)
            file_data: Raw image bytes
            content_type: MIME type of the image
            
        Returns:
            Emote metadata including URL, name, and tier
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
            ValueError: If file type not allowed or file too large
            StorageError: If upload fails
        """
        # Verify brand kit ownership
        await self.brand_kit_service.get(user_id, brand_kit_id)
        
        # Validate tier
        valid_tiers = ["tier1", "tier2", "tier3", "bits"]
        if tier not in valid_tiers:
            raise ValueError(
                f"Invalid emote tier: {tier}. "
                f"Must be one of: {valid_tiers}"
            )
        
        # Validate name
        if not name or not name.strip():
            raise ValueError("Emote name is required")
        
        # Upload the file
        asset_id = f"emote_{tier}_{uuid4()}"
        result = await self._upload_file(
            user_id, brand_kit_id, "emotes", file_data, content_type, asset_id
        )
        
        # Add emote-specific metadata
        result["name"] = name.strip()
        result["tier"] = tier
        
        return result
    
    async def upload_badge(
        self,
        user_id: str,
        brand_kit_id: str,
        months: int,
        file_data: bytes,
        content_type: str,
    ) -> Dict[str, Any]:
        """
        Upload a subscriber badge.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            months: Subscription months milestone (e.g., 1, 3, 6, 12, 24)
            file_data: Raw image bytes
            content_type: MIME type of the image
            
        Returns:
            Badge metadata including URL and months
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
            ValueError: If file type not allowed or file too large
            StorageError: If upload fails
        """
        # Verify brand kit ownership
        await self.brand_kit_service.get(user_id, brand_kit_id)
        
        # Validate months
        if months < 0:
            raise ValueError("Months must be a non-negative integer")
        
        # Upload the file
        asset_id = f"badge_{months}mo_{uuid4()}"
        result = await self._upload_file(
            user_id, brand_kit_id, "badges", file_data, content_type, asset_id
        )
        
        # Add badge-specific metadata
        result["months"] = months
        
        return result
    
    async def upload_facecam_frame(
        self,
        user_id: str,
        brand_kit_id: str,
        position: FacecamPosition,
        file_data: bytes,
        content_type: str,
    ) -> Dict[str, Any]:
        """
        Upload a facecam/webcam frame.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            position: Frame position (top_left, top_right, bottom_left, bottom_right, center)
            file_data: Raw image bytes (should have transparency)
            content_type: MIME type of the image
            
        Returns:
            Facecam frame metadata including URL and position
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
            ValueError: If file type not allowed or file too large
            StorageError: If upload fails
        """
        # Verify brand kit ownership
        await self.brand_kit_service.get(user_id, brand_kit_id)
        
        # Validate position
        valid_positions = ["top_left", "top_right", "bottom_left", "bottom_right", "center"]
        if position not in valid_positions:
            raise ValueError(
                f"Invalid facecam position: {position}. "
                f"Must be one of: {valid_positions}"
            )
        
        # Upload the file
        asset_id = f"facecam_{position}_{uuid4()}"
        result = await self._upload_file(
            user_id, brand_kit_id, "facecam_frames", file_data, content_type, asset_id
        )
        
        # Add facecam-specific metadata
        result["position"] = position
        
        return result
    
    async def upload_stinger(
        self,
        user_id: str,
        brand_kit_id: str,
        duration_ms: int,
        file_data: bytes,
        content_type: str,
    ) -> Dict[str, Any]:
        """
        Upload a stinger transition animation.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            duration_ms: Transition duration in milliseconds
            file_data: Raw video bytes
            content_type: MIME type of the video
            
        Returns:
            Stinger metadata including URL and duration
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
            ValueError: If file type not allowed or file too large
            StorageError: If upload fails
        """
        # Verify brand kit ownership
        await self.brand_kit_service.get(user_id, brand_kit_id)
        
        # Validate duration
        if duration_ms <= 0:
            raise ValueError("Duration must be a positive integer")
        
        # Validate that this is a video file
        if content_type not in ALLOWED_VIDEO_TYPES:
            raise ValueError(
                f"Invalid video type for stinger: {content_type}. "
                f"Allowed types: {list(ALLOWED_VIDEO_TYPES.keys())}"
            )
        
        # Upload the file
        asset_id = f"stinger_{uuid4()}"
        result = await self._upload_file(
            user_id, brand_kit_id, "stingers", file_data, content_type, asset_id
        )
        
        # Add stinger-specific metadata
        result["duration_ms"] = duration_ms
        
        return result
    
    async def delete_asset(
        self,
        user_id: str,
        brand_kit_id: str,
        category: AssetCategory,
        asset_id: str,
    ) -> bool:
        """
        Delete an asset from storage.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            category: Asset category
            asset_id: Asset identifier
            
        Returns:
            True if deleted successfully
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
            StorageError: If deletion fails
        """
        # Verify brand kit ownership
        await self.brand_kit_service.get(user_id, brand_kit_id)
        
        # Validate category
        valid_categories = [
            "overlays", "alerts", "panels", "emotes",
            "badges", "facecam_frames", "stingers"
        ]
        if category not in valid_categories:
            raise ValueError(
                f"Invalid asset category: {category}. "
                f"Must be one of: {valid_categories}"
            )
        
        # Try to delete files with all possible extensions
        all_extensions = (
            list(ALLOWED_IMAGE_TYPES.values()) +
            list(ALLOWED_VIDEO_TYPES.values()) +
            list(ALLOWED_AUDIO_TYPES.values())
        )
        
        deleted = False
        errors = []
        
        for extension in all_extensions:
            storage_path = self._get_storage_path(
                user_id, brand_kit_id, category, asset_id, extension
            )
            
            try:
                self.db.storage.from_(self.BUCKET_NAME).remove([storage_path])
                deleted = True
                logger.info(
                    f"Asset deleted: user_id={user_id}, brand_kit_id={brand_kit_id}, "
                    f"category={category}, asset_id={asset_id}"
                )
            except Exception as e:
                errors.append(str(e))
                continue
        
        if not deleted and errors:
            logger.warning(
                f"Asset deletion may have failed: user_id={user_id}, "
                f"brand_kit_id={brand_kit_id}, category={category}, "
                f"asset_id={asset_id}, errors={errors}"
            )
        
        return deleted


# Singleton instance
_streamer_asset_service: Optional[StreamerAssetService] = None


def get_streamer_asset_service() -> StreamerAssetService:
    """Get or create the streamer asset service singleton."""
    global _streamer_asset_service
    if _streamer_asset_service is None:
        _streamer_asset_service = StreamerAssetService()
    return _streamer_asset_service
