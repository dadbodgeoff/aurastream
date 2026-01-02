"""
Async Executor Utilities for CPU-Bound Operations.

This module provides utilities for running blocking/CPU-bound operations
in thread pool executors to prevent starving the async event loop.

Problem:
    CPU-bound operations like PIL image processing, rembg background removal,
    and other blocking calls can starve the async event loop, causing:
    - Request timeouts under load
    - Degraded performance for all concurrent requests
    - Unresponsive API endpoints

Solution:
    Use ThreadPoolExecutor to offload blocking operations to worker threads,
    allowing the event loop to continue processing other requests.

Usage:
    from backend.services.async_executor import run_blocking, run_cpu_bound

    # For I/O-bound blocking operations (file reads, etc.)
    result = await run_blocking(blocking_function, arg1, arg2)

    # For CPU-bound operations (image processing, etc.)
    result = await run_cpu_bound(cpu_intensive_function, arg1, arg2)

    # With the decorator
    @offload_blocking
    def my_blocking_function(data):
        # This will automatically run in executor when called with await
        return process(data)

Performance Notes:
    - ThreadPoolExecutor is used because Python's GIL makes ProcessPoolExecutor
      less beneficial for most operations, and thread pools have lower overhead
    - The default pool size is based on CPU count for CPU-bound work
    - For I/O-bound work, a larger pool may be beneficial
"""

import asyncio
import functools
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable, TypeVar, ParamSpec

logger = logging.getLogger(__name__)

# Type variables for generic function signatures
P = ParamSpec("P")
T = TypeVar("T")

# =============================================================================
# Thread Pool Configuration
# =============================================================================

# CPU-bound operations pool (sized for CPU cores)
# Use fewer workers to avoid overwhelming the system
_CPU_POOL_SIZE = int(os.getenv("CPU_EXECUTOR_POOL_SIZE", str(min(4, os.cpu_count() or 2))))

# I/O-bound operations pool (can be larger since threads mostly wait)
_IO_POOL_SIZE = int(os.getenv("IO_EXECUTOR_POOL_SIZE", str(min(8, (os.cpu_count() or 2) * 2))))

# Global executor instances (lazy initialized)
_cpu_executor: ThreadPoolExecutor | None = None
_io_executor: ThreadPoolExecutor | None = None


def get_cpu_executor() -> ThreadPoolExecutor:
    """
    Get the thread pool executor for CPU-bound operations.
    
    This executor is sized for CPU-intensive work like image processing.
    Uses a smaller pool to avoid overwhelming the system.
    
    Returns:
        ThreadPoolExecutor instance
    """
    global _cpu_executor
    if _cpu_executor is None:
        _cpu_executor = ThreadPoolExecutor(
            max_workers=_CPU_POOL_SIZE,
            thread_name_prefix="cpu_worker"
        )
        logger.info(f"CPU executor initialized with {_CPU_POOL_SIZE} workers")
    return _cpu_executor


def get_io_executor() -> ThreadPoolExecutor:
    """
    Get the thread pool executor for I/O-bound blocking operations.
    
    This executor is sized for I/O-bound work where threads mostly wait.
    Uses a larger pool since threads don't compete for CPU.
    
    Returns:
        ThreadPoolExecutor instance
    """
    global _io_executor
    if _io_executor is None:
        _io_executor = ThreadPoolExecutor(
            max_workers=_IO_POOL_SIZE,
            thread_name_prefix="io_worker"
        )
        logger.info(f"I/O executor initialized with {_IO_POOL_SIZE} workers")
    return _io_executor


async def shutdown_executors() -> None:
    """
    Shutdown all executor pools gracefully.
    
    Call this during application shutdown to clean up resources.
    """
    global _cpu_executor, _io_executor
    
    if _cpu_executor is not None:
        _cpu_executor.shutdown(wait=True)
        _cpu_executor = None
        logger.info("CPU executor shutdown complete")
    
    if _io_executor is not None:
        _io_executor.shutdown(wait=True)
        _io_executor = None
        logger.info("I/O executor shutdown complete")


# =============================================================================
# Core Execution Functions
# =============================================================================

