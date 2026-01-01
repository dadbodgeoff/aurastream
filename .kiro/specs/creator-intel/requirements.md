# 🎯 Creator Intel - Unified Intelligence Dashboard

## Overview

**Feature Name:** Creator Intel  
**Type:** New unified module replacing Clip Radar, Trends, Playbook, Thumbnail Intel  
**Priority:** P0 - Core Feature  
**Estimated Effort:** 6-7 weeks (with buffer for polish)  

## Problem Statement

Currently, AuraStream's intelligence features are fragmented across 4 separate pages:
- **Clip Radar** - Viral clip detection
- **Trends** - YouTube/Twitch trending data
- **Playbook** - AI strategy reports
- **Thumbnail Intel** - Thumbnail pattern analysis

Users must navigate between pages to piece together insights. A Fortnite streamer doesn't think "I need to check clip radar" - they think "What should I stream today?"

## Solution

A single **Creator Intel** dashboard with:
1. **Category subscriptions** - Users pick their games/niches (multi-select)
2. **Customizable panel layout** - Drag-drop panels they care about
3. **Smart filtering** - Simple global filter that applies everywhere
4. **Actionable recommendations** - "What to do" not just "what's happening"

---

## Non-Regression Requirements

### Existing Endpoints to Preserve (30 total)

All existing intelligence endpoints MUST continue to work unchanged:

**Clip Radar (9 endpoints):**
```
GET  /api/v1/clip-radar/viral
GET  /api/v1/clip-radar/fresh
GET  /api/v1/clip-radar/status
POST /api/v1/clip-radar/poll
GET  /api/v1/clip-radar/categories
GET  /api/v1/clip-radar/recaps
GET  /api/v1/clip-radar/recaps/{date}
GET  /api/v1/clip-radar/recaps/{date}/category/{gameId}
POST /api/v1/clip-radar/recaps/create
```

**Trends (13 endpoints):**
```
GET  /api/v1/trends/daily-brief
GET  /api/v1/trends/youtube/trending
GET  /api/v1/trends/youtube/games
GET  /api/v1/trends/youtube/games/available
POST /api/v1/trends/youtube/search
GET  /api/v1/trends/twitch/live
GET  /api/v1/trends/twitch/games
GET  /api/v1/trends/twitch/clips
GET  /api/v1/trends/keywords/{category}
GET  /api/v1/trends/velocity/alerts
GET  /api/v1/trends/timing/{category}
GET  /api/v1/trends/history
GET  /api/v1/trends/thumbnail/{videoId}/analysis
```

**Playbook (5 endpoints):**
```
GET  /api/v1/playbook/latest
GET  /api/v1/playbook/reports
GET  /api/v1/playbook/reports/{report_id}
POST /api/v1/playbook/generate
GET  /api/v1/playbook/unviewed-count
```

**Thumbnail Intel (3 endpoints):**
```
GET  /api/v1/thumbnail-intel/categories
GET  /api/v1/thumbnail-intel/overview
GET  /api/v1/thumbnail-intel/category/{category_key}
```

### Existing Database Tables to Preserve (14 total)

These tables MUST NOT be modified or dropped:
- `clip_radar_daily_recaps`
- `clip_radar_category_recaps`
- `trend_youtube_snapshots`
- `trend_youtube_videos`
- `trend_twitch_snapshots`
- `trend_twitch_hourly`
- `trend_thumbnail_analysis`
- `trend_daily_briefs`
- `trend_user_searches`
- `trend_velocity_alerts`
- `playbook_reports`
- `user_playbook_preferences`
- `user_playbook_views`
- `thumbnail_intel`

### Existing React Query Hooks to Preserve (31 total)

All existing hooks continue to work - new Intel hooks are ADDITIVE:
- `useClipRadar.ts` - 10 hooks
- `useTrends.ts` - 14 hooks
- `usePlaybook.ts` - 4 hooks
- `useThumbnailIntel.ts` - 3 hooks

## User Stories

### US-1: Category Subscription
> As a content creator, I want to subscribe to multiple gaming categories so that all intelligence data is filtered to games I actually care about.

