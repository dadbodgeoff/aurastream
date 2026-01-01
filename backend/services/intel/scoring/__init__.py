"""
Scoring Module

Multi-signal combination and cross-category normalization.
"""

from .combiner import (
    combine_scores,
    combine_scores_detailed,
    weighted_harmonic_mean,
    CombinedScore,
)
from .normalizer import (
    normalize_across_categories,
    normalize_detailed,
    calculate_category_difficulty,
    NormalizationResult,
)

__all__ = [
    # Combiner
    "combine_scores",
    "combine_scores_detailed",
    "weighted_harmonic_mean",
    "CombinedScore",
    # Normalizer
    "normalize_across_categories",
    "normalize_detailed",
    "calculate_category_difficulty",
    "NormalizationResult",
]
