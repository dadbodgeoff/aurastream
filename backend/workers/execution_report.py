"""
Worker Execution Report System.

Comprehensive metrics reporting for worker executions that enables:
1. Data verification - Validate that workers produced expected outputs
2. Pattern aggregation - Track trends over time for optimization
3. Anomaly detection - Identify unusual behavior patterns
4. Learning insights - Understand agent habits for improvements

Each worker should call report_execution_complete() after finishing work,
providing detailed metrics about what was accomplished.
"""

import json
import logging
import os
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

import redis

logger = logging.getLogger(__name__)

# Redis key prefixes
EXECUTION_REPORT_PREFIX = "orchestrator:executions:"
EXECUTION_HISTORY_PREFIX = "orchestrator:history:"
WORKER_STATS_PREFIX = "orchestrator:stats:"
ANOMALY_PREFIX = "orchestrator:anomalies:"
LEARNING_PREFIX = "orchestrator:learning:"


class DataQualityLevel(Enum):
    """Data quality assessment levels."""
    EXCELLENT = "excellent"    # All validations passed, data complete
    GOOD = "good"              # Minor issues, data usable
    DEGRADED = "degraded"      # Some data missing or stale
    POOR = "poor"              # Significant issues, data questionable
    FAILED = "failed"          # Data validation failed


class ExecutionOutcome(Enum):
    """Execution outcome types."""
    SUCCESS = "success"
    PARTIAL_SUCCESS = "partial_success"  # Some items processed
    SKIPPED = "skipped"                  # Intentionally skipped (lock held, etc.)
    FAILED = "failed"
    TIMEOUT = "timeout"


@dataclass
class DataVerification:
    """
    Data verification results from a worker execution.
    
    Workers should populate this to prove their work was valid.
    """
    # Record counts
    records_fetched: int = 0
    records_processed: int = 0
    records_stored: int = 0
    records_failed: int = 0
    records_skipped: int = 0
    
    # Data freshness
    newest_record_age_seconds: Optional[float] = None
    oldest_record_age_seconds: Optional[float] = None
    avg_record_age_seconds: Optional[float] = None
    
    # Data completeness
    expected_fields_present: bool = True
    missing_fields: List[str] = field(default_factory=list)
    null_field_counts: Dict[str, int] = field(default_factory=dict)
    
    # Data validity
    validation_checks_passed: int = 0
    validation_checks_failed: int = 0
    validation_errors: List[str] = field(default_factory=list)
    
    # Source health
    api_calls_made: int = 0
    api_calls_succeeded: int = 0
    api_calls_failed: int = 0
    api_rate_limited: bool = False
    api_quota_remaining: Optional[int] = None
    
    # Cache status
    cache_hits: int = 0
    cache_misses: int = 0
    cache_writes: int = 0
    cache_ttl_seconds: Optional[int] = None
    
    def quality_level(self) -> DataQualityLevel:
        """Calculate overall data quality level."""
        if self.records_processed == 0 and self.records_fetched > 0:
            return DataQualityLevel.FAILED
        
        if self.validation_checks_failed > 0:
            if self.validation_checks_failed > self.validation_checks_passed:
                return DataQualityLevel.POOR
            return DataQualityLevel.DEGRADED
        
        if self.records_failed > 0:
            failure_rate = self.records_failed / max(self.records_fetched, 1)
            if failure_rate > 0.5:
                return DataQualityLevel.POOR
            if failure_rate > 0.1:
                return DataQualityLevel.DEGRADED
            return DataQualityLevel.GOOD
        
        if not self.expected_fields_present or self.missing_fields:
            return DataQualityLevel.DEGRADED
        
        if self.api_rate_limited:
            return DataQualityLevel.DEGRADED
        
        return DataQualityLevel.EXCELLENT


