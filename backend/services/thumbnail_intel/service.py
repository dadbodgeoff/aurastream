"""
Thumbnail Intelligence Service

Main orchestrator that coordinates thumbnail collection,
vision analysis, and storage.
"""

import logging
import asyncio
import time
from typing import List, Dict, Optional

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
        
        Args:
            category_key: Category identifier
            thumbnails: List of ThumbnailData to analyze
            
        Returns:
            CategoryThumbnailInsight with analysis results
        """
        category_config = GAMING_CATEGORIES.get(category_key, {})
        category_name = category_config.get("name", category_key)
        
        # Download thumbnail images
        logger.info(f"Downloading {len(thumbnails)} thumbnails for {category_key}...")
        thumbnail_images = []
        
        for thumb in thumbnails:
            img_bytes = await self.collector.download_thumbnail(thumb.thumbnail_url_hq)
            thumbnail_images.append(img_bytes)
            await asyncio.sleep(0.2)  # Rate limit downloads
        
        # Analyze with Gemini Vision
        logger.info(f"Analyzing thumbnails for {category_key} with Gemini Vision...")
        insight = await self.analyzer.analyze_category_thumbnails(
            category_key=category_key,
            category_name=category_name,
            thumbnails=thumbnails,
            thumbnail_images=thumbnail_images,
        )
        
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
