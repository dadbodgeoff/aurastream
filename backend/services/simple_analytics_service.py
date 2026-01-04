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

    # Specific emails to exclude from analytics (internal/dev accounts)
    EXCLUDED_EMAILS = {
        "nrivikings8@gmail.com",
        "dadbodgeoff@gmail.com",
        "geoffreyfernald876@gmail.com",
        "db100@gmail.com",
    }

    def __init__(self, supabase_client=None):
        self._supabase = supabase_client

    @classmethod
    def is_test_email(cls, email: str) -> bool:
        """Check if an email is a test email that should be excluded from analytics."""
        if not email:
            return False
        email_lower = email.lower()
        # Check explicit exclusion list
        if email_lower in cls.EXCLUDED_EMAILS:
            return True
        # Check for 'test' or 'tester' anywhere in the email
        if "test" in email_lower:
            return True
        # Check for @aurastream.shop domain
        if "@aurastream.shop" in email_lower:
            return True
        # Check for dbg*@gmail.com pattern
        if email_lower.startswith("dbg") and "@gmail.com" in email_lower:
            return True
        return False

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

    def get_real_users_stats(self) -> dict[str, Any]:
        """Get real user statistics (excluding test emails)."""
        try:
            # Get all users excluding test emails
            # Excludes: @aurastream.shop, dbg*@gmail.com, emails containing 'test', and specific dev emails
            result = self.supabase.table("users").select(
                "id, email, display_name, subscription_tier, created_at"
            ).not_.like("email", "%@aurastream.shop").not_.like(
                "email", "dbg%@gmail.com"
            ).not_.ilike("email", "%test%").not_.in_(
                "email", list(self.EXCLUDED_EMAILS)
            ).execute()

            users = result.data or []
            total = len(users)

            # Count by tier
            tier_counts = {"free": 0, "pro": 0, "studio": 0}
            for user in users:
                tier = user.get("subscription_tier", "free")
                if tier in tier_counts:
                    tier_counts[tier] += 1

            # Recent signups (last 7 days)
            week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
            recent = [u for u in users if u.get("created_at", "") >= week_ago]

            return {
                "totalRealUsers": total,
                "byTier": tier_counts,
                "recentSignups": len(recent),
                "users": [
                    {
                        "email": u["email"],
                        "displayName": u.get("display_name", ""),
                        "tier": u.get("subscription_tier", "free"),
                        "createdAt": u.get("created_at", ""),
                    }
                    for u in sorted(
                        users, key=lambda x: x.get("created_at", ""), reverse=True
                    )[:20]
                ],
            }
        except Exception as e:
            logger.error(f"Failed to get real users stats: {e}")
            return {"totalRealUsers": 0, "byTier": {}, "recentSignups": 0, "users": []}

    def get_debug_stats(self) -> dict[str, Any]:
        """Get debug stats to check if tracking is working."""
        try:
            # Count raw visits
            visits = self.supabase.table("analytics_visits").select(
                "*", count="exact"
            ).limit(1).execute()

            # Count raw events
            events = self.supabase.table("analytics_user_events").select(
                "*", count="exact"
            ).limit(1).execute()

            # Count sessions
            sessions = self.supabase.table("analytics_sessions").select(
                "*", count="exact"
            ).limit(1).execute()

            # Count daily stats
            daily = self.supabase.table("analytics_daily_stats").select(
                "*", count="exact"
            ).limit(1).execute()

            # Get most recent visit
            recent_visit = self.supabase.table("analytics_visits").select(
                "created_at, page_path"
            ).order("created_at", desc=True).limit(1).execute()

            # Get most recent event
            recent_event = self.supabase.table("analytics_user_events").select(
                "created_at, event_type"
            ).order("created_at", desc=True).limit(1).execute()

            return {
                "rawCounts": {
                    "visits": visits.count or 0,
                    "events": events.count or 0,
                    "sessions": sessions.count or 0,
                    "dailyStats": daily.count or 0,
                },
                "mostRecentVisit": recent_visit.data[0] if recent_visit.data else None,
                "mostRecentEvent": recent_event.data[0] if recent_event.data else None,
                "status": "tracking_active" if (visits.count or 0) > 0 else "no_data",
            }
        except Exception as e:
            logger.error(f"Failed to get debug stats: {e}")
            return {"error": str(e)}

    def cleanup_test_data(self) -> dict[str, Any]:
        """
        Remove test data from analytics tables.
        Removes:
        - Visits from localhost
        - Events from test emails (@aurastream.shop, dbg*@gmail.com, emails containing 'test', and specific dev emails)
        """
        try:
            deleted = {"visits": 0, "events": 0, "sessions": 0}

            # Get test user IDs - includes @aurastream.shop, dbg*@gmail.com, emails containing 'test', and specific dev emails
            test_users = self.supabase.table("users").select("id, email").or_(
                "email.like.%@aurastream.shop,email.like.dbg%@gmail.com,email.ilike.%test%"
            ).execute()
            test_user_ids = [u["id"] for u in (test_users.data or [])]
            
            # Also get users from the explicit exclusion list
            explicit_excluded = self.supabase.table("users").select("id, email").in_(
                "email", list(self.EXCLUDED_EMAILS)
            ).execute()
            test_user_ids.extend([u["id"] for u in (explicit_excluded.data or [])])

            # Delete visits from localhost (check page_path or referrer patterns)
            localhost_visits = self.supabase.table("analytics_visits").delete().or_(
                "referrer.like.%localhost%,referrer.like.%127.0.0.1%"
            ).execute()
            deleted["visits"] += len(localhost_visits.data or [])

            # Delete events from test users
            if test_user_ids:
                for user_id in test_user_ids:
                    result = self.supabase.table("analytics_user_events").delete().eq(
                        "user_id", user_id
                    ).execute()
                    deleted["events"] += len(result.data or [])

                # Delete sessions from test users
                for user_id in test_user_ids:
                    result = self.supabase.table("analytics_sessions").delete().eq(
                        "user_id", user_id
                    ).execute()
                    deleted["sessions"] += len(result.data or [])

            logger.info(f"Cleaned up test data: {deleted}")
            return {
                "success": True,
                "deleted": deleted,
                "testUserIds": test_user_ids,
            }
        except Exception as e:
            logger.error(f"Failed to cleanup test data: {e}")
            return {"success": False, "error": str(e)}

    def get_dashboard_summary(self, days: int = 30) -> dict[str, Any]:
        """Get dashboard summary stats."""
        try:
            # First try the pre-aggregated stats
            result = self.supabase.rpc("get_analytics_dashboard", {"days": days}).execute()
            if result.data and len(result.data) > 0:
                row = result.data[0]
                # Check if we have any data
                if row.get("total_visitors", 0) > 0 or row.get("total_page_views", 0) > 0:
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

            # Fallback: query raw tables directly for live data
            return self._get_live_summary(days)
        except Exception as e:
            logger.error(f"Failed to get dashboard summary: {e}")
            return self._get_live_summary(days)

    def _get_live_summary(self, days: int) -> dict[str, Any]:
        """Get live summary directly from raw tables (fallback)."""
        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

            # Count unique visitors
            visits = self.supabase.table("analytics_visits").select(
                "visitor_id", count="exact"
            ).gte("created_at", cutoff).execute()
            total_page_views = visits.count or 0

            # Get unique visitors
            unique_visitors_result = self.supabase.table("analytics_visits").select(
                "visitor_id"
            ).gte("created_at", cutoff).execute()
            unique_visitors = len(set(v["visitor_id"] for v in (unique_visitors_result.data or [])))

            # Count events by type
            events = self.supabase.table("analytics_user_events").select(
                "event_type"
            ).gte("created_at", cutoff).execute()

            event_counts = {}
            for e in (events.data or []):
                et = e["event_type"]
                event_counts[et] = event_counts.get(et, 0) + 1

            signups = event_counts.get("signup", 0)
            logins = event_counts.get("login", 0)
            gen_completed = event_counts.get("generation_completed", 0)
            gen_started = event_counts.get("generation_started", 0)

            success_rate = 0
            if gen_started > 0:
                success_rate = round((gen_completed / gen_started) * 100, 1)

            conversion_rate = 0
            if unique_visitors > 0:
                conversion_rate = round((signups / unique_visitors) * 100, 2)

            return {
                "totalVisitors": unique_visitors,
                "totalPageViews": total_page_views,
                "totalSignups": signups,
                "totalLogins": logins,
                "totalGenerations": gen_completed,
                "successRate": success_rate,
                "avgSessionMinutes": 0,  # Would need session calc
                "conversionRate": conversion_rate,
                "period": f"{days} days (live)",
            }
        except Exception as e:
            logger.error(f"Failed to get live summary: {e}")
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
        """Get recent signups with user info (excluding test emails)."""
        try:
            result = self.supabase.table("analytics_user_events").select(
                "user_id, created_at, metadata"
            ).eq("event_type", "signup").order(
                "created_at", desc=True
            ).limit(limit * 3).execute()  # Fetch extra to account for filtered test users

            signups = []
            for row in result.data or []:
                if len(signups) >= limit:
                    break
                    
                # Get user info
                user_result = self.supabase.table("users").select(
                    "email, display_name"
                ).eq("id", row["user_id"]).single().execute()

                user = user_result.data if user_result.data else {}
                email = user.get("email", "")
                
                # Skip test emails (containing 'test', @aurastream.shop, or dbg*@gmail.com)
                if not email or self.is_test_email(email):
                    continue
                
                signups.append({
                    "userId": row["user_id"],
                    "email": email,
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
    # Paginated Table Queries
    # =========================================================================

    def get_visits_paginated(
        self,
        page: int = 1,
        page_size: int = 25,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
        days: int = 30,
        search: Optional[str] = None,
        device_type: Optional[str] = None,
        browser: Optional[str] = None,
    ) -> dict[str, Any]:
        """Get paginated visits with filtering and sorting."""
        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

            # Build query
            query = self.supabase.table("analytics_visits").select(
                "*", count="exact"
            ).gte("created_at", cutoff)

            # Apply filters
            if device_type:
                query = query.eq("device_type", device_type)
            if browser:
                query = query.eq("browser", browser)
            if search:
                query = query.or_(f"page_path.ilike.%{search}%,referrer.ilike.%{search}%")

            # Apply sorting
            valid_sort_columns = ["created_at", "page_path", "device_type", "browser"]
            if sort_by not in valid_sort_columns:
                sort_by = "created_at"

            query = query.order(sort_by, desc=(sort_dir == "desc"))

            # Apply pagination
            offset = (page - 1) * page_size
            query = query.range(offset, offset + page_size - 1)

            result = query.execute()

            return {
                "visits": result.data or [],
                "total": result.count or 0,
                "page": page,
                "page_size": page_size,
            }
        except Exception as e:
            logger.error(f"Failed to get paginated visits: {e}")
            return {"visits": [], "total": 0, "page": page, "page_size": page_size}

    def get_events_paginated(
        self,
        page: int = 1,
        page_size: int = 25,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
        days: int = 30,
        event_type: Optional[str] = None,
    ) -> dict[str, Any]:
        """Get paginated user events with filtering and sorting."""
        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

            # Build query
            query = self.supabase.table("analytics_user_events").select(
                "*", count="exact"
            ).gte("created_at", cutoff)

            # Apply filters
            if event_type:
                query = query.eq("event_type", event_type)

            # Apply sorting
            valid_sort_columns = ["created_at", "event_type"]
            if sort_by not in valid_sort_columns:
                sort_by = "created_at"

            query = query.order(sort_by, desc=(sort_dir == "desc"))

            # Apply pagination
            offset = (page - 1) * page_size
            query = query.range(offset, offset + page_size - 1)

            result = query.execute()

            # Get event type counts for summary
            event_types_query = self.supabase.table("analytics_user_events").select(
                "event_type"
            ).gte("created_at", cutoff).execute()

            type_counts: dict[str, int] = {}
            for row in event_types_query.data or []:
                et = row["event_type"]
                type_counts[et] = type_counts.get(et, 0) + 1

            event_types = [
                {"type": t, "count": c}
                for t, c in sorted(type_counts.items(), key=lambda x: x[1], reverse=True)
            ]

            return {
                "events": result.data or [],
                "total": result.count or 0,
                "page": page,
                "page_size": page_size,
                "event_types": event_types,
            }
        except Exception as e:
            logger.error(f"Failed to get paginated events: {e}")
            return {"events": [], "total": 0, "page": page, "page_size": page_size, "event_types": []}

    def get_sessions_paginated(
        self,
        page: int = 1,
        page_size: int = 25,
        sort_by: str = "started_at",
        sort_dir: str = "desc",
        days: int = 30,
        converted: Optional[bool] = None,
    ) -> dict[str, Any]:
        """Get paginated sessions with filtering and sorting."""
        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

            # Build query
            query = self.supabase.table("analytics_sessions").select(
                "*", count="exact"
            ).gte("started_at", cutoff)

            # Apply filters
            if converted is not None:
                query = query.eq("converted", converted)

            # Apply sorting
            valid_sort_columns = ["started_at", "last_activity_at", "page_count"]
            if sort_by not in valid_sort_columns:
                sort_by = "started_at"

            query = query.order(sort_by, desc=(sort_dir == "desc"))

            # Apply pagination
            offset = (page - 1) * page_size
            query = query.range(offset, offset + page_size - 1)

            result = query.execute()

            # Get stats
            stats_query = self.supabase.table("analytics_sessions").select(
                "page_count, converted, started_at, last_activity_at"
            ).gte("started_at", cutoff).execute()

            total_sessions = len(stats_query.data or [])
            converted_count = sum(1 for s in (stats_query.data or []) if s.get("converted"))
            total_pages = sum(s.get("page_count", 0) for s in (stats_query.data or []))

            # Calculate average duration
            total_duration = 0
            for s in (stats_query.data or []):
                try:
                    start = datetime.fromisoformat(s["started_at"].replace("Z", "+00:00"))
                    end = datetime.fromisoformat(s["last_activity_at"].replace("Z", "+00:00"))
                    total_duration += (end - start).total_seconds() / 60
                except Exception:
                    pass

            avg_duration = total_duration / total_sessions if total_sessions > 0 else 0
            avg_pages = total_pages / total_sessions if total_sessions > 0 else 0

            return {
                "sessions": result.data or [],
                "total": result.count or 0,
                "page": page,
                "page_size": page_size,
                "stats": {
                    "total": total_sessions,
                    "converted": converted_count,
                    "avgPages": round(avg_pages, 1),
                    "avgDuration": round(avg_duration, 1),
                },
            }
        except Exception as e:
            logger.error(f"Failed to get paginated sessions: {e}")
            return {
                "sessions": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "stats": {"total": 0, "converted": 0, "avgPages": 0, "avgDuration": 0},
            }

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
