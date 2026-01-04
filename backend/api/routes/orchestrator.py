"""
Orchestrator Dashboard API Routes.

Provides endpoints for monitoring the Head Orchestrator and all workers.
"""

import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from backend.database.redis_client import get_redis_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orchestrator", tags=["orchestrator"])


# =============================================================================
# Response Models
# =============================================================================

class WorkerStatus(BaseModel):
    """Status of a single worker."""
    name: str
    type: str
    mode: str
    enabled: bool
    running: bool
    last_run: Optional[str] = None
    last_success: Optional[str] = None
    last_error: Optional[str] = None
    consecutive_failures: int = 0
    health_status: str = "unknown"
    avg_duration_ms: float = 0
    success_rate: float = 1.0
    total_executions: int = 0


class OrchestratorStatus(BaseModel):
    """Overall orchestrator status."""
    state: str
    instance_id: str
    is_leader: bool
    uptime_seconds: int
    started_at: Optional[str] = None
    total_executions: int = 0
    successful_executions: int = 0
    failed_executions: int = 0
    success_rate: float = 1.0


class ScoreReport(BaseModel):
    """Worker execution score report."""
    worker_name: str
    execution_id: str
    started_at: str
    completed_at: str
    success: bool
    duration_ms: int
    error: Optional[str] = None
    reliability_score: float = 100.0
    performance_score: float = 100.0
    data_quality_score: float = 100.0
    resource_score: float = 100.0
    overall_score: float = 100.0
    anomalies: List[str] = []
    recommendations: List[str] = []


class AnomalyAlert(BaseModel):
    """Anomaly alert."""
    alert_id: str
    anomaly_type: str
    severity: str
    worker_name: str
    message: str
    detected_at: str
    resolved: bool = False
    resolved_at: Optional[str] = None


class DashboardSummary(BaseModel):
    """Complete dashboard summary."""
    orchestrator: OrchestratorStatus
    workers: List[WorkerStatus]
    recent_scores: List[ScoreReport]
    active_anomalies: List[AnomalyAlert]
    metrics: Dict[str, Any]


class TimeSeriesPoint(BaseModel):
    """Single point in time series."""
    timestamp: str
    value: float


class WorkerMetrics(BaseModel):
    """Detailed metrics for a worker."""
    worker_name: str
    total_executions: int
    successful_executions: int
    failed_executions: int
    success_rate: float
    avg_duration_ms: float
    p50_duration_ms: float
    p95_duration_ms: float
    p99_duration_ms: float
    last_24h_executions: int
    last_24h_failures: int
    execution_history: List[TimeSeriesPoint]
    duration_history: List[TimeSeriesPoint]


# =============================================================================
# Redis Key Constants
# =============================================================================

ORCHESTRATOR_PREFIX = "orchestrator:head:"
METRICS_KEY = f"{ORCHESTRATOR_PREFIX}metrics"
HEALTH_SUMMARY_KEY = f"{ORCHESTRATOR_PREFIX}health_summary"
WORKER_STATE_PREFIX = f"{ORCHESTRATOR_PREFIX}worker:"
SCORE_PREFIX = f"{ORCHESTRATOR_PREFIX}scores:"
ANOMALY_PREFIX = f"{ORCHESTRATOR_PREFIX}anomalies:"


# =============================================================================
# Helper Functions
# =============================================================================

async def get_orchestrator_metrics(redis_client) -> Dict[str, Any]:
    """Get orchestrator metrics from Redis."""
    data = await redis_client.get(METRICS_KEY)
    if data:
        return json.loads(data)
    return {}


async def get_worker_states(redis_client) -> Dict[str, Dict[str, Any]]:
    """Get all worker states from Redis."""
    workers = {}
    
    # Known worker names
    worker_names = [
        "youtube_worker", "twitch_streams_worker", "clip_radar_worker",
        "creator_intel_worker", "thumbnail_intel_worker",
        "intel_aggregation_hourly", "intel_aggregation_daily",
        "generation_worker", "twitch_worker", "playbook_worker",
        "analytics_flush_worker", "coach_cleanup_worker", "clip_radar_recap_worker",
        "sse_guardian",
    ]
    
    for name in worker_names:
        key = f"{WORKER_STATE_PREFIX}{name}"
        data = await redis_client.get(key)
        if data:
            workers[name] = json.loads(data)
        else:
            workers[name] = {"name": name, "enabled": True}
        
        # Check for heartbeat to determine if worker is alive
        heartbeat_key = f"orchestrator:health:heartbeat:{name}"
        heartbeat = await redis_client.get(heartbeat_key)
        if heartbeat:
            workers[name]["has_heartbeat"] = True
            workers[name]["last_heartbeat"] = heartbeat
        else:
            workers[name]["has_heartbeat"] = False
        
        # Always check execution report stats for metrics
        # This provides total_executions, avg_duration_ms, success_rate
        stats_key = f"orchestrator:stats:{name}"
        stats_data = await redis_client.get(stats_key)
        if stats_data:
            stats = json.loads(stats_data)
            # Use stats for last_run if not already set from orchestrator state
            if not workers[name].get("last_run"):
                workers[name]["last_run"] = stats.get("last_execution")
                workers[name]["last_success"] = stats.get("last_execution")
            # Always use stats for these metrics (more accurate than orchestrator state)
            workers[name]["total_executions"] = stats.get("total_executions", 0)
            workers[name]["avg_duration_ms"] = stats.get("avg_duration_ms", 0)
            workers[name]["success_rate"] = (
                stats.get("successful_executions", 0) / max(stats.get("total_executions", 1), 1)
            )
    
    return workers


