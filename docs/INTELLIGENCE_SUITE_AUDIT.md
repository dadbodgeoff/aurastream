# 📊 AURASTREAM INTELLIGENCE SUITE AUDIT
## Enterprise Analytics Architecture Review

**Version:** 1.0.0  
**Date:** December 30, 2025  
**Author:** Analytics Engineering Team  
**Purpose:** Comprehensive mapping of Clip Radar, Trends, Playbook, and Thumbnail Intel modules

---

## EXECUTIVE SUMMARY

AuraStream's Intelligence Suite consists of four interconnected modules that provide content creators with real-time and historical insights into trending content, viral patterns, and optimal content strategies. This audit maps all features, their current implementation, and recommends enterprise-grade groupings.

### Module Overview

| Module | Purpose | Data Source | Update Frequency |
|--------|---------|-------------|------------------|
| **Clip Radar** | Viral clip velocity detection | Twitch Clips API | Every 5 minutes |
| **Trends** | Platform trending aggregation | YouTube + Twitch APIs | 2-15 minutes |
| **Playbook** | AI-generated strategy reports | Aggregated trend data | Daily |
| **Thumbnail Intel** | AI thumbnail pattern analysis | Gemini Vision API | Daily |

---

## ENTERPRISE ANALYTICS GROUPING

### Recommended Domain Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INTELLIGENCE PLATFORM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    REAL-TIME ANALYTICS DOMAIN                        │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │
│  │  │  Clip Radar     │  │  Twitch Live    │  │  Velocity       │      │   │
│  │  │  (5 min poll)   │  │  (2 min poll)   │  │  Alerts         │      │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    TREND AGGREGATION DOMAIN                          │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │
│  │  │  YouTube        │  │  Twitch Games   │  │  Trending       │      │   │
│  │  │  Trending       │  │  Rankings       │  │  Keywords       │      │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    AI INSIGHTS DOMAIN                                │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │
│  │  │  Playbook       │  │  Thumbnail      │  │  Content        │      │   │
│  │  │  Reports        │  │  Intel          │  │  Strategies     │      │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    HISTORICAL ANALYTICS DOMAIN                       │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │
│  │  │  Daily Recaps   │  │  Trend History  │  │  Pattern        │      │   │
│  │  │  (Clip Radar)   │  │  (7-30 days)    │  │  Analysis       │      │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## MODULE 1: CLIP RADAR

### Purpose
Real-time viral clip detection across 10 gaming categories. Tracks view velocity (views/minute) to identify clips gaining momentum before they explode.

### Current Implementation

#### Backend API Endpoints (9 total)

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/clip-radar/viral` | GET | Viral clips (5+ views/min) | Public |
| `/clip-radar/fresh` | GET | Fresh clips from last N minutes | Public |
| `/clip-radar/status` | GET | Radar status and last poll time | Public |
| `/clip-radar/poll` | POST | Manually trigger poll | Public |
| `/clip-radar/categories` | GET | List tracked categories | Public |
| `/clip-radar/recaps` | GET | Recent daily recaps | Public |
| `/clip-radar/recaps/{date}` | GET | Specific daily recap | Public |
| `/clip-radar/recaps/{date}/category/{gameId}` | GET | Category-specific recap | Public |
| `/clip-radar/recaps/create` | POST | Manually create recap | Public |

#### Backend Files

```
backend/
├── api/routes/clip_radar.py          # 9 endpoints, ~350 lines
├── services/clip_radar/
│   ├── __init__.py                   # Module exports
│   ├── service.py                    # Core ClipRadarService (~300 lines)
│   ├── recap_service.py              # Daily recap compression (~250 lines)
│   ├── models.py                     # TrackedClip, ViralClip, CategoryClipStats
│   └── constants.py                  # TRACKED_CATEGORIES, thresholds
├── workers/
│   ├── clip_radar_worker.py          # 5-minute polling worker
│   └── clip_radar_recap_worker.py    # 6am daily recap worker
└── database/migrations/
    └── 047_clip_radar_recaps.sql     # Daily/category recap tables
```

#### Database Schema

**clip_radar_daily_recaps**
```sql
- recap_date DATE UNIQUE
- total_clips_tracked INTEGER
- total_viral_clips INTEGER
- total_views_tracked BIGINT
- peak_velocity FLOAT
- top_clips JSONB (max 10)
- category_stats JSONB
- polls_count INTEGER
- first_poll_at, last_poll_at TIMESTAMPTZ
```

**clip_radar_category_recaps**
```sql
- recap_date DATE
- game_id TEXT
- game_name TEXT
- total_clips, total_views, viral_clips_count
- avg_velocity, peak_velocity FLOAT
- top_clips JSONB (max 5)
- hourly_activity JSONB (24 entries)
- UNIQUE(recap_date, game_id)
```

#### Frontend Implementation

```
tsx/
├── apps/web/src/app/dashboard/clip-radar/
│   └── page.tsx                      # Main page (~600 lines)
├── packages/api-client/src/
│   ├── hooks/useClipRadar.ts         # 10 React Query hooks
│   └── types/clipRadar.ts            # TypeScript types
└── components/dashboard/
    └── icons.tsx                     # ClipRadarIcon
```

#### React Query Hooks

| Hook | Cache TTL | Auto-Refresh |
|------|-----------|--------------|
| `useViralClips(gameId?, limit)` | 30s | Every 30s |
| `useFreshClips(gameId?, maxAge, limit)` | 60s | No |
| `useRadarStatus()` | 60s | No |
| `useTrackedCategories()` | 1 hour | No |
| `useRecentRecaps(days)` | 5 min | No |
| `useDailyRecap(date)` | 1 hour | No |
| `useCategoryRecap(date, gameId)` | 1 hour | No |
| `useTriggerPoll()` | Mutation | N/A |
| `useCreateRecap()` | Mutation | N/A |

#### Tracked Categories (10)

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

#### Velocity Thresholds

```python
VIRAL_VELOCITY_THRESHOLD = 10.0   # views/min = 🔥 Exploding
HIGH_VELOCITY_THRESHOLD = 5.0     # views/min = 📈 Trending
MINIMUM_VIEWS_FOR_VIRAL = 50      # Minimum views required
```

#### Data Flow

```
Twitch Clips API
    │
    ▼ (every 5 min)
