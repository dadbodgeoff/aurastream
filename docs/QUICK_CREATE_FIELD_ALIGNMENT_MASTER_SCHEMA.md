# 🎯 QUICK CREATE FIELD ALIGNMENT MASTER SCHEMA
## Complete Audit & Implementation Plan

**Version:** 1.0.0  
**Created:** January 2, 2026  
**Status:** Ready for Implementation  
**Priority:** HIGH - User Experience Gap

---

## EXECUTIVE SUMMARY

### The Problem
The Quick Create frontend has **hardcoded fields per template** instead of dynamically exposing ALL available input fields from backend YAML prompts. This results in:

- **20 missing input fields** across 10 templates
- **1 entire template (Logo)** not exposed to users
- **Users have less control** over their generated assets
- **Backend prompt capabilities are underutilized**

### The Root Cause
```typescript
// Current broken merge logic in QuickCreateWizard.tsx
const frontendOnlyFields = template.fields.filter(f => 
  !backendFieldIds.has(f.id) && (f.type === 'dynamic_select' || f.dependsOn)
);
```
This logic **filters out backend fields** instead of using them as the source of truth.

### The Solution
1. **Fix the field merge logic** - Backend fields are source of truth
2. **Remove hardcoded fields from constants.ts** - Keep only UI metadata
3. **Add Logo template** - Expose the missing template
4. **Sync panel type options** - Add 4 missing options

---

## AUDIT FINDINGS

### Field-by-Field Gap Analysis

#### 1. EMOTE (`emote.yaml`)
| Field | Backend | Frontend | Status |
|-------|---------|----------|--------|
| `emotion` | ✅ select, 8 options | ✅ Yes | ✅ OK |
| `text` | ✅ text, max 10 | ✅ Yes | ✅ OK |
| `character_description` | ✅ select, 21 options | ❌ Missing | 🔴 GAP |
| `background_color` | ✅ select, 4 options | ❌ Missing | 🔴 GAP |
| `accent_color` | ✅ select, 11 options | ❌ Missing | 🔴 GAP |
| `platform` | ❌ N/A | ✅ FE-only | ⚪ FE-only |
| `size` | ❌ N/A | ✅ FE-only | ⚪ FE-only |

**Character Description Options (21):**
- AI Decides, Cute Chibi, Anime Girl, Anime Boy, Cat Mascot, Dog Mascot, Fox Mascot, Wolf Character, Bear Character, Bunny Character, Panda Character, Dragon Character, Robot/Mech, Slime/Blob, Ghost, Demon/Devil, Angel, Alien, Frog, Penguin, Owl

**Background Color Options (4):**
- Green (default for chroma key), Neon Green, Blue, Magenta

**Accent Color Options (11):**
- AI Decides, Purple, Cyan, Pink, Orange, Red, Blue, Green, Yellow, Gold, Teal

---

#### 2. THUMBNAIL (`thumbnail.yaml`)
| Field | Backend | Frontend | Status |
|-------|---------|----------|--------|
| `title` | ✅ text, max 40 | ✅ Yes | ✅ OK |
| `subtitle` | ✅ text, max 30 | ✅ Yes | ✅ OK |
| `character_description` | ✅ select, 10 options | ❌ Missing | 🔴 GAP |
| `accent_color` | ✅ select, 12 options | ❌ Missing | 🔴 GAP |
| `background_scheme` | ✅ select, 10 options (color-pop only) | ❌ Missing | 🔴 GAP |

**Character Description Options (10):**
- AI Decides, High-Detail 3D Character, Anime Character, Cartoon Character, Realistic Gamer, Chibi Character, Esports Pro, Streamer Avatar, Gaming Mascot, No Character (Text Only)

**Background Scheme Options (10) - Only for `color-pop` vibe:**
- Purple & Cyan, Orange & Red, Blue & Green, Pink & Gold, Navy & Silver, Lime & Black, Pink & Purple, Teal & Coral, Red & Gray, Gold & Blue

---

#### 3. GOING-LIVE (`going-live.yaml`)
| Field | Backend | Frontend | Status |
|-------|---------|----------|--------|
| `title` | ✅ text, max 50 | ✅ Yes | ✅ OK |
| `game` | ✅ text, max 30 | ✅ Yes | ✅ OK |
| `time` | ✅ text, max 20 | ✅ Yes | ✅ OK |
| `character_description` | ✅ select, 8 options (anime/playful only) | ❌ Missing | 🔴 GAP |
| `accent_color` | ✅ select, 10 options | ❌ Missing | 🔴 GAP |

