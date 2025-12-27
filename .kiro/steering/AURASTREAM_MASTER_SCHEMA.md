# 🎮 AURASTREAM MASTER SCHEMA
## Comprehensive Build Reference for AI Agents

**Version:** 1.0.0  
**Last Updated:** December 26, 2025  
**Purpose:** Definitive reference for all agents working on AuraStream codebase

---

## QUICK REFERENCE

### Project Identity
- **Name:** AuraStream (Streamer Studio SaaS)
- **Purpose:** AI-powered asset generation platform for content creators
- **Target Users:** Twitch streamers, YouTubers, content creators
- **Tech Stack:** FastAPI (Python) + Next.js (TypeScript) + Supabase + Redis

### Key Directories
```
/backend          → Python FastAPI backend
/tsx              → TypeScript monorepo (Next.js web, React Native mobile)
/e2e-orchestrator → E2E test orchestration
/scripts          → Utility scripts
```

---

## ARCHITECTURE OVERVIEW

### System Components
```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  tsx/apps/web (Next.js 14)    │  tsx/apps/mobile (Expo)        │
│  - App Router                  │  - React Native                │
│  - TailwindCSS                 │  - Expo Router                 │
│  - TanStack Query              │  - Shared API client           │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API CLIENT LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  tsx/packages/api-client                                        │
│  - Type-safe API calls         - React Query hooks              │
│  - Auth token management       - snake_case ↔ camelCase         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  backend/api (FastAPI)                                          │
│  - REST endpoints              - Pydantic schemas               │
│  - JWT authentication          - Rate limiting                  │
│  - SSE streaming               - CORS middleware                │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  backend/services                                               │
│  - auth_service.py             - brand_kit_service.py           │
│  - generation_service.py       - coach/ (Prompt Coach)          │
│  - logo_service.py             - analytics_service.py           │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  Supabase (PostgreSQL)         │  Redis                         │
│  - Users, Brand Kits           │  - Session cache               │
│  - Jobs, Assets                │  - Analytics events            │
│  - Auth tokens                 │  - Rate limiting               │
│  - RLS policies enabled        │  - Coach sessions              │
└─────────────────────────────────────────────────────────────────┘
```

---

## MODULE REFERENCE

### Module 1: Authentication & Authorization

**Backend Files:**
- `backend/api/routes/auth.py` - Auth endpoints
- `backend/api/schemas/auth.py` - Pydantic schemas
- `backend/services/auth_service.py` - Auth logic
- `backend/services/jwt_service.py` - JWT handling
- `backend/services/password_service.py` - Password hashing

**Frontend Files:**
- `tsx/packages/api-client/src/client.ts` - API client with auth
- `tsx/packages/api-client/src/hooks/useAuth.ts` - Auth hooks
- `tsx/packages/api-client/src/types.ts` - Auth types

**Endpoints (14 total):**
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

**Key Types:**
```typescript
// Frontend (camelCase)
interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string | null;
  subscriptionTier: 'free' | 'pro' | 'studio';
  subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'none';
  assetsGeneratedThisMonth: number;
  createdAt: string;
  updatedAt: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: string;
  user: User;
  csrfToken?: string;
}
```

```python
# Backend (snake_case)
class UserResponse(BaseModel):
    id: str
    email: str
    email_verified: bool
    display_name: str
    avatar_url: Optional[str]
    subscription_tier: Literal['free', 'pro', 'studio']
    subscription_status: Literal['active', 'past_due', 'canceled', 'none']
    assets_generated_this_month: int
    created_at: datetime
    updated_at: datetime
```

---

### Module 2: Brand Kits

**Backend Files:**
- `backend/api/routes/brand_kits.py` - Brand kit endpoints
- `backend/api/routes/logos.py` - Logo management endpoints
- `backend/api/schemas/brand_kit.py` - Core schemas
- `backend/api/schemas/brand_kit_enhanced.py` - Extended schemas
- `backend/services/brand_kit_service.py` - Brand kit logic
- `backend/services/logo_service.py` - Logo management

**Frontend Files:**
- `tsx/packages/api-client/src/hooks/useBrandKits.ts` - Brand kit hooks
- `tsx/packages/api-client/src/hooks/useLogos.ts` - Logo hooks
- `tsx/packages/api-client/src/types/brandKit.ts` - Types

