# MODULE 2: GENERATION BRAND CUSTOMIZATION UI

## Overview
Expose all backend brand customization options in the generation UI. The backend supports full customization (colors, typography, voice, brand intensity) but the frontend only exposes logo options.

## Priority: HIGH
## Dependencies: None (can run parallel with Module 1)
## Estimated Effort: 3-4 hours

---

## BACKEND VERIFICATION

### Existing Schema (VERIFIED)
**File:** `backend/api/schemas/generation.py`

```python
class ColorSelection(BaseModel):
    primary_index: int = Field(default=0, ge=0, le=4)
    secondary_index: Optional[int] = Field(default=None, ge=0, le=4)
    accent_index: Optional[int] = Field(default=None, ge=0, le=2)
    use_gradient: Optional[int] = Field(default=None, ge=0, le=2)

class TypographySelection(BaseModel):
    level: Literal["display", "headline", "subheadline", "body", "caption", "accent"]

class VoiceSelection(BaseModel):
    use_tagline: bool = False
    use_catchphrase: Optional[int] = None

class BrandCustomization(BaseModel):
    colors: Optional[ColorSelection]
    typography: Optional[TypographySelection]
    voice: Optional[VoiceSelection]
    include_logo: bool = False
    logo_type: Literal["primary", "secondary", "icon", "watermark"] = "primary"
    logo_position: Literal["top-left", "top-right", "bottom-left", "bottom-right", "center"]
    logo_size: Literal["small", "medium", "large"] = "medium"
    brand_intensity: Literal["subtle", "balanced", "strong"] = "balanced"
```

### Endpoint
```
POST /api/v1/generate
Body: GenerateRequest with brand_customization field
```

---

## IMPLEMENTATION TASKS

### Task 2.1: Update Generation Types
**File:** `tsx/packages/api-client/src/types/generation.ts`

