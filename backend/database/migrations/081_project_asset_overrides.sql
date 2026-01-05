-- Migration 081: Project Asset Overrides
-- Enables per-project asset state isolation (e.g., background removal per project)
-- 
-- PROBLEM SOLVED:
-- Previously, background removal was tracked globally on the asset itself.
-- When a user removed background in Project A, it affected ALL projects using that asset.
-- This migration creates a junction table that stores per-project overrides.

-- ============================================================================
-- Project Asset Overrides Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_asset_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES canvas_projects(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL,  -- References creator_media_assets
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Per-project override settings
    use_processed_url BOOLEAN DEFAULT FALSE,  -- Whether to use bg-removed version in THIS project
    
    -- Future extensibility: per-project transforms
    custom_crop JSONB,  -- {x, y, width, height} - project-specific crop
    custom_filters JSONB,  -- {brightness, contrast, saturation, etc.}
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one override per project-asset pair
    UNIQUE(project_id, asset_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_project_asset_overrides_project_id 
    ON project_asset_overrides(project_id);

CREATE INDEX IF NOT EXISTS idx_project_asset_overrides_asset_id 
    ON project_asset_overrides(asset_id);

CREATE INDEX IF NOT EXISTS idx_project_asset_overrides_user_id 
    ON project_asset_overrides(user_id);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_project_asset_overrides_project_asset 
    ON project_asset_overrides(project_id, asset_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE project_asset_overrides ENABLE ROW LEVEL SECURITY;

-- Users can only see their own overrides
CREATE POLICY project_asset_overrides_select_own ON project_asset_overrides
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own overrides
CREATE POLICY project_asset_overrides_insert_own ON project_asset_overrides
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own overrides
CREATE POLICY project_asset_overrides_update_own ON project_asset_overrides
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own overrides
CREATE POLICY project_asset_overrides_delete_own ON project_asset_overrides
    FOR DELETE USING (auth.uid() = user_id);

-- Service role bypass for backend operations
CREATE POLICY project_asset_overrides_service_role ON project_asset_overrides
    FOR ALL USING (
        current_setting('role', true) = 'service_role'
        OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- ============================================================================
-- Updated At Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_project_asset_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_asset_overrides_updated_at_trigger
    BEFORE UPDATE ON project_asset_overrides
    FOR EACH ROW
    EXECUTE FUNCTION update_project_asset_overrides_updated_at();

-- ============================================================================
-- Helper Function: Get effective asset URL for a project
-- ============================================================================

CREATE OR REPLACE FUNCTION get_project_asset_url(
    p_project_id UUID,
    p_asset_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_override RECORD;
    v_asset RECORD;
BEGIN
    -- Get the override settings for this project-asset pair
    SELECT use_processed_url INTO v_override
    FROM project_asset_overrides
    WHERE project_id = p_project_id AND asset_id = p_asset_id;
    
    -- Get the asset
    SELECT url, processed_url, has_background_removed INTO v_asset
    FROM creator_media_assets
    WHERE id = p_asset_id;
    
    -- If no asset found, return NULL
    IF v_asset IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- If override exists and says use processed, and processed URL exists
    IF v_override.use_processed_url = TRUE 
       AND v_asset.has_background_removed = TRUE 
       AND v_asset.processed_url IS NOT NULL THEN
        RETURN v_asset.processed_url;
    END IF;
    
    -- Default to original URL
    RETURN v_asset.url;
END;
$$ LANGUAGE plpgsql STABLE;

