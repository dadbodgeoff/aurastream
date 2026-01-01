"""
Creator Intel Pydantic Schemas

Schemas for the unified intelligence dashboard.
These are ADDITIVE - do not modify any existing schemas.
"""

from datetime import datetime
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


# ============================================================================
# Category Schemas
# ============================================================================

class CategorySubscription(BaseModel):
    """A user's subscription to a gaming category."""
    key: str = Field(..., description="Unique category identifier")
    name: str = Field(..., description="Display name")
    twitch_id: Optional[str] = Field(None, description="Twitch game ID")
    youtube_query: Optional[str] = Field(None, description="YouTube search query")
    platform: Literal["twitch", "youtube", "both"] = Field("both")
    notifications: bool = Field(True, description="Enable notifications for this category")
    added_at: datetime = Field(default_factory=datetime.utcnow)


class AvailableCategory(BaseModel):
    """A category available for subscription."""
    key: str
    name: str
    twitch_id: Optional[str] = None
    youtube_query: Optional[str] = None
    platform: Literal["twitch", "youtube", "both"] = "both"
    icon: Optional[str] = None
    color: Optional[str] = None
    subscriber_count: Optional[int] = None


# ============================================================================
# Panel Schemas
# ============================================================================

class PanelPosition(BaseModel):
    """Position of a panel in the grid."""
    x: int = Field(..., ge=0)
    y: int = Field(..., ge=0)


class PanelConfig(BaseModel):
    """Configuration for a dashboard panel."""
    panel_type: str = Field(..., description="Type of panel")
    position: PanelPosition
    size: Literal["tiny", "small", "wide", "large"] = "small"


# ============================================================================
# Preferences Schemas
# ============================================================================

class UserIntelPreferences(BaseModel):
    """User's Creator Intel preferences."""
    subscribed_categories: List[CategorySubscription] = Field(default_factory=list)
    dashboard_layout: List[PanelConfig] = Field(default_factory=list)
    timezone: str = Field("America/New_York")


class UpdatePreferencesRequest(BaseModel):
    """Request to update preferences."""
    dashboard_layout: Optional[List[PanelConfig]] = None
    timezone: Optional[str] = None


class UpdatePreferencesResponse(BaseModel):
    """Response after updating preferences."""
    subscribed_categories: List[CategorySubscription]
    dashboard_layout: List[PanelConfig]
    timezone: str


# ============================================================================
# Category Subscription Schemas
# ============================================================================

class SubscribeCategoryRequest(BaseModel):
    """Request to subscribe to a category."""
    key: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    twitch_id: Optional[str] = None
    youtube_query: Optional[str] = None
    platform: Literal["twitch", "youtube", "both"] = "both"
    notifications: bool = True


class SubscribeCategoryResponse(BaseModel):
    """Response after subscribing to a category."""
    subscription: CategorySubscription
    total_subscriptions: int


class UnsubscribeCategoryResponse(BaseModel):
    """Response after unsubscribing from a category."""
    remaining_subscriptions: int


# ============================================================================
# Activity Schemas
# ============================================================================

class TrackActivityRequest(BaseModel):
    """Request to track user activity."""
    event_type: Literal["category_view", "panel_interaction", "mission_shown", "mission_acted"]
    category_key: Optional[str] = None
    panel_type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# ============================================================================
# Mission Schemas
# ============================================================================

class MissionFactors(BaseModel):
    """Factors that influenced the mission recommendation."""
    competition: Literal["low", "medium", "high"] = "medium"
    viral_opportunity: bool = False
    timing: bool = False
    history_match: bool = False


class TodaysMission(BaseModel):
    """Today's Mission recommendation."""
    recommendation: str
    confidence: int = Field(..., ge=0, le=100)
    category: str
    category_name: str
    suggested_title: str
    reasoning: str
    factors: MissionFactors
    expires_at: datetime
