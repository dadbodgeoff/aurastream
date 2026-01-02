"""
Creator Intel V2 - Health Checker

Health check endpoints for the Intel worker system.
Provides status information for monitoring and alerting.

Uses Supabase client for database operations (not asyncpg).
"""

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional

import redis.asyncio as redis
from supabase import Client

logger = logging.getLogger(__name__)


class HealthStatus(Enum):
    """Health status levels."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class ComponentHealth:
    """Health status for a single component."""
    name: str
    status: HealthStatus
    message: Optional[str] = None
    last_check: Optional[datetime] = None
    details: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "name": self.name,
            "status": self.status.value,
            "message": self.message,
            "last_check": self.last_check.isoformat() if self.last_check else None,
            "details": self.details,
        }


@dataclass
class SystemHealth:
    """Overall system health status."""
    status: HealthStatus
    components: List[ComponentHealth]
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "status": self.status.value,
            "timestamp": self.timestamp.isoformat(),
            "components": [c.to_dict() for c in self.components],
        }


class HealthChecker:
    """
    Health checker for the Intel worker system.
    
    Checks:
    - Redis connectivity
    - PostgreSQL connectivity (via Supabase)
    - Orchestrator status
    - Task health (failures, staleness)
    - Quota status
    - Data freshness
    
    Usage:
        from backend.database import get_supabase_client
        
        db = get_supabase_client()
        checker = HealthChecker(redis_client, db)
        health = await checker.check_all()
        
        if health.status == HealthStatus.UNHEALTHY:
            alert_ops_team()
    """
    
    # Thresholds
    TASK_FAILURE_THRESHOLD = 3  # Consecutive failures before unhealthy
    DATA_STALE_HOURS = 6  # Hours before data is considered stale
    QUOTA_WARNING_PERCENT = 80  # Quota usage warning threshold
    
    def __init__(
        self,
        redis_client: redis.Redis,
        db: Client,
    ) -> None:
        """
        Initialize the health checker.
        
        Args:
            redis_client: Redis client
            db: Supabase client for database operations
        """
        self.redis = redis_client
        self.db = db
    
    async def check_all(self) -> SystemHealth:
        """
        Run all health checks.
        
        Returns:
            SystemHealth with overall status and component details
        """
        components = []
        
        # Check Redis
        components.append(await self._check_redis())
        
        # Check PostgreSQL
        components.append(await self._check_postgres())
        
        # Check orchestrator
        components.append(await self._check_orchestrator())
        
        # Check tasks
        components.append(await self._check_tasks())
        
        # Check quota
        components.append(await self._check_quota())
        
        # Check data freshness
        components.append(await self._check_data_freshness())
        
        # Determine overall status
        statuses = [c.status for c in components]
        
        if HealthStatus.UNHEALTHY in statuses:
            overall = HealthStatus.UNHEALTHY
        elif HealthStatus.DEGRADED in statuses:
            overall = HealthStatus.DEGRADED
        elif HealthStatus.UNKNOWN in statuses:
            overall = HealthStatus.DEGRADED
        else:
            overall = HealthStatus.HEALTHY
        
        return SystemHealth(
            status=overall,
            components=components,
        )
    
    async def _check_redis(self) -> ComponentHealth:
        """Check Redis connectivity."""
        try:
            await self.redis.ping()
            
            # Check memory usage
            info = await self.redis.info("memory")
            used_memory = info.get("used_memory_human", "unknown")
            
            return ComponentHealth(
                name="redis",
                status=HealthStatus.HEALTHY,
                message="Connected",
                last_check=datetime.now(timezone.utc),
                details={"memory_used": used_memory},
            )
        except Exception as e:
            return ComponentHealth(
                name="redis",
                status=HealthStatus.UNHEALTHY,
                message=f"Connection failed: {e}",
                last_check=datetime.now(timezone.utc),
            )
    
    async def _check_postgres(self) -> ComponentHealth:
        """Check PostgreSQL connectivity via Supabase."""
        try:
            # Simple query to verify connection
            response = self.db.table("intel_worker_state").select("id").limit(1).execute()
            
            return ComponentHealth(
                name="postgresql",
                status=HealthStatus.HEALTHY,
                message="Connected via Supabase",
                last_check=datetime.now(timezone.utc),
                details={"connection": "supabase_client"},
            )
        except Exception as e:
            # Table might not exist yet, but connection works
            error_str = str(e).lower()
            if "does not exist" in error_str or "relation" in error_str:
                return ComponentHealth(
                    name="postgresql",
                    status=HealthStatus.DEGRADED,
                    message="Connected but intel tables may not exist",
                    last_check=datetime.now(timezone.utc),
                    details={"warning": "Run migrations to create intel tables"},
                )
            
            return ComponentHealth(
                name="postgresql",
                status=HealthStatus.UNHEALTHY,
                message=f"Connection failed: {e}",
                last_check=datetime.now(timezone.utc),
            )
    
    async def _check_orchestrator(self) -> ComponentHealth:
        """Check orchestrator status."""
        try:
            metrics_data = await self.redis.get("orchestrator:metrics")
            
            if not metrics_data:
                return ComponentHealth(
                    name="orchestrator",
                    status=HealthStatus.UNKNOWN,
                    message="No metrics found - orchestrator may not be running",
                    last_check=datetime.now(timezone.utc),
                )
            
            metrics = json.loads(metrics_data)
            
            # Check last health check time
            last_check_str = metrics.get("last_health_check")
            if last_check_str:
                last_check = datetime.fromisoformat(last_check_str)
                age = (datetime.now(timezone.utc) - last_check).total_seconds()
                
                if age > 300:  # 5 minutes
                    return ComponentHealth(
                        name="orchestrator",
                        status=HealthStatus.DEGRADED,
                        message=f"Last health check was {age:.0f}s ago",
                        last_check=datetime.now(timezone.utc),
                        details=metrics,
                    )
            
            return ComponentHealth(
                name="orchestrator",
                status=HealthStatus.HEALTHY,
                message="Running",
                last_check=datetime.now(timezone.utc),
                details=metrics,
            )
        except Exception as e:
            return ComponentHealth(
                name="orchestrator",
                status=HealthStatus.UNKNOWN,
                message=f"Failed to check: {e}",
                last_check=datetime.now(timezone.utc),
            )
    
    async def _check_tasks(self) -> ComponentHealth:
        """Check task health."""
        try:
            # Get all task states
            task_keys = await self.redis.keys("orchestrator:task:*")
            
            failing_tasks = []
            stale_tasks = []
            
            for key in task_keys:
                state_data = await self.redis.get(key)
                if not state_data:
                    continue
                
                state = json.loads(state_data)
                task_name = key.split(":")[-1]
                
                # Check consecutive failures
                failures = state.get("consecutive_failures", 0)
                if failures >= self.TASK_FAILURE_THRESHOLD:
                    failing_tasks.append(task_name)
                
                # Check staleness
                last_success_str = state.get("last_success")
                if last_success_str:
                    last_success = datetime.fromisoformat(last_success_str)
                    age_hours = (datetime.now(timezone.utc) - last_success).total_seconds() / 3600
                    
                    if age_hours > self.DATA_STALE_HOURS:
                        stale_tasks.append(task_name)
            
            if failing_tasks:
                return ComponentHealth(
                    name="tasks",
                    status=HealthStatus.UNHEALTHY,
                    message=f"Failing tasks: {', '.join(failing_tasks)}",
                    last_check=datetime.now(timezone.utc),
                    details={"failing": failing_tasks, "stale": stale_tasks},
                )
            
            if stale_tasks:
                return ComponentHealth(
                    name="tasks",
                    status=HealthStatus.DEGRADED,
                    message=f"Stale tasks: {', '.join(stale_tasks)}",
                    last_check=datetime.now(timezone.utc),
                    details={"stale": stale_tasks},
                )
            
            return ComponentHealth(
                name="tasks",
                status=HealthStatus.HEALTHY,
                message=f"{len(task_keys)} tasks healthy",
                last_check=datetime.now(timezone.utc),
            )
        except Exception as e:
            return ComponentHealth(
                name="tasks",
                status=HealthStatus.UNKNOWN,
                message=f"Failed to check: {e}",
                last_check=datetime.now(timezone.utc),
            )
    
    async def _check_quota(self) -> ComponentHealth:
        """Check API quota status."""
        try:
            quota_data = await self.redis.get("youtube:quota:bucket")
            
            if not quota_data:
                return ComponentHealth(
                    name="quota",
                    status=HealthStatus.UNKNOWN,
                    message="No quota data found",
                    last_check=datetime.now(timezone.utc),
                )
            
            quota = json.loads(quota_data)
            units_used = quota.get("units_used", 0)
            units_limit = quota.get("units_limit", 10000)
            usage_percent = (units_used / units_limit) * 100 if units_limit > 0 else 0
            
            if usage_percent >= 95:
                status = HealthStatus.UNHEALTHY
                message = f"Quota nearly exhausted: {usage_percent:.1f}%"
            elif usage_percent >= self.QUOTA_WARNING_PERCENT:
                status = HealthStatus.DEGRADED
                message = f"Quota usage high: {usage_percent:.1f}%"
            else:
                status = HealthStatus.HEALTHY
                message = f"Quota usage: {usage_percent:.1f}%"
            
            return ComponentHealth(
                name="quota",
                status=status,
                message=message,
                last_check=datetime.now(timezone.utc),
                details={
                    "units_used": units_used,
                    "units_remaining": units_limit - units_used,
                    "usage_percent": round(usage_percent, 1),
                },
            )
        except Exception as e:
            return ComponentHealth(
                name="quota",
                status=HealthStatus.UNKNOWN,
                message=f"Failed to check: {e}",
                last_check=datetime.now(timezone.utc),
            )
    
    async def _check_data_freshness(self) -> ComponentHealth:
        """Check data freshness across categories."""
        try:
            # Check a sample of game data
            sample_games = ["fortnite", "valorant", "minecraft"]
            stale_games = []
            
            for game in sample_games:
                data = await self.redis.get(f"youtube:games:{game}")
                if not data:
                    stale_games.append(game)
                    continue
                
                try:
                    parsed = json.loads(data)
                    fetched_at_str = parsed.get("fetched_at")
                    if fetched_at_str:
                        fetched_at = datetime.fromisoformat(fetched_at_str)
                        age_hours = (datetime.now(timezone.utc) - fetched_at).total_seconds() / 3600
                        
                        if age_hours > self.DATA_STALE_HOURS:
                            stale_games.append(game)
                except (json.JSONDecodeError, ValueError):
                    stale_games.append(game)
            
            if len(stale_games) == len(sample_games):
                return ComponentHealth(
                    name="data_freshness",
                    status=HealthStatus.UNHEALTHY,
                    message="All sample data is stale",
                    last_check=datetime.now(timezone.utc),
                    details={"stale_games": stale_games},
                )
            
            if stale_games:
                return ComponentHealth(
                    name="data_freshness",
                    status=HealthStatus.DEGRADED,
                    message=f"Some data is stale: {', '.join(stale_games)}",
                    last_check=datetime.now(timezone.utc),
                    details={"stale_games": stale_games},
                )
            
            return ComponentHealth(
                name="data_freshness",
                status=HealthStatus.HEALTHY,
                message="Data is fresh",
                last_check=datetime.now(timezone.utc),
            )
        except Exception as e:
            return ComponentHealth(
                name="data_freshness",
                status=HealthStatus.UNKNOWN,
                message=f"Failed to check: {e}",
                last_check=datetime.now(timezone.utc),
            )
    
    async def get_simple_status(self) -> Dict[str, Any]:
        """
        Get a simple health status for quick checks.
        
        Returns:
            Dictionary with status and timestamp
        """
        try:
            await self.redis.ping()
            
            # Simple Supabase check
            self.db.table("intel_worker_state").select("id").limit(1).execute()
            
            return {
                "status": "ok",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
