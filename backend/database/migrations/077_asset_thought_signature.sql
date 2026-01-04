-- Migration: Add thought_signature to assets table
-- Purpose: Store Gemini's thought_signature for multi-turn image refinements
-- 
-- When Gemini generates an image, it returns a thought_signature that must be
-- included when referencing that image in subsequent conversation turns.
-- Without this signature, refinement requests fail with:
-- "Image part is missing a thought_signature in content position X"

-- Add thought_signature column to assets table
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS thought_signature TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN assets.thought_signature IS 'Gemini thought_signature for multi-turn refinements (base64 encoded)';

-- Index is not needed since we only look this up by asset_id which is already the PK
