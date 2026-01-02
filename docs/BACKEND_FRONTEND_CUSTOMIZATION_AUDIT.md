# AuraStream Backend/Frontend Customization Audit

**Date:** January 1, 2026  
**Purpose:** Identify underutilized backend capabilities and hardcoded frontend values for optimal user experiences

---

## Executive Summary

The backend has a **rich, comprehensive customization system** that is significantly **underutilized** by the frontend. The frontend currently uses only ~30% of available customization options, with many features hardcoded or completely missing from the UI.

---

## 1. Backend Capabilities (What's Available)

### 1.1 Brand Customization Schema (`BrandCustomization`)

| Feature | Backend Support | Status |
|---------|----------------|--------|
| **Color Selection** | `primary_index`, `secondary_index`, `accent_index`, `use_gradient` | ✅ Full |
| **Typography Selection** | `level` (display, headline, subheadline, body, caption, accent) | ✅ Full |
| **Voice Selection** | `use_tagline`, `use_catchphrase` (index) | ✅ Full |
| **Logo Options** | `include_logo`, `logo_type`, `logo_position`, `logo_size` | ✅ Full |
| **Brand Intensity** | `subtle`, `balanced`, `strong` | ✅ Full |

### 1.2 Extended Color System (`ColorPalette`)

```typescript
// Backend supports:
- primary: ExtendedColor[] (up to 5 colors with hex, name, usage)
- secondary: ExtendedColor[] (up to 5 colors)
- accent: ExtendedColor[] (up to 3 colors)
- neutral: ExtendedColor[] (up to 5 colors)
- gradients: Gradient[] (up to 3 gradients with stops, angle, type)
```

### 1.3 Typography System (`Typography`)

```typescript
// Backend supports 6 typography levels:
- display: FontConfig (family, weight 100-900, style)
- headline: FontConfig
- subheadline: FontConfig
- body: FontConfig
- caption: FontConfig
- accent: FontConfig
```

### 1.4 Brand Voice (`BrandVoice`)

```typescript
// Backend supports:
- tone: 8 options (competitive, casual, educational, comedic, professional, inspirational, edgy, wholesome)
- personality_traits: string[] (up to 5)
- tagline: string
- catchphrases: string[] (up to 10)
- content_themes: string[] (up to 5)
```

### 1.5 Logo Types

```typescript
// Backend supports 5 logo types:
- primary
- secondary
- icon
- monochrome
- watermark
```

### 1.6 Asset Types (21 total)

```typescript
// Backend supports:
- thumbnail, overlay, banner, story_graphic, clip_cover
- twitch_emote, twitch_emote_112, twitch_emote_56, twitch_emote_28
- tiktok_emote, tiktok_emote_300, tiktok_emote_200, tiktok_emote_100
- twitch_badge, twitch_panel, twitch_offline
- profile_picture, streamer_logo
```

---

## 2. Frontend Usage (What's Actually Used)

### 2.1 CreatePageContent.tsx - MINIMAL USAGE ⚠️

```typescript
// Current implementation:
brandCustomization: selectedBrandKitId ? {
  include_logo: includeLogo && hasLogo,
  logo_type: 'primary',           // ❌ HARDCODED
  logo_position: logoPosition,    // ✅ User selectable
  logo_size: logoSize,            // ✅ User selectable
  brand_intensity: 'balanced',    // ❌ HARDCODED
} : undefined
```

**Missing from UI:**
- ❌ Color selection (primary_index, secondary_index, accent_index)
- ❌ Gradient selection (use_gradient)
- ❌ Typography level selection
- ❌ Voice selection (tagline, catchphrases)
- ❌ Brand intensity selector
- ❌ Logo type selector (only uses 'primary')

### 2.2 QuickCreateWizard.tsx - MINIMAL USAGE ⚠️

