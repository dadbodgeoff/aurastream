# MODULE 3: BRAND KIT EXTENDED FIELDS UI

## Overview
Expose all extended brand kit fields in the edit page. Backend has 8 endpoints for extended colors, typography, voice, and guidelines that are not exposed in the frontend.

## Priority: MEDIUM
## Dependencies: None (can run parallel)
## Estimated Effort: 6-8 hours

---

## BACKEND VERIFICATION

### Existing Endpoints (VERIFIED)
**File:** `backend/api/routes/brand_kits.py`

```
PUT  /api/v1/brand-kits/{id}/colors      → ColorPaletteResponse
GET  /api/v1/brand-kits/{id}/colors      → ColorPaletteResponse
PUT  /api/v1/brand-kits/{id}/typography  → TypographyResponse
GET  /api/v1/brand-kits/{id}/typography  → TypographyResponse
PUT  /api/v1/brand-kits/{id}/voice       → VoiceResponse
GET  /api/v1/brand-kits/{id}/voice       → VoiceResponse
PUT  /api/v1/brand-kits/{id}/guidelines  → GuidelinesResponse
GET  /api/v1/brand-kits/{id}/guidelines  → GuidelinesResponse
```

### Backend Schemas (VERIFIED)
**File:** `backend/api/schemas/brand_kit_enhanced.py`

---

## IMPLEMENTATION TASKS

### Task 3.1: Create Extended Types
**File:** `tsx/packages/api-client/src/types/brandKitExtended.ts`

```typescript
// ============================================================================
// Extended Color System
// ============================================================================

export interface ExtendedColor {
  hex: string;      // #RRGGBB format
  name: string;     // max 50 chars
  usage: string;    // max 200 chars
}

export interface GradientStop {
  color: string;    // #RRGGBB format
  position: number; // 0-100
}

export interface Gradient {
  name: string;                    // max 50 chars
  type: 'linear' | 'radial';
  angle: number;                   // 0-360
  stops: GradientStop[];           // 2-10 stops
}

export interface ColorPalette {
  primary: ExtendedColor[];        // max 5
  secondary: ExtendedColor[];      // max 5
  accent: ExtendedColor[];         // max 3
  neutral: ExtendedColor[];        // max 5
  gradients: Gradient[];           // max 3
}

export interface ColorPaletteResponse {
  brandKitId: string;
  colors: ColorPalette;
}

// ============================================================================
// Typography System
// ============================================================================

export interface FontConfig {
  family: string;                  // max 100 chars
  weight: number;                  // 100-900 in 100 increments
  style: 'normal' | 'italic';
}

export interface Typography {
  display?: FontConfig;
  headline?: FontConfig;
  subheadline?: FontConfig;
  body?: FontConfig;
  caption?: FontConfig;
  accent?: FontConfig;
}

export interface TypographyResponse {
  brandKitId: string;
  typography: Typography;
}

// ============================================================================
// Brand Voice
// ============================================================================

export type ExtendedTone = 
  | 'competitive' 
  | 'casual' 
  | 'educational' 
  | 'comedic'
  | 'professional' 
  | 'inspirational' 
  | 'edgy' 
  | 'wholesome';

export interface BrandVoice {
  tone: ExtendedTone;
  personalityTraits: string[];     // max 5, each max 30 chars
  tagline?: string;                // max 100 chars
  catchphrases: string[];          // max 10, each max 50 chars
  contentThemes: string[];         // max 5, each max 30 chars
}

export interface VoiceResponse {
  brandKitId: string;
  voice: BrandVoice;
}

// ============================================================================
// Brand Guidelines
// ============================================================================

export interface BrandGuidelines {
  logoMinSizePx: number;           // 16-512
  logoClearSpaceRatio: number;     // 0.1-1.0
  primaryColorRatio: number;       // 0-100
  secondaryColorRatio: number;     // 0-100
  accentColorRatio: number;        // 0-100
  prohibitedModifications: string[]; // max 10
  styleDo?: string;                // max 500 chars
  styleDont?: string;              // max 500 chars
}

export interface GuidelinesResponse {
  brandKitId: string;
  guidelines: BrandGuidelines;
}

// ============================================================================
// Supported Fonts (from backend)
// ============================================================================

export const SUPPORTED_FONTS = [
  'Inter', 'Roboto', 'Montserrat', 'Open Sans', 'Poppins',
  'Lato', 'Oswald', 'Raleway', 'Nunito', 'Playfair Display',
  'Merriweather', 'Source Sans Pro', 'Ubuntu', 'Rubik', 'Work Sans',
  'Fira Sans', 'Barlow', 'Quicksand', 'Karla', 'Mulish'
] as const;

export type SupportedFont = typeof SUPPORTED_FONTS[number];

export const FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
export type FontWeight = typeof FONT_WEIGHTS[number];

export const EXTENDED_TONES: ExtendedTone[] = [
  'competitive', 'casual', 'educational', 'comedic',
  'professional', 'inspirational', 'edgy', 'wholesome'
];
```

