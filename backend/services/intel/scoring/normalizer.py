"""
Cross-Category Normalization

Normalize scores so different categories are comparable.
"""

import math
from dataclasses import dataclass
from typing import Dict, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from ..category_stats import CategoryStats


@dataclass
class NormalizationResult:
    """Result of cross-category normalization."""
    normalized_scores: Dict[str, float]
    raw_scores: Dict[str, float]
    z_scores: Dict[str, float]


def normalize_across_categories(
    category_scores: Dict[str, float],
    category_stats: Dict[str, "CategoryStats"],
) -> Dict[str, float]:
    """
    Normalize scores so different categories are comparable.
    
    A "good" score in Fortnite (huge category) should be comparable
    to a "good" score in a smaller category.
    
    Args:
        category_scores: Raw scores per category
        category_stats: CategoryStats for each category
    
    Returns:
        Normalized scores (0-1 scale)
    """
    result = normalize_detailed(category_scores, category_stats)
    return result.normalized_scores


def normalize_detailed(
    category_scores: Dict[str, float],
    category_stats: Dict[str, "CategoryStats"],
) -> NormalizationResult:
    """
    Normalize with detailed breakdown.
    
    Args:
        category_scores: Raw scores per category
        category_stats: CategoryStats for each category
    
    Returns:
        NormalizationResult with raw, z-scores, and normalized
    """
    if not category_scores or not category_stats:
        return NormalizationResult(
            normalized_scores={},
            raw_scores={},
            z_scores={},
        )
    
    normalized = {}
    z_scores = {}
    
    for category, raw_score in category_scores.items():
        stats = category_stats.get(category)
        
        if stats is None or stats.view_std <= 0:
            # No stats - use raw score clamped to 0-1
            normalized[category] = min(1.0, raw_score / 1_000_000)
            z_scores[category] = 0.0
            continue
        
        # Calculate z-score
        z = (raw_score - stats.view_mean) / stats.view_std
        z_scores[category] = round(z, 3)
        
        # Transform to 0-1 using sigmoid
        # z=0 -> 0.5, z=2 -> ~0.88, z=-2 -> ~0.12
        normalized_score = 1 / (1 + math.exp(-z * 0.5))
        normalized[category] = round(normalized_score, 4)
    
    return NormalizationResult(
        normalized_scores=normalized,
        raw_scores=category_scores,
        z_scores=z_scores,
    )


def calculate_category_difficulty(
    view_mean: float = 0,
    avg_stream_count: float = 0,
    avg_total_viewers: float = 0,
) -> float:
    """
    Calculate how difficult a category is to succeed in.
    
    Args:
        view_mean: Average view count in category
        avg_stream_count: Average concurrent streams
        avg_total_viewers: Average total viewers
    
    Returns:
        Difficulty score (0-1):
        - 0.0-0.3: Easy (small category)
        - 0.3-0.6: Medium
        - 0.6-0.8: Hard (large category)
        - 0.8-1.0: Very hard (massive category)
    """
    # View difficulty (log scale: 10k = easy, 1M = very hard)
    if view_mean <= 0:
        view_difficulty = 0.0
    else:
        # log10(10k) = 4, log10(1M) = 6
        view_difficulty = min(1.0, max(0, (math.log10(max(1, view_mean)) - 4) / 2))
    
    # Stream count difficulty (10 = easy, 1000 = very hard)
    if avg_stream_count <= 0:
        stream_difficulty = 0.0
    else:
        # log10(10) = 1, log10(1000) = 3
        stream_difficulty = min(1.0, max(0, (math.log10(max(1, avg_stream_count)) - 1) / 2))
    
    # Viewer difficulty (1k = easy, 500k = very hard)
    if avg_total_viewers <= 0:
        viewer_difficulty = 0.0
    else:
        # log10(1k) = 3, log10(500k) ≈ 5.7
        viewer_difficulty = min(1.0, max(0, (math.log10(max(1, avg_total_viewers)) - 3) / 2.7))
    
    # Weighted combination
    difficulty = (
        view_difficulty * 0.5 +
        stream_difficulty * 0.25 +
        viewer_difficulty * 0.25
    )
    
    return round(difficulty, 3)