```typescript
// Current implementation:
brandCustomization: brandKitId ? {
  include_logo: includeLogo && hasLogo,
  logo_type: 'primary' as const,  // ❌ HARDCODED
  logo_position: logoPosition,
  logo_size: logoSize,
  brand_intensity: 'balanced' as const,  // ❌ HARDCODED
} : undefined
```

**Same issues as CreatePageContent**

### 2.3 BrandCustomizationPanel.tsx - FULL IMPLEMENTATION EXISTS! ✅

The frontend **already has** a complete `BrandCustomizationPanel` component that supports:
- ✅ Color selection (primary, secondary, accent, gradients)
- ✅ Typography level selection
- ✅ Voice selection (tagline, catchphrases)
- ✅ Logo options (type, position, size)
- ✅ Brand intensity selector

**BUT IT'S NOT BEING USED IN THE CREATE FLOWS!**

### 2.4 Asset Types in Frontend - INCOMPLETE ⚠️

```typescript
// constants.ts only defines 9 asset types:
ASSET_TYPES = [
  'thumbnail', 'clip_cover', 'overlay', 'twitch_offline',
  'story_graphic', 'banner', 'twitch_panel', 'twitch_emote', 'twitch_badge'
]

// Missing from UI:
- ❌ tiktok_emote (all sizes)
- ❌ profile_picture
- ❌ streamer_logo
- ❌ Size variants (twitch_emote_112, twitch_emote_56, twitch_emote_28)
```

---

## 3. Hardcoded Values Analysis

### 3.1 Critical Hardcoded Values

| Location | Value | Should Be |
|----------|-------|-----------|
| CreatePageContent.tsx | `logo_type: 'primary'` | User selectable from 5 options |
| CreatePageContent.tsx | `brand_intensity: 'balanced'` | User selectable (subtle/balanced/strong) |
| QuickCreateWizard.tsx | `logo_type: 'primary'` | User selectable |
| QuickCreateWizard.tsx | `brand_intensity: 'balanced'` | User selectable |
| constants.ts | 9 asset types | Should include all 21 backend types |
| LogoOptionsPanel.tsx | Only position/size | Missing logo_type selector |

### 3.2 Missing UI Components in Create Flow

1. **Color Picker** - Backend supports selecting specific colors from brand kit
2. **Gradient Selector** - Backend supports gradient selection
3. **Typography Level Selector** - Backend supports 6 levels
4. **Voice/Tagline Toggle** - Backend supports tagline and catchphrase injection
5. **Brand Intensity Slider** - Backend supports 3 intensity levels
6. **Logo Type Selector** - Backend supports 5 logo types

---

## 4. Prompt Engine Analysis

### 4.1 What Gets Injected into Prompts

The `BrandContextResolver` resolves these values for prompt injection:

```python
ResolvedBrandContext:
  - primary_color: str          # From colors.primary_index
  - secondary_color: str | None # From colors.secondary_index
  - accent_color: str | None    # From colors.accent_index
  - gradient: str | None        # From colors.use_gradient
  - font: str                   # From typography.level
  - tone: str                   # From voice
  - tagline: str | None         # From voice.use_tagline
  - catchphrase: str | None     # From voice.use_catchphrase
  - include_logo: bool
  - logo_position: str | None
  - logo_size: str | None
  - intensity: str              # subtle/balanced/strong
```

### 4.2 Prompt Format

```
[BRAND: {intensity} - Colors: {primary} {secondary} accent:{accent} | 
 Gradient: {gradient} | Font: {font} | Tone: {tone} | 
 Tagline: "{tagline}" | Text: "{catchphrase}" | 
 Logo: {position} {size}]
```

**All these values are available but frontend only sends:**
- include_logo
- logo_position
- logo_size
- (hardcoded) logo_type: 'primary'
- (hardcoded) brand_intensity: 'balanced'

---

## 5. Recommendations

### 5.1 High Priority - Integrate BrandCustomizationPanel

The `BrandCustomizationPanel` component already exists and is fully functional. It should be integrated into:

