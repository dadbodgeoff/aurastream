"""
Score Reporter for Worker Orchestrator.

Generates run reports, metrics, and performance scores.
"""

import logging
import statistics
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

from redis import Redis

from .types import (
    RunReport,
    JobMetrics,
    JobStatus,
    WorkerType,
)

logger = logging.getLogger(__name__)


class ScoreReporter:
    """
    Generates score reports and metrics for worker runs.
    
    Features:
    - Periodic report generation (hourly, daily)
    - Performance scoring (0-100)
    - Error aggregation and ranking
    - Trend analysis
    """
    
    # Scoring weights
    RELIABILITY_WEIGHT = 0.4
    PERFORMANCE_WEIGHT = 0.35
    HEALTH_WEIGHT = 0.25
    
    # Thresholds for scoring
    TARGET_SUCCESS_RATE = 0.99  # 99% success rate = 100 score
    TARGET_P95_MS = 30000       # 30 seconds P95 = 100 score
    TARGET_QUEUE_WAIT_MS = 5000 # 5 seconds queue wait = 100 score
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
    
    async def record_job_completion(
        self,
        metrics: JobMetrics,
    ) -> None:
        """
        Record metrics for a completed job.
        
        This is called by workers when jobs complete (success or failure).
        """
        import json
        
        # Store in time-series for reporting
        timestamp = datetime.utcnow()
        hour_key = timestamp.strftime("%Y%m%d%H")
        
        # Store metric
        metric_key = f"orchestrator:metrics:{hour_key}:{metrics.worker_type.value}"
        metric_data = {
            "job_id": metrics.job_id,
            "status": metrics.status.value,
            "queue_wait_ms": metrics.queue_wait_ms,
            "processing_ms": metrics.processing_ms,
            "total_ms": metrics.total_ms,
            "error_code": metrics.error_code,
            "retry_count": metrics.retry_count,
            "timestamp": timestamp.isoformat(),
        }
        
        self.redis.rpush(metric_key, json.dumps(metric_data))
        self.redis.expire(metric_key, 86400 * 7)  # 7 day retention
        
        # Update counters
        counter_key = f"orchestrator:counters:{hour_key}:{metrics.worker_type.value}"
        self.redis.hincrby(counter_key, "total", 1)
        self.redis.hincrby(counter_key, metrics.status.value, 1)
        self.redis.expire(counter_key, 86400 * 7)
        
        # Track errors
        if metrics.error_code:
            error_key = f"orchestrator:errors:{hour_key}"
            error_data = {
                "code": metrics.error_code,
                "message": metrics.error_message,
                "worker_type": metrics.worker_type.value,
                "job_id": metrics.job_id,
                "timestamp": timestamp.isoformat(),
            }
            self.redis.rpush(error_key, json.dumps(error_data))
            self.redis.expire(error_key, 86400 * 7)
        
        logger.debug(
            f"Recorded job metrics: job_id={metrics.job_id}, "
            f"status={metrics.status.value}, processing_ms={metrics.processing_ms}"
        )
    
    async def generate_report(
        self,
        period_hours: int = 1,
        worker_type: Optional[WorkerType] = None,
    ) -> RunReport:
        """
        Generate a score report for the specified period.
        
        Args:
            period_hours: Number of hours to include in report
            worker_type: Optional filter by worker type
            
        Returns:
            RunReport with scores and metrics
        """
        import json
        
        report_id = str(uuid.uuid4())
        period_end = datetime.utcnow()
        period_start = period_end - timedelta(hours=period_hours)
        
        # Collect metrics for the period
        all_metrics: List[Dict[str, Any]] = []
        all_errors: List[Dict[str, Any]] = []
        
        # Iterate through hours in the period
        current = period_start
        while current <= period_end:
            hour_key = current.strftime("%Y%m%d%H")
            
            # Get metrics for each worker type
            worker_types = [worker_type] if worker_type else list(WorkerType)
            for wt in worker_types:
                if wt is None:
                    continue
                metric_key = f"orchestrator:metrics:{hour_key}:{wt.value}"
                metrics_raw = self.redis.lrange(metric_key, 0, -1)
                for m in metrics_raw:
                    try:
                        all_metrics.append(json.loads(m))
                    except Exception:
                        pass
            
            # Get errors
            error_key = f"orchestrator:errors:{hour_key}"
            errors_raw = self.redis.lrange(error_key, 0, -1)
            for e in errors_raw:
                try:
                    all_errors.append(json.loads(e))
                except Exception:
                    pass
            
            current += timedelta(hours=1)
        
        # Calculate stats
        total_jobs = len(all_metrics)
        successful_jobs = sum(1 for m in all_metrics if m.get("status") == JobStatus.COMPLETED.value)
        failed_jobs = sum(1 for m in all_metrics if m.get("status") == JobStatus.FAILED.value)
        timeout_jobs = sum(1 for m in all_metrics if m.get("status") == JobStatus.TIMEOUT.value)
        retried_jobs = sum(1 for m in all_metrics if m.get("retry_count", 0) > 0)
        
        # Timing stats
        processing_times = [
            m.get("processing_ms", 0) 
            for m in all_metrics 
            if m.get("processing_ms") is not None
        ]
        queue_waits = [
            m.get("queue_wait_ms", 0) 
            for m in all_metrics 
            if m.get("queue_wait_ms") is not None
        ]
        
        avg_processing_ms = statistics.mean(processing_times) if processing_times else 0
        avg_queue_wait_ms = statistics.mean(queue_waits) if queue_waits else 0
        
        # Percentiles
        p50_processing_ms = 0
        p95_processing_ms = 0
        p99_processing_ms = 0
        if processing_times:
            sorted_times = sorted(processing_times)
            p50_processing_ms = sorted_times[len(sorted_times) // 2]
            p95_processing_ms = sorted_times[int(len(sorted_times) * 0.95)]
            p99_processing_ms = sorted_times[int(len(sorted_times) * 0.99)]
        
        # Calculate scores
        reliability_score = self._calculate_reliability_score(
            total_jobs, successful_jobs, failed_jobs, timeout_jobs
        )
        performance_score = self._calculate_performance_score(
            avg_queue_wait_ms, p95_processing_ms
        )
        health_score = self._calculate_health_score(
            retried_jobs, total_jobs, len(all_errors)
        )
        
        overall_score = (
            reliability_score * self.RELIABILITY_WEIGHT +
            performance_score * self.PERFORMANCE_WEIGHT +
            health_score * self.HEALTH_WEIGHT
        )
        
        # Stats by worker type
        stats_by_worker = {}
        for wt in WorkerType:
            wt_metrics = [m for m in all_metrics if m.get("worker_type") == wt.value]
            if wt_metrics:
                wt_successful = sum(1 for m in wt_metrics if m.get("status") == JobStatus.COMPLETED.value)
                wt_processing = [m.get("processing_ms", 0) for m in wt_metrics if m.get("processing_ms")]
                stats_by_worker[wt.value] = {
                    "total": len(wt_metrics),
                    "successful": wt_successful,
                    "failed": len(wt_metrics) - wt_successful,
                    "success_rate": wt_successful / len(wt_metrics) if wt_metrics else 0,
                    "avg_processing_ms": statistics.mean(wt_processing) if wt_processing else 0,
                }
        
        # Top errors
        error_counts: Dict[str, int] = {}
        for e in all_errors:
            code = e.get("code", "UNKNOWN")
            error_counts[code] = error_counts.get(code, 0) + 1
        
        top_errors = [
            {"code": code, "count": count, "percentage": count / len(all_errors) * 100 if all_errors else 0}
            for code, count in sorted(error_counts.items(), key=lambda x: -x[1])[:10]
        ]
        
        # Build report
        report = RunReport(
            report_id=report_id,
            period_start=period_start,
            period_end=period_end,
            overall_score=round(overall_score, 1),
            reliability_score=round(reliability_score, 1),
            performance_score=round(performance_score, 1),
            health_score=round(health_score, 1),
            total_jobs=total_jobs,
            successful_jobs=successful_jobs,
            failed_jobs=failed_jobs,
            timeout_jobs=timeout_jobs,
            retried_jobs=retried_jobs,
            avg_queue_wait_ms=round(avg_queue_wait_ms, 1),
            avg_processing_ms=round(avg_processing_ms, 1),
            p50_processing_ms=round(p50_processing_ms, 1),
            p95_processing_ms=round(p95_processing_ms, 1),
            p99_processing_ms=round(p99_processing_ms, 1),
            stats_by_worker=stats_by_worker,
            anomalies_detected=0,  # Filled by anomaly detector
            anomalies_resolved=0,
            active_anomalies=[],
            top_errors=top_errors,
        )
        
        # Store report
        await self._store_report(report)
        
        logger.info(
            f"Generated report: id={report_id}, period={period_hours}h, "
            f"score={overall_score:.1f}, jobs={total_jobs}"
        )
        
        return report
    
    async def get_report(self, report_id: str) -> Optional[RunReport]:
        """Get a stored report by ID."""
        import json
        key = f"orchestrator:report:{report_id}"
        data = self.redis.get(key)
        if data:
            return self._deserialize_report(json.loads(data))
        return None
    
    async def get_latest_reports(self, count: int = 10) -> List[RunReport]:
        """Get the most recent reports."""
        key = "orchestrator:reports:latest"
        report_ids = self.redis.lrange(key, 0, count - 1)
        
        reports = []
        for rid in report_ids:
            report = await self.get_report(rid.decode() if isinstance(rid, bytes) else rid)
            if report:
                reports.append(report)
        
        return reports
    
    # =========================================================================
    # Scoring Methods
    # =========================================================================
    
    def _calculate_reliability_score(
        self,
        total: int,
        successful: int,
        failed: int,
        timeout: int,
    ) -> float:
        """Calculate reliability score (0-100)."""
        if total == 0:
            return 100.0
        
        success_rate = successful / total
        
        # Scale: 99% = 100, 95% = 80, 90% = 50, <80% = 0
        if success_rate >= self.TARGET_SUCCESS_RATE:
            return 100.0
        elif success_rate >= 0.95:
            return 80 + (success_rate - 0.95) / 0.04 * 20
        elif success_rate >= 0.90:
            return 50 + (success_rate - 0.90) / 0.05 * 30
        elif success_rate >= 0.80:
            return (success_rate - 0.80) / 0.10 * 50
        else:
            return 0.0
    
    def _calculate_performance_score(
        self,
        avg_queue_wait_ms: float,
        p95_processing_ms: float,
    ) -> float:
        """Calculate performance score (0-100)."""
        # Queue wait score (50% weight)
        if avg_queue_wait_ms <= self.TARGET_QUEUE_WAIT_MS:
            queue_score = 100.0
        else:
            # Degrade linearly up to 5x target
            ratio = avg_queue_wait_ms / self.TARGET_QUEUE_WAIT_MS
            queue_score = max(0, 100 - (ratio - 1) * 25)
        
        # P95 processing score (50% weight)
        if p95_processing_ms <= self.TARGET_P95_MS:
            p95_score = 100.0
        else:
            ratio = p95_processing_ms / self.TARGET_P95_MS
            p95_score = max(0, 100 - (ratio - 1) * 25)
        
        return queue_score * 0.5 + p95_score * 0.5
    
    def _calculate_health_score(
        self,
        retried_jobs: int,
        total_jobs: int,
        error_count: int,
    ) -> float:
        """Calculate health score (0-100)."""
        if total_jobs == 0:
            return 100.0
        
        # Retry rate penalty
        retry_rate = retried_jobs / total_jobs
        retry_penalty = min(retry_rate * 100, 30)  # Max 30 point penalty
        
        # Error diversity penalty (many different errors = worse)
        error_penalty = min(error_count / 10, 20)  # Max 20 point penalty
        
        return max(0, 100 - retry_penalty - error_penalty)
    
    # =========================================================================
    # Storage Methods
    # =========================================================================
    
    async def _store_report(self, report: RunReport) -> None:
        """Store report in Redis."""
        import json
        
        # Store report data
        key = f"orchestrator:report:{report.report_id}"
        self.redis.setex(key, 86400 * 30, json.dumps(self._serialize_report(report)))
        
        # Add to latest list
        list_key = "orchestrator:reports:latest"
        self.redis.lpush(list_key, report.report_id)
        self.redis.ltrim(list_key, 0, 99)  # Keep last 100
    
    def _serialize_report(self, report: RunReport) -> Dict[str, Any]:
        """Serialize report to dict."""
        return {
            "report_id": report.report_id,
            "period_start": report.period_start.isoformat(),
            "period_end": report.period_end.isoformat(),
            "overall_score": report.overall_score,
            "reliability_score": report.reliability_score,
            "performance_score": report.performance_score,
            "health_score": report.health_score,
            "total_jobs": report.total_jobs,
            "successful_jobs": report.successful_jobs,
            "failed_jobs": report.failed_jobs,
            "timeout_jobs": report.timeout_jobs,
            "retried_jobs": report.retried_jobs,
            "avg_queue_wait_ms": report.avg_queue_wait_ms,
            "avg_processing_ms": report.avg_processing_ms,
            "p50_processing_ms": report.p50_processing_ms,
            "p95_processing_ms": report.p95_processing_ms,
            "p99_processing_ms": report.p99_processing_ms,
            "stats_by_worker": report.stats_by_worker,
            "anomalies_detected": report.anomalies_detected,
            "anomalies_resolved": report.anomalies_resolved,
            "active_anomalies": report.active_anomalies,
            "top_errors": report.top_errors,
            "generated_at": report.generated_at.isoformat(),
        }
    
    def _deserialize_report(self, data: Dict[str, Any]) -> RunReport:
        """Deserialize report from dict."""
        return RunReport(
            report_id=data["report_id"],
            period_start=datetime.fromisoformat(data["period_start"]),
            period_end=datetime.fromisoformat(data["period_end"]),
            overall_score=data["overall_score"],
            reliability_score=data["reliability_score"],
            performance_score=data["performance_score"],
            health_score=data["health_score"],
            total_jobs=data["total_jobs"],
            successful_jobs=data["successful_jobs"],
            failed_jobs=data["failed_jobs"],
            timeout_jobs=data["timeout_jobs"],
            retried_jobs=data["retried_jobs"],
            avg_queue_wait_ms=data["avg_queue_wait_ms"],
            avg_processing_ms=data["avg_processing_ms"],
            p50_processing_ms=data["p50_processing_ms"],
            p95_processing_ms=data["p95_processing_ms"],
            p99_processing_ms=data["p99_processing_ms"],
            stats_by_worker=data["stats_by_worker"],
            anomalies_detected=data["anomalies_detected"],
            anomalies_resolved=data["anomalies_resolved"],
            active_anomalies=data["active_anomalies"],
            top_errors=data["top_errors"],
            generated_at=datetime.fromisoformat(data["generated_at"]),
        )
