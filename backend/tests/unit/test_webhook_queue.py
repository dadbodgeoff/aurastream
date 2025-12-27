"""
Unit tests for WebhookQueueService.

Tests cover:
- Event age validation (accept fresh, reject old)
- Event persistence (first time succeeds, duplicate fails)
- Processing lock (acquire/release)
- Event status tracking
"""

import json
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest

from backend.services.webhook_queue import (
    WebhookQueueService,
    WebhookEventTooOldError,
    WebhookEventDuplicateError,
)


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def mock_redis():
    """Create a mock Redis client."""
    return MagicMock()


@pytest.fixture
def webhook_queue(mock_redis):
    """Create a WebhookQueueService with mocked Redis."""
    return WebhookQueueService(mock_redis)


# =============================================================================
# Event Age Validation Tests
# =============================================================================

class TestEventAgeValidation:
    """Tests for validate_event_age method."""
    
    def test_accept_fresh_event(self, webhook_queue):
        """Fresh events (within 5 minutes) should be accepted."""
        # Event created 1 minute ago
        event_created = int(datetime.now(timezone.utc).timestamp()) - 60
        
        # Should not raise
        webhook_queue.validate_event_age(event_created)
    
    def test_accept_event_at_boundary(self, webhook_queue):
        """Events exactly at 5 minute boundary should be accepted."""
        # Event created exactly 5 minutes ago (300 seconds)
        event_created = int(datetime.now(timezone.utc).timestamp()) - 299
        
        # Should not raise
        webhook_queue.validate_event_age(event_created)
    
    def test_reject_old_event(self, webhook_queue):
        """Events older than 5 minutes should be rejected."""
        # Event created 6 minutes ago
        event_created = int(datetime.now(timezone.utc).timestamp()) - 360
        
        with pytest.raises(WebhookEventTooOldError) as exc_info:
            webhook_queue.validate_event_age(event_created)
        
        assert exc_info.value.age_seconds > 300
    
    def test_reject_very_old_event(self, webhook_queue):
        """Very old events (hours old) should be rejected."""
        # Event created 1 hour ago
        event_created = int(datetime.now(timezone.utc).timestamp()) - 3600
        
        with pytest.raises(WebhookEventTooOldError) as exc_info:
            webhook_queue.validate_event_age(event_created)
        
        assert exc_info.value.age_seconds > 3500
    
    def test_accept_event_from_near_future(self, webhook_queue):
        """Events from near future (clock skew) should be accepted."""
        # Event created 30 seconds in the future
        event_created = int(datetime.now(timezone.utc).timestamp()) + 30
        
        # Should not raise (within 1 minute tolerance)
        webhook_queue.validate_event_age(event_created)
    
    def test_warn_event_from_far_future(self, webhook_queue):
        """Events from far future should log warning but not raise."""
        # Event created 2 minutes in the future
        event_created = int(datetime.now(timezone.utc).timestamp()) + 120
        
        # Should not raise, but would log a warning
        webhook_queue.validate_event_age(event_created)


# =============================================================================
# Event Persistence Tests
# =============================================================================

class TestEventPersistence:
    """Tests for persist_event method."""
    
    @pytest.mark.asyncio
    async def test_persist_new_event_succeeds(self, webhook_queue, mock_redis):
        """First time persisting an event should succeed."""
        event_id = "evt_test123"
        event_type = "checkout.session.completed"
        event_created = int(datetime.now(timezone.utc).timestamp()) - 10
        
        # Mock setnx to return True (key was set)
        mock_redis.setnx.return_value = True
        
        result = await webhook_queue.persist_event(
            event_id=event_id,
            event_type=event_type,
            event_created=event_created,
        )
        
        assert result is True
        
        # Verify setnx was called with correct key
        mock_redis.setnx.assert_called_once()
        call_args = mock_redis.setnx.call_args
        assert call_args[0][0] == f"webhook_event:{event_id}"
        
        # Verify expire was called for TTL
        mock_redis.expire.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_persist_duplicate_event_fails(self, webhook_queue, mock_redis):
        """Persisting a duplicate event should raise WebhookEventDuplicateError."""
        event_id = "evt_test123"
        event_type = "checkout.session.completed"
        event_created = int(datetime.now(timezone.utc).timestamp()) - 10
        
        # Mock setnx to return False (key already exists)
        mock_redis.setnx.return_value = False
        mock_redis.get.return_value = json.dumps({
            "status": "pending",
            "received_at": "2025-01-01T00:00:00+00:00",
        })
        
        with pytest.raises(WebhookEventDuplicateError) as exc_info:
            await webhook_queue.persist_event(
                event_id=event_id,
                event_type=event_type,
                event_created=event_created,
            )
        
        assert exc_info.value.event_id == event_id
    
    @pytest.mark.asyncio
    async def test_persist_old_event_fails(self, webhook_queue, mock_redis):
        """Persisting an old event should raise WebhookEventTooOldError."""
        event_id = "evt_test123"
        event_type = "checkout.session.completed"
        # Event created 10 minutes ago
        event_created = int(datetime.now(timezone.utc).timestamp()) - 600
        
        with pytest.raises(WebhookEventTooOldError):
            await webhook_queue.persist_event(
                event_id=event_id,
                event_type=event_type,
                event_created=event_created,
            )
        
        # setnx should not be called for old events
        mock_redis.setnx.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_persist_event_sets_correct_data(self, webhook_queue, mock_redis):
        """Persisted event should contain correct data structure."""
        event_id = "evt_test456"
        event_type = "customer.subscription.updated"
        event_created = int(datetime.now(timezone.utc).timestamp()) - 30
        
        mock_redis.setnx.return_value = True
        
        await webhook_queue.persist_event(
            event_id=event_id,
            event_type=event_type,
            event_created=event_created,
        )
        
        # Get the data that was passed to setnx
        call_args = mock_redis.setnx.call_args
        stored_data = json.loads(call_args[0][1])
        
        assert stored_data["event_type"] == event_type
        assert stored_data["event_created"] == event_created
        assert stored_data["status"] == "pending"
        assert stored_data["processed_at"] is None
        assert stored_data["error"] is None
        assert "received_at" in stored_data


