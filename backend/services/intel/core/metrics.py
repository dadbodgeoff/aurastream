"""
Creator Intel V2 - Metrics

Prometheus metrics and observability for the Creator Intel system.
Provides structured metrics for monitoring, alerting, and debugging.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional, Any
import logging
import time

logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Types of metrics tracked by the system."""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"


@dataclass
class MetricValue:
    """
    A single metric value with labels.
    
    Attributes:
        name: Metric name
        value: Current value
        labels: Dictionary of label key-value pairs
        timestamp: When the metric was recorded
        metric_type: Type of metric
    """
    name: str
    value: float
    labels: Dict[str, str] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metric_type: MetricType = MetricType.GAUGE
    
    def to_prometheus_format(self) -> str:
        """Convert to Prometheus text format."""
        label_str = ""
        if self.labels:
            label_pairs = [f'{k}="{v}"' for k, v in self.labels.items()]
            label_str = "{" + ",".join(label_pairs) + "}"
        
        return f"{self.name}{label_str} {self.value}"


@dataclass
class OperationMetrics:
    """
    Metrics for a single operation.
    
    Attributes:
        operation: Name of the operation
        start_time: When the operation started
        end_time: When the operation ended
        duration_seconds: How long the operation took
        success: Whether the operation succeeded
        error: Error message if failed
        metadata: Additional context
    """
    operation: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    success: bool = True
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def complete(self, success: bool = True, error: Optional[str] = None) -> None:
        """Mark the operation as complete."""
        self.end_time = datetime.now(timezone.utc)
        self.duration_seconds = (self.end_time - self.start_time).total_seconds()
        self.success = success
        self.error = error


