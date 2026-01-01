# 🔨 UX Consolidation 2025 - Implementation Tasks

## Overview

**Total Estimated Time:** 3 weeks  
**Total Tasks:** 45 tasks across 5 phases  
**Non-Regression Requirement:** All existing functionality must continue working

---

## Pre-Implementation Checklist

Before starting ANY task, verify:
- [ ] All existing pages load without errors
- [ ] All existing API endpoints respond correctly
- [ ] No modifications to existing components (only wrappers)
- [ ] Baseline E2E tests pass

---

## Phase 1: Dashboard 2.0 Modernization (Week 1)

### Task 1.1: Intel Preview Component
**Time:** 1.5 hours | **Dependencies:** Creator Intel spec (Task 4.1) | **Priority:** P0

**Files to Create:**
- `tsx/apps/web/src/components/dashboard/overview/IntelPreview.tsx`
- `tsx/apps/web/src/components/dashboard/overview/IntelPreviewSkeleton.tsx`

**Requirements:**
- Mini version of Today's Mission for dashboard
- Uses existing `useIntelMission` hook from Creator Intel
- Shows: recommendation, confidence, key factors
- "View Intel →" CTA links to /dashboard/intel
- Loading skeleton while data fetches
- Graceful fallback when no mission available
- Gradient background matching Intel design

**Acceptance Criteria:**
- [ ] Displays mission recommendation
- [ ] Shows confidence percentage
- [ ] Links to full Intel page
- [ ] Loading state works
- [ ] Empty state is helpful


---

### Task 1.2: Quick Actions Grid Component
**Time:** 1 hour | **Dependencies:** None | **Priority:** P0

**Files to Create:**
- `tsx/apps/web/src/components/dashboard/overview/QuickActionsGrid.tsx`

**Requirements:**
- Modernized 2x2 grid of quick action cards
- Uses existing `QuickActionCard` component
- Actions: Create, Brand Studio, Assets, Community
- Responsive: 2x2 on desktop, 2x1 on tablet, 1x1 on mobile
- Hover animations (existing)
- Icons match new nav structure

**Acceptance Criteria:**
- [ ] 4 action cards displayed
- [ ] Responsive grid layout
- [ ] Links work correctly
- [ ] Hover states work

---

### Task 1.3: Recent Activity Feed Enhancement
**Time:** 1.5 hours | **Dependencies:** None | **Priority:** P1

**Files to Create:**
- `tsx/apps/web/src/components/dashboard/overview/RecentActivityFeed.tsx`

**Requirements:**
- Enhanced version of existing ActivityFeed
- Shows thumbnails for asset activities
- Richer activity types (asset created, brand updated, etc.)
- "View all" link to Asset Library
- Maximum 5 items displayed
- Loading skeleton
- Empty state

**Acceptance Criteria:**
- [ ] Shows recent activities with thumbnails
- [ ] Links to relevant pages
- [ ] Loading state works
- [ ] Empty state is helpful

---

### Task 1.4: Tips Section Component
**Time:** 1 hour | **Dependencies:** None | **Priority:** P2

**Files to Create:**
- `tsx/apps/web/src/components/dashboard/overview/TipsSection.tsx`

**Requirements:**
- Contextual tips based on user state
- New user: "Create your first brand kit"
- No assets: "Generate your first asset"
- Has assets: "Try the AI Coach"
- Dismissible tips (localStorage)
- Subtle styling, not intrusive

**Acceptance Criteria:**
- [ ] Shows relevant tip based on user state
- [ ] Can be dismissed
- [ ] Dismissal persists
- [ ] Styling is subtle

---

### Task 1.5: Dashboard Overview Index
**Time:** 30 min | **Dependencies:** Tasks 1.1-1.4 | **Priority:** P0

**Files to Create:**
- `tsx/apps/web/src/components/dashboard/overview/index.ts`

**Requirements:**
- Export all overview components
- Clean barrel file

**Acceptance Criteria:**
- [ ] All components exported
- [ ] No circular dependencies

