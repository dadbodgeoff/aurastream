# Quick Create Templates - Prompt Engineering Specification

## Overview

This document provides the complete specification for engineering prompts for the 10 Quick Create templates. Each template requires a carefully crafted prompt that:
1. Produces consistent, high-quality results
2. Integrates seamlessly with the existing `PromptEngine` system
3. Accepts user field values as placeholders
4. Works with or without brand kit context

---

## System Architecture

### Prompt Flow
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER INPUT                                                                  │
│  ├── Template Selection (e.g., "going-live")                                │
│  ├── Field Values (e.g., title="Ranked Grind", game="Valorant")             │
│  └── Brand Kit ID (optional)                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  PROMPT CONSTRUCTION (Backend)                                               │
│  ├── Load template YAML from backend/prompts/quick-create/{template_id}.yaml│
│  ├── Inject user field values into placeholders                             │
│  ├── If brand_kit_id: inject brand context via BrandContextResolver         │
│  └── Append quality modifiers                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  FINAL MEGA-PROMPT                                                           │
│  [Asset Directive] + [Style Anchor] + [User Content] + [Brand Block] +      │
│  [Technical Directives]                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## YAML Template Structure

### File Location
```
backend/prompts/quick-create/
├── going-live.yaml
├── schedule.yaml
├── starting-soon.yaml
├── clip-highlight.yaml
├── milestone.yaml
├── thumbnail.yaml
├── emote.yaml
├── panel.yaml
└── offline.yaml
```

### Template Schema

```yaml
# Template Metadata
name: string                    # Template identifier (matches frontend id)
version: string                 # Semantic version (e.g., "1.0.0")
category: string                # "stream" | "social" | "twitch"
asset_type: string              # Maps to AssetType enum

# Dimensions
dimensions:
  width: number
  height: number
  aspect_ratio: string          # e.g., "9:16", "16:9", "1:1"

# Prompt Components
base_prompt: string             # Main prompt with {placeholders}
style_anchor: string            # Visual style description
composition_guide: string       # Layout/composition instructions
technical_requirements: string  # Format-specific requirements

# Quality Modifiers (appended to all prompts)
quality_modifiers:
  - string[]

# Placeholder Definitions
placeholders:
  - name: string                # Placeholder name (e.g., "title")
    type: string                # "text" | "select" | "number"
    required: boolean
    default: string             # Default value if not provided
    max_length: number          # For text fields
    options: string[]           # For select fields

# Brand Integration
brand_integration:
  supports_logo: boolean        # Whether logo can be composited
  logo_positions: string[]      # Valid positions for this asset type
  color_application: string     # How colors are applied
  intensity_default: string     # "subtle" | "balanced" | "strong"
```

---

## Template Specifications

### 1. Going Live (Stream Announcement)

| Property | Value |
|----------|-------|
| ID | `going-live` |
| Category | `stream` |
| Asset Type | `story_graphic` |
| Dimensions | 1080×1920 (9:16) |

#### User Fields
| Field | Type | Required | Max Length | Default |
|-------|------|----------|------------|---------|
| `title` | text | ✅ | 50 | - |
| `game` | text | ❌ | 30 | "gaming" |
| `time` | text | ❌ | 20 | "LIVE NOW" |

#### Prompt Components
```yaml
style_anchor: |
  Dynamic vertical composition, bold modern typography, 
  energetic streaming aesthetic, social media story format

composition_guide: |
  - Large bold title text in upper third
  - Game name as secondary text
  - Time/schedule in accent area
  - Space for logo in bottom corner
  - High contrast for mobile viewing

base_prompt: |
  Create a vertical stream announcement graphic.
  Title: "{title}"
  Game: {game}
  Time: {time}
  Style: Bold, energetic, eye-catching for social media stories.
  Layout: Title prominent at top, game and time below, clean modern design.

technical_requirements: |
  - Vertical 9:16 aspect ratio optimized for Instagram/TikTok stories
  - High contrast text for mobile readability
  - Safe zones for platform UI elements
```

#### Quality Modifiers
```yaml
quality_modifiers:
  - "high contrast"
  - "bold typography"
  - "mobile-optimized"
  - "professional streaming aesthetic"
  - "vibrant colors"
```

