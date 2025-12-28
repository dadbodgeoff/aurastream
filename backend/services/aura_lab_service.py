"""
Aura Lab Service - Fusion reactor for emote experimentation.

Handles:
1. Test subject upload and session management
2. Element fusion with identity preservation
3. Rarity scoring via Gemini
4. Recipe discovery tracking
5. Squad fusion invites
"""

import uuid
from datetime import datetime, timedelta, date
from typing import Optional, Tuple
from dataclasses import dataclass

from backend.database.supabase_client import get_supabase_client


@dataclass
class RarityScores:
    """AI-generated rarity scores."""
    visual_impact: int
    creativity: int
    meme_potential: int
    technical_quality: int
    commentary: str


@dataclass
class FusionResult:
    """Result of a fusion operation."""
    fusion_id: str
    image_url: str
    rarity: str  # common, rare, mythic
    scores: dict
    is_first_discovery: bool
    recipe_id: Optional[str]


# Element definitions - 20 total (12 free, 8 premium)
ELEMENTS = {
    # Free elements
    "fire": {
        "id": "fire",
        "name": "Fire",
        "icon": "🔥",
        "description": "Blue flames, glowing ember eyes, heat distortion, phoenix energy",
        "premium": False
    },
    "ice": {
        "id": "ice",
        "name": "Ice",
        "icon": "❄️",
        "description": "Frozen solid, crystalline structure, frost particles, cold blue tones",
        "premium": False
    },
    "clown": {
        "id": "clown",
        "name": "Clown",
        "icon": "🤡",
        "description": "Rainbow afro hair, red nose, white face paint, colorful makeup",
        "premium": False
    },
    "gigachad": {
        "id": "gigachad",
        "name": "GigaChad",
        "icon": "💪",
        "description": "Chiseled jawline, intense gaze, sigma male energy, black and white",
        "premium": False
    },
    "mecha": {
        "id": "mecha",
        "name": "Mecha",
        "icon": "🤖",
        "description": "Robotic armor plating, LED eyes, chrome finish, transformer aesthetic",
        "premium": False
    },
    "zombie": {
        "id": "zombie",
        "name": "Zombie",
        "icon": "🧟",
        "description": "Green rotting skin, exposed bones, undead eyes, horror movie style",
        "premium": False
    },
    "gold": {
        "id": "gold",
        "name": "Gold",
        "icon": "🏆",
        "description": "Solid 24k gold statue, luxury shine, trophy aesthetic",
        "premium": False
    },
    "ghost": {
        "id": "ghost",
        "name": "Ghost",
        "icon": "👻",
        "description": "Translucent ethereal form, floating, spooky glow, paranormal",
        "premium": False
    },
    "pixel": {
        "id": "pixel",
        "name": "Pixel",
        "icon": "👾",
        "description": "16-bit retro game style, limited color palette, NES aesthetic",
        "premium": False
    },
    "skull": {
        "id": "skull",
        "name": "Skull",
        "icon": "💀",
        "description": "Skeletal face, Day of the Dead decorations, bone white, gothic",
        "premium": False
    },
    "rainbow": {
        "id": "rainbow",
        "name": "Rainbow",
        "icon": "🌈",
        "description": "Pride flag colors, sparkles, glitter, celebration energy",
        "premium": False
    },
    "electric": {
        "id": "electric",
        "name": "Electric",
        "icon": "⚡",
        "description": "Lightning bolts, neon glow, energy crackling, storm power",
        "premium": False
    },
    # Premium elements
    "cyberpunk": {
        "id": "cyberpunk",
        "name": "Cyberpunk",
        "icon": "🌃",
        "description": "Neon city reflections, chrome implants, Blade Runner aesthetic",
        "premium": True
    },
    "8bit": {
        "id": "8bit",
        "name": "8-Bit",
        "icon": "🕹️",
        "description": "NES-style pixel art, 8-color palette, chunky pixels",
        "premium": True
    },
    "noir": {
        "id": "noir",
        "name": "Noir",
        "icon": "🎬",
        "description": "Black and white, film grain, dramatic shadows, detective style",
        "premium": True
    },
    "vaporwave": {
        "id": "vaporwave",
        "name": "Vaporwave",
        "icon": "🌴",
        "description": "Pink and cyan, glitch effects, 80s aesthetic, palm trees",
        "premium": True
    },
    "anime": {
        "id": "anime",
        "name": "Anime",
        "icon": "✨",
        "description": "Cel-shaded, big expressive eyes, speed lines, Japanese style",
        "premium": True
    },
    "horror": {
        "id": "horror",
        "name": "Horror",
        "icon": "🩸",
        "description": "Gore, blood splatter, creepy smile, unsettling, nightmare",
        "premium": True
    },
    "steampunk": {
        "id": "steampunk",
        "name": "Steampunk",
        "icon": "⚙️",
        "description": "Brass gears, Victorian goggles, steam pipes, clockwork",
        "premium": True
    },
    "hologram": {
        "id": "hologram",
        "name": "Hologram",
        "icon": "💠",
        "description": "Translucent blue projection, scan lines, futuristic, sci-fi",
        "premium": True
    },
}


