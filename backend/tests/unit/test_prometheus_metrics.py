"""
Unit tests for Prometheus metrics middleware.

Tests the metrics collection, export format, and business metric tracking.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from backend.api.middleware.prometheus_metrics import (
    MetricsRegistry,
    PrometheusMiddleware,
    get_metrics_router,
    track_generation,
    track_coach_session,
    track_auth_event,
    track_redis_operation,
    track_worker_job,
    set_active_connections,
    get_registry,
)


class TestMetricsRegistry:
    """Tests for the MetricsRegistry class."""
    
    @pytest.fixture
    def registry(self):
        """Create a fresh registry for each test."""
        return MetricsRegistry()
    
    def test_counter_increment(self, registry):
        """Counter should increment correctly."""
        labels = {"method": "GET", "path": "/api/test"}
        
        registry.inc_counter("http_requests_total", labels)
        registry.inc_counter("http_requests_total", labels)
        registry.inc_counter("http_requests_total", labels, value=5)
        
        # Check export contains the counter
        export = registry.export()
        assert 'http_requests_total{method="GET",path="/api/test"} 7' in export
    
    def test_gauge_set(self, registry):
        """Gauge should set value correctly."""
        labels = {"service": "redis"}
        
        registry.set_gauge("active_connections", labels, 10)
        export = registry.export()
        assert 'active_connections{service="redis"} 10' in export
        
        # Update gauge
        registry.set_gauge("active_connections", labels, 5)
        export = registry.export()
        assert 'active_connections{service="redis"} 5' in export
    
    def test_gauge_increment_decrement(self, registry):
        """Gauge should increment and decrement correctly."""
        labels = {"type": "request"}
        
        registry.inc_gauge("in_progress", labels)
        registry.inc_gauge("in_progress", labels)
        registry.dec_gauge("in_progress", labels)
        
        export = registry.export()
        assert 'in_progress{type="request"} 1' in export
    
    def test_histogram_observation(self, registry):
        """Histogram should record observations correctly."""
        labels = {"method": "GET"}
        
        # Record some observations
        registry.observe_histogram("request_duration", labels, 0.05)
        registry.observe_histogram("request_duration", labels, 0.15)
        registry.observe_histogram("request_duration", labels, 0.5)
        
        export = registry.export()
        
        # Check histogram components
        assert "# TYPE request_duration histogram" in export
        assert "request_duration_count" in export
        assert "request_duration_sum" in export
        assert "request_duration_bucket" in export
    
    def test_different_labels_create_different_metrics(self, registry):
        """Different label combinations should create separate metrics."""
        registry.inc_counter("requests", {"method": "GET"})
        registry.inc_counter("requests", {"method": "POST"})
        registry.inc_counter("requests", {"method": "GET"})
        
        export = registry.export()
        assert 'requests{method="GET"} 2' in export
        assert 'requests{method="POST"} 1' in export
    
    def test_empty_labels(self, registry):
        """Metrics with no labels should work."""
        registry.inc_counter("total_requests", {})
        
        export = registry.export()
        assert "total_requests 1" in export


class TestBusinessMetrics:
    """Tests for business metric tracking functions."""
    
    @pytest.fixture(autouse=True)
    def reset_registry(self):
        """Reset the global registry before each test."""
        # Get fresh registry state
        registry = get_registry()
        registry._counters.clear()
        registry._gauges.clear()
        registry._histograms.clear()
    
    def test_track_generation_success(self):
        """Should track successful generation."""
        track_generation(
            asset_type="twitch_emote",
            success=True,
            duration_ms=1500,
            user_tier="pro",
        )
        
        export = get_registry().export()
        assert "aurastream_generations_total" in export
        assert "twitch_emote" in export
        assert "success" in export
        assert "aurastream_generation_duration_seconds" in export
    
    def test_track_generation_failure(self):
        """Should track failed generation."""
        track_generation(
            asset_type="thumbnail",
            success=False,
            duration_ms=500,
        )
        
        export = get_registry().export()
        assert "failure" in export
    
    def test_track_coach_session(self):
        """Should track coach session events."""
        track_coach_session(action="start", tier="studio")
        track_coach_session(action="message", tier="studio")
        track_coach_session(action="end", tier="studio", turns=5)
        
        export = get_registry().export()
        assert "aurastream_coach_sessions_total" in export
        assert "aurastream_coach_session_turns" in export
    
    def test_track_auth_event(self):
        """Should track auth events."""
        track_auth_event(event="login", success=True, provider="email")
        track_auth_event(event="login", success=False, provider="twitch")
        
        export = get_registry().export()
        assert "aurastream_auth_events_total" in export
        assert "login" in export
    
    def test_track_redis_operation(self):
        """Should track Redis operations."""
        track_redis_operation(operation="get", success=True, duration_ms=5)
        track_redis_operation(operation="set", success=True, duration_ms=3)
        
        export = get_registry().export()
        assert "aurastream_redis_operations_total" in export
        assert "aurastream_redis_operation_duration_seconds" in export
    
    def test_track_worker_job(self):
        """Should track worker jobs."""
        track_worker_job(worker="generation", success=True, duration_ms=2000)
        
        export = get_registry().export()
        assert "aurastream_worker_jobs_total" in export
        assert "generation" in export
    
    def test_set_active_connections(self):
        """Should set active connection gauge."""
        set_active_connections(service="redis", count=5)
        set_active_connections(service="supabase", count=10)
        
        export = get_registry().export()
        assert "aurastream_active_connections" in export
        assert "redis" in export
        assert "supabase" in export


class TestPrometheusMiddleware:
    """Tests for the Prometheus middleware."""
    
    @pytest.fixture
    def mock_app(self):
        """Create a mock FastAPI app."""
        app = MagicMock()
        app.routes = []
        return app
    
    @pytest.fixture
    def middleware(self, mock_app):
        """Create middleware instance."""
        return PrometheusMiddleware(mock_app)
    
    @pytest.mark.asyncio
    async def test_middleware_tracks_request(self, middleware):
        """Middleware should track request metrics."""
        # Create mock request and response
        request = MagicMock()
        request.url.path = "/api/v1/test"
        request.method = "GET"
        request.app.routes = []
        
        response = MagicMock()
        response.status_code = 200
        
        async def call_next(req):
            return response
        
        # Process request
        with patch.object(middleware, '_get_path_template', return_value="/api/v1/test"):
            result = await middleware.dispatch(request, call_next)
        
        assert result == response
    
    @pytest.mark.asyncio
    async def test_middleware_skips_metrics_endpoint(self, middleware):
        """Middleware should skip the metrics endpoint itself."""
        request = MagicMock()
        request.url.path = "/metrics"
        
        response = MagicMock()
        
        async def call_next(req):
            return response
        
        result = await middleware.dispatch(request, call_next)
        assert result == response


class TestMetricsRouter:
    """Tests for the metrics endpoint router."""
    
    def test_router_creation(self):
        """Should create router with metrics endpoint."""
        router = get_metrics_router()
        
        # Check that route exists
        routes = [r.path for r in router.routes]
        assert "/metrics" in routes
