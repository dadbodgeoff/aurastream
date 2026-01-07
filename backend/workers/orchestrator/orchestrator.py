"""
Enterprise-Grade Head Orchestrator for AuraStream Workers.

The Head Orchestrator is the conductor of the worker symphony - it ensures
all 15 workers operate in harmony, handles failures gracefully, and keeps
the system running no matter what.

Architecture:
    ┌─────────────────────────────────────────────────────────────────┐
    │                    HEAD ORCHESTRATOR                            │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
    │  │  Scheduler  │  │  Reporter   │  │   Anomaly Detector      │ │
    │  │  (Cron)     │  │  (Scores)   │  │   (Pattern Matching)    │ │
    │  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
    │         │                │                     │               │
    │  ┌──────▼────────────────▼─────────────────────▼─────────────┐ │
    │  │                   Health Monitor                          │ │
    │  │   (Heartbeats, Circuit Breakers, Recovery Actions)        │ │
    │  └───────────────────────────────────────────────────────────┘ │
    └─────────────────────────────────────────────────────────────────┘

The 15 Workers Managed:
    DATA COLLECTION (3):
        1. youtube_worker - YouTube trending/games data (30min/daily)
        2. twitch_streams_worker - Twitch stream data (15min)
        3. clip_radar_worker - Viral clip detection (5min)
    
    INTELLIGENCE (2):
        4. creator_intel_worker - Content intelligence (4hr)
        5. thumbnail_intel_worker - Thumbnail analysis (daily)
    
    AGGREGATION (1 with 2 modes):
        6. intel_aggregation_worker - Hourly + Daily rollup
    
    GENERATION (3 - RQ Queue based):
        7. generation_worker - Asset generation (on-demand)
        8. twitch_worker - Twitch asset generation (on-demand)
        9. alert_animation_worker - Depth maps + animation exports (on-demand)
    
    REPORTING (1):
        10. playbook_worker - Algorithmic playbook (4hr)
    
    MAINTENANCE (3):
        11. analytics_flush_worker - Redis→PostgreSQL (hourly)
        12. coach_cleanup_worker - Session cleanup (hourly)
        13. clip_radar_recap_worker - Daily compression (daily)
    
    META (2):
        14. intel/orchestrator - Sub-orchestrator for intel
        15. graceful_shutdown - Utility module

Usage:
    from backend.workers.orchestrator import get_orchestrator
    
    orchestrator = await get_orchestrator()
    await orchestrator.start()
"""

import asyncio
import json
import logging
import os
import signal
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Coroutine, Dict, List, Optional

import redis.asyncio as redis

from backend.services.distributed_lock import DistributedLock, worker_lock

from .types import (
    JobPriority,
    WorkerType,
    AnomalyType,
)
from .anomaly import AnomalyDetector, AnomalyContext
from .health import HealthMonitor

logger = logging.getLogger(__name__)


class OrchestratorState(Enum):
    """Orchestrator lifecycle states."""
    INITIALIZING = "initializing"
    RUNNING = "running"
    DEGRADED = "degraded"
    RECOVERING = "recovering"
    STOPPING = "stopping"
    STOPPED = "stopped"


class WorkerExecutionMode(Enum):
    """How a worker is executed."""
    SCHEDULED = "scheduled"      # Orchestrator triggers on schedule
    ON_DEMAND = "on_demand"      # RQ queue, orchestrator monitors only
    CONTINUOUS = "continuous"    # Worker runs its own loop


@dataclass
class WorkerConfig:
    """Configuration for a managed worker."""
    name: str
    worker_type: WorkerType
    execution_mode: WorkerExecutionMode
    
    # Scheduling (for SCHEDULED mode)
    interval_seconds: Optional[int] = None
    cron_hour: Optional[int] = None      # For daily jobs
    cron_minute: Optional[int] = None    # For hourly jobs
    
    # Execution
    timeout_seconds: int = 300
    max_retries: int = 3
    retry_delay_seconds: int = 60
    priority: JobPriority = JobPriority.NORMAL
    
    # Health
    max_consecutive_failures: int = 5
    expected_duration_ms: int = 60000
    
    # Dependencies
    depends_on: List[str] = field(default_factory=list)
    blocks: List[str] = field(default_factory=list)
    
    # Handler (for SCHEDULED mode)
    handler: Optional[Callable[[], Coroutine[Any, Any, Dict[str, Any]]]] = None
    
    # Runtime state
    last_run: Optional[datetime] = None
    last_success: Optional[datetime] = None
    last_error: Optional[str] = None
    consecutive_failures: int = 0
    is_running: bool = False
    is_enabled: bool = True


@dataclass 
class WorkerScoreReport:
    """Score report from a worker execution."""
    worker_name: str
    execution_id: str
    started_at: datetime
    completed_at: datetime
    
    # Core metrics
    success: bool
    duration_ms: int
    error: Optional[str] = None
    
    # Scoring (0-100)
    reliability_score: float = 100.0
    performance_score: float = 100.0
    data_quality_score: float = 100.0
    resource_score: float = 100.0
    overall_score: float = 100.0
    
    # Issues
    anomalies: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    
    # Raw metrics
    metrics: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "worker_name": self.worker_name,
            "execution_id": self.execution_id,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat(),
            "success": self.success,
            "duration_ms": self.duration_ms,
            "error": self.error,
            "reliability_score": self.reliability_score,
            "performance_score": self.performance_score,
            "data_quality_score": self.data_quality_score,
            "resource_score": self.resource_score,
            "overall_score": self.overall_score,
            "anomalies": self.anomalies,
            "recommendations": self.recommendations,
            "metrics": self.metrics,
        }


