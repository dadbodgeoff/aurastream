"""
Console Reporter

Provides colored terminal output with emojis for test execution results.
"""

import sys
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, TextIO


class Color(str, Enum):
    """ANSI color codes for terminal output."""
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"
    
    BG_RED = "\033[41m"
    BG_GREEN = "\033[42m"
    BG_YELLOW = "\033[43m"
    BG_BLUE = "\033[44m"


class Emoji:
    """Unicode emojis for test status indicators."""
    ROCKET = "🚀"
    CHECK = "✅"
    CROSS = "❌"
    WARNING = "⚠️"
    SKIP = "⏭️"
    CLOCK = "⏱️"
    HOURGLASS = "⏳"
    SPARKLES = "✨"
    FIRE = "🔥"
    BUG = "🐛"
    GEAR = "⚙️"
    CHART = "📊"
    FOLDER = "📁"
    MAGNIFIER = "🔍"
    TROPHY = "🏆"
    THUMBS_UP = "👍"
    THUMBS_DOWN = "👎"


@dataclass
class PhaseResult:
    """
    Result summary for a test phase.
    
    Attributes:
        name: Phase name
        passed: Number of passed tests
        failed: Number of failed tests
        skipped: Number of skipped tests
        duration: Total phase duration in seconds
        required: Whether phase was required
    """
    name: str
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    duration: float = 0.0
    required: bool = True
    
    @property
    def total(self) -> int:
        """Total number of tests."""
        return self.passed + self.failed + self.skipped
    
    @property
    def success(self) -> bool:
        """Whether phase passed (no failures)."""
        return self.failed == 0


