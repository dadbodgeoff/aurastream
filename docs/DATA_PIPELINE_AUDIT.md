# 📊 AuraStream Data Pipeline Audit
## Twitch & YouTube Data Ingestion vs Algorithm Usage Analysis

**Date:** January 2, 2026  
**Purpose:** Identify high-signal data being left on the table

---

## EXECUTIVE SUMMARY

After auditing the complete data pipeline, I found **several high-signal data fields that are being collected but NOT fully utilized** by your algorithms. There are also opportunities for new workers/algorithms.

### 🔴 HIGH-PRIORITY GAPS (Data collected but underutilized)

| Data Field | Source | Currently Used By | Gap |
|------------|--------|-------------------|-----|
| `description` | YouTube | ❌ Not used | Rich keyword/topic extraction opportunity |
| `topic_categories` | YouTube | ❌ Not used | Wikipedia topic URLs for semantic categorization |
| `has_captions` | YouTube | ❌ Not used | Accessibility signal, correlates with quality |
| `default_audio_language` | YouTube | ❌ Not used | Language-specific trending analysis |
| `is_made_for_kids` | YouTube | ❌ Not used | Audience targeting signal |
| `is_licensed` | YouTube | ❌ Not used | Content type indicator |
| `duration_seconds` | YouTube | ❌ Not used | Optimal video length analysis |
| `is_short` | YouTube | ❌ Not used | Shorts vs long-form performance comparison |
| `is_live` | YouTube | ❌ Not used | Live vs VOD performance analysis |
| `subscriber_count` | YouTube | ❌ Not used | Channel size correlation analysis |
| `tags` (full list) | YouTube | Partial | Only top 10 used, full list available |
| `stream_duration` | Twitch | ❌ Not used | Optimal stream length analysis |
| `language` | Twitch | ❌ Not used | Regional competition analysis |
| `is_mature` | Twitch | ❌ Not used | Content type segmentation |
| `broadcaster_type` | Twitch | ❌ Not used | Partner/affiliate performance comparison |

---

## 0. API FIELDS NOT BEING FETCHED (Your Question)

### YouTube Data API v3 - Fields Available But NOT Parsed

You're requesting `part=snippet,statistics,contentDetails,topicDetails,status` which is good, but there are MORE parts available:

| API Part | Currently Requested | Fields You're Missing |
|----------|--------------------|-----------------------|
| `snippet` | ✅ Yes | ✅ Parsing all key fields |
| `statistics` | ✅ Yes | ❌ `favoriteCount` (deprecated but exists) |
| `contentDetails` | ✅ Yes | ❌ `dimension` (2d/3d), ❌ `definition` (hd/sd), ❌ `projection` (360/rectangular), ❌ `regionRestriction` |
| `topicDetails` | ✅ Yes | ✅ Parsing `topicCategories` |
| `status` | ✅ Yes | ❌ `uploadStatus`, ❌ `privacyStatus`, ❌ `publishAt` (scheduled), ❌ `embeddable`, ❌ `publicStatsViewable` |
| `player` | ❌ NOT REQUESTED | `embedHtml`, `embedHeight`, `embedWidth` |
| `recordingDetails` | ❌ NOT REQUESTED | `recordingDate`, `location` (lat/lng) |
| `liveStreamingDetails` | ❌ NOT REQUESTED | `actualStartTime`, `actualEndTime`, `scheduledStartTime`, `concurrentViewers`, `activeLiveChatId` |
| `localizations` | ❌ NOT REQUESTED | Localized titles/descriptions per language |

**HIGH VALUE MISSING:**

1. **`liveStreamingDetails`** - For live videos, you can get:
   - `concurrentViewers` - LIVE viewer count (different from view_count)
   - `actualStartTime` / `actualEndTime` - Exact stream duration
   - `scheduledStartTime` - For premieres/scheduled streams

2. **`contentDetails.regionRestriction`** - Which countries can view
   - `allowed` / `blocked` country lists
   - Useful for regional content strategy

