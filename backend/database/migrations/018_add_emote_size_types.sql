-- ============================================================================
-- Migration 018: Add Twitch emote size variants to asset types
-- ============================================================================
-- 
-- Adds support for individual Twitch emote sizes:
-- - twitch_emote_112, twitch_emote_56, twitch_emote_28
-- - twitch_badge_36, twitch_badge_18
-- - tiktok_emote, tiktok_emote_300, tiktok_emote_200, tiktok_emote_100
-- 
-- These are needed for the multi-size emote generation feature where
-- a single generation creates all required platform sizes.
-- ============================================================================

-- Drop the existing constraint on generation_jobs
ALTER TABLE generation_jobs 
DROP CONSTRAINT IF EXISTS generation_jobs_asset_type_check;

-- Add new constraint with all asset types including size variants
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
    -- Twitch types (base)
    'twitch_emote',
    'twitch_badge', 
    'twitch_panel',
    'twitch_banner',
    'twitch_offline',
    -- Twitch emote sizes (for multi-size generation)
    'twitch_emote_112',
    'twitch_emote_56',
    'twitch_emote_28',
    -- Twitch badge sizes
    'twitch_badge_36',
    'twitch_badge_18',
    -- TikTok emote sizes
    'tiktok_emote',
    'tiktok_emote_300',
    'tiktok_emote_200',
    'tiktok_emote_100',
    -- Social types
    'tiktok_story',
    'instagram_story',
    'instagram_reel'
));

-- Also update assets table constraint
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
    -- Twitch types (base)
    'twitch_emote',
    'twitch_badge', 
    'twitch_panel',
    'twitch_banner',
    'twitch_offline',
    -- Twitch emote sizes (for multi-size generation)
    'twitch_emote_112',
    'twitch_emote_56',
    'twitch_emote_28',
    -- Twitch badge sizes
    'twitch_badge_36',
    'twitch_badge_18',
    -- TikTok emote sizes
    'tiktok_emote',
    'tiktok_emote_300',
    'tiktok_emote_200',
    'tiktok_emote_100',
    -- Social types
    'tiktok_story',
    'instagram_story',
    'instagram_reel'
));

COMMENT ON COLUMN generation_jobs.asset_type IS 'Type of asset being generated. Includes base types and platform-specific size variants (e.g., twitch_emote_112 for 112x112 emotes)';
