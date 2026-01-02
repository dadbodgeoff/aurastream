"""
Unit Tests for Clip Radar Service

Tests the core clip radar functionality including:
- Velocity calculations
- Viral detection
- Redis data management
- Error handling
"""

import json
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, AsyncMock, patch
from dataclasses import dataclass


class TestClipRadarVelocityCalculation:
    """Tests for velocity calculation logic."""
    
    @pytest.fixture
    def mock_redis(self):
        """Create a mock Redis client."""
        redis = MagicMock()
        redis.hget.return_value = None
        redis.hset.return_value = True
        return redis
    
    @pytest.fixture
    def clip_radar_service(self, mock_redis):
        """Create ClipRadarService with mocked Redis."""
        from backend.services.clip_radar.service import ClipRadarService
        service = ClipRadarService(redis_client=mock_redis)
        return service
    
    @dataclass
    class MockClip:
        """Mock Twitch clip for testing."""
        id: str = "clip123"
        title: str = "Test Clip"
        url: str = "https://twitch.tv/clip/test"
        thumbnail_url: str = "https://example.com/thumb.jpg"
        broadcaster_id: str = "user123"
        broadcaster_name: str = "TestStreamer"
        creator_name: str = "TestCreator"
        game_id: str = "509658"
        language: str = "en"
        duration: float = 30.0
        created_at: datetime = None
        view_count: int = 1000
        
        def __post_init__(self):
            if self.created_at is None:
                self.created_at = datetime.now(timezone.utc) - timedelta(minutes=30)
    
    @pytest.mark.asyncio
    async def test_velocity_new_clip_no_history(self, clip_radar_service, mock_redis):
        """Test velocity calculation for a clip with no tracking history."""
        mock_redis.hget.return_value = None  # No previous data
        
        clip = self.MockClip(view_count=1000)
        clip.created_at = datetime.now(timezone.utc) - timedelta(minutes=30)
        
        tracked = await clip_radar_service._process_clip(clip, "Just Chatting")
        
        # Velocity should be views / age_minutes
        expected_velocity = 1000 / 30  # ~33.33 views/min
        assert abs(tracked.velocity - expected_velocity) < 1.0
        assert tracked.previous_view_count is None
    
    @pytest.mark.asyncio
    async def test_velocity_with_tracking_history(self, clip_radar_service, mock_redis):
        """Test velocity calculation with previous tracking data."""
        # Previous view count was 500
        mock_redis.hget.side_effect = lambda key, field: {
            ("clip_radar:clip_views", "clip123"): "500",
            ("clip_radar:clip_data", "clip123"): json.dumps({
                "first_seen_at": (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat(),
                "game_id": "509658",
                "game_name": "Just Chatting",
            }),
        }.get((key, field))
        
        clip = self.MockClip(view_count=1000)
        clip.created_at = datetime.now(timezone.utc) - timedelta(minutes=30)
        
        tracked = await clip_radar_service._process_clip(clip, "Just Chatting")
        
        # Should have previous view count
        assert tracked.previous_view_count == 500
        assert tracked.total_gained == 500
        # Velocity should be max of base velocity and recent velocity
        assert tracked.velocity > 0
    
    @pytest.mark.asyncio
    async def test_velocity_never_negative(self, clip_radar_service, mock_redis):
        """Test that velocity is never negative even with decreasing views."""
        # Previous view count was higher (edge case - shouldn't happen normally)
        mock_redis.hget.side_effect = lambda key, field: {
            ("clip_radar:clip_views", "clip123"): "2000",
            ("clip_radar:clip_data", "clip123"): json.dumps({
                "first_seen_at": (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat(),
            }),
        }.get((key, field))
        
        clip = self.MockClip(view_count=1000)  # Lower than previous
        clip.created_at = datetime.now(timezone.utc) - timedelta(minutes=30)
        
        tracked = await clip_radar_service._process_clip(clip, "Just Chatting")
        
        # Velocity should never be negative
        assert tracked.velocity >= 0
        assert tracked.total_gained >= 0


class TestViralDetection:
    """Tests for viral clip detection."""
    
    @pytest.fixture
    def clip_radar_service(self):
        """Create ClipRadarService with mocked Redis."""
        from backend.services.clip_radar.service import ClipRadarService
        mock_redis = MagicMock()
        return ClipRadarService(redis_client=mock_redis)
    
    def test_is_viral_meets_all_criteria(self, clip_radar_service):
        """Test clip that meets all viral criteria."""
        from backend.services.clip_radar.models import TrackedClip
        from backend.services.clip_radar.constants import (
            HIGH_VELOCITY_THRESHOLD,
            MINIMUM_VIEWS_FOR_VIRAL,
        )
        
        clip = TrackedClip(
            clip_id="test",
            title="Test",
            url="https://example.com",
            thumbnail_url="https://example.com/thumb.jpg",
            broadcaster_id="user1",
            broadcaster_name="Test",
            creator_name="Test",
            game_id="509658",
            game_name="Just Chatting",
            language="en",
            duration=30.0,
            created_at=datetime.now(timezone.utc) - timedelta(minutes=30),  # Fresh
            view_count=MINIMUM_VIEWS_FOR_VIRAL + 100,
            velocity=HIGH_VELOCITY_THRESHOLD + 1.0,
        )
        
        assert clip_radar_service._is_viral(clip) == True
    
    def test_is_viral_low_velocity(self, clip_radar_service):
        """Test clip with low velocity is not viral."""
        from backend.services.clip_radar.models import TrackedClip
        from backend.services.clip_radar.constants import (
            HIGH_VELOCITY_THRESHOLD,
            MINIMUM_VIEWS_FOR_VIRAL,
        )
        
        clip = TrackedClip(
            clip_id="test",
            title="Test",
            url="https://example.com",
            thumbnail_url="https://example.com/thumb.jpg",
            broadcaster_id="user1",
            broadcaster_name="Test",
            creator_name="Test",
            game_id="509658",
            game_name="Just Chatting",
            language="en",
            duration=30.0,
            created_at=datetime.now(timezone.utc) - timedelta(minutes=30),
            view_count=MINIMUM_VIEWS_FOR_VIRAL + 100,
            velocity=HIGH_VELOCITY_THRESHOLD - 0.5,  # Below threshold
        )
        
        assert clip_radar_service._is_viral(clip) == False
    
    def test_is_viral_low_views(self, clip_radar_service):
        """Test clip with low views is not viral."""
        from backend.services.clip_radar.models import TrackedClip
        from backend.services.clip_radar.constants import (
            HIGH_VELOCITY_THRESHOLD,
            MINIMUM_VIEWS_FOR_VIRAL,
        )
        
        clip = TrackedClip(
            clip_id="test",
            title="Test",
            url="https://example.com",
            thumbnail_url="https://example.com/thumb.jpg",
            broadcaster_id="user1",
            broadcaster_name="Test",
            creator_name="Test",
            game_id="509658",
            game_name="Just Chatting",
            language="en",
            duration=30.0,
            created_at=datetime.now(timezone.utc) - timedelta(minutes=30),
            view_count=MINIMUM_VIEWS_FOR_VIRAL - 1,  # Below threshold
            velocity=HIGH_VELOCITY_THRESHOLD + 1.0,
        )
        
        assert clip_radar_service._is_viral(clip) == False
    
    def test_is_viral_stale_clip(self, clip_radar_service):
        """Test old clip is not viral even with high velocity."""
        from backend.services.clip_radar.models import TrackedClip
        from backend.services.clip_radar.constants import (
            HIGH_VELOCITY_THRESHOLD,
            MINIMUM_VIEWS_FOR_VIRAL,
        )
        
        clip = TrackedClip(
            clip_id="test",
            title="Test",
            url="https://example.com",
            thumbnail_url="https://example.com/thumb.jpg",
            broadcaster_id="user1",
            broadcaster_name="Test",
            creator_name="Test",
            game_id="509658",
            game_name="Just Chatting",
            language="en",
            duration=30.0,
            created_at=datetime.now(timezone.utc) - timedelta(hours=12),  # Old clip
            view_count=MINIMUM_VIEWS_FOR_VIRAL + 100,
            velocity=HIGH_VELOCITY_THRESHOLD + 1.0,
        )
        
        # is_fresh should be False for clips > 6 hours old
        assert clip.is_fresh == False
        assert clip_radar_service._is_viral(clip) == False


class TestViralReasonGeneration:
    """Tests for viral reason text generation."""
    
    @pytest.fixture
    def clip_radar_service(self):
        """Create ClipRadarService with mocked Redis."""
        from backend.services.clip_radar.service import ClipRadarService
        mock_redis = MagicMock()
        return ClipRadarService(redis_client=mock_redis)
    
    def test_exploding_reason(self, clip_radar_service):
        """Test reason for exploding clips."""
        from backend.services.clip_radar.models import TrackedClip
        from backend.services.clip_radar.constants import VIRAL_VELOCITY_THRESHOLD
        
        clip = TrackedClip(
            clip_id="test",
            title="Test",
            url="https://example.com",
            thumbnail_url="https://example.com/thumb.jpg",
            broadcaster_id="user1",
            broadcaster_name="Test",
            creator_name="Test",
            game_id="509658",
            game_name="Just Chatting",
            language="en",
            duration=30.0,
            created_at=datetime.now(timezone.utc),
            view_count=1000,
            velocity=VIRAL_VELOCITY_THRESHOLD + 1.0,
        )
        
        reason = clip_radar_service._get_viral_reason(clip)
        assert "🔥" in reason
        assert "Exploding" in reason
    
    def test_trending_reason(self, clip_radar_service):
        """Test reason for trending clips."""
        from backend.services.clip_radar.models import TrackedClip
        from backend.services.clip_radar.constants import (
            HIGH_VELOCITY_THRESHOLD,
            VIRAL_VELOCITY_THRESHOLD,
        )
        
        clip = TrackedClip(
            clip_id="test",
            title="Test",
            url="https://example.com",
            thumbnail_url="https://example.com/thumb.jpg",
            broadcaster_id="user1",
            broadcaster_name="Test",
            creator_name="Test",
            game_id="509658",
            game_name="Just Chatting",
            language="en",
            duration=30.0,
            created_at=datetime.now(timezone.utc),
            view_count=1000,
            velocity=(HIGH_VELOCITY_THRESHOLD + VIRAL_VELOCITY_THRESHOLD) / 2,
        )
        
        reason = clip_radar_service._get_viral_reason(clip)
        assert "📈" in reason
        assert "Trending" in reason


class TestTrackedClipModel:
    """Tests for TrackedClip model."""
    
    def test_age_minutes_calculation(self):
        """Test age_minutes property calculation."""
        from backend.services.clip_radar.models import TrackedClip
        
        clip = TrackedClip(
            clip_id="test",
            title="Test",
            url="https://example.com",
            thumbnail_url="https://example.com/thumb.jpg",
            broadcaster_id="user1",
            broadcaster_name="Test",
            creator_name="Test",
            game_id="509658",
            game_name="Just Chatting",
            language="en",
            duration=30.0,
            created_at=datetime.now(timezone.utc) - timedelta(minutes=45),
            view_count=100,
        )
        
        # Should be approximately 45 minutes
        assert 44 < clip.age_minutes < 46
    
    def test_is_fresh_under_6_hours(self):
        """Test is_fresh for clips under 6 hours old."""
        from backend.services.clip_radar.models import TrackedClip
        
        clip = TrackedClip(
            clip_id="test",
            title="Test",
            url="https://example.com",
            thumbnail_url="https://example.com/thumb.jpg",
            broadcaster_id="user1",
            broadcaster_name="Test",
            creator_name="Test",
            game_id="509658",
            game_name="Just Chatting",
            language="en",
            duration=30.0,
            created_at=datetime.now(timezone.utc) - timedelta(hours=5),
            view_count=100,
        )
        
        assert clip.is_fresh == True
    
    def test_is_fresh_over_6_hours(self):
        """Test is_fresh for clips over 6 hours old."""
        from backend.services.clip_radar.models import TrackedClip
        
        clip = TrackedClip(
            clip_id="test",
            title="Test",
            url="https://example.com",
            thumbnail_url="https://example.com/thumb.jpg",
            broadcaster_id="user1",
            broadcaster_name="Test",
            creator_name="Test",
            game_id="509658",
            game_name="Just Chatting",
            language="en",
            duration=30.0,
            created_at=datetime.now(timezone.utc) - timedelta(hours=7),
            view_count=100,
        )
        
        assert clip.is_fresh == False
    
    def test_naive_datetime_handling(self):
        """Test that naive datetimes are handled correctly."""
        from backend.services.clip_radar.models import TrackedClip
        
        # Create clip with naive datetime
        clip = TrackedClip(
            clip_id="test",
            title="Test",
            url="https://example.com",
            thumbnail_url="https://example.com/thumb.jpg",
            broadcaster_id="user1",
            broadcaster_name="Test",
            creator_name="Test",
            game_id="509658",
            game_name="Just Chatting",
            language="en",
            duration=30.0,
            created_at=datetime.utcnow() - timedelta(minutes=30),  # Naive
            view_count=100,
        )
        
        # Should not raise and should calculate age correctly
        assert 29 < clip.age_minutes < 31


class TestPollClipsErrorHandling:
    """Tests for poll_clips error handling."""
    
    @pytest.fixture
    def mock_redis(self):
        """Create a mock Redis client."""
        redis = MagicMock()
        redis.hget.return_value = None
        redis.hset.return_value = True
        redis.set.return_value = True
        redis.delete.return_value = True
        redis.zadd.return_value = True
        return redis
    
    @pytest.mark.asyncio
    async def test_poll_continues_on_category_error(self, mock_redis):
        """Test that poll continues when one category fails."""
        from backend.services.clip_radar.service import ClipRadarService
        from backend.services.clip_radar.constants import TRACKED_CATEGORIES
        
        service = ClipRadarService(redis_client=mock_redis)
        
        mock_twitch = AsyncMock()
        call_count = 0
        
        async def mock_fetch_clips(**kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 3:  # Fail on third category
                raise Exception("API Error")
            return []
        
        mock_twitch.fetch_clips = mock_fetch_clips
        service._twitch = mock_twitch
        
        # Should not raise
        results = await service.poll_clips()
        
        # Should have results for all categories
        assert len(results) == len(TRACKED_CATEGORIES)
        
        # Failed category should have 0 clips
        failed_categories = [gid for gid, stats in results.items() if stats.total_clips == 0]
        assert len(failed_categories) >= 1
    
    @pytest.mark.asyncio
    async def test_poll_handles_all_categories_failing(self, mock_redis):
        """Test poll handles all categories failing gracefully."""
        from backend.services.clip_radar.service import ClipRadarService
        from backend.services.clip_radar.constants import TRACKED_CATEGORIES
        
        service = ClipRadarService(redis_client=mock_redis)
        
        mock_twitch = AsyncMock()
        mock_twitch.fetch_clips.side_effect = Exception("API Down")
        service._twitch = mock_twitch
        
        # Should not raise
        results = await service.poll_clips()
        
        # Should have results for all categories (all empty)
        assert len(results) == len(TRACKED_CATEGORIES)
        
        # All should have 0 clips
        for stats in results.values():
            assert stats.total_clips == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


class TestErrorTracking:
    """Tests for error tracking in poll results."""
    
    @pytest.fixture
    def mock_redis(self):
        """Create a mock Redis client."""
        redis = MagicMock()
        redis.hget.return_value = None
        redis.hset.return_value = True
        redis.set.return_value = True
        redis.delete.return_value = True
        redis.zadd.return_value = True
        redis.get.return_value = None
        redis.hkeys.return_value = []
        return redis
    
    @pytest.mark.asyncio
    async def test_category_stats_includes_error_fields(self, mock_redis):
        """Test that CategoryClipStats includes error tracking fields."""
        from backend.services.clip_radar.service import ClipRadarService
        from backend.services.clip_radar.constants import TRACKED_CATEGORIES
        
        service = ClipRadarService(redis_client=mock_redis)
        
        mock_twitch = AsyncMock()
        mock_twitch.fetch_clips.return_value = []
        service._twitch = mock_twitch
        
        results = await service.poll_clips()
        
        # All results should have error tracking fields
        for gid, stats in results.items():
            assert hasattr(stats, 'fetch_success')
            assert hasattr(stats, 'fetch_error')
            assert stats.fetch_success == True
            assert stats.fetch_error is None
    
    @pytest.mark.asyncio
    async def test_failed_category_has_error_info(self, mock_redis):
        """Test that failed categories have error information."""
        from backend.services.clip_radar.service import ClipRadarService
        from backend.services.clip_radar.constants import TRACKED_CATEGORIES
        
        service = ClipRadarService(redis_client=mock_redis)
        
        mock_twitch = AsyncMock()
        call_count = 0
        
        async def mock_fetch_clips(**kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 2:
                raise Exception("Twitch API rate limit exceeded")
            return []
        
        mock_twitch.fetch_clips = mock_fetch_clips
        service._twitch = mock_twitch
        
        results = await service.poll_clips()
        
        # Find the failed category
        failed = [stats for stats in results.values() if not stats.fetch_success]
        successful = [stats for stats in results.values() if stats.fetch_success]
        
        assert len(failed) == 1
        assert failed[0].fetch_error == "Twitch API rate limit exceeded"
        assert len(successful) == len(TRACKED_CATEGORIES) - 1
    
    @pytest.mark.asyncio
    async def test_poll_metadata_stored_in_redis(self, mock_redis):
        """Test that poll metadata is stored in Redis."""
        from backend.services.clip_radar.service import ClipRadarService
        
        service = ClipRadarService(redis_client=mock_redis)
        
        mock_twitch = AsyncMock()
        mock_twitch.fetch_clips.return_value = []
        service._twitch = mock_twitch
        
        await service.poll_clips()
        
        # Check that metadata was stored
        set_calls = [call for call in mock_redis.set.call_args_list]
        metadata_calls = [c for c in set_calls if 'metadata' in str(c)]
        assert len(metadata_calls) >= 1


class TestCleanup:
    """Tests for cleanup functionality."""
    
    @pytest.fixture
    def mock_redis(self):
        """Create a mock Redis client."""
        redis = MagicMock()
        return redis
    
    @pytest.mark.asyncio
    async def test_cleanup_removes_old_data(self, mock_redis):
        """Test that cleanup removes old clip data."""
        from backend.services.clip_radar.service import ClipRadarService
        import json
        from datetime import datetime, timezone, timedelta
        
        service = ClipRadarService(redis_client=mock_redis)
        
        # Setup mock data - one old clip, one recent clip
        old_time = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        recent_time = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        
        mock_redis.hkeys.return_value = ["old_clip", "recent_clip"]
        mock_redis.hget.side_effect = lambda key, clip_id: {
            ("clip_radar:clip_data", "old_clip"): json.dumps({"first_seen_at": old_time}),
            ("clip_radar:clip_data", "recent_clip"): json.dumps({"first_seen_at": recent_time}),
        }.get((key, clip_id))
        
        await service.cleanup_old_data(max_age_hours=24)
        
        # Old clip should be deleted
        hdel_calls = mock_redis.hdel.call_args_list
        deleted_clips = [str(call) for call in hdel_calls]
        assert any("old_clip" in str(call) for call in hdel_calls)
    
    def test_get_poll_health_returns_status(self, mock_redis):
        """Test that get_poll_health returns health status."""
        from backend.services.clip_radar.service import ClipRadarService
        import json
        from datetime import datetime, timezone
        
        service = ClipRadarService(redis_client=mock_redis)
        
        # Setup mock data
        now = datetime.now(timezone.utc)
        mock_redis.get.side_effect = lambda key: {
            "clip_radar:last_poll": now.isoformat(),
            "clip_radar:last_poll:metadata": json.dumps({
                "success_rate": 100,
                "failed_categories": [],
                "recap_tracked": True,
                "total_clips": 50,
                "total_viral": 5,
            }),
        }.get(key)
        
        health = service.get_poll_health()
        
        assert health["status"] == "healthy"
        assert health["success_rate"] == 100
        assert health["failed_categories"] == []
        assert health["recap_healthy"] == True