**Character Description Options (8) - Only for `anime` and `playful` vibes:**
- AI Decides, Stylized Streamer, Anime Character, Chibi Character, Gaming Mascot, Cool Avatar, Energetic Host, No Character

---

#### 4. MILESTONE (`milestone.yaml`)
| Field | Backend | Frontend | Status |
|-------|---------|----------|--------|
| `type` | ✅ select, 3 options | ✅ Yes | ✅ OK |
| `count` | ✅ text, max 20 | ✅ Yes | ✅ OK |
| `character_description` | ✅ select, 6 options (anime/playful only) | ❌ Missing | 🔴 GAP |
| `accent_color` | ✅ select, 9 options (includes Rainbow!) | ❌ Missing | 🔴 GAP |

**Accent Color includes RAINBOW option** - great for celebrations!

---

#### 5. OFFLINE (`offline.yaml`)
| Field | Backend | Frontend | Status |
|-------|---------|----------|--------|
| `message` | ✅ text, max 40 | ✅ Yes | ✅ OK |
| `schedule` | ✅ text, max 40 | ✅ Yes | ✅ OK |
| `character_description` | ✅ select, 7 options (anime only) | ❌ Missing | 🔴 GAP |
| `accent_color` | ✅ select, 8 options | ❌ Missing | 🔴 GAP |

**Unique Accent Colors:** Warm White, Moonlight Blue (calming offline vibes)

---

#### 6. CLIP-HIGHLIGHT (`clip-highlight.yaml`)
| Field | Backend | Frontend | Status |
|-------|---------|----------|--------|
| `title` | ✅ text, max 40 | ✅ Yes | ✅ OK |
| `game` | ✅ text, max 30 | ✅ Yes | ✅ OK |
| `character_description` | ✅ select, 8 options | ❌ Missing | 🔴 GAP |
| `accent_color` | ✅ select, 9 options | ❌ Missing | 🔴 GAP |

---

#### 7. SCHEDULE (`schedule.yaml`)
| Field | Backend | Frontend | Status |
|-------|---------|----------|--------|
| `days` | ✅ text, max 50 | ✅ Yes | ✅ OK |
| `times` | ✅ text, max 30 | ✅ Yes | ✅ OK |
| `accent_color` | ✅ select, 9 options | ❌ Missing | 🔴 GAP |

---

#### 8. STARTING-SOON (`starting-soon.yaml`)
| Field | Backend | Frontend | Status |
|-------|---------|----------|--------|
| `message` | ✅ text, max 40 | ✅ Yes | ✅ OK |
| `accent_color` | ✅ select, 11 options | ❌ Missing | 🔴 GAP |

---

#### 9. PANEL (`panel.yaml`)
| Field | Backend | Frontend | Status |
|-------|---------|----------|--------|
| `type` | ✅ select, 8 options | ⚠️ 4 options only | 🟡 PARTIAL |
| `accent_color` | ✅ select, 9 options | ❌ Missing | 🔴 GAP |

**Missing Panel Type Options (4):**
- discord, socials, faq, commands

**Panel Accent Color Options (9):**
- AI Decides, Grey, Purple, Cyan, Pink, Blue, Green, Orange, Teal

---

#### 10. LOGO (`logo.yaml`) 🚨 ENTIRE TEMPLATE MISSING
| Field | Backend | Frontend | Status |
|-------|---------|----------|--------|
| `name` | ✅ text, max 50 | ❌ N/A | 🔴 GAP |
| `icon` | ✅ select, 35 options | ❌ N/A | 🔴 GAP |
| `background_color` | ✅ color picker with 10 presets | ❌ N/A | 🔴 GAP |

**Icon Options (35):**
- Animals: Wolf, Dragon, Phoenix, Lion, Eagle, Tiger, Panther, Fox, Bear, Owl, Raven, Snake, Cat
- Symbols: Skull, Crown, Lightning Bolt, Flame, Sword, Shield, Star, Moon, Crystal, Diamond, Heart
- Gaming: Controller, Headset, Keyboard
- Characters: Robot, Alien, Ninja, Samurai, Knight, Wizard, Demon, Angel

**5 Premium Vibes:**
- Studio Minimalist, Collectible, Stealth Pro, Liquid Flow, Heavy Metal

