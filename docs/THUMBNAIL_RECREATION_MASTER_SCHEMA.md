# 🎨 THUMBNAIL RECREATION MASTER SCHEMA
## Complete Implementation Reference for AI Agents

**Version:** 1.0.0  
**Last Updated:** January 1, 2026  
**Purpose:** Definitive reference for Thumbnail Recreation feature implementation  
**Status:** Production Ready

---

## QUICK REFERENCE

### Feature Identity
- **Name:** Thumbnail Recreation
- **Purpose:** Recreate winning YouTube thumbnails with user's face
- **Target Users:** Content creators who want to replicate successful thumbnail styles
- **Dependencies:** Thumbnail Intel (analysis), Generation Service, Brand Kits

### Key Files
```
Backend:
├── backend/api/routes/thumbnail_recreate.py      → API endpoints
├── backend/api/schemas/thumbnail_recreate.py     → Pydantic schemas
├── backend/services/thumbnail_recreate_service.py → Business logic
└── backend/database/migrations/049_thumbnail_recreation.sql → DB schema

Frontend:
├── tsx/packages/api-client/src/hooks/useThumbnailRecreate.ts → React Query hooks
├── tsx/packages/api-client/src/types/thumbnailRecreate.ts    → TypeScript types
└── tsx/apps/web/src/app/intel/recreate/page.tsx              → UI page
```

---

## ARCHITECTURE OVERVIEW

### System Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                              │
│  tsx/apps/web/src/app/intel/recreate/page.tsx                   │
│  - Step wizard: Preview → Face → Customize → Generate → Complete│
│  - Face upload/selection                                        │
│  - Brand kit integration                                        │
│  - Real-time status polling                                     │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API CLIENT LAYER                            │
│  tsx/packages/api-client/src/hooks/useThumbnailRecreate.ts      │
│  - useRecreateThumbnail()     - useRecreationStatus()           │
│  - useFaceAssets()            - useUploadFace()                 │
│  - useDeleteFace()            - useRecreationHistory()          │
│  - snake_case ↔ camelCase transformation                        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API ROUTES                                  │
│  backend/api/routes/thumbnail_recreate.py                       │
│  - POST /thumbnails/recreate      → Start recreation            │
│  - GET  /thumbnails/recreate/{id} → Check status                │
│  - GET  /thumbnails/recreations   → History                     │
│  - GET  /thumbnails/faces         → List saved faces            │
│  - POST /thumbnails/faces         → Upload face                 │
│  - DELETE /thumbnails/faces/{id}  → Delete face                 │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                               │
│  backend/services/thumbnail_recreate_service.py                 │
│  - recreate()        → Orchestrate recreation flow              │
│  - get_status()      → Check job status                         │
│  - get_history()     → User's recreation history                │
│  - _build_recreation_prompt() → Generate AI prompt              │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GENERATION WORKER                           │
│  backend/workers/generation_worker.py                           │
│  - Processes recreation jobs via Nano Banana                    │
│  - Handles face swap + style recreation                         │
│  - Stores result in assets table                                │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA LAYER                                  │
│  PostgreSQL (Supabase)                                          │
│  - thumbnail_recreations: Recreation history                    │
│  - user_face_assets: Saved face images                          │
│  - generation_jobs: Job tracking                                │
│  - assets: Generated thumbnails                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## API ENDPOINTS REFERENCE

### Endpoint Summary (6 total)
```
POST   /api/v1/thumbnails/recreate           → Start recreation
GET    /api/v1/thumbnails/recreate/{id}      → Check status
GET    /api/v1/thumbnails/recreations        → Get history
GET    /api/v1/thumbnails/faces              → List saved faces
POST   /api/v1/thumbnails/faces              → Upload face
DELETE /api/v1/thumbnails/faces/{face_id}    → Delete face
```

### Endpoint Details

#### POST /api/v1/thumbnails/recreate
Start a thumbnail recreation job.

