-- Migration 079: Add assets column to canvas_projects
-- Stores full MediaAsset objects for complete state reconstruction

-- Add assets column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'canvas_projects' AND column_name = 'assets'
    ) THEN
        ALTER TABLE canvas_projects ADD COLUMN assets JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
