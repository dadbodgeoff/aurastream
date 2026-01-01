"""
Activity Tracker Service

Tracks user activity for personalization:
- Category engagement (which categories user views)
- Active hours (when user is on platform)
- Content preferences (what they create)
- Mission interactions (shown vs acted)

Data is stored in user_intel_activity table.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from uuid import uuid4

from backend.database.supabase_client import get_supabase_client


# =============================================================================
# Activity Types
# =============================================================================

ACTIVITY_TYPES = {
    "category_view": "User viewed a category panel",
    "panel_interaction": "User interacted with a panel",
    "mission_shown": "Mission was displayed to user",
    "mission_acted": "User clicked 'Start Planning' on mission",
    "category_subscribe": "User subscribed to a category",
    "category_unsubscribe": "User unsubscribed from a category",
    "filter_change": "User changed category filter",
    "layout_change": "User modified dashboard layout",
}


# =============================================================================
# Activity Tracker
# =============================================================================

class ActivityTracker:
    """Tracks user activity for personalization."""
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    async def track_activity(
        self,
        user_id: str,
        event_type: str,
        category_key: Optional[str] = None,
        panel_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Track a user activity event.
        
        Args:
            user_id: The user's ID
            event_type: Type of activity (from ACTIVITY_TYPES)
            category_key: Optional category involved
            panel_type: Optional panel type involved
            metadata: Optional additional data
            
        Returns:
            True if tracked successfully
        """
        try:
            activity_data = {
                "id": str(uuid4()),
                "user_id": user_id,
                "event_type": event_type,
                "category_key": category_key,
                "panel_type": panel_type,
                "metadata": metadata or {},
                "created_at": datetime.utcnow().isoformat() + "Z",
            }
            
            self.supabase.table("user_intel_activity").insert(activity_data).execute()
            return True
            
        except Exception as e:
            # Log but don't fail - activity tracking is non-critical
            print(f"Failed to track activity: {e}")
            return False
    
    async def get_activity_summary(
        self,
        user_id: str,
        days: int = 30,
    ) -> Dict[str, Any]:
        """
        Get aggregated activity summary for a user.
        
        Args:
            user_id: The user's ID
            days: Number of days to look back
            
        Returns:
            Summary dict with aggregated stats
        """
        try:
            since = (datetime.utcnow() - timedelta(days=days)).isoformat() + "Z"
            
            result = self.supabase.table("user_intel_activity")\
                .select("*")\
                .eq("user_id", user_id)\
                .gte("created_at", since)\
                .execute()
            
            activities = result.data or []
            
            # Aggregate by category
            category_counts: Dict[str, int] = {}
            panel_counts: Dict[str, int] = {}
            event_counts: Dict[str, int] = {}
            hourly_activity: Dict[int, int] = {h: 0 for h in range(24)}
            
            for activity in activities:
                # Count by category
                cat = activity.get("category_key")
                if cat:
                    category_counts[cat] = category_counts.get(cat, 0) + 1
                
                # Count by panel
                panel = activity.get("panel_type")
                if panel:
                    panel_counts[panel] = panel_counts.get(panel, 0) + 1
                
                # Count by event type
                event = activity.get("event_type")
                if event:
                    event_counts[event] = event_counts.get(event, 0) + 1
                
                # Count by hour
                created = activity.get("created_at")
                if created:
                    try:
                        dt = datetime.fromisoformat(created.replace("Z", ""))
                        hourly_activity[dt.hour] += 1
                    except:
                        pass
            
            # Find most active hour
            most_active_hour = max(hourly_activity, key=hourly_activity.get) if hourly_activity else 12
            
            # Find favorite categories
            favorite_categories = sorted(
                category_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[:5]
            
            # Calculate mission conversion rate
            missions_shown = event_counts.get("mission_shown", 0)
            missions_acted = event_counts.get("mission_acted", 0)
            conversion_rate = (missions_acted / missions_shown * 100) if missions_shown > 0 else 0
            
            return {
                "total_activities": len(activities),
                "days_analyzed": days,
                "favorite_categories": [
                    {"key": k, "count": v} for k, v in favorite_categories
                ],
                "panel_engagement": panel_counts,
                "event_breakdown": event_counts,
                "most_active_hour": most_active_hour,
                "hourly_distribution": hourly_activity,
                "mission_conversion_rate": round(conversion_rate, 1),
            }
            
        except Exception as e:
            print(f"Failed to get activity summary: {e}")
            return {
                "total_activities": 0,
                "days_analyzed": days,
                "favorite_categories": [],
                "panel_engagement": {},
                "event_breakdown": {},
                "most_active_hour": 12,
                "hourly_distribution": {},
                "mission_conversion_rate": 0,
            }
    
    async def track_mission_shown(self, user_id: str, category_key: str) -> bool:
        """Track that a mission was shown to the user."""
        return await self.track_activity(
            user_id=user_id,
            event_type="mission_shown",
            category_key=category_key,
        )
    
    async def track_mission_acted(self, user_id: str, category_key: str) -> bool:
        """Track that user acted on a mission."""
        return await self.track_activity(
            user_id=user_id,
            event_type="mission_acted",
            category_key=category_key,
        )
    
    async def get_user_preferences(
        self,
        user_id: str,
    ) -> Dict[str, Any]:
        """
        Infer user preferences from activity history.
        
        Returns preferences that can be used for personalization.
        """
        summary = await self.get_activity_summary(user_id, days=30)
        
        return {
            "preferred_categories": [
                c["key"] for c in summary.get("favorite_categories", [])
            ],
            "active_hours": self._find_active_hours(
                summary.get("hourly_distribution", {})
            ),
            "engagement_level": self._calculate_engagement_level(
                summary.get("total_activities", 0)
            ),
        }
    
    def _find_active_hours(
        self,
        hourly_distribution: Dict[int, int],
    ) -> List[int]:
        """Find the user's most active hours."""
        if not hourly_distribution:
            return [14, 15, 16, 20, 21]  # Default peak hours
        
        # Sort by activity count
        sorted_hours = sorted(
            hourly_distribution.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        # Return top 5 hours
        return [h for h, _ in sorted_hours[:5]]
    
    def _calculate_engagement_level(self, total_activities: int) -> str:
        """Calculate user engagement level."""
        if total_activities >= 100:
            return "high"
        elif total_activities >= 30:
            return "medium"
        else:
            return "low"


# =============================================================================
# Singleton Instance
# =============================================================================

_activity_tracker: Optional[ActivityTracker] = None


def get_activity_tracker() -> ActivityTracker:
    """Get or create the activity tracker singleton."""
    global _activity_tracker
    if _activity_tracker is None:
        _activity_tracker = ActivityTracker()
    return _activity_tracker
