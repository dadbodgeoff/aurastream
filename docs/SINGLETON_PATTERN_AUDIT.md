# 🔧 AuraStream Singleton Pattern Audit & Migration Plan

**Date:** January 2, 2026  
**Priority:** HIGH  
**Status:** ✅ Route Migration Complete - All route files now use FastAPI DI

---

## Executive Summary

AuraStream's backend uses a **global singleton pattern** across **70+ services** that creates:
1. **Testing difficulties** - Manual singleton resets required, test pollution risk
2. **Mocking complexity** - Can't use FastAPI's `Depends()` for clean mocking
3. **Tight coupling** - Services instantiate their own dependencies
4. **Concurrency risks** - Global state in async environment
5. **No dependency validation** - Missing services discovered at runtime

**The Fix:** Migrate to FastAPI's native dependency injection system without breaking existing functionality.

---

## Current Pattern (The Problem)

### Pattern Used in 70+ Services

```python
# backend/services/brand_kit_service.py (and 70+ others)
_brand_kit_service: Optional[BrandKitService] = None

def get_brand_kit_service() -> BrandKitService:
    """Get or create the brand kit service singleton."""
    global _brand_kit_service
    if _brand_kit_service is None:
        _brand_kit_service = BrandKitService()
    return _brand_kit_service
```

### How Routes Currently Use Services

```python
# backend/api/routes/auth.py
from backend.services.auth_service import get_auth_service

@router.post("/login")
async def login(data: LoginRequest):
    auth_service = get_auth_service()  # ← Direct call, NOT Depends()
    user, tokens = await auth_service.login(data.email, data.password)
    return LoginResponse(...)
```

### Why This Is Problematic

| Issue | Impact | Risk Level |
|-------|--------|------------|
| **Test Isolation** | Singletons persist across tests | HIGH |
| **Mocking** | Must patch at module level | HIGH |
| **Circular Dependencies** | Hard to detect | MEDIUM |
| **Thread Safety** | Global state not thread-safe | MEDIUM |
| **Initialization Order** | Unpredictable | LOW |

---

## Complete Service Inventory

### Core Services (8)
| Service | File | Dependencies |
|---------|------|--------------|
| `AuthService` | `auth_service.py` | JWTService, PasswordService, TokenStore |
| `BrandKitService` | `brand_kit_service.py` | Supabase |
| `GenerationService` | `generation_service.py` | BrandKitService, PromptEngine, QuickCreateService |
| `LogoService` | `logo_service.py` | StorageService |
| `StorageService` | `storage_service.py` | Supabase Storage |
| `AnalyticsService` | `analytics_service.py` | Redis |
| `AuditService` | `audit_service.py` | Supabase |
| `AuthTokenService` | `auth_token_service.py` | Supabase |

### Coach Module (9)
| Service | File | Dependencies |
|---------|------|--------------|
| `CoachService` | `coach/coach_service.py` | SessionManager, LLMClient, Validator |
| `SessionManager` | `coach/session_manager.py` | Redis, Supabase |
| `LLMClient` | `coach/llm_client.py` | Gemini API |
| `ResponseProcessor` | `coach/response_processor.py` | None |
| `IntentExtractor` | `coach/intent_extractor.py` | None |
| `StreamingValidator` | `coach/partial_validator.py` | None |
| `TipsService` | `coach/tips_service.py` | None |
| `CoachAnalyticsService` | `coach/analytics_service.py` | Redis |
| `PromptBuilder` | `coach/prompt_builder.py` | None |

### Creator Media Module (7)
| Service | File | Dependencies |
|---------|------|--------------|
| `CreatorMediaService` | `creator_media/service.py` | StorageService, BackgroundRemoval |
| `MediaStorageService` | `creator_media/storage.py` | Supabase Storage |
| `MediaCompositor` | `creator_media/compositor.py` | None |
| `BackgroundRemovalService` | `creator_media/background_removal.py` | External API |
| `PlacementFormatter` | `creator_media/placement_formatter.py` | None |
| `MediaRepository` | `creator_media/repository.py` | Supabase |
| `PromptInjector` | `creator_media/prompt_injector.py` | None |

