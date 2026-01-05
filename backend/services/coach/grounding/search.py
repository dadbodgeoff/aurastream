"""
Web Search Service for Prompt Coach Grounding.

Provides web search capabilities for the grounding feature to fetch
current information about games, events, and other time-sensitive content.
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
    snippet: str
    url: str
    source: str


class WebSearchService(ABC):
    """Abstract base class for web search services."""
    
    @abstractmethod
    async def search(self, query: str, max_results: int = 3) -> List[SearchResult]:
        """Perform a web search."""
        pass


class DuckDuckGoSearchService(WebSearchService):
    """Web search service using DuckDuckGo."""
    
    def __init__(self, min_interval: float = 1.0):
        self._last_search_time: float = 0.0
        self._min_interval = min_interval
        self._lock = asyncio.Lock()
    
    async def search(self, query: str, max_results: int = 3) -> List[SearchResult]:
        """Perform a web search using DuckDuckGo."""
        try:
            import duckduckgo_search
        except ImportError:
            logger.warning("duckduckgo_search library not installed")
            return []
        
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_search_time
            if elapsed < self._min_interval:
                await asyncio.sleep(self._min_interval - elapsed)
            self._last_search_time = time.monotonic()
        
        try:
            results = await asyncio.to_thread(self._sync_search, query, max_results)
            logger.info(f"DuckDuckGo search for '{query}' returned {len(results)} results")
            return results
        except Exception as e:
            logger.error(f"DuckDuckGo search failed: {e}")
            return []
    
    def _sync_search(self, query: str, max_results: int) -> List[SearchResult]:
        from duckduckgo_search import DDGS
        results = []
        with DDGS() as ddgs:
            for item in ddgs.text(query, max_results=max_results):
                url = item.get("href", "")
                results.append(SearchResult(
                    title=item.get("title", ""),
                    snippet=item.get("body", ""),
                    url=url,
                    source=self._extract_domain(url),
                ))
        return results
    
    @staticmethod
    def _extract_domain(url: str) -> str:
        try:
            from urllib.parse import urlparse
            domain = urlparse(url).netloc
            return domain[4:] if domain.startswith("www.") else domain
        except Exception:
            return ""


class MockSearchService(WebSearchService):
    """Mock search service for testing."""
    
    def __init__(self, results: Optional[List[SearchResult]] = None):
        self._custom_results = results
    
    async def search(self, query: str, max_results: int = 3) -> List[SearchResult]:
        if self._custom_results is not None:
            return self._custom_results[:max_results]
        return [
            SearchResult(
                title=f"Latest {query} News",
                snippet=f"Get the most recent information about {query}.",
                url=f"https://example.com/{query.replace(' ', '-').lower()}",
                source="example.com",
            ),
        ][:max_results]


# Singleton
_search_service: Optional[WebSearchService] = None


def get_search_service() -> Optional[WebSearchService]:
    """Get or create the search service singleton."""
    global _search_service
    if _search_service is not None:
        return _search_service
    
    provider = os.environ.get("COACH_SEARCH_PROVIDER", "").lower()
    
    if provider == "none":
        return None
    if provider == "mock":
        _search_service = MockSearchService()
    else:
        try:
            import duckduckgo_search
            _search_service = DuckDuckGoSearchService()
        except ImportError:
            _search_service = MockSearchService()
    
    return _search_service


__all__ = [
    "SearchResult",
    "WebSearchService", 
    "DuckDuckGoSearchService",
    "MockSearchService",
    "get_search_service",
]
