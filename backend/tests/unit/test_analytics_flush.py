"""
Unit tests for Analytics Service flush functionality.

Tests the flush_to_postgres and get_popular_asset_types methods.
"""

import json
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch

import pytest

from backend.services.analytics_service import (
    AnalyticsService,
    LAST_FLUSH_KEY,
    FLUSH_LOCK_KEY,
    ASSET_GENERATION_EVENTS,
    ASSET_VIEW_EVENTS,
    ASSET_SHARE_EVENTS,
)


class TestAnalyticsFlush:
    """Tests for the flush_to_postgres method."""
    
    @pytest.fixture
    def mock_redis(self):
        """Create a mock Redis client."""
        redis_mock = MagicMock()
        redis_mock.ping.return_value = True
        return redis_mock
    
    @pytest.fixture
    def mock_supabase(self):
        """Create a mock Supabase client."""
        supabase_mock = MagicMock()
        return supabase_mock
    
    @pytest.fixture
    def analytics_service(self, mock_redis, mock_supabase):
        """Create an AnalyticsService with mocked dependencies."""
        with patch('redis.from_url', return_value=mock_redis):
            service = AnalyticsService(supabase_client=mock_supabase)
            return service
    
    def test_flush_skipped_when_too_soon(self, analytics_service, mock_redis):
        """Test that flush is skipped if less than 1 hour since last flush."""
        # Set last flush to 30 minutes ago
        last_flush = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
        mock_redis.get.return_value = last_flush
        
        result = analytics_service.flush_to_postgres(force=False)
        
        assert result["skipped"] is True
        assert result["reason"] == "too_soon"
        assert result["last_flush"] == last_flush
    
    def test_flush_proceeds_when_forced(self, analytics_service, mock_redis, mock_supabase):
        """Test that flush proceeds when force=True even if too soon."""
        # Set last flush to 30 minutes ago
        last_flush = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
        mock_redis.get.return_value = last_flush
        mock_redis.set.return_value = True  # Lock acquired
        mock_redis.hgetall.return_value = {}  # No events
        mock_redis.pipeline.return_value = MagicMock()
        
        result = analytics_service.flush_to_postgres(force=True)
        
        assert result.get("skipped") is not True
        assert result["events_flushed"] == 0
    
    def test_flush_skipped_when_lock_held(self, analytics_service, mock_redis):
        """Test that flush is skipped if another flush is in progress."""
        mock_redis.get.return_value = None  # No last flush
        mock_redis.set.return_value = False  # Lock not acquired
        
        result = analytics_service.flush_to_postgres(force=False)
        
        assert result["skipped"] is True
        assert result["reason"] == "lock_held"
    
    def test_flush_with_no_events(self, analytics_service, mock_redis, mock_supabase):
        """Test flush when there are no events to process."""
        mock_redis.get.return_value = None  # No last flush
        mock_redis.set.return_value = True  # Lock acquired
        mock_redis.hgetall.return_value = {}  # No events
        mock_redis.pipeline.return_value = MagicMock()
        
        result = analytics_service.flush_to_postgres(force=False)
        
        assert result["events_flushed"] == 0
        assert result["asset_types_updated"] == 0
    
    def test_flush_with_events(self, analytics_service, mock_redis, mock_supabase):
        """Test flush with events to process."""
        mock_redis.get.return_value = None  # No last flush
        mock_redis.set.return_value = True  # Lock acquired
        
        # Mock event counters
        mock_redis.hgetall.side_effect = [
            {"page_view": "100", "asset_generated": "50"},  # Event counts
            {"page": "80", "feature": "70"},  # Category counts
        ]
        
        # Mock recent events
        mock_redis.zrange.return_value = [
            json.dumps({
                "name": "asset_generated",
                "base": {"sessionId": "sess1", "userId": "user1"},
                "properties": {"assetType": "twitch_emote"}
            }),
            json.dumps({
                "name": "page_view",
                "base": {"sessionId": "sess2"},
                "properties": {}
            }),
        ]
        
        # Mock Supabase responses
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "1"}, {"id": "2"}]
        )
        mock_supabase.rpc.return_value.execute.return_value = MagicMock()
        
        mock_redis.pipeline.return_value = MagicMock()
        
        result = analytics_service.flush_to_postgres(force=False)
        
        assert result["events_flushed"] == 2
        assert "hour_bucket" in result
        assert "flushed_at" in result
    
    def test_flush_releases_lock_on_error(self, analytics_service, mock_redis, mock_supabase):
        """Test that lock is released even when an error occurs."""
        mock_redis.get.return_value = None
        mock_redis.set.return_value = True  # Lock acquired
        mock_redis.hgetall.side_effect = Exception("Redis error")
        
        result = analytics_service.flush_to_postgres(force=False)
        
        assert "error" in result
        mock_redis.delete.assert_called_with(FLUSH_LOCK_KEY)


