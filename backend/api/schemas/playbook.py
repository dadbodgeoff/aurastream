"""
Pydantic schemas for Streamer Playbook - Algorithmic Masterclass.
Transforms trend data into actionable strategies for small streamers.
"""

from datetime import datetime, date
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


# ============================================================================
# Enums / Literal Types
# ============================================================================

StrategyPriority = Literal["critical", "high", "medium", "low"]
ContentType = Literal["stream", "video", "short", "clip"]
DifficultyLevel = Literal["beginner", "intermediate", "advanced"]
ImpactLevel = Literal["game_changer", "significant", "moderate", "incremental"]


# ============================================================================
# Opportunity Schemas
# ============================================================================

class GoldenHourWindow(BaseModel):
    """Optimal streaming/posting time window."""
    day: str = Field(..., description="Day of week")
    start_hour: int = Field(..., ge=0, le=23, description="Start hour (24h)")
    end_hour: int = Field(..., ge=0, le=23, description="End hour (24h)")
    timezone: str = Field(default="UTC", description="Timezone")
    competition_level: Literal["low", "medium", "high"] = Field(..., description="How many big streamers are on")
    viewer_availability: Literal["low", "medium", "high"] = Field(..., description="Potential audience size")
    opportunity_score: int = Field(..., ge=0, le=100, description="Overall opportunity score")
    reasoning: str = Field(..., description="Why this window is golden")


class WeeklyTimeSlot(BaseModel):
    """Single time slot in the weekly schedule heatmap."""
    hour: int = Field(..., ge=0, le=23, description="Hour of day (0-23)")
    score: int = Field(..., ge=0, le=100, description="Opportunity score 0-100")
    competition: Literal["low", "medium", "high"] = Field(default="medium")
    viewers: Literal["low", "medium", "high"] = Field(default="medium")


class WeeklySchedule(BaseModel):
    """Full 7-day weekly schedule with hourly opportunity scores."""
    monday: List[WeeklyTimeSlot] = Field(default_factory=list)
    tuesday: List[WeeklyTimeSlot] = Field(default_factory=list)
    wednesday: List[WeeklyTimeSlot] = Field(default_factory=list)
    thursday: List[WeeklyTimeSlot] = Field(default_factory=list)
    friday: List[WeeklyTimeSlot] = Field(default_factory=list)
    saturday: List[WeeklyTimeSlot] = Field(default_factory=list)
    sunday: List[WeeklyTimeSlot] = Field(default_factory=list)
    timezone: str = Field(default="UTC")
    best_slot: Optional[str] = Field(default=None, description="AI-recommended best slot summary")
    ai_insight: Optional[str] = Field(default=None, description="Gemini's analysis of the schedule")


class NicheOpportunity(BaseModel):
    """Underserved niche or game opportunity."""
    game_or_niche: str = Field(..., description="Game or content niche")
    current_viewers: int = Field(default=0, ge=0, description="Current total viewers")
    stream_count: int = Field(default=0, ge=0, description="Number of active streams")
    avg_viewers_per_stream: int = Field(default=0, ge=0, description="Average viewers per stream")
    saturation_score: int = Field(..., ge=0, le=100, description="How saturated (lower = better opportunity)")
    growth_potential: Literal["explosive", "high", "moderate", "stable"] = Field(...)
    why_now: str = Field(..., description="Why this is a good opportunity right now")
    suggested_angle: str = Field(..., description="Unique angle to stand out")
    thumbnail_url: Optional[str] = Field(default=None, description="Game box art or thumbnail")


class ViralHook(BaseModel):
    """Viral content hook or trend to ride."""
    hook_type: Literal["title", "thumbnail", "topic", "format", "hashtag"] = Field(...)
    hook: str = Field(..., description="The actual hook/trend")
    examples: List[str] = Field(default_factory=list, description="Example uses")
    virality_score: int = Field(..., ge=0, le=100, description="How viral this hook is")
    time_sensitivity: Literal["now", "today", "this_week", "evergreen"] = Field(...)
    usage_tip: str = Field(..., description="How to use this effectively")


# ============================================================================
# Strategy Schemas
# ============================================================================

class TitleFormula(BaseModel):
    """Proven title formula with fill-in-the-blank template."""
    formula: str = Field(..., description="The formula pattern")
    template: str = Field(..., description="Fill-in-the-blank template")
    example: str = Field(..., description="Real example from trending")
    avg_views: int = Field(default=0, ge=0, description="Average views for this pattern")
    best_for: List[str] = Field(default_factory=list, description="Best content types for this")


class ThumbnailRecipe(BaseModel):
    """Thumbnail design recipe based on what's working."""
    recipe_name: str = Field(..., description="Catchy name for this recipe")
    elements: List[str] = Field(default_factory=list, description="Required visual elements")
    color_palette: List[str] = Field(default_factory=list, description="Recommended hex colors")
    text_style: str = Field(..., description="Text styling recommendation")
    emotion: str = Field(..., description="Emotion to convey")
    example_url: Optional[str] = Field(default=None, description="Example thumbnail URL")
    success_rate: int = Field(..., ge=0, le=100, description="How often this works")


