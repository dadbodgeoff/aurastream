-- =============================================================================
-- Migration: 013_rls_indexes.sql
-- Description: Add indexes for RLS policy performance optimization
-- Date: 2025-12-27
-- =============================================================================

-- =============================================================================
-- RLS Performance Indexes
-- =============================================================================
-- These indexes optimize RLS policy evaluation by ensuring fast lookups
-- on columns used in auth.uid() comparisons. Without these indexes,
-- RLS policies cause full table scans on every query.
--
-- Best Practice: Every column used in an RLS policy WHERE clause
-- should have an index.

-- Brand Kits - user_id used in RLS policy
CREATE INDEX IF NOT EXISTS idx_brand_kits_user_id 
ON brand_kits(user_id);

-- Generation Jobs - user_id used in RLS policy
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_id 
ON generation_jobs(user_id);

-- Assets - user_id used in RLS policy
CREATE INDEX IF NOT EXISTS idx_assets_user_id 
ON assets(user_id);

-- Subscriptions - user_id used in RLS policy
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id 
ON subscriptions(user_id);

-- Subscription Events - user_id used in RLS policy
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id 
ON subscription_events(user_id);

-- Auth Tokens - user_id used in RLS policy
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id 
ON auth_tokens(user_id);

-- Coach Sessions - user_id used in RLS policy
CREATE INDEX IF NOT EXISTS idx_coach_sessions_user_id 
ON coach_sessions(user_id);

-- Platform Connections - user_id used in RLS policy
CREATE INDEX IF NOT EXISTS idx_platform_connections_user_id 
ON platform_connections(user_id);

-- =============================================================================
-- Composite Indexes for Common Query Patterns
-- =============================================================================
-- These indexes optimize frequently-used query patterns that combine
-- user_id with other filter columns.

-- Jobs by user and status (dashboard job list with status filter)
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_status 
ON generation_jobs(user_id, status);

-- Jobs by user ordered by creation (dashboard job list)
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_created 
ON generation_jobs(user_id, created_at DESC);

-- Assets by user and type (gallery with type filter)
CREATE INDEX IF NOT EXISTS idx_assets_user_type 
ON assets(user_id, asset_type);

-- Assets by user ordered by creation (gallery list)
CREATE INDEX IF NOT EXISTS idx_assets_user_created 
ON assets(user_id, created_at DESC);

-- Brand kits by user with active flag (get active brand kit)
CREATE INDEX IF NOT EXISTS idx_brand_kits_user_active 
ON brand_kits(user_id, is_active) WHERE is_active = true;

-- =============================================================================
-- Webhook Lookup Indexes
-- =============================================================================
-- These indexes optimize Stripe webhook processing which looks up
-- records by Stripe IDs rather than user_id.

-- Subscriptions by stripe_subscription_id (webhook lookups)
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id 
ON subscriptions(stripe_subscription_id);

-- Subscriptions by stripe_customer_id (customer portal lookups)
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id 
ON subscriptions(stripe_customer_id);

-- Subscription events by stripe_event_id (idempotency checks)
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_event_id 
ON subscription_events(stripe_event_id);

-- =============================================================================
-- Update Statistics
-- =============================================================================
-- Run ANALYZE to update table statistics after creating indexes.
-- This helps the query planner make better decisions.

ANALYZE brand_kits;
ANALYZE generation_jobs;
ANALYZE assets;
ANALYZE subscriptions;
ANALYZE subscription_events;
ANALYZE auth_tokens;
ANALYZE coach_sessions;
ANALYZE platform_connections;

-- =============================================================================
-- Notes
-- =============================================================================
-- 1. All indexes use IF NOT EXISTS for idempotent migrations
-- 2. Composite indexes are ordered with user_id first for RLS optimization
-- 3. Partial indexes (WHERE clause) are used where appropriate
-- 4. ANALYZE updates statistics for query planner optimization
--
-- To verify indexes are being used, run EXPLAIN ANALYZE on queries:
-- EXPLAIN ANALYZE SELECT * FROM assets WHERE user_id = 'xxx';
