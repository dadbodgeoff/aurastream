# AuraStream Pre-Production Fixes - Requirements

## Overview
Fix all 9 critical issues, 17 warnings, and 12 info items identified in the pre-production audit to achieve 100% backend-frontend-database alignment before beta launch.

## Success Criteria
- All 9 critical issues resolved
- All 17 warnings addressed
- All type mismatches fixed
- All missing endpoints/hooks implemented
- All tests passing
- Zero TypeScript/Python errors

## Critical Issues (Must Fix)

### CRIT-1: CSRF Token Not Captured
**Priority:** P0
**Module:** Authentication
**Impact:** Security vulnerability - CSRF protection broken
**Files:**
- `tsx/packages/api-client/src/types.ts` - Add csrfToken to LoginResponse
- `tsx/packages/api-client/src/client.ts` - Extract and store CSRF token
- Include CSRF token in state-changing request headers

### CRIT-2: Email Verification Callback Missing
**Priority:** P0
**Module:** Authentication
**Impact:** Users cannot verify email via link
**Files:**
- Create `tsx/apps/web/src/app/auth/verify-email/page.tsx`
- Handle token from URL, call backend, show status

### CRIT-3: OAuth Callback Handler Missing
**Priority:** P0
**Module:** Authentication
**Impact:** OAuth flow cannot complete
**Files:**
- Create `tsx/apps/web/src/app/auth/oauth-callback/page.tsx`
- Extract code/state from URL, handle redirect

### CRIT-4: Public Asset Endpoint Not Exposed
**Priority:** P0
**Module:** Assets
**Impact:** Public sharing feature broken
**Files:**
- `tsx/packages/api-client/src/hooks/useAssets.ts` - Add usePublicAsset hook

### CRIT-5: Database Dual Columns
**Priority:** P0
**Module:** Database
**Impact:** Schema ambiguity, potential data inconsistency
**Files:**
- Create `backend/database/migrations/007_cleanup_asset_columns.sql`
- Migrate data, drop old columns (cdn_url, storage_key, shareable_url)

### CRIT-6: JobResponse brandKitId Type
**Priority:** P0
**Module:** Generation
**Impact:** Type error when job has no brand kit
**Files:**
- `tsx/packages/api-client/src/types/assets.ts` - Change to `string | null`
- `tsx/packages/api-client/src/types/generation.ts` - Change to `string | null`

### CRIT-7: Asset brandKitId Type
**Priority:** P0
**Module:** Assets
**Impact:** Type error for assets without brand kit
**Files:**
- `tsx/packages/api-client/src/types/assets.ts` - Add brandKitId as optional

### CRIT-8: Coach Asset Type Enum Mismatch
**Priority:** P0
**Module:** Coach
**Impact:** Frontend cannot select 5 newer asset types
**Files:**
- `tsx/packages/api-client/src/types/coach.ts` - Add missing types
- `tsx/apps/web/src/hooks/useCoachContext.ts` - Update AssetType

### CRIT-9: SSE Chunk Type Schema Mismatch
**Priority:** P0
**Module:** Coach
**Impact:** Schema documentation doesn't match implementation
**Files:**
- `backend/api/schemas/coach.py` - Update StreamChunkTypeEnum

## Warnings (Should Fix)

### WARN-1: OAuth Integration Incomplete
**Module:** Authentication
**Files:** Multiple auth components

### WARN-2: Email Verification UI Missing
**Module:** Authentication
**Files:** Settings page, profile components

### WARN-3: Rate Limit UX Feedback Missing
**Module:** Authentication
**Files:** Login/signup forms

### WARN-4: ExtendedColor.usage Optionality
**Module:** Brand Kits
**Files:** `backend/api/schemas/brand_kit_enhanced.py`

### WARN-5: Missing default_logo_type Column
**Module:** Brand Kits
**Files:** New migration needed

### WARN-6: Default Context Engine Colors Hardcoded
**Module:** Generation
**Files:** `backend/services/twitch/context_engine.py`

### WARN-7: Pack Generation Missing Progress Tracking
**Module:** Generation
**Files:** Twitch routes, frontend hooks

### WARN-8: Session State Endpoint Not Integrated
**Module:** Coach
**Files:** Frontend hooks

### WARN-9: End Session Endpoint Implicit
**Module:** Coach
**Files:** Frontend hooks

### WARN-10: Default Pagination Limit Not Documented
**Module:** Assets
**Files:** Types, hooks

### WARN-11: Asset Type Defined Multiple Places
**Module:** Assets
**Files:** Multiple type files

### WARN-12: Backend Event Validation Missing
**Module:** Analytics
**Files:** `backend/api/routes/analytics.py`

### WARN-13: Deprecated Performance API
**Module:** Analytics
**Files:** `tsx/packages/shared/src/analytics/utils.ts`

### WARN-14-17: Various naming/documentation issues
**Module:** Multiple
**Files:** Various

## Info Items (Nice to Have)
- Consolidate brand kit type files
- Add streamer_assets endpoints
- Add social_profiles endpoints
- Improve error documentation
- Add integration tests

## Constraints
- Must maintain backward compatibility
- No breaking changes to existing API contracts
- All changes must pass existing tests
- Follow existing code patterns and conventions
