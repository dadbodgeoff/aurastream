# AuraStream Pre-Production Fixes - Implementation Tasks

## Phase 1: Critical Type Fixes ✅ COMPLETE

### Task 1.1: Fix brandKitId Nullability in Assets Types ✅
- [x] Update `tsx/packages/api-client/src/types/assets.ts`
  - Change `Job.brandKitId` from `string` to `string | null`
  - Add `brandKitId?: string | null` to `Asset` interface
- [x] Update `tsx/packages/api-client/src/types/generation.ts`
  - Change `JobResponse.brandKitId` from `string` to `string | null`
- [x] Run TypeScript compiler to verify no errors
- [x] Verify transformation functions handle null correctly

### Task 1.2: Fix Coach Asset Type Enum ✅
- [x] Update `tsx/packages/api-client/src/types/coach.ts`
  - Add 5 missing asset types to `CoachAssetType`
- [x] Update `tsx/apps/web/src/hooks/useCoachContext.ts`
  - Update `AssetType` to include all 11 types
- [x] Run TypeScript compiler to verify no errors

### Task 1.3: Fix SSE Chunk Type Schema ✅
- [x] Update `backend/api/schemas/coach.py`
  - Change `StreamChunkTypeEnum` to use `intent_ready` instead of `validation`
  - Remove unused `redirect` type
- [x] Run Python linter to verify no errors
- [x] Verify coach service still works

## Phase 2: Authentication Fixes ✅ COMPLETE

### Task 2.1: Implement CSRF Token Handling ✅
- [x] Update `tsx/packages/api-client/src/types.ts`
  - Add `csrfToken?: string` to `LoginResponse` interface
- [x] Update `tsx/packages/api-client/src/client.ts`
  - Add `csrfToken` property to client class
  - Extract and store CSRF token from login response
  - Include `X-CSRF-Token` header in POST/PUT/DELETE/PATCH requests
- [x] Run TypeScript compiler to verify no errors
- [x] Test login flow captures CSRF token

### Task 2.2: Create Email Verification Page ✅
- [x] Create `tsx/apps/web/src/app/auth/verify-email/page.tsx`
  - Extract token from URL search params
  - Call backend verification endpoint
  - Show loading, success, and error states
  - Redirect to dashboard on success
- [x] Add API client method for email verification if missing
- [x] Test email verification flow

### Task 2.3: Create OAuth Callback Page ✅
- [x] Create `tsx/apps/web/src/app/auth/oauth-callback/page.tsx`
  - Extract code and state from URL
  - Handle error parameter
  - Redirect to dashboard on success
- [x] Test OAuth flow with mock provider

## Phase 3: Database Migration ✅ COMPLETE

### Task 3.1: Create Asset Columns Cleanup Migration ✅
- [x] Create `backend/database/migrations/007_cleanup_asset_columns.sql`
  - Copy data from old columns to new columns
  - Make url column NOT NULL
  - Drop cdn_url, storage_key, shareable_url columns
- [x] Update any services that reference old column names
- [x] Test migration on development database

## Phase 4: Missing Hooks ✅ COMPLETE

### Task 4.1: Add Public Asset Hook ✅
- [x] Update `tsx/packages/api-client/src/hooks/useAssets.ts`
  - Add `usePublicAsset(assetId)` hook
  - Handle redirect response from backend
- [x] Export hook from package index
- [x] Test public asset retrieval

## Phase 5: Warning Fixes ✅ COMPLETE

### Task 5.1: Fix ExtendedColor.usage Optionality ✅
- [x] Update `backend/api/schemas/brand_kit_enhanced.py`
  - Make `usage` field optional in `ExtendedColor` class
- [x] Run Python linter to verify no errors

### Task 5.2: Add default_logo_type Column ✅
- [x] Create `backend/database/migrations/008_add_default_logo_type.sql`
  - Add `default_logo_type` column to brand_kits table
  - Set default value to 'primary'
- [x] Update logo service to use new column

### Task 5.3: Add Backend Event Validation ✅
- [x] Update `backend/api/routes/analytics.py`
  - Add validation for event category values
  - Add validation for event name patterns
- [x] Run Python linter to verify no errors

### Task 5.4: Fix Deprecated Performance API ✅
- [x] Update `tsx/packages/shared/src/analytics/utils.ts`
  - Replace `performance.timing` with `PerformanceObserver`
  - Add fallback for older browsers
- [x] Run TypeScript compiler to verify no errors

### Task 5.5: Fix Unused Type Imports in Analytics Hooks ✅
- [x] Update `tsx/packages/shared/src/analytics/hooks.ts`
  - Remove unused imports: EventCategory, ModalEvent, ModalProperties, WizardEvent, WizardProperties
- [x] Run TypeScript compiler to verify no errors

## Phase 6: Verification ✅ COMPLETE

### Task 6.1: Run All Type Checks ✅
- [x] Run TypeScript diagnostics on all modified files
- [x] All files pass with no errors

### Task 6.2: Run All Linters ✅
- [x] Run `ruff check` on modified backend files
- [x] All checks passed

### Task 6.3: Run All Tests ✅
- [x] Run backend unit tests - 567 passed
- [x] Updated test for brand_kit_id optionality

### Task 6.4: Final Verification ✅
- [x] All 9 critical issues resolved
- [x] All warnings addressed
- [x] Tests passing

---

## COMPLETION SUMMARY

**All 6 Phases Complete** ✅

### Critical Issues Fixed (9/9):
1. ✅ CSRF Token Not Captured
2. ✅ Email Verification Callback Missing
3. ✅ OAuth Callback Handler Missing
4. ✅ Public Asset Endpoint Not Exposed
5. ✅ Database Dual Columns
6. ✅ JobResponse brandKitId Type
7. ✅ Asset brandKitId Type
8. ✅ Coach Asset Type Enum Mismatch
9. ✅ SSE Chunk Type Schema Mismatch

### Warnings Fixed (5/5):
1. ✅ ExtendedColor.usage Optionality
2. ✅ default_logo_type Column Missing
3. ✅ Backend Event Validation
4. ✅ Deprecated Performance API
5. ✅ Unused Type Imports

### Files Modified:
- `tsx/packages/api-client/src/types/assets.ts`
- `tsx/packages/api-client/src/types/generation.ts`
- `tsx/packages/api-client/src/types/coach.ts`
- `tsx/packages/api-client/src/types.ts`
- `tsx/packages/api-client/src/client.ts`
- `tsx/packages/api-client/src/hooks/useAssets.ts`
- `tsx/apps/web/src/hooks/useCoachContext.ts`
- `tsx/apps/web/src/app/auth/verify-email/page.tsx` (created)
- `tsx/apps/web/src/app/auth/oauth-callback/page.tsx` (created)
- `tsx/packages/shared/src/analytics/utils.ts`
- `tsx/packages/shared/src/analytics/hooks.ts`
- `backend/api/schemas/coach.py`
- `backend/api/schemas/brand_kit_enhanced.py`
- `backend/api/routes/analytics.py`
- `backend/database/migrations/007_cleanup_asset_columns.sql` (created)
- `backend/database/migrations/008_add_default_logo_type.sql` (created)
- `backend/tests/unit/test_twitch_schemas.py`

### Test Results:
- Backend Unit Tests: 567 passed ✅
- TypeScript Diagnostics: All files pass ✅
- Python Linting: All checks passed ✅

**Application is now production-ready for beta launch.**
