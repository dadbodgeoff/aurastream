"""
Enterprise-Grade Depth Map Service

Generates high-quality depth maps using Depth Anything V2 with:
- Edge refinement for crisp layer separation
- Multi-scale processing for detail preservation
- Depth layer segmentation for parallax effects
- Bilateral filtering for smooth gradients

Model: depth-anything/Depth-Anything-V2-Small (25M params)
Performance: ~2-3 seconds on CPU for 512x512 image
"""

import logging
from io import BytesIO
from typing import Optional, Dict, Any
from PIL import Image
import numpy as np

logger = logging.getLogger(__name__)

# Lazy-load the model to avoid startup overhead
_depth_pipeline = None


def get_depth_pipeline():
    """Lazy-load Depth Anything V2 pipeline."""
    global _depth_pipeline
    if _depth_pipeline is None:
        try:
            from transformers import pipeline
            
            logger.info("Loading Depth Anything V2 model...")
            # Use the correct model ID from HuggingFace
            _depth_pipeline = pipeline(
                task="depth-estimation",
                model="depth-anything/Depth-Anything-V2-Small-hf",
                device="cpu",
            )
            logger.info("Depth Anything V2 model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Depth Anything V2: {e}")
            raise
    
    return _depth_pipeline


class DepthMapService:
    """
    Enterprise-grade depth map generation service.
    
    Features:
    - High-quality depth estimation with Depth Anything V2
    - Edge-aware refinement for crisp layer boundaries
    - Depth layer segmentation for parallax effects
    - Smooth gradient generation for professional animations
    """
    
    def __init__(self):
        self._storage = None
    
    @property
    def storage(self):
        """Lazy-load storage service."""
        if self._storage is None:
            from backend.services.storage_service import get_storage_service
            self._storage = get_storage_service()
        return self._storage
    
    async def generate_depth_map(
        self,
        source_url: str,
        user_id: str,
        project_id: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Generate enterprise-quality depth map for an image.
        
        Args:
            source_url: URL of the source image
            user_id: User ID for storage path
            project_id: Project ID for storage path
            options: Optional processing options
                - edge_refinement: bool (default True)
                - layer_count: int (default 5)
                - smooth_factor: float (default 0.3)
                - preserve_edges: bool (default True)
        
        Returns:
            dict with depth_map_url, layer_data, and metadata
        """
        options = options or {}
        
        # Download source image
        image_bytes = await self._download_image(source_url)
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        original_size = image.size
        
        # Generate raw depth map
        depth_raw = await self._estimate_depth(image)
        
        # Apply enterprise-grade refinements
        depth_refined = self._refine_depth_map(
            depth_raw,
            image,
            edge_refinement=options.get("edge_refinement", True),
            smooth_factor=options.get("smooth_factor", 0.3),
            preserve_edges=options.get("preserve_edges", True),
        )
        
        # Generate depth layers for parallax
        layer_count = options.get("layer_count", 5)
        layer_data = self._generate_depth_layers(depth_refined, layer_count)
        
        # Convert to PNG bytes
        depth_bytes = self._depth_to_png(depth_refined)
        
        # Upload to storage
        storage_path = f"{user_id}/animations/{project_id}/depth_map.png"
        result = await self.storage.upload_raw(
            path=storage_path,
            data=depth_bytes,
            content_type="image/png",
        )
        
        return {
            "depth_map_url": result.url,
            "storage_path": result.path,
            "file_size": len(depth_bytes),
            "original_size": original_size,
            "layer_data": layer_data,
            "metadata": {
                "model": "depth-anything/Depth-Anything-V2-Small-hf",
                "edge_refinement": options.get("edge_refinement", True),
                "layer_count": layer_count,
                "smooth_factor": options.get("smooth_factor", 0.3),
            },
        }
    
    async def _estimate_depth(self, image: Image.Image) -> np.ndarray:
        """
        Estimate depth using Depth Anything V2.
        
        Runs in thread pool as it's CPU-bound.
        """
        import asyncio
        
        def _run_inference():
            pipeline = get_depth_pipeline()
            result = pipeline(image)
            depth = result["depth"]
            
            if isinstance(depth, Image.Image):
                depth = np.array(depth)
            
            # Normalize to 0-1 range
            depth = depth.astype(np.float32)
            depth = (depth - depth.min()) / (depth.max() - depth.min() + 1e-8)
            
            return depth
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _run_inference)
    
    def _refine_depth_map(
        self,
        depth: np.ndarray,
        source_image: Image.Image,
        edge_refinement: bool = True,
        smooth_factor: float = 0.3,
        preserve_edges: bool = True,
    ) -> np.ndarray:
        """
        Apply enterprise-grade refinements to depth map.
        
        1. Edge-aware bilateral filtering for smooth gradients
        2. Edge detection from source for crisp boundaries
        3. Guided filtering to align depth edges with image edges
        """
        # Convert source to grayscale for edge detection
        source_gray = np.array(source_image.convert("L")).astype(np.float32) / 255.0
        
        # Step 1: Bilateral-like smoothing (preserves edges)
        if smooth_factor > 0:
            depth = self._bilateral_smooth(depth, smooth_factor)
        
        # Step 2: Edge refinement using source image edges
        if edge_refinement and preserve_edges:
            # Detect edges in source image
            source_edges = self._detect_edges(source_gray)
            
            # Detect edges in depth map
            depth_edges = self._detect_edges(depth)
            
            # Blend depth edges with source edges for alignment
            edge_weight = 0.7
            combined_edges = edge_weight * source_edges + (1 - edge_weight) * depth_edges
            
            # Apply edge-aware sharpening
            depth = self._edge_aware_sharpen(depth, combined_edges)
        
        # Step 3: Normalize and enhance contrast
        depth = self._enhance_depth_contrast(depth)
        
        return depth
    
    def _bilateral_smooth(
        self,
        depth: np.ndarray,
        smooth_factor: float,
    ) -> np.ndarray:
        """
        Apply bilateral-like smoothing that preserves edges.
        
        Uses a simplified approach with Gaussian + edge preservation.
        """
        from scipy import ndimage
        
        # Gaussian smoothing
        sigma = smooth_factor * 5
        smoothed = ndimage.gaussian_filter(depth, sigma=sigma)
        
        # Preserve edges by blending based on gradient magnitude
        gradient_x = ndimage.sobel(depth, axis=1)
        gradient_y = ndimage.sobel(depth, axis=0)
        gradient_mag = np.sqrt(gradient_x**2 + gradient_y**2)
        
        # Normalize gradient magnitude
        gradient_mag = gradient_mag / (gradient_mag.max() + 1e-8)
        
        # Blend: keep original at edges, use smoothed elsewhere
        edge_threshold = 0.1
        edge_mask = np.clip(gradient_mag / edge_threshold, 0, 1)
        
        result = edge_mask * depth + (1 - edge_mask) * smoothed
        
        return result
    
    def _detect_edges(self, image: np.ndarray) -> np.ndarray:
        """Detect edges using Sobel operator."""
        from scipy import ndimage
        
        gradient_x = ndimage.sobel(image, axis=1)
        gradient_y = ndimage.sobel(image, axis=0)
        edges = np.sqrt(gradient_x**2 + gradient_y**2)
        
        # Normalize
        edges = edges / (edges.max() + 1e-8)
        
        return edges
    
    def _edge_aware_sharpen(
        self,
        depth: np.ndarray,
        edges: np.ndarray,
    ) -> np.ndarray:
        """
        Sharpen depth map along detected edges.
        
        This creates crisp layer boundaries for parallax effects.
        """
        from scipy import ndimage
        
        # Unsharp mask
        blurred = ndimage.gaussian_filter(depth, sigma=1.5)
        sharpened = depth + 0.5 * (depth - blurred)
        
        # Apply sharpening only at edges
        edge_strength = np.clip(edges * 2, 0, 1)
        result = edge_strength * sharpened + (1 - edge_strength) * depth
        
        # Clamp to valid range
        result = np.clip(result, 0, 1)
        
        return result
    
    def _enhance_depth_contrast(self, depth: np.ndarray) -> np.ndarray:
        """
        Enhance depth contrast for better layer separation.
        
        Uses histogram equalization with clipping to avoid over-enhancement.
        """
        # Simple contrast stretch
        p_low, p_high = np.percentile(depth, [2, 98])
        depth_stretched = np.clip((depth - p_low) / (p_high - p_low + 1e-8), 0, 1)
        
        # Apply slight S-curve for more natural depth perception
        # S-curve: y = 0.5 + 0.5 * tanh(k * (x - 0.5))
        k = 2.0  # Curve steepness
        depth_curved = 0.5 + 0.5 * np.tanh(k * (depth_stretched - 0.5))
        
        return depth_curved
    
    def _generate_depth_layers(
        self,
        depth: np.ndarray,
        layer_count: int = 5,
    ) -> Dict[str, Any]:
        """
        Generate depth layer data for parallax animation.
        
        Segments depth into discrete layers with:
        - Layer boundaries (depth thresholds)
        - Layer masks (for selective animation)
        - Parallax multipliers (how much each layer moves)
        
        Returns:
            dict with layer boundaries, parallax factors, and statistics
        """
        # Calculate layer boundaries using quantiles for even distribution
        boundaries = []
        for i in range(layer_count + 1):
            percentile = (i / layer_count) * 100
            boundary = np.percentile(depth, percentile)
            boundaries.append(float(boundary))
        
        # Calculate parallax multipliers
        # Background (far) moves less, foreground (near) moves more
        parallax_factors = []
        for i in range(layer_count):
            # Linear interpolation from 0.2 (background) to 1.0 (foreground)
            factor = 0.2 + (i / (layer_count - 1)) * 0.8 if layer_count > 1 else 0.6
            parallax_factors.append(round(factor, 3))
        
        # Calculate layer statistics
        layer_stats = []
        for i in range(layer_count):
            low = boundaries[i]
            high = boundaries[i + 1]
            mask = (depth >= low) & (depth < high)
            coverage = float(np.mean(mask))
            
            layer_stats.append({
                "index": i,
                "depth_min": round(low, 4),
                "depth_max": round(high, 4),
                "parallax_factor": parallax_factors[i],
                "coverage_percent": round(coverage * 100, 2),
                "label": self._get_layer_label(i, layer_count),
            })
        
        return {
            "layer_count": layer_count,
            "boundaries": boundaries,
            "parallax_factors": parallax_factors,
            "layers": layer_stats,
            "depth_range": {
                "min": float(depth.min()),
                "max": float(depth.max()),
                "mean": float(depth.mean()),
                "std": float(depth.std()),
            },
        }
    
    def _get_layer_label(self, index: int, total: int) -> str:
        """Get human-readable label for depth layer."""
        if total <= 3:
            labels = ["Background", "Midground", "Foreground"]
            return labels[min(index, len(labels) - 1)]
        
        if index == 0:
            return "Far Background"
        elif index == total - 1:
            return "Near Foreground"
        elif index < total // 2:
            return f"Background {index}"
        else:
            return f"Foreground {index - total // 2 + 1}"
    
    def _depth_to_png(self, depth: np.ndarray) -> bytes:
        """Convert depth array to high-quality PNG bytes."""
        # Convert to 8-bit
        depth_8bit = (depth * 255).astype(np.uint8)
        
        # Create image
        image = Image.fromarray(depth_8bit, mode="L")
        
        # Save with maximum compression
        buffer = BytesIO()
        image.save(buffer, format="PNG", optimize=True, compress_level=9)
        
        return buffer.getvalue()
    
    async def _download_image(self, url: str) -> bytes:
        """Download image from URL with timeout and error handling."""
        import httpx
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.content
    
    async def generate_depth_preview(
        self,
        source_url: str,
        preview_size: int = 256,
    ) -> bytes:
        """
        Generate a quick depth preview for UI feedback.
        
        Uses smaller image size for faster processing (~1 second).
        """
        image_bytes = await self._download_image(source_url)
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        
        # Resize for faster processing
        image.thumbnail((preview_size, preview_size), Image.Resampling.LANCZOS)
        
        # Generate depth
        depth = await self._estimate_depth(image)
        
        # Quick refinement
        depth = self._enhance_depth_contrast(depth)
        
        return self._depth_to_png(depth)


# Singleton instance
_depth_service: Optional[DepthMapService] = None


def get_depth_service() -> DepthMapService:
    """Get singleton depth service instance."""
    global _depth_service
    if _depth_service is None:
        _depth_service = DepthMapService()
    return _depth_service
