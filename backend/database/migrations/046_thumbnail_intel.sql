-- Migration: Thumbnail Intelligence
-- Date: 2025-12-30
-- Description: Stores daily thumbnail analysis for gaming categories

-- Create thumbnail_intel table
CREATE TABLE IF NOT EXISTS thumbnail_intel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_key TEXT NOT NULL,
    category_name TEXT NOT NULL,
    analysis_date DATE NOT NULL,
    
    -- Individual thumbnail analyses (JSONB array)
    thumbnails JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Aggregated patterns
    common_layout TEXT,
    common_colors TEXT[] DEFAULT '{}',
    common_elements TEXT[] DEFAULT '{}',
    
    -- Category recommendations
    ideal_layout TEXT,
    ideal_color_palette TEXT[] DEFAULT '{}',
    must_have_elements TEXT[] DEFAULT '{}',
    avoid_elements TEXT[] DEFAULT '{}',
    
    -- Summary and tips
    category_style_summary TEXT,
    pro_tips TEXT[] DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one analysis per category per day
    UNIQUE(category_key, analysis_date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_thumbnail_intel_category 
ON thumbnail_intel(category_key);

CREATE INDEX IF NOT EXISTS idx_thumbnail_intel_date 
ON thumbnail_intel(analysis_date DESC);

CREATE INDEX IF NOT EXISTS idx_thumbnail_intel_category_date 
ON thumbnail_intel(category_key, analysis_date DESC);

-- Comments
COMMENT ON TABLE thumbnail_intel IS 'Daily thumbnail analysis for gaming categories using Gemini Vision';
COMMENT ON COLUMN thumbnail_intel.thumbnails IS 'Array of individual thumbnail analyses with layout, colors, and recommendations';
COMMENT ON COLUMN thumbnail_intel.ideal_color_palette IS 'Recommended hex colors for this category';
COMMENT ON COLUMN thumbnail_intel.pro_tips IS 'AI-generated tips for creating thumbnails in this category';

-- Enable RLS
ALTER TABLE thumbnail_intel ENABLE ROW LEVEL SECURITY;

-- Public read access (no auth required for thumbnail intel)
CREATE POLICY "thumbnail_intel_public_read" ON thumbnail_intel
    FOR SELECT USING (true);

-- Service role can insert/update
CREATE POLICY "thumbnail_intel_service_write" ON thumbnail_intel
    FOR ALL USING (auth.role() = 'service_role');
