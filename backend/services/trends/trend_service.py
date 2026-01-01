"""
Trend Intelligence Service - Main orchestrator for trend data.

AuraStream - Creator Daily Brief & Viral Analytics
"""

import logging
from typing import Optional, List
from datetime import date, datetime

from backend.database.supabase_client import get_supabase_client
from backend.api.schemas.trends import (
    DailyBriefResponse,
    YouTubeVideoResponse,
    TwitchStreamResponse,
    TwitchGameResponse,
    ThumbnailAnalysisResponse,
    VelocityAlertResponse,
    TimingRecommendationResponse,
)

logger = logging.getLogger(__name__)


class TrendService:
    """Main service for trend intelligence operations."""

    def __init__(self, supabase_client=None):
        self._supabase = supabase_client

    @property
    def db(self):
        """Lazy initialization of Supabase client."""
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase

    async def get_daily_brief(
        self, brief_date: Optional[date] = None
    ) -> Optional[DailyBriefResponse]:
        """
        Get the daily brief for a specific date (defaults to today).
        
        Args:
            brief_date: The date to fetch the brief for. Defaults to today.
            
        Returns:
            DailyBriefResponse if found, None otherwise.
        """
        target_date = brief_date or date.today()
        try:
            result = (
                self.db.table("trend_daily_briefs")
                .select("*")
                .eq("brief_date", str(target_date))
                .single()
                .execute()
            )
            if result.data:
                return DailyBriefResponse(**result.data)
        except Exception as e:
            logger.error(f"Error fetching daily brief for {target_date}: {e}")
        return None

    async def get_youtube_trending(
        self, category: str = "gaming", region: str = "US", limit: int = 20
    ) -> List[YouTubeVideoResponse]:
        """
        Get cached YouTube trending videos.
        
        Args:
            category: Video category (gaming, entertainment, music, education).
            region: Region code (default: US).
            limit: Maximum number of videos to return.
            
        Returns:
            List of YouTubeVideoResponse objects.
        """
        try:
            # Get latest snapshot for category
            result = (
                self.db.table("trend_youtube_snapshots")
                .select("*")
                .eq("category", category)
                .eq("region", region)
                .order("snapshot_date", desc=True)
                .limit(1)
                .execute()
            )

            if result.data and result.data[0].get("videos"):
                videos = result.data[0]["videos"][:limit]
                return [YouTubeVideoResponse(**v) for v in videos]
        except Exception as e:
            logger.error(f"Error fetching YouTube trending for {category}/{region}: {e}")
        return []

    async def get_twitch_live(
        self, limit: int = 20, game_id: Optional[str] = None
    ) -> List[TwitchStreamResponse]:
        """
        Get current top Twitch streams from cache.
        
        Args:
            limit: Maximum number of streams to return.
            game_id: Optional game ID to filter by.
            
        Returns:
            List of TwitchStreamResponse objects.
        """
        try:
            # Get latest snapshot
            result = (
                self.db.table("trend_twitch_snapshots")
                .select("*")
                .order("snapshot_time", desc=True)
                .limit(1)
                .execute()
            )

            if result.data and result.data[0].get("top_streams"):
                streams = result.data[0]["top_streams"]
                if game_id:
                    streams = [s for s in streams if s.get("game_id") == game_id]
                return [TwitchStreamResponse(**s) for s in streams[:limit]]
        except Exception as e:
            logger.error(f"Error fetching Twitch live streams: {e}")
        return []

    async def get_twitch_games(self, limit: int = 20) -> List[TwitchGameResponse]:
        """
        Get current top Twitch games from cache.
        
        Args:
            limit: Maximum number of games to return.
            
        Returns:
            List of TwitchGameResponse objects.
        """
        try:
            result = (
                self.db.table("trend_twitch_snapshots")
                .select("*")
                .order("snapshot_time", desc=True)
                .limit(1)
                .execute()
            )

            if result.data and result.data[0].get("top_games"):
                games = result.data[0]["top_games"][:limit]
                return [TwitchGameResponse(**g) for g in games]
        except Exception as e:
            logger.error(f"Error fetching Twitch games: {e}")
        return []

    async def get_thumbnail_analysis(
        self, video_id: str
    ) -> Optional[ThumbnailAnalysisResponse]:
        """
        Get cached thumbnail analysis for a video.
        
        Args:
            video_id: The YouTube video ID.
            
        Returns:
            ThumbnailAnalysisResponse if found, None otherwise.
        """
        try:
            result = (
                self.db.table("trend_thumbnail_analysis")
                .select("*")
                .eq("source_type", "youtube")
                .eq("source_id", video_id)
                .single()
                .execute()
            )
            if result.data:
                return ThumbnailAnalysisResponse(**result.data)
        except Exception as e:
            logger.error(f"Error fetching thumbnail analysis for {video_id}: {e}")
        return None

    async def get_velocity_alerts(
        self, active_only: bool = True
    ) -> List[VelocityAlertResponse]:
        """
        Get velocity alerts (Studio tier only).
        
        Args:
            active_only: If True, only return active alerts.
            
        Returns:
            List of VelocityAlertResponse objects.
        """
        try:
            query = self.db.table("trend_velocity_alerts").select("*")
            if active_only:
                query = query.eq("is_active", True)
            result = query.order("detected_at", desc=True).limit(50).execute()
            return [VelocityAlertResponse(**a) for a in (result.data or [])]
        except Exception as e:
            logger.error(f"Error fetching velocity alerts: {e}")
        return []

    async def get_timing_recommendation(
        self, category: str
    ) -> Optional[TimingRecommendationResponse]:
        """
        Get timing recommendation for a category.
        
        Args:
            category: The content category (gaming, entertainment, etc.).
            
        Returns:
            TimingRecommendationResponse if found, None otherwise.
        """
        try:
            # Get from latest daily brief
            result = (
                self.db.table("trend_daily_briefs")
                .select("best_upload_times, best_stream_times")
                .order("brief_date", desc=True)
                .limit(1)
                .execute()
            )

            if result.data:
                times = result.data[0].get("best_upload_times", {})
                if category in times:
                    return TimingRecommendationResponse(**times[category])
        except Exception as e:
            logger.error(f"Error fetching timing for {category}: {e}")
        return None

    async def record_user_search(
        self,
        user_id: str,
        query: str,
        category: Optional[str],
        results: List[dict],
    ) -> None:
        """
        Record a user's search for rate limiting and caching.
        
        Args:
            user_id: The user's ID.
            query: The search query.
            category: Optional category filter.
            results: The search results to cache.
        """
        try:
            # Set expiry to end of day
            expires_at = datetime.utcnow().replace(
                hour=23, minute=59, second=59, microsecond=0
            )
            
            self.db.table("trend_user_searches").insert({
                "user_id": user_id,
                "query": query,
                "category": category,
                "results": results,
                "result_count": len(results),
                "expires_at": expires_at.isoformat(),
            }).execute()
        except Exception as e:
            logger.error(f"Error recording user search for {user_id}: {e}")

    async def get_user_search_count_today(self, user_id: str) -> int:
        """
        Get user's search count for today (for rate limiting).
        
        Args:
            user_id: The user's ID.
            
        Returns:
            Number of searches the user has made today.
        """
        try:
            today = date.today()
            result = (
                self.db.table("trend_user_searches")
                .select("id", count="exact")
                .eq("user_id", user_id)
                .gte("created_at", str(today))
                .execute()
            )
            return result.count or 0
        except Exception as e:
            logger.error(f"Error getting search count for {user_id}: {e}")
            return 0
