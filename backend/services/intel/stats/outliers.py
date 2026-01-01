"""
Outlier Detection and Removal

Enterprise-grade outlier handling using IQR and MAD methods.
"""

from dataclasses import dataclass
from enum import Enum
from typing import List, Tuple

from .core import calculate_percentile, calculate_mean


class OutlierMethod(Enum):
    """Outlier detection method."""
    IQR = "iqr"  # Interquartile Range
    MAD = "mad"  # Median Absolute Deviation


@dataclass
class OutlierResult:
    """Result of outlier detection."""
    clean_values: List[float]
    outliers: List[float]
    lower_bound: float
    upper_bound: float
    outlier_count: int
    
    @property
    def outlier_ratio(self) -> float:
        """Ratio of outliers to total values."""
        total = len(self.clean_values) + len(self.outliers)
        return len(self.outliers) / total if total > 0 else 0.0


def remove_outliers_iqr(
    values: List[float],
    k: float = 1.5,
) -> List[float]:
    """
    Remove outliers using IQR (Interquartile Range) method.
    
    Standard method: k=1.5 removes mild outliers
    Aggressive: k=1.0 removes more outliers
    Conservative: k=3.0 only removes extreme outliers
    
    Args:
        values: List of numeric values
        k: IQR multiplier (default 1.5)
    
    Returns:
        List with outliers removed
    """
    if len(values) < 4:
        return values
    
    q1 = calculate_percentile(values, 25)
    q3 = calculate_percentile(values, 75)
    iqr = q3 - q1
    
    if iqr == 0:
        return values
    
    lower = q1 - k * iqr
    upper = q3 + k * iqr
    
    return [v for v in values if lower <= v <= upper]


def remove_outliers_mad(
    values: List[float],
    k: float = 3.0,
) -> List[float]:
    """
    Remove outliers using MAD (Median Absolute Deviation) method.
    
    More robust than IQR for skewed distributions.
    
    Args:
        values: List of numeric values
        k: MAD multiplier (default 3.0)
    
    Returns:
        List with outliers removed
    """
    if len(values) < 4:
        return values
    
    median = calculate_percentile(values, 50)
    
    # Calculate MAD
    absolute_deviations = [abs(v - median) for v in values]
    mad = calculate_percentile(absolute_deviations, 50)
    
    if mad == 0:
        return values
    
    # Scale factor for normal distribution
    # MAD * 1.4826 ≈ standard deviation for normal data
    scaled_mad = mad * 1.4826
    
    lower = median - k * scaled_mad
    upper = median + k * scaled_mad
    
    return [v for v in values if lower <= v <= upper]


def detect_outliers(
    values: List[float],
    method: OutlierMethod = OutlierMethod.IQR,
    k: float = 1.5,
) -> OutlierResult:
    """
    Detect outliers and return detailed results.
    
    Args:
        values: List of numeric values
        method: Detection method (IQR or MAD)
        k: Multiplier for bounds
    
    Returns:
        OutlierResult with clean values, outliers, and bounds
    """
    if len(values) < 4:
        return OutlierResult(
            clean_values=values,
            outliers=[],
            lower_bound=min(values) if values else 0,
            upper_bound=max(values) if values else 0,
            outlier_count=0,
        )
    
    if method == OutlierMethod.IQR:
        q1 = calculate_percentile(values, 25)
        q3 = calculate_percentile(values, 75)
        iqr = q3 - q1
        
        if iqr == 0:
            return OutlierResult(
                clean_values=values,
                outliers=[],
                lower_bound=q1,
                upper_bound=q3,
                outlier_count=0,
            )
        
        lower = q1 - k * iqr
        upper = q3 + k * iqr
        
    else:  # MAD
        median = calculate_percentile(values, 50)
        absolute_deviations = [abs(v - median) for v in values]
        mad = calculate_percentile(absolute_deviations, 50)
        
        if mad == 0:
            return OutlierResult(
                clean_values=values,
                outliers=[],
                lower_bound=min(values),
                upper_bound=max(values),
                outlier_count=0,
            )
        
        scaled_mad = mad * 1.4826
        lower = median - k * scaled_mad
        upper = median + k * scaled_mad
    
    clean = []
    outliers = []
    
    for v in values:
        if lower <= v <= upper:
            clean.append(v)
        else:
            outliers.append(v)
    
    return OutlierResult(
        clean_values=clean,
        outliers=outliers,
        lower_bound=lower,
        upper_bound=upper,
        outlier_count=len(outliers),
    )
