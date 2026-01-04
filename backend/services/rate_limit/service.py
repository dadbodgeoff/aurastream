"""
Unified Rate Limit Service for AuraStream.

Provides a single interface for all rate limiting operations:
- Per-minute/hour/day sliding window limits
- Monthly quotas
- Storage/total limits
- Redis-backed for production, in-memory for development
"""

import logging
import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Literal

from backend.services.rate_limit.config import (
    LIMIT_CONFIGS,
    LimitConfig,
    LimitType,
    get_limit,
    get_window_seconds,
)

logger = logging.getLogger(__name__)


@dataclass
class RateLimitResult:
    """Result of a rate limit check."""
    allowed: bool
    limit: int
    used: int
    remaining: int
    retry_after: Optional[int] = None  # Seconds until reset
    resets_at: Optional[datetime] = None
    limit_key: str = ""
    tier: str = "free"
    error: Optional[str] = None


class RateLimitService:
    """
    Unified rate limiting service.
    
    Supports multiple storage backends:
    - Redis (production): Distributed, persistent
    - In-memory (development): Single instance, non-persistent
    
    Usage:
        service = RateLimitService()
        
        # Check if action is allowed
        result = await service.check("monthly_creations", user_id, tier="free")
        if result.allowed:
            await service.increment("monthly_creations", user_id)
        else:
            raise HTTPException(429, detail={"retry_after": result.retry_after})
    """
    
    def __init__(self, redis_client=None, use_redis: bool = None):
        """
        Initialize the rate limit service.
        
        Args:
            redis_client: Optional Redis client (async)
            use_redis: Force Redis usage (default: from env)
        """
        self._redis = redis_client
        self._use_redis = use_redis if use_redis is not None else (
            os.getenv("USE_REDIS_RATE_LIMITING", "true").lower() == "true"
        )
        self._memory_store: Dict[str, Dict[str, Any]] = {}
        self._redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    async def _get_redis(self):
        """Get or create Redis connection."""
        if self._redis is None and self._use_redis:
            try:
                import redis.asyncio as aioredis
                self._redis = await aioredis.from_url(
                    self._redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                )
            except Exception as e:
                logger.warning(f"Redis connection failed, falling back to memory: {e}")
                self._use_redis = False
        return self._redis
    
    def _get_key(self, limit_key: str, identifier: str) -> str:
        """Build the storage key."""
        return f"ratelimit:{limit_key}:{identifier}"
    
    async def check(
        self,
        limit_key: str,
        identifier: str,
        tier: str = "free",
    ) -> RateLimitResult:
        """
        Check if an action is allowed under rate limits.
        
        Args:
            limit_key: The limit to check (e.g., "monthly_creations")
            identifier: User ID, IP address, or email
            tier: User's subscription tier
            
        Returns:
            RateLimitResult with allowed status and usage info
        """
        config = LIMIT_CONFIGS.get(limit_key)
        if not config:
            # Unknown limit - allow by default
            return RateLimitResult(
                allowed=True,
                limit=-1,
                used=0,
                remaining=-1,
                limit_key=limit_key,
                tier=tier,
            )
        
        limit = get_limit(limit_key, tier)
        
        # Unlimited (-1) always allowed
        if limit == -1:
            return RateLimitResult(
                allowed=True,
                limit=-1,
                used=0,
                remaining=-1,
                limit_key=limit_key,
                tier=tier,
            )
        
        # Get current usage
        if self._use_redis:
            return await self._check_redis(config, identifier, tier, limit)
        else:
            return self._check_memory(config, identifier, tier, limit)
    
    async def _check_redis(
        self,
        config: LimitConfig,
        identifier: str,
        tier: str,
        limit: int,
    ) -> RateLimitResult:
        """Check rate limit using Redis."""
        redis = await self._get_redis()
        if not redis:
            return self._check_memory(config, identifier, tier, limit)
        
        key = self._get_key(config.key, identifier)
        window = get_window_seconds(config.limit_type)
        now = time.time()
        
        try:
            if config.limit_type == LimitType.TOTAL:
                # Total limits use simple counter
                count = await redis.get(key)
                used = int(count) if count else 0
            else:
                # Sliding window using sorted set
                window_start = now - window
                
                # Remove old entries and count remaining
                pipe = redis.pipeline()
                pipe.zremrangebyscore(key, 0, window_start)
                pipe.zcard(key)
                results = await pipe.execute()
                used = results[1]
            
            allowed = used < limit
            remaining = max(0, limit - used)
            
            # Calculate retry_after
            retry_after = None
            resets_at = None
            if not allowed and config.limit_type != LimitType.TOTAL:
                if config.limit_type == LimitType.MONTHLY:
                    # Monthly resets on 1st of next month
                    now_dt = datetime.now(timezone.utc)
                    if now_dt.month == 12:
                        resets_at = datetime(now_dt.year + 1, 1, 1, tzinfo=timezone.utc)
                    else:
                        resets_at = datetime(now_dt.year, now_dt.month + 1, 1, tzinfo=timezone.utc)
                    retry_after = int((resets_at - now_dt).total_seconds())
                else:
                    # Get oldest entry to calculate when it expires
                    oldest = await redis.zrange(key, 0, 0, withscores=True)
                    if oldest:
                        oldest_time = oldest[0][1]
                        retry_after = int(oldest_time + window - now) + 1
                        resets_at = datetime.fromtimestamp(oldest_time + window, tz=timezone.utc)
            
            return RateLimitResult(
                allowed=allowed,
                limit=limit,
                used=used,
                remaining=remaining,
                retry_after=retry_after,
                resets_at=resets_at,
                limit_key=config.key,
                tier=tier,
            )
            
        except Exception as e:
            logger.error(f"Redis rate limit check failed: {e}")
            # Fail open
            return RateLimitResult(
                allowed=True,
                limit=limit,
                used=0,
                remaining=limit,
                limit_key=config.key,
                tier=tier,
                error=str(e),
            )
    
    def _check_memory(
        self,
        config: LimitConfig,
        identifier: str,
        tier: str,
        limit: int,
    ) -> RateLimitResult:
        """Check rate limit using in-memory store."""
        key = self._get_key(config.key, identifier)
        window = get_window_seconds(config.limit_type)
        now = time.time()
        
        if key not in self._memory_store:
            self._memory_store[key] = {"timestamps": [], "count": 0}
        
        entry = self._memory_store[key]
        
        if config.limit_type == LimitType.TOTAL:
            used = entry.get("count", 0)
        else:
            # Clean old timestamps
            window_start = now - window
            entry["timestamps"] = [t for t in entry["timestamps"] if t > window_start]
            used = len(entry["timestamps"])
        
        allowed = used < limit
        remaining = max(0, limit - used)
        
        retry_after = None
        resets_at = None
        if not allowed and entry["timestamps"]:
            oldest = min(entry["timestamps"])
            retry_after = int(oldest + window - now) + 1
            resets_at = datetime.fromtimestamp(oldest + window, tz=timezone.utc)
        
        return RateLimitResult(
            allowed=allowed,
            limit=limit,
            used=used,
            remaining=remaining,
            retry_after=retry_after,
            resets_at=resets_at,
            limit_key=config.key,
            tier=tier,
        )
    
    async def increment(
        self,
        limit_key: str,
        identifier: str,
        amount: int = 1,
    ) -> bool:
        """
        Increment the usage counter for a limit.
        
        Call this AFTER the action succeeds.
        
        Args:
            limit_key: The limit to increment
            identifier: User ID, IP address, or email
            amount: Amount to increment (default 1)
            
        Returns:
            True if incremented successfully
        """
        config = LIMIT_CONFIGS.get(limit_key)
        if not config:
            return True
        
        if self._use_redis:
            return await self._increment_redis(config, identifier, amount)
        else:
            return self._increment_memory(config, identifier, amount)
    
    async def _increment_redis(
        self,
        config: LimitConfig,
        identifier: str,
        amount: int,
    ) -> bool:
        """Increment using Redis."""
        redis = await self._get_redis()
        if not redis:
            return self._increment_memory(config, identifier, amount)
        
        key = self._get_key(config.key, identifier)
        window = get_window_seconds(config.limit_type)
        now = time.time()
        
        try:
            if config.limit_type == LimitType.TOTAL:
                await redis.incrby(key, amount)
            else:
                pipe = redis.pipeline()
                for _ in range(amount):
                    pipe.zadd(key, {f"{now}:{_}": now})
                pipe.expire(key, window + 60)  # TTL slightly longer than window
                await pipe.execute()
            return True
        except Exception as e:
            logger.error(f"Redis increment failed: {e}")
            return False
    
    def _increment_memory(
        self,
        config: LimitConfig,
        identifier: str,
        amount: int,
    ) -> bool:
        """Increment using in-memory store."""
        key = self._get_key(config.key, identifier)
        now = time.time()
        
        if key not in self._memory_store:
            self._memory_store[key] = {"timestamps": [], "count": 0}
        
        entry = self._memory_store[key]
        
        if config.limit_type == LimitType.TOTAL:
            entry["count"] = entry.get("count", 0) + amount
        else:
            for i in range(amount):
                entry["timestamps"].append(now + i * 0.001)
        
        return True
    
    async def reset(
        self,
        limit_key: str,
        identifier: str,
    ) -> bool:
        """
        Reset a rate limit for a user (admin function).
        
        Args:
            limit_key: The limit to reset
            identifier: User ID, IP address, or email
            
        Returns:
            True if reset successfully
        """
        config = LIMIT_CONFIGS.get(limit_key)
        if not config:
            return False
        
        key = self._get_key(config.key, identifier)
        
        if self._use_redis:
            redis = await self._get_redis()
            if redis:
                await redis.delete(key)
        
        if key in self._memory_store:
            del self._memory_store[key]
        
        return True
    
    async def get_usage(
        self,
        identifier: str,
        tier: str = "free",
    ) -> Dict[str, RateLimitResult]:
        """
        Get usage for all limits for a user.
        
        Args:
            identifier: User ID
            tier: User's subscription tier
            
        Returns:
            Dictionary of limit_key -> RateLimitResult
        """
        results = {}
        for limit_key in LIMIT_CONFIGS:
            results[limit_key] = await self.check(limit_key, identifier, tier)
        return results
    
    async def check_and_increment(
        self,
        limit_key: str,
        identifier: str,
        tier: str = "free",
    ) -> RateLimitResult:
        """
        Check limit and increment in one call.
        
        Use this when you want to reserve the usage before the action.
        
        Args:
            limit_key: The limit to check
            identifier: User ID, IP address, or email
            tier: User's subscription tier
            
        Returns:
            RateLimitResult - if allowed is True, usage was incremented
        """
        result = await self.check(limit_key, identifier, tier)
        if result.allowed:
            await self.increment(limit_key, identifier)
            result.used += 1
            result.remaining = max(0, result.remaining - 1)
        return result


# =============================================================================
# SINGLETON
# =============================================================================

_rate_limit_service: Optional[RateLimitService] = None


def get_rate_limit_service() -> RateLimitService:
    """Get or create the rate limit service singleton."""
    global _rate_limit_service
    if _rate_limit_service is None:
        _rate_limit_service = RateLimitService()
    return _rate_limit_service