**Request Body:**
```json
{
  "video_id": "abc123",
  "thumbnail_url": "https://i.ytimg.com/vi/abc123/maxresdefault.jpg",
  "analysis": {
    "video_id": "abc123",
    "title": "Video Title",
    "thumbnail_url": "https://...",
    "view_count": 1500000,
    "layout_type": "face-left-text-right",
    "text_placement": "right-side",
    "focal_point": "face",
    "dominant_colors": ["#FF0000", "#FFFFFF", "#000000"],
    "color_mood": "high-energy",
    "background_style": "gradient",
    "has_face": true,
    "has_text": true,
    "text_content": "SHOCKING!",
    "has_border": false,
    "has_glow_effects": true,
    "has_arrows_circles": false,
    "face_expression": "shocked",
    "face_position": "left-third",
    "face_size": "large",
    "face_looking_direction": "camera",
    "layout_recipe": "Place face on left third, text on right",
    "color_recipe": "Use red/white high contrast",
    "why_it_works": "Strong emotion + clear text",
    "difficulty": "medium"
  },
  "face_image_base64": "iVBORw0KGgo...",
  "face_asset_id": null,
  "custom_text": null,
  "use_brand_colors": false,
  "brand_kit_id": null,
  "additional_instructions": null
}
```

**Response (201):**
```json
{
  "recreation_id": "uuid-recreation-id",
  "job_id": "uuid-job-id",
  "status": "queued",
  "estimated_seconds": 30,
  "message": "Recreation started - your thumbnail is being generated"
}
```

**Error Responses:**
- `400`: Missing face when original has face
- `429`: Usage limit reached
- `500`: Recreation failed

---

#### GET /api/v1/thumbnails/recreate/{recreation_id}
Check recreation status.

**Response (200):**
```json
{
  "recreation_id": "uuid-recreation-id",
  "job_id": "uuid-job-id",
  "status": "completed",
  "progress_percent": 100,
  "generated_thumbnail_url": "https://storage.../thumbnail.png",
  "download_url": "https://storage.../thumbnail.png",
  "asset_id": "uuid-asset-id",
  "error_message": null
}
```

**Status Values:** `queued` | `processing` | `completed` | `failed`

---

#### GET /api/v1/thumbnails/recreations
Get user's recreation history.

**Query Parameters:**
- `limit`: int (default: 20, max: 100)
- `offset`: int (default: 0)

**Response (200):**
```json
{
  "recreations": [
    {
      "id": "uuid",
      "reference_video_id": "abc123",
      "reference_thumbnail_url": "https://...",
      "generated_thumbnail_url": "https://...",
      "custom_text": null,
      "status": "completed",
      "created_at": "2026-01-01T12:00:00Z"
    }
  ],
  "total": 15
}
```

---

#### GET /api/v1/thumbnails/faces
Get user's saved face assets.

**Response (200):**
```json
{
  "faces": [
    {
      "id": "uuid",
      "display_name": "My Face",
      "original_url": "https://storage.../face.png",
      "processed_url": null,
      "is_primary": true,
      "created_at": "2026-01-01T12:00:00Z"
    }
  ],
  "total": 3
}
```

---

#### POST /api/v1/thumbnails/faces
Upload a new face asset.

**Request Body:**
```json
{
  "image_base64": "iVBORw0KGgo...",
  "display_name": "My Face",
  "set_as_primary": true
}
```

**Response (201):**
```json
{
  "face": {
    "id": "uuid",
    "display_name": "My Face",
    "original_url": "https://storage.../face.png",
    "processed_url": null,
    "is_primary": true,
    "created_at": "2026-01-01T12:00:00Z"
  },
  "message": "Face uploaded successfully"
}
```

**Validation:**
- Max file size: 10MB
- Must be valid base64 image

---

#### DELETE /api/v1/thumbnails/faces/{face_id}
Delete a saved face asset.

**Response (200):**
```json
{
  "success": true,
  "message": "Face asset deleted"
}
```

---

## DATABASE SCHEMA

