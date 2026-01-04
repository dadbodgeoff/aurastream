"""
Playbook AI Refiner with Provenance Capture.

Wraps the AI refiner to capture full reasoning chains
for every playbook generation insight.
"""

import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from backend.services.provenance import (
    provenance_context,
    InsightType,
)
from backend.api.schemas.playbook import (
    WeeklySchedule,
    GoldenHourWindow,
    NicheOpportunity,
    ViralHook,
    VideoIdea,
)
from .ai_refiner import PlaybookAIRefiner, get_ai_refiner

logger = logging.getLogger(__name__)


class ProvenancePlaybookAIRefiner:
    """
    Playbook AI refiner with full provenance capture.
    
    Captures:
    - Data sources (Twitch streams, YouTube videos, trend data)
    - Decision factors for recommendations
    - Reasoning chain through the AI refinement process
    - Confidence and quality metrics
    """
    
    def __init__(self):
        self._refiner = get_ai_refiner()

    async def refine_playbook_with_provenance(
        self,
        twitch_data: Dict[str, Any],
        youtube_data: Dict[str, Any],
        golden_hours: List[GoldenHourWindow],
        niches: List[NicheOpportunity],
        viral_hooks: List[ViralHook],
        current_headline: str,
        current_mood: str,
        execution_id: str,
    ) -> Dict[str, Any]:
        """
        Refine playbook with AI-generated insights and provenance capture.
        """
        start_time = time.time()
        
        # Run the actual refinement
        result = await self._refiner.refine_playbook(
            twitch_data=twitch_data,
            youtube_data=youtube_data,
            golden_hours=golden_hours,
            niches=niches,
            viral_hooks=viral_hooks,
            current_headline=current_headline,
            current_mood=current_mood,
        )
        
        # Capture provenance for the AI refinement
        await self._capture_refinement_provenance(
            result=result,
            twitch_data=twitch_data,
            youtube_data=youtube_data,
            golden_hours=golden_hours,
            niches=niches,
            viral_hooks=viral_hooks,
            execution_id=execution_id,
            total_duration_ms=(time.time() - start_time) * 1000,
        )
        
        # Also capture provenance for each video idea generated
        for i, idea in enumerate(result.get("video_ideas", [])):
            await self._capture_video_idea_provenance(
                idea=idea,
                youtube_data=youtube_data,
                execution_id=f"{execution_id}:idea:{i}",
            )
        
        return result

    async def _capture_refinement_provenance(
        self,
        result: Dict[str, Any],
        twitch_data: Dict[str, Any],
        youtube_data: Dict[str, Any],
        golden_hours: List[GoldenHourWindow],
        niches: List[NicheOpportunity],
        viral_hooks: List[ViralHook],
        execution_id: str,
        total_duration_ms: float,
    ) -> None:
        """Capture full provenance for playbook AI refinement."""
        
        with provenance_context(
            worker_name="playbook_worker",
            execution_id=execution_id,
            insight_type=InsightType.PLAYBOOK_RECOMMENDATION,
            category_key="playbook",
        ) as prov:
            # Override the start time to reflect actual computation duration
            # The provenance context only measures recording time, not actual work
            prov.record.computation_duration_ms = total_duration_ms
            # === DATA SOURCES ===
            
            # Twitch streams data
            streams = twitch_data.get("streams", [])
            total_viewers = sum(s.get("viewer_count", 0) for s in streams)
            prov.add_data_source(
                source_type="twitch_streams",
                source_key="twitch:top_streams",
                records_used=len(streams),
                freshness_seconds=300,  # 5 min
                quality_score=min(1.0, len(streams) / 100),
                sample_ids=[s.get("user_name", "") for s in streams[:5]],
            )
            
            # Twitch games data
            games = twitch_data.get("games", [])
            prov.add_data_source(
                source_type="twitch_games",
                source_key="twitch:top_games",
                records_used=len(games),
                freshness_seconds=300,
                quality_score=min(1.0, len(games) / 30),
                sample_ids=[g.get("name", "") for g in games[:5]],
            )
            
            # YouTube videos data
            videos = youtube_data.get("videos", [])
            total_views = sum(v.get("view_count", 0) or v.get("views", 0) for v in videos)
            prov.add_data_source(
                source_type="youtube_trending",
                source_key="youtube:gaming:trending",
                records_used=len(videos),
                freshness_seconds=3600,  # 1 hour
                quality_score=min(1.0, len(videos) / 50),
                sample_ids=[v.get("title", "")[:50] for v in videos[:5]],
            )
            
            # Gemini AI
            prov.add_data_source(
                source_type="gemini_ai",
                source_key="gemini-2.0-flash",
                records_used=1,
                freshness_seconds=0,
                quality_score=1.0 if self._refiner.enabled else 0.0,
            )

            # === REASONING CHAIN ===
            
            prov.start_step(
                operation="aggregate_trend_data",
                description="Aggregate Twitch and YouTube trend data into context summary",
                algorithm="context_compression",
            )
            prov.end_step(
                input_count=len(streams) + len(games) + len(videos),
                output_count=1,
                parameters={
                    "total_twitch_viewers": total_viewers,
                    "total_youtube_views": total_views,
                    "golden_hours_count": len(golden_hours),
                    "niches_count": len(niches),
                    "viral_hooks_count": len(viral_hooks),
                },
            )
            
            prov.start_step(
                operation="build_ai_prompt",
                description="Build token-efficient prompt with trend context for Gemini",
                algorithm="prompt_engineering",
            )
            prov.end_step(
                input_count=1,
                output_count=1,
                parameters={"target_model": "gemini-2.0-flash"},
            )
            
            prov.start_step(
                operation="ai_refinement",
                description="Generate refined insights, headlines, and video ideas with Gemini AI",
                algorithm="gemini_generation",
            )
            prov.end_step(
                input_count=1,
                output_count=1,
                parameters={
                    "headline_generated": bool(result.get("headline")),
                    "video_ideas_count": len(result.get("video_ideas", [])),
                    "strategy_angles_count": len(result.get("strategy_angles", [])),
                },
            )
            
            prov.start_step(
                operation="parse_response",
                description="Parse and validate AI response into structured recommendations",
                algorithm="json_parsing",
            )
            prov.end_step(
                input_count=1,
                output_count=1,
            )

            # === DECISION FACTORS ===
            
            # Data volume factor
            data_volume = len(streams) + len(videos)
            volume_score = min(1.0, data_volume / 150)
            prov.add_decision_factor(
                factor_name="data_volume",
                raw_value=data_volume,
                normalized_value=volume_score,
                weight=0.25,
                reasoning=f"{data_volume} data points analyzed - {'comprehensive' if data_volume > 100 else 'moderate'} coverage",
            )
            
            # Trend diversity factor
            unique_games = len(set(s.get("game_name", "") for s in streams if s.get("game_name")))
            diversity_score = min(1.0, unique_games / 20)
            prov.add_decision_factor(
                factor_name="trend_diversity",
                raw_value=unique_games,
                normalized_value=diversity_score,
                weight=0.20,
                reasoning=f"{unique_games} unique games trending - {'diverse' if unique_games > 15 else 'focused'} landscape",
            )
            
            # Viral signal strength
            viral_count = len([v for v in videos if (v.get("view_count", 0) or v.get("views", 0)) > 1_000_000])
            viral_score = min(1.0, viral_count / 10)
            prov.add_decision_factor(
                factor_name="viral_signals",
                raw_value=viral_count,
                normalized_value=viral_score,
                weight=0.25,
                reasoning=f"{viral_count} viral videos (1M+) - {'strong' if viral_count > 5 else 'moderate'} viral activity",
            )
            
            # AI quality factor
            ai_quality = 1.0 if self._refiner.enabled and result.get("headline") else 0.3
            prov.add_decision_factor(
                factor_name="ai_refinement_quality",
                raw_value=self._refiner.enabled,
                normalized_value=ai_quality,
                weight=0.30,
                reasoning="Full Gemini AI refinement" if ai_quality > 0.5 else "Fallback recommendations (API unavailable)",
            )

            # === SET INSIGHT ===
            
            prov.set_insight(
                insight_id=f"playbook_{execution_id}",
                insight_summary=result.get("headline", "Playbook recommendations generated"),
                insight_value={
                    "headline": result.get("headline"),
                    "subheadline": result.get("subheadline"),
                    "mood": result.get("mood"),
                    "weekly_insight": result.get("weekly_insight"),
                    "best_slot_summary": result.get("best_slot_summary"),
                    "strategy_angles_count": len(result.get("strategy_angles", [])),
                    "video_ideas_count": len(result.get("video_ideas", [])),
                    "daily_mantra": result.get("daily_mantra"),
                    "top_insight": result.get("top_insight"),
                },
            )
            
            # === CONFIDENCE & QUALITY ===
            
            confidence = (volume_score * 0.25 + diversity_score * 0.20 + 
                         viral_score * 0.25 + ai_quality * 0.30)
            prov.set_confidence(confidence)
            prov.set_quality(ai_quality)
            
            # === VALIDATION ===
            
            validation_errors = []
            if not result.get("headline"):
                validation_errors.append("No headline generated")
            if not result.get("video_ideas"):
                validation_errors.append("No video ideas generated")
            if len(streams) < 10:
                validation_errors.append("Insufficient Twitch data")
            if len(videos) < 10:
                validation_errors.append("Insufficient YouTube data")
            
            prov.set_validation(
                passed=len(validation_errors) == 0,
                errors=validation_errors,
            )
            
            # === TAGS ===
            
            prov.add_tag("playbook")
            prov.add_tag("ai_refined")
            prov.add_tag(result.get("mood", "opportunity"))
            if viral_count > 5:
                prov.add_tag("high_viral_activity")
            
            prov.set_algorithm_version("1.0.0")

    async def _capture_video_idea_provenance(
        self,
        idea: VideoIdea,
        youtube_data: Dict[str, Any],
        execution_id: str,
    ) -> None:
        """Capture provenance for individual video idea."""
        
        with provenance_context(
            worker_name="playbook_worker",
            execution_id=execution_id,
            insight_type=InsightType.VIDEO_IDEA,
            category_key=idea.game_or_category.lower().replace(" ", "_"),
        ) as prov:
            # Data source - the inspiring video
            prov.add_data_source(
                source_type="youtube_trending",
                source_key=f"inspired_by:{idea.inspired_by[:50] if idea.inspired_by else 'unknown'}",
                records_used=1,
                freshness_seconds=3600,
                quality_score=0.8 if idea.inspired_by else 0.5,
                sample_ids=[idea.inspired_by] if idea.inspired_by else [],
            )
            
            # Reasoning chain
            prov.start_step(
                operation="identify_trend",
                description=f"Identified trending pattern from '{idea.inspired_by[:50]}'" if idea.inspired_by else "Generated original concept",
                algorithm="trend_analysis",
            )
            prov.end_step(input_count=1, output_count=1)
            
            prov.start_step(
                operation="adapt_for_small_creator",
                description="Adapted concept for small streamer audience",
                algorithm="content_adaptation",
            )
            prov.end_step(
                input_count=1, 
                output_count=1,
                parameters={"difficulty": idea.difficulty, "length": idea.estimated_length},
            )
            
            # Decision factors
            prov.add_decision_factor(
                factor_name="inspiration_views",
                raw_value=idea.inspired_by_views,
                normalized_value=min(1.0, idea.inspired_by_views / 1_000_000) if idea.inspired_by_views else 0.5,
                weight=0.40,
                reasoning=idea.title_reasoning or "Based on trending content patterns",
            )
            
            prov.add_decision_factor(
                factor_name="tag_relevance",
                raw_value=idea.tags,
                normalized_value=0.8 if idea.tags else 0.4,
                weight=0.30,
                reasoning=idea.tags_reasoning or "Tags selected for discoverability",
            )
            
            prov.add_decision_factor(
                factor_name="strategic_fit",
                raw_value=idea.why_this_works,
                normalized_value=0.85,
                weight=0.30,
                reasoning=idea.why_this_works or "Aligned with current trends",
            )
            
            # Set insight
            prov.set_insight(
                insight_id=idea.idea_id,
                insight_summary=idea.title,
                insight_value={
                    "title": idea.title,
                    "game_or_category": idea.game_or_category,
                    "hook": idea.hook,
                    "description": idea.description,
                    "tags": idea.tags,
                    "thumbnail_concept": idea.thumbnail_concept,
                    "difficulty": idea.difficulty,
                    "estimated_length": idea.estimated_length,
                },
            )
            
            prov.set_confidence(0.75)
            prov.set_quality(0.8)
            prov.set_validation(passed=True)
            
            prov.add_tag(idea.game_or_category.lower().replace(" ", "_"))
            prov.add_tag(idea.difficulty)
            prov.add_tag("video_idea")
            
            prov.set_algorithm_version("1.0.0")

    async def generate_weekly_schedule(
        self,
        twitch_streams: List[Dict[str, Any]],
        golden_hours: List[GoldenHourWindow],
    ) -> WeeklySchedule:
        """Generate weekly schedule (delegates to base refiner)."""
        return await self._refiner.generate_weekly_schedule(twitch_streams, golden_hours)


# Singleton
_provenance_refiner: Optional[ProvenancePlaybookAIRefiner] = None

def get_provenance_ai_refiner() -> ProvenancePlaybookAIRefiner:
    """Get the provenance-enabled AI refiner."""
    global _provenance_refiner
    if _provenance_refiner is None:
        _provenance_refiner = ProvenancePlaybookAIRefiner()
    return _provenance_refiner
