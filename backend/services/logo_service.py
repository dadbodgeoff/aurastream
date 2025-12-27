"""
Logo Service for Aurastream.

This service handles logo upload, retrieval, and management for brand kits.
Supports multiple logo variations:
- primary: Main logo (required for logo inclusion in generation)
- secondary: Alternative logo
- icon: Icon-only version (favicon, small displays)
- monochrome: Single-color version
- watermark: Transparent watermark for overlays

Storage: Supabase 'logos' bucket
Path convention: {user_id}/{brand_kit_id}/{logo_type}.{ext}
"""

import logging
from typing import Optional, Dict, Literal
from uuid import uuid4
import mimetypes

from backend.database.supabase_client import get_supabase_client
from backend.services.exceptions import (
    AuthorizationError,
    BrandKitNotFoundError,
    StorageError,
)

logger = logging.getLogger(__name__)

# Logo type definitions
LogoType = Literal["primary", "secondary", "icon", "monochrome", "watermark"]

LOGO_TYPES: list[LogoType] = ["primary", "secondary", "icon", "monochrome", "watermark"]

# Allowed MIME types for logos
ALLOWED_LOGO_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
}

# Max file size: 10MB
MAX_LOGO_SIZE = 10 * 1024 * 1024

# Logo metadata structure
LogoMetadata = Dict[str, any]


