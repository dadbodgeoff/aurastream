"""
Category Statistics

Per-category baseline statistics for normalization and scoring.
"""

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .stats import calculate_percentile, calculate_std, calculate_mean
from .stats.outliers import remove_outliers_iqr
from .decay import velocity_from_timestamps

logger = logging.getLogger(__name__)


@dataclass
class CategoryStats:
    """
    Per-category baseline statistics for normalization.
    
    Enables fair comparison of videos within a category
    and normalization across different-sized categories.
    """
    category_key: str
    
    # View statistics
    view_mean: float = 0.0
    view_std: float = 0.0
    view_p25: float = 0.0
    view_p50: float = 0.0  # median
    view_p75: float = 0.0
    view_p90: float = 0.0
    
    # Velocity statistics (views per hour)
    velocity_mean: float = 0.0
    velocity_std: float = 0.0
    velocity_p75: float = 0.0
    velocity_p90: float = 0.0
    
    # Engagement statistics
    engagement_mean: float = 0.0
    engagement_std: float = 0.0
    
    # Competition statistics (from Twitch)
    avg_stream_count: float = 0.0
    avg_total_viewers: float = 0.0
    
    # Metadata
    sample_count: int = 0
    outliers_removed: int = 0
    computed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "category_key": self.category_key,
            "view_mean": self.view_mean,
            "view_std": self.view_std,
            "view_p25": self.view_p25,
            "view_p50": self.view_p50,
            "view_p75": self.view_p75,
            "view_p90": self.view_p90,
            "velocity_mean": self.velocity_mean,
            "velocity_std": self.velocity_std,
            "velocity_p75": self.velocity_p75,
            "velocity_p90": self.velocity_p90,
            "engagement_mean": self.engagement_mean,
            "engagement_std": self.engagement_std,
            "avg_stream_count": self.avg_stream_count,
            "avg_total_viewers": self.avg_total_viewers,
            "sample_count": self.sample_count,
            "outliers_removed": self.outliers_removed,
            "computed_at": self.computed_at.isoformat(),
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CategoryStats":
        """Create from dictionary."""
        computed_at = data.get("computed_at")
        if isinstance(computed_at, str):
            computed_at = datetime.fromisoformat(computed_at.replace("Z", "+00:00"))
        elif computed_at is None:
            computed_at = datetime.now(timezone.utc)
        
        return cls(
            category_key=data.get("category_key", ""),
            view_mean=float(data.get("view_mean", 0)),
            view_std=float(data.get("view_std", 0)),
            view_p25=float(data.get("view_p25", 0)),
            view_p50=float(data.get("view_p50", 0)),
            view_p75=float(data.get("view_p75", 0)),
            view_p90=float(data.get("view_p90", 0)),
            velocity_mean=float(data.get("velocity_mean", 0)),
            velocity_std=float(data.get("velocity_std", 0)),
            velocity_p75=float(data.get("velocity_p75", 0)),
            velocity_p90=float(data.get("velocity_p90", 0)),
            engagement_mean=float(data.get("engagement_mean", 0)),
            engagement_std=float(data.get("engagement_std", 0)),
            avg_stream_count=float(data.get("avg_stream_count", 0)),
            avg_total_viewers=float(data.get("avg_total_viewers", 0)),
            sample_count=int(data.get("sample_count", 0)),
            outliers_removed=int(data.get("outliers_removed", 0)),
            computed_at=computed_at,
        )
    
    @classmethod
    def from_videos(
        cls,
        category_key: str,
        videos: List[Dict[str, Any]],
        remove_outliers: bool = True,
    ) -> "CategoryStats":
        """
        Build statistics from a list of video data.
        
        Args:
            category_key: Category identifier
            videos: List of video dictionaries
            remove_outliers: Whether to remove outliers before computing
        
        Returns:
            CategoryStats with computed values
        """
        now = datetime.now(timezone.utc)
        
        # Extract raw metrics
        raw_views: List[float] = []
        velocities: List[float] = []
        engagements: List[float] = []
        
        for video in videos:
            view_count = video.get("view_count", 0)
            if view_count > 0:
                raw_views.append(float(view_count))
            
            # Calculate velocity
            published_at = video.get("published_at")
            if published_at and view_count > 0:
                velocity = velocity_from_timestamps(view_count, published_at, now)
                if velocity is not None:
                    velocities.append(velocity)
            
            # Extract engagement
            engagement = video.get("engagement_rate")
            if engagement is not None and engagement > 0:
                engagements.append(float(engagement))
        
        # Remove outliers if requested
        outliers_removed = 0
        if remove_outliers and len(raw_views) >= 10:
            clean_views = remove_outliers_iqr(raw_views, k=1.5)
            outliers_removed = len(raw_views) - len(clean_views)
            views = clean_views
        else:
            views = raw_views
        
        # Calculate view statistics
        view_mean = calculate_mean(views)
        view_std = calculate_std(views, view_mean)
        
        # Calculate velocity statistics
        velocity_mean = calculate_mean(velocities)
        velocity_std = calculate_std(velocities, velocity_mean)
        
        # Calculate engagement statistics
        engagement_mean = calculate_mean(engagements)
        engagement_std = calculate_std(engagements, engagement_mean)
        
        return cls(
            category_key=category_key,
            view_mean=view_mean,
            view_std=view_std,
            view_p25=calculate_percentile(views, 25),
            view_p50=calculate_percentile(views, 50),
            view_p75=calculate_percentile(views, 75),
            view_p90=calculate_percentile(views, 90),
            velocity_mean=velocity_mean,
            velocity_std=velocity_std,
            velocity_p75=calculate_percentile(velocities, 75),
            velocity_p90=calculate_percentile(velocities, 90),
            engagement_mean=engagement_mean,
            engagement_std=engagement_std,
            sample_count=len(videos),
            outliers_removed=outliers_removed,
            computed_at=now,
        )
