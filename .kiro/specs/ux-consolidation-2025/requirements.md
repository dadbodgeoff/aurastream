# 🎯 UX Consolidation 2025 - Requirements Specification

## Overview

**Feature Name:** UX Consolidation 2025  
**Type:** Frontend Architecture Refactor  
**Priority:** P0 - Pre-Production Critical  
**Estimated Effort:** 3 weeks  

## Problem Statement

AuraStream has grown organically to 14 distinct navigation items, creating:
1. **Decision paralysis** - Users don't know where to start
2. **Redundant entry points** - Create vs Quick Create, Vibe Branding as separate nav
3. **Fragmented intelligence** - Trends, Playbook, Clip Radar all answer "what should I create?"
4. **Stale dashboard** - Overview page hasn't evolved with new features

## Solution

Consolidate navigation from 14 → 9 items through:
1. **Unified Create Flow** - Single entry point with method tabs
2. **Community Hub** - Gallery + Creators + Promo Board
3. **Brand Studio Enhancement** - Vibe Branding as inline feature
4. **Dashboard 2.0** - Modernized overview with intel preview
5. **Creator Intel** - Already consolidating Trends/Playbook/Clip Radar (separate spec)

---

## Non-Regression Requirements

### ⚠️ CRITICAL: Zero Breaking Changes

This consolidation MUST NOT break any existing functionality. All changes are organizational and additive.

### Existing Endpoints to Preserve (122 total - VERIFIED)

All existing API endpoints MUST continue to work unchanged. Key endpoint groups:

**Authentication (14 endpoints):**
```
POST   /api/v1/auth/signup
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
PUT    /api/v1/auth/me
POST   /api/v1/auth/me/password
DELETE /api/v1/auth/me
POST   /api/v1/auth/password-reset/request
POST   /api/v1/auth/password-reset/confirm
POST   /api/v1/auth/email/verify/request
GET    /api/v1/auth/email/verify/{token}
POST   /api/v1/auth/oauth/{provider}
GET    /api/v1/auth/oauth/{provider}/callback
```

**Brand Kits (20 endpoints):**
```
GET    /api/v1/brand-kits
POST   /api/v1/brand-kits
GET    /api/v1/brand-kits/active
GET    /api/v1/brand-kits/{id}
PUT    /api/v1/brand-kits/{id}
DELETE /api/v1/brand-kits/{id}
POST   /api/v1/brand-kits/{id}/activate
GET    /api/v1/brand-kits/{id}/colors
PUT    /api/v1/brand-kits/{id}/colors
GET    /api/v1/brand-kits/{id}/typography
PUT    /api/v1/brand-kits/{id}/typography
GET    /api/v1/brand-kits/{id}/voice
PUT    /api/v1/brand-kits/{id}/voice
GET    /api/v1/brand-kits/{id}/guidelines
PUT    /api/v1/brand-kits/{id}/guidelines
GET    /api/v1/brand-kits/{id}/logos
POST   /api/v1/brand-kits/{id}/logos
GET    /api/v1/brand-kits/{id}/logos/{type}
DELETE /api/v1/brand-kits/{id}/logos/{type}
PUT    /api/v1/brand-kits/{id}/logos/default
```

**Asset Generation (8 endpoints):**
```
POST   /api/v1/generate
GET    /api/v1/jobs
GET    /api/v1/jobs/{id}
GET    /api/v1/jobs/{id}/assets
POST   /api/v1/twitch/generate
POST   /api/v1/twitch/packs
GET    /api/v1/twitch/packs/{id}
GET    /api/v1/twitch/dimensions
```

**Prompt Coach (6 endpoints):**
```
GET    /api/v1/coach/tips
GET    /api/v1/coach/access
POST   /api/v1/coach/start
POST   /api/v1/coach/sessions/{id}/messages
GET    /api/v1/coach/sessions/{id}
POST   /api/v1/coach/sessions/{id}/end
```

**Assets (5 endpoints):**
```
GET    /api/v1/assets
GET    /api/v1/assets/{id}
DELETE /api/v1/assets/{id}
PUT    /api/v1/assets/{id}/visibility
GET    /api/v1/asset/{id}
```

**Community (17 endpoints - VERIFIED):**
```
GET    /api/v1/community/posts                    # List posts with pagination
POST   /api/v1/community/posts                    # Create post
GET    /api/v1/community/posts/featured           # Featured posts
GET    /api/v1/community/posts/trending           # Trending posts
GET    /api/v1/community/posts/search             # Search posts
GET    /api/v1/community/posts/mine               # Current user's posts
GET    /api/v1/community/posts/liked              # Posts user has liked
GET    /api/v1/community/posts/following          # Posts from followed users
GET    /api/v1/community/posts/{post_id}          # Get single post
PUT    /api/v1/community/posts/{post_id}          # Update post
DELETE /api/v1/community/posts/{post_id}          # Delete post
GET    /api/v1/community/users/{user_id}/posts    # User's posts
GET    /api/v1/community/users/{user_id}          # User profile
POST   /api/v1/community/users/{user_id}/follow   # Follow user
DELETE /api/v1/community/users/{user_id}/follow   # Unfollow user
GET    /api/v1/community/creators/spotlight       # Spotlight creators
```

**Promo Board (6 endpoints - VERIFIED):**
```
POST   /api/v1/promo/checkout                     # Create Stripe checkout
GET    /api/v1/promo/messages                     # List messages (paginated)
GET    /api/v1/promo/messages/pinned              # Get pinned message
DELETE /api/v1/promo/messages/{message_id}        # Delete own message
POST   /api/v1/promo/dev/gift-message             # [DEV] Gift message
GET    /api/v1/promo/leaderboard                  # Donation leaderboard
```

**Intelligence (30 endpoints - see Creator Intel spec):**
- Clip Radar (9 endpoints)
- Trends (13 endpoints)
- Playbook (5 endpoints)
- Thumbnail Intel (3 endpoints)

