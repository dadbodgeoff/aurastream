"""
Creator Media Asset Compositor Service for Aurastream.

This service handles compositing user media assets onto generated images.
Uses Pillow for image manipulation with support for:
- Precise percentage-based positioning
- Multiple assets with z-index layering
- Rotation and opacity controls
- Automatic scaling based on canvas dimensions
- Async HTTP fetching of remote assets

Architecture follows the same pattern as LogoCompositor but with
extended capabilities for the Creator Media Library feature.

Note: All CPU-intensive PIL operations run in thread pool executors
to avoid blocking the async event loop.

Usage:
    compositor = MediaAssetCompositor()
    result = await compositor.composite(
        base_image=image_bytes,
        placements=[
            {
                "asset_id": "uuid",
                "url": "https://...",
                "x": 85,  # percentage
                "y": 90,  # percentage
                "width": 15,  # percentage
                "height": 15,  # percentage
                "size_unit": "percent",
                "z_index": 1,
                "rotation": 0,
                "opacity": 100,
            }
        ],
        canvas_width=1280,
        canvas_height=720,
    )
"""

import asyncio
import io
import logging
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple

import aiohttp
from PIL import Image

from backend.services.async_executor import run_cpu_bound

logger = logging.getLogger(__name__)

# HTTP client timeout for fetching remote assets
FETCH_TIMEOUT_SECONDS = 30

# Maximum number of assets to composite (no limit - user controls via canvas)
MAX_COMPOSITE_ASSETS = 100

# Minimum asset size as percentage of canvas (prevents invisible assets)
MIN_SIZE_PERCENT = 1.0

# Maximum asset size as percentage of canvas (prevents oversized assets)
MAX_SIZE_PERCENT = 100.0


@dataclass
class PlacementSpec:
    """
    Validated placement specification for a single asset.
    
    All position and size values are normalized to percentages (0-100).
    """
    asset_id: str
    url: str
    display_name: str
    asset_type: str
    x: float  # 0-100 percentage from left
    y: float  # 0-100 percentage from top
    width: float  # percentage of canvas width
    height: float  # percentage of canvas height
    z_index: int
    rotation: float  # degrees
    opacity: float  # 0-100 percentage


@dataclass
class CompositeResult:
    """Result of a composite operation."""
    image_data: bytes
    assets_composited: int
    errors: List[str]


