"""
Pydantic schemas for Trend Intelligence system.
AuraStream - Creator Daily Brief & Viral Analytics
"""

from datetime import datetime, date
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


# ============================================================================
# Enums / Literal Types
# ============================================================================

TrendCategory = Literal["gaming", "entertainment", "music", "education"]
TrendVelocity = Literal["rising", "stable", "falling"]
AlertType = Literal["game_spike", "video_viral", "streamer_rising"]
AlertSeverity = Literal["low", "medium", "high", "critical"]
ColorMood = Literal["warm", "cool", "neutral", "vibrant"]
Composition = Literal["centered", "rule_of_thirds", "left_heavy", "right_heavy"]
InsightCategory = Literal["thumbnail", "title", "timing", "game", "general"]

# Supported games for filtering
GameFilter = Literal[
    "fortnite", "warzone", "valorant", "minecraft", "arc_raiders",
    "league_of_legends", "apex_legends", "gta", "roblox", "call_of_duty"
]

# Sort options
SortBy = Literal["views", "likes", "engagement", "date", "duration"]
SortOrder = Literal["asc", "desc"]
DurationType = Literal["short", "medium", "long", "any"]  # <1min, 1-20min, >20min


# ============================================================================
# YouTube Schemas
# ============================================================================

class YouTubeVideoResponse(BaseModel):
    """Response schema for a YouTube video."""
    video_id: str = Field(..., description="YouTube video ID")
    title: str = Field(..., description="Video title")
    thumbnail: str = Field(..., description="Thumbnail URL")
    channel_id: Optional[str] = Field(default=None, description="YouTube channel ID")
    channel_title: str = Field(..., description="Channel name")
    category: Optional[str] = Field(default=None, description="Video category")
    published_at: Optional[datetime] = Field(default=None, description="Video publish timestamp")
    view_count: int = Field(default=0, ge=0, description="Total view count")
    like_count: int = Field(default=0, ge=0, description="Total like count")
    comment_count: int = Field(default=0, ge=0, description="Total comment count")
    engagement_rate: Optional[float] = Field(default=None, ge=0, description="Engagement rate percentage")
    viral_score: Optional[int] = Field(default=None, ge=0, le=100, description="Viral score 0-100")
    velocity: Optional[TrendVelocity] = Field(default=None, description="Trend velocity direction")
    insight: Optional[str] = Field(default=None, description="AI-generated insight about this video")
    duration_seconds: Optional[int] = Field(default=None, ge=0, description="Video duration in seconds")
    is_live: bool = Field(default=False, description="Whether video is a live stream")
    is_short: bool = Field(default=False, description="Whether video is a YouTube Short")
    tags: List[str] = Field(default_factory=list, description="Video tags/keywords")
    # New fields
    description: Optional[str] = Field(default=None, description="Video description (truncated)")
    default_audio_language: Optional[str] = Field(default=None, description="Default audio language code")
    has_captions: bool = Field(default=False, description="Whether video has captions")
    topic_categories: List[str] = Field(default_factory=list, description="YouTube topic categories")
    is_licensed: bool = Field(default=False, description="Whether video is Creative Commons licensed")
    is_made_for_kids: bool = Field(default=False, description="Whether video is made for kids")
    subscriber_count: Optional[int] = Field(default=None, ge=0, description="Channel subscriber count")


class YouTubeTrendingResponse(BaseModel):
    """Response for YouTube trending videos."""
    videos: List[YouTubeVideoResponse] = Field(default_factory=list, description="List of trending videos")
    category: str = Field(..., description="Category filter applied")
    region: str = Field(default="US", description="Region code")
    fetched_at: datetime = Field(..., description="When data was fetched")
    # Pagination
    total: Optional[int] = Field(default=None, description="Total results available")
    page: int = Field(default=1, ge=1, description="Current page number")
    per_page: int = Field(default=20, ge=1, le=50, description="Results per page")
    has_more: bool = Field(default=False, description="Whether more results exist")


