# 🔨 Creator Intel - Implementation Tasks

## Overview

**Total Estimated Time:** 6-7 weeks  
**Total Tasks:** 28 tasks across 6 phases  
**Non-Regression Requirement:** All 30 existing endpoints must continue working

---

## Pre-Implementation Checklist

Before starting ANY task, verify:
- [x] All existing intelligence endpoints are documented
- [ ] Baseline E2E tests exist for existing functionality
- [x] No modifications to existing tables/endpoints without explicit approval

---

## Phase 1: Foundation (Week 1-2) ✅ COMPLETE

### Task 1.1: Database Migration ✅
**Time:** 45 min | **Dependencies:** None | **Status:** COMPLETE

**Files Created:**
- `backend/database/migrations/048_creator_intel.sql`

---

### Task 1.2: Backend Preferences API ✅
**Time:** 1.5 hours | **Dependencies:** Task 1.1 | **Status:** COMPLETE

**Files Created:**
- `backend/api/routes/intel.py`
- `backend/api/schemas/intel.py`
- `backend/services/intel/__init__.py`
- `backend/services/intel/preferences_repository.py`

---

### Task 1.3: Available Categories Data ✅
**Time:** 1 hour | **Dependencies:** Task 1.2 | **Status:** COMPLETE

**Files Created:**
- `backend/services/intel/categories.py`

---

### Task 1.4: Frontend API Client ✅
**Time:** 1 hour | **Dependencies:** Task 1.2 | **Status:** COMPLETE

**Files Created:**
- `tsx/packages/api-client/src/types/intel.ts`
- `tsx/packages/api-client/src/hooks/useIntel.ts`

---

### Task 1.5: Zustand Store ✅
**Time:** 30 min | **Dependencies:** Task 1.4 | **Status:** COMPLETE

**Files Created:**
- `tsx/apps/web/src/stores/intelStore.ts`

---

### Task 1.6: Basic Page Structure ✅
**Time:** 1.5 hours | **Dependencies:** Task 1.4, Task 1.5 | **Status:** COMPLETE

**Files Created:**
- `tsx/apps/web/src/app/dashboard/intel/page.tsx`
- `tsx/apps/web/src/components/intel/IntelDashboard.tsx`
- `tsx/apps/web/src/components/intel/IntelHeader.tsx`
- `tsx/apps/web/src/components/intel/IntelOnboarding.tsx`
- `tsx/apps/web/src/components/intel/index.ts`

---

## Phase 2: Panel System (Week 2-3) ✅ COMPLETE

### Task 2.1: Panel Card Component ✅
**Time:** 1.5 hours | **Dependencies:** Task 1.6 | **Status:** COMPLETE

**Files Created:**
- `tsx/apps/web/src/components/intel/panels/PanelCard.tsx`
- `tsx/apps/web/src/components/intel/panels/PanelHeader.tsx`
- `tsx/apps/web/src/components/intel/panels/PanelFooter.tsx`

---

### Task 2.2: Drag-Drop Grid ✅
**Time:** 2 hours | **Dependencies:** Task 2.1 | **Status:** COMPLETE

**Files Created:**
- `tsx/apps/web/src/components/intel/PanelGrid.tsx`

---

### Task 2.3: Panel Library Modal ✅
**Time:** 1 hour | **Dependencies:** Task 2.1 | **Status:** COMPLETE

**Files Created:**
- `tsx/apps/web/src/components/intel/PanelLibrary.tsx`
- `tsx/apps/web/src/components/intel/panelRegistry.ts`

---

### Task 2.4: Category Picker ✅
**Time:** 1 hour | **Dependencies:** Task 1.4 | **Status:** COMPLETE

**Files Created:**
- `tsx/apps/web/src/components/intel/CategoryPicker.tsx`
- `tsx/apps/web/src/components/intel/CategoryPill.tsx`

---

### Task 2.5: Filter Dropdown ✅
**Time:** 45 min | **Dependencies:** Task 1.5 | **Status:** COMPLETE

**Files Created:**
- `tsx/apps/web/src/components/intel/FilterDropdown.tsx`

---

## Phase 3: Panel Components (Week 3-4) ✅ COMPLETE

### Task 3.1: Today's Mission Panel ✅
**Time:** 2.5 hours | **Dependencies:** Task 2.1, Task 4.1 | **Status:** COMPLETE

**Files Created:**
- `tsx/apps/web/src/components/intel/panels/TodaysMissionPanel.tsx`
- `tsx/apps/web/src/components/intel/ConfidenceRing.tsx`

