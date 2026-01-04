"""
Prometheus Metrics Middleware for Aurastream.

This module provides comprehensive observability through Prometheus metrics:
- HTTP request latency histograms
- Request counters by endpoint, method, and status
- Active request gauges
- Custom business metrics (generations, coach sessions, etc.)

Usage:
    from backend.api.middleware.prometheus_metrics import (
        PrometheusMiddleware,
        get_metrics_router,
        track_generation,
        track_coach_session,
    )
    
    # Add middleware to app
    app.add_middleware(PrometheusMiddleware)
    
    # Include metrics endpoint
    app.include_router(get_metrics_router())
    
    # Track custom metrics in services
    track_generation(asset_type="twitch_emote", success=True, duration_ms=1500)

Environment Variables:
    METRICS_ENABLED: Set to "false" to disable metrics collection (default: true)
    METRICS_PATH: Path for metrics endpoint (default: /metrics)
"""

import logging
import os
import time
from typing import Callable, Dict, Optional

from fastapi import APIRouter, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.routing import Match

logger = logging.getLogger(__name__)

# Check if metrics are enabled
METRICS_ENABLED = os.getenv("METRICS_ENABLED", "true").lower() != "false"
METRICS_PATH = os.getenv("METRICS_PATH", "/metrics")

# =============================================================================
# Metrics Storage (In-Memory)
# =============================================================================
# Using simple in-memory storage for metrics.
# For production with multiple instances, consider using prometheus_client
# with a pushgateway or redis-backed storage.


class MetricsRegistry:
    """
    Simple in-memory metrics registry.
    
    Stores counters, gauges, and histograms for Prometheus exposition.
    Thread-safe through atomic operations on simple types.
    """
    
    def __init__(self):
        self._counters: Dict[str, int] = {}
        self._gauges: Dict[str, float] = {}
        self._histograms: Dict[str, Dict] = {}
        self._histogram_buckets = [
            0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0
        ]
    
    def inc_counter(self, name: str, labels: Dict[str, str], value: int = 1) -> None:
        """Increment a counter metric."""
        key = self._make_key(name, labels)
        self._counters[key] = self._counters.get(key, 0) + value
    
    def set_gauge(self, name: str, labels: Dict[str, str], value: float) -> None:
        """Set a gauge metric."""
        key = self._make_key(name, labels)
        self._gauges[key] = value
    
    def inc_gauge(self, name: str, labels: Dict[str, str], value: float = 1) -> None:
        """Increment a gauge metric."""
        key = self._make_key(name, labels)
        self._gauges[key] = self._gauges.get(key, 0) + value
    
    def dec_gauge(self, name: str, labels: Dict[str, str], value: float = 1) -> None:
        """Decrement a gauge metric."""
        key = self._make_key(name, labels)
        self._gauges[key] = self._gauges.get(key, 0) - value
    
    def observe_histogram(self, name: str, labels: Dict[str, str], value: float) -> None:
        """Record a histogram observation."""
        key = self._make_key(name, labels)
        
        if key not in self._histograms:
            self._histograms[key] = {
                "buckets": {b: 0 for b in self._histogram_buckets},
                "sum": 0.0,
                "count": 0,
            }
        
        hist = self._histograms[key]
        hist["sum"] += value
        hist["count"] += 1
        
        for bucket in self._histogram_buckets:
            if value <= bucket:
                hist["buckets"][bucket] += 1
    
    def _make_key(self, name: str, labels: Dict[str, str]) -> str:
        """Create a unique key from metric name and labels."""
        label_str = ",".join(f'{k}="{v}"' for k, v in sorted(labels.items()))
        return f"{name}{{{label_str}}}" if label_str else name
    
    def export(self) -> str:
        """Export all metrics in Prometheus text format."""
        lines = []
        
        # Export counters
        for key, value in sorted(self._counters.items()):
            lines.append(f"{key} {value}")
        
        # Export gauges
        for key, value in sorted(self._gauges.items()):
            lines.append(f"{key} {value}")
        
        # Export histograms
        exported_histograms = set()
        for key, hist in sorted(self._histograms.items()):
            # Extract base name and labels
            base_name = key.split("{")[0]
            labels_part = key[len(base_name):]
            
            # Add histogram type comment once per metric name
            if base_name not in exported_histograms:
                lines.append(f"# TYPE {base_name} histogram")
                exported_histograms.add(base_name)
            
            # Export buckets
            for bucket, count in sorted(hist["buckets"].items()):
                if labels_part:
                    bucket_labels = labels_part[:-1] + f',le="{bucket}"}}'
                else:
                    bucket_labels = f'{{le="{bucket}"}}'
                lines.append(f"{base_name}_bucket{bucket_labels} {count}")
            
            # Export +Inf bucket
            if labels_part:
                inf_labels = labels_part[:-1] + ',le="+Inf"}'
            else:
                inf_labels = '{le="+Inf"}'
            lines.append(f"{base_name}_bucket{inf_labels} {hist['count']}")
            
            # Export sum and count
            lines.append(f"{base_name}_sum{labels_part} {hist['sum']}")
            lines.append(f"{base_name}_count{labels_part} {hist['count']}")
        
        return "\n".join(lines)