### Task 3.2: Create Extended Hooks
**File:** `tsx/packages/api-client/src/hooks/useBrandKitExtended.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ColorPalette,
  ColorPaletteResponse,
  Typography,
  TypographyResponse,
  BrandVoice,
  VoiceResponse,
  BrandGuidelines,
  GuidelinesResponse,
} from '../types/brandKitExtended';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

// ============================================================================
// Extended Colors
// ============================================================================

export function useExtendedColors(brandKitId: string | undefined) {
  return useQuery({
    queryKey: ['brand-kit', 'colors', brandKitId],
    queryFn: async (): Promise<ColorPaletteResponse> => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/brand-kits/${brandKitId}/colors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch colors');
      const data = await response.json();
      return transformColorPaletteResponse(data);
    },
    enabled: !!brandKitId,
  });
}

export function useUpdateExtendedColors() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ brandKitId, colors }: { brandKitId: string; colors: ColorPalette }) => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/brand-kits/${brandKitId}/colors`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformColorPaletteToApi(colors)),
      });
      if (!response.ok) throw new Error('Failed to update colors');
      return response.json();
    },
    onSuccess: (_, { brandKitId }) => {
      queryClient.invalidateQueries({ queryKey: ['brand-kit', 'colors', brandKitId] });
      queryClient.invalidateQueries({ queryKey: ['brand-kits'] });
    },
  });
}

// ============================================================================
// Typography
// ============================================================================

export function useTypography(brandKitId: string | undefined) {
  return useQuery({
    queryKey: ['brand-kit', 'typography', brandKitId],
    queryFn: async (): Promise<TypographyResponse> => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/brand-kits/${brandKitId}/typography`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch typography');
      const data = await response.json();
      return transformTypographyResponse(data);
    },
    enabled: !!brandKitId,
  });
}

export function useUpdateTypography() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ brandKitId, typography }: { brandKitId: string; typography: Typography }) => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/brand-kits/${brandKitId}/typography`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(typography),
      });
      if (!response.ok) throw new Error('Failed to update typography');
      return response.json();
    },
    onSuccess: (_, { brandKitId }) => {
      queryClient.invalidateQueries({ queryKey: ['brand-kit', 'typography', brandKitId] });
      queryClient.invalidateQueries({ queryKey: ['brand-kits'] });
    },
  });
}

// ============================================================================
// Brand Voice
// ============================================================================

export function useBrandVoice(brandKitId: string | undefined) {
  return useQuery({
    queryKey: ['brand-kit', 'voice', brandKitId],
    queryFn: async (): Promise<VoiceResponse> => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/brand-kits/${brandKitId}/voice`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch voice');
      const data = await response.json();
      return transformVoiceResponse(data);
    },
    enabled: !!brandKitId,
  });
}

export function useUpdateBrandVoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ brandKitId, voice }: { brandKitId: string; voice: BrandVoice }) => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/brand-kits/${brandKitId}/voice`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformVoiceToApi(voice)),
      });
      if (!response.ok) throw new Error('Failed to update voice');
      return response.json();
    },
    onSuccess: (_, { brandKitId }) => {
      queryClient.invalidateQueries({ queryKey: ['brand-kit', 'voice', brandKitId] });
      queryClient.invalidateQueries({ queryKey: ['brand-kits'] });
    },
  });
}

// ============================================================================
// Brand Guidelines
// ============================================================================