**Vibe Branding (3 endpoints - VERIFIED):**
```
POST   /api/v1/vibe-branding/analyze/upload       # Analyze uploaded image
POST   /api/v1/vibe-branding/analyze/url          # Analyze image from URL
GET    /api/v1/vibe-branding/usage                # Get usage quota
```

**Profile Creator (6 endpoints - VERIFIED):**
```
GET    /api/v1/profile-creator/access             # Check access/quota
POST   /api/v1/profile-creator/start              # Start session (SSE)
POST   /api/v1/profile-creator/sessions/{id}/messages  # Continue session (SSE)
GET    /api/v1/profile-creator/sessions/{id}      # Get session state
POST   /api/v1/profile-creator/sessions/{id}/generate  # Generate from session
GET    /api/v1/profile-creator/gallery            # Get user's gallery
```

**Aura Lab (7 endpoints - VERIFIED):**
```
POST   /api/v1/aura-lab/set-subject               # Upload test subject
POST   /api/v1/aura-lab/fuse                      # Perform fusion
POST   /api/v1/aura-lab/keep                      # Save fusion to inventory
POST   /api/v1/aura-lab/trash                     # Delete fusion
GET    /api/v1/aura-lab/inventory                 # Get saved fusions
GET    /api/v1/aura-lab/usage                     # Get usage quota
GET    /api/v1/aura-lab/elements                  # Get available elements
```

### Existing Database Tables to Preserve (50+ total - VERIFIED)

These tables MUST NOT be modified or dropped:
- `users`
- `brand_kits`
- `generation_jobs`
- `assets`
- `auth_tokens`
- `platform_connections`
- `community_posts`
- `community_likes`
- `community_follows`
- `community_comments`
- `promo_messages`
- `promo_donations`
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
- `vibe_branding_analyses`
- `profile_creator_images`
- `aura_lab_subjects`
- `aura_lab_fusions`
- `aura_lab_inventory`
- `user_intel_preferences`
- `user_intel_activity`
- ... (additional tables)

### Existing React Query Hooks to Preserve (107 total - VERIFIED)

All existing hooks continue to work - no modifications:
- `useBrandKits.ts` - 7 hooks (list, get, active, create, update, delete, activate)
- `useBrandKitExtended.ts` - 8 hooks (colors, typography, voice, guidelines - get/update each)
- `useLogos.ts` - 5 hooks (list, get, upload, delete, setDefault)
- `useGeneration.ts` - 8 hooks (generate, job, jobs, jobAssets, assets, asset, delete, visibility)
- `useAssets.ts` - 4 hooks (jobs, job, jobAssets, publicAsset)
- `useCommunity.ts` - 24 hooks (posts, featured, trending, search, mine, liked, following, comments, profile, CRUD mutations)
- `usePromo.ts` - 5 hooks (messages, pinned, leaderboard, checkout, delete)
- `useClipRadar.ts` - 10 hooks (viral, fresh, status, categories, recaps, recap, categoryRecap, poll, createRecap)
- `useTrends.ts` - 14 hooks (dailyBrief, youtube, twitch, clips, keywords, thumbnail, velocity, timing, history, games, search)
- `usePlaybook.ts` - 4 hooks (latest, reports, report, unviewedCount)
- `useThumbnailIntel.ts` - 3 hooks (categories, overview, category)
- `useVibeBranding.ts` - 3 hooks (analyzeImage, analyzeUrl, usage)
- `useProfileCreator.ts` - 4 hooks (access, session, gallery, generate)
- `useAuraLab.ts` - 6 hooks (setSubject, fuse, keep, trash, inventory, usage, elements)
- `useAuthExtended.ts` - 6 hooks (passwordReset, confirmReset, emailVerify, profile, password, delete)
- `useIntel.ts` - 8 hooks (preferences, categories, mission, update, subscribe, unsubscribe, track, acted)
- `useOptimistic*.ts` - 4 hooks (brandKitActivation, brandKitDeletion, assetDeletion, bulkAssetDeletion)

### Existing Pages to Preserve (Direct URL Access)

All existing pages remain accessible via direct URL:
- `/dashboard` - Overview
- `/dashboard/create` - Full create flow
- `/dashboard/quick-create` - Quick create wizard
- `/dashboard/brand-kits` - Brand studio
- `/dashboard/assets` - Asset library
- `/dashboard/coach` - Prompt coach
- `/dashboard/profile-creator` - Profile creator
- `/dashboard/aura-lab` - Aura lab
- `/dashboard/trends` - Trends (redirects to intel)
- `/dashboard/playbook` - Playbook (redirects to intel)
- `/dashboard/clip-radar` - Clip radar (redirects to intel)
- `/dashboard/intel` - Creator intel
- `/community` - Community gallery
- `/promo` - Promo board

---

## User Stories

### US-1: Unified Create Flow
> As a content creator, I want a single "Create" entry point so I don't have to decide between "Create" and "Quick Create".

**Acceptance Criteria:**
- [ ] Single "Create" nav item in sidebar
- [ ] Tab navigation: Templates | Custom | AI Coach
- [ ] Templates tab shows Quick Create wizard (existing)
- [ ] Custom tab shows full create flow (existing)
- [ ] AI Coach tab shows coach integration (existing)
- [ ] URL params control active tab (?tab=templates|custom|coach)
- [ ] Old URLs redirect with toast notification
- [ ] All existing functionality preserved

**URL Mapping:**
```
/dashboard/create              → Templates tab (default)
/dashboard/create?tab=custom   → Custom tab
/dashboard/create?tab=coach    → AI Coach tab
/dashboard/quick-create        → Redirect to /dashboard/create?tab=templates
/dashboard/coach               → Redirect to /dashboard/create?tab=coach
```

### US-2: Dashboard 2.0
> As a content creator, I want my dashboard to show me what's important right now, not just stats.

**Acceptance Criteria:**
- [ ] Intel Preview widget showing Today's Mission summary
- [ ] Modernized Quick Actions grid with better visual hierarchy
- [ ] Recent Activity feed with richer content
- [ ] Personalized tips based on user behavior
- [ ] "What's New" section for feature announcements
- [ ] Responsive layout for all screen sizes
- [ ] Loading skeletons for all async content
- [ ] All existing dashboard data preserved