3. **`contentDetails.definition`** - HD vs SD
   - Quality signal that correlates with production value

4. **`status.embeddable`** - Can be embedded
   - Indicates creator's distribution strategy

### Twitch Helix API - Fields Available But NOT Parsed

**Streams Endpoint (`/streams`)** - You're parsing most fields, but missing:

| Field | Currently Parsed | Notes |
|-------|------------------|-------|
| `id` | ✅ | |
| `user_id` | ✅ | |
| `user_login` | ✅ | |
| `user_name` | ✅ | |
| `game_id` | ✅ | |
| `game_name` | ✅ | |
| `type` | ✅ | |
| `title` | ✅ | |
| `viewer_count` | ✅ | |
| `started_at` | ✅ | |
| `language` | ✅ | |
| `thumbnail_url` | ✅ | |
| `tags` | ✅ | Was `tag_ids` before, now `tags` |
| `is_mature` | ✅ | |

**You're actually parsing ALL stream fields!** ✅

**BUT - There are OTHER Twitch endpoints you're NOT calling:**

| Endpoint | What It Provides | Currently Using |
|----------|------------------|-----------------|
| `/streams` | Live streams | ✅ Yes |
| `/games/top` | Top games | ✅ Yes |
| `/clips` | Clips | ✅ Yes |
| `/users` | Channel info | ✅ Yes (fetch_channels) |
| `/channels/followers` | Follower count | ✅ Yes (fetch_channel_followers) |
| `/videos` | VODs, highlights, uploads | ❌ **NOT USING** |
| `/schedule` | Stream schedules | ❌ **NOT USING** |
| `/channels` | Channel info (broadcaster_language, game_id, game_name, title, delay) | ❌ **NOT USING** |
| `/chat/badges` | Channel badges | ❌ Not relevant |
| `/predictions` | Channel predictions | ❌ Not relevant |
| `/polls` | Channel polls | ❌ Not relevant |
| `/hype_train` | Hype train events | ❌ Not relevant |
| `/channel_points` | Custom rewards | ❌ Not relevant |
| `/analytics/games` | Game analytics (requires auth) | ❌ **VALUABLE but needs user auth** |
| `/analytics/extensions` | Extension analytics | ❌ Not relevant |

**HIGH VALUE MISSING TWITCH ENDPOINTS:**

1. **`/videos`** - Get VODs, highlights, uploads for channels
   ```
   GET /videos?user_id={id}&type=archive  → Past broadcasts
   GET /videos?user_id={id}&type=highlight → Highlights
   GET /videos?user_id={id}&type=upload → Uploads
   
   Returns: id, stream_id, user_id, title, description, created_at, 
            published_at, url, thumbnail_url, viewable, view_count,
            language, type, duration, muted_segments
   ```
   - **`view_count`** on VODs = how many watched after stream
   - **`duration`** = actual stream length
   - **`muted_segments`** = DMCA issues (content type signal)

2. **`/schedule`** - Stream schedules
   ```
   GET /schedule?broadcaster_id={id}
   
   Returns: segments[{start_time, end_time, title, category, is_recurring}]
   ```
   - Know when streamers plan to go live
   - Identify scheduling patterns

3. **`/channels`** - Extended channel info
   ```
   GET /channels?broadcaster_id={id}
   
   Returns: broadcaster_language, game_id, game_name, title, delay,
            tags, content_classification_labels, is_branded_content
   ```
   - **`content_classification_labels`** - Mature content flags
   - **`is_branded_content`** - Sponsored stream indicator
   - **`delay`** - Stream delay (competitive gaming signal)

---

## SUMMARY: What You Should Add

### YouTube - Add to API Request
```python
# Change from:
params = {
    "part": "snippet,statistics,contentDetails,topicDetails,status",
    ...
}

# To:
params = {
    "part": "snippet,statistics,contentDetails,topicDetails,status,liveStreamingDetails",
    ...
}
```