@dataclass
class ResourceMetrics:
    """
    Resource usage metrics during execution.
    
    Helps identify resource-hungry workers and optimize allocation.
    """
    # Memory
    memory_start_mb: float = 0
    memory_peak_mb: float = 0
    memory_end_mb: float = 0
    
    # CPU
    cpu_percent_avg: float = 0
    cpu_percent_peak: float = 0
    
    # I/O
    network_bytes_sent: int = 0
    network_bytes_received: int = 0
    disk_reads: int = 0
    disk_writes: int = 0
    
    # Concurrency
    concurrent_tasks: int = 1
    max_concurrent_tasks: int = 1
    
    # External calls
    external_api_latency_ms_avg: float = 0
    external_api_latency_ms_p95: float = 0
    database_query_count: int = 0
    database_query_time_ms: float = 0
    redis_operations: int = 0
    redis_time_ms: float = 0


@dataclass
class LearningMetrics:
    """
    Metrics for learning and optimization.
    
    These help identify patterns and opportunities for improvement.
    """
    # Timing patterns
    time_of_day_utc: int = 0           # Hour (0-23)
    day_of_week: int = 0               # 0=Monday, 6=Sunday
    
    # Execution patterns
    execution_number_today: int = 0     # How many times run today
    time_since_last_run_seconds: float = 0
    
    # Data patterns
    data_volume_trend: str = "stable"   # increasing, decreasing, stable
    data_volume_vs_avg: float = 1.0     # Ratio vs historical average
    
    # Performance patterns
    duration_vs_avg: float = 1.0        # Ratio vs historical average
    duration_trend: str = "stable"      # faster, slower, stable
    
    # Dependency patterns
    upstream_data_age_seconds: Optional[float] = None
    downstream_consumers_waiting: int = 0
    
    # Optimization hints
    suggested_interval_seconds: Optional[int] = None
    suggested_batch_size: Optional[int] = None
    optimization_notes: List[str] = field(default_factory=list)


@dataclass
class ExecutionReport:
    """
    Complete execution report from a worker.
    
    This is the main structure workers should populate and submit.
    """
    # Identity
    worker_name: str
    execution_id: str = field(default_factory=lambda: str(uuid.uuid4())[:12])
    
    # Timing
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    duration_ms: int = 0
    
    # Outcome
    outcome: ExecutionOutcome = ExecutionOutcome.SUCCESS
    error_message: Optional[str] = None
    error_type: Optional[str] = None
    retry_count: int = 0
    
    # Detailed metrics
    data_verification: DataVerification = field(default_factory=DataVerification)
    resource_metrics: ResourceMetrics = field(default_factory=ResourceMetrics)
    learning_metrics: LearningMetrics = field(default_factory=LearningMetrics)
    
    # Worker-specific data (flexible dict for custom metrics)
    custom_metrics: Dict[str, Any] = field(default_factory=dict)
    
    # Scores (calculated)
    reliability_score: float = 100.0
    performance_score: float = 100.0
    data_quality_score: float = 100.0
    resource_efficiency_score: float = 100.0
    overall_score: float = 100.0
    
    # Anomalies detected
    anomalies: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    
    def calculate_scores(self, historical_avg_duration_ms: float = 0) -> None:
        """Calculate all scores based on metrics."""
        # Reliability score
        if self.outcome == ExecutionOutcome.SUCCESS:
            self.reliability_score = 100.0
        elif self.outcome == ExecutionOutcome.PARTIAL_SUCCESS:
            self.reliability_score = 70.0
        elif self.outcome == ExecutionOutcome.SKIPPED:
            self.reliability_score = 90.0  # Skipping is intentional
        else:
            self.reliability_score = 0.0
        
        # Performance score
        if historical_avg_duration_ms > 0:
            ratio = self.duration_ms / historical_avg_duration_ms
            if ratio <= 1.0:
                self.performance_score = 100.0
            elif ratio <= 1.5:
                self.performance_score = 80.0
            elif ratio <= 2.0:
                self.performance_score = 50.0
            else:
                self.performance_score = max(0, 100 - (ratio - 1) * 30)
        
        # Data quality score
        quality = self.data_verification.quality_level()
        quality_scores = {
            DataQualityLevel.EXCELLENT: 100.0,
            DataQualityLevel.GOOD: 85.0,
            DataQualityLevel.DEGRADED: 60.0,
            DataQualityLevel.POOR: 30.0,
            DataQualityLevel.FAILED: 0.0,
        }
        self.data_quality_score = quality_scores.get(quality, 50.0)
        
        # Resource efficiency score
        if self.resource_metrics.memory_peak_mb > 0:
            # Penalize excessive memory usage (>500MB)
            if self.resource_metrics.memory_peak_mb > 500:
                self.resource_efficiency_score = max(50, 100 - (self.resource_metrics.memory_peak_mb - 500) / 10)
            else:
                self.resource_efficiency_score = 100.0
        
        # Overall score (weighted)
        self.overall_score = (
            self.reliability_score * 0.35 +
            self.performance_score * 0.25 +
            self.data_quality_score * 0.30 +
            self.resource_efficiency_score * 0.10
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "worker_name": self.worker_name,
            "execution_id": self.execution_id,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_ms": self.duration_ms,
            "outcome": self.outcome.value,
            "error_message": self.error_message,
            "error_type": self.error_type,
            "retry_count": self.retry_count,
            "data_verification": asdict(self.data_verification),
            "resource_metrics": asdict(self.resource_metrics),
            "learning_metrics": asdict(self.learning_metrics),
            "custom_metrics": self.custom_metrics,
            "reliability_score": self.reliability_score,
            "performance_score": self.performance_score,
            "data_quality_score": self.data_quality_score,
            "resource_efficiency_score": self.resource_efficiency_score,
            "overall_score": self.overall_score,
            "anomalies": self.anomalies,
            "recommendations": self.recommendations,
        }