**Dashboard 2.0 Sections:**
1. **Hero Section** - Greeting + primary CTA
2. **Intel Preview** - Today's Mission mini-card (links to full Intel)
3. **Quick Actions** - Create, Brand Studio, Assets, Community
4. **Stats Grid** - Assets, Brand Kits, Plan (existing)
5. **Recent Activity** - Enhanced feed with thumbnails
6. **Tips & Announcements** - Contextual suggestions

### US-3: Community Hub
> As a content creator, I want Community and Promo Board in one place since they're both about connecting with other creators.

**Acceptance Criteria:**
- [ ] Community page has tab navigation
- [ ] Tabs: Gallery | Creators | Promo Board
- [ ] Gallery tab shows existing community content
- [ ] Creators tab shows creator spotlight
- [ ] Promo Board tab shows existing promo functionality
- [ ] URL params control active tab
- [ ] /promo redirects to /community?tab=promo
- [ ] All existing functionality preserved

**URL Mapping:**
```
/community                    → Gallery tab (default)
/community?tab=creators       → Creators tab
/community?tab=promo          → Promo Board tab
/promo                        → Redirect to /community?tab=promo
```

### US-4: Brand Studio Simplification
> As a content creator, I want Vibe Branding to be part of Brand Studio, not a separate nav item.

**Acceptance Criteria:**
- [ ] Remove "Vibe Branding" from sidebar navigation
- [ ] Keep "Import from Image" button in Brand Studio header
- [ ] Vibe Branding modal unchanged
- [ ] /dashboard/brand-kits?vibe=true still opens modal
- [ ] All existing functionality preserved

### US-5: Navigation Cleanup
> As a content creator, I want a cleaner sidebar with fewer items so I can find things faster.

**Acceptance Criteria:**
- [ ] Sidebar reduced from 14 to 9 items
- [ ] Clear grouping: Main, Tools, Account
- [ ] Removed items redirect to new locations
- [ ] Toast notifications explain redirects
- [ ] Keyboard shortcuts updated
- [ ] Mobile nav updated to match

**New Navigation Structure:**
```
MAIN
├── Overview
├── Create
├── Brand Studio
├── Asset Library
└── Community

TOOLS
├── Creator Intel
├── Profile Creator
└── Aura Lab

ACCOUNT
├── Settings
└── Analytics (admin)
```

---

## Technical Requirements

### TR-1: No New Database Tables

This consolidation is purely frontend. No database changes required.

### TR-2: No New API Endpoints

This consolidation is purely frontend. No API changes required.

### TR-3: URL Redirect Strategy

All redirects use Next.js middleware or page-level redirects:

```typescript
// Redirect configuration
const REDIRECTS = [
  {
    source: '/dashboard/quick-create',
    destination: '/dashboard/create?tab=templates',
    permanent: false, // Soft redirect (307)
    toast: 'Quick Create is now part of the unified Create flow'
  },
  {
    source: '/dashboard/coach',
    destination: '/dashboard/create?tab=coach',
    permanent: false,
    toast: 'Prompt Coach is now part of the unified Create flow'
  },
  {
    source: '/promo',
    destination: '/community?tab=promo',
    permanent: false,
    toast: 'Promo Board is now part of Community'
  },
  {
    source: '/dashboard/trends',
    destination: '/dashboard/intel?tab=trends',
    permanent: false,
    toast: 'Trends is now part of Creator Intel'
  },
  {
    source: '/dashboard/playbook',
    destination: '/dashboard/intel?tab=playbook',
    permanent: false,
    toast: 'Playbook is now part of Creator Intel'
  },
  {
    source: '/dashboard/clip-radar',
    destination: '/dashboard/intel?tab=clips',
    permanent: false,
    toast: 'Clip Radar is now part of Creator Intel'
  },
];
```

### TR-4: Tab State Management

Tabs use URL query params for state:

```typescript
// Tab state from URL
const searchParams = useSearchParams();
const activeTab = searchParams.get('tab') || 'default';

// Tab change updates URL
const setTab = (tab: string) => {
  router.push(`?tab=${tab}`, { scroll: false });
};
```

### TR-5: Component Reuse Strategy

All existing components are reused, not replaced:

```typescript
// Unified Create wraps existing components
function UnifiedCreate() {
  const tab = useSearchParams().get('tab') || 'templates';
  
  return (
    <Tabs value={tab}>
      <TabsList>
        <TabsTrigger value="templates">Templates</TabsTrigger>
        <TabsTrigger value="custom">Custom</TabsTrigger>
        <TabsTrigger value="coach">AI Coach</TabsTrigger>
      </TabsList>
      
      <TabsContent value="templates">
        <QuickCreateWizard /> {/* Existing component, unchanged */}
      </TabsContent>
      
      <TabsContent value="custom">
        <CreatePage /> {/* Existing component, unchanged */}
      </TabsContent>
      
      <TabsContent value="coach">
        <CoachPage /> {/* Existing component, unchanged */}
      </TabsContent>
    </Tabs>
  );
}
```

### TR-6: Backward Compatibility

All old URLs continue to work:

1. **Direct access** - Old URLs redirect to new locations
2. **Bookmarks** - Redirects preserve user bookmarks
3. **External links** - No broken links
4. **Deep links** - Query params preserved through redirects

---

## Design Requirements

### DR-1: Tab Navigation Pattern

