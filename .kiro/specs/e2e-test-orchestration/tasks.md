# E2E Test Orchestration System - Implementation Tasks

## Phase 1: Infrastructure Setup

### Task 1.1: Create Backend E2E Test Structure
- [ ] Create `backend/tests/e2e/` directory structure
- [ ] Create `backend/tests/e2e/__init__.py`
- [ ] Create `backend/tests/e2e/conftest.py` with shared fixtures
- [ ] Create subdirectories: `health/`, `smoke/`, `flows/`, `database/`, `fixtures/`

### Task 1.2: Create Frontend E2E Test Structure
- [ ] Create `tsx/e2e/` directory structure
- [ ] Create `tsx/e2e/playwright.config.ts`
- [ ] Create `tsx/e2e/global-setup.ts`
- [ ] Create `tsx/e2e/global-teardown.ts`
- [ ] Create subdirectories: `smoke/`, `flows/`, `fixtures/`, `utils/`

### Task 1.3: Create Orchestrator Structure
- [ ] Create `e2e-orchestrator/` directory
- [ ] Create `e2e-orchestrator/orchestrator.py`
- [ ] Create `e2e-orchestrator/config.py`
- [ ] Create subdirectories: `runners/`, `reporters/`, `utils/`

### Task 1.4: Create Docker Test Configuration
- [ ] Create `docker-compose.test.yml`
- [ ] Create `e2e-orchestrator/Dockerfile`
- [ ] Update existing Dockerfiles for test mode support

---

## Phase 2: Backend Health Tests

### Task 2.1: API Health Tests
- [ ] Create `backend/tests/e2e/health/test_api_health.py`
- [ ] Test: Health endpoint returns 200
- [ ] Test: Health response includes version
- [ ] Test: Health response includes timestamp
- [ ] Test: Health response includes service status

### Task 2.2: Redis Health Tests
- [ ] Create `backend/tests/e2e/health/test_redis_health.py`
- [ ] Test: Redis connection successful
- [ ] Test: Redis ping responds
- [ ] Test: Redis set/get operations work
- [ ] Test: Redis queue operations work

### Task 2.3: Database Health Tests
- [ ] Create `backend/tests/e2e/health/test_database_health.py`
- [ ] Test: Database connection successful
- [ ] Test: Can execute simple query
- [ ] Test: All tables exist
- [ ] Test: Connection pool healthy

### Task 2.4: Storage Health Tests
- [ ] Create `backend/tests/e2e/health/test_storage_health.py`
- [ ] Test: Storage connection successful
- [ ] Test: All buckets exist (assets, uploads, logos, brand-assets)
- [ ] Test: Can list bucket contents
- [ ] Test: Upload/download operations work

---

## Phase 3: Backend Smoke Tests

### Task 3.1: Auth Smoke Tests
- [ ] Create `backend/tests/e2e/smoke/test_auth_smoke.py`
- [ ] Test: POST /signup reachable (returns 422 for empty body)
- [ ] Test: POST /login reachable (returns 422 for empty body)
- [ ] Test: POST /refresh reachable
- [ ] Test: GET /me requires auth (returns 401)
- [ ] Test: POST /logout requires auth (returns 401)
- [ ] Test: POST /password-reset/request reachable
- [ ] Test: POST /password-reset/confirm reachable
- [ ] Test: OAuth endpoints reachable

### Task 3.2: Brand Kits Smoke Tests
- [ ] Create `backend/tests/e2e/smoke/test_brand_kits_smoke.py`
- [ ] Test: GET /brand-kits requires auth
- [ ] Test: POST /brand-kits requires auth
- [ ] Test: GET /brand-kits/active requires auth
- [ ] Test: Extended endpoints require auth (colors, typography, voice, guidelines)

### Task 3.3: Generation Smoke Tests
- [ ] Create `backend/tests/e2e/smoke/test_generation_smoke.py`
- [ ] Test: POST /generate requires auth
- [ ] Test: GET /jobs requires auth
- [ ] Test: GET /jobs/{id} requires auth

### Task 3.4: Assets Smoke Tests
- [ ] Create `backend/tests/e2e/smoke/test_assets_smoke.py`
- [ ] Test: GET /assets requires auth
- [ ] Test: GET /assets/{id} requires auth
- [ ] Test: DELETE /assets/{id} requires auth
- [ ] Test: GET /asset/{id} (public) returns 404 for invalid ID

