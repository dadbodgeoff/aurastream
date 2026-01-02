"""
Creator Intel V2 - Description Analyzer

Extracts insights from video descriptions:
- Hashtags (trending tags not in title)
- Timestamps (chapter structure patterns)
- Sponsor mentions (monetization signals)
- Social links (creator size indicators)
- Call-to-action patterns
"""

import re
from collections import Counter
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import logging

from backend.services.intel.core.base_analyzer import BaseAnalyzer, AnalysisResult

logger = logging.getLogger(__name__)


@dataclass
class HashtagAnalysis:
    """Analysis of hashtags found in descriptions."""
    hashtag: str
    frequency: int
    avg_views: float
    appears_in_title: bool
    is_trending: bool


@dataclass
class TimestampPattern:
    """Common timestamp/chapter patterns."""
    pattern_type: str
    avg_position_percent: float
    frequency: int


@dataclass
class SponsorPattern:
    """Sponsor mention patterns."""
    sponsor_type: str
    frequency: int
    avg_views_with_sponsor: float
    avg_views_without_sponsor: float


@dataclass
class DescriptionAnalysis:
    """Complete description analysis for a category."""
    category_key: str
    category_name: str
    
    # Hashtag analysis
    top_hashtags: List[HashtagAnalysis]
    hashtag_count_avg: float
    
    # Timestamp analysis
    has_timestamps_percent: float
    common_chapter_patterns: List[TimestampPattern]
    
    # Sponsor analysis
    has_sponsor_percent: float
    sponsor_patterns: List[SponsorPattern]
    
    # Link analysis
    has_social_links_percent: float
    common_platforms: List[str]
    
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