class HeadOrchestrator:
    """
    Enterprise-grade head orchestrator for all AuraStream workers.
    
    Responsibilities:
    1. Schedule and execute workers based on intervals/cron
    2. Receive and process score reports from workers
    3. Detect anomalies and trigger alerts
    4. Execute recovery actions when failures occur
    5. Ensure system resilience - the system NEVER stops
    
    Key Principles:
    - Distributed locking prevents duplicate execution
    - Circuit breakers prevent cascade failures
    - Automatic retry with exponential backoff
    - Dependency management between workers
    - Self-healing with configurable recovery strategies
    """
    
    # Redis key prefixes
    KEY_PREFIX = "orchestrator:head:"
    WORKER_STATE_KEY = f"{KEY_PREFIX}worker:"
    METRICS_KEY = f"{KEY_PREFIX}metrics"
    SCORE_KEY = f"{KEY_PREFIX}scores:"
    LEADER_KEY = f"{KEY_PREFIX}leader"
    
    # Timing
    TICK_INTERVAL_SECONDS = 10
    HEALTH_CHECK_INTERVAL_SECONDS = 60
    LEADER_LEASE_SECONDS = 30
    
    def __init__(self, redis_url: Optional[str] = None):
        self._redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self._redis: Optional[redis.Redis] = None
        self._lock = DistributedLock(self._redis_url)
        
        # Components
        self._anomaly_detector = AnomalyDetector()
        self._health_monitor = HealthMonitor()
        
        # State
        self._workers: Dict[str, WorkerConfig] = {}
        self._state = OrchestratorState.INITIALIZING
        self._shutdown_event = asyncio.Event()
        self._instance_id = str(uuid.uuid4())[:8]
        self._is_leader = False
        self._started_at: Optional[datetime] = None
        
        # Metrics
        self._total_executions = 0
        self._successful_executions = 0
        self._failed_executions = 0
        
        # Recovery strategies
        self._recovery_strategies: Dict[AnomalyType, Callable] = {}
        
        logger.info(f"HeadOrchestrator initialized: instance_id={self._instance_id}")
    
    async def _get_redis(self) -> redis.Redis:
        """Get or create Redis client."""
        if self._redis is None:
            self._redis = redis.from_url(self._redis_url, decode_responses=True)
        return self._redis
    
    # =========================================================================
    # Worker Registration
    # =========================================================================
    
    def _register_all_workers(self) -> None:
        """Register all 14 AuraStream workers with their configurations."""
        
        # =====================================================================
        # DATA COLLECTION WORKERS (3)
        # =====================================================================
        
        # 1. YouTube Worker - Trending every 30min, Games daily at 5am UTC
        self._workers["youtube_worker"] = WorkerConfig(
            name="youtube_worker",
            worker_type=WorkerType.INTEL,
            execution_mode=WorkerExecutionMode.CONTINUOUS,
            interval_seconds=30 * 60,
            timeout_seconds=600,
            expected_duration_ms=120000,
            priority=JobPriority.HIGH,
            blocks=["playbook_worker", "creator_intel_worker"],
        )
        
        # 2. Twitch Streams Worker - Every 15 minutes
        self._workers["twitch_streams_worker"] = WorkerConfig(
            name="twitch_streams_worker",
            worker_type=WorkerType.INTEL,
            execution_mode=WorkerExecutionMode.CONTINUOUS,
            interval_seconds=15 * 60,
            timeout_seconds=300,
            expected_duration_ms=60000,
            priority=JobPriority.HIGH,
            blocks=["playbook_worker"],
        )
        
        # 3. Clip Radar Worker - Every 5 minutes
        self._workers["clip_radar_worker"] = WorkerConfig(
            name="clip_radar_worker",
            worker_type=WorkerType.INTEL,
            execution_mode=WorkerExecutionMode.CONTINUOUS,
            interval_seconds=5 * 60,
            timeout_seconds=240,
            expected_duration_ms=30000,
            priority=JobPriority.NORMAL,
            blocks=["clip_radar_recap_worker"],
        )
        
        # =====================================================================
        # INTELLIGENCE WORKERS (2)
        # =====================================================================
        
        # 4. Creator Intel Worker - Every 4 hours
        self._workers["creator_intel_worker"] = WorkerConfig(
            name="creator_intel_worker",
            worker_type=WorkerType.INTEL,
            execution_mode=WorkerExecutionMode.CONTINUOUS,
            interval_seconds=4 * 3600,
            timeout_seconds=1800,
            expected_duration_ms=600000,
            priority=JobPriority.HIGH,
            depends_on=["youtube_worker"],
            blocks=["intel_aggregation_hourly"],
        )
        
        # 5. Thumbnail Intel Worker - Daily at 11am UTC (6am EST)
        self._workers["thumbnail_intel_worker"] = WorkerConfig(
            name="thumbnail_intel_worker",
            worker_type=WorkerType.THUMBNAIL,
            execution_mode=WorkerExecutionMode.CONTINUOUS,
            cron_hour=11,
            cron_minute=0,
            timeout_seconds=1800,
            expected_duration_ms=900000,
            priority=JobPriority.LOW,
        )
        
        # =====================================================================
        # AGGREGATION WORKER (1 with 2 modes)
        # =====================================================================
        
        # 6a. Intel Aggregation - Hourly at :05
        self._workers["intel_aggregation_hourly"] = WorkerConfig(
            name="intel_aggregation_hourly",
            worker_type=WorkerType.INTEL,
            execution_mode=WorkerExecutionMode.SCHEDULED,
            cron_minute=5,
            timeout_seconds=300,
            expected_duration_ms=60000,
            priority=JobPriority.NORMAL,
            depends_on=["creator_intel_worker"],
            handler=self._run_intel_aggregation_hourly,
        )
        
        # 6b. Intel Aggregation - Daily at 00:15 UTC
        self._workers["intel_aggregation_daily"] = WorkerConfig(
            name="intel_aggregation_daily",
            worker_type=WorkerType.INTEL,
            execution_mode=WorkerExecutionMode.SCHEDULED,
            cron_hour=0,
            cron_minute=15,
            timeout_seconds=600,
            expected_duration_ms=120000,
            priority=JobPriority.LOW,
            handler=self._run_intel_aggregation_daily,
        )
        
        # =====================================================================
        # GENERATION WORKERS (3 - RQ Queue based)
        # =====================================================================
        
        # 7. Generation Worker - On-demand via RQ
        self._workers["generation_worker"] = WorkerConfig(
            name="generation_worker",
            worker_type=WorkerType.GENERATION,
            execution_mode=WorkerExecutionMode.ON_DEMAND,
            timeout_seconds=300,
            expected_duration_ms=30000,
            priority=JobPriority.CRITICAL,
        )
        
        # 8. Twitch Worker - On-demand via RQ
        self._workers["twitch_worker"] = WorkerConfig(
            name="twitch_worker",
            worker_type=WorkerType.GENERATION,
            execution_mode=WorkerExecutionMode.ON_DEMAND,
            timeout_seconds=600,
            expected_duration_ms=60000,
            priority=JobPriority.CRITICAL,
        )
        
        # 9. Alert Animation Worker - On-demand via RQ (depth maps + exports)
        self._workers["alert_animation_worker"] = WorkerConfig(
            name="alert_animation_worker",
            worker_type=WorkerType.GENERATION,
            execution_mode=WorkerExecutionMode.ON_DEMAND,
            timeout_seconds=300,
            expected_duration_ms=10000,  # Depth maps are fast (~2-3s)
            priority=JobPriority.HIGH,
        )
        
        # =====================================================================
        # REPORTING WORKER (1)
        # =====================================================================
        
        # 9. Playbook Worker - Every 4 hours
        self._workers["playbook_worker"] = WorkerConfig(
            name="playbook_worker",
            worker_type=WorkerType.INTEL,
            execution_mode=WorkerExecutionMode.CONTINUOUS,
            interval_seconds=4 * 3600,
            timeout_seconds=600,
            expected_duration_ms=180000,
            priority=JobPriority.NORMAL,
            depends_on=["youtube_worker", "twitch_streams_worker"],
        )
        
        # =====================================================================
        # MAINTENANCE WORKERS (3)
        # =====================================================================
        
        # 10. Analytics Flush Worker - Every hour at :00
        self._workers["analytics_flush_worker"] = WorkerConfig(
            name="analytics_flush_worker",
            worker_type=WorkerType.ANALYTICS,
            execution_mode=WorkerExecutionMode.SCHEDULED,
            cron_minute=0,
            timeout_seconds=600,
            expected_duration_ms=60000,
            priority=JobPriority.NORMAL,
            handler=self._run_analytics_flush,
        )
        
        # 11. Coach Cleanup Worker - Every hour at :00
        self._workers["coach_cleanup_worker"] = WorkerConfig(
            name="coach_cleanup_worker",
            worker_type=WorkerType.ANALYTICS,
            execution_mode=WorkerExecutionMode.SCHEDULED,
            cron_minute=0,
            timeout_seconds=300,
            expected_duration_ms=30000,
            priority=JobPriority.LOW,
            handler=self._run_coach_cleanup,
        )
        
        # 12. Clip Radar Recap Worker - Daily at 6am UTC
        self._workers["clip_radar_recap_worker"] = WorkerConfig(
            name="clip_radar_recap_worker",
            worker_type=WorkerType.INTEL,
            execution_mode=WorkerExecutionMode.SCHEDULED,
            cron_hour=6,
            cron_minute=0,
            timeout_seconds=3600,
            expected_duration_ms=300000,
            priority=JobPriority.LOW,
            depends_on=["clip_radar_worker"],
            handler=self._run_clip_radar_recap,
        )
        
        # =====================================================================
        # SSE STREAM GUARDIAN (1)
        # =====================================================================
        
        # 13. SSE Stream Guardian - Every 10 seconds
        self._workers["sse_guardian"] = WorkerConfig(
            name="sse_guardian",
            worker_type=WorkerType.SSE,
            execution_mode=WorkerExecutionMode.SCHEDULED,
            interval_seconds=10,
            timeout_seconds=30,
            expected_duration_ms=5000,
            priority=JobPriority.HIGH,
            handler=self._run_sse_guardian,
        )
        
        # Register all workers with health monitor
        for name, config in self._workers.items():
            self._health_monitor.register_worker(
                worker_name=name,
                worker_type=config.worker_type,
                expected_duration_ms=config.expected_duration_ms,
            )
        
        logger.info(f"Registered {len(self._workers)} workers")

    # =========================================================================
    # Main Loop
    # =========================================================================
    
    async def start(self) -> None:
        """Start the head orchestrator."""
        self._state = OrchestratorState.INITIALIZING
        self._started_at = datetime.now(timezone.utc)
        
        logger.info("=" * 70)
        logger.info("HEAD ORCHESTRATOR STARTING")
        logger.info("=" * 70)
        logger.info(f"Instance ID: {self._instance_id}")
        logger.info(f"Redis URL: {self._redis_url.split('@')[-1]}")
        
        # Register workers
        self._register_all_workers()
        
        # Setup signal handlers
        loop = asyncio.get_event_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            try:
                loop.add_signal_handler(sig, self._handle_shutdown)
            except NotImplementedError:
                pass  # Windows
        
        # Load state from Redis
        await self._load_state()
        
        # Try to become leader
        await self._try_become_leader()
        
        self._state = OrchestratorState.RUNNING
        logger.info("Head Orchestrator is now RUNNING")
        
        # Persist initial state immediately
        await self._persist_state()
        
        # Main loop
        while not self._shutdown_event.is_set():
            try:
                await self._tick()
            except Exception as e:
                logger.error(f"Error in orchestrator tick: {e}")
                self._state = OrchestratorState.DEGRADED
            
            await asyncio.sleep(self.TICK_INTERVAL_SECONDS)
        
        # Graceful shutdown
        await self._graceful_shutdown()
    
    async def _tick(self) -> None:
        """Single tick of the orchestrator loop."""
        now = datetime.now(timezone.utc)
        
        # Renew leader lease
        if self._is_leader:
            await self._renew_leader_lease()
        else:
            await self._try_become_leader()
            if not self._is_leader:
                return  # Not leader, skip execution
        
        # Check scheduled workers
        for name, config in self._workers.items():
            if not config.is_enabled or config.is_running:
                continue
            
            if config.execution_mode == WorkerExecutionMode.SCHEDULED:
                if self._should_run(config, now):
                    asyncio.create_task(self._execute_worker(config))
        
        # Health check (every minute)
        if now.second < self.TICK_INTERVAL_SECONDS:
            await self._run_health_check()
        
        # Persist state periodically
        if now.minute % 5 == 0 and now.second < self.TICK_INTERVAL_SECONDS:
            await self._persist_state()
    
    def _should_run(self, config: WorkerConfig, now: datetime) -> bool:
        """Check if a scheduled worker should run."""
        # Check dependencies
        for dep_name in config.depends_on:
            dep = self._workers.get(dep_name)
            if dep and dep.is_running:
                return False  # Dependency still running
        
        # Check if blocked by another worker
        for other_name, other in self._workers.items():
            if config.name in other.blocks and other.is_running:
                return False
        
        # Cron-style scheduling
        if config.cron_hour is not None:
            # Daily job
            if now.hour != config.cron_hour:
                return False
            if config.cron_minute is not None and now.minute != config.cron_minute:
                return False
            # Check if already ran today
            if config.last_run and config.last_run.date() == now.date():
                return False
            return True
        
        if config.cron_minute is not None:
            # Hourly job at specific minute
            if now.minute != config.cron_minute:
                return False
            # Check if already ran this hour
            if config.last_run:
                if config.last_run.hour == now.hour and config.last_run.date() == now.date():
                    return False
            return True
        
        # Interval-based scheduling
        if config.interval_seconds:
            if config.last_run is None:
                return True
            elapsed = (now - config.last_run).total_seconds()
            return elapsed >= config.interval_seconds
        
        return False
    
    # =========================================================================
    # Worker Execution
    # =========================================================================
    
    async def _execute_worker(self, config: WorkerConfig) -> WorkerScoreReport:
        """Execute a scheduled worker and generate score report."""
        execution_id = str(uuid.uuid4())[:8]
        started_at = datetime.now(timezone.utc)
        
        logger.info(f"Executing worker: {config.name} (exec_id={execution_id})")
        
        config.is_running = True
        config.last_run = started_at
        
        await self._health_monitor.record_execution_start(config.name, execution_id)
        
        result = {"success": False, "error": None, "metrics": {}}
        
        try:
            # Acquire distributed lock
            async with worker_lock(
                "orchestrator",
                config.name,
                timeout=config.timeout_seconds + 60,
                raise_on_failure=False,
            ) as acquired:
                if not acquired:
                    logger.info(f"Worker {config.name} already running elsewhere, skipping")
                    result = {"success": True, "skipped": True, "reason": "lock_held"}
                elif config.handler:
                    # Execute with timeout
                    try:
                        result = await asyncio.wait_for(
                            config.handler(),
                            timeout=config.timeout_seconds,
                        )
                        result["success"] = result.get("success", not result.get("error"))
                    except asyncio.TimeoutError:
                        result = {"success": False, "error": "Timeout"}
                else:
                    result = {"success": False, "error": "No handler configured"}
        
        except Exception as e:
            result = {"success": False, "error": str(e)}
            logger.exception(f"Worker {config.name} failed: {e}")
        
        finally:
            config.is_running = False
        
        completed_at = datetime.now(timezone.utc)
        duration_ms = int((completed_at - started_at).total_seconds() * 1000)
        
        # Update state
        if result.get("success"):
            config.last_success = completed_at
            config.last_error = None
            config.consecutive_failures = 0
            self._successful_executions += 1
        else:
            config.last_error = result.get("error")
            config.consecutive_failures += 1
            self._failed_executions += 1
        
        self._total_executions += 1
        
        # Record with health monitor
        await self._health_monitor.record_execution_complete(
            config.name, execution_id, result.get("success", False), duration_ms
        )
        
        # Generate score report
        score_report = self._generate_score_report(
            config, execution_id, started_at, completed_at, duration_ms, result
        )
        
        # Check for anomalies
        await self._check_anomalies(config, score_report)
        
        # Store score report
        await self._store_score_report(score_report)
        
        logger.info(
            f"Worker {config.name} completed: success={result.get('success')}, "
            f"duration={duration_ms}ms, score={score_report.overall_score:.1f}"
        )
        
        return score_report
    
    def _generate_score_report(
        self,
        config: WorkerConfig,
        execution_id: str,
        started_at: datetime,
        completed_at: datetime,
        duration_ms: int,
        result: Dict[str, Any],
    ) -> WorkerScoreReport:
        """Generate a score report for a worker execution."""
        success = result.get("success", False)
        
        # Reliability score (did it succeed?)
        reliability_score = 100.0 if success else 0.0
        
        # Performance score (was it fast enough?)
        expected_ms = config.expected_duration_ms
        if duration_ms <= expected_ms:
            performance_score = 100.0
        elif duration_ms <= expected_ms * 1.5:
            performance_score = 80.0
        elif duration_ms <= expected_ms * 2:
            performance_score = 50.0
        else:
            performance_score = max(0, 100 - (duration_ms / expected_ms - 1) * 50)
        
        # Data quality score (from result metrics)
        data_quality_score = 100.0
        if result.get("partial_success"):
            data_quality_score = 70.0
        if result.get("data_issues"):
            data_quality_score = 50.0
        
        # Resource score (placeholder - would need actual metrics)
        resource_score = 100.0
        
        # Overall score (weighted)
        weights = {"reliability": 0.4, "performance": 0.3, "data_quality": 0.2, "resource": 0.1}
        overall_score = (
            reliability_score * weights["reliability"] +
            performance_score * weights["performance"] +
            data_quality_score * weights["data_quality"] +
            resource_score * weights["resource"]
        )
        
        # Recommendations
        recommendations = []
        if not success:
            recommendations.append(f"Investigate failure: {result.get('error')}")
        if duration_ms > expected_ms * 1.5:
            recommendations.append(f"Optimize performance - took {duration_ms}ms (expected {expected_ms}ms)")
        if config.consecutive_failures > 2:
            recommendations.append(f"High failure rate - {config.consecutive_failures} consecutive failures")
        
        return WorkerScoreReport(
            worker_name=config.name,
            execution_id=execution_id,
            started_at=started_at,
            completed_at=completed_at,
            success=success,
            duration_ms=duration_ms,
            error=result.get("error"),
            reliability_score=reliability_score,
            performance_score=performance_score,
            data_quality_score=data_quality_score,
            resource_score=resource_score,
            overall_score=overall_score,
            recommendations=recommendations,
            metrics=result.get("metrics", {}),
        )
    
    async def _check_anomalies(
        self,
        config: WorkerConfig,
        score_report: WorkerScoreReport,
    ) -> None:
        """Check for anomalies after worker execution."""
        context = AnomalyContext(
            worker_name=config.name,
            worker_type=config.worker_type,
            execution_id=score_report.execution_id,
            metrics={
                "success": score_report.success,
                "duration_ms": score_report.duration_ms,
                "expected_duration_ms": config.expected_duration_ms,
                "consecutive_failures": config.consecutive_failures,
                "failure_rate": config.consecutive_failures / max(self._total_executions, 1),
                "error": score_report.error,
            },
        )
        
        anomalies = self._anomaly_detector.check(context)
        
        for anomaly in anomalies:
            score_report.anomalies.append(anomaly.message)
            
            # Execute recovery if available
            if anomaly.anomaly_type in self._recovery_strategies:
                try:
                    await self._recovery_strategies[anomaly.anomaly_type](config, anomaly)
                except Exception as e:
                    logger.error(f"Recovery strategy failed: {e}")

    # =========================================================================
    # Worker Handlers (for SCHEDULED mode workers)
    # =========================================================================
    
    async def _run_analytics_flush(self) -> Dict[str, Any]:
        """Run analytics flush worker."""
        from backend.workers.analytics_flush_worker import run_flush
        from backend.workers.execution_report import (
            create_report,
            submit_execution_report,
            ExecutionOutcome,
        )
        
        report = create_report("analytics_flush_worker")
        
        try:
            result = run_flush(force=False)
            
            # Fill in data verification
            report.data_verification.records_fetched = result.get("events_fetched", 0)
            report.data_verification.records_processed = result.get("events_flushed", 0)
            report.data_verification.records_stored = result.get("events_flushed", 0)
            report.data_verification.cache_writes = result.get("asset_types_updated", 0)
            
            # Custom metrics
            report.custom_metrics = {
                "events_flushed": result.get("events_flushed", 0),
                "asset_types_updated": result.get("asset_types_updated", 0),
                "flush_duration_ms": result.get("duration_ms", 0),
            }
            
            if result.get("error"):
                report.outcome = ExecutionOutcome.FAILED
                report.error_message = result.get("error")
            else:
                report.outcome = ExecutionOutcome.SUCCESS
            
            submit_execution_report(report)
            
            return {
                "success": not result.get("error"),
                "error": result.get("error"),
                "metrics": report.custom_metrics,
            }
        except Exception as e:
            report.outcome = ExecutionOutcome.FAILED
            report.error_message = str(e)
            report.error_type = type(e).__name__
            submit_execution_report(report)
            return {"success": False, "error": str(e)}
    
    async def _run_coach_cleanup(self) -> Dict[str, Any]:
        """Run coach cleanup worker."""
        from backend.workers.coach_cleanup_worker import run_cleanup
        from backend.workers.execution_report import (
            create_report,
            submit_execution_report,
            ExecutionOutcome,
        )
        
        report = create_report("coach_cleanup_worker")
        
        try:
            result = run_cleanup(force=False, dry_run=False)
            
            # Fill in data verification
            report.data_verification.records_fetched = result.get("sessions_found", 0)
            report.data_verification.records_processed = result.get("sessions_cleaned", 0)
            report.data_verification.records_skipped = result.get("sessions_skipped", 0)
            
            # Custom metrics
            report.custom_metrics = {
                "sessions_cleaned": result.get("sessions_cleaned", 0),
                "sessions_skipped": result.get("sessions_skipped", 0),
                "sessions_found": result.get("sessions_found", 0),
            }
            
            if result.get("error"):
                report.outcome = ExecutionOutcome.FAILED
                report.error_message = result.get("error")
            else:
                report.outcome = ExecutionOutcome.SUCCESS
            
            submit_execution_report(report)
            
            return {
                "success": not result.get("error"),
                "error": result.get("error"),
                "metrics": report.custom_metrics,
            }
        except Exception as e:
            report.outcome = ExecutionOutcome.FAILED
            report.error_message = str(e)
            report.error_type = type(e).__name__
            submit_execution_report(report)
            return {"success": False, "error": str(e)}
    
    async def _run_clip_radar_recap(self) -> Dict[str, Any]:
        """Run clip radar recap worker."""
        from backend.workers.clip_radar_recap_worker import run_daily_recap
        from backend.workers.execution_report import (
            create_report,
            submit_execution_report,
            ExecutionOutcome,
        )
        
        report = create_report("clip_radar_recap_worker")
        
        try:
            result = await run_daily_recap()
            
            # Fill in data verification
            report.data_verification.records_fetched = result.get("total_clips_tracked", 0)
            report.data_verification.records_processed = result.get("total_clips_tracked", 0)
            report.data_verification.records_stored = result.get("recaps_created", 0)
            
            # Custom metrics
            report.custom_metrics = {
                "total_clips": result.get("total_clips_tracked", 0),
                "viral_clips": result.get("total_viral_clips", 0),
                "recaps_created": result.get("recaps_created", 0),
                "categories_processed": result.get("categories_processed", 0),
            }
            
            if result.get("error"):
                report.outcome = ExecutionOutcome.FAILED
                report.error_message = result.get("error")
            else:
                report.outcome = ExecutionOutcome.SUCCESS
            
            submit_execution_report(report)
            
            return {
                "success": not result.get("error"),
                "error": result.get("error"),
                "metrics": report.custom_metrics,
            }
        except Exception as e:
            report.outcome = ExecutionOutcome.FAILED
            report.error_message = str(e)
            report.error_type = type(e).__name__
            submit_execution_report(report)
            return {"success": False, "error": str(e)}
    
    async def _run_intel_aggregation_hourly(self) -> Dict[str, Any]:
        """Run hourly intel aggregation."""
        from backend.workers.intel_aggregation_worker import run_hourly_aggregation, get_redis_client, get_supabase_db
        from backend.workers.execution_report import (
            create_report,
            submit_execution_report,
            ExecutionOutcome,
        )
        
        report = create_report("intel_aggregation_hourly")
        
        try:
            redis_client = await get_redis_client()
            db = get_supabase_db()
            result = await run_hourly_aggregation(redis_client, db)
            await redis_client.aclose()
            
            # Fill in data verification
            report.data_verification.records_processed = result.get("categories_aggregated", 0)
            report.data_verification.records_stored = result.get("categories_aggregated", 0)
            
            # Custom metrics
            report.custom_metrics = {
                "categories_aggregated": result.get("categories_aggregated", 0),
                "data_points_processed": result.get("data_points_processed", 0),
            }
            
            if result.get("error"):
                report.outcome = ExecutionOutcome.FAILED
                report.error_message = result.get("error")
            elif result.get("success", False):
                report.outcome = ExecutionOutcome.SUCCESS
            else:
                report.outcome = ExecutionOutcome.PARTIAL_SUCCESS
            
            submit_execution_report(report)
            
            return {
                "success": result.get("success", False),
                "error": result.get("error"),
                "metrics": report.custom_metrics,
            }
        except Exception as e:
            report.outcome = ExecutionOutcome.FAILED
            report.error_message = str(e)
            report.error_type = type(e).__name__
            submit_execution_report(report)
            return {"success": False, "error": str(e)}
    
    async def _run_intel_aggregation_daily(self) -> Dict[str, Any]:
        """Run daily intel rollup."""
        from backend.workers.intel_aggregation_worker import run_daily_rollup, get_redis_client, get_supabase_db
        from backend.workers.execution_report import (
            create_report,
            submit_execution_report,
            ExecutionOutcome,
        )
        
        report = create_report("intel_aggregation_daily")
        
        try:
            redis_client = await get_redis_client()
            db = get_supabase_db()
            result = await run_daily_rollup(redis_client, db)
            await redis_client.aclose()
            
            # Fill in data verification
            report.data_verification.records_processed = result.get("categories_rolled_up", 0)
            report.data_verification.records_stored = result.get("categories_rolled_up", 0)
            
            # Custom metrics
            report.custom_metrics = {
                "categories_rolled_up": result.get("categories_rolled_up", 0),
                "days_aggregated": result.get("days_aggregated", 0),
            }
            
            if result.get("error"):
                report.outcome = ExecutionOutcome.FAILED
                report.error_message = result.get("error")
            elif result.get("success", False):
                report.outcome = ExecutionOutcome.SUCCESS
            else:
                report.outcome = ExecutionOutcome.PARTIAL_SUCCESS
            
            submit_execution_report(report)
            
            return {
                "success": result.get("success", False),
                "error": result.get("error"),
                "metrics": report.custom_metrics,
            }
        except Exception as e:
            report.outcome = ExecutionOutcome.FAILED
            report.error_message = str(e)
            report.error_type = type(e).__name__
            submit_execution_report(report)
            return {"success": False, "error": str(e)}
    
    async def _run_sse_guardian(self) -> Dict[str, Any]:
        """Run SSE stream guardian to detect orphaned streams."""
        from backend.workers.execution_report import (
            create_report,
            submit_execution_report,
            ExecutionOutcome,
        )
        
        report = create_report("sse_guardian")
        
        try:
            from backend.services.sse import get_stream_guardian
            guardian = get_stream_guardian()
            
            # Check for orphaned streams
            orphaned = await guardian.check_orphaned_streams()
            
            # Cleanup expired streams
            cleaned = await guardian.cleanup_expired()
            
            # Get health metrics
            metrics = await guardian.get_health_metrics()
            
            # Fill in data verification
            report.data_verification.records_fetched = metrics.get("active_count", 0)
            report.data_verification.records_processed = len(orphaned) + cleaned
            report.data_verification.records_stored = len([o for o in orphaned if o.state])  # Orphans with completion stored
            report.data_verification.records_skipped = metrics.get("healthy_count", 0)
            
            # Validation checks
            report.data_verification.validation_checks_passed = 1 if metrics.get("active_count", 0) >= 0 else 0
            
            # Custom metrics for SSE guardian
            report.custom_metrics = {
                "orphaned_streams": len(orphaned),
                "cleaned_streams": cleaned,
                "active_streams": metrics.get("active_count", 0),
                "stale_streams": metrics.get("stale_count", 0),
                "healthy_streams": metrics.get("healthy_count", 0),
                "orphan_rate": len(orphaned) / max(metrics.get("active_count", 1), 1),
                "orphaned_by_type": {},
            }
            
            # Count orphans by stream type
            for orphan in orphaned:
                stream_type = orphan.stream_type.value if orphan.stream_type else "unknown"
                report.custom_metrics["orphaned_by_type"][stream_type] = \
                    report.custom_metrics["orphaned_by_type"].get(stream_type, 0) + 1
            
            # Add recommendations if issues detected
            if len(orphaned) > 5:
                report.recommendations.append(
                    f"High orphan rate detected: {len(orphaned)} orphaned streams. "
                    "Consider investigating client disconnection patterns."
                )
            
            if metrics.get("stale_count", 0) > 10:
                report.recommendations.append(
                    f"Many stale streams ({metrics.get('stale_count', 0)}). "
                    "Check if heartbeat mechanism is working correctly."
                )
            
            report.outcome = ExecutionOutcome.SUCCESS
            
            # Submit the detailed report
            submit_execution_report(report)
            
            return {
                "success": True,
                "metrics": report.custom_metrics,
            }
            
        except Exception as e:
            logger.error(f"SSE guardian error: {e}")
            report.outcome = ExecutionOutcome.FAILED
            report.error_message = str(e)
            report.error_type = type(e).__name__
            submit_execution_report(report)
            return {"success": False, "error": str(e)}
    
    # =========================================================================
    # Health & Monitoring
    # =========================================================================
    
    async def _run_health_check(self) -> None:
        """Run periodic health check."""
        redis_client = await self._get_redis()
        
        # Ping Redis
        try:
            await redis_client.ping()
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            self._state = OrchestratorState.DEGRADED
            return
        
        # Check RQ queue depths for on-demand workers
        for name, config in self._workers.items():
            if config.execution_mode == WorkerExecutionMode.ON_DEMAND:
                try:
                    queue_key = f"rq:queue:{name.replace('_worker', '')}"
                    depth = await redis_client.llen(queue_key)
                    await self._health_monitor.record_heartbeat(
                        name, queue_depth=depth
                    )
                except Exception:
                    pass
        
        # Update health monitor timestamp
        self._health_monitor._workers.get("_orchestrator", None)
        
        # Store health summary
        summary = self._health_monitor.get_health_summary()
        await redis_client.setex(
            f"{self.KEY_PREFIX}health_summary",
            300,
            json.dumps(summary, default=str),
        )
        
        # Check for stuck jobs
        stuck = await self._health_monitor.check_stuck_jobs(timeout_seconds=600)
        if stuck:
            logger.warning(f"Found {len(stuck)} stuck jobs: {stuck}")
    
    # =========================================================================
    # State Persistence
    # =========================================================================
    
    async def _load_state(self) -> None:
        """Load orchestrator state from Redis."""
        redis_client = await self._get_redis()
        
        for name, config in self._workers.items():
            try:
                state_data = await redis_client.get(f"{self.WORKER_STATE_KEY}{name}")
                if state_data:
                    state = json.loads(state_data)
                    config.last_run = datetime.fromisoformat(state["last_run"]) if state.get("last_run") else None
                    config.last_success = datetime.fromisoformat(state["last_success"]) if state.get("last_success") else None
                    config.last_error = state.get("last_error")
                    config.consecutive_failures = state.get("consecutive_failures", 0)
            except Exception as e:
                logger.warning(f"Failed to load state for {name}: {e}")
    
    async def _persist_state(self) -> None:
        """Persist orchestrator state to Redis."""
        redis_client = await self._get_redis()
        
        for name, config in self._workers.items():
            state = {
                "last_run": config.last_run.isoformat() if config.last_run else None,
                "last_success": config.last_success.isoformat() if config.last_success else None,
                "last_error": config.last_error,
                "consecutive_failures": config.consecutive_failures,
                "is_enabled": config.is_enabled,
            }
            await redis_client.setex(
                f"{self.WORKER_STATE_KEY}{name}",
                86400,  # 24 hour TTL
                json.dumps(state),
            )
        
        # Store orchestrator metrics
        metrics = {
            "state": self._state.value,
            "instance_id": self._instance_id,
            "started_at": self._started_at.isoformat() if self._started_at else None,
            "total_executions": self._total_executions,
            "successful_executions": self._successful_executions,
            "failed_executions": self._failed_executions,
            "is_leader": self._is_leader,
        }
        await redis_client.setex(self.METRICS_KEY, 300, json.dumps(metrics))
    
    async def _store_score_report(self, report: WorkerScoreReport) -> None:
        """Store a score report in Redis."""
        redis_client = await self._get_redis()
        
        # Store individual report
        key = f"{self.SCORE_KEY}{report.worker_name}:{report.execution_id}"
        await redis_client.setex(key, 86400 * 7, json.dumps(report.to_dict()))
        
        # Add to recent reports list
        list_key = f"{self.SCORE_KEY}{report.worker_name}:recent"
        await redis_client.lpush(list_key, report.execution_id)
        await redis_client.ltrim(list_key, 0, 99)  # Keep last 100
        await redis_client.expire(list_key, 86400 * 7)
    
    # =========================================================================
    # Leader Election
    # =========================================================================
    
    async def _try_become_leader(self) -> bool:
        """Try to become the leader orchestrator."""
        redis_client = await self._get_redis()
        
        acquired = await redis_client.set(
            self.LEADER_KEY,
            self._instance_id,
            nx=True,
            ex=self.LEADER_LEASE_SECONDS,
        )
        
        if acquired:
            self._is_leader = True
            logger.info(f"Became leader: {self._instance_id}")
            # Persist state immediately after becoming leader
            await self._persist_state()
        else:
            current_leader = await redis_client.get(self.LEADER_KEY)
            self._is_leader = current_leader == self._instance_id
        
        return self._is_leader
    
    async def _renew_leader_lease(self) -> bool:
        """Renew leader lease."""
        redis_client = await self._get_redis()
        
        # Only renew if we're still the leader
        current = await redis_client.get(self.LEADER_KEY)
        if current != self._instance_id:
            self._is_leader = False
            return False
        
        await redis_client.expire(self.LEADER_KEY, self.LEADER_LEASE_SECONDS)
        return True
    
    # =========================================================================
    # Shutdown
    # =========================================================================
    
    def _handle_shutdown(self) -> None:
        """Handle shutdown signal."""
        logger.info("Shutdown signal received")
        self._shutdown_event.set()
    
    async def _graceful_shutdown(self) -> None:
        """Gracefully shutdown the orchestrator."""
        self._state = OrchestratorState.STOPPING
        logger.info("Initiating graceful shutdown...")
        
        # Wait for running workers
        running = [n for n, c in self._workers.items() if c.is_running]
        if running:
            logger.info(f"Waiting for {len(running)} workers to complete: {running}")
            for _ in range(30):  # Wait up to 30 seconds
                running = [n for n, c in self._workers.items() if c.is_running]
                if not running:
                    break
                await asyncio.sleep(1)
        
        # Persist final state
        await self._persist_state()
        
        # Release leader lock
        if self._is_leader:
            redis_client = await self._get_redis()
            await redis_client.delete(self.LEADER_KEY)
        
        # Close connections
        if self._redis:
            await self._redis.aclose()
        await self._lock.close()
        
        self._state = OrchestratorState.STOPPED
        logger.info("Head Orchestrator shutdown complete")
    
    # =========================================================================
    # API Methods
    # =========================================================================
    
    def get_status(self) -> Dict[str, Any]:
        """Get orchestrator status for API."""
        uptime = 0
        if self._started_at:
            uptime = (datetime.now(timezone.utc) - self._started_at).total_seconds()
        
        return {
            "state": self._state.value,
            "instance_id": self._instance_id,
            "is_leader": self._is_leader,
            "uptime_seconds": int(uptime),
            "total_executions": self._total_executions,
            "successful_executions": self._successful_executions,
            "failed_executions": self._failed_executions,
            "success_rate": self._successful_executions / max(self._total_executions, 1),
            "workers": {
                name: {
                    "type": config.worker_type.value,
                    "mode": config.execution_mode.value,
                    "enabled": config.is_enabled,
                    "running": config.is_running,
                    "last_run": config.last_run.isoformat() if config.last_run else None,
                    "last_success": config.last_success.isoformat() if config.last_success else None,
                    "last_error": config.last_error,
                    "consecutive_failures": config.consecutive_failures,
                }
                for name, config in self._workers.items()
            },
            "health": self._health_monitor.get_health_summary(),
            "anomalies": self._anomaly_detector.get_anomaly_summary(),
        }
    
    async def trigger_worker(self, worker_name: str, force: bool = False) -> Dict[str, Any]:
        """Manually trigger a worker execution."""
        if worker_name not in self._workers:
            return {"success": False, "error": f"Unknown worker: {worker_name}"}
        
        config = self._workers[worker_name]
        
        if config.is_running and not force:
            return {"success": False, "error": "Worker is already running"}
        
        if config.execution_mode != WorkerExecutionMode.SCHEDULED:
            return {"success": False, "error": "Worker is not scheduled mode"}
        
        report = await self._execute_worker(config)
        return {"success": report.success, "report": report.to_dict()}
    
    def enable_worker(self, worker_name: str) -> bool:
        """Enable a worker."""
        if worker_name in self._workers:
            self._workers[worker_name].is_enabled = True
            return True
        return False
    
    def disable_worker(self, worker_name: str) -> bool:
        """Disable a worker."""
        if worker_name in self._workers:
            self._workers[worker_name].is_enabled = False
            return True
        return False


# =============================================================================
# Singleton
# =============================================================================

_orchestrator: Optional[HeadOrchestrator] = None


async def get_orchestrator() -> HeadOrchestrator:
    """Get or create the head orchestrator singleton."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = HeadOrchestrator()
    return _orchestrator


def reset_orchestrator() -> None:
    """Reset the orchestrator singleton (for testing)."""
    global _orchestrator
    _orchestrator = None


# =============================================================================
# CLI Entry Point
# =============================================================================

async def main():
    """Main entry point for running the orchestrator."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    
    orchestrator = await get_orchestrator()
    await orchestrator.start()


if __name__ == "__main__":
    asyncio.run(main())
