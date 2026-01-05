#!/usr/bin/env python3
"""
Upload Fortnite Chapter 7 Assets to Community Hub

Compresses images and uploads them to Supabase storage,
then inserts records into the community_hub_assets table.

Usage:
    cd "streamer suite"
    source backend/venv/bin/activate
    python scripts/upload_fortnite_assets.py
"""

import os
import sys
from pathlib import Path
from uuid import uuid4
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

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://qgyvdadgdomnubngfpun.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_KEY:
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
GAME_CATEGORY = "fortnite"
GAME_NAME = "Fortnite"
GAME_COLOR = "#9d4dbb"  # Fortnite purple

# Asset folder
ASSET_FOLDER = Path.home() / "Downloads" / "Fortnite Chapter 7 Backgrounds By RipexDesigns"

# Compression settings
MAX_DIMENSION = 1920
JPEG_QUALITY = 85
PNG_OPTIMIZE = True


# =============================================================================
# Image Processing
# =============================================================================

def compress_image(path: Path) -> tuple[bytes, str, int, int]:
    """Compress image while maintaining quality."""
    with Image.open(path) as img:
        original_size = path.stat().st_size
        
        if img.mode == 'RGBA' or path.suffix.lower() == '.png':
            output_format = 'PNG'
            mime_type = 'image/png'
        else:
            img = img.convert('RGB')
            output_format = 'JPEG'
            mime_type = 'image/jpeg'
        
        width, height = img.size
        if max(width, height) > MAX_DIMENSION:
            img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)
            width, height = img.size
        
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
    name = Path(filename).stem
    return f"Fortnite Ch7 Background {name}"


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
        client.storage.create_bucket(STORAGE_BUCKET, options={"public": True})
        print(f"✓ Bucket '{STORAGE_BUCKET}' created")


def ensure_category_exists(client):
    """Add Fortnite category if it doesn't exist."""
    result = client.table("community_hub_categories").select("*").eq("slug", GAME_CATEGORY).execute()
    
    if not result.data:
        print(f"Adding '{GAME_NAME}' category...")
        client.table("community_hub_categories").insert({
            "slug": GAME_CATEGORY,
            "name": GAME_NAME,
            "description": "Fortnite Chapter 7 - Battle Royale",
            "color": GAME_COLOR,
            "sort_order": 1,  # Popular game, put near top
            "is_active": True,
            "asset_count": 0,
        }).execute()
        print(f"✓ Category '{GAME_NAME}' added")
    else:
        print(f"✓ Category '{GAME_NAME}' exists")


def upload_asset(client, path: Path, index: int) -> dict:
    """Upload a single asset and return the record."""
    print(f"\nProcessing [{index}]: {path.name}")
    
    compressed_bytes, mime_type, width, height = compress_image(path)
    
    ext = "png" if mime_type == "image/png" else "jpg"
    storage_path = f"{GAME_CATEGORY}/backgrounds/{uuid4().hex[:8]}_{path.stem.lower()}.{ext}"
    
    print(f"  Uploading to: {storage_path}")
    client.storage.from_(STORAGE_BUCKET).upload(
        storage_path,
        compressed_bytes,
        {"content-type": mime_type}
    )
    
    url = client.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)
    
    record = {
        "asset_type": "background",
        "game_category": GAME_CATEGORY,
        "display_name": get_display_name(path.name),
        "description": "Fortnite Chapter 7 background by RipexDesigns",
        "url": url,
        "storage_path": storage_path,
        "thumbnail_url": url,
        "file_size": len(compressed_bytes),
        "mime_type": mime_type,
        "width": width,
        "height": height,
        "tags": ["fortnite", "chapter7", "background", "battle_royale"],
        "is_featured": False,
        "is_premium": False,
        "sort_order": index,
    }
    
    return record


# =============================================================================
# Main
# =============================================================================

def main():
    print("=" * 60)
    print("Fortnite Chapter 7 Asset Uploader")
    print("=" * 60)
    
    print("\nConnecting to Supabase...")
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✓ Connected")
    
    ensure_bucket_exists(client)
    ensure_category_exists(client)
    
    if not ASSET_FOLDER.exists():
        print(f"\n✗ Folder not found: {ASSET_FOLDER}")
        sys.exit(1)
    
    print(f"\n{'=' * 60}")
    print(f"Processing: {ASSET_FOLDER.name}")
    print("=" * 60)
    
    images = sorted(
        list(ASSET_FOLDER.glob("*.png")) + list(ASSET_FOLDER.glob("*.PNG")) +
        list(ASSET_FOLDER.glob("*.jpg")) + list(ASSET_FOLDER.glob("*.JPG")),
        key=lambda p: int(p.stem) if p.stem.isdigit() else p.stem
    )
    
    print(f"Found {len(images)} images")
    
    all_records = []
    for idx, img_path in enumerate(images, 1):
        try:
            record = upload_asset(client, img_path, idx)
            all_records.append(record)
            print(f"  ✓ Uploaded: {record['display_name']}")
        except Exception as e:
            print(f"  ✗ Failed: {e}")
    
    if all_records:
        print(f"\n{'=' * 60}")
        print(f"Inserting {len(all_records)} records into database...")
        print("=" * 60)
        
        # Insert in batches of 50
        batch_size = 50
        success = 0
        for i in range(0, len(all_records), batch_size):
            batch = all_records[i:i + batch_size]
            try:
                client.table("community_hub_assets").insert(batch).execute()
                success += len(batch)
                print(f"  ✓ Inserted batch {i//batch_size + 1}")
            except Exception as e:
                print(f"  ✗ Batch failed: {e}")
        
        # Update category asset count
        client.table("community_hub_categories").update(
            {"asset_count": success}
        ).eq("slug", GAME_CATEGORY).execute()
        
        print(f"✓ Inserted {success} assets")
    
    print(f"\n{'=' * 60}")
    print("DONE!")
    print(f"Total assets uploaded: {len(all_records)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
