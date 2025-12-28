"""
Site Analytics Service - Production-ready visitor and conversion tracking.

Handles:
- Visitor identification (persistent across sessions)
- Session tracking (per visit)
- Page view tracking with scroll depth
- Funnel conversion events
- Session end with sendBeacon support
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Optional
from collections import defaultdict

logger = logging.getLogger(__name__)

# Funnel step definitions with order
FUNNEL_STEPS = {
    'landing_view': 1,
    'cta_click': 2,
    'signup_start': 3,
    'signup_complete': 4,
    'first_generation': 5,
}

# Admin email for dashboard access
ANALYTICS_ADMIN_EMAIL = 'dadbodgeoff@gmail.com'


class SiteAnalyticsService:
    """Service for site-wide analytics tracking."""
    
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
    # Visitor Tracking
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
    ) -> dict[str, Any]:
        """
        Track or update a visitor. Creates new visitor or increments visit count.
        """
        try:
            # Check if visitor exists
            existing = self.supabase.table('site_visitors').select('visitor_id, visit_count').eq('visitor_id', visitor_id).execute()
            
            if existing.data:
                # Update existing visitor
                visit_count = existing.data[0]['visit_count'] + 1
                result = self.supabase.table('site_visitors').update({
                    'last_seen_at': datetime.now(timezone.utc).isoformat(),
                    'visit_count': visit_count,
                }).eq('visitor_id', visitor_id).execute()
                
                return {'visitor_id': visitor_id, 'is_returning': True, 'visit_count': visit_count}
            else:
                # Create new visitor
                result = self.supabase.table('site_visitors').insert({
                    'visitor_id': visitor_id,
                    'referrer_source': referrer_source,
                    'utm_source': utm_source,
                    'utm_medium': utm_medium,
                    'utm_campaign': utm_campaign,
                    'device_type': device_type,
                    'browser': browser,
                    'os': os,
                    'country': country,
                }).execute()
                
                return {'visitor_id': visitor_id, 'is_returning': False, 'visit_count': 1}
                
        except Exception as e:
            logger.error(f"Failed to track visitor: {e}")
            raise

    # =========================================================================
    # Session Tracking
    # =========================================================================
    
    def start_session(
        self,
        session_id: str,
        visitor_id: str,
        entry_page: str,
        referrer: Optional[str] = None,
        device_type: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> dict[str, Any]:
        """Start a new session for a visitor."""
        try:
            result = self.supabase.table('site_sessions').insert({
                'session_id': session_id,
                'visitor_id': visitor_id,
                'entry_page': entry_page,
                'referrer': referrer,
                'device_type': device_type,
                'user_agent': user_agent,
                'pages_viewed': 1,
            }).execute()
            
            return {'session_id': session_id, 'started': True}
            
        except Exception as e:
            logger.error(f"Failed to start session: {e}")
            raise
    
    def end_session(
        self,
        session_id: str,
        visitor_id: str,
        duration_ms: int,
        pages_viewed: int,
        exit_page: Optional[str] = None,
        converted: bool = False,
        conversion_event: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        End a session. Called via sendBeacon on page unload.
        """
        try:
            is_bounce = pages_viewed <= 1 and duration_ms < 10000  # < 10 seconds
            
            result = self.supabase.table('site_sessions').update({
                'ended_at': datetime.now(timezone.utc).isoformat(),
                'duration_ms': duration_ms,
                'pages_viewed': pages_viewed,
                'exit_page': exit_page,
                'converted': converted,
                'conversion_event': conversion_event,
                'is_bounce': is_bounce,
            }).eq('session_id', session_id).execute()
            
            # Update visitor conversion status if converted
            if converted:
                self.supabase.table('site_visitors').update({
                    'converted': True,
                    'converted_at': datetime.now(timezone.utc).isoformat(),
                }).eq('visitor_id', visitor_id).execute()
            
            return {'session_id': session_id, 'ended': True, 'is_bounce': is_bounce}
            
        except Exception as e:
            logger.error(f"Failed to end session: {e}")
            raise
    
    # =========================================================================
    # Page View Tracking
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
        """Track a page view within a session."""
        try:
            result = self.supabase.table('site_page_views').insert({
                'session_id': session_id,
                'visitor_id': visitor_id,
                'page_path': page_path,
                'page_title': page_title,
                'referrer_page': referrer_page,
                'scroll_depth': scroll_depth,
                'time_on_page_ms': time_on_page_ms,
            }).execute()
            
            # Increment pages_viewed in session
            self.supabase.rpc('increment_session_pages', {'p_session_id': session_id}).execute()
            
            return {'tracked': True, 'page_path': page_path}
            
        except Exception as e:
            logger.error(f"Failed to track page view: {e}")
            # Don't raise - page views are non-critical
            return {'tracked': False, 'error': str(e)}
    
    # =========================================================================
    # Funnel Tracking
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
            logger.warning(f"Unknown funnel step: {step}")
            return {'tracked': False, 'error': 'unknown_step'}
        
        try:
            step_order = FUNNEL_STEPS[step]
            
            result = self.supabase.table('site_funnel_events').insert({
                'visitor_id': visitor_id,
                'session_id': session_id,
                'step': step,
                'step_order': step_order,
                'metadata': metadata or {},
            }).execute()
            
            # Update daily funnel aggregate
            today = datetime.now(timezone.utc).date().isoformat()
            self.supabase.rpc('upsert_funnel_daily', {
                'p_date': today,
                'p_step': step,
                'p_step_order': step_order,
            }).execute()
            
            return {'tracked': True, 'step': step, 'step_order': step_order}
            
        except Exception as e:
            logger.error(f"Failed to track funnel event: {e}")
            return {'tracked': False, 'error': str(e)}

    # =========================================================================
    # Dashboard Queries (Admin Only)
    # =========================================================================
    
    def get_dashboard_summary(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> dict[str, Any]:
        """Get dashboard summary for date range."""
        try:
            if not start_date:
                start_date = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
            if not end_date:
                end_date = datetime.now(timezone.utc).date().isoformat()
            
            # Get daily aggregates
            daily = self.supabase.table('site_analytics_daily').select('*').gte('date', start_date).lte('date', end_date).order('date', desc=True).execute()
            
            # If no aggregated data, query raw tables directly
            if not daily.data:
                return self._get_dashboard_summary_from_raw(start_date, end_date)
            
            # Calculate totals from aggregated data
            totals = {
                'unique_visitors': 0,
                'total_sessions': 0,
                'total_page_views': 0,
                'total_signups': 0,
                'bounce_count': 0,
                'new_visitors': 0,
                'returning_visitors': 0,
            }
            
            for day in daily.data or []:
                totals['unique_visitors'] += day.get('unique_visitors', 0)
                totals['total_sessions'] += day.get('total_sessions', 0)
                totals['total_page_views'] += day.get('total_page_views', 0)
                totals['total_signups'] += day.get('total_signups', 0)
                totals['bounce_count'] += day.get('bounce_count', 0)
                totals['new_visitors'] += day.get('new_visitors', 0)
                totals['returning_visitors'] += day.get('returning_visitors', 0)
            
            # Calculate rates
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
    
    def _get_dashboard_summary_from_raw(
        self,
        start_date: str,
        end_date: str,
    ) -> dict[str, Any]:
        """Fallback: Get dashboard summary directly from raw tables."""
        try:
            # Query visitors
            visitors = self.supabase.table('site_visitors').select('visitor_id, visit_count, converted').gte('first_seen_at', f'{start_date}T00:00:00Z').lte('first_seen_at', f'{end_date}T23:59:59Z').execute()
            
            # Query sessions
            sessions = self.supabase.table('site_sessions').select('session_id, is_bounce, converted, pages_viewed').gte('started_at', f'{start_date}T00:00:00Z').lte('started_at', f'{end_date}T23:59:59Z').execute()
            
            # Query page views - just get IDs and count them
            page_views = self.supabase.table('site_page_views').select('id').gte('viewed_at', f'{start_date}T00:00:00Z').lte('viewed_at', f'{end_date}T23:59:59Z').execute()
            
            # Calculate totals
            unique_visitors = len(visitors.data) if visitors.data else 0
            new_visitors = sum(1 for v in (visitors.data or []) if v.get('visit_count', 1) == 1)
            returning_visitors = unique_visitors - new_visitors
            total_sessions = len(sessions.data) if sessions.data else 0
            bounce_count = sum(1 for s in (sessions.data or []) if s.get('is_bounce', False))
            total_signups = sum(1 for s in (sessions.data or []) if s.get('converted', False))
            total_page_views = len(page_views.data) if page_views.data else 0
            
            totals = {
                'unique_visitors': unique_visitors,
                'total_sessions': total_sessions,
                'total_page_views': total_page_views,
                'total_signups': total_signups,
                'bounce_count': bounce_count,
                'new_visitors': new_visitors,
                'returning_visitors': returning_visitors,
            }
            
            # Calculate rates
            bounce_rate = (bounce_count / total_sessions * 100) if total_sessions > 0 else 0
            return_rate = (returning_visitors / unique_visitors * 100) if unique_visitors > 0 else 0
            
            return {
                'totals': totals,
                'bounce_rate': round(bounce_rate, 2),
                'return_rate': round(return_rate, 2),
                'daily': [],  # No daily breakdown in fallback mode
                'start_date': start_date,
                'end_date': end_date,
                'source': 'raw_tables',  # Indicate this is from raw data
            }
            
        except Exception as e:
            logger.error(f"Failed to get dashboard summary from raw tables: {e}")
            # Return empty data on error
            return {
                'totals': {
                    'unique_visitors': 0,
                    'total_sessions': 0,
                    'total_page_views': 0,
                    'total_signups': 0,
                    'bounce_count': 0,
                    'new_visitors': 0,
                    'returning_visitors': 0,
                },
                'bounce_rate': 0,
                'return_rate': 0,
                'daily': [],
                'start_date': start_date,
                'end_date': end_date,
                'error': str(e),
            }
    
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
            
            return {
                'funnel': result.data or [],
                'start_date': start_date,
                'end_date': end_date,
            }
            
        except Exception as e:
            logger.error(f"Failed to get funnel data: {e}")
            raise
    
    def get_page_flow(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 20,
    ) -> dict[str, Any]:
        """Get page flow/transition data for flow charts."""
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
            
            return {
                'flows': result.data or [],
                'start_date': start_date,
                'end_date': end_date,
            }
            
        except Exception as e:
            logger.error(f"Failed to get page flow: {e}")
            raise
    
    def get_recent_sessions(self, limit: int = 50) -> list[dict[str, Any]]:
        """Get recent sessions for live view."""
        try:
            result = self.supabase.table('site_sessions').select(
                'session_id, visitor_id, started_at, ended_at, duration_ms, pages_viewed, entry_page, exit_page, converted, is_bounce, device_type'
            ).order('started_at', desc=True).limit(limit).execute()
            
            return result.data or []
            
        except Exception as e:
            logger.error(f"Failed to get recent sessions: {e}")
            raise
    
    def get_top_pages(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Get top pages by view count."""
        try:
            if not start_date:
                start_date = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
            if not end_date:
                end_date = datetime.now(timezone.utc).date().isoformat()
            
            # Use raw SQL via RPC for aggregation
            result = self.supabase.rpc('get_top_pages', {
                'p_start_date': start_date,
                'p_end_date': end_date,
                'p_limit': limit,
            }).execute()
            
            return result.data or []
            
        except Exception as e:
            logger.error(f"Failed to get top pages: {e}")
            return []
    
    def aggregate_daily(self, date: Optional[str] = None) -> dict[str, Any]:
        """Trigger daily aggregation (called by worker)."""
        try:
            if not date:
                date = datetime.now(timezone.utc).date().isoformat()
            
            self.supabase.rpc('aggregate_daily_analytics', {'p_date': date}).execute()
            
            return {'aggregated': True, 'date': date}
            
        except Exception as e:
            logger.error(f"Failed to aggregate daily: {e}")
            raise


# Singleton instance
_site_analytics_service: Optional[SiteAnalyticsService] = None


def get_site_analytics_service() -> SiteAnalyticsService:
    """Get or create the site analytics service singleton."""
    global _site_analytics_service
    
    if _site_analytics_service is None:
        _site_analytics_service = SiteAnalyticsService()
    
    return _site_analytics_service
