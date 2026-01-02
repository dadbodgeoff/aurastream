"""
Creator Intel V2 - Semantic Analyzer

Analyzes YouTube's semantic understanding of content:
- topic_categories: Wikipedia URLs that YouTube assigns
- Full tag lists (not just top 10)

This is YouTube telling you what the video is about - high signal!
"""

from collections import Counter
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import logging

from backend.services.intel.core.base_analyzer import BaseAnalyzer, AnalysisResult

logger = logging.getLogger(__name__)


@dataclass
class TopicCluster:
    """A cluster of related topics."""
    primary_topic: str
    related_topics: List[str]
    video_count: int
    avg_views: float
    performance_index: float


@dataclass
class TagCluster:
    """A cluster of frequently co-occurring tags."""
    anchor_tag: str
    co_occurring_tags: List[str]
    frequency: int
    avg_views: float


@dataclass
class SemanticAnalysis:
    """Complete semantic analysis for a category."""
    category_key: str
    category_name: str
    
    # Topic analysis
    top_topics: List[str]
    topic_clusters: List[TopicCluster]
    topic_view_correlation: Dict[str, float]
    
    # Tag analysis (full, not top 10)
    top_tags_full: List[str]
    tag_clusters: List[TagCluster]
    optimal_tag_count: int
    
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


