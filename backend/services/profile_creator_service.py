"""
Profile Creator Service for AuraStream.

Thin wrapper around the Coach service with specialized prompts
for profile picture and logo creation.

This service:
- Uses the same session management as Coach
- Has specialized system prompts for profile/logo creation
- Tracks usage separately from general coach
- Generates square assets (profile_picture, streamer_logo)
"""

import logging
import time
from typing import Optional, Dict, Any, AsyncGenerator
from dataclasses import dataclass

from backend.services.coach.models import CoachSession, CoachMessage
from backend.services.coach.session_manager import (
    SessionManager,
    get_session_manager,
    SessionNotFoundError,
)
from backend.services.coach.llm_client import CoachLLMClient, get_llm_client
from backend.services.coach.intent_extractor import IntentExtractor, CreativeIntent


logger = logging.getLogger(__name__)


@dataclass
class StreamChunk:
    """Single chunk in a streaming response."""
    type: str  # "token", "intent_ready", "done", "error"
    content: str = ""
    metadata: Optional[Dict[str, Any]] = None


# ============================================================================
# System Prompts for Profile Creator
# ============================================================================

PROFILE_PICTURE_SYSTEM_PROMPT = '''You help streamers create profile pictures/avatars.

RULE #1: Do what the user asks. If they request changes, make them.

Context: {brand_context}
Brand colors: {color_list}
Style preset: {style_preset}

For PROFILE PICTURES, gather (only what's missing):
- Subject: What should be shown? (face, character, mascot, symbol, or abstract)
- Style: Art style preference (realistic, anime, cartoon, pixel art, 3D render, illustrated)
- Expression/Mood: What feeling? (friendly, intense, mysterious, playful, professional)
- Colors: Use brand colors or custom palette?

Keep responses to 2-3 sentences. Be conversational and helpful.

When you have enough info to create a great profile picture:
"✨ Ready! [detailed summary of what will be created] [INTENT_READY]"

Example ready response:
"✨ Ready! A friendly cartoon fox mascot with bright orange fur, wearing gaming headphones, with a confident smile. Using your brand's purple and teal accent colors for the background gradient. [INTENT_READY]"
'''

STREAMER_LOGO_SYSTEM_PROMPT = '''You help streamers create logos/brand marks.

RULE #1: Do what the user asks. If they request changes, make them.

Context: {brand_context}
Brand colors: {color_list}
Style preset: {style_preset}

For LOGOS, gather (only what's missing):
- Main element: What's the core? (letter/initials, symbol, mascot, abstract shape)
- Style: Design style (minimal, detailed, vintage, modern, gaming, esports)
- Shape: Overall shape preference (circle, square, shield, hexagon, custom)
- Colors: Use brand colors or custom palette?

Keep responses to 2-3 sentences. Be conversational and helpful.

When you have enough info to create a great logo:
"✨ Ready! [detailed summary of what will be created] [INTENT_READY]"

Example ready response:
"✨ Ready! A bold shield-shaped logo featuring the letter 'K' in a modern gaming style. Electric blue main color with white accents, clean edges for versatility across platforms. [INTENT_READY]"
'''

STYLE_PRESET_DESCRIPTIONS = {
    "gaming": "Bold, dynamic, high-energy gaming aesthetic with sharp edges and vibrant colors",
    "minimal": "Clean, simple, modern design with lots of whitespace and subtle details",
    "vibrant": "Colorful, energetic, eye-catching with gradients and bright accents",
    "anime": "Anime/manga inspired style with expressive features and dynamic poses",
    "retro": "Pixel art or 8-bit inspired, nostalgic gaming feel",
    "professional": "Clean, corporate, trustworthy look suitable for business",
    "custom": "User-defined style based on their description",
}


