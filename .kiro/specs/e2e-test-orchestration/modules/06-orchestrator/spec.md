# Module 06: Test Orchestrator

## Overview
The central orchestration system that manages test execution phases, parallel execution, reporting, and Docker integration.

## Core Files

### `e2e-orchestrator/orchestrator.py`
```python
"""
E2E Test Orchestrator

Central orchestration system for running all E2E tests in phases
with parallel execution, retry logic, and unified reporting.
"""

import asyncio
import sys
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional
from datetime import datetime

from config import PHASES, Config
from runners.backend_runner import BackendRunner
from runners.frontend_runner import FrontendRunner
from reporters.console_reporter import ConsoleReporter
from reporters.json_reporter import JSONReporter
from reporters.slack_reporter import SlackReporter


class TestStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class TestResult:
    name: str
    status: TestStatus
    duration: float
    error: Optional[str] = None
    output: Optional[str] = None


@dataclass
class PhaseResult:
    name: str
    status: TestStatus
    tests: List[TestResult]
    duration: float
    required: bool


class Orchestrator:
    def __init__(self, config: Config):
        self.config = config
        self.backend_runner = BackendRunner(config)
        self.frontend_runner = FrontendRunner(config)
        self.reporters = self._init_reporters()
        self.results: List[PhaseResult] = []
    
    def _init_reporters(self):
        reporters = [ConsoleReporter()]
        if "json" in self.config.report_formats:
            reporters.append(JSONReporter(self.config.output_dir))
        if "slack" in self.config.report_formats and self.config.slack_webhook:
            reporters.append(SlackReporter(self.config.slack_webhook))
        return reporters
    
    async def run(self, phases: Optional[List[str]] = None) -> int:
        """Run all or specified phases."""
        start_time = datetime.now()
        
        phases_to_run = PHASES if phases is None else [p for p in PHASES if p.name in phases]
        
        for reporter in self.reporters:
            reporter.on_start(phases_to_run)
        
        for phase in phases_to_run:
            result = await self._run_phase(phase)
            self.results.append(result)
            
            for reporter in self.reporters:
                reporter.on_phase_complete(result)
            
            # Stop if required phase failed
            if phase.required and result.status == TestStatus.FAILED:
                break
        
        total_duration = (datetime.now() - start_time).total_seconds()
        
        for reporter in self.reporters:
            reporter.on_complete(self.results, total_duration)
        
        # Return exit code
        failed = any(r.status == TestStatus.FAILED and r.required for r in self.results)
        return 1 if failed else 0
    
    async def _run_phase(self, phase) -> PhaseResult:
        """Run a single phase with parallel or sequential execution."""
        start_time = datetime.now()
        
        if phase.parallel:
            results = await self._run_parallel(phase.tests, phase.runner)
        else:
            results = await self._run_sequential(phase.tests, phase.runner)
        
        duration = (datetime.now() - start_time).total_seconds()
        
        status = TestStatus.PASSED if all(r.status == TestStatus.PASSED for r in results) else TestStatus.FAILED
        
        return PhaseResult(
            name=phase.name,
            status=status,
            tests=results,
            duration=duration,
            required=phase.required,
        )
    
    async def _run_parallel(self, tests: List[str], runner: str) -> List[TestResult]:
        """Run tests in parallel."""
        runner_instance = self.backend_runner if runner == "backend" else self.frontend_runner
        tasks = [runner_instance.run_test(test) for test in tests]
        return await asyncio.gather(*tasks)
    
    async def _run_sequential(self, tests: List[str], runner: str) -> List[TestResult]:
        """Run tests sequentially."""
        runner_instance = self.backend_runner if runner == "backend" else self.frontend_runner
        results = []
        for test in tests:
            result = await runner_instance.run_test(test)
            results.append(result)
            if result.status == TestStatus.FAILED:
                break  # Stop on first failure for sequential tests
        return results


async def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="E2E Test Orchestrator")
    parser.add_argument("--phase", nargs="*", help="Specific phases to run")
    parser.add_argument("--report", default="console,json", help="Report formats")
    parser.add_argument("--output", default="./test-results", help="Output directory")
    args = parser.parse_args()
    
    config = Config(
        report_formats=args.report.split(","),
        output_dir=args.output,
    )
    
    orchestrator = Orchestrator(config)
    exit_code = await orchestrator.run(args.phase)
    sys.exit(exit_code)


if __name__ == "__main__":
    asyncio.run(main())
```