---

## SUMMARY STATISTICS

| Metric | Count |
|--------|-------|
| Total Backend Fields | 37 |
| Total Frontend Fields | 17 |
| Missing Fields | **20** |
| Missing Templates | **1** (Logo) |
| Partial Fields | **1** (Panel type options) |
| Coverage | **46%** |

---

## IMPLEMENTATION PLAN

### Phase 1: Fix Field Merge Logic (CRITICAL)
**Files to modify:**
- `tsx/apps/web/src/components/quick-create/QuickCreateWizard.tsx`

**Change:**
```typescript
// BEFORE (broken)
const frontendOnlyFields = template.fields.filter(f => 
  !backendFieldIds.has(f.id) && (f.type === 'dynamic_select' || f.dependsOn)
);
const mergedFields = [...convertedBackendFields, ...frontendOnlyFields];

// AFTER (fixed)
// Backend fields are source of truth
// Only add FE-only fields that don't exist in backend
const frontendOnlyFields = template.fields.filter(f => 
  !backendFieldIds.has(f.id)
);
const mergedFields = [...convertedBackendFields, ...frontendOnlyFields];
```

**Estimated time:** 15 minutes
**Risk:** Low - simple logic change
**Testing:** Verify all backend fields appear in UI

---

### Phase 2: Clean Up Frontend Constants
**Files to modify:**
- `tsx/apps/web/src/components/quick-create/constants.ts`

**Changes:**
1. Remove hardcoded `fields` arrays from each template
2. Keep only: id, name, tagline, category, assetType, dimensions, emoji, previewStyle, vibes
3. Add FE-only fields separately (platform, size for emotes)

**Estimated time:** 30 minutes
**Risk:** Low - removing redundant code
**Testing:** Verify templates still load correctly

---

### Phase 3: Add Logo Template
**Files to modify:**
- `tsx/apps/web/src/components/quick-create/constants.ts`

**Add:**
```typescript
{
  id: 'logo',
  name: 'Logo / Avatar',
  tagline: 'Brand identity',
  category: 'branding', // New category needed
  assetType: 'logo',
  dimensions: '512×512',
  emoji: '🎨',
  previewStyle: 'Square logo for Discord, Twitter, Twitch avatars',
  vibes: LOGO_VIBES, // New vibe array
}
```

**Also add:**
- New category 'branding' to CATEGORIES array
- LOGO_VIBES array with 5 vibes

**Estimated time:** 30 minutes
**Risk:** Low - additive change
**Testing:** Verify logo template appears and generates correctly

---

### Phase 4: Add Color Picker Support
**Files to modify:**
- `tsx/apps/web/src/components/quick-create/panels/CustomizeForm.tsx`
- `tsx/apps/web/src/components/quick-create/types.ts`
- `backend/api/routes/templates.py` (NEW - must add presets support)

**Changes:**
1. **Backend:** Add `presets` field to TemplateField model and load from YAML
2. **Frontend:** Add support for `type: 'color'` fields
3. **Frontend:** Render color picker with preset swatches
4. **Frontend:** Handle hex color values

**Estimated time:** 1.5 hours (includes backend fix)
**Risk:** Medium - new component type + backend schema change
**Testing:** Verify color picker works for logo background_color

---

### Phase 5: Sync Panel Type Options
**Files to modify:**
- `backend/prompts/quick-create/panel.yaml` (verify options)
- Frontend will auto-sync after Phase 1 fix

**Missing options to verify in YAML:**
- discord, socials, faq, commands

**Estimated time:** 15 minutes
**Risk:** Low
**Testing:** Verify all 8 panel types appear

---

## EXECUTION STRATEGY WITH SUB-AGENTS

### Task Delegation Plan

```
┌─────────────────────────────────────────────────────────────────┐
│                    MAIN AGENT (Coordinator)                     │
│  - Orchestrates phases                                          │
│  - Reviews sub-agent output                                     │
│  - Handles integration testing                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  SUB-AGENT 1  │    │  SUB-AGENT 2  │    │  SUB-AGENT 3  │
│  Phase 1 & 2  │    │  Phase 3 & 4  │    │  Phase 5      │
│               │    │               │    │               │
│ - Fix merge   │    │ - Add Logo    │    │ - Sync panel  │
│   logic       │    │   template    │    │   options     │
│ - Clean up    │    │ - Add color   │    │ - Verify YAML │
│   constants   │    │   picker      │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
```

