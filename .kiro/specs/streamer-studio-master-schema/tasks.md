# Implementation Plan: Streamer Studio Master Schema

## Overview

This task list implements the Streamer Studio platform across 8 phases over 10 weeks. Each phase has a verification gate that MUST pass before proceeding. Tasks are ordered for incremental progress with no orphaned code.

**Parallel Development**: TSX (Next.js + React Native) and Swift implementations proceed in parallel, sharing the same backend endpoints.

**Testing Requirements**: Property tests use Hypothesis (Python) and fast-check (TypeScript). All property tests run 100+ iterations.

---

## Tasks

### Phase 0: Foundation (Week 1)

- [ ] 1. Initialize backend project structure
  - [ ] 1.1 Create FastAPI project with directory structure per design spec
    - Create `api/`, `services/`, `workers/`, `database/`, `tests/` directories
    - Set up `main.py` with app factory pattern
    - Configure `config.py` with Pydantic settings
    - _Requirements: Foundation_
  - [ ] 1.2 Set up environment configuration
    - Create `.env.example` with all canonical variables
    - Implement environment validation on startup
    - _Requirements: Foundation_
  - [ ] 1.3 Implement health check endpoint
    - `GET /health` returns status, version, timestamp
    - _Requirements: 15.2_
  - [ ] 1.4 Set up Docker and docker-compose
    - Dockerfile for FastAPI app
    - docker-compose with Redis service
    - _Requirements: Foundation_

- [ ] 2. Initialize Supabase project and database
  - [ ] 2.1 Create Supabase project and configure connection
    - Set up project in Supabase dashboard
    - Configure connection in `database/supabase_client.py`
    - _Requirements: Foundation_
  - [ ] 2.2 Create all database tables per schema
    - Run migrations for: users, brand_kits, generation_jobs, assets, platform_connections, subscriptions
    - Create indexes for performance
    - _Requirements: Foundation_
  - [ ] 2.3 Configure Supabase Storage buckets
    - Create `assets` bucket (public)
    - Create `uploads` bucket (private)
    - Create `logos` bucket (private)
    - Set up RLS policies per design spec
    - _Requirements: 6.1, 6.2_

- [ ] 3. Initialize TSX monorepo structure
  - [ ] 3.1 Set up Turborepo with apps and packages
    - Create `apps/web` (Next.js 14)
    - Create `apps/mobile` (Expo)
    - Create `packages/ui`, `packages/api-client`, `packages/shared`
    - _Requirements: 12.1_
  - [ ] 3.2 Implement design token system
    - Create all token files per Appendix E
    - Export from `packages/ui/src/tokens`
    - _Requirements: 12.6_
  - [ ] 3.3 Set up testing infrastructure
    - Configure Vitest with fast-check
    - Create test utilities and fixtures
    - _Requirements: 13.2_

- [ ] 4. Initialize Swift project structure
  - [ ] 4.1 Create Xcode project with feature-based architecture
    - Set up `Features/`, `Core/`, `Design/` directories
    - Configure SwiftUI app entry point
    - _Requirements: 12.1_
  - [ ] 4.2 Implement design tokens in Swift
    - Create `Design/Tokens/` with colors, typography, spacing
    - Match TSX token values exactly
    - _Requirements: 12.6_
  - [ ] 4.3 Set up XCTest with SwiftCheck
    - Configure property testing
    - Create test utilities
    - _Requirements: 13.2_

- [ ] 5. Set up CI/CD pipeline
  - [ ] 5.1 Create GitHub Actions workflows
    - Backend: lint, type check, test, build
    - TSX: lint, type check, test, build
    - Swift: build, test
    - _Requirements: Foundation_

- [ ] 6. Checkpoint - Phase 0 Verification Gate
  - All projects build without errors
  - Database migrations run successfully
  - Health check returns 200
  - Design tokens compile on all platforms


---

### Phase 1: Authentication (Week 2)

- [ ] 7. Implement backend authentication service
  - [ ] 7.1 Create JWT token service
    - Implement `create_access_token()`, `create_refresh_token()`, `decode_token()`
    - Configure 24-hour access token expiration
    - _Requirements: 1.3, 1.4_
  - [ ] 7.2 Implement password hashing service
    - Use bcrypt with cost factor 12
    - Implement `hash_password()`, `verify_password()`
    - _Requirements: 14.6_
  - [ ] 7.3 Create auth middleware
    - Implement `get_current_user()` dependency
    - Support both cookie and header auth
    - _Requirements: 1.8_
  - [ ] 7.4 Write property tests for auth service
    - **Property 1: JWT Token Round-Trip**
    - **Property 2: Password Hash Verification**
    - **Property 3: Expired Token Rejection**
    - **Validates: Requirements 1.3, 1.4, 1.6, 14.6**