**Add these types (if file doesn't exist, create it):**

```typescript
// Color selection for generation
export interface ColorSelection {
  primaryIndex?: number;      // 0-4
  secondaryIndex?: number;    // 0-4, optional
  accentIndex?: number;       // 0-2, optional
  useGradient?: number;       // 0-2, optional (gradient index)
}

// Typography level selection
export type TypographyLevel = 'display' | 'headline' | 'subheadline' | 'body' | 'caption' | 'accent';

export interface TypographySelection {
  level: TypographyLevel;
}

// Voice selection for generation
export interface VoiceSelection {
  useTagline?: boolean;
  useCatchphrase?: number;    // Index of catchphrase to use
}

// Logo types available
export type LogoType = 'primary' | 'secondary' | 'icon' | 'watermark';

// Logo position options
export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

// Logo size options
export type LogoSize = 'small' | 'medium' | 'large';

// Brand intensity levels
export type BrandIntensity = 'subtle' | 'balanced' | 'strong';

// Complete brand customization
export interface BrandCustomization {
  colors?: ColorSelection;
  typography?: TypographySelection;
  voice?: VoiceSelection;
  includeLogo?: boolean;
  logoType?: LogoType;
  logoPosition?: LogoPosition;
  logoSize?: LogoSize;
  brandIntensity?: BrandIntensity;
}

// Asset types for generation
export type GenerationAssetType = 'thumbnail' | 'overlay' | 'banner' | 'story_graphic' | 'clip_cover';

// Generate request
export interface GenerateRequest {
  assetType: GenerationAssetType;
  brandKitId: string;
  customPrompt?: string;
  brandCustomization?: BrandCustomization;
}
```

### Task 2.2: Update Generation Hook
**File:** `tsx/packages/api-client/src/hooks/useGeneration.ts`

**Update the `useGenerateAsset` mutation to:**
1. Accept full `BrandCustomization` object
2. Transform camelCase to snake_case for API call
3. Include all parameters in request body

**Transform function:**
```typescript
function transformBrandCustomization(bc: BrandCustomization | undefined): any {
  if (!bc) return undefined;
  
  return {
    colors: bc.colors ? {
      primary_index: bc.colors.primaryIndex,
      secondary_index: bc.colors.secondaryIndex,
      accent_index: bc.colors.accentIndex,
      use_gradient: bc.colors.useGradient,
    } : undefined,
    typography: bc.typography ? {
      level: bc.typography.level,
    } : undefined,
    voice: bc.voice ? {
      use_tagline: bc.voice.useTagline,
      use_catchphrase: bc.voice.useCatchphrase,
    } : undefined,
    include_logo: bc.includeLogo,
    logo_type: bc.logoType,
    logo_position: bc.logoPosition,
    logo_size: bc.logoSize,
    brand_intensity: bc.brandIntensity,
  };
}
```

### Task 2.3: Update Generate Page UI
**File:** `tsx/apps/web/src/app/dashboard/generate/page.tsx`

**Add New UI Sections:**

#### 2.3.1 Brand Intensity Selector (After Logo Options, Before Custom Prompt)

```typescript
const BRAND_INTENSITIES = [
  { 
    id: 'subtle' as const, 
    label: 'Subtle', 
    description: 'Light brand presence, focus on content',
    emoji: '🌙'
  },
  { 
    id: 'balanced' as const, 
    label: 'Balanced', 
    description: 'Moderate brand elements throughout',
    emoji: '⚖️'
  },
  { 
    id: 'strong' as const, 
    label: 'Strong', 
    description: 'Bold brand expression, maximum impact',
    emoji: '🔥'
  },
];
```

**UI Pattern:** Three cards in a row, similar to asset type selection

#### 2.3.2 Advanced Options Collapsible Section

```tsx
<SectionCard className="mb-6">
  <button
    type="button"
    onClick={() => setShowAdvanced(!showAdvanced)}
    className="w-full flex items-center justify-between"
  >
    <div className="flex items-center gap-3">
      <span className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-400 flex items-center justify-center">
        <SettingsIcon />
      </span>
      <h2 className="text-lg font-semibold text-text-primary">Advanced Options</h2>
    </div>
    <ChevronIcon className={cn("transition-transform", showAdvanced && "rotate-180")} />
  </button>
  
  {showAdvanced && (
    <div className="mt-6 space-y-6 animate-in fade-in duration-200">
      {/* Color Selection */}
      {/* Typography Selection */}
      {/* Voice Selection */}
    </div>
  )}
</SectionCard>
```

#### 2.3.3 Color Selection (Inside Advanced)

**Requirements:**
- Fetch brand kit's extended colors using `useExtendedColors(brandKitId)`
- Show primary colors as swatches (up to 5)
- Radio selection for primary_index
- Optional checkboxes for secondary_index, accent_index
- Gradient toggle if brand kit has gradients

**UI:**
```tsx
<div>
  <label className="block text-sm font-medium text-text-secondary mb-3">
    Primary Color
  </label>
  <div className="flex gap-2">
    {brandKitColors?.primary?.map((color, index) => (
      <button
        key={index}
        onClick={() => setPrimaryColorIndex(index)}
        className={cn(
          "w-10 h-10 rounded-lg border-2 transition-all",
          primaryColorIndex === index 
            ? "border-primary-500 ring-2 ring-primary-500/30" 
            : "border-transparent"
        )}
        style={{ backgroundColor: color.hex }}
        title={color.name}
      />
    ))}
  </div>
</div>
```

#### 2.3.4 Typography Selection (Inside Advanced)

**Requirements:**
- Dropdown with 6 typography levels
- Show preview text in selected style (if typography data available)

```typescript
const TYPOGRAPHY_LEVELS = [
  { id: 'display', label: 'Display', description: 'Large hero text' },
  { id: 'headline', label: 'Headline', description: 'Main titles' },
  { id: 'subheadline', label: 'Subheadline', description: 'Section headers' },
  { id: 'body', label: 'Body', description: 'Regular text' },
  { id: 'caption', label: 'Caption', description: 'Small text' },
  { id: 'accent', label: 'Accent', description: 'Special emphasis' },
];
```

#### 2.3.5 Voice Selection (Inside Advanced)

**Requirements:**
- Checkbox: "Include tagline" (only if brand kit has tagline)
- Dropdown: Select catchphrase (only if brand kit has catchphrases)

```tsx
{brandKitVoice?.tagline && (
  <label className="flex items-center gap-3">
    <input
      type="checkbox"
      checked={useTagline}
      onChange={(e) => setUseTagline(e.target.checked)}
      className="w-5 h-5 rounded border-border-default"
    />
    <span className="text-text-primary">Include tagline: "{brandKitVoice.tagline}"</span>
  </label>
)}
```

#### 2.3.6 Logo Type Selection (Enhance Existing)

**Requirements:**
- Fetch available logo types from brand kit using `useLogos(brandKitId)`
- Only show radio buttons for logo types that exist
- Default to 'primary' if available

```tsx
const availableLogoTypes = useMemo(() => {
  if (!logosData?.logos) return [];
  return Object.entries(logosData.logos)
    .filter(([_, url]) => url != null)
    .map(([type]) => type as LogoType);
}, [logosData]);
```

### Task 2.4: Update State Management

**Add these state variables:**
```typescript
// Brand intensity
const [brandIntensity, setBrandIntensity] = useState<BrandIntensity>('balanced');

// Advanced options toggle
const [showAdvanced, setShowAdvanced] = useState(false);

// Color selection
const [primaryColorIndex, setPrimaryColorIndex] = useState(0);
const [secondaryColorIndex, setSecondaryColorIndex] = useState<number | undefined>();
const [accentColorIndex, setAccentColorIndex] = useState<number | undefined>();
const [useGradient, setUseGradient] = useState(false);
const [gradientIndex, setGradientIndex] = useState(0);

// Typography selection
const [typographyLevel, setTypographyLevel] = useState<TypographyLevel>('headline');

// Voice selection
const [useTagline, setUseTagline] = useState(false);
const [selectedCatchphraseIndex, setSelectedCatchphraseIndex] = useState<number | undefined>();

// Logo type (enhance existing)
const [selectedLogoType, setSelectedLogoType] = useState<LogoType>('primary');
```

### Task 2.5: Update API Call

**Update handleGenerate function:**
```typescript
const handleGenerate = async () => {
  if (!selectedBrandKitId) {
    alert('Please select a brand kit');
    return;
  }

  try {
    const result = await generateMutation.mutateAsync({
      assetType: selectedType as GenerationAssetType,
      brandKitId: selectedBrandKitId,
      customPrompt: customPrompt || undefined,
      brandCustomization: {
        includeLogo: includeLogo && hasLogo,
        logoType: includeLogo ? selectedLogoType : undefined,
        logoPosition: includeLogo ? logoPosition as LogoPosition : undefined,
        logoSize: includeLogo ? logoSize as LogoSize : undefined,
        brandIntensity: brandIntensity,
        colors: showAdvanced ? {
          primaryIndex: primaryColorIndex,
          secondaryIndex: secondaryColorIndex,
          accentIndex: accentColorIndex,
          useGradient: useGradient ? gradientIndex : undefined,
        } : undefined,
        typography: showAdvanced ? {
          level: typographyLevel,
        } : undefined,
        voice: showAdvanced ? {
          useTagline: useTagline,
          useCatchphrase: selectedCatchphraseIndex,
        } : undefined,
      },
    });

    router.push(`/dashboard/assets?job=${result.id}`);
  } catch (error) {
    console.error('Generation failed:', error);
  }
};
```

---

## ACCEPTANCE CRITERIA

- [ ] Types file created/updated with all interfaces
- [ ] Generation hook accepts full BrandCustomization
- [ ] Brand intensity selector renders with 3 options
- [ ] Advanced options collapsible works
- [ ] Color selection shows brand kit colors
- [ ] Typography dropdown works
- [ ] Voice selection shows tagline/catchphrases
- [ ] Logo type selection shows available types only
- [ ] API call includes all parameters
- [ ] TypeScript compiles without errors
- [ ] Generation works end-to-end

---

## TESTING COMMANDS

```bash
# Type check
cd tsx && npm run typecheck

# Run dev server
cd tsx && npm run dev

# Test generation with all options
# 1. Navigate to /dashboard/generate
# 2. Select brand kit
# 3. Set brand intensity
# 4. Open advanced options
# 5. Select colors, typography, voice
# 6. Enable logo with type selection
# 7. Generate and verify job created
```

---

## FILES TO UPDATE

1. `tsx/packages/api-client/src/types/generation.ts` (create or update)
2. `tsx/packages/api-client/src/hooks/useGeneration.ts`
3. `tsx/apps/web/src/app/dashboard/generate/page.tsx`
4. `tsx/packages/api-client/src/index.ts` - Export new types

## HOOKS NEEDED FROM OTHER MODULES

- `useExtendedColors(brandKitId)` - From Module 3
- `useBrandVoice(brandKitId)` - From Module 3
- `useLogos(brandKitId)` - Already exists