---

### Task 1.6: Dashboard Page Update
**Time:** 2 hours | **Dependencies:** Tasks 1.1-1.5 | **Priority:** P0

**Files to Modify:**
- `tsx/apps/web/src/app/dashboard/page.tsx`

**Requirements:**
- Integrate new overview components
- Layout: Hero → Intel Preview → Quick Actions → Stats + Activity
- Preserve all existing data fetching
- Preserve all existing functionality
- Add loading skeletons for new sections
- Responsive layout

**Acceptance Criteria:**
- [ ] New layout renders correctly
- [ ] All existing functionality preserved
- [ ] Loading states work
- [ ] Responsive on all breakpoints
- [ ] No console errors

---

## Phase 2: Unified Create Flow (Week 1-2)

### Task 2.1: Create Tabs Component
**Time:** 1 hour | **Dependencies:** None | **Priority:** P0

**Files to Create:**
- `tsx/apps/web/src/components/create/CreateTabs.tsx`

**Requirements:**
- Tab navigation: Templates | Custom | AI Coach
- Uses Radix UI Tabs primitive
- URL-driven state (?tab=templates|custom|coach)
- Badge on AI Coach tab for non-Pro users
- Framer Motion transitions
- Accessible (keyboard, screen reader)

**Acceptance Criteria:**
- [ ] Three tabs render correctly
- [ ] URL updates on tab change
- [ ] Tab from URL works on load
- [ ] Animations smooth
- [ ] Accessible

---

### Task 2.2: Extract Quick Create Content
**Time:** 45 min | **Dependencies:** None | **Priority:** P0

**Files to Modify:**
- `tsx/apps/web/src/components/quick-create/QuickCreateWizard.tsx`

**Requirements:**
- NO CHANGES to existing component
- Verify it can be rendered as a child component
- Ensure no page-level assumptions (headers, etc.)

**Acceptance Criteria:**
- [ ] Component renders standalone
- [ ] No page-level dependencies
- [ ] All functionality works

---

### Task 2.3: Extract Create Page Content
**Time:** 1 hour | **Dependencies:** None | **Priority:** P0

**Files to Create:**
- `tsx/apps/web/src/components/create/CreatePageContent.tsx`

**Requirements:**
- Extract content from current create/page.tsx
- Remove page-level wrapper (PageContainer, etc.)
- Keep all existing logic and state
- Export as standalone component

**Acceptance Criteria:**
- [ ] Component renders standalone
- [ ] All create functionality works
- [ ] No page-level dependencies

---

### Task 2.4: Extract Coach Page Content
**Time:** 1 hour | **Dependencies:** None | **Priority:** P0

**Files to Create:**
- `tsx/apps/web/src/components/coach/CoachPageContent.tsx`

**Requirements:**
- Extract content from current coach/page.tsx
- Remove page-level wrapper
- Keep all existing logic and state
- Export as standalone component

**Acceptance Criteria:**
- [ ] Component renders standalone
- [ ] All coach functionality works
- [ ] No page-level dependencies

---

### Task 2.5: Unified Create Flow Container
**Time:** 1.5 hours | **Dependencies:** Tasks 2.1-2.4 | **Priority:** P0

**Files to Create:**
- `tsx/apps/web/src/components/create/UnifiedCreateFlow.tsx`

**Requirements:**
- Container component with tab navigation
- Renders appropriate content based on active tab
- Templates → QuickCreateWizard
- Custom → CreatePageContent
- AI Coach → CoachPageContent
- Lazy load tab content for performance
- Preserve scroll position on tab switch

**Acceptance Criteria:**
- [ ] All three tabs work
- [ ] Content switches correctly
- [ ] No functionality regression
- [ ] Performance acceptable

---

### Task 2.6: Update Create Page
**Time:** 1 hour | **Dependencies:** Task 2.5 | **Priority:** P0

**Files to Modify:**
- `tsx/apps/web/src/app/dashboard/create/page.tsx`

