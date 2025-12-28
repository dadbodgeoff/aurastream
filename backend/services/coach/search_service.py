"""
Web Search Service for Prompt Coach Grounding.

Provides web search capabilities for the grounding feature to fetch
current information about games, events, and other time-sensitive content.

Supports multiple backends:
- DuckDuckGo (free, no API key required)
- Mock (for testing)
- None (disabled)

Configuration via COACH_SEARCH_PROVIDER environment variable:
- "duckduckgo" (default if library available)
- "mock" (for testing)
- "none" (disabled)
"""

import asyncio
import logging
import os
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """A single web search result."""
    
    title: str
    """Title of the search result."""
    
    snippet: str
    """Brief excerpt/description from the page."""
    
    url: str
    """URL of the search result."""
    
    source: str
    """Domain/source of the result (e.g., 'reddit.com')."""


class WebSearchService(ABC):
    """
    Abstract base class for web search services.
    
    Implementations should handle errors gracefully and return
    empty lists on failure rather than raising exceptions.
    """
    
    @abstractmethod
    async def search(self, query: str, max_results: int = 3) -> List[SearchResult]:
        """
        Perform a web search.
        
        Args:
            query: The search query string.
            max_results: Maximum number of results to return (default: 3).
            
        Returns:
            List of SearchResult objects. Returns empty list on error.
        """
        pass


class DuckDuckGoSearchService(WebSearchService):
    """
    Web search service using DuckDuckGo.
    
    Uses the duckduckgo_search library which is free and doesn't
    require API keys. Includes rate limiting to avoid being blocked.
    """
    
    def __init__(self, min_interval: float = 1.0):
        """
        Initialize the DuckDuckGo search service.
        
        Args:
            min_interval: Minimum seconds between searches (default: 1.0).
        """
        self._last_search_time: float = 0.0
        self._min_interval = min_interval
        self._lock = asyncio.Lock()
    
    async def search(self, query: str, max_results: int = 3) -> List[SearchResult]:
        """
        Perform a web search using DuckDuckGo.
        
        Args:
            query: The search query string.
            max_results: Maximum number of results to return (default: 3).
            
        Returns:
            List of SearchResult objects. Returns empty list on error.
        """
        try:
            # Check if library is available
            import duckduckgo_search  # noqa: F401
        except ImportError:
            logger.warning("duckduckgo_search library not installed")
            return []
        
        # Rate limiting
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_search_time
            if elapsed < self._min_interval:
                wait_time = self._min_interval - elapsed
                logger.debug(f"Rate limiting: waiting {wait_time:.2f}s before search")
                await asyncio.sleep(wait_time)
            self._last_search_time = time.monotonic()
        
        try:
            # DuckDuckGo library is synchronous, wrap with to_thread
            results = await asyncio.to_thread(
                self._sync_search, query, max_results
            )
            
            logger.info(f"DuckDuckGo search for '{query}' returned {len(results)} results")
            return results
            
        except Exception as e:
            logger.error(f"DuckDuckGo search failed for '{query}': {e}")
            return []
    
    def _sync_search(self, query: str, max_results: int) -> List[SearchResult]:
        """
        Synchronous search implementation.
        
        Args:
            query: The search query string.
            max_results: Maximum number of results to return.
            
        Returns:
            List of SearchResult objects.
        """
        from duckduckgo_search import DDGS
        
        results: List[SearchResult] = []
        
        with DDGS() as ddgs:
            raw_results = ddgs.text(query, max_results=max_results)
            
            for item in raw_results:
                # Extract domain from URL for source
                url = item.get("href", "")
                source = self._extract_domain(url)
                
                results.append(SearchResult(
                    title=item.get("title", ""),
                    snippet=item.get("body", ""),
                    url=url,
                    source=source,
                ))
        
        return results
    
    @staticmethod
    def _extract_domain(url: str) -> str:
        """
        Extract domain from URL.
        
        Args:
            url: Full URL string.
            
        Returns:
            Domain name (e.g., 'reddit.com').
        """
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            domain = parsed.netloc
            # Remove 'www.' prefix if present
            if domain.startswith("www."):
                domain = domain[4:]
            return domain
        except Exception:
            return ""


