"""
Prompt Engine Service for Aurastream.

This service handles prompt template management for AI asset generation:
- Loading YAML templates for different asset types
- Injecting brand kit context into templates
- Sanitizing user input to prevent prompt injection
- Building complete prompts for AI generation

Security Notes:
- User input is sanitized to prevent prompt injection attacks
- Template paths are validated to prevent directory traversal
- Thread-safe caching is implemented for template loading
"""

import os
import re
import threading
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Optional

import yaml

from backend.services.exceptions import TemplateNotFoundError


class AssetType(str, Enum):
    """Supported asset types for generation."""
    THUMBNAIL = "thumbnail"
    OVERLAY = "overlay"
    BANNER = "banner"
    STORY_GRAPHIC = "story_graphic"
    CLIP_COVER = "clip_cover"
    LOGO = "logo"


@dataclass
class PromptTemplate:
    """
    Represents a prompt template loaded from YAML.
    
    Attributes:
        name: Template identifier (e.g., "thumbnail")
        version: Template version (e.g., "v1.0")
        base_prompt: The main prompt text with placeholders
        quality_modifiers: List of quality enhancement terms
        placeholders: List of placeholder names in the template
    """
    name: str
    version: str
    base_prompt: str
    quality_modifiers: list[str]
    placeholders: list[str]


@dataclass
class VibeTemplate:
    """
    Represents a vibe/style option within a template.
    
    Attributes:
        key: Vibe identifier (e.g., "studio-minimalist")
        name: Display name (e.g., "Studio Minimalist")
        description: Short description of the style
        prompt: The prompt template for this vibe
        preview_tags: Optional tags for UI filtering
    """
    key: str
    name: str
    description: str
    prompt: str
    preview_tags: list[str] = None


@dataclass
class VibeBasedTemplate:
    """
    Represents a template with multiple vibe/style options.
    
    Used for assets like logos where users pick a style first.
    
    Attributes:
        name: Template identifier
        version: Template version
        category: Asset category (e.g., "branding")
        asset_type: Type of asset
        dimensions: Width/height/aspect ratio
        vibes: Dict of vibe key -> VibeTemplate
        placeholders: List of placeholder definitions
        quality_modifiers: List of quality terms
    """
    name: str
    version: str
    category: str
    asset_type: str
    dimensions: dict
    vibes: dict[str, VibeTemplate]
    placeholders: list[dict]
    quality_modifiers: list[str]


@dataclass
class BrandKitContext:
    """
    Brand kit context for prompt injection.
    
    Attributes:
        primary_colors: List of primary brand colors (hex format)
        accent_colors: List of accent colors (hex format)
        headline_font: Font for headlines
        body_font: Font for body text
        tone: Brand tone (e.g., "energetic", "professional")
        style_reference: Optional style reference description
    """
    primary_colors: list[str]
    accent_colors: list[str]
    headline_font: str
    body_font: str
    tone: str
    style_reference: Optional[str] = None


@dataclass
class ResolvedBrandContext:
    """
    Resolved brand kit values based on user selection.
    
    Contains only the specific values the user selected,
    ready for token-efficient prompt injection.
    
    Attributes:
        primary_color: Selected primary color hex
        secondary_color: Selected secondary color hex (optional)
        accent_color: Selected accent color hex (optional)
        gradient: Gradient string in compact format (optional)
        font: Font name + weight shorthand
        tone: Brand tone
        tagline: Brand tagline (optional)
        catchphrase: Selected catchphrase (optional)
        include_logo: Whether to include logo
        logo_position: Logo position (optional)
        logo_size: Logo size (optional)
        intensity: Brand intensity level
    """
    primary_color: str
    font: str
    tone: str
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    gradient: Optional[str] = None
    tagline: Optional[str] = None
    catchphrase: Optional[str] = None
    include_logo: bool = False
    logo_position: Optional[str] = None
    logo_size: Optional[str] = None
    intensity: str = "balanced"