**Requirements:**
- Replace current content with UnifiedCreateFlow
- Read tab from URL params
- Default to "templates" tab
- Page header with title and description
- Preserve any page-level logic

**Acceptance Criteria:**
- [ ] Page renders UnifiedCreateFlow
- [ ] URL params work
- [ ] Default tab is templates
- [ ] All functionality preserved

---

### Task 2.7: Quick Create Redirect
**Time:** 30 min | **Dependencies:** Task 2.6 | **Priority:** P0

**Files to Modify:**
- `tsx/apps/web/src/app/dashboard/quick-create/page.tsx`

**Requirements:**
- Redirect to /dashboard/create?tab=templates
- Show redirect toast (one-time)
- Use Next.js redirect or client-side navigation

**Acceptance Criteria:**
- [ ] Redirect works
- [ ] Toast shows (first time only)
- [ ] No broken links

---

### Task 2.8: Coach Page Redirect
**Time:** 30 min | **Dependencies:** Task 2.6 | **Priority:** P0

**Files to Modify:**
- `tsx/apps/web/src/app/dashboard/coach/page.tsx`

**Requirements:**
- Redirect to /dashboard/create?tab=coach
- Show redirect toast (one-time)
- Preserve any query params

**Acceptance Criteria:**
- [ ] Redirect works
- [ ] Toast shows (first time only)
- [ ] Query params preserved

---

## Phase 3: Community Hub Consolidation (Week 2)

### Task 3.1: Community Tabs Component
**Time:** 1 hour | **Dependencies:** None | **Priority:** P0

**Files to Create:**
- `tsx/apps/web/src/components/community/CommunityTabs.tsx`

**Requirements:**
- Tab navigation: Gallery | Creators | Promo Board
- Uses Radix UI Tabs primitive
- URL-driven state (?tab=gallery|creators|promo)
- Badge on Promo tab showing "$1"
- Framer Motion transitions
- Accessible

**Acceptance Criteria:**
- [ ] Three tabs render correctly
- [ ] URL updates on tab change
- [ ] Tab from URL works on load
- [ ] Animations smooth

---

### Task 3.2: Extract Community Gallery Content
**Time:** 1 hour | **Dependencies:** None | **Priority:** P0

**Files to Create:**
- `tsx/apps/web/src/components/community/CommunityGalleryContent.tsx`

**Requirements:**
- Extract gallery content from current community/page.tsx
- Remove page-level wrapper
- Keep all existing logic (posts, filters, etc.)
- Export as standalone component

**Acceptance Criteria:**
- [ ] Component renders standalone
- [ ] All gallery functionality works
- [ ] Filters work
- [ ] Infinite scroll works

---

### Task 3.3: Extract Creator Spotlight Content
**Time:** 45 min | **Dependencies:** None | **Priority:** P0

**Files to Create:**
- `tsx/apps/web/src/components/community/CreatorSpotlightContent.tsx`

**Requirements:**
- Extract creator spotlight from current community/page.tsx
- Make it a full tab content (not just a section)
- Add "View all creators" functionality
- Keep follow/unfollow logic

**Acceptance Criteria:**
- [ ] Component renders standalone
- [ ] Follow/unfollow works
- [ ] Creator profiles link correctly

---

### Task 3.4: Extract Promo Board Content
**Time:** 1 hour | **Dependencies:** None | **Priority:** P0

**Files to Create:**
- `tsx/apps/web/src/components/community/PromoBoardContent.tsx`

**Requirements:**
- Extract content from current promo/page.tsx
- Remove page-level wrapper
- Keep all existing logic (messages, leaderboard, etc.)
- Export as standalone component

**Acceptance Criteria:**
- [ ] Component renders standalone
- [ ] All promo functionality works
- [ ] Compose modal works
- [ ] Leaderboard displays

---

### Task 3.5: Community Hub Container
**Time:** 1.5 hours | **Dependencies:** Tasks 3.1-3.4 | **Priority:** P0

