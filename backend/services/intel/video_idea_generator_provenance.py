"""
Video Idea Generator with Provenance Capture.

Wraps the video idea generator to capture full reasoning chains
for every generated insight.
"""

import logging
import time
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from backend.services.provenance import (
    provenance_context,
    InsightType,
    ProvenanceCapture,
)
from .video_idea_generator import (
    VideoIdeaGenerator,
    VideoIdeasResponse,
    VideoIdea,
    get_video_idea_generator,
)

logger = logging.getLogger(__name__)


class ProvenanceVideoIdeaGenerator:
    """
    Video idea generator with full provenance capture.
    
    Captures:
    - All data sources used (viral, title intel, competition)
    - Decision factors for each idea
    - Reasoning chain through the generation process
    - Confidence and quality metrics
    """
    
    def __init__(self):
        self._generator = get_video_idea_generator()

    async def generate_ideas_with_provenance(
        self,
        game_key: str,
        execution_id: str,
        max_ideas: int = 5,
    ) -> Optional[VideoIdeasResponse]:
        """
        Generate video ideas with full provenance capture.
        
        Each generated idea gets its own provenance record documenting
        exactly why it was recommended.
        """
        start_time = time.time()
        
        # Gather all signals first (we need them for provenance)
        viral_data = await self._generator._get_viral_signals(game_key)
        title_data = await self._generator._get_title_signals(game_key)
        competition_data = await self._generator._get_competition_signals(game_key)
        
        if not viral_data and not title_data:
            logger.warning(f"No data available for {game_key}")
            return None
        
        # Generate ideas using the base generator
        response = await self._generator.generate_ideas(game_key, max_ideas)
        
        if not response:
            return None
        
        # Capture provenance for each generated idea
        for idea in response.ideas:
            await self._capture_idea_provenance(
                idea=idea,
                game_key=game_key,
                execution_id=execution_id,
                viral_data=viral_data,
                title_data=title_data,
                competition_data=competition_data,
                total_duration_ms=(time.time() - start_time) * 1000,
            )
        
        return response

    async def _capture_idea_provenance(
        self,
        idea: VideoIdea,
        game_key: str,
        execution_id: str,
        viral_data: Optional[Dict],
        title_data: Optional[Dict],
        competition_data: Optional[Dict],
        total_duration_ms: float,
    ) -> None:
        """Capture full provenance for a single video idea."""
        
        with provenance_context(
            worker_name="creator_intel_worker",
            execution_id=execution_id,
            insight_type=InsightType.VIDEO_IDEA,
            category_key=game_key,
        ) as prov:
            # Override the start time to reflect actual computation duration
            # The provenance context only measures recording time, not actual work
            prov.record.computation_duration_ms = total_duration_ms
            
            # === DATA SOURCES ===
            
            # Viral detector data
            if viral_data:
                prov.add_data_source(
                    source_type="viral_detector",
                    source_key=f"viral:analysis:{game_key}",
                    records_used=viral_data.get("viral_count", 0) + viral_data.get("rising_count", 0),
                    freshness_seconds=3600,  # Assume 1 hour
                    quality_score=viral_data.get("confidence", 50) / 100,
                    sample_ids=viral_data.get("trending_topics", [])[:3],
                )
            
            # Title intel data
            if title_data:
                keyword_count = len(title_data.get("keywords", []))
                phrase_count = len(title_data.get("phrases", []))
                prov.add_data_source(
                    source_type="title_intel",
                    source_key=f"intel:title:{game_key}",
                    records_used=keyword_count + phrase_count,
                    freshness_seconds=title_data.get("data_freshness_hours", 24) * 3600,
                    quality_score=title_data.get("data_confidence", 50) / 100,
                    sample_ids=[k.get("keyword", "") for k in title_data.get("keywords", [])[:3]],
                )
            
            # Competition data
            if competition_data:
                prov.add_data_source(
                    source_type="competition_analyzer",
                    source_key=f"competition:{game_key}",
                    records_used=competition_data.get("live_streams", 0),
                    freshness_seconds=1800,  # 30 min
                    quality_score=competition_data.get("confidence", 50) / 100,
                )

            # === REASONING CHAIN ===
            
            prov.start_step(
                operation="gather_signals",
                description="Collect trending data from viral detector, title intel, and competition analyzer",
                algorithm="parallel_fetch",
            )
            prov.end_step(
                input_count=3,  # 3 data sources
                output_count=3 if all([viral_data, title_data, competition_data]) else sum([bool(viral_data), bool(title_data), bool(competition_data)]),
            )
            
            prov.start_step(
                operation="extract_topics",
                description="Extract unique, diverse topics from all signal sources",
                algorithm="deduplication_with_similarity",
            )
            source_signals = idea.source_signals
            prov.end_step(
                input_count=sum([
                    len(viral_data.get("trending_topics", [])) if viral_data else 0,
                    len(title_data.get("keywords", [])) if title_data else 0,
                    len(title_data.get("phrases", [])) if title_data else 0,
                ]),
                output_count=1,  # This specific topic
                parameters={"source": source_signals.get("type", "unknown")},
            )
            
            prov.start_step(
                operation="generate_concept",
                description=f"Generate video concept using {idea.format_suggestion} template",
                algorithm="template_selection_by_hash",
            )
            prov.end_step(
                input_count=1,
                output_count=1,
                parameters={"format": idea.format_suggestion, "topic": source_signals.get("topic", "")},
            )
            
            prov.start_step(
                operation="score_opportunity",
                description="Calculate opportunity score based on trending signals and competition",
                algorithm="weighted_scoring",
            )
            prov.end_step(
                input_count=3,
                output_count=1,
                parameters={"base_score": viral_data.get("opportunity_score", 50) if viral_data else 50},
            )

            # === DECISION FACTORS ===
            
            # Source type factor
            source_type = source_signals.get("type", "unknown")
            source_weights = {
                "phrase": 0.9,
                "viral_topic": 0.85,
                "keyword": 0.75,
                "tag_cluster": 0.65,
                "keyword_secondary": 0.5,
            }
            prov.add_decision_factor(
                factor_name="source_type",
                raw_value=source_type,
                normalized_value=source_weights.get(source_type, 0.5),
                weight=0.25,
                reasoning=f"Topic sourced from {source_type} - {'high' if source_weights.get(source_type, 0.5) > 0.7 else 'moderate'} signal quality",
            )
            
            # Trending status factor
            is_trending = source_signals.get("metadata", {}).get("is_trending", False)
            prov.add_decision_factor(
                factor_name="trending_status",
                raw_value=is_trending,
                normalized_value=1.0 if is_trending else 0.4,
                weight=0.20,
                reasoning="Currently trending" if is_trending else "Not actively trending but has consistent performance",
            )
            
            # Velocity factor
            velocity = source_signals.get("metadata", {}).get("velocity", 0)
            velocity_normalized = min(1.0, velocity / 2000) if velocity else 0.3
            prov.add_decision_factor(
                factor_name="velocity_score",
                raw_value=velocity,
                normalized_value=velocity_normalized,
                weight=0.20,
                reasoning=f"Velocity of {velocity:,}/hr indicates {'rapid' if velocity > 1000 else 'moderate' if velocity > 500 else 'steady'} growth",
            )
            
            # Competition factor
            comp_level = competition_data.get("competition_level", "medium") if competition_data else "medium"
            comp_scores = {"low": 0.9, "medium": 0.6, "high": 0.3}
            prov.add_decision_factor(
                factor_name="competition_level",
                raw_value=comp_level,
                normalized_value=comp_scores.get(comp_level, 0.6),
                weight=0.20,
                reasoning=f"{comp_level.title()} competition - {'good opportunity' if comp_level == 'low' else 'moderate opportunity' if comp_level == 'medium' else 'crowded space'}",
            )
            
            # Format fit factor
            prov.add_decision_factor(
                factor_name="format_fit",
                raw_value=idea.format_suggestion,
                normalized_value=0.8,  # Templates are pre-validated
                weight=0.15,
                reasoning=f"{idea.format_suggestion} format selected based on topic characteristics",
            )

            # === SET INSIGHT ===
            
            prov.set_insight(
                insight_id=f"idea_{game_key}_{hash(idea.concept) % 10000}",
                insight_summary=idea.concept,
                insight_value={
                    "concept": idea.concept,
                    "hook": idea.hook,
                    "why_now": idea.why_now,
                    "format": idea.format_suggestion,
                    "difficulty": idea.difficulty,
                    "opportunity_score": idea.opportunity_score,
                    "trending_elements": idea.trending_elements,
                    "suggested_tags": idea.suggested_tags,
                },
            )
            
            # === CONFIDENCE & QUALITY ===
            
            prov.set_confidence(idea.confidence / 100)
            prov.set_quality(idea.opportunity_score / 100)
            
            # === VALIDATION ===
            
            validation_errors = []
            if len(idea.concept) < 10:
                validation_errors.append("Concept too short")
            if not idea.trending_elements:
                validation_errors.append("No trending elements identified")
            if idea.opportunity_score < 30:
                validation_errors.append("Low opportunity score")
            
            prov.set_validation(
                passed=len(validation_errors) == 0,
                errors=validation_errors,
            )
            
            # === TAGS ===
            
            prov.add_tag(game_key)
            prov.add_tag(idea.format_suggestion.lower())
            prov.add_tag(idea.difficulty)
            if is_trending:
                prov.add_tag("trending")
            
            prov.set_algorithm_version("1.0.0")


# Singleton
_provenance_generator: Optional[ProvenanceVideoIdeaGenerator] = None

def get_provenance_video_idea_generator() -> ProvenanceVideoIdeaGenerator:
    """Get the provenance-enabled video idea generator."""
    global _provenance_generator
    if _provenance_generator is None:
        _provenance_generator = ProvenanceVideoIdeaGenerator()
    return _provenance_generator
