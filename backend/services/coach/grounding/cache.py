"""
Grounding Cache for Prompt Coach.

Redis-backed cache for grounding search results with game-specific TTLs.
Games that update frequently (like Fortnite) have shorter TTLs to ensure
current information, while more stable games have longer TTLs.
"""

import json
import hashlib
import logging
from typing import Optional

from backend.services.coach.grounding.strategy import GroundingResult

logger = logging.getLogger(__name__)


class GroundingCache:
    """Redis-backed cache for grounding search results."""
    
    # Game-specific TTLs in seconds
    GAME_TTLS = {
        "fortnite": 3600,       # 1 hour - updates frequently
        "apex legends": 3600,
        "valorant": 7200,       # 2 hours
        "league of legends": 7200,
        "overwatch": 7200,
        "call of duty": 3600,
        "warzone": 3600,
        "minecraft": 86400,     # 24 hours - stable
        "default": 7200,        # 2 hours default
    }
    
    KEY_PREFIX = "grounding:cache:"
    
    def __init__(self, redis_client=None):
        """
        Initialize the grounding cache.
        
        Args:
            redis_client: Redis client instance (optional, will lazy-load if not provided)
        """
        self._redis = redis_client
    
    @property
    def redis(self):
        """Lazy-load Redis client."""
        if self._redis is None:
            from backend.database.redis_client import get_redis_client
            self._redis = get_redis_client()
        return self._redis
    
    def _cache_key(self, game: str, query: str) -> str:
        """Generate cache key from game and query."""
        normalized_query = " ".join(query.lower().split())
        query_hash = hashlib.sha256(normalized_query.encode()).hexdigest()[:16]
        game_normalized = game.lower().replace(" ", "_")
        return f"{self.KEY_PREFIX}{game_normalized}:{query_hash}"
    
    def _get_ttl(self, game: str) -> int:
        """Get TTL for a game."""
        game_lower = game.lower()
        return self.GAME_TTLS.get(game_lower, self.GAME_TTLS["default"])
    
    async def get(self, game: str, query: str) -> Optional[GroundingResult]:
        """
        Get cached grounding result.
        
        Args:
            game: Game name for cache key
            query: Search query
            
        Returns:
            GroundingResult if cached, None otherwise
        """
        try:
            cache_key = self._cache_key(game, query)
            cached_data = await self.redis.get(cache_key)
            
            if cached_data is None:
                logger.debug(f"Cache miss for game={game}, query_hash={cache_key[-16:]}")
                return None
            
            data = json.loads(cached_data)
            logger.debug(f"Cache hit for game={game}, query_hash={cache_key[-16:]}")
            return GroundingResult.from_dict(data)
            
        except Exception as e:
            # Cache errors should not break the flow
            logger.warning(f"Cache get error: {e}")
            return None
    
    async def set(self, game: str, query: str, result: GroundingResult) -> None:
        """
        Cache a grounding result.
        
        Args:
            game: Game name for cache key and TTL
            query: Search query
            result: GroundingResult to cache
        """
        try:
            cache_key = self._cache_key(game, query)
            ttl = self._get_ttl(game)
            data = json.dumps(result.to_dict())
            
            await self.redis.setex(cache_key, ttl, data)
            logger.debug(f"Cached grounding result for game={game}, ttl={ttl}s")
            
        except Exception as e:
            # Cache errors should not break the flow
            logger.warning(f"Cache set error: {e}")
    
    async def invalidate(self, game: str) -> int:
        """
        Invalidate all cache entries for a game.
        
        Args:
            game: Game name to invalidate
            
        Returns:
            Number of entries deleted
        """
        try:
            game_normalized = game.lower().replace(" ", "_")
            pattern = f"{self.KEY_PREFIX}{game_normalized}:*"
            
            # Use SCAN to find matching keys
            cursor = 0
            deleted_count = 0
            
            while True:
                cursor, keys = await self.redis.scan(cursor, match=pattern, count=100)
                if keys:
                    deleted_count += await self.redis.delete(*keys)
                if cursor == 0:
                    break
            
            logger.info(f"Invalidated {deleted_count} cache entries for game={game}")
            return deleted_count
            
        except Exception as e:
            logger.warning(f"Cache invalidate error: {e}")
            return 0


# Singleton instance for grounding cache
_grounding_cache: Optional[GroundingCache] = None


def get_grounding_cache(redis_client=None) -> GroundingCache:
    """
    Get or create the grounding cache singleton.
    
    Args:
        redis_client: Optional Redis client to use
        
    Returns:
        GroundingCache instance
    """
    global _grounding_cache
    if _grounding_cache is None or redis_client is not None:
        _grounding_cache = GroundingCache(redis_client=redis_client)
    return _grounding_cache


__all__ = [
    "GroundingCache",
    "get_grounding_cache",
]