class MediaAssetCompositor:
    """
    Service for compositing media assets onto generated images.
    
    Handles:
    - Fetching remote assets via HTTP
    - Scaling assets to specified dimensions
    - Positioning assets at percentage-based coordinates
    - Applying rotation and opacity
    - Layering multiple assets by z-index
    
    All operations preserve image quality using Lanczos resampling.
    """
    
    def __init__(self, timeout: int = FETCH_TIMEOUT_SECONDS):
        """
        Initialize the compositor.
        
        Args:
            timeout: HTTP timeout for fetching remote assets
        """
        self.timeout = timeout
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create the aiohttp session."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            )
        return self._session
    
    async def close(self):
        """Close the aiohttp session."""
        if self._session and not self._session.closed:
            await self._session.close()
    
    def _parse_placement(self, placement: Dict[str, Any], canvas_width: int, canvas_height: int) -> PlacementSpec:
        """
        Parse and validate a placement dictionary into PlacementSpec.
        
        Handles both camelCase (frontend) and snake_case (Pydantic) keys.
        Converts pixel dimensions to percentages if needed.
        
        Args:
            placement: Raw placement dictionary
            canvas_width: Target canvas width in pixels
            canvas_height: Target canvas height in pixels
            
        Returns:
            Validated PlacementSpec
        """
        # Support both camelCase and snake_case
        asset_id = placement.get('asset_id') or placement.get('assetId', '')
        url = placement.get('url', '')
        display_name = placement.get('display_name') or placement.get('displayName', 'asset')
        asset_type = placement.get('asset_type') or placement.get('assetType', 'image')
        
        x = float(placement.get('x', 50))
        y = float(placement.get('y', 50))
        width = float(placement.get('width', 20))
        height = float(placement.get('height', 20))
        size_unit = placement.get('size_unit') or placement.get('sizeUnit', 'percent')
        z_index = int(placement.get('z_index') or placement.get('zIndex', 1))
        rotation = float(placement.get('rotation', 0))
        opacity = float(placement.get('opacity', 100))
        
        # Convert pixel dimensions to percentages
        if size_unit == 'px':
            width = (width / canvas_width) * 100
            height = (height / canvas_height) * 100
        
        # Clamp values to valid ranges
        x = max(0, min(100, x))
        y = max(0, min(100, y))
        width = max(MIN_SIZE_PERCENT, min(MAX_SIZE_PERCENT, width))
        height = max(MIN_SIZE_PERCENT, min(MAX_SIZE_PERCENT, height))
        opacity = max(0, min(100, opacity))
        rotation = rotation % 360
        
        return PlacementSpec(
            asset_id=asset_id,
            url=url,
            display_name=display_name,
            asset_type=asset_type,
            x=x,
            y=y,
            width=width,
            height=height,
            z_index=z_index,
            rotation=rotation,
            opacity=opacity,
        )
    
    async def _fetch_asset(self, url: str) -> Optional[bytes]:
        """
        Fetch an asset from a remote URL.
        
        Args:
            url: URL of the asset to fetch
            
        Returns:
            Image bytes or None if fetch failed
        """
        if not url:
            logger.warning("Empty URL provided for asset fetch")
            return None
        
        try:
            session = await self._get_session()
            async with session.get(url) as response:
                if response.status == 200:
                    return await response.read()
                else:
                    logger.warning(f"Failed to fetch asset: status={response.status}, url={url[:100]}")
                    return None
        except asyncio.TimeoutError:
            logger.warning(f"Timeout fetching asset: url={url[:100]}")
            return None
        except Exception as e:
            logger.warning(f"Error fetching asset: error={e}, url={url[:100]}")
            return None
    
    def _calculate_pixel_position(
        self,
        spec: PlacementSpec,
        canvas_width: int,
        canvas_height: int,
        asset_width: int,
        asset_height: int,
    ) -> Tuple[int, int]:
        """
        Calculate pixel coordinates for asset placement.
        
        The x,y percentages represent the CENTER of the asset,
        so we offset by half the asset dimensions.
        
        Args:
            spec: Placement specification
            canvas_width: Canvas width in pixels
            canvas_height: Canvas height in pixels
            asset_width: Scaled asset width in pixels
            asset_height: Scaled asset height in pixels
            
        Returns:
            (x, y) pixel coordinates for top-left corner
        """
        # Convert percentage to pixel position (center point)
        center_x = int((spec.x / 100) * canvas_width)
        center_y = int((spec.y / 100) * canvas_height)
        
        # Offset to get top-left corner
        x = center_x - (asset_width // 2)
        y = center_y - (asset_height // 2)
        
        return (x, y)
    
    def _scale_asset(
        self,
        asset: Image.Image,
        spec: PlacementSpec,
        canvas_width: int,
        canvas_height: int,
    ) -> Image.Image:
        """
        Scale an asset to the specified dimensions.
        
        Args:
            asset: PIL Image to scale
            spec: Placement specification with width/height percentages
            canvas_width: Canvas width in pixels
            canvas_height: Canvas height in pixels
            
        Returns:
            Scaled PIL Image
        """
        target_width = int((spec.width / 100) * canvas_width)
        target_height = int((spec.height / 100) * canvas_height)
        
        # Ensure minimum size of 1 pixel
        target_width = max(1, target_width)
        target_height = max(1, target_height)
        
        return asset.resize((target_width, target_height), Image.Resampling.LANCZOS)
    
    def _apply_rotation(self, asset: Image.Image, rotation: float) -> Image.Image:
        """
        Apply rotation to an asset.
        
        Args:
            asset: PIL Image to rotate
            rotation: Rotation in degrees (clockwise)
            
        Returns:
            Rotated PIL Image with expanded canvas
        """
        if rotation == 0:
            return asset
        
        # Rotate with expand=True to prevent clipping
        # Use negative rotation because PIL rotates counter-clockwise
        return asset.rotate(-rotation, expand=True, resample=Image.Resampling.BICUBIC)
    
    def _apply_opacity(self, asset: Image.Image, opacity: float) -> Image.Image:
        """
        Apply opacity to an RGBA image.
        
        Args:
            asset: RGBA PIL Image
            opacity: Opacity percentage (0-100)
            
        Returns:
            Image with adjusted alpha channel
        """
        if opacity >= 100:
            return asset
        
        if asset.mode != 'RGBA':
            asset = asset.convert('RGBA')
        
        # Split channels and adjust alpha
        r, g, b, a = asset.split()
        a = a.point(lambda x: int(x * (opacity / 100)))
        
        return Image.merge('RGBA', (r, g, b, a))
    
    def _composite_single_asset(
        self,
        base: Image.Image,
        asset_bytes: bytes,
        spec: PlacementSpec,
    ) -> Image.Image:
        """
        Composite a single asset onto the base image.
        
        Args:
            base: Base PIL Image (RGBA)
            asset_bytes: Raw bytes of the asset to composite
            spec: Placement specification
            
        Returns:
            Base image with asset composited
        """
        # Load asset
        asset = Image.open(io.BytesIO(asset_bytes))
        
        # Convert to RGBA for transparency support
        if asset.mode != 'RGBA':
            asset = asset.convert('RGBA')
        
        canvas_width, canvas_height = base.size
        
        # Scale asset
        asset = self._scale_asset(asset, spec, canvas_width, canvas_height)
        
        # Apply rotation
        asset = self._apply_rotation(asset, spec.rotation)
        
        # Apply opacity
        asset = self._apply_opacity(asset, spec.opacity)
        
        # Calculate position
        x, y = self._calculate_pixel_position(
            spec, canvas_width, canvas_height, asset.width, asset.height
        )
        
        # Composite onto base
        # Create a temporary layer for proper alpha compositing
        layer = Image.new('RGBA', base.size, (0, 0, 0, 0))
        layer.paste(asset, (x, y), asset)
        
        return Image.alpha_composite(base, layer)
    
    def _composite_all_sync(
        self,
        base_image: bytes,
        specs_with_bytes: List[Tuple[PlacementSpec, Optional[bytes]]],
    ) -> Tuple[bytes, int, List[str]]:
        """
        Synchronous compositing - runs in thread pool.
        
        All CPU-intensive PIL operations happen here.
        
        Returns:
            Tuple of (output_bytes, assets_composited, errors)
        """
        errors: List[str] = []
        assets_composited = 0
        
        # Load base image
        base = Image.open(io.BytesIO(base_image))
        
        # Convert to RGBA for compositing
        if base.mode != 'RGBA':
            base = base.convert('RGBA')
        
        # Composite each asset
        for spec, asset_bytes in specs_with_bytes:
            if asset_bytes is None:
                errors.append(f"Failed to fetch asset: {spec.display_name}")
                continue
            
            try:
                base = self._composite_single_asset(base, asset_bytes, spec)
                assets_composited += 1
            except Exception as e:
                errors.append(f"Failed to composite {spec.display_name}: {str(e)}")
        
        # Convert back to PNG bytes
        output = io.BytesIO()
        base.save(output, format='PNG', optimize=True)
        output.seek(0)
        
        return output.read(), assets_composited, errors
    
    async def composite(
        self,
        base_image: bytes,
        placements: List[Dict[str, Any]],
        canvas_width: int,
        canvas_height: int,
    ) -> CompositeResult:
        """
        Composite multiple media assets onto a base image.
        
        Assets are layered in z-index order (lowest first).
        CPU-intensive PIL operations run in thread pool executor.
        
        Args:
            base_image: Base image bytes (PNG, JPEG, WebP)
            placements: List of placement dictionaries
            canvas_width: Expected canvas width (for validation)
            canvas_height: Expected canvas height (for validation)
            
        Returns:
            CompositeResult with composited image and metadata
        """
        if not placements:
            return CompositeResult(
                image_data=base_image,
                assets_composited=0,
                errors=["No placements provided"],
            )
        
        errors: List[str] = []
        
        # Warn if many assets (performance consideration)
        if len(placements) > 20:
            errors.append(f"Large number of assets ({len(placements)}) may affect performance")
        
        try:
            # Get actual dimensions from base image (quick operation)
            base_temp = Image.open(io.BytesIO(base_image))
            actual_width, actual_height = base_temp.size
            base_temp.close()
            
            # Parse and sort placements by z-index
            specs: List[PlacementSpec] = []
            for p in placements:
                spec = self._parse_placement(p, actual_width, actual_height)
                specs.append(spec)
            
            # Sort by z-index (lowest first = rendered first = behind)
            specs.sort(key=lambda x: x.z_index)
            
            # Fetch all assets concurrently (I/O bound, stays async)
            fetch_tasks = [self._fetch_asset(spec.url) for spec in specs]
            asset_bytes_list = await asyncio.gather(*fetch_tasks)
            
            # Pair specs with their fetched bytes
            specs_with_bytes = list(zip(specs, asset_bytes_list))
            
            # Log what we're compositing
            for spec, asset_bytes in specs_with_bytes:
                if asset_bytes is not None:
                    logger.info(
                        f"Compositing asset: name={spec.display_name}, "
                        f"type={spec.asset_type}, pos=({spec.x:.1f}%, {spec.y:.1f}%), "
                        f"size=({spec.width:.1f}%, {spec.height:.1f}%)"
                    )
            
            # Run CPU-intensive compositing in thread pool
            output_bytes, assets_composited, composite_errors = await run_cpu_bound(
                self._composite_all_sync,
                base_image,
                specs_with_bytes,
            )
            
            errors.extend(composite_errors)
            
            logger.info(
                f"Media compositing complete: "
                f"assets_composited={assets_composited}, "
                f"errors={len(errors)}"
            )
            
            return CompositeResult(
                image_data=output_bytes,
                assets_composited=assets_composited,
                errors=errors,
            )
            
        except Exception as e:
            logger.error(f"Media compositing failed: {e}")
            # Return original image on failure
            return CompositeResult(
                image_data=base_image,
                assets_composited=0,
                errors=[f"Compositing failed: {str(e)}"],
            )


# ============================================================================
# Singleton
# ============================================================================

_media_compositor: Optional[MediaAssetCompositor] = None


def get_media_compositor() -> MediaAssetCompositor:
    """Get or create the media asset compositor singleton."""
    global _media_compositor
    if _media_compositor is None:
        _media_compositor = MediaAssetCompositor()
    return _media_compositor


__all__ = [
    "MediaAssetCompositor",
    "get_media_compositor",
    "PlacementSpec",
    "CompositeResult",
]