### Table: thumbnail_recreations
```sql
CREATE TABLE thumbnail_recreations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES generation_jobs(id) ON DELETE SET NULL,
    
    -- Reference thumbnail
    reference_video_id TEXT NOT NULL,
    reference_thumbnail_url TEXT NOT NULL,
    reference_analysis JSONB NOT NULL,
    
    -- User inputs
    face_asset_id UUID,
    custom_text TEXT,
    use_brand_colors BOOLEAN DEFAULT FALSE,
    brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE SET NULL,
    
    -- Result
    generated_url TEXT,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_thumbnail_recreations_user ON thumbnail_recreations(user_id, created_at DESC);
CREATE INDEX idx_thumbnail_recreations_status ON thumbnail_recreations(status);
CREATE INDEX idx_thumbnail_recreations_job ON thumbnail_recreations(job_id);

-- RLS Policy
CREATE POLICY "Users can manage own recreations"
ON thumbnail_recreations FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Table: user_face_assets
```sql
CREATE TABLE user_face_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Asset info
    display_name TEXT,
    original_url TEXT NOT NULL,
    processed_url TEXT,  -- Background-removed version
    storage_path TEXT,
    
    -- Flags
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_face_assets_user ON user_face_assets(user_id, created_at DESC);
CREATE INDEX idx_user_face_assets_primary ON user_face_assets(user_id, is_primary) WHERE is_primary = TRUE;

-- RLS Policy
CREATE POLICY "Users can manage own face assets"
ON user_face_assets FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

## TYPE DEFINITIONS

### Backend (Python - snake_case)

```python
# backend/api/schemas/thumbnail_recreate.py

from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from backend.api.schemas.thumbnail_intel import ThumbnailAnalysisResponse

class RecreateRequest(BaseModel):
    """Request to recreate a thumbnail with user's face."""
    video_id: str
    thumbnail_url: str
    analysis: ThumbnailAnalysisResponse
    face_image_base64: Optional[str] = None
    face_asset_id: Optional[str] = None
    custom_text: Optional[str] = None
    use_brand_colors: bool = False
    brand_kit_id: Optional[str] = None
    additional_instructions: Optional[str] = None

class RecreateResponse(BaseModel):
    """Response from recreation request."""
    recreation_id: str
    job_id: str
    status: Literal["queued", "processing", "completed", "failed"]
    estimated_seconds: int = 30
    message: str = "Recreation started"

class RecreationStatusResponse(BaseModel):
    """Status check response for recreation."""
    recreation_id: str
    job_id: str
    status: Literal["queued", "processing", "completed", "failed"]
    progress_percent: int = Field(default=0, ge=0, le=100)
    generated_thumbnail_url: Optional[str] = None
    download_url: Optional[str] = None
    asset_id: Optional[str] = None
    error_message: Optional[str] = None

class RecreationHistoryItem(BaseModel):
    """Single item in recreation history."""
    id: str
    reference_video_id: str
    reference_thumbnail_url: str
    generated_thumbnail_url: Optional[str]
    custom_text: Optional[str]
    status: str
    created_at: str

class RecreationHistoryResponse(BaseModel):
    """User's recreation history."""
    recreations: List[RecreationHistoryItem]
    total: int

class FaceAsset(BaseModel):
    """Saved face asset for recreation."""
    id: str
    display_name: Optional[str]
    original_url: str
    processed_url: Optional[str]
    is_primary: bool
    created_at: str

class FaceAssetsResponse(BaseModel):
    """User's saved face assets."""
    faces: List[FaceAsset]
    total: int

class UploadFaceRequest(BaseModel):
    """Request to upload a new face asset."""
    image_base64: str
    display_name: Optional[str] = None
    set_as_primary: bool = False

class UploadFaceResponse(BaseModel):
    """Response from face upload."""
    face: FaceAsset
    message: str = "Face uploaded successfully"
```

### Frontend (TypeScript - camelCase)

```typescript
// tsx/packages/api-client/src/types/thumbnailRecreate.ts

import type { ThumbnailAnalysis } from './thumbnailIntel';

export interface RecreateRequest {
  videoId: string;
  thumbnailUrl: string;
  analysis: ThumbnailAnalysis;
  faceImageBase64?: string;
  faceAssetId?: string;
  customText?: string;
  useBrandColors?: boolean;
  brandKitId?: string;
  additionalInstructions?: string;
}

export interface RecreateResponse {
  recreationId: string;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  estimatedSeconds: number;
  message: string;
}

export interface RecreationStatus {
  recreationId: string;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progressPercent: number;
  generatedThumbnailUrl?: string;
  downloadUrl?: string;
  assetId?: string;
  errorMessage?: string;
}

export interface RecreationHistoryItem {
  id: string;
  referenceVideoId: string;
  referenceThumbnailUrl: string;
  generatedThumbnailUrl?: string;
  customText?: string;
  status: string;
  createdAt: string;
}

export interface RecreationHistory {
  recreations: RecreationHistoryItem[];
  total: number;
}

export interface FaceAsset {
  id: string;
  displayName?: string;
  originalUrl: string;
  processedUrl?: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface FaceAssetsResponse {
  faces: FaceAsset[];
  total: number;
}

export interface UploadFaceRequest {
  imageBase64: string;
  displayName?: string;
  setAsPrimary?: boolean;
}

export interface UploadFaceResponse {
  face: FaceAsset;
  message: string;
}
```

