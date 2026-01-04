"""
Anomaly Detection for Worker Orchestrator.

Detects anomalies in worker execution and triggers alerts.
"""

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional, Any, Callable

from .types import AnomalyType, AnomalyAlert, WorkerType

logger = logging.getLogger(__name__)


class AnomalySeverity(Enum):
    """Severity levels for anomalies."""
    CRITICAL = "critical"  # Immediate action required
    HIGH = "high"          # Alert within 5 minutes
    MEDIUM = "medium"      # Alert within 15 minutes
    LOW = "low"            # Log only


@dataclass
class AnomalyRule:
    """A rule for detecting anomalies."""
    anomaly_type: AnomalyType
    severity: AnomalySeverity
    description: str
    check_fn: Callable[[Dict[str, Any]], bool]
    message_template: str
    cooldown_seconds: int = 300  # Don't re-alert for 5 min


@dataclass
class AnomalyContext:
    """Context for anomaly detection."""
    worker_name: str
    worker_type: WorkerType
    execution_id: str
    metrics: Dict[str, Any]
    history: List[Dict[str, Any]] = field(default_factory=list)


class AnomalyDetector:
    """
    Detects anomalies in worker execution.
    
    Features:
    - Rule-based anomaly detection
    - Severity classification
    - Cooldown to prevent alert storms
    - Alert aggregation
    """
    
    def __init__(self):
        self._rules: List[AnomalyRule] = []
        self._active_anomalies: Dict[str, AnomalyAlert] = {}
        self._last_alert_times: Dict[str, datetime] = {}
        self._alert_handlers: List[Callable[[AnomalyAlert], None]] = []
        
        self._register_default_rules()
    
    def _register_default_rules(self) -> None:
        """Register default anomaly detection rules."""
        
        # Critical: Worker crash
        self._rules.append(AnomalyRule(
            anomaly_type=AnomalyType.WORKER_UNHEALTHY,
            severity=AnomalySeverity.CRITICAL,
            description="Worker process crashed or became unresponsive",
            check_fn=lambda ctx: ctx.get("crashed", False) or ctx.get("unresponsive", False),
            message_template="Worker {worker_name} crashed: {error}",
            cooldown_seconds=60,
        ))
        
        # Critical: Queue overflow
        self._rules.append(AnomalyRule(
            anomaly_type=AnomalyType.QUEUE_BACKLOG,
            severity=AnomalySeverity.CRITICAL,
            description="Job queue has excessive backlog",
            check_fn=lambda ctx: ctx.get("queue_depth", 0) > 1000,
            message_template="Queue backlog critical: {queue_depth} jobs pending",
            cooldown_seconds=300,
        ))
        
        # High: High failure rate
        self._rules.append(AnomalyRule(
            anomaly_type=AnomalyType.HIGH_FAILURE_RATE,
            severity=AnomalySeverity.HIGH,
            description="Worker has high failure rate",
            check_fn=lambda ctx: ctx.get("failure_rate", 0) > 0.1,
            message_template="High failure rate: {failure_rate:.1%} in last hour",
            cooldown_seconds=300,
        ))
        
        # High: Slow execution
        self._rules.append(AnomalyRule(
            anomaly_type=AnomalyType.SLOW_JOB,
            severity=AnomalySeverity.HIGH,
            description="Job execution significantly slower than expected",
            check_fn=lambda ctx: ctx.get("duration_ms", 0) > ctx.get("expected_duration_ms", float("inf")) * 2,
            message_template="Slow execution: {duration_ms}ms (expected: {expected_duration_ms}ms)",
            cooldown_seconds=600,
        ))
        
        # High: Timeout spike
        self._rules.append(AnomalyRule(
            anomaly_type=AnomalyType.TIMEOUT_SPIKE,
            severity=AnomalySeverity.HIGH,
            description="Multiple jobs timing out",
            check_fn=lambda ctx: ctx.get("timeout_count", 0) > 3,
            message_template="Timeout spike: {timeout_count} timeouts in last hour",
            cooldown_seconds=300,
        ))
        
        # Medium: Repeated errors
        self._rules.append(AnomalyRule(
            anomaly_type=AnomalyType.REPEATED_ERROR,
            severity=AnomalySeverity.MEDIUM,
            description="Same error occurring repeatedly",
            check_fn=lambda ctx: ctx.get("repeated_error_count", 0) > 5,
            message_template="Repeated error ({repeated_error_count}x): {error_code}",
            cooldown_seconds=600,
        ))
        
        # Medium: Resource spike
        self._rules.append(AnomalyRule(
            anomaly_type=AnomalyType.RESOURCE_SPIKE,
            severity=AnomalySeverity.MEDIUM,
            description="Unusual resource consumption",
            check_fn=lambda ctx: ctx.get("memory_mb", 0) > ctx.get("memory_limit_mb", float("inf")) * 0.9,
            message_template="High memory usage: {memory_mb}MB (limit: {memory_limit_mb}MB)",
            cooldown_seconds=300,
        ))
    
    def register_rule(self, rule: AnomalyRule) -> None:
        """Register a custom anomaly detection rule."""
        self._rules.append(rule)
        logger.info(f"Registered anomaly rule: {rule.anomaly_type.value}")
    
    def register_alert_handler(self, handler: Callable[[AnomalyAlert], None]) -> None:
        """Register a handler to be called when anomalies are detected."""
        self._alert_handlers.append(handler)
    
    def check(self, context: AnomalyContext) -> List[AnomalyAlert]:
        """
        Check for anomalies in the given context.
        
        Args:
            context: Anomaly detection context with metrics
            
        Returns:
            List of detected anomalies
        """
        detected = []
        now = datetime.now(timezone.utc)
        
        ctx_dict = {
            "worker_name": context.worker_name,
            "worker_type": context.worker_type.value,
            "execution_id": context.execution_id,
            **context.metrics,
        }
        
        for rule in self._rules:
            try:
                if rule.check_fn(ctx_dict):
                    # Check cooldown
                    cooldown_key = f"{context.worker_name}:{rule.anomaly_type.value}"
                    last_alert = self._last_alert_times.get(cooldown_key)
                    
                    if last_alert and (now - last_alert).total_seconds() < rule.cooldown_seconds:
                        continue
                    
                    # Create alert
                    alert = AnomalyAlert(
                        id=str(uuid.uuid4()),
                        anomaly_type=rule.anomaly_type,
                        severity=rule.severity.value,
                        worker_type=context.worker_type,
                        job_id=context.execution_id,
                        message=rule.message_template.format(**ctx_dict),
                        details=ctx_dict,
                        detected_at=now,
                    )
                    
                    detected.append(alert)
                    self._active_anomalies[alert.id] = alert
                    self._last_alert_times[cooldown_key] = now
                    
                    # Call handlers
                    for handler in self._alert_handlers:
                        try:
                            handler(alert)
                        except Exception as e:
                            logger.error(f"Alert handler failed: {e}")
                    
                    logger.warning(
                        f"Anomaly detected: type={rule.anomaly_type.value}, "
                        f"severity={rule.severity.value}, worker={context.worker_name}"
                    )
                    
            except Exception as e:
                logger.error(f"Error checking rule {rule.anomaly_type.value}: {e}")
        
        return detected
    
    def resolve(self, anomaly_id: str, auto: bool = False) -> bool:
        """
        Mark an anomaly as resolved.
        
        Args:
            anomaly_id: ID of the anomaly to resolve
            auto: Whether this was auto-resolved
            
        Returns:
            True if anomaly was found and resolved
        """
        if anomaly_id not in self._active_anomalies:
            return False
        
        alert = self._active_anomalies[anomaly_id]
        alert.resolved_at = datetime.now(timezone.utc)
        alert.auto_resolved = auto
        
        del self._active_anomalies[anomaly_id]
        
        logger.info(
            f"Anomaly resolved: id={anomaly_id}, type={alert.anomaly_type.value}, "
            f"auto={auto}"
        )
        
        return True
    
    def get_active_anomalies(
        self,
        worker_type: Optional[WorkerType] = None,
        severity: Optional[AnomalySeverity] = None,
    ) -> List[AnomalyAlert]:
        """Get list of active (unresolved) anomalies."""
        anomalies = list(self._active_anomalies.values())
        
        if worker_type:
            anomalies = [a for a in anomalies if a.worker_type == worker_type]
        
        if severity:
            anomalies = [a for a in anomalies if a.severity == severity.value]
        
        return sorted(anomalies, key=lambda a: a.detected_at, reverse=True)
    
    def get_anomaly_summary(self) -> Dict[str, Any]:
        """Get summary of anomaly status."""
        active = list(self._active_anomalies.values())
        
        by_severity = {}
        for sev in AnomalySeverity:
            by_severity[sev.value] = len([a for a in active if a.severity == sev.value])
        
        by_type = {}
        for atype in AnomalyType:
            by_type[atype.value] = len([a for a in active if a.anomaly_type == atype])
        
        return {
            "total_active": len(active),
            "by_severity": by_severity,
            "by_type": by_type,
            "oldest_unresolved": min(
                (a.detected_at for a in active),
                default=None
            ),
        }