- [ ] 8. Implement auth API endpoints
  - [ ] 8.1 Create signup endpoint
    - `POST /api/v1/auth/signup` with email/password
    - Validate email format, password strength
    - Create user in database
    - _Requirements: 1.1_
  - [ ] 8.2 Create login endpoint
    - `POST /api/v1/auth/login` with email/password
    - Return access and refresh tokens
    - Set HTTP-only cookie for web
    - _Requirements: 1.3_
  - [ ] 8.3 Create logout endpoint
    - `POST /api/v1/auth/logout`
    - Clear auth cookies
    - _Requirements: 1.5_
  - [ ] 8.4 Create token refresh endpoint
    - `POST /api/v1/auth/refresh`
    - Accept refresh token, return new access token
    - _Requirements: 1.4_
  - [ ] 8.5 Create get current user endpoint
    - `GET /api/v1/auth/me`
    - Return user profile
    - _Requirements: 1.8_
  - [ ] 8.6 Write unit tests for all auth endpoints
    - Test happy paths and error cases
    - Test validation errors (422)
    - Test auth errors (401)
    - _Requirements: 1.1-1.8_

- [ ] 9. Implement OAuth providers
  - [ ] 9.1 Create OAuth service base
    - Abstract OAuth flow (initiate, callback, token exchange)
    - _Requirements: 1.2_
  - [ ] 9.2 Implement Google OAuth
    - `POST /api/v1/auth/oauth/google`
    - `GET /api/v1/auth/oauth/google/callback`
    - _Requirements: 1.2_
  - [ ] 9.3 Implement Twitch OAuth
    - `POST /api/v1/auth/oauth/twitch`
    - `GET /api/v1/auth/oauth/twitch/callback`
    - _Requirements: 1.2_
  - [ ] 9.4 Implement Discord OAuth
    - `POST /api/v1/auth/oauth/discord`
    - `GET /api/v1/auth/oauth/discord/callback`
    - _Requirements: 1.2_
  - [ ] 9.5 Write integration tests for OAuth flows
    - Mock OAuth providers
    - Test full flow: initiate → callback → token
    - _Requirements: 1.2_

- [ ] 10. Implement TSX auth UI and hooks
  - [ ] 10.1 Create API client auth methods
    - `api.auth.signup()`, `login()`, `logout()`, `me()`
    - _Requirements: 12.1_
  - [ ] 10.2 Create auth store (Zustand)
    - User state, isAuthenticated, login/logout actions
    - _Requirements: 12.3_
  - [ ] 10.3 Create auth screens (web)
    - Login page, Signup page, Forgot password
    - _Requirements: 12.1_
  - [ ] 10.4 Create auth screens (mobile)
    - Login screen, Signup screen
    - _Requirements: 12.1_
  - [ ] 10.5 Write component tests for auth screens
    - Test form validation
    - Test error states
    - _Requirements: 13.3_

- [ ] 11. Implement Swift auth UI and services
  - [ ] 11.1 Create APIClient auth endpoints
    - AuthEndpoint enum with all auth routes
    - _Requirements: 12.1_
  - [ ] 11.2 Create AuthViewModel
    - @Observable with login/logout/refresh
    - _Requirements: 12.3_
  - [ ] 11.3 Create auth views
    - LoginView, SignupView
    - _Requirements: 12.1_
  - [ ] 11.4 Write unit tests for auth
    - Test AuthViewModel state transitions
    - _Requirements: 13.3_

- [ ] 12. Checkpoint - Phase 1 Verification Gate
  - Property tests pass (100 iterations each)
  - Unit tests for all auth endpoints pass
  - Integration test: OAuth flow with mocked provider
  - E2E test: Signup → Login → Access protected → Logout
  - TSX web: Auth screens functional
  - TSX mobile: Auth screens functional
  - Swift: Auth screens functional

---

### Phase 2: Brand Kit (Week 3)

- [ ] 13. Implement brand kit service
  - [ ] 13.1 Create brand kit validation
    - Hex color validation (regex pattern)
    - Font name validation (against supported list)
    - Color array bounds (1-5 primary, 0-3 accent)
    - _Requirements: 2.7, 2.8_
  - [ ] 13.2 Create brand kit CRUD operations
    - Create, read, update, delete in Supabase
    - Enforce one active brand kit per user
    - _Requirements: 2.2, 2.3_
  - [ ] 13.3 Implement brand kit activation
    - Deactivate current, activate new
    - _Requirements: 2.5_
  - [ ] 13.4 Write property tests for brand kit
    - **Property 4: Hex Color Validation**
    - **Property 5: Brand Kit Serialization Round-Trip**
    - **Property 6: Brand Kit Color Array Bounds**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.7, 2.8**

- [ ] 14. Implement brand kit API endpoints
  - [ ] 14.1 Create list brand kits endpoint
    - `GET /api/v1/brand-kits`
    - Return user's brand kits
    - _Requirements: 2.2_
  - [ ] 14.2 Create brand kit endpoint
    - `POST /api/v1/brand-kits`
    - Validate and create brand kit
    - _Requirements: 2.2_
  - [ ] 14.3 Create get/update/delete endpoints
    - `GET /api/v1/brand-kits/{id}`
    - `PUT /api/v1/brand-kits/{id}`
    - `DELETE /api/v1/brand-kits/{id}`
    - _Requirements: 2.3_
  - [ ] 14.4 Create activate endpoint
    - `POST /api/v1/brand-kits/{id}/activate`
    - _Requirements: 2.5_
  - [ ] 14.5 Write unit tests for brand kit endpoints
    - Test CRUD operations
    - Test validation errors
    - _Requirements: 2.2-2.8_

