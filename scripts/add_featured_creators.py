#!/usr/bin/env python3
"""
Script to add featured creators to the community spotlight.

Usage:
    python scripts/add_featured_creators.py

This script will:
1. Look up users by email or display name
2. Add them to the featured_creators table
"""

import asyncio
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from supabase import create_client

# Load environment
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / "backend" / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    sys.exit(1)

# Featured creators to add
FEATURED_CREATORS = [
    {"email": "dadbodgeoff@gmail.com", "order": 1, "notes": "DadBodGeoff - community featured creator"},
    {"email": "tester15@aurashoop.com", "order": 2, "notes": "Tester15 - community featured creator"},
    # For the light/luminescence user, we'll search by display name
    {"display_name_search": ["light", "lumin"], "order": 3, "notes": "Light/Luminescence user - community featured creator"},
]


async def main():
    db = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("=" * 60)
    print("Adding Featured Creators to Community Spotlight")
    print("=" * 60)
    
    # First, list all users to help identify the right ones
    print("\n📋 Current users in database:")
    users_result = db.table("users").select("id, email, display_name").execute()
    for user in users_result.data or []:
        print(f"  - {user['email']} ({user['display_name']})")
    
    print("\n" + "-" * 60)
    
    for creator in FEATURED_CREATORS:
        user_id = None
        identifier = None
        
        if "email" in creator:
            # Look up by email
            result = db.table("users").select("id, email, display_name").ilike("email", creator["email"]).execute()
            if result.data:
                user_id = result.data[0]["id"]
                identifier = result.data[0]["email"]
            else:
                # Try partial match
                email_base = creator["email"].split("@")[0]
                result = db.table("users").select("id, email, display_name").ilike("email", f"%{email_base}%").execute()
                if result.data:
                    user_id = result.data[0]["id"]
                    identifier = result.data[0]["email"]
                    print(f"⚠️  Exact email not found, using partial match: {identifier}")
        
        elif "display_name_search" in creator:
            # Search by display name patterns
            for pattern in creator["display_name_search"]:
                result = db.table("users").select("id, email, display_name").ilike("display_name", f"%{pattern}%").execute()
                if result.data:
                    user_id = result.data[0]["id"]
                    identifier = f"{result.data[0]['display_name']} ({result.data[0]['email']})"
                    break
                # Also try email
                result = db.table("users").select("id, email, display_name").ilike("email", f"%{pattern}%").execute()
                if result.data:
                    user_id = result.data[0]["id"]
                    identifier = f"{result.data[0]['display_name']} ({result.data[0]['email']})"
                    break
        
        if user_id:
            # Insert or update featured creator
            try:
                db.table("featured_creators").upsert({
                    "user_id": user_id,
                    "display_order": creator["order"],
                    "notes": creator["notes"],
                    "is_active": True,
                }, on_conflict="user_id").execute()
                print(f"✅ Added featured creator #{creator['order']}: {identifier}")
            except Exception as e:
                print(f"❌ Failed to add {identifier}: {e}")
        else:
            search_term = creator.get("email") or creator.get("display_name_search")
            print(f"❌ User not found: {search_term}")
    
    # Show current featured creators
    print("\n" + "-" * 60)
    print("📌 Current Featured Creators:")
    featured = db.table("featured_creators").select("*, users(email, display_name)").eq("is_active", True).order("display_order").execute()
    for fc in featured.data or []:
        user = fc.get("users", {})
        print(f"  #{fc['display_order']}: {user.get('display_name', 'Unknown')} ({user.get('email', 'Unknown')})")
    
    print("\n✨ Done!")


if __name__ == "__main__":
    asyncio.run(main())
