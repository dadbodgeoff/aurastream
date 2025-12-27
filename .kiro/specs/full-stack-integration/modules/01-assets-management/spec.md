# MODULE 1: ASSETS MANAGEMENT PAGE

## Overview
Create a complete assets management page that displays all user's generation jobs and their resulting assets. This is a critical gap - users currently have no way to view their generated assets.

## Priority: HIGH
## Dependencies: None
## Estimated Effort: 4-6 hours

---

## BACKEND VERIFICATION

### Existing Endpoints (VERIFIED WORKING)

```
GET  /api/v1/jobs                    → JobListResponse
GET  /api/v1/jobs/{job_id}           → JobResponse  
GET  /api/v1/jobs/{job_id}/assets    → List[AssetResponse]
```

### Backend Files Reference
- `backend/api/routes/generation.py` - Route handlers
- `backend/api/schemas/generation.py` - JobResponse, JobListResponse
- `backend/api/schemas/asset.py` - AssetResponse, AssetListResponse

---

## IMPLEMENTATION TASKS

### Task 1.1: Create Type Definitions
**File:** `tsx/packages/api-client/src/types/assets.ts`

```typescript
// Job status enum matching backend
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'partial';

// Asset type enum matching backend
export type AssetType = 'thumbnail' | 'overlay' | 'banner' | 'story_graphic' | 'clip_cover';

// Job interface matching backend JobResponse
export interface Job {
  id: string;
  userId: string;
  brandKitId: string;
  assetType: AssetType;
  status: JobStatus;
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

// Job list response matching backend JobListResponse
export interface JobListResponse {
  jobs: Job[];
  total: number;
  limit: number;
  offset: number;
}

// Asset interface matching backend AssetResponse
export interface Asset {
  id: string;
  jobId: string;
  userId: string;
  assetType: AssetType;
  url: string;
  width: number;
  height: number;
  fileSize: number;
  isPublic: boolean;
  viralScore: number | null;
  createdAt: string;
}

// Job filters for list query
export interface JobFilters {
  status?: JobStatus;
  limit?: number;
  offset?: number;
}
```

### Task 1.2: Create API Hooks
**File:** `tsx/packages/api-client/src/hooks/useAssets.ts`

**Requirements:**
1. `useJobs(filters?)` - List jobs with optional filters
2. `useJob(jobId)` - Get single job by ID
3. `useJobAssets(jobId)` - Get assets for a job
4. Follow existing patterns from `useLogos.ts`
5. Transform snake_case to camelCase
6. Handle loading, error, and empty states

**Pattern to Follow:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Get access token helper (copy from useLogos.ts)
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

// API base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Transform functions for snake_case → camelCase
function transformJob(data: any): Job {
  return {
    id: data.id,
    userId: data.user_id,
    brandKitId: data.brand_kit_id,
    assetType: data.asset_type,
    status: data.status,
    progress: data.progress,
    errorMessage: data.error_message,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    completedAt: data.completed_at,
  };
}

function transformAsset(data: any): Asset {
  return {
    id: data.id,
    jobId: data.job_id,
    userId: data.user_id,
    assetType: data.asset_type,
    url: data.url,
    width: data.width,
    height: data.height,
    fileSize: data.file_size,
    isPublic: data.is_public,
    viralScore: data.viral_score,
    createdAt: data.created_at,
  };
}
```

### Task 1.3: Create Assets Page
**File:** `tsx/apps/web/src/app/dashboard/assets/page.tsx`

**UI Requirements:**

1. **Page Header**
   - Title: "My Assets"
   - Subtitle: "View and manage your generated assets"
   - Icon: Gallery/Image icon

2. **Filter Bar**
   - Status dropdown: All, Queued, Processing, Completed, Failed
   - Asset type dropdown: All, Thumbnail, Overlay, Banner, Story, Clip Cover
   - Refresh button

3. **Jobs List**
   - Card for each job showing:
     - Status badge (color-coded)
     - Asset type with emoji
     - Progress bar (if processing)
     - Created date (relative time)
     - Expand/collapse to show assets
   - Status colors:
     - queued: yellow/amber
     - processing: blue with pulse animation
     - completed: green
     - failed: red
     - partial: orange

4. **Assets Grid** (inside expanded job)
   - Thumbnail preview (lazy loaded)
   - Hover overlay with actions:
     - Download button
     - Copy URL button
     - Toggle visibility button
   - Click to open full preview modal

5. **Empty State**
   - Illustration or icon
   - "No assets yet"
   - CTA button: "Generate Your First Asset"
   - Link to /dashboard/generate

6. **Polling**
   - Poll every 2 seconds for jobs with status 'queued' or 'processing'
   - Stop polling when all jobs are terminal (completed/failed)

7. **Pagination**
   - 20 items per page
   - Load more button or infinite scroll

**Design Tokens:**
- Use SectionCard pattern from brand-kits pages
- Primary: #8B5CF6 (Electric Purple)
- Accent: #00D9FF (Neon Cyan)
- Background: #0F0F14, #1A1A24, #252532
- Follow existing dashboard page patterns

---

## ACCEPTANCE CRITERIA

- [ ] Types file created with correct interfaces
- [ ] All hooks implemented and exported
- [ ] Page renders without errors
- [ ] Jobs list displays correctly
- [ ] Status badges show correct colors
- [ ] Progress bar animates for processing jobs
- [ ] Assets grid shows thumbnails
- [ ] Download action works
- [ ] Copy URL action works
- [ ] Empty state shows when no jobs
- [ ] Polling works for in-progress jobs
- [ ] Pagination works
- [ ] TypeScript compiles without errors
- [ ] No console errors in browser

---

## TESTING COMMANDS

```bash
# Type check
cd tsx && npm run typecheck

# Run dev server
cd tsx && npm run dev

# Navigate to http://localhost:3000/dashboard/assets
```

---

## FILES TO CREATE

1. `tsx/packages/api-client/src/types/assets.ts`
2. `tsx/packages/api-client/src/hooks/useAssets.ts`
3. `tsx/apps/web/src/app/dashboard/assets/page.tsx`

## FILES TO UPDATE

1. `tsx/packages/api-client/src/index.ts` - Export new hooks and types
