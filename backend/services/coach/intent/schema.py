"""
Creative Intent Schema - Enterprise Intent Parameter System

This module defines the structured schema for creative intent extraction
and validation. The coach uses this schema to track what information has
been gathered and what's still needed before generation can proceed.

Design Principles:
1. Intent-driven, not turn-driven - readiness is based on filled parameters
2. Clear distinction between RENDER content and DISPLAY text
3. User confirmation required for ambiguous elements
4. Progressive refinement - each turn should fill or confirm parameters

Intent Categories:
- SCENE: What to render (characters, actions, backgrounds)
- TEXT: What to display as actual text on the image
- STYLE: Visual style, mood, effects
- COMPOSITION: Layout, positioning, focal points

The coach should NEVER mark ready until:
1. All REQUIRED parameters are filled
2. Ambiguous annotations are clarified (render vs display)
3. User has confirmed the final vision

Author: AuraStream Engineering
Version: 1.0.0
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Literal
from enum import Enum
import re
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# Enums and Types
# =============================================================================


class IntentParameterStatus(str, Enum):
    """Status of an intent parameter."""

    EMPTY = "empty"  # Not yet provided
    INFERRED = "inferred"  # Extracted from context, needs confirmation
    CONFIRMED = "confirmed"  # Explicitly confirmed by user
    AMBIGUOUS = "ambiguous"  # Needs clarification (e.g., render vs text)


class AnnotationType(str, Enum):
    """Type of canvas annotation."""

    SCENE_DESCRIPTION = "scene_description"  # Describes what to RENDER
    DISPLAY_TEXT = "display_text"  # Actual text to DISPLAY
    AMBIGUOUS = "ambiguous"  # Needs user clarification


class IntentReadiness(str, Enum):
    """Overall readiness state for generation."""

    NOT_READY = "not_ready"  # Missing required parameters
    NEEDS_CLARIFICATION = "needs_clarification"  # Has ambiguous elements
    NEEDS_CONFIRMATION = "needs_confirmation"  # All filled, awaiting user OK
    READY = "ready"  # Confirmed and ready to generate


# =============================================================================
# Intent Parameter Models
# =============================================================================


@dataclass
class SceneElement:
    """
    A single element to be RENDERED in the scene.

    This is NOT text to display - it's something for Nano Banana to generate.
    Examples: "Omega skin in battle pose", "explosion effect", "neon glow"
    """

    description: str
    element_type: Literal["character", "object", "effect", "background", "action"]
    status: IntentParameterStatus = IntentParameterStatus.INFERRED
    # Where this came from: user_input, canvas_annotation, coach_suggestion
    source: str = "user_input"
    position_hint: Optional[str] = None  # e.g., "center-left", "background"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "description": self.description,
            "element_type": self.element_type,
            "status": self.status.value,
            "source": self.source,
            "position_hint": self.position_hint,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SceneElement":
        return cls(
            description=data["description"],
            element_type=data["element_type"],
            status=IntentParameterStatus(data.get("status", "inferred")),
            source=data.get("source", "user_input"),
            position_hint=data.get("position_hint"),
        )


@dataclass
class DisplayText:
    """
    Actual text to be DISPLAYED on the image.

    This is literal text that will appear on the final asset.
    Examples: "The BEST Shotgun EVER?", "Subscribe!", "EPIC WIN"
    """

    text: str
    status: IntentParameterStatus = IntentParameterStatus.INFERRED
    spelling_confirmed: bool = False
    style_hint: Optional[str] = None  # e.g., "bold", "neon glow", "white with shadow"
    position_hint: Optional[str] = None  # e.g., "top-center", "bottom"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "status": self.status.value,
            "spelling_confirmed": self.spelling_confirmed,
            "style_hint": self.style_hint,
            "position_hint": self.position_hint,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DisplayText":
        return cls(
            text=data["text"],
            status=IntentParameterStatus(data.get("status", "inferred")),
            spelling_confirmed=data.get("spelling_confirmed", False),
            style_hint=data.get("style_hint"),
            position_hint=data.get("position_hint"),
        )


@dataclass
class AmbiguousAnnotation:
    """
    An annotation that needs clarification - is it a scene description or display text?

    Examples that need clarification:
    - "Omega fighting Ikonik" - probably scene description
    - "Pump here" - could be either
    - "Add explosion" - definitely scene description
    """

    original_text: str
    likely_type: AnnotationType
    confidence: float  # 0.0-1.0, how confident we are in likely_type
    clarification_question: str  # Question to ask user
    resolved: bool = False
    resolved_as: Optional[AnnotationType] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "original_text": self.original_text,
            "likely_type": self.likely_type.value,
            "confidence": self.confidence,
            "clarification_question": self.clarification_question,
            "resolved": self.resolved,
            "resolved_as": self.resolved_as.value if self.resolved_as else None,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AmbiguousAnnotation":
        return cls(
            original_text=data["original_text"],
            likely_type=AnnotationType(data["likely_type"]),
            confidence=data["confidence"],
            clarification_question=data["clarification_question"],
            resolved=data.get("resolved", False),
            resolved_as=AnnotationType(data["resolved_as"])
            if data.get("resolved_as")
            else None,
        )


@dataclass
class StyleParameters:
    """Visual style parameters for the generation."""

    mood: Optional[str] = None  # hype, cozy, dramatic, etc.
    mood_status: IntentParameterStatus = IntentParameterStatus.EMPTY

    effects: List[str] = field(default_factory=list)  # glow, lens flare, etc.
    color_scheme: Optional[str] = None  # from brand kit or user preference
    lighting: Optional[str] = None  # dramatic, soft, neon, etc.

    def to_dict(self) -> Dict[str, Any]:
        return {
            "mood": self.mood,
            "mood_status": self.mood_status.value,
            "effects": self.effects,
            "color_scheme": self.color_scheme,
            "lighting": self.lighting,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "StyleParameters":
        return cls(
            mood=data.get("mood"),
            mood_status=IntentParameterStatus(data.get("mood_status", "empty")),
            effects=data.get("effects", []),
            color_scheme=data.get("color_scheme"),
            lighting=data.get("lighting"),
        )


# =============================================================================
# Main Intent Schema
# =============================================================================


@dataclass
class CreativeIntentSchema:
    """
    Complete creative intent schema for a generation request.

    This schema tracks ALL parameters needed for generation and their status.
    The coach uses this to determine what questions to ask and when
    generation is ready.

    Readiness Rules:
    1. At least one scene_element OR one display_text must be CONFIRMED
    2. All ambiguous_annotations must be resolved
    3. User must have explicitly confirmed the final vision
    4. First turn can NEVER be ready (must have user confirmation)
    """

    # Core content
    scene_elements: List[SceneElement] = field(default_factory=list)
    display_texts: List[DisplayText] = field(default_factory=list)
    ambiguous_annotations: List[AmbiguousAnnotation] = field(default_factory=list)

    # Style
    style: StyleParameters = field(default_factory=StyleParameters)

    # Context
    asset_type: Optional[str] = None
    game_context: Optional[str] = None
    brand_context: Optional[Dict[str, Any]] = None

    # Confirmation tracking
    user_confirmed_vision: bool = False
    confirmation_turn: Optional[int] = None  # Which turn user confirmed on

    # Metadata
    turn_count: int = 0
    last_coach_summary: Optional[str] = None  # Coach's last summary of the vision

    def get_readiness(self) -> IntentReadiness:
        """
        Determine the current readiness state.

        Returns:
            IntentReadiness enum indicating current state
        """
        # Rule 1: First turn can never be ready
        if self.turn_count < 1:
            return IntentReadiness.NOT_READY

        # Rule 2: Must have at least one confirmed content element
        has_confirmed_scene = any(
            e.status == IntentParameterStatus.CONFIRMED for e in self.scene_elements
        )
        has_confirmed_text = any(
            t.status == IntentParameterStatus.CONFIRMED for t in self.display_texts
        )

        if not has_confirmed_scene and not has_confirmed_text:
            # Check if we have inferred elements that need confirmation
            has_inferred = any(
                e.status == IntentParameterStatus.INFERRED for e in self.scene_elements
            ) or any(
                t.status == IntentParameterStatus.INFERRED for t in self.display_texts
            )
            if has_inferred:
                return IntentReadiness.NEEDS_CONFIRMATION
            return IntentReadiness.NOT_READY

        # Rule 3: All ambiguous annotations must be resolved
        unresolved = [a for a in self.ambiguous_annotations if not a.resolved]
        if unresolved:
            return IntentReadiness.NEEDS_CLARIFICATION

        # Rule 4: User must have confirmed the vision
        if not self.user_confirmed_vision:
            return IntentReadiness.NEEDS_CONFIRMATION

        return IntentReadiness.READY

    def is_ready(self) -> bool:
        """Check if ready for generation."""
        return self.get_readiness() == IntentReadiness.READY

    def get_missing_info(self) -> List[str]:
        """Get list of what's still needed."""
        missing = []

        if not self.scene_elements and not self.display_texts:
            missing.append("No content defined - need scene elements or display text")

        unresolved = [a for a in self.ambiguous_annotations if not a.resolved]
        for a in unresolved:
            missing.append(f"Clarification needed: {a.clarification_question}")

        if not self.user_confirmed_vision:
            missing.append("User confirmation of final vision")

        return missing

    def get_clarification_questions(self) -> List[str]:
        """Get questions that need to be asked."""
        questions = []

        for a in self.ambiguous_annotations:
            if not a.resolved:
                questions.append(a.clarification_question)

        # Check for unconfirmed display text spelling
        for t in self.display_texts:
            if not t.spelling_confirmed and t.status != IntentParameterStatus.CONFIRMED:
                questions.append(f'Is the spelling "{t.text}" correct?')

        return questions

    def to_generation_description(self) -> str:
        """
        Convert the intent to a description for Nano Banana.

        This combines all confirmed elements into a coherent description
        that the generation service can use.
        """
        parts = []

        # Add scene elements
        for elem in self.scene_elements:
            if elem.status in [
                IntentParameterStatus.CONFIRMED,
                IntentParameterStatus.INFERRED,
            ]:
                if elem.position_hint:
                    parts.append(f"{elem.description} ({elem.position_hint})")
                else:
                    parts.append(elem.description)

        # Add display text
        for text in self.display_texts:
            if text.status in [
                IntentParameterStatus.CONFIRMED,
                IntentParameterStatus.INFERRED,
            ]:
                text_desc = f'with text "{text.text}"'
                if text.style_hint:
                    text_desc += f" in {text.style_hint}"
                if text.position_hint:
                    text_desc += f" at {text.position_hint}"
                parts.append(text_desc)

        # Add style
        if self.style.mood:
            parts.append(f"{self.style.mood} mood")
        if self.style.effects:
            parts.append(f"with {', '.join(self.style.effects)}")
        if self.style.lighting:
            parts.append(f"{self.style.lighting} lighting")

        # Add game context
        if self.game_context:
            parts.insert(0, f"{self.game_context} themed")

        return ", ".join(parts) if parts else ""

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary for storage."""
        return {
            "scene_elements": [e.to_dict() for e in self.scene_elements],
            "display_texts": [t.to_dict() for t in self.display_texts],
            "ambiguous_annotations": [a.to_dict() for a in self.ambiguous_annotations],
            "style": self.style.to_dict(),
            "asset_type": self.asset_type,
            "game_context": self.game_context,
            "brand_context": self.brand_context,
            "user_confirmed_vision": self.user_confirmed_vision,
            "confirmation_turn": self.confirmation_turn,
            "turn_count": self.turn_count,
            "last_coach_summary": self.last_coach_summary,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CreativeIntentSchema":
        """Deserialize from dictionary."""
        return cls(
            scene_elements=[
                SceneElement.from_dict(e) for e in data.get("scene_elements", [])
            ],
            display_texts=[
                DisplayText.from_dict(t) for t in data.get("display_texts", [])
            ],
            ambiguous_annotations=[
                AmbiguousAnnotation.from_dict(a)
                for a in data.get("ambiguous_annotations", [])
            ],
            style=StyleParameters.from_dict(data.get("style", {})),
            asset_type=data.get("asset_type"),
            game_context=data.get("game_context"),
            brand_context=data.get("brand_context"),
            user_confirmed_vision=data.get("user_confirmed_vision", False),
            confirmation_turn=data.get("confirmation_turn"),
            turn_count=data.get("turn_count", 0),
            last_coach_summary=data.get("last_coach_summary"),
        )


# =============================================================================
# Annotation Classifier
# =============================================================================


class AnnotationClassifier:
    """
    Classifies canvas annotations as scene descriptions or display text.

    Uses pattern matching and heuristics to determine the likely type
    of each annotation, and generates clarification questions for
    ambiguous cases.
    """

    # Patterns that strongly indicate SCENE DESCRIPTION (render this)
    SCENE_PATTERNS = [
        r"\b(fighting|shooting|holding|standing|running|jumping|flying)\b",
        r"\b(add|put|place|show|render|draw)\b",
        r"\b(here|there|left|right|center|background|foreground)\b",
        r"\b(skin|character|weapon|effect|explosion|glow)\b",
        r"\b(with a|with the|using|wielding)\b",
        r"\b(battle|action|pose|stance)\b",
    ]

    # Patterns that strongly indicate DISPLAY TEXT (show as text)
    TEXT_PATTERNS = [
        r"^[A-Z][A-Z\s\d!?]+$",  # ALL CAPS (likely title)
        r"\b(subscribe|follow|like|share)\b",
        r"[!?]{2,}",  # Multiple punctuation
        r"^\".*\"$",  # Quoted text
        r"^\#\w+",  # Hashtags
        r"@\w+",  # Mentions
    ]

    # Common title/catchphrase patterns
    TITLE_PATTERNS = [
        r"^the\s+\w+",  # "The BEST..."
        r"\b(best|worst|top|epic|insane|crazy)\b",
        r"\b(win|fail|clutch|moment)\b",
    ]

    def classify(self, text: str) -> AmbiguousAnnotation:
        """
        Classify an annotation and return classification with confidence.

        Args:
            text: The annotation text to classify

        Returns:
            AmbiguousAnnotation with classification and clarification question
        """
        text_lower = text.lower().strip()

        # Calculate scene score
        scene_score = 0
        for pattern in self.SCENE_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                scene_score += 1

        # Calculate text score
        text_score = 0
        for pattern in self.TEXT_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                text_score += 1
        for pattern in self.TITLE_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                text_score += 0.5

        # Determine likely type and confidence
        total_score = scene_score + text_score
        if total_score == 0:
            # No strong signals - ambiguous
            likely_type = AnnotationType.AMBIGUOUS
            confidence = 0.3
        elif scene_score > text_score:
            likely_type = AnnotationType.SCENE_DESCRIPTION
            confidence = min(0.9, 0.5 + (scene_score - text_score) * 0.15)
        elif text_score > scene_score:
            likely_type = AnnotationType.DISPLAY_TEXT
            confidence = min(0.9, 0.5 + (text_score - scene_score) * 0.15)
        else:
            likely_type = AnnotationType.AMBIGUOUS
            confidence = 0.5

        # Generate clarification question
        if likely_type == AnnotationType.SCENE_DESCRIPTION:
            question = (
                f'I see "{text}" - should I render that as a scene, '
                "or display it as text?"
            )
        elif likely_type == AnnotationType.DISPLAY_TEXT:
            question = (
                f'Should "{text}" appear as text on the image, '
                "or is it describing what to show?"
            )
        else:
            question = (
                f'For "{text}" - do you want me to render that visually, '
                "or show it as text?"
            )

        return AmbiguousAnnotation(
            original_text=text,
            likely_type=likely_type,
            confidence=confidence,
            clarification_question=question,
        )

    def is_likely_scene_description(self, text: str) -> bool:
        """Quick check if text is likely a scene description."""
        result = self.classify(text)
        return (
            result.likely_type == AnnotationType.SCENE_DESCRIPTION
            and result.confidence > 0.7
        )

    def is_likely_display_text(self, text: str) -> bool:
        """Quick check if text is likely display text."""
        result = self.classify(text)
        return (
            result.likely_type == AnnotationType.DISPLAY_TEXT
            and result.confidence > 0.7
        )


# Singleton
_classifier: Optional[AnnotationClassifier] = None


def get_annotation_classifier() -> AnnotationClassifier:
    """Get or create the annotation classifier singleton."""
    global _classifier
    if _classifier is None:
        _classifier = AnnotationClassifier()
    return _classifier


__all__ = [
    # Enums
    "IntentParameterStatus",
    "AnnotationType",
    "IntentReadiness",
    # Models
    "SceneElement",
    "DisplayText",
    "AmbiguousAnnotation",
    "StyleParameters",
    "CreativeIntentSchema",
    # Classifier
    "AnnotationClassifier",
    "get_annotation_classifier",
]
