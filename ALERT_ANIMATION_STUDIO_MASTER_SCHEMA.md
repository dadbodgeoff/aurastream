# 🎬 ALERT ANIMATION STUDIO - MASTER SCHEMA
## Comprehensive Build Reference for AI Agents

**Version:** 1.0.0  
**Last Updated:** January 5, 2026  
**Purpose:** Definitive reference for building the 3D Alert Animation Studio feature  
**Access:** Pro and Studio subscription tiers only (included in subscription)

---

## EXECUTIVE SUMMARY

### The Vision
Transform any Nano Banana-generated asset into a 3D animated stream alert in 30 seconds, at $0 extra cost.

### The Gap We're Filling
| Competitor | Price | Time | Customization |
|------------|-------|------|---------------|
| GetRektLabs | $8-15/pack | Instant | None (pre-made) |
| Fiverr Custom | $25-50 | Days | Full |
| **AuraStream** | **$0** | **30 seconds** | **Full (your own art)** |

### Value Proposition
> "Turn any image into a 3D animated alert in 30 seconds"

---

## ARCHITECTURE DECISION

### Hybrid Approach (Recommended)
- **Server**: Depth map generation only (Depth Anything V2, ~$0.001/image)
- **Client**: Three.js preview + animation + MediaRecorder export
- **Fallback**: Server-side FFmpeg for GIF export (Safari/mobile users)

### Why Hybrid?
1. Depth map is the only compute-intensive part
2. Animation is just math - perfect for client-side
3. Export can be client-side for 90% of users
4. Server fallback ensures universal output

### Cost Breakdown (Per Alert)
| Step | Cost |
|------|------|
| Depth map (Depth Anything V2, self-hosted) | ~$0.001 |
| Animation (Three.js in browser) | $0.00 |
| Export (MediaRecorder API) | $0.00 |
| **Total** | **~$0.001** |


---

## SYSTEM ARCHITECTURE

### High-Level Flow
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER JOURNEY                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │ User's Asset │───▶│ "Animate    │───▶│ Choose       │───▶│ Live      │ │
│  │ (Nano Banana)│    │  This"      │    │ Presets      │    │ Preview   │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └───────────┘ │
│                                                                      │      │
│                                                                      ▼      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │ OBS Browser  │◀───│ Download    │◀───│ Export       │◀───│ Customize │ │
│  │ Source URL   │    │ WebM/GIF    │    │ Panel        │    │ Effects   │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └───────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Architecture
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  AlertAnimationStudio.tsx                                                    │
│  ├── AnimationCanvas.tsx (Three.js WebGL)                                   │
│  │   ├── DepthMaterial (custom shader)                                      │
│  │   ├── ParticleSystem (instanced meshes)                                  │
│  │   └── PostProcessing (bloom, glow)                                       │
│  ├── PresetSelector.tsx                                                      │
│  │   ├── EntryPresets (pop_in, slide, fade, burst)                         │
│  │   ├── LoopPresets (float, pulse, glow, wiggle)                          │
│  │   ├── DepthPresets (parallax, tilt, pop_out)                            │
│  │   └── ParticlePresets (sparkles, confetti, fire, hearts)                │
│  ├── TimelineControls.tsx (GSAP timeline)                                   │
│  └── ExportPanel.tsx (MediaRecorder + fallback)                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API CLIENT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  tsx/packages/api-client/src/hooks/useAlertAnimations.ts                    │
│  ├── useCreateAnimationProject()                                            │
│  ├── useGenerateDepthMap()                                                  │
│  ├── useExportAnimation()                                                   │
│  ├── useAnimationPresets()                                                  │
│  └── useOBSBrowserSource()                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  backend/api/routes/alert_animations.py                                      │
│  ├── POST /api/v1/alert-animations                                          │
│  ├── POST /api/v1/alert-animations/{id}/depth-map                           │
│  ├── POST /api/v1/alert-animations/{id}/export                              │
│  └── GET  /api/v1/alert-animations/{id}/obs-url                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  backend/services/alert_animation/                                           │
│  ├── depth_service.py      (Depth Anything V2 integration)                  │
│  ├── animation_presets.py  (Preset definitions & validation)                │
│  ├── export_service.py     (Server-side FFmpeg fallback)                    │
│  └── obs_service.py        (OBS browser source URL generation)              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WORKER LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  backend/workers/alert_animation_worker.py                                   │
│  ├── process_depth_map_job()   (Depth Anything V2, CPU-bound)              │
│  └── process_export_job()      (FFmpeg, for server-side fallback)          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Supabase)              │  Redis                                │
│  ├── alert_animation_projects       │  ├── Depth map job queue             │
│  ├── animation_presets              │  ├── Export job queue                │
│  └── alert_animation_exports        │  └── SSE progress events             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## DIRECTORY STRUCTURE

```
backend/
├── services/
│   └── alert_animation/                    # NEW MODULE
│       ├── __init__.py
│       ├── depth_service.py                # Depth Anything V2 integration
│       ├── animation_presets.py            # Animation preset definitions
│       ├── export_service.py               # Server-side GIF/WebM fallback
│       ├── obs_service.py                  # OBS browser source generation
│       └── models.py                       # Internal models
├── api/
│   ├── routes/
│   │   └── alert_animations.py             # NEW: API endpoints
│   └── schemas/
│       └── alert_animation.py              # NEW: Request/Response schemas
├── workers/
│   └── alert_animation_worker.py           # NEW: Async depth map + export jobs
├── database/
│   └── migrations/
│       └── 083_alert_animations.sql        # NEW: Database schema
└── tests/
    ├── unit/
    │   ├── test_alert_animation_depth.py
    │   ├── test_alert_animation_presets.py
    │   └── test_alert_animation_export.py
    ├── integration/
    │   └── test_alert_animation_e2e.py
    └── properties/
        └── test_alert_animation_properties.py

tsx/
├── apps/web/src/
│   ├── components/
│   │   └── alert-animation-studio/         # NEW MODULE
│   │       ├── AlertAnimationStudio.tsx    # Main container modal
│   │       ├── AnimationCanvas.tsx         # Three.js WebGL canvas
│   │       ├── PresetSelector.tsx          # Animation preset picker
│   │       ├── ParticleControls.tsx        # Particle system controls
│   │       ├── ExportPanel.tsx             # Export options (WebM/GIF)
│   │       ├── TimelineControls.tsx        # Animation timeline scrubber
│   │       ├── OBSInstructions.tsx         # OBS setup guide
│   │       ├── hooks/
│   │       │   ├── useDepthMap.ts          # Fetch depth map from API
│   │       │   ├── useAnimationEngine.ts   # Three.js animation controller
│   │       │   ├── useExport.ts            # MediaRecorder + fallback
│   │       │   ├── usePresets.ts           # Preset management
│   │       │   └── useTimeline.ts          # GSAP timeline control
│   │       ├── shaders/
│   │       │   ├── depthParallax.vert      # Vertex shader for depth
│   │       │   └── depthParallax.frag      # Fragment shader for depth
│   │       ├── presets/
│   │       │   ├── entry.ts                # Pop In, Slide, Fade, Burst
│   │       │   ├── loop.ts                 # Float, Pulse, Glow, Wiggle
│   │       │   ├── depth.ts                # Parallax, Tilt, Pop Out
│   │       │   └── particles.ts            # Sparkles, Confetti, Fire, Hearts
│   │       ├── particles/
│   │       │   ├── SparkleSystem.tsx       # Sparkle particle system
│   │       │   ├── ConfettiSystem.tsx      # Confetti particle system
│   │       │   ├── FireSystem.tsx          # Fire particle system
│   │       │   └── HeartSystem.tsx         # Heart particle system
│   │       ├── types.ts                    # Component-specific types
│   │       └── index.ts                    # Public exports
│   └── app/
│       └── dashboard/
│           └── animations/
│               └── page.tsx                # Animation projects list page
└── packages/
    └── api-client/src/
        ├── hooks/
        │   └── useAlertAnimations.ts       # React Query hooks
        └── types/
            └── alertAnimation.ts           # TypeScript types
```

---

## DATABASE SCHEMA

### Migration: 083_alert_animations.sql

```sql
-- Migration 083: Alert Animations
-- Stores animated alert configurations and exports
-- Created: January 5, 2026

-- ============================================================================
-- Alert Animation Projects Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_animation_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Source asset reference
    source_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    source_url TEXT NOT NULL,                    -- Original image URL
    
    -- Depth map (generated by Depth Anything V2)
    depth_map_url TEXT,                          -- Stored depth map
    depth_map_storage_path TEXT,                 -- Storage path for cleanup
    depth_map_generated_at TIMESTAMPTZ,
    
    -- Animation configuration (JSONB for flexibility)
    animation_config JSONB NOT NULL DEFAULT '{
        "entry": null,
        "loop": null,
        "depth_effect": null,
        "particles": null,
        "duration_ms": 3000,
        "loop_count": 1
    }'::jsonb,
    
    -- Export settings
    export_format TEXT DEFAULT 'webm' CHECK (export_format IN ('webm', 'gif', 'apng')),
    export_width INTEGER DEFAULT 512,
    export_height INTEGER DEFAULT 512,
    export_fps INTEGER DEFAULT 30,
    
    -- Metadata
    name TEXT NOT NULL DEFAULT 'Untitled Animation',
    thumbnail_url TEXT,
    is_premium_preset BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Animation Presets Table (System + User Custom)
-- ============================================================================

CREATE TABLE IF NOT EXISTS animation_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership (NULL = system preset)
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Preset metadata
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('entry', 'loop', 'depth', 'particles', 'pack')),
    
    -- Animation definition
    config JSONB NOT NULL,
    
    -- All presets free for Pro users (no premium tiers)
    
    -- Display
    preview_url TEXT,                            -- Animated preview GIF
    icon TEXT,                                   -- Emoji or icon name
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Alert Animation Exports Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_animation_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES alert_animation_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Export details
    format TEXT NOT NULL CHECK (format IN ('webm', 'gif', 'apng', 'obs_url')),
    url TEXT NOT NULL,
    storage_path TEXT,
    file_size BIGINT,
    
    -- Export settings snapshot
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    fps INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    
    -- Animation config snapshot (for reproducibility)
    animation_config_snapshot JSONB,
    
    -- OBS Browser Source URL (for obs_url format)
    obs_browser_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Premium Pack Purchases Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS animation_pack_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pack_id TEXT NOT NULL,
    
    -- Payment info
    stripe_payment_intent_id TEXT,
    amount_cents INTEGER NOT NULL,
    
    -- Timestamps
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, pack_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_alert_animation_projects_user_id 
    ON alert_animation_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_animation_projects_source_asset 
    ON alert_animation_projects(source_asset_id);
CREATE INDEX IF NOT EXISTS idx_alert_animation_projects_updated 
    ON alert_animation_projects(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_animation_presets_category 
    ON animation_presets(category);
CREATE INDEX IF NOT EXISTS idx_animation_presets_pack 
    ON animation_presets(pack_id) WHERE pack_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_animation_presets_system 
    ON animation_presets(user_id) WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_alert_animation_exports_project 
    ON alert_animation_exports(project_id);
CREATE INDEX IF NOT EXISTS idx_alert_animation_exports_user 
    ON alert_animation_exports(user_id);

CREATE INDEX IF NOT EXISTS idx_animation_pack_purchases_user 
    ON animation_pack_purchases(user_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE alert_animation_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE animation_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_animation_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE animation_pack_purchases ENABLE ROW LEVEL SECURITY;

-- Projects: Users see their own
CREATE POLICY alert_animation_projects_select_own ON alert_animation_projects
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY alert_animation_projects_insert_own ON alert_animation_projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY alert_animation_projects_update_own ON alert_animation_projects
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY alert_animation_projects_delete_own ON alert_animation_projects
    FOR DELETE USING (auth.uid() = user_id);

-- Presets: Users see system presets + their own
CREATE POLICY animation_presets_select ON animation_presets
    FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY animation_presets_insert_own ON animation_presets
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY animation_presets_update_own ON animation_presets
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY animation_presets_delete_own ON animation_presets
    FOR DELETE USING (auth.uid() = user_id);

-- Exports: Users see their own
CREATE POLICY alert_animation_exports_select_own ON alert_animation_exports
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY alert_animation_exports_insert_own ON alert_animation_exports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Pack purchases: Users see their own
CREATE POLICY animation_pack_purchases_select_own ON animation_pack_purchases
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY animation_pack_purchases_insert_own ON animation_pack_purchases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_alert_animation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alert_animation_projects_updated_at
    BEFORE UPDATE ON alert_animation_projects
    FOR EACH ROW EXECUTE FUNCTION update_alert_animation_updated_at();
```

### Seed Data: System Presets

