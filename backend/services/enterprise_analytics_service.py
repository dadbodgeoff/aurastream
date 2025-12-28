"""
Enterprise Analytics Service - Production-ready comprehensive analytics.

Features:
- Visitor & session tracking
- Heatmap click tracking
- User journey analysis
- Abandonment tracking
- Real-time presence
- Geographic & device breakdown
- Daily aggregation

Admin access: dadbodgeoff@gmail.com only
"""

import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Optional
from collections import defaultdict

logger = logging.getLogger(__name__)

# Admin email for dashboard access
ANALYTICS_ADMIN_EMAIL = 'dadbodgeoff@gmail.com'

# Funnel step definitions with order
FUNNEL_STEPS = {
    'landing_view': 1,
    'cta_click': 2,
    'signup_start': 3,
    'signup_complete': 4,
    'first_generation': 5,
}

# Abandonment types
ABANDONMENT_TYPES = {'form', 'checkout', 'signup', 'generation', 'wizard', 'onboarding'}


class EnterpriseAnalyticsService:
    """Enterprise-grade analytics service with comprehensive tracking."""
    
    def __init__(self, supabase_client=None):
        self._supabase = supabase_client
    
    @property
    def supabase(self):
        """Lazy-load Supabase client."""
        if self._supabase is None:
            from backend.database.supabase_client import get_supabase_client
            self._supabase = get_supabase_client()
        return self._supabase
    
    def is_admin(self, user_email: Optional[str]) -> bool:
        """Check if user has admin access to analytics."""
        return user_email == ANALYTICS_ADMIN_EMAIL
    
    # =========================================================================
    # VISITOR TRACKING
    # =========================================================================
    
    def track_visitor(
        self,
        visitor_id: str,
        referrer_source: Optional[str] = None,
        utm_source: Optional[str] = None,
        utm_medium: Optional[str] = None,
        utm_campaign: Optional[str] = None,
        device_type: Optional[str] = None,
        browser: Optional[str] = None,
        os: Optional[str] = None,
        country: Optional[str] = None,
        city: Optional[str] = None,
        region: Optional[str] = None,
        screen_resolution: Optional[str] = None,
        language: Optional[str] = None,
    ) -> dict[str, Any]:
        """Track or update a visitor."""
        try:
            existing = self.supabase.table('site_visitors').select(
                'visitor_id, visit_count'
            ).eq('visitor_id', visitor_id).execute()
            
            if existing.data:
                visit_count = existing.data[0]['visit_count'] + 1
                self.supabase.table('site_visitors').update({
                    'last_seen_at': datetime.now(timezone.utc).isoformat(),
                    'visit_count': visit_count,
                }).eq('visitor_id', visitor_id).execute()
                
                return {'visitor_id': visitor_id, 'is_returning': True, 'visit_count': visit_count}
            else:
                self.supabase.table('site_visitors').insert({
                    'visitor_id': visitor_id,
                    'referrer_source': referrer_source,
                    'utm_source': utm_source,
                    'utm_medium': utm_medium,
                    'utm_campaign': utm_campaign,
                    'device_type': device_type,
                    'browser': browser,
                    'os': os,
                    'country': country,
                    'city': city,
                    'region': region,
                    'screen_resolution': screen_resolution,
                    'language': language,
                }).execute()
                
                return {'visitor_id': visitor_id, 'is_returning': False, 'visit_count': 1}
                
        except Exception as e:
            logger.error(f"Failed to track visitor: {e}")
            return {'visitor_id': visitor_id, 'error': str(e)}

    # =========================================================================
    # SESSION TRACKING
    # =========================================================================
    
    def start_session(
        self,
        session_id: str,
        visitor_id: str,
        entry_page: str,
        referrer: Optional[str] = None,
        device_type: Optional[str] = None,
        user_agent: Optional[str] = None,
        screen_resolution: Optional[str] = None,
        language: Optional[str] = None,
        timezone_str: Optional[str] = None,
    ) -> dict[str, Any]:
        """Start a new session."""
        try:
            is_mobile = device_type == 'mobile'
            is_tablet = device_type == 'tablet'
            
            self.supabase.table('site_sessions').insert({
                'session_id': session_id,
                'visitor_id': visitor_id,
                'entry_page': entry_page,
                'referrer': referrer,
                'device_type': device_type,
                'user_agent': user_agent,
                'screen_resolution': screen_resolution,
                'language': language,
                'timezone': timezone_str,
                'is_mobile': is_mobile,
                'is_tablet': is_tablet,
                'pages_viewed': 1,
            }).execute()
            
            # Update real-time presence
            self._update_presence(visitor_id, session_id, entry_page)
            
            return {'session_id': session_id, 'started': True}
            
        except Exception as e:
            logger.error(f"Failed to start session: {e}")
            return {'session_id': session_id, 'error': str(e)}
    
    def end_session(
        self,
        session_id: str,
        visitor_id: str,
        duration_ms: int,
        pages_viewed: int,
        exit_page: Optional[str] = None,
        converted: bool = False,
        conversion_event: Optional[str] = None,
        page_sequence: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        """End a session and record journey."""
        try:
            is_bounce = pages_viewed <= 1 and duration_ms < 10000
            
            self.supabase.table('site_sessions').update({
                'ended_at': datetime.now(timezone.utc).isoformat(),
                'duration_ms': duration_ms,
                'pages_viewed': pages_viewed,
                'exit_page': exit_page,
                'converted': converted,
                'conversion_event': conversion_event,
                'is_bounce': is_bounce,
            }).eq('session_id', session_id).execute()
            
            # Record user journey if we have page sequence
            if page_sequence and len(page_sequence) > 0:
                self._record_journey(
                    visitor_id=visitor_id,
                    session_id=session_id,
                    page_sequence=page_sequence,
                    duration_ms=duration_ms,
                    converted=converted,
                    conversion_page=exit_page if converted else None,
                )
            
            # Update visitor conversion status
            if converted:
                self.supabase.table('site_visitors').update({
                    'converted': True,
                    'converted_at': datetime.now(timezone.utc).isoformat(),
                }).eq('visitor_id', visitor_id).execute()
            
            # Remove from real-time presence
            self._remove_presence(visitor_id)
            
            return {'session_id': session_id, 'ended': True, 'is_bounce': is_bounce}
            
        except Exception as e:
            logger.error(f"Failed to end session: {e}")
            return {'session_id': session_id, 'error': str(e)}
    
    # =========================================================================
    # PAGE VIEW TRACKING
    # =========================================================================
    
    def track_page_view(
        self,
        session_id: str,
        visitor_id: str,
        page_path: str,
        page_title: Optional[str] = None,
        referrer_page: Optional[str] = None,
        scroll_depth: Optional[int] = None,
        time_on_page_ms: Optional[int] = None,
    ) -> dict[str, Any]:
        """Track a page view."""
        try:
            self.supabase.table('site_page_views').insert({
                'session_id': session_id,
                'visitor_id': visitor_id,
                'page_path': page_path,
                'page_title': page_title,
                'referrer_page': referrer_page,
                'scroll_depth': scroll_depth,
                'time_on_page_ms': time_on_page_ms,
            }).execute()
            
            # Update session page count
            try:
                self.supabase.rpc('increment_session_pages', {'p_session_id': session_id}).execute()
            except Exception:
                pass  # Non-critical
            
            # Update real-time presence
            self._update_presence(visitor_id, session_id, page_path)
            
            return {'tracked': True, 'page_path': page_path}
            
        except Exception as e:
            logger.error(f"Failed to track page view: {e}")
            return {'tracked': False, 'error': str(e)}
    
    # =========================================================================
    # HEATMAP CLICK TRACKING
    # =========================================================================
    
    def track_click(
        self,
        session_id: str,
        visitor_id: str,
        page_path: str,
        click_x: int,
        click_y: int,
        viewport_width: int,
        viewport_height: int,
        element_tag: Optional[str] = None,
        element_id: Optional[str] = None,
        element_class: Optional[str] = None,
        element_text: Optional[str] = None,
    ) -> dict[str, Any]:
        """Track a click for heatmap visualization."""
        try:
            # Truncate element text to prevent huge payloads
            if element_text and len(element_text) > 100:
                element_text = element_text[:100] + '...'
            
            self.supabase.table('site_heatmap_clicks').insert({
                'session_id': session_id,
                'visitor_id': visitor_id,
                'page_path': page_path,
                'click_x': click_x,
                'click_y': click_y,
                'viewport_width': viewport_width,
                'viewport_height': viewport_height,
                'element_tag': element_tag,
                'element_id': element_id,
                'element_class': element_class,
                'element_text': element_text,
            }).execute()
            
            return {'tracked': True}
            
        except Exception as e:
            logger.error(f"Failed to track click: {e}")
            return {'tracked': False, 'error': str(e)}
    
    # =========================================================================
    # FUNNEL TRACKING
    # =========================================================================
    
    def track_funnel_event(
        self,
        visitor_id: str,
        session_id: str,
        step: str,
        metadata: Optional[dict] = None,
    ) -> dict[str, Any]:
        """Track a funnel conversion event."""
        if step not in FUNNEL_STEPS:
            return {'tracked': False, 'error': 'unknown_step'}
        
        try:
            step_order = FUNNEL_STEPS[step]
            
            self.supabase.table('site_funnel_events').insert({
                'visitor_id': visitor_id,
                'session_id': session_id,
                'step': step,
                'step_order': step_order,
                'metadata': metadata or {},
            }).execute()
            
            # Update daily funnel aggregate
            today = datetime.now(timezone.utc).date().isoformat()
            try:
                self.supabase.rpc('upsert_funnel_daily', {
                    'p_date': today,
                    'p_step': step,
                    'p_step_order': step_order,
                }).execute()
            except Exception:
                pass  # Non-critical
            
            return {'tracked': True, 'step': step, 'step_order': step_order}
            
        except Exception as e:
            logger.error(f"Failed to track funnel event: {e}")
            return {'tracked': False, 'error': str(e)}
    
    # =========================================================================
    # ABANDONMENT TRACKING
    # =========================================================================
    
    def track_abandonment(
        self,
        visitor_id: str,
        session_id: str,
        abandonment_type: str,
        page_path: str,
        form_id: Optional[str] = None,
        step_reached: Optional[int] = None,
        total_steps: Optional[int] = None,
        fields_filled: Optional[list[str]] = None,
        time_spent_ms: Optional[int] = None,
        last_interaction: Optional[str] = None,
    ) -> dict[str, Any]:
        """Track form/flow abandonment."""
        if abandonment_type not in ABANDONMENT_TYPES:
            return {'tracked': False, 'error': 'invalid_abandonment_type'}
        
        try:
            self.supabase.table('site_abandonment_events').insert({
                'visitor_id': visitor_id,
                'session_id': session_id,
                'abandonment_type': abandonment_type,
                'page_path': page_path,
                'form_id': form_id,
                'step_reached': step_reached,
                'total_steps': total_steps,
                'fields_filled': {'fields': fields_filled or []},
                'time_spent_ms': time_spent_ms,
                'last_interaction': last_interaction,
            }).execute()
            
            return {'tracked': True, 'type': abandonment_type}
            
        except Exception as e:
            logger.error(f"Failed to track abandonment: {e}")
            return {'tracked': False, 'error': str(e)}
    
    # =========================================================================
    # REAL-TIME PRESENCE
    # =========================================================================
    
    def _update_presence(
        self,
        visitor_id: str,
        session_id: str,
        current_page: str,
        is_authenticated: bool = False,
        user_id: Optional[str] = None,
    ) -> None:
        """Update real-time presence."""
        try:
            self.supabase.table('site_realtime_presence').upsert({
                'visitor_id': visitor_id,
                'session_id': session_id,
                'current_page': current_page,
                'last_activity_at': datetime.now(timezone.utc).isoformat(),
                'is_authenticated': is_authenticated,
                'user_id': user_id,
            }).execute()
        except Exception as e:
            logger.debug(f"Failed to update presence: {e}")
    
    def _remove_presence(self, visitor_id: str) -> None:
        """Remove from real-time presence."""
        try:
            self.supabase.table('site_realtime_presence').delete().eq(
                'visitor_id', visitor_id
            ).execute()
        except Exception as e:
            logger.debug(f"Failed to remove presence: {e}")
    
    def heartbeat(
        self,
        visitor_id: str,
        session_id: str,
        current_page: str,
        is_authenticated: bool = False,
        user_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """Heartbeat to keep presence alive."""
        self._update_presence(visitor_id, session_id, current_page, is_authenticated, user_id)
        return {'ok': True}
    
    # =========================================================================
    # USER JOURNEY RECORDING
    # =========================================================================
    
    def _record_journey(
        self,
        visitor_id: str,
        session_id: str,
        page_sequence: list[str],
        duration_ms: int,
        converted: bool,
        conversion_page: Optional[str],
    ) -> None:
        """Record a user journey."""
        try:
            # Create hash of journey for grouping similar paths
            journey_str = '->'.join(page_sequence)
            journey_hash = hashlib.md5(journey_str.encode()).hexdigest()[:16]
            
            # Get session start time
            session = self.supabase.table('site_sessions').select(
                'started_at'
            ).eq('session_id', session_id).execute()
            
            started_at = session.data[0]['started_at'] if session.data else datetime.now(timezone.utc).isoformat()
            
            self.supabase.table('site_user_journeys').insert({
                'visitor_id': visitor_id,
                'session_id': session_id,
                'journey_hash': journey_hash,
                'page_sequence': page_sequence,
                'page_count': len(page_sequence),
                'total_duration_ms': duration_ms,
                'converted': converted,
                'conversion_page': conversion_page,
                'started_at': started_at,
                'ended_at': datetime.now(timezone.utc).isoformat(),
            }).execute()
            
        except Exception as e:
            logger.error(f"Failed to record journey: {e}")

    # =========================================================================
    # DASHBOARD QUERIES (Admin Only)
    # =========================================================================
    
    def get_dashboard_summary(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> dict[str, Any]:
        """Get comprehensive dashboard summary."""
        try:
            if not start_date:
                start_date = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
            if not end_date:
                end_date = datetime.now(timezone.utc).date().isoformat()
            
            # Try aggregated data first
            daily = self.supabase.table('site_analytics_daily').select('*').gte(
                'date', start_date
            ).lte('date', end_date).order('date', desc=True).execute()
            
            if daily.data:
                totals = {
                    'unique_visitors': sum(d.get('unique_visitors', 0) for d in daily.data),
                    'total_sessions': sum(d.get('total_sessions', 0) for d in daily.data),
                    'total_page_views': sum(d.get('total_page_views', 0) for d in daily.data),
                    'total_signups': sum(d.get('total_signups', 0) for d in daily.data),
                    'bounce_count': sum(d.get('bounce_count', 0) for d in daily.data),
                    'new_visitors': sum(d.get('new_visitors', 0) for d in daily.data),
                    'returning_visitors': sum(d.get('returning_visitors', 0) for d in daily.data),
                    'avg_session_duration_ms': int(sum(d.get('avg_session_duration_ms', 0) for d in daily.data) / max(len(daily.data), 1)),
                    'desktop_sessions': sum(d.get('desktop_sessions', 0) for d in daily.data),
                    'mobile_sessions': sum(d.get('mobile_sessions', 0) for d in daily.data),
                    'tablet_sessions': sum(d.get('tablet_sessions', 0) for d in daily.data),
                }
            else:
                # Fallback to raw queries
                totals = self._get_totals_from_raw(start_date, end_date)
            
            bounce_rate = (totals['bounce_count'] / totals['total_sessions'] * 100) if totals['total_sessions'] > 0 else 0
            return_rate = (totals['returning_visitors'] / totals['unique_visitors'] * 100) if totals['unique_visitors'] > 0 else 0
            
            return {
                'totals': totals,
                'bounce_rate': round(bounce_rate, 2),
                'return_rate': round(return_rate, 2),
                'daily': daily.data or [],
                'start_date': start_date,
                'end_date': end_date,
            }
            
        except Exception as e:
            logger.error(f"Failed to get dashboard summary: {e}")
            raise
    
    def _get_totals_from_raw(self, start_date: str, end_date: str) -> dict[str, int]:
        """Get totals directly from raw tables."""
        try:
            start_ts = f'{start_date}T00:00:00Z'
            end_ts = f'{end_date}T23:59:59Z'
            
            visitors = self.supabase.table('site_visitors').select('visitor_id, visit_count').gte(
                'first_seen_at', start_ts
            ).lte('first_seen_at', end_ts).execute()
            
            sessions = self.supabase.table('site_sessions').select(
                'session_id, is_bounce, converted, device_type, duration_ms'
            ).gte('started_at', start_ts).lte('started_at', end_ts).execute()
            
            page_views = self.supabase.table('site_page_views').select('id').gte(
                'viewed_at', start_ts
            ).lte('viewed_at', end_ts).execute()
            
            unique_visitors = len(visitors.data) if visitors.data else 0
            new_visitors = sum(1 for v in (visitors.data or []) if v.get('visit_count', 1) == 1)
            
            sessions_data = sessions.data or []
            total_sessions = len(sessions_data)
            bounce_count = sum(1 for s in sessions_data if s.get('is_bounce', False))
            total_signups = sum(1 for s in sessions_data if s.get('converted', False))
            desktop = sum(1 for s in sessions_data if s.get('device_type') == 'desktop')
            mobile = sum(1 for s in sessions_data if s.get('device_type') == 'mobile')
            tablet = sum(1 for s in sessions_data if s.get('device_type') == 'tablet')
            durations = [s.get('duration_ms', 0) for s in sessions_data if s.get('duration_ms')]
            avg_duration = int(sum(durations) / max(len(durations), 1)) if durations else 0
            
            return {
                'unique_visitors': unique_visitors,
                'total_sessions': total_sessions,
                'total_page_views': len(page_views.data) if page_views.data else 0,
                'total_signups': total_signups,
                'bounce_count': bounce_count,
                'new_visitors': new_visitors,
                'returning_visitors': unique_visitors - new_visitors,
                'avg_session_duration_ms': avg_duration,
                'desktop_sessions': desktop,
                'mobile_sessions': mobile,
                'tablet_sessions': tablet,
            }
        except Exception as e:
            logger.error(f"Failed to get totals from raw: {e}")
            return {k: 0 for k in ['unique_visitors', 'total_sessions', 'total_page_views', 
                                   'total_signups', 'bounce_count', 'new_visitors', 
                                   'returning_visitors', 'avg_session_duration_ms',
                                   'desktop_sessions', 'mobile_sessions', 'tablet_sessions']}
    
    def get_realtime_active(self) -> dict[str, Any]:
        """Get real-time active users."""
        try:
            result = self.supabase.rpc('get_realtime_active_users').execute()
            if result.data and len(result.data) > 0:
                return result.data[0]
            return {'total_active': 0, 'authenticated_count': 0, 'anonymous_count': 0, 'pages': []}
        except Exception as e:
            logger.error(f"Failed to get realtime active: {e}")
            # Fallback query
            try:
                cutoff = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
                active = self.supabase.table('site_realtime_presence').select('*').gte(
                    'last_activity_at', cutoff
                ).execute()
                data = active.data or []
                return {
                    'total_active': len(data),
                    'authenticated_count': sum(1 for d in data if d.get('is_authenticated')),
                    'anonymous_count': sum(1 for d in data if not d.get('is_authenticated')),
                    'pages': [],
                }
            except Exception:
                return {'total_active': 0, 'authenticated_count': 0, 'anonymous_count': 0, 'pages': []}
    
    def get_daily_visitors(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """Get daily visitor chart data."""
        try:
            if not start_date:
                start_date = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
            if not end_date:
                end_date = datetime.now(timezone.utc).date().isoformat()
            
            result = self.supabase.rpc('get_daily_visitors', {
                'p_start_date': start_date,
                'p_end_date': end_date,
            }).execute()
            
            return result.data or []
        except Exception as e:
            logger.error(f"Failed to get daily visitors: {e}")
            return []
    
    def get_funnel_data(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> dict[str, Any]:
        """Get funnel conversion data."""
        try:
            if not start_date:
                start_date = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
            if not end_date:
                end_date = datetime.now(timezone.utc).date().isoformat()
            
            result = self.supabase.rpc('get_funnel_conversion', {
                'p_start_date': start_date,
                'p_end_date': end_date,
            }).execute()
            
            return {'funnel': result.data or [], 'start_date': start_date, 'end_date': end_date}
        except Exception as e:
            logger.error(f"Failed to get funnel data: {e}")
            return {'funnel': [], 'start_date': start_date, 'end_date': end_date}
    
    def get_heatmap_data(
        self,
        page_path: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        viewport_width: int = 1920,
    ) -> dict[str, Any]:
        """Get heatmap click data for a page."""
        try:
            if not start_date:
                start_date = (datetime.now(timezone.utc) - timedelta(days=7)).date().isoformat()
            if not end_date:
                end_date = datetime.now(timezone.utc).date().isoformat()
            
            result = self.supabase.rpc('get_heatmap_data', {
                'p_page_path': page_path,
                'p_start_date': start_date,
                'p_end_date': end_date,
                'p_viewport_width': viewport_width,
            }).execute()
            
            return {
                'page_path': page_path,
                'clicks': result.data or [],
                'start_date': start_date,
                'end_date': end_date,
            }
        except Exception as e:
            logger.error(f"Failed to get heatmap data: {e}")
            return {'page_path': page_path, 'clicks': [], 'start_date': start_date, 'end_date': end_date}
    
    def get_top_journeys(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Get top user journeys."""
        try:
            if not start_date:
                start_date = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
            if not end_date:
                end_date = datetime.now(timezone.utc).date().isoformat()
            
            result = self.supabase.rpc('get_top_journeys', {
                'p_start_date': start_date,
                'p_end_date': end_date,
                'p_limit': limit,
            }).execute()
            
            return result.data or []
        except Exception as e:
            logger.error(f"Failed to get top journeys: {e}")
            return []
    
    def get_abandonment_analysis(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        abandonment_type: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """Get abandonment analysis."""
        try:
            if not start_date:
                start_date = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
            if not end_date:
                end_date = datetime.now(timezone.utc).date().isoformat()
            
            result = self.supabase.rpc('get_abandonment_analysis', {
                'p_start_date': start_date,
                'p_end_date': end_date,
                'p_type': abandonment_type,
            }).execute()
            
            return result.data or []
        except Exception as e:
            logger.error(f"Failed to get abandonment analysis: {e}")
            return []
    
    def get_geo_breakdown(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Get geographic breakdown."""
        try:
            if not start_date:
                start_date = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
            if not end_date:
                end_date = datetime.now(timezone.utc).date().isoformat()
            
            result = self.supabase.rpc('get_geo_breakdown', {
                'p_start_date': start_date,
                'p_end_date': end_date,
                'p_limit': limit,
            }).execute()
            
            return result.data or []
        except Exception as e:
            logger.error(f"Failed to get geo breakdown: {e}")
            return []
    
    def get_device_breakdown(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """Get device/browser breakdown."""
        try:
            if not start_date:
                start_date = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
            if not end_date:
                end_date = datetime.now(timezone.utc).date().isoformat()
            
            result = self.supabase.rpc('get_device_breakdown', {
                'p_start_date': start_date,
                'p_end_date': end_date,
            }).execute()
            
            return result.data or []
        except Exception as e:
            logger.error(f"Failed to get device breakdown: {e}")
            return []
    
    def get_page_flow(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 20,
    ) -> dict[str, Any]:
        """Get page flow data."""
        try:
            if not start_date:
                start_date = (datetime.now(timezone.utc) - timedelta(days=7)).date().isoformat()
            if not end_date:
                end_date = datetime.now(timezone.utc).date().isoformat()
            
            result = self.supabase.rpc('get_page_flow', {
                'p_start_date': start_date,
                'p_end_date': end_date,
                'p_limit': limit,
            }).execute()
            
            return {'flows': result.data or [], 'start_date': start_date, 'end_date': end_date}
        except Exception as e:
            logger.error(f"Failed to get page flow: {e}")
            return {'flows': [], 'start_date': start_date, 'end_date': end_date}
    
    def get_top_pages(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Get top pages by views."""
        try:
            if not start_date:
                start_date = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
            if not end_date:
                end_date = datetime.now(timezone.utc).date().isoformat()
            
            result = self.supabase.rpc('get_top_pages', {
                'p_start_date': start_date,
                'p_end_date': end_date,
                'p_limit': limit,
            }).execute()
            
            return result.data or []
        except Exception as e:
            logger.error(f"Failed to get top pages: {e}")
            return []
    
    def get_recent_sessions(self, limit: int = 50) -> list[dict[str, Any]]:
        """Get recent sessions."""
        try:
            result = self.supabase.table('site_sessions').select(
                'session_id, visitor_id, started_at, ended_at, duration_ms, pages_viewed, '
                'entry_page, exit_page, converted, is_bounce, device_type'
            ).order('started_at', desc=True).limit(limit).execute()
            
            return result.data or []
        except Exception as e:
            logger.error(f"Failed to get recent sessions: {e}")
            return []
    
    def aggregate_daily(self, date: Optional[str] = None) -> dict[str, Any]:
        """Trigger daily aggregation."""
        try:
            if not date:
                date = (datetime.now(timezone.utc) - timedelta(days=1)).date().isoformat()
            
            self.supabase.rpc('aggregate_daily_analytics', {'p_date': date}).execute()
            
            return {'aggregated': True, 'date': date}
        except Exception as e:
            logger.error(f"Failed to aggregate daily: {e}")
            raise


# Singleton instance
_enterprise_analytics_service: Optional[EnterpriseAnalyticsService] = None


def get_enterprise_analytics_service() -> EnterpriseAnalyticsService:
    """Get or create the enterprise analytics service singleton."""
    global _enterprise_analytics_service
    
    if _enterprise_analytics_service is None:
        _enterprise_analytics_service = EnterpriseAnalyticsService()
    
    return _enterprise_analytics_service
