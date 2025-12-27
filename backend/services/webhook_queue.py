"""
Webhook Queue Service for race condition prevention.

This service provides:
1. Event age validation (reject events >5 min old - replay attack prevention)
2. Idempotent event persistence BEFORE processing
3. Processing locks to prevent concurrent handling
4. Event status tracking for debugging

Security Pattern:
1. Validate event timestamp (reject old events)
2. Persist event ID BEFORE any processing (atomic idempotency)
3. Acquire processing lock
4. Process event
5. Mark as processed/failed
6. Release lock
"""

import logging
from datetime import datetime, timezone
from typing import Optional
import json

import redis

logger = logging.getLogger(__name__)


class WebhookEventTooOldError(Exception):
    """Raised when webhook event is too old (potential replay attack)."""
    def __init__(self, event_id: str, age_seconds: float):
        self.event_id = event_id
        self.age_seconds = age_seconds
        super().__init__(f"Event {event_id} is {age_seconds:.1f}s old (max 300s)")


class WebhookEventDuplicateError(Exception):
    """Raised when webhook event was already received."""
    def __init__(self, event_id: str):
        self.event_id = event_id
        super().__init__(f"Event {event_id} already received")


class WebhookQueueService:
    """
    Redis-backed webhook event queue for race condition prevention.
    
    Keys:
    - webhook_event:{event_id} -> Hash with status, received_at, processed_at, error
    - webhook_lock:{event_id} -> Lock during processing
    
    TTL: Events kept for 7 days for debugging
    """
    
    EVENT_PREFIX = "webhook_event:"
    LOCK_PREFIX = "webhook_lock:"
    MAX_AGE_SECONDS = 300  # 5 minutes
    LOCK_TTL_SECONDS = 60  # 1 minute processing timeout
    EVENT_TTL_DAYS = 7
    
    def __init__(self, redis_client: redis.Redis):
        """
        Initialize webhook queue with Redis client.
        
        Args:
            redis_client: Redis client instance
        """
        self.redis = redis_client
        logger.info("WebhookQueueService initialized")
    
    def validate_event_age(self, event_created: int) -> None:
        """
        Validate event is not too old (replay attack prevention).
        
        Stripe events include a 'created' timestamp. Events older than
        MAX_AGE_SECONDS are rejected to prevent replay attacks.
        
        Args:
            event_created: Unix timestamp from Stripe event
            
        Raises:
            WebhookEventTooOldError: If event is too old
        """
        now = datetime.now(timezone.utc).timestamp()
        age = now - event_created
        
        if age > self.MAX_AGE_SECONDS:
            logger.warning(
                "Webhook event too old, rejecting (potential replay attack)",
                extra={
                    "age_seconds": age,
                    "max_age": self.MAX_AGE_SECONDS,
                    "event_created": event_created,
                }
            )
            raise WebhookEventTooOldError("unknown", age)
        
        if age < -60:  # Event from future (clock skew tolerance: 1 min)
            logger.warning(
                "Webhook event from future, possible clock skew",
                extra={"age_seconds": age, "event_created": event_created}
            )
    
    async def persist_event(
        self,
        event_id: str,
        event_type: str,
        event_created: int,
    ) -> bool:
        """
        Persist event BEFORE processing for idempotency.
        
        This is the key to preventing race conditions:
        - Use SETNX (set if not exists) for atomic check-and-set
        - If event already exists, it's a duplicate
        - Persist BEFORE any business logic runs
        
        Args:
            event_id: Stripe event ID (evt_xxx)
            event_type: Stripe event type (e.g., checkout.session.completed)
            event_created: Unix timestamp when event was created
            
        Returns:
            True if event was persisted (new event)
            
        Raises:
            WebhookEventDuplicateError: If event already exists
            WebhookEventTooOldError: If event is too old
        """
        # Validate age first
        self.validate_event_age(event_created)
        
        key = f"{self.EVENT_PREFIX}{event_id}"
        
        # Atomic check-and-set
        event_data = json.dumps({
            "event_type": event_type,
            "event_created": event_created,
            "received_at": datetime.now(timezone.utc).isoformat(),
            "status": "pending",
            "processed_at": None,
            "error": None,
        })
        
        was_set = self.redis.setnx(key, event_data)
        
        if was_set:
            # Set TTL for cleanup
            self.redis.expire(key, self.EVENT_TTL_DAYS * 86400)
            logger.info(
                "Webhook event persisted",
                extra={"event_id": event_id, "event_type": event_type}
            )
            return True
        
        # Event already exists - check if it's still processing or completed
        existing = self.redis.get(key)
        if existing:
            existing_data = json.loads(existing)
            status = existing_data.get("status", "unknown")
            logger.info(
                "Duplicate webhook event",
                extra={
                    "event_id": event_id,
                    "existing_status": status,
                    "received_at": existing_data.get("received_at"),
                }
            )
        
        raise WebhookEventDuplicateError(event_id)
    
    async def acquire_processing_lock(self, event_id: str) -> bool:
        """
        Acquire lock for processing an event.
        
        Prevents concurrent processing of the same event if Stripe
        sends duplicate webhooks simultaneously.
        
        Args:
            event_id: Stripe event ID
            
        Returns:
            True if lock acquired, False if already locked
        """
        lock_key = f"{self.LOCK_PREFIX}{event_id}"
        
        acquired = self.redis.set(
            lock_key,
            datetime.now(timezone.utc).isoformat(),
            nx=True,  # Only set if not exists
            ex=self.LOCK_TTL_SECONDS,  # Auto-expire
        )
        
        if acquired:
            logger.debug("Acquired processing lock", extra={"event_id": event_id})
        else:
            logger.warning(
                "Failed to acquire processing lock (already processing)",
                extra={"event_id": event_id}
            )
        
        return bool(acquired)
    
    async def release_processing_lock(self, event_id: str) -> None:
        """
        Release processing lock after completion.
        
        Args:
            event_id: Stripe event ID
        """
        lock_key = f"{self.LOCK_PREFIX}{event_id}"
        self.redis.delete(lock_key)
        logger.debug("Released processing lock", extra={"event_id": event_id})
    
    async def mark_event_processed(
        self,
        event_id: str,
        success: bool,
        error: Optional[str] = None,
    ) -> None:
        """
        Mark event as processed (success or failure).
        
        Args:
            event_id: Stripe event ID
            success: Whether processing succeeded
            error: Error message if failed
        """
        key = f"{self.EVENT_PREFIX}{event_id}"
        
        # Get existing data
        existing = self.redis.get(key)
        if existing:
            data = json.loads(existing)
            data["status"] = "processed" if success else "failed"
            data["processed_at"] = datetime.now(timezone.utc).isoformat()
            if error:
                data["error"] = error
            
            self.redis.set(key, json.dumps(data))
            self.redis.expire(key, self.EVENT_TTL_DAYS * 86400)
        
        logger.info(
            "Webhook event marked as processed",
            extra={
                "event_id": event_id,
                "success": success,
                "error": error,
            }
        )
    
    async def get_event_status(self, event_id: str) -> Optional[dict]:
        """
        Get the status of a webhook event.
        
        Args:
            event_id: Stripe event ID
            
        Returns:
            Event data dict or None if not found
        """
        key = f"{self.EVENT_PREFIX}{event_id}"
        data = self.redis.get(key)
        
        if data:
            return json.loads(data)
        return None


# Singleton instance
_webhook_queue: Optional[WebhookQueueService] = None


def get_webhook_queue() -> WebhookQueueService:
    """
    Get or create the webhook queue singleton.
    
    Returns:
        WebhookQueueService instance
    """
    global _webhook_queue
    
    if _webhook_queue is None:
        from backend.api.config import get_settings
        settings = get_settings()
        
        redis_client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
        )
        
        _webhook_queue = WebhookQueueService(redis_client)
    
    return _webhook_queue


__all__ = [
    "WebhookQueueService",
    "WebhookEventTooOldError",
    "WebhookEventDuplicateError",
    "get_webhook_queue",
]
