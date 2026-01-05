#!/usr/bin/env python3
"""
Upload Arc Raiders Assets to Community Hub

Compresses images and uploads them to Supabase storage,
then inserts records into the community_hub_assets table.

Usage:
    cd "streamer suite"
    source backend/venv/bin/activate
    pip install Pillow supabase
    python scripts/upload_arc_raiders_assets.py
"""

import os
import sys
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone
import io

try:
    from PIL import Image
    from supabase import create_client
except ImportError:
    print("Missing dependencies. Run:")
    print("  pip install Pillow supabase")
    sys.exit(1)

# =============================================================================
# Configuration
# =============================================================================

# Load from environment or .env file
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://qgyvdadgdomnubngfpun.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_KEY:
    # Try loading from .env
    env_path = Path(__file__).parent.parent / "backend" / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                SUPABASE_KEY = line.split("=", 1)[1].strip()
                break

if not SUPABASE_KEY:
    print("ERROR: SUPABASE_SERVICE_ROLE_KEY not found")
    sys.exit(1)

STORAGE_BUCKET = "community-hub-assets"
GAME_CATEGORY = "arc_raiders"
GAME_NAME = "Arc Raiders"
GAME_COLOR = "#00d4ff"  # Arc Raiders cyan/blue

# Asset folders - absolute paths in Downloads
DOWNLOADS_PATH = Path.home() / "Downloads"
ASSET_FOLDERS = {
    DOWNLOADS_PATH / "Concept Art": {"asset_type": "reference", "prefix": "concept"},
    DOWNLOADS_PATH / "Game Screenshots": {"asset_type": "background", "prefix": "screenshot"},
    DOWNLOADS_PATH / "Media Kit": {"asset_type": "background", "prefix": "media"},
}

# Compression settings
MAX_DIMENSION = 1920  # Max width/height
JPEG_QUALITY = 85     # High quality JPEG
PNG_OPTIMIZE = True   # Optimize PNG


# =============================================================================
# Image Processing
# =============================================================================

def compress_image(path: Path) -> tuple[bytes, str, int, int]:
    """
    Compress image while maintaining quality.
    
    Returns: (compressed_bytes, mime_type, width, height)
    """
    with Image.open(path) as img:
        original_size = path.stat().st_size
        
        # Determine output format
        if img.mode == 'RGBA' or path.suffix.lower() == '.png':
            # Keep PNG for transparency
            output_format = 'PNG'
            mime_type = 'image/png'
        else:
            # Convert to JPEG for better compression
            img = img.convert('RGB')
            output_format = 'JPEG'
            mime_type = 'image/jpeg'
        
        # Resize if larger than max dimension
        width, height = img.size
        if max(width, height) > MAX_DIMENSION:
            img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)
            width, height = img.size
        
        # Compress
        buffer = io.BytesIO()
        if output_format == 'PNG':
            img.save(buffer, format='PNG', optimize=PNG_OPTIMIZE)
        else:
            img.save(buffer, format='JPEG', quality=JPEG_QUALITY, optimize=True)
        
        compressed_bytes = buffer.getvalue()
        compressed_size = len(compressed_bytes)
        
        ratio = (1 - compressed_size / original_size) * 100
        print(f"  Compressed: {original_size/1024:.1f}KB → {compressed_size/1024:.1f}KB ({ratio:.1f}% reduction)")
        
        return compressed_bytes, mime_type, width, height


def get_display_name(filename: str) -> str:
    """Convert filename to display name."""
    # Remove extension and prefix
    name = Path(filename).stem
    # Remove "ARC - " prefix if present
    if name.startswith("ARC - "):
        name = name[6:]
    # Clean up
    return name.replace("_", " ").replace("-", " ").strip()


# =============================================================================
# Supabase Operations
# =============================================================================

def ensure_bucket_exists(client):
    """Create storage bucket if it doesn't exist."""
    try:
        client.storage.get_bucket(STORAGE_BUCKET)
        print(f"✓ Bucket '{STORAGE_BUCKET}' exists")
    except Exception:
        print(f"Creating bucket '{STORAGE_BUCKET}'...")
        client.storage.create_bucket(
            STORAGE_BUCKET,
            options={"public": True}
        )
        print(f"✓ Bucket '{STORAGE_BUCKET}' created")


