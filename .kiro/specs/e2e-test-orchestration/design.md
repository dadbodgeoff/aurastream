# E2E Test Orchestration System - Technical Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        E2E TEST ORCHESTRATION SYSTEM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   ORCHESTRATOR  │───▶│  TEST RUNNERS   │───▶│    REPORTERS    │        │
│  │                 │    │                 │    │                 │        │
│  │  - Dependency   │    │  - BE Health    │    │  - Console      │        │
│  │    Resolution   │    │  - BE Smoke     │    │  - JSON         │        │
│  │  - Parallel     │    │  - BE E2E       │    │  - HTML         │        │
│  │    Execution    │    │  - FE Smoke     │    │  - Slack        │        │
│  │  - Retry Logic  │    │  - FE E2E       │    │  - GitHub       │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│           │                      │                      │                  │
│           ▼                      ▼                      ▼                  │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │                        SHARED INFRASTRUCTURE                     │      │
│  │                                                                  │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │      │
│  │  │ Fixtures │  │  Mocks   │  │  Seeds   │  │  Utils   │        │      │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
├── backend/
│   └── tests/
│       └── e2e/                          # Backend E2E Tests
│           ├── __init__.py
│           ├── conftest.py               # Shared fixtures
│           ├── health/                   # Service health checks
│           │   ├── __init__.py
│           │   ├── test_api_health.py
│           │   ├── test_redis_health.py
│           │   ├── test_database_health.py
│           │   └── test_storage_health.py
│           ├── smoke/                    # Endpoint smoke tests
│           │   ├── __init__.py
│           │   ├── test_auth_smoke.py
│           │   ├── test_brand_kits_smoke.py
│           │   ├── test_generation_smoke.py
│           │   ├── test_assets_smoke.py
│           │   ├── test_twitch_smoke.py
│           │   ├── test_coach_smoke.py
│           │   └── test_logos_smoke.py
│           ├── flows/                    # Full user flow tests
│           │   ├── __init__.py
│           │   ├── test_auth_flow.py
│           │   ├── test_brand_kit_flow.py
│           │   ├── test_generation_flow.py
│           │   ├── test_twitch_flow.py
│           │   └── test_coach_flow.py
│           ├── database/                 # Database integrity tests
│           │   ├── __init__.py
│           │   ├── test_schema_integrity.py
│           │   ├── test_rls_policies.py
│           │   └── test_rpc_functions.py
│           └── fixtures/                 # Shared test fixtures
│               ├── __init__.py
│               ├── auth_fixtures.py
│               ├── brand_kit_fixtures.py
│               ├── generation_fixtures.py
│               └── mock_services.py
│
├── tsx/
│   └── e2e/                              # Frontend E2E Tests
│       ├── playwright.config.ts
│       ├── global-setup.ts
│       ├── global-teardown.ts
│       ├── fixtures/
│       │   ├── auth.fixture.ts
│       │   └── api-mock.fixture.ts
│       ├── smoke/                        # Page load smoke tests
│       │   ├── public-pages.spec.ts
│       │   ├── auth-pages.spec.ts
│       │   └── dashboard-pages.spec.ts
│       ├── flows/                        # User flow tests
│       │   ├── auth-flow.spec.ts
│       │   ├── brand-kit-flow.spec.ts
│       │   ├── quick-create-flow.spec.ts
│       │   └── generation-flow.spec.ts
│       └── utils/
│           ├── test-helpers.ts
│           └── api-client.ts
│
├── e2e-orchestrator/                     # Orchestration System
│   ├── orchestrator.py                   # Main orchestrator
│   ├── config.py                         # Configuration
│   ├── runners/
│   │   ├── __init__.py
│   │   ├── backend_runner.py
│   │   └── frontend_runner.py
│   ├── reporters/
│   │   ├── __init__.py
│   │   ├── console_reporter.py
│   │   ├── json_reporter.py
│   │   └── slack_reporter.py
│   └── utils/
│       ├── __init__.py
│       ├── docker_utils.py
│       └── retry_utils.py
│
├── docker-compose.test.yml               # Test environment compose
├── scripts/
│   ├── run-e2e.sh                        # E2E test runner script
│   └── seed-test-db.py                   # Database seeding script
└── .github/
    └── workflows/
        └── e2e.yml                       # E2E CI/CD workflow