class YouTubeGameTrendingRequest(BaseModel):
    """Request for game-specific YouTube trending."""
    game: Optional[str] = Field(default=None, description="Game filter (fortnite, warzone, etc.)")
    sort_by: Optional[str] = Field(default="views", description="Sort field: views, likes, engagement, date, duration")
    sort_order: Optional[str] = Field(default="desc", description="Sort order: asc or desc")
    duration_type: Optional[str] = Field(default="any", description="Duration filter: short (<1min), medium (1-20min), long (>20min), any")
    is_live: Optional[bool] = Field(default=None, description="Filter by live status")
    is_short: Optional[bool] = Field(default=None, description="Filter by YouTube Shorts")
    has_captions: Optional[bool] = Field(default=None, description="Filter by caption availability")
    min_views: Optional[int] = Field(default=None, ge=0, description="Minimum view count")
    max_views: Optional[int] = Field(default=None, ge=0, description="Maximum view count")
    min_engagement: Optional[float] = Field(default=None, ge=0, description="Minimum engagement rate")
    language: Optional[str] = Field(default=None, description="Filter by audio language code")
    page: int = Field(default=1, ge=1, description="Page number")
    per_page: int = Field(default=20, ge=1, le=50, description="Results per page")


class YouTubeGameTrendingResponse(BaseModel):
    """Response for game-specific YouTube trending."""
    videos: List[YouTubeVideoResponse] = Field(default_factory=list, description="List of videos")
    game: Optional[str] = Field(default=None, description="Game filter applied")
    game_display_name: Optional[str] = Field(default=None, description="Human-readable game name")
    sort_by: str = Field(default="views", description="Sort field used")
    sort_order: str = Field(default="desc", description="Sort order used")
    filters_applied: dict = Field(default_factory=dict, description="Active filters")
    total: int = Field(default=0, ge=0, description="Total results matching filters")
    page: int = Field(default=1, ge=1, description="Current page")
    per_page: int = Field(default=20, ge=1, le=50, description="Results per page")
    total_pages: int = Field(default=1, ge=1, description="Total pages available")
    has_more: bool = Field(default=False, description="Whether more results exist")
    fetched_at: datetime = Field(..., description="When data was fetched")


class AvailableGamesResponse(BaseModel):
    """Response listing available games for filtering."""
    games: List[dict] = Field(default_factory=list, description="List of available games with metadata")


class YouTubeSearchRequest(BaseModel):
    """Request to search YouTube videos."""
    query: str = Field(..., min_length=1, max_length=200, description="Search query string")
    category: Optional[TrendCategory] = Field(default=None, description="Category filter")
    max_results: int = Field(default=20, ge=1, le=50, description="Maximum results to return")


class YouTubeSearchResponse(BaseModel):
    """Response for YouTube search."""
    videos: List[YouTubeVideoResponse] = Field(default_factory=list, description="Search results")
    query: str = Field(..., description="Original search query")
    result_count: int = Field(..., ge=0, description="Number of results returned")
    rate_limit_remaining: Optional[int] = Field(default=None, ge=0, description="Remaining searches for today")


# ============================================================================
# Twitch Schemas
# ============================================================================

class TwitchStreamResponse(BaseModel):
    """Response schema for a Twitch stream."""
    user_id: str = Field(..., description="Twitch user ID")
    user_name: str = Field(..., description="Twitch username")
    game_id: str = Field(..., description="Game ID being streamed")
    game_name: str = Field(..., description="Game name being streamed")
    viewer_count: int = Field(..., ge=0, description="Current viewer count")
    peak_viewers: Optional[int] = Field(default=None, ge=0, description="Peak viewer count")
    thumbnail: str = Field(..., description="Stream thumbnail URL")
    title: str = Field(..., description="Stream title")
    started_at: Optional[datetime] = Field(default=None, description="Stream start timestamp")
    duration_minutes: Optional[int] = Field(default=None, ge=0, description="Stream duration in minutes")
    language: Optional[str] = Field(default=None, description="Stream language code")
    tags: List[str] = Field(default_factory=list, description="Stream tags/keywords")
    is_mature: bool = Field(default=False, description="Mature content flag")
    velocity: Optional[TrendVelocity] = Field(default=None, description="Viewer trend direction")
    insight: Optional[str] = Field(default=None, description="AI-generated insight about this stream")
    # New fields
    follower_count: Optional[int] = Field(default=None, ge=0, description="Channel follower count")
    broadcaster_type: Optional[str] = Field(default=None, description="partner, affiliate, or empty")
    profile_image_url: Optional[str] = Field(default=None, description="Streamer profile image URL")