---

### 2. Weekly Schedule (Streaming Calendar)

| Property | Value |
|----------|-------|
| ID | `schedule` |
| Category | `stream` |
| Asset Type | `banner` |
| Dimensions | 1200×480 (2.5:1) |

#### User Fields
| Field | Type | Required | Max Length | Default |
|-------|------|----------|------------|---------|
| `days` | text | ✅ | 50 | - |
| `times` | text | ❌ | 30 | "Check schedule" |

#### Prompt Components
```yaml
style_anchor: |
  Clean calendar layout, organized grid design, 
  professional streaming schedule aesthetic

composition_guide: |
  - Days displayed as distinct blocks or columns
  - Times clearly associated with each day
  - Horizontal banner format for Twitch/YouTube
  - Logo space in corner

base_prompt: |
  Create a streaming schedule banner graphic.
  Days: {days}
  Times: {times}
  Style: Clean, organized calendar layout with highlighted streaming days.
  Layout: Horizontal banner with days as visual blocks, times clearly visible.

technical_requirements: |
  - Horizontal banner format (2.5:1 aspect ratio)
  - Readable at small sizes (Twitch panel)
  - Clear day/time hierarchy
```

#### Quality Modifiers
```yaml
quality_modifiers:
  - "clean layout"
  - "organized design"
  - "readable typography"
  - "professional"
  - "calendar aesthetic"
```

---

### 3. Starting Soon (Pre-Stream Screen)

| Property | Value |
|----------|-------|
| ID | `starting-soon` |
| Category | `stream` |
| Asset Type | `overlay` |
| Dimensions | 1920×1080 (16:9) |

#### User Fields
| Field | Type | Required | Max Length | Default |
|-------|------|----------|------------|---------|
| `message` | text | ❌ | 40 | "Starting Soon" |

#### Prompt Components
```yaml
style_anchor: |
  Countdown aesthetic, motion-implied design, 
  anticipation-building, stream overlay format

composition_guide: |
  - Central message area
  - Animated/motion-implied elements
  - Space for countdown timer overlay
  - Full-screen 16:9 format

base_prompt: |
  Create a "starting soon" stream overlay screen.
  Message: "{message}"
  Style: Countdown aesthetic with motion-implied elements, building anticipation.
  Layout: Centered message, space for timer, full-screen overlay design.

technical_requirements: |
  - Full HD 16:9 format for stream overlay
  - Central safe zone for text/timer
  - Works as static image or animation base
```

#### Quality Modifiers
```yaml
quality_modifiers:
  - "dynamic composition"
  - "motion-implied"
  - "anticipation aesthetic"
  - "stream overlay quality"
  - "professional broadcast"
```

---

### 4. Clip Highlight (Social Share)

| Property | Value |
|----------|-------|
| ID | `clip-highlight` |
| Category | `social` |
| Asset Type | `clip_cover` |
| Dimensions | 1080×1080 (1:1) |

#### User Fields
| Field | Type | Required | Max Length | Default |
|-------|------|----------|------------|---------|
| `title` | text | ✅ | 40 | - |
| `game` | text | ❌ | 30 | "gaming" |

#### Prompt Components
```yaml
style_anchor: |
  Action-focused composition, dramatic lighting, 
  highlight reel aesthetic, square social format

composition_guide: |
  - Bold title text overlay
  - Action/dramatic composition
  - Game context visible
  - Square format for Instagram/Twitter

base_prompt: |
  Create a clip highlight cover image.
  Title: "{title}"
  Game: {game}
  Style: Action-focused, dramatic composition for sharing gaming highlights.
  Layout: Square format with bold title, dynamic visual suggesting exciting moment.

technical_requirements: |
  - Square 1:1 format for social media
  - High impact visual
  - Text readable at thumbnail size
```

#### Quality Modifiers
```yaml
quality_modifiers:
  - "action-packed"
  - "dramatic lighting"
  - "high impact"
  - "social media optimized"
  - "gaming highlight aesthetic"
```

---

### 5. Milestone (Achievement Celebration)

| Property | Value |
|----------|-------|
| ID | `milestone` |
| Category | `social` |
| Asset Type | `story_graphic` |
| Dimensions | 1080×1920 (9:16) |

