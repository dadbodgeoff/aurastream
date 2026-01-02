"""
Unit tests for Grounding Cache.

Tests cover:
- Cache key generation
- Game-specific TTLs
- Get/set operations
- Cache invalidation
- Error handling

Run with: python3 -m pytest backend/tests/unit/test_grounding_cache.py -v
"""

import sys
import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch

# Mock the google.genai import before importing the grounding module
# This prevents ImportError when google-genai package is not installed
if "google.genai" not in sys.modules:
    sys.modules["google.genai"] = MagicMock()
    sys.modules["google"] = MagicMock()

# Now we can safely import from grounding module
from backend.services.coach.grounding import (
    GroundingCache,
    GroundingResult,
    get_grounding_cache,
)


class TestGroundingCache:
    """Tests for GroundingCache class."""
    
    @pytest.fixture
    def mock_redis(self):
        """Create a mock Redis client."""
        mock = AsyncMock()
        mock.get = AsyncMock(return_value=None)
        mock.setex = AsyncMock()
        mock.scan = AsyncMock(return_value=(0, []))
        mock.delete = AsyncMock(return_value=0)
        return mock
    
    @pytest.fixture
    def cache(self, mock_redis):
        """Create a cache with mocked Redis."""
        return GroundingCache(redis_client=mock_redis)
    
    @pytest.fixture
    def sample_result(self):
        """Sample grounding result for testing."""
        return GroundingResult(
            context="Fortnite Chapter 5 Season 1 features...",
            sources=["https://fortnite.com/news"],
            query="fortnite current season 2024",
        )
    
    # =========================================================================
    # Test cache key generation
    # =========================================================================
    
    def test_cache_key_normalizes_query(self, cache):
        """Test that cache keys are normalized."""
        key1 = cache._cache_key("fortnite", "current season")
        key2 = cache._cache_key("fortnite", "  CURRENT   SEASON  ")
        assert key1 == key2
    
    def test_cache_key_normalizes_game(self, cache):
        """Test that game names are normalized."""
        key1 = cache._cache_key("Fortnite", "test")
        key2 = cache._cache_key("fortnite", "test")
        assert key1 == key2
    
    def test_cache_key_different_queries_different_keys(self, cache):
        """Test that different queries produce different keys."""
        key1 = cache._cache_key("fortnite", "current season")
        key2 = cache._cache_key("fortnite", "battle pass")
        assert key1 != key2
    
    def test_cache_key_different_games_different_keys(self, cache):
        """Test that different games produce different keys."""
        key1 = cache._cache_key("fortnite", "current season")
        key2 = cache._cache_key("apex legends", "current season")
        assert key1 != key2
    
    def test_cache_key_has_correct_prefix(self, cache):
        """Test that cache keys have the correct prefix."""
        key = cache._cache_key("fortnite", "test query")
        assert key.startswith(GroundingCache.KEY_PREFIX)
    
    def test_cache_key_game_spaces_replaced(self, cache):
        """Test that spaces in game names are replaced with underscores."""
        key = cache._cache_key("apex legends", "test")
        assert "apex_legends" in key
        assert "apex legends" not in key
    
    # =========================================================================
    # Test TTL selection
    # =========================================================================
    
    def test_ttl_fortnite(self, cache):
        """Test Fortnite gets 1 hour TTL."""
        assert cache._get_ttl("fortnite") == 3600
    
    def test_ttl_apex_legends(self, cache):
        """Test Apex Legends gets 1 hour TTL."""
        assert cache._get_ttl("apex legends") == 3600
    
    def test_ttl_valorant(self, cache):
        """Test Valorant gets 2 hour TTL."""
        assert cache._get_ttl("valorant") == 7200
    
    def test_ttl_league_of_legends(self, cache):
        """Test League of Legends gets 2 hour TTL."""
        assert cache._get_ttl("league of legends") == 7200
    
    def test_ttl_minecraft(self, cache):
        """Test Minecraft gets 24 hour TTL."""
        assert cache._get_ttl("minecraft") == 86400
    
    def test_ttl_unknown_game(self, cache):
        """Test unknown games get default TTL."""
        assert cache._get_ttl("unknown_game") == 7200
    
    def test_ttl_case_insensitive(self, cache):
        """Test TTL lookup is case insensitive."""
        assert cache._get_ttl("FORTNITE") == cache._get_ttl("fortnite")
        assert cache._get_ttl("Minecraft") == cache._get_ttl("minecraft")
    
    def test_ttl_warzone(self, cache):
        """Test Warzone gets 1 hour TTL."""
        assert cache._get_ttl("warzone") == 3600
    
    def test_ttl_call_of_duty(self, cache):
        """Test Call of Duty gets 1 hour TTL."""
        assert cache._get_ttl("call of duty") == 3600
    
    # =========================================================================
    # Test get operation
    # =========================================================================
    
    @pytest.mark.asyncio
    async def test_get_cache_miss(self, cache, mock_redis):
        """Test cache miss returns None."""
        mock_redis.get.return_value = None
        
        result = await cache.get("fortnite", "current season")
        
        assert result is None
        mock_redis.get.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_cache_hit(self, cache, mock_redis, sample_result):
        """Test cache hit returns result."""
        cached_data = json.dumps(sample_result.to_dict())
        mock_redis.get.return_value = cached_data
        
        result = await cache.get("fortnite", "current season 2024")
        
        assert result is not None
        assert result.context == sample_result.context
        assert result.sources == sample_result.sources
        assert result.query == sample_result.query
    
    @pytest.mark.asyncio
    async def test_get_handles_redis_error(self, cache, mock_redis):
        """Test that Redis errors return None (graceful degradation)."""
        mock_redis.get.side_effect = Exception("Redis connection error")
        
        result = await cache.get("fortnite", "current season")
        
        # Should return None instead of raising
        assert result is None
    
    @pytest.mark.asyncio
    async def test_get_handles_invalid_json(self, cache, mock_redis):
        """Test that invalid JSON in cache returns None."""
        mock_redis.get.return_value = "invalid json {"
        
        result = await cache.get("fortnite", "current season")
        
        # Should return None due to JSON decode error
        assert result is None
    
    @pytest.mark.asyncio
    async def test_get_uses_correct_cache_key(self, cache, mock_redis):
        """Test that get uses the correct cache key."""
        mock_redis.get.return_value = None
        
        await cache.get("fortnite", "test query")
        
        # Verify the key passed to Redis
        call_args = mock_redis.get.call_args[0][0]
        assert call_args.startswith(GroundingCache.KEY_PREFIX)
        assert "fortnite" in call_args
    
    # =========================================================================
    # Test set operation
    # =========================================================================
    
    @pytest.mark.asyncio
    async def test_set_stores_with_correct_ttl(self, cache, mock_redis, sample_result):
        """Test that set uses correct TTL for game."""
        await cache.set("fortnite", "current season", sample_result)
        
        # Fortnite should have 1 hour TTL
        mock_redis.setex.assert_called_once()
        call_args = mock_redis.setex.call_args
        assert call_args[0][1] == 3600  # TTL is second argument
    
    @pytest.mark.asyncio
    async def test_set_stores_with_minecraft_ttl(self, cache, mock_redis, sample_result):
        """Test that Minecraft uses 24 hour TTL."""
        await cache.set("minecraft", "test query", sample_result)
        
        call_args = mock_redis.setex.call_args
        assert call_args[0][1] == 86400  # 24 hours
    
    @pytest.mark.asyncio
    async def test_set_stores_with_default_ttl(self, cache, mock_redis, sample_result):
        """Test that unknown games use default TTL."""
        await cache.set("unknown_game", "test query", sample_result)
        
        call_args = mock_redis.setex.call_args
        assert call_args[0][1] == 7200  # Default 2 hours
    
    @pytest.mark.asyncio
    async def test_set_handles_redis_error(self, cache, mock_redis, sample_result):
        """Test that Redis errors don't raise (graceful degradation)."""
        mock_redis.setex.side_effect = Exception("Redis connection error")
        
        # Should not raise
        await cache.set("fortnite", "current season", sample_result)
    
    @pytest.mark.asyncio
    async def test_set_serializes_result_correctly(self, cache, mock_redis, sample_result):
        """Test that result is serialized to JSON correctly."""
        await cache.set("fortnite", "current season", sample_result)
        
        call_args = mock_redis.setex.call_args
        stored_data = call_args[0][2]  # Data is third argument
        
        # Verify it's valid JSON
        parsed = json.loads(stored_data)
        assert parsed["context"] == sample_result.context
        assert parsed["sources"] == sample_result.sources
        assert parsed["query"] == sample_result.query
    
    @pytest.mark.asyncio
    async def test_set_uses_correct_cache_key(self, cache, mock_redis, sample_result):
        """Test that set uses the correct cache key."""
        await cache.set("fortnite", "test query", sample_result)
        
        call_args = mock_redis.setex.call_args[0][0]
        assert call_args.startswith(GroundingCache.KEY_PREFIX)
        assert "fortnite" in call_args
    
    # =========================================================================
    # Test invalidation
    # =========================================================================
    
    @pytest.mark.asyncio
    async def test_invalidate_deletes_matching_keys(self, cache, mock_redis):
        """Test invalidation deletes all keys for a game."""
        # Mock scan to return some keys
        mock_redis.scan.return_value = (0, [
            b"grounding:cache:fortnite:abc123",
            b"grounding:cache:fortnite:def456",
        ])
        mock_redis.delete.return_value = 2
        
        deleted_count = await cache.invalidate("fortnite")
        
        assert deleted_count == 2
        mock_redis.delete.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_invalidate_handles_no_matching_keys(self, cache, mock_redis):
        """Test invalidation when no keys match."""
        mock_redis.scan.return_value = (0, [])
        
        deleted_count = await cache.invalidate("fortnite")
        
        assert deleted_count == 0
        mock_redis.delete.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_invalidate_handles_redis_error(self, cache, mock_redis):
        """Test that Redis errors return 0 (graceful degradation)."""
        mock_redis.scan.side_effect = Exception("Redis connection error")
        
        deleted_count = await cache.invalidate("fortnite")
        
        assert deleted_count == 0
    
    @pytest.mark.asyncio
    async def test_invalidate_uses_correct_pattern(self, cache, mock_redis):
        """Test invalidation uses correct key pattern."""
        mock_redis.scan.return_value = (0, [])
        
        await cache.invalidate("apex legends")
        
        call_args = mock_redis.scan.call_args
        pattern = call_args[1]["match"]
        assert "apex_legends" in pattern
        assert pattern.endswith(":*")
    
    @pytest.mark.asyncio
    async def test_invalidate_handles_pagination(self, cache, mock_redis):
        """Test invalidation handles paginated scan results."""
        # First scan returns cursor 1 (more results)
        # Second scan returns cursor 0 (done)
        mock_redis.scan.side_effect = [
            (1, [b"grounding:cache:fortnite:abc123"]),
            (0, [b"grounding:cache:fortnite:def456"]),
        ]
        mock_redis.delete.return_value = 1
        
        deleted_count = await cache.invalidate("fortnite")
        
        # Should have called scan twice
        assert mock_redis.scan.call_count == 2
        # Should have called delete twice (once per batch)
        assert mock_redis.delete.call_count == 2
        assert deleted_count == 2
    
    # =========================================================================
    # Test Redis property lazy initialization
    # =========================================================================
    
    def test_redis_property_uses_provided_client(self, mock_redis):
        """Test that provided Redis client is used."""
        cache = GroundingCache(redis_client=mock_redis)
        assert cache.redis is mock_redis
    
    def test_redis_property_lazy_initialization(self):
        """Test that Redis client is lazily initialized."""
        cache = GroundingCache(redis_client=None)
        
        with patch('backend.database.redis_client.get_redis_client') as mock_get_redis:
            mock_client = AsyncMock()
            mock_get_redis.return_value = mock_client
            
            # Access the property
            client = cache.redis
            
            mock_get_redis.assert_called_once()
            assert client is mock_client