**Files to Create:**
- `tsx/apps/web/src/components/community/CommunityHub.tsx`

**Requirements:**
- Container component with tab navigation
- Renders appropriate content based on active tab
- Gallery → CommunityGalleryContent
- Creators → CreatorSpotlightContent
- Promo → PromoBoardContent
- Lazy load tab content

**Acceptance Criteria:**
- [ ] All three tabs work
- [ ] Content switches correctly
- [ ] No functionality regression

---

### Task 3.6: Update Community Page
**Time:** 1 hour | **Dependencies:** Task 3.5 | **Priority:** P0

**Files to Modify:**
- `tsx/apps/web/src/app/community/page.tsx`

**Requirements:**
- Replace current content with CommunityHub
- Read tab from URL params
- Default to "gallery" tab
- Page header with title and description

**Acceptance Criteria:**
- [ ] Page renders CommunityHub
- [ ] URL params work
- [ ] Default tab is gallery
- [ ] All functionality preserved

---

### Task 3.7: Promo Page Redirect
**Time:** 30 min | **Dependencies:** Task 3.6 | **Priority:** P0

**Files to Modify:**
- `tsx/apps/web/src/app/promo/page.tsx`

**Requirements:**
- Redirect to /community?tab=promo
- Show redirect toast (one-time)

**Acceptance Criteria:**
- [ ] Redirect works
- [ ] Toast shows (first time only)

---

## Phase 4: Navigation & Redirects (Week 2-3)

### Task 4.1: Redirect Toast Hook
**Time:** 45 min | **Dependencies:** None | **Priority:** P0

**Files to Create:**
- `tsx/apps/web/src/hooks/useRedirectToast.ts`

**Requirements:**
- Hook to show one-time redirect notification
- Uses localStorage to track shown toasts
- Configurable message per redirect
- Auto-dismiss after 5 seconds
- Dismissible via button

**Acceptance Criteria:**
- [ ] Toast shows on redirect
- [ ] Only shows once per redirect type
- [ ] Auto-dismisses
- [ ] Can be manually dismissed

---

### Task 4.2: Update Sidebar Navigation
**Time:** 1.5 hours | **Dependencies:** None | **Priority:** P0

**Files to Modify:**
- `tsx/apps/web/src/components/dashboard/layout/Sidebar.tsx`

**Requirements:**
- Update mainNavItems:
  - Overview (unchanged)
  - Create (remove Quick Create, keep Create)
  - Brand Studio (unchanged)
  - Asset Library (unchanged)
  - Community (unchanged, remove Promo Board)
- Update toolsNavItems:
  - Creator Intel (new, replaces Trends/Playbook/Clip Radar)
  - Profile Creator (unchanged)
  - Aura Lab (unchanged)
  - Remove: Prompt Coach, Vibe Branding, Trends, Playbook, Clip Radar
- Keep settingsNavItems unchanged

**New Navigation Arrays:**
```typescript
const mainNavItems: NavItem[] = [
  { name: 'Overview', href: '/dashboard', icon: DashboardIcon },
  { name: 'Create', href: '/dashboard/create', icon: CreateIcon, dataTour: 'create' },
  { name: 'Brand Studio', href: '/dashboard/brand-kits', icon: BrandIcon, dataTour: 'brand-kits' },
  { name: 'Asset Library', href: '/dashboard/assets', icon: LibraryIcon, dataTour: 'assets' },
  { name: 'Community', href: '/community', icon: CommunityIcon, dataTour: 'community' },
];

const toolsNavItems: NavItem[] = [
  { name: 'Creator Intel', href: '/dashboard/intel', icon: IntelIcon, badge: 'New', dataTour: 'intel' },
  { name: 'Profile Creator', href: '/dashboard/profile-creator', icon: ProfileCreatorIcon, dataTour: 'profile-creator' },
  { name: 'Aura Lab', href: '/dashboard/aura-lab', icon: AuraLabIcon, dataTour: 'aura-lab' },
];
```

