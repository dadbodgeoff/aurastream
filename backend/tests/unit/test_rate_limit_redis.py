"""
Unit tests for Redis-backed rate limiting.

Tests the distributed, persistent rate limiter that addresses
the security audit findings about rate limit persistence.

Run with: python3 -m pytest backend/tests/unit/test_rate_limit_redis.py -v
"""

import pytest
import time
from unittest.mock import MagicMock, AsyncMock, patch
import asyncio


class TestRedisRateLimiter:
    """Tests for RedisRateLimiter class."""
    
    @pytest.mark.asyncio
    async def test_allows_requests_under_limit(self):
        """Requests under the limit should be allowed."""
        from backend.api.middleware.rate_limit_redis import RedisRateLimiter
        
        mock_redis = AsyncMock()
        
        # Create a proper async pipeline mock
        mock_pipeline = MagicMock()
        mock_pipeline.zremrangebyscore = MagicMock(return_value=mock_pipeline)
        mock_pipeline.zcard = MagicMock(return_value=mock_pipeline)
        
        async def mock_execute():
            return [0, 2]  # 2 existing requests
        mock_pipeline.execute = mock_execute
        
        mock_redis.pipeline = MagicMock(return_value=mock_pipeline)
        mock_redis.zadd = AsyncMock(return_value=1)
        mock_redis.expire = AsyncMock(return_value=True)
        
        limiter = RedisRateLimiter(redis_client=mock_redis)
        
        is_allowed, retry_after = await limiter.check_and_increment(
            key="test:key",
            max_attempts=5,
            window_seconds=60,
        )
        
        assert is_allowed is True
        assert retry_after == 0
    
    @pytest.mark.asyncio
    async def test_blocks_requests_over_limit(self):
        """Requests over the limit should be blocked."""
        from backend.api.middleware.rate_limit_redis import RedisRateLimiter
        
        mock_redis = AsyncMock()
        
        mock_pipeline = MagicMock()
        mock_pipeline.zremrangebyscore = MagicMock(return_value=mock_pipeline)
        mock_pipeline.zcard = MagicMock(return_value=mock_pipeline)
        
        async def mock_execute():
            return [0, 5]  # At limit
        mock_pipeline.execute = mock_execute
        
        mock_redis.pipeline = MagicMock(return_value=mock_pipeline)
        
        # Mock oldest entry for retry_after calculation
        now = time.time()
        mock_redis.zrange = AsyncMock(return_value=[("entry", now - 30)])
        
        limiter = RedisRateLimiter(redis_client=mock_redis)
        
        is_allowed, retry_after = await limiter.check_and_increment(
            key="test:key",
            max_attempts=5,
            window_seconds=60,
        )
        
        assert is_allowed is False
        assert retry_after > 0
        assert retry_after <= 60
    
    @pytest.mark.asyncio
    async def test_reset_clears_rate_limit(self):
        """Reset should clear the rate limit for a key."""
        from backend.api.middleware.rate_limit_redis import RedisRateLimiter
        
        mock_redis = AsyncMock()
        mock_redis.delete = AsyncMock(return_value=1)
        
        limiter = RedisRateLimiter(redis_client=mock_redis)
        await limiter.reset("test:key")
        
        mock_redis.delete.assert_called_once_with("rate:test:key")
    
    @pytest.mark.asyncio
    async def test_get_remaining_returns_correct_count(self):
        """get_remaining should return correct remaining attempts."""
        from backend.api.middleware.rate_limit_redis import RedisRateLimiter
        
        mock_redis = AsyncMock()
        mock_redis.zremrangebyscore = AsyncMock(return_value=0)
        mock_redis.zcard = AsyncMock(return_value=3)
        
        limiter = RedisRateLimiter(redis_client=mock_redis)
        remaining = await limiter.get_remaining("test:key", max_attempts=5, window_seconds=60)
        
        assert remaining == 2  # 5 - 3 = 2
    
    @pytest.mark.asyncio
    async def test_get_status_returns_detailed_info(self):
        """get_status should return detailed rate limit info."""
        from backend.api.middleware.rate_limit_redis import RedisRateLimiter
        
        now = time.time()
        mock_redis = AsyncMock()
        mock_redis.zremrangebyscore = AsyncMock(return_value=0)
        mock_redis.zcard = AsyncMock(return_value=3)
        mock_redis.zrange = AsyncMock(return_value=[("entry", now - 30)])
        
        limiter = RedisRateLimiter(redis_client=mock_redis)
        status = await limiter.get_status("test:key", max_attempts=5, window_seconds=60)
        
        assert status["remaining"] == 2
        assert status["limit"] == 5
        assert status["current_count"] == 3
        assert status["window_seconds"] == 60
        assert status["reset_at"] is not None


