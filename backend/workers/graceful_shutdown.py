"""
Graceful Shutdown Utilities for Aurastream Workers.

This module provides utilities for graceful shutdown of background workers:
- Signal handling (SIGTERM, SIGINT)
- In-progress job tracking
- Configurable shutdown timeouts
- Clean resource cleanup

Usage:
    from backend.workers.graceful_shutdown import (
        GracefulShutdown,
        shutdown_handler,
        register_shutdown_handlers,
    )
    
    # Create shutdown handler
    shutdown = GracefulShutdown(timeout_seconds=30)
    
    # Register signal handlers
    register_shutdown_handlers(shutdown)
    
    # In your worker loop
    while not shutdown.should_stop:
        job = get_next_job()
        if job:
            with shutdown.track_job(job.id):
                process_job(job)
    
    # Wait for in-progress jobs before exit
    await shutdown.wait_for_completion()

Environment Variables:
    WORKER_SHUTDOWN_TIMEOUT: Seconds to wait for jobs to complete (default: 30)
    WORKER_FORCE_SHUTDOWN_TIMEOUT: Seconds before force kill (default: 60)
"""

import asyncio
import logging
import os
import signal
import sys
import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Callable, Dict, List, Optional, Set

logger = logging.getLogger(__name__)


class ShutdownState(Enum):
    """Worker shutdown states."""
    RUNNING = "running"
    STOPPING = "stopping"  # Graceful shutdown initiated
    DRAINING = "draining"  # Waiting for in-progress jobs
    STOPPED = "stopped"    # Fully stopped


@dataclass
class JobInfo:
    """Information about an in-progress job."""
    job_id: str
    started_at: datetime
    worker_name: str
    metadata: Dict = field(default_factory=dict)