**Acceptance Criteria:**
- [ ] New nav structure renders
- [ ] All links work
- [ ] Active states work
- [ ] Mobile nav updated

---

### Task 4.3: Update Mobile Navigation
**Time:** 45 min | **Dependencies:** Task 4.2 | **Priority:** P0

**Files to Modify:**
- `tsx/apps/web/src/components/mobile/MobileNavDropdown.tsx`
- `tsx/apps/web/src/components/mobile/MobileBottomNav.tsx` (if exists)

**Requirements:**
- Mirror sidebar nav changes
- Same items, same order
- Update any hardcoded nav items

**Acceptance Criteria:**
- [ ] Mobile nav matches sidebar
- [ ] All links work
- [ ] Dropdown works correctly

---

### Task 4.4: Add Intel Icon
**Time:** 15 min | **Dependencies:** None | **Priority:** P0

**Files to Modify:**
- `tsx/apps/web/src/components/dashboard/icons.tsx`

**Requirements:**
- Add IntelIcon (Target or Radar style)
- Match existing icon style
- Export from icons file

**Acceptance Criteria:**
- [ ] Icon renders correctly
- [ ] Matches design system

---

### Task 4.5: Update Keyboard Shortcuts
**Time:** 30 min | **Dependencies:** Task 4.2 | **Priority:** P2

**Files to Modify:**
- `tsx/apps/web/src/components/keyboard/ShortcutsModal.tsx`
- `tsx/apps/web/src/components/command-palette/commands/*.ts`

**Requirements:**
- Update shortcuts to match new nav
- Remove shortcuts for removed items
- Add shortcut for Creator Intel

**Acceptance Criteria:**
- [ ] Shortcuts work
- [ ] Modal shows correct shortcuts
- [ ] Command palette updated

---

### Task 4.6: Trends Page Redirect
**Time:** 30 min | **Dependencies:** Task 4.1 | **Priority:** P0

**Files to Modify:**
- `tsx/apps/web/src/app/dashboard/trends/page.tsx`

**Requirements:**
- Redirect to /dashboard/intel?tab=trends
- Show redirect toast

**Acceptance Criteria:**
- [ ] Redirect works
- [ ] Toast shows

---

### Task 4.7: Playbook Page Redirect
**Time:** 30 min | **Dependencies:** Task 4.1 | **Priority:** P0

**Files to Modify:**
- `tsx/apps/web/src/app/dashboard/playbook/page.tsx`

**Requirements:**
- Redirect to /dashboard/intel?tab=playbook
- Show redirect toast

**Acceptance Criteria:**
- [ ] Redirect works
- [ ] Toast shows

---

### Task 4.8: Clip Radar Page Redirect
**Time:** 30 min | **Dependencies:** Task 4.1 | **Priority:** P0

**Files to Modify:**
- `tsx/apps/web/src/app/dashboard/clip-radar/page.tsx`

**Requirements:**
- Redirect to /dashboard/intel?tab=clips
- Show redirect toast

**Acceptance Criteria:**
- [ ] Redirect works
- [ ] Toast shows

---

## Phase 5: Polish & Non-Regression Testing (Week 3)

### Task 5.1: Loading Skeletons
**Time:** 1 hour | **Dependencies:** All Phase 1-4 | **Priority:** P1

**Files to Create/Modify:**
- Various skeleton components as needed

**Requirements:**
- Dashboard overview skeletons
- Tab content loading states
- Consistent shimmer animation
- No layout shift

**Acceptance Criteria:**
- [ ] All async content has skeleton
- [ ] No layout shift on load
- [ ] Animations smooth

---

### Task 5.2: Empty States
**Time:** 45 min | **Dependencies:** All Phase 1-4 | **Priority:** P1

**Files to Create/Modify:**
- Various empty state components as needed

**Requirements:**
- Intel Preview empty state
- Activity feed empty state
- Helpful messaging
- CTAs where appropriate

**Acceptance Criteria:**
- [ ] All empty states helpful
- [ ] CTAs work
- [ ] Consistent styling

