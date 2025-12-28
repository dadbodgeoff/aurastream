-- ============================================================================
-- Migration 027: The Aura Lab
-- Feature: Fusion reactor for emote experimentation
-- ============================================================================

-- Add daily fusion tracking to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS aura_lab_fusions_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS aura_lab_last_fusion_date DATE;

-- Create index for daily reset queries
CREATE INDEX IF NOT EXISTS idx_users_aura_lab_date 
ON users(aura_lab_last_fusion_date) 
WHERE aura_lab_last_fusion_date IS NOT NULL;

-- ============================================================================
-- Test Subjects Table
-- Stores uploaded images that users "lock in" for fusion experiments
-- ============================================================================
CREATE TABLE IF NOT EXISTS aura_lab_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aura_lab_subjects_user 
ON aura_lab_subjects(user_id);

CREATE INDEX IF NOT EXISTS idx_aura_lab_subjects_expires 
ON aura_lab_subjects(expires_at);

-- RLS for subjects
ALTER TABLE aura_lab_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subjects" ON aura_lab_subjects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subjects" ON aura_lab_subjects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects" ON aura_lab_subjects
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Fusions Table
-- Stores results of fusion experiments
-- ============================================================================
CREATE TABLE IF NOT EXISTS aura_lab_fusions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES aura_lab_subjects(id) ON DELETE CASCADE,
    element_id TEXT NOT NULL,
    image_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'mythic')),
    scores JSONB NOT NULL DEFAULT '{}',
    recipe_id UUID,
    is_kept BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aura_lab_fusions_user 
ON aura_lab_fusions(user_id);

CREATE INDEX IF NOT EXISTS idx_aura_lab_fusions_kept 
ON aura_lab_fusions(user_id, is_kept) 
WHERE is_kept = TRUE;

CREATE INDEX IF NOT EXISTS idx_aura_lab_fusions_rarity 
ON aura_lab_fusions(rarity);

-- RLS for fusions
ALTER TABLE aura_lab_fusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fusions" ON aura_lab_fusions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fusions" ON aura_lab_fusions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fusions" ON aura_lab_fusions
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- Recipes Table
-- Tracks first discoveries of element combinations
-- ============================================================================
CREATE TABLE IF NOT EXISTS aura_lab_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    element_id TEXT NOT NULL UNIQUE,
    first_user_id UUID NOT NULL REFERENCES users(id),
    times_used INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aura_lab_recipes_element 
ON aura_lab_recipes(element_id);

-- RLS for recipes (public read, restricted write)
ALTER TABLE aura_lab_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view recipes" ON aura_lab_recipes
    FOR SELECT USING (TRUE);

-- ============================================================================
-- Squad Invites Table (Pro/Studio feature)
-- For collaborative fusion between two users
-- ============================================================================
CREATE TABLE IF NOT EXISTS aura_lab_squad_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_code TEXT NOT NULL UNIQUE,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_subject_id UUID NOT NULL REFERENCES aura_lab_subjects(id),
    acceptor_id UUID REFERENCES users(id),
    acceptor_subject_id UUID REFERENCES aura_lab_subjects(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aura_lab_squad_invites_code 
ON aura_lab_squad_invites(invite_code);

CREATE INDEX IF NOT EXISTS idx_aura_lab_squad_invites_creator 
ON aura_lab_squad_invites(creator_id);

-- RLS for squad invites
ALTER TABLE aura_lab_squad_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invites" ON aura_lab_squad_invites
    FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = acceptor_id);

CREATE POLICY "Users can create invites" ON aura_lab_squad_invites
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update invites they're part of" ON aura_lab_squad_invites
    FOR UPDATE USING (auth.uid() = creator_id OR auth.uid() = acceptor_id);

-- ============================================================================
-- RPC Functions
-- ============================================================================

-- Check if user can perform another fusion today
CREATE OR REPLACE FUNCTION check_aura_lab_usage(p_user_id UUID, p_limit INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_used INTEGER;
    v_last_date DATE;
BEGIN
    SELECT aura_lab_fusions_today, aura_lab_last_fusion_date
    INTO v_used, v_last_date
    FROM users
    WHERE id = p_user_id;
    
    -- Reset if new day
    IF v_last_date IS NULL OR v_last_date < CURRENT_DATE THEN
        RETURN TRUE;
    END IF;
    
    RETURN COALESCE(v_used, 0) < p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment daily fusion count
CREATE OR REPLACE FUNCTION increment_aura_lab_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET 
        aura_lab_fusions_today = CASE 
            WHEN aura_lab_last_fusion_date IS NULL OR aura_lab_last_fusion_date < CURRENT_DATE 
            THEN 1 
            ELSE aura_lab_fusions_today + 1 
        END,
        aura_lab_last_fusion_date = CURRENT_DATE
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup expired subjects (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_aura_lab_subjects()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM aura_lab_subjects
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup expired squad invites (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_squad_invites()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE aura_lab_squad_invites
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < NOW();
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