**Acceptance Criteria:**
- [ ] Can add up to 3 categories (Free), 10 (Pro), unlimited (Studio)
- [ ] Categories persist across sessions
- [ ] Can remove categories with one click
- [ ] "Add Category" opens searchable category picker
- [ ] Shows category icon/color for visual identification
- [ ] Categories sync across devices (stored server-side)

### US-2: Customizable Dashboard
> As a content creator, I want to arrange my dashboard panels so that I see the most important information first.

**Acceptance Criteria:**
- [ ] Drag-drop panel reordering with smooth animations
- [ ] Panel size options (small, wide, large)
- [ ] Add/remove panels from panel library
- [ ] Layout persists across sessions (server-side)
- [ ] "Reset to default" option
- [ ] Responsive grid on mobile (stacked, no drag)
- [ ] Maximum panels: 6 (Free), 12 (Pro), unlimited (Studio)

### US-3: Global Category Filter
> As a content creator, I want to filter all panels by a single category or view combined data from all my subscribed categories.

**Acceptance Criteria:**
- [ ] Dropdown shows "All Categories" + each subscribed category
- [ ] Selecting a category filters ALL panels immediately
- [ ] Visual indicator of active filter in header
- [ ] Filter state persists in URL for sharing/bookmarking
- [ ] Filter resets to "All" on page load (fresh start)

**UX Rule - No Panel Pinning:**
We're removing panel pinning to keep the UX simple. The global filter applies to everything. If users want to see multiple categories, they select "All Categories." This is cleaner than per-panel overrides which create cognitive load.

### US-4: Today's Mission (AI Recommendation)
> As a content creator, I want a single, clear recommendation telling me what to do right now based on all available data and my history.

**Acceptance Criteria:**
- [ ] Hero panel always at top of dashboard (not movable)
- [ ] Shows: recommended action, confidence score (0-100), reasoning
- [ ] Factors in: competition, viral content, timing, user's categories, user's history
- [ ] Updates every 5 minutes (or on manual refresh)
- [ ] Includes suggested title with one-click copy
- [ ] "Start Planning" CTA links to Create Asset page with pre-filled context
- [ ] Graceful fallback when insufficient data ("Keep creating!")

### US-5: Panel Data Display
> As a content creator, I want each panel to show relevant, real-time data that helps me make decisions.

**Acceptance Criteria:**
- [ ] Each panel shows "Last updated X ago" timestamp
- [ ] Manual refresh button per panel
- [ ] Loading skeleton while data fetches
- [ ] Empty state with helpful message when no data
- [ ] Error state with retry button
- [ ] Auto-refresh intervals appropriate to data type

## Technical Requirements

### TR-1: New Database Tables (ADDITIVE - no changes to existing)

```sql
-- User intelligence preferences (NEW TABLE)
CREATE TABLE user_intel_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Category subscriptions
    subscribed_categories JSONB NOT NULL DEFAULT '[]',
    
    -- Dashboard layout
    dashboard_layout JSONB NOT NULL DEFAULT '[]',
    
    -- Settings
    timezone TEXT DEFAULT 'America/New_York',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- User activity tracking for AI recommendations (NEW TABLE)
CREATE TABLE user_intel_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- What categories they engage with most
    category_engagement JSONB DEFAULT '{}',  -- {"fortnite": 45, "valorant": 30}
    
    -- When they typically create content
    active_hours JSONB DEFAULT '{}',  -- {"monday": [14, 15, 16], "tuesday": [10, 11]}
    
    -- What content types they create
    content_preferences JSONB DEFAULT '{}',  -- {"twitch_emote": 12, "youtube_thumbnail": 8}
    
    -- Historical performance (if connected)
    avg_views_by_category JSONB DEFAULT '{}',
    best_performing_times JSONB DEFAULT '{}',
    
    -- Last mission interaction
    last_mission_shown_at TIMESTAMPTZ,
    last_mission_acted_on BOOLEAN DEFAULT FALSE,
    missions_shown_count INT DEFAULT 0,
    missions_acted_count INT DEFAULT 0,
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Category subscription structure
-- subscribed_categories: [
--   { 
--     "key": "fortnite", 
--     "name": "Fortnite", 
--     "twitch_id": "33214",
--     "platform": "both", 
--     "notifications": true, 
--     "added_at": "2025-12-30T..." 
--   }
-- ]

-- Dashboard layout structure  
-- dashboard_layout: [
--   { "panelType": "viral_clips", "position": { "x": 0, "y": 0 }, "size": "large" },
--   { "panelType": "live_pulse", "position": { "x": 2, "y": 0 }, "size": "wide" }
-- ]
-- Note: Today's Mission is ALWAYS first, not in layout array
```

