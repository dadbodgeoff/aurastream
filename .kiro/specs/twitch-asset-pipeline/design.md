# Twitch Asset Generation Pipeline - Design Document

## Overview

This design document outlines the technical implementation for a "Zero-Edit" asset generation pipeline that uses the Brand Kit as the Single Source of Truth. The system combines three engines: Nano Banana (Gemini) for texture/background generation, Python/PIL for typography and layout, and rembg for transparency processing.

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────┬─────────────────┬─────────────────────────────────────────┤
│   Next.js Web   │  React Native   │           SwiftUI iOS                   │
│   TwitchGenPage │  TwitchGenScreen│           TwitchGenerateView            │
└────────┬────────┴────────┬────────┴──────────────────┬──────────────────────┘
         │                 │                           │
         └─────────────────┼───────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FASTAPI APPLICATION                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │              /api/v1/twitch/generate, /api/v1/twitch/packs           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                 │                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER 1: CONTEXT ENGINE                            │   │
│  │  fetch_brand_kit() │ extract_colors() │ extract_typography()         │   │
│  │  extract_voice() │ extract_logos() │ get_game_meta()                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                 │                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER 2: PROMPT CONSTRUCTOR                        │   │
│  │  build_mega_prompt() │ inject_style_anchor() │ inject_colors()       │   │
│  │  inject_subject() │ append_directives() │ sanitize_input()           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                 │                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER 3: ASSET PIPELINE                            │   │
│  │  generate_texture() │ remove_background() │ apply_color_grade()      │   │
│  │  render_text() │ downscale() │ export()                              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                 │                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER 4: QC GATE                                   │   │
│  │  ocr_check() │ artifact_check() │ format_convert() │ validate()      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   NANO BANANA   │   │   PIL ENGINE    │   │   REMBG ENGINE  │
│   (Gemini AI)   │   │   (Typography)  │   │  (Transparency) │
│                 │   │                 │   │                 │
│  - Textures     │   │  - Text render  │   │  - BG removal   │
│  - Backgrounds  │   │  - Layout       │   │  - Alpha mask   │
│  - Subjects     │   │  - Fonts        │   │  - Edge refine  │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```


## Brand Kit Source of Truth Integration

### Key Files from brand-kit-enhancement

| File | Data Extracted | Usage |
|------|----------------|-------|
| `backend/api/schemas/brand_kit_enhanced.py` | ColorPalette, Typography, BrandVoice, StreamerAssets | Context Engine extracts all brand identity data |
| `backend/services/brand_kit_service.py` | get(), update_*() methods | Fetch and update brand kit data |
| `backend/services/logo_service.py` | get_logo_url(), get_logo_for_generation() | Subject reference for consistency |
| `backend/services/streamer_asset_service.py` | upload_*(), list_assets() | Store generated assets |

### Data Flow from Brand Kit

```python
# Context Engine extracts from Brand Kit:
brand_kit = {
    # From colors_extended (ColorPalette)
    "primary_colors": [{"hex": "#FF5733", "name": "Brand Orange", "usage": "CTAs"}],
    "secondary_colors": [...],
    "accent_colors": [...],
    "gradients": [{"name": "Brand Gradient", "stops": [...]}],
    
    # From typography (Typography)
    "display_font": {"family": "Montserrat", "weight": 800},
    "headline_font": {"family": "Montserrat", "weight": 700},
    "body_font": {"family": "Inter", "weight": 400},
    
    # From voice (BrandVoice)
    "tone": "competitive",
    "personality_traits": ["Bold", "Energetic"],
    "tagline": "Level Up Your Stream",
    
    # From logos (LogoService)
    "primary_logo_url": "https://...",
    "watermark_url": "https://...",
    "watermark_opacity": 50,
    
    # From style_reference
    "style_reference": "3D Render, vibrant colors, gaming aesthetic"
}
```

## Components

### Dimension Specifications

```python
from dataclasses import dataclass
from typing import Tuple

@dataclass
class DimensionSpec:
    """Dimension specification for an asset type."""
    generation_size: Tuple[int, int]  # AI-optimized size
    export_size: Tuple[int, int]      # Platform delivery size
    aspect_ratio: str                  # Human-readable ratio

