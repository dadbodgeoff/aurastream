# 🔥 TREND INTELLIGENCE MASTER SCHEMA
## AuraStream Creator Daily Brief & Viral Analytics

**Version:** 1.0.0  
**Last Updated:** December 30, 2025  
**Purpose:** Complete technical specification for trend intelligence feature

---

## TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Workers & Cron Jobs](#workers--cron-jobs)
7. [Analysis Services](#analysis-services)
8. [Frontend Components](#frontend-components)
9. [Implementation Phases](#implementation-phases)
10. [API Cost Budget](#api-cost-budget)

---

## SYSTEM OVERVIEW

### What It Does
Aggregates trending content from YouTube and Twitch, analyzes patterns using AI,
and delivers actionable insights to creators through a "Daily Brief" dashboard.

### Key Features
- **Daily Brief**: Curated trending content with AI-generated insights
- **Real-time Twitch**: Live stream data updated every 15 minutes
- **Thumbnail Analysis**: AI-powered breakdown of viral thumbnails
- **Title Patterns**: NLP analysis of high-performing titles
- **Viral Score**: Composite metric predicting content success
- **Timing Intelligence**: Optimal posting/streaming times
- **Custom Search**: Pro users can search specific niches

### Tier Access

| Feature | Free | Pro | Studio |
|---------|------|-----|--------|
| Daily Brief | ✅ | ✅ | ✅ |
| Twitch Live (15min refresh) | ✅ | ✅ | ✅ |
| YouTube Trending | ✅ | ✅ | ✅ |
| Thumbnail Analysis | 3/day | 20/day | Unlimited |
| Custom YT Search | ❌ | 10/day | 50/day |
| Historical Trends | ❌ | 7 days | 30 days |
| "Generate Like This" | ❌ | ✅ | ✅ |
| Velocity Alerts | ❌ | ❌ | ✅ |
| Email Digest | ❌ | Weekly | Daily |

---

## ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA SOURCES                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   YouTube Data API v3              Twitch Helix API                         │
│   ├─ 10,000 units/day              ├─ Unlimited (800 req/min)               │
│   ├─ Trending videos               ├─ Top streams                           │
│   ├─ Video statistics              ├─ Top games                             │
│   ├─ Search results                ├─ Stream metadata                       │
│   └─ Channel data                  └─ Clip data                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COLLECTION LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   youtube_collector.py             twitch_collector.py                      │
│   ├─ fetch_trending()              ├─ fetch_top_streams()                   │
│   ├─ fetch_video_stats()           ├─ fetch_top_games()                     │
│   ├─ search_videos()               ├─ fetch_clips()                         │
│   └─ get_channel_info()            └─ get_stream_tags()                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ANALYSIS LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   thumbnail_analyzer.py            title_analyzer.py                        │
│   ├─ analyze_image()               ├─ extract_patterns()                    │
│   ├─ detect_faces()                ├─ word_frequency()                      │
│   ├─ extract_colors()              ├─ sentiment_analysis()                  │
│   ├─ detect_text()                 └─ title_score()                         │
│   └─ composition_score()                                                    │
│                                                                             │
│   velocity_calculator.py           timing_analyzer.py                       │
│   ├─ calculate_velocity()          ├─ best_upload_times()                   │
│   ├─ detect_spikes()               ├─ best_stream_times()                   │
│   ├─ predict_trajectory()          ├─ day_of_week_patterns()                │
│   └─ viral_score()                 └─ seasonal_trends()                     │
│                                                                             │
│   cross_platform_correlator.py                                              │
│   ├─ match_creators()                                                       │
│   ├─ correlate_games()                                                      │
│   └─ unified_trending()                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STORAGE LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   PostgreSQL (Supabase)            Redis (Hot Data)                         │
│   ├─ trend_youtube_snapshots       ├─ twitch_live_cache (15min TTL)         │
│   ├─ trend_twitch_snapshots        ├─ youtube_trending_cache (1h TTL)       │
│   ├─ trend_thumbnail_analysis      ├─ viral_alerts_queue                    │
│   ├─ trend_daily_briefs            └─ user_search_rate_limits               │
│   ├─ trend_user_searches                                                    │
│   └─ trend_velocity_alerts                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   backend/api/routes/trends.py                                              │
│   ├─ GET  /trends/daily-brief                                               │
│   ├─ GET  /trends/youtube/trending                                          │
│   ├─ GET  /trends/twitch/live                                               │
│   ├─ GET  /trends/twitch/games                                              │
│   ├─ POST /trends/youtube/search          (Pro+)                            │
│   ├─ GET  /trends/thumbnail/{id}/analysis (Pro+)                            │
│   ├─ GET  /trends/velocity/alerts         (Studio)                          │
│   └─ GET  /trends/timing/{category}       (Pro+)                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   /dashboard/trends                                                         │
│   ├─ DailyBriefHero.tsx           (Thumbnail of the day)                    │
│   ├─ TrendingTabs.tsx             (YouTube | Twitch | Rising)               │
│   ├─ TrendingGrid.tsx             (Video/stream cards)                      │
│   ├─ InsightsBanner.tsx           (AI-generated insights)                   │
│   ├─ TwitchLiveWidget.tsx         (Real-time sidebar)                       │
│   ├─ SearchPanel.tsx              (Pro search)                              │
│   └─ VelocityAlerts.tsx           (Studio alerts)                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## FILE STRUCTURE

```
backend/
├── api/
│   ├── routes/
│   │   └── trends.py                    # All trend endpoints
│   └── schemas/
│       └── trends.py                    # Pydantic schemas
│
├── services/
│   └── trends/
│       ├── __init__.py                  # Exports get_trend_service()
│       ├── trend_service.py             # Main orchestrator (singleton)
│       ├── youtube_collector.py         # YouTube API client
│       ├── twitch_collector.py          # Twitch API client
│       ├── thumbnail_analyzer.py        # Gemini Vision analysis
│       ├── title_analyzer.py            # NLP title patterns
│       ├── velocity_calculator.py       # Growth rate calculations
│       ├── timing_analyzer.py           # Optimal timing detection
│       ├── viral_score.py               # Composite scoring
│       └── cross_platform.py            # YT+Twitch correlation
│
├── workers/
│   ├── trend_youtube_daily.py           # Daily YT fetch (6 AM)
│   ├── trend_twitch_live.py             # 15-min Twitch fetch
│   ├── trend_twitch_hourly.py           # Hourly game rankings
│   ├── trend_daily_brief.py             # Generate daily brief (7 AM)
│   ├── trend_thumbnail_batch.py         # Batch thumbnail analysis
│   └── trend_velocity_alerts.py         # Spike detection
│
└── database/
    └── migrations/
        └── 042_trend_intelligence.sql   # All trend tables

tsx/
├── apps/web/src/
│   ├── app/dashboard/trends/
│   │   └── page.tsx                     # Main trends page
│   │
│   └── components/trends/
│       ├── DailyBriefHero.tsx
│       ├── TrendingTabs.tsx
│       ├── TrendingGrid.tsx
│       ├── TrendCard.tsx
│       ├── ThumbnailAnalysis.tsx
│       ├── InsightsBanner.tsx
│       ├── TwitchLiveWidget.tsx
│       ├── SearchPanel.tsx
│       ├── VelocityAlerts.tsx
│       ├── TimingChart.tsx
│       └── ViralScoreBadge.tsx
│
└── packages/api-client/src/
    ├── hooks/
    │   └── useTrends.ts                 # React Query hooks
    └── types/
        └── trends.ts                    # TypeScript types
```

---

## DATABASE SCHEMA

```sql
-- ============================================================================
-- Migration 042: Trend Intelligence Tables
-- ============================================================================

-- YouTube daily snapshots (fetched once per day)
CREATE TABLE trend_youtube_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL,
    category TEXT NOT NULL,  -- 'gaming', 'entertainment', 'music', 'education'
    region TEXT DEFAULT 'US',
    
    -- Raw video data
    videos JSONB NOT NULL,  -- [{videoId, title, channelTitle, thumbnail, publishedAt}]
    
    -- Computed stats
    total_views BIGINT,
    total_likes BIGINT,
    avg_engagement_rate NUMERIC(5,2),
    
    -- Analysis results
    top_words JSONB,        -- [{word, count, avgViews}]
    color_patterns JSONB,   -- [{color, frequency}]
    
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(snapshot_date, category, region)
);

-- YouTube video details (enriched data)
CREATE TABLE trend_youtube_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id TEXT NOT NULL UNIQUE,
    snapshot_id UUID REFERENCES trend_youtube_snapshots(id) ON DELETE CASCADE,
    
    -- Basic info
    title TEXT NOT NULL,
    channel_id TEXT,
    channel_title TEXT,
    category TEXT,
    published_at TIMESTAMPTZ,
    
    -- Thumbnail
    thumbnail_url TEXT,
    thumbnail_analyzed BOOLEAN DEFAULT FALSE,
    
    -- Stats (at time of fetch)
    view_count BIGINT,
    like_count BIGINT,
    comment_count BIGINT,
    
    -- Computed metrics
    engagement_rate NUMERIC(5,2),  -- (likes + comments) / views * 100
    viral_score INTEGER,           -- 0-100 composite score
    velocity_score NUMERIC(8,2),   -- views per hour since publish
    
    -- Analysis results
    title_analysis JSONB,          -- {wordCount, hasNumber, hasEmoji, sentiment}
    thumbnail_analysis JSONB,      -- {hasFace, faceCount, dominantColors, hasText, composition}
    
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Twitch live snapshots (every 15 minutes)
CREATE TABLE trend_twitch_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Top streams at this moment
    top_streams JSONB NOT NULL,  -- [{userId, userName, gameId, gameName, viewerCount, thumbnail, title}]
    
    -- Top games at this moment
    top_games JSONB NOT NULL,    -- [{gameId, name, viewerCount, streamCount}]
    
    -- Aggregate stats
    total_viewers BIGINT,
    total_streams INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Twitch hourly rollups (for trend detection)
CREATE TABLE trend_twitch_hourly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hour_start TIMESTAMPTZ NOT NULL,
    
    -- Game rankings with change
    game_rankings JSONB NOT NULL,  -- [{gameId, name, viewers, streams, rank, prevRank, change}]
    
    -- Rising streamers (biggest viewer gains)
    rising_streamers JSONB,        -- [{userId, userName, game, viewerGain, currentViewers}]
    
    -- Peak stats for the hour
    peak_total_viewers BIGINT,
    peak_stream_count INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(hour_start)
);

-- Thumbnail analysis cache
CREATE TABLE trend_thumbnail_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Source reference
    source_type TEXT NOT NULL,     -- 'youtube', 'twitch'
    source_id TEXT NOT NULL,       -- videoId or streamId
    thumbnail_url TEXT NOT NULL,
    
    -- AI Analysis results (from Gemini Vision)
    has_face BOOLEAN,
    face_count INTEGER DEFAULT 0,
    face_emotions JSONB,           -- [{emotion, confidence}]
    
    has_text BOOLEAN,
    detected_text TEXT[],          -- Array of text found
    
    dominant_colors JSONB,         -- [{hex, percentage}]
    color_mood TEXT,               -- 'warm', 'cool', 'neutral', 'vibrant'
    
    composition TEXT,              -- 'centered', 'rule_of_thirds', 'left_heavy', 'right_heavy'
    complexity_score INTEGER,      -- 1-10 (simple to complex)
    
    -- Computed scores
    thumbnail_score INTEGER,       -- 0-100 predicted CTR score
    
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(source_type, source_id)
);

-- Daily brief (compiled insights)
CREATE TABLE trend_daily_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brief_date DATE NOT NULL UNIQUE,
    
    -- Thumbnail of the day
    thumbnail_of_day JSONB,        -- {videoId, title, thumbnail, viralScore, whyItWorks}
    
    -- Platform highlights
    youtube_highlights JSONB,      -- [{videoId, title, thumbnail, views, insight}]
    twitch_highlights JSONB,       -- [{streamerId, name, game, peakViewers, insight}]
    
    -- Cross-platform insights
    hot_games JSONB,               -- Games trending on both platforms
    rising_creators JSONB,         -- Creators gaining momentum
    
    -- AI-generated insights
    insights JSONB,                -- [{category, insight, confidence}]
    
    -- Timing recommendations
    best_upload_times JSONB,       -- {gaming: {day, hour}, entertainment: {...}}
    best_stream_times JSONB,
    
    -- Pattern analysis
    title_patterns JSONB,          -- {topWords, avgLength, emojiUsage}
    thumbnail_patterns JSONB,      -- {facePercentage, avgColors, textUsage}
    
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User search history (for Pro+ rate limiting and caching)
CREATE TABLE trend_user_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    query TEXT NOT NULL,
    category TEXT,
    
    -- Cached results
    results JSONB,
    result_count INTEGER,
    
    -- Cache control
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Velocity alerts (for Studio tier)
CREATE TABLE trend_velocity_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    alert_type TEXT NOT NULL,      -- 'game_spike', 'video_viral', 'streamer_rising'
    platform TEXT NOT NULL,        -- 'youtube', 'twitch'
    
    -- What's spiking
    subject_id TEXT NOT NULL,      -- gameId, videoId, or userId
    subject_name TEXT NOT NULL,
    subject_thumbnail TEXT,
    
    -- Velocity data
    current_value BIGINT,          -- Current viewers/views
    previous_value BIGINT,         -- Value 1 hour ago
    change_percent NUMERIC(8,2),
    velocity_score NUMERIC(8,2),   -- Rate of change
    
    -- Alert metadata
    severity TEXT,                 -- 'low', 'medium', 'high', 'critical'
    insight TEXT,                  -- AI-generated explanation
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_yt_snapshots_date ON trend_youtube_snapshots(snapshot_date);
CREATE INDEX idx_yt_snapshots_category ON trend_youtube_snapshots(category);
CREATE INDEX idx_yt_videos_video_id ON trend_youtube_videos(video_id);
CREATE INDEX idx_yt_videos_viral_score ON trend_youtube_videos(viral_score DESC);
CREATE INDEX idx_twitch_snapshots_time ON trend_twitch_snapshots(snapshot_time);
CREATE INDEX idx_twitch_hourly_hour ON trend_twitch_hourly(hour_start);
CREATE INDEX idx_thumbnail_source ON trend_thumbnail_analysis(source_type, source_id);
CREATE INDEX idx_daily_briefs_date ON trend_daily_briefs(brief_date);
CREATE INDEX idx_user_searches_user ON trend_user_searches(user_id);
CREATE INDEX idx_user_searches_expires ON trend_user_searches(expires_at);
CREATE INDEX idx_velocity_alerts_active ON trend_velocity_alerts(is_active, detected_at);
```

---

## PYDANTIC SCHEMAS

```python
# backend/api/schemas/trends.py
"""
Pydantic schemas for Trend Intelligence system.
AuraStream - Creator Daily Brief & Viral Analytics
"""

from datetime import datetime, date
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


# ============================================================================
# Enums / Literal Types
# ============================================================================

TrendCategory = Literal["gaming", "entertainment", "music", "education"]
TrendVelocity = Literal["rising", "stable", "falling"]
AlertType = Literal["game_spike", "video_viral", "streamer_rising"]
AlertSeverity = Literal["low", "medium", "high", "critical"]
ColorMood = Literal["warm", "cool", "neutral", "vibrant"]
Composition = Literal["centered", "rule_of_thirds", "left_heavy", "right_heavy"]
InsightCategory = Literal["thumbnail", "title", "timing", "game", "general"]


# ============================================================================
# YouTube Schemas
# ============================================================================

class YouTubeVideoResponse(BaseModel):
    """Response schema for a YouTube video."""
    video_id: str
    title: str
    thumbnail: str
    channel_id: Optional[str] = None
    channel_title: str
    category: Optional[str] = None
    published_at: Optional[datetime] = None
    view_count: int = 0
    like_count: int = 0
    comment_count: int = 0
    engagement_rate: Optional[float] = None
    viral_score: Optional[int] = None
    velocity: Optional[TrendVelocity] = None
    insight: Optional[str] = None


class YouTubeTrendingResponse(BaseModel):
    """Response for YouTube trending videos."""
    videos: List[YouTubeVideoResponse] = Field(default_factory=list)
    category: str
    region: str = "US"
    fetched_at: datetime


class YouTubeSearchRequest(BaseModel):
    """Request to search YouTube videos."""
    query: str = Field(..., min_length=1, max_length=200)
    category: Optional[TrendCategory] = None
    max_results: int = Field(default=20, ge=1, le=50)


class YouTubeSearchResponse(BaseModel):
    """Response for YouTube search."""
    videos: List[YouTubeVideoResponse] = Field(default_factory=list)
    query: str
    result_count: int
    rate_limit_remaining: Optional[int] = None


# ============================================================================
# Twitch Schemas
# ============================================================================

class TwitchStreamResponse(BaseModel):
    """Response schema for a Twitch stream."""
    user_id: str
    user_name: str
    game_id: str
    game_name: str
    viewer_count: int
    peak_viewers: Optional[int] = None
    thumbnail: str
    title: str
    started_at: Optional[datetime] = None
    velocity: Optional[TrendVelocity] = None
    insight: Optional[str] = None


class TwitchGameResponse(BaseModel):
    """Response schema for a Twitch game."""
    game_id: str
    name: str
    twitch_viewers: int = 0
    twitch_streams: int = 0
    youtube_videos: Optional[int] = None
    youtube_total_views: Optional[int] = None
    trend: Optional[TrendVelocity] = None
    box_art_url: Optional[str] = None


class TwitchLiveResponse(BaseModel):
    """Response for Twitch live streams."""
    streams: List[TwitchStreamResponse] = Field(default_factory=list)
    total_viewers: int = 0
    fetched_at: datetime


class TwitchGamesResponse(BaseModel):
    """Response for Twitch top games."""
    games: List[TwitchGameResponse] = Field(default_factory=list)
    fetched_at: datetime


# ============================================================================
# Thumbnail Analysis Schemas
# ============================================================================

class FaceEmotion(BaseModel):
    """Face emotion detection result."""
    emotion: str
    confidence: float


class DominantColor(BaseModel):
    """Dominant color in thumbnail."""
    hex: str
    percentage: float


class ThumbnailAnalysisResponse(BaseModel):
    """Response for thumbnail analysis."""
    source_type: str
    source_id: str
    thumbnail_url: str
    has_face: bool = False
    face_count: int = 0
    face_emotions: List[FaceEmotion] = Field(default_factory=list)
    has_text: bool = False
    detected_text: List[str] = Field(default_factory=list)
    dominant_colors: List[DominantColor] = Field(default_factory=list)
    color_mood: Optional[ColorMood] = None
    composition: Optional[Composition] = None
    complexity_score: Optional[int] = None
    thumbnail_score: Optional[int] = None
    analyzed_at: Optional[datetime] = None


# ============================================================================
# Velocity Alert Schemas
# ============================================================================

class VelocityAlertResponse(BaseModel):
    """Response schema for a velocity alert."""
    id: str
    alert_type: AlertType
    platform: Literal["youtube", "twitch"]
    subject_id: str
    subject_name: str
    subject_thumbnail: Optional[str] = None
    current_value: int
    previous_value: int
    change_percent: float
    velocity_score: float
    severity: AlertSeverity
    insight: Optional[str] = None
    is_active: bool = True
    detected_at: datetime


class VelocityAlertsResponse(BaseModel):
    """Response for velocity alerts list."""
    alerts: List[VelocityAlertResponse] = Field(default_factory=list)
    total_active: int = 0


# ============================================================================
# Timing Schemas
# ============================================================================

class TimingRecommendationResponse(BaseModel):
    """Response for timing recommendation."""
    best_day: str
    best_hour: int = Field(..., ge=0, le=23)
    best_hour_local: str
    timezone: str = "UTC"
    confidence: float = Field(..., ge=0, le=1)
    data_points: int = 0


# ============================================================================
# Insight Schemas
# ============================================================================

class InsightResponse(BaseModel):
    """Response schema for an AI insight."""
    category: InsightCategory
    insight: str
    confidence: float = Field(..., ge=0, le=1)
    data_points: int = 0


class TitlePatterns(BaseModel):
    """Title pattern analysis."""
    top_words: List[dict] = Field(default_factory=list)  # [{word, count, avg_views}]
    avg_length: float = 0
    number_usage: float = 0
    emoji_usage: float = 0
    question_usage: float = 0


class ThumbnailPatterns(BaseModel):
    """Thumbnail pattern analysis."""
    face_percentage: float = 0
    avg_color_count: float = 0
    text_usage: float = 0
    avg_complexity: float = 0


# ============================================================================
# Daily Brief Schemas
# ============================================================================

class ThumbnailOfDay(BaseModel):
    """Thumbnail of the day highlight."""
    video_id: str
    title: str
    thumbnail: str
    channel_title: str
    views: int
    viral_score: int
    why_it_works: str


class DailyBriefResponse(BaseModel):
    """Response for daily brief."""
    brief_date: date
    thumbnail_of_day: Optional[ThumbnailOfDay] = None
    youtube_highlights: List[YouTubeVideoResponse] = Field(default_factory=list)
    twitch_highlights: List[TwitchStreamResponse] = Field(default_factory=list)
    hot_games: List[TwitchGameResponse] = Field(default_factory=list)
    insights: List[InsightResponse] = Field(default_factory=list)
    best_upload_times: Optional[TimingRecommendationResponse] = None
    best_stream_times: Optional[TimingRecommendationResponse] = None
    title_patterns: Optional[TitlePatterns] = None
    thumbnail_patterns: Optional[ThumbnailPatterns] = None
    generated_at: Optional[datetime] = None


# ============================================================================
# History Schemas
# ============================================================================

class TrendHistoryResponse(BaseModel):
    """Response for trend history."""
    days: int
    youtube_snapshots: List[dict] = Field(default_factory=list)
    twitch_hourly: List[dict] = Field(default_factory=list)
    velocity_alerts: List[VelocityAlertResponse] = Field(default_factory=list)
```

---

## API ENDPOINTS

### Public Endpoints (All Tiers)

```python
# backend/api/routes/trends.py
"""
Trend Intelligence Route Handlers for AuraStream.

Daily Brief, YouTube Trending, Twitch Live, and Analysis endpoints.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from backend.api.middleware.auth import get_current_user, get_current_user_optional
from backend.services.jwt_service import TokenPayload
from backend.services.trends import get_trend_service, get_youtube_collector, get_twitch_collector
from backend.api.schemas.trends import (
    DailyBriefResponse, YouTubeTrendingResponse, YouTubeSearchRequest, YouTubeSearchResponse,
    TwitchLiveResponse, TwitchGamesResponse, ThumbnailAnalysisResponse,
    VelocityAlertsResponse, TimingRecommendationResponse, TrendHistoryResponse,
)

router = APIRouter(prefix="/trends", tags=["Trends"])

# Tier limits
SEARCH_LIMITS = {"free": 0, "pro": 10, "studio": 50, "unlimited": 100}
THUMBNAIL_LIMITS = {"free": 3, "pro": 20, "studio": 1000, "unlimited": 1000}
HISTORY_DAYS = {"free": 0, "pro": 7, "studio": 30, "unlimited": 30}


@router.get("/daily-brief", response_model=DailyBriefResponse)
async def get_daily_brief(
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
) -> DailyBriefResponse:
    """Get today's compiled daily brief with AI insights."""
    service = get_trend_service()
    brief = await service.get_daily_brief()
    if not brief:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Daily brief not available yet")
    return brief


@router.get("/youtube/trending", response_model=YouTubeTrendingResponse)
async def get_youtube_trending(
    category: str = Query("gaming", regex="^(gaming|entertainment|music|education)$"),
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
) -> YouTubeTrendingResponse:
    """Get cached YouTube trending videos for a category."""
    service = get_trend_service()
    videos = await service.get_youtube_trending(category=category, limit=limit)
    return YouTubeTrendingResponse(videos=videos, category=category, region="US", fetched_at=datetime.utcnow())


@router.get("/twitch/live", response_model=TwitchLiveResponse)
async def get_twitch_live(
    limit: int = Query(20, ge=1, le=100),
    game_id: Optional[str] = None,
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
) -> TwitchLiveResponse:
    """Get current top Twitch streams (15-minute cache)."""
    service = get_trend_service()
    streams = await service.get_twitch_live(limit=limit, game_id=game_id)
    total_viewers = sum(s.viewer_count for s in streams)
    return TwitchLiveResponse(streams=streams, total_viewers=total_viewers, fetched_at=datetime.utcnow())


@router.get("/twitch/games", response_model=TwitchGamesResponse)
async def get_twitch_games(
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
) -> TwitchGamesResponse:
    """Get current top games on Twitch."""
    service = get_trend_service()
    games = await service.get_twitch_games(limit=limit)
    return TwitchGamesResponse(games=games, fetched_at=datetime.utcnow())
```

### Pro+ Endpoints

```python
@router.post("/youtube/search", response_model=YouTubeSearchResponse)
async def search_youtube(
    data: YouTubeSearchRequest,
    current_user: TokenPayload = Depends(get_current_user),
) -> YouTubeSearchResponse:
    """Search YouTube for specific niche (rate limited by tier)."""
    tier = current_user.tier or "free"
    limit = SEARCH_LIMITS.get(tier, 0)
    
    if limit == 0:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="YouTube search requires Pro or higher tier")
    
    service = get_trend_service()
    search_count = await service.get_user_search_count_today(current_user.sub)
    
    if search_count >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily search limit reached ({limit} searches/day for {tier} tier)"
        )
    
    collector = get_youtube_collector()
    videos = await collector.search_videos(query=data.query, category=data.category, max_results=data.max_results)
    
    # Record search for rate limiting
    await service.record_user_search(current_user.sub, data.query, data.category, [v.dict() for v in videos])
    
    return YouTubeSearchResponse(
        videos=videos,
        query=data.query,
        result_count=len(videos),
        rate_limit_remaining=limit - search_count - 1
    )


@router.get("/thumbnail/{video_id}/analysis", response_model=ThumbnailAnalysisResponse)
async def get_thumbnail_analysis(
    video_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> ThumbnailAnalysisResponse:
    """Get AI analysis of a specific thumbnail (rate limited by tier)."""
    tier = current_user.tier or "free"
    limit = THUMBNAIL_LIMITS.get(tier, 3)
    
    service = get_trend_service()
    
    # Check cache first
    analysis = await service.get_thumbnail_analysis(video_id)
    if analysis:
        return analysis
    
    # TODO: Check rate limit and trigger analysis if not cached
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thumbnail analysis not available")


@router.get("/timing/{category}", response_model=TimingRecommendationResponse)
async def get_timing_recommendation(
    category: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> TimingRecommendationResponse:
    """Get optimal posting/streaming times for a category (Pro+ only)."""
    tier = current_user.tier or "free"
    if tier == "free":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Timing insights require Pro or higher tier")
    
    service = get_trend_service()
    timing = await service.get_timing_recommendation(category)
    if not timing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timing data not available for this category")
    return timing


@router.get("/history", response_model=TrendHistoryResponse)
async def get_trend_history(
    days: int = Query(7, ge=1, le=30),
    current_user: TokenPayload = Depends(get_current_user),
) -> TrendHistoryResponse:
    """Get historical trend data (Pro: 7 days, Studio: 30 days)."""
    tier = current_user.tier or "free"
    max_days = HISTORY_DAYS.get(tier, 0)
    
    if max_days == 0:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Historical data requires Pro or higher tier")
    
    if days > max_days:
        days = max_days
    
    service = get_trend_service()
    # TODO: Implement history fetch
    return TrendHistoryResponse(days=days, youtube_snapshots=[], twitch_hourly=[], velocity_alerts=[])
```

### Studio-Only Endpoints

```python
@router.get("/velocity/alerts", response_model=VelocityAlertsResponse)
async def get_velocity_alerts(
    current_user: TokenPayload = Depends(get_current_user),
) -> VelocityAlertsResponse:
    """Get active velocity alerts (Studio tier only)."""
    tier = current_user.tier or "free"
    if tier not in ("studio", "unlimited"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Velocity alerts require Studio tier")
    
    service = get_trend_service()
    alerts = await service.get_velocity_alerts(active_only=True)
    return VelocityAlertsResponse(alerts=alerts, total_active=len(alerts))


@router.get("/cross-platform")
async def get_cross_platform_data(
    current_user: TokenPayload = Depends(get_current_user),
):
    """Get cross-platform correlation data (Studio tier only)."""
    tier = current_user.tier or "free"
    if tier not in ("studio", "unlimited"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-platform data requires Studio tier")
    
    # TODO: Implement cross-platform correlation
    return {"message": "Coming soon"}


__all__ = ["router"]
```

---

## WORKERS & CRON JOBS

### Worker Schedule

| Worker | Schedule | API Cost | Description |
|--------|----------|----------|-------------|
| `trend_youtube_daily.py` | 6:00 AM UTC | ~200 units | Fetch YT trending for all categories |
| `trend_twitch_live.py` | Every 15 min | 0 (free) | Fetch top streams and games |
| `trend_twitch_hourly.py` | Every hour | 0 (free) | Calculate hourly rollups |
| `trend_daily_brief.py` | 7:00 AM UTC | ~50 units | Generate daily brief with AI |
| `trend_thumbnail_batch.py` | 8:00 AM UTC | ~$0.10 | Analyze top 50 thumbnails |
| `trend_velocity_alerts.py` | Every 5 min | 0 (free) | Detect spikes in Twitch data |

### Worker Details

```python
# trend_youtube_daily.py
"""
Runs at 6 AM UTC daily.
Fetches trending videos for each category, stores in trend_youtube_snapshots.
Also fetches detailed stats for top 100 videos.

API Cost: ~200 units
- 4 trending calls (1 unit each) = 4 units
- 2 video detail calls (1 unit each) = 2 units
- Buffer for retries = ~194 units
"""

# trend_twitch_live.py
"""
Runs every 15 minutes.
Fetches top 100 streams and top 50 games.
Stores snapshot in trend_twitch_snapshots.
Calculates velocity by comparing to previous snapshot.

API Cost: 0 (Twitch is free)
"""

# trend_daily_brief.py
"""
Runs at 7 AM UTC daily (after YouTube fetch completes).
Compiles insights from all data sources.
Uses Gemini to generate human-readable insights.
Selects "Thumbnail of the Day" based on viral score.

API Cost: ~50 units (for any additional YT lookups)
Gemini Cost: ~$0.05 (for insight generation)
"""

# trend_thumbnail_batch.py
"""
Runs at 8 AM UTC daily.
Analyzes top 50 thumbnails from daily brief using Gemini Vision.
Stores results in trend_thumbnail_analysis.

Gemini Cost: ~$0.10 (50 images × $0.002/image)
"""

# trend_velocity_alerts.py
"""
Runs every 5 minutes.
Compares current Twitch snapshot to 1-hour-ago snapshot.
Detects games/streamers with >50% viewer increase.
Creates alerts in trend_velocity_alerts.

API Cost: 0 (uses cached data)
"""
```

---

## ANALYSIS SERVICES

### thumbnail_analyzer.py

```python
"""
Thumbnail Analysis Service

Uses Gemini Vision API to analyze thumbnail images and extract:
- Face detection (count, emotions, positions)
- Text detection (OCR)
- Color analysis (dominant colors, mood)
- Composition analysis (rule of thirds, focal points)
- Complexity score

Cost: ~$0.002 per image
"""

class ThumbnailAnalyzer:
    async def analyze(self, image_url: str) -> ThumbnailAnalysis:
        """
        Analyze a thumbnail image using Gemini Vision.
        
        Returns:
            ThumbnailAnalysis with:
            - has_face: bool
            - face_count: int
            - face_emotions: list[{emotion, confidence}]
            - has_text: bool
            - detected_text: list[str]
            - dominant_colors: list[{hex, percentage}]
            - color_mood: 'warm' | 'cool' | 'neutral' | 'vibrant'
            - composition: 'centered' | 'rule_of_thirds' | 'left_heavy' | 'right_heavy'
            - complexity_score: int (1-10)
            - thumbnail_score: int (0-100 predicted CTR)
        """
        
    def calculate_thumbnail_score(self, analysis: ThumbnailAnalysis) -> int:
        """
        Calculate composite thumbnail score based on:
        - Face presence (+20 if has face)
        - Emotion intensity (+10 for strong emotions)
        - Color vibrancy (+15 for vibrant colors)
        - Text clarity (+10 for readable text)
        - Composition (+15 for rule of thirds)
        - Simplicity (+10 for low complexity)
        """
```

### title_analyzer.py

```python
"""
Title Analysis Service

Analyzes video/stream titles to extract patterns:
- Word frequency analysis
- Sentiment detection
- Pattern matching (numbers, emojis, questions)
- Length optimization
"""

class TitleAnalyzer:
    def analyze(self, title: str) -> TitleAnalysis:
        """
        Analyze a title string.
        
        Returns:
            TitleAnalysis with:
            - word_count: int
            - char_count: int
            - has_number: bool
            - has_emoji: bool
            - is_question: bool
            - is_all_caps: bool
            - sentiment: 'positive' | 'negative' | 'neutral'
            - power_words: list[str]  # Words known to increase CTR
            - title_score: int (0-100)
        """
        
    def extract_patterns(self, titles: list[str]) -> TitlePatterns:
        """
        Extract patterns from a list of titles.
        
        Returns:
            TitlePatterns with:
            - top_words: list[{word, count, avg_views}]
            - avg_length: float
            - number_usage: float (percentage)
            - emoji_usage: float (percentage)
            - question_usage: float (percentage)
        """
```

### velocity_calculator.py

```python
"""
Velocity Calculator Service

Calculates growth rates and detects viral content:
- Views per hour since publish
- Viewer count change rate
- Spike detection
- Trajectory prediction
"""

class VelocityCalculator:
    def calculate_video_velocity(
        self, 
        views: int, 
        published_at: datetime
    ) -> float:
        """Calculate views per hour since publish."""
        
    def calculate_stream_velocity(
        self,
        current_viewers: int,
        previous_viewers: int,
        time_delta_minutes: int
    ) -> float:
        """Calculate viewer change rate per hour."""
        
    def detect_spike(
        self,
        current: int,
        historical: list[int],
        threshold: float = 0.5  # 50% increase
    ) -> SpikeDetection:
        """
        Detect if current value represents a spike.
        
        Returns:
            SpikeDetection with:
            - is_spike: bool
            - change_percent: float
            - severity: 'low' | 'medium' | 'high' | 'critical'
            - confidence: float
        """
        
    def predict_trajectory(
        self,
        data_points: list[tuple[datetime, int]]
    ) -> TrajectoryPrediction:
        """
        Predict future trajectory based on historical data.
        
        Returns:
            TrajectoryPrediction with:
            - trend: 'rising' | 'falling' | 'stable' | 'peaking'
            - predicted_peak: int
            - time_to_peak: timedelta
            - confidence: float
        """
```

### viral_score.py

```python
"""
Viral Score Calculator

Computes composite viral score (0-100) based on:
- Engagement rate (30%)
- Velocity score (30%)
- Thumbnail score (20%)
- Title score (10%)
- Timing bonus (10%)
"""

class ViralScoreCalculator:
    def calculate(
        self,
        engagement_rate: float,
        velocity_score: float,
        thumbnail_score: int,
        title_score: int,
        posted_at_optimal_time: bool
    ) -> int:
        """
        Calculate composite viral score.
        
        Formula:
        score = (
            min(engagement_rate * 10, 30) +  # Cap at 30
            min(velocity_score / 1000, 30) +  # Normalize and cap
            thumbnail_score * 0.2 +
            title_score * 0.1 +
            (10 if posted_at_optimal_time else 0)
        )
        
        Returns: int (0-100)
        """
```

### timing_analyzer.py

```python
"""
Timing Analysis Service

Analyzes historical data to determine optimal posting/streaming times.
"""

class TimingAnalyzer:
    def get_best_upload_times(
        self,
        category: str,
        region: str = 'US'
    ) -> TimingRecommendation:
        """
        Get best times to upload YouTube videos.
        
        Returns:
            TimingRecommendation with:
            - best_day: str (e.g., 'Saturday')
            - best_hour: int (0-23 UTC)
            - best_hour_local: str (e.g., '3 PM EST')
            - confidence: float
            - data_points: int (how many videos analyzed)
        """
        
    def get_best_stream_times(
        self,
        game_id: str
    ) -> TimingRecommendation:
        """
        Get best times to stream a specific game.
        Based on when top streamers have highest viewer counts.
        """
```

---

## SERVICE SINGLETON PATTERN

Following the established pattern from `community_feed_service.py`:

```python
# backend/services/trends/__init__.py
"""
Trend Intelligence Service Package.
Exports singleton getters for all trend services.
"""

from backend.services.trends.trend_service import TrendService
from backend.services.trends.youtube_collector import YouTubeCollector
from backend.services.trends.twitch_collector import TwitchCollector
from backend.services.trends.thumbnail_analyzer import ThumbnailAnalyzer
from backend.services.trends.velocity_calculator import VelocityCalculator

from typing import Optional

_trend_service: Optional[TrendService] = None
_youtube_collector: Optional[YouTubeCollector] = None
_twitch_collector: Optional[TwitchCollector] = None
_thumbnail_analyzer: Optional[ThumbnailAnalyzer] = None
_velocity_calculator: Optional[VelocityCalculator] = None


def get_trend_service() -> TrendService:
    """Get or create the trend service singleton."""
    global _trend_service
    if _trend_service is None:
        _trend_service = TrendService()
    return _trend_service


def get_youtube_collector() -> YouTubeCollector:
    """Get or create the YouTube collector singleton."""
    global _youtube_collector
    if _youtube_collector is None:
        _youtube_collector = YouTubeCollector()
    return _youtube_collector


def get_twitch_collector() -> TwitchCollector:
    """Get or create the Twitch collector singleton."""
    global _twitch_collector
    if _twitch_collector is None:
        _twitch_collector = TwitchCollector()
    return _twitch_collector


def get_thumbnail_analyzer() -> ThumbnailAnalyzer:
    """Get or create the thumbnail analyzer singleton."""
    global _thumbnail_analyzer
    if _thumbnail_analyzer is None:
        _thumbnail_analyzer = ThumbnailAnalyzer()
    return _thumbnail_analyzer


def get_velocity_calculator() -> VelocityCalculator:
    """Get or create the velocity calculator singleton."""
    global _velocity_calculator
    if _velocity_calculator is None:
        _velocity_calculator = VelocityCalculator()
    return _velocity_calculator


__all__ = [
    "TrendService",
    "YouTubeCollector", 
    "TwitchCollector",
    "ThumbnailAnalyzer",
    "VelocityCalculator",
    "get_trend_service",
    "get_youtube_collector",
    "get_twitch_collector",
    "get_thumbnail_analyzer",
    "get_velocity_calculator",
]
```

```python
# backend/services/trends/trend_service.py
"""
Trend Intelligence Service - Main orchestrator for trend data.
"""

import logging
from typing import Optional, List
from datetime import date, datetime

from backend.database.supabase_client import get_supabase_client
from backend.api.schemas.trends import (
    DailyBriefResponse, YouTubeVideoResponse, TwitchStreamResponse,
    TwitchGameResponse, ThumbnailAnalysisResponse, VelocityAlertResponse,
    TimingRecommendationResponse,
)

logger = logging.getLogger(__name__)


class TrendService:
    """Main service for trend intelligence operations."""

    def __init__(self, supabase_client=None):
        self._supabase = supabase_client

    @property
    def db(self):
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase

    async def get_daily_brief(self, brief_date: Optional[date] = None) -> Optional[DailyBriefResponse]:
        """Get the daily brief for a specific date (defaults to today)."""
        target_date = brief_date or date.today()
        try:
            result = self.db.table("trend_daily_briefs").select("*").eq("brief_date", str(target_date)).single().execute()
            if result.data:
                return DailyBriefResponse(**result.data)
        except Exception as e:
            logger.error(f"Error fetching daily brief for {target_date}: {e}")
        return None

    async def get_youtube_trending(
        self, category: str = "gaming", region: str = "US", limit: int = 20
    ) -> List[YouTubeVideoResponse]:
        """Get cached YouTube trending videos."""
        try:
            # Get latest snapshot for category
            result = self.db.table("trend_youtube_snapshots").select("*").eq("category", category).eq("region", region).order("snapshot_date", desc=True).limit(1).execute()
            
            if result.data and result.data[0].get("videos"):
                videos = result.data[0]["videos"][:limit]
                return [YouTubeVideoResponse(**v) for v in videos]
        except Exception as e:
            logger.error(f"Error fetching YouTube trending: {e}")
        return []

    async def get_twitch_live(self, limit: int = 20, game_id: Optional[str] = None) -> List[TwitchStreamResponse]:
        """Get current top Twitch streams from cache."""
        try:
            # Get latest snapshot
            result = self.db.table("trend_twitch_snapshots").select("*").order("snapshot_time", desc=True).limit(1).execute()
            
            if result.data and result.data[0].get("top_streams"):
                streams = result.data[0]["top_streams"]
                if game_id:
                    streams = [s for s in streams if s.get("game_id") == game_id]
                return [TwitchStreamResponse(**s) for s in streams[:limit]]
        except Exception as e:
            logger.error(f"Error fetching Twitch live: {e}")
        return []

    async def get_twitch_games(self, limit: int = 20) -> List[TwitchGameResponse]:
        """Get current top Twitch games from cache."""
        try:
            result = self.db.table("trend_twitch_snapshots").select("*").order("snapshot_time", desc=True).limit(1).execute()
            
            if result.data and result.data[0].get("top_games"):
                games = result.data[0]["top_games"][:limit]
                return [TwitchGameResponse(**g) for g in games]
        except Exception as e:
            logger.error(f"Error fetching Twitch games: {e}")
        return []

    async def get_thumbnail_analysis(self, video_id: str) -> Optional[ThumbnailAnalysisResponse]:
        """Get cached thumbnail analysis for a video."""
        try:
            result = self.db.table("trend_thumbnail_analysis").select("*").eq("source_type", "youtube").eq("source_id", video_id).single().execute()
            if result.data:
                return ThumbnailAnalysisResponse(**result.data)
        except Exception as e:
            logger.error(f"Error fetching thumbnail analysis for {video_id}: {e}")
        return None

    async def get_velocity_alerts(self, active_only: bool = True) -> List[VelocityAlertResponse]:
        """Get velocity alerts (Studio tier only)."""
        try:
            query = self.db.table("trend_velocity_alerts").select("*")
            if active_only:
                query = query.eq("is_active", True)
            result = query.order("detected_at", desc=True).limit(50).execute()
            return [VelocityAlertResponse(**a) for a in (result.data or [])]
        except Exception as e:
            logger.error(f"Error fetching velocity alerts: {e}")
        return []

    async def get_timing_recommendation(self, category: str) -> Optional[TimingRecommendationResponse]:
        """Get timing recommendation for a category."""
        try:
            # Get from latest daily brief
            result = self.db.table("trend_daily_briefs").select("best_upload_times, best_stream_times").order("brief_date", desc=True).limit(1).execute()
            
            if result.data:
                times = result.data[0].get("best_upload_times", {})
                if category in times:
                    return TimingRecommendationResponse(**times[category])
        except Exception as e:
            logger.error(f"Error fetching timing for {category}: {e}")
        return None

    async def record_user_search(
        self, user_id: str, query: str, category: Optional[str], results: List[dict]
    ) -> None:
        """Record a user's search for rate limiting and caching."""
        try:
            self.db.table("trend_user_searches").insert({
                "user_id": user_id,
                "query": query,
                "category": category,
                "results": results,
                "result_count": len(results),
                "expires_at": (datetime.utcnow().replace(hour=23, minute=59, second=59)).isoformat(),
            }).execute()
        except Exception as e:
            logger.error(f"Error recording user search: {e}")

    async def get_user_search_count_today(self, user_id: str) -> int:
        """Get user's search count for today (for rate limiting)."""
        try:
            today = date.today()
            result = self.db.table("trend_user_searches").select("id", count="exact").eq("user_id", user_id).gte("created_at", str(today)).execute()
            return result.count or 0
        except Exception as e:
            logger.error(f"Error getting search count: {e}")
            return 0
```

---

## FRONTEND COMPONENTS

### Page Structure

```tsx
// tsx/apps/web/src/app/dashboard/trends/page.tsx

export default function TrendsPage() {
  return (
    <div className="space-y-6">
      {/* Hero: Thumbnail of the Day */}
      <DailyBriefHero />
      
      {/* AI Insights Banner */}
      <InsightsBanner />
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Trending Content (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          <TrendingTabs />
          <TrendingGrid />
          
          {/* Pro: Search Panel */}
          <SearchPanel />
        </div>
        
        {/* Right: Live Sidebar (1 col) */}
        <div className="space-y-4">
          <TwitchLiveWidget />
          <VelocityAlerts />
          <TimingWidget />
        </div>
      </div>
    </div>
  );
}
```

### Component Specifications

```tsx
// DailyBriefHero.tsx
interface DailyBriefHeroProps {
  thumbnailOfDay: {
    videoId: string;
    title: string;
    thumbnail: string;
    viralScore: number;
    whyItWorks: string;
    channelTitle: string;
    views: number;
  };
}
// Large hero card showing the top-performing thumbnail with AI explanation

// TrendingTabs.tsx
// Tabs: YouTube Gaming | YouTube Entertainment | Twitch Live | Rising
// Each tab shows different data source

// TrendingGrid.tsx
interface TrendingGridProps {
  items: TrendItem[];
  onAnalyze?: (id: string) => void;  // Pro+ feature
  onGenerateLike?: (id: string) => void;  // Pro+ feature
}
// Grid of TrendCard components

// TrendCard.tsx
interface TrendCardProps {
  type: 'youtube' | 'twitch';
  id: string;
  title: string;
  thumbnail: string;
  creator: string;
  metric: number;  // views or viewers
  viralScore?: number;
  velocity?: 'rising' | 'stable' | 'falling';
}
// Individual card with thumbnail, stats, and action buttons

// ThumbnailAnalysis.tsx
interface ThumbnailAnalysisProps {
  analysis: {
    hasFace: boolean;
    faceCount: number;
    dominantColors: Array<{hex: string; percentage: number}>;
    hasText: boolean;
    detectedText: string[];
    composition: string;
    thumbnailScore: number;
  };
}
// Modal showing detailed AI analysis of a thumbnail

// InsightsBanner.tsx
interface InsightsBannerProps {
  insights: Array<{
    category: string;
    insight: string;
    confidence: number;
  }>;
}
// Rotating banner showing AI-generated insights
// "🔥 Faces in gaming thumbnails are up 23% this week"

// TwitchLiveWidget.tsx
// Real-time sidebar showing top 5 streams
// Updates every 15 minutes
// Shows viewer count with velocity indicator

// VelocityAlerts.tsx (Studio only)
interface VelocityAlertsProps {
  alerts: Array<{
    type: 'game_spike' | 'video_viral' | 'streamer_rising';
    subjectName: string;
    thumbnail: string;
    changePercent: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    insight: string;
  }>;
}
// List of active velocity alerts with severity indicators

// SearchPanel.tsx (Pro+)
// Search input with category filter
// Shows rate limit remaining
// Results displayed in grid format

// TimingWidget.tsx (Pro+)
// Shows best times to post/stream for user's preferred category
// Visual chart of optimal hours

// ViralScoreBadge.tsx
interface ViralScoreBadgeProps {
  score: number;  // 0-100
  size?: 'sm' | 'md' | 'lg';
}
// Circular badge showing viral score with color coding
// 0-30: gray, 31-60: yellow, 61-80: orange, 81-100: red/fire
```

### React Query Hooks

```typescript
// tsx/packages/api-client/src/hooks/useTrends.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  DailyBrief, YouTubeHighlight, TwitchHighlight, ThumbnailAnalysis,
  VelocityAlert, TimingRecommendation,
} from '../types/trends';

// Get the base URL from apiClient's configuration
const API_BASE = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : 'http://localhost:8000') + '/api/v1';

// Get token from apiClient (in-memory) for authenticated requests
const getToken = () => apiClient.getAccessToken();
const authHeaders = (token: string | null): Record<string, string> => 
  token ? { Authorization: `Bearer ${token}` } : {};

// Query Keys (following established pattern from useCommunity.ts)
export const trendsKeys = {
  all: ['trends'] as const,
  dailyBrief: () => [...trendsKeys.all, 'daily-brief'] as const,
  youtube: () => [...trendsKeys.all, 'youtube'] as const,
  youtubeTrending: (category: string) => [...trendsKeys.youtube(), 'trending', category] as const,
  youtubeSearch: (query: string) => [...trendsKeys.youtube(), 'search', query] as const,
  twitch: () => [...trendsKeys.all, 'twitch'] as const,
  twitchLive: () => [...trendsKeys.twitch(), 'live'] as const,
  twitchGames: () => [...trendsKeys.twitch(), 'games'] as const,
  thumbnail: (videoId: string) => [...trendsKeys.all, 'thumbnail', videoId] as const,
  velocity: () => [...trendsKeys.all, 'velocity'] as const,
  velocityAlerts: () => [...trendsKeys.velocity(), 'alerts'] as const,
  timing: (category: string) => [...trendsKeys.all, 'timing', category] as const,
  history: (days: number) => [...trendsKeys.all, 'history', days] as const,
};

// Transform Functions (snake_case to camelCase)
export function transformDailyBrief(data: any): DailyBrief {
  return {
    date: data.brief_date,
    thumbnailOfDay: data.thumbnail_of_day ? {
      videoId: data.thumbnail_of_day.video_id,
      title: data.thumbnail_of_day.title,
      thumbnail: data.thumbnail_of_day.thumbnail,
      channelTitle: data.thumbnail_of_day.channel_title,
      views: data.thumbnail_of_day.views,
      viralScore: data.thumbnail_of_day.viral_score,
      whyItWorks: data.thumbnail_of_day.why_it_works,
    } : null,
    youtubeHighlights: (data.youtube_highlights || []).map(transformYouTubeHighlight),
    twitchHighlights: (data.twitch_highlights || []).map(transformTwitchHighlight),
    hotGames: (data.hot_games || []).map(transformHotGame),
    insights: (data.insights || []).map(transformInsight),
    bestUploadTimes: data.best_upload_times ? transformTimingRecommendation(data.best_upload_times) : null,
    bestStreamTimes: data.best_stream_times ? transformTimingRecommendation(data.best_stream_times) : null,
    titlePatterns: data.title_patterns,
    thumbnailPatterns: data.thumbnail_patterns,
  };
}

export function transformYouTubeHighlight(data: any): YouTubeHighlight {
  return {
    videoId: data.video_id,
    title: data.title,
    thumbnail: data.thumbnail,
    channelTitle: data.channel_title,
    views: data.views ?? data.view_count,
    likes: data.likes ?? data.like_count,
    engagementRate: data.engagement_rate,
    viralScore: data.viral_score,
    velocity: data.velocity,
    insight: data.insight,
  };
}

export function transformTwitchHighlight(data: any): TwitchHighlight {
  return {
    streamerId: data.streamer_id ?? data.user_id,
    streamerName: data.streamer_name ?? data.user_name,
    gameId: data.game_id,
    gameName: data.game_name,
    viewerCount: data.viewer_count,
    peakViewers: data.peak_viewers,
    thumbnail: data.thumbnail,
    title: data.title,
    velocity: data.velocity,
    insight: data.insight,
  };
}

export function transformHotGame(data: any): HotGame {
  return {
    gameId: data.game_id,
    name: data.name,
    twitchViewers: data.twitch_viewers,
    twitchStreams: data.twitch_streams,
    youtubeVideos: data.youtube_videos,
    youtubeTotalViews: data.youtube_total_views,
    trend: data.trend,
  };
}

export function transformInsight(data: any): Insight {
  return {
    category: data.category,
    insight: data.insight,
    confidence: data.confidence,
    dataPoints: data.data_points,
  };
}

export function transformThumbnailAnalysis(data: any): ThumbnailAnalysis {
  return {
    hasFace: data.has_face,
    faceCount: data.face_count,
    faceEmotions: data.face_emotions || [],
    hasText: data.has_text,
    detectedText: data.detected_text || [],
    dominantColors: data.dominant_colors || [],
    colorMood: data.color_mood,
    composition: data.composition,
    complexityScore: data.complexity_score,
    thumbnailScore: data.thumbnail_score,
  };
}

export function transformVelocityAlert(data: any): VelocityAlert {
  return {
    id: data.id,
    alertType: data.alert_type,
    platform: data.platform,
    subjectId: data.subject_id,
    subjectName: data.subject_name,
    subjectThumbnail: data.subject_thumbnail,
    currentValue: data.current_value,
    previousValue: data.previous_value,
    changePercent: data.change_percent,
    velocityScore: data.velocity_score,
    severity: data.severity,
    insight: data.insight,
    detectedAt: data.detected_at,
  };
}

export function transformTimingRecommendation(data: any): TimingRecommendation {
  return {
    bestDay: data.best_day,
    bestHour: data.best_hour,
    bestHourLocal: data.best_hour_local,
    timezone: data.timezone,
    confidence: data.confidence,
    dataPoints: data.data_points,
  };
}

// Query Hooks
export function useDailyBrief() {
  return useQuery({
    queryKey: trendsKeys.dailyBrief(),
    queryFn: async (): Promise<DailyBrief> => {
      const res = await fetch(`${API_BASE}/trends/daily-brief`, { headers: authHeaders(getToken()) });
      if (!res.ok) throw new Error('Failed to fetch daily brief');
      return transformDailyBrief(await res.json());
    },
    staleTime: 1000 * 60 * 60,  // 1 hour
  });
}

export function useYouTubeTrending(category: string, enabled = true) {
  return useQuery({
    queryKey: trendsKeys.youtubeTrending(category),
    queryFn: async (): Promise<YouTubeHighlight[]> => {
      const res = await fetch(`${API_BASE}/trends/youtube/trending?category=${category}`, { headers: authHeaders(getToken()) });
      if (!res.ok) throw new Error('Failed to fetch YouTube trending');
      const data = await res.json();
      return (data.videos || data).map(transformYouTubeHighlight);
    },
    staleTime: 1000 * 60 * 60,  // 1 hour
    enabled,
  });
}

export function useTwitchLive(limit?: number) {
  return useQuery({
    queryKey: trendsKeys.twitchLive(),
    queryFn: async (): Promise<TwitchHighlight[]> => {
      const params = limit ? `?limit=${limit}` : '';
      const res = await fetch(`${API_BASE}/trends/twitch/live${params}`, { headers: authHeaders(getToken()) });
      if (!res.ok) throw new Error('Failed to fetch Twitch live');
      const data = await res.json();
      return (data.streams || data).map(transformTwitchHighlight);
    },
    staleTime: 1000 * 60 * 15,  // 15 minutes
    refetchInterval: 1000 * 60 * 15,  // Auto-refresh
  });
}

export function useTwitchGames(limit?: number) {
  return useQuery({
    queryKey: trendsKeys.twitchGames(),
    queryFn: async (): Promise<HotGame[]> => {
      const params = limit ? `?limit=${limit}` : '';
      const res = await fetch(`${API_BASE}/trends/twitch/games${params}`, { headers: authHeaders(getToken()) });
      if (!res.ok) throw new Error('Failed to fetch Twitch games');
      const data = await res.json();
      return (data.games || data).map(transformHotGame);
    },
    staleTime: 1000 * 60 * 15,
  });
}

export function useYouTubeSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ query, category, maxResults }: { query: string; category?: string; maxResults?: number }): Promise<YouTubeHighlight[]> => {
      const res = await fetch(`${API_BASE}/trends/youtube/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(getToken()) },
        body: JSON.stringify({ query, category, max_results: maxResults }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to search YouTube');
      }
      const data = await res.json();
      return (data.videos || data).map(transformYouTubeHighlight);
    },
    onSuccess: (data, { query }) => {
      qc.setQueryData(trendsKeys.youtubeSearch(query), data);
    },
  });
}

