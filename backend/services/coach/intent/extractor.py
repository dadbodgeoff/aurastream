"""
Intent Extractor for Prompt Coach.

Responsible for extracting the refined creative intent from coach responses.
This is a critical component that determines what description gets passed
to the image generation pipeline.

The extractor uses pattern matching to find the coach's summary of what
the user wants to create. If no pattern matches, it falls back gracefully.

IMPORTANT: This module was created after a bug where placeholder text
("custom mood, custom mood...") was being passed to generation instead
of the actual refined description. The patterns here must match the
actual output format of the coach LLM.
"""

import re
import logging
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, TYPE_CHECKING

if TYPE_CHECKING:
    from backend.services.coach.models import CoachSession

logger = logging.getLogger(__name__)


@dataclass
class CreativeIntent:
    """
    User's refined creative intent - NOT a prompt.

    This is what the user wants, described in natural language.
    The actual prompt construction happens in the generation pipeline.

    Attributes:
        description: The refined description of what to create
        subject: Main subject (character, object, scene)
        action: What's happening (pose, expression, movement)
        emotion: Emotional tone (hype, cozy, intense)
        elements: Additional elements (sparkles, effects, etc.)
        confidence_score: How confident we are in the extraction (0.0-1.0)
        extraction_method: Which pattern/method was used to extract
    """

    description: str
    subject: Optional[str] = None
    action: Optional[str] = None
    emotion: Optional[str] = None
    elements: List[str] = field(default_factory=list)
    confidence_score: float = 0.0
    extraction_method: str = "fallback"

    def to_generation_input(self) -> str:
        """
        Convert intent to a clean description for the generation pipeline.
        This is NOT the final prompt - just the user's refined intent.

        NOTE: Mood/emotion is NOT included here as text because it would be
        rendered as visible text on the image. Mood should be handled separately
        as a style directive, not part of the content description.
        """
        parts = []
        if self.subject:
            parts.append(self.subject)
        if self.action:
            parts.append(self.action)
        # REMOVED: Don't include emotion/mood in the text description
        # It was being rendered as "HYPE MOOD" text on the image
        # Mood should be a style directive, not content
        if self.elements:
            parts.append(", ".join(self.elements))
        if self.description and self.description not in " ".join(parts):
            parts.append(self.description)
        return ", ".join(parts) if parts else self.description

    def is_valid(self) -> bool:
        """Check if the intent has meaningful content."""
        if not self.description:
            return False
        # Check for placeholder patterns that shouldn't be in final output
        placeholder_patterns = [
            r"help me describe",
            r"help me figure out",
            r"custom mood,\s*custom mood",
            r"I want to create a \w+\.\s*Help me",
        ]
        desc_lower = self.description.lower()
        for pattern in placeholder_patterns:
            if re.search(pattern, desc_lower, re.IGNORECASE):
                logger.warning(
                    f"Intent contains placeholder text: {self.description[:100]}"
                )
                return False
        return len(self.description) >= 10


