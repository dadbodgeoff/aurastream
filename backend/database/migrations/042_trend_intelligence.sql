-- ============================================================================
-- Migration 042: Trend Intelligence Tables
-- ============================================================================
-- 
-- Aggregates trending content from YouTube and Twitch, analyzes patterns using AI,
-- and delivers actionable insights to creators through a "Daily Brief" dashboard.
--
-- Tables:
--   - trend_youtube_snapshots: Daily YouTube trending snapshots
--   - trend_youtube_videos: Enriched YouTube video details
--   - trend_twitch_snapshots: 15-minute Twitch live snapshots
--   - trend_twitch_hourly: Hourly Twitch rollups for trend detection
--   - trend_thumbnail_analysis: AI thumbnail analysis cache
--   - trend_daily_briefs: Compiled daily insights
--   - trend_user_searches: Pro+ user search history and rate limiting
--   - trend_velocity_alerts: Studio tier velocity alerts
-- ============================================================================

-- ============================================================================
-- Step 1: YouTube Daily Snapshots (fetched once per day)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trend_youtube_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL,
    category TEXT NOT NULL,             -- 'gaming', 'entertainment', 'music', 'education'
    region TEXT DEFAULT 'US',
    
    -- Raw video data
    videos JSONB NOT NULL,              -- [{videoId, title, channelTitle, thumbnail, publishedAt}]
    
    -- Computed stats
    total_views BIGINT,
    total_likes BIGINT,
    avg_engagement_rate NUMERIC(5,2),
    
    -- Analysis results
    top_words JSONB,                    -- [{word, count, avgViews}]
    color_patterns JSONB,               -- [{color, frequency}]
    
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(snapshot_date, category, region)
);

-- ============================================================================
-- Step 2: YouTube Video Details (enriched data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trend_youtube_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id TEXT NOT NULL UNIQUE,
    snapshot_id UUID REFERENCES trend_youtube_snapshots(id) ON DELETE CASCADE,
    
    -- Basic info
    title TEXT NOT NULL,
    channel_id TEXT,
    channel_title TEXT,
    category TEXT,
    published_at TIMESTAMPTZ,
    
    -- Thumbnail
    thumbnail_url TEXT,
    thumbnail_analyzed BOOLEAN DEFAULT FALSE,
    
    -- Stats (at time of fetch)
    view_count BIGINT,
    like_count BIGINT,
    comment_count BIGINT,
    
    -- Computed metrics
    engagement_rate NUMERIC(5,2),       -- (likes + comments) / views * 100
    viral_score INTEGER,                -- 0-100 composite score
    velocity_score NUMERIC(8,2),        -- views per hour since publish
    
    -- Analysis results
    title_analysis JSONB,               -- {wordCount, hasNumber, hasEmoji, sentiment}
    thumbnail_analysis JSONB,           -- {hasFace, faceCount, dominantColors, hasText, composition}
    
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Step 3: Twitch Live Snapshots (every 15 minutes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trend_twitch_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Top streams at this moment
    top_streams JSONB NOT NULL,         -- [{userId, userName, gameId, gameName, viewerCount, thumbnail, title}]
    
    -- Top games at this moment
    top_games JSONB NOT NULL,           -- [{gameId, name, viewerCount, streamCount}]
    
    -- Aggregate stats
    total_viewers BIGINT,
    total_streams INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Step 4: Twitch Hourly Rollups (for trend detection)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trend_twitch_hourly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hour_start TIMESTAMPTZ NOT NULL,
    
    -- Game rankings with change
    game_rankings JSONB NOT NULL,       -- [{gameId, name, viewers, streams, rank, prevRank, change}]
    
    -- Rising streamers (biggest viewer gains)
    rising_streamers JSONB,             -- [{userId, userName, game, viewerGain, currentViewers}]
    
    -- Peak stats for the hour
    peak_total_viewers BIGINT,
    peak_stream_count INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(hour_start)
);

-- ============================================================================
-- Step 5: Thumbnail Analysis Cache
-- ============================================================================
CREATE TABLE IF NOT EXISTS trend_thumbnail_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Source reference
    source_type TEXT NOT NULL,          -- 'youtube', 'twitch'
    source_id TEXT NOT NULL,            -- videoId or streamId
    thumbnail_url TEXT NOT NULL,
    
    -- AI Analysis results (from Gemini Vision)
    has_face BOOLEAN,
    face_count INTEGER DEFAULT 0,
    face_emotions JSONB,                -- [{emotion, confidence}]
    
    has_text BOOLEAN,
    detected_text TEXT[],               -- Array of text found
    
    dominant_colors JSONB,              -- [{hex, percentage}]
    color_mood TEXT,                    -- 'warm', 'cool', 'neutral', 'vibrant'
    
    composition TEXT,                   -- 'centered', 'rule_of_thirds', 'left_heavy', 'right_heavy'
    complexity_score INTEGER,           -- 1-10 (simple to complex)
    
    -- Computed scores
    thumbnail_score INTEGER,            -- 0-100 predicted CTR score
    
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(source_type, source_id)
);