class DescriptionAnalyzer(BaseAnalyzer):
    """
    Analyzes video descriptions for hidden signals.
    
    Key insights generated:
    - "Top Fortnite videos use #fortnite #gaming #epicgames"
    - "73% of viral videos have timestamps"
    - "Sponsored videos get 20% fewer views on average"
    """
    
    # Regex patterns
    HASHTAG_PATTERN = re.compile(r'#(\w+)', re.IGNORECASE)
    TIMESTAMP_PATTERN = re.compile(r'(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]?\s*(.+?)(?:\n|$)')
    
    # Sponsor indicators - refined to avoid false positives from creator codes
    # "code" alone triggers too many false positives (creator codes like "Use Code NINJA")
    SPONSOR_KEYWORDS = [
        "sponsored", "#ad", "partner", "affiliate", 
        "discount code", "promo code", "coupon code",  # Specific code contexts
        "check out", "thanks to", "brought to you",
        "paid promotion", "paid partnership",
    ]
    
    # Creator code patterns to EXCLUDE from sponsor detection
    # These are affiliate/creator codes, not brand sponsorships
    CREATOR_CODE_PATTERNS = [
        r"use code \w+",  # "Use Code NINJA"
        r"creator code",
        r"support.a" r".creator",
        r"item shop code",
        r"sac code",  # Support-a-Creator
    ]
    
    # Social platform patterns
    SOCIAL_PATTERNS = {
        "twitter": re.compile(r'twitter\.com/|@\w+|x\.com/', re.IGNORECASE),
        "discord": re.compile(r'discord\.gg/|discord\.com/', re.IGNORECASE),
        "instagram": re.compile(r'instagram\.com/', re.IGNORECASE),
        "tiktok": re.compile(r'tiktok\.com/', re.IGNORECASE),
        "twitch": re.compile(r'twitch\.tv/', re.IGNORECASE),
    }
    
    @property
    def analyzer_name(self) -> str:
        """Return the analyzer name."""
        return "description"
    
    def get_cache_key(self, category_key: str) -> str:
        """Generate cache key for this analysis."""
        return f"intel:description:precomputed:{category_key}"
    
    async def analyze(self, category_key: str) -> Optional[AnalysisResult]:
        """
        Analyze description patterns for a category.
        
        Args:
            category_key: The category to analyze
            
        Returns:
            AnalysisResult containing DescriptionAnalysis
        """
        youtube_data = await self.load_youtube_data(category_key)
        
        if not youtube_data:
            return None
        
        videos = youtube_data.get("videos", [])
        game_name = youtube_data.get(
            "game_display_name",
            category_key.replace("_", " ").title()
        )
        
        # Filter videos with descriptions
        videos_with_desc = [v for v in videos if v.get("description")]
        
        if len(videos_with_desc) < 5:
            logger.warning(f"Insufficient videos with descriptions: {len(videos_with_desc)}")
            return None
        
        # Calculate content hash
        content_hash = self.calculate_content_hash(videos_with_desc)
        
        # Analyze components
        hashtag_analysis = self._analyze_hashtags(videos_with_desc)
        timestamp_analysis = self._analyze_timestamps(videos_with_desc)
        sponsor_analysis = self._analyze_sponsors(videos_with_desc)
        social_analysis = self._analyze_social_links(videos_with_desc)
        
        # Generate insights
        insights = self._generate_insights(
            hashtag_analysis, timestamp_analysis, sponsor_analysis, game_name
        )
        
        confidence = self.calculate_confidence(len(videos_with_desc), base_confidence=40)
        
        analysis = DescriptionAnalysis(
            category_key=category_key,
            category_name=game_name,
            top_hashtags=hashtag_analysis["top_hashtags"],
            hashtag_count_avg=hashtag_analysis["avg_count"],
            has_timestamps_percent=timestamp_analysis["percent"],
            common_chapter_patterns=timestamp_analysis["patterns"],
            has_sponsor_percent=sponsor_analysis["percent"],
            sponsor_patterns=sponsor_analysis["patterns"],
            has_social_links_percent=social_analysis["percent"],
            common_platforms=social_analysis["platforms"],
            insights=insights,
            video_count=len(videos_with_desc),
            confidence=confidence,
            analyzed_at=datetime.now(timezone.utc),
        )
        
        return AnalysisResult(
            data=analysis.to_dict(),
            category_key=category_key,
            analyzer_name=self.analyzer_name,
            confidence=confidence,
            video_count=len(videos_with_desc),
            content_hash=content_hash,
        )
    
    def _analyze_hashtags(self, videos: List[Dict]) -> Dict[str, Any]:
        """Extract and analyze hashtags from descriptions."""
        hashtag_data: Counter = Counter()
        hashtag_views: Dict[str, List[int]] = {}
        title_hashtags: set = set()
        
        for video in videos:
            desc = video.get("description", "")
            title = video.get("title", "").lower()
            views = video.get("view_count", 0)
            
            # Find hashtags in description
            hashtags = self.HASHTAG_PATTERN.findall(desc)
            
            for tag in hashtags:
                tag_lower = tag.lower()
                hashtag_data[tag_lower] += 1
                
                if tag_lower not in hashtag_views:
                    hashtag_views[tag_lower] = []
                hashtag_views[tag_lower].append(views)
                
                if tag_lower in title:
                    title_hashtags.add(tag_lower)
        
        # Calculate average hashtags per video
        total_hashtags = sum(
            len(self.HASHTAG_PATTERN.findall(v.get("description", "")))
            for v in videos
        )
        avg_count = total_hashtags / len(videos) if videos else 0
        
        # Build top hashtags list
        top_hashtags = []
        for tag, freq in hashtag_data.most_common(10):
            views_list = hashtag_views.get(tag, [])
            avg_views = sum(views_list) / len(views_list) if views_list else 0
            
            top_hashtags.append(HashtagAnalysis(
                hashtag=f"#{tag}",
                frequency=freq,
                avg_views=round(avg_views, 2),
                appears_in_title=tag in title_hashtags,
                is_trending=freq >= 3 and avg_views > 10000,
            ))
        
        return {
            "top_hashtags": top_hashtags,
            "avg_count": round(avg_count, 1),
        }
    
    def _analyze_timestamps(self, videos: List[Dict]) -> Dict[str, Any]:
        """Analyze timestamp/chapter patterns."""
        videos_with_timestamps = 0
        chapter_types: Counter = Counter()
        
        for video in videos:
            desc = video.get("description", "")
            timestamps = self.TIMESTAMP_PATTERN.findall(desc)
            
            if timestamps:
                videos_with_timestamps += 1
                
                for _, chapter_name in timestamps:
                    chapter_lower = chapter_name.lower().strip()
                    
                    # Categorize chapter type
                    if any(w in chapter_lower for w in ["intro", "start", "beginning"]):
                        chapter_types["intro"] += 1
                    elif any(w in chapter_lower for w in ["gameplay", "game", "playing"]):
                        chapter_types["gameplay"] += 1
                    elif any(w in chapter_lower for w in ["outro", "end", "bye", "thanks"]):
                        chapter_types["outro"] += 1
                    elif any(w in chapter_lower for w in ["highlight", "best", "moment", "clip"]):
                        chapter_types["highlight"] += 1
        
        percent = (videos_with_timestamps / len(videos) * 100) if videos else 0
        
        patterns = [
            TimestampPattern(
                pattern_type=ptype,
                avg_position_percent=0,
                frequency=freq,
            )
            for ptype, freq in chapter_types.most_common(5)
        ]
        
        return {
            "percent": round(percent, 1),
            "patterns": patterns,
        }
    
    def _analyze_sponsors(self, videos: List[Dict]) -> Dict[str, Any]:
        """Detect sponsor mentions and analyze impact."""
        import re
        
        sponsored_videos = []
        non_sponsored_videos = []
        
        # Compile creator code patterns for exclusion
        creator_code_regex = re.compile(
            '|'.join(self.CREATOR_CODE_PATTERNS),
            re.IGNORECASE
        )
        
        for video in videos:
            desc = video.get("description", "").lower()
            
            # Check for sponsor keywords
            has_sponsor = any(kw in desc for kw in self.SPONSOR_KEYWORDS)
            
            # Exclude if it's just a creator code (not a real sponsorship)
            if has_sponsor and creator_code_regex.search(desc):
                # Check if there are OTHER sponsor indicators beyond creator codes
                # If only creator code patterns match, it's not a real sponsor
                non_code_sponsors = [
                    kw for kw in self.SPONSOR_KEYWORDS 
                    if kw in desc and kw not in ["code", "use code"]
                ]
                if not non_code_sponsors:
                    has_sponsor = False
            
            if has_sponsor:
                sponsored_videos.append(video)
            else:
                non_sponsored_videos.append(video)
        
        percent = (len(sponsored_videos) / len(videos) * 100) if videos else 0
        
        sponsored_avg = (
            sum(v.get("view_count", 0) for v in sponsored_videos) / len(sponsored_videos)
            if sponsored_videos else 0
        )
        non_sponsored_avg = (
            sum(v.get("view_count", 0) for v in non_sponsored_videos) / len(non_sponsored_videos)
            if non_sponsored_videos else 0
        )
        
        patterns = []
        if sponsored_videos:
            patterns.append(SponsorPattern(
                sponsor_type="brand_deal",
                frequency=len(sponsored_videos),
                avg_views_with_sponsor=round(sponsored_avg, 2),
                avg_views_without_sponsor=round(non_sponsored_avg, 2),
            ))
        
        return {
            "percent": round(percent, 1),
            "patterns": patterns,
        }
    
    def _analyze_social_links(self, videos: List[Dict]) -> Dict[str, Any]:
        """Analyze social media link patterns."""
        videos_with_social = 0
        platform_counts: Counter = Counter()
        
        for video in videos:
            desc = video.get("description", "")
            has_social = False
            
            for platform, pattern in self.SOCIAL_PATTERNS.items():
                if pattern.search(desc):
                    platform_counts[platform] += 1
                    has_social = True
            
            if has_social:
                videos_with_social += 1
        
        percent = (videos_with_social / len(videos) * 100) if videos else 0
        platforms = [p for p, _ in platform_counts.most_common(5)]
        
        return {
            "percent": round(percent, 1),
            "platforms": platforms,
        }
    
    def _generate_insights(
        self,
        hashtag_analysis: Dict[str, Any],
        timestamp_analysis: Dict[str, Any],
        sponsor_analysis: Dict[str, Any],
        game_name: str,
    ) -> List[str]:
        """Generate human-readable insights."""
        insights = []
        
        # Hashtag insight
        top_tags = hashtag_analysis.get("top_hashtags", [])
        if top_tags:
            trending = [t for t in top_tags if t.is_trending]
            if trending:
                tag_str = ", ".join(t.hashtag for t in trending[:3])
                insights.append(f"Trending hashtags for {game_name}: {tag_str}")
        
        # Timestamp insight
        ts_percent = timestamp_analysis.get("percent", 0)
        if ts_percent > 50:
            insights.append(
                f"{ts_percent:.0f}% of top videos have timestamps - "
                f"consider adding chapters"
            )
        
        # Sponsor insight
        patterns = sponsor_analysis.get("patterns", [])
        if patterns:
            p = patterns[0]
            if p.avg_views_without_sponsor > 0 and p.avg_views_with_sponsor < p.avg_views_without_sponsor * 0.8:
                drop_pct = (1 - p.avg_views_with_sponsor / p.avg_views_without_sponsor) * 100
                insights.append(
                    f"Sponsored videos get {drop_pct:.0f}% fewer views - "
                    f"be selective with brand deals"
                )
        
        return insights[:5]


# Singleton
_description_analyzer: Optional[DescriptionAnalyzer] = None


def get_description_analyzer() -> DescriptionAnalyzer:
    """Get the singleton analyzer instance."""
    global _description_analyzer
    if _description_analyzer is None:
        _description_analyzer = DescriptionAnalyzer()
    return _description_analyzer
