# 🎨 CREATE STUDIO MASTER SCHEMA
## Comprehensive API & Component Reference

**Version:** 1.0.0  
**Last Updated:** December 31, 2025  
**Purpose:** Single source of truth for Create Studio development - prevents regression

---

## OVERVIEW

Create Studio is a unified 3-panel asset creation experience that integrates:

| Mode | Usage | Description | Source Component |
|------|-------|-------------|------------------|
| **Quick Templates** | 50% | Pre-built templates with vibes | `QuickCreateWizard.tsx` |
| **Build Your Own** | 1% | Custom prompt creation | `CreatePageContent.tsx` |
| **AI Coach** | 49% | Guided prompt refinement | `CoachPageContent.tsx` |

---

## API ENDPOINTS INVENTORY

### Generation Endpoints (`/api/v1`)

| Method | Endpoint | Description | Auth | Rate Limit |
|--------|----------|-------------|------|------------|
| `POST` | `/generate` | Create generation job | JWT | Tier-based |
| `GET` | `/jobs` | List user's jobs | JWT | - |
| `GET` | `/jobs/{id}` | Get job status | JWT | - |
| `GET` | `/jobs/{id}/assets` | Get job assets | JWT | - |
| `GET` | `/jobs/{id}/stream` | SSE progress stream | JWT | - |

### Twitch Endpoints (`/api/v1/twitch`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/generate` | Generate Twitch asset | JWT |
| `POST` | `/packs` | Generate asset pack | JWT |
| `GET` | `/packs/{id}` | Get pack status | JWT |
| `GET` | `/dimensions` | Get Twitch dimensions | JWT |

### Coach Endpoints (`/api/v1/coach`)

| Method | Endpoint | Description | Auth | Rate Limit |
|--------|----------|-------------|------|------------|
| `GET` | `/tips` | Get static tips | JWT | - |
| `GET` | `/access` | Check tier access | JWT | - |
| `POST` | `/start` | Start session (SSE) | JWT | 20/hour |
| `POST` | `/sessions/{id}/messages` | Continue chat (SSE) | JWT | 10/min |
| `GET` | `/sessions/{id}` | Get session state | JWT | - |
| `POST` | `/sessions/{id}/end` | End session | JWT | - |
| `POST` | `/sessions/{id}/generate` | Generate from session | JWT | Tier-based |

### Templates Endpoints (`/api/v1/templates`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/` | List all templates | JWT |
| `GET` | `/{id}` | Get template metadata | JWT |

---

## REQUEST/RESPONSE SCHEMAS

### GenerateRequest (POST /generate)

```typescript
// Frontend (camelCase)
interface GenerateRequest {
  assetType: AssetTypeEnum;
  brandKitId?: string | null;
  customPrompt?: string | null;
  brandCustomization?: BrandCustomization | null;
}

interface BrandCustomization {
  colors?: ColorSelection | null;
  typography?: TypographySelection | null;
  voice?: VoiceSelection | null;
  includeLogo: boolean;
  logoType: LogoTypeEnum;
  logoPosition: LogoPositionEnum;
  logoSize: LogoSizeEnum;
  brandIntensity: BrandIntensityEnum;
}
```

```python
# Backend (snake_case)
class GenerateRequest(BaseModel):
    asset_type: AssetTypeEnum
    brand_kit_id: Optional[str] = None
    custom_prompt: Optional[str] = Field(None, max_length=500)
    brand_customization: Optional[BrandCustomization] = None
```

### JobResponse

```typescript
// Frontend
interface Job {
  id: string;
  userId: string;
  brandKitId: string | null;  // NULLABLE
  assetType: AssetTypeEnum;
  status: JobStatusEnum;
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}
```

### StartCoachRequest (POST /coach/start)

```typescript
// Frontend
interface StartCoachRequest {
  brandContext?: BrandContext | null;  // OPTIONAL
  assetType: CoachAssetTypeEnum;
  mood: MoodEnum;
  customMood?: string | null;
  gameId?: string | null;
  gameName?: string | null;
  description: string;
}

interface BrandContext {
  brandKitId?: string | null;
  colors: ColorInfo[];
  tone: string;
  fonts?: FontInfo | null;
  logoUrl?: string | null;
}
```

```python
# Backend
class StartCoachRequest(BaseModel):
    brand_context: Optional[BrandContext] = Field(default_factory=BrandContext)
    asset_type: AssetTypeEnum
    mood: MoodEnum
    custom_mood: Optional[str] = Field(None, max_length=100)
    game_id: Optional[str] = None
    game_name: Optional[str] = Field(None, max_length=100)
    description: str = Field(..., min_length=5, max_length=500)
```

