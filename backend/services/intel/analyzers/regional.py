"""
Creator Intel V2 - Regional Analyzer

Analyzes regional competition and opportunities:
- YouTube: default_audio_language
- Twitch: language field

Key insights:
- "Spanish Fortnite has 50% less competition"
- "German Valorant viewers are underserved"
- "English dominates but Portuguese is growing"
"""

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import json
import logging

from backend.services.intel.core.base_analyzer import BaseAnalyzer, AnalysisResult

logger = logging.getLogger(__name__)


# Language code to name mapping
LANGUAGE_NAMES = {
    "en": "English",
    "es": "Spanish",
    "pt": "Portuguese",
    "de": "German",
    "fr": "French",
    "it": "Italian",
    "ru": "Russian",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
    "ar": "Arabic",
    "hi": "Hindi",
    "tr": "Turkish",
    "pl": "Polish",
    "nl": "Dutch",
    "sv": "Swedish",
    "th": "Thai",
    "vi": "Vietnamese",
    "id": "Indonesian",
}


@dataclass
class LanguageMetrics:
    """Metrics for a specific language."""
    language_code: str
    language_name: str
    
    # YouTube metrics
    youtube_video_count: int
    youtube_avg_views: float
    youtube_total_views: int
    
    # Twitch metrics
    twitch_stream_count: int
    twitch_avg_viewers: float
    twitch_total_viewers: int
    
    # Derived
    competition_score: float
    opportunity_score: float
    market_share_percent: float


@dataclass
class RegionalAnalysis:
    """Complete regional analysis for a category."""
    category_key: str
    category_name: str
    
    # Language breakdown
    languages: List[LanguageMetrics]
    dominant_language: str
    underserved_languages: List[str]
    
    # Opportunity analysis
    best_opportunity_language: str
    opportunity_reason: str
    
    # Insights
    insights: List[str]
    
    # Metadata
    youtube_video_count: int
    twitch_stream_count: int
    confidence: int
    analyzed_at: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        result = asdict(self)
        result["analyzed_at"] = self.analyzed_at.isoformat()
        return result


