-- ============================================================================
-- Migration: 001_initial_schema.sql
-- Version: 1.0.0
-- Description: Initial database schema for Streamer Studio SaaS platform
-- Date: 2024
-- 
-- This migration creates the foundational database structure including:
-- - Core tables (users, brand_kits, generation_jobs, assets, platform_connections, subscriptions)
-- - Required indexes for query performance
-- - RPC functions for atomic operations
-- - Triggers for automatic timestamp updates
-- - Row Level Security (RLS) policies for data isolation
--
-- Compatible with: PostgreSQL 14+ / Supabase
-- ============================================================================

-- ============================================================================
-- SECTION 1: TABLES
-- Tables are ordered to handle foreign key dependencies correctly
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 Users Table
-- Core user account information and subscription status
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash TEXT,  -- NULL for OAuth-only users
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'studio')),
    subscription_status TEXT DEFAULT 'none' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'none')),
    stripe_customer_id TEXT,
    assets_generated_this_month INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Core user accounts for Streamer Studio platform';
COMMENT ON COLUMN users.password_hash IS 'NULL for OAuth-only users (Twitch, YouTube, etc.)';
COMMENT ON COLUMN users.subscription_tier IS 'Current subscription level: free, pro, or studio';
COMMENT ON COLUMN users.assets_generated_this_month IS 'Counter for monthly usage tracking';

-- ----------------------------------------------------------------------------
-- 1.2 Brand Kits Table
-- User-defined branding configurations for asset generation
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brand_kits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    primary_colors TEXT[] NOT NULL,  -- Array of hex codes
    accent_colors TEXT[] DEFAULT '{}',
    fonts JSONB NOT NULL DEFAULT '{"headline": "Inter", "body": "Inter"}',
    logo_url TEXT,
    tone TEXT DEFAULT 'professional' CHECK (tone IN ('competitive', 'casual', 'educational', 'comedic', 'professional')),
    style_reference TEXT,
    extracted_from TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE brand_kits IS 'User-defined branding configurations for consistent asset generation';
COMMENT ON COLUMN brand_kits.primary_colors IS 'Array of hex color codes for primary brand colors';
COMMENT ON COLUMN brand_kits.fonts IS 'JSON object containing headline and body font selections';
COMMENT ON COLUMN brand_kits.tone IS 'Brand voice/tone for AI-generated content';
COMMENT ON COLUMN brand_kits.extracted_from IS 'Source URL if brand kit was auto-extracted from existing channel';

-- ----------------------------------------------------------------------------
-- 1.3 Generation Jobs Table
-- Tracks asset generation requests and their processing status
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_job_id UUID REFERENCES generation_jobs(id) ON DELETE CASCADE,
    
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'partial')),
    job_type TEXT DEFAULT 'single' CHECK (job_type IN ('single', 'batch', 'variation')),
    
    asset_type TEXT NOT NULL CHECK (asset_type IN ('thumbnail', 'overlay', 'banner', 'story_graphic', 'clip_cover')),
    custom_prompt TEXT,
    brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE SET NULL,
    platform_context JSONB,
    
    total_assets INTEGER DEFAULT 1,
    completed_assets INTEGER DEFAULT 0,
    failed_assets INTEGER DEFAULT 0,
    
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE generation_jobs IS 'Tracks asset generation requests and processing status';
COMMENT ON COLUMN generation_jobs.parent_job_id IS 'Reference to parent job for batch/variation jobs';
COMMENT ON COLUMN generation_jobs.status IS 'Current job status: queued, processing, completed, failed, or partial';
COMMENT ON COLUMN generation_jobs.platform_context IS 'JSON containing platform-specific metadata (game, category, etc.)';

