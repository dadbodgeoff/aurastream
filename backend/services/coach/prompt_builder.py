"""
Prompt Builder for Prompt Coach.

Responsible for constructing system prompts and user messages
for the coach LLM. This module centralizes all prompt templates
and formatting logic.

The coach uses a "Creative Director" persona that helps users
articulate their vision without exposing the actual generation prompts.
"""

import logging
from dataclasses import dataclass
from typing import Dict, Any, Optional, List

from backend.services.coach.models import CoachSession

logger = logging.getLogger(__name__)


@dataclass
class PromptContext:
    """
    Context for building prompts.
    
    Encapsulates all the information needed to build
    system and user prompts for the coach.
    """
    asset_type: str
    mood: str
    custom_mood: Optional[str] = None
    brand_context: Optional[Dict[str, Any]] = None
    game_name: Optional[str] = None
    game_context: Optional[str] = None
    description: Optional[str] = None
    current_vision: Optional[str] = None


class PromptBuilder:
    """
    Builds prompts for the Creative Director coach.
    
    This class is responsible for:
    - Building system prompts that define the coach's behavior
    - Building user messages from context selections
    - Rebuilding prompts from session state
    
    The prompts are designed to:
    - Help users articulate WHAT they want (not HOW to prompt)
    - Keep responses concise (2-3 sentences)
    - Confirm text spelling
    - Signal readiness with [INTENT_READY] marker
    """
    
    # Main system prompt template
    # This defines the coach's behavior and constraints
    SYSTEM_PROMPT_TEMPLATE = '''You help streamers create {asset_type} assets.

RULE #1: Do what the user asks. If they request changes, make them. If they ask questions, answer them.

Context: {brand_context} | {game_context} | {mood_context}
Brand colors: {color_list}

Gather (only what's missing): subject, style/mood, any text to include.

Keep responses to 2-3 sentences. Confirm any text spelling. When ready:
"✨ Ready! [summary] [INTENT_READY]"
'''
    
    # Asset type display names for more natural language
    ASSET_TYPE_NAMES = {
        "twitch_emote": "Twitch emote",
        "youtube_thumbnail": "YouTube thumbnail",
        "twitch_banner": "Twitch banner",
        "twitch_badge": "Twitch badge",
        "twitch_panel": "Twitch panel",
        "twitch_offline": "Twitch offline screen",
        "overlay": "stream overlay",
        "story_graphic": "story graphic",
        "thumbnail": "thumbnail",
        "banner": "banner",
        "tiktok_emote": "TikTok emote",
        "instagram_story": "Instagram story",
        "instagram_reel": "Instagram reel",
    }
    
    def __init__(self):
        """Initialize the prompt builder."""
        pass
    
    def build_system_prompt(self, context: PromptContext) -> str:
        """
        Build the system prompt for a new coaching session.
        
        Args:
            context: The prompt context with all necessary information
            
        Returns:
            The formatted system prompt
        """
        # Format brand context
        brand_section = self._format_brand_context(context.brand_context)
        
        # Format color list
        color_list = self._format_color_list(context.brand_context)
        
        # Format mood context
        mood_section = context.custom_mood or context.mood or "flexible"
        
        # Format game context
        game_section = context.game_context if context.game_context else "none"
        
        # Get friendly asset type name
        asset_name = self.ASSET_TYPE_NAMES.get(
            context.asset_type,
            context.asset_type.replace("_", " ")
        )
        
        return self.SYSTEM_PROMPT_TEMPLATE.format(
            asset_type=asset_name,
            brand_context=brand_section,
            game_context=game_section,
            mood_context=mood_section,
            color_list=color_list,
        )
    
    def build_system_prompt_from_session(self, session: CoachSession) -> str:
        """
        Rebuild system prompt from session state.
        
        Used when continuing a conversation to maintain context.
        
        Args:
            session: The current coaching session
            
        Returns:
            The formatted system prompt
        """
        context = PromptContext(
            asset_type=session.asset_type or "asset",
            mood=session.mood or "balanced",
            brand_context=session.brand_context,
            game_context=session.game_context,
        )
        
        base_prompt = self.build_system_prompt(context)
        
        # Add current vision if we have one
        if session.current_prompt_draft:
            base_prompt += f"\nCurrent vision: {session.current_prompt_draft}"
        
        return base_prompt
    
    def build_first_message(self, context: PromptContext) -> str:
        """
        Build the first user message from context selections.
        
        This message introduces what the user wants to create
        based on their selections in the UI.
        
        Args:
            context: The prompt context
            
        Returns:
            The formatted first user message
        """
        parts = []
        
        # Asset type
        asset_name = self.ASSET_TYPE_NAMES.get(
            context.asset_type,
            context.asset_type.replace("_", " ")
        )
        parts.append(f"I want to create a {asset_name}.")
        
        # Game context
        if context.game_name:
            parts.append(f"It's for {context.game_name} content.")
        
        # Mood
        if context.mood != "custom":
            parts.append(f"I want it to feel {context.mood}.")
        elif context.custom_mood:
            parts.append(f"The vibe I'm going for: {context.custom_mood}")
        
        # Description
        if context.description:
            parts.append(f"My idea: {context.description}")
        
        return " ".join(parts)
    
    def build_conversation_messages(
        self,
        session: CoachSession,
        new_message: str,
    ) -> List[Dict[str, str]]:
        """
        Build the full message list for continuing a conversation.
        
        Args:
            session: The current session with history
            new_message: The new user message to add
            
        Returns:
            List of message dicts for the LLM
        """
        # Start with system prompt
        system_prompt = self.build_system_prompt_from_session(session)
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history
        for msg in session.messages:
            messages.append({"role": msg.role, "content": msg.content})
        
        # Add new message
        messages.append({"role": "user", "content": new_message})
        
        return messages
    
    def _format_brand_context(
        self,
        brand_context: Optional[Dict[str, Any]],
    ) -> str:
        """
        Format brand context for the system prompt.
        
        Args:
            brand_context: The brand kit context dict
            
        Returns:
            Formatted brand context string
        """
        if not brand_context:
            return "No brand"
        
        tone = brand_context.get("tone", "professional")
        return f"Tone: {tone}" if tone else "No brand"
    
    def _format_color_list(
        self,
        brand_context: Optional[Dict[str, Any]],
    ) -> str:
        """
        Format color list for the system prompt.
        
        Args:
            brand_context: The brand kit context dict
            
        Returns:
            Formatted color list string
        """
        if not brand_context:
            return "none specified"
        
        colors = brand_context.get("colors", [])
        if not colors:
            return "none specified"
        
        # Format up to 3 colors
        color_parts = []
        for color in colors[:3]:
            if isinstance(color, dict):
                name = color.get("name", "Color")
                hex_val = color.get("hex", "#000000")
                color_parts.append(f"{name} ({hex_val})")
        
        return ", ".join(color_parts) if color_parts else "none specified"


# Singleton instance
_prompt_builder: Optional[PromptBuilder] = None


def get_prompt_builder() -> PromptBuilder:
    """Get or create the prompt builder singleton."""
    global _prompt_builder
    if _prompt_builder is None:
        _prompt_builder = PromptBuilder()
    return _prompt_builder


__all__ = [
    "PromptContext",
    "PromptBuilder",
    "get_prompt_builder",
]
