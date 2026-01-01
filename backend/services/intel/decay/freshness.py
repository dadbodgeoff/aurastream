"""
Freshness Decay Functions

Exponential decay for content freshness scoring.
"""

import math


def freshness_decay(hours_old: float, half_life: float = 24.0) -> float:
    """
    Exponential decay for freshness scoring.
    
    Formula: score = 0.5 ^ (hours_old / half_life)
    
    Args:
        hours_old: Hours since content was published
        half_life: Hours until score drops to 50%
                   - 12h: Fast-moving content (trending topics)
                   - 24h: Standard content (YouTube videos)
                   - 48h: Evergreen content (tutorials)
    
    Returns:
        Score from 0.0 to 1.0
    """
    if hours_old <= 0:
        return 1.0
    
    if half_life <= 0:
        half_life = 24.0
    
    return math.pow(0.5, hours_old / half_life)


def recency_boost(hours_old: float, boost_window: float = 6.0) -> float:
    """
    Extra boost for very recent content.
    
    Uses smooth cosine curve that peaks at 1.0 for new content
    and decays to 0.0 at the boost window boundary.
    
    Args:
        hours_old: Hours since content was published
        boost_window: Hours during which boost applies
    
    Returns:
        Boost multiplier from 0.0 to 1.0
    """
    if hours_old <= 0:
        return 1.0
    
    if hours_old >= boost_window:
        return 0.0
    
    # Smooth cosine decay
    progress = hours_old / boost_window
    return (1 + math.cos(progress * math.pi)) / 2


def combined_freshness_score(
    hours_old: float,
    half_life: float = 24.0,
    boost_window: float = 6.0,
    boost_weight: float = 0.3,
) -> float:
    """
    Combined freshness score with recency boost.
    
    Args:
        hours_old: Hours since content was published
        half_life: Decay half-life in hours
        boost_window: Recency boost window in hours
        boost_weight: Weight of recency boost (0-1)
    
    Returns:
        Combined freshness score (0-1)
    """
    decay = freshness_decay(hours_old, half_life)
    boost = recency_boost(hours_old, boost_window)
    
    # Weighted combination
    base_weight = 1.0 - boost_weight
    return (decay * base_weight) + (boost * boost_weight)
