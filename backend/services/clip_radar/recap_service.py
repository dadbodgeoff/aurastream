"""
Clip Radar Recap Service - Daily compression and historical storage

Compresses 24 hours of Redis clip data into PostgreSQL daily recaps.
Runs at 6am daily to create previous day's recap.
"""

import json
import logging
from datetime import datetime, timezone, timedelta, date
from typing import Optional, List, Dict, Any

from backend.services.clip_radar.constants import (
    TRACKED_CATEGORIES,
    REDIS_CLIP_VIEWS_KEY,
    REDIS_CLIP_DATA_KEY,
    REDIS_VIRAL_CLIPS_KEY,
    REDIS_KEY_PREFIX,
)

logger = logging.getLogger(__name__)

# Redis keys for daily tracking
REDIS_DAILY_STATS_KEY = f"{REDIS_KEY_PREFIX}daily_stats"
REDIS_DAILY_CLIPS_KEY = f"{REDIS_KEY_PREFIX}daily_clips"
REDIS_DAILY_CATEGORY_KEY = f"{REDIS_KEY_PREFIX}daily_category"


class ClipRadarRecapService:
    """
    Service for creating daily recaps of clip radar data.
    
    Tracks clips throughout the day in Redis, then compresses
    to PostgreSQL at 6am for historical viewing.
    """
    
    def __init__(self, redis_client=None, supabase_client=None):
        self._redis = redis_client
        self._supabase = supabase_client
    
    @property
    def redis(self):
        """Lazy load Redis client."""
        if self._redis is None:
            import redis
            import os
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            self._redis = redis.from_url(redis_url, decode_responses=True)
        return self._redis
    
    @property
    def supabase(self):
        """Lazy load Supabase client."""
        if self._supabase is None:
            from backend.database.supabase_client import get_supabase_client
            self._supabase = get_supabase_client()
        return self._supabase
    
    def _get_today_key(self) -> str:
        """Get today's date string for Redis keys."""
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    def _get_yesterday_key(self) -> str:
        """Get yesterday's date string."""
        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        return yesterday.strftime("%Y-%m-%d")
    
    async def track_poll_results(
        self,
        category_stats: Dict[str, Any],
        viral_clips: List[Dict[str, Any]]
    ):
        """
        Track poll results for daily aggregation.
        
        Called after each poll to accumulate daily stats.
        """
        today = self._get_today_key()
        now = datetime.now(timezone.utc)
        hour = now.hour
        
        # Update daily stats
        stats_key = f"{REDIS_DAILY_STATS_KEY}:{today}"
        current_stats = self.redis.get(stats_key)
        
        if current_stats:
            stats = json.loads(current_stats)
        else:
            stats = {
                "date": today,
                "polls_count": 0,
                "first_poll_at": now.isoformat(),
                "total_clips_tracked": 0,
                "total_viral_clips": 0,
                "total_views_tracked": 0,
                "peak_velocity": 0,
                "hourly_polls": [0] * 24,
            }
        
        # Aggregate from category stats
        total_clips = sum(cs.get("total_clips", 0) for cs in category_stats.values())
        total_viral = sum(len(cs.get("viral_clips", [])) for cs in category_stats.values())
        total_views = sum(cs.get("total_views", 0) for cs in category_stats.values())
        max_velocity = max(
            (cs.get("avg_velocity", 0) for cs in category_stats.values()),
            default=0
        )
        
        stats["polls_count"] += 1
        stats["last_poll_at"] = now.isoformat()
        stats["total_clips_tracked"] += total_clips
        stats["total_viral_clips"] += total_viral
        stats["total_views_tracked"] += total_views
        stats["peak_velocity"] = max(stats["peak_velocity"], max_velocity)
        stats["hourly_polls"][hour] += 1
        
        # Store with 48h TTL (enough time for recap job)
        self.redis.setex(stats_key, 48 * 3600, json.dumps(stats))
        
        # Track top clips per category
        for game_id, cs in category_stats.items():
            await self._track_category_clips(today, game_id, cs, hour)
        
        # Track viral clips
        await self._track_viral_clips(today, viral_clips)
        
        logger.debug(f"Tracked poll results for {today}: {total_clips} clips, {total_viral} viral")
    
    async def _track_category_clips(
        self,
        date_key: str,
        game_id: str,
        category_stats: Dict[str, Any],
        hour: int
    ):
        """Track clips for a specific category."""
        cat_key = f"{REDIS_DAILY_CATEGORY_KEY}:{date_key}:{game_id}"
        current = self.redis.get(cat_key)
        
        if current:
            data = json.loads(current)
        else:
            data = {
                "game_id": game_id,
                "game_name": category_stats.get("game_name", TRACKED_CATEGORIES.get(game_id, "Unknown")),
                "total_clips": 0,
                "total_views": 0,
                "viral_clips_count": 0,
                "velocities": [],
                "hourly_activity": [{"clips": 0, "views": 0} for _ in range(24)],
                "top_clips": [],  # Will store top 10 by velocity
            }
        
        # Update stats
        data["total_clips"] += category_stats.get("total_clips", 0)
        data["total_views"] += category_stats.get("total_views", 0)
        data["viral_clips_count"] += len(category_stats.get("viral_clips", []))
        
        if category_stats.get("avg_velocity"):
            data["velocities"].append(category_stats["avg_velocity"])
        
        # Update hourly activity
        data["hourly_activity"][hour]["clips"] += category_stats.get("total_clips", 0)
        data["hourly_activity"][hour]["views"] += category_stats.get("total_views", 0)
        
        # Track top clip if present
        top_clip = category_stats.get("top_clip")
        if top_clip:
            clip_data = {
                "clip_id": top_clip.get("clip_id") or top_clip.clip_id if hasattr(top_clip, "clip_id") else None,
                "title": top_clip.get("title") or getattr(top_clip, "title", ""),
                "url": top_clip.get("url") or getattr(top_clip, "url", ""),
                "thumbnail_url": top_clip.get("thumbnail_url") or getattr(top_clip, "thumbnail_url", ""),
                "broadcaster_name": top_clip.get("broadcaster_name") or getattr(top_clip, "broadcaster_name", ""),
                "view_count": top_clip.get("view_count") or getattr(top_clip, "view_count", 0),
                "velocity": top_clip.get("velocity") or getattr(top_clip, "velocity", 0),
            }
            
            if clip_data["clip_id"]:
                # Add to top clips, keeping top 10 by velocity
                existing_ids = {c["clip_id"] for c in data["top_clips"]}
                if clip_data["clip_id"] not in existing_ids:
                    data["top_clips"].append(clip_data)
                    data["top_clips"].sort(key=lambda x: x["velocity"], reverse=True)
                    data["top_clips"] = data["top_clips"][:10]
        
        self.redis.setex(cat_key, 48 * 3600, json.dumps(data))
    
    async def _track_viral_clips(self, date_key: str, viral_clips: List[Dict[str, Any]]):
        """Track viral clips for the day."""
        clips_key = f"{REDIS_DAILY_CLIPS_KEY}:{date_key}"
        current = self.redis.get(clips_key)
        
        if current:
            data = json.loads(current)
        else:
            data = {"clips": []}
        
        existing_ids = {c["clip_id"] for c in data["clips"]}
        
        for clip in viral_clips:
            clip_id = clip.get("clip_id") or getattr(clip, "clip_id", None)
            if clip_id and clip_id not in existing_ids:
                clip_data = {
                    "clip_id": clip_id,
                    "title": clip.get("title") or getattr(clip, "title", ""),
                    "url": clip.get("url") or getattr(clip, "url", ""),
                    "thumbnail_url": clip.get("thumbnail_url") or getattr(clip, "thumbnail_url", ""),
                    "broadcaster_name": clip.get("broadcaster_name") or getattr(clip, "broadcaster_name", ""),
                    "game_id": clip.get("game_id") or getattr(clip, "game_id", ""),
                    "game_name": clip.get("game_name") or getattr(clip, "game_name", ""),
                    "view_count": clip.get("view_count") or getattr(clip, "view_count", 0),
                    "velocity": clip.get("velocity") or getattr(clip, "velocity", 0),
                    "alert_reason": clip.get("alert_reason") or getattr(clip, "alert_reason", ""),
                }
                data["clips"].append(clip_data)
                existing_ids.add(clip_id)
        
        # Keep top 50 by velocity
        data["clips"].sort(key=lambda x: x["velocity"], reverse=True)
        data["clips"] = data["clips"][:50]
        
        self.redis.setex(clips_key, 48 * 3600, json.dumps(data))
    
    async def create_daily_recap(self, recap_date: Optional[date] = None) -> Dict[str, Any]:
        """
        Create daily recap from Redis data and store in PostgreSQL.
        
        Args:
            recap_date: Date to create recap for (defaults to yesterday)
            
        Returns:
            Created recap data
        """
        if recap_date is None:
            recap_date = (datetime.now(timezone.utc) - timedelta(days=1)).date()
        
        date_key = recap_date.strftime("%Y-%m-%d")
        logger.info(f"Creating daily recap for {date_key}")
        
        # Get daily stats from Redis
        stats_key = f"{REDIS_DAILY_STATS_KEY}:{date_key}"
        stats_raw = self.redis.get(stats_key)
        
        if not stats_raw:
            logger.warning(f"No stats found for {date_key}")
            return {"error": "No data for this date"}
        
        stats = json.loads(stats_raw)
        
        # Get viral clips
        clips_key = f"{REDIS_DAILY_CLIPS_KEY}:{date_key}"
        clips_raw = self.redis.get(clips_key)
        viral_clips = json.loads(clips_raw)["clips"] if clips_raw else []
        
        # Get category data
        category_stats = {}
        for game_id in TRACKED_CATEGORIES:
            cat_key = f"{REDIS_DAILY_CATEGORY_KEY}:{date_key}:{game_id}"
            cat_raw = self.redis.get(cat_key)
            if cat_raw:
                category_stats[game_id] = json.loads(cat_raw)
        
        # Create main daily recap
        daily_recap = {
            "recap_date": date_key,
            "total_clips_tracked": stats.get("total_clips_tracked", 0),
            "total_viral_clips": stats.get("total_viral_clips", 0),
            "total_views_tracked": stats.get("total_views_tracked", 0),
            "peak_velocity": stats.get("peak_velocity", 0),
            "top_clips": viral_clips[:10],  # Top 10 overall
            "category_stats": {
                gid: {
                    "game_name": cs.get("game_name"),
                    "total_clips": cs.get("total_clips", 0),
                    "viral_count": cs.get("viral_clips_count", 0),
                }
                for gid, cs in category_stats.items()
            },
            "polls_count": stats.get("polls_count", 0),
            "first_poll_at": stats.get("first_poll_at"),
            "last_poll_at": stats.get("last_poll_at"),
        }
        
        # Insert into PostgreSQL
        try:
            result = self.supabase.table("clip_radar_daily_recaps").upsert(
                daily_recap,
                on_conflict="recap_date"
            ).execute()
            logger.info(f"Created daily recap for {date_key}")
        except Exception as e:
            logger.error(f"Failed to insert daily recap: {e}")
            raise
        
        # Create category recaps
        for game_id, cs in category_stats.items():
            avg_velocity = (
                sum(cs.get("velocities", [])) / len(cs["velocities"])
                if cs.get("velocities") else 0
            )
            peak_velocity = max(cs.get("velocities", [0]))
            
            category_recap = {
                "recap_date": date_key,
                "game_id": game_id,
                "game_name": cs.get("game_name", TRACKED_CATEGORIES.get(game_id)),
                "total_clips": cs.get("total_clips", 0),
                "total_views": cs.get("total_views", 0),
                "viral_clips_count": cs.get("viral_clips_count", 0),
                "avg_velocity": round(avg_velocity, 2),
                "peak_velocity": round(peak_velocity, 2),
                "top_clips": cs.get("top_clips", [])[:5],
                "hourly_activity": cs.get("hourly_activity", []),
            }
            
            try:
                self.supabase.table("clip_radar_category_recaps").upsert(
                    category_recap,
                    on_conflict="recap_date,game_id"
                ).execute()
            except Exception as e:
                logger.error(f"Failed to insert category recap for {game_id}: {e}")
        
        # Clean up Redis keys for this date (keep for 24h more just in case)
        # Actual cleanup happens via TTL
        
        logger.info(f"Daily recap complete for {date_key}: {len(category_stats)} categories")
        return daily_recap
    
    async def get_recap(self, recap_date: date) -> Optional[Dict[str, Any]]:
        """Get a daily recap from PostgreSQL."""
        date_str = recap_date.strftime("%Y-%m-%d")
        
        result = self.supabase.table("clip_radar_daily_recaps").select("*").eq(
            "recap_date", date_str
        ).single().execute()
        
        return result.data if result.data else None
    
    async def get_category_recap(
        self,
        recap_date: date,
        game_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get a category recap from PostgreSQL."""
        date_str = recap_date.strftime("%Y-%m-%d")
        
        result = self.supabase.table("clip_radar_category_recaps").select("*").eq(
            "recap_date", date_str
        ).eq("game_id", game_id).single().execute()
        
        return result.data if result.data else None
    
    async def get_recent_recaps(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get recent daily recaps."""
        result = self.supabase.table("clip_radar_daily_recaps").select("*").order(
            "recap_date", desc=True
        ).limit(days).execute()
        
        return result.data or []
    
    async def cleanup_old_redis_data(self, days_to_keep: int = 2):
        """Clean up Redis data older than specified days."""
        # Redis TTL handles this automatically, but we can force cleanup
        cutoff = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
        cutoff_key = cutoff.strftime("%Y-%m-%d")
        
        # Scan and delete old keys
        for key in self.redis.scan_iter(f"{REDIS_KEY_PREFIX}*"):
            # Extract date from key if present
            parts = key.split(":")
            for part in parts:
                if len(part) == 10 and part < cutoff_key:
                    try:
                        datetime.strptime(part, "%Y-%m-%d")
                        self.redis.delete(key)
                        logger.debug(f"Deleted old Redis key: {key}")
                    except ValueError:
                        pass


# Singleton
_recap_service: Optional[ClipRadarRecapService] = None


def get_recap_service() -> ClipRadarRecapService:
    """Get or create the ClipRadarRecapService singleton."""
    global _recap_service
    if _recap_service is None:
        _recap_service = ClipRadarRecapService()
    return _recap_service
