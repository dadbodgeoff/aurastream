-- =============================================================================
-- Check Test Users Activity (users 1-30)
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Show test users with their login and asset activity
SELECT 
    u.email,
    u.display_name,
    u.subscription_tier,
    u.created_at,
    u.updated_at,
    -- Check if they've logged in (updated_at > created_at suggests activity)
    CASE WHEN u.updated_at > u.created_at + INTERVAL '1 minute' THEN 'Yes' ELSE 'No' END as has_logged_in,
    -- Count their assets
    COALESCE(asset_counts.asset_count, 0) as assets_created,
    -- Count their generation jobs
    COALESCE(job_counts.job_count, 0) as jobs_created,
    -- Count their brand kits
    COALESCE(bk_counts.brand_kit_count, 0) as brand_kits_created,
    -- Usage this month
    u.assets_generated_this_month
FROM users u
LEFT JOIN (
    SELECT user_id, COUNT(*) as asset_count 
    FROM assets 
    GROUP BY user_id
) asset_counts ON u.id = asset_counts.user_id
LEFT JOIN (
    SELECT user_id, COUNT(*) as job_count 
    FROM generation_jobs 
    GROUP BY user_id
) job_counts ON u.id = job_counts.user_id
LEFT JOIN (
    SELECT user_id, COUNT(*) as brand_kit_count 
    FROM brand_kits 
    GROUP BY user_id
) bk_counts ON u.id = bk_counts.user_id
WHERE u.email LIKE 'testuser%@aurastream.test'
   OR u.email LIKE 'test%@example.com'
   OR u.display_name LIKE 'Test User%'
ORDER BY u.created_at DESC;

-- =============================================================================
-- Summary Stats
-- =============================================================================

SELECT 
    'Test Users Summary' as metric,
    COUNT(*) as total_test_users,
    COUNT(CASE WHEN u.updated_at > u.created_at + INTERVAL '1 minute' THEN 1 END) as users_with_activity,
    SUM(COALESCE(asset_counts.asset_count, 0)) as total_assets,
    SUM(COALESCE(job_counts.job_count, 0)) as total_jobs,
    SUM(COALESCE(bk_counts.brand_kit_count, 0)) as total_brand_kits
FROM users u
LEFT JOIN (
    SELECT user_id, COUNT(*) as asset_count 
    FROM assets 
    GROUP BY user_id
) asset_counts ON u.id = asset_counts.user_id
LEFT JOIN (
    SELECT user_id, COUNT(*) as job_count 
    FROM generation_jobs 
    GROUP BY user_id
) job_counts ON u.id = job_counts.user_id
LEFT JOIN (
    SELECT user_id, COUNT(*) as brand_kit_count 
    FROM brand_kits 
    GROUP BY user_id
) bk_counts ON u.id = bk_counts.user_id
WHERE u.email LIKE 'testuser%@aurastream.test'
   OR u.email LIKE 'test%@example.com'
   OR u.display_name LIKE 'Test User%';
