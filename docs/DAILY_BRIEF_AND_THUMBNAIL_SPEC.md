# 🎯 CREATOR INTEL: DAILY BRIEF & THUMBNAIL RECREATION SPEC
## Complete Implementation Specification

**Version:** 1.0.0  
**Date:** December 31, 2025  
**Status:** SPECIFICATION

---

## EXECUTIVE SUMMARY

Creator Intel consists of TWO distinct experiences:

1. **Daily Brief** - 90-second actionable intel refreshed at 6 AM user timezone
2. **Intel Dashboard** - Customizable panel exploration mode

The Daily Brief includes a **Thumbnail Recreation** feature that lets users instantly recreate winning thumbnails with their own face/branding using Nano Banana - no external tools required.

---

## PART 1: PAGE ARCHITECTURE

### URL Structure

```
/intel                    → Redirects to /intel/brief (default)
/intel/brief              → Daily Brief (90-second actionable intel)
/intel/dashboard          → Intel Dashboard (customizable panels)
/intel/thumbnail-studio   → Thumbnail Recreation (from brief CTA)
```

### Navigation

```
┌─────────────────────────────────────────────────────────────────┐
│  Creator Intel                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [ 📋 Daily Brief ]    [ 🎛️ Dashboard ]                         │
│       ▲ active                                                  │
│                                                                 │
│  Updated 2 hours ago • Next refresh: 6:00 AM                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## PART 2: DAILY BRIEF

### 2.1 Brief Structure

The Daily Brief is a single-scroll page with these sections IN ORDER:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. HEADER                                                      │
│     - Greeting with user name                                   │
│     - Date and last refresh time                                │
│     - "90-second intel" tagline                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  2. TODAY'S PLAY (Hero Section)                                 │
│     - THE recommendation (one game, one time)                   │
│     - Competition level with visual meter                       │
│     - Why this recommendation (1-2 sentences)                   │
│     - Confidence score                                          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  3. THUMBNAIL FORMULA (with Recreation CTA)                     │
│     - Top 3 winning thumbnails from user's categories           │
│     - AI analysis summary for each                              │
│     - [ 🎨 Recreate This ] button on each                       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  4. TITLE + TAGS                                                │
│     - 2 title options (copy button each)                        │
│     - Optimized tags (copy all button)                          │
│     - Suggested hashtags                                        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  5. CLIP OPPORTUNITIES                                          │
│     - Top 2-3 viral clips to react to                           │
│     - Why each is an opportunity                                │
│     - Link to clip                                              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  6. WHAT'S WORKING / NOT WORKING                                │
│     - 2 things working (with data)                              │
│     - 2 things to avoid (with data)                             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  7. VIDEO IDEAS                                                 │
│     - 3 specific video ideas                                    │
│     - Each with: title, format, opportunity score               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  8. ALERTS (if any)                                             │
│     - Time-sensitive opportunities                              │
│     - Upcoming events                                           │
│     - Category shifts                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Brief Refresh Schedule

- **Primary refresh:** 6:00 AM user's timezone daily
- **Secondary refreshes:** 12:00 PM, 4:00 PM, 8:00 PM (Pro+)
- **Manual refresh:** Available for Studio tier
- **Cache duration:** Until next scheduled refresh

### 2.3 Brief Data Sources

| Section | Data Sources |
|---------|--------------|
| Today's Play | Mission Generator + Competition Meter + Timing Recs |
| Thumbnail Formula | YouTube Trending → Thumbnail Intel Vision Analysis |
| Title + Tags | Trending Keywords Extractor + Title Patterns |
| Clip Opportunities | Twitch Clips API + Velocity Detector |
| Working/Not Working | YouTube Analytics Patterns + Engagement Data |
| Video Ideas | Cross-Platform Trends + User Activity History |
| Alerts | Velocity Alerts + Event Calendar + Category Shifts |


---

## PART 3: THUMBNAIL RECREATION SYSTEM

### 3.1 The Flow

```
USER JOURNEY:
─────────────

1. User opens Daily Brief at any time
   └─→ Sees "Thumbnail Formula" section with 3 winning thumbnails

2. Each thumbnail shows:
   ├─→ The actual thumbnail image
   ├─→ View count (e.g., "2.1M views")
   ├─→ Quick analysis (layout, colors, why it works)
   └─→ [ 🎨 Recreate This ] button

3. User clicks "Recreate This"
   └─→ Opens /intel/thumbnail-studio with that thumbnail pre-loaded

4. Thumbnail Studio shows:
   ├─→ LEFT: Reference thumbnail with full AI analysis
   ├─→ RIGHT: Generation preview area
   └─→ BOTTOM: User inputs (face upload, text, prompt)

5. User either:
   ├─→ Uploads their face photo, OR
   └─→ Selects from saved face photos (from brand kit)

6. User optionally customizes:
   ├─→ Custom text (replaces original text)
   ├─→ Brand colors (auto-pulled from brand kit)
   └─→ Additional instructions via chat

7. User clicks "Generate My Thumbnail"
   └─→ Nano Banana generates the recreation

8. Result appears:
   ├─→ Side-by-side comparison
   ├─→ [ Regenerate ] [ Download ] buttons
   └─→ Download is 1280x720 PNG, ready for YouTube

