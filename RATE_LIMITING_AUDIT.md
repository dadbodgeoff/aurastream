# 🔒 AuraStream Rate Limiting Audit Report

**Date:** January 3, 2026  
**Status:** AUDIT COMPLETE - CONSOLIDATION REQUIRED

---

## Executive Summary

AuraStream has **5 separate rate limiting systems** that have been built incrementally. While functional, they create maintenance overhead and inconsistent behavior. This audit recommends consolidating into a **unified two-tier system** (Free/Premium) with an admin dashboard.

---

## Current Systems Found

### System 1: In-Memory Rate Limiting
**File:** `backend/api/middleware/rate_limit.py`  
**Status:** ⚠️ KEEP (for development/fallback)

| Feature | Limit | Window |
|---------|-------|--------|
| Login | 5 attempts | 15 min |
| Signup | 10 attempts | 1 hour |
| Coach Messages | 10/user | 1 min |
| Coach Sessions | 20/user | 1 hour |

**Global API (per minute):**
- Anonymous: 30 req/min
- Free: 60 req/min
- Pro: 120 req/min
- Studio: 300 req/min

### System 2: Redis Rate Limiting
**File:** `backend/api/middleware/rate_limit_redis.py`  
**Status:** ✅ KEEP (production-ready)

- Sliding window algorithm
- Distributed across instances
- Survives restarts
- Atomic operations

### System 3: Global API Middleware
**File:** `backend/api/middleware/api_rate_limit.py`  
**Status:** ✅ KEEP (tier-based API limiting)

Adds headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### System 4: Promo Service Rate Limiting
**File:** `backend/services/promo_service.py`  
**Status:** ⚠️ CONSOLIDATE

- 10 checkout sessions/hour
- Redis-backed
- Standalone implementation

### System 5: Database Monthly Usage Limits
**File:** `backend/database/migrations/031_monthly_usage_limits.sql`  
**File:** `backend/services/usage_limit_service.py`  
**Status:** ✅ KEEP (monthly quotas)

| Feature | Free | Pro | Studio |
|---------|------|-----|--------|
| Vibe Branding | 1 | 10 | 10 |
| Aura Lab | 2 | 25 | 25 |
| Coach | 1 | Unlimited | Unlimited |
| Creations | 3 | 50 | 50 |
| Profile Creator | 1 | 5 | 10 |
| Refinements | 0 | 5 | Unlimited |

---

## All API Endpoints Requiring Rate Limits

### 🔐 Authentication (High Security)
| Endpoint | Current Limit | Recommended |
|----------|---------------|-------------|
| `POST /auth/login` | 5/15min per email | ✅ Keep |
| `POST /auth/signup` | 10/hour per IP | ✅ Keep |
| `POST /auth/password-reset/request` | None | 🔴 ADD: 3/hour per email |
| `POST /auth/refresh` | None | 🔴 ADD: 30/min per user |

### 🎨 Asset Generation (Cost-Intensive)
| Endpoint | Current Limit | Recommended Free | Recommended Pro |
|----------|---------------|------------------|-----------------|
| `POST /generate` | 3/month (free), 50/month (pro) | ✅ Keep | ✅ Keep |
| `POST /jobs/{id}/refine` | 0 (free), 5/month (pro) | ✅ Keep | ✅ Keep |
| `GET /jobs/{id}/stream` | None | 🔴 ADD: 10 concurrent | 50 concurrent |

### 🧠 Coach (AI-Intensive)
| Endpoint | Current Limit | Recommended Free | Recommended Pro |
|----------|---------------|------------------|-----------------|
| `POST /coach/start` | 1/month + 20/hour | ✅ Keep | ✅ Keep |
| `POST /coach/sessions/{id}/messages` | 10/min | ✅ Keep | 30/min |
| `POST /coach/sessions/{id}/generate` | Counts as creation | ✅ Keep | ✅ Keep |
| `POST /coach/sessions/{id}/refine` | Counts as refinement | ✅ Keep | ✅ Keep |

### 🎭 Vibe Branding (AI Vision)
| Endpoint | Current Limit | Recommended Free | Recommended Pro |
|----------|---------------|------------------|-----------------|
| `POST /vibe-branding/analyze/upload` | 1/month | ✅ Keep | ✅ Keep |
| `POST /vibe-branding/analyze/url` | 1/month | ✅ Keep | ✅ Keep |

