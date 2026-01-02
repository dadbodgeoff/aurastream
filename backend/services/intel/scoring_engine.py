"""
Creator Intel Scoring Engine

Lightweight orchestrator that uses modular components.
This replaces the 1200+ line monolith with a clean facade.
"""

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple, Any

import redis.asyncio as redis

from .category_stats import CategoryStats
from .stats import (
    calculate_z_score,
    calculate_percentile_score,
    calculate_percentile,
    PercentileThresholds,
)
from .decay import freshness_decay, recency_boost, velocity_from_age
from .confidence import calculate_confidence, calculate_score_variance
from .scoring import (
    combine_scores,
    weighted_harmonic_mean,
    normalize_across_categories,
    calculate_category_difficulty,
)

logger = logging.getLogger(__name__)

# Configuration
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
YOUTUBE_GAMES_KEY = "youtube:games:{game}"
CATEGORY_STATS_KEY = "intel:category_stats:{category}"
CATEGORY_STATS_TTL = 3600  # 1 hour


class ScoringEngine:
    """
    Enterprise-grade scoring engine for Creator Intel.
    
    Provides centralized access to all scoring functions with Redis caching.
    This is a lightweight facade over the modular components.
    
    Example:
        engine = get_scoring_engine()
        stats = await engine.build_category_stats("fortnite")
        z = engine.calculate_z_score(500000, stats.view_mean, stats.view_std)
    """
    
    def __init__(self):
        self._redis: Optional[redis.Redis] = None
        self._stats_cache: Dict[str, Tuple[CategoryStats, datetime]] = {}
        self._cache_ttl = timedelta(hours=1)
    
    async def _get_redis(self) -> redis.Redis:
        """Get or create Redis connection."""
        if self._redis is None:
            self._redis = redis.from_url(REDIS_URL, decode_responses=True)
        return self._redis
    
    async def close(self) -> None:
        """Close Redis connection and clear caches."""
        if self._redis:
            await self._redis.aclose()
            self._redis = None
        self._stats_cache.clear()
    
    # =========================================================================
    # Category Stats
    # =========================================================================
    
    async def build_category_stats(
        self,
        category_key: str,
        force_refresh: bool = False,
    ) -> Optional[CategoryStats]:
        """
        Build statistics from cached YouTube data.
        
        Args:
            category_key: Category identifier
            force_refresh: Bypass cache and recalculate
        
        Returns:
            CategoryStats or None if no data
        """
        # Check in-memory cache
        if not force_refresh and category_key in self._stats_cache:
            cached_stats, cached_at = self._stats_cache[category_key]
            if datetime.now(timezone.utc) - cached_at < self._cache_ttl:
                return cached_stats
        
        redis_client = await self._get_redis()
        
        # Check Redis cache
        if not force_refresh:
            stats_key = CATEGORY_STATS_KEY.format(category=category_key)
            cached_json = await redis_client.get(stats_key)
            if cached_json:
                try:
                    stats = CategoryStats.from_dict(json.loads(cached_json))
                    self._stats_cache[category_key] = (stats, datetime.now(timezone.utc))
                    return stats
                except Exception as e:
                    logger.warning(f"Failed to parse cached stats: {e}")
        
        # Fetch raw video data
        youtube_key = YOUTUBE_GAMES_KEY.format(game=category_key)
        raw_data = await redis_client.get(youtube_key)
        
        if not raw_data:
            logger.warning(f"No YouTube data for: {category_key}")
            return None
        
        try:
            data = json.loads(raw_data)
            videos = data.get("videos", [])
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse YouTube data: {e}")
            return None
        
        if not videos:
            return None
        
        # Build stats with outlier removal
        stats = CategoryStats.from_videos(category_key, videos, remove_outliers=True)
        
        # Cache in Redis
        try:
            stats_key = CATEGORY_STATS_KEY.format(category=category_key)
            await redis_client.setex(
                stats_key,
                CATEGORY_STATS_TTL,
                json.dumps(stats.to_dict()),
            )
        except Exception as e:
            logger.warning(f"Failed to cache stats: {e}")
        
        # Cache in memory
        self._stats_cache[category_key] = (stats, datetime.now(timezone.utc))
        
        logger.info(
            f"Built stats for {category_key}: n={stats.sample_count}, "
            f"mean={stats.view_mean:.0f}, p90={stats.view_p90:.0f}, "
            f"outliers_removed={stats.outliers_removed}"
        )
        
        return stats
    
    # =========================================================================
    # Convenience Methods (delegate to modules)
    # =========================================================================
    
    def calculate_z_score(self, value: float, mean: float, std: float) -> float:
        """Calculate z-score."""
        return calculate_z_score(value, mean, std)
    
    def calculate_percentile_score(
        self,
        value: float,
        p25: float,
        p50: float,
        p75: float,
        p90: float,
    ) -> float:
        """Calculate percentile score."""
        return calculate_percentile_score(
            value,
            thresholds=PercentileThresholds(p25=p25, p50=p50, p75=p75, p90=p90),
        )
    
    def freshness_decay(self, hours_old: float, half_life: float = 24.0) -> float:
        """Calculate freshness decay."""
        return freshness_decay(hours_old, half_life)
    
    def recency_boost(self, hours_old: float, boost_window: float = 6.0) -> float:
        """Calculate recency boost."""
        return recency_boost(hours_old, boost_window)
    
    def calculate_confidence(
        self,
        sample_size: int,
        score_variance: float = 0.0,
        data_freshness_hours: float = 0.0,
    ) -> int:
        """Calculate confidence score."""
        return calculate_confidence(sample_size, score_variance, data_freshness_hours)
    
    def combine_scores(
        self,
        scores: Dict[str, float],
        weights: Dict[str, float],
        confidence_factors: Optional[Dict[str, float]] = None,
    ) -> Tuple[float, int]:
        """Combine multiple scores."""
        return combine_scores(scores, weights, confidence_factors)
    
    def normalize_across_categories(
        self,
        category_scores: Dict[str, float],
        category_stats: Dict[str, CategoryStats],
    ) -> Dict[str, float]:
        """Normalize across categories."""
        return normalize_across_categories(category_scores, category_stats)
    
    def calculate_category_difficulty(self, stats: CategoryStats) -> float:
        """Calculate category difficulty."""
        return calculate_category_difficulty(
            view_mean=stats.view_mean,
            avg_stream_count=stats.avg_stream_count,
            avg_total_viewers=stats.avg_total_viewers,
        )


# ============================================================================
# Singleton
# ============================================================================

_scoring_engine: Optional[ScoringEngine] = None


def get_scoring_engine() -> ScoringEngine:
    """Get or create the ScoringEngine singleton."""
    global _scoring_engine
    if _scoring_engine is None:
        _scoring_engine = ScoringEngine()
    return _scoring_engine


def create_scoring_engine() -> ScoringEngine:
    """Create a new ScoringEngine instance (for testing)."""
    return ScoringEngine()


# ============================================================================
# Re-exports for backwards compatibility
# ============================================================================

__all__ = [
    # Main class
    "ScoringEngine",
    "get_scoring_engine",
    "create_scoring_engine",
    # Data classes
    "CategoryStats",
    # Stats functions
    "calculate_z_score",
    "calculate_percentile_score",
    "calculate_percentile",
    # Decay functions
    "freshness_decay",
    "recency_boost",
    "velocity_from_age",
    # Confidence
    "calculate_confidence",
    "calculate_score_variance",
    # Scoring
    "combine_scores",
    "weighted_harmonic_mean",
    "normalize_across_categories",
    "calculate_category_difficulty",
]
