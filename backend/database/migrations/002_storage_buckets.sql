-- ============================================================================
-- Migration: 002_storage_buckets.sql
-- Version: 1.0.0
-- Description: Storage bucket configuration for Streamer Studio
-- Date: 2024
-- ============================================================================

-- ============================================================================
-- STORAGE BUCKETS
-- Supabase uses the storage schema for bucket management
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Assets Bucket (Public)
-- Purpose: Generated assets (thumbnails, overlays, banners, etc.)
-- Access: Public read access for serving generated content
-- Max Size: 50MB
-- Allowed Types: PNG, JPEG, WebP images
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'assets',
    'assets',
    true,
    52428800,  -- 50MB in bytes
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 2. Uploads Bucket (Private)
-- Purpose: User uploads for brand kit extraction
-- Access: Owner-only access (private)
-- Max Size: 100MB
-- Allowed Types: PNG, JPEG, WebP images, MP4, WebM videos
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'uploads',
    'uploads',
    false,
    104857600,  -- 100MB in bytes
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 3. Logos Bucket (Private)
-- Purpose: Brand kit logos (primary, secondary, icon, monochrome, watermark)
-- Access: Owner-only access (private)
-- Max Size: 10MB
-- Allowed Types: PNG, JPEG, WebP, SVG images
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'logos',
    'logos',
    false,
    10485760,  -- 10MB in bytes
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 4. Brand Assets Bucket (Private)
-- Purpose: Streamer brand assets (overlays, alerts, panels, emotes, badges, etc.)
-- Access: Owner-only access (private)
-- Max Size: 50MB
-- Allowed Types: PNG, JPEG, WebP, GIF images, MP4/WebM videos, MP3/WAV audio
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'brand-assets',
    'brand-assets',
    false,
    52428800,  -- 50MB in bytes
    ARRAY[
        'image/png', 
        'image/jpeg', 
        'image/webp', 
        'image/gif',
        'video/mp4', 
        'video/webm',
        'audio/mpeg',
        'audio/wav'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- STORAGE RLS POLICIES
-- ============================================================================
-- IMPORTANT: Storage policies CANNOT be created via SQL Editor.
-- Supabase owns the storage.objects table internally.
-- 
-- Configure storage policies via Supabase Dashboard:
-- 1. Go to Storage > Policies in your Supabase Dashboard
-- 2. Create the following policies for each bucket:
--
-- ASSETS BUCKET (Public Read, Authenticated Write):
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Policy: "Public read access"                                            │
-- │ Operation: SELECT                                                       │
-- │ Target roles: (leave empty for public)                                  │
-- │ Policy definition: true                                                 │
-- ├─────────────────────────────────────────────────────────────────────────┤
-- │ Policy: "Authenticated users can upload"                                │
-- │ Operation: INSERT                                                       │
-- │ Target roles: authenticated                                             │
-- │ Policy definition: (storage.foldername(name))[1] = auth.uid()::text    │
-- ├─────────────────────────────────────────────────────────────────────────┤
-- │ Policy: "Users can update own files"                                    │
-- │ Operation: UPDATE                                                       │
-- │ Target roles: authenticated                                             │
-- │ Policy definition: (storage.foldername(name))[1] = auth.uid()::text    │
-- ├─────────────────────────────────────────────────────────────────────────┤
-- │ Policy: "Users can delete own files"                                    │
-- │ Operation: DELETE                                                       │
-- │ Target roles: authenticated                                             │
-- │ Policy definition: (storage.foldername(name))[1] = auth.uid()::text    │
-- └─────────────────────────────────────────────────────────────────────────┘
--
-- UPLOADS BUCKET (Owner-Only):
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Policy: "Users can read own uploads"                                    │
-- │ Operation: SELECT                                                       │
-- │ Target roles: authenticated                                             │
-- │ Policy definition: (storage.foldername(name))[1] = auth.uid()::text    │
-- ├─────────────────────────────────────────────────────────────────────────┤
-- │ Policy: "Users can upload to own folder"                                │
-- │ Operation: INSERT                                                       │
-- │ Target roles: authenticated                                             │
-- │ Policy definition: (storage.foldername(name))[1] = auth.uid()::text    │
-- ├─────────────────────────────────────────────────────────────────────────┤
-- │ Policy: "Users can update own uploads"                                  │
-- │ Operation: UPDATE                                                       │
-- │ Target roles: authenticated                                             │
-- │ Policy definition: (storage.foldername(name))[1] = auth.uid()::text    │
-- ├─────────────────────────────────────────────────────────────────────────┤
-- │ Policy: "Users can delete own uploads"                                  │
-- │ Operation: DELETE                                                       │
-- │ Target roles: authenticated                                             │
-- │ Policy definition: (storage.foldername(name))[1] = auth.uid()::text    │
-- └─────────────────────────────────────────────────────────────────────────┘
--
-- LOGOS BUCKET (Owner-Only):
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Policy: "Users can read own logos"                                      │
-- │ Operation: SELECT                                                       │
-- │ Target roles: authenticated                                             │
-- │ Policy definition: (storage.foldername(name))[1] = auth.uid()::text    │
-- ├─────────────────────────────────────────────────────────────────────────┤
-- │ Policy: "Users can upload logos"                                        │
-- │ Operation: INSERT                                                       │
-- │ Target roles: authenticated                                             │
-- │ Policy definition: (storage.foldername(name))[1] = auth.uid()::text    │
-- ├─────────────────────────────────────────────────────────────────────────┤
-- │ Policy: "Users can update own logos"                                    │
-- │ Operation: UPDATE                                                       │
-- │ Target roles: authenticated                                             │
-- │ Policy definition: (storage.foldername(name))[1] = auth.uid()::text    │
-- ├─────────────────────────────────────────────────────────────────────────┤
-- │ Policy: "Users can delete own logos"                                    │
-- │ Operation: DELETE                                                       │
-- │ Target roles: authenticated                                             │
-- │ Policy definition: (storage.foldername(name))[1] = auth.uid()::text    │
-- └─────────────────────────────────────────────────────────────────────────┘
--
-- BRAND-ASSETS BUCKET (Owner-Only):
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Policy: "Users can read own brand assets"                               │
-- │ Operation: SELECT                                                       │
-- │ Target roles: authenticated                                             │
-- │ Policy definition: (storage.foldername(name))[1] = auth.uid()::text    │
-- ├─────────────────────────────────────────────────────────────────────────┤
-- │ Policy: "Users can upload brand assets"                                 │
-- │ Operation: INSERT                                                       │
-- │ Target roles: authenticated                                             │
-- │ Policy definition: (storage.foldername(name))[1] = auth.uid()::text    │
-- ├─────────────────────────────────────────────────────────────────────────┤
-- │ Policy: "Users can update own brand assets"                             │
-- │ Operation: UPDATE                                                       │
-- │ Target roles: authenticated                                             │
-- │ Policy definition: (storage.foldername(name))[1] = auth.uid()::text    │
-- ├─────────────────────────────────────────────────────────────────────────┤
-- │ Policy: "Users can delete own brand assets"                             │
-- │ Operation: DELETE                                                       │
-- │ Target roles: authenticated                                             │
-- │ Policy definition: (storage.foldername(name))[1] = auth.uid()::text    │
-- └─────────────────────────────────────────────────────────────────────────┘
--
-- File path convention: {user_id}/{filename}
-- Example: "550e8400-e29b-41d4-a716-446655440000/thumbnail.png"
-- ============================================================================

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these queries to verify bucket configuration
-- ============================================================================

-- Verify all buckets were created
-- SELECT id, name, public, file_size_limit, allowed_mime_types
-- FROM storage.buckets
-- WHERE id IN ('assets', 'uploads', 'logos', 'brand-assets');

-- Verify assets bucket configuration
-- SELECT * FROM storage.buckets WHERE id = 'assets';
-- Expected: public = true, file_size_limit = 52428800

-- Verify uploads bucket configuration
-- SELECT * FROM storage.buckets WHERE id = 'uploads';
-- Expected: public = false, file_size_limit = 104857600

-- Verify logos bucket configuration
-- SELECT * FROM storage.buckets WHERE id = 'logos';
-- Expected: public = false, file_size_limit = 10485760

-- Verify brand-assets bucket configuration
-- SELECT * FROM storage.buckets WHERE id = 'brand-assets';
-- Expected: public = false, file_size_limit = 52428800

-- Verify storage policies were created
-- SELECT policyname, tablename, cmd
-- FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects';