class RegionalAnalyzer(BaseAnalyzer):
    """
    Analyzes regional competition and opportunities.
    
    Combines YouTube language data with Twitch stream languages
    to identify underserved markets.
    """
    
    @property
    def analyzer_name(self) -> str:
        """Return the analyzer name."""
        return "regional"
    
    def get_cache_key(self, category_key: str) -> str:
        """Generate cache key for this analysis."""
        return f"intel:regional:precomputed:{category_key}"
    
    async def analyze(
        self,
        category_key: str,
        twitch_game_id: Optional[str] = None,
    ) -> Optional[AnalysisResult]:
        """
        Analyze regional patterns for a category.
        
        Args:
            category_key: The category to analyze
            twitch_game_id: Optional Twitch game ID for stream data
            
        Returns:
            AnalysisResult containing RegionalAnalysis
        """
        # Load YouTube data
        youtube_data = await self.load_youtube_data(category_key)
        
        youtube_videos = []
        game_name = category_key.replace("_", " ").title()
        
        if youtube_data:
            youtube_videos = youtube_data.get("videos", [])
            game_name = youtube_data.get("game_display_name", game_name)
        
        # Load Twitch data
        twitch_streams = []
        if twitch_game_id:
            twitch_data = await self.load_twitch_data(twitch_game_id, "streams")
            if twitch_data:
                twitch_streams = twitch_data.get("streams", [])
        
        if not youtube_videos and not twitch_streams:
            return None
        
        # Calculate content hash
        content_hash = self.calculate_content_hash(youtube_videos)
        
        # Analyze by language
        language_metrics = self._analyze_languages(youtube_videos, twitch_streams)
        
        if not language_metrics:
            return None
        
        # Find opportunities
        dominant = max(language_metrics, key=lambda x: x.market_share_percent)
        underserved = [
            lm.language_code for lm in language_metrics
            if lm.opportunity_score > 60 and lm.language_code != dominant.language_code
        ]
        
        best_opportunity = max(language_metrics, key=lambda x: x.opportunity_score)
        
        # Generate insights
        insights = self._generate_insights(language_metrics, game_name)
        
        confidence = min(80, 30 + len(youtube_videos) // 2 + len(twitch_streams) // 5)
        
        analysis = RegionalAnalysis(
            category_key=category_key,
            category_name=game_name,
            languages=language_metrics,
            dominant_language=dominant.language_code,
            underserved_languages=underserved[:3],
            best_opportunity_language=best_opportunity.language_code,
            opportunity_reason=self._get_opportunity_reason(best_opportunity),
            insights=insights,
            youtube_video_count=len(youtube_videos),
            twitch_stream_count=len(twitch_streams),
            confidence=confidence,
            analyzed_at=datetime.now(timezone.utc),
        )
        
        return AnalysisResult(
            data=analysis.to_dict(),
            category_key=category_key,
            analyzer_name=self.analyzer_name,
            confidence=confidence,
            video_count=len(youtube_videos),
            content_hash=content_hash,
        )
    
    def _analyze_languages(
        self,
        youtube_videos: List[Dict],
        twitch_streams: List[Dict],
    ) -> List[LanguageMetrics]:
        """Analyze metrics by language."""
        # YouTube by language
        yt_by_lang: Dict[str, Dict[str, Any]] = {}
        for video in youtube_videos:
            lang = video.get("default_audio_language", "en")
            if lang:
                lang = lang[:2].lower()
                if lang not in yt_by_lang:
                    yt_by_lang[lang] = {"videos": [], "views": []}
                yt_by_lang[lang]["videos"].append(video)
                yt_by_lang[lang]["views"].append(video.get("view_count", 0))
        
        # Twitch by language
        tw_by_lang: Dict[str, Dict[str, Any]] = {}
        for stream in twitch_streams:
            lang = stream.get("language", "en")
            if lang:
                lang = lang[:2].lower()
                if lang not in tw_by_lang:
                    tw_by_lang[lang] = {"streams": [], "viewers": []}
                tw_by_lang[lang]["streams"].append(stream)
                tw_by_lang[lang]["viewers"].append(stream.get("viewer_count", 0))
        
        # Combine languages
        all_langs = set(yt_by_lang.keys()) | set(tw_by_lang.keys())
        
        # Calculate totals for market share
        total_yt_views = sum(v.get("view_count", 0) for v in youtube_videos)
        total_tw_viewers = sum(s.get("viewer_count", 0) for s in twitch_streams)
        
        metrics = []
        for lang in all_langs:
            yt_data = yt_by_lang.get(lang, {"videos": [], "views": []})
            tw_data = tw_by_lang.get(lang, {"streams": [], "viewers": []})
            
            yt_video_count = len(yt_data["videos"])
            yt_views = yt_data["views"]
            yt_avg_views = sum(yt_views) / len(yt_views) if yt_views else 0
            yt_total_views = sum(yt_views)
            
            tw_stream_count = len(tw_data["streams"])
            tw_viewers = tw_data["viewers"]
            tw_avg_viewers = sum(tw_viewers) / len(tw_viewers) if tw_viewers else 0
            tw_total_viewers = sum(tw_viewers)
            
            # Calculate competition score (lower = less competition)
            competition = self._calculate_competition(
                yt_video_count, yt_avg_views, tw_stream_count, tw_avg_viewers
            )
            
            # Calculate opportunity score
            # FIXED: Require minimum 3 videos to claim opportunity
            # 1-2 videos is statistically meaningless
            if yt_video_count < 3 and tw_stream_count < 5:
                # Insufficient data - set opportunity to 0
                opportunity = 0
            else:
                opportunity = 100 - competition
            
            # Market share
            market_share = 0.0
            if total_yt_views > 0:
                market_share += (yt_total_views / total_yt_views) * 50
            if total_tw_viewers > 0:
                market_share += (tw_total_viewers / total_tw_viewers) * 50
            
            metrics.append(LanguageMetrics(
                language_code=lang,
                language_name=LANGUAGE_NAMES.get(lang, lang.upper()),
                youtube_video_count=yt_video_count,
                youtube_avg_views=round(yt_avg_views, 2),
                youtube_total_views=yt_total_views,
                twitch_stream_count=tw_stream_count,
                twitch_avg_viewers=round(tw_avg_viewers, 2),
                twitch_total_viewers=tw_total_viewers,
                competition_score=round(competition, 2),
                opportunity_score=round(opportunity, 2),
                market_share_percent=round(market_share, 2),
            ))
        
        # Sort by market share
        metrics.sort(key=lambda x: x.market_share_percent, reverse=True)
        
        return metrics[:10]
    
    def _calculate_competition(
        self,
        yt_videos: int,
        yt_avg_views: float,
        tw_streams: int,
        tw_avg_viewers: float,
    ) -> float:
        """
        Calculate competition score (0-100).
        
        High competition = many creators, low average views/viewers
        Low competition = few creators, high average views/viewers
        """
        # More videos = more competition
        video_factor = min(100, yt_videos * 2)
        
        # More streams = more competition
        stream_factor = min(100, tw_streams * 0.5)
        
        # Higher avg views = demand exists (reduces competition score)
        demand_factor = min(50, yt_avg_views / 10000 * 50) if yt_avg_views > 0 else 0
        
        # Combine
        competition = (video_factor * 0.4 + stream_factor * 0.4) - demand_factor * 0.2
        
        return max(0, min(100, competition))
    
    def _get_opportunity_reason(self, lm: LanguageMetrics) -> str:
        """Generate reason for opportunity."""
        if lm.youtube_video_count < 10 and lm.twitch_stream_count < 20:
            return f"Very few {lm.language_name} creators - first mover advantage"
        elif lm.youtube_avg_views > 50000:
            return f"High demand ({lm.youtube_avg_views:,.0f} avg views) with moderate supply"
        elif lm.twitch_avg_viewers > 500:
            return f"Strong Twitch audience ({lm.twitch_avg_viewers:,.0f} avg viewers)"
        else:
            return f"Underserved {lm.language_name} market"
    
    def _generate_insights(
        self,
        metrics: List[LanguageMetrics],
        game_name: str,
    ) -> List[str]:
        """Generate human-readable insights."""
        insights = []
        
        if not metrics:
            return insights
        
        # Dominant language insight
        dominant = metrics[0]
        insights.append(
            f"{dominant.language_name} dominates {game_name} with "
            f"{dominant.market_share_percent:.0f}% market share"
        )
        
        # Underserved market insight
        for lm in metrics[1:4]:
            if lm.opportunity_score > 60:
                insights.append(
                    f"{lm.language_name} {game_name} has {100-lm.competition_score:.0f}% less "
                    f"competition than English"
                )
                break
        
        # Growth opportunity
        high_demand = [
            lm for lm in metrics
            if lm.youtube_avg_views > 30000 and lm.competition_score < 50
        ]
        if high_demand:
            lm = high_demand[0]
            insights.append(
                f"{lm.language_name} shows high demand ({lm.youtube_avg_views:,.0f} avg views) "
                f"with low competition"
            )
        
        return insights[:5]


# Singleton
_regional_analyzer: Optional[RegionalAnalyzer] = None


def get_regional_analyzer() -> RegionalAnalyzer:
    """Get the singleton analyzer instance."""
    global _regional_analyzer
    if _regional_analyzer is None:
        _regional_analyzer = RegionalAnalyzer()
    return _regional_analyzer
