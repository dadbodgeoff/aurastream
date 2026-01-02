"""
Background Removal Service for Creator Media Library.

Uses rembg (U2Net model) for high-quality background removal.
The model is pre-downloaded in the Docker image for fast processing.

Note: rembg is CPU-intensive and runs in a thread pool executor
to avoid blocking the async event loop.
"""

import logging
from io import BytesIO
from typing import Optional

from PIL import Image

from backend.services.async_executor import run_cpu_bound

logger = logging.getLogger(__name__)


def _remove_background_sync(image_data: bytes) -> bytes:
    """
    Synchronous background removal - runs in thread pool.
    
    This is CPU-intensive and should NOT be called directly in async context.
    Use BackgroundRemovalService.remove_background() instead.
    """
    import rembg
    
    # Process with rembg (CPU-intensive)
    output_bytes = rembg.remove(image_data)
    
    # Ensure it's valid PNG with alpha
    image = Image.open(BytesIO(output_bytes))
    if image.mode != "RGBA":
        image = image.convert("RGBA")
    
    # Export as PNG
    output = BytesIO()
    image.save(output, format="PNG", optimize=True)
    output.seek(0)
    
    return output.getvalue()


class BackgroundRemovalService:
    """
    Service for removing backgrounds from images using rembg.
    
    Uses the U2Net model which is pre-downloaded in the Docker image.
    Handles various image formats and ensures RGBA output.
    
    All CPU-intensive operations run in a thread pool executor
    to prevent blocking the async event loop.
    """
    
    def __init__(self):
        """Initialize the background removal service."""
        self._session = None
    
    async def remove_background(self, image_data: bytes) -> bytes:
        """
        Remove background from an image.
        
        Runs in thread pool executor to avoid blocking the event loop.
        
        Args:
            image_data: Raw image bytes (PNG, JPEG, WebP, etc.)
            
        Returns:
            PNG bytes with transparent background (RGBA)
            
        Raises:
            ValueError: If image processing fails
        """
        try:
            # Run CPU-intensive rembg in thread pool
            result = await run_cpu_bound(_remove_background_sync, image_data)
            
            logger.info(f"Background removed: {len(image_data)} -> {len(result)} bytes")
            return result
            
        except ImportError:
            logger.error("rembg not installed - background removal unavailable")
            raise ValueError("Background removal service unavailable")
        except Exception as e:
            logger.error(f"Background removal failed: {e}")
            raise ValueError(f"Failed to remove background: {str(e)}")
    
    def get_image_dimensions(self, image_data: bytes) -> tuple[int, int]:
        """
        Get dimensions of an image.
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Tuple of (width, height)
        """
        image = Image.open(BytesIO(image_data))
        return image.size


# Singleton instance
_service: Optional[BackgroundRemovalService] = None


def get_background_removal_service() -> BackgroundRemovalService:
    """Get or create the background removal service singleton."""
    global _service
    if _service is None:
        _service = BackgroundRemovalService()
    return _service
