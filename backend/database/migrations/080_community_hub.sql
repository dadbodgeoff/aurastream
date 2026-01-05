-- ============================================================================
-- Migration: 080_community_hub
-- Description: Community Hub - Pre-loaded assets for all users to use in Canvas Studio
-- Purpose: Store curated game assets, templates, and graphics that users can add to their canvas
-- ============================================================================

-- ============================================================================
-- Table: community_hub_assets
-- Pre-loaded assets available to all users (not user-specific)
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_hub_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Asset classification
    asset_type TEXT NOT NULL CHECK (asset_type IN (
        'logo', 'face', 'character', 'game_skin', 'object', 'background',
        'reference', 'overlay', 'emote', 'badge', 'panel', 'alert',
        'facecam_frame', 'stinger'
    )),
    
    -- Game/Category for filtering (e.g., "fortnite", "valorant", "minecraft")
    game_category TEXT NOT NULL DEFAULT 'general',
    
    -- Display info
    display_name TEXT NOT NULL,
    description TEXT,
    
    -- Storage (Supabase storage URLs)
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
    is_featured BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,  -- For future tier-gating
    sort_order INTEGER DEFAULT 0,
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Table: community_hub_categories
-- Game categories for the hub (Fortnite, Valorant, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_hub_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,  -- "fortnite", "valorant", etc.
    name TEXT NOT NULL,         -- "Fortnite", "Valorant", etc.
    description TEXT,
    icon_url TEXT,              -- Category icon/logo
    color TEXT,                 -- Brand color hex
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    asset_count INTEGER DEFAULT 0,  -- Denormalized for performance
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Primary lookup: assets by game category
CREATE INDEX IF NOT EXISTS idx_community_hub_assets_category 
    ON community_hub_assets(game_category, asset_type, sort_order);

-- Featured assets
CREATE INDEX IF NOT EXISTS idx_community_hub_assets_featured 
    ON community_hub_assets(is_featured, sort_order) WHERE is_featured = TRUE;

-- Full-text search on name/description
CREATE INDEX IF NOT EXISTS idx_community_hub_assets_search 
    ON community_hub_assets USING gin(to_tsvector('english', display_name || ' ' || COALESCE(description, '')));

-- Tags search
CREATE INDEX IF NOT EXISTS idx_community_hub_assets_tags 
    ON community_hub_assets USING gin(tags);

-- Categories lookup
CREATE INDEX IF NOT EXISTS idx_community_hub_categories_active 
    ON community_hub_categories(is_active, sort_order);

-- ============================================================================
-- Row Level Security (Public read, admin write)
-- ============================================================================

ALTER TABLE community_hub_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_hub_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read community hub assets
CREATE POLICY community_hub_assets_select_all ON community_hub_assets
    FOR SELECT USING (TRUE);

-- Everyone can read categories
CREATE POLICY community_hub_categories_select_all ON community_hub_categories
    FOR SELECT USING (TRUE);

-- Service role can do everything (for admin operations)
CREATE POLICY community_hub_assets_service_role ON community_hub_assets
    FOR ALL USING (
        current_setting('role', true) = 'service_role'
        OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

CREATE POLICY community_hub_categories_service_role ON community_hub_categories
    FOR ALL USING (
        current_setting('role', true) = 'service_role'
        OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- ============================================================================
-- Function: Update asset count on category
-- ============================================================================
CREATE OR REPLACE FUNCTION update_category_asset_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE community_hub_categories 
        SET asset_count = asset_count + 1 
        WHERE slug = NEW.game_category;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_hub_categories 
        SET asset_count = asset_count - 1 
        WHERE slug = OLD.game_category;
    ELSIF TG_OP = 'UPDATE' AND OLD.game_category != NEW.game_category THEN
        UPDATE community_hub_categories 
        SET asset_count = asset_count - 1 
        WHERE slug = OLD.game_category;
        UPDATE community_hub_categories 
        SET asset_count = asset_count + 1 
        WHERE slug = NEW.game_category;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_category_asset_count
    AFTER INSERT OR UPDATE OR DELETE ON community_hub_assets
    FOR EACH ROW EXECUTE FUNCTION update_category_asset_count();

-- ============================================================================
-- Seed initial categories
-- ============================================================================
INSERT INTO community_hub_categories (slug, name, description, color, sort_order) VALUES
    ('general', 'General', 'Universal assets for any content', '#6366f1', 0),
    ('fortnite', 'Fortnite', 'Fortnite game assets and skins', '#f59e0b', 1),
    ('valorant', 'Valorant', 'Valorant agents and assets', '#ef4444', 2),
    ('minecraft', 'Minecraft', 'Minecraft blocks and characters', '#22c55e', 3),
    ('apex', 'Apex Legends', 'Apex Legends characters and items', '#dc2626', 4),
    ('league', 'League of Legends', 'LoL champions and assets', '#0ea5e9', 5),
    ('overwatch', 'Overwatch', 'Overwatch heroes and assets', '#f97316', 6),
    ('cod', 'Call of Duty', 'CoD operators and weapons', '#71717a', 7),
    ('gta', 'GTA', 'Grand Theft Auto assets', '#84cc16', 8),
    ('roblox', 'Roblox', 'Roblox characters and items', '#ec4899', 9)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================================
-- Function: Increment usage count (called via RPC)
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_community_hub_usage(asset_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE community_hub_assets 
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = asset_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
