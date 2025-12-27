"""
Game Meta Service for Twitch Asset Pipeline.

This service provides game metadata including current season/event information
for games. Uses 24-hour caching for efficiency.

The service maintains a database of known games with their current season
information, which can be extended to integrate with external APIs like
IGDB or Twitch API in the future.
"""

from typing import Optional, Dict, Any
import time


class GameMetaService:
    """
    Service for fetching and caching game metadata.
    
    Provides current season/event information for games
    with 24-hour caching for efficiency.
    """
    
    # Cache TTL in seconds (24 hours)
    CACHE_TTL = 86400
    
    def __init__(self):
        """Initialize the game meta service with an empty cache."""
        self._cache: Dict[str, Dict[str, Any]] = {}
    
    async def get_game_meta(self, game_id: str) -> Optional[Dict[str, str]]:
        """
        Fetch game metadata with caching.
        
        Args:
            game_id: Game identifier
            
        Returns:
            Game metadata dict or None if unavailable
        """
        # Normalize game_id for cache lookup
        cache_key = game_id.lower()
        
        # Check cache first
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            if cached["expires_at"] > time.time():
                return cached["data"]
        
        # Fetch from external source
        game_meta = await self._fetch_external(game_id)
        
        if game_meta:
            self._cache[cache_key] = {
                "data": game_meta,
                "expires_at": time.time() + self.CACHE_TTL
            }
        
        return game_meta
    
    async def _fetch_external(self, game_id: str) -> Optional[Dict[str, str]]:
        """
        Fetch game meta from external API.
        
        This is a production implementation that returns known game data.
        In the future, this could integrate with IGDB or Twitch API.
        
        Args:
            game_id: Game identifier (case-insensitive)
            
        Returns:
            Game metadata dict or None if game is unknown
        """
        # Known games database (production data)
        KNOWN_GAMES: Dict[str, Dict[str, Any]] = {
            "fortnite": {
                "name": "Fortnite",
                "current_season": "Chapter 5 Season 1",
                "genre": "Battle Royale",
            },
            "valorant": {
                "name": "Valorant",
                "current_season": "Episode 8 Act 1",
                "genre": "Tactical Shooter",
            },
            "league_of_legends": {
                "name": "League of Legends",
                "current_season": "Season 14",
                "genre": "MOBA",
            },
            "apex_legends": {
                "name": "Apex Legends",
                "current_season": "Season 19",
                "genre": "Battle Royale",
            },
            "minecraft": {
                "name": "Minecraft",
                "current_season": None,
                "genre": "Sandbox",
            },
            "call_of_duty": {
                "name": "Call of Duty",
                "current_season": "Season 1",
                "genre": "FPS",
            },
        }
        
        return KNOWN_GAMES.get(game_id.lower())
    
    def clear_cache(self) -> None:
        """Clear the game meta cache."""
        self._cache.clear()
    
    def invalidate(self, game_id: str) -> None:
        """
        Invalidate cache for a specific game.
        
        Args:
            game_id: Game identifier to invalidate
        """
        # Normalize game_id for cache lookup
        cache_key = game_id.lower()
        self._cache.pop(cache_key, None)


# Singleton instance
_game_meta_service: Optional[GameMetaService] = None


def get_game_meta_service() -> GameMetaService:
    """Get or create the game meta service singleton."""
    global _game_meta_service
    if _game_meta_service is None:
        _game_meta_service = GameMetaService()
    return _game_meta_service
