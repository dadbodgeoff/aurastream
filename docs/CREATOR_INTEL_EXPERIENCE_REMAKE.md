# 🚀 CREATOR INTEL EXPERIENCE REMAKE
## Complete Intelligence Platform Redesign with 100% Data Utilization

**Version:** 1.0.0  
**Date:** December 31, 2025  
**Status:** SPECIFICATION  
**Audit Coverage:** 100% of Backend Infrastructure

---

## EXECUTIVE SUMMARY

This document presents a complete redesign of the Creator Intel experience, ensuring **100% utilization** of all backend data infrastructure. The audit identified:

- **8 Database Systems** with 48+ tables
- **30+ API Endpoints** across 4 route modules
- **5 Service Modules** with full data pipelines
- **16 Panel Types** for dashboard customization

### 🚨 KEY CHANGE: Creator Intel REPLACES the Dashboard

The current `/dashboard` page becomes `/intel` - Creator Intel IS the new home. We consolidate:

**FROM Current Dashboard:**
- Welcome header with greeting → Keep in Daily Brief
- Stats (Assets This Month, Brand Kits, Plan) → Move to sidebar/header
- Quick Actions Grid → Move to persistent sidebar
- Intel Preview → Becomes full Daily Brief
- Recent Activity Feed → Move to Activity Insights panel
- Usage Display → Move to sidebar/header
- Tips Section → Contextual tips in Daily Brief

**INTO Creator Intel (4 experiences):**

1. **Daily Brief** (`/intel` or `/intel/brief`) - THE NEW HOME
   - 90-second no-BS intel curated for subscribed games
   - Includes welcome, stats, quick actions in header
   
2. **Thumbnail Studio** (`/intel/thumbnails`)
   - Auto-generate from best performers with AI recommendations
   
3. **My Panels** (`/intel/panels`)
   - Customizable panel exploration mode
   
4. **Global Observatory** (`/intel/observatory`)
   - Full platform view of ALL Twitch/YouTube data we parse

---

## PART 1: COMPLETE DATA INVENTORY

### 1.1 Database Tables (100% Mapped)

#### Trend Intelligence (Migration 042)
| Table | Purpose | Data Points | Used In |
|-------|---------|-------------|---------|
| `trend_youtube_snapshots` | Daily YouTube trending by category | videos[], total_views, total_likes, avg_engagement, top_words, color_patterns | Daily Brief, Global Observatory |
| `trend_youtube_videos` | Enriched video details | title, thumbnail, view_count, like_count, viral_score, velocity_score, title_analysis, thumbnail_analysis | Daily Brief, Thumbnail Studio |
| `trend_twitch_snapshots` | 15-min Twitch live state | top_streams[], top_games[], total_viewers, total_streams | Live Pulse, Global Observatory |
| `trend_twitch_hourly` | Hourly rollups for trends | game_rankings[], rising_streamers[], peak_viewers | Golden Hours, Competition Meter |
| `trend_thumbnail_analysis` | AI thumbnail cache | has_face, face_count, face_emotions, dominant_colors, color_mood, composition, complexity_score, thumbnail_score | Thumbnail Studio, Thumbnail Patterns |
| `trend_daily_briefs` | Compiled daily insights | thumbnail_of_day, youtube_highlights, twitch_highlights, hot_games, insights, best_upload_times, title_patterns | Daily Brief |
| `trend_user_searches` | Pro+ search history | query, results, rate limiting | YouTube Search |
| `trend_velocity_alerts` | Studio velocity alerts | alert_type, subject_id, current_value, previous_value, change_percent, velocity_score, severity | Velocity Alerts Panel |

#### Thumbnail Intelligence (Migration 046)
| Table | Purpose | Data Points | Used In |
|-------|---------|-------------|---------|
| `thumbnail_intel` | Daily thumbnail analysis per category | thumbnails[], common_layout, common_colors, ideal_layout, ideal_color_palette, must_have_elements, avoid_elements, pro_tips | Thumbnail Studio, Daily Brief |

#### Clip Radar (Migration 047)
| Table | Purpose | Data Points | Used In |
|-------|---------|-------------|---------|
| `clip_radar_daily_recaps` | Daily viral clip summaries | total_clips_tracked, total_viral_clips, total_views_tracked, peak_velocity, top_clips[], category_stats | Daily Brief, Clip Opportunities |
| `clip_radar_category_recaps` | Per-category clip stats | total_clips, total_views, viral_clips_count, avg_velocity, peak_velocity, top_clips[], hourly_activity[] | Category Deep Dive |

#### Creator Intel (Migration 048)
| Table | Purpose | Data Points | Used In |
|-------|---------|-------------|---------|
| `user_intel_preferences` | User subscriptions & layout | subscribed_categories[], dashboard_layout[], timezone | All Experiences |
| `user_intel_activity` | Activity tracking for AI | category_engagement, active_hours, content_preferences, avg_views_by_category, best_performing_times, panel_engagement, missions_shown/acted | Today's Mission, Activity Insights |

#### Analytics (Migration 009)
| Table | Purpose | Data Points | Used In |
|-------|---------|-------------|---------|
| `analytics_events` | Event aggregation | event_name, event_category, asset_type, event_count, unique_sessions, hour_bucket | Activity Insights |
| `analytics_asset_popularity` | Asset type metrics | asset_type, generation_count, view_count, share_count, date_bucket | Content Preferences |

### 1.2 API Endpoints (100% Mapped)

#### Intel Routes (`/api/v1/intel/*`)
| Endpoint | Method | Purpose | Tier |
|----------|--------|---------|------|
| `/intel/preferences` | GET | Get user preferences | All |
| `/intel/preferences` | PUT | Update layout/timezone | All |
| `/intel/categories/available` | GET | List subscribable categories | All |
| `/intel/categories/subscribe` | POST | Subscribe to category | All (limited) |
| `/intel/categories/{key}` | DELETE | Unsubscribe | All |
| `/intel/activity/track` | POST | Track user activity | Pro+ |
| `/intel/activity/summary` | GET | Get activity insights | Studio |
| `/intel/mission` | GET | Get Today's Mission | Pro+ |
| `/intel/mission/acted` | POST | Mark mission acted | Pro+ |

