"""
Provenance Data Models.

Defines the structure for capturing reasoning chains and decision factors.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid


class InsightType(str, Enum):
    """Types of insights that can be computed."""
    VIDEO_IDEA = "video_idea"
    TITLE_SUGGESTION = "title_suggestion"
    KEYWORD_RANKING = "keyword_ranking"
    VIRAL_PREDICTION = "viral_prediction"
    THUMBNAIL_ANALYSIS = "thumbnail_analysis"
    TREND_DETECTION = "trend_detection"
    CONTENT_FORMAT = "content_format"
    REGIONAL_OPPORTUNITY = "regional_opportunity"
    SEMANTIC_CLUSTER = "semantic_cluster"
    PLAYBOOK_RECOMMENDATION = "playbook_recommendation"
    # Nano Banana (Image Generation) Types
    IMAGE_GENERATION = "image_generation"
    IMAGE_REFINEMENT = "image_refinement"
    EMOTE_GENERATION = "emote_generation"
    THUMBNAIL_GENERATION = "thumbnail_generation"
    OVERLAY_GENERATION = "overlay_generation"
    BANNER_GENERATION = "banner_generation"
    PROFILE_GENERATION = "profile_generation"
    BATCH_GENERATION = "batch_generation"


class ConfidenceLevel(str, Enum):
    """Confidence levels for computed insights."""
    VERY_HIGH = "very_high"    # 90-100%
    HIGH = "high"              # 75-89%
    MEDIUM = "medium"          # 50-74%
    LOW = "low"                # 25-49%
    VERY_LOW = "very_low"      # 0-24%


@dataclass
class DataSource:
    """A data source used in computing an insight."""
    source_type: str           # e.g., "youtube_cache", "twitch_api", "redis"
    source_key: str            # e.g., "youtube:games:fortnite"
    records_used: int          # Number of records from this source
    freshness_seconds: float   # Age of data in seconds
    quality_score: float       # 0-1 quality assessment
    sample_ids: List[str] = field(default_factory=list)  # Sample record IDs for audit
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class DecisionFactor:
    """A factor that influenced a decision/score."""
    factor_name: str           # e.g., "view_velocity", "keyword_frequency"
    raw_value: Any             # The actual value
    normalized_value: float    # Normalized 0-1 value
    weight: float              # Weight applied (0-1)
    contribution: float        # Actual contribution to final score
    reasoning: str             # Human-readable explanation
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "factor_name": self.factor_name,
            "raw_value": str(self.raw_value) if not isinstance(self.raw_value, (int, float, str, bool)) else self.raw_value,
            "normalized_value": self.normalized_value,
            "weight": self.weight,
            "contribution": self.contribution,
            "reasoning": self.reasoning,
        }


@dataclass
class ReasoningStep:
    """A single step in the reasoning chain."""
    step_number: int
    operation: str             # e.g., "filter", "score", "rank", "aggregate"
    description: str           # What this step does
    input_count: int           # Items going in
    output_count: int          # Items coming out
    algorithm: str             # Algorithm/method used
    parameters: Dict[str, Any] = field(default_factory=dict)
    duration_ms: float = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ProvenanceRecord:
    """Complete provenance record for a computed insight."""
    # Identity
    provenance_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    
    # Context
    worker_name: str = ""
    execution_id: str = ""
    insight_type: InsightType = InsightType.VIDEO_IDEA
    category_key: str = ""     # e.g., "fortnite", "valorant"
    
    # Timing
    computed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    computation_duration_ms: float = 0
    
    # The actual insight/output
    insight_id: str = ""       # ID of the generated insight
    insight_summary: str = ""  # Brief description of what was computed
    insight_value: Any = None  # The actual computed value/object
    
    # Confidence & Quality
    confidence_score: float = 0.0
    confidence_level: ConfidenceLevel = ConfidenceLevel.MEDIUM
    quality_score: float = 0.0
    
    # Data lineage
    data_sources: List[DataSource] = field(default_factory=list)
    total_records_analyzed: int = 0
    data_freshness_avg_seconds: float = 0
    
    # Decision factors (the "why")
    decision_factors: List[DecisionFactor] = field(default_factory=list)
    primary_factor: str = ""   # Most influential factor
    
    # Reasoning chain (the "how")
    reasoning_chain: List[ReasoningStep] = field(default_factory=list)
    algorithm_version: str = "1.0"
    
    # Validation
    validation_passed: bool = True
    validation_errors: List[str] = field(default_factory=list)
    
    # Tags for filtering
    tags: List[str] = field(default_factory=list)

    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "provenance_id": self.provenance_id,
            "worker_name": self.worker_name,
            "execution_id": self.execution_id,
            "insight_type": self.insight_type.value,
            "category_key": self.category_key,
            "computed_at": self.computed_at.isoformat(),
            "computation_duration_ms": self.computation_duration_ms,
            "insight_id": self.insight_id,
            "insight_summary": self.insight_summary,
            "insight_value": self.insight_value if isinstance(self.insight_value, (dict, list, str, int, float, bool, type(None))) else str(self.insight_value),
            "confidence_score": self.confidence_score,
            "confidence_level": self.confidence_level.value,
            "quality_score": self.quality_score,
            "data_sources": [ds.to_dict() for ds in self.data_sources],
            "total_records_analyzed": self.total_records_analyzed,
            "data_freshness_avg_seconds": self.data_freshness_avg_seconds,
            "decision_factors": [df.to_dict() for df in self.decision_factors],
            "primary_factor": self.primary_factor,
            "reasoning_chain": [rs.to_dict() for rs in self.reasoning_chain],
            "algorithm_version": self.algorithm_version,
            "validation_passed": self.validation_passed,
            "validation_errors": self.validation_errors,
            "tags": self.tags,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ProvenanceRecord":
        """Create from dictionary."""
        record = cls()
        record.provenance_id = data.get("provenance_id", record.provenance_id)
        record.worker_name = data.get("worker_name", "")
        record.execution_id = data.get("execution_id", "")
        record.insight_type = InsightType(data.get("insight_type", "video_idea"))
        record.category_key = data.get("category_key", "")
        record.computed_at = datetime.fromisoformat(data["computed_at"]) if data.get("computed_at") else record.computed_at
        record.computation_duration_ms = data.get("computation_duration_ms", 0)
        record.insight_id = data.get("insight_id", "")
        record.insight_summary = data.get("insight_summary", "")
        record.insight_value = data.get("insight_value")
        record.confidence_score = data.get("confidence_score", 0)
        record.confidence_level = ConfidenceLevel(data.get("confidence_level", "medium"))
        record.quality_score = data.get("quality_score", 0)
        record.total_records_analyzed = data.get("total_records_analyzed", 0)
        record.data_freshness_avg_seconds = data.get("data_freshness_avg_seconds", 0)
        record.primary_factor = data.get("primary_factor", "")
        record.algorithm_version = data.get("algorithm_version", "1.0")
        record.validation_passed = data.get("validation_passed", True)
        record.validation_errors = data.get("validation_errors", [])
        record.tags = data.get("tags", [])
        
        # Reconstruct nested objects
        for ds_data in data.get("data_sources", []):
            record.data_sources.append(DataSource(**ds_data))
        for df_data in data.get("decision_factors", []):
            record.decision_factors.append(DecisionFactor(**df_data))
        for rs_data in data.get("reasoning_chain", []):
            record.reasoning_chain.append(ReasoningStep(**rs_data))
        
        return record


@dataclass
class GenerationMetrics:
    """Metrics specific to image generation provenance."""
    # Request details
    model_name: str = ""
    prompt_length: int = 0
    prompt_tokens_estimated: int = 0
    
    # Dimensions
    width: int = 0
    height: int = 0
    aspect_ratio: str = ""
    
    # Generation mode
    is_refinement: bool = False
    is_multi_turn: bool = False
    conversation_turns: int = 0
    has_input_image: bool = False
    media_assets_count: int = 0
    
    # Performance
    inference_time_ms: int = 0
    total_latency_ms: int = 0
    retry_count: int = 0
    
    # Output
    output_size_bytes: int = 0
    output_format: str = "png"
    
    # Cost estimation (based on Gemini pricing)
    estimated_input_tokens: int = 0
    estimated_output_tokens: int = 0
    estimated_cost_usd: float = 0.0
    
    # Quality signals
    content_policy_passed: bool = True
    generation_seed: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class GenerationProvenance(ProvenanceRecord):
    """
    Extended provenance record for image generation.
    
    Captures all details about a Nano Banana API call including:
    - Full prompt (sanitized)
    - Model and parameters
    - Performance metrics
    - Cost estimation
    - Quality signals
    """
    # Generation-specific metrics
    generation_metrics: GenerationMetrics = field(default_factory=GenerationMetrics)
    
    # Prompt details (sanitized - no PII)
    prompt_hash: str = ""  # SHA256 of full prompt for deduplication
    prompt_preview: str = ""  # First 200 chars for debugging
    
    # Brand kit context
    brand_kit_id: Optional[str] = None
    brand_kit_name: str = ""
    
    # Job linkage
    job_id: str = ""
    asset_id: str = ""
    user_id: str = ""
    
    # Error tracking
    error_type: Optional[str] = None  # rate_limit, content_policy, timeout, api_error
    error_details: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        base = super().to_dict()
        base["generation_metrics"] = self.generation_metrics.to_dict()
        base["prompt_hash"] = self.prompt_hash
        base["prompt_preview"] = self.prompt_preview
        base["brand_kit_id"] = self.brand_kit_id
        base["brand_kit_name"] = self.brand_kit_name
        base["job_id"] = self.job_id
        base["asset_id"] = self.asset_id
        base["user_id"] = self.user_id
        base["error_type"] = self.error_type
        base["error_details"] = self.error_details
        return base


@dataclass
class ProvenanceQuery:
    """Query parameters for filtering provenance records."""
    # Filters
    worker_names: Optional[List[str]] = None
    insight_types: Optional[List[InsightType]] = None
    category_keys: Optional[List[str]] = None
    confidence_levels: Optional[List[ConfidenceLevel]] = None
    tags: Optional[List[str]] = None
    
    # Time range
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    
    # Quality filters
    min_confidence: Optional[float] = None
    min_quality: Optional[float] = None
    validation_passed_only: bool = False
    
    # Sorting
    sort_by: str = "computed_at"  # computed_at, confidence_score, quality_score, computation_duration_ms
    sort_desc: bool = True
    
    # Pagination
    page: int = 1
    page_size: int = 50
    
    # Search
    search_query: Optional[str] = None  # Search in insight_summary


@dataclass
class ProvenanceAggregation:
    """Aggregated provenance statistics."""
    # Counts
    total_records: int = 0
    records_by_type: Dict[str, int] = field(default_factory=dict)
    records_by_worker: Dict[str, int] = field(default_factory=dict)
    records_by_category: Dict[str, int] = field(default_factory=dict)
    records_by_confidence: Dict[str, int] = field(default_factory=dict)
    
    # Quality metrics
    avg_confidence_score: float = 0
    avg_quality_score: float = 0
    avg_computation_time_ms: float = 0
    validation_pass_rate: float = 0
    
    # Data freshness
    avg_data_freshness_seconds: float = 0
    avg_records_analyzed: float = 0
    
    # Top factors
    top_decision_factors: List[Dict[str, Any]] = field(default_factory=list)
    
    # Time series (for charts)
    hourly_counts: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