class MockSearchService(WebSearchService):
    """
    Mock search service for testing.
    
    Returns predefined fake results for any query.
    """
    
    def __init__(self, results: Optional[List[SearchResult]] = None):
        """
        Initialize the mock search service.
        
        Args:
            results: Optional predefined results to return.
                    If None, generates default fake results.
        """
        self._custom_results = results
    
    async def search(self, query: str, max_results: int = 3) -> List[SearchResult]:
        """
        Return mock search results.
        
        Args:
            query: The search query string (used in fake results).
            max_results: Maximum number of results to return.
            
        Returns:
            List of mock SearchResult objects.
        """
        logger.debug(f"Mock search for '{query}' (max_results={max_results})")
        
        if self._custom_results is not None:
            return self._custom_results[:max_results]
        
        # Generate default fake results
        fake_results = [
            SearchResult(
                title=f"Latest {query} News and Updates",
                snippet=f"Get the most recent information about {query}. "
                        f"Updated daily with the latest news, guides, and tips.",
                url=f"https://example.com/{query.replace(' ', '-').lower()}",
                source="example.com",
            ),
            SearchResult(
                title=f"{query} - Official Wiki",
                snippet=f"The official wiki for {query}. Find detailed information, "
                        f"guides, and community resources.",
                url=f"https://wiki.example.com/{query.replace(' ', '-').lower()}",
                source="wiki.example.com",
            ),
            SearchResult(
                title=f"Reddit - {query} Discussion",
                snippet=f"Join the community discussion about {query}. "
                        f"Share tips, ask questions, and connect with others.",
                url=f"https://reddit.com/r/{query.replace(' ', '').lower()}",
                source="reddit.com",
            ),
        ]
        
        return fake_results[:max_results]


# Type alias for the factory return type
SearchServiceType = Optional[WebSearchService]

# Singleton instance
_search_service: Optional[SearchServiceType] = None
_search_service_initialized: bool = False


def _is_duckduckgo_available() -> bool:
    """Check if the duckduckgo_search library is available."""
    try:
        import duckduckgo_search  # noqa: F401
        return True
    except ImportError:
        return False


def get_search_service(force_reinit: bool = False) -> SearchServiceType:
    """
    Factory function to get the appropriate search service.
    
    Configuration via COACH_SEARCH_PROVIDER environment variable:
    - "duckduckgo": Use DuckDuckGo search (default if library available)
    - "mock": Use mock search service (for testing)
    - "none": Disable search (returns None)
    
    If not configured, defaults to DuckDuckGo if available, otherwise Mock.
    
    Args:
        force_reinit: Force re-initialization of the service (for testing).
        
    Returns:
        WebSearchService instance or None if disabled.
    """
    global _search_service, _search_service_initialized
    
    if _search_service_initialized and not force_reinit:
        return _search_service
    
    provider = os.environ.get("COACH_SEARCH_PROVIDER", "").lower().strip()
    
    if provider == "none":
        logger.info("Search service disabled via COACH_SEARCH_PROVIDER=none")
        _search_service = None
        _search_service_initialized = True
        return None
    
    if provider == "mock":
        logger.info("Using MockSearchService (COACH_SEARCH_PROVIDER=mock)")
        _search_service = MockSearchService()
        _search_service_initialized = True
        return _search_service
    
    if provider == "duckduckgo":
        if _is_duckduckgo_available():
            logger.info("Using DuckDuckGoSearchService (COACH_SEARCH_PROVIDER=duckduckgo)")
            _search_service = DuckDuckGoSearchService()
        else:
            logger.warning(
                "DuckDuckGo requested but library not available. "
                "Install with: pip install duckduckgo-search. "
                "Falling back to MockSearchService."
            )
            _search_service = MockSearchService()
        _search_service_initialized = True
        return _search_service
    
    # Auto-detect: prefer DuckDuckGo if available
    if _is_duckduckgo_available():
        logger.info("Using DuckDuckGoSearchService (auto-detected)")
        _search_service = DuckDuckGoSearchService()
    else:
        logger.info(
            "Using MockSearchService (duckduckgo_search not installed). "
            "Install with: pip install duckduckgo-search"
        )
        _search_service = MockSearchService()
    
    _search_service_initialized = True
    return _search_service


def reset_search_service() -> None:
    """
    Reset the search service singleton.
    
    Useful for testing to force re-initialization.
    """
    global _search_service, _search_service_initialized
    _search_service = None
    _search_service_initialized = False


__all__ = [
    "SearchResult",
    "WebSearchService",
    "DuckDuckGoSearchService",
    "MockSearchService",
    "get_search_service",
    "reset_search_service",
]
