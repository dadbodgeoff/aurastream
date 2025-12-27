"""
Subscription Service for Aurastream.

This service handles all subscription management operations including:
- Activating new subscriptions from Stripe webhooks
- Updating subscription status (upgrades, downgrades, cancellations)
- Deactivating subscriptions when deleted in Stripe
- Syncing user tier with subscription state
- Audit trail logging for all subscription events
- Idempotency checking for webhook event processing

Security Notes:
- All subscription changes are logged for audit trail
- Stripe event IDs are used for idempotency
- User tier is always synced with subscription state
"""

import logging
from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Optional, Literal

from backend.api.config import get_settings
from backend.database.supabase_client import get_supabase_client


# Configure logger
logger = logging.getLogger(__name__)


# =============================================================================
# Helper Functions
# =============================================================================

def _parse_datetime(value) -> datetime:
    """
    Parse datetime from database value.
    
    Handles ISO format strings with various timezone representations
    including 'Z' suffix and explicit timezone offsets.
    
    Args:
        value: datetime object or ISO format string
        
    Returns:
        datetime object with timezone info
        
    Raises:
        ValueError: If value cannot be parsed as datetime
    """
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        # Handle ISO format with Z suffix (UTC)
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    raise ValueError(f"Cannot parse datetime from {type(value)}: {value}")


def _parse_datetime_optional(value) -> Optional[datetime]:
    """
    Parse optional datetime from database value.
    
    Args:
        value: datetime object, ISO format string, or None
        
    Returns:
        datetime object with timezone info, or None if value is None
    """
    if value is None:
        return None
    return _parse_datetime(value)


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class Subscription:
    """
    Subscription data model.
    
    Represents a user's subscription record linked to Stripe.
    Free tier users do not have a subscription record.
    
    Attributes:
        id: Internal subscription UUID
        user_id: User who owns this subscription
        stripe_subscription_id: Stripe subscription ID (sub_xxx)
        stripe_customer_id: Stripe customer ID (cus_xxx)
        stripe_price_id: Stripe price ID (price_xxx)
        tier: Subscription tier (pro or studio)
        status: Current subscription status
        current_period_start: Start of current billing period
        current_period_end: End of current billing period
        cancel_at_period_end: Whether subscription cancels at period end
        created_at: When subscription was created
        updated_at: When subscription was last updated
    """
    id: str
    user_id: str
    stripe_subscription_id: str
    stripe_customer_id: str
    stripe_price_id: str
    tier: Literal["pro", "studio"]
    status: Literal["active", "past_due", "canceled", "trialing"]
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def from_db_row(cls, row: dict) -> "Subscription":
        """
        Create Subscription from database row.
        
        Args:
            row: Dictionary from Supabase query result
            
        Returns:
            Subscription instance with parsed datetime fields
        """
        return cls(
            id=row["id"],
            user_id=row["user_id"],
            stripe_subscription_id=row["stripe_subscription_id"],
            stripe_customer_id=row["stripe_customer_id"],
            stripe_price_id=row["stripe_price_id"],
            tier=row["tier"],
            status=row["status"],
            current_period_start=_parse_datetime(row["current_period_start"]),
            current_period_end=_parse_datetime(row["current_period_end"]),
            cancel_at_period_end=row.get("cancel_at_period_end", False),
            created_at=_parse_datetime(row["created_at"]),
            updated_at=_parse_datetime(row["updated_at"]),
        )


@dataclass
class SubscriptionStatus:
    """
    User's subscription status for API responses.
    
    Provides a simplified view of subscription state for frontend consumption.
    Includes computed fields for upgrade/downgrade eligibility.
    
    Attributes:
        has_subscription: Whether user has an active subscription
        tier: Current tier (free, pro, or studio)
        status: Current status (active, past_due, canceled, or none)
        current_period_end: When current billing period ends (None for free)
        cancel_at_period_end: Whether subscription cancels at period end
        can_upgrade: Whether user can upgrade (free->pro, pro->studio)
        can_downgrade: Whether user can downgrade (studio->pro)
    """
    has_subscription: bool
    tier: Literal["free", "pro", "studio"]
    status: Literal["active", "past_due", "canceled", "none"]
    current_period_end: Optional[datetime]
    cancel_at_period_end: bool
    can_upgrade: bool
    can_downgrade: bool