- [ ] 15. Implement brand kit extraction (Vision AI)
  - [ ] 15.1 Create brand analyzer service
    - Accept uploaded images/clips
    - Extract dominant colors using Vision AI
    - Detect typography styles
    - Determine design tone
    - _Requirements: 2.1_
  - [ ] 15.2 Create analyze endpoint
    - `POST /api/v1/brand-kits/analyze`
    - Accept multipart file uploads
    - Return extracted brand kit data
    - _Requirements: 2.1_
  - [ ] 15.3 Write integration test for extraction
    - Test with sample images
    - Verify output format
    - _Requirements: 2.1_

- [ ] 16. Implement TSX brand kit UI
  - [ ] 16.1 Create BrandKitEditor component
    - Color pickers, font selectors, tone dropdown
    - Logo upload
    - _Requirements: 12.1_
  - [ ] 16.2 Create brand kit list view
    - Display all brand kits
    - Activate/delete actions
    - _Requirements: 12.1_
  - [ ] 16.3 Create brand kit hooks
    - `useBrandKits()`, `useBrandKit()`, `useCreateBrandKit()`
    - _Requirements: 12.1_
  - [ ] 16.4 Write component tests
    - Test BrandKitEditor validation
    - _Requirements: 13.3_

- [ ] 17. Implement Swift brand kit UI
  - [ ] 17.1 Create BrandKitEditorView
    - SwiftUI form with color pickers
    - _Requirements: 12.1_
  - [ ] 17.2 Create BrandKitListView
    - List with swipe actions
    - _Requirements: 12.1_
  - [ ] 17.3 Create BrandKitViewModel
    - CRUD operations
    - _Requirements: 12.1_
  - [ ] 17.4 Write unit tests
    - Test ViewModel state
    - _Requirements: 13.3_

- [ ] 18. Checkpoint - Phase 2 Verification Gate
  - Property tests pass (100 iterations each)
  - Unit tests for all brand kit endpoints pass
  - Integration test: Upload → Extract → Create brand kit
  - E2E test: Create → Activate → Verify in generation context
  - TSX: Brand kit UI functional
  - Swift: Brand kit UI functional


---

### Phase 3: Asset Generation Core (Weeks 4-5)

- [ ] 19. Implement prompt template system
  - [ ] 19.1 Create prompt template loader
    - Load YAML templates from `prompts/` directory
    - Support versioning
    - _Requirements: 9.1_
  - [ ] 19.2 Create prompt engine
    - Placeholder injection from brand kit
    - Input sanitization
    - Quality modifier appending
    - _Requirements: 9.2, 9.3, 9.4_
  - [ ] 19.3 Create default templates
    - Thumbnail template (v1.0)
    - Overlay template (v1.0)
    - Banner template (v1.0)
    - Story graphic template (v1.0)
    - Clip cover template (v1.0)
    - _Requirements: 9.1_
  - [ ] 19.4 Write property tests for prompt engine
    - **Property 8: Prompt Contains Brand Kit Values**
    - **Validates: Requirements 2.5, 3.6, 9.2**

- [ ] 20. Implement Nano Banana client
  - [ ] 20.1 Create Nano Banana API client
    - Async HTTP client with aiohttp
    - Request/response handling per Appendix B
    - _Requirements: 3.2_
  - [ ] 20.2 Implement retry logic
    - Exponential backoff (1s, 2s, 4s)
    - Max 3 retries
    - _Requirements: 3.7_
  - [ ] 20.3 Implement error handling
    - Rate limit errors (429)
    - Content policy errors
    - Timeout handling
    - _Requirements: 3.7, 3.8_
  - [ ] 20.4 Write property tests for retry logic
    - **Property 13: Retry Count Limit**
    - **Validates: Requirements 3.7**
  - [ ] 20.5 Write unit tests with mocked API
    - Test successful generation
    - Test error scenarios
    - _Requirements: 3.2, 3.7, 3.8_

- [ ] 21. Implement storage service
  - [ ] 21.1 Create Supabase storage client
    - Upload to `assets` bucket
    - Generate public URLs
    - Generate shareable URLs
    - _Requirements: 6.1, 6.2_
  - [ ] 21.2 Implement asset deletion
    - Remove from storage
    - _Requirements: 6.6_
  - [ ] 21.3 Implement signed URL generation
    - For private assets
    - _Requirements: 6.4_
  - [ ] 21.4 Write unit tests for storage
    - Test upload/delete operations
    - Test URL generation
    - _Requirements: 6.1-6.6_

- [ ] 22. Implement generation job service
  - [ ] 22.1 Create job state machine
    - States: queued, processing, completed, failed, partial
    - Valid transitions per design
    - _Requirements: 3.4_
  - [ ] 22.2 Create job CRUD operations
    - Create job, update status, get job
    - _Requirements: 3.1, 3.4_
  - [ ] 22.3 Implement asset dimension enforcement
    - Validate dimensions match asset type
    - _Requirements: 3.5_
  - [ ] 22.4 Write property tests for job service
    - **Property 7: Asset Dimensions Match Type**
    - **Property 9: Job State Machine Validity**
    - **Validates: Requirements 3.4, 3.5**

