"""
Viral Hooks Analyzer - Extract trending patterns and hooks.

Analyzes trending content to identify:
- Title patterns that drive clicks
- Hashtags gaining momentum
- Topics with viral potential
- Content formats that are working
"""

import logging
import re
from collections import Counter
from typing import List, Dict, Any

from backend.api.schemas.playbook import ViralHook

logger = logging.getLogger(__name__)


class ViralHooksAnalyzer:
    """Extracts viral hooks and patterns from trending content."""
    
    # Common stop words to filter
    STOP_WORDS = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "is", "it", "this", "that", "be", "are",
        "was", "were", "been", "have", "has", "had", "do", "does", "did",
        "will", "would", "could", "should", "i", "you", "he", "she", "we",
        "they", "my", "your", "his", "her", "its", "our", "their", "me",
        "vs", "ft", "official", "video", "new", "full",
    }
    
    # Viral title patterns to detect
    VIRAL_PATTERNS = [
        (r"\b(\d+)\s*(tips?|ways?|things?|reasons?)\b", "number_list", "The Number Hook"),
        (r"\bi\s*(tried|tested|did|made)\b", "personal_experiment", "Personal Experiment"),
        (r"\b(how\s+to|tutorial|guide)\b", "educational", "Educational Content"),
        (r"\b(challenge|impossible|insane|crazy)\b", "challenge", "Challenge Content"),
        (r"\b(secret|hidden|unknown|nobody)\b", "mystery", "Mystery/Secret"),
        (r"\b(best|worst|top|ultimate)\b", "superlative", "Superlative Hook"),
        (r"\?\s*$", "question", "Question Hook"),
        (r"\.{3}$|\.\.\.$", "cliffhanger", "Cliffhanger"),
    ]
    
    def __init__(self):
        pass
    
    async def analyze(
        self,
        youtube_videos: List[Dict[str, Any]],
        twitch_clips: List[Dict[str, Any]],
        keywords_data: Dict[str, Any],
    ) -> List[ViralHook]:
        """
        Analyze trending content to extract viral hooks.
        
        Args:
            youtube_videos: Trending YouTube videos
            twitch_clips: Viral Twitch clips
            keywords_data: Trending keywords response
            
        Returns:
            List of viral hooks sorted by virality score
        """
        hooks: List[ViralHook] = []
        
        # Analyze title patterns
        title_hooks = self._analyze_title_patterns(youtube_videos)
        hooks.extend(title_hooks)
        
        # Analyze trending hashtags
        hashtag_hooks = self._analyze_hashtags(keywords_data)
        hooks.extend(hashtag_hooks)
        
        # Analyze trending topics
        topic_hooks = self._analyze_topics(youtube_videos, keywords_data)
        hooks.extend(topic_hooks)
        
        # Analyze clip titles for Twitch trends
        clip_hooks = self._analyze_clip_patterns(twitch_clips)
        hooks.extend(clip_hooks)
        
        # Sort by virality and dedupe
        seen_hooks = set()
        unique_hooks = []
        for hook in sorted(hooks, key=lambda x: x.virality_score, reverse=True):
            if hook.hook.lower() not in seen_hooks:
                seen_hooks.add(hook.hook.lower())
                unique_hooks.append(hook)
        
        return unique_hooks[:10]
    
    def _analyze_title_patterns(
        self,
        videos: List[Dict[str, Any]],
    ) -> List[ViralHook]:
        """Extract viral patterns from video titles."""
        hooks: List[ViralHook] = []
        pattern_counts: Dict[str, List[Dict]] = {}
        
        for video in videos:
            title = video.get("title", "")
            views = video.get("view_count", 0) or video.get("views", 0)
            
            for pattern, pattern_type, pattern_name in self.VIRAL_PATTERNS:
                if re.search(pattern, title, re.IGNORECASE):
                    if pattern_type not in pattern_counts:
                        pattern_counts[pattern_type] = []
                    pattern_counts[pattern_type].append({
                        "title": title,
                        "views": views,
                    })
        
        # Create hooks for patterns with multiple examples
        for pattern_type, examples in pattern_counts.items():
            if len(examples) >= 2:
                avg_views = sum(e["views"] for e in examples) // len(examples)
                virality = min(100, 50 + len(examples) * 10 + (avg_views // 100000))
                
                # Find the pattern name
                pattern_name = next(
                    (name for _, pt, name in self.VIRAL_PATTERNS if pt == pattern_type),
                    pattern_type.replace("_", " ").title()
                )
                
                hooks.append(ViralHook(
                    hook_type="title",
                    hook=pattern_name,
                    examples=[e["title"][:60] + "..." for e in examples[:3]],
                    virality_score=virality,
                    time_sensitivity="this_week",
                    usage_tip=self._get_pattern_tip(pattern_type),
                ))
        
        return hooks
    
    def _analyze_hashtags(
        self,
        keywords_data: Dict[str, Any],
    ) -> List[ViralHook]:
        """Extract trending hashtags."""
        hooks: List[ViralHook] = []
        
        hashtags = keywords_data.get("hashtags", [])
        tag_keywords = keywords_data.get("tag_keywords", [])
        
        # Top hashtags
        for i, tag in enumerate(hashtags[:5]):
            virality = 90 - (i * 10)  # Decreasing virality by rank
            hooks.append(ViralHook(
                hook_type="hashtag",
                hook=tag,
                examples=[],
                virality_score=virality,
                time_sensitivity="today" if i < 2 else "this_week",
                usage_tip=f"Add {tag} to your video description and social posts",
            ))
        
        # Convert top tags to hashtags
        for kw in tag_keywords[:3]:
            keyword = kw.get("keyword", "")
            if keyword and not keyword.startswith("#"):
                hashtag = "#" + keyword.replace(" ", "").lower()
                hooks.append(ViralHook(
                    hook_type="hashtag",
                    hook=hashtag,
                    examples=[],
                    virality_score=70,
                    time_sensitivity="this_week",
                    usage_tip=f"Trending tag: use {hashtag} in your content",
                ))
        
        return hooks
    
    def _analyze_topics(
        self,
        videos: List[Dict[str, Any]],
        keywords_data: Dict[str, Any],
    ) -> List[ViralHook]:
        """Extract trending topics."""
        hooks: List[ViralHook] = []
        
        # Extract topics from video titles
        topic_words: Counter = Counter()
        
        for video in videos:
            title = video.get("title", "").lower()
            words = re.findall(r'\b[a-z]{4,}\b', title)
            for word in words:
                if word not in self.STOP_WORDS:
                    topic_words[word] += 1
        
        # Top topics
        for word, count in topic_words.most_common(5):
            if count >= 3:
                # Clamp virality score to 0-100
                virality = min(100, 60 + count * 5)
                hooks.append(ViralHook(
                    hook_type="topic",
                    hook=word.title(),
                    examples=[],
                    virality_score=virality,
                    time_sensitivity="this_week",
                    usage_tip=f"'{word.title()}' is trending - incorporate into your content",
                ))
        
        # Topic keywords from API
        for kw in keywords_data.get("topic_keywords", [])[:3]:
            keyword = kw.get("keyword", "")
            if keyword:
                hooks.append(ViralHook(
                    hook_type="topic",
                    hook=keyword,
                    examples=[],
                    virality_score=75,
                    time_sensitivity="this_week",
                    usage_tip=f"YouTube categorizes trending content under '{keyword}'",
                ))
        
        return hooks
    
    def _analyze_clip_patterns(
        self,
        clips: List[Dict[str, Any]],
    ) -> List[ViralHook]:
        """Analyze Twitch clip titles for patterns."""
        hooks: List[ViralHook] = []
        
        if not clips:
            return hooks
        
        # Common clip title patterns
        clip_patterns: Counter = Counter()
        
        for clip in clips:
            title = clip.get("title", "").lower()
            
            if any(word in title for word in ["insane", "crazy", "unbelievable"]):
                clip_patterns["Hype Moment"] += 1
            if any(word in title for word in ["fail", "rip", "f in chat"]):
                clip_patterns["Fail Compilation"] += 1
            if any(word in title for word in ["clutch", "win", "victory"]):
                clip_patterns["Clutch Play"] += 1
            if any(word in title for word in ["funny", "lol", "lmao"]):
                clip_patterns["Comedy Clip"] += 1
        
        for pattern, count in clip_patterns.most_common(3):
            if count >= 2:
                # Clamp virality score to 0-100
                virality = min(100, 65 + count * 5)
                hooks.append(ViralHook(
                    hook_type="format",
                    hook=pattern,
                    examples=[],
                    virality_score=virality,
                    time_sensitivity="evergreen",
                    usage_tip=f"'{pattern}' clips are getting views - create similar moments",
                ))
        
        return hooks
    
    def _get_pattern_tip(self, pattern_type: str) -> str:
        """Get usage tip for a title pattern."""
        tips = {
            "number_list": "Numbers in titles increase CTR by 36%. Use odd numbers for best results.",
            "personal_experiment": "First-person experiments build trust. Share your genuine reaction.",
            "educational": "How-to content has long shelf life. Be specific about what viewers will learn.",
            "challenge": "Challenges are shareable. Make rules clear and stakes high.",
            "mystery": "Curiosity gaps drive clicks. Reveal the secret in the first 30 seconds.",
            "superlative": "Superlatives set expectations. Make sure your content delivers.",
            "question": "Questions engage viewers. Answer it definitively in your content.",
            "cliffhanger": "Cliffhangers boost watch time. Deliver the payoff to build trust.",
        }
        return tips.get(pattern_type, "Use this pattern in your next title for better CTR.")
