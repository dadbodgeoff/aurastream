# 📡 RADAR INTELLIGENCE MASTER SCHEMA
## The Bloomberg Terminal for Gaming Content Creators

**Version:** 1.0.0  
**Last Updated:** December 30, 2025  
**Codename:** Project Radar  
**Purpose:** Real-time trend detection, exploit alerts, and content opportunity intelligence

---

## EXECUTIVE SUMMARY

Radar is a real-time intelligence system that monitors gaming communities across platforms,
detects emerging trends/exploits/events, and alerts creators with actionable content opportunities.
The key differentiator: **speed to content**. Being first on a trend = 10x views.

### The Value Proposition
- Reddit post about glitch: T+0
- Average creator's video: T+2 hours  
- AuraStream Radar user's video: T+30 minutes
- That 90-minute advantage = difference between 1M views and 10k views

---

## SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA COLLECTION LAYER                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Reddit    │  │   Twitter   │  │   YouTube   │  │   Twitch    │        │
│  │  Collector  │  │  Collector  │  │  Collector  │  │  Collector  │        │
│  │  (5 min)    │  │  (2 min)    │  │  (15 min)   │  │  (5 min)    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │                │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐        │
│  │   Steam     │  │  Patch RSS  │  │  Esports    │  │  Discord    │        │
│  │  Collector  │  │  Collector  │  │  Collector  │  │  (Future)   │        │
│  │  (30 min)   │  │  (10 min)   │  │  (1 hour)   │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SIGNAL PROCESSING LAYER                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │  Velocity Detector  │  │  Keyword Classifier │  │  Sentiment Analyzer │ │
│  │  - Upvote velocity  │  │  - Exploit/glitch   │  │  - Hype vs complaint│ │
│  │  - View acceleration│  │  - Drama/controversy│  │  - Urgency scoring  │ │
│  │  - Engagement spike │  │  - Update/patch     │  │  - Community mood   │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
│                                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │  Cross-Platform     │  │  Game Tagger        │  │  Opportunity Scorer │ │
│  │  Correlator         │  │  - Auto-detect game │  │  - Content potential│ │
│  │  - Reddit→YouTube   │  │  - Map to user's    │  │  - Competition level│ │
│  │  - Twitter→Twitch   │  │    watchlist        │  │  - Time sensitivity │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ALERT ENGINE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Signal Score > Threshold?                                                  │
│       │                                                                     │
│       ├─── YES ──→ Generate Alert                                           │
│       │            ├─ Classify alert type                                   │
│       │            ├─ Generate suggested title                              │
│       │            ├─ Queue thumbnail generation                            │
│       │            └─ Push to user notification queue                       │
│       │                                                                     │
│       └─── NO ───→ Store in signal feed (for dashboard display)             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DELIVERY LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Web Push  │  │   Mobile    │  │   Email     │  │   Discord   │        │
│  │   Notif     │  │   Push      │  │   Digest    │  │   Webhook   │        │
│  │  (instant)  │  │  (instant)  │  │  (hourly)   │  │  (instant)  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ALERT TYPES & CLASSIFICATION

### Alert Categories

```python
AlertType = Literal[
    "exploit",      # Glitches, XP farms, broken items
    "velocity",     # Unusual engagement spike on content
    "game_event",   # Updates, seasons, downtime, launches
    "drama",        # Streamer controversy, bans, beef
    "esports",      # Tournament moments, upsets, clips
    "meta_shift",   # Balance changes, new strategies
    "trend_forming",# Multiple signals converging on topic
    "patch_notes",  # Official game updates released
]

AlertSeverity = Literal[
    "critical",     # Drop everything - this is huge (exploit, major drama)
    "high",         # Very time-sensitive - act within 1 hour
    "medium",       # Good opportunity - act within 4 hours  
    "low",          # Worth knowing - act within 24 hours
]

AlertUrgency = Literal[
    "breaking",     # Happening RIGHT NOW
    "developing",   # Building momentum
    "trending",     # Established trend
    "fading",       # Window closing soon
]
```

### Alert Scoring Formula

```python
def calculate_alert_score(signal: Signal) -> int:
    """
    Score 0-100 determining if signal becomes an alert.
    Threshold for alert: 60+
    """
    score = 0
    
    # Velocity component (0-40 points)
    # How fast is engagement growing?
    velocity_score = min(40, signal.velocity_percentile * 0.4)
    score += velocity_score
    
    # Keyword match component (0-25 points)
    # Does it match high-value keywords?
    if signal.matches_exploit_keywords:
        score += 25
    elif signal.matches_event_keywords:
        score += 20
    elif signal.matches_drama_keywords:
        score += 15
    
    # Cross-platform correlation (0-20 points)
    # Is this trending on multiple platforms?
    platforms_active = signal.platform_count
    score += min(20, platforms_active * 7)
    
    # Recency bonus (0-15 points)
    # Newer = more valuable
    minutes_old = signal.age_minutes
    if minutes_old < 15:
        score += 15
    elif minutes_old < 30:
        score += 12
    elif minutes_old < 60:
        score += 8
    elif minutes_old < 120:
        score += 4
    
    return min(100, score)
```

---

## DATA SOURCES SPECIFICATION

### Reddit Collector

```python
# Subreddits to monitor (by game)
REDDIT_SOURCES = {
    "fortnite": {
        "subreddits": ["FortNiteBR", "FortniteCompetitive", "FortniteFashion"],
        "keywords": {
            "exploit": ["glitch", "xp farm", "exploit", "broken", "infinite", "patched"],
            "event": ["downtime", "update", "season", "live event", "patch"],
            "meta": ["nerf", "buff", "op", "broken weapon", "meta"],
        },
    },
    "minecraft": {
        "subreddits": ["Minecraft", "MinecraftMemes", "technicalminecraft"],
        "keywords": {
            "exploit": ["dupe", "glitch", "exploit", "bug", "infinite"],
            "event": ["snapshot", "update", "1.21", "mob vote"],
        },
    },
    "apex": {
        "subreddits": ["apexlegends", "ApexUncovered", "CompetitiveApex"],
        "keywords": {
            "exploit": ["exploit", "glitch", "bug", "broken", "infinite"],
            "event": ["patch", "update", "collection event", "heirloom"],
            "meta": ["nerf", "buff", "tier list", "meta"],
        },
    },
    # ... more games
}

# Polling configuration
REDDIT_CONFIG = {
    "poll_interval_seconds": 300,  # 5 minutes
    "posts_per_subreddit": 25,     # Hot + New
    "min_upvotes_for_signal": 20,  # Filter noise
    "velocity_window_minutes": 30,  # For spike detection
}
```

