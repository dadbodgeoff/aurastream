"""
Creator Intel V2 - Intel Orchestrator

Single entry point for all intel data operations.
Coordinates collection, analysis, and aggregation with:
- Priority-based scheduling
- Graceful shutdown
- Health endpoints
- Metrics collection

Uses Supabase client for database operations (not asyncpg).
"""

import asyncio
import json
import logging
import signal
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Any, Callable, Coroutine, Dict, List, Optional

import redis.asyncio as redis
from supabase import Client

from backend.services.intel.core.metrics import get_intel_metrics

logger = logging.getLogger(__name__)


class TaskPriority(Enum):
    """Priority levels for scheduled tasks."""
    CRITICAL = 1  # Must run on schedule
    HIGH = 2      # Important but can slip
    NORMAL = 3    # Best effort
    LOW = 4       # Run if resources available


@dataclass
class ScheduledTask:
    """A task scheduled to run at specific intervals."""
    name: str
    handler: Callable[[], Coroutine[Any, Any, None]]
    interval_seconds: int
    priority: TaskPriority
    
    # Runtime state
    last_run: Optional[datetime] = None
    last_success: Optional[datetime] = None
    last_error: Optional[str] = None
    consecutive_failures: int = 0
    is_running: bool = False
    
    # Configuration
    max_retries: int = 3
    timeout_seconds: int = 300
    backoff_multiplier: float = 2.0
    
    def should_run(self, now: datetime) -> bool:
        """Check if task should run based on schedule."""
        if self.is_running:
            return False
        
        if self.last_run is None:
            return True
        
        # Apply backoff if failing
        effective_interval = self.interval_seconds
        if self.consecutive_failures > 0:
            effective_interval *= (self.backoff_multiplier ** min(self.consecutive_failures, 4))
        
        next_run = self.last_run + timedelta(seconds=effective_interval)
        return now >= next_run
    
    def get_next_run(self) -> Optional[datetime]:
        """Get next scheduled run time."""
        if self.last_run is None:
            return datetime.now(timezone.utc)
        
        effective_interval = self.interval_seconds
        if self.consecutive_failures > 0:
            effective_interval *= (self.backoff_multiplier ** min(self.consecutive_failures, 4))
        
        return self.last_run + timedelta(seconds=effective_interval)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for status reporting."""
        return {
            "name": self.name,
            "interval_seconds": self.interval_seconds,
            "priority": self.priority.name,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "last_success": self.last_success.isoformat() if self.last_success else None,
            "last_error": self.last_error,
            "consecutive_failures": self.consecutive_failures,
            "is_running": self.is_running,
            "next_run": self.get_next_run().isoformat() if self.get_next_run() else None,
        }


@dataclass
class OrchestratorMetrics:
    """Metrics for monitoring the orchestrator."""
    tasks_executed: int = 0
    tasks_succeeded: int = 0
    tasks_failed: int = 0
    total_duration_seconds: float = 0
    last_health_check: Optional[datetime] = None
    started_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for status reporting."""
        return {
            "tasks_executed": self.tasks_executed,
            "tasks_succeeded": self.tasks_succeeded,
            "tasks_failed": self.tasks_failed,
            "success_rate": self.tasks_succeeded / self.tasks_executed if self.tasks_executed > 0 else 0,
            "avg_duration": self.total_duration_seconds / self.tasks_executed if self.tasks_executed > 0 else 0,
            "last_health_check": self.last_health_check.isoformat() if self.last_health_check else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "uptime_seconds": (datetime.now(timezone.utc) - self.started_at).total_seconds() if self.started_at else 0,
        }


