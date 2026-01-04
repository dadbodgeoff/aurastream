"""
Creator Intel V2 - Base Analyzer

Abstract base class for all analyzers in the Creator Intel system.
Provides common functionality for caching, error handling, and metrics.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Dict, Generic, Optional, TypeVar
import hashlib
import json
import logging
import os

import redis.asyncio as redis

from backend.services.intel.core.exceptions import IntelDataError, IntelAnalysisError

logger = logging.getLogger(__name__)

# Type variable for analysis result
T = TypeVar("T")


@dataclass
class AnalysisResult(Generic[T]):
    """
    Container for analysis results with metadata.
    
    Attributes:
        data: The actual analysis data
        category_key: The category that was analyzed
        analyzer_name: Name of the analyzer that produced this result
        confidence: Confidence score (0-100)
        video_count: Number of videos analyzed
        analyzed_at: When the analysis was performed
        cache_key: Redis cache key for this result
        content_hash: Hash of input data for change detection
    """
    data: T
    category_key: str
    analyzer_name: str
    confidence: int
    video_count: int
    analyzed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    cache_key: Optional[str] = None
    content_hash: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = {
            "data": self.data if isinstance(self.data, dict) else asdict(self.data) if hasattr(self.data, "__dataclass_fields__") else self.data,
            "category_key": self.category_key,
            "analyzer_name": self.analyzer_name,
            "confidence": self.confidence,
            "video_count": self.video_count,
            "analyzed_at": self.analyzed_at.isoformat(),
        }
        if self.cache_key:
            result["cache_key"] = self.cache_key
        if self.content_hash:
            result["content_hash"] = self.content_hash
        return result


class BaseAnalyzer(ABC):
    """
    Abstract base class for all Creator Intel analyzers.
    
    Provides:
    - Redis connection management
    - Caching with TTL
    - Content hashing for change detection
    - Structured logging
    - Error handling patterns
    
    Subclasses must implement:
    - analyze(): Perform the actual analysis
    - get_cache_key(): Generate cache key for results
    - analyzer_name: Property returning the analyzer name
    """
    
    # Default cache TTL (72 hours - stale data better than no data)
    DEFAULT_CACHE_TTL: int = 72 * 60 * 60
    
    # Minimum videos required for analysis
    MIN_VIDEOS_REQUIRED: int = 10
    
    def __init__(self, cache_ttl: Optional[int] = None) -> None:
        """
        Initialize the analyzer.
        
        Args:
            cache_ttl: Cache TTL in seconds (default: 5 hours)
        """
        self._redis: Optional[redis.Redis] = None
        self._cache_ttl = cache_ttl or self.DEFAULT_CACHE_TTL
    
    @property
    @abstractmethod
    def analyzer_name(self) -> str:
        """Return the unique name of this analyzer."""
        pass
    
    @abstractmethod
    async def analyze(self, category_key: str) -> Optional[AnalysisResult]:
        """
        Perform analysis for a category.
        
        Args:
            category_key: The category to analyze (e.g., "fortnite")
            
        Returns:
            AnalysisResult containing the analysis data, or None if insufficient data
            
        Raises:
            IntelDataError: If data cannot be loaded
            IntelAnalysisError: If analysis fails
        """
        pass
    
    @abstractmethod
    def get_cache_key(self, category_key: str) -> str:
        """
        Generate the Redis cache key for this analysis.
        
        Args:
            category_key: The category being analyzed
            
        Returns:
            Redis key string (e.g., "intel:format:precomputed:fortnite")
        """
        pass
    
    async def get_redis(self) -> redis.Redis:
        """
        Get or create Redis connection.
        
        Returns:
            Async Redis client
        """
        if self._redis is None:
            redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
            self._redis = redis.from_url(redis_url, decode_responses=True)
        return self._redis
    
    async def load_youtube_data(self, category_key: str) -> Optional[Dict[str, Any]]:
        """
        Load YouTube video data from Redis cache.
        
        Args:
            category_key: The category to load data for
            
        Returns:
            Dictionary with videos and metadata, or None if not found
            
        Raises:
            IntelDataError: If data is corrupted
        """
        redis_client = await self.get_redis()
        youtube_key = f"youtube:games:{category_key}"
        
        try:
            raw_data = await redis_client.get(youtube_key)
            if not raw_data:
                logger.debug(f"No YouTube data found for {category_key}")
                return None
            
            data = json.loads(raw_data)
            return data
            
        except json.JSONDecodeError as e:
            raise IntelDataError(
                message=f"Corrupted YouTube data for {category_key}",
                category_key=category_key,
                data_source="redis",
                details={"error": str(e)},
            )
    
    async def load_twitch_data(
        self,
        game_id: str,
        data_type: str = "streams",
    ) -> Optional[Dict[str, Any]]:
        """
        Load Twitch data from Redis cache.
        
        Args:
            game_id: Twitch game ID
            data_type: Type of data ("streams", "vods", "channels")
            
        Returns:
            Dictionary with data and metadata, or None if not found
        """
        redis_client = await self.get_redis()
        twitch_key = f"twitch:{data_type}:{game_id}"
        
        try:
            raw_data = await redis_client.get(twitch_key)
            if not raw_data:
                return None
            
            return json.loads(raw_data)
            
        except json.JSONDecodeError as e:
            logger.warning(f"Corrupted Twitch data for {game_id}: {e}")
            return None
    
    async def get_cached_result(self, category_key: str) -> Optional[Dict[str, Any]]:
        """
        Get cached analysis result if available.
        
        Args:
            category_key: The category to check
            
        Returns:
            Cached result dictionary, or None if not cached
        """
        redis_client = await self.get_redis()
        cache_key = self.get_cache_key(category_key)
        
        try:
            raw_data = await redis_client.get(cache_key)
            if raw_data:
                return json.loads(raw_data)
            return None
        except json.JSONDecodeError:
            return None
    
    async def cache_result(
        self,
        category_key: str,
        result: AnalysisResult,
        ttl: Optional[int] = None,
    ) -> None:
        """
        Cache analysis result to Redis.
        
        Args:
            category_key: The category that was analyzed
            result: The analysis result to cache
            ttl: Optional TTL override in seconds
        """
        redis_client = await self.get_redis()
        cache_key = self.get_cache_key(category_key)
        
        result.cache_key = cache_key
        
        await redis_client.setex(
            cache_key,
            ttl or self._cache_ttl,
            json.dumps(result.to_dict()),
        )
        
        logger.debug(f"Cached {self.analyzer_name} result for {category_key}")
    
    def calculate_content_hash(self, videos: list) -> str:
        """
        Calculate hash of video content for change detection.
        
        Uses video IDs and view counts to detect meaningful changes.
        
        Args:
            videos: List of video dictionaries
            
        Returns:
            16-character hex hash string
        """
        # Sort by video_id for consistent ordering
        sorted_videos = sorted(videos, key=lambda x: x.get("video_id", ""))
        
        # Create content string from IDs and view counts
        content = "|".join(
            f"{v.get('video_id', '')}:{v.get('view_count', 0)}"
            for v in sorted_videos
        )
        
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    async def has_content_changed(
        self,
        category_key: str,
        new_hash: str,
    ) -> bool:
        """
        Check if content has changed since last analysis.
        
        Args:
            category_key: The category to check
            new_hash: Hash of current content
            
        Returns:
            True if content has changed or no previous hash exists
        """
        redis_client = await self.get_redis()
        hash_key = f"intel:hash:{self.analyzer_name}:{category_key}"
        
        previous_hash = await redis_client.get(hash_key)
        
        if previous_hash and previous_hash == new_hash:
            logger.debug(f"Content unchanged for {category_key}, skipping analysis")
            return False
        
        # Store new hash
        await redis_client.setex(hash_key, self._cache_ttl, new_hash)
        return True
    
    def calculate_confidence(
        self,
        video_count: int,
        base_confidence: int = 50,
        max_confidence: int = 90,
    ) -> int:
        """
        Calculate confidence score based on data quantity.
        
        Args:
            video_count: Number of videos analyzed
            base_confidence: Starting confidence score
            max_confidence: Maximum confidence score
            
        Returns:
            Confidence score between 0 and max_confidence
        """
        # Add 1 point per video, up to max
        confidence = base_confidence + video_count
        return min(max_confidence, confidence)
    
    def validate_video_count(self, videos: list, category_key: str) -> None:
        """
        Validate that we have enough videos for analysis.
        
        Args:
            videos: List of videos
            category_key: Category being analyzed
            
        Raises:
            IntelDataError: If insufficient videos
        """
        if len(videos) < self.MIN_VIDEOS_REQUIRED:
            raise IntelDataError(
                message=f"Insufficient videos for analysis: {len(videos)} < {self.MIN_VIDEOS_REQUIRED}",
                category_key=category_key,
                data_source="youtube",
                details={"video_count": len(videos), "required": self.MIN_VIDEOS_REQUIRED},
            )
    
    async def analyze_with_cache(
        self,
        category_key: str,
        force_refresh: bool = False,
    ) -> Optional[AnalysisResult]:
        """
        Analyze with caching and change detection.
        
        This is the recommended entry point for running analysis.
        It handles caching, change detection, and error logging.
        
        Args:
            category_key: The category to analyze
            force_refresh: If True, bypass cache and re-analyze
            
        Returns:
            AnalysisResult or None if analysis fails
        """
        # Check cache first (unless forcing refresh)
        if not force_refresh:
            cached = await self.get_cached_result(category_key)
            if cached:
                logger.debug(f"Returning cached {self.analyzer_name} for {category_key}")
                return AnalysisResult(
                    data=cached.get("data"),
                    category_key=category_key,
                    analyzer_name=self.analyzer_name,
                    confidence=cached.get("confidence", 50),
                    video_count=cached.get("video_count", 0),
                    analyzed_at=datetime.fromisoformat(cached.get("analyzed_at", datetime.now(timezone.utc).isoformat())),
                    cache_key=cached.get("cache_key"),
                    content_hash=cached.get("content_hash"),
                )
        
        try:
            # Run analysis
            result = await self.analyze(category_key)
            
            if result:
                # Cache the result
                await self.cache_result(category_key, result)
            
            return result
            
        except IntelDataError as e:
            logger.warning(f"{self.analyzer_name} data error for {category_key}: {e.message}")
            return None
        except IntelAnalysisError as e:
            logger.error(f"{self.analyzer_name} analysis error for {category_key}: {e.message}")
            return None
        except Exception as e:
            logger.exception(f"{self.analyzer_name} unexpected error for {category_key}: {e}")
            return None
    
    async def close(self) -> None:
        """Close Redis connection."""
        if self._redis:
            await self._redis.aclose()
            self._redis = None