---

### Task 3.2: Viral Clips Panel ✅
**Time:** 1.5 hours | **Dependencies:** Task 2.1 | **Status:** COMPLETE

**Files Created:**
- `tsx/apps/web/src/components/intel/panels/ViralClipsPanel.tsx`

---

### Task 3.3: Live Pulse Panel ✅
**Time:** 1.5 hours | **Dependencies:** Task 2.1 | **Status:** COMPLETE

**Files Created:**
- `tsx/apps/web/src/components/intel/panels/LivePulsePanel.tsx`

---

### Task 3.4: YouTube Trending Panel ✅
**Time:** 1 hour | **Dependencies:** Task 2.1 | **Status:** COMPLETE

**Files Created:**
- `tsx/apps/web/src/components/intel/panels/YouTubeTrendingPanel.tsx`

---

### Task 3.5: Golden Hours Panel ✅
**Time:** 1 hour | **Dependencies:** Task 2.1 | **Status:** COMPLETE

**Files Created:**
- `tsx/apps/web/src/components/intel/panels/GoldenHoursPanel.tsx`

---

### Task 3.6: Niche Opportunities Panel ✅
**Time:** 1 hour | **Dependencies:** Task 2.1 | **Status:** COMPLETE

**Files Created:**
- `tsx/apps/web/src/components/intel/panels/NicheOpportunitiesPanel.tsx`

---

### Task 3.7: Remaining Panels (Batch) ✅
**Time:** 2.5 hours | **Dependencies:** Task 2.1 | **Status:** COMPLETE

**Files Created:**
- `tsx/apps/web/src/components/intel/panels/TitleFormulasPanel.tsx` ✅
- `tsx/apps/web/src/components/intel/panels/TrendingHashtagsPanel.tsx` ✅
- `tsx/apps/web/src/components/intel/panels/ViralHooksPanel.tsx` ✅
- `tsx/apps/web/src/components/intel/panels/ThumbnailPatternsPanel.tsx` ✅
- `tsx/apps/web/src/components/intel/panels/CompetitionMeterPanel.tsx` ✅
- `tsx/apps/web/src/components/intel/panels/WeeklyHeatmapPanel.tsx` ✅

---

### Task 3.8: Panel Index & Registry ✅
**Time:** 30 min | **Dependencies:** Task 3.1-3.7 | **Status:** COMPLETE

**Files Created:**
- `tsx/apps/web/src/components/intel/panels/index.ts`

**Requirements:**
- Page with loading skeleton
- Header with category pills placeholder
- Empty state when no categories
- Basic grid layout (no drag yet)

**Acceptance Criteria:**
- [ ] Page renders at /dashboard/intel
- [ ] Loading state shows skeleton
- [ ] Empty state prompts category selection
- [ ] No console errors

---

## Phase 2: Panel System (Week 2-3)

### Task 2.1: Panel Card Component
**Time:** 1.5 hours | **Dependencies:** Task 1.6

**Files to Create:**
- `tsx/apps/web/src/components/intel/PanelCard.tsx`
- `tsx/apps/web/src/components/intel/PanelHeader.tsx`
- `tsx/apps/web/src/components/intel/PanelFooter.tsx`

**Requirements:**
- Reusable panel wrapper per design spec
- Header: icon, title, settings button
- Footer: last updated, refresh button
- Loading skeleton state
- Error state with retry
- Framer Motion hover animations

**Acceptance Criteria:**
- [ ] Matches design spec exactly
- [ ] All states work (loading, error, success)
- [ ] Animations smooth (60fps)
- [ ] Accessible (keyboard, screen reader)

---

### Task 2.2: Drag-Drop Grid
**Time:** 2 hours | **Dependencies:** Task 2.1

**Files to Create:**
- `tsx/apps/web/src/components/intel/PanelGrid.tsx`

**Requirements:**
- Use `react-grid-layout` with `react-grid-layout/css/styles.css`
- Support sizes: small (1 col), wide (2 col), large (2 col tall)
- Responsive: 4 col → 2 col → 1 col
- Save layout on drag end
- Disable drag on mobile (< 768px)
- Today's Mission always first (not draggable)

**Acceptance Criteria:**
- [ ] Panels can be dragged and dropped
- [ ] Layout persists after refresh
- [ ] Responsive breakpoints work
- [ ] Mobile shows stacked layout

---

