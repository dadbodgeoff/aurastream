# Streamer Studio Master Schema — Source of Truth

## Document Purpose

This document serves as the **immutable source of truth** for all Streamer Studio implementation specs. Every downstream spec (auth, generation, billing, etc.) MUST derive from and conform to the patterns, schemas, and contracts defined here. No deviations are permitted without updating this master schema first.

**Usage Rules:**
1. All child specs MUST reference this document
2. Data models defined here are canonical — child specs extend, never contradict
3. API contracts defined here are binding — endpoints follow these patterns exactly
4. Testing requirements are mandatory — no phase proceeds without verification gates passing
5. When context windows reset, this document re-establishes ground truth

## Introduction

Streamer Studio is an AI-powered creative asset generation platform for Twitch, YouTube, and TikTok creators. The system leverages Google's Gemini Nano Banana API to generate photorealistic, text-perfect 4K assets (thumbnails, overlays, clip covers, story graphics, VOD banners, brand kits) tailored to multi-platform streaming workflows.

This master schema defines the complete implementation blueprint including architecture patterns, development phases, testing requirements, and verification gates. The system will be built with parallel implementations: TSX (Next.js web + React Native) and Swift (iOS native), sharing a common FastAPI backend and Supabase data layer.

---

## Technology Stack (Canonical)

### Backend (Single Source)
- **Framework**: FastAPI (Python 3.11+)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth + Custom JWT layer
- **Queue**: Redis + RQ (job processing)
- **Storage**: Supabase Storage (S3-compatible buckets)
- **CDN**: Supabase CDN (built-in)
- **AI**: Google Gemini 2.5 Flash (Nano Banana Pro)
- **Payments**: Stripe

### Frontend - TSX (Primary)
- **Web**: Next.js 14+ (App Router)
- **Mobile**: React Native + Expo
- **State**: Zustand
- **Data Fetching**: TanStack Query
- **Styling**: Tailwind CSS (web), StyleSheet (RN)
- **Testing**: Vitest + fast-check (property tests)

### Frontend - Swift (Parallel)
- **Framework**: SwiftUI
- **Networking**: URLSession + async/await
- **State**: @Observable (iOS 17+)
- **Testing**: XCTest + SwiftCheck (property tests)

---

## Glossary

- **Asset**: Any generated creative content (thumbnail, overlay, banner, story graphic, clip cover)
- **Brand_Kit**: A collection of extracted/defined brand elements (colors, fonts, logo, tone) for a creator
- **Generation_Job**: An async task that produces one or more assets via the Nano Banana API
- **Platform_Integration**: Connection to external APIs (Twitch, YouTube, TikTok) for metadata extraction
- **Nano_Banana_API**: Google Gemini 2.5 Flash image generation API with superior text rendering
- **Asset_Pack**: A batch of related assets generated from a single request (e.g., 3 thumbnails + 2 overlays)
- **Viral_Score**: AI-computed CTR potential rating for generated assets
- **Prompt_Template**: Pre-engineered prompt structure optimized for specific asset types
- **Verification_Gate**: A checkpoint requiring all tests to pass before proceeding to next phase
- **Property_Test**: Hypothesis-based test validating invariants across randomized inputs
- **Unit_Test**: Specific example-based test validating discrete functionality

## Requirements

### Requirement 1: User Authentication and Account Management

**User Story:** As a creator, I want to sign up and manage my account, so that I can access my generated assets and brand kits across sessions and devices.

#### Acceptance Criteria

1. WHEN a user signs up with email and password, THE Auth_System SHALL create a new account and send email verification
2. WHEN a user signs up via OAuth (Google, Twitch, Discord), THE Auth_System SHALL create or link an account without requiring password
3. WHEN a user logs in with valid credentials, THE Auth_System SHALL issue a JWT token with 24-hour expiration
4. WHEN a user's JWT token expires, THE Auth_System SHALL allow token refresh without re-authentication
5. WHEN a user logs out, THE Auth_System SHALL invalidate the current session and clear auth cookies
6. IF an invalid or expired token is provided, THEN THE Auth_System SHALL return 401 Unauthorized
7. WHEN a user upgrades to Pro or Studio tier, THE Account_System SHALL update subscription status and unlock features
8. THE Auth_System SHALL support both cookie-based (web) and header-based (mobile) authentication

### Requirement 2: Brand Kit Management

**User Story:** As a creator, I want to create and manage my brand kit, so that all generated assets maintain consistent branding.

#### Acceptance Criteria

1. WHEN a user uploads 3-5 stream clips or images, THE Brand_Analyzer SHALL extract dominant colors (5-7), typography styles, and design tone
2. WHEN brand analysis completes, THE Brand_Kit_Builder SHALL generate a structured brand kit JSON with colors, fonts, logo_url, and tone
3. WHEN a user manually edits brand kit values, THE Brand_Kit_System SHALL persist changes and apply to future generations
4. THE Brand_Kit SHALL contain: primary_colors (array), accent_colors (array), fonts (headline, body), logo_url (string), tone (enum), style_reference (string)
5. WHEN generating assets, THE Generation_System SHALL auto-apply the user's active brand kit unless overridden
6. WHEN a user has no brand kit, THE System SHALL use default templates until one is created
7. FOR ALL brand kit operations, THE System SHALL validate color values as valid hex codes
8. FOR ALL brand kit operations, THE System SHALL validate font names against supported font list