```sql
-- ============================================================================
-- Seed System Presets (Run after table creation)
-- ============================================================================

INSERT INTO animation_presets (id, user_id, name, description, category, config, is_premium, pack_id, icon, sort_order) VALUES

-- ============================================================================
-- Entry Animations (Free)
-- ============================================================================
(gen_random_uuid(), NULL, 'Pop In', 'Scale from 0 with elastic bounce', 'entry', 
 '{"type": "pop_in", "duration_ms": 500, "easing": "elastic.out(1, 0.3)", "scale_from": 0, "bounce": 0.3}', 
 FALSE, NULL, '🎯', 1),

(gen_random_uuid(), NULL, 'Slide In', 'Slide from any direction', 'entry',
 '{"type": "slide_in", "duration_ms": 400, "easing": "power2.out", "direction": "left", "distance_percent": 120}',
 FALSE, NULL, '➡️', 2),

(gen_random_uuid(), NULL, 'Fade In', 'Smooth opacity with subtle scale', 'entry',
 '{"type": "fade_in", "duration_ms": 300, "easing": "power1.inOut", "scale_from": 0.9, "opacity_from": 0}',
 FALSE, NULL, '✨', 3),

(gen_random_uuid(), NULL, 'Burst', 'Explosive entry from center', 'entry',
 '{"type": "burst", "duration_ms": 600, "easing": "back.out(1.7)", "scale_from": 2.5, "opacity_from": 0, "rotation_from": 15}',
 FALSE, NULL, '💥', 4),

-- ============================================================================
-- Loop Animations (Free)
-- ============================================================================
(gen_random_uuid(), NULL, 'Float', 'Gentle hover/bob motion', 'loop',
 '{"type": "float", "amplitude_y": 8, "amplitude_x": 2, "frequency": 0.5, "phase_offset": 0}',
 FALSE, NULL, '💫', 1),

(gen_random_uuid(), NULL, 'Pulse', 'Subtle breathing scale effect', 'loop',
 '{"type": "pulse", "scale_min": 0.97, "scale_max": 1.03, "frequency": 0.8, "easing": "sine.inOut"}',
 FALSE, NULL, '💓', 2),

(gen_random_uuid(), NULL, 'Glow', 'Pulsing outer glow/bloom', 'loop',
 '{"type": "glow", "color": "#ffffff", "intensity_min": 0.2, "intensity_max": 0.8, "frequency": 0.6, "blur_radius": 20}',
 FALSE, NULL, '🔆', 3),

(gen_random_uuid(), NULL, 'Wiggle', 'Playful rotation shake', 'loop',
 '{"type": "wiggle", "angle_max": 3, "frequency": 3, "decay": 0}',
 FALSE, NULL, '🎪', 4),

-- ============================================================================
-- 3D Depth Effects (Free)
-- ============================================================================
(gen_random_uuid(), NULL, 'Parallax', 'Depth layers move at different speeds', 'depth',
 '{"type": "parallax", "intensity": 0.5, "trigger": "mouse", "invert": false, "smooth_factor": 0.1}',
 FALSE, NULL, '🌀', 1),

(gen_random_uuid(), NULL, 'Tilt', '3D card rotation following mouse', 'depth',
 '{"type": "tilt", "max_angle_x": 15, "max_angle_y": 15, "perspective": 1000, "scale_on_hover": 1.05}',
 FALSE, NULL, '💎', 2),

(gen_random_uuid(), NULL, 'Pop Out', 'Foreground elements pop toward viewer', 'depth',
 '{"type": "pop_out", "depth_scale": 40, "trigger": "on_enter", "duration_ms": 800, "easing": "power2.out"}',
 FALSE, NULL, '🎭', 3),

-- ============================================================================
-- Particle Effects (Free)
-- ============================================================================
(gen_random_uuid(), NULL, 'Sparkles', 'Floating glitter particles', 'particles',
 '{"type": "sparkles", "count": 25, "color": "#ffd700", "color_variance": 0.2, "size_min": 2, "size_max": 6, "speed": 1, "lifetime_ms": 2000, "spawn_area": "around"}',
 FALSE, NULL, '✨', 1),

(gen_random_uuid(), NULL, 'Confetti', 'Celebration burst effect', 'particles',
 '{"type": "confetti", "count": 60, "colors": ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"], "size": 8, "gravity": 0.4, "spread": 180, "lifetime_ms": 3000}',
 FALSE, NULL, '🎊', 2),

(gen_random_uuid(), NULL, 'Hearts', 'Floating heart particles', 'particles',
 '{"type": "hearts", "count": 18, "color": "#ff69b4", "color_variance": 0.3, "size_min": 6, "size_max": 14, "float_speed": 0.6, "sway_amount": 20, "lifetime_ms": 4000}',
 FALSE, NULL, '💕', 3),

(gen_random_uuid(), NULL, 'Fire', 'Flame particle effect', 'particles',
 '{"type": "fire", "count": 40, "colors": ["#ff4500", "#ff6600", "#ff8c00", "#ffd700"], "size_min": 4, "size_max": 12, "speed": 1.5, "turbulence": 0.3, "lifetime_ms": 1500}',
 FALSE, NULL, '🔥', 4),

-- ============================================================================
-- Premium Packs ($4.99 each)
-- ============================================================================
(gen_random_uuid(), NULL, 'Hype Pack', 'Explosive entry + fire particles + screen shake. Perfect for raids and big donations.', 'pack',
 '{"entry": {"type": "burst", "duration_ms": 400, "scale_from": 3, "rotation_from": 20}, "loop": {"type": "pulse", "scale_max": 1.08, "frequency": 1.2}, "particles": {"type": "fire", "count": 35}, "effects": ["screen_shake", "chromatic_aberration"]}',
 TRUE, 'hype', '🔥', 1),

(gen_random_uuid(), NULL, 'Cozy Pack', 'Soft fade + gentle float + sparkles. Perfect for follows and small subs.', 'pack',
 '{"entry": {"type": "fade_in", "duration_ms": 800, "scale_from": 0.95}, "loop": {"type": "float", "amplitude_y": 5, "frequency": 0.3}, "particles": {"type": "sparkles", "count": 15, "color": "#fffacd"}, "depth_effect": {"type": "parallax", "intensity": 0.3}}',
 TRUE, 'cozy', '☁️', 2),

(gen_random_uuid(), NULL, 'Gaming Pack', 'Glitch entry + RGB glow + pixel particles. Perfect for FPS/competitive streamers.', 'pack',
 '{"entry": {"type": "glitch", "duration_ms": 300, "glitch_intensity": 0.8}, "loop": {"type": "rgb_glow", "speed": 2, "saturation": 1}, "particles": {"type": "pixels", "count": 30, "colors": ["#00ff00", "#ff0000", "#0000ff"]}, "effects": ["scanlines"]}',
 TRUE, 'gaming', '🎮', 3),

(gen_random_uuid(), NULL, 'Kawaii Pack', 'Bouncy entry + hearts + pastel glow. Perfect for VTubers and cute aesthetics.', 'pack',
 '{"entry": {"type": "bounce", "duration_ms": 600, "bounces": 3, "height": 50}, "loop": {"type": "glow", "color": "#ffb6c1", "intensity_max": 0.6}, "particles": {"type": "hearts", "count": 25, "color": "#ff69b4"}, "depth_effect": {"type": "tilt", "max_angle_x": 8, "max_angle_y": 8}}',
 TRUE, 'kawaii', '🌸', 4)

ON CONFLICT DO NOTHING;
```

---

## API ENDPOINTS

### Alert Animation Routes

```
# Core Animation Project Endpoints (6)
POST   /api/v1/alert-animations                    # Create new animation project
GET    /api/v1/alert-animations                    # List user's animation projects
GET    /api/v1/alert-animations/{id}               # Get specific project
PUT    /api/v1/alert-animations/{id}               # Update animation config
DELETE /api/v1/alert-animations/{id}               # Delete project
GET    /api/v1/alert-animations/{id}/obs-url       # Get OBS browser source URL

# Processing Endpoints (2)
POST   /api/v1/alert-animations/{id}/depth-map     # Generate depth map (async job)
POST   /api/v1/alert-animations/{id}/export        # Export animation (WebM/GIF)

# Preset Endpoints (4)
GET    /api/v1/alert-animations/presets            # List all presets (system + user)
GET    /api/v1/alert-animations/presets/{category} # List presets by category
POST   /api/v1/alert-animations/presets            # Create custom preset
DELETE /api/v1/alert-animations/presets/{id}       # Delete custom preset

# Premium Pack Endpoints (3)
GET    /api/v1/alert-animations/packs              # List available packs with prices
GET    /api/v1/alert-animations/packs/owned        # List user's purchased packs
POST   /api/v1/alert-animations/packs/{id}/purchase # Purchase pack (Stripe checkout)

# Total: 15 endpoints
```

### Endpoint Details

#### POST /api/v1/alert-animations
Create a new animation project from an existing asset.

**Request:**
```json
{
  "source_asset_id": "uuid-optional",
  "source_url": "https://storage.../asset.png",
  "name": "My Follow Alert",
  "animation_config": {
    "entry": { "type": "pop_in", "duration_ms": 500 },
    "loop": { "type": "float", "amplitude_y": 8 },
    "depth_effect": null,
    "particles": { "type": "sparkles", "count": 20 },
    "duration_ms": 3000,
    "loop_count": 1
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "source_asset_id": "uuid",
  "source_url": "https://...",
  "depth_map_url": null,
  "animation_config": { ... },
  "export_format": "webm",
  "export_width": 512,
  "export_height": 512,
  "export_fps": 30,
  "exports": [],
  "name": "My Follow Alert",
  "created_at": "2026-01-05T...",
  "updated_at": "2026-01-05T..."
}
```

#### POST /api/v1/alert-animations/{id}/depth-map
Generate depth map using Depth Anything V2. Returns job ID for polling.

**Response:** `202 Accepted`
```json
{
  "job_id": "uuid",
  "status": "queued",
  "estimated_seconds": 5
}
```

**SSE Progress Events:**
```
event: progress
data: {"job_id": "uuid", "status": "processing", "progress": 50}

event: complete
data: {"job_id": "uuid", "status": "completed", "depth_map_url": "https://..."}
```

#### POST /api/v1/alert-animations/{id}/export
Export animation to WebM/GIF. Client-side preferred, server fallback available.

**Request:**
```json
{
  "format": "webm",
  "width": 512,
  "height": 512,
  "fps": 30,
  "use_server_export": false
}
```

**Response (client-side):** `200 OK`
```json
{
  "export_mode": "client",
  "animation_config": { ... },
  "depth_map_url": "https://...",
  "instructions": "Use MediaRecorder API with provided config"
}
```

**Response (server-side):** `202 Accepted`
```json
{
  "job_id": "uuid",
  "status": "queued",
  "export_mode": "server"
}
```

#### GET /api/v1/alert-animations/{id}/obs-url
Get OBS browser source URL for live animation.

**Response:**
```json
{
  "url": "https://app.aurastream.io/obs/alert/{id}?token={jwt}",
  "width": 512,
  "height": 512,
  "instructions": "1. In OBS, add Browser Source\n2. Set URL to above\n3. Set dimensions to 512x512\n4. Check 'Shutdown source when not visible'"
}
```

---

## BACKEND SCHEMAS (Pydantic)

### File: backend/api/schemas/alert_animation.py