class IntelMetrics:
    """
    Centralized metrics collection for Creator Intel.
    
    Tracks:
    - Analysis operations (count, duration, success rate)
    - Quota usage (YouTube, Twitch)
    - Cache performance (hits, misses)
    - Data freshness
    - Worker health
    
    Usage:
        metrics = IntelMetrics()
        
        # Track an operation
        with metrics.track_operation("analyze_format", category="fortnite"):
            result = await analyzer.analyze("fortnite")
        
        # Record quota usage
        metrics.record_quota_usage("youtube", 5, 9995)
        
        # Get all metrics
        all_metrics = metrics.get_all_metrics()
    """
    
    def __init__(self) -> None:
        """Initialize the metrics collector."""
        # Counters
        self._analysis_count: Dict[str, int] = {}
        self._analysis_success: Dict[str, int] = {}
        self._analysis_failure: Dict[str, int] = {}
        self._cache_hits: Dict[str, int] = {}
        self._cache_misses: Dict[str, int] = {}
        
        # Gauges
        self._quota_remaining: Dict[str, int] = {}
        self._active_operations: int = 0
        self._last_analysis_time: Dict[str, datetime] = {}
        
        # Histograms (simplified as lists)
        self._analysis_durations: Dict[str, List[float]] = {}
        
        # Operation tracking
        self._current_operations: Dict[str, OperationMetrics] = {}
    
    def track_operation(
        self,
        operation: str,
        **labels: str,
    ) -> "OperationContext":
        """
        Create a context manager for tracking an operation.
        
        Args:
            operation: Name of the operation
            **labels: Additional labels (e.g., category="fortnite")
            
        Returns:
            Context manager that tracks the operation
            
        Usage:
            with metrics.track_operation("analyze", category="fortnite") as op:
                result = await do_analysis()
                op.metadata["video_count"] = len(result.videos)
        """
        return OperationContext(self, operation, labels)
    
    def start_operation(
        self,
        operation: str,
        labels: Optional[Dict[str, str]] = None,
    ) -> OperationMetrics:
        """
        Start tracking an operation.
        
        Args:
            operation: Name of the operation
            labels: Additional labels
            
        Returns:
            OperationMetrics instance
        """
        op_key = self._make_key(operation, labels or {})
        
        op = OperationMetrics(
            operation=operation,
            start_time=datetime.now(timezone.utc),
            metadata=labels or {},
        )
        
        self._current_operations[op_key] = op
        self._active_operations += 1
        
        # Increment counter
        self._analysis_count[op_key] = self._analysis_count.get(op_key, 0) + 1
        
        return op
    
    def end_operation(
        self,
        operation: str,
        labels: Optional[Dict[str, str]] = None,
        success: bool = True,
        error: Optional[str] = None,
    ) -> Optional[OperationMetrics]:
        """
        End tracking an operation.
        
        Args:
            operation: Name of the operation
            labels: Additional labels
            success: Whether the operation succeeded
            error: Error message if failed
            
        Returns:
            Completed OperationMetrics, or None if not found
        """
        op_key = self._make_key(operation, labels or {})
        
        op = self._current_operations.pop(op_key, None)
        if op:
            op.complete(success, error)
            self._active_operations = max(0, self._active_operations - 1)
            
            # Record duration
            if op.duration_seconds is not None:
                if op_key not in self._analysis_durations:
                    self._analysis_durations[op_key] = []
                self._analysis_durations[op_key].append(op.duration_seconds)
                
                # Keep only last 100 durations
                if len(self._analysis_durations[op_key]) > 100:
                    self._analysis_durations[op_key] = self._analysis_durations[op_key][-100:]
            
            # Record success/failure
            if success:
                self._analysis_success[op_key] = self._analysis_success.get(op_key, 0) + 1
            else:
                self._analysis_failure[op_key] = self._analysis_failure.get(op_key, 0) + 1
            
            # Update last analysis time
            self._last_analysis_time[op_key] = op.end_time or datetime.now(timezone.utc)
        
        return op
    
    def record_cache_hit(self, cache_type: str, category: Optional[str] = None) -> None:
        """Record a cache hit."""
        key = f"{cache_type}:{category}" if category else cache_type
        self._cache_hits[key] = self._cache_hits.get(key, 0) + 1
    
    def record_cache_miss(self, cache_type: str, category: Optional[str] = None) -> None:
        """Record a cache miss."""
        key = f"{cache_type}:{category}" if category else cache_type
        self._cache_misses[key] = self._cache_misses.get(key, 0) + 1
    
    def record_quota_usage(
        self,
        platform: str,
        units_used: int,
        units_remaining: int,
    ) -> None:
        """
        Record API quota usage.
        
        Args:
            platform: Platform name (e.g., "youtube", "twitch")
            units_used: Units consumed in this operation
            units_remaining: Units remaining after this operation
        """
        self._quota_remaining[platform] = units_remaining
        
        logger.debug(
            f"Quota update: {platform} used {units_used}, "
            f"remaining {units_remaining}"
        )
    
    def get_quota_remaining(self, platform: str) -> Optional[int]:
        """Get remaining quota for a platform."""
        return self._quota_remaining.get(platform)
    
    def get_success_rate(
        self,
        operation: str,
        labels: Optional[Dict[str, str]] = None,
    ) -> float:
        """
        Get success rate for an operation.
        
        Args:
            operation: Name of the operation
            labels: Additional labels
            
        Returns:
            Success rate as a float (0.0 to 1.0)
        """
        op_key = self._make_key(operation, labels or {})
        
        success = self._analysis_success.get(op_key, 0)
        failure = self._analysis_failure.get(op_key, 0)
        total = success + failure
        
        if total == 0:
            return 1.0
        
        return success / total
    
    def get_average_duration(
        self,
        operation: str,
        labels: Optional[Dict[str, str]] = None,
    ) -> Optional[float]:
        """
        Get average duration for an operation.
        
        Args:
            operation: Name of the operation
            labels: Additional labels
            
        Returns:
            Average duration in seconds, or None if no data
        """
        op_key = self._make_key(operation, labels or {})
        
        durations = self._analysis_durations.get(op_key, [])
        if not durations:
            return None
        
        return sum(durations) / len(durations)
    
    def get_all_metrics(self) -> Dict[str, Any]:
        """
        Get all metrics as a dictionary.
        
        Returns:
            Dictionary of all metrics
        """
        return {
            "counters": {
                "analysis_count": self._analysis_count,
                "analysis_success": self._analysis_success,
                "analysis_failure": self._analysis_failure,
                "cache_hits": self._cache_hits,
                "cache_misses": self._cache_misses,
            },
            "gauges": {
                "quota_remaining": self._quota_remaining,
                "active_operations": self._active_operations,
                "last_analysis_time": {
                    k: v.isoformat() for k, v in self._last_analysis_time.items()
                },
            },
            "histograms": {
                "analysis_durations": {
                    k: {
                        "count": len(v),
                        "avg": sum(v) / len(v) if v else 0,
                        "min": min(v) if v else 0,
                        "max": max(v) if v else 0,
                    }
                    for k, v in self._analysis_durations.items()
                },
            },
        }
    
    def to_prometheus_format(self) -> str:
        """
        Export metrics in Prometheus text format.
        
        Returns:
            Prometheus-formatted metrics string
        """
        lines = []
        
        # Analysis counts
        for key, count in self._analysis_count.items():
            lines.append(f'intel_analysis_total{{operation="{key}"}} {count}')
        
        # Success counts
        for key, count in self._analysis_success.items():
            lines.append(f'intel_analysis_success_total{{operation="{key}"}} {count}')
        
        # Failure counts
        for key, count in self._analysis_failure.items():
            lines.append(f'intel_analysis_failure_total{{operation="{key}"}} {count}')
        
        # Cache metrics
        for key, count in self._cache_hits.items():
            lines.append(f'intel_cache_hits_total{{cache="{key}"}} {count}')
        
        for key, count in self._cache_misses.items():
            lines.append(f'intel_cache_misses_total{{cache="{key}"}} {count}')
        
        # Quota remaining
        for platform, remaining in self._quota_remaining.items():
            lines.append(f'intel_quota_remaining{{platform="{platform}"}} {remaining}')
        
        # Active operations
        lines.append(f"intel_active_operations {self._active_operations}")
        
        return "\n".join(lines)
    
    def reset(self) -> None:
        """Reset all metrics (useful for testing)."""
        self._analysis_count.clear()
        self._analysis_success.clear()
        self._analysis_failure.clear()
        self._cache_hits.clear()
        self._cache_misses.clear()
        self._quota_remaining.clear()
        self._active_operations = 0
        self._last_analysis_time.clear()
        self._analysis_durations.clear()
        self._current_operations.clear()
    
    @staticmethod
    def _make_key(operation: str, labels: Dict[str, str]) -> str:
        """Create a unique key from operation and labels."""
        if not labels:
            return operation
        
        label_str = ",".join(f"{k}={v}" for k, v in sorted(labels.items()))
        return f"{operation}:{label_str}"