async def get_recent_scores(redis_client, limit: int = 20) -> List[Dict[str, Any]]:
    """Get recent score reports."""
    scores = []
    
    # Get from each worker's recent list
    worker_names = [
        "youtube_worker", "twitch_streams_worker", "clip_radar_worker",
        "creator_intel_worker", "thumbnail_intel_worker",
        "intel_aggregation_hourly", "intel_aggregation_daily",
        "playbook_worker", "analytics_flush_worker", "coach_cleanup_worker",
        "clip_radar_recap_worker", "sse_guardian",
    ]
    
    for worker in worker_names:
        list_key = f"{SCORE_PREFIX}{worker}:recent"
        exec_ids = await redis_client.lrange(list_key, 0, 4)  # Last 5 per worker
        
        for exec_id in exec_ids:
            if isinstance(exec_id, bytes):
                exec_id = exec_id.decode()
            
            score_key = f"{SCORE_PREFIX}{worker}:{exec_id}"
            data = await redis_client.get(score_key)
            if data:
                scores.append(json.loads(data))
    
    # Sort by completed_at descending
    scores.sort(key=lambda x: x.get("completed_at", ""), reverse=True)
    return scores[:limit]


async def get_active_anomalies(redis_client) -> List[Dict[str, Any]]:
    """Get active (unresolved) anomalies."""
    anomalies = []
    
    # Scan for anomaly keys
    cursor = 0
    while True:
        cursor, keys = await redis_client.scan(cursor, match=f"{ANOMALY_PREFIX}*", count=100)
        for key in keys:
            data = await redis_client.get(key)
            if data:
                anomaly = json.loads(data)
                if not anomaly.get("resolved", False):
                    anomalies.append(anomaly)
        if cursor == 0:
            break
    
    # Sort by detected_at descending
    anomalies.sort(key=lambda x: x.get("detected_at", ""), reverse=True)
    return anomalies


# =============================================================================
# API Endpoints
# =============================================================================

@router.get("/status", response_model=OrchestratorStatus)
async def get_orchestrator_status():
    """Get current orchestrator status."""
    redis_client = get_redis_client()
    
    metrics = await get_orchestrator_metrics(redis_client)
    
    if not metrics:
        return OrchestratorStatus(
            state="unknown",
            instance_id="unknown",
            is_leader=False,
            uptime_seconds=0,
        )
    
    total = metrics.get("total_executions", 0)
    successful = metrics.get("successful_executions", 0)
    
    return OrchestratorStatus(
        state=metrics.get("state", "unknown"),
        instance_id=metrics.get("instance_id", "unknown"),
        is_leader=metrics.get("is_leader", False),
        uptime_seconds=0,  # Calculate from started_at if available
        started_at=metrics.get("started_at"),
        total_executions=total,
        successful_executions=successful,
        failed_executions=metrics.get("failed_executions", 0),
        success_rate=successful / max(total, 1),
    )


@router.get("/workers", response_model=List[WorkerStatus])
async def get_workers_status():
    """Get status of all workers."""
    redis_client = get_redis_client()
    
    worker_states = await get_worker_states(redis_client)
    health_data = await redis_client.get(HEALTH_SUMMARY_KEY)
    health_summary = json.loads(health_data) if health_data else {}
    
    workers = []
    
    # Worker type and mode mappings
    worker_config = {
        "youtube_worker": ("intel", "continuous"),
        "twitch_streams_worker": ("intel", "continuous"),
        "clip_radar_worker": ("intel", "continuous"),
        "creator_intel_worker": ("intel", "continuous"),
        "thumbnail_intel_worker": ("thumbnail", "continuous"),
        "intel_aggregation_hourly": ("intel", "scheduled"),
        "intel_aggregation_daily": ("intel", "scheduled"),
        "generation_worker": ("generation", "on_demand"),
        "twitch_worker": ("generation", "on_demand"),
        "playbook_worker": ("intel", "continuous"),
        "analytics_flush_worker": ("analytics", "scheduled"),
        "coach_cleanup_worker": ("analytics", "scheduled"),
        "clip_radar_recap_worker": ("intel", "scheduled"),
        "sse_guardian": ("sse", "scheduled"),
    }
    
    for name, state in worker_states.items():
        wtype, mode = worker_config.get(name, ("unknown", "unknown"))
        
        # Get health info if available
        worker_health = health_summary.get("workers", {}).get(name, {})
        
        # Determine health status from heartbeat
        has_heartbeat = state.get("has_heartbeat", False)
        consecutive_failures = state.get("consecutive_failures", 0)
        
        if has_heartbeat:
            if consecutive_failures >= 5:
                health_status = "unhealthy"
            elif consecutive_failures >= 2:
                health_status = "degraded"
            else:
                health_status = "healthy"
        else:
            health_status = worker_health.get("status", "unknown")
        
        # Use stats from execution reports if available
        avg_duration = state.get("avg_duration_ms", worker_health.get("avg_duration_ms", 0))
        success_rate = state.get("success_rate", worker_health.get("success_rate", 1.0))
        total_executions = state.get("total_executions", worker_health.get("total_executions", 0))
        
        workers.append(WorkerStatus(
            name=name,
            type=wtype,
            mode=mode,
            enabled=state.get("is_enabled", True),
            running=state.get("is_running", False),
            last_run=state.get("last_run"),
            last_success=state.get("last_success"),
            last_error=state.get("last_error"),
            consecutive_failures=consecutive_failures,
            health_status=health_status,
            avg_duration_ms=avg_duration,
            success_rate=success_rate,
            total_executions=total_executions,
        ))
    
    return workers


