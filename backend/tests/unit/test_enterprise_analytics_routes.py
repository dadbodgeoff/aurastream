"""
Unit tests for Enterprise Analytics API Routes.

Tests cover:
- Public tracking endpoints (no auth required)
- Admin dashboard endpoints (auth required)
- Request validation
- Error handling
"""

import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

from backend.api.routes.enterprise_analytics import router
from backend.services.enterprise_analytics_service import ANALYTICS_ADMIN_EMAIL


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def mock_service():
    """Create a mock analytics service."""
    mock = MagicMock()
    
    # Default successful responses
    mock.track_visitor.return_value = {'visitor_id': 'v_test', 'is_returning': False, 'visit_count': 1}
    mock.start_session.return_value = {'session_id': 's_test', 'started': True}
    mock.end_session.return_value = {'session_id': 's_test', 'ended': True, 'is_bounce': False}
    mock.track_page_view.return_value = {'tracked': True, 'page_path': '/test'}
    mock.track_click.return_value = {'tracked': True}
    mock.track_funnel_event.return_value = {'tracked': True, 'step': 'landing_view', 'step_order': 1}
    mock.track_abandonment.return_value = {'tracked': True, 'type': 'form'}
    mock.heartbeat.return_value = {'ok': True}
    mock.get_dashboard_summary.return_value = {'totals': {}, 'bounce_rate': 0, 'return_rate': 0}
    mock.get_realtime_active.return_value = {'total_active': 0}
    mock.get_daily_visitors.return_value = []
    mock.get_funnel_data.return_value = {'funnel': []}
    mock.get_heatmap_data.return_value = {'clicks': []}
    mock.get_top_journeys.return_value = []
    mock.get_abandonment_analysis.return_value = []
    mock.get_geo_breakdown.return_value = []
    mock.get_device_breakdown.return_value = []
    mock.get_page_flow.return_value = {'flows': []}
    mock.get_top_pages.return_value = []
    mock.get_recent_sessions.return_value = []
    mock.aggregate_daily.return_value = {'aggregated': True}
    
    return mock


@pytest.fixture
def mock_admin_user():
    """Create a mock admin user token payload."""
    mock = MagicMock()
    mock.sub = 'admin_user_id'
    mock.email = ANALYTICS_ADMIN_EMAIL
    return mock


@pytest.fixture
def mock_regular_user():
    """Create a mock regular user token payload."""
    mock = MagicMock()
    mock.sub = 'regular_user_id'
    mock.email = 'regular@example.com'
    return mock


@pytest.fixture
def app(mock_service):
    """Create a test FastAPI app with mocked dependencies."""
    app = FastAPI()
    app.include_router(router, prefix="/api/v1/enterprise-analytics")
    
    # Override the service dependency
    from backend.api.routes.enterprise_analytics import get_service
    app.dependency_overrides[get_service] = lambda: mock_service
    
    return app


@pytest.fixture
def client(app):
    """Create a test client."""
    return TestClient(app)


# =============================================================================
# Public Tracking Endpoint Tests
# =============================================================================

