"""
JSON Reporter

Provides machine-readable JSON output for test execution results.
"""

import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any


@dataclass
class TestResultData:
    """
    Individual test result data.
    
    Attributes:
        name: Test name
        status: Execution status
        duration: Duration in seconds
        error_message: Error details if failed
        phase: Phase the test belongs to
        timestamp: Execution timestamp
    """
    name: str
    status: str
    duration: float
    error_message: str | None = None
    phase: str = ""
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "name": self.name,
            "status": self.status,
            "duration": self.duration,
            "error_message": self.error_message,
            "phase": self.phase,
            "timestamp": self.timestamp,
        }


@dataclass
class PhaseResultData:
    """
    Phase result data.
    
    Attributes:
        name: Phase name
        status: Overall phase status
        passed: Number of passed tests
        failed: Number of failed tests
        skipped: Number of skipped tests
        duration: Total duration in seconds
        required: Whether phase was required
        tests: Individual test results
    """
    name: str
    status: str = "pending"
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    duration: float = 0.0
    required: bool = True
    tests: list[TestResultData] = field(default_factory=list)
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "name": self.name,
            "status": self.status,
            "passed": self.passed,
            "failed": self.failed,
            "skipped": self.skipped,
            "duration": self.duration,
            "required": self.required,
            "tests": [t.to_dict() for t in self.tests],
        }


