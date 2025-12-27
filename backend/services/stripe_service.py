"""
Stripe Service for Aurastream.

This service handles all direct communication with Stripe API including:
- Checkout session creation for subscriptions
- Customer portal sessions for billing management
- Subscription management (cancel, retrieve)
- Webhook signature verification

Security Notes:
- Never log full API responses (may contain PII)
- Always verify webhook signatures
- Use idempotency keys for mutations
- API key is set globally on stripe module
"""

import logging
from dataclasses import dataclass
from typing import Optional

import stripe
from stripe import SignatureVerificationError

from backend.api.config import get_settings


# Configure module logger
logger = logging.getLogger(__name__)


# =============================================================================
# Data Classes for Return Types
# =============================================================================


@dataclass
class CheckoutSession:
    """Stripe Checkout session data."""
    session_id: str
    checkout_url: str


@dataclass
class PortalSession:
    """Stripe Customer Portal session data."""
    portal_url: str


@dataclass
class StripeSubscription:
    """Stripe subscription data."""
    id: str
    customer_id: str
    price_id: str
    status: str
    current_period_start: int  # Unix timestamp
    current_period_end: int    # Unix timestamp
    cancel_at_period_end: bool


# =============================================================================
# Custom Exceptions
# =============================================================================


class StripeServiceError(Exception):
    """Base exception for Stripe service errors."""
    pass


class StripeCustomerNotFoundError(StripeServiceError):
    """Raised when Stripe customer doesn't exist."""
    pass


class StripeSubscriptionNotFoundError(StripeServiceError):
    """Raised when Stripe subscription doesn't exist."""
    pass


class StripeWebhookError(StripeServiceError):
    """Raised when webhook verification fails."""
    pass


# =============================================================================
# Stripe Service Class
# =============================================================================