### Twitter/X Collector

```python
TWITTER_SOURCES = {
    "official_accounts": [
        "FortniteGame", "Minecraft", "PlayApex", "RiotGames",
        "CallofDuty", "ABORTNITE", "HYPEX", "ShiinaBR",  # Leakers
    ],
    "hashtags": [
        "#Fortnite", "#FortniteUpdate", "#Minecraft", 
        "#ApexLegends", "#Warzone", "#GTA6",
    ],
    "search_queries": [
        "fortnite glitch", "fortnite xp", "fortnite broken",
        "minecraft dupe", "apex exploit",
    ],
}

TWITTER_CONFIG = {
    "poll_interval_seconds": 120,  # 2 minutes
    "tweets_per_query": 50,
    "min_engagement_for_signal": 100,  # likes + retweets
}
```

### YouTube Collector (Enhanced)

```python
YOUTUBE_CONFIG = {
    "poll_interval_seconds": 900,  # 15 minutes
    "search_queries_per_game": [
        "{game} glitch",
        "{game} exploit", 
        "{game} update",
        "{game} new",
    ],
    "velocity_detection": {
        "view_acceleration_threshold": 5.0,  # 5x normal rate
        "engagement_spike_threshold": 3.0,   # 3x normal engagement
    },
}
```

### Steam Collector

```python
STEAM_CONFIG = {
    "poll_interval_seconds": 1800,  # 30 minutes
    "tracked_app_ids": {
        "730": "CS2",
        "570": "Dota 2", 
        "440": "TF2",
        "1172470": "Apex Legends",
        # ... more
    },
    "signals": [
        "player_count_spike",      # Unusual player count
        "review_bomb",             # Sudden negative reviews
        "update_detected",         # New build pushed
    ],
}
```

### Patch Notes RSS Collector

```python
PATCH_RSS_FEEDS = {
    "fortnite": "https://www.epicgames.com/fortnite/en-US/news/rss",
    "valorant": "https://playvalorant.com/en-us/news/rss/",
    "league": "https://www.leagueoflegends.com/en-us/news/rss/",
    # ... more
}

PATCH_CONFIG = {
    "poll_interval_seconds": 600,  # 10 minutes
    "auto_alert_on_new": True,     # Always alert on patch notes
}
```

---

## DATABASE SCHEMA

```sql
-- ============================================================================
-- Migration: Radar Intelligence Tables
-- ============================================================================

-- User's game watchlist (which games they care about)
CREATE TABLE radar_watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_key TEXT NOT NULL,           -- 'fortnite', 'minecraft', etc.
    game_name TEXT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    
    -- Notification preferences per game
    notify_exploits BOOLEAN DEFAULT TRUE,
    notify_events BOOLEAN DEFAULT TRUE,
    notify_drama BOOLEAN DEFAULT FALSE,
    notify_meta BOOLEAN DEFAULT TRUE,
    
    -- Thresholds
    min_severity TEXT DEFAULT 'medium',  -- 'critical', 'high', 'medium', 'low'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, game_key)
);

-- Raw signals collected from all sources
CREATE TABLE radar_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Source identification
    source_platform TEXT NOT NULL,    -- 'reddit', 'twitter', 'youtube', 'steam'
    source_id TEXT NOT NULL,          -- Platform-specific ID
    source_url TEXT,
    
    -- Content
    title TEXT NOT NULL,
    body TEXT,
    author TEXT,
    
    -- Classification
    game_key TEXT,                    -- Auto-detected game
    signal_type TEXT,                 -- 'exploit', 'event', 'drama', etc.
    keywords_matched TEXT[],
    
    -- Metrics at collection time
    upvotes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    engagement_score INTEGER DEFAULT 0,
    
    -- Velocity tracking
    velocity_score NUMERIC(8,2),      -- Rate of engagement growth
    velocity_percentile INTEGER,      -- Compared to baseline
    
    -- Scoring
    alert_score INTEGER DEFAULT 0,    -- 0-100, threshold 60 for alert
    
    -- Timestamps
    source_created_at TIMESTAMPTZ,    -- When original was posted
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Deduplication
    content_hash TEXT,
    
    UNIQUE(source_platform, source_id)
);

-- Alerts generated from high-scoring signals
CREATE TABLE radar_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to source signal(s)
    primary_signal_id UUID REFERENCES radar_signals(id),
    related_signal_ids UUID[],        -- Cross-platform correlation
    
    -- Classification
    alert_type TEXT NOT NULL,         -- 'exploit', 'velocity', 'game_event', etc.
    severity TEXT NOT NULL,           -- 'critical', 'high', 'medium', 'low'
    urgency TEXT NOT NULL,            -- 'breaking', 'developing', 'trending', 'fading'
    game_key TEXT NOT NULL,
    
    -- Content
    headline TEXT NOT NULL,           -- AI-generated headline
    summary TEXT,                     -- AI-generated summary
    source_urls TEXT[],               -- Links to original sources
    
    -- AI-generated content suggestions
    suggested_title TEXT,             -- Ready-to-use video title
    suggested_hook TEXT,              -- Opening line for video
    suggested_tags TEXT[],
    thumbnail_prompt TEXT,            -- For auto-generation
    
    -- Scoring
    opportunity_score INTEGER,        -- How good is this for content?
    competition_level TEXT,           -- 'low', 'medium', 'high'
    time_sensitivity_hours INTEGER,   -- How long until this is stale?
    
    -- Status
    status TEXT DEFAULT 'active',     -- 'active', 'fading', 'expired', 'dismissed'
    expires_at TIMESTAMPTZ,
    
    -- Metrics
    platforms_detected INTEGER DEFAULT 1,
    total_engagement INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User alert delivery tracking
CREATE TABLE radar_user_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_id UUID NOT NULL REFERENCES radar_alerts(id) ON DELETE CASCADE,
    
    -- Delivery status
    delivered_at TIMESTAMPTZ,
    delivery_channel TEXT,            -- 'web_push', 'mobile', 'email', 'discord'
    
    -- User interaction
    viewed_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    acted_on BOOLEAN DEFAULT FALSE,   -- Did they make content?
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, alert_id)
);

-- Signal feed for dashboard (lower-scoring signals)
CREATE TABLE radar_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id UUID REFERENCES radar_signals(id) ON DELETE CASCADE,
    
    game_key TEXT NOT NULL,
    feed_type TEXT NOT NULL,          -- 'reddit', 'twitter', 'youtube', 'steam'
    
    -- Display content
    title TEXT NOT NULL,
    preview TEXT,
    source_url TEXT,
    engagement_display TEXT,          -- "1.2k upvotes"
    
    -- Ordering
    relevance_score INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ            -- Auto-cleanup old feed items
);

-- Velocity baselines per game/platform (for spike detection)
CREATE TABLE radar_velocity_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_key TEXT NOT NULL,
    platform TEXT NOT NULL,
    
    -- Rolling averages
    avg_upvotes_per_hour NUMERIC(10,2),
    avg_comments_per_hour NUMERIC(10,2),
    avg_engagement_per_hour NUMERIC(10,2),
    
    -- Percentile thresholds
    p50_velocity NUMERIC(10,2),
    p75_velocity NUMERIC(10,2),
    p90_velocity NUMERIC(10,2),
    p99_velocity NUMERIC(10,2),
    
    -- Sample size
    sample_count INTEGER,
    
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(game_key, platform)
);

-- Indexes
CREATE INDEX idx_signals_game ON radar_signals(game_key);
CREATE INDEX idx_signals_type ON radar_signals(signal_type);
CREATE INDEX idx_signals_score ON radar_signals(alert_score DESC);
CREATE INDEX idx_signals_collected ON radar_signals(collected_at DESC);
CREATE INDEX idx_alerts_game ON radar_alerts(game_key);
CREATE INDEX idx_alerts_status ON radar_alerts(status, created_at DESC);
CREATE INDEX idx_alerts_severity ON radar_alerts(severity, created_at DESC);
CREATE INDEX idx_user_alerts_user ON radar_user_alerts(user_id, created_at DESC);
CREATE INDEX idx_feed_game ON radar_feed(game_key, created_at DESC);
CREATE INDEX idx_watchlist_user ON radar_watchlist(user_id);
```