#### User Fields
| Field | Type | Required | Options | Default |
|-------|------|----------|---------|---------|
| `type` | select | ✅ | followers, subs, viewers | - |
| `count` | text | ✅ | - | - |

#### Prompt Components
```yaml
style_anchor: |
  Celebratory design, achievement aesthetic, 
  bold numbers, confetti/celebration elements

composition_guide: |
  - Large prominent number display
  - Milestone type as context
  - Celebration visual elements
  - Vertical story format

base_prompt: |
  Create a milestone celebration graphic.
  Milestone Type: {type}
  Count: {count}
  Style: Celebratory achievement design with bold numbers and celebration elements.
  Layout: Vertical story format, large number prominent, festive aesthetic.

technical_requirements: |
  - Vertical 9:16 story format
  - Number must be highly legible
  - Celebration/achievement mood
```

#### Quality Modifiers
```yaml
quality_modifiers:
  - "celebratory"
  - "bold typography"
  - "achievement aesthetic"
  - "festive elements"
  - "social media story"
```

---

### 6. YouTube Thumbnail

| Property | Value |
|----------|-------|
| ID | `thumbnail` |
| Category | `social` |
| Asset Type | `thumbnail` |
| Dimensions | 1280×720 (16:9) |

#### User Fields
| Field | Type | Required | Max Length | Default |
|-------|------|----------|------------|---------|
| `title` | text | ✅ | 40 | - |
| `subtitle` | text | ❌ | 30 | "" |

#### Prompt Components
```yaml
style_anchor: |
  High-impact thumbnail design, expressive composition, 
  YouTube-optimized, click-worthy aesthetic

composition_guide: |
  - Bold title text (3-5 words max visible)
  - Expressive/emotional visual
  - High contrast for small display
  - Rule of thirds composition

base_prompt: |
  Create a YouTube video thumbnail.
  Title: "{title}"
  Subtitle: {subtitle}
  Style: High-impact, click-worthy design with expressive composition.
  Layout: Bold text, emotional visual, optimized for YouTube browse.

technical_requirements: |
  - 16:9 YouTube thumbnail format
  - Readable at 320px width (browse size)
  - High contrast and saturation
  - Avoid text in bottom-right (duration overlay)
```

#### Quality Modifiers
```yaml
quality_modifiers:
  - "high impact"
  - "click-worthy"
  - "YouTube optimized"
  - "expressive"
  - "thumbnail best practices"
```

---

### 7. Custom Emote (Twitch)

| Property | Value |
|----------|-------|
| ID | `emote` |
| Category | `twitch` |
| Asset Type | `twitch_emote` |
| Dimensions | 112×112 (1:1) |

#### User Fields
| Field | Type | Required | Options | Default |
|-------|------|----------|---------|---------|
| `emotion` | select | ✅ | hype, sad, laugh, love | - |
| `text` | text | ❌ | 10 | "" |

#### Prompt Components
```yaml
style_anchor: |
  Twitch emote style, expressive character design, 
  chat-optimized, clear at small sizes

composition_guide: |
  - Single expressive element
  - Clear emotion readable at 28px
  - Optional text integrated
  - Transparent background ready

base_prompt: |
  Create a Twitch chat emote.
  Emotion: {emotion}
  Text: {text}
  Style: Expressive emote design, clear emotion, optimized for Twitch chat.
  Layout: Single focused element, readable at very small sizes.

technical_requirements: |
  - Must work at 28px, 56px, and 112px
  - Clear silhouette
  - Expressive at all sizes
  - Suitable for transparent background
```

#### Quality Modifiers
```yaml
quality_modifiers:
  - "emote style"
  - "expressive"
  - "small-size optimized"
  - "clear silhouette"
  - "Twitch chat ready"
```

---

### 8. Channel Panel (Twitch)

| Property | Value |
|----------|-------|
| ID | `panel` |
| Category | `twitch` |
| Asset Type | `twitch_panel` |
| Dimensions | 320×160 (2:1) |

#### User Fields
| Field | Type | Required | Options | Default |
|-------|------|----------|---------|---------|
| `type` | select | ✅ | about, schedule, rules, donate | - |

