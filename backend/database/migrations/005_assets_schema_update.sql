-- ============================================================================
-- Migration 005: Update assets table schema
-- ============================================================================
-- 
-- This migration updates the assets table to match the service layer:
-- - Adds 'url' column (alias for cdn_url)
-- - Adds 'storage_path' column (alias for storage_key)
-- - Adds 'file_size' column for tracking asset size
-- - Makes some columns optional that were required
-- ============================================================================

-- Add url column if it doesn't exist
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS url TEXT;

-- Add storage_path column if it doesn't exist
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Add file_size column
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Make prompt_used optional (not always needed)
ALTER TABLE assets 
ALTER COLUMN prompt_used DROP NOT NULL;

-- Make generation_params optional
ALTER TABLE assets 
ALTER COLUMN generation_params DROP NOT NULL;

-- Make cdn_url optional (we use url instead)
ALTER TABLE assets 
ALTER COLUMN cdn_url DROP NOT NULL;

-- Make storage_key optional (we use storage_path instead)
ALTER TABLE assets 
ALTER COLUMN storage_key DROP NOT NULL;

-- Make shareable_url optional
ALTER TABLE assets 
ALTER COLUMN shareable_url DROP NOT NULL;

-- Add comments
COMMENT ON COLUMN assets.url IS 'Public URL to access the asset';
COMMENT ON COLUMN assets.storage_path IS 'Internal storage path for the asset';
COMMENT ON COLUMN assets.file_size IS 'File size in bytes';

-- ============================================================================
-- Note: After running this migration, the assets table will support both
-- the old schema (cdn_url, storage_key) and new schema (url, storage_path)
-- ============================================================================
