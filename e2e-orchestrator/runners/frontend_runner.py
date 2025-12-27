"""
Frontend Test Runner

Executes Playwright-based frontend tests with async support and result parsing.
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
        screenshots: Paths to failure screenshots
        trace_path: Path to Playwright trace file
    """
    test_name: str
    status: TestStatus
    duration: float
    error_message: str | None = None
    stdout: str = ""
    stderr: str = ""
    timestamp: datetime = field(default_factory=datetime.utcnow)
    screenshots: list[str] = field(default_factory=list)
    trace_path: str | None = None
    
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
            "screenshots": self.screenshots,
            "trace_path": self.trace_path,
        }


# Test mapping: logical test names to Playwright test paths
FRONTEND_TEST_MAPPING: dict[str, str] = {
    # Frontend smoke tests
    "smoke_landing": "tsx/apps/web/e2e/smoke/landing.spec.ts",
    "smoke_auth_pages": "tsx/apps/web/e2e/smoke/auth-pages.spec.ts",
    "smoke_dashboard": "tsx/apps/web/e2e/smoke/dashboard.spec.ts",
    
    # Frontend flow tests
    "flow_signup": "tsx/apps/web/e2e/flows/signup-flow.spec.ts",
    "flow_brand_kit_creation": "tsx/apps/web/e2e/flows/brand-kit-creation.spec.ts",
    "flow_asset_generation": "tsx/apps/web/e2e/flows/asset-generation.spec.ts",
    "flow_coach_interaction": "tsx/apps/web/e2e/flows/coach-interaction.spec.ts",
}


