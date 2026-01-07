-- Migration 084: Animation Suggestions
-- Adds AI-generated animation suggestions to assets and stream event presets
-- Created: January 6, 2026

-- ============================================================================
-- Add animation_suggestions column to assets table
-- ============================================================================

ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS animation_suggestions JSONB DEFAULT NULL;

-- Index for querying assets with suggestions
CREATE INDEX IF NOT EXISTS idx_assets_animation_suggestions 
    ON assets USING GIN (animation_suggestions) 
    WHERE animation_suggestions IS NOT NULL;

COMMENT ON COLUMN assets.animation_suggestions IS 
'AI-generated animation suggestions based on asset analysis. Contains vibe, recommended preset, config, and alternatives.';

-- ============================================================================
-- Stream Event Presets Table
-- Maps stream events (new_sub, raid, donation, etc.) to animation configs
-- ============================================================================

CREATE TABLE IF NOT EXISTS stream_event_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event type
    event_type TEXT NOT NULL CHECK (event_type IN (
        'new_subscriber', 'raid', 'donation_small', 'donation_medium', 
        'donation_large', 'new_follower', 'milestone', 'bits', 'gift_sub'
    )),
    
    -- Display metadata
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    
    -- Recommended duration for this event type
    recommended_duration_ms INTEGER NOT NULL DEFAULT 3000,
    
    -- Animation configuration
    animation_config JSONB NOT NULL,
    
    -- Ownership (NULL = system preset)
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Ordering
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_stream_event_presets_event_type 
    ON stream_event_presets(event_type);
CREATE INDEX IF NOT EXISTS idx_stream_event_presets_system 
    ON stream_event_presets(user_id) WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_stream_event_presets_user 
    ON stream_event_presets(user_id) WHERE user_id IS NOT NULL;

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE stream_event_presets ENABLE ROW LEVEL SECURITY;

-- Users see system presets + their own
CREATE POLICY stream_event_presets_select ON stream_event_presets
    FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY stream_event_presets_insert_own ON stream_event_presets
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY stream_event_presets_update_own ON stream_event_presets
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY stream_event_presets_delete_own ON stream_event_presets
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Seed System Event Presets
-- ============================================================================

INSERT INTO stream_event_presets (id, event_type, name, description, icon, recommended_duration_ms, animation_config, user_id, sort_order) VALUES