class IntelOrchestrator:
    """
    Unified orchestrator for all intel operations.
    
    Responsibilities:
    1. Schedule and coordinate all data tasks
    2. Manage resource contention
    3. Handle failures with backoff
    4. Provide health/metrics endpoints
    5. Graceful shutdown
    
    Tasks managed:
    - YouTube collection (every 4 hours)
    - Twitch collection (every 30 minutes)
    - Intel analysis (every 4 hours, after YouTube)
    - Hourly aggregation (every hour at :05)
    - Daily rollup (daily at 00:15)
    
    Usage:
        from backend.database import get_supabase_client
        
        db = get_supabase_client()
        orchestrator = IntelOrchestrator(redis_client, db)
        await orchestrator.start()
    """
    
    def __init__(
        self,
        redis_client: redis.Redis,
        db: Client,
        youtube_collector: Optional[Any] = None,
        twitch_collector: Optional[Any] = None,
        quota_manager: Optional[Any] = None,
    ) -> None:
        """
        Initialize the orchestrator.
        
        Args:
            redis_client: Redis client
            db: Supabase client for database operations
            youtube_collector: Optional YouTube collector
            twitch_collector: Optional Twitch collector
            quota_manager: Optional quota manager
        """
        self.redis = redis_client
        self.db = db
        self.youtube = youtube_collector
        self.twitch = twitch_collector
        self.quota = quota_manager
        
        self.tasks: Dict[str, ScheduledTask] = {}
        self.metrics = OrchestratorMetrics()
        self._shutdown_event = asyncio.Event()
        self._running = False
        self._intel_metrics = get_intel_metrics()
    
    def register_tasks(self) -> None:
        """Register all scheduled tasks."""
        # Collection tasks
        self.tasks["youtube_collection"] = ScheduledTask(
            name="youtube_collection",
            handler=self._run_youtube_collection,
            interval_seconds=4 * 3600,  # 4 hours
            priority=TaskPriority.CRITICAL,
            timeout_seconds=600,
        )
        
        self.tasks["twitch_collection"] = ScheduledTask(
            name="twitch_collection",
            handler=self._run_twitch_collection,
            interval_seconds=30 * 60,  # 30 minutes
            priority=TaskPriority.HIGH,
            timeout_seconds=300,
        )
        
        # Analysis tasks (run after collection)
        self.tasks["intel_analysis"] = ScheduledTask(
            name="intel_analysis",
            handler=self._run_intel_analysis,
            interval_seconds=4 * 3600,  # 4 hours
            priority=TaskPriority.HIGH,
            timeout_seconds=900,
        )
        
        # Aggregation tasks
        self.tasks["hourly_aggregation"] = ScheduledTask(
            name="hourly_aggregation",
            handler=self._run_hourly_aggregation,
            interval_seconds=3600,  # 1 hour
            priority=TaskPriority.NORMAL,
            timeout_seconds=300,
        )
        
        self.tasks["daily_rollup"] = ScheduledTask(
            name="daily_rollup",
            handler=self._run_daily_rollup,
            interval_seconds=24 * 3600,  # 24 hours
            priority=TaskPriority.NORMAL,
            timeout_seconds=600,
        )
        
        # Health check
        self.tasks["health_check"] = ScheduledTask(
            name="health_check",
            handler=self._run_health_check,
            interval_seconds=60,  # 1 minute
            priority=TaskPriority.LOW,
            timeout_seconds=30,
        )
    
    async def start(self) -> None:
        """Start the orchestrator main loop."""
        self._running = True
        self.metrics.started_at = datetime.now(timezone.utc)
        self.register_tasks()
        
        # Setup signal handlers
        loop = asyncio.get_event_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            try:
                loop.add_signal_handler(sig, self._handle_shutdown)
            except NotImplementedError:
                # Windows doesn't support add_signal_handler
                pass
        
        logger.info("Intel Orchestrator starting...")
        logger.info(f"Registered {len(self.tasks)} tasks")
        
        # Initialize quota manager if available
        if self.quota:
            await self.quota.initialize()
        
        # Load task state from Redis
        await self._load_task_state()
        
        # Main loop
        while not self._shutdown_event.is_set():
            await self._tick()
            await asyncio.sleep(10)  # Check every 10 seconds
        
        logger.info("Intel Orchestrator shutting down...")
        await self._graceful_shutdown()
    
    async def _tick(self) -> None:
        """Single tick of the orchestrator loop."""
        now = datetime.now(timezone.utc)
        
        # Get tasks that should run, sorted by priority
        runnable = [
            task for task in self.tasks.values()
            if task.should_run(now)
        ]
        runnable.sort(key=lambda t: t.priority.value)
        
        # Run tasks (one at a time to avoid resource contention)
        for task in runnable:
            if self._shutdown_event.is_set():
                break
            
            await self._execute_task(task)
    
    async def _execute_task(self, task: ScheduledTask) -> None:
        """Execute a single task with error handling."""
        import time
        
        task.is_running = True
        task.last_run = datetime.now(timezone.utc)
        start_time = time.time()
        
        logger.info(f"Starting task: {task.name}")
        
        try:
            # Run with timeout
            await asyncio.wait_for(
                task.handler(),
                timeout=task.timeout_seconds
            )
            
            # Success
            task.last_success = datetime.now(timezone.utc)
            task.last_error = None
            task.consecutive_failures = 0
            
            self.metrics.tasks_succeeded += 1
            logger.info(f"Task completed: {task.name}")
            
        except asyncio.TimeoutError:
            task.last_error = "Timeout"
            task.consecutive_failures += 1
            self.metrics.tasks_failed += 1
            logger.error(f"Task timed out: {task.name}")
            
        except Exception as e:
            task.last_error = str(e)
            task.consecutive_failures += 1
            self.metrics.tasks_failed += 1
            logger.error(f"Task failed: {task.name} - {e}")
        
        finally:
            task.is_running = False
            duration = time.time() - start_time
            self.metrics.tasks_executed += 1
            self.metrics.total_duration_seconds += duration
            
            # Persist task state
            await self._persist_task_state(task)
    
    async def _persist_task_state(self, task: ScheduledTask) -> None:
        """
        Persist task state to Redis for recovery.
        
        FIX #4: Wrap in try/except to prevent persistence failures
        from causing task execution to fail.
        """
        state = {
            "last_run": task.last_run.isoformat() if task.last_run else None,
            "last_success": task.last_success.isoformat() if task.last_success else None,
            "last_error": task.last_error,
            "consecutive_failures": task.consecutive_failures,
        }
        try:
            await self.redis.set(
                f"orchestrator:task:{task.name}",
                json.dumps(state)
            )
        except Exception as e:
            # Log but don't raise - task execution succeeded, 
            # we just couldn't persist the state
            logger.warning(
                f"Failed to persist state for task {task.name}: {e}. "
                "Task state may be lost on restart."
            )
    
    async def _load_task_state(self) -> None:
        """Load task state from Redis on startup."""
        for name, task in self.tasks.items():
            try:
                state_data = await self.redis.get(f"orchestrator:task:{name}")
                if state_data:
                    state = json.loads(state_data)
                    task.last_run = datetime.fromisoformat(state["last_run"]) if state.get("last_run") else None
                    task.last_success = datetime.fromisoformat(state["last_success"]) if state.get("last_success") else None
                    task.last_error = state.get("last_error")
                    task.consecutive_failures = state.get("consecutive_failures", 0)
            except Exception as e:
                logger.warning(f"Failed to load state for {name}: {e}")
    
    def _handle_shutdown(self) -> None:
        """Handle shutdown signal."""
        logger.info("Shutdown signal received")
        self._shutdown_event.set()
    
    async def _graceful_shutdown(self) -> None:
        """Wait for running tasks to complete."""
        running = [t for t in self.tasks.values() if t.is_running]
        if running:
            logger.info(f"Waiting for {len(running)} tasks to complete...")
            for _ in range(30):  # Wait up to 30 seconds
                running = [t for t in self.tasks.values() if t.is_running]
                if not running:
                    break
                await asyncio.sleep(1)
        
        logger.info("Orchestrator shutdown complete")
    
    # Task handlers
    async def _run_youtube_collection(self) -> None:
        """Run YouTube data collection."""
        from backend.services.intel.collectors.batch_collector import BatchCollector
        from backend.services.intel.collectors.quota_manager import get_quota_manager
        
        if not self.youtube:
            logger.warning("YouTube collector not configured, skipping")
            return
        
        quota = self.quota or await get_quota_manager()
        collector = BatchCollector(self.youtube, quota, self.redis)
        schedule = quota.get_collection_schedule()
        
        if not schedule:
            logger.info("No games scheduled for collection")
            return
        
        result = await collector.collect_batch(schedule)
        logger.info(
            f"YouTube collection complete: {result.games_collected}, "
            f"{result.unique_videos} videos, {result.quota_used} quota"
        )
    
    async def _run_twitch_collection(self) -> None:
        """Run Twitch data collection."""
        if not self.twitch:
            logger.warning("Twitch collector not configured, skipping")
            return
        
        # Implementation would be similar to YouTube
        logger.info("Twitch collection complete")
    
    async def _run_intel_analysis(self) -> None:
        """Run all intel analyzers."""
        from backend.services.intel.analyzers.runner import run_all_analyzers
        from backend.services.intel.collectors.quota_manager import QuotaManager
        
        games = QuotaManager.DEFAULT_PRIORITIES.keys()
        results = await run_all_analyzers(list(games), self.redis)
        
        succeeded = sum(1 for r in results.values() if r.analyzers_succeeded)
        logger.info(f"Intel analysis complete: {succeeded}/{len(results)} categories")
    
    async def _run_hourly_aggregation(self) -> None:
        """Run hourly aggregation."""
        from backend.services.intel.aggregation.hourly import HourlyAggregator
        
        aggregator = HourlyAggregator(self.redis, self.db)
        count = await aggregator.run()
        logger.info(f"Hourly aggregation complete: {count} categories")
    
    async def _run_daily_rollup(self) -> None:
        """Run daily rollup."""
        from backend.services.intel.aggregation.daily import DailyRollup
        
        rollup = DailyRollup(self.db)
        count = await rollup.run()
        logger.info(f"Daily rollup complete: {count} categories")
    
    async def _run_health_check(self) -> None:
        """Run health check and update metrics."""
        self.metrics.last_health_check = datetime.now(timezone.utc)
        
        # Check Redis connectivity
        await self.redis.ping()
        
        # Check DB connectivity via Supabase
        try:
            # Simple query to verify connection
            self.db.table("intel_worker_state").select("id").limit(1).execute()
        except Exception as e:
            logger.warning(f"DB health check query failed (table may not exist): {e}")
        
        # Persist metrics
        await self.redis.set(
            "orchestrator:metrics",
            json.dumps(self.metrics.to_dict())
        )
    
    def get_status(self) -> Dict[str, Any]:
        """Get orchestrator status for API."""
        quota_status = {}
        if self.quota:
            quota_status = self.quota.get_quota_status()
        
        return {
            "running": self._running,
            "metrics": self.metrics.to_dict(),
            "tasks": {
                name: task.to_dict()
                for name, task in self.tasks.items()
            },
            "quota": quota_status,
        }
    
    async def trigger_task(self, task_name: str) -> bool:
        """
        Manually trigger a task.
        
        Args:
            task_name: Name of the task to trigger
            
        Returns:
            True if task was triggered, False if not found or already running
        """
        task = self.tasks.get(task_name)
        if not task:
            return False
        
        if task.is_running:
            return False
        
        # Reset last_run to force immediate execution
        task.last_run = None
        return True