@dataclass
class ConsoleReporter:
    """
    Reports test execution results to the console with colors and emojis.
    
    Provides real-time feedback during test execution with formatted
    output including phase progress, test results, and summary statistics.
    
    Attributes:
        output: Output stream (defaults to stdout)
        use_colors: Enable ANSI color codes
        use_emojis: Enable emoji indicators
        verbose: Show detailed test output
        show_timestamps: Include timestamps in output
    
    Example:
        >>> reporter = ConsoleReporter()
        >>> reporter.on_start(phases=["health", "smoke"])
        >>> reporter.on_test_complete("health_api", "passed", 1.5)
        >>> reporter.on_phase_complete(PhaseResult(name="health", passed=4))
        >>> reporter.on_complete(total_passed=4, total_failed=0)
    """
    output: TextIO = field(default_factory=lambda: sys.stdout)
    use_colors: bool = True
    use_emojis: bool = True
    verbose: bool = False
    show_timestamps: bool = True
    
    _start_time: datetime = field(default_factory=datetime.utcnow, init=False)
    _phase_results: list[PhaseResult] = field(default_factory=list, init=False)
    
    def _colorize(self, text: str, color: Color) -> str:
        """Apply color to text if colors are enabled."""
        if self.use_colors:
            return f"{color.value}{text}{Color.RESET.value}"
        return text
    
    def _emoji(self, emoji: str) -> str:
        """Return emoji if emojis are enabled."""
        return emoji if self.use_emojis else ""
    
    def _timestamp(self) -> str:
        """Return formatted timestamp if enabled."""
        if self.show_timestamps:
            return f"[{datetime.utcnow().strftime('%H:%M:%S')}] "
        return ""
    
    def _write(self, message: str) -> None:
        """Write message to output stream."""
        self.output.write(message + "\n")
        self.output.flush()
    
    def _write_separator(self, char: str = "─", width: int = 60) -> None:
        """Write a separator line."""
        self._write(self._colorize(char * width, Color.DIM))
    
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
        self._phase_results = []
        
        self._write("")
        self._write_separator("═")
        self._write(
            f"{self._emoji(Emoji.ROCKET)} "
            f"{self._colorize('E2E Test Orchestration', Color.BOLD)} "
            f"{self._emoji(Emoji.ROCKET)}"
        )
        self._write_separator("═")
        self._write("")
        
        self._write(f"{self._emoji(Emoji.GEAR)} {self._colorize('Configuration:', Color.CYAN)}")
        # Handle both Phase objects and strings
        phase_names = [p.name if hasattr(p, 'name') else str(p) for p in phases]
        self._write(f"  • Phases: {', '.join(phase_names)}")
        self._write(f"  • Started: {self._start_time.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        
        if config:
            for key, value in config.items():
                self._write(f"  • {key}: {value}")
        
        self._write("")
    
    def on_phase_start(self, phase_name: str, test_count: int) -> None:
        """
        Called when a phase begins execution.
        
        Args:
            phase_name: Name of the phase
            test_count: Number of tests in the phase
        """
        self._write_separator()
        self._write(
            f"{self._timestamp()}"
            f"{self._emoji(Emoji.FOLDER)} "
            f"{self._colorize(f'Phase: {phase_name}', Color.BOLD)} "
            f"({test_count} tests)"
        )
        self._write_separator()
    
    def on_test_start(self, test_name: str) -> None:
        """
        Called when a test begins execution.
        
        Args:
            test_name: Name of the test
        """
        if self.verbose:
            self._write(
                f"{self._timestamp()}"
                f"{self._emoji(Emoji.HOURGLASS)} "
                f"Running: {test_name}..."
            )
    
    def on_test_complete(
        self,
        test_name: str,
        status: str,
        duration: float,
        error_message: str | None = None,
    ) -> None:
        """
        Called when a test completes execution.
        
        Args:
            test_name: Name of the test
            status: Test status (passed, failed, skipped, error, timeout)
            duration: Execution duration in seconds
            error_message: Error details if failed
        """
        status_lower = status.lower()
        
        if status_lower == "passed":
            emoji = self._emoji(Emoji.CHECK)
            color = Color.GREEN
            status_text = "PASSED"
        elif status_lower == "failed":
            emoji = self._emoji(Emoji.CROSS)
            color = Color.RED
            status_text = "FAILED"
        elif status_lower == "skipped":
            emoji = self._emoji(Emoji.SKIP)
            color = Color.YELLOW
            status_text = "SKIPPED"
        elif status_lower == "timeout":
            emoji = self._emoji(Emoji.CLOCK)
            color = Color.YELLOW
            status_text = "TIMEOUT"
        else:
            emoji = self._emoji(Emoji.BUG)
            color = Color.RED
            status_text = "ERROR"
        
        duration_str = f"{duration:.2f}s"
        
        self._write(
            f"{self._timestamp()}"
            f"{emoji} "
            f"{self._colorize(status_text, color)} "
            f"{test_name} "
            f"{self._colorize(f'({duration_str})', Color.DIM)}"
        )
        
        if error_message and (self.verbose or status_lower in ("failed", "error")):
            # Indent error message
            for line in error_message.split('\n')[:5]:  # Limit to 5 lines
                self._write(f"    {self._colorize(line, Color.RED)}")
    
    def on_phase_complete(self, result: PhaseResult) -> None:
        """
        Called when a phase completes execution.
        
        Args:
            result: Phase execution result
        """
        self._phase_results.append(result)
        
        if result.success:
            status_emoji = self._emoji(Emoji.CHECK)
            status_color = Color.GREEN
            status_text = "PASSED"
        else:
            status_emoji = self._emoji(Emoji.CROSS)
            status_color = Color.RED
            status_text = "FAILED"
        
        self._write("")
        self._write(
            f"{status_emoji} "
            f"Phase {self._colorize(result.name, Color.BOLD)}: "
            f"{self._colorize(status_text, status_color)} "
            f"({result.passed}/{result.total} passed, {result.duration:.2f}s)"
        )
        
        if not result.success and result.required:
            self._write(
                f"  {self._emoji(Emoji.WARNING)} "
                f"{self._colorize('Required phase failed!', Color.RED)}"
            )
        
        self._write("")
    
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
        end_time = datetime.utcnow()
        total_duration = (end_time - self._start_time).total_seconds()
        total_tests = total_passed + total_failed + total_skipped
        
        self._write_separator("═")
        self._write(
            f"{self._emoji(Emoji.CHART)} "
            f"{self._colorize('Test Execution Summary', Color.BOLD)}"
        )
        self._write_separator("═")
        self._write("")
        
        # Phase summary table
        self._write(f"{self._colorize('Phase Results:', Color.CYAN)}")
        self._write("")
        
        header = f"  {'Phase':<25} {'Status':<10} {'Passed':<10} {'Failed':<10} {'Duration':<10}"
        self._write(self._colorize(header, Color.DIM))
        self._write(self._colorize("  " + "-" * 65, Color.DIM))
        
        for phase in self._phase_results:
            status = "✓ PASS" if phase.success else "✗ FAIL"
            status_color = Color.GREEN if phase.success else Color.RED
            
            row = (
                f"  {phase.name:<25} "
                f"{self._colorize(status, status_color):<19} "
                f"{phase.passed:<10} "
                f"{phase.failed:<10} "
                f"{phase.duration:.2f}s"
            )
            self._write(row)
        
        self._write("")
        self._write_separator()
        
        # Overall summary
        success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
        
        if total_failed == 0:
            overall_emoji = self._emoji(Emoji.TROPHY)
            overall_color = Color.GREEN
            overall_text = "ALL TESTS PASSED"
        else:
            overall_emoji = self._emoji(Emoji.THUMBS_DOWN)
            overall_color = Color.RED
            overall_text = "TESTS FAILED"
        
        self._write("")
        self._write(
            f"{overall_emoji} "
            f"{self._colorize(overall_text, overall_color)}"
        )
        self._write("")
        self._write(f"  Total Tests:  {total_tests}")
        self._write(f"  Passed:       {self._colorize(str(total_passed), Color.GREEN)}")
        self._write(f"  Failed:       {self._colorize(str(total_failed), Color.RED)}")
        self._write(f"  Skipped:      {self._colorize(str(total_skipped), Color.YELLOW)}")
        self._write(f"  Success Rate: {success_rate:.1f}%")
        self._write(f"  Duration:     {total_duration:.2f}s")
        self._write("")
        self._write_separator("═")
        self._write("")
    
    def on_error(self, message: str, exception: Exception | None = None) -> None:
        """
        Called when an error occurs during execution.
        
        Args:
            message: Error message
            exception: Optional exception object
        """
        self._write("")
        self._write(
            f"{self._emoji(Emoji.FIRE)} "
            f"{self._colorize('ERROR:', Color.BG_RED)} "
            f"{message}"
        )
        
        if exception and self.verbose:
            self._write(f"  {self._colorize(str(exception), Color.RED)}")
        
        self._write("")