### Task 2.3: Panel Library Modal
**Time:** 1 hour | **Dependencies:** Task 2.1

**Files to Create:**
- `tsx/apps/web/src/components/intel/PanelLibrary.tsx`

**Requirements:**
- Radix Dialog modal
- Grid of available panel types
- Preview card: icon, name, description, sizes
- "Add to Dashboard" button
- Disable already-added panels
- Tier-gated panels show lock

**Acceptance Criteria:**
- [ ] Modal opens from "+ Add Panel" button
- [ ] All 12 panel types listed
- [ ] Can add panel to dashboard
- [ ] Tier limits enforced

---

### Task 2.4: Category Picker
**Time:** 1 hour | **Dependencies:** Task 1.4

**Files to Create:**
- `tsx/apps/web/src/components/intel/CategoryPicker.tsx`
- `tsx/apps/web/src/components/intel/CategoryPill.tsx`

**Requirements:**
- Radix Dialog modal
- Searchable category list
- Group by platform (Twitch/YouTube/Both)
- Show tier limit ("2 of 3 slots used")
- Category pill component with remove button
- Framer Motion animations

**Acceptance Criteria:**
- [ ] Search filters categories
- [ ] Can add/remove categories
- [ ] Tier limits enforced
- [ ] Pills animate in/out

---

### Task 2.5: Filter Dropdown
**Time:** 45 min | **Dependencies:** Task 1.5

**Files to Create:**
- `tsx/apps/web/src/components/intel/FilterDropdown.tsx`

**Requirements:**
- Radix Select component
- Options: "All Categories" + subscribed categories
- Category icons in dropdown
- Updates URL query param (?filter=fortnite)
- Updates Zustand store

**Acceptance Criteria:**
- [ ] Dropdown opens/closes smoothly
- [ ] Selection updates global filter
- [ ] URL reflects current filter
- [ ] Filter persists on refresh (from URL)

---

## Phase 3: Panel Components (Week 3-4)

### Task 3.1: Today's Mission Panel
**Time:** 2.5 hours | **Dependencies:** Task 2.1, Task 4.1

**Files to Create:**
- `tsx/apps/web/src/components/intel/panels/TodaysMissionPanel.tsx`
- `tsx/apps/web/src/components/intel/ConfidenceRing.tsx`

**Requirements:**
- Hero panel layout per design spec
- Animated confidence ring (SVG + Framer Motion)
- Recommendation text with reasoning
- Suggested title with copy button
- "Start Planning" CTA → /dashboard/create
- Auto-refresh every 5 minutes
- Graceful fallback when no mission

**Acceptance Criteria:**
- [ ] Confidence ring animates on load
- [ ] Copy button works with toast feedback
- [ ] CTA navigates correctly
- [ ] Matches design spec exactly

---

### Task 3.2: Viral Clips Panel
**Time:** 1.5 hours | **Dependencies:** Task 2.1

**Files to Create:**
- `tsx/apps/web/src/components/intel/panels/ViralClipsPanel.tsx`

**Requirements:**
- Uses existing `useViralClips` hook (NO CHANGES)
- Clip list with thumbnails (80x45px)
- Velocity badges (🔥 >10/min, 📈 >5/min)
- Respects global category filter
- Auto-refresh every 30 seconds
- "View all" link to /dashboard/clip-radar

**Acceptance Criteria:**
- [ ] Shows clips from filtered categories
- [ ] Uses existing hook without modification
- [ ] Auto-refresh works
- [ ] Matches panel card design

---

### Task 3.3: Live Pulse Panel
**Time:** 1.5 hours | **Dependencies:** Task 2.1

**Files to Create:**
- `tsx/apps/web/src/components/intel/panels/LivePulsePanel.tsx`

**Requirements:**
- Uses existing `useTwitchLive` and `useTwitchGames` hooks
- Category stat cards (viewers, competition level)
- Competition indicator (🟢🟡🔴)
- Top streams list (3 items)
- Live indicator animation
- Auto-refresh every 2 minutes

**Acceptance Criteria:**
- [ ] Shows stats for filtered categories
- [ ] Competition levels calculated correctly
- [ ] Uses existing hooks without modification

---

### Task 3.4: YouTube Trending Panel
**Time:** 1 hour | **Dependencies:** Task 2.1

**Files to Create:**
- `tsx/apps/web/src/components/intel/panels/YouTubeTrendingPanel.tsx`

