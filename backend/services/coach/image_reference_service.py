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
    original_text: str  # The original text from the prompt
    confidence: float = 0.8


@dataclass
class ImageReference:
    """A fetched image reference for a game element."""
    element: GameElement
    image_data: bytes
    mime_type: str = "image/png"
    source_url: str = ""
    source_name: str = ""  # e.g., "Fortnite-API", "Google Images"
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
    """
    Extracts game elements from prompts that need visual references.
    
    Uses pattern matching and game-specific knowledge to identify:
    - Character skins (e.g., "Ikonik skin", "Renegade Raider")
    - Locations/POIs (e.g., "Tilted Towers", "Wonkeeland")
    - Items (e.g., "Chug Jug", "SCAR")
    """
    
    # Known Fortnite skin patterns
    FORTNITE_SKIN_PATTERNS = [
        r'\b(ikonik|renegade raider|skull trooper|ghoul trooper|black knight|'
        r'peely|fishstick|drift|catalyst|midas|meowscles|kit|jules|'
        r'jonesy|ramirez|headhunter|wildcat|aura|crystal|dynamo|'
        r'travis scott|marshmello|ninja|tfue|bugha)\b',
    ]
    
    # Known Fortnite location patterns
    FORTNITE_LOCATION_PATTERNS = [
        r'\b(tilted towers?|pleasant park|retail row|salty springs?|'
        r'lazy lake|sweaty sands|coral castle|steamy stacks|'
        r'slurpy swamp|weeping woods|misty meadows|catty corner|'
        r'doom\'?s domain|stark industries|the authority|'
        r'wonkeeland|battlewood|grand glacier|mount olympus|'
        r'lavish lair|reckless railways|restored reels|'
        r'brutal boxcars|classy courts|fencing fields)\b',
    ]
    
    # Game detection patterns
    GAME_PATTERNS = {
        "fortnite": r'\b(fortnite|fn|battle royale|chapter \d|season \d)\b',
        "apex legends": r'\b(apex|apex legends|legends)\b',
        "valorant": r'\b(valorant|valo)\b',
        "call of duty": r'\b(call of duty|cod|warzone|modern warfare|mw\d?)\b',
        "minecraft": r'\b(minecraft|mc)\b',
        "league of legends": r'\b(league of legends|lol|league)\b',
    }
    
    def extract_elements(self, prompt: str, game_hint: Optional[str] = None) -> List[GameElement]:
        """
        Extract game elements from a prompt that need visual references.
        
        Args:
            prompt: The generation prompt
            game_hint: Optional hint about which game (from session context)
            
        Returns:
            List of GameElement objects
        """
        elements = []
        prompt_lower = prompt.lower()
        
        # Detect game if not provided
        game = game_hint.lower() if game_hint else self._detect_game(prompt_lower)
        
        if game == "fortnite" or not game:
            # Extract Fortnite skins
            for pattern in self.FORTNITE_SKIN_PATTERNS:
                matches = re.finditer(pattern, prompt_lower)
                for match in matches:
                    skin_name = match.group(0).title()
                    elements.append(GameElement(
                        name=skin_name,
                        element_type=ElementType.SKIN,
                        game="fortnite",
                        original_text=match.group(0),
                        confidence=0.9,
                    ))
            
            # Extract Fortnite locations
            for pattern in self.FORTNITE_LOCATION_PATTERNS:
                matches = re.finditer(pattern, prompt_lower)
                for match in matches:
                    location_name = match.group(0).title()
                    elements.append(GameElement(
                        name=location_name,
                        element_type=ElementType.LOCATION,
                        game="fortnite",
                        original_text=match.group(0),
                        confidence=0.85,
                    ))
        
        # Also look for generic patterns
        elements.extend(self._extract_generic_elements(prompt, game or "unknown"))
        
        # Deduplicate by name
        seen = set()
        unique_elements = []
        for elem in elements:
            key = f"{elem.game}:{elem.name.lower()}"
            if key not in seen:
                seen.add(key)
                unique_elements.append(elem)
        
        return unique_elements
    
    def _detect_game(self, prompt_lower: str) -> Optional[str]:
        """Detect which game the prompt is about."""
        for game, pattern in self.GAME_PATTERNS.items():
            if re.search(pattern, prompt_lower):
                return game
        return None
    
    def _extract_generic_elements(self, prompt: str, game: str) -> List[GameElement]:
        """Extract elements using generic patterns."""
        elements = []
        prompt_lower = prompt.lower()
        
        # Look for "X skin" pattern
        skin_matches = re.finditer(r'(\w+(?:\s+\w+)?)\s+skin\b', prompt_lower)
        for match in skin_matches:
            skin_name = match.group(1).title()
            # Skip if it's a generic word
            if skin_name.lower() not in ['the', 'a', 'my', 'your', 'this', 'that']:
                elements.append(GameElement(
                    name=skin_name,
                    element_type=ElementType.SKIN,
                    game=game,
                    original_text=match.group(0),
                    confidence=0.7,
                ))
        
        # Look for capitalized proper nouns that might be locations
        # (2+ capitalized words together)
        location_matches = re.finditer(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b', prompt)
        for match in location_matches:
            location_name = match.group(1)
            # Skip common non-location phrases
            skip_phrases = ['Be Back', 'Coming Soon', 'Victory Royale', 'Game Over']
            if location_name not in skip_phrases:
                elements.append(GameElement(
                    name=location_name,
                    element_type=ElementType.LOCATION,
                    game=game,
                    original_text=match.group(0),
                    confidence=0.6,
                ))
        
        return elements


class FortniteAPIClient:
    """
    Client for Fortnite-API.com to fetch skin and item images.
    
    API docs: https://fortnite-api.com/
    """
    
    BASE_URL = "https://fortnite-api.com/v2"
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Fortnite API client.
        
        Args:
            api_key: Optional API key (not required for basic usage)
        """
        self.api_key = api_key or os.environ.get("FORTNITE_API_KEY")
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self._session is None or self._session.closed:
            headers = {}
            if self.api_key:
                headers["Authorization"] = self.api_key
            self._session = aiohttp.ClientSession(
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=30)
            )
        return self._session
    
    async def close(self):
        """Close the session."""
        if self._session and not self._session.closed:
            await self._session.close()
    
    async def search_cosmetic(self, name: str) -> Optional[Dict[str, Any]]:
        """
        Search for a cosmetic (skin, emote, etc.) by name.
        
        Args:
            name: Name to search for
            
        Returns:
            Cosmetic data dict or None if not found
        """
        try:
            session = await self._get_session()
            url = f"{self.BASE_URL}/cosmetics/br/search"
            params = {"name": name, "matchMethod": "contains"}
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("status") == 200 and data.get("data"):
                        return data["data"]
                elif response.status == 404:
                    logger.debug(f"Cosmetic not found: {name}")
                else:
                    logger.warning(f"Fortnite API error: {response.status}")
                    
        except Exception as e:
            logger.warning(f"Fortnite API search failed: {e}")
        
        return None
    
    async def get_cosmetic_image(self, cosmetic_data: Dict[str, Any]) -> Optional[bytes]:
        """
        Fetch the image for a cosmetic.
        
        Args:
            cosmetic_data: Cosmetic data from search
            
        Returns:
            Image bytes or None
        """
        try:
            # Try to get the best image URL
            images = cosmetic_data.get("images", {})
            image_url = (
                images.get("icon") or
                images.get("smallIcon") or
                images.get("featured") or
                images.get("background")
            )
            
            if not image_url:
                return None
            
            session = await self._get_session()
            async with session.get(image_url) as response:
                if response.status == 200:
                    return await response.read()
                    
        except Exception as e:
            logger.warning(f"Failed to fetch cosmetic image: {e}")
        
        return None
    
    async def search_poi(self, name: str) -> Optional[Dict[str, Any]]:
        """
        Search for a POI/location.
        
        Note: Fortnite-API doesn't have a dedicated POI endpoint,
        so we'll use the map endpoint or fall back to Google search.
        """
        # POI search is limited - we'll primarily use Google for locations
        return None


class GoogleImageSearchClient:
    """
    Client for Google Custom Search API for image search.
    
    Used as fallback for elements not found in game-specific APIs.
    """
    
    BASE_URL = "https://www.googleapis.com/customsearch/v1"
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        search_engine_id: Optional[str] = None,
    ):
        """
        Initialize Google Image Search client.
        
        Args:
            api_key: Google API key
            search_engine_id: Custom Search Engine ID
        """
        self.api_key = api_key or os.environ.get("GOOGLE_CUSTOM_SEARCH_API_KEY")
        self.search_engine_id = search_engine_id or os.environ.get("GOOGLE_CUSTOM_SEARCH_ENGINE_ID")
        self._session: Optional[aiohttp.ClientSession] = None
    
    @property
    def is_configured(self) -> bool:
        """Check if the client is properly configured."""
        return bool(self.api_key and self.search_engine_id)
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30)
            )
        return self._session
    
    async def close(self):
        """Close the session."""
        if self._session and not self._session.closed:
            await self._session.close()
    
    async def search_image(
        self,
        query: str,
        num_results: int = 1,
    ) -> List[Dict[str, Any]]:
        """
        Search for images.
        
        Args:
            query: Search query
            num_results: Number of results to return
            
        Returns:
            List of image result dicts with 'url', 'title', etc.
        """
        if not self.is_configured:
            logger.debug("Google Image Search not configured")
            return []
        
        try:
            session = await self._get_session()
            params = {
                "key": self.api_key,
                "cx": self.search_engine_id,
                "q": query,
                "searchType": "image",
                "num": min(num_results, 10),
                "safe": "active",
                "imgSize": "large",
            }
            
            async with session.get(self.BASE_URL, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    items = data.get("items", [])
                    return [
                        {
                            "url": item.get("link"),
                            "title": item.get("title"),
                            "thumbnail": item.get("image", {}).get("thumbnailLink"),
                            "width": item.get("image", {}).get("width"),
                            "height": item.get("image", {}).get("height"),
                        }
                        for item in items
                        if item.get("link")
                    ]
                else:
                    logger.warning(f"Google Image Search error: {response.status}")
                    
        except Exception as e:
            logger.warning(f"Google Image Search failed: {e}")
        
        return []
    
    async def fetch_image(self, url: str) -> Optional[bytes]:
        """
        Fetch image bytes from URL.
        
        Args:
            url: Image URL
            
        Returns:
            Image bytes or None
        """
        try:
            session = await self._get_session()
            async with session.get(url) as response:
                if response.status == 200:
                    content_type = response.headers.get("Content-Type", "")
                    if "image" in content_type:
                        return await response.read()
                        
        except Exception as e:
            logger.warning(f"Failed to fetch image from {url}: {e}")
        
        return None


class ImageReferenceService:
    """
    Main service for fetching image references for game elements.
    
    Orchestrates:
    1. Element extraction from prompts
    2. Searching game-specific APIs (Fortnite-API, etc.)
    3. Falling back to Google Image Search
    4. Caching results for performance
    """
    
    # Cache TTL in seconds (1 hour for game assets)
    CACHE_TTL = 3600
    CACHE_PREFIX = "img_ref:"
    
    def __init__(
        self,
        fortnite_client: Optional[FortniteAPIClient] = None,
        google_client: Optional[GoogleImageSearchClient] = None,
        redis_client=None,
    ):
        """
        Initialize the image reference service.
        
        Args:
            fortnite_client: Fortnite API client
            google_client: Google Image Search client
            redis_client: Redis client for caching
        """
        self.extractor = ElementExtractor()
        self._fortnite = fortnite_client
        self._google = google_client
        self._redis = redis_client
        self._session: Optional[aiohttp.ClientSession] = None
    
    @property
    def fortnite(self) -> FortniteAPIClient:
        """Lazy-load Fortnite client."""
        if self._fortnite is None:
            self._fortnite = FortniteAPIClient()
        return self._fortnite
    
    @property
    def google(self) -> GoogleImageSearchClient:
        """Lazy-load Google client."""
        if self._google is None:
            self._google = GoogleImageSearchClient()
        return self._google
    
    @property
    def redis(self):
        """Lazy-load Redis client."""
        if self._redis is None:
            try:
                from backend.database.redis_client import get_redis_client
                self._redis = get_redis_client()
            except Exception:
                pass
        return self._redis
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session for direct fetches."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30)
            )
        return self._session
    
    async def close(self):
        """Close all sessions."""
        if self._session and not self._session.closed:
            await self._session.close()
        if self._fortnite:
            await self._fortnite.close()
        if self._google:
            await self._google.close()
    
    async def get_references_for_prompt(
        self,
        prompt: str,
        game_hint: Optional[str] = None,
        max_references: int = 3,
    ) -> ReferenceSearchResult:
        """
        Get image references for elements in a prompt.
        
        Args:
            prompt: The generation prompt
            game_hint: Optional hint about which game
            max_references: Maximum number of references to fetch
            
        Returns:
            ReferenceSearchResult with fetched images
        """
        import time
        start_time = time.time()
        
        result = ReferenceSearchResult()
        
        # Extract elements from prompt
        elements = self.extractor.extract_elements(prompt, game_hint)
        result.elements_found = elements
        
        if not elements:
            logger.debug("No game elements found in prompt")
            result.search_time_ms = int((time.time() - start_time) * 1000)
            return result
        
        logger.info(f"Found {len(elements)} game elements to reference: {[e.name for e in elements]}")
        
        # Fetch references for each element (up to max)
        tasks = []
        for element in elements[:max_references]:
            tasks.append(self._fetch_reference(element))
        
        references = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, ref in enumerate(references):
            if isinstance(ref, Exception):
                logger.warning(f"Failed to fetch reference for {elements[i].name}: {ref}")
                result.elements_not_found.append(elements[i])
            elif ref is not None:
                result.references.append(ref)
            else:
                result.elements_not_found.append(elements[i])
        
        result.search_time_ms = int((time.time() - start_time) * 1000)
        logger.info(
            f"Fetched {len(result.references)} references in {result.search_time_ms}ms "
            f"({len(result.elements_not_found)} not found)"
        )
        
        return result
    
    async def _fetch_reference(self, element: GameElement) -> Optional[ImageReference]:
        """
        Fetch a reference image for a single element.
        
        Tries game-specific APIs first, then falls back to Google.
        """
        # Check cache first
        cached = await self._get_cached(element)
        if cached:
            logger.debug(f"Cache hit for {element.name}")
            return cached
        
        reference = None
        
        # Try game-specific API
        if element.game == "fortnite":
            reference = await self._fetch_fortnite_reference(element)
        
        # Fall back to Google Image Search
        if reference is None and self.google.is_configured:
            reference = await self._fetch_google_reference(element)
        
        # Cache the result
        if reference:
            await self._cache_reference(element, reference)
        
        return reference
    
    async def _fetch_fortnite_reference(self, element: GameElement) -> Optional[ImageReference]:
        """Fetch reference from Fortnite-API."""
        try:
            if element.element_type == ElementType.SKIN:
                cosmetic = await self.fortnite.search_cosmetic(element.name)
                if cosmetic:
                    image_data = await self.fortnite.get_cosmetic_image(cosmetic)
                    if image_data:
                        return ImageReference(
                            element=element,
                            image_data=image_data,
                            mime_type="image/png",
                            source_url=cosmetic.get("images", {}).get("icon", ""),
                            source_name="Fortnite-API",
                        )
            
            elif element.element_type == ElementType.LOCATION:
                # Fortnite-API doesn't have good POI images
                # Fall through to Google
                pass
                
        except Exception as e:
            logger.warning(f"Fortnite API fetch failed for {element.name}: {e}")
        
        return None
    
    async def _fetch_google_reference(self, element: GameElement) -> Optional[ImageReference]:
        """Fetch reference from Google Image Search."""
        try:
            # Build search query
            query = self._build_search_query(element)
            
            results = await self.google.search_image(query, num_results=1)
            if results:
                image_url = results[0]["url"]
                image_data = await self.google.fetch_image(image_url)
                if image_data:
                    # Determine mime type from URL
                    mime_type = "image/png"
                    if ".jpg" in image_url.lower() or ".jpeg" in image_url.lower():
                        mime_type = "image/jpeg"
                    elif ".webp" in image_url.lower():
                        mime_type = "image/webp"
                    
                    return ImageReference(
                        element=element,
                        image_data=image_data,
                        mime_type=mime_type,
                        source_url=image_url,
                        source_name="Google Images",
                        width=results[0].get("width"),
                        height=results[0].get("height"),
                    )
                    
        except Exception as e:
            logger.warning(f"Google Image Search failed for {element.name}: {e}")
        
        return None
    
    def _build_search_query(self, element: GameElement) -> str:
        """Build an optimized search query for an element."""
        game = element.game.title() if element.game != "unknown" else ""
        
        if element.element_type == ElementType.SKIN:
            return f"{game} {element.name} skin official render transparent"
        elif element.element_type == ElementType.LOCATION:
            return f"{game} {element.name} POI screenshot in-game"
        elif element.element_type == ElementType.CHARACTER:
            return f"{game} {element.name} character render"
        elif element.element_type == ElementType.ITEM:
            return f"{game} {element.name} item icon"
        else:
            return f"{game} {element.name}"
    
    def _cache_key(self, element: GameElement) -> str:
        """Generate cache key for an element."""
        key_str = f"{element.game}:{element.element_type}:{element.name.lower()}"
        return f"{self.CACHE_PREFIX}{hashlib.sha256(key_str.encode()).hexdigest()[:16]}"
    
    async def _get_cached(self, element: GameElement) -> Optional[ImageReference]:
        """Get cached reference if available."""
        if not self.redis:
            return None
        
        try:
            import json
            cache_key = self._cache_key(element)
            cached_data = await self.redis.get(cache_key)
            
            if cached_data:
                data = json.loads(cached_data)
                return ImageReference(
                    element=element,
                    image_data=bytes.fromhex(data["image_hex"]),
                    mime_type=data["mime_type"],
                    source_url=data["source_url"],
                    source_name=data["source_name"],
                )
        except Exception as e:
            logger.debug(f"Cache get failed: {e}")
        
        return None
    
    async def _cache_reference(self, element: GameElement, reference: ImageReference) -> None:
        """Cache a reference for future use."""
        if not self.redis:
            return
        
        try:
            import json
            cache_key = self._cache_key(element)
            data = {
                "image_hex": reference.image_data.hex(),
                "mime_type": reference.mime_type,
                "source_url": reference.source_url,
                "source_name": reference.source_name,
            }
            await self.redis.setex(cache_key, self.CACHE_TTL, json.dumps(data))
            logger.debug(f"Cached reference for {element.name}")
        except Exception as e:
            logger.debug(f"Cache set failed: {e}")


# Singleton instance
_image_reference_service: Optional[ImageReferenceService] = None


def get_image_reference_service() -> ImageReferenceService:
    """Get or create the image reference service singleton."""
    global _image_reference_service
    if _image_reference_service is None:
        _image_reference_service = ImageReferenceService()
    return _image_reference_service


__all__ = [
    "ElementType",
    "GameElement",
    "ImageReference",
    "ReferenceSearchResult",
    "ElementExtractor",
    "FortniteAPIClient",
    "GoogleImageSearchClient",
    "ImageReferenceService",
    "get_image_reference_service",
]