---

## FILE STRUCTURE

```
backend/
├── services/
│   └── radar/
│       ├── __init__.py
│       ├── radar_service.py           # Main orchestrator
│       │
│       ├── collectors/
│       │   ├── __init__.py
│       │   ├── base_collector.py      # Abstract base class
│       │   ├── reddit_collector.py    # Reddit API client
│       │   ├── twitter_collector.py   # Twitter/X API client
│       │   ├── youtube_collector.py   # YouTube search monitoring
│       │   ├── steam_collector.py     # Steam API client
│       │   └── rss_collector.py       # Patch notes RSS
│       │
│       ├── processors/
│       │   ├── __init__.py
│       │   ├── velocity_detector.py   # Spike detection
│       │   ├── keyword_classifier.py  # Exploit/event/drama detection
│       │   ├── sentiment_analyzer.py  # Community mood
│       │   ├── game_tagger.py         # Auto-detect game from content
│       │   └── correlator.py          # Cross-platform matching
│       │
│       ├── alerting/
│       │   ├── __init__.py
│       │   ├── alert_generator.py     # Create alerts from signals
│       │   ├── content_suggester.py   # AI title/hook generation
│       │   └── delivery_manager.py    # Push notifications
│       │
│       ├── constants.py               # Game configs, keywords, thresholds
│       └── repository.py              # Database operations
│
├── workers/
│   ├── radar_reddit_worker.py         # Runs every 5 min
│   ├── radar_twitter_worker.py        # Runs every 2 min
│   ├── radar_youtube_worker.py        # Runs every 15 min
│   ├── radar_steam_worker.py          # Runs every 30 min
│   ├── radar_rss_worker.py            # Runs every 10 min
│   ├── radar_alert_processor.py       # Processes signals → alerts
│   └── radar_cleanup_worker.py        # Expires old data
│
├── api/
│   ├── routes/
│   │   └── radar.py                   # API endpoints
│   └── schemas/
│       └── radar.py                   # Pydantic schemas
│
└── database/
    └── migrations/
        └── 047_radar_intelligence.sql

tsx/
├── apps/web/src/
│   ├── app/dashboard/radar/
│   │   └── page.tsx                   # Main radar dashboard
│   │
│   └── components/radar/
│       ├── RadarDashboard.tsx         # Main layout
│       ├── BreakingAlerts.tsx         # Top alert cards
│       ├── MarketOverview.tsx         # Game status grid
│       ├── SignalFeed.tsx             # Real-time feed
│       ├── WatchlistManager.tsx       # Game selection
│       ├── AlertCard.tsx              # Individual alert
│       ├── AlertDetailModal.tsx       # Full alert view
│       └── RadarSettings.tsx          # Notification prefs
│
└── packages/api-client/src/
    ├── hooks/
    │   └── useRadar.ts                # React Query hooks
    └── types/
        └── radar.ts                   # TypeScript types
```

---

## API ENDPOINTS

