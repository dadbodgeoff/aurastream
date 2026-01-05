"""
Output Validator for Prompt Coach.

Validates Coach output before user attempts generation.
Quality score: 1.0 - (errors * 0.3) - (warnings * 0.1)
"""

from dataclasses import dataclass
from typing import List, Optional, Dict, Any

from backend.services.coach.core.types import ValidationSeverity


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
    """Validates Coach output before generation."""

    # Required elements by asset type
    REQUIRED_ELEMENTS: Dict[str, List[str]] = {
        "twitch_emote": ["subject", "emotion_or_action"],
        "youtube_thumbnail": ["subject", "mood"],
        "twitch_badge": ["icon_element"],
        "twitch_banner": ["subject"],
        "overlay": ["layout"],
        "default": ["subject"],
    }

    # Element indicators
    ELEMENT_INDICATORS: Dict[str, List[str]] = {
        "subject": ["character", "person", "mascot", "logo", "icon", "face", "avatar"],
        "emotion_or_action": [
            "happy",
            "sad",
            "angry",
            "excited",
            "waving",
            "jumping",
            "laughing",
        ],
        "mood": [
            "energetic",
            "calm",
            "intense",
            "cozy",
            "dramatic",
            "playful",
            "dark",
            "bright",
        ],
        "icon_element": [
            "crown",
            "star",
            "heart",
            "badge",
            "symbol",
            "shield",
            "trophy",
        ],
        "layout": ["border", "frame", "panel", "grid", "overlay", "corner"],
    }

    # Conflicting terms
    CONFLICTS = [
        (["minimalist", "simple"], ["detailed", "complex", "intricate"]),
        (["dark", "moody"], ["bright", "vibrant", "colorful"]),
        (["realistic"], ["cartoon", "anime", "pixel art"]),
    ]

    # Length constraints
    MIN_LENGTH = 10
    MAX_LENGTH = 500

    def validate(
        self,
        description: str,
        asset_type: str,
        brand_context: Optional[Dict[str, Any]] = None,
    ) -> ValidationResult:
        """Validate a description for generation."""
        issues: List[ValidationIssue] = []
        desc_lower = description.lower()

        # Length check
        if len(description) < self.MIN_LENGTH:
            issues.append(
                ValidationIssue(
                    severity="error",
                    code="too_short",
                    message=f"Description too short (min {self.MIN_LENGTH} chars)",
                    suggestion="Add more detail about what you want to create",
                )
            )
        elif len(description) > self.MAX_LENGTH:
            issues.append(
                ValidationIssue(
                    severity="warning",
                    code="too_long",
                    message=f"Description may be too long ({len(description)} chars)",
                    suggestion="Consider simplifying",
                    auto_fixable=True,
                )
            )

        # Required elements
        required = self.REQUIRED_ELEMENTS.get(
            asset_type, self.REQUIRED_ELEMENTS["default"]
        )
        for element in required:
            if not self._has_element(desc_lower, element):
                issues.append(
                    ValidationIssue(
                        severity="warning",
                        code=f"missing_{element}",
                        message=f"Missing {element.replace('_', ' ')}",
                        suggestion=f"Consider adding a {element.replace('_', ' ')}",
                    )
                )

        # Conflicts
        for group_a, group_b in self.CONFLICTS:
            has_a = any(term in desc_lower for term in group_a)
            has_b = any(term in desc_lower for term in group_b)
            if has_a and has_b:
                issues.append(
                    ValidationIssue(
                        severity="warning",
                        code="conflicting_terms",
                        message=f"Conflicting terms: {group_a[0]} vs {group_b[0]}",
                        suggestion="Choose one style direction",
                    )
                )

        # Calculate quality score
        errors = sum(1 for i in issues if i.severity == "error")
        warnings = sum(1 for i in issues if i.severity == "warning")
        quality_score = max(0.0, 1.0 - (errors * 0.3) - (warnings * 0.1))

        return ValidationResult(
            is_valid=errors == 0,
            is_generation_ready=errors == 0 and quality_score >= 0.5,
            issues=issues,
            quality_score=round(quality_score, 2),
        )

    def _has_element(self, text: str, element: str) -> bool:
        """Check if text contains indicators for an element."""
        indicators = self.ELEMENT_INDICATORS.get(element, [])
        return any(ind in text for ind in indicators)


# Singleton
_validator: Optional[OutputValidator] = None


def get_validator() -> OutputValidator:
    """Get or create the validator singleton."""
    global _validator
    if _validator is None:
        _validator = OutputValidator()
    return _validator


__all__ = [
    "ValidationIssue",
    "ValidationResult",
    "OutputValidator",
    "get_validator",
]