- [ ] 23. Implement generation worker
  - [ ] 23.1 Set up Redis queue
    - Configure RQ with generation queue
    - _Requirements: 3.2_
  - [ ] 23.2 Create generation worker
    - Process job from queue
    - Call Nano Banana API
    - Upload to storage
    - Update job status
    - _Requirements: 3.2, 3.3, 3.4_
  - [ ] 23.3 Implement asset metadata storage
    - Store all required fields per schema
    - _Requirements: 3.9_
  - [ ] 23.4 Write integration tests for worker
    - Test full generation pipeline (mocked API)
    - _Requirements: 3.1-3.9_

- [ ] 24. Implement generation API endpoints
  - [ ] 24.1 Create generation endpoint
    - `POST /api/v1/generate`
    - Validate request, create job, enqueue
    - Return job_id immediately
    - _Requirements: 3.1_
  - [ ] 24.2 Create job status endpoint
    - `GET /api/v1/jobs/{id}`
    - Return status, progress, assets
    - _Requirements: 10.1, 10.2_
  - [ ] 24.3 Create job assets endpoint
    - `GET /api/v1/jobs/{id}/assets`
    - Return generated assets
    - _Requirements: 3.9_
  - [ ] 24.4 Create jobs list endpoint
    - `GET /api/v1/jobs`
    - Paginated, filterable
    - _Requirements: 10.7_
  - [ ] 24.5 Write unit tests for generation endpoints
    - Test job creation
    - Test status polling
    - _Requirements: 3.1, 10.1, 10.2_

- [ ] 25. Implement asset API endpoints
  - [ ] 25.1 Create assets list endpoint
    - `GET /api/v1/assets`
    - Paginated, filterable by type
    - _Requirements: 6.1_
  - [ ] 25.2 Create asset detail endpoint
    - `GET /api/v1/assets/{id}`
    - _Requirements: 6.1_
  - [ ] 25.3 Create asset delete endpoint
    - `DELETE /api/v1/assets/{id}`
    - Remove from storage
    - _Requirements: 6.6_
  - [ ] 25.4 Create visibility toggle endpoint
    - `PUT /api/v1/assets/{id}/visibility`
    - Toggle public/private
    - _Requirements: 6.3, 6.4_
  - [ ] 25.5 Create public asset access
    - `GET /asset/{asset_id}` (no auth)
    - Serve public assets directly
    - _Requirements: 6.3_
  - [ ] 25.6 Write unit tests for asset endpoints
    - Test CRUD operations
    - Test visibility toggle
    - _Requirements: 6.1-6.6_

- [ ] 26. Implement TSX generation UI
  - [ ] 26.1 Create GenerationProgress component
    - Per Appendix E spec
    - _Requirements: 12.1_
  - [ ] 26.2 Create AssetCard component
    - Grid, list, compact variants
    - _Requirements: 12.1_
  - [ ] 26.3 Create generation form
    - Asset type selector
    - Custom prompt input
    - Brand kit selector
    - _Requirements: 12.1_
  - [ ] 26.4 Create generation hooks
    - `useGenerationJob()` with polling
    - `useAssets()`
    - _Requirements: 12.1_
  - [ ] 26.5 Create asset gallery view
    - Grid of AssetCards
    - Filter by type
    - _Requirements: 12.1_
  - [ ] 26.6 Write component tests
    - Test GenerationProgress states
    - _Requirements: 13.3_

- [ ] 27. Implement Swift generation UI
  - [ ] 27.1 Create GenerationProgressView
    - Match TSX component
    - _Requirements: 12.1_
  - [ ] 27.2 Create AssetCardView
    - All variants
    - _Requirements: 12.1_
  - [ ] 27.3 Create GenerationViewModel
    - Job creation, polling
    - _Requirements: 12.1_
  - [ ] 27.4 Create AssetGalleryView
    - Grid layout
    - _Requirements: 12.1_
  - [ ] 27.5 Write unit tests
    - Test ViewModel state
    - _Requirements: 13.3_

- [ ] 28. Checkpoint - Phase 3 Verification Gate
  - Property tests pass (100 iterations each)
  - Unit tests for all endpoints pass
  - Integration test: Create job → Process → Store asset → Return URL
  - E2E test: Request generation → Poll status → View completed asset
  - TSX: Generation UI functional
  - Swift: Generation UI functional


---

### Phase 4: Batch Generation (Week 6)

- [ ] 29. Implement batch generation service
  - [ ] 29.1 Create batch job creation
    - Create parent job with child jobs
    - Validate batch size (max 15)
    - _Requirements: 4.1, 4.2, 4.5_
  - [ ] 29.2 Implement concurrent processing
    - Semaphore for max 5 concurrent per user
    - _Requirements: 4.3_
  - [ ] 29.3 Implement progress aggregation
    - Calculate (completed + failed) / total
    - _Requirements: 4.7_
  - [ ] 29.4 Implement partial success handling
    - Continue on child failure
    - Report partial status
    - _Requirements: 4.8_
  - [ ] 29.5 Write property tests for batch
    - **Property 10: Batch Progress Calculation**
    - **Property 11: Batch Concurrent Limit**
    - **Property 12: Batch Size Limit**
    - **Validates: Requirements 4.3, 4.5, 4.7**

