-- Migration: 022_promo_chatroom.sql
-- Description: Promo chatroom tables for paid promotional messages with leaderboard
-- Created: 2025-01-01

-- ============================================================================
-- TABLES
-- ============================================================================

-- Tracks payment transactions for promo messages
CREATE TABLE IF NOT EXISTS promo_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_checkout_session_id TEXT UNIQUE,
    stripe_payment_intent_id TEXT UNIQUE,
    amount_cents INTEGER NOT NULL DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    pending_content TEXT,
    pending_link_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

COMMENT ON TABLE promo_payments IS 'Tracks Stripe payment transactions for promotional messages';
COMMENT ON COLUMN promo_payments.pending_content IS 'Message content stored during payment flow, moved to promo_messages on completion';
COMMENT ON COLUMN promo_payments.pending_link_url IS 'Optional link URL stored during payment flow';

-- Stores promotional messages posted by users
CREATE TABLE IF NOT EXISTS promo_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES promo_payments(id),
    content TEXT NOT NULL CHECK (char_length(content) <= 500),
    link_url TEXT CHECK (char_length(link_url) <= 500),
    link_preview JSONB,
    is_pinned BOOLEAN DEFAULT FALSE,
    reactions JSONB DEFAULT '{"fire": 0, "crown": 0, "heart": 0, "game": 0}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE promo_messages IS 'Promotional messages posted by users after payment';
COMMENT ON COLUMN promo_messages.link_preview IS 'Cached OpenGraph metadata for link_url';
COMMENT ON COLUMN promo_messages.is_pinned IS 'Only the current king can have a pinned message';
COMMENT ON COLUMN promo_messages.reactions IS 'Reaction counts: fire, crown, heart, game';
COMMENT ON COLUMN promo_messages.expires_at IS 'Messages expire after 30 days by default';

