"""
Community Hub API Routes

Endpoints for browsing pre-loaded community assets in Canvas Studio.
These assets are available to all users (no auth required for reading).
"""

import logging
from typing import Optional, List

from fastapi import APIRouter, Query, HTTPException

from backend.api.schemas.community_hub import (
    MediaAssetType,
    CommunityHubAsset,
    CommunityHubCategory,
    ListCommunityHubAssetsResponse,
    ListCommunityHubCategoriesResponse,
    CommunityHubSummaryResponse,
)
from backend.database.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/community-hub", tags=["Community Hub"])


# ============================================================================
# List Assets
# ============================================================================

@router.get("/assets", response_model=ListCommunityHubAssetsResponse)
async def list_community_hub_assets(
    game_category: Optional[str] = Query(None, description="Filter by game category slug"),
    asset_type: Optional[MediaAssetType] = Query(None, description="Filter by asset type"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    search: Optional[str] = Query(None, description="Search in name/description"),
    featured_only: bool = Query(False, description="Only return featured assets"),
    limit: int = Query(50, ge=1, le=100, description="Max items to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    """
    List community hub assets with optional filters.
    
    No authentication required - these are public assets.
    """
    try:
        client = get_supabase_client()
        
        # Build query
        query = client.table("community_hub_assets").select("*", count="exact")
        
        # Apply filters
        if game_category:
            query = query.eq("game_category", game_category)
        
        if asset_type:
            query = query.eq("asset_type", asset_type)
        
        if featured_only:
            query = query.eq("is_featured", True)
        
        if tags:
            query = query.contains("tags", tags)
        
        if search:
            # Simple search on display_name
            query = query.ilike("display_name", f"%{search}%")
        
        # Order and paginate
        query = query.order("sort_order", desc=False).order("created_at", desc=True)
        query = query.range(offset, offset + limit - 1)
        
        result = query.execute()
        
        assets = [CommunityHubAsset(**row) for row in result.data]
        total = result.count or len(assets)
        
        return ListCommunityHubAssetsResponse(
            assets=assets,
            total=total,
            limit=limit,
            offset=offset,
            has_more=(offset + len(assets)) < total,
        )
        
    except Exception as e:
        logger.error(f"Error listing community hub assets: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch community hub assets")


# ============================================================================
# Get Single Asset
# ============================================================================

@router.get("/assets/{asset_id}", response_model=CommunityHubAsset)
async def get_community_hub_asset(asset_id: str):
    """Get a single community hub asset by ID."""
    try:
        client = get_supabase_client()
        
        result = client.table("community_hub_assets").select("*").eq("id", asset_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        return CommunityHubAsset(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching community hub asset {asset_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch asset")


# ============================================================================
# List Categories
# ============================================================================

@router.get("/categories", response_model=ListCommunityHubCategoriesResponse)
async def list_community_hub_categories(
    active_only: bool = Query(True, description="Only return active categories"),
):
    """
    List all game categories in the community hub.
    
    No authentication required.
    """
    try:
        client = get_supabase_client()
        
        query = client.table("community_hub_categories").select("*")
        
        if active_only:
            query = query.eq("is_active", True)
        
        query = query.order("sort_order", desc=False)
        
        result = query.execute()
        
        categories = [CommunityHubCategory(**row) for row in result.data]
        
        return ListCommunityHubCategoriesResponse(categories=categories)
        
    except Exception as e:
        logger.error(f"Error listing community hub categories: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch categories")


# ============================================================================
# Get Category
# ============================================================================

@router.get("/categories/{slug}", response_model=CommunityHubCategory)
async def get_community_hub_category(slug: str):
    """Get a single category by slug."""
    try:
        client = get_supabase_client()
        
        result = client.table("community_hub_categories").select("*").eq("slug", slug).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Category not found")
        
        return CommunityHubCategory(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching category {slug}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch category")


# ============================================================================
# Summary Stats
# ============================================================================

@router.get("/summary", response_model=CommunityHubSummaryResponse)
async def get_community_hub_summary():
    """Get summary statistics for the community hub."""
    try:
        client = get_supabase_client()
        
        # Get total assets
        assets_result = client.table("community_hub_assets").select("id", count="exact").execute()
        total_assets = assets_result.count or 0
        
        # Get total active categories
        categories_result = client.table("community_hub_categories").select("id", count="exact").eq("is_active", True).execute()
        total_categories = categories_result.count or 0
        
        # Get featured count
        featured_result = client.table("community_hub_assets").select("id", count="exact").eq("is_featured", True).execute()
        featured_count = featured_result.count or 0
        
        return CommunityHubSummaryResponse(
            total_assets=total_assets,
            total_categories=total_categories,
            featured_count=featured_count,
        )
        
    except Exception as e:
        logger.error(f"Error fetching community hub summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch summary")


# ============================================================================
# Increment Usage (called when user adds asset to canvas)
# ============================================================================

@router.post("/assets/{asset_id}/use")
async def increment_asset_usage(asset_id: str):
    """
    Increment usage count when a user adds this asset to their canvas.
    
    No auth required - just tracking popularity.
    """
    try:
        client = get_supabase_client()
        
        # Increment usage_count
        client.rpc(
            "increment_community_hub_usage",
            {"asset_id": asset_id}
        ).execute()
        
        return {"success": True}
        
    except Exception as e:
        # Don't fail the request if tracking fails
        logger.warning(f"Failed to increment usage for {asset_id}: {e}")
        return {"success": False}
