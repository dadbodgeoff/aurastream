# CREATE STUDIO UI REDESIGN AUDIT
## Comprehensive Analysis for Three-Panel Layout Redesign

**Version:** 1.0.0  
**Date:** January 2, 2026  
**Purpose:** Full audit of Create Studio module for UI redesign matching reference screenshots

---

## EXECUTIVE SUMMARY

The Create Studio module currently implements a **tabbed interface** with three creation methods:
1. **Quick Create** - Template-based fast creation (3-step wizard)
2. **Build Your Own** - Full control custom creation
3. **AI Coach (PRO)** - AI-guided prompt refinement

The redesign targets a **card-based method selector** at the top with the selected method's content below, matching the reference screenshots.

---

## CURRENT ARCHITECTURE

### Entry Point
```
tsx/apps/web/src/app/dashboard/studio/page.tsx
  └── UnifiedCreateFlow.tsx (Main container)
        ├── CreateTabs.tsx (Tab navigation)
        ├── QuickCreateWizard.tsx (Templates tab)
        ├── CreatePageContent.tsx (Custom tab)
        └── CoachPageContent.tsx (Coach tab)
```

### Tab Navigation (CreateTabs.tsx)
- URL-based state: `?tab=templates|custom|coach`
- Three tabs: Templates, Custom, AI Coach
- PRO badge on Coach tab for non-premium users
- Framer Motion animations with reduced motion support
- ARIA-compliant keyboard navigation

---

## METHOD 1: QUICK CREATE (Templates)

### Current Component Structure
```
QuickCreateWizard.tsx
├── Step 1: TemplateGrid.tsx
│   ├── Category filter buttons (all, stream, social, twitch, branding)
│   └── Template cards grid (2-4 columns responsive)
├── Step 2: CustomizeForm.tsx
│   ├── Vibe selection grid
│   ├── Dynamic form fields
│   ├── Brand kit selector
│   ├── Logo options panel
│   └── Media asset picker (Pro/Studio)
└── Step 3: ReviewPanel.tsx
    ├── Summary cards
    ├── Generate button with progress stages
    └── Error handling with retry/upgrade CTAs
```

### State Management
```typescript
// QuickCreateWizard state
step: WizardStep = 'select' | 'customize' | 'review'
category: TemplateCategory = 'all' | 'stream' | 'social' | 'twitch' | 'branding'
template: QuickTemplate | null
selectedVibe: string
formValues: Record<string, string>
brandKitId: string
includeLogo: boolean
logoPosition: LogoPosition
logoSize: LogoSize
logoType: LogoType
brandIntensity: BrandIntensity
selectedMediaAssets: MediaAsset[]
mediaAssetPlacements: AssetPlacement[]
```

### Data Flow
1. User selects template → loads `QuickTemplate` from constants
2. Backend fetches dynamic fields via `useTemplate(template.id)`
3. User fills fields + selects vibe
4. On generate: Build prompt as `__quick_create__:template_id:vibe_id | field1:value1`
5. Call `useGenerateAsset()` mutation
6. Redirect to `/dashboard/generate/{jobId}`

### Key Types
```typescript
interface QuickTemplate {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  category: 'stream' | 'social' | 'twitch' | 'branding';
  assetType: string;
  dimensions: string;
  previewStyle: string;
  fields: TemplateField[];
  vibes: VibeOption[];
}

interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'time' | 'dynamic_select' | 'color';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  showForVibes?: string[];
  dependsOn?: string;
  optionsMap?: Record<string, { value: string; label: string }[]>;
  presets?: { label: string; value: string }[];
}

interface VibeOption {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  gradient: string;
}
```

### API Hooks Used
- `useBrandKits()` - List user's brand kits
- `useLogos(brandKitId)` - Check if logo exists
- `useTemplate(templateId)` - Fetch dynamic fields from backend
- `useGenerateAsset()` - Create generation job

### Endpoints
- `GET /api/v1/brand-kits` - List brand kits
- `GET /api/v1/brand-kits/{id}/logos` - Get logos
- `GET /api/v1/templates/{id}` - Get template with dynamic fields
- `POST /api/v1/generate` - Create generation job



---