#### Trends Routes (`/api/v1/trends/*`)
| Endpoint | Method | Purpose | Tier |
|----------|--------|---------|------|
| `/trends/daily-brief` | GET | Compiled daily brief | All |
| `/trends/youtube/trending` | GET | YouTube trending by category | All |
| `/trends/youtube/games` | GET | YouTube gaming with filters | All |
| `/trends/youtube/games/available` | GET | Available game filters | All |
| `/trends/youtube/search` | POST | Search YouTube | Pro+ (rate-limited) |
| `/trends/twitch/live` | GET | Top Twitch streams | All |
| `/trends/twitch/games` | GET | Top Twitch games | All |
| `/trends/twitch/clips` | GET | Top Twitch clips | All |
| `/trends/keywords/{category}` | GET | Trending keywords | Pro+ |
| `/trends/thumbnail/{id}/analysis` | GET | Thumbnail analysis | All (rate-limited) |
| `/trends/timing/{category}` | GET | Optimal timing | Pro+ |
| `/trends/history` | GET | Historical data | Pro+ (7d) / Studio (30d) |
| `/trends/velocity/alerts` | GET | Velocity alerts | Studio |
| `/trends/cross-platform` | GET | Cross-platform data | Studio |

#### Thumbnail Intel Routes (`/api/v1/thumbnail-intel/*`)
| Endpoint | Method | Purpose | Tier |
|----------|--------|---------|------|
| `/thumbnail-intel/categories` | GET | List analyzed categories | All |
| `/thumbnail-intel/overview` | GET | All category insights | All |
| `/thumbnail-intel/category/{key}` | GET | Category-specific insight | All |
| `/thumbnail-intel/analyze` | POST | Trigger analysis | Admin |

#### Clip Radar Routes (`/api/v1/clip-radar/*`)
| Endpoint | Method | Purpose | Tier |
|----------|--------|---------|------|
| `/clip-radar/viral` | GET | Currently viral clips | All |
| `/clip-radar/fresh` | GET | Fresh clips (last N min) | All |
| `/clip-radar/status` | GET | Radar status | All |
| `/clip-radar/categories` | GET | Tracked categories | All |
| `/clip-radar/recaps` | GET | Daily recaps | All |
| `/clip-radar/recaps/{date}` | GET | Specific date recap | All |
| `/clip-radar/recaps/{date}/category/{id}` | GET | Category recap | All |

---

## PART 2: THE FOUR EXPERIENCES

### 2.1 Experience Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CREATOR INTEL = NEW HOME                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  OLD ROUTES (Redirect):                                                     │
│  /dashboard           → /intel (redirect)                                   │
│  /dashboard/create    → /intel/create (keep create flow)                   │
│  /dashboard/assets    → /intel/assets (keep assets)                        │
│  /dashboard/brand-kits → /intel/brand-kits (keep brand kits)               │
│  /dashboard/settings  → /intel/settings (keep settings)                    │
│                                                                             │
│  NEW INTEL ROUTES:                                                          │
│  /intel               → Daily Brief (THE NEW HOME)                         │
│  /intel/thumbnails    → Thumbnail Studio                                   │
│  /intel/panels        → My Panels (customizable exploration)               │
│  /intel/observatory   → Global Observatory                                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  PERSISTENT HEADER                                          │   │   │
│  │  │  Logo | Search | Quick Actions | Stats | Usage | Profile    │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  INTEL TABS                                                 │   │   │
│  │  │  [ 📋 Brief ]  [ 🎨 Thumbnails ]  [ 🎛️ Panels ]  [ 🌐 Global ] │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  CONTENT AREA (changes based on tab)                        │   │   │
│  │  │                                                             │   │   │
│  │  │  Daily Brief | Thumbnail Studio | Panels | Observatory      │   │   │
│  │  │                                                             │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Dashboard → Intel Migration Map

| Old Dashboard Element | New Location | Notes |
|----------------------|--------------|-------|
| Welcome Header | Daily Brief Hero | Personalized greeting stays |
| Stats (Assets, Brand Kits, Plan) | Persistent Header | Always visible |
| Quick Actions Grid | Persistent Header + Brief | Create button always visible |
| Intel Preview | Daily Brief (full) | Expanded to full experience |
| Recent Activity Feed | Activity Insights Panel | In My Panels |
| Usage Display | Persistent Header | Compact usage indicator |
| Tips Section | Daily Brief Alerts | Contextual tips in alerts |
| Getting Started Banner | Onboarding Flow | First-time user experience |

### 2.3 Data Flow Per Experience

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW MAP                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PERSISTENT HEADER (Always visible - from old dashboard)                    │
│  ═══════════════════════════════════════════════════════                    │
│  Sources:                                                                   │
│  ├── users → Display name, subscription tier, avatar                       │
│  ├── assets → Assets generated this month count                            │
│  ├── brand_kits → Brand kit count                                          │
│  └── Quick Actions: Create Asset, Brand Kits, Assets, Settings             │
│                                                                             │
│  DAILY BRIEF (Curated for subscribed categories only) - THE HOME           │
│  ═══════════════════════════════════════════════════════════════           │
│  Sources:                                                                   │
│  ├── user_intel_preferences.subscribed_categories → Filter all data        │
│  ├── trend_daily_briefs → Pre-compiled insights                            │
│  ├── thumbnail_intel → Top 3 thumbnails per subscribed category            │
│  ├── clip_radar_daily_recaps → Viral clips for subscribed games            │
│  ├── trend_youtube_videos → Title patterns, keywords                       │
│  ├── trend_velocity_alerts → Time-sensitive opportunities                  │
│  └── user_intel_activity → Personalized mission (Studio)                   │
│                                                                             │
│  THUMBNAIL STUDIO (AI-powered thumbnail recreation)                         │
│  ═══════════════════════════════════════════════════                        │
│  Sources:                                                                   │
│  ├── thumbnail_intel → Category-specific patterns & recipes                │
│  ├── trend_thumbnail_analysis → Individual thumbnail AI analysis           │
│  ├── trend_youtube_videos → Top performers to recreate                     │
│  └── brand_kits → User's colors, logos, face assets                        │
│                                                                             │
│  MY PANELS (Personalized panels for subscribed categories)                  │
│  ═══════════════════════════════════════════════════════                    │
│  Sources:                                                                   │
│  ├── user_intel_preferences → Layout, subscribed categories                │
│  ├── All trend tables → Filtered by subscribed categories                  │
│  ├── user_intel_activity → Activity insights (Studio)                      │
│  ├── assets → Recent activity feed (from old dashboard)                    │
│  └── clip_radar → Viral clips for subscribed games                         │
│                                                                             │
│  GLOBAL OBSERVATORY (Full platform view - ALL data)                         │
│  ═══════════════════════════════════════════════════                        │
│  Sources:                                                                   │
│  ├── trend_twitch_snapshots → ALL top games, ALL top streams               │
│  ├── trend_youtube_snapshots → ALL trending videos by category             │
│  ├── trend_twitch_hourly → Historical rankings, rising streamers           │
│  ├── clip_radar → ALL viral clips across ALL categories                    │
│  └── thumbnail_intel → ALL category analyses                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PART 3: DAILY BRIEF - 90-SECOND NO-BS INTEL

### 3.1 Design Philosophy

The Daily Brief is **curated exclusively for the user's subscribed categories**. No noise, no fluff - just the intel they need to know from the games they care about.

