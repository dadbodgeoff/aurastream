#!/bin/bash
# =============================================================================
# Startup Validation Script
# =============================================================================
#
# Validates that all services are healthy after docker-compose up.
# Run this after starting the stack to ensure everything is operational.
#
# Usage:
#   ./scripts/validate-startup.sh              # Run health + smoke tests (BE + FE)
#   ./scripts/validate-startup.sh --full       # Run all E2E tests
#   ./scripts/validate-startup.sh --health     # Run only health tests
#   ./scripts/validate-startup.sh --backend    # Run only backend tests
#
# =============================================================================

set -e

# Configuration
PHASE=${1:-health,backend_smoke}
API_URL=${E2E_API_URL:-http://localhost:8000}
FRONTEND_URL=${E2E_BASE_URL:-http://localhost:3000}
MAX_RETRIES=30
RETRY_INTERVAL=2
RUN_FRONTEND=true

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Aurastream Startup Validation"
echo "======================================"
echo ""

# Parse arguments
if [ "$1" == "--full" ]; then
    PHASE="all"
elif [ "$1" == "--health" ]; then
    PHASE="health"
    RUN_FRONTEND=false
elif [ "$1" == "--backend" ]; then
    PHASE="health,backend_smoke"
    RUN_FRONTEND=false
fi

# Wait for API to be healthy
echo "⏳ Waiting for API to be healthy..."
for i in $(seq 1 $MAX_RETRIES); do
    if curl -sf "$API_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API is healthy${NC}"
        break
    fi
    if [ $i -eq $MAX_RETRIES ]; then
        echo -e "${RED}❌ API failed to become healthy after $MAX_RETRIES attempts${NC}"
        exit 1
    fi
    echo "   Attempt $i/$MAX_RETRIES - waiting ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
done

# Wait for Frontend to be healthy
echo "⏳ Waiting for Frontend to be healthy..."
FRONTEND_HEALTHY=false
for i in $(seq 1 $MAX_RETRIES); do
    HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" -lt 500 ] && [ "$HTTP_CODE" != "000" ]; then
        echo -e "${GREEN}✅ Frontend is healthy (HTTP $HTTP_CODE)${NC}"
        FRONTEND_HEALTHY=true
        break
    fi
    if [ $i -eq $MAX_RETRIES ]; then
        echo -e "${YELLOW}⚠️ Frontend not healthy (HTTP $HTTP_CODE) - skipping FE tests${NC}"
        RUN_FRONTEND=false
        break
    fi
    echo "   Attempt $i/$MAX_RETRIES - waiting ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
done

echo ""
echo "🧪 Running E2E Tests (Phase: $PHASE)"
echo "======================================"

# Run the backend orchestrator
python3 e2e-orchestrator/orchestrator.py --phase "$PHASE" --report console
BACKEND_EXIT=$?

# Run frontend tests if enabled and frontend is healthy
FE_EXIT=0
if [ "$RUN_FRONTEND" = true ] && [ "$FRONTEND_HEALTHY" = true ]; then
    echo ""
    echo "🎭 Running Frontend E2E Tests"
    echo "======================================"
    npm run test:e2e:smoke --prefix tsx -- --project=chromium
    FE_EXIT=$?
fi

echo ""
if [ $BACKEND_EXIT -eq 0 ] && [ $FE_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ Startup validation PASSED${NC}"
    exit 0
else
    echo -e "${RED}❌ Startup validation FAILED${NC}"
    [ $BACKEND_EXIT -ne 0 ] && echo -e "${RED}   Backend tests failed${NC}"
    [ $FE_EXIT -ne 0 ] && echo -e "${RED}   Frontend tests failed${NC}"
    exit 1
fi