@dataclass
class JSONReporter:
    """
    Reports test execution results as JSON.
    
    Outputs structured JSON data to a file for machine consumption,
    CI/CD integration, and historical tracking.
    
    Attributes:
        output_path: Path to output JSON file
        pretty_print: Format JSON with indentation
        include_stdout: Include test stdout in output
        include_stderr: Include test stderr in output
    
    Example:
        >>> reporter = JSONReporter(output_path="test-results/e2e-results.json")
        >>> reporter.on_start(phases=["health", "smoke"])
        >>> reporter.on_test_complete("health_api", "passed", 1.5)
        >>> reporter.on_phase_complete(PhaseResultData(name="health", passed=4))
        >>> reporter.on_complete(total_passed=4, total_failed=0)
    """
    output_path: str = "test-results/e2e-results.json"
    pretty_print: bool = True
    include_stdout: bool = False
    include_stderr: bool = False
    
    _start_time: datetime = field(default_factory=datetime.utcnow, init=False)
    _config: dict[str, Any] = field(default_factory=dict, init=False)
    _phases: list[str] = field(default_factory=list, init=False)
    _phase_results: dict[str, PhaseResultData] = field(default_factory=dict, init=False)
    _current_phase: str = field(default="", init=False)
    _report: dict[str, Any] = field(default_factory=dict, init=False)
    
    def _ensure_output_dir(self) -> None:
        """Ensure the output directory exists."""
        output_path = Path(self.output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
    
    def _write_report(self) -> None:
        """Write the current report to the output file."""
        self._ensure_output_dir()
        
        indent = 2 if self.pretty_print else None
        
        with open(self.output_path, 'w', encoding='utf-8') as f:
            json.dump(self._report, f, indent=indent, default=str)
    
    def _update_report(self) -> None:
        """Update the internal report structure."""
        end_time = datetime.utcnow()
        duration = (end_time - self._start_time).total_seconds()
        
        # Calculate totals
        total_passed = sum(p.passed for p in self._phase_results.values())
        total_failed = sum(p.failed for p in self._phase_results.values())
        total_skipped = sum(p.skipped for p in self._phase_results.values())
        total_tests = total_passed + total_failed + total_skipped
        
        # Determine overall status
        required_failed = any(
            p.failed > 0 and p.required
            for p in self._phase_results.values()
        )
        
        if required_failed:
            overall_status = "failed"
        elif total_failed > 0:
            overall_status = "passed_with_failures"
        else:
            overall_status = "passed"
        
        self._report = {
            "version": "1.0",
            "generated_at": datetime.utcnow().isoformat(),
            "execution": {
                "start_time": self._start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration": duration,
                "status": overall_status,
            },
            "config": self._config,
            "summary": {
                "total_tests": total_tests,
                "passed": total_passed,
                "failed": total_failed,
                "skipped": total_skipped,
                "success_rate": (total_passed / total_tests * 100) if total_tests > 0 else 0,
                "phases_executed": len(self._phase_results),
                "phases_passed": sum(1 for p in self._phase_results.values() if p.failed == 0),
                "phases_failed": sum(1 for p in self._phase_results.values() if p.failed > 0),
            },
            "phases": [
                self._phase_results[name].to_dict()
                for name in self._phases
                if name in self._phase_results
            ],
        }
    
    def on_start(
        self,
        phases: list[str],
        config: dict[str, Any] | None = None,
    ) -> None:
        """
        Called when test execution begins.
        
        Args:
            phases: List of phase names to execute
            config: Optional configuration details
        """
        self._start_time = datetime.utcnow()
        self._phases = phases
        self._config = config or {}
        self._phase_results = {}
        self._current_phase = ""
        
        # Initialize report
        self._update_report()
        self._write_report()
    
    def on_phase_start(self, phase_name: str, test_count: int) -> None:
        """
        Called when a phase begins execution.
        
        Args:
            phase_name: Name of the phase
            test_count: Number of tests in the phase
        """
        self._current_phase = phase_name
        self._phase_results[phase_name] = PhaseResultData(
            name=phase_name,
            status="running",
        )
        
        self._update_report()
        self._write_report()
    
    def on_test_start(self, test_name: str) -> None:
        """
        Called when a test begins execution.
        
        Args:
            test_name: Name of the test
        """
        # JSON reporter doesn't need to track test starts
        pass
    
    def on_test_complete(
        self,
        test_name: str,
        status: str,
        duration: float,
        error_message: str | None = None,
        stdout: str = "",
        stderr: str = "",
    ) -> None:
        """
        Called when a test completes execution.
        
        Args:
            test_name: Name of the test
            status: Test status (passed, failed, skipped, error, timeout)
            duration: Execution duration in seconds
            error_message: Error details if failed
            stdout: Captured stdout
            stderr: Captured stderr
        """
        if not self._current_phase:
            return
        
        phase_result = self._phase_results.get(self._current_phase)
        if not phase_result:
            return
        
        # Create test result
        test_result = TestResultData(
            name=test_name,
            status=status.lower(),
            duration=duration,
            error_message=error_message,
            phase=self._current_phase,
        )
        
        phase_result.tests.append(test_result)
        
        # Update phase counters
        status_lower = status.lower()
        if status_lower == "passed":
            phase_result.passed += 1
        elif status_lower in ("failed", "error", "timeout"):
            phase_result.failed += 1
        else:
            phase_result.skipped += 1
        
        phase_result.duration += duration
        
        self._update_report()
        self._write_report()
    
    def on_phase_complete(
        self,
        result: PhaseResultData | None = None,
        phase_name: str | None = None,
    ) -> None:
        """
        Called when a phase completes execution.
        
        Args:
            result: Phase execution result (optional, uses current phase if not provided)
            phase_name: Phase name (optional, uses current phase if not provided)
        """
        name = phase_name or self._current_phase
        
        if result:
            self._phase_results[name] = result
        elif name in self._phase_results:
            phase = self._phase_results[name]
            phase.status = "passed" if phase.failed == 0 else "failed"
        
        self._update_report()
        self._write_report()
    
    def on_complete(
        self,
        total_passed: int,
        total_failed: int,
        total_skipped: int = 0,
    ) -> None:
        """
        Called when all test execution completes.
        
        Args:
            total_passed: Total passed tests
            total_failed: Total failed tests
            total_skipped: Total skipped tests
        """
        # Finalize all phase statuses
        for phase in self._phase_results.values():
            if phase.status == "running":
                phase.status = "passed" if phase.failed == 0 else "failed"
        
        self._update_report()
        self._write_report()
    
    def on_error(self, message: str, exception: Exception | None = None) -> None:
        """
        Called when an error occurs during execution.
        
        Args:
            message: Error message
            exception: Optional exception object
        """
        if "errors" not in self._report:
            self._report["errors"] = []
        
        error_entry = {
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        if exception:
            error_entry["exception"] = str(exception)
            error_entry["exception_type"] = type(exception).__name__
        
        self._report["errors"].append(error_entry)
        self._write_report()
    
    def get_report(self) -> dict[str, Any]:
        """
        Get the current report as a dictionary.
        
        Returns:
            Current report data
        """
        self._update_report()
        return self._report.copy()
    
    def get_report_json(self) -> str:
        """
        Get the current report as a JSON string.
        
        Returns:
            JSON-formatted report
        """
        self._update_report()
        indent = 2 if self.pretty_print else None
        return json.dumps(self._report, indent=indent, default=str)
