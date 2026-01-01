"""
Confidence Calculator

Calculate confidence scores for recommendations based on
sample size, variance, and data freshness.
"""

import math
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class ConfidenceFactors:
    """Factors that influence confidence."""
    sample_size: int
    score_variance: float = 0.0
    data_freshness_hours: float = 0.0
    min_sample_for_high_confidence: int = 30


@dataclass
class ConfidenceResult:
    """Detailed confidence calculation result."""
    score: int  # 0-100
    sample_confidence: float
    consistency_bonus: float
    freshness_bonus: float
    level: str  # "very_high", "high", "moderate", "low", "very_low"
    
    @property
    def is_reliable(self) -> bool:
        """Whether the confidence is high enough to trust."""
        return self.score >= 50


def calculate_confidence(
    sample_size: int,
    score_variance: float = 0.0,
    data_freshness_hours: float = 0.0,
    min_sample_for_high_confidence: int = 30,
) -> int:
    """
    Calculate confidence score (0-100).
    
    Components:
    - Sample size: 0-50 points (logarithmic scaling)
    - Consistency: 0-30 points (lower variance = higher)
    - Freshness: 0-20 points (newer data = higher)
    
    Args:
        sample_size: Number of data points
        score_variance: Variance in scores (0-1 scale)
        data_freshness_hours: Age of data in hours
        min_sample_for_high_confidence: Sample size for max confidence
    
    Returns:
        Confidence score (0-100)
    """
    result = calculate_confidence_detailed(
        ConfidenceFactors(
            sample_size=sample_size,
            score_variance=score_variance,
            data_freshness_hours=data_freshness_hours,
            min_sample_for_high_confidence=min_sample_for_high_confidence,
        )
    )
    return result.score


def calculate_confidence_detailed(factors: ConfidenceFactors) -> ConfidenceResult:
    """
    Calculate confidence with detailed breakdown.
    
    Args:
        factors: ConfidenceFactors object
    
    Returns:
        ConfidenceResult with score and breakdown
    """
    # Sample size confidence (0-50 points)
    if factors.sample_size <= 0:
        sample_conf = 0.0
    elif factors.sample_size >= factors.min_sample_for_high_confidence:
        sample_conf = 50.0
    else:
        # Logarithmic scaling
        sample_conf = 50.0 * (
            math.log(factors.sample_size + 1) /
            math.log(factors.min_sample_for_high_confidence + 1)
        )
    
    # Consistency bonus (0-30 points)
    variance_penalty = min(1.0, max(0.0, factors.score_variance))
    consistency_bonus = 30.0 * (1.0 - variance_penalty)
    
    # Freshness bonus (0-20 points)
    hours = factors.data_freshness_hours
    if hours <= 0:
        freshness_bonus = 20.0
    elif hours <= 6:
        freshness_bonus = 20.0
    elif hours <= 24:
        freshness_bonus = 20.0 - 5.0 * ((hours - 6) / 18)
    elif hours <= 72:
        freshness_bonus = 15.0 - 10.0 * ((hours - 24) / 48)
    else:
        freshness_bonus = max(0.0, 5.0 - (hours - 72) / 24)
    
    # Total score
    total = sample_conf + consistency_bonus + freshness_bonus
    score = int(max(0, min(100, round(total))))
    
    # Determine level
    if score >= 90:
        level = "very_high"
    elif score >= 70:
        level = "high"
    elif score >= 50:
        level = "moderate"
    elif score >= 30:
        level = "low"
    else:
        level = "very_low"
    
    return ConfidenceResult(
        score=score,
        sample_confidence=sample_conf,
        consistency_bonus=consistency_bonus,
        freshness_bonus=freshness_bonus,
        level=level,
    )


def calculate_score_variance(scores: List[float]) -> float:
    """
    Calculate variance of scores (normalized to 0-1 scale).
    
    Args:
        scores: List of scores (assumed 0-1 scale)
    
    Returns:
        Normalized variance (0 = consistent, 1 = highly variable)
    """
    if not scores or len(scores) < 2:
        return 0.0
    
    mean = sum(scores) / len(scores)
    variance = sum((s - mean) ** 2 for s in scores) / len(scores)
    
    # Normalize (max theoretical variance for 0-1 scores is 0.25)
    return min(1.0, variance / 0.25)
