# Intel Page Redesign Audit

**Date:** January 2, 2026  
**Purpose:** Complete gap analysis with full backend/frontend contract for zero drift

---

## Implementation Progress

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Backend Schema & Service | ✅ COMPLETE | Added new fields to schemas, updated vision analyzer |
| Phase 2: Frontend Type & Hook | ✅ COMPLETE | Updated TypeScript types and transform functions |
| Phase 3: Frontend Components | ✅ COMPLETE | Created badge, dropdown, banner, and row components |
| Phase 4: Page Restructure | ⏳ PENDING | Restructure intel/page.tsx |
| Phase 5: Polish & Testing | ⏳ PENDING | Responsive design, loading states, tests |

---

## Executive Summary

The current intel page is a **multi-category expandable dashboard** that shows content for up to 3 subscribed games. The target design is a **cleaner, single-topic focused view** with better visual hierarchy and richer thumbnail metadata.

---

## SECTION 1: BACKEND SCHEMA CHANGES

### 1.1 New Fields for `ThumbnailAnalysisResponse`

**File:** `backend/api/schemas/thumbnail_intel.py`

```python
# CURRENT
class ThumbnailAnalysisResponse(BaseModel):
    video_id: str
    title: str
    thumbnail_url: str
    view_count: int
    layout_type: str
    text_placement: str
    focal_point: str
    dominant_colors: List[str]
    color_mood: str
    background_style: str
    has_face: bool
    has_text: bool
    text_content: Optional[str]
    has_border: bool
    has_glow_effects: bool
    has_arrows_circles: bool
    face_expression: Optional[str]
    face_position: Optional[str]
    face_size: Optional[str]
    face_looking_direction: Optional[str]
    layout_recipe: str
    color_recipe: str
    why_it_works: str
    difficulty: str

# ADD THESE FIELDS
    aspect_ratio: Optional[str] = Field(
        default=None,
        description="Aspect ratio string: '16:9', '4:3', '1:1', '9:16'"
    )
    hashtags: List[str] = Field(
        default_factory=list,
        description="Extracted hashtags from title/description"
    )
    format_type: Optional[str] = Field(
        default=None,
        description="Format classification: 'split-screen', 'reaction', 'gameplay', 'tutorial', 'vlog'"
    )
    channel_name: Optional[str] = Field(
        default=None,
        description="YouTube channel name for display"
    )
    published_at: Optional[str] = Field(
        default=None,
        description="Video publish date ISO string"
    )
```

### 1.2 New Fields for `DailyBriefResponse`

**File:** `backend/api/schemas/trends.py`

```python
# CURRENT DailyBriefResponse has these fields:
# brief_date, thumbnail_of_day, youtube_highlights, twitch_highlights,
# hot_games, top_clips, insights, best_upload_times, best_stream_times,
# title_patterns, thumbnail_patterns, trending_keywords, generated_at

# ADD THESE FIELDS
class DailyBriefResponse(BaseModel):
    # ... existing fields ...
    
    # NEW: Market opportunity indicator
    market_opportunity: Optional[Literal["high", "medium", "low"]] = Field(
        default=None,
        description="Current market opportunity level based on competition analysis"
    )
    market_opportunity_reason: Optional[str] = Field(
        default=None,
        description="Explanation for market opportunity level"
    )
    
    # NEW: Active streams count for primary category
    active_streams_count: Optional[int] = Field(
        default=None,
        ge=0,
        description="Number of active streams in user's primary category"
    )
    active_streams_change_percent: Optional[float] = Field(
        default=None,
        description="Percentage change in active streams vs yesterday"
    )
    
    # NEW: Daily assets stats
    daily_assets_created: Optional[int] = Field(
        default=None,
        ge=0,
        description="Number of assets created today by user"
    )
    pending_review_count: Optional[int] = Field(
        default=None,
        ge=0,
        description="Number of assets pending review (jobs in 'processing' status)"
    )
```

### 1.3 New Endpoint: Enhanced Daily Brief

**File:** `backend/api/routes/trends.py`

