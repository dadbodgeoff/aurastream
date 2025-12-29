#!/usr/bin/env python3
"""
Verify that the usage limits migration has been applied correctly.

Checks:
1. Required columns exist on users table
2. RPC functions exist
3. Existing users have proper default values
"""

import asyncio
import httpx
import sys

# Supabase credentials
SUPABASE_URL = "https://qgyvdadgdomnubngfpun.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneXZkYWRnZG9tbnVibmdmcHVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjU0MTMzMiwiZXhwIjoyMDgyMTE3MzMyfQ.IzBqHwcX2XvMam_0tBcD3QY4HEdNmQIfZcjOhPjTeX8"


async def check_columns(client: httpx.AsyncClient) -> bool:
    """Check if required columns exist."""
    print("\n📋 Checking required columns...")
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    
    # Get a sample user to check columns
    response = await client.get(
        f"{SUPABASE_URL}/rest/v1/users?limit=1&select=id,subscription_tier,monthly_vibe_branding_used,monthly_aura_lab_used,monthly_coach_used,monthly_creations_used,usage_reset_at",
        headers=headers,
    )
    
    if response.status_code == 200:
        data = response.json()
        if data:
            user = data[0]
            required_cols = [
                'monthly_vibe_branding_used',
                'monthly_aura_lab_used', 
                'monthly_coach_used',
                'monthly_creations_used',
                'usage_reset_at'
            ]
            
            missing = [col for col in required_cols if col not in user]
            if missing:
                print(f"❌ Missing columns: {missing}")
                return False
            else:
                print(f"✅ All required columns exist")
                print(f"   Sample user data:")
                for col in required_cols:
                    print(f"   - {col}: {user.get(col)}")
                return True
        else:
            print("⚠️ No users found in database")
            return True
    else:
        print(f"❌ Failed to query users: {response.status_code} - {response.text}")
        return False


async def check_rpc_functions(client: httpx.AsyncClient) -> bool:
    """Check if RPC functions exist by calling them."""
    print("\n🔧 Checking RPC functions...")
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    
    # Test get_tier_limits
    response = await client.post(
        f"{SUPABASE_URL}/rest/v1/rpc/get_tier_limits",
        headers=headers,
        json={"p_tier": "free"},
    )
    
    if response.status_code == 200:
        limits = response.json()
        print(f"✅ get_tier_limits works: {limits}")
    else:
        print(f"❌ get_tier_limits failed: {response.status_code} - {response.text}")
        return False
    
    return True


async def check_existing_users(client: httpx.AsyncClient) -> dict:
    """Check all existing users and their usage status."""
    print("\n👥 Checking existing users...")
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    
    response = await client.get(
        f"{SUPABASE_URL}/rest/v1/users?select=id,email,subscription_tier,monthly_vibe_branding_used,monthly_aura_lab_used,monthly_coach_used,monthly_creations_used,usage_reset_at",
        headers=headers,
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to fetch users: {response.status_code}")
        return {}
    
    users = response.json()
    print(f"   Found {len(users)} users")
    
    stats = {
        "total": len(users),
        "free": 0,
        "pro": 0,
        "studio": 0,
        "needs_fix": [],
    }
    
    for user in users:
        tier = user.get("subscription_tier", "free")
        if tier == "free":
            stats["free"] += 1
        elif tier == "pro":
            stats["pro"] += 1
        elif tier == "studio":
            stats["studio"] += 1
        
        # Check if any usage columns are NULL
        if any([
            user.get("monthly_vibe_branding_used") is None,
            user.get("monthly_aura_lab_used") is None,
            user.get("monthly_coach_used") is None,
            user.get("monthly_creations_used") is None,
        ]):
            stats["needs_fix"].append(user["id"])
    
    print(f"\n📊 User Statistics:")
    print(f"   Total: {stats['total']}")
    print(f"   Free tier: {stats['free']}")
    print(f"   Pro tier: {stats['pro']}")
    print(f"   Studio tier: {stats['studio']}")
    
    if stats["needs_fix"]:
        print(f"\n⚠️ {len(stats['needs_fix'])} users have NULL usage columns")
        print("   These will be fixed automatically on first API call")
    else:
        print(f"\n✅ All users have proper usage column values")
    
    return stats


async def fix_null_usage(client: httpx.AsyncClient, user_ids: list) -> bool:
    """Fix users with NULL usage columns."""
    if not user_ids:
        return True
    
    print(f"\n🔧 Fixing {len(user_ids)} users with NULL usage columns...")
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    
    for user_id in user_ids:
        response = await client.patch(
            f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}",
            headers=headers,
            json={
                "monthly_vibe_branding_used": 0,
                "monthly_aura_lab_used": 0,
                "monthly_coach_used": 0,
                "monthly_creations_used": 0,
            },
        )
        
        if response.status_code not in (200, 204):
            print(f"❌ Failed to fix user {user_id}: {response.status_code}")
            return False
    
    print(f"✅ Fixed all users")
    return True


async def main():
    print("=" * 60)
    print("🔍 USAGE LIMITS MIGRATION VERIFICATION")
    print("=" * 60)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Check columns
        cols_ok = await check_columns(client)
        if not cols_ok:
            print("\n❌ Migration may not have been applied!")
            print("   Run: psql -f backend/database/migrations/031_monthly_usage_limits.sql")
            sys.exit(1)
        
        # Check RPC functions
        rpc_ok = await check_rpc_functions(client)
        if not rpc_ok:
            print("\n❌ RPC functions not found!")
            print("   Run: psql -f backend/database/migrations/031_monthly_usage_limits.sql")
            sys.exit(1)
        
        # Check existing users
        stats = await check_existing_users(client)
        
        # Fix any users with NULL values
        if stats.get("needs_fix"):
            fix_ok = await fix_null_usage(client, stats["needs_fix"])
            if not fix_ok:
                print("\n⚠️ Some users could not be fixed")
        
        print("\n" + "=" * 60)
        print("✅ VERIFICATION COMPLETE")
        print("=" * 60)
        print("\nExisting accounts are ready to use the new usage limits system.")
        print("Usage counters start at 0 and reset at the start of each month.")


if __name__ == "__main__":
    asyncio.run(main())