DIMENSION_SPECS = {
    # Standard Assets
    "youtube_thumbnail": DimensionSpec((1216, 832), (1280, 720), "16:9"),
    "tiktok_story": DimensionSpec((832, 1216), (1080, 1920), "9:16"),
    "twitch_banner": DimensionSpec((1536, 640), (1200, 480), "~3:1"),
    "youtube_banner": DimensionSpec((1536, 640), (2560, 1440), "16:9"),
    "square_pfp": DimensionSpec((1024, 1024), (800, 800), "1:1"),
    
    # Twitch-Specific Assets
    "twitch_emote": DimensionSpec((1024, 1024), (512, 512), "1:1"),
    "twitch_emote_112": DimensionSpec((1024, 1024), (112, 112), "1:1"),
    "twitch_emote_56": DimensionSpec((1024, 1024), (56, 56), "1:1"),
    "twitch_emote_28": DimensionSpec((1024, 1024), (28, 28), "1:1"),
    "twitch_badge": DimensionSpec((1024, 1024), (72, 72), "1:1"),
    "twitch_badge_36": DimensionSpec((1024, 1024), (36, 36), "1:1"),
    "twitch_badge_18": DimensionSpec((1024, 1024), (18, 18), "1:1"),
    "twitch_panel": DimensionSpec((640, 320), (320, 160), "2:1"),
    "twitch_offline": DimensionSpec((1920, 1080), (1920, 1080), "16:9"),
}

# Asset type directives
ASSET_TYPE_DIRECTIVES = {
    "twitch_emote": "sticker style, solid green background, expressive, clear silhouette",
    "twitch_badge": "badge style, solid green background, iconic, simple",
    "youtube_thumbnail": "high contrast, cinematic lighting, eye-catching, bold",
    "twitch_banner": "wide composition, text-safe zones, dynamic",
    "tiktok_story": "vertical composition, mobile-optimized, vibrant",
}
```


### Layer 1: Context Engine

```python
from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from backend.services.brand_kit_service import get_brand_kit_service
from backend.services.logo_service import get_logo_service

@dataclass
class GenerationContext:
    """Complete context for asset generation."""
    # Brand Identity
    primary_colors: List[Dict[str, str]]
    secondary_colors: List[Dict[str, str]]
    accent_colors: List[Dict[str, str]]
    gradients: List[Dict[str, Any]]
    
    # Typography
    display_font: Optional[Dict[str, Any]]
    headline_font: Optional[Dict[str, Any]]
    body_font: Optional[Dict[str, Any]]
    
    # Voice
    tone: str
    personality_traits: List[str]
    tagline: str
    
    # Subject Reference
    primary_logo_url: Optional[str]
    watermark_url: Optional[str]
    watermark_opacity: int
    style_reference: Optional[str]
    
    # Meta Context
    game_meta: Optional[Dict[str, str]]
    season_context: Optional[str]
    
    # Asset Type
    asset_type: str
    asset_directive: str