-- Cached leaderboard data for fast queries
CREATE TABLE IF NOT EXISTS promo_leaderboard_cache (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_donations_cents INTEGER NOT NULL DEFAULT 0,
    message_count INTEGER NOT NULL DEFAULT 0,
    last_donation_at TIMESTAMPTZ,
    rank INTEGER,
    is_king BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE promo_leaderboard_cache IS 'Cached leaderboard rankings based on 7-day rolling window';
COMMENT ON COLUMN promo_leaderboard_cache.is_king IS 'TRUE for the top donor (rank 1)';
COMMENT ON COLUMN promo_leaderboard_cache.total_donations_cents IS 'Sum of donations in the 7-day window';

-- Historical record of kings and their reigns
CREATE TABLE IF NOT EXISTS promo_hall_of_fame (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    reign_start TIMESTAMPTZ NOT NULL,
    reign_end TIMESTAMPTZ,
    total_donated_cents INTEGER NOT NULL,
    pinned_message_id UUID REFERENCES promo_messages(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE promo_hall_of_fame IS 'Historical record of users who held the king position';
COMMENT ON COLUMN promo_hall_of_fame.reign_end IS 'NULL if currently reigning';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- promo_payments indexes
CREATE INDEX IF NOT EXISTS idx_promo_payments_user_id 
    ON promo_payments(user_id);

CREATE INDEX IF NOT EXISTS idx_promo_payments_status 
    ON promo_payments(status);

CREATE INDEX IF NOT EXISTS idx_promo_payments_checkout_session 
    ON promo_payments(stripe_checkout_session_id);

-- promo_messages indexes
CREATE INDEX IF NOT EXISTS idx_promo_messages_user_id 
    ON promo_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_promo_messages_created_at 
    ON promo_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promo_messages_is_pinned 
    ON promo_messages(is_pinned) 
    WHERE is_pinned = TRUE;

CREATE INDEX IF NOT EXISTS idx_promo_messages_active 
    ON promo_messages(deleted_at, expires_at, created_at DESC) 
    WHERE deleted_at IS NULL;

-- promo_leaderboard_cache indexes
CREATE INDEX IF NOT EXISTS idx_promo_leaderboard_rank 
    ON promo_leaderboard_cache(rank);

CREATE INDEX IF NOT EXISTS idx_promo_leaderboard_total 
    ON promo_leaderboard_cache(total_donations_cents DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE promo_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_leaderboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_hall_of_fame ENABLE ROW LEVEL SECURITY;

-- promo_payments policies
DROP POLICY IF EXISTS promo_payments_select_own ON promo_payments;
CREATE POLICY promo_payments_select_own ON promo_payments
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS promo_payments_insert_own ON promo_payments;
CREATE POLICY promo_payments_insert_own ON promo_payments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS promo_payments_service_role ON promo_payments;
CREATE POLICY promo_payments_service_role ON promo_payments
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- promo_messages policies
DROP POLICY IF EXISTS promo_messages_select_active ON promo_messages;
CREATE POLICY promo_messages_select_active ON promo_messages
    FOR SELECT
    USING (deleted_at IS NULL AND expires_at > NOW());

DROP POLICY IF EXISTS promo_messages_update_own ON promo_messages;
CREATE POLICY promo_messages_update_own ON promo_messages
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS promo_messages_service_role ON promo_messages;
CREATE POLICY promo_messages_service_role ON promo_messages
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- promo_leaderboard_cache policies
DROP POLICY IF EXISTS promo_leaderboard_cache_select_all ON promo_leaderboard_cache;
CREATE POLICY promo_leaderboard_cache_select_all ON promo_leaderboard_cache
    FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS promo_leaderboard_cache_service_role ON promo_leaderboard_cache;
CREATE POLICY promo_leaderboard_cache_service_role ON promo_leaderboard_cache
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- promo_hall_of_fame policies
DROP POLICY IF EXISTS promo_hall_of_fame_select_all ON promo_hall_of_fame;
CREATE POLICY promo_hall_of_fame_select_all ON promo_hall_of_fame
    FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS promo_hall_of_fame_service_role ON promo_hall_of_fame;
CREATE POLICY promo_hall_of_fame_service_role ON promo_hall_of_fame
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Returns the UUID of the current king (top donor)
CREATE OR REPLACE FUNCTION get_current_king()
RETURNS UUID AS $func$
DECLARE
    king_id UUID;
BEGIN
    SELECT user_id INTO king_id
    FROM promo_leaderboard_cache
    WHERE is_king = TRUE
    LIMIT 1;
    
    RETURN king_id;
END;
$func$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_current_king() IS 'Returns the user_id of the current king (top donor in 7-day window)';

-- Unpins all messages and pins the king''s most recent active message
CREATE OR REPLACE FUNCTION update_pinned_message()
RETURNS VOID AS $func$
DECLARE
    current_king_id UUID;
    message_to_pin UUID;
BEGIN
    -- Get current king
    current_king_id := get_current_king();
    
    -- Unpin all messages
    UPDATE promo_messages
    SET is_pinned = FALSE
    WHERE is_pinned = TRUE;
    
    -- If there's a king, pin their most recent active message
    IF current_king_id IS NOT NULL THEN
        SELECT id INTO message_to_pin
        FROM promo_messages
        WHERE user_id = current_king_id
          AND deleted_at IS NULL
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1;
        
        IF message_to_pin IS NOT NULL THEN
            UPDATE promo_messages
            SET is_pinned = TRUE
            WHERE id = message_to_pin;
        END IF;
    END IF;
END;
$func$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_pinned_message() IS 'Unpins all messages and pins the current king''s most recent active message';

-- Recalculates the entire leaderboard from completed payments in 7-day window
CREATE OR REPLACE FUNCTION recalculate_promo_leaderboard()
RETURNS VOID AS $func$
DECLARE
    old_king_id UUID;
    new_king_id UUID;
    old_king_pinned_message UUID;
BEGIN
    -- Get current king before recalculation
    old_king_id := get_current_king();
    
    -- Get old king's pinned message for hall of fame
    IF old_king_id IS NOT NULL THEN
        SELECT id INTO old_king_pinned_message
        FROM promo_messages
        WHERE user_id = old_king_id
          AND is_pinned = TRUE
        LIMIT 1;
    END IF;
    
    -- Clear existing cache
    DELETE FROM promo_leaderboard_cache;
    
    -- Rebuild leaderboard from 7-day window of completed payments
    INSERT INTO promo_leaderboard_cache (
        user_id,
        total_donations_cents,
        message_count,
        last_donation_at,
        rank,
        is_king,
        updated_at
    )
    SELECT 
        p.user_id,
        SUM(p.amount_cents) AS total_donations_cents,
        COUNT(DISTINCT m.id) AS message_count,
        MAX(p.completed_at) AS last_donation_at,
        ROW_NUMBER() OVER (ORDER BY SUM(p.amount_cents) DESC, MAX(p.completed_at) ASC) AS rank,
        FALSE AS is_king,
        NOW() AS updated_at
    FROM promo_payments p
    LEFT JOIN promo_messages m ON m.payment_id = p.id
    WHERE p.status = 'completed'
      AND p.completed_at >= NOW() - INTERVAL '7 days'
    GROUP BY p.user_id;
    
    -- Set the king (rank 1)
    UPDATE promo_leaderboard_cache
    SET is_king = TRUE
    WHERE rank = 1;
    
    -- Get new king
    new_king_id := get_current_king();
    
    -- Handle king transition
    IF old_king_id IS DISTINCT FROM new_king_id THEN
        -- End old king's reign
        IF old_king_id IS NOT NULL THEN
            UPDATE promo_hall_of_fame
            SET reign_end = NOW()
            WHERE user_id = old_king_id
              AND reign_end IS NULL;
        END IF;
        
        -- Start new king's reign
        IF new_king_id IS NOT NULL THEN
            INSERT INTO promo_hall_of_fame (
                user_id,
                reign_start,
                total_donated_cents,
                pinned_message_id
            )
            SELECT 
                new_king_id,
                NOW(),
                total_donations_cents,
                NULL
            FROM promo_leaderboard_cache
            WHERE user_id = new_king_id;
        END IF;
    END IF;
    
    -- Update pinned message for new king
    PERFORM update_pinned_message();
    
    -- Update hall of fame with new pinned message
    IF new_king_id IS NOT NULL THEN
        UPDATE promo_hall_of_fame
        SET pinned_message_id = (
            SELECT id FROM promo_messages
            WHERE user_id = new_king_id
              AND is_pinned = TRUE
            LIMIT 1
        )
        WHERE user_id = new_king_id
          AND reign_end IS NULL;
    END IF;
END;
$func$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_promo_leaderboard() IS 'Rebuilds leaderboard cache from 7-day payment window and handles king transitions';
