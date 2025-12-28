# AuraStream Codebase Overview

**Version:** 1.0.0 | **Last Updated:** December 27, 2025 | **Status:** Production-Ready

---

## Executive Summary

**AuraStream** is an AI-powered SaaS platform that enables content creators (Twitch streamers, YouTubers, TikTokers) to generate professional-quality streaming assets in seconds. The platform combines a sophisticated backend API with a polished Next.js frontend, featuring an innovative "Prompt Coach" AI assistant that helps users refine their creative vision without exposing technical prompt engineering.

**Core Value Proposition:** "Your stream. Your brand. Every platform." — Generate thumbnails, overlays, banners, emotes, and more that match your unique style, with zero design experience required.

---

## Product Overview

### Target Users
- **Primary:** Twitch streamers and content creators
- **Secondary:** YouTubers, TikTokers, Kick streamers
- **Use Cases:** Asset generation, brand consistency, rapid content creation

### Key Features

| Feature | Description | Tier Access |
|---------|-------------|------------|
| **Asset Generation** | AI-powered creation of platform-specific assets (thumbnails, overlays, banners, emotes, badges) | Free (3/month), Pro (50/month), Studio (unlimited) |
| **Brand Kits** | Save and reuse brand colors, fonts, logos, and style preferences | All tiers |
| **Prompt Coach** | AI assistant that helps refine creative vision through conversation | Free (1 trial session), Studio (unlimited) |
| **Platform Integration** | Direct OAuth connections to Twitch, YouTube, TikTok | Pro+ (3 platforms), Studio (unlimited) |
| **Asset Library** | Organize, download, and share generated assets | All tiers |
| **Analytics** | Track generation usage, popular asset types, user engagement | Admin dashboard |
| **Keyboard Shortcuts** | Power-user navigation (⌘K command palette, N for new, B for brand kits, etc.) | All tiers |
| **Undo System** | 5-second undo window for destructive actions | All tiers |

### Subscription Tiers

```
┌─────────────────────────────────────────────────────────────────┐
│ FREE                    │ PRO                  │ STUDIO          │
├─────────────────────────────────────────────────────────────────┤
│ • 3 generations/month   │ • 50 generations/mo  │ • Unlimited     │
│ • 1 Coach trial session │ • Full Coach access  │ • Full Coach    │
│ • 1 platform connection │ • 3 platform conn.   │ • Unlimited     │
│ • Basic brand kits      │ • Advanced brand kit │ • Custom brand  │
│ • Standard queue        │ • Priority queue     │ • Priority      │
│ • No cost               │ • $9.99/month        │ • $29.99/month  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL (via Supabase)
- **Cache/Queue:** Redis (RQ for job processing)
- **AI/ML:** Google Gemini API (text generation), Nano Banana (image generation)
- **Storage:** Supabase Storage (S3-compatible)
- **Authentication:** JWT + OAuth (Twitch, YouTube, Discord, Google)
- **Payments:** Stripe (subscriptions, webhooks)
- **Deployment:** Docker, DigitalOcean

### Frontend
- **Web:** Next.js 14 (App Router), TypeScript, TailwindCSS
- **Mobile:** React Native (Expo) — planned
- **State Management:** Zustand (stores), TanStack Query (server state)
- **UI Components:** Custom component library with accessibility focus
- **Analytics:** Custom event tracking (Redis → PostgreSQL)
- **Testing:** Vitest (unit), Playwright (E2E)

### Infrastructure
- **Containerization:** Docker Compose (dev), Docker Compose prod (DigitalOcean)
- **Reverse Proxy:** Nginx (SSL termination, routing)
- **Monitoring:** Health checks, error tracking (Sentry optional)
- **CI/CD:** Git-based deployment scripts

---

## Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  Next.js Web (tsx/apps/web)    │  React Native (tsx/apps/mobile) │
│  - Landing page                │  - iOS/Android app              │
│  - Dashboard                   │  - Shared API client            │
│  - Create flow                 │  - Offline support              │
│  - Coach integration           │                                 │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  tsx/packages/api-client                                        │
│  - Type-safe REST client       - snake_case ↔ camelCase         │
│  - React Query hooks           - Auth token management          │
│  - Error handling              - Request/response transformation │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  FastAPI (backend/api)                                          │
│  - REST endpoints (40+ routes) - JWT authentication             │
│  - SSE streaming (Coach, jobs) - Rate limiting                  │
│  - Webhook handlers (Stripe)   - CORS middleware                │
│  - Request validation (Pydantic)                                │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  backend/services                                               │
│  - auth_service.py             - brand_kit_service.py           │
│  - generation_service.py       - coach/ (Prompt Coach)          │
│  - subscription_service.py     - analytics_service.py           │
│  - storage_service.py          - stripe_service.py              │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
        ┌──────────────────┐ ┌──────────┐ ┌──────────┐
        │  PostgreSQL      │ │  Redis   │ │  Google  │
        │  (Supabase)      │ │  (Cache) │ │  Gemini  │
        │  - Users         │ │  - Jobs  │ │  (LLM)   │
        │  - Brand Kits    │ │  - Cache │ │          │
        │  - Assets        │ │  - Queue │ │          │
        │  - Jobs          │ │          │ │          │
        └──────────────────┘ └──────────┘ └──────────┘
```