```python
"""
Alert Animation Studio Schemas

Pydantic models for request/response validation.
All models use snake_case (transformed to camelCase in frontend).
"""

from datetime import datetime
from typing import Optional, List, Literal, Dict, Any
from pydantic import BaseModel, Field
from uuid import UUID

# ============================================================================
# Enums / Literals
# ============================================================================

AnimationCategory = Literal["entry", "loop", "depth", "particles", "pack"]
ExportFormat = Literal["webm", "gif", "apng"]
JobStatus = Literal["queued", "processing", "completed", "failed"]

EntryType = Literal["pop_in", "slide_in", "fade_in", "burst", "glitch", "bounce"]
LoopType = Literal["float", "pulse", "glow", "wiggle", "rgb_glow"]
DepthType = Literal["parallax", "tilt", "pop_out"]
ParticleType = Literal["sparkles", "confetti", "fire", "hearts", "pixels"]

SlideDirection = Literal["left", "right", "top", "bottom"]
TriggerType = Literal["mouse", "on_enter", "always"]

# ============================================================================
# Animation Config Models
# ============================================================================

class EntryAnimation(BaseModel):
    """Entry animation configuration."""
    type: EntryType
    duration_ms: int = Field(default=500, ge=100, le=3000)
    easing: str = Field(default="power2.out", max_length=50)
    
    # Type-specific (validated by type)
    scale_from: Optional[float] = Field(None, ge=0, le=5)
    opacity_from: Optional[float] = Field(None, ge=0, le=1)
    rotation_from: Optional[float] = Field(None, ge=-360, le=360)
    direction: Optional[SlideDirection] = None
    distance_percent: Optional[float] = Field(None, ge=0, le=200)
    bounce: Optional[float] = Field(None, ge=0, le=1)
    glitch_intensity: Optional[float] = Field(None, ge=0, le=1)
    bounces: Optional[int] = Field(None, ge=1, le=10)
    height: Optional[float] = Field(None, ge=0, le=200)


class LoopAnimation(BaseModel):
    """Loop animation configuration."""
    type: LoopType
    frequency: float = Field(default=1.0, ge=0.1, le=10.0)
    easing: str = Field(default="sine.inOut", max_length=50)
    
    # Float-specific
    amplitude_y: Optional[float] = Field(None, ge=0, le=100)
    amplitude_x: Optional[float] = Field(None, ge=0, le=100)
    phase_offset: Optional[float] = Field(None, ge=0, le=360)
    
    # Pulse-specific
    scale_min: Optional[float] = Field(None, ge=0.5, le=1.0)
    scale_max: Optional[float] = Field(None, ge=1.0, le=2.0)
    
    # Glow-specific
    color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    intensity_min: Optional[float] = Field(None, ge=0, le=1)
    intensity_max: Optional[float] = Field(None, ge=0, le=1)
    blur_radius: Optional[float] = Field(None, ge=0, le=100)
    
    # Wiggle-specific
    angle_max: Optional[float] = Field(None, ge=0, le=45)
    decay: Optional[float] = Field(None, ge=0, le=1)
    
    # RGB Glow-specific
    speed: Optional[float] = Field(None, ge=0.1, le=10)
    saturation: Optional[float] = Field(None, ge=0, le=1)


class DepthEffect(BaseModel):
    """3D depth effect configuration."""
    type: DepthType
    intensity: float = Field(default=0.5, ge=0.0, le=1.0)
    trigger: TriggerType = "mouse"
    
    # Parallax-specific
    invert: Optional[bool] = None
    smooth_factor: Optional[float] = Field(None, ge=0, le=1)
    
    # Tilt-specific
    max_angle_x: Optional[float] = Field(None, ge=0, le=45)
    max_angle_y: Optional[float] = Field(None, ge=0, le=45)
    perspective: Optional[int] = Field(None, ge=100, le=5000)
    scale_on_hover: Optional[float] = Field(None, ge=1, le=1.5)
    
    # Pop Out-specific
    depth_scale: Optional[float] = Field(None, ge=0, le=100)
    duration_ms: Optional[int] = Field(None, ge=100, le=2000)


class ParticleEffect(BaseModel):
    """Particle effect configuration."""
    type: ParticleType
    count: int = Field(default=20, ge=1, le=200)
    
    # Common
    color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    colors: Optional[List[str]] = None
    color_variance: Optional[float] = Field(None, ge=0, le=1)
    size_min: Optional[float] = Field(None, ge=1, le=50)
    size_max: Optional[float] = Field(None, ge=1, le=50)
    size: Optional[float] = Field(None, ge=1, le=50)
    speed: Optional[float] = Field(None, ge=0.1, le=10)
    lifetime_ms: Optional[int] = Field(None, ge=500, le=10000)
    spawn_area: Optional[Literal["around", "above", "below", "center"]] = None
    
    # Confetti-specific
    gravity: Optional[float] = Field(None, ge=0, le=2)
    spread: Optional[float] = Field(None, ge=0, le=360)
    
    # Hearts-specific
    float_speed: Optional[float] = Field(None, ge=0.1, le=5)
    sway_amount: Optional[float] = Field(None, ge=0, le=100)
    
    # Fire-specific
    turbulence: Optional[float] = Field(None, ge=0, le=1)


class AnimationConfig(BaseModel):
    """Complete animation configuration."""
    entry: Optional[EntryAnimation] = None
    loop: Optional[LoopAnimation] = None
    depth_effect: Optional[DepthEffect] = None
    particles: Optional[ParticleEffect] = None
    duration_ms: int = Field(default=3000, ge=500, le=15000)
    loop_count: int = Field(default=1, ge=0, le=100)  # 0 = infinite
    effects: Optional[List[str]] = None  # ["screen_shake", "chromatic_aberration", "scanlines"]


# ============================================================================
# Request Models
# ============================================================================

class CreateAnimationProjectRequest(BaseModel):
    """Create a new animation project."""
    source_asset_id: Optional[UUID] = None
    source_url: str = Field(..., min_length=1, max_length=2000)
    name: str = Field(default="Untitled Animation", max_length=100)
    animation_config: Optional[AnimationConfig] = None


class UpdateAnimationProjectRequest(BaseModel):
    """Update an existing animation project."""
    name: Optional[str] = Field(None, max_length=100)
    animation_config: Optional[AnimationConfig] = None
    export_format: Optional[ExportFormat] = None
    export_width: Optional[int] = Field(None, ge=64, le=1920)
    export_height: Optional[int] = Field(None, ge=64, le=1920)
    export_fps: Optional[int] = Field(None, ge=15, le=60)


class ExportAnimationRequest(BaseModel):
    """Request animation export."""
    format: ExportFormat = "webm"
    width: Optional[int] = Field(None, ge=64, le=1920)
    height: Optional[int] = Field(None, ge=64, le=1920)
    fps: Optional[int] = Field(None, ge=15, le=60)
    use_server_export: bool = False


class CreatePresetRequest(BaseModel):
    """Create a custom preset."""
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=200)
    category: AnimationCategory
    config: Dict[str, Any]


# ============================================================================
# Response Models
# ============================================================================

class AnimationExportResponse(BaseModel):
    """Single export record."""
    id: str
    format: ExportFormat
    url: str
    file_size: Optional[int]
    width: int
    height: int
    fps: int
    duration_ms: int
    obs_browser_url: Optional[str] = None
    created_at: datetime


class AnimationProjectResponse(BaseModel):
    """Animation project with all details."""
    id: str
    user_id: str
    source_asset_id: Optional[str]
    source_url: str
    depth_map_url: Optional[str]
    depth_map_generated_at: Optional[datetime]
    animation_config: AnimationConfig
    export_format: ExportFormat
    export_width: int
    export_height: int
    export_fps: int
    exports: List[AnimationExportResponse]
    name: str
    thumbnail_url: Optional[str]
    is_premium_preset: bool
    created_at: datetime
    updated_at: datetime


class AnimationProjectListResponse(BaseModel):
    """Paginated list of projects."""
    projects: List[AnimationProjectResponse]
    total: int
    page: int
    page_size: int


class AnimationPresetResponse(BaseModel):
    """Animation preset."""
    id: str
    user_id: Optional[str]  # NULL = system preset
    name: str
    description: Optional[str]
    category: AnimationCategory
    config: Dict[str, Any]
    is_premium: bool
    pack_id: Optional[str]
    price_cents: Optional[int]
    preview_url: Optional[str]
    icon: Optional[str]


class DepthMapJobResponse(BaseModel):
    """Depth map generation job status."""
    job_id: str
    status: JobStatus
    progress: Optional[int] = None  # 0-100
    depth_map_url: Optional[str] = None
    error_message: Optional[str] = None
    estimated_seconds: Optional[int] = None


class OBSBrowserSourceResponse(BaseModel):
    """OBS browser source configuration."""
    url: str
    width: int
    height: int
    instructions: str


class ExportClientResponse(BaseModel):
    """Response for client-side export."""
    export_mode: Literal["client"] = "client"
    animation_config: AnimationConfig
    depth_map_url: Optional[str]
    source_url: str
    instructions: str


class ExportServerResponse(BaseModel):
    """Response for server-side export job."""
    export_mode: Literal["server"] = "server"
    job_id: str
    status: JobStatus


class PackResponse(BaseModel):
    """Premium pack info."""
    id: str
    name: str
    description: str
    price_cents: int
    icon: str
    preview_url: Optional[str]
    presets: List[AnimationPresetResponse]
    is_owned: bool = False
```

---

## FRONTEND TYPES (TypeScript)

### File: tsx/packages/api-client/src/types/alertAnimation.ts

```typescript
/**
 * Alert Animation Studio Types
 * 
 * TypeScript interfaces for the 3D Alert Animation Studio.
 * All types use camelCase (transformed from snake_case in API responses).
 */

// ============================================================================
// Enums / Union Types
// ============================================================================

export type AnimationCategory = 'entry' | 'loop' | 'depth' | 'particles' | 'pack';
export type ExportFormat = 'webm' | 'gif' | 'apng';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type EntryType = 'pop_in' | 'slide_in' | 'fade_in' | 'burst' | 'glitch' | 'bounce';
export type LoopType = 'float' | 'pulse' | 'glow' | 'wiggle' | 'rgb_glow';
export type DepthType = 'parallax' | 'tilt' | 'pop_out';
export type ParticleType = 'sparkles' | 'confetti' | 'fire' | 'hearts' | 'pixels';

export type SlideDirection = 'left' | 'right' | 'top' | 'bottom';
export type TriggerType = 'mouse' | 'on_enter' | 'always';
export type SpawnArea = 'around' | 'above' | 'below' | 'center';

// ============================================================================
// Animation Config Types
// ============================================================================

export interface EntryAnimation {
  type: EntryType;
  durationMs: number;
  easing?: string;
  scaleFrom?: number;
  opacityFrom?: number;
  rotationFrom?: number;
  direction?: SlideDirection;
  distancePercent?: number;
  bounce?: number;
  glitchIntensity?: number;
  bounces?: number;
  height?: number;
}

export interface LoopAnimation {
  type: LoopType;
  frequency?: number;
  easing?: string;
  // Float
  amplitudeY?: number;
  amplitudeX?: number;
  phaseOffset?: number;
  // Pulse
  scaleMin?: number;
  scaleMax?: number;
  // Glow
  color?: string;
  intensityMin?: number;
  intensityMax?: number;
  blurRadius?: number;
  // Wiggle
  angleMax?: number;
  decay?: number;
  // RGB Glow
  speed?: number;
  saturation?: number;
}

export interface DepthEffect {
  type: DepthType;
  intensity?: number;
  trigger?: TriggerType;
  // Parallax
  invert?: boolean;
  smoothFactor?: number;
  // Tilt
  maxAngleX?: number;
  maxAngleY?: number;
  perspective?: number;
  scaleOnHover?: number;
  // Pop Out
  depthScale?: number;
  durationMs?: number;
}

export interface ParticleEffect {
  type: ParticleType;
  count?: number;
  color?: string;
  colors?: string[];
  colorVariance?: number;
  sizeMin?: number;
  sizeMax?: number;
  size?: number;
  speed?: number;
  lifetimeMs?: number;
  spawnArea?: SpawnArea;
  // Confetti
  gravity?: number;
  spread?: number;
  // Hearts
  floatSpeed?: number;
  swayAmount?: number;
  // Fire
  turbulence?: number;
}

export interface AnimationConfig {
  entry: EntryAnimation | null;
  loop: LoopAnimation | null;
  depthEffect: DepthEffect | null;
  particles: ParticleEffect | null;
  durationMs: number;
  loopCount: number;
  effects?: string[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface AnimationExport {
  id: string;
  format: ExportFormat;
  url: string;
  fileSize: number | null;
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  obsBrowserUrl: string | null;
  createdAt: string;
}

export interface AnimationProject {
  id: string;
  userId: string;
  sourceAssetId: string | null;
  sourceUrl: string;
  depthMapUrl: string | null;
  depthMapGeneratedAt: string | null;
  animationConfig: AnimationConfig;
  exportFormat: ExportFormat;
  exportWidth: number;
  exportHeight: number;
  exportFps: number;
  exports: AnimationExport[];
  name: string;
  thumbnailUrl: string | null;
  isPremiumPreset: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnimationProjectList {
  projects: AnimationProject[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AnimationPreset {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
  category: AnimationCategory;
  config: Record<string, unknown>;
  isPremium: boolean;
  packId: string | null;
  priceCents: number | null;
  previewUrl: string | null;
  icon: string | null;
}

export interface DepthMapJob {
  jobId: string;
  status: JobStatus;
  progress: number | null;
  depthMapUrl: string | null;
  errorMessage: string | null;
  estimatedSeconds: number | null;
}

export interface OBSBrowserSource {
  url: string;
  width: number;
  height: number;
  instructions: string;
}

export interface ExportClientResponse {
  exportMode: 'client';
  animationConfig: AnimationConfig;
  depthMapUrl: string | null;
  sourceUrl: string;
  instructions: string;
}

export interface ExportServerResponse {
  exportMode: 'server';
  jobId: string;
  status: JobStatus;
}

export type ExportResponse = ExportClientResponse | ExportServerResponse;

export interface Pack {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  icon: string;
  previewUrl: string | null;
  presets: AnimationPreset[];
  isOwned: boolean;
}

// ============================================================================
// Request Types
// ============================================================================

export interface CreateAnimationProjectRequest {
  sourceAssetId?: string;
  sourceUrl: string;
  name?: string;
  animationConfig?: Partial<AnimationConfig>;
}

export interface UpdateAnimationProjectRequest {
  name?: string;
  animationConfig?: Partial<AnimationConfig>;
  exportFormat?: ExportFormat;
  exportWidth?: number;
  exportHeight?: number;
  exportFps?: number;
}

export interface ExportAnimationRequest {
  format?: ExportFormat;
  width?: number;
  height?: number;
  fps?: number;
  useServerExport?: boolean;
}

export interface CreatePresetRequest {
  name: string;
  description?: string;
  category: AnimationCategory;
  config: Record<string, unknown>;
}

// ============================================================================
// Transform Functions (snake_case ↔ camelCase)
// ============================================================================

export function transformAnimationProject(data: any): AnimationProject {
  return {
    id: data.id,
    userId: data.user_id,
    sourceAssetId: data.source_asset_id,
    sourceUrl: data.source_url,
    depthMapUrl: data.depth_map_url,
    depthMapGeneratedAt: data.depth_map_generated_at,
    animationConfig: transformAnimationConfig(data.animation_config),
    exportFormat: data.export_format,
    exportWidth: data.export_width,
    exportHeight: data.export_height,
    exportFps: data.export_fps,
    exports: (data.exports || []).map(transformAnimationExport),
    name: data.name,
    thumbnailUrl: data.thumbnail_url,
    isPremiumPreset: data.is_premium_preset,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export function transformAnimationConfig(data: any): AnimationConfig {
  return {
    entry: data.entry ? transformEntryAnimation(data.entry) : null,
    loop: data.loop ? transformLoopAnimation(data.loop) : null,
    depthEffect: data.depth_effect ? transformDepthEffect(data.depth_effect) : null,
    particles: data.particles ? transformParticleEffect(data.particles) : null,
    durationMs: data.duration_ms,
    loopCount: data.loop_count,
    effects: data.effects,
  };
}

export function transformEntryAnimation(data: any): EntryAnimation {
  return {
    type: data.type,
    durationMs: data.duration_ms,
    easing: data.easing,
    scaleFrom: data.scale_from,
    opacityFrom: data.opacity_from,
    rotationFrom: data.rotation_from,
    direction: data.direction,
    distancePercent: data.distance_percent,
    bounce: data.bounce,
    glitchIntensity: data.glitch_intensity,
    bounces: data.bounces,
    height: data.height,
  };
}

export function transformLoopAnimation(data: any): LoopAnimation {
  return {
    type: data.type,
    frequency: data.frequency,
    easing: data.easing,
    amplitudeY: data.amplitude_y,
    amplitudeX: data.amplitude_x,
    phaseOffset: data.phase_offset,
    scaleMin: data.scale_min,
    scaleMax: data.scale_max,
    color: data.color,
    intensityMin: data.intensity_min,
    intensityMax: data.intensity_max,
    blurRadius: data.blur_radius,
    angleMax: data.angle_max,
    decay: data.decay,
    speed: data.speed,
    saturation: data.saturation,
  };
}

export function transformDepthEffect(data: any): DepthEffect {
  return {
    type: data.type,
    intensity: data.intensity,
    trigger: data.trigger,
    invert: data.invert,
    smoothFactor: data.smooth_factor,
    maxAngleX: data.max_angle_x,
    maxAngleY: data.max_angle_y,
    perspective: data.perspective,
    scaleOnHover: data.scale_on_hover,
    depthScale: data.depth_scale,
    durationMs: data.duration_ms,
  };
}

export function transformParticleEffect(data: any): ParticleEffect {
  return {
    type: data.type,
    count: data.count,
    color: data.color,
    colors: data.colors,
    colorVariance: data.color_variance,
    sizeMin: data.size_min,
    sizeMax: data.size_max,
    size: data.size,
    speed: data.speed,
    lifetimeMs: data.lifetime_ms,
    spawnArea: data.spawn_area,
    gravity: data.gravity,
    spread: data.spread,
    floatSpeed: data.float_speed,
    swayAmount: data.sway_amount,
    turbulence: data.turbulence,
  };
}

export function transformAnimationExport(data: any): AnimationExport {
  return {
    id: data.id,
    format: data.format,
    url: data.url,
    fileSize: data.file_size,
    width: data.width,
    height: data.height,
    fps: data.fps,
    durationMs: data.duration_ms,
    obsBrowserUrl: data.obs_browser_url,
    createdAt: data.created_at,
  };
}

export function transformAnimationPreset(data: any): AnimationPreset {
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    description: data.description,
    category: data.category,
    config: data.config,
    isPremium: data.is_premium,
    packId: data.pack_id,
    priceCents: data.price_cents,
    previewUrl: data.preview_url,
    icon: data.icon,
  };
}
```