@router.get("/dashboard", response_model=DashboardSummary)
async def get_dashboard_summary():
    """Get complete dashboard summary."""
    redis_client = get_redis_client()
    
    # Get all data in parallel
    orchestrator_metrics = await get_orchestrator_metrics(redis_client)
    worker_states = await get_worker_states(redis_client)
    recent_scores = await get_recent_scores(redis_client, limit=20)
    active_anomalies = await get_active_anomalies(redis_client)
    health_data = await redis_client.get(HEALTH_SUMMARY_KEY)
    health_summary = json.loads(health_data) if health_data else {}
    
    # Build orchestrator status
    total = orchestrator_metrics.get("total_executions", 0)
    successful = orchestrator_metrics.get("successful_executions", 0)
    
    orchestrator = OrchestratorStatus(
        state=orchestrator_metrics.get("state", "unknown"),
        instance_id=orchestrator_metrics.get("instance_id", "unknown"),
        is_leader=orchestrator_metrics.get("is_leader", False),
        uptime_seconds=0,
        started_at=orchestrator_metrics.get("started_at"),
        total_executions=total,
        successful_executions=successful,
        failed_executions=orchestrator_metrics.get("failed_executions", 0),
        success_rate=successful / max(total, 1),
    )
    
    # Build worker statuses
    worker_config = {
        "youtube_worker": ("intel", "continuous"),
        "twitch_streams_worker": ("intel", "continuous"),
        "clip_radar_worker": ("intel", "continuous"),
        "creator_intel_worker": ("intel", "continuous"),
        "thumbnail_intel_worker": ("thumbnail", "continuous"),
        "intel_aggregation_hourly": ("intel", "scheduled"),
        "intel_aggregation_daily": ("intel", "scheduled"),
        "generation_worker": ("generation", "on_demand"),
        "twitch_worker": ("generation", "on_demand"),
        "playbook_worker": ("intel", "continuous"),
        "analytics_flush_worker": ("analytics", "scheduled"),
        "coach_cleanup_worker": ("analytics", "scheduled"),
        "clip_radar_recap_worker": ("intel", "scheduled"),
        "sse_guardian": ("sse", "scheduled"),
    }
    
    workers = []
    for name, state in worker_states.items():
        wtype, mode = worker_config.get(name, ("unknown", "unknown"))
        worker_health = health_summary.get("workers", {}).get(name, {})
        
        # Determine health status from heartbeat
        has_heartbeat = state.get("has_heartbeat", False)
        consecutive_failures = state.get("consecutive_failures", 0)
        
        if has_heartbeat:
            if consecutive_failures >= 5:
                health_status = "unhealthy"
            elif consecutive_failures >= 2:
                health_status = "degraded"
            else:
                health_status = "healthy"
        else:
            health_status = worker_health.get("status", "unknown")
        
        # Use stats from worker state (populated from execution reports) - these are more accurate
        # Fall back to health_summary only if state doesn't have the data
        avg_duration = state.get("avg_duration_ms") or worker_health.get("avg_duration_ms", 0)
        success_rate = state.get("success_rate") if state.get("success_rate") is not None else worker_health.get("success_rate")
        total_executions = state.get("total_executions") or worker_health.get("total_executions", 0)
        
        # Only default to 1.0 if we have NO execution data at all
        # If total_executions is 0, success_rate should also be 0 (no data, not 100%)
        if success_rate is None:
            success_rate = 1.0 if total_executions > 0 else 0.0
        
        workers.append(WorkerStatus(
            name=name,
            type=wtype,
            mode=mode,
            enabled=state.get("is_enabled", True),
            running=state.get("is_running", False),
            last_run=state.get("last_run"),
            last_success=state.get("last_success"),
            last_error=state.get("last_error"),
            consecutive_failures=consecutive_failures,
            health_status=health_status,
            avg_duration_ms=avg_duration,
            success_rate=success_rate,
            total_executions=total_executions,
        ))
    
    # Build score reports
    scores = [ScoreReport(**s) for s in recent_scores]
    
    # Build anomaly alerts
    anomalies = [AnomalyAlert(**a) for a in active_anomalies]
    
    # Calculate aggregate metrics
    total_workers = len(workers)
    healthy_workers = sum(1 for w in workers if w.health_status == "healthy")
    running_workers = sum(1 for w in workers if w.running)
    
    metrics = {
        "total_workers": total_workers,
        "healthy_workers": healthy_workers,
        "running_workers": running_workers,
        "active_anomalies": len(anomalies),
        "avg_success_rate": sum(w.success_rate for w in workers) / max(total_workers, 1),
        "total_executions_24h": sum(w.total_executions for w in workers),
    }
    
    return DashboardSummary(
        orchestrator=orchestrator,
        workers=workers,
        recent_scores=scores,
        active_anomalies=anomalies,
        metrics=metrics,
    )