class ProfileCreatorService:
    """
    Profile Creator Service - specialized coach for profile pictures and logos.
    
    Reuses Coach infrastructure with custom prompts optimized for:
    - Profile pictures (avatars, PFPs)
    - Streamer logos (brand marks, icons)
    """
    
    MAX_TURNS = 10
    
    def __init__(
        self,
        session_manager: Optional[SessionManager] = None,
        llm_client: Optional[CoachLLMClient] = None,
    ):
        self._session_manager = session_manager
        self._llm_client = llm_client
        self._intent_extractor = IntentExtractor()
    
    @property
    def session_manager(self) -> SessionManager:
        if self._session_manager is None:
            self._session_manager = get_session_manager()
        return self._session_manager
    
    @property
    def llm_client(self) -> CoachLLMClient:
        if self._llm_client is None:
            self._llm_client = get_llm_client()
        return self._llm_client
    
    def _build_system_prompt(
        self,
        creation_type: str,
        brand_context: Optional[Dict[str, Any]] = None,
        style_preset: Optional[str] = None,
    ) -> str:
        """Build the system prompt for the creation type."""
        # Select base prompt
        if creation_type == "streamer_logo":
            base_prompt = STREAMER_LOGO_SYSTEM_PROMPT
        else:
            base_prompt = PROFILE_PICTURE_SYSTEM_PROMPT
        
        # Format brand context
        brand_str = "No brand kit provided"
        color_list = "No brand colors"
        
        if brand_context:
            if brand_context.get("brand_name"):
                brand_str = f"Brand: {brand_context['brand_name']}"
            
            colors = []
            if brand_context.get("primary_colors"):
                for c in brand_context["primary_colors"][:3]:
                    colors.append(f"{c.get('name', 'Color')} ({c.get('hex', '#000000')})")
            if brand_context.get("accent_colors"):
                for c in brand_context["accent_colors"][:2]:
                    colors.append(f"{c.get('name', 'Accent')} ({c.get('hex', '#000000')})")
            
            if colors:
                color_list = ", ".join(colors)
        
        # Format style preset
        style_str = "None selected"
        if style_preset and style_preset in STYLE_PRESET_DESCRIPTIONS:
            style_str = f"{style_preset}: {STYLE_PRESET_DESCRIPTIONS[style_preset]}"
        
        return base_prompt.format(
            brand_context=brand_str,
            color_list=color_list,
            style_preset=style_str,
        )
    
    def _build_initial_message(
        self,
        creation_type: str,
        initial_description: Optional[str] = None,
        style_preset: Optional[str] = None,
    ) -> str:
        """Build the initial user message."""
        type_name = "profile picture" if creation_type == "profile_picture" else "logo"
        
        parts = [f"I want to create a {type_name}"]
        
        if style_preset and style_preset != "custom":
            parts.append(f"in a {style_preset} style")
        
        if initial_description:
            parts.append(f". {initial_description}")
        else:
            parts.append(". Help me figure out what would look great!")
        
        return " ".join(parts)
    
    async def start_session(
        self,
        user_id: str,
        creation_type: str,
        brand_context: Optional[Dict[str, Any]] = None,
        initial_description: Optional[str] = None,
        style_preset: Optional[str] = None,
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Start a new profile creator session.
        
        Args:
            user_id: User's ID
            creation_type: "profile_picture" or "streamer_logo"
            brand_context: Optional brand kit context
            initial_description: Optional initial description
            style_preset: Optional style preset
            
        Yields:
            StreamChunk objects with tokens and metadata
        """
        # Build prompts
        system_prompt = self._build_system_prompt(
            creation_type, brand_context, style_preset
        )
        initial_message = self._build_initial_message(
            creation_type, initial_description, style_preset
        )
        
        # Create session with metadata
        session_data = {
            "creation_type": creation_type,
            "style_preset": style_preset,
            "brand_context": brand_context,
        }
        
        session = await self.session_manager.create_with_context(
            user_id=user_id,
            asset_type=creation_type,  # Use creation_type as asset_type
            brand_context=brand_context or {},
            mood=style_preset or "custom",
            initial_description=initial_description,
        )
        
        session_id = session.session_id
        
        # Store additional metadata
        await self.session_manager.update_session_metadata(
            session_id,
            {"profile_creator_data": session_data}
        )
        
        # Build messages for LLM
        messages = [
            {"role": "user", "content": initial_message}
        ]
        
        # Stream response
        full_response = ""
        
        try:
            async for token in self.llm_client.stream_chat(
                messages=messages,
                system_prompt=system_prompt,
            ):
                full_response += token
                yield StreamChunk(type="token", content=token)
            
            # Extract intent from response
            intent = self._intent_extractor.extract(full_response)
            
            # Update session
            await self.session_manager.add_message(
                session_id, 
                CoachMessage(
                    role="user",
                    content=initial_message,
                    timestamp=time.time(),
                )
            )
            await self.session_manager.add_message(
                session_id,
                CoachMessage(
                    role="assistant",
                    content=full_response,
                    timestamp=time.time(),
                )
            )
            
            if intent.is_ready:
                await self.session_manager.update_session_metadata(
                    session_id,
                    {
                        "is_ready": True,
                        "refined_description": intent.description,
                        "confidence": intent.confidence_score,
                    }
                )
                
                yield StreamChunk(
                    type="intent_ready",
                    content="",
                    metadata={
                        "is_ready": True,
                        "confidence": intent.confidence_score,
                        "refined_description": intent.description,
                    }
                )
            
            # Done chunk
            yield StreamChunk(
                type="done",
                content="",
                metadata={
                    "session_id": session_id,
                    "turns_used": 1,
                    "turns_remaining": self.MAX_TURNS - 1,
                }
            )
            
        except Exception as e:
            logger.error(f"Error in profile creator session: {e}")
            yield StreamChunk(
                type="error",
                content=str(e),
                metadata={"session_id": session_id}
            )
    
    async def continue_session(
        self,
        session_id: str,
        user_id: str,
        message: str,
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Continue an existing profile creator session.
        
        Args:
            session_id: Session ID
            user_id: User's ID (for verification)
            message: User's message
            
        Yields:
            StreamChunk objects
        """
        # Get session
        session = await self.session_manager.get_session(session_id)
        
        if not session:
            yield StreamChunk(type="error", content="Session not found")
            return
        
        if session.user_id != user_id:
            yield StreamChunk(type="error", content="Unauthorized")
            return
        
        # Check turn limit
        turns_used = len([m for m in session.messages if m.role == "user"])
        if turns_used >= self.MAX_TURNS:
            yield StreamChunk(type="error", content="Turn limit reached")
            return
        
        # Get metadata
        metadata = getattr(session, 'metadata', {}) or {}
        profile_data = metadata.get('profile_creator_data', {})
        creation_type = profile_data.get('creation_type', 'profile_picture')
        style_preset = profile_data.get('style_preset')
        brand_context = profile_data.get('brand_context')
        
        # Build system prompt
        system_prompt = self._build_system_prompt(
            creation_type, brand_context, style_preset
        )
        
        # Build conversation history
        messages = []
        for msg in session.messages:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": message})
        
        # Stream response
        full_response = ""
        
        try:
            async for token in self.llm_client.stream_chat(
                messages=messages,
                system_prompt=system_prompt,
            ):
                full_response += token
                yield StreamChunk(type="token", content=token)
            
            # Extract intent
            intent = self._intent_extractor.extract(full_response)
            
            # Update session
            await self.session_manager.add_message(
                session_id,
                CoachMessage(
                    role="user",
                    content=message,
                    timestamp=time.time(),
                )
            )
            await self.session_manager.add_message(
                session_id,
                CoachMessage(
                    role="assistant",
                    content=full_response,
                    timestamp=time.time(),
                )
            )
            
            new_turns_used = turns_used + 1
            
            if intent.is_ready:
                await self.session_manager.update_session_metadata(
                    session_id,
                    {
                        "is_ready": True,
                        "refined_description": intent.description,
                        "confidence": intent.confidence_score,
                    }
                )
                
                yield StreamChunk(
                    type="intent_ready",
                    content="",
                    metadata={
                        "is_ready": True,
                        "confidence": intent.confidence_score,
                        "refined_description": intent.description,
                    }
                )
            
            yield StreamChunk(
                type="done",
                content="",
                metadata={
                    "session_id": session_id,
                    "turns_used": new_turns_used,
                    "turns_remaining": self.MAX_TURNS - new_turns_used,
                }
            )
            
        except Exception as e:
            logger.error(f"Error continuing profile creator session: {e}")
            yield StreamChunk(type="error", content=str(e))
    
    async def get_session(self, session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get session state."""
        session = await self.session_manager.get_session(session_id)
        
        if not session or session.user_id != user_id:
            return None
        
        metadata = getattr(session, 'metadata', {}) or {}
        profile_data = metadata.get('profile_creator_data', {})
        
        turns_used = len([m for m in session.messages if m.role == "user"])
        
        return {
            "session_id": session_id,
            "creation_type": profile_data.get('creation_type', 'profile_picture'),
            "status": "ready" if metadata.get('is_ready') else "active",
            "style_preset": profile_data.get('style_preset'),
            "refined_description": metadata.get('refined_description'),
            "is_ready": metadata.get('is_ready', False),
            "confidence": metadata.get('confidence', 0.0),
            "turns_used": turns_used,
            "turns_remaining": self.MAX_TURNS - turns_used,
            "created_at": session.created_at,
            "messages": [
                {"role": m.role, "content": m.content}
                for m in session.messages
            ],
        }


# Singleton instance
_profile_creator_service: Optional[ProfileCreatorService] = None


def get_profile_creator_service() -> ProfileCreatorService:
    """Get or create the profile creator service singleton."""
    global _profile_creator_service
    if _profile_creator_service is None:
        _profile_creator_service = ProfileCreatorService()
    return _profile_creator_service
