"""
Image Reference Service for Aurastream.

Searches for and fetches actual reference images of game elements
(skins, locations, items, characters) to provide visual grounding
for NanoBanana generation.

This prevents hallucination by giving the model actual images to reference
instead of relying on text descriptions alone.

Supported sources:
- Fortnite-API.com (skins, items, POIs)
- Google Custom Search (fallback for other games)
- Direct URL fetch (for known asset URLs)
"""

import asyncio
import hashlib
import logging
import os
import re
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from enum import Enum

import aiohttp

logger = logging.getLogger(__name__)


class ElementType(str, Enum):
    """Types of game elements we can search for."""
    SKIN = "skin"
    CHARACTER = "character"
    LOCATION = "location"
    ITEM = "item"
    WEAPON = "weapon"
    VEHICLE = "vehicle"
    EMOTE = "emote"
    UNKNOWN = "unknown"


@dataclass
class GameElement:
    """A detected game element that needs visual reference."""
    name: str
    element_type: ElementType
    game: str
    original_text: str
    confidence: float = 0.8


@dataclass
class ImageReference:
    """A fetched image reference for a game element."""
    element: GameElement
    image_data: bytes
    mime_type: str = "image/png"
    source_url: str = ""
    source_name: str = ""
    width: Optional[int] = None
    height: Optional[int] = None


@dataclass
class ReferenceSearchResult:
    """Result of searching for image references."""
    references: List[ImageReference] = field(default_factory=list)
    elements_found: List[GameElement] = field(default_factory=list)
    elements_not_found: List[GameElement] = field(default_factory=list)
    search_time_ms: int = 0


class ElementExtractor:
    """Extracts game elements from prompts that need visual references."""
    
    # Known skins - but we'll also use dynamic extraction
    FORTNITE_SKIN_PATTERNS = [
        r'\b(ikonik|renegade raider|skull trooper|ghoul trooper|black knight|'
        r'peely|fishstick|drift|catalyst|midas|meowscles|kit|jules|'
        r'jonesy|ramirez|headhunter|wildcat|aura|crystal|dynamo|'
        r'travis scott|marshmello|ninja|tfue|bugha)\b',
    ]
    
    FORTNITE_LOCATION_PATTERNS = [
        r'\b(tilted towers?|pleasant park|retail row|salty springs?|'
        r'lazy lake|sweaty sands|coral castle|steamy stacks|'
        r'slurpy swamp|weeping woods|misty meadows|catty corner|'
        r'doom\'?s domain|stark industries|the authority|'
        r'wonkeeland|battlewood|grand glacier|mount olympus|'
        r'lavish lair|reckless railways|restored reels|'
        r'brutal boxcars|classy courts|fencing fields)\b',
    ]
    
    GAME_PATTERNS = {
        "fortnite": r'\b(fortnite|fn|battle royale|chapter \d|season \d)\b',
        "apex legends": r'\b(apex|apex legends|legends)\b',
        "valorant": r'\b(valorant|valo)\b',
        "call of duty": r'\b(call of duty|cod|warzone|modern warfare|mw\d?)\b',
        "minecraft": r'\b(minecraft|mc)\b',
        "league of legends": r'\b(league of legends|lol|league)\b',
    }
    
    # Patterns that indicate a skin/character name follows
    SKIN_INDICATOR_PATTERNS = [
        r'(?:featuring|include|use|with)\s+(?:the\s+)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)',
        r'\*\*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\*\*',  # Bold text
        r'"([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)"',  # Quoted text
        r'([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+skin\b',  # "X skin"
        r'([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+character\b',  # "X character"
    ]
    
    # Words to exclude from skin name extraction
    EXCLUDE_WORDS = {
        "the", "and", "for", "with", "from", "this", "that", "your", "my",
        "ready", "perfect", "great", "thumbnail", "emote", "banner", "image",
        "fortnite", "chapter", "season", "battle", "pass", "map", "game",
        "intent", "chill", "cool", "awesome", "nice", "want", "make", "create",
    }
    
    def extract_elements(self, prompt: str, game_hint: Optional[str] = None) -> List[GameElement]:
        """Extract game elements from a prompt."""
        elements = []
        prompt_lower = prompt.lower()
        game = game_hint.lower() if game_hint else self._detect_game(prompt_lower)
        
        # 1. Try known patterns first
        if game == "fortnite" or not game:
            for pattern in self.FORTNITE_SKIN_PATTERNS:
                for match in re.finditer(pattern, prompt_lower):
                    elements.append(GameElement(
                        name=match.group(0).title(),
                        element_type=ElementType.SKIN,
                        game="fortnite",
                        original_text=match.group(0),
                        confidence=0.9,
                    ))
            
            for pattern in self.FORTNITE_LOCATION_PATTERNS:
                for match in re.finditer(pattern, prompt_lower):
                    elements.append(GameElement(
                        name=match.group(0).title(),
                        element_type=ElementType.LOCATION,
                        game="fortnite",
                        original_text=match.group(0),
                        confidence=0.85,
                    ))
        
        # 2. Dynamic extraction for unknown skins/characters
        # This catches new Battle Pass skins like "The Bride", "Kingston", "Marty McFly"
        elements.extend(self._extract_dynamic_elements(prompt, game or "fortnite"))
        
        # 3. Generic patterns
        elements.extend(self._extract_generic_elements(prompt, game or "unknown"))
        
        # Deduplicate
        seen = set()
        unique = []
        for elem in elements:
            key = f"{elem.game}:{elem.name.lower()}"
            if key not in seen:
                seen.add(key)
                unique.append(elem)
        return unique
    
    def _detect_game(self, prompt_lower: str) -> Optional[str]:
        for game, pattern in self.GAME_PATTERNS.items():
            if re.search(pattern, prompt_lower):
                return game
        return None
    
    def _extract_dynamic_elements(self, prompt: str, game: str) -> List[GameElement]:
        """
        Dynamically extract character/skin names that aren't in our known patterns.
        
        This catches new skins like "The Bride", "Kingston", "Marty McFly" etc.
        """
        elements = []
        
        for pattern in self.SKIN_INDICATOR_PATTERNS:
            for match in re.finditer(pattern, prompt, re.IGNORECASE):
                name = match.group(1).strip()
                
                # Filter out common words
                name_words = name.lower().split()
                if all(w in self.EXCLUDE_WORDS for w in name_words):
                    continue
                
                # Must be at least 2 characters
                if len(name) < 3:
                    continue
                
                # Skip if it's just "The" or similar
                if name.lower() in self.EXCLUDE_WORDS:
                    continue
                
                elements.append(GameElement(
                    name=name.title(),
                    element_type=ElementType.SKIN,
                    game=game,
                    original_text=match.group(0),
                    confidence=0.75,  # Lower confidence for dynamic extraction
                ))
        
        return elements
    
    def _extract_generic_elements(self, prompt: str, game: str) -> List[GameElement]:
        elements = []
        prompt_lower = prompt.lower()
        
        for match in re.finditer(r'(\w+(?:\s+\w+)?)\s+skin\b', prompt_lower):
            skin_name = match.group(1).title()
            if skin_name.lower() not in self.EXCLUDE_WORDS:
                elements.append(GameElement(
                    name=skin_name,
                    element_type=ElementType.SKIN,
                    game=game,
                    original_text=match.group(0),
                    confidence=0.7,
                ))
        
        return elements