---

## TYPE DEFINITIONS

### AssetTypeEnum (Generation)

```typescript
type AssetTypeEnum =
  | 'thumbnail'
  | 'overlay'
  | 'banner'
  | 'story_graphic'
  | 'clip_cover'
  // Twitch emotes
  | 'twitch_emote'
  | 'twitch_emote_112'
  | 'twitch_emote_56'
  | 'twitch_emote_28'
  // TikTok emotes
  | 'tiktok_emote'
  | 'tiktok_emote_300'
  | 'tiktok_emote_200'
  | 'tiktok_emote_100'
  // Other Twitch
  | 'twitch_badge'
  | 'twitch_panel'
  | 'twitch_offline'
  // Profile
  | 'profile_picture'
  | 'streamer_logo';
```

### CoachAssetTypeEnum

```typescript
// Matches backend coach.py AssetTypeEnum
type CoachAssetTypeEnum =
  // General asset types (matching generation.py)
  | 'thumbnail'
  | 'overlay'
  | 'banner'
  | 'story_graphic'
  | 'clip_cover'
  // Twitch-specific asset types
  | 'twitch_emote'
  | 'twitch_badge'
  | 'twitch_panel'
  | 'twitch_offline'
  // Legacy/extended types for backwards compatibility
  | 'youtube_thumbnail'
  | 'twitch_banner'
  | 'tiktok_story'
  | 'instagram_story'
  | 'instagram_reel';
```

### MoodEnum

```typescript
type MoodEnum = 'hype' | 'cozy' | 'rage' | 'chill' | 'custom';
```

### JobStatusEnum

```typescript
type JobStatusEnum = 'queued' | 'processing' | 'completed' | 'failed' | 'partial';
```

### LogoPositionEnum

```typescript
type LogoPositionEnum = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
```

### LogoSizeEnum

```typescript
type LogoSizeEnum = 'small' | 'medium' | 'large';
```

### BrandIntensityEnum

```typescript
type BrandIntensityEnum = 'subtle' | 'balanced' | 'strong';
```

---

## QUICK CREATE TEMPLATES

### Template Categories

```typescript
type TemplateCategory = 'all' | 'stream' | 'social' | 'twitch';
```

### Available Templates (9 total)

| ID | Name | Category | Asset Type | Dimensions |
|----|------|----------|------------|------------|
| `going-live` | Going Live | stream | story_graphic | 1080×1920 |
| `schedule` | Weekly Schedule | stream | banner | 1200×480 |
| `starting-soon` | Starting Soon | stream | overlay | 1920×1080 |
| `clip-highlight` | Clip Highlight | social | clip_cover | 1080×1080 |
| `milestone` | Milestone | social | story_graphic | 1080×1920 |
| `thumbnail` | YouTube Thumbnail | social | thumbnail | 1280×720 |
| `emote` | Custom Emote | twitch | twitch_emote | 112×112 |
| `panel` | Channel Panel | twitch | twitch_panel | 320×160 |
| `offline` | Offline Screen | twitch | twitch_offline | 1920×1080 |

### Vibe Presets

**Standard Vibes:**
- `pro` - Pro Aesthetic
- `anime` - Anime Hype
- `playful` - 3D Playful

**Emote Vibes (12 total):**
- `glossy` - 3D Glossy
- `pixel` - Pixel Classic
- `modern-pixel` - Modern 64-Bit
- `elite-glass` - Elite Glass
- `halftone-pop` - Halftone Pop
- `marble-gold` - Marble & Gold
- `cozy` - Cozy Doodle
- `retro` - Retro 90s
- `anime` - Cel-Shaded
- `vaporwave` - Vaporwave
- `tactical` - Tactical Patch
- `kawaii` - Kawaii Blob

**Thumbnail Vibes (9 total):**
- `aesthetic-pro` - Aesthetic Pro
- `viral-hype` - Viral Hype
- `anime-cinematic` - Anime Cinematic
- `playful-3d` - Playful 3D
- `after-dark` - After Dark
- `color-pop` - Color Pop
- `pro` - Shock Face
- `anime` - The Duel
- `playful` - Cartoon Pop

### Template Field Types

```typescript
interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'time' | 'dynamic_select' | 'color';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  maxLength?: number;
  hint?: string;
  description?: string;
  default?: string;
  dependsOn?: string;
  optionsMap?: Record<string, { value: string; label: string }[]>;
  showForVibes?: string[];
}
```

---

## SSE STREAMING EVENTS

### Coach SSE Chunk Types

