"""
Creator Media Library Prompt Injector.

Handles formatting media assets for injection into generation prompts.
Provides context-aware prompt text generation based on asset type and metadata.
"""

import logging
from typing import List, Dict, Any, Optional

from backend.services.creator_media.constants import MediaAssetType
from backend.services.creator_media.models import MediaForPromptModel

logger = logging.getLogger(__name__)


class PromptInjector:
    """
    Formats media assets for prompt injection.
    
    Responsibilities:
    - Generate prompt context strings from assets
    - Build composite prompt sections from multiple assets
    - Handle type-specific metadata formatting
    """
    
    def format_asset(self, asset: MediaForPromptModel) -> str:
        """
        Generate prompt context string for a single asset.
        
        Args:
            asset: MediaForPromptModel to format
            
        Returns:
            Formatted prompt context string
        """
        context_parts = [f"[{asset.asset_type.upper()}] {asset.display_name}"]
        
        # Type-specific metadata formatting
        if asset.asset_type == "face":
            self._add_face_context(context_parts, asset.metadata)
        elif asset.asset_type == "character":
            self._add_character_context(context_parts, asset.metadata)
        elif asset.asset_type == "game_skin":
            self._add_game_skin_context(context_parts, asset.metadata)
        elif asset.asset_type == "logo":
            self._add_logo_context(context_parts, asset.metadata)
        elif asset.asset_type == "background":
            self._add_background_context(context_parts, asset.metadata)
        elif asset.asset_type == "reference":
            self._add_reference_context(context_parts, asset.metadata)
        elif asset.asset_type == "object":
            self._add_object_context(context_parts, asset.metadata)
        
        return " | ".join(context_parts)
    
    def _add_face_context(self, parts: List[str], metadata: Dict[str, Any]) -> None:
        """Add face-specific context."""
        if metadata.get("expression"):
            parts.append(f"Expression: {metadata['expression']}")
        if metadata.get("angle"):
            parts.append(f"Angle: {metadata['angle']}")
    
    def _add_character_context(self, parts: List[str], metadata: Dict[str, Any]) -> None:
        """Add character-specific context."""
        if metadata.get("style"):
            parts.append(f"Style: {metadata['style']}")
        if metadata.get("outfit"):
            parts.append(f"Outfit: {metadata['outfit']}")
        if metadata.get("pose"):
            parts.append(f"Pose: {metadata['pose']}")
    
    def _add_game_skin_context(self, parts: List[str], metadata: Dict[str, Any]) -> None:
        """Add game skin-specific context."""
        if metadata.get("game"):
            parts.append(f"Game: {metadata['game']}")
        if metadata.get("character_name"):
            parts.append(f"Character: {metadata['character_name']}")
        if metadata.get("skin_name"):
            parts.append(f"Skin: {metadata['skin_name']}")
    
    def _add_logo_context(self, parts: List[str], metadata: Dict[str, Any]) -> None:
        """Add logo-specific context."""
        if metadata.get("logo_variant"):
            parts.append(f"Variant: {metadata['logo_variant']}")
        if metadata.get("transparent"):
            parts.append("Transparent background")
    
    def _add_background_context(self, parts: List[str], metadata: Dict[str, Any]) -> None:
        """Add background-specific context."""
        if metadata.get("style"):
            parts.append(f"Style: {metadata['style']}")
        if metadata.get("mood"):
            parts.append(f"Mood: {metadata['mood']}")
    
    def _add_reference_context(self, parts: List[str], metadata: Dict[str, Any]) -> None:
        """Add reference-specific context."""
        if metadata.get("source"):
            parts.append(f"Source: {metadata['source']}")
        if metadata.get("notes"):
            parts.append(f"Notes: {metadata['notes']}")
    
    def _add_object_context(self, parts: List[str], metadata: Dict[str, Any]) -> None:
        """Add object-specific context."""
        if metadata.get("category"):
            parts.append(f"Category: {metadata['category']}")
        if metadata.get("transparent"):
            parts.append("Transparent background")
    
    def build_prompt_section(
        self,
        assets: List[MediaForPromptModel],
        section_title: str = "User Assets"
    ) -> str:
        """
        Build a complete prompt section from multiple assets.
        
        Uses processed (transparent) URLs when available for better compositing.
        
        Args:
            assets: List of assets to include
            section_title: Title for the section
            
        Returns:
            Formatted prompt section string
        """
        if not assets:
            return ""
        
        lines = [f"## {section_title}"]
        lines.append("The following user-provided assets should be incorporated:")
        lines.append("")
        
        for asset in assets:
            lines.append(f"- {self.format_asset(asset)}")
            # Use best URL (processed if available, otherwise original)
            lines.append(f"  URL: {asset.get_best_url()}")
        
        lines.append("")
        return "\n".join(lines)
    
    def build_injection_context(
        self,
        face: Optional[MediaForPromptModel] = None,
        logo: Optional[MediaForPromptModel] = None,
        character: Optional[MediaForPromptModel] = None,
        background: Optional[MediaForPromptModel] = None,
        references: Optional[List[MediaForPromptModel]] = None,
        objects: Optional[List[MediaForPromptModel]] = None,
        game_skin: Optional[MediaForPromptModel] = None,
    ) -> Dict[str, Any]:
        """
        Build structured injection context for generation service.
        
        Args:
            face: Face asset to inject
            logo: Logo asset to inject
            character: Character asset to inject
            background: Background asset to inject
            references: Reference images to inject
            objects: Object assets to inject
            game_skin: Game skin asset to inject
            
        Returns:
            Dictionary with structured injection data
        """
        context = {
            "has_injections": False,
            "assets": [],
            "prompt_additions": [],
        }
        
        # Process each asset type - use get_best_url() for transparent compositing
        if face:
            context["has_injections"] = True
            context["assets"].append(face.to_dict())
            context["prompt_additions"].append(
                f"Include the user's face from: {face.get_best_url()}"
            )
        
        if logo:
            context["has_injections"] = True
            context["assets"].append(logo.to_dict())
            context["prompt_additions"].append(
                f"Include the user's logo from: {logo.get_best_url()}"
            )
        
        if character:
            context["has_injections"] = True
            context["assets"].append(character.to_dict())
            context["prompt_additions"].append(
                f"Use the user's character style from: {character.get_best_url()}"
            )
        
        if background:
            context["has_injections"] = True
            context["assets"].append(background.to_dict())
            # Background uses original URL (not processed)
            context["prompt_additions"].append(
                f"Use the background from: {background.url}"
            )
        
        if game_skin:
            context["has_injections"] = True
            context["assets"].append(game_skin.to_dict())
            context["prompt_additions"].append(
                f"Include the game skin/character from: {game_skin.get_best_url()}"
            )
        
        if references:
            context["has_injections"] = True
            for ref in references:
                context["assets"].append(ref.to_dict())
                # References use original URL (not processed)
                context["prompt_additions"].append(
                    f"Reference style from: {ref.url}"
                )
        
        if objects:
            context["has_injections"] = True
            for obj in objects:
                context["assets"].append(obj.to_dict())
                context["prompt_additions"].append(
                    f"Include object '{obj.display_name}' from: {obj.get_best_url()}"
                )
        
        return context


# ============================================================================
# Singleton
# ============================================================================

_prompt_injector: Optional[PromptInjector] = None


def get_prompt_injector() -> PromptInjector:
    """Get or create prompt injector singleton."""
    global _prompt_injector
    if _prompt_injector is None:
        _prompt_injector = PromptInjector()
    return _prompt_injector