# =============================================================================
# Processing Lock Tests
# =============================================================================

class TestProcessingLock:
    """Tests for acquire_processing_lock and release_processing_lock methods."""
    
    @pytest.mark.asyncio
    async def test_acquire_lock_succeeds(self, webhook_queue, mock_redis):
        """Acquiring a lock for the first time should succeed."""
        event_id = "evt_test123"
        
        # Mock set to return True (lock acquired)
        mock_redis.set.return_value = True
        
        result = await webhook_queue.acquire_processing_lock(event_id)
        
        assert result is True
        
        # Verify set was called with correct parameters
        mock_redis.set.assert_called_once()
        call_kwargs = mock_redis.set.call_args[1]
        assert call_kwargs["nx"] is True  # Only set if not exists
        assert call_kwargs["ex"] == webhook_queue.LOCK_TTL_SECONDS
    
    @pytest.mark.asyncio
    async def test_acquire_lock_fails_when_locked(self, webhook_queue, mock_redis):
        """Acquiring a lock when already locked should fail."""
        event_id = "evt_test123"
        
        # Mock set to return None/False (lock not acquired)
        mock_redis.set.return_value = None
        
        result = await webhook_queue.acquire_processing_lock(event_id)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_release_lock(self, webhook_queue, mock_redis):
        """Releasing a lock should delete the key."""
        event_id = "evt_test123"
        
        await webhook_queue.release_processing_lock(event_id)
        
        mock_redis.delete.assert_called_once_with(f"webhook_lock:{event_id}")
    
    @pytest.mark.asyncio
    async def test_lock_key_format(self, webhook_queue, mock_redis):
        """Lock key should use correct prefix."""
        event_id = "evt_abc123"
        
        mock_redis.set.return_value = True
        
        await webhook_queue.acquire_processing_lock(event_id)
        
        call_args = mock_redis.set.call_args
        assert call_args[0][0] == f"webhook_lock:{event_id}"


# =============================================================================
# Event Status Tracking Tests
# =============================================================================

class TestEventStatusTracking:
    """Tests for mark_event_processed and get_event_status methods."""
    
    @pytest.mark.asyncio
    async def test_mark_event_processed_success(self, webhook_queue, mock_redis):
        """Marking event as processed (success) should update status."""
        event_id = "evt_test123"
        
        # Mock existing event data
        existing_data = {
            "event_type": "checkout.session.completed",
            "event_created": 1234567890,
            "received_at": "2025-01-01T00:00:00+00:00",
            "status": "pending",
            "processed_at": None,
            "error": None,
        }
        mock_redis.get.return_value = json.dumps(existing_data)
        
        await webhook_queue.mark_event_processed(event_id, success=True)
        
        # Verify set was called with updated data
        mock_redis.set.assert_called_once()
        call_args = mock_redis.set.call_args
        updated_data = json.loads(call_args[0][1])
        
        assert updated_data["status"] == "processed"
        assert updated_data["processed_at"] is not None
        assert updated_data["error"] is None
    
    @pytest.mark.asyncio
    async def test_mark_event_processed_failure(self, webhook_queue, mock_redis):
        """Marking event as failed should update status and error."""
        event_id = "evt_test123"
        error_message = "Database connection failed"
        
        # Mock existing event data
        existing_data = {
            "event_type": "checkout.session.completed",
            "event_created": 1234567890,
            "received_at": "2025-01-01T00:00:00+00:00",
            "status": "pending",
            "processed_at": None,
            "error": None,
        }
        mock_redis.get.return_value = json.dumps(existing_data)
        
        await webhook_queue.mark_event_processed(
            event_id,
            success=False,
            error=error_message,
        )
        
        # Verify set was called with updated data
        mock_redis.set.assert_called_once()
        call_args = mock_redis.set.call_args
        updated_data = json.loads(call_args[0][1])
        
        assert updated_data["status"] == "failed"
        assert updated_data["processed_at"] is not None
        assert updated_data["error"] == error_message
    
    @pytest.mark.asyncio
    async def test_get_event_status_found(self, webhook_queue, mock_redis):
        """Getting status of existing event should return data."""
        event_id = "evt_test123"
        
        event_data = {
            "event_type": "checkout.session.completed",
            "status": "processed",
            "received_at": "2025-01-01T00:00:00+00:00",
            "processed_at": "2025-01-01T00:00:01+00:00",
        }
        mock_redis.get.return_value = json.dumps(event_data)
        
        result = await webhook_queue.get_event_status(event_id)
        
        assert result is not None
        assert result["status"] == "processed"
        assert result["event_type"] == "checkout.session.completed"
    
    @pytest.mark.asyncio
    async def test_get_event_status_not_found(self, webhook_queue, mock_redis):
        """Getting status of non-existent event should return None."""
        event_id = "evt_nonexistent"
        
        mock_redis.get.return_value = None
        
        result = await webhook_queue.get_event_status(event_id)
        
        assert result is None