### Task 3.5: Twitch Smoke Tests
- [ ] Create `backend/tests/e2e/smoke/test_twitch_smoke.py`
- [ ] Test: GET /twitch/dimensions requires auth
- [ ] Test: POST /twitch/generate requires auth
- [ ] Test: POST /twitch/packs requires auth
- [ ] Test: GET /twitch/game-meta/{id} requires auth

### Task 3.6: Coach Smoke Tests
- [ ] Create `backend/tests/e2e/smoke/test_coach_smoke.py`
- [ ] Test: GET /coach/tips accessible (all tiers)
- [ ] Test: GET /coach/access requires auth
- [ ] Test: POST /coach/start requires auth
- [ ] Test: SSE endpoint headers correct

### Task 3.7: Logos Smoke Tests
- [ ] Create `backend/tests/e2e/smoke/test_logos_smoke.py`
- [ ] Test: POST /brand-kits/{id}/logos requires auth
- [ ] Test: GET /brand-kits/{id}/logos requires auth
- [ ] Test: DELETE /brand-kits/{id}/logos/{type} requires auth

---

## Phase 4: Backend Flow Tests

### Task 4.1: Auth Flow Tests
- [ ] Create `backend/tests/e2e/flows/test_auth_flow.py`
- [ ] Test: Complete signup → login → access → logout flow
- [ ] Test: Token refresh maintains session
- [ ] Test: Password reset flow (request → confirm)
- [ ] Test: Rate limiting enforcement
- [ ] Test: Invalid credentials handling

### Task 4.2: Brand Kit Flow Tests
- [ ] Create `backend/tests/e2e/flows/test_brand_kit_flow.py`
- [ ] Test: Create → Read → Update → Delete flow
- [ ] Test: Extended colors CRUD
- [ ] Test: Typography CRUD
- [ ] Test: Brand voice CRUD
- [ ] Test: Guidelines CRUD
- [ ] Test: Activation flow
- [ ] Test: 10 brand kit limit enforcement

### Task 4.3: Generation Flow Tests
- [ ] Create `backend/tests/e2e/flows/test_generation_flow.py`
- [ ] Test: Create job → Poll status → Get assets flow
- [ ] Test: Job with brand kit context
- [ ] Test: Job status transitions
- [ ] Test: Asset retrieval after completion

### Task 4.4: Twitch Flow Tests
- [ ] Create `backend/tests/e2e/flows/test_twitch_flow.py`
- [ ] Test: Single asset generation flow
- [ ] Test: Pack generation flow
- [ ] Test: Dimension specifications retrieval
- [ ] Test: Game metadata retrieval

### Task 4.5: Coach Flow Tests
- [ ] Create `backend/tests/e2e/flows/test_coach_flow.py`
- [ ] Test: Tips retrieval (all tiers)
- [ ] Test: Session start → messages → end flow
- [ ] Test: Turn limit enforcement
- [ ] Test: Session state persistence

---

## Phase 5: Backend Database Tests

### Task 5.1: Schema Integrity Tests
- [ ] Create `backend/tests/e2e/database/test_schema_integrity.py`
- [ ] Test: All 7 tables exist with correct columns
- [ ] Test: All indexes exist
- [ ] Test: All foreign key constraints valid
- [ ] Test: All check constraints valid

### Task 5.2: RLS Policy Tests
- [ ] Create `backend/tests/e2e/database/test_rls_policies.py`
- [ ] Test: Users can only access own data
- [ ] Test: Public assets accessible without auth
- [ ] Test: Cross-user data isolation

### Task 5.3: RPC Function Tests
- [ ] Create `backend/tests/e2e/database/test_rpc_functions.py`
- [ ] Test: increment_user_usage function
- [ ] Test: reset_monthly_usage function
- [ ] Test: Trigger functions for timestamps

---

## Phase 6: Frontend Smoke Tests

### Task 6.1: Public Pages Smoke Tests
- [ ] Create `tsx/e2e/smoke/public-pages.spec.ts`
- [ ] Test: Landing page loads without errors
- [ ] Test: Landing page has CTA buttons
- [ ] Test: Landing page has navigation
- [ ] Test: 404 page displays correctly