### TR-2: New API Endpoints (ADDITIVE - existing endpoints unchanged)

```
# Preferences Management
GET  /api/v1/intel/preferences              # Get user preferences
PUT  /api/v1/intel/preferences              # Update preferences (layout, timezone)

# Category Subscriptions
GET  /api/v1/intel/categories/available     # All available categories with metadata
POST /api/v1/intel/categories/subscribe     # Add category subscription
DELETE /api/v1/intel/categories/{key}       # Remove category subscription

# Dashboard Data (aggregates existing endpoints)
GET  /api/v1/intel/dashboard                # Unified dashboard data
     ?filter=all|{category_key}             # Category filter
     &panels=viral_clips,live_pulse,...     # Which panels to include

# Today's Mission
GET  /api/v1/intel/mission                  # Get current recommendation
POST /api/v1/intel/mission/acted            # Track when user acts on mission

# Activity Tracking
POST /api/v1/intel/activity/track           # Track user engagement
GET  /api/v1/intel/activity/summary         # Get activity summary (for AI)
```

### TR-3: Today's Mission AI Logic

The mission generator uses a weighted scoring system across multiple factors:

```python
class MissionGenerator:
    """
    Generates personalized content recommendations based on:
    1. Real-time market conditions (competition, viewership)
    2. Viral content opportunities (clips, trending topics)
    3. Optimal timing (golden hours, user's timezone)
    4. User's historical patterns (when they create, what performs)
    5. Category preferences (engagement frequency)
    """
    
    WEIGHTS = {
        'competition_opportunity': 0.25,  # Low competition = high score
        'viral_momentum': 0.20,           # Viral clips in category = opportunity
        'timing_alignment': 0.20,         # Is now a good time?
        'user_history_match': 0.20,       # Matches user's patterns
        'content_freshness': 0.15,        # New updates, events, etc.
    }
    
    async def generate_mission(
        self, 
        user_id: str,
        subscribed_categories: List[str],
        timezone: str
    ) -> Mission:
        # 1. Gather real-time data
        competition_data = await self._get_competition_levels(subscribed_categories)
        viral_clips = await self._get_viral_clips(subscribed_categories)
        golden_hours = await self._get_golden_hours(timezone)
        
        # 2. Gather user history
        user_activity = await self._get_user_activity(user_id)
        
        # 3. Score each category
        category_scores = {}
        for category in subscribed_categories:
            score = self._calculate_category_score(
                category=category,
                competition=competition_data.get(category),
                viral_clips=viral_clips.get(category, []),
                golden_hours=golden_hours,
                user_activity=user_activity,
                current_hour=self._get_current_hour(timezone)
            )
            category_scores[category] = score
        
        # 4. Pick best category
        best_category = max(category_scores, key=category_scores.get)
        confidence = category_scores[best_category]
        
        # 5. Generate recommendation
        recommendation = self._build_recommendation(
            category=best_category,
            confidence=confidence,
            competition=competition_data[best_category],
            viral_clips=viral_clips.get(best_category, []),
            user_activity=user_activity
        )
        
        # 6. Generate suggested title
        suggested_title = await self._generate_title(
            category=best_category,
            viral_hooks=viral_clips.get(best_category, []),
            trending_keywords=await self._get_trending_keywords(best_category)
        )
        
        return Mission(
            recommendation=recommendation,
            confidence=int(confidence * 100),
            category=best_category,
            suggested_title=suggested_title,
            reasoning=self._build_reasoning(category_scores, best_category),
            factors={
                'competition': competition_data[best_category]['level'],
                'viral_opportunity': len(viral_clips.get(best_category, [])) > 0,
                'timing': self._is_golden_hour(golden_hours),
                'history_match': user_activity.get('preferred_categories', {}).get(best_category, 0) > 0
            },
            expires_at=datetime.utcnow() + timedelta(minutes=5)
        )
    
    def _calculate_category_score(self, **kwargs) -> float:
        """Returns score 0.0 - 1.0"""
        scores = {
            'competition_opportunity': self._score_competition(kwargs['competition']),
            'viral_momentum': self._score_viral(kwargs['viral_clips']),
            'timing_alignment': self._score_timing(kwargs['golden_hours'], kwargs['current_hour']),
            'user_history_match': self._score_history(kwargs['category'], kwargs['user_activity']),
            'content_freshness': self._score_freshness(kwargs['category']),
        }
        
        weighted_score = sum(
            scores[factor] * self.WEIGHTS[factor] 
            for factor in self.WEIGHTS
        )
        return weighted_score
    
    def _score_competition(self, competition: dict) -> float:
        """Low competition = high score"""
        level = competition.get('level', 'medium')
        return {'low': 1.0, 'medium': 0.5, 'high': 0.2}.get(level, 0.5)
    
    def _score_viral(self, clips: list) -> float:
        """More viral clips = higher opportunity"""
        if not clips:
            return 0.3  # Base score
        viral_count = len([c for c in clips if c.get('velocity', 0) > 10])
        return min(1.0, 0.3 + (viral_count * 0.15))
    
    def _score_timing(self, golden_hours: list, current_hour: int) -> float:
        """Is current hour in golden hours?"""
        for gh in golden_hours:
            if gh['start_hour'] <= current_hour <= gh['end_hour']:
                return gh['opportunity_score'] / 100
        return 0.3  # Not golden hour
    
    def _score_history(self, category: str, activity: dict) -> float:
        """Does this match user's patterns?"""
        engagement = activity.get('category_engagement', {})
        total = sum(engagement.values()) or 1
        category_pct = engagement.get(category, 0) / total
        return 0.3 + (category_pct * 0.7)  # 0.3 base + up to 0.7 for preference
    
    def _score_freshness(self, category: str) -> float:
        """Is there fresh content/updates?"""
        # Check for game updates, events, etc.
        # This would integrate with external game news APIs
        return 0.5  # Default middle score
```