ClipRadarService.poll_clips()
    │
    ├──► Redis (live clips, 24h TTL)
    │       ├── clip_radar:clip_views (Hash)
    │       ├── clip_radar:clip_data (Hash)
    │       ├── clip_radar:viral (Sorted Set)
    │       └── clip_radar:last_poll (String)
    │
    └──► RecapService.track_poll_results()
            │
            ▼ (6am UTC daily)
        RecapService.create_daily_recap()
            │
            ▼
        PostgreSQL (permanent storage)
            ├── clip_radar_daily_recaps
            └── clip_radar_category_recaps
```

---

## MODULE 2: TRENDS

### Purpose
Aggregates trending content from YouTube and Twitch, analyzes patterns, and delivers actionable insights through a tabbed dashboard.

### Current Implementation

#### Backend API Endpoints (13 total)

| Endpoint | Method | Description | Auth | Tier |
|----------|--------|-------------|------|------|
| `/trends/daily-brief` | GET | Compiled daily brief | Optional | All |
| `/trends/youtube/trending` | GET | YouTube trending by category | Optional | All |
| `/trends/youtube/games` | GET | YouTube gaming with pagination | Optional | All |
| `/trends/youtube/games/available` | GET | Available game filters | Optional | All |
| `/trends/youtube/search` | POST | Niche search | Required | Pro+ |
| `/trends/twitch/live` | GET | Top live streams | Optional | All |
| `/trends/twitch/games` | GET | Top games with viewer counts | Optional | All |
| `/trends/twitch/clips` | GET | Top clips by period | Optional | All |
| `/trends/keywords/{category}` | GET | Trending keywords | Optional | All |
| `/trends/velocity/alerts` | GET | Velocity alerts | Required | Studio |
| `/trends/timing/{category}` | GET | Optimal posting times | Required | Pro+ |
| `/trends/history` | GET | Historical trend data | Required | Pro+ |
| `/trends/thumbnail/{videoId}/analysis` | GET | AI thumbnail analysis | Required | Rate-limited |

#### Backend Files

```
backend/
├── api/routes/trends.py              # 13 endpoints, ~1000 lines
├── api/schemas/trends.py             # Pydantic schemas
├── services/trends/
│   ├── __init__.py                   # Module exports
│   ├── youtube_collector.py          # YouTube API client (~400 lines)
│   ├── twitch_collector.py           # Twitch API client (~600 lines)
│   └── trend_service.py              # Aggregation service
└── database/migrations/
    └── 042_trend_intelligence.sql    # 8 tables