Then parse these new fields:
```python
# In _transform_video_item():
live_streaming = item.get("liveStreamingDetails", {})
concurrent_viewers = live_streaming.get("concurrentViewers")  # For live videos
actual_start_time = live_streaming.get("actualStartTime")
actual_end_time = live_streaming.get("actualEndTime")
scheduled_start_time = live_streaming.get("scheduledStartTime")

content_details = item.get("contentDetails", {})
definition = content_details.get("definition")  # "hd" or "sd"
dimension = content_details.get("dimension")  # "2d" or "3d"
region_restriction = content_details.get("regionRestriction", {})
```

### Twitch - Add New Endpoint Calls

1. **Add `/videos` endpoint** to `twitch_collector.py`:
```python
async def fetch_channel_videos(
    self,
    user_id: str,
    video_type: Literal["archive", "highlight", "upload"] = "archive",
    limit: int = 20
) -> List[TwitchVideo]:
    """Fetch VODs/highlights/uploads for a channel."""
    params = {
        "user_id": user_id,
        "type": video_type,
        "first": limit,
    }
    data = await self._make_request("/videos", params)
    # Parse and return
```

2. **Add `/channels` endpoint** for extended info:
```python
async def fetch_channel_extended(
    self,
    broadcaster_id: str
) -> TwitchChannelExtended:
    """Fetch extended channel info including content labels."""
    params = {"broadcaster_id": broadcaster_id}
    data = await self._make_request("/channels", params)
    # Returns: broadcaster_language, delay, tags, 
    #          content_classification_labels, is_branded_content
```

---

## 1. YOUTUBE DATA PIPELINE

### 1.1 Raw Fields Fetched (youtube_collector.py)

```python
class YouTubeVideoResponse(BaseModel):
    # ✅ USED by algorithms
    video_id: str                    # → viral_detector, title_intel
    title: str                       # → title_intel (keywords, phrases, hooks)
    thumbnail: str                   # → thumbnail_analysis (separate service)
    channel_title: str               # → title_intel (channel context)
    view_count: int                  # → viral_detector (velocity), title_intel
    like_count: int                  # → viral_detector (engagement)
    comment_count: int               # → viral_detector (engagement)
    published_at: datetime           # → viral_detector (velocity calc)
    tags: List[str]                  # → title_intel (tag clusters) - PARTIAL
    engagement_rate: float           # → viral_detector, title_intel
    
    # ❌ NOT USED - HIGH SIGNAL
    description: Optional[str]       # Rich text for keyword extraction!
    duration_seconds: Optional[int]  # Optimal video length analysis!
    is_short: bool                   # Shorts vs long-form comparison!
    is_live: bool                    # Live vs VOD performance!
    topic_categories: List[str]      # Wikipedia URLs for semantic topics!
    has_captions: bool               # Quality/accessibility signal!
    default_audio_language: str      # Language-specific analysis!
    is_made_for_kids: bool           # Audience targeting!
    is_licensed: bool                # Content type indicator!
    subscriber_count: Optional[int]  # Channel size correlation!
    
    # ⚠️ PARTIALLY USED
    category: Optional[str]          # Only for filtering, not analysis
    channel_id: Optional[str]        # Stored but not analyzed
```

### 1.2 Current Algorithm Usage

| Algorithm | Fields Used | Fields Ignored |
|-----------|-------------|----------------|
| **viral_detector.py** | video_id, title, views, likes, comments, published_at, tags, engagement_rate | description, duration, is_short, topic_categories, language |
| **title_intel/analyzer.py** | title, views, tags (top 10), published_at, engagement_rate | description, duration, is_short, topic_categories |
| **video_idea_generator.py** | Uses viral_detector + title_intel outputs | Same gaps as above |
| **competition_analyzer.py** | Twitch data only | N/A |
| **daily_insight_generator.py** | Uses other analyzers | Same gaps |

---

## 2. TWITCH DATA PIPELINE

### 2.1 Raw Fields Fetched (twitch_collector.py)

