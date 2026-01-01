# 🎯 UX Consolidation 2025 Specification

## Overview

A comprehensive frontend architecture consolidation that reduces navigation sprawl from 14 to 9 modules while preserving 100% of existing functionality. This spec modernizes the Dashboard, unifies creation flows, and consolidates intelligence modules.

**Key Principle:** Zero regression. All existing endpoints, tables, hooks, and functionality remain intact. Changes are purely organizational and additive.

## Specification Documents

| Document | Description |
|----------|-------------|
| [requirements.md](./requirements.md) | Non-regression requirements, API preservation, user stories, 10 gap resolutions |
| [design.md](./design.md) | Visual design spec, component patterns, mobile wireframes (375px+) |
| [tasks.md](./tasks.md) | 41 implementation tasks including property tests with Hypothesis |

---

## Quick Reference

### What's Changing

| Current State | New State | Impact |
|---------------|-----------|--------|
| 14 nav items | 9 nav items | 36% reduction in cognitive load |
| Create + Quick Create | Unified Create with tabs | Single entry point |
| Vibe Branding (nav item) | Brand Studio feature | Removes redundancy |
| Promo Board (top-level) | Community tab | Logical grouping |
| Trends/Playbook/Clip Radar | Creator Intel tabs | Already in progress |
| Basic Dashboard | Modernized Dashboard 2.0 | Enhanced UX |

### What's Preserved (Non-Regression)

- **All 93+ existing API endpoints** - Zero modifications (VERIFIED)
- **All 48+ existing database tables** - Zero modifications  
- **All 60+ existing React Query hooks** - Zero modifications
- **All existing pages** - Accessible via direct URL
- **All existing components** - Reused, not replaced

### Key UX Decisions

1. **Unified Create Flow** - Tabs: Templates | Custom | AI Coach
2. **Dashboard 2.0** - Intel preview, quick actions, personalized content
3. **Community Hub** - Gallery + Creators + Promo Board tabs
4. **Brand Studio** - Vibe Branding as inline feature, not separate nav
5. **Creator Intel** - Absorbs Trends, Playbook, Clip Radar (already in progress)

### Gap Resolutions (10 Critical Issues Addressed)

1. ✅ **Intel Preview Dependency** - Fallback strategy when Creator Intel delayed
2. ✅ **Activity Feed Schema** - Defined data sources and types
3. ✅ **Mobile Navigation** - 375px wireframes, touch targets, scroll behavior
4. ✅ **Vibe Branding Button** - Explicit placement in Brand Studio header
5. ✅ **Toast Copy** - User-centric messages ("moved to X → Y tab")
6. ✅ **Accessibility** - WCAG 2.1 AA tab keyboard navigation
7. ✅ **Loading Strategy** - Timeouts, fallbacks, performance targets
8. ✅ **Analytics Tracking** - Event contract for measuring success
9. ✅ **Promo Board Audience** - Clarified creator-facing, discoverability plan
10. ✅ **Testing Strategy** - Detailed checklist + Hypothesis property tests

---

## Architecture Overview

### Navigation Structure (Before → After)

```
BEFORE (14 items):                    AFTER (9 items):
─────────────────                     ────────────────
MAIN                                  MAIN
├── Overview                          ├── Overview (Dashboard 2.0)
├── Quick Create ←─────────┐          ├── Create (unified)
├── Create ←───────────────┤          ├── Brand Studio
├── Brand Studio           │          ├── Asset Library
├── Asset Library          │          └── Community (+ Promo)
├── Community              │
└── Promo Board ←──────────┤          TOOLS
                           │          ├── Creator Intel (unified)
TOOLS                      │          ├── Profile Creator
├── Prompt Coach ←─────────┘          └── Aura Lab
├── Profile Creator
├── Vibe Branding ←────────┐          ACCOUNT
├── Aura Lab               │          ├── Settings
├── Trends ←───────────────┤          └── Analytics (admin)
├── Playbook ←─────────────┤
└── Clip Radar ←───────────┘

ACCOUNT
├── Settings
└── Analytics (admin)
```