```

#### Database Schema (8 tables)

**trend_youtube_snapshots** - Daily YouTube trending
```sql
- snapshot_date DATE
- category TEXT (gaming/entertainment/music/education)
- region TEXT DEFAULT 'US'
- videos JSONB
- total_views, total_likes BIGINT
- avg_engagement_rate NUMERIC
- top_words, color_patterns JSONB
- UNIQUE(snapshot_date, category, region)
```

**trend_youtube_videos** - Enriched video details
```sql
- video_id TEXT UNIQUE
- snapshot_id UUID FK
- title, channel_id, channel_title, category
- view_count, like_count, comment_count BIGINT
- engagement_rate, viral_score, velocity_score
- title_analysis, thumbnail_analysis JSONB
```

**trend_twitch_snapshots** - 15-minute live snapshots
```sql
- snapshot_time TIMESTAMPTZ
- top_streams, top_games JSONB
- total_viewers BIGINT
- total_streams INTEGER
```

**trend_twitch_hourly** - Hourly rollups
```sql
- hour_start TIMESTAMPTZ UNIQUE
- game_rankings, rising_streamers JSONB
- peak_total_viewers, peak_stream_count
```

**trend_thumbnail_analysis** - AI analysis cache
```sql
- source_type TEXT (youtube/twitch)
- source_id TEXT
- has_face, face_count, face_emotions
- has_text, detected_text
- dominant_colors, color_mood, composition
- complexity_score, thumbnail_score
- UNIQUE(source_type, source_id)
```

**trend_daily_briefs** - Compiled insights
```sql
- brief_date DATE UNIQUE
- thumbnail_of_day, youtube_highlights, twitch_highlights JSONB
- hot_games, rising_creators, insights JSONB
- best_upload_times, best_stream_times JSONB
- title_patterns, thumbnail_patterns JSONB
```

**trend_user_searches** - Pro+ search history
```sql
- user_id UUID FK
- query TEXT
- category TEXT
- results JSONB
- result_count INTEGER
- expires_at TIMESTAMPTZ
```

**trend_velocity_alerts** - Studio tier alerts
```sql
- alert_type TEXT (game_spike/video_viral/streamer_rising)
- platform TEXT (youtube/twitch)
- subject_id, subject_name, subject_thumbnail
- current_value, previous_value, change_percent, velocity_score
- severity TEXT (low/medium/high/critical)
- is_active BOOLEAN
- expires_at TIMESTAMPTZ
```

#### Frontend Implementation

```
tsx/
├── apps/web/src/app/dashboard/trends/
│   └── page.tsx                      # Main page (~1200 lines)
├── packages/api-client/src/
│   ├── hooks/useTrends.ts            # 14 React Query hooks
│   └── types/trends.ts               # TypeScript types
```

#### React Query Hooks

| Hook | Cache TTL | Auto-Refresh |
|------|-----------|--------------|
| `useDailyBrief()` | 1 hour | No |
| `useYouTubeTrending(category, limit)` | 1 hour | No |
| `useTwitchLive(limit, gameId)` | 2 min | Every 2 min |
| `useTwitchGames(limit)` | 2 min | Every 2 min |
| `useTwitchClips(gameId, period, limit)` | 5 min | No |
| `useTrendingKeywords(category)` | 30 min | No |
| `useYouTubeGameTrending(params)` | 5 min | No |
| `useAvailableGames()` | 24 hours | No |
| `useThumbnailAnalysis(videoId)` | N/A | No |
| `useVelocityAlerts()` | 5 min | Every 5 min |
| `useTiming(category)` | 24 hours | No |
| `useTrendHistory(days)` | 1 hour | No |
| `useYouTubeSearch()` | Mutation | N/A |

#### Tier Limits

```python
SEARCH_LIMITS = {"free": 0, "pro": 10, "studio": 50, "unlimited": 100}
THUMBNAIL_LIMITS = {"free": 3, "pro": 20, "studio": 1000, "unlimited": 1000}
HISTORY_DAYS = {"free": 0, "pro": 7, "studio": 30, "unlimited": 30}
```

#### Game Search Terms

```python
GAME_SEARCH_TERMS = {
    "fortnite": {"query": "fortnite", "display": "Fortnite"},
    "warzone": {"query": "warzone OR call of duty warzone", "display": "Warzone"},
    "valorant": {"query": "valorant", "display": "Valorant"},
    "minecraft": {"query": "minecraft", "display": "Minecraft"},
    "apex_legends": {"query": "apex legends", "display": "Apex Legends"},
    "league_of_legends": {"query": "league of legends OR lol esports", "display": "League of Legends"},
    "gta": {"query": "gta 5 OR gta online OR grand theft auto", "display": "GTA"},
    "roblox": {"query": "roblox", "display": "Roblox"},
    "call_of_duty": {"query": "call of duty OR cod", "display": "Call of Duty"},
    "arc_raiders": {"query": "arc raiders", "display": "Arc Raiders"},
}
```

#### Major Categories (Deep Fetching)

```python
# These categories fetch 500 streams (5 pages) for accurate viewer counts
MAJOR_CATEGORIES = {
    "509658",   # Just Chatting
    "33214",    # Fortnite
    "512710",   # Call of Duty: Warzone
    "516575",   # Valorant
    "511224",   # Apex Legends
    "21779",    # League of Legends
    "32982",    # Grand Theft Auto V
    "32399",    # Counter-Strike
    "27471",    # Minecraft
    "491931",   # Escape from Tarkov
}
```

#### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL APIs                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  YouTube Data API v3          │  Twitch Helix API                           │
│  - 10k daily quota            │  - 800 req/min (free)                       │
│  - 100 units per search       │  - No daily limit                           │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                               │
                    ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COLLECTOR SERVICES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  youtube_collector.py                │  twitch_collector.py                 │
│  - fetch_trending(category)          │  - fetch_top_streams(limit)          │
│  - fetch_gaming_videos(game)         │  - fetch_top_games()                 │
│  - search_videos(query) [Pro+]       │  - fetch_streams_paginated(game_id)  │
│  - analyze_thumbnail(video_id)       │  - fetch_clips(game_id, period)      │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TREND SERVICE                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  trend_service.py                                                           │
│  - compile_daily_brief()                                                    │
│  - get_velocity_alerts() [Studio]                                           │
│  - get_optimal_timing(category) [Pro+]                                      │
│  - get_trend_history(days) [Pro+]                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌─────────────────────────────┐   ┌─────────────────────────────────────────┐
│         REDIS               │   │              POSTGRESQL                  │
│  (Real-time cache)          │   │  (Historical storage)                    │
├─────────────────────────────┤   ├─────────────────────────────────────────┤
│  - Trending videos (15 min) │   │  - trend_youtube_snapshots              │
│  - Live streams (2 min)     │   │  - trend_youtube_videos                 │
│  - Velocity alerts (5 min)  │   │  - trend_twitch_snapshots               │
│  - Search cache (1 hour)    │   │  - trend_twitch_hourly                  │
└─────────────────────────────┘   │  - trend_thumbnail_analysis             │
                                  │  - trend_daily_briefs                   │
                                  │  - trend_user_searches                  │
                                  │  - trend_velocity_alerts                │
                                  └─────────────────────────────────────────┘
```

---

## MODULE 3: PLAYBOOK

### Purpose
AI-generated daily strategy reports that synthesize trend data into actionable insights. Provides golden hours, niche opportunities, viral hooks, title formulas, and content strategies.

### Current Implementation

#### Backend API Endpoints (5 total)

| Endpoint | Method | Description | Auth | Tier |
|----------|--------|-------------|------|------|
| `/playbook/latest` | GET | Most recent playbook report | Optional | All |
| `/playbook/reports` | GET | List recent reports (limit param) | Optional | All |
| `/playbook/reports/{id}` | GET | Specific report by ID | Optional | All |
| `/playbook/generate` | POST | Manual generation trigger | Required | Studio |
| `/playbook/unviewed-count` | GET | Unviewed reports count | Required | All |

#### Backend Files

```
backend/
├── api/routes/playbook.py            # 5 endpoints, ~150 lines
├── api/schemas/playbook.py           # Pydantic schemas
├── services/playbook/
│   ├── __init__.py                   # Module exports, get_playbook_service()
│   ├── service.py                    # PlaybookService (~400 lines)
│   ├── repository.py                 # Database operations
│   ├── generator.py                  # AI report generation
│   └── prompts.py                    # LLM prompt templates
└── database/migrations/
    └── 043_streamer_playbook.sql     # 3 tables
```

#### Database Schema (3 tables)

**playbook_reports** - Generated reports
```sql
- id UUID PRIMARY KEY
- report_date DATE
- report_time TIME
- report_timestamp TIMESTAMPTZ
- headline TEXT
- subheadline TEXT
- mood TEXT ('bullish'|'cautious'|'opportunity'|'competitive')
- total_twitch_viewers BIGINT
- total_youtube_gaming_views BIGINT
- trending_game TEXT
- viral_video_count INT
- golden_hours JSONB
- niche_opportunities JSONB
- viral_hooks JSONB
- title_formulas JSONB
- thumbnail_recipes JSONB
- strategies JSONB
- insight_cards JSONB
- trending_hashtags TEXT[]
- title_keywords TEXT[]
- daily_mantra TEXT
- success_story TEXT
- data_sources JSONB
- generation_duration_ms INT
- UNIQUE(report_date, report_time)
```

