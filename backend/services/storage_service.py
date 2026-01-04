"""
Storage Service for Aurastream.

This service handles all asset storage operations using Supabase Storage:
- Uploading generated assets (thumbnails, overlays, etc.)
- Deleting assets
- Generating signed URLs for private assets
- Managing asset visibility (public/private)

Security Notes:
- Uses service role key for admin operations
- Generates unique file names using UUID to prevent collisions
- Supports both public and signed URLs based on visibility

Environment Variables:
- SUPABASE_URL: Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY: Service role key for storage operations
"""

import logging
import mimetypes
from dataclasses import dataclass
from typing import Optional
from uuid import uuid4

from backend.api.config import get_settings
from backend.database.supabase_client import get_supabase_client
from backend.services.exceptions import (
    AssetNotFoundError,
    StorageDeleteError,
    StorageError,
    StorageUploadError,
)


# Configure module logger
logger = logging.getLogger(__name__)


# Content type to file extension mapping
CONTENT_TYPE_EXTENSIONS = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
}

# Default bucket for asset storage
DEFAULT_BUCKET = "assets"


@dataclass
class UploadResult:
    """
    Result of a successful asset upload.
    
    Attributes:
        url: Public or signed URL to access the asset
        path: Storage path within the bucket (user_id/job_id/filename)
        file_size: Size of the uploaded file in bytes
    """
    url: str
    path: str
    file_size: int