class FrontendRunner:
    """
    Executes Playwright-based frontend tests asynchronously.
    
    Provides test execution, result parsing, screenshot capture,
    and trace recording for frontend E2E tests.
    
    Attributes:
        base_path: Root path for test discovery
        timeout: Default timeout for test execution
        retry_count: Number of retries for failed tests
        verbose: Enable verbose output
        headed: Run browser in headed mode
        trace: Enable trace recording
    
    Example:
        >>> runner = FrontendRunner(timeout=180, retry_count=2)
        >>> result = await runner.run_test("smoke_landing")
        >>> print(result.status)
        TestStatus.PASSED
    """
    
    def __init__(
        self,
        base_path: str = ".",
        timeout: int = 60,
        retry_count: int = 2,
        verbose: bool = False,
        headed: bool = False,
        trace: bool = True,
    ) -> None:
        """
        Initialize the frontend runner.
        
        Args:
            base_path: Root path for test discovery
            timeout: Default timeout in seconds
            retry_count: Number of retries for failed tests
            verbose: Enable verbose output
            headed: Run browser in headed mode
            trace: Enable trace recording on failure
        """
        self.base_path = Path(base_path)
        self.timeout = timeout
        self.retry_count = retry_count
        self.verbose = verbose
        self.headed = headed
        self.trace = trace
        self._test_mapping = FRONTEND_TEST_MAPPING.copy()
    
    def get_test_path(self, test_name: str) -> str | None:
        """
        Get the Playwright test path for a logical test name.
        
        Args:
            test_name: Logical test name
            
        Returns:
            Playwright test path or None if not found
        """
        return self._test_mapping.get(test_name)
    
    def register_test(self, name: str, path: str) -> None:
        """
        Register a new test mapping.
        
        Args:
            name: Logical test name
            path: Playwright test path
        """
        self._test_mapping[name] = path
    
    async def run_test(
        self,
        test_name: str,
        timeout: int | None = None,
        env: dict[str, str] | None = None,
        browser: str = "chromium",
    ) -> TestResult:
        """
        Execute a single test by name.
        
        Args:
            test_name: Logical test name from mapping
            timeout: Override default timeout
            env: Additional environment variables
            browser: Browser to use (chromium, firefox, webkit)
            
        Returns:
            TestResult with execution details
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
        
        # Execute with retries
        for attempt in range(self.retry_count + 1):
            result = await self._execute_playwright(
                test_path=test_path,
                test_name=test_name,
                timeout=effective_timeout,
                env=env,
                browser=browser,
            )
            
            if result.status == TestStatus.PASSED:
                return result
            
            if attempt < self.retry_count and result.status in (
                TestStatus.FAILED,
                TestStatus.TIMEOUT,
            ):
                # Retry on failure or timeout
                await asyncio.sleep(2)  # Brief pause before retry
                continue
            
            return result
        
        return result
    
    async def run_tests(
        self,
        test_names: list[str],
        parallel: bool = True,
        max_workers: int = 4,
        browser: str = "chromium",
    ) -> list[TestResult]:
        """
        Execute multiple tests.
        
        Args:
            test_names: List of logical test names
            parallel: Run tests in parallel
            max_workers: Maximum concurrent tests
            browser: Browser to use
            
        Returns:
            List of TestResult objects
        """
        if parallel:
            semaphore = asyncio.Semaphore(max_workers)
            
            async def run_with_semaphore(name: str) -> TestResult:
                async with semaphore:
                    return await self.run_test(name, browser=browser)
            
            tasks = [run_with_semaphore(name) for name in test_names]
            return await asyncio.gather(*tasks)
        else:
            results = []
            for name in test_names:
                result = await self.run_test(name, browser=browser)
                results.append(result)
            return results
    
    def _build_playwright_command(
        self,
        test_path: str,
        browser: str,
    ) -> list[str]:
        """Build the Playwright command with appropriate flags."""
        cmd = [
            "npx", "playwright", "test",
            test_path,
            f"--project={browser}",
            "--reporter=json",
        ]
        
        if self.headed:
            cmd.append("--headed")
        
        if self.trace:
            cmd.append("--trace=on-first-retry")
        
        if self.verbose:
            cmd.append("--debug")
        
        return cmd
    
    async def _execute_playwright(
        self,
        test_path: str,
        test_name: str,
        timeout: int,
        env: dict[str, str] | None = None,
        browser: str = "chromium",
    ) -> TestResult:
        """
        Execute Playwright subprocess and parse results.
        
        Args:
            test_path: Path to test file
            test_name: Name for result tracking
            timeout: Execution timeout
            env: Environment variables
            browser: Browser to use
            
        Returns:
            Parsed TestResult
        """
        import os
        
        start_time = datetime.utcnow()
        process_env = os.environ.copy()
        if env:
            process_env.update(env)
        
        cmd = self._build_playwright_command(test_path, browser)
        
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
            
            return self._parse_playwright_output(
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
    
    def _parse_playwright_output(
        self,
        test_name: str,
        returncode: int,
        stdout: str,
        stderr: str,
        duration: float,
    ) -> TestResult:
        """
        Parse Playwright output to extract test results.
        
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
        else:
            status = TestStatus.FAILED
            error_message = self._extract_error_message(stdout, stderr)
        
        screenshots = self._extract_screenshot_paths(stdout)
        trace_path = self._extract_trace_path(stdout)
        
        return TestResult(
            test_name=test_name,
            status=status,
            duration=duration,
            error_message=error_message,
            stdout=stdout,
            stderr=stderr,
            screenshots=screenshots,
            trace_path=trace_path,
        )
    
    def _extract_json_report(self, stdout: str) -> dict[str, Any] | None:
        """Extract JSON report from Playwright output."""
        try:
            # Playwright JSON reporter outputs valid JSON
            lines = stdout.strip().split('\n')
            for line in lines:
                if line.startswith('{') and '"suites"' in line:
                    return json.loads(line)
            
            # Try parsing entire output as JSON
            return json.loads(stdout)
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
        """Parse Playwright JSON report format."""
        stats = report.get("stats", {})
        
        expected = stats.get("expected", 0)
        unexpected = stats.get("unexpected", 0)
        skipped = stats.get("skipped", 0)
        
        if unexpected > 0:
            status = TestStatus.FAILED
            error_message = self._extract_failure_from_report(report)
        elif expected > 0:
            status = TestStatus.PASSED
            error_message = None
        else:
            status = TestStatus.SKIPPED
            error_message = "No tests executed"
        
        screenshots = self._extract_screenshot_paths(stdout)
        trace_path = self._extract_trace_path(stdout)
        
        return TestResult(
            test_name=test_name,
            status=status,
            duration=duration,
            error_message=error_message,
            stdout=stdout,
            stderr=stderr,
            screenshots=screenshots,
            trace_path=trace_path,
        )
    
    def _extract_failure_from_report(self, report: dict[str, Any]) -> str:
        """Extract failure message from Playwright JSON report."""
        suites = report.get("suites", [])
        
        for suite in suites:
            specs = suite.get("specs", [])
            for spec in specs:
                tests = spec.get("tests", [])
                for test in tests:
                    results = test.get("results", [])
                    for result in results:
                        if result.get("status") == "failed":
                            error = result.get("error", {})
                            message = error.get("message", "")
                            if message:
                                return message[:500]
        
        return "Test failed (no details available)"
    
    def _extract_error_message(self, stdout: str, stderr: str) -> str:
        """Extract meaningful error message from output."""
        # Look for Error: lines
        error_match = re.search(r'Error:.*', stdout)
        if error_match:
            return error_match.group()[:500]
        
        # Look for expect() failures
        expect_match = re.search(r'expect\(.*\)\..*', stdout)
        if expect_match:
            return expect_match.group()[:500]
        
        # Look for timeout messages
        timeout_match = re.search(r'Timeout.*exceeded', stdout, re.IGNORECASE)
        if timeout_match:
            return timeout_match.group()
        
        # Fallback to stderr
        if stderr.strip():
            return stderr.strip()[:500]
        
        return "Test failed (no details available)"
    
    def _extract_screenshot_paths(self, stdout: str) -> list[str]:
        """Extract screenshot file paths from output."""
        screenshots = []
        
        # Look for screenshot paths in output
        screenshot_pattern = r'screenshot[s]?[:\s]+([^\s]+\.png)'
        matches = re.findall(screenshot_pattern, stdout, re.IGNORECASE)
        screenshots.extend(matches)
        
        # Look for attachment paths
        attachment_pattern = r'attachment[s]?[:\s]+([^\s]+\.png)'
        matches = re.findall(attachment_pattern, stdout, re.IGNORECASE)
        screenshots.extend(matches)
        
        return list(set(screenshots))
    
    def _extract_trace_path(self, stdout: str) -> str | None:
        """Extract trace file path from output."""
        trace_pattern = r'trace[:\s]+([^\s]+\.zip)'
        match = re.search(trace_pattern, stdout, re.IGNORECASE)
        if match:
            return match.group(1)
        return None