- [ ] 30. Implement variation generation
  - [ ] 30.1 Create variation prompt perturbation
    - Generate N variations with different hooks
    - _Requirements: 4.6_
  - [ ] 30.2 Integrate with batch system
    - Variations as child jobs
    - _Requirements: 4.6_
  - [ ] 30.3 Write unit tests for variations
    - Test prompt differences
    - _Requirements: 4.6_

- [ ] 31. Implement batch API endpoints
  - [ ] 31.1 Create batch generation endpoint
    - `POST /api/v1/generate/batch`
    - Accept array of asset specs
    - _Requirements: 4.1_
  - [ ] 31.2 Update job status endpoint for batch
    - Include child job progress
    - _Requirements: 4.7_
  - [ ] 31.3 Write unit tests for batch endpoints
    - Test batch creation
    - Test progress reporting
    - _Requirements: 4.1-4.8_

- [ ] 32. Implement batch worker
  - [ ] 32.1 Create batch job processor
    - Process children with concurrency limit
    - Aggregate results
    - _Requirements: 4.3, 4.4_
  - [ ] 32.2 Implement webhook notifications
    - Notify on each child (optional)
    - Notify on batch complete
    - _Requirements: 10.3_
  - [ ] 32.3 Write integration tests for batch worker
    - Test concurrent processing
    - Test partial failure
    - _Requirements: 4.3, 4.4, 4.8_

- [ ] 33. Implement TSX batch UI
  - [ ] 33.1 Create batch generation form
    - Add multiple asset specs
    - _Requirements: 12.1_
  - [ ] 33.2 Update GenerationProgress for batch
    - Show child progress
    - _Requirements: 12.1_
  - [ ] 33.3 Create batch result view
    - Display all generated assets
    - _Requirements: 12.1_
  - [ ] 33.4 Write component tests
    - Test batch progress display
    - _Requirements: 13.3_

- [ ] 34. Implement Swift batch UI
  - [ ] 34.1 Create BatchGenerationView
    - Multi-asset form
    - _Requirements: 12.1_
  - [ ] 34.2 Update progress views for batch
    - Child progress indicators
    - _Requirements: 12.1_
  - [ ] 34.3 Write unit tests
    - Test batch ViewModel
    - _Requirements: 13.3_

- [ ] 35. Checkpoint - Phase 4 Verification Gate
  - Property tests pass (100 iterations each)
  - Unit tests for batch endpoints pass
  - Integration test: Create batch → Process children → Aggregate results
  - E2E test: Request 5-asset batch → Track progress → View all assets
  - TSX: Batch UI functional
  - Swift: Batch UI functional

---

### Phase 5: Platform Integration (Week 7)

- [ ] 36. Implement Twitch integration
  - [ ] 36.1 Create Twitch OAuth client
    - Per Appendix C spec
    - _Requirements: 5.1_
  - [ ] 36.2 Implement token storage
    - Encrypt tokens at rest (AES-256)
    - _Requirements: 5.1, 14.1_
  - [ ] 36.3 Implement metadata fetching
    - Channel info, clips, stream status
    - _Requirements: 5.3_
  - [ ] 36.4 Implement token refresh
    - Auto-refresh before expiration
    - _Requirements: 5.6_
  - [ ] 36.5 Write property tests for token encryption
    - **Property 20: OAuth Token Encryption Round-Trip**
    - **Validates: Requirements 14.1**

- [ ] 37. Implement YouTube integration
  - [ ] 37.1 Create YouTube OAuth client
    - Per Appendix C spec
    - _Requirements: 5.2_
  - [ ] 37.2 Implement metadata fetching
    - Channel info, recent videos
    - _Requirements: 5.4_
  - [ ] 37.3 Implement token refresh
    - Auto-refresh before expiration
    - _Requirements: 5.6_
  - [ ] 37.4 Write unit tests for YouTube client
    - Mock API responses
    - _Requirements: 5.2, 5.4_

- [ ] 38. Implement platform service
  - [ ] 38.1 Create metadata caching
    - Cache with 30-minute TTL
    - _Requirements: 5.7_
  - [ ] 38.2 Implement fallback on API failure
    - Return cached data on error
    - _Requirements: 5.7_
  - [ ] 38.3 Implement platform-aware prompt enhancement
    - Inject game category, stream title
    - _Requirements: 5.5, 9.5_
  - [ ] 38.4 Write integration tests for platform service
    - Test caching behavior
    - Test fallback
    - _Requirements: 5.5, 5.7_