### Twitch Module (4)
| Service | File | Dependencies |
|---------|------|--------------|
| `TwitchContextEngine` | `twitch/context_engine.py` | BrandKitService, LogoService, GameMetaService |
| `PackService` | `twitch/pack_service.py` | GenerationService |
| `GameMetaService` | `twitch/game_meta.py` | None |

### Trends Module (3)
| Service | File | Dependencies |
|---------|------|--------------|
| `TrendService` | `trends/__init__.py` | YouTubeCollector, TwitchCollector |
| `YouTubeCollector` | `trends/youtube_collector.py` | YouTube API |
| `TwitchCollector` | `trends/twitch_collector.py` | Twitch API |

### Intel Module (10+)
| Service | File | Dependencies |
|---------|------|--------------|
| `DailyInsightGenerator` | `intel/daily_insight_generator.py` | ViralDetector, TitleAnalyzer, CompetitionAnalyzer |
| `MissionGenerator` | `intel/mission_generator.py` | ViralDetector, ScoringEngine |
| `VideoIdeaGenerator` | `intel/video_idea_generator.py` | ViralDetector, TitleAnalyzer, CompetitionAnalyzer |
| `ContentFormatAnalyzer` | `intel/analyzers/content_format.py` | None |
| `DescriptionAnalyzer` | `intel/analyzers/description.py` | None |
| `SemanticAnalyzer` | `intel/analyzers/semantic.py` | None |
| `RegionalAnalyzer` | `intel/analyzers/regional.py` | None |
| `LiveStreamAnalyzer` | `intel/analyzers/live_stream.py` | None |
| `IntelMetrics` | `intel/core/metrics.py` | Redis |

### Other Services (20+)
| Service | File |
|---------|------|
| `PromptEngine` | `prompt_engine.py` |
| `LogoGenerationService` | `logo_generation_service.py` |
| `PromoService` | `promo_service.py` |
| `SimpleAnalyticsService` | `simple_analytics_service.py` |
| `CommunityEngagementService` | `community_engagement_service.py` |
| `CommunityPostService` | `community_post_service.py` |
| `CommunityAdminService` | `community_admin_service.py` |
| `SocialService` | `social_service.py` |
| `OAuthService` | `oauth_service.py` |
| `UsageLimitService` | `usage_limit_service.py` |
| `StripeService` | `stripe_service.py` |
| `SubscriptionService` | `subscription_service.py` |
| `TokenStore` | `token_store.py` |
| `AvatarService` | `avatar_service.py` |
| `WebhookQueue` | `webhook_queue.py` |
| `SiteAnalyticsService` | `site_analytics_service.py` |
| `EnterpriseAnalyticsService` | `enterprise_analytics_service.py` |
| `StreamerAssetService` | `streamer_asset_service.py` |
| `ThumbnailRecreateService` | `thumbnail_recreate_service.py` |
| `ClipRadarService` | `clip_radar/service.py` |
| `RecapService` | `clip_radar/recap_service.py` |
| `ProfileCreatorService` | `profile_creator_service.py` |
| `VibeBrandingService` | `vibe_branding_service.py` |
| `GeminiVisionClient` | `gemini_vision_client.py` |
| `NanoBananaClient` | `nano_banana_client.py` |
| `TitleIntelAnalyzer` | `title_intel/analyzer.py` |

---

## Proposed Solution: FastAPI Dependency Injection

### Phase 1: Create Service Dependencies Module

Create a new file `backend/api/service_dependencies.py`:

