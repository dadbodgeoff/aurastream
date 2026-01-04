"""
Worker Heartbeat Utility.

Allows workers to report their health status to the Head Orchestrator.
Workers should call send_heartbeat() periodically (e.g., every 30 seconds).

For scheduled workers that run at specific intervals:
- Use send_idle_heartbeat() to indicate the worker process is alive and ready
- This allows monitoring scheduled workers even when they're not actively running
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import redis

logger = logging.getLogger(__name__)

# Redis key prefix matching the orchestrator
HEARTBEAT_KEY_PREFIX = "orchestrator:health:heartbeat:"
WORKER_STATE_KEY_PREFIX = "orchestrator:head:worker:"
SCHEDULED_WORKER_PREFIX = "orchestrator:scheduled:"


def get_redis_client() -> redis.Redis:
    """Get synchronous Redis client."""
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    return redis.from_url(redis_url, decode_responses=True)


def send_heartbeat(
    worker_name: str,
    is_running: bool = True,
    last_success: Optional[datetime] = None,
    last_error: Optional[str] = None,
    consecutive_failures: int = 0,
    memory_mb: float = 0,
    cpu_percent: float = 0,
) -> bool:
    """
    Send a heartbeat to the orchestrator.
    
    Args:
        worker_name: Name of the worker (e.g., "youtube_worker")
        is_running: Whether the worker is currently processing
        last_success: Timestamp of last successful execution
        last_error: Last error message if any
        consecutive_failures: Number of consecutive failures
        memory_mb: Current memory usage in MB
        cpu_percent: Current CPU usage percentage
    
    Returns:
        True if heartbeat was sent successfully
    """
    try:
        client = get_redis_client()
        now = datetime.now(timezone.utc)
        
        # Write heartbeat timestamp
        heartbeat_key = f"{HEARTBEAT_KEY_PREFIX}{worker_name}"
        client.setex(heartbeat_key, 120, now.isoformat())  # 2 minute TTL
        
        # Update worker state
        state_key = f"{WORKER_STATE_KEY_PREFIX}{worker_name}"
        existing = client.get(state_key)
        
        state = json.loads(existing) if existing else {}
        state.update({
            "last_heartbeat": now.isoformat(),
            "is_running": is_running,
            "is_enabled": state.get("is_enabled", True),
            "consecutive_failures": consecutive_failures,
        })
        
        if last_success:
            state["last_success"] = last_success.isoformat()
        if last_error:
            state["last_error"] = last_error
        
        # Store with 24 hour TTL
        client.setex(state_key, 86400, json.dumps(state))
        
        logger.debug(f"Heartbeat sent for {worker_name}")
        return True
        
    except Exception as e:
        logger.warning(f"Failed to send heartbeat for {worker_name}: {e}")
        return False


def send_idle_heartbeat(
    worker_name: str,
    next_scheduled_run: Optional[datetime] = None,
    schedule_interval_seconds: Optional[int] = None,
) -> bool:
    """
    Send an idle heartbeat for scheduled workers.
    
    This indicates the worker process is alive and ready to run when scheduled.
    Use this for workers that run on a schedule (cron-like) rather than continuously.
    
    Args:
        worker_name: Name of the worker (e.g., "analytics_flush_worker")
        next_scheduled_run: When the worker is next expected to run
        schedule_interval_seconds: How often the worker runs (e.g., 3600 for hourly)
    
    Returns:
        True if heartbeat was sent successfully
    """
    try:
        client = get_redis_client()
        now = datetime.now(timezone.utc)
        
        # Write heartbeat timestamp (longer TTL for scheduled workers)
        heartbeat_key = f"{HEARTBEAT_KEY_PREFIX}{worker_name}"
        # TTL should be longer than schedule interval to avoid false "offline" status
        ttl = max(300, (schedule_interval_seconds or 3600) + 120)  # At least 5 min, or interval + 2 min
        client.setex(heartbeat_key, ttl, now.isoformat())
        
        # Update worker state
        state_key = f"{WORKER_STATE_KEY_PREFIX}{worker_name}"
        existing = client.get(state_key)
        
        state = json.loads(existing) if existing else {}
        state.update({
            "last_heartbeat": now.isoformat(),
            "is_running": False,  # Idle, not running
            "is_enabled": state.get("is_enabled", True),
            "is_scheduled": True,
            "idle_since": state.get("idle_since") or now.isoformat(),
        })
        
        if next_scheduled_run:
            state["next_scheduled_run"] = next_scheduled_run.isoformat()
        if schedule_interval_seconds:
            state["schedule_interval_seconds"] = schedule_interval_seconds
        
        # Store with 24 hour TTL
        client.setex(state_key, 86400, json.dumps(state))
        
        # Also store in scheduled worker registry for easy lookup
        scheduled_key = f"{SCHEDULED_WORKER_PREFIX}{worker_name}"
        scheduled_info = {
            "worker_name": worker_name,
            "last_idle_heartbeat": now.isoformat(),
            "next_scheduled_run": next_scheduled_run.isoformat() if next_scheduled_run else None,
            "schedule_interval_seconds": schedule_interval_seconds,
            "status": "ready",
        }
        client.setex(scheduled_key, 86400, json.dumps(scheduled_info))
        
        logger.debug(f"Idle heartbeat sent for scheduled worker {worker_name}")
        return True
        
    except Exception as e:
        logger.warning(f"Failed to send idle heartbeat for {worker_name}: {e}")
        return False


def get_scheduled_worker_status(worker_name: str) -> Optional[dict]:
    """
    Get the status of a scheduled worker.
    
    Returns:
        Dict with worker status or None if not found
    """
    try:
        client = get_redis_client()
        
        # Check scheduled worker registry
        scheduled_key = f"{SCHEDULED_WORKER_PREFIX}{worker_name}"
        data = client.get(scheduled_key)
        
        if data:
            info = json.loads(data)
            
            # Check if heartbeat is still valid
            heartbeat_key = f"{HEARTBEAT_KEY_PREFIX}{worker_name}"
            heartbeat = client.get(heartbeat_key)
            
            if heartbeat:
                info["status"] = "ready"
                info["heartbeat_active"] = True
            else:
                info["status"] = "offline"
                info["heartbeat_active"] = False
            
            return info
        
        return None
        
    except Exception as e:
        logger.warning(f"Failed to get scheduled worker status for {worker_name}: {e}")
        return None


def get_all_scheduled_workers() -> list:
    """
    Get status of all scheduled workers.
    
    Returns:
        List of scheduled worker status dicts
    """
    try:
        client = get_redis_client()
        workers = []
        
        # Scan for scheduled worker keys
        cursor = 0
        while True:
            cursor, keys = client.scan(cursor, match=f"{SCHEDULED_WORKER_PREFIX}*", count=100)
            for key in keys:
                data = client.get(key)
                if data:
                    info = json.loads(data)
                    worker_name = info.get("worker_name")
                    
                    # Check heartbeat status
                    heartbeat_key = f"{HEARTBEAT_KEY_PREFIX}{worker_name}"
                    heartbeat = client.get(heartbeat_key)
                    
                    info["heartbeat_active"] = heartbeat is not None
                    info["status"] = "ready" if heartbeat else "offline"
                    
                    workers.append(info)
            
            if cursor == 0:
                break
        
        return workers
        
    except Exception as e:
        logger.warning(f"Failed to get scheduled workers: {e}")
        return []


def report_execution(
    worker_name: str,
    success: bool,
    duration_ms: int,
    error: Optional[str] = None,
) -> bool:
    """
    Report a worker execution result.
    
    Args:
        worker_name: Name of the worker
        success: Whether execution succeeded
        duration_ms: Execution duration in milliseconds
        error: Error message if failed
    
    Returns:
        True if report was sent successfully
    """
    try:
        client = get_redis_client()
        now = datetime.now(timezone.utc)
        
        state_key = f"{WORKER_STATE_KEY_PREFIX}{worker_name}"
        existing = client.get(state_key)
        
        state = json.loads(existing) if existing else {}
        
        state["last_run"] = now.isoformat()
        state["last_heartbeat"] = now.isoformat()
        
        if success:
            state["last_success"] = now.isoformat()
            state["last_error"] = None
            state["consecutive_failures"] = 0
        else:
            state["last_error"] = error
            state["consecutive_failures"] = state.get("consecutive_failures", 0) + 1
        
        client.setex(state_key, 86400, json.dumps(state))
        
        # Also update heartbeat
        heartbeat_key = f"{HEARTBEAT_KEY_PREFIX}{worker_name}"
        client.setex(heartbeat_key, 120, now.isoformat())
        
        logger.debug(f"Execution reported for {worker_name}: success={success}")
        return True
        
    except Exception as e:
        logger.warning(f"Failed to report execution for {worker_name}: {e}")
        return False
