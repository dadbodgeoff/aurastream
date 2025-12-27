# Brand Kit Enhancement - Enterprise Features

## Overview

Enhance the existing brand kit system to be the most robust, enterprise-grade brand management solution for content creators and streamers. Based on research of Canva Brand Kit, enterprise brand management tools, and streamer-specific needs.

## Research Summary

### Enterprise Brand Kit Features (Canva, Brandpad, etc.)
- Logo files with variations (lockups, alternate versions, usage requirements)
- Color palettes with digital-ready codes (HEX, RGB, CMYK) and tints
- Approved typography with weights and hierarchy
- Imagery, icons, and illustration styles
- Brand voice and copy guidelines
- Contextual brand guidelines with usage rules
- Multi-brand management (up to 100 brands)

### Streamer-Specific Needs (Twitch, YouTube, etc.)
- Stream overlays (starting soon, BRB, ending)
- Emotes and sub badges
- Channel panels
- Alerts (follow, sub, donation, raid)
- Stinger transitions
- Facecam frames
- Social media kit integration

## Enhanced Brand Kit Schema

### 1. Logo System (NEW)
```
logos:
  primary:           # Main logo (required)
    url: string
    width: number
    height: number
  secondary:         # Alternative logo (optional)
    url: string
    width: number
    height: number
  icon:              # Icon-only version (optional)
    url: string
    width: number
    height: number
  monochrome:        # Single-color version (optional)
    url: string
    width: number
    height: number
  watermark:         # Transparent watermark (optional)
    url: string
    opacity: number (0-100)
```

### 2. Extended Color System (ENHANCED)
```
colors:
  primary:           # Main brand colors (1-5)
    - hex: "#FF5733"
      name: "Brand Orange"
      usage: "Primary CTAs, headers"
  secondary:         # Supporting colors (0-5)
    - hex: "#3498DB"
      name: "Ocean Blue"
      usage: "Secondary elements"
  accent:            # Highlight colors (0-3)
    - hex: "#F1C40F"
      name: "Gold"
      usage: "Highlights, alerts"
  neutral:           # Background/text colors (0-5)
    - hex: "#1A1A24"
      name: "Dark Background"
      usage: "Backgrounds"
  gradients:         # Gradient definitions (0-3)
    - name: "Brand Gradient"
      type: "linear" | "radial"
      angle: 135
      stops:
        - color: "#FF5733"
          position: 0
        - color: "#3498DB"
          position: 100
```

### 3. Typography Hierarchy (ENHANCED)
```
typography:
  display:           # Large display text
    family: "Montserrat"
    weight: 800
    style: "normal"
  headline:          # H1-H2 headers
    family: "Montserrat"
    weight: 700
    style: "normal"
  subheadline:       # H3-H4 headers
    family: "Montserrat"
    weight: 600
    style: "normal"
  body:              # Body text
    family: "Inter"
    weight: 400
    style: "normal"
  caption:           # Small text, labels
    family: "Inter"
    weight: 400
    style: "normal"
  accent:            # Special text (quotes, callouts)
    family: "Playfair Display"
    weight: 400
    style: "italic"
```

### 4. Brand Voice (ENHANCED)
```
voice:
  tone: "competitive" | "casual" | "educational" | "comedic" | "professional" | "inspirational" | "edgy" | "wholesome"
  personality_traits:  # 3-5 adjectives
    - "Bold"
    - "Energetic"
    - "Authentic"
  tagline: "Level Up Your Stream"
  catchphrases:        # Common phrases/sayings
    - "Let's gooo!"
    - "GG everyone"
  content_themes:      # Main content topics
    - "Gaming"
    - "Tech Reviews"
    - "Community"
```

