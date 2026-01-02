"""
Creator Intel V2 - Live Stream Analyzer

Analyzes live streaming patterns using liveStreamingDetails:
- Premiere vs instant upload performance
- Optimal premiere scheduling times
- Stream duration vs edited video length
- Schedule adherence correlation
"""

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import logging

from backend.services.intel.core.base_analyzer import BaseAnalyzer, AnalysisResult

logger = logging.getLogger(__name__)


DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


@dataclass
class PremiereAnalysis:
    """Analysis of premiere vs instant upload performance."""
    premiere_count: int
    instant_count: int
    premiere_avg_views: float
    instant_avg_views: float
    performance_ratio: float
    recommendation: str


@dataclass
class ScheduleTimeSlot:
    """Performance metrics for a time slot."""
    hour_utc: int
    day_of_week: str
    premiere_count: int
    avg_views: float
    performance_index: float


@dataclass
class DurationComparison:
    """Comparison of stream duration vs edited video length."""
    avg_stream_duration_minutes: float
    avg_video_duration_minutes: float
    trim_ratio: float
    optimal_trim_ratio: float


@dataclass
class LiveStreamAnalysis:
    """Complete live stream analysis for a category."""
    category_key: str
    category_name: str
    
    # Premiere analysis
    premiere_analysis: PremiereAnalysis
    
    # Scheduling analysis
    best_premiere_times: List[ScheduleTimeSlot]
    worst_premiere_times: List[ScheduleTimeSlot]
    
    # Duration analysis
    duration_comparison: Optional[DurationComparison]
    
    # Schedule adherence
    avg_delay_seconds: float
    on_time_percent: float
    
    # Insights
    insights: List[str]
    
    # Metadata
    video_count: int
    live_video_count: int
    confidence: int
    analyzed_at: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        result = asdict(self)
        result["analyzed_at"] = self.analyzed_at.isoformat()
        return result