class TestRateLimitPersistence:
    """Tests verifying rate limits persist across instances."""
    
    @pytest.mark.asyncio
    async def test_rate_limits_shared_across_instances(self):
        """
        Rate limits should be shared when using the same Redis.
        This addresses the audit finding about per-instance rate limits.
        """
        from backend.api.middleware.rate_limit_redis import RedisRateLimiter
        
        # Simulate shared Redis state
        shared_state = {"count": 0}
        
        def create_mock_redis():
            mock = AsyncMock()
            
            mock_pipeline = MagicMock()
            mock_pipeline.zremrangebyscore = MagicMock(return_value=mock_pipeline)
            mock_pipeline.zcard = MagicMock(return_value=mock_pipeline)
            
            async def mock_execute():
                return [0, shared_state["count"]]
            mock_pipeline.execute = mock_execute
            
            mock.pipeline = MagicMock(return_value=mock_pipeline)
            
            async def mock_zadd(key, mapping):
                shared_state["count"] += 1
                return 1
            mock.zadd = mock_zadd
            mock.expire = AsyncMock(return_value=True)
            mock.zrange = AsyncMock(return_value=[])
            
            return mock
        
        # Create two "instances" sharing the same Redis state
        redis1 = create_mock_redis()
        redis2 = create_mock_redis()
        
        limiter1 = RedisRateLimiter(redis_client=redis1)
        limiter2 = RedisRateLimiter(redis_client=redis2)
        
        # Make requests from both instances
        for _ in range(3):
            await limiter1.check_and_increment("test:shared", max_attempts=5, window_seconds=60)
        
        for _ in range(2):
            await limiter2.check_and_increment("test:shared", max_attempts=5, window_seconds=60)
        
        # Total should be 5 (shared across instances)
        assert shared_state["count"] == 5


class TestRateLimitFastAPIDependencies:
    """Tests for FastAPI dependency functions."""
    
    @pytest.mark.asyncio
    async def test_check_login_rate_limit_redis(self):
        """Login rate limit check should use Redis."""
        from backend.api.middleware.rate_limit_redis import (
            check_login_rate_limit_redis,
            get_redis_rate_limiter,
        )
        from fastapi import HTTPException
        from unittest.mock import MagicMock
        
        mock_request = MagicMock()
        
        # Mock the limiter
        with patch('backend.api.middleware.rate_limit_redis._redis_rate_limiter') as mock_limiter:
            mock_limiter.check_and_increment = AsyncMock(return_value=(True, 0))
            
            # Should not raise
            await check_login_rate_limit_redis(mock_request, "test@example.com")
    
    @pytest.mark.asyncio
    async def test_check_login_rate_limit_redis_blocked(self):
        """Login rate limit should raise 429 when exceeded."""
        from backend.api.middleware.rate_limit_redis import (
            check_login_rate_limit_redis,
            RedisRateLimiter,
        )
        from fastapi import HTTPException
        from unittest.mock import MagicMock
        
        mock_request = MagicMock()
        
        # Create a mock limiter that blocks
        mock_redis = AsyncMock()
        
        mock_pipeline = MagicMock()
        mock_pipeline.zremrangebyscore = MagicMock(return_value=mock_pipeline)
        mock_pipeline.zcard = MagicMock(return_value=mock_pipeline)
        
        async def mock_execute():
            return [0, 10]  # Over limit
        mock_pipeline.execute = mock_execute
        
        mock_redis.pipeline = MagicMock(return_value=mock_pipeline)
        mock_redis.zrange = AsyncMock(return_value=[("entry", time.time() - 30)])
        
        with patch('backend.api.middleware.rate_limit_redis._redis_rate_limiter', 
                   RedisRateLimiter(redis_client=mock_redis)):
            with pytest.raises(HTTPException) as exc_info:
                await check_login_rate_limit_redis(mock_request, "test@example.com")
            
            assert exc_info.value.status_code == 429
            assert "Retry-After" in exc_info.value.headers


class TestRateLimitHeaders:
    """Tests for rate limit response headers."""
    
    @pytest.mark.asyncio
    async def test_get_rate_limit_headers(self):
        """Should return proper rate limit headers."""
        from backend.api.middleware.rate_limit_redis import (
            get_rate_limit_headers,
            RedisRateLimiter,
        )
        from unittest.mock import MagicMock
        
        mock_request = MagicMock()
        mock_request.client.host = "127.0.0.1"
        mock_request.headers.get.return_value = None
        
        mock_redis = AsyncMock()
        mock_redis.zremrangebyscore = AsyncMock()
        mock_redis.zcard = AsyncMock(return_value=10)
        mock_redis.zrange = AsyncMock(return_value=[("entry", time.time())])
        
        with patch('backend.api.middleware.rate_limit_redis._redis_rate_limiter',
                   RedisRateLimiter(redis_client=mock_redis)):
            headers = await get_rate_limit_headers(mock_request, user_id=None, tier="anonymous")
            
            assert "X-RateLimit-Limit" in headers
            assert "X-RateLimit-Remaining" in headers
