-- Migration 006: Auth tokens for password reset and email verification

CREATE TABLE IF NOT EXISTS auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_type TEXT NOT NULL CHECK (token_type IN ('password_reset', 'email_verification')),
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_type_expires ON auth_tokens(token_type, expires_at);

COMMENT ON TABLE auth_tokens IS 'Tokens for password reset and email verification';
