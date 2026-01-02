"""
Creator Intel V2 - Decay Manager

Manages data freshness and confidence decay across all intel.
Older data = lower confidence = less weight in recommendations.
"""

from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class FreshnessLevel(Enum):
    """Enumeration of data freshness levels."""
    FRESH = "fresh"
    RECENT = "recent"
    STALE = "stale"
    OLD = "old"
    EXPIRED = "expired"


@dataclass
class DecayConfig:
    """
    Configuration for decay calculation.
    
    Attributes:
        fresh_threshold: Hours until data is no longer "fresh"
        recent_threshold: Hours until data is no longer "recent"
        stale_threshold: Hours until data is no longer "stale"
        old_threshold: Hours until data is no longer "old"
        expired_threshold: Hours until data is "expired"
        
        fresh_confidence: Confidence score for fresh data
        recent_confidence: Confidence score for recent data
        stale_confidence: Confidence score for stale data
        old_confidence: Confidence score for old data
        expired_confidence: Confidence score for expired data
    """
    # Time thresholds (in hours)
    fresh_threshold: float = 1.0
    recent_threshold: float = 4.0
    stale_threshold: float = 12.0
    old_threshold: float = 24.0
    expired_threshold: float = 48.0
    
    # Confidence levels (0-100)
    fresh_confidence: int = 100
    recent_confidence: int = 80
    stale_confidence: int = 50
    old_confidence: int = 30
    expired_confidence: int = 10


@dataclass
class DecayResult:
    """
    Result of decay calculation.
    
    Attributes:
        confidence: Calculated confidence score (0-100)
        level: Freshness level enum
        label: Human-readable freshness label
        age_hours: Age of data in hours
        should_refresh: Whether data should be refreshed
    """
    confidence: int
    level: FreshnessLevel
    label: str
    age_hours: float
    should_refresh: bool


