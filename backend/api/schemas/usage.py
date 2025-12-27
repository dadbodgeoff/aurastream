"""
Pydantic schemas for usage tracking endpoints.

This module defines request/response schemas for:
- User usage statistics
- Tier limits and quotas
- Coach session tracking
"""

from typing import Optional, Literal
from pydantic import BaseModel, Field


class TierLimits(BaseModel):
    """Limits for a subscription tier."""
    generations_limit: int = Field(..., description="Monthly generation limit (-1 for unlimited)")
    generations_used: int = Field(..., description="Generations used this period")
    generations_remaining: int = Field(..., description="Generations remaining (-1 for unlimited)")
    coach_messages_per_session: int = Field(..., description="Max messages per coach session")
    coach_sessions_available: bool = Field(..., description="Whether coach is available")
    coach_trial_available: bool = Field(False, description="Whether free trial is available")
    coach_trial_used: bool = Field(False, description="Whether free trial has been used")


class UsageStatsResponse(BaseModel):
    """Response for user usage statistics."""
    tier: Literal['free', 'pro', 'studio'] = Field(..., description="Current subscription tier")
    tier_display: str = Field(..., description="Human-readable tier name")
    
    # Generation limits
    generations_used: int = Field(..., description="Assets generated this billing period")
    generations_limit: int = Field(..., description="Monthly generation limit (-1 for unlimited)")
    generations_remaining: int = Field(..., description="Generations remaining this period")
    generations_percentage: float = Field(..., description="Percentage of limit used (0-100)")
    
    # Coach access
    coach_available: bool = Field(..., description="Whether coach is available to user")
    coach_messages_per_session: int = Field(..., description="Max messages per coach session")
    coach_trial_available: bool = Field(False, description="Whether free trial is available")
    coach_trial_used: bool = Field(False, description="Whether free trial has been used")
    
    # Period info
    period_start: Optional[str] = Field(None, description="Current billing period start (ISO)")
    period_end: Optional[str] = Field(None, description="Current billing period end (ISO)")
    days_remaining: Optional[int] = Field(None, description="Days remaining in period")
    
    # Upgrade info
    can_upgrade: bool = Field(..., description="Whether user can upgrade")
    upgrade_benefits: list[str] = Field(default_factory=list, description="Benefits of upgrading")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "tier": "free",
                    "tier_display": "Free",
                    "generations_used": 2,
                    "generations_limit": 3,
                    "generations_remaining": 1,
                    "generations_percentage": 66.67,
                    "coach_available": True,
                    "coach_messages_per_session": 10,
                    "coach_trial_available": True,
                    "coach_trial_used": False,
                    "period_start": None,
                    "period_end": None,
                    "days_remaining": None,
                    "can_upgrade": True,
                    "upgrade_benefits": [
                        "50 generations per month",
                        "Unlimited coach sessions",
                        "Priority support"
                    ]
                }
            ]
        }
    }
