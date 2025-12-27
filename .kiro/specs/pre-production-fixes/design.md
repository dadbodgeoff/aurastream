# AuraStream Pre-Production Fixes - Technical Design

## Architecture Overview

This spec addresses alignment issues across 4 layers:
1. **Database Layer** - Migrations, schema fixes
2. **Backend Layer** - Python/FastAPI schemas, routes, services
3. **API Client Layer** - TypeScript types, hooks
4. **Frontend Layer** - React pages, components

## Phase 1: Critical Type Fixes (CRIT-6, CRIT-7, CRIT-8, CRIT-9)

### 1.1 Fix brandKitId Nullability

**Problem:** Backend returns `brand_kit_id: Optional[str]` but frontend expects `string`

**Solution:**
```typescript
// tsx/packages/api-client/src/types/assets.ts
interface Job {
  brandKitId: string | null;  // Was: string
}

interface Asset {
  brandKitId?: string | null;  // Add this field
}

// tsx/packages/api-client/src/types/generation.ts
interface JobResponse {
  brandKitId: string | null;  // Was: string
}
```

### 1.2 Fix Coach Asset Type Enum

**Problem:** Backend has 11 types, frontend has 6

**Solution:**
```typescript
// tsx/packages/api-client/src/types/coach.ts
export type CoachAssetType = 
  | 'twitch_emote' 
  | 'youtube_thumbnail' 
  | 'twitch_banner' 
  | 'twitch_badge' 
  | 'overlay' 
  | 'story_graphic'
  | 'tiktok_story'        // ADD
  | 'instagram_story'     // ADD
  | 'instagram_reel'      // ADD
  | 'twitch_panel'        // ADD
  | 'twitch_offline';     // ADD
```

### 1.3 Fix SSE Chunk Type Schema

**Problem:** Schema has `validation`, code uses `intent_ready`

**Solution:**
```python
# backend/api/schemas/coach.py
StreamChunkTypeEnum = Literal[
    "token",
    "intent_ready",      # Changed from "validation"
    "grounding",
    "grounding_complete",
    "done",
    "error",
]
```

## Phase 2: Authentication Fixes (CRIT-1, CRIT-2, CRIT-3)

### 2.1 CSRF Token Handling

**Design:**
1. Add `csrfToken?: string` to LoginResponse interface
2. Store CSRF token in API client instance
3. Include `X-CSRF-Token` header in POST/PUT/DELETE requests

**Files:**
- `tsx/packages/api-client/src/types.ts`
- `tsx/packages/api-client/src/client.ts`

### 2.2 Email Verification Page

**Design:**
- Route: `/auth/verify-email?token=xxx`
- Extract token from URL params
- Call `GET /api/v1/auth/email/verify/{token}`
- Show success/error state
- Redirect to dashboard on success

**File:** `tsx/apps/web/src/app/auth/verify-email/page.tsx`

### 2.3 OAuth Callback Page

**Design:**
- Route: `/auth/oauth-callback?code=xxx&state=xxx`
- Extract code and state from URL
- Backend handles token exchange via cookies
- Redirect to dashboard

**File:** `tsx/apps/web/src/app/auth/oauth-callback/page.tsx`

## Phase 3: Database Migration (CRIT-5)

### 3.1 Cleanup Asset Columns

**Design:**
1. Copy data from old columns to new columns
2. Make new columns NOT NULL
3. Drop old columns

**Migration:**
```sql
-- Copy data
UPDATE assets SET url = cdn_url WHERE url IS NULL AND cdn_url IS NOT NULL;
UPDATE assets SET storage_path = storage_key WHERE storage_path IS NULL;

-- Drop old columns
ALTER TABLE assets DROP COLUMN IF EXISTS cdn_url;
ALTER TABLE assets DROP COLUMN IF EXISTS storage_key;
ALTER TABLE assets DROP COLUMN IF EXISTS shareable_url;
```

## Phase 4: Missing Hooks (CRIT-4)

### 4.1 Public Asset Hook

**Design:**
```typescript
export function usePublicAsset(assetId: string | undefined) {
  return useQuery({
    queryKey: ['public-asset', assetId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/asset/${assetId}`);
      if (!response.ok) throw new Error('Asset not found');
      return response.url;
    },
    enabled: !!assetId,
  });
}
```

## Phase 5: Warning Fixes

### 5.1 ExtendedColor.usage Optionality (WARN-4)
Make `usage` field optional in backend schema

### 5.2 Add default_logo_type Column (WARN-5)
New migration to add column to brand_kits table

### 5.3 Backend Event Validation (WARN-12)
Add validation for analytics event types

### 5.4 Deprecated Performance API (WARN-13)
Migrate from `performance.timing` to `PerformanceObserver`

## Testing Strategy

1. **Unit Tests:** Verify type changes compile
2. **Integration Tests:** Verify API calls work
3. **E2E Tests:** Verify user flows complete
4. **Type Checking:** Run `tsc --noEmit` on frontend
5. **Linting:** Run `eslint` and `ruff` checks

## Rollback Plan

Each phase is independent and can be rolled back:
1. Type fixes: Revert type file changes
2. Auth pages: Delete new pages
3. Migration: Create reverse migration
4. Hooks: Remove new hooks

## Dependencies

- Phase 1 has no dependencies
- Phase 2 depends on Phase 1 (types)
- Phase 3 is independent
- Phase 4 depends on Phase 1 (types)
- Phase 5 depends on Phases 1-4