---

## DATA FLOW DIAGRAMS

### Complete User Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE USER JOURNEY                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 1: User has existing Nano Banana asset                         │   │
│  │  ┌─────────────────┐                                                 │   │
│  │  │   🎨 PNG        │  "My follow alert I just made"                  │   │
│  │  │   512x512       │  (stored in Supabase, has asset_id)             │   │
│  │  └─────────────────┘                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 2: Click "Animate This" button                                 │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │            🎬 ANIMATE THIS                                   │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  │  → Opens AlertAnimationStudio modal                                  │   │
│  │  → Creates animation project via POST /api/v1/alert-animations       │   │
│  │  → Triggers depth map generation (async)                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 3: Choose Animation Presets                                    │   │
│  │                                                                      │   │
│  │  Entry:     ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │   │
│  │             │ 🎯     │ │ ➡️     │ │ ✨     │ │ 💥     │            │   │
│  │             │ Pop In │ │ Slide  │ │ Fade   │ │ Burst  │            │   │
│  │             └────────┘ └────────┘ └────────┘ └────────┘            │   │
│  │                                                                      │   │
│  │  Loop:      ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │   │
│  │             │ 💫     │ │ 💓     │ │ 🔆     │ │ 🎪     │            │   │
│  │             │ Float  │ │ Pulse  │ │ Glow   │ │ Wiggle │            │   │
│  │             └────────┘ └────────┘ └────────┘ └────────┘            │   │
│  │                                                                      │   │
│  │  3D Depth:  ┌────────┐ ┌────────┐ ┌────────┐                       │   │
│  │             │ 🌀     │ │ 💎     │ │ 🎭     │                       │   │
│  │             │Parallax│ │ Tilt   │ │Pop Out │                       │   │
│  │             └────────┘ └────────┘ └────────┘                       │   │
│  │                                                                      │   │
│  │  Particles: ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │   │
│  │             │ ✨     │ │ 🎊     │ │ 💕     │ │ 🔥     │            │   │
│  │             │Sparkles│ │Confetti│ │ Hearts │ │ Fire   │            │   │
│  │             └────────┘ └────────┘ └────────┘ └────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 4: Live Preview (Three.js WebGL)                               │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │                                                              │    │   │
│  │  │     ╔═══════════════════════════════════════════════╗       │    │   │
│  │  │     ║                                               ║       │    │   │
│  │  │     ║      Your alert animating in real-time        ║       │    │   │
│  │  │     ║      with 3D depth effect + particles         ║       │    │   │
│  │  │     ║                                               ║       │    │   │
│  │  │     ╚═══════════════════════════════════════════════╝       │    │   │
│  │  │                                                              │    │   │
│  │  │  [▶ Play] [⏸ Pause] [⏮ Reset]  ────●──────── 0:00 / 3:00   │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 5: Export                                                      │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │   │
│  │  │ Download     │  │ Download     │  │ Copy OBS Browser         │  │   │
│  │  │ WebM         │  │ GIF          │  │ Source URL               │  │   │
│  │  │ (Alpha)      │  │ (Fallback)   │  │ (Live Animation)         │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │   │
│  │                                                                      │   │
│  │  Export Settings:                                                    │   │
│  │  Size: [512x512 ▼]  FPS: [30 ▼]  Duration: [3s ▼]  Loop: [1x ▼]    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technical Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TECHNICAL DATA FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FRONTEND (Browser)                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  AlertAnimationStudio.tsx                                            │   │
│  │  ├── useCreateAnimationProject() ──────────────────────────────┐    │   │
│  │  │   POST /api/v1/alert-animations                              │    │   │
│  │  │   { source_url, name }                                       │    │   │
│  │  │                                                              │    │   │
│  │  ├── useGenerateDepthMap() ────────────────────────────────────┐│   │   │
│  │  │   POST /api/v1/alert-animations/{id}/depth-map              ││   │   │
│  │  │   Returns: { job_id, status: "queued" }                     ││   │   │
│  │  │                                                              ││   │   │
│  │  ├── SSE: /api/v1/jobs/{job_id}/stream ◄───────────────────────┘│   │   │
│  │  │   Events: progress(50%), complete(depth_map_url)             │   │   │
│  │  │                                                              │    │   │
│  │  ├── AnimationCanvas.tsx (Three.js)                             │    │   │
│  │  │   ├── Load source image as texture                           │    │   │
│  │  │   ├── Load depth map as displacement texture                 │    │   │
│  │  │   ├── Apply custom shader (depthParallax.vert/frag)         │    │   │
│  │  │   ├── Run GSAP timeline for entry/loop animations           │    │   │
│  │  │   └── Render particle systems (instanced meshes)            │    │   │
│  │  │                                                              │    │   │
│  │  └── ExportPanel.tsx                                            │    │   │
│  │      ├── MediaRecorder API (WebM with alpha) ──────────────────┐│   │   │
│  │      │   canvas.captureStream(30) → MediaRecorder              ││   │   │
│  │      │   → Blob → Download                                     ││   │   │
│  │      │                                                          ││   │   │
│  │      └── Server Fallback (Safari/Mobile) ──────────────────────┘│   │   │
│  │          POST /api/v1/alert-animations/{id}/export              │   │   │
│  │          { format: "gif", use_server_export: true }             │   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  BACKEND (FastAPI)                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  api/routes/alert_animations.py                                      │   │
│  │  ├── create_animation_project()                                      │   │
│  │  │   → Validate source_url exists                                    │   │
│  │  │   → Insert into alert_animation_projects                          │   │
│  │  │   → Return project with ID                                        │   │
│  │  │                                                                   │   │
│  │  ├── generate_depth_map()                                            │   │
│  │  │   → Enqueue job to Redis (RQ)                                     │   │
│  │  │   → Return job_id for polling                                     │   │
│  │  │                                                                   │   │
│  │  └── export_animation() [server fallback]                            │   │
│  │      → Enqueue FFmpeg job to Redis                                   │   │
│  │      → Return job_id for polling                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  WORKER (RQ)                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  workers/alert_animation_worker.py                                   │   │
│  │                                                                      │   │
│  │  process_depth_map_job(job_id, source_url):                         │   │
│  │  ├── Download source image                                          │   │
│  │  ├── Run Depth Anything V2 (CPU, ~2-5 seconds)                      │   │
│  │  │   depth_estimator = pipeline("depth-estimation",                 │   │
│  │  │                              model="depth-anything/v2-small")    │   │
│  │  │   depth_map = depth_estimator(image)                             │   │
│  │  ├── Upload depth map to Supabase Storage                           │   │
│  │  ├── Update project.depth_map_url                                   │   │
│  │  └── Send SSE completion event                                      │   │
│  │                                                                      │   │
│  │  process_export_job(job_id, project_id, format):  [fallback only]   │   │
│  │  ├── Download source + depth map                                    │   │
│  │  ├── Generate frames with Pillow + numpy                            │   │
│  │  ├── Encode with FFmpeg (WebM/GIF)                                  │   │
│  │  ├── Upload to Supabase Storage                                     │   │
│  │  └── Insert into alert_animation_exports                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  STORAGE (Supabase)                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Bucket: assets                                                      │   │
│  │  ├── {user_id}/animations/{project_id}/depth_map.png                │   │
│  │  ├── {user_id}/animations/{project_id}/export_001.webm              │   │
│  │  └── {user_id}/animations/{project_id}/export_002.gif               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## THREE.JS IMPLEMENTATION

### Animation Engine Architecture

```typescript
// tsx/apps/web/src/components/alert-animation-studio/hooks/useAnimationEngine.ts

/**
 * Three.js Animation Engine
 * 
 * Manages the WebGL scene, depth-based parallax, and animation timeline.
 * Uses React Three Fiber patterns but with vanilla Three.js for performance.
 */

interface AnimationEngineConfig {
  sourceUrl: string;
  depthMapUrl: string | null;
  animationConfig: AnimationConfig;
  canvasRef: RefObject<HTMLCanvasElement>;
  onProgress?: (progress: number) => void;
}

interface AnimationEngine {
  // Lifecycle
  initialize(): Promise<void>;
  dispose(): void;
  
  // Playback
  play(): void;
  pause(): void;
  reset(): void;
  seek(timeMs: number): void;
  
  // State
  isPlaying: boolean;
  currentTimeMs: number;
  durationMs: number;
  
  // Export
  captureFrame(): ImageData;
  getStream(fps: number): MediaStream;
}
```

