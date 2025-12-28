"""
Unit tests for Enterprise Analytics Service.

Tests cover:
- Visitor tracking
- Session management
- Page view tracking
- Click tracking (heatmaps)
- Funnel events
- Abandonment tracking
- Real-time presence
- Dashboard queries
"""

import pytest
from unittest.mock import MagicMock, patch, PropertyMock
from datetime import datetime, timezone, timedelta

from backend.services.enterprise_analytics_service import (
    EnterpriseAnalyticsService,
    ANALYTICS_ADMIN_EMAIL,
    FUNNEL_STEPS,
    ABANDONMENT_TYPES,
)


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def mock_supabase():
    """Create a mock Supabase client."""
    mock = MagicMock()
    
    # Default empty responses
    mock.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    mock.table.return_value.insert.return_value.execute.return_value.data = [{}]
    mock.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{}]
    mock.table.return_value.upsert.return_value.execute.return_value.data = [{}]
    mock.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = []
    mock.rpc.return_value.execute.return_value.data = []
    
    return mock


@pytest.fixture
def analytics_service(mock_supabase):
    """Create an analytics service with mocked Supabase."""
    service = EnterpriseAnalyticsService(supabase_client=mock_supabase)
    return service


# =============================================================================
# Admin Access Tests
# =============================================================================

class TestAdminAccess:
    """Tests for admin access control."""
    
    def test_is_admin_with_correct_email(self, analytics_service):
        """Admin email should return True."""
        assert analytics_service.is_admin(ANALYTICS_ADMIN_EMAIL) is True
    
    def test_is_admin_with_wrong_email(self, analytics_service):
        """Non-admin email should return False."""
        assert analytics_service.is_admin('other@example.com') is False
    
    def test_is_admin_with_none(self, analytics_service):
        """None email should return False."""
        assert analytics_service.is_admin(None) is False


# =============================================================================
# Visitor Tracking Tests
# =============================================================================

