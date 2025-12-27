"""
Subscription Route Handlers for Aurastream.

This module implements all subscription management endpoints:
- POST /checkout - Create Stripe Checkout session for subscription purchase
- POST /portal - Create Stripe Customer Portal session for billing management
- GET /status - Get current subscription status
- POST /cancel - Cancel subscription at period end

All endpoints require authentication and handle Stripe integration.

Security Features:
- All operations require valid JWT authentication
- Stripe customer IDs are managed securely
- Audit logging for subscription operations
- Error handling for Stripe API failures
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request

from backend.api.middleware.auth import get_current_user
from backend.api.schemas.subscription import (
    CheckoutRequest,
    CheckoutResponse,
    PortalRequest,
    PortalResponse,
    SubscriptionStatusResponse,
    CancelResponse,
)
from backend.services.stripe_service import (
    get_stripe_service,
    StripeServiceError,
    StripeCustomerNotFoundError,
)
from backend.services.subscription_service import get_subscription_service
from backend.services.jwt_service import TokenPayload
from backend.services.audit_service import get_audit_service
from backend.api.config import get_settings
from backend.database.supabase_client import get_supabase_client


router = APIRouter()


# =============================================================================
# Error Codes
# =============================================================================

STRIPE_ERROR = "STRIPE_ERROR"
NO_STRIPE_CUSTOMER = "NO_STRIPE_CUSTOMER"
NO_SUBSCRIPTION = "NO_SUBSCRIPTION"
INVALID_PLAN = "INVALID_PLAN"


# =============================================================================
# Helper Functions
# =============================================================================

async def _get_user_stripe_customer_id(user_id: str) -> str | None:
    """
    Get user's Stripe customer ID from database.
    
    Args:
        user_id: User's UUID
        
    Returns:
        Stripe customer ID or None if not set
    """
    supabase = get_supabase_client()
    result = supabase.table("users").select("stripe_customer_id").eq("id", user_id).execute()
    
    if not result.data:
        return None
    
    return result.data[0].get("stripe_customer_id")


async def _get_user_email(user_id: str) -> str | None:
    """
    Get user's email from database.
    
    Args:
        user_id: User's UUID
        
    Returns:
        User's email or None if not found
    """
    supabase = get_supabase_client()
    result = supabase.table("users").select("email").eq("id", user_id).execute()
    
    if not result.data:
        return None
    
    return result.data[0].get("email")


async def _update_user_stripe_customer_id(user_id: str, stripe_customer_id: str) -> None:
    """
    Update user's Stripe customer ID in database.
    
    Args:
        user_id: User's UUID
        stripe_customer_id: Stripe customer ID to set
    """
    supabase = get_supabase_client()
    supabase.table("users").update({
        "stripe_customer_id": stripe_customer_id
    }).eq("id", user_id).execute()


# =============================================================================
# POST /checkout - Create Stripe Checkout session
# =============================================================================

@router.post(
    "/checkout",
    response_model=CheckoutResponse,
    summary="Create checkout session",
    description="""
    Create a Stripe Checkout session for subscription purchase.
    
    **Flow:**
    1. Creates or retrieves Stripe customer for the user
    2. Maps the plan to the appropriate Stripe Price ID
    3. Creates a Checkout session with the specified URLs
    4. Returns the checkout URL for redirect
    
    **Plans:**
    - `pro` - Pro tier subscription
    - `studio` - Studio tier subscription
    
    **Note:** If the user doesn't have a Stripe customer ID, one will be created
    and stored in the database.
    """,
    responses={
        200: {"description": "Checkout session created successfully"},
        401: {"description": "Authentication required"},
        400: {"description": "Invalid plan specified"},
        502: {"description": "Stripe API error"},
    },
)
async def create_checkout_session(
    data: CheckoutRequest,
    request: Request,
    current_user: TokenPayload = Depends(get_current_user),
) -> CheckoutResponse:
    """
    Create a Stripe Checkout session for subscription purchase.
    
    Creates or retrieves the user's Stripe customer, maps the plan to
    a price ID, and creates a checkout session for the subscription.
    
    Args:
        data: CheckoutRequest with plan and optional URLs
        request: FastAPI request object for audit logging
        current_user: Authenticated user's token payload
        
    Returns:
        CheckoutResponse: Checkout URL and session ID
        
    Raises:
        HTTPException: 400 if plan is invalid
        HTTPException: 502 if Stripe API fails
    """
    settings = get_settings()
    stripe_service = get_stripe_service()
    
    # Map plan to price ID
    price_id_map = {
        "pro": settings.STRIPE_PRICE_PRO,
        "studio": settings.STRIPE_PRICE_STUDIO,
    }
    
    price_id = price_id_map.get(data.plan)
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": INVALID_PLAN,
                "message": f"Invalid plan: {data.plan}. Must be 'pro' or 'studio'.",
            },
        )
    
    # Get user's Stripe customer ID
    stripe_customer_id = await _get_user_stripe_customer_id(current_user.sub)
    user_email = await _get_user_email(current_user.sub)
    
    try:
        # Create or get Stripe customer
        stripe_customer_id = await stripe_service.create_or_get_customer(
            user_id=current_user.sub,
            email=user_email or "",
            existing_customer_id=stripe_customer_id,
        )
        
        # Update user's stripe_customer_id if newly created
        await _update_user_stripe_customer_id(current_user.sub, stripe_customer_id)
        
        # Set default URLs
        success_url = data.success_url or f"{settings.API_BASE_URL}/billing/success"
        cancel_url = data.cancel_url or f"{settings.API_BASE_URL}/pricing"
        
        # Create checkout session
        checkout_session = await stripe_service.create_checkout_session(
            customer_id=stripe_customer_id,
            price_id=price_id,
            success_url=success_url,
            cancel_url=cancel_url,
            user_id=current_user.sub,
        )
        
        # Audit log the checkout creation
        audit = get_audit_service()
        await audit.log(
            user_id=current_user.sub,
            action="subscription.checkout_created",
            resource_type="checkout_session",
            resource_id=checkout_session.session_id,
            details={"plan": data.plan},
            ip_address=request.client.host if request.client else None,
        )
        
        return CheckoutResponse(
            checkout_url=checkout_session.checkout_url,
            session_id=checkout_session.session_id,
        )
        
    except StripeServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "code": STRIPE_ERROR,
                "message": f"Failed to create checkout session: {str(e)}",
            },
        )


# =============================================================================
# POST /portal - Create Stripe Customer Portal session
# =============================================================================

@router.post(
    "/portal",
    response_model=PortalResponse,
    summary="Create portal session",
    description="""
    Create a Stripe Customer Portal session for billing management.
    
    **Portal Features:**
    - View and update payment methods
    - View invoice history
    - Cancel subscription
    - Update billing information
    
    **Note:** User must have a Stripe customer ID to access the portal.
    This is created during the first checkout.
    """,
    responses={
        200: {"description": "Portal session created successfully"},
        401: {"description": "Authentication required"},
        400: {"description": "No Stripe customer found for user"},
        502: {"description": "Stripe API error"},
    },
)
async def create_portal_session(
    data: PortalRequest,
    request: Request,
    current_user: TokenPayload = Depends(get_current_user),
) -> PortalResponse:
    """
    Create a Stripe Customer Portal session.
    
    Allows users to manage their subscription, payment methods,
    and view invoices through Stripe's hosted portal.
    
    Args:
        data: PortalRequest with optional return URL
        request: FastAPI request object
        current_user: Authenticated user's token payload
        
    Returns:
        PortalResponse: Portal URL for redirect
        
    Raises:
        HTTPException: 400 if user has no Stripe customer ID
        HTTPException: 502 if Stripe API fails
    """
    settings = get_settings()
    stripe_service = get_stripe_service()
    
    # Get user's Stripe customer ID
    stripe_customer_id = await _get_user_stripe_customer_id(current_user.sub)
    
    if not stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": NO_STRIPE_CUSTOMER,
                "message": "No Stripe customer found. Please subscribe first.",
            },
        )
    
    try:
        # Set default return URL
        return_url = data.return_url or f"{settings.API_BASE_URL}/dashboard/settings"
        
        # Create portal session
        portal_session = await stripe_service.create_portal_session(
            customer_id=stripe_customer_id,
            return_url=return_url,
        )
        
        return PortalResponse(
            portal_url=portal_session.portal_url,
        )
        
    except StripeCustomerNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": NO_STRIPE_CUSTOMER,
                "message": "Stripe customer not found. Please subscribe first.",
            },
        )
    except StripeServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "code": STRIPE_ERROR,
                "message": f"Failed to create portal session: {str(e)}",
            },
        )


# =============================================================================
# GET /status - Get current subscription status
# =============================================================================

@router.get(
    "/status",
    response_model=SubscriptionStatusResponse,
    summary="Get subscription status",
    description="""
    Get the current subscription status for the authenticated user.
    
    **Returns:**
    - `has_subscription`: Whether user has an active paid subscription
    - `tier`: Current tier (free, pro, or studio)
    - `status`: Subscription status (active, past_due, canceled, none)
    - `current_period_end`: End of current billing period
    - `cancel_at_period_end`: Whether subscription cancels at period end
    - `can_upgrade`: Whether user can upgrade to a higher tier
    - `can_downgrade`: Whether user can downgrade to a lower tier
    """,
    responses={
        200: {"description": "Subscription status retrieved successfully"},
        401: {"description": "Authentication required"},
    },
)
async def get_subscription_status(
    current_user: TokenPayload = Depends(get_current_user),
) -> SubscriptionStatusResponse:
    """
    Get the user's current subscription status.
    
    Returns comprehensive subscription information including
    tier, status, billing period, and upgrade/downgrade eligibility.
    
    Args:
        current_user: Authenticated user's token payload
        
    Returns:
        SubscriptionStatusResponse: Full subscription status
    """
    subscription_service = get_subscription_service()
    
    # Get subscription status from service
    status = await subscription_service.get_subscription_status(current_user.sub)
    
    # Convert dataclass to response schema
    return SubscriptionStatusResponse(
        has_subscription=status.has_subscription,
        tier=status.tier,
        status=status.status,
        current_period_end=status.current_period_end,
        cancel_at_period_end=status.cancel_at_period_end,
        can_upgrade=status.can_upgrade,
        can_downgrade=status.can_downgrade,
    )


# =============================================================================
# POST /cancel - Cancel subscription at period end
# =============================================================================

@router.post(
    "/cancel",
    response_model=CancelResponse,
    summary="Cancel subscription",
    description="""
    Cancel the user's subscription at the end of the current billing period.
    
    **Behavior:**
    - Subscription remains active until the end of the current billing period
    - User retains access to paid features until period end
    - After period end, user is downgraded to free tier
    - This action can be reversed via the Customer Portal before period end
    
    **Note:** For immediate cancellation, use the Customer Portal.
    """,
    responses={
        200: {"description": "Subscription cancellation scheduled"},
        401: {"description": "Authentication required"},
        400: {"description": "No active subscription to cancel"},
        502: {"description": "Stripe API error"},
    },
)
async def cancel_subscription(
    request: Request,
    current_user: TokenPayload = Depends(get_current_user),
) -> CancelResponse:
    """
    Cancel the user's subscription at period end.
    
    Schedules the subscription to cancel at the end of the current
    billing period. The user retains access until then.
    
    Args:
        request: FastAPI request object for audit logging
        current_user: Authenticated user's token payload
        
    Returns:
        CancelResponse: Confirmation message
        
    Raises:
        HTTPException: 400 if user has no active subscription
        HTTPException: 502 if Stripe API fails
    """
    subscription_service = get_subscription_service()
    stripe_service = get_stripe_service()
    
    # Get user's subscription
    subscription = await subscription_service.get_user_subscription(current_user.sub)
    
    if not subscription or subscription.status == "canceled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": NO_SUBSCRIPTION,
                "message": "No active subscription to cancel.",
            },
        )
    
    try:
        # Cancel subscription at period end via Stripe
        await stripe_service.cancel_subscription(
            subscription_id=subscription.stripe_subscription_id,
            at_period_end=True,
        )
        
        # Audit log the cancellation
        audit = get_audit_service()
        await audit.log(
            user_id=current_user.sub,
            action="subscription.cancelled",
            resource_type="subscription",
            resource_id=subscription.id,
            details={
                "tier": subscription.tier,
                "stripe_subscription_id": subscription.stripe_subscription_id,
            },
            ip_address=request.client.host if request.client else None,
        )
        
        return CancelResponse(
            message="Subscription will be cancelled at the end of the billing period",
        )
        
    except StripeServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "code": STRIPE_ERROR,
                "message": f"Failed to cancel subscription: {str(e)}",
            },
        )


__all__ = ["router"]