class ContextEngine:
    """
    Layer 1: The "Brain" - Gathers live data before prompt construction.
    
    Extracts all relevant data from Brand Kit and external sources
    to build a complete generation context.
    """
    
    def __init__(self):
        self._brand_kit_service = None
        self._logo_service = None
        self._game_meta_cache = {}
    
    async def build_context(
        self,
        user_id: str,
        brand_kit_id: str,
        asset_type: str,
        game_id: Optional[str] = None
    ) -> GenerationContext:
        """
        Build complete generation context from Brand Kit and external sources.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit to use
            asset_type: Type of asset being generated
            game_id: Optional game ID for meta context
            
        Returns:
            GenerationContext with all extracted data
        """
        # Fetch brand kit (validates ownership)
        brand_kit = await self.brand_kit_service.get(user_id, brand_kit_id)
        
        # Extract colors from colors_extended
        colors_extended = brand_kit.get("colors_extended", {})
        primary_colors = colors_extended.get("primary", [])
        secondary_colors = colors_extended.get("secondary", [])
        accent_colors = colors_extended.get("accent", [])
        gradients = colors_extended.get("gradients", [])
        
        # Extract typography
        typography = brand_kit.get("typography", {})
        display_font = typography.get("display")
        headline_font = typography.get("headline")
        body_font = typography.get("body")
        
        # Extract voice
        voice = brand_kit.get("voice", {})
        tone = voice.get("tone", "professional")
        personality_traits = voice.get("personality_traits", [])
        tagline = voice.get("tagline", "")
        
        # Extract logos
        logos = brand_kit.get("logos", {})
        primary_logo = logos.get("primary", {})
        watermark = logos.get("watermark", {})
        
        primary_logo_url = await self._get_logo_url(user_id, brand_kit_id, "primary")
        watermark_url = await self._get_logo_url(user_id, brand_kit_id, "watermark")
        watermark_opacity = watermark.get("opacity", 50)
        
        # Get style reference
        style_reference = brand_kit.get("style_reference")
        
        # Get game meta if available
        game_meta = None
        season_context = None
        if game_id:
            game_meta = await self._fetch_game_meta(game_id)
            if game_meta:
                season_context = game_meta.get("current_season")
        
        # Get asset type directive
        asset_directive = ASSET_TYPE_DIRECTIVES.get(asset_type, "")
        
        return GenerationContext(
            primary_colors=primary_colors,
            secondary_colors=secondary_colors,
            accent_colors=accent_colors,
            gradients=gradients,
            display_font=display_font,
            headline_font=headline_font,
            body_font=body_font,
            tone=tone,
            personality_traits=personality_traits,
            tagline=tagline,
            primary_logo_url=primary_logo_url,
            watermark_url=watermark_url,
            watermark_opacity=watermark_opacity,
            style_reference=style_reference,
            game_meta=game_meta,
            season_context=season_context,
            asset_type=asset_type,
            asset_directive=asset_directive,
        )
    
    async def _get_logo_url(
        self, user_id: str, brand_kit_id: str, logo_type: str
    ) -> Optional[str]:
        """Get signed URL for a logo."""
        try:
            return await self.logo_service.get_logo_url(user_id, brand_kit_id, logo_type)
        except Exception:
            return None
    
    async def _fetch_game_meta(self, game_id: str) -> Optional[Dict[str, str]]:
        """Fetch game meta with caching (24h TTL)."""
        # Check cache first
        if game_id in self._game_meta_cache:
            cached = self._game_meta_cache[game_id]
            if cached["expires_at"] > time.time():
                return cached["data"]
        
        # Fetch from external source (placeholder)
        # In production, this would call a game meta API
        game_meta = await self._fetch_game_meta_external(game_id)
        
        if game_meta:
            self._game_meta_cache[game_id] = {
                "data": game_meta,
                "expires_at": time.time() + 86400  # 24 hours
            }
        
        return game_meta
    
    @property
    def brand_kit_service(self):
        if self._brand_kit_service is None:
            self._brand_kit_service = get_brand_kit_service()
        return self._brand_kit_service
    
    @property
    def logo_service(self):
        if self._logo_service is None:
            self._logo_service = get_logo_service()
        return self._logo_service
```


### Layer 2: Prompt Constructor

```python
import re
from typing import Optional

