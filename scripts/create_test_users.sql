-- ============================================================================
-- Create 10 Premium Test Users for AuraStream
-- ============================================================================
-- 
-- Email Pattern: tester1@aurastream.shop through tester10@aurastream.shop
-- Password: AuraTest2025!
-- Tier: Pro (active)
--
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Password hash for: AuraTest2025!
-- Generated with bcrypt cost factor 12
DO $$
DECLARE
    password_hash TEXT := '$2b$12$gWp5k0i9zuzT2I2scFJN7eefDFKGwmltCu6ePBuX58xoEwndfN1ry';
    i INTEGER;
BEGIN
    FOR i IN 1..10 LOOP
        -- Insert user with Pro tier
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
            TRUE,  -- Pre-verified
            password_hash,
            'Test User ' || i,
            'pro',
            'active',
            0,
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO NOTHING;  -- Skip if already exists
        
        RAISE NOTICE 'Created user: tester%@aurastream.shop', i;
    END LOOP;
END $$;

-- Verify the users were created
SELECT 
    email,
    display_name,
    subscription_tier,
    subscription_status,
    created_at
FROM users
WHERE email LIKE 'tester%@aurastream.shop'
ORDER BY email;