# =============================================================================
# Custom Exceptions
# =============================================================================

class SubscriptionServiceError(Exception):
    """
    Base exception for subscription service errors.
    
    All subscription-related errors inherit from this class
    for consistent error handling.
    """
    pass


class SubscriptionNotFoundError(SubscriptionServiceError):
    """
    Raised when subscription doesn't exist.
    
    This can occur when:
    - Looking up a subscription by ID that doesn't exist
    - Processing a webhook for a subscription not in our database
    """
    pass


class DuplicateEventError(SubscriptionServiceError):
    """
    Raised when webhook event was already processed.
    
    Used for idempotency - if we've already processed a Stripe event,
    we should not process it again to avoid duplicate state changes.
    """
    pass


# =============================================================================
# Subscription Service
# =============================================================================

class SubscriptionService:
    """
    Subscription business logic service.
    
    Handles subscription state management:
    - Activating/deactivating subscriptions
    - Syncing with Stripe events
    - Tier enforcement
    - Audit trail logging
    
    This service is designed to be called from Stripe webhook handlers
    and provides idempotent operations using Stripe event IDs.
    
    Usage:
        ```python
        from backend.services.subscription_service import get_subscription_service
        
        service = get_subscription_service()
        
        # Activate a new subscription
        subscription = await service.activate_subscription(
            user_id="user-uuid",
            stripe_subscription_id="sub_xxx",
            stripe_customer_id="cus_xxx",
            price_id="price_xxx",
            current_period_start=datetime.now(timezone.utc),
            current_period_end=datetime.now(timezone.utc) + timedelta(days=30),
            stripe_event_id="evt_xxx",
        )
        
        # Get user's subscription status
        status = await service.get_subscription_status(user_id="user-uuid")
        ```
    """
    
    # Price ID to tier mapping (populated in __init__)
    PRICE_TO_TIER: dict = {}
    
    def __init__(self):
        """
        Initialize subscription service.
        
        Loads Stripe price ID to tier mapping from settings.
        Supabase client is lazy-loaded on first use.
        """
        self._supabase = None
        settings = get_settings()
        
        # Build price ID to tier mapping from settings
        # Only add mappings for configured price IDs
        self.PRICE_TO_TIER = {}
        if settings.STRIPE_PRICE_PRO:
            self.PRICE_TO_TIER[settings.STRIPE_PRICE_PRO] = "pro"
        if settings.STRIPE_PRICE_STUDIO:
            self.PRICE_TO_TIER[settings.STRIPE_PRICE_STUDIO] = "studio"
        
        logger.info(
            "SubscriptionService initialized",
            extra={"price_mappings": len(self.PRICE_TO_TIER)}
        )
    
    @property
    def supabase(self):
        """
        Lazy-load Supabase client.
        
        Returns:
            Supabase client instance
        """
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
    def _price_to_tier(self, price_id: str) -> str:
        """
        Convert Stripe price ID to tier name.
        
        Args:
            price_id: Stripe price ID (price_xxx)
            
        Returns:
            Tier name (pro or studio), defaults to "pro" if unknown
        """
        tier = self.PRICE_TO_TIER.get(price_id, "pro")
        logger.debug(
            "Mapped price to tier",
            extra={"price_id": price_id, "tier": tier}
        )
        return tier
    
    async def check_event_processed(self, stripe_event_id: str) -> bool:
        """
        Check if a Stripe event was already processed (idempotency).
        
        This prevents duplicate processing of webhook events that may
        be delivered multiple times by Stripe.
        
        Args:
            stripe_event_id: Stripe event ID (evt_xxx)
            
        Returns:
            True if event was already processed, False otherwise
        """
        result = self.supabase.table("subscription_events").select("id").eq(
            "stripe_event_id", stripe_event_id
        ).execute()
        
        is_processed = len(result.data) > 0
        
        if is_processed:
            logger.info(
                "Stripe event already processed",
                extra={"stripe_event_id": stripe_event_id}
            )
        
        return is_processed
    
    async def log_subscription_event(
        self,
        user_id: str,
        event_type: str,
        stripe_event_id: str,
        subscription_id: Optional[str] = None,
        old_tier: Optional[str] = None,
        new_tier: Optional[str] = None,
        old_status: Optional[str] = None,
        new_status: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> None:
        """
        Log subscription event for audit trail.
        
        Creates a record in subscription_events table for tracking
        all subscription lifecycle changes. The stripe_event_id
        provides idempotency for webhook processing.
        
        Args:
            user_id: User ID
            event_type: Stripe event type (e.g., subscription.activated)
            stripe_event_id: Stripe event ID for idempotency
            subscription_id: Internal subscription ID (optional)
            old_tier: Previous tier (optional)
            new_tier: New tier (optional)
            old_status: Previous status (optional)
            new_status: New status (optional)
            metadata: Additional metadata (optional)
        """
        try:
            self.supabase.table("subscription_events").insert({
                "user_id": user_id,
                "subscription_id": subscription_id,
                "event_type": event_type,
                "stripe_event_id": stripe_event_id,
                "old_tier": old_tier,
                "new_tier": new_tier,
                "old_status": old_status,
                "new_status": new_status,
                "metadata": metadata or {},
            }).execute()
            
            logger.info(
                "Logged subscription event",
                extra={
                    "user_id": user_id,
                    "event_type": event_type,
                    "stripe_event_id": stripe_event_id,
                    "old_tier": old_tier,
                    "new_tier": new_tier,
                    "old_status": old_status,
                    "new_status": new_status,
                }
            )
        except Exception as e:
            # Log error but don't fail the main operation
            logger.error(
                "Failed to log subscription event",
                extra={
                    "user_id": user_id,
                    "event_type": event_type,
                    "stripe_event_id": stripe_event_id,
                    "error": str(e),
                }
            )
    
    async def activate_subscription(
        self,
        user_id: str,
        stripe_subscription_id: str,
        stripe_customer_id: str,
        price_id: str,
        current_period_start: datetime,
        current_period_end: datetime,
        stripe_event_id: str,
    ) -> Subscription:
        """
        Activate a new subscription for a user.
        
        Creates subscription record and updates user's tier.
        Uses upsert to handle both new subscriptions and upgrades/downgrades.
        
        Args:
            user_id: User ID
            stripe_subscription_id: Stripe subscription ID (sub_xxx)
            stripe_customer_id: Stripe customer ID (cus_xxx)
            price_id: Stripe price ID (price_xxx)
            current_period_start: Billing period start
            current_period_end: Billing period end
            stripe_event_id: Stripe event ID for idempotency
            
        Returns:
            Created or updated Subscription
            
        Raises:
            Exception: If database operation fails
        """
        tier = self._price_to_tier(price_id)
        
        logger.info(
            "Activating subscription",
            extra={
                "user_id": user_id,
                "stripe_subscription_id": stripe_subscription_id,
                "tier": tier,
            }
        )
        
        # Upsert subscription (handles upgrades/downgrades)
        result = self.supabase.table("subscriptions").upsert({
            "user_id": user_id,
            "stripe_subscription_id": stripe_subscription_id,
            "stripe_customer_id": stripe_customer_id,
            "stripe_price_id": price_id,
            "tier": tier,
            "status": "active",
            "current_period_start": current_period_start.isoformat(),
            "current_period_end": current_period_end.isoformat(),
            "cancel_at_period_end": False,
        }, on_conflict="user_id").execute()
        
        if not result.data:
            logger.error(
                "Failed to activate subscription",
                extra={"user_id": user_id, "stripe_subscription_id": stripe_subscription_id}
            )
            raise Exception("Failed to create subscription record")
        
        # Update user's tier
        await self._sync_user_tier(user_id, tier, "active")
        
        # Log event
        await self.log_subscription_event(
            user_id=user_id,
            event_type="subscription.activated",
            stripe_event_id=stripe_event_id,
            subscription_id=result.data[0]["id"] if result.data else None,
            new_tier=tier,
            new_status="active",
        )
        
        logger.info(
            "Subscription activated successfully",
            extra={
                "user_id": user_id,
                "subscription_id": result.data[0]["id"],
                "tier": tier,
            }
        )
        
        return Subscription.from_db_row(result.data[0])
    
    async def update_subscription_status(
        self,
        stripe_subscription_id: str,
        status: str,
        cancel_at_period_end: bool,
        stripe_event_id: str,
        price_id: Optional[str] = None,
        current_period_end: Optional[datetime] = None,
    ) -> Optional[Subscription]:
        """
        Update subscription status from Stripe webhook.
        
        Handles status changes like:
        - active -> past_due (payment failed)
        - active -> canceled (subscription ended)
        - past_due -> active (payment succeeded)
        - Plan changes (price_id update)
        
        Args:
            stripe_subscription_id: Stripe subscription ID (sub_xxx)
            status: New status (active, past_due, canceled, trialing)
            cancel_at_period_end: Whether canceling at period end
            stripe_event_id: Stripe event ID for idempotency
            price_id: New price ID if plan changed (optional)
            current_period_end: New period end if changed (optional)
            
        Returns:
            Updated Subscription or None if not found
        """
        # Get current subscription
        result = self.supabase.table("subscriptions").select("*").eq(
            "stripe_subscription_id", stripe_subscription_id
        ).execute()
        
        if not result.data:
            logger.warning(
                "Subscription not found for status update",
                extra={"stripe_subscription_id": stripe_subscription_id}
            )
            return None
        
        current = result.data[0]
        old_status = current["status"]
        old_tier = current["tier"]
        
        logger.info(
            "Updating subscription status",
            extra={
                "stripe_subscription_id": stripe_subscription_id,
                "old_status": old_status,
                "new_status": status,
                "cancel_at_period_end": cancel_at_period_end,
            }
        )
        
        # Build update data
        update_data = {
            "status": status,
            "cancel_at_period_end": cancel_at_period_end,
        }
        
        new_tier = old_tier
        if price_id:
            new_tier = self._price_to_tier(price_id)
            update_data["stripe_price_id"] = price_id
            update_data["tier"] = new_tier
            logger.info(
                "Subscription tier changed",
                extra={
                    "stripe_subscription_id": stripe_subscription_id,
                    "old_tier": old_tier,
                    "new_tier": new_tier,
                }
            )
        
        if current_period_end:
            update_data["current_period_end"] = current_period_end.isoformat()
        
        # Update subscription
        result = self.supabase.table("subscriptions").update(update_data).eq(
            "stripe_subscription_id", stripe_subscription_id
        ).execute()
        
        if not result.data:
            logger.error(
                "Failed to update subscription",
                extra={"stripe_subscription_id": stripe_subscription_id}
            )
            return None
        
        # Sync user tier
        await self._sync_user_tier(current["user_id"], new_tier, status)
        
        # Log event
        await self.log_subscription_event(
            user_id=current["user_id"],
            event_type="subscription.updated",
            stripe_event_id=stripe_event_id,
            subscription_id=current["id"],
            old_tier=old_tier,
            new_tier=new_tier,
            old_status=old_status,
            new_status=status,
        )
        
        logger.info(
            "Subscription status updated successfully",
            extra={
                "subscription_id": current["id"],
                "new_status": status,
                "new_tier": new_tier,
            }
        )
        
        return Subscription.from_db_row(result.data[0]) if result.data else None
    
    async def deactivate_subscription(
        self,
        stripe_subscription_id: str,
        stripe_event_id: str,
    ) -> None:
        """
        Deactivate a subscription (subscription deleted in Stripe).
        
        Called when a subscription is fully deleted in Stripe.
        Updates subscription status to canceled and downgrades user to free tier.
        
        Args:
            stripe_subscription_id: Stripe subscription ID (sub_xxx)
            stripe_event_id: Stripe event ID for idempotency
        """
        # Get subscription
        result = self.supabase.table("subscriptions").select("*").eq(
            "stripe_subscription_id", stripe_subscription_id
        ).execute()
        
        if not result.data:
            logger.warning(
                "Subscription not found for deactivation",
                extra={"stripe_subscription_id": stripe_subscription_id}
            )
            return
        
        current = result.data[0]
        
        logger.info(
            "Deactivating subscription",
            extra={
                "subscription_id": current["id"],
                "user_id": current["user_id"],
                "old_tier": current["tier"],
            }
        )
        
        # Update status to canceled
        self.supabase.table("subscriptions").update({
            "status": "canceled",
        }).eq("stripe_subscription_id", stripe_subscription_id).execute()
        
        # Downgrade user to free
        await self._sync_user_tier(current["user_id"], "free", "none")
        
        # Log event
        await self.log_subscription_event(
            user_id=current["user_id"],
            event_type="subscription.deleted",
            stripe_event_id=stripe_event_id,
            subscription_id=current["id"],
            old_tier=current["tier"],
            new_tier="free",
            old_status=current["status"],
            new_status="canceled",
        )
        
        logger.info(
            "Subscription deactivated successfully",
            extra={
                "subscription_id": current["id"],
                "user_id": current["user_id"],
            }
        )
    
    async def get_user_subscription(self, user_id: str) -> Optional[Subscription]:
        """
        Get user's subscription record.
        
        Args:
            user_id: User ID
            
        Returns:
            Subscription or None if user has no subscription
        """
        result = self.supabase.table("subscriptions").select("*").eq(
            "user_id", user_id
        ).execute()
        
        if not result.data:
            logger.debug(
                "No subscription found for user",
                extra={"user_id": user_id}
            )
            return None
        
        return Subscription.from_db_row(result.data[0])
    
    async def get_subscription_status(self, user_id: str) -> SubscriptionStatus:
        """
        Get user's subscription status for API response.
        
        Provides a simplified view of subscription state including
        computed fields for upgrade/downgrade eligibility.
        
        Args:
            user_id: User ID
            
        Returns:
            SubscriptionStatus with full status info
        """
        subscription = await self.get_user_subscription(user_id)
        
        # No subscription or canceled = free tier
        if not subscription or subscription.status == "canceled":
            return SubscriptionStatus(
                has_subscription=False,
                tier="free",
                status="none",
                current_period_end=None,
                cancel_at_period_end=False,
                can_upgrade=True,
                can_downgrade=False,
            )
        
        return SubscriptionStatus(
            has_subscription=True,
            tier=subscription.tier,
            status=subscription.status,
            current_period_end=subscription.current_period_end,
            cancel_at_period_end=subscription.cancel_at_period_end,
            can_upgrade=subscription.tier == "pro",  # Pro can upgrade to Studio
            can_downgrade=subscription.tier == "studio",  # Studio can downgrade to Pro
        )
    
    async def _sync_user_tier(
        self,
        user_id: str,
        tier: str,
        status: str,
    ) -> None:
        """
        Sync user's subscription tier in users table.
        
        Ensures the user's subscription_tier and subscription_status
        fields are always in sync with their subscription record.
        
        Args:
            user_id: User ID
            tier: New tier (free, pro, studio)
            status: New subscription status (active, past_due, canceled, trialing, none)
        """
        # Map subscription status to user status
        user_status = "none"
        if status in ("active", "trialing"):
            user_status = "active"
        elif status == "past_due":
            user_status = "past_due"
        elif status == "canceled":
            user_status = "canceled"
        
        self.supabase.table("users").update({
            "subscription_tier": tier,
            "subscription_status": user_status,
        }).eq("id", user_id).execute()
        
        logger.info(
            "Synced user tier",
            extra={
                "user_id": user_id,
                "tier": tier,
                "status": user_status,
            }
        )


# =============================================================================
# Singleton Pattern
# =============================================================================

_subscription_service: Optional[SubscriptionService] = None


def get_subscription_service() -> SubscriptionService:
    """
    Get or create the subscription service singleton.
    
    Returns:
        SubscriptionService instance
        
    Example:
        ```python
        from backend.services.subscription_service import get_subscription_service
        
        service = get_subscription_service()
        status = await service.get_subscription_status(user_id)
        ```
    """
    global _subscription_service
    
    if _subscription_service is None:
        _subscription_service = SubscriptionService()
    
    return _subscription_service


# =============================================================================
# Module Exports
# =============================================================================

__all__ = [
    "SubscriptionService",
    "SubscriptionServiceError",
    "SubscriptionNotFoundError",
    "DuplicateEventError",
    "Subscription",
    "SubscriptionStatus",
    "get_subscription_service",
]
