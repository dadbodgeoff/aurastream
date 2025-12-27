# Quick Create Templates Module - Architecture Audit

## Overview
This document audits existing patterns to design a "Quick Create" module that provides pre-engineered templates for streamlined asset generation.

---

## ✅ Brand Kit Injection Verification (COMPLETED)

### Summary
The existing system **already handles brand kit injection correctly**. When a brand kit is provided, all extended fields are injected into the prompt. When no brand kit is provided, the system gracefully falls back to AI creative defaults.

### How It Works

**1. `generation_service.create_job()` (lines 210-270)**
```python
if brand_kit:
    prompt = prompt_engine.build_prompt_v2(
        asset_type=AssetType(asset_type),
        brand_kit=brand_kit,  # Full brand kit dict
        customization=brand_customization,
        custom_prompt=custom_prompt
    )
else:
    # No brand kit - use AI defaults
    prompt = prompt_engine.build_prompt_no_brand(
        asset_type=AssetType(asset_type),
        custom_prompt=custom_prompt
    )
```

**2. `BrandContextResolver.resolve()` handles all fields gracefully:**

| Field | Source | Fallback |
|-------|--------|----------|
| `colors_extended.primary` | Extended colors | `primary_colors` basic array |
| `colors_extended.secondary` | Extended colors | Empty array |
| `colors_extended.accent` | Extended colors | `accent_colors` basic array |
| `colors_extended.gradients` | Extended colors | Empty array |
| `typography.{level}` | Typography config | `fonts.headline` basic |
| `voice.tone` | Voice config | `tone` basic field |
| `voice.tagline` | Voice config | Skipped if not set |
| `voice.catchphrases` | Voice config | Skipped if not set |

**3. All `.get()` calls use safe defaults** - no crashes on missing data.

### Conclusion
✅ **No backend changes needed** for Quick Create templates. The existing `POST /generate` endpoint with optional `brand_kit_id` handles everything correctly.

---

## Existing Patterns Analysis

### 1. Frontend Page Structure

**Location:** `tsx/apps/web/src/app/dashboard/`

**Pattern:**
- Each feature has its own folder: `generate/`, `twitch/`, `brand-kits/`, etc.
- Single `page.tsx` file per feature
- Uses `'use client'` directive for client-side rendering
- Imports from `@streamer-studio/api-client` for hooks and types
- Uses `@streamer-studio/shared` for user context
- Uses local `@/lib/utils` for `cn()` utility

**Reusable Components:**
```tsx
// SectionCard - consistent card styling
function SectionCard({ children, className }) {
  return (
    <div className={cn(
      "bg-background-surface/50 backdrop-blur-sm border border-border-subtle rounded-2xl p-6",
      className
    )}>
      {children}
    </div>
  );
}

// Step indicators with numbered badges
<span className="w-8 h-8 rounded-lg bg-interactive-600/10 text-interactive-600 flex items-center justify-center text-sm font-bold">1</span>
```

**Icons:** Defined inline as SVG components (SparklesIcon, CheckIcon, ImageIcon, etc.)

---

### 2. API Client Structure

**Location:** `tsx/packages/api-client/src/`

**Types:** `types/generation.ts`, `types/twitch.ts`
```typescript
// Request types use camelCase
export interface GenerateRequest {
  assetType: AssetType;
  brandKitId?: string;
  customPrompt?: string;
  brandCustomization?: BrandCustomization;
}

// Response types match backend snake_case transformed to camelCase
export interface JobResponse {
  id: string;
  userId: string;
  brandKitId: string;
  // ...
}
```

**Hooks:** `hooks/useGeneration.ts`, `hooks/useTwitch.ts`
```typescript
// Query keys pattern
export const generationKeys = {
  all: ['generation'] as const,
  jobs: () => [...generationKeys.all, 'jobs'] as const,
  job: (id: string) => [...generationKeys.jobs(), id] as const,
};

// Mutation pattern
export function useGenerateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateRequest) => {
      // Transform camelCase to snake_case for API
      const transformedData = { ... };
      return apiClient.generation.create(transformedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: generationKeys.jobs() });
    },
  });
}
```

---

### 3. Backend Route Structure

**Location:** `backend/api/routes/`

**Pattern:**
```python
router = APIRouter()

@router.post(
    "/generate",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create generation job",
)
async def create_generation_job(
    request: Request,
    data: GenerateRequest,
    current_user: TokenPayload = Depends(get_current_user),
) -> JobResponse:
    # 1. Get service
    service = get_generation_service()
    
    # 2. Build parameters from request
    parameters = {}
    if data.brand_customization:
        # Extract customization options
        
    # 3. Create job
    job = await service.create_job(...)
    
    # 4. Enqueue for background processing
    enqueue_generation_job(job.id, current_user.sub)
    
    # 5. Audit log
    audit = get_audit_service()
    await audit.log(...)
    
    return _job_to_response(job)
```