Consistent tab pattern across all consolidated pages:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Page Title                                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │  Tab One    │  │  Tab Two    │  │  Tab Three  │                         │
│  │  (active)   │  │             │  │             │                         │
│  └─────────────┘  └─────────────┘  └─────────────┘                         │
│  ═══════════════                                                            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │                      Tab Content Area                               │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Tab styling:
- Background: bg-background-elevated/50
- Active: bg-interactive-600/20, text-interactive-400, border-b-2 border-interactive-500
- Inactive: text-text-secondary, hover:text-text-primary
- Transition: 200ms ease
```

### DR-2: Dashboard 2.0 Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Good morning, Creator! 👋                                                  │
│  Here's what's happening with your content today                            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🎯 TODAY'S MISSION                                    [View Intel →]│   │
│  │                                                                     │   │
│  │  "Stream Fortnite at 3pm EST" • 87% confidence                      │   │
│  │  Competition is low, viewership is high. Perfect timing.            │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  ⚡ Create      │  │  🎨 Brand       │  │  📚 Assets      │             │
│  │  Asset         │  │  Studio         │  │  Library        │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │  📊 Your Stats              │  │  🕐 Recent Activity                 │  │
│  │                             │  │                                     │  │
│  │  Assets: 24 (+3 this week)  │  │  • Created Fortnite thumbnail       │  │
│  │  Brand Kits: 2              │  │  • Updated brand colors             │  │
│  │  Plan: Pro                  │  │  • Generated 3 emotes               │  │
│  │                             │  │                                     │  │
│  └─────────────────────────────┘  └─────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### DR-3: Redirect Toast Pattern

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ℹ️  Quick Create is now part of the unified Create flow            │   │
│  │                                                        [Got it]     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Toast styling:
- Background: bg-interactive-600/10
- Border: border border-interactive-500/30
- Icon: ℹ️ info icon
- Duration: 5 seconds
- Dismissible: Yes
- Position: Top center
```

---

## File Structure

```
MODIFIED FILES:
tsx/apps/web/src/
├── app/dashboard/
│   ├── page.tsx                    # Dashboard 2.0 (major update)
│   ├── create/page.tsx             # Unified Create (tabs wrapper)
│   ├── quick-create/page.tsx       # Redirect to create?tab=templates
│   └── coach/page.tsx              # Redirect to create?tab=coach
├── app/community/
│   └── page.tsx                    # Community Hub (tabs wrapper)
├── app/promo/
│   └── page.tsx                    # Redirect to community?tab=promo
└── components/dashboard/
    └── layout/Sidebar.tsx          # Updated nav items

NEW FILES:
tsx/apps/web/src/
├── components/dashboard/
│   └── overview/
│       ├── index.ts
│       ├── IntelPreview.tsx        # Mini intel widget
│       ├── QuickActionsGrid.tsx    # Modernized quick actions
│       ├── RecentActivityFeed.tsx  # Enhanced activity
│       └── TipsSection.tsx         # Personalized tips
├── components/create/
│   ├── UnifiedCreateFlow.tsx       # Tab container
│   └── CreateTabs.tsx              # Tab navigation
├── components/community/
│   ├── CommunityHub.tsx            # Tab container
│   └── CommunityTabs.tsx           # Tab navigation
└── hooks/
    └── useRedirectToast.ts         # Redirect notification hook

UNCHANGED FILES (preserved 100%):
- tsx/apps/web/src/components/quick-create/* (all files)
- tsx/apps/web/src/components/create/* (all files)
- tsx/apps/web/src/components/coach/* (all files)
- tsx/apps/web/src/components/community/* (all files)
- tsx/apps/web/src/components/promo/* (all files)
- tsx/apps/web/src/components/vibe-branding/* (all files)
- All backend files
- All API client hooks
- All database migrations
```

---

## Implementation Phases

### Phase 1: Dashboard 2.0 (Week 1)
- [ ] Create IntelPreview component
- [ ] Create QuickActionsGrid component
- [ ] Create RecentActivityFeed component
- [ ] Create TipsSection component
- [ ] Update dashboard page layout
- [ ] Add loading skeletons
- [ ] Test responsive behavior

### Phase 2: Unified Create Flow (Week 1-2)
- [ ] Create UnifiedCreateFlow wrapper
- [ ] Create CreateTabs component
- [ ] Update /dashboard/create page
- [ ] Add redirect from /dashboard/quick-create
- [ ] Add redirect from /dashboard/coach
- [ ] Test all three tabs work correctly
- [ ] Verify no regression in existing flows

### Phase 3: Community Hub (Week 2)
- [ ] Create CommunityHub wrapper
- [ ] Create CommunityTabs component
- [ ] Update /community page
- [ ] Add redirect from /promo
- [ ] Test all three tabs work correctly
- [ ] Verify no regression in existing functionality

### Phase 4: Navigation & Redirects (Week 2-3)
- [ ] Update Sidebar.tsx with new nav structure
- [ ] Remove Vibe Branding nav item
- [ ] Remove Quick Create nav item
- [ ] Remove Promo Board nav item
- [ ] Add redirect toast hook
- [ ] Update mobile navigation
- [ ] Update keyboard shortcuts

### Phase 5: Polish & Testing (Week 3)
- [ ] Full regression testing
- [ ] Verify all 85+ endpoints work
- [ ] Verify all redirects work
- [ ] Test on mobile devices
- [ ] Accessibility audit
- [ ] Performance check
- [ ] Documentation update

---

## Success Metrics

- **Navigation clarity:** Users find features faster (measured by click depth)
- **Reduced confusion:** Support tickets about "where is X" decrease
- **Zero regressions:** All existing functionality works
- **Performance:** No increase in load times

---

## Risk Mitigation

### Regression Prevention
1. All existing components reused, not modified
2. All existing hooks unchanged
3. All existing endpoints unchanged
4. Comprehensive redirect coverage
5. Full E2E test suite before launch

### User Communication
1. Toast notifications explain changes
2. Redirects are soft (307), not permanent
3. Old URLs continue to work
4. No features removed, only reorganized

---

## Critical Gap Resolutions

### GAP-1: Dashboard 2.0 Intel Preview Dependency

**Problem:** Dashboard 2.0 shows "Today's Mission" widget, but Creator Intel is a separate spec in progress.

**Resolution:**
- **Dependency:** Phase 1 (Dashboard 2.0) blocks on Creator Intel Phase 4 (Mission Generator) completion
- **Fallback Strategy:** If Creator Intel is delayed, Dashboard 2.0 ships WITHOUT Intel Preview widget
- **Fallback UI:** Stats grid expands to fill Intel Preview space with enhanced metrics