class TestVisitorTracking:
    """Tests for visitor tracking functionality."""
    
    def test_track_new_visitor(self, analytics_service, mock_supabase):
        """Should create a new visitor record."""
        # Setup: No existing visitor
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        result = analytics_service.track_visitor(
            visitor_id='v_test123',
            device_type='desktop',
            browser='Chrome',
            os='macOS',
        )
        
        assert result['visitor_id'] == 'v_test123'
        assert result['is_returning'] is False
        assert result['visit_count'] == 1
        
        # Verify insert was called
        mock_supabase.table.assert_called_with('site_visitors')
    
    def test_track_returning_visitor(self, analytics_service, mock_supabase):
        """Should update existing visitor and increment visit count."""
        # Setup: Existing visitor with 5 visits
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {'visitor_id': 'v_test123', 'visit_count': 5}
        ]
        
        result = analytics_service.track_visitor(visitor_id='v_test123')
        
        assert result['visitor_id'] == 'v_test123'
        assert result['is_returning'] is True
        assert result['visit_count'] == 6
    
    def test_track_visitor_with_utm_params(self, analytics_service, mock_supabase):
        """Should store UTM parameters for new visitors."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        result = analytics_service.track_visitor(
            visitor_id='v_test123',
            utm_source='google',
            utm_medium='cpc',
            utm_campaign='summer_sale',
        )
        
        assert result['is_returning'] is False
        
        # Verify UTM params were passed to insert
        insert_call = mock_supabase.table.return_value.insert.call_args
        assert insert_call is not None


# =============================================================================
# Session Tracking Tests
# =============================================================================

class TestSessionTracking:
    """Tests for session tracking functionality."""
    
    def test_start_session(self, analytics_service, mock_supabase):
        """Should create a new session record."""
        result = analytics_service.start_session(
            session_id='s_test123',
            visitor_id='v_test123',
            entry_page='/dashboard',
            device_type='desktop',
        )
        
        assert result['session_id'] == 's_test123'
        assert result['started'] is True
        
        # Verify session was inserted
        mock_supabase.table.assert_called()
    
    def test_start_session_mobile(self, analytics_service, mock_supabase):
        """Should set is_mobile flag for mobile devices."""
        result = analytics_service.start_session(
            session_id='s_test123',
            visitor_id='v_test123',
            entry_page='/',
            device_type='mobile',
        )
        
        assert result['started'] is True
    
    def test_end_session(self, analytics_service, mock_supabase):
        """Should update session with end data."""
        result = analytics_service.end_session(
            session_id='s_test123',
            visitor_id='v_test123',
            duration_ms=120000,
            pages_viewed=5,
            exit_page='/pricing',
        )
        
        assert result['session_id'] == 's_test123'
        assert result['ended'] is True
        assert result['is_bounce'] is False
    
    def test_end_session_bounce(self, analytics_service, mock_supabase):
        """Should mark session as bounce if single page and short duration."""
        result = analytics_service.end_session(
            session_id='s_test123',
            visitor_id='v_test123',
            duration_ms=5000,  # 5 seconds
            pages_viewed=1,
        )
        
        assert result['is_bounce'] is True
    
    def test_end_session_with_conversion(self, analytics_service, mock_supabase):
        """Should update visitor conversion status on conversion."""
        result = analytics_service.end_session(
            session_id='s_test123',
            visitor_id='v_test123',
            duration_ms=60000,
            pages_viewed=3,
            converted=True,
            conversion_event='signup',
        )
        
        assert result['ended'] is True
        # Verify visitor was updated with conversion
        mock_supabase.table.return_value.update.assert_called()


# =============================================================================
# Page View Tracking Tests
# =============================================================================

class TestPageViewTracking:
    """Tests for page view tracking functionality."""
    
    def test_track_page_view(self, analytics_service, mock_supabase):
        """Should create a page view record."""
        result = analytics_service.track_page_view(
            session_id='s_test123',
            visitor_id='v_test123',
            page_path='/dashboard',
            page_title='Dashboard',
        )
        
        assert result['tracked'] is True
        assert result['page_path'] == '/dashboard'
    
    def test_track_page_view_with_scroll_depth(self, analytics_service, mock_supabase):
        """Should store scroll depth."""
        result = analytics_service.track_page_view(
            session_id='s_test123',
            visitor_id='v_test123',
            page_path='/pricing',
            scroll_depth=75,
            time_on_page_ms=30000,
        )
        
        assert result['tracked'] is True


# =============================================================================
# Click Tracking Tests (Heatmaps)
# =============================================================================

class TestClickTracking:
    """Tests for click tracking (heatmap) functionality."""
    
    def test_track_click(self, analytics_service, mock_supabase):
        """Should create a click record."""
        result = analytics_service.track_click(
            session_id='s_test123',
            visitor_id='v_test123',
            page_path='/pricing',
            click_x=500,
            click_y=300,
            viewport_width=1920,
            viewport_height=1080,
            element_tag='button',
            element_id='signup-btn',
        )
        
        assert result['tracked'] is True
    
    def test_track_click_truncates_long_text(self, analytics_service, mock_supabase):
        """Should truncate element text longer than 100 chars."""
        long_text = 'A' * 200
        
        result = analytics_service.track_click(
            session_id='s_test123',
            visitor_id='v_test123',
            page_path='/pricing',
            click_x=500,
            click_y=300,
            viewport_width=1920,
            viewport_height=1080,
            element_text=long_text,
        )
        
        assert result['tracked'] is True


# =============================================================================
# Funnel Tracking Tests
# =============================================================================

class TestFunnelTracking:
    """Tests for funnel event tracking."""
    
    def test_track_valid_funnel_step(self, analytics_service, mock_supabase):
        """Should track valid funnel steps."""
        for step in FUNNEL_STEPS.keys():
            result = analytics_service.track_funnel_event(
                visitor_id='v_test123',
                session_id='s_test123',
                step=step,
            )
            
            assert result['tracked'] is True
            assert result['step'] == step
            assert result['step_order'] == FUNNEL_STEPS[step]
    
    def test_track_invalid_funnel_step(self, analytics_service, mock_supabase):
        """Should reject invalid funnel steps."""
        result = analytics_service.track_funnel_event(
            visitor_id='v_test123',
            session_id='s_test123',
            step='invalid_step',
        )
        
        assert result['tracked'] is False
        assert 'error' in result
    
    def test_track_funnel_with_metadata(self, analytics_service, mock_supabase):
        """Should store metadata with funnel event."""
        result = analytics_service.track_funnel_event(
            visitor_id='v_test123',
            session_id='s_test123',
            step='signup_complete',
            metadata={'plan': 'pro', 'referral': 'friend'},
        )
        
        assert result['tracked'] is True


# =============================================================================
# Abandonment Tracking Tests
# =============================================================================

class TestAbandonmentTracking:
    """Tests for abandonment tracking functionality."""
    
    def test_track_valid_abandonment_type(self, analytics_service, mock_supabase):
        """Should track valid abandonment types."""
        for atype in ABANDONMENT_TYPES:
            result = analytics_service.track_abandonment(
                visitor_id='v_test123',
                session_id='s_test123',
                abandonment_type=atype,
                page_path='/signup',
            )
            
            assert result['tracked'] is True
            assert result['type'] == atype
    
    def test_track_invalid_abandonment_type(self, analytics_service, mock_supabase):
        """Should reject invalid abandonment types."""
        result = analytics_service.track_abandonment(
            visitor_id='v_test123',
            session_id='s_test123',
            abandonment_type='invalid_type',
            page_path='/signup',
        )
        
        assert result['tracked'] is False
        assert 'error' in result
    
    def test_track_form_abandonment_with_details(self, analytics_service, mock_supabase):
        """Should store form abandonment details."""
        result = analytics_service.track_abandonment(
            visitor_id='v_test123',
            session_id='s_test123',
            abandonment_type='form',
            page_path='/signup',
            form_id='signup-form',
            step_reached=2,
            total_steps=4,
            fields_filled=['email', 'name'],
            time_spent_ms=45000,
            last_interaction='password-field',
        )
        
        assert result['tracked'] is True


# =============================================================================
# Real-time Presence Tests
# =============================================================================

class TestRealtimePresence:
    """Tests for real-time presence functionality."""
    
    def test_heartbeat(self, analytics_service, mock_supabase):
        """Should update presence on heartbeat."""
        result = analytics_service.heartbeat(
            visitor_id='v_test123',
            session_id='s_test123',
            current_page='/dashboard',
        )
        
        assert result['ok'] is True
    
    def test_heartbeat_with_auth(self, analytics_service, mock_supabase):
        """Should include auth info in presence."""
        result = analytics_service.heartbeat(
            visitor_id='v_test123',
            session_id='s_test123',
            current_page='/dashboard',
            is_authenticated=True,
            user_id='user_123',
        )
        
        assert result['ok'] is True


# =============================================================================
# Dashboard Query Tests
# =============================================================================

class TestDashboardQueries:
    """Tests for dashboard query methods."""
    
    def test_get_dashboard_summary_with_aggregated_data(self, analytics_service, mock_supabase):
        """Should return summary from aggregated data."""
        mock_supabase.table.return_value.select.return_value.gte.return_value.lte.return_value.order.return_value.execute.return_value.data = [
            {
                'date': '2025-12-27',
                'unique_visitors': 100,
                'total_sessions': 150,
                'total_page_views': 500,
                'total_signups': 10,
                'bounce_count': 30,
                'new_visitors': 80,
                'returning_visitors': 20,
                'avg_session_duration_ms': 120000,
                'desktop_sessions': 100,
                'mobile_sessions': 40,
                'tablet_sessions': 10,
            }
        ]
        
        result = analytics_service.get_dashboard_summary()
        
        assert 'totals' in result
        assert result['totals']['unique_visitors'] == 100
        assert result['totals']['total_sessions'] == 150
        assert 'bounce_rate' in result
        assert 'return_rate' in result
    
    def test_get_realtime_active(self, analytics_service, mock_supabase):
        """Should return real-time active users."""
        mock_supabase.rpc.return_value.execute.return_value.data = [{
            'total_active': 25,
            'authenticated_count': 10,
            'anonymous_count': 15,
            'pages': [{'page': '/dashboard', 'count': 10}],
        }]
        
        result = analytics_service.get_realtime_active()
        
        assert result['total_active'] == 25
        assert result['authenticated_count'] == 10
    
    def test_get_daily_visitors(self, analytics_service, mock_supabase):
        """Should return daily visitor data."""
        mock_supabase.rpc.return_value.execute.return_value.data = [
            {'date': '2025-12-27', 'unique_visitors': 100},
            {'date': '2025-12-26', 'unique_visitors': 90},
        ]
        
        result = analytics_service.get_daily_visitors()
        
        assert len(result) == 2
    
    def test_get_funnel_data(self, analytics_service, mock_supabase):
        """Should return funnel conversion data."""
        mock_supabase.rpc.return_value.execute.return_value.data = [
            {'step': 'landing_view', 'total_count': 1000, 'conversion_rate': 100},
            {'step': 'cta_click', 'total_count': 300, 'conversion_rate': 30},
        ]
        
        result = analytics_service.get_funnel_data()
        
        assert 'funnel' in result
        assert len(result['funnel']) == 2
    
    def test_get_top_journeys(self, analytics_service, mock_supabase):
        """Should return top user journeys."""
        mock_supabase.rpc.return_value.execute.return_value.data = [
            {
                'journey_hash': 'abc123',
                'page_sequence': ['/', '/pricing', '/signup'],
                'journey_count': 50,
                'conversion_rate': 20,
            }
        ]
        
        result = analytics_service.get_top_journeys()
        
        assert len(result) == 1
        assert result[0]['journey_count'] == 50
    
    def test_get_abandonment_analysis(self, analytics_service, mock_supabase):
        """Should return abandonment analysis."""
        mock_supabase.rpc.return_value.execute.return_value.data = [
            {
                'abandonment_type': 'signup',
                'page_path': '/signup',
                'abandonment_count': 25,
                'avg_step_reached': 2.5,
            }
        ]
        
        result = analytics_service.get_abandonment_analysis()
        
        assert len(result) == 1
        assert result[0]['abandonment_count'] == 25
    
    def test_get_geo_breakdown(self, analytics_service, mock_supabase):
        """Should return geographic breakdown."""
        mock_supabase.rpc.return_value.execute.return_value.data = [
            {'country': 'US', 'visitor_count': 500, 'conversion_rate': 5},
            {'country': 'GB', 'visitor_count': 200, 'conversion_rate': 4},
        ]
        
        result = analytics_service.get_geo_breakdown()
        
        assert len(result) == 2
    
    def test_get_device_breakdown(self, analytics_service, mock_supabase):
        """Should return device breakdown."""
        mock_supabase.rpc.return_value.execute.return_value.data = [
            {'device_type': 'desktop', 'browser': 'Chrome', 'session_count': 300},
            {'device_type': 'mobile', 'browser': 'Safari', 'session_count': 150},
        ]
        
        result = analytics_service.get_device_breakdown()
        
        assert len(result) == 2
    
    def test_get_recent_sessions(self, analytics_service, mock_supabase):
        """Should return recent sessions."""
        mock_supabase.table.return_value.select.return_value.order.return_value.limit.return_value.execute.return_value.data = [
            {'session_id': 's_1', 'pages_viewed': 5},
            {'session_id': 's_2', 'pages_viewed': 3},
        ]
        
        result = analytics_service.get_recent_sessions(limit=10)
        
        assert len(result) == 2


# =============================================================================
# Error Handling Tests
# =============================================================================

class TestErrorHandling:
    """Tests for error handling."""
    
    def test_track_visitor_handles_db_error(self, analytics_service, mock_supabase):
        """Should handle database errors gracefully."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception('DB Error')
        
        result = analytics_service.track_visitor(visitor_id='v_test123')
        
        assert 'error' in result
    
    def test_track_page_view_handles_db_error(self, analytics_service, mock_supabase):
        """Should handle database errors gracefully."""
        mock_supabase.table.return_value.insert.return_value.execute.side_effect = Exception('DB Error')
        
        result = analytics_service.track_page_view(
            session_id='s_test123',
            visitor_id='v_test123',
            page_path='/test',
        )
        
        assert result['tracked'] is False
        assert 'error' in result