```python
# backend/api/routes/radar.py

router = APIRouter(prefix="/radar", tags=["Radar Intelligence"])

# ============================================================================
# Dashboard Endpoints
# ============================================================================

@router.get("/dashboard")
async def get_radar_dashboard(
    current_user: TokenPayload = Depends(get_current_user),
) -> RadarDashboardResponse:
    """
    Get full radar dashboard data.
    Returns: breaking alerts, market overview, signal feed, watchlist status
    """

@router.get("/alerts")
async def get_alerts(
    game: Optional[str] = None,
    alert_type: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(20, le=50),
    current_user: TokenPayload = Depends(get_current_user),
) -> AlertsListResponse:
    """Get alerts filtered by game/type/severity."""

@router.get("/alerts/{alert_id}")
async def get_alert_detail(
    alert_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> AlertDetailResponse:
    """Get full alert details with AI suggestions."""

@router.post("/alerts/{alert_id}/dismiss")
async def dismiss_alert(
    alert_id: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Dismiss an alert (won't show again)."""

@router.post("/alerts/{alert_id}/acted")
async def mark_alert_acted(
    alert_id: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Mark that user created content from this alert."""

# ============================================================================
# Feed Endpoints
# ============================================================================

@router.get("/feed")
async def get_signal_feed(
    games: Optional[List[str]] = Query(None),
    platforms: Optional[List[str]] = Query(None),
    limit: int = Query(50, le=100),
    current_user: TokenPayload = Depends(get_current_user),
) -> SignalFeedResponse:
    """Get real-time signal feed."""

@router.get("/feed/stream")
async def stream_signal_feed(
    games: Optional[List[str]] = Query(None),
    current_user: TokenPayload = Depends(get_current_user),
):
    """SSE endpoint for real-time feed updates."""

# ============================================================================
# Watchlist Endpoints
# ============================================================================

@router.get("/watchlist")
async def get_watchlist(
    current_user: TokenPayload = Depends(get_current_user),
) -> WatchlistResponse:
    """Get user's game watchlist."""

@router.post("/watchlist")
async def add_to_watchlist(
    request: AddWatchlistRequest,
    current_user: TokenPayload = Depends(get_current_user),
) -> WatchlistItemResponse:
    """Add a game to watchlist."""

@router.put("/watchlist/{game_key}")
async def update_watchlist_item(
    game_key: str,
    request: UpdateWatchlistRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Update notification preferences for a game."""

@router.delete("/watchlist/{game_key}")
async def remove_from_watchlist(
    game_key: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Remove a game from watchlist."""

# ============================================================================
# Market Overview Endpoints
# ============================================================================

@router.get("/market")
async def get_market_overview(
    current_user: TokenPayload = Depends(get_current_user),
) -> MarketOverviewResponse:
    """Get buzz levels and status for all tracked games."""

@router.get("/market/{game_key}")
async def get_game_detail(
    game_key: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> GameDetailResponse:
    """Get detailed stats for a specific game."""

# ============================================================================
# Available Games
# ============================================================================

@router.get("/games")
async def get_available_games() -> AvailableGamesResponse:
    """Get list of all games available for tracking."""
```

---

## PYDANTIC SCHEMAS

```python
# backend/api/schemas/radar.py

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field

# ============================================================================
# Enums
# ============================================================================

AlertType = Literal[
    "exploit", "velocity", "game_event", "drama", 
    "esports", "meta_shift", "trend_forming", "patch_notes"
]
AlertSeverity = Literal["critical", "high", "medium", "low"]
AlertUrgency = Literal["breaking", "developing", "trending", "fading"]
Platform = Literal["reddit", "twitter", "youtube", "twitch", "steam"]

# ============================================================================
# Alert Schemas
# ============================================================================

class AlertContentSuggestions(BaseModel):
    """AI-generated content suggestions for an alert."""
    suggested_title: str
    suggested_hook: str
    suggested_tags: List[str]
    thumbnail_prompt: str
    why_this_works: str

class AlertSource(BaseModel):
    """Source information for an alert."""
    platform: Platform
    url: str
    title: str
    engagement: str  # "1.2k upvotes"
    age: str  # "23 min ago"

class AlertResponse(BaseModel):
    """Full alert response."""
    id: str
    alert_type: AlertType
    severity: AlertSeverity
    urgency: AlertUrgency
    game_key: str
    game_name: str
    
    headline: str
    summary: str
    sources: List[AlertSource]
    
    content_suggestions: Optional[AlertContentSuggestions] = None
    
    opportunity_score: int
    competition_level: str
    time_sensitivity_hours: int
    platforms_detected: int
    
    created_at: datetime
    expires_at: Optional[datetime] = None

class AlertsListResponse(BaseModel):
    """List of alerts."""
    alerts: List[AlertResponse]
    total: int
    has_more: bool

# ============================================================================
# Signal Feed Schemas
# ============================================================================

class SignalFeedItem(BaseModel):
    """Single item in the signal feed."""
    id: str
    platform: Platform
    game_key: str
    
    title: str
    preview: Optional[str] = None
    source_url: str
    author: Optional[str] = None
    
    engagement_display: str  # "847 upvotes"
    age_display: str  # "12 min ago"
    
    signal_type: Optional[str] = None
    keywords_matched: List[str] = Field(default_factory=list)

class SignalFeedResponse(BaseModel):
    """Signal feed response."""
    items: List[SignalFeedItem]
    last_updated: datetime

# ============================================================================
# Watchlist Schemas
# ============================================================================

class WatchlistItemResponse(BaseModel):
    """Single watchlist item."""
    game_key: str
    game_name: str
    game_icon: Optional[str] = None
    enabled: bool
    
    notify_exploits: bool
    notify_events: bool
    notify_drama: bool
    notify_meta: bool
    min_severity: AlertSeverity
    
    # Stats
    alerts_today: int
    last_alert_at: Optional[datetime] = None

class WatchlistResponse(BaseModel):
    """Full watchlist."""
    items: List[WatchlistItemResponse]

class AddWatchlistRequest(BaseModel):
    """Request to add game to watchlist."""
    game_key: str
    notify_exploits: bool = True
    notify_events: bool = True
    notify_drama: bool = False
    notify_meta: bool = True
    min_severity: AlertSeverity = "medium"

class UpdateWatchlistRequest(BaseModel):
    """Request to update watchlist preferences."""
    enabled: Optional[bool] = None
    notify_exploits: Optional[bool] = None
    notify_events: Optional[bool] = None
    notify_drama: Optional[bool] = None
    notify_meta: Optional[bool] = None
    min_severity: Optional[AlertSeverity] = None

# ============================================================================
# Market Overview Schemas
# ============================================================================

class GameMarketStatus(BaseModel):
    """Market status for a single game."""
    game_key: str
    game_name: str
    game_icon: Optional[str] = None
    
    # Buzz metrics
    buzz_change_percent: float  # +12%, -5%
    buzz_trend: Literal["up", "down", "stable"]
    
    # Platform stats
    twitch_viewers: int
    youtube_trending_count: int
    reddit_activity_level: Literal["low", "medium", "high", "viral"]
    
    # Recent activity
    active_alerts: int
    last_alert_type: Optional[AlertType] = None
    last_alert_age: Optional[str] = None  # "2h ago"

class MarketOverviewResponse(BaseModel):
    """Full market overview."""
    games: List[GameMarketStatus]
    last_updated: datetime

# ============================================================================
# Dashboard Schemas
# ============================================================================

class RadarDashboardResponse(BaseModel):
    """Full radar dashboard response."""
    breaking_alerts: List[AlertResponse]  # Top 3-5 critical/high alerts
    market_overview: List[GameMarketStatus]
    recent_feed: List[SignalFeedItem]
    watchlist_summary: List[WatchlistItemResponse]
    last_updated: datetime

# ============================================================================
# Available Games
# ============================================================================

class AvailableGame(BaseModel):
    """Game available for tracking."""
    game_key: str
    game_name: str
    game_icon: Optional[str] = None
    platforms_tracked: List[Platform]
    subreddits: List[str]
    is_popular: bool

class AvailableGamesResponse(BaseModel):
    """List of available games."""
    games: List[AvailableGame]
```