**Endpoints (20 total):**
```
# Core Brand Kit (7)
GET    /api/v1/brand-kits
POST   /api/v1/brand-kits
GET    /api/v1/brand-kits/active
GET    /api/v1/brand-kits/{id}
PUT    /api/v1/brand-kits/{id}
DELETE /api/v1/brand-kits/{id}
POST   /api/v1/brand-kits/{id}/activate

# Extended Brand Kit (8)
GET    /api/v1/brand-kits/{id}/colors
PUT    /api/v1/brand-kits/{id}/colors
GET    /api/v1/brand-kits/{id}/typography
PUT    /api/v1/brand-kits/{id}/typography
GET    /api/v1/brand-kits/{id}/voice
PUT    /api/v1/brand-kits/{id}/voice
GET    /api/v1/brand-kits/{id}/guidelines
PUT    /api/v1/brand-kits/{id}/guidelines

# Logo Management (5)
GET    /api/v1/brand-kits/{id}/logos
POST   /api/v1/brand-kits/{id}/logos
GET    /api/v1/brand-kits/{id}/logos/{type}
DELETE /api/v1/brand-kits/{id}/logos/{type}
PUT    /api/v1/brand-kits/{id}/logos/default
```

**Logo Types:**
```python
LogoType = Literal["primary", "secondary", "icon", "monochrome", "watermark"]
```

---

### Module 3: Asset Generation

**Backend Files:**
- `backend/api/routes/generation.py` - Generation endpoints
- `backend/api/routes/twitch.py` - Twitch-specific endpoints
- `backend/api/schemas/generation.py` - Generation schemas
- `backend/api/schemas/twitch.py` - Twitch schemas
- `backend/services/generation_service.py` - Generation logic
- `backend/services/twitch/context_engine.py` - Twitch context
- `backend/workers/generation_worker.py` - Async worker

**Frontend Files:**
- `tsx/packages/api-client/src/hooks/useGeneration.ts` - Generation hooks
- `tsx/packages/api-client/src/hooks/useAssets.ts` - Asset hooks
- `tsx/packages/api-client/src/types/generation.ts` - Types
- `tsx/packages/api-client/src/types/assets.ts` - Asset types

**Endpoints (8 total):**
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

**Key Enums:**
```python
# Asset Types
AssetType = Literal["twitch_emote", "youtube_thumbnail", "twitch_banner", "twitch_badge", "overlay"]

# Job Status
JobStatus = Literal["queued", "processing", "completed", "failed", "cancelled"]

# Twitch Asset Types (14)
TwitchAssetType = Literal[
    "emote", "badge", "panel", "banner", "offline_screen",
    "schedule", "thumbnail", "overlay", "alert", "transition",
    "starting_soon", "brb", "ending", "chat_box"
]

# Pack Types
PackType = Literal["starter", "pro", "complete"]
```

**CRITICAL: brandKitId is OPTIONAL**
```typescript
// Frontend - brandKitId can be null
interface Job {
  brandKitId: string | null;  // NOT string
}

interface Asset {
  brandKitId?: string | null;  // Optional and nullable
}
```

```python
# Backend - brand_kit_id is Optional
class GenerateRequest(BaseModel):
    brand_kit_id: Optional[str] = None  # Optional
```

---

### Module 4: Prompt Coach

**Backend Files:**
- `backend/api/routes/coach.py` - Coach endpoints
- `backend/api/schemas/coach.py` - Coach schemas
- `backend/services/coach/coach_service.py` - Coach logic
- `backend/services/coach/session_manager.py` - Session management
- `backend/services/coach/grounding.py` - Web grounding
- `backend/services/coach/llm_client.py` - LLM integration

**Frontend Files:**
- `tsx/apps/web/src/hooks/useCoachContext.ts` - Coach context
- `tsx/apps/web/src/components/create/CreateCoachIntegration.tsx` - UI
- `tsx/packages/api-client/src/types/coach.ts` - Types

**Endpoints (6 total):**
```
GET    /api/v1/coach/tips
GET    /api/v1/coach/access
POST   /api/v1/coach/start              # SSE streaming
POST   /api/v1/coach/sessions/{id}/messages  # SSE streaming
GET    /api/v1/coach/sessions/{id}
POST   /api/v1/coach/sessions/{id}/end
```

**Tier Access:**
```python
TIER_ACCESS = {
    "free":   {"coach_access": False, "feature": "tips_only", "grounding": False},
    "pro":    {"coach_access": False, "feature": "tips_only", "grounding": False},
    "studio": {"coach_access": True,  "feature": "full_coach", "grounding": True},
}
```

**Asset Types (11 total):**
```python
AssetTypeEnum = Literal[
    "twitch_emote", "youtube_thumbnail", "twitch_banner", "twitch_badge",
    "overlay", "story_graphic", "tiktok_story", "instagram_story",
    "instagram_reel", "twitch_panel", "twitch_offline"
]
```

