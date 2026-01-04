"""
Usage Limits API Routes.

Endpoints for checking and displaying usage limits.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from backend.api.middleware.auth import get_current_user
from backend.services.jwt_service import TokenPayload
from backend.api.service_dependencies import UsageLimitServiceDep


router = APIRouter()


# =============================================================================
# Response Models
# =============================================================================

class FeatureUsageResponse(BaseModel):
    """Usage stats for a single feature."""
    used: int
    limit: int
    remaining: int
    unlimited: bool = False


class UsageStatusResponse(BaseModel):
    """Complete usage status response."""
    tier: str
    vibe_branding: FeatureUsageResponse
    aura_lab: FeatureUsageResponse
    coach: FeatureUsageResponse
    creations: FeatureUsageResponse
    profile_creator: FeatureUsageResponse
    resets_at: Optional[str] = None


class UsageCheckResponse(BaseModel):
    """Response for checking a specific feature."""
    can_use: bool
    used: int
    limit: int
    remaining: int
    tier: str
    resets_at: Optional[str] = None
    upgrade_message: Optional[str] = None


# =============================================================================
# Endpoints
# =============================================================================

@router.get(
    "/status",
    response_model=UsageStatusResponse,
    summary="Get usage status",
    description="""
    Get complete monthly usage status for the current user.
    
    **Returns:**
    - tier: User's subscription tier (free, pro, studio)
    - vibe_branding: Vibe Branding usage (used/limit/remaining)
    - aura_lab: Aura Lab fusion usage
    - coach: Coach session usage
    - creations: Asset creation usage
    - resets_at: When usage counters reset (start of next month)
    
    **Tier Limits:**
    - Free: 1 vibe, 2 aura lab, 1 coach, 3 creations
    - Pro: 10 vibe, 25 aura lab, unlimited coach, 50 creations
    """,
)
async def get_usage_status(
    current_user: TokenPayload = Depends(get_current_user),
    service: UsageLimitServiceDep = None,
) -> UsageStatusResponse:
    """Get complete usage status for the current user."""
    status = await service.get_status(current_user.sub)
    
    return UsageStatusResponse(
        tier=status.tier,
        vibe_branding=FeatureUsageResponse(
            used=status.vibe_branding.used,
            limit=status.vibe_branding.limit,
            remaining=status.vibe_branding.remaining,
            unlimited=status.vibe_branding.limit == -1,
        ),
        aura_lab=FeatureUsageResponse(
            used=status.aura_lab.used,
            limit=status.aura_lab.limit,
            remaining=status.aura_lab.remaining,
            unlimited=status.aura_lab.limit == -1,
        ),
        coach=FeatureUsageResponse(
            used=status.coach.used,
            limit=status.coach.limit,
            remaining=status.coach.remaining,
            unlimited=status.coach.limit == -1,
        ),
        creations=FeatureUsageResponse(
            used=status.creations.used,
            limit=status.creations.limit,
            remaining=status.creations.remaining,
            unlimited=status.creations.limit == -1,
        ),
        profile_creator=FeatureUsageResponse(
            used=status.profile_creator.used,
            limit=status.profile_creator.limit,
            remaining=status.profile_creator.remaining,
            unlimited=status.profile_creator.limit == -1,
        ),
        resets_at=status.resets_at.isoformat() if status.resets_at else None,
    )


@router.get(
    "/check/{feature}",
    response_model=UsageCheckResponse,
    summary="Check feature usage",
    description="""
    Check if user can use a specific feature.
    
    **Features:**
    - vibe_branding: Vibe Branding analysis
    - aura_lab: Aura Lab fusion
    - coach: Coach session
    - creations: Asset creation
    
    **Returns:**
    - can_use: Whether user can use the feature
    - used/limit/remaining: Usage stats
    - upgrade_message: Message if limit reached
    """,
)
async def check_feature_usage(
    feature: str,
    current_user: TokenPayload = Depends(get_current_user),
    service: UsageLimitServiceDep = None,
) -> UsageCheckResponse:
    """Check if user can use a specific feature."""
    valid_features = ["vibe_branding", "aura_lab", "coach", "creations", "profile_creator"]
    if feature not in valid_features:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid feature. Must be one of: {', '.join(valid_features)}",
        )
    
    check = await service.check_limit(current_user.sub, feature)
    
    # Build upgrade message if limit reached
    upgrade_message = None
    if not check.can_use:
        feature_names = {
            "vibe_branding": "Vibe Branding analyses",
            "aura_lab": "Aura Lab fusions",
            "coach": "Coach sessions",
            "creations": "asset creations",
            "profile_creator": "profile picture/logo creations",
        }
        feature_name = feature_names.get(feature, feature)
        
        if check.tier == "free":
            upgrade_message = (
                f"You've used all {check.limit} {feature_name} this month. "
                "Upgrade to Pro for more!"
            )
        else:
            upgrade_message = (
                f"You've reached your monthly limit of {check.limit} {feature_name}. "
                "Your usage resets at the start of next month."
            )
    
    return UsageCheckResponse(
        can_use=check.can_use,
        used=check.used,
        limit=check.limit,
        remaining=check.remaining,
        tier=check.tier,
        resets_at=check.resets_at.isoformat() if check.resets_at else None,
        upgrade_message=upgrade_message,
    )