class PromptConstructor:
    """
    Layer 2: Hybrid Prompt Constructor.
    
    Builds "Mega-Prompts" using the formula:
    [Style Anchor] + [Subject Consistency] + [Meta Context] + [Brand Colors] + [Technical Directives]
    
    NEVER sends raw user text directly to Nano Banana.
    """
    
    MAX_CUSTOM_PROMPT_LENGTH = 500
    
    # Prompt injection patterns to sanitize
    INJECTION_PATTERNS = [
        r'ignore\s+(previous|above|all)',
        r'disregard\s+(previous|above|all)',
        r'forget\s+(previous|above|all)',
        r'system\s*:',
        r'assistant\s*:',
        r'user\s*:',
    ]
    
    QUALITY_DIRECTIVES = "8k, ray-traced, professional quality, highly detailed"
    
    def build_mega_prompt(
        self,
        context: GenerationContext,
        custom_prompt: Optional[str] = None
    ) -> str:
        """
        Build a complete mega-prompt from context and user input.
        
        Args:
            context: GenerationContext with all brand data
            custom_prompt: Optional user-provided prompt addition
            
        Returns:
            Complete prompt string for Nano Banana
        """
        parts = []
        
        # 1. Style Anchor
        style_anchor = self._build_style_anchor(context)
        if style_anchor:
            parts.append(style_anchor)
        
        # 2. Subject Consistency
        subject = self._build_subject_reference(context)
        if subject:
            parts.append(subject)
        
        # 3. Meta Context (Season/Event)
        meta = self._build_meta_context(context)
        if meta:
            parts.append(meta)
        
        # 4. Sanitized Custom Prompt
        if custom_prompt:
            sanitized = self.sanitize_input(custom_prompt)
            if sanitized:
                parts.append(sanitized)
        
        # 5. Brand Colors
        colors = self._build_color_directive(context)
        if colors:
            parts.append(colors)
        
        # 6. Asset Type Directive
        if context.asset_directive:
            parts.append(context.asset_directive)
        
        # 7. Technical Directives
        parts.append(self.QUALITY_DIRECTIVES)
        
        return " | ".join(parts)
    
    def _build_style_anchor(self, context: GenerationContext) -> str:
        """Build style anchor from brand voice and style reference."""
        parts = []
        
        if context.style_reference:
            parts.append(context.style_reference)
        
        if context.tone:
            tone_styles = {
                "competitive": "dynamic, intense, action-packed",
                "casual": "relaxed, friendly, approachable",
                "educational": "clean, informative, professional",
                "comedic": "playful, fun, colorful",
                "professional": "sleek, modern, corporate",
                "inspirational": "uplifting, bright, motivational",
                "edgy": "dark, bold, dramatic",
                "wholesome": "warm, cozy, inviting",
            }
            style = tone_styles.get(context.tone, "professional")
            parts.append(f"{style} style")
        
        if context.personality_traits:
            traits = ", ".join(context.personality_traits[:3])
            parts.append(f"conveying {traits} energy")
        
        return " ".join(parts) if parts else ""
    
    def _build_subject_reference(self, context: GenerationContext) -> str:
        """Build subject reference from logo."""
        if context.primary_logo_url:
            return f"featuring brand mascot/character from reference image"
        return ""
    
    def _build_meta_context(self, context: GenerationContext) -> str:
        """Build meta context from game/season data."""
        if context.season_context:
            return f"themed for {context.season_context}"
        if context.game_meta:
            game_name = context.game_meta.get("name", "")
            if game_name:
                return f"{game_name} themed"
        return ""
    
    def _build_color_directive(self, context: GenerationContext) -> str:
        """Build color directive from brand colors."""
        colors = []
        
        # Primary colors (most important)
        for color in context.primary_colors[:3]:
            hex_code = color.get("hex", "")
            if hex_code:
                colors.append(hex_code)
        
        # Accent colors
        for color in context.accent_colors[:2]:
            hex_code = color.get("hex", "")
            if hex_code:
                colors.append(hex_code)
        
        if colors:
            return f"using brand colors: {', '.join(colors)}"
        return ""
    
    def sanitize_input(self, user_input: str) -> str:
        """
        Sanitize user input to prevent prompt injection.
        
        Args:
            user_input: Raw user input
            
        Returns:
            Sanitized input string
        """
        if not user_input:
            return ""
        
        # Truncate to max length
        sanitized = user_input[:self.MAX_CUSTOM_PROMPT_LENGTH]
        
        # Remove dangerous characters
        sanitized = re.sub(r'[<>{}[\]\\|`~]', '', sanitized)
        
        # Remove injection patterns
        for pattern in self.INJECTION_PATTERNS:
            sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)
        
        # Normalize whitespace
        sanitized = ' '.join(sanitized.split()).strip()
        
        return sanitized
