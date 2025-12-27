-- ============================================================================
-- Migration 017: Add additional asset types to generation_jobs
-- ============================================================================
-- 
-- Adds support for Twitch-specific and social media asset types:
-- - twitch_emote, twitch_badge, twitch_panel, twitch_banner, twitch_offline
-- - tiktok_story, instagram_story, instagram_reel
-- - logo
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE generation_jobs 
DROP CONSTRAINT IF EXISTS generation_jobs_asset_type_check;

-- Add new constraint with all asset types
ALTER TABLE generation_jobs 
ADD CONSTRAINT generation_jobs_asset_type_check 
CHECK (asset_type IN (
    -- Original types
    'thumbnail', 
    'overlay', 
    'banner', 
    'story_graphic', 
    'clip_cover',
    'logo',
    -- Twitch types
    'twitch_emote',
    'twitch_badge', 
    'twitch_panel',
    'twitch_banner',
    'twitch_offline',
    -- Social types
    'tiktok_story',
    'instagram_story',
    'instagram_reel'
));

-- Also update assets table if it has a similar constraint
ALTER TABLE assets 
DROP CONSTRAINT IF EXISTS assets_asset_type_check;

ALTER TABLE assets 
ADD CONSTRAINT assets_asset_type_check 
CHECK (asset_type IN (
    -- Original types
    'thumbnail', 
    'overlay', 
    'banner', 
    'story_graphic', 
    'clip_cover',
    'logo',
    -- Twitch types
    'twitch_emote',
    'twitch_badge', 
    'twitch_panel',
    'twitch_banner',
    'twitch_offline',
    -- Social types
    'tiktok_story',
    'instagram_story',
    'instagram_reel'
));

COMMENT ON COLUMN generation_jobs.asset_type IS 'Type of asset being generated (thumbnail, overlay, banner, story_graphic, clip_cover, logo, twitch_*, social types)';
