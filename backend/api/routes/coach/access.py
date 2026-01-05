"""
Coach access and tips endpoints.

GET /tips - Static tips for all tiers
GET /access - Check user's coach access level
"""

from fastapi import APIRouter, Depends, Query

from backend.api.middleware.auth import get_current_user
from backend.api.schemas.coach import (
    TipsResponse,
    PromptTipResponse,
    CoachAccessResponse,
)
from backend.api.service_dependencies import TipsServiceDep, UsageLimitServiceDep
from backend.services.jwt_service import TokenPayload
from backend.services.rate_limit import get_coach_rate_limit_status

from ._helpers import get_tier_access, check_usage


router = APIRouter()


@router.get("/tips", response_model=TipsResponse, summary="Get prompt tips")
async def get_tips(
    asset_type: str = Query("twitch_emote", description="Asset type"),
    current_user: TokenPayload = Depends(get_current_user),
    tips_service: TipsServiceDep = None,
) -> TipsResponse:
    """Get static prompt tips for an asset type. Available to all tiers."""
    response = tips_service.format_tips_response(asset_type)
    
    return TipsResponse(
        feature="tips_only",
        tips=[
            PromptTipResponse(
                id=tip["id"],
                title=tip["title"],
                description=tip["description"],
                example=tip["example"],
            )
            for tip in response["tips"]
        ],
        upgrade_cta=response["upgrade_cta"],
    )


@router.get("/access", response_model=CoachAccessResponse, summary="Check coach access")
async def check_access(
    current_user: TokenPayload = Depends(get_current_user),
    usage_service: UsageLimitServiceDep = None,
) -> CoachAccessResponse:
    """Check what coach features the user can access based on tier and usage."""
    tier = current_user.tier or "free"
    access = get_tier_access(tier)
    usage_info = await check_usage(current_user.sub, tier, usage_service)
    
    # Get rate limits if user can use coach
    rate_limits = None
    if usage_info["can_use"]:
        rate_limits = await get_coach_rate_limit_status(current_user.sub, tier)
    
    has_access = usage_info["can_use"]
    
    # Build upgrade message
    upgrade_message = None
    if not has_access:
        if usage_info["is_free_tier"]:
            upgrade_message = f"You've used your {usage_info['limit']} Coach session this month. Upgrade to Pro for 50 creations/month!"
        else:
            upgrade_message = f"You've used all {usage_info['limit']} creations this month. Usage resets at the start of next month."
    elif usage_info["is_free_tier"] and usage_info["remaining"] > 0:
        upgrade_message = f"You have {usage_info['remaining']} Coach session remaining this month. Upgrade to Pro for 50 creations/month!"
    
    return CoachAccessResponse(
        has_access=has_access,
        feature="full_coach" if has_access else "tips_only",
        grounding=access["grounding"],
        upgrade_message=upgrade_message,
        rate_limits=rate_limits,
        trial_available=usage_info["is_free_tier"] and usage_info["can_use"],
        trial_used=usage_info["is_free_tier"] and not usage_info["can_use"],
    )


__all__ = ["router"]