### 🧪 Aura Lab (AI Fusion)
| Endpoint | Current Limit | Recommended Free | Recommended Pro |
|----------|---------------|------------------|-----------------|
| `POST /aura-lab/set-subject` | None | 🔴 ADD: 5/day | 20/day |
| `POST /aura-lab/fuse` | 2/month | ✅ Keep | ✅ Keep |

### 👤 Profile Creator
| Endpoint | Current Limit | Recommended Free | Recommended Pro |
|----------|---------------|------------------|-----------------|
| `POST /profile-creator/start` | 1/month | ✅ Keep | ✅ Keep |
| `POST /profile-creator/sessions/{id}/messages` | None | 🔴 ADD: 10/min | 30/min |
| `POST /profile-creator/sessions/{id}/generate` | Counts as creation | ✅ Keep | ✅ Keep |

### 🖼️ Thumbnail Recreation
| Endpoint | Current Limit | Recommended Free | Recommended Pro |
|----------|---------------|------------------|-----------------|
| `POST /thumbnails/recreate` | Counts as creation | ✅ Keep | ✅ Keep |
| `POST /thumbnails/faces` | None | 🔴 ADD: 5 total | 20 total |

### 🎨 Logo Generation
| Endpoint | Current Limit | Recommended Free | Recommended Pro |
|----------|---------------|------------------|-----------------|
| `POST /logo-generation/generate` | None | 🔴 ADD: Counts as creation | Counts as creation |
| `POST /logo-generation/preview` | None | 🔴 ADD: 20/hour | 100/hour |

### 📊 Brand Kits
| Endpoint | Current Limit | Recommended Free | Recommended Pro |
|----------|---------------|------------------|-----------------|
| `POST /brand-kits` | None | 🔴 ADD: 3 total | 10 total |
| `POST /brand-kits/{id}/logos` | None | 🔴 ADD: 5/kit | 20/kit |

### 📁 Creator Media Library
| Endpoint | Current Limit | Recommended Free | Recommended Pro |
|----------|---------------|------------------|-----------------|
| `POST /creator-media` | None | 🔴 ADD: 50 total | 500 total |
| `POST /creator-media/bulk-delete` | None | 🔴 ADD: 10/request | 50/request |

### 🎮 Twitch Integration
| Endpoint | Current Limit | Recommended Free | Recommended Pro |
|----------|---------------|------------------|-----------------|
| `POST /twitch/generate` | None | 🔴 ADD: Counts as creation | Counts as creation |
| `POST /twitch/packs` | None | 🔴 ADD: 1/month | 5/month |

### 📈 Playbook
| Endpoint | Current Limit | Recommended Free | Recommended Pro |
|----------|---------------|------------------|-----------------|
| `POST /playbook/generate` | Studio only | ✅ Keep | ✅ Keep |

### 💬 Promo Chat
| Endpoint | Current Limit | Recommended Free | Recommended Pro |
|----------|---------------|------------------|-----------------|
| `POST /promo/checkout` | 10/hour | ✅ Keep | ✅ Keep |

### 🔍 Intel Features
| Endpoint | Current Limit | Recommended Free | Recommended Pro |
|----------|---------------|------------------|-----------------|
| `GET /intel/*` | None | 🔴 ADD: 100/hour | 500/hour |
| `GET /thumbnail-intel/*` | None | 🔴 ADD: 50/hour | 200/hour |
| `GET /clip-radar/*` | None | 🔴 ADD: 50/hour | 200/hour |

---

## Recommended Architecture

### Unified Rate Limit Service
```
backend/services/rate_limit/
├── __init__.py
├── service.py          # Main RateLimitService
├── config.py           # All limits in one place
├── storage/
│   ├── memory.py       # In-memory (dev/fallback)
│   └── redis.py        # Redis (production)
├── middleware.py       # FastAPI middleware
└── admin.py            # Admin API for dashboard
```

