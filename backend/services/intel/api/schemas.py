"""
Creator Intel V2 - API Schemas

Pydantic schemas for API request/response validation.
"""

import re
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# Category key validation pattern (alphanumeric and underscores only)
CATEGORY_KEY_PATTERN = re.compile(r'^[a-z][a-z0-9_]{1,49}$')


# ============================================================================
# Common Schemas
# ============================================================================

class IntelConfidence(BaseModel):
    """Confidence metadata for intel responses."""
    score: int = Field(..., ge=0, le=100, description="Confidence score 0-100")
    label: Literal["Fresh", "Recent", "Stale", "Old", "Expired"] = Field(
        ..., description="Human-readable freshness label"
    )
    fetched_at: Optional[str] = Field(None, description="When data was fetched (ISO format)")
    hours_old: Optional[float] = Field(None, description="Age of data in hours")


class AnalyzeRequest(BaseModel):
    """Request to run analysis."""
    category_key: str = Field(..., description="Category to analyze (e.g., 'fortnite')")
    analyzers: Optional[List[str]] = Field(
        None, description="Specific analyzers to run (default: all)"
    )
    force_refresh: bool = Field(False, description="Bypass cache and re-analyze")
    
    @field_validator('category_key')
    @classmethod
    def validate_category_key(cls, v: str) -> str:
        """Validate category key format to prevent injection."""
        if not CATEGORY_KEY_PATTERN.match(v):
            raise ValueError(
                'category_key must be lowercase alphanumeric with underscores, '
                '2-50 chars, starting with a letter'
            )
        return v
    
    @field_validator('analyzers')
    @classmethod
    def validate_analyzers(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """Validate analyzer names."""
        if v is None:
            return v
        valid_analyzers = {
            'content_format', 'description', 'semantic', 'regional', 'live_stream'
        }
        for analyzer in v:
            if analyzer not in valid_analyzers:
                raise ValueError(f'Invalid analyzer: {analyzer}. Valid: {valid_analyzers}')
        return v


# ============================================================================
# Duration Bucket Schema
# ============================================================================

class DurationBucketSchema(BaseModel):
    """Performance metrics for a duration range."""
    min_seconds: int
    max_seconds: int
    label: str
    video_count: int
    avg_views: float
    avg_engagement: float
    total_views: int
    performance_index: float


# ============================================================================
# Format Comparison Schema
# ============================================================================

class FormatComparisonSchema(BaseModel):
    """Comparison between two content formats."""
    format_a: str
    format_b: str
    format_a_count: int
    format_b_count: int
    format_a_avg_views: float
    format_b_avg_views: float
    performance_ratio: float
    recommendation: str
    confidence: int


# ============================================================================
# Content Format Response
# ============================================================================

class ContentFormatResponse(BaseModel):
    """Response for content format analysis."""
    category_key: str
    category_name: str
    
    # Duration analysis
    duration_buckets: List[DurationBucketSchema]
    optimal_duration_range: str
    optimal_duration_min_seconds: int
    optimal_duration_max_seconds: int
    
    # Format comparisons
    shorts_vs_longform: FormatComparisonSchema
    live_vs_vod: FormatComparisonSchema
    hd_vs_sd: FormatComparisonSchema
    
    # Insights
    insights: List[str]
    
    # Metadata
    video_count: int
    confidence: int
    analyzed_at: str


# ============================================================================
# Description Response
# ============================================================================

class HashtagSchema(BaseModel):
    """Hashtag analysis."""
    hashtag: str
    frequency: int
    avg_views: float
    appears_in_title: bool
    is_trending: bool


class TimestampPatternSchema(BaseModel):
    """Timestamp pattern."""
    pattern_type: str
    avg_position_percent: float
    frequency: int


class SponsorPatternSchema(BaseModel):
    """Sponsor pattern."""
    sponsor_type: str
    frequency: int
    avg_views_with_sponsor: float
    avg_views_without_sponsor: float


class DescriptionResponse(BaseModel):
    """Response for description analysis."""
    category_key: str
    category_name: str
    
    # Hashtag analysis
    top_hashtags: List[HashtagSchema]
    hashtag_count_avg: float
    
    # Timestamp analysis
    has_timestamps_percent: float
    common_chapter_patterns: List[TimestampPatternSchema]
    
    # Sponsor analysis
    has_sponsor_percent: float
    sponsor_patterns: List[SponsorPatternSchema]
    
    # Link analysis
    has_social_links_percent: float
    common_platforms: List[str]
    
    # Insights
    insights: List[str]
    
    # Metadata
    video_count: int
    confidence: int
    analyzed_at: str


# ============================================================================
# Semantic Response
# ============================================================================

class TopicClusterSchema(BaseModel):
    """Topic cluster."""
    primary_topic: str
    related_topics: List[str]
    video_count: int
    avg_views: float
    performance_index: float


class TagClusterSchema(BaseModel):
    """Tag cluster."""
    anchor_tag: str
    co_occurring_tags: List[str]
    frequency: int
    avg_views: float


class SemanticResponse(BaseModel):
    """Response for semantic analysis."""
    category_key: str
    category_name: str
    
    # Topic analysis
    top_topics: List[str]
    topic_clusters: List[TopicClusterSchema]
    topic_view_correlation: Dict[str, float]
    
    # Tag analysis
    top_tags_full: List[str]
    tag_clusters: List[TagClusterSchema]
    optimal_tag_count: int
    
    # Insights
    insights: List[str]
    
    # Metadata
    video_count: int
    confidence: int
    analyzed_at: str


# ============================================================================
# Regional Response
# ============================================================================

class LanguageMetricsSchema(BaseModel):
    """Metrics for a language."""
    language_code: str
    language_name: str
    youtube_video_count: int
    youtube_avg_views: float
    youtube_total_views: int
    twitch_stream_count: int
    twitch_avg_viewers: float
    twitch_total_viewers: int
    competition_score: float
    opportunity_score: float
    market_share_percent: float


class RegionalResponse(BaseModel):
    """Response for regional analysis."""
    category_key: str
    category_name: str
    
    # Language breakdown
    languages: List[LanguageMetricsSchema]
    dominant_language: str
    underserved_languages: List[str]
    
    # Opportunity analysis
    best_opportunity_language: str
    opportunity_reason: str
    
    # Insights
    insights: List[str]
    
    # Metadata
    youtube_video_count: int
    twitch_stream_count: int
    confidence: int
    analyzed_at: str


# ============================================================================
# Live Stream Response
# ============================================================================

class PremiereAnalysisSchema(BaseModel):
    """Premiere analysis."""
    premiere_count: int
    instant_count: int
    premiere_avg_views: float
    instant_avg_views: float
    performance_ratio: float
    recommendation: str


class ScheduleTimeSlotSchema(BaseModel):
    """Schedule time slot."""
    hour_utc: int
    day_of_week: str
    premiere_count: int
    avg_views: float
    performance_index: float


class DurationComparisonSchema(BaseModel):
    """Duration comparison."""
    avg_stream_duration_minutes: float
    avg_video_duration_minutes: float
    trim_ratio: float
    optimal_trim_ratio: float


class LiveStreamResponse(BaseModel):
    """Response for live stream analysis."""
    category_key: str
    category_name: str
    
    # Premiere analysis
    premiere_analysis: PremiereAnalysisSchema
    
    # Scheduling analysis
    best_premiere_times: List[ScheduleTimeSlotSchema]
    worst_premiere_times: List[ScheduleTimeSlotSchema]
    
    # Duration analysis
    duration_comparison: Optional[DurationComparisonSchema]
    
    # Schedule adherence
    avg_delay_seconds: float
    on_time_percent: float
    
    # Insights
    insights: List[str]
    
    # Metadata
    video_count: int
    live_video_count: int
    confidence: int
    analyzed_at: str


# ============================================================================
# Combined Intel Response
# ============================================================================

class CombinedIntelResponse(BaseModel):
    """Combined response with all intel types."""
    category_key: str
    category_name: str
    
    # Individual analyses (optional, may be null if not available)
    content_format: Optional[ContentFormatResponse] = None
    description: Optional[DescriptionResponse] = None
    semantic: Optional[SemanticResponse] = None
    regional: Optional[RegionalResponse] = None
    live_stream: Optional[LiveStreamResponse] = None
    
    # Overall confidence
    confidence: IntelConfidence
    
    # Metadata
    analyzers_available: List[str]
    fetched_at: str


# ============================================================================
# Health Response
# ============================================================================

class ComponentHealthSchema(BaseModel):
    """Health status for a component."""
    name: str
    status: Literal["healthy", "degraded", "unhealthy", "unknown"]
    message: Optional[str] = None
    last_check: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    """System health response."""
    status: Literal["healthy", "degraded", "unhealthy", "unknown"]
    timestamp: str
    components: List[ComponentHealthSchema]


# ============================================================================
# Orchestrator Status Response
# ============================================================================

class TaskStatusSchema(BaseModel):
    """Status of a scheduled task."""
    name: str
    interval_seconds: int
    priority: str
    last_run: Optional[str] = None
    last_success: Optional[str] = None
    last_error: Optional[str] = None
    consecutive_failures: int = 0
    is_running: bool = False
    next_run: Optional[str] = None


class QuotaStatusSchema(BaseModel):
    """API quota status."""
    units_used: int
    units_remaining: int
    units_limit: int
    percent_used: float
    window_start: Optional[str] = None
    circuit_open: bool = False
    circuit_open_until: Optional[str] = None


class OrchestratorMetricsSchema(BaseModel):
    """Orchestrator metrics."""
    tasks_executed: int
    tasks_succeeded: int
    tasks_failed: int
    success_rate: float
    avg_duration: float
    last_health_check: Optional[str] = None
    started_at: Optional[str] = None
    uptime_seconds: float = 0


class OrchestratorStatusResponse(BaseModel):
    """Orchestrator status response."""
    running: bool
    metrics: OrchestratorMetricsSchema
    tasks: Dict[str, TaskStatusSchema]
    quota: QuotaStatusSchema
