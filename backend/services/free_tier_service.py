"""
Free Tier Usage Service.

Manages premium feature access for free tier users.
Free users get 1 use of each premium feature every 28 days:
- Coach (Prompt Coach)
- Aura Lab (Fusion experiments)
- Vibe Branding (Image analysis)

This allows free users to experience premium features while
encouraging upgrades for unlimited access.
"""

from typing import Optional, Literal
from dataclasses import dataclass
from datetime import datetime

from backend.database.supabase_client import get_supabase_client


# Feature types
FeatureType = Literal["coach", "aura_lab", "vibe_branding"]

# Cooldown period in days
COOLDOWN_DAYS = 28


@dataclass
class FreeTierUsage:
    """Usage status for a single feature."""
    can_use: bool
    used_at: Optional[datetime]
    next_available: Optional[datetime]
    days_remaining: int


@dataclass
class FreeTierStatus:
    """Complete free tier status for a user."""
    coach: FreeTierUsage
    aura_lab: FreeTierUsage
    vibe_branding: FreeTierUsage
    cooldown_days: int = COOLDOWN_DAYS


class FreeTierService:
    """
    Service for managing free tier premium feature usage.
    
    Free users get 1 use of each premium feature every 28 days.
    This service handles checking eligibility and marking features as used.
    
    Example:
        service = FreeTierService()
        
        # Check if user can use coach
        usage = await service.check_usage(user_id, "coach")
        if usage.can_use:
            # Allow access
            await service.mark_used(user_id, "coach")
        else:
            # Show upgrade prompt with days_remaining
            pass
    """
    
    def __init__(self, supabase_client=None):
        """
        Initialize the free tier service.
        
        Args:
            supabase_client: Optional Supabase client (uses singleton if not provided)
        """
        self._supabase = supabase_client
    
    @property
    def supabase(self):
        """Lazy-load Supabase client."""
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
    async def check_usage(self, user_id: str, feature: FeatureType) -> FreeTierUsage:
        """
        Check if a free user can use a premium feature.
        
        Args:
            user_id: User's ID
            feature: Feature to check ("coach", "aura_lab", "vibe_branding")
        
        Returns:
            FreeTierUsage with can_use status and timing info
        """
        try:
            result = self.supabase.rpc(
                "check_free_tier_usage",
                {"p_user_id": user_id, "p_feature": feature}
            ).execute()
            
            data = result.data
            if not data:
                # Default to allowing use if RPC fails
                return FreeTierUsage(
                    can_use=True,
                    used_at=None,
                    next_available=None,
                    days_remaining=0
                )
            
            return FreeTierUsage(
                can_use=data.get("can_use", True),
                used_at=datetime.fromisoformat(data["used_at"].replace("Z", "+00:00")) if data.get("used_at") else None,
                next_available=datetime.fromisoformat(data["next_available"].replace("Z", "+00:00")) if data.get("next_available") else None,
                days_remaining=data.get("days_remaining", 0)
            )
        except Exception as e:
            # Log error but allow use on failure (fail open for UX)
            import logging
            logging.getLogger(__name__).warning(f"Free tier check failed: {e}")
            return FreeTierUsage(
                can_use=True,
                used_at=None,
                next_available=None,
                days_remaining=0
            )
    
    async def mark_used(self, user_id: str, feature: FeatureType) -> bool:
        """
        Mark a premium feature as used by a free user.
        
        Should be called after the user successfully uses the feature.
        
        Args:
            user_id: User's ID
            feature: Feature that was used
        
        Returns:
            True if successfully marked, False otherwise
        """
        try:
            result = self.supabase.rpc(
                "mark_free_tier_used",
                {"p_user_id": user_id, "p_feature": feature}
            ).execute()
            
            return result.data is True
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to mark free tier used: {e}")
            return False
    
    async def get_full_status(self, user_id: str) -> FreeTierStatus:
        """
        Get complete free tier usage status for a user.
        
        Args:
            user_id: User's ID
        
        Returns:
            FreeTierStatus with all feature usage info
        """
        try:
            result = self.supabase.rpc(
                "get_free_tier_status",
                {"p_user_id": user_id}
            ).execute()
            
            data = result.data
            if not data:
                # Default to all available
                return FreeTierStatus(
                    coach=FreeTierUsage(can_use=True, used_at=None, next_available=None, days_remaining=0),
                    aura_lab=FreeTierUsage(can_use=True, used_at=None, next_available=None, days_remaining=0),
                    vibe_branding=FreeTierUsage(can_use=True, used_at=None, next_available=None, days_remaining=0),
                )
            
            def parse_usage(usage_data: dict) -> FreeTierUsage:
                return FreeTierUsage(
                    can_use=usage_data.get("can_use", True),
                    used_at=datetime.fromisoformat(usage_data["used_at"].replace("Z", "+00:00")) if usage_data.get("used_at") else None,
                    next_available=datetime.fromisoformat(usage_data["next_available"].replace("Z", "+00:00")) if usage_data.get("next_available") else None,
                    days_remaining=usage_data.get("days_remaining", 0)
                )
            
            return FreeTierStatus(
                coach=parse_usage(data.get("coach", {})),
                aura_lab=parse_usage(data.get("aura_lab", {})),
                vibe_branding=parse_usage(data.get("vibe_branding", {})),
                cooldown_days=data.get("cooldown_days", COOLDOWN_DAYS)
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to get free tier status: {e}")
            # Default to all available on error
            return FreeTierStatus(
                coach=FreeTierUsage(can_use=True, used_at=None, next_available=None, days_remaining=0),
                aura_lab=FreeTierUsage(can_use=True, used_at=None, next_available=None, days_remaining=0),
                vibe_branding=FreeTierUsage(can_use=True, used_at=None, next_available=None, days_remaining=0),
            )
    
    def is_free_tier(self, tier: str) -> bool:
        """
        Check if a tier is the free tier.
        
        Args:
            tier: User's subscription tier
        
        Returns:
            True if free tier, False otherwise
        """
        return tier == "free"
    
    def has_unlimited_access(self, tier: str, feature: FeatureType) -> bool:
        """
        Check if a tier has unlimited access to a feature.
        
        Args:
            tier: User's subscription tier
            feature: Feature to check
        
        Returns:
            True if tier has unlimited access
        """
        # Pro and Studio have unlimited access to all features
        if tier in ("pro", "studio"):
            return True
        return False


# Singleton instance
_free_tier_service: Optional[FreeTierService] = None


def get_free_tier_service() -> FreeTierService:
    """Get or create the free tier service singleton."""
    global _free_tier_service
    if _free_tier_service is None:
        _free_tier_service = FreeTierService()
    return _free_tier_service
