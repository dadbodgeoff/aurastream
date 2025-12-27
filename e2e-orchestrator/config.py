"""
E2E Test Orchestration Configuration

Defines test phases, configuration settings, and environment variables
for the orchestration system.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Literal
import os


class RunnerType(str, Enum):
    """Supported test runner types."""
    PYTEST = "pytest"
    PLAYWRIGHT = "playwright"


@dataclass(frozen=True, slots=True)
class Phase:
    """
    Represents a test execution phase in the orchestration pipeline.
    
    Attributes:
        name: Unique identifier for the phase
        tests: List of test names to run in this phase
        runner: Test runner to use (pytest or playwright)
        parallel: Whether tests can run in parallel
        timeout: Maximum execution time in seconds
        required: Whether phase failure should halt the pipeline
    
    Example:
        >>> phase = Phase(
        ...     name="health",
        ...     tests=["health_api", "health_database"],
        ...     runner=RunnerType.PYTEST,
        ...     parallel=True,
        ...     timeout=60,
        ...     required=True
        ... )
    """
    name: str
    tests: tuple[str, ...]
    runner: RunnerType
    parallel: bool
    timeout: int
    required: bool
    
    def __post_init__(self) -> None:
        """Validate phase configuration."""
        if len(self.tests) < 1:
            raise ValueError(f"Phase '{self.name}' must have at least 1 test")
        if self.timeout < 1:
            raise ValueError(f"Phase '{self.name}' timeout must be positive")


# Test phase definitions following the enterprise testing pyramid
PHASES: list[Phase] = [
    Phase(
        name="health",
        tests=(
            "health_api",
            "health_database",
            "health_redis",
            "health_storage",
        ),
        runner=RunnerType.PYTEST,
        parallel=True,
        timeout=60,
        required=True,
    ),
    Phase(
        name="backend_smoke",
        tests=(
            "smoke_auth",
            "smoke_users",
            "smoke_brand_kits",
            "smoke_generation",
            "smoke_assets",
            "smoke_coach",
            "smoke_twitch",
        ),
        runner=RunnerType.PYTEST,
        parallel=True,
        timeout=120,
        required=True,
    ),
    Phase(
        name="frontend_smoke",
        tests=(
            "smoke_landing",
            "smoke_auth_pages",
            "smoke_dashboard",
        ),
        runner=RunnerType.PLAYWRIGHT,
        parallel=True,
        timeout=180,
        required=True,
    ),
    Phase(
        name="backend_flows",
        tests=(
            "flow_user_onboarding",
            "flow_brand_creation",
            "flow_asset_generation",
            "flow_coach_conversation",
            "flow_twitch_pack",
        ),
        runner=RunnerType.PYTEST,
        parallel=False,
        timeout=300,
        required=False,
    ),
    Phase(
        name="frontend_flows",
        tests=(
            "flow_signup",
            "flow_brand_kit_creation",
            "flow_asset_generation",
            "flow_coach_interaction",
        ),
        runner=RunnerType.PLAYWRIGHT,
        parallel=False,
        timeout=300,
        required=False,
    ),
    Phase(
        name="database_integrity",
        tests=(
            "db_migrations",
            "db_constraints",
            "db_indexes",
        ),
        runner=RunnerType.PYTEST,
        parallel=True,
        timeout=120,
        required=True,
    ),
]


@dataclass(slots=True)
class Config:
    """
    Runtime configuration for the E2E orchestration system.
    
    Loads configuration from environment variables with sensible defaults.
    
    Attributes:
        backend_url: Base URL for backend API
        frontend_url: Base URL for frontend application
        database_url: PostgreSQL connection string
        redis_url: Redis connection string
        max_workers: Maximum parallel test workers
        results_dir: Directory for test results output
        verbose: Enable verbose logging
        fail_fast: Stop on first failure
        retry_count: Number of retries for flaky tests
    
    Example:
        >>> config = Config()
        >>> print(config.backend_url)
        'http://localhost:8000'
    """
    backend_url: str = field(
        default_factory=lambda: os.getenv("E2E_BACKEND_URL", "http://localhost:8000")
    )
    frontend_url: str = field(
        default_factory=lambda: os.getenv("E2E_FRONTEND_URL", "http://localhost:3000")
    )
    database_url: str = field(
        default_factory=lambda: os.getenv(
            "E2E_DATABASE_URL",
            "postgresql://postgres:postgres@localhost:5432/test_db"
        )
    )
    redis_url: str = field(
        default_factory=lambda: os.getenv("E2E_REDIS_URL", "redis://localhost:6379/1")
    )
    max_workers: int = field(
        default_factory=lambda: int(os.getenv("E2E_MAX_WORKERS", "4"))
    )
    results_dir: str = field(
        default_factory=lambda: os.getenv("E2E_RESULTS_DIR", "test-results")
    )
    verbose: bool = field(
        default_factory=lambda: os.getenv("E2E_VERBOSE", "false").lower() == "true"
    )
    fail_fast: bool = field(
        default_factory=lambda: os.getenv("E2E_FAIL_FAST", "false").lower() == "true"
    )
    retry_count: int = field(
        default_factory=lambda: int(os.getenv("E2E_RETRY_COUNT", "2"))
    )
    
    def __post_init__(self) -> None:
        """Validate configuration values."""
        if self.max_workers < 1:
            raise ValueError("max_workers must be at least 1")
        if self.retry_count < 0:
            raise ValueError("retry_count cannot be negative")


def get_phase_by_name(name: str) -> Phase | None:
    """
    Retrieve a phase by its name.
    
    Args:
        name: The phase name to look up
        
    Returns:
        The Phase object if found, None otherwise
        
    Example:
        >>> phase = get_phase_by_name("health")
        >>> phase.tests
        4
    """
    return next((p for p in PHASES if p.name == name), None)


def get_required_phases() -> list[Phase]:
    """
    Get all phases marked as required.
    
    Returns:
        List of required Phase objects
        
    Example:
        >>> required = get_required_phases()
        >>> len(required)
        4
    """
    return [p for p in PHASES if p.required]


def get_phases_by_runner(runner: RunnerType) -> list[Phase]:
    """
    Get all phases using a specific test runner.
    
    Args:
        runner: The runner type to filter by
        
    Returns:
        List of Phase objects using the specified runner
        
    Example:
        >>> pytest_phases = get_phases_by_runner(RunnerType.PYTEST)
        >>> len(pytest_phases)
        4
    """
    return [p for p in PHASES if p.runner == runner]
