"""
SSE Stream Guardian.

Monitors active streams, detects orphans, and facilitates recovery.
Runs periodically via the orchestrator to ensure stream reliability.
"""

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import redis.asyncio as redis

from .types import CompletionData, StreamMetadata, StreamState, StreamType
from .registry import StreamRegistry, get_stream_registry
from .completion_store import CompletionStore, get_completion_store

logger = logging.getLogger(__name__)

# Default threshold for considering a stream stale (no heartbeat)
DEFAULT_STALE_THRESHOLD_SECONDS = 30

# Threshold for considering a stream expired (for cleanup)
EXPIRED_THRESHOLD_SECONDS = 3600  # 1 hour


class StreamGuardian:
    """
    Guardian service for SSE stream reliability.
    
    Responsibilities:
    - Detect orphaned streams (no heartbeat within threshold)
    - Store completion data for orphaned streams if underlying job/session completed
    - Clean up expired streams
    - Provide health metrics for monitoring
    """
    
    def __init__(
        self,
        registry: Optional[StreamRegistry] = None,
        completion_store: Optional[CompletionStore] = None,
        redis_client: Optional[redis.Redis] = None,
    ):
        """
        Initialize the stream guardian.
        
        Args:
            registry: Optional StreamRegistry instance
            completion_store: Optional CompletionStore instance
            redis_client: Optional Redis client for checking job/session status
        """
        self._registry = registry
        self._completion_store = completion_store
        self._redis = redis_client
    
    @property
    def registry(self) -> StreamRegistry:
        """Get the stream registry."""
        if self._registry is None:
            self._registry = get_stream_registry()
        return self._registry
    
    @property
    def completion_store(self) -> CompletionStore:
        """Get the completion store."""
        if self._completion_store is None:
            self._completion_store = get_completion_store()
        return self._completion_store
    
    async def _get_redis(self) -> redis.Redis:
        """Get or create Redis client."""
        if self._redis is None:
            redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
            self._redis = redis.from_url(redis_url, decode_responses=True)
        return self._redis
    
    async def check_orphaned_streams(
        self,
        threshold_seconds: int = DEFAULT_STALE_THRESHOLD_SECONDS,
    ) -> List[StreamMetadata]:
        """
        Check for orphaned streams and attempt to store completion data.
        
        An orphaned stream is one that hasn't received a heartbeat within
        the threshold period, indicating the client may have disconnected.
        
        Args:
            threshold_seconds: Seconds without heartbeat to consider orphaned
            
        Returns:
            List of orphaned StreamMetadata
        """
        stale_streams = await self.registry.get_stale_streams(threshold_seconds)
        orphaned_streams = []
        
        for stream in stale_streams:
            try:
                # Mark as orphaned
                await self.registry.update_state(stream.stream_id, StreamState.ORPHANED)
                stream.state = StreamState.ORPHANED
                
                # For generation streams, try to check job status and store completion
                if stream.stream_type == StreamType.GENERATION:
                    completion = await self._check_generation_completion(stream)
                    if completion:
                        await self.completion_store.store_completion(
                            stream.stream_id,
                            completion["event_type"],
                            completion["event_data"],
                        )
                        logger.info(
                            f"Stored completion for orphaned generation stream",
                            extra={
                                "stream_id": stream.stream_id,
                                "event_type": completion["event_type"],
                            }
                        )
                
                orphaned_streams.append(stream)
                
                logger.warning(
                    f"Detected orphaned stream",
                    extra={
                        "stream_id": stream.stream_id,
                        "stream_type": stream.stream_type.value,
                        "user_id": stream.user_id,
                        "last_heartbeat": stream.last_heartbeat.isoformat(),
                    }
                )
                
            except Exception as e:
                logger.error(
                    f"Error processing orphaned stream {stream.stream_id}: {e}"
                )
        
        return orphaned_streams
    
    async def _check_generation_completion(
        self,
        stream: StreamMetadata,
    ) -> Optional[Dict[str, Any]]:
        """
        Check if a generation job has completed.
        
        Args:
            stream: The stream metadata
            
        Returns:
            Dict with event_type and event_data if completed, None otherwise
        """
        job_id = stream.metadata.get("job_id")
        if not job_id:
            return None
        
        try:
            # Try to get job status from database
            from backend.database.supabase_client import get_supabase_client
            db = get_supabase_client()
            
            response = db.table("generation_jobs").select(
                "id, status, error_message"
            ).eq("id", job_id).single().execute()
            
            if not response.data:
                return None
            
            job = response.data
            status = job.get("status")
            
            if status == "completed":
                # Get the generated asset
                asset_response = db.table("assets").select(
                    "id, url, asset_type, width, height"
                ).eq("job_id", job_id).limit(1).execute()
                
                asset = asset_response.data[0] if asset_response.data else None
                
                return {
                    "event_type": "completed",
                    "event_data": {
                        "type": "completed",
                        "status": "completed",
                        "progress": 100,
                        "asset": asset,
                    },
                }
            
            elif status == "failed":
                return {
                    "event_type": "failed",
                    "event_data": {
                        "type": "failed",
                        "status": "failed",
                        "progress": 0,
                        "error": job.get("error_message", "Generation failed"),
                    },
                }
            
            # Job still in progress
            return None
            
        except Exception as e:
            logger.error(f"Error checking generation job status: {e}")
            return None
    
    async def recover_stream(self, stream_id: str) -> Optional[CompletionData]:
        """
        Attempt to recover completion data for a stream.
        
        Args:
            stream_id: ID of the stream to recover
            
        Returns:
            CompletionData if available, None otherwise
        """
        # First check completion store
        completion = await self.completion_store.get_completion(stream_id)
        if completion:
            return completion
        
        # Check if stream exists and try to get completion from underlying service
        stream = await self.registry.get_stream(stream_id)
        if not stream:
            return None
        
        # For generation streams, check job status
        if stream.stream_type == StreamType.GENERATION:
            completion_data = await self._check_generation_completion(stream)
            if completion_data:
                # Store for future recovery attempts
                await self.completion_store.store_completion(
                    stream_id,
                    completion_data["event_type"],
                    completion_data["event_data"],
                )
                return await self.completion_store.get_completion(stream_id)
        
        return None
    
    async def cleanup_expired(self) -> int:
        """
        Clean up expired streams from the registry.
        
        Removes streams that are older than the expiration threshold.
        
        Returns:
            Number of streams cleaned up
        """
        r = await self._get_redis()
        now = datetime.now(timezone.utc)
        cutoff_timestamp = now.timestamp() - EXPIRED_THRESHOLD_SECONDS
        
        # Get expired stream IDs from active sorted set
        expired_ids = await r.zrangebyscore(
            "sse:active",
            min="-inf",
            max=cutoff_timestamp,
        )
        
        if not expired_ids:
            return 0
        
        cleaned = 0
        for stream_id in expired_ids:
            try:
                # Update state to expired before removing
                await self.registry.update_state(stream_id, StreamState.EXPIRED)
                await self.registry.unregister(stream_id)
                cleaned += 1
            except Exception as e:
                logger.error(f"Error cleaning up stream {stream_id}: {e}")
        
        if cleaned > 0:
            logger.info(f"Cleaned up {cleaned} expired streams")
        
        return cleaned
    
    async def get_health_metrics(self) -> Dict[str, Any]:
        """
        Get health metrics for monitoring.
        
        Returns:
            Dict with health metrics including:
            - active_count: Total active streams
            - stale_count: Streams without recent heartbeat
            - healthy_count: Active streams with recent heartbeat
            - orphaned_count: Streams marked as orphaned
            - by_type: Breakdown by stream type
            - completion_rate: Percentage of streams that completed normally
        """
        r = await self._get_redis()
        now = datetime.now(timezone.utc)
        
        # Count active streams
        active_count = await self.registry.get_active_count()
        
        # Count streams by state (sample from recent streams)
        stale_threshold = now.timestamp() - DEFAULT_STALE_THRESHOLD_SECONDS
        stale_count = await r.zcount("sse:active", "-inf", stale_threshold)
        healthy_count = max(0, active_count - stale_count)
        
        # Get stream type breakdown
        by_type: Dict[str, int] = {}
        try:
            # Sample active streams to get type distribution
            stream_ids = await r.zrange("sse:active", 0, 99)
            for stream_id in stream_ids:
                stream = await self.registry.get_stream(stream_id)
                if stream:
                    type_name = stream.stream_type.value if stream.stream_type else "unknown"
                    by_type[type_name] = by_type.get(type_name, 0) + 1
        except Exception as e:
            logger.warning(f"Error getting stream type breakdown: {e}")
        
        # Calculate completion rate from recent completions
        completion_rate = 0.0
        try:
            # Count completions stored in last hour
            completion_keys = await r.keys("sse:completion:*")
            completions_count = len(completion_keys) if completion_keys else 0
            
            # Estimate completion rate (completions / (completions + orphans))
            total_ended = completions_count + stale_count
            if total_ended > 0:
                completion_rate = completions_count / total_ended
        except Exception as e:
            logger.warning(f"Error calculating completion rate: {e}")
        
        return {
            "active_count": active_count,
            "stale_count": stale_count,
            "orphaned_count": stale_count,  # Stale streams are potential orphans
            "healthy_count": healthy_count,
            "by_type": by_type,
            "completion_rate": round(completion_rate, 3),
            "checked_at": now.isoformat(),
        }
    
    async def close(self) -> None:
        """Close connections."""
        if self._redis is not None:
            await self._redis.aclose()
            self._redis = None


# Singleton instance
_guardian: Optional[StreamGuardian] = None


def get_stream_guardian() -> StreamGuardian:
    """Get or create the stream guardian singleton."""
    global _guardian
    if _guardian is None:
        _guardian = StreamGuardian()
    return _guardian


__all__ = [
    "StreamGuardian",
    "get_stream_guardian",
    "DEFAULT_STALE_THRESHOLD_SECONDS",
    "EXPIRED_THRESHOLD_SECONDS",
]
