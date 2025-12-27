"""
QC Gate for Twitch Asset Pipeline.

This module implements Layer 4 of the asset generation pipeline - the Quality
Control Gate that validates assets before user delivery.

The QC Gate handles:
1. Dimension validation
2. File size validation with compression fallback
3. OCR gibberish detection (for thumbnails/banners)
4. Format validation
"""

from typing import Tuple, Optional, List
from PIL import Image, ImageFilter
from io import BytesIO
import re
import logging

from backend.services.twitch.dimensions import get_dimension_spec

logger = logging.getLogger(__name__)


class QCGate:
    """
    Layer 4: Quality Control Gate.
    
    Validates assets before user delivery:
    1. Dimension validation
    2. File size validation with compression fallback
    3. OCR check for gibberish text (thumbnails/banners)
    4. Format validation
    """
    
    # Platform file size limits (in bytes)
    FILE_SIZE_LIMITS = {
        "twitch_emote": 1 * 1024 * 1024,      # 1MB
        "twitch_emote_112": 1 * 1024 * 1024,  # 1MB
        "twitch_emote_56": 1 * 1024 * 1024,   # 1MB
        "twitch_emote_28": 1 * 1024 * 1024,   # 1MB
        "twitch_badge": 1 * 1024 * 1024,      # 1MB
        "twitch_badge_36": 1 * 1024 * 1024,   # 1MB
        "twitch_badge_18": 1 * 1024 * 1024,   # 1MB
        "twitch_panel": 2.9 * 1024 * 1024,    # 2.9MB
        "youtube_thumbnail": 2 * 1024 * 1024, # 2MB
        "default": 10 * 1024 * 1024,          # 10MB
    }
    
    # Common gibberish patterns
    GIBBERISH_PATTERNS = [
        r'[^\x00-\x7F]{5,}',  # Long non-ASCII sequences
        r'(.)\1{4,}',         # Repeated characters (5+ times)
        r'[bcdfghjklmnpqrstvwxz]{5,}',  # Consonant clusters (5+ consonants)
    ]
    
    # Asset types that should be checked for gibberish text
    TEXT_CHECK_TYPES = {"youtube_thumbnail", "twitch_banner", "twitch_offline"}
    
    # Asset types requiring transparency
    TRANSPARENCY_TYPES = {"twitch_emote", "twitch_emote_112", "twitch_emote_56", "twitch_emote_28",
                          "twitch_badge", "twitch_badge_36", "twitch_badge_18", 
                          "overlay", "twitch_panel"}
    
    async def validate(
        self,
        image_data: bytes,
        asset_type: str,
        expected_dimensions: Optional[Tuple[int, int]] = None
    ) -> Tuple[bool, Optional[str], bytes]:
        """
        Validate asset through QC checks.
        
        Args:
            image_data: Processed image bytes
            asset_type: Type of asset
            expected_dimensions: Expected (width, height), auto-detected if None
            
        Returns:
            Tuple of (passed, error_message, processed_data)
        """
        image = Image.open(BytesIO(image_data))
        
        # Auto-detect expected dimensions if not provided
        if expected_dimensions is None:
            try:
                spec = get_dimension_spec(asset_type)
                expected_dimensions = spec.export_size
            except ValueError:
                # Unknown asset type, skip dimension check
                expected_dimensions = image.size
        
        # Check 1: Dimensions
        if image.size != expected_dimensions:
            return False, f"Dimension mismatch: got {image.size}, expected {expected_dimensions}", image_data
        
        # Check 2: File size
        max_size = self.FILE_SIZE_LIMITS.get(asset_type, self.FILE_SIZE_LIMITS["default"])
        if len(image_data) > max_size:
            # Try to compress
            compressed_data = self._compress(image, asset_type, max_size)
            if len(compressed_data) > max_size:
                return False, f"File size {len(compressed_data)} exceeds limit {max_size}", compressed_data
            image_data = compressed_data
        
        # Check 3: OCR for gibberish (if asset might contain AI text)
        if asset_type in self.TEXT_CHECK_TYPES:
            has_gibberish, gibberish_regions = self._check_gibberish(image)
            if has_gibberish and gibberish_regions:
                # Blur gibberish regions
                image = self._blur_regions(image, gibberish_regions)
                image_data = self._export(image, asset_type)
        
        # Check 4: Format validation
        expected_format = self._get_expected_format(asset_type)
        image_data = self._ensure_format(image, asset_type, expected_format)
        
        return True, None, image_data
    
    def _check_gibberish(self, image: Image.Image) -> Tuple[bool, List[Tuple[int, int, int, int]]]:
        """
        Run OCR and check for gibberish text.
        
        Args:
            image: PIL Image to check
            
        Returns:
            Tuple of (has_gibberish, list of bounding boxes)
        """
        try:
            import pytesseract
            
            # Run OCR
            text = pytesseract.image_to_string(image)
            
            # Check for gibberish patterns
            for pattern in self.GIBBERISH_PATTERNS:
                if re.search(pattern, text, re.IGNORECASE):
                    # Get bounding boxes of text regions
                    try:
                        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
                        regions = []
                        for i, word in enumerate(data['text']):
                            if word.strip() and re.search(pattern, word, re.IGNORECASE):
                                x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
                                regions.append((x, y, x + w, y + h))
                        return True, regions
                    except Exception:
                        # If we can't get regions, return empty list
                        return True, []
            
            return False, []
        except ImportError:
            # pytesseract not installed, skip check
            logger.warning("pytesseract not installed, skipping gibberish check")
            return False, []
        except Exception as e:
            # If OCR fails, assume no gibberish
            logger.warning(f"OCR check failed: {e}")
            return False, []
    
    def _blur_regions(self, image: Image.Image, regions: List[Tuple[int, int, int, int]]) -> Image.Image:
        """
        Blur specified regions of the image.
        
        Args:
            image: PIL Image to modify
            regions: List of (x1, y1, x2, y2) bounding boxes
            
        Returns:
            Image with blurred regions
        """
        image = image.copy()
        
        for x1, y1, x2, y2 in regions:
            # Ensure coordinates are within bounds
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(image.width, x2)
            y2 = min(image.height, y2)
            
            if x2 <= x1 or y2 <= y1:
                continue
            
            # Crop region
            region = image.crop((x1, y1, x2, y2))
            # Apply blur
            blurred = region.filter(ImageFilter.GaussianBlur(radius=10))
            # Paste back
            image.paste(blurred, (x1, y1))
        
        return image
    
    def _compress(self, image: Image.Image, asset_type: str, max_size: int) -> bytes:
        """
        Compress image to fit within size limit.
        
        Args:
            image: PIL Image to compress
            asset_type: Type of asset
            max_size: Maximum file size in bytes
            
        Returns:
            Compressed image bytes
        """
        output = BytesIO()
        quality = 95
        
        # Determine format
        if asset_type in self.TRANSPARENCY_TYPES:
            # PNG - can't reduce quality, try optimize
            if image.mode != "RGBA":
                image = image.convert("RGBA")
            image.save(output, format="PNG", optimize=True)
            return output.getvalue()
        
        # JPEG/WebP - can reduce quality
        while quality > 50:
            output.seek(0)
            output.truncate()
            
            if asset_type in {"youtube_thumbnail", "twitch_offline"}:
                if image.mode == "RGBA":
                    background = Image.new("RGB", image.size, (255, 255, 255))
                    background.paste(image, mask=image.split()[3])
                    image = background
                elif image.mode != "RGB":
                    image = image.convert("RGB")
                image.save(output, format="JPEG", quality=quality, optimize=True)
            else:
                image.save(output, format="WEBP", quality=quality)
            
            if output.tell() <= max_size:
                break
            
            quality -= 5
        
        output.seek(0)
        return output.read()
    
    def _get_expected_format(self, asset_type: str) -> str:
        """
        Get expected format for asset type.
        
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
    
    def _ensure_format(self, image: Image.Image, asset_type: str, expected_format: str) -> bytes:
        """
        Ensure image is in expected format.
        
        Args:
            image: PIL Image to convert
            asset_type: Type of asset
            expected_format: Expected format string
            
        Returns:
            Image bytes in correct format
        """
        output = BytesIO()
        
        if expected_format == "PNG":
            if image.mode != "RGBA":
                image = image.convert("RGBA")
            image.save(output, format="PNG", optimize=True)
        elif expected_format == "JPEG":
            if image.mode == "RGBA":
                background = Image.new("RGB", image.size, (255, 255, 255))
                background.paste(image, mask=image.split()[3])
                image = background
            elif image.mode != "RGB":
                image = image.convert("RGB")
            image.save(output, format="JPEG", quality=95, optimize=True)
        else:
            image.save(output, format="WEBP", quality=90)
        
        output.seek(0)
        return output.read()
    
    def _export(self, image: Image.Image, asset_type: str) -> bytes:
        """
        Export image in correct format.
        
        Args:
            image: PIL Image to export
            asset_type: Type of asset
            
        Returns:
            Image bytes
        """
        expected_format = self._get_expected_format(asset_type)
        return self._ensure_format(image, asset_type, expected_format)
    
    def get_file_size_limit(self, asset_type: str) -> int:
        """
        Get the file size limit for an asset type.
        
        Args:
            asset_type: Type of asset
            
        Returns:
            File size limit in bytes
        """
        return self.FILE_SIZE_LIMITS.get(asset_type, self.FILE_SIZE_LIMITS["default"])