```


### Layer 3: Asset Pipeline

```python
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from io import BytesIO
from typing import Optional, Tuple
import rembg

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
    BG_REMOVAL_TYPES = {"twitch_emote", "twitch_badge", "overlay"}
    
    # Asset types requiring transparency preservation
    TRANSPARENCY_TYPES = {"twitch_emote", "twitch_badge", "overlay", "twitch_panel"}
    
    def __init__(self):
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
            text_position: Position for text overlay
            
        Returns:
            Processed image bytes ready for delivery
        """
        # Load image
        image = Image.open(BytesIO(image_data))
        
        # Step 1: Background removal (if needed)
        if asset_type in self.BG_REMOVAL_TYPES:
            image = await self._remove_background(image)
        
        # Step 2: Color grading (vibrance boost)
        image = self._apply_color_grading(image, context)
        
        # Step 3: Text overlay (if needed)
        if text_overlay:
            image = self._render_text(image, text_overlay, context, text_position)
        
        # Step 4: Downscale to export size
        spec = DIMENSION_SPECS.get(asset_type)
        if spec:
            image = self._downscale(image, spec.export_size)
        
        # Step 5: Export with correct format
        output = self._export(image, asset_type)
        
        return output
    
    async def _remove_background(self, image: Image.Image) -> Image.Image:
        """Remove background using rembg."""
        # Convert to bytes for rembg
        img_bytes = BytesIO()
        image.save(img_bytes, format="PNG")
        img_bytes.seek(0)
        
        # Remove background
        output_bytes = rembg.remove(img_bytes.read())
        
        # Load result
        return Image.open(BytesIO(output_bytes))
    
    def _apply_color_grading(
        self, 
        image: Image.Image, 
        context: GenerationContext
    ) -> Image.Image:
        """Apply color grading to match brand colors."""
        # Boost vibrance to ensure colors pop
        from PIL import ImageEnhance
        
        enhancer = ImageEnhance.Color(image)
        image = enhancer.enhance(1.2)  # 20% vibrance boost
        
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.1)  # 10% contrast boost
        
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
        """
        draw = ImageDraw.Draw(image)
        
        # Get font from context (headline for overlays)
        font_config = context.headline_font or {"family": "Arial", "weight": 700}
        font_family = font_config.get("family", "Arial")
        font_weight = font_config.get("weight", 700)
        
        # Calculate font size based on image dimensions
        font_size = int(image.height * 0.08)  # 8% of image height
        
        try:
            font = ImageFont.truetype(f"{font_family}.ttf", font_size)
        except OSError:
            # Fallback to default font
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
        shadow_offset = 2
        draw.text((x + shadow_offset, y + shadow_offset), text, font=font, fill="#000000")
        draw.text((x, y), text, font=font, fill=text_color)
        
        return image
    
    def _downscale(
        self, 
        image: Image.Image, 
        target_size: Tuple[int, int]
    ) -> Image.Image:
        """Downscale using Lanczos algorithm for highest quality."""
        return image.resize(target_size, Image.Resampling.LANCZOS)
    
    def _export(self, image: Image.Image, asset_type: str) -> bytes:
        """Export image in correct format."""
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
                image = image.convert("RGB")
            image.save(output, format="JPEG", quality=95, optimize=True)
        else:
            # WebP for web (best compression)
            image.save(output, format="WEBP", quality=90)
        
        output.seek(0)
        return output.read()
```


### Layer 4: QC Gate

```python
from typing import Tuple, Optional
import pytesseract
from PIL import Image
from io import BytesIO