---

## Database Schema (6 Core Tables)

### 1. **users**
Core user accounts with subscription tracking
```sql
id (UUID) | email | password_hash | display_name | avatar_url
subscription_tier (free|pro|studio) | subscription_status
assets_generated_this_month | created_at | updated_at
```

### 2. **brand_kits**
User-defined branding configurations
```sql
id | user_id | name | is_active | primary_colors[] | accent_colors[]
fonts (JSONB) | logo_url | tone | style_reference | created_at | updated_at
```

### 3. **generation_jobs**
Asset generation requests and processing status
```sql
id | user_id | status (queued|processing|completed|failed)
asset_type | custom_prompt | brand_kit_id | total_assets | completed_assets
queued_at | started_at | completed_at | error_message | created_at | updated_at
```

### 4. **assets**
Generated assets with storage references
```sql
id | user_id | job_id | brand_kit_id | asset_type | width | height | format
cdn_url | storage_key | shareable_url | is_public | prompt_used
generation_params (JSONB) | viral_score | created_at | expires_at
```

### 5. **subscriptions**
Stripe subscription management (paid tiers only)
```sql
id | user_id | stripe_subscription_id | stripe_customer_id | stripe_price_id
tier (pro|studio) | status | current_period_start | current_period_end
cancel_at_period_end | created_at | updated_at
```

### 6. **coach_sessions**
Persisted Prompt Coach conversations
```sql
id | user_id | brand_kit_id | asset_type | mood | game_context
status (active|ended|expired) | turns_used | current_prompt
messages (JSONB) | generated_asset_ids[] | created_at | updated_at | ended_at
```

**Additional Tables:** `auth_tokens`, `platform_connections`, `analytics_events`, `subscription_events`, `coach_sessions`

---

## API Structure (40+ Endpoints)

### Authentication (14 endpoints)
```
POST   /api/v1/auth/signup
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
PUT    /api/v1/auth/me
POST   /api/v1/auth/me/password
DELETE /api/v1/auth/me
POST   /api/v1/auth/password-reset/request
POST   /api/v1/auth/password-reset/confirm
POST   /api/v1/auth/email/verify/request
GET    /api/v1/auth/email/verify/{token}
POST   /api/v1/auth/oauth/{provider}
GET    /api/v1/auth/oauth/{provider}/callback
```

### Brand Kits (15 endpoints)
```
GET    /api/v1/brand-kits
POST   /api/v1/brand-kits
GET    /api/v1/brand-kits/active
GET    /api/v1/brand-kits/{id}
PUT    /api/v1/brand-kits/{id}
DELETE /api/v1/brand-kits/{id}
POST   /api/v1/brand-kits/{id}/activate
GET    /api/v1/brand-kits/{id}/colors
PUT    /api/v1/brand-kits/{id}/colors
GET    /api/v1/brand-kits/{id}/typography
PUT    /api/v1/brand-kits/{id}/typography
GET    /api/v1/brand-kits/{id}/voice
PUT    /api/v1/brand-kits/{id}/voice
GET    /api/v1/brand-kits/{id}/logos
POST   /api/v1/brand-kits/{id}/logos
```