```python
@dataclass
class TwitchStream:
    # ✅ USED by algorithms
    id: str                          # → competition_analyzer
    user_id: str                     # → competition_analyzer
    user_name: str                   # → competition_analyzer
    game_id: str                     # → competition_analyzer
    game_name: str                   # → competition_analyzer
    viewer_count: int                # → competition_analyzer (main metric)
    title: str                       # → competition_analyzer (stored)
    
    # ❌ NOT USED - HIGH SIGNAL
    started_at: datetime             # Stream duration analysis!
    language: str                    # Regional competition!
    tags: List[str]                  # Stream tag trends!
    is_mature: bool                  # Content segmentation!
    thumbnail_url: str               # Thumbnail analysis opportunity!
    type: str                        # "live" vs other states

@dataclass
class TwitchClip:
    # ✅ USED (partially)
    view_count: int                  # → trends routes
    title: str                       # → trends routes
    
    # ❌ NOT USED
    duration: float                  # Optimal clip length!
    created_at: datetime             # Clip timing analysis!
    creator_name: str                # Clipper influence!
```

### 2.2 Current Algorithm Usage

| Algorithm | Fields Used | Fields Ignored |
|-----------|-------------|----------------|
| **competition_analyzer.py** | viewer_count, stream_count, game_id | language, tags, is_mature, started_at, thumbnail |
| **twitch_streams_worker.py** | All fields stored | But downstream only uses viewer_count |

---

## 3. RECOMMENDED NEW ALGORITHMS/WORKERS

### 3.1 🆕 Video Duration Analyzer
**Gap:** `duration_seconds` and `is_short` are collected but never analyzed

```python
# Proposed: backend/services/intel/duration_analyzer.py
class DurationAnalyzer:
    """
    Analyzes optimal video duration by category.
    
    Insights:
    - Optimal length for each game category
    - Shorts vs long-form performance comparison
    - Duration vs engagement correlation
    - Duration trends over time
    """
    
    async def analyze_category(self, game_key: str) -> DurationAnalysis:
        # Group videos by duration buckets
        # Calculate avg views/engagement per bucket
        # Identify optimal duration range
        # Compare Shorts (<60s) vs standard vs long-form
```

**Value:** "Fortnite videos between 12-18 minutes get 2.3x more views than 30+ minute videos"

### 3.2 🆕 Description Keyword Extractor
**Gap:** `description` field is fetched but completely ignored

```python
# Proposed: backend/services/intel/description_analyzer.py
class DescriptionAnalyzer:
    """
    Extracts keywords and topics from video descriptions.
    
    Descriptions often contain:
    - Hashtags (#fortnite #gaming)
    - Social links (indicates creator size)
    - Timestamps (indicates video structure)
    - Sponsor mentions (monetization signals)
    - Related video links (content clusters)
    """
    
    async def extract_description_intel(self, game_key: str) -> DescriptionIntel:
        # Extract hashtags from descriptions
        # Identify common phrases/templates
        # Detect sponsor patterns
        # Find timestamp patterns (chapter structure)
```

**Value:** "Top Fortnite videos use these 5 hashtags in descriptions: #fortnite #gaming #epicgames..."

### 3.3 🆕 Topic Category Analyzer
**Gap:** `topic_categories` (Wikipedia URLs) are fetched but never used

```python
# Proposed: backend/services/intel/topic_analyzer.py
class TopicAnalyzer:
    """
    Analyzes YouTube's auto-detected topic categories.
    
    topic_categories contains Wikipedia URLs like:
    - https://en.wikipedia.org/wiki/Video_game
    - https://en.wikipedia.org/wiki/Esports
    - https://en.wikipedia.org/wiki/Action_game
    
    This is YouTube's semantic understanding of content!
    """
    
    async def analyze_topics(self, game_key: str) -> TopicAnalysis:
        # Parse Wikipedia URLs to extract topics
        # Find topic correlations with views
        # Identify emerging topic clusters
```

