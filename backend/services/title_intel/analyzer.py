"""
Title Intelligence Analyzer v3

Enterprise-grade algorithmic analysis of top-performing YouTube videos
to extract actionable title, keyword, and tag recommendations.

Key Features:
- Velocity scoring (views per hour since publish)
- TF-IDF weighted keyword extraction
- N-gram phrase detection (2-3 word phrases)
- Hook extraction (first 5-7 words that drive clicks)
- Title structure templates (reusable patterns)
- Statistical significance testing for patterns
- Engagement-weighted keywords with confidence scores
- Tag clusters (related tags that work together)
- Freshness indicators (what's working TODAY)

Data source: Cached YouTube videos from youtube_worker.py
Refresh: Same schedule as YouTube worker (daily for game-specific)
"""

import logging
import re
import json
import math
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple, Set
from datetime import datetime, timedelta

import redis.asyncio as redis
import os

logger = logging.getLogger(__name__)

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
YOUTUBE_GAMES_KEY = "youtube:games:{game}"
TITLE_INTEL_CACHE_KEY = "intel:title:{game}"
TITLE_INTEL_CACHE_TTL = 72 * 60 * 60  # 72 hours (3 days) - stale data better than no data

# Stop words for keyword extraction
STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "it", "this", "that", "was", "are",
    "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "must", "shall",
    "i", "me", "my", "we", "our", "you", "your", "he", "she", "they",
    "his", "her", "its", "their", "what", "which", "who", "whom", "how",
    "when", "where", "why", "all", "each", "every", "both", "few", "more",
    "most", "other", "some", "such", "no", "not", "only", "same", "so",
    "than", "too", "very", "just", "can", "now", "new", "one", "two",
    "im", "ive", "dont", "cant", "wont", "didnt", "isnt", "arent",
    "video", "gameplay", "game", "gaming", "stream", "live", "part",
    "episode", "ep", "vs", "full", "watch", "playing",
}

# Power words that drive clicks
POWER_WORDS = {
    "urgency": ["now", "today", "finally", "just", "breaking", "live", "new"],
    "curiosity": ["secret", "hidden", "revealed", "truth", "actually", "really", "why"],
    "emotion": ["insane", "crazy", "incredible", "amazing", "epic", "best", "worst", "broken", "op", "overpowered"],
    "exclusivity": ["only", "first", "exclusive", "rare", "limited", "never"],
    "challenge": ["challenge", "impossible", "hardest", "can", "tried", "attempt", "beat"],
    "numbers": ["top", "best", "worst", "tips", "ways", "things", "reasons"],
    "social_proof": ["everyone", "viral", "trending", "popular", "famous"],
}


def _is_english_text(text: str) -> bool:
    """Check if text is primarily English."""
    if not text:
        return False
    
    total_chars = len(text.replace(" ", ""))
    if total_chars == 0:
        return False
    
    non_ascii = sum(1 for c in text if not c.isascii())
    if non_ascii / total_chars > 0.2:
        return False
    
    text_lower = text.lower()
    non_english_patterns = [
        " la ", " el ", " los ", " las ", " un ", " una ", " del ", " de la ",
        " que ", " con ", " por ", " para ", " como ", " más ", " muy ",
        "última", "último", " o ", " os ", " as ", " um ", " do ", " da ",
        " muito ", "quem ", "entendeu", " le ", " les ", " du ", " avec ",
        " pour ", " très ", " der ", " die ", " das ", " ein ", " eine ",
        " und ", " mit ", " für ", " wie ", " ist ", " sind ",
    ]
    
    for pattern in non_english_patterns:
        if pattern in text_lower:
            return False
    
    return True


def _filter_english_videos(videos: List[Dict]) -> List[Dict]:
    """Filter videos to only include English content."""
    return [v for v in videos if _is_english_text(v.get("title", ""))]


def _calculate_velocity(video: Dict) -> float:
    """
    Calculate velocity score: views per hour since publish.
    Higher = currently viral, not just old popular video.
    """
    views = video.get("view_count", 0)
    published_at = video.get("published_at")
    
    if not published_at or not views:
        return 0.0
    
    try:
        if isinstance(published_at, str):
            pub_date = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
        else:
            pub_date = published_at
        
        hours_since = max(1, (datetime.now(pub_date.tzinfo) - pub_date).total_seconds() / 3600)
        return views / hours_since
    except:
        return float(views)


def _extract_hook(title: str) -> str:
    """
    Extract the hook (first 5-7 words) from a title.
    The hook is what makes people click.
    """
    words = title.split()[:7]
    hook = " ".join(words)
    
    # Clean up trailing punctuation that breaks the hook
    hook = re.sub(r'[|:\-–—]$', '', hook).strip()
    
    return hook