class GracefulShutdown:
    """
    Manages graceful shutdown for background workers.
    
    Features:
    - Tracks in-progress jobs
    - Configurable shutdown timeout
    - Async-compatible waiting
    - Cleanup callback support
    
    Example:
        shutdown = GracefulShutdown(timeout_seconds=30)
        
        # In worker loop
        while not shutdown.should_stop:
            with shutdown.track_job("job-123"):
                await process_job()
        
        # On shutdown signal
        await shutdown.initiate_shutdown()
        await shutdown.wait_for_completion()
    """
    
    def __init__(
        self,
        timeout_seconds: Optional[float] = None,
        force_timeout_seconds: Optional[float] = None,
        worker_name: str = "worker",
    ):
        """
        Initialize graceful shutdown handler.
        
        Args:
            timeout_seconds: Seconds to wait for graceful shutdown
            force_timeout_seconds: Seconds before force termination
            worker_name: Name of this worker for logging
        """
        self._timeout = timeout_seconds or float(
            os.getenv("WORKER_SHUTDOWN_TIMEOUT", "30")
        )
        self._force_timeout = force_timeout_seconds or float(
            os.getenv("WORKER_FORCE_SHUTDOWN_TIMEOUT", "60")
        )
        self._worker_name = worker_name
        
        self._state = ShutdownState.RUNNING
        self._in_progress_jobs: Dict[str, JobInfo] = {}
        self._cleanup_callbacks: List[Callable] = []
        self._shutdown_event = asyncio.Event()
        self._completion_event = asyncio.Event()
        self._shutdown_initiated_at: Optional[datetime] = None
    
    @property
    def should_stop(self) -> bool:
        """Check if worker should stop accepting new jobs."""
        return self._state != ShutdownState.RUNNING
    
    @property
    def state(self) -> ShutdownState:
        """Get current shutdown state."""
        return self._state
    
    @property
    def in_progress_count(self) -> int:
        """Get number of in-progress jobs."""
        return len(self._in_progress_jobs)
    
    @property
    def in_progress_jobs(self) -> List[JobInfo]:
        """Get list of in-progress jobs."""
        return list(self._in_progress_jobs.values())
    
    def register_cleanup(self, callback: Callable) -> None:
        """
        Register a cleanup callback to run during shutdown.
        
        Callbacks are called in reverse order of registration.
        
        Args:
            callback: Async or sync function to call during cleanup
        """
        self._cleanup_callbacks.append(callback)
    
    @contextmanager
    def track_job(self, job_id: str, metadata: Optional[Dict] = None):
        """
        Context manager to track an in-progress job.
        
        Args:
            job_id: Unique job identifier
            metadata: Optional metadata about the job
            
        Yields:
            JobInfo for the tracked job
            
        Example:
            with shutdown.track_job("gen-123", {"type": "emote"}):
                await generate_asset()
        """
        job_info = JobInfo(
            job_id=job_id,
            started_at=datetime.now(timezone.utc),
            worker_name=self._worker_name,
            metadata=metadata or {},
        )
        
        self._in_progress_jobs[job_id] = job_info
        logger.debug(f"Job started: {job_id} (in_progress={self.in_progress_count})")
        
        try:
            yield job_info
        finally:
            self._in_progress_jobs.pop(job_id, None)
            logger.debug(f"Job completed: {job_id} (in_progress={self.in_progress_count})")
            
            # Check if we're draining and all jobs are done
            if self._state == ShutdownState.DRAINING and self.in_progress_count == 0:
                self._completion_event.set()
    
    async def initiate_shutdown(self, reason: str = "signal received") -> None:
        """
        Initiate graceful shutdown.
        
        Args:
            reason: Reason for shutdown (for logging)
        """
        if self._state != ShutdownState.RUNNING:
            logger.warning(f"Shutdown already initiated (state={self._state.value})")
            return
        
        self._state = ShutdownState.STOPPING
        self._shutdown_initiated_at = datetime.now(timezone.utc)
        self._shutdown_event.set()
        
        logger.info(
            f"Graceful shutdown initiated: worker={self._worker_name}, "
            f"reason={reason}, in_progress={self.in_progress_count}, "
            f"timeout={self._timeout}s"
        )
        
        # If no jobs in progress, we're done
        if self.in_progress_count == 0:
            self._state = ShutdownState.STOPPED
            self._completion_event.set()
        else:
            self._state = ShutdownState.DRAINING
    
    async def wait_for_completion(self) -> bool:
        """
        Wait for all in-progress jobs to complete.
        
        Returns:
            True if all jobs completed gracefully, False if timeout
        """
        if self._state == ShutdownState.STOPPED:
            return True
        
        if self._state == ShutdownState.RUNNING:
            await self.initiate_shutdown("wait_for_completion called")
        
        logger.info(
            f"Waiting for {self.in_progress_count} jobs to complete "
            f"(timeout={self._timeout}s)"
        )
        
        try:
            await asyncio.wait_for(
                self._completion_event.wait(),
                timeout=self._timeout,
            )
            logger.info("All jobs completed gracefully")
            graceful = True
        except asyncio.TimeoutError:
            logger.warning(
                f"Shutdown timeout reached with {self.in_progress_count} jobs "
                f"still in progress"
            )
            self._log_stuck_jobs()
            graceful = False
        
        # Run cleanup callbacks
        await self._run_cleanup()
        
        self._state = ShutdownState.STOPPED
        return graceful
    
    async def wait_for_shutdown_signal(self) -> None:
        """Wait until shutdown is initiated."""
        await self._shutdown_event.wait()
    
    def _log_stuck_jobs(self) -> None:
        """Log information about jobs that didn't complete."""
        for job_id, job_info in self._in_progress_jobs.items():
            duration = (datetime.now(timezone.utc) - job_info.started_at).total_seconds()
            logger.warning(
                f"Stuck job: id={job_id}, duration={duration:.1f}s, "
                f"metadata={job_info.metadata}"
            )
    
    async def _run_cleanup(self) -> None:
        """Run registered cleanup callbacks."""
        logger.info(f"Running {len(self._cleanup_callbacks)} cleanup callbacks")
        
        # Run in reverse order
        for callback in reversed(self._cleanup_callbacks):
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback()
                else:
                    callback()
            except Exception as e:
                logger.error(f"Cleanup callback failed: {e}")