- [ ] 39. Implement platform API endpoints
  - [ ] 39.1 Create list platforms endpoint
    - `GET /api/v1/platforms`
    - _Requirements: 5.1, 5.2_
  - [ ] 39.2 Create connect endpoints
    - `POST /api/v1/platforms/{platform}/connect`
    - `GET /api/v1/platforms/{platform}/callback`
    - _Requirements: 5.1, 5.2_
  - [ ] 39.3 Create disconnect endpoint
    - `DELETE /api/v1/platforms/{platform}/disconnect`
    - _Requirements: 5.8_
  - [ ] 39.4 Create metadata endpoint
    - `GET /api/v1/platforms/{platform}/metadata`
    - _Requirements: 5.3, 5.4_
  - [ ] 39.5 Write unit tests for platform endpoints
    - Test OAuth flows
    - Test metadata retrieval
    - _Requirements: 5.1-5.8_

- [ ] 40. Implement TSX platform UI
  - [ ] 40.1 Create platform connection cards
    - Connect/disconnect buttons
    - Status indicators
    - _Requirements: 12.1_
  - [ ] 40.2 Create platform metadata display
    - Show channel info, recent content
    - _Requirements: 12.1_
  - [ ] 40.3 Integrate with generation form
    - "Generate for Today's Stream" button
    - _Requirements: 5.5_
  - [ ] 40.4 Write component tests
    - Test connection states
    - _Requirements: 13.3_

- [ ] 41. Implement Swift platform UI
  - [ ] 41.1 Create PlatformConnectionView
    - OAuth flow handling
    - _Requirements: 12.1_
  - [ ] 41.2 Create PlatformMetadataView
    - Display channel info
    - _Requirements: 12.1_
  - [ ] 41.3 Write unit tests
    - Test ViewModel state
    - _Requirements: 13.3_

- [ ] 42. Checkpoint - Phase 5 Verification Gate
  - Property tests pass (100 iterations each)
  - Unit tests for platform endpoints pass
  - Integration test: Connect platform → Fetch metadata → Cache
  - Integration test: Token expiry → Auto-refresh → Verify access
  - E2E test: Connect Twitch → Generate with stream context → Verify prompt includes metadata
  - TSX: Platform UI functional
  - Swift: Platform UI functional


---

### Phase 6: Viral Optimization (Week 8)

- [ ] 43. Implement viral scoring service
  - [ ] 43.1 Create scoring algorithm
    - Analyze text readability, color contrast, face presence, composition
    - Return score 0-100
    - _Requirements: 7.1, 7.2_
  - [ ] 43.2 Implement suggestion generation
    - Generate suggestions when score < 70
    - Include reasoning for each
    - _Requirements: 7.3, 7.6_
  - [ ] 43.3 Implement score history tracking
    - Store scores over time
    - _Requirements: 7.7_
  - [ ] 43.4 Write property tests for viral scoring
    - **Property 15: Viral Score Bounds**
    - **Property 16: Low Score Generates Suggestions**
    - **Validates: Requirements 7.1, 7.3**

- [ ] 44. Implement A/B variation generation
  - [ ] 44.1 Create variation strategies
    - Different hook styles (urgency, curiosity, achievement)
    - _Requirements: 7.4_
  - [ ] 44.2 Integrate with generation system
    - Generate 3 variations automatically
    - _Requirements: 7.4_
  - [ ] 44.3 Write unit tests for variations
    - Test strategy application
    - _Requirements: 7.4_

- [ ] 45. Implement viral API endpoints
  - [ ] 45.1 Create score endpoint
    - `POST /api/v1/assets/{id}/score`
    - Trigger scoring job
    - _Requirements: 7.1_
  - [ ] 45.2 Update asset response with score
    - Include viral_score and suggestions
    - _Requirements: 7.1, 7.3_
  - [ ] 45.3 Write unit tests for viral endpoints
    - Test scoring flow
    - _Requirements: 7.1-7.7_

- [ ] 46. Implement scoring worker
  - [ ] 46.1 Create scoring job processor
    - Analyze asset image
    - Compute component scores
    - _Requirements: 7.2_
  - [ ] 46.2 Implement Vision AI integration
    - Use for image analysis
    - _Requirements: 7.2_
  - [ ] 46.3 Write integration tests for scoring
    - Test with sample images
    - _Requirements: 7.1, 7.2_

- [ ] 47. Implement TSX viral UI
  - [ ] 47.1 Create ViralScoreDisplay component
    - Per Appendix E spec
    - _Requirements: 12.1_
  - [ ] 47.2 Create suggestions panel
    - Display improvement recommendations
    - _Requirements: 12.1_
  - [ ] 47.3 Create A/B comparison view
    - Side-by-side variations
    - _Requirements: 12.1_
  - [ ] 47.4 Write component tests
    - Test score display states
    - _Requirements: 13.3_

- [ ] 48. Implement Swift viral UI
  - [ ] 48.1 Create ViralScoreView
    - Circular progress, suggestions
    - _Requirements: 12.1_
  - [ ] 48.2 Create VariationComparisonView
    - Side-by-side display
    - _Requirements: 12.1_
  - [ ] 48.3 Write unit tests
    - Test ViewModel state
    - _Requirements: 13.3_

- [ ] 49. Checkpoint - Phase 6 Verification Gate
  - Property tests pass (100 iterations each)
  - Unit tests for viral endpoints pass
  - Integration test: Generate asset → Score → Get suggestions
  - E2E test: Generate thumbnail → View score → Request variations → Compare
  - TSX: Viral UI functional
  - Swift: Viral UI functional

---

