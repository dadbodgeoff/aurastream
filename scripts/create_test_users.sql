-- ============================================================================
-- Create 10 Premium Test Users for AuraStream
-- ============================================================================
-- 
-- Email Pattern: tester1@aurastream.shop through tester10@aurastream.shop
-- Password: AuraTest2025!
-- Tier: Pro (expires January 24, 2026 - 28 days from Dec 27, 2025)
--
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Password hash for: AuraTest2025!
-- Generated with bcrypt cost factor 12
DO $$
DECLARE
    password_hash TEXT := '$2b$12$gWp5k0i9zuzT2I2scFJN7eefDFKGwmltCu6ePBuX58xoEwndfN1ry';
    trial_end TIMESTAMPTZ := '2026-01-24 23:59:59+00';
    user_id UUID;
    i INTEGER;
BEGIN
    FOR i IN 1..10 LOOP
        -- Generate a new UUID for each user
        user_id := gen_random_uuid();
        
        -- Insert user
        INSERT INTO users (
            id,
            email,
            email_verified,
            password_hash,
            display_name,
            subscription_tier,
            subscription_status,
            assets_generated_this_month,
            created_at,
            updated_at
        ) VALUES (
            user_id,
            'tester' || i || '@aurastream.shop',
            TRUE,  -- Pre-verified
            password_hash,
            'Test User ' || i,
            'pro',
            'active',
            0,
            NOW(),
            NOW()
        );
        
        -- Insert subscription record
        INSERT INTO subscriptions (
            user_id,
            tier,
            status,
            current_period_start,
            current_period_end,
            cancel_at_period_end,
            assets_limit,
            assets_used,
            platforms_limit
        ) VALUES (
            user_id,
            'pro',
            'trialing',  -- Mark as trial so they know it expires
            NOW(),
            trial_end,
            TRUE,  -- Will cancel at period end (they need to pay to continue)
            50,    -- Pro tier: 50 assets/month
            0,
            3      -- Pro tier: 3 platform connections
        );
        
        RAISE NOTICE 'Created user: tester%@aurastream.shop', i;
    END LOOP;
END $$;

-- Verify the users were created
SELECT 
    u.email,
    u.display_name,
    u.subscription_tier,
    u.subscription_status,
    s.current_period_end as trial_expires
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id
WHERE u.email LIKE 'tester%@aurastream.shop'
ORDER BY u.email;
