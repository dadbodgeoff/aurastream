"""
Thumbnail Intelligence API Routes

Provides endpoints for accessing thumbnail analysis data.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Depends

from backend.api.schemas.thumbnail_intel import (
    CategoryInsightResponse,
    ThumbnailIntelOverviewResponse,
    ThumbnailAnalysisResponse,
    CategoryListItem,
)
from backend.api.service_dependencies import ThumbnailIntelServiceDep
from backend.services.thumbnail_intel.constants import GAMING_CATEGORIES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/thumbnail-intel", tags=["Thumbnail Intelligence"])


@router.get("/categories", response_model=List[CategoryListItem])
async def list_categories(
    service: ThumbnailIntelServiceDep = None,
):
    """
    List all available gaming categories for thumbnail analysis.
    
    Returns category keys, names, and theme colors.
    """
    insights = await service.get_latest_insights()
    
    # Build lookup for latest analysis dates
    latest_dates = {i.category_key: i.analysis_date for i in insights}
    
    categories = []
    for key, config in GAMING_CATEGORIES.items():
        insight = next((i for i in insights if i.category_key == key), None)
        categories.append(CategoryListItem(
            category_key=key,
            category_name=config["name"],
            color_theme=config["color_theme"],
            thumbnail_count=len(insight.thumbnails) if insight else 0,
            latest_analysis=latest_dates.get(key),
        ))
    
    return categories


@router.get("/overview", response_model=ThumbnailIntelOverviewResponse)
async def get_overview(
    service: ThumbnailIntelServiceDep = None,
):
    """
    Get overview of all category thumbnail insights.
    
    Returns the latest analysis for all categories.
    """
    insights = await service.get_latest_insights()
    
    if not insights:
        return ThumbnailIntelOverviewResponse(
            analysis_date="",
            categories=[],
            total_thumbnails_analyzed=0,
        )
    
    # Convert to response format
    categories = []
    total_thumbnails = 0
    
    for insight in insights:
        thumbnails = [
            ThumbnailAnalysisResponse(
                video_id=t.video_id,
                title=t.title,
                thumbnail_url=t.thumbnail_url,
                view_count=t.view_count,
                layout_type=t.layout_type,
                text_placement=t.text_placement,
                focal_point=t.focal_point,
                dominant_colors=t.dominant_colors,
                color_mood=t.color_mood,
                background_style=t.background_style,
                has_face=t.has_face,
                has_text=t.has_text,
                text_content=t.text_content,
                has_border=t.has_border,
                has_glow_effects=t.has_glow_effects,
                has_arrows_circles=t.has_arrows_circles,
                face_expression=t.face_expression,
                face_position=t.face_position,
                face_size=t.face_size,
                face_looking_direction=t.face_looking_direction,
                layout_recipe=t.layout_recipe,
                color_recipe=t.color_recipe,
                why_it_works=t.why_it_works,
                difficulty=t.difficulty,
                # NEW: Enhanced metadata for Intel redesign
                aspect_ratio=getattr(t, 'aspect_ratio', None),
                hashtags=getattr(t, 'hashtags', None) or [],
                format_type=getattr(t, 'format_type', None),
                channel_name=getattr(t, 'channel_name', None),
                published_at=getattr(t, 'published_at', None),
            )
            for t in insight.thumbnails
        ]
        
        total_thumbnails += len(thumbnails)
        
        categories.append(CategoryInsightResponse(
            category_key=insight.category_key,
            category_name=insight.category_name,
            analysis_date=insight.analysis_date,
            thumbnails=thumbnails,
            common_layout=insight.common_layout,
            common_colors=insight.common_colors,
            common_elements=insight.common_elements,
            ideal_layout=insight.ideal_layout,
            ideal_color_palette=insight.ideal_color_palette,
            must_have_elements=insight.must_have_elements,
            avoid_elements=insight.avoid_elements,
            category_style_summary=insight.category_style_summary,
            pro_tips=insight.pro_tips,
        ))
    
    return ThumbnailIntelOverviewResponse(
        analysis_date=insights[0].analysis_date if insights else "",
        categories=categories,
        total_thumbnails_analyzed=total_thumbnails,
    )


@router.post("/analyze")
async def trigger_analysis(
    category_key: Optional[str] = Query(None, description="Specific category to analyze (optional)"),
    service: ThumbnailIntelServiceDep = None,
):
    """
    Manually trigger thumbnail analysis.
    
    Normally runs automatically at 6am EST daily.
    Use this for testing or to force an immediate analysis.
    """
    
    try:
        if category_key:
            if category_key not in GAMING_CATEGORIES:
                raise HTTPException(
                    status_code=404,
                    detail=f"Unknown category: {category_key}. "
                           f"Valid categories: {list(GAMING_CATEGORIES.keys())}"
                )
            # Analyze single category
            insight = await service.analyze_single_category(category_key)
            return {
                "success": True,
                "message": f"Analysis complete for {category_key}",
                "category": category_key,
                "thumbnails_analyzed": len(insight.thumbnails) if insight else 0,
            }
        else:
            # Analyze all categories
            results = await service.run_daily_analysis()
            return {
                "success": True,
                "message": f"Analysis complete for {len(results)} categories",
                "categories_analyzed": len(results),
                "details": [
                    {
                        "category": key,
                        "thumbnails": len(insight.thumbnails),
                    }
                    for key, insight in results.items()
                ],
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/category/{category_key}", response_model=CategoryInsightResponse)
async def get_category_insight(
    category_key: str,
    service: ThumbnailIntelServiceDep = None,
):
    """
    Get thumbnail insight for a specific gaming category.
    
    Args:
        category_key: Category identifier (e.g., "fortnite", "warzone")
    """
    if category_key not in GAMING_CATEGORIES:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown category: {category_key}. "
                   f"Valid categories: {list(GAMING_CATEGORIES.keys())}"
        )
    
    insight = await service.get_category_insight(category_key)
    
    if not insight:
        raise HTTPException(
            status_code=404,
            detail=f"No analysis found for {category_key}. "
                   "Analysis runs daily at 6 AM EST."
        )
    
    thumbnails = [
        ThumbnailAnalysisResponse(
            video_id=t.video_id,
            title=t.title,
            thumbnail_url=t.thumbnail_url,
            view_count=t.view_count,
            layout_type=t.layout_type,
            text_placement=t.text_placement,
            focal_point=t.focal_point,
            dominant_colors=t.dominant_colors,
            color_mood=t.color_mood,
            background_style=t.background_style,
            has_face=t.has_face,
            has_text=t.has_text,
            text_content=t.text_content,
            has_border=t.has_border,
            has_glow_effects=t.has_glow_effects,
            has_arrows_circles=t.has_arrows_circles,
            face_expression=t.face_expression,
            face_position=t.face_position,
            face_size=t.face_size,
            face_looking_direction=t.face_looking_direction,
            layout_recipe=t.layout_recipe,
            color_recipe=t.color_recipe,
            why_it_works=t.why_it_works,
            difficulty=t.difficulty,
            # NEW: Enhanced metadata for Intel redesign
            aspect_ratio=getattr(t, 'aspect_ratio', None),
            hashtags=getattr(t, 'hashtags', None) or [],
            format_type=getattr(t, 'format_type', None),
            channel_name=getattr(t, 'channel_name', None),
            published_at=getattr(t, 'published_at', None),
        )
        for t in insight.thumbnails
    ]
    
    return CategoryInsightResponse(
        category_key=insight.category_key,
        category_name=insight.category_name,
        analysis_date=insight.analysis_date,
        thumbnails=thumbnails,
        common_layout=insight.common_layout,
        common_colors=insight.common_colors,
        common_elements=insight.common_elements,
        ideal_layout=insight.ideal_layout,
        ideal_color_palette=insight.ideal_color_palette,
        must_have_elements=insight.must_have_elements,
        avoid_elements=insight.avoid_elements,
        category_style_summary=insight.category_style_summary,
        pro_tips=insight.pro_tips,
    )