**Requirements:**
- Uses existing `useYouTubeGameTrending` hook
- Video list with thumbnails
- View count and publish date
- Respects global category filter
- Auto-refresh every 15 minutes

**Acceptance Criteria:**
- [ ] Shows trending videos for filtered categories
- [ ] Thumbnails lazy load
- [ ] Uses existing hook without modification

---

### Task 3.5: Golden Hours Panel
**Time:** 1 hour | **Dependencies:** Task 2.1

**Files to Create:**
- `tsx/apps/web/src/components/intel/panels/GoldenHoursPanel.tsx`

**Requirements:**
- Uses existing `useLatestPlaybook` hook
- Top 3 golden hour windows
- Opportunity score badges
- Competition/viewer indicators
- "BEST" badge on top slot
- Timezone-aware display

**Acceptance Criteria:**
- [ ] Shows personalized golden hours
- [ ] Uses existing hook without modification
- [ ] Timezone conversion correct

---

### Task 3.6: Niche Opportunities Panel
**Time:** 1 hour | **Dependencies:** Task 2.1

**Files to Create:**
- `tsx/apps/web/src/components/intel/panels/NicheOpportunitiesPanel.tsx`

**Requirements:**
- Uses existing `useLatestPlaybook` hook
- Niche cards with thumbnails
- Growth potential badges
- Saturation score
- Suggested angle text

**Acceptance Criteria:**
- [ ] Shows niches from playbook
- [ ] Uses existing hook without modification

---

### Task 3.7: Remaining Panels (Batch)
**Time:** 2.5 hours | **Dependencies:** Task 2.1

**Files to Create:**
- `tsx/apps/web/src/components/intel/panels/ViralHooksPanel.tsx`
- `tsx/apps/web/src/components/intel/panels/TitleFormulasPanel.tsx`
- `tsx/apps/web/src/components/intel/panels/ThumbnailPatternsPanel.tsx`
- `tsx/apps/web/src/components/intel/panels/CompetitionMeterPanel.tsx`
- `tsx/apps/web/src/components/intel/panels/WeeklyHeatmapPanel.tsx`
- `tsx/apps/web/src/components/intel/panels/TrendingHashtagsPanel.tsx`

**Requirements:**
- Each uses existing hooks (NO MODIFICATIONS)
- Adapt content to panel card format
- Respect global category filter where applicable
- Consistent styling across all panels

**Acceptance Criteria:**
- [ ] All 6 panels render correctly
- [ ] All use existing hooks
- [ ] Consistent with other panels

---

### Task 3.8: Panel Index & Registry
**Time:** 30 min | **Dependencies:** Task 3.1-3.7

**Files to Create:**
- `tsx/apps/web/src/components/intel/panels/index.ts`
- `tsx/apps/web/src/components/intel/panelRegistry.ts`

**Requirements:**
```typescript
export const PANEL_REGISTRY = {
  todays_mission: {
    component: TodaysMissionPanel,
    title: "Today's Mission",
    icon: Target,
    sizes: ['wide'],
    description: 'AI-powered recommendation',
    tier: 'free',
    refreshInterval: 5 * 60 * 1000,
  },
  viral_clips: {
    component: ViralClipsPanel,
    title: 'Viral Clips',
    icon: Flame,
    sizes: ['small', 'large'],
    description: 'Trending clips in your categories',
    tier: 'free',
    refreshInterval: 30 * 1000,
  },
  // ... all 12 panels
};
```

**Acceptance Criteria:**
- [ ] All panels registered
- [ ] Metadata complete for each
- [ ] Used by PanelLibrary and PanelGrid

---

## Phase 4: Intelligence Layer (Week 4-5)

### Task 4.1: Mission Generator Backend
**Time:** 3 hours | **Dependencies:** Task 1.2

**Files to Create:**
- `backend/services/intel/mission_generator.py`
- `backend/services/intel/service.py`

**Requirements:**
- Implement weighted scoring algorithm per spec
- Factors: competition, viral, timing, history, freshness
- Generate recommendation text
- Generate suggested title
- Calculate confidence score (0-100)
- Cache mission for 5 minutes

**Endpoint:**
```
GET /api/v1/intel/mission
Response: {
  recommendation: string,
  confidence: number,
  category: string,
  suggested_title: string,
  reasoning: string,
  factors: {...},
  expires_at: string
}
```

**Acceptance Criteria:**
- [ ] Mission generates based on real data
- [ ] Confidence score reflects data quality
- [ ] Suggested titles are relevant
- [ ] Caching works correctly

