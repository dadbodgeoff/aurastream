# E2E Test Orchestration System - Master Specification

## Executive Summary

This specification defines an enterprise-grade end-to-end test orchestration system for Streamer Studio that ensures 100% production readiness validation on every deployment and server restart.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     STREAMER STUDIO E2E TEST ORCHESTRATION                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                           PHASE 1: HEALTH                                │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                    │   │
│  │  │ API      │ │ Redis    │ │ Database │ │ Storage  │  ← PARALLEL        │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘                    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        PHASE 2: BACKEND SMOKE                            │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │   │
│  │  │ Auth │ │Brand │ │ Gen  │ │Asset │ │Twitch│ │Coach │ │Logos │ ← PAR  │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       PHASE 3: FRONTEND SMOKE                            │   │
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐               │   │
│  │  │ Public Pages   │ │ Auth Pages     │ │ Dashboard      │  ← PARALLEL   │   │
│  │  └────────────────┘ └────────────────┘ └────────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       PHASE 4: BACKEND FLOWS                             │   │
│  │  Auth → Brand Kit → Generation → Twitch → Coach  ← SEQUENTIAL           │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       PHASE 5: FRONTEND FLOWS                            │   │
│  │  Auth → Brand Kit → Quick Create → Generation  ← SEQUENTIAL              │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                     PHASE 6: DATABASE INTEGRITY                          │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                     │   │
│  │  │ Schema       │ │ RLS Policies │ │ RPC Functions│  ← PARALLEL         │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Coverage Summary

| Category | Count | Coverage |
|----------|-------|----------|
| API Endpoints | 61 | 100% |
| Database Tables | 7 | 100% |
| Frontend Pages | 15 | 100% |
| API Client Hooks | 40+ | 100% |
| Docker Services | 4 | 100% |
| External Integrations | 3 | Mocked |

## Module Structure

```
.kiro/specs/e2e-test-orchestration/
├── spec.md                          # This file
├── requirements.md                  # Business & functional requirements
├── design.md                        # Technical architecture
├── tasks.md                         # Implementation tasks
└── modules/
    ├── 01-backend-health/spec.md    # Health check tests
    ├── 02-backend-smoke/spec.md     # Endpoint smoke tests
    ├── 03-backend-flows/spec.md     # User flow tests
    ├── 04-frontend-smoke/spec.md    # Page load tests
    ├── 05-frontend-flows/spec.md    # UI flow tests
    └── 06-orchestrator/spec.md      # Orchestration system
```

## Implementation Directory Structure

```
├── backend/tests/e2e/
│   ├── conftest.py
│   ├── health/
│   │   ├── test_api_health.py
│   │   ├── test_redis_health.py
│   │   ├── test_database_health.py
│   │   └── test_storage_health.py
│   ├── smoke/
│   │   ├── test_auth_smoke.py
│   │   ├── test_brand_kits_smoke.py
│   │   ├── test_generation_smoke.py
│   │   ├── test_assets_smoke.py
│   │   ├── test_twitch_smoke.py
│   │   ├── test_coach_smoke.py
│   │   └── test_logos_smoke.py
│   ├── flows/
│   │   ├── test_auth_flow.py
│   │   ├── test_brand_kit_flow.py
│   │   ├── test_generation_flow.py
│   │   ├── test_twitch_flow.py
│   │   └── test_coach_flow.py
│   └── database/
│       ├── test_schema_integrity.py
│       ├── test_rls_policies.py
│       └── test_rpc_functions.py
│
├── tsx/e2e/
│   ├── playwright.config.ts
│   ├── global-setup.ts
│   ├── smoke/
│   │   ├── public-pages.spec.ts
│   │   ├── auth-pages.spec.ts
│   │   └── dashboard-pages.spec.ts
│   └── flows/
│       ├── auth-flow.spec.ts
│       ├── brand-kit-flow.spec.ts
│       ├── quick-create-flow.spec.ts
│       └── generation-flow.spec.ts
│
├── e2e-orchestrator/
│   ├── orchestrator.py
│   ├── config.py
│   ├── Dockerfile
│   ├── runners/
│   │   ├── backend_runner.py
│   │   └── frontend_runner.py
│   └── reporters/
│       ├── console_reporter.py
│       ├── json_reporter.py
│       └── slack_reporter.py
│
├── docker-compose.test.yml
└── .github/workflows/e2e.yml
```

## Execution Phases

