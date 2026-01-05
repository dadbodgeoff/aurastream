"""
Canvas Element Intent Classification

Token-conscious classification of canvas elements for Coach → Nano Banana flow.
Automatically classifies obvious elements, only asks about ambiguous ones.

Design Principles:
1. Classify first, clarify only ambiguous
2. Compact JSON format, not verbose prose
3. Single-pass clarification for all ambiguous items
4. Structured output for Nano Banana
"""

import re
import logging
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Literal, Tuple
from enum import Enum

logger = logging.getLogger(__name__)


# =============================================================================
# Enums
# =============================================================================


class ElementIntent(str, Enum):
    """What the user intends for this element."""
    KEEP_ASSET = "keep_asset"           # Keep this asset visible as-is
    DISPLAY_TEXT = "display_text"       # Show as text on final image
    RENDER_SCENE = "render_scene"       # Generate this as visual content
    INSTRUCTION = "instruction"         # Instruction for AI, don't display
    PLACEMENT_HINT = "placement_hint"   # Indicates where something goes
    REGION_MARKER = "region_marker"     # Marks an area for content
    KEEP_DECORATION = "keep_decoration" # Keep decorative element
    AMBIGUOUS = "ambiguous"             # Needs user clarification


class PositionRegion(str, Enum):
    """Human-readable position regions."""
    TOP_LEFT = "top-left"
    TOP_CENTER = "top-center"
    TOP_RIGHT = "top-right"
    CENTER_LEFT = "center-left"
    CENTER = "center"
    CENTER_RIGHT = "center-right"
    BOTTOM_LEFT = "bottom-left"
    BOTTOM_CENTER = "bottom-center"
    BOTTOM_RIGHT = "bottom-right"
    FULL = "full"


# =============================================================================
# Data Classes
# =============================================================================


@dataclass
class ClassifiedElement:
    """A canvas element with its classified intent."""
    element_id: str
    element_type: str  # image, text, arrow, rectangle, etc.
    
    # Original data
    content: Optional[str] = None  # Text content or asset name
    position: Optional[Tuple[float, float]] = None  # (x, y) percentage
    size: Optional[Tuple[float, float]] = None  # (width, height) percentage
    
    # Classification
    intent: ElementIntent = ElementIntent.AMBIGUOUS
    confidence: float = 0.5
    
    # Clarification
    needs_clarification: bool = False
    clarification_question: Optional[str] = None
    user_response: Optional[str] = None
    
    # For render intents
    render_description: Optional[str] = None
    
    # Position
    region: Optional[PositionRegion] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "element_id": self.element_id,
            "element_type": self.element_type,
            "content": self.content,
            "position": self.position,
            "size": self.size,
            "intent": self.intent.value,
            "confidence": self.confidence,
            "needs_clarification": self.needs_clarification,
            "clarification_question": self.clarification_question,
            "user_response": self.user_response,
            "render_description": self.render_description,
            "region": self.region.value if self.region else None,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ClassifiedElement":
        return cls(
            element_id=data["element_id"],
            element_type=data["element_type"],
            content=data.get("content"),
            position=tuple(data["position"]) if data.get("position") else None,
            size=tuple(data["size"]) if data.get("size") else None,
            intent=ElementIntent(data.get("intent", "ambiguous")),
            confidence=data.get("confidence", 0.5),
            needs_clarification=data.get("needs_clarification", False),
            clarification_question=data.get("clarification_question"),
            user_response=data.get("user_response"),
            render_description=data.get("render_description"),
            region=PositionRegion(data["region"]) if data.get("region") else None,
        )


