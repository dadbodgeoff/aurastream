"""
Unified Rate Limit Configuration for AuraStream.

All rate limits are defined here in one place for easy management.
The admin dashboard reads and writes to this configuration.

Limit Types:
- per_minute: Requests per minute (sliding window)
- per_hour: Requests per hour (sliding window)
- per_day: Requests per day (sliding window)
- monthly: Monthly quota (resets on 1st of month)
- total: Absolute maximum (storage limits)
"""

from typing import Literal, Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum


class LimitType(str, Enum):
    """Types of rate limits."""
    PER_MINUTE = "per_minute"
    PER_HOUR = "per_hour"
    PER_DAY = "per_day"
    MONTHLY = "monthly"
    TOTAL = "total"


@dataclass
class LimitConfig:
    """Configuration for a single rate limit."""
    key: str
    display_name: str
    description: str
    limit_type: LimitType
    category: str  # auth, generation, coach, storage, etc.
    free_limit: int
    pro_limit: int
    studio_limit: int
    unlimited_limit: int = -1  # -1 means unlimited


# =============================================================================
# MASTER RATE LIMIT CONFIGURATION
# =============================================================================

LIMIT_CONFIGS: Dict[str, LimitConfig] = {
    # =========================================================================
    # AUTHENTICATION (High Security)
    # =========================================================================
    "login_attempts": LimitConfig(
        key="login_attempts",
        display_name="Login Attempts",
        description="Failed login attempts per email",
        limit_type=LimitType.PER_HOUR,
        category="auth",
        free_limit=5,
        pro_limit=5,
        studio_limit=5,
    ),
    "signup_attempts": LimitConfig(
        key="signup_attempts",
        display_name="Signup Attempts",
        description="Signup attempts per IP address",
        limit_type=LimitType.PER_HOUR,
        category="auth",
        free_limit=10,
        pro_limit=10,
        studio_limit=10,
    ),
    "password_reset_requests": LimitConfig(
        key="password_reset_requests",
        display_name="Password Reset Requests",
        description="Password reset requests per email",
        limit_type=LimitType.PER_HOUR,
        category="auth",
        free_limit=3,
        pro_limit=3,
        studio_limit=3,
    ),
    "token_refresh": LimitConfig(
        key="token_refresh",
        display_name="Token Refresh",
        description="Token refresh requests per user",
        limit_type=LimitType.PER_MINUTE,
        category="auth",
        free_limit=30,
        pro_limit=30,
        studio_limit=30,
    ),
    
    # =========================================================================
    # GLOBAL API
    # =========================================================================
    "api_requests": LimitConfig(
        key="api_requests",
        display_name="API Requests",
        description="Total API requests per minute",
        limit_type=LimitType.PER_MINUTE,
        category="api",
        free_limit=60,
        pro_limit=240,
        studio_limit=500,
    ),
    
    # =========================================================================
    # ASSET GENERATION (Cost-Intensive)
    # =========================================================================
    "monthly_creations": LimitConfig(
        key="monthly_creations",
        display_name="Monthly Creations",
        description="Total asset creations per month",
        limit_type=LimitType.MONTHLY,
        category="generation",
        free_limit=3,
        pro_limit=50,
        studio_limit=100,
    ),
    "monthly_refinements": LimitConfig(
        key="monthly_refinements",
        display_name="Monthly Refinements",
        description="Asset refinements per month (Pro+ only)",
        limit_type=LimitType.MONTHLY,
        category="generation",
        free_limit=0,
        pro_limit=5,
        studio_limit=-1,  # unlimited
    ),
    "concurrent_generations": LimitConfig(
        key="concurrent_generations",
        display_name="Concurrent Generations",
        description="Simultaneous generation jobs",
        limit_type=LimitType.TOTAL,
        category="generation",
        free_limit=1,
        pro_limit=3,
        studio_limit=5,
    ),
    
    # =========================================================================
    # COACH (AI-Intensive)
    # =========================================================================
    "monthly_coach_sessions": LimitConfig(
        key="monthly_coach_sessions",
        display_name="Monthly Coach Sessions",
        description="Coach sessions per month",
        limit_type=LimitType.MONTHLY,
        category="coach",
        free_limit=1,
        pro_limit=-1,  # unlimited
        studio_limit=-1,
    ),
    "coach_messages_per_minute": LimitConfig(
        key="coach_messages_per_minute",
        display_name="Coach Messages/Min",
        description="Messages to coach per minute",
        limit_type=LimitType.PER_MINUTE,
        category="coach",
        free_limit=10,
        pro_limit=30,
        studio_limit=50,
    ),
    "coach_sessions_per_hour": LimitConfig(
        key="coach_sessions_per_hour",
        display_name="Coach Sessions/Hour",
        description="New coach sessions per hour",
        limit_type=LimitType.PER_HOUR,
        category="coach",
        free_limit=2,
        pro_limit=10,
        studio_limit=20,
    ),
    
    # =========================================================================
    # VIBE BRANDING (AI Vision)
    # =========================================================================
    "monthly_vibe_branding": LimitConfig(
        key="monthly_vibe_branding",
        display_name="Monthly Vibe Analyses",
        description="Vibe branding analyses per month",
        limit_type=LimitType.MONTHLY,
        category="vibe_branding",
        free_limit=1,
        pro_limit=10,
        studio_limit=25,
    ),
    
    # =========================================================================
    # AURA LAB (AI Fusion)
    # =========================================================================
    "monthly_aura_lab": LimitConfig(
        key="monthly_aura_lab",
        display_name="Monthly Aura Lab Fusions",
        description="Aura Lab fusions per month",
        limit_type=LimitType.MONTHLY,
        category="aura_lab",
        free_limit=2,
        pro_limit=25,
        studio_limit=50,
    ),
    "aura_lab_subjects_per_day": LimitConfig(
        key="aura_lab_subjects_per_day",
        display_name="Subject Uploads/Day",
        description="Subject image uploads per day",
        limit_type=LimitType.PER_DAY,
        category="aura_lab",
        free_limit=5,
        pro_limit=20,
        studio_limit=50,
    ),
    
    # =========================================================================
    # PROFILE CREATOR
    # =========================================================================
    "monthly_profile_creator": LimitConfig(
        key="monthly_profile_creator",
        display_name="Monthly Profile Creations",
        description="Profile/logo creations per month",
        limit_type=LimitType.MONTHLY,
        category="profile_creator",
        free_limit=1,
        pro_limit=5,
        studio_limit=10,
    ),
    
    # =========================================================================
    # TWITCH INTEGRATION
    # =========================================================================
    "monthly_twitch_packs": LimitConfig(
        key="monthly_twitch_packs",
        display_name="Monthly Twitch Packs",
        description="Twitch asset packs per month",
        limit_type=LimitType.MONTHLY,
        category="twitch",
        free_limit=1,
        pro_limit=5,
        studio_limit=10,
    ),
    
    # =========================================================================
    # LOGO GENERATION
    # =========================================================================
    "logo_previews_per_hour": LimitConfig(
        key="logo_previews_per_hour",
        display_name="Logo Previews/Hour",
        description="Logo prompt previews per hour",
        limit_type=LimitType.PER_HOUR,
        category="logo",
        free_limit=20,
        pro_limit=100,
        studio_limit=200,
    ),
    
    # =========================================================================
    # THUMBNAIL RECREATION
    # =========================================================================
    "face_assets": LimitConfig(
        key="face_assets",
        display_name="Saved Face Assets",
        description="Maximum saved face images",
        limit_type=LimitType.TOTAL,
        category="thumbnail",
        free_limit=5,
        pro_limit=20,
        studio_limit=50,
    ),
    
    # =========================================================================
    # STORAGE LIMITS
    # =========================================================================
    "max_brand_kits": LimitConfig(
        key="max_brand_kits",
        display_name="Brand Kits",
        description="Maximum brand kits",
        limit_type=LimitType.TOTAL,
        category="storage",
        free_limit=3,
        pro_limit=10,
        studio_limit=25,
    ),
    "max_logos_per_kit": LimitConfig(
        key="max_logos_per_kit",
        display_name="Logos per Kit",
        description="Maximum logos per brand kit",
        limit_type=LimitType.TOTAL,
        category="storage",
        free_limit=5,
        pro_limit=20,
        studio_limit=50,
    ),
    "max_media_assets": LimitConfig(
        key="max_media_assets",
        display_name="Media Library Assets",
        description="Maximum media library items",
        limit_type=LimitType.TOTAL,
        category="storage",
        free_limit=50,
        pro_limit=500,
        studio_limit=2000,
    ),
    
    # =========================================================================
    # INTEL FEATURES
    # =========================================================================
    "intel_requests_per_hour": LimitConfig(
        key="intel_requests_per_hour",
        display_name="Intel Requests/Hour",
        description="Intel API requests per hour",
        limit_type=LimitType.PER_HOUR,
        category="intel",
        free_limit=100,
        pro_limit=500,
        studio_limit=1000,
    ),
    "thumbnail_intel_per_hour": LimitConfig(
        key="thumbnail_intel_per_hour",
        display_name="Thumbnail Intel/Hour",
        description="Thumbnail analysis requests per hour",
        limit_type=LimitType.PER_HOUR,
        category="intel",
        free_limit=50,
        pro_limit=200,
        studio_limit=500,
    ),
    
    # =========================================================================
    # PROMO CHAT
    # =========================================================================
    "promo_checkouts_per_hour": LimitConfig(
        key="promo_checkouts_per_hour",
        display_name="Promo Checkouts/Hour",
        description="Promo checkout sessions per hour",
        limit_type=LimitType.PER_HOUR,
        category="promo",
        free_limit=10,
        pro_limit=10,
        studio_limit=10,
    ),
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_limit(key: str, tier: str) -> int:
    """
    Get the limit value for a specific key and tier.
    
    Args:
        key: Limit key (e.g., "monthly_creations")
        tier: User tier (free, pro, studio, unlimited)
        
    Returns:
        Limit value (-1 for unlimited)
    """
    config = LIMIT_CONFIGS.get(key)
    if not config:
        return -1  # Unknown limit = unlimited
    
    tier_map = {
        "free": config.free_limit,
        "pro": config.pro_limit,
        "studio": config.studio_limit,
        "unlimited": config.unlimited_limit,
    }
    
    return tier_map.get(tier, config.free_limit)


def get_all_limits_for_tier(tier: str) -> Dict[str, int]:
    """
    Get all limits for a specific tier.
    
    Args:
        tier: User tier
        
    Returns:
        Dictionary of limit_key -> limit_value
    """
    return {key: get_limit(key, tier) for key in LIMIT_CONFIGS}


def get_limits_by_category(category: str) -> Dict[str, LimitConfig]:
    """
    Get all limits in a specific category.
    
    Args:
        category: Category name (auth, generation, coach, etc.)
        
    Returns:
        Dictionary of limit_key -> LimitConfig
    """
    return {
        key: config 
        for key, config in LIMIT_CONFIGS.items() 
        if config.category == category
    }


def get_all_categories() -> list[str]:
    """Get all unique categories."""
    return list(set(config.category for config in LIMIT_CONFIGS.values()))


def get_window_seconds(limit_type: LimitType) -> int:
    """
    Get the window duration in seconds for a limit type.
    
    Args:
        limit_type: Type of limit
        
    Returns:
        Window duration in seconds
    """
    windows = {
        LimitType.PER_MINUTE: 60,
        LimitType.PER_HOUR: 3600,
        LimitType.PER_DAY: 86400,
        LimitType.MONTHLY: 2592000,  # 30 days
        LimitType.TOTAL: 0,  # No window for totals
    }
    return windows.get(limit_type, 60)


# =============================================================================
# RATE LIMITS DICT (Legacy compatibility)
# =============================================================================

# Build the legacy RATE_LIMITS dict for backward compatibility
RATE_LIMITS = {
    "free": get_all_limits_for_tier("free"),
    "pro": get_all_limits_for_tier("pro"),
    "studio": get_all_limits_for_tier("studio"),
    "unlimited": get_all_limits_for_tier("unlimited"),
}
