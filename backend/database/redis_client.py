"""
Redis client for Aurastream with resilience patterns.

Provides async Redis client with:
- Health checks for connection verification
- Circuit breaker pattern for graceful degradation
- Configurable security modes (STRICT vs PERMISSIVE)
- Comprehensive logging for security events

Security Modes:
- STRICT: Operations fail if Redis is unavailable (recommended for production)
- PERMISSIVE: Operations degrade gracefully with warnings (for development)
"""

import asyncio
import logging
import os
import time
from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, Optional, TypeVar

import redis.asyncio as redis

logger = logging.getLogger(__name__)

# Type variable for generic return types
T = TypeVar("T")


class RedisSecurityMode(Enum):
    """
    Security mode for Redis-dependent operations.
    
    STRICT: Fail operations if Redis is unavailable.
            Recommended for production to ensure security features work.
    
    PERMISSIVE: Allow operations to continue with degraded functionality.
                Logs critical warnings. Use only for development/testing.
    """
    STRICT = "strict"
    PERMISSIVE = "permissive"


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""
    failure_threshold: int = 5      # Failures before opening circuit
    recovery_timeout: float = 30.0  # Seconds before trying again
    half_open_max_calls: int = 3    # Test calls in half-open state


class CircuitBreaker:
    """
    Circuit breaker for Redis operations.
    
    Prevents cascading failures by failing fast when Redis is down,
    and automatically recovering when it comes back up.
    """
    
    def __init__(self, config: Optional[CircuitBreakerConfig] = None):
        self.config = config or CircuitBreakerConfig()
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._last_failure_time: Optional[float] = None
        self._half_open_calls = 0
        self._lock = asyncio.Lock()
    
    @property
    def state(self) -> CircuitState:
        """Get current circuit state, checking for recovery timeout."""
        if self._state == CircuitState.OPEN:
            if self._last_failure_time and \
               time.time() - self._last_failure_time >= self.config.recovery_timeout:
                # Transition to half-open (but don't update _state yet - that happens on success/failure)
                self._state = CircuitState.HALF_OPEN
                self._half_open_calls = 0
        return self._state
    
    async def record_success(self) -> None:
        """Record a successful operation."""
        async with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._half_open_calls += 1
                if self._half_open_calls >= self.config.half_open_max_calls:
                    # Recovered - close circuit
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0
                    self._half_open_calls = 0
                    logger.info("Redis circuit breaker CLOSED - service recovered")
            elif self._state == CircuitState.CLOSED:
                # Reset failure count on success
                self._failure_count = 0
    
    async def record_failure(self) -> None:
        """Record a failed operation."""
        async with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()
            
            if self._state == CircuitState.HALF_OPEN:
                # Failed during recovery test - reopen circuit
                self._state = CircuitState.OPEN
                self._half_open_calls = 0
                logger.warning("Redis circuit breaker OPEN - recovery failed")
            elif self._failure_count >= self.config.failure_threshold:
                self._state = CircuitState.OPEN
                logger.critical(
                    f"Redis circuit breaker OPEN after {self._failure_count} failures. "
                    f"Will retry in {self.config.recovery_timeout}s"
                )
    
    def is_call_permitted(self) -> bool:
        """Check if a call should be permitted."""
        state = self.state  # This checks for recovery timeout
        
        if state == CircuitState.CLOSED:
            return True
        elif state == CircuitState.HALF_OPEN:
            # Allow limited calls to test recovery
            return self._half_open_calls < self.config.half_open_max_calls
        else:  # OPEN
            return False


class RedisUnavailableError(Exception):
    """Raised when Redis is required but unavailable."""
    def __init__(self, operation: str, reason: str = "connection failed"):
        self.operation = operation
        self.reason = reason
        super().__init__(
            f"Redis unavailable during {operation}: {reason}. "
            "This operation requires Redis for security/functionality."
        )


@dataclass
class RedisHealthStatus:
    """Health status of Redis connection."""
    is_healthy: bool
    latency_ms: Optional[float] = None
    error: Optional[str] = None
    circuit_state: CircuitState = CircuitState.CLOSED
    last_check: Optional[float] = None