# Global metrics registry
_registry = MetricsRegistry()


def get_registry() -> MetricsRegistry:
    """Get the global metrics registry."""
    return _registry


# =============================================================================
# HTTP Metrics Middleware
# =============================================================================


class PrometheusMiddleware(BaseHTTPMiddleware):
    """
    Middleware that collects HTTP request metrics.
    
    Metrics collected:
    - http_requests_total: Counter of total requests by method, path, status
    - http_request_duration_seconds: Histogram of request latency
    - http_requests_in_progress: Gauge of currently processing requests
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and collect metrics."""
        if not METRICS_ENABLED:
            return await call_next(request)
        
        # Skip metrics endpoint itself
        if request.url.path == METRICS_PATH:
            return await call_next(request)
        
        # Get route pattern for consistent labeling
        path = self._get_path_template(request)
        method = request.method
        
        # Track in-progress requests
        labels = {"method": method, "path": path}
        _registry.inc_gauge("http_requests_in_progress", labels)
        
        # Time the request
        start_time = time.perf_counter()
        
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            status_code = 500
            raise
        finally:
            # Record duration
            duration = time.perf_counter() - start_time
            
            # Update metrics
            request_labels = {"method": method, "path": path, "status": str(status_code)}
            _registry.inc_counter("http_requests_total", request_labels)
            _registry.observe_histogram("http_request_duration_seconds", request_labels, duration)
            _registry.dec_gauge("http_requests_in_progress", labels)
        
        return response
    
    def _get_path_template(self, request: Request) -> str:
        """
        Get the route template instead of actual path.
        
        This prevents high cardinality from path parameters.
        E.g., /api/v1/users/123 -> /api/v1/users/{user_id}
        """
        # Try to match against app routes
        for route in request.app.routes:
            match, _ = route.matches(request.scope)
            if match == Match.FULL:
                return route.path
        
        # Fallback to actual path (truncated for safety)
        path = request.url.path
        if len(path) > 50:
            path = path[:50] + "..."
        return path


# =============================================================================
# Business Metrics Functions
# =============================================================================


def track_generation(
    asset_type: str,
    success: bool,
    duration_ms: float,
    user_tier: str = "unknown",
) -> None:
    """
    Track an asset generation event.
    
    Args:
        asset_type: Type of asset generated (twitch_emote, thumbnail, etc.)
        success: Whether generation succeeded
        duration_ms: Generation duration in milliseconds
        user_tier: User's subscription tier
    """
    if not METRICS_ENABLED:
        return
    
    labels = {
        "asset_type": asset_type,
        "status": "success" if success else "failure",
        "tier": user_tier,
    }
    
    _registry.inc_counter("aurastream_generations_total", labels)
    _registry.observe_histogram(
        "aurastream_generation_duration_seconds",
        {"asset_type": asset_type},
        duration_ms / 1000.0,
    )


