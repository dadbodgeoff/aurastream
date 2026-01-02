-- Migration: 074_coach_sessions.sql
-- Purpose: Coach Sessions table for session persistence and recovery
-- Created: 2025-01-XX
--
-- This migration creates the coach_sessions table for persisting
-- coaching sessions to PostgreSQL. Sessions are primarily stored in Redis
-- for fast access, but also persisted here for:
-- 1. Session recovery if Redis data is lost
-- 2. Historical session data for analytics
-- 3. Linking sessions to generated assets

-- ============================================================================
-- TABLE: coach_sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS coach_sessions (
  id UUID PRIMARY KEY,
  
  -- User and brand context
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE SET NULL,
  
  -- Session configuration
  asset_type TEXT NOT NULL DEFAULT 'thumbnail',
  mood TEXT,
  game_context TEXT,
  
  -- Session state
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired')),
  turns_used INTEGER DEFAULT 0,
  current_prompt TEXT,
  
  -- Conversation history (JSON array of messages)
  messages JSONB DEFAULT '[]'::jsonb,
  
  -- Generated assets from this session
  generated_asset_ids UUID[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Add table comment
COMMENT ON TABLE coach_sessions IS 'Persisted coach sessions for recovery and analytics. Primary storage is Redis.';

-- Column comments
COMMENT ON COLUMN coach_sessions.id IS 'Session UUID (same as Redis key)';
COMMENT ON COLUMN coach_sessions.user_id IS 'User who owns this session';
COMMENT ON COLUMN coach_sessions.brand_kit_id IS 'Brand kit used for this session (optional)';
COMMENT ON COLUMN coach_sessions.asset_type IS 'Type of asset being created';
COMMENT ON COLUMN coach_sessions.mood IS 'Selected mood/style for the session';
COMMENT ON COLUMN coach_sessions.game_context IS 'Game context from grounding (if used)';
COMMENT ON COLUMN coach_sessions.status IS 'Session status: active, ended, or expired';
COMMENT ON COLUMN coach_sessions.turns_used IS 'Number of conversation turns used';
COMMENT ON COLUMN coach_sessions.current_prompt IS 'Current/final refined prompt';
COMMENT ON COLUMN coach_sessions.messages IS 'Conversation history as JSON array';
COMMENT ON COLUMN coach_sessions.generated_asset_ids IS 'Array of asset IDs generated from this session';
COMMENT ON COLUMN coach_sessions.ended_at IS 'When the session was ended (null if still active)';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- User sessions lookup
CREATE INDEX IF NOT EXISTS idx_coach_sessions_user ON coach_sessions(user_id);

-- Active sessions lookup
CREATE INDEX IF NOT EXISTS idx_coach_sessions_status ON coach_sessions(status) WHERE status = 'active';

-- Recent sessions
CREATE INDEX IF NOT EXISTS idx_coach_sessions_created ON coach_sessions(created_at DESC);

-- User + status for listing active sessions
CREATE INDEX IF NOT EXISTS idx_coach_sessions_user_status ON coach_sessions(user_id, status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE coach_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
DROP POLICY IF EXISTS coach_sessions_select_own ON coach_sessions;
CREATE POLICY coach_sessions_select_own ON coach_sessions 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own sessions
DROP POLICY IF EXISTS coach_sessions_insert_own ON coach_sessions;
CREATE POLICY coach_sessions_insert_own ON coach_sessions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
DROP POLICY IF EXISTS coach_sessions_update_own ON coach_sessions;
CREATE POLICY coach_sessions_update_own ON coach_sessions 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own sessions
DROP POLICY IF EXISTS coach_sessions_delete_own ON coach_sessions;
CREATE POLICY coach_sessions_delete_own ON coach_sessions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_coach_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS coach_sessions_updated_at ON coach_sessions;
CREATE TRIGGER coach_sessions_updated_at
  BEFORE UPDATE ON coach_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_coach_sessions_updated_at();

-- ============================================================================
-- Add coach_session_id to assets table
-- ============================================================================
-- Links generated assets back to their coaching session

ALTER TABLE assets ADD COLUMN IF NOT EXISTS coach_session_id UUID REFERENCES coach_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assets_coach_session ON assets(coach_session_id) WHERE coach_session_id IS NOT NULL;

COMMENT ON COLUMN assets.coach_session_id IS 'Reference to the coach session that generated this asset (if any)';
