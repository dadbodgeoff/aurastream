"""
Thumbnail Collector

Fetches top-performing YouTube videos for gaming categories
and extracts thumbnail URLs for analysis.

Uses game-specific searches to guarantee coverage for all tracked games.
Filters: English-only, long-form content (no Shorts).
"""

import logging
import asyncio
import httpx
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from backend.services.thumbnail_intel.constants import (
    GAMING_CATEGORIES,
    THUMBNAILS_PER_CATEGORY,
    MIN_VIEW_COUNT,
)
from backend.services.trends import get_youtube_collector

logger = logging.getLogger(__name__)


def _is_english_text(text: str) -> bool:
    """Check if text is primarily English."""
    if not text:
        return False
    
    total_chars = len(text.replace(" ", ""))
    if total_chars == 0:
        return False
    
    # Check for high ratio of non-ASCII characters
    non_ascii = sum(1 for c in text if not c.isascii())
    if non_ascii / total_chars > 0.2:
        return False
    
    # Check for common non-English patterns
    text_lower = text.lower()
    non_english_patterns = [
        " la ", " el ", " los ", " las ", " un ", " una ", " del ", " de la ",
        " que ", " con ", " por ", " para ", " como ", " más ", " muy ",
        "última", "último", " o ", " os ", " as ", " um ", " do ", " da ",
        " muito ", "quem ", "entendeu", " le ", " les ", " du ", " avec ",
        " pour ", " très ", " der ", " die ", " das ", " ein ", " eine ",
        " und ", " mit ", " für ", " wie ", " ist ", " sind ",
    ]
    
    for pattern in non_english_patterns:
        if pattern in text_lower:
            return False
    
    return True


@dataclass
class ThumbnailData:
    """Data structure for a collected thumbnail."""
    video_id: str
    title: str
    thumbnail_url: str
    thumbnail_url_hq: str
    channel_title: str
    view_count: int
    like_count: int
    published_at: Optional[datetime]
    category_key: str
    category_name: str
    tags: List[str]