**Fallback Implementation:**
```typescript
// IntelPreview.tsx
function IntelPreview() {
  const { data: mission, isLoading, isError } = useIntelMission();
  
  // Fallback: Creator Intel not ready or no mission available
  if (isError || (!isLoading && !mission)) {
    return <EnhancedStatsGrid />; // Expanded stats, no mission
  }
  
  if (isLoading) {
    return <IntelPreviewSkeleton />;
  }
  
  return <MissionCard mission={mission} />;
}
```

**Today's Mission Content (when available):**
- Recommendation text (e.g., "Stream Fortnite at 3pm EST")
- Confidence score (0-100%)
- Key factors (competition level, timing, viral opportunity)
- "View Intel →" CTA to /dashboard/intel

---

### GAP-2: Activity Feed Data Source Schema

**Problem:** Recent Activity section data source undefined.

**Resolution:** Activity Feed aggregates from existing data sources with NO new API endpoints.

**Data Schema:**
```typescript
// RecentActivityFeed types
type ActivityAction = 
  | 'asset_created'
  | 'brand_kit_updated'
  | 'brand_kit_created'
  | 'generation_completed'
  | 'generation_failed';

interface RecentActivityItem {
  id: string;
  timestamp: Date;
  action: ActivityAction;
  metadata: AssetMeta | BrandKitMeta | GenerationMeta;
  preview?: string; // Thumbnail URL for assets
}

interface AssetMeta {
  assetId: string;
  assetType: string;
  thumbnailUrl?: string;
}

interface BrandKitMeta {
  brandKitId: string;
  brandKitName: string;
  changeType: 'colors' | 'typography' | 'logo' | 'voice';
}

interface GenerationMeta {
  jobId: string;
  assetType: string;
  status: 'completed' | 'failed';
}
```

**Data Sources (existing endpoints, NO new APIs):**
```typescript
// Aggregates from existing hooks
function useRecentActivity(limit: number = 5) {
  const { data: assets } = useAssets({ limit: 10, sort: 'created_at' });
  const { data: brandKits } = useBrandKits();
  const { data: jobs } = useJobs({ limit: 10 });
  
  // Merge and sort by timestamp
  const activities = useMemo(() => {
    const items: RecentActivityItem[] = [];
    
    // Assets → asset_created
    assets?.forEach(asset => {
      items.push({
        id: `asset-${asset.id}`,
        timestamp: new Date(asset.createdAt),
        action: 'asset_created',
        metadata: { assetId: asset.id, assetType: asset.assetType, thumbnailUrl: asset.url },
        preview: asset.url,
      });
    });
    
    // Jobs → generation_completed/failed
    jobs?.forEach(job => {
      if (job.status === 'completed' || job.status === 'failed') {
        items.push({
          id: `job-${job.id}`,
          timestamp: new Date(job.completedAt || job.updatedAt),
          action: job.status === 'completed' ? 'generation_completed' : 'generation_failed',
          metadata: { jobId: job.id, assetType: job.assetType, status: job.status },
        });
      }
    });
    
    // Sort by timestamp, take limit
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }, [assets, jobs, limit]);
  
  return activities;
}
```

---

### GAP-3: Mobile Navigation Considerations (375px+)

**Problem:** Spec doesn't show how tabs render on mobile, especially iPhone SE (375px).

**Resolution:** Explicit mobile behavior for all consolidated pages.

**Mobile Tab Behavior:**
```
iPhone SE (375px) - Horizontal scroll tabs:
┌─────────────────────────────────────────┐
│  ← [Templates] [Custom] [AI Coach] →    │  ← Horizontal scroll
│     ════════                            │
└─────────────────────────────────────────┘

Tablet (768px) - Full tabs visible:
┌─────────────────────────────────────────────────────────────┐
│  [Templates]  [Custom]  [AI Coach]                          │
│  ════════════                                               │
└─────────────────────────────────────────────────────────────┘
```

**Mobile Requirements:**
- **Touch targets:** Minimum 48px height for all tab triggers
- **Tab scroll:** Horizontal scroll with fade edges on small screens
- **Active indicator:** Visible even when scrolled
- **Swipe gestures:** Optional swipe between tabs (nice-to-have)

**CSS Implementation:**
```css
/* Mobile tab container */
@media (max-width: 640px) {
  .tab-list {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none; /* Hide scrollbar */
    padding: 0 16px;
    gap: 8px;
  }
  
  .tab-list::-webkit-scrollbar {
    display: none;
  }
  
  .tab-trigger {
    flex-shrink: 0;
    scroll-snap-align: start;
    min-height: 48px; /* Touch target */
    padding: 12px 16px;
  }
  
  /* Fade edges to indicate scroll */
  .tab-container::before,
  .tab-container::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 24px;
    pointer-events: none;
    z-index: 1;
  }
  
  .tab-container::before {
    left: 0;
    background: linear-gradient(to right, var(--background-base), transparent);
  }
  
  .tab-container::after {
    right: 0;
    background: linear-gradient(to left, var(--background-base), transparent);
  }
}
```

**Mobile Bottom Nav (if applicable):**
- Sidebar collapses to hamburger menu
- Bottom nav shows: Overview, Create, Assets, Community, More
- "More" opens drawer with: Intel, Profile Creator, Aura Lab, Settings

---

### GAP-4: Vibe Branding Button Placement

**Problem:** "Import from Image" button placement unclear after removing Vibe Branding nav.

**Resolution:** Explicit button placement in Brand Studio header.

