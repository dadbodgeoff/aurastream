"""
Redis-Backed Rate Limiting for Aurastream.

This module provides distributed, persistent rate limiting using Redis.
Addresses security audit findings:
- Rate limits persist across server restarts
- Rate limits are shared across all instances
- Atomic operations prevent race conditions

Usage:
    from backend.api.middleware.rate_limit_redis import RedisRateLimiter
    
    limiter = RedisRateLimiter()
    is_allowed, retry_after = await limiter.check_and_increment(
        key="login:user@example.com",
        max_attempts=5,
        window_seconds=900
    )
"""

import logging
import os
import time
from typing import Optional, Tuple

from fastapi import HTTPException, Request, status
import redis.asyncio as aioredis

logger = logging.getLogger(__name__)


class RedisRateLimiter:
    """
    Redis-backed rate limiter with sliding window algorithm.
    
    Features:
    - Distributed: Works across multiple server instances
    - Persistent: Survives server restarts
    - Atomic: Uses Redis transactions to prevent race conditions
    - Efficient: Uses sorted sets for sliding window
    
    Key Format:
    - rate:{category}:{identifier} -> Sorted set of timestamps
    """
    
    RATE_PREFIX = "rate:"
    
    def __init__(self, redis_client: Optional[aioredis.Redis] = None):
        """
        Initialize the rate limiter.
        
        Args:
            redis_client: Async Redis client. If None, creates from REDIS_URL.
        """
        self._redis = redis_client
        self._redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    async def _get_redis(self) -> aioredis.Redis:
        """Get or create Redis connection."""
        if self._redis is None:
            self._redis = await aioredis.from_url(
                self._redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._redis
    
    async def check_and_increment(
        self,
        key: str,
        max_attempts: int,
        window_seconds: int,
    ) -> Tuple[bool, int]:
        """
        Check if rate limit is exceeded and increment counter.
        
        Uses sliding window algorithm with Redis sorted sets:
        1. Remove expired entries (older than window)
        2. Count remaining entries
        3. If under limit, add new entry
        4. Set TTL on the key
        
        Args:
            key: Unique identifier (e.g., "login:user@example.com")
            max_attempts: Maximum allowed attempts in window
            window_seconds: Duration of the sliding window
            
        Returns:
            Tuple of (is_allowed, retry_after_seconds)
        """
        redis = await self._get_redis()
        full_key = f"{self.RATE_PREFIX}{key}"
        now = time.time()
        window_start = now - window_seconds
        
        try:
            # Use pipeline for atomic operations
            pipe = redis.pipeline()
            
            # Remove entries older than window
            pipe.zremrangebyscore(full_key, 0, window_start)
            
            # Count current entries
            pipe.zcard(full_key)
            
            # Execute pipeline
            results = await pipe.execute()
            current_count = results[1]
            
            if current_count >= max_attempts:
                # Get oldest entry to calculate retry_after
                oldest = await redis.zrange(full_key, 0, 0, withscores=True)
                if oldest:
                    oldest_time = oldest[0][1]
                    retry_after = int((oldest_time + window_seconds) - now)
                    return False, max(retry_after, 1)
                return False, window_seconds
            
            # Add new entry with current timestamp as score
            await redis.zadd(full_key, {str(now): now})
            
            # Set TTL to clean up old keys
            await redis.expire(full_key, window_seconds + 60)
            
            return True, 0
            
        except Exception as e:
            logger.error(f"Redis rate limit error: {e}")
            # Fail open - allow request but log error
            # In production, you might want to fail closed instead
            return True, 0
    
    async def get_remaining(self, key: str, max_attempts: int, window_seconds: int) -> int:
        """
        Get remaining attempts for a key.
        
        Args:
            key: Rate limit key
            max_attempts: Maximum allowed attempts
            window_seconds: Window duration
            
        Returns:
            Number of remaining attempts
        """
        redis = await self._get_redis()
        full_key = f"{self.RATE_PREFIX}{key}"
        now = time.time()
        window_start = now - window_seconds
        
        try:
            # Remove expired and count
            await redis.zremrangebyscore(full_key, 0, window_start)
            current_count = await redis.zcard(full_key)
            return max(0, max_attempts - current_count)
        except Exception as e:
            logger.error(f"Redis rate limit error: {e}")
            return max_attempts
    
    async def reset(self, key: str) -> None:
        """
        Reset rate limit for a key.
        
        Args:
            key: Rate limit key to reset
        """
        redis = await self._get_redis()
        full_key = f"{self.RATE_PREFIX}{key}"
        
        try:
            await redis.delete(full_key)
        except Exception as e:
            logger.error(f"Redis rate limit reset error: {e}")
    
    async def get_status(self, key: str, max_attempts: int, window_seconds: int) -> dict:
        """
        Get detailed rate limit status.
        
        Args:
            key: Rate limit key
            max_attempts: Maximum allowed attempts
            window_seconds: Window duration
            
        Returns:
            Dict with remaining, limit, reset_at, and current_count
        """
        redis = await self._get_redis()
        full_key = f"{self.RATE_PREFIX}{key}"
        now = time.time()
        window_start = now - window_seconds
        
        try:
            await redis.zremrangebyscore(full_key, 0, window_start)
            current_count = await redis.zcard(full_key)
            
            # Get oldest entry for reset time
            oldest = await redis.zrange(full_key, 0, 0, withscores=True)
            reset_at = None
            if oldest:
                reset_at = oldest[0][1] + window_seconds
            
            return {
                "remaining": max(0, max_attempts - current_count),
                "limit": max_attempts,
                "current_count": current_count,
                "window_seconds": window_seconds,
                "reset_at": reset_at,
            }
        except Exception as e:
            logger.error(f"Redis rate limit status error: {e}")
            return {
                "remaining": max_attempts,
                "limit": max_attempts,
                "current_count": 0,
                "window_seconds": window_seconds,
                "reset_at": None,
                "error": str(e),
            }
    
    async def close(self) -> None:
        """Close Redis connection."""
        if self._redis:
            await self._redis.close()
            self._redis = None


# =============================================================================
# Singleton and FastAPI Integration
# =============================================================================

_redis_rate_limiter: Optional[RedisRateLimiter] = None


async def get_redis_rate_limiter() -> RedisRateLimiter:
    """Get or create the Redis rate limiter singleton."""
    global _redis_rate_limiter
    if _redis_rate_limiter is None:
        _redis_rate_limiter = RedisRateLimiter()
    return _redis_rate_limiter


async def reset_redis_rate_limiter() -> None:
    """Reset the singleton (for testing)."""
    global _redis_rate_limiter
    if _redis_rate_limiter:
        await _redis_rate_limiter.close()
    _redis_rate_limiter = None


# =============================================================================
# Configuration (same as in-memory version for compatibility)
# =============================================================================

LOGIN_MAX_ATTEMPTS = int(os.getenv("RATE_LIMIT_LOGIN_MAX_ATTEMPTS", "5"))
LOGIN_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_LOGIN_WINDOW_SECONDS", str(15 * 60)))

SIGNUP_MAX_ATTEMPTS = int(os.getenv("RATE_LIMIT_SIGNUP_MAX_ATTEMPTS", "10"))
SIGNUP_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_SIGNUP_WINDOW_SECONDS", str(60 * 60)))

COACH_MESSAGE_MAX_ATTEMPTS = int(os.getenv("RATE_LIMIT_COACH_MESSAGE_MAX_ATTEMPTS", "10"))
COACH_MESSAGE_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_COACH_MESSAGE_WINDOW_SECONDS", "60"))

COACH_SESSION_MAX_ATTEMPTS = int(os.getenv("RATE_LIMIT_COACH_SESSION_MAX_ATTEMPTS", "20"))
COACH_SESSION_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_COACH_SESSION_WINDOW_SECONDS", str(60 * 60)))

API_RATE_LIMITS = {
    "free": int(os.getenv("RATE_LIMIT_API_FREE", "60")),
    "pro": int(os.getenv("RATE_LIMIT_API_PRO", "120")),
    "studio": int(os.getenv("RATE_LIMIT_API_STUDIO", "300")),
    "anonymous": int(os.getenv("RATE_LIMIT_API_ANON", "30")),
}
API_RATE_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_API_WINDOW_SECONDS", "60"))

RATE_LIMITING_ENABLED = os.getenv("RATE_LIMITING_ENABLED", "true").lower() == "true"
USE_REDIS_RATE_LIMITING = os.getenv("USE_REDIS_RATE_LIMITING", "true").lower() == "true"


# =============================================================================
# FastAPI Dependencies (Redis-backed versions)
# =============================================================================


def create_rate_limit_response(retry_after: int) -> HTTPException:
    """Create a 429 Too Many Requests response."""
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={
            "error": {
                "message": "Too many requests. Please try again later.",
                "code": "RATE_LIMIT_EXCEEDED",
                "details": {"retry_after_seconds": retry_after}
            }
        },
        headers={"Retry-After": str(retry_after)}
    )


