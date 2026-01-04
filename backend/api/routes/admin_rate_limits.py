"""
Admin Rate Limits API Routes.

Provides endpoints for viewing and managing rate limit configurations.
Requires admin authentication.

Routes:
- GET /admin/rate-limits - Get all rate limit configurations
- GET /admin/rate-limits/tiers - Get limits by tier
- GET /admin/rate-limits/categories - Get limits by category
- GET /admin/rate-limits/usage/{user_id} - Get user's current usage
- PUT /admin/rate-limits/{limit_key} - Update a limit value
- POST /admin/rate-limits/reset/{user_id}/{limit_key} - Reset a user's limit
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field

from backend.api.middleware.auth import get_current_user
from backend.services.jwt_service import TokenPayload
from backend.services.rate_limit import (
    get_rate_limit_service,
    RATE_LIMITS,
)
from backend.services.rate_limit.config import (
    LIMIT_CONFIGS,
    LimitConfig,
    LimitType,
    get_limit,
    get_all_limits_for_tier,
    get_limits_by_category,
    get_all_categories,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/rate-limits", tags=["Admin - Rate Limits"])


# =============================================================================
# SCHEMAS
# =============================================================================

class LimitConfigResponse(BaseModel):
    """Response schema for a single limit configuration."""
    key: str
    display_name: str
    description: str
    limit_type: str
    category: str
    free_limit: int
    pro_limit: int
    studio_limit: int
    unlimited_limit: int


class AllLimitsResponse(BaseModel):
    """Response schema for all limit configurations."""
    limits: List[LimitConfigResponse]
    categories: List[str]
    tiers: List[str] = ["free", "pro", "studio", "unlimited"]


class TierLimitsResponse(BaseModel):
    """Response schema for limits by tier."""
    tier: str
    limits: Dict[str, int]


class CategoryLimitsResponse(BaseModel):
    """Response schema for limits by category."""
    category: str
    limits: List[LimitConfigResponse]


class UsageItemResponse(BaseModel):
    """Response schema for a single usage item."""
    limit_key: str
    display_name: str
    category: str
    limit_type: str
    allowed: bool
    limit: int
    used: int
    remaining: int
    retry_after: Optional[int] = None
    resets_at: Optional[str] = None


class UserUsageResponse(BaseModel):
    """Response schema for user's usage."""
    user_id: str
    tier: str
    usage: List[UsageItemResponse]
    checked_at: str


class UpdateLimitRequest(BaseModel):
    """Request schema for updating a limit."""
    free_limit: Optional[int] = Field(None, ge=-1)
    pro_limit: Optional[int] = Field(None, ge=-1)
    studio_limit: Optional[int] = Field(None, ge=-1)
    unlimited_limit: Optional[int] = Field(None, ge=-1)


class UpdateLimitResponse(BaseModel):
    """Response schema for limit update."""
    success: bool
    limit_key: str
    updated_values: Dict[str, int]
    message: str


class ResetLimitResponse(BaseModel):
    """Response schema for limit reset."""
    success: bool
    user_id: str
    limit_key: str
    message: str


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def require_admin(current_user: TokenPayload) -> None:
    """Check if user has admin access."""
    tier = getattr(current_user, "tier", "free")
    # For now, studio and unlimited tiers have admin access
    # In production, you'd check a specific admin flag
    if tier not in ("studio", "unlimited"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )


def config_to_response(config: LimitConfig) -> LimitConfigResponse:
    """Convert LimitConfig to response schema."""
    return LimitConfigResponse(
        key=config.key,
        display_name=config.display_name,
        description=config.description,
        limit_type=config.limit_type.value,
        category=config.category,
        free_limit=config.free_limit,
        pro_limit=config.pro_limit,
        studio_limit=config.studio_limit,
        unlimited_limit=config.unlimited_limit,
    )


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("", response_model=AllLimitsResponse)
async def get_all_limits(
    current_user: TokenPayload = Depends(get_current_user),
) -> AllLimitsResponse:
    """
    Get all rate limit configurations.
    
    Returns all defined limits with their values for each tier.
    Requires admin access.
    """
    require_admin(current_user)
    
    limits = [config_to_response(config) for config in LIMIT_CONFIGS.values()]
    categories = get_all_categories()
    
    return AllLimitsResponse(
        limits=limits,
        categories=sorted(categories),
    )


