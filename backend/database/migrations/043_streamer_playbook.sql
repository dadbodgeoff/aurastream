-- ============================================================================
-- Migration 043: Streamer Playbook - Algorithmic Masterclass Reports
-- ============================================================================
-- Stores generated playbook reports with timestamps for historical access
-- Reports are generated on each major data refresh (synced with YouTube)
-- ============================================================================

-- Playbook reports table
CREATE TABLE IF NOT EXISTS playbook_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE NOT NULL,
    report_time TIME NOT NULL,
    report_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Hero section
    headline TEXT NOT NULL,
    subheadline TEXT,
    mood TEXT CHECK (mood IN ('bullish', 'cautious', 'opportunity', 'competitive')),
    
    -- Quick stats snapshot
    total_twitch_viewers BIGINT DEFAULT 0,
    total_youtube_gaming_views BIGINT DEFAULT 0,
    trending_game TEXT,
    viral_video_count INT DEFAULT 0,
    
    -- JSON data for complex structures
    golden_hours JSONB DEFAULT '[]'::jsonb,
    niche_opportunities JSONB DEFAULT '[]'::jsonb,
    viral_hooks JSONB DEFAULT '[]'::jsonb,
    title_formulas JSONB DEFAULT '[]'::jsonb,
    thumbnail_recipes JSONB DEFAULT '[]'::jsonb,
    strategies JSONB DEFAULT '[]'::jsonb,
    insight_cards JSONB DEFAULT '[]'::jsonb,
    
    -- Keywords and hashtags
    trending_hashtags TEXT[] DEFAULT '{}',
    title_keywords TEXT[] DEFAULT '{}',
    
    -- Motivational
    daily_mantra TEXT,
    success_story TEXT,
    
    -- Metadata
    data_sources JSONB DEFAULT '{}'::jsonb,  -- Track what data was used
    generation_duration_ms INT,  -- How long it took to generate
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by date
CREATE INDEX IF NOT EXISTS idx_playbook_reports_date ON playbook_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_playbook_reports_timestamp ON playbook_reports(report_timestamp DESC);

-- Unique constraint: one report per timestamp (prevent duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_playbook_reports_unique_timestamp 
ON playbook_reports(report_date, report_time);


-- User playbook preferences (for personalization later)
CREATE TABLE IF NOT EXISTS user_playbook_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Preferred games to track
    favorite_games TEXT[] DEFAULT '{}',
    
    -- Notification preferences
    notify_on_new_report BOOLEAN DEFAULT true,
    notify_golden_hours BOOLEAN DEFAULT true,
    
    -- Timezone for golden hour calculations
    timezone TEXT DEFAULT 'America/New_York',
    
    -- Last viewed report
    last_viewed_report_id UUID REFERENCES playbook_reports(id),
    last_viewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Track which reports users have viewed (for "new" badges)
CREATE TABLE IF NOT EXISTS user_playbook_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_id UUID NOT NULL REFERENCES playbook_reports(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, report_id)
);

-- Index for checking if user has viewed a report
CREATE INDEX IF NOT EXISTS idx_user_playbook_views_lookup 
ON user_playbook_views(user_id, report_id);

-- Function to get latest report
CREATE OR REPLACE FUNCTION get_latest_playbook_report()
RETURNS playbook_reports AS $$
BEGIN
    RETURN (
        SELECT * FROM playbook_reports 
        ORDER BY report_timestamp DESC 
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get reports for a specific date
CREATE OR REPLACE FUNCTION get_playbook_reports_for_date(target_date DATE)
RETURNS SETOF playbook_reports AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM playbook_reports 
    WHERE report_date = target_date
    ORDER BY report_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to list recent reports (for report selector)
CREATE OR REPLACE FUNCTION list_recent_playbook_reports(limit_count INT DEFAULT 20)
RETURNS TABLE (
    id UUID,
    report_date DATE,
    report_time TIME,
    report_timestamp TIMESTAMPTZ,
    headline TEXT,
    mood TEXT,
    trending_game TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pr.id,
        pr.report_date,
        pr.report_time,
        pr.report_timestamp,
        pr.headline,
        pr.mood,
        pr.trending_game
    FROM playbook_reports pr
    ORDER BY pr.report_timestamp DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE playbook_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_playbook_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_playbook_views ENABLE ROW LEVEL SECURITY;

-- Playbook reports are readable by all authenticated users
CREATE POLICY "Playbook reports are viewable by authenticated users"
ON playbook_reports FOR SELECT
TO authenticated
USING (true);

-- Only service role can insert/update reports
CREATE POLICY "Service role can manage playbook reports"
ON playbook_reports FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Users can manage their own preferences
CREATE POLICY "Users can manage their own playbook preferences"
ON user_playbook_preferences FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can manage their own playbook views
CREATE POLICY "Users can manage their own playbook views"
ON user_playbook_views FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON playbook_reports TO authenticated;
GRANT ALL ON playbook_reports TO service_role;
GRANT ALL ON user_playbook_preferences TO authenticated;
GRANT ALL ON user_playbook_views TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_playbook_report() TO authenticated;
GRANT EXECUTE ON FUNCTION get_playbook_reports_for_date(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION list_recent_playbook_reports(INT) TO authenticated;
