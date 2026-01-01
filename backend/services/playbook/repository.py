"""
Playbook Repository - Database operations for playbook reports.

Handles storing and retrieving playbook reports from Supabase.
"""

import logging
import os
from datetime import datetime, date
from typing import Optional, List, Dict, Any

from supabase import create_client, Client

from backend.api.schemas.playbook import TodaysPlaybook

logger = logging.getLogger(__name__)


class PlaybookRepository:
    """Repository for playbook database operations."""
    
    def __init__(self):
        self._client: Optional[Client] = None
    
    @property
    def client(self) -> Client:
        """Lazy-load Supabase client."""
        if self._client is None:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if not url or not key:
                raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
            self._client = create_client(url, key)
        return self._client
    
    async def save_report(self, playbook: TodaysPlaybook) -> str:
        """
        Save a playbook report to the database.
        
        Args:
            playbook: The generated playbook
            
        Returns:
            The report ID
        """
        try:
            now = datetime.utcnow()
            
            data = {
                "report_date": playbook.playbook_date.isoformat(),
                "report_time": now.time().isoformat(),
                "report_timestamp": now.isoformat(),
                "headline": playbook.headline,
                "subheadline": playbook.subheadline,
                "mood": playbook.mood,
                "total_twitch_viewers": playbook.total_twitch_viewers,
                "total_youtube_gaming_views": playbook.total_youtube_gaming_views,
                "trending_game": playbook.trending_game,
                "viral_video_count": playbook.viral_video_count,
                "golden_hours": [gh.model_dump() for gh in playbook.golden_hours],
                "weekly_schedule": playbook.weekly_schedule.model_dump() if playbook.weekly_schedule else None,
                "niche_opportunities": [n.model_dump() for n in playbook.niche_opportunities],
                "viral_hooks": [vh.model_dump() for vh in playbook.viral_hooks],
                "title_formulas": [tf.model_dump() for tf in playbook.title_formulas],
                "thumbnail_recipes": [tr.model_dump() for tr in playbook.thumbnail_recipes],
                "video_ideas": [vi.model_dump() for vi in playbook.video_ideas],
                "strategies": [s.model_dump() for s in playbook.strategies],
                "insight_cards": [ic.model_dump() for ic in playbook.insight_cards],
                "trending_hashtags": playbook.trending_hashtags,
                "title_keywords": playbook.title_keywords,
                "daily_mantra": playbook.daily_mantra,
                "success_story": playbook.success_story,
            }
            
            result = self.client.table("playbook_reports").insert(data).execute()
            
            if result.data:
                report_id = result.data[0]["id"]
                logger.info(f"Saved playbook report: {report_id}")
                return report_id
            
            raise Exception("No data returned from insert")
            
        except Exception as e:
            logger.error(f"Failed to save playbook report: {e}")
            raise
    
    async def get_latest_report(self) -> Optional[Dict[str, Any]]:
        """Get the most recent playbook report."""
        try:
            result = self.client.table("playbook_reports") \
                .select("*") \
                .order("report_timestamp", desc=True) \
                .limit(1) \
                .execute()
            
            if result.data:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Failed to get latest report: {e}")
            return None
    
    async def get_report_by_id(self, report_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific playbook report by ID."""
        try:
            result = self.client.table("playbook_reports") \
                .select("*") \
                .eq("id", report_id) \
                .single() \
                .execute()
            
            return result.data
            
        except Exception as e:
            logger.error(f"Failed to get report {report_id}: {e}")
            return None
    
    async def get_reports_for_date(self, target_date: date) -> List[Dict[str, Any]]:
        """Get all reports for a specific date."""
        try:
            result = self.client.table("playbook_reports") \
                .select("*") \
                .eq("report_date", target_date.isoformat()) \
                .order("report_time", desc=True) \
                .execute()
            
            return result.data or []
            
        except Exception as e:
            logger.error(f"Failed to get reports for {target_date}: {e}")
            return []
    
    async def list_recent_reports(self, limit: int = 20) -> List[Dict[str, Any]]:
        """List recent reports for the report selector."""
        try:
            result = self.client.table("playbook_reports") \
                .select("id, report_date, report_time, report_timestamp, headline, mood, trending_game") \
                .order("report_timestamp", desc=True) \
                .limit(limit) \
                .execute()
            
            return result.data or []
            
        except Exception as e:
            logger.error(f"Failed to list recent reports: {e}")
            return []
    
    async def mark_report_viewed(self, user_id: str, report_id: str) -> bool:
        """Mark a report as viewed by a user."""
        try:
            self.client.table("user_playbook_views").upsert({
                "user_id": user_id,
                "report_id": report_id,
                "viewed_at": datetime.utcnow().isoformat(),
            }).execute()
            return True
        except Exception as e:
            logger.error(f"Failed to mark report viewed: {e}")
            return False
    
    async def get_unviewed_count(self, user_id: str) -> int:
        """Get count of unviewed reports for a user."""
        try:
            # Get user's last viewed timestamp
            prefs = self.client.table("user_playbook_preferences") \
                .select("last_viewed_at") \
                .eq("user_id", user_id) \
                .single() \
                .execute()
            
            last_viewed = prefs.data.get("last_viewed_at") if prefs.data else None
            
            # Count reports newer than last viewed
            query = self.client.table("playbook_reports").select("id", count="exact")
            
            if last_viewed:
                query = query.gt("report_timestamp", last_viewed)
            
            result = query.execute()
            return result.count or 0
            
        except Exception as e:
            logger.error(f"Failed to get unviewed count: {e}")
            return 0
