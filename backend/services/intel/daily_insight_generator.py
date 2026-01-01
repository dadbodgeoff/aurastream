"""
Daily Insight Generator

Generates ONE specific, actionable insight per day based on real data.
Not generic fluff like "Perfect timing!" - actual data-driven insights:

Examples:
- "Fortnite 'zero build' videos are getting 3.2x more views than average"
- "Competition in Valorant dropped 40% - only 847 streamers live right now"
- "The phrase 'winterfest' appeared in 8 of the top 10 Fortnite videos"
- "Apex Legends has 12 viral clips in the last hour - reaction content opportunity"

Each insight includes:
- The specific data point
- Why it matters
- What action to take
- Confidence level
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


@dataclass
class DailyInsight:
    """A specific, actionable insight based on real data."""
    insight_type: str  # "trending_phrase", "low_competition", "viral_spike", "keyword_surge"
    headline: str  # The main insight (specific, data-driven)
    detail: str  # Supporting data
    action: str  # What to do about it
    category: str  # Which game/category
    category_name: str
    metric_value: str  # The specific number (e.g., "3.2x", "40%", "8 of 10")
    metric_label: str  # What the metric means
    confidence: int  # 0-100
    data_source: str  # Where this came from
    generated_at: str


class DailyInsightGenerator:
    """
    Generates specific, actionable insights from real data.
    
    Analyzes:
    - Viral detector: trending topics, velocity spikes
    - Title intel: trending phrases, keyword surges
    - Competition: stream count changes, viewer ratios
    - Clip radar: viral clip counts by category
    """

    def __init__(self):
        self._viral_detector = None
        self._title_analyzer = None
        self._competition_analyzer = None

    @property
    def viral_detector(self):
        if self._viral_detector is None:
            try:
                from backend.services.intel.viral_detector import get_viral_detector
                self._viral_detector = get_viral_detector()
            except Exception as e:
                logger.warning(f"Failed to load viral detector: {e}")
        return self._viral_detector

    @property
    def title_analyzer(self):
        if self._title_analyzer is None:
            try:
                from backend.services.title_intel import get_title_intel_analyzer
                self._title_analyzer = get_title_intel_analyzer()
            except Exception as e:
                logger.warning(f"Failed to load title analyzer: {e}")
        return self._title_analyzer

    @property
    def competition_analyzer(self):
        if self._competition_analyzer is None:
            try:
                from backend.services.intel.competition_analyzer import get_competition_analyzer
                self._competition_analyzer = get_competition_analyzer()
            except Exception as e:
                logger.warning(f"Failed to load competition analyzer: {e}")
        return self._competition_analyzer

    async def generate_insight(
        self,
        subscribed_categories: List[Dict[str, Any]],
    ) -> Optional[DailyInsight]:
        """
        Generate the single best insight for the user's subscribed categories.
        
        Prioritizes insights by:
        1. Specificity (actual numbers > vague statements)
        2. Actionability (clear next step)
        3. Timeliness (happening NOW)
        4. Confidence (data quality)
        """
        if not subscribed_categories:
            return None

        # Gather all potential insights
        insights: List[DailyInsight] = []

        for category in subscribed_categories:
            cat_key = category.get("key", "")
            cat_name = category.get("name", cat_key.replace("_", " ").title())

            # Try each insight type
            phrase_insight = await self._check_trending_phrase(cat_key, cat_name)
            if phrase_insight:
                insights.append(phrase_insight)

            viral_insight = await self._check_viral_spike(cat_key, cat_name)
            if viral_insight:
                insights.append(viral_insight)

            keyword_insight = await self._check_keyword_surge(cat_key, cat_name)
            if keyword_insight:
                insights.append(keyword_insight)

            competition_insight = await self._check_competition_window(cat_key, cat_name, category)
            if competition_insight:
                insights.append(competition_insight)

        if not insights:
            return None

        # Return the highest confidence insight
        insights.sort(key=lambda x: x.confidence, reverse=True)
        return insights[0]

    async def _check_trending_phrase(
        self,
        cat_key: str,
        cat_name: str,
    ) -> Optional[DailyInsight]:
        """Check for trending multi-word phrases."""
        if not self.title_analyzer:
            return None

        try:
            intel = await self.title_analyzer.analyze_game(cat_key)
            if not intel or not intel.top_phrases:
                return None

            # Find a phrase that's actually trending (high velocity)
            for phrase in intel.top_phrases[:3]:
                if phrase.is_trending and phrase.confidence >= 60:
                    # Calculate how much better than average
                    if intel.avg_views > 0:
                        multiplier = phrase.avg_views / intel.avg_views
                        if multiplier >= 1.5:
                            return DailyInsight(
                                insight_type="trending_phrase",
                                headline=f"'{phrase.phrase}' videos are outperforming by {multiplier:.1f}x",
                                detail=f"Videos with '{phrase.phrase}' average {phrase.avg_views:,} views vs {intel.avg_views:,} category average",
                                action=f"Create a {cat_name} video featuring '{phrase.phrase}' in your title",
                                category=cat_key,
                                category_name=cat_name,
                                metric_value=f"{multiplier:.1f}x",
                                metric_label="above average views",
                                confidence=phrase.confidence,
                                data_source="title_intel",
                                generated_at=datetime.now(timezone.utc).isoformat(),
                            )

        except Exception as e:
            logger.warning(f"Failed to check trending phrase for {cat_key}: {e}")

        return None

    async def _check_viral_spike(
        self,
        cat_key: str,
        cat_name: str,
    ) -> Optional[DailyInsight]:
        """Check for viral content spikes."""
        if not self.viral_detector:
            return None

        try:
            analysis = await self.viral_detector.analyze_category(cat_key)
            if not analysis:
                return None

            # Check for significant viral activity
            total_trending = analysis.viral_video_count + analysis.rising_video_count
            if total_trending >= 5 and analysis.confidence >= 50:
                # Get the top trending topic
                top_topic = analysis.trending_topics[0] if analysis.trending_topics else None
                
                if top_topic:
                    return DailyInsight(
                        insight_type="viral_spike",
                        headline=f"{total_trending} videos going viral around '{top_topic}'",
                        detail=f"{analysis.viral_video_count} viral + {analysis.rising_video_count} rising videos detected. Max velocity: {analysis.max_velocity:,.0f} views/hr",
                        action=f"Create content about '{top_topic}' while it's hot - reaction or tutorial format works best",
                        category=cat_key,
                        category_name=cat_name,
                        metric_value=str(total_trending),
                        metric_label="trending videos",
                        confidence=min(90, analysis.confidence + 20),
                        data_source="viral_detector",
                        generated_at=datetime.now(timezone.utc).isoformat(),
                    )

        except Exception as e:
            logger.warning(f"Failed to check viral spike for {cat_key}: {e}")

        return None

    async def _check_keyword_surge(
        self,
        cat_key: str,
        cat_name: str,
    ) -> Optional[DailyInsight]:
        """Check for keyword velocity surges."""
        if not self.title_analyzer:
            return None

        try:
            intel = await self.title_analyzer.analyze_game(cat_key)
            if not intel or not intel.top_keywords:
                return None

            # Find keywords with high velocity that are trending
            for kw in intel.top_keywords[:5]:
                if kw.is_trending and kw.velocity_score > 500 and kw.confidence >= 55:
                    # Check if it's significantly above baseline
                    if kw.effect_size > 0.3:  # 30% better than baseline
                        pct_better = int(kw.effect_size * 100)
                        return DailyInsight(
                            insight_type="keyword_surge",
                            headline=f"'{kw.keyword}' keyword is surging - {pct_better}% above baseline",
                            detail=f"Velocity: {kw.velocity_score:,.0f} views/hr. Found in {kw.sample_size} videos. TF-IDF: {kw.tf_idf_score:.3f}",
                            action=f"Include '{kw.keyword}' in your next {cat_name} title - it's driving clicks right now",
                            category=cat_key,
                            category_name=cat_name,
                            metric_value=f"+{pct_better}%",
                            metric_label="above baseline performance",
                            confidence=kw.confidence,
                            data_source="title_intel",
                            generated_at=datetime.now(timezone.utc).isoformat(),
                        )

        except Exception as e:
            logger.warning(f"Failed to check keyword surge for {cat_key}: {e}")

        return None

    async def _check_competition_window(
        self,
        cat_key: str,
        cat_name: str,
        category: Dict[str, Any],
    ) -> Optional[DailyInsight]:
        """Check for low competition windows."""
        if not self.competition_analyzer:
            return None

        try:
            analysis = await self.competition_analyzer.analyze_category(
                category_key=cat_key,
                twitch_id=category.get("twitch_id"),
                category_name=cat_name,
            )
            if not analysis:
                return None

            # Check for genuinely low competition (high opportunity score)
            if analysis.opportunity_score >= 70 and analysis.confidence >= 40:
                # Calculate viewer-to-streamer ratio
                if analysis.live_stream_count > 0 and analysis.total_viewers > 0:
                    ratio = analysis.total_viewers / analysis.live_stream_count
                    
                    return DailyInsight(
                        insight_type="low_competition",
                        headline=f"Only {analysis.live_stream_count:,} streamers live in {cat_name}",
                        detail=f"{analysis.total_viewers:,} viewers / {analysis.live_stream_count:,} streams = {ratio:,.0f} viewers per stream average",
                        action=f"Go live NOW - competition is {100 - int(analysis.opportunity_score)}% below normal",
                        category=cat_key,
                        category_name=cat_name,
                        metric_value=f"{analysis.live_stream_count:,}",
                        metric_label="active streamers",
                        confidence=analysis.confidence,
                        data_source="competition_analyzer",
                        generated_at=datetime.now(timezone.utc).isoformat(),
                    )

        except Exception as e:
            logger.warning(f"Failed to check competition for {cat_key}: {e}")

        return None


# Singleton
_daily_insight_generator: Optional[DailyInsightGenerator] = None


def get_daily_insight_generator() -> DailyInsightGenerator:
    """Get or create the daily insight generator singleton."""
    global _daily_insight_generator
    if _daily_insight_generator is None:
        _daily_insight_generator = DailyInsightGenerator()
    return _daily_insight_generator