class QCGate:
    """
    Layer 4: Quality Control Gate.
    
    Validates assets before user delivery:
    1. OCR check for gibberish text
    2. Artifact detection (future: ML-based)
    3. Format conversion
    4. Dimension validation
    5. File size validation
    """
    
    # Platform file size limits
    FILE_SIZE_LIMITS = {
        "twitch_emote": 1 * 1024 * 1024,      # 1MB
        "twitch_badge": 1 * 1024 * 1024,       # 1MB
        "twitch_panel": 2.9 * 1024 * 1024,     # 2.9MB
        "youtube_thumbnail": 2 * 1024 * 1024,  # 2MB
        "default": 10 * 1024 * 1024,           # 10MB
    }
    
    # Common gibberish patterns
    GIBBERISH_PATTERNS = [
        r'[^\x00-\x7F]{5,}',  # Long non-ASCII sequences
        r'(.)\1{4,}',         # Repeated characters
        r'[bcdfghjklmnpqrstvwxz]{5,}',  # Consonant clusters
    ]
    
    async def validate(
        self,
        image_data: bytes,
        asset_type: str,
        expected_dimensions: Tuple[int, int]
    ) -> Tuple[bool, Optional[str], bytes]:
        """
        Validate asset through QC checks.
        
        Args:
            image_data: Processed image bytes
            asset_type: Type of asset
            expected_dimensions: Expected (width, height)
            
        Returns:
            Tuple of (passed, error_message, processed_data)
        """
        image = Image.open(BytesIO(image_data))
        
        # Check 1: Dimensions
        if image.size != expected_dimensions:
            return False, f"Dimension mismatch: {image.size} != {expected_dimensions}", image_data
        
        # Check 2: File size
        max_size = self.FILE_SIZE_LIMITS.get(asset_type, self.FILE_SIZE_LIMITS["default"])
        if len(image_data) > max_size:
            # Try to compress
            image_data = self._compress(image, asset_type, max_size)
            if len(image_data) > max_size:
                return False, f"File size {len(image_data)} exceeds limit {max_size}", image_data
        
        # Check 3: OCR for gibberish (if asset might contain AI text)
        if asset_type in {"youtube_thumbnail", "twitch_banner"}:
            has_gibberish, gibberish_regions = self._check_gibberish(image)
            if has_gibberish:
                # Blur gibberish regions
                image = self._blur_regions(image, gibberish_regions)
                image_data = self._export(image, asset_type)
        
        # Check 4: Format validation
        expected_format = self._get_expected_format(asset_type)
        image_data = self._ensure_format(image, asset_type, expected_format)
        
        return True, None, image_data
    
    def _check_gibberish(self, image: Image.Image) -> Tuple[bool, list]:
        """Run OCR and check for gibberish text."""
        try:
            # Run OCR
            text = pytesseract.image_to_string(image)
            
            # Check for gibberish patterns
            import re
            for pattern in self.GIBBERISH_PATTERNS:
                if re.search(pattern, text, re.IGNORECASE):
                    # Get bounding boxes of text regions
                    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
                    regions = []
                    for i, word in enumerate(data['text']):
                        if word.strip() and re.search(pattern, word, re.IGNORECASE):
                            x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
                            regions.append((x, y, x + w, y + h))
                    return True, regions
            
            return False, []
        except Exception:
            # If OCR fails, assume no gibberish
            return False, []
    
    def _blur_regions(self, image: Image.Image, regions: list) -> Image.Image:
        """Blur specified regions of the image."""
        for x1, y1, x2, y2 in regions:
            # Crop region
            region = image.crop((x1, y1, x2, y2))
            # Apply blur
            blurred = region.filter(ImageFilter.GaussianBlur(radius=10))
            # Paste back
            image.paste(blurred, (x1, y1))
        return image
    
    def _compress(self, image: Image.Image, asset_type: str, max_size: int) -> bytes:
        """Compress image to fit within size limit."""
        output = BytesIO()
        quality = 95
        
        while quality > 50:
            output.seek(0)
            output.truncate()
            
            if asset_type in AssetPipeline.TRANSPARENCY_TYPES:
                image.save(output, format="PNG", optimize=True)
            else:
                if image.mode == "RGBA":
                    image = image.convert("RGB")
                image.save(output, format="JPEG", quality=quality, optimize=True)
            
            if output.tell() <= max_size:
                break
            
            quality -= 5
        
        output.seek(0)
        return output.read()
    
    def _get_expected_format(self, asset_type: str) -> str:
        """Get expected format for asset type."""
        if asset_type in AssetPipeline.TRANSPARENCY_TYPES:
            return "PNG"
        elif asset_type in {"youtube_thumbnail", "twitch_offline"}:
            return "JPEG"
        return "WEBP"
    
    def _ensure_format(self, image: Image.Image, asset_type: str, expected_format: str) -> bytes:
        """Ensure image is in expected format."""
        output = BytesIO()
        
        if expected_format == "PNG":
            if image.mode != "RGBA":
                image = image.convert("RGBA")
            image.save(output, format="PNG", optimize=True)
        elif expected_format == "JPEG":
            if image.mode == "RGBA":
                image = image.convert("RGB")
            image.save(output, format="JPEG", quality=95, optimize=True)
        else:
            image.save(output, format="WEBP", quality=90)
        
        output.seek(0)
        return output.read()
```


### Pack Generation Service

```python
from dataclasses import dataclass
from typing import List, Optional
import asyncio

@dataclass
class PackAsset:
    """Single asset in a pack."""
    asset_type: str
    image_data: bytes
    filename: str

@dataclass
class AssetPack:
    """Complete asset pack."""
    pack_type: str
    assets: List[PackAsset]
    brand_kit_id: str
    job_id: str

