"""
Intent Parser - Extracts and updates creative intent from conversations.

This module is responsible for:
1. Parsing user messages to extract intent parameters
2. Parsing coach responses to extract refined intent
3. Detecting user confirmations
4. Updating the intent schema based on conversation flow

The parser works with the CreativeIntentSchema to progressively build
a complete picture of what the user wants to create.

Author: AuraStream Engineering
Version: 1.0.0
"""

import re
import logging
from typing import Optional, Dict, Any, Tuple

from .schema import (
    CreativeIntentSchema,
    SceneElement,
    DisplayText,
    IntentParameterStatus,
    AnnotationType,
    get_annotation_classifier,
)

logger = logging.getLogger(__name__)


class IntentParser:
    """
    Parses conversations to extract and update creative intent.

    This parser is the bridge between natural language conversation
    and the structured CreativeIntentSchema. It handles:

    1. Initial parsing of user description
    2. Canvas annotation classification
    3. User confirmation detection
    4. Coach response parsing for refined intent
    5. Clarification response handling
    """

    # Confirmation patterns - user agreeing with coach's summary
    CONFIRMATION_PATTERNS = [
        # Simple confirmations (exact match with optional punctuation)
        (
            r"^(yes|yeah|yep|yup|sure|ok|okay|correct|right|exactly|perfect|"
            r"sounds good|that's right|that works|go for it|let's do it|"
            r"looks good|good|great|awesome|nice|absolutely|definitely)[\s!.]*$"
        ),
        # Confirmations with "that's/looks" qualifiers
        (
            r"^(yes|yeah|yep|yup|sure|ok|okay)[,\s]+"
            r"(that's|thats|it's|its|looks)\s+(good|great|perfect|right)"
        ),
        # Action confirmations
        r"^(do it|make it|create it|generate|let's go|ship it|go ahead|proceed)[\s!.]*$",
        # Confirmations with additional words (more flexible)
        (
            r"^(yes|yeah|yep|yup|sure|ok|okay)\b.*\b"
            r"(good|great|perfect|works|right|love it|like it)[\s!.]*$"
        ),
        # "That" confirmations
        r"^that('s| is| looks)?\s*(good|great|perfect|right|exactly what i want|exactly)",
        # Enthusiastic confirmations
        r"^(love it|like it|perfect|exactly|nailed it|spot on)[\s!.]*$",
        # Short affirmatives with emoji or punctuation
        r"^(yes|yeah|yep|yup|👍|✅|💯)[\s!.]*$",
        # "Sounds/looks" confirmations
        r"^(sounds|looks)\s+(good|great|perfect|right|awesome)[\s!.]*$",
        # Styling confirmations - when user provides styling preferences, treat as confirmation
        # e.g., "bold with glow", "large and centered", "neon outline"
        r"^(bold|large|medium|small|neon|glow|outline|shadow|centered|left|right)\b.*(please|thanks|good|perfect)?[\s!.]*$",
        # "Make it" styling confirmations
        r"^make\s+it\s+(bold|large|neon|glow|pop|stand out)",
        # "I want" styling confirmations
        r"^i\s+want\s+(it\s+)?(bold|large|neon|glow|with|to)",
        # Confirmations with styling details
        r"^(yes|yeah|sure|ok)[,\s]+(make\s+it\s+|with\s+|and\s+)?(bold|large|glow|neon)",
    ]

    # Negation patterns - user disagreeing or wanting changes
    NEGATION_PATTERNS = [
        r"^(no|nope|nah|not quite|not exactly|wait|hold on|actually|change|different)",
        r"\b(but|however|instead|rather|change|modify|adjust|tweak)\b",
    ]

    # Scene element extraction patterns
    SCENE_ELEMENT_PATTERNS = [
        # Character/skin patterns
        (r"\b(\w+)\s+skin\b", "character"),
        (r"\b(\w+)\s+character\b", "character"),
        # Action patterns
        (
            r"\b(fighting|shooting|holding|standing|running|jumping|flying|posing)\b",
            "action",
        ),
        # Object patterns
        (r"\b(with\s+(?:a\s+)?(\w+(?:\s+\w+)?))\b", "object"),
        # Effect patterns
        (r"\b(explosion|glow|sparkles?|fire|lightning|smoke|particles?)\b", "effect"),
    ]

    # Display text extraction patterns (quoted text, titles)
    DISPLAY_TEXT_PATTERNS = [
        r'"([^"]+)"',  # Double quoted
        r"'([^']+)'",  # Single quoted
        r"text[:\s]+[\"']?([^\"'\n]+)[\"']?",  # "text: something"
        r"title[:\s]+[\"']?([^\"'\n]+)[\"']?",  # "title: something"
    ]

    # Style/mood patterns
    MOOD_PATTERNS = {
        "hype": [r"\b(hype|hyped|energetic|exciting|intense|epic)\b"],
        "cozy": [r"\b(cozy|chill|relaxed|calm|peaceful|warm)\b"],
        "dramatic": [r"\b(dramatic|cinematic|moody|dark|intense)\b"],
        "playful": [r"\b(playful|fun|silly|goofy|cute)\b"],
        "professional": [r"\b(professional|clean|sleek|minimal|modern)\b"],
    }

    def __init__(self):
        self.classifier = get_annotation_classifier()

    def parse_initial_request(
        self,
        description: str,
        asset_type: Optional[str] = None,
        mood: Optional[str] = None,
        game_context: Optional[str] = None,
        canvas_description: Optional[str] = None,
        brand_context: Optional[Dict[str, Any]] = None,
    ) -> CreativeIntentSchema:
        """
        Parse the initial user request to create an intent schema.

        Args:
            description: User's description of what they want
            asset_type: Type of asset being created
            mood: Selected mood/style
            game_context: Game context if any
            canvas_description: Description of canvas elements if using Canvas Studio
            brand_context: Brand kit context

        Returns:
            CreativeIntentSchema with initial parameters extracted
        """
        schema = CreativeIntentSchema(
            asset_type=asset_type,
            game_context=game_context,
            brand_context=brand_context,
            turn_count=0,
        )

        # Set mood if provided
        if mood:
            schema.style.mood = mood
            schema.style.mood_status = IntentParameterStatus.INFERRED

        # Parse the description for scene elements and text
        self._extract_from_text(description, schema, source="user_input")

        # Parse canvas description if provided
        if canvas_description:
            self._parse_canvas_description(canvas_description, schema)

        return schema

    def parse_user_message(
        self,
        message: str,
        schema: CreativeIntentSchema,
        last_coach_message: Optional[str] = None,
    ) -> Tuple[CreativeIntentSchema, bool]:
        """
        Parse a user message and update the intent schema.

        Args:
            message: User's message
            schema: Current intent schema
            last_coach_message: The coach's previous message (for context)

        Returns:
            Tuple of (updated schema, is_confirmation)
        """
        schema.turn_count += 1
        message_lower = message.lower().strip()

        # Check if this is a confirmation
        is_confirmation = self._is_confirmation(message_lower)

        if is_confirmation:
            # User confirmed - mark vision as confirmed
            schema.user_confirmed_vision = True
            schema.confirmation_turn = schema.turn_count

            # Upgrade all inferred elements to confirmed
            for elem in schema.scene_elements:
                if elem.status == IntentParameterStatus.INFERRED:
                    elem.status = IntentParameterStatus.CONFIRMED
            for text in schema.display_texts:
                if text.status == IntentParameterStatus.INFERRED:
                    text.status = IntentParameterStatus.CONFIRMED
                    text.spelling_confirmed = True

            logger.info(f"User confirmed vision at turn {schema.turn_count}")
            return schema, True

        # Check if this is a clarification response
        self._handle_clarification_response(message, schema)

        # Check if this is a negation/change request
        is_negation = self._is_negation(message_lower)
        if is_negation:
            # User wants changes - reset confirmation
            schema.user_confirmed_vision = False
            schema.confirmation_turn = None

        # Extract any new elements from the message
        self._extract_from_text(message, schema, source="user_refinement")

        return schema, False

    def parse_coach_response(
        self,
        response: str,
        schema: CreativeIntentSchema,
    ) -> CreativeIntentSchema:
        """
        Parse a coach response to extract refined intent.

        The coach may provide a summary of the vision which we should
        capture as the refined description.
        
        IMPORTANT: If the coach says [INTENT_READY], this means the coach
        has confirmed the user's vision is complete. We should set
        user_confirmed_vision=True in this case.

        Args:
            response: Coach's response
            schema: Current intent schema

        Returns:
            Updated schema
        """
        # Check if coach said [INTENT_READY] - this means vision is confirmed
        if "[INTENT_READY]" in response:
            # Coach confirmed the vision is ready
            # Only set confirmed if we're past the first turn (turn_count >= 1)
            if schema.turn_count >= 1:
                schema.user_confirmed_vision = True
                schema.confirmation_turn = schema.turn_count
                logger.info(f"Coach said [INTENT_READY] at turn {schema.turn_count}, marking vision as confirmed")

        # Look for coach's summary patterns
        summary_patterns = [
            r"(?:✨\s*)?Ready[!:]\s+(.+?)(?:\s*\[INTENT_READY\]|$)",
            r"(?:✨\s*)?Perfect[!:]\s+(.+?)(?:\s*\[INTENT_READY\]|$)",
            r"Here's what I've got:\s*(.+?)(?:\s*\[INTENT_READY\]|$)",
            r"So we're going for\s*(.+?)(?:\s*\[INTENT_READY\]|$)",
            r"Your vision:\s*(.+?)(?:\s*\[INTENT_READY\]|$)",
        ]

        for pattern in summary_patterns:
            match = re.search(pattern, response, re.IGNORECASE | re.DOTALL)
            if match:
                summary = match.group(1).strip()
                # Clean up the summary
                summary = re.sub(r"\[INTENT_READY\]", "", summary).strip()
                summary = re.sub(r"\n{2,}", " ", summary)
                schema.last_coach_summary = summary

                # Extract elements from the summary
                self._extract_from_text(summary, schema, source="coach_summary")

                # If we found a summary with [INTENT_READY], upgrade inferred elements to confirmed
                if "[INTENT_READY]" in response and schema.turn_count >= 1:
                    for elem in schema.scene_elements:
                        if elem.status == IntentParameterStatus.INFERRED:
                            elem.status = IntentParameterStatus.CONFIRMED
                    for text in schema.display_texts:
                        if text.status == IntentParameterStatus.INFERRED:
                            text.status = IntentParameterStatus.CONFIRMED
                            text.spelling_confirmed = True
                break

        return schema

    def _extract_from_text(
        self,
        text: str,
        schema: CreativeIntentSchema,
        source: str = "user_input",
    ) -> None:
        """
        Extract scene elements and display text from text.

        Args:
            text: Text to parse
            schema: Schema to update
            source: Source of the text for tracking
        """
        text_lower = text.lower()

        # Extract quoted text as display text
        for pattern in self.DISPLAY_TEXT_PATTERNS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    match = match[0]
                if match and len(match) > 1:
                    # Check if we already have this text
                    existing = [
                        t
                        for t in schema.display_texts
                        if t.text.lower() == match.lower()
                    ]
                    if not existing:
                        schema.display_texts.append(
                            DisplayText(
                                text=match,
                                status=IntentParameterStatus.INFERRED,
                                spelling_confirmed=False,
                            )
                        )

        # Extract scene elements
        for pattern, elem_type in self.SCENE_ELEMENT_PATTERNS:
            matches = re.findall(pattern, text_lower)
            for match in matches:
                if isinstance(match, tuple):
                    match = match[0]
                if match and len(match) > 2:
                    # Check if we already have this element
                    existing = [
                        e
                        for e in schema.scene_elements
                        if match in e.description.lower()
                    ]
                    if not existing:
                        schema.scene_elements.append(
                            SceneElement(
                                description=match,
                                element_type=elem_type,
                                status=IntentParameterStatus.INFERRED,
                                source=source,
                            )
                        )

        # Extract mood if not already set
        if (
            not schema.style.mood
            or schema.style.mood_status == IntentParameterStatus.EMPTY
        ):
            for mood, patterns in self.MOOD_PATTERNS.items():
                for pattern in patterns:
                    if re.search(pattern, text_lower):
                        schema.style.mood = mood
                        schema.style.mood_status = IntentParameterStatus.INFERRED
                        break

    def _parse_canvas_description(
        self,
        canvas_description: str,
        schema: CreativeIntentSchema,
    ) -> None:
        """
        Parse canvas description and classify annotations.

        Canvas descriptions may contain:
        - Asset names and positions
        - Sketch annotations (text written on canvas)
        - Layout information

        Args:
            canvas_description: Description of canvas contents
            schema: Schema to update
        """
        # Look for sketch/annotation mentions
        annotation_patterns = [
            r"sketch(?:es)?[:\s]+(.+?)(?:\.|$)",
            r"text[:\s]+(.+?)(?:\.|$)",
            r"annotation[s]?[:\s]+(.+?)(?:\.|$)",
            r"wrote[:\s]+(.+?)(?:\.|$)",
            r"drawing[s]?[:\s]+(.+?)(?:\.|$)",
        ]

        for pattern in annotation_patterns:
            matches = re.findall(pattern, canvas_description, re.IGNORECASE)
            for match in matches:
                # Classify each annotation
                annotation = self.classifier.classify(match.strip())

                # If high confidence, add directly to appropriate list
                if annotation.confidence > 0.8:
                    if annotation.likely_type == AnnotationType.SCENE_DESCRIPTION:
                        schema.scene_elements.append(
                            SceneElement(
                                description=match.strip(),
                                element_type="action",  # Default type for annotations
                                status=IntentParameterStatus.INFERRED,
                                source="canvas_annotation",
                            )
                        )
                    elif annotation.likely_type == AnnotationType.DISPLAY_TEXT:
                        schema.display_texts.append(
                            DisplayText(
                                text=match.strip(),
                                status=IntentParameterStatus.INFERRED,
                                spelling_confirmed=False,
                            )
                        )
                else:
                    # Ambiguous - add to clarification list
                    schema.ambiguous_annotations.append(annotation)

        # Also extract any quoted text from canvas description
        self._extract_from_text(canvas_description, schema, source="canvas_description")

    def _is_confirmation(self, message: str) -> bool:
        """Check if message is a confirmation."""
        for pattern in self.CONFIRMATION_PATTERNS:
            if re.match(pattern, message, re.IGNORECASE):
                return True
        return False

    def _is_negation(self, message: str) -> bool:
        """Check if message is a negation/change request."""
        for pattern in self.NEGATION_PATTERNS:
            if re.search(pattern, message, re.IGNORECASE):
                return True
        return False

    def _handle_clarification_response(
        self,
        message: str,
        schema: CreativeIntentSchema,
    ) -> bool:
        """
        Handle user's response to clarification questions.

        Args:
            message: User's message
            schema: Schema to update

        Returns:
            True if a clarification was handled
        """
        message_lower = message.lower()
        handled = False

        for annotation in schema.ambiguous_annotations:
            if annotation.resolved:
                continue

            # Check if user mentioned this annotation's text
            if annotation.original_text.lower() in message_lower:
                # Check what they want to do with it
                if re.search(
                    r"\b(render|show|draw|display as scene|make it|create)\b",
                    message_lower,
                ):
                    annotation.resolved = True
                    annotation.resolved_as = AnnotationType.SCENE_DESCRIPTION
                    # Add as scene element
                    schema.scene_elements.append(
                        SceneElement(
                            description=annotation.original_text,
                            element_type="action",
                            status=IntentParameterStatus.CONFIRMED,
                            source="clarification",
                        )
                    )
                    handled = True
                elif re.search(
                    r"\b(text|display|show as text|write|spell)\b", message_lower
                ):
                    annotation.resolved = True
                    annotation.resolved_as = AnnotationType.DISPLAY_TEXT
                    # Add as display text
                    schema.display_texts.append(
                        DisplayText(
                            text=annotation.original_text,
                            status=IntentParameterStatus.CONFIRMED,
                            spelling_confirmed=True,
                        )
                    )
                    handled = True

        return handled


# Singleton
_parser: Optional[IntentParser] = None


def get_intent_parser() -> IntentParser:
    """Get or create the intent parser singleton."""
    global _parser
    if _parser is None:
        _parser = IntentParser()
    return _parser


__all__ = [
    "IntentParser",
    "get_intent_parser",
]