class VideoIdea(BaseModel):
    """AI-generated video idea based on trending content analysis."""
    idea_id: str = Field(..., description="Unique identifier")
    game_or_category: str = Field(..., description="Target game or category")
    title: str = Field(..., description="Recommended video/stream title")
    title_reasoning: str = Field(default="", description="Why this title works")
    hook: str = Field(..., description="Opening hook for first 30 seconds")
    description: str = Field(..., description="Brief content description")
    tags: List[str] = Field(default_factory=list, description="Recommended tags")
    tags_reasoning: str = Field(default="", description="Why these tags were chosen")
    thumbnail_concept: str = Field(..., description="Thumbnail design concept")
    thumbnail_text: str = Field(..., description="Text to put on thumbnail")
    thumbnail_colors: List[str] = Field(default_factory=list, description="Suggested colors")
    inspired_by: str = Field(..., description="Trending video this is inspired by")
    inspired_by_views: int = Field(default=0, description="Views of the inspiring video")
    why_this_works: str = Field(default="", description="Strategic reasoning for this idea")
    difficulty: DifficultyLevel = Field(default="beginner")
    estimated_length: str = Field(..., description="Recommended video length")


class ContentStrategy(BaseModel):
    """Specific content strategy recommendation."""
    strategy_id: str = Field(..., description="Unique strategy identifier")
    title: str = Field(..., description="Strategy title")
    description: str = Field(..., description="What to do")
    why_it_works: str = Field(..., description="The psychology/algorithm reason")
    difficulty: DifficultyLevel = Field(...)
    time_investment: str = Field(..., description="Time required (e.g., '2-3 hours')")
    expected_impact: ImpactLevel = Field(...)
    steps: List[str] = Field(default_factory=list, description="Step-by-step instructions")
    pro_tip: Optional[str] = Field(default=None, description="Advanced tip")
    tools_needed: List[str] = Field(default_factory=list, description="Tools or resources needed")


# ============================================================================
# Insight Cards
# ============================================================================

class InsightCard(BaseModel):
    """Single insight card for the playbook."""
    card_id: str = Field(..., description="Unique card identifier")
    card_type: Literal["stat", "tip", "warning", "opportunity", "trend", "quote"] = Field(...)
    icon: str = Field(..., description="Emoji icon for the card")
    headline: str = Field(..., description="Bold headline")
    body: str = Field(..., description="Card body text")
    metric: Optional[str] = Field(default=None, description="Key metric to highlight")
    metric_label: Optional[str] = Field(default=None, description="Label for the metric")
    action_text: Optional[str] = Field(default=None, description="CTA button text")
    action_link: Optional[str] = Field(default=None, description="CTA link")
    color_theme: Literal["purple", "blue", "green", "orange", "red", "cyan"] = Field(default="purple")


# ============================================================================
# Daily Playbook Response
# ============================================================================

class TodaysPlaybook(BaseModel):
    """The complete daily playbook for a streamer."""
    playbook_date: date = Field(..., description="Date of this playbook")
    generated_at: datetime = Field(..., description="When playbook was generated")
    
    # Hero Section
    headline: str = Field(..., description="Today's attention-grabbing headline")
    subheadline: str = Field(..., description="Supporting context")
    mood: Literal["bullish", "cautious", "opportunity", "competitive"] = Field(...)
    
    # Quick Stats
    total_twitch_viewers: int = Field(default=0, ge=0)
    total_youtube_gaming_views: int = Field(default=0, ge=0)
    trending_game: str = Field(default="", description="Top trending game right now")
    viral_video_count: int = Field(default=0, ge=0, description="Videos going viral today")
    
    # Golden Hours
    golden_hours: List[GoldenHourWindow] = Field(default_factory=list, description="Best times to stream/post")
    weekly_schedule: Optional[WeeklySchedule] = Field(default=None, description="Full weekly heatmap schedule")
    
    # Niche Opportunities
    niche_opportunities: List[NicheOpportunity] = Field(default_factory=list, description="Underserved niches")
    
    # Viral Hooks
    viral_hooks: List[ViralHook] = Field(default_factory=list, description="Trends to ride")
    
    # Title Formulas
    title_formulas: List[TitleFormula] = Field(default_factory=list, description="Proven title patterns")
    
    # Thumbnail Recipes
    thumbnail_recipes: List[ThumbnailRecipe] = Field(default_factory=list, description="Thumbnail designs that work")
    
    # Video Ideas (AI-generated from trending analysis)
    video_ideas: List[VideoIdea] = Field(default_factory=list, description="Ready-to-use video concepts")
    
    # Content Strategies
    strategies: List[ContentStrategy] = Field(default_factory=list, description="Actionable strategies")
    
    # Insight Cards
    insight_cards: List[InsightCard] = Field(default_factory=list, description="Quick insight cards")
    
    # Hashtags & Keywords
    trending_hashtags: List[str] = Field(default_factory=list, description="Hashtags to use today")
    title_keywords: List[str] = Field(default_factory=list, description="Keywords for titles")
    
    # Motivational
    daily_mantra: str = Field(default="", description="Motivational quote for the day")
    success_story: Optional[str] = Field(default=None, description="Small streamer success story")


class PlaybookSummary(BaseModel):
    """Lightweight summary for dashboard widgets."""
    playbook_date: date
    headline: str
    top_opportunity: str
    best_stream_time: str
    trending_game: str
    insight_count: int
    generated_at: datetime
