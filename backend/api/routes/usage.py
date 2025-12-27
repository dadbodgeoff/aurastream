"""
Usage tracking route handlers for Aurastream.

This module implements usage statistics endpoints:
- GET /usage - Get current usage stats and limits

Provides tier-aware usage information for the frontend
to display quotas and limits to users.
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends

from backend.api.middleware.auth import get_current_user
from backend.api.schemas.usage import UsageStatsResponse
from backend.services.jwt_service import TokenPayload
from backend.database.supabase_client import get_supabase_client


router = APIRouter()


# =============================================================================
# Tier Configuration
# =============================================================================

TIER_CONFIG = {
    "free": {
        "display": "Free",
        "generations_limit": 3,  # 3 free generations total + 1 coach trial
        "coach_messages_per_session": 10,
        "coach_available": False,  # Only via trial
        "upgrade_benefits": [
            "50 generations per month",
            "Full Prompt Coach access",
            "Priority generation queue",
            "Advanced brand kit features"
        ]
    },
    "pro": {
        "display": "Pro",
        "generations_limit": 50,  # 50 per month
        "coach_messages_per_session": 10,
        "coach_available": True,  # Full coach access
        "upgrade_benefits": [
            "Unlimited generations",
            "Game context grounding",
            "Priority support",
            "Custom brand guidelines"
        ]
    },
    "studio": {
        "display": "Studio",
        "generations_limit": -1,  # Unlimited
        "coach_messages_per_session": 10,
        "coach_available": True,
        "upgrade_benefits": []  # Already at top tier
    }
}


# =============================================================================
# Usage Endpoint
# =============================================================================

@router.get(
    "",
    response_model=UsageStatsResponse,
    summary="Get usage statistics",
    description="""
    Get current usage statistics and limits for the authenticated user.
    
    **Returns:**
    - Current tier and display name
    - Generations used/remaining this period
    - Coach access status and trial info
    - Billing period info (for paid tiers)
    - Upgrade benefits (for non-studio tiers)
    
    **Tier Limits:**
    - Free: 3 generations total + 1 coach trial
    - Pro: 50 generations/month + 1 coach trial
    - Studio: Unlimited generations + full coach access
    """,
    responses={
        200: {"description": "Usage stats retrieved successfully"},
        401: {"description": "Authentication required"},
    },
)
async def get_usage_stats(
    current_user: TokenPayload = Depends(get_current_user),
) -> UsageStatsResponse:
    """
    Get current usage statistics for the authenticated user.
    
    Retrieves the user's current usage against their tier limits,
    including generation counts, coach access, and billing period info.
    """
    tier = current_user.tier or "free"
    config = TIER_CONFIG.get(tier, TIER_CONFIG["free"])
    
    # Get user data from database
    db = get_supabase_client()
    user_result = db.table("users").select(
        "assets_generated_this_month, coach_trial_used"
    ).eq("id", current_user.sub).single().execute()
    
    user_data = user_result.data or {}
    generations_used = user_data.get("assets_generated_this_month", 0)
    coach_trial_used = user_data.get("coach_trial_used", False) or False
    
    # Get subscription data for paid tiers (optional - may not exist)
    period_start = None
    period_end = None
    days_remaining = None
    
    if tier in ("pro", "studio"):
        try:
            sub_result = db.table("subscriptions").select(
                "current_period_start, current_period_end"
            ).eq("user_id", current_user.sub).single().execute()
            
            if sub_result.data:
                sub_data = sub_result.data
                period_start = sub_data.get("current_period_start")
                period_end = sub_data.get("current_period_end")
                
                # Calculate days remaining
                if period_end:
                    try:
                        end_date = datetime.fromisoformat(period_end.replace("Z", "+00:00"))
                        now = datetime.now(end_date.tzinfo)
                        days_remaining = max(0, (end_date - now).days)
                    except (ValueError, TypeError):
                        pass
        except Exception:
            # Subscription record may not exist, that's okay
            pass
    
    # Calculate remaining and percentage
    limit = config["generations_limit"]
    if limit == -1:
        remaining = -1
        percentage = 0.0
    else:
        remaining = max(0, limit - generations_used)
        percentage = min(100.0, (generations_used / limit) * 100) if limit > 0 else 0.0
    
    # Determine coach availability
    coach_available = config["coach_available"]
    coach_trial_available = not coach_available and not coach_trial_used
    
    # If trial is available, coach is effectively available
    effective_coach_available = coach_available or coach_trial_available
    
    return UsageStatsResponse(
        tier=tier,
        tier_display=config["display"],
        generations_used=generations_used,
        generations_limit=limit,
        generations_remaining=remaining,
        generations_percentage=round(percentage, 2),
        coach_available=effective_coach_available,
        coach_messages_per_session=config["coach_messages_per_session"],
        coach_trial_available=coach_trial_available,
        coach_trial_used=coach_trial_used,
        period_start=period_start,
        period_end=period_end,
        days_remaining=days_remaining,
        can_upgrade=tier != "studio",
        upgrade_benefits=config["upgrade_benefits"],
    )