-- ----------------------------------------------------------------------------
-- 1.4 Assets Table
-- Generated assets with storage references and metadata
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
    brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE SET NULL,
    
    asset_type TEXT NOT NULL CHECK (asset_type IN ('thumbnail', 'overlay', 'banner', 'story_graphic', 'clip_cover')),
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    format TEXT DEFAULT 'png' CHECK (format IN ('png', 'jpeg', 'webp')),
    
    cdn_url TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    shareable_url TEXT NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    
    prompt_used TEXT NOT NULL,
    generation_params JSONB NOT NULL,
    
    viral_score INTEGER CHECK (viral_score >= 0 AND viral_score <= 100),
    viral_suggestions TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ  -- NULL for paid tiers
);

COMMENT ON TABLE assets IS 'Generated assets with CDN references and generation metadata';
COMMENT ON COLUMN assets.cdn_url IS 'Public CDN URL for asset delivery';
COMMENT ON COLUMN assets.storage_key IS 'Internal storage key for asset management';
COMMENT ON COLUMN assets.shareable_url IS 'Public shareable URL for social sharing';
COMMENT ON COLUMN assets.viral_score IS 'AI-predicted viral potential score (0-100)';
COMMENT ON COLUMN assets.expires_at IS 'Asset expiration date, NULL for paid tier users';

-- ----------------------------------------------------------------------------
-- 1.5 Platform Connections Table
-- OAuth connections to streaming platforms (Twitch, YouTube, TikTok)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('twitch', 'youtube', 'tiktok')),
    
    platform_user_id TEXT NOT NULL,
    platform_username TEXT NOT NULL,
    
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    
    cached_metadata JSONB,
    metadata_updated_at TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (user_id, platform)
);

COMMENT ON TABLE platform_connections IS 'OAuth connections to streaming platforms';
COMMENT ON COLUMN platform_connections.access_token_encrypted IS 'Encrypted OAuth access token';
COMMENT ON COLUMN platform_connections.refresh_token_encrypted IS 'Encrypted OAuth refresh token';
COMMENT ON COLUMN platform_connections.cached_metadata IS 'Cached platform data (followers, categories, etc.)';

-- ----------------------------------------------------------------------------
-- 1.6 Subscriptions Table
-- Detailed subscription and billing information
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'studio')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    
    assets_limit INTEGER NOT NULL,  -- 5, 100, or -1 (unlimited)
    assets_used INTEGER DEFAULT 0,
    platforms_limit INTEGER NOT NULL,  -- 1, 3, or -1 (unlimited)
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE subscriptions IS 'Subscription and billing details linked to Stripe';
COMMENT ON COLUMN subscriptions.assets_limit IS 'Monthly asset limit: 5 (free), 100 (pro), -1 (unlimited/studio)';
COMMENT ON COLUMN subscriptions.platforms_limit IS 'Platform connection limit: 1 (free), 3 (pro), -1 (unlimited/studio)';

-- ============================================================================
-- SECTION 2: INDEXES
-- Performance indexes for common query patterns
-- ============================================================================

-- Brand kits indexes
CREATE INDEX IF NOT EXISTS idx_brand_kits_user_id ON brand_kits(user_id);

-- Partial unique index for ensuring only one active brand kit per user
-- This replaces the UNIQUE constraint which doesn't support partial conditions
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_brand_kit ON brand_kits(user_id) WHERE is_active = TRUE;

-- Generation jobs indexes
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_id ON generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);

-- Assets indexes
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_job_id ON assets(job_id);

-- Platform connections indexes
CREATE INDEX IF NOT EXISTS idx_platform_connections_user_id ON platform_connections(user_id);

-- ============================================================================
-- SECTION 3: FUNCTIONS
-- RPC functions for atomic operations
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 Increment User Usage
-- Atomically increments asset usage counters for a user
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_user_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET assets_generated_this_month = assets_generated_this_month + 1,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    UPDATE subscriptions
    SET assets_used = assets_used + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_user_usage IS 'Atomically increments asset usage counters in both users and subscriptions tables';

-- ----------------------------------------------------------------------------
-- 3.2 Reset Monthly Usage
-- Resets monthly usage counters for a user (called at billing cycle reset)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reset_monthly_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET assets_generated_this_month = 0,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    UPDATE subscriptions
    SET assets_used = 0,
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_monthly_usage IS 'Resets monthly asset usage counters at billing cycle reset';