class StripeService:
    """
    Stripe API integration service.
    
    Handles all direct communication with Stripe API:
    - Checkout session creation for subscriptions
    - Customer portal sessions for billing management
    - Subscription management (cancel, retrieve)
    - Webhook signature verification
    
    Security Notes:
    - Never log full API responses (may contain PII)
    - Always verify webhook signatures
    - Use idempotency keys for mutations
    """
    
    def __init__(self, secret_key: str, webhook_secret: str):
        """
        Initialize Stripe with API key.
        
        Args:
            secret_key: Stripe secret API key (sk_xxx)
            webhook_secret: Stripe webhook signing secret (whsec_xxx)
        """
        stripe.api_key = secret_key
        self.webhook_secret = webhook_secret
        logger.info("Stripe service initialized")
    
    async def create_or_get_customer(
        self,
        user_id: str,
        email: str,
        existing_customer_id: Optional[str] = None,
    ) -> str:
        """
        Get existing Stripe customer or create new one.
        
        Args:
            user_id: Internal user ID (stored in metadata)
            email: User's email address
            existing_customer_id: Existing Stripe customer ID if known
            
        Returns:
            Stripe customer ID (cus_xxx)
            
        Raises:
            StripeServiceError: If customer creation fails
        """
        # If we have an existing customer ID, verify it exists
        if existing_customer_id:
            try:
                customer = stripe.Customer.retrieve(existing_customer_id)
                if not customer.deleted:
                    logger.debug(
                        "Retrieved existing Stripe customer",
                        extra={"user_id": user_id, "customer_id": existing_customer_id}
                    )
                    return customer.id
            except stripe.error.InvalidRequestError:
                logger.warning(
                    "Existing customer ID invalid, creating new customer",
                    extra={"user_id": user_id, "invalid_customer_id": existing_customer_id}
                )
                # Customer doesn't exist, create new one
        
        # Create new customer
        try:
            customer = stripe.Customer.create(
                email=email,
                metadata={"user_id": user_id},
            )
            logger.info(
                "Created new Stripe customer",
                extra={"user_id": user_id, "customer_id": customer.id}
            )
            return customer.id
        except stripe.error.StripeError as e:
            logger.error(
                "Failed to create Stripe customer",
                extra={"user_id": user_id, "error": str(e)}
            )
            raise StripeServiceError(f"Failed to create customer: {e}") from e
    
    async def create_checkout_session(
        self,
        customer_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        user_id: str,
    ) -> CheckoutSession:
        """
        Create Stripe Checkout session for subscription.
        
        Args:
            customer_id: Stripe customer ID
            price_id: Stripe price ID for the plan
            success_url: URL to redirect on success
            cancel_url: URL to redirect on cancel
            user_id: Internal user ID for metadata
            
        Returns:
            CheckoutSession with session_id and checkout_url
            
        Raises:
            StripeServiceError: If session creation fails
        """
        try:
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card"],
                mode="subscription",
                line_items=[{"price": price_id, "quantity": 1}],
                success_url=f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=cancel_url,
                metadata={"user_id": user_id},
                subscription_data={
                    "metadata": {"user_id": user_id},
                },
            )
            logger.info(
                "Created Stripe checkout session",
                extra={
                    "user_id": user_id,
                    "customer_id": customer_id,
                    "session_id": session.id,
                    "price_id": price_id,
                }
            )
            return CheckoutSession(
                session_id=session.id,
                checkout_url=session.url,
            )
        except stripe.error.StripeError as e:
            logger.error(
                "Failed to create checkout session",
                extra={
                    "user_id": user_id,
                    "customer_id": customer_id,
                    "price_id": price_id,
                    "error": str(e),
                }
            )
            raise StripeServiceError(f"Failed to create checkout session: {e}") from e
    
    async def create_portal_session(
        self,
        customer_id: str,
        return_url: str,
    ) -> PortalSession:
        """
        Create Stripe Customer Portal session.
        
        Args:
            customer_id: Stripe customer ID
            return_url: URL to return to after portal
            
        Returns:
            PortalSession with portal_url
            
        Raises:
            StripeCustomerNotFoundError: If customer doesn't exist
            StripeServiceError: If session creation fails
        """
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url,
            )
            logger.info(
                "Created Stripe portal session",
                extra={"customer_id": customer_id}
            )
            return PortalSession(portal_url=session.url)
        except stripe.error.InvalidRequestError as e:
            if "No such customer" in str(e):
                logger.warning(
                    "Customer not found for portal session",
                    extra={"customer_id": customer_id}
                )
                raise StripeCustomerNotFoundError(
                    f"Customer not found: {customer_id}"
                ) from e
            logger.error(
                "Failed to create portal session",
                extra={"customer_id": customer_id, "error": str(e)}
            )
            raise StripeServiceError(f"Failed to create portal session: {e}") from e
        except stripe.error.StripeError as e:
            logger.error(
                "Failed to create portal session",
                extra={"customer_id": customer_id, "error": str(e)}
            )
            raise StripeServiceError(f"Failed to create portal session: {e}") from e
    
    async def get_subscription(
        self,
        subscription_id: str,
    ) -> StripeSubscription:
        """
        Retrieve subscription details from Stripe.
        
        Args:
            subscription_id: Stripe subscription ID
            
        Returns:
            StripeSubscription with current details
            
        Raises:
            StripeSubscriptionNotFoundError: If subscription doesn't exist
        """
        try:
            sub = stripe.Subscription.retrieve(subscription_id)
            logger.debug(
                "Retrieved Stripe subscription",
                extra={"subscription_id": subscription_id, "status": sub.status}
            )
            return StripeSubscription(
                id=sub.id,
                customer_id=sub.customer,
                price_id=sub.items.data[0].price.id if sub.items.data else "",
                status=sub.status,
                current_period_start=sub.current_period_start,
                current_period_end=sub.current_period_end,
                cancel_at_period_end=sub.cancel_at_period_end,
            )
        except stripe.error.InvalidRequestError as e:
            logger.warning(
                "Subscription not found",
                extra={"subscription_id": subscription_id}
            )
            raise StripeSubscriptionNotFoundError(
                f"Subscription not found: {subscription_id}"
            ) from e
    
    async def cancel_subscription(
        self,
        subscription_id: str,
        at_period_end: bool = True,
    ) -> StripeSubscription:
        """
        Cancel a subscription.
        
        Args:
            subscription_id: Stripe subscription ID
            at_period_end: If True, cancel at end of billing period
            
        Returns:
            Updated StripeSubscription
            
        Raises:
            StripeSubscriptionNotFoundError: If subscription doesn't exist
            StripeServiceError: If cancellation fails
        """
        try:
            if at_period_end:
                sub = stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True,
                )
                logger.info(
                    "Scheduled subscription cancellation at period end",
                    extra={"subscription_id": subscription_id}
                )
            else:
                sub = stripe.Subscription.cancel(subscription_id)
                logger.info(
                    "Cancelled subscription immediately",
                    extra={"subscription_id": subscription_id}
                )
            
            return StripeSubscription(
                id=sub.id,
                customer_id=sub.customer,
                price_id=sub.items.data[0].price.id if sub.items.data else "",
                status=sub.status,
                current_period_start=sub.current_period_start,
                current_period_end=sub.current_period_end,
                cancel_at_period_end=sub.cancel_at_period_end,
            )
        except stripe.error.InvalidRequestError as e:
            logger.warning(
                "Subscription not found for cancellation",
                extra={"subscription_id": subscription_id}
            )
            raise StripeSubscriptionNotFoundError(
                f"Subscription not found: {subscription_id}"
            ) from e
        except stripe.error.StripeError as e:
            logger.error(
                "Failed to cancel subscription",
                extra={"subscription_id": subscription_id, "error": str(e)}
            )
            raise StripeServiceError(f"Failed to cancel subscription: {e}") from e
    
    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
    ) -> stripe.Event:
        """
        Verify Stripe webhook signature and construct event.
        
        Args:
            payload: Raw request body bytes
            signature: Stripe-Signature header value
            
        Returns:
            Verified Stripe Event object
            
        Raises:
            StripeWebhookError: If signature verification fails
        """
        try:
            event = stripe.Webhook.construct_event(
                payload,
                signature,
                self.webhook_secret,
            )
            logger.debug(
                "Verified webhook signature",
                extra={"event_type": event.type, "event_id": event.id}
            )
            return event
        except SignatureVerificationError as e:
            logger.warning(
                "Invalid webhook signature",
                extra={"error": str(e)}
            )
            raise StripeWebhookError(f"Invalid webhook signature: {e}") from e
        except ValueError as e:
            logger.warning(
                "Invalid webhook payload",
                extra={"error": str(e)}
            )
            raise StripeWebhookError(f"Invalid webhook payload: {e}") from e


# =============================================================================
# Singleton Pattern
# =============================================================================


_stripe_service: Optional[StripeService] = None


def get_stripe_service() -> StripeService:
    """
    Get or create the Stripe service singleton.
    
    Returns:
        StripeService instance configured from settings
        
    Raises:
        ValueError: If Stripe is not configured
        
    Example:
        ```python
        from backend.services.stripe_service import get_stripe_service
        
        stripe_svc = get_stripe_service()
        session = await stripe_svc.create_checkout_session(...)
        ```
    """
    global _stripe_service
    
    if _stripe_service is None:
        settings = get_settings()
        if not settings.has_stripe_config:
            raise ValueError(
                "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET."
            )
        _stripe_service = StripeService(
            secret_key=settings.STRIPE_SECRET_KEY,
            webhook_secret=settings.STRIPE_WEBHOOK_SECRET,
        )
    
    return _stripe_service


# =============================================================================
# Module Exports
# =============================================================================


__all__ = [
    "StripeService",
    "StripeServiceError",
    "StripeCustomerNotFoundError",
    "StripeSubscriptionNotFoundError",
    "StripeWebhookError",
    "CheckoutSession",
    "PortalSession",
    "StripeSubscription",
    "get_stripe_service",
]
