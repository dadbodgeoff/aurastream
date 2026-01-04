"""
Distributed Lock Service for AuraStream Workers.

Provides Redis-based distributed locking to prevent duplicate execution
of workers and tasks across multiple instances.

Features:
- SETNX-based lock acquisition with automatic expiration
- Context manager support for safe lock handling
- Helper functions for common worker lock patterns
- Comprehensive logging for debugging lock issues

Usage:
    # Basic usage with context manager
    lock = DistributedLock()
    async with lock.acquire_lock("my-task", timeout=30):
        # Critical section - only one instance can execute this
        await do_work()
    
    # Manual lock management
    lock = DistributedLock()
    if await lock.acquire("my-task", timeout=30):
        try:
            await do_work()
        finally:
            await lock.release("my-task")
    
    # Worker helper functions
    if await acquire_worker_lock("analytics_flush", "hourly_flush"):
        try:
            await flush_analytics()
        finally:
            await release_worker_lock("analytics_flush", "hourly_flush")
"""

import asyncio
import logging
import os
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import AsyncIterator, Optional

import redis.asyncio as redis

logger = logging.getLogger(__name__)

# Lock key prefix for all distributed locks
LOCK_KEY_PREFIX = "aurastream:lock:"

# Default lock timeout in seconds
DEFAULT_LOCK_TIMEOUT = 30

# Maximum time to wait when blocking for lock acquisition
DEFAULT_BLOCKING_TIMEOUT = 10


@dataclass
class LockInfo:
    """Information about an acquired lock."""
    lock_name: str
    lock_id: str
    acquired_at: datetime
    expires_at: datetime
    timeout: int


class LockAcquisitionError(Exception):
    """Raised when lock acquisition fails."""
    def __init__(self, lock_name: str, reason: str = "unknown"):
        self.lock_name = lock_name
        self.reason = reason
        super().__init__(f"Failed to acquire lock '{lock_name}': {reason}")


class LockReleaseError(Exception):
    """Raised when lock release fails."""
    def __init__(self, lock_name: str, reason: str = "unknown"):
        self.lock_name = lock_name
        self.reason = reason
        super().__init__(f"Failed to release lock '{lock_name}': {reason}")


