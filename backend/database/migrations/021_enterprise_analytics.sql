-- =============================================================================
-- Migration 021: Enterprise Analytics Schema
-- Complete analytics system with heatmaps, journeys, abandonment, and real-time
-- Admin-only access (dadbodgeoff@gmail.com)
-- =============================================================================

-- =============================================================================
-- PART 1: Enhanced Core Tables
-- =============================================================================

-- Add geo and enhanced device tracking to visitors
ALTER TABLE site_visitors 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS screen_resolution TEXT,
ADD COLUMN IF NOT EXISTS language TEXT;

-- Add more session metadata
ALTER TABLE site_sessions
ADD COLUMN IF NOT EXISTS screen_resolution TEXT,
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT,
ADD COLUMN IF NOT EXISTS is_mobile BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_tablet BOOLEAN DEFAULT FALSE;

-- =============================================================================
-- PART 2: Heatmap Click Tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS site_heatmap_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(64) NOT NULL,
    visitor_id VARCHAR(64) NOT NULL,
    page_path TEXT NOT NULL,
    click_x INT NOT NULL,           -- X position (pixels from left)
    click_y INT NOT NULL,           -- Y position (pixels from top)
    viewport_width INT NOT NULL,    -- Viewport width at time of click
    viewport_height INT NOT NULL,   -- Viewport height at time of click
    element_tag TEXT,               -- Tag name of clicked element
    element_id TEXT,                -- ID of clicked element
    element_class TEXT,             -- Class of clicked element
    element_text TEXT,              -- Text content (truncated)
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_heatmap_clicks_page ON site_heatmap_clicks(page_path);
CREATE INDEX IF NOT EXISTS idx_heatmap_clicks_time ON site_heatmap_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_heatmap_clicks_session ON site_heatmap_clicks(session_id);

-- =============================================================================
-- PART 3: User Journey Tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS site_user_journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id VARCHAR(64) NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    journey_hash TEXT NOT NULL,         -- Hash of the page sequence for grouping
    page_sequence TEXT[] NOT NULL,      -- Array of pages visited in order
    page_count INT NOT NULL,
    total_duration_ms INT,
    converted BOOLEAN DEFAULT FALSE,
    conversion_page TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journeys_hash ON site_user_journeys(journey_hash);
CREATE INDEX IF NOT EXISTS idx_journeys_visitor ON site_user_journeys(visitor_id);
CREATE INDEX IF NOT EXISTS idx_journeys_converted ON site_user_journeys(converted);
CREATE INDEX IF NOT EXISTS idx_journeys_started ON site_user_journeys(started_at);

-- =============================================================================
-- PART 4: Abandonment Tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS site_abandonment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id VARCHAR(64) NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    abandonment_type TEXT NOT NULL,     -- 'form', 'checkout', 'signup', 'generation', 'wizard'
    page_path TEXT NOT NULL,
    form_id TEXT,                       -- ID of abandoned form
    step_reached INT,                   -- For multi-step flows
    total_steps INT,                    -- Total steps in flow
    fields_filled JSONB DEFAULT '{}',   -- Which fields were filled (no values, just field names)
    time_spent_ms INT,                  -- Time spent before abandoning
    last_interaction TEXT,              -- Last element interacted with
    abandoned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abandonment_type ON site_abandonment_events(abandonment_type);
CREATE INDEX IF NOT EXISTS idx_abandonment_page ON site_abandonment_events(page_path);
CREATE INDEX IF NOT EXISTS idx_abandonment_time ON site_abandonment_events(abandoned_at);

-- =============================================================================
-- PART 5: Real-time Presence (for active users count)
-- =============================================================================

CREATE TABLE IF NOT EXISTS site_realtime_presence (
    visitor_id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    current_page TEXT NOT NULL,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_type VARCHAR(20),
    country VARCHAR(2),
    is_authenticated BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_presence_activity ON site_realtime_presence(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_presence_page ON site_realtime_presence(current_page);

-- =============================================================================
-- PART 6: Daily Aggregates Enhancement
-- =============================================================================

-- Add more columns to daily aggregates
ALTER TABLE site_analytics_daily
ADD COLUMN IF NOT EXISTS avg_session_duration_ms INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_pages_per_session DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS desktop_sessions INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS mobile_sessions INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS tablet_sessions INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_clicks INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS unique_pages_viewed INT DEFAULT 0;

-- Geographic daily aggregates
CREATE TABLE IF NOT EXISTS site_analytics_geo_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    country VARCHAR(2) NOT NULL,
    city TEXT,
    visitor_count INT DEFAULT 0,
    session_count INT DEFAULT 0,
    conversion_count INT DEFAULT 0,
    UNIQUE(date, country, city)
);

CREATE INDEX IF NOT EXISTS idx_geo_daily_date ON site_analytics_geo_daily(date);
CREATE INDEX IF NOT EXISTS idx_geo_daily_country ON site_analytics_geo_daily(country);

-- Device/Browser daily aggregates
CREATE TABLE IF NOT EXISTS site_analytics_device_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    device_type VARCHAR(20) NOT NULL,   -- 'desktop', 'mobile', 'tablet'
    browser VARCHAR(50),
    os VARCHAR(50),
    session_count INT DEFAULT 0,
    visitor_count INT DEFAULT 0,
    bounce_count INT DEFAULT 0,
    UNIQUE(date, device_type, browser, os)
);

