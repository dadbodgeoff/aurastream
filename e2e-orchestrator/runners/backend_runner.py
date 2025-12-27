"""
Backend Test Runner

Executes pytest-based backend tests with async support and result parsing.
"""

import asyncio
import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any


class TestStatus(str, Enum):
    """Test execution status."""
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    ERROR = "error"
    TIMEOUT = "timeout"


@dataclass(slots=True)
class TestResult:
    """
    Result of a single test execution.
    
    Attributes:
        test_name: Name of the test
        status: Execution status
        duration: Execution time in seconds
        error_message: Error details if failed
        stdout: Captured standard output
        stderr: Captured standard error
        timestamp: When the test was executed
    """
    test_name: str
    status: TestStatus
    duration: float
    error_message: str | None = None
    stdout: str = ""
    stderr: str = ""
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> dict[str, Any]:
        """Convert result to dictionary for JSON serialization."""
        return {
            "test_name": self.test_name,
            "status": self.status.value,
            "duration": self.duration,
            "error_message": self.error_message,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "timestamp": self.timestamp.isoformat(),
        }


# Test mapping: logical test names to pytest paths
BACKEND_TEST_MAPPING: dict[str, str] = {
    # Health checks
    "health_api": "backend/tests/e2e/health/test_api_health.py",
    "health_database": "backend/tests/e2e/health/test_database_health.py",
    "health_redis": "backend/tests/e2e/health/test_redis_health.py",
    "health_storage": "backend/tests/e2e/health/test_storage_health.py",
    
    # Backend smoke tests
    "smoke_auth": "backend/tests/e2e/smoke/test_auth_smoke.py",
    "smoke_users": "backend/tests/e2e/smoke/test_users_smoke.py",
    "smoke_brand_kits": "backend/tests/e2e/smoke/test_brand_kits_smoke.py",
    "smoke_generation": "backend/tests/e2e/smoke/test_generation_smoke.py",
    "smoke_assets": "backend/tests/e2e/smoke/test_assets_smoke.py",
    "smoke_coach": "backend/tests/e2e/smoke/test_coach_smoke.py",
    "smoke_twitch": "backend/tests/e2e/smoke/test_twitch_smoke.py",
    
    # Backend flow tests
    "flow_user_onboarding": "backend/tests/e2e/flows/test_auth_flow.py",
    "flow_brand_creation": "backend/tests/e2e/flows/test_brand_kit_flow.py",
    "flow_asset_generation": "backend/tests/e2e/flows/test_generation_flow.py",
    "flow_coach_conversation": "backend/tests/e2e/flows/test_coach_flow.py",
    "flow_twitch_pack": "backend/tests/e2e/flows/test_twitch_flow.py",
    
    # Database integrity tests
    "db_migrations": "backend/tests/e2e/database/test_schema_integrity.py",
    "db_constraints": "backend/tests/e2e/database/test_rls_policies.py",
    "db_indexes": "backend/tests/e2e/database/test_rpc_functions.py",
}


