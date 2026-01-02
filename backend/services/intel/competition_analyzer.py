"""
Competition Analyzer Service

Analyzes real-time competition levels for gaming categories using Twitch data.
Replaces random number generation with actual competition metrics.

Data Sources:
- Twitch API (via TwitchCollector): Live stream counts, viewer distribution
- Redis Cache: Cached Twitch data for reduced API calls

Scoring Logic:
- Stream saturation: Fewer streams = higher opportunity score
- Viewer concentration: More distributed viewers = easier to compete
- Peak hours: Timing affects competition levels
"""

import json
import logging
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from backend.database.redis_client import get_redis_client
from backend.services.exceptions import StreamerStudioError


logger = logging.getLogger(__name__)


# =============================================================================
# Constants
# =============================================================================

# Cache TTL for competition analysis (15 minutes)
ANALYSIS_CACHE_TTL = 900

# Redis key patterns
COMPETITION_CACHE_KEY = "intel:competition:{category_key}"
TWITCH_STREAMS_CACHE_KEY = "twitch:streams:{game_id}"
TWITCH_GAMES_CACHE_KEY = "twitch:games"

# Approximate baseline stream counts for popular categories
# These represent typical stream counts during moderate activity
CATEGORY_BASELINES: Dict[str, Dict[str, int]] = {
    "fortnite": {"streams": 3000, "viewers": 150000},
    "valorant": {"streams": 2000, "viewers": 100000},
    "minecraft": {"streams": 4000, "viewers": 120000},
    "apex_legends": {"streams": 1500, "viewers": 80000},
    "warzone": {"streams": 1000, "viewers": 60000},
    "gta": {"streams": 2500, "viewers": 100000},
    "roblox": {"streams": 3000, "viewers": 80000},
    "league_of_legends": {"streams": 2000, "viewers": 90000},
    "just_chatting": {"streams": 8000, "viewers": 300000},
    "call_of_duty": {"streams": 1200, "viewers": 70000},
    "overwatch": {"streams": 800, "viewers": 50000},
    "counter_strike": {"streams": 1500, "viewers": 80000},
    "dead_by_daylight": {"streams": 600, "viewers": 30000},
    "elden_ring": {"streams": 400, "viewers": 25000},
    "world_of_warcraft": {"streams": 700, "viewers": 40000},
    "hearthstone": {"streams": 300, "viewers": 20000},
    "rocket_league": {"streams": 500, "viewers": 25000},
    "fifa": {"streams": 600, "viewers": 30000},
    "nba_2k": {"streams": 400, "viewers": 20000},
    "madden": {"streams": 300, "viewers": 15000},
    # Default for unknown categories
    "default": {"streams": 500, "viewers": 20000},
}

# Peak hours by timezone (in 24-hour format)
# Peak: 2-5 PM and 7-11 PM local time
PEAK_HOURS_AFTERNOON = range(14, 18)  # 2 PM - 5 PM
PEAK_HOURS_EVENING = range(19, 24)    # 7 PM - 11 PM


# =============================================================================
# Exceptions
# =============================================================================

class CompetitionAnalysisError(StreamerStudioError):
    """Base exception for competition analysis errors."""

    def __init__(
        self,
        message: str,
        code: str = "COMPETITION_ANALYSIS_ERROR",
        status_code: int = 500,
        details: Optional[dict] = None
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=status_code,
            details=details
        )


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class CompetitionAnalysis:
    """Competition analysis for a category."""

    category_key: str
    category_name: str

    # Raw metrics
    live_stream_count: int
    total_viewers: int
    avg_viewers_per_stream: float
    top_streamer_viewers: int

    # Derived scores (0-100, higher = LESS competition = better opportunity)
    stream_saturation_score: float  # Fewer streams = higher score
    viewer_concentration_score: float  # More distributed = higher score
    opportunity_score: float  # Combined score

    # Time context
    is_peak_hours: bool
    hour_of_day: int

    # Confidence (0-100, based on data quality)
    confidence: int
    analyzed_at: datetime

    # Data source info
    data_source: str  # "live_api", "cached", "baseline_estimate"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = asdict(self)
        result["analyzed_at"] = self.analyzed_at.isoformat()
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CompetitionAnalysis":
        """Create from dictionary."""
        data = data.copy()
        if isinstance(data.get("analyzed_at"), str):
            data["analyzed_at"] = datetime.fromisoformat(data["analyzed_at"])
        return cls(**data)


