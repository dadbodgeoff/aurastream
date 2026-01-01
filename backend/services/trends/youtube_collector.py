"""
YouTube Data API v3 Collector Service.

Fetches trending videos, video statistics, and search results from YouTube.
Transforms API responses to match AuraStream Pydantic schemas.

API Endpoints Used:
- GET /videos?chart=mostPopular - Trending videos
- GET /videos?id={ids} - Video details/stats
- GET /search?q={query} - Video search

Rate Limits:
- 10,000 units/day quota
- Trending: 1 unit per call
- Video details: 1 unit per call
- Search: 100 units per call

Environment Variables:
- GOOGLE_API_KEY: YouTube Data API v3 key (required)

Example Usage:
    collector = YouTubeCollector()
    
    # Fetch trending gaming videos
    videos = await collector.fetch_trending(category="gaming", max_results=20)
    
    # Get detailed stats for specific videos
    stats = await collector.fetch_video_stats(["dQw4w9WgXcQ", "jNQXAC9IVRw"])
    
    # Search for videos
    results = await collector.search_videos("minecraft tutorial", category="gaming")
"""

import logging
import os
from datetime import datetime
from typing import Optional, List, Literal
import re

import httpx

from pydantic import BaseModel


# ============================================================================
# Logger Setup
# ============================================================================

logger = logging.getLogger(__name__)


# ============================================================================
# Constants
# ============================================================================

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"

# YouTube category IDs mapping
CATEGORY_IDS = {
    "gaming": "20",
    "entertainment": "24",
    "music": "10",
    "education": "27",
}

# Valid category type
TrendCategory = Literal["gaming", "entertainment", "music", "education"]


# ============================================================================
# Response Models (matching trends.py schemas)
# ============================================================================

class YouTubeVideoResponse(BaseModel):
    """Response schema for a YouTube video."""
    video_id: str
    title: str
    thumbnail: str
    channel_id: Optional[str] = None
    channel_title: str
    category: Optional[str] = None
    published_at: Optional[datetime] = None
    view_count: int = 0
    like_count: int = 0
    comment_count: int = 0
    engagement_rate: Optional[float] = None
    viral_score: Optional[int] = None
    velocity: Optional[Literal["rising", "stable", "falling"]] = None
    insight: Optional[str] = None
    duration_seconds: Optional[int] = None
    is_live: bool = False
    is_short: bool = False
    tags: List[str] = []
    # New fields
    description: Optional[str] = None
    default_audio_language: Optional[str] = None
    has_captions: bool = False
    topic_categories: List[str] = []
    is_licensed: bool = False
    is_made_for_kids: bool = False
    subscriber_count: Optional[int] = None


# ============================================================================
# Exceptions
# ============================================================================

class YouTubeAPIError(Exception):
    """Base exception for YouTube API errors."""
    pass


class YouTubeQuotaExceededError(YouTubeAPIError):
    """Raised when YouTube API quota is exceeded."""
    pass


class YouTubeAuthenticationError(YouTubeAPIError):
    """Raised when API key is invalid or missing."""
    pass


class YouTubeNotFoundError(YouTubeAPIError):
    """Raised when requested resource is not found."""
    pass


# ============================================================================
# YouTube Collector Service
# ============================================================================