### Task 6.2: Auth Pages Smoke Tests
- [ ] Create `tsx/e2e/smoke/auth-pages.spec.ts`
- [ ] Test: Login page loads with form
- [ ] Test: Signup page loads with form
- [ ] Test: Forgot password page loads
- [ ] Test: Reset password page loads

### Task 6.3: Dashboard Pages Smoke Tests
- [ ] Create `tsx/e2e/smoke/dashboard-pages.spec.ts`
- [ ] Test: Dashboard redirects to login when unauthenticated
- [ ] Test: All dashboard pages redirect when unauthenticated
- [ ] Test: Dashboard loads when authenticated
- [ ] Test: All dashboard pages load when authenticated

---

## Phase 7: Frontend Flow Tests

### Task 7.1: Auth Flow Tests
- [ ] Create `tsx/e2e/flows/auth-flow.spec.ts`
- [ ] Test: Complete signup flow
- [ ] Test: Login with valid credentials
- [ ] Test: Login with invalid credentials shows error
- [ ] Test: Logout clears session
- [ ] Test: Password reset flow

### Task 7.2: Brand Kit Flow Tests
- [ ] Create `tsx/e2e/flows/brand-kit-flow.spec.ts`
- [ ] Test: Create new brand kit
- [ ] Test: Edit brand kit colors
- [ ] Test: Edit brand kit typography
- [ ] Test: Upload logo
- [ ] Test: Delete brand kit

### Task 7.3: Quick Create Flow Tests
- [ ] Create `tsx/e2e/flows/quick-create-flow.spec.ts`
- [ ] Test: Select template
- [ ] Test: Fill template fields
- [ ] Test: Select brand kit
- [ ] Test: Generate asset
- [ ] Test: View generated asset

### Task 7.4: Generation Flow Tests
- [ ] Create `tsx/e2e/flows/generation-flow.spec.ts`
- [ ] Test: Create generation job
- [ ] Test: Monitor job progress
- [ ] Test: View completed assets
- [ ] Test: Share asset publicly
- [ ] Test: Delete asset

---

## Phase 8: Orchestrator Implementation

### Task 8.1: Core Orchestrator
- [ ] Create `e2e-orchestrator/orchestrator.py`
- [ ] Implement phase execution logic
- [ ] Implement parallel test execution
- [ ] Implement dependency resolution
- [ ] Implement retry logic
- [ ] Implement timeout handling

### Task 8.2: Configuration
- [ ] Create `e2e-orchestrator/config.py`
- [ ] Define phase configurations
- [ ] Define test timeouts
- [ ] Define retry policies
- [ ] Define environment variables

### Task 8.3: Backend Runner
- [ ] Create `e2e-orchestrator/runners/backend_runner.py`
- [ ] Implement pytest execution
- [ ] Implement result parsing
- [ ] Implement parallel execution support

### Task 8.4: Frontend Runner
- [ ] Create `e2e-orchestrator/runners/frontend_runner.py`
- [ ] Implement Playwright execution
- [ ] Implement result parsing
- [ ] Implement parallel execution support

### Task 8.5: Reporters
- [ ] Create `e2e-orchestrator/reporters/console_reporter.py`
- [ ] Create `e2e-orchestrator/reporters/json_reporter.py`
- [ ] Create `e2e-orchestrator/reporters/slack_reporter.py`
- [ ] Implement unified reporting interface

---

## Phase 9: Docker Integration

### Task 9.1: Test Docker Compose
- [ ] Create `docker-compose.test.yml`
- [ ] Configure test environment variables
- [ ] Configure service health checks
- [ ] Configure e2e-runner service
- [ ] Configure volume mounts for results

### Task 9.2: E2E Runner Dockerfile
- [ ] Create `e2e-orchestrator/Dockerfile`
- [ ] Install Python dependencies
- [ ] Install Playwright browsers
- [ ] Configure entrypoint

### Task 9.3: Scripts
- [ ] Create `scripts/run-e2e.sh`
- [ ] Create `scripts/seed-test-db.py`
- [ ] Create `scripts/cleanup-test-data.py`

---

## Phase 10: CI/CD Integration

### Task 10.1: GitHub Actions Workflow
- [ ] Create `.github/workflows/e2e.yml`
- [ ] Configure Docker Compose setup
- [ ] Configure service health waiting
- [ ] Configure test execution
- [ ] Configure artifact upload
- [ ] Configure cleanup

