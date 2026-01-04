"""
Stripe webhook handler for processing subscription events.

This module handles incoming Stripe webhook events for subscription lifecycle
management including checkout completion, subscription updates, and payment events.

Security Features:
- Signature verification (existing)
- Event age validation (reject events >5 min old - replay attack prevention)
- Idempotent event persistence BEFORE processing (race condition prevention)
- Processing locks (prevent concurrent handling of same event)
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException, status, Header

from backend.api.service_dependencies import (
    StripeServiceDep,
    SubscriptionServiceDep,
    PromoServiceDep,
    WebhookQueueDep,
)
from backend.services.stripe_service import StripeWebhookError
from backend.services.webhook_queue import (
    WebhookEventTooOldError,
    WebhookEventDuplicateError,
)

__all__ = ["router"]

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/stripe")
async def handle_stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    stripe_service: StripeServiceDep = None,
    subscription_service: SubscriptionServiceDep = None,
    promo_service: PromoServiceDep = None,
    webhook_queue: WebhookQueueDep = None,
):
    """
    Handle incoming Stripe webhook events.
    
    This endpoint receives and processes Stripe webhook events for subscription
    lifecycle management. It verifies the webhook signature, validates event age,
    checks for idempotency, and routes events to appropriate handlers.
    
    Security Flow:
    1. Verify webhook signature (prevents tampering)
    2. Validate event age (prevents replay attacks - reject if >5 min old)
    3. Persist event ID BEFORE processing (prevents race conditions)
    4. Acquire processing lock (prevents concurrent handling)
    5. Process event
    6. Mark as processed/failed
    7. Release lock (always, via finally)
    
    Supported events:
    - checkout.session.completed: Activates a new subscription
    - customer.subscription.created: Logs subscription creation
    - customer.subscription.updated: Updates subscription status
    - customer.subscription.deleted: Deactivates subscription
    - invoice.paid: Logs successful payment
    - invoice.payment_failed: Updates status to past_due
    
    Returns:
        dict: Status of webhook processing
        
    Raises:
        HTTPException: 400 if signature verification fails
    """
    # Get raw request body for signature verification
    payload = await request.body()
    
    # 1. Verify webhook signature
    try:
        event = stripe_service.verify_webhook_signature(payload, stripe_signature)
    except StripeWebhookError as e:
        logger.error(f"Webhook signature verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="INVALID_SIGNATURE",
        )
    
    event_type = event.type
    event_id = event.id
    event_created = event.created  # Unix timestamp
    
    logger.info(f"Received Stripe webhook event: {event_type} (ID: {event_id})")
    
    # 2. Validate event age and persist BEFORE processing (race condition prevention)
    try:
        await webhook_queue.persist_event(
            event_id=event_id,
            event_type=event_type,
            event_created=event_created,
        )
    except WebhookEventTooOldError as e:
        logger.warning(
            f"Rejecting old webhook event (potential replay attack): {event_id}, "
            f"age: {e.age_seconds:.1f}s"
        )
        return {"status": "rejected", "reason": "event_too_old"}
    except WebhookEventDuplicateError:
        logger.info(f"Event {event_id} already received, skipping")
        return {"status": "already_received"}
    
    # 3. Acquire processing lock (prevent concurrent handling)
    if not await webhook_queue.acquire_processing_lock(event_id):
        logger.info(f"Event {event_id} is currently being processed by another worker")
        return {"status": "processing"}
    
    try:
        # 4. Route event to appropriate handler
        if event_type == "checkout.session.completed":
            session = event.data.object
            # Check if this is a promo payment or subscription
            if session.metadata.get("type") == "promo_message":
                await _handle_promo_checkout_completed(event, promo_service)
            else:
                await _handle_checkout_completed(event, stripe_service, subscription_service)
        
        elif event_type == "customer.subscription.created":
            await _handle_subscription_created(event)
        
        elif event_type == "customer.subscription.updated":
            await _handle_subscription_updated(event, subscription_service)
        
        elif event_type == "customer.subscription.deleted":
            await _handle_subscription_deleted(event, subscription_service)
        
        elif event_type == "invoice.paid":
            await _handle_invoice_paid(event)
        
        elif event_type == "invoice.payment_failed":
            await _handle_invoice_payment_failed(event, subscription_service)
        
        else:
            logger.info(f"Unhandled event type: {event_type}")
        
        # 5. Mark as processed (success)
        await webhook_queue.mark_event_processed(event_id, success=True)
        
        logger.info(f"Successfully processed webhook event: {event_type} (ID: {event_id})")
        return {"status": "processed"}
    
    except Exception as e:
        logger.error(f"Error processing webhook event {event_id}: {e}", exc_info=True)
        
        # Mark as failed with error message
        await webhook_queue.mark_event_processed(
            event_id,
            success=False,
            error=str(e)
        )
        
        # Still return 200 to prevent Stripe from retrying
        # The error is logged for investigation
        return {"status": "error", "message": str(e)}
    
    finally:
        # 6. Always release lock
        await webhook_queue.release_processing_lock(event_id)


async def _handle_checkout_completed(event, stripe_service, subscription_service):
    """Handle checkout.session.completed event - activate subscription."""
    session = event.data.object
    user_id = session.metadata.get("user_id")
    subscription_id = session.subscription
    customer_id = session.customer
    
    if not user_id:
        logger.error(f"No user_id in checkout session metadata: {session.id}")
        return
    
    if not subscription_id:
        logger.warning(f"No subscription in checkout session: {session.id}")
        return
    
    logger.info(
        f"Processing checkout completion for user {user_id}, "
        f"subscription {subscription_id}, customer {customer_id}"
    )
    
    # Get subscription details from Stripe
    stripe_sub = await stripe_service.get_subscription(subscription_id)
    
    # Activate subscription
    await subscription_service.activate_subscription(
        user_id=user_id,
        stripe_subscription_id=subscription_id,
        stripe_customer_id=customer_id,
        price_id=stripe_sub.price_id,
        current_period_start=datetime.fromtimestamp(stripe_sub.current_period_start, tz=timezone.utc),
        current_period_end=datetime.fromtimestamp(stripe_sub.current_period_end, tz=timezone.utc),
        stripe_event_id=event.id,
    )
    
    logger.info(f"Subscription activated for user {user_id}")


async def _handle_subscription_created(event):
    """Handle customer.subscription.created event - log only."""
    subscription = event.data.object
    logger.info(
        f"Subscription created: {subscription.id}, "
        f"status: {subscription.status}, "
        f"customer: {subscription.customer}"
    )
    # Subscription is already activated by checkout.session.completed
    # This event is logged for audit purposes


async def _handle_subscription_updated(event, subscription_service):
    """Handle customer.subscription.updated event - update status."""
    subscription = event.data.object
    
    logger.info(
        f"Subscription updated: {subscription.id}, "
        f"status: {subscription.status}, "
        f"cancel_at_period_end: {subscription.cancel_at_period_end}"
    )
    
    # Extract price_id from subscription items
    price_id = None
    if subscription.items and subscription.items.data:
        price_id = subscription.items.data[0].price.id
    
    await subscription_service.update_subscription_status(
        stripe_subscription_id=subscription.id,
        status=subscription.status,
        cancel_at_period_end=subscription.cancel_at_period_end,
        stripe_event_id=event.id,
        price_id=price_id,
        current_period_end=datetime.fromtimestamp(subscription.current_period_end, tz=timezone.utc),
    )
    
    logger.info(f"Subscription {subscription.id} status updated to {subscription.status}")


async def _handle_subscription_deleted(event, subscription_service):
    """Handle customer.subscription.deleted event - deactivate subscription."""
    subscription = event.data.object
    
    logger.info(f"Subscription deleted: {subscription.id}")
    
    await subscription_service.deactivate_subscription(
        stripe_subscription_id=subscription.id,
        stripe_event_id=event.id,
    )
    
    logger.info(f"Subscription {subscription.id} deactivated")


async def _handle_invoice_paid(event):
    """Handle invoice.paid event - log successful payment."""
    invoice = event.data.object
    
    logger.info(
        f"Invoice paid: {invoice.id}, "
        f"amount: {invoice.amount_paid}, "
        f"subscription: {invoice.subscription}, "
        f"customer: {invoice.customer}"
    )
    # Payment success is logged for audit purposes
    # Subscription status is managed by subscription events


async def _handle_invoice_payment_failed(event, subscription_service):
    """Handle invoice.payment_failed event - update status to past_due."""
    invoice = event.data.object
    
    logger.warning(
        f"Invoice payment failed: {invoice.id}, "
        f"subscription: {invoice.subscription}, "
        f"customer: {invoice.customer}"
    )
    
    if invoice.subscription:
        await subscription_service.update_subscription_status(
            stripe_subscription_id=invoice.subscription,
            status="past_due",
            cancel_at_period_end=False,
            stripe_event_id=event.id,
        )
        
        logger.info(f"Subscription {invoice.subscription} marked as past_due")


async def _handle_promo_checkout_completed(event, promo_service):
    """Handle checkout.session.completed event for promo messages."""
    session = event.data.object
    checkout_session_id = session.id
    payment_intent_id = session.payment_intent
    user_id = session.metadata.get("user_id")
    
    logger.info(
        f"Processing promo checkout completion for user {user_id}, "
        f"session {checkout_session_id}"
    )
    
    try:
        await promo_service.confirm_payment(
            checkout_session_id=checkout_session_id,
            payment_intent_id=payment_intent_id,
        )
        logger.info(f"Promo message created for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to confirm promo payment: {e}")
        raise
