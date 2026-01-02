"""
Creator Intel V2 - Hourly Aggregator

Aggregates Redis data into PostgreSQL hourly tables.
Called every hour at :05 to capture the previous hour's data.

Uses Supabase client for database operations (not asyncpg).
"""

import json
import logging
from dataclasses import dataclass, asdict
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import redis.asyncio as redis
from supabase import Client

logger = logging.getLogger(__name__)


@dataclass
class HourlyAggregate:
    """Hourly aggregated metrics for a category."""
    category_key: str
    hour_start: datetime
    
    # Video metrics
    video_count: int
    avg_views: float
    avg_engagement: float
    total_views: int
    
    # Viral metrics
    viral_count: int
    rising_count: int
    avg_velocity: float
    max_velocity: float
    
    # Format metrics
    shorts_count: int
    shorts_avg_views: float
    longform_count: int
    longform_avg_views: float
    
    # Duration metrics
    avg_duration_seconds: float
    optimal_duration_bucket: str
    
    # Regional metrics
    language_distribution: Dict[str, int]
    dominant_language: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        result = asdict(self)
        result["hour_start"] = self.hour_start.isoformat()
        return result
    
    def to_db_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database insertion."""
        return {
            "category_key": self.category_key,
            "hour_start": self.hour_start.isoformat(),
            "video_count": self.video_count,
            "avg_views": self.avg_views,
            "avg_engagement": self.avg_engagement,
            "total_views": self.total_views,
            "viral_count": self.viral_count,
            "rising_count": self.rising_count,
            "avg_velocity": self.avg_velocity,
            "max_velocity": self.max_velocity,
            "shorts_count": self.shorts_count,
            "shorts_avg_views": self.shorts_avg_views,
            "longform_count": self.longform_count,
            "longform_avg_views": self.longform_avg_views,
            "avg_duration_seconds": self.avg_duration_seconds,
            "optimal_duration_bucket": self.optimal_duration_bucket,
            "language_distribution": json.dumps(self.language_distribution),
            "dominant_language": self.dominant_language,
        }


class HourlyAggregator:
    """
    Aggregates current Redis data into hourly PostgreSQL records.
    
    Called every hour at :05 to capture the previous hour's data.
    
    Data flow:
    1. Load video data from Redis (youtube:games:{game})
    2. Load precomputed analysis from Redis (intel:*:precomputed:{game})
    3. Calculate hourly aggregates
    4. Insert into intel_hourly_metrics table via Supabase
    
    Usage:
        from backend.database import get_supabase_client
        
        db = get_supabase_client()
        aggregator = HourlyAggregator(redis_client, db)
        await aggregator.run()
    """
    
    # Tracked games
    TRACKED_GAMES = [
        "fortnite", "valorant", "minecraft", "apex_legends",
        "warzone", "gta", "roblox", "league_of_legends"
    ]
    
    def __init__(self, redis_client: redis.Redis, db: Client) -> None:
        """
        Initialize the aggregator.
        
        Args:
            redis_client: Redis client for reading cached data
            db: Supabase client for database operations
        """
        self.redis = redis_client
        self.db = db
    
    async def run(self) -> int:
        """
        Run hourly aggregation for all tracked games.
        
        Returns:
            Number of categories aggregated
        """
        hour_start = datetime.now(timezone.utc).replace(
            minute=0, second=0, microsecond=0
        )
        
        logger.info(f"Starting hourly aggregation for {hour_start}")
        
        aggregates = []
        for game_key in self.TRACKED_GAMES:
            try:
                aggregate = await self._aggregate_game(game_key, hour_start)
                if aggregate:
                    aggregates.append(aggregate)
            except Exception as e:
                logger.error(f"Failed to aggregate {game_key}: {e}")
        
        # Batch insert to PostgreSQL
        if aggregates:
            await self._insert_aggregates(aggregates)
        
        logger.info(f"Hourly aggregation complete: {len(aggregates)} categories")
        return len(aggregates)
    
    async def _aggregate_game(
        self,
        game_key: str,
        hour_start: datetime,
    ) -> Optional[HourlyAggregate]:
        """Aggregate a single game's data for the hour."""
        # Load from Redis
        youtube_data = await self.redis.get(f"youtube:games:{game_key}")
        viral_data = await self.redis.get(f"intel:viral:precomputed:{game_key}")
        format_data = await self.redis.get(f"intel:format:precomputed:{game_key}")
        
        if not youtube_data:
            return None
        
        try:
            videos = json.loads(youtube_data).get("videos", [])
        except json.JSONDecodeError:
            return None
        
        viral = json.loads(viral_data) if viral_data else {}
        format_intel = json.loads(format_data) if format_data else {}
        
        # Calculate aggregates
        views = [v.get("view_count", 0) for v in videos]
        engagements = [v.get("engagement_rate", 0) or 0 for v in videos]
        durations = [v.get("duration_seconds", 0) for v in videos if v.get("duration_seconds")]
        
        shorts = [v for v in videos if v.get("is_short")]
        longform = [v for v in videos if not v.get("is_short")]
        
        # Language distribution
        lang_dist: Dict[str, int] = {}
        for v in videos:
            lang = (v.get("default_audio_language") or "en")[:2].lower()
            lang_dist[lang] = lang_dist.get(lang, 0) + 1
        
        dominant_lang = max(lang_dist.items(), key=lambda x: x[1])[0] if lang_dist else "en"
        
        # Get viral data
        viral_data_dict = viral.get("data", {}) if isinstance(viral, dict) else {}
        
        return HourlyAggregate(
            category_key=game_key,
            hour_start=hour_start,
            video_count=len(videos),
            avg_views=sum(views) / len(views) if views else 0,
            avg_engagement=sum(engagements) / len(engagements) if engagements else 0,
            total_views=sum(views),
            viral_count=viral_data_dict.get("viral_video_count", 0),
            rising_count=viral_data_dict.get("rising_video_count", 0),
            avg_velocity=viral_data_dict.get("avg_velocity", 0),
            max_velocity=viral_data_dict.get("max_velocity", 0),
            shorts_count=len(shorts),
            shorts_avg_views=sum(v.get("view_count", 0) for v in shorts) / len(shorts) if shorts else 0,
            longform_count=len(longform),
            longform_avg_views=sum(v.get("view_count", 0) for v in longform) / len(longform) if longform else 0,
            avg_duration_seconds=sum(durations) / len(durations) if durations else 0,
            optimal_duration_bucket=format_intel.get("data", {}).get("optimal_duration_range", "unknown"),
            language_distribution=lang_dist,
            dominant_language=dominant_lang,
        )
    
    async def _insert_aggregates(self, aggregates: List[HourlyAggregate]) -> None:
        """Batch insert hourly aggregates to PostgreSQL via Supabase."""
        if not aggregates:
            return
        
        try:
            # Convert aggregates to database format
            records = [a.to_db_dict() for a in aggregates]
            
            # Upsert all records (handles ON CONFLICT)
            self.db.table("intel_hourly_metrics").upsert(
                records,
                on_conflict="category_key,hour_start"
            ).execute()
            
            logger.debug(f"Inserted {len(aggregates)} hourly aggregates")
            
        except Exception as e:
            logger.error(f"Failed to insert hourly aggregates: {e}")
            raise
    
    async def get_hourly_data(
        self,
        category_key: str,
        hours: int = 24,
    ) -> List[HourlyAggregate]:
        """
        Get hourly data for a category.
        
        Args:
            category_key: The category to query
            hours: Number of hours to retrieve
            
        Returns:
            List of HourlyAggregate objects
        """
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        try:
            response = (
                self.db.table("intel_hourly_metrics")
                .select("*")
                .eq("category_key", category_key)
                .gte("hour_start", since.isoformat())
                .order("hour_start", desc=True)
                .execute()
            )
            
            rows = response.data or []
            
            return [
                HourlyAggregate(
                    category_key=row["category_key"],
                    hour_start=datetime.fromisoformat(row["hour_start"].replace("Z", "+00:00")),
                    video_count=row["video_count"],
                    avg_views=row["avg_views"],
                    avg_engagement=row["avg_engagement"],
                    total_views=row["total_views"],
                    viral_count=row["viral_count"],
                    rising_count=row["rising_count"],
                    avg_velocity=row["avg_velocity"],
                    max_velocity=row["max_velocity"],
                    shorts_count=row["shorts_count"],
                    shorts_avg_views=row["shorts_avg_views"],
                    longform_count=row["longform_count"],
                    longform_avg_views=row["longform_avg_views"],
                    avg_duration_seconds=row["avg_duration_seconds"],
                    optimal_duration_bucket=row["optimal_duration_bucket"],
                    language_distribution=row["language_distribution"] if isinstance(row["language_distribution"], dict) else json.loads(row["language_distribution"] or "{}"),
                    dominant_language=row["dominant_language"],
                )
                for row in rows
            ]
            
        except Exception as e:
            logger.error(f"Failed to get hourly data for {category_key}: {e}")
            return []