### `e2e-orchestrator/config.py`
```python
"""
Orchestrator Configuration

Defines phases, timeouts, and test mappings.
"""

from dataclasses import dataclass, field
from typing import List, Optional
import os


@dataclass
class Phase:
    name: str
    tests: List[str]
    runner: str  # "backend" or "frontend"
    parallel: bool = True
    timeout: int = 120  # seconds
    required: bool = True


PHASES = [
    # Phase 1: Health Checks
    Phase(
        name="health",
        tests=["api_health", "redis_health", "database_health", "storage_health"],
        runner="backend",
        parallel=True,
        timeout=60,
        required=True,
    ),
    
    # Phase 2: Backend Smoke Tests
    Phase(
        name="backend_smoke",
        tests=[
            "auth_smoke",
            "brand_kits_smoke",
            "generation_smoke",
            "assets_smoke",
            "twitch_smoke",
            "coach_smoke",
            "logos_smoke",
        ],
        runner="backend",
        parallel=True,
        timeout=120,
        required=True,
    ),
    
    # Phase 3: Frontend Smoke Tests
    Phase(
        name="frontend_smoke",
        tests=["public_pages", "auth_pages", "dashboard_pages"],
        runner="frontend",
        parallel=True,
        timeout=120,
        required=True,
    ),
    
    # Phase 4: Backend Flow Tests
    Phase(
        name="backend_flows",
        tests=[
            "auth_flow",
            "brand_kit_flow",
            "generation_flow",
            "twitch_flow",
            "coach_flow",
        ],
        runner="backend",
        parallel=False,  # Sequential due to data dependencies
        timeout=180,
        required=False,  # Non-blocking for deployment
    ),
    
    # Phase 5: Frontend Flow Tests
    Phase(
        name="frontend_flows",
        tests=[
            "auth_flow",
            "brand_kit_flow",
            "quick_create_flow",
            "generation_flow",
        ],
        runner="frontend",
        parallel=False,
        timeout=180,
        required=False,
    ),
    
    # Phase 6: Database Integrity Tests
    Phase(
        name="database_integrity",
        tests=["schema_integrity", "rls_policies", "rpc_functions"],
        runner="backend",
        parallel=True,
        timeout=60,
        required=True,
    ),
]


@dataclass
class Config:
    api_url: str = field(default_factory=lambda: os.environ.get("API_URL", "http://localhost:8000"))
    web_url: str = field(default_factory=lambda: os.environ.get("WEB_URL", "http://localhost:3000"))
    redis_url: str = field(default_factory=lambda: os.environ.get("REDIS_URL", "redis://localhost:6379"))
    report_formats: List[str] = field(default_factory=lambda: ["console", "json"])
    output_dir: str = "./test-results"
    slack_webhook: Optional[str] = field(default_factory=lambda: os.environ.get("SLACK_WEBHOOK"))
    max_retries: int = 2
    retry_delay: int = 5  # seconds
```

