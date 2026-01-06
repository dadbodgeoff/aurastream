"""
Depth Map Generation Service using Depth Anything V2.

Depth Anything V2 is a state-of-the-art monocular depth estimation model
that produces high-quality depth maps from single images.

Model: depth-anything/Depth-Anything-V2-Small (25M params, fastest)
Performance: ~2-3 seconds on CPU for 512x512 image
Cost: ~$0.001 per image (self-hosted)
"""

import logging
from io import BytesIO
from typing import Optional
from PIL import Image
import numpy as np

from backend.services.storage_service import get_storage_service
from backend.core.async_executor import run_in_executor

logger = logging.getLogger(__name__)

# Lazy-load the model to avoid startup overhead
_depth_pipeline = None


def get_depth_pipeline():
    """Lazy-load Depth Anything V2 pipeline."""
    global _depth_pipeline
    if _depth_pipeline is None:
        from transformers import pipeline
        
        logger.info("Loading Depth Anything V2 model...")
        _depth_pipeline = pipeline(
            task="depth-estimation",
            model="depth-anything/Depth-Anything-V2-Small",
            device="cpu",
        )
        logger.info("Depth Anything V2 model loaded")
    
    return _depth_pipeline


class DepthMapService:
    """
    Service for generating depth maps from images.
    
    Uses Depth Anything V2 for monocular depth estimation.
    Runs on CPU to minimize infrastructure costs.
    """
    
    def __init__(self):
        self.storage = get_storage_service()
    
    async def generate_depth_map(
        self,
        source_url: str,
        user_id: str,
        project_id: str,
    ) -> dict:
        """
        Generate depth map for an image.
        
        Args:
            source_url: URL of the source image
            user_id: User ID for storage path
            project_id: Project ID for storage path
            
        Returns:
            dict with depth_map_url and storage_path
        """
        # Download source image
        image_bytes = await self._download_image(source_url)
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        
        # Generate depth map (CPU-bound, run in thread pool)
        depth_map = await run_in_executor(self._estimate_depth, image)
        
        # Convert to PNG bytes
        depth_bytes = self._depth_to_png(depth_map)
        
        # Upload to storage
        storage_path = f"{user_id}/animations/{project_id}/depth_map.png"
        result = await self.storage.upload_raw(
            path=storage_path,
            data=depth_bytes,
            content_type="image/png",
        )
        
        return {
            "depth_map_url": result["url"],
            "storage_path": result["path"],
            "file_size": len(depth_bytes),
        }
    
    def _estimate_depth(self, image: Image.Image) -> np.ndarray:
        """
        Estimate depth using Depth Anything V2.
        
        This is CPU-bound and runs in a thread pool.
        Takes ~2-3 seconds for a 512x512 image on modern CPU.
        """
        pipeline = get_depth_pipeline()
        
        # Run inference
        result = pipeline(image)
        
        # Extract depth map
        depth = result["depth"]
        
        # Convert to numpy array if needed
        if isinstance(depth, Image.Image):
            depth = np.array(depth)
        
        # Normalize to 0-255 range
        depth = depth.astype(np.float32)
        depth = (depth - depth.min()) / (depth.max() - depth.min() + 1e-8)
        depth = (depth * 255).astype(np.uint8)
        
        return depth
    
    def _depth_to_png(self, depth: np.ndarray) -> bytes:
        """Convert depth array to PNG bytes."""
        image = Image.fromarray(depth, mode="L")
        
        buffer = BytesIO()
        image.save(buffer, format="PNG", optimize=True)
        return buffer.getvalue()
    
    async def _download_image(self, url: str) -> bytes:
        """Download image from URL."""
        import httpx
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30)
            response.raise_for_status()
            return response.content


# Singleton
_depth_service: Optional[DepthMapService] = None


def get_depth_service() -> DepthMapService:
    """Get singleton depth service instance."""
    global _depth_service
    if _depth_service is None:
        _depth_service = DepthMapService()
    return _depth_service
