"""
Headline Generator - Creates dynamic headlines and determines market mood.

Analyzes current data to determine the overall market mood
and generates appropriate headlines.
"""

import logging
import random
from typing import List, Dict, Any, Tuple

from backend.services.playbook.constants import HEADLINE_TEMPLATES, DAILY_MANTRAS

logger = logging.getLogger(__name__)


class HeadlineGenerator:
    """Generates headlines and determines market mood."""
    
    def __init__(self):
        pass
    
    def generate(
        self,
        twitch_streams: List[Dict[str, Any]],
        twitch_games: List[Dict[str, Any]],
        golden_hours: List[Dict[str, Any]],
        niche_opportunities: List[Dict[str, Any]],
    ) -> Tuple[str, str, str]:
        """
        Generate headline, subheadline, and determine mood.
        
        Returns:
            Tuple of (headline, subheadline, mood)
        """
        # Determine mood based on data
        mood = self._determine_mood(
            twitch_streams, twitch_games, golden_hours, niche_opportunities
        )
        
        # Select headline for mood
        headline = random.choice(HEADLINE_TEMPLATES.get(mood, HEADLINE_TEMPLATES["opportunity"]))
        
        # Generate contextual subheadline
        subheadline = self._generate_subheadline(
            mood, twitch_streams, golden_hours, niche_opportunities
        )
        
        return headline, subheadline, mood
    
    def get_daily_mantra(self) -> str:
        """Get a random daily mantra."""
        return random.choice(DAILY_MANTRAS)
    
    def _determine_mood(
        self,
        streams: List[Dict[str, Any]],
        games: List[Dict[str, Any]],
        golden_hours: List[Dict[str, Any]],
        niches: List[Dict[str, Any]],
    ) -> str:
        """
        Determine market mood based on current conditions.
        
        Moods:
        - bullish: Great conditions for small streamers
        - cautious: Mixed signals, be strategic
        - opportunity: Specific opportunities detected
        - competitive: High competition, differentiate
        """
        # Count big streamers
        big_streamers = len([s for s in streams if s.get("viewer_count", 0) > 10000])
        
        # Check golden hour quality
        best_golden = golden_hours[0] if golden_hours else None
        golden_score = best_golden.get("opportunity_score", 0) if best_golden else 0
        
        # Check niche quality
        best_niche = niches[0] if niches else None
        niche_saturation = best_niche.get("saturation_score", 100) if best_niche else 100
        
        # Decision logic
        if big_streamers < 15 and golden_score > 75:
            return "bullish"
        elif niche_saturation < 40 or (golden_score > 70 and big_streamers < 25):
            return "opportunity"
        elif big_streamers > 30:
            return "competitive"
        else:
            return "cautious"
    
    def _generate_subheadline(
        self,
        mood: str,
        streams: List[Dict[str, Any]],
        golden_hours: List[Dict[str, Any]],
        niches: List[Dict[str, Any]],
    ) -> str:
        """Generate a contextual subheadline."""
        total_viewers = sum(s.get("viewer_count", 0) for s in streams)
        big_streamers = len([s for s in streams if s.get("viewer_count", 0) > 10000])
        
        if mood == "bullish":
            if golden_hours:
                gh = golden_hours[0]
                return f"Golden window at {gh.get('start_hour', 0)}:00 UTC. {self._format_viewers(total_viewers)} viewers up for grabs."
            return f"Low competition detected. {self._format_viewers(total_viewers)} viewers looking for content."
        
        elif mood == "opportunity":
            if niches:
                niche = niches[0]
                return f"{niche.get('game_or_niche', 'A niche')} is undersaturated. First-mover advantage available."
            return "Hidden opportunities detected in today's data. Check the niche finder."
        
        elif mood == "competitive":
            return f"{big_streamers} major streamers live. Stand out with unique content or wait for golden hours."
        
        else:  # cautious
            return f"Mixed signals today. {self._format_viewers(total_viewers)} viewers across {len(streams)} streams. Be strategic."
    
    def _format_viewers(self, num: int) -> str:
        """Format viewer count for display."""
        if num >= 1_000_000:
            return f"{num / 1_000_000:.1f}M"
        elif num >= 1_000:
            return f"{num / 1_000:.0f}K"
        return str(num)