---

## TYPE ALIGNMENT MATRIX

| Backend (snake_case) | Frontend (camelCase) | Type | Nullable |
|---------------------|---------------------|------|----------|
| `recreation_id` | `recreationId` | `str` / `string` | No |
| `job_id` | `jobId` | `str` / `string` | No |
| `video_id` | `videoId` | `str` / `string` | No |
| `thumbnail_url` | `thumbnailUrl` | `str` / `string` | No |
| `face_image_base64` | `faceImageBase64` | `Optional[str]` / `string?` | Yes |
| `face_asset_id` | `faceAssetId` | `Optional[str]` / `string?` | Yes |
| `custom_text` | `customText` | `Optional[str]` / `string?` | Yes |
| `use_brand_colors` | `useBrandColors` | `bool` / `boolean` | No (default: false) |
| `brand_kit_id` | `brandKitId` | `Optional[str]` / `string?` | Yes |
| `additional_instructions` | `additionalInstructions` | `Optional[str]` / `string?` | Yes |
| `estimated_seconds` | `estimatedSeconds` | `int` / `number` | No (default: 30) |
| `progress_percent` | `progressPercent` | `int` / `number` | No (default: 0) |
| `generated_thumbnail_url` | `generatedThumbnailUrl` | `Optional[str]` / `string?` | Yes |
| `download_url` | `downloadUrl` | `Optional[str]` / `string?` | Yes |
| `asset_id` | `assetId` | `Optional[str]` / `string?` | Yes |
| `error_message` | `errorMessage` | `Optional[str]` / `string?` | Yes |
| `reference_video_id` | `referenceVideoId` | `str` / `string` | No |
| `reference_thumbnail_url` | `referenceThumbnailUrl` | `str` / `string` | No |
| `display_name` | `displayName` | `Optional[str]` / `string?` | Yes |
| `original_url` | `originalUrl` | `str` / `string` | No |
| `processed_url` | `processedUrl` | `Optional[str]` / `string?` | Yes |
| `is_primary` | `isPrimary` | `bool` / `boolean` | No |
| `set_as_primary` | `setAsPrimary` | `bool` / `boolean` | No (default: false) |
| `created_at` | `createdAt` | `str` / `string` | No (ISO 8601) |

---

## REACT QUERY HOOKS

### Hook Summary
```typescript
// tsx/packages/api-client/src/hooks/useThumbnailRecreate.ts

// Mutations
useRecreateThumbnail()     → Start recreation
useUploadFace()            → Upload face asset
useDeleteFace()            → Delete face asset

// Queries
useRecreationStatus(id)    → Poll recreation status
useRecreationHistory()     → Get history
useFaceAssets()            → Get saved faces
```

### Query Keys
```typescript
export const thumbnailRecreateKeys = {
  all: ['thumbnailRecreate'] as const,
  status: (id: string) => [...thumbnailRecreateKeys.all, 'status', id] as const,
  history: () => [...thumbnailRecreateKeys.all, 'history'] as const,
  faces: () => [...thumbnailRecreateKeys.all, 'faces'] as const,
};
```

### Transform Functions
```typescript
// snake_case → camelCase (API response to frontend)
function transformRecreateResponse(data: any): RecreateResponse {
  return {
    recreationId: data.recreation_id,
    jobId: data.job_id,
    status: data.status,
    estimatedSeconds: data.estimated_seconds,
    message: data.message,
  };
}

// camelCase → snake_case (frontend to API request)
function transformAnalysisToSnake(analysis: ThumbnailAnalysis): any {
  return {
    video_id: analysis.videoId,
    title: analysis.title,
    thumbnail_url: analysis.thumbnailUrl,
    view_count: analysis.viewCount,
    layout_type: analysis.layoutType,
    // ... all fields
  };
}
```

