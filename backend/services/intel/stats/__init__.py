"""
Statistical Functions Module

Enterprise-grade statistical utilities for Creator Intel.
Split into focused, testable modules.
"""

from .core import (
    calculate_mean,
    calculate_std,
    calculate_variance,
    calculate_percentile,
    calculate_percentile_rank,
)
from .zscore import (
    calculate_z_score,
    z_score_to_percentile,
    percentile_to_z_score,
)
from .percentile_scoring import (
    calculate_percentile_score,
    PercentileThresholds,
)
from .outliers import (
    remove_outliers_iqr,
    remove_outliers_mad,
    detect_outliers,
    OutlierMethod,
)

__all__ = [
    # Core stats
    "calculate_mean",
    "calculate_std",
    "calculate_variance",
    "calculate_percentile",
    "calculate_percentile_rank",
    # Z-score
    "calculate_z_score",
    "z_score_to_percentile",
    "percentile_to_z_score",
    # Percentile scoring
    "calculate_percentile_score",
    "PercentileThresholds",
    # Outliers
    "remove_outliers_iqr",
    "remove_outliers_mad",
    "detect_outliers",
    "OutlierMethod",
]