def _analyze_title_structure(title: str) -> Dict[str, Any]:
    """
    Analyze the structure of a title to create reusable templates.
    """
    structure = {
        "has_emoji": bool(re.search(r'[\U0001F300-\U0001F9FF]', title)),
        "has_caps": bool(re.search(r'[A-Z]{3,}', title)),
        "has_number": bool(re.search(r'\d+', title)),
        "has_question": title.strip().endswith('?'),
        "has_ellipsis": '...' in title or '…' in title,
        "has_brackets": bool(re.search(r'[\[\(\{]', title)),
        "has_hashtag": '#' in title,
        "has_pipe": '|' in title,
        "word_count": len(title.split()),
        "char_count": len(title),
    }
    
    # Detect title type
    title_lower = title.lower()
    if structure["has_question"]:
        structure["type"] = "question"
    elif re.match(r'^\d+\s', title):
        structure["type"] = "listicle"
    elif re.match(r'^(how|why|what|when|where)\s', title_lower):
        structure["type"] = "how_to"
    elif re.match(r'^(i |my |we )', title_lower):
        structure["type"] = "personal"
    elif structure["has_caps"]:
        structure["type"] = "hype"
    elif structure["has_ellipsis"]:
        structure["type"] = "cliffhanger"
    else:
        structure["type"] = "standard"
    
    return structure


def _detect_power_words(title: str) -> List[str]:
    """Detect power words that drive engagement."""
    title_lower = title.lower()
    found = []
    
    for category, words in POWER_WORDS.items():
        for word in words:
            if re.search(rf'\b{word}\b', title_lower):
                found.append(word)
    
    return found


def _calculate_tf(word: str, document: str) -> float:
    """Calculate term frequency (TF) for a word in a document."""
    words = re.findall(r'\b[a-zA-Z]{3,}\b', document.lower())
    if not words:
        return 0.0
    word_count = sum(1 for w in words if w == word.lower())
    return word_count / len(words)


def _calculate_idf(word: str, documents: List[str]) -> float:
    """Calculate inverse document frequency (IDF) for a word across documents."""
    if not documents:
        return 0.0
    
    word_lower = word.lower()
    docs_containing = sum(1 for doc in documents if word_lower in doc.lower())
    
    if docs_containing == 0:
        return 0.0
    
    # IDF with smoothing to avoid division by zero
    return math.log((len(documents) + 1) / (docs_containing + 1)) + 1


def _extract_ngrams(text: str, n: int = 2) -> List[str]:
    """Extract n-grams (multi-word phrases) from text."""
    words = re.findall(r'\b[a-zA-Z]{2,}\b', text.lower())
    
    # Filter out stop words from the start/end of ngrams
    ngrams = []
    for i in range(len(words) - n + 1):
        gram = words[i:i+n]
        # Skip if starts or ends with stop word
        if gram[0] in STOP_WORDS or gram[-1] in STOP_WORDS:
            continue
        ngrams.append(" ".join(gram))
    
    return ngrams


def _calculate_statistical_significance(
    pattern_views: List[int],
    baseline_views: List[int],
) -> Tuple[float, bool]:
    """
    Calculate if a pattern's performance is statistically significant.
    
    Uses a simplified t-test approximation.
    Returns (effect_size, is_significant).
    """
    if not pattern_views or not baseline_views:
        return 0.0, False
    
    pattern_mean = sum(pattern_views) / len(pattern_views)
    baseline_mean = sum(baseline_views) / len(baseline_views)
    
    if baseline_mean == 0:
        return 0.0, False
    
    # Effect size (Cohen's d approximation)
    effect_size = (pattern_mean - baseline_mean) / baseline_mean
    
    # Significance threshold: at least 20% better with 3+ samples
    is_significant = effect_size > 0.2 and len(pattern_views) >= 3
    
    return round(effect_size, 3), is_significant


# ============================================================================
# Data Classes
# ============================================================================

@dataclass
class TitleSuggestion:
    """A concrete title suggestion with analysis."""
    title: str
    hook: str
    views: int
    velocity: float  # views per hour
    engagement_rate: float
    power_words: List[str]
    structure_type: str
    why_it_works: str
    template: str  # Reusable template version


@dataclass
class KeywordIntel:
    """Intelligence about a keyword with enterprise-grade metrics."""
    keyword: str
    frequency: int
    avg_views: int
    avg_engagement: float
    velocity_score: float  # How fast videos with this keyword are growing
    power_category: Optional[str]  # If it's a power word, which category
    top_video_title: str
    is_trending: bool  # Appears in recent high-velocity videos
    
    # Enterprise metrics
    tf_idf_score: float = 0.0  # Term frequency-inverse document frequency
    confidence: int = 50  # 0-100 confidence in this recommendation
    effect_size: float = 0.0  # How much better than baseline
    sample_size: int = 0  # Number of videos with this keyword


@dataclass
class PhraseIntel:
    """Intelligence about a multi-word phrase (n-gram)."""
    phrase: str
    frequency: int
    avg_views: int
    velocity_score: float
    top_video_title: str
    is_trending: bool
    confidence: int = 50


@dataclass 
class TagCluster:
    """A cluster of related tags that work together."""
    primary_tag: str
    related_tags: List[str]
    avg_views: int
    video_count: int
    example_title: str


@dataclass
class TitlePattern:
    """A detected title pattern with examples."""
    pattern_name: str
    description: str
    frequency: int
    avg_views: int
    avg_engagement: float
    examples: List[str]


@dataclass
class TagIntel:
    """Intelligence about a tag."""
    tag: str
    frequency: int
    avg_views: int
    videos_using: int
    top_video_title: str