class TwitchClipResponse(BaseModel):
    """Response schema for a Twitch clip."""
    id: str = Field(..., description="Clip ID")
    url: str = Field(..., description="Clip URL")
    embed_url: str = Field(..., description="Embed URL for clip")
    broadcaster_id: str = Field(..., description="Broadcaster user ID")
    broadcaster_name: str = Field(..., description="Broadcaster display name")
    creator_id: str = Field(..., description="Clip creator user ID")
    creator_name: str = Field(..., description="Clip creator display name")
    video_id: Optional[str] = Field(default=None, description="Source video ID")
    game_id: str = Field(..., description="Game ID")
    language: str = Field(..., description="Clip language")
    title: str = Field(..., description="Clip title")
    view_count: int = Field(default=0, ge=0, description="Clip view count")
    created_at: datetime = Field(..., description="When clip was created")
    thumbnail_url: str = Field(..., description="Clip thumbnail URL")
    duration: float = Field(..., ge=0, description="Clip duration in seconds")


class TwitchGameResponse(BaseModel):
    """Response schema for a Twitch game."""
    game_id: str = Field(..., description="Twitch game ID")
    name: str = Field(..., description="Game name")
    twitch_viewers: int = Field(default=0, ge=0, description="Total Twitch viewers")
    twitch_streams: int = Field(default=0, ge=0, description="Number of active streams")
    youtube_videos: Optional[int] = Field(default=None, ge=0, description="Related YouTube videos count")
    youtube_total_views: Optional[int] = Field(default=None, ge=0, description="Total YouTube views")
    trend: Optional[TrendVelocity] = Field(default=None, description="Game popularity trend")
    box_art_url: Optional[str] = Field(default=None, description="Game box art URL")
    top_tags: List[str] = Field(default_factory=list, description="Most common tags from top streams")
    avg_viewers_per_stream: Optional[int] = Field(default=None, ge=0, description="Average viewers per stream")
    top_languages: List[str] = Field(default_factory=list, description="Top stream languages")


class TwitchLiveResponse(BaseModel):
    """Response for Twitch live streams."""
    streams: List[TwitchStreamResponse] = Field(default_factory=list, description="List of live streams")
    total_viewers: int = Field(default=0, ge=0, description="Total viewers across all streams")
    fetched_at: datetime = Field(..., description="When data was fetched")


class TwitchClipsResponse(BaseModel):
    """Response for Twitch clips."""
    clips: List[TwitchClipResponse] = Field(default_factory=list, description="List of clips")
    game_id: Optional[str] = Field(default=None, description="Game ID filter applied")
    period: str = Field(default="day", description="Time period for clips")
    fetched_at: datetime = Field(..., description="When data was fetched")


class TwitchGamesResponse(BaseModel):
    """Response for Twitch top games."""
    games: List[TwitchGameResponse] = Field(default_factory=list, description="List of top games")
    fetched_at: datetime = Field(..., description="When data was fetched")


# ============================================================================
# Thumbnail Analysis Schemas
# ============================================================================

class FaceEmotion(BaseModel):
    """Face emotion detection result."""
    emotion: str = Field(..., description="Detected emotion name")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score 0-1")


class DominantColor(BaseModel):
    """Dominant color in thumbnail."""
    hex: str = Field(..., description="Hex color code")
    percentage: float = Field(..., ge=0, le=100, description="Percentage of image")


class ThumbnailAnalysisResponse(BaseModel):
    """Response for thumbnail analysis."""
    source_type: str = Field(..., description="Source platform: youtube or twitch")
    source_id: str = Field(..., description="Video or stream ID")
    thumbnail_url: str = Field(..., description="Analyzed thumbnail URL")
    has_face: bool = Field(default=False, description="Whether faces were detected")
    face_count: int = Field(default=0, ge=0, description="Number of faces detected")
    face_emotions: List[FaceEmotion] = Field(default_factory=list, description="Detected face emotions")
    has_text: bool = Field(default=False, description="Whether text was detected")
    detected_text: List[str] = Field(default_factory=list, description="OCR detected text")
    dominant_colors: List[DominantColor] = Field(default_factory=list, description="Dominant colors")
    color_mood: Optional[ColorMood] = Field(default=None, description="Overall color mood")
    composition: Optional[Composition] = Field(default=None, description="Image composition style")
    complexity_score: Optional[int] = Field(default=None, ge=1, le=10, description="Visual complexity 1-10")
    thumbnail_score: Optional[int] = Field(default=None, ge=0, le=100, description="Predicted CTR score 0-100")
    analyzed_at: Optional[datetime] = Field(default=None, description="When analysis was performed")


# ============================================================================
# Velocity Alert Schemas
# ============================================================================

