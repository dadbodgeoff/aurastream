-- Migration: Add background removal support to creator_media_assets
-- Version: 051
-- Description: Adds processed_url and has_background_removed columns for background removal feature

-- Add processed_url column for background-removed version
ALTER TABLE creator_media_assets 
ADD COLUMN IF NOT EXISTS processed_url TEXT;

-- Add processed_storage_path column
ALTER TABLE creator_media_assets 
ADD COLUMN IF NOT EXISTS processed_storage_path TEXT;

-- Add has_background_removed flag
ALTER TABLE creator_media_assets 
ADD COLUMN IF NOT EXISTS has_background_removed BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN creator_media_assets.processed_url IS 'URL to background-removed version of the asset (PNG with transparency)';
COMMENT ON COLUMN creator_media_assets.processed_storage_path IS 'Storage path for background-removed version';
COMMENT ON COLUMN creator_media_assets.has_background_removed IS 'Whether background removal was applied to this asset';

-- Create index for filtering by background removal status
CREATE INDEX IF NOT EXISTS idx_creator_media_bg_removed 
ON creator_media_assets(user_id, has_background_removed) 
WHERE has_background_removed = TRUE;