@dataclass
class GameTitleIntel:
    """Complete title intelligence for a game with enterprise metrics."""
    game_key: str
    game_name: str
    analyzed_at: str
    video_count: int
    
    # Title suggestions (the main value)
    title_suggestions: List[TitleSuggestion]
    
    # Title patterns
    top_patterns: List[TitlePattern]
    
    # Keywords with velocity scoring
    top_keywords: List[KeywordIntel]
    
    # Multi-word phrases (n-grams)
    top_phrases: List[PhraseIntel] = field(default_factory=list)
    
    # Tag clusters
    tag_clusters: List[TagCluster] = field(default_factory=list)
    
    # Individual tags (for backwards compat)
    top_tags: List[TagIntel] = field(default_factory=list)
    
    # Title formulas (legacy format)
    title_formulas: List[Dict[str, str]] = field(default_factory=list)
    
    # Stats
    avg_title_length: int = 0
    avg_word_count: int = 0
    avg_views: int = 0
    
    # What's hot right now
    trending_hooks: List[str] = field(default_factory=list)
    trending_power_words: List[str] = field(default_factory=list)
    
    # Enterprise metrics
    data_confidence: int = 50  # Overall confidence in this analysis
    data_freshness_hours: float = 0.0  # How old the underlying data is


class TitleIntelAnalyzer:
    """
    Advanced title intelligence analyzer.
    
    Extracts actionable insights from top-performing videos:
    - Velocity-scored recommendations (what's viral NOW)
    - Hook extraction (the click-driving first words)
    - Reusable templates
    - Power word analysis
    - Tag clusters
    """
    
    def __init__(self):
        self._redis: Optional[redis.Redis] = None
    
    async def _get_redis(self) -> redis.Redis:
        if self._redis is None:
            self._redis = redis.from_url(REDIS_URL, decode_responses=True)
        return self._redis
    
    async def close(self):
        if self._redis:
            await self._redis.aclose()
            self._redis = None
    
    async def analyze_game(self, game_key: str) -> Optional[GameTitleIntel]:
        """Analyze title patterns for a specific game with enterprise-grade metrics."""
        redis_client = await self._get_redis()
        
        # Check analysis cache first
        analysis_cache_key = TITLE_INTEL_CACHE_KEY.format(game=game_key)
        cached_analysis = await redis_client.get(analysis_cache_key)
        if cached_analysis:
            try:
                # Return cached analysis if fresh
                cached_data = json.loads(cached_analysis)
                logger.debug(f"Returning cached title intel for {game_key}")
                return self._deserialize_intel(cached_data)
            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"Failed to deserialize cached analysis: {e}")
        
        cache_key = YOUTUBE_GAMES_KEY.format(game=game_key)
        cached = await redis_client.get(cache_key)
        
        if not cached:
            logger.warning(f"No cached videos for game: {game_key}")
            return None
        
        data = json.loads(cached)
        videos = data.get("videos", [])
        game_name = data.get("game_display_name", game_key.replace("_", " ").title())
        fetched_at = data.get("fetched_at")
        
        if not videos:
            return None
        
        # Calculate data freshness
        data_freshness_hours = self._calculate_data_freshness(fetched_at)
        data_confidence = self._calculate_data_confidence(len(videos), data_freshness_hours)
        
        # Filter to English only
        videos = _filter_english_videos(videos)
        if not videos:
            logger.warning(f"No English videos found for game: {game_key}")
            return None
        
        logger.info(f"Analyzing {len(videos)} English videos for {game_name} (confidence: {data_confidence}%)")
        
        # Calculate velocity for all videos
        for video in videos:
            video["_velocity"] = _calculate_velocity(video)
        
        # Sort by velocity (what's hot NOW)
        videos_by_velocity = sorted(videos, key=lambda v: v["_velocity"], reverse=True)
        
        # Extract all titles for TF-IDF calculation
        all_titles = [v.get("title", "") for v in videos]
        
        # Extract all intelligence
        title_suggestions = self._generate_title_suggestions(videos_by_velocity, game_name)
        patterns = self._analyze_patterns(videos)
        keywords = self._extract_keywords_advanced(videos_by_velocity, all_titles)
        phrases = self._extract_phrases(videos_by_velocity)
        tag_clusters = self._extract_tag_clusters(videos)
        tags = self._extract_tags(videos)
        formulas = self._generate_formulas_legacy(title_suggestions, game_name)
        
        # Extract trending elements
        trending_hooks = self._extract_trending_hooks(videos_by_velocity[:5])
        trending_power_words = self._extract_trending_power_words(videos_by_velocity[:10])
        
        # Calculate stats
        titles = [v.get("title", "") for v in videos]
        avg_title_length = sum(len(t) for t in titles) // len(titles) if titles else 0
        avg_word_count = sum(len(t.split()) for t in titles) // len(titles) if titles else 0
        avg_views = sum(v.get("view_count", 0) for v in videos) // len(videos) if videos else 0
        
        intel = GameTitleIntel(
            game_key=game_key,
            game_name=game_name,
            analyzed_at=datetime.utcnow().isoformat(),
            video_count=len(videos),
            title_suggestions=title_suggestions[:5],
            top_patterns=patterns[:5],
            top_keywords=keywords[:15],
            top_phrases=phrases[:10],
            tag_clusters=tag_clusters[:5],
            top_tags=tags[:20],
            title_formulas=formulas,
            avg_title_length=avg_title_length,
            avg_word_count=avg_word_count,
            avg_views=avg_views,
            trending_hooks=trending_hooks,
            trending_power_words=trending_power_words,
            data_confidence=data_confidence,
            data_freshness_hours=data_freshness_hours,
        )
        
        # Cache the analysis
        try:
            await redis_client.setex(
                analysis_cache_key,
                TITLE_INTEL_CACHE_TTL,
                json.dumps(self._serialize_intel(intel)),
            )
        except Exception as e:
            logger.warning(f"Failed to cache title intel: {e}")
        
        return intel
    
    def _calculate_data_freshness(self, fetched_at: Optional[str]) -> float:
        """Calculate how many hours old the data is."""
        if not fetched_at:
            return 24.0  # Assume stale if no timestamp
        
        try:
            if isinstance(fetched_at, str):
                fetch_time = datetime.fromisoformat(fetched_at.replace("Z", "+00:00"))
            else:
                return 24.0
            
            now = datetime.now(fetch_time.tzinfo)
            hours = (now - fetch_time).total_seconds() / 3600
            return round(hours, 1)
        except:
            return 24.0
    
    def _calculate_data_confidence(self, sample_size: int, freshness_hours: float) -> int:
        """Calculate overall confidence in the analysis."""
        # Base confidence from sample size (0-50 points)
        if sample_size >= 30:
            sample_conf = 50
        elif sample_size >= 20:
            sample_conf = 40
        elif sample_size >= 10:
            sample_conf = 30
        else:
            sample_conf = sample_size * 3
        
        # Freshness bonus (0-50 points)
        if freshness_hours <= 6:
            fresh_conf = 50
        elif freshness_hours <= 12:
            fresh_conf = 40
        elif freshness_hours <= 24:
            fresh_conf = 30
        else:
            fresh_conf = max(10, 30 - (freshness_hours - 24))
        
        return min(100, sample_conf + fresh_conf)
    
    def _serialize_intel(self, intel: GameTitleIntel) -> Dict:
        """Serialize GameTitleIntel for caching."""
        return {
            "game_key": intel.game_key,
            "game_name": intel.game_name,
            "analyzed_at": intel.analyzed_at,
            "video_count": intel.video_count,
            "title_suggestions": [
                {
                    "title": s.title,
                    "hook": s.hook,
                    "views": s.views,
                    "velocity": s.velocity,
                    "engagement_rate": s.engagement_rate,
                    "power_words": s.power_words,
                    "structure_type": s.structure_type,
                    "why_it_works": s.why_it_works,
                    "template": s.template,
                }
                for s in intel.title_suggestions
            ],
            "top_patterns": [
                {
                    "pattern_name": p.pattern_name,
                    "description": p.description,
                    "frequency": p.frequency,
                    "avg_views": p.avg_views,
                    "avg_engagement": p.avg_engagement,
                    "examples": p.examples,
                }
                for p in intel.top_patterns
            ],
            "top_keywords": [
                {
                    "keyword": k.keyword,
                    "frequency": k.frequency,
                    "avg_views": k.avg_views,
                    "avg_engagement": k.avg_engagement,
                    "velocity_score": k.velocity_score,
                    "power_category": k.power_category,
                    "top_video_title": k.top_video_title,
                    "is_trending": k.is_trending,
                    "tf_idf_score": k.tf_idf_score,
                    "confidence": k.confidence,
                    "effect_size": k.effect_size,
                    "sample_size": k.sample_size,
                }
                for k in intel.top_keywords
            ],
            "top_phrases": [
                {
                    "phrase": p.phrase,
                    "frequency": p.frequency,
                    "avg_views": p.avg_views,
                    "velocity_score": p.velocity_score,
                    "top_video_title": p.top_video_title,
                    "is_trending": p.is_trending,
                    "confidence": p.confidence,
                }
                for p in intel.top_phrases
            ],
            "tag_clusters": [
                {
                    "primary_tag": c.primary_tag,
                    "related_tags": c.related_tags,
                    "avg_views": c.avg_views,
                    "video_count": c.video_count,
                    "example_title": c.example_title,
                }
                for c in intel.tag_clusters
            ],
            "top_tags": [
                {
                    "tag": t.tag,
                    "frequency": t.frequency,
                    "avg_views": t.avg_views,
                    "videos_using": t.videos_using,
                    "top_video_title": t.top_video_title,
                }
                for t in intel.top_tags
            ],
            "title_formulas": intel.title_formulas,
            "avg_title_length": intel.avg_title_length,
            "avg_word_count": intel.avg_word_count,
            "avg_views": intel.avg_views,
            "trending_hooks": intel.trending_hooks,
            "trending_power_words": intel.trending_power_words,
            "data_confidence": intel.data_confidence,
            "data_freshness_hours": intel.data_freshness_hours,
        }
    
    def _deserialize_intel(self, data: Dict) -> GameTitleIntel:
        """Deserialize GameTitleIntel from cache."""
        return GameTitleIntel(
            game_key=data.get("game_key", ""),
            game_name=data.get("game_name", ""),
            analyzed_at=data.get("analyzed_at", ""),
            video_count=data.get("video_count", 0),
            title_suggestions=[
                TitleSuggestion(**s) for s in data.get("title_suggestions", [])
            ],
            top_patterns=[
                TitlePattern(**p) for p in data.get("top_patterns", [])
            ],
            top_keywords=[
                KeywordIntel(**k) for k in data.get("top_keywords", [])
            ],
            top_phrases=[
                PhraseIntel(**p) for p in data.get("top_phrases", [])
            ],
            tag_clusters=[
                TagCluster(**c) for c in data.get("tag_clusters", [])
            ],
            top_tags=[
                TagIntel(**t) for t in data.get("top_tags", [])
            ],
            title_formulas=data.get("title_formulas", []),
            avg_title_length=data.get("avg_title_length", 0),
            avg_word_count=data.get("avg_word_count", 0),
            avg_views=data.get("avg_views", 0),
            trending_hooks=data.get("trending_hooks", []),
            trending_power_words=data.get("trending_power_words", []),
            data_confidence=data.get("data_confidence", 50),
            data_freshness_hours=data.get("data_freshness_hours", 0),
        )

    def _generate_title_suggestions(
        self,
        videos: List[Dict],
        game_name: str,
    ) -> List[TitleSuggestion]:
        """
        Generate actionable title suggestions from top-performing videos.
        
        Uses tiered analysis:
        - Top tier (1-5): Aspirational viral examples
        - Mid tier (6-15): Achievable success patterns  
        - Rising tier (16+): Emerging patterns worth watching
        
        This prevents over-indexing on just the mega-viral outliers.
        """
        suggestions = []
        
        # Tier the videos for balanced analysis
        top_tier = videos[:5]       # Viral examples
        mid_tier = videos[5:15]     # Achievable success
        rising_tier = videos[15:25] # Emerging patterns
        
        # Get suggestions from each tier
        tiers = [
            (top_tier, "viral", 2),      # 2 from top
            (mid_tier, "proven", 2),     # 2 from mid
            (rising_tier, "emerging", 1) # 1 from rising
        ]
        
        for tier_videos, tier_label, count in tiers:
            for video in tier_videos[:count]:
                title = video.get("title", "")
                views = video.get("view_count", 0)
                velocity = video.get("_velocity", 0)
                engagement = video.get("engagement_rate", 0) or 0
                
                if not title:
                    continue
                
                # Extract hook
                hook = _extract_hook(title)
                
                # Analyze structure
                structure = _analyze_title_structure(title)
                
                # Detect power words
                power_words = _detect_power_words(title)
                
                # Generate "why it works" explanation
                why_it_works = self._explain_why_it_works(title, structure, power_words, velocity, tier_label)
                
                # Create reusable template
                template = self._create_template(title, game_name)
                
                suggestions.append(TitleSuggestion(
                    title=title[:100],
                    hook=hook,
                    views=views,
                    velocity=round(velocity, 1),
                    engagement_rate=round(engagement, 2),
                    power_words=power_words,
                    structure_type=structure["type"],
                    why_it_works=why_it_works,
                    template=template,
                ))
        
        return suggestions
    
    def _explain_why_it_works(
        self,
        title: str,
        structure: Dict,
        power_words: List[str],
        velocity: float,
        tier_label: str = "viral",
    ) -> str:
        """Generate a brief explanation of why this title works."""
        reasons = []
        
        # Add tier context
        tier_context = {
            "viral": "🔥 Currently viral",
            "proven": "✅ Proven performer",
            "emerging": "📈 Rising pattern",
        }
        if tier_label in tier_context:
            reasons.append(tier_context[tier_label])
        
        if structure["has_caps"]:
            reasons.append("CAPS grab attention")
        
        if structure["has_emoji"]:
            reasons.append("Emoji increases CTR")
        
        if structure["has_question"]:
            reasons.append("Questions create curiosity")
        
        if structure["has_ellipsis"]:
            reasons.append("Cliffhanger drives clicks")
        
        if power_words:
            pw_str = ", ".join(power_words[:3])
            reasons.append(f"Power words: {pw_str}")
        
        if structure["type"] == "listicle":
            reasons.append("Numbers promise value")
        
        if structure["word_count"] <= 8:
            reasons.append("Short & punchy")
        
        return " • ".join(reasons[:3]) if reasons else "Strong hook"
    
    def _create_template(self, title: str, game_name: str) -> str:
        """Create a reusable template from a successful title."""
        template = title
        
        # Replace game name with placeholder
        for var in [game_name.lower(), game_name.upper(), game_name]:
            template = re.sub(re.escape(var), "[GAME]", template, flags=re.IGNORECASE)
        
        # Replace @mentions
        template = re.sub(r'@\w+', '[CREATOR]', template)
        
        # Replace specific numbers with [X]
        template = re.sub(r'\b\d+\b', '[X]', template)
        
        return template[:100]
    
    def _extract_keywords_advanced(self, videos: List[Dict], all_titles: List[str]) -> List[KeywordIntel]:
        """
        Extract keywords with enterprise-grade metrics.
        
        Features:
        - TF-IDF scoring for keyword importance
        - Position-weighted scoring (videos 11-20 still matter)
        - Percentile-based trending thresholds
        - Statistical significance testing
        - Confidence scores for each keyword
        """
        keyword_stats: Dict[str, Dict] = {}
        
        # Calculate velocity baseline for this category
        all_velocities = [v.get("_velocity", 0) for v in videos if v.get("_velocity", 0) > 0]
        all_views = [v.get("view_count", 0) for v in videos]
        baseline_avg_views = sum(all_views) / len(all_views) if all_views else 0
        
        if all_velocities:
            velocity_median = sorted(all_velocities)[len(all_velocities) // 2]
            velocity_p75 = sorted(all_velocities)[int(len(all_velocities) * 0.75)] if len(all_velocities) > 3 else velocity_median
        else:
            velocity_median = 100
            velocity_p75 = 500
        
        for idx, video in enumerate(videos):
            title = video.get("title", "")
            views = video.get("view_count", 0)
            engagement = video.get("engagement_rate", 0) or 0
            velocity = video.get("_velocity", 0)
            
            # Position weight: top videos count more, but not exclusively
            # Position 0 = 1.0, Position 10 = 0.75, Position 20 = 0.5
            position_weight = max(0.5, 1.0 - (idx / len(videos)) * 0.5)
            
            words = re.findall(r'\b[a-zA-Z]{3,}\b', title.lower())
            
            for word in words:
                if word in STOP_WORDS:
                    continue
                
                if word not in keyword_stats:
                    keyword_stats[word] = {
                        "frequency": 0,
                        "weighted_frequency": 0,
                        "total_views": 0,
                        "total_engagement": 0,
                        "total_velocity": 0,
                        "views_list": [],  # For statistical significance
                        "top_video": {"title": title, "views": views, "velocity": velocity},
                    }
                
                stats = keyword_stats[word]
                stats["frequency"] += 1
                stats["weighted_frequency"] += position_weight
                stats["total_views"] += views
                stats["total_engagement"] += engagement
                stats["total_velocity"] += velocity * position_weight
                stats["views_list"].append(views)
                
                if velocity > stats["top_video"]["velocity"]:
                    stats["top_video"] = {"title": title, "views": views, "velocity": velocity}
        
        # Convert to list with improved filtering
        keywords = []
        min_frequency = max(3, int(len(videos) * 0.10))  # At least 10% of videos
        
        for word, stats in keyword_stats.items():
            if stats["frequency"] < min_frequency:
                continue
            
            # Calculate TF-IDF score
            avg_tf = stats["frequency"] / len(videos)
            idf = _calculate_idf(word, all_titles)
            tf_idf = avg_tf * idf
            
            # Use weighted velocity for scoring
            avg_velocity = stats["total_velocity"] / stats["weighted_frequency"]
            
            # Calculate effect size (how much better than baseline)
            effect_size, is_significant = _calculate_statistical_significance(
                stats["views_list"],
                all_views,
            )
            
            # Determine if it's a power word
            power_category = None
            for category, words in POWER_WORDS.items():
                if word in words:
                    power_category = category
                    break
            
            # Trending = above 75th percentile velocity for this category
            is_trending = avg_velocity > velocity_p75
            
            # Calculate confidence based on sample size and significance
            confidence = self._calculate_keyword_confidence(
                sample_size=stats["frequency"],
                total_videos=len(videos),
                is_significant=is_significant,
                is_trending=is_trending,
            )
            
            keywords.append(KeywordIntel(
                keyword=word,
                frequency=stats["frequency"],
                avg_views=stats["total_views"] // stats["frequency"],
                avg_engagement=stats["total_engagement"] / stats["frequency"],
                velocity_score=round(avg_velocity, 1),
                power_category=power_category,
                top_video_title=stats["top_video"]["title"][:60],
                is_trending=is_trending,
                tf_idf_score=round(tf_idf, 4),
                confidence=confidence,
                effect_size=effect_size,
                sample_size=stats["frequency"],
            ))
        
        # Sort by composite score: TF-IDF * velocity * confidence
        keywords.sort(
            key=lambda x: x.tf_idf_score * x.velocity_score * (x.confidence / 100),
            reverse=True
        )
        return keywords
    
    def _calculate_keyword_confidence(
        self,
        sample_size: int,
        total_videos: int,
        is_significant: bool,
        is_trending: bool,
    ) -> int:
        """Calculate confidence score for a keyword recommendation."""
        # Base confidence from sample size
        coverage = sample_size / total_videos if total_videos > 0 else 0
        
        if coverage >= 0.3:  # 30%+ of videos
            base = 70
        elif coverage >= 0.2:  # 20%+ of videos
            base = 55
        elif coverage >= 0.15:  # 15%+ of videos
            base = 40
        else:
            base = 30
        
        # Bonuses
        if is_significant:
            base += 15
        if is_trending:
            base += 10
        
        return min(100, base)
    
    def _extract_phrases(self, videos: List[Dict]) -> List[PhraseIntel]:
        """
        Extract multi-word phrases (n-grams) that perform well.
        
        Identifies 2-3 word combinations that appear in successful titles.
        """
        phrase_stats: Dict[str, Dict] = {}
        
        # Calculate velocity baseline
        all_velocities = [v.get("_velocity", 0) for v in videos if v.get("_velocity", 0) > 0]
        velocity_p75 = sorted(all_velocities)[int(len(all_velocities) * 0.75)] if len(all_velocities) > 3 else 500
        
        for idx, video in enumerate(videos):
            title = video.get("title", "")
            views = video.get("view_count", 0)
            velocity = video.get("_velocity", 0)
            
            position_weight = max(0.5, 1.0 - (idx / len(videos)) * 0.5)
            
            # Extract 2-grams and 3-grams
            for n in [2, 3]:
                ngrams = _extract_ngrams(title, n)
                
                for phrase in ngrams:
                    if phrase not in phrase_stats:
                        phrase_stats[phrase] = {
                            "frequency": 0,
                            "weighted_frequency": 0,
                            "total_views": 0,
                            "total_velocity": 0,
                            "top_video": {"title": title, "views": views, "velocity": velocity},
                        }
                    
                    stats = phrase_stats[phrase]
                    stats["frequency"] += 1
                    stats["weighted_frequency"] += position_weight
                    stats["total_views"] += views
                    stats["total_velocity"] += velocity * position_weight
                    
                    if velocity > stats["top_video"]["velocity"]:
                        stats["top_video"] = {"title": title, "views": views, "velocity": velocity}
        
        # Convert to list with filtering
        phrases = []
        min_frequency = max(2, int(len(videos) * 0.08))  # At least 8% of videos
        
        for phrase, stats in phrase_stats.items():
            if stats["frequency"] < min_frequency:
                continue
            
            avg_velocity = stats["total_velocity"] / stats["weighted_frequency"]
            is_trending = avg_velocity > velocity_p75
            
            # Confidence based on frequency
            coverage = stats["frequency"] / len(videos)
            confidence = min(90, int(40 + coverage * 150))
            
            phrases.append(PhraseIntel(
                phrase=phrase,
                frequency=stats["frequency"],
                avg_views=stats["total_views"] // stats["frequency"],
                velocity_score=round(avg_velocity, 1),
                top_video_title=stats["top_video"]["title"][:60],
                is_trending=is_trending,
                confidence=confidence,
            ))
        
        # Sort by velocity * confidence
        phrases.sort(key=lambda x: x.velocity_score * (x.confidence / 100), reverse=True)
        return phrases
    
    def _extract_tag_clusters(self, videos: List[Dict]) -> List[TagCluster]:
        """
        Extract clusters of tags that frequently appear together.
        More useful than individual tags.
        """
        # Build co-occurrence matrix
        tag_pairs: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        tag_videos: Dict[str, List[Dict]] = defaultdict(list)
        
        for video in videos:
            tags = video.get("tags", []) or []
            tags = [t.lower().strip() for t in tags[:15] if _is_english_text(t)]
            
            for tag in tags:
                tag_videos[tag].append(video)
            
            # Count co-occurrences
            for i, tag1 in enumerate(tags):
                for tag2 in tags[i+1:]:
                    tag_pairs[tag1][tag2] += 1
                    tag_pairs[tag2][tag1] += 1
        
        # Build clusters around most common tags
        clusters = []
        used_tags: Set[str] = set()
        
        # Sort tags by frequency
        sorted_tags = sorted(tag_videos.keys(), key=lambda t: len(tag_videos[t]), reverse=True)
        
        for primary_tag in sorted_tags[:10]:
            if primary_tag in used_tags:
                continue
            if len(tag_videos[primary_tag]) < 2:
                continue
            
            # Find related tags
            related = sorted(
                tag_pairs[primary_tag].items(),
                key=lambda x: x[1],
                reverse=True
            )[:5]
            
            related_tags = [t for t, _ in related if t not in used_tags]
            
            if not related_tags:
                continue
            
            # Calculate cluster stats
            cluster_videos = tag_videos[primary_tag]
            avg_views = sum(v.get("view_count", 0) for v in cluster_videos) // len(cluster_videos)
            
            # Find best example
            best_video = max(cluster_videos, key=lambda v: v.get("view_count", 0))
            example_title = best_video.get("title", "")[:60]
            
            clusters.append(TagCluster(
                primary_tag=primary_tag,
                related_tags=related_tags[:4],
                avg_views=avg_views,
                video_count=len(cluster_videos),
                example_title=example_title if _is_english_text(example_title) else "",
            ))
            
            used_tags.add(primary_tag)
            used_tags.update(related_tags)
        
        return clusters
    
    def _extract_tags(self, videos: List[Dict]) -> List[TagIntel]:
        """
        Extract individual tags with balanced scoring.
        
        Uses position-weighted analysis so tags from videos 11-20 
        still contribute meaningfully (not just the mega-viral ones).
        """
        tag_stats: Dict[str, Dict] = {}
        
        # Process all videos with position weighting
        for idx, video in enumerate(videos):
            tags = video.get("tags", []) or []
            views = video.get("view_count", 0)
            title = video.get("title", "")
            title_is_english = _is_english_text(title)
            
            # Position weight: earlier = more weight, but not exclusive
            position_weight = max(0.5, 1.0 - (idx / len(videos)) * 0.5)
            
            for tag in tags[:20]:
                tag_lower = tag.lower().strip()
                if not tag_lower or len(tag_lower) < 2:
                    continue
                if not _is_english_text(tag_lower):
                    continue
                
                if tag_lower not in tag_stats:
                    tag_stats[tag_lower] = {
                        "frequency": 0,
                        "weighted_frequency": 0,
                        "total_views": 0,
                        "weighted_views": 0,
                        "videos": 0,
                        "top_video": {"title": title if title_is_english else "", "views": views},
                    }
                
                stats = tag_stats[tag_lower]
                stats["frequency"] += 1
                stats["weighted_frequency"] += position_weight
                stats["total_views"] += views
                stats["weighted_views"] += views * position_weight
                stats["videos"] += 1
                
                # Update top video if this one is better
                if title_is_english and views > stats["top_video"]["views"]:
                    stats["top_video"] = {"title": title, "views": views}
        
        # Convert to list with minimum frequency threshold
        tags = []
        min_videos = max(2, int(len(videos) * 0.1))  # At least 10% of videos
        
        for tag, stats in tag_stats.items():
            if stats["videos"] < min_videos:
                continue
            
            # Use weighted average for more balanced scoring
            avg_views = int(stats["weighted_views"] / stats["weighted_frequency"])
            
            tags.append(TagIntel(
                tag=tag,
                frequency=stats["frequency"],
                avg_views=avg_views,
                videos_using=stats["videos"],
                top_video_title=stats["top_video"]["title"][:60],
            ))
        
        # Sort by weighted average views
        tags.sort(key=lambda x: x.avg_views, reverse=True)
        return tags
    
    def _analyze_patterns(self, videos: List[Dict]) -> List[TitlePattern]:
        """Detect title patterns and their performance."""
        pattern_configs = {
            "curiosity_gap": {
                "regex": r"(\.{3}|…|\?$|what happens|you won't believe|this is why)",
                "name": "Curiosity Gap",
                "description": "Creates intrigue with cliffhangers or questions",
            },
            "number_hook": {
                "regex": r"^\d+\s|\s\d+\s(tips|ways|things|reasons|secrets|tricks)",
                "name": "Number Hook",
                "description": "Uses specific numbers to promise value",
            },
            "challenge": {
                "regex": r"(can i|i tried|challenge|without|only using)",
                "name": "Challenge Format",
                "description": "Presents a challenge or limitation",
            },
            "emotional": {
                "regex": r"(insane|crazy|unbelievable|incredible|amazing|epic|best|worst|broke|destroyed)",
                "name": "Emotional Hook",
                "description": "Uses strong emotional words",
            },
            "caps_emphasis": {
                "regex": r"[A-Z]{3,}",
                "name": "CAPS Emphasis",
                "description": "Uses ALL CAPS for emphasis",
            },
        }
        
        pattern_stats: Dict[str, Dict] = {}
        
        for key, config in pattern_configs.items():
            regex = re.compile(config["regex"], re.IGNORECASE)
            matching = [v for v in videos if regex.search(v.get("title", ""))]
            
            if matching:
                views = [v.get("view_count", 0) for v in matching]
                engagements = [v.get("engagement_rate", 0) or 0 for v in matching]
                
                pattern_stats[key] = {
                    "name": config["name"],
                    "description": config["description"],
                    "frequency": len(matching),
                    "avg_views": sum(views) // len(views),
                    "avg_engagement": sum(engagements) / len(engagements),
                    "examples": [v.get("title", "")[:80] for v in matching[:3]],
                }
        
        sorted_patterns = sorted(
            pattern_stats.items(),
            key=lambda x: x[1]["frequency"] * x[1]["avg_views"],
            reverse=True,
        )
        
        return [
            TitlePattern(
                pattern_name=stats["name"],
                description=stats["description"],
                frequency=stats["frequency"],
                avg_views=stats["avg_views"],
                avg_engagement=stats["avg_engagement"],
                examples=stats["examples"],
            )
            for _, stats in sorted_patterns
        ]
    
    def _extract_trending_hooks(self, videos: List[Dict]) -> List[str]:
        """Extract hooks from the top velocity videos."""
        hooks = []
        for video in videos:
            title = video.get("title", "")
            if title:
                hook = _extract_hook(title)
                if hook and len(hook) > 5:
                    hooks.append(hook)
        return hooks[:5]
    
    def _extract_trending_power_words(self, videos: List[Dict]) -> List[str]:
        """Extract power words from trending videos."""
        all_power_words = []
        for video in videos:
            title = video.get("title", "")
            all_power_words.extend(_detect_power_words(title))
        
        # Count and return most common
        counter = Counter(all_power_words)
        return [word for word, _ in counter.most_common(10)]
    
    def _generate_formulas_legacy(
        self,
        suggestions: List[TitleSuggestion],
        game_name: str,
    ) -> List[Dict[str, str]]:
        """Generate legacy format formulas for backwards compatibility."""
        formulas = []
        
        for i, s in enumerate(suggestions[:4]):
            formulas.append({
                "name": f"#{i+1} Hot Right Now",
                "formula": f"Velocity: {s.velocity:,.0f} views/hr",
                "template": s.template,
                "example": s.title,
                "avg_views": f"{s.views:,}",
                "why_it_works": s.why_it_works,
            })
        
        return formulas
    
    async def get_all_games_intel(self) -> Dict[str, GameTitleIntel]:
        """Get title intelligence for all tracked games."""
        from backend.services.thumbnail_intel.constants import GAMING_CATEGORIES
        
        results = {}
        for game_key in GAMING_CATEGORIES.keys():
            intel = await self.analyze_game(game_key)
            if intel:
                results[game_key] = intel
        
        return results


# Singleton
_analyzer: Optional[TitleIntelAnalyzer] = None


def get_title_intel_analyzer() -> TitleIntelAnalyzer:
    """Get or create the title intel analyzer singleton."""
    global _analyzer
    if _analyzer is None:
        _analyzer = TitleIntelAnalyzer()
    return _analyzer
