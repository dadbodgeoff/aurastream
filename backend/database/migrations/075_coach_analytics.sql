-- Migration: 075_coach_analytics.sql
-- Purpose: Coach Analytics (Learning Loop) - Track session outcomes to improve coaching quality
-- Created: 2025-01-XX
--
-- This migration creates the infrastructure for the Coach Learning Loop feature.
-- By tracking which coaching sessions lead to successful asset generations,
-- we can analyze patterns and improve the coaching experience over time.
--
-- Key insights this enables:
-- - Which coaching patterns lead to higher quality generations
-- - How grounding affects generation success rates
-- - Optimal number of turns for different asset types
-- - Correlation between refinements and viral scores

-- ============================================================================
-- TABLE: coach_session_outcomes
-- ============================================================================
-- Tracks the outcome of each coach session, linking sessions to generated assets
-- and capturing metrics about the coaching interaction quality.

CREATE TABLE IF NOT EXISTS coach_session_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  session_id UUID REFERENCES coach_sessions(id) ON DELETE SET NULL,  -- Nullable if session deleted
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,       -- Required for RLS
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,             -- The generated asset (if any)
  
  -- Outcome metrics
  generation_completed BOOLEAN DEFAULT FALSE,                          -- Did user complete generation?
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),  -- Optional 1-5 satisfaction rating
  viral_score INTEGER,                                                 -- Copied from generated asset for analysis
  
  -- Session interaction metrics
  turns_used INTEGER DEFAULT 0,                                        -- Number of back-and-forth messages
  grounding_used BOOLEAN DEFAULT FALSE,                                -- Was web grounding feature used?
  refinements_count INTEGER DEFAULT 0,                                 -- How many times user refined prompt
  quality_score FLOAT,                                                 -- Validation score at generation time (0.0-1.0)
  
  -- Prompt analysis (captured at generation time)
  final_intent TEXT,                                                   -- The refined description used for generation
  asset_type TEXT NOT NULL,                                            -- Type of asset being created
  mood TEXT,                                                           -- Detected mood/tone
  game_context TEXT,                                                   -- Game/stream context if provided
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE coach_session_outcomes IS 'Tracks coach session outcomes for learning loop analytics. Links coaching sessions to generated assets and captures quality metrics.';

-- Column comments
COMMENT ON COLUMN coach_session_outcomes.session_id IS 'Reference to the coach session. SET NULL on delete to preserve analytics.';
COMMENT ON COLUMN coach_session_outcomes.user_id IS 'User who owned the session. Required for RLS policies.';
COMMENT ON COLUMN coach_session_outcomes.asset_id IS 'The asset generated from this session, if any.';
COMMENT ON COLUMN coach_session_outcomes.generation_completed IS 'Whether the user completed asset generation after coaching.';
COMMENT ON COLUMN coach_session_outcomes.user_rating IS 'Optional user satisfaction rating (1-5 stars).';
COMMENT ON COLUMN coach_session_outcomes.viral_score IS 'Viral score of generated asset, copied for analytics queries.';
COMMENT ON COLUMN coach_session_outcomes.turns_used IS 'Number of message exchanges in the coaching session.';
COMMENT ON COLUMN coach_session_outcomes.grounding_used IS 'Whether web grounding was used (Studio tier feature).';
COMMENT ON COLUMN coach_session_outcomes.refinements_count IS 'Number of prompt refinements during session.';
COMMENT ON COLUMN coach_session_outcomes.quality_score IS 'Prompt quality validation score at generation time (0.0-1.0).';
COMMENT ON COLUMN coach_session_outcomes.final_intent IS 'The final refined prompt/description used for generation.';
COMMENT ON COLUMN coach_session_outcomes.asset_type IS 'Type of asset (twitch_emote, youtube_thumbnail, etc).';
COMMENT ON COLUMN coach_session_outcomes.mood IS 'Detected mood/tone from the coaching session.';
COMMENT ON COLUMN coach_session_outcomes.game_context IS 'Game or stream context provided during coaching.';

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Optimized for common query patterns in analytics dashboards and reports

-- User-specific queries (e.g., "show my coaching history")
CREATE INDEX IF NOT EXISTS idx_coach_outcomes_user ON coach_session_outcomes(user_id);

-- Asset type analysis (e.g., "which asset types benefit most from coaching")
CREATE INDEX IF NOT EXISTS idx_coach_outcomes_asset_type ON coach_session_outcomes(asset_type);

-- Session lookups (e.g., "get outcome for this session")
CREATE INDEX IF NOT EXISTS idx_coach_outcomes_session ON coach_session_outcomes(session_id);

-- Time-based queries (e.g., "recent outcomes", "trends over time")
CREATE INDEX IF NOT EXISTS idx_coach_outcomes_created ON coach_session_outcomes(created_at DESC);

-- Composite index for success pattern analysis
CREATE INDEX IF NOT EXISTS idx_coach_outcomes_success_analysis ON coach_session_outcomes(asset_type, generation_completed, grounding_used);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Ensures users can only access their own coaching outcome data

