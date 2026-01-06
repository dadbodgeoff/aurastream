"""
Asset Type Configuration Registry

Single source of truth for all asset-type-specific behavior in the Coach system.
This enables scalable addition of new asset types (emotes, logos, stream assets)
without code duplication or endless if/elif branches.

Usage:
    from backend.services.coach.asset_types import get_asset_config, AssetCategory

    config = get_asset_config("twitch_emote")
    if config.category == AssetCategory.EMOTE:
        # Use emote-specific behavior
"""

from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional


class AssetCategory(str, Enum):
    """High-level asset categories that share behavior."""
    THUMBNAIL = "thumbnail"
    EMOTE = "emote"
    BANNER = "banner"
    PANEL = "panel"
    OVERLAY = "overlay"
    LOGO = "logo"  # Future
    STREAM_ASSET = "stream_asset"  # Future


class ClassificationMode(str, Enum):
    """How canvas elements should be classified for this asset type."""
    FULL = "full"  # Full classification with text/scene detection (thumbnails)
    SIMPLE = "simple"  # Skip text/scene, focus on single subject (emotes)
    BRAND = "brand"  # Focus on brand identity, scalability (logos)


class PromptTemplate(str, Enum):
    """Which prompt template to use for Coach refinement."""
    CANVAS_REFINEMENT = "canvas_refinement"  # Complex compositions
    EMOTE_REFINEMENT = "emote_refinement"  # Single-subject, expression-focused
    LOGO_REFINEMENT = "logo_refinement"  # Brand identity (future)
    BANNER_REFINEMENT = "banner_refinement"  # Wide format, brand-focused


@dataclass
class AssetTypeConfig:
    """Configuration for a specific asset type."""

    # Identity
    asset_type: str
    display_name: str
    category: AssetCategory

    # Coach behavior
    template: PromptTemplate
    questions: List[str]  # What to ask about
    tips: str  # Asset-specific tips for Coach

    # Generation
    quality_prefix: str  # Prefix for Nano Banana prompt
    sizes: Optional[List[int]] = None  # Multi-size output (emotes)

    # Classification
    classification_mode: ClassificationMode = ClassificationMode.FULL

    # Flags
    needs_transparent_bg: bool = False
    supports_text: bool = True
    supports_complex_scenes: bool = True


# =============================================================================
# ASSET TYPE REGISTRY
# =============================================================================