class BrandContextResolver:
    """
    Resolves user's brand customization selections into concrete values.
    
    Takes the brand kit data and user's selections, returns only
    the specific values needed for prompt injection.
    """
    
    @staticmethod
    def resolve(
        brand_kit: dict,
        customization: Optional[dict] = None
    ) -> ResolvedBrandContext:
        """
        Resolve brand kit + customization into concrete values.
        
        Args:
            brand_kit: Full brand kit data from database
            customization: User's BrandCustomization selections
            
        Returns:
            ResolvedBrandContext with specific values to inject
        """
        custom = customization or {}
        colors_custom = custom.get("colors", {}) or {}
        typo_custom = custom.get("typography", {}) or {}
        voice_custom = custom.get("voice", {}) or {}
        
        # === Resolve Colors ===
        colors_extended = brand_kit.get("colors_extended", {})
        primary_colors = colors_extended.get("primary", [])
        secondary_colors = colors_extended.get("secondary", [])
        accent_colors = colors_extended.get("accent", [])
        gradients = colors_extended.get("gradients", [])
        
        # Fall back to basic colors if extended not set
        if not primary_colors:
            basic_primary = brand_kit.get("primary_colors", ["#000000"])
            primary_colors = [{"hex": c} for c in basic_primary]
        if not accent_colors:
            basic_accent = brand_kit.get("accent_colors", [])
            accent_colors = [{"hex": c} for c in basic_accent]
        
        # Select specific colors based on user choice
        primary_idx = colors_custom.get("primary_index", 0)
        primary_color = primary_colors[min(primary_idx, len(primary_colors) - 1)]["hex"] if primary_colors else "#000000"
        
        secondary_color = None
        if colors_custom.get("secondary_index") is not None and secondary_colors:
            sec_idx = colors_custom["secondary_index"]
            secondary_color = secondary_colors[min(sec_idx, len(secondary_colors) - 1)]["hex"]
        
        accent_color = None
        if colors_custom.get("accent_index") is not None and accent_colors:
            acc_idx = colors_custom["accent_index"]
            accent_color = accent_colors[min(acc_idx, len(accent_colors) - 1)]["hex"]
        
        # Resolve gradient
        gradient_str = None
        if colors_custom.get("use_gradient") is not None and gradients:
            grad_idx = colors_custom["use_gradient"]
            grad = gradients[min(grad_idx, len(gradients) - 1)]
            stops = "→".join([s["color"] for s in grad.get("stops", [])])
            gradient_str = f"{grad.get('type', 'linear')} {grad.get('angle', 135)}° {stops}"
        
        # === Resolve Typography ===
        typography = brand_kit.get("typography", {})
        typo_level = typo_custom.get("level", "headline")
        font_config = typography.get(typo_level) or typography.get("headline")
        
        # Fall back to basic fonts
        if not font_config:
            basic_fonts = brand_kit.get("fonts", {})
            font_config = {
                "family": basic_fonts.get("headline", "Inter"),
                "weight": 700
            }
        
        # Compact format: "Montserrat 700"
        font_str = f"{font_config.get('family', 'Inter')} {font_config.get('weight', 400)}"
        
        # === Resolve Voice ===
        voice = brand_kit.get("voice", {})
        tone = voice.get("tone") or brand_kit.get("tone", "professional")
        
        tagline = None
        if voice_custom.get("use_tagline") and voice.get("tagline"):
            tagline = voice["tagline"]
        
        catchphrase = None
        if voice_custom.get("use_catchphrase") is not None:
            catchphrases = voice.get("catchphrases", [])
            if catchphrases:
                cp_idx = voice_custom["use_catchphrase"]
                catchphrase = catchphrases[min(cp_idx, len(catchphrases) - 1)]
        
        # === Logo ===
        include_logo = custom.get("include_logo", False)
        logo_position = custom.get("logo_position", "bottom-right") if include_logo else None
        logo_size = custom.get("logo_size", "medium") if include_logo else None
        
        # === Intensity ===
        intensity = custom.get("brand_intensity", "balanced")
        
        return ResolvedBrandContext(
            primary_color=primary_color,
            secondary_color=secondary_color,
            accent_color=accent_color,
            gradient=gradient_str,
            font=font_str,
            tone=tone,
            tagline=tagline,
            catchphrase=catchphrase,
            include_logo=include_logo,
            logo_position=logo_position,
            logo_size=logo_size,
            intensity=intensity,
        )


