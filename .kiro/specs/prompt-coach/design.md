# Prompt Coach - Design Document

## Overview

The Prompt Coach is a **hybrid context-first chat** that helps users craft effective prompts for asset generation. Users first select their context (brand kit, asset type, game, mood) through a structured UI, then chat with the AI which already has full context pre-loaded. This minimizes API calls while enabling natural conversation for refinement.

**Key Principle:** Pre-load all context client-side → Send rich first message → Chat for refinement.

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: CONTEXT CAPTURE (Client-Side, No API Calls)           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Select Brand Kit        [My Gaming Brand ▼]                 │
│     → Colors, fonts, tone auto-loaded                           │
│                                                                 │
│  2. Select Asset Type       [Emote] [Thumbnail] [Banner]        │
│     → Dimensions, directives auto-set                           │
│                                                                 │
│  3. Select Game (optional)  [Fortnite ▼] or [Skip]              │
│     → Triggers web search for current season                    │
│                                                                 │
│  4. Select Mood             [Hype] [Cozy] [Rage] [Custom]       │
│     → Style keywords auto-added                                 │
│                                                                 │
│  5. Describe your idea      [____________________________]      │
│     → Free text input                                           │
│                                                                 │
│                        [Start Chat →]                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ONE API call with full context
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: AI CHAT (Streaming, Context Pre-Loaded)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🤖 Coach: Based on your Fortnite hype emote idea with your     │
│     brand colors (#FF5733, #3498DB), here's my suggestion:      │
│                                                                 │
│     ```prompt                                                   │
│     Excited character celebrating victory royale, Fortnite      │
│     Chapter 5 Underground theme, using #FF5733 and #3498DB,     │
│     sticker style, expressive pose, bold outlines               │
│     ```                                                         │
│     ✓ Valid | Quality: 94%                                      │
│                                                                 │
│  You: Make the pose more dynamic, like jumping                  │
│                                                                 │
│  🤖 Coach: Updated with a jumping victory pose:                 │
│     ```prompt                                                   │
│     Character mid-jump celebrating victory royale...            │
│     ```                                                         │
│                                                                 │
│  [Type message...] [Generate Now]                               │
└─────────────────────────────────────────────────────────────────┘
```

## Architecture

### Client-Side Context Builder

The client captures all context BEFORE any API call:

```typescript
// Client-side context state (React/Swift)
interface CoachContext {
  // Brand Kit (loaded from user's saved kit)
  brandKit: {
    id: string;
    name: string;
    colors: { hex: string; name: string }[];
    tone: string;
    fonts: { headline: string; body: string };
    logoUrl?: string;
  };
  
  // Asset Type (selected by user)
  assetType: 'twitch_emote' | 'youtube_thumbnail' | 'twitch_banner' | ...;
  
  // Game Context (optional, triggers web search)
  game?: {
    id: string;
    name: string;
    needsCurrentContext: boolean;  // If true, backend will search
  };
  
  // Mood/Style (selected by user)
  mood: 'hype' | 'cozy' | 'rage' | 'chill' | 'custom';
  customMood?: string;
  
  // User's initial description
  description: string;
}

// This entire context is sent with the FIRST message
// No separate "start session" call needed
```

### Single Rich Request

Instead of multiple API calls, we send ONE request with everything:

```python
class StartCoachRequest(BaseModel):
    """First request to coach - contains ALL context."""
    
    # Pre-loaded brand kit context (client already has this)
    brand_context: BrandContext
    
    # User selections from UI
    asset_type: str
    mood: str
    custom_mood: Optional[str] = None
    
    # Game context (if selected)
    game_id: Optional[str] = None
    game_name: Optional[str] = None
    
    # User's description
    description: str

class BrandContext(BaseModel):
    """Brand kit context - sent from client, not fetched."""
    brand_kit_id: str
    colors: List[ColorInfo]
    tone: str
    fonts: FontInfo
    logo_url: Optional[str] = None
    
class ColorInfo(BaseModel):
    hex: str
    name: str
    
class FontInfo(BaseModel):
    headline: str
    body: str
```

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────┬─────────────────┬─────────────────────────────────────────┤
│   Next.js Web   │  React Native   │           SwiftUI iOS                   │
│   CoachWidget   │  CoachScreen    │           CoachView                     │
│   (SSE Stream)  │  (SSE Stream)   │           (SSE Stream)                  │
└────────┬────────┴────────┬────────┴──────────────────┬──────────────────────┘
         │                 │                           │
         └─────────────────┼───────────────────────────┘
                           │ HTTPS + SSE
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FASTAPI APPLICATION                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │     /api/v1/coach/sessions, /api/v1/coach/message (streaming)        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                 │                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    RATE LIMITER                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                 │                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    PROMPT COACH SERVICE                               │   │
│  │  start_session() │ send_message_stream() │ end_session()             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                 │                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    REFINEMENT ENGINE (NEW)                            │   │
│  │  track_suggestion() │ apply_refinement() │ get_history()             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                 │                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    OUTPUT VALIDATOR (NEW)                             │   │
│  │  validate_prompt() │ check_generation_ready() │ suggest_fixes()      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                 │                                            │
│         ┌───────────────────────┼───────────────────────┐                   │
│         │                       │                       │                   │
│         ▼                       ▼                       ▼                   │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐           │
│  │ PIPELINE ADAPTER│   │  DOMAIN SCOPER  │   │GROUNDING SERVICE│           │
│  │   REGISTRY      │   │                 │   │  (Smart Trigger)│           │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘           │
│                                 │                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    BRAND KIT CONTEXT BUILDER (NEW)                    │   │
│  │  build_aesthetic_context() │ suggest_brand_elements()                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                 │                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    SESSION MANAGER (Redis)                            │   │
│  │  + suggestion_history │ + current_prompt_draft                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## NEW: Output Validator

The Output Validator ensures Coach suggestions are actually usable before the user tries to generate.

```python
from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from enum import Enum

class ValidationSeverity(str, Enum):
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
    fixed_prompt: Optional[str] = None  # Auto-fixed version if available
    quality_score: float = 0.0  # 0-1 overall quality

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
    
    # Validation rules by category
    REQUIRED_ELEMENTS = {
        "twitch_emote": ["subject", "emotion_or_action"],
        "youtube_thumbnail": ["subject", "mood", "composition"],
        "twitch_badge": ["icon_element"],
        "default": ["subject"],
    }
    
    MAX_PROMPT_LENGTH = 500
    MIN_PROMPT_LENGTH = 10
    
    # Conflicting term pairs
    CONFLICTS = [
        (["minimalist", "simple"], ["detailed", "complex", "intricate"]),
        (["dark", "moody"], ["bright", "vibrant", "neon"]),
        (["realistic", "photorealistic"], ["cartoon", "anime", "stylized"]),
    ]
    
    def __init__(self, pipeline_adapter, brand_kit: Optional[Dict] = None):
        self.adapter = pipeline_adapter
        self.brand_kit = brand_kit
    
    def validate(
        self,
        prompt: str,
        asset_type: str,
        context: Optional[Dict] = None
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
        issues = []
        
        # Length checks
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
                message=f"Prompt exceeds {self.MAX_PROMPT_LENGTH} chars. May be truncated.",
                suggestion="Focus on the most important elements.",
                auto_fixable=True,
            ))
        
        # Required elements check
        required = self.REQUIRED_ELEMENTS.get(asset_type, self.REQUIRED_ELEMENTS["default"])
        missing = self._check_required_elements(prompt, required)
        for element in missing:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="MISSING_ELEMENT",
                message=f"Missing recommended element: {element}",
                suggestion=f"Consider adding a {element} to your prompt.",
            ))
        
        # Conflict detection
        conflicts = self._detect_conflicts(prompt)
        for conflict in conflicts:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="CONFLICTING_TERMS",
                message=f"Conflicting terms: '{conflict[0]}' vs '{conflict[1]}'",
                suggestion="Choose one style direction for better results.",
            ))
        
        # Asset type compatibility
        asset_issues = self._check_asset_compatibility(prompt, asset_type)
        issues.extend(asset_issues)
        
        # Brand kit alignment (if provided)
        if self.brand_kit:
            brand_issues = self._check_brand_alignment(prompt)
            issues.extend(brand_issues)
        
        # Calculate quality score
        error_count = len([i for i in issues if i.severity == ValidationSeverity.ERROR])
        warning_count = len([i for i in issues if i.severity == ValidationSeverity.WARNING])
        quality_score = max(0, 1.0 - (error_count * 0.3) - (warning_count * 0.1))
        
        # Auto-fix if possible
        fixed_prompt = self._auto_fix(prompt, issues) if any(i.auto_fixable for i in issues) else None
        
        return ValidationResult(
            is_valid=error_count == 0,
            is_generation_ready=error_count == 0 and warning_count <= 2,
            issues=issues,
            fixed_prompt=fixed_prompt,
            quality_score=quality_score,
        )
    
    def _check_required_elements(self, prompt: str, required: List[str]) -> List[str]:
        """Check for missing required elements."""
        prompt_lower = prompt.lower()
        missing = []
        
        element_indicators = {
            "subject": ["character", "person", "mascot", "logo", "icon", "object"],
            "emotion_or_action": ["happy", "sad", "angry", "excited", "waving", "jumping", "laughing"],
            "mood": ["energetic", "calm", "intense", "cozy", "dramatic", "playful"],
            "composition": ["close-up", "wide shot", "centered", "dynamic", "action"],
            "icon_element": ["crown", "star", "heart", "badge", "symbol", "emblem"],
        }
        
        for element in required:
            indicators = element_indicators.get(element, [])
            if not any(ind in prompt_lower for ind in indicators):
                # Check if element name itself is present
                if element.replace("_", " ") not in prompt_lower:
                    missing.append(element)
        
        return missing
    
    def _detect_conflicts(self, prompt: str) -> List[tuple]:
        """Detect conflicting style terms."""
        prompt_lower = prompt.lower()
        conflicts = []
        
        for group_a, group_b in self.CONFLICTS:
            found_a = [t for t in group_a if t in prompt_lower]
            found_b = [t for t in group_b if t in prompt_lower]
            if found_a and found_b:
                conflicts.append((found_a[0], found_b[0]))
        
        return conflicts
    
    def _check_asset_compatibility(self, prompt: str, asset_type: str) -> List[ValidationIssue]:
        """Check if prompt is compatible with asset type."""
        issues = []
        prompt_lower = prompt.lower()
        
        # Emotes shouldn't have complex backgrounds
        if asset_type in ["twitch_emote", "twitch_badge"]:
            if any(term in prompt_lower for term in ["background", "landscape", "scene"]):
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.INFO,
                    code="EMOTE_BACKGROUND",
                    message="Emotes work best with simple/no backgrounds.",
                    suggestion="Focus on the character/icon. Background will be removed.",
                ))
        
        # Thumbnails need high contrast
        if asset_type == "youtube_thumbnail":
            if "subtle" in prompt_lower or "muted" in prompt_lower:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    code="THUMBNAIL_LOW_CONTRAST",
                    message="Thumbnails need high contrast to stand out.",
                    suggestion="Use bold colors and clear subjects for better CTR.",
                ))
        
        return issues
    
    def _check_brand_alignment(self, prompt: str) -> List[ValidationIssue]:
        """Check if prompt aligns with brand kit."""
        issues = []
        prompt_lower = prompt.lower()
        
        # Check if brand colors are mentioned when they should be
        colors = self.brand_kit.get("colors_extended", {})
        primary_colors = colors.get("primary", [])
        
        if primary_colors:
            color_names = [c.get("name", "").lower() for c in primary_colors]
            color_hexes = [c.get("hex", "").lower() for c in primary_colors]
            
            # Check for conflicting colors
            conflicting_colors = ["red", "blue", "green", "yellow", "purple", "orange"]
            for color in conflicting_colors:
                if color in prompt_lower and color not in " ".join(color_names):
                    issues.append(ValidationIssue(
                        severity=ValidationSeverity.INFO,
                        code="OFF_BRAND_COLOR",
                        message=f"'{color}' isn't in your brand palette.",
                        suggestion=f"Consider using your brand colors: {', '.join(color_names[:3])}",
                    ))
                    break
        
        return issues
    
    def _auto_fix(self, prompt: str, issues: List[ValidationIssue]) -> str:
        """Apply auto-fixes where possible."""
        fixed = prompt
        
        for issue in issues:
            if not issue.auto_fixable:
                continue
            
            if issue.code == "PROMPT_TOO_LONG":
                fixed = fixed[:self.MAX_PROMPT_LENGTH]
        
        return fixed
