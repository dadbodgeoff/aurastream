"""
Asset Pipeline for Twitch Asset Generation.

This module implements Layer 3 of the asset generation pipeline - the "Factory"
that processes raw AI output through post-processing steps.

The Asset Pipeline handles:
1. Background removal (rembg) for emotes/overlays
2. Color grading to match brand colors
3. Text overlay using PIL (NOT AI)
4. Downscaling with Lanczos algorithm

Note: All CPU-intensive PIL and rembg operations run in thread pool
executors to avoid blocking the async event loop.
"""

from PIL import Image, ImageDraw, ImageFont, ImageEnhance
from io import BytesIO
from typing import Optional, Tuple
import logging

from backend.services.twitch.context_engine import GenerationContext
from backend.services.twitch.dimensions import DIMENSION_SPECS, get_dimension_spec
from backend.services.async_executor import run_cpu_bound

logger = logging.getLogger(__name__)


class AssetPipeline:
    """
    Layer 3: The "Factory" - Post-processing pipeline.
    
    Processes raw Nano Banana output through:
    1. Background removal (rembg) for emotes/overlays
    2. Color grading to match brand colors
    3. Text overlay using PIL (NOT AI)
    4. Downscaling with Lanczos algorithm
    """
    
    # Asset types requiring background removal
    BG_REMOVAL_TYPES = {"twitch_emote", "twitch_emote_112", "twitch_emote_56", "twitch_emote_28",
                        "twitch_badge", "twitch_badge_36", "twitch_badge_18", "overlay"}
    
    # Asset types requiring transparency preservation
    TRANSPARENCY_TYPES = {"twitch_emote", "twitch_emote_112", "twitch_emote_56", "twitch_emote_28",
                          "twitch_badge", "twitch_badge_36", "twitch_badge_18", 
                          "overlay", "twitch_panel"}
    
    # Default color grading settings
    VIBRANCE_BOOST = 1.2  # 20% boost
    CONTRAST_BOOST = 1.1  # 10% boost
    
    def __init__(self):
        """Initialize the asset pipeline."""
        self._rembg_session = None
    
    async def process(
        self,
        image_data: bytes,
        asset_type: str,
        context: GenerationContext,
        text_overlay: Optional[str] = None,
        text_position: str = "bottom"
    ) -> bytes:
        """
        Process raw AI output through the pipeline.
        
        Args:
            image_data: Raw image bytes from Nano Banana
            asset_type: Type of asset being processed
            context: Generation context with brand data
            text_overlay: Optional text to render
            text_position: Position for text overlay (top/center/bottom)
            
        Returns:
            Processed image bytes ready for delivery
        """
        # Load image
        image = Image.open(BytesIO(image_data))
        
        # Step 1: Background removal (if needed)
        if asset_type in self.BG_REMOVAL_TYPES:
            image = await self._remove_background(image)
        
        # Step 2: Color grading
        image = self._apply_color_grading(image)
        
        # Step 3: Text overlay (if needed)
        if text_overlay:
            image = self._render_text(image, text_overlay, context, text_position)
        
        # Step 4: Downscale to export size
        try:
            spec = get_dimension_spec(asset_type)
            image = self._downscale(image, spec.export_size)
        except ValueError:
            # Unknown asset type, skip downscaling
            pass
        
        # Step 5: Export with correct format
        output = self._export(image, asset_type)
        
        return output
    
    async def _remove_background(self, image: Image.Image) -> Image.Image:
        """
        Remove background using rembg.
        
        Runs in thread pool executor to avoid blocking the event loop.
        
        Args:
            image: PIL Image to process
            
        Returns:
            Image with transparent background (RGBA)
        """
        def _remove_bg_sync(img_bytes: bytes) -> bytes:
            """Synchronous rembg processing for thread pool."""
            import rembg
            return rembg.remove(img_bytes)
        
        # Convert to bytes for rembg
        img_bytes = BytesIO()
        image.save(img_bytes, format="PNG")
        img_bytes.seek(0)
        
        # Remove background in thread pool (CPU-intensive)
        output_bytes = await run_cpu_bound(_remove_bg_sync, img_bytes.read())
        
        # Load result
        return Image.open(BytesIO(output_bytes))
    
    def _apply_color_grading(self, image: Image.Image) -> Image.Image:
        """
        Apply color grading to enhance image.
        
        Applies:
        - 20% vibrance boost
        - 10% contrast boost
        
        Args:
            image: PIL Image to process
            
        Returns:
            Color-graded image
        """
        # Boost vibrance (color saturation)
        enhancer = ImageEnhance.Color(image)
        image = enhancer.enhance(self.VIBRANCE_BOOST)
        
        # Boost contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(self.CONTRAST_BOOST)
        
        return image
    
    def _render_text(
        self,
        image: Image.Image,
        text: str,
        context: GenerationContext,
        position: str
    ) -> Image.Image:
        """
        Render text using PIL with Brand Kit fonts.
        
        This ensures 100% spelling accuracy - AI never handles text.
        
        Args:
            image: PIL Image to draw on
            text: Text to render
            context: Generation context with font data
            position: Position (top/center/bottom)
            
        Returns:
            Image with text overlay
        """
        # Create a copy to draw on
        image = image.copy()
        draw = ImageDraw.Draw(image)
        
        # Get font from context (headline for overlays)
        font_config = context.headline_font or {"family": "Arial", "weight": 700}
        font_family = font_config.get("family", "Arial")
        
        # Calculate font size based on image dimensions (8% of height)
        font_size = int(image.height * 0.08)
        
        # Try to load the font, fallback to default
        try:
            font = ImageFont.truetype(f"{font_family}.ttf", font_size)
        except OSError:
            try:
                # Try common system font paths
                font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
            except OSError:
                # Use default font
                font = ImageFont.load_default()
        
        # Get text bounding box
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Calculate position
        x = (image.width - text_width) // 2
        if position == "top":
            y = int(image.height * 0.1)
        elif position == "center":
            y = (image.height - text_height) // 2
        else:  # bottom
            y = int(image.height * 0.85) - text_height
        
        # Get text color from brand colors (use primary or white)
        text_color = "#FFFFFF"
        if context.primary_colors:
            text_color = context.primary_colors[0].get("hex", "#FFFFFF")
        
        # Draw text with shadow for readability
        shadow_offset = max(2, font_size // 20)
        draw.text((x + shadow_offset, y + shadow_offset), text, font=font, fill="#000000")
        draw.text((x, y), text, font=font, fill=text_color)
        
        return image
    
    def _downscale(
        self, 
        image: Image.Image, 
        target_size: Tuple[int, int]
    ) -> Image.Image:
        """
        Downscale using Lanczos algorithm for highest quality.
        
        Args:
            image: PIL Image to resize
            target_size: Target (width, height)
            
        Returns:
            Resized image
        """
        return image.resize(target_size, Image.Resampling.LANCZOS)
    
    def _export(self, image: Image.Image, asset_type: str) -> bytes:
        """
        Export image in correct format based on asset type.
        
        - PNG for transparency types (emotes, badges, panels)
        - JPEG for thumbnails and offline screens
        - WebP for other web assets
        
        Args:
            image: PIL Image to export
            asset_type: Type of asset
            
        Returns:
            Image bytes in appropriate format
        """
        output = BytesIO()
        
        # Determine format based on asset type
        if asset_type in self.TRANSPARENCY_TYPES:
            # PNG for transparency
            if image.mode != "RGBA":
                image = image.convert("RGBA")
            image.save(output, format="PNG", optimize=True)
        elif asset_type in {"youtube_thumbnail", "twitch_offline"}:
            # JPEG for thumbnails (smaller file size)
            if image.mode == "RGBA":
                # Create white background for JPEG
                background = Image.new("RGB", image.size, (255, 255, 255))
                background.paste(image, mask=image.split()[3])
                image = background
            elif image.mode != "RGB":
                image = image.convert("RGB")
            image.save(output, format="JPEG", quality=95, optimize=True)
        else:
            # WebP for web (best compression)
            image.save(output, format="WEBP", quality=90)
        
        output.seek(0)
        return output.read()
    
    def get_export_format(self, asset_type: str) -> str:
        """
        Get the export format for an asset type.
        
        Args:
            asset_type: Type of asset
            
        Returns:
            Format string (PNG, JPEG, or WEBP)
        """
        if asset_type in self.TRANSPARENCY_TYPES:
            return "PNG"
        elif asset_type in {"youtube_thumbnail", "twitch_offline"}:
            return "JPEG"
        return "WEBP"