@router.get("/workers/{worker_name}/metrics", response_model=WorkerMetrics)
async def get_worker_metrics(worker_name: str):
    """Get detailed metrics for a specific worker."""
    try:
        from backend.workers.execution_report import get_recent_executions, get_worker_stats
        
        # Get recent executions from the new system
        reports = get_recent_executions(worker_name, limit=100)
        stats = get_worker_stats(worker_name)
        
        if not reports:
            return WorkerMetrics(
                worker_name=worker_name,
                total_executions=0,
                successful_executions=0,
                failed_executions=0,
                success_rate=1.0,
                avg_duration_ms=0,
                p50_duration_ms=0,
                p95_duration_ms=0,
                p99_duration_ms=0,
                last_24h_executions=0,
                last_24h_failures=0,
                execution_history=[],
                duration_history=[],
            )
        
        # Calculate metrics from reports
        total = len(reports)
        successful = sum(1 for r in reports if r.get("outcome") == "success")
        failed = sum(1 for r in reports if r.get("outcome") == "failed")
        
        durations = [r.get("duration_ms", 0) for r in reports]
        sorted_durations = sorted(durations)
        
        avg_duration = sum(durations) / max(len(durations), 1)
        p50_duration = sorted_durations[len(sorted_durations) // 2] if sorted_durations else 0
        p95_idx = min(int(len(sorted_durations) * 0.95), len(sorted_durations) - 1)
        p99_idx = min(int(len(sorted_durations) * 0.99), len(sorted_durations) - 1)
        p95_duration = sorted_durations[p95_idx] if sorted_durations else 0
        p99_duration = sorted_durations[p99_idx] if sorted_durations else 0
        
        # Last 24h metrics
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=24)
        
        last_24h = [r for r in reports if r.get("completed_at", "") > cutoff.isoformat()]
        last_24h_executions = len(last_24h)
        last_24h_failures = sum(1 for r in last_24h if r.get("outcome") == "failed")
        
        # Build time series (most recent first, reverse for chart)
        execution_history = []
        duration_history = []
        
        for report in reports[:50]:
            ts = report.get("completed_at", "")
            execution_history.append(TimeSeriesPoint(
                timestamp=ts,
                value=1.0 if report.get("outcome") == "success" else 0.0,
            ))
            duration_history.append(TimeSeriesPoint(
                timestamp=ts,
                value=report.get("duration_ms", 0),
            ))
        
        # Use stats for totals if available (more accurate)
        if stats:
            total = stats.get("total_executions", total)
            successful = stats.get("successful_executions", successful)
            failed = stats.get("failed_executions", failed)
            avg_duration = stats.get("avg_duration_ms", avg_duration)
        
        return WorkerMetrics(
            worker_name=worker_name,
            total_executions=total,
            successful_executions=successful,
            failed_executions=failed,
            success_rate=successful / max(total, 1),
            avg_duration_ms=avg_duration,
            p50_duration_ms=p50_duration,
            p95_duration_ms=p95_duration,
            p99_duration_ms=p99_duration,
            last_24h_executions=last_24h_executions,
            last_24h_failures=last_24h_failures,
            execution_history=execution_history,
            duration_history=duration_history,
        )
        
    except ImportError:
        return WorkerMetrics(
            worker_name=worker_name,
            total_executions=0,
            successful_executions=0,
            failed_executions=0,
            success_rate=1.0,
            avg_duration_ms=0,
            p50_duration_ms=0,
            p95_duration_ms=0,
            p99_duration_ms=0,
            last_24h_executions=0,
            last_24h_failures=0,
            execution_history=[],
            duration_history=[],
        )
    except Exception as e:
        logger.error(f"Failed to get worker metrics: {e}")
        return WorkerMetrics(
            worker_name=worker_name,
            total_executions=0,
            successful_executions=0,
            failed_executions=0,
            success_rate=1.0,
            avg_duration_ms=0,
            p50_duration_ms=0,
            p95_duration_ms=0,
            p99_duration_ms=0,
            last_24h_executions=0,
            last_24h_failures=0,
            execution_history=[],
            duration_history=[],
        )


