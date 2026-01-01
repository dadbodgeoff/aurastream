"""
Mission Generator Service

Generates personalized "Today's Mission" recommendations based on:
- Competition levels across subscribed categories (via CompetitionAnalyzer)
- Viral opportunities (trending clips, videos)
- Optimal timing windows
- User's historical engagement
- Content freshness

The mission is cached for 5 minutes per user.

NOTE: This module uses DETERMINISTIC scoring only.
No random.uniform() or random.choice() - all fallbacks use fixed values.
"""

import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

from backend.database.supabase_client import get_supabase_client


logger = logging.getLogger(__name__)


# =============================================================================
# Constants
# =============================================================================

MISSION_CACHE_TTL = 300  # 5 minutes in seconds

# Scoring weights for mission generation
WEIGHTS = {
    "competition": 0.25,      # Low competition = higher score
    "viral_opportunity": 0.20, # Trending content = higher score
    "timing": 0.20,           # Golden hour = higher score
    "history_match": 0.15,    # Matches user preferences = higher score
    "freshness": 0.20,        # New/trending topics = higher score
}

# Title templates for different scenarios
TITLE_TEMPLATES = {
    "low_competition": [
        "🔥 {game} is WIDE OPEN right now - {angle}",
        "Why {game} is YOUR moment today",
        "{game} Stream - Low Competition, High Opportunity",
        "The {game} opportunity nobody is talking about",
    ],
    "viral_trend": [
        "🚀 {trend} is BLOWING UP - Here's my take",
        "Reacting to {trend} - This is INSANE",
        "{game}: {trend} explained",
        "Why everyone is talking about {trend}",
    ],
    "golden_hour": [
        "LIVE: {game} at the PERFECT time",
        "{game} Stream - Catching the wave",
        "Prime time {game} - Let's GO",
    ],
    "niche_opportunity": [
        "Trying {niche} for the first time",
        "{niche} deep dive - Underrated content",
        "Why {niche} is the next big thing",
    ],
}


# =============================================================================
# Mission Generator
# =============================================================================