| Phase | Name | Tests | Parallel | Timeout | Required | Blocking |
|-------|------|-------|----------|---------|----------|----------|
| 1 | Health | 4 | Yes | 60s | Yes | Yes |
| 2 | BE Smoke | 7 | Yes | 120s | Yes | Yes |
| 3 | FE Smoke | 3 | Yes | 120s | Yes | Yes |
| 4 | BE Flows | 5 | No | 180s | No | No |
| 5 | FE Flows | 4 | No | 180s | No | No |
| 6 | DB Integrity | 3 | Yes | 60s | Yes | Yes |

**Total Estimated Time: < 5 minutes**

## Parallel Execution Strategy

### Backend Tests (Can Run in Parallel)
- All health tests
- All smoke tests
- All database integrity tests

### Frontend Tests (Can Run in Parallel)
- All smoke tests (different browser contexts)

### Sequential Tests (Data Dependencies)
- Backend flow tests (user → brand kit → generation)
- Frontend flow tests (auth → dashboard → actions)

## Docker Integration

### Production Deployment Gate
```yaml
# In deployment pipeline
steps:
  - name: Deploy to staging
    run: docker compose -f docker-compose.staging.yml up -d
  
  - name: Run E2E validation
    run: |
      docker compose -f docker-compose.test.yml run --rm e2e-runner \
        python orchestrator.py --phase health,backend_smoke,frontend_smoke,database_integrity
  
  - name: Promote to production
    if: success()
    run: docker compose -f docker-compose.prod.yml up -d
```

### Health Check Integration
```yaml
# docker-compose.yml
services:
  api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: E2E Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - name: Start services
        run: docker compose -f docker-compose.test.yml up -d --build
      - name: Run E2E tests
        run: docker compose -f docker-compose.test.yml run --rm e2e-runner
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: e2e-results
          path: test-results/
```

## Success Criteria

### Deployment Gate (Required)
- ✅ All health checks pass
- ✅ All smoke tests pass
- ✅ Database integrity verified

### Full Validation (Recommended)
- ✅ All flow tests pass
- ✅ No flaky tests
- ✅ < 5 minute execution time

## Reporting

### Console Output
```
============================================================
🚀 E2E TEST ORCHESTRATION
============================================================

Phases to run: 6
  • health (4 tests)
  • backend_smoke (7 tests)
  • frontend_smoke (3 tests)
  • backend_flows (5 tests)
  • frontend_flows (4 tests)
  • database_integrity (3 tests)

✅ Phase: health (12.34s)
   ✓ api_health (2.1s)
   ✓ redis_health (1.5s)
   ✓ database_health (3.2s)
   ✓ storage_health (5.5s)

✅ Phase: backend_smoke (45.67s)
   ✓ auth_smoke (6.2s)
   ✓ brand_kits_smoke (7.1s)
   ...

============================================================
📊 SUMMARY
============================================================

Total Duration: 234.56s
Phases Passed: 6/6
Phases Failed: 0/6

============================================================
🟢 E2E TESTS PASSED
============================================================
```

### JSON Output
```json
{
  "timestamp": "2024-12-26T10:30:00Z",
  "total_duration": 234.56,
  "total_phases": 6,
  "passed": 6,
  "failed": 0,
  "success": true,
  "phases": [
    {
      "name": "health",
      "status": "passed",
      "duration": 12.34,
      "required": true,
      "tests": [...]
    }
  ]
}
```

## Implementation Priority

### Phase 1: Foundation (Week 1)
1. Create directory structure
2. Implement health tests
3. Implement orchestrator core

### Phase 2: Backend Tests (Week 2)
1. Implement smoke tests
2. Implement flow tests
3. Implement database tests

### Phase 3: Frontend Tests (Week 3)
1. Configure Playwright
2. Implement smoke tests
3. Implement flow tests

### Phase 4: Integration (Week 4)
1. Docker integration
2. CI/CD integration
3. Reporting and notifications

## Maintenance

### Adding New Tests
1. Create test file in appropriate directory
2. Add to test mapping in runner
3. Add to phase configuration
4. Update coverage documentation

### Updating Existing Tests
1. Modify test file
2. Run locally to verify
3. Update documentation if needed

### Troubleshooting
1. Check test-results/ for detailed output
2. Review console logs for errors
3. Verify service health before running tests
4. Check environment variables

## References

- [Requirements](./requirements.md)
- [Technical Design](./design.md)
- [Implementation Tasks](./tasks.md)
- [Module 01: Backend Health](./modules/01-backend-health/spec.md)
- [Module 02: Backend Smoke](./modules/02-backend-smoke/spec.md)
- [Module 03: Backend Flows](./modules/03-backend-flows/spec.md)
- [Module 04: Frontend Smoke](./modules/04-frontend-smoke/spec.md)
- [Module 05: Frontend Flows](./modules/05-frontend-flows/spec.md)
- [Module 06: Orchestrator](./modules/06-orchestrator/spec.md)