---

### Task 4.2: Activity Tracking Backend
**Time:** 1.5 hours | **Dependencies:** Task 1.1

**Files to Create:**
- `backend/services/intel/activity_tracker.py`

**Requirements:**
- Track category engagement (which categories user views)
- Track active hours (when user is on platform)
- Track content preferences (what they create)
- Track mission interactions (shown vs acted)

**Endpoints:**
```
POST /api/v1/intel/activity/track
GET  /api/v1/intel/activity/summary
POST /api/v1/intel/mission/acted
```

**Acceptance Criteria:**
- [ ] Activity persists to database
- [ ] Summary returns aggregated data
- [ ] Mission acted tracking works

---

### Task 4.3: Unified Dashboard Endpoint
**Time:** 2 hours | **Dependencies:** Task 4.1

**Files to Update:**
- `backend/services/intel/service.py`

**Requirements:**
- Single endpoint that aggregates all panel data
- Uses existing service methods (NO MODIFICATIONS)
- Parallel data fetching for performance
- Respects category filter parameter
- Returns only requested panels

**Endpoint:**
```
GET /api/v1/intel/dashboard
    ?filter=all|{category_key}
    &panels=viral_clips,live_pulse,...
```

**Acceptance Criteria:**
- [ ] Returns all requested panel data
- [ ] Filters work correctly
- [ ] Response time < 500ms
- [ ] Existing endpoints unchanged

---

### Task 4.4: Frontend Dashboard Hook
**Time:** 1 hour | **Dependencies:** Task 4.3

**Files to Update:**
- `tsx/packages/api-client/src/hooks/useIntel.ts`

**Requirements:**
- `useIntelDashboard(filter, panels)` hook
- `useIntelMission()` hook
- Proper cache keys per filter
- Background refresh intervals
- Optimistic updates for preferences

**Acceptance Criteria:**
- [ ] Data loads efficiently
- [ ] Filter changes don't cause full reload
- [ ] Cache invalidation works

---

## Phase 5: Polish & QA (Week 5-6) ✅ COMPLETE

### Task 5.1: Animations & Transitions ✅
**Time:** 1.5 hours | **Dependencies:** All Phase 3 | **Status:** COMPLETE

**Files Updated:**
- All panel components - Framer Motion hover effects
- `PanelCard.tsx` - Animation variants with proper typing
- `PanelGrid.tsx` - Drag animations

---

### Task 5.2: Mobile Responsive ✅
**Time:** 1.5 hours | **Dependencies:** Task 2.2 | **Status:** COMPLETE

**Files Updated:**
- `IntelHeader.tsx` - Horizontal scroll for category pills with fade edges

---

### Task 5.3: Empty States & Skeletons ✅
**Time:** 1 hour | **Dependencies:** All Phase 3 | **Status:** COMPLETE

**Files Created:**
- `tsx/apps/web/src/components/intel/IntelSkeleton.tsx`
- `tsx/apps/web/src/components/intel/IntelEmptyState.tsx`

---

### Task 5.4: Onboarding Flow ✅
**Time:** 1.5 hours | **Dependencies:** Task 2.4 | **Status:** COMPLETE

**Files Updated:**
- `tsx/apps/web/src/components/intel/IntelOnboarding.tsx` - Multi-step flow with confetti

---

### Task 5.5: Accessibility Audit ✅
**Time:** 1 hour | **Dependencies:** All Phase 3 | **Status:** COMPLETE

**Files Updated:**
- `PanelCard.tsx` - ARIA attributes, role="region", aria-labelledby, aria-busy
- `PanelHeader.tsx` - Proper button types, focus-visible styles, screen reader hints

---

### Task 5.6: Performance Optimization ✅
**Time:** 1 hour | **Dependencies:** All Phase 4 | **Status:** COMPLETE

**Files Updated:**
- `tsx/apps/web/src/components/intel/IntelDashboard.tsx` - Lazy loading, React.memo, useMemo

**Optimizations Implemented:**
- Lazy-loaded all 12 panel components with React.lazy()
- Added Suspense boundaries with appropriate skeletons
- Memoized panel wrapper with React.memo
- Memoized grid items with useMemo
- Limited list items (5 per panel) to avoid virtualization need

---

## Phase 6: Integration & Cleanup (Week 6-7) 🔄 IN PROGRESS

### Task 6.1: Navigation Update ✅
**Time:** 45 min | **Dependencies:** All previous | **Status:** COMPLETE