---

### Task 5.3: Error States
**Time:** 45 min | **Dependencies:** All Phase 1-4 | **Priority:** P1

**Files to Create/Modify:**
- Various error state components as needed

**Requirements:**
- Intel Preview error state
- Tab content error states
- Retry buttons
- Helpful error messages

**Acceptance Criteria:**
- [ ] All errors handled gracefully
- [ ] Retry works
- [ ] Messages helpful

---

### Task 5.4: Accessibility Audit
**Time:** 1 hour | **Dependencies:** All Phase 1-4 | **Priority:** P1

**Requirements:**
- Tab navigation keyboard accessible
- Screen reader announces tab changes
- Focus management correct
- Color contrast meets WCAG AA
- Reduced motion support

**Acceptance Criteria:**
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] No accessibility violations

---

### Task 5.5: Performance Check
**Time:** 45 min | **Dependencies:** All Phase 1-4 | **Priority:** P1

**Requirements:**
- Tab content lazy loaded
- No unnecessary re-renders
- Bundle size check
- Lighthouse score maintained

**Acceptance Criteria:**
- [ ] Lazy loading works
- [ ] No performance regression
- [ ] Bundle size acceptable

---

### Task 5.6: Non-Regression Testing - API Endpoints
**Time:** 2 hours | **Dependencies:** All Phase 1-4 | **Priority:** P0

**Requirements:**
- Verify all 122 endpoints still work
- Test from each consolidated page
- Document any issues

**Test Checklist:**
- [ ] Auth endpoints (14) ✓
- [ ] Brand Kit endpoints (20) ✓
- [ ] Generation endpoints (8) ✓
- [ ] Coach endpoints (6) ✓
- [ ] Asset endpoints (5) ✓
- [ ] Community endpoints (17) ✓
- [ ] Promo endpoints (6) ✓
- [ ] Clip Radar endpoints (9) ✓
- [ ] Trends endpoints (13) ✓
- [ ] Playbook endpoints (5) ✓
- [ ] Thumbnail Intel endpoints (3) ✓
- [ ] Intel endpoints (8) ✓
- [ ] Vibe Branding endpoints (3) ✓
- [ ] Profile Creator endpoints (6) ✓
- [ ] Aura Lab endpoints (7) ✓

**Acceptance Criteria:**
- [ ] All endpoints respond correctly
- [ ] No 500 errors
- [ ] No 404 errors

---

### Task 5.7: Non-Regression Testing - UI Flows
**Time:** 2 hours | **Dependencies:** All Phase 1-4 | **Priority:** P0

**Requirements:**
- Test all user flows end-to-end
- Verify redirects work
- Check all tabs function
- Test on mobile

**Test Checklist:**
- [ ] Dashboard loads correctly
- [ ] Create flow (all 3 tabs) works
- [ ] Community hub (all 3 tabs) works
- [ ] All redirects work
- [ ] Toast notifications show
- [ ] Mobile navigation works
- [ ] Keyboard shortcuts work

**Acceptance Criteria:**
- [ ] All flows work
- [ ] No console errors
- [ ] No broken links

---

### Task 5.8: Documentation Update
**Time:** 1 hour | **Dependencies:** All Phase 1-4 | **Priority:** P2

**Files to Update:**
- `AURASTREAM_MASTER_SCHEMA.md`
- `docs/FRONTEND_EXPERIENCE_REPORT.md`

**Requirements:**
- Document new navigation structure
- Update page routes
- Document redirects
- Update component structure

**Acceptance Criteria:**
- [ ] Documentation accurate
- [ ] Navigation documented
- [ ] Redirects documented

---

## Phase 6: Property Tests (Week 3)

### Task 6.1: Tab State Property Tests
**Time:** 1.5 hours | **Dependencies:** All Phase 1-4 | **Priority:** P0

**Files to Create:**
- `backend/tests/properties/test_ux_consolidation.py`

