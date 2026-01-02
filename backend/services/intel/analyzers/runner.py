"""
Creator Intel V2 - Analyzer Runner

Orchestrates running all analyzers for a category or batch of categories.
Provides unified interface for the worker to execute analysis.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import redis.asyncio as redis

from backend.services.intel.core.base_analyzer import AnalysisResult
from backend.services.intel.core.metrics import get_intel_metrics
from backend.services.intel.analyzers.content_format import get_content_format_analyzer
from backend.services.intel.analyzers.description import get_description_analyzer
from backend.services.intel.analyzers.semantic import get_semantic_analyzer
from backend.services.intel.analyzers.regional import get_regional_analyzer
from backend.services.intel.analyzers.live_stream import get_live_stream_analyzer

logger = logging.getLogger(__name__)


@dataclass
class AnalyzerRunResult:
    """Result of running all analyzers for a category."""
    category_key: str
    analyzers_run: List[str]
    analyzers_succeeded: List[str]
    analyzers_failed: List[str]
    results: Dict[str, Any]
    errors: Dict[str, str]
    duration_seconds: float
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "category_key": self.category_key,
            "analyzers_run": self.analyzers_run,
            "analyzers_succeeded": self.analyzers_succeeded,
            "analyzers_failed": self.analyzers_failed,
            "success_rate": len(self.analyzers_succeeded) / len(self.analyzers_run) if self.analyzers_run else 0,
            "duration_seconds": round(self.duration_seconds, 2),
            "timestamp": self.timestamp.isoformat(),
            "errors": self.errors,
        }


class AnalyzerRunner:
    """
    Runs all analyzers for categories.
    
    Provides:
    - Parallel execution of independent analyzers
    - Error isolation (one failure doesn't stop others)
    - Per-analyzer timeout protection
    - Metrics collection
    - Result aggregation
    
    Usage:
        runner = AnalyzerRunner()
        
        # Run all analyzers for one category
        result = await runner.run_category("fortnite")
        
        # Run all analyzers for multiple categories
        results = await runner.run_batch(["fortnite", "valorant", "minecraft"])
    """
    
    # Analyzer registry
    ANALYZERS = [
        ("content_format", get_content_format_analyzer),
        ("description", get_description_analyzer),
        ("semantic", get_semantic_analyzer),
        ("regional", get_regional_analyzer),
        ("live_stream", get_live_stream_analyzer),
    ]
    
    # Default timeout per analyzer (seconds)
    DEFAULT_ANALYZER_TIMEOUT = 60
    
    def __init__(
        self,
        max_concurrent: int = 3,
        analyzer_timeout: int = DEFAULT_ANALYZER_TIMEOUT,
    ) -> None:
        """
        Initialize the runner.
        
        Args:
            max_concurrent: Maximum concurrent analyzer executions
            analyzer_timeout: Timeout in seconds for each analyzer (default: 60s)
        """
        self.max_concurrent = max_concurrent
        self.analyzer_timeout = analyzer_timeout
        self.metrics = get_intel_metrics()
    
    async def run_category(
        self,
        category_key: str,
        analyzers: Optional[List[str]] = None,
        force_refresh: bool = False,
    ) -> AnalyzerRunResult:
        """
        Run analyzers for a single category.
        
        Args:
            category_key: The category to analyze
            analyzers: Optional list of specific analyzers to run (default: all)
            force_refresh: If True, bypass cache
            
        Returns:
            AnalyzerRunResult with all results and errors
        """
        import time
        start = time.time()
        
        # Determine which analyzers to run
        if analyzers:
            to_run = [(name, factory) for name, factory in self.ANALYZERS if name in analyzers]
        else:
            to_run = self.ANALYZERS
        
        analyzers_run = [name for name, _ in to_run]
        results: Dict[str, Any] = {}
        errors: Dict[str, str] = {}
        succeeded: List[str] = []
        failed: List[str] = []
        
        # Run analyzers with concurrency limit
        semaphore = asyncio.Semaphore(self.max_concurrent)
        
        async def run_one(name: str, factory) -> None:
            async with semaphore:
                try:
                    with self.metrics.track_operation(f"analyze_{name}", category=category_key):
                        analyzer = factory()
                        
                        # FIX #1: Add per-analyzer timeout to prevent slow analyzers
                        # from blocking the entire pipeline
                        try:
                            result = await asyncio.wait_for(
                                analyzer.analyze_with_cache(category_key, force_refresh),
                                timeout=self.analyzer_timeout
                            )
                        except asyncio.TimeoutError:
                            errors[name] = f"Analyzer timed out after {self.analyzer_timeout}s"
                            failed.append(name)
                            logger.error(
                                f"{name} analysis timed out for {category_key} "
                                f"after {self.analyzer_timeout}s"
                            )
                            return
                        
                        if result:
                            results[name] = result.to_dict()
                            succeeded.append(name)
                            logger.debug(f"{name} analysis succeeded for {category_key}")
                        else:
                            errors[name] = "No result returned (insufficient data)"
                            failed.append(name)
                            
                except Exception as e:
                    errors[name] = str(e)
                    failed.append(name)
                    logger.error(f"{name} analysis failed for {category_key}: {e}")
        
        # Run all analyzers
        tasks = [run_one(name, factory) for name, factory in to_run]
        await asyncio.gather(*tasks)
        
        duration = time.time() - start
        
        return AnalyzerRunResult(
            category_key=category_key,
            analyzers_run=analyzers_run,
            analyzers_succeeded=succeeded,
            analyzers_failed=failed,
            results=results,
            errors=errors,
            duration_seconds=duration,
        )
    
    async def run_batch(
        self,
        category_keys: List[str],
        analyzers: Optional[List[str]] = None,
        force_refresh: bool = False,
    ) -> Dict[str, AnalyzerRunResult]:
        """
        Run analyzers for multiple categories.
        
        Args:
            category_keys: List of categories to analyze
            analyzers: Optional list of specific analyzers to run
            force_refresh: If True, bypass cache
            
        Returns:
            Dictionary mapping category_key -> AnalyzerRunResult
        """
        results: Dict[str, AnalyzerRunResult] = {}
        
        # Run categories sequentially to avoid overwhelming resources
        for category_key in category_keys:
            try:
                result = await self.run_category(category_key, analyzers, force_refresh)
                results[category_key] = result
                
                logger.info(
                    f"Completed {category_key}: "
                    f"{len(result.analyzers_succeeded)}/{len(result.analyzers_run)} succeeded"
                )
                
            except Exception as e:
                logger.error(f"Failed to run analyzers for {category_key}: {e}")
                results[category_key] = AnalyzerRunResult(
                    category_key=category_key,
                    analyzers_run=[],
                    analyzers_succeeded=[],
                    analyzers_failed=[],
                    results={},
                    errors={"runner": str(e)},
                    duration_seconds=0,
                )
        
        return results
    
    async def run_single_analyzer(
        self,
        category_key: str,
        analyzer_name: str,
        force_refresh: bool = False,
    ) -> Optional[AnalysisResult]:
        """
        Run a single analyzer for a category.
        
        Args:
            category_key: The category to analyze
            analyzer_name: Name of the analyzer to run
            force_refresh: If True, bypass cache
            
        Returns:
            AnalysisResult or None if failed
        """
        # Find the analyzer
        factory = None
        for name, f in self.ANALYZERS:
            if name == analyzer_name:
                factory = f
                break
        
        if not factory:
            logger.error(f"Unknown analyzer: {analyzer_name}")
            return None
        
        try:
            analyzer = factory()
            return await analyzer.analyze_with_cache(category_key, force_refresh)
        except Exception as e:
            logger.error(f"{analyzer_name} failed for {category_key}: {e}")
            return None


async def run_all_analyzers(
    category_keys: List[str],
    redis_client: Optional[redis.Redis] = None,
    force_refresh: bool = False,
) -> Dict[str, AnalyzerRunResult]:
    """
    Convenience function to run all analyzers for multiple categories.
    
    Args:
        category_keys: List of categories to analyze
        redis_client: Optional Redis client (not used, kept for compatibility)
        force_refresh: If True, bypass cache
        
    Returns:
        Dictionary mapping category_key -> AnalyzerRunResult
    """
    runner = AnalyzerRunner()
    return await runner.run_batch(category_keys, force_refresh=force_refresh)


# Singleton runner
_analyzer_runner: Optional[AnalyzerRunner] = None


def get_analyzer_runner() -> AnalyzerRunner:
    """Get the singleton runner instance."""
    global _analyzer_runner
    if _analyzer_runner is None:
        _analyzer_runner = AnalyzerRunner()
    return _analyzer_runner
