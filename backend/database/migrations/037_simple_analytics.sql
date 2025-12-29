-- ============================================================================
-- Migration 037: Simple Analytics - Clean, Focused Tracking
-- ============================================================================
-- 
-- Replaces the over-engineered Redis queue system with direct PostgreSQL writes.
-- Tracks only what matters for business insights.
-- ============================================================================

-- ============================================================================
-- Step 1: Site Visits (anonymous + authenticated)
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id TEXT NOT NULL,           -- Anonymous visitor ID (from cookie/localStorage)
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    page_path TEXT NOT NULL,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    device_type TEXT,                   -- desktop, mobile, tablet
    browser TEXT,
    country TEXT,
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visits_created ON analytics_visits(created_at);
CREATE INDEX idx_visits_user ON analytics_visits(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_visits_page ON analytics_visits(page_path);
CREATE INDEX idx_visits_session ON analytics_visits(session_id);

-- ============================================================================
-- Step 2: User Events (key actions only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,           -- signup, login, logout, generation_started, generation_completed, generation_failed
    metadata JSONB DEFAULT '{}',        -- Additional context (asset_type, error_message, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_events_user ON analytics_user_events(user_id);
CREATE INDEX idx_user_events_type ON analytics_user_events(event_type);
CREATE INDEX idx_user_events_created ON analytics_user_events(created_at);

-- ============================================================================
-- Step 3: Daily Aggregates (pre-computed for fast dashboard)
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    unique_visitors INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    signups INTEGER DEFAULT 0,
    logins INTEGER DEFAULT 0,
    generations_started INTEGER DEFAULT 0,
    generations_completed INTEGER DEFAULT 0,
    generations_failed INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,     -- Users who did something
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_stats_date ON analytics_daily_stats(date);

-- ============================================================================
-- Step 4: Session Tracking (for time-on-site)
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL UNIQUE,
    visitor_id TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    page_count INTEGER DEFAULT 1,
    converted BOOLEAN DEFAULT FALSE     -- Did they sign up or generate?
);

CREATE INDEX idx_sessions_visitor ON analytics_sessions(visitor_id);
CREATE INDEX idx_sessions_user ON analytics_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_sessions_started ON analytics_sessions(started_at);

-- ============================================================================
-- Step 5: Functions for aggregation
-- ============================================================================

-- Update daily stats (called by trigger or cron)
CREATE OR REPLACE FUNCTION refresh_daily_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO analytics_daily_stats (
        date,
        unique_visitors,
        page_views,
        signups,
        logins,
        generations_started,
        generations_completed,
        generations_failed,
        active_users
    )
    SELECT
        target_date,
        (SELECT COUNT(DISTINCT visitor_id) FROM analytics_visits WHERE created_at::DATE = target_date),
        (SELECT COUNT(*) FROM analytics_visits WHERE created_at::DATE = target_date),
        (SELECT COUNT(*) FROM analytics_user_events WHERE event_type = 'signup' AND created_at::DATE = target_date),
        (SELECT COUNT(*) FROM analytics_user_events WHERE event_type = 'login' AND created_at::DATE = target_date),
        (SELECT COUNT(*) FROM analytics_user_events WHERE event_type = 'generation_started' AND created_at::DATE = target_date),
        (SELECT COUNT(*) FROM analytics_user_events WHERE event_type = 'generation_completed' AND created_at::DATE = target_date),
        (SELECT COUNT(*) FROM analytics_user_events WHERE event_type = 'generation_failed' AND created_at::DATE = target_date),
        (SELECT COUNT(DISTINCT user_id) FROM analytics_user_events WHERE created_at::DATE = target_date AND user_id IS NOT NULL)
    ON CONFLICT (date) DO UPDATE SET
        unique_visitors = EXCLUDED.unique_visitors,
        page_views = EXCLUDED.page_views,
        signups = EXCLUDED.signups,
        logins = EXCLUDED.logins,
        generations_started = EXCLUDED.generations_started,
        generations_completed = EXCLUDED.generations_completed,
        generations_failed = EXCLUDED.generations_failed,
        active_users = EXCLUDED.active_users,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Get dashboard summary
CREATE OR REPLACE FUNCTION get_analytics_dashboard(days INTEGER DEFAULT 30)
RETURNS TABLE (
    total_visitors BIGINT,
    total_page_views BIGINT,
    total_signups BIGINT,
    total_logins BIGINT,
    total_generations BIGINT,
    success_rate NUMERIC,
    avg_session_duration_minutes NUMERIC,
    conversion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(unique_visitors), 0)::BIGINT,
        COALESCE(SUM(page_views), 0)::BIGINT,
        COALESCE(SUM(signups), 0)::BIGINT,
        COALESCE(SUM(logins), 0)::BIGINT,
        COALESCE(SUM(generations_completed), 0)::BIGINT,
        CASE 
            WHEN SUM(generations_started) > 0 
            THEN ROUND(SUM(generations_completed)::NUMERIC / SUM(generations_started) * 100, 1)
            ELSE 0
        END,
        COALESCE((
            SELECT ROUND(AVG(EXTRACT(EPOCH FROM (last_activity_at - started_at)) / 60), 1)
            FROM analytics_sessions
            WHERE started_at >= CURRENT_DATE - days
        ), 0),
        CASE 
            WHEN (SELECT COUNT(DISTINCT visitor_id) FROM analytics_visits WHERE created_at >= CURRENT_DATE - days) > 0
            THEN ROUND(
                (SELECT COUNT(*)::NUMERIC FROM analytics_user_events WHERE event_type = 'signup' AND created_at >= CURRENT_DATE - days) /
                (SELECT COUNT(DISTINCT visitor_id) FROM analytics_visits WHERE created_at >= CURRENT_DATE - days) * 100, 2
            )
            ELSE 0
        END
    FROM analytics_daily_stats
    WHERE date >= CURRENT_DATE - days;
END;
$$ LANGUAGE plpgsql;

-- Get daily trend data
CREATE OR REPLACE FUNCTION get_analytics_trend(days INTEGER DEFAULT 30)
RETURNS TABLE (
    date DATE,
    visitors INTEGER,
    signups INTEGER,
    generations INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.date,
        COALESCE(d.unique_visitors, 0),
        COALESCE(d.signups, 0),
        COALESCE(d.generations_completed, 0)
    FROM analytics_daily_stats d
    WHERE d.date >= CURRENT_DATE - days
    ORDER BY d.date;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 6: RLS Policies (admin only for analytics)
-- ============================================================================
ALTER TABLE analytics_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access visits" ON analytics_visits
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access events" ON analytics_user_events
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access stats" ON analytics_daily_stats
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access sessions" ON analytics_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- Step 7: Helper function for incrementing session page count
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_session_page_count(p_session_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE analytics_sessions
    SET page_count = page_count + 1,
        last_activity_at = NOW()
    WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Migration Complete
-- ============================================================================