```python
# NEW ENDPOINT (or enhance existing /daily-brief)
@router.get("/daily-brief/enhanced", response_model=EnhancedDailyBriefResponse)
async def get_enhanced_daily_brief(
    current_user: TokenPayload = Depends(get_current_user),
    youtube_collector: YouTubeCollectorDep = None,
    twitch_collector: TwitchCollectorDep = None,
    generation_service: GenerationServiceDep = None,
) -> EnhancedDailyBriefResponse:
    """
    Get enhanced daily brief with market opportunity and asset stats.
    
    Returns:
    - market_opportunity: 'high', 'medium', 'low' based on competition
    - active_streams_count: Live streams in user's primary category
    - daily_assets_created: User's assets created today
    - pending_review_count: Jobs still processing
    """
    # Implementation details...
```

### 1.4 New Schema: `EnhancedDailyBriefResponse`

**File:** `backend/api/schemas/trends.py`

```python
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

class EnhancedDailyBriefResponse(DailyBriefResponse):
    """Extended daily brief with header badge data."""
    market_opportunity: Optional[MarketOpportunityData] = None
    daily_assets: Optional[DailyAssetsData] = None
```

---

## SECTION 2: FRONTEND TYPE CHANGES

### 2.1 Update `ThumbnailAnalysis` Type

**File:** `tsx/packages/api-client/src/types/thumbnailIntel.ts`

```typescript
// CURRENT
export interface ThumbnailAnalysis {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  url: string;  // alias
  viewCount: number;
  views: number;  // alias
  layoutType: string;
  textPlacement: string;
  focalPoint: string;
  dominantColors: string[];
  colorMood: string;
  backgroundStyle: string;
  hasFace: boolean;
  hasText: boolean;
  textContent?: string;
  hasBorder: boolean;
  hasGlowEffects: boolean;
  hasArrowsCircles: boolean;
  faceExpression?: string | null;
  facePosition?: string | null;
  faceSize?: string | null;
  faceLookingDirection?: string | null;
  layoutRecipe: string;
  colorRecipe: string;
  whyItWorks: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ADD THESE FIELDS
export interface ThumbnailAnalysis {
  // ... existing fields ...
  
  /** Aspect ratio: '16:9', '4:3', '1:1', '9:16' */
  aspectRatio?: string | null;
  
  /** Extracted hashtags from title/description */
  hashtags: string[];
  
  /** Format type: 'split-screen', 'reaction', 'gameplay', 'tutorial', 'vlog' */
  formatType?: string | null;
  
  /** YouTube channel name */
  channelName?: string | null;
  
  /** Video publish date ISO string */
  publishedAt?: string | null;
}
```

### 2.2 New Types for Header Badges

**File:** `tsx/packages/api-client/src/types/intel.ts`

```typescript
// ADD THESE NEW TYPES

/**
 * Market opportunity data for header badge.
 */
export interface MarketOpportunityData {
  level: 'high' | 'medium' | 'low';
  reason: string;
  activeStreams: number;
  changePercent: number;
  primaryCategory: string;
}

/**
 * Daily assets data for header badge.
 */
export interface DailyAssetsData {
  createdToday: number;
  pendingReview: number;
}

/**
 * Enhanced daily brief with header badge data.
 */
export interface EnhancedDailyBrief {
  // Existing DailyBrief fields...
  date: string;
  thumbnailOfDay: ThumbnailOfDay | null;
  youtubeHighlights: YouTubeHighlight[];
  twitchHighlights: TwitchHighlight[];
  hotGames: HotGame[];
  insights: Insight[];
  bestUploadTimes: TimingRecommendation | null;
  bestStreamTimes: TimingRecommendation | null;
  titlePatterns: TitlePatterns | null;
  thumbnailPatterns: ThumbnailPatterns | null;
  
  // NEW fields
  marketOpportunity?: MarketOpportunityData | null;
  dailyAssets?: DailyAssetsData | null;
}
```

### 2.3 Update Transform Functions

**File:** `tsx/packages/api-client/src/hooks/useThumbnailIntel.ts`

```typescript
// UPDATE transformThumbnailAnalysis
function transformThumbnailAnalysis(data: any): ThumbnailAnalysis {
  return {
    // ... existing transforms ...
    videoId: data.video_id,
    title: data.title,
    thumbnailUrl: data.thumbnail_url,
    url: data.thumbnail_url,
    viewCount: data.view_count,
    views: data.view_count,
    layoutType: data.layout_type,
    // ... etc ...
    
    // NEW transforms
    aspectRatio: data.aspect_ratio ?? null,
    hashtags: data.hashtags || [],
    formatType: data.format_type ?? null,
    channelName: data.channel_name ?? null,
    publishedAt: data.published_at ?? null,
  };
}
```

