# Phase 0: Foundation — Design Document

## Overview

This design document provides the implementation blueprint for Phase 0: Foundation. All implementations MUST conform to the master schema patterns defined in `.kiro/specs/streamer-studio-master-schema/design.md`.

**Design Principles:**
1. **Master Schema Conformance**: All code follows master schema patterns exactly
2. **Sub-Agent Delegation**: Complex tasks are delegated to sub-agents with clear specifications
3. **Verification First**: No phase proceeds without verification gate passing
4. **Enterprise Patterns**: Production-ready code from day one

---

## Architecture

### Project Structure Overview

```
streamer-studio/
├── backend/                    # FastAPI backend
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py            # App factory, middleware
│   │   ├── config.py          # Pydantic settings
│   │   └── dependencies.py    # DI container
│   ├── services/
│   ├── workers/
│   ├── database/
│   │   └── supabase_client.py
│   ├── tests/
│   │   └── conftest.py
│   ├── .env.example
│   ├── requirements.txt
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── frontend-tsx/               # TSX monorepo
│   ├── apps/
│   │   ├── web/               # Next.js 14
│   │   └── mobile/            # Expo
│   ├── packages/
│   │   ├── ui/                # Shared components + tokens
│   │   ├── api-client/        # API client
│   │   └── shared/            # Utilities
│   ├── turbo.json
│   └── package.json
│
└── frontend-swift/             # Swift iOS app
    ├── StreamerStudio/
    │   ├── App/
    │   ├── Features/
    │   ├── Core/
    │   └── Design/
    └── StreamerStudio.xcodeproj
```

---

## Components and Interfaces

### Backend Configuration

```python
# api/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Environment
    APP_ENV: str = "development"
    DEBUG: bool = True
    
    # Server
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    
    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:19006"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

### FastAPI Application Factory

```python
# api/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

def create_app() -> FastAPI:
    settings = get_settings()
    
    app = FastAPI(
        title="Streamer Studio API",
        version="0.1.0",
        docs_url="/api/docs" if settings.DEBUG else None,
        redoc_url="/api/redoc" if settings.DEBUG else None,
    )
    
    # CORS middleware
    origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Health check
    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "version": "0.1.0",
            "timestamp": datetime.utcnow().isoformat(),
            "environment": settings.APP_ENV,
        }
    
    return app

app = create_app()
```

### Database Schema (SQL)

Per master schema, all tables must be created exactly as specified:

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash TEXT,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'studio')),
    subscription_status TEXT DEFAULT 'none' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'none')),
    stripe_customer_id TEXT,
    assets_generated_this_month INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brand kits table
CREATE TABLE brand_kits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    primary_colors TEXT[] NOT NULL,
    accent_colors TEXT[] DEFAULT '{}',
    fonts JSONB NOT NULL DEFAULT '{"headline": "Inter", "body": "Inter"}',
    logo_url TEXT,
    tone TEXT DEFAULT 'professional' CHECK (tone IN ('competitive', 'casual', 'educational', 'comedic', 'professional')),
    style_reference TEXT,
    extracted_from TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generation jobs table
CREATE TABLE generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_job_id UUID REFERENCES generation_jobs(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'partial')),
    job_type TEXT DEFAULT 'single' CHECK (job_type IN ('single', 'batch', 'variation')),
    asset_type TEXT NOT NULL CHECK (asset_type IN ('thumbnail', 'overlay', 'banner', 'story_graphic', 'clip_cover')),
    custom_prompt TEXT,
    brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE SET NULL,
    platform_context JSONB,
    total_assets INTEGER DEFAULT 1,
    completed_assets INTEGER DEFAULT 0,
    failed_assets INTEGER DEFAULT 0,
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets table
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
    brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE SET NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('thumbnail', 'overlay', 'banner', 'story_graphic', 'clip_cover')),
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    format TEXT DEFAULT 'png' CHECK (format IN ('png', 'jpeg', 'webp')),
    cdn_url TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    shareable_url TEXT NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    prompt_used TEXT NOT NULL,
    generation_params JSONB NOT NULL,
    viral_score INTEGER CHECK (viral_score >= 0 AND viral_score <= 100),
    viral_suggestions TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Platform connections table
CREATE TABLE platform_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('twitch', 'youtube', 'tiktok')),
    platform_user_id TEXT NOT NULL,
    platform_username TEXT NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    cached_metadata JSONB,
    metadata_updated_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, platform)
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'studio')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    assets_limit INTEGER NOT NULL,
    assets_used INTEGER DEFAULT 0,
    platforms_limit INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_brand_kits_user_id ON brand_kits(user_id);
CREATE INDEX idx_generation_jobs_user_id ON generation_jobs(user_id);
CREATE INDEX idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX idx_assets_user_id ON assets(user_id);
CREATE INDEX idx_assets_job_id ON assets(job_id);
CREATE INDEX idx_platform_connections_user_id ON platform_connections(user_id);
```

