"""
Thumbnail Vision Analyzer with Provenance Capture.

Wraps the vision analyzer to capture full reasoning chains
for every thumbnail analysis insight.

V2 Architecture: Per-thumbnail Gemini calls
- Each thumbnail gets its own Gemini Vision call
- Category patterns aggregated from individual results
- Provenance captures the full reasoning chain
"""

import logging
import time
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from backend.services.provenance import (
    provenance_context,
    InsightType,
)
from .vision_analyzer import (
    ThumbnailVisionAnalyzer,
    CategoryThumbnailInsight,
    ThumbnailAnalysis,
    get_vision_analyzer,
)
from .collector import ThumbnailData

logger = logging.getLogger(__name__)


class ProvenanceThumbnailVisionAnalyzer:
    """
    Thumbnail vision analyzer with full provenance capture.
    
    Captures:
    - Data sources (thumbnails analyzed, Gemini Vision API)
    - Decision factors for layout/color recommendations
    - Reasoning chain through the analysis process
    - Confidence and quality metrics
    """
    
    def __init__(self):
        self._analyzer = get_vision_analyzer()

    async def analyze_category_with_provenance(
        self,
        category_key: str,
        category_name: str,
        thumbnails: List[ThumbnailData],
        thumbnail_images: List[bytes],
        execution_id: str,
    ) -> CategoryThumbnailInsight:
        """
        Analyze thumbnails with full provenance capture.
        
        Each category analysis gets a provenance record documenting
        exactly how the AI arrived at its recommendations.
        """
        start_time = time.time()
        
        # Run the actual analysis
        insight = await self._analyzer.analyze_category_thumbnails(
            category_key=category_key,
            category_name=category_name,
            thumbnails=thumbnails,
            thumbnail_images=thumbnail_images,
        )
        
        # Capture provenance for the category analysis
        await self._capture_analysis_provenance(
            insight=insight,
            category_key=category_key,
            category_name=category_name,
            thumbnails=thumbnails,
            execution_id=execution_id,
            total_duration_ms=(time.time() - start_time) * 1000,
        )
        
        return insight

    async def _capture_analysis_provenance(
        self,
        insight: CategoryThumbnailInsight,
        category_key: str,
        category_name: str,
        thumbnails: List[ThumbnailData],
        execution_id: str,
        total_duration_ms: float,
    ) -> None:
        """Capture full provenance for thumbnail analysis."""
        
        with provenance_context(
            worker_name="thumbnail_intel_worker",
            execution_id=execution_id,
            insight_type=InsightType.THUMBNAIL_ANALYSIS,
            category_key=category_key,
        ) as prov:
            # Override the start time to reflect actual computation duration
            # The provenance context only measures recording time, not actual work
            prov.record.computation_duration_ms = total_duration_ms
            
            # === DATA SOURCES ===
            
            # Thumbnail images analyzed
            valid_thumbnails = [t for t in thumbnails if t.thumbnail_url_hq]
            total_views = sum(t.view_count for t in thumbnails)
            avg_views = total_views / len(thumbnails) if thumbnails else 0
            
            prov.add_data_source(
                source_type="youtube_thumbnails",
                source_key=f"thumbnails:{category_key}",
                records_used=len(valid_thumbnails),
                freshness_seconds=3600,  # Thumbnails fetched within last hour
                quality_score=min(1.0, len(valid_thumbnails) / 3),  # Expect 3 thumbnails
                sample_ids=[t.video_id for t in thumbnails[:3]],
            )
            
            # Gemini Vision API - V2: One call per thumbnail
            prov.add_data_source(
                source_type="gemini_vision_api",
                source_key="gemini-2.0-flash-vision",
                records_used=len(valid_thumbnails),  # V2: One API call per thumbnail
                freshness_seconds=0,  # Real-time analysis
                quality_score=1.0 if self._analyzer.enabled else 0.0,
            )

            # === REASONING CHAIN ===
            
            prov.start_step(
                operation="collect_thumbnails",
                description=f"Collect top {len(thumbnails)} thumbnails for {category_name}",
                algorithm="youtube_api_fetch",
            )
            prov.end_step(
                input_count=len(thumbnails),
                output_count=len(valid_thumbnails),
                parameters={"category": category_key, "avg_views": int(avg_views)},
            )
            
            prov.start_step(
                operation="download_images",
                description="Download thumbnail images for vision analysis",
                algorithm="http_fetch",
            )
            prov.end_step(
                input_count=len(valid_thumbnails),
                output_count=len(valid_thumbnails),
            )
            
            prov.start_step(
                operation="per_thumbnail_vision_analysis",
                description="Analyze each thumbnail individually with Gemini Vision (V2 architecture)",
                algorithm="gemini_vision_per_thumbnail",
            )
            prov.end_step(
                input_count=len(valid_thumbnails),
                output_count=len(insight.thumbnails),
                parameters={
                    "model": "gemini-2.0-flash-vision",
                    "architecture": "per_thumbnail_v2",
                    "gemini_calls": len(valid_thumbnails),
                    "analysis_types": ["layout", "colors", "elements", "recommendations"],
                },
            )
            
            prov.start_step(
                operation="aggregate_patterns",
                description="Aggregate common patterns from individual thumbnail analyses",
                algorithm="statistical_aggregation",
            )
            prov.end_step(
                input_count=len(insight.thumbnails),
                output_count=1,
                parameters={
                    "common_layout": insight.common_layout,
                    "common_colors_count": len(insight.common_colors),
                    "common_elements_count": len(insight.common_elements),
                },
            )

            # === DECISION FACTORS ===
            
            # View count factor (high-performing thumbnails = better signal)
            view_score = min(1.0, avg_views / 1_000_000) if avg_views > 0 else 0.3
            prov.add_decision_factor(
                factor_name="view_performance",
                raw_value=int(avg_views),
                normalized_value=view_score,
                weight=0.30,
                reasoning=f"Avg {int(avg_views):,} views - {'high' if avg_views > 500000 else 'moderate' if avg_views > 100000 else 'growing'} performer thumbnails",
            )
            
            # Sample size factor - V2 expects 10 thumbnails per category
            sample_score = min(1.0, len(valid_thumbnails) / 10)
            prov.add_decision_factor(
                factor_name="sample_size",
                raw_value=len(valid_thumbnails),
                normalized_value=sample_score,
                weight=0.20,
                reasoning=f"{len(valid_thumbnails)} thumbnails analyzed individually - {'excellent' if len(valid_thumbnails) >= 8 else 'sufficient' if len(valid_thumbnails) >= 5 else 'limited'} sample",
            )
            
            # Pattern consistency factor
            has_consistent_patterns = bool(insight.common_layout and insight.common_colors)
            prov.add_decision_factor(
                factor_name="pattern_consistency",
                raw_value=has_consistent_patterns,
                normalized_value=1.0 if has_consistent_patterns else 0.5,
                weight=0.25,
                reasoning="Clear patterns identified" if has_consistent_patterns else "Varied styles - recommendations are generalized",
            )
            
            # AI analysis quality factor - V2 per-thumbnail analysis
            successful_analyses = sum(1 for t in insight.thumbnails if t.layout_type != "unknown")
            ai_quality = successful_analyses / len(valid_thumbnails) if valid_thumbnails else 0.0
            prov.add_decision_factor(
                factor_name="ai_analysis_quality",
                raw_value=successful_analyses,
                normalized_value=ai_quality,
                weight=0.25,
                reasoning=f"{successful_analyses}/{len(valid_thumbnails)} thumbnails successfully analyzed with Gemini Vision (V2 per-thumbnail)",
            )

            # === SET INSIGHT ===
            
            prov.set_insight(
                insight_id=f"thumb_analysis_{category_key}_{insight.analysis_date}",
                insight_summary=f"Thumbnail design patterns for {category_name}: {insight.category_style_summary[:100]}",
                insight_value={
                    "category_key": category_key,
                    "category_name": category_name,
                    "thumbnails_analyzed": len(insight.thumbnails),
                    "gemini_calls_made": len(valid_thumbnails),
                    "architecture": "per_thumbnail_v2",
                    "common_layout": insight.common_layout,
                    "common_colors": insight.common_colors,
                    "common_elements": insight.common_elements,
                    "ideal_layout": insight.ideal_layout,
                    "ideal_color_palette": insight.ideal_color_palette,
                    "must_have_elements": insight.must_have_elements,
                    "avoid_elements": insight.avoid_elements,
                    "pro_tips": insight.pro_tips,
                },
            )
            
            # === CONFIDENCE & QUALITY ===
            
            # Calculate confidence based on factors
            confidence = (view_score * 0.3 + sample_score * 0.2 + 
                         (1.0 if has_consistent_patterns else 0.5) * 0.25 + 
                         ai_quality * 0.25)
            prov.set_confidence(confidence)
            prov.set_quality(ai_quality)
            
            # === VALIDATION ===
            
            validation_errors = []
            if len(valid_thumbnails) < 5:
                validation_errors.append("Insufficient thumbnails for reliable analysis (need at least 5)")
            if not insight.common_layout or insight.common_layout == "Analysis unavailable":
                validation_errors.append("Layout analysis incomplete")
            if not insight.common_colors:
                validation_errors.append("Color analysis incomplete")
            if successful_analyses < len(valid_thumbnails) * 0.5:
                validation_errors.append(f"Low analysis success rate: {successful_analyses}/{len(valid_thumbnails)}")
            
            prov.set_validation(
                passed=len(validation_errors) == 0,
                errors=validation_errors,
            )
            
            # === TAGS ===
            
            prov.add_tag(category_key)
            prov.add_tag("thumbnail_design")
            prov.add_tag("gemini_vision")
            prov.add_tag("per_thumbnail_v2")
            if has_consistent_patterns:
                prov.add_tag("clear_patterns")
            
            prov.set_algorithm_version("2.0.0")  # V2 per-thumbnail architecture


# Singleton
_provenance_analyzer: Optional[ProvenanceThumbnailVisionAnalyzer] = None

def get_provenance_vision_analyzer() -> ProvenanceThumbnailVisionAnalyzer:
    """Get the provenance-enabled vision analyzer."""
    global _provenance_analyzer
    if _provenance_analyzer is None:
        _provenance_analyzer = ProvenanceThumbnailVisionAnalyzer()
    return _provenance_analyzer
