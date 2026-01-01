#!/usr/bin/env python3
"""
Test script for Thumbnail Intelligence service.

Usage:
    python scripts/test_thumbnail_intel.py [--category fortnite]
    
Options:
    --category: Run analysis for a single category (default: all)
    --immediate: Run immediately without waiting for schedule
"""

import asyncio
import argparse
import logging
import os
import sys

# Add parent directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
sys.path.insert(0, project_root)

from dotenv import load_dotenv
# Load .env from backend directory
load_dotenv(os.path.join(project_root, "backend", ".env"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("test_thumbnail_intel")


async def test_single_category(category_key: str):
    """Test analysis for a single category."""
    from backend.services.thumbnail_intel import get_thumbnail_intel_service
    
    logger.info(f"Testing thumbnail analysis for: {category_key}")
    
    service = get_thumbnail_intel_service()
    insight = await service.analyze_single_category(category_key)
    
    if insight:
        logger.info(f"✅ Analysis complete for {insight.category_name}")
        logger.info(f"   Thumbnails analyzed: {len(insight.thumbnails)}")
        logger.info(f"   Common layout: {insight.common_layout}")
        logger.info(f"   Ideal colors: {insight.ideal_color_palette}")
        logger.info(f"   Style summary: {insight.category_style_summary[:100]}...")
        
        for i, thumb in enumerate(insight.thumbnails, 1):
            logger.info(f"\n   Thumbnail {i}: {thumb.title[:50]}...")
            logger.info(f"      Views: {thumb.view_count:,}")
            logger.info(f"      Layout: {thumb.layout_type}")
            logger.info(f"      Colors: {thumb.dominant_colors}")
            logger.info(f"      Why it works: {thumb.why_it_works[:80]}...")
    else:
        logger.error(f"❌ Analysis failed for {category_key}")


async def test_all_categories():
    """Test analysis for all categories."""
    from backend.services.thumbnail_intel import get_thumbnail_intel_service
    
    logger.info("Testing thumbnail analysis for ALL categories...")
    
    service = get_thumbnail_intel_service()
    results = await service.run_daily_analysis()
    
    logger.info(f"\n{'='*60}")
    logger.info(f"ANALYSIS COMPLETE: {len(results)} categories")
    logger.info(f"{'='*60}")
    
    for category_key, insight in results.items():
        logger.info(f"\n📊 {insight.category_name}")
        logger.info(f"   Thumbnails: {len(insight.thumbnails)}")
        logger.info(f"   Common layout: {insight.common_layout}")
        logger.info(f"   Pro tips: {len(insight.pro_tips)}")


async def test_collector_only():
    """Test just the thumbnail collection (no vision analysis)."""
    from backend.services.thumbnail_intel.collector import get_thumbnail_collector
    
    logger.info("Testing thumbnail collection only...")
    
    collector = get_thumbnail_collector()
    results = await collector.collect_all_categories()
    
    for category_key, thumbnails in results.items():
        logger.info(f"\n{category_key}: {len(thumbnails)} thumbnails")
        for thumb in thumbnails:
            logger.info(f"   - {thumb.title[:50]}... ({thumb.view_count:,} views)")


async def main():
    parser = argparse.ArgumentParser(description="Test Thumbnail Intelligence")
    parser.add_argument("--category", type=str, help="Single category to test")
    parser.add_argument("--collect-only", action="store_true", help="Only test collection")
    args = parser.parse_args()
    
    if args.collect_only:
        await test_collector_only()
    elif args.category:
        await test_single_category(args.category)
    else:
        await test_all_categories()


if __name__ == "__main__":
    asyncio.run(main())
