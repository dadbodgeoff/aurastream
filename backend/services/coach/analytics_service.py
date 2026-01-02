"""
Coach Analytics Service for tracking session outcomes.

Tracks which coaching sessions lead to successful generations,
enabling a learning loop to improve coach suggestions over time.

This service:
1. Records session outcomes when generation is triggered
2. Queries success patterns by asset type
3. Gets insights for improving coach suggestions

Data is stored in PostgreSQL via Supabase for long-term analysis.
"""

from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from uuid import uuid4
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
    mood: Optional[str]
    game_context: Optional[str]
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
    """
    Service for tracking and analyzing coach session outcomes.
    
    Provides insights into:
    - Which coaching patterns lead to successful generations
    - Average turns needed per asset type
    - Impact of grounding (web search) on quality
    - User satisfaction ratings
    
    This data feeds back into improving coach suggestions.
    """
    
    TABLE_NAME = "coach_session_outcomes"
    
    def __init__(self, supabase_client=None):
        """
        Initialize the coach analytics service.
        
        Args:
            supabase_client: Supabase client instance (uses singleton if not provided)
        """
        self._supabase = supabase_client
    
    @property
    def supabase(self):
        """Lazy-load Supabase client."""
        if self._supabase is None:
            from backend.database.supabase_client import get_supabase_client
            self._supabase = get_supabase_client()
        return self._supabase
    
    async def record_outcome(self, outcome: SessionOutcome) -> str:
        """
        Record a session outcome when generation is triggered.
        
        Args:
            outcome: SessionOutcome dataclass with session details
            
        Returns:
            The ID of the created outcome record
            
        Raises:
            Exception: If database insert fails
        """
        outcome_id = str(uuid4())
        
        try:
            outcome_data = {
                "id": outcome_id,
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
                "viral_score": outcome.viral_score,
                "user_rating": outcome.user_rating,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            
            self.supabase.table(self.TABLE_NAME).insert(outcome_data).execute()
            
            logger.info(
                f"Recorded coach session outcome: session={outcome.session_id}, "
                f"asset_type={outcome.asset_type}, completed={outcome.generation_completed}"
            )
            
            return outcome_id
            
        except Exception as e:
            logger.error(f"Failed to record session outcome: {e}")
            raise
    
    async def update_viral_score(self, outcome_id: str, viral_score: int) -> None:
        """
        Update viral score after asset is analyzed.
        
        Called asynchronously after the asset generation completes
        and viral analysis is performed.
        
        Args:
            outcome_id: The outcome record ID
            viral_score: Viral score (0-100)
            
        Raises:
            Exception: If database update fails
        """
        try:
            self.supabase.table(self.TABLE_NAME).update({
                "viral_score": viral_score,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", outcome_id).execute()
            
            logger.debug(f"Updated viral score for outcome {outcome_id}: {viral_score}")
            
        except Exception as e:
            logger.error(f"Failed to update viral score for outcome {outcome_id}: {e}")
            raise
    
    async def record_user_rating(
        self,
        outcome_id: str,
        user_id: str,
        rating: int
    ) -> None:
        """
        Record user satisfaction rating (1-5).
        
        Validates that the user owns the outcome before updating.
        
        Args:
            outcome_id: The outcome record ID
            user_id: User ID for ownership verification
            rating: User rating (1-5)
            
        Raises:
            ValueError: If rating is not between 1 and 5
            PermissionError: If user doesn't own the outcome
            Exception: If database update fails
        """
        if not 1 <= rating <= 5:
            raise ValueError(f"Rating must be between 1 and 5, got {rating}")
        
        try:
            # Verify ownership
            result = self.supabase.table(self.TABLE_NAME).select(
                "user_id"
            ).eq("id", outcome_id).single().execute()
            
            if not result.data:
                raise ValueError(f"Outcome {outcome_id} not found")
            
            if result.data.get("user_id") != user_id:
                raise PermissionError(f"User {user_id} does not own outcome {outcome_id}")
            
            # Update rating
            self.supabase.table(self.TABLE_NAME).update({
                "user_rating": rating,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", outcome_id).execute()
            
            logger.info(f"Recorded user rating for outcome {outcome_id}: {rating}/5")
            
        except (ValueError, PermissionError):
            raise
        except Exception as e:
            logger.error(f"Failed to record user rating for outcome {outcome_id}: {e}")
            raise
    
    async def get_success_patterns(
        self,
        asset_type: Optional[str] = None
    ) -> List[SuccessPattern]:
        """
        Get aggregated success patterns, optionally filtered by asset type.
        
        Analyzes historical outcomes to identify patterns that lead
        to successful generations.
        
        Args:
            asset_type: Optional filter for specific asset type
            
        Returns:
            List of SuccessPattern objects with aggregated metrics
        """
        try:
            # Build query
            query = self.supabase.table(self.TABLE_NAME).select(
                "asset_type, generation_completed, turns_used, quality_score, grounding_used"
            )
            
            if asset_type:
                query = query.eq("asset_type", asset_type)
            
            result = query.execute()
            
            if not result.data:
                return []
            
            # Aggregate by asset type
            aggregates: Dict[str, Dict[str, Any]] = {}
            
            for row in result.data:
                atype = row["asset_type"]
                if atype not in aggregates:
                    aggregates[atype] = {
                        "total_sessions": 0,
                        "completed_generations": 0,
                        "total_turns": 0,
                        "total_quality": 0.0,
                        "grounding_count": 0,
                    }
                
                agg = aggregates[atype]
                agg["total_sessions"] += 1
                
                if row.get("generation_completed"):
                    agg["completed_generations"] += 1
                
                agg["total_turns"] += row.get("turns_used", 0)
                agg["total_quality"] += row.get("quality_score", 0.0)
                
                if row.get("grounding_used"):
                    agg["grounding_count"] += 1
            
            # Convert to SuccessPattern objects
            patterns = []
            for atype, agg in aggregates.items():
                total = agg["total_sessions"]
                if total == 0:
                    continue
                
                patterns.append(SuccessPattern(
                    asset_type=atype,
                    total_sessions=total,
                    completed_generations=agg["completed_generations"],
                    completion_rate=round(agg["completed_generations"] / total, 3),
                    avg_turns=round(agg["total_turns"] / total, 2),
                    avg_quality_score=round(agg["total_quality"] / total, 2),
                    grounding_usage_rate=round(agg["grounding_count"] / total, 3),
                ))
            
            # Sort by completion rate descending
            patterns.sort(key=lambda p: p.completion_rate, reverse=True)
            
            logger.debug(f"Retrieved {len(patterns)} success patterns")
            return patterns
            
        except Exception as e:
            logger.error(f"Failed to get success patterns: {e}")
            return []
    
    async def get_user_history(
        self,
        user_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get recent session outcomes for a user.
        
        Returns the user's coaching history for personalization
        and showing past sessions.
        
        Args:
            user_id: User ID to query
            limit: Maximum number of records to return (default 10)
            
        Returns:
            List of outcome dictionaries with session details
        """
        try:
            result = self.supabase.table(self.TABLE_NAME).select(
                "id, session_id, asset_id, generation_completed, turns_used, "
                "grounding_used, refinements_count, quality_score, final_intent, "
                "asset_type, mood, game_context, viral_score, user_rating, created_at"
            ).eq(
                "user_id", user_id
            ).order(
                "created_at", desc=True
            ).limit(limit).execute()
            
            if not result.data:
                return []
            
            # Transform to camelCase for frontend compatibility
            history = []
            for row in result.data:
                history.append({
                    "id": row["id"],
                    "sessionId": row["session_id"],
                    "assetId": row.get("asset_id"),
                    "generationCompleted": row["generation_completed"],
                    "turnsUsed": row["turns_used"],
                    "groundingUsed": row["grounding_used"],
                    "refinementsCount": row["refinements_count"],
                    "qualityScore": row["quality_score"],
                    "finalIntent": row["final_intent"],
                    "assetType": row["asset_type"],
                    "mood": row.get("mood"),
                    "gameContext": row.get("game_context"),
                    "viralScore": row.get("viral_score"),
                    "userRating": row.get("user_rating"),
                    "createdAt": row["created_at"],
                })
            
            logger.debug(f"Retrieved {len(history)} outcomes for user {user_id}")
            return history
            
        except Exception as e:
            logger.error(f"Failed to get user history for {user_id}: {e}")
            return []
    
    async def get_insights_for_asset_type(
        self,
        asset_type: str
    ) -> Dict[str, Any]:
        """
        Get insights for improving coach suggestions for a specific asset type.
        
        Analyzes successful sessions to identify:
        - Common moods that work well
        - Average turns needed
        - Impact of grounding on quality
        - Common game contexts
        
        Args:
            asset_type: The asset type to analyze
            
        Returns:
            Dictionary with insights for the asset type
        """
        try:
            # Get successful outcomes for this asset type
            result = self.supabase.table(self.TABLE_NAME).select(
                "mood, game_context, turns_used, quality_score, grounding_used, "
                "viral_score, user_rating, refinements_count"
            ).eq(
                "asset_type", asset_type
            ).eq(
                "generation_completed", True
            ).execute()
            
            if not result.data:
                return {
                    "assetType": asset_type,
                    "sampleSize": 0,
                    "insights": "Insufficient data for insights",
                }
            
            data = result.data
            sample_size = len(data)
            
            # Analyze moods
            mood_counts: Dict[str, int] = {}
            mood_quality: Dict[str, List[float]] = {}
            for row in data:
                mood = row.get("mood") or "unspecified"
                mood_counts[mood] = mood_counts.get(mood, 0) + 1
                if mood not in mood_quality:
                    mood_quality[mood] = []
                mood_quality[mood].append(row.get("quality_score", 0.0))
            
            # Find best performing moods
            best_moods = []
            for mood, scores in mood_quality.items():
                if len(scores) >= 3:  # Minimum sample size
                    avg_quality = sum(scores) / len(scores)
                    best_moods.append({
                        "mood": mood,
                        "avgQuality": round(avg_quality, 2),
                        "count": mood_counts[mood],
                    })
            best_moods.sort(key=lambda x: x["avgQuality"], reverse=True)
            
            # Analyze grounding impact
            grounded = [r for r in data if r.get("grounding_used")]
            non_grounded = [r for r in data if not r.get("grounding_used")]
            
            grounding_impact = None
            if len(grounded) >= 3 and len(non_grounded) >= 3:
                avg_grounded = sum(r.get("quality_score", 0) for r in grounded) / len(grounded)
                avg_non_grounded = sum(r.get("quality_score", 0) for r in non_grounded) / len(non_grounded)
                grounding_impact = {
                    "withGrounding": round(avg_grounded, 2),
                    "withoutGrounding": round(avg_non_grounded, 2),
                    "improvement": round(avg_grounded - avg_non_grounded, 2),
                }
            
            # Calculate averages
            avg_turns = sum(r.get("turns_used", 0) for r in data) / sample_size
            avg_quality = sum(r.get("quality_score", 0) for r in data) / sample_size
            avg_refinements = sum(r.get("refinements_count", 0) for r in data) / sample_size
            
            # Viral score analysis (if available)
            viral_scores = [r.get("viral_score") for r in data if r.get("viral_score") is not None]
            avg_viral = sum(viral_scores) / len(viral_scores) if viral_scores else None
            
            # User rating analysis (if available)
            ratings = [r.get("user_rating") for r in data if r.get("user_rating") is not None]
            avg_rating = sum(ratings) / len(ratings) if ratings else None
            
            return {
                "assetType": asset_type,
                "sampleSize": sample_size,
                "avgTurns": round(avg_turns, 1),
                "avgQualityScore": round(avg_quality, 2),
                "avgRefinements": round(avg_refinements, 1),
                "avgViralScore": round(avg_viral, 1) if avg_viral else None,
                "avgUserRating": round(avg_rating, 2) if avg_rating else None,
                "bestMoods": best_moods[:5],  # Top 5 moods
                "groundingImpact": grounding_impact,
                "recommendations": self._generate_recommendations(
                    avg_turns, avg_quality, grounding_impact, best_moods
                ),
            }
            
        except Exception as e:
            logger.error(f"Failed to get insights for {asset_type}: {e}")
            return {
                "assetType": asset_type,
                "sampleSize": 0,
                "error": str(e),
            }
    
    def _generate_recommendations(
        self,
        avg_turns: float,
        avg_quality: float,
        grounding_impact: Optional[Dict[str, Any]],
        best_moods: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate actionable recommendations based on insights."""
        recommendations = []
        
        if avg_turns > 5:
            recommendations.append(
                "Sessions average over 5 turns. Consider providing more specific "
                "initial guidance to reduce back-and-forth."
            )
        
        if avg_quality < 0.7:
            recommendations.append(
                "Average quality score is below 0.7. Review common failure patterns "
                "and improve prompt templates."
            )
        
        if grounding_impact and grounding_impact.get("improvement", 0) > 0.1:
            recommendations.append(
                f"Grounding improves quality by {grounding_impact['improvement']:.0%}. "
                "Consider suggesting grounding more often for this asset type."
            )
        
        if best_moods and len(best_moods) >= 2:
            top_mood = best_moods[0]["mood"]
            recommendations.append(
                f"'{top_mood}' mood performs best for this asset type. "
                "Consider suggesting it as a default."
            )
        
        if not recommendations:
            recommendations.append("Performance metrics are healthy. Continue monitoring.")
        
        return recommendations
    
    async def get_summary_stats(self, days: int = 30) -> Dict[str, Any]:
        """
        Get summary statistics for the coach analytics dashboard.
        
        Args:
            days: Number of days to include in the summary
            
        Returns:
            Dictionary with summary statistics
        """
        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            
            result = self.supabase.table(self.TABLE_NAME).select(
                "generation_completed, turns_used, quality_score, grounding_used, "
                "user_rating, asset_type"
            ).gte("created_at", cutoff).execute()
            
            if not result.data:
                return {
                    "period": f"{days} days",
                    "totalSessions": 0,
                    "completionRate": 0,
                    "avgTurns": 0,
                    "avgQuality": 0,
                    "groundingRate": 0,
                    "avgRating": None,
                    "topAssetTypes": [],
                }
            
            data = result.data
            total = len(data)
            completed = sum(1 for r in data if r.get("generation_completed"))
            grounded = sum(1 for r in data if r.get("grounding_used"))
            
            ratings = [r.get("user_rating") for r in data if r.get("user_rating")]
            
            # Count by asset type
            type_counts: Dict[str, int] = {}
            for row in data:
                atype = row.get("asset_type", "unknown")
                type_counts[atype] = type_counts.get(atype, 0) + 1
            
            top_types = sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:5]
            
            return {
                "period": f"{days} days",
                "totalSessions": total,
                "completedGenerations": completed,
                "completionRate": round(completed / total, 3) if total > 0 else 0,
                "avgTurns": round(sum(r.get("turns_used", 0) for r in data) / total, 1),
                "avgQuality": round(sum(r.get("quality_score", 0) for r in data) / total, 2),
                "groundingRate": round(grounded / total, 3) if total > 0 else 0,
                "avgRating": round(sum(ratings) / len(ratings), 2) if ratings else None,
                "topAssetTypes": [{"type": t, "count": c} for t, c in top_types],
            }
            
        except Exception as e:
            logger.error(f"Failed to get summary stats: {e}")
            return {
                "period": f"{days} days",
                "totalSessions": 0,
                "error": str(e),
            }


# Singleton
_analytics_service: Optional[CoachAnalyticsService] = None


def get_analytics_service() -> CoachAnalyticsService:
    """Get or create the coach analytics service singleton."""
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