**Value:** "Videos tagged with 'Esports' topic get 40% more views in Valorant category"

### 3.4 🆕 Stream Duration Optimizer
**Gap:** Twitch `started_at` is stored but stream duration never analyzed

```python
# Proposed: backend/services/intel/stream_duration_analyzer.py
class StreamDurationAnalyzer:
    """
    Analyzes optimal stream duration by category.
    
    Uses started_at to calculate:
    - Current stream duration
    - Viewer retention by duration
    - Optimal stream length per category
    """
    
    async def analyze_category(self, game_key: str) -> StreamDurationAnalysis:
        # Calculate stream durations from started_at
        # Correlate duration with viewer count
        # Find optimal streaming windows
```

**Value:** "Fortnite streams between 3-5 hours have 2x the average viewers"

### 3.5 🆕 Language/Regional Analyzer
**Gap:** Both YouTube `default_audio_language` and Twitch `language` are ignored

```python
# Proposed: backend/services/intel/regional_analyzer.py
class RegionalAnalyzer:
    """
    Analyzes regional competition and opportunities.
    
    Insights:
    - Competition levels by language
    - Underserved language markets
    - Regional trending topics
    """
    
    async def analyze_regional(self, game_key: str) -> RegionalAnalysis:
        # Group by language
        # Calculate competition per language
        # Identify underserved markets
```

**Value:** "Spanish Fortnite content has 50% less competition but 80% of the audience"

### 3.6 🆕 Shorts Performance Analyzer
**Gap:** `is_short` flag is collected but never analyzed

```python
# Proposed: backend/services/intel/shorts_analyzer.py
class ShortsAnalyzer:
    """
    Compares YouTube Shorts vs long-form performance.
    
    Insights:
    - Shorts vs long-form view velocity
    - Best topics for Shorts
    - Shorts-to-long-form funnel analysis
    """
```

**Value:** "Fortnite Shorts get 5x the velocity but 0.3x the total views"

---

## 4. QUICK WINS (Low effort, high impact)

### 4.1 Add Duration Analysis to Existing title_intel
```python
# In title_intel/analyzer.py, add:
def _analyze_duration_patterns(self, videos: List[Dict]) -> Dict:
    """Analyze video duration patterns."""
    durations = [v.get("duration_seconds", 0) for v in videos if v.get("duration_seconds")]
    
    # Bucket analysis
    short_form = [v for v in videos if v.get("is_short")]
    long_form = [v for v in videos if not v.get("is_short")]
    
    return {
        "avg_duration_seconds": sum(durations) / len(durations) if durations else 0,
        "optimal_duration_range": self._find_optimal_range(videos),
        "shorts_count": len(short_form),
        "shorts_avg_views": sum(v.get("view_count", 0) for v in short_form) / len(short_form) if short_form else 0,
        "long_form_avg_views": sum(v.get("view_count", 0) for v in long_form) / len(long_form) if long_form else 0,
    }
```

### 4.2 Add Description Hashtag Extraction
```python
# In title_intel/analyzer.py, add:
def _extract_description_hashtags(self, videos: List[Dict]) -> List[str]:
    """Extract hashtags from video descriptions."""
    hashtags = Counter()
    for video in videos:
        desc = video.get("description", "")
        found = re.findall(r'#(\w+)', desc)
        hashtags.update(found)
    return [tag for tag, _ in hashtags.most_common(10)]
```

### 4.3 Add Language Filter to Competition Analyzer
```python
# In competition_analyzer.py, add language parameter:
async def analyze_category(
    self,
    category_key: str,
    language: Optional[str] = None,  # NEW: Filter by language
    ...
) -> CompetitionAnalysis:
    # Filter streams by language if specified
    if language:
        streams = [s for s in streams if s.get("language") == language]
```

---

## 5. DATA STORAGE GAPS

### 5.1 PostgreSQL Tables Missing Columns

