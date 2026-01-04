"""
Provenance Service.

Handles storage, retrieval, and aggregation of provenance records.
Uses Redis for hot data and PostgreSQL for long-term storage.
"""

import json
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple
import redis

from .models import (
    ProvenanceRecord,
    ProvenanceQuery,
    ProvenanceAggregation,
    InsightType,
    ConfidenceLevel,
)

logger = logging.getLogger(__name__)

# Redis key prefixes
PROVENANCE_PREFIX = "provenance:"
RECORD_KEY = f"{PROVENANCE_PREFIX}record:"
INDEX_BY_WORKER = f"{PROVENANCE_PREFIX}idx:worker:"
INDEX_BY_TYPE = f"{PROVENANCE_PREFIX}idx:type:"
INDEX_BY_CATEGORY = f"{PROVENANCE_PREFIX}idx:category:"
INDEX_BY_TIME = f"{PROVENANCE_PREFIX}idx:time"
STATS_KEY = f"{PROVENANCE_PREFIX}stats"
FACTOR_STATS_KEY = f"{PROVENANCE_PREFIX}factor_stats"

# TTLs
RECORD_TTL = 7 * 24 * 60 * 60  # 7 days
STATS_TTL = 60 * 60  # 1 hour


class ProvenanceService:
    """Service for managing provenance records."""
    
    def __init__(self, redis_url: Optional[str] = None):
        self._redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self._redis: Optional[redis.Redis] = None
    
    def _get_redis(self) -> redis.Redis:
        """Get Redis client."""
        if self._redis is None:
            self._redis = redis.from_url(self._redis_url, decode_responses=True)
        return self._redis
    
    def store(self, record: ProvenanceRecord) -> bool:
        """Store a provenance record."""
        try:
            client = self._get_redis()
            pipe = client.pipeline()
            
            # Store the record
            record_key = f"{RECORD_KEY}{record.provenance_id}"
            pipe.setex(record_key, RECORD_TTL, json.dumps(record.to_dict()))
            
            # Index by worker
            worker_key = f"{INDEX_BY_WORKER}{record.worker_name}"
            pipe.zadd(worker_key, {record.provenance_id: record.computed_at.timestamp()})
            pipe.expire(worker_key, RECORD_TTL)
            
            # Index by type
            type_key = f"{INDEX_BY_TYPE}{record.insight_type.value}"
            pipe.zadd(type_key, {record.provenance_id: record.computed_at.timestamp()})
            pipe.expire(type_key, RECORD_TTL)
            
            # Index by category
            if record.category_key:
                cat_key = f"{INDEX_BY_CATEGORY}{record.category_key}"
                pipe.zadd(cat_key, {record.provenance_id: record.computed_at.timestamp()})
                pipe.expire(cat_key, RECORD_TTL)
            
            # Global time index
            pipe.zadd(INDEX_BY_TIME, {record.provenance_id: record.computed_at.timestamp()})
            
            # Update factor statistics
            for factor in record.decision_factors:
                factor_key = f"{FACTOR_STATS_KEY}:{factor.factor_name}"
                pipe.hincrby(factor_key, "count", 1)
                pipe.hincrbyfloat(factor_key, "total_contribution", factor.contribution)
                pipe.expire(factor_key, RECORD_TTL)
            
            pipe.execute()
            
            logger.debug(f"Stored provenance record: {record.provenance_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store provenance record: {e}")
            return False

    
    def get(self, provenance_id: str) -> Optional[ProvenanceRecord]:
        """Get a single provenance record by ID."""
        try:
            client = self._get_redis()
            data = client.get(f"{RECORD_KEY}{provenance_id}")
            if data:
                return ProvenanceRecord.from_dict(json.loads(data))
            return None
        except Exception as e:
            logger.error(f"Failed to get provenance record: {e}")
            return None
    
    def query(self, query: ProvenanceQuery) -> Tuple[List[ProvenanceRecord], int]:
        """
        Query provenance records with filtering, sorting, and pagination.
        
        Returns: (records, total_count)
        """
        try:
            client = self._get_redis()
            
            # Determine which index to use as primary
            candidate_ids = self._get_candidate_ids(client, query)
            
            # Load and filter records
            records = []
            for pid in candidate_ids:
                data = client.get(f"{RECORD_KEY}{pid}")
                if data:
                    record = ProvenanceRecord.from_dict(json.loads(data))
                    if self._matches_query(record, query):
                        records.append(record)
            
            # Sort
            records = self._sort_records(records, query.sort_by, query.sort_desc)
            
            # Get total before pagination
            total = len(records)
            
            # Paginate
            start = (query.page - 1) * query.page_size
            end = start + query.page_size
            records = records[start:end]
            
            return records, total
            
        except Exception as e:
            logger.error(f"Failed to query provenance records: {e}")
            return [], 0
    
    def _get_candidate_ids(self, client: redis.Redis, query: ProvenanceQuery) -> List[str]:
        """Get candidate IDs from indexes."""
        # Time range
        min_score = query.start_time.timestamp() if query.start_time else "-inf"
        max_score = query.end_time.timestamp() if query.end_time else "+inf"
        
        # Use most selective index
        if query.worker_names and len(query.worker_names) == 1:
            key = f"{INDEX_BY_WORKER}{query.worker_names[0]}"
            return client.zrevrangebyscore(key, max_score, min_score, start=0, num=1000)
        
        if query.insight_types and len(query.insight_types) == 1:
            key = f"{INDEX_BY_TYPE}{query.insight_types[0].value}"
            return client.zrevrangebyscore(key, max_score, min_score, start=0, num=1000)
        
        if query.category_keys and len(query.category_keys) == 1:
            key = f"{INDEX_BY_CATEGORY}{query.category_keys[0]}"
            return client.zrevrangebyscore(key, max_score, min_score, start=0, num=1000)
        
        # Fall back to global time index
        return client.zrevrangebyscore(INDEX_BY_TIME, max_score, min_score, start=0, num=1000)

    
    def _matches_query(self, record: ProvenanceRecord, query: ProvenanceQuery) -> bool:
        """Check if a record matches query filters."""
        # Worker filter
        if query.worker_names and record.worker_name not in query.worker_names:
            return False
        
        # Type filter
        if query.insight_types and record.insight_type not in query.insight_types:
            return False
        
        # Category filter
        if query.category_keys and record.category_key not in query.category_keys:
            return False
        
        # Confidence level filter
        if query.confidence_levels and record.confidence_level not in query.confidence_levels:
            return False
        
        # Tags filter
        if query.tags and not any(t in record.tags for t in query.tags):
            return False
        
        # Time range
        if query.start_time and record.computed_at < query.start_time:
            return False
        if query.end_time and record.computed_at > query.end_time:
            return False
        
        # Quality filters
        if query.min_confidence and record.confidence_score < query.min_confidence:
            return False
        if query.min_quality and record.quality_score < query.min_quality:
            return False
        if query.validation_passed_only and not record.validation_passed:
            return False
        
        # Search
        if query.search_query:
            q = query.search_query.lower()
            if q not in record.insight_summary.lower() and q not in record.category_key.lower():
                return False
        
        return True
    
    def _sort_records(self, records: List[ProvenanceRecord], sort_by: str, desc: bool) -> List[ProvenanceRecord]:
        """Sort records by field."""
        key_map = {
            "computed_at": lambda r: r.computed_at,
            "confidence_score": lambda r: r.confidence_score,
            "quality_score": lambda r: r.quality_score,
            "computation_duration_ms": lambda r: r.computation_duration_ms,
            "total_records_analyzed": lambda r: r.total_records_analyzed,
        }
        key_fn = key_map.get(sort_by, key_map["computed_at"])
        return sorted(records, key=key_fn, reverse=desc)

    
    def aggregate(self, query: Optional[ProvenanceQuery] = None) -> ProvenanceAggregation:
        """Get aggregated statistics for provenance records."""
        try:
            client = self._get_redis()
            
            # Get all matching records (or recent if no query)
            if query:
                records, _ = self.query(ProvenanceQuery(
                    worker_names=query.worker_names,
                    insight_types=query.insight_types,
                    category_keys=query.category_keys,
                    start_time=query.start_time,
                    end_time=query.end_time,
                    page_size=1000,
                ))
            else:
                # Last 24 hours by default
                records, _ = self.query(ProvenanceQuery(
                    start_time=datetime.now(timezone.utc) - timedelta(hours=24),
                    page_size=1000,
                ))
            
            if not records:
                return ProvenanceAggregation()
            
            agg = ProvenanceAggregation()
            agg.total_records = len(records)
            
            # Counts by dimension
            for r in records:
                # By type
                t = r.insight_type.value
                agg.records_by_type[t] = agg.records_by_type.get(t, 0) + 1
                
                # By worker
                agg.records_by_worker[r.worker_name] = agg.records_by_worker.get(r.worker_name, 0) + 1
                
                # By category
                if r.category_key:
                    agg.records_by_category[r.category_key] = agg.records_by_category.get(r.category_key, 0) + 1
                
                # By confidence
                c = r.confidence_level.value
                agg.records_by_confidence[c] = agg.records_by_confidence.get(c, 0) + 1
            
            # Averages
            agg.avg_confidence_score = sum(r.confidence_score for r in records) / len(records)
            agg.avg_quality_score = sum(r.quality_score for r in records) / len(records)
            agg.avg_computation_time_ms = sum(r.computation_duration_ms for r in records) / len(records)
            agg.validation_pass_rate = sum(1 for r in records if r.validation_passed) / len(records)
            agg.avg_data_freshness_seconds = sum(r.data_freshness_avg_seconds for r in records) / len(records)
            agg.avg_records_analyzed = sum(r.total_records_analyzed for r in records) / len(records)
            
            # Top decision factors
            factor_counts: Dict[str, Dict[str, float]] = {}
            for r in records:
                for f in r.decision_factors:
                    if f.factor_name not in factor_counts:
                        factor_counts[f.factor_name] = {"count": 0, "total_contribution": 0}
                    factor_counts[f.factor_name]["count"] += 1
                    factor_counts[f.factor_name]["total_contribution"] += f.contribution
            
            agg.top_decision_factors = sorted(
                [{"name": k, "count": int(v["count"]), "avg_contribution": v["total_contribution"] / v["count"]}
                 for k, v in factor_counts.items()],
                key=lambda x: x["count"],
                reverse=True
            )[:10]
            
            # Hourly counts (last 24h)
            hourly: Dict[str, int] = {}
            for r in records:
                hour_key = r.computed_at.strftime("%Y-%m-%d %H:00")
                hourly[hour_key] = hourly.get(hour_key, 0) + 1
            
            agg.hourly_counts = [{"hour": k, "count": v} for k, v in sorted(hourly.items())]
            
            return agg
            
        except Exception as e:
            logger.error(f"Failed to aggregate provenance: {e}")
            return ProvenanceAggregation()

    
    def get_reasoning_chain(self, provenance_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed reasoning chain for a specific insight."""
        record = self.get(provenance_id)
        if not record:
            return None
        
        return {
            "provenance_id": record.provenance_id,
            "insight_type": record.insight_type.value,
            "insight_summary": record.insight_summary,
            "computed_at": record.computed_at.isoformat(),
            "confidence": {
                "score": record.confidence_score,
                "level": record.confidence_level.value,
            },
            "data_lineage": {
                "sources": [ds.to_dict() for ds in record.data_sources],
                "total_records": record.total_records_analyzed,
                "avg_freshness_seconds": record.data_freshness_avg_seconds,
            },
            "decision_factors": {
                "primary": record.primary_factor,
                "all_factors": [df.to_dict() for df in record.decision_factors],
                "factor_breakdown": {
                    df.factor_name: {
                        "contribution_pct": round(df.contribution * 100, 1),
                        "reasoning": df.reasoning,
                    }
                    for df in record.decision_factors
                },
            },
            "reasoning_chain": [
                {
                    "step": rs.step_number,
                    "operation": rs.operation,
                    "description": rs.description,
                    "input_count": rs.input_count,
                    "output_count": rs.output_count,
                    "algorithm": rs.algorithm,
                    "duration_ms": rs.duration_ms,
                }
                for rs in record.reasoning_chain
            ],
            "validation": {
                "passed": record.validation_passed,
                "errors": record.validation_errors,
            },
        }
    
    def get_factor_analysis(self, factor_name: str, days: int = 7) -> Dict[str, Any]:
        """Analyze a specific decision factor across all insights."""
        try:
            start_time = datetime.now(timezone.utc) - timedelta(days=days)
            records, _ = self.query(ProvenanceQuery(start_time=start_time, page_size=1000))
            
            factor_data = []
            for r in records:
                for f in r.decision_factors:
                    if f.factor_name == factor_name:
                        factor_data.append({
                            "provenance_id": r.provenance_id,
                            "insight_type": r.insight_type.value,
                            "category": r.category_key,
                            "raw_value": f.raw_value,
                            "normalized": f.normalized_value,
                            "weight": f.weight,
                            "contribution": f.contribution,
                            "computed_at": r.computed_at.isoformat(),
                        })
            
            if not factor_data:
                return {"factor_name": factor_name, "occurrences": 0}
            
            return {
                "factor_name": factor_name,
                "occurrences": len(factor_data),
                "avg_contribution": sum(d["contribution"] for d in factor_data) / len(factor_data),
                "avg_weight": sum(d["weight"] for d in factor_data) / len(factor_data),
                "by_insight_type": self._group_by(factor_data, "insight_type"),
                "by_category": self._group_by(factor_data, "category"),
                "recent_samples": factor_data[:20],
            }
        except Exception as e:
            logger.error(f"Failed to analyze factor: {e}")
            return {"factor_name": factor_name, "error": str(e)}
    
    def _group_by(self, data: List[Dict], key: str) -> Dict[str, int]:
        """Group data by a key."""
        result: Dict[str, int] = {}
        for d in data:
            v = d.get(key, "unknown")
            result[v] = result.get(v, 0) + 1
        return result


# Singleton
_service: Optional[ProvenanceService] = None

def get_provenance_service() -> ProvenanceService:
    """Get the provenance service singleton."""
    global _service
    if _service is None:
        _service = ProvenanceService()
    return _service