## METHOD 2: BUILD YOUR OWN (Custom)

### Current Component Structure
```
CreatePageContent.tsx
├── Phase: select
│   ├── PlatformFilter (general, twitch, youtube, tiktok)
│   ├── AssetTypeSelector (filtered by platform)
│   ├── BrandKitSelector (optional)
│   └── PromptMethodSelector (Manual vs Coach)
├── Phase: prompt
│   ├── PromptInput (free-form textarea)
│   ├── BrandCustomizationSection
│   │   ├── Color selection
│   │   ├── Typography selection
│   │   ├── Voice selection
│   │   └── Logo options
│   ├── MediaAssetPicker (Pro/Studio)
│   └── Generate button
└── Phase: coach (internal)
    └── CreateCoachIntegration (redirects to coach tab)
```

### State Management
```typescript
// CreatePageContent state
phase: CreatePhase = 'select' | 'prompt' | 'coach'
platform: Platform = 'general' | 'twitch' | 'youtube' | 'tiktok'
selectedAssetType: string
selectedBrandKitId: string
prompt: string
brandCustomization: BrandCustomizationValue = {
  include_logo: boolean
  logo_type: LogoType
  logo_position: LogoPosition
  logo_size: LogoSize
  brand_intensity: BrandIntensity
  colors?: ColorSelection
  typography?: TypographySelection
  voice?: VoiceSelection
}
selectedMediaAssets: MediaAsset[]
mediaAssetPlacements: AssetPlacement[]
```

### Data Flow
1. User selects platform → filters asset types
2. User selects asset type
3. User optionally selects brand kit
4. User chooses prompt method (Manual or Coach)
5. If Manual:
   - User enters prompt
   - User customizes brand options
   - User optionally adds media assets
   - Call `useGenerateAsset()` with full customization
6. If Coach:
   - Switch to coach tab via `onNavigateToCoach()`

### Key Types
```typescript
type CreatePhase = 'select' | 'prompt' | 'coach';
type Platform = 'general' | 'twitch' | 'youtube' | 'tiktok';

interface BrandCustomizationValue {
  include_logo: boolean;
  logo_type: LogoType;
  logo_position: LogoPosition;
  logo_size: LogoSize;
  brand_intensity: BrandIntensity;
  colors?: ColorSelection;
  typography?: TypographySelection;
  voice?: VoiceSelection;
}

interface ColorSelection {
  primary_index: number;
  secondary_index: number;
  accent_index: number;
  use_gradient: boolean;
}

interface TypographySelection {
  headline_level: TypographyLevel;
  body_level: TypographyLevel;
}

interface VoiceSelection {
  use_tagline: boolean;
  use_catchphrase: boolean;
}
```

### API Hooks Used
- `useBrandKits()` - List user's brand kits
- `useLogos(brandKitId)` - Check if logo exists
- `useGenerateAsset()` - Create generation job
- `useGenerateTwitchAsset()` - Twitch-specific generation

### Endpoints
- `GET /api/v1/brand-kits` - List brand kits
- `GET /api/v1/brand-kits/{id}/logos` - Get logos
- `POST /api/v1/generate` - Create generation job
- `POST /api/v1/twitch/generate` - Twitch-specific generation

---

## METHOD 3: AI COACH (Premium)

### Current Component Structure
```
CoachPageContent.tsx
├── Phase: context
│   ├── Usage indicator (remaining sessions)
│   └── CoachContextForm.tsx
│       ├── Brand kit selector
│       ├── Asset type selector
│       ├── Mood selector (hype, cozy, rage, chill, custom)
│       ├── Game selector (optional)
│       └── Description textarea
└── Phase: chat
    ├── ChatHeader (back button)
    └── CoachChatIntegrated.tsx (New UX 2025)
        ├── SSE streaming messages
        ├── Grounding status
        ├── Validation feedback
        └── Generate button when ready
```

### State Management
```typescript
// CoachPageContent state
phase: CoachPhase = 'context' | 'chat'
sessionId: string | null
contextRequest: StartCoachRequest | null
isStartingSession: boolean

// CoachChatIntegrated state (via useCoachChat hook)
messages: CoachMessage[]
streamingStage: 'idle' | 'grounding' | 'streaming' | 'done'
isGenerationReady: boolean
refinedPrompt: string
```