### Phase 7: Subscription & Billing (Week 9)

- [ ] 50. Implement subscription service
  - [ ] 50.1 Create tier configuration
    - Free: 5 assets/mo, 1 platform
    - Pro: 100 assets/mo, 3 platforms
    - Studio: unlimited, all platforms
    - _Requirements: 8.1_
  - [ ] 50.2 Implement limit enforcement
    - Check usage before generation
    - Block when limit exceeded
    - _Requirements: 8.2, 8.3_
  - [ ] 50.3 Implement usage tracking
    - Increment on generation
    - Reset on period renewal
    - _Requirements: 8.8_
  - [ ] 50.4 Write property tests for subscriptions
    - **Property 14: Subscription Limit Enforcement**
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [ ] 51. Implement Stripe integration
  - [ ] 51.1 Create Stripe service
    - Customer creation
    - Checkout session creation
    - Billing portal session
    - _Requirements: 8.4_
  - [ ] 51.2 Implement webhook handler
    - Handle subscription events
    - Update tier on payment
    - _Requirements: 8.4, 8.5_
  - [ ] 51.3 Implement payment failure handling
    - Retry for 3 days
    - Downgrade on failure
    - _Requirements: 8.6_
  - [ ] 51.4 Implement cancellation handling
    - Maintain access until period end
    - Downgrade after
    - _Requirements: 8.7_
  - [ ] 51.5 Write integration tests for Stripe
    - Mock Stripe API
    - Test webhook handling
    - _Requirements: 8.4-8.7_

- [ ] 52. Implement subscription API endpoints
  - [ ] 52.1 Create get subscription endpoint
    - `GET /api/v1/subscription`
    - _Requirements: 8.1_
  - [ ] 52.2 Create checkout endpoint
    - `POST /api/v1/subscription/checkout`
    - Return Stripe checkout URL
    - _Requirements: 8.4_
  - [ ] 52.3 Create portal endpoint
    - `POST /api/v1/subscription/portal`
    - Return Stripe portal URL
    - _Requirements: 8.4_
  - [ ] 52.4 Create webhook endpoint
    - `POST /api/v1/subscription/webhook`
    - Verify Stripe signature
    - _Requirements: 8.4_
  - [ ] 52.5 Create usage endpoint
    - `GET /api/v1/subscription/usage`
    - Return current usage stats
    - _Requirements: 8.8_
  - [ ] 52.6 Write unit tests for subscription endpoints
    - Test all flows
    - _Requirements: 8.1-8.8_

- [ ] 53. Implement TSX subscription UI
  - [ ] 53.1 Create pricing page
    - Tier comparison
    - Upgrade buttons
    - _Requirements: 12.1_
  - [ ] 53.2 Create usage display
    - Progress bar for limits
    - _Requirements: 12.1_
  - [ ] 53.3 Create upgrade modal
    - Shown when limit exceeded
    - _Requirements: 8.2_
  - [ ] 53.4 Integrate Stripe checkout
    - Redirect to Stripe
    - _Requirements: 8.4_
  - [ ] 53.5 Write component tests
    - Test upgrade flow
    - _Requirements: 13.3_

- [ ] 54. Implement Swift subscription UI
  - [ ] 54.1 Create SubscriptionView
    - Tier display, upgrade options
    - _Requirements: 12.1_
  - [ ] 54.2 Create UsageView
    - Usage progress
    - _Requirements: 12.1_
  - [ ] 54.3 Integrate Stripe checkout
    - Open in Safari
    - _Requirements: 8.4_
  - [ ] 54.4 Write unit tests
    - Test ViewModel state
    - _Requirements: 13.3_

- [ ] 55. Checkpoint - Phase 7 Verification Gate
  - Property tests pass (100 iterations each)
  - Unit tests for subscription endpoints pass
  - Integration test: Checkout → Webhook → Tier upgrade → Verify access
  - E2E test: Free user → Hit limit → Upgrade → Continue generating
  - TSX: Subscription UI functional
  - Swift: Subscription UI functional


---

### Phase 8: Polish & Production (Week 10)

- [ ] 56. Implement comprehensive error handling
  - [ ] 56.1 Create error code taxonomy
    - Per design spec error codes
    - _Requirements: 11.3_
  - [ ] 56.2 Implement global exception handlers
    - Hide stack traces in production
    - Return standardized error JSON
    - _Requirements: 11.3_
  - [ ] 56.3 Implement client error handling
    - User-friendly messages
    - Retry logic for transient errors
    - _Requirements: 12.5_
  - [ ] 56.4 Write property tests for error handling
    - **Property 17: API Response Envelope Format**
    - **Validates: Requirements 11.3, 11.6**

- [ ] 57. Implement rate limiting
  - [ ] 57.1 Create rate limiter middleware
    - Redis-based sliding window
    - _Requirements: 11.5_
  - [ ] 57.2 Implement tier-based limits
    - Free: 60/min, Pro: 300/min, Studio: 1000/min
    - _Requirements: 11.5_
  - [ ] 57.3 Implement 429 response with Retry-After
    - _Requirements: 11.7_
  - [ ] 57.4 Write property tests for rate limiting
    - **Property 18: Rate Limit Returns 429**
    - **Validates: Requirements 11.5, 11.7**