#### Prompt Components
```yaml
style_anchor: |
  Twitch panel header style, clean professional design, 
  consistent branding, profile section aesthetic

composition_guide: |
  - Panel type as header text
  - Icon/visual representing panel purpose
  - Consistent with Twitch profile aesthetic
  - Horizontal panel format

base_prompt: |
  Create a Twitch channel panel header.
  Panel Type: {type}
  Style: Clean, professional panel header for Twitch profile section.
  Layout: Horizontal panel with type label and relevant icon/visual.

technical_requirements: |
  - Twitch panel dimensions (320×160)
  - Readable panel type
  - Works in Twitch profile layout
```

#### Quality Modifiers
```yaml
quality_modifiers:
  - "clean design"
  - "professional"
  - "Twitch panel style"
  - "consistent branding"
  - "profile aesthetic"
```

---

### 9. Offline Screen (Twitch)

| Property | Value |
|----------|-------|
| ID | `offline` |
| Category | `twitch` |
| Asset Type | `twitch_offline` |
| Dimensions | 1920×1080 (16:9) |

#### User Fields
| Field | Type | Required | Max Length | Default |
|-------|------|----------|------------|---------|
| `message` | text | ❌ | 40 | "Currently Offline" |
| `schedule` | text | ❌ | 40 | "" |

#### Prompt Components
```yaml
style_anchor: |
  Offline screen aesthetic, branded placeholder, 
  informative design, Twitch channel offline state

composition_guide: |
  - Offline message prominent
  - Schedule/return info if provided
  - Branded but subdued (not live energy)
  - Full-screen channel offline display

base_prompt: |
  Create a Twitch offline screen.
  Message: "{message}"
  Next Stream: {schedule}
  Style: Branded offline placeholder with schedule information.
  Layout: Full-screen with offline message and return schedule visible.

technical_requirements: |
  - Full HD 16:9 for Twitch offline display
  - Informative but not distracting
  - Works as static channel placeholder
```

#### Quality Modifiers
```yaml
quality_modifiers:
  - "offline aesthetic"
  - "branded placeholder"
  - "informative"
  - "professional"
  - "Twitch channel ready"
```

---

## Brand Integration Specification

### Brand Context Injection Format

When a brand kit is provided, the `BrandContextResolver` produces a `ResolvedBrandContext` that gets injected into the prompt using this format:

```
[BRAND: {intensity} - Colors: {colors} | Gradient: {gradient} | Font: {font} | Tone: {tone} | Tagline: "{tagline}" | Logo: {position} {size}]
```

### Example Brand Block
```
[BRAND: balanced - Colors: #FF6B35 #2E4057 accent:#F7C59F | Font: Montserrat 700 | Tone: energetic | Logo: bottom-right medium]
```

### Brand Integration by Asset Type

| Asset Type | Logo Support | Color Application | Recommended Intensity |
|------------|--------------|-------------------|----------------------|
| story_graphic | ✅ | Background, accents, text | balanced |
| banner | ✅ | Background, borders | balanced |
| overlay | ✅ | Accents, borders | subtle |
| clip_cover | ✅ | Accents, text | balanced |
| thumbnail | ✅ | Background, text | strong |
| twitch_emote | ❌ | Character colors | subtle |
| twitch_panel | ✅ | Background, text | balanced |
| twitch_offline | ✅ | Full branded | strong |

---

## No-Brand Fallback Specification

When no brand kit is provided, the system uses AI creative defaults:

```yaml
no_brand_defaults:
  style: "Use creative, professional design with vibrant colors and modern aesthetics"
  colors: "AI-selected complementary color palette"
  typography: "Modern, readable fonts appropriate for the asset type"
  tone: "Professional and engaging"
```

### No-Brand Prompt Format
```
Create a {asset_type} image.
Style: Use creative, professional design with vibrant colors and modern aesthetics.
Content: {user_content_from_fields}
Quality: {quality_modifiers}
```

---

## Quality Modifiers Reference

### Universal Modifiers (All Assets)
```yaml
universal:
  - "professional quality"
  - "high resolution"
  - "clean design"
```

