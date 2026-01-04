"""
SSE Stream Registry.

Tracks active SSE streams in Redis for monitoring and orphan detection.

Redis Keys:
- sse:stream:{stream_id}     - Hash with stream metadata (TTL 1hr)
- sse:user:{user_id}:streams - Set of user's active stream IDs
- sse:active                 - Sorted set of all active streams by heartbeat timestamp
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import redis.asyncio as redis

from .types import StreamMetadata, StreamState, StreamType

logger = logging.getLogger(__name__)

# Redis key prefix
KEY_PREFIX = "sse:"

# TTL for stream metadata (1 hour)
STREAM_TTL_SECONDS = 3600


class StreamRegistry:
    """
    Registry for tracking active SSE streams.
    
    Provides methods to register, track, and query active streams
    for monitoring and orphan detection.
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        """
        Initialize the stream registry.
        
        Args:
            redis_client: Optional Redis client. If not provided, creates one from REDIS_URL.
        """
        self._redis = redis_client
    
    async def _get_redis(self) -> redis.Redis:
        """Get or create Redis client."""
        if self._redis is None:
            redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
            self._redis = redis.from_url(redis_url, decode_responses=True)
        return self._redis
    
    def _stream_key(self, stream_id: str) -> str:
        """Get Redis key for stream metadata."""
        return f"{KEY_PREFIX}stream:{stream_id}"
    
    def _user_streams_key(self, user_id: str) -> str:
        """Get Redis key for user's active streams set."""
        return f"{KEY_PREFIX}user:{user_id}:streams"
    
    def _active_key(self) -> str:
        """Get Redis key for active streams sorted set."""
        return f"{KEY_PREFIX}active"
    
    async def register(
        self,
        stream_id: str,
        stream_type: StreamType,
        user_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Register a new active stream.
        
        Args:
            stream_id: Unique identifier for the stream
            stream_type: Type of stream (generation, coach, etc.)
            user_id: ID of the user who owns the stream
            metadata: Optional additional metadata (e.g., job_id, session_id)
        """
        r = await self._get_redis()
        now = datetime.now(timezone.utc)
        timestamp = now.timestamp()
        
        stream_meta = StreamMetadata(
            stream_id=stream_id,
            stream_type=stream_type,
            user_id=user_id,
            started_at=now,
            last_heartbeat=now,
            state=StreamState.ACTIVE,
            metadata=metadata or {},
        )
        
        # Store stream metadata as hash
        stream_key = self._stream_key(stream_id)
        stream_data = stream_meta.to_dict()
        # Convert metadata dict to JSON string for Redis hash storage
        stream_data["metadata"] = json.dumps(stream_data["metadata"])
        
        pipe = r.pipeline()
        
        # Store stream metadata hash with TTL
        pipe.hset(stream_key, mapping=stream_data)
        pipe.expire(stream_key, STREAM_TTL_SECONDS)
        
        # Add to user's streams set
        user_key = self._user_streams_key(user_id)
        pipe.sadd(user_key, stream_id)
        pipe.expire(user_key, STREAM_TTL_SECONDS)
        
        # Add to active streams sorted set (score = timestamp)
        pipe.zadd(self._active_key(), {stream_id: timestamp})
        
        await pipe.execute()
        
        logger.info(
            f"Registered stream {stream_id}",
            extra={
                "stream_id": stream_id,
                "stream_type": stream_type.value,
                "user_id": user_id,
            }
        )
    
    async def heartbeat(self, stream_id: str) -> None:
        """
        Update the heartbeat timestamp for a stream.
        
        Args:
            stream_id: ID of the stream to update
        """
        r = await self._get_redis()
        now = datetime.now(timezone.utc)
        timestamp = now.timestamp()
        
        stream_key = self._stream_key(stream_id)
        
        pipe = r.pipeline()
        
        # Update last_heartbeat in hash
        pipe.hset(stream_key, "last_heartbeat", now.isoformat())
        
        # Update score in active sorted set
        pipe.zadd(self._active_key(), {stream_id: timestamp})
        
        # Refresh TTL
        pipe.expire(stream_key, STREAM_TTL_SECONDS)
        
        await pipe.execute()
    
    async def get_stream(self, stream_id: str) -> Optional[StreamMetadata]:
        """
        Get metadata for a stream.
        
        Args:
            stream_id: ID of the stream
            
        Returns:
            StreamMetadata if found, None otherwise
        """
        r = await self._get_redis()
        stream_key = self._stream_key(stream_id)
        
        data = await r.hgetall(stream_key)
        if not data:
            return None
        
        # Parse metadata JSON
        if "metadata" in data and isinstance(data["metadata"], str):
            try:
                data["metadata"] = json.loads(data["metadata"])
            except json.JSONDecodeError:
                data["metadata"] = {}
        
        return StreamMetadata.from_dict(data)
    
    async def get_user_streams(self, user_id: str) -> List[StreamMetadata]:
        """
        Get all active streams for a user.
        
        Args:
            user_id: ID of the user
            
        Returns:
            List of StreamMetadata for user's active streams
        """
        r = await self._get_redis()
        user_key = self._user_streams_key(user_id)
        
        stream_ids = await r.smembers(user_key)
        if not stream_ids:
            return []
        
        streams = []
        for stream_id in stream_ids:
            stream = await self.get_stream(stream_id)
            if stream:
                streams.append(stream)
        
        return streams
    
    async def get_stale_streams(self, threshold_seconds: int = 30) -> List[StreamMetadata]:
        """
        Get streams that haven't had a heartbeat within the threshold.
        
        Args:
            threshold_seconds: Number of seconds without heartbeat to consider stale
            
        Returns:
            List of stale StreamMetadata
        """
        r = await self._get_redis()
        now = datetime.now(timezone.utc)
        cutoff_timestamp = now.timestamp() - threshold_seconds
        
        # Get stream IDs with heartbeat older than cutoff
        # ZRANGEBYSCORE returns members with scores in range
        stale_ids = await r.zrangebyscore(
            self._active_key(),
            min="-inf",
            max=cutoff_timestamp,
        )
        
        if not stale_ids:
            return []
        
        stale_streams = []
        for stream_id in stale_ids:
            stream = await self.get_stream(stream_id)
            if stream and stream.state == StreamState.ACTIVE:
                stale_streams.append(stream)
        
        return stale_streams
    
    async def unregister(self, stream_id: str) -> None:
        """
        Remove a stream from the registry.
        
        Args:
            stream_id: ID of the stream to remove
        """
        r = await self._get_redis()
        
        # Get stream to find user_id
        stream = await self.get_stream(stream_id)
        
        pipe = r.pipeline()
        
        # Remove stream metadata hash
        pipe.delete(self._stream_key(stream_id))
        
        # Remove from active sorted set
        pipe.zrem(self._active_key(), stream_id)
        
        # Remove from user's streams set if we have the user_id
        if stream:
            pipe.srem(self._user_streams_key(stream.user_id), stream_id)
        
        await pipe.execute()
        
        logger.info(f"Unregistered stream {stream_id}")
    
    async def update_state(self, stream_id: str, state: StreamState) -> None:
        """
        Update the state of a stream.
        
        Args:
            stream_id: ID of the stream
            state: New state to set
        """
        r = await self._get_redis()
        stream_key = self._stream_key(stream_id)
        
        await r.hset(stream_key, "state", state.value)
        
        logger.info(
            f"Updated stream state",
            extra={"stream_id": stream_id, "state": state.value}
        )
    
    async def get_active_count(self) -> int:
        """Get the count of active streams."""
        r = await self._get_redis()
        return await r.zcard(self._active_key())
    
    async def close(self) -> None:
        """Close the Redis connection."""
        if self._redis is not None:
            await self._redis.aclose()
            self._redis = None


# Singleton instance
_registry: Optional[StreamRegistry] = None


def get_stream_registry() -> StreamRegistry:
    """Get or create the stream registry singleton."""
    global _registry
    if _registry is None:
        _registry = StreamRegistry()
    return _registry


__all__ = [
    "StreamRegistry",
    "get_stream_registry",
    "KEY_PREFIX",
    "STREAM_TTL_SECONDS",
]