class FortniteAPIClient:
    """Client for Fortnite-API.com."""
    
    BASE_URL = "https://fortnite-api.com/v2"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("FORTNITE_API_KEY")
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            headers = {"Authorization": self.api_key} if self.api_key else {}
            self._session = aiohttp.ClientSession(headers=headers, timeout=aiohttp.ClientTimeout(total=30))
        return self._session
    
    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()
    
    async def search_cosmetic(self, name: str) -> Optional[Dict[str, Any]]:
        try:
            session = await self._get_session()
            async with session.get(f"{self.BASE_URL}/cosmetics/br/search", params={"name": name, "matchMethod": "contains"}) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get("status") == 200:
                        return data.get("data")
        except Exception as e:
            logger.warning(f"Fortnite API search failed: {e}")
        return None
    
    async def get_cosmetic_image(self, cosmetic_data: Dict[str, Any]) -> Optional[bytes]:
        try:
            images = cosmetic_data.get("images", {})
            url = images.get("icon") or images.get("smallIcon") or images.get("featured")
            if url:
                session = await self._get_session()
                async with session.get(url) as resp:
                    if resp.status == 200:
                        return await resp.read()
        except Exception as e:
            logger.warning(f"Failed to fetch cosmetic image: {e}")
        return None


class GoogleImageSearchClient:
    """Client for Google Custom Search API."""
    
    BASE_URL = "https://www.googleapis.com/customsearch/v1"
    
    def __init__(self, api_key: Optional[str] = None, search_engine_id: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GOOGLE_CUSTOM_SEARCH_API_KEY")
        self.search_engine_id = search_engine_id or os.environ.get("GOOGLE_CUSTOM_SEARCH_ENGINE_ID")
        self._session: Optional[aiohttp.ClientSession] = None
    
    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.search_engine_id)
    
    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30))
        return self._session
    
    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()
    
    async def search_image(self, query: str, num_results: int = 1) -> List[Dict[str, Any]]:
        if not self.is_configured:
            return []
        try:
            session = await self._get_session()
            params = {
                "key": self.api_key, "cx": self.search_engine_id, "q": query,
                "searchType": "image", "num": min(num_results, 10), "safe": "active", "imgSize": "large",
            }
            async with session.get(self.BASE_URL, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return [{"url": i.get("link"), "title": i.get("title")} for i in data.get("items", []) if i.get("link")]
        except Exception as e:
            logger.warning(f"Google Image Search failed: {e}")
        return []
    
    async def fetch_image(self, url: str) -> Optional[bytes]:
        try:
            session = await self._get_session()
            async with session.get(url) as resp:
                if resp.status == 200 and "image" in resp.headers.get("Content-Type", ""):
                    return await resp.read()
        except Exception as e:
            logger.warning(f"Failed to fetch image: {e}")
        return None


class ImageReferenceService:
    """Main service for fetching image references for game elements."""
    
    CACHE_TTL = 3600
    CACHE_PREFIX = "img_ref:"
    
    def __init__(self, fortnite_client: Optional[FortniteAPIClient] = None, google_client: Optional[GoogleImageSearchClient] = None, redis_client=None):
        self.extractor = ElementExtractor()
        self._fortnite = fortnite_client
        self._google = google_client
        self._redis = redis_client
    
    @property
    def fortnite(self) -> FortniteAPIClient:
        if self._fortnite is None:
            self._fortnite = FortniteAPIClient()
        return self._fortnite
    
    @property
    def google(self) -> GoogleImageSearchClient:
        if self._google is None:
            self._google = GoogleImageSearchClient()
        return self._google
    
    @property
    def redis(self):
        if self._redis is None:
            try:
                from backend.database.redis_client import get_redis_client
                self._redis = get_redis_client()
            except Exception:
                pass
        return self._redis
    
    async def close(self):
        if self._fortnite:
            await self._fortnite.close()
        if self._google:
            await self._google.close()
    
    async def get_references_for_prompt(self, prompt: str, game_hint: Optional[str] = None, max_references: int = 3) -> ReferenceSearchResult:
        import time
        start = time.time()
        result = ReferenceSearchResult()
        
        elements = self.extractor.extract_elements(prompt, game_hint)
        result.elements_found = elements
        
        if not elements:
            result.search_time_ms = int((time.time() - start) * 1000)
            return result
        
        refs = await asyncio.gather(*[self._fetch_reference(e) for e in elements[:max_references]], return_exceptions=True)
        
        for i, ref in enumerate(refs):
            if isinstance(ref, Exception) or ref is None:
                result.elements_not_found.append(elements[i])
            else:
                result.references.append(ref)
        
        result.search_time_ms = int((time.time() - start) * 1000)
        return result
    
    async def _fetch_reference(self, element: GameElement) -> Optional[ImageReference]:
        cached = await self._get_cached(element)
        if cached:
            return cached
        
        ref = None
        if element.game == "fortnite" and element.element_type == ElementType.SKIN:
            cosmetic = await self.fortnite.search_cosmetic(element.name)
            if cosmetic:
                img = await self.fortnite.get_cosmetic_image(cosmetic)
                if img:
                    ref = ImageReference(element=element, image_data=img, source_name="Fortnite-API")
        
        if ref is None and self.google.is_configured:
            results = await self.google.search_image(f"{element.game} {element.name}", 1)
            if results:
                img = await self.google.fetch_image(results[0]["url"])
                if img:
                    ref = ImageReference(element=element, image_data=img, source_url=results[0]["url"], source_name="Google Images")
        
        if ref:
            await self._cache_reference(element, ref)
        return ref
    
    def _cache_key(self, element: GameElement) -> str:
        key = f"{element.game}:{element.element_type}:{element.name.lower()}"
        return f"{self.CACHE_PREFIX}{hashlib.sha256(key.encode()).hexdigest()[:16]}"
    
    async def _get_cached(self, element: GameElement) -> Optional[ImageReference]:
        if not self.redis:
            return None
        try:
            import json
            data = await self.redis.get(self._cache_key(element))
            if data:
                d = json.loads(data)
                return ImageReference(element=element, image_data=bytes.fromhex(d["image_hex"]), mime_type=d["mime_type"], source_url=d["source_url"], source_name=d["source_name"])
        except Exception:
            pass
        return None
    
    async def _cache_reference(self, element: GameElement, ref: ImageReference) -> None:
        if not self.redis:
            return
        try:
            import json
            await self.redis.setex(self._cache_key(element), self.CACHE_TTL, json.dumps({
                "image_hex": ref.image_data.hex(), "mime_type": ref.mime_type, "source_url": ref.source_url, "source_name": ref.source_name
            }))
        except Exception:
            pass


_image_reference_service: Optional[ImageReferenceService] = None


def get_image_reference_service() -> ImageReferenceService:
    global _image_reference_service
    if _image_reference_service is None:
        _image_reference_service = ImageReferenceService()
    return _image_reference_service


__all__ = [
    "ElementType", "GameElement", "ImageReference", "ReferenceSearchResult",
    "ElementExtractor", "FortniteAPIClient", "GoogleImageSearchClient",
    "ImageReferenceService", "get_image_reference_service",
]