- [ ] 58. Implement security hardening
  - [ ] 58.1 Add security headers middleware
    - CSP, HSTS, X-Frame-Options, etc.
    - _Requirements: 14.4_
  - [ ] 58.2 Implement CSRF protection
    - For state-changing operations
    - _Requirements: 14.3_
  - [ ] 58.3 Implement input sanitization
    - Prevent injection attacks
    - _Requirements: 14.5_
  - [ ] 58.4 Implement audit logging
    - Login attempts, subscription changes, platform connections
    - _Requirements: 14.7_
  - [ ] 58.5 Write property tests for security
    - **Property 19: PII Never in Logs**
    - **Validates: Requirements 14.2**

- [ ] 59. Implement observability
  - [ ] 59.1 Create structured logging
    - Timestamp, level, request_id, user_id, message
    - _Requirements: 15.1_
  - [ ] 59.2 Implement PII filtering
    - Redact emails, tokens, passwords from logs
    - _Requirements: 14.2_
  - [ ] 59.3 Implement metrics collection
    - Request latency, generation time, error rate
    - _Requirements: 15.3_
  - [ ] 59.4 Implement distributed tracing
    - Correlation IDs across services
    - _Requirements: 15.4_
  - [ ] 59.5 Configure alerting
    - Error rate > 1%, p99 > 5s, queue depth > 100
    - _Requirements: 15.6_
  - [ ] 59.6 Write property tests for logging
    - Test PII filtering
    - _Requirements: 14.2, 15.1_

- [ ] 60. Implement WebSocket support
  - [ ] 60.1 Create WebSocket endpoint
    - Per Appendix G spec
    - _Requirements: 10.4_
  - [ ] 60.2 Implement connection manager
    - Track subscriptions per user
    - _Requirements: 10.4_
  - [ ] 60.3 Implement job status broadcasting
    - Push updates to subscribed clients
    - _Requirements: 10.5_
  - [ ] 60.4 Write integration tests for WebSocket
    - Test subscription flow
    - Test message delivery
    - _Requirements: 10.4, 10.5_

- [ ] 61. Implement webhook delivery
  - [ ] 61.1 Create webhook service
    - Per Appendix G spec
    - _Requirements: 10.3_
  - [ ] 61.2 Implement signature verification
    - HMAC-SHA256
    - _Requirements: 10.3_
  - [ ] 61.3 Implement delivery with retry
    - Retry on failure
    - _Requirements: 10.3_
  - [ ] 61.4 Write unit tests for webhooks
    - Test signature generation/verification
    - _Requirements: 10.3_

- [ ] 62. Performance optimization
  - [ ] 62.1 Implement response caching
    - Cache asset lists, brand kits
    - _Requirements: Performance_
  - [ ] 62.2 Implement lazy loading
    - Paginate large lists
    - _Requirements: Performance_
  - [ ] 62.3 Optimize database queries
    - Add missing indexes
    - _Requirements: Performance_
  - [ ] 62.4 Implement CDN cache headers
    - max-age for immutable assets
    - _Requirements: 6.8_

- [ ] 63. Production deployment configuration
  - [ ] 63.1 Create production Dockerfile
    - Multi-stage build
    - _Requirements: Production_
  - [ ] 63.2 Configure environment validation
    - Fail fast on missing secrets
    - _Requirements: Production_
  - [ ] 63.3 Set up health checks
    - Kubernetes/Docker health probes
    - _Requirements: 15.2_
  - [ ] 63.4 Configure auto-scaling
    - Based on queue depth
    - _Requirements: Production_

- [ ] 64. Final TSX polish
  - [ ] 64.1 Implement loading states
    - Skeleton loaders everywhere
    - _Requirements: 12.1_
  - [ ] 64.2 Implement error boundaries
    - Graceful error handling
    - _Requirements: 12.5_
  - [ ] 64.3 Implement offline support
    - Cache recent assets and brand kit
    - _Requirements: 12.4_
  - [ ] 64.4 Accessibility audit
    - Contrast, keyboard nav, screen readers
    - _Requirements: Accessibility_

- [ ] 65. Final Swift polish
  - [ ] 65.1 Implement loading states
    - SwiftUI progress views
    - _Requirements: 12.1_
  - [ ] 65.2 Implement error handling
    - Alert presentation
    - _Requirements: 12.5_
  - [ ] 65.3 Implement offline caching
    - Core Data or UserDefaults
    - _Requirements: 12.4_

- [ ] 66. Checkpoint - Phase 8 Verification Gate (FINAL)
  - Property tests pass (100 iterations each)
  - All unit tests pass
  - Security audit: OWASP top 10 checklist
  - Load test: 100 concurrent users, p99 < 2s
  - E2E test: Full user journey (signup → generate → upgrade → batch generate)
  - TSX web: Production ready
  - TSX mobile: Production ready
  - Swift: Production ready

---

## Notes

- All tasks are required for comprehensive implementation
- Each phase references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All property tests MUST run 100+ iterations
- No phase proceeds without verification gate passing
- TSX and Swift implementations proceed in parallel, sharing backend
