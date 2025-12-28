-- ============================================================================
-- Add last_login_at column to track actual logins
-- ============================================================================

-- Add the column
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Create index for querying active users
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at DESC NULLS LAST);

-- Comment
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of last successful login';
