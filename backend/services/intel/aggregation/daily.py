"""
Creator Intel V2 - Daily Rollup

Rolls up hourly data into daily aggregates.
Called daily at 00:15 UTC to process the previous day's data.

Uses Supabase client for database operations (not asyncpg).
"""

import json
import logging
from dataclasses import dataclass, asdict
from datetime import datetime, timezone, timedelta, date
from typing import Any, Dict, List, Optional

from supabase import Client

logger = logging.getLogger(__name__)


@dataclass
class DailyAggregate:
    """Daily aggregated metrics rolled up from hourly."""
    category_key: str
    date: date
    
    # Aggregated from hourly
    total_videos_seen: int
    peak_viral_count: int
    avg_viral_count: float
    
    # Trend indicators
    views_trend: float  # % change from previous day
    viral_trend: float
    engagement_trend: float
    
    # Best performing
    best_hour_utc: int
    worst_hour_utc: int
    peak_views_hour_utc: int
    
    # Format insights
    shorts_performance_ratio: float
    optimal_duration_range: str
    
    # Regional insights
    dominant_language: str
    language_diversity_score: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        result = asdict(self)
        result["date"] = self.date.isoformat()
        return result
    
    def to_db_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database insertion."""
        return {
            "category_key": self.category_key,
            "date": self.date.isoformat(),
            "total_videos_seen": self.total_videos_seen,
            "peak_viral_count": self.peak_viral_count,
            "avg_viral_count": self.avg_viral_count,
            "views_trend": self.views_trend,
            "viral_trend": self.viral_trend,
            "engagement_trend": self.engagement_trend,
            "best_hour_utc": self.best_hour_utc,
            "worst_hour_utc": self.worst_hour_utc,
            "peak_views_hour_utc": self.peak_views_hour_utc,
            "shorts_performance_ratio": self.shorts_performance_ratio,
            "optimal_duration_range": self.optimal_duration_range,
            "dominant_language": self.dominant_language,
            "language_diversity_score": self.language_diversity_score,
        }


class DailyRollup:
    """
    Rolls up hourly data into daily aggregates.
    
    Called daily at 00:15 UTC to process the previous day's data.
    
    Data flow:
    1. Query hourly data for the previous day via Supabase
    2. Calculate daily aggregates (peak, avg, trends)
    3. Insert into intel_daily_metrics table
    4. Cleanup old hourly data (>7 days)
    
    Usage:
        from backend.database import get_supabase_client
        
        db = get_supabase_client()
        rollup = DailyRollup(db)
        await rollup.run()
    """
    
    # Retention periods
    HOURLY_RETENTION_DAYS = 7
    DAILY_RETENTION_DAYS = 90
    
    # Tracked games
    TRACKED_GAMES = [
        "fortnite", "valorant", "minecraft", "apex_legends",
        "warzone", "gta", "roblox", "league_of_legends"
    ]
    
    def __init__(self, db: Client) -> None:
        """
        Initialize the rollup.
        
        Args:
            db: Supabase client for database operations
        """
        self.db = db
    
    async def run(self) -> int:
        """
        Run daily rollup for all tracked games.
        
        Returns:
            Number of categories rolled up
        """
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).date()
        
        logger.info(f"Starting daily rollup for {yesterday}")
        
        rollups = []
        for game_key in self.TRACKED_GAMES:
            try:
                rollup = await self._rollup_game(game_key, yesterday)
                if rollup:
                    rollups.append(rollup)
            except Exception as e:
                logger.error(f"Failed to rollup {game_key}: {e}")
        
        # Insert rollups
        if rollups:
            await self._insert_rollups(rollups)
        
        # Cleanup old data
        await self._cleanup_old_data(yesterday)
        
        logger.info(f"Daily rollup complete: {len(rollups)} categories")
        return len(rollups)
    
    async def _rollup_game(
        self,
        game_key: str,
        target_date: date,
    ) -> Optional[DailyAggregate]:
        """Roll up hourly data into daily aggregate."""
        # Query hourly data for the day
        day_start = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)
        
        try:
            response = (
                self.db.table("intel_hourly_metrics")
                .select("*")
                .eq("category_key", game_key)
                .gte("hour_start", day_start.isoformat())
                .lt("hour_start", day_end.isoformat())
                .order("hour_start")
                .execute()
            )
            
            rows = response.data or []
        except Exception as e:
            logger.error(f"Failed to query hourly data for {game_key}: {e}")
            return None
        
        if not rows:
            return None
        
        # Parse hour_start for each row
        for row in rows:
            if isinstance(row.get("hour_start"), str):
                row["hour_start"] = datetime.fromisoformat(row["hour_start"].replace("Z", "+00:00"))
            # Parse language_distribution if it's a string
            if isinstance(row.get("language_distribution"), str):
                row["language_distribution"] = json.loads(row["language_distribution"] or "{}")
        
        # Calculate daily aggregates
        total_videos = sum(r["video_count"] for r in rows)
        viral_counts = [r["viral_count"] for r in rows]
        avg_views_list = [r["avg_views"] for r in rows]
        
        # Find best/worst hours
        by_views = sorted(rows, key=lambda r: r["avg_views"], reverse=True)
        best_hour = by_views[0]["hour_start"].hour if by_views else 12
        worst_hour = by_views[-1]["hour_start"].hour if by_views else 4
        peak_views_hour = best_hour
        
        # Calculate trends (compare to previous day)
        prev_day = await self._get_previous_daily(game_key, target_date - timedelta(days=1))
        
        current_avg_views = sum(avg_views_list) / len(avg_views_list) if avg_views_list else 0
        current_avg_viral = sum(viral_counts) / len(viral_counts) if viral_counts else 0
        
        views_trend = 0.0
        viral_trend = 0.0
        engagement_trend = 0.0
        
        if prev_day:
            if prev_day.get("avg_views", 0) > 0:
                views_trend = ((current_avg_views - prev_day["avg_views"]) / prev_day["avg_views"]) * 100
            if prev_day.get("avg_viral_count", 0) > 0:
                viral_trend = ((current_avg_viral - prev_day["avg_viral_count"]) / prev_day["avg_viral_count"]) * 100
        
        # Shorts performance
        shorts_views = sum(r["shorts_avg_views"] * r["shorts_count"] for r in rows)
        shorts_count = sum(r["shorts_count"] for r in rows)
        longform_views = sum(r["longform_avg_views"] * r["longform_count"] for r in rows)
        longform_count = sum(r["longform_count"] for r in rows)
        
        shorts_ratio = 1.0
        if longform_count > 0 and shorts_count > 0:
            shorts_avg = shorts_views / shorts_count
            longform_avg = longform_views / longform_count
            shorts_ratio = shorts_avg / longform_avg if longform_avg > 0 else 1.0
        
        # Language diversity
        all_langs: Dict[str, int] = {}
        for r in rows:
            lang_dist = r.get("language_distribution") or {}
            if isinstance(lang_dist, str):
                lang_dist = json.loads(lang_dist)
            for lang, count in lang_dist.items():
                all_langs[lang] = all_langs.get(lang, 0) + count
        
        dominant_lang = max(all_langs.items(), key=lambda x: x[1])[0] if all_langs else "en"
        
        # Calculate diversity score (0-1, higher = more diverse)
        total_lang_count = sum(all_langs.values())
        diversity_score = 0.0
        if total_lang_count > 0 and len(all_langs) > 1:
            # Shannon diversity index normalized
            import math
            for count in all_langs.values():
                p = count / total_lang_count
                if p > 0:
                    diversity_score -= p * math.log(p)
            diversity_score = diversity_score / math.log(len(all_langs)) if len(all_langs) > 1 else 0
        
        return DailyAggregate(
            category_key=game_key,
            date=target_date,
            total_videos_seen=total_videos,
            peak_viral_count=max(viral_counts) if viral_counts else 0,
            avg_viral_count=current_avg_viral,
            views_trend=round(views_trend, 2),
            viral_trend=round(viral_trend, 2),
            engagement_trend=round(engagement_trend, 2),
            best_hour_utc=best_hour,
            worst_hour_utc=worst_hour,
            peak_views_hour_utc=peak_views_hour,
            shorts_performance_ratio=round(shorts_ratio, 2),
            optimal_duration_range=rows[0]["optimal_duration_bucket"] if rows else "unknown",
            dominant_language=dominant_lang,
            language_diversity_score=round(diversity_score, 3),
        )
    
    async def _get_previous_daily(
        self,
        game_key: str,
        target_date: date,
    ) -> Optional[Dict[str, Any]]:
        """Get previous day's aggregate for trend calculation."""
        try:
            response = (
                self.db.table("intel_daily_metrics")
                .select("*")
                .eq("category_key", game_key)
                .eq("date", target_date.isoformat())
                .single()
                .execute()
            )
            return response.data
        except Exception:
            # No previous day data found
            return None
    
    async def _insert_rollups(self, rollups: List[DailyAggregate]) -> None:
        """Insert daily rollups to PostgreSQL via Supabase."""
        if not rollups:
            return
        
        try:
            # Convert rollups to database format
            records = [r.to_db_dict() for r in rollups]
            
            # Upsert all records (handles ON CONFLICT)
            self.db.table("intel_daily_metrics").upsert(
                records,
                on_conflict="category_key,date"
            ).execute()
            
            logger.debug(f"Inserted {len(rollups)} daily rollups")
            
        except Exception as e:
            logger.error(f"Failed to insert daily rollups: {e}")
            raise
    
    async def _cleanup_old_data(self, current_date: date) -> None:
        """Delete old data per retention policy."""
        hourly_cutoff = current_date - timedelta(days=self.HOURLY_RETENTION_DAYS)
        daily_cutoff = current_date - timedelta(days=self.DAILY_RETENTION_DAYS)
        
        try:
            # Cleanup hourly
            hourly_cutoff_dt = datetime.combine(hourly_cutoff, datetime.min.time()).replace(tzinfo=timezone.utc)
            self.db.table("intel_hourly_metrics").delete().lt(
                "hour_start", hourly_cutoff_dt.isoformat()
            ).execute()
            logger.info(f"Cleaned up hourly data before {hourly_cutoff}")
            
            # Cleanup daily
            self.db.table("intel_daily_metrics").delete().lt(
                "date", daily_cutoff.isoformat()
            ).execute()
            logger.info(f"Cleaned up daily data before {daily_cutoff}")
            
        except Exception as e:
            logger.error(f"Failed to cleanup old data: {e}")
    
    async def get_daily_data(
        self,
        category_key: str,
        days: int = 30,
    ) -> List[DailyAggregate]:
        """
        Get daily data for a category.
        
        Args:
            category_key: The category to query
            days: Number of days to retrieve
            
        Returns:
            List of DailyAggregate objects
        """
        since = (datetime.now(timezone.utc) - timedelta(days=days)).date()
        
        try:
            response = (
                self.db.table("intel_daily_metrics")
                .select("*")
                .eq("category_key", category_key)
                .gte("date", since.isoformat())
                .order("date", desc=True)
                .execute()
            )
            
            rows = response.data or []
            
            return [
                DailyAggregate(
                    category_key=row["category_key"],
                    date=date.fromisoformat(row["date"]) if isinstance(row["date"], str) else row["date"],
                    total_videos_seen=row["total_videos_seen"],
                    peak_viral_count=row["peak_viral_count"],
                    avg_viral_count=row["avg_viral_count"],
                    views_trend=row["views_trend"],
                    viral_trend=row["viral_trend"],
                    engagement_trend=row["engagement_trend"],
                    best_hour_utc=row["best_hour_utc"],
                    worst_hour_utc=row["worst_hour_utc"],
                    peak_views_hour_utc=row["peak_views_hour_utc"],
                    shorts_performance_ratio=row["shorts_performance_ratio"],
                    optimal_duration_range=row["optimal_duration_range"],
                    dominant_language=row["dominant_language"],
                    language_diversity_score=row["language_diversity_score"],
                )
                for row in rows
            ]
            
        except Exception as e:
            logger.error(f"Failed to get daily data for {category_key}: {e}")
            return []