### 5. Streamer Assets (NEW)
```
streamer_assets:
  overlays:
    starting_soon:
      url: string
      duration_seconds: number
    brb:
      url: string
    ending:
      url: string
    gameplay:
      url: string
  alerts:
    follow:
      image_url: string
      sound_url: string
      duration_ms: number
    subscribe:
      image_url: string
      sound_url: string
      duration_ms: number
    donation:
      image_url: string
      sound_url: string
      duration_ms: number
    raid:
      image_url: string
      sound_url: string
      duration_ms: number
  panels:              # Channel info panels
    - name: "About"
      image_url: string
    - name: "Schedule"
      image_url: string
    - name: "Rules"
      image_url: string
  emotes:              # Custom emotes
    - name: "hype"
      url: string
      tier: 1 | 2 | 3
  badges:              # Sub badges
    - months: 1
      url: string
    - months: 3
      url: string
    - months: 6
      url: string
  facecam_frame:
    url: string
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right"
  stinger:             # Transition animation
    url: string
    duration_ms: number
```

### 6. Style Guidelines (NEW)
```
guidelines:
  logo_usage:
    min_size_px: 48
    clear_space_ratio: 0.25  # 25% of logo height
    prohibited_modifications:
      - "Do not stretch or distort"
      - "Do not change colors"
      - "Do not add effects"
  color_usage:
    primary_ratio: 60        # % of design
    secondary_ratio: 30
    accent_ratio: 10
  imagery_style:
    photo_style: "High contrast, vibrant"
    illustration_style: "Flat, geometric"
    icon_style: "Outlined, 2px stroke"
```

### 7. Social Media Profiles (NEW)
```
social_profiles:
  twitch:
    username: string
    profile_banner_url: string
    offline_banner_url: string
  youtube:
    channel_id: string
    banner_url: string
    watermark_url: string
  twitter:
    handle: string
    header_url: string
  discord:
    server_id: string
    server_icon_url: string
  tiktok:
    username: string
```

## Storage Buckets Required

### Existing Buckets
- `assets` - Generated assets (public)
- `uploads` - User uploads for extraction (private)
- `logos` - Brand kit logos (private)

### New Buckets Needed
- `brand-assets` - All brand kit assets (overlays, alerts, panels, etc.)
  - Private bucket
  - Max size: 50MB per file
  - Allowed types: PNG, JPEG, WebP, GIF, MP4, WebM, MP3, WAV

## API Endpoints

### Logo Management
- `POST /api/v1/brand-kits/{id}/logos` - Upload logo variation
- `DELETE /api/v1/brand-kits/{id}/logos/{type}` - Delete logo variation
- `GET /api/v1/brand-kits/{id}/logos` - List all logo variations

### Streamer Assets
- `POST /api/v1/brand-kits/{id}/assets` - Upload streamer asset
- `GET /api/v1/brand-kits/{id}/assets` - List streamer assets
- `DELETE /api/v1/brand-kits/{id}/assets/{asset_id}` - Delete asset

### Guidelines
- `PUT /api/v1/brand-kits/{id}/guidelines` - Update brand guidelines
- `GET /api/v1/brand-kits/{id}/guidelines` - Get brand guidelines

## Database Schema Changes

### brand_kits table additions
```sql
ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS logos JSONB DEFAULT '{}';
ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS colors_extended JSONB DEFAULT '{}';
ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS typography JSONB DEFAULT '{}';
ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS voice JSONB DEFAULT '{}';
ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS streamer_assets JSONB DEFAULT '{}';
ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS guidelines JSONB DEFAULT '{}';
ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS social_profiles JSONB DEFAULT '{}';
```

## Implementation Priority

### Phase 1: Logo System (High Priority)
- Logo upload/management endpoints
- Logo variations storage
- Integration with asset generation (include logo option)

### Phase 2: Extended Colors & Typography
- Enhanced color system with names and usage
- Typography hierarchy
- Gradient support

### Phase 3: Streamer Assets
- Overlay management
- Alert assets
- Panel images
- Emotes and badges

### Phase 4: Guidelines & Voice
- Brand voice configuration
- Usage guidelines
- Social profile integration

## Success Metrics
- Users can upload and manage multiple logo variations
- Logo can be included in AI-generated assets
- Full typography hierarchy available for generation
- Streamer-specific assets organized in brand kit
- Brand guidelines exportable as PDF