### Design Token System (TSX)

```typescript
// packages/ui/src/tokens/colors.ts
export const colors = {
  primary: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7c3aed',
    800: '#6b21a8',
    900: '#581c87',
  },
  accent: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
  },
  success: { light: '#86efac', main: '#22c55e', dark: '#16a34a' },
  warning: { light: '#fde047', main: '#eab308', dark: '#ca8a04' },
  error: { light: '#fca5a5', main: '#ef4444', dark: '#dc2626' },
  background: {
    base: '#09090b',
    surface: '#18181b',
    elevated: '#27272a',
    card: '#3f3f46',
  },
  text: {
    primary: '#fafafa',
    secondary: '#a1a1aa',
    tertiary: '#71717a',
    muted: '#52525b',
  },
  border: {
    default: '#3f3f46',
    subtle: '#27272a',
    focus: '#a855f7',
  },
};

// packages/ui/src/tokens/typography.ts
export const typography = {
  fontFamily: {
    sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
    display: '"Cal Sans", "Inter", sans-serif',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeight: {
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
  },
};

// packages/ui/src/tokens/spacing.ts
export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
};

// packages/ui/src/tokens/index.ts
export * from './colors';
export * from './typography';
export * from './spacing';
export * from './shadows';
export * from './animations';
```

---

## Data Models

All data models are defined in the master schema. This phase creates the database tables that implement those models.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: Environment Validation Completeness
*For any* required environment variable, if it is missing, the application SHALL fail to start with a clear error message.

**Validates: Requirements 10.3**

### Property 2: Health Check Response Format
*For any* call to `/health`, the response SHALL contain exactly the fields: status, version, timestamp.

**Validates: Requirements 2.2**

### Property 3: Design Token Type Safety
*For any* design token import, TypeScript SHALL provide autocomplete and type checking for all token values.

**Validates: Requirements 6.4**

---

## Error Handling

### Startup Errors

```python
# api/config.py
from pydantic import ValidationError

def validate_config():
    """Validate all required configuration on startup."""
    try:
        settings = get_settings()
        # Validate Supabase connection
        if not settings.SUPABASE_URL.startswith("https://"):
            raise ValueError("SUPABASE_URL must be HTTPS")
        # Validate JWT secret length
        if len(settings.JWT_SECRET_KEY) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters")
        return settings
    except ValidationError as e:
        print(f"Configuration error: {e}")
        raise SystemExit(1)
```

---

## Testing Strategy

### Phase 0 Tests

1. **Configuration Tests**
   - Test that missing required env vars raise errors
   - Test that invalid values are rejected

2. **Health Check Tests**
   - Test response format
   - Test HTTP status codes

3. **Build Tests**
   - Test that all projects build without errors
   - Test that Docker containers start

### Test Commands

```bash
# Backend
cd backend && pytest tests/ -v

# TSX
cd frontend-tsx && turbo test

# Swift
cd frontend-swift && xcodebuild test
```

---

## Verification Gate 0 Checklist

- [ ] All projects build without errors
- [ ] Database migrations run successfully
- [ ] Health check endpoint returns 200 with correct schema
- [ ] Design tokens compile on all platforms
- [ ] Docker containers start with `docker-compose up`
- [ ] CI pipeline passes all checks

---

## Sub-Agent Delegation Strategy

This phase will delegate tasks to sub-agents as follows:

1. **Backend Setup Agent**: Create FastAPI project structure, config, health endpoint
2. **Database Agent**: Create Supabase tables and storage buckets
3. **TSX Setup Agent**: Create Turborepo structure with packages
4. **Swift Setup Agent**: Create Xcode project with feature architecture
5. **CI/CD Agent**: Create GitHub Actions workflows

Each agent receives:
- Clear task specification
- Master schema reference
- Expected outputs
- Verification criteria