```python
"""
Service Dependencies for FastAPI Dependency Injection.

This module provides FastAPI-compatible dependency functions for all services,
enabling proper dependency injection, easier testing, and cleaner mocking.

Usage:
    @router.get("/example")
    async def example(
        auth_service: AuthServiceDep,
        brand_kit_service: BrandKitServiceDep,
    ):
        # Services are injected, not fetched globally
        pass
"""

from typing import Annotated
from fastapi import Depends

# =============================================================================
# Core Services
# =============================================================================

def get_auth_service_dep():
    """Dependency for AuthService - enables DI and testing."""
    from backend.services.auth_service import get_auth_service
    return get_auth_service()

def get_brand_kit_service_dep():
    """Dependency for BrandKitService - enables DI and testing."""
    from backend.services.brand_kit_service import get_brand_kit_service
    return get_brand_kit_service()

def get_generation_service_dep():
    """Dependency for GenerationService - enables DI and testing."""
    from backend.services.generation_service import get_generation_service
    return get_generation_service()

def get_logo_service_dep():
    """Dependency for LogoService - enables DI and testing."""
    from backend.services.logo_service import get_logo_service
    return get_logo_service()

def get_storage_service_dep():
    """Dependency for StorageService - enables DI and testing."""
    from backend.services.storage_service import get_storage_service
    return get_storage_service()

def get_analytics_service_dep():
    """Dependency for AnalyticsService - enables DI and testing."""
    from backend.services.analytics_service import get_analytics_service
    return get_analytics_service()

def get_audit_service_dep():
    """Dependency for AuditService - enables DI and testing."""
    from backend.services.audit_service import get_audit_service
    return get_audit_service()

def get_usage_limit_service_dep():
    """Dependency for UsageLimitService - enables DI and testing."""
    from backend.services.usage_limit_service import get_usage_limit_service
    return get_usage_limit_service()

# =============================================================================
# Type Aliases for Clean Injection
# =============================================================================

from backend.services.auth_service import AuthService
from backend.services.brand_kit_service import BrandKitService
from backend.services.generation_service import GenerationService
from backend.services.logo_service import LogoService
from backend.services.storage_service import StorageService
from backend.services.analytics_service import AnalyticsService
from backend.services.audit_service import AuditService
from backend.services.usage_limit_service import UsageLimitService

AuthServiceDep = Annotated[AuthService, Depends(get_auth_service_dep)]
BrandKitServiceDep = Annotated[BrandKitService, Depends(get_brand_kit_service_dep)]
GenerationServiceDep = Annotated[GenerationService, Depends(get_generation_service_dep)]
LogoServiceDep = Annotated[LogoService, Depends(get_logo_service_dep)]
StorageServiceDep = Annotated[StorageService, Depends(get_storage_service_dep)]
AnalyticsServiceDep = Annotated[AnalyticsService, Depends(get_analytics_service_dep)]
AuditServiceDep = Annotated[AuditService, Depends(get_audit_service_dep)]
UsageLimitServiceDep = Annotated[UsageLimitService, Depends(get_usage_limit_service_dep)]

# =============================================================================
# Coach Module Services
# =============================================================================

def get_coach_service_dep():
    """Dependency for CoachService."""
    from backend.services.coach.coach_service import get_coach_service
    return get_coach_service()

def get_session_manager_dep():
    """Dependency for SessionManager."""
    from backend.services.coach.session_manager import get_session_manager
    return get_session_manager()

from backend.services.coach.coach_service import CoachService
from backend.services.coach.session_manager import SessionManager

CoachServiceDep = Annotated[CoachService, Depends(get_coach_service_dep)]
SessionManagerDep = Annotated[SessionManager, Depends(get_session_manager_dep)]

# =============================================================================
# Twitch Module Services
# =============================================================================

def get_context_engine_dep():
    """Dependency for TwitchContextEngine."""
    from backend.services.twitch.context_engine import get_context_engine
    return get_context_engine()

def get_pack_service_dep():
    """Dependency for PackService."""
    from backend.services.twitch.pack_service import get_pack_service
    return get_pack_service()

from backend.services.twitch.context_engine import TwitchContextEngine
from backend.services.twitch.pack_service import PackService

ContextEngineDep = Annotated[TwitchContextEngine, Depends(get_context_engine_dep)]
PackServiceDep = Annotated[PackService, Depends(get_pack_service_dep)]

# ... Continue for all other services ...
```

### Phase 2: Update Routes to Use Dependencies