---

### 4. Backend Schema Structure

**Location:** `backend/api/schemas/`

**Pattern:**
```python
from pydantic import BaseModel, Field

class GenerateRequest(BaseModel):
    asset_type: AssetTypeEnum = Field(..., description="Type of asset")
    brand_kit_id: Optional[str] = Field(None, description="Brand kit ID")
    custom_prompt: Optional[str] = Field(None, max_length=500)
    brand_customization: Optional[BrandCustomization] = Field(default=None)
```

---

### 5. Prompt Engine Structure

**Location:** `backend/services/prompt_engine.py`

**Key Classes:**
- `AssetType` - Enum of supported asset types
- `PromptTemplate` - Dataclass for YAML templates
- `BrandKitContext` - Brand kit data for injection
- `ResolvedBrandContext` - Resolved values for prompt
- `BrandContextResolver` - Resolves user selections to values

**Template Location:** `backend/prompts/{asset_type}/v1.0.yaml`

**Template Structure:**
```yaml
name: thumbnail
version: "1.0"
base_prompt: |
  Create a YouTube thumbnail with {tone} style.
  Use colors: {primary_colors}.
  ...
quality_modifiers:
  - "high quality"
  - "professional"
placeholders:
  - tone
  - primary_colors
```

---

## What Can Be Reused

### Frontend (No Changes Needed)
1. ✅ `useBrandKits()` - List brand kits
2. ✅ `useBrandKit(id)` - Get single brand kit
3. ✅ `useLogos(brandKitId)` - Get logos
4. ✅ `useGenerateAsset()` - Create generation job
5. ✅ `useJob(jobId)` - Poll job status
6. ✅ `SectionCard` component pattern
7. ✅ Step indicator pattern
8. ✅ Brand kit selector pattern
9. ✅ Logo options pattern

### Backend (No Changes Needed)
1. ✅ `POST /generate` endpoint - Already supports optional brand_kit_id
2. ✅ `generation_service.create_job()` - Already handles optional brand kit
3. ✅ `prompt_engine.build_prompt_no_brand()` - For AI defaults
4. ✅ `prompt_engine.build_prompt_v2()` - For brand kit prompts
5. ✅ Job/Asset database schema
6. ✅ Background worker infrastructure

---

## What Needs to Be Added

### Frontend
1. **New Page:** `tsx/apps/web/src/app/dashboard/quick-create/page.tsx`
   - Template selection UI
   - Form fields based on template
   - Preview/recap before generation
   
2. **New Types:** `tsx/packages/api-client/src/types/templates.ts`
   - Template definitions
   - Template field types

### Backend (Minimal)
1. **New Endpoint (Optional):** `GET /templates` - List available templates
   - Could be static on frontend instead
   
2. **New Prompt Templates:** `backend/prompts/templates/`
   - Pre-engineered prompts for each template type

---

## Proposed Template Structure

### Template Definition (Frontend)
```typescript
interface QuickTemplate {
  id: string;
  name: string;
  description: string;
  category: 'stream' | 'social' | 'branding';
  assetType: AssetType | TwitchAssetType;
  fields: TemplateField[];
  previewImage?: string;
  promptTemplate: string; // Pre-engineered prompt with {placeholders}
}

interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'time' | 'toggle';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  maxLength?: number;
}
```

### Example Templates
```typescript
const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: 'going-live',
    name: 'Going Live Announcement',
    description: 'Stream announcement with schedule',
    category: 'stream',
    assetType: 'story_graphic',
    fields: [
      { id: 'streamTitle', label: 'Stream Title', type: 'text', required: true },
      { id: 'game', label: 'Game', type: 'text' },
      { id: 'time', label: 'Stream Time', type: 'time' },
      { id: 'platform', label: 'Platform', type: 'select', options: [...] },
    ],
    promptTemplate: 'Going live announcement for "{streamTitle}" streaming {game} at {time} on {platform}. Dynamic, exciting composition with bold text.',
  },
  // ... more templates
];
```

---

## Implementation Plan

### Phase 1: Frontend Only (Recommended Start)
1. Create template definitions as constants
2. Build Quick Create page with wizard flow
3. Use existing `useGenerateAsset()` hook
4. Construct prompt from template + user inputs
5. Show recap before generation

### Phase 2: Backend Enhancement (Optional)
1. Add `/templates` endpoint if dynamic templates needed
2. Add template-specific prompt files
3. Add template analytics/tracking

---

## Key Decisions

1. **Templates stored where?**
   - Recommendation: Frontend constants initially
   - Can move to backend later if needed for dynamic updates

2. **Prompt construction where?**
   - Recommendation: Frontend constructs final prompt from template
   - Backend receives as `custom_prompt`

3. **Brand kit required?**
   - Recommendation: Optional (already supported)
   - Templates work with or without brand kit

4. **Asset types supported?**
   - All existing: thumbnail, overlay, banner, story_graphic, clip_cover
   - Plus Twitch types: emote, badge, panel, offline, banner