---

## GAME CONFIGURATION

```python
# backend/services/radar/constants.py

TRACKED_GAMES = {
    "fortnite": {
        "name": "Fortnite",
        "icon": "🎯",
        "platforms": ["reddit", "twitter", "youtube", "twitch"],
        "reddit": {
            "subreddits": ["FortNiteBR", "FortniteCompetitive", "FortniteFashion", "FortniteLeaks"],
            "keywords": {
                "exploit": [
                    "glitch", "xp farm", "xp glitch", "exploit", "broken", "infinite",
                    "patched", "before patch", "free xp", "level up fast", "bug",
                ],
                "event": [
                    "downtime", "update", "season", "live event", "patch notes",
                    "new season", "chapter", "maintenance", "servers down",
                ],
                "meta": [
                    "nerf", "buff", "op", "broken weapon", "meta", "tier list",
                    "best loadout", "overpowered", "too strong",
                ],
                "drama": [
                    "banned", "cheater", "hacker", "controversy", "drama",
                ],
            },
        },
        "twitter": {
            "accounts": ["FortniteGame", "FortniteStatus", "HYPEX", "ShiinaBR", "iFireMonkey"],
            "hashtags": ["#Fortnite", "#FortniteUpdate", "#FortniteChapter5"],
        },
        "patch_rss": "https://www.epicgames.com/fortnite/en-US/news/rss",
    },
    
    "minecraft": {
        "name": "Minecraft",
        "icon": "⛏️",
        "platforms": ["reddit", "twitter", "youtube", "twitch"],
        "reddit": {
            "subreddits": ["Minecraft", "MinecraftMemes", "technicalminecraft", "MinecraftDungeons"],
            "keywords": {
                "exploit": [
                    "dupe", "duplication", "glitch", "exploit", "bug", "infinite",
                    "xp farm", "easy xp", "broken",
                ],
                "event": [
                    "snapshot", "update", "1.21", "1.22", "mob vote", "minecraft live",
                    "new update", "patch",
                ],
                "meta": [
                    "best farm", "efficient", "fastest", "op", "broken",
                ],
            },
        },
        "twitter": {
            "accounts": ["Minecraft", "MojangStatus", "MojangStudios"],
            "hashtags": ["#Minecraft", "#MinecraftUpdate"],
        },
    },
    
    "apex": {
        "name": "Apex Legends",
        "icon": "🔫",
        "platforms": ["reddit", "twitter", "youtube", "twitch"],
        "reddit": {
            "subreddits": ["apexlegends", "ApexUncovered", "CompetitiveApex", "ApexLore"],
            "keywords": {
                "exploit": [
                    "exploit", "glitch", "bug", "broken", "infinite", "god mode",
                    "out of map", "wall breach",
                ],
                "event": [
                    "patch", "update", "collection event", "heirloom", "new legend",
                    "season", "split", "ranked reset",
                ],
                "meta": [
                    "nerf", "buff", "tier list", "meta", "best legend", "op",
                    "broken weapon", "loadout",
                ],
            },
        },
        "twitter": {
            "accounts": ["PlayApex", "Respawn", "alphaINTEL"],
            "hashtags": ["#ApexLegends", "#ApexUpdate"],
        },
    },
    
    "valorant": {
        "name": "Valorant",
        "icon": "🎯",
        "platforms": ["reddit", "twitter", "youtube", "twitch"],
        "reddit": {
            "subreddits": ["VALORANT", "ValorantCompetitive", "ValorantMemes"],
            "keywords": {
                "exploit": [
                    "exploit", "glitch", "bug", "broken", "wallbang", "pixel",
                    "one way", "boost",
                ],
                "event": [
                    "patch", "update", "new agent", "new map", "act", "episode",
                    "battle pass",
                ],
                "meta": [
                    "nerf", "buff", "tier list", "meta", "best agent", "op",
                    "broken", "overpowered",
                ],
            },
        },
        "twitter": {
            "accounts": ["PlayVALORANT", "ValorantEsports"],
            "hashtags": ["#VALORANT", "#ValorantUpdate"],
        },
        "patch_rss": "https://playvalorant.com/en-us/news/rss/",
    },
    
    "warzone": {
        "name": "Call of Duty: Warzone",
        "icon": "🪖",
        "platforms": ["reddit", "twitter", "youtube", "twitch"],
        "reddit": {
            "subreddits": ["CODWarzone", "ModernWarfareIII", "CallOfDuty"],
            "keywords": {
                "exploit": [
                    "glitch", "exploit", "bug", "broken", "god mode", "invisible",
                    "wall hack", "under map", "xp glitch",
                ],
                "event": [
                    "update", "patch", "season", "new map", "warzone 2", "mw3",
                    "playlist update",
                ],
                "meta": [
                    "meta", "best loadout", "nerf", "buff", "op", "broken gun",
                    "tier list", "best class",
                ],
            },
        },
        "twitter": {
            "accounts": ["CallofDuty", "RavenSoftware", "CODUpdates"],
            "hashtags": ["#Warzone", "#CallOfDuty", "#MW3"],
        },
    },
    
    "gta": {
        "name": "GTA Online / GTA 6",
        "icon": "🚗",
        "platforms": ["reddit", "twitter", "youtube", "twitch"],
        "reddit": {
            "subreddits": ["gtaonline", "GTA6", "GrandTheftAutoV", "GTALeaks"],
            "keywords": {
                "exploit": [
                    "glitch", "money glitch", "dupe", "exploit", "solo", "afk",
                    "unlimited money", "rp glitch",
                ],
                "event": [
                    "update", "dlc", "new car", "gta 6", "trailer", "release date",
                    "weekly update",
                ],
                "drama": [
                    "leak", "gta 6", "rockstar", "take two",
                ],
            },
        },
        "twitter": {
            "accounts": ["RockstarGames", "GTAonlineNews", "TezFunz2"],
            "hashtags": ["#GTA6", "#GTAOnline"],
        },
    },
    
    "league": {
        "name": "League of Legends",
        "icon": "⚔️",
        "platforms": ["reddit", "twitter", "youtube", "twitch"],
        "reddit": {
            "subreddits": ["leagueoflegends", "summonerschool", "TeamfightTactics"],
            "keywords": {
                "exploit": [
                    "bug", "exploit", "broken", "glitch", "interaction",
                ],
                "event": [
                    "patch", "update", "new champion", "rework", "worlds",
                    "msi", "skin", "event",
                ],
                "meta": [
                    "nerf", "buff", "tier list", "meta", "op", "broken",
                    "best champion", "win rate",
                ],
            },
        },
        "twitter": {
            "accounts": ["LeagueOfLegends", "RiotGames", "LoLEsports"],
            "hashtags": ["#LeagueOfLegends", "#LoL"],
        },
        "patch_rss": "https://www.leagueoflegends.com/en-us/news/rss/",
    },
}

# Keywords that indicate high-value content opportunities
EXPLOIT_KEYWORDS = [
    "glitch", "exploit", "bug", "broken", "infinite", "unlimited",
    "xp farm", "money glitch", "dupe", "duplication", "god mode",
    "patched", "before patch", "hurry", "do this now", "free",
    "easy", "solo", "afk", "fast", "quick",
]

EVENT_KEYWORDS = [
    "update", "patch", "season", "chapter", "new", "just dropped",
    "live event", "downtime", "maintenance", "servers", "release",
    "trailer", "announcement", "reveal",
]

DRAMA_KEYWORDS = [
    "banned", "drama", "controversy", "cheater", "hacker", "exposed",
    "beef", "fight", "drama", "cancelled", "canceled",
]

URGENCY_KEYWORDS = [
    "hurry", "now", "before patch", "limited time", "ending soon",
    "do this now", "act fast", "patched soon",
]
```

