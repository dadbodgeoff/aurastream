"""
Creator Intel V2 - Core Module

Enterprise-grade infrastructure for the Creator Intel system.
Contains base classes, exceptions, metrics, and decay management.
"""

from backend.services.intel.core.base_analyzer import BaseAnalyzer, AnalysisResult
from backend.services.intel.core.exceptions import (
    IntelError,
    IntelConfigError,
    IntelDataError,
    IntelQuotaError,
    IntelTimeoutError,
    IntelCircuitOpenError,
)
from backend.services.intel.core.decay_manager import DecayManager, DecayConfig
from backend.services.intel.core.metrics import IntelMetrics, MetricType

__all__ = [
    # Base classes
    "BaseAnalyzer",
    "AnalysisResult",
    # Exceptions
    "IntelError",
    "IntelConfigError",
    "IntelDataError",
    "IntelQuotaError",
    "IntelTimeoutError",
    "IntelCircuitOpenError",
    # Decay
    "DecayManager",
    "DecayConfig",
    # Metrics
    "IntelMetrics",
    "MetricType",
]
