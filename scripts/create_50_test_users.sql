-- ============================================================================
-- Create 50 Test Users for AuraStream
-- ============================================================================
-- 
-- Email Pattern: tester1@aurastream.shop through tester50@aurastream.shop
-- Password: AuraTest2025!
-- Tier: Pro (active)
--
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Password hash for: AuraTest2025!
DO $$
DECLARE
    password_hash TEXT := '$2b$12$gWp5k0i9zuzT2I2scFJN7eefDFKGwmltCu6ePBuX58xoEwndfN1ry';
    i INTEGER;
BEGIN
    FOR i IN 1..50 LOOP
        INSERT INTO users (
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
            'tester' || i || '@aurastream.shop',
            TRUE,
            password_hash,
            'Test User ' || i,
            'pro',
            'active',
            0,
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO NOTHING;
        
        RAISE NOTICE 'Created user: tester%@aurastream.shop', i;
    END LOOP;
END $$;

-- Verify
SELECT COUNT(*) as total_test_users 
FROM users 
WHERE email LIKE 'tester%@aurastream.shop';
