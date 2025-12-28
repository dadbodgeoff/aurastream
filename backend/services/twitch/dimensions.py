"""
Dimension specifications for Twitch and related platform assets.

This module defines the generation and export sizes for various asset types,
along with AI directives for optimal generation results.

Generation sizes are optimized for AI image generation models, while export
sizes match platform requirements for delivery.
"""

from dataclasses import dataclass
from typing import Dict, List, Tuple


@dataclass
class DimensionSpec:
    """Dimension specification for an asset type."""
    generation_size: Tuple[int, int]  # AI-optimized size
    export_size: Tuple[int, int]      # Platform delivery size
    aspect_ratio: str                  # Human-readable ratio


# ============================================================================
# Dimension Specifications
# ============================================================================

DIMENSION_SPECS: Dict[str, DimensionSpec] = {
    # YouTube assets
    "youtube_thumbnail": DimensionSpec(
        generation_size=(1216, 832),
        export_size=(1280, 720),
        aspect_ratio="16:9"
    ),
    "youtube_banner": DimensionSpec(
        generation_size=(1536, 640),
        export_size=(2560, 1440),
        aspect_ratio="16:9"
    ),
    
    # TikTok/Story assets (vertical 9:16)
    "tiktok_story": DimensionSpec(
        generation_size=(832, 1216),
        export_size=(1080, 1920),
        aspect_ratio="9:16"
    ),
    "story_graphic": DimensionSpec(
        generation_size=(832, 1216),
        export_size=(1080, 1920),
        aspect_ratio="9:16"
    ),
    "instagram_story": DimensionSpec(
        generation_size=(832, 1216),
        export_size=(1080, 1920),
        aspect_ratio="9:16"
    ),
    "instagram_reel": DimensionSpec(
        generation_size=(832, 1216),
        export_size=(1080, 1920),
        aspect_ratio="9:16"
    ),
    
    # Twitch banners and panels
    "twitch_banner": DimensionSpec(
        generation_size=(1536, 640),
        export_size=(1200, 480),
        aspect_ratio="~3:1"
    ),
    "twitch_panel": DimensionSpec(
        generation_size=(640, 320),
        export_size=(320, 160),
        aspect_ratio="2:1"
    ),
    "twitch_offline": DimensionSpec(
        generation_size=(1920, 1080),
        export_size=(1920, 1080),
        aspect_ratio="16:9"
    ),
    
    # Stream overlays (16:9 landscape)
    "overlay": DimensionSpec(
        generation_size=(1920, 1080),
        export_size=(1920, 1080),
        aspect_ratio="16:9"
    ),
    
    # Profile pictures
    "square_pfp": DimensionSpec(
        generation_size=(1024, 1024),
        export_size=(800, 800),
        aspect_ratio="1:1"
    ),
    
    # Twitch emotes (multiple sizes)
    "twitch_emote": DimensionSpec(
        generation_size=(1024, 1024),
        export_size=(512, 512),
        aspect_ratio="1:1"
    ),
    "twitch_emote_112": DimensionSpec(
        generation_size=(1024, 1024),
        export_size=(112, 112),
        aspect_ratio="1:1"
    ),
    "twitch_emote_56": DimensionSpec(
        generation_size=(1024, 1024),
        export_size=(56, 56),
        aspect_ratio="1:1"
    ),
    "twitch_emote_28": DimensionSpec(
        generation_size=(1024, 1024),
        export_size=(28, 28),
        aspect_ratio="1:1"
    ),
    
    # Twitch badges (multiple sizes)
    "twitch_badge": DimensionSpec(
        generation_size=(1024, 1024),
        export_size=(72, 72),
        aspect_ratio="1:1"
    ),
    "twitch_badge_36": DimensionSpec(
        generation_size=(1024, 1024),
        export_size=(36, 36),
        aspect_ratio="1:1"
    ),
    "twitch_badge_18": DimensionSpec(
        generation_size=(1024, 1024),
        export_size=(18, 18),
        aspect_ratio="1:1"
    ),
}


# ============================================================================
# Asset Type Directives
# ============================================================================