class ThumbnailCollector:
    """
    Collects top-performing thumbnails from YouTube for gaming categories.
    
    Uses game-specific searches to guarantee coverage for all tracked games.
    Each category gets its own search query for reliable results.
    """
    
    def __init__(self):
        self._youtube = None
    
    @property
    def youtube(self):
        """Lazy-load YouTube collector."""
        if self._youtube is None:
            self._youtube = get_youtube_collector()
        return self._youtube
    
    async def collect_all_categories(self) -> Dict[str, List[ThumbnailData]]:
        """
        Collect top thumbnails for all gaming categories.
        
        Uses search queries for each category to guarantee coverage.
        
        Returns:
            Dict mapping category_key to list of ThumbnailData
        """
        results: Dict[str, List[ThumbnailData]] = {}
        
        for category_key, category_config in GAMING_CATEGORIES.items():
            try:
                thumbnails = await self._collect_category_with_search(category_key, category_config)
                results[category_key] = thumbnails
                logger.info(f"Collected {len(thumbnails)} thumbnails for {category_key}")
            except Exception as e:
                logger.error(f"Failed to collect thumbnails for {category_key}: {e}")
                results[category_key] = []
            
            # Small delay between categories to avoid rate limits
            await asyncio.sleep(0.5)
        
        return results
    
    async def _collect_category_with_search(
        self,
        category_key: str,
        category_config: Dict[str, Any],
    ) -> List[ThumbnailData]:
        """
        Collect thumbnails for a category using search.
        
        Uses the first search query for the category to get relevant videos.
        Filters out Shorts (< 60 seconds) since thumbnails don't matter for those.
        """
        all_videos: List[ThumbnailData] = []
        seen_video_ids = set()
        
        # Use the first search query for this category
        search_queries = category_config.get("search_queries", [])
        if not search_queries:
            logger.warning(f"No search queries for {category_key}")
            return []
        
        # Use first query - most specific
        query = search_queries[0]
        
        try:
            logger.info(f"Searching for {category_key}: '{query}'")
            videos = await self.youtube.search_videos(
                query=query,
                category="gaming",
                max_results=20,  # Fetch more to account for Shorts filtering
                order="viewCount",  # Get highest view count videos
            )
            
            for video in videos:
                if video.video_id in seen_video_ids:
                    continue
                
                if video.view_count < MIN_VIEW_COUNT:
                    continue
                
                # Skip Shorts - thumbnails don't matter for short-form content
                # Shorts are typically under 60 seconds
                if video.is_short or (video.duration_seconds and video.duration_seconds < 60):
                    logger.debug(f"Skipping Short: {video.title} ({video.duration_seconds}s)")
                    continue
                
                # Skip non-English content
                if not _is_english_text(video.title):
                    logger.debug(f"Skipping non-English: {video.title}")
                    continue
                
                seen_video_ids.add(video.video_id)
                thumbnail_hq = self._get_hq_thumbnail_url(video.video_id)
                
                all_videos.append(ThumbnailData(
                    video_id=video.video_id,
                    title=video.title,
                    thumbnail_url=video.thumbnail,
                    thumbnail_url_hq=thumbnail_hq,
                    channel_title=video.channel_title,
                    view_count=video.view_count,
                    like_count=video.like_count,
                    published_at=video.published_at,
                    category_key=category_key,
                    category_name=category_config["name"],
                    tags=video.tags[:10] if video.tags else [],
                ))
                
        except Exception as e:
            logger.warning(f"Search failed for {category_key}: {e}")
        
        # Sort by view count and take top N
        all_videos.sort(key=lambda x: x.view_count, reverse=True)
        return all_videos[:THUMBNAILS_PER_CATEGORY]
    
    async def collect_category(
        self,
        category_key: str,
        category_config: Dict[str, Any],
    ) -> List[ThumbnailData]:
        """
        Collect thumbnails for a single category.
        """
        return await self._collect_category_with_search(category_key, category_config)
    
    def _get_hq_thumbnail_url(self, video_id: str) -> str:
        """
        Get the highest quality thumbnail URL for a video.
        
        YouTube thumbnail URL patterns:
        - maxresdefault.jpg (1280x720) - may not exist
        - sddefault.jpg (640x480)
        - hqdefault.jpg (480x360)
        - mqdefault.jpg (320x180)
        - default.jpg (120x90)
        """
        # Use maxresdefault for best quality
        return f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
    
    async def download_thumbnail(self, url: str) -> Optional[bytes]:
        """
        Download thumbnail image bytes.
        
        Args:
            url: Thumbnail URL
            
        Returns:
            Image bytes or None if download fails
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url)
                
                if response.status_code == 200:
                    return response.content
                
                # Try fallback to hqdefault if maxres doesn't exist
                if "maxresdefault" in url:
                    fallback_url = url.replace("maxresdefault", "hqdefault")
                    response = await client.get(fallback_url)
                    if response.status_code == 200:
                        return response.content
                
                logger.warning(f"Failed to download thumbnail: {url} (status {response.status_code})")
                return None
                
        except Exception as e:
            logger.error(f"Error downloading thumbnail {url}: {e}")
            return None


# Singleton instance
_collector: Optional[ThumbnailCollector] = None


def get_thumbnail_collector() -> ThumbnailCollector:
    """Get or create the thumbnail collector singleton."""
    global _collector
    if _collector is None:
        _collector = ThumbnailCollector()
    return _collector
    
    def _get_hq_thumbnail_url(self, video_id: str) -> str:
        """
        Get the highest quality thumbnail URL for a video.
        
        YouTube thumbnail URL patterns:
        - maxresdefault.jpg (1280x720) - may not exist
        - sddefault.jpg (640x480)
        - hqdefault.jpg (480x360)
        - mqdefault.jpg (320x180)
        - default.jpg (120x90)
        """
        # Use maxresdefault for best quality
        return f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
    
    async def download_thumbnail(self, url: str) -> Optional[bytes]:
        """
        Download thumbnail image bytes.
        
        Args:
            url: Thumbnail URL
            
        Returns:
            Image bytes or None if download fails
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url)
                
                if response.status_code == 200:
                    return response.content
                
                # Try fallback to hqdefault if maxres doesn't exist
                if "maxresdefault" in url:
                    fallback_url = url.replace("maxresdefault", "hqdefault")
                    response = await client.get(fallback_url)
                    if response.status_code == 200:
                        return response.content
                
                logger.warning(f"Failed to download thumbnail: {url} (status {response.status_code})")
                return None
                
        except Exception as e:
            logger.error(f"Error downloading thumbnail {url}: {e}")
            return None


# Singleton instance
_collector: Optional[ThumbnailCollector] = None


def get_thumbnail_collector() -> ThumbnailCollector:
    """Get or create the thumbnail collector singleton."""
    global _collector
    if _collector is None:
        _collector = ThumbnailCollector()
    return _collector