**user_playbook_preferences** - User personalization
```sql
- user_id UUID FK UNIQUE
- favorite_games TEXT[]
- notify_on_new_report BOOLEAN
- notify_golden_hours BOOLEAN
- timezone TEXT
- last_viewed_report_id UUID FK
- last_viewed_at TIMESTAMPTZ
```

**user_playbook_views** - View tracking
```sql
- user_id UUID FK
- report_id UUID FK
- viewed_at TIMESTAMPTZ
- UNIQUE(user_id, report_id)
```

#### Frontend Implementation

```
tsx/
├── apps/web/src/app/dashboard/playbook/
│   └── page.tsx                      # Main page (~970 lines)
├── apps/web/src/components/playbook/
│   ├── WeeklyHeatmap.tsx             # Schedule heatmap
│   ├── VideoIdeasSection.tsx         # AI video ideas
│   └── ThumbnailIntelSection.tsx     # Thumbnail integration
├── packages/api-client/src/
│   ├── hooks/usePlaybook.ts          # 4 React Query hooks
│   └── types/playbook.ts             # TypeScript types
```

#### React Query Hooks

| Hook | Cache TTL | Auto-Refresh |
|------|-----------|--------------|
| `useLatestPlaybook(enabled)` | 5 min | No |
| `usePlaybookReports(limit, enabled)` | 5 min | No |
| `usePlaybookReport(reportId, enabled)` | 1 hour | No |
| `useUnviewedPlaybookCount(enabled)` | 5 min | No |

#### Key TypeScript Types

```typescript
interface TodaysPlaybook {
  playbookDate: string;
  generatedAt: string;
  headline: string;
  subheadline: string;
  mood: 'bullish' | 'cautious' | 'opportunity' | 'competitive';
  totalTwitchViewers: number;
  totalYoutubeGamingViews: number;
  trendingGame: string;
  viralVideoCount: number;
  goldenHours: GoldenHourWindow[];
  weeklySchedule?: WeeklySchedule;
  nicheOpportunities: NicheOpportunity[];
  viralHooks: ViralHook[];
  titleFormulas: TitleFormula[];
  thumbnailRecipes: ThumbnailRecipe[];
  videoIdeas: VideoIdea[];
  strategies: ContentStrategy[];
  insightCards: InsightCard[];
  trendingHashtags: string[];
  titleKeywords: string[];
  dailyMantra: string;
  successStory?: string;
}

interface GoldenHourWindow {
  day: string;
  startHour: number;
  endHour: number;
  timezone: string;
  competitionLevel: 'low' | 'medium' | 'high';
  viewerAvailability: 'low' | 'medium' | 'high';
  opportunityScore: number;
  reasoning: string;
}

interface NicheOpportunity {
  gameOrNiche: string;
  currentViewers: number;
  streamCount: number;
  avgViewersPerStream: number;
  saturationScore: number;
  growthPotential: 'low' | 'moderate' | 'high' | 'explosive';
  whyNow: string;
  suggestedAngle: string;
  thumbnailUrl?: string;
}

interface ContentStrategy {
  strategyId: string;
  title: string;
  description: string;
  whyItWorks: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  timeInvestment: string;
  expectedImpact: 'minimal' | 'moderate' | 'significant' | 'game_changer';
  steps: string[];
  proTip?: string;
  toolsNeeded: string[];
}
```

#### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Trends Module              │  Clip Radar Module                            │
│  - YouTube trending         │  - Viral clips                                │
│  - Twitch live streams      │  - Category stats                             │
│  - Game rankings            │  - Velocity data                              │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PLAYBOOK GENERATOR                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  generator.py                                                               │
│  - Aggregates trend data from all sources                                   │
│  - Calls LLM (Claude/GPT) with structured prompts                           │
│  - Generates golden hours, niches, hooks, strategies                        │
│  - Validates and structures output                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PLAYBOOK SERVICE                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  service.py                                                                 │
│  - generate_playbook(save_to_db)                                            │
│  - get_latest_playbook()                                                    │
│  - get_playbook_by_id(report_id)                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      POSTGRESQL                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  playbook_reports                                                           │
│  - Stores complete generated reports                                        │
│  - Indexed by report_timestamp DESC                                         │
│  - Unique constraint on (report_date, report_time)                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## MODULE 4: THUMBNAIL INTEL

### Purpose
AI-powered thumbnail analysis using Gemini Vision API. Analyzes top-performing thumbnails per gaming category and extracts patterns, color palettes, and actionable recipes.

### Current Implementation

#### Backend API Endpoints (3 total)

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/thumbnail-intel/categories` | GET | List gaming categories | Public |
| `/thumbnail-intel/overview` | GET | All category insights | Public |
| `/thumbnail-intel/category/{key}` | GET | Specific category insight | Public |

#### Backend Files

```
backend/
├── api/routes/thumbnail_intel.py     # 3 endpoints, ~150 lines
├── api/schemas/thumbnail_intel.py    # Pydantic schemas
├── services/thumbnail_intel/
│   ├── __init__.py                   # Module exports
│   ├── service.py                    # ThumbnailIntelService
│   ├── analyzer.py                   # Gemini Vision integration
│   ├── constants.py                  # GAMING_CATEGORIES config
│   └── models.py                     # Data models
├── workers/
│   └── thumbnail_intel_worker.py     # Daily 6am analysis worker
└── database/migrations/
    └── 046_thumbnail_intel.sql       # 1 table
```

#### Database Schema (1 table)

**thumbnail_intel**
```sql
- id UUID PRIMARY KEY
- category_key TEXT
- category_name TEXT
- analysis_date DATE
- thumbnails JSONB (array of analyses)
- common_layout TEXT
- common_colors TEXT[]
- common_elements TEXT[]
- ideal_layout TEXT
- ideal_color_palette TEXT[]
- must_have_elements TEXT[]
- avoid_elements TEXT[]
- category_style_summary TEXT
- pro_tips TEXT[]
- UNIQUE(category_key, analysis_date)
```

#### Frontend Implementation

```
tsx/
├── packages/api-client/src/
│   ├── hooks/useThumbnailIntel.ts    # 3 React Query hooks
│   └── types/thumbnailIntel.ts       # TypeScript types
└── apps/web/src/components/playbook/
    └── ThumbnailIntelSection.tsx     # Embedded in Playbook page