```



## NEW: Refinement Engine

Tracks suggestion history so users can iteratively refine prompts ("make the neon brighter").

```python
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime

@dataclass
class PromptSuggestion:
    """A single prompt suggestion in the refinement history."""
    version: int
    prompt: str
    timestamp: float
    refinement_request: Optional[str] = None  # What user asked to change
    changes_made: List[str] = field(default_factory=list)  # What was changed
    brand_elements_used: List[str] = field(default_factory=list)

@dataclass
class RefinementContext:
    """Context for refinement operations."""
    current_prompt: str
    history: List[PromptSuggestion]
    brand_kit: Optional[Dict] = None
    asset_type: Optional[str] = None

class RefinementEngine:
    """
    Tracks prompt suggestions and enables iterative refinement.
    
    Key capabilities:
    - Remembers all previous suggestions in session
    - Understands relative refinements ("brighter", "more", "less")
    - Tracks what brand elements were used
    - Can revert to previous versions
    """
    
    # Relative refinement keywords and their meanings
    REFINEMENT_MODIFIERS = {
        # Intensity modifiers
        "more": {"action": "increase", "amount": 1.5},
        "much more": {"action": "increase", "amount": 2.0},
        "less": {"action": "decrease", "amount": 0.5},
        "much less": {"action": "decrease", "amount": 0.25},
        "slightly": {"action": "adjust", "amount": 1.2},
        
        # Color modifiers
        "brighter": {"target": "color", "action": "increase_brightness"},
        "darker": {"target": "color", "action": "decrease_brightness"},
        "more saturated": {"target": "color", "action": "increase_saturation"},
        "more vibrant": {"target": "color", "action": "increase_saturation"},
        "muted": {"target": "color", "action": "decrease_saturation"},
        
        # Style modifiers
        "bolder": {"target": "style", "action": "increase_intensity"},
        "subtler": {"target": "style", "action": "decrease_intensity"},
        "cleaner": {"target": "style", "action": "simplify"},
        "more detailed": {"target": "style", "action": "add_detail"},
    }
    
    def __init__(self):
        self._history: List[PromptSuggestion] = []
        self._current_version = 0
    
    def track_suggestion(
        self,
        prompt: str,
        refinement_request: Optional[str] = None,
        changes_made: Optional[List[str]] = None,
        brand_elements: Optional[List[str]] = None,
    ) -> PromptSuggestion:
        """
        Track a new prompt suggestion.
        
        Args:
            prompt: The suggested prompt
            refinement_request: What the user asked to change (if refinement)
            changes_made: List of changes from previous version
            brand_elements: Brand kit elements used in this prompt
            
        Returns:
            The tracked PromptSuggestion
        """
        self._current_version += 1
        
        suggestion = PromptSuggestion(
            version=self._current_version,
            prompt=prompt,
            timestamp=datetime.now().timestamp(),
            refinement_request=refinement_request,
            changes_made=changes_made or [],
            brand_elements_used=brand_elements or [],
        )
        
        self._history.append(suggestion)
        return suggestion
    
    def get_current(self) -> Optional[PromptSuggestion]:
        """Get the current (latest) suggestion."""
        return self._history[-1] if self._history else None
    
    def get_history(self) -> List[PromptSuggestion]:
        """Get full suggestion history."""
        return self._history.copy()
    
    def get_version(self, version: int) -> Optional[PromptSuggestion]:
        """Get a specific version."""
        for s in self._history:
            if s.version == version:
                return s
        return None
    
    def revert_to(self, version: int) -> Optional[PromptSuggestion]:
        """Revert to a previous version (keeps history)."""
        target = self.get_version(version)
        if target:
            return self.track_suggestion(
                prompt=target.prompt,
                refinement_request=f"Reverted to version {version}",
                changes_made=["Reverted to previous version"],
            )
        return None
    
    def parse_refinement(self, user_request: str) -> Dict[str, Any]:
        """
        Parse a refinement request to understand what to change.
        
        Args:
            user_request: User's refinement request (e.g., "make the neon brighter")
            
        Returns:
            Parsed refinement intent
        """
        request_lower = user_request.lower()
        
        parsed = {
            "modifiers": [],
            "targets": [],
            "raw_request": user_request,
        }
        
        # Find modifiers
        for modifier, config in self.REFINEMENT_MODIFIERS.items():
            if modifier in request_lower:
                parsed["modifiers"].append({
                    "keyword": modifier,
                    **config
                })
        
        # Extract targets (what to modify)
        # Look for "the X" patterns
        import re
        target_patterns = [
            r"the (\w+)",
            r"make (?:it |the )?(\w+)",
            r"(\w+) color",
            r"(\w+) style",
        ]
        
        for pattern in target_patterns:
            matches = re.findall(pattern, request_lower)
            parsed["targets"].extend(matches)
        
        # Remove common words from targets
        stop_words = {"it", "the", "a", "an", "more", "less", "much", "very"}
        parsed["targets"] = [t for t in parsed["targets"] if t not in stop_words]
        
        return parsed
    
    def build_refinement_context(self, brand_kit: Optional[Dict] = None) -> RefinementContext:
        """Build context for LLM refinement."""
        current = self.get_current()
        return RefinementContext(
            current_prompt=current.prompt if current else "",
            history=self._history,
            brand_kit=brand_kit,
        )
    
    def format_history_for_llm(self) -> str:
        """Format history as context for LLM."""
        if not self._history:
            return "No previous suggestions yet."
        
        lines = ["Previous prompt suggestions:"]
        for s in self._history[-5:]:  # Last 5 versions
            lines.append(f"\nVersion {s.version}:")
            lines.append(f"  Prompt: {s.prompt[:100]}...")
            if s.refinement_request:
                lines.append(f"  User asked: {s.refinement_request}")
            if s.changes_made:
                lines.append(f"  Changes: {', '.join(s.changes_made)}")
        
        return "\n".join(lines)