### Sub-Agent 1: Field Merge Fix
**Prompt:**
```
Fix the Quick Create field merge logic in QuickCreateWizard.tsx.

Current problem: Backend fields are being filtered out instead of used.

Tasks:
1. In QuickCreateWizard.tsx, find the mergedTemplate useMemo
2. Change the merge logic so backend fields are the source of truth
3. Only add frontend-only fields (platform, size) that don't exist in backend
4. Remove hardcoded fields from constants.ts templates (keep only UI metadata)
5. Keep the FE-only fields for emote (platform, size with dynamic_select)

Test by verifying the emote template shows character_description, 
background_color, and accent_color fields from backend.
```

### Sub-Agent 2: Logo Template & Color Picker
**Prompt:**
```
Add the Logo template to Quick Create and implement color picker support.

Tasks:
1. BACKEND FIX FIRST:
   - In backend/api/routes/templates.py, add ColorPreset model
   - Add presets and show_presets fields to TemplateField model
   - Update load_template_meta to extract presets from YAML

2. FRONTEND - Constants:
   - Add 'branding' category to CATEGORIES in constants.ts
   - Add LOGO_VIBES array with 5 vibes:
     - studio-minimalist, collectible, stealth-pro, liquid-flow, heavy-metal
   - Add logo template to TEMPLATES array

3. FRONTEND - Types:
   - Update TemplateCategory to include 'branding'
   - Update QuickTemplate.category to include 'branding'
   - Add presets and showPresets to TemplateField interface

4. FRONTEND - API Client:
   - Update useTemplates.ts transformField to include presets

5. FRONTEND - Color Picker:
   - In CustomizeForm.tsx, add support for type='color' fields
   - Create ColorPickerField component with preset swatches
   - Handle hex color values in form state

The logo template should show: name (text), icon (select), background_color (color with 10 presets)
```

### Sub-Agent 3: Panel Options Sync
**Prompt:**
```
Verify and sync panel type options between backend and frontend.

Tasks:
1. Read backend/prompts/quick-create/panel.yaml
2. Verify it has all 8 options: about, schedule, rules, donate, discord, socials, faq, commands
3. If missing, add them to the YAML
4. After Phase 1 fix, frontend will auto-sync
5. Test that all 8 panel types appear in the UI
```

---

## TESTING CHECKLIST

### After Phase 1 (Field Merge Fix)
- [ ] Emote shows: emotion, text, character_description, background_color, accent_color
- [ ] Thumbnail shows: title, subtitle, character_description, accent_color, background_scheme (for color-pop)
- [ ] Going-live shows: title, game, time, character_description (anime/playful), accent_color
- [ ] Milestone shows: type, count, character_description (anime/playful), accent_color
- [ ] Offline shows: message, schedule, character_description (anime), accent_color
- [ ] Clip-highlight shows: title, game, character_description, accent_color
- [ ] Schedule shows: days, times, accent_color
- [ ] Starting-soon shows: message, accent_color
- [ ] Panel shows: type (8 options), accent_color

### After Phase 3 (Logo Template)
- [ ] Logo template appears in template grid
- [ ] 'Branding' category shows in category filter
- [ ] Logo shows: name, icon (35 options), background_color
- [ ] All 5 logo vibes are selectable
- [ ] Logo generation works end-to-end

### After Phase 4 (Color Picker)
- [ ] Color picker renders for logo background_color
- [ ] Preset swatches are clickable
- [ ] Custom hex input works
- [ ] Color value is sent to backend correctly

### After Phase 5 (Panel Sync)
- [ ] Panel type dropdown shows all 8 options
- [ ] Each panel type generates correctly

---

## ROLLBACK PLAN

If issues arise:
1. **Phase 1 rollback:** Revert QuickCreateWizard.tsx merge logic
2. **Phase 2 rollback:** Restore hardcoded fields in constants.ts
3. **Phase 3 rollback:** Remove logo template from TEMPLATES array
4. **Phase 4 rollback:** Remove color picker component, revert CustomizeForm.tsx
5. **Phase 5 rollback:** N/A (backend-only, no frontend changes)

---

## SUCCESS METRICS

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Field Coverage | 46% | 100% | ✅ |
| Templates Exposed | 9/10 | 10/10 | ✅ |
| User Control Options | 17 | 37 | ✅ |
| Panel Type Options | 4 | 8 | ✅ |