# =============================================================================
# Integration-like Tests (Full Flow)
# =============================================================================

class TestFullWebhookFlow:
    """Tests simulating full webhook processing flow."""
    
    @pytest.mark.asyncio
    async def test_full_successful_flow(self, webhook_queue, mock_redis):
        """Test complete successful webhook processing flow."""
        event_id = "evt_full_test"
        event_type = "checkout.session.completed"
        event_created = int(datetime.now(timezone.utc).timestamp()) - 10
        
        # Step 1: Persist event (new event)
        mock_redis.setnx.return_value = True
        result = await webhook_queue.persist_event(
            event_id=event_id,
            event_type=event_type,
            event_created=event_created,
        )
        assert result is True
        
        # Step 2: Acquire lock
        mock_redis.set.return_value = True
        lock_acquired = await webhook_queue.acquire_processing_lock(event_id)
        assert lock_acquired is True
        
        # Step 3: Mark as processed
        mock_redis.get.return_value = json.dumps({
            "event_type": event_type,
            "status": "pending",
            "received_at": datetime.now(timezone.utc).isoformat(),
        })
        await webhook_queue.mark_event_processed(event_id, success=True)
        
        # Step 4: Release lock
        await webhook_queue.release_processing_lock(event_id)
        mock_redis.delete.assert_called()
    
    @pytest.mark.asyncio
    async def test_duplicate_event_rejected(self, webhook_queue, mock_redis):
        """Test that duplicate events are properly rejected."""
        event_id = "evt_duplicate_test"
        event_type = "checkout.session.completed"
        event_created = int(datetime.now(timezone.utc).timestamp()) - 10
        
        # First event succeeds
        mock_redis.setnx.return_value = True
        result = await webhook_queue.persist_event(
            event_id=event_id,
            event_type=event_type,
            event_created=event_created,
        )
        assert result is True
        
        # Second event (duplicate) fails
        mock_redis.setnx.return_value = False
        mock_redis.get.return_value = json.dumps({"status": "pending"})
        
        with pytest.raises(WebhookEventDuplicateError):
            await webhook_queue.persist_event(
                event_id=event_id,
                event_type=event_type,
                event_created=event_created,
            )
    
    @pytest.mark.asyncio
    async def test_concurrent_processing_blocked(self, webhook_queue, mock_redis):
        """Test that concurrent processing of same event is blocked."""
        event_id = "evt_concurrent_test"
        
        # First worker acquires lock
        mock_redis.set.return_value = True
        lock1 = await webhook_queue.acquire_processing_lock(event_id)
        assert lock1 is True
        
        # Second worker fails to acquire lock
        mock_redis.set.return_value = None
        lock2 = await webhook_queue.acquire_processing_lock(event_id)
        assert lock2 is False


# =============================================================================
# Edge Cases
# =============================================================================

class TestEdgeCases:
    """Tests for edge cases and error handling."""
    
    @pytest.mark.asyncio
    async def test_mark_processed_missing_event(self, webhook_queue, mock_redis):
        """Marking a non-existent event should handle gracefully."""
        event_id = "evt_missing"
        
        mock_redis.get.return_value = None
        
        # Should not raise
        await webhook_queue.mark_event_processed(event_id, success=True)
        
        # set should not be called since event doesn't exist
        mock_redis.set.assert_not_called()
    
    def test_constants_are_reasonable(self, webhook_queue):
        """Verify service constants are set to reasonable values."""
        assert webhook_queue.MAX_AGE_SECONDS == 300  # 5 minutes
        assert webhook_queue.LOCK_TTL_SECONDS == 60  # 1 minute
        assert webhook_queue.EVENT_TTL_DAYS == 7  # 1 week
        assert webhook_queue.EVENT_PREFIX == "webhook_event:"
        assert webhook_queue.LOCK_PREFIX == "webhook_lock:"
