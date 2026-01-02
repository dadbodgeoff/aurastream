"""
Creator Intel V2 - Content Format Analyzer

Analyzes video format patterns to identify optimal content structures:
- Optimal video duration by category
- Shorts vs long-form performance comparison
- Live vs VOD performance
- HD vs SD quality correlation
"""

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import logging

from backend.services.intel.core.base_analyzer import BaseAnalyzer, AnalysisResult

logger = logging.getLogger(__name__)


@dataclass
class DurationBucket:
    """Performance metrics for a duration range."""
    min_seconds: int
    max_seconds: int
    label: str
    video_count: int
    avg_views: float
    avg_engagement: float
    total_views: int
    performance_index: float


@dataclass
class FormatComparison:
    """Comparison between two content formats."""
    format_a: str
    format_b: str
    format_a_count: int
    format_b_count: int
    format_a_avg_views: float
    format_b_avg_views: float
    performance_ratio: float
    recommendation: str
    confidence: int


@dataclass
class ContentFormatAnalysis:
    """Complete content format analysis for a category."""
    category_key: str
    category_name: str
    
    # Duration analysis
    duration_buckets: List[DurationBucket]
    optimal_duration_range: str
    optimal_duration_min_seconds: int
    optimal_duration_max_seconds: int
    
    # Format comparisons
    shorts_vs_longform: FormatComparison
    live_vs_vod: FormatComparison
    hd_vs_sd: FormatComparison
    
    # Insights
    insights: List[str]
    
    # Metadata
    video_count: int
    confidence: int
    analyzed_at: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        result = asdict(self)
        result["analyzed_at"] = self.analyzed_at.isoformat()
        return result