### Asset Generation (8 endpoints)
```
POST   /api/v1/generate
GET    /api/v1/jobs
GET    /api/v1/jobs/{id}
GET    /api/v1/jobs/{id}/assets
POST   /api/v1/twitch/generate
POST   /api/v1/twitch/packs
GET    /api/v1/twitch/packs/{id}
GET    /api/v1/twitch/dimensions
```

### Prompt Coach (6 endpoints) — **Premium Feature**
```
GET    /api/v1/coach/tips              (all tiers)
GET    /api/v1/coach/access            (all tiers)
POST   /api/v1/coach/start             (SSE streaming, Studio only)
POST   /api/v1/coach/sessions/{id}/messages (SSE streaming, Studio only)
GET    /api/v1/coach/sessions/{id}
POST   /api/v1/coach/sessions/{id}/end
```

### Assets Management (5 endpoints)
```
GET    /api/v1/assets
GET    /api/v1/assets/{id}
DELETE /api/v1/assets/{id}
PUT    /api/v1/assets/{id}/visibility
GET    /api/v1/asset/{id}              (public, no auth)
```

### Analytics (7 endpoints) — **Admin Only**
```
POST   /api/v1/analytics
GET    /api/v1/analytics/health
GET    /api/v1/analytics/summary
DELETE /api/v1/analytics/clear
POST   /api/v1/analytics/flush
GET    /api/v1/analytics/popular-assets
GET    /api/v1/analytics/flush-status
```

### Subscriptions (4 endpoints)
```
POST   /api/v1/subscriptions/checkout
POST   /api/v1/subscriptions/portal
GET    /api/v1/subscriptions/status
POST   /api/v1/subscriptions/cancel
```

---

## Frontend Structure

### Web App (Next.js 14)
```
tsx/apps/web/src/app/
├── (auth)/                    # Auth routes (login, signup, password reset)
├── (legal)/                   # Legal pages (terms, privacy)
├── admin/                     # Admin dashboard (analytics)
├── dashboard/                 # Main app
│   ├── create/               # Asset creation flow
│   ├── generate/[jobId]/     # Generation progress
│   ├── brand-kits/           # Brand kit management
│   ├── assets/               # Asset library
│   ├── coach/                # Coach interface
│   ├── settings/             # User settings
│   └── quick-create/         # Quick generation
├── page.tsx                  # Landing page
└── layout.tsx                # Root layout
```

### Shared Packages
```
tsx/packages/
├── api-client/               # Type-safe API client with React Query hooks
├── shared/                   # Shared utilities, stores, hooks, types
│   ├── analytics/           # Event tracking system
│   ├── stores/              # Zustand stores (auth, preferences, undo, etc.)
│   ├── hooks/               # Custom React hooks
│   ├── constants/           # Milestones, rarity, legal
│   └── utils/               # Utilities (devLogger, etc.)
└── ui/                       # Reusable UI components
```

### Key Components
- **CoachChatIntegrated:** Main Coach interface with SSE streaming
- **CreateCoachIntegration:** Coach integration in create flow
- **UsageDisplay:** Tier-specific usage stats and upgrade CTAs
- **SessionContextBar:** Shows Coach session state (turns remaining, warnings)
- **HeroShowcase:** Landing page hero with parallax effects
- **OnboardingTour:** 5-step guided tour for new users

---

## Core Features Deep Dive

### 1. Prompt Coach (Premium Feature)
**What it does:** AI assistant that helps users refine their creative vision through conversation

**Architecture:**
- **Backend:** `backend/services/coach/` (coach_service.py, session_manager.py, llm_client.py)
- **Frontend:** `tsx/apps/web/src/components/coach/`
- **Protocol:** Server-Sent Events (SSE) for real-time streaming
- **LLM:** Google Gemini API with custom system prompts

