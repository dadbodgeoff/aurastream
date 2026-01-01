#!/usr/bin/env python3
"""
Grant unlimited access to a specific user.

Usage:
    python scripts/grant_unlimited_access.py dadbodgeoff@gmail.com
"""

import sys
import os
from pathlib import Path

# Load environment variables from backend/.env
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / "backend" / ".env"
load_dotenv(env_path)

from supabase import create_client


def grant_unlimited_access(email: str):
    """Grant unlimited tier access to a user by email."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env")
        return False
    
    supabase = create_client(url, key)
    
    # First check if user exists
    result = supabase.table("users").select("id, email, subscription_tier").eq("email", email).execute()
    
    if not result.data:
        print(f"❌ User not found: {email}")
        return False
    
    user = result.data[0]
    print(f"Found user: {user['email']} (ID: {user['id']})")
    print(f"Current tier: {user['subscription_tier']}")
    
    # Update to unlimited tier
    update_result = supabase.table("users").update({
        "subscription_tier": "unlimited",
        "subscription_status": "active"
    }).eq("email", email).execute()
    
    if update_result.data:
        print(f"✅ Granted unlimited access to {email}")
        print("   - Unlimited Vibe Branding")
        print("   - Unlimited Aura Lab fusions")
        print("   - Unlimited Coach sessions")
        print("   - Unlimited Asset creations")
        print("   - Unlimited Profile Creator")
        return True
    else:
        print(f"❌ Failed to update user")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/grant_unlimited_access.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    success = grant_unlimited_access(email)
    sys.exit(0 if success else 1)
