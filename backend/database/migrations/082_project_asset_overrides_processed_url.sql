-- Migration 082: Add processed_url to project_asset_overrides
-- 
-- PROBLEM SOLVED:
-- Community assets don't have a processed_url field since they're shared.
-- When a user removes background from a community asset, we need to store
-- the processed URL in the project override itself.
--
-- This column stores the user's personal processed version of the asset,
-- which is only used when use_processed_url = TRUE.

-- ============================================================================
-- Add processed_url column
-- ============================================================================

ALTER TABLE project_asset_overrides 
ADD COLUMN IF NOT EXISTS processed_url TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN project_asset_overrides.processed_url IS 
    'URL to user-processed version of the asset (e.g., bg-removed community asset). '
    'Only used when use_processed_url = TRUE and the source asset does not have its own processed_url.';
