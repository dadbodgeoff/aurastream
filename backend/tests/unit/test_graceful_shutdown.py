"""
Unit tests for graceful shutdown utilities.

Tests signal handling, job tracking, and shutdown coordination.
"""

import asyncio
import signal
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch, AsyncMock

from backend.workers.graceful_shutdown import (
    GracefulShutdown,
    ShutdownState,
    JobInfo,
    register_shutdown_handlers,
    run_worker_loop,
)


class TestGracefulShutdown:
    """Tests for the GracefulShutdown class."""
    
    @pytest.fixture
    def shutdown(self):
        """Create a shutdown handler for testing."""
        return GracefulShutdown(timeout_seconds=5, worker_name="test_worker")
    
    def test_initial_state(self, shutdown):
        """Should start in RUNNING state."""
        assert shutdown.state == ShutdownState.RUNNING
        assert not shutdown.should_stop
        assert shutdown.in_progress_count == 0
    
    @pytest.mark.asyncio
    async def test_initiate_shutdown(self, shutdown):
        """Should transition to STOPPING state."""
        await shutdown.initiate_shutdown("test")
        
        assert shutdown.state == ShutdownState.STOPPED  # No jobs, goes straight to stopped
        assert shutdown.should_stop
    
    @pytest.mark.asyncio
    async def test_initiate_shutdown_with_jobs(self, shutdown):
        """Should transition to DRAINING when jobs in progress."""
        # Start a job
        with shutdown.track_job("job-1"):
            await shutdown.initiate_shutdown("test")
            
            assert shutdown.state == ShutdownState.DRAINING
            assert shutdown.should_stop
            assert shutdown.in_progress_count == 1
        
        # Job completes, should trigger completion
        assert shutdown.in_progress_count == 0
    
    def test_track_job_context_manager(self, shutdown):
        """Should track jobs correctly."""
        assert shutdown.in_progress_count == 0
        
        with shutdown.track_job("job-1", {"type": "test"}):
            assert shutdown.in_progress_count == 1
            jobs = shutdown.in_progress_jobs
            assert len(jobs) == 1
            assert jobs[0].job_id == "job-1"
            assert jobs[0].metadata == {"type": "test"}
        
        assert shutdown.in_progress_count == 0
    
    def test_track_multiple_jobs(self, shutdown):
        """Should track multiple concurrent jobs."""
        with shutdown.track_job("job-1"):
            with shutdown.track_job("job-2"):
                with shutdown.track_job("job-3"):
                    assert shutdown.in_progress_count == 3
                assert shutdown.in_progress_count == 2
            assert shutdown.in_progress_count == 1
        assert shutdown.in_progress_count == 0
    
    def test_track_job_exception_handling(self, shutdown):
        """Should clean up job tracking even on exception."""
        try:
            with shutdown.track_job("job-1"):
                assert shutdown.in_progress_count == 1
                raise ValueError("Test error")
        except ValueError:
            pass
        
        assert shutdown.in_progress_count == 0
    
    @pytest.mark.asyncio
    async def test_wait_for_completion_no_jobs(self, shutdown):
        """Should complete immediately with no jobs."""
        result = await shutdown.wait_for_completion()
        
        assert result is True
        assert shutdown.state == ShutdownState.STOPPED
    
    @pytest.mark.asyncio
    async def test_wait_for_completion_with_jobs(self, shutdown):
        """Should wait for jobs to complete."""
        completion_order = []
        
        async def job_task():
            with shutdown.track_job("job-1"):
                await asyncio.sleep(0.1)
                completion_order.append("job")
        
        async def shutdown_task():
            await asyncio.sleep(0.05)  # Let job start
            result = await shutdown.wait_for_completion()
            completion_order.append("shutdown")
            return result
        
        # Run both tasks
        job = asyncio.create_task(job_task())
        shutdown_result = asyncio.create_task(shutdown_task())
        
        await asyncio.gather(job, shutdown_result)
        
        # Job should complete before shutdown finishes
        assert completion_order == ["job", "shutdown"]
        assert shutdown_result.result() is True
    
    @pytest.mark.asyncio
    async def test_wait_for_completion_timeout(self):
        """Should timeout if jobs don't complete."""
        shutdown = GracefulShutdown(timeout_seconds=0.1, worker_name="test")
        
        async def stuck_job():
            with shutdown.track_job("stuck-job"):
                await asyncio.sleep(10)  # Much longer than timeout
        
        # Start stuck job
        job_task = asyncio.create_task(stuck_job())
        
        # Wait a bit for job to start
        await asyncio.sleep(0.01)
        
        # Wait for completion should timeout
        result = await shutdown.wait_for_completion()
        
        assert result is False
        assert shutdown.state == ShutdownState.STOPPED
        
        # Cancel the stuck job
        job_task.cancel()
        try:
            await job_task
        except asyncio.CancelledError:
            pass
    
    @pytest.mark.asyncio
    async def test_cleanup_callbacks(self, shutdown):
        """Should run cleanup callbacks on shutdown."""
        cleanup_order = []
        
        def sync_cleanup():
            cleanup_order.append("sync")
        
        async def async_cleanup():
            cleanup_order.append("async")
        
        shutdown.register_cleanup(sync_cleanup)
        shutdown.register_cleanup(async_cleanup)
        
        await shutdown.wait_for_completion()
        
        # Callbacks run in reverse order
        assert cleanup_order == ["async", "sync"]
    
    @pytest.mark.asyncio
    async def test_cleanup_callback_error_handling(self, shutdown):
        """Should continue cleanup even if callback fails."""
        cleanup_order = []
        
        def failing_cleanup():
            cleanup_order.append("failing")
            raise ValueError("Cleanup error")
        
        def success_cleanup():
            cleanup_order.append("success")
        
        shutdown.register_cleanup(success_cleanup)
        shutdown.register_cleanup(failing_cleanup)
        
        # Should not raise
        await shutdown.wait_for_completion()
        
        # Both callbacks should have been attempted
        assert "failing" in cleanup_order
        assert "success" in cleanup_order
    
    @pytest.mark.asyncio
    async def test_double_shutdown_initiation(self, shutdown):
        """Should handle multiple shutdown calls gracefully."""
        await shutdown.initiate_shutdown("first")
        await shutdown.initiate_shutdown("second")  # Should be no-op
        
        assert shutdown.state == ShutdownState.STOPPED


