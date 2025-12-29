-- ============================================================================
-- Migration 033: Direct Messages System
-- AuraStream - Enterprise Direct Messaging
-- ============================================================================

-- Conversations table (1:1 between two users)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT conversations_user_order CHECK (user1_id < user2_id),
    CONSTRAINT conversations_unique_pair UNIQUE (user1_id, user2_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT messages_content_length CHECK (char_length(content) <= 2000)
);

-- Blocked users table
CREATE TABLE IF NOT EXISTS blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT blocked_users_unique UNIQUE (user_id, blocked_user_id),
    CONSTRAINT blocked_users_not_self CHECK (user_id != blocked_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_time ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, sender_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_blocked_users_user ON blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_user_id);

-- RLS Policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can only see their own conversations
CREATE POLICY conversations_select_policy ON conversations
    FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY conversations_insert_policy ON conversations
    FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Messages: Users can only see messages in their conversations
CREATE POLICY messages_select_policy ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

CREATE POLICY messages_insert_policy ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = conversation_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

-- Messages: Only recipient can mark as read
CREATE POLICY messages_update_policy ON messages
    FOR UPDATE USING (
        sender_id != auth.uid()
        AND EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
            AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );

-- Blocked users: Users can only manage their own blocks
CREATE POLICY blocked_users_select_policy ON blocked_users
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY blocked_users_insert_policy ON blocked_users
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY blocked_users_delete_policy ON blocked_users
    FOR DELETE USING (user_id = auth.uid());

-- Auto-update conversation timestamp trigger
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON messages;
CREATE TRIGGER trigger_update_conversation_timestamp
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- Grant permissions for service role
GRANT ALL ON conversations TO service_role;
GRANT ALL ON messages TO service_role;
GRANT ALL ON blocked_users TO service_role;
