-- ============================================================================
-- Migration: 050_creator_media_library
-- Description: Unified Creator Media Library for user-uploaded assets
-- Purpose: Store all user assets (logos, faces, characters, game skins, objects,
--          backgrounds, references) that can be injected into any generation prompt
-- ============================================================================

-- ============================================================================
-- Table: creator_media_assets
-- Unified storage for all user-uploaded media assets
-- ============================================================================
CREATE TABLE IF NOT EXISTS creator_media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Asset classification
    asset_type TEXT NOT NULL CHECK (asset_type IN (
        'logo',           -- Brand logos (primary, secondary, icon, etc.)
        'face',           -- User faces for thumbnails
        'character',      -- Character/avatar representations
        'game_skin',      -- Game character skins
        'object',         -- Props, items to include
        'background',     -- Custom backgrounds
        'reference',      -- Style reference images
        'overlay',        -- Stream overlays
        'emote',          -- Channel emotes
        'badge',          -- Subscriber badges
        'panel',          -- Channel panels
        'alert',          -- Alert images
        'facecam_frame',  -- Facecam borders
        'stinger'         -- Transition animations
    )),
    
    -- Display info
    display_name TEXT NOT NULL,
    description TEXT,
    
    -- Storage
    url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    thumbnail_url TEXT,
    
    -- File metadata
    file_size BIGINT,
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    
    -- Organization
    tags TEXT[] DEFAULT '{}',
    is_favorite BOOLEAN DEFAULT FALSE,
    is_primary BOOLEAN DEFAULT FALSE,  -- Primary asset of this type
    
    -- Type-specific metadata (JSONB for flexibility)
    -- Examples:
    -- logo: {"logo_variant": "primary", "transparent": true}
    -- face: {"expression": "happy", "angle": "front", "processed": true}
    -- character: {"style": "anime", "outfit": "casual"}
    -- game_skin: {"game": "fortnite", "character": "default", "rarity": "legendary"}
    -- object: {"category": "prop", "transparent": true}
    -- background: {"style": "gradient", "mood": "energetic"}
    -- reference: {"source": "youtube", "video_id": "abc123"}
    metadata JSONB DEFAULT '{}',
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes for efficient queries
-- ============================================================================

-- Primary lookup: user's assets by type
CREATE INDEX IF NOT EXISTS idx_creator_media_user_type 
    ON creator_media_assets(user_id, asset_type, created_at DESC);

-- Favorites lookup
CREATE INDEX IF NOT EXISTS idx_creator_media_favorites 
    ON creator_media_assets(user_id, is_favorite) WHERE is_favorite = TRUE;

-- Primary assets lookup
CREATE INDEX IF NOT EXISTS idx_creator_media_primary 
    ON creator_media_assets(user_id, asset_type, is_primary) WHERE is_primary = TRUE;

-- Tag search (GIN index for array containment)
CREATE INDEX IF NOT EXISTS idx_creator_media_tags 
    ON creator_media_assets USING GIN(tags);

-- Full-text search on display_name and description
CREATE INDEX IF NOT EXISTS idx_creator_media_search 
    ON creator_media_assets USING GIN(
        to_tsvector('english', COALESCE(display_name, '') || ' ' || COALESCE(description, ''))
    );

-- Usage tracking for "most used" queries
CREATE INDEX IF NOT EXISTS idx_creator_media_usage 
    ON creator_media_assets(user_id, usage_count DESC);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE creator_media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own media assets" ON creator_media_assets;
CREATE POLICY "Users can manage own media assets"
ON creator_media_assets FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_creator_media_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS creator_media_assets_updated_at ON creator_media_assets;
CREATE TRIGGER creator_media_assets_updated_at
    BEFORE UPDATE ON creator_media_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_creator_media_timestamp();

-- ============================================================================
-- Function: Ensure only one primary per type per user
-- ============================================================================
CREATE OR REPLACE FUNCTION ensure_single_primary_media()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = TRUE THEN
        UPDATE creator_media_assets
        SET is_primary = FALSE
        WHERE user_id = NEW.user_id
          AND asset_type = NEW.asset_type
          AND id != NEW.id
          AND is_primary = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS creator_media_single_primary ON creator_media_assets;
CREATE TRIGGER creator_media_single_primary
    BEFORE INSERT OR UPDATE ON creator_media_assets
    FOR EACH ROW
    WHEN (NEW.is_primary = TRUE)
    EXECUTE FUNCTION ensure_single_primary_media();

-- ============================================================================
-- Function: Increment usage count
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_media_usage(asset_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE creator_media_assets
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = asset_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- View: User media summary (counts by type)
-- ============================================================================
CREATE OR REPLACE VIEW creator_media_summary AS
SELECT 
    user_id,
    asset_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE is_favorite) as favorite_count,
    MAX(created_at) as latest_upload
FROM creator_media_assets
GROUP BY user_id, asset_type;

-- ============================================================================
-- Migration: Move existing user_face_assets to creator_media_assets
-- (Optional - run manually if needed)
-- ============================================================================
-- INSERT INTO creator_media_assets (
--     id, user_id, asset_type, display_name, url, storage_path,
--     is_primary, created_at, updated_at
-- )
-- SELECT 
--     id, user_id, 'face', COALESCE(display_name, 'Face'), 
--     original_url, storage_path, is_primary, created_at, updated_at
-- FROM user_face_assets
-- ON CONFLICT (id) DO NOTHING;