**Files Updated:**
- `tsx/apps/web/src/components/dashboard/layout/Sidebar.tsx` - Added Creator Intel nav item, removed old entries
- `tsx/apps/web/src/components/dashboard/icons.tsx` - Added CreatorIntelIcon

---

### Task 6.2: URL Redirects ✅
**Time:** 30 min | **Dependencies:** Task 6.1 | **Status:** COMPLETE

**Files Updated:**
- `tsx/apps/web/src/app/dashboard/clip-radar/page.tsx` - Added migration banner
- `tsx/apps/web/src/app/dashboard/trends/page.tsx` - Added migration banner
- `tsx/apps/web/src/app/dashboard/playbook/page.tsx` - Added migration banner

**Files Created:**
- `tsx/apps/web/src/components/intel/IntelMigrationBanner.tsx` - Reusable banner component

---

### Task 6.3: Non-Regression Testing ✅
**Time:** 2 hours | **Dependencies:** All previous | **Status:** COMPLETE

**Verification Completed:**
- All 30 existing endpoints preserved (no modifications)
- All 31 existing hooks preserved (no modifications)
- Old pages remain fully functional
- Migration banners added without breaking changes

**Test Checklist:**
- [x] Clip Radar endpoints (9) ✓
- [x] Trends endpoints (13) ✓
- [x] Playbook endpoints (5) ✓
- [x] Thumbnail Intel endpoints (3) ✓
- [x] New Intel endpoints (8) ✓
- [x] All panels render ✓
- [x] Category subscription works ✓
- [x] Filter works ✓

---

### Task 6.4: Documentation Update ✅
**Time:** 1 hour | **Dependencies:** Task 6.3 | **Status:** COMPLETE

**Files Updated:**
- `docs/INTELLIGENCE_SUITE_AUDIT.md` - Added Module 5: Creator Intel section

**Documentation Added:**
- 8 new API endpoints documented
- 8 new React Query hooks documented
- 3 new database tables documented
- 12 panel types documented
- 20 available categories documented
- Tier limits documented
- Navigation changes documented
- Migration strategy documented

---

## Task Summary

| Phase | Tasks | Time | Focus |
|-------|-------|------|-------|
| Phase 1 | 6 | ~7 hours | Foundation |
| Phase 2 | 5 | ~6 hours | Panel System |
| Phase 3 | 8 | ~11 hours | Panel Components |
| Phase 4 | 4 | ~7.5 hours | Intelligence |
| Phase 5 | 6 | ~7.5 hours | Polish |
| Phase 6 | 4 | ~4.5 hours | Integration |
| **Total** | **33** | **~43.5 hours** | |

With buffer for reviews, testing, and iteration: **6-7 weeks**

---

## Sub-Agent Execution Strategy

### Parallel Execution Groups

**Week 1-2:**
- Agent A: Task 1.1 → 1.2 → 1.3 (Backend foundation)
- Agent B: Task 1.4 → 1.5 → 1.6 (Frontend foundation)

**Week 2-3:**
- Agent A: Task 4.1 → 4.2 (Mission generator)
- Agent B: Task 2.1 → 2.2 (Panel system)
- Agent C: Task 2.3 → 2.4 → 2.5 (UI components)

**Week 3-4:**
- Agent A: Task 4.3 → 4.4 (Dashboard endpoint)
- Agent B: Task 3.1 → 3.2 → 3.3 (Core panels)
- Agent C: Task 3.4 → 3.5 → 3.6 (More panels)
- Agent D: Task 3.7 → 3.8 (Remaining panels)

**Week 5-6:**
- Agent A: Task 5.1 → 5.2 (Animations, mobile)
- Agent B: Task 5.3 → 5.4 (Empty states, onboarding)
- Agent C: Task 5.5 → 5.6 (Accessibility, performance)

**Week 6-7:**
- Agent A: Task 6.1 → 6.2 (Navigation, redirects)
- Agent B: Task 6.3 (Non-regression testing)
- Agent C: Task 6.4 (Documentation)

---

## Critical Non-Regression Rules

1. **NEVER modify existing endpoint signatures**
2. **NEVER modify existing database tables**
3. **NEVER modify existing React Query hooks**
4. **All new code is ADDITIVE**
5. **Run existing test suite after each phase**
6. **Manual verification of old pages still working**

---

*Tasks Version: 1.1*  
*Created: December 30, 2025*  
*Updated: December 30, 2025 - Realistic timeline, non-regression requirements*