class IntentExtractor:
    """
    Extracts creative intent from coach LLM responses.

    This class is responsible for parsing the coach's response and
    extracting the refined description that will be used for generation.

    The extraction uses a priority-ordered list of regex patterns that
    match common coach response formats. If no pattern matches, it
    falls back to the original description (with a warning).

    Example coach responses and their extractions:

    Input: "✨ Ready! A vibrant Fortnite thumbnail with neon effects"
    Output: "A vibrant Fortnite thumbnail with neon effects"

    Input: "Here's what I've got: a cozy gaming setup with warm lighting"
    Output: "a cozy gaming setup with warm lighting"
    """

    # Patterns for extracting the refined description from coach responses
    # Order matters - more specific patterns first
    EXTRACTION_PATTERNS: List[Tuple[str, str]] = [
        # "✨ Ready! A vibrant thumbnail..." or "Ready! A cool emote..."
        # Capture everything up to [INTENT_READY] or end of string
        # Allow ? inside quoted text (e.g., "The BEST shotgun EVER?")
        (r"(?:✨\s*)?Ready[!:]\s+(.+?)(?:\s*\[INTENT_READY\]|$)", "ready_marker"),
        # "Perfect! A high-energy thumbnail"
        (r"(?:✨\s*)?Perfect[!:]\s+(.+?)(?:\s*\[INTENT_READY\]|$)", "perfect_marker"),
        # "Here's what I've got: a cool thumbnail"
        (r"Here's what I've got:\s*(.+?)(?:\s*\[INTENT_READY\]|$)", "heres_what"),
        # "So we're going for a neon-style emote"
        (r"So we're going for\s*(.+?)(?:\s*\[INTENT_READY\]|$)", "going_for"),
        # "we'll create a dynamic banner"
        (r"we'll create\s*(.+?)(?:\s*\[INTENT_READY\]|$)", "well_create"),
        # "Updated: a dynamic banner with neon effects"
        (r"Updated:\s*(.+?)(?:\s*\[INTENT_READY\]|$)", "updated"),
        # "Your vision: a sleek gaming thumbnail"
        (r"Your vision:\s*(.+?)(?:\s*\[INTENT_READY\]|$)", "your_vision"),
        # "Creating: a bold emote with fire effects"
        (r"Creating:\s*(.+?)(?:\s*\[INTENT_READY\]|$)", "creating"),
    ]

    # Markers that indicate the coach is ready for generation
    READY_MARKERS = [
        "[INTENT_READY]",
        "Ready to create",
        "ready to create",
        "✨ Perfect",
        "✨ Ready",
        "Let's create",
        "Ready!",
    ]

    # Minimum length for a valid extracted description
    MIN_DESCRIPTION_LENGTH = 10

    def __init__(self):
        """Initialize the intent extractor."""
        # Pre-compile patterns for performance
        self._compiled_patterns = [
            (re.compile(pattern, re.IGNORECASE | re.DOTALL), name)
            for pattern, name in self.EXTRACTION_PATTERNS
        ]

    def extract_from_response(
        self,
        response: str,
        original_description: str,
        mood: Optional[str] = None,
    ) -> CreativeIntent:
        """
        Extract creative intent from a coach response.

        This is the main entry point for extracting intent from the
        first coach response in a session.

        Args:
            response: The coach's response text
            original_description: The user's original description (fallback)
            mood: The selected mood/style

        Returns:
            CreativeIntent with the extracted description
        """
        # Try to extract using patterns
        description, method = self._extract_description(response)

        # If extraction failed, use original (with warning)
        if not description:
            logger.warning(
                f"Failed to extract intent from response. "
                f"Falling back to original: {original_description[:50]}..."
            )
            description = original_description
            method = "fallback"

        # Calculate confidence
        confidence = self._calculate_confidence(response, method)

        intent = CreativeIntent(
            description=description,
            emotion=mood,
            confidence_score=confidence,
            extraction_method=method,
        )

        # Validate the intent
        if not intent.is_valid():
            logger.error(
                f"Extracted intent failed validation! "
                f"Method: {method}, Description: {description[:100]}"
            )

        return intent

    def extract_from_conversation(
        self,
        response: str,
        user_message: str,
        session: "CoachSession",
    ) -> CreativeIntent:
        """
        Extract refined intent from an ongoing conversation.

        This handles subsequent messages in a coaching session,
        building on the previous intent. It also extracts specific
        details from the full conversation history.

        Args:
            response: The coach's latest response
            user_message: The user's message that prompted this response
            session: The current coaching session

        Returns:
            CreativeIntent with the refined description
        """
        # Try to extract from response
        description, method = self._extract_description(response)

        # If no extraction, try to build from session context
        if not description:
            description = self._build_from_session(user_message, session)
            method = "session_context"

        # CRITICAL: Enrich the description with specific details from conversation
        # This prevents vague summaries like "all three skins" instead of naming them
        enriched_description = self._enrich_with_conversation_details(
            description, response, session
        )
        if enriched_description != description:
            description = enriched_description
            method = f"{method}+enriched"

        # Calculate confidence
        confidence = self._calculate_confidence(response, method)

        # Boost confidence for longer conversations
        if len(session.messages) > 4:
            confidence = min(0.95, confidence + 0.1)

        return CreativeIntent(
            description=description,
            emotion=session.mood,
            confidence_score=confidence,
            extraction_method=method,
        )

    def check_intent_ready(self, response: str) -> bool:
        """
        Check if the coach indicated the intent is clear enough for generation.

        Returns True when:
        1. Explicit [INTENT_READY] marker is present
        2. Coach uses ready statements (not questions)
        3. Response contains a clear summary (Ready!, Perfect!, etc.)

        Args:
            response: The coach's response text

        Returns:
            True if the coach indicated readiness
        """
        # Explicit marker is always ready
        if "[INTENT_READY]" in response:
            return True

        # Check for ready statements
        # These patterns indicate the coach is stating readiness (not asking)
        ready_patterns = [
            r"(?:✨\s*)?(?:Ready to create|ready to create)",  # "Ready to create..."
            r"(?:✨\s*)?Ready!",  # "Ready!"
            r"(?:✨\s*)?Let's create",  # "Let's create..."
            r"(?:✨\s*)?Perfect!",  # "Perfect!"
            r"(?:✨\s*)?Ready\s+to\s+go",  # "Ready to go"
            r"(?:✨\s*)?Here's what",  # "Here's what I've got..."
            r"(?:✨\s*)?So we're going for",  # "So we're going for..."
            r"(?:✨\s*)?Creating:",  # "Creating: ..."
            r"(?:✨\s*)?Your vision:",  # "Your vision: ..."
        ]

        for pattern in ready_patterns:
            if re.search(pattern, response, re.IGNORECASE):
                # If response ends with "?", it's asking for confirmation
                # Only check the last 50 chars
                last_part = response.rstrip()[-50:]
                if last_part.count("?") > 0 and last_part.endswith("?"):
                    # It's a question - not ready yet
                    continue
                return True

        # "✨ Perfect" or "✨ Ready" followed by content (not a question)
        if "✨ Perfect" in response or "✨ Ready" in response:
            # Check if it ends with a question
            if not response.rstrip().endswith("?"):
                return True

        return False

    def _extract_description(self, response: str) -> Tuple[Optional[str], str]:
        """
        Extract description using pattern matching.

        Args:
            response: The coach's response text

        Returns:
            Tuple of (extracted_description, method_name)
        """
        for pattern, method_name in self._compiled_patterns:
            match = pattern.search(response)
            if match:
                extracted = match.group(1).strip()
                # Clean up the extracted text
                extracted = self._clean_extracted_text(extracted)

                if extracted and len(extracted) >= self.MIN_DESCRIPTION_LENGTH:
                    logger.debug(
                        f"Extracted intent using '{method_name}': {extracted[:50]}..."
                    )
                    return extracted, method_name

        return None, "none"

    def _clean_extracted_text(self, text: str) -> str:
        """
        Clean up extracted text by removing markers and extra whitespace.

        Args:
            text: The raw extracted text

        Returns:
            Cleaned text
        """
        # Remove intent markers
        text = re.sub(r"\[INTENT_READY\]", "", text)
        # Remove trailing punctuation (just periods)
        text = text.rstrip(".")
        # Normalize whitespace
        text = " ".join(text.split())
        return text.strip()

    def _build_from_session(
        self,
        user_message: str,
        session: "CoachSession",
    ) -> str:
        """
        Build description from session context when extraction fails.

        Args:
            user_message: The user's latest message
            session: The current session

        Returns:
            Built description
        """
        base = session.current_prompt_draft or ""

        # Extract meaningful additions from user message
        additions = self._extract_additions(user_message)

        if additions and base:
            return f"{base}, {additions}"
        elif base:
            return base
        else:
            return additions or ""

    def _extract_additions(self, message: str) -> str:
        """
        Extract meaningful additions from a user message.

        Filters out filler words and confirmations to get
        the actual content the user is adding.

        Args:
            message: The user's message

        Returns:
            Extracted additions (empty string if none)
        """
        # Common filler/confirmation words to remove
        fillers = [
            "yes",
            "yeah",
            "sure",
            "ok",
            "okay",
            "sounds good",
            "perfect",
            "great",
            "awesome",
            "nice",
            "cool",
            "let's do it",
            "go for it",
            "that works",
        ]

        cleaned = message.lower()
        for filler in fillers:
            cleaned = cleaned.replace(filler, "")

        cleaned = cleaned.strip()

        # Only return if there's substantial content
        if len(cleaned) > 10:
            return message.strip()
        return ""

    def _enrich_with_conversation_details(
        self,
        description: str,
        latest_response: str,
        session: "CoachSession",
    ) -> str:
        """
        Enrich a vague description with specific details from the conversation.

        This prevents summaries like "all three skins" by extracting the
        actual skin names, text content, and scene details from the full
        conversation history.

        Args:
            description: The extracted description (may be vague)
            latest_response: The coach's latest response
            session: The session with full message history

        Returns:
            Enriched description with specific details
        """
        # Collect all conversation text
        all_text = latest_response + "\n"
        for msg in session.messages:
            all_text += msg.content + "\n"

        all_text_lower = all_text.lower()
        description_lower = description.lower()

        additions = []

        # 1. Extract quoted text (exact text to display)
        # Look for patterns like: "The BEST Shotgun EVER?" or text: "something"
        quoted_texts = re.findall(r'["\']([^"\']{3,50})["\']', all_text)
        # Also look for **bold** text which coach often uses for confirmed text
        bold_texts = re.findall(r"\*\*([^*]{3,50})\*\*", all_text)

        confirmed_text = None
        for text in quoted_texts + bold_texts:
            # Skip common phrases that aren't display text
            skip_phrases = [
                "ready",
                "perfect",
                "great",
                "intent_ready",
                "image",
                "thumbnail",
            ]
            if not any(skip in text.lower() for skip in skip_phrases):
                # Check if this looks like display text (has caps or punctuation)
                if any(c.isupper() for c in text) or "?" in text or "!" in text:
                    confirmed_text = text
                    break

        if confirmed_text and confirmed_text.lower() not in description_lower:
            additions.append(f'with text "{confirmed_text}"')

        # 2. Extract specific character/skin names mentioned
        # Look for patterns like "The Bride", "Kingston", "Marty McFly"
        # These are often in bold or mentioned after "use/include/feature"
        character_patterns = [
            r"\b(the bride|beatrix|kingston|marty mcfly|back to the future)\b",
            r"\b(peely|fishstick|midas|meowscles|drift|catalyst|renegade raider)\b",
            r"\b(jonesy|ramirez|headhunter|wildcat|aura|crystal|dynamo)\b",
            # Generic pattern for capitalized names that might be skins
            r"\*\*([A-Z][a-z]+(?: [A-Z][a-z]+)*)\*\*",
        ]

        found_characters = []
        for pattern in character_patterns:
            matches = re.findall(pattern, all_text, re.IGNORECASE)
            for match in matches:
                name = match.strip() if isinstance(match, str) else match
                if name and len(name) > 2 and name.lower() not in description_lower:
                    # Avoid duplicates
                    if name.lower() not in [c.lower() for c in found_characters]:
                        found_characters.append(name.title())

        if (
            found_characters
            and "skin" not in description_lower
            and "character" not in description_lower
        ):
            if len(found_characters) == 1:
                additions.append(f"featuring {found_characters[0]}")
            else:
                char_list = ", ".join(found_characters[:-1])
                additions.append(f"featuring {char_list} and {found_characters[-1]}")

        # 3. Extract specific location/map details
        location_patterns = [
            r"\b(chapter \d+|season \d+)\b",
            r"\b(desert|hollywood|map|island)\b",
            r"\b(tilted|pleasant|retail|lazy|sweaty|coral)\b",
        ]

        found_locations = []
        for pattern in location_patterns:
            matches = re.findall(pattern, all_text_lower)
            for match in matches:
                existing_locs = [loc.lower() for loc in found_locations]
                if match not in description_lower and match not in existing_locs:
                    found_locations.append(match)

        # 4. Extract scene composition (overlooking, standing, etc.)
        composition_patterns = [
            r"(overlooking|standing on|looking at|in front of|behind)",
            r"(holding|wielding|with a|carrying)",
        ]

        for pattern in composition_patterns:
            match = re.search(pattern, all_text_lower)
            if match and match.group(1) not in description_lower:
                # Find what they're overlooking/holding
                context = all_text_lower[max(0, match.start() - 20) : match.end() + 30]
                if "map" in context and "overlooking" in match.group(1):
                    if "overlooking" not in description_lower:
                        additions.append("overlooking the map")

        # Build enriched description
        if additions:
            enriched = description.rstrip(".")
            enriched += ", " + ", ".join(additions)
            logger.info(
                f"Enriched description with conversation details: "
                f"+{len(additions)} additions"
            )
            return enriched

        return description

    def _calculate_confidence(self, response: str, method: str) -> float:
        """
        Calculate confidence score based on extraction method and response.

        Args:
            response: The coach's response
            method: The extraction method used

        Returns:
            Confidence score (0.0-1.0)
        """
        # Base confidence by method
        method_confidence = {
            "ready_marker": 0.90,
            "perfect_marker": 0.90,
            "heres_what": 0.85,
            "going_for": 0.80,
            "well_create": 0.80,
            "updated": 0.75,
            "your_vision": 0.75,
            "creating": 0.75,
            "session_context": 0.65,
            "fallback": 0.50,
            "none": 0.40,
        }

        confidence = method_confidence.get(method, 0.50)

        # Boost if ready marker is present
        if self.check_intent_ready(response):
            confidence = min(0.95, confidence + 0.10)

        # Reduce if response ends with a question
        if response.strip()[-50:].count("?") > 0:
            confidence = max(0.30, confidence - 0.15)

        return round(confidence, 2)


# Singleton instance
_intent_extractor: Optional[IntentExtractor] = None


def get_intent_extractor() -> IntentExtractor:
    """Get or create the intent extractor singleton."""
    global _intent_extractor
    if _intent_extractor is None:
        _intent_extractor = IntentExtractor()
    return _intent_extractor


__all__ = [
    "CreativeIntent",
    "IntentExtractor",
    "get_intent_extractor",
]
