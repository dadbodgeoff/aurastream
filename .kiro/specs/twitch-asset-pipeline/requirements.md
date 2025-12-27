# Twitch Asset Generation Pipeline - Requirements Document

## Introduction

This feature implements a "Zero-Edit" asset generation pipeline for Twitch streamers, using the Brand Kit as the Single Source of Truth. The system combines Nano Banana (Gemini) for texture/background generation, Python/PIL for typography and layout, and rembg for transparency processing to deliver production-ready assets.

## Glossary

- **Brand_Kit**: The single source of truth containing streamer identity (colors, fonts, logos, tone, style)
- **Nano_Banana**: The Gemini-based AI image generation service for textures and backgrounds
- **PIL_Engine**: Python Imaging Library-based typography and layout engine
- **Transparency_Engine**: rembg-based background removal service
- **Context_Engine**: Service that gathers live data (game meta, streamer identity, asset type logic)
- **Prompt_Constructor**: Service that builds mega-prompts from brand kit and context
- **Asset_Pipeline**: Post-processing factory for generated images
- **QC_Gate**: Quality control validation before user delivery
- **Generation_Size**: AI-optimized dimensions for generation
- **Export_Size**: Final delivery dimensions for platform use

## Brand Kit Source of Truth Files

The following files from the brand-kit-enhancement spec define the source of truth:

| File | Purpose |
|------|---------|
| `backend/api/schemas/brand_kit_enhanced.py` | Extended color system, typography hierarchy, brand voice, streamer assets schemas |
| `backend/services/brand_kit_service.py` | Brand kit CRUD and update methods |
| `backend/services/logo_service.py` | Logo upload, retrieval, and management |
| `backend/services/streamer_asset_service.py` | Streamer-specific asset management |
| `backend/database/migrations/003_brand_kit_enhancement.sql` | Database schema for enhanced brand kit fields |

## Requirements

### Requirement 1: Dimension Specification System

**User Story:** As a streamer, I want my assets generated at optimal AI dimensions and exported at platform-specific sizes, so that I get the highest quality without stretching artifacts.

#### Acceptance Criteria

1. THE Dimension_System SHALL define generation sizes optimized for Nano Banana aspect ratios
2. THE Dimension_System SHALL define export sizes matching platform requirements
3. WHEN generating a YouTube Thumbnail, THE System SHALL generate at 1216x832px and export at 1280x720px (16:9)
4. WHEN generating a TikTok/Story/Reel, THE System SHALL generate at 832x1216px and export at 1080x1920px (9:16)
5. WHEN generating Twitch Emotes, THE System SHALL generate at 1024x1024px and export at 512x512px (1:1)
6. WHEN generating a Twitch/YT Banner, THE System SHALL generate at 1536x640px and export at 1200x480px (~3:1)
7. WHEN generating a Square PFP, THE System SHALL generate at 1024x1024px and export at 800x800px (1:1)
8. THE System SHALL use high-quality downscaling (Lanczos) when converting from generation to export size

### Requirement 2: Context Engine

**User Story:** As a streamer, I want the system to automatically understand my current game, season, and brand identity, so that my assets are contextually relevant without manual input.

#### Acceptance Criteria

1. WHEN building context, THE Context_Engine SHALL fetch the streamer's Brand Kit data as the primary identity source
2. WHEN building context, THE Context_Engine SHALL extract primary colors, accent colors, and gradients from the Brand Kit
3. WHEN building context, THE Context_Engine SHALL extract typography hierarchy (display, headline, body fonts) from the Brand Kit
4. WHEN building context, THE Context_Engine SHALL extract brand voice (tone, personality traits, tagline) from the Brand Kit
5. WHEN building context, THE Context_Engine SHALL extract logo URLs and watermark settings from the Brand Kit
6. WHERE game meta is available, THE Context_Engine SHALL include current season/event information
7. WHEN asset type is "emote", THE Context_Engine SHALL append "sticker style, solid green background" directive
8. WHEN asset type is "thumbnail", THE Context_Engine SHALL append "high contrast, cinematic lighting" directive
9. WHEN asset type is "banner", THE Context_Engine SHALL append "wide composition, text-safe zones" directive

### Requirement 3: Hybrid Prompt Constructor

**User Story:** As a streamer, I want the system to build intelligent prompts that combine my brand identity with technical directives, so that AI-generated assets match my brand perfectly.

#### Acceptance Criteria

1. THE Prompt_Constructor SHALL never send raw user text directly to Nano Banana
2. THE Prompt_Constructor SHALL build prompts using the formula: [Style Anchor] + [Subject Consistency] + [Meta Context] + [Brand Colors] + [Technical Directives]
3. WHEN a Brand Kit has a style_reference, THE Prompt_Constructor SHALL include it as the Style Anchor
4. WHEN a Brand Kit has logos, THE Prompt_Constructor SHALL reference the primary logo for subject consistency
5. THE Prompt_Constructor SHALL inject exact hex color codes from the Brand Kit into the prompt
6. THE Prompt_Constructor SHALL append quality directives: "8k, ray-traced, professional quality"
7. THE Prompt_Constructor SHALL sanitize user input to prevent prompt injection
8. THE Prompt_Constructor SHALL limit user custom prompt to 500 characters

