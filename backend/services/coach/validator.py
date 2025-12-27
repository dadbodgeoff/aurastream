"""
Output Validator for Prompt Coach.

Validates Coach output before user attempts generation.
Catches issues like:
- Missing required elements (subject, style)
- Conflicting instructions
- Unsupported features for asset type
- Brand kit mismatches
- Prompt too vague or too long

Quality score calculation: 1.0 - (errors * 0.3) - (warnings * 0.1)
"""

from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from enum import Enum


class ValidationSeverity(str, Enum):
    """Severity levels for validation issues."""
    ERROR = "error"      # Will fail generation
    WARNING = "warning"  # Might produce poor results
    INFO = "info"        # Suggestion for improvement


@dataclass
class ValidationIssue:
    """Single validation issue."""
    severity: ValidationSeverity
    code: str
    message: str
    suggestion: Optional[str] = None
    auto_fixable: bool = False


@dataclass
class ValidationResult:
    """Result of prompt validation."""
    is_valid: bool
    is_generation_ready: bool
    issues: List[ValidationIssue]
    fixed_prompt: Optional[str] = None
    quality_score: float = 0.0


class OutputValidator:
    """
    Validates Coach output before user attempts generation.
    
    Catches issues like:
    - Missing required elements (subject, style)
    - Conflicting instructions
    - Unsupported features for asset type
    - Brand kit mismatches
    - Prompt too vague or too long
    """
    
    # Required elements by asset type
    REQUIRED_ELEMENTS = {
        "twitch_emote": ["subject", "emotion_or_action"],
        "youtube_thumbnail": ["subject", "mood", "composition"],
        "twitch_badge": ["icon_element"],
        "twitch_banner": ["subject", "composition"],
        "overlay": ["layout", "style"],
        "story_graphic": ["subject", "mood"],
        "default": ["subject"],
    }

    # Element indicators for detection
    ELEMENT_INDICATORS = {
        "subject": [
            "character", "person", "mascot", "logo", "icon", "object",
            "face", "figure", "avatar", "creature", "animal", "hero",
            "player", "gamer", "streamer"
        ],
        "emotion_or_action": [
            "happy", "sad", "angry", "excited", "waving", "jumping",
            "laughing", "crying", "celebrating", "dancing", "pointing",
            "shocked", "surprised", "smiling", "frowning", "rage",
            "victory", "defeat", "thinking", "confused"
        ],
        "mood": [
            "energetic", "calm", "intense", "cozy", "dramatic", "playful",
            "dark", "bright", "mysterious", "epic", "chill", "hype",
            "nostalgic", "futuristic", "retro", "modern"
        ],
        "composition": [
            "close-up", "wide shot", "centered", "dynamic", "action",
            "portrait", "landscape", "split", "diagonal", "symmetrical",
            "rule of thirds", "focal point", "negative space"
        ],
        "icon_element": [
            "crown", "star", "heart", "badge", "symbol", "emblem",
            "shield", "sword", "trophy", "medal", "gem", "diamond",
            "flame", "lightning", "skull", "wings"
        ],
        "layout": [
            "border", "frame", "panel", "grid", "overlay", "corner",
            "header", "footer", "sidebar", "centered", "floating"
        ],
        "style": [
            "minimalist", "detailed", "cartoon", "realistic", "anime",
            "pixel art", "3d", "flat", "gradient", "neon", "vintage",
            "modern", "retro", "cyberpunk", "fantasy"
        ],
    }
    
    # Conflicting term pairs
    CONFLICTS = [
        (["minimalist", "simple", "clean"], ["detailed", "complex", "intricate", "busy"]),
        (["dark", "moody", "shadowy"], ["bright", "vibrant", "neon", "glowing"]),
        (["realistic", "photorealistic", "lifelike"], ["cartoon", "anime", "stylized", "abstract"]),
        (["vintage", "retro", "old-school"], ["modern", "futuristic", "contemporary"]),
        (["calm", "peaceful", "serene"], ["intense", "aggressive", "chaotic"]),
    ]
    
    MAX_PROMPT_LENGTH = 500
    MIN_PROMPT_LENGTH = 10
    
    def __init__(self, brand_kit: Optional[Dict[str, Any]] = None):
        """
        Initialize the validator.
        
        Args:
            brand_kit: Optional brand kit data for alignment checking
        """
        self.brand_kit = brand_kit
    
    def validate(
        self,
        prompt: str,
        asset_type: str,
        context: Optional[Dict[str, Any]] = None
    ) -> ValidationResult:
        """
        Validate a prompt for generation readiness.
        
        Args:
            prompt: The prompt to validate
            asset_type: Target asset type
            context: Additional context (brand kit, etc.)
            
        Returns:
            ValidationResult with issues and suggestions
        """
        issues: List[ValidationIssue] = []
        
        # Update brand kit from context if provided
        if context and "brand_kit" in context:
            self.brand_kit = context["brand_kit"]
        
        # Length checks
        issues.extend(self._check_length(prompt))
        
        # Required elements check
        issues.extend(self._check_required_elements(prompt, asset_type))
        
        # Conflict detection
        issues.extend(self._detect_conflicts(prompt))
        
        # Asset type compatibility
        issues.extend(self._check_asset_compatibility(prompt, asset_type))
        
        # Brand kit alignment (if provided)
        if self.brand_kit:
            issues.extend(self._check_brand_alignment(prompt))
        
        # Calculate quality score
        error_count = len([i for i in issues if i.severity == ValidationSeverity.ERROR])
        warning_count = len([i for i in issues if i.severity == ValidationSeverity.WARNING])
        quality_score = max(0.0, 1.0 - (error_count * 0.3) - (warning_count * 0.1))
        
        # Auto-fix if possible
        fixed_prompt = self._auto_fix(prompt, issues) if any(i.auto_fixable for i in issues) else None
        
        return ValidationResult(
            is_valid=error_count == 0,
            is_generation_ready=error_count == 0 and warning_count <= 2,
            issues=issues,
            fixed_prompt=fixed_prompt,
            quality_score=round(quality_score, 2),
        )

    def _check_length(self, prompt: str) -> List[ValidationIssue]:
        """Check prompt length constraints."""
        issues = []
        
        if len(prompt) < self.MIN_PROMPT_LENGTH:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="PROMPT_TOO_SHORT",
                message="Prompt is too vague. Add more detail about what you want.",
                suggestion="Describe the subject, style, and mood you're going for.",
            ))
        
        if len(prompt) > self.MAX_PROMPT_LENGTH:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="PROMPT_TOO_LONG",
                message=f"Prompt exceeds {self.MAX_PROMPT_LENGTH} characters. May be truncated.",
                suggestion="Focus on the most important elements.",
                auto_fixable=True,
            ))
        
        return issues
    
    def _check_required_elements(self, prompt: str, asset_type: str) -> List[ValidationIssue]:
        """Check for missing required elements."""
        issues = []
        prompt_lower = prompt.lower()
        
        required = self.REQUIRED_ELEMENTS.get(asset_type, self.REQUIRED_ELEMENTS["default"])
        
        for element in required:
            indicators = self.ELEMENT_INDICATORS.get(element, [])
            
            # Check if any indicator is present
            found = any(ind in prompt_lower for ind in indicators)
            
            # Also check if element name itself is present
            if not found:
                element_name = element.replace("_", " ")
                found = element_name in prompt_lower
            
            if not found:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    code="MISSING_ELEMENT",
                    message=f"Missing recommended element: {element.replace('_', ' ')}",
                    suggestion=f"Consider adding a {element.replace('_', ' ')} to your prompt.",
                ))
        
        return issues
    
    def _detect_conflicts(self, prompt: str) -> List[ValidationIssue]:
        """Detect conflicting style terms."""
        issues = []
        prompt_lower = prompt.lower()
        
        for group_a, group_b in self.CONFLICTS:
            found_a = [t for t in group_a if t in prompt_lower]
            found_b = [t for t in group_b if t in prompt_lower]
            
            if found_a and found_b:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    code="CONFLICTING_TERMS",
                    message=f"Conflicting terms: '{found_a[0]}' vs '{found_b[0]}'",
                    suggestion="Choose one style direction for better results.",
                ))
        
        return issues
    
    def _check_asset_compatibility(self, prompt: str, asset_type: str) -> List[ValidationIssue]:
        """Check if prompt is compatible with asset type."""
        issues = []
        prompt_lower = prompt.lower()
        
        # Emotes shouldn't have complex backgrounds
        if asset_type in ["twitch_emote", "twitch_badge"]:
            background_terms = ["background", "landscape", "scene", "environment", "setting"]
            if any(term in prompt_lower for term in background_terms):
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.INFO,
                    code="EMOTE_BACKGROUND",
                    message="Emotes work best with simple/no backgrounds.",
                    suggestion="Focus on the character/icon. Background will be removed.",
                ))
            
            # Check for text in emotes (usually bad)
            text_terms = ["text", "words", "letters", "writing", "caption"]
            if any(term in prompt_lower for term in text_terms):
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    code="EMOTE_TEXT",
                    message="Text in emotes is hard to read at small sizes.",
                    suggestion="Emotes are viewed at 28x28 pixels. Avoid text.",
                ))
        
        # Thumbnails need high contrast
        if asset_type == "youtube_thumbnail":
            low_contrast_terms = ["subtle", "muted", "soft", "pastel", "faded"]
            if any(term in prompt_lower for term in low_contrast_terms):
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    code="THUMBNAIL_LOW_CONTRAST",
                    message="Thumbnails need high contrast to stand out.",
                    suggestion="Use bold colors and clear subjects for better CTR.",
                ))
        
        # Banners need horizontal composition
        if asset_type == "twitch_banner":
            vertical_terms = ["portrait", "vertical", "tall"]
            if any(term in prompt_lower for term in vertical_terms):
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    code="BANNER_ORIENTATION",
                    message="Banners are horizontal. Vertical compositions may not work well.",
                    suggestion="Use horizontal or landscape-oriented compositions.",
                ))
        
        return issues

    def _check_brand_alignment(self, prompt: str) -> List[ValidationIssue]:
        """Check if prompt aligns with brand kit."""
        issues = []
        prompt_lower = prompt.lower()
        
        if not self.brand_kit:
            return issues
        
        # Get brand colors
        colors = self.brand_kit.get("colors", [])
        if isinstance(colors, list) and colors:
            color_names = []
            for c in colors:
                if isinstance(c, dict) and "name" in c:
                    color_names.append(c["name"].lower())
            
            # Check for conflicting colors not in brand palette
            common_colors = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "black", "white"]
            for color in common_colors:
                if color in prompt_lower and color not in " ".join(color_names):
                    # Only flag if it seems like a color specification
                    color_context_terms = [f"{color} color", f"{color} theme", f"using {color}", f"with {color}"]
                    if any(term in prompt_lower for term in color_context_terms):
                        issues.append(ValidationIssue(
                            severity=ValidationSeverity.INFO,
                            code="OFF_BRAND_COLOR",
                            message=f"'{color}' isn't in your brand palette.",
                            suggestion=f"Consider using your brand colors: {', '.join(color_names[:3])}",
                        ))
                        break
        
        return issues
    
    def _auto_fix(self, prompt: str, issues: List[ValidationIssue]) -> Optional[str]:
        """Apply auto-fixes where possible."""
        fixed = prompt
        
        for issue in issues:
            if not issue.auto_fixable:
                continue
            
            if issue.code == "PROMPT_TOO_LONG":
                # Truncate to max length, trying to end at a word boundary
                if len(fixed) > self.MAX_PROMPT_LENGTH:
                    truncated = fixed[:self.MAX_PROMPT_LENGTH]
                    # Find last space to avoid cutting words
                    last_space = truncated.rfind(" ")
                    if last_space > self.MAX_PROMPT_LENGTH - 50:
                        fixed = truncated[:last_space]
                    else:
                        fixed = truncated
        
        return fixed if fixed != prompt else None


# Singleton instance
_validator: Optional[OutputValidator] = None


def get_validator(brand_kit: Optional[Dict[str, Any]] = None) -> OutputValidator:
    """Get or create the validator singleton."""
    global _validator
    if _validator is None or brand_kit is not None:
        _validator = OutputValidator(brand_kit=brand_kit)
    return _validator


__all__ = [
    "ValidationSeverity",
    "ValidationIssue",
    "ValidationResult",
    "OutputValidator",
    "get_validator",
]