### `e2e-orchestrator/runners/backend_runner.py`
```python
"""
Backend Test Runner

Executes pytest tests and parses results.
"""

import asyncio
import subprocess
import json
from typing import Optional
from dataclasses import dataclass


@dataclass
class TestResult:
    name: str
    status: str
    duration: float
    error: Optional[str] = None
    output: Optional[str] = None


class BackendRunner:
    def __init__(self, config):
        self.config = config
        self.test_mapping = {
            # Health tests
            "api_health": "backend/tests/e2e/health/test_api_health.py",
            "redis_health": "backend/tests/e2e/health/test_redis_health.py",
            "database_health": "backend/tests/e2e/health/test_database_health.py",
            "storage_health": "backend/tests/e2e/health/test_storage_health.py",
            
            # Smoke tests
            "auth_smoke": "backend/tests/e2e/smoke/test_auth_smoke.py",
            "brand_kits_smoke": "backend/tests/e2e/smoke/test_brand_kits_smoke.py",
            "generation_smoke": "backend/tests/e2e/smoke/test_generation_smoke.py",
            "assets_smoke": "backend/tests/e2e/smoke/test_assets_smoke.py",
            "twitch_smoke": "backend/tests/e2e/smoke/test_twitch_smoke.py",
            "coach_smoke": "backend/tests/e2e/smoke/test_coach_smoke.py",
            "logos_smoke": "backend/tests/e2e/smoke/test_logos_smoke.py",
            
            # Flow tests
            "auth_flow": "backend/tests/e2e/flows/test_auth_flow.py",
            "brand_kit_flow": "backend/tests/e2e/flows/test_brand_kit_flow.py",
            "generation_flow": "backend/tests/e2e/flows/test_generation_flow.py",
            "twitch_flow": "backend/tests/e2e/flows/test_twitch_flow.py",
            "coach_flow": "backend/tests/e2e/flows/test_coach_flow.py",
            
            # Database tests
            "schema_integrity": "backend/tests/e2e/database/test_schema_integrity.py",
            "rls_policies": "backend/tests/e2e/database/test_rls_policies.py",
            "rpc_functions": "backend/tests/e2e/database/test_rpc_functions.py",
        }
    
    async def run_test(self, test_name: str) -> TestResult:
        """Run a single test file and return results."""
        test_path = self.test_mapping.get(test_name)
        if not test_path:
            return TestResult(
                name=test_name,
                status="failed",
                duration=0,
                error=f"Unknown test: {test_name}",
            )
        
        cmd = [
            "pytest",
            test_path,
            "-v",
            "--tb=short",
            f"--json-report",
            f"--json-report-file={self.config.output_dir}/{test_name}.json",
        ]
        
        start_time = asyncio.get_event_loop().time()
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={
                "API_URL": self.config.api_url,
                "REDIS_URL": self.config.redis_url,
            },
        )
        
        stdout, stderr = await process.communicate()
        duration = asyncio.get_event_loop().time() - start_time
        
        status = "passed" if process.returncode == 0 else "failed"
        
        return TestResult(
            name=test_name,
            status=status,
            duration=duration,
            error=stderr.decode() if process.returncode != 0 else None,
            output=stdout.decode(),
        )
```

### `e2e-orchestrator/runners/frontend_runner.py`
```python
"""
Frontend Test Runner

Executes Playwright tests and parses results.
"""

import asyncio
from typing import Optional
from dataclasses import dataclass


@dataclass
class TestResult:
    name: str
    status: str
    duration: float
    error: Optional[str] = None
    output: Optional[str] = None


class FrontendRunner:
    def __init__(self, config):
        self.config = config
        self.test_mapping = {
            # Smoke tests
            "public_pages": "tsx/e2e/smoke/public-pages.spec.ts",
            "auth_pages": "tsx/e2e/smoke/auth-pages.spec.ts",
            "dashboard_pages": "tsx/e2e/smoke/dashboard-pages.spec.ts",
            
            # Flow tests
            "auth_flow": "tsx/e2e/flows/auth-flow.spec.ts",
            "brand_kit_flow": "tsx/e2e/flows/brand-kit-flow.spec.ts",
            "quick_create_flow": "tsx/e2e/flows/quick-create-flow.spec.ts",
            "generation_flow": "tsx/e2e/flows/generation-flow.spec.ts",
        }
    
    async def run_test(self, test_name: str) -> TestResult:
        """Run a single test file and return results."""
        test_path = self.test_mapping.get(test_name)
        if not test_path:
            return TestResult(
                name=test_name,
                status="failed",
                duration=0,
                error=f"Unknown test: {test_name}",
            )
        
        cmd = [
            "npx",
            "playwright",
            "test",
            test_path,
            "--reporter=json",
            f"--output={self.config.output_dir}",
        ]
        
        start_time = asyncio.get_event_loop().time()
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd="tsx",
            env={
                "WEB_URL": self.config.web_url,
                "API_URL": self.config.api_url,
            },
        )
        
        stdout, stderr = await process.communicate()
        duration = asyncio.get_event_loop().time() - start_time
        
        status = "passed" if process.returncode == 0 else "failed"
        
        return TestResult(
            name=test_name,
            status=status,
            duration=duration,
            error=stderr.decode() if process.returncode != 0 else None,
            output=stdout.decode(),
        )
```