```

## NEW: Brand Kit Context Builder

Deep integration with Brand Kit to actively use brand aesthetics in suggestions.

```python
from dataclasses import dataclass
from typing import List, Optional, Dict, Any

@dataclass
class BrandAesthetic:
    """Extracted brand aesthetic for prompt suggestions."""
    color_palette: List[str]  # Hex codes
    color_names: List[str]    # Human-readable names
    color_mood: str           # "warm", "cool", "vibrant", "muted"
    typography_style: str     # "bold", "elegant", "playful", "clean"
    tone: str                 # Brand voice tone
    personality: List[str]    # Personality traits
    style_keywords: List[str] # Keywords to inject into prompts

class BrandKitContextBuilder:
    """
    Builds rich brand context for Coach suggestions.
    
    Extracts actionable aesthetic information from Brand Kit
    and provides it to the LLM in a usable format.
    """
    
    # Map brand tones to visual style keywords
    TONE_TO_STYLE = {
        "competitive": ["dynamic", "intense", "bold", "action-packed", "high-energy"],
        "casual": ["relaxed", "friendly", "approachable", "warm", "inviting"],
        "educational": ["clean", "professional", "clear", "informative", "structured"],
        "comedic": ["playful", "fun", "colorful", "quirky", "expressive"],
        "professional": ["sleek", "modern", "minimal", "sophisticated", "polished"],
        "inspirational": ["uplifting", "bright", "motivational", "positive", "empowering"],
        "edgy": ["dark", "bold", "dramatic", "gritty", "intense"],
        "wholesome": ["warm", "cozy", "soft", "gentle", "comforting"],
    }
    
    # Typography weight to style mapping
    WEIGHT_TO_STYLE = {
        (100, 300): "light and elegant",
        (400, 500): "clean and balanced",
        (600, 700): "bold and impactful",
        (800, 900): "ultra-bold and commanding",
    }
    
    def __init__(self, brand_kit: Dict):
        self.brand_kit = brand_kit
    
    def build_aesthetic(self) -> BrandAesthetic:
        """
        Extract brand aesthetic from brand kit.
        
        Returns:
            BrandAesthetic with all relevant style information
        """
        # Extract colors
        colors_extended = self.brand_kit.get("colors_extended", {})
        primary = colors_extended.get("primary", [])
        accent = colors_extended.get("accent", [])
        
        color_palette = [c.get("hex", "") for c in primary + accent if c.get("hex")]
        color_names = [c.get("name", "") for c in primary + accent if c.get("name")]
        color_mood = self._analyze_color_mood(color_palette)
        
        # Extract typography style
        typography = self.brand_kit.get("typography", {})
        typography_style = self._analyze_typography(typography)
        
        # Extract voice
        voice = self.brand_kit.get("voice", {})
        tone = voice.get("tone", "professional")
        personality = voice.get("personality_traits", [])
        
        # Build style keywords
        style_keywords = self._build_style_keywords(tone, color_mood, typography_style)
        
        return BrandAesthetic(
            color_palette=color_palette,
            color_names=color_names,
            color_mood=color_mood,
            typography_style=typography_style,
            tone=tone,
            personality=personality,
            style_keywords=style_keywords,
        )
    
    def build_prompt_context(self) -> str:
        """
        Build brand context string for LLM system prompt.
        
        Returns:
            Formatted brand context for injection into system prompt
        """
        aesthetic = self.build_aesthetic()
        
        lines = [
            "\n## User's Brand Identity",
            "",
            f"**Color Palette:** {', '.join(aesthetic.color_palette[:5])}",
        ]
        
        if aesthetic.color_names:
            lines.append(f"**Color Names:** {', '.join(aesthetic.color_names[:5])}")
        
        lines.extend([
            f"**Color Mood:** {aesthetic.color_mood}",
            f"**Typography:** {aesthetic.typography_style}",
            f"**Brand Tone:** {aesthetic.tone}",
        ])
        
        if aesthetic.personality:
            lines.append(f"**Personality:** {', '.join(aesthetic.personality[:3])}")
        
        lines.extend([
            "",
            "**When suggesting prompts, you MUST:**",
            f"- Reference their brand colors by name or hex: {', '.join(aesthetic.color_palette[:3])}",
            f"- Match their {aesthetic.tone} tone with {aesthetic.color_mood} visuals",
            f"- Use style keywords: {', '.join(aesthetic.style_keywords[:5])}",
            "",
        ])
        
        return "\n".join(lines)
    
    def suggest_brand_elements(self, asset_type: str) -> Dict[str, Any]:
        """
        Suggest specific brand elements for an asset type.
        
        Args:
            asset_type: The type of asset being created
            
        Returns:
            Dict with suggested brand elements to use
        """
        aesthetic = self.build_aesthetic()
        
        suggestions = {
            "colors": {
                "primary": aesthetic.color_palette[0] if aesthetic.color_palette else None,
                "accent": aesthetic.color_palette[1] if len(aesthetic.color_palette) > 1 else None,
                "recommendation": f"Use {aesthetic.color_names[0] if aesthetic.color_names else 'your primary color'} as the dominant color",
            },
            "style": {
                "keywords": aesthetic.style_keywords[:3],
                "mood": aesthetic.color_mood,
                "recommendation": f"Go for a {aesthetic.tone} feel with {aesthetic.typography_style} text",
            },
        }
        
        # Asset-specific suggestions
        if asset_type == "twitch_emote":
            suggestions["specific"] = {
                "tip": "Emotes should be expressive and readable at small sizes",
                "color_usage": "Use your primary color for the main element, accent for highlights",
            }
        elif asset_type == "youtube_thumbnail":
            suggestions["specific"] = {
                "tip": "Thumbnails need high contrast and clear focal points",
                "color_usage": "Use contrasting colors from your palette for text vs background",
            }
        
        return suggestions
    
    def _analyze_color_mood(self, colors: List[str]) -> str:
        """Analyze color palette to determine mood."""
        if not colors:
            return "neutral"
        
        # Simple heuristic based on color values
        warm_count = 0
        bright_count = 0
        
        for hex_color in colors:
            if not hex_color.startswith("#") or len(hex_color) != 7:
                continue
            
            r = int(hex_color[1:3], 16)
            g = int(hex_color[3:5], 16)
            b = int(hex_color[5:7], 16)
            
            # Warm if red/yellow dominant
            if r > b:
                warm_count += 1
            
            # Bright if high values
            if (r + g + b) / 3 > 150:
                bright_count += 1
        
        total = len(colors)
        if warm_count > total / 2 and bright_count > total / 2:
            return "warm and vibrant"
        elif warm_count > total / 2:
            return "warm"
        elif bright_count > total / 2:
            return "bright and energetic"
        else:
            return "cool and modern"
    
    def _analyze_typography(self, typography: Dict) -> str:
        """Analyze typography to determine style."""
        headline = typography.get("headline", {})
        weight = headline.get("weight", 400)
        
        for (min_w, max_w), style in self.WEIGHT_TO_STYLE.items():
            if min_w <= weight <= max_w:
                return style
        
        return "balanced"
    
    def _build_style_keywords(self, tone: str, color_mood: str, typo_style: str) -> List[str]:
        """Build list of style keywords for prompts."""
        keywords = []
        
        # Add tone-based keywords
        tone_keywords = self.TONE_TO_STYLE.get(tone, ["professional"])
        keywords.extend(tone_keywords[:3])
        
        # Add color mood
        keywords.append(color_mood)
        
        # Add typography influence
        if "bold" in typo_style:
            keywords.append("bold typography")
        elif "elegant" in typo_style:
            keywords.append("refined")
        
        return list(set(keywords))  # Dedupe
```


## Feature Access by Tier

The Prompt Coach is a **Premium-only feature**. Free and Pro users get static tips instead.

```python
from dataclasses import dataclass
from typing import List, Dict, Optional
from enum import Enum

class FeatureAccess(str, Enum):
    """Feature access levels."""
    NONE = "none"
    TIPS_ONLY = "tips_only"
    FULL = "full"

@dataclass
class TierConfig:
    """Configuration for each subscription tier."""
    coach_access: FeatureAccess
    grounding_enabled: bool
    max_sessions_per_month: int
    description: str