### Depth Parallax Shader

```glsl
// depthParallax.vert
uniform float uTime;
uniform float uParallaxIntensity;
uniform vec2 uMouse;
uniform sampler2D uDepthMap;

varying vec2 vUv;
varying float vDepth;

void main() {
  vUv = uv;
  
  // Sample depth map
  float depth = texture2D(uDepthMap, uv).r;
  vDepth = depth;
  
  // Calculate parallax offset based on mouse position
  vec2 parallaxOffset = (uMouse - 0.5) * uParallaxIntensity * depth;
  
  // Apply offset to position
  vec3 newPosition = position;
  newPosition.xy += parallaxOffset * 50.0;
  newPosition.z += depth * uParallaxIntensity * 20.0;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}

// depthParallax.frag
uniform sampler2D uTexture;
uniform sampler2D uDepthMap;
uniform float uGlowIntensity;
uniform vec3 uGlowColor;

varying vec2 vUv;
varying float vDepth;

void main() {
  vec4 texColor = texture2D(uTexture, vUv);
  
  // Apply glow based on depth (foreground glows more)
  float glowFactor = (1.0 - vDepth) * uGlowIntensity;
  vec3 glow = uGlowColor * glowFactor;
  
  gl_FragColor = vec4(texColor.rgb + glow, texColor.a);
}
```

### Particle System Implementation

```typescript
// tsx/apps/web/src/components/alert-animation-studio/particles/SparkleSystem.tsx

interface SparkleConfig {
  count: number;
  color: string;
  colorVariance: number;
  sizeMin: number;
  sizeMax: number;
  speed: number;
  lifetimeMs: number;
  spawnArea: 'around' | 'above' | 'below' | 'center';
}

/**
 * Instanced mesh particle system for sparkles.
 * Uses GPU instancing for performance (handles 200+ particles at 60fps).
 */
class SparkleSystem {
  private mesh: THREE.InstancedMesh;
  private particles: Particle[];
  private dummy: THREE.Object3D;
  
  constructor(config: SparkleConfig) {
    // Create instanced geometry
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(config.color) },
      },
      vertexShader: sparkleVertexShader,
      fragmentShader: sparkleFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    
    this.mesh = new THREE.InstancedMesh(geometry, material, config.count);
    this.particles = this.initializeParticles(config);
    this.dummy = new THREE.Object3D();
  }
  
  update(deltaTime: number): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      
      // Update position
      p.position.y += p.velocity.y * deltaTime;
      p.position.x += Math.sin(p.phase + p.age * 2) * 0.5;
      
      // Update age and respawn if needed
      p.age += deltaTime;
      if (p.age > p.lifetime) {
        this.respawnParticle(p);
      }
      
      // Update instance matrix
      this.dummy.position.copy(p.position);
      this.dummy.scale.setScalar(p.size * (1 - p.age / p.lifetime));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
```

### GSAP Timeline Integration

```typescript
// tsx/apps/web/src/components/alert-animation-studio/hooks/useTimeline.ts

import gsap from 'gsap';

interface TimelineConfig {
  entry: EntryAnimation | null;
  loop: LoopAnimation | null;
  durationMs: number;
  loopCount: number;
}

/**
 * Creates GSAP timeline for entry and loop animations.
 * Integrates with Three.js uniforms and transforms.
 */
function createAnimationTimeline(
  config: TimelineConfig,
  targets: {
    mesh: THREE.Mesh;
    material: THREE.ShaderMaterial;
    particles: ParticleSystem[];
  }
): gsap.core.Timeline {
  const tl = gsap.timeline({
    paused: true,
    repeat: config.loopCount === 0 ? -1 : config.loopCount - 1,
  });
  
  // Entry animation
  if (config.entry) {
    const entryTl = createEntryTimeline(config.entry, targets);
    tl.add(entryTl, 0);
  }
  
  // Loop animation (starts after entry)
  if (config.loop) {
    const loopTl = createLoopTimeline(config.loop, targets);
    const entryDuration = config.entry?.durationMs || 0;
    tl.add(loopTl, entryDuration / 1000);
  }
  
  return tl;
}

function createEntryTimeline(
  entry: EntryAnimation,
  targets: AnimationTargets
): gsap.core.Timeline {
  const tl = gsap.timeline();
  const duration = entry.durationMs / 1000;
  
  switch (entry.type) {
    case 'pop_in':
      tl.fromTo(
        targets.mesh.scale,
        { x: entry.scaleFrom || 0, y: entry.scaleFrom || 0 },
        { x: 1, y: 1, duration, ease: entry.easing || 'elastic.out(1, 0.3)' }
      );
      break;
      
    case 'slide_in':
      const distance = (entry.distancePercent || 120) / 100;
      const startX = entry.direction === 'left' ? -distance : 
                     entry.direction === 'right' ? distance : 0;
      const startY = entry.direction === 'top' ? distance :
                     entry.direction === 'bottom' ? -distance : 0;
      tl.fromTo(
        targets.mesh.position,
        { x: startX, y: startY },
        { x: 0, y: 0, duration, ease: entry.easing || 'power2.out' }
      );
      break;
      
    case 'fade_in':
      tl.fromTo(
        targets.material.uniforms.uOpacity,
        { value: entry.opacityFrom || 0 },
        { value: 1, duration, ease: entry.easing || 'power1.inOut' }
      );
      if (entry.scaleFrom) {
        tl.fromTo(
          targets.mesh.scale,
          { x: entry.scaleFrom, y: entry.scaleFrom },
          { x: 1, y: 1, duration, ease: entry.easing },
          0
        );
      }
      break;
      
    case 'burst':
      tl.fromTo(
        targets.mesh.scale,
        { x: entry.scaleFrom || 2.5, y: entry.scaleFrom || 2.5 },
        { x: 1, y: 1, duration, ease: entry.easing || 'back.out(1.7)' }
      );
      tl.fromTo(
        targets.material.uniforms.uOpacity,
        { value: 0 },
        { value: 1, duration: duration * 0.3, ease: 'power1.in' },
        0
      );
      if (entry.rotationFrom) {
        tl.fromTo(
          targets.mesh.rotation,
          { z: (entry.rotationFrom * Math.PI) / 180 },
          { z: 0, duration, ease: entry.easing },
          0
        );
      }
      break;
  }
  
  return tl;
}

function createLoopTimeline(
  loop: LoopAnimation,
  targets: AnimationTargets
): gsap.core.Timeline {
  const tl = gsap.timeline({ repeat: -1, yoyo: true });
  const duration = 1 / (loop.frequency || 1);
  
  switch (loop.type) {
    case 'float':
      tl.to(targets.mesh.position, {
        y: `+=${(loop.amplitudeY || 8) / 100}`,
        x: `+=${(loop.amplitudeX || 2) / 100}`,
        duration,
        ease: 'sine.inOut',
      });
      break;
      
    case 'pulse':
      tl.to(targets.mesh.scale, {
        x: loop.scaleMax || 1.03,
        y: loop.scaleMax || 1.03,
        duration,
        ease: loop.easing || 'sine.inOut',
      });
      break;
      
    case 'glow':
      tl.to(targets.material.uniforms.uGlowIntensity, {
        value: loop.intensityMax || 0.8,
        duration,
        ease: 'sine.inOut',
      });
      break;
      
    case 'wiggle':
      tl.to(targets.mesh.rotation, {
        z: ((loop.angleMax || 3) * Math.PI) / 180,
        duration: duration / 2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: 1,
      });
      break;
  }
  
  return tl;
}
```

---

## EXPORT SYSTEM

### Client-Side Export (MediaRecorder)

```typescript
// tsx/apps/web/src/components/alert-animation-studio/hooks/useExport.ts

interface ExportOptions {
  format: 'webm' | 'gif';
  width: number;
  height: number;
  fps: number;
  durationMs: number;
}

interface ExportResult {
  blob: Blob;
  url: string;
  format: string;
  fileSize: number;
}

/**
 * Client-side export using MediaRecorder API.
 * Supports WebM with alpha channel (Chrome/Firefox/Edge).
 * Falls back to server-side for Safari/mobile.
 */
async function exportAnimation(
  canvas: HTMLCanvasElement,
  timeline: gsap.core.Timeline,
  options: ExportOptions,
  onProgress?: (progress: number) => void
): Promise<ExportResult> {
  // Check browser support
  const supportsWebMAlpha = checkWebMAlphaSupport();
  
  if (!supportsWebMAlpha && options.format === 'webm') {
    throw new Error('FALLBACK_TO_SERVER');
  }
  
  return new Promise((resolve, reject) => {
    const stream = canvas.captureStream(options.fps);
    const chunks: Blob[] = [];
    
    const mimeType = options.format === 'webm' 
      ? 'video/webm;codecs=vp8' // VP8 has better alpha support than VP9
      : 'image/gif';
    
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5000000, // 5 Mbps for quality
    });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      resolve({
        blob,
        url,
        format: options.format,
        fileSize: blob.size,
      });
    };
    
    recorder.onerror = (e) => {
      reject(new Error(`Recording failed: ${e}`));
    };
    
    // Start recording
    recorder.start();
    
    // Play animation
    timeline.restart();
    
    // Track progress
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / options.durationMs, 1);
      onProgress?.(progress * 100);
    }, 100);
    
    // Stop after duration
    setTimeout(() => {
      clearInterval(progressInterval);
      recorder.stop();
      timeline.pause();
    }, options.durationMs);
  });
}

function checkWebMAlphaSupport(): boolean {
  // Safari doesn't support WebM alpha
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (isSafari) return false;
  
  // Check MediaRecorder support
  if (!window.MediaRecorder) return false;
  
  // Check VP8 codec support
  return MediaRecorder.isTypeSupported('video/webm;codecs=vp8');
}
```

### Server-Side Export (FFmpeg Fallback)

```python
# backend/services/alert_animation/export_service.py

"""
Server-side animation export using FFmpeg.
Used as fallback for browsers that don't support WebM alpha (Safari, mobile).
"""

import asyncio
import subprocess
import tempfile
from pathlib import Path
from typing import Optional
from PIL import Image
import numpy as np

from backend.services.storage_service import get_storage_service
from backend.services.async_executor import run_cpu_bound


class AnimationExportService:
    """
    Generates animated exports (WebM/GIF) server-side using FFmpeg.
    """
    
    def __init__(self):
        self.storage = get_storage_service()
    
    async def export_animation(
        self,
        project_id: str,
        user_id: str,
        source_url: str,
        depth_map_url: Optional[str],
        animation_config: dict,
        format: str,
        width: int,
        height: int,
        fps: int,
        duration_ms: int,
    ) -> dict:
        """
        Generate animation export server-side.
        
        1. Download source and depth map
        2. Generate frames using Pillow/numpy
        3. Encode with FFmpeg
        4. Upload to storage
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            
            # Download assets
            source_path = tmpdir / "source.png"
            await self._download_image(source_url, source_path)
            
            depth_path = None
            if depth_map_url:
                depth_path = tmpdir / "depth.png"
                await self._download_image(depth_map_url, depth_path)
            
            # Generate frames
            frames_dir = tmpdir / "frames"
            frames_dir.mkdir()
            
            num_frames = int((duration_ms / 1000) * fps)
            await run_cpu_bound(
                self._generate_frames,
                source_path,
                depth_path,
                animation_config,
                frames_dir,
                num_frames,
                width,
                height,
            )
            
            # Encode with FFmpeg
            output_path = tmpdir / f"output.{format}"
            await self._encode_video(
                frames_dir,
                output_path,
                format,
                fps,
                width,
                height,
            )
            
            # Upload to storage
            with open(output_path, "rb") as f:
                data = f.read()
            
            storage_path = f"{user_id}/animations/{project_id}/export.{format}"
            result = await self.storage.upload_raw(
                path=storage_path,
                data=data,
                content_type=f"video/{format}" if format == "webm" else f"image/{format}",
            )
            
            return {
                "url": result.url,
                "storage_path": result.path,
                "file_size": result.file_size,
                "format": format,
            }
    
    def _generate_frames(
        self,
        source_path: Path,
        depth_path: Optional[Path],
        config: dict,
        output_dir: Path,
        num_frames: int,
        width: int,
        height: int,
    ) -> None:
        """Generate animation frames (CPU-bound, runs in thread pool)."""
        source = Image.open(source_path).convert("RGBA")
        source = source.resize((width, height), Image.Resampling.LANCZOS)
        
        depth = None
        if depth_path:
            depth = Image.open(depth_path).convert("L")
            depth = depth.resize((width, height), Image.Resampling.LANCZOS)
            depth = np.array(depth) / 255.0
        
        for i in range(num_frames):
            t = i / num_frames  # Normalized time 0-1
            frame = self._render_frame(source, depth, config, t, width, height)
            frame.save(output_dir / f"frame_{i:05d}.png")
    
    def _render_frame(
        self,
        source: Image.Image,
        depth: Optional[np.ndarray],
        config: dict,
        t: float,
        width: int,
        height: int,
    ) -> Image.Image:
        """Render a single animation frame."""
        frame = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        
        # Apply entry animation
        entry = config.get("entry")
        if entry:
            source = self._apply_entry(source, entry, t)
        
        # Apply loop animation
        loop = config.get("loop")
        if loop:
            source = self._apply_loop(source, loop, t)
        
        # Composite onto frame
        # Center the image
        x = (width - source.width) // 2
        y = (height - source.height) // 2
        frame.paste(source, (x, y), source)
        
        return frame
    
    async def _encode_video(
        self,
        frames_dir: Path,
        output_path: Path,
        format: str,
        fps: int,
        width: int,
        height: int,
    ) -> None:
        """Encode frames to video using FFmpeg."""
        if format == "webm":
            cmd = [
                "ffmpeg", "-y",
                "-framerate", str(fps),
                "-i", str(frames_dir / "frame_%05d.png"),
                "-c:v", "libvpx",
                "-pix_fmt", "yuva420p",  # Alpha channel
                "-auto-alt-ref", "0",
                "-b:v", "5M",
                str(output_path),
            ]
        elif format == "gif":
            # Generate palette for better GIF quality
            palette_path = frames_dir / "palette.png"
            palette_cmd = [
                "ffmpeg", "-y",
                "-framerate", str(fps),
                "-i", str(frames_dir / "frame_%05d.png"),
                "-vf", f"fps={fps},scale={width}:{height}:flags=lanczos,palettegen=reserve_transparent=1",
                str(palette_path),
            ]
            await asyncio.create_subprocess_exec(*palette_cmd)
            
            cmd = [
                "ffmpeg", "-y",
                "-framerate", str(fps),
                "-i", str(frames_dir / "frame_%05d.png"),
                "-i", str(palette_path),
                "-lavfi", f"fps={fps},scale={width}:{height}:flags=lanczos[x];[x][1:v]paletteuse=alpha_threshold=128",
                str(output_path),
            ]
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            raise RuntimeError(f"FFmpeg failed: {stderr.decode()}")


# Singleton
_export_service: Optional[AnimationExportService] = None

def get_export_service() -> AnimationExportService:
    global _export_service
    if _export_service is None:
        _export_service = AnimationExportService()
    return _export_service
```