**Requirements:**
- Property tests using Hypothesis for tab state management
- Test tab URL roundtrip (encode/decode)
- Test invalid tab defaults to first tab
- Test tab state persistence

**Test Cases:**
```python
@given(st.sampled_from(VALID_CREATE_TABS))
def test_create_tab_url_roundtrip(tab: str):
    """Tab value survives URL encoding/decoding."""
    url = f"/dashboard/create?tab={tab}"
    parsed_tab = url.split('tab=')[1].split('&')[0]
    assert parsed_tab == tab

@given(st.text(min_size=1, max_size=50))
def test_invalid_tab_defaults_to_first(tab: str):
    """Invalid tab values should default to first tab."""
    if tab not in VALID_CREATE_TABS:
        resolved_tab = 'templates'
        assert resolved_tab == 'templates'
```

**Acceptance Criteria:**
- [ ] All property tests pass with 100+ examples
- [ ] Edge cases covered (empty, special chars, unicode)
- [ ] Stateful tests for tab navigation

---

### Task 6.2: Redirect Property Tests
**Time:** 1 hour | **Dependencies:** Task 6.1 | **Priority:** P0

**Files to Modify:**
- `backend/tests/properties/test_ux_consolidation.py`

**Requirements:**
- Property tests for redirect behavior
- Test all redirects point to valid destinations
- Test query param preservation through redirects

**Test Cases:**
```python
@given(st.sampled_from(list(REDIRECT_MAP.keys())))
def test_redirect_preserves_destination_structure(source: str):
    """Redirects always point to valid destinations."""
    destination = REDIRECT_MAP[source]
    assert destination.startswith('/')
    assert 'tab=' in destination

@given(st.sampled_from(list(REDIRECT_MAP.keys())), st.text())
def test_redirect_preserves_query_params(source: str, extra_param: str):
    """Redirects should preserve additional query params."""
    # Test implementation
```

**Acceptance Criteria:**
- [ ] All redirect paths tested
- [ ] Query param preservation verified
- [ ] No broken redirect chains

---

### Task 6.3: URL Param Property Tests
**Time:** 1 hour | **Dependencies:** Task 6.1 | **Priority:** P1

**Files to Modify:**
- `backend/tests/properties/test_ux_consolidation.py`

**Requirements:**
- Property tests for URL param handling
- Test param order independence
- Test special character handling

**Test Cases:**
```python
@given(st.lists(st.tuples(st.text(), st.text()), max_size=5))
def test_url_params_order_independent(params: list):
    """URL params should work regardless of order."""
    # Build URL with params in different orders
    # Verify same result
```

**Acceptance Criteria:**
- [ ] Param order doesn't affect behavior
- [ ] Special characters handled correctly
- [ ] Empty params handled gracefully

---

### Task 6.4: Stateful Tab Navigation Tests
**Time:** 1.5 hours | **Dependencies:** Task 6.1 | **Priority:** P1

**Files to Modify:**
- `backend/tests/properties/test_ux_consolidation.py`

**Requirements:**
- Stateful property tests using Hypothesis RuleBasedStateMachine
- Model tab navigation as state machine
- Test invariants hold across all state transitions

**Test Cases:**
```python
class TabNavigationMachine(RuleBasedStateMachine):
    def __init__(self):
        self.current_tab = 'templates'
        self.tab_history = ['templates']
    
    @rule(tab=st.sampled_from(VALID_CREATE_TABS))
    def switch_tab(self, tab: str):
        self.current_tab = tab
        self.tab_history.append(tab)
    
    @invariant()
    def tab_always_valid(self):
        assert self.current_tab in VALID_CREATE_TABS
```

**Acceptance Criteria:**
- [ ] State machine tests pass
- [ ] All invariants hold
- [ ] No invalid states reachable

---

## Task Summary

