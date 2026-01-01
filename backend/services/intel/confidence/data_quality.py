"""
Data Quality Assessment

Assess the quality and reliability of underlying data.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Optional


class DataQualityLevel(Enum):
    """Data quality levels."""
    EXCELLENT = "excellent"  # Fresh, large sample, consistent
    GOOD = "good"           # Usable with confidence
    FAIR = "fair"           # Usable but verify
    POOR = "poor"           # Directional only
    INSUFFICIENT = "insufficient"  # Not enough data


@dataclass
class DataQualityAssessment:
    """Assessment of data quality."""
    level: DataQualityLevel
    score: int  # 0-100
    sample_size: int
    freshness_hours: float
    issues: list
    recommendations: list
    
    @property
    def is_usable(self) -> bool:
        """Whether data is usable for recommendations."""
        return self.level in (
            DataQualityLevel.EXCELLENT,
            DataQualityLevel.GOOD,
            DataQualityLevel.FAIR,
        )


def assess_data_quality(
    sample_size: int,
    fetched_at: Optional[datetime] = None,
    fetched_at_str: Optional[str] = None,
    min_sample: int = 10,
    max_age_hours: float = 24.0,
) -> DataQualityAssessment:
    """
    Assess data quality based on sample size and freshness.
    
    Args:
        sample_size: Number of data points
        fetched_at: When data was fetched (datetime)
        fetched_at_str: When data was fetched (ISO string)
        min_sample: Minimum sample size for "good" quality
        max_age_hours: Maximum age for "good" quality
    
    Returns:
        DataQualityAssessment with level, score, and recommendations
    """
    issues = []
    recommendations = []
    
    # Parse fetched_at if string provided
    freshness_hours = 0.0
    if fetched_at_str and not fetched_at:
        try:
            if fetched_at_str.endswith("Z"):
                fetched_at = datetime.fromisoformat(
                    fetched_at_str.replace("Z", "+00:00")
                )
            else:
                fetched_at = datetime.fromisoformat(fetched_at_str)
        except (ValueError, TypeError):
            pass
    
    # Calculate freshness
    if fetched_at:
        now = datetime.now(timezone.utc)
        if fetched_at.tzinfo is None:
            fetched_at = fetched_at.replace(tzinfo=timezone.utc)
        freshness_hours = (now - fetched_at).total_seconds() / 3600
    else:
        freshness_hours = 48.0  # Assume stale if unknown
        issues.append("Data fetch time unknown")
    
    # Assess sample size
    sample_score = 0
    if sample_size >= 30:
        sample_score = 50
    elif sample_size >= min_sample:
        sample_score = 30 + (sample_size - min_sample) / (30 - min_sample) * 20
    elif sample_size >= 5:
        sample_score = 15 + (sample_size - 5) / (min_sample - 5) * 15
    elif sample_size > 0:
        sample_score = sample_size * 3
    else:
        issues.append("No data available")
        recommendations.append("Wait for data collection")
    
    if sample_size < min_sample:
        issues.append(f"Small sample size ({sample_size} < {min_sample})")
        recommendations.append("Results may not be representative")
    
    # Assess freshness
    freshness_score = 0
    if freshness_hours <= 6:
        freshness_score = 50
    elif freshness_hours <= 12:
        freshness_score = 40
    elif freshness_hours <= max_age_hours:
        freshness_score = 30
    elif freshness_hours <= 48:
        freshness_score = 20
        issues.append(f"Data is {freshness_hours:.1f} hours old")
    else:
        freshness_score = 10
        issues.append(f"Data is stale ({freshness_hours:.1f} hours old)")
        recommendations.append("Refresh data for accurate results")
    
    # Calculate total score
    total_score = int(sample_score + freshness_score)
    
    # Determine level
    if total_score >= 80 and not issues:
        level = DataQualityLevel.EXCELLENT
    elif total_score >= 60:
        level = DataQualityLevel.GOOD
    elif total_score >= 40:
        level = DataQualityLevel.FAIR
    elif total_score >= 20:
        level = DataQualityLevel.POOR
    else:
        level = DataQualityLevel.INSUFFICIENT
    
    return DataQualityAssessment(
        level=level,
        score=total_score,
        sample_size=sample_size,
        freshness_hours=round(freshness_hours, 1),
        issues=issues,
        recommendations=recommendations,
    )