@dataclass
class CanvasIntentSchema:
    """Complete canvas interpretation with all classified elements."""
    
    # Canvas metadata
    canvas_type: str  # youtube_thumbnail, twitch_banner, etc.
    dimensions: Tuple[int, int]  # (width, height)
    snapshot_url: Optional[str] = None
    
    # Classified elements
    elements: List[ClassifiedElement] = field(default_factory=list)
    
    # Output categories (populated after classification)
    base_layer: Optional[ClassifiedElement] = None
    display_texts: List[ClassifiedElement] = field(default_factory=list)
    render_elements: List[ClassifiedElement] = field(default_factory=list)
    style_instructions: List[str] = field(default_factory=list)
    ignored_elements: List[str] = field(default_factory=list)
    
    # State
    all_clarified: bool = False
    
    def get_ambiguous_elements(self) -> List[ClassifiedElement]:
        """Get elements that need clarification."""
        return [e for e in self.elements if e.needs_clarification and not e.user_response]
    
    def is_ready(self) -> bool:
        """Check if all ambiguous elements have been clarified."""
        return len(self.get_ambiguous_elements()) == 0
    
    def generate_clarification_message(self) -> Optional[str]:
        """Generate a compact clarification message for ambiguous elements."""
        ambiguous = self.get_ambiguous_elements()
        if not ambiguous:
            return None
        
        questions = []
        for i, elem in enumerate(ambiguous, 1):
            if elem.clarification_question:
                questions.append(f"{i}. {elem.clarification_question}")
        
        if not questions:
            return None
        
        return "Quick check:\n" + "\n".join(questions)
    
    def to_nano_banana_prompt(self) -> str:
        """Generate compact prompt for Nano Banana with quality prefix."""
        # Quality prefix - sets expectations for studio-level output
        asset_type_quality = {
            "youtube_thumbnail": "4K studio-quality YouTube gaming thumbnail",
            "thumbnail": "4K studio-quality gaming thumbnail",
            "twitch_banner": "Professional Twitch channel banner",
            "twitch_emote": "Crisp high-detail Twitch emote",
            "twitch_badge": "Clean professional Twitch badge",
            "twitch_panel": "Polished Twitch panel graphic",
            "twitch_offline": "Professional Twitch offline screen",
            "overlay": "Clean broadcast-ready stream overlay",
            "banner": "Professional gaming banner",
            "story_graphic": "Eye-catching vertical story graphic",
        }
        
        quality_prefix = asset_type_quality.get(
            self.canvas_type, 
            f"Professional {self.canvas_type.replace('_', ' ')}"
        )
        
        lines = [f"{quality_prefix}, {self.dimensions[0]}x{self.dimensions[1]}:"]
        
        # Base layer
        if self.base_layer:
            lines.append(f"- BG: {self.base_layer.content} (keep)")
        
        # Display texts
        for elem in self.display_texts:
            region = elem.region.value if elem.region else "center"
            lines.append(f'- Text "{elem.content}" {region}')
        
        # Render elements
        for elem in self.render_elements:
            region = elem.region.value if elem.region else "center"
            desc = elem.render_description or elem.content
            lines.append(f"- Render: {desc}, {region}")
        
        # Style
        if self.style_instructions:
            lines.append(f"- Style: {', '.join(self.style_instructions)}")
        
        return "\n".join(lines)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "canvas_type": self.canvas_type,
            "dimensions": self.dimensions,
            "snapshot_url": self.snapshot_url,
            "elements": [e.to_dict() for e in self.elements],
            "base_layer": self.base_layer.to_dict() if self.base_layer else None,
            "display_texts": [e.to_dict() for e in self.display_texts],
            "render_elements": [e.to_dict() for e in self.render_elements],
            "style_instructions": self.style_instructions,
            "ignored_elements": self.ignored_elements,
            "all_clarified": self.all_clarified,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CanvasIntentSchema":
        return cls(
            canvas_type=data["canvas_type"],
            dimensions=tuple(data["dimensions"]),
            snapshot_url=data.get("snapshot_url"),
            elements=[ClassifiedElement.from_dict(e) for e in data.get("elements", [])],
            base_layer=ClassifiedElement.from_dict(data["base_layer"]) if data.get("base_layer") else None,
            display_texts=[ClassifiedElement.from_dict(e) for e in data.get("display_texts", [])],
            render_elements=[ClassifiedElement.from_dict(e) for e in data.get("render_elements", [])],
            style_instructions=data.get("style_instructions", []),
            ignored_elements=data.get("ignored_elements", []),
            all_clarified=data.get("all_clarified", False),
        )


# =============================================================================
# Classification Logic
# =============================================================================


def pos_to_region(x: float, y: float) -> PositionRegion:
    """Convert percentage position to human-readable region."""
    col = "left" if x < 33 else "right" if x > 66 else "center"
    row = "top" if y < 33 else "bottom" if y > 66 else "center"
    
    if row == "center" and col == "center":
        return PositionRegion.CENTER
    if row == "center":
        return PositionRegion(f"center-{col}")
    if col == "center":
        return PositionRegion(f"{row}-center")
    return PositionRegion(f"{row}-{col}")


