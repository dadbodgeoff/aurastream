-- ============================================================================
-- Migration 034: Friendships System
-- AuraStream - Enterprise Friends Management
-- ============================================================================

-- Friendships table
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT friendships_unique UNIQUE (user_id, friend_id),
    CONSTRAINT friendships_not_self CHECK (user_id != friend_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_status ON friendships(friend_id, status);

-- RLS Policies
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY friendships_select_policy ON friendships
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY friendships_insert_policy ON friendships
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY friendships_update_policy ON friendships
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY friendships_delete_policy ON friendships
    FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Grant permissions for service role
GRANT ALL ON friendships TO service_role;