TIER_CONFIGS = {
    "free": TierConfig(
        coach_access=FeatureAccess.TIPS_ONLY,
        grounding_enabled=False,
        max_sessions_per_month=0,
        description="Static tips and best practices only",
    ),
    "pro": TierConfig(
        coach_access=FeatureAccess.TIPS_ONLY,
        grounding_enabled=False,
        max_sessions_per_month=0,
        description="Static tips and best practices only",
    ),
    "premium": TierConfig(
        coach_access=FeatureAccess.FULL,
        grounding_enabled=True,
        max_sessions_per_month=-1,  # Unlimited
        description="Full conversational coach with web search",
    ),
}

def check_coach_access(tier: str) -> Dict:
    """Check what coach features a user can access."""
    config = TIER_CONFIGS.get(tier, TIER_CONFIGS["free"])
    
    if config.coach_access == FeatureAccess.FULL:
        return {
            "has_access": True,
            "feature": "full_coach",
            "grounding": True,
        }
    else:
        return {
            "has_access": False,
            "feature": "tips_only",
            "upgrade_message": "Upgrade to Premium for the full Prompt Coach experience with AI assistance and real-time game context.",
        }
```

## Static Tips Service (Free/Pro Users)

Free and Pro users get curated tips instead of the conversational coach.

```python
from dataclasses import dataclass
from typing import List, Dict, Optional

@dataclass
class PromptTip:
    """A static prompt tip."""
    id: str
    title: str
    description: str
    example_prompt: str
    asset_types: List[str]  # Which asset types this applies to
    category: str  # "style", "composition", "color", "gaming"

class StaticTipsService:
    """
    Provides static tips and best practices for Free/Pro users.
    
    This is the fallback when users don't have Premium access
    to the full conversational Prompt Coach.
    """
    
    TIPS: List[PromptTip] = [
        # Style tips
        PromptTip(
            id="style_001",
            title="Be Specific About Style",
            description="Instead of 'cool style', specify the exact aesthetic you want.",
            example_prompt="3D render style, vibrant neon colors, cyberpunk aesthetic",
            asset_types=["all"],
            category="style",
        ),
        PromptTip(
            id="style_002",
            title="Use Your Brand Colors",
            description="Include your exact hex codes for consistent branding.",
            example_prompt="Using brand colors #FF5733 and #3498DB as primary palette",
            asset_types=["all"],
            category="color",
        ),
        # Emote-specific tips
        PromptTip(
            id="emote_001",
            title="Keep Emotes Simple",
            description="Emotes are viewed at tiny sizes. Simple, bold designs work best.",
            example_prompt="Simple expressive face, bold outlines, single emotion, sticker style",
            asset_types=["twitch_emote"],
            category="composition",
        ),
        PromptTip(
            id="emote_002",
            title="Focus on Expression",
            description="The emotion should be instantly readable even at 28x28 pixels.",
            example_prompt="Exaggerated happy expression, wide smile, sparkle eyes",
            asset_types=["twitch_emote"],
            category="composition",
        ),
        # Thumbnail tips
        PromptTip(
            id="thumb_001",
            title="High Contrast is Key",
            description="Thumbnails compete for attention. Use bold, contrasting colors.",
            example_prompt="High contrast, bold colors, dramatic lighting, eye-catching",
            asset_types=["youtube_thumbnail"],
            category="style",
        ),
        PromptTip(
            id="thumb_002",
            title="Leave Space for Text",
            description="Don't fill the entire frame - leave room for your title overlay.",
            example_prompt="Subject on left side, negative space on right for text overlay",
            asset_types=["youtube_thumbnail"],
            category="composition",
        ),
        # Gaming context tips
        PromptTip(
            id="game_001",
            title="Reference Current Seasons",
            description="Mention the current game season or event for timely content.",
            example_prompt="Fortnite Chapter 5 Season 1 themed, current battle pass aesthetic",
            asset_types=["all"],
            category="gaming",
        ),
        PromptTip(
            id="game_002",
            title="Match Game Aesthetics",
            description="Each game has a visual style. Match it for authenticity.",
            example_prompt="Valorant art style, clean geometric shapes, tactical aesthetic",
            asset_types=["all"],
            category="gaming",
        ),
    ]
    
    def get_tips_for_asset_type(self, asset_type: str) -> List[PromptTip]:
        """Get relevant tips for an asset type."""
        return [
            tip for tip in self.TIPS
            if asset_type in tip.asset_types or "all" in tip.asset_types
        ]
    
    def get_tips_by_category(self, category: str) -> List[PromptTip]:
        """Get tips by category."""
        return [tip for tip in self.TIPS if tip.category == category]
    
    def get_random_tips(self, count: int = 3) -> List[PromptTip]:
        """Get random tips for display."""
        import random
        return random.sample(self.TIPS, min(count, len(self.TIPS)))
    
    def format_tips_response(self, asset_type: str) -> Dict:
        """Format tips for API response."""
        tips = self.get_tips_for_asset_type(asset_type)
        return {
            "feature": "tips_only",
            "tips": [
                {
                    "id": tip.id,
                    "title": tip.title,
                    "description": tip.description,
                    "example": tip.example_prompt,
                }
                for tip in tips[:5]  # Max 5 tips
            ],
            "upgrade_cta": {
                "message": "Want personalized prompt help? Upgrade to Premium for the full Prompt Coach.",
                "feature_highlights": [
                    "AI-powered conversational assistance",
                    "Real-time game season context",
                    "Iterative prompt refinement",
                    "Brand-aware suggestions",
                ],
            },
        }
```

## Grounding Strategy (Premium Only - LLM Self-Assessment)

The LLM decides if it needs web search. This prevents hallucination while avoiding unnecessary searches.

```python
from dataclasses import dataclass
from typing import Optional, List
from enum import Enum
import json

class ConfidenceLevel(str, Enum):
    """LLM's confidence in answering without search."""
    HIGH = "high"           # Can answer confidently, no search needed
    MEDIUM = "medium"       # Probably okay, but search would help
    LOW = "low"             # Likely to hallucinate, must search
    UNKNOWN = "unknown"     # Can't assess, default to search

@dataclass
class GroundingAssessment:
    """LLM's self-assessment on whether it needs grounding."""
    needs_search: bool
    confidence: ConfidenceLevel
    reason: str
    suggested_query: Optional[str] = None
    knowledge_cutoff_issue: bool = False

@dataclass
class GroundingDecision:
    """Final decision on whether to ground."""
    should_ground: bool
    query: Optional[str] = None
    reason: Optional[str] = None
    assessment: Optional[GroundingAssessment] = None