# =============================================================================
# Competition Analyzer
# =============================================================================

class CompetitionAnalyzer:
    """Analyzes competition levels for gaming categories.

    Uses Twitch data to determine:
    1. How many streamers are live
    2. How viewers are distributed (top-heavy vs spread out)
    3. Whether it's peak hours

    Returns opportunity score (higher = less competition = better time to stream)
    """

    def __init__(self):
        self._redis = None
        self._twitch_collector = None

    @property
    def redis(self):
        """Lazy load Redis client."""
        if self._redis is None:
            self._redis = get_redis_client()
        return self._redis

    @property
    def twitch_collector(self):
        """Lazy load Twitch collector."""
        if self._twitch_collector is None:
            try:
                from backend.services.trends.twitch_collector import (
                    get_twitch_collector,
                )
                self._twitch_collector = get_twitch_collector()
            except Exception as e:
                logger.warning(f"Failed to initialize Twitch collector: {e}")
                self._twitch_collector = None
        return self._twitch_collector

    async def analyze_category(
        self,
        category_key: str,
        twitch_id: Optional[str] = None,
        category_name: Optional[str] = None,
        timezone_str: str = "America/New_York",
    ) -> CompetitionAnalysis:
        """Analyze competition for a category.

        Uses Twitch data to determine:
        1. How many streamers are live
        2. How viewers are distributed (top-heavy vs spread out)
        3. Whether it's peak hours

        Args:
            category_key: Category identifier (e.g., "fortnite", "valorant")
            twitch_id: Twitch game ID (optional, for direct API lookup)
            category_name: Display name for the category
            timezone_str: User's timezone for peak hour calculation

        Returns:
            CompetitionAnalysis with opportunity score (higher = less competition)
        """
        # Check cache first
        cached = await self._get_cached_analysis(category_key)
        if cached:
            logger.debug(f"Using cached competition analysis for {category_key}")
            return cached

        # Get current time info
        now = datetime.now(timezone.utc)
        hour = now.hour
        is_peak = self._is_peak_hours(hour, timezone_str)

        # Try to get real Twitch data
        streams_data = await self._fetch_twitch_data(category_key, twitch_id)

        if streams_data:
            # Calculate from real data
            analysis = self._analyze_from_streams(
                category_key=category_key,
                category_name=category_name or category_key.replace("_", " ").title(),
                streams=streams_data["streams"],
                viewer_counts=streams_data["viewer_counts"],
                is_peak=is_peak,
                hour=hour,
                data_source=streams_data["source"],
            )
        else:
            # Fall back to baseline estimates
            analysis = self._analyze_from_baseline(
                category_key=category_key,
                category_name=category_name or category_key.replace("_", " ").title(),
                is_peak=is_peak,
                hour=hour,
            )

        # Cache the analysis
        await self._cache_analysis(category_key, analysis)

        return analysis

    async def analyze_multiple_categories(
        self,
        categories: List[Dict[str, Any]],
        timezone_str: str = "America/New_York",
    ) -> Dict[str, CompetitionAnalysis]:
        """Analyze competition for multiple categories.

        Args:
            categories: List of category dicts with keys: key, name, twitch_id
            timezone_str: User's timezone

        Returns:
            Dict mapping category_key to CompetitionAnalysis
        """
        results = {}

        for category in categories:
            try:
                analysis = await self.analyze_category(
                    category_key=category.get("key", ""),
                    twitch_id=category.get("twitch_id"),
                    category_name=category.get("name"),
                    timezone_str=timezone_str,
                )
                results[category.get("key", "")] = analysis
            except Exception as e:
                logger.error(f"Failed to analyze category {category.get('key')}: {e}")
                # Continue with other categories

        return results

    async def _fetch_twitch_data(
        self,
        category_key: str,
        twitch_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Fetch Twitch stream data for a category.

        Tries in order:
        1. Redis cache (if available)
        2. Live Twitch API call

        Returns:
            Dict with streams list and viewer_counts, or None if unavailable
        """
        # Try Redis cache first
        cached_data = await self._get_cached_twitch_data(category_key, twitch_id)
        if cached_data:
            return cached_data

        # Try live API call
        if self.twitch_collector and twitch_id:
            try:
                logger.info(
                    f"Fetching live Twitch data for {category_key} (ID: {twitch_id})"
                )

                # Fetch streams for this game
                streams = await self.twitch_collector.fetch_top_streams(
                    limit=100,
                    game_id=twitch_id,
                )

                if streams:
                    viewer_counts = [s.viewer_count for s in streams]
                    return {
                        "streams": streams,
                        "viewer_counts": viewer_counts,
                        "source": "live_api",
                    }

            except Exception as e:
                logger.warning(f"Failed to fetch Twitch data for {category_key}: {e}")

        return None

    async def _get_cached_twitch_data(
        self,
        category_key: str,
        twitch_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Check Redis for cached Twitch stream data from twitch_streams_worker."""
        try:
            # Try game-specific cache key (from twitch_streams_worker)
            if twitch_id:
                cache_key = TWITCH_STREAMS_CACHE_KEY.format(game_id=twitch_id)
                cached = await self.redis.get(cache_key)

                if cached:
                    data = json.loads(cached)
                    streams = data.get("streams", [])
                    
                    # Use pre-computed viewer_counts if available (from twitch_streams_worker)
                    viewer_counts = data.get("viewer_counts")
                    if not viewer_counts:
                        viewer_counts = [s.get("viewer_count", 0) for s in streams]

                    logger.debug(
                        f"Found cached Twitch data for {category_key} "
                        f"(streams: {len(streams)}, fetched: {data.get('fetched_at', 'unknown')})"
                    )
                    return {
                        "streams": streams,
                        "viewer_counts": viewer_counts,
                        "source": "cached",
                        "stream_count": data.get("stream_count", len(streams)),
                        "total_viewers": data.get("total_viewers", sum(viewer_counts)),
                    }
        except Exception as e:
            logger.warning(f"Error reading Twitch cache: {e}")

        return None

    async def _get_cached_analysis(
        self,
        category_key: str,
    ) -> Optional[CompetitionAnalysis]:
        """Get cached competition analysis if still valid."""
        try:
            cache_key = COMPETITION_CACHE_KEY.format(category_key=category_key)
            cached = await self.redis.get(cache_key)

            if cached:
                data = json.loads(cached)
                return CompetitionAnalysis.from_dict(data)
        except Exception as e:
            logger.warning(f"Error reading analysis cache: {e}")

        return None

    async def _cache_analysis(
        self,
        category_key: str,
        analysis: CompetitionAnalysis,
    ) -> None:
        """Cache competition analysis."""
        try:
            cache_key = COMPETITION_CACHE_KEY.format(category_key=category_key)
            await self.redis.setex(
                cache_key,
                ANALYSIS_CACHE_TTL,
                json.dumps(analysis.to_dict()),
            )
        except Exception as e:
            logger.warning(f"Error caching analysis: {e}")

    def _analyze_from_streams(
        self,
        category_key: str,
        category_name: str,
        streams: List[Any],
        viewer_counts: List[int],
        is_peak: bool,
        hour: int,
        data_source: str,
    ) -> CompetitionAnalysis:
        """Analyze competition from real stream data.

        Args:
            category_key: Category identifier
            category_name: Display name
            streams: List of stream objects or dicts
            viewer_counts: List of viewer counts
            is_peak: Whether it's peak hours
            hour: Current hour (UTC)
            data_source: Source of data ("live_api" or "cached")

        Returns:
            CompetitionAnalysis with real metrics
        """
        stream_count = len(streams)
        total_viewers = sum(viewer_counts) if viewer_counts else 0
        avg_viewers = total_viewers / stream_count if stream_count > 0 else 0
        top_viewers = max(viewer_counts) if viewer_counts else 0

        # Get baseline for this category
        baseline = CATEGORY_BASELINES.get(
            category_key.lower(),
            CATEGORY_BASELINES["default"]
        )

        # Calculate scores
        saturation_score = self._calculate_saturation_score(
            stream_count,
            baseline["streams"],
        )

        concentration_score = self._calculate_concentration_score(viewer_counts)

        # Combined opportunity score (weighted average)
        # Saturation matters more for discoverability
        opportunity_score = (
            saturation_score * 0.6 +
            concentration_score * 0.4
        )

        # Adjust for peak hours (competition is higher during peak)
        if is_peak:
            opportunity_score *= 0.85  # 15% penalty during peak

        # Confidence based on data quality
        confidence = 85 if data_source == "live_api" else 70

        return CompetitionAnalysis(
            category_key=category_key,
            category_name=category_name,
            live_stream_count=stream_count,
            total_viewers=total_viewers,
            avg_viewers_per_stream=round(avg_viewers, 2),
            top_streamer_viewers=top_viewers,
            stream_saturation_score=round(saturation_score, 2),
            viewer_concentration_score=round(concentration_score, 2),
            opportunity_score=round(opportunity_score, 2),
            is_peak_hours=is_peak,
            hour_of_day=hour,
            confidence=confidence,
            analyzed_at=datetime.now(timezone.utc),
            data_source=data_source,
        )

    def _analyze_from_baseline(
        self,
        category_key: str,
        category_name: str,
        is_peak: bool,
        hour: int,
    ) -> CompetitionAnalysis:
        """Create analysis from baseline estimates when no real data available.

        Uses category baselines with time-based adjustments.
        """
        baseline = CATEGORY_BASELINES.get(
            category_key.lower(),
            CATEGORY_BASELINES["default"]
        )

        # Estimate current streams based on time of day
        # Peak hours have ~1.5x more streams
        time_multiplier = 1.5 if is_peak else 0.8
        estimated_streams = int(baseline["streams"] * time_multiplier)
        estimated_viewers = int(baseline["viewers"] * time_multiplier)

        if estimated_streams > 0:
            avg_viewers = estimated_viewers / estimated_streams
        else:
            avg_viewers = 0

        # Estimate top streamer (typically 10-20% of total viewers)
        top_viewers = int(estimated_viewers * 0.15)

        # Calculate scores using baseline as reference
        saturation_score = self._calculate_saturation_score(
            estimated_streams,
            baseline["streams"],
        )

        # Assume moderate concentration for baseline
        concentration_score = 55.0  # Middle-ground estimate

        opportunity_score = (
            saturation_score * 0.6 +
            concentration_score * 0.4
        )

        if is_peak:
            opportunity_score *= 0.85

        return CompetitionAnalysis(
            category_key=category_key,
            category_name=category_name,
            live_stream_count=estimated_streams,
            total_viewers=estimated_viewers,
            avg_viewers_per_stream=round(avg_viewers, 2),
            top_streamer_viewers=top_viewers,
            stream_saturation_score=round(saturation_score, 2),
            viewer_concentration_score=round(concentration_score, 2),
            opportunity_score=round(opportunity_score, 2),
            is_peak_hours=is_peak,
            hour_of_day=hour,
            confidence=35,  # Low confidence for baseline estimates
            analyzed_at=datetime.now(timezone.utc),
            data_source="baseline_estimate",
        )

    def _calculate_saturation_score(
        self,
        stream_count: int,
        category_baseline: int,
    ) -> float:
        """Score based on stream count vs category baseline.

        Score = 100 * (1 - stream_count / (baseline * 2))
        Clamped to 0-100

        Lower stream count = higher score (less competition)

        Args:
            stream_count: Current number of live streams
            category_baseline: Typical stream count for this category

        Returns:
            Score from 0-100 (higher = less saturated = better opportunity)
        """
        if category_baseline <= 0:
            return 50.0  # Default to middle if no baseline

        # Calculate ratio (streams / baseline)
        # At baseline, ratio = 1.0
        # At 2x baseline, ratio = 2.0 (very saturated)
        # At 0.5x baseline, ratio = 0.5 (low competition)
        ratio = stream_count / category_baseline

        # Convert to score: 100 * (1 - ratio/2)
        # At ratio=0: score=100 (no competition)
        # At ratio=1: score=50 (normal)
        # At ratio=2: score=0 (very saturated)
        score = 100 * (1 - ratio / 2)

        # Clamp to 0-100
        return max(0.0, min(100.0, score))

    def _calculate_concentration_score(
        self,
        viewer_counts: List[int],
    ) -> float:
        """Score based on viewer distribution (simplified Gini coefficient).

        If top streamers have most viewers = low score (hard to compete)
        If viewers are spread evenly = high score (easier to get discovered)

        Uses simplified Gini: 1 - sum((viewer_i / total)^2)

        Args:
            viewer_counts: List of viewer counts per stream

        Returns:
            Score from 0-100 (higher = more distributed = better opportunity)
        """
        if not viewer_counts or len(viewer_counts) < 2:
            return 50.0  # Default to middle if insufficient data

        total_viewers = sum(viewer_counts)
        if total_viewers == 0:
            return 50.0

        # Calculate Herfindahl-Hirschman Index (HHI)
        # Sum of squared market shares
        # Lower HHI = more distributed = better
        hhi = sum((v / total_viewers) ** 2 for v in viewer_counts)

        # Convert HHI to score
        # HHI ranges from 1/n (perfect distribution) to 1 (monopoly)
        # We want: low HHI = high score
        n = len(viewer_counts)
        min_hhi = 1 / n  # Perfect distribution

        # Normalize: (1 - HHI) / (1 - min_HHI) * 100
        if hhi >= 1:
            return 0.0

        normalized = (1 - hhi) / (1 - min_hhi) if min_hhi < 1 else 0
        score = normalized * 100

        return max(0.0, min(100.0, score))

    def _is_peak_hours(
        self,
        hour_utc: int,
        timezone_str: str = "America/New_York",
    ) -> bool:
        """Check if current hour is peak streaming time.

        Peak hours: 2-5 PM and 7-11 PM in user's timezone

        Args:
            hour_utc: Current hour in UTC
            timezone_str: User's timezone string

        Returns:
            True if currently peak hours
        """
        try:
            # Simple timezone offset handling
            # For more accurate handling, use pytz or zoneinfo
            tz_offsets = {
                "America/New_York": -5,
                "America/Chicago": -6,
                "America/Denver": -7,
                "America/Los_Angeles": -8,
                "Europe/London": 0,
                "Europe/Paris": 1,
                "Europe/Berlin": 1,
                "Asia/Tokyo": 9,
                "Australia/Sydney": 11,
            }

            offset = tz_offsets.get(timezone_str, -5)  # Default to EST
            local_hour = (hour_utc + offset) % 24

            # Check if in peak hours
            return (
                local_hour in PEAK_HOURS_AFTERNOON or
                local_hour in PEAK_HOURS_EVENING
            )
        except Exception:
            # Default to checking UTC hours
            return 14 <= hour_utc <= 17 or 19 <= hour_utc <= 23

    def get_baseline_for_category(self, category_key: str) -> Dict[str, int]:
        """Get baseline metrics for a category.

        Args:
            category_key: Category identifier

        Returns:
            Dict with streams and viewers baselines
        """
        return CATEGORY_BASELINES.get(
            category_key.lower(),
            CATEGORY_BASELINES["default"]
        )


# =============================================================================
# Singleton Instance
# =============================================================================

_competition_analyzer: Optional[CompetitionAnalyzer] = None


def get_competition_analyzer() -> CompetitionAnalyzer:
    """Get or create the CompetitionAnalyzer singleton.

    Returns:
        CompetitionAnalyzer instance
    """
    global _competition_analyzer
    if _competition_analyzer is None:
        _competition_analyzer = CompetitionAnalyzer()
    return _competition_analyzer


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    # Main class
    "CompetitionAnalyzer",
    "get_competition_analyzer",
    # Data classes
    "CompetitionAnalysis",
    # Constants
    "CATEGORY_BASELINES",
    # Exceptions
    "CompetitionAnalysisError",
]
