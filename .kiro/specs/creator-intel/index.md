# 🎯 Creator Intel Specification

## Overview

Creator Intel is a unified intelligence dashboard that consolidates Clip Radar, Trends, Playbook, and Thumbnail Intel into a single, customizable command center.

**Key Principle:** All existing functionality is preserved. New code is purely additive.

## Specification Documents

| Document | Description |
|----------|-------------|
| [requirements.md](./requirements.md) | User stories, API design, non-regression requirements |
| [design.md](./design.md) | Visual design spec, enterprise-grade components |
| [tasks.md](./tasks.md) | 33 implementation tasks for sub-agent orchestration |

---

## Quick Reference

### What's New
- Single "Creator Intel" page at `/dashboard/intel`
- Category subscriptions (multi-select)
- Customizable panel layout (drag-drop)
- Global category filter
- Today's Mission AI recommendation
- User activity tracking for personalization

### What's Preserved (Non-Regression)
- All 30 existing API endpoints
- All 14 existing database tables
- All 31 existing React Query hooks
- Old pages accessible via direct URL

### Key UX Decisions
- **No panel pinning** - Global filter applies to all panels (simpler UX)
- **Today's Mission always first** - Not draggable, always visible
- **Mobile: no drag** - Stacked layout with reorder buttons

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| UI Components | Radix UI primitives |
| Animations | Framer Motion |
| Drag-Drop | react-grid-layout |
| State | Zustand + React Query |
| Charts | Recharts |
| Icons | Lucide |

---

## Tier Limits

| Feature | Free | Pro | Studio |
|---------|------|-----|--------|
| Categories | 3 | 10 | ∞ |
| Panels | 6 | 12 | ∞ |
| Today's Mission | Basic | Full | Full + History |
| Activity Tracking | ❌ | ✅ | ✅ |

---

## Timeline

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1 | Week 1-2 | Foundation (DB, API, basic page) |
| Phase 2 | Week 2-3 | Panel system (drag-drop, library) |
| Phase 3 | Week 3-4 | Panel components (12 panels) |
| Phase 4 | Week 4-5 | Intelligence layer (mission AI) |
| Phase 5 | Week 5-6 | Polish (animations, mobile, a11y) |
| Phase 6 | Week 6-7 | Integration & non-regression testing |

**Total: 6-7 weeks**

---

## File Structure

```
NEW FILES:
tsx/apps/web/src/
├── app/dashboard/intel/page.tsx
├── components/intel/
│   ├── IntelDashboard.tsx
│   ├── IntelHeader.tsx
│   ├── PanelGrid.tsx
│   ├── PanelCard.tsx
│   ├── PanelLibrary.tsx
│   ├── CategoryPicker.tsx
│   ├── FilterDropdown.tsx
│   └── panels/ (12 panel components)
└── stores/intelStore.ts

backend/
├── api/routes/intel.py (8 new endpoints)
├── services/intel/
│   ├── service.py
│   ├── mission_generator.py
│   ├── activity_tracker.py
│   └── preferences_repository.py
└── database/migrations/048_creator_intel.sql

UNCHANGED FILES:
- All existing clip_radar, trends, playbook, thumbnail_intel files
- All existing hooks in api-client
- All existing database tables
```

---

## Getting Started

1. Review [requirements.md](./requirements.md) for full context
2. Review [design.md](./design.md) for visual specifications
3. Start with **Task 1.1: Database Migration** from [tasks.md](./tasks.md)

---

*Spec Version: 1.1*  
*Created: December 30, 2025*  
*Status: Ready for Implementation*