-- ============================================================================
-- Step 6: Daily Brief (compiled insights)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trend_daily_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brief_date DATE NOT NULL UNIQUE,
    
    -- Thumbnail of the day
    thumbnail_of_day JSONB,             -- {videoId, title, thumbnail, viralScore, whyItWorks}
    
    -- Platform highlights
    youtube_highlights JSONB,           -- [{videoId, title, thumbnail, views, insight}]
    twitch_highlights JSONB,            -- [{streamerId, name, game, peakViewers, insight}]
    
    -- Cross-platform insights
    hot_games JSONB,                    -- Games trending on both platforms
    rising_creators JSONB,              -- Creators gaining momentum
    
    -- AI-generated insights
    insights JSONB,                     -- [{category, insight, confidence}]
    
    -- Timing recommendations
    best_upload_times JSONB,            -- {gaming: {day, hour}, entertainment: {...}}
    best_stream_times JSONB,
    
    -- Pattern analysis
    title_patterns JSONB,               -- {topWords, avgLength, emojiUsage}
    thumbnail_patterns JSONB,           -- {facePercentage, avgColors, textUsage}
    
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Step 7: User Search History (for Pro+ rate limiting and caching)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trend_user_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    query TEXT NOT NULL,
    category TEXT,
    
    -- Cached results
    results JSONB,
    result_count INTEGER,
    
    -- Cache control
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Step 8: Velocity Alerts (for Studio tier)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trend_velocity_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    alert_type TEXT NOT NULL,           -- 'game_spike', 'video_viral', 'streamer_rising'
    platform TEXT NOT NULL,             -- 'youtube', 'twitch'
    
    -- What's spiking
    subject_id TEXT NOT NULL,           -- gameId, videoId, or userId
    subject_name TEXT NOT NULL,
    subject_thumbnail TEXT,
    
    -- Velocity data
    current_value BIGINT,               -- Current viewers/views
    previous_value BIGINT,              -- Value 1 hour ago
    change_percent NUMERIC(8,2),
    velocity_score NUMERIC(8,2),        -- Rate of change
    
    -- Alert metadata
    severity TEXT,                      -- 'low', 'medium', 'high', 'critical'
    insight TEXT,                       -- AI-generated explanation
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Step 9: Indexes
-- ============================================================================

-- YouTube snapshots indexes
CREATE INDEX idx_yt_snapshots_date ON trend_youtube_snapshots(snapshot_date);
CREATE INDEX idx_yt_snapshots_category ON trend_youtube_snapshots(category);

-- YouTube videos indexes
CREATE INDEX idx_yt_videos_video_id ON trend_youtube_videos(video_id);
CREATE INDEX idx_yt_videos_viral_score ON trend_youtube_videos(viral_score DESC);

-- Twitch snapshots indexes
CREATE INDEX idx_twitch_snapshots_time ON trend_twitch_snapshots(snapshot_time);

-- Twitch hourly indexes
CREATE INDEX idx_twitch_hourly_hour ON trend_twitch_hourly(hour_start);

-- Thumbnail analysis indexes
CREATE INDEX idx_thumbnail_source ON trend_thumbnail_analysis(source_type, source_id);

-- Daily briefs indexes
CREATE INDEX idx_daily_briefs_date ON trend_daily_briefs(brief_date);

-- User searches indexes
CREATE INDEX idx_user_searches_user ON trend_user_searches(user_id);
CREATE INDEX idx_user_searches_expires ON trend_user_searches(expires_at);

-- Velocity alerts indexes
CREATE INDEX idx_velocity_alerts_active ON trend_velocity_alerts(is_active, detected_at);

-- ============================================================================
-- Step 10: RLS Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE trend_youtube_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_twitch_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_twitch_hourly ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_thumbnail_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_daily_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_user_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_velocity_alerts ENABLE ROW LEVEL SECURITY;

-- Service role full access for all trend tables
CREATE POLICY "Service role full access youtube_snapshots" ON trend_youtube_snapshots
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access youtube_videos" ON trend_youtube_videos
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access twitch_snapshots" ON trend_twitch_snapshots
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access twitch_hourly" ON trend_twitch_hourly
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access thumbnail_analysis" ON trend_thumbnail_analysis
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access daily_briefs" ON trend_daily_briefs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access user_searches" ON trend_user_searches
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access velocity_alerts" ON trend_velocity_alerts
    FOR ALL USING (auth.role() = 'service_role');

-- Users can read public trend data (snapshots, videos, briefs)
CREATE POLICY "Authenticated users can read youtube_snapshots" ON trend_youtube_snapshots
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read youtube_videos" ON trend_youtube_videos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read twitch_snapshots" ON trend_twitch_snapshots
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read twitch_hourly" ON trend_twitch_hourly
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read thumbnail_analysis" ON trend_thumbnail_analysis
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read daily_briefs" ON trend_daily_briefs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Users can only access their own searches
CREATE POLICY "Users can read own searches" ON trend_user_searches
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own searches" ON trend_user_searches
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Velocity alerts are read-only for authenticated users
CREATE POLICY "Authenticated users can read velocity_alerts" ON trend_velocity_alerts
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- Step 11: Helper Functions
-- ============================================================================

