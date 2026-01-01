    -- Clip Radar Daily Recaps
    -- Stores compressed daily summaries of viral clips for historical viewing

    -- Daily recap table - one row per day
    CREATE TABLE IF NOT EXISTS clip_radar_daily_recaps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recap_date DATE NOT NULL UNIQUE,
        
        -- Summary stats
        total_clips_tracked INTEGER NOT NULL DEFAULT 0,
        total_viral_clips INTEGER NOT NULL DEFAULT 0,
        total_views_tracked BIGINT NOT NULL DEFAULT 0,
        peak_velocity FLOAT NOT NULL DEFAULT 0,
        
        -- Top clips across all categories (JSON array, max 10)
        top_clips JSONB NOT NULL DEFAULT '[]',
        
        -- Per-category breakdown (JSON object keyed by game_id)
        category_stats JSONB NOT NULL DEFAULT '{}',
        
        -- Metadata
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        polls_count INTEGER NOT NULL DEFAULT 0,
        first_poll_at TIMESTAMPTZ,
        last_poll_at TIMESTAMPTZ
    );

    -- Index for date lookups
    CREATE INDEX IF NOT EXISTS idx_clip_radar_recaps_date ON clip_radar_daily_recaps(recap_date DESC);

    -- Top clips per category per day (for detailed category views)
    CREATE TABLE IF NOT EXISTS clip_radar_category_recaps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recap_date DATE NOT NULL,
        game_id TEXT NOT NULL,
        game_name TEXT NOT NULL,
        
        -- Category stats for the day
        total_clips INTEGER NOT NULL DEFAULT 0,
        total_views BIGINT NOT NULL DEFAULT 0,
        viral_clips_count INTEGER NOT NULL DEFAULT 0,
        avg_velocity FLOAT NOT NULL DEFAULT 0,
        peak_velocity FLOAT NOT NULL DEFAULT 0,
        
        -- Top 5 clips for this category (JSON array)
        top_clips JSONB NOT NULL DEFAULT '[]',
        
        -- Hourly activity (24 entries showing clips/views per hour)
        hourly_activity JSONB NOT NULL DEFAULT '[]',
        
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        
        UNIQUE(recap_date, game_id)
    );

    -- Indexes for category recaps
    CREATE INDEX IF NOT EXISTS idx_clip_radar_category_recaps_date ON clip_radar_category_recaps(recap_date DESC);
    CREATE INDEX IF NOT EXISTS idx_clip_radar_category_recaps_game ON clip_radar_category_recaps(game_id, recap_date DESC);

    -- Enable RLS
    ALTER TABLE clip_radar_daily_recaps ENABLE ROW LEVEL SECURITY;
    ALTER TABLE clip_radar_category_recaps ENABLE ROW LEVEL SECURITY;

    -- Public read access (no auth required for viewing recaps)
    CREATE POLICY "Public read access for daily recaps"
        ON clip_radar_daily_recaps FOR SELECT
        USING (true);

    CREATE POLICY "Public read access for category recaps"
        ON clip_radar_category_recaps FOR SELECT
        USING (true);

    -- Service role full access
    CREATE POLICY "Service role full access for daily recaps"
        ON clip_radar_daily_recaps FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);

    CREATE POLICY "Service role full access for category recaps"
        ON clip_radar_category_recaps FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);

    COMMENT ON TABLE clip_radar_daily_recaps IS 'Compressed daily summaries of clip radar data';
    COMMENT ON TABLE clip_radar_category_recaps IS 'Per-category daily clip summaries';