### Data Flow
1. User fills context form (brand kit, asset type, mood, description)
2. Call `POST /api/v1/coach/start` with SSE streaming
3. Backend streams:
   - `grounding` - Searching for context
   - `grounding_complete` - Search done
   - `token` - Response tokens
   - `intent_ready` - Prompt validation complete
   - `done` - Session created with session_id
4. User can send refinement messages
5. Call `POST /api/v1/coach/sessions/{id}/messages` with SSE
6. When ready, user clicks "Generate Now"
7. Call `POST /api/v1/coach/sessions/{id}/generate`
8. Redirect to `/dashboard/generate/{jobId}`

### Key Types
```typescript
interface StartCoachRequest {
  brandContext?: CoachBrandContext;
  assetType: CoachAssetType;
  mood: CoachMood;
  customMood?: string;
  gameId?: string;
  gameName?: string;
  description: string;
}

interface CoachBrandContext {
  brandKitId?: string;
  colors: CoachColorInfo[];
  tone: string;
  fonts?: CoachFontInfo;
  logoUrl?: string;
}

type CoachMood = 'hype' | 'cozy' | 'rage' | 'chill' | 'custom';

type CoachStreamChunkType = 
  | 'token'
  | 'intent_ready'
  | 'grounding'
  | 'grounding_complete'
  | 'done'
  | 'error';
```

### API Hooks Used
- `useBrandKits()` - List user's brand kits
- `useUsageStatus()` - Check coach session limits
- `useCoachChat()` - SSE streaming hook

### Endpoints
- `GET /api/v1/coach/tips` - Get static tips (all tiers)
- `GET /api/v1/coach/access` - Check tier access
- `POST /api/v1/coach/start` - Start session (SSE)
- `POST /api/v1/coach/sessions/{id}/messages` - Continue chat (SSE)
- `GET /api/v1/coach/sessions/{id}` - Get session state
- `POST /api/v1/coach/sessions/{id}/end` - End session
- `POST /api/v1/coach/sessions/{id}/generate` - Generate from session



---

## UNIFIED GENERATION ENDPOINT

All three methods converge on `POST /api/v1/generate`:

### Request Schema (Backend)
```python
class GenerateRequest(BaseModel):
    asset_type: str
    brand_kit_id: Optional[str] = None  # OPTIONAL
    custom_prompt: Optional[str] = None
    brand_customization: Optional[BrandCustomization] = None
    media_asset_ids: Optional[List[str]] = None  # Max 2
    media_asset_placements: Optional[List[SerializedPlacement]] = None
    # Legacy logo options (deprecated)
    include_logo: Optional[bool] = None
    logo_position: Optional[LogoPosition] = None
    logo_size: Optional[LogoSize] = None
    logo_type: Optional[LogoType] = None
```

### Request Type (Frontend)
```typescript
interface GenerateRequest {
  assetType: AssetType;
  brandKitId?: string;
  customPrompt?: string;
  brandCustomization?: BrandCustomization;
  mediaAssetIds?: string[];
  mediaAssetPlacements?: SerializedPlacement[];
  includeLogo?: boolean;
  logoPosition?: LogoPosition;
  logoSize?: LogoSize;
  logoType?: LogoType;
}
```

### Response Schema
```typescript
interface JobResponse {
  id: string;
  userId: string;
  brandKitId: string | null;  // NULLABLE
  assetType: AssetType;
  status: JobStatus;
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'partial';
```

---

## ASSET TYPES REFERENCE

### General Asset Types
```typescript
type AssetType = 
  | 'thumbnail'
  | 'overlay'
  | 'banner'
  | 'story_graphic'
  | 'clip_cover'
  | 'profile_picture'
  | 'streamer_logo';
```

### Twitch Asset Types
```typescript
type TwitchAssetType =
  | 'twitch_emote'
  | 'twitch_emote_112'
  | 'twitch_emote_56'
  | 'twitch_emote_28'
  | 'twitch_badge'
  | 'twitch_panel'
  | 'twitch_offline';
```