-- Get latest daily brief
CREATE OR REPLACE FUNCTION get_latest_daily_brief()
RETURNS SETOF trend_daily_briefs AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM trend_daily_briefs
    ORDER BY brief_date DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Get trending YouTube videos by category
CREATE OR REPLACE FUNCTION get_trending_youtube_videos(
    p_category TEXT DEFAULT 'gaming',
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    video_id TEXT,
    title TEXT,
    channel_title TEXT,
    thumbnail_url TEXT,
    view_count BIGINT,
    like_count BIGINT,
    viral_score INTEGER,
    velocity_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.video_id,
        v.title,
        v.channel_title,
        v.thumbnail_url,
        v.view_count,
        v.like_count,
        v.viral_score,
        v.velocity_score
    FROM trend_youtube_videos v
    JOIN trend_youtube_snapshots s ON v.snapshot_id = s.id
    WHERE s.category = p_category
      AND s.snapshot_date = CURRENT_DATE
    ORDER BY v.viral_score DESC NULLS LAST
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get latest Twitch snapshot
CREATE OR REPLACE FUNCTION get_latest_twitch_snapshot()
RETURNS SETOF trend_twitch_snapshots AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM trend_twitch_snapshots
    ORDER BY snapshot_time DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Get user search count for rate limiting
CREATE OR REPLACE FUNCTION get_user_search_count_today(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    search_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO search_count
    FROM trend_user_searches
    WHERE user_id = p_user_id
      AND created_at >= CURRENT_DATE;
    
    RETURN COALESCE(search_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Get active velocity alerts
CREATE OR REPLACE FUNCTION get_active_velocity_alerts(
    p_platform TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    alert_type TEXT,
    platform TEXT,
    subject_id TEXT,
    subject_name TEXT,
    subject_thumbnail TEXT,
    current_value BIGINT,
    previous_value BIGINT,
    change_percent NUMERIC,
    velocity_score NUMERIC,
    severity TEXT,
    insight TEXT,
    detected_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.alert_type,
        a.platform,
        a.subject_id,
        a.subject_name,
        a.subject_thumbnail,
        a.current_value,
        a.previous_value,
        a.change_percent,
        a.velocity_score,
        a.severity,
        a.insight,
        a.detected_at
    FROM trend_velocity_alerts a
    WHERE a.is_active = TRUE
      AND (p_platform IS NULL OR a.platform = p_platform)
      AND (a.expires_at IS NULL OR a.expires_at > NOW())
    ORDER BY a.detected_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old trend data (for scheduled maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_trend_data(p_days_to_keep INTEGER DEFAULT 30)
RETURNS TABLE (
    youtube_snapshots_deleted BIGINT,
    twitch_snapshots_deleted BIGINT,
    twitch_hourly_deleted BIGINT,
    user_searches_deleted BIGINT,
    velocity_alerts_deleted BIGINT
) AS $$
DECLARE
    v_youtube_snapshots BIGINT;
    v_twitch_snapshots BIGINT;
    v_twitch_hourly BIGINT;
    v_user_searches BIGINT;
    v_velocity_alerts BIGINT;
BEGIN
    -- Delete old YouTube snapshots (cascades to videos)
    WITH deleted AS (
        DELETE FROM trend_youtube_snapshots
        WHERE snapshot_date < CURRENT_DATE - p_days_to_keep
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_youtube_snapshots FROM deleted;
    
    -- Delete old Twitch snapshots
    WITH deleted AS (
        DELETE FROM trend_twitch_snapshots
        WHERE snapshot_time < NOW() - (p_days_to_keep || ' days')::INTERVAL
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_twitch_snapshots FROM deleted;
    
    -- Delete old Twitch hourly rollups
    WITH deleted AS (
        DELETE FROM trend_twitch_hourly
        WHERE hour_start < NOW() - (p_days_to_keep || ' days')::INTERVAL
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_twitch_hourly FROM deleted;
    
    -- Delete expired user searches
    WITH deleted AS (
        DELETE FROM trend_user_searches
        WHERE expires_at < NOW()
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_user_searches FROM deleted;
    
    -- Delete old/expired velocity alerts
    WITH deleted AS (
        DELETE FROM trend_velocity_alerts
        WHERE (expires_at IS NOT NULL AND expires_at < NOW())
           OR detected_at < NOW() - (p_days_to_keep || ' days')::INTERVAL
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_velocity_alerts FROM deleted;
    
    RETURN QUERY SELECT 
        v_youtube_snapshots,
        v_twitch_snapshots,
        v_twitch_hourly,
        v_user_searches,
        v_velocity_alerts;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Migration Complete
-- ============================================================================