@router.get("/scores", response_model=List[ScoreReport])
async def get_score_reports(
    worker_name: Optional[str] = None,
    limit: int = Query(default=50, le=200),
):
    """Get score reports, optionally filtered by worker."""
    redis_client = get_redis_client()
    
    if worker_name:
        # Get scores for specific worker
        list_key = f"{SCORE_PREFIX}{worker_name}:recent"
        exec_ids = await redis_client.lrange(list_key, 0, limit - 1)
        
        scores = []
        for exec_id in exec_ids:
            if isinstance(exec_id, bytes):
                exec_id = exec_id.decode()
            
            score_key = f"{SCORE_PREFIX}{worker_name}:{exec_id}"
            data = await redis_client.get(score_key)
            if data:
                scores.append(ScoreReport(**json.loads(data)))
        
        return scores
    else:
        # Get all recent scores
        scores = await get_recent_scores(redis_client, limit=limit)
        return [ScoreReport(**s) for s in scores]


@router.get("/anomalies", response_model=List[AnomalyAlert])
async def get_anomalies(
    include_resolved: bool = False,
    limit: int = Query(default=50, le=200),
):
    """Get anomaly alerts."""
    redis_client = get_redis_client()
    
    anomalies = []
    
    cursor = 0
    while True:
        cursor, keys = await redis_client.scan(cursor, match=f"{ANOMALY_PREFIX}*", count=100)
        for key in keys:
            data = await redis_client.get(key)
            if data:
                anomaly = json.loads(data)
                if include_resolved or not anomaly.get("resolved", False):
                    anomalies.append(anomaly)
        if cursor == 0:
            break
    
    anomalies.sort(key=lambda x: x.get("detected_at", ""), reverse=True)
    return [AnomalyAlert(**a) for a in anomalies[:limit]]


@router.post("/workers/{worker_name}/trigger")
async def trigger_worker(worker_name: str):
    """Manually trigger a worker execution."""
    # This would need to communicate with the orchestrator
    # For now, return a placeholder response
    return {
        "success": True,
        "message": f"Trigger request sent for {worker_name}",
        "note": "Worker will execute on next orchestrator tick if conditions are met",
    }


@router.post("/workers/{worker_name}/enable")
async def enable_worker(worker_name: str):
    """Enable a worker."""
    redis_client = get_redis_client()
    
    key = f"{WORKER_STATE_PREFIX}{worker_name}"
    data = await redis_client.get(key)
    
    if data:
        state = json.loads(data)
        state["is_enabled"] = True
        await redis_client.set(key, json.dumps(state))
    
    return {"success": True, "worker": worker_name, "enabled": True}


@router.post("/workers/{worker_name}/disable")
async def disable_worker(worker_name: str):
    """Disable a worker."""
    redis_client = get_redis_client()
    
    key = f"{WORKER_STATE_PREFIX}{worker_name}"
    data = await redis_client.get(key)
    
    if data:
        state = json.loads(data)
        state["is_enabled"] = False
        await redis_client.set(key, json.dumps(state))
    
    return {"success": True, "worker": worker_name, "enabled": False}


# =============================================================================
# Enhanced Execution Reports & Learning Endpoints
# =============================================================================

class DataVerificationResponse(BaseModel):
    """Data verification details from execution."""
    records_fetched: int = 0
    records_processed: int = 0
    records_stored: int = 0
    records_failed: int = 0
    records_skipped: int = 0
    newest_record_age_seconds: Optional[float] = None
    oldest_record_age_seconds: Optional[float] = None
    validation_checks_passed: int = 0
    validation_checks_failed: int = 0
    api_calls_made: int = 0
    api_calls_succeeded: int = 0
    api_rate_limited: bool = False
    api_quota_remaining: Optional[int] = None
    cache_hits: int = 0
    cache_misses: int = 0
    quality_level: str = "unknown"


class ResourceMetricsResponse(BaseModel):
    """Resource usage metrics."""
    memory_peak_mb: float = 0
    cpu_percent_avg: float = 0
    network_bytes_received: int = 0
    database_query_count: int = 0
    redis_operations: int = 0


class ExecutionReportResponse(BaseModel):
    """Full execution report."""
    worker_name: str
    execution_id: str
    started_at: str
    completed_at: Optional[str] = None
    duration_ms: int = 0
    outcome: str
    error_message: Optional[str] = None
    data_verification: DataVerificationResponse
    resource_metrics: ResourceMetricsResponse
    custom_metrics: Dict[str, Any] = {}
    reliability_score: float = 100.0
    performance_score: float = 100.0
    data_quality_score: float = 100.0
    resource_efficiency_score: float = 100.0
    overall_score: float = 100.0
    anomalies: List[str] = []
    recommendations: List[str] = []


