"""
Score Combiner

Combine multiple scoring signals with weights and confidence factors.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple


def _calculate_score_variance(scores: List[float]) -> float:
    """Calculate variance of scores (normalized to 0-1 scale)."""
    if not scores or len(scores) < 2:
        return 0.0
    mean = sum(scores) / len(scores)
    variance = sum((s - mean) ** 2 for s in scores) / len(scores)
    return min(1.0, variance / 0.25)


@dataclass
class CombinedScore:
    """Result of combining multiple scores."""
    score: float  # 0-1 scale
    confidence: int  # 0-100
    contributions: Dict[str, float]  # Per-signal contribution
    
    @property
    def score_100(self) -> float:
        """Score on 0-100 scale."""
        return self.score * 100


def combine_scores(
    scores: Dict[str, float],
    weights: Dict[str, float],
    confidence_factors: Optional[Dict[str, float]] = None,
) -> Tuple[float, int]:
    """
    Combine multiple scoring signals with weights.
    
    Args:
        scores: Signal name -> score (0-1 scale)
        weights: Signal name -> weight (should sum to 1.0)
        confidence_factors: Optional per-signal confidence (0-1)
    
    Returns:
        Tuple of (combined_score, confidence)
    """
    result = combine_scores_detailed(scores, weights, confidence_factors)
    return result.score, result.confidence


def combine_scores_detailed(
    scores: Dict[str, float],
    weights: Dict[str, float],
    confidence_factors: Optional[Dict[str, float]] = None,
) -> CombinedScore:
    """
    Combine scores with detailed breakdown.
    
    Args:
        scores: Signal name -> score (0-1 scale)
        weights: Signal name -> weight
        confidence_factors: Optional per-signal confidence (0-1)
    
    Returns:
        CombinedScore with breakdown
    """
    if not scores or not weights:
        return CombinedScore(score=0.0, confidence=0, contributions={})
    
    # Normalize weights
    total_weight = sum(weights.get(k, 0) for k in scores.keys())
    if total_weight <= 0:
        return CombinedScore(score=0.0, confidence=0, contributions={})
    
    normalized_weights = {
        k: weights.get(k, 0) / total_weight
        for k in scores.keys()
    }
    
    # Apply confidence factors if provided
    if confidence_factors:
        adjusted_weights = {}
        for signal, weight in normalized_weights.items():
            conf = confidence_factors.get(signal, 1.0)
            adjusted_weights[signal] = weight * conf
        
        # Re-normalize
        adj_total = sum(adjusted_weights.values())
        if adj_total > 0:
            normalized_weights = {
                k: v / adj_total for k, v in adjusted_weights.items()
            }
    
    # Calculate weighted average
    contributions = {}
    combined_score = 0.0
    
    for signal, score in scores.items():
        weight = normalized_weights.get(signal, 0)
        contribution = score * weight
        contributions[signal] = round(contribution, 4)
        combined_score += contribution
    
    # Calculate confidence
    if confidence_factors:
        conf_values = [
            confidence_factors.get(signal, 1.0) * normalized_weights.get(signal, 0)
            for signal in scores.keys()
        ]
        avg_confidence = sum(conf_values) * 100
    else:
        # Base on score consistency
        score_list = list(scores.values())
        variance = _calculate_score_variance(score_list)
        avg_confidence = 100 * (1 - variance)
    
    return CombinedScore(
        score=round(combined_score, 4),
        confidence=int(min(100, max(0, avg_confidence))),
        contributions=contributions,
    )


def weighted_harmonic_mean(
    scores: Dict[str, float],
    weights: Dict[str, float],
) -> float:
    """
    Calculate weighted harmonic mean.
    
    More conservative than arithmetic mean - penalizes low scores heavily.
    Use when ALL signals need to be good.
    
    Args:
        scores: Signal name -> score (0-1, must be > 0)
        weights: Signal name -> weight
    
    Returns:
        Weighted harmonic mean (0-1)
    """
    if not scores or not weights:
        return 0.0
    
    # Filter zero scores
    valid_scores = {k: v for k, v in scores.items() if v > 0}
    if not valid_scores:
        return 0.0
    
    # Normalize weights
    total_weight = sum(weights.get(k, 0) for k in valid_scores.keys())
    if total_weight <= 0:
        return 0.0
    
    # Harmonic mean: sum(w) / sum(w/x)
    weighted_reciprocal_sum = sum(
        (weights.get(k, 0) / total_weight) / v
        for k, v in valid_scores.items()
    )
    
    if weighted_reciprocal_sum <= 0:
        return 0.0
    
    return 1.0 / weighted_reciprocal_sum
