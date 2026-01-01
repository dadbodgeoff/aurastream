"""
Creator Intel API Routes

Endpoints for the unified intelligence dashboard.
These are ADDITIVE - do not modify any existing routes.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from backend.api.middleware.auth import get_current_user
from backend.services.jwt_service import TokenPayload
from backend.api.schemas.intel import (
    UserIntelPreferences,
    UpdatePreferencesRequest,
    UpdatePreferencesResponse,
    AvailableCategory,
    SubscribeCategoryRequest,
    SubscribeCategoryResponse,
    UnsubscribeCategoryResponse,
    TrackActivityRequest,
    TodaysMission,
)
from backend.services.intel import (
    get_available_categories,
)
from backend.services.intel.preferences_repository import get_intel_preferences_repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/intel", tags=["Creator Intel"])

# Tier limits for category subscriptions
TIER_CATEGORY_LIMITS = {
    "free": 3,
    "pro": 10,
    "studio": 100,  # Effectively unlimited
    "unlimited": 100,
}


# ============================================================================
# Preferences Endpoints
# ============================================================================

@router.get("/preferences", response_model=UserIntelPreferences)
async def get_preferences(
    current_user: TokenPayload = Depends(get_current_user),
) -> UserIntelPreferences:
    """Get user's Creator Intel preferences."""
    try:
        repo = get_intel_preferences_repository()
        prefs = await repo.get_or_create_preferences(current_user.sub)
        
        return UserIntelPreferences(
            subscribed_categories=prefs.get("subscribed_categories", []),
            dashboard_layout=prefs.get("dashboard_layout", []),
            timezone=prefs.get("timezone", "America/New_York"),
        )
    except Exception as e:
        logger.error(f"Failed to get preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get preferences"
        )


@router.put("/preferences", response_model=UpdatePreferencesResponse)
async def update_preferences(
    data: UpdatePreferencesRequest,
    current_user: TokenPayload = Depends(get_current_user),
) -> UpdatePreferencesResponse:
    """Update user's Creator Intel preferences (layout, timezone)."""
    try:
        repo = get_intel_preferences_repository()
        
        updates = {}
        if data.dashboard_layout is not None:
            updates["dashboard_layout"] = [p.model_dump() for p in data.dashboard_layout]
        if data.timezone is not None:
            updates["timezone"] = data.timezone
        
        prefs = await repo.update_preferences(current_user.sub, updates)
        
        return UpdatePreferencesResponse(
            subscribed_categories=prefs.get("subscribed_categories", []),
            dashboard_layout=prefs.get("dashboard_layout", []),
            timezone=prefs.get("timezone", "America/New_York"),
        )
    except Exception as e:
        logger.error(f"Failed to update preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update preferences"
        )


# ============================================================================
# Category Endpoints
# ============================================================================

@router.get("/categories/available", response_model=List[AvailableCategory])
async def list_available_categories(
    current_user: Optional[TokenPayload] = Depends(get_current_user),
) -> List[AvailableCategory]:
    """List all available categories for subscription."""
    return get_available_categories()


@router.post("/categories/subscribe", response_model=SubscribeCategoryResponse)
async def subscribe_to_category(
    data: SubscribeCategoryRequest,
    current_user: TokenPayload = Depends(get_current_user),
) -> SubscribeCategoryResponse:
    """Subscribe to a gaming category."""
    try:
        repo = get_intel_preferences_repository()
        
        # Check tier limits
        prefs = await repo.get_or_create_preferences(current_user.sub)
        current_count = len(prefs.get("subscribed_categories", []))
        tier = getattr(current_user, "tier", "free")
        limit = TIER_CATEGORY_LIMITS.get(tier, 3)
        
        if current_count >= limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Category limit reached ({limit}). Upgrade to add more categories."
            )
        
        result = await repo.add_category_subscription(
            current_user.sub,
            {
                "key": data.key,
                "name": data.name,
                "twitch_id": data.twitch_id,
                "youtube_query": data.youtube_query,
                "platform": data.platform,
                "notifications": data.notifications,
            }
        )
        
        return SubscribeCategoryResponse(
            subscription=result["subscription"],
            total_subscriptions=result["total_subscriptions"],
        )
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to subscribe to category: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to subscribe to category"
        )