export function useBrandGuidelines(brandKitId: string | undefined) {
  return useQuery({
    queryKey: ['brand-kit', 'guidelines', brandKitId],
    queryFn: async (): Promise<GuidelinesResponse> => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/brand-kits/${brandKitId}/guidelines`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch guidelines');
      const data = await response.json();
      return transformGuidelinesResponse(data);
    },
    enabled: !!brandKitId,
  });
}

export function useUpdateBrandGuidelines() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ brandKitId, guidelines }: { brandKitId: string; guidelines: BrandGuidelines }) => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/brand-kits/${brandKitId}/guidelines`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformGuidelinesToApi(guidelines)),
      });
      if (!response.ok) throw new Error('Failed to update guidelines');
      return response.json();
    },
    onSuccess: (_, { brandKitId }) => {
      queryClient.invalidateQueries({ queryKey: ['brand-kit', 'guidelines', brandKitId] });
      queryClient.invalidateQueries({ queryKey: ['brand-kits'] });
    },
  });
}

// ============================================================================
// Transform Functions (snake_case <-> camelCase)
// ============================================================================

function transformColorPaletteResponse(data: any): ColorPaletteResponse {
  return {
    brandKitId: data.brand_kit_id,
    colors: data.colors,
  };
}

function transformColorPaletteToApi(colors: ColorPalette): any {
  return colors; // Colors use same format
}

function transformTypographyResponse(data: any): TypographyResponse {
  return {
    brandKitId: data.brand_kit_id,
    typography: data.typography,
  };
}

function transformVoiceResponse(data: any): VoiceResponse {
  return {
    brandKitId: data.brand_kit_id,
    voice: {
      tone: data.voice.tone,
      personalityTraits: data.voice.personality_traits || [],
      tagline: data.voice.tagline,
      catchphrases: data.voice.catchphrases || [],
      contentThemes: data.voice.content_themes || [],
    },
  };
}

function transformVoiceToApi(voice: BrandVoice): any {
  return {
    tone: voice.tone,
    personality_traits: voice.personalityTraits,
    tagline: voice.tagline,
    catchphrases: voice.catchphrases,
    content_themes: voice.contentThemes,
  };
}

function transformGuidelinesResponse(data: any): GuidelinesResponse {
  return {
    brandKitId: data.brand_kit_id,
    guidelines: {
      logoMinSizePx: data.guidelines.logo_min_size_px,
      logoClearSpaceRatio: data.guidelines.logo_clear_space_ratio,
      primaryColorRatio: data.guidelines.primary_color_ratio,
      secondaryColorRatio: data.guidelines.secondary_color_ratio,
      accentColorRatio: data.guidelines.accent_color_ratio,
      prohibitedModifications: data.guidelines.prohibited_modifications || [],
      styleDo: data.guidelines.style_do,
      styleDont: data.guidelines.style_dont,
    },
  };
}