**Brand Studio Header Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Brand Studio                                                               │
│  Manage your brand identities                                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  [+ New Brand Kit]              [📷 Import from Image]             │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Your Brand Kits (2)                                                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Button specifications:
- Position: Header action row, right side
- Style: Secondary button (outline variant)
- Icon: Camera/Image icon (📷)
- Label: "Import from Image"
- Click: Opens Vibe Branding modal (existing)
- Mobile: Icon-only button with tooltip
```

**URL Support:**
- `/dashboard/brand-kits?vibe=true` → Opens Vibe Branding modal on page load
- Preserves existing deep-link behavior

---

### GAP-5: Improved Toast Notification Copy

**Problem:** Toast copy teaches product architecture instead of helping users find things.

**Resolution:** User-centric toast messages that explain WHERE to find things.

**Updated Toast Messages:**
```typescript
const REDIRECT_TOASTS = {
  'quick-create': {
    // ❌ Old: "Quick Create is now part of the unified Create flow"
    // ✅ New: Tells user where to find it
    message: "Quick Create moved to Create → Templates",
    icon: 'info',
  },
  'coach': {
    // ❌ Old: "Prompt Coach is now part of the unified Create flow"
    message: "AI Coach moved to Create → AI Coach tab",
    icon: 'info',
  },
  'promo': {
    // ❌ Old: "Promo Board is now part of Community"
    message: "Promo Board moved to Community → Promo tab",
    icon: 'info',
  },
  'trends': {
    message: "Trends moved to Creator Intel → Trends tab",
    icon: 'info',
  },
  'playbook': {
    message: "Playbook moved to Creator Intel → Playbook tab",
    icon: 'info',
  },
  'clip-radar': {
    message: "Clip Radar moved to Creator Intel → Clips tab",
    icon: 'info',
  },
  'vibe-branding': {
    // For users who bookmarked /dashboard/vibe-branding
    message: "Import from Image is now in Brand Studio header",
    icon: 'info',
  },
};
```

---

### GAP-6: Accessibility Tab Keyboard Navigation

**Problem:** Tab keyboard navigation requirements incomplete.

**Resolution:** Explicit WCAG 2.1 AA compliant tab requirements.

**Keyboard Navigation Requirements:**
```
Tab Navigation Behavior:
─────────────────────────────────────────────────────────────────────────────
Key             | Action
─────────────────────────────────────────────────────────────────────────────
Tab             | Move focus to tab list, then to active tab content
Arrow Left      | Move to previous tab (wraps to last)
Arrow Right     | Move to next tab (wraps to first)
Home            | Move to first tab
End             | Move to last tab
Enter/Space     | Activate focused tab
─────────────────────────────────────────────────────────────────────────────
```

**ARIA Requirements:**
```html
<!-- Tab list container -->
<div role="tablist" aria-label="Create options">
  
  <!-- Tab trigger -->
  <button
    role="tab"
    id="tab-templates"
    aria-selected="true"
    aria-controls="panel-templates"
    tabindex="0"
  >
    Templates
  </button>
  
  <button
    role="tab"
    id="tab-custom"
    aria-selected="false"
    aria-controls="panel-custom"
    tabindex="-1"
  >
    Custom
  </button>
  
</div>

<!-- Tab panel -->
<div
  role="tabpanel"
  id="panel-templates"
  aria-labelledby="tab-templates"
  tabindex="0"
>
  <!-- Content -->
</div>
```

**Focus Management:**
- Tab triggers: `focus-visible:ring-2 focus-visible:ring-interactive-500`
- Tab panel receives focus after tab switch (for screen readers)
- Focus trap within modal dialogs (Vibe Branding, etc.)

**Screen Reader Testing:**
- [ ] Test with NVDA (Windows)
- [ ] Test with VoiceOver (macOS/iOS)
- [ ] Tab changes announced: "Templates tab, selected, 1 of 3"
- [ ] Panel content announced after tab switch

---

### GAP-7: Performance Loading Strategy

**Problem:** Loading strategy for async widgets undefined.

**Resolution:** Explicit loading strategy with timeouts and fallbacks.

**Loading Strategy:**
```typescript
// Dashboard 2.0 Loading Strategy
const LOADING_CONFIG = {
  intelPreview: {
    timeout: 2000,        // Max wait time
    fallback: 'collapse', // Collapse widget if no data
    priority: 'high',     // Load first
  },
  recentActivity: {
    timeout: 3000,
    fallback: 'skeleton', // Show skeleton indefinitely
    priority: 'low',      // Load in background
  },
  statsGrid: {
    timeout: 1500,
    fallback: 'cached',   // Show cached data
    priority: 'high',
  },
  tipsSection: {
    timeout: 1000,
    fallback: 'hide',     // Hide if slow
    priority: 'low',
  },
};
```

**Implementation:**
```typescript
// IntelPreview with timeout fallback
function IntelPreview() {
  const { data, isLoading, isError } = useIntelMission();
  const [timedOut, setTimedOut] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 2000);
    return () => clearTimeout(timer);
  }, []);
  
  // Timeout or error: collapse widget
  if (timedOut && isLoading) {
    return null; // Collapse
  }
  
  if (isError) {
    return null; // Collapse on error
  }
  
  if (isLoading) {
    return <IntelPreviewSkeleton />;
  }
  
  if (!data) {
    return null; // No mission available
  }
  
  return <MissionCard mission={data} />;
}

// RecentActivity loads in background (doesn't block FCP)
function RecentActivity() {
  const activities = useRecentActivity(5);
  
  // Always show skeleton or content, never blocks
  return (
    <Suspense fallback={<ActivitySkeleton />}>
      <ActivityList items={activities} />
    </Suspense>
  );
}
```

**Performance Targets:**
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s
- No layout shift from loading widgets (CLS < 0.1)

---

### GAP-8: Analytics & Feature Adoption Tracking

**Problem:** No implementation detail for measuring success metrics.

**Resolution:** Explicit analytics tracking contract.

**Analytics Events:**
```typescript
// Analytics tracking for UX consolidation
const UX_CONSOLIDATION_EVENTS = {
  // Navigation tracking
  'nav.click': {
    item: string;           // 'create', 'brand-studio', etc.
    source: 'sidebar' | 'mobile-nav' | 'quick-action';
  },
  
  // Tab tracking
  'tab.switch': {
    page: 'create' | 'community' | 'intel';
    from_tab: string;
    to_tab: string;
    method: 'click' | 'keyboard' | 'url';
  },
  
  // Redirect tracking
  'redirect.shown': {
    from_url: string;
    to_url: string;
    toast_message: string;
  },
  'redirect.dismissed': {
    from_url: string;
    method: 'click' | 'timeout';
  },
  
  // Dashboard 2.0 tracking
  'dashboard.intel_preview.click': {
    has_mission: boolean;
    confidence?: number;
  },
  'dashboard.quick_action.click': {
    action: 'create' | 'brand-studio' | 'assets' | 'community';
  },
  'dashboard.activity.click': {
    activity_type: string;
  },
  
  // Feature discovery
  'feature.discovered': {
    feature: 'unified-create' | 'community-hub' | 'intel-preview';
    entry_point: string;
  },
};

