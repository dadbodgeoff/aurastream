"""
Intelligence Provenance API Routes.

Provides endpoints for querying, filtering, and analyzing provenance records.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field

from backend.services.provenance import (
    ProvenanceService,
    get_provenance_service,
    ProvenanceQuery,
    ProvenanceAggregation,
    InsightType,
    ConfidenceLevel,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/provenance", tags=["provenance"])


# =============================================================================
# Response Models
# =============================================================================

class DataSourceResponse(BaseModel):
    source_type: str
    source_key: str
    records_used: int
    freshness_seconds: float
    quality_score: float
    sample_ids: List[str] = []


class DecisionFactorResponse(BaseModel):
    factor_name: str
    raw_value: Any
    normalized_value: float
    weight: float
    contribution: float
    reasoning: str


class ReasoningStepResponse(BaseModel):
    step_number: int
    operation: str
    description: str
    input_count: int
    output_count: int
    algorithm: str
    parameters: Dict[str, Any] = {}
    duration_ms: float = 0


class ProvenanceRecordResponse(BaseModel):
    provenance_id: str
    worker_name: str
    execution_id: str
    insight_type: str
    category_key: str
    computed_at: str
    computation_duration_ms: float
    insight_id: str
    insight_summary: str
    insight_value: Optional[Any] = None
    confidence_score: float
    confidence_level: str
    quality_score: float
    data_sources: List[DataSourceResponse] = []
    total_records_analyzed: int
    data_freshness_avg_seconds: float
    decision_factors: List[DecisionFactorResponse] = []
    primary_factor: str
    reasoning_chain: List[ReasoningStepResponse] = []
    algorithm_version: str
    validation_passed: bool
    validation_errors: List[str] = []
    tags: List[str] = []


class ProvenanceListResponse(BaseModel):
    records: List[ProvenanceRecordResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AggregationResponse(BaseModel):
    total_records: int
    records_by_type: Dict[str, int]
    records_by_worker: Dict[str, int]
    records_by_category: Dict[str, int]
    records_by_confidence: Dict[str, int]
    avg_confidence_score: float
    avg_quality_score: float
    avg_computation_time_ms: float
    validation_pass_rate: float
    avg_data_freshness_seconds: float
    avg_records_analyzed: float
    top_decision_factors: List[Dict[str, Any]]
    hourly_counts: List[Dict[str, Any]]


class ReasoningChainResponse(BaseModel):
    provenance_id: str
    insight_type: str
    insight_summary: str
    computed_at: str
    confidence: Dict[str, Any]
    data_lineage: Dict[str, Any]
    decision_factors: Dict[str, Any]
    reasoning_chain: List[Dict[str, Any]]
    validation: Dict[str, Any]


class FactorAnalysisResponse(BaseModel):
    factor_name: str
    occurrences: int
    avg_contribution: float = 0
    avg_weight: float = 0
    by_insight_type: Dict[str, int] = {}
    by_category: Dict[str, int] = {}
    recent_samples: List[Dict[str, Any]] = []


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/records", response_model=ProvenanceListResponse)
async def list_provenance_records(
    # Filters
    worker_names: Optional[str] = Query(None, description="Comma-separated worker names"),
    insight_types: Optional[str] = Query(None, description="Comma-separated insight types"),
    category_keys: Optional[str] = Query(None, description="Comma-separated category keys"),
    confidence_levels: Optional[str] = Query(None, description="Comma-separated confidence levels"),
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    # Time range
    start_time: Optional[str] = Query(None, description="ISO datetime start"),
    end_time: Optional[str] = Query(None, description="ISO datetime end"),
    # Quality filters
    min_confidence: Optional[float] = Query(None, ge=0, le=1),
    min_quality: Optional[float] = Query(None, ge=0, le=1),
    validation_passed_only: bool = Query(False),
    # Sorting
    sort_by: str = Query("computed_at", description="Sort field"),
    sort_desc: bool = Query(True),
    # Pagination
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    # Search
    search: Optional[str] = Query(None, description="Search in insight summary"),
):
    """
    List provenance records with filtering, sorting, and pagination.
    """
    service = get_provenance_service()
    
    # Parse filters
    query = ProvenanceQuery(
        worker_names=worker_names.split(",") if worker_names else None,
        insight_types=[InsightType(t) for t in insight_types.split(",")] if insight_types else None,
        category_keys=category_keys.split(",") if category_keys else None,
        confidence_levels=[ConfidenceLevel(c) for c in confidence_levels.split(",")] if confidence_levels else None,
        tags=tags.split(",") if tags else None,
        start_time=datetime.fromisoformat(start_time) if start_time else None,
        end_time=datetime.fromisoformat(end_time) if end_time else None,
        min_confidence=min_confidence,
        min_quality=min_quality,
        validation_passed_only=validation_passed_only,
        sort_by=sort_by,
        sort_desc=sort_desc,
        page=page,
        page_size=page_size,
        search_query=search,
    )
    
    records, total = service.query(query)
    
    return ProvenanceListResponse(
        records=[_record_to_response(r) for r in records],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/records/{provenance_id}", response_model=ProvenanceRecordResponse)
async def get_provenance_record(provenance_id: str):
    """Get a single provenance record by ID."""
    service = get_provenance_service()
    record = service.get(provenance_id)
    
    if not record:
        raise HTTPException(status_code=404, detail="Provenance record not found")
    
    return _record_to_response(record)


@router.get("/records/{provenance_id}/reasoning", response_model=ReasoningChainResponse)
async def get_reasoning_chain(provenance_id: str):
    """Get detailed reasoning chain for a specific insight."""
    service = get_provenance_service()
    chain = service.get_reasoning_chain(provenance_id)
    
    if not chain:
        raise HTTPException(status_code=404, detail="Provenance record not found")
    
    return ReasoningChainResponse(**chain)


@router.get("/aggregate", response_model=AggregationResponse)
async def get_aggregation(
    worker_names: Optional[str] = Query(None),
    insight_types: Optional[str] = Query(None),
    category_keys: Optional[str] = Query(None),
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
    hours: int = Query(24, description="Hours to look back if no time range"),
):
    """Get aggregated provenance statistics."""
    service = get_provenance_service()
    
    query = ProvenanceQuery(
        worker_names=worker_names.split(",") if worker_names else None,
        insight_types=[InsightType(t) for t in insight_types.split(",")] if insight_types else None,
        category_keys=category_keys.split(",") if category_keys else None,
        start_time=datetime.fromisoformat(start_time) if start_time else datetime.now(timezone.utc) - timedelta(hours=hours),
        end_time=datetime.fromisoformat(end_time) if end_time else None,
    )
    
    agg = service.aggregate(query)
    return AggregationResponse(**agg.to_dict())


@router.get("/factors/{factor_name}", response_model=FactorAnalysisResponse)
async def analyze_factor(
    factor_name: str,
    days: int = Query(7, ge=1, le=30),
):
    """Analyze a specific decision factor across all insights."""
    service = get_provenance_service()
    analysis = service.get_factor_analysis(factor_name, days)
    return FactorAnalysisResponse(**analysis)


@router.get("/factors", response_model=List[Dict[str, Any]])
async def list_factors(
    hours: int = Query(24, ge=1, le=168),
):
    """List all decision factors used in recent insights."""
    service = get_provenance_service()
    
    query = ProvenanceQuery(
        start_time=datetime.now(timezone.utc) - timedelta(hours=hours),
        page_size=500,
    )
    records, _ = service.query(query)
    
    factor_counts: Dict[str, Dict[str, Any]] = {}
    for r in records:
        for f in r.decision_factors:
            if f.factor_name not in factor_counts:
                factor_counts[f.factor_name] = {"name": f.factor_name, "count": 0, "total_contribution": 0}
            factor_counts[f.factor_name]["count"] += 1
            factor_counts[f.factor_name]["total_contribution"] += f.contribution
    
    factors = list(factor_counts.values())
    for f in factors:
        f["avg_contribution"] = f["total_contribution"] / f["count"] if f["count"] > 0 else 0
    
    return sorted(factors, key=lambda x: x["count"], reverse=True)


@router.get("/insight-types")
async def list_insight_types():
    """List all available insight types."""
    return [{"value": t.value, "label": t.value.replace("_", " ").title()} for t in InsightType]


@router.get("/confidence-levels")
async def list_confidence_levels():
    """List all confidence levels."""
    return [{"value": c.value, "label": c.value.replace("_", " ").title()} for c in ConfidenceLevel]


# =============================================================================
# Generation-Specific Endpoints (Nano Banana)
# =============================================================================

class GenerationStatsResponse(BaseModel):
    """Statistics for image generation provenance."""
    total_generations: int
    successful_generations: int
    failed_generations: int
    success_rate: float
    total_cost_usd: float
    avg_cost_per_generation: float
    avg_latency_ms: float
    p50_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    by_asset_type: Dict[str, Dict[str, Any]]
    by_model: Dict[str, Dict[str, Any]]
    by_error_type: Dict[str, int]
    hourly_costs: List[Dict[str, Any]]


@router.get("/generations/stats", response_model=GenerationStatsResponse)
async def get_generation_stats(
    hours: int = Query(24, ge=1, le=168),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
):
    """
    Get comprehensive statistics for image generation provenance.
    
    Includes cost tracking, latency percentiles, and breakdowns by
    asset type, model, and error type.
    """
    service = get_provenance_service()
    
    # Query generation-related insight types
    generation_types = [
        InsightType.IMAGE_GENERATION,
        InsightType.IMAGE_REFINEMENT,
        InsightType.EMOTE_GENERATION,
        InsightType.THUMBNAIL_GENERATION,
        InsightType.OVERLAY_GENERATION,
        InsightType.BANNER_GENERATION,
        InsightType.PROFILE_GENERATION,
        InsightType.BATCH_GENERATION,
    ]
    
    query = ProvenanceQuery(
        insight_types=generation_types,
        start_time=datetime.now(timezone.utc) - timedelta(hours=hours),
        page_size=2000,
    )
    records, total = service.query(query)
    
    if not records:
        return GenerationStatsResponse(
            total_generations=0,
            successful_generations=0,
            failed_generations=0,
            success_rate=0,
            total_cost_usd=0,
            avg_cost_per_generation=0,
            avg_latency_ms=0,
            p50_latency_ms=0,
            p95_latency_ms=0,
            p99_latency_ms=0,
            by_asset_type={},
            by_model={},
            by_error_type={},
            hourly_costs=[],
        )
    
    # Extract metrics from tags and insight_value
    latencies = []
    costs = []
    by_asset_type: Dict[str, Dict[str, Any]] = {}
    by_model: Dict[str, Dict[str, Any]] = {}
    by_error_type: Dict[str, int] = {}
    hourly_costs: Dict[str, float] = {}
    successful = 0
    failed = 0
    
    for r in records:
        # Extract latency from tags
        for tag in r.tags:
            if tag.startswith("latency_") and tag.endswith("ms"):
                try:
                    latency = int(tag.replace("latency_", "").replace("ms", ""))
                    latencies.append(latency)
                except ValueError:
                    pass
            elif tag.startswith("cost_$"):
                try:
                    cost = float(tag.replace("cost_$", ""))
                    costs.append(cost)
                    # Track hourly costs
                    hour_key = r.computed_at.strftime("%Y-%m-%d %H:00")
                    hourly_costs[hour_key] = hourly_costs.get(hour_key, 0) + cost
                except ValueError:
                    pass
            elif tag.startswith("error_"):
                error_type = tag.replace("error_", "")
                by_error_type[error_type] = by_error_type.get(error_type, 0) + 1
        
        # Track success/failure
        if r.validation_passed and r.quality_score > 0:
            successful += 1
        else:
            failed += 1
        
        # Track by asset type
        asset_type = r.category_key or "unknown"
        if asset_type not in by_asset_type:
            by_asset_type[asset_type] = {"count": 0, "total_cost": 0, "total_latency": 0}
        by_asset_type[asset_type]["count"] += 1
        
        # Extract cost and latency from insight_value if available
        if isinstance(r.insight_value, dict):
            cost = r.insight_value.get("estimated_cost_usd", 0)
            latency = r.insight_value.get("total_latency_ms", 0)
            model = r.insight_value.get("model", "unknown")
            
            by_asset_type[asset_type]["total_cost"] += cost
            by_asset_type[asset_type]["total_latency"] += latency
            
            # Track by model
            if model not in by_model:
                by_model[model] = {"count": 0, "total_cost": 0, "total_latency": 0}
            by_model[model]["count"] += 1
            by_model[model]["total_cost"] += cost
            by_model[model]["total_latency"] += latency
    
    # Calculate averages for asset types
    for asset_type, stats in by_asset_type.items():
        if stats["count"] > 0:
            stats["avg_cost"] = round(stats["total_cost"] / stats["count"], 6)
            stats["avg_latency_ms"] = round(stats["total_latency"] / stats["count"], 0)
    
    # Calculate averages for models
    for model, stats in by_model.items():
        if stats["count"] > 0:
            stats["avg_cost"] = round(stats["total_cost"] / stats["count"], 6)
            stats["avg_latency_ms"] = round(stats["total_latency"] / stats["count"], 0)
    
    # Calculate percentiles
    latencies.sort()
    p50 = latencies[len(latencies) // 2] if latencies else 0
    p95 = latencies[int(len(latencies) * 0.95)] if latencies else 0
    p99 = latencies[int(len(latencies) * 0.99)] if latencies else 0
    
    total_cost = sum(costs)
    avg_cost = total_cost / len(costs) if costs else 0
    avg_latency = sum(latencies) / len(latencies) if latencies else 0
    
    return GenerationStatsResponse(
        total_generations=total,
        successful_generations=successful,
        failed_generations=failed,
        success_rate=round(successful / total, 3) if total > 0 else 0,
        total_cost_usd=round(total_cost, 4),
        avg_cost_per_generation=round(avg_cost, 6),
        avg_latency_ms=round(avg_latency, 0),
        p50_latency_ms=p50,
        p95_latency_ms=p95,
        p99_latency_ms=p99,
        by_asset_type=by_asset_type,
        by_model=by_model,
        by_error_type=by_error_type,
        hourly_costs=[{"hour": k, "cost_usd": round(v, 4)} for k, v in sorted(hourly_costs.items())],
    )


@router.get("/generations/cost-report")
async def get_cost_report(
    days: int = Query(7, ge=1, le=30),
):
    """
    Get a daily cost report for image generation.
    
    Useful for tracking spend and identifying cost optimization opportunities.
    """
    service = get_provenance_service()
    
    generation_types = [
        InsightType.IMAGE_GENERATION,
        InsightType.IMAGE_REFINEMENT,
        InsightType.EMOTE_GENERATION,
        InsightType.THUMBNAIL_GENERATION,
        InsightType.OVERLAY_GENERATION,
        InsightType.BANNER_GENERATION,
        InsightType.PROFILE_GENERATION,
        InsightType.BATCH_GENERATION,
    ]
    
    query = ProvenanceQuery(
        insight_types=generation_types,
        start_time=datetime.now(timezone.utc) - timedelta(days=days),
        page_size=5000,
    )
    records, _ = service.query(query)
    
    # Group by day
    daily_stats: Dict[str, Dict[str, Any]] = {}
    
    for r in records:
        day_key = r.computed_at.strftime("%Y-%m-%d")
        if day_key not in daily_stats:
            daily_stats[day_key] = {
                "date": day_key,
                "total_generations": 0,
                "total_cost_usd": 0,
                "by_asset_type": {},
            }
        
        daily_stats[day_key]["total_generations"] += 1
        
        # Extract cost from insight_value
        if isinstance(r.insight_value, dict):
            cost = r.insight_value.get("estimated_cost_usd", 0)
            daily_stats[day_key]["total_cost_usd"] += cost
            
            asset_type = r.category_key or "unknown"
            if asset_type not in daily_stats[day_key]["by_asset_type"]:
                daily_stats[day_key]["by_asset_type"][asset_type] = {"count": 0, "cost": 0}
            daily_stats[day_key]["by_asset_type"][asset_type]["count"] += 1
            daily_stats[day_key]["by_asset_type"][asset_type]["cost"] += cost
    
    # Round costs
    for day_data in daily_stats.values():
        day_data["total_cost_usd"] = round(day_data["total_cost_usd"], 4)
        for asset_data in day_data["by_asset_type"].values():
            asset_data["cost"] = round(asset_data["cost"], 4)
    
    return {
        "days": days,
        "total_cost_usd": round(sum(d["total_cost_usd"] for d in daily_stats.values()), 4),
        "total_generations": sum(d["total_generations"] for d in daily_stats.values()),
        "daily_breakdown": sorted(daily_stats.values(), key=lambda x: x["date"], reverse=True),
    }


@router.get("/summary")
async def get_summary(hours: int = Query(24, ge=1, le=168)):
    """Get a quick summary of provenance activity."""
    service = get_provenance_service()
    
    query = ProvenanceQuery(
        start_time=datetime.now(timezone.utc) - timedelta(hours=hours),
        page_size=1000,
    )
    records, total = service.query(query)
    
    if not records:
        return {
            "total_insights": 0,
            "avg_confidence": 0,
            "avg_quality": 0,
            "top_categories": [],
            "top_workers": [],
            "validation_rate": 0,
        }
    
    # Category counts
    cat_counts: Dict[str, int] = {}
    worker_counts: Dict[str, int] = {}
    for r in records:
        cat_counts[r.category_key] = cat_counts.get(r.category_key, 0) + 1
        worker_counts[r.worker_name] = worker_counts.get(r.worker_name, 0) + 1
    
    return {
        "total_insights": total,
        "avg_confidence": sum(r.confidence_score for r in records) / len(records),
        "avg_quality": sum(r.quality_score for r in records) / len(records),
        "top_categories": sorted([{"key": k, "count": v} for k, v in cat_counts.items()], key=lambda x: x["count"], reverse=True)[:5],
        "top_workers": sorted([{"name": k, "count": v} for k, v in worker_counts.items()], key=lambda x: x["count"], reverse=True)[:5],
        "validation_rate": sum(1 for r in records if r.validation_passed) / len(records),
    }


# =============================================================================
# Run-Level Endpoints (Group by execution_id)
# =============================================================================

class RunSummary(BaseModel):
    """Summary of a single worker execution run."""
    execution_id: str
    worker_name: str
    started_at: str
    completed_at: str
    duration_ms: float
    total_insights: int
    avg_confidence: float
    avg_quality: float
    validation_pass_rate: float
    categories_processed: List[str]
    insight_types: List[str]
    has_anomalies: bool
    anomaly_reasons: List[str]


class RunListResponse(BaseModel):
    """Response for listing runs."""
    runs: List[RunSummary]
    total: int
    page: int
    page_size: int
    total_pages: int


class RunDetailResponse(BaseModel):
    """Detailed view of a single run."""
    execution_id: str
    worker_name: str
    started_at: str
    completed_at: str
    duration_ms: float
    total_insights: int
    avg_confidence: float
    avg_quality: float
    validation_pass_rate: float
    categories_processed: List[str]
    insight_types: List[str]
    has_anomalies: bool
    anomaly_reasons: List[str]
    insights: List[ProvenanceRecordResponse]
    top_decision_factors: List[Dict[str, Any]]


@router.get("/runs", response_model=RunListResponse)
async def list_runs(
    worker_name: Optional[str] = Query(None, description="Filter by worker name"),
    hours: int = Query(24, ge=1, le=168),
    anomalies_only: bool = Query(False, description="Show only runs with anomalies"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    List worker execution runs grouped by execution_id.
    
    Each run represents a single worker execution that may have generated
    multiple provenance records (insights).
    """
    service = get_provenance_service()
    
    query = ProvenanceQuery(
        worker_names=[worker_name] if worker_name else None,
        start_time=datetime.now(timezone.utc) - timedelta(hours=hours),
        page_size=2000,  # Get more records to group
    )
    records, _ = service.query(query)
    
    # Group by execution_id
    runs_map: Dict[str, List] = {}
    for r in records:
        if r.execution_id not in runs_map:
            runs_map[r.execution_id] = []
        runs_map[r.execution_id].append(r)
    
    # Build run summaries
    run_summaries = []
    for exec_id, run_records in runs_map.items():
        if not run_records:
            continue
        
        # Calculate run metrics
        first_record = min(run_records, key=lambda r: r.computed_at)
        last_record = max(run_records, key=lambda r: r.computed_at)
        
        avg_conf = sum(r.confidence_score for r in run_records) / len(run_records)
        avg_qual = sum(r.quality_score for r in run_records) / len(run_records)
        validation_rate = sum(1 for r in run_records if r.validation_passed) / len(run_records)
        
        categories = list(set(r.category_key for r in run_records if r.category_key))
        insight_types = list(set(r.insight_type.value for r in run_records))
        
        # Detect anomalies
        anomaly_reasons = []
        if avg_conf < 0.5:
            anomaly_reasons.append(f"Low avg confidence: {avg_conf:.0%}")
        if avg_qual < 0.5:
            anomaly_reasons.append(f"Low avg quality: {avg_qual:.0%}")
        if validation_rate < 0.9:
            anomaly_reasons.append(f"Validation failures: {(1-validation_rate)*100:.0f}%")
        
        # Check for unusually long computation times
        total_duration = sum(r.computation_duration_ms for r in run_records)
        if total_duration > 60000:  # > 1 minute total
            anomaly_reasons.append(f"Long computation: {total_duration/1000:.1f}s")
        
        has_anomalies = len(anomaly_reasons) > 0
        
        if anomalies_only and not has_anomalies:
            continue
        
        run_summaries.append(RunSummary(
            execution_id=exec_id,
            worker_name=first_record.worker_name,
            started_at=first_record.computed_at.isoformat(),
            completed_at=last_record.computed_at.isoformat(),
            duration_ms=total_duration,
            total_insights=len(run_records),
            avg_confidence=round(avg_conf, 3),
            avg_quality=round(avg_qual, 3),
            validation_pass_rate=round(validation_rate, 3),
            categories_processed=categories,
            insight_types=insight_types,
            has_anomalies=has_anomalies,
            anomaly_reasons=anomaly_reasons,
        ))
    
    # Sort by started_at descending
    run_summaries.sort(key=lambda r: r.started_at, reverse=True)
    
    # Paginate
    total = len(run_summaries)
    total_pages = (total + page_size - 1) // page_size
    start = (page - 1) * page_size
    end = start + page_size
    paginated = run_summaries[start:end]
    
    return RunListResponse(
        runs=paginated,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/runs/{execution_id}", response_model=RunDetailResponse)
async def get_run_detail(execution_id: str):
    """
    Get detailed view of a single worker execution run.
    
    Returns all insights generated during this run along with
    aggregated metrics and anomaly detection.
    """
    service = get_provenance_service()
    
    # Query all records for this execution
    query = ProvenanceQuery(page_size=500)
    records, _ = service.query(query)
    
    # Filter to this execution_id
    run_records = [r for r in records if r.execution_id == execution_id]
    
    if not run_records:
        raise HTTPException(status_code=404, detail="Run not found")
    
    # Calculate metrics
    first_record = min(run_records, key=lambda r: r.computed_at)
    last_record = max(run_records, key=lambda r: r.computed_at)
    
    avg_conf = sum(r.confidence_score for r in run_records) / len(run_records)
    avg_qual = sum(r.quality_score for r in run_records) / len(run_records)
    validation_rate = sum(1 for r in run_records if r.validation_passed) / len(run_records)
    total_duration = sum(r.computation_duration_ms for r in run_records)
    
    categories = list(set(r.category_key for r in run_records if r.category_key))
    insight_types = list(set(r.insight_type.value for r in run_records))
    
    # Detect anomalies
    anomaly_reasons = []
    if avg_conf < 0.5:
        anomaly_reasons.append(f"Low avg confidence: {avg_conf:.0%}")
    if avg_qual < 0.5:
        anomaly_reasons.append(f"Low avg quality: {avg_qual:.0%}")
    if validation_rate < 0.9:
        anomaly_reasons.append(f"Validation failures: {(1-validation_rate)*100:.0f}%")
    if total_duration > 60000:
        anomaly_reasons.append(f"Long computation: {total_duration/1000:.1f}s")
    
    # Aggregate decision factors
    factor_counts: Dict[str, Dict[str, float]] = {}
    for r in run_records:
        for f in r.decision_factors:
            if f.factor_name not in factor_counts:
                factor_counts[f.factor_name] = {"count": 0, "total_contribution": 0}
            factor_counts[f.factor_name]["count"] += 1
            factor_counts[f.factor_name]["total_contribution"] += f.contribution
    
    top_factors = sorted(
        [{"name": k, "count": int(v["count"]), "avg_contribution": v["total_contribution"] / v["count"]}
         for k, v in factor_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:10]
    
    return RunDetailResponse(
        execution_id=execution_id,
        worker_name=first_record.worker_name,
        started_at=first_record.computed_at.isoformat(),
        completed_at=last_record.computed_at.isoformat(),
        duration_ms=total_duration,
        total_insights=len(run_records),
        avg_confidence=round(avg_conf, 3),
        avg_quality=round(avg_qual, 3),
        validation_pass_rate=round(validation_rate, 3),
        categories_processed=categories,
        insight_types=insight_types,
        has_anomalies=len(anomaly_reasons) > 0,
        anomaly_reasons=anomaly_reasons,
        insights=[_record_to_response(r) for r in run_records],
        top_decision_factors=top_factors,
    )


# =============================================================================
# Helpers
# =============================================================================

def _record_to_response(record) -> ProvenanceRecordResponse:
    """Convert a ProvenanceRecord to response model."""
    return ProvenanceRecordResponse(
        provenance_id=record.provenance_id,
        worker_name=record.worker_name,
        execution_id=record.execution_id,
        insight_type=record.insight_type.value,
        category_key=record.category_key,
        computed_at=record.computed_at.isoformat(),
        computation_duration_ms=record.computation_duration_ms,
        insight_id=record.insight_id,
        insight_summary=record.insight_summary,
        insight_value=record.insight_value,
        confidence_score=record.confidence_score,
        confidence_level=record.confidence_level.value,
        quality_score=record.quality_score,
        data_sources=[DataSourceResponse(**ds.to_dict()) for ds in record.data_sources],
        total_records_analyzed=record.total_records_analyzed,
        data_freshness_avg_seconds=record.data_freshness_avg_seconds,
        decision_factors=[DecisionFactorResponse(**df.to_dict()) for df in record.decision_factors],
        primary_factor=record.primary_factor,
        reasoning_chain=[ReasoningStepResponse(**rs.to_dict()) for rs in record.reasoning_chain],
        algorithm_version=record.algorithm_version,
        validation_passed=record.validation_passed,
        validation_errors=record.validation_errors,
        tags=record.tags,
    )