```typescript
// Backend StreamChunkTypeEnum
type StreamChunkTypeEnum =
  | 'token'           // Response token
  | 'intent_ready'    // Intent parsed
  | 'grounding'       // Searching game context
  | 'grounding_complete' // Search done
  | 'done'            // Session complete
  | 'error';          // Error occurred

// Frontend also handles:
// | 'validation'     // Prompt validation results (frontend-only)
// | 'redirect'       // Redirect instruction (frontend-only)
// | 'usage_info'     // Usage info from backend
```

### Generation SSE Events

```typescript
type GenerationEventType =
  | 'progress'   // Progress update
  | 'completed'  // Job done with asset
  | 'failed'     // Job failed
  | 'heartbeat'  // Keep-alive
  | 'timeout'    // Max wait exceeded
  | 'error';     // Error occurred
```

---

## TIER ACCESS MATRIX

| Feature | Free | Pro | Studio |
|---------|------|-----|--------|
| Quick Templates | ✅ 3/month | ✅ 50/month | ✅ Unlimited |
| Build Your Own | ✅ 3/month | ✅ 50/month | ✅ Unlimited |
| AI Coach | ✅ 3/month | ✅ 50/month | ✅ Unlimited |
| Grounding (Game Context) | ❌ | ❌ | ✅ |
| Logo Overlay | ✅ | ✅ | ✅ |

---

## DATABASE TABLES

### generation_jobs

```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES users(id)
parent_job_id UUID REFERENCES generation_jobs(id)
status TEXT DEFAULT 'queued'
job_type TEXT DEFAULT 'single'
asset_type TEXT NOT NULL
custom_prompt TEXT
brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE SET NULL
platform_context JSONB
total_assets INTEGER DEFAULT 1
completed_assets INTEGER DEFAULT 0
failed_assets INTEGER DEFAULT 0
queued_at TIMESTAMPTZ DEFAULT NOW()
started_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
error_message TEXT
retry_count INTEGER DEFAULT 0
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

### assets

```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES users(id)
job_id UUID NOT NULL REFERENCES generation_jobs(id)
brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE SET NULL
asset_type TEXT NOT NULL
width INTEGER NOT NULL
height INTEGER NOT NULL
format TEXT DEFAULT 'png'
url TEXT NOT NULL
storage_path TEXT
file_size BIGINT
is_public BOOLEAN DEFAULT TRUE
prompt_used TEXT
generation_params JSONB
viral_score INTEGER
created_at TIMESTAMPTZ DEFAULT NOW()
```

---

## COMPONENT STRUCTURE

```
tsx/apps/web/src/components/create-studio/
├── index.ts                 # Barrel exports
├── CreateStudio.tsx         # Main 3-panel container
├── ModeSelector.tsx         # Mode tabs (Templates/Custom/Coach)
├── TemplatePanel.tsx        # Quick Templates wrapper
├── CustomPanel.tsx          # Build Your Own wrapper
├── CoachPanel.tsx           # AI Coach wrapper
├── PreviewPanel.tsx         # Live preview sidebar
├── useCreateStudio.ts       # State management hook
└── types.ts                 # TypeScript definitions
```

---

## DESIGN TOKENS (from design.md)

```css
/* Primary surfaces */
--background-base: #1F2121;
--background-surface: #262828;
--background-elevated: #2E3030;

/* Interactive */
--interactive-600: #21808D;
--interactive-500: #1B6A75;
--interactive-400: #32B8C6;

/* Text */
--text-primary: #FCFCF9;
--text-secondary: #A7A9A9;
--text-tertiary: #777C7C;

/* Borders */
--border-subtle: rgba(167, 169, 169, 0.12);
--border-default: rgba(167, 169, 169, 0.20);

/* Accent */
--accent-coral: #A84F2F;
--success: #218081;
--error: #C0152F;
```

---

## CRITICAL RULES

1. **brandKitId is ALWAYS OPTIONAL** - Users can generate without a brand kit
2. **brandContext is OPTIONAL for Coach** - Empty context uses defaults
3. **Usage counted on generation, not session start** - Coach sessions don't consume quota
4. **snake_case ↔ camelCase transformation** - Backend uses snake_case, frontend uses camelCase
5. **SSE streams must handle all event types** - Including heartbeat and error
6. **Tier limits enforced server-side** - Frontend shows UI feedback only

---

## CHECKLIST FOR CHANGES

- [ ] All API calls use correct endpoint paths
- [ ] Request bodies match schema exactly
- [ ] Optional fields marked as optional
- [ ] Nullable fields use `| null` in TypeScript
- [ ] SSE event handlers cover all types
- [ ] Error states handled gracefully
- [ ] Loading states shown during async ops
- [ ] Tier access checked before premium features

---

*This schema is the single source of truth for Create Studio development.*