**File:** `tsx/packages/api-client/src/hooks/useTrends.ts`

```typescript
// ADD new transform function
function transformMarketOpportunity(data: any): MarketOpportunityData | null {
  if (!data) return null;
  return {
    level: data.level,
    reason: data.reason,
    activeStreams: data.active_streams,
    changePercent: data.change_percent,
    primaryCategory: data.primary_category,
  };
}

function transformDailyAssets(data: any): DailyAssetsData | null {
  if (!data) return null;
  return {
    createdToday: data.created_today,
    pendingReview: data.pending_review,
  };
}

// UPDATE transformDailyBrief or create new transformEnhancedDailyBrief
export function transformEnhancedDailyBrief(data: any): EnhancedDailyBrief {
  return {
    ...transformDailyBrief(data),
    marketOpportunity: transformMarketOpportunity(data.market_opportunity),
    dailyAssets: transformDailyAssets(data.daily_assets),
  };
}
```

### 2.4 New Hook: `useEnhancedDailyBrief`

**File:** `tsx/packages/api-client/src/hooks/useTrends.ts`

```typescript
// ADD new hook
export function useEnhancedDailyBrief(enabled = true) {
  return useQuery({
    queryKey: [...trendsKeys.all, 'enhanced-daily-brief'] as const,
    queryFn: async (): Promise<EnhancedDailyBrief> => {
      const res = await fetch(`${API_BASE}/trends/daily-brief/enhanced`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch enhanced daily brief');
      }
      return transformEnhancedDailyBrief(await res.json());
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}
```

---

## SECTION 3: API ENDPOINT CHANGES

### 3.1 Endpoints to Modify

| Endpoint | Change | Reason |
|----------|--------|--------|
| `GET /api/v1/trends/daily-brief` | Add `market_opportunity`, `daily_assets` fields | Header badges |
| `GET /api/v1/thumbnail-intel/category/{key}` | Add `aspect_ratio`, `hashtags`, `format_type`, `channel_name`, `published_at` to thumbnails | Enhanced thumbnail entries |

### 3.2 New Endpoints (Optional)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/trends/daily-brief/enhanced` | Alternative: separate endpoint for enhanced brief |
| `GET /api/v1/intel/header-stats` | Alternative: dedicated endpoint for header badge data |

### 3.3 Endpoint Response Contract

**`GET /api/v1/trends/daily-brief` (Enhanced)**

```json
{
  "brief_date": "2026-01-02",
  "thumbnail_of_day": { ... },
  "youtube_highlights": [ ... ],
  "twitch_highlights": [ ... ],
  "hot_games": [ ... ],
  "insights": [ ... ],
  "market_opportunity": {
    "level": "high",
    "reason": "Low competition with 94 active streams",
    "active_streams": 94,
    "change_percent": 12.5,
    "primary_category": "fortnite"
  },
  "daily_assets": {
    "created_today": 16,
    "pending_review": 4
  }
}
```

**`GET /api/v1/thumbnail-intel/category/{key}` (Enhanced)**

```json
{
  "category_key": "fortnite",
  "category_name": "Fortnite",
  "analysis_date": "2026-01-02",
  "thumbnails": [
    {
      "video_id": "abc123",
      "title": "Togo vs John #fortnite #gaming",
      "thumbnail_url": "https://...",
      "view_count": 934000,
      "layout_type": "split-screen",
      "aspect_ratio": "16:9",
      "hashtags": ["fortnite", "gaming"],
      "format_type": "split-screen",
      "channel_name": "TogoGaming",
      "published_at": "2026-01-01T15:30:00Z",
      "why_it_works": "Clear split highlights the 'vs' theme. Arrow draws the eye.",
      ...
    }
  ],
  "category_style_summary": "High-contrast split-screens with clear focal points are currently driving 20% higher CTR in this category."
}
```

---

## SECTION 4: DATABASE CHANGES

### 4.1 No Schema Changes Required

