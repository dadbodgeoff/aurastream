"""
Thumbnail Intelligence Service with Provenance Capture.

Wraps the thumbnail intel service to capture full reasoning chains
for every thumbnail analysis.
"""

import gc
import logging
import asyncio
import time
from typing import List, Dict, Optional

from backend.services.thumbnail_intel.collector import (
    ThumbnailData,
    get_thumbnail_collector,
)
from backend.services.thumbnail_intel.vision_analyzer_provenance import (
    get_provenance_vision_analyzer,
)
from backend.services.thumbnail_intel.vision_analyzer import (
    CategoryThumbnailInsight,
)
from backend.services.thumbnail_intel.repository import (
    get_thumbnail_repository,
)
from backend.services.thumbnail_intel.constants import GAMING_CATEGORIES
from backend.services.thumbnail_intel.service import managed_image_buffer, BATCH_SIZE

logger = logging.getLogger(__name__)


class ProvenanceThumbnailIntelService:
    """
    Thumbnail intel service with full provenance capture.
    
    Captures AI reasoning chains for every thumbnail analysis,
    documenting why certain design patterns were recommended.
    """
    
    def __init__(self):
        self.collector = get_thumbnail_collector()
        self.analyzer = get_provenance_vision_analyzer()
        self.repository = get_thumbnail_repository()
    
    async def run_daily_analysis_with_provenance(
        self,
        execution_id: str,
    ) -> Dict[str, CategoryThumbnailInsight]:
        """
        Run the full daily thumbnail analysis pipeline with provenance capture.
        
        Args:
            execution_id: Unique identifier for this execution run
            
        Returns:
            Dict mapping category_key to CategoryThumbnailInsight
        """
        start_time = time.time()
        logger.info("Starting daily thumbnail intelligence analysis with provenance...")
        
        results: Dict[str, CategoryThumbnailInsight] = {}
        
        try:
            # Step 1: Collect thumbnails for all categories
            logger.info("Collecting thumbnails from YouTube...")
            all_thumbnails = await self.collector.collect_all_categories()
            
            # Step 2: Analyze each category with provenance
            for category_key, thumbnails in all_thumbnails.items():
                if not thumbnails:
                    logger.warning(f"No thumbnails collected for {category_key}")
                    continue
                
                try:
                    insight = await self._analyze_category_with_provenance(
                        category_key,
                        thumbnails,
                        execution_id=f"{execution_id}:{category_key}",
                    )
                    results[category_key] = insight
                    
                    # Save to database
                    await self.repository.save_category_insight(insight)
                    
                    logger.info(f"Completed analysis for {category_key} (with provenance)")
                    
                except Exception as e:
                    logger.error(f"Failed to analyze {category_key}: {e}")
                
                # Small delay between categories
                await asyncio.sleep(1)
            
            duration = int((time.time() - start_time) * 1000)
            logger.info(
                f"Thumbnail intelligence complete: {len(results)} categories "
                f"analyzed in {duration}ms (with provenance)"
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Daily thumbnail analysis failed: {e}")
            raise
    
    async def _analyze_category_with_provenance(
        self,
        category_key: str,
        thumbnails: List[ThumbnailData],
        execution_id: str,
    ) -> CategoryThumbnailInsight:
        """
        Analyze thumbnails for a single category with provenance capture.
        """
        category_config = GAMING_CATEGORIES.get(category_key, {})
        category_name = category_config.get("name", category_key)
        
        logger.info(f"Processing {len(thumbnails)} thumbnails for {category_key}...")
        
        with managed_image_buffer() as all_thumbnail_images:
            for batch_start in range(0, len(thumbnails), BATCH_SIZE):
                batch_end = min(batch_start + BATCH_SIZE, len(thumbnails))
                batch = thumbnails[batch_start:batch_end]
                
                with managed_image_buffer() as batch_images:
                    for i, thumb in enumerate(batch):
                        try:
                            img_bytes = await self.collector.download_thumbnail(thumb.thumbnail_url_hq)
                            batch_images.append(img_bytes)
                            await asyncio.sleep(0.2)
                        except Exception as e:
                            logger.warning(f"Failed to download thumbnail: {e}")
                            batch_images.append(None)
                    
                    all_thumbnail_images.extend(batch_images[:])
                
                gc.collect()
            
            # Analyze with provenance-enabled analyzer
            insight = await self.analyzer.analyze_category_with_provenance(
                category_key=category_key,
                category_name=category_name,
                thumbnails=thumbnails,
                thumbnail_images=all_thumbnail_images,
                execution_id=execution_id,
            )
        
        gc.collect()
        return insight


# Singleton
_provenance_service: Optional[ProvenanceThumbnailIntelService] = None

def get_provenance_thumbnail_intel_service() -> ProvenanceThumbnailIntelService:
    """Get the provenance-enabled thumbnail intel service."""
    global _provenance_service
    if _provenance_service is None:
        _provenance_service = ProvenanceThumbnailIntelService()
    return _provenance_service