@router.delete("/categories/{category_key}", response_model=UnsubscribeCategoryResponse)
async def unsubscribe_from_category(
    category_key: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> UnsubscribeCategoryResponse:
    """Unsubscribe from a gaming category."""
    try:
        repo = get_intel_preferences_repository()
        result = await repo.remove_category_subscription(current_user.sub, category_key)
        
        return UnsubscribeCategoryResponse(
            remaining_subscriptions=result["remaining_subscriptions"]
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to unsubscribe from category: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unsubscribe from category"
        )


# ============================================================================
# Activity Endpoints
# ============================================================================

@router.post("/activity/track", status_code=status.HTTP_204_NO_CONTENT)
async def track_activity(
    data: TrackActivityRequest,
    current_user: TokenPayload = Depends(get_current_user),
) -> None:
    """Track user activity for personalization."""
    try:
        repo = get_intel_preferences_repository()
        await repo.track_activity(
            current_user.sub,
            data.event_type,
            {
                "category_key": data.category_key,
                "panel_type": data.panel_type,
                "metadata": data.metadata,
            }
        )
    except Exception as e:
        # Log but don't fail - activity tracking is non-critical
        logger.error(f"Failed to track activity: {e}")


@router.post("/mission/acted", status_code=status.HTTP_204_NO_CONTENT)
async def mark_mission_acted(
    current_user: TokenPayload = Depends(get_current_user),
) -> None:
    """Mark that user acted on Today's Mission."""
    try:
        repo = get_intel_preferences_repository()
        await repo.track_activity(current_user.sub, "mission_acted", {})
    except Exception as e:
        logger.error(f"Failed to mark mission acted: {e}")


# ============================================================================
# Mission Endpoint
# ============================================================================

@router.get("/mission", response_model=Optional[TodaysMission])
async def get_todays_mission(
    current_user: TokenPayload = Depends(get_current_user),
) -> Optional[TodaysMission]:
    """Get Today's Mission recommendation."""
    try:
        from backend.services.intel.mission_generator import get_mission_generator
        from backend.services.intel.activity_tracker import get_activity_tracker
        
        repo = get_intel_preferences_repository()
        prefs = await repo.get_or_create_preferences(current_user.sub)
        
        subscribed_categories = prefs.get("subscribed_categories", [])
        if not subscribed_categories:
            return None
        
        timezone = prefs.get("timezone", "America/New_York")
        
        # Generate mission
        generator = get_mission_generator()
        mission = await generator.generate_mission(
            user_id=current_user.sub,
            subscribed_categories=subscribed_categories,
            timezone=timezone,
        )
        
        if not mission:
            return None
        
        # Track that mission was shown
        tracker = get_activity_tracker()
        await tracker.track_mission_shown(
            user_id=current_user.sub,
            category_key=mission.get("category", ""),
        )
        
        return TodaysMission(
            recommendation=mission["recommendation"],
            confidence=mission["confidence"],
            category=mission["category"],
            category_name=mission["category_name"],
            suggested_title=mission["suggested_title"],
            reasoning=mission["reasoning"],
            factors=mission["factors"],
            expires_at=mission["expires_at"],
        )
    except Exception as e:
        logger.error(f"Failed to get mission: {e}")
        return None


@router.get("/activity/summary")
async def get_activity_summary(
    days: int = 30,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Get user's activity summary for personalization insights."""
    try:
        from backend.services.intel.activity_tracker import get_activity_tracker
        
        tracker = get_activity_tracker()
        summary = await tracker.get_activity_summary(current_user.sub, days)
        return summary
    except Exception as e:
        logger.error(f"Failed to get activity summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get activity summary"
        )


# ============================================================================
# Title Intelligence Endpoints
# ============================================================================

# ============================================================================
# Daily Insight Endpoint
# ============================================================================

@router.get("/daily-insight")
async def get_daily_insight(
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Get ONE specific, actionable insight based on real data.
    
    Not generic fluff - actual data-driven insights like:
    - "'zero build' videos are outperforming by 3.2x"
    - "Only 847 streamers live in Valorant right now"
    - "12 videos going viral around 'winterfest'"
    """
    try:
        from backend.services.intel.daily_insight_generator import get_daily_insight_generator
        
        repo = get_intel_preferences_repository()
        prefs = await repo.get_or_create_preferences(current_user.sub)
        
        subscribed_categories = prefs.get("subscribed_categories", [])
        if not subscribed_categories:
            return None
        
        generator = get_daily_insight_generator()
        insight = await generator.generate_insight(subscribed_categories)
        
        if not insight:
            return None
        
        return {
            "insight_type": insight.insight_type,
            "headline": insight.headline,
            "detail": insight.detail,
            "action": insight.action,
            "category": insight.category,
            "category_name": insight.category_name,
            "metric_value": insight.metric_value,
            "metric_label": insight.metric_label,
            "confidence": insight.confidence,
            "data_source": insight.data_source,
            "generated_at": insight.generated_at,
        }
    except Exception as e:
        logger.error(f"Failed to get daily insight: {e}")
        return None


# ============================================================================
# Video Ideas Endpoint
# ============================================================================

@router.get("/video-ideas/{game_key}")
async def get_video_ideas(
    game_key: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Get synthesized video ideas for a specific game.
    
    Unlike title_suggestions (which are existing viral titles),
    this generates ORIGINAL video concepts based on trending data:
    - Trending topics from viral detector
    - Trending keywords/phrases from title intel
    - Tag clusters that work together
    - Competition levels
    
    Returns actionable video concepts, not just titles to copy.
    """
    try:
        from backend.services.intel.video_idea_generator import get_video_idea_generator
        
        generator = get_video_idea_generator()
        response = await generator.generate_ideas(game_key, max_ideas=5)
        
        if not response:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No data available for game: {game_key}. Data refreshes daily."
            )
        
        return {
            "game_key": response.game_key,
            "game_name": response.game_name,
            "analyzed_at": response.analyzed_at,
            "data_freshness_hours": response.data_freshness_hours,
            "overall_opportunity": response.overall_opportunity,
            "ideas": [
                {
                    "concept": idea.concept,
                    "hook": idea.hook,
                    "why_now": idea.why_now,
                    "format_suggestion": idea.format_suggestion,
                    "trending_elements": idea.trending_elements,
                    "suggested_tags": idea.suggested_tags,
                    "difficulty": idea.difficulty,
                    "opportunity_score": idea.opportunity_score,
                    "confidence": idea.confidence,
                }
                for idea in response.ideas
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get video ideas for {game_key}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate video ideas"
        )


# ============================================================================
# Title Intelligence Endpoints
# ============================================================================

@router.get("/titles/{game_key}")
async def get_title_intel(
    game_key: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Get title intelligence for a specific game.
    
    Returns:
    - Title suggestions with velocity scoring (what's viral NOW)
    - Hook analysis (the click-driving first words)
    - Power word detection
    - Reusable templates
    - Tag clusters (related tags that work together)
    - Trending hooks and power words
    """
    try:
        from backend.services.title_intel import get_title_intel_analyzer
        
        analyzer = get_title_intel_analyzer()
        intel = await analyzer.analyze_game(game_key)
        
        if not intel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No data available for game: {game_key}. Data refreshes daily."
            )
        
        return {
            "game_key": intel.game_key,
            "game_name": intel.game_name,
            "analyzed_at": intel.analyzed_at,
            "video_count": intel.video_count,
            
            # New: Title suggestions with full analysis
            "title_suggestions": [
                {
                    "title": s.title,
                    "hook": s.hook,
                    "views": s.views,
                    "velocity": s.velocity,
                    "engagement_rate": s.engagement_rate,
                    "power_words": s.power_words,
                    "structure_type": s.structure_type,
                    "why_it_works": s.why_it_works,
                    "template": s.template,
                }
                for s in intel.title_suggestions
            ],
            
            # New: Tag clusters
            "tag_clusters": [
                {
                    "primary_tag": c.primary_tag,
                    "related_tags": c.related_tags,
                    "avg_views": c.avg_views,
                    "video_count": c.video_count,
                    "example_title": c.example_title,
                }
                for c in intel.tag_clusters
            ],
            
            # New: Trending elements
            "trending_hooks": intel.trending_hooks,
            "trending_power_words": intel.trending_power_words,
            
            # Patterns
            "patterns": [
                {
                    "name": p.pattern_name,
                    "description": p.description,
                    "frequency": p.frequency,
                    "avg_views": p.avg_views,
                    "avg_engagement": round(p.avg_engagement, 2),
                    "examples": p.examples,
                }
                for p in intel.top_patterns
            ],
            
            # Keywords with velocity + enterprise metrics
            "keywords": [
                {
                    "keyword": k.keyword,
                    "frequency": k.frequency,
                    "avg_views": k.avg_views,
                    "avg_engagement": round(k.avg_engagement, 2),
                    "velocity_score": k.velocity_score,
                    "power_category": k.power_category,
                    "is_trending": k.is_trending,
                    "top_video_title": k.top_video_title,
                    # Enterprise metrics
                    "tf_idf_score": k.tf_idf_score,
                    "confidence": k.confidence,
                    "effect_size": k.effect_size,
                    "sample_size": k.sample_size,
                }
                for k in intel.top_keywords
            ],
            
            # Multi-word phrases (n-grams)
            "phrases": [
                {
                    "phrase": p.phrase,
                    "frequency": p.frequency,
                    "avg_views": p.avg_views,
                    "velocity_score": p.velocity_score,
                    "top_video_title": p.top_video_title,
                    "is_trending": p.is_trending,
                    "confidence": p.confidence,
                }
                for p in intel.top_phrases
            ],
            
            # Legacy formulas (for backwards compat)
            "formulas": intel.title_formulas,
            
            "stats": {
                "avg_title_length": intel.avg_title_length,
                "avg_word_count": intel.avg_word_count,
                "avg_views": intel.avg_views,
            },
            
            # Data quality metrics
            "data_confidence": intel.data_confidence,
            "data_freshness_hours": intel.data_freshness_hours,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get title intel for {game_key}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get title intelligence"
        )


@router.get("/tags/{game_key}")
async def get_tag_intel(
    game_key: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Get tag recommendations for a specific game.
    
    Returns:
    - Top tags used by high-performing videos
    - Tag frequency and performance metrics
    """
    try:
        from backend.services.title_intel import get_title_intel_analyzer
        
        analyzer = get_title_intel_analyzer()
        intel = await analyzer.analyze_game(game_key)
        
        if not intel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No data available for game: {game_key}. Data refreshes daily."
            )
        
        return {
            "game_key": intel.game_key,
            "game_name": intel.game_name,
            "analyzed_at": intel.analyzed_at,
            "video_count": intel.video_count,
            
            # Individual tags with metrics
            "tags": [
                {
                    "tag": t.tag,
                    "frequency": t.frequency,
                    "avg_views": t.avg_views,
                    "videos_using": t.videos_using,
                    "top_video_title": t.top_video_title,
                }
                for t in intel.top_tags
            ],
            
            # Tag clusters (related tags that work together)
            "tag_clusters": [
                {
                    "primary_tag": c.primary_tag,
                    "related_tags": c.related_tags,
                    "avg_views": c.avg_views,
                    "video_count": c.video_count,
                    "example_title": c.example_title,
                }
                for c in intel.tag_clusters
            ],
            
            # Data quality metrics
            "data_confidence": intel.data_confidence,
            "data_freshness_hours": intel.data_freshness_hours,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get tag intel for {game_key}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get tag intelligence"
        )


@router.get("/titles")
async def get_all_titles_intel(
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Get title intelligence for all tracked games.
    
    Returns summary data for each game - use /titles/{game_key} for full details.
    """
    try:
        from backend.services.title_intel import get_title_intel_analyzer
        
        analyzer = get_title_intel_analyzer()
        all_intel = await analyzer.get_all_games_intel()
        
        return {
            "games": [
                {
                    "game_key": intel.game_key,
                    "game_name": intel.game_name,
                    "analyzed_at": intel.analyzed_at,
                    "video_count": intel.video_count,
                    "top_pattern": intel.top_patterns[0].pattern_name if intel.top_patterns else None,
                    "top_keywords": [k.keyword for k in intel.top_keywords[:5]],
                    "top_phrases": [p.phrase for p in intel.top_phrases[:3]],
                    "avg_views": intel.avg_views,
                    "data_confidence": intel.data_confidence,
                }
                for intel in all_intel.values()
            ],
            "total_games": len(all_intel),
        }
    except Exception as e:
        logger.error(f"Failed to get all titles intel: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get title intelligence"
        )


__all__ = ["router"]
