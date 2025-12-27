-- Migration: 010_terms_acceptance
-- Description: Add terms acceptance tracking to users table
-- Date: 2025-12-26

-- Add terms acceptance columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20) DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS privacy_version VARCHAR(20) DEFAULT '1.0.0';

-- Create index for compliance queries
CREATE INDEX IF NOT EXISTS idx_users_terms_accepted_at ON users(terms_accepted_at);

-- Create terms acceptance history table for audit trail
CREATE TABLE IF NOT EXISTS terms_acceptance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('terms', 'privacy')),
    document_version VARCHAR(20) NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for history table
CREATE INDEX IF NOT EXISTS idx_terms_history_user_id ON terms_acceptance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_terms_history_document_type ON terms_acceptance_history(document_type);
CREATE INDEX IF NOT EXISTS idx_terms_history_accepted_at ON terms_acceptance_history(accepted_at);

-- Enable RLS on terms_acceptance_history
ALTER TABLE terms_acceptance_history ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only view their own acceptance history
CREATE POLICY terms_history_select_own ON terms_acceptance_history
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS policy: Users can insert their own acceptance records
CREATE POLICY terms_history_insert_own ON terms_acceptance_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Comment on columns for documentation
COMMENT ON COLUMN users.terms_accepted_at IS 'Timestamp when user accepted Terms of Service';
COMMENT ON COLUMN users.terms_version IS 'Version of Terms of Service accepted';
COMMENT ON COLUMN users.privacy_accepted_at IS 'Timestamp when user accepted Privacy Policy';
COMMENT ON COLUMN users.privacy_version IS 'Version of Privacy Policy accepted';
COMMENT ON TABLE terms_acceptance_history IS 'Audit trail of all terms/privacy acceptances';