```

#### React Query Hooks

| Hook | Cache TTL | Auto-Refresh |
|------|-----------|--------------|
| `useThumbnailCategories(enabled)` | 1 hour | No |
| `useThumbnailIntelOverview(enabled)` | 1 hour | No |
| `useCategoryInsight(categoryKey, enabled)` | 1 hour | No |

#### Gaming Categories (10)

```python
GAMING_CATEGORIES = {
    "fortnite": {"name": "Fortnite", "color_theme": "#9D4DFF"},
    "warzone": {"name": "Warzone", "color_theme": "#4CAF50"},
    "valorant": {"name": "Valorant", "color_theme": "#FF4655"},
    "minecraft": {"name": "Minecraft", "color_theme": "#7CB342"},
    "apex_legends": {"name": "Apex Legends", "color_theme": "#DA292A"},
    "league_of_legends": {"name": "League of Legends", "color_theme": "#C89B3C"},
    "gta": {"name": "GTA", "color_theme": "#FF9800"},
    "roblox": {"name": "Roblox", "color_theme": "#E31B23"},
    "call_of_duty": {"name": "Call of Duty", "color_theme": "#1B5E20"},
    "just_chatting": {"name": "Just Chatting", "color_theme": "#9146FF"},
}
```

#### Key TypeScript Types

```typescript
interface ThumbnailAnalysis {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  viewCount: number;
  layoutType: string;
  textPlacement: string;
  focalPoint: string;
  dominantColors: string[];
  colorMood: string;
  backgroundStyle: string;
  hasFace: boolean;
  hasText: boolean;
  textContent?: string;
  hasBorder: boolean;
  hasGlowEffects: boolean;
  hasArrowsCircles: boolean;
  layoutRecipe: string;
  colorRecipe: string;
  whyItWorks: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface CategoryInsight {
  categoryKey: string;
  categoryName: string;
  analysisDate: string;
  thumbnails: ThumbnailAnalysis[];
  commonLayout: string;
  commonColors: string[];
  commonElements: string[];
  idealLayout: string;
  idealColorPalette: string[];
  mustHaveElements: string[];
  avoidElements: string[];
  categoryStyleSummary: string;
  proTips: string[];
}

interface ThumbnailIntelOverview {
  analysisDate: string;
  categories: CategoryInsight[];
  totalThumbnailsAnalyzed: number;
}
```

#### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         YOUTUBE DATA API                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Search for top videos per gaming category                                  │
│  - Query: "{game} gameplay" OR "{game} highlights"                          │
│  - Filter: viewCount > 100k, published last 7 days                          │
│  - Limit: 10 thumbnails per category                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      THUMBNAIL ANALYZER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  analyzer.py (Gemini Vision API)                                            │
│  - Downloads thumbnail images                                               │
│  - Sends to Gemini with structured prompt                                   │
│  - Extracts: layout, colors, text, faces, effects                           │
│  - Generates: recipes, tips, difficulty rating                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      THUMBNAIL INTEL SERVICE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  service.py                                                                 │
│  - aggregate_category_patterns()                                            │
│  - generate_category_recommendations()                                      │
│  - save_daily_analysis()                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      POSTGRESQL                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  thumbnail_intel                                                            │
│  - One row per category per day                                             │
│  - Indexed by (category_key, analysis_date DESC)                            │
│  - Public read access (no auth required)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```


---

## CROSS-MODULE DATA FLOW

### System Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL DATA SOURCES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  Twitch Helix   │  │  YouTube Data   │  │  Gemini Vision  │             │
│  │  API (Free)     │  │  API v3         │  │  API            │             │
│  │  800 req/min    │  │  10k units/day  │  │  Pay-per-use    │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
└───────────┼────────────────────┼────────────────────┼───────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           COLLECTOR LAYER                                      │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐   │
│  │  twitch_collector   │  │  youtube_collector  │  │  thumbnail_analyzer │   │
│  │  - Live streams     │  │  - Trending videos  │  │  - Vision analysis  │   │
│  │  - Top games        │  │  - Gaming search    │  │  - Pattern extract  │   │
│  │  - Clips            │  │  - Thumbnails       │  │  - Recipe generate  │   │
│  └──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘   │
│             │                        │                        │               │
└─────────────┼────────────────────────┼────────────────────────┼───────────────┘
              │                        │                        │
              ▼                        ▼                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE LAYER                                        │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐               │
│  │  ClipRadarSvc   │  │  TrendService   │  │  ThumbnailIntel │               │
│  │  ─────────────  │  │  ─────────────  │  │  ─────────────  │               │
│  │  poll_clips()   │  │  daily_brief()  │  │  analyze_cat()  │               │
│  │  get_viral()    │  │  get_alerts()   │  │  get_insights() │               │
│  │  create_recap() │  │  get_history()  │  │  get_overview() │               │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘               │
│           │                    │                    │                         │
│           └────────────────────┼────────────────────┘                         │
│                                │                                              │
│                                ▼                                              │
│                    ┌─────────────────────┐                                    │
│                    │  PlaybookService    │                                    │
│                    │  ─────────────────  │                                    │
│                    │  Aggregates ALL     │                                    │
│                    │  module data into   │                                    │
│                    │  AI-generated       │                                    │
│                    │  daily reports      │                                    │
│                    └──────────┬──────────┘                                    │
│                               │                                               │
└───────────────────────────────┼───────────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           STORAGE LAYER                                        │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐    │
│  │          REDIS              │  │           POSTGRESQL                 │    │
│  │  (Real-time, 24h TTL)       │  │  (Permanent storage)                 │    │
│  ├─────────────────────────────┤  ├─────────────────────────────────────┤    │
│  │  clip_radar:*               │  │  clip_radar_daily_recaps            │    │
│  │  - clip_views (Hash)        │  │  clip_radar_category_recaps         │    │
│  │  - clip_data (Hash)         │  │  trend_youtube_snapshots            │    │
│  │  - viral (Sorted Set)       │  │  trend_youtube_videos               │    │
│  │  - last_poll (String)       │  │  trend_twitch_snapshots             │    │
│  │                             │  │  trend_twitch_hourly                │    │
│  │  trends:*                   │  │  trend_thumbnail_analysis           │    │
│  │  - youtube_cache            │  │  trend_daily_briefs                 │    │
│  │  - twitch_cache             │  │  trend_user_searches                │    │
│  │  - velocity_alerts          │  │  trend_velocity_alerts              │    │
│  │                             │  │  playbook_reports                   │    │
│  │                             │  │  user_playbook_preferences          │    │
│  │                             │  │  user_playbook_views                │    │
│  │                             │  │  thumbnail_intel                    │    │
│  └─────────────────────────────┘  └─────────────────────────────────────┘    │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           API LAYER                                            │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  /api/v1/clip-radar/*     (9 endpoints)                                       │
│  /api/v1/trends/*         (13 endpoints)                                      │
│  /api/v1/playbook/*       (5 endpoints)                                       │
│  /api/v1/thumbnail-intel/* (3 endpoints)                                      │
│                                                                               │
│  Total: 30 Intelligence Suite endpoints                                       │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                                       │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐               │
│  │  useClipRadar   │  │  useTrends      │  │  usePlaybook    │               │
│  │  (10 hooks)     │  │  (14 hooks)     │  │  (4 hooks)      │               │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘               │
│           │                    │                    │                         │
│           │           ┌────────┴────────┐          │                         │
│           │           │                 │          │                         │
│           ▼           ▼                 ▼          ▼                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐                   │
│  │ Clip Radar  │  │  Trends     │  │     Playbook        │                   │
│  │ Page        │  │  Page       │  │     Page            │                   │
│  │ (~600 LOC)  │  │ (~1200 LOC) │  │     (~970 LOC)      │                   │
│  └─────────────┘  └─────────────┘  │  + ThumbnailIntel   │                   │
│                                    │    Section          │                   │
│                                    └─────────────────────┘                   │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Worker Schedule

| Worker | Schedule | Purpose |
|--------|----------|---------|
| `clip_radar_worker.py` | Every 5 min | Poll Twitch clips, calculate velocity |
| `clip_radar_recap_worker.py` | Daily 6am UTC | Compress 24h data to daily recap |
| `thumbnail_intel_worker.py` | Daily 6am EST | Analyze top thumbnails per category |
| Playbook generation | On data refresh | Generate AI strategy reports |

---

## RECOMMENDATIONS

### 1. Enterprise Analytics Grouping

**Current State:** Four separate modules with some data sharing
**Recommended:** Unified Intelligence Platform with clear domain boundaries

```
INTELLIGENCE PLATFORM
├── Real-Time Domain
│   ├── Clip Radar (viral detection)
│   ├── Twitch Live (stream monitoring)
│   └── Velocity Alerts (spike detection)
│
├── Trend Aggregation Domain
│   ├── YouTube Trending
│   ├── Twitch Games
│   └── Keyword Analysis
│
├── AI Insights Domain
│   ├── Playbook Reports
│   ├── Thumbnail Intel
│   └── Content Strategies
│
└── Historical Domain
    ├── Daily Recaps
    ├── Trend History
    └── Pattern Analysis
```

### 2. API Consolidation

Consider consolidating related endpoints under unified routes:

```
/api/v1/intelligence/
├── /real-time/
│   ├── clips/viral
│   ├── clips/fresh
│   ├── streams/live
│   └── alerts/velocity
│
├── /trends/
│   ├── youtube/
│   ├── twitch/
│   └── keywords/
│
├── /insights/
│   ├── playbook/
│   ├── thumbnails/
│   └── strategies/
│
└── /history/
    ├── recaps/
    └── snapshots/
```

### 3. Caching Strategy Improvements

| Data Type | Current TTL | Recommended | Reason |
|-----------|-------------|-------------|--------|
| Viral clips | 30s | 30s | Real-time critical |
| Twitch live | 2 min | 2 min | Optimal balance |
| YouTube trending | 1 hour | 15 min | More responsive |
| Playbook | 5 min | 30 min | Reports don't change |
| Thumbnail Intel | 1 hour | 24 hours | Daily analysis |

### 4. Tier Feature Matrix

| Feature | Free | Pro | Studio |
|---------|------|-----|--------|
| Clip Radar Live | ✅ | ✅ | ✅ |
| Clip Radar History | 1 day | 7 days | 30 days |
| Trends Dashboard | ✅ | ✅ | ✅ |
| YouTube Search | ❌ | 10/day | 50/day |
| Velocity Alerts | ❌ | ❌ | ✅ |
| Trend History | ❌ | 7 days | 30 days |
| Playbook Reports | Latest only | All | All + Generate |
| Thumbnail Intel | ✅ | ✅ | ✅ |
| Optimal Timing | ❌ | ✅ | ✅ |

### 5. Missing Features to Consider

1. **Push Notifications** - Alert users when viral clips match their categories
2. **Custom Alerts** - Let users set velocity thresholds per game
3. **Export Reports** - PDF/CSV export of playbook and trend data
4. **Comparison View** - Compare trends across time periods
5. **Personalized Playbook** - Factor in user's favorite games/categories
6. **Webhook Integration** - Send alerts to Discord/Slack

### 6. Performance Optimizations

1. **Batch API Calls** - Combine multiple Twitch API calls where possible
2. **Incremental Updates** - Only fetch changed data for trends
3. **Edge Caching** - Cache public endpoints at CDN level
4. **Query Optimization** - Add composite indexes for common query patterns

---

## APPENDIX: FILE INVENTORY

### Backend Files (Intelligence Suite)

| File | Lines | Purpose |
|------|-------|---------|
| `api/routes/clip_radar.py` | ~350 | Clip Radar endpoints |
| `api/routes/trends.py` | ~1000 | Trends endpoints |
| `api/routes/playbook.py` | ~150 | Playbook endpoints |
| `api/routes/thumbnail_intel.py` | ~150 | Thumbnail Intel endpoints |
| `services/clip_radar/service.py` | ~300 | Clip Radar core logic |
| `services/clip_radar/recap_service.py` | ~250 | Daily recap compression |
| `services/trends/youtube_collector.py` | ~400 | YouTube API client |
| `services/trends/twitch_collector.py` | ~600 | Twitch API client |
| `services/trends/trend_service.py` | ~300 | Trend aggregation |
| `services/playbook/service.py` | ~400 | Playbook generation |
| `services/thumbnail_intel/service.py` | ~300 | Thumbnail analysis |
| `workers/clip_radar_worker.py` | ~100 | 5-min polling worker |
| `workers/clip_radar_recap_worker.py` | ~100 | Daily recap worker |
| `workers/thumbnail_intel_worker.py` | ~100 | Daily analysis worker |

### Frontend Files (Intelligence Suite)

| File | Lines | Purpose |
|------|-------|---------|
| `app/dashboard/clip-radar/page.tsx` | ~600 | Clip Radar page |
| `app/dashboard/trends/page.tsx` | ~1200 | Trends page |
| `app/dashboard/playbook/page.tsx` | ~970 | Playbook page |
| `hooks/useClipRadar.ts` | ~200 | Clip Radar hooks |
| `hooks/useTrends.ts` | ~350 | Trends hooks |
| `hooks/usePlaybook.ts` | ~250 | Playbook hooks |
| `hooks/useThumbnailIntel.ts` | ~150 | Thumbnail Intel hooks |
| `types/clipRadar.ts` | ~100 | Clip Radar types |
| `types/trends.ts` | ~200 | Trends types |
| `types/playbook.ts` | ~150 | Playbook types |
| `types/thumbnailIntel.ts` | ~100 | Thumbnail Intel types |

### Database Migrations

| Migration | Tables Created |
|-----------|----------------|
| `042_trend_intelligence.sql` | 8 tables (trend_*) |
| `043_streamer_playbook.sql` | 3 tables (playbook_*, user_playbook_*) |
| `046_thumbnail_intel.sql` | 1 table (thumbnail_intel) |
| `047_clip_radar_recaps.sql` | 2 tables (clip_radar_*_recaps) |

---

*Document generated: December 30, 2025*
*Total Intelligence Suite: 30 API endpoints, 31 React Query hooks, 14 database tables*


---

## MODULE 5: CREATOR INTEL (Unified Dashboard)

### Purpose
Creator Intel is the unified intelligence dashboard that consolidates all four intelligence modules (Clip Radar, Trends, Playbook, Thumbnail Intel) into a single, personalized command center. Users subscribe to categories and see relevant data from all modules filtered to their interests.

### Implementation Date
December 30-31, 2025

### Current Implementation

#### Backend API Endpoints (8 total)

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/intel/preferences` | GET | Get user's intel preferences | Required |
| `/intel/preferences` | PUT | Update user's intel preferences | Required |
| `/intel/categories` | GET | List available categories | Public |
| `/intel/categories/subscribe` | POST | Subscribe to a category | Required |
| `/intel/categories/{key}/unsubscribe` | DELETE | Unsubscribe from category | Required |
| `/intel/mission` | GET | Get today's AI-generated mission | Required |
| `/intel/activity/track` | POST | Track user activity | Required |
| `/intel/activity/summary` | GET | Get activity summary | Required |

#### Backend Files

```
backend/
├── api/routes/intel.py               # 8 endpoints, ~300 lines
├── api/schemas/intel.py              # Pydantic schemas
├── services/intel/
│   ├── __init__.py                   # Module exports
│   ├── preferences_repository.py     # Database operations
│   ├── categories.py                 # Available categories (20)
│   ├── mission_generator.py          # AI mission generation
│   └── activity_tracker.py           # User activity tracking
└── database/migrations/
    └── 048_creator_intel.sql         # 3 tables
```

#### Database Schema (3 tables)

**intel_user_preferences**
```sql
- user_id UUID PRIMARY KEY FK
- subscribed_categories JSONB
- dashboard_layout JSONB
- default_filter TEXT DEFAULT 'all'
- notifications_enabled BOOLEAN DEFAULT true
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ
```

**intel_user_activity**
```sql
- id UUID PRIMARY KEY
- user_id UUID FK
- activity_type TEXT
- category_key TEXT
- metadata JSONB
- created_at TIMESTAMPTZ
```

**intel_missions**
```sql
- id UUID PRIMARY KEY
- user_id UUID FK
- mission_date DATE
- recommendation TEXT
- confidence INTEGER
- category TEXT
- suggested_title TEXT
- reasoning TEXT
- factors JSONB
- acted_on BOOLEAN DEFAULT false
- created_at TIMESTAMPTZ
- expires_at TIMESTAMPTZ
- UNIQUE(user_id, mission_date)
```

#### Frontend Implementation

```
tsx/
├── apps/web/src/app/dashboard/intel/
│   └── page.tsx                      # Main page
├── apps/web/src/components/intel/
│   ├── IntelDashboard.tsx            # Main dashboard (lazy loading)
│   ├── IntelHeader.tsx               # Header with categories
│   ├── IntelOnboarding.tsx           # First-time user flow
│   ├── IntelSkeleton.tsx             # Loading skeletons
│   ├── IntelEmptyState.tsx           # Empty states
│   ├── IntelMigrationBanner.tsx      # Migration banner for old pages
│   ├── PanelGrid.tsx                 # Drag-drop grid
│   ├── PanelLibrary.tsx              # Panel selection modal
│   ├── panelRegistry.ts              # Panel metadata registry
│   ├── CategoryPicker.tsx            # Category selection modal
│   ├── CategoryPill.tsx              # Category pill component
│   ├── FilterDropdown.tsx            # Global filter dropdown
│   ├── ConfidenceRing.tsx            # Animated confidence ring
│   ├── index.ts                      # Component exports
│   └── panels/
│       ├── PanelCard.tsx             # Base panel component
│       ├── PanelHeader.tsx           # Panel header
│       ├── PanelFooter.tsx           # Panel footer
│       ├── TodaysMissionPanel.tsx    # AI mission panel
│       ├── ViralClipsPanel.tsx       # Clip Radar integration
│       ├── LivePulsePanel.tsx        # Twitch live integration
│       ├── YouTubeTrendingPanel.tsx  # YouTube integration
│       ├── GoldenHoursPanel.tsx      # Playbook integration
│       ├── NicheOpportunitiesPanel.tsx
│       ├── TitleFormulasPanel.tsx
│       ├── TrendingHashtagsPanel.tsx
│       ├── ViralHooksPanel.tsx
│       ├── ThumbnailPatternsPanel.tsx
│       ├── CompetitionMeterPanel.tsx
│       ├── WeeklyHeatmapPanel.tsx
│       └── index.ts
├── apps/web/src/stores/
│   └── intelStore.ts                 # Zustand store
├── packages/api-client/src/
│   ├── hooks/useIntel.ts             # 8 React Query hooks
│   └── types/intel.ts                # TypeScript types
```

#### React Query Hooks

| Hook | Cache TTL | Auto-Refresh |
|------|-----------|--------------|
| `useIntelPreferences()` | 5 min | No |
| `useUpdateIntelPreferences()` | Mutation | N/A |
| `useAvailableCategories()` | 1 hour | No |
| `useSubscribeCategory()` | Mutation | N/A |
| `useUnsubscribeCategory()` | Mutation | N/A |
| `useIntelMission()` | 5 min | Every 5 min |
| `useTrackActivity()` | Mutation | N/A |
| `useActivitySummary()` | 5 min | No |

#### Panel Types (12 total)

| Panel | Size Options | Data Source | Refresh |
|-------|--------------|-------------|---------|
| Today's Mission | wide | Intel API | 5 min |
| Viral Clips | small, large | Clip Radar | 30s |
| Live Pulse | small, wide | Trends | 2 min |
| YouTube Trending | small, large | Trends | 15 min |
| Golden Hours | small | Playbook | 5 min |
| Niche Opportunities | small, large | Playbook | 5 min |
| Title Formulas | small | Playbook | 5 min |
| Trending Hashtags | small | Playbook | 5 min |
| Viral Hooks | small | Playbook | 5 min |
| Thumbnail Patterns | small | Thumbnail Intel | 1 hour |
| Competition Meter | small | Trends | 2 min |
| Weekly Heatmap | wide | Playbook | 5 min |

#### Available Categories (20)

```typescript
const AVAILABLE_CATEGORIES = [
  { key: 'fortnite', name: 'Fortnite', platform: 'both' },
  { key: 'valorant', name: 'Valorant', platform: 'both' },
  { key: 'warzone', name: 'Warzone', platform: 'both' },
  { key: 'minecraft', name: 'Minecraft', platform: 'both' },
  { key: 'apex_legends', name: 'Apex Legends', platform: 'both' },
  { key: 'league_of_legends', name: 'League of Legends', platform: 'both' },
  { key: 'gta', name: 'GTA', platform: 'both' },
  { key: 'roblox', name: 'Roblox', platform: 'both' },
  { key: 'call_of_duty', name: 'Call of Duty', platform: 'both' },
  { key: 'just_chatting', name: 'Just Chatting', platform: 'twitch' },
  { key: 'counter_strike', name: 'Counter-Strike', platform: 'both' },
  { key: 'escape_from_tarkov', name: 'Escape from Tarkov', platform: 'both' },
  { key: 'overwatch', name: 'Overwatch 2', platform: 'both' },
  { key: 'dead_by_daylight', name: 'Dead by Daylight', platform: 'both' },
  { key: 'rocket_league', name: 'Rocket League', platform: 'both' },
  { key: 'fifa', name: 'EA FC / FIFA', platform: 'both' },
  { key: 'world_of_warcraft', name: 'World of Warcraft', platform: 'both' },
  { key: 'diablo', name: 'Diablo', platform: 'both' },
  { key: 'pokemon', name: 'Pokémon', platform: 'both' },
  { key: 'zelda', name: 'Zelda', platform: 'youtube' },
];
```

#### Tier Limits

| Tier | Max Categories | Panel Customization |
|------|----------------|---------------------|
| Free | 3 | Basic layout |
| Pro | 10 | Full customization |
| Studio | Unlimited | Full + Priority refresh |

#### Key Features

1. **Unified Dashboard** - All intelligence in one place
2. **Category Subscription** - Personalized data filtering
3. **Drag-Drop Panels** - Customizable layout (react-grid-layout)
4. **Today's Mission** - AI-generated daily recommendation
5. **Global Filter** - Filter all panels by category
6. **Lazy Loading** - Performance-optimized panel loading
7. **Accessibility** - WCAG AA compliant, keyboard navigation
8. **Mobile Responsive** - Horizontal scroll, touch-friendly

#### Navigation Changes

- Added "Creator Intel" to sidebar Tools section
- Removed individual entries for Trends, Playbook, Clip Radar
- Old pages remain accessible with migration banner

#### Migration Strategy

Old pages (`/dashboard/clip-radar`, `/dashboard/trends`, `/dashboard/playbook`) display a migration banner encouraging users to try the new unified dashboard while keeping full functionality intact.

---

## UPDATED SUMMARY

### Total Intelligence Suite Statistics

| Metric | Count |
|--------|-------|
| API Endpoints | 38 (30 original + 8 new) |
| React Query Hooks | 39 (31 original + 8 new) |
| Database Tables | 17 (14 original + 3 new) |
| Frontend Components | 30+ (intel components) |
| Panel Types | 12 |
| Available Categories | 20 |

### Updated API Layer

```
/api/v1/clip-radar/*      (9 endpoints)
/api/v1/trends/*          (13 endpoints)
/api/v1/playbook/*        (5 endpoints)
/api/v1/thumbnail-intel/* (3 endpoints)
/api/v1/intel/*           (8 endpoints) ← NEW

Total: 38 Intelligence Suite endpoints
```

---

*Document updated: December 31, 2025*
*Added: Creator Intel unified dashboard module*
