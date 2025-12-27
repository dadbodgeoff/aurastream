-- ============================================================================
-- Migration: 003_brand_kit_enhancement.sql
-- Version: 1.0.0
-- Description: Adds enhanced JSONB columns to brand_kits table for extended
--              color palettes, typography hierarchy, brand voice configuration,
--              streamer-specific assets, usage guidelines, social profiles,
--              and logo metadata.
-- Date: 2024
--
-- This migration enhances the brand_kits table with:
-- - Extended color palette (colors_extended)
-- - Typography hierarchy (typography)
-- - Brand voice configuration (voice)
-- - Streamer-specific assets (streamer_assets)
-- - Brand usage guidelines (guidelines)
-- - Social media profiles (social_profiles)
-- - Logo metadata (logos)
--
-- Compatible with: PostgreSQL 14+ / Supabase
-- ============================================================================

-- ============================================================================
-- SECTION 1: ADD JSONB COLUMNS TO BRAND_KITS TABLE
-- Using ADD COLUMN IF NOT EXISTS for idempotency
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 Extended Color Palette
-- Stores additional color definitions beyond primary/accent colors
-- Structure: { "background": "#...", "text": "#...", "highlight": "#...", ... }
-- ----------------------------------------------------------------------------
ALTER TABLE brand_kits 
ADD COLUMN IF NOT EXISTS colors_extended JSONB DEFAULT '{}';

COMMENT ON COLUMN brand_kits.colors_extended IS 
    'Extended color palette with additional color definitions (background, text, highlight, gradients, etc.)';

-- ----------------------------------------------------------------------------
-- 1.2 Typography Hierarchy
-- Stores complete typography configuration for brand consistency
-- Structure: { "headline": {...}, "subheadline": {...}, "body": {...}, "caption": {...} }
-- ----------------------------------------------------------------------------
ALTER TABLE brand_kits 
ADD COLUMN IF NOT EXISTS typography JSONB DEFAULT '{}';

COMMENT ON COLUMN brand_kits.typography IS 
    'Typography hierarchy configuration including font families, sizes, weights, and line heights for different text levels';

-- ----------------------------------------------------------------------------
-- 1.3 Brand Voice Configuration
-- Stores brand voice and tone settings for AI-generated content
-- Structure: { "tone": "...", "personality": [...], "vocabulary": {...}, "examples": [...] }
-- ----------------------------------------------------------------------------
ALTER TABLE brand_kits 
ADD COLUMN IF NOT EXISTS voice JSONB DEFAULT '{}';

COMMENT ON COLUMN brand_kits.voice IS 
    'Brand voice configuration including tone, personality traits, vocabulary preferences, and example phrases for AI content generation';

-- ----------------------------------------------------------------------------
-- 1.4 Streamer-Specific Assets
-- Stores references and metadata for streamer brand assets
-- Structure: { "overlays": [...], "alerts": [...], "panels": [...], "emotes": [...], "badges": [...] }
-- ----------------------------------------------------------------------------
ALTER TABLE brand_kits 
ADD COLUMN IF NOT EXISTS streamer_assets JSONB DEFAULT '{}';

COMMENT ON COLUMN brand_kits.streamer_assets IS 
    'Streamer-specific asset references including overlays, alerts, panels, emotes, badges, and other streaming-related brand elements';

-- ----------------------------------------------------------------------------
-- 1.5 Brand Usage Guidelines
-- Stores brand usage rules and restrictions
-- Structure: { "dos": [...], "donts": [...], "spacing": {...}, "placement": {...} }
-- ----------------------------------------------------------------------------
ALTER TABLE brand_kits 
ADD COLUMN IF NOT EXISTS guidelines JSONB DEFAULT '{}';

COMMENT ON COLUMN brand_kits.guidelines IS 
    'Brand usage guidelines including dos/donts, spacing requirements, placement rules, and other brand consistency rules';

-- ----------------------------------------------------------------------------
-- 1.6 Social Media Profiles
-- Stores linked social media profile information
-- Structure: { "twitch": {...}, "youtube": {...}, "twitter": {...}, "tiktok": {...}, ... }
-- ----------------------------------------------------------------------------
ALTER TABLE brand_kits 
ADD COLUMN IF NOT EXISTS social_profiles JSONB DEFAULT '{}';

COMMENT ON COLUMN brand_kits.social_profiles IS 
    'Social media profile information and links for cross-platform brand consistency';

-- ----------------------------------------------------------------------------
-- 1.7 Logo Metadata
-- Stores comprehensive logo information and variants
-- Structure: { "primary": {...}, "secondary": {...}, "icon": {...}, "monochrome": {...}, "watermark": {...} }
-- ----------------------------------------------------------------------------
ALTER TABLE brand_kits 
ADD COLUMN IF NOT EXISTS logos JSONB DEFAULT '{}';

COMMENT ON COLUMN brand_kits.logos IS 
    'Logo metadata including primary, secondary, icon, monochrome, and watermark variants with URLs and usage specifications';

-- ============================================================================
-- SECTION 2: INDEXES
-- Performance indexes for common query patterns on JSONB columns
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 Index on voice->>'tone' for querying by brand tone
-- Enables efficient filtering of brand kits by their voice tone setting
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_brand_kits_voice_tone 
ON brand_kits ((voice->>'tone'));

-- ----------------------------------------------------------------------------
-- 2.2 GIN Index on streamer_assets for full JSONB search
-- Enables efficient containment queries and full-text search within streamer assets
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_brand_kits_streamer_assets_gin 
ON brand_kits USING GIN (streamer_assets);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