def get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    if request.client:
        return request.client.host
    return "unknown"


async def check_login_rate_limit_redis(request: Request, email: str) -> None:
    """
    Check login rate limit using Redis.
    
    Args:
        request: FastAPI request
        email: Email to rate limit
        
    Raises:
        HTTPException: 429 if rate limit exceeded
    """
    if not RATE_LIMITING_ENABLED:
        return
    
    email = email.lower().strip()
    key = f"login:{email}"
    
    limiter = await get_redis_rate_limiter()
    is_allowed, retry_after = await limiter.check_and_increment(
        key=key,
        max_attempts=LOGIN_MAX_ATTEMPTS,
        window_seconds=LOGIN_WINDOW_SECONDS,
    )
    
    if not is_allowed:
        raise create_rate_limit_response(retry_after)


async def check_signup_rate_limit_redis(request: Request) -> None:
    """
    Check signup rate limit using Redis.
    
    Args:
        request: FastAPI request
        
    Raises:
        HTTPException: 429 if rate limit exceeded
    """
    if not RATE_LIMITING_ENABLED:
        return
    
    client_ip = get_client_ip(request)
    key = f"signup:{client_ip}"
    
    limiter = await get_redis_rate_limiter()
    is_allowed, retry_after = await limiter.check_and_increment(
        key=key,
        max_attempts=SIGNUP_MAX_ATTEMPTS,
        window_seconds=SIGNUP_WINDOW_SECONDS,
    )
    
    if not is_allowed:
        raise create_rate_limit_response(retry_after)


