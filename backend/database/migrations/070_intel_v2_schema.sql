-- Migration: 070_intel_v2_schema.sql
-- Creator Intel V2 - Enterprise-grade schema
-- Created: 2026-01-02

-- ============================================================================
-- HOURLY METRICS (Warm Tier - 7 day retention)
-- ============================================================================

CREATE TABLE IF NOT EXISTS intel_hourly_metrics (
    id BIGSERIAL PRIMARY KEY,
    category_key TEXT NOT NULL,
    hour_start TIMESTAMPTZ NOT NULL,
    
    -- Video metrics
    video_count INTEGER NOT NULL DEFAULT 0,
    avg_views FLOAT NOT NULL DEFAULT 0,
    avg_engagement FLOAT NOT NULL DEFAULT 0,
    total_views BIGINT NOT NULL DEFAULT 0,
    
    -- Viral metrics
    viral_count INTEGER NOT NULL DEFAULT 0,
    rising_count INTEGER NOT NULL DEFAULT 0,
    avg_velocity FLOAT NOT NULL DEFAULT 0,
    max_velocity FLOAT NOT NULL DEFAULT 0,
    
    -- Format metrics
    shorts_count INTEGER NOT NULL DEFAULT 0,
    shorts_avg_views FLOAT NOT NULL DEFAULT 0,
    longform_count INTEGER NOT NULL DEFAULT 0,
    longform_avg_views FLOAT NOT NULL DEFAULT 0,
    
    -- Duration metrics
    avg_duration_seconds FLOAT NOT NULL DEFAULT 0,
    optimal_duration_bucket TEXT,
    
    -- Regional metrics
    language_distribution JSONB NOT NULL DEFAULT '{}',
    dominant_language TEXT NOT NULL DEFAULT 'en',
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT intel_hourly_unique UNIQUE (category_key, hour_start)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_intel_hourly_category_time 
    ON intel_hourly_metrics (category_key, hour_start DESC);

CREATE INDEX IF NOT EXISTS idx_intel_hourly_time 
    ON intel_hourly_metrics (hour_start DESC);


-- ============================================================================
-- DAILY METRICS (Cold Tier - 90 day retention)
-- ============================================================================

CREATE TABLE IF NOT EXISTS intel_daily_metrics (
    id BIGSERIAL PRIMARY KEY,
    category_key TEXT NOT NULL,
    date DATE NOT NULL,
    
    -- Aggregated metrics
    total_videos_seen INTEGER NOT NULL DEFAULT 0,
    peak_viral_count INTEGER NOT NULL DEFAULT 0,
    avg_viral_count FLOAT NOT NULL DEFAULT 0,
    
    -- Trend indicators (% change from previous day)
    views_trend FLOAT NOT NULL DEFAULT 0,
    viral_trend FLOAT NOT NULL DEFAULT 0,
    engagement_trend FLOAT NOT NULL DEFAULT 0,
    
    -- Time analysis
    best_hour_utc INTEGER,
    worst_hour_utc INTEGER,
    peak_views_hour_utc INTEGER,
    
    -- Format insights
    shorts_performance_ratio FLOAT NOT NULL DEFAULT 1.0,
    optimal_duration_range TEXT,
    
    -- Regional insights
    dominant_language TEXT NOT NULL DEFAULT 'en',
    language_diversity_score FLOAT NOT NULL DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT intel_daily_unique UNIQUE (category_key, date)
);

CREATE INDEX IF NOT EXISTS idx_intel_daily_category_date 
    ON intel_daily_metrics (category_key, date DESC);

CREATE INDEX IF NOT EXISTS idx_intel_daily_date 
    ON intel_daily_metrics (date DESC);


-- ============================================================================
-- DURATION PERFORMANCE (Detailed duration analysis)
-- ============================================================================

CREATE TABLE IF NOT EXISTS intel_duration_performance (
    id BIGSERIAL PRIMARY KEY,
    category_key TEXT NOT NULL,
    date DATE NOT NULL,
    
    -- Duration bucket
    bucket_label TEXT NOT NULL,
    bucket_min_seconds INTEGER NOT NULL,
    bucket_max_seconds INTEGER NOT NULL,
    
    -- Performance metrics
    video_count INTEGER NOT NULL DEFAULT 0,
    avg_views FLOAT NOT NULL DEFAULT 0,
    avg_engagement FLOAT NOT NULL DEFAULT 0,
    total_views BIGINT NOT NULL DEFAULT 0,
    performance_index FLOAT NOT NULL DEFAULT 1.0,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT intel_duration_unique UNIQUE (category_key, date, bucket_label)
);

CREATE INDEX IF NOT EXISTS idx_intel_duration_category_date 
    ON intel_duration_performance (category_key, date DESC);


-- ============================================================================
-- REGIONAL PERFORMANCE (Language/region analysis)
-- ============================================================================

CREATE TABLE IF NOT EXISTS intel_regional_performance (
    id BIGSERIAL PRIMARY KEY,
    category_key TEXT NOT NULL,
    date DATE NOT NULL,
    language_code TEXT NOT NULL,
    
    -- YouTube metrics
    youtube_video_count INTEGER NOT NULL DEFAULT 0,
    youtube_avg_views FLOAT NOT NULL DEFAULT 0,
    youtube_total_views BIGINT NOT NULL DEFAULT 0,
    
    -- Twitch metrics
    twitch_stream_count INTEGER NOT NULL DEFAULT 0,
    twitch_avg_viewers FLOAT NOT NULL DEFAULT 0,
    twitch_total_viewers BIGINT NOT NULL DEFAULT 0,
    
    -- Derived scores
    competition_score FLOAT NOT NULL DEFAULT 50,
    opportunity_score FLOAT NOT NULL DEFAULT 50,
    market_share_percent FLOAT NOT NULL DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT intel_regional_unique UNIQUE (category_key, date, language_code)
);

CREATE INDEX IF NOT EXISTS idx_intel_regional_category_date 
    ON intel_regional_performance (category_key, date DESC);


-- ============================================================================
-- PREMIERE PERFORMANCE (Live stream timing analysis)
-- ============================================================================

CREATE TABLE IF NOT EXISTS intel_premiere_performance (
    id BIGSERIAL PRIMARY KEY,
    category_key TEXT NOT NULL,
    date DATE NOT NULL,
    
    -- Premiere vs instant
    premiere_count INTEGER NOT NULL DEFAULT 0,
    instant_count INTEGER NOT NULL DEFAULT 0,
    premiere_avg_views FLOAT NOT NULL DEFAULT 0,
    instant_avg_views FLOAT NOT NULL DEFAULT 0,
    performance_ratio FLOAT NOT NULL DEFAULT 1.0,
    
    -- Best times (JSONB array of {hour_utc, day_of_week, performance_index})
    best_times JSONB NOT NULL DEFAULT '[]',
    worst_times JSONB NOT NULL DEFAULT '[]',
    
    -- Schedule adherence
    avg_delay_seconds FLOAT NOT NULL DEFAULT 0,
    on_time_percent FLOAT NOT NULL DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT intel_premiere_unique UNIQUE (category_key, date)
);

CREATE INDEX IF NOT EXISTS idx_intel_premiere_category_date 
    ON intel_premiere_performance (category_key, date DESC);


-- ============================================================================
-- WORKER STATE (Orchestrator persistence)
-- ============================================================================

CREATE TABLE IF NOT EXISTS intel_worker_state (
    id SERIAL PRIMARY KEY,
    task_name TEXT NOT NULL UNIQUE,
    last_run TIMESTAMPTZ,
    last_success TIMESTAMPTZ,
    last_error TEXT,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- QUOTA TRACKING (API quota management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS intel_quota_log (
    id BIGSERIAL PRIMARY KEY,
    platform TEXT NOT NULL,  -- 'youtube', 'twitch'
    operation TEXT NOT NULL,
    units_used INTEGER NOT NULL,
    units_remaining INTEGER NOT NULL,
    category_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intel_quota_platform_time 
    ON intel_quota_log (platform, created_at DESC);


-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get trending categories
CREATE OR REPLACE FUNCTION get_trending_categories(
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    category_key TEXT,
    avg_viral_count FLOAT,
    views_trend FLOAT,
    opportunity_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.category_key,
        AVG(d.avg_viral_count) as avg_viral_count,
        AVG(d.views_trend) as views_trend,
        AVG(d.avg_viral_count * 10 + GREATEST(d.views_trend, 0)) as opportunity_score
    FROM intel_daily_metrics d
    WHERE d.date >= CURRENT_DATE - p_days
    GROUP BY d.category_key
    ORDER BY opportunity_score DESC;
END;
$$ LANGUAGE plpgsql;


-- Function to get optimal duration for a category
CREATE OR REPLACE FUNCTION get_optimal_duration(
    p_category_key TEXT,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    bucket_label TEXT,
    avg_performance_index FLOAT,
    total_videos INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dp.bucket_label,
        AVG(dp.performance_index) as avg_performance_index,
        SUM(dp.video_count)::INTEGER as total_videos
    FROM intel_duration_performance dp
    WHERE dp.category_key = p_category_key
    AND dp.date >= CURRENT_DATE - p_days
    GROUP BY dp.bucket_label
    HAVING SUM(dp.video_count) >= 5
    ORDER BY avg_performance_index DESC;
END;
$$ LANGUAGE plpgsql;


-- Function to get regional opportunities
CREATE OR REPLACE FUNCTION get_regional_opportunities(
    p_category_key TEXT,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    language_code TEXT,
    avg_opportunity_score FLOAT,
    avg_competition_score FLOAT,
    total_videos INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rp.language_code,
        AVG(rp.opportunity_score) as avg_opportunity_score,
        AVG(rp.competition_score) as avg_competition_score,
        SUM(rp.youtube_video_count)::INTEGER as total_videos
    FROM intel_regional_performance rp
    WHERE rp.category_key = p_category_key
    AND rp.date >= CURRENT_DATE - p_days
    GROUP BY rp.language_code
    ORDER BY avg_opportunity_score DESC;
END;
$$ LANGUAGE plpgsql;


-- Function to cleanup old data
CREATE OR REPLACE FUNCTION cleanup_intel_data()
RETURNS void AS $$
BEGIN
    -- Cleanup hourly (7 days)
    DELETE FROM intel_hourly_metrics 
    WHERE hour_start < NOW() - INTERVAL '7 days';
    
    -- Cleanup daily (90 days)
    DELETE FROM intel_daily_metrics 
    WHERE date < CURRENT_DATE - 90;
    
    -- Cleanup duration (90 days)
    DELETE FROM intel_duration_performance 
    WHERE date < CURRENT_DATE - 90;
    
    -- Cleanup regional (90 days)
    DELETE FROM intel_regional_performance 
    WHERE date < CURRENT_DATE - 90;
    
    -- Cleanup premiere (90 days)
    DELETE FROM intel_premiere_performance 
    WHERE date < CURRENT_DATE - 90;
    
    -- Cleanup quota log (30 days)
    DELETE FROM intel_quota_log 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE intel_hourly_metrics IS 'Hourly aggregated metrics for creator intel (7 day retention)';
COMMENT ON TABLE intel_daily_metrics IS 'Daily aggregated metrics for creator intel (90 day retention)';
COMMENT ON TABLE intel_duration_performance IS 'Duration bucket performance analysis';
COMMENT ON TABLE intel_regional_performance IS 'Regional/language performance analysis';
COMMENT ON TABLE intel_premiere_performance IS 'Premiere timing and scheduling analysis';
COMMENT ON TABLE intel_worker_state IS 'Orchestrator task state persistence';
COMMENT ON TABLE intel_quota_log IS 'API quota usage tracking';
