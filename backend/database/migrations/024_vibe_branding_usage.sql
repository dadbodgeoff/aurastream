-- Migration: 024_vibe_branding_usage.sql
-- Description: Vibe Branding usage tracking - adds monthly analysis counter to users table
-- Created: 2025-01-01
-- Purpose: Track how many vibe analyses each user performs per month for usage limits

-- ============================================================================
-- COLUMN ADDITIONS
-- ============================================================================

-- Add vibe analyses counter to users table
-- Tracks the number of vibe branding analyses performed in the current month
ALTER TABLE users ADD COLUMN IF NOT EXISTS vibe_analyses_this_month INTEGER DEFAULT 0;

COMMENT ON COLUMN users.vibe_analyses_this_month IS 'Number of vibe branding analyses performed in the current billing month';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for efficient monthly reset queries
-- Only indexes users who have performed analyses (sparse index)
CREATE INDEX IF NOT EXISTS idx_users_vibe_analyses 
    ON users(vibe_analyses_this_month) 
    WHERE vibe_analyses_this_month > 0;

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Function to increment vibe analyses counter for a user
-- Called when a user performs a vibe branding analysis
CREATE OR REPLACE FUNCTION increment_vibe_analyses(p_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET vibe_analyses_this_month = vibe_analyses_this_month + 1,
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_vibe_analyses(UUID) IS 'Increments the vibe analyses counter for a user when they perform an analysis';

-- Function to reset all vibe analyses counters
-- Called by monthly cron job at the start of each billing period
CREATE OR REPLACE FUNCTION reset_monthly_vibe_analyses()
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET vibe_analyses_this_month = 0,
        updated_at = NOW()
    WHERE vibe_analyses_this_month > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_monthly_vibe_analyses() IS 'Resets all vibe analyses counters to 0 - called by monthly cron job';
