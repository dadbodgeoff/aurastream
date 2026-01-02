"""
Creator Media Library Constants.

Defines all constants for the Creator Media Library:
- Asset types and their descriptions
- File size and MIME type restrictions
- Storage bucket configuration
- Tier-based asset limits
- Background removal settings
"""

from typing import Literal, Dict, Set

# ============================================================================
# Asset Type Definitions
# ============================================================================

MediaAssetType = Literal[
    "logo",           # Brand logos
    "face",           # User faces for thumbnails
    "character",      # Character/avatar representations
    "game_skin",      # Game character skins
    "object",         # Props, items to include
    "background",     # Custom backgrounds
    "reference",      # Style reference images
    "overlay",        # Stream overlays
    "emote",          # Channel emotes
    "badge",          # Subscriber badges
    "panel",          # Channel panels
    "alert",          # Alert images
    "facecam_frame",  # Facecam borders
    "stinger",        # Transition animations
]

MEDIA_ASSET_TYPES: list[MediaAssetType] = [
    "logo", "face", "character", "game_skin", "object", "background",
    "reference", "overlay", "emote", "badge", "panel", "alert",
    "facecam_frame", "stinger"
]

ASSET_TYPE_DESCRIPTIONS: Dict[MediaAssetType, str] = {
    "logo": "Brand logos (primary, secondary, icon, etc.)",
    "face": "User faces for thumbnail recreation",
    "character": "Character/avatar representations",
    "game_skin": "Game character skins",
    "object": "Props and items to include in generations",
    "background": "Custom backgrounds",
    "reference": "Style reference images",
    "overlay": "Stream overlays",
    "emote": "Channel emotes",
    "badge": "Subscriber badges",
    "panel": "Channel panels",
    "alert": "Alert images",
    "facecam_frame": "Facecam borders",
    "stinger": "Transition animations",
}

# ============================================================================
# Background Removal Configuration
# ============================================================================

# Asset types that should have background removed by default
# These are typically used as overlays/composites in generations
BG_REMOVAL_DEFAULT_TYPES: Set[MediaAssetType] = {
    "face",        # Faces need transparent bg for thumbnail compositing
    "logo",        # Logos need transparent bg for overlays
    "character",   # Characters need transparent bg for compositing
    "object",      # Objects/props need transparent bg
    "emote",       # Emotes are always transparent
    "badge",       # Badges are always transparent
    "game_skin",   # Game skins for compositing
}

# Asset types that should NEVER have background removed
# These need their backgrounds to function properly
BG_REMOVAL_EXCLUDED_TYPES: Set[MediaAssetType] = {
    "background",  # Backgrounds ARE the background
    "reference",   # Reference images should stay as-is
    "panel",       # Panels have designed backgrounds
    "overlay",     # Overlays may have intentional backgrounds
    "alert",       # Alerts may have designed backgrounds
    "facecam_frame",  # Frames have designed backgrounds
    "stinger",     # Stingers/transitions have designed backgrounds
}


def should_remove_background_by_default(asset_type: MediaAssetType) -> bool:
    """Check if an asset type should have background removed by default."""
    return asset_type in BG_REMOVAL_DEFAULT_TYPES


def can_remove_background(asset_type: MediaAssetType) -> bool:
    """Check if background removal is allowed for an asset type."""
    return asset_type not in BG_REMOVAL_EXCLUDED_TYPES


# ============================================================================
# Storage Configuration
# ============================================================================

BUCKET_NAME = "creator-media"

# Allowed MIME types and their extensions
ALLOWED_MIME_TYPES: Dict[str, str] = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
}

# Max file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024

# ============================================================================
# Tier-Based Access & Limits
# ============================================================================

# Media Library is Pro/Studio only - free users cannot access
ALLOWED_TIERS = ["pro", "studio"]

# Total asset limit across all types (Pro and Studio)
TOTAL_ASSET_LIMIT = 25

# Max assets that can be injected into a single prompt
MAX_PROMPT_INJECTION_ASSETS = 2

# Per-type limits (within the 25 total)
ASSET_LIMITS_PRO: Dict[MediaAssetType, int] = {
    "logo": 5,
    "face": 5,
    "character": 5,
    "game_skin": 5,
    "object": 10,
    "background": 5,
    "reference": 10,
    "overlay": 5,
    "emote": 5,
    "badge": 5,
    "panel": 5,
    "alert": 5,
    "facecam_frame": 5,
    "stinger": 5,
}

# Studio tier: same limits (25 total)
ASSET_LIMITS_STUDIO: Dict[MediaAssetType, int] = ASSET_LIMITS_PRO.copy()


def get_asset_limits(tier: str) -> Dict[MediaAssetType, int]:
    """Get asset limits based on subscription tier."""
    if tier in ALLOWED_TIERS:
        return ASSET_LIMITS_STUDIO if tier == "studio" else ASSET_LIMITS_PRO
    # Free tier has no access
    return {k: 0 for k in MEDIA_ASSET_TYPES}


def can_access_media_library(tier: str) -> bool:
    """Check if user tier can access the media library."""
    return tier in ALLOWED_TIERS