class GroundingStrategy:
    """
    LLM-driven grounding decision.
    
    Instead of hardcoded rules, we ask the LLM:
    "Can you answer this confidently, or do you need current info?"
    
    The LLM knows:
    - Its knowledge cutoff date
    - What topics change frequently (game seasons, events)
    - When it's uncertain vs confident
    
    This prevents hallucination while avoiding unnecessary searches.
    """
    
    ASSESSMENT_PROMPT = '''You are assessing whether you need web search to answer a user's question about creating gaming/streaming assets.

User message: "{message}"

Assess your confidence in answering WITHOUT web search. Consider:
1. Is this about current/recent game content (seasons, events, updates)?
2. Is this about specific dates, versions, or time-sensitive info?
3. Could your knowledge be outdated for this topic?
4. Is this a general style/design question you can answer confidently?

Respond with JSON only:
{{
    "needs_search": true/false,
    "confidence": "high" | "medium" | "low",
    "reason": "brief explanation",
    "suggested_query": "search query if needed, null otherwise",
    "knowledge_cutoff_issue": true/false
}}

Examples:
- "Make me a Fortnite thumbnail" → needs_search: true (current season matters)
- "Make the colors more vibrant" → needs_search: false (style refinement)
- "What's the current Apex season?" → needs_search: true (time-sensitive)
- "I want a cozy emote style" → needs_search: false (general style)
- "Valorant Episode 8 themed" → needs_search: true (specific version)
'''

    # Skip assessment entirely for these (obvious no-search)
    SKIP_ASSESSMENT_PATTERNS = [
        r"^(yes|no|ok|sure|thanks|perfect|great)",  # Confirmations
        r"^make it (more|less|brighter|darker|bolder)",  # Refinements
        r"^(change|adjust|tweak) the",  # Modifications
        r"^use my brand",  # Brand reference
    ]
    
    def __init__(self, llm_client):
        self.llm = llm_client
        self._assessment_cache = {}  # Cache assessments for similar queries
    
    async def should_ground(
        self, 
        message: str, 
        is_premium: bool,
        session_context: Optional[str] = None,
    ) -> GroundingDecision:
        """
        Decide if this message needs web search grounding.
        
        Uses LLM self-assessment to determine if it can answer
        confidently or if it risks hallucinating.
        """
        if not is_premium:
            return GroundingDecision(
                should_ground=False,
                reason="Grounding requires Premium",
            )
        
        message_lower = message.lower().strip()
        
        # Skip assessment for obvious no-search cases
        import re
        for pattern in self.SKIP_ASSESSMENT_PATTERNS:
            if re.match(pattern, message_lower):
                return GroundingDecision(
                    should_ground=False,
                    reason="Refinement/confirmation - no search needed",
                )
        
        # Check cache for similar queries
        cache_key = self._cache_key(message)
        if cache_key in self._assessment_cache:
            cached = self._assessment_cache[cache_key]
            return GroundingDecision(
                should_ground=cached.needs_search,
                query=cached.suggested_query,
                reason=f"Cached: {cached.reason}",
                assessment=cached,
            )
        
        # Ask LLM to self-assess
        assessment = await self._assess_grounding_need(message)
        
        # Cache the assessment
        self._assessment_cache[cache_key] = assessment
        
        return GroundingDecision(
            should_ground=assessment.needs_search,
            query=assessment.suggested_query,
            reason=assessment.reason,
            assessment=assessment,
        )
    
    async def _assess_grounding_need(self, message: str) -> GroundingAssessment:
        """Ask LLM if it needs search to answer this message."""
        prompt = self.ASSESSMENT_PROMPT.format(message=message)
        
        try:
            response = await self.llm.chat([
                {"role": "system", "content": "You assess grounding needs. Respond with JSON only."},
                {"role": "user", "content": prompt},
            ], max_tokens=200)
            
            # Parse JSON response
            data = json.loads(response.content)
            
            return GroundingAssessment(
                needs_search=data.get("needs_search", True),
                confidence=ConfidenceLevel(data.get("confidence", "low")),
                reason=data.get("reason", "Assessment completed"),
                suggested_query=data.get("suggested_query"),
                knowledge_cutoff_issue=data.get("knowledge_cutoff_issue", False),
            )
            
        except (json.JSONDecodeError, Exception) as e:
            # If assessment fails, default to searching (safer)
            return GroundingAssessment(
                needs_search=True,
                confidence=ConfidenceLevel.UNKNOWN,
                reason=f"Assessment failed, defaulting to search: {str(e)}",
                suggested_query=self._fallback_query(message),
                knowledge_cutoff_issue=True,
            )
    
    def _cache_key(self, message: str) -> str:
        """Generate cache key for message."""
        # Normalize message for caching
        import hashlib
        normalized = " ".join(message.lower().split())
        return hashlib.sha256(normalized.encode()).hexdigest()[:16]
    
    def _fallback_query(self, message: str) -> str:
        """Build fallback search query if assessment fails."""
        stop_words = {"i", "want", "to", "make", "create", "a", "an", "the", "for", "my"}
        words = [w for w in message.lower().split() if w not in stop_words and len(w) > 2]
        return " ".join(words[:5]) + " gaming 2024"


class GroundingOrchestrator:
    """
    Orchestrates the grounding flow:
    1. Quick pattern check (skip obvious cases)
    2. LLM self-assessment (should I search?)
    3. If yes: search, then answer with context
    4. If no: answer directly
    """
    
    def __init__(self, strategy: GroundingStrategy, search_service):
        self.strategy = strategy
        self.search = search_service
    
    async def process_with_grounding(
        self,
        message: str,
        is_premium: bool,
        llm_client,
        system_prompt: str,
        conversation_history: list,
    ) -> dict:
        """
        Process a message with intelligent grounding.
        
        Returns:
            {
                "grounded": bool,
                "search_query": str or None,
                "search_results": str or None,
                "assessment": GroundingAssessment or None,
            }
        """
        # Step 1: Decide if we need grounding
        decision = await self.strategy.should_ground(message, is_premium)
        
        result = {
            "grounded": False,
            "search_query": None,
            "search_results": None,
            "assessment": decision.assessment,
        }
        
        if not decision.should_ground:
            return result
        
        # Step 2: Perform search
        if decision.query:
            search_results = await self.search.search(
                query=decision.query,
                max_results=3,
            )
            
            if search_results:
                result["grounded"] = True
                result["search_query"] = decision.query
                result["search_results"] = self._format_results(search_results)
        
        return result
    
    def _format_results(self, results: list) -> str:
        """Format search results for injection into context."""
        formatted = ["Current information from web search:"]
        for r in results[:3]:
            formatted.append(f"- {r.title}: {r.snippet[:200]}")
        return "\n".join(formatted)
```

## NEW: Streaming Response

Token-by-token streaming for better UX.

```python
from typing import AsyncGenerator, Optional, Dict, Any
from dataclasses import dataclass
import asyncio
import json

@dataclass
class StreamChunk:
    """Single chunk in a streaming response."""
    type: str  # "token", "validation", "done", "error"
    content: str
    metadata: Optional[Dict] = None