### Requirement 3: Asset Generation Core

**User Story:** As a creator, I want to generate high-quality thumbnails, overlays, and graphics, so that I can create professional content without design skills.

#### Acceptance Criteria

1. WHEN a user requests asset generation, THE Generation_System SHALL create a Generation_Job and return a job_id immediately
2. WHEN a Generation_Job is created, THE Queue_System SHALL process it asynchronously via the Nano_Banana_API
3. WHEN the Nano_Banana_API returns a generated image, THE Storage_System SHALL upload to S3/Blob storage and store the CDN URL
4. WHEN a Generation_Job completes, THE System SHALL update job status and notify the client via webhook or polling
5. THE Generation_System SHALL support these asset types: thumbnail (1280x720), overlay (1920x1080), banner (2560x1440), story_graphic (1080x1920), clip_cover (1280x720)
6. WHEN generating assets, THE Prompt_Engine SHALL construct prompts using asset-type-specific templates combined with brand kit and user input
7. IF the Nano_Banana_API returns an error, THEN THE Generation_System SHALL retry up to 3 times with exponential backoff
8. IF all retries fail, THEN THE Generation_System SHALL mark the job as failed and notify the user
9. FOR ALL generated assets, THE System SHALL store metadata: asset_id, user_id, job_id, asset_type, prompt_used, generation_params, created_at, cdn_url

### Requirement 4: Batch Asset Generation

**User Story:** As a creator, I want to generate multiple assets at once, so that I can quickly create complete asset packs for my content.

#### Acceptance Criteria

1. WHEN a user requests batch generation, THE System SHALL accept an array of asset specifications (type, custom_prompt, variations)
2. WHEN batch generation is requested, THE System SHALL create a parent Generation_Job with child jobs for each asset
3. WHEN processing batch jobs, THE Queue_System SHALL process up to 5 assets concurrently per user
4. WHEN all child jobs complete, THE System SHALL mark the parent job as complete and return the Asset_Pack
5. THE Batch_System SHALL support generating up to 15 assets per batch request
6. WHEN a batch includes variations, THE System SHALL generate N variations of the same asset with prompt perturbations
7. FOR ALL batch operations, THE System SHALL track progress as (completed_count / total_count) percentage
8. IF any child job fails, THEN THE System SHALL continue processing remaining jobs and report partial success

### Requirement 5: Platform Integration (Twitch/YouTube)

**User Story:** As a creator, I want to connect my streaming accounts, so that the system can auto-generate assets based on my stream data.

#### Acceptance Criteria

1. WHEN a user connects their Twitch account via OAuth, THE Platform_System SHALL store access tokens securely and fetch channel metadata
2. WHEN a user connects their YouTube account via OAuth, THE Platform_System SHALL store access tokens securely and fetch channel metadata
3. WHEN fetching Twitch data, THE Platform_System SHALL retrieve: channel_name, game_category, stream_title, top_clips (last 30 days), profile_image, channel_logo
4. WHEN fetching YouTube data, THE Platform_System SHALL retrieve: channel_name, recent_video_titles, video_tags, channel_banner, profile_image
5. WHEN a user clicks "Generate for Today's Stream", THE System SHALL pull current stream metadata and auto-construct generation prompts
6. THE Platform_System SHALL refresh OAuth tokens before expiration to maintain continuous access
7. IF platform API calls fail, THEN THE System SHALL retry with backoff and fall back to cached data if available
8. WHEN platform tokens are revoked, THE System SHALL notify the user and prompt re-authentication

### Requirement 6: Asset Storage and Delivery

**User Story:** As a creator, I want my generated assets to be instantly accessible via shareable links, so that I can use them without downloading.

#### Acceptance Criteria

1. WHEN an asset is generated, THE Storage_System SHALL upload to S3-compatible storage with CDN distribution
2. WHEN an asset is stored, THE System SHALL generate a unique shareable URL: studio.domain.com/asset/{asset_id}
3. WHEN a shareable URL is accessed, THE System SHALL serve the asset directly (no authentication required for public assets)
4. WHEN a user marks an asset as private, THE System SHALL require authentication to access the shareable URL
5. THE Storage_System SHALL support these formats: PNG (thumbnails, overlays), JPEG (compressed), WebP (optimized web)
6. WHEN a user deletes an asset, THE System SHALL remove from storage and invalidate the CDN cache
7. FOR ALL stored assets, THE System SHALL retain for 90 days minimum, with extended retention for paid tiers
8. THE CDN SHALL serve assets with appropriate cache headers (max-age: 31536000 for immutable assets)

### Requirement 7: Viral Optimization Engine

**User Story:** As a creator, I want AI-powered suggestions to improve my thumbnails' click-through potential, so that I can maximize views.

#### Acceptance Criteria