# Patterns for text classification
INSTRUCTION_PATTERNS = [
    r"^make\s",
    r"^add\s",
    r"^create\s",
    r"^render\s",
    r"^put\s",
    r"^place\s",
    r"^show\s",
    r"^include\s",
    r"more\s+\w+$",  # "more dramatic", "more epic"
]

PLACEMENT_HINT_PATTERNS = [
    r"\s+here$",
    r"\s+there$",
    r"^here\s+",
    r"^put\s+\w+\s+here",
]

TITLE_PATTERNS = [
    r"^[A-Z][A-Z\s\d!?]+[!?]$",  # ALL CAPS with punctuation
    r"^[A-Z][A-Z\s\d]+[!?]+$",   # ALL CAPS ending with !?
]


def classify_text_element(content: str) -> Tuple[ElementIntent, float, Optional[str]]:
    """
    Classify a text element's intent.
    
    Returns: (intent, confidence, clarification_question)
    
    ENHANCED: Now asks clarification questions about styling for display text.
    """
    content_lower = content.lower().strip()
    content_stripped = content.strip()
    
    # High confidence: ALL CAPS with punctuation = title
    # BUT still ask about styling preferences
    for pattern in TITLE_PATTERNS:
        if re.match(pattern, content_stripped):
            # Title detected - ask about styling preferences
            question = f'Title "{content_stripped}" detected. How should it look? (e.g., bold with glow, neon outline, 3D effect, or keep simple?)'
            return (ElementIntent.DISPLAY_TEXT, 0.85, question)  # Lower confidence to trigger clarification
    
    # High confidence: Imperative instruction verbs
    for pattern in INSTRUCTION_PATTERNS:
        if re.search(pattern, content_lower):
            return (ElementIntent.INSTRUCTION, 0.9, None)
    
    # Medium confidence: "[thing] here" pattern
    for pattern in PLACEMENT_HINT_PATTERNS:
        if re.search(pattern, content_lower):
            # Extract the thing to place
            thing = re.sub(r"\s*(here|there)$", "", content_stripped, flags=re.IGNORECASE).strip()
            question = f'"{content_stripped}" → render {thing} as a visual, or display as text? If rendering, what size/position?'
            return (ElementIntent.PLACEMENT_HINT, 0.6, question)
    
    # Medium confidence: Descriptive sentence (likely render instruction)
    if " " in content_stripped and len(content_stripped) > 20:
        # Check if it describes a scene
        scene_words = ["fighting", "shooting", "holding", "standing", "with", "and"]
        if any(word in content_lower for word in scene_words):
            question = f'"{content_stripped}" → render this scene or display as text? If rendering, specify size (small/medium/large) and position.'
            return (ElementIntent.RENDER_SCENE, 0.6, question)
    
    # Short text without clear signals - likely display text but ask about styling
    if len(content_stripped) < 30 and not any(c.islower() for c in content_stripped[:3]):
        question = f'Text "{content_stripped}" - how should it be styled? (bold, outline, glow, color preference?)'
        return (ElementIntent.DISPLAY_TEXT, 0.75, question)
    
    # Ambiguous - need clarification
    question = f'"{content_stripped}" → is this a title (display as text), instruction (don\'t show), or scene to render? Please specify styling if text.'
    return (ElementIntent.AMBIGUOUS, 0.5, question)


def classify_image_element(
    asset_type: str,
    size: Optional[Tuple[float, float]],
    position: Optional[Tuple[float, float]],
    asset_name: Optional[str] = None,
) -> Tuple[ElementIntent, float, Optional[str]]:
    """
    Classify an image/asset element's intent.
    
    ENHANCED: Now asks about sizing, positioning, and effects for non-background assets.
    """
    
    # Full-size background - no questions needed
    if asset_type == "background" or (size and size[0] >= 90 and size[1] >= 90):
        return (ElementIntent.KEEP_ASSET, 1.0, None)
    
    # Character or object - user placed intentionally, but ask about sizing/effects
    if asset_type in ["character", "object", "game_skin"]:
        name_str = f'"{asset_name}"' if asset_name else "this character/object"
        question = f'{name_str} - current size looks good, or adjust? Any effects wanted? (glow, shadow, outline?)'
        return (ElementIntent.KEEP_ASSET, 0.75, question)  # Lower confidence to trigger question
    
    # Small corner placement might be reference only
    if size and size[0] < 15 and size[1] < 15:
        if position and (position[0] < 10 or position[0] > 90):
            return (ElementIntent.AMBIGUOUS, 0.6, "Keep this small asset visible or just for reference?")
    
    # Medium-sized assets - ask about positioning and effects
    if size and (15 <= size[0] <= 50 or 15 <= size[1] <= 50):
        name_str = f'"{asset_name}"' if asset_name else "this asset"
        question = f'{name_str} - size/position good? Want any effects? (glow, shadow, action pose enhancement?)'
        return (ElementIntent.KEEP_ASSET, 0.75, question)
    
    # Default: keep asset but ask about enhancements
    name_str = f'"{asset_name}"' if asset_name else "this asset"
    question = f'{name_str} - any adjustments needed? (size, position, effects like glow/shadow?)'
    return (ElementIntent.KEEP_ASSET, 0.8, question)