class StorageService:
    """
    Service for managing asset storage in Supabase Storage.
    
    Provides methods for uploading, deleting, and managing access
    to generated assets. Uses the 'assets' bucket with path structure:
    {user_id}/{job_id}/{uuid}.{extension}
    
    Example:
        ```python
        from backend.services.storage_service import StorageService
        
        storage = StorageService()
        
        # Upload an asset
        result = await storage.upload_asset(
            user_id="user-uuid",
            job_id="job-uuid",
            image_data=image_bytes,
            content_type="image/png"
        )
        print(f"Uploaded to: {result.url}")
        
        # Get a signed URL for private access
        signed_url = await storage.get_signed_url(result.path, expires_in=3600)
        
        # Delete the asset
        await storage.delete_asset(result.path)
        ```
    """
    
    def __init__(self, supabase_client=None, bucket: str = DEFAULT_BUCKET):
        """
        Initialize the storage service.
        
        Args:
            supabase_client: Supabase client instance (uses singleton if not provided)
            bucket: Storage bucket name (defaults to 'assets')
        """
        self._supabase = supabase_client
        self._bucket = bucket
        self._settings = None
    
    @property
    def db(self):
        """Lazy-load Supabase client."""
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
    @property
    def settings(self):
        """Lazy-load settings."""
        if self._settings is None:
            self._settings = get_settings()
        return self._settings
    
    @property
    def storage(self):
        """Get the Supabase storage client."""
        return self.db.storage
    
    def _get_extension_from_content_type(self, content_type: str) -> str:
        """
        Get file extension from content type.
        
        Args:
            content_type: MIME type (e.g., 'image/png')
            
        Returns:
            File extension without dot (e.g., 'png')
        """
        # Check our mapping first
        if content_type in CONTENT_TYPE_EXTENSIONS:
            return CONTENT_TYPE_EXTENSIONS[content_type]
        
        # Fall back to mimetypes library
        ext = mimetypes.guess_extension(content_type)
        if ext:
            return ext.lstrip(".")
        
        # Default to png for unknown image types
        return "png"
    
    def _build_storage_path(
        self, 
        user_id: str, 
        job_id: str, 
        extension: str,
        suffix: str = ""
    ) -> str:
        """
        Build the storage path for an asset.
        
        Path structure: {user_id}/{job_id}/{uuid}{suffix}.{extension}
        
        Args:
            user_id: User's UUID
            job_id: Generation job's UUID
            extension: File extension (without dot)
            suffix: Optional suffix to add before extension (e.g., "_112x112")
            
        Returns:
            Full storage path within the bucket
        """
        unique_id = str(uuid4())
        return f"{user_id}/{job_id}/{unique_id}{suffix}.{extension}"
    
    def _get_public_url(self, path: str) -> str:
        """
        Get the public URL for an asset.
        
        Args:
            path: Storage path within the bucket
            
        Returns:
            Full public URL to the asset
        """
        return self.storage.from_(self._bucket).get_public_url(path)
    
    async def upload_asset(
        self,
        user_id: str,
        job_id: str,
        image_data: bytes,
        content_type: str = "image/png",
        suffix: str = ""
    ) -> UploadResult:
        """
        Upload an asset to Supabase Storage.
        
        Creates a unique file path using UUID to prevent collisions.
        The asset is uploaded to the 'assets' bucket with the structure:
        {user_id}/{job_id}/{uuid}{suffix}.{extension}
        
        Args:
            user_id: User's UUID who owns the asset
            job_id: Generation job's UUID that created the asset
            image_data: Raw image bytes to upload
            content_type: MIME type of the image (default: 'image/png')
            suffix: Optional suffix to add to filename (e.g., "_112x112" for emote sizes)
            
        Returns:
            UploadResult with url, path, and file_size
            
        Raises:
            StorageUploadError: If upload fails for any reason
            
        Example:
            ```python
            result = await storage.upload_asset(
                user_id="user-123",
                job_id="job-456",
                image_data=png_bytes,
                content_type="image/png"
            )
            # result.path = "user-123/job-456/abc-def-123.png"
            
            # With suffix for emote sizes:
            result = await storage.upload_asset(
                user_id="user-123",
                job_id="job-456",
                image_data=png_bytes,
                content_type="image/png",
                suffix="_112x112"
            )
            # result.path = "user-123/job-456/abc-def-123_112x112.png"
            ```
        """
        # Get file extension from content type
        extension = self._get_extension_from_content_type(content_type)
        
        # Build unique storage path
        path = self._build_storage_path(user_id, job_id, extension, suffix)
        
        try:
            logger.info(f"Uploading asset to {self._bucket}/{path}")
            
            # Upload to Supabase Storage
            response = self.storage.from_(self._bucket).upload(
                path=path,
                file=image_data,
                file_options={
                    "content-type": content_type,
                    "upsert": "false"  # Don't overwrite existing files
                }
            )
            
            # Get the public URL
            public_url = self._get_public_url(path)
            
            # Calculate file size
            file_size = len(image_data)
            
            logger.info(
                f"Successfully uploaded asset: path={path}, "
                f"size={file_size} bytes"
            )
            
            return UploadResult(
                url=public_url,
                path=path,
                file_size=file_size
            )
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to upload asset to {path}: {error_msg}")
            raise StorageUploadError(reason=error_msg, path=path)
    
    async def delete_asset(self, path: str) -> None:
        """
        Delete an asset from Supabase Storage.
        
        Args:
            path: Storage path of the asset to delete
            
        Raises:
            StorageDeleteError: If deletion fails
            AssetNotFoundError: If asset doesn't exist
            
        Example:
            ```python
            await storage.delete_asset("user-123/job-456/abc-def.png")
            ```
        """
        try:
            logger.info(f"Deleting asset at {self._bucket}/{path}")
            
            # Delete from Supabase Storage
            response = self.storage.from_(self._bucket).remove([path])
            
            # Check if deletion was successful
            # Supabase returns the deleted files in the response
            if not response:
                logger.warning(f"Asset may not exist at path: {path}")
            
            logger.info(f"Successfully deleted asset: {path}")
            
        except Exception as e:
            error_msg = str(e)
            
            # Check if it's a not found error
            if "not found" in error_msg.lower() or "404" in error_msg:
                logger.warning(f"Asset not found at path: {path}")
                raise AssetNotFoundError(path=path)
            
            logger.error(f"Failed to delete asset at {path}: {error_msg}")
            raise StorageDeleteError(reason=error_msg, path=path)
    
    async def get_signed_url(
        self, 
        path: str, 
        expires_in: int = 3600
    ) -> str:
        """
        Generate a signed URL for private asset access.
        
        Signed URLs provide temporary access to private assets.
        The URL expires after the specified duration.
        
        Args:
            path: Storage path of the asset
            expires_in: URL expiration time in seconds (default: 3600 = 1 hour)
            
        Returns:
            Signed URL string with temporary access
            
        Raises:
            AssetNotFoundError: If asset doesn't exist
            StorageError: If URL generation fails
            
        Example:
            ```python
            # Get a URL that expires in 1 hour
            url = await storage.get_signed_url("user-123/job-456/abc.png")
            
            # Get a URL that expires in 24 hours
            url = await storage.get_signed_url(
                "user-123/job-456/abc.png",
                expires_in=86400
            )
            ```
        """
        try:
            logger.debug(f"Generating signed URL for {path}, expires_in={expires_in}s")
            
            # Generate signed URL
            response = self.storage.from_(self._bucket).create_signed_url(
                path=path,
                expires_in=expires_in
            )
            
            # Extract the signed URL from response
            if isinstance(response, dict) and "signedURL" in response:
                signed_url = response["signedURL"]
            elif hasattr(response, "signed_url"):
                signed_url = response.signed_url
            else:
                # Handle different response formats
                signed_url = str(response)
            
            logger.debug(f"Generated signed URL for {path}")
            return signed_url
            
        except Exception as e:
            error_msg = str(e)
            
            # Check if it's a not found error
            if "not found" in error_msg.lower() or "404" in error_msg:
                logger.warning(f"Asset not found at path: {path}")
                raise AssetNotFoundError(path=path)
            
            logger.error(f"Failed to generate signed URL for {path}: {error_msg}")
            raise StorageError(
                message=f"Failed to generate signed URL: {error_msg}",
                code="STORAGE_SIGNED_URL_ERROR",
                details={"path": path, "reason": error_msg}
            )
    
    async def set_visibility(self, path: str, is_public: bool) -> str:
        """
        Set the visibility of an asset (public or private).
        
        For public assets, returns the public URL.
        For private assets, returns a signed URL with default expiry.
        
        Note: Supabase Storage visibility is controlled at the bucket level
        by default. This method handles URL generation based on desired
        visibility. For true visibility control, bucket policies should
        be configured in Supabase.
        
        Args:
            path: Storage path of the asset
            is_public: True for public access, False for private (signed URL)
            
        Returns:
            URL to access the asset (public URL or signed URL)
            
        Raises:
            AssetNotFoundError: If asset doesn't exist
            StorageError: If operation fails
            
        Example:
            ```python
            # Make asset public
            public_url = await storage.set_visibility(
                "user-123/job-456/abc.png",
                is_public=True
            )
            
            # Make asset private (returns signed URL)
            private_url = await storage.set_visibility(
                "user-123/job-456/abc.png",
                is_public=False
            )
            ```
        """
        try:
            logger.info(
                f"Setting visibility for {path}: "
                f"{'public' if is_public else 'private'}"
            )
            
            if is_public:
                # Return public URL
                url = self._get_public_url(path)
                logger.debug(f"Returning public URL for {path}")
            else:
                # Return signed URL with default 1-hour expiry
                url = await self.get_signed_url(path, expires_in=3600)
                logger.debug(f"Returning signed URL for {path}")
            
            return url
            
        except AssetNotFoundError:
            raise
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to set visibility for {path}: {error_msg}")
            raise StorageError(
                message=f"Failed to set visibility: {error_msg}",
                code="STORAGE_VISIBILITY_ERROR",
                details={"path": path, "is_public": is_public, "reason": error_msg}
            )
    
    async def asset_exists(self, path: str) -> bool:
        """
        Check if an asset exists at the given path.
        
        Args:
            path: Storage path to check
            
        Returns:
            True if asset exists, False otherwise
        """
        try:
            # Try to get file info by listing with the exact path
            # Split path into folder and filename
            parts = path.rsplit("/", 1)
            if len(parts) == 2:
                folder, filename = parts
            else:
                folder = ""
                filename = path
            
            response = self.storage.from_(self._bucket).list(folder)
            
            # Check if the file exists in the listing
            for item in response:
                if item.get("name") == filename:
                    return True
            
            return False
            
        except Exception as e:
            logger.debug(f"Error checking if asset exists at {path}: {e}")
            return False
    
    async def upload_raw(
        self,
        path: str,
        data: bytes,
        content_type: str = "image/png",
    ) -> UploadResult:
        """
        Upload raw data to a specific path in storage.
        
        Unlike upload_asset, this method allows specifying the exact path
        without auto-generating UUIDs. Useful for temporary files like
        canvas snapshots.
        
        Args:
            path: Full storage path (e.g., "snapshots/user-123/snap_abc.png")
            data: Raw bytes to upload
            content_type: MIME type of the data
            
        Returns:
            UploadResult with url, path, and file_size
            
        Raises:
            StorageUploadError: If upload fails
            
        Example:
            ```python
            result = await storage.upload_raw(
                path="snapshots/user-123/snap_abc.png",
                data=image_bytes,
                content_type="image/png"
            )
            ```
        """
        try:
            logger.info(f"Uploading raw data to {self._bucket}/{path}")
            
            # Upload to Supabase Storage
            response = self.storage.from_(self._bucket).upload(
                path=path,
                file=data,
                file_options={
                    "content-type": content_type,
                    "upsert": "true"  # Allow overwriting for snapshots
                }
            )
            
            # Get the public URL
            public_url = self._get_public_url(path)
            
            # Calculate file size
            file_size = len(data)
            
            logger.info(
                f"Successfully uploaded raw data: path={path}, "
                f"size={file_size} bytes"
            )
            
            return UploadResult(
                url=public_url,
                path=path,
                file_size=file_size
            )
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to upload raw data to {path}: {error_msg}")
            raise StorageUploadError(reason=error_msg, path=path)

    async def get_asset_info(self, path: str) -> Optional[dict]:
        """
        Get metadata about an asset.
        
        Args:
            path: Storage path of the asset
            
        Returns:
            Dictionary with asset metadata or None if not found
            
        Example:
            ```python
            info = await storage.get_asset_info("user-123/job-456/abc.png")
            # info = {"name": "abc.png", "size": 12345, "created_at": "..."}
            ```
        """
        try:
            # Split path into folder and filename
            parts = path.rsplit("/", 1)
            if len(parts) == 2:
                folder, filename = parts
            else:
                folder = ""
                filename = path
            
            response = self.storage.from_(self._bucket).list(folder)
            
            # Find the file in the listing
            for item in response:
                if item.get("name") == filename:
                    return {
                        "name": item.get("name"),
                        "size": item.get("metadata", {}).get("size"),
                        "content_type": item.get("metadata", {}).get("mimetype"),
                        "created_at": item.get("created_at"),
                        "updated_at": item.get("updated_at"),
                        "path": path,
                    }
            
            return None
            
        except Exception as e:
            logger.debug(f"Error getting asset info for {path}: {e}")
            return None


# Singleton instance for convenience
_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    """
    Get or create the storage service singleton.
    
    Returns:
        StorageService: Singleton instance of the storage service
        
    Example:
        ```python
        from backend.services.storage_service import get_storage_service
        
        storage = get_storage_service()
        result = await storage.upload_asset(...)
        ```
    """
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
