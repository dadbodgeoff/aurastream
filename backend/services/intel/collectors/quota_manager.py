"""
Creator Intel V2 - Quota Manager

Manages YouTube API quota across all collection operations.
Implements adaptive scheduling based on remaining quota and category activity.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
import json
import logging
import os

import redis.asyncio as redis

from backend.services.intel.core.exceptions import IntelQuotaError, IntelCircuitOpenError

logger = logging.getLogger(__name__)


@dataclass
class QuotaBucket:
    """
    Tracks quota usage for a time window.
    
    YouTube quota resets at midnight Pacific Time.
    
    Attributes:
        window_start: When this quota window started
        units_used: Units consumed in this window
        units_limit: Maximum units allowed per window
    """
    window_start: datetime
    units_used: int = 0
    units_limit: int = 10000
    
    @property
    def units_remaining(self) -> int:
        """Get remaining quota units."""
        return max(0, self.units_limit - self.units_used)
    
    @property
    def is_exhausted(self) -> bool:
        """Check if quota is exhausted."""
        return self.units_remaining <= 0
    
    @property
    def usage_percent(self) -> float:
        """Get quota usage as percentage."""
        return (self.units_used / self.units_limit) * 100 if self.units_limit > 0 else 100
    
    def consume(self, units: int) -> bool:
        """
        Consume quota units.
        
        Args:
            units: Number of units to consume
            
        Returns:
            True if successful, False if insufficient quota
        """
        if self.units_remaining < units:
            return False
        self.units_used += units
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "window_start": self.window_start.isoformat(),
            "units_used": self.units_used,
            "units_limit": self.units_limit,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "QuotaBucket":
        """Create from dictionary."""
        return cls(
            window_start=datetime.fromisoformat(data["window_start"]),
            units_used=data.get("units_used", 0),
            units_limit=data.get("units_limit", 10000),
        )


@dataclass
class CollectionScheduleResult:
    """
    Result of get_collection_schedule with visibility into skipped games.
    
    Attributes:
        scheduled: List of game keys scheduled for collection
        skipped: Dict mapping game_key -> reason for skipping
    """
    scheduled: List[str]
    skipped: Dict[str, str]
    
    @property
    def has_skipped(self) -> bool:
        """Check if any games were skipped."""
        return len(self.skipped) > 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "scheduled": self.scheduled,
            "scheduled_count": len(self.scheduled),
            "skipped": self.skipped,
            "skipped_count": len(self.skipped),
        }


@dataclass
class CollectionPriority:
    """
    Priority configuration for a game category.
    
    Attributes:
        game_key: Unique identifier for the game
        priority: Priority level (1=highest, 5=lowest)
        min_refresh_hours: Minimum time between refreshes
        max_videos: Maximum videos to fetch per refresh
        last_fetch: When this category was last fetched
        last_change_detected: When content last changed
        consecutive_no_change: Count of fetches with no changes
    """
    game_key: str
    priority: int = 3
    min_refresh_hours: float = 4.0
    max_videos: int = 50
    
    # Runtime state
    last_fetch: Optional[datetime] = None
    last_change_detected: Optional[datetime] = None
    consecutive_no_change: int = 0
    
    def get_effective_interval(self) -> float:
        """
        Get effective refresh interval with adaptive adjustment.
        
        Slows down for stale categories, speeds up for active ones.
        """
        interval = self.min_refresh_hours
        
        # Slow down if no changes detected
        if self.consecutive_no_change > 3:
            interval *= 1.5
        if self.consecutive_no_change > 6:
            interval *= 2.0
        
        return min(interval, 24.0)  # Cap at 24 hours
    
    def should_fetch(self, now: Optional[datetime] = None) -> bool:
        """Check if this category should be fetched."""
        if now is None:
            now = datetime.now(timezone.utc)
        
        if self.last_fetch is None:
            return True
        
        hours_since = (now - self.last_fetch).total_seconds() / 3600
        return hours_since >= self.get_effective_interval()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "game_key": self.game_key,
            "priority": self.priority,
            "min_refresh_hours": self.min_refresh_hours,
            "max_videos": self.max_videos,
            "last_fetch": self.last_fetch.isoformat() if self.last_fetch else None,
            "last_change": self.last_change_detected.isoformat() if self.last_change_detected else None,
            "no_change_count": self.consecutive_no_change,
        }


class QuotaManager:
    """
    Manages YouTube API quota across all collection operations.
    
    Key features:
    - Daily quota tracking with automatic reset at midnight PT
    - Priority-based collection scheduling
    - Adaptive refresh rates based on category activity
    - Circuit breaker for API failures
    
    YouTube API costs:
    - videos.list with chart=mostPopular: 1 unit
    - videos.list with id={ids}: 1 unit per 50 videos
    - search.list: 100 units (AVOID)
    
    Usage:
        manager = QuotaManager(redis_client)
        await manager.initialize()
        
        # Get categories to collect
        schedule = manager.get_collection_schedule()
        
        # Record collection
        await manager.record_collection(
            game_key="fortnite",
            units_used=5,
            videos_fetched=50,
            content_hash="abc123",
        )
    """
    
    # Quota costs
    COST_TRENDING = 1
    COST_VIDEO_DETAILS = 1  # Per 50 videos
    COST_SEARCH = 100  # NEVER USE IN PRODUCTION
    
    # Default priorities for tracked games
    DEFAULT_PRIORITIES = {
        "fortnite": CollectionPriority("fortnite", 1, 2.0, 50),
        "valorant": CollectionPriority("valorant", 1, 2.0, 50),
        "minecraft": CollectionPriority("minecraft", 1, 2.0, 50),
        "apex_legends": CollectionPriority("apex_legends", 2, 3.0, 40),
        "warzone": CollectionPriority("warzone", 2, 3.0, 40),
        "gta": CollectionPriority("gta", 2, 4.0, 40),
        "roblox": CollectionPriority("roblox", 2, 4.0, 40),
        "league_of_legends": CollectionPriority("league_of_legends", 3, 4.0, 30),
    }
    
    # Circuit breaker settings
    CIRCUIT_FAILURE_THRESHOLD = 3
    CIRCUIT_RESET_MINUTES = 15
    
    def __init__(self, redis_client: Optional[redis.Redis] = None) -> None:
        """
        Initialize the quota manager.
        
        Args:
            redis_client: Optional Redis client (will create if not provided)
        """
        self._redis = redis_client
        self._quota_bucket: Optional[QuotaBucket] = None
        self._priorities: Dict[str, CollectionPriority] = {}
        self._circuit_open = False
        self._circuit_open_until: Optional[datetime] = None
        self._initialized = False
    
    async def _get_redis(self) -> redis.Redis:
        """Get or create Redis connection."""
        if self._redis is None:
            redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
            self._redis = redis.from_url(redis_url, decode_responses=True)
        return self._redis
    
    async def initialize(self) -> None:
        """
        Load quota state from Redis.
        
        Should be called before using the manager.
        """
        if self._initialized:
            return
        
        redis_client = await self._get_redis()
        
        # Load or create quota bucket
        quota_data = await redis_client.get("youtube:quota:bucket")
        if quota_data:
            try:
                data = json.loads(quota_data)
                window_start = datetime.fromisoformat(data["window_start"])
                
                # Check if we need to reset (new day in PT)
                if self._is_new_quota_day(window_start):
                    self._quota_bucket = self._create_new_bucket()
                    logger.info("Quota bucket reset for new day")
                else:
                    self._quota_bucket = QuotaBucket.from_dict(data)
            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"Failed to load quota bucket: {e}")
                self._quota_bucket = self._create_new_bucket()
        else:
            self._quota_bucket = self._create_new_bucket()
        
        # Load priorities with last fetch times
        for key, default in self.DEFAULT_PRIORITIES.items():
            priority_data = await redis_client.get(f"youtube:priority:{key}")
            if priority_data:
                try:
                    data = json.loads(priority_data)
                    default.last_fetch = (
                        datetime.fromisoformat(data["last_fetch"])
                        if data.get("last_fetch") else None
                    )
                    default.last_change_detected = (
                        datetime.fromisoformat(data["last_change"])
                        if data.get("last_change") else None
                    )
                    default.consecutive_no_change = data.get("no_change_count", 0)
                except (json.JSONDecodeError, KeyError):
                    pass
            self._priorities[key] = default
        
        await self._persist_quota()
        self._initialized = True
        
        logger.info(
            f"QuotaManager initialized: {self._quota_bucket.units_remaining} units remaining"
        )
    
    def _is_new_quota_day(self, window_start: datetime) -> bool:
        """Check if quota should reset (midnight Pacific Time)."""
        try:
            from zoneinfo import ZoneInfo
            pt = ZoneInfo("America/Los_Angeles")
        except ImportError:
            # Fallback for older Python
            pt = timezone(timedelta(hours=-8))
        
        now_pt = datetime.now(pt)
        
        if window_start.tzinfo is None:
            window_start = window_start.replace(tzinfo=timezone.utc)
        
        window_pt = window_start.astimezone(pt)
        
        return now_pt.date() > window_pt.date()
    
    def _create_new_bucket(self) -> QuotaBucket:
        """Create a fresh quota bucket."""
        return QuotaBucket(
            window_start=datetime.now(timezone.utc),
            units_used=0,
        )
    
    async def _persist_quota(self) -> None:
        """
        Persist quota state to Redis.
        
        Note: Errors are logged but not raised to prevent quota tracking
        issues from breaking the collection pipeline.
        """
        if not self._quota_bucket:
            return
        
        try:
            redis_client = await self._get_redis()
            await redis_client.set(
                "youtube:quota:bucket",
                json.dumps(self._quota_bucket.to_dict()),
            )
        except Exception as e:
            logger.warning(
                f"Failed to persist quota state: {e}. "
                "Quota tracking may be inaccurate on restart."
            )
    
    def get_collection_schedule(self) -> List[str]:
        """
        Get ordered list of games to collect.
        
        Based on:
        1. Priority level
        2. Time since last fetch
        3. Remaining quota
        4. Activity level (skip stale categories)
        
        Returns:
            List of game keys in collection order
            
        Note:
            Use get_collection_schedule_detailed() for visibility into skipped games.
        """
        result = self.get_collection_schedule_detailed()
        return result.scheduled
    
    def get_collection_schedule_detailed(self) -> CollectionScheduleResult:
        """
        Get ordered list of games to collect with skip reasons.
        
        FIX #2: Provides visibility into WHY games were skipped.
        
        Returns:
            CollectionScheduleResult with scheduled games and skip reasons
        """
        if not self._initialized:
            raise RuntimeError("QuotaManager not initialized. Call initialize() first.")
        
        skipped: Dict[str, str] = {}
        
        # Check circuit breaker
        if self._circuit_open:
            now = datetime.now(timezone.utc)
            if self._circuit_open_until and now < self._circuit_open_until:
                logger.warning("Circuit breaker open, skipping collection")
                # All games skipped due to circuit breaker
                for key in self._priorities.keys():
                    skipped[key] = f"Circuit breaker open until {self._circuit_open_until.isoformat()}"
                return CollectionScheduleResult(scheduled=[], skipped=skipped)
            self._circuit_open = False
            logger.info("Circuit breaker closed")
        
        now = datetime.now(timezone.utc)
        candidates = []
        
        for key, priority in self._priorities.items():
            # Check if enough time has passed
            if not priority.should_fetch(now):
                if priority.last_fetch:
                    hours_since = (now - priority.last_fetch).total_seconds() / 3600
                    effective_interval = priority.get_effective_interval()
                    hours_remaining = effective_interval - hours_since
                    skipped[key] = f"Not due yet ({hours_remaining:.1f}h until next fetch)"
                continue
            
            # Estimate quota cost
            estimated_cost = self.COST_TRENDING + (priority.max_videos // 50 + 1)
            
            if self._quota_bucket.units_remaining < estimated_cost:
                skipped[key] = (
                    f"Insufficient quota: need {estimated_cost} units, "
                    f"have {self._quota_bucket.units_remaining}"
                )
                logger.warning(f"Insufficient quota for {key}, skipping")
                continue
            
            # Score: lower is better (priority * hours_overdue)
            hours_overdue = 0
            if priority.last_fetch:
                hours_since = (now - priority.last_fetch).total_seconds() / 3600
                hours_overdue = max(0, hours_since - priority.min_refresh_hours)
            else:
                hours_overdue = 24  # Never fetched = high priority
            
            score = priority.priority - (hours_overdue * 0.5)
            candidates.append((key, score))
        
        # Sort by score (lower = higher priority)
        candidates.sort(key=lambda x: x[1])
        
        scheduled = [key for key, _ in candidates]
        
        # Log if games were skipped
        if skipped:
            logger.info(
                f"Collection schedule: {len(scheduled)} games scheduled, "
                f"{len(skipped)} skipped"
            )
            for key, reason in skipped.items():
                logger.debug(f"  Skipped {key}: {reason}")
        
        return CollectionScheduleResult(scheduled=scheduled, skipped=skipped)
    
    async def record_collection(
        self,
        game_key: str,
        units_used: int,
        videos_fetched: int,
        content_hash: str,
        previous_hash: Optional[str] = None,
    ) -> None:
        """
        Record a collection operation.
        
        Args:
            game_key: The game that was collected
            units_used: Quota units consumed
            videos_fetched: Number of videos fetched
            content_hash: Hash of collected content
            previous_hash: Previous content hash for change detection
        """
        now = datetime.now(timezone.utc)
        
        # Update quota
        self._quota_bucket.consume(units_used)
        await self._persist_quota()
        
        # Update priority
        priority = self._priorities.get(game_key)
        if priority:
            priority.last_fetch = now
            
            # Check if content changed
            if previous_hash and content_hash == previous_hash:
                priority.consecutive_no_change += 1
            else:
                priority.consecutive_no_change = 0
                priority.last_change_detected = now
            
            # Persist priority state
            redis_client = await self._get_redis()
            await redis_client.set(
                f"youtube:priority:{game_key}",
                json.dumps(priority.to_dict()),
            )
        
        logger.info(
            f"Collected {game_key}: {videos_fetched} videos, "
            f"{units_used} quota units, "
            f"remaining: {self._quota_bucket.units_remaining}"
        )
    
    async def record_failure(self, game_key: str, error: Exception) -> None:
        """
        Record an API failure and potentially open circuit breaker.
        
        Args:
            game_key: The game that failed
            error: The exception that occurred
        """
        logger.error(f"Collection failed for {game_key}: {error}")
        
        redis_client = await self._get_redis()
        
        # Track consecutive failures
        failures_key = f"youtube:failures:{game_key}"
        failures = await redis_client.incr(failures_key)
        await redis_client.expire(failures_key, 3600)  # Reset after 1 hour
        
        if failures >= self.CIRCUIT_FAILURE_THRESHOLD:
            # Open circuit breaker
            self._circuit_open = True
            self._circuit_open_until = (
                datetime.now(timezone.utc) +
                timedelta(minutes=self.CIRCUIT_RESET_MINUTES)
            )
            logger.warning(
                f"Circuit breaker opened until {self._circuit_open_until}"
            )
    
    def check_quota(self, units_required: int) -> None:
        """
        Check if sufficient quota is available.
        
        Args:
            units_required: Units needed for the operation
            
        Raises:
            IntelQuotaError: If insufficient quota
            IntelCircuitOpenError: If circuit breaker is open
        """
        if self._circuit_open:
            raise IntelCircuitOpenError(
                message="Circuit breaker is open due to repeated failures",
                service="youtube",
                open_until=self._circuit_open_until.isoformat() if self._circuit_open_until else None,
            )
        
        if self._quota_bucket.units_remaining < units_required:
            raise IntelQuotaError(
                message=f"Insufficient YouTube quota: need {units_required}, have {self._quota_bucket.units_remaining}",
                platform="youtube",
                units_required=units_required,
                units_remaining=self._quota_bucket.units_remaining,
            )
    
    def get_quota_status(self) -> Dict[str, Any]:
        """
        Get current quota status for monitoring.
        
        Returns:
            Dictionary with quota metrics
        """
        return {
            "units_used": self._quota_bucket.units_used if self._quota_bucket else 0,
            "units_remaining": self._quota_bucket.units_remaining if self._quota_bucket else 0,
            "units_limit": self._quota_bucket.units_limit if self._quota_bucket else 10000,
            "percent_used": round(self._quota_bucket.usage_percent, 1) if self._quota_bucket else 0,
            "window_start": self._quota_bucket.window_start.isoformat() if self._quota_bucket else None,
            "circuit_open": self._circuit_open,
            "circuit_open_until": self._circuit_open_until.isoformat() if self._circuit_open_until else None,
        }
    
    async def close(self) -> None:
        """Close Redis connection."""
        if self._redis:
            await self._redis.aclose()
            self._redis = None


# Singleton instance
_quota_manager: Optional[QuotaManager] = None


async def get_quota_manager() -> QuotaManager:
    """
    Get the singleton quota manager instance.
    
    Returns:
        Initialized QuotaManager
    """
    global _quota_manager
    if _quota_manager is None:
        _quota_manager = QuotaManager()
        await _quota_manager.initialize()
    return _quota_manager