class DecayManager:
    """
    Manages data freshness and confidence decay.
    
    The decay manager calculates confidence scores based on data age,
    helping the system prioritize fresh data and flag stale data for refresh.
    
    Usage:
        decay = DecayManager()
        result = decay.calculate_decay(fetched_at)
        
        # Apply decay to a score
        adjusted_score = decay.apply_decay(raw_score, fetched_at)
        
        # Check if refresh needed
        if decay.should_refresh(fetched_at):
            await refresh_data()
    """
    
    def __init__(self, config: Optional[DecayConfig] = None) -> None:
        """
        Initialize the decay manager.
        
        Args:
            config: Optional custom decay configuration
        """
        self.config = config or DecayConfig()
    
    def calculate_decay(self, fetched_at: Optional[datetime]) -> DecayResult:
        """
        Calculate decay result for a given fetch timestamp.
        
        Args:
            fetched_at: When the data was fetched (timezone-aware)
            
        Returns:
            DecayResult with confidence, level, and metadata
        """
        if not fetched_at:
            return DecayResult(
                confidence=self.config.expired_confidence,
                level=FreshnessLevel.EXPIRED,
                label="Expired",
                age_hours=float("inf"),
                should_refresh=True,
            )
        
        now = datetime.now(timezone.utc)
        
        # Ensure fetched_at is timezone-aware
        if fetched_at.tzinfo is None:
            fetched_at = fetched_at.replace(tzinfo=timezone.utc)
        
        age_hours = (now - fetched_at).total_seconds() / 3600
        
        # Determine level and confidence
        if age_hours < self.config.fresh_threshold:
            level = FreshnessLevel.FRESH
            confidence = self.config.fresh_confidence
            label = "Fresh"
        elif age_hours < self.config.recent_threshold:
            level = FreshnessLevel.RECENT
            confidence = self.config.recent_confidence
            label = "Recent"
        elif age_hours < self.config.stale_threshold:
            level = FreshnessLevel.STALE
            confidence = self.config.stale_confidence
            label = "Stale"
        elif age_hours < self.config.old_threshold:
            level = FreshnessLevel.OLD
            confidence = self.config.old_confidence
            label = "Old"
        else:
            level = FreshnessLevel.EXPIRED
            confidence = self.config.expired_confidence
            label = "Expired"
        
        # Should refresh if not fresh or recent
        should_refresh = level not in (FreshnessLevel.FRESH, FreshnessLevel.RECENT)
        
        return DecayResult(
            confidence=confidence,
            level=level,
            label=label,
            age_hours=round(age_hours, 2),
            should_refresh=should_refresh,
        )
    
    def calculate_confidence(self, fetched_at: Optional[datetime]) -> int:
        """
        Calculate confidence score based on data age.
        
        Args:
            fetched_at: When the data was fetched
            
        Returns:
            Confidence score 0-100
        """
        return self.calculate_decay(fetched_at).confidence
    
    def apply_decay(
        self,
        raw_score: float,
        fetched_at: Optional[datetime],
        min_score: float = 0.0,
    ) -> float:
        """
        Apply decay to a raw score based on data age.
        
        Args:
            raw_score: The original score
            fetched_at: When the underlying data was fetched
            min_score: Minimum score to return
            
        Returns:
            Decayed score
        """
        confidence = self.calculate_confidence(fetched_at)
        decay_factor = confidence / 100.0
        
        decayed = raw_score * decay_factor
        return max(min_score, decayed)
    
    def get_freshness_label(self, fetched_at: Optional[datetime]) -> str:
        """
        Get human-readable freshness label.
        
        Args:
            fetched_at: When the data was fetched
            
        Returns:
            Label string (e.g., "Fresh", "Stale")
        """
        return self.calculate_decay(fetched_at).label
    
    def should_refresh(self, fetched_at: Optional[datetime]) -> bool:
        """
        Check if data should be refreshed.
        
        Args:
            fetched_at: When the data was fetched
            
        Returns:
            True if data should be refreshed
        """
        return self.calculate_decay(fetched_at).should_refresh
    
    def get_next_refresh_time(
        self,
        fetched_at: Optional[datetime],
        target_level: FreshnessLevel = FreshnessLevel.RECENT,
    ) -> Optional[datetime]:
        """
        Calculate when data will need refresh to maintain target freshness.
        
        Args:
            fetched_at: When the data was fetched
            target_level: Desired freshness level to maintain
            
        Returns:
            Datetime when refresh should occur, or None if already past
        """
        if not fetched_at:
            return datetime.now(timezone.utc)
        
        # Ensure timezone-aware
        if fetched_at.tzinfo is None:
            fetched_at = fetched_at.replace(tzinfo=timezone.utc)
        
        # Get threshold for target level
        threshold_map = {
            FreshnessLevel.FRESH: self.config.fresh_threshold,
            FreshnessLevel.RECENT: self.config.recent_threshold,
            FreshnessLevel.STALE: self.config.stale_threshold,
            FreshnessLevel.OLD: self.config.old_threshold,
            FreshnessLevel.EXPIRED: self.config.expired_threshold,
        }
        
        threshold_hours = threshold_map.get(target_level, self.config.recent_threshold)
        refresh_time = fetched_at + timedelta(hours=threshold_hours)
        
        now = datetime.now(timezone.utc)
        if refresh_time <= now:
            return None  # Already past refresh time
        
        return refresh_time
    
    def interpolate_confidence(
        self,
        fetched_at: Optional[datetime],
    ) -> int:
        """
        Calculate smoothly interpolated confidence score.
        
        Instead of discrete levels, this provides a smooth decay curve.
        
        Args:
            fetched_at: When the data was fetched
            
        Returns:
            Interpolated confidence score 0-100
        """
        if not fetched_at:
            return self.config.expired_confidence
        
        now = datetime.now(timezone.utc)
        
        if fetched_at.tzinfo is None:
            fetched_at = fetched_at.replace(tzinfo=timezone.utc)
        
        age_hours = (now - fetched_at).total_seconds() / 3600
        
        # Define interpolation points
        points = [
            (0, self.config.fresh_confidence),
            (self.config.fresh_threshold, self.config.fresh_confidence),
            (self.config.recent_threshold, self.config.recent_confidence),
            (self.config.stale_threshold, self.config.stale_confidence),
            (self.config.old_threshold, self.config.old_confidence),
            (self.config.expired_threshold, self.config.expired_confidence),
        ]
        
        # Find the two points to interpolate between
        for i in range(len(points) - 1):
            t1, c1 = points[i]
            t2, c2 = points[i + 1]
            
            if age_hours <= t2:
                # Linear interpolation
                if t2 == t1:
                    return c1
                ratio = (age_hours - t1) / (t2 - t1)
                return int(c1 + (c2 - c1) * ratio)
        
        # Beyond expired threshold
        return self.config.expired_confidence


# Singleton instance
_decay_manager: Optional[DecayManager] = None


def get_decay_manager(config: Optional[DecayConfig] = None) -> DecayManager:
    """
    Get the singleton decay manager instance.
    
    Args:
        config: Optional custom configuration (only used on first call)
        
    Returns:
        DecayManager instance
    """
    global _decay_manager
    if _decay_manager is None:
        _decay_manager = DecayManager(config)
    return _decay_manager


def reset_decay_manager() -> None:
    """Reset the singleton instance (useful for testing)."""
    global _decay_manager
    _decay_manager = None