class TestGetPopularAssetTypes:
    """Tests for the get_popular_asset_types method."""
    
    @pytest.fixture
    def mock_redis(self):
        """Create a mock Redis client."""
        redis_mock = MagicMock()
        redis_mock.ping.return_value = True
        return redis_mock
    
    @pytest.fixture
    def mock_supabase(self):
        """Create a mock Supabase client."""
        supabase_mock = MagicMock()
        return supabase_mock
    
    @pytest.fixture
    def analytics_service(self, mock_redis, mock_supabase):
        """Create an AnalyticsService with mocked dependencies."""
        with patch('redis.from_url', return_value=mock_redis):
            service = AnalyticsService(supabase_client=mock_supabase)
            return service
    
    def test_get_popular_asset_types_success(self, analytics_service, mock_supabase):
        """Test successful retrieval of popular asset types."""
        expected_data = [
            {
                "asset_type": "twitch_emote",
                "total_generations": 100,
                "total_views": 500,
                "total_shares": 50,
                "popularity_score": 900
            },
            {
                "asset_type": "youtube_thumbnail",
                "total_generations": 80,
                "total_views": 300,
                "total_shares": 30,
                "popularity_score": 600
            },
        ]
        
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(data=expected_data)
        
        result = analytics_service.get_popular_asset_types(days=30, limit=10)
        
        assert result == expected_data
        mock_supabase.rpc.assert_called_once_with(
            "get_popular_asset_types",
            {"p_days": 30, "p_limit": 10}
        )
    
    def test_get_popular_asset_types_empty(self, analytics_service, mock_supabase):
        """Test when no popular asset types are found."""
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(data=None)
        
        result = analytics_service.get_popular_asset_types()
        
        assert result == []
    
    def test_get_popular_asset_types_error(self, analytics_service, mock_supabase):
        """Test error handling when RPC call fails."""
        mock_supabase.rpc.return_value.execute.side_effect = Exception("RPC error")
        
        result = analytics_service.get_popular_asset_types()
        
        assert result == []


class TestGetLastFlushTime:
    """Tests for the get_last_flush_time method."""
    
    @pytest.fixture
    def mock_redis(self):
        """Create a mock Redis client."""
        redis_mock = MagicMock()
        redis_mock.ping.return_value = True
        return redis_mock
    
    @pytest.fixture
    def analytics_service(self, mock_redis):
        """Create an AnalyticsService with mocked dependencies."""
        with patch('redis.from_url', return_value=mock_redis):
            service = AnalyticsService()
            return service
    
    def test_get_last_flush_time_exists(self, analytics_service, mock_redis):
        """Test getting last flush time when it exists."""
        expected_time = "2025-12-26T10:00:00+00:00"
        mock_redis.get.return_value = expected_time
        
        result = analytics_service.get_last_flush_time()
        
        assert result == expected_time
        mock_redis.get.assert_called_with(LAST_FLUSH_KEY)
    
    def test_get_last_flush_time_not_exists(self, analytics_service, mock_redis):
        """Test getting last flush time when it doesn't exist."""
        mock_redis.get.return_value = None
        
        result = analytics_service.get_last_flush_time()
        
        assert result is None


class TestAssetEventConstants:
    """Tests for asset event constant definitions."""
    
    def test_asset_generation_events(self):
        """Test that generation events are properly defined."""
        assert "asset_generated" in ASSET_GENERATION_EVENTS
        assert "generation_completed" in ASSET_GENERATION_EVENTS
        assert "generation_started" in ASSET_GENERATION_EVENTS
    
    def test_asset_view_events(self):
        """Test that view events are properly defined."""
        assert "asset_viewed" in ASSET_VIEW_EVENTS
        assert "asset_preview" in ASSET_VIEW_EVENTS
        assert "asset_opened" in ASSET_VIEW_EVENTS
    
    def test_asset_share_events(self):
        """Test that share events are properly defined."""
        assert "asset_shared" in ASSET_SHARE_EVENTS
        assert "asset_downloaded" in ASSET_SHARE_EVENTS
        assert "asset_exported" in ASSET_SHARE_EVENTS