TOTAL TIME: ~60 seconds from click to download
```

### 3.2 Thumbnail Studio UI

```
┌─────────────────────────────────────────────────────────────────┐
│  🎨 Thumbnail Studio                              [ ✕ Close ]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────┐          │
│  │                      │    │                      │          │
│  │     REFERENCE        │    │    YOUR THUMBNAIL    │          │
│  │                      │    │                      │          │
│  │  [Winning thumbnail] │    │  [Generated result]  │          │
│  │                      │    │    or placeholder    │          │
│  │     2.1M views       │    │                      │          │
│  │                      │    │                      │          │
│  └──────────────────────┘    └──────────────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📊 WHY THIS WORKS                                        │  │
│  │                                                          │  │
│  │ Layout: Face on left (40%), text top-right               │  │
│  │ Colors: #FF4655 primary, #FFD700 accent                  │  │
│  │ Elements: Shocked expression, bold text, game background │  │
│  │ Text: "INSANE 1v5 CLUTCH" - action word + specific claim │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  📸 YOUR FACE                                                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                         │
│  │ + Upload│  │ [Saved  │  │ [Saved  │                         │
│  │  Photo  │  │  face 1]│  │  face 2]│                         │
│  └─────────┘  └─────────┘  └─────────┘                         │
│                                                                 │
│  ✏️ CUSTOM TEXT (optional)                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ MY BEST PLAY EVER                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│  Original: "INSANE 1v5 CLUTCH"                                  │
│                                                                 │
│  🎨 COLORS                                                      │
│  ○ Use reference colors    ● Use my brand colors               │
│    #FF4655 #FFD700           #9D4DFF #00D4FF (from brand kit)  │
│                                                                 │
│  💬 ADDITIONAL INSTRUCTIONS (optional)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Make the expression more surprised, add my logo bottom   │  │
│  │ right corner                                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│           [ 🚀 Generate My Thumbnail ]                          │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  After generation:                                              │
│  [ 🔄 Regenerate ]  [ ✏️ Edit Prompt ]  [ ⬇️ Download PNG ]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Technical Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                 THUMBNAIL RECREATION PIPELINE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DAILY 6 AM JOB (runs per user timezone)                        │
│  ════════════════════════════════════════                       │
│                                                                 │
│  1. Fetch top YouTube videos for user's subscribed categories   │
│  2. Download top 3 thumbnails per category                      │
│  3. Run Gemini Vision analysis on each thumbnail                │
│  4. Store analysis in daily_brief_thumbnails table              │
│  5. Cache brief data for user                                   │
│                                                                 │
│                                                                 │
│  ON "RECREATE THIS" CLICK                                       │
│  ════════════════════════                                       │
│                                                                 │
│  1. Load pre-analyzed thumbnail data (from 6 AM job)            │
│  2. Display in Thumbnail Studio                                 │
│  3. Wait for user inputs                                        │
│                                                                 │
│                                                                 │
│  ON "GENERATE" CLICK                                            │
│  ═══════════════════                                            │
│                                                                 │
│  Step 1: Prepare User Assets                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • If user uploaded face: Remove background              │   │
│  │ • If using saved face: Load from storage                │   │
│  │ • Validate image quality and dimensions                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  Step 2: Build Generation Prompt                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Combine:                                                │   │
│  │ • Reference analysis (layout, colors, elements)         │   │
│  │ • User's face image reference                           │   │
│  │ • Custom text (or original)                             │   │
│  │ • Brand colors (or reference colors)                    │   │
│  │ • Additional instructions                               │   │
│  │                                                         │   │
│  │ Output: Structured prompt for Nano Banana               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  Step 3: Generate with Nano Banana                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Send prompt + reference image + user face             │   │
│  │ • Use img2img with style transfer                       │   │
│  │ • Target output: 1280x720 (YouTube thumbnail)           │   │
│  │ • Apply text overlay if specified                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  Step 4: Post-Process                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Ensure exact 1280x720 dimensions                      │   │
│  │ • Apply text overlay (if Nano Banana didn't)            │   │
│  │ • Add logo/watermark if requested                       │   │
│  │ • Optimize for web (compress PNG)                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  Step 5: Return Result                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Store generated thumbnail                             │   │
│  │ • Return URL to frontend                                │   │
│  │ • Log recreation for history                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## PART 4: DATABASE SCHEMA

### 4.1 New Tables

```sql
-- ============================================================================
-- Table: daily_briefs
-- Stores generated daily briefs per user
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Brief date and timing
    brief_date DATE NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    user_timezone TEXT NOT NULL DEFAULT 'America/New_York',
    
    -- Today's Play section
    todays_play JSONB NOT NULL,
    -- Structure: {
    --   "recommendation": "Stream Valorant",
    --   "category_key": "valorant",
    --   "category_name": "Valorant",
    --   "time_window": "2-4 PM EST",
    --   "competition_level": "low",
    --   "competition_percent": 32,
    --   "confidence": 87,
    --   "reasoning": "New agent patch dropped, search volume +340%"
    -- }
    
    -- Thumbnail Formula section (top 3)
    thumbnail_formulas JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Structure: [{
    --   "video_id": "abc123",
    --   "thumbnail_url": "https://...",
    --   "title": "Video Title",
    --   "view_count": 2100000,
    --   "channel_title": "Channel Name",
    --   "analysis": {
    --     "layout_type": "face-left-text-right",
    --     "text_placement": "top-right",
    --     "focal_point": "character-face",
    --     "dominant_colors": ["#FF4655", "#FFD700"],
    --     "color_mood": "energetic",
    --     "has_face": true,
    --     "has_text": true,
    --     "text_content": "INSANE CLUTCH",
    --     "why_it_works": "High contrast, clear focal point...",
    --     "layout_recipe": "Place face on left third...",
    --     "color_recipe": "Use red as primary...",
    --     "difficulty": "easy"
    --   }
    -- }]
    
    -- Title + Tags section
    title_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Structure: [
    --   {"title": "The New Agent is ACTUALLY Broken...", "style": "curiosity"},
    --   {"title": "I Tried the New Valorant Agent for 24 Hours", "style": "challenge"}
    -- ]
    
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Structure: ["valorant", "new agent", "vyse", "valorant update", ...]
    
    hashtags JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Structure: ["#Valorant", "#ValorantClips", "#Gaming"]
    
    -- Clip Opportunities section
    clip_opportunities JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Structure: [{
    --   "clip_id": "xyz789",
    --   "clip_url": "https://clips.twitch.tv/...",
    --   "title": "TenZ insane 1v5 clutch",
    --   "broadcaster_name": "TenZ",
    --   "view_count": 2100000,
    --   "created_at": "2025-12-31T02:00:00Z",
    --   "thumbnail_url": "https://...",
    --   "opportunity_type": "react",
    --   "why": "Viral clip, perfect for reaction content"
    -- }]
    
    -- What's Working / Not Working section
    whats_working JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Structure: [
    --   {"item": "Reaction content", "data": "+45% engagement this week", "type": "format"},
    --   {"item": "'I tried X for 24 hours' format", "data": "3 of top 10 videos", "type": "format"}
    -- ]
    
    whats_not_working JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Structure: [
    --   {"item": "Tier lists", "data": "-23% CTR, oversaturated", "type": "format"},
    --   {"item": "Generic gameplay", "data": "No hook = low retention", "type": "content"}
    -- ]
    
    -- Video Ideas section
    video_ideas JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Structure: [{
    --   "title": "Rating Every New Agent Ability",
    --   "format": "tier-list-twist",
    --   "opportunity_score": 85,
    --   "reasoning": "High search volume, low competition"
    -- }]
    
    -- Alerts section
    alerts JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Structure: [{
    --   "type": "event",
    --   "severity": "high",
    --   "message": "Fortnite Chapter 6 announcement in 3 days",
    --   "action": "Prep reaction content"
    -- }]
    
    -- Metadata
    categories_used JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One brief per user per date
    UNIQUE(user_id, brief_date)
);

-- Indexes
CREATE INDEX idx_daily_briefs_user_date ON daily_briefs(user_id, brief_date DESC);
CREATE INDEX idx_daily_briefs_expires ON daily_briefs(expires_at);

-- RLS
ALTER TABLE daily_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own briefs"
ON daily_briefs FOR SELECT TO authenticated
USING (auth.uid() = user_id);


-- ============================================================================
-- Table: user_thumbnail_assets
-- Stores user's saved face photos and other thumbnail assets
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_thumbnail_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    asset_type TEXT NOT NULL CHECK (asset_type IN ('face', 'logo', 'watermark', 'overlay')),
    
    -- Original uploaded image
    original_url TEXT NOT NULL,
    
    -- Processed version (background removed for faces)
    processed_url TEXT,
    
    -- Metadata
    display_name TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_thumbnail_assets_user ON user_thumbnail_assets(user_id);
CREATE INDEX idx_user_thumbnail_assets_type ON user_thumbnail_assets(user_id, asset_type);

-- RLS
ALTER TABLE user_thumbnail_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own thumbnail assets"
ON user_thumbnail_assets FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- Table: thumbnail_recreations
-- Stores history of thumbnail recreations
-- ============================================================================
CREATE TABLE IF NOT EXISTS thumbnail_recreations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Reference thumbnail
    reference_thumbnail_url TEXT NOT NULL,
    reference_video_id TEXT,
    reference_analysis JSONB,
    
    -- User inputs
    user_face_asset_id UUID REFERENCES user_thumbnail_assets(id),
    custom_text TEXT,
    use_brand_colors BOOLEAN DEFAULT FALSE,
    additional_prompt TEXT,
    
    -- Generation
    generation_prompt TEXT,
    generation_params JSONB,
    
    -- Result
    generated_thumbnail_url TEXT,
    generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_thumbnail_recreations_user ON thumbnail_recreations(user_id, created_at DESC);

-- RLS
ALTER TABLE thumbnail_recreations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recreations"
ON thumbnail_recreations FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### 4.2 Updated Tables

```sql
-- Add to brand_kits table
ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS 
    thumbnail_face_asset_id UUID REFERENCES user_thumbnail_assets(id);
```

---

## PART 5: API ENDPOINTS

### 5.1 Daily Brief Endpoints

```python
# ============================================================================
# GET /api/v1/intel/brief
# Get user's current daily brief
# ============================================================================

class DailyBriefResponse(BaseModel):
    """Complete daily brief response."""
    
    # Metadata
    brief_date: str  # "2025-12-31"
    generated_at: str  # ISO datetime
    expires_at: str  # ISO datetime
    next_refresh: str  # ISO datetime
    
    # Today's Play
    todays_play: TodaysPlay
    
    # Thumbnail Formula (top 3)
    thumbnail_formulas: List[ThumbnailFormula]
    
    # Title + Tags
    title_suggestions: List[TitleSuggestion]
    tags: List[str]
    hashtags: List[str]
    
    # Clip Opportunities
    clip_opportunities: List[ClipOpportunity]
    
    # What's Working / Not Working
    whats_working: List[InsightItem]
    whats_not_working: List[InsightItem]
    
    # Video Ideas
    video_ideas: List[VideoIdea]
    
    # Alerts
    alerts: List[Alert]
    
    # User context
    categories_used: List[str]
    user_tier: str


class TodaysPlay(BaseModel):
    recommendation: str  # "Stream Valorant"
    category_key: str
    category_name: str
    time_window: str  # "2-4 PM EST"
    competition_level: Literal["low", "medium", "high"]
    competition_percent: int  # 32 = 32% below average
    confidence: int  # 0-100
    reasoning: str


class ThumbnailFormula(BaseModel):
    video_id: str
    thumbnail_url: str
    title: str
    view_count: int
    channel_title: str
    analysis: ThumbnailAnalysis


class ThumbnailAnalysis(BaseModel):
    layout_type: str
    text_placement: str
    focal_point: str
    dominant_colors: List[str]
    color_mood: str
    has_face: bool
    has_text: bool
    text_content: Optional[str]
    why_it_works: str
    layout_recipe: str  # Pro+ only
    color_recipe: str   # Pro+ only
    difficulty: str     # Pro+ only


class TitleSuggestion(BaseModel):
    title: str
    style: str  # "curiosity", "challenge", "controversy", etc.


class ClipOpportunity(BaseModel):
    clip_id: str
    clip_url: str
    title: str
    broadcaster_name: str
    view_count: int
    created_at: str
    thumbnail_url: str
    opportunity_type: str  # "react", "tutorial", "news"
    why: str


class InsightItem(BaseModel):
    item: str
    data: str
    type: str  # "format", "content", "timing"


class VideoIdea(BaseModel):
    title: str
    format: str
    opportunity_score: int  # 0-100
    reasoning: str


class Alert(BaseModel):
    type: str  # "event", "shift", "opportunity"
    severity: str  # "low", "medium", "high"
    message: str
    action: Optional[str]


# ============================================================================
# POST /api/v1/intel/brief/refresh
# Force refresh daily brief (Studio only)
# ============================================================================

class RefreshBriefResponse(BaseModel):
    success: bool
    brief: DailyBriefResponse
    message: str


# ============================================================================
# POST /api/v1/intel/brief/copy-tracking
# Track when user copies content from brief
# ============================================================================

class CopyTrackingRequest(BaseModel):
    item_type: Literal["title", "tags", "hashtags", "all"]
    item_value: str
```

### 5.2 Thumbnail Recreation Endpoints

```python
# ============================================================================
# GET /api/v1/thumbnails/assets
# Get user's saved thumbnail assets (faces, logos)
# ============================================================================

class ThumbnailAsset(BaseModel):
    id: str
    asset_type: Literal["face", "logo", "watermark", "overlay"]
    original_url: str
    processed_url: Optional[str]
    display_name: Optional[str]
    is_primary: bool
    created_at: str


class ThumbnailAssetsResponse(BaseModel):
    assets: List[ThumbnailAsset]
    faces: List[ThumbnailAsset]  # Filtered convenience
    logos: List[ThumbnailAsset]  # Filtered convenience


# ============================================================================
# POST /api/v1/thumbnails/assets
# Upload a new thumbnail asset
# ============================================================================

class UploadThumbnailAssetRequest(BaseModel):
    asset_type: Literal["face", "logo", "watermark", "overlay"]
    image_base64: str  # Base64 encoded image
    display_name: Optional[str]
    is_primary: bool = False


class UploadThumbnailAssetResponse(BaseModel):
    asset: ThumbnailAsset
    message: str


# ============================================================================
# DELETE /api/v1/thumbnails/assets/{asset_id}
# Delete a thumbnail asset
# ============================================================================


# ============================================================================
# POST /api/v1/thumbnails/recreate
# Generate a thumbnail recreation
# ============================================================================

class RecreateThumbnailRequest(BaseModel):
    # Reference thumbnail (from daily brief)
    reference_thumbnail_url: str
    reference_video_id: Optional[str]
    reference_analysis: Optional[ThumbnailAnalysis]  # Skip re-analysis if provided
    
    # User's face
    face_asset_id: Optional[str]  # Use saved asset
    face_image_base64: Optional[str]  # Or upload new
    
    # Customization
    custom_text: Optional[str]  # Replace original text
    use_brand_colors: bool = False  # Use brand kit colors
    brand_kit_id: Optional[str]
    additional_prompt: Optional[str]  # Extra instructions


class RecreateThumbnailResponse(BaseModel):
    recreation_id: str
    status: Literal["processing", "completed", "failed"]
    generated_thumbnail_url: Optional[str]
    download_url: Optional[str]  # Direct download link
    error_message: Optional[str]
    
    # For polling
    estimated_seconds: Optional[int]


# ============================================================================
# GET /api/v1/thumbnails/recreate/{recreation_id}
# Check status of thumbnail recreation
# ============================================================================

class RecreationStatusResponse(BaseModel):
    recreation_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    progress_percent: Optional[int]
    generated_thumbnail_url: Optional[str]
    download_url: Optional[str]
    error_message: Optional[str]


# ============================================================================
# GET /api/v1/thumbnails/recreations
# Get user's recreation history
# ============================================================================

class RecreationHistoryItem(BaseModel):
    id: str
    reference_thumbnail_url: str
    generated_thumbnail_url: Optional[str]
    custom_text: Optional[str]
    status: str
    created_at: str


class RecreationHistoryResponse(BaseModel):
    recreations: List[RecreationHistoryItem]
    total: int
```

---

## PART 6: BACKEND SERVICES

### 6.1 Daily Brief Generator Service

```python
# backend/services/intel/brief_generator.py

"""
Daily Brief Generator Service

Generates personalized daily briefs by synthesizing data from:
- YouTube Trending (thumbnails, titles, patterns)
- Twitch Live/Clips (competition, opportunities)
- Thumbnail Intel (visual analysis)
- Trending Keywords (tags, hashtags)
- Mission Generator (today's play)
- Velocity Detector (alerts)

Runs at 6 AM user timezone, with optional refreshes at 12 PM, 4 PM, 8 PM.
"""

import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import pytz

from backend.database.supabase_client import get_supabase_client
from backend.services.trends import get_youtube_collector, get_twitch_collector
from backend.services.thumbnail_intel import get_thumbnail_intel_service
from backend.services.intel.mission_generator import get_mission_generator
from backend.services.intel.tier_limits import get_tier_limits


class DailyBriefGenerator:
    """Generates personalized daily briefs."""
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self.youtube = get_youtube_collector()
        self.twitch = get_twitch_collector()
        self.thumbnail_intel = get_thumbnail_intel_service()
        self.mission_generator = get_mission_generator()
    
    async def generate_brief(
        self,
        user_id: str,
        user_tier: str,
        subscribed_categories: List[Dict[str, Any]],
        timezone: str = "America/New_York",
    ) -> Dict[str, Any]:
        """
        Generate a complete daily brief for a user.
        
        This is the main orchestration method that pulls from all data sources
        and synthesizes them into actionable intel.
        """
        
        if not subscribed_categories:
            return self._empty_brief(user_id, timezone)
        
        # Get tier limits
        limits = get_tier_limits(user_tier)
        
        # Gather all data in parallel
        results = await asyncio.gather(
            self._generate_todays_play(user_id, user_tier, subscribed_categories, timezone),
            self._get_thumbnail_formulas(subscribed_categories, limits),
            self._get_title_and_tags(subscribed_categories),
            self._get_clip_opportunities(subscribed_categories, limits),
            self._analyze_whats_working(subscribed_categories),
            self._generate_video_ideas(user_id, subscribed_categories, limits),
            self._get_alerts(subscribed_categories),
            return_exceptions=True
        )
        
        todays_play, thumbnails, title_tags, clips, working, ideas, alerts = results
        
        # Handle any errors gracefully
        if isinstance(todays_play, Exception):
            todays_play = self._default_todays_play(subscribed_categories[0])
        
        # Build brief
        now = datetime.now(pytz.timezone(timezone))
        brief = {
            "user_id": user_id,
            "brief_date": now.strftime("%Y-%m-%d"),
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "expires_at": self._get_next_refresh(timezone).isoformat() + "Z",
            "user_timezone": timezone,
            "todays_play": todays_play,
            "thumbnail_formulas": thumbnails if not isinstance(thumbnails, Exception) else [],
            "title_suggestions": title_tags.get("titles", []) if not isinstance(title_tags, Exception) else [],
            "tags": title_tags.get("tags", []) if not isinstance(title_tags, Exception) else [],
            "hashtags": title_tags.get("hashtags", []) if not isinstance(title_tags, Exception) else [],
            "clip_opportunities": clips if not isinstance(clips, Exception) else [],
            "whats_working": working.get("working", []) if not isinstance(working, Exception) else [],
            "whats_not_working": working.get("not_working", []) if not isinstance(working, Exception) else [],
            "video_ideas": ideas if not isinstance(ideas, Exception) else [],
            "alerts": alerts if not isinstance(alerts, Exception) else [],
            "categories_used": [c["key"] for c in subscribed_categories],
        }
        
        # Store brief
        await self._store_brief(brief)
        
        return brief
    
    async def _generate_todays_play(
        self,
        user_id: str,
        user_tier: str,
        categories: List[Dict],
        timezone: str,
    ) -> Dict[str, Any]:
        """Generate the Today's Play recommendation."""
        
        mission = await self.mission_generator.generate_mission(
            user_id=user_id,
            user_tier=user_tier,
            subscribed_categories=categories,
            timezone=timezone,
        )
        
        if not mission:
            return self._default_todays_play(categories[0])
        
        # Get competition data
        competition = await self._get_competition_level(mission["category"])
        
        return {
            "recommendation": mission["recommendation"],
            "category_key": mission["category"],
            "category_name": mission["category_name"],
            "time_window": self._get_optimal_time_window(timezone),
            "competition_level": competition["level"],
            "competition_percent": competition["percent_below_avg"],
            "confidence": mission["confidence"],
            "reasoning": mission["reasoning"],
        }
    
    async def _get_thumbnail_formulas(
        self,
        categories: List[Dict],
        limits: Dict,
    ) -> List[Dict[str, Any]]:
        """Get top 3 winning thumbnails with analysis."""
        
        thumbnails = []
        
        for category in categories[:3]:  # Max 3 categories
            youtube_query = category.get("youtube_query") or category.get("name")
            
            # Fetch trending videos
            videos = await self.youtube.fetch_trending(
                query=youtube_query,
                max_results=5,
            )
            
            if not videos:
                continue
            
            # Get top video by views
            top_video = max(videos, key=lambda v: v.get("view_count", 0))
            
            # Analyze thumbnail
            analysis = await self.thumbnail_intel.analyze_single_thumbnail(
                thumbnail_url=top_video["thumbnail"],
                video_id=top_video["video_id"],
            )
            
            # Filter analysis based on tier
            if not limits.get("thumbnail_recipes"):
                analysis.pop("layout_recipe", None)
                analysis.pop("color_recipe", None)
                analysis.pop("difficulty", None)
            
            thumbnails.append({
                "video_id": top_video["video_id"],
                "thumbnail_url": top_video["thumbnail"],
                "title": top_video["title"],
                "view_count": top_video["view_count"],
                "channel_title": top_video["channel_title"],
                "analysis": analysis,
            })
        
        return thumbnails[:3]  # Ensure max 3
    
    async def _get_title_and_tags(
        self,
        categories: List[Dict],
    ) -> Dict[str, Any]:
        """Generate title suggestions and tags."""
        
        # Get trending keywords
        all_keywords = []
        for category in categories[:3]:
            keywords = await self._extract_keywords_for_category(category)
            all_keywords.extend(keywords)
        
        # Generate title suggestions
        titles = self._generate_title_suggestions(categories[0], all_keywords)
        
        # Compile tags
        tags = list(set([kw["keyword"] for kw in all_keywords[:20]]))
        
        # Generate hashtags
        hashtags = self._generate_hashtags(categories, all_keywords)
        
        return {
            "titles": titles,
            "tags": tags,
            "hashtags": hashtags,
        }
    
    async def _get_clip_opportunities(
        self,
        categories: List[Dict],
        limits: Dict,
    ) -> List[Dict[str, Any]]:
        """Get viral clip opportunities."""
        
        max_clips = 5 if limits.get("velocity_alerts") else 2
        clips = []
        
        for category in categories[:2]:
            twitch_id = category.get("twitch_id")
            if not twitch_id:
                continue
            
            category_clips = await self.twitch.fetch_clips(
                game_id=twitch_id,
                period="day",
                limit=3,
            )
            
            for clip in category_clips:
                clips.append({
                    "clip_id": clip["id"],
                    "clip_url": clip["url"],
                    "title": clip["title"],
                    "broadcaster_name": clip["broadcaster_name"],
                    "view_count": clip["view_count"],
                    "created_at": clip["created_at"],
                    "thumbnail_url": clip["thumbnail_url"],
                    "opportunity_type": self._classify_clip_opportunity(clip),
                    "why": self._explain_clip_opportunity(clip),
                })
        
        # Sort by view count and return top N
        clips.sort(key=lambda c: c["view_count"], reverse=True)
        return clips[:max_clips]
    
    async def _analyze_whats_working(
        self,
        categories: List[Dict],
    ) -> Dict[str, List[Dict]]:
        """Analyze what's working and not working."""
        
        # This would analyze patterns from recent successful/unsuccessful content
        # For now, return curated insights based on category trends
        
        working = [
            {"item": "Reaction content", "data": "+45% engagement this week", "type": "format"},
            {"item": "'I tried X for 24 hours' format", "data": "3 of top 10 videos", "type": "format"},
        ]
        
        not_working = [
            {"item": "Tier lists", "data": "-23% CTR, oversaturated", "type": "format"},
            {"item": "Generic gameplay (no hook)", "data": "Low retention", "type": "content"},
        ]
        
        return {"working": working, "not_working": not_working}
    
    async def _generate_video_ideas(
        self,
        user_id: str,
        categories: List[Dict],
        limits: Dict,
    ) -> List[Dict[str, Any]]:
        """Generate personalized video ideas."""
        
        ideas = []
        
        for category in categories[:2]:
            # Get trending topics
            trending = await self._get_trending_topics(category)
            
            for topic in trending[:2]:
                ideas.append({
                    "title": self._generate_idea_title(category, topic),
                    "format": topic.get("format", "standard"),
                    "opportunity_score": topic.get("score", 70),
                    "reasoning": topic.get("reasoning", "Trending topic with low competition"),
                })
        
        # Sort by opportunity score
        ideas.sort(key=lambda i: i["opportunity_score"], reverse=True)
        return ideas[:3]
    
    async def _get_alerts(
        self,
        categories: List[Dict],
    ) -> List[Dict[str, Any]]:
        """Get time-sensitive alerts."""
        
        alerts = []
        
        # Check for velocity spikes
        # Check for upcoming events
        # Check for category shifts
        
        # For now, return empty or mock alerts
        return alerts
    
    def _get_next_refresh(self, timezone: str) -> datetime:
        """Calculate next refresh time."""
        tz = pytz.timezone(timezone)
        now = datetime.now(tz)
        
        # Refresh times: 6 AM, 12 PM, 4 PM, 8 PM
        refresh_hours = [6, 12, 16, 20]
        
        for hour in refresh_hours:
            refresh_time = now.replace(hour=hour, minute=0, second=0, microsecond=0)
            if refresh_time > now:
                return refresh_time
        
        # Next day 6 AM
        tomorrow = now + timedelta(days=1)
        return tomorrow.replace(hour=6, minute=0, second=0, microsecond=0)
    
    async def _store_brief(self, brief: Dict[str, Any]) -> None:
        """Store brief in database."""
        self.supabase.table("daily_briefs").upsert(
            brief,
            on_conflict="user_id,brief_date"
        ).execute()
    
    def _empty_brief(self, user_id: str, timezone: str) -> Dict[str, Any]:
        """Return empty brief structure."""
        return {
            "user_id": user_id,
            "brief_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "expires_at": self._get_next_refresh(timezone).isoformat() + "Z",
            "todays_play": None,
            "thumbnail_formulas": [],
            "title_suggestions": [],
            "tags": [],
            "hashtags": [],
            "clip_opportunities": [],
            "whats_working": [],
            "whats_not_working": [],
            "video_ideas": [],
            "alerts": [],
            "categories_used": [],
        }


# Singleton
_generator: Optional[DailyBriefGenerator] = None

def get_brief_generator() -> DailyBriefGenerator:
    global _generator
    if _generator is None:
        _generator = DailyBriefGenerator()
    return _generator
```

### 6.2 Thumbnail Recreation Service

```python
# backend/services/intel/thumbnail_recreation_service.py

"""
Thumbnail Recreation Service

Handles the full pipeline of recreating a winning thumbnail:
1. Analyze reference thumbnail (if not pre-analyzed)
2. Process user's face image (background removal)
3. Build generation prompt
4. Generate with Nano Banana
5. Post-process and deliver

All processing happens server-side - no external tools needed.
"""

import asyncio
import base64
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import uuid4

from backend.database.supabase_client import get_supabase_client
from backend.services.storage_service import get_storage_service
from backend.services.nano_banana_client import get_nano_banana_client
from backend.services.thumbnail_intel import get_vision_analyzer


class ThumbnailRecreationService:
    """Handles thumbnail recreation workflow."""
    
    # YouTube thumbnail dimensions
    OUTPUT_WIDTH = 1280
    OUTPUT_HEIGHT = 720
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self.storage = get_storage_service()
        self.nano_banana = get_nano_banana_client()
        self.vision = get_vision_analyzer()
    
    async def recreate_thumbnail(
        self,
        user_id: str,
        reference_thumbnail_url: str,
        reference_video_id: Optional[str] = None,
        reference_analysis: Optional[Dict] = None,
        face_asset_id: Optional[str] = None,
        face_image_base64: Optional[str] = None,
        custom_text: Optional[str] = None,
        use_brand_colors: bool = False,
        brand_kit_id: Optional[str] = None,
        additional_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Recreate a thumbnail with user's face/branding.
        
        Returns immediately with recreation_id for polling.
        """
        
        # Create recreation record
        recreation_id = str(uuid4())
        
        recreation = {
            "id": recreation_id,
            "user_id": user_id,
            "reference_thumbnail_url": reference_thumbnail_url,
            "reference_video_id": reference_video_id,
            "reference_analysis": reference_analysis,
            "custom_text": custom_text,
            "use_brand_colors": use_brand_colors,
            "additional_prompt": additional_prompt,
            "generation_status": "pending",
            "created_at": datetime.utcnow().isoformat() + "Z",
        }
        
        if face_asset_id:
            recreation["user_face_asset_id"] = face_asset_id
        
        self.supabase.table("thumbnail_recreations").insert(recreation).execute()
        
        # Start async generation
        asyncio.create_task(self._process_recreation(
            recreation_id=recreation_id,
            user_id=user_id,
            reference_thumbnail_url=reference_thumbnail_url,
            reference_analysis=reference_analysis,
            face_asset_id=face_asset_id,
            face_image_base64=face_image_base64,
            custom_text=custom_text,
            use_brand_colors=use_brand_colors,
            brand_kit_id=brand_kit_id,
            additional_prompt=additional_prompt,
        ))
        
        return {
            "recreation_id": recreation_id,
            "status": "processing",
            "estimated_seconds": 30,
        }
    
    async def _process_recreation(
        self,
        recreation_id: str,
        user_id: str,
        reference_thumbnail_url: str,
        reference_analysis: Optional[Dict],
        face_asset_id: Optional[str],
        face_image_base64: Optional[str],
        custom_text: Optional[str],
        use_brand_colors: bool,
        brand_kit_id: Optional[str],
        additional_prompt: Optional[str],
    ) -> None:
        """Process the thumbnail recreation asynchronously."""
        
        try:
            # Update status
            self._update_status(recreation_id, "processing")
            
            # Step 1: Get or generate analysis
            if not reference_analysis:
                reference_analysis = await self._analyze_reference(reference_thumbnail_url)
            
            # Step 2: Prepare user's face
            face_url = None
            if face_asset_id:
                face_url = await self._get_face_asset(face_asset_id)
            elif face_image_base64:
                face_url = await self._process_face_upload(user_id, face_image_base64)
            
            # Step 3: Get brand colors if requested
            brand_colors = None
            if use_brand_colors and brand_kit_id:
                brand_colors = await self._get_brand_colors(brand_kit_id)
            
            # Step 4: Build generation prompt
            prompt = self._build_generation_prompt(
                analysis=reference_analysis,
                custom_text=custom_text,
                brand_colors=brand_colors,
                additional_prompt=additional_prompt,
            )
            
            # Step 5: Generate with Nano Banana
            generated_image = await self._generate_thumbnail(
                prompt=prompt,
                reference_url=reference_thumbnail_url,
                face_url=face_url,
            )
            
            # Step 6: Post-process
            final_image = await self._post_process(generated_image, custom_text)
            
            # Step 7: Upload to storage
            thumbnail_url = await self._upload_result(user_id, recreation_id, final_image)
            
            # Step 8: Update record
            self.supabase.table("thumbnail_recreations").update({
                "generation_status": "completed",
                "generated_thumbnail_url": thumbnail_url,
                "generation_prompt": prompt,
                "completed_at": datetime.utcnow().isoformat() + "Z",
            }).eq("id", recreation_id).execute()
            
        except Exception as e:
            self.supabase.table("thumbnail_recreations").update({
                "generation_status": "failed",
                "error_message": str(e),
            }).eq("id", recreation_id).execute()
    
    async def _analyze_reference(self, thumbnail_url: str) -> Dict[str, Any]:
        """Analyze reference thumbnail with Gemini Vision."""
        
        # Download thumbnail
        image_bytes = await self._download_image(thumbnail_url)
        
        # Analyze with vision
        analysis = await self.vision.analyze_thumbnail_bytes(image_bytes)
        
        return analysis
    
    async def _get_face_asset(self, asset_id: str) -> str:
        """Get processed face URL from saved assets."""
        
        result = self.supabase.table("user_thumbnail_assets").select(
            "processed_url, original_url"
        ).eq("id", asset_id).single().execute()
        
        return result.data.get("processed_url") or result.data.get("original_url")
    
    async def _process_face_upload(self, user_id: str, image_base64: str) -> str:
        """Process uploaded face image (remove background)."""
        
        # Decode base64
        image_bytes = base64.b64decode(image_base64)
        
        # Remove background using AI service
        processed_bytes = await self._remove_background(image_bytes)
        
        # Upload to storage
        filename = f"faces/{user_id}/{uuid4()}.png"
        url = await self.storage.upload_bytes(processed_bytes, filename, "image/png")
        
        return url
    
    async def _remove_background(self, image_bytes: bytes) -> bytes:
        """Remove background from face image."""
        
        # Use rembg or similar service
        # For now, return original (implement with actual service)
        return image_bytes
    
    async def _get_brand_colors(self, brand_kit_id: str) -> Dict[str, Any]:
        """Get brand colors from brand kit."""
        
        result = self.supabase.table("brand_kits").select(
            "primary_colors, accent_colors"
        ).eq("id", brand_kit_id).single().execute()
        
        return {
            "primary": result.data.get("primary_colors", [])[0] if result.data.get("primary_colors") else None,
            "accent": result.data.get("accent_colors", [])[0] if result.data.get("accent_colors") else None,
        }
    
    def _build_generation_prompt(
        self,
        analysis: Dict[str, Any],
        custom_text: Optional[str],
        brand_colors: Optional[Dict],
        additional_prompt: Optional[str],
    ) -> str:
        """Build the Nano Banana generation prompt."""
        
        # Extract analysis details
        layout = analysis.get("layout_type", "centered")
        colors = analysis.get("dominant_colors", [])
        mood = analysis.get("color_mood", "energetic")
        text_placement = analysis.get("text_placement", "top-right")
        focal_point = analysis.get("focal_point", "face")
        
        # Override colors if brand colors provided
        if brand_colors:
            if brand_colors.get("primary"):
                colors = [brand_colors["primary"]] + colors[1:]
            if brand_colors.get("accent"):
                colors = colors[:1] + [brand_colors["accent"]] + colors[2:]
        
        # Build prompt
        prompt = f"""Create a YouTube gaming thumbnail with these EXACT specifications:

LAYOUT:
- Layout style: {layout}
- Focal point: {focal_point}
- Text position: {text_placement}

STYLE:
- Color mood: {mood}
- Dominant colors: {', '.join(colors[:3])}
- Professional gaming thumbnail aesthetic
- High contrast, vibrant, eye-catching

DIMENSIONS:
- Exactly 1280x720 pixels (16:9 YouTube thumbnail)

"""
        
        if custom_text:
            prompt += f"""TEXT:
- Display text: "{custom_text}"
- Bold, chunky font with outline
- Position: {text_placement}
- High visibility against background

"""
        
        if additional_prompt:
            prompt += f"""ADDITIONAL INSTRUCTIONS:
{additional_prompt}

"""
        
        prompt += """The result should look like a professional, high-CTR YouTube gaming thumbnail."""
        
        return prompt
    
    async def _generate_thumbnail(
        self,
        prompt: str,
        reference_url: str,
        face_url: Optional[str],
    ) -> bytes:
        """Generate thumbnail with Nano Banana."""
        
        # Build generation request
        request = {
            "prompt": prompt,
            "width": self.OUTPUT_WIDTH,
            "height": self.OUTPUT_HEIGHT,
            "style_reference_url": reference_url,
        }
        
        if face_url:
            request["face_reference_url"] = face_url
        
        # Call Nano Banana
        result = await self.nano_banana.generate_image(request)
        
        return result["image_bytes"]
    
    async def _post_process(
        self,
        image_bytes: bytes,
        custom_text: Optional[str],
    ) -> bytes:
        """Post-process generated thumbnail."""
        
        # Ensure exact dimensions
        # Add text overlay if needed (backup if Nano Banana didn't)
        # Optimize for web
        
        return image_bytes
    
    async def _upload_result(
        self,
        user_id: str,
        recreation_id: str,
        image_bytes: bytes,
    ) -> str:
        """Upload final thumbnail to storage."""
        
        filename = f"thumbnails/{user_id}/{recreation_id}.png"
        url = await self.storage.upload_bytes(image_bytes, filename, "image/png")
        
        return url
    
    def _update_status(self, recreation_id: str, status: str) -> None:
        """Update recreation status."""
        self.supabase.table("thumbnail_recreations").update({
            "generation_status": status,
        }).eq("id", recreation_id).execute()
    
    async def _download_image(self, url: str) -> bytes:
        """Download image from URL."""
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            return response.content
    
    async def get_recreation_status(self, recreation_id: str) -> Dict[str, Any]:
        """Get current status of a recreation."""
        
        result = self.supabase.table("thumbnail_recreations").select("*").eq(
            "id", recreation_id
        ).single().execute()
        
        data = result.data
        
        return {
            "recreation_id": data["id"],
            "status": data["generation_status"],
            "generated_thumbnail_url": data.get("generated_thumbnail_url"),
            "download_url": data.get("generated_thumbnail_url"),  # Same for now
            "error_message": data.get("error_message"),
        }


# Singleton
_service: Optional[ThumbnailRecreationService] = None

def get_thumbnail_recreation_service() -> ThumbnailRecreationService:
    global _service
    if _service is None:
        _service = ThumbnailRecreationService()
    return _service
```

---

## PART 7: FRONTEND IMPLEMENTATION

### 7.1 Page Structure

```
tsx/apps/web/src/app/intel/
├── page.tsx                    # Redirects to /intel/brief
├── layout.tsx                  # Shared layout with tab navigation
├── brief/
│   └── page.tsx               # Daily Brief page
├── dashboard/
│   └── page.tsx               # Intel Dashboard (existing panels)
└── thumbnail-studio/
    └── page.tsx               # Thumbnail Recreation studio
```

### 7.2 Daily Brief Page Component

```typescript
// tsx/apps/web/src/app/intel/brief/page.tsx

'use client';

import { useDailyBrief } from '@aurastream/api-client/src/hooks/useIntel';
import { useAuth } from '@aurastream/api-client/src/hooks/useAuth';
import { BriefHeader } from '@/components/intel/brief/BriefHeader';
import { TodaysPlayCard } from '@/components/intel/brief/TodaysPlayCard';
import { ThumbnailFormulaSection } from '@/components/intel/brief/ThumbnailFormulaSection';
import { TitleTagsSection } from '@/components/intel/brief/TitleTagsSection';
import { ClipOpportunitiesSection } from '@/components/intel/brief/ClipOpportunitiesSection';
import { WorkingNotWorkingSection } from '@/components/intel/brief/WorkingNotWorkingSection';
import { VideoIdeasSection } from '@/components/intel/brief/VideoIdeasSection';
import { AlertsSection } from '@/components/intel/brief/AlertsSection';
import { BriefSkeleton } from '@/components/intel/brief/BriefSkeleton';
import { BriefEmptyState } from '@/components/intel/brief/BriefEmptyState';

export default function DailyBriefPage() {
  const { user } = useAuth();
  const { data: brief, isLoading, error } = useDailyBrief();
  
  if (isLoading) {
    return <BriefSkeleton />;
  }
  
  if (!brief || brief.categories_used.length === 0) {
    return <BriefEmptyState />;
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <BriefHeader
        userName={user?.displayName}
        briefDate={brief.brief_date}
        generatedAt={brief.generated_at}
        expiresAt={brief.expires_at}
      />
      
      {/* Today's Play - Hero Section */}
      {brief.todays_play && (
        <TodaysPlayCard play={brief.todays_play} />
      )}
      
      {/* Thumbnail Formula */}
      <ThumbnailFormulaSection
        thumbnails={brief.thumbnail_formulas}
        userTier={user?.subscriptionTier || 'free'}
      />
      
      {/* Title + Tags */}
      <TitleTagsSection
        titles={brief.title_suggestions}
        tags={brief.tags}
        hashtags={brief.hashtags}
      />
      
      {/* Clip Opportunities */}
      {brief.clip_opportunities.length > 0 && (
        <ClipOpportunitiesSection clips={brief.clip_opportunities} />
      )}
      
      {/* What's Working / Not Working */}
      <WorkingNotWorkingSection
        working={brief.whats_working}
        notWorking={brief.whats_not_working}
      />
      
      {/* Video Ideas */}
      <VideoIdeasSection ideas={brief.video_ideas} />
      
      {/* Alerts */}
      {brief.alerts.length > 0 && (
        <AlertsSection alerts={brief.alerts} />
      )}
    </div>
  );
}
```

### 7.3 Thumbnail Formula Section Component

```typescript
// tsx/apps/web/src/components/intel/brief/ThumbnailFormulaSection.tsx

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { ThumbnailFormula } from '@aurastream/api-client/src/types/intel';

interface Props {
  thumbnails: ThumbnailFormula[];
  userTier: 'free' | 'pro' | 'studio';
}

export function ThumbnailFormulaSection({ thumbnails, userTier }: Props) {
  const router = useRouter();
  
  const handleRecreate = (thumbnail: ThumbnailFormula) => {
    // Store thumbnail data in session storage for the studio
    sessionStorage.setItem('recreate_thumbnail', JSON.stringify(thumbnail));
    router.push('/intel/thumbnail-studio');
  };
  
  if (thumbnails.length === 0) {
    return null;
  }
  
  return (
    <section className="bg-zinc-900 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🖼️</span>
        <h2 className="text-xl font-semibold text-white">Thumbnail Formula</h2>
      </div>
      
      <p className="text-zinc-400 text-sm mb-6">
        Today's winning thumbnails in your categories. Click to recreate with your face.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {thumbnails.map((thumb, index) => (
          <div
            key={thumb.video_id}
            className="bg-zinc-800 rounded-lg overflow-hidden group"
          >
            {/* Thumbnail Image */}
            <div className="relative aspect-video">
              <Image
                src={thumb.thumbnail_url}
                alt={thumb.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => handleRecreate(thumb)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                >
                  <span>🎨</span>
                  Recreate This
                </button>
              </div>
              
              {/* View count badge */}
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white">
                {formatViews(thumb.view_count)} views
              </div>
            </div>
            
            {/* Analysis Summary */}
            <div className="p-3 space-y-2">
              <p className="text-white text-sm font-medium line-clamp-2">
                {thumb.title}
              </p>
              
              <div className="flex flex-wrap gap-1">
                {thumb.analysis.has_face && (
                  <span className="bg-zinc-700 text-zinc-300 text-xs px-2 py-0.5 rounded">
                    Face
                  </span>
                )}
                {thumb.analysis.has_text && (
                  <span className="bg-zinc-700 text-zinc-300 text-xs px-2 py-0.5 rounded">
                    Text
                  </span>
                )}
                <span className="bg-zinc-700 text-zinc-300 text-xs px-2 py-0.5 rounded">
                  {thumb.analysis.color_mood}
                </span>
              </div>
              
              {/* Color palette */}
              <div className="flex gap-1">
                {thumb.analysis.dominant_colors.slice(0, 4).map((color, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              
              {/* Why it works (Pro+ only) */}
              {userTier !== 'free' && thumb.analysis.why_it_works && (
                <p className="text-zinc-400 text-xs mt-2">
                  💡 {thumb.analysis.why_it_works}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatViews(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(0)}K`;
  }
  return count.toString();
}
```

### 7.4 Thumbnail Studio Page

```typescript
// tsx/apps/web/src/app/intel/thumbnail-studio/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  useThumbnailAssets, 
  useUploadThumbnailAsset,
  useRecreateThumbnail,
  useRecreationStatus,
} from '@aurastream/api-client/src/hooks/useThumbnails';
import { useActiveBrandKit } from '@aurastream/api-client/src/hooks/useBrandKits';
import type { ThumbnailFormula } from '@aurastream/api-client/src/types/intel';

export default function ThumbnailStudioPage() {
  const router = useRouter();
  
  // Load reference thumbnail from session storage
  const [reference, setReference] = useState<ThumbnailFormula | null>(null);
  
  useEffect(() => {
    const stored = sessionStorage.getItem('recreate_thumbnail');
    if (stored) {
      setReference(JSON.parse(stored));
    } else {
      router.push('/intel/brief');
    }
  }, [router]);
  
  // User inputs
  const [selectedFaceId, setSelectedFaceId] = useState<string | null>(null);
  const [uploadedFace, setUploadedFace] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [useBrandColors, setUseBrandColors] = useState(false);
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  
  // Generated result
  const [recreationId, setRecreationId] = useState<string | null>(null);
  
  // Hooks
  const { data: assets } = useThumbnailAssets();
  const { data: brandKit } = useActiveBrandKit();
  const uploadAsset = useUploadThumbnailAsset();
  const recreate = useRecreateThumbnail();
  const { data: status } = useRecreationStatus(recreationId);
  
  const faceAssets = assets?.faces || [];
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setUploadedFace(base64);
    };
    reader.readAsDataURL(file);
  };
  
  const handleGenerate = async () => {
    if (!reference) return;
    
    const result = await recreate.mutateAsync({
      reference_thumbnail_url: reference.thumbnail_url,
      reference_video_id: reference.video_id,
      reference_analysis: reference.analysis,
      face_asset_id: selectedFaceId || undefined,
      face_image_base64: uploadedFace || undefined,
      custom_text: customText || undefined,
      use_brand_colors: useBrandColors,
      brand_kit_id: useBrandColors ? brandKit?.id : undefined,
      additional_prompt: additionalPrompt || undefined,
    });
    
    setRecreationId(result.recreation_id);
  };
  
  const handleDownload = () => {
    if (status?.download_url) {
      window.open(status.download_url, '_blank');
    }
  };
  
  if (!reference) {
    return <div className="p-8 text-center text-zinc-400">Loading...</div>;
  }
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🎨</span> Thumbnail Studio
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Recreate this winning thumbnail with your face and branding
          </p>
        </div>
        <button
          onClick={() => router.push('/intel/brief')}
          className="text-zinc-400 hover:text-white"
        >
          ✕ Close
        </button>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Reference */}
        <div className="space-y-4">
          <div className="bg-zinc-900 rounded-xl p-4">
            <h3 className="text-white font-medium mb-3">Reference Thumbnail</h3>
            <div className="relative aspect-video rounded-lg overflow-hidden">
              <Image
                src={reference.thumbnail_url}
                alt={reference.title}
                fill
                className="object-cover"
              />
            </div>
            <p className="text-zinc-400 text-sm mt-2">
              {formatViews(reference.view_count)} views • {reference.channel_title}
            </p>
          </div>
          
          {/* Analysis */}
          <div className="bg-zinc-900 rounded-xl p-4">
            <h3 className="text-white font-medium mb-3">📊 Why This Works</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Layout</span>
                <span className="text-white">{reference.analysis.layout_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Text Position</span>
                <span className="text-white">{reference.analysis.text_placement}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Mood</span>
                <span className="text-white">{reference.analysis.color_mood}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Colors</span>
                <div className="flex gap-1">
                  {reference.analysis.dominant_colors.slice(0, 4).map((c, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded border border-zinc-700"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
            {reference.analysis.why_it_works && (
              <p className="text-zinc-300 text-sm mt-4 p-3 bg-zinc-800 rounded-lg">
                💡 {reference.analysis.why_it_works}
              </p>
            )}
          </div>
        </div>
        
        {/* Right: Your Version */}
        <div className="space-y-4">
          {/* Result Preview */}
          <div className="bg-zinc-900 rounded-xl p-4">
            <h3 className="text-white font-medium mb-3">Your Thumbnail</h3>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center">
              {status?.status === 'completed' && status.generated_thumbnail_url ? (
                <Image
                  src={status.generated_thumbnail_url}
                  alt="Generated thumbnail"
                  fill
                  className="object-cover"
                />
              ) : status?.status === 'processing' ? (
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-zinc-400 text-sm">Generating...</p>
                </div>
              ) : (
                <p className="text-zinc-500 text-sm">
                  Your generated thumbnail will appear here
                </p>
              )}
            </div>
            
            {status?.status === 'completed' && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setRecreationId(null)}
                  className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2 rounded-lg text-sm"
                >
                  🔄 Regenerate
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm"
                >
                  ⬇️ Download PNG
                </button>
              </div>
            )}
          </div>
          
          {/* Inputs */}
          <div className="bg-zinc-900 rounded-xl p-4 space-y-4">
            {/* Face Selection */}
            <div>
              <h4 className="text-white text-sm font-medium mb-2">📸 Your Face</h4>
              <div className="flex gap-2 flex-wrap">
                {/* Upload button */}
                <label className="w-16 h-16 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center cursor-pointer border-2 border-dashed border-zinc-600">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <span className="text-2xl">+</span>
                </label>
                
                {/* Uploaded face preview */}
                {uploadedFace && (
                  <div
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer ${
                      !selectedFaceId ? 'border-purple-500' : 'border-transparent'
                    }`}
                    onClick={() => setSelectedFaceId(null)}
                  >
                    <img
                      src={`data:image/png;base64,${uploadedFace}`}
                      alt="Uploaded"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* Saved faces */}
                {faceAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer ${
                      selectedFaceId === asset.id ? 'border-purple-500' : 'border-transparent'
                    }`}
                    onClick={() => {
                      setSelectedFaceId(asset.id);
                      setUploadedFace(null);
                    }}
                  >
                    <img
                      src={asset.processed_url || asset.original_url}
                      alt={asset.display_name || 'Saved face'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Custom Text */}
            <div>
              <h4 className="text-white text-sm font-medium mb-2">✏️ Custom Text</h4>
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={reference.analysis.text_content || 'Enter your text...'}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
              />
              {reference.analysis.text_content && (
                <p className="text-zinc-500 text-xs mt-1">
                  Original: "{reference.analysis.text_content}"
                </p>
              )}
            </div>
            
            {/* Brand Colors */}
            <div>
              <h4 className="text-white text-sm font-medium mb-2">🎨 Colors</h4>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!useBrandColors}
                    onChange={() => setUseBrandColors(false)}
                    className="text-purple-500"
                  />
                  <span className="text-zinc-300 text-sm">Reference colors</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={useBrandColors}
                    onChange={() => setUseBrandColors(true)}
                    className="text-purple-500"
                  />
                  <span className="text-zinc-300 text-sm">My brand colors</span>
                </label>
              </div>
              {useBrandColors && brandKit && (
                <div className="flex gap-1 mt-2">
                  {brandKit.primaryColors?.map((c, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Additional Instructions */}
            <div>
              <h4 className="text-white text-sm font-medium mb-2">💬 Additional Instructions</h4>
              <textarea
                value={additionalPrompt}
                onChange={(e) => setAdditionalPrompt(e.target.value)}
                placeholder="Any specific changes? e.g., 'Make expression more surprised'"
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm resize-none"
              />
            </div>
            
            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={recreate.isPending || status?.status === 'processing'}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {recreate.isPending || status?.status === 'processing' ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Generating...
                </>
              ) : (
                <>
                  🚀 Generate My Thumbnail
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatViews(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
}
```

---

## PART 8: TIER INTEGRATION

### 8.1 Feature Access by Tier

| Feature | Free | Pro | Studio |
|---------|------|-----|--------|
| **Daily Brief** | ✅ Basic | ✅ Full | ✅ Full + AI |
| **Brief Refresh** | 1x/day (6 AM) | 4x/day | Real-time |
| **Thumbnail Formulas** | 3 thumbnails | 3 thumbnails | 3 thumbnails |
| **Thumbnail Analysis** | Basic (layout, colors) | Full (recipes, tips) | Full + personalized |
| **Thumbnail Recreation** | ❌ | ✅ 5/day | ✅ Unlimited |
| **Title Suggestions** | 1 title | 2 titles | 3 titles |
| **Tags** | 10 tags | 20 tags | 30 tags |
| **Clip Opportunities** | 2 clips | 5 clips | 10 clips |
| **Video Ideas** | 2 ideas | 3 ideas | 5 ideas |
| **Alerts** | ❌ | ✅ | ✅ Real-time |
| **Copy to Clipboard** | ❌ | ✅ | ✅ |
| **Export Brief** | ❌ | ❌ | ✅ |

### 8.2 Tier Limits Configuration

```python
# backend/services/intel/brief_tier_limits.py

BRIEF_TIER_LIMITS = {
    "free": {
        "refresh_times": [6],  # 6 AM only
        "thumbnail_analysis_detail": "basic",
        "thumbnail_recreations_per_day": 0,
        "title_suggestions": 1,
        "tags_count": 10,
        "clip_opportunities": 2,
        "video_ideas": 2,
        "alerts_enabled": False,
        "copy_enabled": False,
        "export_enabled": False,
    },
    "pro": {
        "refresh_times": [6, 12, 16, 20],  # 6 AM, 12 PM, 4 PM, 8 PM
        "thumbnail_analysis_detail": "full",
        "thumbnail_recreations_per_day": 5,
        "title_suggestions": 2,
        "tags_count": 20,
        "clip_opportunities": 5,
        "video_ideas": 3,
        "alerts_enabled": True,
        "copy_enabled": True,
        "export_enabled": False,
    },
    "studio": {
        "refresh_times": "realtime",
        "thumbnail_analysis_detail": "full_personalized",
        "thumbnail_recreations_per_day": -1,  # Unlimited
        "title_suggestions": 3,
        "tags_count": 30,
        "clip_opportunities": 10,
        "video_ideas": 5,
        "alerts_enabled": True,
        "copy_enabled": True,
        "export_enabled": True,
    },
}
```

---

## PART 9: SCHEDULED JOBS

### 9.1 Daily Brief Generation Job

```python
# backend/workers/daily_brief_worker.py

"""
Daily Brief Generation Worker

Runs at scheduled times to generate briefs for all users.
Uses user's timezone to determine when to generate.

Schedule:
- 6:00 AM user timezone (all tiers)
- 12:00 PM user timezone (Pro+)
- 4:00 PM user timezone (Pro+)
- 8:00 PM user timezone (Pro+)
"""

import asyncio
from datetime import datetime
import pytz

from backend.database.supabase_client import get_supabase_client
from backend.services.intel.brief_generator import get_brief_generator
from backend.services.intel.brief_tier_limits import BRIEF_TIER_LIMITS


async def run_brief_generation():
    """Generate briefs for users whose refresh time has arrived."""
    
    supabase = get_supabase_client()
    generator = get_brief_generator()
    
    # Get all users with intel preferences
    users = supabase.table("user_intel_preferences").select(
        "user_id, subscribed_categories, timezone"
    ).execute().data
    
    # Get user tiers
    user_ids = [u["user_id"] for u in users]
    tiers = supabase.table("users").select(
        "id, subscription_tier"
    ).in_("id", user_ids).execute().data
    
    tier_map = {t["id"]: t["subscription_tier"] or "free" for t in tiers}
    
    for user in users:
        user_id = user["user_id"]
        timezone = user.get("timezone", "America/New_York")
        tier = tier_map.get(user_id, "free")
        categories = user.get("subscribed_categories", [])
        
        if not categories:
            continue
        
        # Check if it's refresh time for this user
        if not should_refresh(timezone, tier):
            continue
        
        try:
            await generator.generate_brief(
                user_id=user_id,
                user_tier=tier,
                subscribed_categories=categories,
                timezone=timezone,
            )
            print(f"Generated brief for user {user_id}")
        except Exception as e:
            print(f"Failed to generate brief for user {user_id}: {e}")


def should_refresh(timezone: str, tier: str) -> bool:
    """Check if current time matches a refresh time for this tier."""
    
    limits = BRIEF_TIER_LIMITS.get(tier, BRIEF_TIER_LIMITS["free"])
    refresh_times = limits["refresh_times"]
    
    if refresh_times == "realtime":
        return True  # Studio always refreshes
    
    try:
        tz = pytz.timezone(timezone)
        now = datetime.now(tz)
        current_hour = now.hour
        current_minute = now.minute
        
        # Check if we're within 5 minutes of a refresh time
        for hour in refresh_times:
            if current_hour == hour and current_minute < 5:
                return True
        
        return False
    except:
        return False


if __name__ == "__main__":
    asyncio.run(run_brief_generation())
```

### 9.2 Cron Configuration

```yaml
# For deployment (e.g., Railway, Render, etc.)
# Run every hour to catch all timezone refresh times

cron:
  - name: daily-brief-generator
    schedule: "0 * * * *"  # Every hour at :00
    command: python -m backend.workers.daily_brief_worker
```

---

## PART 10: IMPLEMENTATION CHECKLIST

### Phase 1: Database & API Foundation
- [ ] Create `daily_briefs` table migration
- [ ] Create `user_thumbnail_assets` table migration
- [ ] Create `thumbnail_recreations` table migration
- [ ] Implement `/api/v1/intel/brief` endpoint
- [ ] Implement `/api/v1/thumbnails/assets` endpoints
- [ ] Implement `/api/v1/thumbnails/recreate` endpoint

### Phase 2: Backend Services
- [ ] Implement `DailyBriefGenerator` service
- [ ] Implement `ThumbnailRecreationService`
- [ ] Integrate with existing YouTube collector
- [ ] Integrate with existing Twitch collector
- [ ] Integrate with existing Thumbnail Intel service
- [ ] Integrate with Nano Banana for generation

### Phase 3: Frontend - Daily Brief
- [ ] Create `/intel/brief` page
- [ ] Create `BriefHeader` component
- [ ] Create `TodaysPlayCard` component
- [ ] Create `ThumbnailFormulaSection` component
- [ ] Create `TitleTagsSection` component
- [ ] Create `ClipOpportunitiesSection` component
- [ ] Create `WorkingNotWorkingSection` component
- [ ] Create `VideoIdeasSection` component
- [ ] Create `AlertsSection` component
- [ ] Implement copy-to-clipboard functionality

### Phase 4: Frontend - Thumbnail Studio
- [ ] Create `/intel/thumbnail-studio` page
- [ ] Implement face upload with background removal
- [ ] Implement saved face selection
- [ ] Implement brand color integration
- [ ] Implement generation polling
- [ ] Implement download functionality

### Phase 5: Scheduled Jobs
- [ ] Implement daily brief worker
- [ ] Configure cron schedule
- [ ] Test timezone handling

### Phase 6: Tier Integration
- [ ] Implement tier-based feature gating
- [ ] Add upgrade CTAs for locked features
- [ ] Test all tier combinations

### Phase 7: Polish
- [ ] Add loading skeletons
- [ ] Add error states
- [ ] Add empty states
- [ ] Mobile responsiveness
- [ ] Performance optimization

---

## SUMMARY

This spec defines a complete system for:

1. **Daily Brief** - A 90-second actionable intel page that refreshes at 6 AM with:
   - Today's Play recommendation
   - Top 3 winning thumbnails with AI analysis
   - Title suggestions and optimized tags
   - Viral clip opportunities
   - What's working / not working insights
   - Video ideas
   - Time-sensitive alerts

2. **Thumbnail Recreation** - One-click thumbnail recreation that:
   - Takes a winning thumbnail as reference
   - Lets user upload their face or use saved photos
   - Applies their brand colors
   - Generates a personalized version via Nano Banana
   - Delivers a download-ready 1280x720 PNG

3. **Intel Dashboard** - The existing customizable panel exploration mode

All features are tier-gated appropriately, with Free users getting basic access and Studio users getting the full experience with real-time updates and unlimited recreations.

**No external tools required.** Everything happens inside AuraStream.