### `e2e-orchestrator/reporters/console_reporter.py`
```python
"""
Console Reporter

Outputs test results to console with colors and formatting.
"""

from typing import List


class ConsoleReporter:
    def on_start(self, phases):
        print("\n" + "=" * 60)
        print("🚀 E2E TEST ORCHESTRATION")
        print("=" * 60)
        print(f"\nPhases to run: {len(phases)}")
        for phase in phases:
            print(f"  • {phase.name} ({len(phase.tests)} tests)")
        print()
    
    def on_phase_complete(self, result):
        icon = "✅" if result.status.value == "passed" else "❌"
        print(f"\n{icon} Phase: {result.name} ({result.duration:.2f}s)")
        
        for test in result.tests:
            test_icon = "✓" if test.status.value == "passed" else "✗"
            print(f"   {test_icon} {test.name} ({test.duration:.2f}s)")
            if test.error:
                print(f"      Error: {test.error[:100]}...")
    
    def on_complete(self, results, total_duration):
        print("\n" + "=" * 60)
        print("📊 SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in results if r.status.value == "passed")
        failed = sum(1 for r in results if r.status.value == "failed")
        
        print(f"\nTotal Duration: {total_duration:.2f}s")
        print(f"Phases Passed: {passed}/{len(results)}")
        print(f"Phases Failed: {failed}/{len(results)}")
        
        if failed > 0:
            print("\n❌ FAILED PHASES:")
            for r in results:
                if r.status.value == "failed":
                    print(f"  • {r.name}")
        
        print("\n" + "=" * 60)
        
        if failed > 0:
            print("🔴 E2E TESTS FAILED")
        else:
            print("🟢 E2E TESTS PASSED")
        
        print("=" * 60 + "\n")
```

### `e2e-orchestrator/reporters/json_reporter.py`
```python
"""
JSON Reporter

Outputs test results to JSON file for CI/CD integration.
"""

import json
import os
from datetime import datetime
from typing import List


class JSONReporter:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        self.data = {
            "timestamp": datetime.now().isoformat(),
            "phases": [],
        }
    
    def on_start(self, phases):
        self.data["total_phases"] = len(phases)
    
    def on_phase_complete(self, result):
        self.data["phases"].append({
            "name": result.name,
            "status": result.status.value,
            "duration": result.duration,
            "required": result.required,
            "tests": [
                {
                    "name": t.name,
                    "status": t.status.value,
                    "duration": t.duration,
                    "error": t.error,
                }
                for t in result.tests
            ],
        })
    
    def on_complete(self, results, total_duration):
        self.data["total_duration"] = total_duration
        self.data["passed"] = sum(1 for r in results if r.status.value == "passed")
        self.data["failed"] = sum(1 for r in results if r.status.value == "failed")
        self.data["success"] = self.data["failed"] == 0
        
        os.makedirs(self.output_dir, exist_ok=True)
        output_path = os.path.join(self.output_dir, "e2e-results.json")
        
        with open(output_path, "w") as f:
            json.dump(self.data, f, indent=2)
```

## Docker Integration

### `docker-compose.test.yml`
```yaml
# E2E Test Environment

services:
  api:
    extends:
      file: docker-compose.yml
      service: api
    environment:
      - APP_ENV=test
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

networks:
  default:
    name: streamer-studio-test

volumes:
  redis_data:
```

### `e2e-orchestrator/Dockerfile`
```dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright browsers
RUN npx playwright install --with-deps chromium

WORKDIR /app

# Copy orchestrator
COPY e2e-orchestrator/ ./e2e-orchestrator/
COPY backend/tests/e2e/ ./backend/tests/e2e/
COPY tsx/e2e/ ./tsx/e2e/

# Install Python dependencies
COPY e2e-orchestrator/requirements.txt ./
RUN pip install -r requirements.txt

# Install Node dependencies for Playwright
COPY tsx/package.json tsx/package-lock.json ./tsx/
RUN cd tsx && npm ci

WORKDIR /app/e2e-orchestrator

ENTRYPOINT ["python", "orchestrator.py"]
```

## Timeout
- Orchestrator total: 10 minutes max
- Individual phase: As configured in PHASES

## Exit Codes
- 0: All required phases passed
- 1: One or more required phases failed