class StreamingCoachResponse:
    """
    Handles streaming responses from Coach.
    
    Streams tokens as they're generated, then sends
    validation results at the end.
    """
    
    def __init__(self, llm_client, validator: OutputValidator):
        self.llm = llm_client
        self.validator = validator
    
    async def stream_response(
        self,
        messages: list,
        asset_type: str,
        brand_kit: Optional[Dict] = None,
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Stream a coach response token by token.
        
        Yields:
            StreamChunk objects with tokens, then validation
        """
        full_response = ""
        
        # Stream tokens from LLM
        async for token in self.llm.stream_chat(messages):
            full_response += token
            yield StreamChunk(
                type="token",
                content=token,
            )
        
        # Extract prompt from response (if present)
        prompt = self._extract_prompt(full_response)
        
        # Validate if we have a prompt
        if prompt:
            validation = self.validator.validate(
                prompt=prompt,
                asset_type=asset_type,
                context={"brand_kit": brand_kit},
            )
            
            yield StreamChunk(
                type="validation",
                content="",
                metadata={
                    "is_valid": validation.is_valid,
                    "is_generation_ready": validation.is_generation_ready,
                    "quality_score": validation.quality_score,
                    "issues": [
                        {
                            "severity": i.severity.value,
                            "code": i.code,
                            "message": i.message,
                            "suggestion": i.suggestion,
                        }
                        for i in validation.issues
                    ],
                    "fixed_prompt": validation.fixed_prompt,
                },
            )
        
        # Done
        yield StreamChunk(
            type="done",
            content="",
            metadata={
                "total_tokens": len(full_response.split()),
                "has_prompt": prompt is not None,
            },
        )
    
    def _extract_prompt(self, response: str) -> Optional[str]:
        """Extract prompt from coach response."""
        # Look for prompt markers
        markers = [
            ("```prompt", "```"),
            ("**Prompt:**", "\n\n"),
            ("Here's your prompt:", "\n\n"),
            ("Suggested prompt:", "\n\n"),
        ]
        
        for start_marker, end_marker in markers:
            if start_marker.lower() in response.lower():
                start_idx = response.lower().find(start_marker.lower()) + len(start_marker)
                end_idx = response.find(end_marker, start_idx)
                if end_idx == -1:
                    end_idx = len(response)
                return response[start_idx:end_idx].strip()
        
        return None


# FastAPI SSE endpoint
async def stream_message_endpoint(
    session_id: str,
    request: SendMessageRequest,
    coach_service: PromptCoachService,
):
    """
    SSE endpoint for streaming coach responses.
    
    Returns Server-Sent Events stream.
    """
    from fastapi.responses import StreamingResponse
    
    async def event_generator():
        async for chunk in coach_service.send_message_stream(
            session_id=session_id,
            user_message=request.message,
            use_grounding=request.use_grounding,
        ):
            # Format as SSE
            data = json.dumps({
                "type": chunk.type,
                "content": chunk.content,
                "metadata": chunk.metadata,
            })
            yield f"data: {data}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
```


## Updated: Session Manager (with Refinement History)

```python
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import uuid

@dataclass
class CoachMessage:
    """Single message in a coach session."""
    role: str  # "user" or "assistant"
    content: str
    timestamp: float
    grounding_used: bool = False
    tokens_in: int = 0
    tokens_out: int = 0

@dataclass
class CoachSession:
    """Coach conversation session with refinement tracking."""
    session_id: str
    user_id: str
    pipeline_id: str
    brand_kit_id: Optional[str]
    messages: List[CoachMessage] = field(default_factory=list)
    turns_used: int = 0
    tokens_in_total: int = 0
    tokens_out_total: int = 0
    grounding_calls: int = 0
    created_at: float = field(default_factory=lambda: datetime.now().timestamp())
    updated_at: float = field(default_factory=lambda: datetime.now().timestamp())
    status: str = "active"
    
    # NEW: Refinement tracking
    prompt_history: List[Dict] = field(default_factory=list)  # PromptSuggestion as dicts
    current_prompt_draft: Optional[str] = None
    brand_aesthetic: Optional[Dict] = None  # Cached BrandAesthetic

class SessionManager:
    """
    Manages coach sessions with refinement history.
    """
    
    SESSION_TTL = 1800  # 30 minutes
    MAX_TURNS = 10
    MAX_TOKENS_IN = 5000
    MAX_TOKENS_OUT = 2000
    
    def __init__(self, redis_client):
        self.redis = redis_client
    
    async def create(
        self,
        user_id: str,
        pipeline_id: str,
        brand_kit_id: Optional[str] = None,
        brand_aesthetic: Optional[Dict] = None,
    ) -> CoachSession:
        """Create a new coach session with brand context."""
        session = CoachSession(
            session_id=str(uuid.uuid4()),
            user_id=user_id,
            pipeline_id=pipeline_id,
            brand_kit_id=brand_kit_id,
            brand_aesthetic=brand_aesthetic,
        )
        await self._save(session)
        return session
    
    async def add_prompt_suggestion(
        self,
        session_id: str,
        prompt: str,
        refinement_request: Optional[str] = None,
        changes_made: Optional[List[str]] = None,
        brand_elements: Optional[List[str]] = None,
    ) -> CoachSession:
        """Add a prompt suggestion to history."""
        session = await self.get(session_id)
        if not session:
            raise ValueError("Session not found")
        
        version = len(session.prompt_history) + 1
        suggestion = {
            "version": version,
            "prompt": prompt,
            "timestamp": datetime.now().timestamp(),
            "refinement_request": refinement_request,
            "changes_made": changes_made or [],
            "brand_elements_used": brand_elements or [],
        }
        
        session.prompt_history.append(suggestion)
        session.current_prompt_draft = prompt
        session.updated_at = datetime.now().timestamp()
        
        await self._save(session)
        return session
    
    async def get_prompt_history(self, session_id: str) -> List[Dict]:
        """Get prompt refinement history."""
        session = await self.get(session_id)
        return session.prompt_history if session else []
    
    # ... rest of SessionManager methods remain the same
```

## Updated: Prompt Coach Service (Full Integration)

```python
from typing import Optional, Dict, Any, AsyncGenerator
from dataclasses import dataclass
import time

@dataclass
class PromptOutput:
    """Final output from Prompt Coach."""
    final_prompt: str
    confidence_score: float
    metadata: Dict[str, Any]
    suggested_asset_type: Optional[str]
    keywords: list[str]
    validation: Optional[Dict] = None  # NEW: Validation results

class PromptCoachService:
    """
    Main Prompt Coach service - Hybrid Context-First Chat.
    
    Flow:
    1. Client pre-loads all context (brand kit, asset type, game, mood)
    2. Client sends ONE rich request with full context + user description
    3. Backend builds system prompt with all context pre-injected
    4. Chat continues for refinement (context already loaded)
    """
    
    SYSTEM_PROMPT_BASE = """You are a friendly prompt coach helping create {asset_type} assets.

## Pre-Loaded Context (User already selected these)
{brand_context}
{game_context}
{mood_context}

## Your Role
1. Generate a prompt suggestion based on the user's description and pre-loaded context
2. ALWAYS use their brand colors ({color_list}) in your suggestions
3. Match their {tone} brand tone
4. For refinements, modify your PREVIOUS suggestion based on their feedback

## Output Format
When suggesting a prompt, format it as:
```prompt
[Your suggested prompt here]
```

Then briefly explain why this prompt works for their {asset_type}.

## Refinement Rules
- "make it brighter/darker/bolder" → modify the previous prompt
- "more X" → increase that element
- "less X" → decrease that element
- Always show what changed from the previous version
"""
    
    def __init__(
        self,
        session_manager: SessionManager,
        grounding_service: GroundingService,
        grounding_strategy: GroundingStrategy,
        llm_client,
        validator: OutputValidator,
    ):
        self.sessions = session_manager
        self.grounding = grounding_service
        self.grounding_strategy = grounding_strategy
        self.llm = llm_client
        self.validator = validator
    
    async def start_with_context(
        self,
        user_id: str,
        request: "StartCoachRequest",
        tier: str = "premium",
    ) -> AsyncGenerator["StreamChunk", None]:
        """
        Start a coach session with pre-loaded context and stream first response.
        
        This is the ONLY entry point. Client sends full context upfront.
        No separate "start session" then "send message" - it's one call.
        """
        # Premium only
        if tier != "premium":
            yield StreamChunk(type="error", content="Prompt Coach requires Premium")
            return
        
        # Check if game needs current context (web search)
        game_context = ""
        if request.game_id and request.game_name:
            # LLM decides if it needs to search
            grounding_decision = await self.grounding_strategy.should_ground(
                message=f"{request.game_name} {request.description}",
                is_premium=True,
            )
            
            if grounding_decision.should_ground:
                yield StreamChunk(
                    type="grounding",
                    content="",
                    metadata={"searching": request.game_name},
                )
                result = await self.grounding.ground(grounding_decision.query)
                if result:
                    game_context = f"Current {request.game_name} context: {result.context}"
                    yield StreamChunk(
                        type="grounding_complete",
                        content="",
                        metadata={"context": result.context[:200]},
                    )
        
        # Build system prompt with ALL pre-loaded context
        system_prompt = self._build_system_prompt(
            brand_context=request.brand_context,
            asset_type=request.asset_type,
            mood=request.mood,
            custom_mood=request.custom_mood,
            game_context=game_context,
        )
        
        # Create session with context
        session = await self.sessions.create_with_context(
            user_id=user_id,
            brand_context=request.brand_context.dict(),
            asset_type=request.asset_type,
            mood=request.mood,
            game_context=game_context,
        )
        
        # Build first user message (combines their description with context)
        first_message = self._build_first_message(request)
        
        # Stream response
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": first_message},
        ]
        
        full_response = ""
        async for token in self.llm.stream_chat(messages):
            full_response += token
            yield StreamChunk(type="token", content=token)
        
        # Extract and validate prompt
        prompt = self._extract_prompt(full_response)
        if prompt:
            await self.sessions.add_prompt_suggestion(session.session_id, prompt)
            
            validation = self.validator.validate(
                prompt=prompt,
                asset_type=request.asset_type,
                context={"brand_context": request.brand_context.dict()},
            )
            
            yield StreamChunk(
                type="validation",
                content="",
                metadata={
                    "is_valid": validation.is_valid,
                    "quality_score": validation.quality_score,
                    "issues": [{"severity": i.severity.value, "message": i.message} for i in validation.issues],
                },
            )
        
        # Save messages
        await self.sessions.add_message(session.session_id, CoachMessage(
            role="user", content=first_message, timestamp=time.time()
        ))
        await self.sessions.add_message(session.session_id, CoachMessage(
            role="assistant", content=full_response, timestamp=time.time()
        ))
        
        yield StreamChunk(
            type="done",
            content="",
            metadata={"session_id": session.session_id},
        )
    
    async def continue_chat(
        self,
        session_id: str,
        user_message: str,
    ) -> AsyncGenerator["StreamChunk", None]:
        """
        Continue an existing chat session for refinement.
        
        Context is already loaded from start_with_context.
        """
        session = await self.sessions.get(session_id)
        if not session:
            yield StreamChunk(type="error", content="Session not found")
            return
        
        # Rebuild system prompt from stored context
        system_prompt = self._build_system_prompt_from_session(session)
        
        # Build messages including history
        messages = [{"role": "system", "content": system_prompt}]
        for msg in session.messages:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": user_message})
        
        # Stream response
        full_response = ""
        async for token in self.llm.stream_chat(messages):
            full_response += token
            yield StreamChunk(type="token", content=token)
        
        # Extract and validate
        prompt = self._extract_prompt(full_response)
        if prompt:
            is_refinement = self._is_refinement(user_message)
            await self.sessions.add_prompt_suggestion(
                session_id, prompt,
                refinement_request=user_message if is_refinement else None,
            )
            
            validation = self.validator.validate(
                prompt=prompt,
                asset_type=session.asset_type,
            )
            
            yield StreamChunk(
                type="validation",
                content="",
                metadata={
                    "is_valid": validation.is_valid,
                    "quality_score": validation.quality_score,
                    "prompt_version": len(session.prompt_history) + 1,
                },
            )
        
        # Save messages
        await self.sessions.add_message(session_id, CoachMessage(
            role="user", content=user_message, timestamp=time.time()
        ))
        await self.sessions.add_message(session_id, CoachMessage(
            role="assistant", content=full_response, timestamp=time.time()
        ))
        
        yield StreamChunk(type="done", content="")
    
    def _build_system_prompt(
        self,
        brand_context: "BrandContext",
        asset_type: str,
        mood: str,
        custom_mood: Optional[str],
        game_context: str,
    ) -> str:
        """Build system prompt with all pre-loaded context."""
        color_list = ", ".join([f"{c.name} ({c.hex})" for c in brand_context.colors[:3]])
        
        brand_section = f"""
Brand Kit: {brand_context.brand_kit_id}
Colors: {color_list}
Tone: {brand_context.tone}
Fonts: {brand_context.fonts.headline} (headlines), {brand_context.fonts.body} (body)
"""
        
        mood_section = f"Mood: {custom_mood or mood}"
        
        return self.SYSTEM_PROMPT_BASE.format(
            asset_type=asset_type,
            brand_context=brand_section,
            game_context=game_context or "No specific game selected",
            mood_context=mood_section,
            color_list=color_list,
            tone=brand_context.tone,
        )
    
    def _build_first_message(self, request: "StartCoachRequest") -> str:
        """Build the first user message from their selections."""
        parts = [f"I want to create a {request.asset_type}."]
        
        if request.game_name:
            parts.append(f"It should be {request.game_name} themed.")
        
        if request.mood != "custom":
            parts.append(f"The vibe should be {request.mood}.")
        elif request.custom_mood:
            parts.append(f"The vibe: {request.custom_mood}")
        
        parts.append(f"My idea: {request.description}")
        
        return " ".join(parts)
    
    def _is_refinement(self, message: str) -> bool:
        """Check if message is a refinement request."""
        keywords = ["make it", "more", "less", "change", "adjust", "brighter", "darker", "bolder"]
        return any(kw in message.lower() for kw in keywords)
    
    def _extract_prompt(self, response: str) -> Optional[str]:
        """Extract prompt from response."""
        if "```prompt" in response.lower():
            start = response.lower().find("```prompt") + 9
            end = response.find("```", start)
            if end > start:
                return response[start:end].strip()
        return None
        # Check session limits
        limits = await self.sessions.check_limits(session)
        if limits["turns_exceeded"]:
            yield StreamChunk(type="error", content="Maximum turns reached")
            return
        
        # Get pipeline adapter and check domain scope
        adapter = self.adapters.get(session.pipeline_id)
        pipeline_context = adapter.build_context()
        scoper = DomainScoper(pipeline_context)
        
        scope_result = scoper.check(user_message)
        if not scope_result.is_allowed:
            yield StreamChunk(
                type="redirect",
                content=scope_result.redirect_message,
                metadata={"off_topic": True},
            )
            return
        
        # Check grounding strategy
        grounding_limit = GROUNDING_LIMITS.get(tier, 0)
        grounding_decision = self.grounding_strategy.should_ground(
            message=user_message,
            session_grounding_calls=session.grounding_calls,
            tier_limit=grounding_limit,
        )
        
        grounding_context = ""
        if grounding_decision.should_ground:
            result = await self.grounding.ground(grounding_decision.query)
            if result:
                grounding_context = f"\n\nCurrent context from web: {result.context}"
                yield StreamChunk(
                    type="grounding",
                    content="",
                    metadata={"query": grounding_decision.query, "sources": result.sources},
                )
        
        # Build system prompt with brand context and refinement history
        system_prompt = await self._build_system_prompt(
            pipeline_context=pipeline_context,
            session=session,
            grounding_context=grounding_context,
        )
        
        # Build messages for LLM
        messages = [{"role": "system", "content": system_prompt}]
        for msg in session.messages:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": user_message})
        
        # Stream response
        full_response = ""
        async for token in self.llm.stream_chat(messages):
            full_response += token
            yield StreamChunk(type="token", content=token)
        
        # Extract and validate prompt
        prompt = self._extract_prompt(full_response)
        if prompt:
            # Track in refinement history
            is_refinement = self._is_refinement_request(user_message)
            await self.sessions.add_prompt_suggestion(
                session_id=session_id,
                prompt=prompt,
                refinement_request=user_message if is_refinement else None,
                changes_made=self._detect_changes(session.current_prompt_draft, prompt) if is_refinement else None,
            )
            
            # Validate
            validation = self.validator.validate(
                prompt=prompt,
                asset_type=session.pipeline_id,  # Use pipeline as asset type hint
                context={"brand_kit": session.brand_aesthetic},
            )
            
            yield StreamChunk(
                type="validation",
                content="",
                metadata={
                    "is_valid": validation.is_valid,
                    "is_generation_ready": validation.is_generation_ready,
                    "quality_score": validation.quality_score,
                    "issues": [
                        {
                            "severity": i.severity.value,
                            "code": i.code,
                            "message": i.message,
                            "suggestion": i.suggestion,
                        }
                        for i in validation.issues
                    ],
                    "prompt_version": len(session.prompt_history) + 1,
                },
            )
        
        # Add messages to session
        user_msg = CoachMessage(
            role="user",
            content=user_message,
            timestamp=time.time(),
            grounding_used=grounding_decision.should_ground,
        )
        await self.sessions.add_message(session_id, user_msg)
        
        assistant_msg = CoachMessage(
            role="assistant",
            content=full_response,
            timestamp=time.time(),
        )
        await self.sessions.add_message(session_id, assistant_msg)
        
        yield StreamChunk(
            type="done",
            content="",
            metadata={
                "turns_used": session.turns_used + 1,
                "turns_remaining": self.sessions.MAX_TURNS - session.turns_used - 1,
                "grounding_used": grounding_decision.should_ground,
            },
        )
    
    def _build_greeting(
        self,
        pipeline_context: PipelineContext,
        brand_aesthetic: Optional[Dict],
    ) -> str:
        """Build greeting with brand awareness."""
        base = f"Hey! I'm here to help you craft the perfect prompt for your {pipeline_context.display_name} assets. 🎨"
        
        if brand_aesthetic:
            colors = brand_aesthetic.get("color_names", [])
            tone = brand_aesthetic.get("tone", "")
            if colors:
                base += f"\n\nI see you've got a {tone} brand with {', '.join(colors[:2])} as your main colors. I'll make sure our prompts match that vibe!"
        
        base += "\n\nWhat are you looking to create today?"
        return base
    
    async def _build_system_prompt(
        self,
        pipeline_context: PipelineContext,
        session: CoachSession,
        grounding_context: str,
    ) -> str:
        """Build system prompt with all context."""
        # Brand context
        brand_context = ""
        if session.brand_aesthetic:
            builder = BrandKitContextBuilder({"colors_extended": {"primary": []}, "voice": {"tone": session.brand_aesthetic.get("tone")}})
            # Reconstruct from cached aesthetic
            brand_context = f"""
## User's Brand Identity
**Colors:** {', '.join(session.brand_aesthetic.get('color_palette', [])[:3])}
**Color Mood:** {session.brand_aesthetic.get('color_mood', 'neutral')}
**Tone:** {session.brand_aesthetic.get('tone', 'professional')}
**Style Keywords:** {', '.join(session.brand_aesthetic.get('style_keywords', [])[:5])}

When suggesting prompts, USE these brand elements actively!
"""
        
        # Refinement history
        refinement_history = ""
        if session.prompt_history:
            refinement_history = "\n## Previous Prompt Suggestions\n"
            for s in session.prompt_history[-3:]:  # Last 3
                refinement_history += f"\nVersion {s['version']}: {s['prompt'][:100]}..."
                if s.get('refinement_request'):
                    refinement_history += f"\n  (User asked: {s['refinement_request']})"
            refinement_history += "\n\nWhen user asks to modify, reference and build on these previous suggestions."
        
        return self.SYSTEM_PROMPT_BASE.format(
            pipeline_fragment=pipeline_context.system_prompt_fragment,
            brand_context=brand_context + grounding_context,
            refinement_history=refinement_history,
        )
    
    def _is_refinement_request(self, message: str) -> bool:
        """Check if message is asking to refine previous suggestion."""
        refinement_keywords = [
            "make it", "more", "less", "brighter", "darker", "bolder",
            "change", "modify", "adjust", "tweak", "instead", "but",
        ]
        message_lower = message.lower()
        return any(kw in message_lower for kw in refinement_keywords)
    
    def _detect_changes(self, old_prompt: Optional[str], new_prompt: str) -> List[str]:
        """Detect what changed between prompts."""
        if not old_prompt:
            return ["Initial suggestion"]
        
        changes = []
        old_lower = old_prompt.lower()
        new_lower = new_prompt.lower()
        
        # Simple diff detection
        old_words = set(old_lower.split())
        new_words = set(new_lower.split())
        
        added = new_words - old_words
        removed = old_words - new_words
        
        if added:
            changes.append(f"Added: {', '.join(list(added)[:5])}")
        if removed:
            changes.append(f"Removed: {', '.join(list(removed)[:5])}")
        
        return changes if changes else ["Minor adjustments"]
    
    def _extract_prompt(self, response: str) -> Optional[str]:
        """Extract prompt from coach response."""
        markers = [
            ("```prompt", "```"),
            ("**Prompt:**", "\n\n"),
            ("Here's your prompt:", "\n\n"),
        ]
        
        for start_marker, end_marker in markers:
            if start_marker.lower() in response.lower():
                start_idx = response.lower().find(start_marker.lower()) + len(start_marker)
                end_idx = response.find(end_marker, start_idx)
                if end_idx == -1:
                    end_idx = len(response)
                return response[start_idx:end_idx].strip()
        
        return None
```


## API Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/coach/tips` | All tiers | Get static tips for asset type |
| GET | `/api/v1/coach/access` | All tiers | Check coach access for user's tier |
| POST | `/api/v1/coach/start` | Premium | Start session with full context (SSE stream) |
| POST | `/api/v1/coach/sessions/{id}/messages` | Premium | Continue chat for refinement (SSE stream) |
| GET | `/api/v1/coach/sessions/{id}` | Premium | Get session state and prompt history |
| POST | `/api/v1/coach/sessions/{id}/end` | Premium | End session, get final prompt |

### Request Schemas

```python
class StartCoachRequest(BaseModel):
    """
    Start a coach session with ALL context pre-loaded.
    Client captures everything before this call.
    """
    # Brand context (client already has this loaded)
    brand_context: BrandContext
    
    # User selections from UI
    asset_type: Literal["twitch_emote", "youtube_thumbnail", "twitch_banner", ...]
    mood: Literal["hype", "cozy", "rage", "chill", "custom"]
    custom_mood: Optional[str] = None
    
    # Game context (optional)
    game_id: Optional[str] = None
    game_name: Optional[str] = None
    
    # User's description
    description: str = Field(..., min_length=5, max_length=500)

class BrandContext(BaseModel):
    """Brand kit context sent from client."""
    brand_kit_id: str
    colors: List[ColorInfo]
    tone: str
    fonts: FontInfo
    logo_url: Optional[str] = None

class ColorInfo(BaseModel):
    hex: str
    name: str

class FontInfo(BaseModel):
    headline: str
    body: str

class ContinueChatRequest(BaseModel):
    """Continue chat for refinement."""
    message: str = Field(..., max_length=500)
```

### Response (SSE Stream)

```typescript
// Stream events for start_with_context and continue_chat
type StreamEvent = 
  | { type: "grounding"; metadata: { searching: string } }
  | { type: "grounding_complete"; metadata: { context: string } }
  | { type: "token"; content: string }
  | { type: "validation"; metadata: ValidationResult }
  | { type: "done"; metadata: { session_id: string } }
  | { type: "error"; content: string }

interface ValidationResult {
  is_valid: boolean;
  quality_score: number;
  prompt_version?: number;
  issues: { severity: string; message: string }[];
}
```

### Request/Response Schemas

```python
from pydantic import BaseModel, Field
from typing import Optional, List

class StartSessionRequest(BaseModel):
    pipeline_id: str
    brand_kit_id: Optional[str] = None

class StartSessionResponse(BaseModel):
    session_id: str
    greeting: str
    pipeline: str
    asset_types: List[str]
    brand_loaded: bool

class SendMessageRequest(BaseModel):
    message: str = Field(..., max_length=1000)

# Response is SSE stream with these event types:
# - token: {"type": "token", "content": "word"}
# - grounding: {"type": "grounding", "metadata": {"query": "...", "sources": [...]}}
# - validation: {"type": "validation", "metadata": {"is_valid": true, ...}}
# - redirect: {"type": "redirect", "content": "Let's focus on...", "metadata": {"off_topic": true}}
# - done: {"type": "done", "metadata": {"turns_used": 3, ...}}
# - error: {"type": "error", "content": "Error message"}

class ValidationRequest(BaseModel):
    prompt: str
    asset_type: str
    brand_kit_id: Optional[str] = None

class ValidationResponse(BaseModel):
    is_valid: bool
    is_generation_ready: bool
    quality_score: float
    issues: List[dict]
    fixed_prompt: Optional[str]

class PromptHistoryResponse(BaseModel):
    history: List[dict]  # List of PromptSuggestion
    current_version: int
    current_prompt: Optional[str]
```

## Correctness Properties

### Property 1: Output Validation Before Generation

*For any* prompt output from Coach, the system SHALL run validation and include results in the response.

**Validates: Output Validator requirement**

### Property 2: Validation Catches Missing Elements

*For any* prompt missing required elements for its asset type, validation SHALL return at least one WARNING or ERROR.

**Validates: Output Validator completeness**

### Property 3: Refinement History Persistence

*For any* prompt suggestion in a session, the system SHALL persist it in prompt_history with version number.

**Validates: Refinement Engine requirement**

### Property 4: Refinement Context in System Prompt

*For any* session with prompt_history, the system prompt SHALL include previous suggestions for LLM context.

**Validates: Iterative refinement requirement**

### Property 5: Brand Aesthetic Extraction

*For any* session with brand_kit_id, the system SHALL extract and cache BrandAesthetic with colors, mood, and style keywords.

**Validates: Brand Kit integration requirement**

### Property 6: Brand Context in Suggestions

*For any* session with brand_aesthetic, the system prompt SHALL instruct LLM to use brand colors and style.

**Validates: Brand Kit active usage**

### Property 7: LLM Self-Assessment for Grounding

*For any* non-trivial message (not a refinement/confirmation), the system SHALL ask the LLM to self-assess whether it needs web search before answering.

**Validates: Intelligent grounding decision**

### Property 8: Grounding on Low Confidence

*For any* LLM self-assessment with confidence="low" or knowledge_cutoff_issue=true, the system SHALL trigger web search.

**Validates: Hallucination prevention**

### Property 9: No Grounding on High Confidence

*For any* LLM self-assessment with confidence="high" and needs_search=false, the system SHALL NOT trigger web search.

**Validates: Cost efficiency**

### Property 10: Premium-Only Grounding

*For any* non-premium user, grounding SHALL be disabled regardless of LLM assessment.

**Validates: Tier access control**

### Property 11: Streaming Token Delivery

*For any* message response, the system SHALL yield StreamChunk with type="token" for each token before completion.

**Validates: Streaming response requirement**

### Property 12: Validation After Stream Complete

*For any* streamed response containing a prompt, the system SHALL yield a validation StreamChunk after all tokens.

**Validates: Streaming + validation integration**

### Property 13: Conflict Detection

*For any* prompt containing conflicting style terms (e.g., "minimalist" + "detailed"), validation SHALL return a WARNING.

**Validates: Output Validator conflict detection**

### Property 14: Brand Color Mismatch Warning

*For any* prompt mentioning colors not in user's brand palette, validation SHALL return an INFO issue.

**Validates: Brand alignment checking**

### Property 15: Assessment Caching

*For any* similar message within a session, the system MAY use cached grounding assessment to avoid redundant LLM calls.

**Validates: Performance optimization**

### Property 16: Revert Preserves History

*For any* revert operation, the system SHALL add a new version (not delete history) with the reverted prompt.

**Validates: Refinement history integrity**

### Property 17: Greeting Includes Brand Awareness

*For any* session with brand_kit_id, the greeting SHALL reference the user's brand colors or tone.

**Validates: Brand Kit integration in UX**

### Property 18: Quality Score Calculation

*For any* validation, quality_score SHALL be calculated as: 1.0 - (errors * 0.3) - (warnings * 0.1), minimum 0.

**Validates: Quality score consistency**

## Error Handling

| Error | HTTP Code | Response |
|-------|-----------|----------|
| Session not found | 404 | `{"error": "session_not_found", ...}` |
| Session expired | 410 | `{"error": "session_expired", ...}` |
| Rate limit exceeded | 429 | `{"error": "rate_limit_exceeded", "reset_at": "..."}` |
| Turns exceeded | 400 | `{"error": "turns_exceeded", ...}` |
| Invalid pipeline | 400 | `{"error": "invalid_pipeline", ...}` |
| Validation failed | 422 | `{"error": "validation_failed", "issues": [...]}` |
| Service unavailable | 503 | `{"error": "service_unavailable", ...}` |
| Coach access denied | 403 | `{"error": "premium_required", "feature": "prompt_coach"}` |

## Cost Analysis

### Per-Session Estimate (Premium Only)
| Component | Cost |
|-----------|------|
| LLM Assessment (~50 tokens) | ~$0.00003 |
| LLM Chat (4 turns × 500 tokens) | ~$0.0005 |
| Web Search (when needed) | ~$0.005 |
| Validation (local) | $0.00 |
| **Total (no search)** | **~$0.0005** |
| **Total (with search)** | **~$0.006** |

### Monthly Estimates
| Tier | Coach Access | Sessions | Est. Cost |
|------|--------------|----------|-----------|
| Free | Tips only | 0 | $0.00 |
| Pro | Tips only | 0 | $0.00 |
| Premium | Full | Unlimited | ~$0.006/session |

## Dependencies

### Python Packages
```
redis>=4.0.0          # Session storage
pydantic>=2.0.0       # Schema validation
sse-starlette>=1.0.0  # Server-Sent Events
```

### External Services
- Redis - Session and rate limit storage
- LLM Service (Gemini) - Conversation AI with streaming + self-assessment
- Brand Kit Service - Brand context
- Web Search API - Grounding (LLM-triggered for Premium)