1. WHEN an asset is generated, THE Viral_Scorer SHALL compute a CTR potential score (0-100) based on visual analysis
2. WHEN scoring thumbnails, THE Viral_Scorer SHALL evaluate: text_readability, color_contrast, face_presence, emotional_intensity, composition
3. WHEN a score is below 70, THE System SHALL provide specific improvement suggestions (e.g., "Increase text size by 20%", "Add contrasting border")
4. WHEN a user requests A/B variations, THE System SHALL generate 3 thumbnail variations with different hook strategies
5. THE Viral_Engine SHALL analyze trending thumbnails in the user's game category to inform suggestions
6. WHEN displaying suggestions, THE System SHALL explain the reasoning behind each recommendation
7. FOR ALL viral scores, THE System SHALL store historical data to track improvement over time

### Requirement 8: Subscription and Billing

**User Story:** As a creator, I want to choose a subscription tier that fits my needs, so that I can access appropriate features and generation limits.

#### Acceptance Criteria

1. THE System SHALL support these tiers: Free (5 assets/mo, 1 platform), Pro ($19/mo, 100 assets/mo, 3 platforms), Studio ($49/mo, unlimited, all platforms, team features)
2. WHEN a free user exceeds 5 assets/month, THE System SHALL block generation and prompt upgrade
3. WHEN a Pro user exceeds 100 assets/month, THE System SHALL allow overage at $0.25/asset or prompt Studio upgrade
4. WHEN a user subscribes, THE Billing_System SHALL process payment via Stripe and activate tier immediately
5. WHEN a subscription renews, THE System SHALL reset monthly asset counts and process payment
6. IF payment fails, THEN THE System SHALL retry for 3 days, then downgrade to Free tier
7. WHEN a user cancels, THE System SHALL maintain access until period end, then downgrade to Free
8. THE System SHALL track usage: assets_generated_this_month, platforms_connected, team_members (Studio only)

### Requirement 9: Prompt Engineering System

**User Story:** As a creator, I want the system to generate optimized prompts automatically, so that I get high-quality results without prompt expertise.

#### Acceptance Criteria

1. THE Prompt_Engine SHALL maintain templates for each asset type with placeholders for: brand_kit, game_category, stream_title, custom_input, style_modifiers
2. WHEN constructing prompts, THE Prompt_Engine SHALL inject brand kit values (colors, fonts, tone) into the template
3. WHEN a user provides custom input, THE Prompt_Engine SHALL sanitize and incorporate into the final prompt
4. THE Prompt_Engine SHALL append quality modifiers: "4K resolution", "readable text at 60px", "professional streaming aesthetic"
5. WHEN generating for specific games, THE Prompt_Engine SHALL include game-specific visual elements and trending hooks
6. FOR ALL prompts, THE System SHALL log the final constructed prompt for debugging and improvement
7. THE Prompt_Engine SHALL support prompt versioning to A/B test template effectiveness
8. WHEN a prompt produces poor results, THE System SHALL allow user feedback to improve future templates

### Requirement 10: Real-time Job Status and Notifications

**User Story:** As a creator, I want to see generation progress in real-time, so that I know when my assets are ready.

#### Acceptance Criteria

1. WHEN a Generation_Job is created, THE System SHALL return a job_id that can be used for status polling
2. WHEN polling job status, THE System SHALL return: status (queued, processing, completed, failed), progress_percent, estimated_time_remaining
3. WHEN a job completes, THE System SHALL support webhook notification to a user-configured URL
4. THE System SHALL support WebSocket connections for real-time status updates (optional, polling as fallback)
5. WHEN a batch job progresses, THE System SHALL emit progress events for each completed child job
6. IF a job is queued for more than 60 seconds, THEN THE System SHALL notify the user of delay
7. THE System SHALL retain job history for 30 days for debugging and analytics

### Requirement 11: API Design and Versioning

**User Story:** As a developer integrating with Streamer Studio, I want a well-documented API, so that I can build custom integrations.

#### Acceptance Criteria