class ResilientRedisClient:
    """
    Redis client with resilience patterns.
    
    Features:
    - Circuit breaker to prevent cascading failures
    - Health checks for monitoring
    - Configurable security mode
    - Automatic reconnection
    - Comprehensive logging
    """
    
    def __init__(
        self,
        redis_url: Optional[str] = None,
        security_mode: Optional[RedisSecurityMode] = None,
        circuit_config: Optional[CircuitBreakerConfig] = None,
    ):
        """
        Initialize resilient Redis client.
        
        Args:
            redis_url: Redis connection URL (defaults to REDIS_URL env var)
            security_mode: STRICT or PERMISSIVE (defaults to REDIS_SECURITY_MODE env var)
            circuit_config: Circuit breaker configuration
        """
        self._redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self._client: Optional[redis.Redis] = None
        self._circuit_breaker = CircuitBreaker(circuit_config)
        self._last_health_check: Optional[RedisHealthStatus] = None
        
        # Determine security mode
        if security_mode is None:
            mode_str = os.getenv("REDIS_SECURITY_MODE", "strict").lower()
            self._security_mode = (
                RedisSecurityMode.STRICT if mode_str == "strict" 
                else RedisSecurityMode.PERMISSIVE
            )
        else:
            self._security_mode = security_mode
        
        logger.info(
            f"ResilientRedisClient initialized in {self._security_mode.value} mode",
            extra={"redis_url": self._redis_url.split("@")[-1]}  # Log without password
        )
    
    @property
    def security_mode(self) -> RedisSecurityMode:
        """Get current security mode."""
        return self._security_mode
    
    @property
    def circuit_state(self) -> CircuitState:
        """Get current circuit breaker state."""
        return self._circuit_breaker.state
    
    async def _get_client(self) -> redis.Redis:
        """Get or create Redis client."""
        if self._client is None:
            self._client = redis.from_url(self._redis_url, decode_responses=True)
        return self._client
    
    async def health_check(self) -> RedisHealthStatus:
        """
        Perform health check on Redis connection.
        
        Returns:
            RedisHealthStatus with connection details
        """
        start_time = time.time()
        
        try:
            client = await self._get_client()
            await client.ping()
            latency_ms = (time.time() - start_time) * 1000
            
            await self._circuit_breaker.record_success()
            
            status = RedisHealthStatus(
                is_healthy=True,
                latency_ms=round(latency_ms, 2),
                circuit_state=self._circuit_breaker.state,
                last_check=time.time(),
            )
            
        except Exception as e:
            await self._circuit_breaker.record_failure()
            
            status = RedisHealthStatus(
                is_healthy=False,
                error=str(e),
                circuit_state=self._circuit_breaker.state,
                last_check=time.time(),
            )
            
            logger.error(
                f"Redis health check failed: {e}",
                extra={"circuit_state": self._circuit_breaker.state.value}
            )
        
        self._last_health_check = status
        return status
    
    async def execute(
        self,
        operation: str,
        func: Callable[..., Any],
        *args,
        fallback: Optional[T] = None,
        **kwargs,
    ) -> T:
        """
        Execute a Redis operation with circuit breaker protection.
        
        Args:
            operation: Name of the operation (for logging)
            func: Async function to execute
            *args: Arguments for the function
            fallback: Value to return if operation fails (PERMISSIVE mode only)
            **kwargs: Keyword arguments for the function
            
        Returns:
            Result of the operation or fallback value
            
        Raises:
            RedisUnavailableError: In STRICT mode when Redis is unavailable
        """
        # Check circuit breaker
        if not self._circuit_breaker.is_call_permitted():
            if self._security_mode == RedisSecurityMode.STRICT:
                raise RedisUnavailableError(operation, "circuit breaker open")
            else:
                logger.warning(
                    f"Redis circuit open - returning fallback for {operation}",
                    extra={"operation": operation, "fallback": fallback}
                )
                return fallback
        
        try:
            client = await self._get_client()
            result = await func(client, *args, **kwargs)
            await self._circuit_breaker.record_success()
            return result
            
        except redis.ConnectionError as e:
            await self._circuit_breaker.record_failure()
            return await self._handle_failure(operation, e, fallback)
            
        except redis.TimeoutError as e:
            await self._circuit_breaker.record_failure()
            return await self._handle_failure(operation, e, fallback)
            
        except Exception as e:
            # Don't trip circuit breaker for non-connection errors
            logger.error(f"Redis operation {operation} failed: {e}")
            if self._security_mode == RedisSecurityMode.STRICT:
                raise RedisUnavailableError(operation, str(e))
            return fallback
    
    async def _handle_failure(
        self,
        operation: str,
        error: Exception,
        fallback: Optional[T],
    ) -> T:
        """Handle Redis operation failure based on security mode."""
        if self._security_mode == RedisSecurityMode.STRICT:
            logger.critical(
                f"SECURITY: Redis unavailable during {operation} in STRICT mode",
                extra={"operation": operation, "error": str(error)}
            )
            raise RedisUnavailableError(operation, str(error))
        else:
            logger.critical(
                f"SECURITY WARNING: Redis unavailable during {operation}. "
                f"Operating in PERMISSIVE mode - functionality degraded!",
                extra={"operation": operation, "error": str(error), "fallback": fallback}
            )
            return fallback
    
    # Convenience methods for common operations
    
    async def get(self, key: str, fallback: Optional[str] = None) -> Optional[str]:
        """Get a value from Redis."""
        return await self.execute(
            f"GET {key}",
            lambda c: c.get(key),
            fallback=fallback,
        )
    
    async def set(
        self,
        key: str,
        value: str,
        ex: Optional[int] = None,
        fallback: bool = False,
    ) -> bool:
        """Set a value in Redis."""
        async def _set(client):
            return await client.set(key, value, ex=ex)
        
        return await self.execute(f"SET {key}", _set, fallback=fallback)
    
    async def delete(self, key: str, fallback: int = 0) -> int:
        """Delete a key from Redis."""
        return await self.execute(
            f"DELETE {key}",
            lambda c: c.delete(key),
            fallback=fallback,
        )
    
    async def incr(self, key: str, fallback: int = 0) -> int:
        """Increment a counter."""
        return await self.execute(
            f"INCR {key}",
            lambda c: c.incr(key),
            fallback=fallback,
        )
    
    async def expire(self, key: str, seconds: int, fallback: bool = False) -> bool:
        """Set expiration on a key."""
        return await self.execute(
            f"EXPIRE {key}",
            lambda c: c.expire(key, seconds),
            fallback=fallback,
        )
    
    async def hset(self, key: str, mapping: dict, fallback: int = 0) -> int:
        """Set hash fields."""
        return await self.execute(
            f"HSET {key}",
            lambda c: c.hset(key, mapping=mapping),
            fallback=fallback,
        )
    
    async def hgetall(self, key: str, fallback: Optional[dict] = None) -> dict:
        """Get all hash fields."""
        return await self.execute(
            f"HGETALL {key}",
            lambda c: c.hgetall(key),
            fallback=fallback or {},
        )
    
    async def sadd(self, key: str, *values, fallback: int = 0) -> int:
        """Add members to a set."""
        return await self.execute(
            f"SADD {key}",
            lambda c: c.sadd(key, *values),
            fallback=fallback,
        )
    
    async def smembers(self, key: str, fallback: Optional[set] = None) -> set:
        """Get all members of a set."""
        return await self.execute(
            f"SMEMBERS {key}",
            lambda c: c.smembers(key),
            fallback=fallback or set(),
        )
    
    async def close(self) -> None:
        """Close the Redis connection."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None
            logger.info("Redis connection closed")


# =============================================================================
# Global Instances
# =============================================================================

# Legacy singleton for backward compatibility
_redis_client: Optional[redis.Redis] = None

# New resilient client singleton
_resilient_client: Optional[ResilientRedisClient] = None


def get_redis_client() -> redis.Redis:
    """
    Get or create the Redis client singleton.
    
    DEPRECATED: Use get_resilient_redis_client() for new code.
    This function is maintained for backward compatibility.
    
    Returns:
        redis.Redis: Async Redis client instance
    """
    global _redis_client
    
    if _redis_client is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        _redis_client = redis.from_url(redis_url, decode_responses=True)
    
    return _redis_client


def get_resilient_redis_client() -> ResilientRedisClient:
    """
    Get or create the resilient Redis client singleton.
    
    This client includes:
    - Circuit breaker for graceful degradation
    - Health checks
    - Configurable security modes
    
    Returns:
        ResilientRedisClient instance
    """
    global _resilient_client
    
    if _resilient_client is None:
        _resilient_client = ResilientRedisClient()
    
    return _resilient_client


async def close_redis_client() -> None:
    """Close all Redis client connections."""
    global _redis_client, _resilient_client
    
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
    
    if _resilient_client is not None:
        await _resilient_client.close()
        _resilient_client = None


def reset_redis_clients() -> None:
    """Reset all Redis client singletons (for testing)."""
    global _redis_client, _resilient_client
    _redis_client = None
    _resilient_client = None


__all__ = [
    # Security mode
    "RedisSecurityMode",
    # Circuit breaker
    "CircuitState",
    "CircuitBreakerConfig",
    "CircuitBreaker",
    # Errors
    "RedisUnavailableError",
    # Health
    "RedisHealthStatus",
    # Client
    "ResilientRedisClient",
    # Singletons
    "get_redis_client",
    "get_resilient_redis_client",
    "close_redis_client",
    "reset_redis_clients",
]
