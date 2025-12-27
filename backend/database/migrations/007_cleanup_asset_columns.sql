-- ============================================================================
-- Migration 007: Cleanup Asset Columns
-- ============================================================================
-- 
-- This migration completes the schema transition started in Migration 005:
-- - Migrates data from old columns to new columns (if not already done)
-- - Makes 'url' column NOT NULL after data migration
-- - Drops deprecated columns: cdn_url, storage_key, shareable_url
-- 
-- Background:
-- Migration 005 added new columns (url, storage_path) as aliases for the old
-- columns (cdn_url, storage_key) to support both schemas during transition.
-- This migration finalizes that transition by removing the old columns.
-- ============================================================================

-- ============================================================================
-- Step 1: Migrate data from old columns to new columns
-- ============================================================================
-- Copy cdn_url to url where url is NULL but cdn_url has data
UPDATE assets 
SET url = cdn_url 
WHERE url IS NULL AND cdn_url IS NOT NULL;

-- Copy storage_key to storage_path where storage_path is NULL but storage_key has data
UPDATE assets 
SET storage_path = storage_key 
WHERE storage_path IS NULL AND storage_key IS NOT NULL;

-- ============================================================================
-- Step 2: Enforce NOT NULL constraint on url column
-- ============================================================================
-- The url column should always have a value after data migration
ALTER TABLE assets 
ALTER COLUMN url SET NOT NULL;

-- ============================================================================
-- Step 3: Drop deprecated columns
-- ============================================================================
-- These columns are no longer needed as data has been migrated to url and storage_path

-- Drop cdn_url column (replaced by url)
ALTER TABLE assets 
DROP COLUMN IF EXISTS cdn_url;

-- Drop storage_key column (replaced by storage_path)
ALTER TABLE assets 
DROP COLUMN IF EXISTS storage_key;

-- Drop shareable_url column (no longer used - sharing handled differently)
ALTER TABLE assets 
DROP COLUMN IF EXISTS shareable_url;

-- ============================================================================
-- Step 4: Update column comments
-- ============================================================================
COMMENT ON COLUMN assets.url IS 'Public URL to access the asset (required)';
COMMENT ON COLUMN assets.storage_path IS 'Internal storage path for the asset';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- 
-- After this migration, the assets table will have:
-- - url (TEXT NOT NULL) - Public URL for asset access
-- - storage_path (TEXT) - Internal storage path
-- - file_size (BIGINT) - File size in bytes (added in Migration 005)
-- 
-- Removed columns:
-- - cdn_url (replaced by url)
-- - storage_key (replaced by storage_path)
-- - shareable_url (deprecated)
-- ============================================================================

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (Manual)
-- ============================================================================
-- To rollback this migration, execute the following:
-- 
-- -- Re-add dropped columns
-- ALTER TABLE assets ADD COLUMN IF NOT EXISTS cdn_url TEXT;
-- ALTER TABLE assets ADD COLUMN IF NOT EXISTS storage_key TEXT;
-- ALTER TABLE assets ADD COLUMN IF NOT EXISTS shareable_url TEXT;
-- 
-- -- Copy data back from new columns to old columns
-- UPDATE assets SET cdn_url = url WHERE cdn_url IS NULL;
-- UPDATE assets SET storage_key = storage_path WHERE storage_key IS NULL;
-- 
-- -- Make url nullable again
-- ALTER TABLE assets ALTER COLUMN url DROP NOT NULL;
-- 
-- -- Restore original comments
-- COMMENT ON COLUMN assets.cdn_url IS 'Public CDN URL for asset delivery';
-- COMMENT ON COLUMN assets.storage_key IS 'Internal storage key for asset management';
-- COMMENT ON COLUMN assets.shareable_url IS 'Public shareable URL for social sharing';
-- ============================================================================
