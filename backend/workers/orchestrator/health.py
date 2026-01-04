"""
Health Monitoring for Worker Orchestrator.

Tracks worker health, heartbeats, and availability.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional, Any

import redis.asyncio as redis

from .types import WorkerType, WorkerHealth

logger = logging.getLogger(__name__)


class HealthStatus(Enum):
    """Worker health status."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    OFFLINE = "offline"
    UNKNOWN = "unknown"


@dataclass
class HealthThresholds:
    """Thresholds for health determination."""
    heartbeat_timeout_seconds: int = 60
    degraded_failure_rate: float = 0.05  # 5%
    unhealthy_failure_rate: float = 0.15  # 15%
    degraded_latency_multiplier: float = 1.5
    unhealthy_latency_multiplier: float = 3.0
    max_queue_depth: int = 100


@dataclass
class WorkerHealthState:
    """Internal health state for a worker."""
    worker_name: str
    worker_type: WorkerType
    
    # Heartbeat tracking
    last_heartbeat: Optional[datetime] = None
    heartbeat_count: int = 0
    
    # Execution tracking
    total_executions: int = 0
    successful_executions: int = 0
    failed_executions: int = 0
    
    # Timing
    total_duration_ms: int = 0
    expected_duration_ms: int = 60000  # Default 1 minute
    
    # Current state
    current_job_id: Optional[str] = None
    current_job_started: Optional[datetime] = None
    
    # Resource tracking
    last_memory_mb: float = 0
    last_cpu_percent: float = 0
    
    # Queue tracking (for RQ workers)
    queue_depth: int = 0
    
    def get_failure_rate(self) -> float:
        """Calculate failure rate."""
        if self.total_executions == 0:
            return 0.0
        return self.failed_executions / self.total_executions
    
    def get_avg_duration_ms(self) -> float:
        """Calculate average execution duration."""
        if self.total_executions == 0:
            return 0.0
        return self.total_duration_ms / self.total_executions
    
    def to_health(self, status: HealthStatus) -> WorkerHealth:
        """Convert to WorkerHealth dataclass."""
        uptime = 0
        if self.last_heartbeat:
            # Approximate uptime from heartbeat count
            uptime = self.heartbeat_count * 60  # Assume 1 heartbeat per minute
        
        return WorkerHealth(
            worker_id=self.worker_name,
            worker_type=self.worker_type,
            status=status.value,
            jobs_processed=self.total_executions,
            jobs_failed=self.failed_executions,
            avg_processing_ms=self.get_avg_duration_ms(),
            current_job_id=self.current_job_id,
            last_heartbeat=self.last_heartbeat,
            uptime_seconds=uptime,
            memory_mb=self.last_memory_mb,
            cpu_percent=self.last_cpu_percent,
            queue_depth=self.queue_depth,
        )


