"""
Worker Orchestrator for AuraStream.

Enterprise-grade orchestration of all 14 background workers.

Components:
- HeadOrchestrator: Main orchestrator that conducts the worker symphony
- JobScheduler: Handles job scheduling with priorities
- ScoreReporter: Generates run reports and metrics
- AnomalyDetector: Flags errors and anomalies
- HealthMonitor: Tracks worker health and availability

The 14 Workers Managed:
    DATA COLLECTION (3):
        1. youtube_worker - YouTube trending/games data
        2. twitch_streams_worker - Twitch stream data
        3. clip_radar_worker - Viral clip detection
    
    INTELLIGENCE (2):
        4. creator_intel_worker - Content intelligence
        5. thumbnail_intel_worker - Thumbnail analysis
    
    AGGREGATION (1 with 2 modes):
        6. intel_aggregation_worker - Hourly + Daily rollup
    
    GENERATION (2 - RQ Queue based):
        7. generation_worker - Asset generation
        8. twitch_worker - Twitch asset generation
    
    REPORTING (1):
        9. playbook_worker - Algorithmic playbook
    
    MAINTENANCE (3):
        10. analytics_flush_worker - Redis→PostgreSQL
        11. coach_cleanup_worker - Session cleanup
        12. clip_radar_recap_worker - Daily compression

Usage:
    from backend.workers.orchestrator import get_orchestrator
    
    orchestrator = await get_orchestrator()
    await orchestrator.start()
"""

from .orchestrator import (
    HeadOrchestrator,
    get_orchestrator,
    reset_orchestrator,
    WorkerConfig,
    WorkerScoreReport,
    WorkerExecutionMode,
    OrchestratorState,
)
from .scheduler import JobScheduler
from .reporter import ScoreReporter, RunReport
from .anomaly import AnomalyDetector, AnomalyContext, AnomalySeverity, AnomalyRule
from .health import HealthMonitor, HealthStatus, HealthThresholds, WorkerHealthState
from .types import (
    JobPriority,
    JobStatus,
    WorkerType,
    AnomalyType,
    JobMetrics,
    WorkerHealth,
    AnomalyAlert,
)

__all__ = [
    # Main orchestrator
    "HeadOrchestrator",
    "get_orchestrator",
    "reset_orchestrator",
    "WorkerConfig",
    "WorkerScoreReport",
    "WorkerExecutionMode",
    "OrchestratorState",
    # Scheduler
    "JobScheduler",
    # Reporter
    "ScoreReporter",
    "RunReport",
    # Anomaly detection
    "AnomalyDetector",
    "AnomalyContext",
    "AnomalySeverity",
    "AnomalyRule",
    # Health monitoring
    "HealthMonitor",
    "HealthStatus",
    "HealthThresholds",
    "WorkerHealthState",
    # Types
    "JobPriority",
    "JobStatus",
    "WorkerType",
    "AnomalyType",
    "JobMetrics",
    "WorkerHealth",
    "AnomalyAlert",
]