# =============================================================================
# Signal Handlers
# =============================================================================

_shutdown_handler: Optional[GracefulShutdown] = None


def get_shutdown_handler() -> Optional[GracefulShutdown]:
    """Get the global shutdown handler."""
    return _shutdown_handler


def register_shutdown_handlers(
    shutdown: GracefulShutdown,
    signals: Optional[List[signal.Signals]] = None,
) -> None:
    """
    Register signal handlers for graceful shutdown.
    
    Args:
        shutdown: GracefulShutdown instance to use
        signals: Signals to handle (default: SIGTERM, SIGINT)
    """
    global _shutdown_handler
    _shutdown_handler = shutdown
    
    if signals is None:
        signals = [signal.SIGTERM, signal.SIGINT]
    
    def handle_signal(signum, frame):
        """Signal handler that initiates shutdown."""
        sig_name = signal.Signals(signum).name
        logger.info(f"Received {sig_name}, initiating graceful shutdown")
        
        # Create task to initiate shutdown
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(shutdown.initiate_shutdown(f"received {sig_name}"))
        except RuntimeError:
            # No running loop, set state directly
            shutdown._state = ShutdownState.STOPPING
            shutdown._shutdown_event.set()
    
    for sig in signals:
        try:
            signal.signal(sig, handle_signal)
            logger.debug(f"Registered handler for {sig.name}")
        except (ValueError, OSError) as e:
            logger.warning(f"Could not register handler for {sig.name}: {e}")


def register_async_shutdown_handlers(
    shutdown: GracefulShutdown,
    loop: Optional[asyncio.AbstractEventLoop] = None,
) -> None:
    """
    Register async-compatible signal handlers.
    
    Use this when running in an async context for proper event loop integration.
    
    Args:
        shutdown: GracefulShutdown instance to use
        loop: Event loop to use (default: current running loop)
    """
    global _shutdown_handler
    _shutdown_handler = shutdown
    
    if loop is None:
        loop = asyncio.get_running_loop()
    
    def handle_signal():
        """Async signal handler."""
        logger.info("Received shutdown signal, initiating graceful shutdown")
        loop.create_task(shutdown.initiate_shutdown("signal received"))
    
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, handle_signal)
            logger.debug(f"Registered async handler for {sig.name}")
        except (ValueError, OSError, NotImplementedError) as e:
            # Windows doesn't support add_signal_handler
            logger.warning(f"Could not register async handler for {sig.name}: {e}")


# =============================================================================
# Worker Loop Utilities
# =============================================================================


async def run_worker_loop(
    worker_func: Callable,
    shutdown: GracefulShutdown,
    poll_interval: float = 1.0,
    error_backoff: float = 5.0,
) -> None:
    """
    Run a worker function in a loop with graceful shutdown support.
    
    Args:
        worker_func: Async function to call each iteration
        shutdown: GracefulShutdown instance
        poll_interval: Seconds between iterations
        error_backoff: Seconds to wait after an error
        
    Example:
        async def process_jobs():
            job = await get_next_job()
            if job:
                with shutdown.track_job(job.id):
                    await process(job)
        
        await run_worker_loop(process_jobs, shutdown)
    """
    logger.info(f"Starting worker loop (poll_interval={poll_interval}s)")
    
    while not shutdown.should_stop:
        try:
            await worker_func()
            await asyncio.sleep(poll_interval)
        except asyncio.CancelledError:
            logger.info("Worker loop cancelled")
            break
        except Exception as e:
            logger.error(f"Worker loop error: {e}", exc_info=True)
            await asyncio.sleep(error_backoff)
    
    logger.info("Worker loop stopped")


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    # Classes
    "GracefulShutdown",
    "ShutdownState",
    "JobInfo",
    # Functions
    "get_shutdown_handler",
    "register_shutdown_handlers",
    "register_async_shutdown_handlers",
    "run_worker_loop",
]
