"""
Core Statistical Functions

Basic statistical calculations used throughout Creator Intel.
"""

import math
from typing import List, Optional


def calculate_mean(values: List[float]) -> float:
    """Calculate arithmetic mean."""
    if not values:
        return 0.0
    return sum(values) / len(values)


def calculate_variance(values: List[float], mean: Optional[float] = None) -> float:
    """Calculate population variance."""
    if len(values) < 2:
        return 0.0
    if mean is None:
        mean = calculate_mean(values)
    return sum((v - mean) ** 2 for v in values) / len(values)


def calculate_std(values: List[float], mean: Optional[float] = None) -> float:
    """Calculate population standard deviation."""
    return math.sqrt(calculate_variance(values, mean))


def calculate_percentile(values: List[float], percentile: float) -> float:
    """
    Calculate value at given percentile using linear interpolation.
    
    Args:
        values: List of numeric values
        percentile: Percentile to calculate (0-100)
    
    Returns:
        Value at the given percentile
    """
    if not values:
        return 0.0
    
    sorted_values = sorted(values)
    n = len(sorted_values)
    
    if n == 1:
        return sorted_values[0]
    
    # Calculate index with linear interpolation
    k = (percentile / 100.0) * (n - 1)
    f = math.floor(k)
    c = min(math.ceil(k), n - 1)
    
    if f == c:
        return sorted_values[int(k)]
    
    # Linear interpolation
    return sorted_values[f] * (c - k) + sorted_values[c] * (k - f)


def calculate_percentile_rank(value: float, sorted_values: List[float]) -> float:
    """
    Calculate what percentile a value falls at.
    
    Args:
        value: The value to rank
        sorted_values: Pre-sorted list of values
    
    Returns:
        Percentile rank (0-100)
    """
    if not sorted_values:
        return 0.0
    
    count_below = sum(1 for v in sorted_values if v < value)
    return round((count_below / len(sorted_values)) * 100, 1)
