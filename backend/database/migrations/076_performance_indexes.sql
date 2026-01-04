-- =============================================================================
-- Migration: 076_performance_indexes.sql
-- Description: Add performance indexes for frequently queried columns
-- Date: 2026-01-02
-- Priority: HIGH - Addresses senior engineer audit findings
-- =============================================================================

-- =============================================================================
-- RATIONALE
-- =============================================================================
-- This migration adds indexes identified during the backend architecture audit.
-- These indexes optimize:
-- 1. Dashboard queries (jobs by status, assets by type)
-- 2. Time-based queries (created_at sorting, date range filters)
-- 3. Job processing queries (status lookups for workers)
-- 4. Analytics queries (aggregations by date)
--
-- Without these indexes, queries on large tables cause full table scans.

-- =============================================================================
-- SECTION 1: Status Column Indexes
-- =============================================================================
-- Job status is frequently filtered in dashboard and worker queries

-- Generation jobs status index (worker polling, dashboard filters)
-- Already exists from 001_initial_schema.sql but adding for completeness
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status 
ON generation_jobs(status);

-- Coach sessions status index (active session lookups)
CREATE INDEX IF NOT EXISTS idx_coach_sessions_status 
ON coach_sessions(status);

-- Subscriptions status index (billing queries)
CREATE INDEX IF NOT EXISTS idx_subscriptions_status 
ON subscriptions(status);

-- =============================================================================
-- SECTION 2: Created_at Column Indexes
-- =============================================================================
-- Time-based sorting is used in almost every list query

-- Users created_at (admin dashboards, user growth analytics)
CREATE INDEX IF NOT EXISTS idx_users_created_at 
ON users(created_at DESC);

-- Generation jobs created_at (job history, recent jobs)
CREATE INDEX IF NOT EXISTS idx_generation_jobs_created_at 
ON generation_jobs(created_at DESC);

-- Assets created_at (gallery sorting, recent assets)
CREATE INDEX IF NOT EXISTS idx_assets_created_at 
ON assets(created_at DESC);

-- Brand kits created_at (brand kit list sorting)
CREATE INDEX IF NOT EXISTS idx_brand_kits_created_at 
ON brand_kits(created_at DESC);

-- Coach sessions created_at (session history)
CREATE INDEX IF NOT EXISTS idx_coach_sessions_created_at 
ON coach_sessions(created_at DESC);

-- Auth tokens created_at (token cleanup, expiration queries)
CREATE INDEX IF NOT EXISTS idx_auth_tokens_created_at 
ON auth_tokens(created_at DESC);

-- =============================================================================
-- SECTION 3: Composite Indexes for Common Query Patterns
-- =============================================================================
-- These optimize specific query patterns identified in the codebase

-- Jobs by status and created_at (worker queue ordering)
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status_created 
ON generation_jobs(status, created_at DESC);

-- Assets by type and created_at (gallery filtering by type)
CREATE INDEX IF NOT EXISTS idx_assets_type_created 
ON assets(asset_type, created_at DESC);

-- Coach sessions by user and status (active session lookup)
CREATE INDEX IF NOT EXISTS idx_coach_sessions_user_status 
ON coach_sessions(user_id, status);

-- Auth tokens by type and expiration (cleanup queries)
CREATE INDEX IF NOT EXISTS idx_auth_tokens_type_expires 
ON auth_tokens(token_type, expires_at);

-- =============================================================================
-- SECTION 4: Partial Indexes for Hot Paths
-- =============================================================================
-- Partial indexes are smaller and faster for specific query patterns

-- Active/queued jobs only (worker polling)
CREATE INDEX IF NOT EXISTS idx_generation_jobs_active 
ON generation_jobs(created_at DESC) 
WHERE status IN ('queued', 'processing');

-- Active coach sessions only
CREATE INDEX IF NOT EXISTS idx_coach_sessions_active 
ON coach_sessions(user_id, created_at DESC) 
WHERE status = 'active';

-- Unexpired auth tokens only (validation queries)
CREATE INDEX IF NOT EXISTS idx_auth_tokens_valid 
ON auth_tokens(token_hash) 
WHERE used_at IS NULL AND expires_at > NOW();

-- Public assets only (community gallery)
CREATE INDEX IF NOT EXISTS idx_assets_public 
ON assets(created_at DESC) 
WHERE is_public = TRUE;

-- =============================================================================
-- SECTION 5: Analytics Tables Indexes
-- =============================================================================
-- Analytics queries often aggregate by date ranges

-- Analytics events by timestamp (time-range queries)
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp 
ON analytics_events(timestamp DESC);

-- Analytics events by category (category filtering)
CREATE INDEX IF NOT EXISTS idx_analytics_events_category 
ON analytics_events(category, timestamp DESC);

-- Analytics asset popularity by date (daily reports)
CREATE INDEX IF NOT EXISTS idx_analytics_asset_popularity_date 
ON analytics_asset_popularity(date DESC);

-- =============================================================================
-- SECTION 6: Intel Tables Indexes (if they exist)
-- =============================================================================
-- Intel v2 tables need indexes for trend queries

-- Conditional index creation for intel tables
DO $$
BEGIN
    -- Intel trends by category and date
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intel_trends') THEN
        CREATE INDEX IF NOT EXISTS idx_intel_trends_category_date 
        ON intel_trends(category_id, collected_at DESC);
    END IF;
    
    -- Intel videos by viral score (top performers)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intel_videos') THEN
        CREATE INDEX IF NOT EXISTS idx_intel_videos_viral_score 
        ON intel_videos(viral_score DESC NULLS LAST);
    END IF;
    
    -- Thumbnail intel by category and date
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'thumbnail_intel') THEN
        CREATE INDEX IF NOT EXISTS idx_thumbnail_intel_category_date 
        ON thumbnail_intel(category, analyzed_at DESC);
    END IF;
    
    -- Clip radar by user and date
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clip_radar_clips') THEN
        CREATE INDEX IF NOT EXISTS idx_clip_radar_user_date 
        ON clip_radar_clips(user_id, created_at DESC);
    END IF;
END $$;

-- =============================================================================
-- SECTION 7: Update Statistics
-- =============================================================================
-- Run ANALYZE to update table statistics after creating indexes

ANALYZE users;
ANALYZE generation_jobs;
ANALYZE assets;
ANALYZE brand_kits;
ANALYZE coach_sessions;
ANALYZE auth_tokens;
ANALYZE subscriptions;

-- Conditional ANALYZE for tables that may not exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
        ANALYZE analytics_events;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_asset_popularity') THEN
        ANALYZE analytics_asset_popularity;
    END IF;
END $$;

-- =============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- =============================================================================
-- Run these to verify indexes are being used:
--
-- EXPLAIN ANALYZE SELECT * FROM generation_jobs WHERE status = 'queued' ORDER BY created_at DESC LIMIT 10;
-- EXPLAIN ANALYZE SELECT * FROM assets WHERE user_id = 'xxx' ORDER BY created_at DESC LIMIT 20;
-- EXPLAIN ANALYZE SELECT * FROM coach_sessions WHERE user_id = 'xxx' AND status = 'active';
-- EXPLAIN ANALYZE SELECT * FROM auth_tokens WHERE token_hash = 'xxx' AND used_at IS NULL;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