```

## Component Design

### 1. Orchestrator (`e2e-orchestrator/orchestrator.py`)

The orchestrator manages test execution order, parallelization, and reporting.

```python
# Execution Phases
PHASES = [
    Phase(
        name="health",
        parallel=True,
        tests=["api_health", "redis_health", "database_health", "storage_health"],
        timeout=60,
        required=True,  # Blocks subsequent phases if failed
    ),
    Phase(
        name="backend_smoke",
        parallel=True,
        tests=["auth_smoke", "brand_kits_smoke", "generation_smoke", "assets_smoke", "twitch_smoke", "coach_smoke", "logos_smoke"],
        timeout=120,
        required=True,
    ),
    Phase(
        name="frontend_smoke",
        parallel=True,
        tests=["public_pages", "auth_pages", "dashboard_pages"],
        timeout=120,
        required=True,
    ),
    Phase(
        name="backend_flows",
        parallel=False,  # Sequential due to data dependencies
        tests=["auth_flow", "brand_kit_flow", "generation_flow", "twitch_flow", "coach_flow"],
        timeout=180,
        required=False,  # Non-blocking for deployment
    ),
    Phase(
        name="frontend_flows",
        parallel=False,
        tests=["auth_flow", "brand_kit_flow", "quick_create_flow", "generation_flow"],
        timeout=180,
        required=False,
    ),
    Phase(
        name="database_integrity",
        parallel=True,
        tests=["schema_integrity", "rls_policies", "rpc_functions"],
        timeout=60,
        required=True,
    ),
]
```

### 2. Backend Test Structure

#### Health Tests
```python
# backend/tests/e2e/health/test_api_health.py
class TestAPIHealth:
    """API server health validation."""
    
    def test_health_endpoint_returns_200(self, client):
        """GET /health returns 200 with healthy status."""
        
    def test_health_includes_version(self, client):
        """Health response includes API version."""
        
    def test_health_includes_timestamp(self, client):
        """Health response includes server timestamp."""
```

#### Smoke Tests
```python
# backend/tests/e2e/smoke/test_auth_smoke.py
class TestAuthSmoke:
    """Authentication endpoint smoke tests."""
    
    def test_signup_endpoint_reachable(self, client):
        """POST /api/v1/auth/signup is reachable."""
        
    def test_login_endpoint_reachable(self, client):
        """POST /api/v1/auth/login is reachable."""
        
    def test_refresh_endpoint_reachable(self, client):
        """POST /api/v1/auth/refresh is reachable."""
        
    def test_me_endpoint_requires_auth(self, client):
        """GET /api/v1/auth/me returns 401 without token."""
        
    def test_logout_endpoint_requires_auth(self, client):
        """POST /api/v1/auth/logout returns 401 without token."""
```

#### Flow Tests
```python
# backend/tests/e2e/flows/test_auth_flow.py
class TestAuthFlow:
    """Complete authentication flow validation."""
    
    def test_signup_login_logout_flow(self, client, test_user):
        """Complete signup → login → access → logout flow."""
        
    def test_token_refresh_flow(self, client, authenticated_user):
        """Token refresh maintains session."""
        
    def test_password_reset_flow(self, client, test_user):
        """Password reset email → token → new password flow."""
```

### 3. Frontend Test Structure

#### Smoke Tests
```typescript
// tsx/e2e/smoke/public-pages.spec.ts
test.describe('Public Pages Smoke Tests', () => {
  test('landing page loads without errors', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Streamer Studio/);
    await expect(page.locator('body')).not.toContainText('Error');
  });
  
  test('landing page has CTA buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /get started/i })).toBeVisible();
  });
});
```

#### Flow Tests
```typescript
// tsx/e2e/flows/auth-flow.spec.ts
test.describe('Authentication Flow', () => {
  test('complete signup flow', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('SecurePass123!');
    await page.getByLabel(/display name/i).fill('Test User');
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page).toHaveURL('/dashboard');
  });
  
  test('login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('existing@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL('/dashboard');
  });
});
```

### 4. Docker Integration

```yaml
# docker-compose.test.yml
services:
  api:
    extends:
      file: docker-compose.yml
      service: api
    environment:
      - APP_ENV=test
      - DATABASE_URL=${TEST_DATABASE_URL}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 30s

  redis:
    extends:
      file: docker-compose.yml
      service: redis

  web:
    extends:
      file: docker-compose.yml
      service: web
    environment:
      - NEXT_PUBLIC_API_URL=http://api:8000
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 60s

  e2e-runner:
    build:
      context: .
      dockerfile: e2e-orchestrator/Dockerfile
    depends_on:
      api:
        condition: service_healthy
      web:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      - API_URL=http://api:8000
      - WEB_URL=http://web:3000
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./test-results:/app/test-results
    command: python orchestrator.py --phase all --report json,console
