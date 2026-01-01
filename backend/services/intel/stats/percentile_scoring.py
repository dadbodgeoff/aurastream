"""
Percentile-Based Scoring

Convert raw values to intuitive 0-100 scores using percentile thresholds.
"""

import math
from dataclasses import dataclass
from typing import Optional


@dataclass
class PercentileThresholds:
    """Percentile thresholds for scoring."""
    p25: float
    p50: float
    p75: float
    p90: float
    
    @classmethod
    def from_values(cls, values: list) -> "PercentileThresholds":
        """Build thresholds from a list of values."""
        from .core import calculate_percentile
        
        if not values:
            return cls(p25=0, p50=0, p75=0, p90=0)
        
        return cls(
            p25=calculate_percentile(values, 25),
            p50=calculate_percentile(values, 50),
            p75=calculate_percentile(values, 75),
            p90=calculate_percentile(values, 90),
        )


def calculate_percentile_score(
    value: float,
    thresholds: Optional[PercentileThresholds] = None,
    p25: float = 0,
    p50: float = 0,
    p75: float = 0,
    p90: float = 0,
) -> float:
    """
    Convert raw value to 0-100 percentile score.
    
    Uses linear interpolation between known percentile thresholds.
    A score of 75 means "better than 75% of items."
    
    Args:
        value: Raw value to convert
        thresholds: PercentileThresholds object (preferred)
        p25, p50, p75, p90: Individual thresholds (fallback)
    
    Returns:
        Percentile score (0-100)
    """
    # Use thresholds object if provided
    if thresholds:
        p25, p50, p75, p90 = thresholds.p25, thresholds.p50, thresholds.p75, thresholds.p90
    
    # Handle edge cases
    if p90 <= 0:
        return 50.0  # No data, return median
    
    if value <= 0:
        return 0.0
    
    # Below 25th percentile
    if value <= p25:
        if p25 <= 0:
            return 0.0
        return (value / p25) * 25.0
    
    # 25th to 50th percentile
    if value <= p50:
        if p50 <= p25:
            return 25.0
        return 25.0 + ((value - p25) / (p50 - p25)) * 25.0
    
    # 50th to 75th percentile
    if value <= p75:
        if p75 <= p50:
            return 50.0
        return 50.0 + ((value - p50) / (p75 - p50)) * 25.0
    
    # 75th to 90th percentile
    if value <= p90:
        if p90 <= p75:
            return 75.0
        return 75.0 + ((value - p75) / (p90 - p75)) * 15.0
    
    # Above 90th percentile (asymptotic approach to 100)
    excess_ratio = (value - p90) / max(p90, 1)
    bonus = min(10.0, 10.0 * (1 - math.exp(-excess_ratio)))
    return min(100.0, 90.0 + bonus)
