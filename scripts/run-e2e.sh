#!/bin/bash
# =============================================================================
# E2E Test Runner Script
# =============================================================================
#
# Usage:
#   ./scripts/run-e2e.sh                    # Run all tests
#   ./scripts/run-e2e.sh health             # Run health tests only
#   ./scripts/run-e2e.sh backend_smoke      # Run backend smoke tests
#   ./scripts/run-e2e.sh all json           # Run all with JSON report only
#
# Environment Variables:
#   E2E_API_URL       - Backend API URL (default: http://localhost:8000)
#   E2E_BASE_URL      - Frontend URL (default: http://localhost:3000)
#   E2E_REDIS_URL     - Redis URL (default: redis://localhost:6379)
#
# =============================================================================

set -e

# Configuration
PHASE=${1:-all}
REPORT=${2:-console,json}

echo "🚀 Starting E2E Test Suite"
echo "Phase: $PHASE"
echo "Report: $REPORT"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Build and run tests
echo "📦 Building test environment..."
docker compose -f docker-compose.test.yml build

echo "🏃 Running E2E tests..."
docker compose -f docker-compose.test.yml run --rm e2e-runner \
    python orchestrator.py --phase "$PHASE" --report "$REPORT"

EXIT_CODE=$?

# Cleanup
echo "🧹 Cleaning up..."
docker compose -f docker-compose.test.yml down

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ E2E tests passed!"
else
    echo "❌ E2E tests failed!"
fi

exit $EXIT_CODE