class DistributedLock:
    """
    Redis-based distributed lock for coordinating workers.
    
    Uses Redis SETNX (SET if Not eXists) with expiration to implement
    a simple but effective distributed lock. Each lock has a unique ID
    to ensure only the owner can release it.
    
    Attributes:
        redis_url: Redis connection URL
        _client: Redis client instance
        _locks: Dictionary tracking locks held by this instance
    
    Example:
        lock = DistributedLock()
        
        # Using context manager (recommended)
        async with lock.acquire_lock("job-123", timeout=60):
            await process_job()
        
        # Manual management
        acquired = await lock.acquire("job-123", timeout=60)
        if acquired:
            try:
                await process_job()
            finally:
                await lock.release("job-123")
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize the distributed lock service.
        
        Args:
            redis_url: Redis connection URL. Defaults to REDIS_URL env var
                      or redis://localhost:6379
        """
        self._redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self._client: Optional[redis.Redis] = None
        self._locks: dict[str, LockInfo] = {}
        
        logger.debug(f"DistributedLock initialized with Redis URL: {self._redis_url.split('@')[-1]}")
    
    async def _get_client(self) -> redis.Redis:
        """Get or create Redis client."""
        if self._client is None:
            self._client = redis.from_url(self._redis_url, decode_responses=True)
        return self._client
    
    def _get_lock_key(self, lock_name: str) -> str:
        """Generate the Redis key for a lock."""
        return f"{LOCK_KEY_PREFIX}{lock_name}"
    
    def _generate_lock_id(self) -> str:
        """Generate a unique lock ID for ownership tracking."""
        return str(uuid.uuid4())
    
    async def acquire(
        self,
        lock_name: str,
        timeout: int = DEFAULT_LOCK_TIMEOUT,
        blocking: bool = False,
        blocking_timeout: int = DEFAULT_BLOCKING_TIMEOUT,
    ) -> bool:
        """
        Attempt to acquire a distributed lock.
        
        Uses Redis SETNX with expiration to atomically acquire the lock.
        The lock automatically expires after the timeout to prevent deadlocks.
        
        Args:
            lock_name: Unique name for the lock (e.g., "analytics-flush", "job-123")
            timeout: Lock expiration time in seconds (default: 30)
            blocking: If True, wait for lock to become available (default: False)
            blocking_timeout: Maximum time to wait when blocking (default: 10 seconds)
        
        Returns:
            True if lock was acquired, False otherwise
        
        Example:
            if await lock.acquire("my-task", timeout=60):
                try:
                    await do_work()
                finally:
                    await lock.release("my-task")
        """
        lock_key = self._get_lock_key(lock_name)
        lock_id = self._generate_lock_id()
        
        try:
            client = await self._get_client()
            
            if blocking:
                # Blocking mode: retry until timeout
                start_time = asyncio.get_event_loop().time()
                while True:
                    acquired = await client.set(
                        lock_key,
                        lock_id,
                        nx=True,  # Only set if not exists
                        ex=timeout,  # Expiration in seconds
                    )
                    
                    if acquired:
                        break
                    
                    elapsed = asyncio.get_event_loop().time() - start_time
                    if elapsed >= blocking_timeout:
                        logger.warning(
                            f"Lock '{lock_name}' acquisition timed out after {blocking_timeout}s"
                        )
                        return False
                    
                    # Wait before retrying (exponential backoff with jitter)
                    wait_time = min(0.1 * (2 ** int(elapsed)), 1.0)
                    await asyncio.sleep(wait_time)
            else:
                # Non-blocking mode: single attempt
                acquired = await client.set(
                    lock_key,
                    lock_id,
                    nx=True,
                    ex=timeout,
                )
            
            if acquired:
                now = datetime.now(timezone.utc)
                from datetime import timedelta
                lock_info = LockInfo(
                    lock_name=lock_name,
                    lock_id=lock_id,
                    acquired_at=now,
                    expires_at=now + timedelta(seconds=timeout),
                    timeout=timeout,
                )
                self._locks[lock_name] = lock_info
                
                logger.info(
                    f"Lock '{lock_name}' acquired (id={lock_id[:8]}..., timeout={timeout}s)"
                )
                return True
            else:
                logger.debug(f"Lock '{lock_name}' is already held by another process")
                return False
                
        except redis.ConnectionError as e:
            logger.error(f"Redis connection error while acquiring lock '{lock_name}': {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error acquiring lock '{lock_name}': {e}")
            return False
    
    async def release(self, lock_name: str) -> bool:
        """
        Release a distributed lock.
        
        Only releases the lock if it was acquired by this instance (verified
        by lock ID). This prevents accidentally releasing locks held by other
        processes.
        
        Args:
            lock_name: Name of the lock to release
        
        Returns:
            True if lock was released, False if lock was not held or already expired
        
        Example:
            await lock.release("my-task")
        """
        lock_key = self._get_lock_key(lock_name)
        lock_info = self._locks.get(lock_name)
        
        if not lock_info:
            logger.warning(f"Attempted to release lock '{lock_name}' that was not acquired by this instance")
            return False
        
        try:
            client = await self._get_client()
            
            # Use Lua script for atomic check-and-delete
            # This ensures we only delete the lock if we own it
            lua_script = """
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
            """
            
            result = await client.eval(lua_script, 1, lock_key, lock_info.lock_id)
            
            # Remove from local tracking
            del self._locks[lock_name]
            
            if result == 1:
                logger.info(f"Lock '{lock_name}' released (id={lock_info.lock_id[:8]}...)")
                return True
            else:
                logger.warning(
                    f"Lock '{lock_name}' was not released - may have expired or been taken by another process"
                )
                return False
                
        except redis.ConnectionError as e:
            logger.error(f"Redis connection error while releasing lock '{lock_name}': {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error releasing lock '{lock_name}': {e}")
            return False
    
    async def is_locked(self, lock_name: str) -> bool:
        """
        Check if a lock is currently held.
        
        Note: This is a point-in-time check. The lock status may change
        immediately after this call returns.
        
        Args:
            lock_name: Name of the lock to check
        
        Returns:
            True if the lock is currently held, False otherwise
        
        Example:
            if await lock.is_locked("my-task"):
                print("Task is already running")
        """
        lock_key = self._get_lock_key(lock_name)
        
        try:
            client = await self._get_client()
            value = await client.get(lock_key)
            return value is not None
            
        except redis.ConnectionError as e:
            logger.error(f"Redis connection error while checking lock '{lock_name}': {e}")
            # Return True to be safe - assume locked if we can't check
            return True
        except Exception as e:
            logger.error(f"Unexpected error checking lock '{lock_name}': {e}")
            return True
    
    async def extend(self, lock_name: str, additional_time: int) -> bool:
        """
        Extend the expiration time of a held lock.
        
        Useful for long-running tasks that need more time than initially
        estimated.
        
        Args:
            lock_name: Name of the lock to extend
            additional_time: Additional seconds to add to the lock timeout
        
        Returns:
            True if lock was extended, False if lock was not held or expired
        
        Example:
            # Extend lock by 30 more seconds
            await lock.extend("my-task", 30)
        """
        lock_key = self._get_lock_key(lock_name)
        lock_info = self._locks.get(lock_name)
        
        if not lock_info:
            logger.warning(f"Attempted to extend lock '{lock_name}' that was not acquired by this instance")
            return False
        
        try:
            client = await self._get_client()
            
            # Use Lua script for atomic check-and-extend
            lua_script = """
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("expire", KEYS[1], ARGV[2])
            else
                return 0
            end
            """
            
            new_timeout = lock_info.timeout + additional_time
            result = await client.eval(lua_script, 1, lock_key, lock_info.lock_id, new_timeout)
            
            if result == 1:
                lock_info.timeout = new_timeout
                logger.info(f"Lock '{lock_name}' extended by {additional_time}s (new timeout: {new_timeout}s)")
                return True
            else:
                logger.warning(f"Lock '{lock_name}' could not be extended - may have expired")
                return False
                
        except Exception as e:
            logger.error(f"Error extending lock '{lock_name}': {e}")
            return False
    
    @asynccontextmanager
    async def acquire_lock(
        self,
        lock_name: str,
        timeout: int = DEFAULT_LOCK_TIMEOUT,
        blocking: bool = False,
        blocking_timeout: int = DEFAULT_BLOCKING_TIMEOUT,
        raise_on_failure: bool = True,
    ) -> AsyncIterator[bool]:
        """
        Context manager for acquiring and automatically releasing a lock.
        
        This is the recommended way to use distributed locks as it ensures
        the lock is always released, even if an exception occurs.
        
        Args:
            lock_name: Unique name for the lock
            timeout: Lock expiration time in seconds (default: 30)
            blocking: If True, wait for lock to become available
            blocking_timeout: Maximum time to wait when blocking
            raise_on_failure: If True, raise LockAcquisitionError on failure
        
        Yields:
            True if lock was acquired, False otherwise (only if raise_on_failure=False)
        
        Raises:
            LockAcquisitionError: If lock cannot be acquired and raise_on_failure=True
        
        Example:
            async with lock.acquire_lock("my-task", timeout=60):
                await do_work()
            
            # Or with error handling
            async with lock.acquire_lock("my-task", raise_on_failure=False) as acquired:
                if acquired:
                    await do_work()
                else:
                    print("Could not acquire lock")
        """
        acquired = await self.acquire(
            lock_name,
            timeout=timeout,
            blocking=blocking,
            blocking_timeout=blocking_timeout,
        )
        
        if not acquired and raise_on_failure:
            raise LockAcquisitionError(lock_name, "lock is held by another process")
        
        try:
            yield acquired
        finally:
            if acquired:
                await self.release(lock_name)
    
    async def close(self) -> None:
        """Close the Redis connection and release all held locks."""
        # Release all locks held by this instance
        for lock_name in list(self._locks.keys()):
            await self.release(lock_name)
        
        if self._client is not None:
            await self._client.aclose()
            self._client = None
            logger.info("DistributedLock connection closed")


