-- Migration: Add video_ideas column to playbook_reports
-- Date: 2025-12-30
-- Description: Stores AI-generated video ideas based on trending content analysis

-- Add video_ideas JSONB column to playbook_reports
ALTER TABLE playbook_reports
ADD COLUMN IF NOT EXISTS video_ideas JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN playbook_reports.video_ideas IS 'AI-generated video ideas with titles, hooks, tags, and thumbnail concepts';

-- Create index for querying reports with video ideas
CREATE INDEX IF NOT EXISTS idx_playbook_reports_has_video_ideas 
ON playbook_reports ((video_ideas IS NOT NULL AND video_ideas != '[]'::jsonb));
