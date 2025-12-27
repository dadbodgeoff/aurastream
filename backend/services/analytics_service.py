"""
Analytics Service - Real-time event storage and aggregation using Redis.

Stores analytics events in Redis with time-series capabilities for
efficient querying and aggregation. Supports hourly flush to PostgreSQL
for long-term storage and SQL reporting.
"""

import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Optional
from collections import defaultdict

import redis

logger = logging.getLogger(__name__)

# Redis key prefixes
EVENTS_KEY = "analytics:events"
SESSIONS_KEY = "analytics:sessions"
COUNTERS_KEY = "analytics:counters"
EVENT_NAMES_KEY = "analytics:event_names"
CATEGORIES_KEY = "analytics:categories"
LAST_FLUSH_KEY = "analytics:last_flush"
FLUSH_LOCK_KEY = "analytics:flush_lock"

# Asset-related event names for popularity tracking
ASSET_GENERATION_EVENTS = {"asset_generated", "generation_completed", "generation_started"}
ASSET_VIEW_EVENTS = {"asset_viewed", "asset_preview", "asset_opened"}
ASSET_SHARE_EVENTS = {"asset_shared", "asset_downloaded", "asset_exported"}


class AnalyticsService:
    """Service for storing and querying analytics data."""
    
    def __init__(self, redis_url: str = "redis://localhost:6379", supabase_client=None):
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self._supabase = supabase_client
        self._ensure_initialized()
    
    def _ensure_initialized(self):
        """Ensure Redis keys exist."""
        try:
            self.redis.ping()
            logger.info("Analytics service connected to Redis")
        except redis.ConnectionError as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    @property
    def supabase(self):
        """Lazy-load Supabase client to avoid circular imports."""
        if self._supabase is None:
            try:
                from backend.database.supabase_client import get_supabase_client
                self._supabase = get_supabase_client()
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                raise
        return self._supabase
    
    def store_events(self, events: list[dict[str, Any]]) -> int:
        """
        Store a batch of analytics events.
        
        Returns the number of events stored.
        """
        stored = 0
        pipe = self.redis.pipeline()
        now = datetime.now(timezone.utc)
        
        for event in events:
            try:
                event_name = event.get("name", "unknown")
                category = event.get("category", "unknown")
                session_id = event.get("base", {}).get("sessionId", "unknown")
                user_id = event.get("base", {}).get("userId")
                timestamp = event.get("createdAt", int(now.timestamp() * 1000))
                
                # Store event in sorted set by timestamp
                event_json = json.dumps(event)
                pipe.zadd(EVENTS_KEY, {event_json: timestamp})
                
                # Update event name counter
                pipe.hincrby(f"{COUNTERS_KEY}:events", event_name, 1)
                
                # Update category counter
                pipe.hincrby(f"{COUNTERS_KEY}:categories", category, 1)
                
                # Track event name with last seen timestamp
                pipe.hset(EVENT_NAMES_KEY, event_name, timestamp)
                
                # Update session data
                session_key = f"{SESSIONS_KEY}:{session_id}"
                pipe.hincrby(session_key, "eventCount", 1)
                pipe.hset(session_key, "lastActivity", timestamp)
                if user_id:
                    pipe.hset(session_key, "userId", user_id)
                if not self.redis.hexists(session_key, "startTime"):
                    pipe.hset(session_key, "startTime", timestamp)
                pipe.expire(session_key, 86400)  # 24 hour TTL
                
                # Track active sessions
                pipe.zadd(f"{SESSIONS_KEY}:active", {session_id: timestamp})
                
                stored += 1
                
            except Exception as e:
                logger.error(f"Failed to store event: {e}")
                continue
        
        try:
            pipe.execute()
            
            # Trim old events (keep last 100k)
            self.redis.zremrangebyrank(EVENTS_KEY, 0, -100001)
            
            logger.info(f"Stored {stored} analytics events")
        except Exception as e:
            logger.error(f"Failed to execute Redis pipeline: {e}")
            
        return stored
    
    def get_summary(self, time_range: str = "24h") -> dict[str, Any]:
        """
        Get analytics summary for the dashboard.
        
        Args:
            time_range: One of "1h", "24h", "7d", "30d"
        """
        now = datetime.now(timezone.utc)
        
        # Calculate time window
        windows = {
            "1h": timedelta(hours=1),
            "24h": timedelta(hours=24),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30),
        }
        window = windows.get(time_range, timedelta(hours=24))
        min_timestamp = int((now - window).timestamp() * 1000)
        
        # Get event counts by name
        event_counts = self.redis.hgetall(f"{COUNTERS_KEY}:events") or {}
        event_last_seen = self.redis.hgetall(EVENT_NAMES_KEY) or {}
        
        # Build event breakdown
        event_breakdown = []
        for name, count in sorted(event_counts.items(), key=lambda x: int(x[1]), reverse=True):
            last_seen_ts = int(event_last_seen.get(name, 0))
            last_seen = self._format_time_ago(last_seen_ts) if last_seen_ts else "never"
            event_breakdown.append({
                "name": name,
                "count": int(count),
                "lastSeen": last_seen,
            })
        
        # Get category distribution
        category_counts = self.redis.hgetall(f"{COUNTERS_KEY}:categories") or {}
        total_events = sum(int(c) for c in category_counts.values()) or 1
        
        category_distribution = []
        for category, count in sorted(category_counts.items(), key=lambda x: int(x[1]), reverse=True):
            count_int = int(count)
            category_distribution.append({
                "category": category,
                "count": count_int,
                "percentage": round((count_int / total_events) * 100, 1),
            })
        
        # Get active sessions
        active_session_ids = self.redis.zrangebyscore(
            f"{SESSIONS_KEY}:active",
            min_timestamp,
            "+inf",
            start=0,
            num=50
        )
        
        recent_sessions = []
        for session_id in reversed(active_session_ids[-10:]):
            session_data = self.redis.hgetall(f"{SESSIONS_KEY}:{session_id}")
            if session_data:
                start_ts = int(session_data.get("startTime", 0))
                last_ts = int(session_data.get("lastActivity", 0))
                recent_sessions.append({
                    "sessionId": session_id[:12] if len(session_id) > 12 else session_id,
                    "userId": session_data.get("userId"),
                    "eventCount": int(session_data.get("eventCount", 0)),
                    "startTime": self._format_time(start_ts),
                    "lastActivity": self._format_time_ago(last_ts),
                })
        
        # Calculate error rate
        error_count = int(event_counts.get("error_occurred", 0))
        error_rate = round((error_count / total_events) * 100, 2) if total_events > 0 else 0
        
        return {
            "totalEvents": total_events,
            "activeSessions": len(active_session_ids),
            "errorRate": error_rate,
            "eventBreakdown": event_breakdown[:15],  # Top 15 events
            "categoryDistribution": category_distribution,
            "recentSessions": recent_sessions,
            "timeRange": time_range,
            "generatedAt": now.isoformat(),
        }
    
    def _format_time_ago(self, timestamp_ms: int) -> str:
        """Format timestamp as relative time."""
        if not timestamp_ms:
            return "never"
        
        now = datetime.now(timezone.utc)
        event_time = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)
        diff = now - event_time
        
        if diff.total_seconds() < 60:
            return "just now"
        elif diff.total_seconds() < 3600:
            mins = int(diff.total_seconds() / 60)
            return f"{mins} min ago"
        elif diff.total_seconds() < 86400:
            hours = int(diff.total_seconds() / 3600)
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        else:
            days = int(diff.total_seconds() / 86400)
            return f"{days} day{'s' if days > 1 else ''} ago"
    
    def _format_time(self, timestamp_ms: int) -> str:
        """Format timestamp as time string."""
        if not timestamp_ms:
            return "N/A"
        
        event_time = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)
        return event_time.strftime("%I:%M %p")
    
    def flush_to_postgres(self, force: bool = False) -> dict[str, Any]:
        """
        Flush aggregated analytics data from Redis to PostgreSQL.
        
        This method:
        1. Acquires a distributed lock to prevent concurrent flushes
        2. Aggregates events by name, category, and asset type
        3. Inserts aggregated data into analytics_events table
        4. Updates asset popularity metrics
        5. Clears processed counters from Redis
        
        Args:
            force: If True, bypass the hourly check and flush immediately
            
        Returns:
            Dict with flush results including events_flushed, asset_types_updated
        """
        now = datetime.now(timezone.utc)
        hour_bucket = now.replace(minute=0, second=0, microsecond=0)
        
        # Check if we should flush (hourly unless forced)
        if not force:
            last_flush = self.redis.get(LAST_FLUSH_KEY)
            if last_flush:
                last_flush_time = datetime.fromisoformat(last_flush)
                if (now - last_flush_time) < timedelta(hours=1):
                    logger.info("Skipping flush - less than 1 hour since last flush")
                    return {"skipped": True, "reason": "too_soon", "last_flush": last_flush}
        
        # Try to acquire distributed lock (5 minute timeout)
        lock_acquired = self.redis.set(FLUSH_LOCK_KEY, "1", nx=True, ex=300)
        if not lock_acquired:
            logger.warning("Could not acquire flush lock - another flush in progress")
            return {"skipped": True, "reason": "lock_held"}
        
        try:
            # Get current counters
            event_counts = self.redis.hgetall(f"{COUNTERS_KEY}:events") or {}
            category_counts = self.redis.hgetall(f"{COUNTERS_KEY}:categories") or {}
            
            if not event_counts:
                logger.info("No events to flush")
                self.redis.set(LAST_FLUSH_KEY, now.isoformat())
                return {"events_flushed": 0, "asset_types_updated": 0}
            
            # Aggregate events for PostgreSQL
            events_to_insert = []
            asset_popularity = defaultdict(lambda: {"generation": 0, "view": 0, "share": 0})
            
            # Get unique sessions and users from recent events
            unique_sessions = set()
            unique_users = set()
            
            # Sample recent events to get session/user counts
            recent_events = self.redis.zrange(EVENTS_KEY, -1000, -1)
            for event_json in recent_events:
                try:
                    event = json.loads(event_json)
                    base = event.get("base", {})
                    if base.get("sessionId"):
                        unique_sessions.add(base["sessionId"])
                    if base.get("userId"):
                        unique_users.add(base["userId"])
                    
                    # Track asset type for popularity
                    event_name = event.get("name", "")
                    properties = event.get("properties", {})
                    asset_type = properties.get("assetType") or properties.get("asset_type")
                    
                    if asset_type:
                        if event_name in ASSET_GENERATION_EVENTS:
                            asset_popularity[asset_type]["generation"] += 1
                        elif event_name in ASSET_VIEW_EVENTS:
                            asset_popularity[asset_type]["view"] += 1
                        elif event_name in ASSET_SHARE_EVENTS:
                            asset_popularity[asset_type]["share"] += 1
                except json.JSONDecodeError:
                    continue
            
            # Build event records for insertion
            for event_name, count in event_counts.items():
                # Determine category for this event
                category = "unknown"
                for cat, cat_count in category_counts.items():
                    # Simple heuristic - assign most common category
                    if int(cat_count) > 0:
                        category = cat
                        break
                
                # Check if this is an asset-related event
                asset_type = None
                if event_name in ASSET_GENERATION_EVENTS | ASSET_VIEW_EVENTS | ASSET_SHARE_EVENTS:
                    # Will be tracked via asset_popularity
                    pass
                
                events_to_insert.append({
                    "event_name": event_name,
                    "event_category": category,
                    "asset_type": asset_type,
                    "event_count": int(count),
                    "unique_sessions": len(unique_sessions),
                    "unique_users": len(unique_users),
                    "hour_bucket": hour_bucket.isoformat(),
                })
            
            # Insert events into PostgreSQL
            events_inserted = 0
            if events_to_insert:
                try:
                    response = self.supabase.table("analytics_events").insert(events_to_insert).execute()
                    events_inserted = len(response.data) if response.data else 0
                    logger.info(f"Inserted {events_inserted} event records into PostgreSQL")
                except Exception as e:
                    logger.error(f"Failed to insert analytics events: {e}")
            
            # Update asset popularity using RPC function
            asset_types_updated = 0
            for asset_type, counts in asset_popularity.items():
                try:
                    self.supabase.rpc(
                        "upsert_asset_popularity",
                        {
                            "p_asset_type": asset_type,
                            "p_generation_count": counts["generation"],
                            "p_view_count": counts["view"],
                            "p_share_count": counts["share"],
                        }
                    ).execute()
                    asset_types_updated += 1
                except Exception as e:
                    logger.error(f"Failed to update asset popularity for {asset_type}: {e}")
            
            # Clear Redis counters after successful flush
            pipe = self.redis.pipeline()
            pipe.delete(f"{COUNTERS_KEY}:events")
            pipe.delete(f"{COUNTERS_KEY}:categories")
            # Keep events sorted set but trim to last 10k for recent queries
            pipe.zremrangebyrank(EVENTS_KEY, 0, -10001)
            pipe.set(LAST_FLUSH_KEY, now.isoformat())
            pipe.execute()
            
            logger.info(f"Analytics flush complete: {events_inserted} events, {asset_types_updated} asset types")
            
            return {
                "events_flushed": events_inserted,
                "asset_types_updated": asset_types_updated,
                "hour_bucket": hour_bucket.isoformat(),
                "flushed_at": now.isoformat(),
            }
            
        except Exception as e:
            logger.exception(f"Error during analytics flush: {e}")
            return {"error": str(e)}
            
        finally:
            # Release lock
            self.redis.delete(FLUSH_LOCK_KEY)
    
    def get_popular_asset_types(self, days: int = 30, limit: int = 10) -> list[dict[str, Any]]:
        """
        Get the most popular asset types based on generation, view, and share counts.
        
        Uses the PostgreSQL function get_popular_asset_types() which calculates
        a weighted popularity score: (generations * 3) + views + (shares * 2)
        
        Args:
            days: Number of days to look back (default 30)
            limit: Maximum number of results (default 10)
            
        Returns:
            List of dicts with asset_type, total_generations, total_views,
            total_shares, and popularity_score
        """
        try:
            response = self.supabase.rpc(
                "get_popular_asset_types",
                {"p_days": days, "p_limit": limit}
            ).execute()
            
            if response.data:
                return response.data
            return []
            
        except Exception as e:
            logger.error(f"Failed to get popular asset types: {e}")
            return []
    
    def get_last_flush_time(self) -> Optional[str]:
        """Get the timestamp of the last successful flush."""
        return self.redis.get(LAST_FLUSH_KEY)
    
    def clear_all(self) -> None:
        """Clear all analytics data (for testing)."""
        keys = self.redis.keys("analytics:*")
        if keys:
            self.redis.delete(*keys)
        logger.info("Cleared all analytics data")


# Singleton instance
_analytics_service: Optional[AnalyticsService] = None


def get_analytics_service() -> AnalyticsService:
    """Get or create the analytics service singleton."""
    global _analytics_service
    
    if _analytics_service is None:
        import os
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        _analytics_service = AnalyticsService(redis_url)
    
    return _analytics_service