function transformGuidelinesToApi(guidelines: BrandGuidelines): any {
  return {
    logo_min_size_px: guidelines.logoMinSizePx,
    logo_clear_space_ratio: guidelines.logoClearSpaceRatio,
    primary_color_ratio: guidelines.primaryColorRatio,
    secondary_color_ratio: guidelines.secondaryColorRatio,
    accent_color_ratio: guidelines.accentColorRatio,
    prohibited_modifications: guidelines.prohibitedModifications,
    style_do: guidelines.styleDo,
    style_dont: guidelines.styleDont,
  };
}
```

### Task 3.3: Update Brand Kit Edit Page
**File:** `tsx/apps/web/src/app/dashboard/brand-kits/[id]/page.tsx`

**Add New Tabs to Existing Tab Navigation:**

```typescript
const TABS = [
  { id: 'basics', label: 'Basics', icon: '🎨' },
  { id: 'logos', label: 'Logos', icon: '🖼️' },
  { id: 'colors', label: 'Extended Colors', icon: '🌈' },
  { id: 'typography', label: 'Typography', icon: '📝' },
  { id: 'voice', label: 'Brand Voice', icon: '🎤' },
  { id: 'guidelines', label: 'Guidelines', icon: '📋' },
];
```

#### 3.3.1 Extended Colors Tab Component

```tsx
function ExtendedColorsTab({ brandKitId }: { brandKitId: string }) {
  const { data, isLoading } = useExtendedColors(brandKitId);
  const updateMutation = useUpdateExtendedColors();
  
  // Local state for editing
  const [colors, setColors] = useState<ColorPalette>({
    primary: [],
    secondary: [],
    accent: [],
    neutral: [],
    gradients: [],
  });
  
  // Sync with fetched data
  useEffect(() => {
    if (data?.colors) {
      setColors(data.colors);
    }
  }, [data]);
  
  const handleSave = async () => {
    await updateMutation.mutateAsync({ brandKitId, colors });
  };
  
  // Render color editors for each category
  // Add/remove colors (respect max limits)
  // Gradient editor with visual preview
}
```

#### 3.3.2 Typography Tab Component

```tsx
function TypographyTab({ brandKitId }: { brandKitId: string }) {
  const { data, isLoading } = useTypography(brandKitId);
  const updateMutation = useUpdateTypography();
  
  const TYPOGRAPHY_LEVELS = [
    { key: 'display', label: 'Display', description: 'Large hero text' },
    { key: 'headline', label: 'Headline', description: 'Main titles' },
    { key: 'subheadline', label: 'Subheadline', description: 'Section headers' },
    { key: 'body', label: 'Body', description: 'Regular text' },
    { key: 'caption', label: 'Caption', description: 'Small text' },
    { key: 'accent', label: 'Accent', description: 'Special emphasis' },
  ];
  
  // For each level:
  // - Font family dropdown (SUPPORTED_FONTS)
  // - Weight slider (100-900)
  // - Style toggle (normal/italic)
  // - Live preview
}
```

#### 3.3.3 Brand Voice Tab Component

```tsx
function BrandVoiceTab({ brandKitId }: { brandKitId: string }) {
  const { data, isLoading } = useBrandVoice(brandKitId);
  const updateMutation = useUpdateBrandVoice();
  
  const TONE_OPTIONS = [
    { id: 'competitive', label: 'Competitive', emoji: '🏆' },
    { id: 'casual', label: 'Casual', emoji: '😎' },
    { id: 'educational', label: 'Educational', emoji: '📚' },
    { id: 'comedic', label: 'Comedic', emoji: '😂' },
    { id: 'professional', label: 'Professional', emoji: '💼' },
    { id: 'inspirational', label: 'Inspirational', emoji: '✨' },
    { id: 'edgy', label: 'Edgy', emoji: '🔥' },
    { id: 'wholesome', label: 'Wholesome', emoji: '💖' },
  ];
  
  // Tone selector (8 cards)
  // Personality traits tag input (max 5)
  // Tagline input (max 100 chars)
  // Catchphrases list editor (max 10)
  // Content themes tag input (max 5)
}
```

#### 3.3.4 Guidelines Tab Component

```tsx
function GuidelinesTab({ brandKitId }: { brandKitId: string }) {
  const { data, isLoading } = useBrandGuidelines(brandKitId);
  const updateMutation = useUpdateBrandGuidelines();
  
  // Logo minimum size slider (16-512px)
  // Clear space ratio slider (0.1-1.0)
  // Color ratio inputs with validation (sum ≤ 100)
  // Prohibited modifications list
  // Style do's textarea (max 500)
  // Style don'ts textarea (max 500)
}
```

---

## ACCEPTANCE CRITERIA

- [ ] Types file created with all interfaces
- [ ] All 8 hooks implemented (4 queries, 4 mutations)
- [ ] Extended Colors tab renders and saves
- [ ] Typography tab renders and saves
- [ ] Brand Voice tab renders and saves
- [ ] Guidelines tab renders and saves
- [ ] Validation matches backend limits
- [ ] Color ratio sum validation works
- [ ] TypeScript compiles without errors
- [ ] All tabs accessible via navigation

---

## TESTING COMMANDS

```bash
# Type check
cd tsx && npm run typecheck

# Run dev server
cd tsx && npm run dev

# Test each tab:
# 1. Navigate to /dashboard/brand-kits/{id}
# 2. Click each new tab
# 3. Edit values
# 4. Save and verify persistence
```

---

## FILES TO CREATE

1. `tsx/packages/api-client/src/types/brandKitExtended.ts`
2. `tsx/packages/api-client/src/hooks/useBrandKitExtended.ts`

## FILES TO UPDATE

1. `tsx/apps/web/src/app/dashboard/brand-kits/[id]/page.tsx`
2. `tsx/packages/api-client/src/index.ts` - Export new hooks and types