FUSION_PROMPT_TEMPLATE = """
You are a visual alchemist specializing in identity transformation.

INPUT A (Base Identity): [Attached Image]
INPUT B (Element): {element_name} - {element_description}

TASK:
Transform INPUT A using the essence of INPUT B to create a "Twitch Emote" style sticker.

CRITICAL RULES:

1. IDENTITY PRESERVATION (Non-negotiable):
   - The facial features, hair shape, and key accessories of INPUT A must be clearly recognizable
   - If Input A is a person, the result must look like that person
   - If Input A is a logo, preserve the overall silhouette and key symbols
   - The result should pass the "squint test" - recognizable at 28px

2. MATERIAL TRANSFORMATION:
   - The texture, color palette, and physical substance must be 100% derived from INPUT B
   - Make the transformation dramatic and obvious

3. STYLE REQUIREMENTS:
   - Thick white sticker outline (3-4px)
   - Vector illustration style
   - High contrast for chat readability
   - Expressive, exaggerated features
   - Clean edges, no fine details that disappear at small sizes

4. OUTPUT:
   - Single square image
   - Solid neon-green background (#00FF00) for easy removal
   - Centered composition
   - No text
"""

RARITY_PROMPT = """
You are an art critic evaluating a generated emote/sticker.

Rate this image on a scale of 1-10 for each category:

1. VISUAL IMPACT: How bold and eye-catching is it? Does it pop?
2. CREATIVITY: How unexpected or clever is the combination?
3. MEME POTENTIAL: Would people share this? Is it funny/cool/cursed?
4. TECHNICAL QUALITY: Are the lines clean? Is the composition good?

Return ONLY valid JSON:
{
  "visual_impact": X,
  "creativity": X,
  "meme_potential": X,
  "technical_quality": X,
  "commentary": "One sentence reaction"
}

Be honest but generous. Most results should score 5-7 average.
Reserve 9-10 for truly exceptional outputs.
"""


