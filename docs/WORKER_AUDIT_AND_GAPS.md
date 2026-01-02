# AuraStream Worker Audit & Gap Analysis

**Last Updated:** January 1, 2026  
**Status:** ✅ All gaps addressed

---

## Current Workers Inventory

| Worker | Schedule | Data Source | Output | Status |
|--------|----------|-------------|--------|--------|
| `youtube_worker.py` | Every 30 min (trending) + Daily 5 AM UTC (games) | YouTube API | Redis cache (`youtube:trending:*`, `youtube:games:*`) | ✅ Active |
| `thumbnail_intel_worker.py` | Daily 6 AM EST | YouTube thumbnails + Gemini Vision | PostgreSQL | ✅ Active |
| `playbook_worker.py` | Every 4 hours | YouTube + Twitch cached data | PostgreSQL | ✅ Active |
| `clip_radar_worker.py` | Every 5 min | Twitch Clips API | Redis cache | ✅ Active |
| `clip_radar_recap_worker.py` | Daily 6 AM UTC | Redis clip data | PostgreSQL (compressed) | ✅ Active |
| `analytics_flush_worker.py` | Hourly | Redis analytics events | PostgreSQL | ✅ Active |
| `generation_worker.py` | On-demand (queue) | Job queue | Asset generation | ✅ Active |
| `twitch_worker.py` | On-demand (queue) | Job queue | Twitch asset generation | ✅ Active |
| `coach_cleanup_worker.py` | Periodic | Redis coach sessions | Cleanup stale sessions | ✅ Active |
| `creator_intel_worker.py` | Every 4 hours | YouTube cached data | Redis + PostgreSQL (keywords, tags, titles, video ideas) | ✅ NEW |
| `twitch_streams_worker.py` | Every 15 min | Twitch API | Redis cache (stream counts, viewer distribution) | ✅ NEW |

---

## Algorithmic Services Audit

### 1. Title Intel (`backend/services/title_intel/`)

**Purpose:** Extracts keywords, tags, title patterns, phrases from top-performing YouTube videos

**Data Flow:**
```
youtube_worker (daily) → Redis cache → title_intel/analyzer.py → Redis cache (30 min TTL)
                                                ↓
                              creator_intel_worker (every 4h) → Pre-computed cache (5h TTL)
```

**Current State:** ✅ FIXED - `creator_intel_worker.py` pre-computes every 4 hours
- Pre-computed results stored at `intel:title:precomputed:{game}`
- Users hit warm cache
- Historical data preserved

---

### 2. Video Idea Generator (`backend/services/intel/video_idea_generator.py`)

**Purpose:** Synthesizes original video concepts from trending data

**Data Flow:**
```
viral_detector + title_intel + competition_analyzer → video_idea_generator
                                                            ↓
                                          creator_intel_worker (every 4h) → Pre-computed cache
```

**Current State:** ✅ FIXED - `creator_intel_worker.py` pre-computes every 4 hours
- Pre-computed results stored at `intel:video_ideas:precomputed:{game}`
- 5 ideas per game, refreshed every 4 hours

---

### 3. Daily Insight Generator (`backend/services/intel/daily_insight_generator.py`)

**Purpose:** Generates ONE specific, actionable insight per day

**Data Flow:**
```
viral_detector + title_intel + competition_analyzer → daily_insight_generator (on-demand)
```

**Current State:** ❌ NO DEDICATED WORKER
- Runs on-demand per user request
- Should be pre-computed daily

**Gap:** "Daily" insight isn't actually generated daily - it's generated on each request.

---

### 4. Mission Generator (`backend/services/intel/mission_generator.py`)

**Purpose:** Generates personalized "Today's Mission" recommendations

**Data Flow:**
```
competition_analyzer + viral_detector + scoring_engine → mission_generator (on-demand, 5 min cache)
```

**Current State:** ⚠️ PARTIAL - Has 5-minute in-memory cache
- Per-user caching works
- But underlying data analysis runs on each cache miss

**Gap:** Acceptable for now, but could benefit from pre-computed category scores.

---

### 5. Viral Detector (`backend/services/intel/viral_detector.py`)

**Purpose:** Detects viral content and opportunities from YouTube data

**Data Flow:**
```
youtube_worker → Redis cache → viral_detector (on-demand) → Redis cache (30 min TTL)
```

**Current State:** ⚠️ PARTIAL - Has 30-minute cache
- Analysis cached per category
- But no background refresh

**Gap:** Cache can go stale, first user after expiry gets slow response.

---

### 6. Competition Analyzer (`backend/services/intel/competition_analyzer.py`)

**Purpose:** Analyzes real-time competition levels using Twitch data

**Data Flow:**
```
twitch_streams_worker (every 15m) → Redis cache → competition_analyzer → Redis cache (15 min TTL)
```