**Before (Current):**
```python
# backend/api/routes/auth.py
from backend.services.auth_service import get_auth_service

@router.post("/login")
async def login(data: LoginRequest):
    auth_service = get_auth_service()  # ← Direct call
    user, tokens = await auth_service.login(data.email, data.password)
    return LoginResponse(...)
```

**After (With DI):**
```python
# backend/api/routes/auth.py
from backend.api.service_dependencies import AuthServiceDep, AuditServiceDep

@router.post("/login")
async def login(
    data: LoginRequest,
    auth_service: AuthServiceDep,  # ← Injected via Depends()
    audit_service: AuditServiceDep,
):
    user, tokens = await auth_service.login(data.email, data.password)
    return LoginResponse(...)
```

### Phase 3: Update Test Fixtures

**Before (Current - Manual Reset):**
```python
# backend/tests/conftest.py
@pytest.fixture(autouse=True)
def reset_service_singletons():
    """Reset all service singletons before each test."""
    import backend.services.auth_service as auth_module
    auth_module._auth_service = None
    # ... 70+ more manual resets ...
    yield
    auth_module._auth_service = None
```

**After (With DI Override):**
```python
# backend/tests/conftest.py
from fastapi.testclient import TestClient
from backend.api.main import create_app
from backend.api.service_dependencies import get_auth_service_dep

@pytest.fixture
def mock_auth_service():
    """Create a mock AuthService for testing."""
    mock = MagicMock(spec=AuthService)
    mock.login = AsyncMock(return_value=(mock_user, mock_tokens))
    return mock

@pytest.fixture
def client_with_mocks(mock_auth_service):
    """Create test client with mocked services."""
    app = create_app()
    
    # Override dependencies with mocks
    app.dependency_overrides[get_auth_service_dep] = lambda: mock_auth_service
    
    with TestClient(app) as client:
        yield client
    
    # Clean up overrides
    app.dependency_overrides.clear()
```

---

## Migration Strategy (Non-Breaking)

### Step 1: Add Dependencies Module (No Breaking Changes)
- Create `backend/api/service_dependencies.py`
- Add dependency functions that wrap existing `get_*_service()` calls
- Add type aliases for clean injection

### Step 2: Update Routes Incrementally
- Update one route file at a time
- Replace direct `get_*_service()` calls with `Depends()` injection
- Test each route after migration

### Step 3: Update Test Infrastructure
- Add new fixtures using `dependency_overrides`
- Keep old fixtures for backward compatibility during migration
- Gradually remove manual singleton resets

### Step 4: Optional - Refactor Service Constructors
- Make services accept dependencies via constructor
- Enable true dependency injection for service-to-service dependencies
- This is optional and can be done later

---

## Implementation Priority

### High Priority (Week 1) - ✅ COMPLETED
1. ✅ Create `service_dependencies.py` with core services
2. ✅ Update `auth.py` routes (most tested, highest risk)
3. ✅ Update `brand_kits.py` routes
4. ✅ Update `generation.py` routes
5. ✅ Update `coach.py` routes
6. ✅ Update `twitch.py` routes
7. ✅ Update `assets.py` routes
8. ✅ Update `avatars.py` routes
9. ✅ Update `logos.py` routes

### Medium Priority (Week 2) - ✅ COMPLETED
10. ✅ Update `analytics.py` routes
11. ✅ Update `enterprise_analytics.py` routes
12. ✅ Update `site_analytics.py` routes
13. ✅ Update `webhooks.py` routes
14. ✅ Update `aura_lab.py` routes
15. ✅ Update `community.py` routes
16. ✅ Update `community_engagement.py` routes
17. ✅ Update `community_admin.py` routes
18. ✅ Update `friends.py` routes
19. ✅ Update `promo.py` routes
20. ✅ Update `messages.py` routes
21. ✅ Update `thumbnail_intel.py` routes
22. ✅ Update `streamer_assets.py` routes
23. ✅ Update `logo_generation.py` routes
24. ✅ Update `oauth.py` routes (helper function updated)

### Remaining (TODO items only)
- `trends.py` - Has commented-out TODO service calls (not active code)