class VelocityAlertResponse(BaseModel):
    """Response schema for a velocity alert."""
    id: str = Field(..., description="Alert ID")
    alert_type: AlertType = Field(..., description="Type of alert")
    platform: Literal["youtube", "twitch"] = Field(..., description="Source platform")
    subject_id: str = Field(..., description="ID of the spiking subject")
    subject_name: str = Field(..., description="Name of the spiking subject")
    subject_thumbnail: Optional[str] = Field(default=None, description="Thumbnail URL")
    current_value: int = Field(..., ge=0, description="Current viewers/views")
    previous_value: int = Field(..., ge=0, description="Previous viewers/views")
    change_percent: float = Field(..., description="Percentage change")
    velocity_score: float = Field(..., description="Rate of change score")
    severity: AlertSeverity = Field(..., description="Alert severity level")
    insight: Optional[str] = Field(default=None, description="AI-generated explanation")
    is_active: bool = Field(default=True, description="Whether alert is still active")
    detected_at: datetime = Field(..., description="When spike was detected")


class VelocityAlertsResponse(BaseModel):
    """Response for velocity alerts list."""
    alerts: List[VelocityAlertResponse] = Field(default_factory=list, description="List of alerts")
    total_active: int = Field(default=0, ge=0, description="Total active alerts count")


# ============================================================================
# Timing Schemas
# ============================================================================

class TimingRecommendationResponse(BaseModel):
    """Response for timing recommendation."""
    best_day: str = Field(..., description="Best day of week to post")
    best_hour: int = Field(..., ge=0, le=23, description="Best hour to post (0-23)")
    best_hour_local: str = Field(..., description="Best hour in local time format")
    timezone: str = Field(default="UTC", description="Timezone for recommendations")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score 0-1")
    data_points: int = Field(default=0, ge=0, description="Number of data points analyzed")


# ============================================================================
# Insight Schemas
# ============================================================================

class InsightResponse(BaseModel):
    """Response schema for an AI insight."""
    category: InsightCategory = Field(..., description="Insight category")
    insight: str = Field(..., description="AI-generated insight text")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score 0-1")
    data_points: int = Field(default=0, ge=0, description="Number of data points analyzed")


class TitlePatterns(BaseModel):
    """Title pattern analysis."""
    top_words: List[dict] = Field(default_factory=list, description="Top words with counts and avg views")
    avg_length: float = Field(default=0, ge=0, description="Average title length")
    number_usage: float = Field(default=0, ge=0, le=100, description="Percentage using numbers")
    emoji_usage: float = Field(default=0, ge=0, le=100, description="Percentage using emojis")
    question_usage: float = Field(default=0, ge=0, le=100, description="Percentage using questions")


class TrendingKeyword(BaseModel):
    """A trending keyword with usage stats."""
    keyword: str = Field(..., description="The keyword/phrase")
    count: int = Field(default=0, ge=0, description="Number of occurrences")
    avg_views: Optional[int] = Field(default=None, ge=0, description="Average views for content with this keyword")
    avg_engagement: Optional[float] = Field(default=None, ge=0, description="Average engagement rate")
    source: Literal["title", "tag", "topic", "description"] = Field(..., description="Where keyword was found")


class TrendingKeywordsResponse(BaseModel):
    """Trending keywords for content creation."""
    title_keywords: List[TrendingKeyword] = Field(default_factory=list, description="Keywords from video titles")
    tag_keywords: List[TrendingKeyword] = Field(default_factory=list, description="Keywords from video tags")
    topic_keywords: List[TrendingKeyword] = Field(default_factory=list, description="Keywords from topic categories")
    caption_keywords: List[TrendingKeyword] = Field(default_factory=list, description="Suggested caption keywords")
    hashtags: List[str] = Field(default_factory=list, description="Suggested hashtags")
    category: str = Field(..., description="Category these keywords are for")
    generated_at: datetime = Field(..., description="When keywords were generated")


class ThumbnailPatterns(BaseModel):
    """Thumbnail pattern analysis."""
    face_percentage: float = Field(default=0, ge=0, le=100, description="Percentage with faces")
    avg_color_count: float = Field(default=0, ge=0, description="Average dominant colors")
    text_usage: float = Field(default=0, ge=0, le=100, description="Percentage with text")
    avg_complexity: float = Field(default=0, ge=0, le=10, description="Average complexity score")


# ============================================================================
# Daily Brief Schemas
# ============================================================================