def get_redis_client() -> redis.Redis:
    """Get synchronous Redis client."""
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    return redis.from_url(redis_url, decode_responses=True)


def submit_execution_report(report: ExecutionReport) -> bool:
    """
    Submit an execution report to the orchestrator.
    
    This stores the report and updates aggregated statistics.
    
    Args:
        report: The completed execution report
        
    Returns:
        True if submission succeeded
    """
    try:
        client = get_redis_client()
        now = datetime.now(timezone.utc)
        
        # Ensure completion time is set
        if report.completed_at is None:
            report.completed_at = now
        
        # Calculate duration if not set
        if report.duration_ms == 0 and report.started_at:
            report.duration_ms = int((report.completed_at - report.started_at).total_seconds() * 1000)
        
        # Get historical average for score calculation
        stats_key = f"{WORKER_STATS_PREFIX}{report.worker_name}"
        stats_data = client.get(stats_key)
        historical_avg = 0
        if stats_data:
            stats = json.loads(stats_data)
            historical_avg = stats.get("avg_duration_ms", 0)
        
        # Calculate scores
        report.calculate_scores(historical_avg)
        
        # Store the report
        report_key = f"{EXECUTION_REPORT_PREFIX}{report.worker_name}:{report.execution_id}"
        client.setex(report_key, 86400 * 7, json.dumps(report.to_dict()))  # 7 day TTL
        
        # Add to history list (keep last 100)
        history_key = f"{EXECUTION_HISTORY_PREFIX}{report.worker_name}"
        client.lpush(history_key, report.execution_id)
        client.ltrim(history_key, 0, 99)
        
        # Update aggregated statistics
        _update_worker_stats(client, report)
        
        # Check for anomalies and store if found
        if report.anomalies:
            _store_anomalies(client, report)
        
        # Update learning data
        _update_learning_data(client, report)
        
        logger.info(
            f"Execution report submitted: {report.worker_name} "
            f"[{report.execution_id}] score={report.overall_score:.1f}"
        )
        return True
        
    except Exception as e:
        logger.error(f"Failed to submit execution report: {e}")
        return False


