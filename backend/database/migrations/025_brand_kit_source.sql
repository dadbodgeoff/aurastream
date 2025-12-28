-- Migration: 025_brand_kit_source.sql
-- Description: Track source of brand kit creation (manual, vibe_branding, etc.)
-- Created: 2025-01-01
-- Purpose: Enable tracking of how brand kits were created and support deduplication for image-based extraction

-- ============================================================================
-- COLUMN ADDITIONS
-- ============================================================================

-- Add extracted_from column to track brand kit source
-- Values: NULL (manual creation), "vibe_branding", "asset_extraction"
ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS extracted_from TEXT DEFAULT NULL;

COMMENT ON COLUMN brand_kits.extracted_from IS 'Source of brand kit: NULL (manual), "vibe_branding", "asset_extraction"';

-- Add source_image_hash for deduplication when extracting from images
-- Stores SHA256 hash of the source image to prevent duplicate extractions
ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS source_image_hash TEXT DEFAULT NULL;

COMMENT ON COLUMN brand_kits.source_image_hash IS 'SHA256 hash of source image used for vibe branding extraction';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for finding brand kits by source
-- Partial index only includes non-null values for efficiency
CREATE INDEX IF NOT EXISTS idx_brand_kits_extracted_from 
    ON brand_kits(extracted_from) 
    WHERE extracted_from IS NOT NULL;

-- Index for deduplication lookups by image hash
-- Partial index only includes non-null values for efficiency
CREATE INDEX IF NOT EXISTS idx_brand_kits_source_image_hash 
    ON brand_kits(source_image_hash) 
    WHERE source_image_hash IS NOT NULL;