The new fields (`aspect_ratio`, `hashtags`, `format_type`, etc.) are computed at analysis time and stored in the existing `thumbnails` JSONB column within the thumbnail intel cache. No database migrations needed.

### 4.2 Query Changes

**For `pending_review_count`:**
```sql
-- Count jobs in 'processing' or 'queued' status for user
SELECT COUNT(*) FROM generation_jobs 
WHERE user_id = $1 
AND status IN ('processing', 'queued')
AND created_at >= CURRENT_DATE;
```

**For `daily_assets_created`:**
```sql
-- Count assets created today for user
SELECT COUNT(*) FROM assets 
WHERE user_id = $1 
AND created_at >= CURRENT_DATE;
```

---

## SECTION 5: SERVICE LAYER CHANGES

### 5.1 Thumbnail Intel Service

**File:** `backend/services/thumbnail_intel/vision_analyzer.py`

```python
# ADD to analysis output
def analyze_thumbnail(self, thumbnail_url: str, video_data: dict) -> dict:
    # ... existing analysis ...
    
    # NEW: Extract aspect ratio from dimensions
    width = video_data.get('width', 1280)
    height = video_data.get('height', 720)
    aspect_ratio = self._calculate_aspect_ratio(width, height)
    
    # NEW: Extract hashtags from title
    hashtags = self._extract_hashtags(video_data.get('title', ''))
    
    # NEW: Classify format type
    format_type = self._classify_format_type(analysis_result)
    
    return {
        # ... existing fields ...
        'aspect_ratio': aspect_ratio,
        'hashtags': hashtags,
        'format_type': format_type,
        'channel_name': video_data.get('channel_title'),
        'published_at': video_data.get('published_at'),
    }

def _calculate_aspect_ratio(self, width: int, height: int) -> str:
    """Calculate aspect ratio string from dimensions."""
    ratio = width / height
    if abs(ratio - 16/9) < 0.1:
        return "16:9"
    elif abs(ratio - 4/3) < 0.1:
        return "4:3"
    elif abs(ratio - 1) < 0.1:
        return "1:1"
    elif abs(ratio - 9/16) < 0.1:
        return "9:16"
    return f"{width}:{height}"

def _extract_hashtags(self, title: str) -> List[str]:
    """Extract hashtags from title."""
    import re
    return re.findall(r'#(\w+)', title.lower())

def _classify_format_type(self, analysis: dict) -> str:
    """Classify thumbnail format type."""
    layout = analysis.get('layout_type', '').lower()
    if 'split' in layout:
        return 'split-screen'
    elif 'reaction' in layout or analysis.get('has_face'):
        return 'reaction'
    elif 'tutorial' in layout:
        return 'tutorial'
    elif 'gameplay' in layout:
        return 'gameplay'
    return 'standard'
```

### 5.2 Generation Service

**File:** `backend/services/generation_service.py`

```python
# ADD methods for header stats
async def get_daily_asset_stats(self, user_id: str) -> dict:
    """Get daily asset creation stats for user."""
    today = datetime.utcnow().date()
    
    # Count assets created today
    assets_result = self.db.table('assets').select('id', count='exact').eq(
        'user_id', user_id
    ).gte('created_at', today.isoformat()).execute()
    
    # Count pending jobs
    jobs_result = self.db.table('generation_jobs').select('id', count='exact').eq(
        'user_id', user_id
    ).in_('status', ['processing', 'queued']).execute()
    
    return {
        'created_today': assets_result.count or 0,
        'pending_review': jobs_result.count or 0,
    }
```

### 5.3 Trends Service

**File:** `backend/services/trends/youtube_collector.py` or new file

```python
# ADD method for market opportunity calculation
async def calculate_market_opportunity(
    self, 
    category_key: str,
    twitch_collector: TwitchCollector
) -> dict:
    """Calculate market opportunity for a category."""
    # Get current active streams
    streams = await twitch_collector.get_live_streams(game_id=GAME_IDS.get(category_key))
    active_count = len(streams)
    
    # Get yesterday's count from cache/history
    yesterday_count = await self._get_yesterday_stream_count(category_key)
    
    # Calculate change
    change_percent = ((active_count - yesterday_count) / yesterday_count * 100) if yesterday_count > 0 else 0
    
    # Determine opportunity level
    if active_count < 100:
        level = 'high'
        reason = f'Low competition with only {active_count} active streams'
    elif active_count < 500:
        level = 'medium'
        reason = f'Moderate competition with {active_count} active streams'
    else:
        level = 'low'
        reason = f'High competition with {active_count} active streams'
    
    return {
        'level': level,
        'reason': reason,
        'active_streams': active_count,
        'change_percent': round(change_percent, 1),
        'primary_category': category_key,
    }
```