1. **CreatePageContent.tsx** - Add as collapsible section after brand kit selection
2. **QuickCreateWizard.tsx** - Add in customize step

### 5.2 Medium Priority - Add Missing Asset Types

Update `constants.ts` to include:
- TikTok emotes (all sizes)
- Profile picture
- Streamer logo
- Size variants for emotes

### 5.3 Medium Priority - Remove Hardcoded Values

Replace hardcoded values with user selections:
- `logo_type` → Add selector (primary, secondary, icon, monochrome, watermark)
- `brand_intensity` → Add selector (subtle, balanced, strong)

### 5.4 Low Priority - Advanced Features

Consider adding:
- Neutral color selection
- Content themes display
- Personality traits display
- Brand guidelines preview

---

## 6. Implementation Checklist

### Phase 1: Quick Wins (1-2 days) ✅ COMPLETED
- [x] Add `brand_intensity` selector to CreatePageContent
- [x] Add `logo_type` selector to LogoOptionsPanel
- [x] Remove hardcoded values
- [x] Add missing asset types (TikTok emotes, profile_picture, streamer_logo)
- [x] Update QuickCreateWizard with new customization options
- [x] Update CustomizeForm with brand intensity and logo type

### Phase 2: Full Integration (3-5 days) ✅ COMPLETED
- [x] Create `BrandCustomizationSection` component for CreatePageContent
- [x] Integrate color selection UI (primary_index, secondary_index, accent_index)
- [x] Add gradient selection UI
- [x] Add voice selection UI (tagline, catchphrases)
- [x] Pass full brand customization (colors, typography, voice) to generation API
- [ ] Integrate `BrandCustomizationSection` into QuickCreateWizard (optional - already has basic customization)

### Phase 3: Polish (2-3 days)
- [ ] Add TikTok emote size variant selection
- [ ] Add Twitch emote size variant selection
- [ ] Add profile picture/logo generation flow
- [ ] Add preview of brand customization before generation

---

## 7. Code Examples

### 7.1 Fix CreatePageContent.tsx

```typescript
// Before (hardcoded):
brandCustomization: selectedBrandKitId ? {
  include_logo: includeLogo && hasLogo,
  logo_type: 'primary',
  logo_position: logoPosition,
  logo_size: logoSize,
  brand_intensity: 'balanced',
} : undefined

// After (user selectable):
brandCustomization: selectedBrandKitId ? {
  colors: colorSelection,           // NEW
  typography: typographySelection,  // NEW
  voice: voiceSelection,            // NEW
  include_logo: includeLogo && hasLogo,
  logo_type: logoType,              // User selected
  logo_position: logoPosition,
  logo_size: logoSize,
  brand_intensity: brandIntensity,  // User selected
} : undefined
```

### 7.2 Add BrandCustomizationPanel Integration

```typescript
// In CreatePageContent.tsx, after BrandKitSelector:
{selectedBrandKitId && selectedBrandKit && (
  <BrandCustomizationPanel
    brandKitName={selectedBrandKit.name}
    colors={selectedBrandKit.colors_extended}
    typography={selectedBrandKit.typography}
    voice={selectedBrandKit.voice}
    logoUrl={selectedBrandKit.logo_url}
    value={brandCustomization}
    onChange={setBrandCustomization}
  />
)}
```

---

## 8. Summary

| Category | Backend | Frontend Used | Gap |
|----------|---------|---------------|-----|
| Color Selection | 4 options | 0 | 100% unused |
| Typography | 6 levels | 0 | 100% unused |
| Voice | 2 options | 0 | 100% unused |
| Logo Type | 5 types | 1 (hardcoded) | 80% unused |
| Brand Intensity | 3 levels | 1 (hardcoded) | 67% unused |
| Asset Types | 21 types | 9 types | 57% unused |

**Overall Utilization: ~30%**

The backend is significantly more capable than what the frontend exposes. Integrating the existing `BrandCustomizationPanel` would immediately unlock the full customization potential.
