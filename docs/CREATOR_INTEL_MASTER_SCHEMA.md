# 🧠 CREATOR INTEL MASTER SCHEMA
## Complete Build Reference for Intelligence Dashboard

**Version:** 2.0.0  
**Last Updated:** December 31, 2025  
**Purpose:** Definitive reference for building the complete Creator Intel system with 100% feature utilization

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Subscription Tier Integration](#2-subscription-tier-integration)
3. [Database Schema](#3-database-schema)
4. [Backend API Reference](#4-backend-api-reference)
5. [Frontend Type Definitions](#5-frontend-type-definitions)
6. [Panel System](#6-panel-system)
7. [Activity Tracking System](#7-activity-tracking-system)
8. [Mission Generation System](#8-mission-generation-system)
9. [Trends Intelligence System](#9-trends-intelligence-system)
10. [Thumbnail Intelligence System](#10-thumbnail-intelligence-system)
11. [Analytics Integration](#11-analytics-integration)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. SYSTEM OVERVIEW

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CREATOR INTEL DASHBOARD                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Today's    │  │   Viral     │  │    Live     │  │  YouTube    │        │
│  │  Mission    │  │   Clips     │  │   Pulse     │  │  Trending   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Golden     │  │   Niche     │  │   Viral     │  │   Title     │        │
│  │  Hours      │  │   Opps      │  │   Hooks     │  │  Formulas   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Thumbnail   │  │ Competition │  │  Weekly     │  │  Trending   │        │
│  │ Patterns    │  │   Meter     │  │  Heatmap    │  │  Hashtags   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Velocity   │  │   Timing    │  │   Cross     │  │  Activity   │        │
│  │  Alerts     │  │   Recs      │  │  Platform   │  │  Insights   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  /api/v1/intel/*           │  /api/v1/trends/*      │  /api/v1/thumbnail-*  │
│  - preferences             │  - daily-brief         │  - categories         │
│  - categories              │  - youtube/trending    │  - overview           │
│  - activity                │  - twitch/live         │  - category/{key}     │
│  - mission                 │  - velocity/alerts     │  - analyze            │
│  - activity/summary        │  - timing/{category}   │                       │
│                            │  - keywords/{category} │                       │
│                            │  - cross-platform      │                       │
│                            │  - history             │                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVICE LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  intel/                    │  trends/               │  thumbnail_intel/     │
│  - preferences_repository  │  - trend_service       │  - service            │
│  - activity_tracker        │  - youtube_collector   │  - collector          │
│  - mission_generator       │  - twitch_collector    │  - vision_analyzer    │
│  - categories              │                        │  - repository         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             DATA LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Supabase)                              │  Redis                │
│  - user_intel_preferences                           │  - Session cache      │
│  - user_intel_activity                              │  - Rate limiting      │
│  - thumbnail_intel                                  │  - Mission cache      │
│  - analytics_events                                 │  - Trend cache        │
│  - analytics_asset_popularity                       │                       │
└─────────────────────────────────────────────────────────────────────────────┘
```


---

## 2. SUBSCRIPTION TIER INTEGRATION

### Tier Feature Matrix

| Feature | Free | Pro | Studio |
|---------|------|-----|--------|
| **Category Subscriptions** | 3 | 10 | 100 |
| **Dashboard Panels** | 6 basic | 12 panels | 16 panels (all) |
| **Activity Tracking** | ❌ | ✅ Basic | ✅ Full |
| **Activity Insights** | ❌ | ❌ | ✅ |
| **Today's Mission** | ❌ | ✅ | ✅ |
| **Mission Personalization** | ❌ | ❌ | ✅ |
| **YouTube Search/day** | 0 | 10 | 50 |
| **Thumbnail Analysis/day** | 3 | 20 | 1000 |
| **Thumbnail Recipes** | ❌ | ✅ | ✅ |
| **Historical Data** | 0 days | 7 days | 30 days |
| **Velocity Alerts** | ❌ | ❌ | ✅ |
| **Timing Recommendations** | ❌ | ✅ | ✅ |
| **Cross-Platform Data** | ❌ | ❌ | ✅ |
| **Trending Keywords** | ❌ | ✅ | ✅ |
| **Golden Hours** | ❌ | ✅ | ✅ |
| **Competition Meter** | ❌ | ✅ | ✅ |
| **Weekly Heatmap** | ❌ | ❌ | ✅ |

### Tier Constants (Backend)

```python
# backend/services/intel/tier_limits.py

from typing import Dict, Any, Literal

TierName = Literal["free", "pro", "studio"]

INTEL_TIER_LIMITS: Dict[TierName, Dict[str, Any]] = {
    "free": {
        # Category limits
        "max_categories": 3,
        
        # Panel access
        "allowed_panels": [
            "viral_clips",
            "live_pulse", 
            "youtube_trending",
            "thumbnail_patterns",
            "trending_hashtags",
            "todays_mission",  # Shows upgrade CTA
        ],
        
        # Feature flags
        "activity_tracking": False,
        "activity_insights": False,
        "mission_enabled": False,
        "mission_personalization": False,
        
        # Rate limits
        "youtube_searches_per_day": 0,
        "thumbnail_analyses_per_day": 3,
        "thumbnail_recipes": False,
        
        # Data access
        "history_days": 0,
        "velocity_alerts": False,
        "timing_recommendations": False,
        "cross_platform": False,
        "trending_keywords": False,
        "golden_hours": False,
        "competition_meter": False,
        "weekly_heatmap": False,
    },
    "pro": {
        # Category limits
        "max_categories": 10,
        
        # Panel access
        "allowed_panels": [
            "todays_mission",
            "viral_clips",
            "live_pulse",
            "youtube_trending",
            "golden_hours",
            "niche_opportunities",
            "viral_hooks",
            "title_formulas",
            "thumbnail_patterns",
            "competition_meter",
            "trending_hashtags",
            "timing_recommendations",
        ],
        
        # Feature flags
        "activity_tracking": True,
        "activity_insights": False,
        "mission_enabled": True,
        "mission_personalization": False,
        
        # Rate limits
        "youtube_searches_per_day": 10,
        "thumbnail_analyses_per_day": 20,
        "thumbnail_recipes": True,
        
        # Data access
        "history_days": 7,
        "velocity_alerts": False,
        "timing_recommendations": True,
        "cross_platform": False,
        "trending_keywords": True,
        "golden_hours": True,
        "competition_meter": True,
        "weekly_heatmap": False,
    },
    "studio": {
        # Category limits
        "max_categories": 100,
        
        # Panel access (ALL panels)
        "allowed_panels": [
            "todays_mission",
            "viral_clips",
            "live_pulse",
            "youtube_trending",
            "golden_hours",
            "niche_opportunities",
            "viral_hooks",
            "title_formulas",
            "thumbnail_patterns",
            "competition_meter",
            "weekly_heatmap",
            "trending_hashtags",
            "velocity_alerts",
            "timing_recommendations",
            "cross_platform",
            "activity_insights",
        ],
        
        # Feature flags
        "activity_tracking": True,
        "activity_insights": True,
        "mission_enabled": True,
        "mission_personalization": True,
        
        # Rate limits
        "youtube_searches_per_day": 50,
        "thumbnail_analyses_per_day": 1000,
        "thumbnail_recipes": True,
        
        # Data access
        "history_days": 30,
        "velocity_alerts": True,
        "timing_recommendations": True,
        "cross_platform": True,
        "trending_keywords": True,
        "golden_hours": True,
        "competition_meter": True,
        "weekly_heatmap": True,
    },
}


def get_tier_limits(tier: TierName) -> Dict[str, Any]:
    """Get limits for a subscription tier."""
    return INTEL_TIER_LIMITS.get(tier, INTEL_TIER_LIMITS["free"])


def check_panel_access(tier: TierName, panel_type: str) -> bool:
    """Check if a tier has access to a specific panel."""
    limits = get_tier_limits(tier)
    return panel_type in limits["allowed_panels"]


def check_feature_access(tier: TierName, feature: str) -> bool:
    """Check if a tier has access to a specific feature."""
    limits = get_tier_limits(tier)
    return limits.get(feature, False)
```

### Tier Constants (Frontend)

```typescript
// tsx/packages/shared/src/constants/intelTierLimits.ts

export type TierName = 'free' | 'pro' | 'studio';

export interface IntelTierLimits {
  // Category limits
  maxCategories: number;
  
  // Panel access
  allowedPanels: string[];
  
  // Feature flags
  activityTracking: boolean;
  activityInsights: boolean;
  missionEnabled: boolean;
  missionPersonalization: boolean;
  
  // Rate limits
  youtubeSearchesPerDay: number;
  thumbnailAnalysesPerDay: number;
  thumbnailRecipes: boolean;
  
  // Data access
  historyDays: number;
  velocityAlerts: boolean;
  timingRecommendations: boolean;
  crossPlatform: boolean;
  trendingKeywords: boolean;
  goldenHours: boolean;
  competitionMeter: boolean;
  weeklyHeatmap: boolean;
}

export const INTEL_TIER_LIMITS: Record<TierName, IntelTierLimits> = {
  free: {
    maxCategories: 3,
    allowedPanels: [
      'viral_clips',
      'live_pulse',
      'youtube_trending',
      'thumbnail_patterns',
      'trending_hashtags',
      'todays_mission',
    ],
    activityTracking: false,
    activityInsights: false,
    missionEnabled: false,
    missionPersonalization: false,
    youtubeSearchesPerDay: 0,
    thumbnailAnalysesPerDay: 3,
    thumbnailRecipes: false,
    historyDays: 0,
    velocityAlerts: false,
    timingRecommendations: false,
    crossPlatform: false,
    trendingKeywords: false,
    goldenHours: false,
    competitionMeter: false,
    weeklyHeatmap: false,
  },
  pro: {
    maxCategories: 10,
    allowedPanels: [
      'todays_mission',
      'viral_clips',
      'live_pulse',
      'youtube_trending',
      'golden_hours',
      'niche_opportunities',
      'viral_hooks',
      'title_formulas',
      'thumbnail_patterns',
      'competition_meter',
      'trending_hashtags',
      'timing_recommendations',
    ],
    activityTracking: true,
    activityInsights: false,
    missionEnabled: true,
    missionPersonalization: false,
    youtubeSearchesPerDay: 10,
    thumbnailAnalysesPerDay: 20,
    thumbnailRecipes: true,
    historyDays: 7,
    velocityAlerts: false,
    timingRecommendations: true,
    crossPlatform: false,
    trendingKeywords: true,
    goldenHours: true,
    competitionMeter: true,
    weeklyHeatmap: false,
  },
  studio: {
    maxCategories: 100,
    allowedPanels: [
      'todays_mission',
      'viral_clips',
      'live_pulse',
      'youtube_trending',
      'golden_hours',
      'niche_opportunities',
      'viral_hooks',
      'title_formulas',
      'thumbnail_patterns',
      'competition_meter',
      'weekly_heatmap',
      'trending_hashtags',
      'velocity_alerts',
      'timing_recommendations',
      'cross_platform',
      'activity_insights',
    ],
    activityTracking: true,
    activityInsights: true,
    missionEnabled: true,
    missionPersonalization: true,
    youtubeSearchesPerDay: 50,
    thumbnailAnalysesPerDay: 1000,
    thumbnailRecipes: true,
    historyDays: 30,
    velocityAlerts: true,
    timingRecommendations: true,
    crossPlatform: true,
    trendingKeywords: true,
    goldenHours: true,
    competitionMeter: true,
    weeklyHeatmap: true,
  },
};

export function getTierLimits(tier: TierName): IntelTierLimits {
  return INTEL_TIER_LIMITS[tier] || INTEL_TIER_LIMITS.free;
}

export function checkPanelAccess(tier: TierName, panelType: string): boolean {
  const limits = getTierLimits(tier);
  return limits.allowedPanels.includes(panelType);
}

export function checkFeatureAccess(tier: TierName, feature: keyof IntelTierLimits): boolean {
  const limits = getTierLimits(tier);
  return Boolean(limits[feature]);
}
```

---

## 3. DATABASE SCHEMA

### Table: `user_intel_preferences`

```sql
-- Migration 048: Creator Intel Preferences
CREATE TABLE IF NOT EXISTS user_intel_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Category subscriptions (JSONB array)
    -- Structure: [{ 
    --   "key": "fortnite", 
    --   "name": "Fortnite", 
    --   "twitch_id": "33214", 
    --   "youtube_query": "fortnite",
    --   "platform": "both", 
    --   "notifications": true, 
    --   "added_at": "2025-12-31T00:00:00Z" 
    -- }]
    subscribed_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Dashboard layout (JSONB array)
    -- Structure: [{ 
    --   "panel_type": "viral_clips", 
    --   "position": { "x": 0, "y": 0 }, 
    --   "size": "large" 
    -- }]
    dashboard_layout JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- User timezone for timing recommendations
    timezone TEXT DEFAULT 'America/New_York',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One preferences record per user
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_intel_preferences_user_id 
ON user_intel_preferences(user_id);

-- RLS Policies
ALTER TABLE user_intel_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own intel preferences"
ON user_intel_preferences FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own intel preferences"
ON user_intel_preferences FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own intel preferences"
ON user_intel_preferences FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### Table: `user_intel_activity`

```sql
-- Migration 048: Creator Intel Activity Tracking
CREATE TABLE IF NOT EXISTS user_intel_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Category engagement tracking
    -- Structure: { "fortnite": 45, "valorant": 30, "just_chatting": 25 }
    category_engagement JSONB DEFAULT '{}'::jsonb,
    
    -- Active hours tracking (when user is on platform)
    -- Structure: { "0": 5, "1": 2, "14": 15, "15": 20, "20": 12 }
    active_hours JSONB DEFAULT '{}'::jsonb,
    
    -- Content creation preferences
    -- Structure: { "twitch_emote": 12, "youtube_thumbnail": 8 }
    content_preferences JSONB DEFAULT '{}'::jsonb,
    
    -- Historical performance data (if connected)
    -- Structure: { "fortnite": 1500, "valorant": 800 }
    avg_views_by_category JSONB DEFAULT '{}'::jsonb,
    
    -- Best performing times
    -- Structure: { "best_day": "saturday", "best_hour": 20 }
    best_performing_times JSONB DEFAULT '{}'::jsonb,
    
    -- Panel engagement tracking
    -- Structure: { "viral_clips": 45, "live_pulse": 30 }
    panel_engagement JSONB DEFAULT '{}'::jsonb,
    
    -- Event type breakdown
    -- Structure: { "category_view": 100, "panel_interaction": 50 }
    event_breakdown JSONB DEFAULT '{}'::jsonb,
    
    -- Mission interaction tracking
    last_mission_shown_at TIMESTAMPTZ,
    last_mission_acted_on BOOLEAN DEFAULT FALSE,
    missions_shown_count INT DEFAULT 0,
    missions_acted_count INT DEFAULT 0,
    
    -- Computed metrics (updated on activity)
    most_active_hour INT,
    engagement_level TEXT DEFAULT 'low', -- 'low', 'medium', 'high'
    
    -- Timestamps
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One activity record per user
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_intel_activity_user_id 
ON user_intel_activity(user_id);

-- RLS Policies
ALTER TABLE user_intel_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own intel activity"
ON user_intel_activity FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own intel activity"
ON user_intel_activity FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own intel activity"
ON user_intel_activity FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### Table: `thumbnail_intel`

```sql
-- Migration 046: Thumbnail Intelligence
CREATE TABLE IF NOT EXISTS thumbnail_intel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_key TEXT NOT NULL,
    category_name TEXT NOT NULL,
    analysis_date DATE NOT NULL,
    
    -- Individual thumbnail analyses (JSONB array)
    -- Structure: [{
    --   "video_id": "abc123",
    --   "title": "Video Title",
    --   "thumbnail_url": "https://...",
    --   "view_count": 1000000,
    --   "layout_type": "face-left-text-right",
    --   "text_placement": "top-right",
    --   "focal_point": "character-face",
    --   "dominant_colors": ["#FF0000", "#00FF00"],
    --   "color_mood": "energetic",
    --   "background_style": "gradient",
    --   "has_face": true,
    --   "has_text": true,
    --   "text_content": "INSANE!",
    --   "has_border": false,
    --   "has_glow_effects": true,
    --   "has_arrows_circles": false,
    --   "layout_recipe": "Place face on left 1/3...",
    --   "color_recipe": "Use vibrant red as primary...",
    --   "why_it_works": "High contrast draws attention...",
    --   "difficulty": "medium"
    -- }]
    thumbnails JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Aggregated patterns
    common_layout TEXT,
    common_colors TEXT[] DEFAULT '{}',
    common_elements TEXT[] DEFAULT '{}',
    
    -- Category recommendations
    ideal_layout TEXT,
    ideal_color_palette TEXT[] DEFAULT '{}',
    must_have_elements TEXT[] DEFAULT '{}',
    avoid_elements TEXT[] DEFAULT '{}',
    
    -- Summary and tips
    category_style_summary TEXT,
    pro_tips TEXT[] DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one analysis per category per day
    UNIQUE(category_key, analysis_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_thumbnail_intel_category 
ON thumbnail_intel(category_key);

CREATE INDEX IF NOT EXISTS idx_thumbnail_intel_date 
ON thumbnail_intel(analysis_date DESC);

CREATE INDEX IF NOT EXISTS idx_thumbnail_intel_category_date 
ON thumbnail_intel(category_key, analysis_date DESC);

-- RLS (Public read access)
ALTER TABLE thumbnail_intel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "thumbnail_intel_public_read" ON thumbnail_intel
FOR SELECT USING (true);

CREATE POLICY "thumbnail_intel_service_write" ON thumbnail_intel
FOR ALL USING (auth.role() = 'service_role');
```

### Table: `analytics_events`

```sql
-- Migration 009: Analytics Events
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL,
    event_category TEXT NOT NULL,
    asset_type TEXT,
    event_count INTEGER DEFAULT 1,
    unique_sessions INTEGER DEFAULT 1,
    unique_users INTEGER DEFAULT 0,
    hour_bucket TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_hour_bucket 
ON analytics_events(hour_bucket);

CREATE INDEX IF NOT EXISTS idx_analytics_events_category 
ON analytics_events(event_category);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name 
ON analytics_events(event_name);

CREATE INDEX IF NOT EXISTS idx_analytics_events_asset_type 
ON analytics_events(asset_type) WHERE asset_type IS NOT NULL;
```

### Table: `analytics_asset_popularity`

```sql
-- Migration 009: Asset Popularity
CREATE TABLE IF NOT EXISTS analytics_asset_popularity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_type TEXT NOT NULL,
    generation_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    date_bucket DATE NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (asset_type, date_bucket)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_asset_popularity_date 
ON analytics_asset_popularity(date_bucket);

CREATE INDEX IF NOT EXISTS idx_analytics_asset_popularity_type 
ON analytics_asset_popularity(asset_type);

-- Function: Get popular asset types
CREATE OR REPLACE FUNCTION get_popular_asset_types(
    p_days INTEGER DEFAULT 30,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    asset_type TEXT,
    total_generations BIGINT,
    total_views BIGINT,
    total_shares BIGINT,
    popularity_score BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aap.asset_type,
        SUM(aap.generation_count)::BIGINT as total_generations,
        SUM(aap.view_count)::BIGINT as total_views,
        SUM(aap.share_count)::BIGINT as total_shares,
        (SUM(aap.generation_count) * 3 + SUM(aap.view_count) + SUM(aap.share_count) * 2)::BIGINT as popularity_score
    FROM analytics_asset_popularity aap
    WHERE aap.date_bucket >= CURRENT_DATE - p_days
    GROUP BY aap.asset_type
    ORDER BY popularity_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. BACKEND API REFERENCE

### Intel Endpoints

#### GET `/api/v1/intel/preferences`
Get user's Creator Intel preferences.

**Response:**
```python
class UserIntelPreferences(BaseModel):
    subscribed_categories: List[CategorySubscription]
    dashboard_layout: List[PanelConfig]
    timezone: str  # Default: "America/New_York"
```

#### PUT `/api/v1/intel/preferences`
Update user's preferences (layout, timezone).

**Request:**
```python
class UpdatePreferencesRequest(BaseModel):
    dashboard_layout: Optional[List[PanelConfig]] = None
    timezone: Optional[str] = None
```

#### GET `/api/v1/intel/categories/available`
List all available categories for subscription.

**Response:**
```python
class AvailableCategory(BaseModel):
    key: str
    name: str
    twitch_id: Optional[str]
    youtube_query: Optional[str]
    platform: Literal["twitch", "youtube", "both"]
    icon: Optional[str]
    color: Optional[str]
    subscriber_count: Optional[int]
```

#### POST `/api/v1/intel/categories/subscribe`
Subscribe to a gaming category. **Tier-limited.**

**Request:**
```python
class SubscribeCategoryRequest(BaseModel):
    key: str
    name: str
    twitch_id: Optional[str]
    youtube_query: Optional[str]
    platform: Literal["twitch", "youtube", "both"] = "both"
    notifications: bool = True
```

**Response:**
```python
class SubscribeCategoryResponse(BaseModel):
    subscription: CategorySubscription
    total_subscriptions: int
```

#### DELETE `/api/v1/intel/categories/{category_key}`
Unsubscribe from a gaming category.

**Response:**
```python
class UnsubscribeCategoryResponse(BaseModel):
    remaining_subscriptions: int
```

#### POST `/api/v1/intel/activity/track`
Track user activity for personalization. **Pro+ only.**

**Request:**
```python
class TrackActivityRequest(BaseModel):
    event_type: Literal[
        "category_view",
        "panel_interaction", 
        "mission_shown",
        "mission_acted",
        "category_subscribe",
        "category_unsubscribe",
        "filter_change",
        "layout_change"
    ]
    category_key: Optional[str] = None
    panel_type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
```

#### GET `/api/v1/intel/activity/summary`
Get user's activity summary for personalization insights. **Studio only.**

**Response:**
```python
class ActivitySummaryResponse(BaseModel):
    total_activities: int
    favorite_categories: List[Dict[str, Any]]  # Top 5 by engagement
    panel_engagement: Dict[str, int]  # { "viral_clips": 45 }
    event_breakdown: Dict[str, int]  # { "category_view": 100 }
    hourly_distribution: Dict[int, int]  # { 14: 15, 15: 20 }
    mission_conversion_rate: float  # acted/shown
    most_active_hour: int
    engagement_level: Literal["low", "medium", "high"]
```

#### GET `/api/v1/intel/mission`
Get Today's Mission recommendation. **Pro+ only.**

**Response:**
```python
class TodaysMission(BaseModel):
    recommendation: str
    confidence: int  # 0-100
    category: str
    category_name: str
    suggested_title: str
    reasoning: str
    factors: MissionFactors
    expires_at: str  # ISO datetime
    
class MissionFactors(BaseModel):
    competition: Literal["low", "medium", "high"]
    competition_score: float  # 0-1 (hidden in basic response)
    viral_opportunity: bool
    viral_score: float  # 0-1 (hidden in basic response)
    timing: bool
    timing_score: float  # 0-1 (hidden in basic response)
    history_match: bool
    history_score: float  # 0-1 (hidden in basic response)
    freshness_score: float  # 0-1 (hidden in basic response)
```

#### POST `/api/v1/intel/mission/acted`
Mark that user acted on Today's Mission.

### Trends Endpoints

#### GET `/api/v1/trends/daily-brief`
Get today's compiled daily brief with AI insights. **All tiers.**

**Response:**
```python
class DailyBriefResponse(BaseModel):
    brief_date: date
    thumbnail_of_day: Optional[ThumbnailOfDay]
    youtube_highlights: List[YouTubeVideoResponse]
    twitch_highlights: List[TwitchStreamResponse]
    hot_games: List[TwitchGameResponse]
    top_clips: List[TwitchClipResponse]
    insights: List[InsightResponse]
    best_upload_times: Optional[TimingRecommendationResponse]
    best_stream_times: Optional[TimingRecommendationResponse]
    title_patterns: Optional[TitlePatterns]
    thumbnail_patterns: Optional[ThumbnailPatterns]
    trending_keywords: Optional[TrendingKeywordsResponse]
    generated_at: Optional[datetime]
```

#### GET `/api/v1/trends/youtube/trending`
Get cached YouTube trending videos. **All tiers.**

**Query Params:**
- `category`: gaming | entertainment | music | education
- `limit`: 1-50 (default: 20)

**Response:**
```python
class YouTubeTrendingResponse(BaseModel):
    videos: List[YouTubeVideoResponse]
    category: str
    region: str  # Default: "US"
    fetched_at: datetime
    total: Optional[int]
    page: int
    per_page: int
    has_more: bool
```

#### GET `/api/v1/trends/youtube/games`
YouTube gaming videos with advanced filtering. **All tiers.**

**Query Params:**
- `game`: fortnite | warzone | valorant | minecraft | etc.
- `sort_by`: views | likes | engagement | date | duration
- `sort_order`: asc | desc
- `duration_type`: short | medium | long | any
- `is_live`: boolean
- `is_short`: boolean
- `has_captions`: boolean
- `min_views`, `max_views`: integer
- `min_engagement`: float
- `language`: string
- `page`, `per_page`: pagination

**Response:**
```python
class YouTubeGameTrendingResponse(BaseModel):
    videos: List[YouTubeVideoResponse]
    game: Optional[str]
    game_display_name: Optional[str]
    sort_by: str
    sort_order: str
    filters_applied: dict
    total: int
    page: int
    per_page: int
    total_pages: int
    has_more: bool
    fetched_at: datetime
```

#### POST `/api/v1/trends/youtube/search`
Search YouTube videos. **Pro+ only, rate-limited.**

**Request:**
```python
class YouTubeSearchRequest(BaseModel):
    query: str  # 1-200 chars
    category: Optional[TrendCategory]
    max_results: int = 20  # 1-50
```

**Response:**
```python
class YouTubeSearchResponse(BaseModel):
    videos: List[YouTubeVideoResponse]
    query: str
    result_count: int
    rate_limit_remaining: Optional[int]
```

#### GET `/api/v1/trends/twitch/live`
Get current top Twitch streams. **All tiers.**

**Query Params:**
- `limit`: 1-100 (default: 20)
- `game_id`: optional filter

**Response:**
```python
class TwitchLiveResponse(BaseModel):
    streams: List[TwitchStreamResponse]
    total_viewers: int
    fetched_at: datetime
```

#### GET `/api/v1/trends/twitch/games`
Get top games on Twitch with aggregated stats. **All tiers.**

**Response:**
```python
class TwitchGamesResponse(BaseModel):
    games: List[TwitchGameResponse]
    fetched_at: datetime

class TwitchGameResponse(BaseModel):
    game_id: str
    name: str
    twitch_viewers: int
    twitch_streams: int
    youtube_videos: Optional[int]
    youtube_total_views: Optional[int]
    trend: Optional[TrendVelocity]
    box_art_url: Optional[str]
    top_tags: List[str]
    avg_viewers_per_stream: Optional[int]
    top_languages: List[str]
```

#### GET `/api/v1/trends/twitch/clips`
Get top Twitch clips. **All tiers.**

**Query Params:**
- `game_id`: optional filter
- `period`: day | week | month | all
- `limit`: 1-100

**Response:**
```python
class TwitchClipsResponse(BaseModel):
    clips: List[TwitchClipResponse]
    game_id: Optional[str]
    period: str
    fetched_at: datetime
```

#### GET `/api/v1/trends/keywords/{category}`
Get trending keywords for content creation. **Pro+ only.**

**Response:**
```python
class TrendingKeywordsResponse(BaseModel):
    title_keywords: List[TrendingKeyword]
    tag_keywords: List[TrendingKeyword]
    topic_keywords: List[TrendingKeyword]
    caption_keywords: List[TrendingKeyword]
    hashtags: List[str]
    category: str
    generated_at: datetime

class TrendingKeyword(BaseModel):
    keyword: str
    count: int
    avg_views: Optional[int]
    avg_engagement: Optional[float]
    source: Literal["title", "tag", "topic", "description"]
```

#### GET `/api/v1/trends/velocity/alerts`
Get real-time velocity alerts (>50% spike in 1 hour). **Studio only.**

**Response:**
```python
class VelocityAlertsResponse(BaseModel):
    alerts: List[VelocityAlertResponse]
    total_active: int

class VelocityAlertResponse(BaseModel):
    id: str
    alert_type: Literal["game_spike", "video_viral", "streamer_rising"]
    platform: Literal["youtube", "twitch"]
    subject_id: str
    subject_name: str
    subject_thumbnail: Optional[str]
    current_value: int
    previous_value: int
    change_percent: float
    velocity_score: float
    severity: Literal["low", "medium", "high", "critical"]
    insight: Optional[str]  # AI explanation
    is_active: bool
    detected_at: datetime
```

#### GET `/api/v1/trends/timing/{category}`
Get optimal posting/streaming times. **Pro+ only.**

**Response:**
```python
class TimingRecommendationResponse(BaseModel):
    best_day: str
    best_hour: int  # 0-23
    best_hour_local: str  # Formatted time
    timezone: str
    confidence: float  # 0-1
    data_points: int
```

#### GET `/api/v1/trends/history`
Get historical trend data. **Pro+ only, tier-limited days.**

**Query Params:**
- `days`: 1-30 (limited by tier)

**Response:**
```python
class TrendHistoryResponse(BaseModel):
    days: int
    youtube_snapshots: List[dict]
    twitch_hourly: List[dict]
    velocity_alerts: List[VelocityAlertResponse]
```

#### GET `/api/v1/trends/cross-platform`
Get cross-platform correlation data. **Studio only.**

**Response:**
```python
class CrossPlatformResponse(BaseModel):
    hot_games: List[TwitchGameResponse]  # Trending on both platforms
    rising_creators: List[RisingCreator]
    message: Optional[str]

class RisingCreator(BaseModel):
    creator_id: str
    name: str
    platform: Literal["youtube", "twitch", "both"]
    youtube_channel_id: Optional[str]
    twitch_user_id: Optional[str]
    growth_rate: float
    total_followers: int
    avatar_url: Optional[str]
```

#### GET `/api/v1/trends/thumbnail/{video_id}/analysis`
Get AI thumbnail analysis. **Rate-limited by tier.**

**Response:**
```python
class ThumbnailAnalysisResponse(BaseModel):
    source_type: str
    source_id: str
    thumbnail_url: str
    has_face: bool
    face_count: int
    face_emotions: List[FaceEmotion]
    has_text: bool
    detected_text: List[str]
    dominant_colors: List[DominantColor]
    color_mood: Optional[ColorMood]
    composition: Optional[Composition]
    complexity_score: Optional[int]  # 1-10
    thumbnail_score: Optional[int]  # 0-100 predicted CTR
    analyzed_at: Optional[datetime]
```

### Thumbnail Intel Endpoints

#### GET `/api/v1/thumbnail-intel/categories`
List all available gaming categories for thumbnail analysis.

**Response:**
```python
class CategoryListItem(BaseModel):
    category_key: str
    category_name: str
    color_theme: str
    thumbnail_count: int
    latest_analysis: Optional[str]
```

#### GET `/api/v1/thumbnail-intel/overview`
Get overview of all category insights.

**Response:**
```python
class ThumbnailIntelOverviewResponse(BaseModel):
    analysis_date: str
    categories: List[CategoryInsightResponse]
    total_thumbnails_analyzed: int
```

#### GET `/api/v1/thumbnail-intel/category/{category_key}`
Get specific category insight with full thumbnail analysis.

**Response:**
```python
class CategoryInsightResponse(BaseModel):
    category_key: str
    category_name: str
    analysis_date: str
    thumbnails: List[ThumbnailAnalysisResponse]
    common_layout: str
    common_colors: List[str]
    common_elements: List[str]
    ideal_layout: str
    ideal_color_palette: List[str]
    must_have_elements: List[str]
    avoid_elements: List[str]
    category_style_summary: str
    pro_tips: List[str]

class ThumbnailAnalysisResponse(BaseModel):
    video_id: str
    title: str
    thumbnail_url: str
    view_count: int
    layout_type: str
    text_placement: str
    focal_point: str
    dominant_colors: List[str]
    color_mood: str
    background_style: str
    has_face: bool
    has_text: bool
    text_content: Optional[str]
    has_border: bool
    has_glow_effects: bool
    has_arrows_circles: bool
    layout_recipe: str  # Pro+ only
    color_recipe: str   # Pro+ only
    why_it_works: str   # Pro+ only
    difficulty: str     # Pro+ only
```

#### POST `/api/v1/thumbnail-intel/analyze`
Manually trigger thumbnail analysis. **Admin only.**

**Query Params:**
- `category_key`: optional, analyze specific category

---

## 5. FRONTEND TYPE DEFINITIONS

### Complete Intel Types

```typescript
// tsx/packages/api-client/src/types/intel.ts

// ============================================================================
// Category Types
// ============================================================================

export interface CategorySubscription {
  key: string;
  name: string;
  twitchId?: string;
  youtubeQuery?: string;
  platform: 'twitch' | 'youtube' | 'both';
  notifications: boolean;
  addedAt: string;
}

export interface AvailableCategory {
  key: string;
  name: string;
  twitchId?: string;
  youtubeQuery?: string;
  platform: 'twitch' | 'youtube' | 'both';
  icon?: string;
  color?: string;
  subscriberCount?: number;
}

// ============================================================================
// Panel Types
// ============================================================================

export type PanelSize = 'tiny' | 'small' | 'medium' | 'wide' | 'tall' | 'large' | 'hero';

export type PanelType = 
  | 'todays_mission'
  | 'viral_clips'
  | 'live_pulse'
  | 'youtube_trending'
  | 'golden_hours'
  | 'niche_opportunities'
  | 'viral_hooks'
  | 'title_formulas'
  | 'thumbnail_patterns'
  | 'competition_meter'
  | 'weekly_heatmap'
  | 'trending_hashtags'
  | 'velocity_alerts'
  | 'timing_recommendations'
  | 'cross_platform'
  | 'activity_insights';

export interface PanelPosition {
  x: number;
  y: number;
}

export interface PanelConfig {
  panelType: PanelType;
  position: PanelPosition;
  size: PanelSize;
}

export interface PanelMetadata {
  type: PanelType;
  title: string;
  description: string;
  defaultSize: PanelSize;
  minTier: 'free' | 'pro' | 'studio';
  refreshInterval?: number; // ms
  icon: string;
}

// ============================================================================
// Preferences Types
// ============================================================================

export interface UserIntelPreferences {
  subscribedCategories: CategorySubscription[];
  dashboardLayout: PanelConfig[];
  timezone: string;
}

export interface UpdatePreferencesRequest {
  dashboardLayout?: PanelConfig[];
  timezone?: string;
}

// ============================================================================
// Activity Types (Full)
// ============================================================================

export interface UserIntelActivity {
  categoryEngagement: Record<string, number>;
  activeHours: Record<string, number>;
  contentPreferences: Record<string, number>;
  avgViewsByCategory: Record<string, number>;
  bestPerformingTimes: {
    bestDay?: string;
    bestHour?: number;
  };
  panelEngagement: Record<string, number>;
  eventBreakdown: Record<string, number>;
  lastMissionShownAt?: string;
  lastMissionActedOn: boolean;
  missionsShownCount: number;
  missionsActedCount: number;
  mostActiveHour?: number;
  engagementLevel: 'low' | 'medium' | 'high';
}

export interface ActivitySummary {
  totalActivities: number;
  favoriteCategories: Array<{ key: string; name: string; count: number }>;
  panelEngagement: Record<string, number>;
  eventBreakdown: Record<string, number>;
  hourlyDistribution: Record<number, number>;
  missionConversionRate: number;
  mostActiveHour: number;
  engagementLevel: 'low' | 'medium' | 'high';
}

export type ActivityEventType = 
  | 'category_view'
  | 'panel_interaction'
  | 'mission_shown'
  | 'mission_acted'
  | 'category_subscribe'
  | 'category_unsubscribe'
  | 'filter_change'
  | 'layout_change';

export interface TrackActivityRequest {
  eventType: ActivityEventType;
  categoryKey?: string;
  panelType?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Mission Types (Full)
// ============================================================================

export interface MissionFactors {
  competition: 'low' | 'medium' | 'high';
  competitionScore?: number; // 0-1, Studio only
  viralOpportunity: boolean;
  viralScore?: number; // 0-1, Studio only
  timing: boolean;
  timingScore?: number; // 0-1, Studio only
  historyMatch: boolean;
  historyScore?: number; // 0-1, Studio only
  freshnessScore?: number; // 0-1, Studio only
}

export interface TodaysMission {
  recommendation: string;
  confidence: number; // 0-100
  category: string;
  categoryName: string;
  suggestedTitle: string;
  reasoning: string;
  factors: MissionFactors;
  expiresAt: string;
}

// ============================================================================
// Trends Types
// ============================================================================

export type TrendCategory = 'gaming' | 'entertainment' | 'music' | 'education';
export type TrendVelocity = 'rising' | 'stable' | 'falling';
export type AlertType = 'game_spike' | 'video_viral' | 'streamer_rising';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  channelId?: string;
  channelTitle: string;
  category?: string;
  publishedAt?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  engagementRate?: number;
  viralScore?: number;
  velocity?: TrendVelocity;
  insight?: string;
  durationSeconds?: number;
  isLive: boolean;
  isShort: boolean;
  tags: string[];
  description?: string;
  defaultAudioLanguage?: string;
  hasCaptions: boolean;
  topicCategories: string[];
  isLicensed: boolean;
  isMadeForKids: boolean;
  subscriberCount?: number;
}

export interface TwitchStream {
  userId: string;
  userName: string;
  gameId: string;
  gameName: string;
  viewerCount: number;
  peakViewers?: number;
  thumbnail: string;
  title: string;
  startedAt?: string;
  durationMinutes?: number;
  language?: string;
  tags: string[];
  isMature: boolean;
  velocity?: TrendVelocity;
  insight?: string;
  followerCount?: number;
  broadcasterType?: string;
  profileImageUrl?: string;
}

export interface TwitchGame {
  gameId: string;
  name: string;
  twitchViewers: number;
  twitchStreams: number;
  youtubeVideos?: number;
  youtubeTotalViews?: number;
  trend?: TrendVelocity;
  boxArtUrl?: string;
  topTags: string[];
  avgViewersPerStream?: number;
  topLanguages: string[];
}

export interface TwitchClip {
  id: string;
  url: string;
  embedUrl: string;
  broadcasterId: string;
  broadcasterName: string;
  creatorId: string;
  creatorName: string;
  videoId?: string;
  gameId: string;
  language: string;
  title: string;
  viewCount: number;
  createdAt: string;
  thumbnailUrl: string;
  duration: number;
}

export interface VelocityAlert {
  id: string;
  alertType: AlertType;
  platform: 'youtube' | 'twitch';
  subjectId: string;
  subjectName: string;
  subjectThumbnail?: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  velocityScore: number;
  severity: AlertSeverity;
  insight?: string;
  isActive: boolean;
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

export interface TrendingKeyword {
  keyword: string;
  count: number;
  avgViews?: number;
  avgEngagement?: number;
  source: 'title' | 'tag' | 'topic' | 'description';
}

export interface TrendingKeywords {
  titleKeywords: TrendingKeyword[];
  tagKeywords: TrendingKeyword[];
  topicKeywords: TrendingKeyword[];
  captionKeywords: TrendingKeyword[];
  hashtags: string[];
  category: string;
  generatedAt: string;
}

export interface RisingCreator {
  creatorId: string;
  name: string;
  platform: 'youtube' | 'twitch' | 'both';
  youtubeChannelId?: string;
  twitchUserId?: string;
  growthRate: number;
  totalFollowers: number;
  avatarUrl?: string;
}

export interface CrossPlatformData {
  hotGames: TwitchGame[];
  risingCreators: RisingCreator[];
  message?: string;
}

export interface TrendHistory {
  days: number;
  youtubeSnapshots: unknown[];
  twitchHourly: unknown[];
  velocityAlerts: VelocityAlert[];
}

// ============================================================================
// Thumbnail Intel Types
// ============================================================================

export interface ThumbnailAnalysis {
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

export interface CategoryInsight {
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

export interface ThumbnailIntelOverview {
  analysisDate: string;
  categories: CategoryInsight[];
  totalThumbnailsAnalyzed: number;
}

// ============================================================================
// Daily Brief Types
// ============================================================================

export interface ThumbnailOfDay {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  views: number;
  viralScore: number;
  whyItWorks: string;
}

export interface TitlePatterns {
  topWords: Array<{ word: string; count: number; avgViews: number }>;
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

export interface DailyBrief {
  briefDate: string;
  thumbnailOfDay?: ThumbnailOfDay;
  youtubeHighlights: YouTubeVideo[];
  twitchHighlights: TwitchStream[];
  hotGames: TwitchGame[];
  topClips: TwitchClip[];
  insights: Array<{
    category: string;
    insight: string;
    confidence: number;
    dataPoints: number;
  }>;
  bestUploadTimes?: TimingRecommendation;
  bestStreamTimes?: TimingRecommendation;
  titlePatterns?: TitlePatterns;
  thumbnailPatterns?: ThumbnailPatterns;
  trendingKeywords?: TrendingKeywords;
  generatedAt?: string;
}

// ============================================================================
// Dashboard Data Types
// ============================================================================

export interface IntelDashboardData {
  mission?: TodaysMission;
  viralClips?: TwitchClip[];
  livePulse?: {
    streams: TwitchStream[];
    totalViewers: number;
  };
  youtubeTrending?: YouTubeVideo[];
  goldenHours?: TimingRecommendation;
  nicheOpportunities?: TwitchGame[];
  viralHooks?: TrendingKeyword[];
  titleFormulas?: TitlePatterns;
  thumbnailPatterns?: CategoryInsight;
  competitionMeter?: {
    category: string;
    level: 'low' | 'medium' | 'high';
    streamCount: number;
    avgViewers: number;
  };
  weeklyHeatmap?: Record<string, Record<number, number>>;
  trendingHashtags?: string[];
  velocityAlerts?: VelocityAlert[];
  timingRecommendations?: TimingRecommendation;
  crossPlatform?: CrossPlatformData;
  activityInsights?: ActivitySummary;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface SubscribeCategoryRequest {
  key: string;
  name: string;
  twitchId?: string;
  youtubeQuery?: string;
  platform: 'twitch' | 'youtube' | 'both';
  notifications?: boolean;
}

export interface SubscribeCategoryResponse {
  success: boolean;
  subscription: CategorySubscription;
  totalSubscriptions: number;
}

export interface UnsubscribeCategoryResponse {
  success: boolean;
  remainingSubscriptions: number;
}
```

---

## 6. PANEL SYSTEM

### Panel Registry

```typescript
// tsx/apps/web/src/components/intel/panelRegistry.ts

import type { PanelType, PanelMetadata, PanelSize } from '@aurastream/api-client/src/types/intel';

export const PANEL_REGISTRY: Record<PanelType, PanelMetadata> = {
  todays_mission: {
    type: 'todays_mission',
    title: "Today's Mission",
    description: 'AI-powered content recommendation based on trends and your history',
    defaultSize: 'hero',
    minTier: 'pro',
    refreshInterval: 300000, // 5 minutes
    icon: '🎯',
  },
  viral_clips: {
    type: 'viral_clips',
    title: 'Viral Clips',
    description: 'Top trending Twitch clips in your categories',
    defaultSize: 'large',
    minTier: 'free',
    refreshInterval: 60000, // 1 minute
    icon: '🔥',
  },
  live_pulse: {
    type: 'live_pulse',
    title: 'Live Pulse',
    description: 'Real-time top streams in your categories',
    defaultSize: 'medium',
    minTier: 'free',
    refreshInterval: 30000, // 30 seconds
    icon: '📡',
  },
  youtube_trending: {
    type: 'youtube_trending',
    title: 'YouTube Trending',
    description: 'Top trending YouTube videos in gaming',
    defaultSize: 'large',
    minTier: 'free',
    refreshInterval: 300000, // 5 minutes
    icon: '📺',
  },
  golden_hours: {
    type: 'golden_hours',
    title: 'Golden Hours',
    description: 'Optimal streaming/posting times for your categories',
    defaultSize: 'small',
    minTier: 'pro',
    refreshInterval: 3600000, // 1 hour
    icon: '⏰',
  },
  niche_opportunities: {
    type: 'niche_opportunities',
    title: 'Niche Opportunities',
    description: 'Low competition games with growing audiences',
    defaultSize: 'medium',
    minTier: 'pro',
    refreshInterval: 300000, // 5 minutes
    icon: '💎',
  },
  viral_hooks: {
    type: 'viral_hooks',
    title: 'Viral Hooks',
    description: 'Trending keywords and phrases for titles',
    defaultSize: 'small',
    minTier: 'pro',
    refreshInterval: 3600000, // 1 hour
    icon: '🪝',
  },
  title_formulas: {
    type: 'title_formulas',
    title: 'Title Formulas',
    description: 'Patterns from top-performing video titles',
    defaultSize: 'medium',
    minTier: 'pro',
    refreshInterval: 3600000, // 1 hour
    icon: '✍️',
  },
  thumbnail_patterns: {
    type: 'thumbnail_patterns',
    title: 'Thumbnail Patterns',
    description: 'AI analysis of winning thumbnail designs',
    defaultSize: 'large',
    minTier: 'free',
    refreshInterval: 86400000, // 24 hours
    icon: '🖼️',
  },
  competition_meter: {
    type: 'competition_meter',
    title: 'Competition Meter',
    description: 'Real-time competition levels in your categories',
    defaultSize: 'small',
    minTier: 'pro',
    refreshInterval: 60000, // 1 minute
    icon: '📊',
  },
  weekly_heatmap: {
    type: 'weekly_heatmap',
    title: 'Weekly Heatmap',
    description: 'Your activity patterns and best performing times',
    defaultSize: 'wide',
    minTier: 'studio',
    refreshInterval: 3600000, // 1 hour
    icon: '🗓️',
  },
  trending_hashtags: {
    type: 'trending_hashtags',
    title: 'Trending Hashtags',
    description: 'Popular hashtags for your content categories',
    defaultSize: 'small',
    minTier: 'free',
    refreshInterval: 3600000, // 1 hour
    icon: '#️⃣',
  },
  velocity_alerts: {
    type: 'velocity_alerts',
    title: 'Velocity Alerts',
    description: 'Real-time notifications of viral spikes',
    defaultSize: 'medium',
    minTier: 'studio',
    refreshInterval: 30000, // 30 seconds
    icon: '🚨',
  },
  timing_recommendations: {
    type: 'timing_recommendations',
    title: 'Best Times',
    description: 'AI-optimized posting and streaming times',
    defaultSize: 'small',
    minTier: 'pro',
    refreshInterval: 3600000, // 1 hour
    icon: '📅',
  },
  cross_platform: {
    type: 'cross_platform',
    title: 'Cross-Platform',
    description: 'Unified YouTube + Twitch trend analysis',
    defaultSize: 'large',
    minTier: 'studio',
    refreshInterval: 300000, // 5 minutes
    icon: '🔗',
  },
  activity_insights: {
    type: 'activity_insights',
    title: 'Your Insights',
    description: 'Personalized analytics from your activity',
    defaultSize: 'medium',
    minTier: 'studio',
    refreshInterval: 3600000, // 1 hour
    icon: '📈',
  },
};

export const DEFAULT_LAYOUTS: Record<'free' | 'pro' | 'studio', PanelConfig[]> = {
  free: [
    { panelType: 'todays_mission', position: { x: 0, y: 0 }, size: 'hero' },
    { panelType: 'viral_clips', position: { x: 0, y: 2 }, size: 'large' },
    { panelType: 'live_pulse', position: { x: 2, y: 2 }, size: 'medium' },
    { panelType: 'youtube_trending', position: { x: 0, y: 5 }, size: 'large' },
    { panelType: 'thumbnail_patterns', position: { x: 2, y: 5 }, size: 'medium' },
    { panelType: 'trending_hashtags', position: { x: 3, y: 5 }, size: 'small' },
  ],
  pro: [
    { panelType: 'todays_mission', position: { x: 0, y: 0 }, size: 'hero' },
    { panelType: 'viral_clips', position: { x: 0, y: 2 }, size: 'large' },
    { panelType: 'live_pulse', position: { x: 2, y: 2 }, size: 'medium' },
    { panelType: 'golden_hours', position: { x: 3, y: 2 }, size: 'small' },
    { panelType: 'youtube_trending', position: { x: 0, y: 5 }, size: 'large' },
    { panelType: 'niche_opportunities', position: { x: 2, y: 5 }, size: 'medium' },
    { panelType: 'viral_hooks', position: { x: 0, y: 8 }, size: 'small' },
    { panelType: 'title_formulas', position: { x: 1, y: 8 }, size: 'medium' },
    { panelType: 'thumbnail_patterns', position: { x: 0, y: 11 }, size: 'large' },
    { panelType: 'competition_meter', position: { x: 2, y: 11 }, size: 'small' },
    { panelType: 'trending_hashtags', position: { x: 3, y: 11 }, size: 'small' },
    { panelType: 'timing_recommendations', position: { x: 3, y: 8 }, size: 'small' },
  ],
  studio: [
    { panelType: 'todays_mission', position: { x: 0, y: 0 }, size: 'hero' },
    { panelType: 'velocity_alerts', position: { x: 0, y: 2 }, size: 'medium' },
    { panelType: 'viral_clips', position: { x: 2, y: 2 }, size: 'large' },
    { panelType: 'live_pulse', position: { x: 0, y: 5 }, size: 'medium' },
    { panelType: 'golden_hours', position: { x: 2, y: 5 }, size: 'small' },
    { panelType: 'competition_meter', position: { x: 3, y: 5 }, size: 'small' },
    { panelType: 'youtube_trending', position: { x: 0, y: 8 }, size: 'large' },
    { panelType: 'niche_opportunities', position: { x: 2, y: 8 }, size: 'medium' },
    { panelType: 'cross_platform', position: { x: 0, y: 11 }, size: 'large' },
    { panelType: 'activity_insights', position: { x: 2, y: 11 }, size: 'medium' },
    { panelType: 'viral_hooks', position: { x: 0, y: 14 }, size: 'small' },
    { panelType: 'title_formulas', position: { x: 1, y: 14 }, size: 'medium' },
    { panelType: 'thumbnail_patterns', position: { x: 0, y: 17 }, size: 'large' },
    { panelType: 'weekly_heatmap', position: { x: 2, y: 17 }, size: 'wide' },
    { panelType: 'trending_hashtags', position: { x: 0, y: 20 }, size: 'small' },
    { panelType: 'timing_recommendations', position: { x: 1, y: 20 }, size: 'small' },
  ],
};

export function getDefaultLayout(tier: 'free' | 'pro' | 'studio'): PanelConfig[] {
  return DEFAULT_LAYOUTS[tier] || DEFAULT_LAYOUTS.free;
}

export function filterPanelsByTier(
  panels: PanelConfig[],
  tier: 'free' | 'pro' | 'studio'
): PanelConfig[] {
  const tierOrder = { free: 0, pro: 1, studio: 2 };
  const userTierLevel = tierOrder[tier];
  
  return panels.filter(panel => {
    const panelMeta = PANEL_REGISTRY[panel.panelType];
    if (!panelMeta) return false;
    const panelTierLevel = tierOrder[panelMeta.minTier];
    return panelTierLevel <= userTierLevel;
  });
}
```

### Panel Size Configuration

```typescript
// tsx/apps/web/src/components/intel/panelSizes.ts

export const SIZE_TO_GRID: Record<PanelSize, { w: number; h: number }> = {
  tiny: { w: 1, h: 1 },
  small: { w: 1, h: 2 },
  medium: { w: 1, h: 3 },
  wide: { w: 2, h: 2 },
  tall: { w: 1, h: 4 },
  large: { w: 2, h: 3 },
  hero: { w: 4, h: 2 },
};

export const GRID_CONFIG = {
  cols: { lg: 4, md: 2, sm: 1, xs: 1 },
  breakpoints: { lg: 1200, md: 900, sm: 600, xs: 0 },
  rowHeight: 100,
  margin: [16, 16] as [number, number],
};
```

---

## 7. ACTIVITY TRACKING SYSTEM

### Activity Tracker Service (Backend)

```python
# backend/services/intel/activity_tracker.py

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from uuid import uuid4

from backend.database.supabase_client import get_supabase_client
from backend.services.intel.tier_limits import get_tier_limits, check_feature_access


# Activity event types
ACTIVITY_TYPES = {
    "category_view": "User viewed a category panel",
    "panel_interaction": "User interacted with a panel",
    "mission_shown": "Mission was displayed to user",
    "mission_acted": "User clicked 'Start Planning' on mission",
    "category_subscribe": "User subscribed to a category",
    "category_unsubscribe": "User unsubscribed from a category",
    "filter_change": "User changed category filter",
    "layout_change": "User modified dashboard layout",
}


class ActivityTracker:
    """Tracks user activity for personalization."""
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    async def track_activity(
        self,
        user_id: str,
        user_tier: str,
        event_type: str,
        category_key: Optional[str] = None,
        panel_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Track a user activity event.
        
        Only tracks if user's tier allows activity tracking.
        """
        # Check tier access
        if not check_feature_access(user_tier, "activity_tracking"):
            return False
        
        try:
            # Get or create activity record
            activity = await self._get_or_create_activity(user_id)
            
            updates = {"updated_at": datetime.utcnow().isoformat()}
            
            # Update category engagement
            if event_type == "category_view" and category_key:
                engagement = activity.get("category_engagement", {})
                engagement[category_key] = engagement.get(category_key, 0) + 1
                updates["category_engagement"] = engagement
            
            # Update panel engagement
            if event_type == "panel_interaction" and panel_type:
                panel_eng = activity.get("panel_engagement", {})
                panel_eng[panel_type] = panel_eng.get(panel_type, 0) + 1
                updates["panel_engagement"] = panel_eng
            
            # Update event breakdown
            event_breakdown = activity.get("event_breakdown", {})
            event_breakdown[event_type] = event_breakdown.get(event_type, 0) + 1
            updates["event_breakdown"] = event_breakdown
            
            # Update active hours
            current_hour = datetime.utcnow().hour
            active_hours = activity.get("active_hours", {})
            active_hours[str(current_hour)] = active_hours.get(str(current_hour), 0) + 1
            updates["active_hours"] = active_hours
            
            # Update most active hour
            if active_hours:
                most_active = max(active_hours.items(), key=lambda x: x[1])
                updates["most_active_hour"] = int(most_active[0])
            
            # Update engagement level
            total_events = sum(event_breakdown.values())
            if total_events > 100:
                updates["engagement_level"] = "high"
            elif total_events > 30:
                updates["engagement_level"] = "medium"
            else:
                updates["engagement_level"] = "low"
            
            # Mission tracking
            if event_type == "mission_shown":
                updates["last_mission_shown_at"] = datetime.utcnow().isoformat()
                updates["missions_shown_count"] = activity.get("missions_shown_count", 0) + 1
            
            if event_type == "mission_acted":
                updates["last_mission_acted_on"] = True
                updates["missions_acted_count"] = activity.get("missions_acted_count", 0) + 1
            
            # Save updates
            self.supabase.table("user_intel_activity").update(updates).eq("user_id", user_id).execute()
            return True
            
        except Exception as e:
            print(f"Failed to track activity: {e}")
            return False
    
    async def track_mission_shown(self, user_id: str, category_key: str) -> None:
        """Track that a mission was shown to the user."""
        await self.track_activity(
            user_id=user_id,
            user_tier="pro",  # Missions require Pro+
            event_type="mission_shown",
            category_key=category_key,
        )
    
    async def get_activity_summary(
        self,
        user_id: str,
        user_tier: str,
        days: int = 30,
    ) -> Dict[str, Any]:
        """
        Get aggregated activity summary for a user.
        
        Only available for Studio tier.
        """
        if not check_feature_access(user_tier, "activity_insights"):
            return {"error": "Activity insights require Studio tier"}
        
        try:
            result = self.supabase.table("user_intel_activity").select("*").eq("user_id", user_id).single().execute()
            
            if not result.data:
                return self._empty_summary()
            
            activity = result.data
            
            # Calculate mission conversion rate
            missions_shown = activity.get("missions_shown_count", 0)
            missions_acted = activity.get("missions_acted_count", 0)
            conversion_rate = (missions_acted / missions_shown) if missions_shown > 0 else 0
            
            # Get favorite categories (top 5)
            category_engagement = activity.get("category_engagement", {})
            sorted_categories = sorted(
                category_engagement.items(),
                key=lambda x: x[1],
                reverse=True
            )[:5]
            
            favorite_categories = [
                {"key": k, "count": v}
                for k, v in sorted_categories
            ]
            
            return {
                "total_activities": sum(activity.get("event_breakdown", {}).values()),
                "favorite_categories": favorite_categories,
                "panel_engagement": activity.get("panel_engagement", {}),
                "event_breakdown": activity.get("event_breakdown", {}),
                "hourly_distribution": activity.get("active_hours", {}),
                "mission_conversion_rate": round(conversion_rate, 2),
                "most_active_hour": activity.get("most_active_hour"),
                "engagement_level": activity.get("engagement_level", "low"),
            }
            
        except Exception as e:
            print(f"Failed to get activity summary: {e}")
            return self._empty_summary()
    
    async def _get_or_create_activity(self, user_id: str) -> Dict[str, Any]:
        """Get or create activity record for user."""
        try:
            result = self.supabase.table("user_intel_activity").select("*").eq("user_id", user_id).single().execute()
            return result.data
        except:
            # Create new record
            new_activity = {
                "user_id": user_id,
                "category_engagement": {},
                "active_hours": {},
                "content_preferences": {},
                "panel_engagement": {},
                "event_breakdown": {},
                "missions_shown_count": 0,
                "missions_acted_count": 0,
                "engagement_level": "low",
            }
            self.supabase.table("user_intel_activity").insert(new_activity).execute()
            return new_activity
    
    def _empty_summary(self) -> Dict[str, Any]:
        """Return empty summary structure."""
        return {
            "total_activities": 0,
            "favorite_categories": [],
            "panel_engagement": {},
            "event_breakdown": {},
            "hourly_distribution": {},
            "mission_conversion_rate": 0,
            "most_active_hour": None,
            "engagement_level": "low",
        }


# Singleton
_tracker: Optional[ActivityTracker] = None

def get_activity_tracker() -> ActivityTracker:
    global _tracker
    if _tracker is None:
        _tracker = ActivityTracker()
    return _tracker
```

### Activity Tracking Hook (Frontend)

```typescript
// tsx/packages/api-client/src/hooks/useActivityTracking.ts

import { useMutation } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { apiClient } from '../client';
import type { TrackActivityRequest, ActivityEventType } from '../types/intel';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface UseActivityTrackingOptions {
  enabled?: boolean;
  debounceMs?: number;
}

export function useActivityTracking(options: UseActivityTrackingOptions = {}) {
  const { enabled = true, debounceMs = 1000 } = options;
  const lastTracked = useRef<Record<string, number>>({});
  
  const mutation = useMutation({
    mutationFn: async (data: TrackActivityRequest): Promise<void> => {
      if (!enabled) return;
      
      const token = apiClient.getAccessToken();
      if (!token) return;
      
      await fetch(`${API_BASE}/api/v1/intel/activity/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event_type: data.eventType,
          category_key: data.categoryKey,
          panel_type: data.panelType,
          metadata: data.metadata,
        }),
      });
    },
  });
  
  const track = useCallback((
    eventType: ActivityEventType,
    options?: {
      categoryKey?: string;
      panelType?: string;
      metadata?: Record<string, unknown>;
    }
  ) => {
    if (!enabled) return;
    
    // Debounce same events
    const key = `${eventType}-${options?.categoryKey || ''}-${options?.panelType || ''}`;
    const now = Date.now();
    if (lastTracked.current[key] && now - lastTracked.current[key] < debounceMs) {
      return;
    }
    lastTracked.current[key] = now;
    
    mutation.mutate({
      eventType,
      categoryKey: options?.categoryKey,
      panelType: options?.panelType,
      metadata: options?.metadata,
    });
  }, [enabled, debounceMs, mutation]);
  
  return {
    track,
    trackCategoryView: (categoryKey: string) => track('category_view', { categoryKey }),
    trackPanelInteraction: (panelType: string) => track('panel_interaction', { panelType }),
    trackMissionShown: () => track('mission_shown'),
    trackMissionActed: () => track('mission_acted'),
    trackFilterChange: (metadata?: Record<string, unknown>) => track('filter_change', { metadata }),
    trackLayoutChange: () => track('layout_change'),
  };
}
```

---

## 8. MISSION GENERATION SYSTEM

### Mission Generator Service (Backend)

```python
# backend/services/intel/mission_generator.py

import asyncio
import hashlib
import json
import random
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

from backend.database.supabase_client import get_supabase_client
from backend.services.intel.tier_limits import check_feature_access


# Cache TTL
MISSION_CACHE_TTL = 300  # 5 minutes

# Scoring weights
WEIGHTS = {
    "competition": 0.25,
    "viral_opportunity": 0.20,
    "timing": 0.20,
    "history_match": 0.15,
    "freshness": 0.20,
}

# Golden hours (UTC)
GOLDEN_HOURS = {
    "weekday": [14, 15, 16, 19, 20, 21],  # 2-4 PM, 7-9 PM
    "weekend": [12, 13, 14, 15, 16, 17, 18, 19, 20, 21],  # 12-9 PM
}

# Title templates
TITLE_TEMPLATES = {
    "low_competition": [
        "🔥 {game} is WIDE OPEN right now - {angle}",
        "Why {game} is YOUR moment today",
        "{game} Stream - Low Competition, High Opportunity",
        "The {game} opportunity nobody is talking about",
    ],
    "viral_trend": [
        "🚀 {trend} is BLOWING UP - Here's my take",
        "Reacting to {trend} - This is INSANE",
        "{game}: {trend} explained",
        "Why everyone is talking about {trend}",
    ],
    "golden_hour": [
        "LIVE: {game} at the PERFECT time",
        "{game} Stream - Catching the wave",
        "Prime time {game} - Let's GO",
    ],
    "niche_opportunity": [
        "Trying {niche} for the first time",
        "{niche} deep dive - Underrated content",
        "Why {niche} is the next big thing",
    ],
}


class MissionGenerator:
    """Generates personalized mission recommendations."""
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self._cache: Dict[str, Dict[str, Any]] = {}
    
    async def generate_mission(
        self,
        user_id: str,
        user_tier: str,
        subscribed_categories: List[Dict[str, Any]],
        timezone: str = "America/New_York",
        activity_data: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Generate a personalized mission for the user."""
        
        # Check tier access
        if not check_feature_access(user_tier, "mission_enabled"):
            return None
        
        if not subscribed_categories:
            return None
        
        # Check cache
        cache_key = self._get_cache_key(user_id, subscribed_categories)
        cached = self._get_cached_mission(cache_key)
        if cached:
            return cached
        
        # Score each category
        category_scores = []
        for category in subscribed_categories:
            score_data = await self._score_category(
                category=category,
                user_tier=user_tier,
                activity_data=activity_data,
            )
            category_scores.append({
                "category": category,
                "scores": score_data,
                "total": self._calculate_total_score(score_data),
            })
        
        # Select best category
        best = max(category_scores, key=lambda x: x["total"])
        
        # Generate mission
        mission = self._build_mission(
            category=best["category"],
            scores=best["scores"],
            total_score=best["total"],
            user_tier=user_tier,
        )
        
        # Cache mission
        self._cache_mission(cache_key, mission)
        
        return mission
    
    async def _score_category(
        self,
        category: Dict[str, Any],
        user_tier: str,
        activity_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, float]:
        """Score a category across all factors."""
        
        scores = {}
        
        # Competition score (lower = better)
        competition = await self._get_competition_level(category)
        scores["competition"] = 1.0 - (competition / 100)  # Invert
        scores["competition_level"] = (
            "low" if competition < 30 else
            "medium" if competition < 70 else
            "high"
        )
        
        # Viral opportunity score
        viral = await self._check_viral_opportunity(category)
        scores["viral_opportunity"] = viral["score"]
        scores["viral_trend"] = viral.get("trend")
        
        # Timing score
        timing = self._calculate_timing_score()
        scores["timing"] = timing["score"]
        scores["is_golden_hour"] = timing["is_golden"]
        
        # History match score (Studio only)
        if check_feature_access(user_tier, "mission_personalization") and activity_data:
            history = self._calculate_history_score(category, activity_data)
            scores["history_match"] = history
        else:
            scores["history_match"] = 0.5  # Neutral
        
        # Freshness score
        freshness = await self._calculate_freshness_score(category)
        scores["freshness"] = freshness
        
        return scores
    
    async def _get_competition_level(self, category: Dict[str, Any]) -> float:
        """Get competition level for a category (0-100)."""
        # In production, fetch from Twitch API
        # For now, return mock data
        return random.uniform(20, 80)
    
    async def _check_viral_opportunity(self, category: Dict[str, Any]) -> Dict[str, Any]:
        """Check for viral opportunities in category."""
        # In production, check trending clips/videos
        has_viral = random.random() > 0.7
        return {
            "score": 0.8 if has_viral else 0.3,
            "trend": "New update dropped!" if has_viral else None,
        }
    
    def _calculate_timing_score(self) -> Dict[str, Any]:
        """Calculate timing score based on current time."""
        now = datetime.utcnow()
        hour = now.hour
        is_weekend = now.weekday() >= 5
        
        golden = GOLDEN_HOURS["weekend"] if is_weekend else GOLDEN_HOURS["weekday"]
        is_golden = hour in golden
        
        return {
            "score": 0.9 if is_golden else 0.4,
            "is_golden": is_golden,
        }
    
    def _calculate_history_score(
        self,
        category: Dict[str, Any],
        activity_data: Dict[str, Any],
    ) -> float:
        """Calculate history match score based on user activity."""
        engagement = activity_data.get("category_engagement", {})
        category_key = category.get("key", "")
        
        if not engagement:
            return 0.5
        
        total = sum(engagement.values())
        if total == 0:
            return 0.5
        
        category_count = engagement.get(category_key, 0)
        return min(category_count / total * 2, 1.0)  # Cap at 1.0
    
    async def _calculate_freshness_score(self, category: Dict[str, Any]) -> float:
        """Calculate freshness score based on trending content."""
        # In production, check for new content/updates
        return random.uniform(0.4, 0.9)
    
    def _calculate_total_score(self, scores: Dict[str, float]) -> float:
        """Calculate weighted total score."""
        total = 0
        for factor, weight in WEIGHTS.items():
            total += scores.get(factor, 0.5) * weight
        return total
    
    def _build_mission(
        self,
        category: Dict[str, Any],
        scores: Dict[str, float],
        total_score: float,
        user_tier: str,
    ) -> Dict[str, Any]:
        """Build the mission response."""
        
        # Determine mission type
        if scores.get("competition", 0) > 0.7:
            mission_type = "low_competition"
        elif scores.get("viral_opportunity", 0) > 0.6:
            mission_type = "viral_trend"
        elif scores.get("timing", 0) > 0.7:
            mission_type = "golden_hour"
        else:
            mission_type = "niche_opportunity"
        
        # Generate title
        templates = TITLE_TEMPLATES[mission_type]
        template = random.choice(templates)
        suggested_title = template.format(
            game=category.get("name", ""),
            trend=scores.get("viral_trend", "trending topic"),
            angle="perfect timing",
            niche=category.get("name", ""),
        )
        
        # Build reasoning
        reasoning_parts = []
        if scores.get("competition_level") == "low":
            reasoning_parts.append("Competition is low right now")
        if scores.get("viral_trend"):
            reasoning_parts.append(f"'{scores['viral_trend']}' is trending")
        if scores.get("is_golden_hour"):
            reasoning_parts.append("It's prime streaming time")
        
        reasoning = ". ".join(reasoning_parts) if reasoning_parts else "Good opportunity based on current trends"
        
        # Build factors
        factors = {
            "competition": scores.get("competition_level", "medium"),
            "viral_opportunity": scores.get("viral_opportunity", 0) > 0.5,
            "timing": scores.get("is_golden_hour", False),
            "history_match": scores.get("history_match", 0) > 0.5,
        }
        
        # Add detailed scores for Studio tier
        if check_feature_access(user_tier, "mission_personalization"):
            factors["competition_score"] = round(scores.get("competition", 0), 2)
            factors["viral_score"] = round(scores.get("viral_opportunity", 0), 2)
            factors["timing_score"] = round(scores.get("timing", 0), 2)
            factors["history_score"] = round(scores.get("history_match", 0), 2)
            factors["freshness_score"] = round(scores.get("freshness", 0), 2)
        
        return {
            "recommendation": f"Stream {category.get('name', '')} today",
            "confidence": int(total_score * 100),
            "category": category.get("key", ""),
            "category_name": category.get("name", ""),
            "suggested_title": suggested_title,
            "reasoning": reasoning,
            "factors": factors,
            "expires_at": (datetime.utcnow() + timedelta(hours=4)).isoformat() + "Z",
        }
    
    def _get_cache_key(self, user_id: str, categories: List[Dict]) -> str:
        """Generate cache key for mission."""
        cat_keys = sorted([c.get("key", "") for c in categories])
        data = f"{user_id}:{','.join(cat_keys)}"
        return hashlib.md5(data.encode()).hexdigest()
    
    def _get_cached_mission(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached mission if valid."""
        cached = self._cache.get(cache_key)
        if not cached:
            return None
        
        if datetime.utcnow().timestamp() - cached["timestamp"] > MISSION_CACHE_TTL:
            del self._cache[cache_key]
            return None
        
        return cached["mission"]
    
    def _cache_mission(self, cache_key: str, mission: Dict[str, Any]) -> None:
        """Cache a mission."""
        self._cache[cache_key] = {
            "mission": mission,
            "timestamp": datetime.utcnow().timestamp(),
        }


# Singleton
_generator: Optional[MissionGenerator] = None

def get_mission_generator() -> MissionGenerator:
    global _generator
    if _generator is None:
        _generator = MissionGenerator()
    return _generator
```

---

## 9. TRENDS INTELLIGENCE SYSTEM

### YouTube Video Response (Full Schema)

```python
# backend/api/schemas/trends.py - YouTubeVideoResponse

class YouTubeVideoResponse(BaseModel):
    """Complete YouTube video data."""
    video_id: str
    title: str
    thumbnail: str
    channel_id: Optional[str] = None
    channel_title: str
    category: Optional[str] = None
    published_at: Optional[datetime] = None
    
    # Engagement metrics
    view_count: int = 0
    like_count: int = 0
    comment_count: int = 0
    engagement_rate: Optional[float] = None  # (likes + comments) / views * 100
    
    # Trend indicators
    viral_score: Optional[int] = None  # 0-100
    velocity: Optional[Literal["rising", "stable", "falling"]] = None
    insight: Optional[str] = None  # AI-generated insight
    
    # Video metadata
    duration_seconds: Optional[int] = None
    is_live: bool = False
    is_short: bool = False
    tags: List[str] = []
    
    # Extended metadata (often not displayed)
    description: Optional[str] = None  # Truncated to 500 chars
    default_audio_language: Optional[str] = None
    has_captions: bool = False
    topic_categories: List[str] = []  # YouTube auto-topics
    is_licensed: bool = False  # Creative Commons
    is_made_for_kids: bool = False
    subscriber_count: Optional[int] = None  # Channel subscribers
```

### Twitch Stream Response (Full Schema)

```python
# backend/api/schemas/trends.py - TwitchStreamResponse

class TwitchStreamResponse(BaseModel):
    """Complete Twitch stream data."""
    user_id: str
    user_name: str
    game_id: str
    game_name: str
    
    # Viewer metrics
    viewer_count: int
    peak_viewers: Optional[int] = None
    
    # Stream metadata
    thumbnail: str
    title: str
    started_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    language: Optional[str] = None
    tags: List[str] = []
    is_mature: bool = False
    
    # Trend indicators
    velocity: Optional[Literal["rising", "stable", "falling"]] = None
    insight: Optional[str] = None
    
    # Extended metadata (often not displayed)
    follower_count: Optional[int] = None
    broadcaster_type: Optional[str] = None  # partner, affiliate, ""
    profile_image_url: Optional[str] = None
```

### Twitch Game Response (Full Schema)

```python
# backend/api/schemas/trends.py - TwitchGameResponse

class TwitchGameResponse(BaseModel):
    """Complete Twitch game data with aggregated stats."""
    game_id: str
    name: str
    
    # Twitch metrics
    twitch_viewers: int = 0
    twitch_streams: int = 0
    
    # Cross-platform metrics
    youtube_videos: Optional[int] = None
    youtube_total_views: Optional[int] = None
    
    # Trend indicators
    trend: Optional[Literal["rising", "stable", "falling"]] = None
    
    # Visual
    box_art_url: Optional[str] = None
    
    # Aggregated from streams (often not displayed)
    top_tags: List[str] = []  # Most common tags
    avg_viewers_per_stream: Optional[int] = None
    top_languages: List[str] = []  # Top 3 languages
```

### Velocity Alert System

```python
# backend/services/trends/velocity_detector.py

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from backend.database.supabase_client import get_supabase_client


@dataclass
class VelocityAlert:
    """Represents a velocity spike alert."""
    id: str
    alert_type: str  # game_spike, video_viral, streamer_rising
    platform: str  # youtube, twitch
    subject_id: str
    subject_name: str
    subject_thumbnail: Optional[str]
    current_value: int
    previous_value: int
    change_percent: float
    velocity_score: float
    severity: str  # low, medium, high, critical
    insight: Optional[str]
    is_active: bool
    detected_at: datetime


class VelocityDetector:
    """Detects velocity spikes in real-time."""
    
    # Thresholds for alert severity
    THRESHOLDS = {
        "low": 50,      # 50% increase
        "medium": 100,  # 100% increase
        "high": 200,    # 200% increase
        "critical": 500,  # 500% increase
    }
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self._previous_values: Dict[str, int] = {}
    
    async def check_for_spikes(
        self,
        current_data: List[Dict[str, Any]],
        data_type: str,  # "game", "stream", "video"
    ) -> List[VelocityAlert]:
        """Check current data for velocity spikes."""
        alerts = []
        
        for item in current_data:
            item_id = item.get("id") or item.get("game_id") or item.get("video_id")
            current_value = item.get("viewer_count") or item.get("view_count", 0)
            
            cache_key = f"{data_type}:{item_id}"
            previous_value = self._previous_values.get(cache_key, current_value)
            
            if previous_value > 0:
                change_percent = ((current_value - previous_value) / previous_value) * 100
                
                if change_percent >= self.THRESHOLDS["low"]:
                    severity = self._get_severity(change_percent)
                    
                    alert = VelocityAlert(
                        id=f"alert_{item_id}_{datetime.utcnow().timestamp()}",
                        alert_type=self._get_alert_type(data_type),
                        platform="twitch" if data_type in ["game", "stream"] else "youtube",
                        subject_id=item_id,
                        subject_name=item.get("name") or item.get("title", "Unknown"),
                        subject_thumbnail=item.get("thumbnail") or item.get("box_art_url"),
                        current_value=current_value,
                        previous_value=previous_value,
                        change_percent=round(change_percent, 1),
                        velocity_score=change_percent / 100,
                        severity=severity,
                        insight=self._generate_insight(item, change_percent, data_type),
                        is_active=True,
                        detected_at=datetime.utcnow(),
                    )
                    alerts.append(alert)
            
            # Update cache
            self._previous_values[cache_key] = current_value
        
        return alerts
    
    def _get_severity(self, change_percent: float) -> str:
        """Determine alert severity based on change percentage."""
        if change_percent >= self.THRESHOLDS["critical"]:
            return "critical"
        elif change_percent >= self.THRESHOLDS["high"]:
            return "high"
        elif change_percent >= self.THRESHOLDS["medium"]:
            return "medium"
        return "low"
    
    def _get_alert_type(self, data_type: str) -> str:
        """Map data type to alert type."""
        return {
            "game": "game_spike",
            "stream": "streamer_rising",
            "video": "video_viral",
        }.get(data_type, "game_spike")
    
    def _generate_insight(
        self,
        item: Dict[str, Any],
        change_percent: float,
        data_type: str,
    ) -> str:
        """Generate AI insight for the spike."""
        name = item.get("name") or item.get("title", "This content")
        
        if change_percent >= 500:
            return f"🚨 {name} is going VIRAL! Massive spike detected."
        elif change_percent >= 200:
            return f"🔥 {name} is exploding right now. Consider creating content."
        elif change_percent >= 100:
            return f"📈 {name} is gaining momentum. Good opportunity."
        else:
            return f"👀 {name} is trending upward. Worth watching."


# Singleton
_detector: Optional[VelocityDetector] = None

def get_velocity_detector() -> VelocityDetector:
    global _detector
    if _detector is None:
        _detector = VelocityDetector()
    return _detector
```

### Trending Keywords Extractor

```python
# backend/services/trends/keyword_extractor.py

import re
from collections import Counter
from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class TrendingKeyword:
    """A trending keyword with stats."""
    keyword: str
    count: int
    avg_views: Optional[int]
    avg_engagement: Optional[float]
    source: str  # title, tag, topic, description


class KeywordExtractor:
    """Extracts trending keywords from content."""
    
    # Common stop words to filter out
    STOP_WORDS = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
        "being", "have", "has", "had", "do", "does", "did", "will", "would",
        "could", "should", "may", "might", "must", "shall", "can", "this",
        "that", "these", "those", "i", "you", "he", "she", "it", "we", "they",
        "my", "your", "his", "her", "its", "our", "their", "what", "which",
        "who", "whom", "when", "where", "why", "how", "all", "each", "every",
        "both", "few", "more", "most", "other", "some", "such", "no", "not",
        "only", "same", "so", "than", "too", "very", "just", "also", "now",
    }
    
    def extract_keywords(
        self,
        videos: List[Dict[str, Any]],
        category: str,
    ) -> Dict[str, Any]:
        """Extract trending keywords from video data."""
        
        title_keywords = self._extract_from_titles(videos)
        tag_keywords = self._extract_from_tags(videos)
        topic_keywords = self._extract_from_topics(videos)
        
        # Generate hashtags
        hashtags = self._generate_hashtags(
            title_keywords[:5] + tag_keywords[:5],
            category,
        )
        
        return {
            "title_keywords": title_keywords[:20],
            "tag_keywords": tag_keywords[:20],
            "topic_keywords": topic_keywords[:10],
            "caption_keywords": title_keywords[:10],  # Reuse title keywords
            "hashtags": hashtags,
            "category": category,
            "generated_at": datetime.utcnow().isoformat() + "Z",
        }
    
    def _extract_from_titles(self, videos: List[Dict]) -> List[TrendingKeyword]:
        """Extract keywords from video titles."""
        word_stats: Dict[str, Dict] = {}
        
        for video in videos:
            title = video.get("title", "")
            words = self._tokenize(title)
            views = video.get("view_count", 0)
            engagement = video.get("engagement_rate", 0)
            
            for word in words:
                if word not in word_stats:
                    word_stats[word] = {"count": 0, "total_views": 0, "total_engagement": 0}
                word_stats[word]["count"] += 1
                word_stats[word]["total_views"] += views
                word_stats[word]["total_engagement"] += engagement
        
        keywords = []
        for word, stats in word_stats.items():
            if stats["count"] >= 2:  # Minimum occurrence
                keywords.append(TrendingKeyword(
                    keyword=word,
                    count=stats["count"],
                    avg_views=stats["total_views"] // stats["count"] if stats["count"] > 0 else 0,
                    avg_engagement=round(stats["total_engagement"] / stats["count"], 2) if stats["count"] > 0 else 0,
                    source="title",
                ))
        
        return sorted(keywords, key=lambda x: x.count, reverse=True)
    
    def _extract_from_tags(self, videos: List[Dict]) -> List[TrendingKeyword]:
        """Extract keywords from video tags."""
        tag_counter = Counter()
        tag_views: Dict[str, int] = {}
        
        for video in videos:
            tags = video.get("tags", [])
            views = video.get("view_count", 0)
            
            for tag in tags:
                tag_lower = tag.lower()
                tag_counter[tag_lower] += 1
                tag_views[tag_lower] = tag_views.get(tag_lower, 0) + views
        
        keywords = []
        for tag, count in tag_counter.most_common(30):
            if count >= 2:
                keywords.append(TrendingKeyword(
                    keyword=tag,
                    count=count,
                    avg_views=tag_views[tag] // count if count > 0 else 0,
                    avg_engagement=None,
                    source="tag",
                ))
        
        return keywords
    
    def _extract_from_topics(self, videos: List[Dict]) -> List[TrendingKeyword]:
        """Extract keywords from topic categories."""
        topic_counter = Counter()
        
        for video in videos:
            topics = video.get("topic_categories", [])
            for topic in topics:
                # Clean up YouTube topic URLs
                topic_name = topic.split("/")[-1].replace("_", " ").title()
                topic_counter[topic_name] += 1
        
        return [
            TrendingKeyword(
                keyword=topic,
                count=count,
                avg_views=None,
                avg_engagement=None,
                source="topic",
            )
            for topic, count in topic_counter.most_common(10)
        ]
    
    def _tokenize(self, text: str) -> List[str]:
        """Tokenize text into words, filtering stop words."""
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        return [w for w in words if w not in self.STOP_WORDS]
    
    def _generate_hashtags(
        self,
        keywords: List[TrendingKeyword],
        category: str,
    ) -> List[str]:
        """Generate hashtags from keywords."""
        hashtags = [f"#{category.replace(' ', '')}"]
        
        for kw in keywords[:10]:
            tag = kw.keyword.replace(" ", "").title()
            if len(tag) <= 20:
                hashtags.append(f"#{tag}")
        
        # Add common gaming hashtags
        hashtags.extend(["#Gaming", "#Streamer", "#ContentCreator"])
        
        return list(dict.fromkeys(hashtags))[:15]  # Dedupe, limit to 15
```

---

## 10. THUMBNAIL INTELLIGENCE SYSTEM

### Vision Analyzer (Full Implementation)

```python
# backend/services/thumbnail_intel/vision_analyzer.py

import logging
import base64
import json
import os
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

import google.generativeai as genai

from backend.services.thumbnail_intel.constants import GEMINI_VISION_MODEL
from backend.services.thumbnail_intel.collector import ThumbnailData


logger = logging.getLogger(__name__)


@dataclass
class ThumbnailAnalysis:
    """Complete analysis result for a single thumbnail."""
    video_id: str
    title: str
    thumbnail_url: str
    view_count: int
    
    # Layout Analysis
    layout_type: str  # face-left-text-right, centered-character, split-screen, etc.
    text_placement: str  # top-right, bottom-center, none, etc.
    focal_point: str  # character-face, action-scene, item, etc.
    
    # Color Analysis
    dominant_colors: List[str]  # Hex colors
    color_mood: str  # energetic, dark, vibrant, clean, etc.
    background_style: str  # gradient, solid, game-screenshot, custom-art
    
    # Design Elements
    has_face: bool
    has_text: bool
    text_content: Optional[str]
    has_border: bool
    has_glow_effects: bool
    has_arrows_circles: bool  # Common clickbait elements
    
    # Recommendations (Pro+ only)
    layout_recipe: str  # How to recreate this layout
    color_recipe: str  # How to recreate this color scheme
    why_it_works: str  # Why this thumbnail is effective
    difficulty: str  # easy, medium, hard


@dataclass
class CategoryThumbnailInsight:
    """Aggregated insights for a gaming category."""
    category_key: str
    category_name: str
    analysis_date: str
    
    # Individual analyses
    thumbnails: List[ThumbnailAnalysis]
    
    # Aggregated patterns
    common_layout: str
    common_colors: List[str]
    common_elements: List[str]
    
    # Category recommendations
    ideal_layout: str
    ideal_color_palette: List[str]
    must_have_elements: List[str]
    avoid_elements: List[str]
    
    # Summary
    category_style_summary: str
    pro_tips: List[str]


class ThumbnailVisionAnalyzer:
    """Analyzes thumbnails using Gemini Vision API."""
    
    ANALYSIS_PROMPT = """Analyze this YouTube gaming thumbnail and provide a detailed breakdown.

Return a JSON object with these exact fields:
{
    "layout_type": "string - describe the layout pattern (e.g., 'face-left-text-right', 'centered-character', 'split-screen', 'action-focused')",
    "text_placement": "string - where text is positioned (e.g., 'top-right', 'bottom-center', 'none')",
    "focal_point": "string - main visual focus (e.g., 'character-face', 'action-scene', 'item', 'text')",
    "dominant_colors": ["array of 3-5 hex color codes"],
    "color_mood": "string - overall mood (e.g., 'energetic', 'dark', 'vibrant', 'clean', 'mysterious')",
    "background_style": "string - background type (e.g., 'gradient', 'solid', 'game-screenshot', 'custom-art', 'blurred')",
    "has_face": boolean,
    "has_text": boolean,
    "text_content": "string or null - any text visible in thumbnail",
    "has_border": boolean,
    "has_glow_effects": boolean,
    "has_arrows_circles": boolean,
    "layout_recipe": "string - step-by-step instructions to recreate this layout",
    "color_recipe": "string - how to recreate this color scheme",
    "why_it_works": "string - explain why this thumbnail is effective for clicks",
    "difficulty": "string - 'easy', 'medium', or 'hard' to recreate"
}

Be specific and actionable in your analysis."""

    CATEGORY_SUMMARY_PROMPT = """Based on these {count} thumbnail analyses for {category}, provide aggregated insights.

Analyses:
{analyses}

Return a JSON object:
{{
    "common_layout": "string - most common layout pattern",
    "common_colors": ["array of 3-5 most used hex colors"],
    "common_elements": ["array of common design elements"],
    "ideal_layout": "string - recommended layout for this category",
    "ideal_color_palette": ["array of 5 recommended hex colors"],
    "must_have_elements": ["array of elements that top thumbnails have"],
    "avoid_elements": ["array of elements to avoid"],
    "category_style_summary": "string - 2-3 sentence summary of the category's thumbnail style",
    "pro_tips": ["array of 3-5 actionable tips for creating thumbnails in this category"]
}}"""

    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(GEMINI_VISION_MODEL)
            self.enabled = True
        else:
            logger.warning("GOOGLE_API_KEY not set - Vision analysis disabled")
            self.enabled = False
    
    async def analyze_thumbnail(
        self,
        thumbnail_data: ThumbnailData,
        image_bytes: bytes,
    ) -> Optional[ThumbnailAnalysis]:
        """Analyze a single thumbnail image."""
        if not self.enabled:
            return None
        
        try:
            # Encode image
            image_b64 = base64.b64encode(image_bytes).decode("utf-8")
            
            # Call Gemini Vision
            response = self.model.generate_content([
                self.ANALYSIS_PROMPT,
                {"mime_type": "image/jpeg", "data": image_b64},
            ])
            
            # Parse response
            result_text = response.text
            # Extract JSON from response
            json_match = result_text[result_text.find("{"):result_text.rfind("}")+1]
            analysis_data = json.loads(json_match)
            
            return ThumbnailAnalysis(
                video_id=thumbnail_data.video_id,
                title=thumbnail_data.title,
                thumbnail_url=thumbnail_data.thumbnail_url,
                view_count=thumbnail_data.view_count,
                layout_type=analysis_data.get("layout_type", "unknown"),
                text_placement=analysis_data.get("text_placement", "none"),
                focal_point=analysis_data.get("focal_point", "unknown"),
                dominant_colors=analysis_data.get("dominant_colors", []),
                color_mood=analysis_data.get("color_mood", "neutral"),
                background_style=analysis_data.get("background_style", "unknown"),
                has_face=analysis_data.get("has_face", False),
                has_text=analysis_data.get("has_text", False),
                text_content=analysis_data.get("text_content"),
                has_border=analysis_data.get("has_border", False),
                has_glow_effects=analysis_data.get("has_glow_effects", False),
                has_arrows_circles=analysis_data.get("has_arrows_circles", False),
                layout_recipe=analysis_data.get("layout_recipe", ""),
                color_recipe=analysis_data.get("color_recipe", ""),
                why_it_works=analysis_data.get("why_it_works", ""),
                difficulty=analysis_data.get("difficulty", "medium"),
            )
            
        except Exception as e:
            logger.error(f"Failed to analyze thumbnail {thumbnail_data.video_id}: {e}")
            return None
    
    async def generate_category_insight(
        self,
        category_key: str,
        category_name: str,
        analyses: List[ThumbnailAnalysis],
    ) -> Optional[CategoryThumbnailInsight]:
        """Generate aggregated insights for a category."""
        if not self.enabled or not analyses:
            return None
        
        try:
            # Prepare analyses summary
            analyses_summary = json.dumps([
                {
                    "layout_type": a.layout_type,
                    "dominant_colors": a.dominant_colors,
                    "color_mood": a.color_mood,
                    "has_face": a.has_face,
                    "has_text": a.has_text,
                    "view_count": a.view_count,
                }
                for a in analyses
            ], indent=2)
            
            prompt = self.CATEGORY_SUMMARY_PROMPT.format(
                count=len(analyses),
                category=category_name,
                analyses=analyses_summary,
            )
            
            response = self.model.generate_content(prompt)
            result_text = response.text
            json_match = result_text[result_text.find("{"):result_text.rfind("}")+1]
            summary_data = json.loads(json_match)
            
            return CategoryThumbnailInsight(
                category_key=category_key,
                category_name=category_name,
                analysis_date=datetime.utcnow().strftime("%Y-%m-%d"),
                thumbnails=analyses,
                common_layout=summary_data.get("common_layout", ""),
                common_colors=summary_data.get("common_colors", []),
                common_elements=summary_data.get("common_elements", []),
                ideal_layout=summary_data.get("ideal_layout", ""),
                ideal_color_palette=summary_data.get("ideal_color_palette", []),
                must_have_elements=summary_data.get("must_have_elements", []),
                avoid_elements=summary_data.get("avoid_elements", []),
                category_style_summary=summary_data.get("category_style_summary", ""),
                pro_tips=summary_data.get("pro_tips", []),
            )
            
        except Exception as e:
            logger.error(f"Failed to generate category insight for {category_key}: {e}")
            return None


# Singleton
_analyzer: Optional[ThumbnailVisionAnalyzer] = None

def get_vision_analyzer() -> ThumbnailVisionAnalyzer:
    global _analyzer
    if _analyzer is None:
        _analyzer = ThumbnailVisionAnalyzer()
    return _analyzer
```

### Gaming Categories Configuration

```python
# backend/services/thumbnail_intel/constants.py

GEMINI_VISION_MODEL = "gemini-2.0-flash-001"

THUMBNAILS_PER_CATEGORY = 3

GAMING_CATEGORIES = {
    "fortnite": {
        "name": "Fortnite",
        "youtube_queries": [
            "fortnite gameplay",
            "fortnite highlights",
            "fortnite tips",
        ],
        "color_theme": "#9D4DFF",
    },
    "valorant": {
        "name": "Valorant",
        "youtube_queries": [
            "valorant gameplay",
            "valorant highlights",
            "valorant tips",
        ],
        "color_theme": "#FF4655",
    },
    "minecraft": {
        "name": "Minecraft",
        "youtube_queries": [
            "minecraft gameplay",
            "minecraft build",
            "minecraft survival",
        ],
        "color_theme": "#62B47A",
    },
    "league_of_legends": {
        "name": "League of Legends",
        "youtube_queries": [
            "league of legends gameplay",
            "lol highlights",
            "league tips",
        ],
        "color_theme": "#C89B3C",
    },
    "apex_legends": {
        "name": "Apex Legends",
        "youtube_queries": [
            "apex legends gameplay",
            "apex highlights",
            "apex tips",
        ],
        "color_theme": "#DA292A",
    },
    "call_of_duty": {
        "name": "Call of Duty",
        "youtube_queries": [
            "call of duty gameplay",
            "warzone highlights",
            "cod tips",
        ],
        "color_theme": "#1E1E1E",
    },
    "gta_v": {
        "name": "GTA V",
        "youtube_queries": [
            "gta 5 gameplay",
            "gta online",
            "gta funny moments",
        ],
        "color_theme": "#5FA55A",
    },
    "overwatch_2": {
        "name": "Overwatch 2",
        "youtube_queries": [
            "overwatch 2 gameplay",
            "overwatch highlights",
            "overwatch tips",
        ],
        "color_theme": "#F99E1A",
    },
    "counter_strike": {
        "name": "Counter-Strike 2",
        "youtube_queries": [
            "cs2 gameplay",
            "counter strike highlights",
            "cs2 tips",
        ],
        "color_theme": "#DE9B35",
    },
    "rocket_league": {
        "name": "Rocket League",
        "youtube_queries": [
            "rocket league gameplay",
            "rocket league highlights",
            "rocket league tips",
        ],
        "color_theme": "#0078F2",
    },
}
```