**SSE Chunk Types:**
```python
StreamChunkTypeEnum = Literal[
    "token", "intent_ready", "grounding", "grounding_complete", "done", "error"
]
```

**CRITICAL: BrandContext is OPTIONAL**
```python
class StartCoachRequest(BaseModel):
    brand_context: Optional[BrandContext] = None  # OPTIONAL
```

---

### Module 5: Assets Management

**Backend Files:**
- `backend/api/routes/assets.py` - Asset endpoints
- `backend/api/schemas/assets.py` - Asset schemas
- `backend/services/storage_service.py` - Storage logic

**Frontend Files:**
- `tsx/packages/api-client/src/hooks/useAssets.ts` - Asset hooks
- `tsx/packages/api-client/src/types/assets.ts` - Types

**Endpoints (5 total):**
```
GET    /api/v1/assets
GET    /api/v1/assets/{id}
DELETE /api/v1/assets/{id}
PUT    /api/v1/assets/{id}/visibility
GET    /api/v1/asset/{id}              # Public endpoint (no auth)
```

---

### Module 6: Analytics

**Backend Files:**
- `backend/api/routes/analytics.py` - Analytics endpoints
- `backend/services/analytics_service.py` - Analytics logic
- `backend/workers/analytics_flush_worker.py` - Hourly flush worker
- `backend/database/migrations/009_analytics_events.sql` - PostgreSQL tables

**Frontend Files:**
- `tsx/packages/shared/src/analytics/tracker.ts` - Event tracker
- `tsx/packages/shared/src/analytics/hooks.ts` - Analytics hooks
- `tsx/packages/shared/src/analytics/types.ts` - Event types
- `tsx/packages/shared/src/analytics/utils.ts` - Utilities

**Endpoints (7 total):**
```
POST   /api/v1/analytics              # Batch event ingestion
GET    /api/v1/analytics/health       # Health check
GET    /api/v1/analytics/summary      # Admin dashboard
DELETE /api/v1/analytics/clear        # Admin clear
POST   /api/v1/analytics/flush        # Manual flush to PostgreSQL
GET    /api/v1/analytics/popular-assets  # Most popular asset types
GET    /api/v1/analytics/flush-status # Last flush timestamp
```

**Analytics Architecture:**
```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND TRACKER                            │
│  tsx/packages/shared/src/analytics/tracker.ts                   │
│  - Batches events (max 50)                                      │
│  - Sends to POST /api/v1/analytics                              │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     REDIS (Real-time)                           │
│  - Stores events in sorted set by timestamp                     │
│  - Maintains counters for events/categories                     │
│  - Tracks active sessions                                       │
│  - 100k event cap (auto-trimmed)                                │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    (Hourly flush via worker)
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   POSTGRESQL (Long-term)                        │
│  analytics_events: Aggregated hourly event counts               │
│  analytics_asset_popularity: Daily asset type metrics           │
│  - Enables SQL reporting on "Most Popular Asset Types"          │
│  - get_popular_asset_types() RPC function                       │
└─────────────────────────────────────────────────────────────────┘
```

**Event Categories:**
```python
VALID_CATEGORIES = {"page", "modal", "wizard", "user_action", "feature", "performance", "error"}
```

---

## DATABASE SCHEMA

### Tables (6 total)

#### users
```sql
id UUID PRIMARY KEY
email TEXT UNIQUE NOT NULL
email_verified BOOLEAN DEFAULT FALSE
password_hash TEXT
display_name TEXT NOT NULL
avatar_url TEXT
subscription_tier TEXT DEFAULT 'free'
subscription_status TEXT DEFAULT 'none'
stripe_customer_id TEXT
assets_generated_this_month INTEGER DEFAULT 0
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

#### brand_kits
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES users(id)
name TEXT NOT NULL
is_active BOOLEAN DEFAULT FALSE
primary_colors TEXT[] DEFAULT '{}'
accent_colors TEXT[] DEFAULT '{}'
tone TEXT DEFAULT 'professional'
fonts JSONB DEFAULT '{}'
logo_url TEXT
colors_extended JSONB
typography JSONB
voice JSONB
logos JSONB
style_reference TEXT
default_logo_type TEXT DEFAULT 'primary'
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

#### generation_jobs
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES users(id)
parent_job_id UUID REFERENCES generation_jobs(id)
status TEXT DEFAULT 'queued'
job_type TEXT DEFAULT 'single'
asset_type TEXT NOT NULL
custom_prompt TEXT
brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE SET NULL
platform_context JSONB
total_assets INTEGER DEFAULT 1
completed_assets INTEGER DEFAULT 0
failed_assets INTEGER DEFAULT 0
queued_at TIMESTAMPTZ DEFAULT NOW()
started_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
error_message TEXT
retry_count INTEGER DEFAULT 0
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

#### assets
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES users(id)
job_id UUID NOT NULL REFERENCES generation_jobs(id)
brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE SET NULL
asset_type TEXT NOT NULL
width INTEGER NOT NULL
height INTEGER NOT NULL
format TEXT DEFAULT 'png'
url TEXT NOT NULL
storage_path TEXT
file_size BIGINT
is_public BOOLEAN DEFAULT TRUE
prompt_used TEXT
generation_params JSONB
viral_score INTEGER
created_at TIMESTAMPTZ DEFAULT NOW()
```