class YouTubeCollector:
    """
    YouTube Data API v3 collector for trending content.
    
    Fetches trending videos, video statistics, and search results
    from YouTube and transforms them to AuraStream schema format.
    
    Attributes:
        api_key: YouTube Data API v3 key
        client: httpx.AsyncClient for making requests
        timeout: Request timeout in seconds
    
    Example:
        collector = YouTubeCollector()
        
        # Fetch trending gaming videos
        videos = await collector.fetch_trending("gaming", max_results=20)
        
        # Get stats for specific videos
        stats = await collector.fetch_video_stats(["video_id_1", "video_id_2"])
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        timeout: float = 30.0,
    ):
        """
        Initialize the YouTube collector.
        
        Args:
            api_key: YouTube Data API v3 key. If not provided, reads from
                     YOUTUBE_DATA_API_KEY or GOOGLE_API_KEY environment variable.
            timeout: Request timeout in seconds (default: 30.0)
        
        Raises:
            YouTubeAuthenticationError: If no API key is provided or found
        """
        # Prefer dedicated YouTube key, fall back to general Google key
        self.api_key = api_key or os.getenv("YOUTUBE_DATA_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise YouTubeAuthenticationError(
                "YouTube API key not provided. Set YOUTUBE_DATA_API_KEY or GOOGLE_API_KEY environment variable."
            )
        
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
    
    @property
    def client(self) -> httpx.AsyncClient:
        """Lazy-load httpx async client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout),
                headers={
                    "Accept": "application/json",
                    "User-Agent": "AuraStream/1.0",
                },
            )
        return self._client
    
    async def close(self):
        """Close the HTTP client."""
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None
    
    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    # ========================================================================
    # API Methods
    # ========================================================================
    
    async def fetch_trending(
        self,
        category: TrendCategory,
        region: str = "US",
        max_results: int = 50,
    ) -> List[YouTubeVideoResponse]:
        """
        Fetch trending videos for a category using the mostPopular chart.
        
        Uses the YouTube videos.list endpoint with chart=mostPopular which costs
        only 1 quota unit (vs 100 for search.list).
        
        Args:
            category: Video category ("gaming", "entertainment", "music", "education")
            region: ISO 3166-1 alpha-2 country code (default: "US")
            max_results: Maximum number of videos to return (1-50, default: 50)
        
        Returns:
            List of YouTubeVideoResponse objects sorted by trending rank
        
        Raises:
            YouTubeAPIError: If API request fails
            YouTubeQuotaExceededError: If daily quota is exceeded
            YouTubeAuthenticationError: If API key is invalid
        
        Example:
            videos = await collector.fetch_trending("gaming", region="US", max_results=20)
            for video in videos:
                print(f"{video.title}: {video.view_count} views")
        
        Quota Cost: 1 unit (videos.list with chart=mostPopular)
        """
        category_id = CATEGORY_IDS.get(category)
        if not category_id:
            logger.warning(f"Unknown category '{category}', defaulting to entertainment")
            category_id = CATEGORY_IDS["entertainment"]
        
        # Clamp max_results to valid range
        max_results = max(1, min(50, max_results))
        
        # Use videos.list with chart=mostPopular - costs only 1 quota unit!
        params = {
            "part": "snippet,statistics,contentDetails,topicDetails,status",
            "chart": "mostPopular",
            "videoCategoryId": category_id,
            "regionCode": region,
            "maxResults": max_results,
            "key": self.api_key,
        }
        
        logger.info(f"Fetching trending videos (1 quota unit): category={category}, region={region}, max={max_results}")
        
        try:
            response = await self.client.get(
                f"{YOUTUBE_API_BASE}/videos",
                params=params,
            )
            
            self._handle_error_response(response)
            
            data = response.json()
            
            # Transform directly - no need for second API call since we requested all parts
            videos = self._transform_videos_response(data, category=category)
            
            if not videos:
                logger.info(f"No trending videos found for category: {category}")
                return []
            
            logger.info(f"Fetched {len(videos)} trending videos for {category} (1 quota unit)")
            return videos
            
        except httpx.TimeoutException as e:
            logger.error(f"YouTube API timeout: {e}")
            raise YouTubeAPIError(f"Request timed out: {e}") from e
        except httpx.RequestError as e:
            logger.error(f"YouTube API request error: {e}")
            raise YouTubeAPIError(f"Request failed: {e}") from e
    
    async def fetch_video_stats(
        self,
        video_ids: List[str],
    ) -> List[YouTubeVideoResponse]:
        """
        Get detailed statistics for specific videos.
        
        Fetches snippet and statistics for up to 50 videos at once.
        Videos are batched automatically if more than 50 IDs are provided.
        
        Args:
            video_ids: List of YouTube video IDs to fetch stats for
        
        Returns:
            List of YouTubeVideoResponse objects with video data and statistics.
            Videos that don't exist or are private will be omitted.
        
        Raises:
            YouTubeAPIError: If API request fails
            YouTubeQuotaExceededError: If daily quota is exceeded
        
        Example:
            stats = await collector.fetch_video_stats(["dQw4w9WgXcQ", "jNQXAC9IVRw"])
            for video in stats:
                print(f"{video.title}: {video.view_count} views, {video.like_count} likes")
        """
        if not video_ids:
            return []
        
        # Remove duplicates while preserving order
        unique_ids = list(dict.fromkeys(video_ids))
        
        all_videos: List[YouTubeVideoResponse] = []
        
        # Process in batches of 50 (YouTube API limit)
        for i in range(0, len(unique_ids), 50):
            batch_ids = unique_ids[i:i + 50]
            
            params = {
                "part": "snippet,statistics,contentDetails,topicDetails,status",
                "id": ",".join(batch_ids),
                "key": self.api_key,
            }
            
            logger.info(f"Fetching stats for {len(batch_ids)} videos (batch {i // 50 + 1})")
            
            try:
                response = await self.client.get(
                    f"{YOUTUBE_API_BASE}/videos",
                    params=params,
                )
                
                self._handle_error_response(response)
                
                data = response.json()
                videos = self._transform_videos_response(data)
                all_videos.extend(videos)
                
            except httpx.TimeoutException as e:
                logger.error(f"YouTube API timeout fetching video stats: {e}")
                raise YouTubeAPIError(f"Request timed out: {e}") from e
            except httpx.RequestError as e:
                logger.error(f"YouTube API request error fetching video stats: {e}")
                raise YouTubeAPIError(f"Request failed: {e}") from e
        
        logger.info(f"Fetched stats for {len(all_videos)} videos")
        return all_videos
    
    async def search_videos(
        self,
        query: str,
        category: Optional[TrendCategory] = None,
        max_results: int = 20,
        order: str = "date",
        published_after: Optional[datetime] = None,
    ) -> List[YouTubeVideoResponse]:
        """
        Search for videos matching a query.
        
        Uses the YouTube search.list endpoint to find videos.
        Note: Search costs 100 quota units per call.
        
        Args:
            query: Search query string
            category: Optional category filter ("gaming", "entertainment", "music", "education")
            max_results: Maximum number of results (1-50, default: 20)
            order: Sort order - "date" (newest), "viewCount", "relevance", "rating" (default: "date")
            published_after: Only return videos published after this datetime (default: 7 days ago)
        
        Returns:
            List of YouTubeVideoResponse objects matching the search query.
            Note: Search results have limited statistics; use fetch_video_stats
            for complete data.
        
        Raises:
            YouTubeAPIError: If API request fails
            YouTubeQuotaExceededError: If daily quota is exceeded
        
        Example:
            results = await collector.search_videos("minecraft tutorial", category="gaming")
            
            # Get full stats for search results
            video_ids = [v.video_id for v in results]
            full_stats = await collector.fetch_video_stats(video_ids)
        """
        from datetime import timedelta
        
        if not query or not query.strip():
            logger.warning("Empty search query provided")
            return []
        
        # Clamp max_results to valid range
        max_results = max(1, min(50, max_results))
        
        # Default to videos from last 7 days for better coverage
        # (was 24 hours, but many successful videos take 2-7 days to peak)
        if published_after is None:
            published_after = datetime.utcnow() - timedelta(days=7)
        
        params = {
            "part": "snippet",
            "q": query.strip(),
            "type": "video",
            "maxResults": max_results,
            "order": order,  # "date" for newest first
            "publishedAfter": published_after.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "key": self.api_key,
        }
        
        # Add category filter if specified
        if category and category in CATEGORY_IDS:
            params["videoCategoryId"] = CATEGORY_IDS[category]
        
        logger.info(f"Searching videos: query='{query}', category={category}, order={order}, max={max_results}, after={published_after}")
        
        try:
            response = await self.client.get(
                f"{YOUTUBE_API_BASE}/search",
                params=params,
            )
            
            self._handle_error_response(response)
            
            data = response.json()
            
            # Search results have different structure - extract video IDs
            video_ids = []
            for item in data.get("items", []):
                video_id = item.get("id", {}).get("videoId")
                if video_id:
                    video_ids.append(video_id)
            
            if not video_ids:
                logger.info(f"No videos found for query: {query}")
                return []
            
            # Fetch full video details with statistics
            videos = await self.fetch_video_stats(video_ids)
            
            # Add category to results if specified
            if category:
                for video in videos:
                    video.category = category
            
            logger.info(f"Found {len(videos)} videos for query: {query}")
            return videos
            
        except httpx.TimeoutException as e:
            logger.error(f"YouTube API timeout during search: {e}")
            raise YouTubeAPIError(f"Request timed out: {e}") from e
        except httpx.RequestError as e:
            logger.error(f"YouTube API request error during search: {e}")
            raise YouTubeAPIError(f"Request failed: {e}") from e
    
    # ========================================================================
    # Helper Methods
    # ========================================================================
    
    def _handle_error_response(self, response: httpx.Response) -> None:
        """
        Handle YouTube API error responses.
        
        Args:
            response: httpx Response object
        
        Raises:
            YouTubeQuotaExceededError: If quota is exceeded (403)
            YouTubeAuthenticationError: If API key is invalid (401)
            YouTubeNotFoundError: If resource not found (404)
            YouTubeAPIError: For other error status codes
        """
        if response.status_code == 200:
            return
        
        try:
            error_data = response.json()
            error_info = error_data.get("error", {})
            error_message = error_info.get("message", "Unknown error")
            error_reason = ""
            
            errors = error_info.get("errors", [])
            if errors:
                error_reason = errors[0].get("reason", "")
        except Exception:
            error_message = response.text or f"HTTP {response.status_code}"
            error_reason = ""
        
        logger.error(f"YouTube API error: {response.status_code} - {error_message} ({error_reason})")
        
        if response.status_code == 403:
            if error_reason == "quotaExceeded":
                raise YouTubeQuotaExceededError(
                    "YouTube API daily quota exceeded. Try again tomorrow."
                )
            raise YouTubeAPIError(f"Forbidden: {error_message}")
        
        if response.status_code == 401:
            raise YouTubeAuthenticationError(
                f"Invalid API key: {error_message}"
            )
        
        if response.status_code == 404:
            raise YouTubeNotFoundError(f"Resource not found: {error_message}")
        
        raise YouTubeAPIError(f"API error ({response.status_code}): {error_message}")
    
    def _transform_videos_response(
        self,
        data: dict,
        category: Optional[str] = None,
    ) -> List[YouTubeVideoResponse]:
        """
        Transform YouTube API response to YouTubeVideoResponse objects.
        
        Args:
            data: Raw JSON response from YouTube API
            category: Optional category to assign to videos
        
        Returns:
            List of YouTubeVideoResponse objects
        """
        videos: List[YouTubeVideoResponse] = []
        
        for item in data.get("items", []):
            try:
                video = self._transform_video_item(item, category)
                if video:
                    videos.append(video)
            except Exception as e:
                logger.warning(f"Failed to transform video item: {e}")
                continue
        
        return videos
    
    def _transform_video_item(
        self,
        item: dict,
        category: Optional[str] = None,
    ) -> Optional[YouTubeVideoResponse]:
        """
        Transform a single video item from YouTube API response.
        
        Args:
            item: Single video item from API response
            category: Optional category to assign
        
        Returns:
            YouTubeVideoResponse or None if transformation fails
        """
        video_id = item.get("id")
        if isinstance(video_id, dict):
            # Search results have nested ID
            video_id = video_id.get("videoId")
        
        if not video_id:
            return None
        
        snippet = item.get("snippet", {})
        statistics = item.get("statistics", {})
        content_details = item.get("contentDetails", {})
        topic_details = item.get("topicDetails", {})
        status = item.get("status", {})
        
        # Get best available thumbnail
        thumbnails = snippet.get("thumbnails", {})
        thumbnail_url = (
            thumbnails.get("maxres", {}).get("url") or
            thumbnails.get("high", {}).get("url") or
            thumbnails.get("medium", {}).get("url") or
            thumbnails.get("default", {}).get("url") or
            ""
        )
        
        # Parse published date
        published_at = None
        published_str = snippet.get("publishedAt")
        if published_str:
            try:
                published_at = datetime.fromisoformat(
                    published_str.replace("Z", "+00:00")
                )
            except ValueError:
                pass
        
        # Parse statistics (may be missing for some videos)
        view_count = self._safe_int(statistics.get("viewCount", 0))
        like_count = self._safe_int(statistics.get("likeCount", 0))
        comment_count = self._safe_int(statistics.get("commentCount", 0))
        
        # Calculate engagement rate
        engagement_rate = None
        if view_count > 0:
            engagement_rate = round(
                ((like_count + comment_count) / view_count) * 100,
                2
            )
        
        # Parse duration (ISO 8601 format: PT1H2M3S)
        duration_seconds = self._parse_duration(content_details.get("duration", ""))
        
        # Check if live broadcast
        live_content = snippet.get("liveBroadcastContent", "none")
        is_live = live_content in ("live", "upcoming")
        
        # Check if it's a Short (under 60 seconds and vertical)
        is_short = duration_seconds is not None and duration_seconds <= 60
        
        # Get tags (keywords)
        tags = snippet.get("tags", [])[:10]  # Limit to 10 tags
        
        # Get description (truncate to 500 chars for efficiency)
        description = snippet.get("description", "")
        if description and len(description) > 500:
            description = description[:500] + "..."
        
        # Get default audio language
        default_audio_language = snippet.get("defaultAudioLanguage")
        
        # Check for captions
        has_captions = content_details.get("caption", "false") == "true"
        
        # Get topic categories (Wikipedia URLs -> extract topic names)
        topic_categories_raw = topic_details.get("topicCategories", [])
        topic_categories = []
        for url in topic_categories_raw[:5]:  # Limit to 5
            # Extract topic name from Wikipedia URL
            # e.g., "https://en.wikipedia.org/wiki/Video_game" -> "Video game"
            if "/wiki/" in url:
                topic = url.split("/wiki/")[-1].replace("_", " ")
                topic_categories.append(topic)
        
        # Get license and made for kids status
        is_licensed = status.get("license") == "creativeCommon"
        is_made_for_kids = status.get("madeForKids", False)
        
        return YouTubeVideoResponse(
            video_id=video_id,
            title=snippet.get("title", ""),
            thumbnail=thumbnail_url,
            channel_id=snippet.get("channelId"),
            channel_title=snippet.get("channelTitle", ""),
            category=category,
            published_at=published_at,
            view_count=view_count,
            like_count=like_count,
            comment_count=comment_count,
            engagement_rate=engagement_rate,
            viral_score=None,  # Calculated by viral_score service
            velocity=None,     # Calculated by velocity_calculator service
            insight=None,      # Generated by AI analysis
            duration_seconds=duration_seconds,
            is_live=is_live,
            is_short=is_short,
            tags=tags,
            description=description,
            default_audio_language=default_audio_language,
            has_captions=has_captions,
            topic_categories=topic_categories,
            is_licensed=is_licensed,
            is_made_for_kids=is_made_for_kids,
            subscriber_count=None,  # Requires separate channel API call
        )
    
    def _parse_duration(self, duration_str: str) -> Optional[int]:
        """
        Parse ISO 8601 duration string to seconds.
        
        Args:
            duration_str: Duration string like "PT1H2M3S" or "PT5M30S"
            
        Returns:
            Duration in seconds, or None if parsing fails
        """
        if not duration_str:
            return None
        
        # Match ISO 8601 duration format
        match = re.match(
            r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?',
            duration_str
        )
        
        if not match:
            return None
        
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        
        return hours * 3600 + minutes * 60 + seconds
    
    def _safe_int(self, value) -> int:
        """Safely convert value to int, returning 0 on failure."""
        try:
            return int(value)
        except (TypeError, ValueError):
            return 0


