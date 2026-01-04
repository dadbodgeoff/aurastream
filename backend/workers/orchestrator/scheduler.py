"""
Job Scheduler for Worker Orchestrator.

Handles job scheduling with priorities, rate limiting, and queue management.
"""

import logging
import time
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Callable
from dataclasses import dataclass, field

from redis import Redis

from .types import JobPriority, JobStatus, WorkerType

logger = logging.getLogger(__name__)


@dataclass
class ScheduledJob:
    """A job scheduled for execution."""
    job_id: str
    worker_type: WorkerType
    priority: JobPriority
    payload: Dict[str, Any]
    
    # Scheduling
    scheduled_at: datetime = field(default_factory=datetime.utcnow)
    execute_after: Optional[datetime] = None  # For delayed jobs
    
    # Retry config
    max_retries: int = 3
    retry_count: int = 0
    retry_delay_seconds: int = 60
    
    # Timeout
    timeout_seconds: int = 300  # 5 minutes default
    
    # Tracking
    user_id: Optional[str] = None
    correlation_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class JobScheduler:
    """
    Centralized job scheduler with priority queues.
    
    Features:
    - Priority-based scheduling (CRITICAL > HIGH > NORMAL > LOW > BULK)
    - Rate limiting per user/worker type
    - Delayed job execution
    - Retry management
    - Job deduplication
    """
    
    # Rate limits per worker type (jobs per minute)
    DEFAULT_RATE_LIMITS = {
        WorkerType.GENERATION: 10,
        WorkerType.ANALYTICS: 100,
        WorkerType.INTEL: 50,
        WorkerType.THUMBNAIL: 20,
        WorkerType.NOTIFICATION: 200,
    }
    
    def __init__(
        self,
        redis_client: Redis,
        rate_limits: Optional[Dict[WorkerType, int]] = None,
    ):
        self.redis = redis_client
        self.rate_limits = rate_limits or self.DEFAULT_RATE_LIMITS
        self._job_callbacks: Dict[WorkerType, Callable] = {}
        self._running = False
        
    def register_worker(
        self,
        worker_type: WorkerType,
        callback: Callable[[ScheduledJob], Any],
    ) -> None:
        """Register a worker callback for a job type."""
        self._job_callbacks[worker_type] = callback
        logger.info(f"Registered worker callback for {worker_type.value}")
    
    async def schedule(
        self,
        worker_type: WorkerType,
        payload: Dict[str, Any],
        priority: JobPriority = JobPriority.NORMAL,
        user_id: Optional[str] = None,
        delay_seconds: int = 0,
        max_retries: int = 3,
        timeout_seconds: int = 300,
        correlation_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        dedupe_key: Optional[str] = None,
    ) -> str:
        """
        Schedule a job for execution.
        
        Args:
            worker_type: Type of worker to handle this job
            payload: Job payload data
            priority: Job priority level
            user_id: User who triggered the job
            delay_seconds: Delay before execution
            max_retries: Maximum retry attempts
            timeout_seconds: Job timeout
            correlation_id: ID for tracking related jobs
            metadata: Additional metadata
            dedupe_key: Key for deduplication (prevents duplicate jobs)
            
        Returns:
            Job ID
        """
        # Check deduplication
        if dedupe_key:
            existing = await self._check_dedupe(dedupe_key)
            if existing:
                logger.info(f"Deduplicated job: {dedupe_key} -> {existing}")
                return existing
        
        # Check rate limit
        if not await self._check_rate_limit(worker_type, user_id):
            raise RateLimitExceededError(
                f"Rate limit exceeded for {worker_type.value}"
            )
        
        # Create job
        job_id = str(uuid.uuid4())
        execute_after = None
        if delay_seconds > 0:
            execute_after = datetime.utcnow() + timedelta(seconds=delay_seconds)
        
        job = ScheduledJob(
            job_id=job_id,
            worker_type=worker_type,
            priority=priority,
            payload=payload,
            execute_after=execute_after,
            max_retries=max_retries,
            timeout_seconds=timeout_seconds,
            user_id=user_id,
            correlation_id=correlation_id or job_id,
            metadata=metadata or {},
        )
        
        # Store job data
        await self._store_job(job)
        
        # Add to priority queue
        await self._enqueue(job)
        
        # Track dedupe key
        if dedupe_key:
            await self._set_dedupe(dedupe_key, job_id)
        
        # Record metric
        await self._record_scheduled(job)
        
        logger.info(
            f"Scheduled job: id={job_id}, type={worker_type.value}, "
            f"priority={priority.name}, delay={delay_seconds}s"
        )
        
        return job_id
    
    async def cancel(self, job_id: str) -> bool:
        """Cancel a scheduled job."""
        job_data = await self._get_job(job_id)
        if not job_data:
            return False
        
        status = job_data.get("status")
        if status in [JobStatus.COMPLETED.value, JobStatus.FAILED.value]:
            return False  # Can't cancel finished jobs
        
        await self._update_job_status(job_id, JobStatus.CANCELLED)
        await self._remove_from_queue(job_id, job_data.get("worker_type"))
        
        logger.info(f"Cancelled job: {job_id}")
        return True
    
    async def retry(self, job_id: str) -> bool:
        """Retry a failed job."""
        job_data = await self._get_job(job_id)
        if not job_data:
            return False
        
        retry_count = job_data.get("retry_count", 0)
        max_retries = job_data.get("max_retries", 3)
        
        if retry_count >= max_retries:
            logger.warning(f"Max retries exceeded for job: {job_id}")
            return False
        
        # Update retry count
        job_data["retry_count"] = retry_count + 1
        job_data["status"] = JobStatus.RETRYING.value
        
        # Calculate backoff delay
        delay = job_data.get("retry_delay_seconds", 60) * (2 ** retry_count)
        job_data["execute_after"] = (
            datetime.utcnow() + timedelta(seconds=delay)
        ).isoformat()
        
        await self._store_job_data(job_id, job_data)
        await self._enqueue_from_data(job_data)
        
        logger.info(f"Retrying job: {job_id}, attempt={retry_count + 1}, delay={delay}s")
        return True
    
    async def get_queue_depth(self, worker_type: WorkerType) -> int:
        """Get the number of jobs waiting in a queue."""
        queue_key = f"orchestrator:queue:{worker_type.value}"
        return self.redis.zcard(queue_key)
    
    async def get_job_status(self, job_id: str) -> Optional[JobStatus]:
        """Get the current status of a job."""
        job_data = await self._get_job(job_id)
        if not job_data:
            return None
        return JobStatus(job_data.get("status", JobStatus.PENDING.value))
    
    # =========================================================================
    # Internal Methods
    # =========================================================================
    
    async def _check_rate_limit(
        self,
        worker_type: WorkerType,
        user_id: Optional[str],
    ) -> bool:
        """Check if rate limit allows this job."""
        limit = self.rate_limits.get(worker_type, 100)
        
        # Global rate limit for worker type
        global_key = f"orchestrator:rate:{worker_type.value}"
        current = self.redis.incr(global_key)
        if current == 1:
            self.redis.expire(global_key, 60)  # 1 minute window
        
        if current > limit:
            return False
        
        # Per-user rate limit (if user_id provided)
        if user_id:
            user_key = f"orchestrator:rate:{worker_type.value}:{user_id}"
            user_limit = limit // 2  # Half the global limit per user
            user_current = self.redis.incr(user_key)
            if user_current == 1:
                self.redis.expire(user_key, 60)
            
            if user_current > user_limit:
                return False
        
        return True
    
    async def _check_dedupe(self, dedupe_key: str) -> Optional[str]:
        """Check if a job with this dedupe key already exists."""
        key = f"orchestrator:dedupe:{dedupe_key}"
        return self.redis.get(key)
    
    async def _set_dedupe(self, dedupe_key: str, job_id: str) -> None:
        """Set dedupe key with TTL."""
        key = f"orchestrator:dedupe:{dedupe_key}"
        self.redis.setex(key, 3600, job_id)  # 1 hour TTL
    
    async def _store_job(self, job: ScheduledJob) -> None:
        """Store job data in Redis."""
        job_data = {
            "job_id": job.job_id,
            "worker_type": job.worker_type.value,
            "priority": job.priority.value,
            "payload": job.payload,
            "status": JobStatus.SCHEDULED.value,
            "scheduled_at": job.scheduled_at.isoformat(),
            "execute_after": job.execute_after.isoformat() if job.execute_after else None,
            "max_retries": job.max_retries,
            "retry_count": job.retry_count,
            "retry_delay_seconds": job.retry_delay_seconds,
            "timeout_seconds": job.timeout_seconds,
            "user_id": job.user_id,
            "correlation_id": job.correlation_id,
            "metadata": job.metadata,
        }
        await self._store_job_data(job.job_id, job_data)
    
    async def _store_job_data(self, job_id: str, data: Dict[str, Any]) -> None:
        """Store raw job data."""
        import json
        key = f"orchestrator:job:{job_id}"
        self.redis.setex(key, 86400 * 7, json.dumps(data))  # 7 day TTL
    
    async def _get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job data from Redis."""
        import json
        key = f"orchestrator:job:{job_id}"
        data = self.redis.get(key)
        if data:
            return json.loads(data)
        return None
    
    async def _enqueue(self, job: ScheduledJob) -> None:
        """Add job to priority queue."""
        queue_key = f"orchestrator:queue:{job.worker_type.value}"
        
        # Score = priority * 1e12 + timestamp (lower = higher priority)
        if job.execute_after:
            timestamp = job.execute_after.timestamp()
        else:
            timestamp = time.time()
        
        score = job.priority.value * 1e12 + timestamp
        self.redis.zadd(queue_key, {job.job_id: score})
    
    async def _enqueue_from_data(self, job_data: Dict[str, Any]) -> None:
        """Add job to queue from raw data."""
        queue_key = f"orchestrator:queue:{job_data['worker_type']}"
        
        priority = job_data.get("priority", JobPriority.NORMAL.value)
        execute_after = job_data.get("execute_after")
        
        if execute_after:
            timestamp = datetime.fromisoformat(execute_after).timestamp()
        else:
            timestamp = time.time()
        
        score = priority * 1e12 + timestamp
        self.redis.zadd(queue_key, {job_data["job_id"]: score})
    
    async def _remove_from_queue(
        self,
        job_id: str,
        worker_type: Optional[str],
    ) -> None:
        """Remove job from queue."""
        if worker_type:
            queue_key = f"orchestrator:queue:{worker_type}"
            self.redis.zrem(queue_key, job_id)
    
    async def _update_job_status(self, job_id: str, status: JobStatus) -> None:
        """Update job status."""
        job_data = await self._get_job(job_id)
        if job_data:
            job_data["status"] = status.value
            await self._store_job_data(job_id, job_data)
    
    async def _record_scheduled(self, job: ScheduledJob) -> None:
        """Record job scheduled metric."""
        # This will be picked up by the reporter
        metric_key = f"orchestrator:metrics:scheduled:{job.worker_type.value}"
        self.redis.incr(metric_key)
        self.redis.expire(metric_key, 3600)  # 1 hour window


class RateLimitExceededError(Exception):
    """Raised when rate limit is exceeded."""
    pass
