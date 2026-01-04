"""
Circuit Breaker Pattern for External API Calls.

Prevents cascading failures by tracking API failures and temporarily
blocking requests when failure rate exceeds threshold.

States:
- CLOSED: Normal operation, requests pass through
- OPEN: Circuit is tripped, requests fail immediately
- HALF_OPEN: Testing if service recovered, limited requests allowed

Usage:
    breaker = CircuitBreaker("twitch_api")
    
    async with breaker.call():
        result = await twitch_api.fetch_streams()
"""

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Optional, Dict
import redis.asyncio as redis
import os

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""
    failure_threshold: int = 5  # Failures before opening
    success_threshold: int = 3  # Successes in half-open before closing
    timeout_seconds: int = 60  # Time before trying half-open
    half_open_max_calls: int = 3  # Max calls in half-open state


class CircuitBreakerError(Exception):
    """Raised when circuit is open."""
    def __init__(self, service_name: str, retry_after: int):
        self.service_name = service_name
        self.retry_after = retry_after
        super().__init__(f"Circuit breaker open for {service_name}, retry after {retry_after}s")


class CircuitBreaker:
    """
    Circuit breaker for external API calls.
    
    Uses Redis for distributed state so all worker instances share
    the same circuit state.
    """
    
    REDIS_KEY_PREFIX = "circuit_breaker:"
    
    def __init__(
        self,
        service_name: str,
        config: Optional[CircuitBreakerConfig] = None,
        redis_url: Optional[str] = None,
    ):
        self.service_name = service_name
        self.config = config or CircuitBreakerConfig()
        self._redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self._redis_client: Optional[redis.Redis] = None
    
    async def _get_redis(self) -> redis.Redis:
        if self._redis_client is None:
            self._redis_client = redis.from_url(self._redis_url, decode_responses=True)
        return self._redis_client
    
    def _key(self, suffix: str) -> str:
        return f"{self.REDIS_KEY_PREFIX}{self.service_name}:{suffix}"
    
    async def get_state(self) -> CircuitState:
        """Get current circuit state."""
        r = await self._get_redis()
        state = await r.get(self._key("state"))
        if state:
            return CircuitState(state)
        return CircuitState.CLOSED
    
    async def _set_state(self, state: CircuitState, ttl: Optional[int] = None) -> None:
        """Set circuit state."""
        r = await self._get_redis()
        if ttl:
            await r.setex(self._key("state"), ttl, state.value)
        else:
            await r.set(self._key("state"), state.value)

    async def record_success(self) -> None:
        """Record a successful call."""
        r = await self._get_redis()
        state = await self.get_state()
        
        if state == CircuitState.HALF_OPEN:
            # Increment success counter
            successes = await r.incr(self._key("half_open_successes"))
            if successes >= self.config.success_threshold:
                # Close the circuit
                await self._set_state(CircuitState.CLOSED)
                await r.delete(self._key("failures"))
                await r.delete(self._key("half_open_successes"))
                await r.delete(self._key("half_open_calls"))
                logger.info(f"Circuit breaker CLOSED for {self.service_name}")
        elif state == CircuitState.CLOSED:
            # Reset failure counter on success
            await r.delete(self._key("failures"))
    
    async def record_failure(self) -> None:
        """Record a failed call."""
        r = await self._get_redis()
        state = await self.get_state()
        
        if state == CircuitState.HALF_OPEN:
            # Any failure in half-open reopens the circuit
            await self._set_state(CircuitState.OPEN, ttl=self.config.timeout_seconds)
            await r.delete(self._key("half_open_successes"))
            await r.delete(self._key("half_open_calls"))
            logger.warning(f"Circuit breaker OPEN for {self.service_name} (half-open failure)")
        elif state == CircuitState.CLOSED:
            # Increment failure counter
            failures = await r.incr(self._key("failures"))
            await r.expire(self._key("failures"), 300)  # Reset after 5 min of no failures
            
            if failures >= self.config.failure_threshold:
                await self._set_state(CircuitState.OPEN, ttl=self.config.timeout_seconds)
                logger.warning(f"Circuit breaker OPEN for {self.service_name} ({failures} failures)")

    async def can_execute(self) -> bool:
        """Check if a call can be executed."""
        state = await self.get_state()
        
        if state == CircuitState.CLOSED:
            return True
        
        if state == CircuitState.OPEN:
            # Check if timeout has passed (state key expired)
            r = await self._get_redis()
            ttl = await r.ttl(self._key("state"))
            if ttl <= 0:
                # Transition to half-open
                await self._set_state(CircuitState.HALF_OPEN)
                await r.set(self._key("half_open_calls"), 0)
                await r.set(self._key("half_open_successes"), 0)
                logger.info(f"Circuit breaker HALF_OPEN for {self.service_name}")
                return True
            return False
        
        if state == CircuitState.HALF_OPEN:
            # Allow limited calls
            r = await self._get_redis()
            calls = await r.incr(self._key("half_open_calls"))
            return calls <= self.config.half_open_max_calls
        
        return False

    async def __aenter__(self):
        """Context manager entry - check if call is allowed."""
        if not await self.can_execute():
            r = await self._get_redis()
            ttl = await r.ttl(self._key("state"))
            raise CircuitBreakerError(self.service_name, max(ttl, 0))
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - record success or failure."""
        if exc_type is None:
            await self.record_success()
        else:
            await self.record_failure()
        return False  # Don't suppress exceptions


# Singleton instances for common services
_breakers: Dict[str, CircuitBreaker] = {}


def get_circuit_breaker(service_name: str) -> CircuitBreaker:
    """Get or create a circuit breaker for a service."""
    if service_name not in _breakers:
        _breakers[service_name] = CircuitBreaker(service_name)
    return _breakers[service_name]
