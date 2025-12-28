-- =============================================================================
-- Fix Site Analytics - Safe to re-run
-- Updates functions only (CREATE OR REPLACE is idempotent)
-- =============================================================================

-- Check if we have any data in the raw tables
DO $$
DECLARE
    visitor_count INT;
    session_count INT;
    pageview_count INT;
BEGIN
    SELECT COUNT(*) INTO visitor_count FROM site_visitors;
    SELECT COUNT(*) INTO session_count FROM site_sessions;
    SELECT COUNT(*) INTO pageview_count FROM site_page_views;
    
    RAISE NOTICE 'Current data: % visitors, % sessions, % page views', 
        visitor_count, session_count, pageview_count;
END $$;

-- Recreate the helper functions (safe to re-run)
CREATE OR REPLACE FUNCTION increment_session_pages(p_session_id VARCHAR(64))
RETURNS VOID AS $$
BEGIN
    UPDATE site_sessions 
    SET pages_viewed = pages_viewed + 1
    WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

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

-- Recreate aggregation function
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

-- Run aggregation for today
SELECT aggregate_daily_analytics(CURRENT_DATE);

-- Show what's in the daily table now
SELECT * FROM site_analytics_daily ORDER BY date DESC LIMIT 5;