---

## USAGE LIMITS

Recreation counts toward the user's monthly creation limit:

| Tier | Creations/Month |
|------|-----------------|
| Free | 3 |
| Pro | 50 |
| Studio | Unlimited |

**Implementation:**
```python
# backend/api/routes/thumbnail_recreate.py

from backend.services.usage_limit_service import get_usage_limit_service

usage_service = get_usage_limit_service()
usage = await usage_service.check_limit(current_user.sub, "creations")

if not usage.can_use:
    raise HTTPException(
        status_code=429,
        detail={
            "error": "CREATION_LIMIT_REACHED",
            "message": f"You've used all {usage.limit} creations this month",
            "used": usage.used,
            "limit": usage.limit,
            "tier": usage.tier,
            "upgrade_url": "/dashboard/settings?tab=subscription",
        }
    )

# After successful creation
await usage_service.increment(current_user.sub, "creations")
```

---

## UI FLOW

### Step Wizard
```
1. Preview    → Show reference thumbnail + analysis summary
2. Face       → Upload/select face (skipped if no face in original)
3. Customize  → Optional: custom text, brand colors
4. Generating → Progress indicator + status polling
5. Complete   → Show result + download/share options
```

### State Management
```typescript
interface RecreationState {
  step: 'preview' | 'face' | 'customize' | 'generating' | 'complete';
  analysis: ThumbnailAnalysis | null;
  selectedFace: FaceAsset | null;
  uploadedFaceBase64: string | null;
  customText: string;
  useBrandColors: boolean;
  selectedBrandKitId: string | null;
  recreationId: string | null;
  generatedUrl: string | null;
  skinTone: SkinTone;
}
```

### Status Polling
```typescript
const { data: recreationStatus } = useRecreationStatus(
  state.recreationId || '',
  {
    enabled: !!state.recreationId && state.step === 'generating',
    refetchInterval: state.step === 'generating' ? 2000 : false,
  }
);
```

---

## TESTING REQUIREMENTS

### Backend Tests

#### Unit Tests
```bash
# backend/tests/unit/test_thumbnail_recreate_service.py
python3 -m pytest backend/tests/unit/test_thumbnail_recreate_service.py -v
```

**Test Cases:**
- `test_build_recreation_prompt_with_face`
- `test_build_recreation_prompt_without_face`
- `test_build_recreation_prompt_with_brand_colors`
- `test_build_recreation_prompt_with_custom_text`
- `test_get_face_data_from_base64`
- `test_get_face_data_from_asset_id`
- `test_save_recreation_record`

#### Integration Tests
```bash
# backend/tests/integration/test_thumbnail_recreate_api.py
python3 -m pytest backend/tests/integration/test_thumbnail_recreate_api.py -v
```

**Test Cases:**
- `test_recreate_thumbnail_success`
- `test_recreate_thumbnail_missing_face`
- `test_recreate_thumbnail_usage_limit`
- `test_get_recreation_status`
- `test_get_recreation_history`
- `test_upload_face_asset`
- `test_delete_face_asset`
- `test_get_face_assets`

### Frontend Tests

#### Unit Tests
```bash
# tsx/packages/api-client/src/__tests__/useThumbnailRecreate.test.ts
npm run test --workspace=@aurastream/api-client
```

**Test Cases:**
- `transforms RecreateResponse correctly`
- `transforms RecreationStatus correctly`
- `transforms FaceAsset correctly`
- `transforms analysis to snake_case`
- `useRecreateThumbnail mutation works`
- `useRecreationStatus polling works`
- `useFaceAssets query works`

#### E2E Tests
```bash
# tsx/apps/web/e2e/thumbnail-recreate.spec.ts
npx playwright test thumbnail-recreate
```

**Test Cases:**
- `can navigate to recreate page with analysis`
- `shows error when no analysis provided`
- `can upload face image`
- `can select saved face`
- `can customize text and colors`
- `shows progress during generation`
- `shows result on completion`

