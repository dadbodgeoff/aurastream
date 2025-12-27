# E2E Test Runner Dockerfile
# Multi-stage build for efficient image size
#
# Build:
#   docker build -f e2e-orchestrator/Dockerfile -t e2e-runner .
#
# Run:
#   docker run --rm e2e-runner --phase health

# =============================================================================
# Stage 1: Base Python image with system dependencies
# =============================================================================
FROM python:3.11-slim as base

RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY e2e-orchestrator/requirements.txt ./e2e-orchestrator/
RUN pip install --no-cache-dir -r e2e-orchestrator/requirements.txt

# =============================================================================
# Stage 2: Install Playwright and browsers
# =============================================================================
FROM base as playwright

RUN pip install playwright \
    && playwright install chromium --with-deps

# =============================================================================
# Stage 3: Final image with all code
# =============================================================================
FROM playwright as final

# Copy orchestrator code
COPY e2e-orchestrator/ ./e2e-orchestrator/

# Copy backend test infrastructure
COPY backend/tests/e2e/ ./backend/tests/e2e/
COPY backend/tests/__init__.py ./backend/tests/
COPY backend/tests/conftest.py ./backend/tests/

# Copy backend source (needed for imports)
COPY backend/api/ ./backend/api/
COPY backend/services/ ./backend/services/
COPY backend/database/ ./backend/database/

# Copy frontend tests
COPY tsx/apps/web/e2e/ ./tsx/apps/web/e2e/

# Create results directory
RUN mkdir -p /app/test-results

WORKDIR /app/e2e-orchestrator

ENV PYTHONPATH=/app

ENTRYPOINT ["python", "orchestrator.py"]
CMD ["--phase", "all", "--report", "json,console"]
