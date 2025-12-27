"""
Logo Compositor Service for Aurastream.

This service handles compositing brand logos onto generated images.
Uses Pillow for image manipulation with support for:
- Multiple logo positions (corners + center)
- Three size presets (small, medium, large)
- Transparency preservation
- Automatic padding and scaling

Usage:
    compositor = LogoCompositor()
    result = compositor.composite(
        base_image=image_bytes,
        logo=logo_bytes,
        position="bottom-right",
        size="medium"
    )
"""

import io
import logging
from typing import Literal, Optional, Tuple

from PIL import Image

logger = logging.getLogger(__name__)

# Type definitions
LogoPosition = Literal["top-left", "top-right", "bottom-left", "bottom-right", "center"]
LogoSize = Literal["small", "medium", "large"]

# Size presets as percentage of image width
SIZE_PRESETS: dict[LogoSize, float] = {
    "small": 0.10,    # 10% of image width
    "medium": 0.15,   # 15% of image width
    "large": 0.20,    # 20% of image width
}

# Padding from edges as percentage of image dimensions
EDGE_PADDING = 0.03  # 3% padding from edges


class LogoCompositor:
    """
    Service for compositing logos onto images.
    
    Handles logo scaling, positioning, and transparency.
    All operations preserve image quality and format.
    """
    
    def __init__(self, default_size: LogoSize = "medium"):
        """
        Initialize the compositor.
        
        Args:
            default_size: Default logo size if not specified
        """
        self.default_size = default_size
    
    def composite(
        self,
        base_image: bytes,
        logo: bytes,
        position: LogoPosition = "bottom-right",
        size: Optional[LogoSize] = None,
        opacity: float = 1.0,
    ) -> bytes:
        """
        Composite a logo onto a base image.
        
        Args:
            base_image: Base image bytes (PNG, JPEG, WebP)
            logo: Logo image bytes (PNG recommended for transparency)
            position: Where to place the logo
            size: Logo size preset (small, medium, large)
            opacity: Logo opacity (0.0 to 1.0)
            
        Returns:
            Composited image as PNG bytes
            
        Raises:
            ValueError: If images cannot be processed
        """
        size = size or self.default_size
        
        try:
            # Load images
            base = Image.open(io.BytesIO(base_image))
            logo_img = Image.open(io.BytesIO(logo))
            
            # Convert base to RGBA for compositing
            if base.mode != "RGBA":
                base = base.convert("RGBA")
            
            # Convert logo to RGBA
            if logo_img.mode != "RGBA":
                logo_img = logo_img.convert("RGBA")
            
            # Scale logo
            scaled_logo = self._scale_logo(logo_img, base.size, size)
            
            # Apply opacity if needed
            if opacity < 1.0:
                scaled_logo = self._apply_opacity(scaled_logo, opacity)
            
            # Calculate position
            x, y = self._calculate_position(base.size, scaled_logo.size, position)
            
            # Composite
            result = base.copy()
            result.paste(scaled_logo, (x, y), scaled_logo)
            
            # Convert back to RGB if original was JPEG (no alpha)
            # Keep as RGBA for PNG output
            
            # Save to bytes
            output = io.BytesIO()
            result.save(output, format="PNG", optimize=True)
            output.seek(0)
            
            logger.info(
                f"Logo composited: position={position}, size={size}, "
                f"base_size={base.size}, logo_size={scaled_logo.size}"
            )
            
            return output.read()
            
        except Exception as e:
            logger.error(f"Logo compositing failed: {e}")
            raise ValueError(f"Failed to composite logo: {str(e)}")
    
    def _scale_logo(
        self,
        logo: Image.Image,
        base_size: Tuple[int, int],
        size: LogoSize
    ) -> Image.Image:
        """
        Scale logo to appropriate size relative to base image.
        
        Args:
            logo: Logo image
            base_size: (width, height) of base image
            size: Size preset
            
        Returns:
            Scaled logo image
        """
        base_width, base_height = base_size
        target_width = int(base_width * SIZE_PRESETS[size])
        
        # Calculate height maintaining aspect ratio
        logo_aspect = logo.width / logo.height
        target_height = int(target_width / logo_aspect)
        
        # Ensure logo doesn't exceed 25% of image height
        max_height = int(base_height * 0.25)
        if target_height > max_height:
            target_height = max_height
            target_width = int(target_height * logo_aspect)
        
        # Use high-quality resampling
        return logo.resize((target_width, target_height), Image.Resampling.LANCZOS)
    
    def _calculate_position(
        self,
        base_size: Tuple[int, int],
        logo_size: Tuple[int, int],
        position: LogoPosition
    ) -> Tuple[int, int]:
        """
        Calculate x, y coordinates for logo placement.
        
        Args:
            base_size: (width, height) of base image
            logo_size: (width, height) of scaled logo
            position: Position preset
            
        Returns:
            (x, y) coordinates for logo placement
        """
        base_width, base_height = base_size
        logo_width, logo_height = logo_size
        
        # Calculate padding
        pad_x = int(base_width * EDGE_PADDING)
        pad_y = int(base_height * EDGE_PADDING)
        
        if position == "top-left":
            return (pad_x, pad_y)
        
        elif position == "top-right":
            return (base_width - logo_width - pad_x, pad_y)
        
        elif position == "bottom-left":
            return (pad_x, base_height - logo_height - pad_y)
        
        elif position == "bottom-right":
            return (base_width - logo_width - pad_x, base_height - logo_height - pad_y)
        
        elif position == "center":
            return (
                (base_width - logo_width) // 2,
                (base_height - logo_height) // 2
            )
        
        # Default to bottom-right
        return (base_width - logo_width - pad_x, base_height - logo_height - pad_y)
    
    def _apply_opacity(self, image: Image.Image, opacity: float) -> Image.Image:
        """
        Apply opacity to an RGBA image.
        
        Args:
            image: RGBA image
            opacity: Opacity value (0.0 to 1.0)
            
        Returns:
            Image with adjusted alpha channel
        """
        if opacity >= 1.0:
            return image
        
        # Split channels
        r, g, b, a = image.split()
        
        # Adjust alpha channel
        a = a.point(lambda x: int(x * opacity))
        
        # Merge back
        return Image.merge("RGBA", (r, g, b, a))


# Singleton instance
_logo_compositor: Optional[LogoCompositor] = None


def get_logo_compositor() -> LogoCompositor:
    """Get or create the logo compositor singleton."""
    global _logo_compositor
    if _logo_compositor is None:
        _logo_compositor = LogoCompositor()
    return _logo_compositor