### Low Priority (Week 3+)
17. Refactor service constructors for true DI
18. Remove manual singleton resets from conftest.py
19. Add dependency validation at startup
20. Update test fixtures for these routes

---

## Benefits After Migration

| Aspect | Before | After |
|--------|--------|-------|
| **Testing** | Manual singleton resets | `dependency_overrides` |
| **Mocking** | Module-level patching | Clean injection |
| **Type Safety** | Weak (global variables) | Strong (Annotated types) |
| **Discoverability** | Hidden in function bodies | Visible in function signatures |
| **IDE Support** | Limited | Full autocomplete |
| **Circular Deps** | Runtime errors | Startup validation |

---

## Files to Create/Modify

### New Files
- `backend/api/service_dependencies.py` - Service dependency functions and type aliases

### Modified Files (Routes)
- `backend/api/routes/auth.py`
- `backend/api/routes/brand_kits.py`
- `backend/api/routes/generation.py`
- `backend/api/routes/coach.py`
- `backend/api/routes/twitch.py`
- `backend/api/routes/trends.py`
- `backend/api/routes/avatars.py`
- `backend/api/routes/logos.py`
- `backend/api/routes/usage.py`
- `backend/api/routes/oauth.py`
- `backend/api/routes/vibe_branding.py`
- `backend/api/routes/aura_lab.py`
- `backend/api/routes/creator_media.py`
- `backend/api/routes/community.py`
- `backend/api/routes/playbook.py`
- `backend/api/routes/clip_radar.py`
- `backend/api/routes/thumbnail_intel.py`
- `backend/api/routes/intel.py`
- `backend/api/routes/subscriptions.py`
- `backend/api/routes/analytics.py`

### Modified Files (Tests)
- `backend/tests/conftest.py` - Add DI-based fixtures
- All test files using mocked services

---

## Estimated Effort

| Phase | Effort | Risk |
|-------|--------|------|
| Create dependencies module | 2-3 hours | Low |
| Update core routes (auth, brand_kits, generation) | 4-6 hours | Medium |
| Update remaining routes | 6-8 hours | Low |
| Update test infrastructure | 4-6 hours | Medium |
| **Total** | **16-23 hours** | **Medium** |

---

## Conclusion

The singleton pattern is a **significant technical debt** that impacts testing, maintainability, and reliability. The proposed migration to FastAPI's dependency injection:

1. **Doesn't break existing functionality** - Wraps existing singletons
2. **Enables proper testing** - Clean mocking via `dependency_overrides`
3. **Improves code quality** - Dependencies visible in function signatures
4. **Reduces risk** - Gradual migration, one route at a time

**Recommendation:** Start with Phase 1 (create dependencies module) and Phase 2 (update auth routes) to validate the approach before full migration.

---

## Related: Redis Failure Resilience (Implemented)

**Status:** ✅ COMPLETED (January 2, 2026)

### Problem Addressed

The original Redis client (`backend/database/redis_client.py`) was minimal and didn't handle connection failures gracefully:

```python
# OLD - No resilience
def get_redis_client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        _redis_client = redis.from_url(redis_url, decode_responses=True)
    return _redis_client
```

This meant:
- If Redis went down, rate limiting silently failed → brute force attacks possible
- Token blacklist checks might fail open → revoked tokens still work
- Session invalidation on password change might not propagate

### Solution Implemented

Created `ResilientRedisClient` with:

1. **Circuit Breaker Pattern** - Prevents cascading failures
   - Opens after 5 consecutive failures
   - Half-open state after 30s recovery timeout
   - Closes after 3 successful calls in half-open state

2. **Security Modes** (like `SecureAuthService`)
   - `STRICT` (default): Operations fail if Redis unavailable
   - `PERMISSIVE`: Operations degrade gracefully with warnings

3. **Health Checks** - For monitoring and load balancer probes
   - Returns latency, circuit state, and error details
   - Integrated into `/health` endpoint

4. **Comprehensive Logging** - Security events logged at CRITICAL level

### Usage

