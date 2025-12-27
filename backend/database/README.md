# Streamer Studio Database Documentation

## 1. Overview

This document provides comprehensive documentation for the Supabase database setup for **Streamer Studio**, a SaaS platform for content creators to generate streaming assets using AI.

### Database Architecture

The database is built on **PostgreSQL 14+** via **Supabase**, leveraging:
- **Row Level Security (RLS)** for data isolation between users
- **Automatic timestamps** via triggers for audit trails
- **RPC functions** for atomic operations
- **Optimized indexes** for common query patterns

### Tables Overview

| Table | Purpose |
|-------|---------|
| `users` | Core user accounts, authentication, and subscription status |
| `brand_kits` | User-defined branding configurations (colors, fonts, tone) |
| `generation_jobs` | Asset generation request tracking and status |
| `assets` | Generated assets with CDN references and metadata |
| `platform_connections` | OAuth connections to streaming platforms (Twitch, YouTube, TikTok) |
| `subscriptions` | Detailed subscription and billing information linked to Stripe |

---

## 2. Prerequisites

Before setting up the database, ensure you have:

- ✅ **Supabase Account** - Sign up at [supabase.com](https://supabase.com)
- ✅ **Supabase Project** - Create a new project in the Supabase dashboard
- ⭐ **Supabase CLI** (optional but recommended) - For local development and migrations
- ✅ **Required Environment Variables** - See [Environment Setup](#3-environment-setup)

---

## 3. Environment Setup

Create a `.env` file in the `backend/` directory with the following variables:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Finding Your Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy the following:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ **Security Warning**: Never expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code. This key bypasses RLS and should only be used on the backend.

---

## 4. Running Migrations

### Option A: Supabase Dashboard (Recommended for Initial Setup)

This is the simplest method for first-time setup:

1. Go to your [Supabase Project Dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `migrations/001_initial_schema.sql`
5. Paste into the SQL Editor
6. Click **Run** to execute the migration

### Option B: Supabase CLI

For teams and CI/CD pipelines:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (find project-ref in your dashboard URL)
supabase link --project-ref your-project-ref

# Push database changes
supabase db push

# Or run a specific migration file
supabase db execute --file migrations/001_initial_schema.sql
```

### Option C: Direct PostgreSQL Connection

For advanced users who prefer direct database access:

```bash
# Using psql (PostgreSQL client)
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" \
  -f migrations/001_initial_schema.sql
```

Find your database connection string in:
**Supabase Dashboard** → **Settings** → **Database** → **Connection string**

---

## 5. Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│    users (1) ──────┬──────────── (N) brand_kits                            │
│      │             │                                                        │
│      │             ├──────────── (N) generation_jobs ──── (N) assets       │
│      │             │                      │                                 │
│      │             │                      └── (self-ref) parent_job_id     │
│      │             │                                                        │
│      │             ├──────────── (N) platform_connections                  │
│      │             │                                                        │
│      └─────────────┴──────────── (1) subscriptions                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Table Schemas

#### `users`
Core user accounts and subscription status.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `email` | TEXT | Unique email address |
| `email_verified` | BOOLEAN | Email verification status |
| `password_hash` | TEXT | Hashed password (NULL for OAuth users) |
| `display_name` | TEXT | User's display name |
| `avatar_url` | TEXT | Profile picture URL |
| `subscription_tier` | TEXT | `free`, `pro`, or `studio` |
| `subscription_status` | TEXT | `active`, `past_due`, `canceled`, `none` |
| `stripe_customer_id` | TEXT | Stripe customer reference |
| `assets_generated_this_month` | INTEGER | Monthly usage counter |
| `created_at` | TIMESTAMPTZ | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

#### `brand_kits`
User-defined branding configurations for consistent asset generation.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to users |
| `name` | TEXT | Brand kit name |
| `is_active` | BOOLEAN | Whether this is the active brand kit |
| `primary_colors` | TEXT[] | Array of hex color codes |
| `accent_colors` | TEXT[] | Array of accent hex colors |
| `fonts` | JSONB | `{"headline": "Font", "body": "Font"}` |
| `logo_url` | TEXT | Brand logo URL |
| `tone` | TEXT | `competitive`, `casual`, `educational`, `comedic`, `professional` |
| `style_reference` | TEXT | Style reference description |
| `extracted_from` | TEXT | Source URL if auto-extracted |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

> 📝 **Note**: Only one brand kit per user can be active at a time (enforced by partial unique index).

#### `generation_jobs`
Tracks asset generation requests and their processing status.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to users |
| `parent_job_id` | UUID | Self-reference for batch/variation jobs |
| `status` | TEXT | `queued`, `processing`, `completed`, `failed`, `partial` |
| `job_type` | TEXT | `single`, `batch`, `variation` |
| `asset_type` | TEXT | `thumbnail`, `overlay`, `banner`, `story_graphic`, `clip_cover` |
| `custom_prompt` | TEXT | User-provided generation prompt |
| `brand_kit_id` | UUID | Foreign key to brand_kits |
| `platform_context` | JSONB | Platform-specific metadata |
| `total_assets` | INTEGER | Total assets to generate |
| `completed_assets` | INTEGER | Successfully completed count |
| `failed_assets` | INTEGER | Failed generation count |
| `queued_at` | TIMESTAMPTZ | When job was queued |
| `started_at` | TIMESTAMPTZ | When processing started |
| `completed_at` | TIMESTAMPTZ | When job completed |
| `error_message` | TEXT | Error details if failed |
| `retry_count` | INTEGER | Number of retry attempts |

#### `assets`
Generated assets with storage references and metadata.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to users |
| `job_id` | UUID | Foreign key to generation_jobs |
| `brand_kit_id` | UUID | Foreign key to brand_kits |
| `asset_type` | TEXT | Type of asset generated |
| `width` | INTEGER | Asset width in pixels |
| `height` | INTEGER | Asset height in pixels |
| `format` | TEXT | `png`, `jpeg`, `webp` |
| `cdn_url` | TEXT | Public CDN URL |
| `storage_key` | TEXT | Internal storage reference |
| `shareable_url` | TEXT | Public shareable link |
| `is_public` | BOOLEAN | Whether asset is publicly viewable |
| `prompt_used` | TEXT | Actual prompt used for generation |
| `generation_params` | JSONB | Full generation parameters |
| `viral_score` | INTEGER | AI-predicted viral potential (0-100) |
| `viral_suggestions` | TEXT[] | Improvement suggestions |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `expires_at` | TIMESTAMPTZ | Expiration date (NULL for paid users) |

#### `platform_connections`
OAuth connections to streaming platforms.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to users |
| `platform` | TEXT | `twitch`, `youtube`, `tiktok` |
| `platform_user_id` | TEXT | User ID on the platform |
| `platform_username` | TEXT | Username on the platform |
| `access_token_encrypted` | TEXT | Encrypted OAuth access token |
| `refresh_token_encrypted` | TEXT | Encrypted OAuth refresh token |
| `token_expires_at` | TIMESTAMPTZ | Token expiration time |
| `cached_metadata` | JSONB | Cached platform data |
| `metadata_updated_at` | TIMESTAMPTZ | When metadata was last refreshed |
| `is_active` | BOOLEAN | Connection status |

> 🔒 **Security**: Tokens are stored encrypted. One connection per platform per user (enforced by unique constraint).

#### `subscriptions`
Detailed subscription and billing information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to users (unique) |
| `tier` | TEXT | `free`, `pro`, `studio` |
| `status` | TEXT | `active`, `past_due`, `canceled`, `trialing` |
| `stripe_subscription_id` | TEXT | Stripe subscription reference |
| `stripe_price_id` | TEXT | Stripe price reference |
| `current_period_start` | TIMESTAMPTZ | Billing period start |
| `current_period_end` | TIMESTAMPTZ | Billing period end |
| `cancel_at_period_end` | BOOLEAN | Scheduled for cancellation |
| `assets_limit` | INTEGER | Monthly limit: 5 (free), 100 (pro), -1 (unlimited) |
| `assets_used` | INTEGER | Assets used this period |
| `platforms_limit` | INTEGER | Platform limit: 1 (free), 3 (pro), -1 (unlimited) |

---

## 6. Row Level Security (RLS)

All tables have **Row Level Security enabled** to ensure data isolation between users.

### Security Model

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `users` | Own data only | - | Own data only | - |
| `brand_kits` | Own data only | Own data only | Own data only | Own data only |
| `generation_jobs` | Own data only | Own data only | Own data only | - |
| `assets` | Own OR public | Own data only | Own data only | Own data only |
| `platform_connections` | Own data only | Own data only | Own data only | Own data only |
| `subscriptions` | Own data only | - | - | - |

### Key Points

- ✅ **Users can only access their own data** - Enforced via `auth.uid() = user_id`
- ✅ **Public assets are viewable by all** - Assets with `is_public = TRUE` can be viewed by anyone
- ✅ **Service role key bypasses RLS** - Use for backend operations that need full access
- ⚠️ **Anon key respects RLS** - Always use for client-side operations

### Bypassing RLS (Backend Only)

```python
from supabase import create_client

# This client bypasses RLS - use only on backend!
supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY  # Not the anon key!
)
```

---

## 7. RPC Functions

The database includes RPC functions for atomic operations that need to update multiple tables.

### `increment_user_usage(p_user_id UUID)`

Atomically increments asset usage counters in both `users` and `subscriptions` tables.

```sql
-- Call via Supabase client
SELECT increment_user_usage('user-uuid-here');
```

**Python usage:**
```python
supabase.rpc('increment_user_usage', {'p_user_id': user_id}).execute()
```

### `reset_monthly_usage(p_user_id UUID)`

Resets monthly usage counters at billing cycle reset.

```sql
-- Call via Supabase client
SELECT reset_monthly_usage('user-uuid-here');
```

**Python usage:**
```python
supabase.rpc('reset_monthly_usage', {'p_user_id': user_id}).execute()
```

---

## 8. Verification

After running the migration, verify everything was created correctly:

### Check All Tables Exist

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Expected output:**
```
 table_name
--------------------
 assets
 brand_kits
 generation_jobs
 platform_connections
 subscriptions
 users
```

### Check RLS is Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected output:** All tables should show `rowsecurity = true`

### Check Indexes Exist

```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Check Functions Exist

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';
```

**Expected functions:**
- `increment_user_usage`
- `reset_monthly_usage`
- `update_updated_at_column`

### Check Triggers Exist

```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

---

## 9. Troubleshooting

### Common Issues and Solutions

#### RLS Blocking Queries

**Symptom:** Queries return empty results or permission denied errors.

**Solution:** 
- Ensure the user is authenticated via Supabase Auth
- For backend operations, use the service role key
- Check that `auth.uid()` matches the `user_id` in the row

```python
# Backend: Use service role key to bypass RLS
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
```

#### Foreign Key Constraint Errors

**Symptom:** `insert or update on table violates foreign key constraint`

**Solution:**
- Ensure referenced records exist before inserting
- Check table creation order in migrations
- Verify UUIDs are valid and exist in parent tables

```sql
-- Check if user exists before inserting brand_kit
SELECT id FROM users WHERE id = 'your-user-uuid';
```

#### Function Already Exists

**Symptom:** `function already exists with same argument types`

**Solution:** Use `CREATE OR REPLACE FUNCTION` instead of `CREATE FUNCTION`

#### Unique Constraint Violations

**Symptom:** `duplicate key value violates unique constraint`

**Solution:**
- For `users.email`: Email already registered
- For `platform_connections`: User already connected this platform
- For `brand_kits.is_active`: User already has an active brand kit

```sql
-- Deactivate existing brand kit before activating new one
UPDATE brand_kits SET is_active = FALSE WHERE user_id = 'user-uuid' AND is_active = TRUE;
```

#### Migration Partially Applied

**Symptom:** Some tables exist but others don't

**Solution:**
1. Check which tables exist
2. Drop all tables and re-run migration, OR
3. Run only the missing sections

```sql
-- Nuclear option: Drop all and start fresh (CAUTION: destroys data!)
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS generation_jobs CASCADE;
DROP TABLE IF EXISTS brand_kits CASCADE;
DROP TABLE IF EXISTS platform_connections CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

---

## 10. Development Tips

### Use Supabase Studio

Access the visual database manager at:
`https://app.supabase.com/project/[your-project-ref]/editor`

Features:
- Visual table editor
- SQL query runner
- Real-time logs
- API documentation

### Enable Realtime for Live Updates

For tables that need live updates (e.g., `generation_jobs` status):

```sql
-- Enable realtime for a table
ALTER PUBLICATION supabase_realtime ADD TABLE generation_jobs;
```

**Client-side subscription:**
```javascript
supabase
  .channel('job-updates')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'generation_jobs' },
    (payload) => console.log('Job updated:', payload)
  )
  .subscribe()
```

### Service Role Key Best Practices

- ✅ **DO** use service role key only on the backend
- ✅ **DO** store it in environment variables
- ❌ **DON'T** expose it in client-side code
- ❌ **DON'T** commit it to version control

### Local Development with Supabase CLI

```bash
# Start local Supabase instance
supabase start

# Run migrations locally
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > types/supabase.ts
```

### Useful Queries for Development

```sql
-- Get user with all related data
SELECT 
  u.*,
  (SELECT COUNT(*) FROM brand_kits WHERE user_id = u.id) as brand_kit_count,
  (SELECT COUNT(*) FROM assets WHERE user_id = u.id) as asset_count,
  (SELECT COUNT(*) FROM platform_connections WHERE user_id = u.id) as connection_count
FROM users u
WHERE u.id = 'user-uuid';

-- Get recent generation jobs with asset counts
SELECT 
  gj.*,
  (SELECT COUNT(*) FROM assets WHERE job_id = gj.id) as actual_asset_count
FROM generation_jobs gj
WHERE gj.user_id = 'user-uuid'
ORDER BY gj.created_at DESC
LIMIT 10;

-- Check subscription usage
SELECT 
  s.tier,
  s.assets_used,
  s.assets_limit,
  CASE 
    WHEN s.assets_limit = -1 THEN 'Unlimited'
    ELSE CONCAT(s.assets_used, '/', s.assets_limit)
  END as usage_display
FROM subscriptions s
WHERE s.user_id = 'user-uuid';
```

---

## 11. Migration History

| Version | File | Description | Date |
|---------|------|-------------|------|
| 1.0.0 | `001_initial_schema.sql` | Initial database schema | 2024 |

---

## 12. Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

*Last updated: 2024*
