"""
Creator Intel V2 - Batch Collector

Efficient batched video collection for multiple games.
Optimizes API usage by deduplicating video IDs across games.
"""

import asyncio
import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

import redis.asyncio as redis

from backend.services.intel.collectors.quota_manager import QuotaManager
from backend.services.intel.core.exceptions import IntelDataError, IntelQuotaError

logger = logging.getLogger(__name__)


@dataclass
class BatchCollectionResult:
    """
    Result of a batch collection operation.
    
    Attributes:
        games_collected: List of game keys that were collected
        total_videos: Total videos across all games (with duplicates)
        unique_videos: Unique videos after deduplication
        quota_used: Total quota units consumed
        duration_seconds: How long the collection took
        content_hashes: Map of game_key -> content hash
        errors: Map of game_key -> error message for failed games
    """
    games_collected: List[str]
    total_videos: int
    unique_videos: int
    quota_used: int
    duration_seconds: float
    content_hashes: Dict[str, str] = field(default_factory=dict)
    errors: Dict[str, str] = field(default_factory=dict)
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate as a percentage."""
        total = len(self.games_collected) + len(self.errors)
        if total == 0:
            return 0.0
        return len(self.games_collected) / total
    
    @property
    def has_errors(self) -> bool:
        """Check if any games failed."""
        return len(self.errors) > 0
    
    @property
    def all_failed(self) -> bool:
        """Check if all games failed."""
        return len(self.games_collected) == 0 and len(self.errors) > 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "games_collected": self.games_collected,
            "total_videos": self.total_videos,
            "unique_videos": self.unique_videos,
            "quota_used": self.quota_used,
            "duration_seconds": round(self.duration_seconds, 2),
            "content_hashes": self.content_hashes,
            "errors": self.errors,
            "success_rate": self.success_rate,
            "has_errors": self.has_errors,
        }
    
    def raise_if_failed(self, min_success_rate: float = 0.0) -> None:
        """
        Raise an exception if collection failed below threshold.
        
        FIX #3: Allows callers to enforce minimum success rate.
        
        Args:
            min_success_rate: Minimum success rate (0.0 to 1.0). 
                              Default 0.0 means only raise if ALL failed.
                              Use 1.0 to raise on ANY failure.
                              Use 0.5 to raise if less than 50% succeeded.
        
        Raises:
            IntelDataError: If success rate is below threshold
        """
        if self.all_failed:
            error_summary = "; ".join(f"{k}: {v}" for k, v in list(self.errors.items())[:3])
            raise IntelDataError(
                message=f"All games failed to collect: {error_summary}",
                data_source="youtube",
                details={"errors": self.errors},
            )
        
        if self.success_rate < min_success_rate:
            raise IntelDataError(
                message=(
                    f"Collection success rate {self.success_rate:.1%} "
                    f"below threshold {min_success_rate:.1%}. "
                    f"Failed: {list(self.errors.keys())}"
                ),
                data_source="youtube",
                details={
                    "success_rate": self.success_rate,
                    "threshold": min_success_rate,
                    "errors": self.errors,
                },
            )


class BatchCollector:
    """
    Collects YouTube data for multiple games efficiently.
    
    Strategy:
    1. Parallel trending fetch (1 unit each, run concurrently)
    2. Collect all video IDs, dedupe
    3. Single batched details fetch (1 unit per 50 videos)
    4. Distribute results back to games
    
    This approach minimizes API quota usage by:
    - Batching video details requests (50 IDs per request)
    - Deduplicating videos that appear in multiple categories
    - Running trending fetches in parallel with rate limiting
    - Automatic retry with exponential backoff on failures
    
    Usage:
        collector = BatchCollector(youtube_client, quota_manager, redis_client)
        result = await collector.collect_batch(["fortnite", "valorant", "minecraft"])
    """
    
    # Configuration
    MAX_CONCURRENT_TRENDING = 4  # Don't hammer API
    BATCH_SIZE = 50  # YouTube max per request
    CACHE_TTL = 72 * 60 * 60  # 72 hours - stale data better than no data
    MAX_RETRIES = 3  # Retry failed requests
    RETRY_BASE_DELAY = 2  # Base delay in seconds
    
    def __init__(
        self,
        youtube_client: Any,
        quota_manager: QuotaManager,
        redis_client: redis.Redis,
    ) -> None:
        """
        Initialize the batch collector.
        
        Args:
            youtube_client: YouTube API client
            quota_manager: Quota manager instance
            redis_client: Redis client for caching
        """
        self.youtube = youtube_client
        self.quota = quota_manager
        self.redis = redis_client
    
    async def collect_batch(
        self,
        game_keys: List[str],
        force_refresh: bool = False,
    ) -> BatchCollectionResult:
        """
        Collect data for multiple games in optimized batch.
        
        Args:
            game_keys: List of game keys to collect
            force_refresh: If True, ignore cache and re-fetch
            
        Returns:
            BatchCollectionResult with collection metrics
        """
        start = time.time()
        
        if not game_keys:
            return BatchCollectionResult(
                games_collected=[],
                total_videos=0,
                unique_videos=0,
                quota_used=0,
                duration_seconds=0,
            )
        
        logger.info(f"Starting batch collection for {len(game_keys)} games")
        
        # Phase 1: Parallel trending fetch
        trending_results, trending_errors = await self._fetch_trending_parallel(game_keys)
        
        # Phase 2: Collect and dedupe video IDs
        all_video_ids: Set[str] = set()
        game_video_map: Dict[str, List[str]] = {}
        
        for game_key, videos in trending_results.items():
            video_ids = [v.get("video_id") for v in videos if v.get("video_id")]
            game_video_map[game_key] = video_ids
            all_video_ids.update(video_ids)
        
        # Phase 3: Batch fetch video details
        video_details = await self._fetch_details_batched(list(all_video_ids))
        
        # Phase 4: Distribute and store
        content_hashes: Dict[str, str] = {}
        games_collected: List[str] = []
        
        for game_key, video_ids in game_video_map.items():
            game_videos = [
                video_details[vid] for vid in video_ids
                if vid in video_details
            ]
            
            if not game_videos:
                continue
            
            # Calculate content hash for change detection
            content_hash = self._calculate_content_hash(game_videos)
            previous_hash = await self.redis.get(f"youtube:hash:{game_key}")
            
            # Store in Redis
            await self._store_game_videos(game_key, game_videos)
            content_hashes[game_key] = content_hash
            games_collected.append(game_key)
            
            # Record collection with quota manager
            await self.quota.record_collection(
                game_key=game_key,
                units_used=0,  # Tracked separately below
                videos_fetched=len(game_videos),
                content_hash=content_hash,
                previous_hash=previous_hash.decode() if isinstance(previous_hash, bytes) else previous_hash,
            )
        
        # Calculate quota used
        trending_cost = len(game_keys)  # 1 unit each
        details_cost = (len(all_video_ids) + self.BATCH_SIZE - 1) // self.BATCH_SIZE
        total_quota = trending_cost + details_cost
        
        duration = time.time() - start
        
        result = BatchCollectionResult(
            games_collected=games_collected,
            total_videos=sum(len(ids) for ids in game_video_map.values()),
            unique_videos=len(all_video_ids),
            quota_used=total_quota,
            duration_seconds=duration,
            content_hashes=content_hashes,
            errors=trending_errors,
        )
        
        logger.info(
            f"Batch collection complete: {len(games_collected)} games, "
            f"{result.unique_videos} unique videos, "
            f"{total_quota} quota units, "
            f"{duration:.2f}s"
        )
        
        return result
    
    async def _fetch_trending_parallel(
        self,
        game_keys: List[str],
    ) -> Tuple[Dict[str, List[Dict]], Dict[str, str]]:
        """
        Fetch trending videos for multiple games in parallel.
        
        Args:
            game_keys: List of game keys to fetch
            
        Returns:
            Tuple of (results dict, errors dict)
        """
        semaphore = asyncio.Semaphore(self.MAX_CONCURRENT_TRENDING)
        
        async def fetch_one(game_key: str) -> Tuple[str, Optional[List[Dict]], Optional[str]]:
            async with semaphore:
                last_error = None
                
                for attempt in range(self.MAX_RETRIES):
                    try:
                        # Check quota before fetching
                        self.quota.check_quota(1)
                        
                        videos = await self.youtube.fetch_trending(
                            category="gaming",
                            max_results=50,
                        )
                        
                        # Filter to game-specific videos
                        filtered = self._filter_videos_for_game(videos, game_key)
                        
                        return game_key, filtered, None
                        
                    except IntelQuotaError as e:
                        logger.warning(f"Quota error for {game_key}: {e.message}")
                        return game_key, None, e.message
                    except Exception as e:
                        last_error = str(e)
                        if attempt < self.MAX_RETRIES - 1:
                            delay = self.RETRY_BASE_DELAY * (2 ** attempt)
                            logger.warning(
                                f"Retry {attempt + 1}/{self.MAX_RETRIES} for {game_key} "
                                f"after {delay}s: {e}"
                            )
                            await asyncio.sleep(delay)
                        else:
                            logger.error(f"All retries failed for {game_key}: {e}")
                            await self.quota.record_failure(game_key, e)
                
                return game_key, None, last_error
        
        tasks = [fetch_one(key) for key in game_keys]
        results = await asyncio.gather(*tasks)
        
        output: Dict[str, List[Dict]] = {}
        errors: Dict[str, str] = {}
        
        for game_key, videos, error in results:
            if error:
                errors[game_key] = error
            elif videos:
                output[game_key] = videos
        
        return output, errors
    
    def _filter_videos_for_game(
        self,
        videos: List[Dict],
        game_key: str,
    ) -> List[Dict]:
        """
        Filter videos to those relevant to a specific game.
        
        Args:
            videos: List of video dictionaries
            game_key: Game to filter for
            
        Returns:
            Filtered list of videos
        """
        # Convert game_key to search terms
        game_terms = game_key.replace("_", " ").lower().split()
        
        filtered = []
        for video in videos:
            title = video.get("title", "").lower()
            tags = [t.lower() for t in video.get("tags", [])]
            
            # Check if any game term appears in title or tags
            for term in game_terms:
                if term in title or term in tags:
                    filtered.append(video)
                    break
        
        return filtered
    
    async def _fetch_details_batched(
        self,
        video_ids: List[str],
    ) -> Dict[str, Dict]:
        """
        Fetch video details in batches of 50 with retry logic.
        
        Args:
            video_ids: List of video IDs to fetch
            
        Returns:
            Dictionary mapping video_id -> video details
        """
        all_details: Dict[str, Dict] = {}
        
        for i in range(0, len(video_ids), self.BATCH_SIZE):
            batch = video_ids[i:i + self.BATCH_SIZE]
            batch_success = False
            
            for attempt in range(self.MAX_RETRIES):
                try:
                    # Check quota
                    self.quota.check_quota(1)
                    
                    details = await self.youtube.fetch_video_stats(batch)
                    
                    for video in details:
                        video_id = video.video_id if hasattr(video, "video_id") else video.get("video_id")
                        if video_id:
                            all_details[video_id] = (
                                video.__dict__ if hasattr(video, "__dict__") else video
                            )
                    
                    batch_success = True
                    break
                    
                except IntelQuotaError:
                    logger.warning(f"Quota exhausted during details fetch at batch {i}")
                    return all_details  # Return what we have
                except Exception as e:
                    if attempt < self.MAX_RETRIES - 1:
                        delay = self.RETRY_BASE_DELAY * (2 ** attempt)
                        logger.warning(
                            f"Retry {attempt + 1}/{self.MAX_RETRIES} for batch {i} "
                            f"after {delay}s: {e}"
                        )
                        await asyncio.sleep(delay)
                    else:
                        logger.error(f"All retries failed for batch {i}: {e}")
            
            if not batch_success:
                logger.warning(f"Skipping batch {i} after all retries failed")
            
            # Small delay between batches to be nice to the API
            if i + self.BATCH_SIZE < len(video_ids):
                await asyncio.sleep(0.1)
        
        return all_details
    
    def _calculate_content_hash(self, videos: List[Dict]) -> str:
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
    
    async def _store_game_videos(
        self,
        game_key: str,
        videos: List[Dict],
    ) -> None:
        """
        Store videos in Redis with metadata.
        
        Args:
            game_key: Game key for the cache key
            videos: List of video dictionaries
        """
        data = {
            "game_key": game_key,
            "videos": videos,
            "video_count": len(videos),
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
        
        await self.redis.setex(
            f"youtube:games:{game_key}",
            self.CACHE_TTL,
            json.dumps(data),
        )
        
        # Store hash for change detection
        content_hash = self._calculate_content_hash(videos)
        await self.redis.set(f"youtube:hash:{game_key}", content_hash)
        
        logger.debug(f"Stored {len(videos)} videos for {game_key}")
    
    async def collect_single(
        self,
        game_key: str,
        force_refresh: bool = False,
    ) -> Optional[List[Dict]]:
        """
        Collect data for a single game.
        
        Convenience method for collecting just one game.
        
        Args:
            game_key: Game to collect
            force_refresh: If True, ignore cache
            
        Returns:
            List of video dictionaries, or None if failed
        """
        result = await self.collect_batch([game_key], force_refresh)
        
        if game_key in result.errors:
            raise IntelDataError(
                message=f"Failed to collect {game_key}: {result.errors[game_key]}",
                category_key=game_key,
                data_source="youtube",
            )
        
        if game_key not in result.games_collected:
            return None
        
        # Load from cache
        cached = await self.redis.get(f"youtube:games:{game_key}")
        if cached:
            data = json.loads(cached)
            return data.get("videos", [])
        
        return None