async def run_cpu_bound(
    func: Callable[P, T],
    *args: P.args,
    **kwargs: P.kwargs,
) -> T:
    """
    Run a CPU-bound blocking function in the thread pool executor.
    
    Use this for operations like:
    - PIL image processing (resize, convert, filter)
    - rembg background removal
    - Heavy computation
    - Compression/decompression
    
    Args:
        func: The blocking function to execute
        *args: Positional arguments for the function
        **kwargs: Keyword arguments for the function
        
    Returns:
        The result of the function
        
    Example:
        from PIL import Image
        
        def resize_image(data: bytes, size: tuple) -> bytes:
            img = Image.open(BytesIO(data))
            resized = img.resize(size, Image.Resampling.LANCZOS)
            output = BytesIO()
            resized.save(output, format="PNG")
            return output.getvalue()
        
        # In async context:
        result = await run_cpu_bound(resize_image, image_bytes, (100, 100))
    """
    loop = asyncio.get_event_loop()
    executor = get_cpu_executor()
    
    # Create a partial function if kwargs are provided
    if kwargs:
        func = functools.partial(func, **kwargs)
    
    return await loop.run_in_executor(executor, func, *args)


async def run_blocking(
    func: Callable[P, T],
    *args: P.args,
    **kwargs: P.kwargs,
) -> T:
    """
    Run a blocking I/O function in the thread pool executor.
    
    Use this for operations like:
    - Synchronous file I/O
    - Blocking network calls
    - Database operations without async support
    
    Args:
        func: The blocking function to execute
        *args: Positional arguments for the function
        **kwargs: Keyword arguments for the function
        
    Returns:
        The result of the function
        
    Example:
        def read_large_file(path: str) -> bytes:
            with open(path, 'rb') as f:
                return f.read()
        
        # In async context:
        data = await run_blocking(read_large_file, "/path/to/file")
    """
    loop = asyncio.get_event_loop()
    executor = get_io_executor()
    
    # Create a partial function if kwargs are provided
    if kwargs:
        func = functools.partial(func, **kwargs)
    
    return await loop.run_in_executor(executor, func, *args)


# =============================================================================
# Decorator for Automatic Offloading
# =============================================================================

def offload_blocking(func: Callable[P, T]) -> Callable[P, T]:
    """
    Decorator to automatically run a blocking function in the I/O executor.
    
    The decorated function becomes async and runs in the thread pool.
    
    Args:
        func: The blocking function to wrap
        
    Returns:
        Async wrapper function
        
    Example:
        @offload_blocking
        def process_file(path: str) -> dict:
            # This blocking code runs in thread pool
            with open(path) as f:
                return json.load(f)
        
        # Usage (now async):
        result = await process_file("/path/to/file.json")
    """
    @functools.wraps(func)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        return await run_blocking(func, *args, **kwargs)
    
    return wrapper


def offload_cpu_bound(func: Callable[P, T]) -> Callable[P, T]:
    """
    Decorator to automatically run a CPU-bound function in the CPU executor.
    
    The decorated function becomes async and runs in the thread pool.
    
    Args:
        func: The CPU-bound function to wrap
        
    Returns:
        Async wrapper function
        
    Example:
        @offload_cpu_bound
        def heavy_computation(data: bytes) -> bytes:
            # This CPU-intensive code runs in thread pool
            return compress(data)
        
        # Usage (now async):
        result = await heavy_computation(large_data)
    """
    @functools.wraps(func)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        return await run_cpu_bound(func, *args, **kwargs)
    
    return wrapper


# =============================================================================
# Image Processing Utilities
# =============================================================================

async def process_image_async(
    image_data: bytes,
    processor: Callable[[bytes], bytes],
) -> bytes:
    """
    Process image data asynchronously using the CPU executor.
    
    This is a convenience wrapper for common image processing patterns.
    
    Args:
        image_data: Raw image bytes
        processor: Function that takes bytes and returns processed bytes
        
    Returns:
        Processed image bytes
        
    Example:
        def add_watermark(data: bytes) -> bytes:
            img = Image.open(BytesIO(data))
            # ... add watermark ...
            output = BytesIO()
            img.save(output, format="PNG")
            return output.getvalue()
        
        result = await process_image_async(image_bytes, add_watermark)
    """
    return await run_cpu_bound(processor, image_data)


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    # Executors
    "get_cpu_executor",
    "get_io_executor",
    "shutdown_executors",
    # Core functions
    "run_cpu_bound",
    "run_blocking",
    # Decorators
    "offload_blocking",
    "offload_cpu_bound",
    # Utilities
    "process_image_async",
]