def track_coach_session(
    action: str,
    tier: str = "unknown",
    turns: int = 0,
) -> None:
    """
    Track a coach session event.
    
    Args:
        action: Session action (start, message, end)
        tier: User's subscription tier
        turns: Number of turns in session (for end action)
    """
    if not METRICS_ENABLED:
        return
    
    labels = {"action": action, "tier": tier}
    _registry.inc_counter("aurastream_coach_sessions_total", labels)
    
    if action == "end" and turns > 0:
        _registry.observe_histogram(
            "aurastream_coach_session_turns",
            {"tier": tier},
            turns,
        )


def track_auth_event(
    event: str,
    success: bool,
    provider: str = "email",
) -> None:
    """
    Track an authentication event.
    
    Args:
        event: Auth event type (login, signup, logout, refresh)
        success: Whether the event succeeded
        provider: Auth provider (email, twitch, youtube)
    """
    if not METRICS_ENABLED:
        return
    
    labels = {
        "event": event,
        "status": "success" if success else "failure",
        "provider": provider,
    }
    _registry.inc_counter("aurastream_auth_events_total", labels)


def track_redis_operation(
    operation: str,
    success: bool,
    duration_ms: float,
) -> None:
    """
    Track a Redis operation.
    
    Args:
        operation: Redis operation type (get, set, etc.)
        success: Whether operation succeeded
        duration_ms: Operation duration in milliseconds
    """
    if not METRICS_ENABLED:
        return
    
    labels = {"operation": operation, "status": "success" if success else "failure"}
    _registry.inc_counter("aurastream_redis_operations_total", labels)
    _registry.observe_histogram(
        "aurastream_redis_operation_duration_seconds",
        {"operation": operation},
        duration_ms / 1000.0,
    )


def track_worker_job(
    worker: str,
    success: bool,
    duration_ms: float,
) -> None:
    """
    Track a background worker job.
    
    Args:
        worker: Worker name (generation, analytics_flush, etc.)
        success: Whether job succeeded
        duration_ms: Job duration in milliseconds
    """
    if not METRICS_ENABLED:
        return
    
    labels = {"worker": worker, "status": "success" if success else "failure"}
    _registry.inc_counter("aurastream_worker_jobs_total", labels)
    _registry.observe_histogram(
        "aurastream_worker_job_duration_seconds",
        {"worker": worker},
        duration_ms / 1000.0,
    )


def set_active_connections(service: str, count: int) -> None:
    """
    Set the number of active connections for a service.
    
    Args:
        service: Service name (redis, supabase, etc.)
        count: Number of active connections
    """
    if not METRICS_ENABLED:
        return
    
    _registry.set_gauge("aurastream_active_connections", {"service": service}, count)


# =============================================================================
# Metrics Endpoint Router
# =============================================================================


def get_metrics_router() -> APIRouter:
    """
    Create a router with the /metrics endpoint.
    
    Returns:
        APIRouter with metrics endpoint
    """
    router = APIRouter()
    
    @router.get(METRICS_PATH, include_in_schema=False)
    async def metrics() -> Response:
        """
        Prometheus metrics endpoint.
        
        Returns metrics in Prometheus text exposition format.
        """
        content = _registry.export()
        return Response(
            content=content,
            media_type="text/plain; version=0.0.4; charset=utf-8",
        )
    
    return router


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    # Middleware
    "PrometheusMiddleware",
    "get_metrics_router",
    # Business metrics
    "track_generation",
    "track_coach_session",
    "track_auth_event",
    "track_redis_operation",
    "track_worker_job",
    "set_active_connections",
    # Registry access
    "get_registry",
    "METRICS_ENABLED",
]