---

## APPENDIX: Complete Field Reference

### All Backend Placeholders by Template

```yaml
emote:
  - emotion (select, required)
  - text (text, optional, max 10)
  - character_description (select, optional, 21 options)
  - background_color (select, optional, 4 options)
  - accent_color (select, optional, 11 options)

thumbnail:
  - title (text, required, max 40)
  - subtitle (text, optional, max 30)
  - character_description (select, optional, 10 options)
  - accent_color (select, optional, 12 options)
  - background_scheme (select, optional, 10 options, show_for_vibes: [color-pop])

going-live:
  - title (text, required, max 50)
  - game (text, optional, max 30)
  - time (text, optional, max 20)
  - character_description (select, optional, 8 options, show_for_vibes: [anime, playful])
  - accent_color (select, optional, 10 options)

milestone:
  - type (select, required, 3 options)
  - count (text, required, max 20)
  - character_description (select, optional, 6 options, show_for_vibes: [anime, playful])
  - accent_color (select, optional, 9 options)

offline:
  - message (text, optional, max 40)
  - schedule (text, optional, max 40)
  - character_description (select, optional, 7 options, show_for_vibes: [anime])
  - accent_color (select, optional, 8 options)

clip-highlight:
  - title (text, required, max 40)
  - game (text, optional, max 30)
  - character_description (select, optional, 8 options)
  - accent_color (select, optional, 9 options)

schedule:
  - days (text, required, max 50)
  - times (text, optional, max 30)
  - accent_color (select, optional, 9 options)

starting-soon:
  - message (text, optional, max 40)
  - accent_color (select, optional, 11 options)

panel:
  - type (select, required, 8 options)
  - accent_color (select, optional, 9 options)

logo:
  - name (text, required, max 50)
  - icon (select, required, 35 options)
  - background_color (color, required, 10 presets)
```

---

*This schema is the single source of truth for the Quick Create field alignment project.*


---

## DETAILED IMPLEMENTATION GUIDE

### Phase 1: Fix Field Merge Logic

#### File: `tsx/apps/web/src/components/quick-create/QuickCreateWizard.tsx`

**Current Code (Lines ~100-140):**
```typescript
const mergedTemplate = useMemo(() => {
  if (!template) return null;
  if (!backendTemplate) return template;

  // Merge fields: use backend fields, but keep frontend-only fields (like dynamic_select)
  const backendFieldIds = new Set(backendTemplate.fields.map(f => f.id));
  const frontendOnlyFields = template.fields.filter(f => 
    !backendFieldIds.has(f.id) && (f.type === 'dynamic_select' || f.dependsOn)
  );

  // Convert backend fields to frontend format
  const convertedBackendFields: TemplateField[] = backendTemplate.fields.map(f => ({
    id: f.id,
    label: f.label,
    type: f.type as any,
    required: f.required,
    placeholder: f.placeholder,
    hint: f.hint,
    description: f.description,
    maxLength: f.maxLength,
    options: f.options,
    default: f.default,
    showForVibes: f.showForVibes,
  }));

  // ... rest of merge
  return {
    ...template,
    fields: [...convertedBackendFields, ...frontendOnlyFields],
    vibes: mergedVibes.length > 0 ? mergedVibes : template.vibes,
  };
}, [template, backendTemplate]);
```

**Fixed Code:**
```typescript
const mergedTemplate = useMemo(() => {
  if (!template) return null;
  if (!backendTemplate) return template;

  // Backend fields are the SOURCE OF TRUTH
  // Only add frontend-only fields that don't exist in backend
  const backendFieldIds = new Set(backendTemplate.fields.map(f => f.id));
  
  // Keep ALL frontend fields that don't exist in backend
  // This includes platform/size for emotes (dynamic_select)
  const frontendOnlyFields = template.fields.filter(f => 
    !backendFieldIds.has(f.id)
  );

  // Convert backend fields to frontend format
  const convertedBackendFields: TemplateField[] = backendTemplate.fields.map(f => ({
    id: f.id,
    label: f.label,
    type: f.type as any,
    required: f.required,
    placeholder: f.placeholder,
    hint: f.hint,
    description: f.description,
    maxLength: f.maxLength,
    options: f.options,
    default: f.default,
    showForVibes: f.showForVibes,
  }));

  // Merge vibes: use backend vibes but add UI metadata from frontend
  const mergedVibes = backendTemplate.vibes.map(bv => {
    const uiMeta = getVibeUIMeta(template.id, bv.id);
    return {
      id: bv.id,
      name: bv.name,
      tagline: uiMeta.tagline || bv.description || '',
      icon: uiMeta.icon || '✨',
      gradient: uiMeta.gradient || 'from-primary-600 to-primary-800',
    };
  });

  return {
    ...template,
    // Backend fields first, then FE-only fields
    fields: [...convertedBackendFields, ...frontendOnlyFields],
    vibes: mergedVibes.length > 0 ? mergedVibes : template.vibes,
  };
}, [template, backendTemplate]);
```

