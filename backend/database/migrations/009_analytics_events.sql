-- ============================================================================
-- Migration 009: Analytics Events Table for Long-term Storage
-- ============================================================================
-- 
-- This migration creates a PostgreSQL table for persistent analytics storage.
-- Events are flushed from Redis hourly to enable long-term SQL reporting.
-- 
-- Key Features:
-- - Stores aggregated event counts by name, category, and asset type
-- - Enables "Most Popular Asset Types" reporting
-- - Partitioned by date for efficient querying and cleanup
-- ============================================================================

-- ============================================================================
-- Step 1: Create analytics_events table
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL,
    event_category TEXT NOT NULL,
    asset_type TEXT,
    event_count INTEGER DEFAULT 1,
    unique_sessions INTEGER DEFAULT 1,
    unique_users INTEGER DEFAULT 0,
    hour_bucket TIMESTAMPTZ NOT NULL,  -- Rounded to hour for aggregation
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE analytics_events IS 'Aggregated analytics events flushed from Redis hourly';
COMMENT ON COLUMN analytics_events.hour_bucket IS 'Hour bucket for time-series aggregation';
COMMENT ON COLUMN analytics_events.event_count IS 'Total event count for this hour bucket';

-- ============================================================================
-- Step 2: Create analytics_asset_popularity table for quick reporting
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_asset_popularity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_type TEXT NOT NULL,
    generation_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    date_bucket DATE NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (asset_type, date_bucket)
);

COMMENT ON TABLE analytics_asset_popularity IS 'Daily aggregated asset type popularity for reporting';

-- ============================================================================
-- Step 3: Create indexes for efficient querying
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_analytics_events_hour_bucket 
    ON analytics_events(hour_bucket);

CREATE INDEX IF NOT EXISTS idx_analytics_events_category 
    ON analytics_events(event_category);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name 
    ON analytics_events(event_name);

CREATE INDEX IF NOT EXISTS idx_analytics_events_asset_type 
    ON analytics_events(asset_type) 
    WHERE asset_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_asset_popularity_date 
    ON analytics_asset_popularity(date_bucket);

CREATE INDEX IF NOT EXISTS idx_analytics_asset_popularity_type 
    ON analytics_asset_popularity(asset_type);

-- ============================================================================
-- Step 4: Create function to get most popular asset types
-- ============================================================================
CREATE OR REPLACE FUNCTION get_popular_asset_types(
    p_days INTEGER DEFAULT 30,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    asset_type TEXT,
    total_generations BIGINT,
    total_views BIGINT,
    total_shares BIGINT,
    popularity_score BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aap.asset_type,
        SUM(aap.generation_count)::BIGINT as total_generations,
        SUM(aap.view_count)::BIGINT as total_views,
        SUM(aap.share_count)::BIGINT as total_shares,
        (SUM(aap.generation_count) * 3 + SUM(aap.view_count) + SUM(aap.share_count) * 2)::BIGINT as popularity_score
    FROM analytics_asset_popularity aap
    WHERE aap.date_bucket >= CURRENT_DATE - p_days
    GROUP BY aap.asset_type
    ORDER BY popularity_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_popular_asset_types IS 'Returns most popular asset types based on weighted score';

-- ============================================================================
-- Step 5: Create function to upsert asset popularity
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_asset_popularity(
    p_asset_type TEXT,
    p_generation_count INTEGER DEFAULT 0,
    p_view_count INTEGER DEFAULT 0,
    p_share_count INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO analytics_asset_popularity (asset_type, generation_count, view_count, share_count, date_bucket)
    VALUES (p_asset_type, p_generation_count, p_view_count, p_share_count, CURRENT_DATE)
    ON CONFLICT (asset_type, date_bucket)
    DO UPDATE SET
        generation_count = analytics_asset_popularity.generation_count + EXCLUDED.generation_count,
        view_count = analytics_asset_popularity.view_count + EXCLUDED.view_count,
        share_count = analytics_asset_popularity.share_count + EXCLUDED.share_count,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION upsert_asset_popularity IS 'Upserts asset popularity counts for the current day';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- 
-- After this migration:
-- - analytics_events: Stores hourly aggregated events from Redis
-- - analytics_asset_popularity: Stores daily asset type popularity
-- - get_popular_asset_types(): Returns most popular asset types
-- - upsert_asset_popularity(): Updates popularity counts
-- 
-- The analytics service should flush Redis data hourly using these tables.
-- ============================================================================

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (Manual)
-- ============================================================================
-- DROP FUNCTION IF EXISTS upsert_asset_popularity;
-- DROP FUNCTION IF EXISTS get_popular_asset_types;
-- DROP TABLE IF EXISTS analytics_asset_popularity;
-- DROP TABLE IF EXISTS analytics_events;
-- ============================================================================
