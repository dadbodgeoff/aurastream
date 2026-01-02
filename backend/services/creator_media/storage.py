"""
Creator Media Library Storage Service.

Handles all Supabase storage operations:
- File upload with validation
- File deletion
- URL generation (signed URLs)
- MIME type detection
"""

import logging
from typing import Optional
from uuid import uuid4

from backend.database.supabase_client import get_supabase_client
from backend.services.exceptions import StorageError
from backend.services.creator_media.constants import (
    BUCKET_NAME,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
    MediaAssetType,
)
from backend.services.creator_media.models import UploadResult

logger = logging.getLogger(__name__)


class MediaStorageService:
    """
    Handles Supabase storage operations for media assets.
    
    Responsibilities:
    - Upload files with validation
    - Delete files
    - Generate public/signed URLs
    - Detect MIME types from file content
    """
    
    def __init__(self, supabase_client=None):
        """Initialize storage service."""
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
        asset_type: MediaAssetType,
        asset_id: str,
        extension: str
    ) -> str:
        """Generate storage path: {user_id}/{asset_type}/{asset_id}.{ext}"""
        return f"{user_id}/{asset_type}/{asset_id}{extension}"
    
    def _get_extension_from_mime(self, mime_type: str) -> str:
        """Get file extension from MIME type."""
        return ALLOWED_MIME_TYPES.get(mime_type, ".png")
    
    def detect_mime_type(self, data: bytes) -> str:
        """
        Detect MIME type from file magic bytes.
        
        Args:
            data: Raw file bytes
            
        Returns:
            Detected MIME type string
        """
        if data[:8] == b'\x89PNG\r\n\x1a\n':
            return "image/png"
        elif data[:2] == b'\xff\xd8':
            return "image/jpeg"
        elif data[:4] == b'RIFF' and data[8:12] == b'WEBP':
            return "image/webp"
        elif data[:6] in (b'GIF87a', b'GIF89a'):
            return "image/gif"
        elif b'<svg' in data[:1000]:
            return "image/svg+xml"
        return "image/png"  # Default fallback
    
    def validate_file(self, data: bytes) -> str:
        """
        Validate file data and return MIME type.
        
        Args:
            data: Raw file bytes
            
        Returns:
            Validated MIME type
            
        Raises:
            ValueError: If file is invalid
        """
        if len(data) > MAX_FILE_SIZE:
            raise ValueError(
                f"File too large: {len(data)} bytes. "
                f"Maximum: {MAX_FILE_SIZE} bytes (10MB)"
            )
        
        mime_type = self.detect_mime_type(data)
        if mime_type not in ALLOWED_MIME_TYPES:
            raise ValueError(
                f"Invalid file type. Allowed: {list(ALLOWED_MIME_TYPES.keys())}"
            )
        
        return mime_type
    
    async def upload(
        self,
        user_id: str,
        asset_type: MediaAssetType,
        asset_id: str,
        data: bytes,
        mime_type: str,
        suffix: str = "",
    ) -> UploadResult:
        """
        Upload file to Supabase storage.
        
        Args:
            user_id: User's ID
            asset_type: Type of asset
            asset_id: Unique asset ID
            data: Raw file bytes
            mime_type: MIME type of file
            suffix: Optional suffix for filename (e.g., "_processed")
            
        Returns:
            UploadResult with path and URL
            
        Raises:
            StorageError: If upload fails
        """
        extension = self._get_extension_from_mime(mime_type)
        # Add suffix before extension: {asset_id}{suffix}.{ext}
        filename = f"{asset_id}{suffix}{extension}"
        storage_path = f"{user_id}/{asset_type}/{filename}"
        
        try:
            # Upload to storage
            self.db.storage.from_(BUCKET_NAME).upload(
                path=storage_path,
                file=data,
                file_options={"content-type": mime_type}
            )
            
            # Get public URL
            url = self.db.storage.from_(BUCKET_NAME).get_public_url(storage_path)
            
            logger.info(
                f"Storage upload: user={user_id}, type={asset_type}, "
                f"id={asset_id}, suffix={suffix}, size={len(data)}"
            )
            
            return UploadResult(
                storage_path=storage_path,
                url=url,
                file_size=len(data),
                mime_type=mime_type,
            )
            
        except Exception as e:
            error_str = str(e)
            logger.error(f"Storage upload failed: {e}")
            
            # Provide helpful error message for common issues
            if "Bucket not found" in error_str or "404" in error_str:
                raise StorageError(
                    f"Storage bucket '{BUCKET_NAME}' not found. "
                    "Please create the bucket in Supabase Storage. "
                    "Go to Supabase Dashboard → Storage → New bucket → name it 'creator-media'"
                )
            
            raise StorageError(f"Failed to upload file: {error_str}")
    
    async def delete(self, storage_path: str) -> bool:
        """
        Delete file from storage.
        
        Args:
            storage_path: Full storage path
            
        Returns:
            True if deleted (or didn't exist)
        """
        try:
            self.db.storage.from_(BUCKET_NAME).remove([storage_path])
            logger.info(f"Storage delete: path={storage_path}")
            return True
        except Exception as e:
            logger.warning(f"Storage delete failed (may not exist): {e}")
            return False
    
    async def get_signed_url(
        self,
        storage_path: str,
        expires_in: int = 31536000  # 1 year
    ) -> Optional[str]:
        """
        Get signed URL for private file access.
        
        Args:
            storage_path: Full storage path
            expires_in: Expiration time in seconds
            
        Returns:
            Signed URL or None if failed
        """
        try:
            result = self.db.storage.from_(BUCKET_NAME).create_signed_url(
                path=storage_path,
                expires_in=expires_in
            )
            return result.get("signedURL") or result.get("signedUrl")
        except Exception as e:
            logger.warning(f"Failed to get signed URL: {e}")
            return None


# ============================================================================
# Singleton
# ============================================================================

_storage_service: Optional[MediaStorageService] = None


def get_storage_service() -> MediaStorageService:
    """Get or create storage service singleton."""
    global _storage_service
    if _storage_service is None:
        _storage_service = MediaStorageService()
    return _storage_service