**Refresh Schedule:**
- Primary: 6:00 AM user timezone
- Secondary: 12:00 PM, 4:00 PM, 8:00 PM (Pro+)
- Manual: On-demand (Studio)

### 3.2 Brief Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DAILY BRIEF LAYOUT                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Good morning, {name}                                               │   │
│  │  December 31, 2025 • Updated 2 hours ago • Next: 6:00 AM            │   │
│  │  Your 90-second intel for: Fortnite, Valorant, Minecraft            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  SECTION 1: TODAY'S PLAY (Hero)                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🎯 TODAY'S PLAY                                                    │   │
│  │                                                                     │   │
│  │  Stream VALORANT between 2-4 PM EST                                 │   │
│  │                                                                     │   │
│  │  Competition: ████░░░░░░ LOW (32% below average)                    │   │
│  │  Confidence: 87%                                                    │   │
│  │                                                                     │   │
│  │  Why: New agent Vyse dropped yesterday. Search volume +340%,        │   │
│  │       but only 12% of usual streamers are live right now.           │   │
│  │                                                                     │   │
│  │  [ 🚀 Start Creating ]                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Data Sources:                                                              │
│  - trend_twitch_hourly.game_rankings → Competition level                   │
│  - trend_velocity_alerts → Opportunity detection                           │
│  - user_intel_activity → Personalization (Studio)                          │
│  - Mission Generator service → Confidence scoring                          │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  SECTION 2: THUMBNAIL FORMULA (Top 3 from subscribed categories)            │
│  ═══════════════════════════════════════════════════════════════════════   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🎨 THUMBNAIL FORMULA                                               │   │
│  │                                                                     │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                             │   │
│  │  │ [thumb] │  │ [thumb] │  │ [thumb] │                             │   │
│  │  │ 2.1M    │  │ 1.8M    │  │ 1.5M    │                             │   │
│  │  │ Fortnite│  │ Valorant│  │ Minecraft│                            │   │
│  │  └─────────┘  └─────────┘  └─────────┘                             │   │
│  │                                                                     │   │
│  │  Quick Analysis:                                                    │   │
│  │  • Face on left (40%), bold text top-right                         │   │
│  │  • Colors: #FF4655 primary, #FFD700 accent                         │   │
│  │  • Pattern: Shocked expression + action word + specific claim       │   │
│  │                                                                     │   │
│  │  [ 🎨 Recreate This ] [ 🎨 Recreate This ] [ 🎨 Recreate This ]    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Data Sources:                                                              │
│  - thumbnail_intel.thumbnails → Top performers per category                │
│  - thumbnail_intel.common_layout, common_colors → Pattern analysis         │
│  - thumbnail_intel.layout_recipe, color_recipe → Recreation guides         │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  SECTION 3: TITLE + TAGS (Copy-ready)                                       │
│  ═══════════════════════════════════════════════════════════════════════   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✏️ TITLE SUGGESTIONS                                               │   │
│  │                                                                     │   │
│  │  1. "The New Valorant Agent is ACTUALLY Broken..."     [📋 Copy]   │   │
│  │     Style: Curiosity gap                                           │   │
│  │                                                                     │   │
│  │  2. "I Tried Vyse for 24 Hours - Here's What Happened" [📋 Copy]   │   │
│  │     Style: Challenge format                                        │   │
│  │                                                                     │   │
│  │  🏷️ OPTIMIZED TAGS                                    [📋 Copy All] │   │
│  │  valorant, vyse, new agent, valorant update, valorant tips,        │   │
│  │  valorant gameplay, vyse abilities, vyse guide                     │   │
│  │                                                                     │   │
│  │  #️⃣ HASHTAGS                                          [📋 Copy All] │   │
│  │  #Valorant #ValorantClips #Vyse #Gaming #FPS                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Data Sources:                                                              │
│  - trend_youtube_videos.title_analysis → Title patterns                    │
│  - /trends/keywords/{category} → Trending keywords                         │
│  - TrendingKeywordsResponse → title_keywords, tag_keywords, hashtags       │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  SECTION 4: CLIP OPPORTUNITIES (React/Tutorial content)                     │
│  ═══════════════════════════════════════════════════════════════════════   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🎬 CLIP OPPORTUNITIES                                              │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ [clip thumb]  TenZ insane 1v5 clutch with Vyse              │   │   │
│  │  │               2.1M views • 45 min ago • Velocity: 🔥 HIGH    │   │   │
│  │  │               Why: Perfect for reaction, trending NOW        │   │   │
│  │  │               [ ▶️ Watch ] [ 🎬 React to This ]              │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ [clip thumb]  Ninja discovers Vyse bug                      │   │   │
│  │  │               890K views • 2 hours ago • Velocity: 📈 RISING │   │   │
│  │  │               Why: Bug content = high engagement             │   │   │
│  │  │               [ ▶️ Watch ] [ 🎬 React to This ]              │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Data Sources:                                                              │
│  - /clip-radar/viral → Currently viral clips                               │
│  - clip_radar_daily_recaps.top_clips → Top clips of the day                │
│  - Filtered by user's subscribed_categories                                │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  SECTION 5: WHAT'S WORKING / NOT WORKING                                    │
│  ═══════════════════════════════════════════════════════════════════════   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✅ WHAT'S WORKING                    ❌ WHAT'S NOT WORKING         │   │
│  │                                                                     │   │
│  │  • Reaction content                   • Tier lists                  │   │
│  │    +45% engagement this week            -23% CTR, oversaturated     │   │
│  │                                                                     │   │
│  │  • "I tried X for 24 hours"           • Generic gameplay            │   │
│  │    3 of top 10 videos                   No hook = low retention     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Data Sources:                                                              │
│  - trend_youtube_videos → Engagement patterns                              │
│  - trend_daily_briefs.insights → AI-generated insights                     │
│  - trend_youtube_snapshots.top_words → Content pattern analysis            │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  SECTION 6: VIDEO IDEAS (3 specific ideas)                                  │
│  ═══════════════════════════════════════════════════════════════════════   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  💡 VIDEO IDEAS                                                     │   │
│  │                                                                     │   │
│  │  1. "Rating Every Vyse Ability (Tier List with a Twist)"           │   │
│  │     Format: tier-list-twist • Opportunity: 85/100                  │   │
│  │     Why: High search volume, low competition                       │   │
│  │                                                                     │   │
│  │  2. "Vyse vs Every Agent - Who Wins?"                              │   │
│  │     Format: versus • Opportunity: 78/100                           │   │
│  │     Why: Comparison content performing well                        │   │
│  │                                                                     │   │
│  │  3. "5 Vyse Tricks Pros Don't Want You to Know"                    │   │
│  │     Format: tips-listicle • Opportunity: 72/100                    │   │
│  │     Why: Educational content has 2x retention                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Data Sources:                                                              │
│  - Cross-platform trend analysis                                           │
│  - trend_youtube_videos.title_analysis → Successful formats                │
│  - user_intel_activity → Personalized to user's content style (Studio)     │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  SECTION 7: ALERTS (Time-sensitive)                                         │
│  ═══════════════════════════════════════════════════════════════════════   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🚨 ALERTS                                                          │   │
│  │                                                                     │   │
│  │  ⚠️ HIGH: Fortnite Chapter 6 announcement in 3 days                │   │
│  │     Action: Prep reaction content, schedule upload for reveal       │   │
│  │                                                                     │   │
│  │  📈 MEDIUM: Minecraft viewership +120% (new update)                │   │
│  │     Action: Consider pivoting today's content                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Data Sources:                                                              │
│  - trend_velocity_alerts → Real-time spikes                                │
│  - Event calendar integration (future)                                     │
│  - trend_twitch_hourly.game_rankings → Category shifts                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Daily Brief API Response