ASSET_TYPE_CONFIGS: Dict[str, AssetTypeConfig] = {

    # -------------------------------------------------------------------------
    # THUMBNAILS
    # -------------------------------------------------------------------------

    "youtube_thumbnail": AssetTypeConfig(
        asset_type="youtube_thumbnail",
        display_name="YouTube Thumbnail",
        category=AssetCategory.THUMBNAIL,
        template=PromptTemplate.CANVAS_REFINEMENT,
        questions=["subject", "text_styling", "scene_composition", "effects", "element_sizing"],
        tips="High contrast grabs attention, faces with expressions perform best, text readable at small sizes, max 3 focal points.",
        quality_prefix="4K studio-quality YouTube gaming thumbnail",
        classification_mode=ClassificationMode.FULL,
        supports_text=True,
        supports_complex_scenes=True,
    ),

    "thumbnail": AssetTypeConfig(
        asset_type="thumbnail",
        display_name="Thumbnail",
        category=AssetCategory.THUMBNAIL,
        template=PromptTemplate.CANVAS_REFINEMENT,
        questions=["subject", "text_styling", "scene_composition", "effects"],
        tips="Clear focal point, readable text, brand colors for recognition.",
        quality_prefix="Professional gaming thumbnail",
        classification_mode=ClassificationMode.FULL,
        supports_text=True,
        supports_complex_scenes=True,
    ),

    # -------------------------------------------------------------------------
    # EMOTES
    # -------------------------------------------------------------------------

    "twitch_emote": AssetTypeConfig(
        asset_type="twitch_emote",
        display_name="Twitch Emote",
        category=AssetCategory.EMOTE,
        template=PromptTemplate.EMOTE_REFINEMENT,
        questions=["expression", "readability_28px", "outline_style", "pose", "color_boldness"],
        tips="Must work at 28x28px. Simple shapes with bold outlines. Single clear emotion. Avoid fine details. Exaggerated expressions read better. Transparent background required.",
        quality_prefix="Crisp high-detail Twitch emote with transparent background, bold colors, exaggerated expression",
        sizes=[112, 56, 28],
        classification_mode=ClassificationMode.SIMPLE,
        needs_transparent_bg=True,
        supports_text=False,  # Emotes rarely have text
        supports_complex_scenes=False,  # Single subject only
    ),

    "tiktok_emote": AssetTypeConfig(
        asset_type="tiktok_emote",
        display_name="TikTok Emote",
        category=AssetCategory.EMOTE,
        template=PromptTemplate.EMOTE_REFINEMENT,
        questions=["expression", "readability_100px", "outline_style", "pose", "color_vibrancy"],
        tips="Must work at 100x100px. Vibrant colors, expressive design. Bold outlines help visibility. Single clear emotion or reaction. Transparent background required.",
        quality_prefix="Crisp high-detail TikTok emote with transparent background, vibrant colors, expressive design",
        sizes=[300, 200, 100],
        classification_mode=ClassificationMode.SIMPLE,
        needs_transparent_bg=True,
        supports_text=False,
        supports_complex_scenes=False,
    ),

    # -------------------------------------------------------------------------
    # BANNERS
    # -------------------------------------------------------------------------

    "twitch_banner": AssetTypeConfig(
        asset_type="twitch_banner",
        display_name="Twitch Banner",
        category=AssetCategory.BANNER,
        template=PromptTemplate.BANNER_REFINEMENT,
        questions=["brand_identity", "text_placement", "safe_zones", "color_scheme"],
        tips="Brand colors prominent, clean composition, text readable on mobile, leave space for profile picture.",
        quality_prefix="Professional Twitch channel banner",
        classification_mode=ClassificationMode.FULL,
        supports_text=True,
        supports_complex_scenes=False,
    ),

    "banner": AssetTypeConfig(
        asset_type="banner",
        display_name="Banner",
        category=AssetCategory.BANNER,
        template=PromptTemplate.BANNER_REFINEMENT,
        questions=["brand_identity", "text_placement", "safe_zones"],
        tips="Wide format, key content in center safe zone, brand colors.",
        quality_prefix="Professional gaming banner",
        classification_mode=ClassificationMode.FULL,
        supports_text=True,
        supports_complex_scenes=False,
    ),

    # -------------------------------------------------------------------------
    # PANELS & SCREENS
    # -------------------------------------------------------------------------

    "twitch_panel": AssetTypeConfig(
        asset_type="twitch_panel",
        display_name="Twitch Panel",
        category=AssetCategory.PANEL,
        template=PromptTemplate.CANVAS_REFINEMENT,
        questions=["text_content", "icon_style", "brand_consistency"],
        tips="Consistent style across panels, clear readable text, icons help quick scanning.",
        quality_prefix="Polished Twitch panel graphic",
        classification_mode=ClassificationMode.FULL,
        supports_text=True,
        supports_complex_scenes=False,
    ),

    "twitch_offline": AssetTypeConfig(
        asset_type="twitch_offline",
        display_name="Twitch Offline Screen",
        category=AssetCategory.PANEL,
        template=PromptTemplate.CANVAS_REFINEMENT,
        questions=["schedule_info", "social_links", "brand_identity", "call_to_action"],
        tips="Include schedule or social links, brand identity prominent, call to action.",
        quality_prefix="Professional Twitch offline screen",
        classification_mode=ClassificationMode.FULL,
        supports_text=True,
        supports_complex_scenes=False,
    ),

    "twitch_badge": AssetTypeConfig(
        asset_type="twitch_badge",
        display_name="Twitch Badge",
        category=AssetCategory.EMOTE,  # Similar to emotes
        template=PromptTemplate.EMOTE_REFINEMENT,
        questions=["tier_identity", "readability_18px", "silhouette_clarity"],
        tips="Even simpler than emotes, works at 18x18px, clear silhouette, tier progression should be distinct.",
        quality_prefix="Clean professional Twitch badge",
        sizes=[72, 36, 18],
        classification_mode=ClassificationMode.SIMPLE,
        needs_transparent_bg=True,
        supports_text=False,
        supports_complex_scenes=False,
    ),

    # -------------------------------------------------------------------------
    # OVERLAYS
    # -------------------------------------------------------------------------

    "overlay": AssetTypeConfig(
        asset_type="overlay",
        display_name="Stream Overlay",
        category=AssetCategory.OVERLAY,
        template=PromptTemplate.CANVAS_REFINEMENT,
        questions=["transparency_areas", "brand_elements", "layout_zones"],
        tips="Don't obstruct important areas, transparent backgrounds, consistent with brand.",
        quality_prefix="Clean broadcast-ready stream overlay",
        classification_mode=ClassificationMode.FULL,
        needs_transparent_bg=True,
        supports_text=True,
        supports_complex_scenes=False,
    ),

    # -------------------------------------------------------------------------
    # SOCIAL / STORIES
    # -------------------------------------------------------------------------

    "story_graphic": AssetTypeConfig(
        asset_type="story_graphic",
        display_name="Story Graphic",
        category=AssetCategory.THUMBNAIL,
        template=PromptTemplate.CANVAS_REFINEMENT,
        questions=["hook_element", "text_placement", "vertical_composition"],
        tips="Vertical 9:16, bold attention-grabbing, text in upper/lower thirds.",
        quality_prefix="Eye-catching vertical story graphic",
        classification_mode=ClassificationMode.FULL,
        supports_text=True,
        supports_complex_scenes=True,
    ),

    "instagram_story": AssetTypeConfig(
        asset_type="instagram_story",
        display_name="Instagram Story",
        category=AssetCategory.THUMBNAIL,
        template=PromptTemplate.CANVAS_REFINEMENT,
        questions=["hook_element", "ui_safe_zones", "call_to_action"],
        tips="Leave space for UI elements, bold colors and text, engaging CTA.",
        quality_prefix="Engaging Instagram story graphic",
        classification_mode=ClassificationMode.FULL,
        supports_text=True,
        supports_complex_scenes=True,
    ),

    "instagram_reel": AssetTypeConfig(
        asset_type="instagram_reel",
        display_name="Instagram Reel",
        category=AssetCategory.THUMBNAIL,
        template=PromptTemplate.CANVAS_REFINEMENT,
        questions=["first_frame_hook", "text_overlay", "vertical_composition"],
        tips="Vertical format, eye-catching first frame, text overlay for context.",
        quality_prefix="Eye-catching Instagram reel cover",
        classification_mode=ClassificationMode.FULL,
        supports_text=True,
        supports_complex_scenes=True,
    ),
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_asset_config(asset_type: str) -> AssetTypeConfig:
    """
    Get configuration for an asset type.
    
    Returns a default config if asset type is not found.
    """
    if asset_type in ASSET_TYPE_CONFIGS:
        return ASSET_TYPE_CONFIGS[asset_type]

    # Default fallback config
    return AssetTypeConfig(
        asset_type=asset_type,
        display_name=asset_type.replace("_", " ").title(),
        category=AssetCategory.THUMBNAIL,
        template=PromptTemplate.CANVAS_REFINEMENT,
        questions=["subject", "style", "composition"],
        tips="Clear composition, brand consistency, professional polish.",
        quality_prefix=f"Professional {asset_type.replace('_', ' ')}",
        classification_mode=ClassificationMode.FULL,
    )


def get_asset_tips(asset_type: str) -> str:
    """Get tips string for an asset type."""
    return get_asset_config(asset_type).tips


def get_quality_prefix(asset_type: str) -> str:
    """Get quality prefix for Nano Banana prompt."""
    return get_asset_config(asset_type).quality_prefix


def get_display_name(asset_type: str) -> str:
    """Get human-readable display name."""
    return get_asset_config(asset_type).display_name


def is_emote_type(asset_type: str) -> bool:
    """Check if asset type is an emote (needs special handling)."""
    config = get_asset_config(asset_type)
    return config.category == AssetCategory.EMOTE


def needs_simple_classification(asset_type: str) -> bool:
    """Check if asset type should use simple classification (skip text/scene)."""
    config = get_asset_config(asset_type)
    return config.classification_mode == ClassificationMode.SIMPLE


def get_emote_sizes(asset_type: str) -> Optional[List[int]]:
    """Get multi-size output dimensions for emotes."""
    config = get_asset_config(asset_type)
    return config.sizes


def supports_text(asset_type: str) -> bool:
    """Check if asset type typically includes text."""
    return get_asset_config(asset_type).supports_text


def supports_complex_scenes(asset_type: str) -> bool:
    """Check if asset type supports complex multi-element scenes."""
    return get_asset_config(asset_type).supports_complex_scenes


# =============================================================================
# QUESTION TEMPLATES BY CATEGORY
# =============================================================================

QUESTION_TEMPLATES = {
    # Thumbnail questions
    "subject": "What's the main subject or focal point?",
    "text_styling": "For the text, what style? (bold, glow, outline, 3D?)",
    "scene_composition": "How should the elements be arranged?",
    "effects": "Any effects? (glow, shadow, action lines?)",
    "element_sizing": "Current sizes good, or adjust anything?",

    # Emote questions
    "expression": "What emotion/expression? (hype, sad, love, rage, pog, laugh?)",
    "readability_28px": "Will this read clearly at 28px (tiny chat size)?",
    "readability_100px": "Will this read clearly at 100px?",
    "readability_18px": "Will this read clearly at 18px (badge size)?",
    "outline_style": "Bold outline or soft edges?",
    "pose": "Any specific pose or gesture?",
    "color_boldness": "Bold saturated colors or more subtle?",
    "color_vibrancy": "How vibrant should the colors be?",
    "silhouette_clarity": "Is the silhouette instantly recognizable?",
    "tier_identity": "What tier is this for? How should it differ from other tiers?",

    # Banner questions
    "brand_identity": "How prominent should your brand be?",
    "text_placement": "Where should text go? (consider safe zones)",
    "safe_zones": "Leave space for profile picture/UI elements?",
    "color_scheme": "Stick to brand colors or try something new?",

    # Panel/Screen questions
    "text_content": "What text should appear?",
    "icon_style": "Any icons needed? What style?",
    "brand_consistency": "Match your other panels' style?",
    "schedule_info": "Include schedule information?",
    "social_links": "Which social links to show?",
    "call_to_action": "What action should viewers take?",

    # Overlay questions
    "transparency_areas": "Which areas need to stay transparent?",
    "brand_elements": "Which brand elements to include?",
    "layout_zones": "Where should different elements go?",

    # Story/Social questions
    "hook_element": "What's the attention-grabbing hook?",
    "ui_safe_zones": "Leave space for platform UI?",
    "first_frame_hook": "What makes someone stop scrolling?",
    "text_overlay": "Any text overlay needed?",
    "vertical_composition": "How to use the vertical space?",
}


def get_questions_for_asset(asset_type: str) -> List[str]:
    """Get formatted questions for an asset type."""
    config = get_asset_config(asset_type)
    return [
        QUESTION_TEMPLATES.get(q, q)
        for q in config.questions
        if q in QUESTION_TEMPLATES
    ]


__all__ = [
    "AssetCategory",
    "ClassificationMode", 
    "PromptTemplate",
    "AssetTypeConfig",
    "ASSET_TYPE_CONFIGS",
    "get_asset_config",
    "get_asset_tips",
    "get_quality_prefix",
    "get_display_name",
    "is_emote_type",
    "needs_simple_classification",
    "get_emote_sizes",
    "supports_text",
    "supports_complex_scenes",
    "get_questions_for_asset",
    "QUESTION_TEMPLATES",
]