class TestPublicTrackingEndpoints:
    """Tests for public tracking endpoints (no auth required)."""
    
    def test_track_visitor(self, client, mock_service):
        """Should track a visitor without auth."""
        response = client.post(
            "/api/v1/enterprise-analytics/visitor",
            json={
                "visitor_id": "v_test123",
                "device_type": "desktop",
                "browser": "Chrome",
            }
        )
        
        assert response.status_code == 202
        mock_service.track_visitor.assert_called_once()
    
    def test_track_visitor_validation_error(self, client):
        """Should return 422 for invalid visitor data."""
        response = client.post(
            "/api/v1/enterprise-analytics/visitor",
            json={"visitor_id": ""}  # Empty visitor_id
        )
        
        assert response.status_code == 422
    
    def test_start_session(self, client, mock_service):
        """Should start a session without auth."""
        response = client.post(
            "/api/v1/enterprise-analytics/session/start",
            json={
                "session_id": "s_test123",
                "visitor_id": "v_test123",
                "entry_page": "/dashboard",
            }
        )
        
        assert response.status_code == 202
        mock_service.start_session.assert_called_once()
    
    def test_end_session(self, client, mock_service):
        """Should end a session without auth."""
        response = client.post(
            "/api/v1/enterprise-analytics/session/end",
            json={
                "session_id": "s_test123",
                "visitor_id": "v_test123",
                "duration_ms": 60000,
                "pages_viewed": 5,
            }
        )
        
        assert response.status_code == 202
        mock_service.end_session.assert_called_once()
    
    def test_track_page_view(self, client, mock_service):
        """Should track a page view without auth."""
        response = client.post(
            "/api/v1/enterprise-analytics/pageview",
            json={
                "session_id": "s_test123",
                "visitor_id": "v_test123",
                "page_path": "/pricing",
            }
        )
        
        assert response.status_code == 202
        mock_service.track_page_view.assert_called_once()
    
    def test_track_click(self, client, mock_service):
        """Should track a click without auth."""
        response = client.post(
            "/api/v1/enterprise-analytics/click",
            json={
                "session_id": "s_test123",
                "visitor_id": "v_test123",
                "page_path": "/pricing",
                "click_x": 500,
                "click_y": 300,
                "viewport_width": 1920,
                "viewport_height": 1080,
            }
        )
        
        assert response.status_code == 202
        mock_service.track_click.assert_called_once()
    
    def test_track_funnel_event(self, client, mock_service):
        """Should track a funnel event without auth."""
        response = client.post(
            "/api/v1/enterprise-analytics/funnel",
            json={
                "visitor_id": "v_test123",
                "session_id": "s_test123",
                "step": "landing_view",
            }
        )
        
        assert response.status_code == 202
        mock_service.track_funnel_event.assert_called_once()
    
    def test_track_abandonment(self, client, mock_service):
        """Should track abandonment without auth."""
        response = client.post(
            "/api/v1/enterprise-analytics/abandonment",
            json={
                "visitor_id": "v_test123",
                "session_id": "s_test123",
                "abandonment_type": "form",
                "page_path": "/signup",
            }
        )
        
        assert response.status_code == 202
        mock_service.track_abandonment.assert_called_once()
    
    def test_heartbeat(self, client, mock_service):
        """Should process heartbeat without auth."""
        response = client.post(
            "/api/v1/enterprise-analytics/heartbeat",
            json={
                "visitor_id": "v_test123",
                "session_id": "s_test123",
                "current_page": "/dashboard",
            }
        )
        
        assert response.status_code == 202
        mock_service.heartbeat.assert_called_once()
    
    def test_batch_events(self, client, mock_service):
        """Should process batch events without auth."""
        response = client.post(
            "/api/v1/enterprise-analytics/batch",
            json={
                "events": [
                    {
                        "type": "pageview",
                        "data": {
                            "session_id": "s_test",
                            "visitor_id": "v_test",
                            "page_path": "/test",
                        }
                    }
                ]
            }
        )
        
        assert response.status_code == 202
        assert response.json()["processed"] == 1


# =============================================================================
# Admin Dashboard Endpoint Tests
# =============================================================================

class TestAdminDashboardEndpoints:
    """Tests for admin dashboard endpoints (auth required)."""
    
    def test_dashboard_summary_requires_auth(self, client):
        """Should require authentication for dashboard summary."""
        response = client.get("/api/v1/enterprise-analytics/dashboard/summary")
        
        # Should fail without auth
        assert response.status_code in [401, 403, 422]
    
    def test_realtime_requires_auth(self, client):
        """Should require authentication for realtime data."""
        response = client.get("/api/v1/enterprise-analytics/dashboard/realtime")
        
        assert response.status_code in [401, 403, 422]
    
    def test_daily_visitors_requires_auth(self, client):
        """Should require authentication for daily visitors."""
        response = client.get("/api/v1/enterprise-analytics/dashboard/daily-visitors")
        
        assert response.status_code in [401, 403, 422]
    
    def test_funnel_requires_auth(self, client):
        """Should require authentication for funnel data."""
        response = client.get("/api/v1/enterprise-analytics/dashboard/funnel")
        
        assert response.status_code in [401, 403, 422]
    
    def test_heatmap_requires_auth(self, client):
        """Should require authentication for heatmap data."""
        response = client.get(
            "/api/v1/enterprise-analytics/dashboard/heatmap",
            params={"page_path": "/pricing"}
        )
        
        assert response.status_code in [401, 403, 422]
    
    def test_journeys_requires_auth(self, client):
        """Should require authentication for journeys data."""
        response = client.get("/api/v1/enterprise-analytics/dashboard/journeys")
        
        assert response.status_code in [401, 403, 422]
    
    def test_abandonment_requires_auth(self, client):
        """Should require authentication for abandonment data."""
        response = client.get("/api/v1/enterprise-analytics/dashboard/abandonment")
        
        assert response.status_code in [401, 403, 422]
    
    def test_geo_requires_auth(self, client):
        """Should require authentication for geo data."""
        response = client.get("/api/v1/enterprise-analytics/dashboard/geo")
        
        assert response.status_code in [401, 403, 422]
    
    def test_devices_requires_auth(self, client):
        """Should require authentication for device data."""
        response = client.get("/api/v1/enterprise-analytics/dashboard/devices")
        
        assert response.status_code in [401, 403, 422]
    
    def test_flow_requires_auth(self, client):
        """Should require authentication for flow data."""
        response = client.get("/api/v1/enterprise-analytics/dashboard/flow")
        
        assert response.status_code in [401, 403, 422]
    
    def test_pages_requires_auth(self, client):
        """Should require authentication for pages data."""
        response = client.get("/api/v1/enterprise-analytics/dashboard/pages")
        
        assert response.status_code in [401, 403, 422]
    
    def test_sessions_requires_auth(self, client):
        """Should require authentication for sessions data."""
        response = client.get("/api/v1/enterprise-analytics/dashboard/sessions")
        
        assert response.status_code in [401, 403, 422]
    
    def test_aggregate_requires_auth(self, client):
        """Should require authentication for aggregation trigger."""
        response = client.post("/api/v1/enterprise-analytics/aggregate")
        
        assert response.status_code in [401, 403, 422]