---

## IMPLEMENTATION PHASES

### Phase 1: Database & Backend Schema ✅
- [x] Create migration 049_thumbnail_recreation.sql
- [x] Create thumbnail_recreations table
- [x] Create user_face_assets table
- [x] Add RLS policies
- [x] Add indexes

### Phase 2: Backend Service ✅
- [x] Create thumbnail_recreate_service.py
- [x] Implement recreate() method
- [x] Implement get_status() method
- [x] Implement get_history() method
- [x] Implement _build_recreation_prompt()
- [x] Implement _get_face_data()

### Phase 3: Backend API Routes ✅
- [x] Create thumbnail_recreate.py routes
- [x] POST /thumbnails/recreate
- [x] GET /thumbnails/recreate/{id}
- [x] GET /thumbnails/recreations
- [x] GET /thumbnails/faces
- [x] POST /thumbnails/faces
- [x] DELETE /thumbnails/faces/{id}
- [x] Add usage limit checks

### Phase 4: Backend Schemas ✅
- [x] Create thumbnail_recreate.py schemas
- [x] RecreateRequest
- [x] RecreateResponse
- [x] RecreationStatusResponse
- [x] RecreationHistoryItem/Response
- [x] FaceAsset/FaceAssetsResponse
- [x] UploadFaceRequest/Response

### Phase 5: Frontend Types ✅
- [x] Create thumbnailRecreate.ts types
- [x] All interfaces matching backend
- [x] Proper optional/nullable handling

### Phase 6: Frontend Hooks ✅
- [x] Create useThumbnailRecreate.ts
- [x] useRecreateThumbnail mutation
- [x] useRecreationStatus query
- [x] useRecreationHistory query
- [x] useFaceAssets query
- [x] useUploadFace mutation
- [x] useDeleteFace mutation
- [x] Transform functions

### Phase 7: Frontend UI ✅
- [x] Create recreate/page.tsx
- [x] Step wizard implementation
- [x] Face upload component
- [x] Brand kit integration
- [x] Status polling
- [x] Result display

### Phase 8: Testing ✅
- [x] Backend unit tests (18 tests)
- [x] Backend integration tests (20 tests)
- [x] Frontend type tests
- [x] Frontend hooks tests

---

## ERROR HANDLING

### Backend Errors
```python
# 400 Bad Request
raise HTTPException(
    status_code=400,
    detail="Face image required. Provide face_image_base64 or face_asset_id."
)

# 404 Not Found
raise HTTPException(status_code=404, detail="Face asset not found")

# 429 Too Many Requests
raise HTTPException(
    status_code=429,
    detail={
        "error": "CREATION_LIMIT_REACHED",
        "message": f"You've used all {usage.limit} creations this month",
        ...
    }
)

# 500 Internal Server Error
raise HTTPException(status_code=500, detail="Recreation failed")
```

### Frontend Error Handling
```typescript
const { mutate: recreate, error } = useRecreateThumbnail();

// In component
if (error) {
  // Show error toast or inline message
  toast.error(error.message || 'Recreation failed');
}
```

---

## SECURITY CONSIDERATIONS

1. **Authentication:** All endpoints require JWT authentication
2. **Authorization:** RLS policies ensure users only access their own data
3. **File Validation:** Face uploads validated for type and size (max 10MB)
4. **Rate Limiting:** Usage limits prevent abuse
5. **Input Sanitization:** Pydantic validates all inputs

---

## CHECKLIST FOR CHANGES

Before modifying this feature, verify:

- [ ] Backend schema matches frontend type
- [ ] Optional fields marked optional on both sides
- [ ] Nullable fields use `| null` in TypeScript
- [ ] snake_case ↔ camelCase transformation handled
- [ ] Query keys updated if adding new queries
- [ ] Usage limits checked for new creation endpoints
- [ ] RLS policies cover new tables/columns
- [ ] Tests updated/added
- [ ] Linting passes (`ruff check`, `npm run lint`)
- [ ] Type checking passes (`npx tsc --noEmit`)

---

*This schema is the definitive reference for Thumbnail Recreation feature. All agents should reference this document when making changes.*
