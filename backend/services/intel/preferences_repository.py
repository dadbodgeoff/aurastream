"""
Creator Intel Preferences Repository

Handles database operations for user intel preferences.
"""

import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from backend.database.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class IntelPreferencesRepository:
    """Repository for user intel preferences and activity."""
    
    def __init__(self):
        self.client = get_supabase_client()
    
    # =========================================================================
    # Preferences CRUD
    # =========================================================================
    
    async def get_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user's intel preferences."""
        try:
            result = self.client.table("user_intel_preferences").select("*").eq("user_id", user_id).single().execute()
            return result.data
        except Exception as e:
            if "PGRST116" in str(e):  # No rows returned
                return None
            logger.error(f"Failed to get preferences for user {user_id}: {e}")
            raise
    
    async def create_preferences(self, user_id: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Create user's intel preferences."""
        try:
            data = {
                "user_id": user_id,
                "subscribed_categories": preferences.get("subscribed_categories", []),
                "dashboard_layout": preferences.get("dashboard_layout", []),
                "timezone": preferences.get("timezone", "America/New_York"),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
            result = self.client.table("user_intel_preferences").insert(data).execute()
            return result.data[0]
        except Exception as e:
            logger.error(f"Failed to create preferences for user {user_id}: {e}")
            raise
    
    async def update_preferences(self, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update user's intel preferences."""
        try:
            updates["updated_at"] = datetime.utcnow().isoformat()
            result = self.client.table("user_intel_preferences").update(updates).eq("user_id", user_id).execute()
            if not result.data:
                # Create if doesn't exist
                return await self.create_preferences(user_id, updates)
            return result.data[0]
        except Exception as e:
            logger.error(f"Failed to update preferences for user {user_id}: {e}")
            raise
    
    async def get_or_create_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get or create user's intel preferences."""
        prefs = await self.get_preferences(user_id)
        if prefs is None:
            prefs = await self.create_preferences(user_id, {})
        return prefs
    
    # =========================================================================
    # Category Subscriptions
    # =========================================================================
    
    async def add_category_subscription(
        self, 
        user_id: str, 
        subscription: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Add a category subscription."""
        prefs = await self.get_or_create_preferences(user_id)
        categories = prefs.get("subscribed_categories", [])
        
        # Check if already subscribed
        existing_keys = [c["key"] for c in categories]
        if subscription["key"] in existing_keys:
            raise ValueError(f"Already subscribed to {subscription['key']}")
        
        # Add subscription with timestamp
        subscription["added_at"] = datetime.utcnow().isoformat()
        categories.append(subscription)
        
        # Update preferences
        await self.update_preferences(user_id, {"subscribed_categories": categories})
        
        return {
            "subscription": subscription,
            "total_subscriptions": len(categories),
        }
    
    async def remove_category_subscription(self, user_id: str, category_key: str) -> Dict[str, Any]:
        """Remove a category subscription."""
        prefs = await self.get_or_create_preferences(user_id)
        categories = prefs.get("subscribed_categories", [])
        
        # Filter out the category
        new_categories = [c for c in categories if c["key"] != category_key]
        
        if len(new_categories) == len(categories):
            raise ValueError(f"Not subscribed to {category_key}")
        
        # Update preferences
        await self.update_preferences(user_id, {"subscribed_categories": new_categories})
        
        return {"remaining_subscriptions": len(new_categories)}
    
    # =========================================================================
    # Activity Tracking
    # =========================================================================
    
    async def get_activity(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user's intel activity."""
        try:
            result = self.client.table("user_intel_activity").select("*").eq("user_id", user_id).single().execute()
            return result.data
        except Exception as e:
            if "PGRST116" in str(e):
                return None
            logger.error(f"Failed to get activity for user {user_id}: {e}")
            raise
    
    async def track_activity(self, user_id: str, event_type: str, data: Dict[str, Any]) -> None:
        """Track user activity event."""
        try:
            activity = await self.get_activity(user_id)
            
            if activity is None:
                # Create new activity record
                activity = {
                    "user_id": user_id,
                    "category_engagement": {},
                    "active_hours": {},
                    "content_preferences": {},
                    "missions_shown_count": 0,
                    "missions_acted_count": 0,
                }
                self.client.table("user_intel_activity").insert(activity).execute()
                activity = await self.get_activity(user_id)
            
            updates = {"updated_at": datetime.utcnow().isoformat()}
            
            if event_type == "category_view" and data.get("category_key"):
                engagement = activity.get("category_engagement", {})
                key = data["category_key"]
                engagement[key] = engagement.get(key, 0) + 1
                updates["category_engagement"] = engagement
            
            elif event_type == "mission_shown":
                updates["last_mission_shown_at"] = datetime.utcnow().isoformat()
                updates["missions_shown_count"] = activity.get("missions_shown_count", 0) + 1
            
            elif event_type == "mission_acted":
                updates["last_mission_acted_on"] = True
                updates["missions_acted_count"] = activity.get("missions_acted_count", 0) + 1
            
            self.client.table("user_intel_activity").update(updates).eq("user_id", user_id).execute()
            
        except Exception as e:
            logger.error(f"Failed to track activity for user {user_id}: {e}")
            # Don't raise - activity tracking is non-critical


def get_intel_preferences_repository() -> IntelPreferencesRepository:
    """Get an instance of the preferences repository."""
    return IntelPreferencesRepository()