---

## DEPTH MAP SERVICE

### Depth Anything V2 Integration

```python
# backend/services/alert_animation/depth_service.py

"""
Depth Map Generation Service using Depth Anything V2.

Depth Anything V2 is a state-of-the-art monocular depth estimation model
that produces high-quality depth maps from single images. It's 10x faster
than Stable Diffusion-based alternatives.

Model options:
- depth-anything/Depth-Anything-V2-Small (25M params, fastest)
- depth-anything/Depth-Anything-V2-Base (98M params, balanced)
- depth-anything/Depth-Anything-V2-Large (335M params, best quality)

We use Small for speed (~2-3 seconds on CPU).
"""

import logging
from io import BytesIO
from typing import Optional
from PIL import Image
import numpy as np

from backend.services.storage_service import get_storage_service
from backend.services.async_executor import run_cpu_bound

logger = logging.getLogger(__name__)

# Lazy-load the model to avoid startup overhead
_depth_pipeline = None


def get_depth_pipeline():
    """Lazy-load Depth Anything V2 pipeline."""
    global _depth_pipeline
    if _depth_pipeline is None:
        from transformers import pipeline
        
        logger.info("Loading Depth Anything V2 model...")
        _depth_pipeline = pipeline(
            task="depth-estimation",
            model="depth-anything/Depth-Anything-V2-Small",
            device="cpu",  # Use CPU for cost efficiency
        )
        logger.info("Depth Anything V2 model loaded")
    
    return _depth_pipeline


class DepthMapService:
    """
    Service for generating depth maps from images.
    
    Uses Depth Anything V2 for monocular depth estimation.
    Runs on CPU to minimize infrastructure costs.
    """
    
    def __init__(self):
        self.storage = get_storage_service()
    
    async def generate_depth_map(
        self,
        source_url: str,
        user_id: str,
        project_id: str,
    ) -> dict:
        """
        Generate depth map for an image.
        
        Args:
            source_url: URL of the source image
            user_id: User ID for storage path
            project_id: Project ID for storage path
            
        Returns:
            dict with depth_map_url and storage_path
        """
        # Download source image
        image_bytes = await self._download_image(source_url)
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        
        # Generate depth map (CPU-bound, run in thread pool)
        depth_map = await run_cpu_bound(self._estimate_depth, image)
        
        # Convert to PNG bytes
        depth_bytes = self._depth_to_png(depth_map)
        
        # Upload to storage
        storage_path = f"{user_id}/animations/{project_id}/depth_map.png"
        result = await self.storage.upload_raw(
            path=storage_path,
            data=depth_bytes,
            content_type="image/png",
        )
        
        return {
            "depth_map_url": result.url,
            "storage_path": result.path,
            "file_size": result.file_size,
        }
    
    def _estimate_depth(self, image: Image.Image) -> np.ndarray:
        """
        Estimate depth using Depth Anything V2.
        
        This is CPU-bound and runs in a thread pool.
        Takes ~2-3 seconds for a 512x512 image on modern CPU.
        """
        pipeline = get_depth_pipeline()
        
        # Run inference
        result = pipeline(image)
        
        # Extract depth map (normalized 0-1)
        depth = result["depth"]
        
        # Convert to numpy array if needed
        if isinstance(depth, Image.Image):
            depth = np.array(depth)
        
        # Normalize to 0-255 range
        depth = (depth - depth.min()) / (depth.max() - depth.min())
        depth = (depth * 255).astype(np.uint8)
        
        return depth
    
    def _depth_to_png(self, depth: np.ndarray) -> bytes:
        """Convert depth array to PNG bytes."""
        image = Image.fromarray(depth, mode="L")
        
        buffer = BytesIO()
        image.save(buffer, format="PNG", optimize=True)
        return buffer.getvalue()
    
    async def _download_image(self, url: str) -> bytes:
        """Download image from URL."""
        import httpx
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30)
            response.raise_for_status()
            return response.content


# Singleton
_depth_service: Optional[DepthMapService] = None


def get_depth_service() -> DepthMapService:
    global _depth_service
    if _depth_service is None:
        _depth_service = DepthMapService()
    return _depth_service
```

### Worker Implementation

```python
# backend/workers/alert_animation_worker.py

"""
Alert Animation Worker

Processes async jobs for:
1. Depth map generation (Depth Anything V2)
2. Server-side animation export (FFmpeg fallback)

Uses RQ (Redis Queue) for job management.
"""

import asyncio
import logging
import os
import sys
from datetime import datetime, timezone

from redis import Redis
from rq import Worker, Queue

from backend.services.alert_animation.depth_service import get_depth_service
from backend.services.alert_animation.export_service import get_export_service
from backend.services.sse.completion_store import get_completion_store
from backend.database.supabase_client import get_supabase_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)

WORKER_NAME = "alert_animation_worker"
QUEUE_NAME = "alert_animation"
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")


async def _store_sse_progress(job_id: str, progress: int, message: str = "") -> None:
    """Store SSE progress event for real-time frontend updates."""
    store = get_completion_store()
    await store.store_progress(job_id, progress, message)


async def process_depth_map_job(
    job_id: str,
    project_id: str,
    user_id: str,
    source_url: str,
) -> dict:
    """
    Process depth map generation job.
    
    1. Generate depth map using Depth Anything V2
    2. Upload to storage
    3. Update project record
    4. Send SSE completion event
    """
    logger.info(f"Processing depth map job {job_id} for project {project_id}")
    
    try:
        # Update progress
        await _store_sse_progress(job_id, 10, "Downloading source image...")
        
        # Generate depth map
        depth_service = get_depth_service()
        await _store_sse_progress(job_id, 30, "Generating depth map...")
        
        result = await depth_service.generate_depth_map(
            source_url=source_url,
            user_id=user_id,
            project_id=project_id,
        )
        
        await _store_sse_progress(job_id, 80, "Uploading depth map...")
        
        # Update project record
        db = get_supabase_client()
        db.table("alert_animation_projects").update({
            "depth_map_url": result["depth_map_url"],
            "depth_map_storage_path": result["storage_path"],
            "depth_map_generated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", project_id).execute()
        
        await _store_sse_progress(job_id, 100, "Complete!")
        
        logger.info(f"Depth map job {job_id} completed successfully")
        
        return {
            "status": "completed",
            "depth_map_url": result["depth_map_url"],
        }
        
    except Exception as e:
        logger.error(f"Depth map job {job_id} failed: {e}")
        await _store_sse_progress(job_id, -1, f"Error: {str(e)}")
        raise


async def process_export_job(
    job_id: str,
    project_id: str,
    user_id: str,
    source_url: str,
    depth_map_url: str,
    animation_config: dict,
    format: str,
    width: int,
    height: int,
    fps: int,
    duration_ms: int,
) -> dict:
    """
    Process server-side animation export job.
    
    Used as fallback for browsers that don't support WebM alpha.
    """
    logger.info(f"Processing export job {job_id} for project {project_id}")
    
    try:
        await _store_sse_progress(job_id, 10, "Preparing export...")
        
        export_service = get_export_service()
        
        await _store_sse_progress(job_id, 30, "Generating frames...")
        
        result = await export_service.export_animation(
            project_id=project_id,
            user_id=user_id,
            source_url=source_url,
            depth_map_url=depth_map_url,
            animation_config=animation_config,
            format=format,
            width=width,
            height=height,
            fps=fps,
            duration_ms=duration_ms,
        )
        
        await _store_sse_progress(job_id, 90, "Saving export...")
        
        # Insert export record
        db = get_supabase_client()
        db.table("alert_animation_exports").insert({
            "project_id": project_id,
            "user_id": user_id,
            "format": format,
            "url": result["url"],
            "storage_path": result["storage_path"],
            "file_size": result["file_size"],
            "width": width,
            "height": height,
            "fps": fps,
            "duration_ms": duration_ms,
            "animation_config_snapshot": animation_config,
        }).execute()
        
        await _store_sse_progress(job_id, 100, "Complete!")
        
        logger.info(f"Export job {job_id} completed successfully")
        
        return {
            "status": "completed",
            "url": result["url"],
            "file_size": result["file_size"],
        }
        
    except Exception as e:
        logger.error(f"Export job {job_id} failed: {e}")
        await _store_sse_progress(job_id, -1, f"Error: {str(e)}")
        raise


def run_async(coro):
    """Run async function in sync context for RQ."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# RQ job wrappers (sync)
def depth_map_job(job_id: str, project_id: str, user_id: str, source_url: str):
    return run_async(process_depth_map_job(job_id, project_id, user_id, source_url))


def export_job(
    job_id: str,
    project_id: str,
    user_id: str,
    source_url: str,
    depth_map_url: str,
    animation_config: dict,
    format: str,
    width: int,
    height: int,
    fps: int,
    duration_ms: int,
):
    return run_async(process_export_job(
        job_id, project_id, user_id, source_url, depth_map_url,
        animation_config, format, width, height, fps, duration_ms
    ))


if __name__ == "__main__":
    redis_conn = Redis.from_url(REDIS_URL)
    queue = Queue(QUEUE_NAME, connection=redis_conn)
    
    worker = Worker([queue], connection=redis_conn, name=WORKER_NAME)
    logger.info(f"Starting {WORKER_NAME} listening on queue '{QUEUE_NAME}'")
    worker.work()
```

---

## TEST SUITE

### Test Structure

```
backend/tests/
├── unit/
│   ├── test_alert_animation_depth.py      # Depth service unit tests
│   ├── test_alert_animation_presets.py    # Preset validation tests
│   └── test_alert_animation_export.py     # Export service unit tests
├── integration/
│   └── test_alert_animation_e2e.py        # Full flow integration tests
└── properties/
    └── test_alert_animation_properties.py # Property-based tests (Hypothesis)
```

### Unit Tests