# =============================================================================
# Helper Functions for Workers
# =============================================================================

def _get_worker_lock_name(worker_name: str, task_name: str) -> str:
    """
    Generate a standardized lock name for worker tasks.
    
    Args:
        worker_name: Name of the worker (e.g., "analytics_flush", "generation")
        task_name: Name of the specific task (e.g., "hourly_flush", "job-123")
    
    Returns:
        Formatted lock name: "worker:{worker_name}:{task_name}"
    """
    return f"worker:{worker_name}:{task_name}"


# Global lock instance for helper functions
_global_lock: Optional[DistributedLock] = None


def _get_global_lock() -> DistributedLock:
    """Get or create the global distributed lock instance."""
    global _global_lock
    if _global_lock is None:
        _global_lock = DistributedLock()
    return _global_lock


async def acquire_worker_lock(
    worker_name: str,
    task_name: str,
    timeout: int = DEFAULT_LOCK_TIMEOUT,
) -> bool:
    """
    Acquire a lock for a worker task.
    
    Convenience function for workers to acquire locks with standardized
    naming convention.
    
    Args:
        worker_name: Name of the worker (e.g., "analytics_flush", "generation")
        task_name: Name of the specific task (e.g., "hourly_flush", "job-123")
        timeout: Lock expiration time in seconds (default: 30)
    
    Returns:
        True if lock was acquired, False otherwise
    
    Example:
        if await acquire_worker_lock("analytics_flush", "hourly_flush", timeout=300):
            try:
                await flush_analytics()
            finally:
                await release_worker_lock("analytics_flush", "hourly_flush")
    """
    lock = _get_global_lock()
    lock_name = _get_worker_lock_name(worker_name, task_name)
    return await lock.acquire(lock_name, timeout=timeout)


