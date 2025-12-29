#!/usr/bin/env python3
"""Upload banner images to Supabase Storage."""

from supabase import create_client

# Supabase credentials
SUPABASE_URL = "https://qgyvdadgdomnubngfpun.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneXZkYWRnZG9tbnVibmdmcHVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjU0MTMzMiwiZXhwIjoyMDgyMTE3MzMyfQ.IzBqHwcX2XvMam_0tBcD3QY4HEdNmQIfZcjOhPjTeX8"

BUCKET_NAME = "banners"

# Images to upload: (local_path, remote_name)
IMAGES = [
    ("backend/database/migrations/vibebrandingslide.jpg", "vibe-branding-slide.jpg"),
    ("backend/database/migrations/communityslide.jpg", "community-slide.jpg"),
    ("backend/database/migrations/twitchslide.jpg", "twitch-slide.jpg"),
]

def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Ensure bucket exists
    try:
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        if BUCKET_NAME not in bucket_names:
            print(f"Creating bucket '{BUCKET_NAME}'...")
            supabase.storage.create_bucket(BUCKET_NAME, options={"public": True})
    except Exception as e:
        print(f"Bucket check: {e}")
    
    urls = {}
    for local_path, remote_name in IMAGES:
        with open(local_path, "rb") as f:
            image_data = f.read()
        
        print(f"Uploading {remote_name} ({len(image_data)} bytes)...")
        
        try:
            supabase.storage.from_(BUCKET_NAME).remove([remote_name])
        except:
            pass
        
        supabase.storage.from_(BUCKET_NAME).upload(
            remote_name,
            image_data,
            file_options={"content-type": "image/jpeg", "upsert": "true"}
        )
        
        url = supabase.storage.from_(BUCKET_NAME).get_public_url(remote_name)
        urls[remote_name] = url
        print(f"  ✅ {url}")
    
    print("\n=== All URLs ===")
    for name, url in urls.items():
        print(f"{name}: {url}")

if __name__ == "__main__":
    main()