### Module Consolidation Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UNIFIED CREATE FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  /dashboard/create                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [Templates]        [Custom]           [AI Coach]                    │   │
│  │                                                                      │   │
│  │  Quick Create       Full Create        Prompt Coach                  │   │
│  │  Wizard             Flow               Integration                   │   │
│  │  (existing)         (existing)         (existing)                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Entry Points:                                                              │
│  - /dashboard/create → Default to Templates tab                             │
│  - /dashboard/create?tab=custom → Custom tab                                │
│  - /dashboard/create?tab=coach → Coach tab                                  │
│  - /dashboard/quick-create → Redirect to ?tab=templates                     │
│  - /dashboard/coach → Redirect to ?tab=coach                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMMUNITY HUB                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  /community                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [Gallery]          [Creators]         [Promo Board]                 │   │
│  │                                                                      │   │
│  │  Inspiration        Creator            $1 Messages                   │   │
│  │  Gallery            Spotlight          (existing)                    │   │
│  │  (existing)         (existing)                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Entry Points:                                                              │
│  - /community → Default to Gallery tab                                      │
│  - /community?tab=creators → Creators tab                                   │
│  - /community?tab=promo → Promo Board tab                                   │
│  - /promo → Redirect to /community?tab=promo                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         BRAND STUDIO                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  /dashboard/brand-kits                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [+ New Brand Kit]  [Import from Image]                              │   │
│  │                                                                      │   │
│  │  Brand Kit Grid     Vibe Branding                                    │   │
│  │  (existing)         Modal (existing)                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Changes:                                                                   │
│  - Remove "Vibe Branding" from sidebar nav                                  │
│  - Keep "Import from Image" button in Brand Studio                          │
│  - /dashboard/brand-kits?vibe=true still works                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| UI Components | Radix UI primitives |
| Animations | Framer Motion |
| State | Zustand + React Query |
| Routing | Next.js App Router |
| Icons | Lucide |

---

## Tier Considerations

No tier changes. All consolidation is UX-only:
- Free users see same features, better organized
- Pro/Studio users see same features, better organized
- No new tier gates introduced

---

## Timeline

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1 | Week 1 | Dashboard 2.0 Modernization |
| Phase 2 | Week 1-2 | Unified Create Flow |
| Phase 3 | Week 2 | Community Hub Consolidation |
| Phase 4 | Week 2-3 | Navigation & Redirects |
| Phase 5 | Week 3 | Polish & Non-Regression Testing |

**Total: 3 weeks**

---

## File Structure

```
MODIFIED FILES:
tsx/apps/web/src/
├── app/dashboard/
│   ├── page.tsx                    # Dashboard 2.0
│   ├── create/page.tsx             # Unified Create (tabs)
│   ├── quick-create/page.tsx       # Redirect to create?tab=templates
│   └── coach/page.tsx              # Redirect to create?tab=coach
├── app/community/
│   └── page.tsx                    # Community Hub (tabs)
├── app/promo/
│   └── page.tsx                    # Redirect to community?tab=promo
├── components/dashboard/
│   ├── layout/Sidebar.tsx          # Updated nav items
│   └── DashboardOverview.tsx       # New dashboard content
├── components/create/
│   └── UnifiedCreateFlow.tsx       # Tab container
└── components/community/
    └── CommunityHub.tsx            # Tab container

NEW FILES:
tsx/apps/web/src/
├── components/dashboard/
│   ├── overview/
│   │   ├── IntelPreview.tsx        # Mini intel widget
│   │   ├── QuickActionsGrid.tsx    # Modernized quick actions
│   │   ├── RecentActivity.tsx      # Enhanced activity feed
│   │   └── PersonalizedTips.tsx    # AI-powered suggestions
│   └── DashboardOverview.tsx       # Main overview component
├── components/create/
│   ├── CreateTabs.tsx              # Tab navigation
│   └── CreateMethodSelector.tsx    # Method cards
└── components/community/
    ├── CommunityTabs.tsx           # Tab navigation
    └── PromoTab.tsx                # Promo board wrapper

UNCHANGED FILES (100% preserved):
- All existing API routes
- All existing database migrations
- All existing React Query hooks
- All existing component implementations
- Quick Create wizard internals
- Full Create flow internals
- Prompt Coach internals
- Promo Board internals
- Community Gallery internals
- Vibe Branding modal
```

---

## Getting Started

1. Review [requirements.md](./requirements.md) for non-regression requirements
2. Review [design.md](./design.md) for visual specifications
3. Start with **Task 1.1: Dashboard 2.0 Overview Component** from [tasks.md](./tasks.md)

---

## Dependencies

This spec depends on:
- **Creator Intel spec** (in progress) - Intel consolidation already underway
- **Existing component library** - Reuses all existing components

This spec is blocked by:
- Nothing - can start immediately

---

*Spec Version: 1.1*  
*Created: December 31, 2025*  
*Updated: December 31, 2025 - Added 10 gap resolutions, property tests, verified 93+ endpoints*  
*Status: Ready for Implementation*