class AuraLabService:
    """Service for The Aura Lab feature."""
    
    TIER_LIMITS = {
        "free": 1,  # Free users get 1 fusion per 28 days via free_tier_service
        "pro": 20,
        "studio": 999999
    }
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    async def set_subject(
        self,
        user_id: str,
        image_url: str,
        storage_path: str
    ) -> dict:
        """Upload and lock in a test subject for the session."""
        
        subject_id = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        self.supabase.table("aura_lab_subjects").insert({
            "id": subject_id,
            "user_id": user_id,
            "image_url": image_url,
            "storage_path": storage_path,
            "expires_at": expires_at.isoformat()
        }).execute()
        
        return {
            "subject_id": subject_id,
            "image_url": image_url,
            "expires_at": expires_at.isoformat() + "Z"
        }
    
    async def get_subject(self, user_id: str, subject_id: str) -> Optional[dict]:
        """Get a test subject by ID."""
        result = self.supabase.table("aura_lab_subjects") \
            .select("*") \
            .eq("id", subject_id) \
            .eq("user_id", user_id) \
            .gt("expires_at", datetime.utcnow().isoformat()) \
            .single() \
            .execute()
        
        return result.data if result.data else None
    
    async def fuse(
        self,
        user_id: str,
        subject_id: str,
        element_id: str,
        tier: str,
        generated_image_url: str,
        storage_path: str
    ) -> FusionResult:
        """
        Record a fusion result.
        
        Note: The actual image generation is handled by the route/caller.
        This service handles the database operations and scoring.
        """
        
        # Validate element
        if element_id not in ELEMENTS:
            raise ValueError(f"Unknown element: {element_id}")
        
        element = ELEMENTS[element_id]
        
        # Check premium access
        if element["premium"] and tier == "free":
            raise PermissionError("Premium element requires Pro or Studio tier")
        
        # Check daily limit
        can_fuse = await self._check_daily_limit(user_id, tier)
        if not can_fuse:
            raise PermissionError("Daily fusion limit reached")
        
        # Verify subject exists
        subject = await self.get_subject(user_id, subject_id)
        if not subject:
            raise ValueError("Subject not found or expired")
        
        # Generate mock scores (in production, this would call Gemini)
        scores = self._generate_mock_scores()
        rarity = self._calculate_rarity(scores)
        
        # Check for first discovery
        is_first, recipe_id = await self._check_discovery(element_id, user_id)
        
        # Save fusion
        fusion_id = str(uuid.uuid4())
        self.supabase.table("aura_lab_fusions").insert({
            "id": fusion_id,
            "user_id": user_id,
            "subject_id": subject_id,
            "element_id": element_id,
            "image_url": generated_image_url,
            "storage_path": storage_path,
            "rarity": rarity,
            "scores": scores,
            "recipe_id": recipe_id,
            "is_kept": False
        }).execute()
        
        # Increment usage
        await self._increment_usage(user_id)
        
        return FusionResult(
            fusion_id=fusion_id,
            image_url=generated_image_url,
            rarity=rarity,
            scores=scores,
            is_first_discovery=is_first,
            recipe_id=recipe_id
        )
    
    def _generate_mock_scores(self) -> dict:
        """Generate mock rarity scores for testing."""
        import random
        
        # Most results should be common (5-7 average)
        # Rare: 7-8 average, Mythic: 9+ average
        base = random.randint(5, 7)
        
        return {
            "visual_impact": min(10, max(1, base + random.randint(-1, 2))),
            "creativity": min(10, max(1, base + random.randint(-1, 2))),
            "meme_potential": min(10, max(1, base + random.randint(-1, 2))),
            "technical_quality": min(10, max(1, base + random.randint(-1, 2))),
            "commentary": "Nice fusion! The transformation looks great."
        }
    
    def _calculate_rarity(self, scores: dict) -> str:
        """Calculate rarity tier from scores."""
        total = (
            scores.get("visual_impact", 5) + 
            scores.get("creativity", 5) + 
            scores.get("meme_potential", 5) + 
            scores.get("technical_quality", 5)
        )
        
        if total >= 36:  # 90%+ average
            return "mythic"
        elif total >= 28:  # 70%+ average
            return "rare"
        return "common"
    
    async def _check_discovery(
        self, 
        element_id: str, 
        user_id: str
    ) -> Tuple[bool, Optional[str]]:
        """Check if this is a first discovery."""
        
        # Check if recipe exists
        existing = self.supabase.table("aura_lab_recipes") \
            .select("id, times_used") \
            .eq("element_id", element_id) \
            .execute()
        
        if existing.data and len(existing.data) > 0:
            # Increment usage count
            recipe = existing.data[0]
            self.supabase.table("aura_lab_recipes") \
                .update({"times_used": recipe["times_used"] + 1}) \
                .eq("id", recipe["id"]) \
                .execute()
            return False, recipe["id"]
        
        # First discovery!
        recipe_id = str(uuid.uuid4())
        self.supabase.table("aura_lab_recipes").insert({
            "id": recipe_id,
            "element_id": element_id,
            "first_user_id": user_id,
            "times_used": 1
        }).execute()
        
        return True, recipe_id
    
    async def _check_daily_limit(self, user_id: str, tier: str) -> bool:
        """Check if user can perform another fusion today."""
        limit = self.TIER_LIMITS.get(tier, 5)
        
        result = self.supabase.rpc(
            "check_aura_lab_usage",
            {"p_user_id": user_id, "p_limit": limit}
        ).execute()
        
        return result.data if result.data is not None else True
    
    async def _increment_usage(self, user_id: str):
        """Increment daily fusion count."""
        self.supabase.rpc(
            "increment_aura_lab_usage",
            {"p_user_id": user_id}
        ).execute()
    
    async def keep_fusion(self, user_id: str, fusion_id: str) -> bool:
        """Mark a fusion as kept (saved to inventory)."""
        
        result = self.supabase.table("aura_lab_fusions") \
            .update({"is_kept": True}) \
            .eq("id", fusion_id) \
            .eq("user_id", user_id) \
            .execute()
        
        return len(result.data) > 0 if result.data else False
    
    async def trash_fusion(self, user_id: str, fusion_id: str) -> bool:
        """Delete a fusion (user chose not to keep it)."""
        
        result = self.supabase.table("aura_lab_fusions") \
            .delete() \
            .eq("id", fusion_id) \
            .eq("user_id", user_id) \
            .eq("is_kept", False) \
            .execute()
        
        return len(result.data) > 0 if result.data else False
    
    async def get_inventory(
        self, 
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        rarity_filter: Optional[str] = None
    ) -> dict:
        """Get user's saved fusions."""
        
        query = self.supabase.table("aura_lab_fusions") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("is_kept", True)
        
        if rarity_filter:
            query = query.eq("rarity", rarity_filter)
        
        result = query \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()
        
        fusions = result.data or []
        
        # Count by rarity
        mythic = sum(1 for f in fusions if f["rarity"] == "mythic")
        rare = sum(1 for f in fusions if f["rarity"] == "rare")
        common = sum(1 for f in fusions if f["rarity"] == "common")
        
        return {
            "fusions": fusions,
            "total": len(fusions),
            "mythic_count": mythic,
            "rare_count": rare,
            "common_count": common
        }
    
    async def get_usage(self, user_id: str, tier: str) -> dict:
        """Get user's daily fusion usage."""
        
        limit = self.TIER_LIMITS.get(tier, 5)
        
        result = self.supabase.table("users") \
            .select("aura_lab_fusions_today, aura_lab_last_fusion_date") \
            .eq("id", user_id) \
            .single() \
            .execute()
        
        used = 0
        if result.data:
            last_date = result.data.get("aura_lab_last_fusion_date")
            # Reset if new day
            if last_date and str(last_date) == str(date.today()):
                used = result.data.get("aura_lab_fusions_today", 0)
        
        # Calculate reset time (midnight UTC)
        tomorrow = date.today() + timedelta(days=1)
        resets_at = datetime.combine(tomorrow, datetime.min.time())
        
        return {
            "used_today": used,
            "limit": limit,
            "remaining": max(0, limit - used),
            "resets_at": resets_at.isoformat() + "Z"
        }
    
    def get_elements(self, tier: str) -> dict:
        """Get available elements for user's tier."""
        
        elements = []
        premium_locked = tier == "free"
        
        for element_id, element in ELEMENTS.items():
            elements.append({
                "id": element_id,
                "name": element["name"],
                "icon": element["icon"],
                "description": element["description"],
                "premium": element["premium"],
                "locked": element["premium"] and premium_locked
            })
        
        return {
            "elements": elements,
            "premium_locked": premium_locked
        }
    
    def get_fusion_prompt(self, element_id: str) -> str:
        """Get the fusion prompt for an element."""
        if element_id not in ELEMENTS:
            raise ValueError(f"Unknown element: {element_id}")
        
        element = ELEMENTS[element_id]
        return FUSION_PROMPT_TEMPLATE.format(
            element_name=element["name"],
            element_description=element["description"]
        )
