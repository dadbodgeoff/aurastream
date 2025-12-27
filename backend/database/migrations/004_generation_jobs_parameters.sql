-- ============================================================================
-- Migration 004: Add parameters and prompt columns to generation_jobs
-- ============================================================================
-- 
-- This migration adds:
-- - prompt: The generated prompt used for image generation
-- - progress: Job progress percentage (0-100)
-- - parameters: JSONB for additional job parameters (logo options, etc.)
--
-- These columns support the logo compositing feature where users can
-- include their brand logo in generated assets.
-- ============================================================================

-- Add prompt column for storing the generated prompt
ALTER TABLE generation_jobs 
ADD COLUMN IF NOT EXISTS prompt TEXT;

COMMENT ON COLUMN generation_jobs.prompt IS 'The generated prompt used for image generation';

-- Add progress column for tracking job progress
ALTER TABLE generation_jobs 
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

COMMENT ON COLUMN generation_jobs.progress IS 'Job progress percentage (0-100)';

-- Add parameters column for logo options and other job parameters
ALTER TABLE generation_jobs 
ADD COLUMN IF NOT EXISTS parameters JSONB;

COMMENT ON COLUMN generation_jobs.parameters IS 'Additional job parameters including logo options (include_logo, logo_position, logo_size, logo_type)';

-- Create index on parameters for querying jobs with logo options
CREATE INDEX IF NOT EXISTS idx_generation_jobs_parameters 
ON generation_jobs USING GIN (parameters);

-- ============================================================================
-- Example parameters structure for logo compositing:
-- {
--   "include_logo": true,
--   "brand_kit_id": "uuid",
--   "logo_type": "primary",
--   "logo_position": "bottom-right",
--   "logo_size": "medium",
--   "logo_opacity": 1.0
-- }
-- ============================================================================