1. THE API SHALL follow RESTful conventions with consistent resource naming
2. THE API SHALL version endpoints as /api/v1/* with backward compatibility guarantees
3. WHEN returning errors, THE API SHALL use standard HTTP status codes with JSON error bodies: {error: string, code: string, details: object}
4. THE API SHALL require authentication for all endpoints except: health check, public asset access, OAuth callbacks
5. THE API SHALL implement rate limiting: Free (60 req/min), Pro (300 req/min), Studio (1000 req/min)
6. THE API SHALL return consistent response envelopes: {data: T, meta: {request_id, timestamp}}
7. WHEN requests exceed rate limits, THE API SHALL return 429 with Retry-After header
8. THE API SHALL provide OpenAPI/Swagger documentation at /api/docs (disabled in production)

### Requirement 12: Cross-Platform Client Consistency

**User Story:** As a creator using multiple devices, I want the same experience on web and mobile, so that I can manage assets from anywhere.

#### Acceptance Criteria

1. THE TSX Client (Next.js/React Native) and Swift Client SHALL consume identical API endpoints
2. THE Clients SHALL implement identical data models for: User, BrandKit, Asset, GenerationJob, Subscription
3. THE Clients SHALL handle authentication identically: JWT in cookies (web) or Authorization header (mobile)
4. WHEN offline, THE Clients SHALL cache recent assets and brand kit for viewing (generation requires connectivity)
5. THE Clients SHALL implement identical error handling with user-friendly messages
6. THE Design System SHALL define shared tokens (colors, spacing, typography) adaptable to each platform's conventions
7. FOR ALL client implementations, THE System SHALL maintain feature parity within one sprint of initial release

### Requirement 13: Testing and Verification Requirements

**User Story:** As a developer, I want comprehensive test coverage, so that I can confidently deploy changes without regressions.

#### Acceptance Criteria

1. THE System SHALL require 80% code coverage minimum for all modules
2. THE System SHALL implement property-based tests using Hypothesis (Python) and fast-check (TypeScript) for all data transformations
3. THE System SHALL implement unit tests for all API endpoints, services, and utility functions
4. BEFORE proceeding to next development phase, ALL tests in current phase SHALL pass (Verification Gate)
5. THE System SHALL implement integration tests for: auth flows, generation pipeline, platform integrations, billing flows
6. THE System SHALL implement end-to-end tests for critical user journeys: signup → brand kit → generate → download
7. FOR ALL property tests, THE System SHALL run minimum 100 iterations per property
8. THE System SHALL implement contract tests between API and clients to ensure compatibility

### Requirement 14: Security and Data Protection

**User Story:** As a creator, I want my data and credentials to be secure, so that I can trust the platform with my streaming accounts.

#### Acceptance Criteria

1. THE System SHALL encrypt all OAuth tokens at rest using AES-256
2. THE System SHALL never log sensitive data: passwords, tokens, API keys, PII
3. THE System SHALL implement CSRF protection for all state-changing operations
4. THE System SHALL implement Content Security Policy headers on all responses
5. THE System SHALL validate and sanitize all user inputs to prevent injection attacks
6. WHEN storing passwords, THE System SHALL use bcrypt with cost factor 12
7. THE System SHALL implement audit logging for: login attempts, subscription changes, platform connections
8. THE System SHALL support account deletion with complete data removal within 30 days

### Requirement 15: Observability and Monitoring

**User Story:** As an operator, I want comprehensive monitoring, so that I can detect and resolve issues quickly.

#### Acceptance Criteria

1. THE System SHALL emit structured logs with: timestamp, level, request_id, user_id (if authenticated), message, context
2. THE System SHALL expose health check endpoint at /health returning: status, version, dependencies_status
3. THE System SHALL track metrics: request_latency, generation_time, error_rate, queue_depth, active_users
4. THE System SHALL implement distributed tracing with correlation IDs across services
5. WHEN errors occur, THE System SHALL capture stack traces and context for debugging (redacted in production responses)
6. THE System SHALL alert on: error_rate > 1%, p99_latency > 5s, queue_depth > 100, generation_failure_rate > 5%
7. THE System SHALL retain logs for 30 days and metrics for 90 days


---

## Canonical Data Models

All implementations MUST use these exact field names, types, and constraints. Extensions are allowed but core fields are immutable.

### User Model
```typescript
interface User {
  id: string;                    // UUID, primary key
  email: string;                 // Unique, validated format
  email_verified: boolean;       // Default false
  display_name: string;          // 1-50 chars
  avatar_url: string | null;     // CDN URL or null
  subscription_tier: 'free' | 'pro' | 'studio';  // Default 'free'
  subscription_status: 'active' | 'past_due' | 'canceled' | 'none';
  stripe_customer_id: string | null;
  assets_generated_this_month: number;  // Reset on billing cycle
  created_at: string;            // ISO 8601
  updated_at: string;            // ISO 8601
}
```

### BrandKit Model
```typescript
interface BrandKit {
  id: string;                    // UUID, primary key
  user_id: string;               // FK to User
  name: string;                  // 1-100 chars
  is_active: boolean;            // Only one active per user
  primary_colors: string[];      // 1-5 hex codes, e.g., ["#FF0000", "#1E90FF"]
  accent_colors: string[];       // 0-3 hex codes
  fonts: {
    headline: string;            // Font family name
    body: string;                // Font family name
  };
  logo_url: string | null;       // CDN URL
  tone: 'competitive' | 'casual' | 'educational' | 'comedic' | 'professional';
  style_reference: string;       // Free text description
  extracted_from: string | null; // Source clips/images used for extraction
  created_at: string;
  updated_at: string;
}
```

### Asset Model
```typescript
interface Asset {
  id: string;                    // UUID, primary key
  user_id: string;               // FK to User
  job_id: string;                // FK to GenerationJob
  brand_kit_id: string | null;   // FK to BrandKit (null if default)
  
  asset_type: 'thumbnail' | 'overlay' | 'banner' | 'story_graphic' | 'clip_cover';
  
  // Dimensions by type (enforced):
  // thumbnail: 1280x720
  // overlay: 1920x1080
  // banner: 2560x1440
  // story_graphic: 1080x1920
  // clip_cover: 1280x720
  
  width: number;
  height: number;
  format: 'png' | 'jpeg' | 'webp';
  
  cdn_url: string;               // Public CDN URL
  storage_key: string;           // S3/Blob key for deletion
  shareable_url: string;         // studio.domain.com/asset/{id}
  is_public: boolean;            // Default true
  
  prompt_used: string;           // Full prompt sent to Nano Banana
  generation_params: {
    model: string;               // e.g., "gemini-2.5-flash"
    temperature: number;
    seed: number | null;
  };
  
  viral_score: number | null;    // 0-100, computed post-generation
  viral_suggestions: string[];   // Improvement recommendations
  
  created_at: string;
  expires_at: string | null;     // Null for paid tiers (permanent)
}
```

### GenerationJob Model
```typescript
interface GenerationJob {
  id: string;                    // UUID, primary key
  user_id: string;               // FK to User
  parent_job_id: string | null;  // FK to self (for batch child jobs)
  
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'partial';
  job_type: 'single' | 'batch' | 'variation';
  
  // Request details
  asset_type: 'thumbnail' | 'overlay' | 'banner' | 'story_graphic' | 'clip_cover';
  custom_prompt: string | null;  // User-provided additions
  brand_kit_id: string | null;
  platform_context: {
    platform: 'twitch' | 'youtube' | 'tiktok' | null;
    game_category: string | null;
    stream_title: string | null;
  } | null;
  
  // Batch details (if batch job)
  total_assets: number;          // 1 for single, N for batch
  completed_assets: number;
  failed_assets: number;
  
  // Timing
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  
  // Results
  asset_ids: string[];           // Generated asset IDs
  error_message: string | null;  // If failed
  retry_count: number;           // Max 3
  
  created_at: string;
  updated_at: string;
}
```

### PlatformConnection Model
```typescript
interface PlatformConnection {
  id: string;                    // UUID, primary key
  user_id: string;               // FK to User
  platform: 'twitch' | 'youtube' | 'tiktok';
  
  platform_user_id: string;      // External platform's user ID
  platform_username: string;     // Display name on platform
  
  access_token: string;          // Encrypted at rest
  refresh_token: string;         // Encrypted at rest
  token_expires_at: string;      // ISO 8601
  
  // Cached metadata (refreshed periodically)
  cached_metadata: {
    channel_name: string;
    profile_image_url: string;
    game_category: string | null;      // Twitch
    recent_stream_title: string | null;
    subscriber_count: number | null;   // YouTube
    follower_count: number | null;     // Twitch
  };
  metadata_updated_at: string;
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### Subscription Model
```typescript
interface Subscription {
  id: string;                    // UUID, primary key
  user_id: string;               // FK to User, unique
  
  tier: 'free' | 'pro' | 'studio';
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  
  current_period_start: string;  // ISO 8601
  current_period_end: string;    // ISO 8601
  cancel_at_period_end: boolean;
  
  // Usage tracking
  assets_limit: number;          // 5 (free), 100 (pro), -1 (unlimited/studio)
  assets_used: number;           // Reset each period
  platforms_limit: number;       // 1 (free), 3 (pro), -1 (unlimited)
  
  created_at: string;
  updated_at: string;
}
```

---

## Canonical API Contracts

All endpoints MUST follow these patterns exactly. Child specs implement these contracts.

### Response Envelope (All Endpoints)
```typescript
// Success response
interface ApiResponse<T> {
  data: T;
  meta: {
    request_id: string;          // UUID for tracing
    timestamp: string;           // ISO 8601
  };
}

// Error response
interface ApiError {
  error: {
    message: string;             // Human-readable
    code: string;                // Machine-readable, e.g., "ASSET_LIMIT_EXCEEDED"
    details: Record<string, any> | null;
  };
  meta: {
    request_id: string;
    timestamp: string;
  };
}
```

### Authentication Endpoints
```
POST   /api/v1/auth/signup          # Email/password signup
POST   /api/v1/auth/login           # Email/password login
POST   /api/v1/auth/logout          # Invalidate session
POST   /api/v1/auth/refresh         # Refresh JWT token
GET    /api/v1/auth/me              # Get current user
POST   /api/v1/auth/oauth/{provider}  # OAuth initiation (google, twitch, discord)
GET    /api/v1/auth/oauth/{provider}/callback  # OAuth callback
```

### Brand Kit Endpoints
```
GET    /api/v1/brand-kits           # List user's brand kits
POST   /api/v1/brand-kits           # Create brand kit
GET    /api/v1/brand-kits/{id}      # Get brand kit
PUT    /api/v1/brand-kits/{id}      # Update brand kit
DELETE /api/v1/brand-kits/{id}      # Delete brand kit
POST   /api/v1/brand-kits/{id}/activate  # Set as active
POST   /api/v1/brand-kits/analyze   # Extract brand kit from uploads
```

### Asset Generation Endpoints
```
POST   /api/v1/generate             # Create generation job (single)
POST   /api/v1/generate/batch       # Create batch generation job
GET    /api/v1/jobs/{id}            # Get job status
GET    /api/v1/jobs/{id}/assets     # Get job's generated assets
GET    /api/v1/jobs                 # List user's jobs (paginated)
DELETE /api/v1/jobs/{id}            # Cancel queued job
```

### Asset Endpoints
```
GET    /api/v1/assets               # List user's assets (paginated, filterable)
GET    /api/v1/assets/{id}          # Get asset details
DELETE /api/v1/assets/{id}          # Delete asset
PUT    /api/v1/assets/{id}/visibility  # Toggle public/private
GET    /api/v1/assets/{id}/download # Get download URL (signed, temporary)
POST   /api/v1/assets/{id}/score    # Trigger viral scoring
```

### Platform Integration Endpoints
```
GET    /api/v1/platforms            # List connected platforms
POST   /api/v1/platforms/{platform}/connect     # Initiate OAuth
GET    /api/v1/platforms/{platform}/callback    # OAuth callback
DELETE /api/v1/platforms/{platform}/disconnect  # Revoke connection
POST   /api/v1/platforms/{platform}/refresh     # Force metadata refresh
GET    /api/v1/platforms/{platform}/metadata    # Get cached metadata
```

### Subscription Endpoints
```
GET    /api/v1/subscription         # Get current subscription
POST   /api/v1/subscription/checkout  # Create Stripe checkout session
POST   /api/v1/subscription/portal  # Create Stripe billing portal session
POST   /api/v1/subscription/webhook # Stripe webhook handler
GET    /api/v1/subscription/usage   # Get current usage stats
```

### Public Endpoints (No Auth)
```
GET    /health                      # Health check
GET    /asset/{asset_id}            # Public asset access (if is_public=true)
```

---

## Development Phases (Canonical Order)

Implementation MUST proceed in this order. Each phase has a Verification Gate that MUST pass before proceeding.

### Phase 0: Foundation (Week 1)
**Scope**: Project scaffolding, CI/CD, database schema, design tokens

**Deliverables**:
- [ ] FastAPI project structure with middleware stack
- [ ] Supabase project with all tables created
- [ ] Next.js project with design token system
- [ ] React Native (Expo) project with shared tokens
- [ ] Swift project with equivalent design tokens
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Environment configuration (.env patterns)

**Verification Gate 0**:
- All projects build without errors
- Database migrations run successfully
- Health check endpoint returns 200
- Design tokens compile on all platforms

### Phase 1: Authentication (Week 2)
**Scope**: User auth, JWT, OAuth providers

**Deliverables**:
- [ ] Email/password signup and login
- [ ] JWT token issuance and validation
- [ ] Token refresh flow
- [ ] OAuth integration (Google, Twitch, Discord)
- [ ] Auth middleware for protected routes
- [ ] TSX auth screens and hooks
- [ ] Swift auth screens and services

**Verification Gate 1**:
- Property tests: Token encoding/decoding round-trip
- Property tests: Password hashing verification
- Unit tests: All auth endpoints (signup, login, logout, refresh)
- Integration test: Full OAuth flow (mocked provider)
- E2E test: Signup → Login → Access protected route → Logout

### Phase 2: Brand Kit (Week 3)
**Scope**: Brand kit CRUD, color extraction, font detection

**Deliverables**:
- [ ] Brand kit database operations
- [ ] Brand kit API endpoints
- [ ] Color extraction from uploaded images (Vision AI)
- [ ] Brand kit validation (hex codes, font names)
- [ ] TSX brand kit management UI
- [ ] Swift brand kit management UI

**Verification Gate 2**:
- Property tests: Hex color validation (all valid hex codes pass, invalid fail)
- Property tests: Brand kit serialization round-trip
- Unit tests: All brand kit endpoints
- Integration test: Upload images → Extract colors → Create brand kit
- E2E test: Create brand kit → Set active → Verify in generation context

### Phase 3: Asset Generation Core (Week 4-5)
**Scope**: Generation jobs, Nano Banana integration, storage

**Deliverables**:
- [ ] Generation job queue (Redis + Bull)
- [ ] Nano Banana API client with retry logic
- [ ] Prompt template engine
- [ ] S3/Blob storage integration
- [ ] CDN URL generation
- [ ] Job status polling endpoint
- [ ] TSX generation UI and progress display
- [ ] Swift generation UI and progress display

**Verification Gate 3**:
- Property tests: Prompt template construction (brand kit injection)
- Property tests: Job state transitions (valid state machine)
- Unit tests: All generation endpoints
- Unit tests: Nano Banana client (mocked responses)
- Integration test: Create job → Process → Store asset → Return URL
- E2E test: Request generation → Poll status → View completed asset

### Phase 4: Batch Generation (Week 6)
**Scope**: Multi-asset generation, variations, progress tracking

**Deliverables**:
- [ ] Batch job creation and child job management
- [ ] Concurrent processing (max 5 per user)
- [ ] Variation generation with prompt perturbations
- [ ] Batch progress aggregation
- [ ] TSX batch UI with progress indicators
- [ ] Swift batch UI with progress indicators

**Verification Gate 4**:
- Property tests: Batch progress calculation (completed/total)
- Property tests: Concurrent job limits enforced
- Unit tests: Batch endpoints
- Integration test: Create batch → Process children → Aggregate results
- E2E test: Request 5-asset batch → Track progress → View all assets

### Phase 5: Platform Integration (Week 7)
**Scope**: Twitch/YouTube OAuth, metadata fetching

**Deliverables**:
- [ ] Twitch OAuth flow and token storage
- [ ] YouTube OAuth flow and token storage
- [ ] Metadata fetching and caching
- [ ] Token refresh automation
- [ ] Platform-aware prompt enhancement
- [ ] TSX platform connection UI
- [ ] Swift platform connection UI

**Verification Gate 5**:
- Property tests: OAuth token encryption/decryption round-trip
- Unit tests: All platform endpoints
- Integration test: Connect platform → Fetch metadata → Cache
- Integration test: Token expiry → Auto-refresh → Verify access
- E2E test: Connect Twitch → Generate with stream context → Verify prompt includes metadata

### Phase 6: Viral Optimization (Week 8)
**Scope**: CTR scoring, suggestions, A/B variations

**Deliverables**:
- [ ] Viral scoring algorithm (Vision AI analysis)
- [ ] Suggestion generation based on score components
- [ ] A/B variation generation
- [ ] Score history tracking
- [ ] TSX viral score display and suggestions
- [ ] Swift viral score display and suggestions

**Verification Gate 6**:
- Property tests: Viral score bounds (always 0-100)
- Property tests: Suggestions generated when score < 70
- Unit tests: Scoring endpoint
- Integration test: Generate asset → Score → Get suggestions
- E2E test: Generate thumbnail → View score → Request variations → Compare

### Phase 7: Subscription & Billing (Week 9)
**Scope**: Stripe integration, tier enforcement, usage tracking

**Deliverables**:
- [ ] Stripe checkout session creation
- [ ] Stripe webhook handling (subscription events)
- [ ] Tier-based feature gating
- [ ] Usage tracking and limit enforcement
- [ ] Billing portal integration
- [ ] TSX subscription management UI
- [ ] Swift subscription management UI

**Verification Gate 7**:
- Property tests: Usage limit enforcement (free: 5, pro: 100, studio: unlimited)
- Property tests: Tier downgrade preserves data
- Unit tests: All subscription endpoints
- Integration test: Checkout → Webhook → Tier upgrade → Verify access
- E2E test: Free user → Hit limit → Upgrade → Continue generating

### Phase 8: Polish & Production (Week 10)
**Scope**: Error handling, monitoring, performance, security audit

**Deliverables**:
- [ ] Comprehensive error handling and user messages
- [ ] Structured logging with PII filtering
- [ ] Metrics and alerting setup
- [ ] Rate limiting implementation
- [ ] Security headers and CSP
- [ ] Performance optimization (caching, lazy loading)
- [ ] Production deployment configuration

**Verification Gate 8**:
- Property tests: PII filtering (emails, tokens never in logs)
- Property tests: Rate limiting (requests over limit return 429)
- Security audit: OWASP top 10 checklist
- Load test: 100 concurrent users, p99 < 2s
- E2E test: Full user journey (signup → generate → upgrade → batch generate)

---

## Testing Strategy (Mandatory)

### Property-Based Testing Requirements

Every data transformation MUST have property tests. Use:
- **Python**: Hypothesis
- **TypeScript**: fast-check
- **Swift**: SwiftCheck

**Required Properties by Domain**:

1. **Authentication**
   - JWT encode/decode round-trip: `decode(encode(payload)) == payload`
   - Password hash verification: `verify(hash(password), password) == true`
   - Token expiration: `is_expired(token_with_past_exp) == true`

2. **Brand Kit**
   - Hex validation: `is_valid_hex(any_valid_hex) == true`
   - Serialization round-trip: `deserialize(serialize(brand_kit)) == brand_kit`
   - Color array bounds: `1 <= len(primary_colors) <= 5`

3. **Asset Generation**
   - Prompt construction: `brand_kit_values in construct_prompt(brand_kit, template)`
   - Job state machine: `transition(state, event) in valid_next_states[state]`
   - Dimension enforcement: `asset.dimensions == expected_for_type[asset.type]`

4. **Batch Processing**
   - Progress calculation: `progress == completed / total`
   - Concurrent limits: `active_jobs_for_user <= 5`
   - Partial success: `status == 'partial' when some_failed and some_completed`

5. **Subscriptions**
   - Limit enforcement: `can_generate(user) == (usage < limit or limit == -1)`
   - Tier features: `has_feature(user, feature) == feature in tier_features[user.tier]`

### Unit Testing Requirements

Every endpoint and service function MUST have unit tests covering:
- Happy path (valid input → expected output)
- Validation errors (invalid input → 422)
- Auth errors (missing/invalid token → 401)
- Not found errors (invalid ID → 404)
- Business logic errors (limit exceeded → 403)

### Integration Testing Requirements

Each phase MUST have integration tests covering:
- Database operations (create, read, update, delete)
- External API interactions (mocked)
- Multi-step workflows

### E2E Testing Requirements

Critical user journeys MUST have E2E tests:
1. Signup → Create brand kit → Generate asset → Download
2. Connect Twitch → Generate with context → View result
3. Free user → Hit limit → Upgrade → Continue
4. Batch generate → Track progress → View all assets

---

## File Structure (Canonical)

### Backend (FastAPI)
```
backend/
├── api/
│   ├── __init__.py
│   ├── main.py                 # App factory, middleware
│   ├── config.py               # Environment config
│   ├── dependencies.py         # Dependency injection
│   │
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── brand_kits.py
│   │   ├── generation.py
│   │   ├── assets.py
│   │   ├── platforms.py
│   │   └── subscriptions.py
│   │
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── rate_limiting.py
│   │   └── security_headers.py
│   │
│   └── schemas/
│       ├── __init__.py
│       ├── user.py
│       ├── brand_kit.py
│       ├── asset.py
│       ├── job.py
│       └── subscription.py
│
├── services/
│   ├── __init__.py
│   ├── auth_service.py
│   ├── brand_kit_service.py
│   ├── generation_service.py
│   ├── nano_banana_client.py
│   ├── storage_service.py
│   ├── platform_service.py
│   ├── viral_scorer.py
│   └── stripe_service.py
│
├── workers/
│   ├── __init__.py
│   └── generation_worker.py    # Bull queue processor
│
├── database/
│   ├── __init__.py
│   ├── supabase_client.py
│   └── migrations/
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── properties/             # Hypothesis property tests
│   │   ├── test_auth_properties.py
│   │   ├── test_brand_kit_properties.py
│   │   └── test_generation_properties.py
│   ├── unit/
│   │   ├── test_auth.py
│   │   ├── test_brand_kits.py
│   │   └── test_generation.py
│   └── integration/
│       ├── test_auth_flow.py
│       └── test_generation_flow.py
│
├── .env.example
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

### Frontend - TSX (Next.js + React Native)
```
frontend-tsx/
├── apps/
│   ├── web/                    # Next.js app
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   ├── api/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   └── next.config.js
│   │
│   └── mobile/                 # Expo app
│       ├── app/
│       ├── components/
│       └── app.json
│
├── packages/
│   ├── ui/                     # Shared components
│   │   ├── src/
│   │   │   ├── tokens/
│   │   │   ├── components/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── api-client/             # Shared API client
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── types.ts
│   │   │   └── hooks/
│   │   └── package.json
│   │
│   └── shared/                 # Shared utilities
│       ├── src/
│       │   ├── validation.ts
│       │   └── constants.ts
│       └── package.json
│
├── tests/
│   ├── properties/             # fast-check property tests
│   ├── unit/
│   └── e2e/
│
├── turbo.json
└── package.json
```

### Frontend - Swift
```
frontend-swift/
├── StreamerStudio/
│   ├── App/
│   │   └── StreamerStudioApp.swift
│   │
│   ├── Features/
│   │   ├── Auth/
│   │   ├── BrandKit/
│   │   ├── Generation/
│   │   ├── Assets/
│   │   └── Settings/
│   │
│   ├── Core/
│   │   ├── Network/
│   │   │   ├── APIClient.swift
│   │   │   └── Endpoints.swift
│   │   ├── Models/
│   │   │   ├── User.swift
│   │   │   ├── BrandKit.swift
│   │   │   ├── Asset.swift
│   │   │   └── GenerationJob.swift
│   │   └── Services/
│   │
│   ├── Design/
│   │   ├── Tokens/
│   │   └── Components/
│   │
│   └── Resources/
│
├── StreamerStudioTests/
│   ├── PropertyTests/          # SwiftCheck tests
│   └── UnitTests/
│
└── StreamerStudio.xcodeproj
```

---

## Environment Variables (Canonical)

All implementations MUST use these exact variable names:

```bash
# Environment
APP_ENV=development|staging|production
DEBUG=true|false

# Server
API_HOST=0.0.0.0
API_PORT=8000
API_BASE_URL=https://api.streamerstudio.com

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# JWT
JWT_SECRET_KEY=xxx
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Redis
REDIS_URL=redis://localhost:6379

# Storage
S3_BUCKET=streamer-studio-assets
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
CDN_BASE_URL=https://cdn.streamerstudio.com

# Nano Banana (Gemini)
GOOGLE_API_KEY=xxx
NANO_BANANA_MODEL=gemini-2.5-flash

# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_STUDIO=price_xxx

# OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
TWITCH_CLIENT_ID=xxx
TWITCH_CLIENT_SECRET=xxx
DISCORD_CLIENT_ID=xxx
DISCORD_CLIENT_SECRET=xxx
YOUTUBE_CLIENT_ID=xxx
YOUTUBE_CLIENT_SECRET=xxx

# CORS
ALLOWED_ORIGINS=https://streamerstudio.com,https://app.streamerstudio.com

# Monitoring
SENTRY_DSN=xxx
LOG_LEVEL=INFO
```

---

## Verification Gate Checklist Template

Each phase MUST complete this checklist before proceeding:

```markdown
## Phase N Verification Gate

### Property Tests
- [ ] Property 1: [description] — PASS/FAIL
- [ ] Property 2: [description] — PASS/FAIL
- [ ] All properties run 100+ iterations — PASS/FAIL

### Unit Tests
- [ ] All endpoints tested — PASS/FAIL
- [ ] All service functions tested — PASS/FAIL
- [ ] Coverage >= 80% — PASS/FAIL

### Integration Tests
- [ ] [Flow 1 description] — PASS/FAIL
- [ ] [Flow 2 description] — PASS/FAIL

### E2E Tests
- [ ] [Journey description] — PASS/FAIL

### Manual Verification
- [ ] TSX web: [feature] works as expected
- [ ] TSX mobile: [feature] works as expected
- [ ] Swift: [feature] works as expected

### Sign-off
- [ ] All tests passing
- [ ] No critical bugs
- [ ] Ready to proceed to Phase N+1
```