class TestGroundingResult:
    """Tests for GroundingResult serialization."""
    
    def test_to_dict(self):
        """Test converting to dictionary."""
        result = GroundingResult(
            context="Test context",
            sources=["source1", "source2"],
            query="test query",
        )
        d = result.to_dict()
        assert d["context"] == "Test context"
        assert d["sources"] == ["source1", "source2"]
        assert d["query"] == "test query"
    
    def test_from_dict(self):
        """Test creating from dictionary."""
        d = {
            "context": "Test context",
            "sources": ["source1"],
            "query": "test",
        }
        result = GroundingResult.from_dict(d)
        assert result.context == "Test context"
        assert result.sources == ["source1"]
        assert result.query == "test"
    
    def test_roundtrip_serialization(self):
        """Test that to_dict and from_dict are inverse operations."""
        original = GroundingResult(
            context="Fortnite Chapter 5 Season 1 features new mechanics...",
            sources=["https://fortnite.com/news", "https://epicgames.com"],
            query="fortnite current season 2024",
        )
        
        # Roundtrip
        d = original.to_dict()
        restored = GroundingResult.from_dict(d)
        
        assert restored.context == original.context
        assert restored.sources == original.sources
        assert restored.query == original.query
    
    def test_to_dict_empty_sources(self):
        """Test to_dict with empty sources list."""
        result = GroundingResult(
            context="Test",
            sources=[],
            query="test",
        )
        d = result.to_dict()
        assert d["sources"] == []
    
    def test_from_dict_preserves_source_order(self):
        """Test that from_dict preserves source order."""
        d = {
            "context": "Test",
            "sources": ["first", "second", "third"],
            "query": "test",
        }
        result = GroundingResult.from_dict(d)
        assert result.sources == ["first", "second", "third"]
    
    def test_json_serialization(self):
        """Test full JSON serialization roundtrip."""
        original = GroundingResult(
            context="Test context with special chars: é, ñ, 中文",
            sources=["https://example.com/path?query=1"],
            query="test query",
        )
        
        # Serialize to JSON and back
        json_str = json.dumps(original.to_dict())
        restored = GroundingResult.from_dict(json.loads(json_str))
        
        assert restored.context == original.context
        assert restored.sources == original.sources
        assert restored.query == original.query


