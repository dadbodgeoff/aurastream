-- Migration: Add weekly_schedule column to playbook_reports
-- This stores the full 7-day heatmap with AI insights

-- Add the weekly_schedule JSONB column
ALTER TABLE playbook_reports
ADD COLUMN IF NOT EXISTS weekly_schedule JSONB;

-- Add comment for documentation
COMMENT ON COLUMN playbook_reports.weekly_schedule IS 'Full 7-day weekly schedule heatmap with hourly opportunity scores and AI insights';
