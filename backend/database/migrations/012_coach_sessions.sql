-- Migration: 012_coach_sessions
-- Description: Persist coach sessions to PostgreSQL for history and asset linking
-- Created: 2025-12-27

-- ============================================================================
-- Coach Sessions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS coach_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE SET NULL,
    asset_type TEXT NOT NULL,
    mood TEXT,
    game_context TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired')),
    turns_used INTEGER DEFAULT 0,
    current_prompt TEXT,
    messages JSONB DEFAULT '[]'::jsonb,
    generated_asset_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_coach_sessions_user_id ON coach_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_sessions_status ON coach_sessions(status);
CREATE INDEX IF NOT EXISTS idx_coach_sessions_created_at ON coach_sessions(created_at DESC);

-- ============================================================================
-- Link assets to coach sessions
-- ============================================================================

ALTER TABLE assets ADD COLUMN IF NOT EXISTS coach_session_id UUID REFERENCES coach_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_assets_coach_session ON assets(coach_session_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE coach_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY coach_sessions_select_own ON coach_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY coach_sessions_insert_own ON coach_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY coach_sessions_update_own ON coach_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY coach_sessions_delete_own ON coach_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_coach_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coach_sessions_updated_at
    BEFORE UPDATE ON coach_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_coach_sessions_updated_at();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE coach_sessions IS 'Persisted Prompt Coach sessions for history and asset linking';
COMMENT ON COLUMN coach_sessions.messages IS 'JSONB array of {role, content, timestamp} messages';
COMMENT ON COLUMN coach_sessions.generated_asset_ids IS 'Array of asset IDs generated in this session';
COMMENT ON COLUMN coach_sessions.current_prompt IS 'The refined prompt/intent from the coaching session';


-- ============================================================================
-- Helper function to append to UUID array (for linking assets)
-- ============================================================================

CREATE OR REPLACE FUNCTION array_append_unique(
    table_name TEXT,
    column_name TEXT,
    row_id UUID,
    new_value UUID
)
RETURNS VOID AS $$
BEGIN
    EXECUTE format(
        'UPDATE %I SET %I = array_append(%I, $1) WHERE id = $2 AND NOT ($1 = ANY(%I))',
        table_name, column_name, column_name, column_name
    ) USING new_value, row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