def ensure_category_exists(client):
    """Add Arc Raiders category if it doesn't exist."""
    result = client.table("community_hub_categories").select("*").eq("slug", GAME_CATEGORY).execute()
    
    if not result.data:
        print(f"Adding '{GAME_NAME}' category...")
        client.table("community_hub_categories").insert({
            "slug": GAME_CATEGORY,
            "name": GAME_NAME,
            "description": "Arc Raiders - Cooperative sci-fi shooter",
            "color": GAME_COLOR,
            "sort_order": 11,  # After existing categories
            "is_active": True,
            "asset_count": 0,
        }).execute()
        print(f"✓ Category '{GAME_NAME}' added")
    else:
        print(f"✓ Category '{GAME_NAME}' exists")


def upload_asset(client, path: Path, asset_type: str, prefix: str) -> dict:
    """Upload a single asset and return the record."""
    print(f"\nProcessing: {path.name}")
    
    # Compress image
    compressed_bytes, mime_type, width, height = compress_image(path)
    
    # Generate storage path
    ext = "png" if mime_type == "image/png" else "jpg"
    storage_path = f"{GAME_CATEGORY}/{prefix}/{uuid4().hex[:8]}_{path.stem.lower().replace(' ', '_')}.{ext}"
    
    # Upload to storage
    print(f"  Uploading to: {storage_path}")
    client.storage.from_(STORAGE_BUCKET).upload(
        storage_path,
        compressed_bytes,
        {"content-type": mime_type}
    )
    
    # Get public URL
    url = client.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)
    
    # Create database record
    record = {
        "asset_type": asset_type,
        "game_category": GAME_CATEGORY,
        "display_name": get_display_name(path.name),
        "description": f"Arc Raiders {asset_type.replace('_', ' ')}",
        "url": url,
        "storage_path": storage_path,
        "thumbnail_url": url,  # Same as URL for now
        "file_size": len(compressed_bytes),
        "mime_type": mime_type,
        "width": width,
        "height": height,
        "tags": ["arc_raiders", asset_type, "sci-fi", "shooter"],
        "is_featured": False,
        "is_premium": False,
        "sort_order": 0,
    }
    
    return record


# =============================================================================
# Main
# =============================================================================

def main():
    print("=" * 60)
    print("Arc Raiders Asset Uploader")
    print("=" * 60)
    
    # Initialize Supabase client
    print("\nConnecting to Supabase...")
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✓ Connected")
    
    # Setup
    ensure_bucket_exists(client)
    ensure_category_exists(client)
    
    # Process each folder
    all_records = []
    
    for folder_path, config in ASSET_FOLDERS.items():
        
        if not folder_path.exists():
            print(f"\n⚠ Folder not found: {folder_path}")
            continue
        
        print(f"\n{'=' * 60}")
        print(f"Processing: {folder_path.name}")
        print(f"Asset type: {config['asset_type']}")
        print("=" * 60)
        
        # Find all images
        images = list(folder_path.glob("*.PNG")) + list(folder_path.glob("*.png")) + \
                 list(folder_path.glob("*.JPG")) + list(folder_path.glob("*.jpg"))
        
        print(f"Found {len(images)} images")
        
        for img_path in sorted(images):
            try:
                record = upload_asset(
                    client, 
                    img_path, 
                    config["asset_type"], 
                    config["prefix"]
                )
                all_records.append(record)
                print(f"  ✓ Uploaded: {record['display_name']}")
            except Exception as e:
                print(f"  ✗ Failed: {e}")
    
    # Insert all records into database
    if all_records:
        print(f"\n{'=' * 60}")
        print(f"Inserting {len(all_records)} records into database...")
        print("=" * 60)
        
        try:
            client.table("community_hub_assets").insert(all_records).execute()
            print(f"✓ Inserted {len(all_records)} assets")
        except Exception as e:
            print(f"✗ Database insert failed: {e}")
            # Try one by one
            print("Trying individual inserts...")
            success = 0
            for record in all_records:
                try:
                    client.table("community_hub_assets").insert(record).execute()
                    success += 1
                except Exception as e2:
                    print(f"  ✗ {record['display_name']}: {e2}")
            print(f"✓ Inserted {success}/{len(all_records)} assets")
    
    print(f"\n{'=' * 60}")
    print("DONE!")
    print(f"Total assets uploaded: {len(all_records)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