---

## SECTION 6: FRONTEND COMPONENT CHANGES

### 6.1 New Components to Create

| Component | File | Purpose |
|-----------|------|---------|
| `MarketOpportunityBadge` | `tsx/apps/web/src/components/intel/badges/MarketOpportunityBadge.tsx` | Header badge showing market opportunity |
| `DailyAssetsBadge` | `tsx/apps/web/src/components/intel/badges/DailyAssetsBadge.tsx` | Header badge showing daily assets |
| `TopicDropdown` | `tsx/apps/web/src/components/intel/TopicDropdown.tsx` | Dropdown to select active game |
| `AIInsightBanner` | `tsx/apps/web/src/components/intel/AIInsightBanner.tsx` | Teal banner with AI insight |
| `ThumbnailEntryRow` | `tsx/apps/web/src/components/intel/feeds/ThumbnailEntryRow.tsx` | Row-based thumbnail entry |

### 6.2 Components to Modify

| Component | File | Changes |
|-----------|------|---------|
| `intel/page.tsx` | `tsx/apps/web/src/app/intel/page.tsx` | Restructure layout, add new badges, change to dropdown |
| `ClipCarousel.tsx` | `tsx/apps/web/src/components/intel/carousels/ClipCarousel.tsx` | Add full-width mode, "View All" link |
| `ThumbnailFeed.tsx` | `tsx/apps/web/src/components/intel/feeds/ThumbnailFeed.tsx` | Use row layout, display new fields |

### 6.3 Component Props Contracts

**MarketOpportunityBadge:**
```typescript
interface MarketOpportunityBadgeProps {
  data: MarketOpportunityData | null;
  isLoading?: boolean;
}
```

**DailyAssetsBadge:**
```typescript
interface DailyAssetsBadgeProps {
  data: DailyAssetsData | null;
  isLoading?: boolean;
}
```

**TopicDropdown:**
```typescript
interface TopicDropdownProps {
  categories: CategorySubscription[];
  selectedKey: string;
  onSelect: (key: string) => void;
}
```

**ThumbnailEntryRow:**
```typescript
interface ThumbnailEntryRowProps {
  thumbnail: ThumbnailAnalysis;
  onAnalyze: (videoId: string) => void;
}
```

---

## SECTION 7: COMPLETE FILE CHANGE LIST

### Backend Files to Modify

1. `backend/api/schemas/thumbnail_intel.py` - Add new fields
2. `backend/api/schemas/trends.py` - Add new response types
3. `backend/api/routes/trends.py` - Enhance daily-brief endpoint
4. `backend/services/thumbnail_intel/vision_analyzer.py` - Add extraction methods
5. `backend/services/generation_service.py` - Add daily stats method

### Frontend Files to Modify

1. `tsx/packages/api-client/src/types/thumbnailIntel.ts` - Add new fields
2. `tsx/packages/api-client/src/types/intel.ts` - Add new types
3. `tsx/packages/api-client/src/types/trends.ts` - Add enhanced brief type
4. `tsx/packages/api-client/src/hooks/useThumbnailIntel.ts` - Update transform
5. `tsx/packages/api-client/src/hooks/useTrends.ts` - Add new hook, update transform
6. `tsx/packages/api-client/src/index.ts` - Export new types and hooks
7. `tsx/apps/web/src/app/intel/page.tsx` - Major restructure
8. `tsx/apps/web/src/components/intel/carousels/ClipCarousel.tsx` - Add full-width mode
9. `tsx/apps/web/src/components/intel/feeds/ThumbnailFeed.tsx` - Row layout

### Frontend Files to Create

