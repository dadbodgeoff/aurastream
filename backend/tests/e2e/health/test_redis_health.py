"""
Redis Health Tests.

Validates Redis connectivity and basic operations.
"""

import uuid
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest


@pytest.mark.e2e
@pytest.mark.smoke
class TestRedisHealth:
    """
    Test suite for Redis health and basic operations.
    
    These tests validate that Redis is accessible and performing
    basic operations correctly. They serve as smoke tests to ensure
    the caching and session infrastructure is operational.
    """

    def test_redis_connection_established(self, redis_client: Any) -> None:
        """
        Test that Redis connection is established.
        
        Validates that the Redis client is properly initialized and
        can be used for operations. This is the most basic health check.
        """
        assert redis_client is not None, "Redis client should be initialized"
        
        # Verify the client has the expected interface
        assert hasattr(redis_client, "get"), "Redis client should have 'get' method"
        assert hasattr(redis_client, "set"), "Redis client should have 'set' method"
        assert hasattr(redis_client, "delete"), "Redis client should have 'delete' method"

    @pytest.mark.asyncio
    async def test_redis_ping_responds(self, redis_client: Any) -> None:
        """
        Test that Redis responds to PING command.
        """
        # For mock client, we need to set up the ping response
        if isinstance(redis_client, MagicMock):
            redis_client.ping = AsyncMock(return_value=True)
        
        result = await redis_client.ping()
        
        # PING should return True or "PONG"
        assert result in (True, "PONG", b"PONG"), (
            f"Redis PING should return True or 'PONG', got {result}"
        )

    @pytest.mark.asyncio
    async def test_redis_set_get_operations(self, redis_client: Any) -> None:
        """
        Test that Redis SET/GET operations work correctly.
        """
        test_key = f"e2e_test_key_{uuid.uuid4().hex[:8]}"
        test_value = "e2e_test_value_12345"
        
        # For mock client, configure the expected behavior
        if isinstance(redis_client, MagicMock):
            stored_data = {}
            
            async def mock_set(key: str, value: str, **kwargs) -> bool:
                stored_data[key] = value
                return True
            
            async def mock_get(key: str) -> str | None:
                return stored_data.get(key)
            
            async def mock_delete(*keys: str) -> int:
                count = 0
                for key in keys:
                    if key in stored_data:
                        del stored_data[key]
                        count += 1
                return count
            
            redis_client.set = AsyncMock(side_effect=mock_set)
            redis_client.get = AsyncMock(side_effect=mock_get)
            redis_client.delete = AsyncMock(side_effect=mock_delete)
        
        try:
            # SET operation
            set_result = await redis_client.set(test_key, test_value)
            
            assert set_result in (True, "OK", b"OK", None), (
                f"Redis SET should succeed, got {set_result}"
            )
            
            # GET operation
            get_result = await redis_client.get(test_key)
            
            # Handle bytes response
            if isinstance(get_result, bytes):
                get_result = get_result.decode("utf-8")
            
            assert get_result == test_value, (
                f"Redis GET should return '{test_value}', got '{get_result}'"
            )
            
        finally:
            # Cleanup: delete the test key
            await redis_client.delete(test_key)

    @pytest.mark.asyncio
    async def test_redis_delete_operation(self, redis_client: Any) -> None:
        """
        Test that Redis DELETE operation works correctly.
        """
        test_key = f"e2e_test_delete_{uuid.uuid4().hex[:8]}"
        test_value = "value_to_delete"
        
        # For mock client, configure the expected behavior
        if isinstance(redis_client, MagicMock):
            stored_data = {}
            
            async def mock_set(key: str, value: str, **kwargs) -> bool:
                stored_data[key] = value
                return True
            
            async def mock_get(key: str) -> str | None:
                return stored_data.get(key)
            
            async def mock_delete(*keys: str) -> int:
                count = 0
                for key in keys:
                    if key in stored_data:
                        del stored_data[key]
                        count += 1
                return count
            
            redis_client.set = AsyncMock(side_effect=mock_set)
            redis_client.get = AsyncMock(side_effect=mock_get)
            redis_client.delete = AsyncMock(side_effect=mock_delete)
        
        # Set a key first
        await redis_client.set(test_key, test_value)
        
        # Delete the key
        delete_result = await redis_client.delete(test_key)
        
        # DELETE should return the number of keys deleted (1) or True
        assert delete_result in (1, True), (
            f"Redis DELETE should return 1 or True for existing key, got {delete_result}"
        )
        
        # Verify key no longer exists
        get_result = await redis_client.get(test_key)
        
        assert get_result is None, (
            f"Deleted key should return None, got '{get_result}'"
        )

    @pytest.mark.asyncio
    async def test_redis_expiration_works(self, redis_client: Any) -> None:
        """
        Test that Redis key expiration works correctly.
        """
        test_key = f"e2e_test_expire_{uuid.uuid4().hex[:8]}"
        test_value = "expiring_value"
        ttl_seconds = 60  # 60 second TTL for testing
        
        # For mock client, configure the expected behavior
        if isinstance(redis_client, MagicMock):
            stored_data = {}
            ttl_data = {}
            
            async def mock_set(key: str, value: str, ex: int = None, **kwargs) -> bool:
                stored_data[key] = value
                if ex:
                    ttl_data[key] = ex
                return True
            
            async def mock_get(key: str) -> str | None:
                return stored_data.get(key)
            
            async def mock_ttl(key: str) -> int:
                return ttl_data.get(key, -1)
            
            async def mock_delete(*keys: str) -> int:
                count = 0
                for key in keys:
                    if key in stored_data:
                        del stored_data[key]
                        count += 1
                    if key in ttl_data:
                        del ttl_data[key]
                return count
            
            redis_client.set = AsyncMock(side_effect=mock_set)
            redis_client.get = AsyncMock(side_effect=mock_get)
            redis_client.ttl = AsyncMock(side_effect=mock_ttl)
            redis_client.delete = AsyncMock(side_effect=mock_delete)
        
        try:
            # Set key with expiration
            await redis_client.set(test_key, test_value, ex=ttl_seconds)
            
            # Verify key exists
            get_result = await redis_client.get(test_key)
            
            # Handle bytes response
            if isinstance(get_result, bytes):
                get_result = get_result.decode("utf-8")
            
            assert get_result == test_value, (
                f"Key should exist with value '{test_value}', got '{get_result}'"
            )
            
            # Verify TTL is set (should be positive and <= ttl_seconds)
            ttl_result = await redis_client.ttl(test_key)
            
            assert ttl_result > 0, (
                f"TTL should be positive, got {ttl_result}"
            )
            assert ttl_result <= ttl_seconds, (
                f"TTL should be <= {ttl_seconds}, got {ttl_result}"
            )
            
        finally:
            # Cleanup: delete the test key
            await redis_client.delete(test_key)