class TestSignalHandlers:
    """Tests for signal handler registration."""
    
    def test_register_shutdown_handlers(self):
        """Should register signal handlers."""
        shutdown = GracefulShutdown(worker_name="test")
        
        with patch('signal.signal') as mock_signal:
            register_shutdown_handlers(shutdown, signals=[signal.SIGTERM])
            
            mock_signal.assert_called()
            # Check SIGTERM was registered
            call_args = [call[0][0] for call in mock_signal.call_args_list]
            assert signal.SIGTERM in call_args


class TestWorkerLoop:
    """Tests for the worker loop utility."""
    
    @pytest.mark.asyncio
    async def test_worker_loop_runs_until_shutdown(self):
        """Worker loop should run until shutdown."""
        shutdown = GracefulShutdown(worker_name="test")
        call_count = 0
        
        async def worker_func():
            nonlocal call_count
            call_count += 1
            if call_count >= 3:
                await shutdown.initiate_shutdown("test complete")
        
        await run_worker_loop(
            worker_func,
            shutdown,
            poll_interval=0.01,
        )
        
        assert call_count >= 3
        assert shutdown.should_stop
    
    @pytest.mark.asyncio
    async def test_worker_loop_handles_errors(self):
        """Worker loop should continue after errors."""
        shutdown = GracefulShutdown(worker_name="test")
        call_count = 0
        
        async def worker_func():
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise ValueError("Test error")
            if call_count >= 3:
                await shutdown.initiate_shutdown("test complete")
        
        await run_worker_loop(
            worker_func,
            shutdown,
            poll_interval=0.01,
            error_backoff=0.01,
        )
        
        assert call_count >= 3  # Continued after error


class TestJobInfo:
    """Tests for JobInfo dataclass."""
    
    def test_job_info_creation(self):
        """Should create JobInfo with correct fields."""
        now = datetime.now(timezone.utc)
        job = JobInfo(
            job_id="test-123",
            started_at=now,
            worker_name="test_worker",
            metadata={"type": "generation"},
        )
        
        assert job.job_id == "test-123"
        assert job.started_at == now
        assert job.worker_name == "test_worker"
        assert job.metadata == {"type": "generation"}
    
    def test_job_info_default_metadata(self):
        """Should default to empty metadata dict."""
        job = JobInfo(
            job_id="test",
            started_at=datetime.now(timezone.utc),
            worker_name="test",
        )
        
        assert job.metadata == {}
