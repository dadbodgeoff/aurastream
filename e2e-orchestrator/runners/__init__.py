"""
E2E Test Runners

Provides test execution backends for different testing frameworks.

Available Runners:
    - BackendRunner: Executes pytest-based backend tests
    - FrontendRunner: Executes Playwright-based frontend tests
"""

from .backend_runner import BackendRunner
from .frontend_runner import FrontendRunner

__all__ = ["BackendRunner", "FrontendRunner"]