class WorkerStatsResponse(BaseModel):
    """Aggregated worker statistics."""
    worker_name: str
    total_executions: int = 0
    successful_executions: int = 0
    failed_executions: int = 0
    success_rate: float = 1.0
    avg_duration_ms: float = 0
    min_duration_ms: float = 0
    max_duration_ms: float = 0
    total_records_processed: int = 0
    avg_records_per_run: float = 0
    avg_overall_score: float = 100.0
    score_trend: List[float] = []
    duration_trend: List[float] = []
    first_execution: Optional[str] = None
    last_execution: Optional[str] = None


class HourlyPerformance(BaseModel):
    """Performance data for a specific hour."""
    hour: int
    avg_score: float
    avg_duration_ms: float
    execution_count: int


class LearningInsightsResponse(BaseModel):
    """Learning and optimization insights for a worker."""
    worker_name: str
    optimal_hour_utc: Optional[int] = None
    optimal_day: Optional[int] = None  # 0=Monday
    hourly_performance: List[HourlyPerformance] = []
    data_volume_trend: str = "stable"  # increasing, decreasing, stable
    suggested_optimizations: List[str] = []


class SystemLearningResponse(BaseModel):
    """System-wide learning insights."""
    total_executions_24h: int = 0
    avg_system_score: float = 100.0
    busiest_hour_utc: Optional[int] = None
    quietest_hour_utc: Optional[int] = None
    workers_needing_attention: List[str] = []
    optimization_opportunities: List[str] = []


@router.get("/workers/{worker_name}/executions", response_model=List[ExecutionReportResponse])
async def get_worker_executions(
    worker_name: str,
    limit: int = Query(default=20, le=100),
):
    """Get recent execution reports for a worker with full details."""
    try:
        from backend.workers.execution_report import get_recent_executions
        
        reports = get_recent_executions(worker_name, limit)
        
        result = []
        for r in reports:
            dv = r.get("data_verification", {})
            rm = r.get("resource_metrics", {})
            
            result.append(ExecutionReportResponse(
                worker_name=r.get("worker_name", worker_name),
                execution_id=r.get("execution_id", ""),
                started_at=r.get("started_at", ""),
                completed_at=r.get("completed_at"),
                duration_ms=r.get("duration_ms", 0),
                outcome=r.get("outcome", "unknown"),
                error_message=r.get("error_message"),
                data_verification=DataVerificationResponse(
                    records_fetched=dv.get("records_fetched", 0),
                    records_processed=dv.get("records_processed", 0),
                    records_stored=dv.get("records_stored", 0),
                    records_failed=dv.get("records_failed", 0),
                    records_skipped=dv.get("records_skipped", 0),
                    newest_record_age_seconds=dv.get("newest_record_age_seconds"),
                    oldest_record_age_seconds=dv.get("oldest_record_age_seconds"),
                    validation_checks_passed=dv.get("validation_checks_passed", 0),
                    validation_checks_failed=dv.get("validation_checks_failed", 0),
                    api_calls_made=dv.get("api_calls_made", 0),
                    api_calls_succeeded=dv.get("api_calls_succeeded", 0),
                    api_rate_limited=dv.get("api_rate_limited", False),
                    api_quota_remaining=dv.get("api_quota_remaining"),
                    cache_hits=dv.get("cache_hits", 0),
                    cache_misses=dv.get("cache_misses", 0),
                    quality_level=dv.get("quality_level", "unknown"),
                ),
                resource_metrics=ResourceMetricsResponse(
                    memory_peak_mb=rm.get("memory_peak_mb", 0),
                    cpu_percent_avg=rm.get("cpu_percent_avg", 0),
                    network_bytes_received=rm.get("network_bytes_received", 0),
                    database_query_count=rm.get("database_query_count", 0),
                    redis_operations=rm.get("redis_operations", 0),
                ),
                custom_metrics=r.get("custom_metrics", {}),
                reliability_score=r.get("reliability_score", 100.0),
                performance_score=r.get("performance_score", 100.0),
                data_quality_score=r.get("data_quality_score", 100.0),
                resource_efficiency_score=r.get("resource_efficiency_score", 100.0),
                overall_score=r.get("overall_score", 100.0),
                anomalies=r.get("anomalies", []),
                recommendations=r.get("recommendations", []),
            ))
        
        return result
        
    except ImportError:
        return []
    except Exception as e:
        logger.error(f"Failed to get worker executions: {e}")
        return []