class MissionGenerator:
    """Generates personalized mission recommendations using real data.
    
    Integrates with:
    - CompetitionAnalyzer: Real Twitch stream/viewer data
    - ViralDetector: YouTube velocity and trending analysis
    - ScoringEngine: Statistical normalization and confidence
    - ActivityTracker: User engagement history
    """

    def __init__(self):
        self.supabase = get_supabase_client()
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._competition_analyzer = None
        self._viral_detector = None
        self._scoring_engine = None

    @property
    def competition_analyzer(self):
        """Lazy load competition analyzer."""
        if self._competition_analyzer is None:
            try:
                from backend.services.intel.competition_analyzer import (
                    get_competition_analyzer,
                )
                self._competition_analyzer = get_competition_analyzer()
            except Exception as e:
                logger.warning(f"Failed to initialize competition analyzer: {e}")
        return self._competition_analyzer

    @property
    def viral_detector(self):
        """Lazy load viral detector."""
        if self._viral_detector is None:
            try:
                from backend.services.intel.viral_detector import get_viral_detector
                self._viral_detector = get_viral_detector()
            except Exception as e:
                logger.warning(f"Failed to initialize viral detector: {e}")
        return self._viral_detector

    @property
    def scoring_engine(self):
        """Lazy load scoring engine."""
        if self._scoring_engine is None:
            try:
                from backend.services.intel.scoring_engine import get_scoring_engine
                self._scoring_engine = get_scoring_engine()
            except Exception as e:
                logger.warning(f"Failed to initialize scoring engine: {e}")
        return self._scoring_engine

    async def generate_mission(
        self,
        user_id: str,
        subscribed_categories: List[Dict[str, Any]],
        timezone: str = "America/New_York",
    ) -> Optional[Dict[str, Any]]:
        """Generate a personalized mission for the user.

        Args:
            user_id: The user's ID
            subscribed_categories: List of user's subscribed categories
            timezone: User's timezone

        Returns:
            Mission dict or None if no mission can be generated
        """
        # Check cache first
        cache_key = self._get_cache_key(user_id, subscribed_categories)
        cached = self._get_cached_mission(cache_key)
        if cached:
            return cached

        if not subscribed_categories:
            return None

        # Gather data for scoring
        scores = await self._calculate_category_scores(
            subscribed_categories,
            user_id,
            timezone,
        )

        if not scores:
            return None

        # Select best category
        best_category = max(scores, key=lambda x: x["total_score"])

        # Generate mission
        mission = self._build_mission(best_category, timezone)

        # Cache the mission
        self._cache_mission(cache_key, mission)

        return mission

    async def _calculate_category_scores(
        self,
        categories: List[Dict[str, Any]],
        user_id: str,
        timezone: str,
    ) -> List[Dict[str, Any]]:
        """Calculate opportunity scores for each category."""
        scores = []

        for category in categories:
            score_data = {
                "category_key": category.get("key"),
                "category_name": category.get("name"),
                "twitch_id": category.get("twitch_id"),
                "youtube_query": category.get("youtube_query"),
                "factors": {},
                "total_score": 0,
            }

            # Calculate individual factor scores
            competition_score = await self._score_competition(category)
            viral_score = await self._score_viral_opportunity(category)
            timing_score = self._score_timing(timezone)
            history_score = await self._score_history_match(user_id, category)
            freshness_score = await self._score_freshness(category)

            score_data["factors"] = {
                "competition": competition_score,
                "viral_opportunity": viral_score,
                "timing": timing_score,
                "history_match": history_score,
                "freshness": freshness_score,
            }
            
            # Store trending data from viral analysis for title generation
            score_data["_trending_topics"] = category.get("_trending_topics", [])
            score_data["_trending_tags"] = category.get("_trending_tags", [])

            # Calculate weighted total
            total = (
                competition_score * WEIGHTS["competition"] +
                viral_score * WEIGHTS["viral_opportunity"] +
                timing_score * WEIGHTS["timing"] +
                history_score * WEIGHTS["history_match"] +
                freshness_score * WEIGHTS["freshness"]
            )

            score_data["total_score"] = round(total, 2)
            scores.append(score_data)

        return scores

    async def _score_competition(self, category: Dict[str, Any]) -> float:
        """Score based on competition level using real Twitch data.

        Lower competition = higher score.
        Uses CompetitionAnalyzer for real-time competition metrics.
        Falls back to baseline estimates if analyzer unavailable.
        """
        if self.competition_analyzer:
            try:
                # Use real competition analysis
                analysis = await self.competition_analyzer.analyze_category(
                    category_key=category.get("key", ""),
                    twitch_id=category.get("twitch_id"),
                    category_name=category.get("name"),
                )

                # Use the opportunity score directly
                # (already 0-100, higher = less competition)
                score = analysis.opportunity_score

                logger.debug(
                    f"Competition score for {category.get('key')}: {score:.1f} "
                    f"(streams: {analysis.live_stream_count}, "
                    f"confidence: {analysis.confidence}%, "
                    f"source: {analysis.data_source})"
                )

                return score

            except Exception as e:
                cat_key = category.get('key')
                logger.warning(f"Competition analysis failed for {cat_key}: {e}")
                # Fall through to baseline scoring

        # Fallback: Use baseline estimates with deterministic variance
        # Based on category size (larger = more competition)
        base_scores = {
            "fortnite": 40,      # High competition
            "valorant": 45,
            "minecraft": 50,
            "apex_legends": 55,
            "league_of_legends": 45,
            "just_chatting": 35,
            "warzone": 50,
            "gta": 55,
            "roblox": 60,
        }

        key = category.get("key", "").lower()
        base = base_scores.get(key, 55)  # Default to moderate competition

        # Deterministic time-based variance using hour of day
        # This provides some variation without randomness
        hour = datetime.utcnow().hour
        time_variance = ((hour % 12) - 6) * 1.5  # -9 to +7.5 based on hour
        
        return max(0, min(100, base + time_variance))

    async def _score_viral_opportunity(self, category: Dict[str, Any]) -> float:
        """Score based on viral content in the category using real YouTube data.
        
        Uses ViralDetector to analyze:
        - Number of viral videos (velocity > p90)
        - Number of rising videos (velocity > p75)
        - Average velocity vs category baseline
        
        Higher viral activity = higher score (good time to make related content).
        """
        category_key = category.get("key", "")
        
        if self.viral_detector:
            try:
                analysis = await self.viral_detector.analyze_category(category_key)
                
                # Use the opportunity score directly (0-100)
                score = analysis.opportunity_score
                
                logger.debug(
                    f"Viral score for {category_key}: {score:.1f} "
                    f"(viral: {analysis.viral_video_count}, "
                    f"rising: {analysis.rising_video_count}, "
                    f"confidence: {analysis.confidence}%)"
                )
                
                # Store trending data for title generation
                category["_trending_topics"] = analysis.trending_topics
                category["_trending_tags"] = analysis.trending_tags
                
                return score
                
            except Exception as e:
                logger.warning(f"Viral analysis failed for {category_key}: {e}")
        
        # Fallback: deterministic moderate score
        # Use category key hash for consistent per-category variance
        key = category.get("key", "unknown")
        hash_val = sum(ord(c) for c in key) % 30  # 0-29 based on key
        return 45 + hash_val  # 45-74 range, deterministic per category

    def _score_timing(self, timezone: str) -> float:
        """Score based on current time vs golden hours.
        
        Uses timezone-aware peak hour detection:
        - Peak hours (2-5 PM, 7-11 PM local): Higher viewer availability
        - Off-peak: Lower competition but fewer viewers
        
        Returns deterministic score based on time (no random variance).
        """
        now = datetime.utcnow()
        hour_utc = now.hour
        
        # Timezone offset mapping
        tz_offsets = {
            "America/New_York": -5,
            "America/Chicago": -6,
            "America/Denver": -7,
            "America/Los_Angeles": -8,
            "Europe/London": 0,
            "Europe/Paris": 1,
            "Europe/Berlin": 1,
            "Asia/Tokyo": 9,
            "Australia/Sydney": 11,
        }
        
        offset = tz_offsets.get(timezone, -5)  # Default to EST
        local_hour = (hour_utc + offset) % 24
        
        # Score based on local time
        # Prime time evening (7-11 PM): Best for viewership
        if 19 <= local_hour <= 23:
            return 85.0
        # Afternoon peak (2-6 PM): Good viewership
        elif 14 <= local_hour <= 18:
            return 75.0
        # Late morning/early afternoon (10 AM - 2 PM): Moderate
        elif 10 <= local_hour <= 13:
            return 55.0
        # Early morning (6-10 AM): Lower viewership
        elif 6 <= local_hour <= 9:
            return 40.0
        # Late night/early morning (12-6 AM): Lowest viewership
        else:
            return 30.0

    async def _score_history_match(
        self,
        user_id: str,
        category: Dict[str, Any],
    ) -> float:
        """Score based on user's historical engagement with category.
        
        Queries user_intel_activity table for:
        - Category engagement counts
        - Panel interaction history
        - Past mission actions
        
        More past engagement = higher score (user likes this category).
        """
        category_key = category.get("key", "")
        
        try:
            # Query user activity from database
            result = self.supabase.table("user_intel_activity").select(
                "category_engagement, panel_engagement"
            ).eq("user_id", user_id).single().execute()
            
            if result.data:
                category_engagement = result.data.get("category_engagement", {})
                
                if category_engagement and category_key in category_engagement:
                    # Get engagement count for this category
                    engagement_count = category_engagement.get(category_key, 0)
                    
                    # Calculate total engagement across all categories
                    total_engagement = sum(category_engagement.values())
                    
                    if total_engagement > 0:
                        # Score based on relative engagement
                        # If this category is 50% of their engagement, score = 75
                        relative_engagement = engagement_count / total_engagement
                        score = 50 + (relative_engagement * 50)
                        
                        logger.debug(
                            f"History score for {category_key}: {score:.1f} "
                            f"(engagement: {engagement_count}/{total_engagement})"
                        )
                        
                        return min(100, score)
                        
        except Exception as e:
            logger.debug(f"Could not fetch user activity for {user_id}: {e}")
        
        # Fallback: moderate score (no history = neutral)
        return 50.0

    async def _score_freshness(self, category: Dict[str, Any]) -> float:
        """Score based on content freshness using real YouTube data.
        
        Uses ScoringEngine to analyze:
        - Average age of top-performing videos
        - Recency of viral content
        - Freshness decay of cached data
        
        More recent viral content = higher freshness score.
        """
        category_key = category.get("key", "")
        
        if self.scoring_engine:
            try:
                # Build category stats to get freshness metrics
                stats = await self.scoring_engine.build_category_stats(category_key)
                
                if stats and stats.sample_count > 0:
                    # Calculate freshness based on data age and velocity distribution
                    # Higher velocity_p90 relative to mean suggests fresh viral content
                    if stats.velocity_mean > 0:
                        freshness_ratio = stats.velocity_p90 / stats.velocity_mean
                        # Ratio > 2 means top content is significantly outperforming
                        # This suggests fresh, trending content
                        score = min(100, 40 + (freshness_ratio - 1) * 30)
                        
                        logger.debug(
                            f"Freshness score for {category_key}: {score:.1f} "
                            f"(velocity_p90/mean ratio: {freshness_ratio:.2f})"
                        )
                        
                        return max(20, score)
                
            except Exception as e:
                logger.warning(f"Freshness analysis failed for {category_key}: {e}")
        
        # Fallback: deterministic moderate freshness
        # Use category key hash for consistent variance
        key = category.get("key", "unknown")
        hash_val = sum(ord(c) for c in key) % 25  # 0-24 based on key
        return 50 + hash_val  # 50-74 range, deterministic per category

    def _build_mission(
        self,
        score_data: Dict[str, Any],
        timezone: str,
    ) -> Dict[str, Any]:
        """Build the mission response from score data."""
        factors = score_data["factors"]
        category_name = score_data["category_name"]
        category_key = score_data["category_key"]
        
        # Get trending topics if available (stored during viral scoring)
        trending_topics = score_data.get("_trending_topics", [])
        trending_tags = score_data.get("_trending_tags", [])

        # Determine primary reason for recommendation
        primary_factor = max(factors, key=factors.get)

        # Generate recommendation text
        recommendation = self._generate_recommendation(
            category_name,
            primary_factor,
            factors,
        )

        # Generate suggested title (with trending topics)
        suggested_title = self._generate_title(
            category_name,
            primary_factor,
            factors,
            trending_topics=trending_topics,
        )

        # Generate reasoning
        reasoning = self._generate_reasoning(
            category_name,
            primary_factor,
            factors,
        )

        # Calculate confidence (based on data quality and score spread)
        confidence = self._calculate_confidence(factors, score_data["total_score"])

        # Build response
        expires_at = datetime.utcnow() + timedelta(seconds=MISSION_CACHE_TTL)

        return {
            "recommendation": recommendation,
            "confidence": confidence,
            "category": category_key,
            "category_name": category_name,
            "suggested_title": suggested_title,
            "reasoning": reasoning,
            "factors": {
                "competition": self._factor_to_level(factors["competition"]),
                "viral_opportunity": factors["viral_opportunity"] > 60,
                "timing": factors["timing"] > 60,
                "history_match": factors["history_match"] > 60,
            },
            "trending_topics": trending_topics[:3] if trending_topics else [],
            "trending_tags": trending_tags[:5] if trending_tags else [],
            "expires_at": expires_at.isoformat() + "Z",
        }

    def _generate_recommendation(
        self,
        category_name: str,
        primary_factor: str,
        factors: Dict[str, float],
    ) -> str:
        """Generate the main recommendation text."""
        templates = {
            "competition": f"Stream {category_name} now - competition is low!",
            "viral_opportunity": f"Jump on {category_name} - viral content trending!",
            "timing": f"Perfect timing for {category_name} - viewers are online!",
            "history_match": f"Your audience loves {category_name} - give them more!",
            "freshness": f"{category_name} has fresh content - be first to cover it!",
        }

        return templates.get(primary_factor, f"Stream {category_name} today!")

    def _generate_title(
        self,
        category_name: str,
        primary_factor: str,
        factors: Dict[str, float],
        trending_topics: Optional[List[str]] = None,
    ) -> str:
        """Generate a suggested stream/video title.
        
        Uses trending topics from viral analysis when available.
        Selection is deterministic based on category name hash.
        """
        # Use trending topic if available
        trend_text = "the latest update"
        if trending_topics and len(trending_topics) > 0:
            trend_text = trending_topics[0]
        
        # Deterministic template selection based on category name
        name_hash = sum(ord(c) for c in category_name)
        
        if primary_factor == "competition":
            templates = TITLE_TEMPLATES["low_competition"]
            template = templates[name_hash % len(templates)]
            return template.format(game=category_name, angle="Let's dominate")

        elif primary_factor == "viral_opportunity":
            templates = TITLE_TEMPLATES["viral_trend"]
            template = templates[name_hash % len(templates)]
            return template.format(game=category_name, trend=trend_text)

        elif primary_factor == "timing":
            templates = TITLE_TEMPLATES["golden_hour"]
            template = templates[name_hash % len(templates)]
            return template.format(game=category_name)

        else:
            return f"{category_name} Stream - Let's GO!"

    def _generate_reasoning(
        self,
        category_name: str,
        primary_factor: str,
        factors: Dict[str, float],
    ) -> str:
        """Generate explanation for the recommendation."""
        reasons = []

        if factors["competition"] > 60:
            reasons.append("competition is lower than usual")
        if factors["viral_opportunity"] > 60:
            reasons.append("viral content is trending")
        if factors["timing"] > 60:
            reasons.append("it's a peak viewing time")
        if factors["freshness"] > 60:
            reasons.append("there's fresh content to cover")

        if not reasons:
            reasons = ["it matches your content style"]

        reason_text = ", ".join(reasons[:-1])
        if len(reasons) > 1:
            reason_text += f" and {reasons[-1]}"
        else:
            reason_text = reasons[0]

        return f"We recommend {category_name} because {reason_text}."

    def _calculate_confidence(
        self,
        factors: Dict[str, float],
        total_score: float,
    ) -> int:
        """Calculate confidence score (0-100)."""
        # Base confidence on total score
        base = total_score * 0.8

        # Boost if multiple factors are strong
        strong_factors = sum(1 for v in factors.values() if v > 60)
        boost = strong_factors * 5

        confidence = min(100, max(0, base + boost))
        return round(confidence)

    def _factor_to_level(self, score: float) -> str:
        """Convert numeric score to level string."""
        if score >= 70:
            return "low"  # Low competition is good
        elif score >= 40:
            return "medium"
        else:
            return "high"

    def _get_cache_key(
        self,
        user_id: str,
        categories: List[Dict[str, Any]],
    ) -> str:
        """Generate cache key for mission."""
        cat_keys = sorted([c.get("key", "") for c in categories])
        data = f"{user_id}:{','.join(cat_keys)}"
        return hashlib.md5(data.encode()).hexdigest()

    def _get_cached_mission(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached mission if still valid."""
        cached = self._cache.get(cache_key)
        if not cached:
            return None

        expires_at = datetime.fromisoformat(cached["expires_at"].replace("Z", ""))
        if datetime.utcnow() > expires_at:
            del self._cache[cache_key]
            return None

        return cached

    def _cache_mission(self, cache_key: str, mission: Dict[str, Any]) -> None:
        """Cache the mission."""
        self._cache[cache_key] = mission

        # Clean old entries (simple cleanup)
        if len(self._cache) > 1000:
            # Remove oldest entries
            now = datetime.utcnow()
            to_remove = []
            for key, value in self._cache.items():
                expires = datetime.fromisoformat(value["expires_at"].replace("Z", ""))
                if now > expires:
                    to_remove.append(key)
            for key in to_remove:
                del self._cache[key]


# =============================================================================
# Singleton Instance
# =============================================================================

_mission_generator: Optional[MissionGenerator] = None


def get_mission_generator() -> MissionGenerator:
    """Get or create the mission generator singleton."""
    global _mission_generator
    if _mission_generator is None:
        _mission_generator = MissionGenerator()
    return _mission_generator