class OperationContext:
    """
    Context manager for tracking operations.
    
    Usage:
        with metrics.track_operation("analyze", category="fortnite") as op:
            result = await do_analysis()
            op.metadata["video_count"] = 50
    """
    
    def __init__(
        self,
        metrics: IntelMetrics,
        operation: str,
        labels: Dict[str, str],
    ) -> None:
        """Initialize the context."""
        self.metrics = metrics
        self.operation = operation
        self.labels = labels
        self.op: Optional[OperationMetrics] = None
    
    def __enter__(self) -> OperationMetrics:
        """Start tracking the operation."""
        self.op = self.metrics.start_operation(self.operation, self.labels)
        return self.op
    
    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        """End tracking the operation."""
        success = exc_type is None
        error = str(exc_val) if exc_val else None
        
        self.metrics.end_operation(
            self.operation,
            self.labels,
            success=success,
            error=error,
        )


# Singleton instance
_intel_metrics: Optional[IntelMetrics] = None


def get_intel_metrics() -> IntelMetrics:
    """
    Get the singleton metrics instance.
    
    Returns:
        IntelMetrics instance
    """
    global _intel_metrics
    if _intel_metrics is None:
        _intel_metrics = IntelMetrics()
    return _intel_metrics


def reset_intel_metrics() -> None:
    """Reset the singleton instance (useful for testing)."""
    global _intel_metrics
    if _intel_metrics:
        _intel_metrics.reset()
    _intel_metrics = None