export function useThumbnailAnalysis(videoId: string | undefined) {
  return useQuery({
    queryKey: trendsKeys.thumbnail(videoId ?? ''),
    queryFn: async (): Promise<ThumbnailAnalysis> => {
      const res = await fetch(`${API_BASE}/trends/thumbnail/${videoId}/analysis`, { headers: authHeaders(getToken()) });
      if (!res.ok) throw new Error('Failed to fetch thumbnail analysis');
      return transformThumbnailAnalysis(await res.json());
    },
    enabled: !!videoId,
  });
}

export function useVelocityAlerts() {
  return useQuery({
    queryKey: trendsKeys.velocityAlerts(),
    queryFn: async (): Promise<VelocityAlert[]> => {
      const res = await fetch(`${API_BASE}/trends/velocity/alerts`, { headers: authHeaders(getToken()) });
      if (!res.ok) throw new Error('Failed to fetch velocity alerts');
      const data = await res.json();
      return (data.alerts || data).map(transformVelocityAlert);
    },
    staleTime: 1000 * 60 * 5,  // 5 minutes
    refetchInterval: 1000 * 60 * 5,
  });
}

export function useTiming(category: string) {
  return useQuery({
    queryKey: trendsKeys.timing(category),
    queryFn: async (): Promise<TimingRecommendation> => {
      const res = await fetch(`${API_BASE}/trends/timing/${category}`, { headers: authHeaders(getToken()) });
      if (!res.ok) throw new Error('Failed to fetch timing recommendation');
      return transformTimingRecommendation(await res.json());
    },
    staleTime: 1000 * 60 * 60 * 24,  // 24 hours
  });
}