---

### Phase 2: Clean Up Frontend Constants

#### File: `tsx/apps/web/src/components/quick-create/constants.ts`

**Before (each template has hardcoded fields):**
```typescript
{
  id: 'emote', name: 'Custom Emote', tagline: 'Chat expression', category: 'twitch',
  assetType: 'twitch_emote', dimensions: '112×112', emoji: '😀',
  fields: [
    { id: 'platform', label: 'Platform', type: 'select', required: true, options: EMOTE_PLATFORMS },
    { id: 'emotion', label: 'Emotion', type: 'select', required: true, options: [...] },
    { id: 'text', label: 'Text (optional)', type: 'text', placeholder: 'GG', maxLength: 10 },
    { id: 'size', label: 'Size', type: 'dynamic_select', required: true, dependsOn: 'platform', optionsMap: EMOTE_SIZES },
  ],
  previewStyle: 'Platform-ready emote, readable at all sizes', vibes: EMOTE_VIBES,
},
```

**After (only UI metadata + FE-only fields):**
```typescript
{
  id: 'emote', name: 'Custom Emote', tagline: 'Chat expression', category: 'twitch',
  assetType: 'twitch_emote', dimensions: '112×112', emoji: '😀',
  // Only FE-only fields that don't exist in backend YAML
  fields: [
    { id: 'platform', label: 'Platform', type: 'select', required: true, options: EMOTE_PLATFORMS },
    { id: 'size', label: 'Size', type: 'dynamic_select', required: true, dependsOn: 'platform', optionsMap: EMOTE_SIZES },
  ],
  previewStyle: 'Platform-ready emote, readable at all sizes', vibes: EMOTE_VIBES,
},
```

**Templates with NO FE-only fields (remove fields array entirely):**
- going-live
- schedule
- starting-soon
- clip-highlight
- milestone
- thumbnail
- panel
- offline

---

### Phase 3: Add Logo Template

#### Add to `constants.ts`:

```typescript
// Add new category
export const CATEGORIES: { id: TemplateCategory; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '✨' },
  { id: 'stream', label: 'Stream', emoji: '🎮' },
  { id: 'social', label: 'Social', emoji: '📱' },
  { id: 'twitch', label: 'Twitch', emoji: '💜' },
  { id: 'branding', label: 'Branding', emoji: '🎨' }, // NEW
];

// Add logo vibes
const LOGO_VIBES: VibeOption[] = [
  { id: 'studio-minimalist', name: 'Studio Minimalist', tagline: 'Clean, professional icon', icon: '🎯', gradient: 'from-slate-600 to-zinc-800' },
  { id: 'collectible', name: 'Collectible', tagline: 'Designer vinyl toy aesthetic', icon: '🧸', gradient: 'from-rose-500 to-orange-500' },
  { id: 'stealth-pro', name: 'Stealth Pro', tagline: 'Obsidian and neon esports', icon: '🌙', gradient: 'from-emerald-600 to-slate-800' },
  { id: 'liquid-flow', name: 'Liquid Flow', tagline: 'Organic chrome reflections', icon: '💧', gradient: 'from-sky-400 to-blue-600' },
  { id: 'heavy-metal', name: 'Heavy Metal', tagline: 'Esports championship badge', icon: '🛡️', gradient: 'from-amber-500 to-yellow-600' },
];

// Add logo template to TEMPLATES array
{
  id: 'logo',
  name: 'Logo / Avatar',
  tagline: 'Brand identity',
  category: 'branding',
  assetType: 'logo',
  dimensions: '512×512',
  emoji: '🎨',
  fields: [], // All fields come from backend
  previewStyle: 'Square logo for Discord, Twitter, Twitch avatars',
  vibes: LOGO_VIBES,
},
```

