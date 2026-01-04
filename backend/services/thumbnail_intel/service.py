"""
Thumbnail Intelligence Service

Main orchestrator that coordinates thumbnail collection,
vision analysis, and storage.
"""

import gc
import logging
import asyncio
import time
from contextlib import contextmanager
from typing import List, Dict, Optional, Generator

from backend.services.thumbnail_intel.collector import (
    ThumbnailCollector,
    ThumbnailData,
    get_thumbnail_collector,
)
from backend.services.thumbnail_intel.vision_analyzer import (
    ThumbnailVisionAnalyzer,
    CategoryThumbnailInsight,
    get_vision_analyzer,
)
from backend.services.thumbnail_intel.repository import (
    ThumbnailIntelRepository,
    get_thumbnail_repository,
)
from backend.services.thumbnail_intel.constants import GAMING_CATEGORIES

logger = logging.getLogger(__name__)

# Memory management constants
BATCH_SIZE = 10  # Process 10 thumbnails at a time to limit memory usage


@contextmanager
def managed_image_buffer(initial_data: Optional[List[Optional[bytes]]] = None) -> Generator[List[Optional[bytes]], None, None]:
    """
    Context manager for image data to ensure cleanup.
    
    Ensures all image bytes are cleared from memory when exiting the context,
    even if an exception occurs.
    
    Args:
        initial_data: Optional initial list of image bytes
        
    Yields:
        List to store image bytes
    """
    buffer: List[Optional[bytes]] = initial_data if initial_data is not None else []
    try:
        yield buffer
    finally:
        # Clear all image data from memory
        for i in range(len(buffer)):
            buffer[i] = None
        buffer.clear()
        del buffer
        gc.collect()


