-- ============================================================================
-- Migration: 049_thumbnail_recreation
-- Description: Tables for thumbnail recreation feature
-- ============================================================================

-- ============================================================================
-- Table: thumbnail_recreations
-- Stores history of thumbnail recreations
-- ============================================================================
CREATE TABLE IF NOT EXISTS thumbnail_recreations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES generation_jobs(id) ON DELETE SET NULL,
    
    -- Reference thumbnail
    reference_video_id TEXT NOT NULL,
    reference_thumbnail_url TEXT NOT NULL,
    reference_analysis JSONB NOT NULL,
    
    -- User inputs
    face_asset_id UUID,
    custom_text TEXT,
    use_brand_colors BOOLEAN DEFAULT FALSE,
    brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE SET NULL,
    
    -- Result
    generated_url TEXT,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_thumbnail_recreations_user 
    ON thumbnail_recreations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thumbnail_recreations_status 
    ON thumbnail_recreations(status);
CREATE INDEX IF NOT EXISTS idx_thumbnail_recreations_job 
    ON thumbnail_recreations(job_id);

-- RLS
ALTER TABLE thumbnail_recreations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own recreations" ON thumbnail_recreations;
CREATE POLICY "Users can manage own recreations"
ON thumbnail_recreations FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Table: user_face_assets
-- Stores user's saved face images for recreation
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_face_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Asset info
    display_name TEXT,
    original_url TEXT NOT NULL,
    processed_url TEXT,  -- Background-removed version
    storage_path TEXT,
    
    -- Flags
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_face_assets_user 
    ON user_face_assets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_face_assets_primary 
    ON user_face_assets(user_id, is_primary) WHERE is_primary = TRUE;

-- RLS
ALTER TABLE user_face_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own face assets" ON user_face_assets;
CREATE POLICY "Users can manage own face assets"
ON user_face_assets FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Update thumbnail_intel table to include face details
-- ============================================================================
-- Note: The thumbnails JSONB column already stores all analysis data,
-- so no schema change needed. The face_expression, face_position, etc.
-- fields are stored within the thumbnails array objects.

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_thumbnail_recreation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS thumbnail_recreations_updated_at ON thumbnail_recreations;
CREATE TRIGGER thumbnail_recreations_updated_at
    BEFORE UPDATE ON thumbnail_recreations
    FOR EACH ROW
    EXECUTE FUNCTION update_thumbnail_recreation_timestamp();

DROP TRIGGER IF EXISTS user_face_assets_updated_at ON user_face_assets;
CREATE TRIGGER user_face_assets_updated_at
    BEFORE UPDATE ON user_face_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_thumbnail_recreation_timestamp();
