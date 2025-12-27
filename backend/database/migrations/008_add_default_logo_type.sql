-- ============================================================================
-- Migration 008: Add default_logo_type column
-- ============================================================================
-- 
-- This migration adds the default_logo_type column to the brand_kits table.
-- This column stores the user's preferred logo type for asset generation.
-- 
-- Background:
-- The logo_service.py supports multiple logo variations (primary, secondary,
-- icon, monochrome, watermark) and needs to track which logo type should be
-- used by default when generating assets for a brand kit.
-- 
-- Valid values: 'primary', 'secondary', 'icon', 'monochrome', 'watermark'
-- Default: 'primary'
-- ============================================================================

-- ============================================================================
-- Step 1: Add default_logo_type column to brand_kits table
-- ============================================================================
-- Using DO block with IF NOT EXISTS check for safety (idempotent migration)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'brand_kits' 
        AND column_name = 'default_logo_type'
    ) THEN
        ALTER TABLE brand_kits 
        ADD COLUMN default_logo_type TEXT DEFAULT 'primary';
    END IF;
END $$;

-- ============================================================================
-- Step 2: Add column comment
-- ============================================================================
COMMENT ON COLUMN brand_kits.default_logo_type IS 
    'Default logo type for asset generation. Valid values: primary, secondary, icon, monochrome, watermark';

-- ============================================================================
-- Step 3: Add check constraint for valid logo types
-- ============================================================================
-- Only add constraint if it doesn't already exist

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.constraint_column_usage 
        WHERE table_name = 'brand_kits' 
        AND constraint_name = 'brand_kits_default_logo_type_check'
    ) THEN
        ALTER TABLE brand_kits 
        ADD CONSTRAINT brand_kits_default_logo_type_check 
        CHECK (default_logo_type IN ('primary', 'secondary', 'icon', 'monochrome', 'watermark'));
    END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- 
-- After this migration, the brand_kits table will have:
-- - default_logo_type (TEXT DEFAULT 'primary') - Preferred logo type for generation
-- 
-- The column is used by logo_service.py for:
-- - get_default_logo_type() - Retrieve user's preferred logo type
-- - set_default_logo_type() - Update user's preferred logo type
-- ============================================================================

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (Manual)
-- ============================================================================
-- To rollback this migration, execute the following:
-- 
-- -- Remove the check constraint
-- ALTER TABLE brand_kits DROP CONSTRAINT IF EXISTS brand_kits_default_logo_type_check;
-- 
-- -- Remove the column
-- ALTER TABLE brand_kits DROP COLUMN IF EXISTS default_logo_type;
-- ============================================================================
