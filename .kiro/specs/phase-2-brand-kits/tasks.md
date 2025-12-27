# Phase 2: Brand Kit Management — Implementation Tasks

## Overview

This task list implements the Brand Kit system for Streamer Studio. All implementation is delegated to sub-agents with the orchestrator enforcing compliance, patterns, and quality.

**Master Schema Reference:** `.kiro/specs/streamer-studio-master-schema/`
**Phase Duration:** Week 3
**Dependencies:** Phase 1 Authentication (COMPLETE ✅)
**Delegation Strategy:** Parallel sub-agent execution for maximum efficiency

---

## Pre-Implementation Checklist

Before starting, verify Phase 1 completion:
- [x] All auth endpoints functional
- [x] JWT authentication working
- [x] 169 tests passing across all platforms
- [x] Rate limiting and audit logging active

---

## Parallel Agent Execution Strategy

### Wave 1: Backend Foundation (Parallel)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WAVE 1 - BACKEND                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Agent 1: Schemas & Validation          │  Agent 2: Service Layer           │
│  ─────────────────────────────────      │  ─────────────────────────────    │
│  • Pydantic schemas (brand_kit.py)      │  • BrandKitService class          │
│  • Hex color validation                 │  • CRUD operations                │
│  • Font validation                      │  • Activation logic               │
│  • Error classes                        │  • Database queries               │
│  Duration: ~10 min                      │  Duration: ~15 min                │
└─────────────────────────────────────────┴───────────────────────────────────┘
```

### Wave 2: Backend Routes & Tests (Parallel, after Wave 1)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WAVE 2 - BACKEND                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Agent 3: API Routes                    │  Agent 4: Property & Unit Tests   │
│  ─────────────────────────────────      │  ─────────────────────────────    │
│  • brand_kits.py routes                 │  • Property 4: Hex validation     │
│  • All 7 endpoints                      │  • Property 5: Serialization      │
│  • Request/response handling            │  • Property 6: Color bounds       │
│  • Error responses                      │  • Unit tests for endpoints       │
│  Duration: ~15 min                      │  Duration: ~15 min                │
└─────────────────────────────────────────┴───────────────────────────────────┘
```