class PromptEngine:
    """
    Service for managing and building AI generation prompts.
    
    Provides thread-safe template caching and secure prompt building
    with brand kit integration.
    
    Usage:
        engine = PromptEngine()
        brand_kit = BrandKitContext(
            primary_colors=["#FF0000", "#00FF00"],
            accent_colors=["#0000FF"],
            headline_font="Montserrat",
            body_font="Open Sans",
            tone="energetic"
        )
        prompt = engine.build_prompt(
            AssetType.THUMBNAIL,
            brand_kit,
            custom_prompt="Gaming channel thumbnail"
        )
    """
    
    # Maximum length for user input to prevent abuse
    MAX_INPUT_LENGTH = 500
    
    # Characters to remove from user input (potential injection vectors)
    SANITIZE_PATTERN = re.compile(r'[<>{}[\]\\|`~]')
    
    # Pattern to detect potential prompt injection attempts
    INJECTION_PATTERNS = [
        r'ignore\s+(previous|above|all)',
        r'disregard\s+(previous|above|all)',
        r'forget\s+(previous|above|all)',
        r'system\s*:',
        r'assistant\s*:',
        r'user\s*:',
    ]
    
    # Token budget guidelines:
    # - Brand context: ~50-80 tokens max
    # - Custom prompt: ~100 tokens max
    # - Quality modifiers: ~30 tokens
    # - Total brand injection: <150 tokens
    INTENSITY_MODIFIERS = {
        "subtle": "subtly incorporate",
        "balanced": "use",
        "strong": "prominently feature",
    }
    
    def __init__(self, prompts_dir: Optional[str] = None):
        """
        Initialize the prompt engine.
        
        Args:
            prompts_dir: Directory containing prompt templates.
                        Defaults to PROMPTS_DIR env var or 'prompts/'
        """
        self._prompts_dir = prompts_dir or os.environ.get(
            "PROMPTS_DIR", 
            "prompts/"
        )
        self._template_cache: dict[str, PromptTemplate] = {}
        self._cache_lock = threading.RLock()
    
    @property
    def prompts_dir(self) -> Path:
        """Get the prompts directory as a Path object."""
        # Resolve relative to backend directory
        base_path = Path(__file__).parent.parent
        return base_path / self._prompts_dir
    
    def _get_cache_key(self, asset_type: AssetType, version: str) -> str:
        """Generate cache key for template lookup."""
        return f"{asset_type.value}:{version}"
    
    def _validate_path(self, asset_type: AssetType, version: str) -> Path:
        """
        Validate and construct template file path.
        
        Prevents directory traversal attacks by validating components.
        
        Args:
            asset_type: The asset type enum
            version: Version string (e.g., "v1.0")
            
        Returns:
            Validated Path object
            
        Raises:
            TemplateNotFoundError: If path components are invalid
        """
        # Validate version format (only allow alphanumeric, dots, underscores)
        if not re.match(r'^[a-zA-Z0-9._-]+$', version):
            raise TemplateNotFoundError(
                asset_type=asset_type.value,
                version=version,
                reason="Invalid version format"
            )
        
        # Construct path safely
        template_path = self.prompts_dir / asset_type.value / f"{version}.yaml"
        
        # Ensure path is within prompts directory (prevent traversal)
        try:
            template_path.resolve().relative_to(self.prompts_dir.resolve())
        except ValueError:
            raise TemplateNotFoundError(
                asset_type=asset_type.value,
                version=version,
                reason="Invalid path"
            )
        
        return template_path
    
    def load_template(
        self, 
        asset_type: AssetType, 
        version: str = "v1.0"
    ) -> PromptTemplate:
        """
        Load a prompt template from YAML file.
        
        Templates are cached for performance. Thread-safe.
        
        Args:
            asset_type: Type of asset (thumbnail, overlay, etc.)
            version: Template version (default: "v1.0")
            
        Returns:
            PromptTemplate dataclass with loaded template data
            
        Raises:
            TemplateNotFoundError: If template file doesn't exist or is invalid
        """
        cache_key = self._get_cache_key(asset_type, version)
        
        # Check cache first (with lock for thread safety)
        with self._cache_lock:
            if cache_key in self._template_cache:
                return self._template_cache[cache_key]
        
        # Validate and get path
        template_path = self._validate_path(asset_type, version)
        
        # Check if file exists
        if not template_path.exists():
            raise TemplateNotFoundError(
                asset_type=asset_type.value,
                version=version,
                reason="Template file not found"
            )
        
        # Load and parse YAML
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
        except yaml.YAMLError as e:
            raise TemplateNotFoundError(
                asset_type=asset_type.value,
                version=version,
                reason=f"Invalid YAML: {str(e)}"
            )
        except IOError as e:
            raise TemplateNotFoundError(
                asset_type=asset_type.value,
                version=version,
                reason=f"Cannot read file: {str(e)}"
            )
        
        # Validate required fields
        required_fields = ['name', 'version', 'base_prompt', 'quality_modifiers', 'placeholders']
        for field in required_fields:
            if field not in data:
                raise TemplateNotFoundError(
                    asset_type=asset_type.value,
                    version=version,
                    reason=f"Missing required field: {field}"
                )
        
        # Create template object
        template = PromptTemplate(
            name=data['name'],
            version=data['version'],
            base_prompt=data['base_prompt'],
            quality_modifiers=data.get('quality_modifiers', []),
            placeholders=data.get('placeholders', [])
        )
        
        # Cache the template (with lock)
        with self._cache_lock:
            self._template_cache[cache_key] = template
        
        return template
    
    def inject_brand_kit(
        self, 
        template: PromptTemplate, 
        brand_kit: BrandKitContext
    ) -> str:
        """
        Replace placeholders in template with brand kit values.
        
        Args:
            template: Loaded prompt template
            brand_kit: Brand kit context with values to inject
            
        Returns:
            Prompt string with placeholders replaced
        """
        prompt = template.base_prompt
        
        # Map placeholders to brand kit values
        replacements = {
            'tone': brand_kit.tone,
            'primary_colors': ', '.join(brand_kit.primary_colors),
            'accent_colors': ', '.join(brand_kit.accent_colors),
            'headline_font': brand_kit.headline_font,
            'body_font': brand_kit.body_font,
            'style_reference': brand_kit.style_reference or '',
        }
        
        # Replace each placeholder
        for placeholder, value in replacements.items():
            prompt = prompt.replace(f'{{{placeholder}}}', str(value))
        
        return prompt
    
    def sanitize_input(self, user_input: str) -> str:
        """
        Sanitize user input to prevent prompt injection.
        
        Performs the following sanitization:
        1. Truncates to MAX_INPUT_LENGTH
        2. Removes potentially dangerous characters
        3. Removes known injection patterns
        4. Strips excessive whitespace
        
        Args:
            user_input: Raw user input string
            
        Returns:
            Sanitized input string safe for prompt inclusion
        """
        if not user_input:
            return ""
        
        # Truncate to max length
        sanitized = user_input[:self.MAX_INPUT_LENGTH]
        
        # Remove dangerous characters
        sanitized = self.SANITIZE_PATTERN.sub('', sanitized)
        
        # Remove potential injection patterns (case-insensitive)
        for pattern in self.INJECTION_PATTERNS:
            sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)
        
        # Normalize whitespace
        sanitized = ' '.join(sanitized.split())
        
        # Strip leading/trailing whitespace
        sanitized = sanitized.strip()
        
        return sanitized
    
    def build_prompt(
        self,
        asset_type: AssetType,
        brand_kit: BrandKitContext,
        custom_prompt: Optional[str] = None,
        version: str = "v1.0"
    ) -> str:
        """
        Build a complete prompt for AI generation.
        
        Combines template, brand kit context, custom prompt, and quality
        modifiers into a final prompt string.
        
        Args:
            asset_type: Type of asset to generate
            brand_kit: Brand kit context for styling
            custom_prompt: Optional user-provided prompt addition
            version: Template version to use
            
        Returns:
            Complete prompt string ready for AI generation
            
        Raises:
            TemplateNotFoundError: If template cannot be loaded
        """
        # Load template
        template = self.load_template(asset_type, version)
        
        # Inject brand kit values
        prompt = self.inject_brand_kit(template, brand_kit)
        
        # Handle custom prompt
        sanitized_custom = ""
        if custom_prompt:
            sanitized_custom = self.sanitize_input(custom_prompt)
        
        # Replace custom_prompt placeholder
        prompt = prompt.replace('{custom_prompt}', sanitized_custom)
        
        # Append quality modifiers
        if template.quality_modifiers:
            modifiers_str = ', '.join(template.quality_modifiers)
            prompt = f"{prompt}\n\nQuality: {modifiers_str}."
        
        # Clean up any remaining empty placeholders
        prompt = re.sub(r'\{[^}]+\}', '', prompt)
        
        # Normalize whitespace in final output
        prompt = '\n'.join(line.strip() for line in prompt.split('\n') if line.strip())
        
        return prompt
    
    def build_brand_context_prompt(
        self,
        context: ResolvedBrandContext,
    ) -> str:
        """
        Build a token-efficient brand context string.
        
        Uses compressed format that AI models understand well:
        - Hex colors directly (no "the color red")
        - Font shorthand (no "use the font family called")
        - Minimal connecting words
        
        Target: <80 tokens for full brand context
        
        Args:
            context: Resolved brand context with specific values
            
        Returns:
            Compact brand context string for prompt injection
        """
        parts = []
        intensity = self.INTENSITY_MODIFIERS.get(context.intensity, "use")
        
        # Colors - compact format
        colors = [context.primary_color]
        if context.secondary_color:
            colors.append(context.secondary_color)
        if context.accent_color:
            colors.append(f"accent:{context.accent_color}")
        
        parts.append(f"Colors: {' '.join(colors)}")
        
        # Gradient if selected
        if context.gradient:
            parts.append(f"Gradient: {context.gradient}")
        
        # Typography - single line
        parts.append(f"Font: {context.font}")
        
        # Tone - single word
        parts.append(f"Tone: {context.tone}")
        
        # Tagline/catchphrase if selected
        if context.tagline:
            parts.append(f'Tagline: "{context.tagline}"')
        if context.catchphrase:
            parts.append(f'Text: "{context.catchphrase}"')
        
        # Logo placement if included
        if context.include_logo:
            parts.append(f"Logo: {context.logo_position} {context.logo_size}")
        
        # Combine with intensity instruction
        brand_block = " | ".join(parts)
        
        return f"[BRAND: {intensity} - {brand_block}]"
    
    def build_prompt_v2(
        self,
        asset_type: AssetType,
        brand_kit: dict,
        customization: Optional[dict] = None,
        custom_prompt: Optional[str] = None,
        version: str = "v1.0"
    ) -> str:
        """
        Build prompt with token-efficient brand injection.
        
        New prompt structure:
        1. Asset type instruction (fixed)
        2. Brand context block (compact, ~50-80 tokens)
        3. Custom prompt (sanitized, ~100 tokens max)
        4. Quality modifiers (fixed, ~30 tokens)
        
        Total: ~200-250 tokens for brand + custom, leaving
        plenty of room for AI generation.
        
        Args:
            asset_type: Type of asset to generate
            brand_kit: Full brand kit data
            customization: User's brand customization selections
            custom_prompt: Optional user prompt
            version: Template version
            
        Returns:
            Complete prompt string optimized for token efficiency
        """
        # Resolve brand context
        context = BrandContextResolver.resolve(brand_kit, customization)
        
        # Load template for asset type
        template = self.load_template(asset_type, version)
        
        # Build brand context block
        brand_block = self.build_brand_context_prompt(context)
        
        # Sanitize custom prompt
        sanitized_custom = ""
        if custom_prompt:
            sanitized_custom = self.sanitize_input(custom_prompt)
        
        # Build final prompt
        # Format: [TYPE] [BRAND BLOCK] [CUSTOM] [QUALITY]
        prompt_parts = [
            f"Create a {asset_type.value} image.",
            brand_block,
        ]
        
        if sanitized_custom:
            prompt_parts.append(f"Content: {sanitized_custom}")
        
        # Add quality modifiers
        if template.quality_modifiers:
            quality_str = ", ".join(template.quality_modifiers[:5])  # Limit to 5
            prompt_parts.append(f"Quality: {quality_str}")
        
        return "\n".join(prompt_parts)
    
    def build_prompt_no_brand(
        self,
        asset_type: AssetType,
        custom_prompt: Optional[str] = None,
        version: str = "v1.0"
    ) -> str:
        """
        Build prompt without brand kit constraints.
        
        Uses AI creative defaults for colors, style, and composition.
        
        Args:
            asset_type: Type of asset to generate
            custom_prompt: Optional user prompt
            version: Template version
            
        Returns:
            Complete prompt string for AI-driven generation
        """
        # Ensure asset_type is an AssetType enum
        if isinstance(asset_type, str):
            asset_type = AssetType(asset_type)
        
        # Load template for asset type
        template = self.load_template(asset_type, version)
        
        # Sanitize custom prompt
        sanitized_custom = ""
        if custom_prompt:
            sanitized_custom = self.sanitize_input(custom_prompt)
        
        # Build prompt with AI creative freedom
        prompt_parts = [
            f"Create a {asset_type.value} image.",
            "Style: Use creative, professional design with vibrant colors and modern aesthetics.",
        ]
        
        if sanitized_custom:
            prompt_parts.append(f"Content: {sanitized_custom}")
        else:
            # Default content guidance
            prompt_parts.append("Content: Eye-catching streaming/gaming content with dynamic composition.")
        
        # Add quality modifiers
        if template.quality_modifiers:
            quality_str = ", ".join(template.quality_modifiers[:5])  # Limit to 5
            prompt_parts.append(f"Quality: {quality_str}")
        
        return "\n".join(prompt_parts)
    
    def clear_cache(self) -> None:
        """Clear the template cache. Thread-safe."""
        with self._cache_lock:
            self._template_cache.clear()
    
    def load_vibe_template(
        self,
        asset_type: str,
        version: str = "v1.0"
    ) -> VibeBasedTemplate:
        """
        Load a vibe-based template (like logos) from YAML.
        
        These templates have multiple style options (vibes) that users
        can choose from, each with its own prompt.
        
        Args:
            asset_type: Type of asset (e.g., "logo")
            version: Template version
            
        Returns:
            VibeBasedTemplate with all vibes loaded
            
        Raises:
            TemplateNotFoundError: If template doesn't exist
        """
        cache_key = f"vibe:{asset_type}:{version}"
        
        # Check cache
        with self._cache_lock:
            if cache_key in self._template_cache:
                return self._template_cache[cache_key]
        
        # Build path
        template_path = self.prompts_dir / asset_type / f"{version}.yaml"
        
        if not template_path.exists():
            raise TemplateNotFoundError(
                asset_type=asset_type,
                version=version,
                reason="Template file not found"
            )
        
        # Load YAML
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
        except (yaml.YAMLError, IOError) as e:
            raise TemplateNotFoundError(
                asset_type=asset_type,
                version=version,
                reason=str(e)
            )
        
        # Parse vibes
        vibes = {}
        for vibe_key, vibe_data in data.get('vibes', {}).items():
            vibes[vibe_key] = VibeTemplate(
                key=vibe_key,
                name=vibe_data.get('name', vibe_key),
                description=vibe_data.get('description', ''),
                prompt=vibe_data.get('prompt', ''),
                preview_tags=vibe_data.get('preview_tags', [])
            )
        
        template = VibeBasedTemplate(
            name=data.get('name', asset_type),
            version=data.get('version', version),
            category=data.get('category', 'general'),
            asset_type=data.get('asset_type', asset_type),
            dimensions=data.get('dimensions', {'width': 512, 'height': 512}),
            vibes=vibes,
            placeholders=data.get('placeholders', []),
            quality_modifiers=data.get('quality_modifiers', [])
        )
        
        # Cache
        with self._cache_lock:
            self._template_cache[cache_key] = template
        
        return template
    
    def build_logo_prompt(
        self,
        vibe: str,
        name: str,
        icon: str,
        background_color: str,
        version: str = "v1.0"
    ) -> str:
        """
        Build a logo generation prompt from a vibe template.
        
        Args:
            vibe: Vibe/style key (e.g., "studio-minimalist")
            name: Brand/channel name
            icon: Icon type (e.g., "wolf", "dragon")
            background_color: Hex color for background
            version: Template version
            
        Returns:
            Complete prompt string for logo generation
        """
        # Load template
        template = self.load_vibe_template("logo", version)
        
        # Get the vibe
        if vibe not in template.vibes:
            # Fall back to first vibe
            vibe = list(template.vibes.keys())[0]
        
        vibe_template = template.vibes[vibe]
        
        # Sanitize inputs
        sanitized_name = self.sanitize_input(name)
        sanitized_icon = self.sanitize_input(icon)
        
        # Build prompt by replacing placeholders
        prompt = vibe_template.prompt
        prompt = prompt.replace('{name}', sanitized_name)
        prompt = prompt.replace('{icon}', sanitized_icon)
        prompt = prompt.replace('{background_color}', background_color)
        
        # Add quality modifiers
        if template.quality_modifiers:
            quality_str = ', '.join(template.quality_modifiers)
            prompt = f"{prompt.strip()}\n\nQuality: {quality_str}."
        
        return prompt.strip()
    
    def get_logo_vibes(self, version: str = "v1.0") -> list[dict]:
        """
        Get available logo vibes/styles for UI display.
        
        Returns:
            List of vibe info dicts with key, name, description, tags
        """
        template = self.load_vibe_template("logo", version)
        
        return [
            {
                "key": vibe.key,
                "name": vibe.name,
                "description": vibe.description,
                "tags": vibe.preview_tags or []
            }
            for vibe in template.vibes.values()
        ]
    
    def get_logo_placeholders(self, version: str = "v1.0") -> list[dict]:
        """
        Get logo template placeholders for UI form generation.
        
        Returns:
            List of placeholder definitions
        """
        template = self.load_vibe_template("logo", version)
        return template.placeholders
    
    def get_cached_templates(self) -> list[str]:
        """
        Get list of currently cached template keys.
        
        Returns:
            List of cache keys in format "asset_type:version"
        """
        with self._cache_lock:
            return list(self._template_cache.keys())


# Singleton instance for convenience
_prompt_engine: Optional[PromptEngine] = None


def get_prompt_engine() -> PromptEngine:
    """Get or create the prompt engine singleton."""
    global _prompt_engine
    if _prompt_engine is None:
        _prompt_engine = PromptEngine()
    return _prompt_engine
