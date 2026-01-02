"""
Creator Intel V2 - API Routes

FastAPI routes for accessing Creator Intel data.
"""

import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Path

import redis.asyncio as redis

from backend.services.intel.api.schemas import (
    AnalyzeRequest,
    ContentFormatResponse,
    DescriptionResponse,
    SemanticResponse,
    RegionalResponse,
    LiveStreamResponse,
    CombinedIntelResponse,
    IntelConfidence,
    HealthResponse,
    ComponentHealthSchema,
    OrchestratorStatusResponse,
    OrchestratorMetricsSchema,
    TaskStatusSchema,
    QuotaStatusSchema,
    CATEGORY_KEY_PATTERN,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/intel", tags=["intel"])


# ============================================================================
# Dependencies
# ============================================================================

async def get_redis_client() -> redis.Redis:
    """Get Redis client dependency."""
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
    return redis.from_url(redis_url, decode_responses=True)


def validate_category_key(category_key: str) -> str:
    """Validate category key format."""
    if not CATEGORY_KEY_PATTERN.match(category_key):
        raise HTTPException(
            status_code=400,
            detail="Invalid category_key format. Must be lowercase alphanumeric with underscores."
        )
    return category_key


# ============================================================================
# Content Format Endpoints
# ============================================================================

@router.get("/{category_key}/format", response_model=ContentFormatResponse)
async def get_format_intel(
    category_key: str,
    redis_client: redis.Redis = Depends(get_redis_client),
) -> ContentFormatResponse:
    """
    Get content format analysis for a category.
    
    Returns optimal duration, shorts vs long-form comparison, and format insights.
    """
    cache_key = f"intel:format:precomputed:{category_key}"
    cached = await redis_client.get(cache_key)
    
    if cached:
        try:
            data = json.loads(cached)
            # Handle nested data structure
            if "data" in data:
                return ContentFormatResponse(**data["data"])
            return ContentFormatResponse(**data)
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Failed to parse cached format data: {e}")
    
    # Generate on-demand if not cached
    from backend.services.intel.analyzers.content_format import get_content_format_analyzer
    
    analyzer = get_content_format_analyzer()
    result = await analyzer.analyze_with_cache(category_key)
    
    if not result:
        raise HTTPException(404, f"No format data available for {category_key}")
    
    return ContentFormatResponse(**result.data)


# ============================================================================
# Description Endpoints
# ============================================================================

@router.get("/{category_key}/description", response_model=DescriptionResponse)
async def get_description_intel(
    category_key: str,
    redis_client: redis.Redis = Depends(get_redis_client),
) -> DescriptionResponse:
    """
    Get description analysis for a category.
    
    Returns hashtag analysis, timestamp patterns, and sponsor insights.
    """
    cache_key = f"intel:description:precomputed:{category_key}"
    cached = await redis_client.get(cache_key)
    
    if cached:
        try:
            data = json.loads(cached)
            if "data" in data:
                return DescriptionResponse(**data["data"])
            return DescriptionResponse(**data)
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Failed to parse cached description data: {e}")
    
    from backend.services.intel.analyzers.description import get_description_analyzer
    
    analyzer = get_description_analyzer()
    result = await analyzer.analyze_with_cache(category_key)
    
    if not result:
        raise HTTPException(404, f"No description data available for {category_key}")
    
    return DescriptionResponse(**result.data)


# ============================================================================
# Semantic Endpoints
# ============================================================================

@router.get("/{category_key}/semantic", response_model=SemanticResponse)
async def get_semantic_intel(
    category_key: str,
    redis_client: redis.Redis = Depends(get_redis_client),
) -> SemanticResponse:
    """
    Get semantic analysis for a category.
    
    Returns topic clusters, tag analysis, and optimal tag count.
    """
    cache_key = f"intel:semantic:precomputed:{category_key}"
    cached = await redis_client.get(cache_key)
    
    if cached:
        try:
            data = json.loads(cached)
            if "data" in data:
                return SemanticResponse(**data["data"])
            return SemanticResponse(**data)
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Failed to parse cached semantic data: {e}")
    
    from backend.services.intel.analyzers.semantic import get_semantic_analyzer
    
    analyzer = get_semantic_analyzer()
    result = await analyzer.analyze_with_cache(category_key)
    
    if not result:
        raise HTTPException(404, f"No semantic data available for {category_key}")
    
    return SemanticResponse(**result.data)


# ============================================================================
# Regional Endpoints
# ============================================================================

@router.get("/{category_key}/regional", response_model=RegionalResponse)
async def get_regional_intel(
    category_key: str,
    redis_client: redis.Redis = Depends(get_redis_client),
) -> RegionalResponse:
    """
    Get regional analysis for a category.
    
    Returns language breakdown, competition scores, and opportunity analysis.
    """
    cache_key = f"intel:regional:precomputed:{category_key}"
    cached = await redis_client.get(cache_key)
    
    if cached:
        try:
            data = json.loads(cached)
            if "data" in data:
                return RegionalResponse(**data["data"])
            return RegionalResponse(**data)
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Failed to parse cached regional data: {e}")
    
    from backend.services.intel.analyzers.regional import get_regional_analyzer
    
    analyzer = get_regional_analyzer()
    result = await analyzer.analyze_with_cache(category_key)
    
    if not result:
        raise HTTPException(404, f"No regional data available for {category_key}")
    
    return RegionalResponse(**result.data)


# ============================================================================
# Live Stream Endpoints
# ============================================================================

@router.get("/{category_key}/livestream", response_model=LiveStreamResponse)
async def get_livestream_intel(
    category_key: str,
    redis_client: redis.Redis = Depends(get_redis_client),
) -> LiveStreamResponse:
    """
    Get live stream analysis for a category.
    
    Returns premiere analysis, scheduling insights, and duration comparison.
    """
    cache_key = f"intel:livestream:precomputed:{category_key}"
    cached = await redis_client.get(cache_key)
    
    if cached:
        try:
            data = json.loads(cached)
            if "data" in data:
                return LiveStreamResponse(**data["data"])
            return LiveStreamResponse(**data)
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Failed to parse cached livestream data: {e}")
    
    from backend.services.intel.analyzers.live_stream import get_live_stream_analyzer
    
    analyzer = get_live_stream_analyzer()
    result = await analyzer.analyze_with_cache(category_key)
    
    if not result:
        raise HTTPException(404, f"No livestream data available for {category_key}")
    
    return LiveStreamResponse(**result.data)


# ============================================================================
# Combined Intel Endpoint
# ============================================================================

@router.get("/{category_key}/combined", response_model=CombinedIntelResponse)
async def get_combined_intel(
    category_key: str,
    redis_client: redis.Redis = Depends(get_redis_client),
) -> CombinedIntelResponse:
    """
    Get all intel for a category in one request.
    
    Returns all available analysis types combined.
    """
    # Fetch all cached intel
    keys = [
        f"intel:format:precomputed:{category_key}",
        f"intel:description:precomputed:{category_key}",
        f"intel:semantic:precomputed:{category_key}",
        f"intel:regional:precomputed:{category_key}",
        f"intel:livestream:precomputed:{category_key}",
    ]
    
    results = await redis_client.mget(keys)
    
    # Parse results
    content_format = None
    description = None
    semantic = None
    regional = None
    live_stream = None
    analyzers_available = []
    
    for i, (key, data) in enumerate(zip(keys, results)):
        if not data:
            continue
        
        try:
            parsed = json.loads(data)
            inner_data = parsed.get("data", parsed)
            
            if "format" in key:
                content_format = ContentFormatResponse(**inner_data)
                analyzers_available.append("content_format")
            elif "description" in key:
                description = DescriptionResponse(**inner_data)
                analyzers_available.append("description")
            elif "semantic" in key:
                semantic = SemanticResponse(**inner_data)
                analyzers_available.append("semantic")
            elif "regional" in key:
                regional = RegionalResponse(**inner_data)
                analyzers_available.append("regional")
            elif "livestream" in key:
                live_stream = LiveStreamResponse(**inner_data)
                analyzers_available.append("live_stream")
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Failed to parse {key}: {e}")
    
    if not analyzers_available:
        raise HTTPException(404, f"No intel data available for {category_key}")
    
    # Calculate overall confidence
    confidence_scores = []
    if content_format:
        confidence_scores.append(content_format.confidence)
    if description:
        confidence_scores.append(description.confidence)
    if semantic:
        confidence_scores.append(semantic.confidence)
    if regional:
        confidence_scores.append(regional.confidence)
    if live_stream:
        confidence_scores.append(live_stream.confidence)
    
    avg_confidence = sum(confidence_scores) // len(confidence_scores) if confidence_scores else 0
    
    # Determine freshness label
    if avg_confidence >= 80:
        label = "Fresh"
    elif avg_confidence >= 60:
        label = "Recent"
    elif avg_confidence >= 40:
        label = "Stale"
    elif avg_confidence >= 20:
        label = "Old"
    else:
        label = "Expired"
    
    # Get category name
    category_name = category_key.replace("_", " ").title()
    if content_format:
        category_name = content_format.category_name
    
    return CombinedIntelResponse(
        category_key=category_key,
        category_name=category_name,
        content_format=content_format,
        description=description,
        semantic=semantic,
        regional=regional,
        live_stream=live_stream,
        confidence=IntelConfidence(
            score=avg_confidence,
            label=label,
            fetched_at=datetime.now(timezone.utc).isoformat(),
            hours_old=0,
        ),
        analyzers_available=analyzers_available,
        fetched_at=datetime.now(timezone.utc).isoformat(),
    )


# ============================================================================
# Analysis Trigger Endpoint
# ============================================================================

# Rate limiting for analysis trigger
ANALYSIS_RATE_LIMIT_KEY = "intel:analysis:rate_limit:{category}"
ANALYSIS_RATE_LIMIT_SECONDS = 300  # 5 minutes between triggers per category
ANALYSIS_GLOBAL_RATE_LIMIT_KEY = "intel:analysis:global_rate_limit"
ANALYSIS_GLOBAL_RATE_LIMIT_SECONDS = 60  # 1 minute between any triggers


@router.post("/{category_key}/analyze")
async def trigger_analysis(
    category_key: str,
    request: AnalyzeRequest,
    redis_client: redis.Redis = Depends(get_redis_client),
) -> Dict[str, Any]:
    """
    Trigger analysis for a category.
    
    Runs specified analyzers (or all) and returns results.
    
    Rate limited to:
    - 1 request per category per 5 minutes
    - 1 request globally per 1 minute
    """
    # Validate category key
    validate_category_key(category_key)
    
    # Check global rate limit
    global_key = ANALYSIS_GLOBAL_RATE_LIMIT_KEY
    if await redis_client.exists(global_key):
        ttl = await redis_client.ttl(global_key)
        raise HTTPException(
            status_code=429,
            detail=f"Rate limited. Please wait {ttl} seconds before triggering another analysis."
        )
    
    # Check per-category rate limit
    category_rate_key = ANALYSIS_RATE_LIMIT_KEY.format(category=category_key)
    if await redis_client.exists(category_rate_key):
        ttl = await redis_client.ttl(category_rate_key)
        raise HTTPException(
            status_code=429,
            detail=f"Rate limited for {category_key}. Please wait {ttl} seconds."
        )
    
    # Set rate limit keys
    await redis_client.setex(global_key, ANALYSIS_GLOBAL_RATE_LIMIT_SECONDS, "1")
    await redis_client.setex(category_rate_key, ANALYSIS_RATE_LIMIT_SECONDS, "1")
    
    from backend.services.intel.analyzers.runner import AnalyzerRunner
    
    runner = AnalyzerRunner()
    result = await runner.run_category(
        category_key,
        request.analyzers,
        request.force_refresh,
    )
    
    return result.to_dict()


# ============================================================================
# Health Endpoints
# ============================================================================

@router.get("/health", response_model=HealthResponse)
async def get_health(
    redis_client: redis.Redis = Depends(get_redis_client),
) -> HealthResponse:
    """
    Get system health status.
    
    Returns health status for all components.
    """
    components = []
    
    # Check Redis
    try:
        await redis_client.ping()
        components.append(ComponentHealthSchema(
            name="redis",
            status="healthy",
            message="Connected",
            last_check=datetime.now(timezone.utc).isoformat(),
        ))
    except Exception as e:
        components.append(ComponentHealthSchema(
            name="redis",
            status="unhealthy",
            message=str(e),
            last_check=datetime.now(timezone.utc).isoformat(),
        ))
    
    # Check creator intel worker (via last run timestamp)
    last_run = await redis_client.get("intel:worker:last_run")
    if last_run:
        try:
            last_dt = datetime.fromisoformat(last_run)
            hours_ago = (datetime.now(timezone.utc) - last_dt).total_seconds() / 3600
            if hours_ago < 5:  # Within expected 4-hour cycle + buffer
                components.append(ComponentHealthSchema(
                    name="intel_worker",
                    status="healthy",
                    message=f"Last run {hours_ago:.1f}h ago",
                    last_check=datetime.now(timezone.utc).isoformat(),
                ))
            else:
                components.append(ComponentHealthSchema(
                    name="intel_worker",
                    status="degraded",
                    message=f"Last run {hours_ago:.1f}h ago (stale)",
                    last_check=datetime.now(timezone.utc).isoformat(),
                ))
        except Exception:
            components.append(ComponentHealthSchema(
                name="intel_worker",
                status="unknown",
                message="Invalid timestamp",
                last_check=datetime.now(timezone.utc).isoformat(),
            ))
    else:
        components.append(ComponentHealthSchema(
            name="intel_worker",
            status="unknown",
            message="No run history",
            last_check=datetime.now(timezone.utc).isoformat(),
        ))
    
    # Check Intel V2 data freshness (sample one category)
    sample_key = "intel:format:precomputed:fortnite"
    sample_data = await redis_client.get(sample_key)
    if sample_data:
        try:
            parsed = json.loads(sample_data)
            analyzed_at = parsed.get("analyzed_at")
            if analyzed_at:
                analyzed_dt = datetime.fromisoformat(analyzed_at.replace("Z", "+00:00"))
                hours_old = (datetime.now(timezone.utc) - analyzed_dt).total_seconds() / 3600
                if hours_old < 6:
                    components.append(ComponentHealthSchema(
                        name="intel_v2_data",
                        status="healthy",
                        message=f"Data {hours_old:.1f}h old",
                        last_check=datetime.now(timezone.utc).isoformat(),
                    ))
                else:
                    components.append(ComponentHealthSchema(
                        name="intel_v2_data",
                        status="degraded",
                        message=f"Data {hours_old:.1f}h old (stale)",
                        last_check=datetime.now(timezone.utc).isoformat(),
                    ))
            else:
                components.append(ComponentHealthSchema(
                    name="intel_v2_data",
                    status="healthy",
                    message="Data available",
                    last_check=datetime.now(timezone.utc).isoformat(),
                ))
        except Exception:
            components.append(ComponentHealthSchema(
                name="intel_v2_data",
                status="unknown",
                message="Parse error",
                last_check=datetime.now(timezone.utc).isoformat(),
            ))
    else:
        components.append(ComponentHealthSchema(
            name="intel_v2_data",
            status="unhealthy",
            message="No data cached",
            last_check=datetime.now(timezone.utc).isoformat(),
        ))
    
    # Determine overall status
    statuses = [c.status for c in components]
    if "unhealthy" in statuses:
        overall = "unhealthy"
    elif "degraded" in statuses or "unknown" in statuses:
        overall = "degraded"
    else:
        overall = "healthy"
    
    return HealthResponse(
        status=overall,
        timestamp=datetime.now(timezone.utc).isoformat(),
        components=components,
    )


# ============================================================================
# Orchestrator Status Endpoint
# ============================================================================

@router.get("/orchestrator/status", response_model=OrchestratorStatusResponse)
async def get_orchestrator_status(
    redis_client: redis.Redis = Depends(get_redis_client),
) -> OrchestratorStatusResponse:
    """
    Get worker status.
    
    Returns task status, metrics, and quota information.
    """
    # Get last run info from creator_intel_worker
    last_run = await redis_client.get("intel:worker:last_run")
    
    # Build metrics from available data
    tasks_executed = 0
    tasks_succeeded = 0
    tasks_failed = 0
    
    # Check each game's intel data to count successes
    games = ["fortnite", "warzone", "valorant", "apex_legends", "gta", "minecraft", "roblox", "arc_raiders"]
    for game in games:
        format_key = f"intel:format:precomputed:{game}"
        if await redis_client.exists(format_key):
            tasks_succeeded += 1
        tasks_executed += 1
    
    success_rate = (tasks_succeeded / tasks_executed * 100) if tasks_executed > 0 else 0
    
    # Calculate uptime (time since last run)
    uptime_seconds = 0
    started_at = None
    if last_run:
        try:
            last_dt = datetime.fromisoformat(last_run)
            started_at = last_dt.isoformat()
            uptime_seconds = (datetime.now(timezone.utc) - last_dt).total_seconds()
        except Exception:
            pass
    
    # Build task status
    tasks = {
        "intel_analysis": TaskStatusSchema(
            name="intel_analysis",
            interval_seconds=4 * 3600,  # 4 hours
            priority="HIGH",
            last_run=last_run,
            last_success=last_run if tasks_succeeded > 0 else None,
            last_error=None,
            consecutive_failures=0 if tasks_succeeded > 0 else 1,
            is_running=False,
            next_run=None,
        ),
    }
    
    # Get quota (YouTube API)
    quota_data = await redis_client.get("youtube:quota:bucket")
    quota = QuotaStatusSchema(
        units_used=0,
        units_remaining=10000,
        units_limit=10000,
        percent_used=0,
    )
    
    if quota_data:
        try:
            q = json.loads(quota_data)
            quota = QuotaStatusSchema(
                units_used=q.get("units_used", 0),
                units_remaining=q.get("units_limit", 10000) - q.get("units_used", 0),
                units_limit=q.get("units_limit", 10000),
                percent_used=(q.get("units_used", 0) / q.get("units_limit", 10000)) * 100,
                window_start=q.get("window_start"),
            )
        except Exception:
            pass
    
    return OrchestratorStatusResponse(
        running=last_run is not None,
        metrics=OrchestratorMetricsSchema(
            tasks_executed=tasks_executed,
            tasks_succeeded=tasks_succeeded,
            tasks_failed=tasks_failed,
            success_rate=success_rate,
            avg_duration=0,
            last_health_check=datetime.now(timezone.utc).isoformat(),
            started_at=started_at,
            uptime_seconds=uptime_seconds,
        ),
        tasks=tasks,
        quota=quota,
    )


# ============================================================================
# Categories Endpoint
# ============================================================================

@router.get("/categories")
async def get_categories() -> List[Dict[str, Any]]:
    """
    Get list of tracked categories.
    
    Returns all categories with intel data available.
    """
    from backend.services.intel.collectors.quota_manager import QuotaManager
    
    categories = []
    for key, priority in QuotaManager.DEFAULT_PRIORITIES.items():
        categories.append({
            "key": key,
            "name": key.replace("_", " ").title(),
            "priority": priority.priority,
            "refresh_hours": priority.min_refresh_hours,
        })
    
    return categories