@router.get("/tiers/{tier}", response_model=TierLimitsResponse)
async def get_tier_limits(
    tier: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> TierLimitsResponse:
    """
    Get all limits for a specific tier.
    
    Args:
        tier: Tier name (free, pro, studio, unlimited)
    """
    require_admin(current_user)
    
    if tier not in ("free", "pro", "studio", "unlimited"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid tier: {tier}"
        )
    
    limits = get_all_limits_for_tier(tier)
    
    return TierLimitsResponse(
        tier=tier,
        limits=limits,
    )


@router.get("/categories/{category}", response_model=CategoryLimitsResponse)
async def get_category_limits(
    category: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> CategoryLimitsResponse:
    """
    Get all limits in a specific category.
    
    Args:
        category: Category name (auth, generation, coach, etc.)
    """
    require_admin(current_user)
    
    category_configs = get_limits_by_category(category)
    
    if not category_configs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category not found: {category}"
        )
    
    limits = [config_to_response(config) for config in category_configs.values()]
    
    return CategoryLimitsResponse(
        category=category,
        limits=limits,
    )


@router.get("/usage/{user_id}", response_model=UserUsageResponse)
async def get_user_usage(
    user_id: str,
    tier: str = Query("free", description="User's tier for limit calculation"),
    current_user: TokenPayload = Depends(get_current_user),
) -> UserUsageResponse:
    """
    Get current usage for a specific user.
    
    Shows how much of each limit the user has consumed.
    
    Args:
        user_id: User ID to check
        tier: User's subscription tier
    """
    require_admin(current_user)
    
    service = get_rate_limit_service()
    usage_results = await service.get_usage(user_id, tier)
    
    usage_items = []
    for limit_key, result in usage_results.items():
        config = LIMIT_CONFIGS.get(limit_key)
        if config:
            usage_items.append(UsageItemResponse(
                limit_key=limit_key,
                display_name=config.display_name,
                category=config.category,
                limit_type=config.limit_type.value,
                allowed=result.allowed,
                limit=result.limit,
                used=result.used,
                remaining=result.remaining,
                retry_after=result.retry_after,
                resets_at=result.resets_at.isoformat() if result.resets_at else None,
            ))
    
    return UserUsageResponse(
        user_id=user_id,
        tier=tier,
        usage=usage_items,
        checked_at=datetime.utcnow().isoformat(),
    )


@router.put("/{limit_key}", response_model=UpdateLimitResponse)
async def update_limit(
    limit_key: str,
    data: UpdateLimitRequest,
    current_user: TokenPayload = Depends(get_current_user),
) -> UpdateLimitResponse:
    """
    Update a rate limit configuration.
    
    Updates the limit values for one or more tiers.
    Changes take effect immediately.
    
    Args:
        limit_key: The limit to update
        data: New limit values (only provided values are updated)
    """
    require_admin(current_user)
    
    if limit_key not in LIMIT_CONFIGS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Limit not found: {limit_key}"
        )
    
    config = LIMIT_CONFIGS[limit_key]
    updated = {}
    
    # Update provided values
    if data.free_limit is not None:
        config.free_limit = data.free_limit
        updated["free"] = data.free_limit
    
    if data.pro_limit is not None:
        config.pro_limit = data.pro_limit
        updated["pro"] = data.pro_limit
    
    if data.studio_limit is not None:
        config.studio_limit = data.studio_limit
        updated["studio"] = data.studio_limit
    
    if data.unlimited_limit is not None:
        config.unlimited_limit = data.unlimited_limit
        updated["unlimited"] = data.unlimited_limit
    
    # Log the change
    logger.info(
        f"Rate limit updated: {limit_key}",
        extra={
            "limit_key": limit_key,
            "updated_by": current_user.sub,
            "changes": updated,
        }
    )
    
    return UpdateLimitResponse(
        success=True,
        limit_key=limit_key,
        updated_values=updated,
        message=f"Updated {len(updated)} tier(s) for {limit_key}",
    )


@router.post("/reset/{user_id}/{limit_key}", response_model=ResetLimitResponse)
async def reset_user_limit(
    user_id: str,
    limit_key: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> ResetLimitResponse:
    """
    Reset a rate limit for a specific user.
    
    Clears the usage counter, allowing the user to use the feature again.
    Useful for customer support scenarios.
    
    Args:
        user_id: User ID to reset
        limit_key: The limit to reset
    """
    require_admin(current_user)
    
    if limit_key not in LIMIT_CONFIGS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Limit not found: {limit_key}"
        )
    
    service = get_rate_limit_service()
    success = await service.reset(limit_key, user_id)
    
    if success:
        logger.info(
            f"Rate limit reset: {limit_key} for user {user_id}",
            extra={
                "limit_key": limit_key,
                "user_id": user_id,
                "reset_by": current_user.sub,
            }
        )
    
    return ResetLimitResponse(
        success=success,
        user_id=user_id,
        limit_key=limit_key,
        message=f"Reset {limit_key} for user {user_id}" if success else "Reset failed",
    )


@router.post("/reset/{user_id}", response_model=Dict[str, Any])
async def reset_all_user_limits(
    user_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Reset ALL rate limits for a specific user.
    
    Nuclear option - clears all usage counters for the user.
    
    Args:
        user_id: User ID to reset
    """
    require_admin(current_user)
    
    service = get_rate_limit_service()
    reset_count = 0
    
    for limit_key in LIMIT_CONFIGS:
        if await service.reset(limit_key, user_id):
            reset_count += 1
    
    logger.info(
        f"All rate limits reset for user {user_id}",
        extra={
            "user_id": user_id,
            "reset_by": current_user.sub,
            "reset_count": reset_count,
        }
    )
    
    return {
        "success": True,
        "user_id": user_id,
        "limits_reset": reset_count,
        "message": f"Reset {reset_count} limits for user {user_id}",
    }


__all__ = ["router"]