# ============================================================================
# Factory Functions
# ============================================================================

# Singleton instance
_youtube_collector: Optional[YouTubeCollector] = None


def get_youtube_collector() -> YouTubeCollector:
    """
    Get or create the YouTube collector singleton.
    
    Returns:
        YouTubeCollector instance
    
    Raises:
        YouTubeAuthenticationError: If GOOGLE_API_KEY is not set
    """
    global _youtube_collector
    if _youtube_collector is None:
        _youtube_collector = YouTubeCollector()
    return _youtube_collector


def create_youtube_collector(
    api_key: Optional[str] = None,
    timeout: float = 30.0,
) -> YouTubeCollector:
    """
    Create a new YouTubeCollector instance with custom configuration.
    
    Useful for testing with mock API keys or custom timeouts.
    
    Args:
        api_key: YouTube Data API v3 key (uses env var if not provided)
        timeout: Request timeout in seconds
    
    Returns:
        New YouTubeCollector instance
    """
    return YouTubeCollector(api_key=api_key, timeout=timeout)


__all__ = [
    "YouTubeCollector",
    "YouTubeVideoResponse",
    "YouTubeAPIError",
    "YouTubeQuotaExceededError",
    "YouTubeAuthenticationError",
    "YouTubeNotFoundError",
    "get_youtube_collector",
    "create_youtube_collector",
    "CATEGORY_IDS",
    "TrendCategory",
]