#### auth_tokens
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
token_type TEXT NOT NULL CHECK (token_type IN ('password_reset', 'email_verification'))
token_hash TEXT NOT NULL
expires_at TIMESTAMPTZ NOT NULL
used_at TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT NOW()
```

#### platform_connections
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES users(id)
platform TEXT NOT NULL
platform_user_id TEXT NOT NULL
access_token TEXT
refresh_token TEXT
expires_at TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

---

## NAMING CONVENTIONS

### Case Transformation Rules

**Backend (Python):** `snake_case`
```python
brand_kit_id: str
user_id: str
created_at: datetime
```

**Frontend (TypeScript):** `camelCase`
```typescript
brandKitId: string;
userId: string;
createdAt: string;
```

**Transformation happens in:**
- `tsx/packages/api-client/src/hooks/*.ts` - Transform functions
- API client automatically handles JSON key transformation

### File Naming

**Backend:**
- Routes: `backend/api/routes/{module}.py`
- Schemas: `backend/api/schemas/{module}.py`
- Services: `backend/services/{module}_service.py`
- Tests: `backend/tests/{type}/test_{module}.py`

**Frontend:**
- Hooks: `tsx/packages/api-client/src/hooks/use{Module}.ts`
- Types: `tsx/packages/api-client/src/types/{module}.ts`
- Pages: `tsx/apps/web/src/app/{route}/page.tsx`
- Components: `tsx/apps/web/src/components/{category}/{Component}.tsx`

---

## TYPE ALIGNMENT RULES

### Rule 1: Optional Fields
When a field is optional in backend, it MUST be optional in frontend:
```python
# Backend
brand_kit_id: Optional[str] = None
```
```typescript
// Frontend
brandKitId?: string | null;
```

### Rule 2: Nullable Fields
When a field can be null, use union type:
```python
# Backend
error_message: Optional[str]
```
```typescript
// Frontend
errorMessage: string | null;
```

### Rule 3: Enum Alignment
All enum values MUST match exactly:
```python
# Backend
JobStatus = Literal["queued", "processing", "completed", "failed", "cancelled"]
```
```typescript
// Frontend
type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
```

### Rule 4: Date/Time Fields
Backend uses `datetime`, frontend uses ISO string:
```python
# Backend
created_at: datetime
```
```typescript
// Frontend
createdAt: string;  // ISO 8601 format
```

---

## SECURITY REQUIREMENTS

### Authentication
- All endpoints except `/auth/signup`, `/auth/login`, and public asset require JWT
- JWT stored in memory (not localStorage)
- CSRF token included in state-changing requests
- Refresh token rotation on use

### Authorization
- RLS (Row Level Security) enabled on all tables
- Users can only access their own data
- Tier-based feature access (free, pro, studio)

### Validation
- All inputs validated with Pydantic (backend)
- File uploads: type and size validation
- Rate limiting on auth endpoints

---

## TESTING REQUIREMENTS

### Backend Tests
```
backend/tests/unit/          → Unit tests (mocked dependencies)
backend/tests/integration/   → Integration tests (real services)
backend/tests/e2e/           → End-to-end tests
backend/tests/properties/    → Property-based tests
```

### Frontend Tests
```
tsx/apps/web/e2e/           → Playwright E2E tests
tsx/packages/*/src/__tests__/ → Unit tests (Vitest)
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

## COMMON PATTERNS

### Adding a New Endpoint

1. **Backend Schema** (`backend/api/schemas/{module}.py`):
```python
class NewRequest(BaseModel):
    field_name: str = Field(..., min_length=1)

class NewResponse(BaseModel):
    id: str
    field_name: str
```