```python
# New resilient client
from backend.database.redis_client import get_resilient_redis_client

redis = get_resilient_redis_client()

# Operations with fallback (PERMISSIVE mode)
value = await redis.get("key", fallback="default")

# Operations that fail if Redis down (STRICT mode)
try:
    await redis.set("key", "value")
except RedisUnavailableError:
    # Handle Redis being down
    pass

# Health check
status = await redis.health_check()
if not status.is_healthy:
    logger.warning(f"Redis unhealthy: {status.error}")
```

### Environment Variables

```bash
# Security mode (default: strict)
REDIS_SECURITY_MODE=strict  # or "permissive"

# Redis URL (existing)
REDIS_URL=redis://localhost:6379
```

### Files Changed

- `backend/database/redis_client.py` - Added `ResilientRedisClient`, circuit breaker, security modes
- `backend/api/main.py` - Updated `/health` endpoint to include Redis status
- `backend/tests/unit/test_redis_resilience.py` - 22 unit tests for resilience features
- `backend/tests/conftest.py` - Added Redis client reset to test isolation


---

## Related: Blocking Operations in Async Context (Implemented)

**Status:** ✅ COMPLETED (January 2, 2026)

### Problem Addressed

CPU-bound operations like PIL image processing and rembg background removal were blocking the async event loop:

```python
# OLD - Blocking the event loop
async def remove_background(self, image_data: bytes) -> bytes:
    import rembg
    output_bytes = rembg.remove(image_data)  # ← Blocks for seconds!
    # ... rest of processing
```

This caused:
- Request timeouts under load
- Degraded performance for all concurrent requests
- Image processing (which can take seconds) blocking all other requests

### Solution Implemented

Created `backend/services/async_executor.py` with thread pool executors:

1. **CPU Executor** - For CPU-intensive work (PIL, rembg, compression)
   - Pool size based on CPU cores (default: min(4, cpu_count))
   - Prevents overwhelming the system

2. **I/O Executor** - For blocking I/O operations
   - Larger pool since threads mostly wait
   - Default: min(8, cpu_count * 2)

3. **Convenience Functions**
   - `run_cpu_bound()` - Run CPU-intensive functions
   - `run_blocking()` - Run blocking I/O functions
   - `@offload_blocking` / `@offload_cpu_bound` - Decorators

### Usage

```python
from backend.services.async_executor import run_cpu_bound, offload_cpu_bound

# Option 1: Explicit call
async def remove_background(self, image_data: bytes) -> bytes:
    result = await run_cpu_bound(_remove_background_sync, image_data)
    return result

# Option 2: Decorator
@offload_cpu_bound
def process_image(data: bytes) -> bytes:
    # This blocking code runs in thread pool
    img = Image.open(BytesIO(data))
    # ... processing
    return output.getvalue()

# Usage (now async):
result = await process_image(image_bytes)
```

### Environment Variables

```bash
# CPU executor pool size (default: min(4, cpu_count))
CPU_EXECUTOR_POOL_SIZE=4

# I/O executor pool size (default: min(8, cpu_count * 2))
IO_EXECUTOR_POOL_SIZE=8
```

### Files Changed

- `backend/services/async_executor.py` - NEW: Thread pool executor utilities
- `backend/services/creator_media/background_removal.py` - Uses `run_cpu_bound` for rembg
- `backend/services/twitch/asset_pipeline.py` - Uses `run_cpu_bound` for rembg
- `backend/workers/generation_worker.py` - Uses `run_cpu_bound` for emote processing
- `backend/services/logo_compositor.py` - Added `composite_async()` method
- `backend/services/creator_media/compositor.py` - Uses `run_cpu_bound` for PIL compositing
- `backend/tests/unit/test_async_executor.py` - 16 unit tests for executor utilities

### Performance Impact

Before: A single rembg call (~2-3 seconds) would block ALL concurrent requests
After: rembg runs in thread pool, event loop continues serving other requests

This is especially important for:
- Twitch emote generation (rembg + 3 resize operations)
- Media asset compositing (multiple PIL operations)
- Logo compositing
- Any endpoint that processes images