@router.get("/workers/{worker_name}/stats", response_model=WorkerStatsResponse)
async def get_worker_statistics(worker_name: str):
    """Get aggregated statistics for a worker."""
    try:
        from backend.workers.execution_report import get_worker_stats
        
        stats = get_worker_stats(worker_name)
        
        if not stats:
            return WorkerStatsResponse(worker_name=worker_name)
        
        total = stats.get("total_executions", 0)
        successful = stats.get("successful_executions", 0)
        
        return WorkerStatsResponse(
            worker_name=worker_name,
            total_executions=total,
            successful_executions=successful,
            failed_executions=stats.get("failed_executions", 0),
            success_rate=successful / max(total, 1),
            avg_duration_ms=stats.get("avg_duration_ms", 0),
            min_duration_ms=stats.get("min_duration_ms", 0),
            max_duration_ms=stats.get("max_duration_ms", 0),
            total_records_processed=stats.get("total_records_processed", 0),
            avg_records_per_run=stats.get("avg_records_per_run", 0),
            avg_overall_score=stats.get("avg_overall_score", 100.0),
            score_trend=stats.get("score_history", []),
            duration_trend=stats.get("duration_history", []),
            first_execution=stats.get("first_execution"),
            last_execution=stats.get("last_execution"),
        )
        
    except ImportError:
        return WorkerStatsResponse(worker_name=worker_name)
    except Exception as e:
        logger.error(f"Failed to get worker stats: {e}")
        return WorkerStatsResponse(worker_name=worker_name)


