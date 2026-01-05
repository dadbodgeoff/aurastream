"""
Coach Analytics Service for tracking session outcomes.

Tracks which coaching sessions lead to successful generations,
enabling a learning loop to improve coach suggestions over time.
"""

from dataclasses import dataclass
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)


@dataclass
class SessionOutcome:
    """Outcome of a coach session."""
    session_id: str
    user_id: str
    asset_id: Optional[str]
    generation_completed: bool
    turns_used: int
    grounding_used: bool
    refinements_count: int
    quality_score: float
    final_intent: str
    asset_type: str
    mood: Optional[str] = None
    game_context: Optional[str] = None
    viral_score: Optional[int] = None
    user_rating: Optional[int] = None


@dataclass
class SuccessPattern:
    """Aggregated success pattern for an asset type."""
    asset_type: str
    total_sessions: int
    completed_generations: int
    completion_rate: float
    avg_turns: float
    avg_quality_score: float
    grounding_usage_rate: float


class CoachAnalyticsService:
    """Service for tracking and analyzing coach session outcomes."""
    
    TABLE_NAME = "coach_session_outcomes"
    
    def __init__(self, supabase_client=None):
        self._supabase = supabase_client
    
    @property
    def supabase(self):
        if self._supabase is None:
            from backend.database.supabase_client import get_supabase_client
            self._supabase = get_supabase_client()
        return self._supabase
    
    async def record_outcome(self, outcome: SessionOutcome) -> str:
        """Record a session outcome."""
        try:
            data = {
                "session_id": outcome.session_id,
                "user_id": outcome.user_id,
                "asset_id": outcome.asset_id,
                "generation_completed": outcome.generation_completed,
                "turns_used": outcome.turns_used,
                "grounding_used": outcome.grounding_used,
                "refinements_count": outcome.refinements_count,
                "quality_score": outcome.quality_score,
                "final_intent": outcome.final_intent,
                "asset_type": outcome.asset_type,
                "mood": outcome.mood,
                "game_context": outcome.game_context,
            }
            self.supabase.table(self.TABLE_NAME).insert(data).execute()
            return outcome.session_id
        except Exception as e:
            logger.warning(f"Failed to record outcome: {e}")
            return outcome.session_id
    
    async def get_success_patterns(self, asset_type: Optional[str] = None) -> List[SuccessPattern]:
        """Get aggregated success patterns."""
        # Simplified implementation - returns empty for now
        return []
    
    async def get_summary_stats(self) -> Dict[str, Any]:
        """Get summary statistics."""
        return {
            "total_sessions": 0,
            "completion_rate": 0.0,
            "avg_turns": 0.0,
        }


_analytics_service: Optional[CoachAnalyticsService] = None


def get_analytics_service() -> CoachAnalyticsService:
    """Get or create the analytics service singleton."""
    global _analytics_service
    if _analytics_service is None:
        _analytics_service = CoachAnalyticsService()
    return _analytics_service


__all__ = [
    "SessionOutcome",
    "SuccessPattern",
    "CoachAnalyticsService",
    "get_analytics_service",
]