```

### 5. CI/CD Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Start services
        run: docker compose -f docker-compose.test.yml up -d --build
      
      - name: Wait for services
        run: |
          docker compose -f docker-compose.test.yml exec -T api \
            curl --retry 30 --retry-delay 2 --retry-connrefused http://localhost:8000/health
      
      - name: Run E2E tests
        run: |
          docker compose -f docker-compose.test.yml run --rm e2e-runner \
            python orchestrator.py --phase all --report json,console
      
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-results
          path: test-results/
      
      - name: Stop services
        if: always()
        run: docker compose -f docker-compose.test.yml down -v
```

## Test Categories & Coverage Matrix

| Category | Tests | Parallel | Timeout | Required |
|----------|-------|----------|---------|----------|
| Health | 4 | Yes | 60s | Yes |
| BE Smoke | 7 | Yes | 120s | Yes |
| FE Smoke | 3 | Yes | 120s | Yes |
| BE Flows | 5 | No | 180s | No |
| FE Flows | 4 | No | 180s | No |
| DB Integrity | 3 | Yes | 60s | Yes |

## Endpoint Coverage

### Authentication (11 endpoints)
- POST /signup ✓
- POST /login ✓
- POST /logout ✓
- POST /refresh ✓
- GET /me ✓
- POST /password-reset/request ✓
- POST /password-reset/confirm ✓
- POST /email/verify/request ✓
- GET /email/verify/{token} ✓
- PUT /me ✓
- POST /me/password ✓

### Brand Kits (15 endpoints)
- GET /brand-kits ✓
- POST /brand-kits ✓
- GET /brand-kits/active ✓
- GET /brand-kits/{id} ✓
- PUT /brand-kits/{id} ✓
- DELETE /brand-kits/{id} ✓
- POST /brand-kits/{id}/activate ✓
- PUT /brand-kits/{id}/colors ✓
- GET /brand-kits/{id}/colors ✓
- PUT /brand-kits/{id}/typography ✓
- GET /brand-kits/{id}/typography ✓
- PUT /brand-kits/{id}/voice ✓
- GET /brand-kits/{id}/voice ✓
- PUT /brand-kits/{id}/guidelines ✓
- GET /brand-kits/{id}/guidelines ✓

### Assets (5 endpoints)
- GET /assets ✓
- GET /assets/{id} ✓
- DELETE /assets/{id} ✓
- PUT /assets/{id}/visibility ✓
- GET /asset/{id} (public) ✓

### Generation (4 endpoints)
- POST /generate ✓
- GET /jobs/{id} ✓
- GET /jobs/{id}/assets ✓
- GET /jobs ✓

### Logos (5 endpoints)
- POST /brand-kits/{id}/logos ✓
- GET /brand-kits/{id}/logos ✓
- GET /brand-kits/{id}/logos/{type} ✓
- DELETE /brand-kits/{id}/logos/{type} ✓
- PUT /brand-kits/{id}/logos/default ✓

### Coach (6 endpoints)
- GET /coach/tips ✓
- GET /coach/access ✓
- POST /coach/start ✓
- POST /coach/sessions/{id}/messages ✓
- GET /coach/sessions/{id} ✓
- POST /coach/sessions/{id}/end ✓

### Twitch (5 endpoints)
- POST /twitch/generate ✓
- POST /twitch/packs ✓
- GET /twitch/packs/{id} ✓
- GET /twitch/dimensions ✓
- GET /twitch/game-meta/{id} ✓

### OAuth (2 endpoints)
- POST /oauth/{provider} ✓
- GET /oauth/{provider}/callback ✓

### Streamer Assets (8 endpoints)
- POST /{id}/streamer-assets/overlays ✓
- POST /{id}/streamer-assets/alerts ✓
- POST /{id}/streamer-assets/panels ✓
- POST /{id}/streamer-assets/emotes ✓
- POST /{id}/streamer-assets/badges ✓
- POST /{id}/streamer-assets/facecam ✓
- POST /{id}/streamer-assets/stinger ✓
- DELETE /{id}/streamer-assets/{category}/{id} ✓

**Total: 61 endpoints covered**

## Frontend Page Coverage

| Page | Smoke | Flow |
|------|-------|------|
| Landing (/) | ✓ | - |
| Login (/login) | ✓ | ✓ |
| Signup (/signup) | ✓ | ✓ |
| Forgot Password | ✓ | ✓ |
| Reset Password | ✓ | ✓ |
| Dashboard | ✓ | ✓ |
| Brand Kits | ✓ | ✓ |
| Quick Create | ✓ | ✓ |
| Generate | ✓ | ✓ |
| Assets | ✓ | ✓ |
| Twitch | ✓ | ✓ |
| Coach | ✓ | ✓ |
| Settings | ✓ | ✓ |
| 404 | ✓ | - |
| Error | ✓ | - |

**Total: 15 pages covered**
