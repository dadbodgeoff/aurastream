"""
Viral Detector Service

Provides real viral opportunity scoring using YouTube data.
Analyzes video velocity (views per hour) to identify viral content
and trending opportunities in gaming categories.

Data Source: YouTube videos cached in Redis at `youtube:games:{game}`
Cache: Analysis results cached for 30 minutes
"""

import json
import logging
import os
import re
from collections import Counter
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional, Set

import redis.asyncio as redis

logger = logging.getLogger(__name__)

# ============================================================================
# Configuration
# ============================================================================

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
YOUTUBE_GAMES_KEY = "youtube:games:{game}"
VIRAL_ANALYSIS_CACHE_KEY = "viral:analysis:{category}"
ANALYSIS_CACHE_TTL = 1800  # 30 minutes
DATA_STALENESS_THRESHOLD_HOURS = 6  # Data older than this = low confidence

# Default baseline velocities (views per hour for "normal" performance)
# These are fallbacks - dynamic baselines are calculated from historical data
DEFAULT_VELOCITY_BASELINES: Dict[str, float] = {
    "fortnite": 5000,
    "valorant": 3000,
    "minecraft": 4000,
    "apex_legends": 2000,
    "call_of_duty": 2000,
    "gta_v": 2500,
    "gta": 2500,
    "roblox": 3000,
    "league_of_legends": 3500,
    "overwatch_2": 2000,
    "counter_strike": 2500,
    "rocket_league": 1500,
    "dead_by_daylight": 1000,
    "elden_ring": 1500,
    "world_of_warcraft": 2000,
    "dota_2": 2500,
    "escape_from_tarkov": 1500,
    "rust": 1500,
    "fifa": 2000,
    "pokemon": 3000,
    "default": 1000,
}

# Redis key for storing dynamic baselines
DYNAMIC_BASELINE_KEY = "viral:baseline:{category}"
BASELINE_HISTORY_KEY = "viral:baseline_history:{category}"
BASELINE_HISTORY_MAX = 168  # 7 days of hourly samples

# Stop words for topic extraction
STOP_WORDS: Set[str] = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "it", "this", "that", "was", "are",
    "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "must", "shall",
    "i", "me", "my", "we", "our", "you", "your", "he", "she", "they",
    "his", "her", "its", "their", "what", "which", "who", "whom", "how",
    "when", "where", "why", "all", "each", "every", "both", "few", "more",
    "most", "other", "some", "such", "no", "not", "only", "same", "so",
    "than", "too", "very", "just", "can", "now", "new", "one", "two",
    "im", "ive", "dont", "cant", "wont", "didnt", "isnt", "arent",
    "video", "gameplay", "game", "gaming", "stream", "live", "best",
    "part", "episode", "ep", "vs", "full",
}


# ============================================================================
# Data Classes
# ============================================================================

@dataclass
class VideoVelocity:
    """Velocity analysis for a single video."""
    video_id: str
    title: str
    views: int
    hours_since_publish: float
    velocity: float
    velocity_percentile: float
    trend: Literal["viral", "rising", "stable", "falling"]
    engagement_rate: float
    like_velocity: float

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)


@dataclass
class ViralOpportunityAnalysis:
    """Viral opportunity analysis for a category."""
    category_key: str
    category_name: str
    viral_video_count: int
    rising_video_count: int
    avg_velocity: float
    max_velocity: float
    top_viral_videos: List[VideoVelocity]
    opportunity_score: float
    trending_topics: List[str]
    trending_tags: List[str]
    confidence: int
    analyzed_at: datetime

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "category_key": self.category_key,
            "category_name": self.category_name,
            "viral_video_count": self.viral_video_count,
            "rising_video_count": self.rising_video_count,
            "avg_velocity": round(self.avg_velocity, 2),
            "max_velocity": round(self.max_velocity, 2),
            "top_viral_videos": [v.to_dict() for v in self.top_viral_videos],
            "opportunity_score": round(self.opportunity_score, 1),
            "trending_topics": self.trending_topics,
            "trending_tags": self.trending_tags,
            "confidence": self.confidence,
            "analyzed_at": self.analyzed_at.isoformat(),
        }


