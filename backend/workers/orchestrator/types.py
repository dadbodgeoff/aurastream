"""
Type definitions for the Worker Orchestrator.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List


class JobPriority(Enum):
    """Job priority levels."""
    CRITICAL = 1  # System-critical jobs (e.g., auth token refresh)
    HIGH = 2      # User-facing real-time (e.g., generation)
    NORMAL = 3    # Standard background jobs
    LOW = 4       # Batch/maintenance jobs
    BULK = 5      # Large batch operations


class JobStatus(Enum):
    """Job lifecycle status."""
    PENDING = "pending"
    SCHEDULED = "scheduled"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"


class WorkerType(Enum):
    """Types of workers in the system."""
    GENERATION = "generation"
    ANALYTICS = "analytics"
    INTEL = "intel"
    THUMBNAIL = "thumbnail"
    NOTIFICATION = "notification"
    SSE = "sse"  # SSE Stream Guardian


class AnomalyType(Enum):
    """Types of anomalies that can be detected."""
    SLOW_JOB = "slow_job"
    HIGH_FAILURE_RATE = "high_failure_rate"
    WORKER_UNHEALTHY = "worker_unhealthy"
    QUEUE_BACKLOG = "queue_backlog"
    RESOURCE_SPIKE = "resource_spike"
    REPEATED_ERROR = "repeated_error"
    TIMEOUT_SPIKE = "timeout_spike"


@dataclass
class JobMetrics:
    """Metrics collected for a single job run."""
    job_id: str
    worker_type: WorkerType
    status: JobStatus
    
    # Timing
    queued_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Durations (in milliseconds)
    queue_wait_ms: Optional[int] = None
    processing_ms: Optional[int] = None
    total_ms: Optional[int] = None
    
    # Resource usage
    memory_mb: Optional[float] = None
    cpu_percent: Optional[float] = None
    
    # Results
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    
    # Context
    user_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkerHealth:
    """Health status of a worker instance."""
    worker_id: str
    worker_type: WorkerType
    status: str  # "healthy", "degraded", "unhealthy", "offline"
    
    # Stats
    jobs_processed: int = 0
    jobs_failed: int = 0
    avg_processing_ms: float = 0.0
    
    # Current state
    current_job_id: Optional[str] = None
    last_heartbeat: Optional[datetime] = None
    uptime_seconds: int = 0
    
    # Resource usage
    memory_mb: float = 0.0
    cpu_percent: float = 0.0
    queue_depth: int = 0


@dataclass
class AnomalyAlert:
    """An anomaly detected by the system."""
    id: str
    anomaly_type: AnomalyType
    severity: str  # "info", "warning", "error", "critical"
    
    # Context
    worker_type: Optional[WorkerType] = None
    job_id: Optional[str] = None
    worker_id: Optional[str] = None
    
    # Details
    message: str = ""
    details: Dict[str, Any] = field(default_factory=dict)
    
    # Timing
    detected_at: datetime = field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    
    # Actions
    auto_resolved: bool = False
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None


@dataclass
class RunReport:
    """Score report for a time period."""
    report_id: str
    period_start: datetime
    period_end: datetime
    
    # Overall scores (0-100)
    overall_score: float = 100.0
    reliability_score: float = 100.0
    performance_score: float = 100.0
    health_score: float = 100.0
    
    # Job stats
    total_jobs: int = 0
    successful_jobs: int = 0
    failed_jobs: int = 0
    timeout_jobs: int = 0
    retried_jobs: int = 0
    
    # Timing stats (milliseconds)
    avg_queue_wait_ms: float = 0.0
    avg_processing_ms: float = 0.0
    p50_processing_ms: float = 0.0
    p95_processing_ms: float = 0.0
    p99_processing_ms: float = 0.0
    
    # By worker type
    stats_by_worker: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    
    # Anomalies
    anomalies_detected: int = 0
    anomalies_resolved: int = 0
    active_anomalies: List[str] = field(default_factory=list)
    
    # Errors
    top_errors: List[Dict[str, Any]] = field(default_factory=list)
    
    # Generated
    generated_at: datetime = field(default_factory=datetime.utcnow)