```python
# GET /api/v1/intel/brief
class DailyBriefResponse(BaseModel):
    # Metadata
    brief_date: str
    generated_at: str
    expires_at: str
    next_refresh: str
    categories_used: List[str]  # User's subscribed categories
    user_tier: str
    
    # Section 1: Today's Play
    todays_play: TodaysPlay
    
    # Section 2: Thumbnail Formula
    thumbnail_formulas: List[ThumbnailFormula]  # Top 3
    
    # Section 3: Title + Tags
    title_suggestions: List[TitleSuggestion]
    tags: List[str]
    hashtags: List[str]
    
    # Section 4: Clip Opportunities
    clip_opportunities: List[ClipOpportunity]
    
    # Section 5: What's Working/Not Working
    whats_working: List[InsightItem]
    whats_not_working: List[InsightItem]
    
    # Section 6: Video Ideas
    video_ideas: List[VideoIdea]
    
    # Section 7: Alerts
    alerts: List[Alert]
```

---

## PART 4: THUMBNAIL STUDIO - AI-POWERED RECREATION

### 4.1 Design Philosophy

Thumbnail Studio lets creators **instantly recreate winning thumbnails** with their own face/branding. The system:

1. Analyzes top-performing thumbnails from subscribed categories
2. Extracts layout patterns, colors, and design elements
3. Generates recreation with user's face and brand colors
4. Provides copy-ready title suggestions and keywords

### 4.2 Thumbnail Studio Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          THUMBNAIL STUDIO                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🎨 Thumbnail Studio                                    [ ✕ Close ] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌───────────────────────────┐    ┌───────────────────────────┐            │
│  │                           │    │                           │            │
│  │      REFERENCE            │    │     YOUR THUMBNAIL        │            │
│  │                           │    │                           │            │
│  │   [Winning thumbnail]     │    │   [Generated result]      │            │
│  │                           │    │      or placeholder       │            │
│  │      2.1M views           │    │                           │            │
│  │      Fortnite             │    │                           │            │
│  │                           │    │                           │            │
│  └───────────────────────────┘    └───────────────────────────┘            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📊 WHY THIS WORKS                                                  │   │
│  │                                                                     │   │
│  │  Layout: Face on left (40%), text top-right                        │   │
│  │  Colors: #FF4655 primary, #FFD700 accent                           │   │
│  │  Elements: Shocked expression, bold text, game background          │   │
│  │  Text: "INSANE 1v5 CLUTCH" - action word + specific claim          │   │
│  │                                                                     │   │
│  │  Recipe: Place face on left third, use red as primary with         │   │
│  │          gold accent. Bold sans-serif text, 3-4 words max.         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  📸 YOUR FACE                                                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                                     │
│  │ + Upload│  │ [Saved  │  │ [Saved  │                                     │
│  │  Photo  │  │  face 1]│  │  face 2]│                                     │
│  └─────────┘  └─────────┘  └─────────┘                                     │
│                                                                             │
│  ✏️ CUSTOM TEXT (optional)                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ MY BEST PLAY EVER                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  Original: "INSANE 1v5 CLUTCH"                                              │
│                                                                             │
│  🎨 COLORS                                                                  │
│  ○ Use reference colors    ● Use my brand colors                           │
│    #FF4655 #FFD700           #9D4DFF #00D4FF (from brand kit)              │
│                                                                             │
│  💬 ADDITIONAL INSTRUCTIONS (optional)                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Make the expression more surprised, add my logo bottom right        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│           [ 🚀 Generate My Thumbnail ]                                      │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  After generation:                                                          │
│  [ 🔄 Regenerate ]  [ ✏️ Edit Prompt ]  [ ⬇️ Download PNG (1280x720) ]      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Data Sources for Thumbnail Studio

| Component | Data Source | Endpoint |
|-----------|-------------|----------|
| Reference thumbnails | `thumbnail_intel.thumbnails` | `/thumbnail-intel/category/{key}` |
| Layout analysis | `thumbnail_intel.common_layout` | `/thumbnail-intel/category/{key}` |
| Color patterns | `thumbnail_intel.common_colors`, `ideal_color_palette` | `/thumbnail-intel/category/{key}` |
| Design elements | `thumbnail_intel.must_have_elements`, `avoid_elements` | `/thumbnail-intel/category/{key}` |
| Recipes | `thumbnail_intel.layout_recipe`, `color_recipe` | `/thumbnail-intel/category/{key}` |
| Pro tips | `thumbnail_intel.pro_tips` | `/thumbnail-intel/category/{key}` |
| User faces | `user_thumbnail_assets` | `/thumbnails/assets` |
| Brand colors | `brand_kits.primary_colors`, `accent_colors` | `/brand-kits/active` |

---

## PART 5: MY DASHBOARD - PERSONALIZED PANELS

### 5.1 Design Philosophy

My Dashboard shows **only data relevant to the user's subscribed categories**. It's their personalized command center with drag-and-drop panels.

### 5.2 Available Panels (16 Total)

| Panel | Description | Data Source | Tier |
|-------|-------------|-------------|------|
| `todays_mission` | AI-generated daily recommendation | Mission Generator + Activity | Pro+ |
| `viral_clips` | Breaking viral clips from subscribed games | `/clip-radar/viral` filtered | All |
| `live_pulse` | Top streams for subscribed games | `/trends/twitch/live` filtered | All |
| `youtube_trending` | Trending videos for subscribed games | `/trends/youtube/games` filtered | All |
| `golden_hours` | Optimal posting/streaming times | `/trends/timing/{category}` | Pro+ |
| `niche_opportunities` | Underserved niches in subscribed categories | Competition analysis | Pro+ |
| `viral_hooks` | Trending hooks and patterns | Title/thumbnail analysis | Pro+ |
| `title_formulas` | Successful title patterns | `trend_youtube_videos.title_analysis` | Pro+ |
| `thumbnail_patterns` | Thumbnail design patterns | `thumbnail_intel` | All |
| `competition_meter` | Category saturation level | `trend_twitch_hourly.game_rankings` | Pro+ |
| `weekly_heatmap` | Activity heatmap by day/hour | `trend_twitch_hourly` aggregated | Studio |
| `trending_hashtags` | Trending hashtags and keywords | `/trends/keywords/{category}` | All |
| `velocity_alerts` | Real-time growth alerts | `trend_velocity_alerts` | Studio |
| `timing_recommendations` | Timing insights | `/trends/timing/{category}` | Pro+ |
| `cross_platform` | YouTube + Twitch correlation | `/trends/cross-platform` | Studio |
| `activity_insights` | User activity analysis | `user_intel_activity` | Studio |

