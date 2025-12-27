"""
Pydantic schemas for Stripe subscription endpoints.

This module defines request/response schemas for:
- Checkout session creation
- Customer portal access
- Subscription status queries
- Subscription cancellation

All schemas use Pydantic v2 syntax with comprehensive validation
and OpenAPI documentation.
"""

from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


# ============================================================================
# Type Definitions
# ============================================================================

SubscriptionTier = Literal["free", "pro", "studio"]
SubscriptionStatus = Literal["active", "past_due", "canceled", "none"]
PlanType = Literal["pro", "studio"]


# ============================================================================
# Request Schemas
# ============================================================================

class CheckoutRequest(BaseModel):
    """
    Request body for creating a Stripe Checkout session.
    
    Used to initiate the subscription purchase flow. The plan determines
    which Stripe Price ID will be used for the checkout session.
    """
    plan: PlanType = Field(
        ...,
        description="Subscription plan to purchase",
        examples=["pro"]
    )
    success_url: Optional[str] = Field(
        default=None,
        description="URL to redirect to after successful checkout. Defaults to dashboard.",
        examples=["https://app.aurastream.io/billing/success"]
    )
    cancel_url: Optional[str] = Field(
        default=None,
        description="URL to redirect to if checkout is cancelled. Defaults to pricing page.",
        examples=["https://app.aurastream.io/pricing"]
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "plan": "pro",
                    "success_url": "https://app.aurastream.io/billing/success",
                    "cancel_url": "https://app.aurastream.io/pricing"
                },
                {
                    "plan": "studio"
                }
            ]
        }
    )


class PortalRequest(BaseModel):
    """
    Request body for creating a Stripe Customer Portal session.
    
    The portal allows users to manage their subscription, update payment
    methods, view invoices, and cancel their subscription.
    """
    return_url: Optional[str] = Field(
        default=None,
        description="URL to redirect to when user exits the portal. Defaults to dashboard settings.",
        examples=["https://app.aurastream.io/dashboard/settings"]
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "return_url": "https://app.aurastream.io/dashboard/settings"
                },
                {}
            ]
        }
    )


# ============================================================================
# Response Schemas
# ============================================================================

class CheckoutResponse(BaseModel):
    """
    Response containing Stripe Checkout session details.
    
    The checkout_url should be used to redirect the user to Stripe's
    hosted checkout page. The session_id can be used for tracking.
    """
    checkout_url: str = Field(
        ...,
        description="URL to redirect user to Stripe Checkout",
        examples=["https://checkout.stripe.com/c/pay/cs_test_..."]
    )
    session_id: str = Field(
        ...,
        description="Stripe Checkout Session ID for tracking",
        examples=["cs_test_a1b2c3d4e5f6g7h8i9j0"]
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_a1b2c3d4e5f6g7h8i9j0",
                    "session_id": "cs_test_a1b2c3d4e5f6g7h8i9j0"
                }
            ]
        }
    )


class PortalResponse(BaseModel):
    """
    Response containing Stripe Customer Portal session URL.
    
    The portal_url should be used to redirect the user to Stripe's
    hosted customer portal for subscription management.
    """
    portal_url: str = Field(
        ...,
        description="URL to redirect user to Stripe Customer Portal",
        examples=["https://billing.stripe.com/p/session/..."]
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "portal_url": "https://billing.stripe.com/p/session/test_YWNjdF8xTjRhYWJDZA"
                }
            ]
        }
    )


class SubscriptionStatusResponse(BaseModel):
    """
    Response containing the user's current subscription status.
    
    Provides comprehensive information about the user's subscription
    including tier, status, billing period, and available actions.
    """
    has_subscription: bool = Field(
        ...,
        description="Whether the user has an active paid subscription"
    )
    tier: SubscriptionTier = Field(
        ...,
        description="Current subscription tier (free, pro, or studio)",
        examples=["pro"]
    )
    status: SubscriptionStatus = Field(
        ...,
        description="Current subscription status",
        examples=["active"]
    )
    current_period_end: Optional[datetime] = Field(
        default=None,
        description="End date of current billing period (null for free tier)",
        examples=["2024-02-15T00:00:00Z"]
    )
    cancel_at_period_end: bool = Field(
        ...,
        description="Whether subscription is set to cancel at period end"
    )
    can_upgrade: bool = Field(
        ...,
        description="Whether user can upgrade to a higher tier"
    )
    can_downgrade: bool = Field(
        ...,
        description="Whether user can downgrade to a lower tier"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "has_subscription": True,
                    "tier": "pro",
                    "status": "active",
                    "current_period_end": "2024-02-15T00:00:00Z",
                    "cancel_at_period_end": False,
                    "can_upgrade": True,
                    "can_downgrade": False
                },
                {
                    "has_subscription": False,
                    "tier": "free",
                    "status": "none",
                    "current_period_end": None,
                    "cancel_at_period_end": False,
                    "can_upgrade": True,
                    "can_downgrade": False
                },
                {
                    "has_subscription": True,
                    "tier": "studio",
                    "status": "active",
                    "current_period_end": "2024-03-01T00:00:00Z",
                    "cancel_at_period_end": True,
                    "can_upgrade": False,
                    "can_downgrade": True
                }
            ]
        }
    )


class CancelResponse(BaseModel):
    """
    Response confirming subscription cancellation.
    
    The subscription will remain active until the end of the current
    billing period, then automatically transition to the free tier.
    """
    message: str = Field(
        ...,
        description="Confirmation message describing the cancellation",
        examples=["Subscription will be cancelled at the end of the billing period"]
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "message": "Subscription will be cancelled at the end of the billing period"
                }
            ]
        }
    )


# ============================================================================
# Export all schemas
# ============================================================================

__all__ = [
    # Type definitions
    "SubscriptionTier",
    "SubscriptionStatus",
    "PlanType",
    # Request schemas
    "CheckoutRequest",
    "PortalRequest",
    # Response schemas
    "CheckoutResponse",
    "PortalResponse",
    "SubscriptionStatusResponse",
    "CancelResponse",
]
