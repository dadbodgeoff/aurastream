"""
Prompt Builder for Prompt Coach.

Responsible for constructing system prompts and user messages
for the coach LLM. This module centralizes all prompt templates
and formatting logic.

The coach uses a "Creative Director" persona that helps users
articulate their vision without exposing the actual generation prompts.

Asset-type-specific behavior is driven by the asset_types.py registry,
enabling scalable addition of new types (emotes, logos, stream assets).
"""

import logging
from dataclasses import dataclass
from typing import Dict, Any, Optional, List

from ..models import CoachSession
from ..asset_types import (
    get_asset_config,
    get_asset_tips,
    get_display_name,
    get_questions_for_asset,
    is_emote_type,
    supports_text,
    supports_complex_scenes,
    PromptTemplate,
)

logger = logging.getLogger(__name__)


@dataclass
class PromptContext:
    """
    Context for building prompts.
    
    Encapsulates all the information needed to build
    system and user prompts for the coach.
    """
    asset_type: str
    mood: str
    custom_mood: Optional[str] = None
    brand_context: Optional[Dict[str, Any]] = None
    game_name: Optional[str] = None
    game_context: Optional[str] = None
    description: Optional[str] = None
    current_vision: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    # Canvas Studio integration
    canvas_snapshot_url: Optional[str] = None
    canvas_snapshot_description: Optional[str] = None
    # Community Hub assets
    community_assets: Optional[List[Dict[str, Any]]] = None  # List of community hub asset placements
    media_asset_placements: Optional[List[Dict[str, Any]]] = None  # All asset placements