def classify_canvas_elements(canvas_data: Dict[str, Any]) -> CanvasIntentSchema:
    """
    Classify all elements in a canvas context.
    
    Args:
        canvas_data: Compact canvas context with assets, texts, drawings
        
    Returns:
        CanvasIntentSchema with classified elements
    """
    schema = CanvasIntentSchema(
        canvas_type=canvas_data.get("canvas", {}).get("type", "thumbnail"),
        dimensions=tuple(canvas_data.get("canvas", {}).get("size", [1280, 720])),
        snapshot_url=canvas_data.get("snapshot_url"),
    )
    
    # Classify assets
    for asset in canvas_data.get("assets", []):
        pos = None
        if asset.get("pos") and asset["pos"] != "full":
            try:
                x, y = map(float, asset["pos"].split(","))
                pos = (x, y)
            except (ValueError, AttributeError):
                pass
        
        size = None
        if asset.get("size"):
            try:
                w, h = map(float, asset["size"].replace("x", ",").split(","))
                size = (w, h)
            except (ValueError, AttributeError):
                pass
        
        intent, confidence, question = classify_image_element(
            asset.get("type", "object"),
            size,
            pos,
            asset.get("name"),  # Pass asset name for better clarification questions
        )
        
        elem = ClassifiedElement(
            element_id=asset.get("id", f"asset_{len(schema.elements)}"),
            element_type="image",
            content=asset.get("name"),
            position=pos,
            size=size,
            intent=intent,
            confidence=confidence,
            needs_clarification=confidence < 0.8,
            clarification_question=question,
            region=pos_to_region(*pos) if pos else PositionRegion.FULL,
        )
        schema.elements.append(elem)
        
        # Track base layer
        if intent == ElementIntent.KEEP_ASSET and asset.get("type") == "background":
            schema.base_layer = elem
    
    # Classify text elements
    for text in canvas_data.get("texts", []):
        pos = None
        if text.get("pos"):
            try:
                x, y = map(float, text["pos"].split(","))
                pos = (x, y)
            except (ValueError, AttributeError):
                pass
        
        content = text.get("content", "")
        intent, confidence, question = classify_text_element(content)
        
        elem = ClassifiedElement(
            element_id=text.get("id", f"text_{len(schema.elements)}"),
            element_type="text",
            content=content,
            position=pos,
            intent=intent,
            confidence=confidence,
            needs_clarification=confidence < 0.8,
            clarification_question=question,
            region=pos_to_region(*pos) if pos else PositionRegion.CENTER,
        )
        schema.elements.append(elem)
        
        # Categorize by intent
        if intent == ElementIntent.DISPLAY_TEXT:
            schema.display_texts.append(elem)
        elif intent == ElementIntent.INSTRUCTION:
            schema.style_instructions.append(content)
            schema.ignored_elements.append(content)
        elif intent == ElementIntent.RENDER_SCENE:
            elem.render_description = content
            schema.render_elements.append(elem)
    
    # Classify drawings
    for drawing in canvas_data.get("drawings", []):
        if drawing.get("type") == "arrow":
            # Arrows are placement hints
            to_pos = None
            if drawing.get("to"):
                try:
                    x, y = map(float, drawing["to"].split(","))
                    to_pos = (x, y)
                except (ValueError, AttributeError):
                    pass
            
            elem = ClassifiedElement(
                element_id=drawing.get("id", f"draw_{len(schema.elements)}"),
                element_type="arrow",
                position=to_pos,
                intent=ElementIntent.PLACEMENT_HINT,
                confidence=0.95,
                region=pos_to_region(*to_pos) if to_pos else None,
            )
            schema.elements.append(elem)
        
        elif drawing.get("type") in ["rectangle", "circle"]:
            filled = drawing.get("filled", False)
            if filled:
                # Filled shapes might be decorative or regions
                elem = ClassifiedElement(
                    element_id=drawing.get("id", f"draw_{len(schema.elements)}"),
                    element_type=drawing["type"],
                    intent=ElementIntent.AMBIGUOUS,
                    confidence=0.5,
                    needs_clarification=True,
                    clarification_question="Keep this shape or use as placement area?",
                )
            else:
                # Outline shapes are region markers
                elem = ClassifiedElement(
                    element_id=drawing.get("id", f"draw_{len(schema.elements)}"),
                    element_type=drawing["type"],
                    intent=ElementIntent.REGION_MARKER,
                    confidence=0.85,
                )
            schema.elements.append(elem)
    
    # Check if all clarified
    schema.all_clarified = schema.is_ready()
    
    return schema


