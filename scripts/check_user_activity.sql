-- ============================================================================
-- Check User Activity: Logins & Generations
-- Run in Supabase SQL Editor
-- ============================================================================

-- 1. All test users with activity summary
SELECT 
    u.email,
    u.display_name,
    u.subscription_tier,
    -- Login detection: last_login_at is set on actual login
    CASE 
        WHEN u.last_login_at IS NOT NULL THEN '✅ Yes'
        ELSE '❌ No'
    END as logged_in,
    u.last_login_at,
    -- Asset generation
    u.assets_generated_this_month as monthly_usage,
    COALESCE(a.total_assets, 0) as total_assets,
    COALESCE(j.total_jobs, 0) as total_jobs,
    COALESCE(j.completed_jobs, 0) as completed_jobs,
    u.created_at::date as created
FROM users u
LEFT JOIN (
    SELECT user_id, COUNT(*) as total_assets
    FROM assets GROUP BY user_id
) a ON u.id = a.user_id
LEFT JOIN (
    SELECT user_id, 
           COUNT(*) as total_jobs,
           COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs
    FROM generation_jobs GROUP BY user_id
) j ON u.id = j.user_id
WHERE u.email LIKE 'tester%@aurastream.shop'
ORDER BY u.last_login_at DESC NULLS LAST;

-- 2. Quick summary
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE last_login_at IS NOT NULL) as logged_in,
    COUNT(*) FILTER (WHERE assets_generated_this_month > 0) as generated_assets,
    SUM(assets_generated_this_month) as total_generations
FROM users
WHERE email LIKE 'tester%@aurastream.shop';

-- 3. Users who logged in but haven't generated anything
SELECT email, display_name, last_login_at
FROM users
WHERE email LIKE 'tester%@aurastream.shop'
  AND last_login_at IS NOT NULL
  AND assets_generated_this_month = 0
ORDER BY last_login_at DESC;

-- 4. Users who generated assets (most active first)
SELECT 
    email, 
    display_name,
    assets_generated_this_month as generations,
    last_login_at
FROM users
WHERE email LIKE 'tester%@aurastream.shop'
  AND assets_generated_this_month > 0
ORDER BY assets_generated_this_month DESC;

-- 5. Users who NEVER logged in
SELECT email, display_name, created_at
FROM users
WHERE email LIKE 'tester%@aurastream.shop'
  AND last_login_at IS NULL
ORDER BY created_at;