class ContentFormatAnalyzer(BaseAnalyzer):
    """
    Analyzes content format patterns for gaming categories.
    
    Key insights generated:
    - "Fortnite videos 12-18 min get 2.3x more views"
    - "Shorts get 5x velocity but 0.3x total views"
    - "HD videos get 15% more engagement"
    """
    
    # Duration bucket definitions (in seconds)
    DURATION_BUCKETS = [
        (0, 60, "Shorts (0-60s)"),
        (61, 300, "Short (1-5min)"),
        (301, 600, "Medium (5-10min)"),
        (601, 900, "Standard (10-15min)"),
        (901, 1200, "Long (15-20min)"),
        (1201, 1800, "Extended (20-30min)"),
        (1801, 3600, "Very Long (30-60min)"),
        (3601, 999999, "Marathon (60min+)"),
    ]
    
    @property
    def analyzer_name(self) -> str:
        """Return the analyzer name."""
        return "content_format"
    
    def get_cache_key(self, category_key: str) -> str:
        """Generate cache key for this analysis."""
        return f"intel:format:precomputed:{category_key}"
    
    async def analyze(self, category_key: str) -> Optional[AnalysisResult]:
        """
        Analyze content format patterns for a category.
        
        Args:
            category_key: The category to analyze
            
        Returns:
            AnalysisResult containing ContentFormatAnalysis
        """
        # Load YouTube data
        youtube_data = await self.load_youtube_data(category_key)
        
        if not youtube_data:
            logger.warning(f"No YouTube data for {category_key}")
            return None
        
        videos = youtube_data.get("videos", [])
        game_name = youtube_data.get(
            "game_display_name",
            category_key.replace("_", " ").title()
        )
        
        if len(videos) < self.MIN_VIDEOS_REQUIRED:
            logger.warning(
                f"Insufficient videos for format analysis: {len(videos)}"
            )
            return None
        
        # Calculate content hash for change detection
        content_hash = self.calculate_content_hash(videos)
        
        # Analyze duration buckets
        duration_buckets = self._analyze_duration_buckets(videos)
        optimal_bucket = self._find_optimal_duration(duration_buckets)
        
        # Compare formats
        shorts_vs_longform = self._compare_shorts_vs_longform(videos)
        live_vs_vod = self._compare_live_vs_vod(videos)
        hd_vs_sd = self._compare_hd_vs_sd(videos)
        
        # Generate insights
        insights = self._generate_insights(
            duration_buckets, shorts_vs_longform, live_vs_vod, hd_vs_sd, game_name
        )
        
        # Calculate confidence
        confidence = self.calculate_confidence(len(videos))
        
        analysis = ContentFormatAnalysis(
            category_key=category_key,
            category_name=game_name,
            duration_buckets=duration_buckets,
            optimal_duration_range=optimal_bucket.label if optimal_bucket else "Unknown",
            optimal_duration_min_seconds=optimal_bucket.min_seconds if optimal_bucket else 0,
            optimal_duration_max_seconds=optimal_bucket.max_seconds if optimal_bucket else 0,
            shorts_vs_longform=shorts_vs_longform,
            live_vs_vod=live_vs_vod,
            hd_vs_sd=hd_vs_sd,
            insights=insights,
            video_count=len(videos),
            confidence=confidence,
            analyzed_at=datetime.now(timezone.utc),
        )
        
        return AnalysisResult(
            data=analysis.to_dict(),
            category_key=category_key,
            analyzer_name=self.analyzer_name,
            confidence=confidence,
            video_count=len(videos),
            content_hash=content_hash,
        )
    
    def _analyze_duration_buckets(self, videos: List[Dict]) -> List[DurationBucket]:
        """Group videos by duration and calculate performance metrics."""
        buckets: Dict[str, List[Dict]] = {label: [] for _, _, label in self.DURATION_BUCKETS}
        
        for video in videos:
            duration = video.get("duration_seconds")
            if not duration:
                continue
            
            for min_s, max_s, label in self.DURATION_BUCKETS:
                if min_s <= duration <= max_s:
                    buckets[label].append(video)
                    break
        
        # Calculate category average
        all_views = [v.get("view_count", 0) for v in videos if v.get("view_count")]
        category_avg = sum(all_views) / len(all_views) if all_views else 1
        
        result = []
        for min_s, max_s, label in self.DURATION_BUCKETS:
            bucket_videos = buckets[label]
            if not bucket_videos:
                continue
            
            views = [v.get("view_count", 0) for v in bucket_videos]
            engagements = [v.get("engagement_rate", 0) or 0 for v in bucket_videos]
            
            avg_views = sum(views) / len(views)
            performance_index = avg_views / category_avg if category_avg > 0 else 1
            
            result.append(DurationBucket(
                min_seconds=min_s,
                max_seconds=max_s,
                label=label,
                video_count=len(bucket_videos),
                avg_views=round(avg_views, 2),
                avg_engagement=round(sum(engagements) / len(engagements), 4) if engagements else 0,
                total_views=sum(views),
                performance_index=round(performance_index, 2),
            ))
        
        return result
    
    def _find_optimal_duration(
        self,
        buckets: List[DurationBucket],
    ) -> Optional[DurationBucket]:
        """Find the duration bucket with best performance index."""
        if not buckets:
            return None
        
        # Filter buckets with at least 3 videos for statistical significance
        significant_buckets = [b for b in buckets if b.video_count >= 3]
        
        if not significant_buckets:
            return max(buckets, key=lambda b: b.performance_index)
        
        return max(significant_buckets, key=lambda b: b.performance_index)
    
    def _compare_shorts_vs_longform(self, videos: List[Dict]) -> FormatComparison:
        """Compare Shorts (<60s) vs long-form performance."""
        shorts = [v for v in videos if v.get("is_short")]
        longform = [v for v in videos if not v.get("is_short")]
        
        shorts_views = [v.get("view_count", 0) for v in shorts]
        longform_views = [v.get("view_count", 0) for v in longform]
        
        shorts_avg = sum(shorts_views) / len(shorts_views) if shorts_views else 0
        longform_avg = sum(longform_views) / len(longform_views) if longform_views else 0
        
        # FIXED: Handle edge cases properly
        if longform_avg > 0:
            ratio = shorts_avg / longform_avg
        elif shorts_avg > 0:
            # No long-form data but shorts exist
            ratio = float('inf')
        else:
            # No data for either
            ratio = 1.0
        
        # FIXED: Better recommendations based on data availability
        if len(shorts) < 3 or len(longform) < 3:
            recommendation = "Insufficient data to compare formats - need more samples"
        elif ratio == float('inf'):
            recommendation = "Only Shorts data available - consider testing long-form"
        elif ratio > 1.5:
            recommendation = "Shorts significantly outperforming - prioritize short content"
        elif ratio > 1:
            recommendation = "Shorts slightly better - mix both formats"
        elif ratio > 0.5:
            recommendation = "Long-form slightly better - focus on quality long content"
        else:
            recommendation = "Long-form significantly better - prioritize detailed content"
        
        # Cap ratio for display purposes
        display_ratio = min(ratio, 99.99) if ratio != float('inf') else 99.99
        
        confidence = min(80, 30 + len(shorts) * 2 + len(longform) * 2)
        
        return FormatComparison(
            format_a="Shorts",
            format_b="Long-form",
            format_a_count=len(shorts),
            format_b_count=len(longform),
            format_a_avg_views=round(shorts_avg, 2),
            format_b_avg_views=round(longform_avg, 2),
            performance_ratio=round(display_ratio, 2),
            recommendation=recommendation,
            confidence=confidence,
        )
    
    def _compare_live_vs_vod(self, videos: List[Dict]) -> FormatComparison:
        """Compare live stream VODs vs edited uploads."""
        live = [v for v in videos if v.get("was_live_stream") or v.get("is_live")]
        vod = [v for v in videos if not (v.get("was_live_stream") or v.get("is_live"))]
        
        live_views = [v.get("view_count", 0) for v in live]
        vod_views = [v.get("view_count", 0) for v in vod]
        
        live_avg = sum(live_views) / len(live_views) if live_views else 0
        vod_avg = sum(vod_views) / len(vod_views) if vod_views else 0
        
        # FIXED: Handle edge cases properly
        if vod_avg > 0:
            ratio = live_avg / vod_avg
        elif live_avg > 0:
            ratio = float('inf')
        else:
            ratio = 1.0
        
        # FIXED: Better recommendations based on data availability
        if len(live) < 3 or len(vod) < 3:
            recommendation = "Insufficient data to compare live vs edited - need more samples"
        elif ratio == float('inf'):
            recommendation = "Only live content data available - consider testing edited uploads"
        elif ratio > 1:
            recommendation = "Live content performing well - consider more streams"
        else:
            recommendation = "Edited content outperforming - focus on post-production"
        
        # Cap ratio for display
        display_ratio = min(ratio, 99.99) if ratio != float('inf') else 99.99
        
        confidence = min(70, 20 + len(live) * 3 + len(vod) * 2)
        
        return FormatComparison(
            format_a="Live/Stream VOD",
            format_b="Edited Upload",
            format_a_count=len(live),
            format_b_count=len(vod),
            format_a_avg_views=round(live_avg, 2),
            format_b_avg_views=round(vod_avg, 2),
            performance_ratio=round(display_ratio, 2),
            recommendation=recommendation,
            confidence=confidence,
        )
    
    def _compare_hd_vs_sd(self, videos: List[Dict]) -> FormatComparison:
        """Compare HD vs SD video performance."""
        hd = [v for v in videos if v.get("definition") == "hd"]
        sd = [v for v in videos if v.get("definition") == "sd"]
        
        hd_views = [v.get("view_count", 0) for v in hd]
        sd_views = [v.get("view_count", 0) for v in sd]
        
        hd_avg = sum(hd_views) / len(hd_views) if hd_views else 0
        sd_avg = sum(sd_views) / len(sd_views) if sd_views else 0
        
        ratio = hd_avg / sd_avg if sd_avg > 0 else 1
        
        recommendation = "HD is standard - always upload in HD quality"
        confidence = min(60, 20 + len(hd) + len(sd))
        
        return FormatComparison(
            format_a="HD",
            format_b="SD",
            format_a_count=len(hd),
            format_b_count=len(sd),
            format_a_avg_views=round(hd_avg, 2),
            format_b_avg_views=round(sd_avg, 2),
            performance_ratio=round(ratio, 2),
            recommendation=recommendation,
            confidence=confidence,
        )
    
    def _generate_insights(
        self,
        duration_buckets: List[DurationBucket],
        shorts_vs_longform: FormatComparison,
        live_vs_vod: FormatComparison,
        hd_vs_sd: FormatComparison,
        game_name: str,
    ) -> List[str]:
        """Generate human-readable insights."""
        insights = []
        
        # Duration insight
        optimal = self._find_optimal_duration(duration_buckets)
        if optimal and optimal.performance_index > 1.2:
            insights.append(
                f"{game_name} videos in the {optimal.label} range get "
                f"{optimal.performance_index:.1f}x more views than average"
            )
        
        # Shorts insight
        if shorts_vs_longform.format_a_count >= 3 and shorts_vs_longform.format_b_count >= 3:
            if shorts_vs_longform.performance_ratio > 1.5:
                insights.append(
                    f"Shorts are crushing it - {shorts_vs_longform.performance_ratio:.1f}x "
                    f"the views of long-form content"
                )
            elif shorts_vs_longform.performance_ratio < 0.5:
                insights.append(
                    f"Long-form dominates - {1/shorts_vs_longform.performance_ratio:.1f}x "
                    f"better than Shorts"
                )
        
        # Live insight
        if live_vs_vod.format_a_count >= 3:
            if live_vs_vod.performance_ratio > 0.8:
                insights.append(
                    f"Live stream VODs holding strong at "
                    f"{live_vs_vod.format_a_avg_views:,.0f} avg views"
                )
        
        return insights[:5]


# Singleton
_content_format_analyzer: Optional[ContentFormatAnalyzer] = None


def get_content_format_analyzer() -> ContentFormatAnalyzer:
    """Get the singleton analyzer instance."""
    global _content_format_analyzer
    if _content_format_analyzer is None:
        _content_format_analyzer = ContentFormatAnalyzer()
    return _content_format_analyzer