class LogoService:
    """
    Service for managing brand kit logos.
    
    Handles upload, retrieval, and deletion of logo variations.
    All operations verify brand kit ownership.
    """
    
    BUCKET_NAME = "logos"
    
    def __init__(self, supabase_client=None):
        """Initialize the logo service."""
        self._supabase = supabase_client
    
    @property
    def db(self):
        """Lazy-load Supabase client."""
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
    def _get_storage_path(
        self, 
        user_id: str, 
        brand_kit_id: str, 
        logo_type: LogoType,
        extension: str
    ) -> str:
        """Generate storage path for a logo."""
        return f"{user_id}/{brand_kit_id}/{logo_type}{extension}"
    
    def _get_extension_from_mime(self, content_type: str) -> str:
        """Get file extension from MIME type."""
        return ALLOWED_LOGO_TYPES.get(content_type, ".png")
    
    async def upload_logo(
        self,
        user_id: str,
        brand_kit_id: str,
        logo_type: LogoType,
        file_data: bytes,
        content_type: str,
        filename: Optional[str] = None,
    ) -> Dict[str, any]:
        """
        Upload a logo for a brand kit.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            logo_type: Type of logo (primary, secondary, icon, monochrome, watermark)
            file_data: Raw file bytes
            content_type: MIME type of the file
            filename: Original filename (optional)
            
        Returns:
            Logo metadata including URL and dimensions
            
        Raises:
            ValueError: If file type not allowed or file too large
            StorageError: If upload fails
        """
        # Validate logo type
        if logo_type not in LOGO_TYPES:
            raise ValueError(f"Invalid logo type: {logo_type}. Must be one of: {LOGO_TYPES}")
        
        # Validate content type
        if content_type not in ALLOWED_LOGO_TYPES:
            raise ValueError(
                f"Invalid file type: {content_type}. "
                f"Allowed types: {list(ALLOWED_LOGO_TYPES.keys())}"
            )
        
        # Validate file size
        if len(file_data) > MAX_LOGO_SIZE:
            raise ValueError(
                f"File too large: {len(file_data)} bytes. "
                f"Maximum size: {MAX_LOGO_SIZE} bytes (10MB)"
            )
        
        # Generate storage path
        extension = self._get_extension_from_mime(content_type)
        storage_path = self._get_storage_path(user_id, brand_kit_id, logo_type, extension)
        
        try:
            # Delete existing logo if present
            try:
                self.db.storage.from_(self.BUCKET_NAME).remove([storage_path])
            except Exception:
                pass  # Ignore if file doesn't exist
            
            # Upload new logo
            result = self.db.storage.from_(self.BUCKET_NAME).upload(
                path=storage_path,
                file=file_data,
                file_options={"content-type": content_type}
            )
            
            # Get public URL (signed URL for private bucket)
            url_result = self.db.storage.from_(self.BUCKET_NAME).create_signed_url(
                path=storage_path,
                expires_in=31536000  # 1 year
            )
            
            logo_url = url_result.get("signedURL") or url_result.get("signedUrl")
            
            logger.info(
                f"Logo uploaded: user_id={user_id}, brand_kit_id={brand_kit_id}, "
                f"type={logo_type}, size={len(file_data)}"
            )
            
            return {
                "type": logo_type,
                "url": logo_url,
                "storage_path": storage_path,
                "content_type": content_type,
                "file_size": len(file_data),
                "filename": filename,
            }
            
        except Exception as e:
            logger.error(f"Logo upload failed: {e}")
            raise StorageError(f"Failed to upload logo: {str(e)}")
    
    async def get_logo_url(
        self,
        user_id: str,
        brand_kit_id: str,
        logo_type: LogoType,
    ) -> Optional[str]:
        """
        Get signed URL for a logo.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            logo_type: Type of logo
            
        Returns:
            Signed URL or None if logo doesn't exist
        """
        # Try each possible extension
        for extension in ALLOWED_LOGO_TYPES.values():
            storage_path = self._get_storage_path(user_id, brand_kit_id, logo_type, extension)
            
            try:
                url_result = self.db.storage.from_(self.BUCKET_NAME).create_signed_url(
                    path=storage_path,
                    expires_in=31536000  # 1 year
                )
                
                url = url_result.get("signedURL") or url_result.get("signedUrl")
                if url:
                    return url
            except Exception:
                continue
        
        return None
    
    async def list_logos(
        self,
        user_id: str,
        brand_kit_id: str,
    ) -> Dict[LogoType, Optional[str]]:
        """
        List all logos for a brand kit.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            
        Returns:
            Dictionary mapping logo types to URLs (None if not uploaded)
        """
        logos: Dict[LogoType, Optional[str]] = {}
        
        for logo_type in LOGO_TYPES:
            url = await self.get_logo_url(user_id, brand_kit_id, logo_type)
            logos[logo_type] = url
        
        return logos
    
    async def delete_logo(
        self,
        user_id: str,
        brand_kit_id: str,
        logo_type: LogoType,
    ) -> bool:
        """
        Delete a logo from a brand kit.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            logo_type: Type of logo to delete
            
        Returns:
            True if deleted, False if not found
        """
        if logo_type not in LOGO_TYPES:
            raise ValueError(f"Invalid logo type: {logo_type}")
        
        deleted = False
        
        # Try to delete each possible extension
        for extension in ALLOWED_LOGO_TYPES.values():
            storage_path = self._get_storage_path(user_id, brand_kit_id, logo_type, extension)
            
            try:
                self.db.storage.from_(self.BUCKET_NAME).remove([storage_path])
                deleted = True
                logger.info(
                    f"Logo deleted: user_id={user_id}, brand_kit_id={brand_kit_id}, "
                    f"type={logo_type}"
                )
            except Exception:
                continue
        
        return deleted
    
    async def delete_all_logos(
        self,
        user_id: str,
        brand_kit_id: str,
    ) -> int:
        """
        Delete all logos for a brand kit.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            
        Returns:
            Number of logos deleted
        """
        deleted_count = 0
        
        for logo_type in LOGO_TYPES:
            if await self.delete_logo(user_id, brand_kit_id, logo_type):
                deleted_count += 1
        
        return deleted_count
    
    async def get_logo_for_generation(
        self,
        user_id: str,
        brand_kit_id: str,
        preferred_type: LogoType = "primary",
    ) -> Optional[bytes]:
        """
        Get logo bytes for use in asset generation.
        
        Falls back to other logo types if preferred type not available.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            preferred_type: Preferred logo type (default: primary)
            
        Returns:
            Logo file bytes or None if no logo available
        """
        # Priority order for fallback
        priority_order = [preferred_type] + [t for t in LOGO_TYPES if t != preferred_type]
        
        for logo_type in priority_order:
            for extension in ALLOWED_LOGO_TYPES.values():
                storage_path = self._get_storage_path(user_id, brand_kit_id, logo_type, extension)
                
                try:
                    result = self.db.storage.from_(self.BUCKET_NAME).download(storage_path)
                    if result:
                        logger.info(
                            f"Logo retrieved for generation: user_id={user_id}, "
                            f"brand_kit_id={brand_kit_id}, type={logo_type}"
                        )
                        return result
                except Exception:
                    continue
        
        return None

    async def get_default_logo_type(
        self,
        user_id: str,
        brand_kit_id: str,
    ) -> LogoType:
        """
        Get the default logo type for a brand kit.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            
        Returns:
            The default logo type (defaults to 'primary' if not set)
        """
        try:
            result = self.db.table("brand_kits").select("default_logo_type").eq(
                "id", brand_kit_id
            ).eq("user_id", user_id).single().execute()
            
            if result.data and result.data.get("default_logo_type"):
                return result.data["default_logo_type"]
        except Exception as e:
            logger.warning(f"Failed to get default logo type: {e}")
        
        return "primary"

    async def set_default_logo_type(
        self,
        user_id: str,
        brand_kit_id: str,
        logo_type: LogoType,
    ) -> None:
        """
        Set the default logo type for a brand kit.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            logo_type: Logo type to set as default
            
        Raises:
            ValueError: If logo type is invalid
        """
        if logo_type not in LOGO_TYPES:
            raise ValueError(f"Invalid logo type: {logo_type}")
        
        try:
            self.db.table("brand_kits").update({
                "default_logo_type": logo_type
            }).eq("id", brand_kit_id).eq("user_id", user_id).execute()
            
            logger.info(
                f"Default logo type set: user_id={user_id}, brand_kit_id={brand_kit_id}, "
                f"type={logo_type}"
            )
        except Exception as e:
            logger.error(f"Failed to set default logo type: {e}")
            raise StorageError(f"Failed to set default logo type: {str(e)}")


# Singleton instance
_logo_service: Optional[LogoService] = None


def get_logo_service() -> LogoService:
    """Get or create the logo service singleton."""
    global _logo_service
    if _logo_service is None:
        _logo_service = LogoService()
    return _logo_service
