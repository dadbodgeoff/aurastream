"""
Static Tips Service for Prompt Coach.

Provides curated tips and best practices for Free/Pro users
who don't have access to the full conversational Prompt Coach.

This is the fallback when users don't have Premium access.
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import random


@dataclass
class PromptTip:
    """A static prompt tip."""
    id: str
    title: str
    description: str
    example_prompt: str
    asset_types: List[str]  # Which asset types this applies to
    category: str  # "style", "composition", "color", "gaming"


class StaticTipsService:
    """
    Provides static tips and best practices for Free/Pro users.
    
    This is the fallback when users don't have Premium access
    to the full conversational Prompt Coach.
    """
    
    TIPS: List[PromptTip] = [
        # Style tips
        PromptTip(
            id="style_001",
            title="Be Specific About Style",
            description="Instead of 'cool style', specify the exact aesthetic you want like 'anime', 'pixel art', or 'realistic'.",
            example_prompt="3D render style, vibrant neon colors, cyberpunk aesthetic",
            asset_types=["all"],
            category="style",
        ),
        PromptTip(
            id="style_002",
            title="Use Art Style References",
            description="Reference specific art styles to get consistent results.",
            example_prompt="Studio Ghibli inspired, soft watercolor style, dreamy atmosphere",
            asset_types=["all"],
            category="style",
        ),
        PromptTip(
            id="style_003",
            title="Specify Quality Keywords",
            description="Add quality modifiers to improve output.",
            example_prompt="High quality, detailed, professional, sharp focus",
            asset_types=["all"],
            category="style",
        ),
        
        # Color tips
        PromptTip(
            id="color_001",
            title="Use Your Brand Colors",
            description="Include your exact hex codes for consistent branding across all assets.",
            example_prompt="Using brand colors #FF5733 and #3498DB as primary palette",
            asset_types=["all"],
            category="color",
        ),
        PromptTip(
            id="color_002",
            title="Describe Color Mood",
            description="Use color mood words to set the tone.",
            example_prompt="Warm sunset tones, golden hour lighting, orange and pink gradient",
            asset_types=["all"],
            category="color",
        ),
        PromptTip(
            id="color_003",
            title="High Contrast for Thumbnails",
            description="Thumbnails need to stand out. Use bold, contrasting colors.",
            example_prompt="High contrast, bold colors, eye-catching, vibrant",
            asset_types=["youtube_thumbnail"],
            category="color",
        ),
        
        # Emote-specific tips
        PromptTip(
            id="emote_001",
            title="Keep Emotes Simple",
            description="Emotes are viewed at tiny sizes (28x28 pixels). Simple, bold designs work best.",
            example_prompt="Simple expressive face, bold outlines, single emotion, sticker style",
            asset_types=["twitch_emote"],
            category="composition",
        ),
        PromptTip(
            id="emote_002",
            title="Focus on Expression",
            description="The emotion should be instantly readable even at small sizes.",
            example_prompt="Exaggerated happy expression, wide smile, sparkle eyes, clear emotion",
            asset_types=["twitch_emote"],
            category="composition",
        ),
        PromptTip(
            id="emote_003",
            title="Avoid Text in Emotes",
            description="Text becomes unreadable at emote sizes. Use visual elements instead.",
            example_prompt="Visual pog expression, no text, expressive character face",
            asset_types=["twitch_emote"],
            category="composition",
        ),
        
        # Thumbnail tips
        PromptTip(
            id="thumb_001",
            title="Leave Space for Text",
            description="Don't fill the entire frame - leave room for your title overlay.",
            example_prompt="Subject on left side, negative space on right for text overlay",
            asset_types=["youtube_thumbnail"],
            category="composition",
        ),
        PromptTip(
            id="thumb_002",
            title="Use Dynamic Poses",
            description="Action and movement catch the eye in a sea of static thumbnails.",
            example_prompt="Dynamic action pose, mid-motion, energetic, dramatic angle",
            asset_types=["youtube_thumbnail"],
            category="composition",
        ),
        PromptTip(
            id="thumb_003",
            title="Clear Focal Point",
            description="Have one clear subject that draws the eye immediately.",
            example_prompt="Single subject centered, blurred background, spotlight effect",
            asset_types=["youtube_thumbnail"],
            category="composition",
        ),
        
        # Gaming context tips
        PromptTip(
            id="game_001",
            title="Reference Current Seasons",
            description="Mention the current game season or event for timely, relevant content.",
            example_prompt="Fortnite Chapter 5 themed, current battle pass aesthetic",
            asset_types=["all"],
            category="gaming",
        ),
        PromptTip(
            id="game_002",
            title="Match Game Aesthetics",
            description="Each game has a visual style. Match it for authenticity.",
            example_prompt="Valorant art style, clean geometric shapes, tactical aesthetic",
            asset_types=["all"],
            category="gaming",
        ),
        PromptTip(
            id="game_003",
            title="Use Game-Specific Elements",
            description="Include recognizable elements from the game without copying copyrighted content.",
            example_prompt="Victory royale celebration, battle royale theme, gaming victory moment",
            asset_types=["all"],
            category="gaming",
        ),
        
        # Banner tips
        PromptTip(
            id="banner_001",
            title="Think Horizontal",
            description="Banners are wide. Design with horizontal composition in mind.",
            example_prompt="Panoramic composition, horizontal layout, wide scene",
            asset_types=["twitch_banner"],
            category="composition",
        ),
        PromptTip(
            id="banner_002",
            title="Keep Center Clear",
            description="Your profile picture often overlaps the center. Keep important elements to the sides.",
            example_prompt="Elements on left and right sides, clear center area",
            asset_types=["twitch_banner"],
            category="composition",
        ),
        
        # Badge tips
        PromptTip(
            id="badge_001",
            title="Simple Icons Work Best",
            description="Badges are tiny. Use simple, recognizable symbols.",
            example_prompt="Simple crown icon, bold outline, single color, minimal detail",
            asset_types=["twitch_badge"],
            category="composition",
        ),
    ]
    
    UPGRADE_CTA = {
        "title": "Unlock the Full Prompt Coach",
        "description": "Get AI-powered prompt refinement with personalized suggestions based on your brand.",
        "feature_highlights": [
            "AI-powered conversational assistance",
            "Real-time game season context",
            "Iterative prompt refinement",
            "Brand-aware suggestions",
            "Validation before generation",
        ],
        "button_text": "Upgrade to Premium",
    }
    
    def get_tips_for_asset_type(self, asset_type: str) -> List[PromptTip]:
        """
        Get relevant tips for an asset type.
        
        Args:
            asset_type: The type of asset (e.g., "twitch_emote", "youtube_thumbnail")
            
        Returns:
            List of relevant PromptTip objects
        """
        return [
            tip for tip in self.TIPS
            if asset_type in tip.asset_types or "all" in tip.asset_types
        ]
    
    def get_tips_by_category(self, category: str) -> List[PromptTip]:
        """
        Get tips by category.
        
        Args:
            category: The category (e.g., "style", "composition", "color", "gaming")
            
        Returns:
            List of PromptTip objects in that category
        """
        return [tip for tip in self.TIPS if tip.category == category]
    
    def get_random_tips(self, count: int = 3) -> List[PromptTip]:
        """
        Get random tips for display.
        
        Args:
            count: Number of tips to return
            
        Returns:
            List of random PromptTip objects
        """
        return random.sample(self.TIPS, min(count, len(self.TIPS)))
    
    def get_tip_by_id(self, tip_id: str) -> Optional[PromptTip]:
        """
        Get a specific tip by ID.
        
        Args:
            tip_id: The tip ID
            
        Returns:
            PromptTip if found, None otherwise
        """
        for tip in self.TIPS:
            if tip.id == tip_id:
                return tip
        return None
    
    def format_tips_response(
        self,
        asset_type: str,
        max_tips: int = 5,
    ) -> Dict[str, Any]:
        """
        Format tips for API response.
        
        Args:
            asset_type: The type of asset
            max_tips: Maximum number of tips to return
            
        Returns:
            Dict formatted for API response
        """
        tips = self.get_tips_for_asset_type(asset_type)
        
        return {
            "feature": "tips_only",
            "tips": [
                {
                    "id": tip.id,
                    "title": tip.title,
                    "description": tip.description,
                    "example": tip.example_prompt,
                    "category": tip.category,
                }
                for tip in tips[:max_tips]
            ],
            "upgrade_cta": self.UPGRADE_CTA,
        }
    
    def get_all_categories(self) -> List[str]:
        """Get all available tip categories."""
        return list(set(tip.category for tip in self.TIPS))
    
    def get_all_asset_types(self) -> List[str]:
        """Get all asset types that have specific tips."""
        asset_types = set()
        for tip in self.TIPS:
            for at in tip.asset_types:
                if at != "all":
                    asset_types.add(at)
        return list(asset_types)


# Singleton instance
_tips_service: Optional[StaticTipsService] = None


def get_tips_service() -> StaticTipsService:
    """Get or create the tips service singleton."""
    global _tips_service
    if _tips_service is None:
        _tips_service = StaticTipsService()
    return _tips_service


__all__ = [
    "PromptTip",
    "StaticTipsService",
    "get_tips_service",
]