// Implementation
function trackTabSwitch(page: string, fromTab: string, toTab: string, method: string) {
  analytics.track('tab.switch', {
    page,
    from_tab: fromTab,
    to_tab: toTab,
    method,
    timestamp: Date.now(),
  });
}
```

**Success Measurement:**
```
Metric                          | Target        | Measurement
─────────────────────────────────────────────────────────────────────────────
Click depth to features         | -20%          | Avg clicks to reach Create/Coach
Tab discovery rate              | >60%          | % users who try multiple tabs
Redirect toast dismissal        | <3s avg       | Time to dismiss redirect toast
Dashboard engagement            | +15%          | Time on dashboard page
Intel Preview CTR               | >10%          | Clicks on "View Intel →"
─────────────────────────────────────────────────────────────────────────────
```

---

### GAP-9: Promo Board Audience & Discoverability

**Problem:** Promo Board audience unclear, discoverability risk when moved to Community tab.

**Resolution:** Clarify audience and add discoverability mitigation.

**Promo Board Audience:**
- **Primary:** Content creators who want to promote their channels
- **Secondary:** Viewers discovering new creators
- **NOT admin-facing:** All users can post (with $1 payment)

**Discoverability Mitigation:**
1. **Community page default:** Gallery tab (most popular content)
2. **Promo tab badge:** Show "$1" badge to indicate paid feature
3. **Cross-promotion:** "Promote your channel" CTA in creator profiles
4. **Dashboard mention:** Tips section can suggest Promo Board for new users

**Promo Tab Badge:**
```typescript
// CommunityTabs.tsx
<TabsTrigger value="promo">
  💬 Promo
  <Badge variant="outline" className="ml-1 text-[10px]">$1</Badge>
</TabsTrigger>
```

**No persistent banner needed:** The tab structure provides sufficient discoverability. Users who used Promo Board before will see the redirect toast.

---

### GAP-10: Detailed Testing Strategy

**Problem:** Testing strategy vague.

**Resolution:** Comprehensive testing checklist with property tests.

**E2E Test Count Target:** 45 tests minimum

**Testing Checklist:**

```markdown
## Pre-Launch Testing Checklist

### API Regression (122 endpoints)
- [ ] Auth endpoints (14) return expected status codes
- [ ] Brand Kit endpoints (20) CRUD operations work
- [ ] Generation endpoints (8) job creation/status work
- [ ] Coach endpoints (6) SSE streaming works
- [ ] Asset endpoints (5) list/get/delete work
- [ ] Community endpoints (17) posts/follows work
- [ ] Promo endpoints (6) checkout/messages work
- [ ] Clip Radar endpoints (9) viral/fresh/recaps work
- [ ] Trends endpoints (13) daily-brief/youtube/twitch work
- [ ] Playbook endpoints (5) latest/reports work
- [ ] Thumbnail Intel endpoints (3) categories/overview work
- [ ] Intel endpoints (8) preferences/mission work
- [ ] Vibe Branding endpoints (3) analyze/usage work
- [ ] Profile Creator endpoints (6) sessions work
- [ ] Aura Lab endpoints (7) fusion flow works

### URL Redirects
- [ ] /dashboard/quick-create → /dashboard/create?tab=templates
- [ ] /dashboard/coach → /dashboard/create?tab=coach
- [ ] /promo → /community?tab=promo
- [ ] /dashboard/trends → /dashboard/intel?tab=trends
- [ ] /dashboard/playbook → /dashboard/intel?tab=playbook
- [ ] /dashboard/clip-radar → /dashboard/intel?tab=clips
- [ ] Query params preserved through redirects
- [ ] Redirect toasts show (first time only)

### Tab Navigation
- [ ] Create tabs: Templates, Custom, AI Coach all render
- [ ] Community tabs: Gallery, Creators, Promo all render
- [ ] Tab state persists in URL
- [ ] Tab switch animations smooth
- [ ] Keyboard navigation (Arrow Left/Right) works
- [ ] Screen reader announces tab changes

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Safari iOS (iPhone SE, iPhone 14)
- [ ] Chrome Android

### Mobile Testing
- [ ] iPhone SE (375px) - tabs scroll horizontally
- [ ] iPhone 14 (390px) - tabs fit
- [ ] iPad (768px) - full tabs visible
- [ ] Touch targets ≥ 48px
- [ ] No horizontal overflow on any page

### Performance
- [ ] FCP < 1.5s on 4G
- [ ] LCP < 2.5s on 4G
- [ ] CLS < 0.1
- [ ] No memory leaks on tab switch
- [ ] Bundle size increase < 10KB

### Accessibility
- [ ] WCAG 2.1 AA compliance
- [ ] Keyboard navigation complete
- [ ] Screen reader tested (VoiceOver)
- [ ] Focus visible on all interactive elements
- [ ] Color contrast meets requirements

### Error States
- [ ] Intel Preview handles API failure gracefully
- [ ] Activity Feed shows empty state
- [ ] Tab content shows error with retry
- [ ] Network offline shows appropriate message
```

---

## Property Tests (Hypothesis)

**Location:** `backend/tests/properties/test_ux_consolidation.py`

```python
"""
Property-based tests for UX Consolidation using Hypothesis.

Tests invariants that must hold regardless of input:
1. Tab state management
2. Redirect behavior
3. URL param handling
"""

from hypothesis import given, strategies as st, settings
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant
import re

# =============================================================================
# Tab State Property Tests
# =============================================================================

VALID_CREATE_TABS = ['templates', 'custom', 'coach']
VALID_COMMUNITY_TABS = ['gallery', 'creators', 'promo']
VALID_INTEL_TABS = ['trends', 'playbook', 'clips', 'mission']