class PromptBuilder:
    """
    Builds prompts for the Creative Director coach.
    
    This class is responsible for:
    - Building system prompts that define the coach's behavior
    - Building user messages from context selections
    - Rebuilding prompts from session state
    
    The prompts are designed to:
    - Help users articulate WHAT they want (not HOW to prompt)
    - Keep responses concise (2-3 sentences)
    - Confirm text spelling
    - Signal readiness with [INTENT_READY] marker ONLY after user confirms
    """

    # Main system prompt template
    # This defines the coach's behavior and constraints
    SYSTEM_PROMPT_TEMPLATE = '''You help streamers create {asset_type} assets.

RULE #1: Do what the user asks. If they request changes, make them. If they ask questions, answer them.

RULE #2: NEVER say [INTENT_READY] on your FIRST response. Always confirm the vision with the user first.

RULE #3: CLARIFY AMBIGUOUS TEXT - If user mentions text that could be either:
- Something to RENDER (scene description like "character fighting")
- Something to DISPLAY (actual text on the image like "EPIC WIN")
ASK: "Should '[text]' be rendered as a scene, or displayed as text on the image?"

RULE #4: ASK ABOUT STYLING - For any text/title, ask about:
- Style preference (bold, outline, glow, 3D, neon, etc.)
- Color preference (or use brand colors)
- Size (small, medium, large, dominant)

RULE #5: ASK ABOUT ELEMENTS - For characters/objects, ask about:
- Size/scale (current size good, or bigger/smaller?)
- Position adjustments needed?
- Effects wanted (glow, shadow, action enhancement?)

Context: {brand_context} | {game_context} | {mood_context}
Brand colors: {color_list}
{community_assets_context}
{style_instructions}
Gather (only what's missing): subject, style/mood, text styling, element sizing/positioning.

Keep responses to 2-3 sentences. Confirm any text spelling AND styling.

CRITICAL - When ready, your summary MUST include ALL specific details:
- EXACT text to display (in quotes) with STYLE (bold, glow, color, size)
- SPECIFIC character/skin names with SIZE and POSITION
- SPECIFIC location/map names
- Scene composition (who is doing what, where)
- Effects for each element (glow, shadow, outline, etc.)
- Distinguish between RENDER elements (visuals) and DISPLAY text (text on image)
{community_assets_instructions}

FLOW:
1. First response: Acknowledge their vision, ask about styling/sizing preferences. End with "Sound good?" or similar.
2. If anything is ambiguous: Ask for clarification before proceeding.
3. After user confirms: THEN say "✨ Ready! [DETAILED summary with all styling] [INTENT_READY]"

BAD (first response): "✨ Ready! A thumbnail... [INTENT_READY]"
GOOD (first response): "Love it! So we're going for [summary]. For the title, want it bold with glow, or more subtle? And the character - current size good?"
GOOD (after confirm): "✨ Ready! A thumbnail featuring The Bride (large, center-left, with purple glow), title 'EPIC WIN' in bold white with yellow outline at top-center... [INTENT_READY]"
'''

    # Canvas refinement prompt template (for thumbnails, banners, complex compositions)
    # Used when user sends a canvas design to coach for professional refinement
    CANVAS_REFINEMENT_TEMPLATE = '''You're helping refine a {asset_type} design from Canvas Studio.

The user has created a draft with these elements:
{canvas_description}

{community_assets_context}

{asset_type_tips}

CRITICAL - HANDWRITTEN TEXT DETECTION:
If you see text that looks like INSTRUCTIONS or DESCRIPTIONS (e.g., "character fighting here", "add explosion", "skin with gun"), this is NOT display text - it's telling you what to RENDER.
- ASK: "I see you wrote '[text]' - should I render that as a scene (like actually show [description]), or display it as text on the image?"
- Common instruction patterns: "[character] doing [action]", "[thing] here", "add [element]", descriptions of scenes

ACTUAL DISPLAY TEXT looks like: titles, catchphrases, channel names, "EPIC WIN", "Subscribe!", etc.

CRITICAL - ASK ABOUT STYLING:
For EVERY text element, ask about:
- Style: bold, outline, glow, 3D, neon, gradient?
- Color: specific color or use brand colors?
- Size: small, medium, large, dominant?

For EVERY character/object, ask about:
- Size: current size good, or adjust?
- Position: current position good, or move?
- Effects: glow, shadow, action enhancement, outline?

Your job:
1. Acknowledge what they've created (be specific about elements you see)
2. If you see handwritten annotations that look like instructions, ASK if they want it rendered or as text
3. Ask about STYLING for each text element (font style, color, size)
4. Ask about SIZING/EFFECTS for each character/object
5. Confirm any actual display text spelling

RULE: NEVER say [INTENT_READY] on your FIRST response. Always confirm with the user first.

Keep responses to 2-3 sentences. Be encouraging!

FLOW:
1. First response: Acknowledge their canvas, ask about styling/sizing for each element, clarify any ambiguous text/annotations
2. After user confirms: THEN provide "✨ Ready! [detailed description with all styling] [INTENT_READY]"

When ready, provide a detailed description that:
- PRESERVES their exact layout and element positions
- INCLUDES styling for each text (font, color, size, effects)
- INCLUDES sizing/effects for each character/object
- RENDERS any instructional annotations as actual visuals (not text)
- KEEPS only actual display text as text
- ADDS professional polish (lighting, effects, style)
- MATCHES {asset_type} best practices
{community_assets_instructions}

Example first response for canvas with "Omega fighting Ikonik" written on it:
"Nice layout! I see you've got the Fortnite background with 'The BEST Shotgun EVER?' as your title. For the title - want it bold with glow, or more subtle? What color? For 'Omega fighting Ikonik' - should I render them in an epic battle pose? If so, what size - large and dominant, or medium? Any effects like glow or action lines?"

Example after user confirms:
"✨ Ready! A high-impact YouTube thumbnail with Fortnite Ch7 Background 8, bold title 'The BEST Shotgun EVER?' in white with yellow glow (large, top-center), Omega and Ikonik skins in dynamic battle poses (large, center-left, with purple action glow), a Pump Shotgun at bottom-center (medium, with metallic shine), dramatic lighting [INTENT_READY]"
'''

    # Emote refinement prompt template (for Twitch/TikTok emotes, badges)
    # Single-subject, expression-focused - NO text/scene complexity
    EMOTE_REFINEMENT_TEMPLATE = '''You're helping create a {asset_type} in Canvas Studio.

{canvas_description}

{asset_type_tips}

EMOTE RULES - These are CRITICAL:
1. Emotes must be SIMPLE - single subject, single emotion
2. Must read clearly at TINY sizes ({min_size}px)
3. NO complex scenes, NO multiple characters fighting
4. Bold outlines and saturated colors help visibility
5. Exaggerated expressions read better than subtle ones
6. Transparent background is required

ASK ABOUT:
- Expression/emotion: What feeling? (hype, sad, love, rage, pog, laugh, shock?)
- Readability: Will this read at {min_size}px? Simpler is better.
- Outline: Bold outline or soft edges?
- Colors: Bold/saturated or more subtle?
- Pose/gesture: Any specific pose? (thumbs up, facepalm, heart hands?)

DO NOT ASK ABOUT:
- Text styling (emotes don't have text)
- Scene composition (single subject only)
- Multiple characters (keep it simple)
- Background details (transparent BG)

RULE: NEVER say [INTENT_READY] on your FIRST response. Always confirm with the user first.

Keep responses to 2-3 sentences. Be encouraging!

FLOW:
1. First response: Acknowledge their idea, ask about expression and readability
2. After user confirms: "✨ Ready! [concise emote description] [INTENT_READY]"

When ready, your description should be CONCISE:
- Single subject with clear emotion
- Bold colors and style notes
- NO complex scene descriptions

Example first response:
"Love it! So we're making a hype/excited emote. What expression works best - big open-mouth excitement, or more of a determined fist-pump? And for colors - bold and saturated, or match your brand palette?"

Example after confirm:
"✨ Ready! Excited streamer face emote - wide open mouth, raised eyebrows, bold purple and gold colors, thick black outline, transparent background [INTENT_READY]"
'''

    # Banner refinement prompt template (for Twitch banners, channel art)
    BANNER_REFINEMENT_TEMPLATE = '''You're helping refine a {asset_type} design from Canvas Studio.

The user has created a draft with these elements:
{canvas_description}

{community_assets_context}

{asset_type_tips}

BANNER RULES:
1. Wide format - key content in CENTER safe zone
2. Leave space for profile picture overlay (usually left side)
3. Text must be readable on mobile (not too small)
4. Brand colors should be prominent
5. Clean, uncluttered composition

ASK ABOUT:
- Brand prominence: How visible should your brand/logo be?
- Text placement: Where should text go? (consider profile pic overlay)
- Color scheme: Stick to brand colors or try something new?
- Safe zones: Leave space for platform UI elements?

RULE: NEVER say [INTENT_READY] on your FIRST response. Always confirm with the user first.

Keep responses to 2-3 sentences. Be encouraging!

FLOW:
1. First response: Acknowledge their design, ask about brand and safe zones
2. After user confirms: "✨ Ready! [banner description] [INTENT_READY]"
{community_assets_instructions}
'''

    # Compact canvas prompt template (token-conscious)
    # Used when canvas_context JSON is provided with pre-classified elements
    CANVAS_COMPACT_TEMPLATE = '''You're refining a {asset_type} from Canvas Studio.

CANVAS ELEMENTS (pre-classified):
{classified_elements}

{clarification_needed}

{asset_type_tips}

RULES:
1. NEVER say [INTENT_READY] on first response
2. If clarification needed above, ask those questions first
3. Keep responses to 2-3 sentences
4. When ready: "✨ Ready! [compact summary] [INTENT_READY]"

OUTPUT FORMAT when ready:
{asset_type} {dimensions}:
- BG: [background name] (keep)
- Text "[exact text]" [position]
- Render: [scene description], [position]
- Style: [mood/effects]
'''

    # Community hub assets context template
    COMMUNITY_ASSETS_TEMPLATE = '''
COMMUNITY HUB ASSETS IN USE:
The user is using pre-loaded {game_name} assets from our Community Hub.
These are official/high-quality {game_name} images that should be:
- Referenced by their exact names in your response
- Treated as the visual foundation of the design
- Enhanced with effects/styling that match {game_name}'s aesthetic

Assets being used:
{asset_list}

{game_specific_tips}
'''

    # Game-specific styling tips
    GAME_STYLE_TIPS = {
        "fortnite": "Fortnite style: Bold colors, dynamic poses, battle royale energy, Chapter 7 desert/tropical vibes, Victory Royale celebrations.",
        "arc_raiders": "Arc Raiders style: Sci-fi atmosphere, cooperative shooter vibes, futuristic tech, alien threats, survival aesthetic.",
        "valorant": "Valorant style: Tactical shooter aesthetic, agent abilities, neon accents, competitive esports energy.",
        "apex_legends": "Apex Legends style: Legend abilities, battle royale action, futuristic weapons, squad-based gameplay.",
        "call_of_duty": "Call of Duty style: Military tactical, intense action, realistic weapons, competitive multiplayer.",
        "minecraft": "Minecraft style: Blocky aesthetic, creative builds, survival elements, pixelated charm.",
        "league_of_legends": "League of Legends style: Champion abilities, MOBA action, fantasy elements, team fights.",
    }

    # Asset type display names for more natural language
    # NOTE: Prefer get_display_name() from asset_types.py for new code
    ASSET_TYPE_NAMES = {
        "twitch_emote": "Twitch emote",
        "youtube_thumbnail": "YouTube thumbnail",
        "twitch_banner": "Twitch banner",
        "twitch_badge": "Twitch badge",
        "twitch_panel": "Twitch panel",
        "twitch_offline": "Twitch offline screen",
        "overlay": "stream overlay",
        "story_graphic": "story graphic",
        "thumbnail": "thumbnail",
        "banner": "banner",
        "tiktok_emote": "TikTok emote",
        "instagram_story": "Instagram story",
        "instagram_reel": "Instagram reel",
    }

    # Asset type tips for canvas refinement
    # NOTE: Prefer get_asset_tips() from asset_types.py for new code
    ASSET_TYPE_TIPS = {
        "youtube_thumbnail": "Tips: High contrast grabs attention, faces with expressions perform best, text readable at small sizes, max 3 focal points.",
        "thumbnail": "Tips: Clear focal point, readable text, brand colors for recognition.",
        "twitch_emote": "Tips: Must work at 28x28px, simple shapes with bold outlines, single clear emotion, avoid fine details.",
        "tiktok_emote": "Tips: Must work at 100x100px, vibrant colors, expressive design, bold outlines help visibility, single clear emotion.",
        "twitch_badge": "Tips: Even simpler than emotes, works at 18x18px, clear silhouette, tier progression should be distinct.",
        "twitch_banner": "Tips: Brand colors prominent, clean composition, text readable on mobile, leave space for profile picture.",
        "twitch_panel": "Tips: Consistent style across panels, clear readable text, icons help quick scanning.",
        "twitch_offline": "Tips: Include schedule or social links, brand identity prominent, call to action.",
        "overlay": "Tips: Don't obstruct important areas, transparent backgrounds, consistent with brand.",
        "banner": "Tips: Wide format, key content in center safe zone, brand colors.",
        "story_graphic": "Tips: Vertical 9:16, bold attention-grabbing, text in upper/lower thirds.",
        "instagram_story": "Tips: Leave space for UI elements, bold colors and text, engaging CTA.",
        "instagram_reel": "Tips: Vertical format, eye-catching first frame, text overlay for context.",
        "tiktok_story": "Tips: Vertical 9:16, bold trendy aesthetic, hook viewers immediately.",
    }

    def __init__(self):
        """Initialize the prompt builder."""
        pass

    def build_system_prompt(self, context: PromptContext) -> str:
        """
        Build the system prompt for a new coaching session.
        
        Args:
            context: The prompt context with all necessary information
            
        Returns:
            The formatted system prompt
        """
        # Get friendly asset type name
        asset_name = self.ASSET_TYPE_NAMES.get(
            context.asset_type,
            context.asset_type.replace("_", " ")
        )

        # Check if this is a canvas refinement session
        if context.canvas_snapshot_url and context.canvas_snapshot_description:
            return self._build_canvas_refinement_prompt(context, asset_name)

        # Standard prompt flow
        # Format brand context
        brand_section = self._format_brand_context(context.brand_context)

        # Format color list
        color_list = self._format_color_list(context.brand_context)

        # Format mood context
        mood_section = context.custom_mood or context.mood or "flexible"

        # Format game context
        game_section = context.game_context if context.game_context else "none"

        # Format style instructions from preferences
        style_instructions = self._format_preferences(context.preferences)

        # Format community assets context
        community_context = ""
        community_instructions = ""
        if context.community_assets:
            community_context = self._format_community_assets_context(context.community_assets)
            community_instructions = "- REFERENCE community hub assets by their exact names in your summary"

        return self.SYSTEM_PROMPT_TEMPLATE.format(
            asset_type=asset_name,
            brand_context=brand_section,
            game_context=game_section,
            mood_context=mood_section,
            color_list=color_list,
            style_instructions=style_instructions,
            community_assets_context=community_context,
            community_assets_instructions=community_instructions,
        )

    def _build_canvas_refinement_prompt(self, context: PromptContext, asset_name: str) -> str:
        """
        Build system prompt for canvas refinement mode.
        
        Selects the appropriate template based on asset type category:
        - Emotes use EMOTE_REFINEMENT_TEMPLATE (simple, expression-focused)
        - Banners use BANNER_REFINEMENT_TEMPLATE (wide format, brand-focused)
        - Others use CANVAS_REFINEMENT_TEMPLATE (complex compositions)
        
        Args:
            context: The prompt context with canvas data
            asset_name: Friendly asset type name
            
        Returns:
            The formatted canvas refinement prompt
        """
        # Get asset configuration from registry
        config = get_asset_config(context.asset_type)

        # Get asset-specific tips (prefer registry, fallback to legacy dict)
        tips = f"Tips: {config.tips}"

        # Build community assets context if present
        community_context = ""
        community_instructions = ""
        if context.community_assets:
            community_context = self._format_community_assets_context(context.community_assets)
            community_instructions = "\n- REFERENCE community hub assets by their exact names"

        # Select template based on asset type category
        if config.template == PromptTemplate.EMOTE_REFINEMENT:
            # Emote template - simple, expression-focused
            min_size = config.sizes[-1] if config.sizes else 28  # Smallest size
            return self.EMOTE_REFINEMENT_TEMPLATE.format(
                asset_type=asset_name,
                canvas_description=context.canvas_snapshot_description or "emote design",
                asset_type_tips=tips,
                min_size=min_size,
            )

        elif config.template == PromptTemplate.BANNER_REFINEMENT:
            # Banner template - wide format, brand-focused
            return self.BANNER_REFINEMENT_TEMPLATE.format(
                asset_type=asset_name,
                canvas_description=context.canvas_snapshot_description or "banner design",
                asset_type_tips=tips,
                community_assets_context=community_context,
                community_assets_instructions=community_instructions,
            )

        else:
            # Default: Canvas refinement template for complex compositions
            return self.CANVAS_REFINEMENT_TEMPLATE.format(
                asset_type=asset_name,
                canvas_description=context.canvas_snapshot_description or "canvas design",
                asset_type_tips=tips,
                community_assets_context=community_context,
                community_assets_instructions=community_instructions,
            )

    def _format_community_assets_context(self, community_assets: List[Dict[str, Any]]) -> str:
        """
        Format community hub assets into context for the coach.
        
        Args:
            community_assets: List of community hub asset placements
            
        Returns:
            Formatted context string for the system prompt
        """
        if not community_assets:
            return ""

        # Group assets by game
        games = {}
        for asset in community_assets:
            game_cat = asset.get("game_category", "unknown")
            game_name = asset.get("game_name", game_cat.replace("_", " ").title())
            if game_cat not in games:
                games[game_cat] = {"name": game_name, "assets": []}
            games[game_cat]["assets"].append(asset)

        # Build context for each game
        context_parts = []
        for game_cat, game_data in games.items():
            game_name = game_data["name"]
            assets = game_data["assets"]

            # Format asset list
            asset_lines = []
            for a in assets:
                name = a.get("display_name", "Asset")
                asset_type = a.get("asset_type", "image")
                position = f"at ({a.get('x', 50)}%, {a.get('y', 50)}%)" if 'x' in a else ""
                asset_lines.append(f"  - {name} ({asset_type}) {position}")

            asset_list = "\n".join(asset_lines)

            # Get game-specific tips
            game_tips = self.GAME_STYLE_TIPS.get(
                game_cat,
                f"{game_name} style: Match the game's visual aesthetic and energy."
            )

            context_parts.append(self.COMMUNITY_ASSETS_TEMPLATE.format(
                game_name=game_name,
                asset_list=asset_list,
                game_specific_tips=game_tips,
            ))

        return "\n".join(context_parts)

    def build_system_prompt_from_session(self, session: CoachSession) -> str:
        """
        Rebuild system prompt from session state.
        
        Used when continuing a conversation to maintain context.
        
        Args:
            session: The current coaching session
            
        Returns:
            The formatted system prompt
        """
        context = PromptContext(
            asset_type=session.asset_type or "asset",
            mood=session.mood or "balanced",
            brand_context=session.brand_context,
            game_context=session.game_context,
        )

        base_prompt = self.build_system_prompt(context)

        # Add current vision if we have one
        if session.current_prompt_draft:
            base_prompt += f"\nCurrent vision: {session.current_prompt_draft}"

        return base_prompt

    def build_first_message(self, context: PromptContext) -> str:
        """
        Build the first user message from context selections.
        
        This message introduces what the user wants to create
        based on their selections in the UI.
        
        Args:
            context: The prompt context
            
        Returns:
            The formatted first user message
        """
        # Canvas refinement mode - different first message
        if context.canvas_snapshot_url and context.canvas_snapshot_description:
            return self._build_canvas_first_message(context)

        parts = []

        # Asset type
        asset_name = self.ASSET_TYPE_NAMES.get(
            context.asset_type,
            context.asset_type.replace("_", " ")
        )
        parts.append(f"I want to create a {asset_name}.")

        # Game context
        if context.game_name:
            parts.append(f"It's for {context.game_name} content.")

        # Community assets context
        if context.community_assets:
            asset_names = [a.get("display_name", "asset") for a in context.community_assets[:3]]
            if len(asset_names) == 1:
                parts.append(f"I'm using the {asset_names[0]} from the community hub.")
            else:
                parts.append(f"I'm using these community hub assets: {', '.join(asset_names)}.")

        # Mood
        if context.mood != "custom":
            parts.append(f"I want it to feel {context.mood}.")
        elif context.custom_mood:
            parts.append(f"The vibe I'm going for: {context.custom_mood}")

        # Description
        if context.description:
            parts.append(f"My idea: {context.description}")

        return " ".join(parts)

    def _build_canvas_first_message(self, context: PromptContext) -> str:
        """
        Build first message for canvas refinement mode.
        
        Args:
            context: The prompt context with canvas data
            
        Returns:
            The formatted first message for canvas mode
        """
        asset_name = self.ASSET_TYPE_NAMES.get(
            context.asset_type,
            context.asset_type.replace("_", " ")
        )

        parts = [
            f"I've designed a {asset_name} in Canvas Studio.",
            f"Here's what I've created: {context.canvas_snapshot_description}",
        ]

        if context.description and context.description != context.canvas_snapshot_description:
            parts.append(f"My vision: {context.description}")

        parts.append("Help me make it look professional!")

        return " ".join(parts)

    def build_conversation_messages(
        self,
        session: CoachSession,
        new_message: str,
    ) -> List[Dict[str, str]]:
        """
        Build the full message list for continuing a conversation.
        
        Args:
            session: The current session with history
            new_message: The new user message to add
            
        Returns:
            List of message dicts for the LLM
        """
        # Start with system prompt
        system_prompt = self.build_system_prompt_from_session(session)
        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history
        for msg in session.messages:
            messages.append({"role": msg.role, "content": msg.content})

        # Add new message
        messages.append({"role": "user", "content": new_message})

        return messages

    def _format_brand_context(
        self,
        brand_context: Optional[Dict[str, Any]],
    ) -> str:
        """
        Format brand context for the system prompt.
        
        Args:
            brand_context: The brand kit context dict
            
        Returns:
            Formatted brand context string
        """
        if not brand_context:
            return "No brand"

        tone = brand_context.get("tone", "professional")
        return f"Tone: {tone}" if tone else "No brand"

    def _format_color_list(
        self,
        brand_context: Optional[Dict[str, Any]],
    ) -> str:
        """
        Format color list for the system prompt.
        
        Args:
            brand_context: The brand kit context dict
            
        Returns:
            Formatted color list string
        """
        if not brand_context:
            return "none specified"

        colors = brand_context.get("colors", [])
        if not colors:
            return "none specified"

        # Format up to 3 colors
        color_parts = []
        for color in colors[:3]:
            if isinstance(color, dict):
                name = color.get("name", "Color")
                hex_val = color.get("hex", "#000000")
                color_parts.append(f"{name} ({hex_val})")

        return ", ".join(color_parts) if color_parts else "none specified"

    def build_compact_canvas_prompt(
        self,
        canvas_schema: Any,  # CanvasIntentSchema from canvas.py
        asset_type: str,
    ) -> str:
        """
        Build a compact system prompt from pre-classified canvas elements.
        
        This is the token-conscious approach that uses the classification
        system to generate minimal, structured prompts.
        
        Args:
            canvas_schema: CanvasIntentSchema with classified elements
            asset_type: The asset type being created
            
        Returns:
            Compact system prompt for canvas refinement
        """
        asset_name = self.ASSET_TYPE_NAMES.get(
            asset_type,
            asset_type.replace("_", " ")
        )

        # Format classified elements compactly
        element_lines = []

        # Base layer
        if canvas_schema.base_layer:
            element_lines.append(f"- BG: {canvas_schema.base_layer.content} (KEEP)")

        # Kept assets
        for elem in canvas_schema.elements:
            if elem.intent.value == "keep_asset" and elem != canvas_schema.base_layer:
                region = elem.region.value if elem.region else "center"
                element_lines.append(f"- Asset: {elem.content}, {region} (KEEP)")

        # Display texts
        for elem in canvas_schema.display_texts:
            region = elem.region.value if elem.region else "center"
            element_lines.append(f'- Text: "{elem.content}", {region} (DISPLAY)')

        # Render elements
        for elem in canvas_schema.render_elements:
            region = elem.region.value if elem.region else "center"
            desc = elem.render_description or elem.content
            element_lines.append(f"- Render: {desc}, {region} (GENERATE)")

        # Style instructions
        if canvas_schema.style_instructions:
            element_lines.append(f"- Style: {', '.join(canvas_schema.style_instructions)}")

        classified_elements = "\n".join(element_lines) if element_lines else "No elements classified"

        # Format clarification needed
        ambiguous = canvas_schema.get_ambiguous_elements()
        if ambiguous:
            questions = []
            for i, elem in enumerate(ambiguous, 1):
                if elem.clarification_question:
                    questions.append(f"{i}. {elem.clarification_question}")
            clarification_needed = "CLARIFY FIRST:\n" + "\n".join(questions)
        else:
            clarification_needed = "All elements classified - ready to confirm with user."

        # Get asset tips
        tips = self.ASSET_TYPE_TIPS.get(
            asset_type,
            "Tips: Clear composition, brand consistency, professional polish."
        )

        # Format dimensions
        dimensions = f"{canvas_schema.dimensions[0]}x{canvas_schema.dimensions[1]}"

        return self.CANVAS_COMPACT_TEMPLATE.format(
            asset_type=asset_name,
            classified_elements=classified_elements,
            clarification_needed=clarification_needed,
            asset_type_tips=tips,
            dimensions=dimensions,
        )

    def _format_preferences(
        self,
        preferences: Optional[Dict[str, Any]],
    ) -> str:
        """
        Format user preferences into style instructions.
        
        Args:
            preferences: User preferences dict with verbosity, style, etc.
            
        Returns:
            Formatted style instructions string
        """
        if not preferences:
            return ""

        instructions = []

        # Verbosity
        verbosity = preferences.get("verbosity", "balanced")
        if verbosity == "concise":
            instructions.append("Be very brief and to the point.")
        elif verbosity == "detailed":
            instructions.append("Provide more detailed explanations.")

        # Style
        style = preferences.get("style", "friendly")
        if style == "professional":
            instructions.append("Use a professional, business-like tone.")
        elif style == "casual":
            instructions.append("Keep it casual and relaxed.")
        elif style == "enthusiastic":
            instructions.append("Be enthusiastic and energetic!")

        # Emoji level
        emoji_level = preferences.get("emoji_level", "normal")
        if emoji_level == "none":
            instructions.append("Do not use emojis.")
        elif emoji_level == "minimal":
            instructions.append("Use emojis sparingly.")

        # Tips
        if not preferences.get("show_tips", True):
            instructions.append("Skip tips and suggestions unless asked.")

        return "\n".join(instructions) if instructions else ""


# Singleton instance
_prompt_builder: Optional[PromptBuilder] = None


def get_prompt_builder() -> PromptBuilder:
    """Get or create the prompt builder singleton."""
    global _prompt_builder
    if _prompt_builder is None:
        _prompt_builder = PromptBuilder()
    return _prompt_builder


__all__ = [
    "PromptContext",
    "PromptBuilder",
    "get_prompt_builder",
]