class PackGenerationService:
    """
    One-Click Suite Generation.
    
    Generates complete asset packs with consistent branding:
    - Seasonal Pack: 1 Story, 1 Thumbnail, 3 Emotes
    - Emote Pack: 5 Emotes with variations
    - Stream Pack: Overlays, Panels, Alerts
    """
    
    PACK_DEFINITIONS = {
        "seasonal": [
            {"type": "tiktok_story", "count": 1},
            {"type": "youtube_thumbnail", "count": 1},
            {"type": "twitch_emote", "count": 3},
        ],
        "emote": [
            {"type": "twitch_emote", "count": 5},
        ],
        "stream": [
            {"type": "twitch_panel", "count": 3},
            {"type": "twitch_offline", "count": 1},
        ],
    }
    
    def __init__(
        self,
        context_engine: ContextEngine,
        prompt_constructor: PromptConstructor,
        asset_pipeline: AssetPipeline,
        qc_gate: QCGate,
        nano_banana_client,
    ):
        self.context_engine = context_engine
        self.prompt_constructor = prompt_constructor
        self.asset_pipeline = asset_pipeline
        self.qc_gate = qc_gate
        self.nano_banana = nano_banana_client
    
    async def generate_pack(
        self,
        user_id: str,
        brand_kit_id: str,
        pack_type: str,
        custom_prompt: Optional[str] = None,
        game_id: Optional[str] = None
    ) -> AssetPack:
        """
        Generate a complete asset pack.
        
        All assets use the same brand kit context and style anchor
        for visual consistency.
        """
        # Build shared context (same for all assets)
        base_context = await self.context_engine.build_context(
            user_id=user_id,
            brand_kit_id=brand_kit_id,
            asset_type="pack",  # Generic type for context
            game_id=game_id,
        )
        
        # Get pack definition
        pack_def = self.PACK_DEFINITIONS.get(pack_type, [])
        
        # Generate all assets in parallel
        tasks = []
        for item in pack_def:
            for i in range(item["count"]):
                task = self._generate_single_asset(
                    base_context=base_context,
                    asset_type=item["type"],
                    custom_prompt=custom_prompt,
                    index=i,
                )
                tasks.append(task)
        
        # Wait for all assets
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Collect successful assets
        assets = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                # Log error but continue with other assets
                continue
            assets.append(result)
        
        return AssetPack(
            pack_type=pack_type,
            assets=assets,
            brand_kit_id=brand_kit_id,
            job_id="",  # Set by caller
        )
    
    async def _generate_single_asset(
        self,
        base_context: GenerationContext,
        asset_type: str,
        custom_prompt: Optional[str],
        index: int,
    ) -> PackAsset:
        """Generate a single asset within a pack."""
        # Update context for specific asset type
        context = GenerationContext(
            **{**base_context.__dict__, "asset_type": asset_type}
        )
        context.asset_directive = ASSET_TYPE_DIRECTIVES.get(asset_type, "")
        
        # Build prompt
        prompt = self.prompt_constructor.build_mega_prompt(context, custom_prompt)
        
        # Get dimensions
        spec = DIMENSION_SPECS[asset_type]
        
        # Generate with Nano Banana
        from backend.services.nano_banana_client import GenerationRequest
        request = GenerationRequest(
            prompt=prompt,
            width=spec.generation_size[0],
            height=spec.generation_size[1],
        )
        response = await self.nano_banana.generate(request)
        
        # Process through pipeline
        processed = await self.asset_pipeline.process(
            image_data=response.image_data,
            asset_type=asset_type,
            context=context,
        )
        
        # Validate through QC gate
        passed, error, final_data = await self.qc_gate.validate(
            image_data=processed,
            asset_type=asset_type,
            expected_dimensions=spec.export_size,
        )
        
        if not passed:
            raise ValueError(f"QC failed: {error}")
        
        return PackAsset(
            asset_type=asset_type,
            image_data=final_data,
            filename=f"{asset_type}_{index}.png",
        )
```


## API Endpoints

### Twitch Generation Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/twitch/generate` | Generate single Twitch asset |
| POST | `/api/v1/twitch/packs` | Generate asset pack |
| GET | `/api/v1/twitch/packs/{id}` | Get pack status and assets |
| GET | `/api/v1/twitch/dimensions` | Get dimension specifications |
| GET | `/api/v1/twitch/game-meta/{game_id}` | Get game meta for context |

### Request/Response Schemas

