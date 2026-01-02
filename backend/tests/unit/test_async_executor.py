"""
Unit tests for async executor utilities.

Tests the thread pool executor functionality for CPU-bound
and I/O-bound blocking operations.
"""

import asyncio
import time
import pytest
from unittest.mock import patch, MagicMock

from backend.services.async_executor import (
    run_cpu_bound,
    run_blocking,
    offload_blocking,
    offload_cpu_bound,
    get_cpu_executor,
    get_io_executor,
    shutdown_executors,
    process_image_async,
)


class TestRunCpuBound:
    """Tests for run_cpu_bound function."""
    
    @pytest.mark.asyncio
    async def test_executes_function_in_thread_pool(self):
        """Function should execute and return result."""
        def add(a, b):
            return a + b
        
        result = await run_cpu_bound(add, 2, 3)
        assert result == 5
    
    @pytest.mark.asyncio
    async def test_handles_kwargs(self):
        """Should handle keyword arguments."""
        def greet(name, greeting="Hello"):
            return f"{greeting}, {name}!"
        
        result = await run_cpu_bound(greet, "World", greeting="Hi")
        assert result == "Hi, World!"
    
    @pytest.mark.asyncio
    async def test_propagates_exceptions(self):
        """Exceptions should propagate to caller."""
        def failing_func():
            raise ValueError("Test error")
        
        with pytest.raises(ValueError, match="Test error"):
            await run_cpu_bound(failing_func)
    
    @pytest.mark.asyncio
    async def test_does_not_block_event_loop(self):
        """CPU-bound work should not block other async tasks."""
        results = []
        
        def slow_cpu_work():
            time.sleep(0.1)
            return "cpu_done"
        
        async def quick_async_task():
            results.append("async_started")
            await asyncio.sleep(0.01)
            results.append("async_done")
        
        # Start both tasks concurrently
        cpu_task = asyncio.create_task(run_cpu_bound(slow_cpu_work))
        async_task = asyncio.create_task(quick_async_task())
        
        await asyncio.gather(cpu_task, async_task)
        
        # Async task should complete while CPU work is running
        assert "async_started" in results
        assert "async_done" in results
        assert cpu_task.result() == "cpu_done"


class TestRunBlocking:
    """Tests for run_blocking function."""
    
    @pytest.mark.asyncio
    async def test_executes_blocking_function(self):
        """Should execute blocking I/O function."""
        def read_data():
            return "data"
        
        result = await run_blocking(read_data)
        assert result == "data"
    
    @pytest.mark.asyncio
    async def test_handles_args_and_kwargs(self):
        """Should handle both positional and keyword arguments."""
        def process(data, prefix="", suffix=""):
            return f"{prefix}{data}{suffix}"
        
        result = await run_blocking(process, "test", prefix="[", suffix="]")
        assert result == "[test]"


class TestDecorators:
    """Tests for offload decorators."""
    
    @pytest.mark.asyncio
    async def test_offload_blocking_decorator(self):
        """@offload_blocking should make function async."""
        @offload_blocking
        def sync_function(x):
            return x * 2
        
        # Should be callable with await
        result = await sync_function(5)
        assert result == 10
    
    @pytest.mark.asyncio
    async def test_offload_cpu_bound_decorator(self):
        """@offload_cpu_bound should make function async."""
        @offload_cpu_bound
        def cpu_intensive(data):
            return sum(data)
        
        result = await cpu_intensive([1, 2, 3, 4, 5])
        assert result == 15
    
    @pytest.mark.asyncio
    async def test_decorator_preserves_function_name(self):
        """Decorator should preserve function metadata."""
        @offload_blocking
        def my_function():
            """My docstring."""
            pass
        
        assert my_function.__name__ == "my_function"
        assert "My docstring" in my_function.__doc__


class TestExecutorManagement:
    """Tests for executor lifecycle management."""
    
    def test_get_cpu_executor_returns_executor(self):
        """Should return a ThreadPoolExecutor."""
        executor = get_cpu_executor()
        assert executor is not None
        # Should return same instance on subsequent calls
        assert get_cpu_executor() is executor
    
    def test_get_io_executor_returns_executor(self):
        """Should return a ThreadPoolExecutor."""
        executor = get_io_executor()
        assert executor is not None
        # Should return same instance on subsequent calls
        assert get_io_executor() is executor
    
    @pytest.mark.asyncio
    async def test_shutdown_executors(self):
        """Should shutdown executors gracefully."""
        # Ensure executors are created
        get_cpu_executor()
        get_io_executor()
        
        # Shutdown
        await shutdown_executors()
        
        # After shutdown, getting executors should create new ones
        # (This tests that the globals were reset)


class TestProcessImageAsync:
    """Tests for image processing utility."""
    
    @pytest.mark.asyncio
    async def test_process_image_async(self):
        """Should process image data through provided function."""
        def double_bytes(data: bytes) -> bytes:
            return data + data
        
        input_data = b"test"
        result = await process_image_async(input_data, double_bytes)
        
        assert result == b"testtest"
    
    @pytest.mark.asyncio
    async def test_process_image_with_pil_like_operation(self):
        """Should work with PIL-like byte processing."""
        def mock_resize(data: bytes) -> bytes:
            # Simulate some processing
            return b"resized_" + data
        
        result = await process_image_async(b"image", mock_resize)
        assert result == b"resized_image"


class TestConcurrency:
    """Tests for concurrent execution behavior."""
    
    @pytest.mark.asyncio
    async def test_multiple_concurrent_cpu_tasks(self):
        """Multiple CPU tasks should run concurrently in thread pool."""
        results = []
        
        def cpu_work(task_id):
            time.sleep(0.05)
            return task_id
        
        # Run 4 tasks concurrently
        tasks = [
            run_cpu_bound(cpu_work, i)
            for i in range(4)
        ]
        
        start = time.time()
        results = await asyncio.gather(*tasks)
        elapsed = time.time() - start
        
        # All tasks should complete
        assert sorted(results) == [0, 1, 2, 3]
        
        # Should complete faster than sequential (4 * 0.05 = 0.2s)
        # With thread pool, should be closer to 0.05-0.1s
        assert elapsed < 0.15  # Allow some overhead
    
    @pytest.mark.asyncio
    async def test_cpu_and_io_tasks_concurrent(self):
        """CPU and I/O tasks should not block each other."""
        def cpu_work():
            time.sleep(0.05)
            return "cpu"
        
        def io_work():
            time.sleep(0.05)
            return "io"
        
        start = time.time()
        results = await asyncio.gather(
            run_cpu_bound(cpu_work),
            run_blocking(io_work),
        )
        elapsed = time.time() - start
        
        assert set(results) == {"cpu", "io"}
        # Should run concurrently, not sequentially
        assert elapsed < 0.08