### TR-4: Panel Types

| Panel ID | Data Source | Sizes | Auto-Refresh | Description |
|----------|-------------|-------|--------------|-------------|
| `todays_mission` | Mission API | wide (fixed) | 5 min | AI recommendation (always first) |
| `viral_clips` | Clip Radar | small, large | 30 sec | Trending clips |
| `live_pulse` | Trends/Twitch | small, wide | 2 min | Live stream stats |
| `youtube_trending` | Trends/YouTube | small, large | 15 min | YouTube videos |
| `golden_hours` | Playbook | small, wide | 1 hour | Best streaming times |
| `niche_opportunities` | Playbook | small, large | 30 min | Underserved niches |
| `viral_hooks` | Playbook | small | 30 min | Trending patterns |
| `title_formulas` | Playbook | small, large | 1 hour | Title templates |
| `thumbnail_patterns` | Thumbnail Intel | large | 1 hour | Thumbnail analysis |
| `competition_meter` | Trends | tiny | 2 min | Live competition level |
| `weekly_heatmap` | Playbook | wide | 1 hour | 7-day schedule |
| `trending_hashtags` | Playbook | small | 30 min | Copy-paste tags |

### TR-5: Tier Limits

| Feature | Free | Pro | Studio |
|---------|------|-----|--------|
| Max categories | 3 | 10 | Unlimited |
| Max panels | 6 | 12 | Unlimited |
| Today's Mission | Basic (no history) | Full | Full + Custom prompts |
| Historical data | 1 day | 7 days | 30 days |
| Notifications | ❌ | ✅ | ✅ |
| Activity tracking | ❌ | ✅ | ✅ |

## Design Requirements

### DR-1: Color Palette (from tokens)

```
Primary Teal:     #21808D (brand identity)
Interactive:      #21808D → #1B6A75 (hover) → #15545D (active)
Accent Coral:     #A84F2F (highlights, warnings)
Background:       #1F2121 (base), #262828 (surface)
Text:             #FCFCF9 (primary), #A7A9A9 (secondary)
Border:           rgba(167, 169, 169, 0.20)
Success:          #218081
Error:            #C0152F
```