def _update_worker_stats(client: redis.Redis, report: ExecutionReport) -> None:
    """Update aggregated worker statistics."""
    stats_key = f"{WORKER_STATS_PREFIX}{report.worker_name}"
    stats_data = client.get(stats_key)
    
    if stats_data:
        stats = json.loads(stats_data)
    else:
        stats = {
            "total_executions": 0,
            "successful_executions": 0,
            "failed_executions": 0,
            "total_duration_ms": 0,
            "avg_duration_ms": 0,
            "min_duration_ms": float('inf'),
            "max_duration_ms": 0,
            "total_records_processed": 0,
            "avg_records_per_run": 0,
            "avg_overall_score": 0,
            "score_history": [],  # Last 20 scores
            "duration_history": [],  # Last 20 durations
            "first_execution": None,
            "last_execution": None,
        }
    
    # Update counts
    stats["total_executions"] += 1
    if report.outcome == ExecutionOutcome.SUCCESS:
        stats["successful_executions"] += 1
    elif report.outcome == ExecutionOutcome.FAILED:
        stats["failed_executions"] += 1
    
    # Update duration stats
    stats["total_duration_ms"] += report.duration_ms
    stats["avg_duration_ms"] = stats["total_duration_ms"] / stats["total_executions"]
    stats["min_duration_ms"] = min(stats.get("min_duration_ms", float('inf')), report.duration_ms)
    stats["max_duration_ms"] = max(stats.get("max_duration_ms", 0), report.duration_ms)
    
    # Update records stats
    stats["total_records_processed"] += report.data_verification.records_processed
    stats["avg_records_per_run"] = stats["total_records_processed"] / stats["total_executions"]
    
    # Update score history (rolling window)
    stats["score_history"].append(report.overall_score)
    stats["score_history"] = stats["score_history"][-20:]
    stats["avg_overall_score"] = sum(stats["score_history"]) / len(stats["score_history"])
    
    # Update duration history
    stats["duration_history"].append(report.duration_ms)
    stats["duration_history"] = stats["duration_history"][-20:]
    
    # Update timestamps
    if stats["first_execution"] is None:
        stats["first_execution"] = report.started_at.isoformat()
    stats["last_execution"] = report.completed_at.isoformat() if report.completed_at else None
    
    # Store with 30 day TTL
    client.setex(stats_key, 86400 * 30, json.dumps(stats))


def _store_anomalies(client: redis.Redis, report: ExecutionReport) -> None:
    """Store detected anomalies."""
    for anomaly in report.anomalies:
        anomaly_id = str(uuid.uuid4())[:8]
        anomaly_key = f"{ANOMALY_PREFIX}{report.worker_name}:{anomaly_id}"
        
        anomaly_data = {
            "anomaly_id": anomaly_id,
            "worker_name": report.worker_name,
            "execution_id": report.execution_id,
            "message": anomaly,
            "detected_at": datetime.now(timezone.utc).isoformat(),
            "severity": "warning",  # Could be enhanced with severity detection
            "resolved": False,
        }
        
        client.setex(anomaly_key, 86400 * 7, json.dumps(anomaly_data))