### Category-Specific Modifiers

#### Stream Assets
```yaml
stream:
  - "streaming aesthetic"
  - "broadcast quality"
  - "dynamic composition"
  - "energetic"
```

#### Social Assets
```yaml
social:
  - "social media optimized"
  - "high contrast"
  - "scroll-stopping"
  - "shareable"
```

#### Twitch Assets
```yaml
twitch:
  - "Twitch-compliant"
  - "platform-optimized"
  - "consistent branding"
  - "community-focused"
```

---

## Placeholder Mapping Reference

### Field to Placeholder Mapping

| Frontend Field ID | YAML Placeholder | Sanitization |
|-------------------|------------------|--------------|
| `title` | `{title}` | Max 50 chars, strip injection |
| `game` | `{game}` | Max 30 chars |
| `time` | `{time}` | Max 20 chars |
| `days` | `{days}` | Max 50 chars |
| `times` | `{times}` | Max 30 chars |
| `message` | `{message}` | Max 40 chars |
| `type` | `{type}` | Enum validation |
| `count` | `{count}` | Numeric string |
| `subtitle` | `{subtitle}` | Max 30 chars |
| `emotion` | `{emotion}` | Enum validation |
| `text` | `{text}` | Max 10 chars |
| `schedule` | `{schedule}` | Max 40 chars |

### Sanitization Rules
1. Truncate to max length
2. Remove dangerous characters: `<>{}[]\|`~`
3. Remove injection patterns (ignore previous, system:, etc.)
4. Normalize whitespace
5. Strip leading/trailing whitespace

---

## Implementation Checklist

### Backend Tasks
- [ ] Create `backend/prompts/quick-create/` directory
- [ ] Create YAML file for each template (9 files)
- [ ] Add `QuickCreateAssetType` enum if needed
- [ ] Update `PromptEngine` to load quick-create templates
- [ ] Add `build_quick_create_prompt()` method

### Prompt Engineering Tasks
- [ ] Write and test `going-live.yaml`
- [ ] Write and test `schedule.yaml`
- [ ] Write and test `starting-soon.yaml`
- [ ] Write and test `clip-highlight.yaml`
- [ ] Write and test `milestone.yaml`
- [ ] Write and test `thumbnail.yaml`
- [ ] Write and test `emote.yaml`
- [ ] Write and test `panel.yaml`
- [ ] Write and test `offline.yaml`

### Testing Tasks
- [ ] Test each template with brand kit
- [ ] Test each template without brand kit
- [ ] Test placeholder injection
- [ ] Test sanitization
- [ ] Visual QA of generated assets

---

## Example Complete Prompt (Going Live)

### Input
```json
{
  "template_id": "going-live",
  "fields": {
    "title": "Ranked Grind",
    "game": "Valorant",
    "time": "7 PM EST"
  },
  "brand_kit_id": "bk_123"
}
```

### Resolved Brand Context
```
[BRAND: balanced - Colors: #FF6B35 #2E4057 accent:#F7C59F | Font: Montserrat 700 | Tone: energetic | Logo: bottom-right medium]
```

### Final Mega-Prompt
```
Create a story_graphic image (1080×1920).

[BRAND: balanced - Colors: #FF6B35 #2E4057 accent:#F7C59F | Font: Montserrat 700 | Tone: energetic | Logo: bottom-right medium]

Create a vertical stream announcement graphic.
Title: "Ranked Grind"
Game: Valorant
Time: 7 PM EST
Style: Bold, energetic, eye-catching for social media stories.
Layout: Title prominent at top, game and time below, clean modern design.

Quality: high contrast, bold typography, mobile-optimized, professional streaming aesthetic, vibrant colors
```

---

## Notes for Prompt Engineering

1. **Keep prompts concise** - AI models work better with clear, focused instructions
2. **Use specific visual language** - "bold typography" not "big text"
3. **Include layout guidance** - Where elements should be positioned
4. **Specify the mood/energy** - "energetic", "celebratory", "professional"
5. **Reference the platform** - "Twitch chat", "Instagram story", "YouTube browse"
6. **Test at actual dimensions** - Ensure readability at final size
7. **Iterate based on results** - Prompt engineering is empirical
