"""
Prompt Constructor for Twitch Asset Pipeline.

This module implements Layer 2 of the asset generation pipeline - the Hybrid
Prompt Constructor that builds "Mega-Prompts" for Nano Banana.

The Prompt Constructor NEVER sends raw user text directly to the image generator.
All user input is sanitized and combined with brand context using a structured formula.
"""

import re
from typing import Optional, List

from backend.services.twitch.context_engine import GenerationContext


class PromptConstructor:
    """
    Layer 2: Hybrid Prompt Constructor.
    
    Builds "Mega-Prompts" using the formula:
    [Style Anchor] + [Subject Consistency] + [Meta Context] + [Brand Colors] + [Technical Directives]
    
    NEVER sends raw user text directly to Nano Banana.
    """
    
    MAX_CUSTOM_PROMPT_LENGTH = 500
    
    # Prompt injection patterns to sanitize
    INJECTION_PATTERNS = [
        r'ignore\s+(previous|above|all)',
        r'disregard\s+(previous|above|all)',
        r'forget\s+(previous|above|all)',
        r'system\s*:',
        r'assistant\s*:',
        r'user\s*:',
    ]
    
    QUALITY_DIRECTIVES = "8k, ray-traced, professional quality, highly detailed"
    
    # Tone to style mapping
    TONE_STYLES = {
        "competitive": "dynamic, intense, action-packed",
        "casual": "relaxed, friendly, approachable",
        "educational": "clean, informative, professional",
        "comedic": "playful, fun, colorful",
        "professional": "sleek, modern, corporate",
        "inspirational": "uplifting, bright, motivational",
        "edgy": "dark, bold, dramatic",
        "wholesome": "warm, cozy, inviting",
    }
    
    def build_mega_prompt(
        self,
        context: GenerationContext,
        custom_prompt: Optional[str] = None
    ) -> str:
        """
        Build a complete mega-prompt from context and user input.
        
        Args:
            context: GenerationContext with all brand data
            custom_prompt: Optional user-provided prompt addition
            
        Returns:
            Complete prompt string for Nano Banana
        """
        parts: List[str] = []
        
        # [Style Anchor]
        style_anchor = self._build_style_anchor(context)
        if style_anchor:
            parts.append(style_anchor)
        
        # [Subject Consistency]
        subject_reference = self._build_subject_reference(context)
        if subject_reference:
            parts.append(subject_reference)
        
        # [Meta Context]
        meta_context = self._build_meta_context(context)
        if meta_context:
            parts.append(meta_context)
        
        # [Brand Colors]
        color_directive = self._build_color_directive(context)
        if color_directive:
            parts.append(color_directive)
        
        # [Asset Directive]
        if context.asset_directive:
            parts.append(context.asset_directive)
        
        # [Custom Prompt] - sanitized
        if custom_prompt:
            sanitized = self.sanitize_input(custom_prompt)
            if sanitized:
                parts.append(sanitized)
        
        # [Technical Directives] - always appended
        parts.append(self.QUALITY_DIRECTIVES)
        
        return " | ".join(parts)
    
    def _build_style_anchor(self, context: GenerationContext) -> str:
        """
        Build the style anchor from tone and style reference.
        
        Args:
            context: GenerationContext with tone and style data
            
        Returns:
            Style anchor string
        """
        anchor_parts: List[str] = []
        
        # Add tone-based style
        tone = context.tone.lower() if context.tone else "professional"
        tone_style = self.TONE_STYLES.get(tone, self.TONE_STYLES["professional"])
        anchor_parts.append(tone_style)
        
        # Add style reference if available
        if context.style_reference:
            anchor_parts.append(context.style_reference)
        
        # Add personality traits (limit to first 3)
        if context.personality_traits:
            traits = context.personality_traits[:3]
            anchor_parts.append(", ".join(traits))
        
        return ", ".join(anchor_parts) if anchor_parts else ""
    
    def _build_subject_reference(self, context: GenerationContext) -> str:
        """
        Build subject reference from logo if available.
        
        Args:
            context: GenerationContext with logo data
            
        Returns:
            Subject reference string or empty string
        """
        if context.primary_logo_url:
            return "featuring brand mascot/character consistent with logo"
        return ""
    
    def _build_meta_context(self, context: GenerationContext) -> str:
        """
        Build meta context from game and season data.
        
        Args:
            context: GenerationContext with game/season data
            
        Returns:
            Meta context string or empty string
        """
        meta_parts: List[str] = []
        
        # Add season context
        if context.season_context:
            meta_parts.append(f"themed for {context.season_context}")
        
        # Add game name if available and no season context
        if not context.season_context and context.game_meta:
            game_name = context.game_meta.get("name")
            if game_name:
                meta_parts.append(f"{game_name} themed")
        
        return ", ".join(meta_parts) if meta_parts else ""
    
    def _build_color_directive(self, context: GenerationContext) -> str:
        """
        Build color directive from brand colors.
        
        Includes up to 3 primary colors and 2 accent colors.
        
        Args:
            context: GenerationContext with color data
            
        Returns:
            Color directive string or empty string
        """
        colors: List[str] = []
        
        # Add primary colors (limit to 3)
        for color in context.primary_colors[:3]:
            hex_code = color.get("hex")
            if hex_code:
                colors.append(hex_code)
        
        # Add accent colors (limit to 2)
        for color in context.accent_colors[:2]:
            hex_code = color.get("hex")
            if hex_code:
                colors.append(hex_code)
        
        if colors:
            return f"brand colors: {', '.join(colors)}"
        return ""
    
    def sanitize_input(self, text: Optional[str]) -> str:
        """
        Sanitize user input to prevent prompt injection.
        
        - Truncates to MAX_CUSTOM_PROMPT_LENGTH (500 chars)
        - Removes dangerous characters: <>{}[]\\|`~
        - Removes injection patterns (case insensitive)
        - Normalizes whitespace
        
        Args:
            text: User-provided text to sanitize
            
        Returns:
            Sanitized text string
        """
        if not text:
            return ""
        
        result = text
        
        # Truncate to max length
        result = result[:self.MAX_CUSTOM_PROMPT_LENGTH]
        
        # Remove dangerous characters: <>{}[]\|`~
        dangerous_chars = r'[<>{}\[\]\\|`~]'
        result = re.sub(dangerous_chars, '', result)
        
        # Remove injection patterns (case insensitive)
        for pattern in self.INJECTION_PATTERNS:
            result = re.sub(pattern, '', result, flags=re.IGNORECASE)
        
        # Normalize whitespace (replace multiple spaces/newlines/tabs with single space)
        result = re.sub(r'\s+', ' ', result)
        
        # Strip leading/trailing whitespace
        result = result.strip()
        
        return result
