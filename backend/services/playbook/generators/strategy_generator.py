"""
Strategy Generator - Creates actionable content strategies.

Generates personalized strategies based on current trends,
competition levels, and opportunities detected.
"""

import logging
import random
from typing import List, Dict, Any

from backend.api.schemas.playbook import (
    ContentStrategy,
    TitleFormula,
    ThumbnailRecipe,
)
from backend.services.playbook.constants import TITLE_FORMULAS, THUMBNAIL_RECIPES

logger = logging.getLogger(__name__)


class StrategyGenerator:
    """Generates actionable content strategies for streamers."""
    
    # Strategy templates
    STRATEGY_TEMPLATES = [
        {
            "strategy_id": "niche_domination",
            "title": "Niche Domination Strategy",
            "description": "Focus on an underserved game/category to build authority",
            "why_it_works": "Less competition means more discoverability. The algorithm favors consistent category streamers.",
            "difficulty": "beginner",
            "time_investment": "2-4 weeks commitment",
            "expected_impact": "significant",
            "steps": [
                "Pick one underserved game from today's opportunities",
                "Stream it consistently for 2 weeks minimum",
                "Engage with other streamers in the same category",
                "Create clips and highlights to share on social",
                "Track your average viewers week over week",
            ],
            "pro_tip": "Become the 'go-to' person for this game. Answer questions in Discord servers.",
            "tools_needed": ["Streaming software", "Clip editor", "Social media accounts"],
        },
        {
            "strategy_id": "golden_hour_grind",
            "title": "Golden Hour Grind",
            "description": "Stream during low-competition windows for maximum discovery",
            "why_it_works": "When big streamers are offline, you have a better chance of appearing in recommendations.",
            "difficulty": "beginner",
            "time_investment": "Adjust your schedule",
            "expected_impact": "moderate",
            "steps": [
                "Check today's golden hours in the playbook",
                "Plan your stream for one of these windows",
                "Prepare content/games in advance",
                "Go live and engage actively with chat",
                "Raid a similar-sized streamer when you end",
            ],
            "pro_tip": "Consistency in timing builds audience habits. Same time = same viewers returning.",
            "tools_needed": ["Calendar/scheduler", "Raid list of friendly streamers"],
        },
        {
            "strategy_id": "viral_clip_machine",
            "title": "Viral Clip Machine",
            "description": "Optimize your stream for clip-worthy moments",
            "why_it_works": "Clips are the #1 discovery tool on Twitch. One viral clip can 10x your followers.",
            "difficulty": "intermediate",
            "time_investment": "1-2 hours post-stream",
            "expected_impact": "game_changer",
            "steps": [
                "Set up clip notifications in your chat",
                "Create intentional 'clip moments' every 30 mins",
                "Review VOD and clip best moments yourself",
                "Post clips to TikTok, YouTube Shorts, Twitter",
                "Use trending hashtags from today's playbook",
            ],
            "pro_tip": "The first 3 seconds of a clip determine if people watch. Start with the peak moment.",
            "tools_needed": ["Clip editor", "TikTok account", "YouTube channel"],
        },
        {
            "strategy_id": "title_thumbnail_ab",
            "title": "Title & Thumbnail A/B Testing",
            "description": "Test different titles and thumbnails to find what works",
            "why_it_works": "Small changes in titles/thumbnails can 2-3x your CTR. Data beats guessing.",
            "difficulty": "intermediate",
            "time_investment": "30 mins per video",
            "expected_impact": "significant",
            "steps": [
                "Use today's title formulas as templates",
                "Create 2-3 thumbnail variations",
                "Upload with your best guess first",
                "Check CTR after 24 hours in analytics",
                "Swap to variation if CTR is below 4%",
            ],
            "pro_tip": "YouTube lets you change thumbnails anytime. Test aggressively in the first 48 hours.",
            "tools_needed": ["Thumbnail editor (Canva/Photoshop)", "YouTube Studio"],
        },
        {
            "strategy_id": "community_raid_network",
            "title": "Community Raid Network",
            "description": "Build a network of similar-sized streamers for mutual raids",
            "why_it_works": "Raids introduce you to pre-qualified audiences who already like your content type.",
            "difficulty": "beginner",
            "time_investment": "Ongoing relationship building",
            "expected_impact": "significant",
            "steps": [
                "Find 5-10 streamers in your category with similar viewer counts",
                "Watch their streams and engage genuinely",
                "Raid them when you end your stream",
                "Join their Discord and be active",
                "Propose a raid exchange or co-stream",
            ],
            "pro_tip": "Quality over quantity. 5 genuine streamer friends > 50 random raids.",
            "tools_needed": ["Discord", "Raid tracking spreadsheet"],
        },
    ]
    
    def __init__(self):
        pass
    
    async def generate_strategies(
        self,
        niche_opportunities: List[Dict[str, Any]],
        golden_hours: List[Dict[str, Any]],
        viral_hooks: List[Dict[str, Any]],
    ) -> List[ContentStrategy]:
        """
        Generate personalized strategies based on current data.
        
        Args:
            niche_opportunities: Detected niche opportunities
            golden_hours: Optimal streaming windows
            viral_hooks: Trending hooks and patterns
            
        Returns:
            List of actionable strategies
        """
        strategies: List[ContentStrategy] = []
        
        # Always include core strategies
        for template in self.STRATEGY_TEMPLATES[:3]:
            strategies.append(ContentStrategy(**template))
        
        # Add contextual strategies based on data
        if niche_opportunities:
            top_niche = niche_opportunities[0]
            strategies.append(self._create_niche_specific_strategy(top_niche))
        
        if viral_hooks:
            strategies.append(self._create_viral_strategy(viral_hooks))
        
        # Shuffle to keep it fresh
        random.shuffle(strategies)
        
        return strategies[:5]
    
    def generate_title_formulas(
        self,
        youtube_videos: List[Dict[str, Any]],
    ) -> List[TitleFormula]:
        """Generate title formulas with real examples."""
        formulas: List[TitleFormula] = []
        
        for template in TITLE_FORMULAS:
            # Find a real example from trending videos
            example = self._find_matching_title(
                youtube_videos,
                template["best_for"],
            )
            
            # Calculate avg views for this pattern
            avg_views = self._calculate_pattern_views(
                youtube_videos,
                template["best_for"],
            )
            
            formulas.append(TitleFormula(
                formula=template["formula"],
                template=template["template"],
                example=example or template["template"],
                avg_views=avg_views,
                best_for=template["best_for"],
            ))
        
        return formulas
    
    def generate_thumbnail_recipes(self) -> List[ThumbnailRecipe]:
        """Generate thumbnail recipes."""
        recipes: List[ThumbnailRecipe] = []
        
        for template in THUMBNAIL_RECIPES:
            recipes.append(ThumbnailRecipe(
                recipe_name=template["name"],
                elements=template["elements"],
                color_palette=["#FF0000", "#FFFF00", "#FFFFFF", "#000000"],  # High contrast
                text_style=template["text_style"],
                emotion=template["emotion"],
                example_url=None,
                success_rate=template["success_rate"],
            ))
        
        return recipes
    
    def _create_niche_specific_strategy(
        self,
        niche: Dict[str, Any],
    ) -> ContentStrategy:
        """Create a strategy specific to a detected niche."""
        game_name = niche.get("game_or_niche", "this game")
        
        return ContentStrategy(
            strategy_id="niche_specific_today",
            title=f"Today's Opportunity: {game_name}",
            description=f"Capitalize on the {game_name} opportunity detected today",
            why_it_works=niche.get("why_now", "Low saturation with growing interest"),
            difficulty="beginner",
            time_investment="One stream session",
            expected_impact="significant",
            steps=[
                f"Go live playing {game_name} during a golden hour",
                "Use relevant tags and title keywords",
                "Engage with the existing community",
                "Clip your best moments",
                "Share clips with game-specific hashtags",
            ],
            pro_tip=niche.get("suggested_angle", "Find your unique angle"),
            tools_needed=["The game", "Streaming setup"],
        )
    
    def _create_viral_strategy(
        self,
        hooks: List[Dict[str, Any]],
    ) -> ContentStrategy:
        """Create a strategy around viral hooks."""
        top_hooks = [h.get("hook", "") for h in hooks[:3]]
        
        return ContentStrategy(
            strategy_id="viral_hooks_today",
            title="Ride Today's Viral Wave",
            description="Use trending hooks and hashtags for maximum reach",
            why_it_works="Trending content gets algorithmic boost. Strike while it's hot.",
            difficulty="intermediate",
            time_investment="1-2 hours content creation",
            expected_impact="game_changer",
            steps=[
                f"Incorporate these hooks: {', '.join(top_hooks)}",
                "Create a video/stream around one trending topic",
                "Use all suggested hashtags in your posts",
                "Post during peak engagement hours",
                "Engage with others using the same hashtags",
            ],
            pro_tip="Speed matters with trends. Post within 24 hours of detection.",
            tools_needed=["Content creation tools", "Social media accounts"],
        )
    
    def _find_matching_title(
        self,
        videos: List[Dict[str, Any]],
        best_for: List[str],
    ) -> str:
        """Find a real title matching the pattern."""
        for video in videos:
            title = video.get("title", "")
            title_lower = title.lower()
            
            for keyword in best_for:
                if keyword in title_lower:
                    return title[:80] + ("..." if len(title) > 80 else "")
        
        return ""
    
    def _calculate_pattern_views(
        self,
        videos: List[Dict[str, Any]],
        best_for: List[str],
    ) -> int:
        """Calculate average views for videos matching a pattern."""
        matching_views = []
        
        for video in videos:
            title_lower = video.get("title", "").lower()
            views = video.get("view_count", 0) or video.get("views", 0)
            
            for keyword in best_for:
                if keyword in title_lower:
                    matching_views.append(views)
                    break
        
        if matching_views:
            return sum(matching_views) // len(matching_views)
        return 0