**Key Characteristics:**
- **Studio tier only** (free users get 1 trial session)
- **10 conversation turns** per session
- **30-minute inactivity timeout**
- **Grounding strategy:** Optional web search for context (Studio tier)
- **Output:** Refined "creative intent" (not exposed prompts)

**Session Flow:**
1. User starts session with optional brand context
2. Coach asks clarifying questions (3-4 turns)
3. User iterates on vision
4. Coach refines prompt
5. User can generate inline or end session

### 2. Brand Kits
**What it does:** Save and reuse brand identity across all assets

**Components:**
- Primary/accent colors
- Typography (headline/body fonts)
- Logo variants (primary, secondary, icon, monochrome, watermark)
- Brand voice/tone
- Style guidelines

**Features:**
- Only 1 active brand kit per user
- Auto-applied to new generations
- Supports extended metadata (JSONB)

### 3. Asset Generation
**What it does:** AI-powered creation of platform-specific assets

**Supported Asset Types:**
- **Twitch:** Emotes, badges, panels, offline screens, banners
- **YouTube:** Thumbnails, channel banners, end screens
- **TikTok:** Story graphics, profile assets
- **General:** Overlays, story graphics, custom banners

**Generation Pipeline:**
1. User submits generation request
2. Job queued in Redis
3. Worker processes (4 workers in production)
4. Image generated via Nano Banana/Gemini
5. Stored in Supabase Storage
6. Asset record created in PostgreSQL
7. User notified via SSE or polling

### 4. Analytics System
**Architecture:**
```
Frontend Events → Redis (real-time) → PostgreSQL (hourly flush)
                                    ↓
                            Admin Dashboard
```

**Event Categories:** page, modal, wizard, user_action, feature, performance, error

**Metrics Tracked:**
- Page views and flow
- Feature usage (Coach, generation, brand kits)
- Funnel events (signup → first generation)
- Popular asset types
- Session duration

### 5. UX Polish Features
- **Keyboard Shortcuts:** ⌘K (command palette), N (new), B (brand kits), A (assets), ? (help)
- **Command Palette:** Quick navigation and actions
- **Smart Defaults:** Persists user preferences (last brand kit, asset type)
- **Optimistic Updates:** Instant UI feedback with rollback on error
- **Undo System:** 5-second countdown for destructive actions
- **Empty States:** Context-aware illustrations and CTAs
- **Generation Celebrations:** Milestone achievements (1st, 10th, 50th, 100th asset)
- **Onboarding Tour:** 5-step guided tour for new users
- **Inline Validation:** Debounced validation with positive feedback
- **Content Skeletons:** Shimmer animations with reduced motion support

---

## Deployment & Operations

### Development Environment
```bash
docker compose up
# Brings up: API (8001), Redis (6380), Worker (4 replicas), Web (3000)
```

### Production Deployment (DigitalOcean)
```bash
./scripts/deploy-prod.sh
# Builds and starts: API (8001), Redis (6381), Worker (4 replicas), Web (3001)
# Nginx proxies to these ports with SSL
```

### Environment Configuration
**Key Variables:**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET_KEY` (32+ chars)
- `GOOGLE_API_KEY` (Gemini)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `REDIS_URL`
- `ALLOWED_ORIGINS` (CORS)

### Monitoring
- Health checks on all services
- Error tracking (Sentry optional)
- Redis queue monitoring
- PostgreSQL query performance
- API response times

---

## Security & Compliance

### Authentication
- JWT tokens (24-hour expiration)
- Refresh token rotation
- CSRF protection
- Rate limiting on auth endpoints

### Authorization
- Row Level Security (RLS) on all tables
- Users can only access their own data
- Tier-based feature access
- Service role for webhook processing

### Data Protection
- Encrypted OAuth tokens (at rest)
- HTTPS only (production)
- Password hashing (bcrypt)
- Email verification required

### Compliance
- GDPR-ready (user deletion, data export)
- Terms of Service & Privacy Policy
- Audit logging for sensitive operations

---

## Testing Strategy

### Backend Tests
```
backend/tests/
├── unit/           # Mocked dependencies
├── integration/    # Real services
├── e2e/           # End-to-end flows
└── properties/    # Property-based tests
```

### Frontend Tests
```
tsx/apps/web/
├── e2e/           # Playwright E2E tests
└── src/__tests__/ # Vitest unit tests
```

### Test Commands
```bash
# Backend
python3 -m pytest backend/tests/unit -v
python3 -m pytest backend/tests/integration -v
python3 -m ruff check backend