class TestGetGroundingCache:
    """Tests for get_grounding_cache singleton function."""
    
    def test_returns_cache_instance(self):
        """Test that get_grounding_cache returns a GroundingCache."""
        mock_redis = AsyncMock()
        cache = get_grounding_cache(redis_client=mock_redis)
        
        assert isinstance(cache, GroundingCache)
    
    def test_returns_same_instance_without_redis(self):
        """Test singleton behavior when no redis_client provided."""
        # Reset the global singleton first
        import backend.services.coach.grounding as grounding_module
        grounding_module._grounding_cache = None
        
        mock_redis = AsyncMock()
        cache1 = get_grounding_cache(redis_client=mock_redis)
        cache2 = get_grounding_cache()  # No redis_client
        
        assert cache1 is cache2
    
    def test_creates_new_instance_with_redis(self):
        """Test that providing redis_client creates new instance."""
        # Reset the global singleton first
        import backend.services.coach.grounding as grounding_module
        grounding_module._grounding_cache = None
        
        mock_redis1 = AsyncMock()
        mock_redis2 = AsyncMock()
        
        cache1 = get_grounding_cache(redis_client=mock_redis1)
        cache2 = get_grounding_cache(redis_client=mock_redis2)
        
        # Should be different instances since we provided different redis clients
        assert cache1 is not cache2