class LiveStreamAnalyzer(BaseAnalyzer):
    """
    Analyzes live stream and premiere patterns.
    
    Key insights generated:
    - "Premieres get 2.3x more first-hour views than instant uploads"
    - "Best premiere time: Tuesday 3PM EST"
    - "Top creators trim streams to 40% of original length"
    """
    
    @property
    def analyzer_name(self) -> str:
        """Return the analyzer name."""
        return "live_stream"
    
    def get_cache_key(self, category_key: str) -> str:
        """Generate cache key for this analysis."""
        return f"intel:livestream:precomputed:{category_key}"
    
    async def analyze(self, category_key: str) -> Optional[AnalysisResult]:
        """
        Analyze live stream patterns for a category.
        
        Args:
            category_key: The category to analyze
            
        Returns:
            AnalysisResult containing LiveStreamAnalysis
        """
        youtube_data = await self.load_youtube_data(category_key)
        
        if not youtube_data:
            return None
        
        videos = youtube_data.get("videos", [])
        game_name = youtube_data.get(
            "game_display_name",
            category_key.replace("_", " ").title()
        )
        
        # Filter to videos with live streaming data
        live_videos = [
            v for v in videos
            if v.get("was_live_stream") or v.get("is_premiere") or v.get("scheduled_start_time")
        ]
        
        if len(videos) < self.MIN_VIDEOS_REQUIRED:
            return None
        
        # Calculate content hash
        content_hash = self.calculate_content_hash(videos)
        
        # Analyze premieres
        premiere_analysis = self._analyze_premieres(videos)
        
        # Analyze scheduling
        best_times, worst_times = self._analyze_scheduling(live_videos)
        
        # Analyze duration
        duration_comparison = self._analyze_duration(live_videos)
        
        # Analyze schedule adherence
        avg_delay, on_time_pct = self._analyze_adherence(live_videos)
        
        # Generate insights
        insights = self._generate_insights(
            premiere_analysis, best_times, duration_comparison, game_name
        )
        
        confidence = min(75, 30 + len(live_videos) * 2)
        
        analysis = LiveStreamAnalysis(
            category_key=category_key,
            category_name=game_name,
            premiere_analysis=premiere_analysis,
            best_premiere_times=best_times,
            worst_premiere_times=worst_times,
            duration_comparison=duration_comparison,
            avg_delay_seconds=avg_delay,
            on_time_percent=on_time_pct,
            insights=insights,
            video_count=len(videos),
            live_video_count=len(live_videos),
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
    
    def _analyze_premieres(self, videos: List[Dict]) -> PremiereAnalysis:
        """Compare premiere vs instant upload performance."""
        premieres = [
            v for v in videos
            if v.get("is_premiere") or v.get("scheduled_start_time")
        ]
        instant = [
            v for v in videos
            if not (v.get("is_premiere") or v.get("scheduled_start_time"))
        ]
        
        premiere_views = [v.get("view_count", 0) for v in premieres]
        instant_views = [v.get("view_count", 0) for v in instant]
        
        premiere_avg = sum(premiere_views) / len(premiere_views) if premiere_views else 0
        instant_avg = sum(instant_views) / len(instant_views) if instant_views else 0
        
        # FIXED: Don't make recommendations without sufficient premiere data
        # Need at least 3 premieres to make a meaningful comparison
        if len(premieres) < 3:
            recommendation = "Insufficient premiere data - need more samples to compare"
            ratio = 0.0
        else:
            ratio = premiere_avg / instant_avg if instant_avg > 0 else 1
            
            if ratio > 1.5:
                recommendation = "Premieres significantly outperform - use for major content"
            elif ratio > 1:
                recommendation = "Premieres slightly better - use for important releases"
            elif ratio > 0.7:
                recommendation = "Similar performance - premieres good for community building"
            else:
                recommendation = "Instant uploads performing better - skip premieres"
        
        return PremiereAnalysis(
            premiere_count=len(premieres),
            instant_count=len(instant),
            premiere_avg_views=round(premiere_avg, 2),
            instant_avg_views=round(instant_avg, 2),
            performance_ratio=round(ratio, 2),
            recommendation=recommendation,
        )
    
    def _analyze_scheduling(
        self,
        live_videos: List[Dict],
    ) -> Tuple[List[ScheduleTimeSlot], List[ScheduleTimeSlot]]:
        """Analyze best and worst premiere times."""
        # Group by hour and day
        time_slots: Dict[Tuple[int, str], List[int]] = {}
        
        for video in live_videos:
            scheduled = video.get("scheduled_start_time")
            if not scheduled:
                continue
            
            try:
                if isinstance(scheduled, str):
                    dt = datetime.fromisoformat(scheduled.replace("Z", "+00:00"))
                else:
                    dt = scheduled
                
                hour = dt.hour
                day = DAYS_OF_WEEK[dt.weekday()]
                views = video.get("view_count", 0)
                
                key = (hour, day)
                if key not in time_slots:
                    time_slots[key] = []
                time_slots[key].append(views)
            except (ValueError, TypeError):
                continue
        
        if not time_slots:
            return [], []
        
        # Calculate average for each slot
        all_views = [v.get("view_count", 0) for v in live_videos]
        category_avg = sum(all_views) / len(all_views) if all_views else 1
        
        slots = []
        for (hour, day), views_list in time_slots.items():
            if len(views_list) < 2:
                continue
            
            avg_views = sum(views_list) / len(views_list)
            
            slots.append(ScheduleTimeSlot(
                hour_utc=hour,
                day_of_week=day,
                premiere_count=len(views_list),
                avg_views=round(avg_views, 2),
                performance_index=round(avg_views / category_avg, 2) if category_avg > 0 else 1,
            ))
        
        # Sort by performance
        slots.sort(key=lambda x: x.performance_index, reverse=True)
        
        best = slots[:3]
        worst = slots[-3:] if len(slots) > 3 else []
        
        return best, worst
    
    def _analyze_duration(self, live_videos: List[Dict]) -> Optional[DurationComparison]:
        """Compare stream duration vs edited video length."""
        comparisons = []
        
        for video in live_videos:
            stream_duration = video.get("actual_stream_duration_seconds")
            video_duration = video.get("duration_seconds")
            
            if stream_duration and video_duration and stream_duration > 0:
                trim_ratio = video_duration / stream_duration
                comparisons.append({
                    "stream": stream_duration,
                    "video": video_duration,
                    "ratio": trim_ratio,
                    "views": video.get("view_count", 0),
                })
        
        if len(comparisons) < 3:
            return None
        
        avg_stream = sum(c["stream"] for c in comparisons) / len(comparisons)
        avg_video = sum(c["video"] for c in comparisons) / len(comparisons)
        avg_ratio = sum(c["ratio"] for c in comparisons) / len(comparisons)
        
        # Find optimal ratio (correlate with views)
        buckets: Dict[float, List[int]] = {}
        for c in comparisons:
            bucket = round(c["ratio"] * 10) / 10
            if bucket not in buckets:
                buckets[bucket] = []
            buckets[bucket].append(c["views"])
        
        optimal_ratio = avg_ratio
        best_avg = 0
        for ratio, views_list in buckets.items():
            if len(views_list) >= 2:
                avg = sum(views_list) / len(views_list)
                if avg > best_avg:
                    best_avg = avg
                    optimal_ratio = ratio
        
        return DurationComparison(
            avg_stream_duration_minutes=round(avg_stream / 60, 1),
            avg_video_duration_minutes=round(avg_video / 60, 1),
            trim_ratio=round(avg_ratio, 2),
            optimal_trim_ratio=round(optimal_ratio, 2),
        )
    
    def _analyze_adherence(self, live_videos: List[Dict]) -> Tuple[float, float]:
        """Analyze how well creators stick to scheduled times."""
        delays = []
        
        for video in live_videos:
            delay = video.get("premiere_delay_seconds")
            if delay is not None:
                delays.append(delay)
        
        if not delays:
            return 0, 0
        
        avg_delay = sum(delays) / len(delays)
        on_time = sum(1 for d in delays if abs(d) <= 300)  # Within 5 minutes
        on_time_pct = (on_time / len(delays)) * 100
        
        return round(avg_delay, 2), round(on_time_pct, 1)
    
    def _generate_insights(
        self,
        premiere_analysis: PremiereAnalysis,
        best_times: List[ScheduleTimeSlot],
        duration_comparison: Optional[DurationComparison],
        game_name: str,
    ) -> List[str]:
        """Generate human-readable insights."""
        insights = []
        
        # Premiere insight
        if premiere_analysis.premiere_count >= 3 and premiere_analysis.instant_count >= 3:
            if premiere_analysis.performance_ratio > 1.2:
                insights.append(
                    f"Premieres get {premiere_analysis.performance_ratio:.1f}x more views "
                    f"than instant uploads in {game_name}"
                )
            elif premiere_analysis.performance_ratio < 0.8:
                insights.append(
                    f"Instant uploads outperform premieres by "
                    f"{1/premiere_analysis.performance_ratio:.1f}x - skip the premiere"
                )
        
        # Best time insight
        if best_times:
            best = best_times[0]
            insights.append(
                f"Best premiere time: {best.day_of_week.title()} {best.hour_utc}:00 UTC "
                f"({best.performance_index:.1f}x avg performance)"
            )
        
        # Duration insight
        if duration_comparison:
            keep_pct = duration_comparison.optimal_trim_ratio * 100
            insights.append(
                f"Top creators keep {keep_pct:.0f}% of stream footage in edited uploads"
            )
        
        return insights[:5]


# Singleton
_live_stream_analyzer: Optional[LiveStreamAnalyzer] = None


def get_live_stream_analyzer() -> LiveStreamAnalyzer:
    """Get the singleton analyzer instance."""
    global _live_stream_analyzer
    if _live_stream_analyzer is None:
        _live_stream_analyzer = LiveStreamAnalyzer()
    return _live_stream_analyzer