### 5.3 Panel Grid System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MY DASHBOARD                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Subscribed: Fortnite, Valorant, Minecraft          [ + Add Category ]      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│   │
│  │  │  TODAY'S    │  │   VIRAL     │  │    LIVE     │  │  YOUTUBE    ││   │
│  │  │  MISSION    │  │   CLIPS     │  │   PULSE     │  │  TRENDING   ││   │
│  │  │             │  │             │  │             │  │             ││   │
│  │  │  Stream     │  │  [clip 1]   │  │  [stream 1] │  │  [video 1]  ││   │
│  │  │  Valorant   │  │  [clip 2]   │  │  [stream 2] │  │  [video 2]  ││   │
│  │  │  2-4 PM     │  │  [clip 3]   │  │  [stream 3] │  │  [video 3]  ││   │
│  │  │             │  │             │  │             │  │             ││   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘│   │
│  │                                                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│   │
│  │  │  GOLDEN     │  │   NICHE     │  │   VIRAL     │  │   TITLE     ││   │
│  │  │  HOURS      │  │   OPPS      │  │   HOOKS     │  │  FORMULAS   ││   │
│  │  │             │  │             │  │             │  │             ││   │
│  │  │  Best time: │  │  Low comp:  │  │  Trending:  │  │  Top titles:││   │
│  │  │  Sat 8 PM   │  │  Vyse tips  │  │  "Actually" │  │  "I tried X"││   │
│  │  │             │  │             │  │  "Broken"   │  │  "vs Every" ││   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘│   │
│  │                                                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│   │
│  │  │ THUMBNAIL   │  │ COMPETITION │  │  WEEKLY     │  │  TRENDING   ││   │
│  │  │ PATTERNS    │  │   METER     │  │  HEATMAP    │  │  HASHTAGS   ││   │
│  │  │             │  │             │  │             │  │             ││   │
│  │  │  Face: 78%  │  │  Fortnite:  │  │  [heatmap]  │  │ #Valorant   ││   │
│  │  │  Text: 92%  │  │  ████░░ MED │  │             │  │ #Vyse       ││   │
│  │  │  Glow: 45%  │  │             │  │             │  │ #Gaming     ││   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘│   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Grid: 4 cols (lg) • 2 cols (md) • 1 col (sm)                              │
│  Sizes: small (1x2), medium (1x3), wide (2x2), tall (1x4), large (2x3)     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Panel Data Filtering

**CRITICAL:** All panels filter data by `user_intel_preferences.subscribed_categories`

```typescript
// Example: Viral Clips Panel
const viralClips = await fetch('/api/v1/clip-radar/viral');
const filteredClips = viralClips.filter(clip => 
  subscribedCategories.some(cat => cat.twitchId === clip.gameId)
);
```

---

## PART 6: GLOBAL OBSERVATORY - FULL PLATFORM VIEW

### 6.1 Design Philosophy

The Global Observatory is the **big picture view** - ALL data we parse across ALL categories. This is where users can:

1. See total Twitch viewership across all top categories
2. Browse ALL YouTube trending videos with filtering/pagination
3. Discover new categories to subscribe to
4. Analyze cross-platform trends