2. **Backend Route** (`backend/api/routes/{module}.py`):
```python
@router.post("/new", response_model=NewResponse)
async def create_new(
    data: NewRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    # Implementation
    return NewResponse(...)
```

3. **Frontend Type** (`tsx/packages/api-client/src/types/{module}.ts`):
```typescript
export interface NewRequest {
  fieldName: string;
}

export interface NewResponse {
  id: string;
  fieldName: string;
}
```

4. **Frontend Hook** (`tsx/packages/api-client/src/hooks/use{Module}.ts`):
```typescript
export function useCreateNew() {
  return useMutation({
    mutationFn: async (data: NewRequest) => {
      const response = await fetch(`${API_BASE}/new`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ field_name: data.fieldName }),
      });
      return transformResponse(await response.json());
    },
  });
}
```

### Adding a New Database Column

1. Create migration: `backend/database/migrations/XXX_{description}.sql`
2. Update Pydantic schema
3. Update TypeScript type
4. Update transform functions
5. Run tests

---

## UX POLISH FEATURES

### Keyboard Navigation
- Global shortcuts: ⌘K (Command Palette), N (New Asset), B (Brand Kits), A (Assets), ? (Show Shortcuts), Escape (Close)
- `KeyboardShortcutsProvider` wraps the app
- `ShortcutsModal` shows all available shortcuts

### Command Palette
- Triggered by ⌘K/Ctrl+K
- Navigation commands: Dashboard, Assets, Brand Kits, Settings, Coach
- Action commands: New Asset, New Brand Kit
- Recent commands tracking
- Files: `tsx/packages/shared/src/stores/commandStore.ts`, `tsx/apps/web/src/components/command-palette/`

### Smart Defaults
- Persists user preferences to localStorage
- Tracks: last brand kit, last asset type, form history
- Files: `tsx/packages/shared/src/stores/preferencesStore.ts`, `tsx/packages/shared/src/hooks/useSmartDefaults.ts`

### Optimistic Updates
- Brand kit activation, asset deletion, brand kit deletion
- Automatic rollback on error
- Files: `tsx/packages/api-client/src/hooks/useOptimistic*.ts`

### Undo System
- 5-second countdown for destructive actions
- Toast notification with undo button
- Files: `tsx/packages/shared/src/stores/undoStore.ts`, `tsx/apps/web/src/components/undo/`

### Empty States
- Context-aware empty states with illustrations
- Tier-specific CTAs
- Files: `tsx/apps/web/src/components/empty-states/`

### Generation Celebrations
- Milestone achievements (1st, 10th, 50th, 100th asset)
- Sound effects (optional)
- Social share buttons
- Files: `tsx/packages/shared/src/constants/milestones.ts`, `tsx/apps/web/src/hooks/useGenerationCelebration.ts`

### Onboarding Tour
- 5-step guided tour for new users
- Auto-starts on first login
- Persists completion state
- Files: `tsx/packages/shared/src/stores/onboardingStore.ts`, `tsx/apps/web/src/components/onboarding/`

### Inline Validation
- Debounced validation with positive feedback
- Pre-built rules: email, password, displayName, etc.
- Files: `tsx/apps/web/src/hooks/useFormValidation.ts`, `tsx/apps/web/src/components/forms/`

### Content-Aware Skeletons
- AssetGridSkeleton, BrandKitCardSkeleton, DashboardStatsSkeleton, CoachMessageSkeleton
- Shimmer animation with reduced motion support
- Files: `tsx/apps/web/src/components/ui/skeletons/`

---

## CHECKLIST FOR CHANGES

Before submitting any change, verify:

- [ ] Backend schema matches frontend type
- [ ] Optional fields marked optional on both sides
- [ ] Nullable fields use `| null` in TypeScript
- [ ] Enum values match exactly
- [ ] snake_case ↔ camelCase transformation handled
- [ ] Tests updated/added
- [ ] Linting passes (`ruff check`, `npm run lint`)
- [ ] Type checking passes (`npx tsc --noEmit`)

---

## QUICK FIXES REFERENCE

### Common Issues

**422 Unprocessable Entity:**
- Check required fields in request body
- Verify field types match schema
- Check enum values are valid

**401 Unauthorized:**
- Verify JWT token is present
- Check token hasn't expired
- Verify Authorization header format: `Bearer {token}`

**403 Forbidden:**
- Check user tier for feature access
- Verify resource ownership

**Type Mismatch:**
- Check snake_case vs camelCase
- Verify optional/nullable alignment
- Check enum values match

---

*This schema is the single source of truth for AuraStream development. All agents should reference this document when making changes.*