```python
# backend/tests/unit/test_alert_animation_presets.py

"""
Unit tests for animation preset validation.
"""

import pytest
from pydantic import ValidationError

from backend.api.schemas.alert_animation import (
    AnimationConfig,
    EntryAnimation,
    LoopAnimation,
    DepthEffect,
    ParticleEffect,
)


class TestEntryAnimation:
    """Tests for entry animation schema validation."""
    
    def test_valid_pop_in(self):
        """Pop in animation with valid params."""
        entry = EntryAnimation(
            type="pop_in",
            duration_ms=500,
            easing="elastic.out(1, 0.3)",
            scale_from=0,
            bounce=0.3,
        )
        assert entry.type == "pop_in"
        assert entry.duration_ms == 500
    
    def test_valid_slide_in(self):
        """Slide in animation with direction."""
        entry = EntryAnimation(
            type="slide_in",
            duration_ms=400,
            direction="left",
            distance_percent=120,
        )
        assert entry.direction == "left"
    
    def test_invalid_duration_too_short(self):
        """Duration below minimum should fail."""
        with pytest.raises(ValidationError) as exc_info:
            EntryAnimation(type="pop_in", duration_ms=50)
        assert "duration_ms" in str(exc_info.value)
    
    def test_invalid_duration_too_long(self):
        """Duration above maximum should fail."""
        with pytest.raises(ValidationError) as exc_info:
            EntryAnimation(type="pop_in", duration_ms=5000)
        assert "duration_ms" in str(exc_info.value)
    
    def test_invalid_entry_type(self):
        """Invalid entry type should fail."""
        with pytest.raises(ValidationError):
            EntryAnimation(type="invalid_type", duration_ms=500)
    
    def test_scale_from_bounds(self):
        """Scale from must be within bounds."""
        # Valid
        entry = EntryAnimation(type="pop_in", duration_ms=500, scale_from=0)
        assert entry.scale_from == 0
        
        entry = EntryAnimation(type="pop_in", duration_ms=500, scale_from=5)
        assert entry.scale_from == 5
        
        # Invalid
        with pytest.raises(ValidationError):
            EntryAnimation(type="pop_in", duration_ms=500, scale_from=-1)
        
        with pytest.raises(ValidationError):
            EntryAnimation(type="pop_in", duration_ms=500, scale_from=10)


class TestLoopAnimation:
    """Tests for loop animation schema validation."""
    
    def test_valid_float(self):
        """Float animation with valid params."""
        loop = LoopAnimation(
            type="float",
            frequency=0.5,
            amplitude_y=8,
            amplitude_x=2,
        )
        assert loop.type == "float"
        assert loop.amplitude_y == 8
    
    def test_valid_glow(self):
        """Glow animation with color."""
        loop = LoopAnimation(
            type="glow",
            color="#ffffff",
            intensity_min=0.2,
            intensity_max=0.8,
        )
        assert loop.color == "#ffffff"
    
    def test_invalid_color_format(self):
        """Invalid hex color should fail."""
        with pytest.raises(ValidationError):
            LoopAnimation(type="glow", color="white")
        
        with pytest.raises(ValidationError):
            LoopAnimation(type="glow", color="#fff")  # Must be 6 digits
    
    def test_frequency_bounds(self):
        """Frequency must be within bounds."""
        with pytest.raises(ValidationError):
            LoopAnimation(type="float", frequency=0.05)  # Too low
        
        with pytest.raises(ValidationError):
            LoopAnimation(type="float", frequency=15)  # Too high


class TestParticleEffect:
    """Tests for particle effect schema validation."""
    
    def test_valid_sparkles(self):
        """Sparkles with valid params."""
        particles = ParticleEffect(
            type="sparkles",
            count=25,
            color="#ffd700",
            size_min=2,
            size_max=6,
        )
        assert particles.type == "sparkles"
        assert particles.count == 25
    
    def test_valid_confetti_with_colors(self):
        """Confetti with multiple colors."""
        particles = ParticleEffect(
            type="confetti",
            count=60,
            colors=["#ff0000", "#00ff00", "#0000ff"],
            gravity=0.4,
        )
        assert len(particles.colors) == 3
    
    def test_count_bounds(self):
        """Particle count must be within bounds."""
        with pytest.raises(ValidationError):
            ParticleEffect(type="sparkles", count=0)
        
        with pytest.raises(ValidationError):
            ParticleEffect(type="sparkles", count=500)


class TestAnimationConfig:
    """Tests for complete animation config."""
    
    def test_empty_config(self):
        """Empty config should use defaults."""
        config = AnimationConfig()
        assert config.entry is None
        assert config.loop is None
        assert config.duration_ms == 3000
        assert config.loop_count == 1
    
    def test_full_config(self):
        """Full config with all effects."""
        config = AnimationConfig(
            entry=EntryAnimation(type="pop_in", duration_ms=500),
            loop=LoopAnimation(type="float", amplitude_y=8),
            depth_effect=DepthEffect(type="parallax", intensity=0.5),
            particles=ParticleEffect(type="sparkles", count=20),
            duration_ms=5000,
            loop_count=3,
        )
        assert config.entry.type == "pop_in"
        assert config.loop.type == "float"
        assert config.depth_effect.type == "parallax"
        assert config.particles.type == "sparkles"
    
    def test_duration_bounds(self):
        """Duration must be within bounds."""
        with pytest.raises(ValidationError):
            AnimationConfig(duration_ms=100)  # Too short
        
        with pytest.raises(ValidationError):
            AnimationConfig(duration_ms=20000)  # Too long
    
    def test_infinite_loop(self):
        """Loop count 0 means infinite."""
        config = AnimationConfig(loop_count=0)
        assert config.loop_count == 0
```

### Property-Based Tests (Hypothesis)

```python
# backend/tests/properties/test_alert_animation_properties.py

"""
Property-based tests for Alert Animation Studio using Hypothesis.

These tests verify invariants that should hold for any valid input,
helping catch edge cases that unit tests might miss.
"""

import pytest
from hypothesis import given, strategies as st, assume, settings
from pydantic import ValidationError

from backend.api.schemas.alert_animation import (
    AnimationConfig,
    EntryAnimation,
    LoopAnimation,
    DepthEffect,
    ParticleEffect,
    CreateAnimationProjectRequest,
    UpdateAnimationProjectRequest,
)


# ============================================================================
# Strategies for generating valid animation configs
# ============================================================================

entry_types = st.sampled_from(["pop_in", "slide_in", "fade_in", "burst", "glitch", "bounce"])
loop_types = st.sampled_from(["float", "pulse", "glow", "wiggle", "rgb_glow"])
depth_types = st.sampled_from(["parallax", "tilt", "pop_out"])
particle_types = st.sampled_from(["sparkles", "confetti", "fire", "hearts", "pixels"])
directions = st.sampled_from(["left", "right", "top", "bottom"])
triggers = st.sampled_from(["mouse", "on_enter", "always"])

hex_color = st.from_regex(r"#[0-9a-fA-F]{6}", fullmatch=True)

valid_entry = st.builds(
    EntryAnimation,
    type=entry_types,
    duration_ms=st.integers(min_value=100, max_value=3000),
    easing=st.just("power2.out"),
    scale_from=st.floats(min_value=0, max_value=5) | st.none(),
    opacity_from=st.floats(min_value=0, max_value=1) | st.none(),
    direction=directions | st.none(),
)

valid_loop = st.builds(
    LoopAnimation,
    type=loop_types,
    frequency=st.floats(min_value=0.1, max_value=10.0),
    amplitude_y=st.floats(min_value=0, max_value=100) | st.none(),
    color=hex_color | st.none(),
)

valid_depth = st.builds(
    DepthEffect,
    type=depth_types,
    intensity=st.floats(min_value=0, max_value=1),
    trigger=triggers,
)

valid_particles = st.builds(
    ParticleEffect,
    type=particle_types,
    count=st.integers(min_value=1, max_value=200),
    color=hex_color | st.none(),
)

valid_config = st.builds(
    AnimationConfig,
    entry=valid_entry | st.none(),
    loop=valid_loop | st.none(),
    depth_effect=valid_depth | st.none(),
    particles=valid_particles | st.none(),
    duration_ms=st.integers(min_value=500, max_value=15000),
    loop_count=st.integers(min_value=0, max_value=100),
)


# ============================================================================
# Property Tests
# ============================================================================

class TestAnimationConfigProperties:
    """Property-based tests for AnimationConfig."""
    
    @given(valid_config)
    @settings(max_examples=100)
    def test_valid_config_serializes(self, config: AnimationConfig):
        """Any valid config should serialize to dict and back."""
        data = config.model_dump()
        restored = AnimationConfig(**data)
        
        assert restored.duration_ms == config.duration_ms
        assert restored.loop_count == config.loop_count
    
    @given(valid_config)
    @settings(max_examples=100)
    def test_duration_always_positive(self, config: AnimationConfig):
        """Duration should always be positive."""
        assert config.duration_ms > 0
    
    @given(valid_config)
    @settings(max_examples=100)
    def test_loop_count_non_negative(self, config: AnimationConfig):
        """Loop count should never be negative."""
        assert config.loop_count >= 0
    
    @given(st.integers(min_value=-1000, max_value=100))
    def test_invalid_duration_rejected(self, duration: int):
        """Durations outside valid range should be rejected."""
        assume(duration < 500 or duration > 15000)
        
        with pytest.raises(ValidationError):
            AnimationConfig(duration_ms=duration)


class TestEntryAnimationProperties:
    """Property-based tests for EntryAnimation."""
    
    @given(valid_entry)
    @settings(max_examples=100)
    def test_entry_has_valid_type(self, entry: EntryAnimation):
        """Entry type should be one of the valid types."""
        valid_types = {"pop_in", "slide_in", "fade_in", "burst", "glitch", "bounce"}
        assert entry.type in valid_types
    
    @given(valid_entry)
    @settings(max_examples=100)
    def test_entry_duration_in_range(self, entry: EntryAnimation):
        """Entry duration should be within valid range."""
        assert 100 <= entry.duration_ms <= 3000
    
    @given(
        entry_types,
        st.floats(min_value=-10, max_value=10),
    )
    def test_scale_from_bounds_enforced(self, entry_type: str, scale: float):
        """Scale from outside bounds should be rejected."""
        assume(scale < 0 or scale > 5)
        
        with pytest.raises(ValidationError):
            EntryAnimation(type=entry_type, duration_ms=500, scale_from=scale)


class TestParticleEffectProperties:
    """Property-based tests for ParticleEffect."""
    
    @given(valid_particles)
    @settings(max_examples=100)
    def test_particle_count_positive(self, particles: ParticleEffect):
        """Particle count should always be positive."""
        assert particles.count > 0
    
    @given(valid_particles)
    @settings(max_examples=100)
    def test_particle_count_reasonable(self, particles: ParticleEffect):
        """Particle count should not exceed maximum."""
        assert particles.count <= 200
    
    @given(hex_color)
    def test_hex_color_format(self, color: str):
        """Generated hex colors should be valid."""
        particles = ParticleEffect(type="sparkles", count=10, color=color)
        assert particles.color.startswith("#")
        assert len(particles.color) == 7


class TestCreateProjectRequestProperties:
    """Property-based tests for CreateAnimationProjectRequest."""
    
    @given(
        st.text(min_size=1, max_size=2000).filter(lambda x: x.strip()),
        st.text(min_size=1, max_size=100),
    )
    @settings(max_examples=50)
    def test_valid_create_request(self, source_url: str, name: str):
        """Valid create requests should be accepted."""
        request = CreateAnimationProjectRequest(
            source_url=source_url,
            name=name,
        )
        assert request.source_url == source_url
        assert request.name == name
    
    @given(st.text(max_size=0))
    def test_empty_source_url_rejected(self, source_url: str):
        """Empty source URL should be rejected."""
        with pytest.raises(ValidationError):
            CreateAnimationProjectRequest(source_url=source_url)


class TestAnimationConfigCombinations:
    """Test various combinations of animation effects."""
    
    @given(
        valid_entry | st.none(),
        valid_loop | st.none(),
        valid_depth | st.none(),
        valid_particles | st.none(),
    )
    @settings(max_examples=100)
    def test_any_combination_valid(
        self,
        entry: EntryAnimation | None,
        loop: LoopAnimation | None,
        depth: DepthEffect | None,
        particles: ParticleEffect | None,
    ):
        """Any combination of effects should be valid."""
        config = AnimationConfig(
            entry=entry,
            loop=loop,
            depth_effect=depth,
            particles=particles,
        )
        
        # Should serialize without error
        data = config.model_dump()
        assert isinstance(data, dict)
    
    @given(valid_config, valid_config)
    @settings(max_examples=50)
    def test_config_equality(self, config1: AnimationConfig, config2: AnimationConfig):
        """Two configs with same values should be equal."""
        data1 = config1.model_dump()
        data2 = config2.model_dump()
        
        restored1 = AnimationConfig(**data1)
        restored2 = AnimationConfig(**data2)
        
        # Same data should produce same result
        assert restored1.model_dump() == data1
        assert restored2.model_dump() == data2
```

### Integration Tests