### 6.2 Observatory Sections

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GLOBAL OBSERVATORY                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🌐 Global Observatory                                              │   │
│  │  See everything we're tracking across Twitch and YouTube            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  TAB 1: TWITCH OVERVIEW                                                     │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📊 PLATFORM STATS (Live)                                           │   │
│  │                                                                     │   │
│  │  Total Viewers: 2,847,392    Total Streams: 142,847                │   │
│  │  Last Updated: 2 minutes ago                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🎮 TOP CATEGORIES                                                  │   │
│  │                                                                     │   │
│  │  Rank  Category        Viewers    Streams   Trend    [ Subscribe ] │   │
│  │  ────────────────────────────────────────────────────────────────  │   │
│  │  1     Just Chatting   487,234    12,847    📈 +12%  [ ✓ Subscribed]│   │
│  │  2     Fortnite        342,123    8,234     📈 +8%   [ ✓ Subscribed]│   │
│  │  3     Valorant        298,456    6,123     📈 +45%  [ ✓ Subscribed]│   │
│  │  4     League          245,678    5,847     📉 -3%   [ + Subscribe ]│   │
│  │  5     Minecraft       198,234    4,567     📈 +120% [ ✓ Subscribed]│   │
│  │  6     GTA V           187,456    3,234     ─ Stable [ + Subscribe ]│   │
│  │  7     Apex Legends    156,789    2,987     📈 +5%   [ + Subscribe ]│   │
│  │  8     Call of Duty    134,567    2,456     📉 -8%   [ + Subscribe ]│   │
│  │  ...                                                                │   │
│  │                                                                     │   │
│  │  [ Load More ]                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Data Source: trend_twitch_snapshots.top_games                              │
│  Endpoint: GET /trends/twitch/games                                         │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📺 TOP STREAMS (All Categories)                                    │   │
│  │                                                                     │   │
│  │  Filter: [ All Categories ▼ ]  [ All Languages ▼ ]                 │   │
│  │                                                                     │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐               │   │
│  │  │[stream] │  │[stream] │  │[stream] │  │[stream] │               │   │
│  │  │ xQc     │  │ Kai     │  │ Ninja   │  │ Shroud  │               │   │
│  │  │ 145K    │  │ 98K     │  │ 67K     │  │ 45K     │               │   │
│  │  │ Fortnite│  │ Just Ch │  │ Valorant│  │ Valorant│               │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘               │   │
│  │                                                                     │   │
│  │  [ Load More ]                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Data Source: trend_twitch_snapshots.top_streams                            │
│  Endpoint: GET /trends/twitch/live                                          │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  TAB 2: YOUTUBE TRENDING                                                    │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🎬 YOUTUBE TRENDING VIDEOS                                         │   │
│  │                                                                     │   │
│  │  Filters:                                                           │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │ Game: [ All Games ▼ ]  Sort: [ Views ▼ ]  Duration: [ Any ▼ ]│  │   │
│  │  │ Live: [ Any ▼ ]  Shorts: [ Any ▼ ]  Captions: [ Any ▼ ]      │  │   │
│  │  │ Min Views: [______]  Language: [ Any ▼ ]                     │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  │                                                                     │   │
│  │  Results: 1,247 videos • Page 1 of 63                              │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ [thumb]  The New Valorant Agent is ACTUALLY Broken...       │   │   │
│  │  │          Channel: SomeGamer • 2.1M views • 12 hours ago     │   │   │
│  │  │          Viral Score: 94 • Engagement: 8.2%                 │   │   │
│  │  │          Tags: valorant, vyse, new agent                    │   │   │
│  │  │          [ 🎨 Recreate Thumbnail ] [ 📋 Copy Title ]        │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ [thumb]  I Played Fortnite for 24 Hours Straight            │   │   │
│  │  │          Channel: AnotherGamer • 1.8M views • 1 day ago     │   │   │
│  │  │          Viral Score: 87 • Engagement: 6.5%                 │   │   │
│  │  │          Tags: fortnite, challenge, 24 hours                │   │   │
│  │  │          [ 🎨 Recreate Thumbnail ] [ 📋 Copy Title ]        │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  [ ← Previous ]  [ 1 ] [ 2 ] [ 3 ] ... [ 63 ]  [ Next → ]         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Data Source: trend_youtube_videos                                          │
│  Endpoint: GET /trends/youtube/games                                        │
│  Filters: game, sort_by, sort_order, duration_type, is_live, is_short,     │
│           has_captions, min_views, max_views, min_engagement, language      │
│  Pagination: page, per_page (max 50)                                        │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  TAB 3: VIRAL CLIPS (All Categories)                                        │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🔥 VIRAL CLIPS (5+ views/minute)                                   │   │
│  │                                                                     │   │
│  │  Filter: [ All Categories ▼ ]                                      │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ [clip]  TenZ insane 1v5 clutch                              │   │   │
│  │  │         Broadcaster: TenZ • Game: Valorant                  │   │   │
│  │  │         Views: 2.1M • Velocity: 🔥 45 views/min             │   │   │
│  │  │         Age: 45 minutes • Alert: VIRAL                      │   │   │
│  │  │         [ ▶️ Watch ] [ 🎬 React to This ]                   │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  [ Load More ]                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Data Source: clip_radar (live polling)                                     │
│  Endpoint: GET /clip-radar/viral                                            │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  TAB 4: THUMBNAIL GALLERY (All Categories)                                  │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🎨 THUMBNAIL PATTERNS BY CATEGORY                                  │   │
│  │                                                                     │   │
│  │  Select Category: [ Fortnite ▼ ]                                   │   │
│  │                                                                     │   │
│  │  Category Style Summary:                                            │   │
│  │  "Fortnite thumbnails favor bright, saturated colors with          │   │
│  │   character faces showing exaggerated expressions. Text is         │   │
│  │   typically bold, 3-4 words, positioned top-right."                │   │
│  │                                                                     │   │
│  │  Common Patterns:                                                   │   │
│  │  • Layout: Face left (78%), Text right (92%)                       │   │
│  │  • Colors: #FF4655, #FFD700, #00D4FF                               │   │
│  │  • Elements: Face (78%), Text (92%), Glow (45%)                    │   │
│  │                                                                     │   │
│  │  Must Have: Bright colors, clear focal point, bold text            │   │
│  │  Avoid: Cluttered backgrounds, small text, dark colors             │   │
│  │                                                                     │   │
│  │  Top Thumbnails:                                                    │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐               │   │
│  │  │[thumb 1]│  │[thumb 2]│  │[thumb 3]│  │[thumb 4]│               │   │
│  │  │ 2.1M    │  │ 1.8M    │  │ 1.5M    │  │ 1.2M    │               │   │
│  │  │[Recreate│  │[Recreate│  │[Recreate│  │[Recreate│               │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Data Source: thumbnail_intel                                               │
│  Endpoint: GET /thumbnail-intel/category/{key}                              │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  TAB 5: HISTORICAL DATA (Pro+)                                              │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📈 HISTORICAL TRENDS                                               │   │
│  │                                                                     │   │
│  │  Date Range: [ Last 7 Days ▼ ] (Pro: 7 days, Studio: 30 days)      │   │
│  │                                                                     │   │
│  │  [Chart: Category viewership over time]                            │   │
│  │                                                                     │   │
│  │  Daily Recaps:                                                      │   │
│  │  • Dec 30: Valorant +45% (new agent), Fortnite -5%                 │   │
│  │  • Dec 29: Minecraft +120% (update), stable elsewhere              │   │
│  │  • Dec 28: Normal activity across all categories                   │   │
│  │                                                                     │   │
│  │  Velocity Alerts History:                                           │   │
│  │  • Dec 30 2:00 PM: Valorant spike (+340% search volume)            │   │
│  │  • Dec 29 10:00 AM: Minecraft spike (+120% viewership)             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Data Source: trend_twitch_hourly, trend_velocity_alerts                    │
│  Endpoint: GET /trends/history                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PART 7: TIER-BASED ACCESS CONTROL

### 7.1 Feature Matrix (Complete)

| Feature | Free | Pro | Studio |
|---------|------|-----|--------|
| **Category Subscriptions** | 3 | 10 | 100 |
| **Daily Brief** | ✅ Basic | ✅ Full | ✅ Full + Manual Refresh |
| **Brief Refresh** | 6 AM only | 4x daily | On-demand |
| **Thumbnail Studio** | 3 recreations/day | 20/day | 1000/day |
| **Thumbnail Recipes** | ❌ | ✅ | ✅ |
| **My Dashboard Panels** | 6 basic | 12 panels | 16 panels (all) |
| **Global Observatory** | ✅ View only | ✅ + Filters | ✅ + History |
| **YouTube Search** | ❌ | 10/day | 50/day |
| **Activity Tracking** | ❌ | ✅ Basic | ✅ Full |
| **Activity Insights** | ❌ | ❌ | ✅ |
| **Today's Mission** | ❌ | ✅ | ✅ Personalized |
| **Historical Data** | ❌ | 7 days | 30 days |
| **Velocity Alerts** | ❌ | ❌ | ✅ |
| **Timing Recommendations** | ❌ | ✅ | ✅ |
| **Cross-Platform Data** | ❌ | ❌ | ✅ |
| **Trending Keywords** | ❌ | ✅ | ✅ |
| **Golden Hours** | ❌ | ✅ | ✅ |
| **Competition Meter** | ❌ | ✅ | ✅ |
| **Weekly Heatmap** | ❌ | ❌ | ✅ |

### 7.2 Upgrade CTAs

Each locked feature shows a contextual upgrade CTA:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔒 TODAY'S MISSION                                                         │
│                                                                             │
│  Get personalized daily recommendations based on your activity              │
│  and the current competitive landscape.                                     │
│                                                                             │
│  [ 🚀 Upgrade to Pro - $9.99/mo ]                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PART 8: IMPLEMENTATION CHECKLIST

### 8.1 Backend Endpoints (Status)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /intel/preferences` | ✅ Implemented | |
| `PUT /intel/preferences` | ✅ Implemented | |
| `GET /intel/categories/available` | ✅ Implemented | |
| `POST /intel/categories/subscribe` | ✅ Implemented | |
| `DELETE /intel/categories/{key}` | ✅ Implemented | |
| `POST /intel/activity/track` | ✅ Implemented | |
| `GET /intel/activity/summary` | ✅ Implemented | |
| `GET /intel/mission` | ✅ Implemented | |
| `POST /intel/mission/acted` | ✅ Implemented | |
| `GET /intel/brief` | 🔴 TODO | New endpoint for Daily Brief |
| `POST /intel/brief/refresh` | 🔴 TODO | Studio manual refresh |
| `GET /trends/daily-brief` | 🟡 Placeholder | Needs full implementation |
| `GET /trends/youtube/trending` | 🟡 Placeholder | Needs full implementation |
| `GET /trends/youtube/games` | 🟡 Placeholder | Needs full implementation |
| `POST /trends/youtube/search` | 🟡 Placeholder | Needs full implementation |
| `GET /trends/twitch/live` | 🟡 Placeholder | Needs full implementation |
| `GET /trends/twitch/games` | 🟡 Placeholder | Needs full implementation |
| `GET /trends/twitch/clips` | 🟡 Placeholder | Needs full implementation |
| `GET /trends/keywords/{category}` | 🟡 Placeholder | Needs full implementation |
| `GET /trends/thumbnail/{id}/analysis` | 🟡 Placeholder | Needs full implementation |
| `GET /trends/timing/{category}` | 🟡 Placeholder | Needs full implementation |
| `GET /trends/history` | 🟡 Placeholder | Needs full implementation |
| `GET /trends/velocity/alerts` | 🟡 Placeholder | Needs full implementation |
| `GET /trends/cross-platform` | 🟡 Placeholder | Needs full implementation |
| `GET /thumbnail-intel/categories` | ✅ Implemented | |
| `GET /thumbnail-intel/overview` | ✅ Implemented | |
| `GET /thumbnail-intel/category/{key}` | ✅ Implemented | |
| `GET /clip-radar/viral` | ✅ Implemented | |
| `GET /clip-radar/fresh` | ✅ Implemented | |
| `GET /clip-radar/recaps` | ✅ Implemented | |

### 8.2 Frontend Pages (Status)

| Page | Status | Notes |
|------|--------|-------|
| `/intel` | 🔴 TODO | Redirect to /intel/brief |
| `/intel/brief` | 🔴 TODO | Daily Brief page |
| `/intel/thumbnails` | 🔴 TODO | Thumbnail Studio |
| `/intel/dashboard` | 🟡 Partial | PanelGrid exists, needs panels |
| `/intel/observatory` | 🔴 TODO | Global Observatory |

### 8.3 Frontend Components (Status)

| Component | Status | Notes |
|-----------|--------|-------|
| `DailyBrief.tsx` | 🔴 TODO | Main brief component |
| `TodaysPlay.tsx` | 🔴 TODO | Hero section |
| `ThumbnailFormula.tsx` | 🔴 TODO | Thumbnail section |
| `TitleTags.tsx` | 🔴 TODO | Title/tags section |
| `ClipOpportunities.tsx` | 🔴 TODO | Clips section |
| `WhatsWorking.tsx` | 🔴 TODO | Insights section |
| `VideoIdeas.tsx` | 🔴 TODO | Ideas section |
| `Alerts.tsx` | 🔴 TODO | Alerts section |
| `ThumbnailStudio.tsx` | 🔴 TODO | Recreation UI |
| `PanelGrid.tsx` | ✅ Implemented | Grid layout |
| `TodaysMissionPanel.tsx` | 🔴 TODO | Mission panel |
| `ViralClipsPanel.tsx` | 🔴 TODO | Clips panel |
| `LivePulsePanel.tsx` | 🔴 TODO | Streams panel |
| `YouTubeTrendingPanel.tsx` | 🔴 TODO | Videos panel |
| `GoldenHoursPanel.tsx` | 🔴 TODO | Timing panel |
| `ThumbnailPatternsPanel.tsx` | 🔴 TODO | Patterns panel |
| `CompetitionMeterPanel.tsx` | 🔴 TODO | Competition panel |
| `TrendingHashtagsPanel.tsx` | 🔴 TODO | Hashtags panel |
| `VelocityAlertsPanel.tsx` | 🔴 TODO | Alerts panel |
| `GlobalObservatory.tsx` | 🔴 TODO | Observatory page |
| `TwitchOverview.tsx` | 🔴 TODO | Twitch tab |
| `YouTubeTrending.tsx` | 🔴 TODO | YouTube tab |
| `ViralClipsGallery.tsx` | 🔴 TODO | Clips tab |
| `ThumbnailGallery.tsx` | 🔴 TODO | Thumbnails tab |
| `HistoricalData.tsx` | 🔴 TODO | History tab |

---

## PART 9: DATA UTILIZATION SUMMARY

### 9.1 100% Coverage Verification

| Data Source | Used In | Coverage |
|-------------|---------|----------|
| `trend_youtube_snapshots` | Daily Brief, Observatory | ✅ 100% |
| `trend_youtube_videos` | Daily Brief, Thumbnail Studio, Observatory | ✅ 100% |
| `trend_twitch_snapshots` | Live Pulse, Observatory | ✅ 100% |
| `trend_twitch_hourly` | Golden Hours, Competition, Heatmap | ✅ 100% |
| `trend_thumbnail_analysis` | Thumbnail Studio | ✅ 100% |
| `trend_daily_briefs` | Daily Brief | ✅ 100% |
| `trend_user_searches` | YouTube Search | ✅ 100% |
| `trend_velocity_alerts` | Alerts Panel, Daily Brief | ✅ 100% |
| `thumbnail_intel` | Thumbnail Studio, Daily Brief, Observatory | ✅ 100% |
| `clip_radar_daily_recaps` | Daily Brief, Observatory | ✅ 100% |
| `clip_radar_category_recaps` | Category Deep Dive | ✅ 100% |
| `user_intel_preferences` | All Experiences | ✅ 100% |
| `user_intel_activity` | Mission, Activity Insights | ✅ 100% |
| `analytics_events` | Activity Insights | ✅ 100% |
| `analytics_asset_popularity` | Content Preferences | ✅ 100% |

### 9.2 API Endpoint Utilization

| Endpoint | Used In | Coverage |
|----------|---------|----------|
| `/intel/preferences` | All Experiences | ✅ |
| `/intel/categories/*` | Category Management | ✅ |
| `/intel/activity/*` | Activity Tracking | ✅ |
| `/intel/mission` | Today's Mission | ✅ |
| `/intel/brief` | Daily Brief | ✅ |
| `/trends/daily-brief` | Daily Brief | ✅ |
| `/trends/youtube/*` | Observatory, Dashboard | ✅ |
| `/trends/twitch/*` | Observatory, Dashboard | ✅ |
| `/trends/keywords/*` | Daily Brief, Dashboard | ✅ |
| `/trends/thumbnail/*` | Thumbnail Studio | ✅ |
| `/trends/timing/*` | Golden Hours | ✅ |
| `/trends/history` | Observatory | ✅ |
| `/trends/velocity/alerts` | Alerts Panel | ✅ |
| `/trends/cross-platform` | Cross-Platform Panel | ✅ |
| `/thumbnail-intel/*` | Thumbnail Studio, Observatory | ✅ |
| `/clip-radar/*` | Viral Clips, Daily Brief | ✅ |

---

## PART 10: AESTHETIC GUIDELINES

### 10.1 Design Principles

1. **Clean & Sleek** - Minimal visual noise, clear hierarchy
2. **Enterprise Patterns** - Professional, trustworthy, data-driven
3. **Aesthetically Soothing** - Calm colors, smooth transitions
4. **Information Dense** - Maximum data, minimum clutter
5. **Action-Oriented** - Every insight has a clear next step

### 10.2 Color Palette

```css
/* Primary */
--intel-bg: #0A0A0F;           /* Deep dark background */
--intel-surface: #12121A;       /* Card backgrounds */
--intel-border: #1E1E2E;        /* Subtle borders */

/* Accent */
--intel-primary: #9D4DFF;       /* Purple - primary actions */
--intel-secondary: #00D4FF;     /* Cyan - secondary elements */
--intel-success: #00FF88;       /* Green - positive indicators */
--intel-warning: #FFD700;       /* Gold - alerts */
--intel-danger: #FF4655;        /* Red - urgent/negative */

/* Text */
--intel-text-primary: #FFFFFF;
--intel-text-secondary: #A0A0B0;
--intel-text-muted: #606070;
```

### 10.3 Typography

```css
/* Headings */
font-family: 'Inter', sans-serif;
font-weight: 600;

/* Body */
font-family: 'Inter', sans-serif;
font-weight: 400;

/* Data/Numbers */
font-family: 'JetBrains Mono', monospace;
font-weight: 500;
```

### 10.4 Component Patterns

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CARD PATTERN                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🎯 SECTION TITLE                                    [ Action ]     │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                     │   │
│  │  Content area with consistent padding (16px)                        │   │
│  │                                                                     │   │
│  │  • Bullet points for lists                                          │   │
│  │  • Clear visual hierarchy                                           │   │
│  │  • Action buttons bottom-right                                      │   │
│  │                                                                     │   │
│  │                                              [ Primary ] [ Secondary]│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Border: 1px solid var(--intel-border)                                      │
│  Border-radius: 12px                                                        │
│  Background: var(--intel-surface)                                           │
│  Shadow: 0 4px 24px rgba(0, 0, 0, 0.2)                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## CONCLUSION

This specification ensures **100% utilization** of all backend intelligence infrastructure:

- **8 Database Systems** fully mapped and utilized
- **30+ API Endpoints** integrated across 4 experiences
- **16 Dashboard Panels** with tier-based access
- **4 Distinct Experiences** serving different user needs

The redesign creates a cohesive, enterprise-grade intelligence platform that:

1. **Daily Brief** - Delivers 90-second no-BS intel for subscribed games
2. **Thumbnail Studio** - Enables instant recreation of winning thumbnails
3. **My Dashboard** - Provides personalized panels for subscribed categories
4. **Global Observatory** - Offers full platform visibility with filtering/pagination

All data is utilized. No capabilities are wasted. The experience is clean, sleek, and aesthetically soothing.

---

*Document generated from comprehensive backend audit with 100% coverage verification.*


---

## ADDENDUM: DASHBOARD → INTEL CONSOLIDATION

### Key Change: `/dashboard` → `/intel`

Creator Intel **REPLACES** the current dashboard as the new home. This consolidation:

1. **Eliminates redundancy** - No separate "overview" and "intel" experiences
2. **Centralizes intelligence** - All creator insights in one place
3. **Maintains functionality** - All dashboard features preserved

### Route Migration

| Old Route | New Route | Notes |
|-----------|-----------|-------|
| `/dashboard` | `/intel` | Redirect, Daily Brief is new home |
| `/dashboard/create` | `/intel/create` | Keep create flow |
| `/dashboard/assets` | `/intel/assets` | Keep assets library |
| `/dashboard/brand-kits` | `/intel/brand-kits` | Keep brand kits |
| `/dashboard/settings` | `/intel/settings` | Keep settings |
| `/dashboard/analytics` | `/intel/analytics` | Keep analytics |
| NEW | `/intel/thumbnails` | Thumbnail Studio |
| NEW | `/intel/panels` | Customizable panels |
| NEW | `/intel/observatory` | Global data view |

### Dashboard Elements → Intel Location

| Dashboard Element | Intel Location |
|-------------------|----------------|
| Welcome Header ("Good morning, {name}") | Daily Brief hero |
| Stats (Assets, Brand Kits, Plan) | Persistent header bar |
| Quick Actions Grid | Persistent header + sidebar |
| Intel Preview | Full Daily Brief (expanded) |
| Recent Activity Feed | Activity Insights panel (My Panels) |
| Usage Display | Compact indicator in header |
| Tips Section | Alerts section in Daily Brief |
| Getting Started Banner | Onboarding flow / Alerts |

### Persistent Header (Always Visible)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🎮 AuraStream                                                              │
│                                                                             │
│  [ 🔍 Search ]                                                              │
│                                                                             │
│  📊 12 Assets  |  🎨 3 Brand Kits  |  ⭐ Pro  |  Usage: 12/∞               │
│                                                                             │
│  [ + Create ]  [ Brand Kits ]  [ Assets ]  [ ⚙️ Settings ]  [ 👤 Profile ] │
└─────────────────────────────────────────────────────────────────────────────┘
```

This header replaces the old dashboard stats grid and quick actions, making them always accessible regardless of which Intel tab you're on.

### Benefits of Consolidation

1. **Single source of truth** - One place for all creator intelligence
2. **Faster access** - Stats and actions always visible in header
3. **Cleaner navigation** - 4 clear tabs instead of scattered pages
4. **Better data utilization** - 100% of backend data surfaced
5. **Enterprise feel** - Professional, unified experience
