-- ============================================================================
-- Migration: 011_subscriptions.sql
-- Version: 1.0.0
-- Description: Stripe subscription management tables with audit trail
-- Date: 2025
-- 
-- This migration creates the subscription management infrastructure:
-- - subscriptions: Core subscription data linked to Stripe
-- - subscription_events: Audit trail for subscription changes
-- - Required indexes for query performance
-- - RLS policies for data isolation
-- - Triggers for automatic timestamp updates
--
-- Note: This migration drops and recreates the subscriptions table from
-- 001_initial_schema.sql with a new structure optimized for Stripe integration.
--
-- Compatible with: PostgreSQL 14+ / Supabase
-- ============================================================================

-- ============================================================================
-- SECTION 1: DROP EXISTING SUBSCRIPTIONS TABLE
-- Remove the old subscriptions table structure from 001_initial_schema.sql
-- ============================================================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;

-- Drop existing policies
DROP POLICY IF EXISTS subscriptions_select_own ON subscriptions;

-- Drop the old table (CASCADE will handle dependent objects)
DROP TABLE IF EXISTS subscriptions CASCADE;

-- ============================================================================
-- SECTION 2: TABLES
-- Tables are ordered to handle foreign key dependencies correctly
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 Subscriptions Table
-- Core subscription data linked to Stripe for billing management
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    stripe_price_id TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('pro', 'studio')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one subscription per user
    CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

COMMENT ON TABLE subscriptions IS 'Stripe subscription data for paid tier users (pro, studio)';
COMMENT ON COLUMN subscriptions.user_id IS 'Reference to the user who owns this subscription';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Unique Stripe subscription identifier (sub_xxx)';
COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'Stripe customer identifier (cus_xxx)';
COMMENT ON COLUMN subscriptions.stripe_price_id IS 'Stripe price identifier for the subscription plan (price_xxx)';
COMMENT ON COLUMN subscriptions.tier IS 'Subscription tier: pro or studio (free users have no subscription record)';
COMMENT ON COLUMN subscriptions.status IS 'Current subscription status synced from Stripe';
COMMENT ON COLUMN subscriptions.current_period_start IS 'Start of the current billing period';
COMMENT ON COLUMN subscriptions.current_period_end IS 'End of the current billing period';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at period end';

-- ----------------------------------------------------------------------------
-- 2.2 Subscription Events Table
-- Audit trail for all subscription changes from Stripe webhooks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    stripe_event_id TEXT UNIQUE NOT NULL,
    old_tier TEXT,
    new_tier TEXT,
    old_status TEXT,
    new_status TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE subscription_events IS 'Audit trail for subscription lifecycle events from Stripe webhooks';
COMMENT ON COLUMN subscription_events.subscription_id IS 'Reference to subscription (NULL if subscription was deleted)';
COMMENT ON COLUMN subscription_events.user_id IS 'Reference to user for historical tracking even if subscription deleted';
COMMENT ON COLUMN subscription_events.event_type IS 'Stripe event type (e.g., customer.subscription.created, updated, deleted)';
COMMENT ON COLUMN subscription_events.stripe_event_id IS 'Unique Stripe event identifier for idempotency (evt_xxx)';
COMMENT ON COLUMN subscription_events.old_tier IS 'Previous subscription tier before change';
COMMENT ON COLUMN subscription_events.new_tier IS 'New subscription tier after change';
COMMENT ON COLUMN subscription_events.old_status IS 'Previous subscription status before change';
COMMENT ON COLUMN subscription_events.new_status IS 'New subscription status after change';
COMMENT ON COLUMN subscription_events.metadata IS 'Additional event metadata from Stripe webhook payload';

-- ============================================================================
-- SECTION 3: INDEXES
-- Performance indexes for common query patterns
-- ============================================================================

-- Subscriptions table indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id 
    ON subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id 
    ON subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status 
    ON subscriptions(status);

-- Subscription events table indexes
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id 
    ON subscription_events(user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_event_id 
    ON subscription_events(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at 
    ON subscription_events(created_at);

-- ============================================================================
-- SECTION 4: TRIGGERS
-- Automatic timestamp updates for updated_at columns
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 Subscriptions Table Trigger
-- Uses the existing update_updated_at_column() function from 001_initial_schema.sql
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 5: ROW LEVEL SECURITY (RLS)
-- Data isolation policies ensuring users can only access their own data
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1 Enable RLS on Tables
-- ----------------------------------------------------------------------------
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 5.2 Subscriptions Table Policies
-- Users can only view their own subscription
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS subscriptions_select_own ON subscriptions;
CREATE POLICY subscriptions_select_own ON subscriptions 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Service role has full access for webhook processing
DROP POLICY IF EXISTS subscriptions_service_all ON subscriptions;
CREATE POLICY subscriptions_service_all ON subscriptions 
    FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- 5.3 Subscription Events Table Policies
-- Users can only view their own subscription events
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS subscription_events_select_own ON subscription_events;
CREATE POLICY subscription_events_select_own ON subscription_events 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Service role has full access for webhook processing
DROP POLICY IF EXISTS subscription_events_service_all ON subscription_events;
CREATE POLICY subscription_events_service_all ON subscription_events 
    FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (Manual)
-- ============================================================================
-- To rollback this migration, run the following commands:
-- 
-- DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
-- DROP POLICY IF EXISTS subscriptions_select_own ON subscriptions;
-- DROP POLICY IF EXISTS subscriptions_service_all ON subscriptions;
-- DROP POLICY IF EXISTS subscription_events_select_own ON subscription_events;
-- DROP POLICY IF EXISTS subscription_events_service_all ON subscription_events;
-- DROP TABLE IF EXISTS subscription_events;
-- DROP TABLE IF EXISTS subscriptions;
-- 
-- Then re-run 001_initial_schema.sql to restore the original subscriptions table
-- ============================================================================
