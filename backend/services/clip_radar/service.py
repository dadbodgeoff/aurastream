"""
Clip Radar Service - Core velocity tracking logic
"""

import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict

from backend.services.clip_radar.models import TrackedClip, ViralClip, CategoryClipStats, PollResult
from backend.services.clip_radar.constants import (
    TRACKED_CATEGORIES,
    CLIP_LOOKBACK_MINUTES,
    MAX_CLIPS_PER_CATEGORY,
    VIRAL_VELOCITY_THRESHOLD,
    HIGH_VELOCITY_THRESHOLD,
    MINIMUM_VIEWS_FOR_VIRAL,
    REDIS_CLIP_VIEWS_KEY,
    REDIS_CLIP_DATA_KEY,
    REDIS_VIRAL_CLIPS_KEY,
    REDIS_LAST_POLL_KEY,
    CLIP_TTL_HOURS,
)
from backend.services.trends import get_twitch_collector

logger = logging.getLogger(__name__)


class ClipRadarService:
    """
    Service for tracking clip velocity and detecting viral content.
    
    Polls Twitch clips by category, stores view counts in Redis,
    and calculates velocity to surface trending clips.
    """
    
    def __init__(self, redis_client=None):
        """
        Initialize the clip radar service.
        
        Args:
            redis_client: Redis client instance (optional, will create if not provided)
        """
        self._redis = redis_client
        self._twitch = None
    
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
    def twitch(self):
        """Lazy load Twitch collector."""
        if self._twitch is None:
            self._twitch = get_twitch_collector()
        return self._twitch
    
    async def poll_clips(self) -> Dict[str, CategoryClipStats]:
        """
        Poll all tracked categories for fresh clips and update velocity.
        
        Returns:
            Dict mapping game_id to CategoryClipStats
            
        Note: Each CategoryClipStats now includes fetch_error and fetch_success
        fields to distinguish API failures from legitimately empty results.
        """
        logger.info("Starting clip radar poll...")
        
        now = datetime.now(timezone.utc)
        started_at = (now - timedelta(minutes=CLIP_LOOKBACK_MINUTES)).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        results: Dict[str, CategoryClipStats] = {}
        all_viral: List[ViralClip] = []
        failed_categories: List[str] = []
        
        for game_id, game_name in TRACKED_CATEGORIES.items():
            try:
                clips = await self.twitch.fetch_clips(
                    game_id=game_id,
                    period="day",  # API will filter by started_at
                    limit=MAX_CLIPS_PER_CATEGORY,
                )
                
                # Filter to clips within our lookback window
                fresh_clips = [
                    c for c in clips 
                    if (now - c.created_at).total_seconds() < CLIP_LOOKBACK_MINUTES * 60
                ]
                
                # Process clips and calculate velocity
                tracked_clips = []
                category_viral = []
                
                for clip in fresh_clips:
                    tracked = await self._process_clip(clip, game_name)
                    tracked_clips.append(tracked)
                    
                    # Check if viral
                    if self._is_viral(tracked):
                        viral = ViralClip(
                            **{k: v for k, v in tracked.__dict__.items()},
                            alert_reason=self._get_viral_reason(tracked),
                        )
                        category_viral.append(viral)
                        all_viral.append(viral)
                
                # Calculate category stats
                total_views = sum(c.view_count for c in tracked_clips)
                avg_velocity = (
                    sum(c.velocity for c in tracked_clips) / len(tracked_clips)
                    if tracked_clips else 0
                )
                
                top_clip = max(tracked_clips, key=lambda c: c.velocity) if tracked_clips else None
                
                results[game_id] = CategoryClipStats(
                    game_id=game_id,
                    game_name=game_name,
                    total_clips=len(tracked_clips),
                    total_views=total_views,
                    avg_velocity=avg_velocity,
                    top_clip=top_clip,
                    viral_clips=category_viral,
                    fetch_error=None,
                    fetch_success=True,
                )
                
                logger.info(f"  {game_name}: {len(tracked_clips)} clips, {len(category_viral)} viral")
                
            except Exception as e:
                error_msg = str(e)
                logger.error(f"Failed to poll clips for {game_name}: {error_msg}")
                failed_categories.append(game_id)
                results[game_id] = CategoryClipStats(
                    game_id=game_id,
                    game_name=game_name,
                    total_clips=0,
                    total_views=0,
                    avg_velocity=0,
                    fetch_error=error_msg,
                    fetch_success=False,
                )
        
        # Log summary with failure info
        success_count = len(TRACKED_CATEGORIES) - len(failed_categories)
        success_rate = success_count / len(TRACKED_CATEGORIES) * 100 if TRACKED_CATEGORIES else 0
        
        if failed_categories:
            logger.warning(
                f"Poll completed with {len(failed_categories)} failures: "
                f"{', '.join(TRACKED_CATEGORIES.get(gid, gid) for gid in failed_categories)}. "
                f"Success rate: {success_rate:.1f}%"
            )
        
        # Update viral clips sorted set
        await self._update_viral_clips(all_viral)
        
        # Record poll timestamp
        self.redis.set(REDIS_LAST_POLL_KEY, now.isoformat())
        
        # Track for daily recap with error info
        recap_error = None
        try:
            from backend.services.clip_radar.recap_service import get_recap_service
            recap_service = get_recap_service()
            
            # Convert results to dict format for tracking
            # Need to convert dataclass objects to dicts for JSON serialization
            def clip_to_dict(clip):
                if clip is None:
                    return None
                return {
                    "clip_id": clip.clip_id,
                    "title": clip.title,
                    "url": clip.url,
                    "thumbnail_url": clip.thumbnail_url,
                    "broadcaster_name": clip.broadcaster_name,
                    "game_id": clip.game_id,
                    "game_name": clip.game_name,
                    "view_count": clip.view_count,
                    "velocity": clip.velocity,
                    "total_gained": clip.total_gained,
                    "alert_reason": getattr(clip, "alert_reason", ""),
                }
            
            category_stats_dict = {
                gid: {
                    "game_name": stats.game_name,
                    "total_clips": stats.total_clips,
                    "total_views": stats.total_views,
                    "avg_velocity": stats.avg_velocity,
                    "viral_clips": [clip_to_dict(c) for c in stats.viral_clips],
                    "top_clip": clip_to_dict(stats.top_clip),
                    "fetch_error": stats.fetch_error,
                    "fetch_success": stats.fetch_success,
                }
                for gid, stats in results.items()
            }
            
            # Convert viral clips to dicts as well
            viral_clips_dicts = [clip_to_dict(c) for c in all_viral]
            
            await recap_service.track_poll_results(category_stats_dict, viral_clips_dicts)
        except Exception as e:
            recap_error = str(e)
            logger.warning(f"Failed to track poll for recap: {recap_error}")
        
        # Store poll metadata for monitoring
        poll_metadata = {
            "timestamp": now.isoformat(),
            "total_categories": len(TRACKED_CATEGORIES),
            "successful_categories": success_count,
            "failed_categories": failed_categories,
            "total_clips": sum(s.total_clips for s in results.values()),
            "total_viral": len(all_viral),
            "success_rate": success_rate,
            "recap_tracked": recap_error is None,
            "recap_error": recap_error,
        }
        self.redis.set(f"{REDIS_LAST_POLL_KEY}:metadata", json.dumps(poll_metadata))
        
        logger.info(f"Clip radar poll complete. {len(all_viral)} viral clips detected. Success rate: {success_rate:.1f}%")
        return results
    
    async def _process_clip(self, clip, game_name: str) -> TrackedClip:
        """Process a clip and calculate its velocity."""
        clip_id = clip.id
        now = datetime.now(timezone.utc)
        
        # Get previous view count from Redis
        prev_views_str = self.redis.hget(REDIS_CLIP_VIEWS_KEY, clip_id)
        prev_views = int(prev_views_str) if prev_views_str else None
        
        # Get previous data for first_seen_at
        prev_data_str = self.redis.hget(REDIS_CLIP_DATA_KEY, clip_id)
        first_seen_at = now
        if prev_data_str:
            try:
                prev_data = json.loads(prev_data_str)
                first_seen_at = datetime.fromisoformat(prev_data.get("first_seen_at", now.isoformat()))
            except (json.JSONDecodeError, ValueError):
                pass
        
        # Calculate velocity (views per minute)
        age_mins = (now - clip.created_at).total_seconds() / 60
        
        # Always calculate base velocity from total views / age
        # This gives a consistent metric regardless of tracking history
        base_velocity = clip.view_count / age_mins if age_mins > 0 else 0
        
        # If we have tracking data, also calculate recent velocity
        tracking_duration_mins = (now - first_seen_at).total_seconds() / 60
        if tracking_duration_mins > 1 and prev_views is not None:
            views_gained = clip.view_count - prev_views
            recent_velocity = views_gained / tracking_duration_mins if tracking_duration_mins > 0 else 0
            # Use the higher of base or recent velocity
            # This handles both new viral clips and consistently popular ones
            velocity = max(base_velocity, recent_velocity)
        else:
            velocity = base_velocity
        
        total_gained = clip.view_count - (prev_views or 0) if prev_views else clip.view_count
        
        tracked = TrackedClip(
            clip_id=clip_id,
            title=clip.title,
            url=clip.url,
            thumbnail_url=clip.thumbnail_url,
            broadcaster_id=clip.broadcaster_id,
            broadcaster_name=clip.broadcaster_name,
            creator_name=clip.creator_name,
            game_id=clip.game_id,
            game_name=game_name,
            language=clip.language,
            duration=clip.duration,
            created_at=clip.created_at,
            view_count=clip.view_count,
            previous_view_count=prev_views,
            first_seen_at=first_seen_at,
            last_updated_at=now,
            velocity=max(0, velocity),  # Don't allow negative velocity
            total_gained=max(0, total_gained),
        )
        
        # Store updated data in Redis
        self.redis.hset(REDIS_CLIP_VIEWS_KEY, clip_id, clip.view_count)
        self.redis.hset(REDIS_CLIP_DATA_KEY, clip_id, json.dumps({
            "first_seen_at": first_seen_at.isoformat(),
            "game_id": clip.game_id,
            "game_name": game_name,
            "broadcaster_name": clip.broadcaster_name,
        }))
        
        # Set TTL on the hash keys (Redis doesn't support per-field TTL, so we'll clean up old entries separately)
        
        return tracked
    
    def _is_viral(self, clip: TrackedClip) -> bool:
        """Check if a clip qualifies as viral."""
        return (
            clip.velocity >= HIGH_VELOCITY_THRESHOLD and
            clip.view_count >= MINIMUM_VIEWS_FOR_VIRAL and
            clip.is_fresh
        )
    
    def _get_viral_reason(self, clip: TrackedClip) -> str:
        """Get human-readable reason why clip is viral."""
        if clip.velocity >= VIRAL_VELOCITY_THRESHOLD:
            return f"🔥 Exploding! {clip.velocity:.1f} views/min"
        elif clip.velocity >= HIGH_VELOCITY_THRESHOLD:
            return f"📈 Trending! {clip.velocity:.1f} views/min"
        elif clip.view_count >= 500:
            return f"👀 High views ({clip.view_count:,})"
        else:
            return "📊 Gaining traction"
    
    async def _update_viral_clips(self, viral_clips: List[ViralClip]):
        """Update the sorted set of viral clips."""
        # Clear old viral clips
        self.redis.delete(REDIS_VIRAL_CLIPS_KEY)
        
        # Add new viral clips sorted by velocity
        for clip in viral_clips:
            self.redis.zadd(
                REDIS_VIRAL_CLIPS_KEY,
                {clip.clip_id: clip.velocity},
            )
            # Store full clip data
            self.redis.hset(
                f"{REDIS_VIRAL_CLIPS_KEY}:data",
                clip.clip_id,
                json.dumps({
                    "clip_id": clip.clip_id,
                    "title": clip.title,
                    "url": clip.url,
                    "thumbnail_url": clip.thumbnail_url,
                    "broadcaster_name": clip.broadcaster_name,
                    "creator_name": clip.creator_name,
                    "game_id": clip.game_id,
                    "game_name": clip.game_name,
                    "view_count": clip.view_count,
                    "velocity": clip.velocity,
                    "total_gained": clip.total_gained,
                    "age_minutes": clip.age_minutes,
                    "alert_reason": clip.alert_reason,
                    "created_at": clip.created_at.isoformat(),
                    "duration": clip.duration,
                    "language": clip.language,
                })
            )
    
    async def get_viral_clips(self, limit: int = 20, game_id: Optional[str] = None) -> List[ViralClip]:
        """
        Get current viral clips sorted by velocity.
        
        Args:
            limit: Maximum clips to return
            game_id: Filter by game (optional)
            
        Returns:
            List of ViralClip objects
        """
        # Get clip IDs sorted by velocity (descending)
        clip_ids = self.redis.zrevrange(REDIS_VIRAL_CLIPS_KEY, 0, limit * 2)  # Get extra for filtering
        
        viral_clips = []
        for clip_id in clip_ids:
            data_str = self.redis.hget(f"{REDIS_VIRAL_CLIPS_KEY}:data", clip_id)
            if not data_str:
                continue
            
            try:
                data = json.loads(data_str)
                
                # Filter by game if specified
                if game_id and data.get("game_id") != game_id:
                    continue
                
                clip = ViralClip(
                    clip_id=data["clip_id"],
                    title=data["title"],
                    url=data["url"],
                    thumbnail_url=data["thumbnail_url"],
                    broadcaster_id="",  # Not stored
                    broadcaster_name=data["broadcaster_name"],
                    creator_name=data["creator_name"],
                    game_id=data["game_id"],
                    game_name=data["game_name"],
                    language=data.get("language", ""),
                    duration=data.get("duration", 0),
                    created_at=datetime.fromisoformat(data["created_at"]),
                    view_count=data["view_count"],
                    velocity=data["velocity"],
                    total_gained=data["total_gained"],
                    alert_reason=data["alert_reason"],
                )
                viral_clips.append(clip)
                
                if len(viral_clips) >= limit:
                    break
                    
            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"Failed to parse viral clip data: {e}")
                continue
        
        return viral_clips
    
    async def get_fresh_clips(
        self, 
        game_id: Optional[str] = None, 
        limit: int = 20,
        max_age_minutes: int = 30
    ) -> List[TrackedClip]:
        """
        Get fresh clips (not necessarily viral) from recent poll.
        
        Args:
            game_id: Filter by game (optional)
            limit: Maximum clips to return
            max_age_minutes: Maximum clip age in minutes
            
        Returns:
            List of TrackedClip objects sorted by velocity
        """
        now = datetime.now(timezone.utc)
        started_at = now - timedelta(minutes=max_age_minutes)
        
        # If game_id specified, fetch just that category
        categories = {game_id: TRACKED_CATEGORIES.get(game_id, "Unknown")} if game_id else TRACKED_CATEGORIES
        
        all_clips = []
        for gid, gname in categories.items():
            try:
                clips = await self.twitch.fetch_clips(
                    game_id=gid,
                    period="day",
                    limit=50,
                )
                
                for clip in clips:
                    if (now - clip.created_at).total_seconds() < max_age_minutes * 60:
                        tracked = await self._process_clip(clip, gname)
                        all_clips.append(tracked)
                        
            except Exception as e:
                logger.warning(f"Failed to fetch clips for {gname}: {e}")
        
        # Sort by velocity and return top N
        all_clips.sort(key=lambda c: c.velocity, reverse=True)
        return all_clips[:limit]
    
    def get_last_poll_time(self) -> Optional[datetime]:
        """Get timestamp of last poll."""
        ts = self.redis.get(REDIS_LAST_POLL_KEY)
        if ts:
            return datetime.fromisoformat(ts)
        return None
    
    async def cleanup_old_data(self, max_age_hours: int = None):
        """
        Remove clip data older than TTL from Redis.
        
        Args:
            max_age_hours: Maximum age in hours (defaults to CLIP_TTL_HOURS)
        """
        if max_age_hours is None:
            max_age_hours = CLIP_TTL_HOURS
            
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=max_age_hours)
        
        cleaned_count = 0
        error_count = 0
        
        try:
            # Get all clip IDs from the views hash
            clip_ids = self.redis.hkeys(REDIS_CLIP_VIEWS_KEY)
            
            for clip_id in clip_ids:
                try:
                    # Get clip data to check age
                    data_str = self.redis.hget(REDIS_CLIP_DATA_KEY, clip_id)
                    if data_str:
                        data = json.loads(data_str)
                        first_seen = data.get("first_seen_at")
                        if first_seen:
                            first_seen_dt = datetime.fromisoformat(first_seen)
                            if first_seen_dt < cutoff:
                                # Remove from both hashes
                                self.redis.hdel(REDIS_CLIP_VIEWS_KEY, clip_id)
                                self.redis.hdel(REDIS_CLIP_DATA_KEY, clip_id)
                                cleaned_count += 1
                    else:
                        # No data, remove orphaned view count
                        self.redis.hdel(REDIS_CLIP_VIEWS_KEY, clip_id)
                        cleaned_count += 1
                        
                except (json.JSONDecodeError, ValueError) as e:
                    logger.warning(f"Error parsing clip data for {clip_id}: {e}")
                    error_count += 1
                    
            logger.info(
                f"Cleanup complete: removed {cleaned_count} old clips, "
                f"{error_count} errors, {len(clip_ids) - cleaned_count - error_count} retained"
            )
            
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")
            raise
    
    def get_poll_health(self) -> Dict:
        """
        Get health status of the clip radar polling.
        
        Returns:
            Dict with health metrics including last poll time, success rate, etc.
        """
        health = {
            "status": "unknown",
            "last_poll": None,
            "last_poll_age_minutes": None,
            "success_rate": None,
            "failed_categories": [],
            "recap_healthy": None,
        }
        
        try:
            # Get last poll time
            last_poll = self.get_last_poll_time()
            if last_poll:
                health["last_poll"] = last_poll.isoformat()
                age = (datetime.now(timezone.utc) - last_poll).total_seconds() / 60
                health["last_poll_age_minutes"] = round(age, 1)
            
            # Get poll metadata
            metadata_str = self.redis.get(f"{REDIS_LAST_POLL_KEY}:metadata")
            if metadata_str:
                metadata = json.loads(metadata_str)
                health["success_rate"] = metadata.get("success_rate")
                health["failed_categories"] = metadata.get("failed_categories", [])
                health["recap_healthy"] = metadata.get("recap_tracked", False)
                health["total_clips"] = metadata.get("total_clips", 0)
                health["total_viral"] = metadata.get("total_viral", 0)
            
            # Determine overall status
            if health["last_poll_age_minutes"] is None:
                health["status"] = "no_data"
            elif health["last_poll_age_minutes"] > 15:  # More than 3x poll interval
                health["status"] = "stale"
            elif health["success_rate"] is not None and health["success_rate"] < 50:
                health["status"] = "degraded"
            elif health["failed_categories"]:
                health["status"] = "partial"
            else:
                health["status"] = "healthy"
                
        except Exception as e:
            logger.error(f"Failed to get poll health: {e}")
            health["status"] = "error"
            health["error"] = str(e)
        
        return health


# Singleton instance
_clip_radar_service: Optional[ClipRadarService] = None


def get_clip_radar_service() -> ClipRadarService:
    """Get or create the ClipRadarService singleton."""
    global _clip_radar_service
    if _clip_radar_service is None:
        _clip_radar_service = ClipRadarService()
    return _clip_radar_service