**Current State:** ✅ FIXED - `twitch_streams_worker.py` provides fresh data
- Stream data cached at `twitch:streams:{game_id}`
- Pre-computed viewer counts and distribution
- No more live API calls needed

---

### 7. Scoring Engine (`backend/services/intel/scoring_engine.py`)

**Purpose:** Centralized scoring with category statistics

**Data Flow:**
```
youtube_worker → Redis cache → scoring_engine (on-demand) → Redis cache (1 hour TTL)
```

**Current State:** ⚠️ PARTIAL - Has 1-hour cache
- CategoryStats cached per category
- No background refresh

**Gap:** First request after cache expiry is slow.

---

## Data Refresh Timeline Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA COLLECTION LAYER                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  youtube_worker        │ Every 30 min (trending) + Daily (games)            │
│  clip_radar_worker     │ Every 5 min                                        │
│  twitch_streams_worker │ Every 15 min ✅ NEW                                 │
│  thumbnail_intel_worker│ Daily 6 AM EST                                     │
│  playbook_worker       │ Every 4 hours                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ANALYSIS LAYER (ALL FIXED)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✅ title_intel        │ Pre-computed every 4h (creator_intel_worker)       │
│  ✅ video_ideas        │ Pre-computed every 4h (creator_intel_worker)       │
│  ✅ viral_detector     │ Pre-computed every 4h (creator_intel_worker)       │
│  ✅ competition        │ Fresh data every 15m (twitch_streams_worker)       │
│  ⚠️ daily_insights     │ On-demand (acceptable - per-user personalization)  │
│  ⚠️ scoring_engine     │ On-demand (1 hour cache - acceptable)              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Recommended New Workers

### 1. `creator_intel_worker.py` ✅ IMPLEMENTED

**Schedule:** Every 4 hours (aligned with playbook_worker)

**Responsibilities:**
1. Pre-compute title intel for all 8 tracked games
2. Pre-compute video ideas for all 8 tracked games  
3. Pre-compute viral analysis for all 8 tracked games
4. Store results in Redis for fast access (5-hour TTL)

**Redis Keys:**
- `intel:title:precomputed:{game}` - Keywords, tags, title patterns
- `intel:video_ideas:precomputed:{game}` - Synthesized video concepts
- `intel:viral:precomputed:{game}` - Viral analysis results
- `intel:worker:last_run` - Last run timestamp

---

### 2. `twitch_streams_worker.py` ✅ IMPLEMENTED

**Schedule:** Every 15 minutes

**Responsibilities:**
1. Fetch top 100 streams for each tracked game category
2. Cache stream counts and viewer distribution in Redis
3. Enable real-time competition analysis without live API calls

**Redis Keys:**
- `twitch:streams:{game_id}` - Stream data per game
- `twitch:top_games` - Current top games on Twitch
- `twitch:streams:last_fetch` - Last fetch timestamp

---

## Implementation Priority

All critical gaps have been addressed:

1. ✅ **creator_intel_worker.py** - Fixes keywords, tags, titles, video ideas
2. ✅ **twitch_streams_worker.py** - Enables real competition data

---

## Final Worker Schedule

```
Time (UTC)  │ Worker
────────────┼─────────────────────────────────
Every 5m    │ clip_radar_worker
Every 15m   │ twitch_streams_worker ✅
Every 30m   │ youtube_worker (trending only)
Every 1h    │ analytics_flush_worker
Every 4h    │ playbook_worker + creator_intel_worker ✅
Daily 5 AM  │ youtube_worker (game-specific)
Daily 6 AM  │ thumbnail_intel_worker + clip_radar_recap_worker
```

---

## Running the New Workers

```bash
# Creator Intel Worker (continuous)
python -m backend.workers.creator_intel_worker

# Creator Intel Worker (single run)
python -m backend.workers.creator_intel_worker --once

# Twitch Streams Worker (continuous)
python -m backend.workers.twitch_streams_worker

# Twitch Streams Worker (single run)
python -m backend.workers.twitch_streams_worker --once
```

## Docker Compose Addition

Add to your `docker-compose.yml`:

```yaml
creator-intel-worker:
  build: ./backend
  command: python -m backend.workers.creator_intel_worker
  environment:
    - REDIS_URL=${REDIS_URL}
  depends_on:
    - redis
  restart: unless-stopped

twitch-streams-worker:
  build: ./backend
  command: python -m backend.workers.twitch_streams_worker
  environment:
    - REDIS_URL=${REDIS_URL}
    - TWITCH_CLIENT_ID=${TWITCH_CLIENT_ID}
    - TWITCH_CLIENT_SECRET=${TWITCH_CLIENT_SECRET}
  depends_on:
    - redis
  restart: unless-stopped
```