#### Update types.ts:
```typescript
export type TemplateCategory = 'all' | 'stream' | 'social' | 'twitch' | 'branding';
```

**Also update QuickTemplate interface:**
```typescript
export interface QuickTemplate {
  id: string;
  name: string;
  tagline: string;
  category: 'stream' | 'social' | 'twitch' | 'branding'; // Add branding
  // ... rest unchanged
}
```

---

### Phase 4: Add Color Picker Support

#### File: `backend/api/routes/templates.py`

**Add presets support to TemplateField model:**

```python
class ColorPreset(BaseModel):
    """Color preset for color picker fields."""
    label: str
    value: str
    category: Optional[str] = None


class TemplateField(BaseModel):
    """Field definition for a template."""
    id: str
    label: str
    type: str  # text, select, color
    required: bool = False
    placeholder: Optional[str] = None
    hint: Optional[str] = None
    description: Optional[str] = None
    max_length: Optional[int] = None
    options: Optional[list[FieldOption]] = None
    default: Optional[str] = None
    show_for_vibes: Optional[list[str]] = None
    # NEW: For color type fields
    presets: Optional[list[ColorPreset]] = None
    show_presets: Optional[bool] = None
```

**Update load_template_meta to handle presets:**

```python
# In the placeholder processing loop, add:
if 'presets' in placeholder:
    presets = []
    for preset in placeholder['presets']:
        presets.append(ColorPreset(
            label=preset.get('label', ''),
            value=preset.get('value', ''),
            category=preset.get('category'),
        ))
    field.presets = presets
    field.show_presets = placeholder.get('show_presets', True)
```

#### File: `tsx/apps/web/src/components/quick-create/panels/CustomizeForm.tsx`

**Add color field rendering in the fields loop:**

```typescript
{template.fields
  .filter(field => !field.showForVibes || field.showForVibes.includes(selectedVibe))
  .map(field => {
    // ... existing select/text handling ...
    
    // NEW: Color picker support
    if (field.type === 'color') {
      return (
        <div key={field.id}>
          <label className="block text-micro font-medium text-text-secondary mb-1">
            {field.label}
            {field.required && <span className="text-error-light ml-0.5">*</span>}
          </label>
          <ColorPickerField
            value={formValues[field.id] || field.default || ''}
            onChange={(color) => onFieldChange(field.id, color)}
            presets={field.presets}
          />
          {field.hint && (
            <p className="text-micro text-text-muted mt-0.5">{field.hint}</p>
          )}
        </div>
      );
    }
    
    // ... rest of field types ...
  })}
```

#### Create new component: `tsx/apps/web/src/components/quick-create/ColorPickerField.tsx`

```typescript
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ColorPreset {
  label: string;
  value: string;
  category?: string;
}

interface ColorPickerFieldProps {
  value: string;
  onChange: (color: string) => void;
  presets?: ColorPreset[];
}

export function ColorPickerField({ value, onChange, presets = [] }: ColorPickerFieldProps) {
  const [showCustom, setShowCustom] = useState(false);
  
  // Group presets by category
  const darkPresets = presets.filter(p => p.category === 'dark');
  const vibrantPresets = presets.filter(p => p.category === 'vibrant');
  const allPresets = darkPresets.length > 0 ? [...darkPresets, ...vibrantPresets] : presets;

  return (
    <div className="space-y-2">
      {/* Preset swatches */}
      <div className="flex flex-wrap gap-1.5">
        {allPresets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            className={cn(
              "w-7 h-7 rounded-lg border-2 transition-all",
              value === preset.value 
                ? "border-interactive-600 ring-2 ring-interactive-600/30" 
                : "border-transparent hover:border-border-default"
            )}
            style={{ backgroundColor: preset.value }}
            title={preset.label}
          />
        ))}
        
        {/* Custom color toggle */}
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={cn(
            "w-7 h-7 rounded-lg border-2 flex items-center justify-center text-xs",
            showCustom 
              ? "border-interactive-600 bg-interactive-600/10" 
              : "border-border-subtle hover:border-border-default"
          )}
          title="Custom color"
        >
          #
        </button>
      </div>
      
      {/* Custom hex input */}
      {showCustom && (
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg border border-border-subtle"
            style={{ backgroundColor: value }}
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#1a0a2e"
            className="flex-1 px-2.5 py-1.5 text-xs bg-background-base border border-border-subtle rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-interactive-600 font-mono"
          />
        </div>
      )}
    </div>
  );
}
```