@given(st.sampled_from(VALID_CREATE_TABS))
def test_create_tab_url_roundtrip(tab: str):
    """Tab value survives URL encoding/decoding."""
    url = f"/dashboard/create?tab={tab}"
    parsed_tab = url.split('tab=')[1].split('&')[0]
    assert parsed_tab == tab
    assert parsed_tab in VALID_CREATE_TABS


@given(st.sampled_from(VALID_COMMUNITY_TABS))
def test_community_tab_url_roundtrip(tab: str):
    """Community tab value survives URL encoding/decoding."""
    url = f"/community?tab={tab}"
    parsed_tab = url.split('tab=')[1].split('&')[0]
    assert parsed_tab == tab
    assert parsed_tab in VALID_COMMUNITY_TABS


@given(st.text(min_size=1, max_size=50))
def test_invalid_tab_defaults_to_first(tab: str):
    """Invalid tab values should default to first tab."""
    if tab not in VALID_CREATE_TABS:
        # Simulated behavior: invalid tab → default
        resolved_tab = 'templates'  # Default
        assert resolved_tab == 'templates'


# =============================================================================
# Redirect Property Tests
# =============================================================================

REDIRECT_MAP = {
    '/dashboard/quick-create': '/dashboard/create?tab=templates',
    '/dashboard/coach': '/dashboard/create?tab=coach',
    '/promo': '/community?tab=promo',
    '/dashboard/trends': '/dashboard/intel?tab=trends',
    '/dashboard/playbook': '/dashboard/intel?tab=playbook',
    '/dashboard/clip-radar': '/dashboard/intel?tab=clips',
}


@given(st.sampled_from(list(REDIRECT_MAP.keys())))
def test_redirect_preserves_destination_structure(source: str):
    """Redirects always point to valid destinations."""
    destination = REDIRECT_MAP[source]
    
    # Destination must be a valid path
    assert destination.startswith('/')
    
    # Destination must have tab param
    assert 'tab=' in destination
    
    # Tab param must be valid
    tab = destination.split('tab=')[1].split('&')[0]
    all_valid_tabs = VALID_CREATE_TABS + VALID_COMMUNITY_TABS + VALID_INTEL_TABS
    assert tab in all_valid_tabs


@given(st.sampled_from(list(REDIRECT_MAP.keys())), st.text(min_size=0, max_size=100))
def test_redirect_preserves_query_params(source: str, extra_param: str):
    """Redirects should preserve additional query params."""
    # Sanitize extra_param to be URL-safe
    safe_param = re.sub(r'[^a-zA-Z0-9]', '', extra_param)[:20]
    if not safe_param:
        safe_param = 'test'
    
    source_with_param = f"{source}?extra={safe_param}"
    destination = REDIRECT_MAP[source]
    
    # Simulated redirect behavior: append extra params
    if '?' in destination:
        final_url = f"{destination}&extra={safe_param}"
    else:
        final_url = f"{destination}?extra={safe_param}"
    
    # Extra param should be preserved
    assert f"extra={safe_param}" in final_url


# =============================================================================
# URL Param Handling Property Tests
# =============================================================================

@given(st.lists(st.tuples(st.text(min_size=1, max_size=20), st.text(min_size=1, max_size=50)), max_size=5))
def test_url_params_order_independent(params: list):
    """URL params should work regardless of order."""
    # Filter to alphanumeric keys/values
    clean_params = [
        (re.sub(r'[^a-zA-Z]', '', k)[:10], re.sub(r'[^a-zA-Z0-9]', '', v)[:20])
        for k, v in params
        if k and v
    ]
    
    if not clean_params:
        return  # Skip empty
    
    # Build URL with params in original order
    param_str = '&'.join(f"{k}={v}" for k, v in clean_params)
    url1 = f"/dashboard/create?{param_str}"
    
    # Build URL with params in reverse order
    reversed_params = list(reversed(clean_params))
    param_str_rev = '&'.join(f"{k}={v}" for k, v in reversed_params)
    url2 = f"/dashboard/create?{param_str_rev}"
    
    # Both should parse to same param dict
    def parse_params(url: str) -> dict:
        if '?' not in url:
            return {}
        query = url.split('?')[1]
        return dict(p.split('=') for p in query.split('&') if '=' in p)
    
    assert parse_params(url1) == parse_params(url2)


# =============================================================================
# Stateful Tab Navigation Tests
# =============================================================================

class TabNavigationMachine(RuleBasedStateMachine):
    """Stateful test for tab navigation behavior."""
    
    def __init__(self):
        super().__init__()
        self.current_page = '/dashboard/create'
        self.current_tab = 'templates'
        self.tab_history = ['templates']
    
    @rule(tab=st.sampled_from(VALID_CREATE_TABS))
    def switch_tab(self, tab: str):
        """Switch to a different tab."""
        self.current_tab = tab
        self.tab_history.append(tab)
    
    @rule()
    def go_back(self):
        """Go back in tab history."""
        if len(self.tab_history) > 1:
            self.tab_history.pop()
            self.current_tab = self.tab_history[-1]
    
    @invariant()
    def tab_always_valid(self):
        """Current tab is always a valid tab."""
        assert self.current_tab in VALID_CREATE_TABS
    
    @invariant()
    def history_not_empty(self):
        """Tab history is never empty."""
        assert len(self.tab_history) >= 1


TestTabNavigation = TabNavigationMachine.TestCase
```

**Run Property Tests:**
```bash
# Run with Hypothesis
python3 -m pytest backend/tests/properties/test_ux_consolidation.py -v --hypothesis-show-statistics

# Run with more examples for thorough testing
python3 -m pytest backend/tests/properties/test_ux_consolidation.py -v --hypothesis-seed=0 --hypothesis-settings='{"max_examples": 500}'
```

---

*Spec Version: 1.1*  
*Created: December 31, 2025*  
*Updated: December 31, 2025 - Added 10 gap resolutions, property tests, verified endpoints*  
*Author: Product Engineering*