class BackendRunner:
    """
    Executes pytest-based backend tests asynchronously.
    
    Provides test execution, result parsing, and retry logic for
    backend integration and E2E tests.
    
    Attributes:
        base_path: Root path for test discovery
        timeout: Default timeout for test execution
        retry_count: Number of retries for failed tests
        verbose: Enable verbose output
    
    Example:
        >>> runner = BackendRunner(timeout=120, retry_count=2)
        >>> result = await runner.run_test("health_api")
        >>> print(result.status)
        TestStatus.PASSED
    """
    
    def __init__(
        self,
        base_path: str = ".",
        timeout: int = 60,
        retry_count: int = 2,
        verbose: bool = False,
    ) -> None:
        """
        Initialize the backend runner.
        
        Args:
            base_path: Root path for test discovery
            timeout: Default timeout in seconds
            retry_count: Number of retries for failed tests
            verbose: Enable verbose output
        """
        self.base_path = Path(base_path)
        self.timeout = timeout
        self.retry_count = retry_count
        self.verbose = verbose
        self._test_mapping = BACKEND_TEST_MAPPING.copy()
    
    def get_test_path(self, test_name: str) -> str | None:
        """
        Get the pytest path for a logical test name.
        
        Args:
            test_name: Logical test name
            
        Returns:
            Pytest path or None if not found
        """
        return self._test_mapping.get(test_name)
    
    def register_test(self, name: str, path: str) -> None:
        """
        Register a new test mapping.
        
        Args:
            name: Logical test name
            path: Pytest path
        """
        self._test_mapping[name] = path
    
    async def run_test(
        self,
        test_name: str,
        timeout: int | None = None,
        env: dict[str, str] | None = None,
    ) -> TestResult:
        """
        Execute a single test by name.
        
        Args:
            test_name: Logical test name from mapping
            timeout: Override default timeout
            env: Additional environment variables
            
        Returns:
            TestResult with execution details
            
        Raises:
            ValueError: If test_name is not in mapping
        """
        test_path = self.get_test_path(test_name)
        if not test_path:
            return TestResult(
                test_name=test_name,
                status=TestStatus.ERROR,
                duration=0.0,
                error_message=f"Unknown test: {test_name}",
            )
        
        effective_timeout = timeout or self.timeout
        start_time = datetime.utcnow()
        
        # Build pytest command
        cmd = self._build_pytest_command(test_path)
        
        # Execute with retries
        for attempt in range(self.retry_count + 1):
            result = await self._execute_pytest(
                cmd=cmd,
                test_name=test_name,
                timeout=effective_timeout,
                env=env,
            )
            
            if result.status == TestStatus.PASSED:
                return result
            
            if attempt < self.retry_count and result.status in (
                TestStatus.FAILED,
                TestStatus.TIMEOUT,
            ):
                # Retry on failure or timeout
                await asyncio.sleep(1)  # Brief pause before retry
                continue
            
            return result
        
        return result
    
    async def run_tests(
        self,
        test_names: list[str],
        parallel: bool = True,
        max_workers: int = 4,
    ) -> list[TestResult]:
        """
        Execute multiple tests.
        
        Args:
            test_names: List of logical test names
            parallel: Run tests in parallel
            max_workers: Maximum concurrent tests
            
        Returns:
            List of TestResult objects
        """
        if parallel:
            semaphore = asyncio.Semaphore(max_workers)
            
            async def run_with_semaphore(name: str) -> TestResult:
                async with semaphore:
                    return await self.run_test(name)
            
            tasks = [run_with_semaphore(name) for name in test_names]
            return await asyncio.gather(*tasks)
        else:
            results = []
            for name in test_names:
                result = await self.run_test(name)
                results.append(result)
            return results
    
    def _build_pytest_command(self, test_path: str) -> list[str]:
        """Build the pytest command with appropriate flags."""
        import shutil
        
        # Use python3 if available, otherwise python
        python_cmd = "python3" if shutil.which("python3") else "python"
        
        cmd = [
            python_cmd, "-m", "pytest",
            test_path,
            "--tb=short",
            "-q",
        ]
        
        if self.verbose:
            cmd.append("-v")
        
        return cmd
    
    async def _execute_pytest(
        self,
        cmd: list[str],
        test_name: str,
        timeout: int,
        env: dict[str, str] | None = None,
    ) -> TestResult:
        """
        Execute pytest subprocess and parse results.
        
        Args:
            cmd: Command to execute
            test_name: Name for result tracking
            timeout: Execution timeout
            env: Environment variables
            
        Returns:
            Parsed TestResult
        """
        import os
        
        start_time = datetime.utcnow()
        process_env = os.environ.copy()
        
        # Set required environment for backend tests
        process_env.setdefault("APP_ENV", "development")
        process_env.setdefault("PYTHONPATH", "backend")
        process_env.setdefault("E2E_USE_REAL_REDIS", "true")
        process_env.setdefault("REDIS_URL", "redis://localhost:6379")
        
        if env:
            process_env.update(env)
        
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=process_env,
                cwd=str(self.base_path),
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout,
            )
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            return self._parse_pytest_output(
                test_name=test_name,
                returncode=process.returncode or 0,
                stdout=stdout.decode("utf-8", errors="replace"),
                stderr=stderr.decode("utf-8", errors="replace"),
                duration=duration,
            )
            
        except asyncio.TimeoutError:
            duration = (datetime.utcnow() - start_time).total_seconds()
            return TestResult(
                test_name=test_name,
                status=TestStatus.TIMEOUT,
                duration=duration,
                error_message=f"Test timed out after {timeout}s",
            )
        except Exception as e:
            duration = (datetime.utcnow() - start_time).total_seconds()
            return TestResult(
                test_name=test_name,
                status=TestStatus.ERROR,
                duration=duration,
                error_message=str(e),
            )
    
    def _parse_pytest_output(
        self,
        test_name: str,
        returncode: int,
        stdout: str,
        stderr: str,
        duration: float,
    ) -> TestResult:
        """
        Parse pytest output to extract test results.
        
        Args:
            test_name: Test identifier
            returncode: Process exit code
            stdout: Standard output
            stderr: Standard error
            duration: Execution duration
            
        Returns:
            Parsed TestResult
        """
        # Try to parse JSON report if available
        json_result = self._extract_json_report(stdout)
        
        if json_result:
            return self._parse_json_report(
                test_name=test_name,
                report=json_result,
                stdout=stdout,
                stderr=stderr,
                duration=duration,
            )
        
        # Fallback to return code parsing
        if returncode == 0:
            status = TestStatus.PASSED
            error_message = None
        elif returncode == 5:
            # No tests collected
            status = TestStatus.SKIPPED
            error_message = "No tests collected"
        else:
            status = TestStatus.FAILED
            error_message = self._extract_error_message(stdout, stderr)
        
        return TestResult(
            test_name=test_name,
            status=status,
            duration=duration,
            error_message=error_message,
            stdout=stdout,
            stderr=stderr,
        )
    
    def _extract_json_report(self, stdout: str) -> dict[str, Any] | None:
        """Extract JSON report from pytest output."""
        try:
            # Look for JSON in output
            json_match = re.search(r'\{.*"summary".*\}', stdout, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except (json.JSONDecodeError, AttributeError):
            pass
        return None
    
    def _parse_json_report(
        self,
        test_name: str,
        report: dict[str, Any],
        stdout: str,
        stderr: str,
        duration: float,
    ) -> TestResult:
        """Parse pytest JSON report format."""
        summary = report.get("summary", {})
        
        if summary.get("passed", 0) > 0 and summary.get("failed", 0) == 0:
            status = TestStatus.PASSED
            error_message = None
        elif summary.get("failed", 0) > 0:
            status = TestStatus.FAILED
            # Extract first failure message
            tests = report.get("tests", [])
            failed_tests = [t for t in tests if t.get("outcome") == "failed"]
            if failed_tests:
                error_message = failed_tests[0].get("call", {}).get("longrepr", "Test failed")
            else:
                error_message = "Test failed"
        else:
            status = TestStatus.SKIPPED
            error_message = "No tests executed"
        
        return TestResult(
            test_name=test_name,
            status=status,
            duration=duration,
            error_message=error_message,
            stdout=stdout,
            stderr=stderr,
        )
    
    def _extract_error_message(self, stdout: str, stderr: str) -> str:
        """Extract meaningful error message from output."""
        # Look for assertion errors
        assertion_match = re.search(r'AssertionError:.*', stdout)
        if assertion_match:
            return assertion_match.group()
        
        # Look for FAILED lines
        failed_match = re.search(r'FAILED.*', stdout)
        if failed_match:
            return failed_match.group()
        
        # Look for ERROR lines
        error_match = re.search(r'ERROR.*', stdout)
        if error_match:
            return error_match.group()
        
        # Fallback to stderr
        if stderr.strip():
            return stderr.strip()[:500]
        
        return "Test failed (no details available)"