### DR-2: Visual Design Principles

1. **Depth through subtle gradients** - Not flat, but not skeuomorphic
2. **Glassmorphism accents** - Frosted glass effects on key panels
3. **Micro-interactions** - Smooth 200-300ms transitions
4. **Data visualization** - Charts use brand teal with coral accents
5. **Breathing room** - Generous padding, no cramped layouts
6. **Dark theme optimized** - Light text, subtle borders, glowing accents

### DR-3: Panel Card Design

```
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  [Icon] Panel Title                    [Pin] [⚙️] [⋮]  │ │  ← Header
│ │  Showing: Fortnite                                      │ │  ← Subtitle (if pinned)
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                                                     │   │
│   │              Panel Content Area                     │   │  ← Content
│   │                                                     │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   Last updated: 2 min ago                    [Refresh ↻]    │  ← Footer
└─────────────────────────────────────────────────────────────┘

Card styling:
- Background: bg-background-surface/80 backdrop-blur-sm
- Border: border border-border-subtle hover:border-interactive-500/30
- Shadow: shadow-lg shadow-black/10
- Radius: rounded-xl (12px)
- Header border: border-b border-border-subtle
```

### DR-4: Today's Mission Hero Panel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─ Gradient overlay: from-interactive-600/20 via-transparent ────────────┐│
│  │                                                                        ││
│  │   🎯 TODAY'S MISSION                              Confidence: 87%      ││
│  │                                                                        ││
│  │   ┌────────────────────────────────────────────────────────────────┐  ││
│  │   │                                                                │  ││
│  │   │  "Stream Fortnite at 3pm EST"                                  │  ││
│  │   │                                                                │  ││
│  │   │  Competition drops 40% while viewership stays high.            │  ││
│  │   │  New update just dropped - ride the wave.                      │  ││
│  │   │                                                                │  ││
│  │   └────────────────────────────────────────────────────────────────┘  ││
│  │                                                                        ││
│  │   Suggested Title:                                                     ││
│  │   ┌────────────────────────────────────────────────────┐ [Copy 📋]    ││
│  │   │ "🔥 NEW UPDATE First Look - Fortnite Season 5"     │              ││
│  │   └────────────────────────────────────────────────────┘              ││
│  │                                                                        ││
│  │   [Start Planning →]                    Updated 2 min ago              ││
│  │                                                                        ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### DR-5: Category Pills

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Your Categories:                                                        │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  ┌─────────┐     │
│  │ 🎮 Fortnite │  │ 🎯 Valorant │  │ 💬 Just Chatting │  │ + Add   │     │
│  │         [×] │  │         [×] │  │              [×] │  │         │     │
│  └─────────────┘  └─────────────┘  └─────────────────┘  └─────────┘     │
│                                                                          │
│  Viewing: [All Categories ▼]                                             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

Category pill styling:
- Background: bg-interactive-600/20
- Border: border border-interactive-500/30
- Text: text-interactive-300
- Hover: hover:bg-interactive-600/30
- Remove button: hover:text-error-main
```

## File Structure

```
tsx/apps/web/src/
├── app/dashboard/intel/
│   ├── page.tsx                    # Main Creator Intel page
│   └── layout.tsx                  # Intel-specific layout (if needed)
│
├── components/intel/
│   ├── IntelDashboard.tsx          # Main dashboard container
│   ├── IntelHeader.tsx             # Category pills + filter dropdown
│   ├── PanelGrid.tsx               # Drag-drop grid container
│   ├── PanelCard.tsx               # Base panel wrapper component
│   ├── PanelLibrary.tsx            # "Add Panel" modal
│   ├── PanelSettings.tsx           # Panel config popover
│   │
│   ├── panels/                     # Individual panel components
│   │   ├── TodaysMissionPanel.tsx
│   │   ├── ViralClipsPanel.tsx
│   │   ├── LivePulsePanel.tsx
│   │   ├── YouTubeTrendingPanel.tsx
│   │   ├── GoldenHoursPanel.tsx
│   │   ├── NicheOpportunitiesPanel.tsx
│   │   ├── ViralHooksPanel.tsx
│   │   ├── TitleFormulasPanel.tsx
│   │   ├── ThumbnailPatternsPanel.tsx
│   │   ├── CompetitionMeterPanel.tsx
│   │   ├── WeeklyHeatmapPanel.tsx
│   │   └── TrendingHashtagsPanel.tsx
│   │
│   ├── CategoryPicker.tsx          # Category search/select modal
│   ├── CategoryPill.tsx            # Individual category tag
│   └── FilterDropdown.tsx          # Global filter selector
│
├── hooks/
│   └── useIntelPreferences.ts      # Preferences state management
│
└── stores/
    └── intelStore.ts               # Zustand store for intel state