class ThumbnailOfDay(BaseModel):
    """Thumbnail of the day highlight."""
    video_id: str = Field(..., description="YouTube video ID")
    title: str = Field(..., description="Video title")
    thumbnail: str = Field(..., description="Thumbnail URL")
    channel_title: str = Field(..., description="Channel name")
    views: int = Field(..., ge=0, description="View count")
    viral_score: int = Field(..., ge=0, le=100, description="Viral score 0-100")
    why_it_works: str = Field(..., description="AI explanation of why this thumbnail works")


class MarketOpportunityData(BaseModel):
    """Market opportunity analysis for header badge."""
    level: Literal["high", "medium", "low"] = Field(..., description="Opportunity level")
    reason: str = Field(..., description="Why this level")
    active_streams: int = Field(..., ge=0, description="Active streams count")
    change_percent: float = Field(..., description="Change vs yesterday")
    primary_category: str = Field(..., description="Category this is for")


class DailyAssetsData(BaseModel):
    """Daily asset creation stats for header badge."""
    created_today: int = Field(..., ge=0, description="Assets created today")
    pending_review: int = Field(..., ge=0, description="Jobs still processing")


class DailyBriefResponse(BaseModel):
    """Response for daily brief."""
    brief_date: date = Field(..., description="Date of the brief")
    thumbnail_of_day: Optional[ThumbnailOfDay] = Field(default=None, description="Featured thumbnail")
    youtube_highlights: List[YouTubeVideoResponse] = Field(default_factory=list, description="Top YouTube videos")
    twitch_highlights: List[TwitchStreamResponse] = Field(default_factory=list, description="Top Twitch streams")
    hot_games: List[TwitchGameResponse] = Field(default_factory=list, description="Trending games")
    top_clips: List[TwitchClipResponse] = Field(default_factory=list, description="Top Twitch clips")
    insights: List[InsightResponse] = Field(default_factory=list, description="AI-generated insights")
    best_upload_times: Optional[TimingRecommendationResponse] = Field(default=None, description="Best upload times")
    best_stream_times: Optional[TimingRecommendationResponse] = Field(default=None, description="Best stream times")
    title_patterns: Optional[TitlePatterns] = Field(default=None, description="Title pattern analysis")
    thumbnail_patterns: Optional[ThumbnailPatterns] = Field(default=None, description="Thumbnail pattern analysis")
    trending_keywords: Optional[TrendingKeywordsResponse] = Field(default=None, description="Trending keywords for content")
    generated_at: Optional[datetime] = Field(default=None, description="When brief was generated")
    
    # NEW: Intel redesign header badge data
    market_opportunity: Optional[MarketOpportunityData] = Field(
        default=None,
        description="Market opportunity indicator for header badge"
    )
    daily_assets: Optional[DailyAssetsData] = Field(
        default=None,
        description="Daily asset creation stats for header badge"
    )


# ============================================================================
# History Schemas
# ============================================================================

class TrendHistoryResponse(BaseModel):
    """Response for trend history."""
    days: int = Field(..., ge=1, le=30, description="Number of days of history")
    youtube_snapshots: List[dict] = Field(default_factory=list, description="Historical YouTube snapshots")
    twitch_hourly: List[dict] = Field(default_factory=list, description="Historical Twitch hourly data")
    velocity_alerts: List[VelocityAlertResponse] = Field(default_factory=list, description="Historical alerts")


# ============================================================================
# Cross-Platform Schemas
# ============================================================================

class RisingCreator(BaseModel):
    """Rising creator across platforms."""
    creator_id: str = Field(..., description="Creator identifier")
    name: str = Field(..., description="Creator name")
    platform: Literal["youtube", "twitch", "both"] = Field(..., description="Primary platform")
    youtube_channel_id: Optional[str] = Field(default=None, description="YouTube channel ID")
    twitch_user_id: Optional[str] = Field(default=None, description="Twitch user ID")
    growth_rate: float = Field(..., description="Growth rate percentage")
    total_followers: int = Field(default=0, ge=0, description="Total followers across platforms")
    avatar_url: Optional[str] = Field(default=None, description="Creator avatar URL")


class CrossPlatformResponse(BaseModel):
    """Response for cross-platform correlation data."""
    hot_games: List[TwitchGameResponse] = Field(default_factory=list, description="Games trending on both platforms")
    rising_creators: List[RisingCreator] = Field(default_factory=list, description="Creators gaining momentum")
    message: Optional[str] = Field(default=None, description="Status message")