class TestGroundingCacheEdgeCases:
    """Edge case tests for GroundingCache."""
    
    @pytest.fixture
    def mock_redis(self):
        """Create a mock Redis client."""
        mock = AsyncMock()
        mock.get = AsyncMock(return_value=None)
        mock.setex = AsyncMock()
        mock.scan = AsyncMock(return_value=(0, []))
        mock.delete = AsyncMock(return_value=0)
        return mock
    
    @pytest.fixture
    def cache(self, mock_redis):
        """Create a cache with mocked Redis."""
        return GroundingCache(redis_client=mock_redis)
    
    def test_cache_key_empty_query(self, cache):
        """Test cache key generation with empty query."""
        key = cache._cache_key("fortnite", "")
        assert key.startswith(GroundingCache.KEY_PREFIX)
    
    def test_cache_key_empty_game(self, cache):
        """Test cache key generation with empty game."""
        key = cache._cache_key("", "test query")
        assert key.startswith(GroundingCache.KEY_PREFIX)
    
    def test_cache_key_special_characters(self, cache):
        """Test cache key generation with special characters."""
        key = cache._cache_key("fortnite", "test query with émojis 🎮")
        assert key.startswith(GroundingCache.KEY_PREFIX)
    
    def test_cache_key_very_long_query(self, cache):
        """Test cache key generation with very long query."""
        long_query = "a" * 10000
        key = cache._cache_key("fortnite", long_query)
        # Key should be reasonable length due to hashing
        assert len(key) < 100
    
    @pytest.mark.asyncio
    async def test_get_with_unicode_query(self, cache, mock_redis):
        """Test get with unicode characters in query."""
        mock_redis.get.return_value = None
        
        result = await cache.get("fortnite", "test 中文 émoji 🎮")
        
        assert result is None
        mock_redis.get.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_set_with_unicode_content(self, cache, mock_redis):
        """Test set with unicode characters in content."""
        result = GroundingResult(
            context="Content with 中文 and émojis 🎮",
            sources=["https://example.com/中文"],
            query="test 中文",
        )
        
        await cache.set("fortnite", "test", result)
        
        mock_redis.setex.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_handles_missing_fields_in_cached_data(self, cache, mock_redis):
        """Test get handles cached data with missing fields."""
        # Cached data missing 'sources' field
        mock_redis.get.return_value = json.dumps({
            "context": "Test",
            "query": "test",
        })
        
        # Should raise KeyError or return None
        result = await cache.get("fortnite", "test")
        
        # Due to graceful error handling, should return None
        assert result is None
    
    @pytest.mark.asyncio
    async def test_invalidate_game_with_special_characters(self, cache, mock_redis):
        """Test invalidation with special characters in game name."""
        mock_redis.scan.return_value = (0, [])
        
        # Should not raise
        await cache.invalidate("game with spaces & special!")
