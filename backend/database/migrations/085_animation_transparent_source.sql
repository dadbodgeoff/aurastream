    -- Migration: Add transparent_source_url to alert_animation_projects
    -- Purpose: Store background-removed version of source image

    ALTER TABLE alert_animation_projects
    ADD COLUMN IF NOT EXISTS transparent_source_url TEXT;

    COMMENT ON COLUMN alert_animation_projects.transparent_source_url IS 
        'URL of the source image with background removed (via rembg)';
