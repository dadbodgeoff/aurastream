"""
Golden Hours Analyzer - Find optimal streaming/posting windows.

Analyzes Twitch stream data to find time windows where:
- Big streamers are offline (low competition)
- Viewer availability is still high
- Small streamers have the best chance to be discovered
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

from backend.api.schemas.playbook import GoldenHourWindow

logger = logging.getLogger(__name__)


class GoldenHoursAnalyzer:
    """Analyzes streaming patterns to find golden opportunity windows."""
    
    # Peak streaming hours by day (0=Monday, 6=Sunday)
    # Based on typical Twitch patterns
    PEAK_HOURS = {
        0: [19, 20, 21, 22],  # Monday
        1: [19, 20, 21, 22],  # Tuesday
        2: [19, 20, 21, 22],  # Wednesday
        3: [19, 20, 21, 22],  # Thursday
        4: [18, 19, 20, 21, 22, 23],  # Friday
        5: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23],  # Saturday
        6: [14, 15, 16, 17, 18, 19, 20, 21],  # Sunday
    }
    
    # Off-peak hours with decent viewership potential
    OPPORTUNITY_HOURS = {
        0: [10, 11, 12, 13, 14],  # Monday morning/afternoon
        1: [10, 11, 12, 13, 14],
        2: [10, 11, 12, 13, 14],
        3: [10, 11, 12, 13, 14],
        4: [10, 11, 12, 13, 14, 15, 16],
        5: [10, 11, 12, 13],  # Saturday morning
        6: [10, 11, 12, 13],  # Sunday morning
    }
    
    def __init__(self):
        self.day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", 
                         "Friday", "Saturday", "Sunday"]
    
    async def analyze(
        self,
        twitch_streams: List[Dict[str, Any]],
        twitch_games: List[Dict[str, Any]],
    ) -> List[GoldenHourWindow]:
        """
        Analyze current streaming landscape to find golden hours.
        
        Args:
            twitch_streams: Current live streams data
            twitch_games: Current top games data
            
        Returns:
            List of golden hour windows sorted by opportunity score
        """
        now = datetime.now(timezone.utc)
        
        # Analyze current competition level
        total_viewers = sum(s.get("viewer_count", 0) for s in twitch_streams)
        big_streamer_count = len([s for s in twitch_streams 
                                  if s.get("viewer_count", 0) > 5000])
        
        golden_hours: List[GoldenHourWindow] = []
        
        # Check next 48 hours for opportunities
        for hours_ahead in range(1, 49):
            check_time = now + timedelta(hours=hours_ahead)
            check_day = check_time.weekday()
            check_hour = check_time.hour
            
            # Calculate opportunity score
            score = self._calculate_opportunity_score(
                check_day, check_hour, big_streamer_count, total_viewers
            )
            
            if score >= 60:  # Only include good opportunities
                competition = self._get_competition_level(check_day, check_hour)
                viewer_avail = self._get_viewer_availability(check_day, check_hour)
                
                golden_hours.append(GoldenHourWindow(
                    day=self.day_names[check_day],
                    start_hour=check_hour,
                    end_hour=(check_hour + 2) % 24,
                    timezone="UTC",
                    competition_level=competition,
                    viewer_availability=viewer_avail,
                    opportunity_score=score,
                    reasoning=self._generate_reasoning(
                        check_day, check_hour, competition, viewer_avail
                    ),
                ))
        
        # Sort by score and return top 5
        golden_hours.sort(key=lambda x: x.opportunity_score, reverse=True)
        return golden_hours[:5]
    
    def _calculate_opportunity_score(
        self,
        day: int,
        hour: int,
        big_streamer_count: int,
        total_viewers: int,
    ) -> int:
        """Calculate opportunity score 0-100."""
        score = 50  # Base score
        
        # Bonus for off-peak hours (less competition)
        if hour in self.OPPORTUNITY_HOURS.get(day, []):
            score += 25
        elif hour in self.PEAK_HOURS.get(day, []):
            score -= 10
        
        # Weekend bonus (more casual viewers)
        if day in [5, 6]:
            score += 10
        
        # Early morning penalty (very low viewership)
        if hour in [2, 3, 4, 5, 6, 7]:
            score -= 20
        
        # Late night slight bonus (dedicated viewers)
        if hour in [23, 0, 1]:
            score += 5
        
        # Adjust based on current competition
        if big_streamer_count < 10:
            score += 15
        elif big_streamer_count > 30:
            score -= 10
        
        return max(0, min(100, score))
    
    def _get_competition_level(self, day: int, hour: int) -> str:
        """Determine competition level for a time slot."""
        if hour in self.PEAK_HOURS.get(day, []):
            return "high"
        elif hour in self.OPPORTUNITY_HOURS.get(day, []):
            return "low"
        elif hour in [2, 3, 4, 5, 6, 7]:
            return "low"
        return "medium"
    
    def _get_viewer_availability(self, day: int, hour: int) -> str:
        """Estimate viewer availability for a time slot."""
        # Weekend afternoons = high
        if day in [5, 6] and hour in range(12, 22):
            return "high"
        # Weekday evenings = high
        if day in range(5) and hour in range(18, 23):
            return "high"
        # Early morning = low
        if hour in [2, 3, 4, 5, 6, 7]:
            return "low"
        # Weekday work hours = medium
        if day in range(5) and hour in range(9, 17):
            return "medium"
        return "medium"
    
    def _generate_reasoning(
        self,
        day: int,
        hour: int,
        competition: str,
        viewer_avail: str,
    ) -> str:
        """Generate human-readable reasoning for the recommendation."""
        day_name = self.day_names[day]
        
        if competition == "low" and viewer_avail == "high":
            return f"{day_name} {hour}:00 UTC - Sweet spot! Big streamers are offline but viewers are active."
        elif competition == "low" and viewer_avail == "medium":
            return f"{day_name} {hour}:00 UTC - Low competition window. Great for building core audience."
        elif competition == "medium" and viewer_avail == "high":
            return f"{day_name} {hour}:00 UTC - Moderate competition but high viewer pool. Stand out with unique content."
        elif competition == "low":
            return f"{day_name} {hour}:00 UTC - Quiet period. Perfect for dedicated community building."
        else:
            return f"{day_name} {hour}:00 UTC - Opportunity window detected based on current trends."