**trend_youtube_videos** should add:
```sql
ALTER TABLE trend_youtube_videos ADD COLUMN IF NOT EXISTS
    duration_seconds INTEGER,
    is_short BOOLEAN DEFAULT FALSE,
    is_live BOOLEAN DEFAULT FALSE,
    description_hashtags TEXT[],
    topic_categories TEXT[],
    default_language TEXT;
```

**trend_twitch_snapshots** should add:
```sql
ALTER TABLE trend_twitch_snapshots ADD COLUMN IF NOT EXISTS
    language_distribution JSONB,  -- {"en": 500, "es": 200, ...}
    avg_stream_duration_minutes INTEGER,
    mature_stream_count INTEGER;
```

---

## 6. PRIORITY MATRIX

| Gap | Impact | Effort | Priority |
|-----|--------|--------|----------|
| Duration analysis | HIGH | LOW | 🔴 P0 |
| Description hashtags | HIGH | LOW | 🔴 P0 |
| Shorts vs long-form | HIGH | MEDIUM | 🟡 P1 |
| Topic categories | MEDIUM | MEDIUM | 🟡 P1 |
| Language/regional | MEDIUM | MEDIUM | 🟡 P1 |
| Stream duration | MEDIUM | LOW | 🟡 P1 |
| Mature content filter | LOW | LOW | 🟢 P2 |
| Captions signal | LOW | LOW | 🟢 P2 |

---

## 7. IMPLEMENTATION ROADMAP

### Phase 1: Quick Wins (1-2 days)
1. Add duration analysis to `title_intel/analyzer.py`
2. Add description hashtag extraction
3. Add `is_short` filtering to viral_detector

### Phase 2: New Analyzers (1 week)
1. Create `duration_analyzer.py`
2. Create `shorts_analyzer.py`
3. Create `description_analyzer.py`

### Phase 3: Regional Intelligence (1 week)
1. Create `regional_analyzer.py`
2. Add language filtering to competition_analyzer
3. Add regional insights to daily_insight_generator

### Phase 4: Database & Workers (1 week)
1. Add missing columns to PostgreSQL
2. Create `duration_intel_worker.py`
3. Create `regional_intel_worker.py`

---

## 8. FULL COVERAGE MATRIX

### YouTube Fields (22 total)

| # | Field | Currently Used | Proposed Analyzer | Status After |
|---|-------|----------------|-------------------|--------------|
| 1 | `video_id` | ✅ viral_detector, title_intel | - | ✅ |
| 2 | `title` | ✅ title_intel | - | ✅ |
| 3 | `thumbnail` | ✅ thumbnail_analysis | - | ✅ |
| 4 | `channel_id` | ⚠️ Stored only | **channel_analyzer** | ✅ |
| 5 | `channel_title` | ✅ title_intel | - | ✅ |
| 6 | `category` | ⚠️ Filtering only | - | ✅ |
| 7 | `published_at` | ✅ viral_detector | - | ✅ |
| 8 | `view_count` | ✅ viral_detector, title_intel | - | ✅ |
| 9 | `like_count` | ✅ viral_detector | - | ✅ |
| 10 | `comment_count` | ✅ viral_detector | - | ✅ |
| 11 | `engagement_rate` | ✅ viral_detector | - | ✅ |
| 12 | `viral_score` | ✅ viral_detector | - | ✅ |
| 13 | `velocity` | ✅ viral_detector | - | ✅ |
| 14 | `tags` | ⚠️ Partial (top 10) | **tag_analyzer** (full) | ✅ |
| 15 | `description` | ❌ | **description_analyzer** | ✅ |
| 16 | `duration_seconds` | ❌ | **duration_analyzer** | ✅ |
| 17 | `is_short` | ❌ | **shorts_analyzer** | ✅ |
| 18 | `is_live` | ❌ | **live_vs_vod_analyzer** | ✅ |
| 19 | `topic_categories` | ❌ | **topic_analyzer** | ✅ |
| 20 | `has_captions` | ❌ | **quality_signals_analyzer** | ✅ |
| 21 | `default_audio_language` | ❌ | **regional_analyzer** | ✅ |
| 22 | `is_made_for_kids` | ❌ | **audience_analyzer** | ✅ |
| 23 | `is_licensed` | ❌ | **content_type_analyzer** | ✅ |
| 24 | `subscriber_count` | ❌ | **channel_analyzer** | ✅ |

