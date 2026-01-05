-- Migration 078: Canvas Projects
-- Stores user canvas studio projects with their sketch elements and placements

-- ============================================================================
-- Canvas Projects Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS canvas_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Untitled Project',
    asset_type TEXT NOT NULL,
    thumbnail_url TEXT,
    
    -- Canvas data stored as JSONB for flexibility
    sketch_elements JSONB DEFAULT '[]'::jsonb,
    placements JSONB DEFAULT '[]'::jsonb,
    
    -- Full asset data for reconstruction (MediaAsset objects)
    assets JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_canvas_projects_user_id ON canvas_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_projects_updated_at ON canvas_projects(updated_at DESC);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE canvas_projects ENABLE ROW LEVEL SECURITY;

-- Users can only see their own projects
CREATE POLICY canvas_projects_select_own ON canvas_projects
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own projects
CREATE POLICY canvas_projects_insert_own ON canvas_projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own projects
CREATE POLICY canvas_projects_update_own ON canvas_projects
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own projects
CREATE POLICY canvas_projects_delete_own ON canvas_projects
    FOR DELETE USING (auth.uid() = user_id);

-- Service role bypass for backend operations
CREATE POLICY canvas_projects_service_role ON canvas_projects
    FOR ALL USING (
        current_setting('role', true) = 'service_role'
        OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- ============================================================================
-- Updated At Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_canvas_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER canvas_projects_updated_at_trigger
    BEFORE UPDATE ON canvas_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_canvas_projects_updated_at();
