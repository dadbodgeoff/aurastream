"""
Simple Analytics Service - Clean, focused tracking.

No Redis queues, no batching, no enterprise complexity.
Just direct PostgreSQL writes for the metrics that matter.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Optional
from uuid import uuid4

logger = logging.getLogger(__name__)


class SimpleAnalyticsService:
    """Lightweight analytics service with direct PostgreSQL writes."""
    
    def __init__(self, supabase_client=None):
        self._supabase = supabase_client
    
    @property
    def supabase(self):
        """Lazy-load Supabase client."""
        if self._supabase is None:
            from backend.database.supabase_client import get_supabase_client
            self._supabase = get_supabase_client()
        return self._supabase
    
    # =========================================================================
    # Page Visit Tracking
    # =========================================================================
    
    def track_visit(
        self,
        visitor_id: str,
        page_path: str,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        referrer: Optional[str] = None,
        utm_source: Optional[str] = None,
        utm_medium: Optional[str] = None,
        utm_campaign: Optional[str] = None,
        device_type: Optional[str] = None,
        browser: Optional[str] = None,
        country: Optional[str] = None,
    ) -> bool:
        """Track a page visit. Fire and forget - errors are logged but don't block."""
        try:
            self.supabase.table("analytics_visits").insert({
                "visitor_id": visitor_id,
                "user_id": user_id,
                "page_path": page_path,
                "session_id": session_id,
                "referrer": referrer,
                "utm_source": utm_source,
                "utm_medium": utm_medium,
                "utm_campaign": utm_campaign,
                "device_type": device_type,
                "browser": browser,
                "country": country,
            }).execute()
            
            # Update session if exists
            if session_id:
                self._update_session(session_id, visitor_id, user_id)
            
            return True
        except Exception as e:
            logger.warning(f"Failed to track visit: {e}")
            return False
    
    # =========================================================================
    # User Event Tracking
    # =========================================================================
    
    def track_event(
        self,
        event_type: str,
        user_id: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> bool:
        """
        Track a user event.
        
        Valid event_types:
        - signup
        - login
        - logout
        - generation_started
        - generation_completed
        - generation_failed
        - brand_kit_created
        - asset_downloaded
        """
        try:
            self.supabase.table("analytics_user_events").insert({
                "user_id": user_id,
                "event_type": event_type,
                "metadata": metadata or {},
            }).execute()
            return True
        except Exception as e:
            logger.warning(f"Failed to track event {event_type}: {e}")
            return False
    
    # Convenience methods for common events
    def track_signup(self, user_id: str, source: Optional[str] = None):
        return self.track_event("signup", user_id, {"source": source} if source else None)
    
    def track_login(self, user_id: str):
        return self.track_event("login", user_id)
    
    def track_logout(self, user_id: str):
        return self.track_event("logout", user_id)
    
    def track_generation_started(self, user_id: str, asset_type: str, job_id: Optional[str] = None):
        return self.track_event("generation_started", user_id, {
            "asset_type": asset_type,
            "job_id": job_id,
        })
    
    def track_generation_completed(self, user_id: str, asset_type: str, job_id: Optional[str] = None):
        return self.track_event("generation_completed", user_id, {
            "asset_type": asset_type,
            "job_id": job_id,
        })
    
    def track_generation_failed(self, user_id: str, asset_type: str, error: str, job_id: Optional[str] = None):
        return self.track_event("generation_failed", user_id, {
            "asset_type": asset_type,
            "job_id": job_id,
            "error": error[:500],  # Limit error length
        })
    
    # =========================================================================
    # Session Management
    # =========================================================================
    
    def start_session(self, session_id: str, visitor_id: str, user_id: Optional[str] = None) -> bool:
        """Start or update a session."""
        try:
            self.supabase.table("analytics_sessions").upsert({
                "session_id": session_id,
                "visitor_id": visitor_id,
                "user_id": user_id,
                "last_activity_at": datetime.now(timezone.utc).isoformat(),
            }, on_conflict="session_id").execute()
            return True
        except Exception as e:
            logger.warning(f"Failed to start session: {e}")
            return False
    
    def _update_session(self, session_id: str, visitor_id: str, user_id: Optional[str] = None):
        """Update session activity."""
        try:
            update_data = {
                "last_activity_at": datetime.now(timezone.utc).isoformat(),
            }
            if user_id:
                update_data["user_id"] = user_id
            
            # Try update first
            result = self.supabase.table("analytics_sessions").update(update_data).eq(
                "session_id", session_id
            ).execute()
            
            # If no rows updated, insert new session
            if not result.data:
                self.supabase.table("analytics_sessions").insert({
                    "session_id": session_id,
                    "visitor_id": visitor_id,
                    "user_id": user_id,
                    "page_count": 1,
                }).execute()
            else:
                # Increment page count
                self.supabase.rpc("increment_session_page_count", {
                    "p_session_id": session_id
                }).execute()
        except Exception as e:
            logger.warning(f"Failed to update session: {e}")
    
    def mark_session_converted(self, session_id: str) -> bool:
        """Mark a session as converted (signup or generation)."""
        try:
            self.supabase.table("analytics_sessions").update({
                "converted": True,
            }).eq("session_id", session_id).execute()
            return True
        except Exception as e:
            logger.warning(f"Failed to mark session converted: {e}")
            return False
    
    # =========================================================================
    # Dashboard Data
    # =========================================================================
    
    def get_dashboard_summary(self, days: int = 30) -> dict[str, Any]:
        """Get dashboard summary stats."""
        try:
            result = self.supabase.rpc("get_analytics_dashboard", {"days": days}).execute()
            if result.data and len(result.data) > 0:
                row = result.data[0]
                return {
                    "totalVisitors": row.get("total_visitors", 0),
                    "totalPageViews": row.get("total_page_views", 0),
                    "totalSignups": row.get("total_signups", 0),
                    "totalLogins": row.get("total_logins", 0),
                    "totalGenerations": row.get("total_generations", 0),
                    "successRate": float(row.get("success_rate", 0)),
                    "avgSessionMinutes": float(row.get("avg_session_duration_minutes", 0)),
                    "conversionRate": float(row.get("conversion_rate", 0)),
                    "period": f"{days} days",
                }
            return self._empty_summary(days)
        except Exception as e:
            logger.error(f"Failed to get dashboard summary: {e}")
            return self._empty_summary(days)
    
    def _empty_summary(self, days: int) -> dict:
        return {
            "totalVisitors": 0,
            "totalPageViews": 0,
            "totalSignups": 0,
            "totalLogins": 0,
            "totalGenerations": 0,
            "successRate": 0,
            "avgSessionMinutes": 0,
            "conversionRate": 0,
            "period": f"{days} days",
        }
    
    def get_trend_data(self, days: int = 30) -> list[dict[str, Any]]:
        """Get daily trend data for charts."""
        try:
            result = self.supabase.rpc("get_analytics_trend", {"days": days}).execute()
            if result.data:
                return [
                    {
                        "date": row["date"],
                        "visitors": row["visitors"],
                        "signups": row["signups"],
                        "generations": row["generations"],
                    }
                    for row in result.data
                ]
            return []
        except Exception as e:
            logger.error(f"Failed to get trend data: {e}")
            return []
    
    def get_top_pages(self, days: int = 30, limit: int = 10) -> list[dict[str, Any]]:
        """Get most visited pages."""
        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            result = self.supabase.table("analytics_visits").select(
                "page_path"
            ).gte("created_at", cutoff).execute()
            
            # Count pages
            page_counts: dict[str, int] = {}
            for row in result.data or []:
                path = row["page_path"]
                page_counts[path] = page_counts.get(path, 0) + 1
            
            # Sort and limit
            sorted_pages = sorted(page_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
            return [{"page": p, "views": c} for p, c in sorted_pages]
        except Exception as e:
            logger.error(f"Failed to get top pages: {e}")
            return []
    
    def get_recent_signups(self, limit: int = 10) -> list[dict[str, Any]]:
        """Get recent signups with user info."""
        try:
            result = self.supabase.table("analytics_user_events").select(
                "user_id, created_at, metadata"
            ).eq("event_type", "signup").order(
                "created_at", desc=True
            ).limit(limit).execute()
            
            signups = []
            for row in result.data or []:
                # Get user info
                user_result = self.supabase.table("users").select(
                    "email, display_name"
                ).eq("id", row["user_id"]).single().execute()
                
                user = user_result.data if user_result.data else {}
                signups.append({
                    "userId": row["user_id"],
                    "email": user.get("email", "Unknown"),
                    "displayName": user.get("display_name", "Unknown"),
                    "createdAt": row["created_at"],
                    "source": (row.get("metadata") or {}).get("source"),
                })
            return signups
        except Exception as e:
            logger.error(f"Failed to get recent signups: {e}")
            return []
    
    def get_generation_stats(self, days: int = 30) -> dict[str, Any]:
        """Get generation statistics by asset type."""
        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            
            # Get completed generations
            completed = self.supabase.table("analytics_user_events").select(
                "metadata"
            ).eq("event_type", "generation_completed").gte("created_at", cutoff).execute()
            
            # Get failed generations
            failed = self.supabase.table("analytics_user_events").select(
                "metadata"
            ).eq("event_type", "generation_failed").gte("created_at", cutoff).execute()
            
            # Count by asset type
            by_type: dict[str, dict[str, int]] = {}
            
            for row in completed.data or []:
                asset_type = (row.get("metadata") or {}).get("asset_type", "unknown")
                if asset_type not in by_type:
                    by_type[asset_type] = {"completed": 0, "failed": 0}
                by_type[asset_type]["completed"] += 1
            
            for row in failed.data or []:
                asset_type = (row.get("metadata") or {}).get("asset_type", "unknown")
                if asset_type not in by_type:
                    by_type[asset_type] = {"completed": 0, "failed": 0}
                by_type[asset_type]["failed"] += 1
            
            return {
                "byAssetType": [
                    {
                        "assetType": t,
                        "completed": c["completed"],
                        "failed": c["failed"],
                        "successRate": round(c["completed"] / (c["completed"] + c["failed"]) * 100, 1) if (c["completed"] + c["failed"]) > 0 else 0,
                    }
                    for t, c in sorted(by_type.items(), key=lambda x: x[1]["completed"], reverse=True)
                ],
                "totalCompleted": sum(c["completed"] for c in by_type.values()),
                "totalFailed": sum(c["failed"] for c in by_type.values()),
            }
        except Exception as e:
            logger.error(f"Failed to get generation stats: {e}")
            return {"byAssetType": [], "totalCompleted": 0, "totalFailed": 0}
    
    # =========================================================================
    # Maintenance
    # =========================================================================
    
    def refresh_daily_stats(self, date: Optional[str] = None) -> bool:
        """Refresh daily stats for a specific date or today."""
        try:
            params = {"target_date": date} if date else {}
            self.supabase.rpc("refresh_daily_stats", params).execute()
            return True
        except Exception as e:
            logger.error(f"Failed to refresh daily stats: {e}")
            return False
    
    def cleanup_old_data(self, days_to_keep: int = 90) -> int:
        """Clean up old raw data, keeping aggregates."""
        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=days_to_keep)).isoformat()
            
            # Delete old visits
            self.supabase.table("analytics_visits").delete().lt("created_at", cutoff).execute()
            
            # Delete old sessions
            self.supabase.table("analytics_sessions").delete().lt("started_at", cutoff).execute()
            
            logger.info(f"Cleaned up analytics data older than {days_to_keep} days")
            return days_to_keep
        except Exception as e:
            logger.error(f"Failed to cleanup old data: {e}")
            return 0


# Singleton
_service: Optional[SimpleAnalyticsService] = None


def get_simple_analytics_service() -> SimpleAnalyticsService:
    """Get or create the analytics service singleton."""
    global _service
    if _service is None:
        _service = SimpleAnalyticsService()
    return _service
