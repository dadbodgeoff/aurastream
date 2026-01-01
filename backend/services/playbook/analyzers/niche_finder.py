"""
Niche Finder Analyzer - Detect underserved content opportunities.

Analyzes game/category data to find niches where:
- Viewer-to-streamer ratio is favorable
- Growth potential is high
- Competition is manageable for small streamers
"""

import logging
from typing import List, Dict, Any

from backend.api.schemas.playbook import NicheOpportunity

logger = logging.getLogger(__name__)


class NicheFinderAnalyzer:
    """Finds underserved niches with high growth potential."""
    
    # Minimum thresholds for a viable niche
    MIN_VIEWERS = 500
    MIN_STREAMS = 3
    MAX_SATURATION = 70  # Saturation score threshold
    
    def __init__(self):
        pass
    
    async def analyze(
        self,
        twitch_games: List[Dict[str, Any]],
        twitch_streams: List[Dict[str, Any]],
        youtube_videos: List[Dict[str, Any]],
    ) -> List[NicheOpportunity]:
        """
        Analyze games/categories to find underserved niches.
        
        Args:
            twitch_games: Top games on Twitch
            twitch_streams: Current live streams
            youtube_videos: Trending YouTube gaming videos
            
        Returns:
            List of niche opportunities sorted by potential
        """
        opportunities: List[NicheOpportunity] = []
        
        # Aggregate stream data by game
        game_stats = self._aggregate_game_stats(twitch_streams)
        
        # Analyze each game for opportunity
        for game in twitch_games:
            game_id = game.get("game_id") or game.get("id")
            game_name = game.get("name", "Unknown")
            
            stats = game_stats.get(game_id, {
                "viewers": 0,
                "streams": 0,
                "avg_viewers": 0,
            })
            
            # Skip games with too few viewers
            if stats["viewers"] < self.MIN_VIEWERS:
                continue
            
            # Calculate saturation score
            saturation = self._calculate_saturation(
                stats["viewers"],
                stats["streams"],
                stats["avg_viewers"],
            )
            
            # Only include undersaturated niches
            if saturation > self.MAX_SATURATION:
                continue
            
            # Determine growth potential
            growth = self._assess_growth_potential(
                game_name, stats, youtube_videos
            )
            
            # Generate suggested angle
            angle = self._suggest_angle(game_name, stats)
            
            opportunities.append(NicheOpportunity(
                game_or_niche=game_name,
                current_viewers=stats["viewers"],
                stream_count=stats["streams"],
                avg_viewers_per_stream=stats["avg_viewers"],
                saturation_score=saturation,
                growth_potential=growth,
                why_now=self._generate_why_now(game_name, saturation, growth),
                suggested_angle=angle,
                thumbnail_url=game.get("box_art_url", "").replace("{width}", "285").replace("{height}", "380"),
            ))
        
        # Sort by opportunity (low saturation + high growth)
        opportunities.sort(
            key=lambda x: (
                100 - x.saturation_score,  # Lower saturation = better
                {"explosive": 4, "high": 3, "moderate": 2, "stable": 1}.get(x.growth_potential, 0),
            ),
            reverse=True,
        )
        
        return opportunities[:6]
    
    def _aggregate_game_stats(
        self,
        streams: List[Dict[str, Any]],
    ) -> Dict[str, Dict[str, int]]:
        """Aggregate stream statistics by game."""
        stats: Dict[str, Dict[str, int]] = {}
        
        for stream in streams:
            game_id = stream.get("game_id")
            if not game_id:
                continue
            
            if game_id not in stats:
                stats[game_id] = {"viewers": 0, "streams": 0}
            
            stats[game_id]["viewers"] += stream.get("viewer_count", 0)
            stats[game_id]["streams"] += 1
        
        # Calculate averages
        for game_id in stats:
            if stats[game_id]["streams"] > 0:
                stats[game_id]["avg_viewers"] = (
                    stats[game_id]["viewers"] // stats[game_id]["streams"]
                )
            else:
                stats[game_id]["avg_viewers"] = 0
        
        return stats
    
    def _calculate_saturation(
        self,
        total_viewers: int,
        stream_count: int,
        avg_viewers: int,
    ) -> int:
        """
        Calculate saturation score 0-100.
        
        Lower score = less saturated = better opportunity.
        """
        if stream_count == 0:
            return 0
        
        # Viewer-to-streamer ratio
        ratio = total_viewers / stream_count
        
        # High ratio = good (viewers available per streamer)
        # Low ratio = bad (too many streamers fighting for viewers)
        
        if ratio > 1000:
            saturation = 20  # Very undersaturated
        elif ratio > 500:
            saturation = 35
        elif ratio > 200:
            saturation = 50
        elif ratio > 100:
            saturation = 65
        elif ratio > 50:
            saturation = 80
        else:
            saturation = 95  # Very saturated
        
        # Adjust for absolute stream count
        if stream_count > 500:
            saturation += 15
        elif stream_count > 200:
            saturation += 10
        elif stream_count < 20:
            saturation -= 10
        
        return max(0, min(100, saturation))
    
    def _assess_growth_potential(
        self,
        game_name: str,
        stats: Dict[str, int],
        youtube_videos: List[Dict[str, Any]],
    ) -> str:
        """Assess growth potential based on cross-platform signals."""
        game_lower = game_name.lower()
        
        # Check YouTube presence
        yt_mentions = sum(
            1 for v in youtube_videos
            if game_lower in v.get("title", "").lower()
            or game_lower in " ".join(v.get("tags", [])).lower()
        )
        
        # High YouTube activity = explosive potential
        if yt_mentions >= 5:
            return "explosive"
        elif yt_mentions >= 3:
            return "high"
        
        # Check viewer-to-stream ratio for organic growth
        if stats["avg_viewers"] > 500:
            return "high"
        elif stats["avg_viewers"] > 200:
            return "moderate"
        
        return "stable"
    
    def _suggest_angle(self, game_name: str, stats: Dict[str, int]) -> str:
        """Suggest a unique angle for the niche."""
        angles = [
            f"Educational {game_name} content - teach viewers advanced strategies",
            f"Chill {game_name} vibes - relaxed commentary for casual viewers",
            f"{game_name} challenges - unique self-imposed rules for entertainment",
            "Speedrun/optimization focus - appeal to competitive viewers",
            f"Community games - involve viewers in {game_name} sessions",
            "Story/lore deep dives - for narrative-focused viewers",
        ]
        
        # Pick based on stats
        if stats["avg_viewers"] > 300:
            return angles[0]  # Educational for established games
        elif stats["streams"] < 50:
            return angles[4]  # Community for smaller games
        else:
            import random
            return random.choice(angles)
    
    def _generate_why_now(
        self,
        game_name: str,
        saturation: int,
        growth: str,
    ) -> str:
        """Generate reasoning for why this is a good opportunity now."""
        if growth == "explosive" and saturation < 40:
            return f"{game_name} is blowing up on YouTube but Twitch is undersaturated. First-mover advantage!"
        elif growth == "high" and saturation < 50:
            return f"Growing interest in {game_name} with room for new streamers. Get in early."
        elif saturation < 30:
            return f"Very few streamers in {game_name} relative to viewer interest. Low competition goldmine."
        elif growth in ["explosive", "high"]:
            return f"{game_name} is trending. Ride the wave with unique content."
        else:
            return f"Stable {game_name} community looking for fresh voices. Consistency wins here."