```python
from pydantic import BaseModel, Field
from typing import Optional, List, Literal

TwitchAssetType = Literal[
    "twitch_emote", "twitch_badge", "twitch_panel", 
    "twitch_offline", "twitch_banner"
]

PackType = Literal["seasonal", "emote", "stream"]

class TwitchGenerateRequest(BaseModel):
    """Request for single Twitch asset generation."""
    asset_type: TwitchAssetType
    brand_kit_id: str
    custom_prompt: Optional[str] = Field(None, max_length=500)
    game_id: Optional[str] = None
    text_overlay: Optional[str] = Field(None, max_length=100)
    include_logo: bool = False

class PackGenerateRequest(BaseModel):
    """Request for pack generation."""
    pack_type: PackType
    brand_kit_id: str
    custom_prompt: Optional[str] = Field(None, max_length=500)
    game_id: Optional[str] = None

class AssetResponse(BaseModel):
    """Single asset in response."""
    id: str
    asset_type: str
    url: str
    width: int
    height: int
    file_size: int

class PackResponse(BaseModel):
    """Pack generation response."""
    id: str
    pack_type: str
    status: Literal["queued", "processing", "completed", "failed"]
    progress: int
    assets: List[AssetResponse]
    created_at: str

class DimensionSpecResponse(BaseModel):
    """Dimension specification response."""
    asset_type: str
    generation_size: tuple
    export_size: tuple
    aspect_ratio: str
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Dimension Consistency

*For any* asset type in DIMENSION_SPECS, the generation size aspect ratio SHALL match the export size aspect ratio within 5% tolerance.

**Validates: Requirements 1.1, 1.2**

### Property 2: Context Extraction Completeness

*For any* brand kit with colors_extended, typography, voice, and logos defined, the Context Engine SHALL extract all defined fields into the GenerationContext.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 3: Asset Type Directive Injection

*For any* asset type with a defined directive in ASSET_TYPE_DIRECTIVES, the Context Engine SHALL include that directive in the GenerationContext.

**Validates: Requirements 2.7, 2.8, 2.9**

### Property 4: Prompt Never Contains Raw User Input

*For any* user-provided custom_prompt, the final mega-prompt SHALL differ from the raw input (sanitization applied).

**Validates: Requirements 3.1, 3.7**

### Property 5: Prompt Contains Brand Colors

*For any* brand kit with primary_colors defined, the built mega-prompt SHALL contain at least one hex color code from the brand kit.

**Validates: Requirements 3.5**

### Property 6: Custom Prompt Length Limit

*For any* user input longer than 500 characters, the sanitized output SHALL be truncated to 500 characters or fewer.

**Validates: Requirements 3.8**

### Property 7: Background Removal for Emotes

*For any* asset of type "twitch_emote" or "twitch_badge", the Asset Pipeline SHALL produce output with alpha channel (RGBA mode).

**Validates: Requirements 4.1, 4.8, 10.5, 10.6**

### Property 8: Text Rendering Accuracy

*For any* text_overlay input, the rendered text in the output image SHALL match the input exactly (verified via OCR).

**Validates: Requirements 4.6**

### Property 9: Downscale Uses Lanczos

*For any* asset processed through the pipeline, the downscaling operation SHALL use Lanczos resampling.

**Validates: Requirements 1.8, 4.7**

### Property 10: Export Dimensions Match Spec

*For any* processed asset, the final dimensions SHALL exactly match the export_size in DIMENSION_SPECS for that asset type.

**Validates: Requirements 5.6**

### Property 11: File Size Within Limits

*For any* processed asset, the file size SHALL be within the platform limit defined in FILE_SIZE_LIMITS.

**Validates: Requirements 5.7, 10.7**

### Property 12: Pack Contains Correct Asset Count

*For any* pack generation request, the resulting pack SHALL contain the exact number and types of assets defined in PACK_DEFINITIONS.

**Validates: Requirements 6.1**

### Property 13: Pack Uses Same Brand Kit

*For any* pack generation, all assets in the pack SHALL reference the same brand_kit_id.

**Validates: Requirements 6.2, 6.3**

### Property 14: Brand Kit Required for Generation

*For any* generation request without a valid brand_kit_id, the system SHALL reject the request with an error.

**Validates: Requirements 9.1**

### Property 15: Twitch Emote Multi-Size Output

*For any* Twitch emote generation, the system SHALL produce outputs at 112x112, 56x56, and 28x28 sizes.

**Validates: Requirements 10.1**

## Error Handling

| Error | HTTP Code | Response |
|-------|-----------|----------|
| Brand kit not found | 404 | `{"error": "brand_kit_not_found", "message": "..."}` |
| Brand kit not owned | 403 | `{"error": "authorization_error", "message": "..."}` |
| Invalid asset type | 400 | `{"error": "invalid_asset_type", "message": "..."}` |
| Generation failed | 500 | `{"error": "generation_error", "message": "..."}` |
| QC validation failed | 422 | `{"error": "qc_failed", "message": "..."}` |
| Rate limit exceeded | 429 | `{"error": "rate_limit", "retry_after": 60}` |

## Testing Strategy

### Unit Tests
- Context Engine: Test extraction of each brand kit field
- Prompt Constructor: Test sanitization, formula components
- Asset Pipeline: Test each processing step
- QC Gate: Test validation rules

### Property-Based Tests (Hypothesis)
- All 15 correctness properties with 100+ iterations each
- Use generators for brand kit data, asset types, user input

### Integration Tests
- End-to-end generation flow
- Pack generation with multiple assets
- Error handling scenarios

## Dependencies

### Python Packages
```
rembg>=2.0.0          # Background removal
Pillow>=10.0.0        # Image processing
pytesseract>=0.3.10   # OCR for QC
hypothesis>=6.0.0     # Property-based testing
```

### External Services
- Nano Banana (Gemini API) - Already configured
- Supabase Storage - Already configured