### TikTok Asset Types
```typescript
type TikTokAssetType =
  | 'tiktok_emote'
  | 'tiktok_emote_300'
  | 'tiktok_emote_200'
  | 'tiktok_emote_100';
```

### Coach Asset Types (Extended)
```typescript
type CoachAssetType =
  | 'thumbnail'
  | 'overlay'
  | 'banner'
  | 'story_graphic'
  | 'clip_cover'
  | 'twitch_emote'
  | 'twitch_badge'
  | 'twitch_panel'
  | 'twitch_offline'
  | 'youtube_thumbnail'
  | 'twitch_banner'
  | 'tiktok_story'
  | 'instagram_story'
  | 'instagram_reel';
```

---

## TIER ACCESS & LIMITS

### Free Tier
- 3 creations/month
- 1 Coach trial session per 28 days
- No grounding
- No media library

### Pro Tier
- 50 creations/month
- Unlimited Coach sessions
- Grounding enabled
- Media library access (max 2 assets)

### Studio Tier
- Unlimited creations
- Unlimited Coach sessions
- Grounding enabled
- Media library access (max 2 assets)

### Rate Limits
- Coach sessions: 20 per user per hour
- Coach messages: 10 per user per minute

---

## ERROR HANDLING

### Error Classification (useGeneration.ts)
```typescript
type GenerationErrorCode = 
  | 'GENERATION_RATE_LIMIT'      // 429 - Retry after cooldown
  | 'GENERATION_LIMIT_EXCEEDED'  // 403 - Upgrade required
  | 'GENERATION_FAILED'          // Generic failure
  | 'GENERATION_TIMEOUT'         // 408 - Retryable
  | 'GENERATION_CONTENT_POLICY'  // Content violation
  | 'NETWORK_ERROR'              // Fetch failed
  | 'UNKNOWN_ERROR';             // Fallback

interface ClassifiedError {
  code: GenerationErrorCode;
  message: string;
  retryable: boolean;
  retryAfter?: number;
}
```

### Error UI Patterns
- Rate limit: Countdown timer + retry button
- Limit exceeded: Upgrade CTA
- Content policy: Adjust prompt message
- Timeout/Network: Retry button
- Unknown: Generic retry



---

## UI REDESIGN REQUIREMENTS

Based on the reference screenshots, the new design requires:

### 1. Method Selector Cards (Top Section)
Replace tabs with three horizontal cards:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CHOOSE YOUR CREATION METHOD                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ ⚡ Quick Create  │  │ ✨ Build Your Own│  │ 🤖 AI Coach PRO │      │
│  │                  │  │                  │  │                  │      │
│  │ Pick a template, │  │ Full control over│  │ Get AI guidance  │      │
│  │ add your vibe,   │  │ every detail of  │  │ to craft the     │      │
│  │ done in seconds. │  │ your asset.      │  │ perfect prompt.  │      │
│  │                  │  │                  │  │                  │      │
│  │ [✓ Selected]     │  │                  │  │                  │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Quick Create Section (Below Cards)
When Quick Create is selected:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚡ Quick Create                                                        │
│  Professional templates, instant results                                │
├─────────────────────────────────────────────────────────────────────────┤
│  ① Choose Template    ② Customize    ③ Review                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
├─────────────────────────────────────────────────────────────────────────┤
│  [✨ All] [📺 Stream] [📱 Social] [💜 Twitch] [🎨 Branding]             │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │ 🔴 Going   │ │ 📅 Weekly  │ │ 📅 Weekly  │ │ 📅 Weekly  │           │
│  │    Live    │ │  Schedule  │ │  Schedule  │ │  Schedule  │           │
│  │ 1080x1920  │ │ 1200x480   │ │ 1080x1080  │ │ 1920x1080  │           │
│  │ Stream     │ │ Stream     │ │ Social     │ │ Twitch     │           │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │ 🎬 Twitch  │ │ 📝 Accent  │ │ 📺 Twitch  │ │ 📱 Social  │           │
│  │   Stream   │ │   Note     │ │   Media    │ │   Media    │           │
│  │ 1080x1920  │ │ 1080x1920  │ │ 1080x1920  │ │ 1080x1920  │           │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. New Components Required

