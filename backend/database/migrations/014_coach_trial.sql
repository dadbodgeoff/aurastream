-- Migration: 014_coach_trial
-- Description: Add coach trial tracking for free/pro users to try 1 session
-- Created: 2025-12-27

-- ============================================================================
-- Add coach_trial_used column to users table
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_trial_used BOOLEAN DEFAULT FALSE;

-- Index for quick lookup during access checks
CREATE INDEX IF NOT EXISTS idx_users_coach_trial ON users(coach_trial_used) WHERE coach_trial_used = FALSE;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN users.coach_trial_used IS 'Whether user has used their free coach trial session';
