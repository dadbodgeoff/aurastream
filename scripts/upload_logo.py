#!/usr/bin/env python3
"""
Upload AuraStream logo to Supabase Storage.

This script uploads the logo to a public bucket and returns the public URL.
"""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from supabase import create_client, Client


def upload_logo():
    """Upload the AuraStream logo to Supabase storage."""
    
    # Get credentials from environment or .env
    supabase_url = os.environ.get("SUPABASE_URL")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not service_role_key:
        # Try loading from .env
        env_path = Path(__file__).parent.parent / "backend" / ".env"
        if env_path.exists():
            with open(env_path) as f:
                for line in f:
                    if line.startswith("SUPABASE_URL="):
                        supabase_url = line.split("=", 1)[1].strip()
                    elif line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                        service_role_key = line.split("=", 1)[1].strip()
    
    if not supabase_url or not service_role_key:
        print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    
    # Logo file path
    logo_path = Path.home() / "Downloads" / "AuraStreamLogo-removebg-preview.png"
    
    if not logo_path.exists():
        print(f"Error: Logo file not found at {logo_path}")
        sys.exit(1)
    
    print(f"Uploading logo from: {logo_path}")
    print(f"Supabase URL: {supabase_url}")
    
    # Create Supabase client with service role key
    supabase: Client = create_client(supabase_url, service_role_key)
    
    # Bucket name for public assets
    bucket_name = "public-assets"
    
    # Check if bucket exists, create if not
    try:
        buckets = supabase.storage.list_buckets()
        bucket_exists = any(b.name == bucket_name for b in buckets)
        
        if not bucket_exists:
            print(f"Creating bucket: {bucket_name}")
            supabase.storage.create_bucket(
                bucket_name,
                options={
                    "public": True,
                    "file_size_limit": 5242880,  # 5MB
                    "allowed_mime_types": ["image/png", "image/jpeg", "image/svg+xml", "image/webp"]
                }
            )
            print(f"Bucket '{bucket_name}' created successfully")
        else:
            print(f"Bucket '{bucket_name}' already exists")
    except Exception as e:
        print(f"Bucket check/create error: {e}")
    
    # Read logo file
    with open(logo_path, "rb") as f:
        logo_data = f.read()
    
    # Upload path in bucket
    storage_path = "branding/aurastream-logo.png"
    
    # Upload the file
    try:
        # Try to remove existing file first
        try:
            supabase.storage.from_(bucket_name).remove([storage_path])
            print(f"Removed existing file at {storage_path}")
        except:
            pass
        
        result = supabase.storage.from_(bucket_name).upload(
            storage_path,
            logo_data,
            file_options={
                "content-type": "image/png",
                "cache-control": "public, max-age=31536000",  # 1 year cache
                "upsert": "true"
            }
        )
        print(f"Upload result: {result}")
    except Exception as e:
        print(f"Upload error: {e}")
        # Try with upsert
        try:
            result = supabase.storage.from_(bucket_name).update(
                storage_path,
                logo_data,
                file_options={
                    "content-type": "image/png",
                    "cache-control": "public, max-age=31536000"
                }
            )
            print(f"Update result: {result}")
        except Exception as e2:
            print(f"Update also failed: {e2}")
            sys.exit(1)
    
    # Get public URL
    public_url = supabase.storage.from_(bucket_name).get_public_url(storage_path)
    
    print("\n" + "=" * 60)
    print("LOGO UPLOADED SUCCESSFULLY!")
    print("=" * 60)
    print(f"\nPublic URL: {public_url}")
    print("\nAdd this to your environment config:")
    print(f'AURASTREAM_LOGO_URL="{public_url}"')
    print("=" * 60)
    
    return public_url


if __name__ == "__main__":
    upload_logo()