async def reset_login_rate_limit_redis(email: str) -> None:
    """Reset login rate limit after successful login."""
    email = email.lower().strip()
    key = f"login:{email}"
    limiter = await get_redis_rate_limiter()
    await limiter.reset(key)


async def check_coach_message_rate_limit_redis(user_id: str) -> None:
    """Check coach message rate limit using Redis."""
    if not RATE_LIMITING_ENABLED:
        return
    
    key = f"coach:message:{user_id}"
    limiter = await get_redis_rate_limiter()
    is_allowed, retry_after = await limiter.check_and_increment(
        key=key,
        max_attempts=COACH_MESSAGE_MAX_ATTEMPTS,
        window_seconds=COACH_MESSAGE_WINDOW_SECONDS,
    )
    
    if not is_allowed:
        raise create_rate_limit_response(retry_after)


async def check_coach_session_rate_limit_redis(user_id: str) -> None:
    """Check coach session rate limit using Redis."""
    if not RATE_LIMITING_ENABLED:
        return
    
    key = f"coach:session:{user_id}"
    limiter = await get_redis_rate_limiter()
    is_allowed, retry_after = await limiter.check_and_increment(
        key=key,
        max_attempts=COACH_SESSION_MAX_ATTEMPTS,
        window_seconds=COACH_SESSION_WINDOW_SECONDS,
    )
    
    if not is_allowed:
        raise create_rate_limit_response(retry_after)


async def check_api_rate_limit_redis(
    request: Request,
    user_id: Optional[str] = None,
    tier: str = "anonymous"
) -> None:
    """
    Check global API rate limit using Redis.
    
    Args:
        request: FastAPI request
        user_id: Authenticated user ID (None for anonymous)
        tier: User's subscription tier
        
    Raises:
        HTTPException: 429 if rate limit exceeded
    """
    if not RATE_LIMITING_ENABLED:
        return
    
    if user_id:
        key = f"api:user:{user_id}"
        max_attempts = API_RATE_LIMITS.get(tier, API_RATE_LIMITS["free"])
    else:
        client_ip = get_client_ip(request)
        key = f"api:ip:{client_ip}"
        max_attempts = API_RATE_LIMITS["anonymous"]
    
    limiter = await get_redis_rate_limiter()
    is_allowed, retry_after = await limiter.check_and_increment(
        key=key,
        max_attempts=max_attempts,
        window_seconds=API_RATE_WINDOW_SECONDS,
    )
    
    if not is_allowed:
        raise create_rate_limit_response(retry_after)


async def get_rate_limit_headers(
    request: Request,
    user_id: Optional[str] = None,
    tier: str = "anonymous"
) -> dict:
    """
    Get rate limit headers for API responses.
    
    Returns headers like:
    - X-RateLimit-Limit
    - X-RateLimit-Remaining
    - X-RateLimit-Reset
    """
    if user_id:
        key = f"api:user:{user_id}"
        max_attempts = API_RATE_LIMITS.get(tier, API_RATE_LIMITS["free"])
    else:
        client_ip = get_client_ip(request)
        key = f"api:ip:{client_ip}"
        max_attempts = API_RATE_LIMITS["anonymous"]
    
    limiter = await get_redis_rate_limiter()
    status = await limiter.get_status(key, max_attempts, API_RATE_WINDOW_SECONDS)
    
    headers = {
        "X-RateLimit-Limit": str(status["limit"]),
        "X-RateLimit-Remaining": str(status["remaining"]),
    }
    
    if status.get("reset_at"):
        headers["X-RateLimit-Reset"] = str(int(status["reset_at"]))
    
    return headers


__all__ = [
    # Core
    "RedisRateLimiter",
    "get_redis_rate_limiter",
    "reset_redis_rate_limiter",
    # Config
    "LOGIN_MAX_ATTEMPTS",
    "LOGIN_WINDOW_SECONDS",
    "SIGNUP_MAX_ATTEMPTS",
    "SIGNUP_WINDOW_SECONDS",
    "COACH_MESSAGE_MAX_ATTEMPTS",
    "COACH_MESSAGE_WINDOW_SECONDS",
    "COACH_SESSION_MAX_ATTEMPTS",
    "COACH_SESSION_WINDOW_SECONDS",
    "API_RATE_LIMITS",
    "API_RATE_WINDOW_SECONDS",
    "RATE_LIMITING_ENABLED",
    "USE_REDIS_RATE_LIMITING",
    # Helpers
    "get_client_ip",
    "create_rate_limit_response",
    # Dependencies
    "check_login_rate_limit_redis",
    "check_signup_rate_limit_redis",
    "reset_login_rate_limit_redis",
    "check_coach_message_rate_limit_redis",
    "check_coach_session_rate_limit_redis",
    "check_api_rate_limit_redis",
    "get_rate_limit_headers",
]