ASSET_TYPE_DIRECTIVES: Dict[str, str] = {
    "twitch_emote": "vector art style, sticker style, bold thick outlines, flat colors, high contrast, simple iconic design, solid green background, expressive, clear silhouette, scales to 28px",
    "twitch_badge": "badge style, solid green background, iconic, simple, bold outlines, flat colors",
    "youtube_thumbnail": "high contrast, cinematic lighting, eye-catching, bold",
    "twitch_banner": "wide composition, text-safe zones, dynamic",
    "tiktok_story": "vertical composition, mobile-optimized, vibrant",
    "story_graphic": "vertical composition, mobile-optimized, vibrant, social media story format",
    "instagram_story": "vertical composition, mobile-optimized, vibrant, Instagram story format",
    "instagram_reel": "vertical composition, mobile-optimized, vibrant, short-form video cover",
    "twitch_panel": "clean design, readable text area, branded",
    "twitch_offline": "atmospheric, branded, professional stream offline screen",
    "overlay": "transparent-friendly, stream overlay, 16:9 landscape, non-intrusive design",
}


# ============================================================================
# Helper Functions
# ============================================================================

def get_dimension_spec(asset_type: str) -> DimensionSpec:
    """
    Get the dimension specification for an asset type.
    
    Args:
        asset_type: The type of asset (e.g., 'twitch_emote', 'youtube_thumbnail')
        
    Returns:
        DimensionSpec with generation and export sizes
        
    Raises:
        ValueError: If the asset type is not found
    """
    if asset_type not in DIMENSION_SPECS:
        raise ValueError(f"Unknown asset type: {asset_type}")
    return DIMENSION_SPECS[asset_type]


def get_asset_directive(asset_type: str) -> str:
    """
    Get the AI generation directive for an asset type.
    
    Args:
        asset_type: The type of asset (e.g., 'twitch_emote', 'youtube_thumbnail')
        
    Returns:
        Directive string for AI generation, or empty string if not found
    """
    return ASSET_TYPE_DIRECTIVES.get(asset_type, "")


def get_all_twitch_asset_types() -> List[str]:
    """
    Get a list of all Twitch-specific asset types.
    
    Returns:
        List of asset type strings that start with 'twitch_'
    """
    return [
        asset_type 
        for asset_type in DIMENSION_SPECS.keys() 
        if asset_type.startswith("twitch_")
    ]


def get_dimension_info_for_prompt(asset_type: str) -> str:
    """
    Get human-readable dimension info for injection into prompts.
    
    This is used to auto-inject dimension context so users don't need
    to know or specify dimensions manually.
    
    Args:
        asset_type: The type of asset (e.g., 'story_graphic', 'youtube_thumbnail')
        
    Returns:
        Human-readable string describing the dimensions and orientation
    """
    if asset_type not in DIMENSION_SPECS:
        return ""
    
    spec = DIMENSION_SPECS[asset_type]
    width, height = spec.export_size
    
    # Determine orientation
    if width > height:
        orientation = "landscape (horizontal)"
    elif height > width:
        orientation = "portrait (vertical)"
    else:
        orientation = "square"
    
    # Build description
    return f"{width}x{height}px, {spec.aspect_ratio} aspect ratio, {orientation}"


def get_composition_directive(asset_type: str) -> str:
    """
    Get composition directive based on asset dimensions.
    
    Returns specific composition guidance for the AI based on the
    asset's aspect ratio and intended use.
    
    Args:
        asset_type: The type of asset
        
    Returns:
        Composition directive string for AI generation
    """
    if asset_type not in DIMENSION_SPECS:
        return ""
    
    spec = DIMENSION_SPECS[asset_type]
    width, height = spec.export_size
    
    # Vertical/portrait assets (9:16 stories, reels)
    if height > width and spec.aspect_ratio == "9:16":
        return (
            "VERTICAL COMPOSITION REQUIRED: Design for mobile viewing. "
            "Place key elements in the center-to-upper portion. "
            "Leave space at bottom for UI elements. "
            "Use full height for impact."
        )
    
    # Wide/banner assets
    if width > height * 2:
        return (
            "WIDE BANNER COMPOSITION: Design for horizontal display. "
            "Center important elements. Leave text-safe zones on edges. "
            "Consider how it will be cropped on different devices."
        )
    
    # Standard landscape (16:9)
    if width > height:
        return (
            "LANDSCAPE COMPOSITION: Design for widescreen display. "
            "Use rule of thirds for key elements. "
            "Ensure readability at smaller sizes."
        )
    
    # Square assets (emotes, badges)
    if width == height:
        return (
            "SQUARE COMPOSITION: Center the main subject. "
            "Ensure clear silhouette and readability at small sizes. "
            "Keep design simple and iconic."
        )
    
    return ""


# ============================================================================
# Export all public symbols
# ============================================================================

__all__ = [
    "DimensionSpec",
    "DIMENSION_SPECS",
    "ASSET_TYPE_DIRECTIVES",
    "get_dimension_spec",
    "get_asset_directive",
    "get_all_twitch_asset_types",
    "get_dimension_info_for_prompt",
    "get_composition_directive",
]
