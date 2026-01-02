"""
Unit tests for resilient Redis client.

Tests the circuit breaker pattern, security modes, and graceful degradation
when Redis is unavailable.
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import redis.asyncio as redis

from backend.database.redis_client import (
    ResilientRedisClient,
    RedisSecurityMode,
    RedisUnavailableError,
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitState,
    RedisHealthStatus,
)


class TestCircuitBreaker:
    """Tests for the circuit breaker implementation."""
    
    @pytest.fixture
    def circuit_breaker(self):
        """Create a circuit breaker with low thresholds for testing."""
        config = CircuitBreakerConfig(
            failure_threshold=3,
            recovery_timeout=0.1,  # 100ms for fast tests
            half_open_max_calls=2,
        )
        return CircuitBreaker(config)
    
    def test_initial_state_is_closed(self, circuit_breaker):
        """Circuit breaker starts in CLOSED state."""
        assert circuit_breaker.state == CircuitState.CLOSED
        assert circuit_breaker.is_call_permitted()
    
    @pytest.mark.asyncio
    async def test_opens_after_failure_threshold(self, circuit_breaker):
        """Circuit opens after reaching failure threshold."""
        # Record failures up to threshold
        for _ in range(3):
            await circuit_breaker.record_failure()
        
        assert circuit_breaker.state == CircuitState.OPEN
        assert not circuit_breaker.is_call_permitted()
    
    @pytest.mark.asyncio
    async def test_success_resets_failure_count(self, circuit_breaker):
        """Successful operations reset the failure count."""
        await circuit_breaker.record_failure()
        await circuit_breaker.record_failure()
        await circuit_breaker.record_success()
        
        # Should still be closed and failure count reset
        assert circuit_breaker.state == CircuitState.CLOSED
        
        # One more failure shouldn't open it
        await circuit_breaker.record_failure()
        assert circuit_breaker.state == CircuitState.CLOSED
    
    @pytest.mark.asyncio
    async def test_transitions_to_half_open_after_timeout(self, circuit_breaker):
        """Circuit transitions to HALF_OPEN after recovery timeout."""
        # Open the circuit
        for _ in range(3):
            await circuit_breaker.record_failure()
        
        assert circuit_breaker.state == CircuitState.OPEN
        
        # Wait for recovery timeout
        await asyncio.sleep(0.15)
        
        # Should now be half-open
        assert circuit_breaker.state == CircuitState.HALF_OPEN
        assert circuit_breaker.is_call_permitted()
    
    @pytest.mark.asyncio
    async def test_closes_after_successful_half_open_calls(self, circuit_breaker):
        """Circuit closes after successful calls in HALF_OPEN state."""
        # Open the circuit
        for _ in range(3):
            await circuit_breaker.record_failure()
        
        # Wait for recovery timeout
        await asyncio.sleep(0.15)
        
        # Access state to trigger transition to half-open
        assert circuit_breaker.state == CircuitState.HALF_OPEN
        
        # Record successful calls in half-open state
        await circuit_breaker.record_success()
        await circuit_breaker.record_success()
        
        assert circuit_breaker.state == CircuitState.CLOSED
    
    @pytest.mark.asyncio
    async def test_reopens_on_failure_in_half_open(self, circuit_breaker):
        """Circuit reopens if a call fails in HALF_OPEN state."""
        # Open the circuit
        for _ in range(3):
            await circuit_breaker.record_failure()
        
        # Wait for recovery timeout
        await asyncio.sleep(0.15)
        
        # Fail in half-open state
        await circuit_breaker.record_failure()
        
        assert circuit_breaker.state == CircuitState.OPEN


class TestResilientRedisClientStrictMode:
    """Tests for STRICT security mode behavior."""
    
    @pytest.fixture
    def strict_client(self):
        """Create a client in STRICT mode."""
        return ResilientRedisClient(
            redis_url="redis://localhost:6379",
            security_mode=RedisSecurityMode.STRICT,
        )
    
    @pytest.mark.asyncio
    async def test_raises_on_connection_failure(self, strict_client):
        """STRICT mode raises RedisUnavailableError on connection failure."""
        with patch.object(strict_client, '_get_client') as mock_get:
            mock_client = AsyncMock()
            mock_client.get.side_effect = redis.ConnectionError("Connection refused")
            mock_get.return_value = mock_client
            
            with pytest.raises(RedisUnavailableError) as exc_info:
                await strict_client.get("test_key")
            
            assert "test_key" in str(exc_info.value)
            assert exc_info.value.operation == "GET test_key"
    
    @pytest.mark.asyncio
    async def test_raises_when_circuit_open(self, strict_client):
        """STRICT mode raises when circuit breaker is open."""
        # Force circuit open
        for _ in range(5):
            await strict_client._circuit_breaker.record_failure()
        
        with pytest.raises(RedisUnavailableError) as exc_info:
            await strict_client.get("test_key")
        
        assert "circuit breaker open" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_successful_operation(self, strict_client):
        """Successful operations work normally in STRICT mode."""
        with patch.object(strict_client, '_get_client') as mock_get:
            mock_client = AsyncMock()
            mock_client.get.return_value = "test_value"
            mock_get.return_value = mock_client
            
            result = await strict_client.get("test_key")
            
            assert result == "test_value"
            assert strict_client.circuit_state == CircuitState.CLOSED


class TestResilientRedisClientPermissiveMode:
    """Tests for PERMISSIVE security mode behavior."""
    
    @pytest.fixture
    def permissive_client(self):
        """Create a client in PERMISSIVE mode."""
        return ResilientRedisClient(
            redis_url="redis://localhost:6379",
            security_mode=RedisSecurityMode.PERMISSIVE,
        )
    
    @pytest.mark.asyncio
    async def test_returns_fallback_on_connection_failure(self, permissive_client):
        """PERMISSIVE mode returns fallback on connection failure."""
        with patch.object(permissive_client, '_get_client') as mock_get:
            mock_client = AsyncMock()
            mock_client.get.side_effect = redis.ConnectionError("Connection refused")
            mock_get.return_value = mock_client
            
            result = await permissive_client.get("test_key", fallback="default")
            
            assert result == "default"
    
    @pytest.mark.asyncio
    async def test_returns_fallback_when_circuit_open(self, permissive_client):
        """PERMISSIVE mode returns fallback when circuit is open."""
        # Force circuit open
        for _ in range(5):
            await permissive_client._circuit_breaker.record_failure()
        
        result = await permissive_client.get("test_key", fallback="fallback_value")
        
        assert result == "fallback_value"
    
    @pytest.mark.asyncio
    async def test_logs_critical_warning_on_failure(self, permissive_client):
        """PERMISSIVE mode logs critical warnings on failure."""
        with patch.object(permissive_client, '_get_client') as mock_get:
            mock_client = AsyncMock()
            mock_client.get.side_effect = redis.ConnectionError("Connection refused")
            mock_get.return_value = mock_client
            
            with patch('backend.database.redis_client.logger') as mock_logger:
                await permissive_client.get("test_key", fallback="default")
                
                # Should log a critical warning
                mock_logger.critical.assert_called()


class TestHealthCheck:
    """Tests for Redis health check functionality."""
    
    @pytest.fixture
    def client(self):
        """Create a test client."""
        return ResilientRedisClient(
            redis_url="redis://localhost:6379",
            security_mode=RedisSecurityMode.PERMISSIVE,
        )
    
    @pytest.mark.asyncio
    async def test_healthy_status_on_success(self, client):
        """Health check returns healthy status when Redis responds."""
        with patch.object(client, '_get_client') as mock_get:
            mock_redis = AsyncMock()
            mock_redis.ping.return_value = True
            mock_get.return_value = mock_redis
            
            status = await client.health_check()
            
            assert status.is_healthy
            assert status.latency_ms is not None
            assert status.error is None
            assert status.circuit_state == CircuitState.CLOSED
    
    @pytest.mark.asyncio
    async def test_unhealthy_status_on_failure(self, client):
        """Health check returns unhealthy status when Redis fails."""
        with patch.object(client, '_get_client') as mock_get:
            mock_redis = AsyncMock()
            mock_redis.ping.side_effect = redis.ConnectionError("Connection refused")
            mock_get.return_value = mock_redis
            
            status = await client.health_check()
            
            assert not status.is_healthy
            assert status.error is not None
            assert "Connection refused" in status.error


class TestSecurityModeConfiguration:
    """Tests for security mode configuration from environment."""
    
    def test_defaults_to_strict_mode(self):
        """Client defaults to STRICT mode when env var not set."""
        with patch.dict('os.environ', {}, clear=True):
            # Remove REDIS_SECURITY_MODE if present
            import os
            os.environ.pop('REDIS_SECURITY_MODE', None)
            
            client = ResilientRedisClient(redis_url="redis://localhost:6379")
            assert client.security_mode == RedisSecurityMode.STRICT
    
    def test_respects_env_var_permissive(self):
        """Client respects REDIS_SECURITY_MODE=permissive."""
        with patch.dict('os.environ', {'REDIS_SECURITY_MODE': 'permissive'}):
            client = ResilientRedisClient(redis_url="redis://localhost:6379")
            assert client.security_mode == RedisSecurityMode.PERMISSIVE
    
    def test_parameter_overrides_env_var(self):
        """Explicit parameter overrides environment variable."""
        with patch.dict('os.environ', {'REDIS_SECURITY_MODE': 'permissive'}):
            client = ResilientRedisClient(
                redis_url="redis://localhost:6379",
                security_mode=RedisSecurityMode.STRICT,
            )
            assert client.security_mode == RedisSecurityMode.STRICT


class TestConvenienceMethods:
    """Tests for convenience methods (get, set, delete, etc.)."""
    
    @pytest.fixture
    def client(self):
        """Create a test client in permissive mode."""
        return ResilientRedisClient(
            redis_url="redis://localhost:6379",
            security_mode=RedisSecurityMode.PERMISSIVE,
        )
    
    @pytest.mark.asyncio
    async def test_set_operation(self, client):
        """Test SET operation."""
        with patch.object(client, '_get_client') as mock_get:
            mock_redis = AsyncMock()
            mock_redis.set.return_value = True
            mock_get.return_value = mock_redis
            
            result = await client.set("key", "value", ex=60)
            
            assert result is True
            mock_redis.set.assert_called_once_with("key", "value", ex=60)
    
    @pytest.mark.asyncio
    async def test_delete_operation(self, client):
        """Test DELETE operation."""
        with patch.object(client, '_get_client') as mock_get:
            mock_redis = AsyncMock()
            mock_redis.delete.return_value = 1
            mock_get.return_value = mock_redis
            
            result = await client.delete("key")
            
            assert result == 1
    
    @pytest.mark.asyncio
    async def test_incr_operation(self, client):
        """Test INCR operation."""
        with patch.object(client, '_get_client') as mock_get:
            mock_redis = AsyncMock()
            mock_redis.incr.return_value = 5
            mock_get.return_value = mock_redis
            
            result = await client.incr("counter")
            
            assert result == 5
    
    @pytest.mark.asyncio
    async def test_hset_and_hgetall(self, client):
        """Test hash operations."""
        with patch.object(client, '_get_client') as mock_get:
            mock_redis = AsyncMock()
            mock_redis.hset.return_value = 2
            mock_redis.hgetall.return_value = {"field1": "value1", "field2": "value2"}
            mock_get.return_value = mock_redis
            
            # Test HSET
            result = await client.hset("hash_key", {"field1": "value1", "field2": "value2"})
            assert result == 2
            
            # Test HGETALL
            result = await client.hgetall("hash_key")
            assert result == {"field1": "value1", "field2": "value2"}
    
    @pytest.mark.asyncio
    async def test_set_operations(self, client):
        """Test set operations (SADD, SMEMBERS)."""
        with patch.object(client, '_get_client') as mock_get:
            mock_redis = AsyncMock()
            mock_redis.sadd.return_value = 2
            mock_redis.smembers.return_value = {"member1", "member2"}
            mock_get.return_value = mock_redis
            
            # Test SADD
            result = await client.sadd("set_key", "member1", "member2")
            assert result == 2
            
            # Test SMEMBERS
            result = await client.smembers("set_key")
            assert result == {"member1", "member2"}