ALTER TABLE coach_session_outcomes ENABLE ROW LEVEL SECURITY;

-- Users can view their own outcomes
DROP POLICY IF EXISTS coach_outcomes_select_own ON coach_session_outcomes;
CREATE POLICY coach_outcomes_select_own ON coach_session_outcomes 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own outcomes
DROP POLICY IF EXISTS coach_outcomes_insert_own ON coach_session_outcomes;
CREATE POLICY coach_outcomes_insert_own ON coach_session_outcomes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own outcomes (e.g., adding rating after generation)
DROP POLICY IF EXISTS coach_outcomes_update_own ON coach_session_outcomes;
CREATE POLICY coach_outcomes_update_own ON coach_session_outcomes 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users cannot delete outcomes (preserve analytics integrity)
-- Admin access would be handled via service role key

-- ============================================================================
-- FUNCTION: get_coach_success_patterns
-- ============================================================================
-- Aggregates coaching session data to identify success patterns.
-- Used by admin dashboards and ML training pipelines.
--
-- Parameters:
--   p_asset_type: Optional filter by asset type (NULL = all types)
--
-- Returns aggregated metrics per asset type including:
--   - Total sessions and completion rates
--   - Average turns and quality scores
--   - Grounding feature usage rates

CREATE OR REPLACE FUNCTION get_coach_success_patterns(p_asset_type TEXT DEFAULT NULL)
RETURNS TABLE (
  asset_type TEXT,
  total_sessions BIGINT,
  completed_generations BIGINT,
  completion_rate FLOAT,
  avg_turns FLOAT,
  avg_quality_score FLOAT,
  avg_viral_score FLOAT,
  grounding_usage_rate FLOAT,
  avg_refinements FLOAT,
  avg_user_rating FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cso.asset_type,
    COUNT(*)::BIGINT AS total_sessions,
    COUNT(*) FILTER (WHERE cso.generation_completed = TRUE)::BIGINT AS completed_generations,
    ROUND(
      (COUNT(*) FILTER (WHERE cso.generation_completed = TRUE)::FLOAT / 
       NULLIF(COUNT(*), 0)::FLOAT) * 100, 
      2
    ) AS completion_rate,
    ROUND(AVG(cso.turns_used)::NUMERIC, 2)::FLOAT AS avg_turns,
    ROUND(AVG(cso.quality_score)::NUMERIC, 3)::FLOAT AS avg_quality_score,
    ROUND(AVG(cso.viral_score)::NUMERIC, 1)::FLOAT AS avg_viral_score,
    ROUND(
      (COUNT(*) FILTER (WHERE cso.grounding_used = TRUE)::FLOAT / 
       NULLIF(COUNT(*), 0)::FLOAT) * 100, 
      2
    ) AS grounding_usage_rate,
    ROUND(AVG(cso.refinements_count)::NUMERIC, 2)::FLOAT AS avg_refinements,
    ROUND(AVG(cso.user_rating)::NUMERIC, 2)::FLOAT AS avg_user_rating
  FROM coach_session_outcomes cso
  WHERE (p_asset_type IS NULL OR cso.asset_type = p_asset_type)
  GROUP BY cso.asset_type
  ORDER BY total_sessions DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_coach_success_patterns IS 'Aggregates coach session outcomes to identify success patterns by asset type. Used for analytics dashboards and ML training.';

-- ============================================================================
-- FUNCTION: get_user_coach_stats
-- ============================================================================
-- Returns coaching statistics for a specific user.
-- Used in user profile/dashboard to show coaching effectiveness.

CREATE OR REPLACE FUNCTION get_user_coach_stats(p_user_id UUID)
RETURNS TABLE (
  total_sessions BIGINT,
  completed_generations BIGINT,
  avg_quality_score FLOAT,
  favorite_asset_type TEXT,
  total_refinements BIGINT,
  grounding_sessions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_sessions,
    COUNT(*) FILTER (WHERE cso.generation_completed = TRUE)::BIGINT AS completed_generations,
    ROUND(AVG(cso.quality_score)::NUMERIC, 3)::FLOAT AS avg_quality_score,
    (
      SELECT cso2.asset_type 
      FROM coach_session_outcomes cso2 
      WHERE cso2.user_id = p_user_id 
      GROUP BY cso2.asset_type 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) AS favorite_asset_type,
    COALESCE(SUM(cso.refinements_count), 0)::BIGINT AS total_refinements,
    COUNT(*) FILTER (WHERE cso.grounding_used = TRUE)::BIGINT AS grounding_sessions
  FROM coach_session_outcomes cso
  WHERE cso.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_coach_stats IS 'Returns coaching statistics for a specific user. Used in user dashboards.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Grant execute permissions on functions to authenticated users

GRANT EXECUTE ON FUNCTION get_coach_success_patterns TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_coach_stats TO authenticated;