def apply_clarification_response(
    schema: CanvasIntentSchema,
    response: str,
) -> CanvasIntentSchema:
    """
    Apply user's clarification response to ambiguous elements.
    
    Supports formats:
    - "1 place, 2 render" (numbered)
    - "pump shotgun there, render the fight" (descriptive)
    - "yes/no" (for single questions)
    """
    ambiguous = schema.get_ambiguous_elements()
    if not ambiguous:
        return schema
    
    response_lower = response.lower().strip()
    
    # Parse numbered responses: "1 place, 2 render"
    numbered_pattern = r"(\d+)\s*(place|render|text|display|instruction|ignore)"
    numbered_matches = re.findall(numbered_pattern, response_lower)
    
    if numbered_matches:
        for num_str, action in numbered_matches:
            idx = int(num_str) - 1
            if 0 <= idx < len(ambiguous):
                elem = ambiguous[idx]
                elem.user_response = action
                
                if action in ["place", "render"]:
                    elem.intent = ElementIntent.RENDER_SCENE
                    # Extract thing to render from content
                    if elem.content:
                        thing = re.sub(r"\s*(here|there)$", "", elem.content, flags=re.IGNORECASE)
                        elem.render_description = thing
                    schema.render_elements.append(elem)
                elif action in ["text", "display"]:
                    elem.intent = ElementIntent.DISPLAY_TEXT
                    schema.display_texts.append(elem)
                elif action in ["instruction", "ignore"]:
                    elem.intent = ElementIntent.INSTRUCTION
                    if elem.content:
                        schema.ignored_elements.append(elem.content)
                
                elem.needs_clarification = False
    
    # Single element yes/no
    elif len(ambiguous) == 1 and response_lower in ["yes", "no", "y", "n"]:
        elem = ambiguous[0]
        elem.user_response = response_lower
        
        # "yes" typically means the first option (place/render)
        if response_lower in ["yes", "y"]:
            if elem.intent == ElementIntent.PLACEMENT_HINT:
                elem.intent = ElementIntent.RENDER_SCENE
                if elem.content:
                    thing = re.sub(r"\s*(here|there)$", "", elem.content, flags=re.IGNORECASE)
                    elem.render_description = thing
                schema.render_elements.append(elem)
        else:
            elem.intent = ElementIntent.DISPLAY_TEXT
            schema.display_texts.append(elem)
        
        elem.needs_clarification = False
    
    # Descriptive response - try to match keywords
    else:
        for elem in ambiguous:
            if elem.content:
                content_words = set(elem.content.lower().split())
                response_words = set(response_lower.split())
                
                # Check for overlap
                if content_words & response_words:
                    # Look for action keywords near the match
                    if any(w in response_lower for w in ["place", "render", "generate", "create"]):
                        elem.intent = ElementIntent.RENDER_SCENE
                        elem.render_description = elem.content
                        schema.render_elements.append(elem)
                    elif any(w in response_lower for w in ["text", "display", "show", "title"]):
                        elem.intent = ElementIntent.DISPLAY_TEXT
                        schema.display_texts.append(elem)
                    
                    elem.user_response = response
                    elem.needs_clarification = False
    
    # Update all_clarified status
    schema.all_clarified = schema.is_ready()
    
    return schema


__all__ = [
    "ElementIntent",
    "PositionRegion",
    "ClassifiedElement",
    "CanvasIntentSchema",
    "classify_canvas_elements",
    "apply_clarification_response",
    "pos_to_region",
]