### Wave 3: Frontend (Parallel, after Wave 2)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WAVE 3 - FRONTEND                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Agent 5: TSX Types & Hooks   │  Agent 6: TSX UI        │  Agent 7: Swift   │
│  ─────────────────────────    │  ─────────────────────  │  ───────────────  │
│  • TypeScript types           │  • Web brand kit page   │  • BrandKitVM     │
│  • API client extension       │  • Mobile brand kit     │  • List/Editor    │
│  • TanStack Query hooks       │  • Color picker         │  • Views          │
│  • Zustand store              │  • Font selector        │  • Tests          │
│  Duration: ~10 min            │  Duration: ~15 min      │  Duration: ~15 min│
└───────────────────────────────┴─────────────────────────┴───────────────────┘
```

### Wave 4: Integration & Verification (Sequential)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WAVE 4 - VERIFICATION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Orchestrator: Run all tests, verify integration, fix issues                 │
│  • Backend: pytest (property + unit + integration)                           │
│  • TSX: vitest                                                               │
│  • Swift: swift test                                                         │
│  • Cross-platform verification                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tasks

### Section 1: Backend Schemas & Validation

- [x] 1. Implement Brand Kit Pydantic Schemas ✅
  - [x] 1.1 Create `backend/api/schemas/brand_kit.py`
  - [x] 1.2 Implement hex color validation
  - [x] 1.3 Implement font validation
  - [x] 1.4 Create brand kit exception classes

---

### Section 2: Backend Brand Kit Service

- [x] 2. Implement Brand Kit Service ✅
  - [x] 2.1 Create `backend/services/brand_kit_service.py`
  - [x] 2.2 Implement create() method
  - [x] 2.3 Implement get() method
  - [x] 2.4 Implement list() method
  - [x] 2.5 Implement update() method
  - [x] 2.6 Implement delete() method
  - [x] 2.7 Implement activate() method
  - [x] 2.8 Implement get_active() method

---

### Section 3: Backend API Routes

- [x] 3. Implement Brand Kit API Routes ✅
  - [x] 3.1 Create `backend/api/routes/brand_kits.py`
  - [x] 3.2 Implement GET /brand-kits
  - [x] 3.3 Implement POST /brand-kits
  - [x] 3.4 Implement GET /brand-kits/{id}
  - [x] 3.5 Implement PUT /brand-kits/{id}
  - [x] 3.6 Implement DELETE /brand-kits/{id}
  - [x] 3.7 Implement POST /brand-kits/{id}/activate
  - [x] 3.8 Register router in main.py

---

### Section 4: Backend Property Tests

- [x] 4. Implement Property Tests ✅
  - [x] 4.1 Create `backend/tests/properties/test_brand_kit_properties.py`
  - [x] 4.2 Property 4: Hex Color Validation (100+ iterations)
  - [x] 4.3 Property 5: Brand Kit Serialization Round-Trip (100+ iterations)
  - [x] 4.4 Property 6: Brand Kit Color Array Bounds (100+ iterations)

---

### Section 5: Backend Unit Tests

- [x] 5. Implement Unit Tests ✅
  - [x] 5.1 Create `backend/tests/unit/test_brand_kit_endpoints.py`
  - [x] 5.2 Test create brand kit
  - [x] 5.3 Test get brand kit
  - [x] 5.4 Test list brand kits
  - [x] 5.5 Test update brand kit
  - [x] 5.6 Test delete brand kit
  - [x] 5.7 Test activate brand kit

---

### Section 6: TSX Types & API Client

- [x] 6. Implement TSX Brand Kit Types ✅
  - [x] 6.1 Create `tsx/packages/api-client/src/types/brandKit.ts`
  - [x] 6.2 Extend API client in `tsx/packages/api-client/src/client.ts`

---

### Section 7: TSX Hooks & Store

- [x] 7. Implement TSX Brand Kit Hooks ✅
  - [x] 7.1 Create `tsx/packages/api-client/src/hooks/useBrandKits.ts`
  - [x] 7.2 Create `tsx/packages/shared/src/stores/brandKitStore.ts`

---

### Section 8: TSX Web UI

- [x] 8. Implement TSX Web Brand Kit Pages ✅
  - [x] 8.1 Create `tsx/apps/web/src/app/(dashboard)/brand-kits/page.tsx`
  - [x] 8.2 Create `tsx/apps/web/src/app/(dashboard)/brand-kits/[id]/page.tsx`
  - [x] 8.3 Create `tsx/apps/web/src/app/(dashboard)/layout.tsx` (Dashboard layout with sidebar)

---

### Section 9: TSX Mobile UI

- [x] 9. Implement TSX Mobile Brand Kit Screens ✅
  - [x] 9.1 Create `tsx/apps/mobile/src/app/(tabs)/brand-kits/index.tsx`
  - [x] 9.2 Create `tsx/apps/mobile/src/app/(tabs)/_layout.tsx` (Tabs layout)
  - [x] 9.3 Create `tsx/apps/mobile/src/app/(tabs)/index.tsx` (Dashboard placeholder)
  - [x] 9.4 Create `tsx/apps/mobile/src/app/(tabs)/settings.tsx` (Settings placeholder)

---

### Section 10: Swift Implementation

- [x] 10. Implement Swift Brand Kit Feature ✅
  - [x] 10.1 Create `swift/Sources/StreamerStudioCore/Features/BrandKit/BrandKitModels.swift`
  - [x] 10.2 Create `swift/Sources/StreamerStudio/Features/BrandKit/BrandKitViewModel.swift`
  - [x] 10.3 Create `swift/Sources/StreamerStudio/Features/BrandKit/BrandKitListView.swift`
  - [x] 10.4 Create `swift/Sources/StreamerStudio/Features/BrandKit/BrandKitEditorView.swift`

---

### Section 11: Swift Tests

- [x] 11. Implement Swift Brand Kit Tests ✅
  - [x] 11.1 Create `swift/Tests/StreamerStudioTests/BrandKitTests.swift`

---

### Section 12: Verification Gate

- [x] 12. Checkpoint - Phase 2 Verification Gate ✅

  - [x] 12.1 Property Tests (100+ iterations each)
    - [x] Property 4: Hex Color Validation — PASS ✅
    - [x] Property 5: Brand Kit Serialization Round-Trip — PASS ✅
    - [x] Property 6: Brand Kit Color Array Bounds — PASS ✅
  
  - [x] 12.2 Unit Tests
    - [x] All brand kit endpoints tested — PASS ✅
    - [x] All service functions tested — PASS ✅
    - [x] Coverage >= 80% — PASS ✅
  
  - [x] 12.3 Integration Tests
    - [x] Create → Read → Update → Delete flow — PASS ✅
    - [x] Create → Activate → Verify state — PASS ✅
    - [x] Multiple kits → Activate one → Only one active — PASS ✅
  
  - [x] 12.4 Platform Verification
    - [x] TSX web: Brand kit list and editor functional ✅
    - [x] TSX mobile: Brand kit list functional ✅
    - [x] Swift: Brand kit list and editor functional ✅
  
  - [x] 12.5 Sign-off
    - [x] All tests passing ✅
    - [x] No critical bugs ✅
    - [x] Ready to proceed to Phase 3 ✅

---

## Test Requirements Summary

| Test Type | Count | Status |
|-----------|-------|--------|
| Backend Property Tests | 36 | ✅ PASS |
| Backend Unit Tests | 31 | ✅ PASS |
| Backend Integration Tests | 63 | ✅ PASS |
| TSX Tests | 72 | ✅ PASS |
| Swift Tests | 41 | ✅ PASS |
| **Total** | **243** | ✅ **ALL PASS** |

---

## Execution Log

### Wave 1 Status
- [x] Agent 1 (Schemas): COMPLETE ✅
- [x] Agent 2 (Service): COMPLETE ✅

### Wave 2 Status
- [x] Agent 3 (Routes): COMPLETE ✅
- [x] Agent 4 (Tests): COMPLETE ✅

### Wave 3 Status
- [x] Agent 5 (TSX Types/Hooks): COMPLETE ✅
- [x] Agent 6 (TSX UI): COMPLETE ✅
- [x] Agent 7 (Swift): COMPLETE ✅

### Wave 4 Status
- [x] Verification: COMPLETE ✅

---

## Phase 2 Completion Summary

**Completed:** December 24, 2025

### Deliverables:
1. **Backend** (130 tests passing)
   - Pydantic schemas with hex color and font validation
   - BrandKitService with full CRUD + activation logic
   - 7 API endpoints registered in main.py
   - Property tests (36) + Unit tests (31) + Integration tests (63)

2. **TSX Web** (72 tests passing)
   - Dashboard layout with sidebar navigation
   - Brand kit list page with cards, delete, activate
   - Brand kit editor page with color pickers, font selectors

3. **TSX Mobile**
   - Tabs layout with bottom navigation
   - Brand kit list with FlatList, FAB, pull-to-refresh
   - Long-press actions for delete/activate

4. **Swift** (41 tests passing)
   - BrandKitModels with Codable conformance
   - BrandKitViewModel with async operations
   - BrandKitListView and BrandKitEditorView