@router.get("/workers/{worker_name}/learning", response_model=LearningInsightsResponse)
async def get_worker_learning_insights(worker_name: str):
    """Get learning and optimization insights for a worker."""
    try:
        from backend.workers.execution_report import get_worker_learning_data
        
        learning = get_worker_learning_data(worker_name)
        
        if not learning:
            return LearningInsightsResponse(worker_name=worker_name)
        
        # Calculate hourly performance summary
        hourly_perf = []
        for hour_str, perfs in learning.get("hourly_performance", {}).items():
            if perfs:
                avg_score = sum(p["score"] for p in perfs) / len(perfs)
                avg_duration = sum(p["duration_ms"] for p in perfs) / len(perfs)
                hourly_perf.append(HourlyPerformance(
                    hour=int(hour_str),
                    avg_score=avg_score,
                    avg_duration_ms=avg_duration,
                    execution_count=len(perfs),
                ))
        
        # Determine data volume trend
        volumes = learning.get("data_volume_trend", [])
        trend = "stable"
        if len(volumes) >= 10:
            first_half = sum(volumes[:len(volumes)//2]) / (len(volumes)//2)
            second_half = sum(volumes[len(volumes)//2:]) / (len(volumes) - len(volumes)//2)
            if second_half > first_half * 1.2:
                trend = "increasing"
            elif second_half < first_half * 0.8:
                trend = "decreasing"
        
        return LearningInsightsResponse(
            worker_name=worker_name,
            optimal_hour_utc=learning.get("optimal_hour"),
            optimal_day=learning.get("optimal_day"),
            hourly_performance=sorted(hourly_perf, key=lambda x: x.hour),
            data_volume_trend=trend,
            suggested_optimizations=learning.get("suggested_optimizations", []),
        )
        
    except ImportError:
        return LearningInsightsResponse(worker_name=worker_name)
    except Exception as e:
        logger.error(f"Failed to get learning insights: {e}")
        return LearningInsightsResponse(worker_name=worker_name)


@router.get("/learning/system", response_model=SystemLearningResponse)
async def get_system_learning_insights():
    """Get system-wide learning and optimization insights."""
    redis_client = get_redis_client()
    
    worker_names = [
        "youtube_worker", "twitch_streams_worker", "clip_radar_worker",
        "creator_intel_worker", "thumbnail_intel_worker",
        "intel_aggregation_hourly", "intel_aggregation_daily",
        "playbook_worker", "analytics_flush_worker", "coach_cleanup_worker",
        "clip_radar_recap_worker", "sse_guardian",
    ]
    
    total_executions = 0
    total_score = 0
    score_count = 0
    workers_needing_attention = []
    hourly_counts = {h: 0 for h in range(24)}
    
    try:
        from backend.workers.execution_report import get_worker_stats, get_worker_learning_data
        
        for worker_name in worker_names:
            stats = get_worker_stats(worker_name)
            if stats:
                total_executions += stats.get("total_executions", 0)
                
                avg_score = stats.get("avg_overall_score", 100)
                if avg_score > 0:
                    total_score += avg_score
                    score_count += 1
                
                # Check if worker needs attention
                if avg_score < 70:
                    workers_needing_attention.append(worker_name)
                elif stats.get("failed_executions", 0) > stats.get("successful_executions", 0) * 0.2:
                    workers_needing_attention.append(worker_name)
            
            learning = get_worker_learning_data(worker_name)
            if learning:
                for hour_str, perfs in learning.get("hourly_performance", {}).items():
                    hourly_counts[int(hour_str)] += len(perfs)
        
        # Find busiest and quietest hours
        busiest_hour = max(hourly_counts, key=hourly_counts.get) if any(hourly_counts.values()) else None
        quietest_hour = min(hourly_counts, key=hourly_counts.get) if any(hourly_counts.values()) else None
        
        # Generate optimization opportunities
        opportunities = []
        if busiest_hour is not None and hourly_counts[busiest_hour] > hourly_counts.get(quietest_hour, 0) * 3:
            opportunities.append(f"Consider spreading load from hour {busiest_hour} UTC")
        if workers_needing_attention:
            opportunities.append(f"{len(workers_needing_attention)} workers have low scores - investigate")
        
        return SystemLearningResponse(
            total_executions_24h=total_executions,
            avg_system_score=total_score / max(score_count, 1),
            busiest_hour_utc=busiest_hour,
            quietest_hour_utc=quietest_hour,
            workers_needing_attention=workers_needing_attention,
            optimization_opportunities=opportunities,
        )
        
    except ImportError:
        return SystemLearningResponse()
    except Exception as e:
        logger.error(f"Failed to get system learning insights: {e}")
        return SystemLearningResponse()


@router.get("/data-quality/summary")
async def get_data_quality_summary():
    """Get a summary of data quality across all workers."""
    try:
        from backend.workers.execution_report import get_recent_executions
        
        worker_names = [
            "youtube_worker", "twitch_streams_worker", "clip_radar_worker",
            "creator_intel_worker", "playbook_worker",
        ]
        
        summary = {
            "overall_quality": "unknown",
            "workers": {},
            "total_records_24h": 0,
            "failed_validations_24h": 0,
            "api_rate_limits_24h": 0,
        }
        
        quality_scores = []
        
        for worker_name in worker_names:
            reports = get_recent_executions(worker_name, limit=10)
            
            if not reports:
                summary["workers"][worker_name] = {"quality": "no_data", "last_check": None}
                continue
            
            latest = reports[0]
            dv = latest.get("data_verification", {})
            
            quality = "unknown"
            dq_score = latest.get("data_quality_score", 0)
            if dq_score >= 90:
                quality = "excellent"
            elif dq_score >= 70:
                quality = "good"
            elif dq_score >= 50:
                quality = "degraded"
            else:
                quality = "poor"
            
            quality_scores.append(dq_score)
            
            summary["workers"][worker_name] = {
                "quality": quality,
                "score": dq_score,
                "last_check": latest.get("completed_at"),
                "records_processed": dv.get("records_processed", 0),
                "validation_failures": dv.get("validation_checks_failed", 0),
                "api_rate_limited": dv.get("api_rate_limited", False),
            }
            
            summary["total_records_24h"] += dv.get("records_processed", 0)
            summary["failed_validations_24h"] += dv.get("validation_checks_failed", 0)
            if dv.get("api_rate_limited"):
                summary["api_rate_limits_24h"] += 1
        
        # Calculate overall quality
        if quality_scores:
            avg_score = sum(quality_scores) / len(quality_scores)
            if avg_score >= 90:
                summary["overall_quality"] = "excellent"
            elif avg_score >= 70:
                summary["overall_quality"] = "good"
            elif avg_score >= 50:
                summary["overall_quality"] = "degraded"
            else:
                summary["overall_quality"] = "poor"
        
        return summary
        
    except ImportError:
        return {"overall_quality": "unknown", "workers": {}, "error": "execution_report module not available"}
    except Exception as e:
        logger.error(f"Failed to get data quality summary: {e}")
        return {"overall_quality": "error", "error": str(e)}


# =============================================================================
# Scheduled Worker Heartbeat Endpoints
# =============================================================================

class ScheduledWorkerStatus(BaseModel):
    """Status of a scheduled worker."""
    worker_name: str
    status: str  # "ready", "offline", "running"
    heartbeat_active: bool
    last_idle_heartbeat: Optional[str] = None
    next_scheduled_run: Optional[str] = None
    schedule_interval_seconds: Optional[int] = None


@router.get("/scheduled-workers", response_model=List[ScheduledWorkerStatus])
async def get_scheduled_workers_status():
    """
    Get status of all scheduled workers.
    
    Returns heartbeat status for workers that run on a schedule,
    allowing you to verify they're online and ready before their next run.
    """
    try:
        from backend.workers.heartbeat import get_all_scheduled_workers
        
        workers = get_all_scheduled_workers()
        return [ScheduledWorkerStatus(**w) for w in workers]
        
    except ImportError:
        return []
    except Exception as e:
        logger.error(f"Failed to get scheduled workers: {e}")
        return []


@router.get("/scheduled-workers/{worker_name}", response_model=ScheduledWorkerStatus)
async def get_scheduled_worker_status(worker_name: str):
    """
    Get status of a specific scheduled worker.
    
    Returns heartbeat status indicating if the worker is online and ready.
    """
    try:
        from backend.workers.heartbeat import get_scheduled_worker_status
        
        status = get_scheduled_worker_status(worker_name)
        
        if not status:
            return ScheduledWorkerStatus(
                worker_name=worker_name,
                status="unknown",
                heartbeat_active=False,
            )
        
        return ScheduledWorkerStatus(**status)
        
    except ImportError:
        return ScheduledWorkerStatus(
            worker_name=worker_name,
            status="unknown",
            heartbeat_active=False,
        )
    except Exception as e:
        logger.error(f"Failed to get scheduled worker status: {e}")
        return ScheduledWorkerStatus(
            worker_name=worker_name,
            status="error",
            heartbeat_active=False,
        )
