"""
Thumbnail Intelligence Repository

Handles database operations for storing and retrieving
thumbnail analysis results.
"""

import logging
import os
import json
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from dataclasses import asdict

from supabase import create_client, Client

from backend.services.thumbnail_intel.vision_analyzer import (
    CategoryThumbnailInsight,
    ThumbnailAnalysis,
)

logger = logging.getLogger(__name__)


class ThumbnailIntelRepository:
    """
    Repository for thumbnail intelligence data.
    
    Stores daily analysis results in Supabase for retrieval
    by the API and frontend.
    """
    
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
    
    async def save_category_insight(
        self,
        insight: CategoryThumbnailInsight,
    ) -> str:
        """
        Save a category thumbnail insight to the database.
        
        Args:
            insight: CategoryThumbnailInsight to save
            
        Returns:
            The record ID
        """
        try:
            # Convert thumbnails to serializable format
            thumbnails_data = [
                {
                    "video_id": t.video_id,
                    "title": t.title,
                    "thumbnail_url": t.thumbnail_url,
                    "view_count": t.view_count,
                    "layout_type": t.layout_type,
                    "text_placement": t.text_placement,
                    "focal_point": t.focal_point,
                    "dominant_colors": t.dominant_colors,
                    "color_mood": t.color_mood,
                    "background_style": t.background_style,
                    "has_face": t.has_face,
                    "has_text": t.has_text,
                    "text_content": t.text_content,
                    "has_border": t.has_border,
                    "has_glow_effects": t.has_glow_effects,
                    "has_arrows_circles": t.has_arrows_circles,
                    "face_expression": t.face_expression,
                    "face_position": t.face_position,
                    "face_size": t.face_size,
                    "face_looking_direction": t.face_looking_direction,
                    "layout_recipe": t.layout_recipe,
                    "color_recipe": t.color_recipe,
                    "why_it_works": t.why_it_works,
                    "difficulty": t.difficulty,
                }
                for t in insight.thumbnails
            ]
            
            data = {
                "category_key": insight.category_key,
                "category_name": insight.category_name,
                "analysis_date": insight.analysis_date,
                "thumbnails": thumbnails_data,
                "common_layout": insight.common_layout,
                "common_colors": insight.common_colors,
                "common_elements": insight.common_elements,
                "ideal_layout": insight.ideal_layout,
                "ideal_color_palette": insight.ideal_color_palette,
                "must_have_elements": insight.must_have_elements,
                "avoid_elements": insight.avoid_elements,
                "category_style_summary": insight.category_style_summary,
                "pro_tips": insight.pro_tips,
                "created_at": datetime.utcnow().isoformat(),
            }
            
            result = self.client.table("thumbnail_intel").upsert(
                data,
                on_conflict="category_key,analysis_date"
            ).execute()
            
            if result.data:
                record_id = result.data[0]["id"]
                logger.info(f"Saved thumbnail insight for {insight.category_key}: {record_id}")
                return record_id
            
            raise Exception("No data returned from insert")
            
        except Exception as e:
            logger.error(f"Failed to save thumbnail insight: {e}")
            raise
    
    async def get_latest_insights(self) -> List[CategoryThumbnailInsight]:
        """
        Get the latest thumbnail insights for all categories.
        
        Returns:
            List of CategoryThumbnailInsight for each category
        """
        try:
            # Get the most recent analysis date
            latest = self.client.table("thumbnail_intel") \
                .select("analysis_date") \
                .order("analysis_date", desc=True) \
                .limit(1) \
                .execute()
            
            if not latest.data:
                return []
            
            latest_date = latest.data[0]["analysis_date"]
            
            # Get all insights for that date
            result = self.client.table("thumbnail_intel") \
                .select("*") \
                .eq("analysis_date", latest_date) \
                .execute()
            
            return [self._record_to_insight(r) for r in result.data]
            
        except Exception as e:
            logger.error(f"Failed to get latest insights: {e}")
            return []
    
    async def get_category_insight(
        self,
        category_key: str,
        analysis_date: Optional[str] = None,
    ) -> Optional[CategoryThumbnailInsight]:
        """
        Get thumbnail insight for a specific category.
        
        Args:
            category_key: Category identifier
            analysis_date: Optional date (defaults to latest)
            
        Returns:
            CategoryThumbnailInsight or None
        """
        try:
            query = self.client.table("thumbnail_intel") \
                .select("*") \
                .eq("category_key", category_key)
            
            if analysis_date:
                query = query.eq("analysis_date", analysis_date)
            else:
                query = query.order("analysis_date", desc=True).limit(1)
            
            result = query.execute()
            
            if result.data:
                return self._record_to_insight(result.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Failed to get category insight: {e}")
            return None
    
    async def get_insights_history(
        self,
        category_key: str,
        days: int = 7,
    ) -> List[CategoryThumbnailInsight]:
        """
        Get historical insights for a category.
        
        Args:
            category_key: Category identifier
            days: Number of days of history
            
        Returns:
            List of CategoryThumbnailInsight ordered by date desc
        """
        try:
            result = self.client.table("thumbnail_intel") \
                .select("*") \
                .eq("category_key", category_key) \
                .order("analysis_date", desc=True) \
                .limit(days) \
                .execute()
            
            return [self._record_to_insight(r) for r in result.data]
            
        except Exception as e:
            logger.error(f"Failed to get insights history: {e}")
            return []
    
    def _record_to_insight(self, record: Dict[str, Any]) -> CategoryThumbnailInsight:
        """Convert database record to CategoryThumbnailInsight."""
        thumbnails = [
            ThumbnailAnalysis(
                video_id=t["video_id"],
                title=t["title"],
                thumbnail_url=t["thumbnail_url"],
                view_count=t["view_count"],
                layout_type=t["layout_type"],
                text_placement=t["text_placement"],
                focal_point=t["focal_point"],
                dominant_colors=t["dominant_colors"],
                color_mood=t["color_mood"],
                background_style=t["background_style"],
                has_face=t["has_face"],
                has_text=t["has_text"],
                has_border=t["has_border"],
                has_glow_effects=t["has_glow_effects"],
                has_arrows_circles=t["has_arrows_circles"],
                layout_recipe=t["layout_recipe"],
                color_recipe=t["color_recipe"],
                why_it_works=t["why_it_works"],
                difficulty=t["difficulty"],
                text_content=t.get("text_content"),
                face_expression=t.get("face_expression"),
                face_position=t.get("face_position"),
                face_size=t.get("face_size"),
                face_looking_direction=t.get("face_looking_direction"),
            )
            for t in record.get("thumbnails", [])
        ]
        
        return CategoryThumbnailInsight(
            category_key=record["category_key"],
            category_name=record["category_name"],
            analysis_date=record["analysis_date"],
            thumbnails=thumbnails,
            common_layout=record.get("common_layout", ""),
            common_colors=record.get("common_colors", []),
            common_elements=record.get("common_elements", []),
            ideal_layout=record.get("ideal_layout", ""),
            ideal_color_palette=record.get("ideal_color_palette", []),
            must_have_elements=record.get("must_have_elements", []),
            avoid_elements=record.get("avoid_elements", []),
            category_style_summary=record.get("category_style_summary", ""),
            pro_tips=record.get("pro_tips", []),
        )


# Singleton instance
_repository: Optional[ThumbnailIntelRepository] = None


def get_thumbnail_repository() -> ThumbnailIntelRepository:
    """Get or create the repository singleton."""
    global _repository
    if _repository is None:
        _repository = ThumbnailIntelRepository()
    return _repository