### Twitch Fields (14 total)

| # | Field | Currently Used | Proposed Analyzer | Status After |
|---|-------|----------------|-------------------|--------------|
| 1 | `id` | ✅ competition_analyzer | - | ✅ |
| 2 | `user_id` | ✅ competition_analyzer | - | ✅ |
| 3 | `user_name` | ✅ competition_analyzer | - | ✅ |
| 4 | `game_id` | ✅ competition_analyzer | - | ✅ |
| 5 | `game_name` | ✅ competition_analyzer | - | ✅ |
| 6 | `title` | ⚠️ Stored only | **stream_title_analyzer** | ✅ |
| 7 | `viewer_count` | ✅ competition_analyzer | - | ✅ |
| 8 | `started_at` | ❌ | **stream_duration_analyzer** | ✅ |
| 9 | `language` | ❌ | **regional_analyzer** | ✅ |
| 10 | `thumbnail_url` | ❌ | **stream_thumbnail_analyzer** | ✅ |
| 11 | `tags` | ❌ | **stream_tag_analyzer** | ✅ |
| 12 | `is_mature` | ❌ | **content_type_analyzer** | ✅ |
| 13 | `type` | ⚠️ Filtering only | - | ✅ |
| 14 | `broadcaster_type` | ❌ | **channel_tier_analyzer** | ✅ |

### Twitch Clips (7 fields)

| # | Field | Currently Used | Proposed Analyzer | Status After |
|---|-------|----------------|-------------------|--------------|
| 1 | `id` | ✅ trends routes | - | ✅ |
| 2 | `title` | ✅ trends routes | - | ✅ |
| 3 | `view_count` | ✅ trends routes | - | ✅ |
| 4 | `thumbnail_url` | ⚠️ Display only | - | ✅ |
| 5 | `duration` | ❌ | **clip_duration_analyzer** | ✅ |
| 6 | `created_at` | ❌ | **clip_timing_analyzer** | ✅ |
| 7 | `creator_name` | ❌ | **clipper_influence_analyzer** | ✅ |

---

## 9. FULL COVERAGE PLAN (10 New Analyzers)

The 5 I mentioned cover the **highest signal** gaps. Here's the complete list to hit 100%:

### Tier 1: High Signal (5 analyzers) - Already Proposed
1. **duration_analyzer** → `duration_seconds`, `is_short`
2. **description_analyzer** → `description`
3. **shorts_analyzer** → `is_short` (deep dive)
4. **regional_analyzer** → `default_audio_language`, `language` (Twitch)
5. **topic_analyzer** → `topic_categories`

### Tier 2: Medium Signal (3 analyzers) - NEW
6. **channel_analyzer** → `channel_id`, `subscriber_count`, `broadcaster_type`
   - Correlate channel size with video performance
   - "Small channels (<10k subs) getting viral in Fortnite use these patterns..."
   - Partner vs Affiliate vs Regular streamer performance

7. **quality_signals_analyzer** → `has_captions`, `is_licensed`, `is_made_for_kids`
   - "Videos with captions get 15% more engagement"
   - Content type segmentation
   - Audience targeting signals

8. **stream_title_analyzer** → Twitch `title`, `tags`
   - Same as YouTube title_intel but for stream titles
   - "Top Fortnite streams use these title patterns..."
   - Stream tag trends

### Tier 3: Lower Signal (2 analyzers) - NEW
9. **live_vs_vod_analyzer** → `is_live`
   - Compare live stream VODs vs edited uploads
   - "Live VODs get 0.4x views but 2x engagement"

