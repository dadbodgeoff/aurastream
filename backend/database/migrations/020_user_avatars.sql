-- ============================================================================
-- Migration: 020_user_avatars
-- Description: Add user avatars table for character customization in generations
-- Created: 2025-12-28
-- 
-- This is ADDITIVE ONLY - no existing functionality is modified
-- All avatar features are optional and backward compatible
-- ============================================================================

-- Create user_avatars table
CREATE TABLE IF NOT EXISTS user_avatars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'My Avatar',
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Physical Appearance
    gender TEXT DEFAULT 'neutral',
    body_type TEXT DEFAULT 'average',
    skin_tone TEXT DEFAULT 'medium',
    
    -- Face
    face_shape TEXT DEFAULT 'oval',
    eye_color TEXT DEFAULT 'brown',
    eye_style TEXT DEFAULT 'normal',
    
    -- Hair
    hair_color TEXT DEFAULT 'brown',
    hair_style TEXT DEFAULT 'short',
    hair_texture TEXT DEFAULT 'straight',
    
    -- Expression Default
    default_expression TEXT DEFAULT 'friendly',
    
    -- Style Preferences
    art_style TEXT DEFAULT 'realistic',
    outfit_style TEXT DEFAULT 'casual-gamer',
    
    -- Accessories (nullable = not wearing)
    glasses BOOLEAN DEFAULT FALSE,
    glasses_style TEXT,
    headwear TEXT,
    facial_hair TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_avatars_user_id ON user_avatars(user_id);
CREATE INDEX IF NOT EXISTS idx_user_avatars_default ON user_avatars(user_id, is_default) WHERE is_default = TRUE;

-- Ensure only one default avatar per user (using a partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_avatars_one_default 
ON user_avatars(user_id) WHERE is_default = TRUE;

-- Comments
COMMENT ON TABLE user_avatars IS 'User-defined avatar/character customization for AI generations';
COMMENT ON COLUMN user_avatars.is_default IS 'Only one avatar per user can be default';
COMMENT ON COLUMN user_avatars.gender IS 'male, female, neutral, other';
COMMENT ON COLUMN user_avatars.body_type IS 'slim, average, athletic, curvy, muscular';
COMMENT ON COLUMN user_avatars.skin_tone IS 'very-light, light, medium, tan, brown, dark';
COMMENT ON COLUMN user_avatars.eye_style IS 'normal, anime-large, narrow, round';
COMMENT ON COLUMN user_avatars.art_style IS 'realistic, anime, cartoon, pixel, 3d-render';

-- RLS Policies (users can only access their own avatars)
ALTER TABLE user_avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_avatars_select ON user_avatars
    FOR SELECT USING (auth.uid()::text = user_id::text OR user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY user_avatars_insert ON user_avatars
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text OR user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY user_avatars_update ON user_avatars
    FOR UPDATE USING (auth.uid()::text = user_id::text OR user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY user_avatars_delete ON user_avatars
    FOR DELETE USING (auth.uid()::text = user_id::text OR user_id::text = current_setting('app.current_user_id', true));

-- Function to ensure only one default avatar per user
CREATE OR REPLACE FUNCTION ensure_single_default_avatar()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE user_avatars 
        SET is_default = FALSE, updated_at = NOW()
        WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single default
DROP TRIGGER IF EXISTS trigger_single_default_avatar ON user_avatars;
CREATE TRIGGER trigger_single_default_avatar
    BEFORE INSERT OR UPDATE ON user_avatars
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_avatar();
