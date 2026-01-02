# 🧠 CREATOR INTEL EXPANSION - MASTER SCHEMA
## Complete Implementation Blueprint for Data Pipeline Enhancement

**Version:** 1.0.0  
**Created:** January 2, 2026  
**Purpose:** Definitive implementation guide for expanding Creator Intel data coverage from 33% to 100%

---

## EXECUTIVE SUMMARY

This document defines the complete architecture for expanding AuraStream's Creator Intel system to utilize ALL available data from YouTube and Twitch APIs. Currently using 12 of 36 available fields (33%), this expansion will achieve full coverage through:

- **6 New Analyzers** - Process previously ignored high-signal data
- **2 API Expansions** - Fetch additional YouTube/Twitch fields
- **1 Enhanced Worker** - Orchestrate daily data processing
- **1 Decay System** - Manage data freshness and confidence
- **Frontend Experience** - Display insights to users

---

## TABLE OF CONTENTS

1. [Current State Analysis](#1-current-state-analysis)
2. [Data Architecture](#2-data-architecture)
3. [API Expansions](#3-api-expansions)
4. [New Analyzers](#4-new-analyzers)
5. [Worker Orchestration](#5-worker-orchestration)
6. [Data Decay & Freshness](#6-data-decay--freshness)
7. [Database Schema](#7-database-schema)
8. [Frontend Experience](#8-frontend-experience)
9. [Implementation Phases](#9-implementation-phases)
10. [Testing Strategy](#10-testing-strategy)

---

## 1. CURRENT STATE ANALYSIS

### 1.1 Field Coverage Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CURRENT FIELD USAGE (33%)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  YOUTUBE (12/24 fields used)                                                │
│  ├── ✅ USED: video_id, title, thumbnail, channel_title, published_at,     │
│  │           view_count, like_count, comment_count, engagement_rate,        │
│  │           viral_score, velocity, tags (partial - top 10 only)            │
│  │                                                                          │
│  └── ❌ UNUSED: description, duration_seconds, is_short, is_live,          │
│                 topic_categories, has_captions, default_audio_language,     │
│                 is_made_for_kids, is_licensed, subscriber_count,            │
│                 channel_id, category                                        │
│                                                                             │
│  TWITCH (6/14 fields used)                                                  │
│  ├── ✅ USED: user_id, user_name, game_id, game_name, viewer_count, title  │
│  │                                                                          │
│  └── ❌ UNUSED: started_at, language, tags, is_mature, thumbnail_url,      │
│                 type, broadcaster_type, id                                  │
│                                                                             │
│  TWITCH CLIPS (3/7 fields used)                                             │
│  ├── ✅ USED: id, title, view_count                                        │
│  └── ❌ UNUSED: duration, created_at, creator_name, thumbnail_url          │
│                                                                             │
│  NEW API FIELDS (0/5 fetched)                                               │
│  └── ❌ NOT FETCHED: liveStreamingDetails.*, /videos endpoint,             │
│                      /channels endpoint, contentDetails.definition          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Current Analyzer Coverage

| Analyzer | Fields Used | Primary Output |
|----------|-------------|----------------|
| `viral_detector.py` | views, likes, comments, published_at, tags | Viral score, trending topics |
| `title_intel/analyzer.py` | title, views, tags (top 10), engagement_rate | Keywords, phrases, title suggestions |
| `competition_analyzer.py` | viewer_count, stream_count | Opportunity score |
| `video_idea_generator.py` | Consumes above outputs | Video concepts |
| `daily_insight_generator.py` | Consumes above outputs | Daily actionable insight |

---

## 2. DATA ARCHITECTURE

### 2.1 Complete Data Flow (After Expansion)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA COLLECTION LAYER                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  youtube_collector.py                    twitch_collector.py                │
│  ├── fetch_trending()                    ├── fetch_top_streams()            │
│  │   └── +liveStreamingDetails           │   └── All fields ✅              │
│  │   └── +contentDetails.definition      ├── fetch_channel_videos() [NEW]   │
│  └── fetch_video_stats()                 │   └── VOD data, duration         │
│      └── All existing + new fields       └── fetch_channel_extended() [NEW] │
│                                              └── content_classification     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REDIS CACHE LAYER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  youtube:games:{game}          twitch:streams:{game_id}                     │
│  ├── videos[]                  ├── streams[]                                │
│  │   ├── All 24 fields         │   ├── All 14 fields                        │
│  │   └── fetched_at            │   └── fetched_at                           │
│  └── TTL: 4 hours              └── TTL: 30 minutes                          │
│                                                                             │
│  twitch:vods:{game_id} [NEW]   twitch:channels:{game_id} [NEW]              │
│  ├── vods[]                    ├── channels[]                               │
│  │   └── duration, views       │   └── content_labels, branded              │
│  └── TTL: 6 hours              └── TTL: 24 hours                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ANALYZER LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EXISTING ANALYZERS (Enhanced)           NEW ANALYZERS                      │
│  ├── viral_detector.py                   ├── content_format_analyzer.py     │
│  │   └── +duration correlation           │   └── duration, shorts, live     │
│  ├── title_intel/analyzer.py             ├── description_analyzer.py        │
│  │   └── +full tags, description         │   └── hashtags, timestamps       │
│  ├── competition_analyzer.py             ├── semantic_analyzer.py           │
│  │   └── +language filtering             │   └── topic_categories           │
│  └── daily_insight_generator.py          ├── regional_analyzer.py           │
│      └── +new insight types              │   └── language analysis          │
│                                          ├── channel_analyzer.py            │
│                                          │   └── channel size correlation   │
│                                          └── live_stream_analyzer.py        │
│                                              └── premiere timing            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OUTPUT LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  REDIS (Pre-computed)                    POSTGRESQL (Historical)            │
│  ├── intel:title:precomputed:{game}      ├── intel_snapshots                │
│  ├── intel:video_ideas:precomputed       │   └── Daily aggregates           │
│  ├── intel:viral:precomputed:{game}      ├── intel_duration_stats           │
│  ├── intel:format:precomputed:{game}     │   └── Duration performance       │
│  ├── intel:regional:precomputed:{game}   ├── intel_regional_stats           │
│  └── intel:semantic:precomputed:{game}   │   └── Language competition       │
│                                          └── intel_premiere_stats           │
│                                              └── Premiere timing data       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Refresh Schedule

| Data Type | Refresh Interval | Worker | TTL |
|-----------|------------------|--------|-----|
| YouTube Videos | 4 hours | `youtube_worker.py` | 5 hours |
| Twitch Streams | 30 minutes | `twitch_streams_worker.py` | 45 minutes |
| Twitch VODs | 6 hours | `twitch_vods_worker.py` [NEW] | 8 hours |
| Intel Analysis | 4 hours | `creator_intel_worker.py` | 5 hours |
| Daily Insights | 24 hours | `daily_insight_worker.py` | 26 hours |
| Historical Snapshots | 24 hours | `intel_snapshot_worker.py` [NEW] | Permanent |

---

## 3. API EXPANSIONS

### 3.1 YouTube API Expansion

**File:** `backend/services/trends/youtube_collector.py`

#### 3.1.1 Add liveStreamingDetails to API Request

```python
# BEFORE
params = {
    "part": "snippet,statistics,contentDetails,topicDetails,status",
    ...
}

# AFTER
params = {
    "part": "snippet,statistics,contentDetails,topicDetails,status,liveStreamingDetails",
    ...
}
```

#### 3.1.2 New Fields to Parse

```python
class YouTubeVideoResponse(BaseModel):
    # ... existing fields ...
    
    # NEW: liveStreamingDetails fields
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None
    scheduled_start_time: Optional[datetime] = None
    concurrent_viewers: Optional[int] = None
    was_live_stream: bool = False
    actual_stream_duration_seconds: Optional[int] = None
    
    # NEW: contentDetails fields
    definition: Optional[str] = None  # "hd" or "sd"
    dimension: Optional[str] = None   # "2d" or "3d"
    
    # NEW: Derived fields
    is_premiere: bool = False  # True if scheduled_start_time exists
    premiere_delay_seconds: Optional[int] = None  # actual - scheduled
```

#### 3.1.3 Transform Function Updates

```python
def _transform_video_item(self, item: dict, category: Optional[str] = None) -> Optional[YouTubeVideoResponse]:
    # ... existing code ...
    
    # NEW: Parse liveStreamingDetails
    live_streaming = item.get("liveStreamingDetails", {})
    
    actual_start = live_streaming.get("actualStartTime")
    actual_end = live_streaming.get("actualEndTime")
    scheduled_start = live_streaming.get("scheduledStartTime")
    concurrent_viewers = live_streaming.get("concurrentViewers")
    
    # Parse timestamps
    actual_start_time = self._parse_datetime(actual_start)
    actual_end_time = self._parse_datetime(actual_end)
    scheduled_start_time = self._parse_datetime(scheduled_start)
    
    # Calculate derived fields
    was_live_stream = actual_start_time is not None
    is_premiere = scheduled_start_time is not None
    
    actual_stream_duration_seconds = None
    if actual_start_time and actual_end_time:
        actual_stream_duration_seconds = int(
            (actual_end_time - actual_start_time).total_seconds()
        )
    
    premiere_delay_seconds = None
    if actual_start_time and scheduled_start_time:
        premiere_delay_seconds = int(
            (actual_start_time - scheduled_start_time).total_seconds()
        )
    
    # NEW: Parse contentDetails extras
    content_details = item.get("contentDetails", {})
    definition = content_details.get("definition")  # "hd" or "sd"
    dimension = content_details.get("dimension")    # "2d" or "3d"
    
    return YouTubeVideoResponse(
        # ... existing fields ...
        actual_start_time=actual_start_time,
        actual_end_time=actual_end_time,
        scheduled_start_time=scheduled_start_time,
        concurrent_viewers=int(concurrent_viewers) if concurrent_viewers else None,
        was_live_stream=was_live_stream,
        actual_stream_duration_seconds=actual_stream_duration_seconds,
        is_premiere=is_premiere,
        premiere_delay_seconds=premiere_delay_seconds,
        definition=definition,
        dimension=dimension,
    )
```

### 3.2 Twitch API Expansion

**File:** `backend/services/trends/twitch_collector.py`

#### 3.2.1 New Endpoint: /videos (VODs)

```python
@dataclass
class TwitchVideo:
    """Twitch VOD/highlight/upload data."""
    id: str
    stream_id: Optional[str]
    user_id: str
    user_login: str
    user_name: str
    title: str
    description: str
    created_at: datetime
    published_at: datetime
    url: str
    thumbnail_url: str
    viewable: str  # "public" or "private"
    view_count: int
    language: str
    type: str  # "archive", "highlight", "upload"
    duration: str  # ISO 8601 duration
    duration_seconds: int  # Parsed duration
    muted_segments: Optional[List[Dict]]  # DMCA muted sections


async def fetch_channel_videos(
    self,
    user_id: str,
    video_type: Literal["archive", "highlight", "upload", "all"] = "archive",
    limit: int = 20,
) -> List[TwitchVideo]:
    """
    Fetch VODs/highlights/uploads for a channel.
    
    Args:
        user_id: Twitch user ID
        video_type: Type of videos to fetch
        limit: Maximum videos to return (1-100)
    
    Returns:
        List of TwitchVideo objects
    
    API Endpoint: GET /videos?user_id={id}&type={type}
    """
    params = {
        "user_id": user_id,
        "first": min(100, limit),
    }
    if video_type != "all":
        params["type"] = video_type
    
    data = await self._make_request("/videos", params)
    
    videos = []
    for item in data.get("data", []):
        try:
            duration_str = item.get("duration", "0h0m0s")
            duration_seconds = self._parse_twitch_duration(duration_str)
            
            video = TwitchVideo(
                id=item["id"],
                stream_id=item.get("stream_id"),
                user_id=item["user_id"],
                user_login=item["user_login"],
                user_name=item["user_name"],
                title=item.get("title", ""),
                description=item.get("description", ""),
                created_at=datetime.fromisoformat(
                    item["created_at"].replace("Z", "+00:00")
                ),
                published_at=datetime.fromisoformat(
                    item["published_at"].replace("Z", "+00:00")
                ),
                url=item["url"],
                thumbnail_url=item.get("thumbnail_url", ""),
                viewable=item.get("viewable", "public"),
                view_count=item.get("view_count", 0),
                language=item.get("language", ""),
                type=item.get("type", "archive"),
                duration=duration_str,
                duration_seconds=duration_seconds,
                muted_segments=item.get("muted_segments"),
            )
            videos.append(video)
        except (KeyError, ValueError) as e:
            logger.warning(f"Failed to parse video data: {e}")
            continue
    
    return videos


def _parse_twitch_duration(self, duration_str: str) -> int:
    """
    Parse Twitch duration string to seconds.
    
    Format: "1h2m3s" or "2m30s" or "45s"
    """
    import re
    
    hours = minutes = seconds = 0
    
    h_match = re.search(r'(\d+)h', duration_str)
    m_match = re.search(r'(\d+)m', duration_str)
    s_match = re.search(r'(\d+)s', duration_str)
    
    if h_match:
        hours = int(h_match.group(1))
    if m_match:
        minutes = int(m_match.group(1))
    if s_match:
        seconds = int(s_match.group(1))
    
    return hours * 3600 + minutes * 60 + seconds
```

#### 3.2.2 New Endpoint: /channels (Extended Info)

```python
@dataclass
class TwitchChannelExtended:
    """Extended Twitch channel info from /channels endpoint."""
    broadcaster_id: str
    broadcaster_login: str
    broadcaster_name: str
    broadcaster_language: str
    game_id: str
    game_name: str
    title: str
    delay: int  # Stream delay in seconds
    tags: List[str]
    content_classification_labels: List[str]  # e.g., ["MatureGame", "ViolentGraphics"]
    is_branded_content: bool


async def fetch_channel_extended(
    self,
    broadcaster_id: str,
) -> Optional[TwitchChannelExtended]:
    """
    Fetch extended channel info including content labels.
    
    Args:
        broadcaster_id: Twitch broadcaster user ID
    
    Returns:
        TwitchChannelExtended or None if failed
    
    API Endpoint: GET /channels?broadcaster_id={id}
    """
    params = {"broadcaster_id": broadcaster_id}
    
    try:
        data = await self._make_request("/channels", params)
        
        items = data.get("data", [])
        if not items:
            return None
        
        item = items[0]
        
        return TwitchChannelExtended(
            broadcaster_id=item["broadcaster_id"],
            broadcaster_login=item["broadcaster_login"],
            broadcaster_name=item["broadcaster_name"],
            broadcaster_language=item.get("broadcaster_language", "en"),
            game_id=item.get("game_id", ""),
            game_name=item.get("game_name", ""),
            title=item.get("title", ""),
            delay=item.get("delay", 0),
            tags=item.get("tags", []),
            content_classification_labels=item.get("content_classification_labels", []),
            is_branded_content=item.get("is_branded_content", False),
        )
    except Exception as e:
        logger.warning(f"Failed to fetch extended channel info: {e}")
        return None
```

---

## 4. NEW ANALYZERS

### 4.1 Analyzer Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        6 NEW ANALYZERS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. ContentFormatAnalyzer                                                   │
│     └── Fields: duration_seconds, is_short, is_live, definition            │
│     └── Output: Optimal duration, shorts vs long-form, HD correlation      │
│                                                                             │
│  2. DescriptionAnalyzer                                                     │
│     └── Fields: description                                                 │
│     └── Output: Hashtags, timestamps, sponsor patterns, link analysis      │
│                                                                             │
│  3. SemanticAnalyzer                                                        │
│     └── Fields: topic_categories, tags (full list)                         │
│     └── Output: Topic clusters, semantic themes, category correlation      │
│                                                                             │
│  4. RegionalAnalyzer                                                        │
│     └── Fields: default_audio_language (YT), language (Twitch)             │
│     └── Output: Regional competition, underserved markets                  │
│                                                                             │
│  5. ChannelAnalyzer                                                         │
│     └── Fields: channel_id, subscriber_count, broadcaster_type             │
│     └── Output: Channel size correlation, tier performance                 │
│                                                                             │
│  6. LiveStreamAnalyzer                                                      │
│     └── Fields: liveStreamingDetails.* (all new fields)                    │
│     └── Output: Premiere vs instant, optimal scheduling, duration patterns │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```


### 4.2 ContentFormatAnalyzer

**File:** `backend/services/intel/content_format_analyzer.py`

**Purpose:** Analyze optimal video formats (duration, shorts, live, quality)

```python
"""
Content Format Analyzer

Analyzes video format patterns to identify optimal content structures:
- Optimal video duration by category
- Shorts vs long-form performance comparison
- Live vs VOD performance
- HD vs SD quality correlation

Data Source: YouTube videos cached in Redis
"""

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Dict, List, Optional, Literal
import json
import logging

logger = logging.getLogger(__name__)


@dataclass
class DurationBucket:
    """Performance metrics for a duration range."""
    min_seconds: int
    max_seconds: int
    label: str  # "0-60s", "1-5min", "5-10min", etc.
    video_count: int
    avg_views: float
    avg_engagement: float
    total_views: int
    performance_index: float  # Relative to category average


@dataclass
class FormatComparison:
    """Comparison between two content formats."""
    format_a: str
    format_b: str
    format_a_count: int
    format_b_count: int
    format_a_avg_views: float
    format_b_avg_views: float
    performance_ratio: float  # A / B
    recommendation: str
    confidence: int


@dataclass
class ContentFormatAnalysis:
    """Complete content format analysis for a category."""
    category_key: str
    category_name: str
    
    # Duration analysis
    duration_buckets: List[DurationBucket]
    optimal_duration_range: str  # e.g., "8-15 minutes"
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
    
    def to_dict(self) -> Dict:
        result = asdict(self)
        result["analyzed_at"] = self.analyzed_at.isoformat()
        return result


class ContentFormatAnalyzer:
    """
    Analyzes content format patterns for gaming categories.
    
    Key insights:
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
        (3601, float('inf'), "Marathon (60min+)"),
    ]
    
    def __init__(self):
        self._redis = None
    
    async def _get_redis(self):
        if self._redis is None:
            import redis.asyncio as redis
            import os
            redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
            self._redis = redis.from_url(redis_url, decode_responses=True)
        return self._redis
    
    async def analyze_category(self, category_key: str) -> Optional[ContentFormatAnalysis]:
        """
        Analyze content format patterns for a category.
        
        Returns insights on optimal duration, shorts vs long-form, etc.
        """
        redis_client = await self._get_redis()
        
        # Load YouTube video data
        youtube_key = f"youtube:games:{category_key}"
        youtube_data = await redis_client.get(youtube_key)
        
        if not youtube_data:
            logger.warning(f"No YouTube data for {category_key}")
            return None
        
        try:
            data = json.loads(youtube_data)
        except json.JSONDecodeError:
            return None
        
        videos = data.get("videos", [])
        game_name = data.get("game_display_name", category_key.replace("_", " ").title())
        
        if len(videos) < 10:
            logger.warning(f"Insufficient videos for format analysis: {len(videos)}")
            return None
        
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
        confidence = min(90, 50 + len(videos) // 2)
        
        return ContentFormatAnalysis(
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
    
    def _analyze_duration_buckets(self, videos: List[Dict]) -> List[DurationBucket]:
        """Group videos by duration and calculate performance metrics."""
        buckets = {label: [] for _, _, label in self.DURATION_BUCKETS}
        
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
                max_seconds=int(max_s) if max_s != float('inf') else 999999,
                label=label,
                video_count=len(bucket_videos),
                avg_views=round(avg_views, 2),
                avg_engagement=round(sum(engagements) / len(engagements), 2) if engagements else 0,
                total_views=sum(views),
                performance_index=round(performance_index, 2),
            ))
        
        return result
    
    def _find_optimal_duration(self, buckets: List[DurationBucket]) -> Optional[DurationBucket]:
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
        
        ratio = shorts_avg / longform_avg if longform_avg > 0 else 0
        
        if ratio > 1.5:
            recommendation = "Shorts significantly outperforming - prioritize short-form content"
        elif ratio > 1:
            recommendation = "Shorts slightly better - mix both formats"
        elif ratio > 0.5:
            recommendation = "Long-form slightly better - focus on quality long content"
        else:
            recommendation = "Long-form significantly better - prioritize detailed content"
        
        confidence = min(80, 30 + len(shorts) * 2 + len(longform) * 2)
        
        return FormatComparison(
            format_a="Shorts",
            format_b="Long-form",
            format_a_count=len(shorts),
            format_b_count=len(longform),
            format_a_avg_views=round(shorts_avg, 2),
            format_b_avg_views=round(longform_avg, 2),
            performance_ratio=round(ratio, 2),
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
        
        ratio = live_avg / vod_avg if vod_avg > 0 else 0
        
        if ratio > 1:
            recommendation = "Live content performing well - consider more streams"
        else:
            recommendation = "Edited content outperforming - focus on post-production"
        
        confidence = min(70, 20 + len(live) * 3 + len(vod) * 2)
        
        return FormatComparison(
            format_a="Live/Stream VOD",
            format_b="Edited Upload",
            format_a_count=len(live),
            format_b_count=len(vod),
            format_a_avg_views=round(live_avg, 2),
            format_b_avg_views=round(vod_avg, 2),
            performance_ratio=round(ratio, 2),
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
        
        return insights[:5]  # Limit to 5 insights


# Singleton
_content_format_analyzer: Optional[ContentFormatAnalyzer] = None


def get_content_format_analyzer() -> ContentFormatAnalyzer:
    global _content_format_analyzer
    if _content_format_analyzer is None:
        _content_format_analyzer = ContentFormatAnalyzer()
    return _content_format_analyzer
```


### 4.3 DescriptionAnalyzer

**File:** `backend/services/intel/description_analyzer.py`

**Purpose:** Extract insights from video descriptions (hashtags, timestamps, sponsors)

```python
"""
Description Analyzer

Extracts valuable signals from video descriptions:
- Hashtags (trending tags not in title)
- Timestamps (chapter structure patterns)
- Sponsor mentions (monetization signals)
- Social links (creator size indicators)
- Call-to-action patterns

Data Source: YouTube videos cached in Redis
"""

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set
from collections import Counter
import re
import json
import logging

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
    pattern_type: str  # "intro", "gameplay", "outro", "highlight"
    avg_position_percent: float  # Where in video this typically appears
    frequency: int


@dataclass
class SponsorPattern:
    """Sponsor mention patterns."""
    sponsor_type: str  # "brand_deal", "affiliate", "merch", "membership"
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
    common_platforms: List[str]  # ["twitter", "discord", "instagram"]
    
    # Insights
    insights: List[str]
    
    # Metadata
    video_count: int
    confidence: int
    analyzed_at: datetime
    
    def to_dict(self) -> Dict:
        result = asdict(self)
        result["analyzed_at"] = self.analyzed_at.isoformat()
        return result


class DescriptionAnalyzer:
    """
    Analyzes video descriptions for hidden signals.
    
    Key insights:
    - "Top Fortnite videos use #fortnite #gaming #epicgames"
    - "73% of viral videos have timestamps"
    - "Sponsored videos get 20% fewer views on average"
    """
    
    # Regex patterns
    HASHTAG_PATTERN = re.compile(r'#(\w+)', re.IGNORECASE)
    TIMESTAMP_PATTERN = re.compile(r'(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]?\s*(.+?)(?:\n|$)')
    
    # Sponsor indicators
    SPONSOR_KEYWORDS = [
        "sponsored", "ad", "partner", "affiliate", "code", "discount",
        "use code", "link in", "check out", "thanks to", "brought to you"
    ]
    
    # Social platform patterns
    SOCIAL_PATTERNS = {
        "twitter": re.compile(r'twitter\.com/|@\w+|x\.com/', re.IGNORECASE),
        "discord": re.compile(r'discord\.gg/|discord\.com/', re.IGNORECASE),
        "instagram": re.compile(r'instagram\.com/', re.IGNORECASE),
        "tiktok": re.compile(r'tiktok\.com/', re.IGNORECASE),
        "twitch": re.compile(r'twitch\.tv/', re.IGNORECASE),
    }
    
    def __init__(self):
        self._redis = None
    
    async def _get_redis(self):
        if self._redis is None:
            import redis.asyncio as redis
            import os
            redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
            self._redis = redis.from_url(redis_url, decode_responses=True)
        return self._redis
    
    async def analyze_category(self, category_key: str) -> Optional[DescriptionAnalysis]:
        """Analyze description patterns for a category."""
        redis_client = await self._get_redis()
        
        youtube_key = f"youtube:games:{category_key}"
        youtube_data = await redis_client.get(youtube_key)
        
        if not youtube_data:
            return None
        
        try:
            data = json.loads(youtube_data)
        except json.JSONDecodeError:
            return None
        
        videos = data.get("videos", [])
        game_name = data.get("game_display_name", category_key.replace("_", " ").title())
        
        # Filter videos with descriptions
        videos_with_desc = [v for v in videos if v.get("description")]
        
        if len(videos_with_desc) < 5:
            return None
        
        # Analyze components
        hashtag_analysis = self._analyze_hashtags(videos_with_desc)
        timestamp_analysis = self._analyze_timestamps(videos_with_desc)
        sponsor_analysis = self._analyze_sponsors(videos_with_desc)
        social_analysis = self._analyze_social_links(videos_with_desc)
        
        # Generate insights
        insights = self._generate_insights(
            hashtag_analysis, timestamp_analysis, sponsor_analysis, game_name
        )
        
        confidence = min(85, 40 + len(videos_with_desc))
        
        return DescriptionAnalysis(
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
    
    def _analyze_hashtags(self, videos: List[Dict]) -> Dict:
        """Extract and analyze hashtags from descriptions."""
        hashtag_data = Counter()
        hashtag_views = {}
        title_hashtags = set()
        
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
    
    def _analyze_timestamps(self, videos: List[Dict]) -> Dict:
        """Analyze timestamp/chapter patterns."""
        videos_with_timestamps = 0
        chapter_types = Counter()
        
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
                avg_position_percent=0,  # Would need duration analysis
                frequency=freq,
            )
            for ptype, freq in chapter_types.most_common(5)
        ]
        
        return {
            "percent": round(percent, 1),
            "patterns": patterns,
        }
    
    def _analyze_sponsors(self, videos: List[Dict]) -> Dict:
        """Detect sponsor mentions and analyze impact."""
        sponsored_videos = []
        non_sponsored_videos = []
        
        for video in videos:
            desc = video.get("description", "").lower()
            views = video.get("view_count", 0)
            
            has_sponsor = any(kw in desc for kw in self.SPONSOR_KEYWORDS)
            
            if has_sponsor:
                sponsored_videos.append(video)
            else:
                non_sponsored_videos.append(video)
        
        percent = (len(sponsored_videos) / len(videos) * 100) if videos else 0
        
        sponsored_avg = sum(v.get("view_count", 0) for v in sponsored_videos) / len(sponsored_videos) if sponsored_videos else 0
        non_sponsored_avg = sum(v.get("view_count", 0) for v in non_sponsored_videos) / len(non_sponsored_videos) if non_sponsored_videos else 0
        
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
    
    def _analyze_social_links(self, videos: List[Dict]) -> Dict:
        """Analyze social media link patterns."""
        videos_with_social = 0
        platform_counts = Counter()
        
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
        hashtag_analysis: Dict,
        timestamp_analysis: Dict,
        sponsor_analysis: Dict,
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
            if p.avg_views_with_sponsor < p.avg_views_without_sponsor * 0.8:
                insights.append(
                    f"Sponsored videos get {((1 - p.avg_views_with_sponsor/p.avg_views_without_sponsor) * 100):.0f}% "
                    f"fewer views - be selective with brand deals"
                )
        
        return insights[:5]


# Singleton
_description_analyzer: Optional[DescriptionAnalyzer] = None


def get_description_analyzer() -> DescriptionAnalyzer:
    global _description_analyzer
    if _description_analyzer is None:
        _description_analyzer = DescriptionAnalyzer()
    return _description_analyzer
```


### 4.4 SemanticAnalyzer

**File:** `backend/services/intel/semantic_analyzer.py`

**Purpose:** Analyze YouTube's topic categories and full tag lists

```python
"""
Semantic Analyzer

Analyzes YouTube's semantic understanding of content:
- topic_categories: Wikipedia URLs that YouTube assigns
- Full tag lists (not just top 10)

This is YouTube telling you what the video is about - high signal!

Data Source: YouTube videos cached in Redis
"""

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Dict, List, Optional
from collections import Counter
import json
import logging

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
    topic_view_correlation: Dict[str, float]  # topic -> avg views
    
    # Tag analysis (full, not top 10)
    top_tags_full: List[str]  # All tags, ranked
    tag_clusters: List[TagCluster]
    optimal_tag_count: int
    
    # Insights
    insights: List[str]
    
    # Metadata
    video_count: int
    confidence: int
    analyzed_at: datetime
    
    def to_dict(self) -> Dict:
        result = asdict(self)
        result["analyzed_at"] = self.analyzed_at.isoformat()
        return result


class SemanticAnalyzer:
    """
    Analyzes YouTube's semantic categorization.
    
    Key insights:
    - "Videos tagged 'Esports' get 40% more views in Valorant"
    - "Optimal tag count is 12-15 tags"
    - "Tags 'tutorial' + 'guide' + 'tips' cluster together"
    """
    
    def __init__(self):
        self._redis = None
    
    async def _get_redis(self):
        if self._redis is None:
            import redis.asyncio as redis
            import os
            redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
            self._redis = redis.from_url(redis_url, decode_responses=True)
        return self._redis
    
    async def analyze_category(self, category_key: str) -> Optional[SemanticAnalysis]:
        """Analyze semantic patterns for a category."""
        redis_client = await self._get_redis()
        
        youtube_key = f"youtube:games:{category_key}"
        youtube_data = await redis_client.get(youtube_key)
        
        if not youtube_data:
            return None
        
        try:
            data = json.loads(youtube_data)
        except json.JSONDecodeError:
            return None
        
        videos = data.get("videos", [])
        game_name = data.get("game_display_name", category_key.replace("_", " ").title())
        
        if len(videos) < 10:
            return None
        
        # Analyze topics
        topic_analysis = self._analyze_topics(videos)
        
        # Analyze full tags
        tag_analysis = self._analyze_tags(videos)
        
        # Generate insights
        insights = self._generate_insights(topic_analysis, tag_analysis, game_name)
        
        confidence = min(85, 40 + len(videos))
        
        return SemanticAnalysis(
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
    
    def _analyze_topics(self, videos: List[Dict]) -> Dict:
        """Analyze topic_categories from YouTube."""
        topic_counts = Counter()
        topic_views = {}
        
        for video in videos:
            topics = video.get("topic_categories", [])
            views = video.get("view_count", 0)
            
            for topic in topics:
                # topic_categories are already parsed to topic names
                topic_counts[topic] += 1
                
                if topic not in topic_views:
                    topic_views[topic] = []
                topic_views[topic].append(views)
        
        # Calculate category average
        all_views = [v.get("view_count", 0) for v in videos]
        category_avg = sum(all_views) / len(all_views) if all_views else 1
        
        # Build correlation map
        correlation = {}
        for topic, views_list in topic_views.items():
            avg = sum(views_list) / len(views_list)
            correlation[topic] = round(avg / category_avg, 2) if category_avg > 0 else 1
        
        # Build clusters (topics that appear together)
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
        topic_views: Dict,
        category_avg: float,
    ) -> List[TopicCluster]:
        """Build clusters of related topics."""
        # Find topics that frequently appear together
        co_occurrence = {}
        
        for video in videos:
            topics = video.get("topic_categories", [])
            for i, t1 in enumerate(topics):
                if t1 not in co_occurrence:
                    co_occurrence[t1] = Counter()
                for t2 in topics[i+1:]:
                    co_occurrence[t1][t2] += 1
        
        clusters = []
        seen_topics = set()
        
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
    
    def _analyze_tags(self, videos: List[Dict]) -> Dict:
        """Analyze full tag lists (not just top 10)."""
        tag_counts = Counter()
        tag_views = {}
        tag_counts_per_video = []
        
        for video in videos:
            tags = video.get("tags", [])
            views = video.get("view_count", 0)
            
            tag_counts_per_video.append(len(tags))
            
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
        buckets = {}  # tag_count -> [views]
        
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
        tag_views: Dict,
    ) -> List[TagCluster]:
        """Build clusters of co-occurring tags."""
        co_occurrence = {}
        
        for video in videos:
            tags = [t.lower().strip() for t in video.get("tags", [])]
            for i, t1 in enumerate(tags):
                if t1 not in co_occurrence:
                    co_occurrence[t1] = Counter()
                for t2 in tags[i+1:]:
                    co_occurrence[t1][t2] += 1
        
        clusters = []
        seen_tags = set()
        
        for tag, count in tag_counts.most_common(10):
            if tag in seen_tags or count < 3:
                continue
            
            co_tags = [t for t, _ in co_occurrence.get(tag, Counter()).most_common(5)]
            seen_tags.add(tag)
            
            views_list = tag_views.get(tag, [])
            avg_views = sum(views_list) / len(views_list) if views_list else 0
            
            clusters.append(TagCluster(
                anchor_tag=tag,
                co_occurring_tags=co_tags,
                frequency=count,
                avg_views=round(avg_views, 2),
            ))
        
        return clusters[:5]
    
    def _generate_insights(
        self,
        topic_analysis: Dict,
        tag_analysis: Dict,
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
    global _semantic_analyzer
    if _semantic_analyzer is None:
        _semantic_analyzer = SemanticAnalyzer()
    return _semantic_analyzer
```


### 4.5 RegionalAnalyzer

**File:** `backend/services/intel/regional_analyzer.py`

**Purpose:** Analyze language/regional competition and opportunities

```python
"""
Regional Analyzer

Analyzes regional competition and opportunities:
- YouTube: default_audio_language
- Twitch: language field

Key insights:
- "Spanish Fortnite has 50% less competition"
- "German Valorant viewers are underserved"
- "English dominates but Portuguese is growing"

Data Source: YouTube + Twitch data cached in Redis
"""

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Dict, List, Optional
from collections import Counter
import json
import logging

logger = logging.getLogger(__name__)


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
    competition_score: float  # Lower = less competition
    opportunity_score: float  # Higher = better opportunity
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
    
    def to_dict(self) -> Dict:
        result = asdict(self)
        result["analyzed_at"] = self.analyzed_at.isoformat()
        return result


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


class RegionalAnalyzer:
    """
    Analyzes regional competition and opportunities.
    
    Combines YouTube language data with Twitch stream languages
    to identify underserved markets.
    """
    
    def __init__(self):
        self._redis = None
    
    async def _get_redis(self):
        if self._redis is None:
            import redis.asyncio as redis
            import os
            redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
            self._redis = redis.from_url(redis_url, decode_responses=True)
        return self._redis
    
    async def analyze_category(
        self,
        category_key: str,
        twitch_game_id: Optional[str] = None,
    ) -> Optional[RegionalAnalysis]:
        """Analyze regional patterns for a category."""
        redis_client = await self._get_redis()
        
        # Load YouTube data
        youtube_key = f"youtube:games:{category_key}"
        youtube_data = await redis_client.get(youtube_key)
        
        youtube_videos = []
        game_name = category_key.replace("_", " ").title()
        
        if youtube_data:
            try:
                data = json.loads(youtube_data)
                youtube_videos = data.get("videos", [])
                game_name = data.get("game_display_name", game_name)
            except json.JSONDecodeError:
                pass
        
        # Load Twitch data
        twitch_streams = []
        if twitch_game_id:
            twitch_key = f"twitch:streams:{twitch_game_id}"
            twitch_data = await redis_client.get(twitch_key)
            
            if twitch_data:
                try:
                    data = json.loads(twitch_data)
                    twitch_streams = data.get("streams", [])
                except json.JSONDecodeError:
                    pass
        
        if not youtube_videos and not twitch_streams:
            return None
        
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
        
        return RegionalAnalysis(
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
    
    def _analyze_languages(
        self,
        youtube_videos: List[Dict],
        twitch_streams: List[Dict],
    ) -> List[LanguageMetrics]:
        """Analyze metrics by language."""
        # YouTube by language
        yt_by_lang = {}
        for video in youtube_videos:
            lang = video.get("default_audio_language", "en")
            if lang:
                lang = lang[:2].lower()  # Normalize to 2-char code
                if lang not in yt_by_lang:
                    yt_by_lang[lang] = {"videos": [], "views": []}
                yt_by_lang[lang]["videos"].append(video)
                yt_by_lang[lang]["views"].append(video.get("view_count", 0))
        
        # Twitch by language
        tw_by_lang = {}
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
            # Based on content supply relative to demand
            competition = self._calculate_competition(
                yt_video_count, yt_avg_views, tw_stream_count, tw_avg_viewers
            )
            
            # Calculate opportunity score (higher = better)
            opportunity = 100 - competition
            
            # Market share
            market_share = 0
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
        
        return metrics[:10]  # Top 10 languages
    
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
        # Normalize factors
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
        high_demand = [lm for lm in metrics if lm.youtube_avg_views > 30000 and lm.competition_score < 50]
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
    global _regional_analyzer
    if _regional_analyzer is None:
        _regional_analyzer = RegionalAnalyzer()
    return _regional_analyzer
```


### 4.6 LiveStreamAnalyzer

**File:** `backend/services/intel/live_stream_analyzer.py`

**Purpose:** Analyze premiere timing, scheduling, and live stream patterns

```python
"""
Live Stream Analyzer

Analyzes live streaming patterns using liveStreamingDetails:
- Premiere vs instant upload performance
- Optimal premiere scheduling times
- Stream duration vs edited video length
- Schedule adherence correlation

Data Source: YouTube videos with liveStreamingDetails
"""

from dataclasses import dataclass, asdict
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from collections import Counter
import json
import logging

logger = logging.getLogger(__name__)


@dataclass
class PremiereAnalysis:
    """Analysis of premiere vs instant upload performance."""
    premiere_count: int
    instant_count: int
    premiere_avg_views: float
    instant_avg_views: float
    performance_ratio: float  # premiere / instant
    recommendation: str


@dataclass
class ScheduleTimeSlot:
    """Performance metrics for a time slot."""
    hour_utc: int
    day_of_week: str  # "monday", "tuesday", etc.
    premiere_count: int
    avg_views: float
    performance_index: float


@dataclass
class DurationComparison:
    """Comparison of stream duration vs edited video length."""
    avg_stream_duration_minutes: float
    avg_video_duration_minutes: float
    trim_ratio: float  # video / stream (how much is kept)
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
    avg_delay_seconds: float  # How late premieres start on average
    on_time_percent: float  # % starting within 5 min of scheduled
    
    # Insights
    insights: List[str]
    
    # Metadata
    video_count: int
    live_video_count: int
    confidence: int
    analyzed_at: datetime
    
    def to_dict(self) -> Dict:
        result = asdict(self)
        result["analyzed_at"] = self.analyzed_at.isoformat()
        return result


class LiveStreamAnalyzer:
    """
    Analyzes live stream and premiere patterns.
    
    Key insights:
    - "Premieres get 2.3x more first-hour views than instant uploads"
    - "Best premiere time: Tuesday 3PM EST"
    - "Top creators trim streams to 40% of original length"
    """
    
    DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    
    def __init__(self):
        self._redis = None
    
    async def _get_redis(self):
        if self._redis is None:
            import redis.asyncio as redis
            import os
            redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
            self._redis = redis.from_url(redis_url, decode_responses=True)
        return self._redis
    
    async def analyze_category(self, category_key: str) -> Optional[LiveStreamAnalysis]:
        """Analyze live stream patterns for a category."""
        redis_client = await self._get_redis()
        
        youtube_key = f"youtube:games:{category_key}"
        youtube_data = await redis_client.get(youtube_key)
        
        if not youtube_data:
            return None
        
        try:
            data = json.loads(youtube_data)
        except json.JSONDecodeError:
            return None
        
        videos = data.get("videos", [])
        game_name = data.get("game_display_name", category_key.replace("_", " ").title())
        
        # Filter to videos with live streaming data
        live_videos = [v for v in videos if v.get("was_live_stream") or v.get("is_premiere")]
        
        if len(videos) < 10:
            return None
        
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
        
        return LiveStreamAnalysis(
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
    
    def _analyze_premieres(self, videos: List[Dict]) -> PremiereAnalysis:
        """Compare premiere vs instant upload performance."""
        premieres = [v for v in videos if v.get("is_premiere") or v.get("scheduled_start_time")]
        instant = [v for v in videos if not (v.get("is_premiere") or v.get("scheduled_start_time"))]
        
        premiere_views = [v.get("view_count", 0) for v in premieres]
        instant_views = [v.get("view_count", 0) for v in instant]
        
        premiere_avg = sum(premiere_views) / len(premiere_views) if premiere_views else 0
        instant_avg = sum(instant_views) / len(instant_views) if instant_views else 0
        
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
    ) -> tuple[List[ScheduleTimeSlot], List[ScheduleTimeSlot]]:
        """Analyze best and worst premiere times."""
        # Group by hour and day
        time_slots = {}  # (hour, day) -> [views]
        
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
                day = self.DAYS_OF_WEEK[dt.weekday()]
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
        # Group by ratio buckets and find best performing
        buckets = {}
        for c in comparisons:
            bucket = round(c["ratio"] * 10) / 10  # Round to 0.1
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
    
    def _analyze_adherence(self, live_videos: List[Dict]) -> tuple[float, float]:
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
    global _live_stream_analyzer
    if _live_stream_analyzer is None:
        _live_stream_analyzer = LiveStreamAnalyzer()
    return _live_stream_analyzer
```

---

## 5. WORKER ORCHESTRATION

### 5.1 Enhanced Creator Intel Worker

**File:** `backend/workers/creator_intel_worker.py` (Enhanced)

The existing worker will be enhanced to run all 6 new analyzers:

```python
# Add to existing creator_intel_worker.py

# New Redis keys for expanded intel
INTEL_FORMAT_KEY = "intel:format:precomputed:{game}"
INTEL_DESCRIPTION_KEY = "intel:description:precomputed:{game}"
INTEL_SEMANTIC_KEY = "intel:semantic:precomputed:{game}"
INTEL_REGIONAL_KEY = "intel:regional:precomputed:{game}"
INTEL_LIVESTREAM_KEY = "intel:livestream:precomputed:{game}"


async def analyze_content_format(game_key: str) -> Optional[Dict[str, Any]]:
    """Run content format analysis for a game."""
    try:
        from backend.services.intel.content_format_analyzer import get_content_format_analyzer
        
        analyzer = get_content_format_analyzer()
        analysis = await analyzer.analyze_category(game_key)
        
        if not analysis:
            return None
        
        return analysis.to_dict()
    except Exception as e:
        logger.error(f"Content format analysis failed for {game_key}: {e}")
        return None


async def analyze_description(game_key: str) -> Optional[Dict[str, Any]]:
    """Run description analysis for a game."""
    try:
        from backend.services.intel.description_analyzer import get_description_analyzer
        
        analyzer = get_description_analyzer()
        analysis = await analyzer.analyze_category(game_key)
        
        if not analysis:
            return None
        
        return analysis.to_dict()
    except Exception as e:
        logger.error(f"Description analysis failed for {game_key}: {e}")
        return None


async def analyze_semantic(game_key: str) -> Optional[Dict[str, Any]]:
    """Run semantic analysis for a game."""
    try:
        from backend.services.intel.semantic_analyzer import get_semantic_analyzer
        
        analyzer = get_semantic_analyzer()
        analysis = await analyzer.analyze_category(game_key)
        
        if not analysis:
            return None
        
        return analysis.to_dict()
    except Exception as e:
        logger.error(f"Semantic analysis failed for {game_key}: {e}")
        return None


async def analyze_regional(game_key: str, twitch_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Run regional analysis for a game."""
    try:
        from backend.services.intel.regional_analyzer import get_regional_analyzer
        
        analyzer = get_regional_analyzer()
        analysis = await analyzer.analyze_category(game_key, twitch_id)
        
        if not analysis:
            return None
        
        return analysis.to_dict()
    except Exception as e:
        logger.error(f"Regional analysis failed for {game_key}: {e}")
        return None


async def analyze_livestream(game_key: str) -> Optional[Dict[str, Any]]:
    """Run live stream analysis for a game."""
    try:
        from backend.services.intel.live_stream_analyzer import get_live_stream_analyzer
        
        analyzer = get_live_stream_analyzer()
        analysis = await analyzer.analyze_category(game_key)
        
        if not analysis:
            return None
        
        return analysis.to_dict()
    except Exception as e:
        logger.error(f"Live stream analysis failed for {game_key}: {e}")
        return None


# Update run_intel_generation to include new analyzers
async def run_intel_generation(force: bool = False) -> Dict[str, Any]:
    """Execute a full intel generation cycle for all games."""
    # ... existing code ...
    
    for game in TRACKED_GAMES:
        game_key = game["key"]
        twitch_id = game.get("twitch_id")
        
        # Existing analyses
        title_intel = await analyze_title_intel(game_key)
        video_ideas = await analyze_video_ideas(game_key)
        viral_analysis = await analyze_viral(game_key)
        
        # NEW: Expanded analyses
        format_analysis = await analyze_content_format(game_key)
        description_analysis = await analyze_description(game_key)
        semantic_analysis = await analyze_semantic(game_key)
        regional_analysis = await analyze_regional(game_key, twitch_id)
        livestream_analysis = await analyze_livestream(game_key)
        
        # Store all results
        await store_intel_results(
            redis_client, game_key,
            title_intel, video_ideas, viral_analysis,
            format_analysis, description_analysis, semantic_analysis,
            regional_analysis, livestream_analysis,
        )
```


### 5.2 Worker Schedule Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WORKER SCHEDULE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EVERY 30 MINUTES                                                           │
│  └── twitch_streams_worker.py                                               │
│      └── Fetches live streams for all tracked games                         │
│      └── Updates: twitch:streams:{game_id}                                  │
│                                                                             │
│  EVERY 4 HOURS                                                              │
│  └── youtube_worker.py                                                      │
│      └── Fetches trending videos for all tracked games                      │
│      └── Updates: youtube:games:{game}                                      │
│                                                                             │
│  └── creator_intel_worker.py (ENHANCED)                                     │
│      └── Runs ALL analyzers:                                                │
│          ├── title_intel (existing)                                         │
│          ├── video_ideas (existing)                                         │
│          ├── viral_detector (existing)                                      │
│          ├── content_format_analyzer (NEW)                                  │
│          ├── description_analyzer (NEW)                                     │
│          ├── semantic_analyzer (NEW)                                        │
│          ├── regional_analyzer (NEW)                                        │
│          └── live_stream_analyzer (NEW)                                     │
│      └── Updates: intel:*:precomputed:{game}                                │
│                                                                             │
│  EVERY 6 HOURS                                                              │
│  └── twitch_vods_worker.py (NEW)                                            │
│      └── Fetches VODs for top streamers per game                            │
│      └── Updates: twitch:vods:{game_id}                                     │
│                                                                             │
│  EVERY 24 HOURS (6 AM UTC)                                                  │
│  └── intel_snapshot_worker.py (NEW)                                         │
│      └── Snapshots daily aggregates to PostgreSQL                           │
│      └── Updates: intel_snapshots, intel_duration_stats tables              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. DATA DECAY & FRESHNESS

### 6.1 Decay System Architecture

```python
"""
Data Decay System

Manages data freshness and confidence scoring across all intel.
Older data = lower confidence = less weight in recommendations.

File: backend/services/intel/decay/decay_manager.py
"""

from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


@dataclass
class DecayConfig:
    """Configuration for decay calculation."""
    # Time thresholds (in hours)
    fresh_threshold: float = 1.0      # < 1 hour = 100% confidence
    recent_threshold: float = 4.0     # < 4 hours = 80% confidence
    stale_threshold: float = 12.0     # < 12 hours = 50% confidence
    old_threshold: float = 24.0       # < 24 hours = 30% confidence
    expired_threshold: float = 48.0   # > 48 hours = 10% confidence
    
    # Confidence levels
    fresh_confidence: int = 100
    recent_confidence: int = 80
    stale_confidence: int = 50
    old_confidence: int = 30
    expired_confidence: int = 10


class DecayManager:
    """
    Manages data freshness and confidence decay.
    
    Usage:
        decay = DecayManager()
        confidence = decay.calculate_confidence(fetched_at)
        
        # Apply decay to a score
        adjusted_score = decay.apply_decay(raw_score, fetched_at)
    """
    
    def __init__(self, config: Optional[DecayConfig] = None):
        self.config = config or DecayConfig()
    
    def calculate_confidence(self, fetched_at: Optional[datetime]) -> int:
        """
        Calculate confidence score based on data age.
        
        Args:
            fetched_at: When the data was fetched
            
        Returns:
            Confidence score 0-100
        """
        if not fetched_at:
            return self.config.expired_confidence
        
        now = datetime.now(timezone.utc)
        
        # Ensure fetched_at is timezone-aware
        if fetched_at.tzinfo is None:
            fetched_at = fetched_at.replace(tzinfo=timezone.utc)
        
        age_hours = (now - fetched_at).total_seconds() / 3600
        
        if age_hours < self.config.fresh_threshold:
            return self.config.fresh_confidence
        elif age_hours < self.config.recent_threshold:
            return self.config.recent_confidence
        elif age_hours < self.config.stale_threshold:
            return self.config.stale_confidence
        elif age_hours < self.config.old_threshold:
            return self.config.old_confidence
        else:
            return self.config.expired_confidence
    
    def apply_decay(
        self,
        raw_score: float,
        fetched_at: Optional[datetime],
        min_score: float = 0.0,
    ) -> float:
        """
        Apply decay to a raw score based on data age.
        
        Args:
            raw_score: The original score
            fetched_at: When the underlying data was fetched
            min_score: Minimum score to return
            
        Returns:
            Decayed score
        """
        confidence = self.calculate_confidence(fetched_at)
        decay_factor = confidence / 100.0
        
        decayed = raw_score * decay_factor
        return max(min_score, decayed)
    
    def get_freshness_label(self, fetched_at: Optional[datetime]) -> str:
        """Get human-readable freshness label."""
        confidence = self.calculate_confidence(fetched_at)
        
        if confidence >= 100:
            return "Fresh"
        elif confidence >= 80:
            return "Recent"
        elif confidence >= 50:
            return "Stale"
        elif confidence >= 30:
            return "Old"
        else:
            return "Expired"
    
    def should_refresh(self, fetched_at: Optional[datetime]) -> bool:
        """Check if data should be refreshed."""
        confidence = self.calculate_confidence(fetched_at)
        return confidence < self.config.recent_confidence


# Singleton
_decay_manager: Optional[DecayManager] = None


def get_decay_manager() -> DecayManager:
    global _decay_manager
    if _decay_manager is None:
        _decay_manager = DecayManager()
    return _decay_manager
```

### 6.2 Confidence Display in Frontend

```typescript
// tsx/packages/api-client/src/types/intel.ts

export interface IntelConfidence {
  score: number;           // 0-100
  label: 'Fresh' | 'Recent' | 'Stale' | 'Old' | 'Expired';
  fetchedAt: string;       // ISO timestamp
  hoursOld: number;
}

export interface IntelResponse<T> {
  data: T;
  confidence: IntelConfidence;
  shouldRefresh: boolean;
}
```

---

## 7. DATABASE SCHEMA

### 7.1 New PostgreSQL Tables

```sql
-- Migration: 060_intel_expansion_tables.sql

-- Daily snapshots of intel metrics
CREATE TABLE IF NOT EXISTS intel_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_key TEXT NOT NULL,
    snapshot_date DATE NOT NULL,
    
    -- Viral metrics
    viral_video_count INTEGER DEFAULT 0,
    rising_video_count INTEGER DEFAULT 0,
    avg_velocity FLOAT DEFAULT 0,
    opportunity_score FLOAT DEFAULT 0,
    
    -- Format metrics
    optimal_duration_min INTEGER,
    optimal_duration_max INTEGER,
    shorts_performance_ratio FLOAT,
    
    -- Regional metrics
    dominant_language TEXT,
    language_distribution JSONB,
    
    -- Metadata
    video_count INTEGER DEFAULT 0,
    confidence INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(category_key, snapshot_date)
);

-- Duration performance by category
CREATE TABLE IF NOT EXISTS intel_duration_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_key TEXT NOT NULL,
    snapshot_date DATE NOT NULL,
    
    -- Duration buckets
    bucket_label TEXT NOT NULL,  -- "0-60s", "1-5min", etc.
    bucket_min_seconds INTEGER NOT NULL,
    bucket_max_seconds INTEGER NOT NULL,
    
    -- Metrics
    video_count INTEGER DEFAULT 0,
    avg_views FLOAT DEFAULT 0,
    avg_engagement FLOAT DEFAULT 0,
    performance_index FLOAT DEFAULT 1.0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(category_key, snapshot_date, bucket_label)
);

-- Regional competition by category
CREATE TABLE IF NOT EXISTS intel_regional_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_key TEXT NOT NULL,
    snapshot_date DATE NOT NULL,
    language_code TEXT NOT NULL,
    
    -- YouTube metrics
    youtube_video_count INTEGER DEFAULT 0,
    youtube_avg_views FLOAT DEFAULT 0,
    
    -- Twitch metrics
    twitch_stream_count INTEGER DEFAULT 0,
    twitch_avg_viewers FLOAT DEFAULT 0,
    
    -- Derived
    competition_score FLOAT DEFAULT 50,
    opportunity_score FLOAT DEFAULT 50,
    market_share_percent FLOAT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(category_key, snapshot_date, language_code)
);

-- Premiere timing stats
CREATE TABLE IF NOT EXISTS intel_premiere_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_key TEXT NOT NULL,
    snapshot_date DATE NOT NULL,
    
    -- Premiere vs instant
    premiere_count INTEGER DEFAULT 0,
    instant_count INTEGER DEFAULT 0,
    premiere_avg_views FLOAT DEFAULT 0,
    instant_avg_views FLOAT DEFAULT 0,
    performance_ratio FLOAT DEFAULT 1.0,
    
    -- Best times (JSONB array)
    best_times JSONB,  -- [{hour_utc, day_of_week, performance_index}]
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(category_key, snapshot_date)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_intel_snapshots_category_date 
    ON intel_snapshots(category_key, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_intel_duration_category_date 
    ON intel_duration_stats(category_key, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_intel_regional_category_date 
    ON intel_regional_stats(category_key, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_intel_premiere_category_date 
    ON intel_premiere_stats(category_key, snapshot_date DESC);
```

---

## 8. FRONTEND EXPERIENCE

### 8.1 Intel Dashboard Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CREATOR INTEL DASHBOARD                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  DAILY INSIGHT                                              [Fresh] │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │   │
│  │  "Fortnite 'zero build' videos getting 3.2x more views"             │   │
│  │                                                                      │   │
│  │  📊 Based on 47 videos analyzed in last 4 hours                     │   │
│  │  🎯 Action: Create zero build content TODAY                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────┐   │
│  │  OPTIMAL DURATION    │  │  FORMAT PERFORMANCE  │  │  REGIONAL       │   │
│  │  ━━━━━━━━━━━━━━━━━━  │  │  ━━━━━━━━━━━━━━━━━━  │  │  ━━━━━━━━━━━━━  │   │
│  │                      │  │                      │  │                 │   │
│  │  🎯 10-15 minutes    │  │  Shorts: 1.2x        │  │  🇺🇸 EN: 65%    │   │
│  │     (2.1x avg views) │  │  Long-form: 1.0x     │  │  🇪🇸 ES: 20%    │   │
│  │                      │  │  Live VOD: 0.8x      │  │  🇧🇷 PT: 10%    │   │
│  │  ▓▓▓▓▓▓▓▓░░░░░░░░   │  │                      │  │                 │   │
│  │  0   10   20   30min │  │  [View Details]      │  │  [Opportunities]│   │
│  └──────────────────────┘  └──────────────────────┘  └─────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TRENDING HASHTAGS & TOPICS                                         │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │   │
│  │                                                                      │   │
│  │  #fortnite (89%)  #gaming (67%)  #zerobuild (45%)  #chapter5 (34%) │   │
│  │                                                                      │   │
│  │  Topics: Video game (2.1x) • Esports (1.8x) • Battle royale (1.5x) │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PREMIERE TIMING                                                    │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │   │
│  │                                                                      │   │
│  │  Best: Tuesday 3PM EST (1.8x)  |  Worst: Monday 6AM EST (0.4x)     │   │
│  │                                                                      │   │
│  │  Premieres vs Instant: 1.3x better performance                      │   │
│  │  Recommendation: Use premieres for major content releases           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```


### 8.2 API Endpoints for Frontend

```python
# backend/api/routes/intel.py (Enhanced)

@router.get("/intel/{category_key}/format")
async def get_format_intel(
    category_key: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> ContentFormatResponse:
    """Get content format analysis for a category."""
    redis_client = await get_redis_client()
    
    cache_key = f"intel:format:precomputed:{category_key}"
    cached = await redis_client.get(cache_key)
    
    if cached:
        data = json.loads(cached)
        return ContentFormatResponse(**data)
    
    # Generate on-demand if not cached
    analyzer = get_content_format_analyzer()
    analysis = await analyzer.analyze_category(category_key)
    
    if not analysis:
        raise HTTPException(404, "No format data available")
    
    return ContentFormatResponse(**analysis.to_dict())


@router.get("/intel/{category_key}/description")
async def get_description_intel(
    category_key: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> DescriptionAnalysisResponse:
    """Get description analysis for a category."""
    # Similar pattern...


@router.get("/intel/{category_key}/semantic")
async def get_semantic_intel(
    category_key: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> SemanticAnalysisResponse:
    """Get semantic analysis for a category."""
    # Similar pattern...


@router.get("/intel/{category_key}/regional")
async def get_regional_intel(
    category_key: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> RegionalAnalysisResponse:
    """Get regional analysis for a category."""
    # Similar pattern...


@router.get("/intel/{category_key}/livestream")
async def get_livestream_intel(
    category_key: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> LiveStreamAnalysisResponse:
    """Get live stream analysis for a category."""
    # Similar pattern...


@router.get("/intel/{category_key}/combined")
async def get_combined_intel(
    category_key: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> CombinedIntelResponse:
    """Get all intel for a category in one request."""
    redis_client = await get_redis_client()
    
    # Fetch all cached intel
    keys = [
        f"intel:title:precomputed:{category_key}",
        f"intel:viral:precomputed:{category_key}",
        f"intel:format:precomputed:{category_key}",
        f"intel:description:precomputed:{category_key}",
        f"intel:semantic:precomputed:{category_key}",
        f"intel:regional:precomputed:{category_key}",
        f"intel:livestream:precomputed:{category_key}",
    ]
    
    results = await redis_client.mget(keys)
    
    return CombinedIntelResponse(
        title_intel=json.loads(results[0]) if results[0] else None,
        viral_intel=json.loads(results[1]) if results[1] else None,
        format_intel=json.loads(results[2]) if results[2] else None,
        description_intel=json.loads(results[3]) if results[3] else None,
        semantic_intel=json.loads(results[4]) if results[4] else None,
        regional_intel=json.loads(results[5]) if results[5] else None,
        livestream_intel=json.loads(results[6]) if results[6] else None,
    )
```

### 8.3 Frontend Types

```typescript
// tsx/packages/api-client/src/types/intel.ts

// Content Format Types
export interface DurationBucket {
  minSeconds: number;
  maxSeconds: number;
  label: string;
  videoCount: number;
  avgViews: number;
  avgEngagement: number;
  totalViews: number;
  performanceIndex: number;
}

export interface FormatComparison {
  formatA: string;
  formatB: string;
  formatACount: number;
  formatBCount: number;
  formatAAvgViews: number;
  formatBAvgViews: number;
  performanceRatio: number;
  recommendation: string;
  confidence: number;
}

export interface ContentFormatAnalysis {
  categoryKey: string;
  categoryName: string;
  durationBuckets: DurationBucket[];
  optimalDurationRange: string;
  optimalDurationMinSeconds: number;
  optimalDurationMaxSeconds: number;
  shortsVsLongform: FormatComparison;
  liveVsVod: FormatComparison;
  hdVsSd: FormatComparison;
  insights: string[];
  videoCount: number;
  confidence: number;
  analyzedAt: string;
}

// Description Analysis Types
export interface HashtagAnalysis {
  hashtag: string;
  frequency: number;
  avgViews: number;
  appearsInTitle: boolean;
  isTrending: boolean;
}

export interface DescriptionAnalysis {
  categoryKey: string;
  categoryName: string;
  topHashtags: HashtagAnalysis[];
  hashtagCountAvg: number;
  hasTimestampsPercent: number;
  hasSponsorPercent: number;
  hasSocialLinksPercent: number;
  commonPlatforms: string[];
  insights: string[];
  videoCount: number;
  confidence: number;
  analyzedAt: string;
}

// Semantic Analysis Types
export interface TopicCluster {
  primaryTopic: string;
  relatedTopics: string[];
  videoCount: number;
  avgViews: number;
  performanceIndex: number;
}

export interface TagCluster {
  anchorTag: string;
  coOccurringTags: string[];
  frequency: number;
  avgViews: number;
}

export interface SemanticAnalysis {
  categoryKey: string;
  categoryName: string;
  topTopics: string[];
  topicClusters: TopicCluster[];
  topicViewCorrelation: Record<string, number>;
  topTagsFull: string[];
  tagClusters: TagCluster[];
  optimalTagCount: number;
  insights: string[];
  videoCount: number;
  confidence: number;
  analyzedAt: string;
}

// Regional Analysis Types
export interface LanguageMetrics {
  languageCode: string;
  languageName: string;
  youtubeVideoCount: number;
  youtubeAvgViews: number;
  youtubeTotalViews: number;
  twitchStreamCount: number;
  twitchAvgViewers: number;
  twitchTotalViewers: number;
  competitionScore: number;
  opportunityScore: number;
  marketSharePercent: number;
}

export interface RegionalAnalysis {
  categoryKey: string;
  categoryName: string;
  languages: LanguageMetrics[];
  dominantLanguage: string;
  underservedLanguages: string[];
  bestOpportunityLanguage: string;
  opportunityReason: string;
  insights: string[];
  youtubeVideoCount: number;
  twitchStreamCount: number;
  confidence: number;
  analyzedAt: string;
}

// Live Stream Analysis Types
export interface PremiereAnalysis {
  premiereCount: number;
  instantCount: number;
  premiereAvgViews: number;
  instantAvgViews: number;
  performanceRatio: number;
  recommendation: string;
}

export interface ScheduleTimeSlot {
  hourUtc: number;
  dayOfWeek: string;
  premiereCount: number;
  avgViews: number;
  performanceIndex: number;
}

export interface LiveStreamAnalysis {
  categoryKey: string;
  categoryName: string;
  premiereAnalysis: PremiereAnalysis;
  bestPremiereTimes: ScheduleTimeSlot[];
  worstPremiereTimes: ScheduleTimeSlot[];
  avgDelaySeconds: number;
  onTimePercent: number;
  insights: string[];
  videoCount: number;
  liveVideoCount: number;
  confidence: number;
  analyzedAt: string;
}

// Combined Response
export interface CombinedIntelResponse {
  titleIntel: TitleIntelResponse | null;
  viralIntel: ViralAnalysisResponse | null;
  formatIntel: ContentFormatAnalysis | null;
  descriptionIntel: DescriptionAnalysis | null;
  semanticIntel: SemanticAnalysis | null;
  regionalIntel: RegionalAnalysis | null;
  livestreamIntel: LiveStreamAnalysis | null;
}
```

---

## 9. IMPLEMENTATION PHASES

### Phase 1: API Expansion (Week 1)
**Goal:** Fetch all available data from YouTube and Twitch APIs

| Task | File | Effort | Priority |
|------|------|--------|----------|
| Add liveStreamingDetails to YouTube API request | `youtube_collector.py` | 2h | P0 |
| Parse new YouTube fields | `youtube_collector.py` | 4h | P0 |
| Add /videos endpoint to Twitch | `twitch_collector.py` | 4h | P1 |
| Add /channels endpoint to Twitch | `twitch_collector.py` | 2h | P1 |
| Update Redis cache schemas | Various | 2h | P0 |

**Deliverable:** All 36 fields being fetched and cached

### Phase 2: Core Analyzers (Week 2)
**Goal:** Implement highest-value analyzers

| Task | File | Effort | Priority |
|------|------|--------|----------|
| ContentFormatAnalyzer | `content_format_analyzer.py` | 6h | P0 |
| DescriptionAnalyzer | `description_analyzer.py` | 4h | P0 |
| SemanticAnalyzer | `semantic_analyzer.py` | 4h | P1 |

**Deliverable:** Duration, shorts, hashtag, and topic insights working

### Phase 3: Extended Analyzers (Week 3)
**Goal:** Complete analyzer coverage

| Task | File | Effort | Priority |
|------|------|--------|----------|
| RegionalAnalyzer | `regional_analyzer.py` | 4h | P1 |
| LiveStreamAnalyzer | `live_stream_analyzer.py` | 6h | P1 |
| ChannelAnalyzer | `channel_analyzer.py` | 4h | P2 |

**Deliverable:** All 6 analyzers operational

### Phase 4: Worker Integration (Week 4)
**Goal:** Automate data processing

| Task | File | Effort | Priority |
|------|------|--------|----------|
| Enhance creator_intel_worker | `creator_intel_worker.py` | 4h | P0 |
| Create twitch_vods_worker | `twitch_vods_worker.py` | 4h | P1 |
| Create intel_snapshot_worker | `intel_snapshot_worker.py` | 4h | P2 |
| Implement decay system | `decay_manager.py` | 2h | P1 |

**Deliverable:** Automated 4-hour refresh cycle

### Phase 5: Database & API (Week 5)
**Goal:** Persist historical data and expose via API

| Task | File | Effort | Priority |
|------|------|--------|----------|
| Create PostgreSQL tables | `060_intel_expansion.sql` | 2h | P1 |
| Add API endpoints | `intel.py` | 4h | P0 |
| Add Pydantic schemas | `intel_schemas.py` | 2h | P0 |

**Deliverable:** Full API coverage for all intel types

### Phase 6: Frontend (Week 6)
**Goal:** Display insights to users

| Task | File | Effort | Priority |
|------|------|--------|----------|
| Add TypeScript types | `intel.ts` | 2h | P0 |
| Create Intel Dashboard | `IntelDashboard.tsx` | 8h | P0 |
| Add duration chart | `DurationChart.tsx` | 4h | P1 |
| Add regional map | `RegionalMap.tsx` | 4h | P2 |

**Deliverable:** Complete Creator Intel dashboard

---

## 10. TESTING STRATEGY

### 10.1 Unit Tests

```python
# backend/tests/unit/test_content_format_analyzer.py

import pytest
from datetime import datetime, timezone
from backend.services.intel.content_format_analyzer import ContentFormatAnalyzer


class TestContentFormatAnalyzer:
    """Unit tests for ContentFormatAnalyzer."""
    
    @pytest.fixture
    def analyzer(self):
        return ContentFormatAnalyzer()
    
    @pytest.fixture
    def sample_videos(self):
        return [
            {
                "video_id": "1",
                "duration_seconds": 120,
                "is_short": False,
                "view_count": 10000,
                "engagement_rate": 5.0,
                "definition": "hd",
                "was_live_stream": False,
            },
            {
                "video_id": "2",
                "duration_seconds": 45,
                "is_short": True,
                "view_count": 50000,
                "engagement_rate": 8.0,
                "definition": "hd",
                "was_live_stream": False,
            },
            # ... more test videos
        ]
    
    def test_analyze_duration_buckets(self, analyzer, sample_videos):
        """Test duration bucket analysis."""
        buckets = analyzer._analyze_duration_buckets(sample_videos)
        
        assert len(buckets) > 0
        assert all(b.video_count > 0 for b in buckets)
        assert all(b.performance_index > 0 for b in buckets)
    
    def test_compare_shorts_vs_longform(self, analyzer, sample_videos):
        """Test shorts vs long-form comparison."""
        comparison = analyzer._compare_shorts_vs_longform(sample_videos)
        
        assert comparison.format_a == "Shorts"
        assert comparison.format_b == "Long-form"
        assert comparison.performance_ratio > 0
        assert comparison.confidence > 0
    
    def test_find_optimal_duration(self, analyzer, sample_videos):
        """Test optimal duration finding."""
        buckets = analyzer._analyze_duration_buckets(sample_videos)
        optimal = analyzer._find_optimal_duration(buckets)
        
        assert optimal is not None
        assert optimal.performance_index >= 1.0
```

### 10.2 Integration Tests

```python
# backend/tests/integration/test_intel_pipeline.py

import pytest
from backend.workers.creator_intel_worker import run_intel_generation


class TestIntelPipeline:
    """Integration tests for the complete intel pipeline."""
    
    @pytest.mark.asyncio
    async def test_full_intel_generation(self, redis_client, mock_youtube_data):
        """Test complete intel generation for a category."""
        # Setup mock data
        await redis_client.set(
            "youtube:games:fortnite",
            json.dumps(mock_youtube_data)
        )
        
        # Run generation
        result = await run_intel_generation(force=True)
        
        # Verify all analyzers ran
        assert result["games_processed"] > 0
        assert "fortnite" in result["details"]
        
        # Verify cache populated
        format_data = await redis_client.get("intel:format:precomputed:fortnite")
        assert format_data is not None
```

---

## SUMMARY

This master schema defines the complete implementation plan for expanding Creator Intel from 33% to 100% field coverage:

| Component | Count | Status |
|-----------|-------|--------|
| API Expansions | 2 | 🔲 TODO |
| New Analyzers | 6 | 🔲 TODO |
| Enhanced Workers | 3 | 🔲 TODO |
| Database Tables | 4 | 🔲 TODO |
| API Endpoints | 7 | 🔲 TODO |
| Frontend Components | 5 | 🔲 TODO |

**Total Estimated Effort:** 6 weeks

**Coverage After Implementation:**
- YouTube: 24/24 fields (100%)
- Twitch: 14/14 fields (100%)
- Twitch Clips: 7/7 fields (100%)
- **Total: 45/45 fields (100%)**

---

*This schema is the definitive reference for the Creator Intel expansion. All implementation should follow this document.*
