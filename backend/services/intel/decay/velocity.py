"""
Velocity Calculation Functions

Calculate content velocity (views/hour, engagement/hour).
"""

from datetime import datetime, timezone
from typing import Optional


def velocity_from_age(
    count: int,
    published_at: datetime,
    reference_time: Optional[datetime] = None,
    min_hours: float = 1.0,
) -> float:
    """
    Calculate velocity from count and publish time.
    
    Args:
        count: Total count (views, likes, etc.)
        published_at: When content was published
        reference_time: Time to calculate from (default: now)
        min_hours: Minimum hours to avoid division issues
    
    Returns:
        Count per hour
    """
    if reference_time is None:
        reference_time = datetime.now(timezone.utc)
    
    # Ensure timezone awareness
    if published_at.tzinfo is None:
        published_at = published_at.replace(tzinfo=timezone.utc)
    if reference_time.tzinfo is None:
        reference_time = reference_time.replace(tzinfo=timezone.utc)
    
    hours_since = (reference_time - published_at).total_seconds() / 3600
    hours_since = max(min_hours, hours_since)
    
    return count / hours_since


def velocity_from_timestamps(
    count: int,
    published_at_str: str,
    reference_time: Optional[datetime] = None,
) -> Optional[float]:
    """
    Calculate velocity from ISO timestamp string.
    
    Args:
        count: Total count
        published_at_str: ISO format timestamp string
        reference_time: Reference time (default: now)
    
    Returns:
        Count per hour, or None if parsing fails
    """
    if not published_at_str:
        return None
    
    try:
        # Handle various ISO formats
        if published_at_str.endswith("Z"):
            published_at = datetime.fromisoformat(
                published_at_str.replace("Z", "+00:00")
            )
        elif "+" in published_at_str or published_at_str.count("-") > 2:
            published_at = datetime.fromisoformat(published_at_str)
        else:
            published_at = datetime.fromisoformat(published_at_str).replace(
                tzinfo=timezone.utc
            )
        
        return velocity_from_age(count, published_at, reference_time)
    
    except (ValueError, TypeError):
        return None