# =============================================================================
# Request Validation Tests
# =============================================================================

class TestRequestValidation:
    """Tests for request validation."""
    
    def test_visitor_id_required(self, client):
        """Should require visitor_id."""
        response = client.post(
            "/api/v1/enterprise-analytics/visitor",
            json={}
        )
        
        assert response.status_code == 422
    
    def test_visitor_id_min_length(self, client):
        """Should enforce minimum visitor_id length."""
        response = client.post(
            "/api/v1/enterprise-analytics/visitor",
            json={"visitor_id": ""}
        )
        
        assert response.status_code == 422
    
    def test_session_id_required_for_session_start(self, client):
        """Should require session_id for session start."""
        response = client.post(
            "/api/v1/enterprise-analytics/session/start",
            json={
                "visitor_id": "v_test",
                "entry_page": "/",
            }
        )
        
        assert response.status_code == 422
    
    def test_entry_page_required_for_session_start(self, client):
        """Should require entry_page for session start."""
        response = client.post(
            "/api/v1/enterprise-analytics/session/start",
            json={
                "session_id": "s_test",
                "visitor_id": "v_test",
            }
        )
        
        assert response.status_code == 422
    
    def test_click_coordinates_required(self, client):
        """Should require click coordinates."""
        response = client.post(
            "/api/v1/enterprise-analytics/click",
            json={
                "session_id": "s_test",
                "visitor_id": "v_test",
                "page_path": "/test",
                # Missing click_x, click_y, viewport dimensions
            }
        )
        
        assert response.status_code == 422
    
    def test_click_coordinates_non_negative(self, client):
        """Should enforce non-negative click coordinates."""
        response = client.post(
            "/api/v1/enterprise-analytics/click",
            json={
                "session_id": "s_test",
                "visitor_id": "v_test",
                "page_path": "/test",
                "click_x": -1,  # Invalid
                "click_y": 100,
                "viewport_width": 1920,
                "viewport_height": 1080,
            }
        )
        
        assert response.status_code == 422
    
    def test_scroll_depth_range(self, client, mock_service):
        """Should enforce scroll depth range 0-100."""
        # Valid scroll depth
        response = client.post(
            "/api/v1/enterprise-analytics/pageview",
            json={
                "session_id": "s_test",
                "visitor_id": "v_test",
                "page_path": "/test",
                "scroll_depth": 75,
            }
        )
        assert response.status_code == 202
        
        # Invalid scroll depth (> 100)
        response = client.post(
            "/api/v1/enterprise-analytics/pageview",
            json={
                "session_id": "s_test",
                "visitor_id": "v_test",
                "page_path": "/test",
                "scroll_depth": 150,
            }
        )
        assert response.status_code == 422
    
    def test_batch_events_max_length(self, client):
        """Should enforce max batch size."""
        # Create 101 events (over the 100 limit)
        events = [
            {"type": "pageview", "data": {"session_id": "s", "visitor_id": "v", "page_path": "/"}}
            for _ in range(101)
        ]
        
        response = client.post(
            "/api/v1/enterprise-analytics/batch",
            json={"events": events}
        )
        
        assert response.status_code == 422