---

## TIER ACCESS

```python
# Tier-based access control

RADAR_TIER_ACCESS = {
    "free": {
        "radar_access": False,
        "description": "Upgrade to Pro for Radar Intelligence",
    },
    "pro": {
        "radar_access": True,
        "max_watchlist_games": 3,
        "alert_types": ["exploit", "game_event", "patch_notes"],  # No drama/esports
        "min_severity_allowed": "high",  # Only high/critical alerts
        "push_notifications": False,
        "signal_feed": True,
        "content_suggestions": False,  # No AI suggestions
        "historical_alerts_days": 3,
    },
    "studio": {
        "radar_access": True,
        "max_watchlist_games": 10,
        "alert_types": ["exploit", "game_event", "patch_notes", "drama", "esports", "velocity", "meta_shift", "trend_forming"],
        "min_severity_allowed": "low",  # All severities
        "push_notifications": True,
        "signal_feed": True,
        "content_suggestions": True,  # AI title/hook suggestions
        "historical_alerts_days": 30,
        "discord_webhook": True,
    },
    "unlimited": {
        "radar_access": True,
        "max_watchlist_games": 20,
        "alert_types": "all",
        "min_severity_allowed": "low",
        "push_notifications": True,
        "signal_feed": True,
        "content_suggestions": True,
        "historical_alerts_days": 90,
        "discord_webhook": True,
        "api_access": True,  # Programmatic access
    },
}
```

---

## WORKER SCHEDULES

```python
# Worker execution schedule

RADAR_WORKERS = {
    "reddit_collector": {
        "interval_seconds": 300,      # Every 5 minutes
        "description": "Scan Reddit for new posts",
        "priority": "high",
    },
    "twitter_collector": {
        "interval_seconds": 120,      # Every 2 minutes
        "description": "Scan Twitter for trending topics",
        "priority": "high",
    },
    "youtube_collector": {
        "interval_seconds": 900,      # Every 15 minutes
        "description": "Check YouTube for velocity spikes",
        "priority": "medium",
    },
    "steam_collector": {
        "interval_seconds": 1800,     # Every 30 minutes
        "description": "Check Steam for player count changes",
        "priority": "low",
    },
    "rss_collector": {
        "interval_seconds": 600,      # Every 10 minutes
        "description": "Check patch notes RSS feeds",
        "priority": "high",
    },
    "alert_processor": {
        "interval_seconds": 60,       # Every minute
        "description": "Process signals into alerts",
        "priority": "critical",
    },
    "velocity_calculator": {
        "interval_seconds": 300,      # Every 5 minutes
        "description": "Update velocity baselines",
        "priority": "medium",
    },
    "cleanup": {
        "interval_seconds": 3600,     # Every hour
        "description": "Expire old signals and alerts",
        "priority": "low",
    },
}
```

---

## INTEGRATION WITH EXISTING FEATURES

### Radar → Vibe Branding Pipeline

When an alert fires, we can pre-generate content:

```python
async def on_alert_created(alert: RadarAlert):
    """Hook called when new alert is created."""
    
    # If it's an exploit/event alert, find related thumbnails
    if alert.alert_type in ["exploit", "game_event", "velocity"]:
        # Search YouTube for recent videos on this topic
        related_videos = await youtube_collector.search(
            query=f"{alert.game_name} {alert.headline}",
            max_results=5,
            published_after=datetime.utcnow() - timedelta(hours=24),
        )
        
        if related_videos:
            # Get top performing thumbnail
            top_video = max(related_videos, key=lambda v: v.view_count)
            
            # Queue vibe extraction
            await vibe_branding_service.queue_extraction(
                thumbnail_url=top_video.thumbnail,
                context={
                    "alert_id": alert.id,
                    "purpose": "alert_thumbnail_suggestion",
                }
            )
```

### Radar → Asset Generation Pipeline

```python
async def generate_alert_thumbnail(alert: RadarAlert, user_id: str):
    """Generate a thumbnail for an alert using user's brand kit."""
    
    # Get user's active brand kit
    brand_kit = await brand_kit_service.get_active(user_id)
    
    # Generate thumbnail with alert context
    job = await generation_service.create_job(
        user_id=user_id,
        asset_type="youtube_thumbnail",
        brand_kit_id=brand_kit.id if brand_kit else None,
        custom_prompt=f"""
        Create a YouTube thumbnail for a video about:
        {alert.headline}
        
        Game: {alert.game_name}
        Urgency: {alert.urgency}
        
        Style: High energy, attention-grabbing, gaming content
        Include text: "{alert.content_suggestions.suggested_title[:30]}..."
        """,
    )
    
    return job
```

