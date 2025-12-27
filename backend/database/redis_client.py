"""
Redis client for Aurastream.

Provides async Redis client for session storage and caching.
"""

import os
from typing import Optional

import redis.asyncio as redis

# Global Redis client instance
_redis_client: Optional[redis.Redis] = None


def get_redis_client() -> redis.Redis:
    """
    Get or create the Redis client singleton.
    
    Returns:
        redis.Redis: Async Redis client instance
    """
    global _redis_client
    
    if _redis_client is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        _redis_client = redis.from_url(redis_url, decode_responses=True)
    
    return _redis_client


async def close_redis_client():
    """Close the Redis client connection."""
    global _redis_client
    
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None
