"""
Decay Functions Module

Time-based decay and freshness scoring.
"""

from .freshness import (
    freshness_decay,
    recency_boost,
    combined_freshness_score,
)
from .velocity import (
    velocity_from_age,
    velocity_from_timestamps,
)

__all__ = [
    "freshness_decay",
    "recency_boost",
    "combined_freshness_score",
    "velocity_from_age",
    "velocity_from_timestamps",
]
