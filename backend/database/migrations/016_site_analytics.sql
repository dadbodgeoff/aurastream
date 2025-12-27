-- =============================================================================
-- Migration 016: Site Analytics Schema
-- Production-ready analytics for visitor tracking, sessions, funnels, and flows
-- Admin-only access (dadbodgeoff@gmail.com)
-- =============================================================================

-- Visitors table (persistent across sessions)
CREATE TABLE IF NOT EXISTS site_visitors (
    visitor_id VARCHAR(64) PRIMARY KEY,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    visit_count INT NOT NULL DEFAULT 1,
    converted BOOLEAN NOT NULL DEFAULT FALSE,
    converted_at TIMESTAMPTZ,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    referrer_source TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    device_type VARCHAR(20), -- 'mobile', 'tablet', 'desktop'
    browser VARCHAR(50),
    os VARCHAR(50),
    country VARCHAR(2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions table (per visit)
CREATE TABLE IF NOT EXISTS site_sessions (
    session_id VARCHAR(64) PRIMARY KEY,
    visitor_id VARCHAR(64) NOT NULL REFERENCES site_visitors(visitor_id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_ms INT,
    pages_viewed INT NOT NULL DEFAULT 0,
    entry_page TEXT,
    exit_page TEXT,
    converted BOOLEAN NOT NULL DEFAULT FALSE,
    conversion_event VARCHAR(50),
    is_bounce BOOLEAN NOT NULL DEFAULT FALSE,
    referrer TEXT,
    device_type VARCHAR(20),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Page views (for flow analysis)
CREATE TABLE IF NOT EXISTS site_page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(64) NOT NULL REFERENCES site_sessions(session_id) ON DELETE CASCADE,
    visitor_id VARCHAR(64) NOT NULL REFERENCES site_visitors(visitor_id) ON DELETE CASCADE,
    page_path TEXT NOT NULL,
    page_title TEXT,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    time_on_page_ms INT,
    scroll_depth INT, -- 0-100 percentage
    referrer_page TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Funnel events (conversion tracking)
CREATE TABLE IF NOT EXISTS site_funnel_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id VARCHAR(64) NOT NULL REFERENCES site_visitors(visitor_id) ON DELETE CASCADE,
    session_id VARCHAR(64) NOT NULL REFERENCES site_sessions(session_id) ON DELETE CASCADE,
    step VARCHAR(50) NOT NULL, -- 'landing_view', 'cta_click', 'signup_start', 'signup_complete', 'first_generation'
    step_order INT NOT NULL,
    metadata JSONB DEFAULT '{}',
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily aggregates (fast dashboard queries)
CREATE TABLE IF NOT EXISTS site_analytics_daily (
    date DATE NOT NULL,
    unique_visitors INT NOT NULL DEFAULT 0,
    total_sessions INT NOT NULL DEFAULT 0,
    new_visitors INT NOT NULL DEFAULT 0,
    returning_visitors INT NOT NULL DEFAULT 0,
    total_page_views INT NOT NULL DEFAULT 0,
    total_signups INT NOT NULL DEFAULT 0,
    bounce_count INT NOT NULL DEFAULT 0,
    avg_session_duration_ms INT,
    avg_pages_per_session DECIMAL(5,2),
    mobile_sessions INT NOT NULL DEFAULT 0,
    desktop_sessions INT NOT NULL DEFAULT 0,
    tablet_sessions INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (date)
);

-- Funnel aggregates (daily conversion rates)
CREATE TABLE IF NOT EXISTS site_funnel_daily (
    date DATE NOT NULL,
    step VARCHAR(50) NOT NULL,
    step_order INT NOT NULL,
    count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (date, step)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_site_visitors_last_seen ON site_visitors(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visitors_converted ON site_visitors(converted) WHERE converted = TRUE;
CREATE INDEX IF NOT EXISTS idx_site_sessions_visitor ON site_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_site_sessions_started ON site_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_page_views_session ON site_page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_site_page_views_path ON site_page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_site_funnel_events_visitor ON site_funnel_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_site_funnel_events_step ON site_funnel_events(step, occurred_at DESC);

-- Function to get funnel conversion rates
CREATE OR REPLACE FUNCTION get_funnel_conversion(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    step VARCHAR(50),
    step_order INT,
    total_count BIGINT,
    conversion_rate DECIMAL(5,2)
) AS $$
DECLARE
    first_step_count BIGINT;
BEGIN
    -- Get the count of the first step
    SELECT COALESCE(SUM(count), 0) INTO first_step_count
    FROM site_funnel_daily
    WHERE date BETWEEN p_start_date AND p_end_date
    AND step_order = 1;
    
    IF first_step_count = 0 THEN
        first_step_count := 1; -- Avoid division by zero
    END IF;
    
    RETURN QUERY
    SELECT 
        sfd.step,
        sfd.step_order,
        SUM(sfd.count)::BIGINT as total_count,
        ROUND((SUM(sfd.count)::DECIMAL / first_step_count) * 100, 2) as conversion_rate
    FROM site_funnel_daily sfd
    WHERE sfd.date BETWEEN p_start_date AND p_end_date
    GROUP BY sfd.step, sfd.step_order
    ORDER BY sfd.step_order;
END;
$$ LANGUAGE plpgsql;

-- Function to get visitor flow (page transitions)
CREATE OR REPLACE FUNCTION get_page_flow(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    from_page TEXT,
    to_page TEXT,
    transition_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH page_transitions AS (
        SELECT 
            pv1.page_path as from_page,
            pv2.page_path as to_page
        FROM site_page_views pv1
        JOIN site_page_views pv2 ON pv1.session_id = pv2.session_id
            AND pv2.viewed_at > pv1.viewed_at
            AND pv2.viewed_at <= pv1.viewed_at + INTERVAL '30 minutes'
        WHERE pv1.viewed_at BETWEEN p_start_date AND p_end_date + INTERVAL '1 day'
        AND NOT EXISTS (
            SELECT 1 FROM site_page_views pv3
            WHERE pv3.session_id = pv1.session_id
            AND pv3.viewed_at > pv1.viewed_at
            AND pv3.viewed_at < pv2.viewed_at
        )
    )
    SELECT 
        pt.from_page,
        pt.to_page,
        COUNT(*)::BIGINT as transition_count
    FROM page_transitions pt
    GROUP BY pt.from_page, pt.to_page
    ORDER BY transition_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate daily stats (called by worker)
CREATE OR REPLACE FUNCTION aggregate_daily_analytics(p_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO site_analytics_daily (
        date,
        unique_visitors,
        total_sessions,
        new_visitors,
        returning_visitors,
        total_page_views,
        total_signups,
        bounce_count,
        avg_session_duration_ms,
        avg_pages_per_session,
        mobile_sessions,
        desktop_sessions,
        tablet_sessions,
        updated_at
    )
    SELECT
        p_date,
        COUNT(DISTINCT ss.visitor_id),
        COUNT(ss.session_id),
        COUNT(DISTINCT CASE WHEN sv.visit_count = 1 THEN sv.visitor_id END),
        COUNT(DISTINCT CASE WHEN sv.visit_count > 1 THEN sv.visitor_id END),
        COALESCE(SUM(ss.pages_viewed), 0),
        COUNT(DISTINCT CASE WHEN ss.converted THEN ss.session_id END),
        COUNT(CASE WHEN ss.is_bounce THEN 1 END),
        AVG(ss.duration_ms)::INT,
        ROUND(AVG(ss.pages_viewed), 2),
        COUNT(CASE WHEN ss.device_type = 'mobile' THEN 1 END),
        COUNT(CASE WHEN ss.device_type = 'desktop' THEN 1 END),
        COUNT(CASE WHEN ss.device_type = 'tablet' THEN 1 END),
        NOW()
    FROM site_sessions ss
    JOIN site_visitors sv ON ss.visitor_id = sv.visitor_id
    WHERE ss.started_at::DATE = p_date
    ON CONFLICT (date) DO UPDATE SET
        unique_visitors = EXCLUDED.unique_visitors,
        total_sessions = EXCLUDED.total_sessions,
        new_visitors = EXCLUDED.new_visitors,
        returning_visitors = EXCLUDED.returning_visitors,
        total_page_views = EXCLUDED.total_page_views,
        total_signups = EXCLUDED.total_signups,
        bounce_count = EXCLUDED.bounce_count,
        avg_session_duration_ms = EXCLUDED.avg_session_duration_ms,
        avg_pages_per_session = EXCLUDED.avg_pages_per_session,
        mobile_sessions = EXCLUDED.mobile_sessions,
        desktop_sessions = EXCLUDED.desktop_sessions,
        tablet_sessions = EXCLUDED.tablet_sessions,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- RLS Policies (admin only - dadbodgeoff@gmail.com)
ALTER TABLE site_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_funnel_daily ENABLE ROW LEVEL SECURITY;

-- Admin check function
CREATE OR REPLACE FUNCTION is_analytics_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND email = 'dadbodgeoff@gmail.com'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Read policies (admin only)
CREATE POLICY "Analytics admin read visitors" ON site_visitors
    FOR SELECT USING (is_analytics_admin());

CREATE POLICY "Analytics admin read sessions" ON site_sessions
    FOR SELECT USING (is_analytics_admin());

CREATE POLICY "Analytics admin read page_views" ON site_page_views
    FOR SELECT USING (is_analytics_admin());

CREATE POLICY "Analytics admin read funnel_events" ON site_funnel_events
    FOR SELECT USING (is_analytics_admin());

CREATE POLICY "Analytics admin read daily" ON site_analytics_daily
    FOR SELECT USING (is_analytics_admin());

CREATE POLICY "Analytics admin read funnel_daily" ON site_funnel_daily
    FOR SELECT USING (is_analytics_admin());

-- Service role can insert (for API ingestion)
CREATE POLICY "Service insert visitors" ON site_visitors
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Service insert sessions" ON site_sessions
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Service insert page_views" ON site_page_views
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Service insert funnel_events" ON site_funnel_events
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Service insert daily" ON site_analytics_daily
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Service insert funnel_daily" ON site_funnel_daily
    FOR INSERT WITH CHECK (TRUE);

-- Service role can update
CREATE POLICY "Service update visitors" ON site_visitors
    FOR UPDATE USING (TRUE);

CREATE POLICY "Service update sessions" ON site_sessions
    FOR UPDATE USING (TRUE);

CREATE POLICY "Service update daily" ON site_analytics_daily
    FOR UPDATE USING (TRUE);

CREATE POLICY "Service update funnel_daily" ON site_funnel_daily
    FOR UPDATE USING (TRUE);


-- Helper function to increment session page count
CREATE OR REPLACE FUNCTION increment_session_pages(p_session_id VARCHAR(64))
RETURNS VOID AS $$
BEGIN
    UPDATE site_sessions 
    SET pages_viewed = pages_viewed + 1
    WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function to upsert funnel daily counts
CREATE OR REPLACE FUNCTION upsert_funnel_daily(
    p_date DATE,
    p_step VARCHAR(50),
    p_step_order INT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO site_funnel_daily (date, step, step_order, count)
    VALUES (p_date, p_step, p_step_order, 1)
    ON CONFLICT (date, step) DO UPDATE
    SET count = site_funnel_daily.count + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get top pages
CREATE OR REPLACE FUNCTION get_top_pages(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    page_path TEXT,
    view_count BIGINT,
    unique_visitors BIGINT,
    avg_time_on_page_ms BIGINT,
    avg_scroll_depth INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        spv.page_path,
        COUNT(*)::BIGINT as view_count,
        COUNT(DISTINCT spv.visitor_id)::BIGINT as unique_visitors,
        AVG(spv.time_on_page_ms)::BIGINT as avg_time_on_page_ms,
        AVG(spv.scroll_depth)::INT as avg_scroll_depth
    FROM site_page_views spv
    WHERE spv.viewed_at BETWEEN p_start_date AND p_end_date + INTERVAL '1 day'
    GROUP BY spv.page_path
    ORDER BY view_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_session_pages TO authenticated;
GRANT EXECUTE ON FUNCTION increment_session_pages TO service_role;
GRANT EXECUTE ON FUNCTION upsert_funnel_daily TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_funnel_daily TO service_role;
GRANT EXECUTE ON FUNCTION get_funnel_conversion TO authenticated;
GRANT EXECUTE ON FUNCTION get_page_flow TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_pages TO authenticated;
GRANT EXECUTE ON FUNCTION aggregate_daily_analytics TO service_role;