### Requirement 4: Asset Pipeline (Post-Processing Factory)

**User Story:** As a streamer, I want my generated assets to be automatically post-processed for professional quality, so that I receive zero-edit ready assets.

#### Acceptance Criteria

1. WHEN processing emotes or overlays, THE Asset_Pipeline SHALL trigger rembg for background removal
2. THE Asset_Pipeline SHALL apply color grading to match Brand Kit hex codes exactly
3. THE Asset_Pipeline SHALL NOT let AI handle text rendering
4. WHEN text overlay is required, THE PIL_Engine SHALL render text using Brand Kit fonts
5. THE PIL_Engine SHALL use the typography hierarchy (display for titles, headline for subtitles, body for descriptions)
6. THE PIL_Engine SHALL ensure 100% spelling accuracy by using user-provided text directly
7. THE Asset_Pipeline SHALL downscale from generation size to export size using Lanczos algorithm
8. THE Asset_Pipeline SHALL preserve transparency for emotes and overlays

### Requirement 5: Quality Control Gate

**User Story:** As a streamer, I want all generated assets to pass quality checks before delivery, so that I never receive broken or unusable assets.

#### Acceptance Criteria

1. WHEN an asset contains AI-generated text, THE QC_Gate SHALL run OCR to detect gibberish
2. IF gibberish text is detected, THEN THE QC_Gate SHALL blur the text region or trigger regeneration
3. THE QC_Gate SHALL check for common AI artifacts (extra fingers, distorted faces)
4. IF artifacts are detected, THEN THE QC_Gate SHALL flag the asset for review or regeneration
5. THE QC_Gate SHALL convert assets to the correct format (PNG for emotes, WebP for web, JPEG for thumbnails)
6. THE QC_Gate SHALL validate final dimensions match export specifications
7. THE QC_Gate SHALL validate file size is within platform limits

### Requirement 6: Pack Generation (One-Click Suite)

**User Story:** As a streamer, I want to generate a complete asset pack with one click, so that I can quickly create cohesive branded content.

#### Acceptance Criteria

1. WHEN a user requests a "Seasonal Pack", THE System SHALL generate: 1 Story (9:16), 1 Thumbnail (16:9), 3 Emotes (1:1 with BG removal)
2. THE System SHALL use the same Brand Kit context for all assets in a pack
3. THE System SHALL use the same style anchor for visual consistency across pack assets
4. THE System SHALL process pack assets in parallel for efficiency
5. WHEN all pack assets are complete, THE System SHALL return them as a cohesive collection
6. THE System SHALL track pack generation as a single job with multiple assets

### Requirement 7: Subject Lock (Character Consistency)

**User Story:** As a streamer, I want every asset to feature my exact character/mascot consistently, so that my brand is recognizable across all content.

#### Acceptance Criteria

1. WHEN a Brand Kit has a primary logo, THE System SHALL use it as the subject reference
2. THE System SHALL pass the logo reference URL to Nano Banana for subject consistency
3. THE System SHALL maintain character consistency across all assets in a pack
4. WHEN generating emotes, THE System SHALL use the same character reference for all emote variations
5. THE System SHALL store the subject reference URL in the Brand Kit for reuse

### Requirement 8: Season Sync (Auto-Context)

**User Story:** As a streamer, I want the system to automatically know current game seasons and events, so that my assets are always timely and relevant.

#### Acceptance Criteria

1. THE System SHALL maintain a game meta database with current season information
2. WHEN generating assets, THE System SHALL suggest current season themes to the user
3. THE System SHALL support manual override of season context
4. THE System SHALL cache game meta data with appropriate TTL (24 hours)
5. WHEN game meta is unavailable, THE System SHALL proceed without season context

### Requirement 9: Brand Kit Integration

**User Story:** As a streamer, I want all generation to pull from my Brand Kit automatically, so that every asset matches my established brand identity.

#### Acceptance Criteria

1. THE System SHALL require a valid Brand Kit ID for all generation requests
2. THE System SHALL validate Brand Kit ownership before generation
3. THE System SHALL extract all relevant brand data from the enhanced Brand Kit schema
4. THE System SHALL use colors_extended for precise color matching
5. THE System SHALL use typography hierarchy for text rendering decisions
6. THE System SHALL use voice.tone for style anchor selection
7. THE System SHALL use logos.primary for subject reference
8. THE System SHALL use logos.watermark for optional watermarking

### Requirement 10: Twitch-Specific Asset Types

**User Story:** As a Twitch streamer, I want to generate platform-specific assets like emotes, badges, and panels, so that I can fully customize my channel.

#### Acceptance Criteria

1. THE System SHALL support generating Twitch emotes at 112x112, 56x56, and 28x28 export sizes
2. THE System SHALL support generating subscriber badges at 72x72, 36x36, and 18x18 export sizes
3. THE System SHALL support generating channel panels at 320x160 export size
4. THE System SHALL support generating offline banners at 1920x1080 export size
5. WHEN generating emotes, THE System SHALL output with transparent background
6. WHEN generating badges, THE System SHALL output with transparent background
7. THE System SHALL validate emote file size is under 1MB per Twitch requirements