class ThumbnailIntelService:
    """
    Main service for thumbnail intelligence.
    
    Orchestrates the full pipeline:
    1. Collect top thumbnails from YouTube
    2. Download thumbnail images
    3. Analyze with Gemini Vision
    4. Store results in database
    """
    
    def __init__(
        self,
        collector: Optional[ThumbnailCollector] = None,
        analyzer: Optional[ThumbnailVisionAnalyzer] = None,
        repository: Optional[ThumbnailIntelRepository] = None,
    ):
        self.collector = collector or get_thumbnail_collector()
        self.analyzer = analyzer or get_vision_analyzer()
        self.repository = repository or get_thumbnail_repository()
    
    async def run_daily_analysis(self) -> Dict[str, CategoryThumbnailInsight]:
        """
        Run the full daily thumbnail analysis pipeline.
        
        This is called by the daily worker at 6am EST.
        
        Returns:
            Dict mapping category_key to CategoryThumbnailInsight
        """
        start_time = time.time()
        logger.info("Starting daily thumbnail intelligence analysis...")
        
        results: Dict[str, CategoryThumbnailInsight] = {}
        
        try:
            # Step 1: Collect thumbnails for all categories
            logger.info("Collecting thumbnails from YouTube...")
            all_thumbnails = await self.collector.collect_all_categories()
            
            # Step 2: Analyze each category
            for category_key, thumbnails in all_thumbnails.items():
                if not thumbnails:
                    logger.warning(f"No thumbnails collected for {category_key}")
                    continue
                
                try:
                    insight = await self._analyze_category(
                        category_key,
                        thumbnails,
                    )
                    results[category_key] = insight
                    
                    # Save to database
                    await self.repository.save_category_insight(insight)
                    
                    logger.info(f"Completed analysis for {category_key}")
                    
                except Exception as e:
                    logger.error(f"Failed to analyze {category_key}: {e}")
                
                # Small delay between categories
                await asyncio.sleep(1)
            
            duration = int((time.time() - start_time) * 1000)
            logger.info(
                f"Thumbnail intelligence complete: {len(results)} categories "
                f"analyzed in {duration}ms"
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Daily thumbnail analysis failed: {e}")
            raise
    
    async def _analyze_category(
        self,
        category_key: str,
        thumbnails: List[ThumbnailData],
    ) -> CategoryThumbnailInsight:
        """
        Analyze thumbnails for a single category.
        
        Downloads and processes images in batches to prevent memory buildup.
        Uses context manager pattern to ensure cleanup even on errors.
        Forces garbage collection after each batch.
        
        Args:
            category_key: Category identifier
            thumbnails: List of ThumbnailData to analyze
            
        Returns:
            CategoryThumbnailInsight with analysis results
        """
        category_config = GAMING_CATEGORIES.get(category_key, {})
        category_name = category_config.get("name", category_key)
        
        # Process thumbnails in batches to limit memory usage
        logger.info(f"Processing {len(thumbnails)} thumbnails for {category_key} in batches of {BATCH_SIZE}...")
        
        with managed_image_buffer() as all_thumbnail_images:
            for batch_start in range(0, len(thumbnails), BATCH_SIZE):
                batch_end = min(batch_start + BATCH_SIZE, len(thumbnails))
                batch = thumbnails[batch_start:batch_end]
                batch_num = (batch_start // BATCH_SIZE) + 1
                total_batches = (len(thumbnails) + BATCH_SIZE - 1) // BATCH_SIZE
                
                logger.debug(f"Processing batch {batch_num}/{total_batches} for {category_key}")
                
                # Process batch with its own managed buffer
                with managed_image_buffer() as batch_images:
                    for i, thumb in enumerate(batch):
                        try:
                            # Download single thumbnail
                            img_bytes = await self.collector.download_thumbnail(thumb.thumbnail_url_hq)
                            batch_images.append(img_bytes)
                            
                            logger.debug(
                                f"Downloaded thumbnail {batch_start + i + 1}/{len(thumbnails)} "
                                f"for {category_key}"
                            )
                            
                            await asyncio.sleep(0.2)  # Rate limit downloads
                            
                        except Exception as e:
                            logger.warning(
                                f"Failed to download thumbnail {batch_start + i + 1} "
                                f"for {category_key}: {e}"
                            )
                            batch_images.append(None)
                    
                    # Copy batch results to main list before batch buffer is cleared
                    all_thumbnail_images.extend(batch_images[:])
                
                # Force garbage collection after each batch to free memory
                gc.collect()
                logger.debug(f"Completed batch {batch_num}/{total_batches}, memory cleaned up")
            
            # Analyze with Gemini Vision
            logger.info(f"Analyzing thumbnails for {category_key} with Gemini Vision...")
            insight = await self.analyzer.analyze_category_thumbnails(
                category_key=category_key,
                category_name=category_name,
                thumbnails=thumbnails,
                thumbnail_images=all_thumbnail_images,
            )
        
        # Final garbage collection after analysis complete
        gc.collect()
        
        return insight
    
    async def get_latest_insights(self) -> List[CategoryThumbnailInsight]:
        """
        Get the latest thumbnail insights for all categories.
        
        Returns:
            List of CategoryThumbnailInsight
        """
        return await self.repository.get_latest_insights()
    
    async def get_category_insight(
        self,
        category_key: str,
    ) -> Optional[CategoryThumbnailInsight]:
        """
        Get the latest insight for a specific category.
        
        Args:
            category_key: Category identifier
            
        Returns:
            CategoryThumbnailInsight or None
        """
        return await self.repository.get_category_insight(category_key)
    
    async def analyze_single_category(
        self,
        category_key: str,
    ) -> Optional[CategoryThumbnailInsight]:
        """
        Run analysis for a single category (for testing/manual runs).
        
        Args:
            category_key: Category identifier
            
        Returns:
            CategoryThumbnailInsight or None
        """
        if category_key not in GAMING_CATEGORIES:
            logger.error(f"Unknown category: {category_key}")
            return None
        
        try:
            # Collect thumbnails
            category_config = GAMING_CATEGORIES[category_key]
            thumbnails = await self.collector.collect_category(
                category_key,
                category_config,
            )
            
            if not thumbnails:
                logger.warning(f"No thumbnails found for {category_key}")
                return None
            
            # Analyze
            insight = await self._analyze_category(category_key, thumbnails)
            
            # Save
            await self.repository.save_category_insight(insight)
            
            return insight
            
        except Exception as e:
            logger.error(f"Single category analysis failed: {e}")
            return None


# Singleton instance
_service: Optional[ThumbnailIntelService] = None


def get_thumbnail_intel_service() -> ThumbnailIntelService:
    """Get or create the thumbnail intel service singleton."""
    global _service
    if _service is None:
        _service = ThumbnailIntelService()
    return _service
