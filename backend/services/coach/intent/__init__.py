"""
Intent extraction, processing, and validation pipeline.

This module provides:
- CreativeIntentSchema: Structured schema for tracking intent parameters
- IntentParser: Parses conversations to extract/update intent
- IntentExtractor: Legacy extractor for backwards compatibility
- OutputValidator: Validates prompts before generation
- AnnotationClassifier: Classifies canvas annotations
- CanvasIntentSchema: Canvas element classification for Coach → Nano Banana flow

The intent system is parameter-driven, not turn-driven:
- Generation is ready when required parameters are filled and confirmed
- Ambiguous annotations must be clarified before generation
- User must explicitly confirm the final vision
"""

# New intent schema system
from backend.services.coach.intent.schema import (
    # Enums
    IntentParameterStatus,
    AnnotationType,
    IntentReadiness,
    # Models
    SceneElement,
    DisplayText,
    AmbiguousAnnotation,
    StyleParameters,
    CreativeIntentSchema,
    # Classifier
    AnnotationClassifier,
    get_annotation_classifier,
)

# Intent parser
from backend.services.coach.intent.parser import (
    IntentParser,
    get_intent_parser,
)

# Legacy extractor (for backwards compatibility)
from backend.services.coach.intent.extractor import (
    CreativeIntent,
    IntentExtractor,
    get_intent_extractor,
)

# Validator
from backend.services.coach.intent.validator import (
    ValidationIssue,
    ValidationResult,
    OutputValidator,
    get_validator,
)

# Canvas element classification (Coach → Nano Banana flow)
from backend.services.coach.intent.canvas import (
    # Enums
    ElementIntent,
    PositionRegion,
    # Models
    ClassifiedElement,
    CanvasIntentSchema,
    # Functions
    classify_canvas_elements,
    apply_clarification_response,
    pos_to_region,
)

__all__ = [
    # New Schema System
    "IntentParameterStatus",
    "AnnotationType",
    "IntentReadiness",
    "SceneElement",
    "DisplayText",
    "AmbiguousAnnotation",
    "StyleParameters",
    "CreativeIntentSchema",
    "AnnotationClassifier",
    "get_annotation_classifier",
    # Parser
    "IntentParser",
    "get_intent_parser",
    # Legacy Extractor
    "CreativeIntent",
    "IntentExtractor",
    "get_intent_extractor",
    # Validator
    "ValidationIssue",
    "ValidationResult",
    "OutputValidator",
    "get_validator",
    # Canvas Classification
    "ElementIntent",
    "PositionRegion",
    "ClassifiedElement",
    "CanvasIntentSchema",
    "classify_canvas_elements",
    "apply_clarification_response",
    "pos_to_region",
]
