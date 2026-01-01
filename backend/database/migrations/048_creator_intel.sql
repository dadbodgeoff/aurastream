-- Migration 048: Creator Intel
-- Date: 2025-12-30
-- Description: User preferences and activity tracking for Creator Intel dashboard

-- ============================================================================
-- Table 1: user_intel_preferences
-- Stores user's category subscriptions and dashboard layout
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_intel_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Category subscriptions (JSONB array)
    -- Structure: [{ "key": "fortnite", "name": "Fortnite", "twitch_id": "33214", "platform": "both", "notifications": true, "added_at": "..." }]
    subscribed_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Dashboard layout (JSONB array)
    -- Structure: [{ "panelType": "viral_clips", "position": { "x": 0, "y": 0 }, "size": "large" }]
    dashboard_layout JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- User timezone for timing recommendations
    timezone TEXT DEFAULT 'America/New_York',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One preferences record per user
    UNIQUE(user_id)
);

-- ============================================================================
-- Table 2: user_intel_activity
-- Tracks user engagement for AI personalization (Pro+ tiers only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_intel_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Category engagement tracking
    -- Structure: { "fortnite": 45, "valorant": 30, "just_chatting": 25 }
    category_engagement JSONB DEFAULT '{}'::jsonb,
    
    -- Active hours tracking (when user is on platform)
    -- Structure: { "monday": [14, 15, 16], "tuesday": [10, 11, 12] }
    active_hours JSONB DEFAULT '{}'::jsonb,
    
    -- Content creation preferences
    -- Structure: { "twitch_emote": 12, "youtube_thumbnail": 8 }
    content_preferences JSONB DEFAULT '{}'::jsonb,
    
    -- Historical performance data (if connected)
    avg_views_by_category JSONB DEFAULT '{}'::jsonb,
    best_performing_times JSONB DEFAULT '{}'::jsonb,
    
    -- Mission interaction tracking
    last_mission_shown_at TIMESTAMPTZ,
    last_mission_acted_on BOOLEAN DEFAULT FALSE,
    missions_shown_count INT DEFAULT 0,
    missions_acted_count INT DEFAULT 0,
    
    -- Timestamps
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One activity record per user
    UNIQUE(user_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_intel_preferences_user_id 
ON user_intel_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_user_intel_activity_user_id 
ON user_intel_activity(user_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE user_intel_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_intel_activity ENABLE ROW LEVEL SECURITY;

-- Users can only access their own preferences
CREATE POLICY "Users can view own intel preferences"
ON user_intel_preferences FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own intel preferences"
ON user_intel_preferences FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own intel preferences"
ON user_intel_preferences FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only access their own activity
CREATE POLICY "Users can view own intel activity"
ON user_intel_activity FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own intel activity"
ON user_intel_activity FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own intel activity"
ON user_intel_activity FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role full access to intel preferences"
ON user_intel_preferences FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access to intel activity"
ON user_intel_activity FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- Grants
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON user_intel_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_intel_activity TO authenticated;
GRANT ALL ON user_intel_preferences TO service_role;
GRANT ALL ON user_intel_activity TO service_role;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE user_intel_preferences IS 'User preferences for Creator Intel dashboard including category subscriptions and layout';
COMMENT ON TABLE user_intel_activity IS 'User activity tracking for AI-powered recommendations in Creator Intel';
COMMENT ON COLUMN user_intel_preferences.subscribed_categories IS 'Array of category subscriptions with metadata';
COMMENT ON COLUMN user_intel_preferences.dashboard_layout IS 'Array of panel configurations for dashboard layout';
COMMENT ON COLUMN user_intel_activity.category_engagement IS 'Count of interactions per category for personalization';
COMMENT ON COLUMN user_intel_activity.missions_acted_count IS 'Number of times user acted on Today''s Mission recommendation';
