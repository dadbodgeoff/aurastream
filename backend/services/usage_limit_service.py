"""
Monthly Usage Limit Service.

Manages feature usage limits for Free and Pro tiers.

Free Tier (monthly):
- 1 Vibe Branding
- 2 Aura Lab fusions  
- 1 Coach session
- 3 Asset creations (templates or custom prompts)

Pro Tier (monthly):
- 10 Vibe Branding
- 25 Aura Lab fusions
- 50 Asset creations (includes coach, templates, custom prompts)
- Coach sessions count toward creations limit
"""

from typing import Optional, Literal
from dataclasses import dataclass
from datetime import datetime

from backend.database.supabase_client import get_supabase_client


FeatureType = Literal["vibe_branding", "aura_lab", "coach", "creations", "profile_creator"]


# Tier limits (mirrored from SQL for reference)
TIER_LIMITS = {
    "free": {
        "vibe_branding": 1,
        "aura_lab": 2,
        "coach": 1,
        "creations": 3,
        "profile_creator": 1,
    },
    "pro": {
        "vibe_branding": 10,
        "aura_lab": 25,
        "coach": -1,  # unlimited (counted in creations)
        "creations": 50,
        "profile_creator": 5,
    },
    "studio": {
        "vibe_branding": 10,
        "aura_lab": 25,
        "coach": -1,
        "creations": 50,
        "profile_creator": 10,
    },
}


@dataclass
class UsageCheck:
    """Result of checking usage limit."""
    can_use: bool
    used: int
    limit: int
    remaining: int
    tier: str
    resets_at: Optional[datetime] = None
    error: Optional[str] = None


@dataclass
class FeatureUsage:
    """Usage stats for a single feature."""
    used: int
    limit: int
    remaining: int


@dataclass
class UsageStatus:
    """Complete usage status for a user."""
    tier: str
    vibe_branding: FeatureUsage
    aura_lab: FeatureUsage
    coach: FeatureUsage
    creations: FeatureUsage
    profile_creator: FeatureUsage
    resets_at: Optional[datetime] = None


class UsageLimitService:
    """
    Service for managing monthly usage limits.
    
    Example:
        service = UsageLimitService()
        
        # Check if user can use a feature
        check = await service.check_limit(user_id, "vibe_branding")
        if check.can_use:
            # Allow the action
            await service.increment(user_id, "vibe_branding")
        else:
            # Show upgrade prompt
            pass
        
        # Get full status for UI
        status = await service.get_status(user_id)
    """
    
    def __init__(self, supabase_client=None):
        self._supabase = supabase_client
    
    @property
    def supabase(self):
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
    async def check_limit(self, user_id: str, feature: FeatureType) -> UsageCheck:
        """
        Check if user can use a feature.
        
        Args:
            user_id: User's ID
            feature: Feature to check
            
        Returns:
            UsageCheck with can_use status and usage info
        """
        try:
            result = self.supabase.rpc(
                "check_usage_limit",
                {"p_user_id": user_id, "p_feature": feature}
            ).execute()
            
            data = result.data
            if not data:
                return UsageCheck(
                    can_use=False,
                    used=0,
                    limit=0,
                    remaining=0,
                    tier="free",
                    error="Failed to check usage"
                )
            
            resets_at = None
            if data.get("resets_at"):
                resets_at = datetime.fromisoformat(
                    data["resets_at"].replace("Z", "+00:00")
                )
            
            return UsageCheck(
                can_use=data.get("can_use", False),
                used=data.get("used", 0),
                limit=data.get("limit", 0),
                remaining=data.get("remaining", 0),
                tier=data.get("tier", "free"),
                resets_at=resets_at,
                error=data.get("error"),
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Usage check failed: {e}")
            # Fail open for better UX, but log the error
            return UsageCheck(
                can_use=True,
                used=0,
                limit=999,
                remaining=999,
                tier="free",
                error=str(e),
            )
    
    async def increment(self, user_id: str, feature: FeatureType) -> bool:
        """
        Increment usage counter for a feature.
        
        Should be called AFTER the action succeeds.
        
        Args:
            user_id: User's ID
            feature: Feature that was used
            
        Returns:
            True if incremented successfully
        """
        try:
            result = self.supabase.rpc(
                "increment_usage",
                {"p_user_id": user_id, "p_feature": feature}
            ).execute()
            
            data = result.data
            return data.get("success", False) if data else False
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to increment usage: {e}")
            return False
    
    async def check_and_increment(
        self, 
        user_id: str, 
        feature: FeatureType
    ) -> UsageCheck:
        """
        Check limit and increment in one call.
        
        Use this when you want to reserve the usage before the action.
        
        Args:
            user_id: User's ID
            feature: Feature to use
            
        Returns:
            UsageCheck - if can_use is True, usage was incremented
        """
        check = await self.check_limit(user_id, feature)
        if check.can_use and not check.error:
            await self.increment(user_id, feature)
            check.used += 1
            check.remaining = max(0, check.remaining - 1)
        return check
    
    async def get_status(self, user_id: str) -> UsageStatus:
        """
        Get complete usage status for a user.
        
        Args:
            user_id: User's ID
            
        Returns:
            UsageStatus with all feature usage info
        """
        try:
            result = self.supabase.rpc(
                "get_usage_status",
                {"p_user_id": user_id}
            ).execute()
            
            data = result.data
            if not data or data.get("error"):
                # Return default free tier status
                return self._default_status("free")
            
            resets_at = None
            if data.get("resets_at"):
                resets_at = datetime.fromisoformat(
                    data["resets_at"].replace("Z", "+00:00")
                )
            
            return UsageStatus(
                tier=data.get("tier", "free"),
                vibe_branding=self._parse_feature(data.get("vibe_branding", {})),
                aura_lab=self._parse_feature(data.get("aura_lab", {})),
                coach=self._parse_feature(data.get("coach", {})),
                creations=self._parse_feature(data.get("creations", {})),
                profile_creator=self._parse_feature(data.get("profile_creator", {})),
                resets_at=resets_at,
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to get usage status: {e}")
            return self._default_status("free")
    
    def _parse_feature(self, data: dict) -> FeatureUsage:
        """Parse feature usage from response."""
        return FeatureUsage(
            used=data.get("used", 0),
            limit=data.get("limit", 0),
            remaining=data.get("remaining", 0),
        )
    
    def _default_status(self, tier: str) -> UsageStatus:
        """Return default status for a tier."""
        limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
        return UsageStatus(
            tier=tier,
            vibe_branding=FeatureUsage(0, limits["vibe_branding"], limits["vibe_branding"]),
            aura_lab=FeatureUsage(0, limits["aura_lab"], limits["aura_lab"]),
            coach=FeatureUsage(0, limits["coach"], limits["coach"]),
            creations=FeatureUsage(0, limits["creations"], limits["creations"]),
            profile_creator=FeatureUsage(0, limits["profile_creator"], limits["profile_creator"]),
        )
    
    def get_limits_for_tier(self, tier: str) -> dict:
        """Get the limits for a specific tier."""
        return TIER_LIMITS.get(tier, TIER_LIMITS["free"])


# Singleton
_usage_service: Optional[UsageLimitService] = None


def get_usage_limit_service() -> UsageLimitService:
    """Get or create the usage limit service singleton."""
    global _usage_service
    if _usage_service is None:
        _usage_service = UsageLimitService()
    return _usage_service
