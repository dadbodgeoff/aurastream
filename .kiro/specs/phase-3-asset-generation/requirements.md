# Phase 3: Asset Generation Core — Requirements

## Overview

Phase 3 implements the core asset generation system for Streamer Studio. This includes the prompt template system, Nano Banana AI integration, storage service, generation job management, and generation worker.

**Duration:** Weeks 4-5
**Dependencies:** Phase 2 Brand Kit (COMPLETE ✅)

---

## Functional Requirements

### 3.1 Prompt Template System
- FR-3.1.1: Load YAML prompt templates from `prompts/` directory
- FR-3.1.2: Support template versioning (e.g., v1.0, v1.1)
- FR-3.1.3: Inject brand kit values (colors, fonts, tone) into placeholders
- FR-3.1.4: Sanitize user input to prevent prompt injection
- FR-3.1.5: Append quality modifiers to prompts
- FR-3.1.6: Support 5 asset types: thumbnail, overlay, banner, story_graphic, clip_cover

### 3.2 Nano Banana AI Client
- FR-3.2.1: Async HTTP client for Nano Banana API
- FR-3.2.2: Implement exponential backoff retry (1s, 2s, 4s, max 3 retries)
- FR-3.2.3: Handle rate limit errors (429) with Retry-After header
- FR-3.2.4: Handle content policy errors gracefully
- FR-3.2.5: Implement request timeout handling (30s default)

### 3.3 Storage Service
- FR-3.3.1: Upload generated assets to Supabase `assets` bucket
- FR-3.3.2: Generate public URLs for public assets
- FR-3.3.3: Generate signed URLs for private assets (1-hour expiry)
- FR-3.3.4: Delete assets from storage
- FR-3.3.5: Support visibility toggle (public/private)

### 3.4 Generation Job Service
- FR-3.4.1: Create generation jobs with unique IDs
- FR-3.4.2: Implement job state machine: queued → processing → completed/failed/partial
- FR-3.4.3: Enforce asset dimensions match asset type
- FR-3.4.4: Store job metadata (user_id, brand_kit_id, asset_type, prompt)
- FR-3.4.5: Track job progress percentage

### 3.5 Generation Worker
- FR-3.5.1: Process jobs from Redis queue
- FR-3.5.2: Call Nano Banana API with constructed prompt
- FR-3.5.3: Upload generated image to storage
- FR-3.5.4: Update job status on completion/failure
- FR-3.5.5: Store asset metadata (dimensions, file_size, url, etc.)

### 3.6 Generation API Endpoints
- FR-3.6.1: `POST /api/v1/generate` - Create generation job
- FR-3.6.2: `GET /api/v1/jobs/{id}` - Get job status and progress
- FR-3.6.3: `GET /api/v1/jobs/{id}/assets` - Get generated assets
- FR-3.6.4: `GET /api/v1/jobs` - List jobs (paginated, filterable)

### 3.7 Asset API Endpoints
- FR-3.7.1: `GET /api/v1/assets` - List assets (paginated, filterable by type)
- FR-3.7.2: `GET /api/v1/assets/{id}` - Get asset details
- FR-3.7.3: `DELETE /api/v1/assets/{id}` - Delete asset
- FR-3.7.4: `PUT /api/v1/assets/{id}/visibility` - Toggle public/private
- FR-3.7.5: `GET /asset/{asset_id}` - Public asset access (no auth)

---

## Non-Functional Requirements

### Performance
- NFR-3.1: Generation job creation < 100ms
- NFR-3.2: Job status polling < 50ms
- NFR-3.3: Asset list query < 200ms (paginated)

### Reliability
- NFR-3.4: Retry failed API calls up to 3 times
- NFR-3.5: Queue jobs survive worker restarts
- NFR-3.6: Graceful degradation on AI service unavailability

### Security
- NFR-3.7: Validate user owns job before status access
- NFR-3.8: Validate user owns asset before modification
- NFR-3.9: Sanitize all user input in prompts

---

## Asset Type Specifications

| Asset Type | Dimensions | Use Case |
|------------|------------|----------|
| thumbnail | 1280x720 | YouTube/Twitch thumbnails |
| overlay | 1920x1080 | Stream overlays |
| banner | 1200x480 | Channel banners |
| story_graphic | 1080x1920 | Instagram/TikTok stories |
| clip_cover | 1080x1080 | Social media clip covers |

---

## Property Tests Required

- **Property 7**: Asset Dimensions Match Type
- **Property 8**: Prompt Contains Brand Kit Values
- **Property 9**: Job State Machine Validity
- **Property 13**: Retry Count Limit

---

## Acceptance Criteria

1. User can request asset generation with custom prompt
2. System constructs prompt using brand kit and template
3. Generation job is queued and processed asynchronously
4. User can poll job status until completion
5. Generated assets are stored and accessible via URL
6. User can list, view, and delete their assets
7. Public assets are accessible without authentication
8. All property tests pass with 100+ iterations