#### Update types to support color presets:

```typescript
// In types.ts - Add presets to TemplateField interface
export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'dynamic_select' | 'color'; // Add 'color'
  required?: boolean;
  placeholder?: string;
  hint?: string;
  description?: string;
  maxLength?: number;
  options?: { value: string; label: string }[];
  optionsMap?: Record<string, { value: string; label: string }[]>;
  dependsOn?: string;
  default?: string;
  showForVibes?: string[];
  // NEW: For color type fields
  presets?: { label: string; value: string; category?: string }[];
  showPresets?: boolean;
}
```

**Note:** The backend YAML uses `presets` array with `category` for grouping (dark/vibrant). The `show_presets: true` flag indicates presets should be shown.

---

### Phase 5: Verify Panel Options

#### File: `backend/prompts/quick-create/panel.yaml`

**Verify these options exist:**
```yaml
placeholders:
  - name: type
    type: select
    required: true
    label: "Panel Type"
    description: "What this panel is for"
    options:
      - label: "About Me"
        value: "about"
      - label: "Schedule"
        value: "schedule"
      - label: "Rules"
        value: "rules"
      - label: "Support"
        value: "donate"
      - label: "Discord"
        value: "discord"
      - label: "Socials"
        value: "socials"
      - label: "FAQ"
        value: "faq"
      - label: "Commands"
        value: "commands"
```

---

## VERIFICATION COMMANDS

After implementation, run these to verify:

```bash
# Backend - verify templates API returns all fields
curl http://localhost:8000/api/v1/templates/emote | jq '.fields | length'
# Expected: 5 (emotion, text, character_description, background_color, accent_color)

curl http://localhost:8000/api/v1/templates/thumbnail | jq '.fields | length'
# Expected: 5 (title, subtitle, character_description, accent_color, background_scheme)

curl http://localhost:8000/api/v1/templates/logo | jq '.fields | length'
# Expected: 3 (name, icon, background_color)

# Verify logo background_color has presets
curl http://localhost:8000/api/v1/templates/logo | jq '.fields[] | select(.id == "background_color") | .presets | length'
# Expected: 10

# Frontend - verify no TypeScript errors
cd tsx && npm run typecheck

# Frontend - verify lint passes
cd tsx && npm run lint
```

---

## ADDITIONAL FILES TO UPDATE

### `tsx/packages/api-client/src/hooks/useTemplates.ts`

**Add presets to transform function:**

```typescript
function transformField(field: any): TemplateField {
  return {
    id: field.id,
    label: field.label,
    type: field.type,
    required: field.required ?? false,
    placeholder: field.placeholder,
    hint: field.hint,
    description: field.description,
    maxLength: field.max_length,
    options: field.options,
    default: field.default,
    showForVibes: field.show_for_vibes,
    // NEW: Color picker presets
    presets: field.presets,
    showPresets: field.show_presets,
  };
}
```

---

## FINAL CHECKLIST

### Files Modified
- [ ] `tsx/apps/web/src/components/quick-create/QuickCreateWizard.tsx` - Phase 1
- [ ] `tsx/apps/web/src/components/quick-create/constants.ts` - Phase 2 & 3
- [ ] `tsx/apps/web/src/components/quick-create/types.ts` - Phase 3 & 4
- [ ] `backend/api/routes/templates.py` - Phase 4 (presets support)
- [ ] `tsx/packages/api-client/src/hooks/useTemplates.ts` - Phase 4 (presets transform)
- [ ] `tsx/apps/web/src/components/quick-create/panels/CustomizeForm.tsx` - Phase 4
- [ ] `tsx/apps/web/src/components/quick-create/ColorPickerField.tsx` - Phase 4 (NEW FILE)

### Verification
- [ ] Phase 1: Field merge logic fixed
- [ ] Phase 2: Hardcoded fields removed from constants.ts
- [ ] Phase 3: Logo template added with branding category
- [ ] Phase 4: Color picker component created and integrated
- [ ] Phase 4: Backend presets support added
- [ ] Phase 5: Panel YAML has all 8 options (already verified ✅)
- [ ] All 37 backend fields now appear in frontend
- [ ] All 10 templates accessible
- [ ] Generation works end-to-end for all templates
- [ ] No TypeScript errors
- [ ] No lint errors

---

*Implementation ready. Proceed with Phase 1.*
