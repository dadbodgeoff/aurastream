#!/usr/bin/env python3
"""
Upload landing page assets to Supabase Storage.

This script uploads all generated images to the landing-assets bucket
with simplified filenames for easy reference.
"""

import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://qgyvdadgdomnubngfpun.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneXZkYWRnZG9tbnVibmdmcHVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjU0MTMzMiwiZXhwIjoyMDgyMTE3MzMyfQ.IzBqHwcX2XvMam_0tBcD3QY4HEdNmQIfZcjOhPjTeX8"
)

BUCKET_NAME = "landing-assets"

# Mapping of original filenames to simplified names
# Format: "original_time_suffix" -> "simplified_name"
FILE_MAPPINGS = {
    "Generated Image December 26, 2025 - 2_53PM.jpeg": "2_53.png",
    "Generated Image December 26, 2025 - 2_54PM.jpeg": "2_54.png",
    "Generated Image December 26, 2025 - 3_00PM.jpeg": "3_00.png",
    "Generated Image December 26, 2025 - 8_31PM.jpeg": "8_31.png",
    "Generated Image December 26, 2025 - 8_34PM.jpeg": "8_34.png",
    "Generated Image December 26, 2025 - 8_35PM.jpeg": "8_35.png",
    "Generated Image December 26, 2025 - 8_37PM.jpeg": "8_37.png",
    "Generated Image December 26, 2025 - 8_39PM.jpeg": "8_39.png",
    "Generated Image December 26, 2025 - 8_40PM.jpeg": "8_40.png",
    "Generated Image December 26, 2025 - 8_41PM.jpeg": "8_41.png",
    "Generated Image December 26, 2025 - 8_43PM.jpeg": "8_43.png",
    "Generated Image December 26, 2025 - 8_52PM.jpeg": "8_52.png",
    "Generated Image December 26, 2025 - 8_54PM.jpeg": "8_54.png",
    "Generated Image December 26, 2025 - 8_56PM.jpeg": "8_56.png",
}


def create_bucket_if_not_exists(supabase: Client, bucket_name: str) -> None:
    """Create the bucket if it doesn't exist."""
    try:
        # Try to get bucket info
        supabase.storage.get_bucket(bucket_name)
        print(f"✓ Bucket '{bucket_name}' already exists")
    except Exception:
        # Bucket doesn't exist, create it
        try:
            supabase.storage.create_bucket(
                bucket_name,
                options={
                    "public": True,
                    "file_size_limit": 10485760,  # 10MB
                    "allowed_mime_types": ["image/jpeg", "image/png", "image/webp"],
                }
            )
            print(f"✓ Created bucket '{bucket_name}'")
        except Exception as e:
            print(f"⚠ Could not create bucket (may already exist): {e}")


def upload_file(supabase: Client, local_path: str, remote_name: str) -> bool:
    """Upload a single file to Supabase Storage."""
    try:
        with open(local_path, "rb") as f:
            file_data = f.read()
        
        # Determine content type
        content_type = "image/jpeg" if local_path.endswith(".jpeg") or local_path.endswith(".jpg") else "image/png"
        
        # Upload to Supabase
        result = supabase.storage.from_(BUCKET_NAME).upload(
            path=remote_name,
            file=file_data,
            file_options={"content-type": content_type, "upsert": "true"}
        )
        
        print(f"✓ Uploaded: {remote_name}")
        return True
    except Exception as e:
        print(f"✗ Failed to upload {remote_name}: {e}")
        return False


def main():
    """Main function to upload all landing assets."""
    print("=" * 60)
    print("Uploading Landing Assets to Supabase")
    print("=" * 60)
    
    # Initialize Supabase client
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print(f"✓ Connected to Supabase: {SUPABASE_URL}")
    
    # Ensure bucket exists
    create_bucket_if_not_exists(supabase, BUCKET_NAME)
    
    # Get the repo root directory
    repo_root = Path(__file__).parent.parent
    
    # Upload each file
    success_count = 0
    fail_count = 0
    
    print("\nUploading files...")
    print("-" * 40)
    
    for original_name, simplified_name in FILE_MAPPINGS.items():
        local_path = repo_root / original_name
        
        if local_path.exists():
            if upload_file(supabase, str(local_path), simplified_name):
                success_count += 1
            else:
                fail_count += 1
        else:
            print(f"⚠ File not found: {original_name}")
            fail_count += 1
    
    # Summary
    print("-" * 40)
    print(f"\nUpload complete!")
    print(f"  ✓ Success: {success_count}")
    print(f"  ✗ Failed: {fail_count}")
    
    # Print public URLs
    print("\nPublic URLs:")
    print("-" * 40)
    for simplified_name in FILE_MAPPINGS.values():
        url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{simplified_name}"
        print(f"  {simplified_name}: {url}")


if __name__ == "__main__":
    main()
