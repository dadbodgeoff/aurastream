"""
Structured Logging Context for AuraStream Workers.

Provides correlation IDs and structured logging to trace operations
across workers and services.

Usage:
    from backend.services.logging_context import (
        get_correlation_id,
        set_correlation_id,
        with_correlation_id,
        StructuredLogger,
    )
    
    # In a worker
    with with_correlation_id(job_id):
        logger.info("Processing job", extra={"job_id": job_id})
    
    # Or use the structured logger
    slog = StructuredLogger("generation_worker")
    slog.info("Job started", job_id=job_id, user_id=user_id)
"""

import contextvars
import logging
import json
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Optional, Any, Dict

# Context variable for correlation ID
_correlation_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "correlation_id", default=None
)


def get_correlation_id() -> Optional[str]:
    """Get the current correlation ID."""
    return _correlation_id.get()


def set_correlation_id(correlation_id: str) -> None:
    """Set the correlation ID for the current context."""
    _correlation_id.set(correlation_id)


def generate_correlation_id() -> str:
    """Generate a new correlation ID."""
    return str(uuid.uuid4())[:8]  # Short ID for readability


@contextmanager
def with_correlation_id(correlation_id: Optional[str] = None):
    """
    Context manager to set correlation ID for a block of code.
    
    Args:
        correlation_id: ID to use, or None to generate a new one
    """
    cid = correlation_id or generate_correlation_id()
    token = _correlation_id.set(cid)
    try:
        yield cid
    finally:
        _correlation_id.reset(token)


class CorrelationIdFilter(logging.Filter):
    """Logging filter that adds correlation ID to log records."""
    
    def filter(self, record: logging.LogRecord) -> bool:
        record.correlation_id = get_correlation_id() or "-"
        return True


class StructuredFormatter(logging.Formatter):
    """
    JSON formatter for structured logging.
    
    Outputs logs as JSON for easy parsing by log aggregators.
    """
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": getattr(record, "correlation_id", None),
        }
        
        # Add extra fields
        if hasattr(record, "extra_fields"):
            log_data.update(record.extra_fields)
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data)


class StructuredLogger:
    """
    Structured logger that automatically includes correlation ID and extra fields.
    
    Usage:
        slog = StructuredLogger("my_worker")
        slog.info("Processing started", job_id="123", user_id="456")
    """
    
    def __init__(self, name: str):
        self._logger = logging.getLogger(name)
    
    def _log(self, level: int, message: str, **kwargs) -> None:
        """Log with extra fields."""
        extra = {
            "extra_fields": {
                "correlation_id": get_correlation_id(),
                **kwargs,
            }
        }
        self._logger.log(level, message, extra=extra)
    
    def debug(self, message: str, **kwargs) -> None:
        self._log(logging.DEBUG, message, **kwargs)
    
    def info(self, message: str, **kwargs) -> None:
        self._log(logging.INFO, message, **kwargs)
    
    def warning(self, message: str, **kwargs) -> None:
        self._log(logging.WARNING, message, **kwargs)
    
    def error(self, message: str, **kwargs) -> None:
        self._log(logging.ERROR, message, **kwargs)
    
    def exception(self, message: str, **kwargs) -> None:
        self._log(logging.ERROR, message, **kwargs)


def configure_structured_logging(
    level: int = logging.INFO,
    json_format: bool = False,
) -> None:
    """
    Configure logging with correlation ID support.
    
    Args:
        level: Logging level
        json_format: If True, use JSON formatter for structured logs
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create handler
    handler = logging.StreamHandler()
    handler.setLevel(level)
    
    # Add correlation ID filter
    handler.addFilter(CorrelationIdFilter())
    
    # Set formatter
    if json_format:
        handler.setFormatter(StructuredFormatter())
    else:
        handler.setFormatter(logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - [%(correlation_id)s] %(message)s"
        ))
    
    root_logger.addHandler(handler)


# Worker metrics tracking
class WorkerMetrics:
    """
    Simple metrics tracking for worker health monitoring.
    
    Tracks:
    - Jobs processed (success/failure)
    - Processing duration
    - Error counts by type
    """
    
    def __init__(self, worker_name: str):
        self.worker_name = worker_name
        self.jobs_processed = 0
        self.jobs_failed = 0
        self.total_duration_ms = 0
        self.error_counts: Dict[str, int] = {}
        self._start_time: Optional[float] = None
    
    def start_job(self) -> None:
        """Mark job start for duration tracking."""
        import time
        self._start_time = time.time()
    
    def end_job(self, success: bool = True, error_type: Optional[str] = None) -> None:
        """Mark job end and record metrics."""
        import time
        
        if self._start_time:
            duration_ms = int((time.time() - self._start_time) * 1000)
            self.total_duration_ms += duration_ms
            self._start_time = None
        
        if success:
            self.jobs_processed += 1
        else:
            self.jobs_failed += 1
            if error_type:
                self.error_counts[error_type] = self.error_counts.get(error_type, 0) + 1
    
    def get_stats(self) -> Dict[str, Any]:
        """Get current metrics."""
        total = self.jobs_processed + self.jobs_failed
        return {
            "worker_name": self.worker_name,
            "jobs_processed": self.jobs_processed,
            "jobs_failed": self.jobs_failed,
            "success_rate": round(self.jobs_processed / total * 100, 1) if total > 0 else 100.0,
            "avg_duration_ms": round(self.total_duration_ms / total) if total > 0 else 0,
            "error_counts": self.error_counts,
        }


# Singleton metrics instances
_metrics: Dict[str, WorkerMetrics] = {}


def get_worker_metrics(worker_name: str) -> WorkerMetrics:
    """Get or create metrics tracker for a worker."""
    if worker_name not in _metrics:
        _metrics[worker_name] = WorkerMetrics(worker_name)
    return _metrics[worker_name]
