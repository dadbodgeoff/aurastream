"""
Logo Generation Service for Aurastream.

Handles logo/PFP generation using the vibe-based template system.
Integrates with the prompt engine and generation pipeline.
"""

from dataclasses import dataclass
from typing import Optional
from enum import Enum

from backend.services.prompt_engine import get_prompt_engine
from backend.services.exceptions import ValidationError


class LogoVibe(str, Enum):
    """Available logo generation styles."""
    STUDIO_MINIMALIST = "studio-minimalist"
    COLLECTIBLE = "collectible"
    STEALTH_PRO = "stealth-pro"
    LIQUID_FLOW = "liquid-flow"
    HEAVY_METAL = "heavy-metal"


@dataclass
class LogoGenerationRequest:
    """
    Request parameters for logo generation.
    
    Attributes:
        name: Brand/channel name to include in logo
        icon: Icon type (wolf, dragon, etc.)
        vibe: Style/vibe to use
        background_color: Hex color for background
        user_id: ID of requesting user
    """
    name: str
    icon: str
    vibe: str
    background_color: str
    user_id: str


@dataclass
class LogoGenerationResult:
    """
    Result of logo generation.
    
    Attributes:
        prompt: The generated prompt
        dimensions: Width/height dict
        vibe_name: Human-readable vibe name
    """
    prompt: str
    dimensions: dict
    vibe_name: str


# Valid icon options
VALID_ICONS = {
    "wolf", "dragon", "phoenix", "lion", "eagle", "skull", "crown",
    "lightning bolt", "flame", "sword", "shield", "star", "moon", "sun",
    "crystal", "diamond", "heart", "controller", "headset", "keyboard",
    "cat", "fox", "bear", "owl", "raven", "snake", "tiger", "panther",
    "robot", "alien", "ninja", "samurai", "knight", "wizard", "demon", "angel"
}

# Valid vibes
VALID_VIBES = {v.value for v in LogoVibe}


def validate_hex_color(color: str) -> bool:
    """Validate hex color format."""
    if not color:
        return False
    if not color.startswith('#'):
        return False
    if len(color) not in (4, 7):  # #RGB or #RRGGBB
        return False
    try:
        int(color[1:], 16)
        return True
    except ValueError:
        return False


class LogoGenerationService:
    """
    Service for generating logo/PFP assets.
    
    Provides:
    - Vibe selection and validation
    - Prompt building with user inputs
    - Integration with generation pipeline
    """
    
    def __init__(self):
        self.prompt_engine = get_prompt_engine()
    
    def get_available_vibes(self) -> list[dict]:
        """
        Get all available logo vibes for UI display.
        
        Returns:
            List of vibe info with key, name, description
        """
        return self.prompt_engine.get_logo_vibes()
    
    def get_form_schema(self) -> list[dict]:
        """
        Get the form schema for logo generation UI.
        
        Returns:
            List of placeholder definitions for form generation
        """
        return self.prompt_engine.get_logo_placeholders()
    
    def validate_request(self, request: LogoGenerationRequest) -> list[str]:
        """
        Validate a logo generation request.
        
        Args:
            request: The generation request
            
        Returns:
            List of validation error messages (empty if valid)
        """
        errors = []
        
        # Validate name
        if not request.name or len(request.name.strip()) == 0:
            errors.append("Brand name is required")
        elif len(request.name) > 50:
            errors.append("Brand name must be 50 characters or less")
        
        # Validate icon
        if not request.icon:
            errors.append("Icon selection is required")
        elif request.icon.lower() not in VALID_ICONS:
            errors.append(f"Invalid icon: {request.icon}")
        
        # Validate vibe
        if not request.vibe:
            errors.append("Style selection is required")
        elif request.vibe not in VALID_VIBES:
            errors.append(f"Invalid style: {request.vibe}")
        
        # Validate background color
        if not request.background_color:
            errors.append("Background color is required")
        elif not validate_hex_color(request.background_color):
            errors.append("Invalid background color format (use #RRGGBB)")
        
        return errors
    
    def build_prompt(self, request: LogoGenerationRequest) -> LogoGenerationResult:
        """
        Build the generation prompt from a validated request.
        
        Args:
            request: Validated logo generation request
            
        Returns:
            LogoGenerationResult with prompt and metadata
            
        Raises:
            ValidationError: If request is invalid
        """
        # Validate first
        errors = self.validate_request(request)
        if errors:
            raise ValidationError(
                message="Invalid logo generation request",
                details={"errors": errors}
            )
        
        # Build prompt
        prompt = self.prompt_engine.build_logo_prompt(
            vibe=request.vibe,
            name=request.name,
            icon=request.icon,
            background_color=request.background_color
        )
        
        # Get vibe info
        vibes = self.get_available_vibes()
        vibe_info = next((v for v in vibes if v["key"] == request.vibe), None)
        vibe_name = vibe_info["name"] if vibe_info else request.vibe
        
        return LogoGenerationResult(
            prompt=prompt,
            dimensions={"width": 512, "height": 512},
            vibe_name=vibe_name
        )


# Singleton
_logo_service: Optional[LogoGenerationService] = None


def get_logo_generation_service() -> LogoGenerationService:
    """Get or create the logo generation service singleton."""
    global _logo_service
    if _logo_service is None:
        _logo_service = LogoGenerationService()
    return _logo_service