tsx/packages/api-client/src/
├── hooks/
│   └── useIntel.ts                 # All intel-related React Query hooks
│
└── types/
    └── intel.ts                    # TypeScript types for intel module

backend/
├── api/routes/
│   └── intel.py                    # Intel API endpoints
│
├── api/schemas/
│   └── intel.py                    # Pydantic schemas
│
├── services/intel/
│   ├── __init__.py
│   ├── service.py                  # IntelService (aggregates all data)
│   ├── mission_generator.py        # Today's Mission AI logic
│   └── preferences_repository.py   # User preferences CRUD
│
└── database/migrations/
    └── 048_creator_intel.sql       # New tables
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Database migration for user_intel_preferences + user_intel_activity
- [ ] Backend API endpoints (preferences CRUD, categories)
- [ ] Frontend: Basic page structure, category subscription
- [ ] Zustand store for local state
- [ ] Integration tests for new endpoints

### Phase 2: Panel System (Week 2-3)
- [ ] PanelCard base component with header/footer
- [ ] PanelGrid with drag-drop (react-grid-layout)
- [ ] Panel Library modal
- [ ] Layout persistence (server-side)
- [ ] Responsive breakpoints

### Phase 3: Panel Components (Week 3-4)
- [ ] Migrate existing components to panel format
- [ ] TodaysMissionPanel (new)
- [ ] ViralClipsPanel (from Clip Radar)
- [ ] LivePulsePanel (from Trends)
- [ ] All other panels (9 remaining)
- [ ] Ensure all panels use existing hooks (no regression)

### Phase 4: Intelligence Layer (Week 4-5)
- [ ] Mission generator with weighted scoring
- [ ] User activity tracking
- [ ] Unified dashboard endpoint (aggregates existing)
- [ ] Category-aware filtering
- [ ] Activity tracking integration

### Phase 5: Polish & QA (Week 5-6)
- [ ] Animations and micro-interactions
- [ ] Mobile responsive layout
- [ ] Empty states and loading skeletons
- [ ] Onboarding flow for new users
- [ ] Accessibility audit
- [ ] Performance optimization

### Phase 6: Integration & Cleanup (Week 6-7)
- [ ] Update sidebar navigation
- [ ] Redirect old URLs to new page
- [ ] Keep old pages accessible via direct URL (power users)
- [ ] Full regression testing of all 30 existing endpoints
- [ ] Documentation update

## Success Metrics

- **Engagement:** Time on intel page > sum of old 4 pages
- **Retention:** Users return to intel page daily
- **Action Rate:** % of users who click "Use this title" or similar CTAs
- **Category Adoption:** Avg categories subscribed per user > 2
- **Mission Effectiveness:** % of missions acted upon > 30%

## Risk Mitigation

### Regression Prevention
1. All existing endpoints remain unchanged
2. New endpoints are purely additive
3. Existing React Query hooks continue to work
4. Old pages remain accessible (not deleted)
5. Full E2E test suite before launch

### Performance
1. Dashboard endpoint uses parallel data fetching
2. Panel data is cached with appropriate TTLs
3. Only visible panels fetch data (lazy loading)
4. Skeleton loading prevents layout shift

### UX Consistency
1. Use existing design tokens throughout
2. Follow established component patterns
3. Maintain dark theme consistency
4. Test on multiple screen sizes

---

*Spec Version: 1.1*  
*Created: December 30, 2025*  
*Updated: December 30, 2025 - Added non-regression requirements, detailed AI logic, simplified UX*
*Author: Product Engineering*
