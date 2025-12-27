"""
Unit tests for the Subscription Service.

Tests cover:
- Getting subscription status for different user tiers
- Activating subscriptions
- Updating subscription status
- Deactivating subscriptions
- Event idempotency checking
- Price ID to tier mapping
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone, timedelta
from backend.services.subscription_service import (
    SubscriptionService,
    Subscription,
    SubscriptionStatus,
    get_subscription_service,
)


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def mock_supabase():
    """Create a mock Supabase client."""
    with patch('backend.services.subscription_service.get_supabase_client') as mock:
        client = MagicMock()
        mock.return_value = client
        yield client


@pytest.fixture
def mock_settings():
    """Create mock settings for price ID mapping."""
    with patch('backend.services.subscription_service.get_settings') as mock:
        settings = MagicMock()
        settings.STRIPE_PRICE_PRO = "price_pro_123"
        settings.STRIPE_PRICE_STUDIO = "price_studio_456"
        mock.return_value = settings
        yield settings


@pytest.fixture
def service(mock_supabase, mock_settings):
    """Create a SubscriptionService with mocked dependencies."""
    return SubscriptionService()


@pytest.fixture
def sample_subscription_row():
    """Sample subscription database row."""
    now = datetime.now(timezone.utc)
    return {
        "id": "sub-uuid-123",
        "user_id": "user-uuid-456",
        "stripe_subscription_id": "sub_stripe_789",
        "stripe_customer_id": "cus_stripe_abc",
        "stripe_price_id": "price_pro_123",
        "tier": "pro",
        "status": "active",
        "current_period_start": now.isoformat(),
        "current_period_end": (now + timedelta(days=30)).isoformat(),
        "cancel_at_period_end": False,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }


@pytest.fixture
def sample_studio_subscription_row():
    """Sample studio subscription database row."""
    now = datetime.now(timezone.utc)
    return {
        "id": "sub-uuid-studio",
        "user_id": "user-uuid-studio",
        "stripe_subscription_id": "sub_stripe_studio",
        "stripe_customer_id": "cus_stripe_studio",
        "stripe_price_id": "price_studio_456",
        "tier": "studio",
        "status": "active",
        "current_period_start": now.isoformat(),
        "current_period_end": (now + timedelta(days=30)).isoformat(),
        "cancel_at_period_end": False,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }


@pytest.fixture
def sample_canceled_subscription_row():
    """Sample canceled subscription database row."""
    now = datetime.now(timezone.utc)
    return {
        "id": "sub-uuid-canceled",
        "user_id": "user-uuid-canceled",
        "stripe_subscription_id": "sub_stripe_canceled",
        "stripe_customer_id": "cus_stripe_canceled",
        "stripe_price_id": "price_pro_123",
        "tier": "pro",
        "status": "canceled",
        "current_period_start": (now - timedelta(days=30)).isoformat(),
        "current_period_end": now.isoformat(),
        "cancel_at_period_end": True,
        "created_at": (now - timedelta(days=60)).isoformat(),
        "updated_at": now.isoformat(),
    }


# =============================================================================
# Subscription Status Tests
# =============================================================================

class TestGetSubscriptionStatus:
    """Tests for get_subscription_status method."""

    @pytest.mark.asyncio
    async def test_get_subscription_status_free_user(self, service, mock_supabase):
        """Test that user with no subscription returns free tier status."""
        # Setup: No subscription found
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        status = await service.get_subscription_status("user-uuid-free")

        assert status.has_subscription is False
        assert status.tier == "free"
        assert status.status == "none"
        assert status.current_period_end is None
        assert status.cancel_at_period_end is False
        assert status.can_upgrade is True
        assert status.can_downgrade is False

    @pytest.mark.asyncio
    async def test_get_subscription_status_pro_user(
        self, service, mock_supabase, sample_subscription_row
    ):
        """Test that user with pro subscription returns correct status."""
        # Setup: Pro subscription found
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_subscription_row]
        )

        status = await service.get_subscription_status("user-uuid-456")

        assert status.has_subscription is True
        assert status.tier == "pro"
        assert status.status == "active"
        assert status.current_period_end is not None
        assert status.cancel_at_period_end is False
        assert status.can_upgrade is True  # Pro can upgrade to Studio
        assert status.can_downgrade is False  # Pro cannot downgrade

    @pytest.mark.asyncio
    async def test_get_subscription_status_studio_user(
        self, service, mock_supabase, sample_studio_subscription_row
    ):
        """Test that user with studio subscription returns correct status."""
        # Setup: Studio subscription found
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_studio_subscription_row]
        )

        status = await service.get_subscription_status("user-uuid-studio")

        assert status.has_subscription is True
        assert status.tier == "studio"
        assert status.status == "active"
        assert status.current_period_end is not None
        assert status.cancel_at_period_end is False
        assert status.can_upgrade is False  # Studio is highest tier
        assert status.can_downgrade is True  # Studio can downgrade to Pro

    @pytest.mark.asyncio
    async def test_get_subscription_status_canceled(
        self, service, mock_supabase, sample_canceled_subscription_row
    ):
        """Test that canceled subscription returns free tier status."""
        # Setup: Canceled subscription found
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_canceled_subscription_row]
        )

        status = await service.get_subscription_status("user-uuid-canceled")

        # Canceled subscriptions should return free tier
        assert status.has_subscription is False
        assert status.tier == "free"
        assert status.status == "none"
        assert status.current_period_end is None
        assert status.can_upgrade is True
        assert status.can_downgrade is False


# =============================================================================
# Activate Subscription Tests
# =============================================================================

class TestActivateSubscription:
    """Tests for activate_subscription method."""

    @pytest.mark.asyncio
    async def test_activate_subscription(self, service, mock_supabase, mock_settings):
        """Test activating subscription creates record and syncs user tier."""
        now = datetime.now(timezone.utc)
        period_end = now + timedelta(days=30)

        # Setup: Upsert returns new subscription
        created_row = {
            "id": "new-sub-uuid",
            "user_id": "user-uuid-new",
            "stripe_subscription_id": "sub_new_123",
            "stripe_customer_id": "cus_new_456",
            "stripe_price_id": "price_pro_123",
            "tier": "pro",
            "status": "active",
            "current_period_start": now.isoformat(),
            "current_period_end": period_end.isoformat(),
            "cancel_at_period_end": False,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        mock_supabase.table.return_value.upsert.return_value.execute.return_value = MagicMock(
            data=[created_row]
        )
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "user-uuid-new"}]
        )
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "event-uuid"}]
        )

        subscription = await service.activate_subscription(
            user_id="user-uuid-new",
            stripe_subscription_id="sub_new_123",
            stripe_customer_id="cus_new_456",
            price_id="price_pro_123",
            current_period_start=now,
            current_period_end=period_end,
            stripe_event_id="evt_activate_123",
        )

        assert subscription.id == "new-sub-uuid"
        assert subscription.user_id == "user-uuid-new"
        assert subscription.tier == "pro"
        assert subscription.status == "active"

        # Verify upsert was called with correct data
        mock_supabase.table.assert_any_call("subscriptions")

    @pytest.mark.asyncio
    async def test_activate_subscription_studio_tier(
        self, service, mock_supabase, mock_settings
    ):
        """Test activating studio subscription maps price correctly."""
        now = datetime.now(timezone.utc)
        period_end = now + timedelta(days=30)

        # Setup: Upsert returns studio subscription
        created_row = {
            "id": "studio-sub-uuid",
            "user_id": "user-uuid-studio",
            "stripe_subscription_id": "sub_studio_123",
            "stripe_customer_id": "cus_studio_456",
            "stripe_price_id": "price_studio_456",
            "tier": "studio",
            "status": "active",
            "current_period_start": now.isoformat(),
            "current_period_end": period_end.isoformat(),
            "cancel_at_period_end": False,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        mock_supabase.table.return_value.upsert.return_value.execute.return_value = MagicMock(
            data=[created_row]
        )
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "user-uuid-studio"}]
        )
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "event-uuid"}]
        )

        subscription = await service.activate_subscription(
            user_id="user-uuid-studio",
            stripe_subscription_id="sub_studio_123",
            stripe_customer_id="cus_studio_456",
            price_id="price_studio_456",  # Studio price ID
            current_period_start=now,
            current_period_end=period_end,
            stripe_event_id="evt_activate_studio",
        )

        assert subscription.tier == "studio"


# =============================================================================
# Update Subscription Status Tests
# =============================================================================

class TestUpdateSubscriptionStatus:
    """Tests for update_subscription_status method."""

    @pytest.mark.asyncio
    async def test_update_subscription_status(
        self, service, mock_supabase, sample_subscription_row
    ):
        """Test updating subscription status works correctly."""
        # Setup: Find existing subscription
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_subscription_row]
        )

        # Setup: Update returns updated row
        updated_row = {**sample_subscription_row, "status": "past_due"}
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[updated_row]
        )
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "event-uuid"}]
        )

        subscription = await service.update_subscription_status(
            stripe_subscription_id="sub_stripe_789",
            status="past_due",
            cancel_at_period_end=False,
            stripe_event_id="evt_update_123",
        )

        assert subscription is not None
        assert subscription.status == "past_due"

    @pytest.mark.asyncio
    async def test_update_subscription_status_not_found(self, service, mock_supabase):
        """Test updating non-existent subscription returns None."""
        # Setup: No subscription found
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        subscription = await service.update_subscription_status(
            stripe_subscription_id="sub_nonexistent",
            status="active",
            cancel_at_period_end=False,
            stripe_event_id="evt_update_notfound",
        )

        assert subscription is None

    @pytest.mark.asyncio
    async def test_update_subscription_status_with_tier_change(
        self, service, mock_supabase, sample_subscription_row
    ):
        """Test updating subscription with tier change."""
        # Setup: Find existing pro subscription
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_subscription_row]
        )

        # Setup: Update returns upgraded row
        updated_row = {
            **sample_subscription_row,
            "tier": "studio",
            "stripe_price_id": "price_studio_456",
        }
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[updated_row]
        )
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "event-uuid"}]
        )

        subscription = await service.update_subscription_status(
            stripe_subscription_id="sub_stripe_789",
            status="active",
            cancel_at_period_end=False,
            stripe_event_id="evt_upgrade_123",
            price_id="price_studio_456",  # Upgrade to studio
        )

        assert subscription is not None
        assert subscription.tier == "studio"


# =============================================================================
# Deactivate Subscription Tests
# =============================================================================

class TestDeactivateSubscription:
    """Tests for deactivate_subscription method."""

    @pytest.mark.asyncio
    async def test_deactivate_subscription(
        self, service, mock_supabase, sample_subscription_row
    ):
        """Test deactivating subscription downgrades to free tier."""
        # Setup: Find existing subscription
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_subscription_row]
        )

        # Setup: Update and user sync
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{**sample_subscription_row, "status": "canceled"}]
        )
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "event-uuid"}]
        )

        await service.deactivate_subscription(
            stripe_subscription_id="sub_stripe_789",
            stripe_event_id="evt_deactivate_123",
        )

        # Verify subscription was updated to canceled
        mock_supabase.table.assert_any_call("subscriptions")

    @pytest.mark.asyncio
    async def test_deactivate_subscription_not_found(self, service, mock_supabase):
        """Test deactivating non-existent subscription does nothing."""
        # Setup: No subscription found
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        # Should not raise an error
        await service.deactivate_subscription(
            stripe_subscription_id="sub_nonexistent",
            stripe_event_id="evt_deactivate_notfound",
        )


# =============================================================================
# Event Idempotency Tests
# =============================================================================

class TestCheckEventProcessed:
    """Tests for check_event_processed method."""

    @pytest.mark.asyncio
    async def test_check_event_processed_new(self, service, mock_supabase):
        """Test that new event returns False (not processed)."""
        # Setup: No event found
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        is_processed = await service.check_event_processed("evt_new_123")

        assert is_processed is False

    @pytest.mark.asyncio
    async def test_check_event_processed_duplicate(self, service, mock_supabase):
        """Test that duplicate event returns True (already processed)."""
        # Setup: Event found
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "event-uuid-existing"}]
        )

        is_processed = await service.check_event_processed("evt_duplicate_123")

        assert is_processed is True


# =============================================================================
# Price to Tier Mapping Tests
# =============================================================================

class TestPriceToTierMapping:
    """Tests for price ID to tier mapping."""

    def test_price_to_tier_mapping_pro(self, service, mock_settings):
        """Test that pro price ID maps to pro tier."""
        tier = service._price_to_tier("price_pro_123")
        assert tier == "pro"

    def test_price_to_tier_mapping_studio(self, service, mock_settings):
        """Test that studio price ID maps to studio tier."""
        tier = service._price_to_tier("price_studio_456")
        assert tier == "studio"

    def test_price_to_tier_mapping_unknown(self, service, mock_settings):
        """Test that unknown price ID defaults to pro tier."""
        tier = service._price_to_tier("price_unknown_999")
        assert tier == "pro"  # Default fallback


# =============================================================================
# Subscription Data Class Tests
# =============================================================================

class TestSubscriptionDataClass:
    """Tests for Subscription dataclass."""

    def test_subscription_from_db_row(self, sample_subscription_row):
        """Test creating Subscription from database row."""
        subscription = Subscription.from_db_row(sample_subscription_row)

        assert subscription.id == "sub-uuid-123"
        assert subscription.user_id == "user-uuid-456"
        assert subscription.stripe_subscription_id == "sub_stripe_789"
        assert subscription.stripe_customer_id == "cus_stripe_abc"
        assert subscription.tier == "pro"
        assert subscription.status == "active"
        assert subscription.cancel_at_period_end is False
        assert isinstance(subscription.current_period_start, datetime)
        assert isinstance(subscription.current_period_end, datetime)
        assert isinstance(subscription.created_at, datetime)
        assert isinstance(subscription.updated_at, datetime)

    def test_subscription_from_db_row_with_z_suffix(self):
        """Test parsing datetime with Z suffix."""
        row = {
            "id": "sub-uuid",
            "user_id": "user-uuid",
            "stripe_subscription_id": "sub_123",
            "stripe_customer_id": "cus_123",
            "stripe_price_id": "price_123",
            "tier": "pro",
            "status": "active",
            "current_period_start": "2024-01-01T00:00:00Z",
            "current_period_end": "2024-02-01T00:00:00Z",
            "cancel_at_period_end": False,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        }

        subscription = Subscription.from_db_row(row)

        assert subscription.current_period_start.tzinfo is not None


# =============================================================================
# SubscriptionStatus Data Class Tests
# =============================================================================

class TestSubscriptionStatusDataClass:
    """Tests for SubscriptionStatus dataclass."""

    def test_subscription_status_free_user(self):
        """Test SubscriptionStatus for free user."""
        status = SubscriptionStatus(
            has_subscription=False,
            tier="free",
            status="none",
            current_period_end=None,
            cancel_at_period_end=False,
            can_upgrade=True,
            can_downgrade=False,
        )

        assert status.has_subscription is False
        assert status.tier == "free"
        assert status.can_upgrade is True
        assert status.can_downgrade is False

    def test_subscription_status_pro_user(self):
        """Test SubscriptionStatus for pro user."""
        period_end = datetime.now(timezone.utc) + timedelta(days=30)
        status = SubscriptionStatus(
            has_subscription=True,
            tier="pro",
            status="active",
            current_period_end=period_end,
            cancel_at_period_end=False,
            can_upgrade=True,
            can_downgrade=False,
        )

        assert status.has_subscription is True
        assert status.tier == "pro"
        assert status.can_upgrade is True  # Can upgrade to studio
        assert status.can_downgrade is False

    def test_subscription_status_studio_user(self):
        """Test SubscriptionStatus for studio user."""
        period_end = datetime.now(timezone.utc) + timedelta(days=30)
        status = SubscriptionStatus(
            has_subscription=True,
            tier="studio",
            status="active",
            current_period_end=period_end,
            cancel_at_period_end=False,
            can_upgrade=False,
            can_downgrade=True,
        )

        assert status.has_subscription is True
        assert status.tier == "studio"
        assert status.can_upgrade is False  # Already highest tier
        assert status.can_downgrade is True  # Can downgrade to pro


# =============================================================================
# Singleton Tests
# =============================================================================

class TestGetSubscriptionService:
    """Tests for get_subscription_service singleton."""

    def test_returns_service(self, mock_supabase, mock_settings):
        """Test that get_subscription_service returns a service."""
        # Reset singleton for test
        import backend.services.subscription_service as module
        module._subscription_service = None

        service = get_subscription_service()
        assert isinstance(service, SubscriptionService)

    def test_returns_same_instance(self, mock_supabase, mock_settings):
        """Test that get_subscription_service returns singleton."""
        # Reset singleton for test
        import backend.services.subscription_service as module
        module._subscription_service = None

        service1 = get_subscription_service()
        service2 = get_subscription_service()
        assert service1 is service2


# =============================================================================
# Edge Cases Tests
# =============================================================================

class TestEdgeCases:
    """Edge case tests for SubscriptionService."""

    @pytest.mark.asyncio
    async def test_get_subscription_status_past_due(self, service, mock_supabase):
        """Test subscription status for past_due subscription."""
        now = datetime.now(timezone.utc)
        past_due_row = {
            "id": "sub-uuid-pastdue",
            "user_id": "user-uuid-pastdue",
            "stripe_subscription_id": "sub_pastdue",
            "stripe_customer_id": "cus_pastdue",
            "stripe_price_id": "price_pro_123",
            "tier": "pro",
            "status": "past_due",
            "current_period_start": now.isoformat(),
            "current_period_end": (now + timedelta(days=30)).isoformat(),
            "cancel_at_period_end": False,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[past_due_row]
        )

        status = await service.get_subscription_status("user-uuid-pastdue")

        assert status.has_subscription is True
        assert status.tier == "pro"
        assert status.status == "past_due"

    @pytest.mark.asyncio
    async def test_get_subscription_status_trialing(self, service, mock_supabase):
        """Test subscription status for trialing subscription."""
        now = datetime.now(timezone.utc)
        trialing_row = {
            "id": "sub-uuid-trial",
            "user_id": "user-uuid-trial",
            "stripe_subscription_id": "sub_trial",
            "stripe_customer_id": "cus_trial",
            "stripe_price_id": "price_pro_123",
            "tier": "pro",
            "status": "trialing",
            "current_period_start": now.isoformat(),
            "current_period_end": (now + timedelta(days=14)).isoformat(),
            "cancel_at_period_end": False,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[trialing_row]
        )

        status = await service.get_subscription_status("user-uuid-trial")

        assert status.has_subscription is True
        assert status.tier == "pro"
        assert status.status == "trialing"

    @pytest.mark.asyncio
    async def test_activate_subscription_fails_on_db_error(
        self, service, mock_supabase
    ):
        """Test that activate_subscription raises on database error."""
        now = datetime.now(timezone.utc)

        # Setup: Upsert returns empty data (failure)
        mock_supabase.table.return_value.upsert.return_value.execute.return_value = MagicMock(
            data=[]
        )

        with pytest.raises(Exception, match="Failed to create subscription record"):
            await service.activate_subscription(
                user_id="user-uuid-fail",
                stripe_subscription_id="sub_fail",
                stripe_customer_id="cus_fail",
                price_id="price_pro_123",
                current_period_start=now,
                current_period_end=now + timedelta(days=30),
                stripe_event_id="evt_fail",
            )

    @pytest.mark.asyncio
    async def test_log_subscription_event_handles_error(
        self, service, mock_supabase
    ):
        """Test that log_subscription_event handles errors gracefully."""
        # Setup: Insert raises an exception
        mock_supabase.table.return_value.insert.return_value.execute.side_effect = Exception(
            "Database error"
        )

        # Should not raise - errors are logged but not propagated
        await service.log_subscription_event(
            user_id="user-uuid",
            event_type="test.event",
            stripe_event_id="evt_test",
        )
