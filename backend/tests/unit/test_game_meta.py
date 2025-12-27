"""
Unit tests for the Game Meta Service.

Tests cover:
- Fetching game metadata
- 24-hour caching behavior
- Cache invalidation
- Unknown game handling
"""

import pytest
import time
from unittest.mock import patch, AsyncMock
from backend.services.twitch.game_meta import GameMetaService


class TestGameMetaService:
    """Tests for GameMetaService class."""
    
    @pytest.fixture
    def service(self):
        """Create fresh GameMetaService instance."""
        return GameMetaService()
    
    @pytest.mark.asyncio
    async def test_get_known_game(self, service):
        """Test fetching metadata for a known game."""
        meta = await service.get_game_meta("fortnite")
        
        assert meta is not None
        assert meta["name"] == "Fortnite"
        assert "current_season" in meta
    
    @pytest.mark.asyncio
    async def test_get_unknown_game(self, service):
        """Test fetching metadata for an unknown game."""
        meta = await service.get_game_meta("unknown_game_xyz")
        
        assert meta is None
    
    @pytest.mark.asyncio
    async def test_case_insensitive_lookup(self, service):
        """Test that game lookup is case insensitive."""
        meta1 = await service.get_game_meta("FORTNITE")
        meta2 = await service.get_game_meta("Fortnite")
        meta3 = await service.get_game_meta("fortnite")
        
        assert meta1 == meta2 == meta3
    
    @pytest.mark.asyncio
    async def test_caching_returns_cached_data(self, service):
        """Test that subsequent calls return cached data."""
        # First call
        meta1 = await service.get_game_meta("valorant")
        
        # Second call should use cache
        meta2 = await service.get_game_meta("valorant")
        
        assert meta1 == meta2
        assert "valorant" in service._cache
    
    @pytest.mark.asyncio
    async def test_cache_expiration(self, service):
        """Test that cache expires after TTL."""
        # Fetch to populate cache
        await service.get_game_meta("apex_legends")
        
        # Manually expire the cache
        service._cache["apex_legends"]["expires_at"] = time.time() - 1
        
        # Should fetch fresh data
        with patch.object(service, '_fetch_external', new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = {"name": "Apex Legends", "current_season": "Season 20", "genre": "Battle Royale"}
            meta = await service.get_game_meta("apex_legends")
            mock_fetch.assert_called_once()
    
    def test_clear_cache(self, service):
        """Test clearing the entire cache."""
        # Populate cache
        service._cache["game1"] = {"data": {}, "expires_at": time.time() + 1000}
        service._cache["game2"] = {"data": {}, "expires_at": time.time() + 1000}
        
        service.clear_cache()
        
        assert len(service._cache) == 0
    
    def test_invalidate_specific_game(self, service):
        """Test invalidating cache for a specific game."""
        # Populate cache
        service._cache["game1"] = {"data": {}, "expires_at": time.time() + 1000}
        service._cache["game2"] = {"data": {}, "expires_at": time.time() + 1000}
        
        service.invalidate("game1")
        
        assert "game1" not in service._cache
        assert "game2" in service._cache
    
    def test_invalidate_nonexistent_game(self, service):
        """Test invalidating a game not in cache doesn't error."""
        service.invalidate("nonexistent")  # Should not raise
    
    @pytest.mark.asyncio
    async def test_all_known_games(self, service):
        """Test that all known games return valid metadata."""
        known_games = ["fortnite", "valorant", "league_of_legends", "apex_legends", "minecraft", "call_of_duty"]
        
        for game_id in known_games:
            meta = await service.get_game_meta(game_id)
            assert meta is not None, f"Game {game_id} should have metadata"
            assert "name" in meta
            assert "genre" in meta
    
    @pytest.mark.asyncio
    async def test_cache_ttl_is_24_hours(self, service):
        """Test that cache TTL is set to 24 hours."""
        assert service.CACHE_TTL == 86400  # 24 * 60 * 60
        
        await service.get_game_meta("fortnite")
        
        cached = service._cache.get("fortnite")
        assert cached is not None
        # Check that expiration is approximately 24 hours from now
        expected_expiry = time.time() + 86400
        assert abs(cached["expires_at"] - expected_expiry) < 5  # Within 5 seconds
    
    @pytest.mark.asyncio
    async def test_minecraft_has_no_season(self, service):
        """Test that Minecraft returns None for current_season."""
        meta = await service.get_game_meta("minecraft")
        
        assert meta is not None
        assert meta["name"] == "Minecraft"
        assert meta["current_season"] is None
        assert meta["genre"] == "Sandbox"
    
    @pytest.mark.asyncio
    async def test_cache_key_normalization(self, service):
        """Test that cache keys are normalized to lowercase."""
        # Fetch with uppercase
        await service.get_game_meta("VALORANT")
        
        # Cache should use lowercase key
        assert "valorant" in service._cache
        assert "VALORANT" not in service._cache
    
    @pytest.mark.asyncio
    async def test_invalidate_case_insensitive(self, service):
        """Test that invalidate works with different cases."""
        # Populate cache with lowercase key
        await service.get_game_meta("fortnite")
        assert "fortnite" in service._cache
        
        # Invalidate with uppercase
        service.invalidate("FORTNITE")
        
        # Should be removed
        assert "fortnite" not in service._cache