---

## FRONTEND COMPONENTS

### RadarDashboard Layout

```tsx
// tsx/apps/web/src/app/dashboard/radar/page.tsx

export default function RadarPage() {
  return (
    <PageContainer>
      {/* Breaking Alerts - Top priority */}
      <BreakingAlerts />
      
      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Market Overview + Watchlist */}
        <div className="lg:col-span-1 space-y-6">
          <MarketOverview />
          <WatchlistManager />
        </div>
        
        {/* Right: Signal Feed */}
        <div className="lg:col-span-2">
          <SignalFeed />
        </div>
      </div>
    </PageContainer>
  );
}
```

### Alert Card Component

```tsx
// tsx/apps/web/src/components/radar/AlertCard.tsx

interface AlertCardProps {
  alert: RadarAlert;
  onDismiss: () => void;
  onMakeVideo: () => void;
  onExtractVibe: () => void;
}

function AlertCard({ alert, onDismiss, onMakeVideo, onExtractVibe }: AlertCardProps) {
  const severityColors = {
    critical: 'border-red-500 bg-red-500/10',
    high: 'border-orange-500 bg-orange-500/10',
    medium: 'border-yellow-500 bg-yellow-500/10',
    low: 'border-blue-500 bg-blue-500/10',
  };
  
  const typeIcons = {
    exploit: '🔥',
    velocity: '📈',
    game_event: '🎮',
    drama: '💀',
    esports: '🏆',
    patch_notes: '📦',
    meta_shift: '⚖️',
    trend_forming: '🌊',
  };

  return (
    <div className={cn(
      "border-l-4 rounded-lg p-4",
      severityColors[alert.severity]
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{typeIcons[alert.alert_type]}</span>
          <span className="text-xs font-bold uppercase text-text-muted">
            {alert.alert_type.replace('_', ' ')}
          </span>
          <span className="text-xs text-text-muted">•</span>
          <span className="text-xs text-text-muted">{alert.game_name}</span>
        </div>
        <span className="text-xs text-text-muted">{alert.age}</span>
      </div>
      
      {/* Headline */}
      <h3 className="font-semibold text-text-primary mb-2">
        {alert.headline}
      </h3>
      
      {/* Summary */}
      <p className="text-sm text-text-secondary mb-3">
        {alert.summary}
      </p>
      
      {/* Sources */}
      <div className="flex flex-wrap gap-2 mb-3">
        {alert.sources.map((source, i) => (
          <a
            key={i}
            href={source.url}
            target="_blank"
            className="text-xs px-2 py-1 bg-white/5 rounded hover:bg-white/10"
          >
            {source.platform} • {source.engagement}
          </a>
        ))}
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onMakeVideo}
          className="flex-1 py-2 bg-interactive-600 hover:bg-interactive-500 text-white rounded-lg text-sm font-medium"
        >
          🎬 Make Video
        </button>
        <button
          onClick={onExtractVibe}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
        >
          🎨 Extract Vibe
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-text-muted"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
```

---

## IMPLEMENTATION PHASES

### Phase 1: Reddit Intelligence (Week 1)
- [ ] Reddit collector with OAuth
- [ ] Keyword classifier for exploit/event detection
- [ ] Velocity detector for upvote spikes
- [ ] Basic alert generation
- [ ] Database tables
- [ ] Simple dashboard UI
- [ ] Watchlist management

### Phase 2: Multi-Platform (Week 2)
- [ ] Twitter collector
- [ ] YouTube velocity monitoring
- [ ] Cross-platform correlation
- [ ] Enhanced alert scoring
- [ ] Signal feed UI
- [ ] Market overview component

### Phase 3: AI Enhancement (Week 3)
- [ ] AI content suggestions (title, hook, tags)
- [ ] Thumbnail prompt generation
- [ ] Sentiment analysis
- [ ] Alert summarization
- [ ] Integration with Vibe Branding

### Phase 4: Notifications & Polish (Week 4)
- [ ] Web push notifications
- [ ] Email digest (hourly/daily)
- [ ] Discord webhook integration
- [ ] Mobile push (if mobile app exists)
- [ ] Historical alert browsing
- [ ] Performance optimization

---

## API COST ANALYSIS

```
Reddit API:        FREE (60 req/min with OAuth)
Twitter API:       FREE tier (1500 tweets/month read) or $100/mo for Basic
YouTube Data API:  FREE (10,000 units/day)
Twitch API:        FREE (unlimited, 800 req/min)
Steam API:         FREE (100k req/day)

AI Costs (Gemini):
- Alert summarization: ~$0.001 per alert
- Content suggestions: ~$0.002 per alert
- Estimated 100 alerts/day = ~$0.30/day = ~$9/month

Total estimated cost: $10-110/month depending on Twitter tier
```

---

## SUCCESS METRICS

1. **Alert Accuracy**: % of alerts that users find valuable (not dismissed immediately)
2. **Time to Alert**: Average time from Reddit post to alert delivery
3. **Conversion Rate**: % of alerts that result in content creation
4. **User Retention**: Do Radar users retain better than non-Radar users?
5. **Upgrade Driver**: Does Radar access drive Pro→Studio upgrades?

---

## COMPETITIVE ADVANTAGE

| Feature | TubeBuddy | VidIQ | AuraStream Radar |
|---------|-----------|-------|------------------|
| YouTube trends | ✅ | ✅ | ✅ |
| Twitch data | ❌ | ❌ | ✅ |
| Reddit monitoring | ❌ | ❌ | ✅ |
| Exploit alerts | ❌ | ❌ | ✅ |
| Real-time push | ❌ | ❌ | ✅ |
| AI content suggestions | ❌ | ❌ | ✅ |
| Thumbnail generation | ❌ | ❌ | ✅ |
| Cross-platform correlation | ❌ | ❌ | ✅ |

**The moat**: They show you data. We show you data AND help you act on it in minutes.

---

## EXAMPLE ALERT FLOW

