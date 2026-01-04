"""
SSE Completion Store.

Stores completion data for finished streams to enable client recovery.
Also stores event logs for replay on reconnection.

Redis Keys:
- sse:completion:{stream_id} - Hash with completion data (TTL 5min)
- sse:events:{stream_id}     - List of events for replay (TTL 5min)
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import redis.asyncio as redis

from .types import CompletionData

logger = logging.getLogger(__name__)

# Redis key prefix
KEY_PREFIX = "sse:"

# TTL for completion data (5 minutes)
COMPLETION_TTL_SECONDS = 300


class CompletionStore:
    """
    Store for SSE stream completion data.
    
    Enables clients to recover completion state if they disconnect
    before receiving the terminal event.
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        """
        Initialize the completion store.
        
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
    
    def _completion_key(self, stream_id: str) -> str:
        """Get Redis key for completion data."""
        return f"{KEY_PREFIX}completion:{stream_id}"
    
    def _events_key(self, stream_id: str) -> str:
        """Get Redis key for events list."""
        return f"{KEY_PREFIX}events:{stream_id}"
    
    async def store_completion(
        self,
        stream_id: str,
        event_type: str,
        event_data: Dict[str, Any],
    ) -> None:
        """
        Store completion data for a finished stream.
        
        Args:
            stream_id: ID of the completed stream
            event_type: Type of the terminal event (e.g., "completed", "done", "error")
            event_data: Data from the terminal event
        """
        r = await self._get_redis()
        now = datetime.now(timezone.utc)
        
        completion = CompletionData(
            stream_id=stream_id,
            terminal_event_type=event_type,
            terminal_event_data=event_data,
            completed_at=now,
        )
        
        completion_key = self._completion_key(stream_id)
        completion_data = completion.to_dict()
        # Convert event_data dict to JSON string for Redis hash storage
        completion_data["terminal_event_data"] = json.dumps(completion_data["terminal_event_data"])
        
        pipe = r.pipeline()
        pipe.hset(completion_key, mapping=completion_data)
        pipe.expire(completion_key, COMPLETION_TTL_SECONDS)
        await pipe.execute()
        
        logger.info(
            f"Stored completion for stream {stream_id}",
            extra={
                "stream_id": stream_id,
                "event_type": event_type,
            }
        )
    
    async def get_completion(self, stream_id: str) -> Optional[CompletionData]:
        """
        Get completion data for a stream.
        
        Args:
            stream_id: ID of the stream
            
        Returns:
            CompletionData if found, None otherwise
        """
        r = await self._get_redis()
        completion_key = self._completion_key(stream_id)
        
        data = await r.hgetall(completion_key)
        if not data:
            return None
        
        # Parse terminal_event_data JSON
        if "terminal_event_data" in data and isinstance(data["terminal_event_data"], str):
            try:
                data["terminal_event_data"] = json.loads(data["terminal_event_data"])
            except json.JSONDecodeError:
                data["terminal_event_data"] = {}
        
        return CompletionData.from_dict(data)
    
    async def store_event(
        self,
        stream_id: str,
        event_id: str,
        event_data: Dict[str, Any],
    ) -> None:
        """
        Store an event for potential replay.
        
        Args:
            stream_id: ID of the stream
            event_id: Unique ID for this event
            event_data: The event data to store
        """
        r = await self._get_redis()
        events_key = self._events_key(stream_id)
        
        event_record = {
            "id": event_id,
            "data": event_data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        
        pipe = r.pipeline()
        pipe.rpush(events_key, json.dumps(event_record))
        pipe.expire(events_key, COMPLETION_TTL_SECONDS)
        await pipe.execute()
    
    async def get_events_after(
        self,
        stream_id: str,
        last_event_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get events after a given event ID for replay.
        
        Args:
            stream_id: ID of the stream
            last_event_id: ID of the last event received by client (None for all events)
            
        Returns:
            List of event records after the given ID
        """
        r = await self._get_redis()
        events_key = self._events_key(stream_id)
        
        # Get all events
        raw_events = await r.lrange(events_key, 0, -1)
        if not raw_events:
            return []
        
        events = []
        found_last = last_event_id is None  # If no last_event_id, return all
        
        for raw_event in raw_events:
            try:
                event = json.loads(raw_event)
                if found_last:
                    events.append(event)
                elif event.get("id") == last_event_id:
                    found_last = True
                    # Don't include the last event itself, only events after it
            except json.JSONDecodeError:
                continue
        
        return events
    
    async def clear_completion(self, stream_id: str) -> None:
        """
        Clear completion data and events for a stream.
        
        Args:
            stream_id: ID of the stream
        """
        r = await self._get_redis()
        
        pipe = r.pipeline()
        pipe.delete(self._completion_key(stream_id))
        pipe.delete(self._events_key(stream_id))
        await pipe.execute()
        
        logger.info(f"Cleared completion data for stream {stream_id}")
    
    async def has_completion(self, stream_id: str) -> bool:
        """
        Check if completion data exists for a stream.
        
        Args:
            stream_id: ID of the stream
            
        Returns:
            True if completion data exists
        """
        r = await self._get_redis()
        return await r.exists(self._completion_key(stream_id)) > 0
    
    async def close(self) -> None:
        """Close the Redis connection."""
        if self._redis is not None:
            await self._redis.aclose()
            self._redis = None


# Singleton instance
_store: Optional[CompletionStore] = None


def get_completion_store() -> CompletionStore:
    """Get or create the completion store singleton."""
    global _store
    if _store is None:
        _store = CompletionStore()
    return _store


__all__ = [
    "CompletionStore",
    "get_completion_store",
    "COMPLETION_TTL_SECONDS",
]