| Phase | Tasks | Time | Focus |
|-------|-------|------|-------|
| Phase 1 | 6 | ~8 hours | Dashboard 2.0 |
| Phase 2 | 8 | ~8 hours | Unified Create |
| Phase 3 | 7 | ~7 hours | Community Hub |
| Phase 4 | 8 | ~5 hours | Navigation |
| Phase 5 | 8 | ~10 hours | Polish & Testing |
| Phase 6 | 4 | ~5 hours | Property Tests |
| **Total** | **41** | **~43 hours** | |

With buffer for reviews and iteration: **3 weeks**

---

## Sub-Agent Execution Strategy

### Parallel Execution Groups

**Week 1 (Days 1-3):**
- Agent A: Task 1.1 → 1.2 → 1.3 (Dashboard components)
- Agent B: Task 2.1 → 2.2 → 2.3 (Create extraction)
- Agent C: Task 4.1 → 4.4 (Utilities)

**Week 1 (Days 4-5):**
- Agent A: Task 1.4 → 1.5 → 1.6 (Dashboard assembly)
- Agent B: Task 2.4 → 2.5 → 2.6 (Create assembly)
- Agent C: Task 2.7 → 2.8 (Create redirects)

**Week 2 (Days 1-3):**
- Agent A: Task 3.1 → 3.2 → 3.3 (Community extraction)
- Agent B: Task 3.4 → 3.5 → 3.6 (Community assembly)
- Agent C: Task 4.2 → 4.3 (Navigation)

**Week 2 (Days 4-5):**
- Agent A: Task 3.7 (Community redirect)
- Agent B: Task 4.5 → 4.6 → 4.7 → 4.8 (Remaining redirects)
- Agent C: Task 5.1 → 5.2 → 5.3 (Polish)

**Week 3 (Days 1-3):**
- Agent A: Task 5.4 → 5.5 (Accessibility, Performance)
- Agent B: Task 5.6 (API regression testing)
- Agent C: Task 5.7 (UI regression testing)
- Agent D: Task 6.1 → 6.2 (Property tests - Tab, Redirect)

**Week 3 (Days 4-5):**
- Agent A: Task 5.8 (Documentation)
- Agent B: Task 6.3 → 6.4 (Property tests - URL, Stateful)
- Agent C: Final integration testing

---

## Critical Non-Regression Rules

1. **NEVER modify existing component internals** - Only wrap them
2. **NEVER modify existing API endpoints** - They must work unchanged
3. **NEVER modify existing database tables** - No schema changes
4. **NEVER modify existing React Query hooks** - They must work unchanged
5. **All redirects must be soft (307)** - Not permanent
6. **All old URLs must continue to work** - Via redirects
7. **Run existing test suite after each phase**
8. **Manual verification of all flows before merge**
9. **Property tests must pass with 500+ examples before merge**

---

## Rollback Plan

If issues are discovered:
1. Revert navigation changes (Task 4.2)
2. Revert page changes (Tasks 1.6, 2.6, 3.6)
3. Remove redirect pages (Tasks 2.7, 2.8, 3.7, 4.6-4.8)
4. All existing pages remain functional

---

## Verified Endpoint Counts (122 total)

| Module | Endpoints | Status |
|--------|-----------|--------|
| Auth | 14 | ✅ Verified |
| Brand Kits | 20 | ✅ Verified |
| Generation | 8 | ✅ Verified |
| Coach | 6 | ✅ Verified |
| Assets | 5 | ✅ Verified |
| Community | 17 | ✅ Verified |
| Promo | 6 | ✅ Verified |
| Clip Radar | 9 | ✅ Verified |
| Trends | 13 | ✅ Verified |
| Playbook | 5 | ✅ Verified |
| Thumbnail Intel | 3 | ✅ Verified |
| Intel | 8 | ✅ Verified |
| Vibe Branding | 3 | ✅ Verified |
| Profile Creator | 6 | ✅ Verified |
| Aura Lab | 7 | ✅ Verified |
| **Total** | **122** | ✅ |

---

*Tasks Version: 1.1*  
*Created: December 31, 2025*  
*Updated: December 31, 2025 - Added Phase 6 property tests, verified endpoint counts*  
*Status: Ready for Implementation*