```
T+0:00  - Reddit user posts "NEW FORTNITE XP GLITCH - Chapter 5 Creative Mode"
T+0:05  - Reddit collector picks up post (25 upvotes)
T+0:10  - Post hits 100 upvotes, velocity detector flags spike
T+0:11  - Keyword classifier: "exploit" (xp glitch, fortnite)
T+0:12  - Alert generator creates alert:
          - Type: exploit
          - Severity: high
          - Urgency: breaking
          - Headline: "Fortnite XP Glitch Discovered in Creative Mode"
          - Suggested title: "This XP Glitch Will Be PATCHED (Do It NOW)"
T+0:13  - Alert pushed to all users with Fortnite in watchlist
T+0:15  - Creator opens AuraStream, sees alert
T+0:16  - Clicks "Make Video", thumbnail auto-generated
T+0:20  - Creator starts recording
T+0:45  - Video uploaded with optimized title/thumbnail
T+1:00  - Creator is FIRST on YouTube for this glitch
T+2:00  - Other creators start uploading
T+4:00  - Glitch patched by Epic
T+24:00 - Creator's video has 500k views, others have 50k
```

---

*This schema defines the Bloomberg Terminal for gaming content. Real-time intelligence, actionable alerts, and the speed advantage that turns trends into views.*


---

## CLIP RADAR - VIRAL CLIP VELOCITY TRACKER

### Overview

The Clip Radar is a real-time viral clip detection system that monitors Twitch clips across 
gaming categories, tracking view velocity to surface trending content before it goes mainstream.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REAL-TIME LAYER (Redis)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Poll every 5 minutes:                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │ Fetch clips │ -> │ Track views │ -> │ Calculate   │                     │
│  │ per category│    │ in Redis    │    │ velocity    │                     │
│  └─────────────┘    └─────────────┘    └─────────────┘                     │
│                                              │                              │
│                                              ▼                              │
│                     ┌─────────────────────────────────────┐                │
│                     │ Viral Detection (5+ views/min)      │                │
│                     │ - Store in sorted set by velocity   │                │
│                     │ - Track for daily aggregation       │                │
│                     └─────────────────────────────────────┘                │
│                                                                             │
│  Data retention: 24 hours (auto-expire via TTL)                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                          6am UTC daily
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      HISTORICAL LAYER (PostgreSQL)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Daily Recap Compression:                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ clip_radar_daily_recaps                                              │   │
│  │ - Top 10 clips overall                                               │   │
│  │ - Total clips/views/viral count                                      │   │
│  │ - Peak velocity                                                      │   │
│  │ - Category breakdown summary                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ clip_radar_category_recaps                                           │   │
│  │ - Top 5 clips per category                                           │   │
│  │ - Hourly activity breakdown (24 entries)                             │   │
│  │ - Category-specific stats                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Retention: Indefinite (compressed summaries are small)                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tracked Categories

```python
TRACKED_CATEGORIES = {
    "509658": "Just Chatting",
    "33214": "Fortnite",
    "516575": "Valorant",
    "512710": "Call of Duty: Warzone",
    "511224": "Apex Legends",
    "491931": "Escape from Tarkov",
    "21779": "League of Legends",
    "32399": "Counter-Strike",
    "32982": "Grand Theft Auto V",
    "27471": "Minecraft",
}
```

### Velocity Thresholds

```python
VIRAL_VELOCITY_THRESHOLD = 10.0   # views/minute = 🔥 Exploding
HIGH_VELOCITY_THRESHOLD = 5.0     # views/minute = 📈 Trending
MINIMUM_VIEWS_FOR_VIRAL = 50      # Must have at least this many views
```

### API Endpoints

```
# Live Data (from Redis)
GET  /api/v1/clip-radar/viral          # Current viral clips sorted by velocity
GET  /api/v1/clip-radar/fresh          # Fresh clips from last N minutes
GET  /api/v1/clip-radar/status         # Radar status and last poll time
POST /api/v1/clip-radar/poll           # Manually trigger a poll
GET  /api/v1/clip-radar/categories     # List tracked categories

# Historical Recaps (from PostgreSQL)
GET  /api/v1/clip-radar/recaps                           # Recent daily recaps
GET  /api/v1/clip-radar/recaps/{date}                    # Specific day's recap
GET  /api/v1/clip-radar/recaps/{date}/category/{game_id} # Category detail
POST /api/v1/clip-radar/recaps/create                    # Manually create recap
```

### Workers

```bash
# Real-time polling (every 5 minutes)
python -m backend.workers.clip_radar_worker

# Daily recap compression (runs at 6am UTC)
python -m backend.workers.clip_radar_recap_worker

# Or run recap manually
python -m backend.workers.clip_radar_recap_worker --once
python -m backend.workers.clip_radar_recap_worker --date 2025-12-29
```

### Database Tables

```sql
-- Daily summaries
clip_radar_daily_recaps (
    recap_date DATE UNIQUE,
    total_clips_tracked INTEGER,
    total_viral_clips INTEGER,
    total_views_tracked BIGINT,
    peak_velocity FLOAT,
    top_clips JSONB,           -- Top 10 clips
    category_stats JSONB,      -- Per-category summary
    polls_count INTEGER,
    first_poll_at TIMESTAMPTZ,
    last_poll_at TIMESTAMPTZ
)

-- Per-category daily details
clip_radar_category_recaps (
    recap_date DATE,
    game_id TEXT,
    game_name TEXT,
    total_clips INTEGER,
    total_views BIGINT,
    viral_clips_count INTEGER,
    avg_velocity FLOAT,
    peak_velocity FLOAT,
    top_clips JSONB,           -- Top 5 clips
    hourly_activity JSONB,     -- 24 hourly entries
    UNIQUE(recap_date, game_id)
)
```

### Redis Keys

```
clip_radar:clip_views      # Hash: clip_id -> view_count
clip_radar:clip_data       # Hash: clip_id -> JSON metadata
clip_radar:viral           # Sorted set by velocity
clip_radar:last_poll       # String: ISO timestamp
clip_radar:daily_stats:{date}      # Daily aggregation
clip_radar:daily_clips:{date}      # Daily viral clips
clip_radar:daily_category:{date}:{game_id}  # Per-category daily
```

### User Flow

1. **Live View**: Users see real-time viral clips updated every 5 minutes
2. **Historical View**: Users can browse previous days' top clips
3. **Category Drill-down**: View top clips per game for any date
4. **Hourly Patterns**: See when clips went viral (hourly breakdown)

### Cron Setup (Production)

```bash
# Add to crontab for daily recap at 6am UTC
0 6 * * * cd /app && python -m backend.workers.clip_radar_recap_worker --once >> /var/log/clip_radar_recap.log 2>&1

# Or use systemd timer for the polling worker
# clip_radar_worker.service runs continuously with 5-min sleep
```