CREATE INDEX IF NOT EXISTS idx_device_daily_date ON site_analytics_device_daily(date);

-- =============================================================================
-- PART 7: RPC Functions for Dashboard Queries
-- =============================================================================

-- Get real-time active users (last 5 minutes)
CREATE OR REPLACE FUNCTION get_realtime_active_users()
RETURNS TABLE (
    total_active INT,
    authenticated_count INT,
    anonymous_count INT,
    pages JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH active AS (
        SELECT * FROM site_realtime_presence
        WHERE last_activity_at > NOW() - INTERVAL '5 minutes'
    ),
    page_counts AS (
        SELECT current_page, COUNT(*) as count
        FROM active
        GROUP BY current_page
        ORDER BY count DESC
        LIMIT 10
    )
    SELECT 
        (SELECT COUNT(*)::INT FROM active) as total_active,
        (SELECT COUNT(*)::INT FROM active WHERE is_authenticated = TRUE) as authenticated_count,
        (SELECT COUNT(*)::INT FROM active WHERE is_authenticated = FALSE) as anonymous_count,
        (SELECT COALESCE(jsonb_agg(jsonb_build_object('page', current_page, 'count', count)), '[]'::jsonb) FROM page_counts) as pages;
END;
$$ LANGUAGE plpgsql;

-- Get heatmap data for a specific page
CREATE OR REPLACE FUNCTION get_heatmap_data(
    p_page_path TEXT,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_viewport_width INT DEFAULT 1920
)
RETURNS TABLE (
    x_percent DECIMAL(5,2),
    y_bucket INT,
    click_count INT,
    element_tag TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND((click_x::DECIMAL / NULLIF(viewport_width, 0)) * 100, 2) as x_percent,
        (click_y / 50) * 50 as y_bucket,  -- Group into 50px buckets
        COUNT(*)::INT as click_count,
        MODE() WITHIN GROUP (ORDER BY h.element_tag) as element_tag
    FROM site_heatmap_clicks h
    WHERE h.page_path = p_page_path
      AND h.clicked_at >= p_start_date
      AND h.clicked_at < p_end_date + INTERVAL '1 day'
    GROUP BY x_percent, y_bucket
    ORDER BY click_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Get top user journeys
CREATE OR REPLACE FUNCTION get_top_journeys(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    journey_hash TEXT,
    page_sequence TEXT[],
    journey_count INT,
    avg_duration_ms INT,
    conversion_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.journey_hash,
        MODE() WITHIN GROUP (ORDER BY j.page_sequence) as page_sequence,
        COUNT(*)::INT as journey_count,
        AVG(j.total_duration_ms)::INT as avg_duration_ms,
        ROUND((SUM(CASE WHEN j.converted THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100, 2) as conversion_rate
    FROM site_user_journeys j
    WHERE j.started_at >= p_start_date
      AND j.started_at < p_end_date + INTERVAL '1 day'
    GROUP BY j.journey_hash
    ORDER BY journey_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get abandonment analysis
CREATE OR REPLACE FUNCTION get_abandonment_analysis(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    abandonment_type TEXT,
    page_path TEXT,
    abandonment_count INT,
    avg_step_reached DECIMAL(5,2),
    avg_time_spent_ms INT,
    common_last_interaction TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.abandonment_type,
        a.page_path,
        COUNT(*)::INT as abandonment_count,
        AVG(a.step_reached)::DECIMAL(5,2) as avg_step_reached,
        AVG(a.time_spent_ms)::INT as avg_time_spent_ms,
        MODE() WITHIN GROUP (ORDER BY a.last_interaction) as common_last_interaction
    FROM site_abandonment_events a
    WHERE a.abandoned_at >= p_start_date
      AND a.abandoned_at < p_end_date + INTERVAL '1 day'
      AND (p_type IS NULL OR a.abandonment_type = p_type)
    GROUP BY a.abandonment_type, a.page_path
    ORDER BY abandonment_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Get geographic breakdown
CREATE OR REPLACE FUNCTION get_geo_breakdown(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    country VARCHAR(2),
    visitor_count BIGINT,
    session_count BIGINT,
    conversion_count BIGINT,
    conversion_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.country,
        SUM(g.visitor_count)::BIGINT as visitor_count,
        SUM(g.session_count)::BIGINT as session_count,
        SUM(g.conversion_count)::BIGINT as conversion_count,
        CASE 
            WHEN SUM(g.visitor_count) > 0 
            THEN ROUND((SUM(g.conversion_count)::DECIMAL / SUM(g.visitor_count)) * 100, 2)
            ELSE 0
        END as conversion_rate
    FROM site_analytics_geo_daily g
    WHERE g.date >= p_start_date
      AND g.date <= p_end_date
    GROUP BY g.country
    ORDER BY visitor_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get device/browser breakdown
CREATE OR REPLACE FUNCTION get_device_breakdown(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    device_type VARCHAR(20),
    browser VARCHAR(50),
    session_count BIGINT,
    visitor_count BIGINT,
    bounce_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.device_type,
        d.browser,
        SUM(d.session_count)::BIGINT as session_count,
        SUM(d.visitor_count)::BIGINT as visitor_count,
        CASE 
            WHEN SUM(d.session_count) > 0 
            THEN ROUND((SUM(d.bounce_count)::DECIMAL / SUM(d.session_count)) * 100, 2)
            ELSE 0
        END as bounce_rate
    FROM site_analytics_device_daily d
    WHERE d.date >= p_start_date
      AND d.date <= p_end_date
    GROUP BY d.device_type, d.browser
    ORDER BY session_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Get daily visitor chart data
CREATE OR REPLACE FUNCTION get_daily_visitors(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    date DATE,
    unique_visitors INT,
    new_visitors INT,
    returning_visitors INT,
    total_sessions INT,
    total_page_views INT,
    signups INT,
    bounce_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.date,
        d.unique_visitors,
        d.new_visitors,
        d.returning_visitors,
        d.total_sessions,
        d.total_page_views,
        d.total_signups as signups,
        CASE 
            WHEN d.total_sessions > 0 
            THEN ROUND((d.bounce_count::DECIMAL / d.total_sessions) * 100, 2)
            ELSE 0
        END as bounce_rate
    FROM site_analytics_daily d
    WHERE d.date >= p_start_date
      AND d.date <= p_end_date
    ORDER BY d.date ASC;
END;
$$ LANGUAGE plpgsql;

-- Enhanced daily aggregation function
CREATE OR REPLACE FUNCTION aggregate_daily_analytics(p_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS VOID AS $$
DECLARE
    v_start TIMESTAMPTZ;
    v_end TIMESTAMPTZ;
BEGIN
    v_start := p_date::TIMESTAMPTZ;
    v_end := (p_date + INTERVAL '1 day')::TIMESTAMPTZ;
    
    -- Main daily aggregates
    INSERT INTO site_analytics_daily (
        date, unique_visitors, total_sessions, new_visitors, returning_visitors,
        total_page_views, total_signups, bounce_count, avg_session_duration_ms,
        avg_pages_per_session, desktop_sessions, mobile_sessions, tablet_sessions,
        total_clicks, unique_pages_viewed
    )
    SELECT 
        p_date,
        (SELECT COUNT(DISTINCT visitor_id) FROM site_sessions WHERE started_at >= v_start AND started_at < v_end),
        (SELECT COUNT(*) FROM site_sessions WHERE started_at >= v_start AND started_at < v_end),
        (SELECT COUNT(*) FROM site_visitors WHERE first_seen_at >= v_start AND first_seen_at < v_end),
        (SELECT COUNT(*) FROM site_sessions s 
         JOIN site_visitors v ON s.visitor_id = v.visitor_id 
         WHERE s.started_at >= v_start AND s.started_at < v_end AND v.visit_count > 1),
        (SELECT COUNT(*) FROM site_page_views WHERE viewed_at >= v_start AND viewed_at < v_end),
        (SELECT COUNT(*) FROM site_sessions WHERE started_at >= v_start AND started_at < v_end AND converted = TRUE),
        (SELECT COUNT(*) FROM site_sessions WHERE started_at >= v_start AND started_at < v_end AND is_bounce = TRUE),
        (SELECT COALESCE(AVG(duration_ms), 0)::INT FROM site_sessions WHERE started_at >= v_start AND started_at < v_end AND duration_ms IS NOT NULL),
        (SELECT COALESCE(AVG(pages_viewed), 0) FROM site_sessions WHERE started_at >= v_start AND started_at < v_end),
        (SELECT COUNT(*) FROM site_sessions WHERE started_at >= v_start AND started_at < v_end AND device_type = 'desktop'),
        (SELECT COUNT(*) FROM site_sessions WHERE started_at >= v_start AND started_at < v_end AND device_type = 'mobile'),
        (SELECT COUNT(*) FROM site_sessions WHERE started_at >= v_start AND started_at < v_end AND device_type = 'tablet'),
        (SELECT COUNT(*) FROM site_heatmap_clicks WHERE clicked_at >= v_start AND clicked_at < v_end),
        (SELECT COUNT(DISTINCT page_path) FROM site_page_views WHERE viewed_at >= v_start AND viewed_at < v_end)
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
        desktop_sessions = EXCLUDED.desktop_sessions,
        mobile_sessions = EXCLUDED.mobile_sessions,
        tablet_sessions = EXCLUDED.tablet_sessions,
        total_clicks = EXCLUDED.total_clicks,
        unique_pages_viewed = EXCLUDED.unique_pages_viewed;
    
    -- Geographic aggregates
    INSERT INTO site_analytics_geo_daily (date, country, city, visitor_count, session_count, conversion_count)
    SELECT 
        p_date,
        COALESCE(v.country, 'XX'),
        v.city,
        COUNT(DISTINCT s.visitor_id),
        COUNT(*),
        SUM(CASE WHEN s.converted THEN 1 ELSE 0 END)
    FROM site_sessions s
    JOIN site_visitors v ON s.visitor_id = v.visitor_id
    WHERE s.started_at >= v_start AND s.started_at < v_end
    GROUP BY v.country, v.city
    ON CONFLICT (date, country, city) DO UPDATE SET
        visitor_count = EXCLUDED.visitor_count,
        session_count = EXCLUDED.session_count,
        conversion_count = EXCLUDED.conversion_count;
    
    -- Device aggregates
    INSERT INTO site_analytics_device_daily (date, device_type, browser, os, session_count, visitor_count, bounce_count)
    SELECT 
        p_date,
        COALESCE(s.device_type, 'unknown'),
        COALESCE(v.browser, 'unknown'),
        COALESCE(v.os, 'unknown'),
        COUNT(*),
        COUNT(DISTINCT s.visitor_id),
        SUM(CASE WHEN s.is_bounce THEN 1 ELSE 0 END)
    FROM site_sessions s
    JOIN site_visitors v ON s.visitor_id = v.visitor_id
    WHERE s.started_at >= v_start AND s.started_at < v_end
    GROUP BY s.device_type, v.browser, v.os
    ON CONFLICT (date, device_type, browser, os) DO UPDATE SET
        session_count = EXCLUDED.session_count,
        visitor_count = EXCLUDED.visitor_count,
        bounce_count = EXCLUDED.bounce_count;
    
    -- Clean up old real-time presence data (older than 1 hour)
    DELETE FROM site_realtime_presence WHERE last_activity_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PART 8: RLS Policies
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE site_heatmap_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_user_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_abandonment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_realtime_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_analytics_geo_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_analytics_device_daily ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for backend)
CREATE POLICY "Service role full access on heatmap_clicks" ON site_heatmap_clicks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on user_journeys" ON site_user_journeys FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on abandonment_events" ON site_abandonment_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on realtime_presence" ON site_realtime_presence FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on geo_daily" ON site_analytics_geo_daily FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on device_daily" ON site_analytics_device_daily FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- PART 9: Indexes for Performance
-- =============================================================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sessions_started_device ON site_sessions(started_at, device_type);
CREATE INDEX IF NOT EXISTS idx_sessions_visitor_started ON site_sessions(visitor_id, started_at);
CREATE INDEX IF NOT EXISTS idx_pageviews_session_time ON site_page_views(session_id, viewed_at);
CREATE INDEX IF NOT EXISTS idx_visitors_country ON site_visitors(country);
CREATE INDEX IF NOT EXISTS idx_funnel_visitor_step ON site_funnel_events(visitor_id, step_order);

COMMENT ON TABLE site_heatmap_clicks IS 'Click position tracking for heatmap visualization';
COMMENT ON TABLE site_user_journeys IS 'Complete user journey paths for flow analysis';
COMMENT ON TABLE site_abandonment_events IS 'Form and flow abandonment tracking';
COMMENT ON TABLE site_realtime_presence IS 'Real-time active user presence (5-minute window)';
COMMENT ON TABLE site_analytics_geo_daily IS 'Daily geographic breakdown of visitors';
COMMENT ON TABLE site_analytics_device_daily IS 'Daily device/browser breakdown';
