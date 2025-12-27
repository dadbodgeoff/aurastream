"""
E2E Test Orchestrator.

Central orchestration system for running all E2E tests in phases
with parallel execution, retry logic, and unified reporting.

Usage:
    python orchestrator.py --phase all --report json,console
    python orchestrator.py --phase health,backend_smoke --verbose
    python orchestrator.py --phase frontend_smoke --fail-fast
"""

import argparse
import asyncio
import sys
from datetime import datetime
from typing import Optional

from config import PHASES, Config, Phase, get_phase_by_name
from reporters import ConsoleReporter, JSONReporter
from runners import BackendRunner, FrontendRunner
from runners.backend_runner import TestResult, TestStatus


class PhaseResult:
    """Result of a test phase execution."""

    __slots__ = ("phase", "tests", "status", "duration", "error")

    def __init__(
        self,
        phase: Phase,
        tests: list[TestResult],
        status: TestStatus,
        duration: float,
        error: Optional[str] = None,
    ) -> None:
        self.phase = phase
        self.tests = tests
        self.status = status
        self.duration = duration
        self.error = error

    @property
    def name(self) -> str:
        """Phase name."""
        return self.phase.name

    @property
    def required(self) -> bool:
        """Whether this phase is required."""
        return self.phase.required

    @property
    def success(self) -> bool:
        """Whether the phase passed."""
        return self.status == TestStatus.PASSED

    @property
    def total(self) -> int:
        """Total number of tests."""
        return len(self.tests)

    @property
    def passed(self) -> int:
        """Count of passed tests."""
        return sum(1 for t in self.tests if t.status == TestStatus.PASSED)

    @property
    def failed(self) -> int:
        """Count of failed tests."""
        return sum(1 for t in self.tests if t.status == TestStatus.FAILED)

    @property
    def skipped(self) -> int:
        """Count of skipped tests."""
        return sum(1 for t in self.tests if t.status == TestStatus.SKIPPED)


class Orchestrator:
    """
    E2E Test Orchestrator.

    Manages test execution phases, parallel execution, and reporting.
    """

    def __init__(self, config: Config) -> None:
        self.config = config
        self.backend_runner = BackendRunner(
            base_path=".",
            timeout=120,
            retry_count=config.retry_count,
            verbose=config.verbose,
        )
        self.frontend_runner = FrontendRunner(
            base_path=".",
            timeout=180,
            retry_count=config.retry_count,
            verbose=config.verbose,
        )
        self.reporters: list = []
        self.results: list[PhaseResult] = []

    def add_reporter(self, reporter) -> None:
        """Add a reporter for test results."""
        self.reporters.append(reporter)

    async def run(self, phases: Optional[list[str]] = None) -> int:
        """
        Run E2E tests.

        Args:
            phases: List of phase names to run. If None, runs all phases.

        Returns:
            Exit code (0 for success, 1 for failure).
        """
        start_time = datetime.now()

        # Determine which phases to run
        if phases is None or "all" in phases:
            phases_to_run = PHASES
        else:
            phases_to_run = [
                p for name in phases if (p := get_phase_by_name(name)) is not None
            ]

        if not phases_to_run:
            print("No valid phases specified.")
            return 1

        # Notify reporters of start
        for reporter in self.reporters:
            reporter.on_start(phases_to_run)

        # Run each phase
        for phase in phases_to_run:
            result = await self._run_phase(phase)
            self.results.append(result)

            # Notify reporters
            for reporter in self.reporters:
                reporter.on_phase_complete(result)

            # Check if we should stop (fail-fast on required phase failure)
            if (
                self.config.fail_fast
                and phase.required
                and result.status == TestStatus.FAILED
            ):
                break

        # Calculate total duration
        total_duration = (datetime.now() - start_time).total_seconds()

        # Calculate totals for reporters
        total_passed = sum(r.passed for r in self.results)
        total_failed = sum(r.failed for r in self.results)
        total_skipped = sum(r.skipped for r in self.results)

        # Notify reporters of completion
        for reporter in self.reporters:
            reporter.on_complete(total_passed, total_failed, total_skipped)

        # Determine exit code
        required_failures = sum(
            1
            for r in self.results
            if r.phase.required and r.status == TestStatus.FAILED
        )

        return 1 if required_failures > 0 else 0

    async def _run_phase(self, phase: Phase) -> PhaseResult:
        """Run a single test phase."""
        start_time = datetime.now()

        # Notify reporters of phase start
        for reporter in self.reporters:
            if hasattr(reporter, "on_phase_start"):
                reporter.on_phase_start(phase.name, len(phase.tests))

        # Select runner based on phase type
        runner = (
            self.backend_runner
            if phase.runner.value == "pytest"
            else self.frontend_runner
        )

        try:
            results = await runner.run_tests(list(phase.tests), parallel=phase.parallel)

            # Determine phase status
            if all(r.status == TestStatus.PASSED for r in results):
                status = TestStatus.PASSED
            elif any(r.status == TestStatus.FAILED for r in results):
                status = TestStatus.FAILED
            else:
                status = TestStatus.SKIPPED

            duration = (datetime.now() - start_time).total_seconds()

            return PhaseResult(
                phase=phase,
                tests=results,
                status=status,
                duration=duration,
            )

        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            return PhaseResult(
                phase=phase,
                tests=[],
                status=TestStatus.FAILED,
                duration=duration,
                error=str(e),
            )


async def main() -> int:
    """Main entry point for the orchestrator."""
    parser = argparse.ArgumentParser(
        description="E2E Test Orchestrator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python orchestrator.py --phase all
    python orchestrator.py --phase health,backend_smoke
    python orchestrator.py --phase frontend_smoke --verbose
    python orchestrator.py --phase all --fail-fast --report json,console
        """,
    )

    parser.add_argument(
        "--phase",
        type=str,
        default="all",
        help="Comma-separated list of phases to run (default: all)",
    )

    parser.add_argument(
        "--report",
        type=str,
        default="console,json",
        help="Comma-separated list of reporters (default: console,json)",
    )

    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose output",
    )

    parser.add_argument(
        "--fail-fast",
        action="store_true",
        help="Stop on first required phase failure",
    )

    parser.add_argument(
        "--results-dir",
        type=str,
        default="test-results",
        help="Directory for test results (default: test-results)",
    )

    args = parser.parse_args()

    # Create configuration
    config = Config(
        verbose=args.verbose,
        fail_fast=args.fail_fast,
        results_dir=args.results_dir,
    )

    # Create orchestrator
    orchestrator = Orchestrator(config)

    # Add reporters
    reporters = args.report.split(",")
    if "console" in reporters:
        orchestrator.add_reporter(ConsoleReporter(verbose=config.verbose))
    if "json" in reporters:
        orchestrator.add_reporter(JSONReporter(output_dir=config.results_dir))

    # Parse phases
    phases = args.phase.split(",") if args.phase != "all" else None

    # Run tests
    return await orchestrator.run(phases)


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
