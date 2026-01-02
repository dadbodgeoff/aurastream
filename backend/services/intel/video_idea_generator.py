"""
Video Idea Generator Service

Generates actionable video concepts by synthesizing:
- Trending topics from viral detector
- Trending keywords/phrases from title intel
- Tag clusters that work together
- Optimal timing and competition data

Unlike title_suggestions (which are just existing viral titles),
this generates ORIGINAL video concepts based on what's trending.

NOTE: Uses DETERMINISTIC selection - no random.choice() or random.uniform().
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Set

logger = logging.getLogger(__name__)


# ============================================================================
# Data Classes
# ============================================================================

@dataclass
class VideoIdea:
    """A synthesized video concept recommendation."""
    concept: str  # The main video idea/concept
    hook: str  # Suggested hook/angle
    why_now: str  # Why this is timely
    format_suggestion: str  # Tutorial, reaction, gameplay, etc.
    trending_elements: List[str]  # Keywords/topics to include
    suggested_tags: List[str]  # Tags to use
    difficulty: str  # easy, medium, hard (based on competition)
    opportunity_score: int  # 0-100 score
    confidence: int  # 0-100 confidence in this recommendation
    source_signals: Dict[str, Any]  # What data drove this recommendation


@dataclass
class VideoIdeasResponse:
    """Response containing multiple video ideas for a game."""
    game_key: str
    game_name: str
    ideas: List[VideoIdea]
    analyzed_at: str
    data_freshness_hours: float
    overall_opportunity: str  # "hot", "warm", "cool"


# ============================================================================
# Video Idea Templates
# ============================================================================

# Format templates for different video types
FORMAT_TEMPLATES = {
    "tutorial": {
        "concepts": [
            "How to master {topic} - Complete guide",
            "{topic} tips that pros don't tell you",
            "The {topic} strategy that's dominating right now",
            "Why {topic} is the meta and how to use it",
        ],
        "hooks": [
            "Stop making this {topic} mistake",
            "The {topic} secret that changed my gameplay",
            "{topic} is broken and here's why",
        ],
    },
    "reaction": {
        "concepts": [
            "Reacting to the {topic} trend everyone's talking about",
            "My honest take on {topic}",
            "Why {topic} is blowing up right now",
        ],
        "hooks": [
            "I can't believe {topic} is actually working",
            "Everyone is wrong about {topic}",
        ],
    },
    "challenge": {
        "concepts": [
            "Can I win using only {topic}?",
            "{topic} challenge - Is it actually possible?",
            "I tried {topic} for 24 hours",
        ],
        "hooks": [
            "This {topic} challenge nearly broke me",
            "Nobody thought {topic} was possible",
        ],
    },
    "news": {
        "concepts": [
            "{topic} just changed everything",
            "Breaking: {topic} update you need to know",
            "The {topic} situation explained",
        ],
        "hooks": [
            "{topic} is here and it's insane",
            "This {topic} news changes the meta",
        ],
    },
    "showcase": {
        "concepts": [
            "The best {topic} plays you'll see today",
            "{topic} highlights that will blow your mind",
            "Why {topic} is the most fun right now",
        ],
        "hooks": [
            "Watch this {topic} moment",
            "{topic} gameplay that went viral",
        ],
    },
}

# Difficulty based on competition level
DIFFICULTY_MAP = {
    "low": "easy",
    "medium": "medium", 
    "high": "hard",
}


# ============================================================================
# Topic Deduplication Helpers
# ============================================================================

def normalize_topic(topic: str) -> str:
    """Normalize a topic for comparison."""
    return topic.lower().strip()


def is_similar_topic(topic1: str, topic2: str, game_name: str = "") -> bool:
    """Check if two topics are too similar to both use."""
    t1 = normalize_topic(topic1)
    t2 = normalize_topic(topic2)
    game_lower = game_name.lower()
    
    # Exact match
    if t1 == t2:
        return True
    
    # One contains the other
    if t1 in t2 or t2 in t1:
        return True
    
    # Both are just the game name or contain only the game name
    if t1 == game_lower or t2 == game_lower:
        return True
    
    # Check word overlap (if >70% words overlap, too similar)
    words1 = set(t1.split())
    words2 = set(t2.split())
    if words1 and words2:
        overlap = len(words1 & words2) / min(len(words1), len(words2))
        if overlap > 0.7:
            return True
    
    return False


def extract_unique_topics(
    trending_topics: List[str],
    trending_phrases: List[Dict],
    trending_keywords: List[Dict],
    tag_clusters: List[Dict],
    game_name: str,
    max_topics: int = 5,
) -> List[Dict[str, Any]]:
    """
    Extract unique, diverse topics from all signal sources.
    Returns list of dicts with 'topic', 'source', and 'metadata'.
    """
    used_topics: Set[str] = set()
    unique_topics: List[Dict[str, Any]] = []
    
    # Helper to add topic if unique
    def try_add_topic(topic: str, source: str, metadata: Dict = None) -> bool:
        if len(unique_topics) >= max_topics:
            return False
        
        normalized = normalize_topic(topic)
        
        # Skip if it's just the game name
        if normalized == game_name.lower():
            return False
        
        # Skip generic/short topics
        if len(normalized) < 4 or normalized in {'the', 'and', 'for', 'with'}:
            return False
        
        # Check against all used topics
        for used in used_topics:
            if is_similar_topic(topic, used, game_name):
                return False
        
        used_topics.add(normalized)
        unique_topics.append({
            'topic': topic,
            'source': source,
            'metadata': metadata or {},
        })
        return True
    
    # Priority 1: Trending phrases (most specific, n-grams)
    for phrase in trending_phrases:
        phrase_text = phrase.get('phrase', '')
        if phrase.get('is_trending') and phrase_text:
            try_add_topic(phrase_text, 'phrase', {
                'velocity': phrase.get('velocity', 0),
                'is_trending': True,
            })
    
    # Priority 2: Trending topics from viral detector
    for topic in trending_topics:
        if topic:
            try_add_topic(topic, 'viral_topic', {})
    
    # Priority 3: High-velocity keywords (not just game name)
    for kw in trending_keywords:
        keyword = kw.get('keyword', '')
        if kw.get('is_trending') and keyword:
            try_add_topic(keyword, 'keyword', {
                'velocity': kw.get('velocity', 0),
                'confidence': kw.get('confidence', 50),
            })
    
    # Priority 4: Tag cluster primaries
    for cluster in tag_clusters:
        primary = cluster.get('primary', '')
        if primary:
            try_add_topic(primary, 'tag_cluster', {
                'related': cluster.get('related', []),
                'avg_views': cluster.get('avg_views', 0),
            })
    
    # Priority 5: Non-trending but high-frequency keywords
    for kw in trending_keywords:
        keyword = kw.get('keyword', '')
        if not kw.get('is_trending') and keyword and kw.get('velocity', 0) > 100:
            try_add_topic(keyword, 'keyword_secondary', {
                'velocity': kw.get('velocity', 0),
            })
    
    return unique_topics


# ============================================================================
# Video Idea Generator
# ============================================================================

class VideoIdeaGenerator:
    """
    Generates original video concepts from trending data.
    
    Combines signals from:
    - ViralDetector: trending_topics, trending_tags, opportunity_score
    - TitleIntelAnalyzer: keywords, phrases, patterns
    - CompetitionAnalyzer: competition level, optimal timing
    """

    def __init__(self):
        self._viral_detector = None
        self._title_analyzer = None
        self._competition_analyzer = None

    @property
    def viral_detector(self):
        """Lazy load viral detector."""
        if self._viral_detector is None:
            try:
                from backend.services.intel.viral_detector import get_viral_detector
                self._viral_detector = get_viral_detector()
            except Exception as e:
                logger.warning(f"Failed to load viral detector: {e}")
        return self._viral_detector

    @property
    def title_analyzer(self):
        """Lazy load title analyzer."""
        if self._title_analyzer is None:
            try:
                from backend.services.title_intel import get_title_intel_analyzer
                self._title_analyzer = get_title_intel_analyzer()
            except Exception as e:
                logger.warning(f"Failed to load title analyzer: {e}")
        return self._title_analyzer

    @property
    def competition_analyzer(self):
        """Lazy load competition analyzer."""
        if self._competition_analyzer is None:
            try:
                from backend.services.intel.competition_analyzer import get_competition_analyzer
                self._competition_analyzer = get_competition_analyzer()
            except Exception as e:
                logger.warning(f"Failed to load competition analyzer: {e}")
        return self._competition_analyzer

    async def generate_ideas(
        self,
        game_key: str,
        max_ideas: int = 5,
    ) -> Optional[VideoIdeasResponse]:
        """
        Generate video ideas for a game category.
        
        Args:
            game_key: The game identifier (e.g., "fortnite")
            max_ideas: Maximum number of ideas to generate
            
        Returns:
            VideoIdeasResponse with synthesized video concepts
        """
        # Gather all signals
        viral_data = await self._get_viral_signals(game_key)
        title_data = await self._get_title_signals(game_key)
        competition_data = await self._get_competition_signals(game_key)

        if not viral_data and not title_data:
            logger.warning(f"No data available for {game_key}")
            return None

        # Extract data from signals
        trending_topics = viral_data.get("trending_topics", []) if viral_data else []
        trending_tags = viral_data.get("trending_tags", []) if viral_data else []
        trending_keywords = title_data.get("keywords", []) if title_data else []
        trending_phrases = title_data.get("phrases", []) if title_data else []
        tag_clusters = title_data.get("tag_clusters", []) if title_data else []
        
        # Get game name
        game_name = viral_data.get("game_name", game_key.replace("_", " ").title()) if viral_data else game_key.replace("_", " ").title()
        
        # Calculate overall opportunity
        opportunity_score = viral_data.get("opportunity_score", 50) if viral_data else 50
        competition_level = competition_data.get("competition_level", "medium") if competition_data else "medium"
        
        overall_opportunity = self._calculate_overall_opportunity(
            opportunity_score, competition_level
        )

        # Extract unique, diverse topics
        unique_topics = extract_unique_topics(
            trending_topics=trending_topics,
            trending_phrases=trending_phrases,
            trending_keywords=trending_keywords,
            tag_clusters=tag_clusters,
            game_name=game_name,
            max_topics=max_ideas,
        )

        # Generate one idea per unique topic
        ideas = []
        format_types = list(FORMAT_TEMPLATES.keys())
        
        for i, topic_data in enumerate(unique_topics):
            topic = topic_data['topic']
            source = topic_data['source']
            metadata = topic_data['metadata']
            
            # Rotate through format types for variety
            format_type = format_types[i % len(format_types)]
            
            idea = self._generate_idea_for_topic(
                topic=topic,
                source=source,
                metadata=metadata,
                format_type=format_type,
                game_name=game_name,
                trending_tags=trending_tags,
                competition_level=competition_level,
                base_opportunity_score=opportunity_score,
            )
            ideas.append(idea)

        # Sort by opportunity score
        ideas.sort(key=lambda x: x.opportunity_score, reverse=True)
        ideas = ideas[:max_ideas]

        # Calculate data freshness
        data_freshness = title_data.get("data_freshness_hours", 24) if title_data else 24

        return VideoIdeasResponse(
            game_key=game_key,
            game_name=game_name,
            ideas=ideas,
            analyzed_at=datetime.now(timezone.utc).isoformat(),
            data_freshness_hours=data_freshness,
            overall_opportunity=overall_opportunity,
        )

    def _generate_idea_for_topic(
        self,
        topic: str,
        source: str,
        metadata: Dict,
        format_type: str,
        game_name: str,
        trending_tags: List[str],
        competition_level: str,
        base_opportunity_score: float,
    ) -> VideoIdea:
        """Generate a single idea for a specific topic."""
        templates = FORMAT_TEMPLATES[format_type]
        
        # Deterministic selection based on topic hash (using proper hash function)
        import hashlib
        topic_hash = int(hashlib.md5(topic.encode()).hexdigest(), 16)
        concept_idx = topic_hash % len(templates["concepts"])
        hook_idx = topic_hash % len(templates["hooks"])
        
        concept = templates["concepts"][concept_idx].format(topic=topic)
        hook = templates["hooks"][hook_idx].format(topic=topic)
        
        # Build why_now based on source
        why_now = self._build_why_now(topic, source, metadata, game_name)
        
        # Build trending elements
        trending_elements = [topic]
        if metadata.get('related'):
            trending_elements.extend(metadata['related'][:2])
        
        # Build suggested tags
        suggested_tags = trending_tags[:5] if trending_tags else [game_name.lower(), topic.lower()]
        
        # Calculate scores based on source and metadata
        score_boost = {
            'phrase': 15,  # Phrases are most specific
            'viral_topic': 10,
            'keyword': 8,
            'tag_cluster': 5,
            'keyword_secondary': 3,
        }.get(source, 5)
        
        if metadata.get('is_trending'):
            score_boost += 10
        
        confidence = {
            'phrase': 80,
            'viral_topic': 75,
            'keyword': 70,
            'tag_cluster': 65,
            'keyword_secondary': 55,
        }.get(source, 60)
        
        return VideoIdea(
            concept=concept,
            hook=hook,
            why_now=why_now,
            format_suggestion=format_type.replace("_", " ").title(),
            trending_elements=trending_elements[:5],
            suggested_tags=suggested_tags,
            difficulty=DIFFICULTY_MAP.get(competition_level, "medium"),
            opportunity_score=int(min(100, base_opportunity_score + score_boost)),
            confidence=confidence,
            source_signals={"type": source, "topic": topic, "metadata": metadata},
        )

    def _build_why_now(
        self,
        topic: str,
        source: str,
        metadata: Dict,
        game_name: str,
    ) -> str:
        """Build a specific why_now explanation based on the data source."""
        if source == 'phrase':
            velocity = metadata.get('velocity', 0)
            if velocity > 1000:
                return f"'{topic}' is appearing in high-velocity videos ({velocity:,} v/hr)"
            return f"The phrase '{topic}' is trending in {game_name} content"
        
        elif source == 'viral_topic':
            return f"'{topic}' is a trending topic detected in viral {game_name} videos"
        
        elif source == 'keyword':
            velocity = metadata.get('velocity', 0)
            if velocity > 500:
                return f"'{topic}' keyword is surging with {velocity:,} velocity/hr"
            return f"'{topic}' is a trending keyword in {game_name}"
        
        elif source == 'tag_cluster':
            avg_views = metadata.get('avg_views', 0)
            if avg_views > 10000:
                return f"Videos tagged with '{topic}' are averaging {avg_views:,} views"
            return f"'{topic}' tag cluster is performing well"
        
        elif source == 'keyword_secondary':
            return f"'{topic}' has consistent performance in {game_name} content"
        
        return f"'{topic}' is relevant to {game_name} right now"

    async def _get_viral_signals(self, game_key: str) -> Optional[Dict]:
        """Get viral signals from ViralDetector."""
        if not self.viral_detector:
            return None
        
        try:
            analysis = await self.viral_detector.analyze_category(game_key)
            return {
                "trending_topics": analysis.trending_topics,
                "trending_tags": analysis.trending_tags,
                "opportunity_score": analysis.opportunity_score,
                "viral_count": analysis.viral_video_count,
                "rising_count": analysis.rising_video_count,
                "confidence": analysis.confidence,
                "game_name": analysis.category_name,
            }
        except Exception as e:
            logger.warning(f"Failed to get viral signals for {game_key}: {e}")
            return None

    async def _get_title_signals(self, game_key: str) -> Optional[Dict]:
        """Get title signals from TitleIntelAnalyzer."""
        if not self.title_analyzer:
            return None
        
        try:
            intel = await self.title_analyzer.analyze_game(game_key)
            if not intel:
                return None
            
            return {
                "keywords": [
                    {
                        "keyword": k.keyword,
                        "velocity": k.velocity_score,
                        "is_trending": k.is_trending,
                        "confidence": k.confidence,
                    }
                    for k in intel.top_keywords[:15]  # Get more for diversity
                ],
                "phrases": [
                    {
                        "phrase": p.phrase,
                        "velocity": p.velocity_score,
                        "is_trending": p.is_trending,
                    }
                    for p in intel.top_phrases[:10]  # Get more for diversity
                ],
                "tag_clusters": [
                    {
                        "primary": c.primary_tag,
                        "related": c.related_tags,
                        "avg_views": c.avg_views,
                    }
                    for c in intel.tag_clusters[:5]
                ],
                "trending_hooks": intel.trending_hooks,
                "trending_power_words": intel.trending_power_words,
                "data_freshness_hours": intel.data_freshness_hours,
                "data_confidence": intel.data_confidence,
            }
        except Exception as e:
            logger.warning(f"Failed to get title signals for {game_key}: {e}")
            return None

    async def _get_competition_signals(self, game_key: str) -> Optional[Dict]:
        """Get competition signals from CompetitionAnalyzer."""
        if not self.competition_analyzer:
            return None
        
        try:
            analysis = await self.competition_analyzer.analyze_category(
                category_key=game_key,
                twitch_id=None,
                category_name=game_key.replace("_", " ").title(),
            )
            
            # Determine competition level from opportunity score
            if analysis.opportunity_score >= 70:
                level = "low"
            elif analysis.opportunity_score >= 40:
                level = "medium"
            else:
                level = "high"
            
            return {
                "competition_level": level,
                "opportunity_score": analysis.opportunity_score,
                "live_streams": analysis.live_stream_count,
                "confidence": analysis.confidence,
            }
        except Exception as e:
            logger.warning(f"Failed to get competition signals for {game_key}: {e}")
            return None

    def _calculate_overall_opportunity(
        self,
        opportunity_score: float,
        competition_level: str,
    ) -> str:
        """Calculate overall opportunity level."""
        # Combine opportunity score with competition
        competition_boost = {"low": 15, "medium": 0, "high": -15}
        adjusted = opportunity_score + competition_boost.get(competition_level, 0)
        
        if adjusted >= 65:
            return "hot"
        elif adjusted >= 40:
            return "warm"
        else:
            return "cool"


# ============================================================================
# Singleton Instance
# ============================================================================

_video_idea_generator: Optional[VideoIdeaGenerator] = None


def get_video_idea_generator() -> VideoIdeaGenerator:
    """Get or create the video idea generator singleton."""
    global _video_idea_generator
    if _video_idea_generator is None:
        _video_idea_generator = VideoIdeaGenerator()
    return _video_idea_generator