# Frontend
npm run test --workspace=@aurastream/web
npm run lint --workspace=@aurastream/web
```

---

## Key Metrics & Performance

### Usage Limits by Tier
| Metric | Free | Pro | Studio |
|--------|------|-----|--------|
| Generations/month | 3 | 50 | Unlimited |
| Coach sessions | 1 trial | Unlimited | Unlimited |
| Platform connections | 1 | 3 | Unlimited |
| Asset storage | 30 days | Unlimited | Unlimited |
| Priority queue | No | Yes | Yes |

### Performance Targets
- API response time: <200ms (p95)
- Asset generation: <30s (average)
- Page load: <2s (First Contentful Paint)
- Coach response: <5s (streaming)

### Scalability
- Horizontal scaling: Multiple workers, load-balanced API
- Database: PostgreSQL with RLS indexes
- Cache: Redis for session/job state
- Storage: S3-compatible (Supabase Storage)

---

## Notable Implementation Details

### Case Transformation
- **Backend:** snake_case (Python convention)
- **Frontend:** camelCase (JavaScript convention)
- **Transformation:** Automatic in API client (`tsx/packages/api-client`)

### Optional Fields
- `brandKitId` is **optional** in generation requests
- `brandContext` is **optional** in Coach sessions
- Properly typed as `string | null` in TypeScript

### Streaming Responses
- Coach messages: SSE with `StreamChunkType` enum
- Generation progress: SSE with job status updates
- Chunk types: token, intent_ready, grounding, grounding_complete, done, error

### Idempotency
- Stripe webhook events: Tracked by `stripe_event_id`
- Prevents duplicate processing of subscription changes
- Audit trail in `subscription_events` table

---

## Recent Enhancements (December 2025)

1. **Coach Trial System:** Free users get 1 full Coach session
2. **Site Analytics:** Visitor tracking, funnel analysis, page flow
3. **Asset Types Expansion:** Added 11 new asset types for Coach
4. **Usage Counters:** Synced between `users` and `subscriptions` tables
5. **UX Audit Recommendations:** Implemented high-priority conversion optimizations

---

## Getting Started for Developers

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+
- Git

### Quick Start
```bash
# Clone and setup
git clone <repo>
cd aurastream

# Backend
cd backend
cp .env.example .env
# Fill in required env vars

# Frontend
cd ../tsx
npm install
npm run dev

# Start services
docker compose up
```

### Key Files to Know
- `AURASTREAM_MASTER_SCHEMA.md` — Comprehensive reference
- `docs/AURASTREAM_USER_GUIDE.md` — User documentation
- `docs/UX_AUDIT_REPORT.md` — UX analysis and recommendations
- `backend/database/migrations/` — Schema evolution
- `backend/api/routes/` — API endpoints
- `tsx/apps/web/src/app/` — Frontend pages

---

## Conclusion

AuraStream is a well-architected, production-ready SaaS platform that successfully combines sophisticated AI capabilities with a polished user experience. The codebase demonstrates strong engineering practices including comprehensive testing, security-first design, and thoughtful UX polish. The Prompt Coach feature represents an innovative approach to AI-assisted content creation, and the platform's subscription model provides clear monetization pathways while maintaining strong free-tier value.

**Current Status:** Production-ready with active development on UX optimizations and feature expansion.

---

*For detailed technical specifications, see AURASTREAM_MASTER_SCHEMA.md*