-- ============================================================================
-- SECTION 4: TRIGGERS
-- Automatic timestamp updates for updated_at columns
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 Updated_at Trigger Function
-- Generic function to update the updated_at column on row modification
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column IS 'Trigger function to automatically update updated_at timestamp';

-- ----------------------------------------------------------------------------
-- 4.2 Apply Triggers to All Tables with updated_at
-- ----------------------------------------------------------------------------

-- Users table trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Brand kits table trigger
DROP TRIGGER IF EXISTS update_brand_kits_updated_at ON brand_kits;
CREATE TRIGGER update_brand_kits_updated_at 
    BEFORE UPDATE ON brand_kits 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Generation jobs table trigger
DROP TRIGGER IF EXISTS update_generation_jobs_updated_at ON generation_jobs;
CREATE TRIGGER update_generation_jobs_updated_at 
    BEFORE UPDATE ON generation_jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Platform connections table trigger
DROP TRIGGER IF EXISTS update_platform_connections_updated_at ON platform_connections;
CREATE TRIGGER update_platform_connections_updated_at 
    BEFORE UPDATE ON platform_connections 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Subscriptions table trigger
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
-- 5.1 Enable RLS on All Tables
-- ----------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 5.2 Users Table Policies
-- Users can only see and edit their own account data
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own ON users 
    FOR SELECT 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users 
    FOR UPDATE 
    USING (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 5.3 Brand Kits Table Policies
-- Users can only access their own brand kits
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS brand_kits_select_own ON brand_kits;
CREATE POLICY brand_kits_select_own ON brand_kits 
    FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS brand_kits_insert_own ON brand_kits;
CREATE POLICY brand_kits_insert_own ON brand_kits 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS brand_kits_update_own ON brand_kits;
CREATE POLICY brand_kits_update_own ON brand_kits 
    FOR UPDATE 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS brand_kits_delete_own ON brand_kits;
CREATE POLICY brand_kits_delete_own ON brand_kits 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5.4 Generation Jobs Table Policies
-- Users can only access their own generation jobs
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS generation_jobs_select_own ON generation_jobs;
CREATE POLICY generation_jobs_select_own ON generation_jobs 
    FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS generation_jobs_insert_own ON generation_jobs;
CREATE POLICY generation_jobs_insert_own ON generation_jobs 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS generation_jobs_update_own ON generation_jobs;
CREATE POLICY generation_jobs_update_own ON generation_jobs 
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5.5 Assets Table Policies
-- Users can access their own assets; public assets viewable by all
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS assets_select_own ON assets;
CREATE POLICY assets_select_own ON assets 
    FOR SELECT 
    USING (auth.uid() = user_id OR is_public = TRUE);

DROP POLICY IF EXISTS assets_insert_own ON assets;
CREATE POLICY assets_insert_own ON assets 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS assets_update_own ON assets;
CREATE POLICY assets_update_own ON assets 
    FOR UPDATE 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS assets_delete_own ON assets;
CREATE POLICY assets_delete_own ON assets 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5.6 Platform Connections Table Policies
-- Users can only access their own platform connections
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS platform_connections_select_own ON platform_connections;
CREATE POLICY platform_connections_select_own ON platform_connections 
    FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS platform_connections_insert_own ON platform_connections;
CREATE POLICY platform_connections_insert_own ON platform_connections 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS platform_connections_update_own ON platform_connections;
CREATE POLICY platform_connections_update_own ON platform_connections 
    FOR UPDATE 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS platform_connections_delete_own ON platform_connections;
CREATE POLICY platform_connections_delete_own ON platform_connections 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5.7 Subscriptions Table Policies
-- Users can only view their own subscription
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS subscriptions_select_own ON subscriptions;
CREATE POLICY subscriptions_select_own ON subscriptions 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
