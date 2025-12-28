-- Migration: 026_vibe_analysis_cache.sql
-- Description: Cache table for vibe branding analysis results
-- Created: 2025-01-01
-- Purpose: Cache Gemini Vision analysis results for 24 hours to reduce API calls

-- ============================================================================
-- TABLE CREATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS vibe_analysis_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_hash TEXT UNIQUE NOT NULL,
    analysis JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

COMMENT ON TABLE vibe_analysis_cache IS 'Caches vibe branding analysis results for 24 hours to reduce Gemini API calls';
COMMENT ON COLUMN vibe_analysis_cache.image_hash IS 'SHA256 hash of the analyzed image';
COMMENT ON COLUMN vibe_analysis_cache.analysis IS 'Full JSON analysis result from Gemini Vision';
COMMENT ON COLUMN vibe_analysis_cache.expires_at IS 'Cache entries expire after 24 hours';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for fast lookups by image hash
CREATE INDEX IF NOT EXISTS idx_vibe_cache_hash ON vibe_analysis_cache(image_hash);

-- Index for efficient cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_vibe_cache_expires ON vibe_analysis_cache(expires_at);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Cleanup function to remove expired cache entries
-- Should be called periodically via cron job or scheduled task
CREATE OR REPLACE FUNCTION cleanup_vibe_cache()
RETURNS void AS $func$
BEGIN
    DELETE FROM vibe_analysis_cache WHERE expires_at < NOW();
END;
$func$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_vibe_cache() IS 'Removes expired vibe analysis cache entries - call periodically via cron';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE vibe_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Service role full access (for backend operations)
-- Cache is managed entirely by the backend service, not by individual users
DROP POLICY IF EXISTS vibe_analysis_cache_service_role ON vibe_analysis_cache;
CREATE POLICY vibe_analysis_cache_service_role ON vibe_analysis_cache
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