1. `tsx/apps/web/src/components/intel/badges/MarketOpportunityBadge.tsx`
2. `tsx/apps/web/src/components/intel/badges/DailyAssetsBadge.tsx`
3. `tsx/apps/web/src/components/intel/badges/index.ts`
4. `tsx/apps/web/src/components/intel/TopicDropdown.tsx`
5. `tsx/apps/web/src/components/intel/AIInsightBanner.tsx`
6. `tsx/apps/web/src/components/intel/feeds/ThumbnailEntryRow.tsx`

---

## SECTION 8: TYPE ALIGNMENT CHECKLIST

| Backend Field | Backend Type | Frontend Field | Frontend Type | Transform |
|---------------|--------------|----------------|---------------|-----------|
| `aspect_ratio` | `Optional[str]` | `aspectRatio` | `string \| null` | `data.aspect_ratio ?? null` |
| `hashtags` | `List[str]` | `hashtags` | `string[]` | `data.hashtags \|\| []` |
| `format_type` | `Optional[str]` | `formatType` | `string \| null` | `data.format_type ?? null` |
| `channel_name` | `Optional[str]` | `channelName` | `string \| null` | `data.channel_name ?? null` |
| `published_at` | `Optional[str]` | `publishedAt` | `string \| null` | `data.published_at ?? null` |
| `market_opportunity.level` | `Literal["high","medium","low"]` | `marketOpportunity.level` | `'high' \| 'medium' \| 'low'` | direct |
| `market_opportunity.active_streams` | `int` | `marketOpportunity.activeStreams` | `number` | `data.active_streams` |
| `market_opportunity.change_percent` | `float` | `marketOpportunity.changePercent` | `number` | `data.change_percent` |
| `daily_assets.created_today` | `int` | `dailyAssets.createdToday` | `number` | `data.created_today` |
| `daily_assets.pending_review` | `int` | `dailyAssets.pendingReview` | `number` | `data.pending_review` |

---

## SECTION 9: MIGRATION PLAN

### Phase 1: Backend Schema & Service Updates
1. Update `ThumbnailAnalysisResponse` schema with new fields
2. Update `DailyBriefResponse` schema with new fields
3. Add extraction methods to vision analyzer
4. Add daily stats method to generation service
5. Update daily-brief endpoint to include new data
6. Test endpoints return correct data

### Phase 2: Frontend Type & Hook Updates
1. Update `ThumbnailAnalysis` type with new fields
2. Add `MarketOpportunityData`, `DailyAssetsData`, `EnhancedDailyBrief` types
3. Update transform functions in hooks
4. Add `useEnhancedDailyBrief` hook (or update existing)
5. Export new types and hooks from index
6. Test hooks return correctly typed data

### Phase 3: Frontend Component Updates
1. Create badge components (`MarketOpportunityBadge`, `DailyAssetsBadge`)
2. Create `TopicDropdown` component
3. Create `AIInsightBanner` component
4. Create `ThumbnailEntryRow` component
5. Update `ClipCarousel` with full-width mode
6. Update `ThumbnailFeed` with row layout

### Phase 4: Page Restructure
1. Update `intel/page.tsx` header with new badges
2. Change carousel layout to full-width stacked
3. Replace expandable sections with single section + dropdown
4. Wire up all new components
5. Test complete flow

### Phase 5: Polish & Testing
1. Responsive design adjustments
2. Loading states for new components
3. Empty states
4. Keyboard navigation
5. E2E tests

---

## SECTION 10: NOTES ON 3-GAME SUBSCRIPTION

**Current:** Users subscribe to up to 3 categories via `IntelOnboarding`. Each category gets its own expandable `CategoryFeedSection`.

**Target:** Users still subscribe to 3 games, but view one at a time via `TopicDropdown`. The dropdown shows all subscribed categories, and selecting one updates the feed content.

**No changes needed to:**
- `useIntelStore` - `subscribedCategories` array stays the same
- `useIntelPreferences` - Preferences API unchanged
- `useSubscribeCategory` / `useUnsubscribeCategory` - Subscription logic unchanged
- `IntelOnboarding` - 3-game selection flow unchanged

**Changes needed:**
- Add `selectedCategory` state to page (default to first subscribed)
- Pass `selectedCategory` to feeds instead of mapping over all categories
- `TopicDropdown` allows switching between subscribed categories