# ============================================================================
# Viral Detector Service
# ============================================================================

class ViralDetector:
    """
    Detects viral content and opportunities.

    Analyzes YouTube video data to identify:
    - Currently viral videos (velocity > p90)
    - Rising content (velocity > p75)
    - Trending topics and tags
    - Overall category opportunity score
    
    Uses dynamic baselines calculated from historical velocity data
    rather than hardcoded values for more accurate opportunity scoring.
    """

    def __init__(self):
        self._redis: Optional[redis.Redis] = None
        self._baseline_cache: Dict[str, float] = {}

    async def _get_redis(self) -> redis.Redis:
        """Get or create Redis connection."""
        if self._redis is None:
            self._redis = redis.from_url(REDIS_URL, decode_responses=True)
        return self._redis

    async def close(self):
        """Close Redis connection."""
        if self._redis:
            await self._redis.aclose()
            self._redis = None

    async def analyze_category(self, category_key: str) -> ViralOpportunityAnalysis:
        """
        Analyze viral opportunities in a category.

        Steps:
        1. Check cache for recent analysis
        2. Load cached YouTube videos
        3. Calculate velocity for each video
        4. Determine category velocity distribution
        5. Identify viral/rising content
        6. Extract trending topics
        7. Calculate opportunity score
        8. Cache results

        Args:
            category_key: The category identifier (e.g., "fortnite")

        Returns:
            ViralOpportunityAnalysis with viral metrics and opportunity score
        """
        redis_client = await self._get_redis()

        # Check cache first
        cache_key = VIRAL_ANALYSIS_CACHE_KEY.format(category=category_key)
        cached = await redis_client.get(cache_key)

        if cached:
            try:
                cached_data = json.loads(cached)
                logger.debug(f"Returning cached viral analysis for {category_key}")
                return self._deserialize_analysis(cached_data)
            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"Failed to deserialize cached analysis: {e}")

        # Load YouTube video data
        youtube_key = YOUTUBE_GAMES_KEY.format(game=category_key)
        youtube_data = await redis_client.get(youtube_key)

        if not youtube_data:
            logger.warning(f"No cached YouTube videos for: {category_key}")
            return self._create_empty_analysis(category_key)

        try:
            data = json.loads(youtube_data)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse YouTube data for {category_key}: {e}")
            return self._create_empty_analysis(category_key)

        videos = data.get("videos", [])
        fetched_at_str = data.get("fetched_at")
        game_name = data.get(
            "game_display_name", category_key.replace("_", " ").title()
        )

        if not videos:
            logger.warning(f"No videos in cached data for {category_key}")
            return self._create_empty_analysis(category_key, game_name)

        # Calculate data staleness and confidence
        confidence = self._calculate_confidence(fetched_at_str)

        logger.info(
            f"Analyzing {len(videos)} videos for {game_name} "
            f"(confidence: {confidence}%)"
        )

        # Calculate velocity for all videos
        video_velocities: List[VideoVelocity] = []
        for video in videos:
            velocity = self._calculate_velocity(video)
            if velocity:
                video_velocities.append(velocity)

        if not video_velocities:
            logger.warning(
                f"Could not calculate velocity for videos in {category_key}"
            )
            return self._create_empty_analysis(category_key, game_name, confidence)

        # Calculate velocity distribution percentiles
        velocities = sorted([v.velocity for v in video_velocities])
        p50 = self._percentile(velocities, 50)
        p75 = self._percentile(velocities, 75)
        p90 = self._percentile(velocities, 90)

        # Classify trends and update percentiles
        for vv in video_velocities:
            vv.trend = self._classify_trend(vv.velocity, p50, p75, p90)
            vv.velocity_percentile = self._calculate_percentile_rank(
                vv.velocity, velocities
            )

        # Count viral and rising videos
        viral_videos = [v for v in video_velocities if v.trend == "viral"]
        rising_videos = [v for v in video_velocities if v.trend == "rising"]

        # Get top viral videos (sorted by velocity)
        top_viral = sorted(
            video_velocities, key=lambda v: v.velocity, reverse=True
        )[:3]

        # Calculate aggregate metrics
        total = len(video_velocities)
        avg_velocity = sum(v.velocity for v in video_velocities) / total
        max_velocity = max(v.velocity for v in video_velocities)

        # Extract trending topics from viral/rising videos
        trending_videos = viral_videos + rising_videos
        trending_topics = self._extract_trending_topics(trending_videos, videos)
        trending_tags = self._extract_trending_tags(trending_videos, videos)

        # Get dynamic baseline (or fall back to default)
        baseline = await self._get_dynamic_baseline(category_key, avg_velocity)
        
        # Update baseline history for future calculations
        await self._update_baseline_history(category_key, avg_velocity)
        
        opportunity_score = self._calculate_opportunity_score(
            viral_count=len(viral_videos),
            rising_count=len(rising_videos),
            total_count=total,
            avg_velocity=avg_velocity,
            category_baseline_velocity=baseline,
        )

        analysis = ViralOpportunityAnalysis(
            category_key=category_key,
            category_name=game_name,
            viral_video_count=len(viral_videos),
            rising_video_count=len(rising_videos),
            avg_velocity=avg_velocity,
            max_velocity=max_velocity,
            top_viral_videos=top_viral,
            opportunity_score=opportunity_score,
            trending_topics=trending_topics,
            trending_tags=trending_tags,
            confidence=confidence,
            analyzed_at=datetime.now(timezone.utc),
        )

        # Cache the analysis
        try:
            await redis_client.setex(
                cache_key,
                ANALYSIS_CACHE_TTL,
                json.dumps(analysis.to_dict()),
            )
            logger.debug(f"Cached viral analysis for {category_key}")
        except Exception as e:
            logger.warning(f"Failed to cache viral analysis: {e}")

        return analysis


    def _calculate_velocity(self, video: Dict) -> Optional[VideoVelocity]:
        """
        Calculate velocity metrics for a video.

        Velocity = views / hours since publish
        Like velocity = likes / hours since publish
        """
        video_id = video.get("video_id", "")
        title = video.get("title", "")
        views = video.get("view_count", 0)
        likes = video.get("like_count", 0)
        engagement_rate = video.get("engagement_rate", 0) or 0
        published_at = video.get("published_at")

        if not video_id or not views:
            return None

        hours = self._hours_since(published_at)
        if hours is None:
            return None

        # Minimum 1 hour to avoid division issues with very new videos
        hours = max(1.0, hours)

        velocity = views / hours
        like_velocity = likes / hours if likes else 0

        return VideoVelocity(
            video_id=video_id,
            title=title[:100] if title else "",
            views=views,
            hours_since_publish=round(hours, 1),
            velocity=round(velocity, 2),
            velocity_percentile=0,  # Will be set later
            trend="stable",  # Will be classified later
            engagement_rate=round(engagement_rate, 2),
            like_velocity=round(like_velocity, 2),
        )

    def _hours_since(self, published_at: Optional[str]) -> Optional[float]:
        """Calculate hours since a timestamp."""
        if not published_at:
            return None

        try:
            if isinstance(published_at, str):
                # Handle ISO format with or without timezone
                if published_at.endswith("Z"):
                    pub_date = datetime.fromisoformat(
                        published_at.replace("Z", "+00:00")
                    )
                elif "+" in published_at or published_at.count("-") > 2:
                    pub_date = datetime.fromisoformat(published_at)
                else:
                    pub_date = datetime.fromisoformat(published_at).replace(
                        tzinfo=timezone.utc
                    )
            else:
                return None

            now = datetime.now(timezone.utc)
            delta = now - pub_date
            return delta.total_seconds() / 3600
        except (ValueError, TypeError) as e:
            logger.debug(f"Failed to parse published_at '{published_at}': {e}")
            return None

    def _classify_trend(
        self,
        velocity: float,
        velocity_p50: float,
        velocity_p75: float,
        velocity_p90: float,
    ) -> Literal["viral", "rising", "stable", "falling"]:
        """
        Classify video trend based on velocity percentile.

        viral: > p90 (top 10%)
        rising: > p75 (top 25%)
        stable: > p50 (above median)
        falling: <= p50 (below median)
        """
        if velocity > velocity_p90:
            return "viral"
        elif velocity > velocity_p75:
            return "rising"
        elif velocity > velocity_p50:
            return "stable"
        else:
            return "falling"

    def _percentile(self, sorted_values: List[float], percentile: int) -> float:
        """Calculate percentile from sorted values."""
        if not sorted_values:
            return 0.0

        k = (len(sorted_values) - 1) * (percentile / 100)
        f = int(k)
        c = f + 1 if f + 1 < len(sorted_values) else f

        if f == c:
            return sorted_values[f]

        return sorted_values[f] + (k - f) * (sorted_values[c] - sorted_values[f])

    def _calculate_percentile_rank(
        self, value: float, sorted_values: List[float]
    ) -> float:
        """Calculate what percentile a value falls at."""
        if not sorted_values:
            return 0.0

        count_below = sum(1 for v in sorted_values if v < value)
        return round((count_below / len(sorted_values)) * 100, 1)


    def _extract_trending_topics(
        self,
        viral_velocities: List[VideoVelocity],
        all_videos: List[Dict],
    ) -> List[str]:
        """
        Extract trending topics from viral video titles.

        Uses simple keyword extraction:
        1. Tokenize titles
        2. Remove stop words
        3. Count frequency
        4. Return top 5 keywords
        """
        if not viral_velocities:
            return []

        # Get video IDs of viral videos
        viral_ids = {v.video_id for v in viral_velocities}

        # Get full video data for viral videos
        viral_video_data = [
            v for v in all_videos if v.get("video_id") in viral_ids
        ]

        # Extract and count keywords
        word_counts: Counter = Counter()

        for video in viral_video_data:
            title = video.get("title", "")
            # Tokenize: extract words 3+ chars, lowercase
            words = re.findall(r'\b[a-zA-Z]{3,}\b', title.lower())

            for word in words:
                if word not in STOP_WORDS:
                    word_counts[word] += 1

        # Return top 5 keywords
        return [word for word, _ in word_counts.most_common(5)]

    def _extract_trending_tags(
        self,
        viral_velocities: List[VideoVelocity],
        all_videos: List[Dict],
    ) -> List[str]:
        """Extract trending tags from viral videos."""
        if not viral_velocities:
            return []

        # Get video IDs of viral videos
        viral_ids = {v.video_id for v in viral_velocities}

        # Get full video data for viral videos
        viral_video_data = [
            v for v in all_videos if v.get("video_id") in viral_ids
        ]

        # Count tags
        tag_counts: Counter = Counter()

        for video in viral_video_data:
            tags = video.get("tags", []) or []
            for tag in tags[:10]:  # Limit to first 10 tags per video
                tag_lower = tag.lower().strip()
                if tag_lower and len(tag_lower) >= 2:
                    tag_counts[tag_lower] += 1

        # Return top 5 tags
        return [tag for tag, _ in tag_counts.most_common(5)]

    def _calculate_opportunity_score(
        self,
        viral_count: int,
        rising_count: int,
        total_count: int,
        avg_velocity: float,
        category_baseline_velocity: float,
    ) -> float:
        """
        Calculate viral opportunity score (0-100).

        High score when:
        - Many videos are going viral (viral_count / total > 0.1)
        - Average velocity is above category baseline
        - There's momentum in the category

        Formula:
        base = (viral_count * 3 + rising_count) / total * 100
        velocity_boost = min(20, (avg_velocity / baseline - 1) * 20)
        score = min(100, base + velocity_boost)
        """
        if total_count == 0:
            return 0.0

        # Base score from viral/rising ratio
        # Viral videos count 3x, rising count 1x
        weighted_count = (viral_count * 3) + rising_count
        base = (weighted_count / total_count) * 100

        # Velocity boost: how much above baseline
        if category_baseline_velocity > 0:
            velocity_ratio = avg_velocity / category_baseline_velocity
            velocity_boost = min(20, max(0, (velocity_ratio - 1) * 20))
        else:
            velocity_boost = 0

        # Final score capped at 100
        score = min(100, base + velocity_boost)

        return round(score, 1)


    def _calculate_confidence(self, fetched_at_str: Optional[str]) -> int:
        """
        Calculate confidence based on data freshness.

        Returns 0-100:
        - 100: Data < 1 hour old
        - 80: Data 1-3 hours old
        - 60: Data 3-6 hours old
        - 40: Data 6-12 hours old
        - 20: Data 12-24 hours old
        - 10: Data > 24 hours old
        """
        if not fetched_at_str:
            return 10

        try:
            if fetched_at_str.endswith("Z"):
                fetched_at = datetime.fromisoformat(
                    fetched_at_str.replace("Z", "+00:00")
                )
            else:
                fetched_at = datetime.fromisoformat(fetched_at_str)

            now = datetime.now(timezone.utc)
            hours_old = (now - fetched_at).total_seconds() / 3600

            if hours_old < 1:
                return 100
            elif hours_old < 3:
                return 80
            elif hours_old < DATA_STALENESS_THRESHOLD_HOURS:
                return 60
            elif hours_old < 12:
                return 40
            elif hours_old < 24:
                return 20
            else:
                return 10
        except (ValueError, TypeError):
            return 10

    def _create_empty_analysis(
        self,
        category_key: str,
        category_name: Optional[str] = None,
        confidence: int = 0,
    ) -> ViralOpportunityAnalysis:
        """Create an empty analysis when no data is available."""
        return ViralOpportunityAnalysis(
            category_key=category_key,
            category_name=category_name or category_key.replace("_", " ").title(),
            viral_video_count=0,
            rising_video_count=0,
            avg_velocity=0.0,
            max_velocity=0.0,
            top_viral_videos=[],
            opportunity_score=0.0,
            trending_topics=[],
            trending_tags=[],
            confidence=confidence,
            analyzed_at=datetime.now(timezone.utc),
        )

    def _deserialize_analysis(self, data: Dict) -> ViralOpportunityAnalysis:
        """Deserialize cached analysis from JSON."""
        # Reconstruct VideoVelocity objects
        top_viral = []
        for vv_data in data.get("top_viral_videos", []):
            top_viral.append(VideoVelocity(
                video_id=vv_data.get("video_id", ""),
                title=vv_data.get("title", ""),
                views=vv_data.get("views", 0),
                hours_since_publish=vv_data.get("hours_since_publish", 0),
                velocity=vv_data.get("velocity", 0),
                velocity_percentile=vv_data.get("velocity_percentile", 0),
                trend=vv_data.get("trend", "stable"),
                engagement_rate=vv_data.get("engagement_rate", 0),
                like_velocity=vv_data.get("like_velocity", 0),
            ))

        # Parse analyzed_at
        analyzed_at_str = data.get("analyzed_at", "")
        try:
            if analyzed_at_str.endswith("Z"):
                analyzed_at = datetime.fromisoformat(
                    analyzed_at_str.replace("Z", "+00:00")
                )
            else:
                analyzed_at = datetime.fromisoformat(analyzed_at_str)
        except (ValueError, TypeError):
            analyzed_at = datetime.now(timezone.utc)

        return ViralOpportunityAnalysis(
            category_key=data.get("category_key", ""),
            category_name=data.get("category_name", ""),
            viral_video_count=data.get("viral_video_count", 0),
            rising_video_count=data.get("rising_video_count", 0),
            avg_velocity=data.get("avg_velocity", 0),
            max_velocity=data.get("max_velocity", 0),
            top_viral_videos=top_viral,
            opportunity_score=data.get("opportunity_score", 0),
            trending_topics=data.get("trending_topics", []),
            trending_tags=data.get("trending_tags", []),
            confidence=data.get("confidence", 0),
            analyzed_at=analyzed_at,
        )

    async def _get_dynamic_baseline(
        self,
        category_key: str,
        current_velocity: float,
    ) -> float:
        """
        Get dynamic baseline velocity for a category.
        
        Uses historical velocity data to calculate a rolling median baseline.
        Falls back to default baselines if insufficient history.
        
        Args:
            category_key: The category identifier
            current_velocity: Current average velocity (for fallback)
            
        Returns:
            Baseline velocity for opportunity scoring
        """
        # Check in-memory cache first
        if category_key in self._baseline_cache:
            return self._baseline_cache[category_key]
        
        redis_client = await self._get_redis()
        
        try:
            # Get historical velocity samples
            history_key = BASELINE_HISTORY_KEY.format(category=category_key)
            history_data = await redis_client.lrange(history_key, 0, -1)
            
            if history_data and len(history_data) >= 24:  # Need at least 24 hours
                # Parse historical velocities
                velocities = []
                for item in history_data:
                    try:
                        sample = json.loads(item)
                        velocities.append(sample.get("velocity", 0))
                    except (json.JSONDecodeError, TypeError):
                        continue
                
                if len(velocities) >= 24:
                    # Calculate rolling median (more stable than mean)
                    sorted_velocities = sorted(velocities)
                    mid = len(sorted_velocities) // 2
                    if len(sorted_velocities) % 2 == 0:
                        baseline = (sorted_velocities[mid - 1] + sorted_velocities[mid]) / 2
                    else:
                        baseline = sorted_velocities[mid]
                    
                    # Cache for this session
                    self._baseline_cache[category_key] = baseline
                    
                    logger.debug(
                        f"Dynamic baseline for {category_key}: {baseline:.0f} "
                        f"(from {len(velocities)} samples)"
                    )
                    return baseline
            
            # Fall back to default baseline
            baseline = DEFAULT_VELOCITY_BASELINES.get(
                category_key, DEFAULT_VELOCITY_BASELINES["default"]
            )
            logger.debug(f"Using default baseline for {category_key}: {baseline}")
            return baseline
            
        except Exception as e:
            logger.warning(f"Error getting dynamic baseline for {category_key}: {e}")
            return DEFAULT_VELOCITY_BASELINES.get(
                category_key, DEFAULT_VELOCITY_BASELINES["default"]
            )

    async def _update_baseline_history(
        self,
        category_key: str,
        avg_velocity: float,
    ) -> None:
        """
        Update baseline history with current velocity sample.
        
        Maintains a rolling window of velocity samples for dynamic baseline calculation.
        
        Args:
            category_key: The category identifier
            avg_velocity: Current average velocity to record
        """
        if avg_velocity <= 0:
            return
        
        redis_client = await self._get_redis()
        
        try:
            history_key = BASELINE_HISTORY_KEY.format(category=category_key)
            
            sample = {
                "velocity": avg_velocity,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            
            # Push to list and trim to max size
            await redis_client.lpush(history_key, json.dumps(sample))
            await redis_client.ltrim(history_key, 0, BASELINE_HISTORY_MAX - 1)
            
            # Set TTL to 8 days (slightly longer than history window)
            await redis_client.expire(history_key, 8 * 24 * 3600)
            
        except Exception as e:
            logger.warning(f"Error updating baseline history for {category_key}: {e}")


# ============================================================================
# Singleton Instance
# ============================================================================

_viral_detector: Optional[ViralDetector] = None


def get_viral_detector() -> ViralDetector:
    """
    Get or create the ViralDetector singleton.

    Returns:
        ViralDetector: The singleton instance
    """
    global _viral_detector

    if _viral_detector is None:
        _viral_detector = ViralDetector()

    return _viral_detector


async def close_viral_detector():
    """Close the viral detector and release resources."""
    global _viral_detector

    if _viral_detector is not None:
        await _viral_detector.close()
        _viral_detector = None