export function useTrendHistory(days: number = 7) {
  return useQuery({
    queryKey: trendsKeys.history(days),
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/trends/history?days=${days}`, { headers: authHeaders(getToken()) });
      if (!res.ok) throw new Error('Failed to fetch trend history');
      return res.json();
    },
    staleTime: 1000 * 60 * 60,  // 1 hour
  });
}
```

---

## IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1)
**Goal:** Basic data collection and storage

```
Tasks:
□ Create database migration (042_trend_intelligence.sql)
□ Implement youtube_collector.py
□ Implement twitch_collector.py
□ Create trend_youtube_daily.py worker
□ Create trend_twitch_live.py worker
□ Basic API endpoints (trending, live)
□ Frontend: TrendsPage skeleton
□ Frontend: TrendingGrid with basic cards

Deliverable: Users can see trending YouTube videos and live Twitch streams
```

### Phase 2: Analysis Layer (Week 2)
**Goal:** AI-powered insights

```
Tasks:
□ Implement thumbnail_analyzer.py (Gemini Vision)
□ Implement title_analyzer.py
□ Implement velocity_calculator.py
□ Implement viral_score.py
□ Create trend_thumbnail_batch.py worker
□ Create trend_daily_brief.py worker
□ API: thumbnail analysis endpoint
□ Frontend: ThumbnailAnalysis modal
□ Frontend: ViralScoreBadge component
□ Frontend: DailyBriefHero component

Deliverable: Users see viral scores and can analyze thumbnails
```

### Phase 3: Daily Brief (Week 3)
**Goal:** Compiled daily insights

```
Tasks:
□ Implement timing_analyzer.py
□ Implement cross_platform.py
□ Generate AI insights using Gemini
□ Create trend_daily_briefs table population
□ API: daily-brief endpoint
□ Frontend: InsightsBanner component
□ Frontend: TimingWidget component
□ Email digest worker (optional)

Deliverable: Full daily brief with AI insights
```

### Phase 4: Pro Features (Week 4)
**Goal:** Search and historical data

```
Tasks:
□ Implement YouTube search with rate limiting
□ Implement historical trend queries
□ API: search endpoint with tier checks
□ API: history endpoint
□ Frontend: SearchPanel component
□ Frontend: Historical charts
□ Rate limit UI feedback

Deliverable: Pro users can search and view history
```

### Phase 5: Studio Features (Week 5)
**Goal:** Real-time alerts and advanced analytics

```
Tasks:
□ Implement trend_velocity_alerts.py worker
□ Implement spike detection algorithm
□ API: velocity alerts endpoint
□ Frontend: VelocityAlerts component
□ Push notification integration (optional)
□ Cross-platform correlation UI

Deliverable: Studio users get real-time velocity alerts
```

### Phase 6: Integration (Week 6)
**Goal:** Connect to asset generation

```
Tasks:
□ "Generate Like This" button integration
□ Pass thumbnail analysis to generation prompts
□ Pass title patterns to generation prompts
□ Track which trends led to generations
□ A/B test generated assets against trends

Deliverable: Users can generate assets inspired by trending content
```

---

## API COST BUDGET

### Daily API Usage

| Operation | Units/Cost | Frequency | Daily Total |
|-----------|------------|-----------|-------------|
| **YouTube** | | | |
| Trending fetch (4 categories) | 4 units | 1x/day | 4 units |
| Video details (100 videos) | 1 unit | 1x/day | 1 unit |
| Pro searches (avg 50/day) | 100 units each | 50x/day | 5,000 units |
| **Subtotal YouTube** | | | **~5,005 units** |
| | | | |
| **Twitch** | | | |
| Top streams | Free | 96x/day | $0 |
| Top games | Free | 96x/day | $0 |
| Hourly rollups | Free | 24x/day | $0 |
| **Subtotal Twitch** | | | **$0** |
| | | | |
| **Gemini** | | | |
| Thumbnail analysis (50/day) | $0.002/image | 50x/day | $0.10 |
| Insight generation | $0.01/call | 5x/day | $0.05 |
| **Subtotal Gemini** | | | **~$0.15** |

### Monthly Projections

| Resource | Daily | Monthly | Limit | % Used |
|----------|-------|---------|-------|--------|
| YouTube API | 5,005 units | 150,150 units | 300,000 units | 50% |
| Twitch API | ~4,000 calls | ~120,000 calls | Unlimited | 0% |
| Gemini API | $0.15 | $4.50 | Pay-as-you-go | N/A |

### Cost Optimization Strategies

1. **Aggressive Caching**
   - YouTube trending: 1-hour cache
   - Twitch live: 15-minute cache
   - Thumbnail analysis: Permanent cache
   - Search results: 6-hour cache

2. **Batch Operations**
   - Fetch all categories in single cron job
   - Analyze thumbnails in batch (not on-demand)
   - Aggregate Twitch data hourly

3. **Rate Limiting**
   - Pro: 10 searches/day
   - Studio: 50 searches/day
   - Free: No searches (use cached data only)

4. **Smart Invalidation**
   - Only re-analyze thumbnails if viral score changes significantly
   - Keep historical data compressed after 7 days

---

## APPENDIX: Type Definitions

```typescript
// tsx/packages/api-client/src/types/trends.ts
/**
 * Trend Intelligence TypeScript Types
 * All properties use camelCase (backend uses snake_case).
 */

// Enums / Literal Types
export type TrendCategory = 'gaming' | 'entertainment' | 'music' | 'education';
export type TrendVelocity = 'rising' | 'stable' | 'falling';
export type AlertType = 'game_spike' | 'video_viral' | 'streamer_rising';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ColorMood = 'warm' | 'cool' | 'neutral' | 'vibrant';
export type Composition = 'centered' | 'rule_of_thirds' | 'left_heavy' | 'right_heavy';
export type InsightCategory = 'thumbnail' | 'title' | 'timing' | 'game' | 'general';

export interface DailyBrief {
  date: string;
  thumbnailOfDay: ThumbnailOfDay | null;
  youtubeHighlights: YouTubeHighlight[];
  twitchHighlights: TwitchHighlight[];
  hotGames: HotGame[];
  insights: Insight[];
  bestUploadTimes: TimingRecommendation | null;
  bestStreamTimes: TimingRecommendation | null;
  titlePatterns: TitlePatterns | null;
  thumbnailPatterns: ThumbnailPatterns | null;
}

export interface ThumbnailOfDay {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  views: number;
  viralScore: number;
  whyItWorks: string;
}

export interface YouTubeHighlight {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  views: number;
  likes: number;
  engagementRate: number;
  viralScore: number;
  velocity: 'rising' | 'stable' | 'falling';
  insight?: string;
}

export interface TwitchHighlight {
  streamerId: string;
  streamerName: string;
  gameId: string;
  gameName: string;
  viewerCount: number;
  peakViewers: number;
  thumbnail: string;
  title: string;
  velocity: 'rising' | 'stable' | 'falling';
  insight?: string;
}

export interface HotGame {
  gameId: string;
  name: string;
  twitchViewers: number;
  twitchStreams: number;
  youtubeVideos: number;
  youtubeTotalViews: number;
  trend: 'rising' | 'stable' | 'falling';
}

export interface Insight {
  category: 'thumbnail' | 'title' | 'timing' | 'game' | 'general';
  insight: string;
  confidence: number;
  dataPoints: number;
}

export interface ThumbnailAnalysis {
  hasFace: boolean;
  faceCount: number;
  faceEmotions: Array<{emotion: string; confidence: number}>;
  hasText: boolean;
  detectedText: string[];
  dominantColors: Array<{hex: string; percentage: number}>;
  colorMood: 'warm' | 'cool' | 'neutral' | 'vibrant';
  composition: 'centered' | 'rule_of_thirds' | 'left_heavy' | 'right_heavy';
  complexityScore: number;
  thumbnailScore: number;
}

export interface VelocityAlert {
  id: string;
  alertType: 'game_spike' | 'video_viral' | 'streamer_rising';
  platform: 'youtube' | 'twitch';
  subjectId: string;
  subjectName: string;
  subjectThumbnail: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  velocityScore: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  insight: string;
  detectedAt: string;
}

export interface TimingRecommendation {
  bestDay: string;
  bestHour: number;
  bestHourLocal: string;
  timezone: string;
  confidence: number;
  dataPoints: number;
}

export interface TitlePatterns {
  topWords: Array<{word: string; count: number; avgViews: number}>;
  avgLength: number;
  numberUsage: number;
  emojiUsage: number;
  questionUsage: number;
}

export interface ThumbnailPatterns {
  facePercentage: number;
  avgColorCount: number;
  textUsage: number;
  avgComplexity: number;
}
```

---

*This schema is the definitive reference for the Trend Intelligence feature. All implementation should follow this specification.*
