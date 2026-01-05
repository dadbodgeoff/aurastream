"""
Core type definitions for the Coach module.

This module centralizes all type aliases, constants, and configuration
used throughout the Coach service. It provides a single source of truth
for type definitions, ensuring consistency across the codebase.

Type Aliases:
- AssetType: Valid asset types for generation
- MoodType: Mood/style selections
- StreamChunkType: SSE streaming chunk types
- SessionStatus: Coach session states
- TierType: Subscription tier types
- ValidationSeverity: Validation issue severity levels
- ConfidenceLevel: LLM confidence in answering without search

Constants:
- MAX_TURNS: Maximum conversation turns per session
- MAX_TOKENS_IN: Maximum input tokens per session
- MAX_TOKENS_OUT: Maximum output tokens per session
- SESSION_TTL_SECONDS: Session time-to-live in Redis

Configuration:
- TIER_ACCESS: Tier-based feature access mapping
"""

from typing import Literal, Dict, Any


# =============================================================================
# Type Aliases
# =============================================================================

AssetType = Literal[
    # General asset types (matching generation.py)
    "thumbnail",
    "overlay",
    "banner",
    "story_graphic",
    "clip_cover",
    # Twitch-specific asset types
    "twitch_emote",
    "twitch_badge",
    "twitch_panel",
    "twitch_offline",
    # Legacy/extended types for backwards compatibility
    "youtube_thumbnail",
    "twitch_banner",
    "tiktok_story",
    "instagram_story",
    "instagram_reel",
]

MoodType = Literal["hype", "cozy", "rage", "chill", "custom"]

StreamChunkType = Literal[
    "token",
    "intent_ready",
    "grounding",
    "grounding_complete",
    "done",
    "error",
]

SessionStatus = Literal["active", "ended", "expired"]

TierType = Literal["free", "pro", "studio", "unlimited"]

ValidationSeverity = Literal["error", "warning", "info"]

ConfidenceLevel = Literal["high", "medium", "low", "unknown"]


# =============================================================================
# Constants
# =============================================================================

# Session limits
MAX_TURNS: int = 10
"""Maximum number of conversation turns per session."""

MAX_TOKENS_IN: int = 5000
"""Maximum input tokens allowed per session."""

MAX_TOKENS_OUT: int = 2000
"""Maximum output tokens allowed per session."""

SESSION_TTL_SECONDS: int = 1800
"""Session time-to-live in seconds (30 minutes)."""

SESSION_KEY_PREFIX: str = "coach:session:"
"""Redis key prefix for coach sessions."""


# =============================================================================
# Tier Access Configuration
# =============================================================================

TIER_ACCESS: Dict[str, Dict[str, Any]] = {
    "free": {
        "coach_access": True,
        "feature": "full_coach",
        "grounding": False,
    },
    "pro": {
        "coach_access": True,
        "feature": "full_coach",
        "grounding": True,
    },
    "studio": {
        "coach_access": True,
        "feature": "full_coach",
        "grounding": True,
    },
    "unlimited": {
        "coach_access": True,
        "feature": "full_coach",
        "grounding": True,
    },
}
"""
Tier-based access configuration for Coach features.

Each tier maps to:
- coach_access: Whether the tier has access to the coach (all tiers now have access)
- feature: Feature level available ("full_coach" or "tips_only")
- grounding: Whether web search grounding is available

Access is further limited by monthly usage quotas per tier.
"""


# =============================================================================
# Helper Functions
# =============================================================================

def has_coach_access(tier: str) -> bool:
    """
    Check if a tier has coach access.
    
    Args:
        tier: User's subscription tier
        
    Returns:
        bool: True if tier has coach access
    """
    return TIER_ACCESS.get(tier, TIER_ACCESS["free"])["coach_access"]


def has_grounding_access(tier: str) -> bool:
    """
    Check if a tier has grounding (web search) access.
    
    Args:
        tier: User's subscription tier
        
    Returns:
        bool: True if tier has grounding access
    """
    return TIER_ACCESS.get(tier, TIER_ACCESS["free"])["grounding"]


def get_feature_level(tier: str) -> str:
    """
    Get the feature level for a tier.
    
    Args:
        tier: User's subscription tier
        
    Returns:
        str: Feature level ("full_coach" or "tips_only")
    """
    return TIER_ACCESS.get(tier, TIER_ACCESS["free"])["feature"]


__all__ = [
    # Type Aliases
    "AssetType",
    "MoodType",
    "StreamChunkType",
    "SessionStatus",
    "TierType",
    "ValidationSeverity",
    "ConfidenceLevel",
    # Constants
    "MAX_TURNS",
    "MAX_TOKENS_IN",
    "MAX_TOKENS_OUT",
    "SESSION_TTL_SECONDS",
    "SESSION_KEY_PREFIX",
    # Configuration
    "TIER_ACCESS",
    # Helper Functions
    "has_coach_access",
    "has_grounding_access",
    "get_feature_level",
]