class HealthMonitor:
    """
    Monitors health of all workers.
    
    Features:
    - Heartbeat tracking
    - Failure rate monitoring
    - Latency tracking
    - Resource monitoring
    - Health status determination
    """
    
    REDIS_KEY_PREFIX = "orchestrator:health:"
    
    def __init__(
        self,
        redis_client: Optional[redis.Redis] = None,
        thresholds: Optional[HealthThresholds] = None,
    ):
        self._redis = redis_client
        self._thresholds = thresholds or HealthThresholds()
        self._workers: Dict[str, WorkerHealthState] = {}
    
    def register_worker(
        self,
        worker_name: str,
        worker_type: WorkerType,
        expected_duration_ms: int = 60000,
    ) -> None:
        """Register a worker for health monitoring."""
        self._workers[worker_name] = WorkerHealthState(
            worker_name=worker_name,
            worker_type=worker_type,
            expected_duration_ms=expected_duration_ms,
        )
        logger.debug(f"Registered worker for health monitoring: {worker_name}")
    
    async def record_heartbeat(
        self,
        worker_name: str,
        memory_mb: float = 0,
        cpu_percent: float = 0,
        queue_depth: int = 0,
    ) -> None:
        """Record a heartbeat from a worker."""
        if worker_name not in self._workers:
            logger.warning(f"Heartbeat from unregistered worker: {worker_name}")
            return
        
        state = self._workers[worker_name]
        state.last_heartbeat = datetime.now(timezone.utc)
        state.heartbeat_count += 1
        state.last_memory_mb = memory_mb
        state.last_cpu_percent = cpu_percent
        state.queue_depth = queue_depth
        
        # Persist to Redis if available
        if self._redis:
            key = f"{self.REDIS_KEY_PREFIX}heartbeat:{worker_name}"
            await self._redis.setex(
                key,
                self._thresholds.heartbeat_timeout_seconds * 2,
                datetime.now(timezone.utc).isoformat()
            )
    
    async def record_execution_start(
        self,
        worker_name: str,
        job_id: str,
    ) -> None:
        """Record that a worker started executing a job."""
        if worker_name not in self._workers:
            return
        
        state = self._workers[worker_name]
        state.current_job_id = job_id
        state.current_job_started = datetime.now(timezone.utc)
    
    async def record_execution_complete(
        self,
        worker_name: str,
        job_id: str,
        success: bool,
        duration_ms: int,
    ) -> None:
        """Record that a worker completed executing a job."""
        if worker_name not in self._workers:
            return
        
        state = self._workers[worker_name]
        state.total_executions += 1
        state.total_duration_ms += duration_ms
        
        if success:
            state.successful_executions += 1
        else:
            state.failed_executions += 1
        
        # Clear current job if it matches
        if state.current_job_id == job_id:
            state.current_job_id = None
            state.current_job_started = None
    
    def get_health_status(self, worker_name: str) -> HealthStatus:
        """
        Determine health status for a worker.
        
        Status determination:
        - OFFLINE: No heartbeat within timeout
        - UNHEALTHY: High failure rate or very slow
        - DEGRADED: Elevated failure rate or slow
        - HEALTHY: All metrics within thresholds
        """
        if worker_name not in self._workers:
            return HealthStatus.UNKNOWN
        
        state = self._workers[worker_name]
        now = datetime.now(timezone.utc)
        
        # Check heartbeat
        if state.last_heartbeat is None:
            return HealthStatus.OFFLINE
        
        heartbeat_age = (now - state.last_heartbeat).total_seconds()
        if heartbeat_age > self._thresholds.heartbeat_timeout_seconds:
            return HealthStatus.OFFLINE
        
        # Check failure rate
        failure_rate = state.get_failure_rate()
        if failure_rate >= self._thresholds.unhealthy_failure_rate:
            return HealthStatus.UNHEALTHY
        if failure_rate >= self._thresholds.degraded_failure_rate:
            return HealthStatus.DEGRADED
        
        # Check latency
        avg_duration = state.get_avg_duration_ms()
        expected = state.expected_duration_ms
        
        if avg_duration > expected * self._thresholds.unhealthy_latency_multiplier:
            return HealthStatus.UNHEALTHY
        if avg_duration > expected * self._thresholds.degraded_latency_multiplier:
            return HealthStatus.DEGRADED
        
        # Check queue depth (for RQ workers)
        if state.queue_depth > self._thresholds.max_queue_depth:
            return HealthStatus.DEGRADED
        
        return HealthStatus.HEALTHY
    
    def get_worker_health(self, worker_name: str) -> Optional[WorkerHealth]:
        """Get health information for a specific worker."""
        if worker_name not in self._workers:
            return None
        
        state = self._workers[worker_name]
        status = self.get_health_status(worker_name)
        return state.to_health(status)
    
    def get_all_health(self) -> Dict[str, WorkerHealth]:
        """Get health information for all workers."""
        return {
            name: state.to_health(self.get_health_status(name))
            for name, state in self._workers.items()
        }
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get summary of overall system health."""
        all_health = self.get_all_health()
        
        by_status = {}
        for status in HealthStatus:
            by_status[status.value] = len([
                h for h in all_health.values()
                if h.status == status.value
            ])
        
        total_jobs = sum(h.jobs_processed for h in all_health.values())
        total_failed = sum(h.jobs_failed for h in all_health.values())
        
        return {
            "total_workers": len(all_health),
            "by_status": by_status,
            "healthy_count": by_status.get(HealthStatus.HEALTHY.value, 0),
            "unhealthy_count": by_status.get(HealthStatus.UNHEALTHY.value, 0) + 
                              by_status.get(HealthStatus.OFFLINE.value, 0),
            "total_jobs_processed": total_jobs,
            "total_jobs_failed": total_failed,
            "overall_failure_rate": total_failed / total_jobs if total_jobs > 0 else 0,
            "system_status": self._determine_system_status(by_status),
        }
    
    def _determine_system_status(self, by_status: Dict[str, int]) -> str:
        """Determine overall system status from worker statuses."""
        unhealthy = by_status.get(HealthStatus.UNHEALTHY.value, 0)
        offline = by_status.get(HealthStatus.OFFLINE.value, 0)
        degraded = by_status.get(HealthStatus.DEGRADED.value, 0)
        total = sum(by_status.values())
        
        if total == 0:
            return "unknown"
        
        critical_count = unhealthy + offline
        
        if critical_count > total * 0.5:
            return "critical"
        if critical_count > 0 or degraded > total * 0.3:
            return "degraded"
        if degraded > 0:
            return "warning"
        return "healthy"
    
    async def check_stuck_jobs(self, timeout_seconds: int = 600) -> List[Dict[str, Any]]:
        """Check for jobs that appear to be stuck."""
        stuck = []
        now = datetime.now(timezone.utc)
        
        for name, state in self._workers.items():
            if state.current_job_id and state.current_job_started:
                duration = (now - state.current_job_started).total_seconds()
                if duration > timeout_seconds:
                    stuck.append({
                        "worker_name": name,
                        "job_id": state.current_job_id,
                        "started_at": state.current_job_started.isoformat(),
                        "duration_seconds": int(duration),
                    })
        
        return stuck