#### MethodSelectorCard.tsx
```typescript
interface MethodSelectorCardProps {
  method: 'quick' | 'custom' | 'coach';
  title: string;
  description: string;
  icon: React.ReactNode;
  isSelected: boolean;
  isPro?: boolean;
  onClick: () => void;
}
```

#### MethodSelector.tsx
```typescript
interface MethodSelectorProps {
  selectedMethod: 'quick' | 'custom' | 'coach';
  onMethodChange: (method: 'quick' | 'custom' | 'coach') => void;
  isPremiumUser: boolean;
}
```

#### CreateStudioLayout.tsx (New Container)
```typescript
interface CreateStudioLayoutProps {
  children: React.ReactNode;
}
// Replaces UnifiedCreateFlow with card-based method selection
```

---

## FILES TO MODIFY

### ✅ COMPLETED
1. `tsx/apps/web/src/components/create/UnifiedCreateFlow.tsx`
   - Replaced tab navigation with card-based method selector
   - Maintains lazy loading for method content
   - Supports both `?method=` and legacy `?tab=` URL params

2. `tsx/apps/web/src/components/create/index.ts`
   - Added exports for new components

### ✅ NEW COMPONENTS CREATED
1. `tsx/apps/web/src/components/create/MethodSelectorCard.tsx`
   - Individual card component with selection state
   - PRO badge support
   - Framer Motion animations
   - ARIA-compliant

2. `tsx/apps/web/src/components/create/MethodSelector.tsx`
   - Card grid container
   - Three methods: Quick Create, Build Your Own, AI Coach
   - Premium user detection

3. `tsx/apps/web/src/components/create/CreateStudioHeader.tsx`
   - Page header with icon and description

### NO CHANGES REQUIRED (Verified)
- `tsx/packages/api-client/src/hooks/useGeneration.ts` - Already handles all methods
- `tsx/packages/api-client/src/types/generation.ts` - Type definitions stable
- `backend/api/schemas/generation.py` - All parameters correctly defined
- `backend/api/schemas/coach.py` - All parameters correctly defined
- `backend/api/routes/generation.py` - Endpoints unchanged
- `backend/api/routes/coach.py` - Endpoints unchanged

---

## REGRESSION CHECKLIST

### Quick Create
- [ ] Template selection works
- [ ] Category filtering works
- [ ] Vibe selection works
- [ ] Dynamic fields load from backend
- [ ] Brand kit selection works
- [ ] Logo options work when brand kit selected
- [ ] Media asset picker works (Pro/Studio)
- [ ] Generation creates job
- [ ] Redirect to progress page works
- [ ] Error handling shows correct CTAs

### Build Your Own
- [ ] Platform filtering works
- [ ] Asset type selection works
- [ ] Brand kit selection works
- [ ] Prompt input works
- [ ] Brand customization works
- [ ] Media asset picker works (Pro/Studio)
- [ ] Generation creates job
- [ ] Redirect to progress page works
- [ ] Error handling shows correct CTAs

### AI Coach
- [ ] Usage indicator shows for limited users
- [ ] Context form works
- [ ] SSE streaming works
- [ ] Grounding status shows
- [ ] Message sending works
- [ ] Generation ready state works
- [ ] Generate from session works
- [ ] Redirect to progress page works
- [ ] Back to context works

### Cross-Cutting
- [ ] URL state preserved (`?tab=` or `?method=`)
- [ ] Scroll position preserved on method switch
- [ ] Lazy loading works
- [ ] Error boundaries work
- [ ] Keyboard navigation works
- [ ] ARIA labels correct
- [ ] Reduced motion respected

---

## IMPLEMENTATION NOTES

### URL State Migration
Current: `?tab=templates|custom|coach`
New: `?method=quick|custom|coach` (or keep `tab` for backwards compat)

### Animation Considerations
- Card selection: Scale + border highlight
- Content transition: Fade + slide (respect reduced motion)
- Step indicator: Progress bar animation

### Accessibility
- Cards must be keyboard navigable
- Selected state announced to screen readers
- PRO badge must have accessible label
- Focus management on method change

---

*This audit provides the complete picture of the Create Studio module for the UI redesign. All endpoints, types, and data flows are documented to prevent regression.*