class SemanticAnalyzer(BaseAnalyzer):
    """
    Analyzes YouTube's semantic categorization.
    
    Key insights generated:
    - "Videos tagged 'Esports' get 40% more views in Valorant"
    - "Optimal tag count is 12-15 tags"
    - "Tags 'tutorial' + 'guide' + 'tips' cluster together"
    """
    
    @staticmethod
    def _clean_topic_name(topic: str) -> str:
        """
        Clean Wikipedia URL to readable topic name.
        
        Example: "https://en.wikipedia.org/wiki/Video_game" -> "Video game"
        """
        if topic.startswith("http"):
            # Extract the last part of the URL
            name = topic.split("/")[-1]
            # Replace underscores with spaces
            name = name.replace("_", " ")
            return name
        return topic
    
    @property
    def analyzer_name(self) -> str:
        """Return the analyzer name."""
        return "semantic"
    
    def get_cache_key(self, category_key: str) -> str:
        """Generate cache key for this analysis."""
        return f"intel:semantic:precomputed:{category_key}"
    
    async def analyze(self, category_key: str) -> Optional[AnalysisResult]:
        """
        Analyze semantic patterns for a category.
        
        Args:
            category_key: The category to analyze
            
        Returns:
            AnalysisResult containing SemanticAnalysis
        """
        youtube_data = await self.load_youtube_data(category_key)
        
        if not youtube_data:
            return None
        
        videos = youtube_data.get("videos", [])
        game_name = youtube_data.get(
            "game_display_name",
            category_key.replace("_", " ").title()
        )
        
        if len(videos) < self.MIN_VIDEOS_REQUIRED:
            return None
        
        # Calculate content hash
        content_hash = self.calculate_content_hash(videos)
        
        # Analyze topics
        topic_analysis = self._analyze_topics(videos)
        
        # Analyze full tags
        tag_analysis = self._analyze_tags(videos)
        
        # Generate insights
        insights = self._generate_insights(topic_analysis, tag_analysis, game_name)
        
        confidence = self.calculate_confidence(len(videos), base_confidence=40)
        
        analysis = SemanticAnalysis(
            category_key=category_key,
            category_name=game_name,
            top_topics=topic_analysis["top_topics"],
            topic_clusters=topic_analysis["clusters"],
            topic_view_correlation=topic_analysis["correlation"],
            top_tags_full=tag_analysis["top_tags"],
            tag_clusters=tag_analysis["clusters"],
            optimal_tag_count=tag_analysis["optimal_count"],
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
    
    def _analyze_topics(self, videos: List[Dict]) -> Dict[str, Any]:
        """Analyze topic_categories from YouTube."""
        topic_counts: Counter = Counter()
        topic_views: Dict[str, List[int]] = {}
        
        for video in videos:
            topics = video.get("topic_categories", [])
            views = video.get("view_count", 0)
            
            for raw_topic in topics:
                # Clean Wikipedia URLs to readable names
                topic = self._clean_topic_name(raw_topic)
                topic_counts[topic] += 1
                
                if topic not in topic_views:
                    topic_views[topic] = []
                topic_views[topic].append(views)
        
        # Calculate category average
        all_views = [v.get("view_count", 0) for v in videos]
        category_avg = sum(all_views) / len(all_views) if all_views else 1
        
        # Build correlation map (with cleaned topic names)
        correlation = {}
        for topic, views_list in topic_views.items():
            avg = sum(views_list) / len(views_list)
            correlation[topic] = round(avg / category_avg, 2) if category_avg > 0 else 1
        
        # Build clusters
        clusters = self._build_topic_clusters(videos, topic_counts, topic_views, category_avg)
        
        top_topics = [t for t, _ in topic_counts.most_common(10)]
        
        return {
            "top_topics": top_topics,
            "clusters": clusters,
            "correlation": correlation,
        }
    
    def _build_topic_clusters(
        self,
        videos: List[Dict],
        topic_counts: Counter,
        topic_views: Dict[str, List[int]],
        category_avg: float,
    ) -> List[TopicCluster]:
        """Build clusters of related topics."""
        # Find topics that frequently appear together
        co_occurrence: Dict[str, Counter] = {}
        
        for video in videos:
            topics = video.get("topic_categories", [])
            for i, t1 in enumerate(topics):
                if t1 not in co_occurrence:
                    co_occurrence[t1] = Counter()
                for t2 in topics[i+1:]:
                    co_occurrence[t1][t2] += 1
        
        clusters = []
        seen_topics: set = set()
        
        for topic, count in topic_counts.most_common(5):
            if topic in seen_topics:
                continue
            
            related = [t for t, _ in co_occurrence.get(topic, Counter()).most_common(3)]
            seen_topics.add(topic)
            seen_topics.update(related)
            
            views_list = topic_views.get(topic, [])
            avg_views = sum(views_list) / len(views_list) if views_list else 0
            
            clusters.append(TopicCluster(
                primary_topic=topic,
                related_topics=related,
                video_count=count,
                avg_views=round(avg_views, 2),
                performance_index=round(avg_views / category_avg, 2) if category_avg > 0 else 1,
            ))
        
        return clusters
    
    def _analyze_tags(self, videos: List[Dict]) -> Dict[str, Any]:
        """Analyze full tag lists (not just top 10)."""
        tag_counts: Counter = Counter()
        tag_views: Dict[str, List[int]] = {}
        
        for video in videos:
            tags = video.get("tags", [])
            views = video.get("view_count", 0)
            
            for tag in tags:
                tag_lower = tag.lower().strip()
                tag_counts[tag_lower] += 1
                
                if tag_lower not in tag_views:
                    tag_views[tag_lower] = []
                tag_views[tag_lower].append(views)
        
        # Find optimal tag count
        optimal_count = self._find_optimal_tag_count(videos)
        
        # Build tag clusters
        clusters = self._build_tag_clusters(videos, tag_counts, tag_views)
        
        top_tags = [t for t, _ in tag_counts.most_common(30)]
        
        return {
            "top_tags": top_tags,
            "clusters": clusters,
            "optimal_count": optimal_count,
        }
    
    def _find_optimal_tag_count(self, videos: List[Dict]) -> int:
        """Find the tag count that correlates with best performance."""
        # Group videos by tag count buckets
        buckets: Dict[int, List[int]] = {}
        
        for video in videos:
            tag_count = len(video.get("tags", []))
            views = video.get("view_count", 0)
            
            # Round to nearest 5
            bucket = (tag_count // 5) * 5
            
            if bucket not in buckets:
                buckets[bucket] = []
            buckets[bucket].append(views)
        
        # Find bucket with highest average views
        best_bucket = 10  # Default
        best_avg = 0
        
        for bucket, views_list in buckets.items():
            if len(views_list) >= 3:  # Need at least 3 videos
                avg = sum(views_list) / len(views_list)
                if avg > best_avg:
                    best_avg = avg
                    best_bucket = bucket
        
        return best_bucket + 2  # Return middle of bucket
    
    def _build_tag_clusters(
        self,
        videos: List[Dict],
        tag_counts: Counter,
        tag_views: Dict[str, List[int]],
    ) -> List[TagCluster]:
        """Build clusters of co-occurring tags."""
        co_occurrence: Dict[str, Counter] = {}
        
        for video in videos:
            tags = [t.lower().strip() for t in video.get("tags", [])]
            for i, t1 in enumerate(tags):
                if t1 not in co_occurrence:
                    co_occurrence[t1] = Counter()
                for t2 in tags[i+1:]:
                    co_occurrence[t1][t2] += 1
        
        clusters = []
        seen_tags: set = set()
        
        for tag, count in tag_counts.most_common(10):
            if tag in seen_tags or count < 3:
                continue
            
            co_tags = [t for t, _ in co_occurrence.get(tag, Counter()).most_common(5)]
            seen_tags.add(tag)
            
            views_list = tag_views.get(tag, [])
            # FIXED: Require minimum 3 samples for statistical validity
            if len(views_list) < 3:
                continue
            avg_views = sum(views_list) / len(views_list)
            
            clusters.append(TagCluster(
                anchor_tag=tag,
                co_occurring_tags=co_tags,
                frequency=count,
                avg_views=round(avg_views, 2),
            ))
        
        return clusters[:5]
    
    def _generate_insights(
        self,
        topic_analysis: Dict[str, Any],
        tag_analysis: Dict[str, Any],
        game_name: str,
    ) -> List[str]:
        """Generate human-readable insights."""
        insights = []
        
        # Topic insight
        correlation = topic_analysis.get("correlation", {})
        for topic, ratio in sorted(correlation.items(), key=lambda x: x[1], reverse=True)[:1]:
            if ratio > 1.3:
                insights.append(
                    f"Videos with '{topic}' topic get {(ratio-1)*100:.0f}% more views"
                )
        
        # Tag count insight
        optimal = tag_analysis.get("optimal_count", 10)
        insights.append(f"Optimal tag count for {game_name}: {optimal-2} to {optimal+2} tags")
        
        # Tag cluster insight
        clusters = tag_analysis.get("clusters", [])
        if clusters:
            c = clusters[0]
            if c.co_occurring_tags:
                tags_str = ", ".join([c.anchor_tag] + c.co_occurring_tags[:2])
                insights.append(f"High-performing tag combo: {tags_str}")
        
        return insights[:5]


# Singleton
_semantic_analyzer: Optional[SemanticAnalyzer] = None


def get_semantic_analyzer() -> SemanticAnalyzer:
    """Get the singleton analyzer instance."""
    global _semantic_analyzer
    if _semantic_analyzer is None:
        _semantic_analyzer = SemanticAnalyzer()
    return _semantic_analyzer