### Task 10.2: Production Deployment Integration
- [ ] Add E2E tests to deployment pipeline
- [ ] Configure blue-green deployment gates
- [ ] Configure rollback triggers
- [ ] Configure Slack notifications

---

## Phase 11: Documentation

### Task 11.1: Test Documentation
- [ ] Create `backend/tests/e2e/README.md`
- [ ] Create `tsx/e2e/README.md`
- [ ] Create `e2e-orchestrator/README.md`
- [ ] Document test categories and coverage

### Task 11.2: Runbook
- [ ] Create `docs/e2e-runbook.md`
- [ ] Document local execution
- [ ] Document CI/CD execution
- [ ] Document troubleshooting
- [ ] Document adding new tests

---

## Execution Order

```
Phase 1 (Infrastructure) ──────────────────────────────────────────────────────▶
    │
    ├── Phase 2 (BE Health) ─────────────────────────────────────────────────▶
    │
    ├── Phase 3 (BE Smoke) ──────────────────────────────────────────────────▶
    │
    ├── Phase 4 (BE Flows) ──────────────────────────────────────────────────▶
    │
    ├── Phase 5 (BE Database) ───────────────────────────────────────────────▶
    │
    ├── Phase 6 (FE Smoke) ──────────────────────────────────────────────────▶
    │
    ├── Phase 7 (FE Flows) ──────────────────────────────────────────────────▶
    │
    ├── Phase 8 (Orchestrator) ──────────────────────────────────────────────▶
    │
    ├── Phase 9 (Docker) ────────────────────────────────────────────────────▶
    │
    ├── Phase 10 (CI/CD) ────────────────────────────────────────────────────▶
    │
    └── Phase 11 (Docs) ─────────────────────────────────────────────────────▶
```

## Parallel Execution Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PARALLEL EXECUTION                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 2-5 (Backend)          │  Phase 6-7 (Frontend)                      │
│  ─────────────────────────────│──────────────────────────────────────────  │
│                               │                                             │
│  ┌─────────────────────────┐  │  ┌─────────────────────────────────────┐   │
│  │ Task 2.1: API Health    │  │  │ Task 6.1: Public Pages Smoke       │   │
│  │ Task 2.2: Redis Health  │  │  │ Task 6.2: Auth Pages Smoke         │   │
│  │ Task 2.3: DB Health     │  │  │ Task 6.3: Dashboard Pages Smoke    │   │
│  │ Task 2.4: Storage Health│  │  └─────────────────────────────────────┘   │
│  └─────────────────────────┘  │                                             │
│            ▼                  │                    ▼                        │
│  ┌─────────────────────────┐  │  ┌─────────────────────────────────────┐   │
│  │ Task 3.1-3.7: Smoke     │  │  │ Task 7.1-7.4: Flow Tests           │   │
│  │ (All parallel)          │  │  │ (Sequential - data dependencies)   │   │
│  └─────────────────────────┘  │  └─────────────────────────────────────┘   │
│            ▼                  │                                             │
│  ┌─────────────────────────┐  │                                             │
│  │ Task 4.1-4.5: Flows     │  │                                             │
│  │ (Sequential)            │  │                                             │
│  └─────────────────────────┘  │                                             │
│            ▼                  │                                             │
│  ┌─────────────────────────┐  │                                             │
│  │ Task 5.1-5.3: Database  │  │                                             │
│  │ (All parallel)          │  │                                             │
│  └─────────────────────────┘  │                                             │
│                               │                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Success Criteria

### Phase Completion
- [ ] All health tests pass (4/4)
- [ ] All BE smoke tests pass (7 modules, ~35 tests)
- [ ] All FE smoke tests pass (3 modules, ~15 tests)
- [ ] All BE flow tests pass (5 modules, ~25 tests)
- [ ] All FE flow tests pass (4 modules, ~20 tests)
- [ ] All database tests pass (3 modules, ~15 tests)

### Performance
- [ ] Full suite completes in < 5 minutes
- [ ] Health phase completes in < 60 seconds
- [ ] Smoke phases complete in < 2 minutes each
- [ ] Flow phases complete in < 3 minutes each

### Quality
- [ ] Zero flaky tests
- [ ] 100% endpoint coverage
- [ ] 100% page coverage
- [ ] Clear error messages on failure
- [ ] Actionable test reports