---

## Detailed Implementation Plan

### File Structure
```
tsx/apps/web/src/app/dashboard/quick-create/
├── page.tsx              # Main Quick Create page
├── constants.ts          # Template definitions
└── types.ts              # TypeScript types (optional, can use api-client)
```

### Template Categories & Examples

#### 1. Stream Templates
| Template | Asset Type | Fields |
|----------|------------|--------|
| Going Live | story_graphic | title, game, time, platform |
| Stream Schedule | banner | days[], times[], games[] |
| Raid Thank You | overlay | raider_name, viewer_count |
| Sub Goal | overlay | current, goal, reward |

#### 2. Social Templates  
| Template | Asset Type | Fields |
|----------|------------|--------|
| Clip Highlight | clip_cover | clip_title, game |
| Milestone | story_graphic | milestone_type, count |
| Collab Announcement | banner | partner_name, date, game |
| Poll/Question | story_graphic | question, options[] |

#### 3. Twitch-Specific Templates
| Template | Asset Type | Fields |
|----------|------------|--------|
| Emote Pack | emote | emotion, style |
| Sub Badge Set | badge | tier, theme |
| Panel Set | panel | panel_type, content |
| Offline Screen | offline | message, schedule |

### Wizard Flow (3 Steps)

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Choose Template                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│  │ Going   │ │ Stream  │ │ Clip    │  ...                   │
│  │ Live    │ │ Schedule│ │ Cover   │                        │
│  └─────────┘ └─────────┘ └─────────┘                        │
│                                                              │
│  Categories: [Stream] [Social] [Twitch] [All]               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Fill Details                                        │
│                                                              │
│  Stream Title: [________________________]                    │
│  Game:         [Valorant            ▼]                      │
│  Time:         [7:00 PM EST]                                │
│  Platform:     ○ Twitch  ○ YouTube  ○ Kick                  │
│                                                              │
│  Brand Kit:    [My Brand Kit ▼] or [Skip - AI decides]      │
│  Include Logo: [✓]  Position: [Bottom Right ▼]              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Review & Generate                                   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📱 Story Graphic (1080×1920)                       │    │
│  │                                                      │    │
│  │  "Going live announcement for 'Ranked Grind'        │    │
│  │   streaming Valorant at 7:00 PM EST on Twitch.      │    │
│  │   Dynamic, exciting composition with bold text."    │    │
│  │                                                      │    │
│  │  Brand: My Brand Kit (balanced intensity)           │    │
│  │  Logo: Primary, bottom-right, medium                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  [← Back]                              [✨ Generate Asset]   │
└─────────────────────────────────────────────────────────────┘
```

### Code Reuse Summary

| Component | Source | Reuse Method |
|-----------|--------|--------------|
| `useGenerateAsset()` | api-client | Direct import |
| `useBrandKits()` | api-client | Direct import |
| `useLogos()` | api-client | Direct import |
| `SectionCard` | generate/page.tsx | Copy pattern |
| Step indicators | generate/page.tsx | Copy pattern |
| Brand kit selector | generate/page.tsx | Copy pattern |
| Logo options | generate/page.tsx | Copy pattern |
| Asset type icons | generate/page.tsx | Copy pattern |

### API Call (No Backend Changes)

```typescript
// Quick Create uses the same endpoint as Generate
const result = await generateMutation.mutateAsync({
  assetType: template.assetType,
  brandKitId: selectedBrandKitId || undefined,  // Optional!
  customPrompt: buildPromptFromTemplate(template, formValues),
  brandCustomization: selectedBrandKitId ? {
    include_logo: includeLogo,
    logo_position: logoPosition,
    logo_size: logoSize,
    brand_intensity: brandIntensity,
  } : undefined,
});
```

### Prompt Construction (Frontend)

```typescript
function buildPromptFromTemplate(
  template: QuickTemplate,
  values: Record<string, string>
): string {
  let prompt = template.promptTemplate;
  
  // Replace placeholders with user values
  for (const [key, value] of Object.entries(values)) {
    prompt = prompt.replace(`{${key}}`, value || '');
  }
  
  // Clean up empty placeholders
  prompt = prompt.replace(/\{[^}]+\}/g, '').trim();
  
  return prompt;
}
```

---

## Next Steps (When Ready to Build)

1. **Create `constants.ts`** with 8-12 initial templates
2. **Create `page.tsx`** with 3-step wizard
3. **Test with existing backend** - no backend changes needed
4. **Add navigation** link in dashboard sidebar
5. **Optional:** Add template preview images to Supabase storage

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Template prompts produce poor results | Iterate on prompt engineering, A/B test |
| Users want custom templates | Phase 2: Add user-created templates |
| Too many templates overwhelm users | Start with 8-12, add categories/search |
| Brand kit data missing fields | Already handled by BrandContextResolver fallbacks |