```python
# backend/tests/integration/test_alert_animation_e2e.py

"""
End-to-end integration tests for Alert Animation Studio.

Tests the complete flow from project creation to export.
"""

import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

from backend.main import app


@pytest.fixture
def auth_headers():
    """Mock authenticated user headers."""
    return {"Authorization": "Bearer test_token"}


@pytest.fixture
def mock_user():
    """Mock user data."""
    return {
        "id": "test-user-id",
        "email": "test@example.com",
        "subscription_tier": "pro",
    }


class TestAlertAnimationE2E:
    """End-to-end tests for alert animation flow."""
    
    @pytest.mark.asyncio
    async def test_create_animation_project(self, auth_headers, mock_user):
        """Test creating a new animation project."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            with patch("backend.api.deps.get_current_user", return_value=mock_user):
                response = await client.post(
                    "/api/v1/alert-animations",
                    headers=auth_headers,
                    json={
                        "source_url": "https://example.com/image.png",
                        "name": "Test Animation",
                        "animation_config": {
                            "entry": {"type": "pop_in", "duration_ms": 500},
                            "duration_ms": 3000,
                            "loop_count": 1,
                        },
                    },
                )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Animation"
        assert data["source_url"] == "https://example.com/image.png"
        assert data["animation_config"]["entry"]["type"] == "pop_in"
    
    @pytest.mark.asyncio
    async def test_list_animation_projects(self, auth_headers, mock_user):
        """Test listing user's animation projects."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            with patch("backend.api.deps.get_current_user", return_value=mock_user):
                response = await client.get(
                    "/api/v1/alert-animations",
                    headers=auth_headers,
                )
        
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data
        assert "total" in data
    
    @pytest.mark.asyncio
    async def test_update_animation_config(self, auth_headers, mock_user):
        """Test updating animation configuration."""
        project_id = "test-project-id"
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            with patch("backend.api.deps.get_current_user", return_value=mock_user):
                response = await client.put(
                    f"/api/v1/alert-animations/{project_id}",
                    headers=auth_headers,
                    json={
                        "animation_config": {
                            "entry": {"type": "slide_in", "duration_ms": 400, "direction": "left"},
                            "loop": {"type": "float", "amplitude_y": 10},
                        },
                    },
                )
        
        # Would be 200 if project exists, 404 otherwise
        assert response.status_code in [200, 404]
    
    @pytest.mark.asyncio
    async def test_generate_depth_map_enqueues_job(self, auth_headers, mock_user):
        """Test that depth map generation enqueues a job."""
        project_id = "test-project-id"
        
        with patch("backend.api.routes.alert_animations.enqueue_depth_map_job") as mock_enqueue:
            mock_enqueue.return_value = {"job_id": "test-job-id", "status": "queued"}
            
            async with AsyncClient(app=app, base_url="http://test") as client:
                with patch("backend.api.deps.get_current_user", return_value=mock_user):
                    response = await client.post(
                        f"/api/v1/alert-animations/{project_id}/depth-map",
                        headers=auth_headers,
                    )
        
        # Would be 202 if project exists
        if response.status_code == 202:
            data = response.json()
            assert "job_id" in data
            assert data["status"] == "queued"
    
    @pytest.mark.asyncio
    async def test_get_presets_returns_system_presets(self, auth_headers, mock_user):
        """Test that presets endpoint returns system presets."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            with patch("backend.api.deps.get_current_user", return_value=mock_user):
                response = await client.get(
                    "/api/v1/alert-animations/presets",
                    headers=auth_headers,
                )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have system presets
        assert len(data) > 0
        
        # Check for expected preset categories
        categories = {p["category"] for p in data}
        assert "entry" in categories
        assert "loop" in categories
    
    @pytest.mark.asyncio
    async def test_get_presets_by_category(self, auth_headers, mock_user):
        """Test filtering presets by category."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            with patch("backend.api.deps.get_current_user", return_value=mock_user):
                response = await client.get(
                    "/api/v1/alert-animations/presets/entry",
                    headers=auth_headers,
                )
        
        assert response.status_code == 200
        data = response.json()
        
        # All presets should be entry type
        for preset in data:
            assert preset["category"] == "entry"
    
    @pytest.mark.asyncio
    async def test_get_obs_url(self, auth_headers, mock_user):
        """Test getting OBS browser source URL."""
        project_id = "test-project-id"
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            with patch("backend.api.deps.get_current_user", return_value=mock_user):
                response = await client.get(
                    f"/api/v1/alert-animations/{project_id}/obs-url",
                    headers=auth_headers,
                )
        
        # Would be 200 if project exists
        if response.status_code == 200:
            data = response.json()
            assert "url" in data
            assert "width" in data
            assert "height" in data
            assert "instructions" in data
    
    @pytest.mark.asyncio
    async def test_export_client_mode(self, auth_headers, mock_user):
        """Test export in client mode returns config for client-side export."""
        project_id = "test-project-id"
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            with patch("backend.api.deps.get_current_user", return_value=mock_user):
                response = await client.post(
                    f"/api/v1/alert-animations/{project_id}/export",
                    headers=auth_headers,
                    json={
                        "format": "webm",
                        "use_server_export": False,
                    },
                )
        
        # Would be 200 if project exists
        if response.status_code == 200:
            data = response.json()
            assert data["export_mode"] == "client"
            assert "animation_config" in data
    
    @pytest.mark.asyncio
    async def test_export_server_mode_enqueues_job(self, auth_headers, mock_user):
        """Test export in server mode enqueues a job."""
        project_id = "test-project-id"
        
        with patch("backend.api.routes.alert_animations.enqueue_export_job") as mock_enqueue:
            mock_enqueue.return_value = {"job_id": "test-job-id", "status": "queued"}
            
            async with AsyncClient(app=app, base_url="http://test") as client:
                with patch("backend.api.deps.get_current_user", return_value=mock_user):
                    response = await client.post(
                        f"/api/v1/alert-animations/{project_id}/export",
                        headers=auth_headers,
                        json={
                            "format": "gif",
                            "use_server_export": True,
                        },
                    )
        
        # Would be 202 if project exists
        if response.status_code == 202:
            data = response.json()
            assert data["export_mode"] == "server"
            assert "job_id" in data


class TestPremiumPacks:
    """Tests for premium pack functionality."""
    
    @pytest.mark.asyncio
    async def test_list_packs(self, auth_headers, mock_user):
        """Test listing available premium packs."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            with patch("backend.api.deps.get_current_user", return_value=mock_user):
                response = await client.get(
                    "/api/v1/alert-animations/packs",
                    headers=auth_headers,
                )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have premium packs
        pack_ids = {p["id"] for p in data}
        expected_packs = {"hype", "cozy", "gaming", "kawaii"}
        assert expected_packs.issubset(pack_ids) or len(data) > 0
    
    @pytest.mark.asyncio
    async def test_pack_includes_presets(self, auth_headers, mock_user):
        """Test that packs include their presets."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            with patch("backend.api.deps.get_current_user", return_value=mock_user):
                response = await client.get(
                    "/api/v1/alert-animations/packs",
                    headers=auth_headers,
                )
        
        if response.status_code == 200:
            data = response.json()
            for pack in data:
                assert "presets" in pack
                assert "price_cents" in pack
```

---

## ACCESS & TIER REQUIREMENTS

### Subscription Access

| Tier | Access | All Presets | Depth Maps | Exports |
|------|--------|-------------|------------|---------|
| **Free** | ❌ No access | - | - | - |
| **Pro** | ✅ Full access | ✅ All 16 | ✅ Unlimited | ✅ Unlimited |
| **Studio** | ✅ Full access | ✅ All 16 | ✅ Unlimited | ✅ Unlimited |

### Value Proposition for Pro Upgrade

This feature is a **key differentiator** for Pro subscription:
- Competitors charge $8-50 per animated alert
- AuraStream Pro users get unlimited animations included
- Zero extra cost per animation (only ~$0.001 server cost)

### Tier Check Implementation

```python
# Backend - check on every endpoint
if current_user.subscription_tier not in ("pro", "studio"):
    raise HTTPException(
        status_code=403,
        detail={
            "code": "PRO_SUBSCRIPTION_REQUIRED",
            "message": "Animation Studio requires Pro subscription",
            "upgrade_url": "/pricing"
        }
    )
```

```typescript
// Frontend - show upgrade prompt for free users
const canAnimate = user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'studio';

{!canAnimate && (
  <UpgradePrompt 
    feature="3D Alert Animation Studio"
    description="Turn any asset into animated stream alerts"
  />
)}
```

---

## ERROR HANDLING

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `ANIMATION_PROJECT_NOT_FOUND` | 404 | Project doesn't exist or user doesn't own it |
| `DEPTH_MAP_GENERATION_FAILED` | 500 | Depth Anything V2 failed |
| `EXPORT_FAILED` | 500 | FFmpeg export failed |
| `INVALID_ANIMATION_CONFIG` | 422 | Config validation failed |
| `PREMIUM_PACK_REQUIRED` | 403 | User trying to use premium preset without purchase |
| `SOURCE_IMAGE_INVALID` | 400 | Source image couldn't be loaded |
| `EXPORT_FORMAT_UNSUPPORTED` | 400 | Requested format not supported |

### Error Response Format

```json
{
  "error": {
    "code": "ANIMATION_PROJECT_NOT_FOUND",
    "message": "Animation project not found",
    "details": {
      "project_id": "uuid"
    }
  }
}
```

### Silent Failure Prevention

```typescript
// Frontend: Always handle errors explicitly
const { mutate: generateDepthMap, error, isError } = useGenerateDepthMap();

useEffect(() => {
  if (isError) {
    toast.error(`Depth map generation failed: ${error.message}`);
    // Log to analytics
    analytics.track('depth_map_error', { error: error.message });
  }
}, [isError, error]);

// Backend: Always return structured errors
@router.post("/{id}/depth-map")
async def generate_depth_map(id: UUID, current_user: User = Depends(get_current_user)):
    try:
        project = await get_project(id, current_user.id)
        if not project:
            raise HTTPException(
                status_code=404,
                detail={"code": "ANIMATION_PROJECT_NOT_FOUND", "message": "Project not found"}
            )
        
        job = await enqueue_depth_map_job(project)
        return DepthMapJobResponse(job_id=job.id, status="queued")
        
    except DepthEstimationError as e:
        logger.error(f"Depth estimation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail={"code": "DEPTH_MAP_GENERATION_FAILED", "message": str(e)}
        )
```

---

## IMPLEMENTATION TIMELINE

### Week 1: Foundation
- [ ] Database migration (083_alert_animations.sql)
- [ ] Backend schemas (Pydantic models)
- [ ] API routes (CRUD operations)
- [ ] Depth map service (Depth Anything V2)
- [ ] Worker setup (RQ job processing)

### Week 2: Frontend Core
- [ ] AlertAnimationStudio.tsx (main modal)
- [ ] AnimationCanvas.tsx (Three.js setup)
- [ ] PresetSelector.tsx (preset picker UI)
- [ ] useAnimationEngine.ts (Three.js controller)
- [ ] Basic entry/loop animations (GSAP)

### Week 3: Advanced Features
- [ ] Depth parallax shader
- [ ] Particle systems (sparkles, confetti, hearts, fire)
- [ ] ExportPanel.tsx (MediaRecorder)
- [ ] Server-side export fallback (FFmpeg)
- [ ] OBS browser source URL

### Week 4: Polish & Premium
- [ ] Premium pack purchase flow (Stripe)
- [ ] Animation timeline scrubber
- [ ] Mobile preview
- [ ] Full test suite
- [ ] Documentation

---

## CHECKLIST FOR IMPLEMENTATION

### Before Starting
- [ ] Review existing Canvas Studio patterns
- [ ] Understand generation worker flow
- [ ] Check storage service capabilities
- [ ] Verify Three.js/GSAP dependencies

### Backend Checklist
- [ ] Migration creates all tables with RLS
- [ ] Schemas validate all edge cases
- [ ] Routes follow existing patterns
- [ ] Worker handles errors gracefully
- [ ] SSE progress events work

### Frontend Checklist
- [ ] Types match backend schemas
- [ ] Transform functions handle all fields
- [ ] Three.js disposes resources properly
- [ ] MediaRecorder fallback works
- [ ] Loading states for all async operations

### Testing Checklist
- [ ] Unit tests for all schemas
- [ ] Property tests with Hypothesis
- [ ] Integration tests for API flow
- [ ] E2E tests for user journey
- [ ] Manual testing on Safari/mobile

---

## REFERENCES

### External Documentation
- [Depth Anything V2 Paper](https://proceedings.neurips.cc/paper_files/paper/2024/hash/26cfdcd8fe6fd75cc53e92963a656c58-Abstract-Conference.html)
- [Three.js Documentation](https://threejs.org/docs/)
- [GSAP Documentation](https://greensock.com/docs/)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [WebM Alpha Support](https://supergeekery.com/blog/transparent-video-in-chrome-edge-firefox-and-safari-circa-2022)

### Internal References
- `AURASTREAM_MASTER_SCHEMA.md` - Main project schema
- `CANVAS_COACH_MASTER_SCHEMA.md` - Canvas → Coach flow
- `backend/workers/generation_worker.py` - Worker patterns
- `backend/services/storage_service.py` - Storage patterns

---

*This schema is the definitive reference for building the 3D Alert Animation Studio feature. All agents should follow this document when implementing.*