### Config Structure
```python
RATE_LIMITS = {
    "free": {
        # Per-minute API limits
        "api_requests_per_minute": 60,
        
        # Monthly quotas
        "monthly_creations": 3,
        "monthly_vibe_branding": 1,
        "monthly_aura_lab": 2,
        "monthly_coach_sessions": 1,
        "monthly_profile_creator": 1,
        "monthly_refinements": 0,
        "monthly_twitch_packs": 1,
        
        # Storage limits
        "max_brand_kits": 3,
        "max_logos_per_kit": 5,
        "max_media_assets": 50,
        "max_face_assets": 5,
        
        # Per-action limits
        "coach_messages_per_minute": 10,
        "logo_previews_per_hour": 20,
        "intel_requests_per_hour": 100,
    },
    "pro": {
        "api_requests_per_minute": 240,
        "monthly_creations": 50,
        "monthly_vibe_branding": 10,
        "monthly_aura_lab": 25,
        "monthly_coach_sessions": -1,  # unlimited
        "monthly_profile_creator": 5,
        "monthly_refinements": 5,
        "monthly_twitch_packs": 5,
        "max_brand_kits": 10,
        "max_logos_per_kit": 20,
        "max_media_assets": 500,
        "max_face_assets": 20,
        "coach_messages_per_minute": 30,
        "logo_previews_per_hour": 100,
        "intel_requests_per_hour": 500,
    },
    "studio": {
        # Same as pro but with higher limits
        "api_requests_per_minute": 500,
        "monthly_creations": 100,
        # ... etc
    },
    "unlimited": {
        # All -1 (unlimited)
    }
}
```

---

## Admin Dashboard Requirements

### Route: `GET /admin/rate-limits`
Returns current configuration for all tiers.

### Route: `PUT /admin/rate-limits/{tier}/{limit_key}`
Update a specific limit value.

### Route: `GET /admin/rate-limits/usage/{user_id}`
Get current usage for a specific user.

### Route: `POST /admin/rate-limits/reset/{user_id}`
Reset a user's rate limits (for support).

---

## Migration Plan

### Phase 1: Create Unified Service
1. Create `backend/services/rate_limit/` structure
2. Consolidate all limit configs into `config.py`
3. Implement `RateLimitService` with Redis backend

### Phase 2: Create Admin API
1. Add `/admin/rate-limits` routes
2. Build admin dashboard UI
3. Add audit logging for limit changes

### Phase 3: Migrate Existing Code
1. Update all routes to use new service
2. Remove duplicate implementations
3. Update database migration for new schema

### Phase 4: Cleanup
1. Remove old rate limit files
2. Update documentation
3. Add monitoring/alerting

---

## Files to Modify/Remove

### Keep (Refactor)
- `backend/api/middleware/rate_limit.py` → Move to new service
- `backend/api/middleware/rate_limit_redis.py` → Move to new service
- `backend/services/usage_limit_service.py` → Merge into new service

### Remove After Migration
- `backend/api/middleware/api_rate_limit.py` → Replace with new middleware
- Promo service rate limiting → Use unified service

### New Files
- `backend/services/rate_limit/__init__.py`
- `backend/services/rate_limit/service.py`
- `backend/services/rate_limit/config.py`
- `backend/services/rate_limit/storage/memory.py`
- `backend/services/rate_limit/storage/redis.py`
- `backend/services/rate_limit/middleware.py`
- `backend/services/rate_limit/admin.py`
- `backend/api/routes/admin_rate_limits.py`
- `backend/database/migrations/XXX_unified_rate_limits.sql`

---

## Next Steps

1. ✅ Audit complete
2. ✅ Unified service created (`backend/services/rate_limit/`)
3. ✅ Admin dashboard API created (`backend/api/routes/admin_rate_limits.py`)
4. ✅ Admin dashboard UI created (`tsx/apps/web/src/app/admin/rate-limits/page.tsx`)
5. ✅ Backward compatibility layer created (`backend/services/rate_limit/compat.py`)
6. ✅ Routes migrated to use new service (auth.py, coach.py)
7. ✅ New API middleware created (`backend/api/middleware/api_rate_limit_v2.py`)
8. ⏳ Test and deploy

---

## Files Created/Modified

### New Files
- `backend/services/rate_limit/__init__.py` - Main exports
- `backend/services/rate_limit/config.py` - All 25+ limits configured
- `backend/services/rate_limit/service.py` - Redis-backed service
- `backend/services/rate_limit/compat.py` - Backward compatibility
- `backend/api/routes/admin_rate_limits.py` - Admin API
- `backend/api/middleware/api_rate_limit_v2.py` - New middleware
- `tsx/apps/web/src/app/admin/rate-limits/page.tsx` - Admin UI

### Modified Files
- `backend/api/routes/auth.py` - Updated imports
- `backend/api/routes/coach.py` - Updated imports
- `backend/api/service_dependencies.py` - Added RateLimitServiceDep
- `backend/api/main.py` - Registered admin routes

### Files to Remove (After Testing)
- `backend/api/middleware/rate_limit.py` - Old in-memory implementation
- `backend/api/middleware/api_rate_limit.py` - Old middleware