-- New Subscriber - Celebratory, 3 seconds
(gen_random_uuid(), 'new_subscriber', 'New Subscriber', 'Celebratory animation for new subs', '🎉', 3000,
 '{
   "entry": {"type": "pop_in", "duration_ms": 500, "easing": "elastic.out(1, 0.3)", "scale_from": 0, "bounce": 0.3},
   "loop": {"type": "pulse", "scale_min": 0.97, "scale_max": 1.03, "frequency": 0.8},
   "particles": {"type": "confetti", "count": 40, "colors": ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff"], "gravity": 0.4, "spread": 180, "lifetime_ms": 3000},
   "depth_effect": null,
   "duration_ms": 3000,
   "loop_count": 1
 }', NULL, 1),

-- Raid Alert - Dramatic, 5 seconds
(gen_random_uuid(), 'raid', 'Raid Alert', 'Dramatic entrance for raids', '⚔️', 5000,
 '{
   "entry": {"type": "burst", "duration_ms": 600, "easing": "back.out(1.7)", "scale_from": 2.5, "opacity_from": 0, "rotation_from": 15},
   "loop": {"type": "glow", "color": "#ff4500", "intensity_min": 0.3, "intensity_max": 0.9, "frequency": 0.8, "blur_radius": 25},
   "particles": {"type": "fire", "count": 50, "colors": ["#ff4500", "#ff6600", "#ff8c00", "#ffd700"], "speed": 1.5, "turbulence": 0.4, "lifetime_ms": 2000},
   "depth_effect": {"type": "pop_out", "depth_scale": 50, "trigger": "on_enter", "duration_ms": 800},
   "duration_ms": 5000,
   "loop_count": 1
 }', NULL, 2),

-- Small Donation ($5-20) - Appreciative, 2 seconds
(gen_random_uuid(), 'donation_small', 'Small Donation', 'Quick thank you for $5-20 donations', '💚', 2000,
 '{
   "entry": {"type": "fade_in", "duration_ms": 300, "easing": "power1.inOut", "scale_from": 0.9, "opacity_from": 0},
   "loop": {"type": "float", "amplitude_y": 5, "amplitude_x": 2, "frequency": 0.6},
   "particles": {"type": "sparkles", "count": 15, "color": "#00ff88", "color_variance": 0.2, "size_min": 2, "size_max": 5, "lifetime_ms": 1500},
   "depth_effect": null,
   "duration_ms": 2000,
   "loop_count": 1
 }', NULL, 3),

-- Medium Donation ($20-100) - Excited, 3 seconds
(gen_random_uuid(), 'donation_medium', 'Medium Donation', 'Excited animation for $20-100 donations', '💛', 3000,
 '{
   "entry": {"type": "pop_in", "duration_ms": 400, "easing": "elastic.out(1, 0.4)", "scale_from": 0.2, "bounce": 0.4},
   "loop": {"type": "pulse", "scale_min": 0.95, "scale_max": 1.05, "frequency": 1.0},
   "particles": {"type": "sparkles", "count": 30, "color": "#ffd700", "color_variance": 0.3, "size_min": 3, "size_max": 8, "lifetime_ms": 2500},
   "depth_effect": {"type": "parallax", "intensity": 0.4, "trigger": "mouse"},
   "duration_ms": 3000,
   "loop_count": 1
 }', NULL, 4),

-- Large Donation ($100+) - Over-the-top, 8 seconds
(gen_random_uuid(), 'donation_large', 'Large Donation', 'Over-the-top celebration for $100+ donations', '💎', 8000,
 '{
   "entry": {"type": "burst", "duration_ms": 800, "easing": "back.out(2)", "scale_from": 3, "opacity_from": 0, "rotation_from": 30},
   "loop": {"type": "glow", "color": "#00ffff", "intensity_min": 0.4, "intensity_max": 1.0, "frequency": 0.5, "blur_radius": 30},
   "particles": {"type": "confetti", "count": 100, "colors": ["#ffd700", "#00ffff", "#ff00ff", "#00ff00", "#ff4500"], "gravity": 0.3, "spread": 360, "lifetime_ms": 5000},
   "depth_effect": {"type": "pop_out", "depth_scale": 60, "trigger": "on_enter", "duration_ms": 1000},
   "duration_ms": 8000,
   "loop_count": 1
 }', NULL, 5),

-- New Follower - Quick, 1.5 seconds
(gen_random_uuid(), 'new_follower', 'New Follower', 'Quick welcome for new followers', '👋', 1500,
 '{
   "entry": {"type": "slide_in", "duration_ms": 300, "easing": "power2.out", "direction": "right", "distance_percent": 100},
   "loop": {"type": "wiggle", "angle_max": 2, "frequency": 4, "decay": 0},
   "particles": null,
   "depth_effect": null,
   "duration_ms": 1500,
   "loop_count": 1
 }', NULL, 6),

-- Milestone - Epic, 6 seconds
(gen_random_uuid(), 'milestone', 'Milestone', 'Epic celebration for stream milestones', '🏆', 6000,
 '{
   "entry": {"type": "burst", "duration_ms": 700, "easing": "back.out(1.5)", "scale_from": 2, "opacity_from": 0, "rotation_from": 10},
   "loop": {"type": "pulse", "scale_min": 0.96, "scale_max": 1.04, "frequency": 0.6},
   "particles": {"type": "confetti", "count": 80, "colors": ["#ffd700", "#c0c0c0", "#cd7f32", "#ffffff"], "gravity": 0.35, "spread": 270, "lifetime_ms": 4000},
   "depth_effect": {"type": "tilt", "max_angle_x": 10, "max_angle_y": 10, "perspective": 1000, "scale_on_hover": 1.03},
   "duration_ms": 6000,
   "loop_count": 1
 }', NULL, 7),

-- Bits - Sparkly, 2.5 seconds
(gen_random_uuid(), 'bits', 'Bits Cheer', 'Sparkly animation for bit donations', '💜', 2500,
 '{
   "entry": {"type": "pop_in", "duration_ms": 350, "easing": "elastic.out(1, 0.35)", "scale_from": 0.1, "bounce": 0.35},
   "loop": {"type": "glow", "color": "#9146ff", "intensity_min": 0.2, "intensity_max": 0.7, "frequency": 1.0, "blur_radius": 15},
   "particles": {"type": "sparkles", "count": 25, "color": "#9146ff", "color_variance": 0.4, "size_min": 2, "size_max": 6, "lifetime_ms": 2000},
   "depth_effect": null,
   "duration_ms": 2500,
   "loop_count": 1
 }', NULL, 8),

-- Gift Sub - Generous, 4 seconds
(gen_random_uuid(), 'gift_sub', 'Gift Sub', 'Generous animation for gifted subs', '🎁', 4000,
 '{
   "entry": {"type": "pop_in", "duration_ms": 500, "easing": "elastic.out(1, 0.3)", "scale_from": 0, "bounce": 0.4},
   "loop": {"type": "float", "amplitude_y": 8, "amplitude_x": 3, "frequency": 0.5},
   "particles": {"type": "hearts", "count": 25, "color": "#ff69b4", "color_variance": 0.3, "size_min": 6, "size_max": 12, "float_speed": 0.5, "sway_amount": 15, "lifetime_ms": 3500},
   "depth_effect": {"type": "parallax", "intensity": 0.35, "trigger": "mouse"},
   "duration_ms": 4000,
   "loop_count": 1
 }', NULL, 9)

ON CONFLICT DO NOTHING;