10. **clip_analyzer** → `duration`, `created_at`, `creator_name`
    - Optimal clip length
    - Best time to clip
    - Clipper influence on virality

---

## 10. CONSOLIDATED ANALYZER ARCHITECTURE

Instead of 10 separate analyzers, we can consolidate into **6 smart analyzers**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANALYZER CONSOLIDATION                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ContentFormatAnalyzer (NEW)                                │
│     └─ duration_seconds, is_short, is_live, is_licensed        │
│     └─ Outputs: optimal_duration, shorts_vs_long, live_vs_vod  │
│                                                                 │
│  2. DescriptionAnalyzer (NEW)                                  │
│     └─ description                                              │
│     └─ Outputs: hashtags, timestamps, sponsors, links          │
│                                                                 │
│  3. SemanticAnalyzer (NEW)                                     │
│     └─ topic_categories, tags (full)                           │
│     └─ Outputs: topic_clusters, semantic_themes                │
│                                                                 │
│  4. RegionalAnalyzer (NEW)                                     │
│     └─ default_audio_language, language (Twitch)               │
│     └─ Outputs: regional_competition, underserved_markets      │
│                                                                 │
│  5. ChannelAnalyzer (NEW)                                      │
│     └─ channel_id, subscriber_count, broadcaster_type          │
│     └─ Outputs: channel_size_correlation, tier_performance     │
│                                                                 │
│  6. QualitySignalsAnalyzer (NEW)                               │
│     └─ has_captions, is_made_for_kids, is_mature               │
│     └─ Outputs: quality_score, audience_type                   │
│                                                                 │
│  EXISTING (keep as-is):                                        │
│  - viral_detector.py                                           │
│  - title_intel/analyzer.py                                     │
│  - competition_analyzer.py                                     │
│  - video_idea_generator.py                                     │
│  - daily_insight_generator.py                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. IMPLEMENTATION SUMMARY

| Phase | Analyzers | Fields Covered | Cumulative Coverage |
|-------|-----------|----------------|---------------------|
| Current | viral_detector, title_intel, competition_analyzer | 12 fields | 12/36 (33%) |
| Phase 1 | + ContentFormatAnalyzer | +4 fields | 16/36 (44%) |
| Phase 2 | + DescriptionAnalyzer | +1 field | 17/36 (47%) |
| Phase 3 | + SemanticAnalyzer | +2 fields | 19/36 (53%) |
| Phase 4 | + RegionalAnalyzer | +2 fields | 21/36 (58%) |
| Phase 5 | + ChannelAnalyzer | +3 fields | 24/36 (67%) |
| Phase 6 | + QualitySignalsAnalyzer | +3 fields | 27/36 (75%) |
| Phase 7 | + Stream title/tag analysis | +2 fields | 29/36 (81%) |
| Phase 8 | + Clip analysis | +3 fields | 32/36 (89%) |
| Phase 9 | + Remaining edge cases | +4 fields | 36/36 (100%) |

---

## 12. FINAL ANSWER

**No, the 5 proposed analyzers don't get you to 100%.** They get you to ~60% coverage.

**To hit 100% coverage, you need 6 new consolidated analyzers:**

1. **ContentFormatAnalyzer** - duration, shorts, live, licensed
2. **DescriptionAnalyzer** - description text mining
3. **SemanticAnalyzer** - topics, full tags
4. **RegionalAnalyzer** - language analysis
5. **ChannelAnalyzer** - channel size, broadcaster tier
6. **QualitySignalsAnalyzer** - captions, kids content, mature

**But here's the real question:** Do you need 100%?

- Fields like `is_licensed` and `is_made_for_kids` are low-signal for gaming content
- `broadcaster_type` matters but affects <5% of insights
- The **80/20 rule** applies: The first 3 analyzers (ContentFormat, Description, Semantic) will capture 80% of the value

**My recommendation:** Build the 6 analyzers in priority order, measure impact after each, and stop when ROI diminishes.