async def release_worker_lock(worker_name: str, task_name: str) -> bool:
    """
    Release a lock for a worker task.
    
    Convenience function for workers to release locks with standardized
    naming convention.
    
    Args:
        worker_name: Name of the worker (e.g., "analytics_flush", "generation")
        task_name: Name of the specific task (e.g., "hourly_flush", "job-123")
    
    Returns:
        True if lock was released, False otherwise
    
    Example:
        await release_worker_lock("analytics_flush", "hourly_flush")
    """
    lock = _get_global_lock()
    lock_name = _get_worker_lock_name(worker_name, task_name)
    return await lock.release(lock_name)


async def is_worker_task_locked(worker_name: str, task_name: str) -> bool:
    """
    Check if a worker task is currently locked.
    
    Args:
        worker_name: Name of the worker
        task_name: Name of the specific task
    
    Returns:
        True if the task is locked, False otherwise
    """
    lock = _get_global_lock()
    lock_name = _get_worker_lock_name(worker_name, task_name)
    return await lock.is_locked(lock_name)


@asynccontextmanager
async def worker_lock(
    worker_name: str,
    task_name: str,
    timeout: int = DEFAULT_LOCK_TIMEOUT,
    raise_on_failure: bool = True,
) -> AsyncIterator[bool]:
    """
    Context manager for worker task locks.
    
    Convenience function combining acquire and release with standardized
    naming convention.
    
    Args:
        worker_name: Name of the worker
        task_name: Name of the specific task
        timeout: Lock expiration time in seconds
        raise_on_failure: If True, raise LockAcquisitionError on failure
    
    Yields:
        True if lock was acquired
    
    Example:
        async with worker_lock("analytics_flush", "hourly_flush", timeout=300):
            await flush_analytics()
    """
    lock = _get_global_lock()
    lock_name = _get_worker_lock_name(worker_name, task_name)
    
    async with lock.acquire_lock(
        lock_name,
        timeout=timeout,
        raise_on_failure=raise_on_failure,
    ) as acquired:
        yield acquired


async def close_global_lock() -> None:
    """Close the global distributed lock instance."""
    global _global_lock
    if _global_lock is not None:
        await _global_lock.close()
        _global_lock = None


def reset_global_lock() -> None:
    """Reset the global lock instance (for testing)."""
    global _global_lock
    _global_lock = None


__all__ = [
    # Main class
    "DistributedLock",
    # Data classes
    "LockInfo",
    # Exceptions
    "LockAcquisitionError",
    "LockReleaseError",
    # Helper functions
    "acquire_worker_lock",
    "release_worker_lock",
    "is_worker_task_locked",
    "worker_lock",
    # Cleanup
    "close_global_lock",
    "reset_global_lock",
    # Constants
    "DEFAULT_LOCK_TIMEOUT",
    "DEFAULT_BLOCKING_TIMEOUT",
    "LOCK_KEY_PREFIX",
]
