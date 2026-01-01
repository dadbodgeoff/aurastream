# Implementation Tasks: [Feature Name]

## Overview

This document breaks down the implementation into ordered phases and tasks. Each task should be completable in a single AI session and include its own tests.

## Phase 1: [Foundation/Setup] 

Start with the lowest-level components that have no dependencies.

### Task 1.1: [Task Name]
- [ ] Create `path/to/file.ts`
- [ ] Implement [specific functionality]
- [ ] Add [specific functionality]
- [ ] Export from `path/to/index.ts`
- [ ] Write unit test for [functionality]

### Task 1.2: [Task Name]
- [ ] Create `path/to/file.ts`
- [ ] Implement [specific functionality]
- [ ] Handle edge case: [description]
- [ ] Handle edge case: [description]
- [ ] Export from `path/to/index.ts`
- [ ] Write unit test for [functionality]

### Task 1.3: [Task Name]
- [ ] ...

## Phase 2: [Core Components]

Build on Phase 1 foundations.

### Task 2.1: [Task Name]
- [ ] Create `path/to/Component.tsx`
- [ ] Implement [UI/functionality]
- [ ] Integrate [hook from Phase 1]
- [ ] Add proper TypeScript types
- [ ] Add accessibility attributes (ARIA)
- [ ] Write unit test for [functionality]

### Task 2.2: [Task Name]
- [ ] ...

## Phase 3: [Integration]

Connect components to the rest of the system.

### Task 3.1: [Task Name]
- [ ] Modify `path/to/existing/file.ts`
- [ ] Add [new functionality]
- [ ] Maintain backward compatibility
- [ ] Update existing tests if needed
- [ ] Write integration test for [flow]

### Task 3.2: [Task Name]
- [ ] ...

## Phase 4: [Backend] (if applicable)

### Task 4.1: Database Migration
- [ ] Create `backend/database/migrations/XXX_feature_name.sql`
- [ ] Define table schema
- [ ] Add indexes for common queries
- [ ] Add RLS policies if using Supabase
- [ ] Test migration up and down

### Task 4.2: API Schema
- [ ] Create `backend/api/schemas/feature_name.py`
- [ ] Define Pydantic request models
- [ ] Define Pydantic response models
- [ ] Add validation rules
- [ ] Write schema tests

### Task 4.3: Service Layer
- [ ] Create `backend/services/feature_name_service.py`
- [ ] Implement core business logic
- [ ] Add error handling
- [ ] Write unit tests with mocked dependencies
- [ ] Write property tests for invariants

### Task 4.4: API Routes
- [ ] Create `backend/api/routes/feature_name.py`
- [ ] Implement endpoints per design doc
- [ ] Add authentication middleware
- [ ] Add rate limiting if needed
- [ ] Write integration tests

## Phase 5: [Frontend API Integration]

### Task 5.1: API Client Types
- [ ] Create `tsx/packages/api-client/src/types/featureName.ts`
- [ ] Define TypeScript interfaces (camelCase)
- [ ] Match backend schemas exactly

### Task 5.2: API Client Hooks
- [ ] Create `tsx/packages/api-client/src/hooks/useFeatureName.ts`
- [ ] Implement TanStack Query hooks
- [ ] Add snake_case ↔ camelCase transformation
- [ ] Handle loading/error states
- [ ] Export from index

## Phase 6: [Testing & Validation]

### Task 6.1: Build Verification
- [ ] TypeScript compilation passes (`npx tsc --noEmit`)
- [ ] Production build succeeds (`npm run build`)
- [ ] No console errors in browser

### Task 6.2: Unit Test Coverage
- [ ] All hooks have unit tests
- [ ] All components have unit tests
- [ ] All services have unit tests
- [ ] Run full test suite

### Task 6.3: Integration Testing
- [ ] Test full user flow end-to-end
- [ ] Test error scenarios
- [ ] Test edge cases from requirements

### Task 6.4: Accessibility Audit
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Focus management is correct
- [ ] Color contrast meets WCAG AA

## Completion Checklist

- [ ] All Phase 1 tasks complete
- [ ] All Phase 2 tasks complete
- [ ] All Phase 3 tasks complete
- [ ] All Phase 4 tasks complete
- [ ] All Phase 5 tasks complete
- [ ] All Phase 6 tasks complete
- [ ] TypeScript strict mode passes
- [ ] All tests pass
- [ ] No console errors
- [ ] Code reviewed / self-reviewed
- [ ] Documentation updated

---

## Tips for Writing Good Task Lists

1. **Order matters** - tasks should be executable in sequence
2. **One concern per task** - don't mix unrelated work
3. **Include file paths** - AI knows exactly where to work
4. **Include tests with each task** - not as a separate phase
5. **Checkboxes are progress** - check off as you complete
6. **Phases group related work** - makes it easy to pause/resume
7. **Backend before frontend** - APIs are testable, UI follows