def _update_learning_data(client: redis.Redis, report: ExecutionReport) -> None:
    """Update learning/optimization data."""
    learning_key = f"{LEARNING_PREFIX}{report.worker_name}"
    learning_data = client.get(learning_key)
    
    if learning_data:
        learning = json.loads(learning_data)
    else:
        learning = {
            "hourly_performance": {str(h): [] for h in range(24)},
            "daily_performance": {str(d): [] for d in range(7)},
            "optimal_hour": None,
            "optimal_day": None,
            "data_volume_trend": [],
            "suggested_optimizations": [],
        }
    
    # Track performance by hour
    hour = report.learning_metrics.time_of_day_utc
    learning["hourly_performance"][str(hour)].append({
        "score": report.overall_score,
        "duration_ms": report.duration_ms,
        "records": report.data_verification.records_processed,
    })
    # Keep last 10 per hour
    learning["hourly_performance"][str(hour)] = learning["hourly_performance"][str(hour)][-10:]
    
    # Track performance by day
    day = report.learning_metrics.day_of_week
    learning["daily_performance"][str(day)].append({
        "score": report.overall_score,
        "duration_ms": report.duration_ms,
    })
    learning["daily_performance"][str(day)] = learning["daily_performance"][str(day)][-10:]
    
    # Calculate optimal times
    best_hour_score = 0
    for h, perfs in learning["hourly_performance"].items():
        if perfs:
            avg_score = sum(p["score"] for p in perfs) / len(perfs)
            if avg_score > best_hour_score:
                best_hour_score = avg_score
                learning["optimal_hour"] = int(h)
    
    # Track data volume trend
    learning["data_volume_trend"].append(report.data_verification.records_processed)
    learning["data_volume_trend"] = learning["data_volume_trend"][-50:]
    
    # Store with 30 day TTL
    client.setex(learning_key, 86400 * 30, json.dumps(learning))


def get_worker_stats(worker_name: str) -> Optional[Dict[str, Any]]:
    """Get aggregated statistics for a worker."""
    try:
        client = get_redis_client()
        stats_key = f"{WORKER_STATS_PREFIX}{worker_name}"
        data = client.get(stats_key)
        return json.loads(data) if data else None
    except Exception as e:
        logger.error(f"Failed to get worker stats: {e}")
        return None


def get_worker_learning_data(worker_name: str) -> Optional[Dict[str, Any]]:
    """Get learning/optimization data for a worker."""
    try:
        client = get_redis_client()
        learning_key = f"{LEARNING_PREFIX}{worker_name}"
        data = client.get(learning_key)
        return json.loads(data) if data else None
    except Exception as e:
        logger.error(f"Failed to get learning data: {e}")
        return None


def get_recent_executions(worker_name: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Get recent execution reports for a worker."""
    try:
        client = get_redis_client()
        history_key = f"{EXECUTION_HISTORY_PREFIX}{worker_name}"
        execution_ids = client.lrange(history_key, 0, limit - 1)
        
        reports = []
        for exec_id in execution_ids:
            report_key = f"{EXECUTION_REPORT_PREFIX}{worker_name}:{exec_id}"
            data = client.get(report_key)
            if data:
                reports.append(json.loads(data))
        
        return reports
    except Exception as e:
        logger.error(f"Failed to get recent executions: {e}")
        return []


# =============================================================================
# Convenience functions for workers
# =============================================================================

def create_report(worker_name: str) -> ExecutionReport:
    """Create a new execution report for a worker."""
    now = datetime.now(timezone.utc)
    report = ExecutionReport(worker_name=worker_name)
    report.learning_metrics.time_of_day_utc = now.hour
    report.learning_metrics.day_of_week = now.weekday()
    return report


def quick_report(
    worker_name: str,
    success: bool,
    duration_ms: int,
    records_processed: int = 0,
    records_fetched: int = 0,
    error: Optional[str] = None,
    custom_metrics: Optional[Dict[str, Any]] = None,
) -> bool:
    """
    Quick way to submit a basic execution report.
    
    For workers that don't need detailed metrics.
    """
    report = create_report(worker_name)
    report.completed_at = datetime.now(timezone.utc)
    report.duration_ms = duration_ms
    report.outcome = ExecutionOutcome.SUCCESS if success else ExecutionOutcome.FAILED
    report.error_message = error
    report.data_verification.records_processed = records_processed
    report.data_verification.records_fetched = records_fetched
    if custom_metrics:
        report.custom_metrics = custom_metrics
    
    return submit_execution_report(report)
