#!/usr/bin/env python3
"""
Test script for the monthly usage limits system.

Tests:
1. Create a test account (or use existing)
2. Test usage status endpoint
3. Test usage check endpoint for each feature
4. Upgrade to premium and verify limits change
"""

import asyncio
import httpx
import json
import sys
from datetime import datetime

API_BASE = "http://localhost:8001"

# Test user credentials
TEST_EMAIL = "usage_test_user@gmail.com"
TEST_PASSWORD = "TestPassword123!"
TEST_DISPLAY_NAME = "Usage Test User"


async def signup_or_login(client: httpx.AsyncClient) -> dict:
    """Sign up a new user or login if exists."""
    # Try to sign up
    signup_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "display_name": TEST_DISPLAY_NAME,
        "accept_terms": True,
    }
    
    response = await client.post(f"{API_BASE}/api/v1/auth/signup", json=signup_data)
    
    if response.status_code == 201:
        print(f"✅ Created new test user: {TEST_EMAIL}")
        # Now login to get token
    elif response.status_code == 409:
        print(f"ℹ️ User already exists: {TEST_EMAIL}")
        # User exists, login
    else:
        print(f"❌ Signup failed: {response.status_code} - {response.text}")
        sys.exit(1)
    
    # Login to get token
    login_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
    }
    response = await client.post(f"{API_BASE}/api/v1/auth/login", json=login_data)
    if response.status_code == 200:
        print(f"✅ Logged in as: {TEST_EMAIL}")
        return response.json()
    else:
        print(f"❌ Login failed: {response.status_code} - {response.text}")
        sys.exit(1)


async def test_usage_status(client: httpx.AsyncClient, token: str) -> dict:
    """Test the /api/v1/usage/status endpoint."""
    print("\n📊 Testing GET /api/v1/usage/status...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get(f"{API_BASE}/api/v1/usage/status", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Usage status retrieved successfully")
        print(f"   Tier: {data['tier']}")
        print(f"   Vibe Branding: {data['vibe_branding']['used']}/{data['vibe_branding']['limit']} (remaining: {data['vibe_branding']['remaining']})")
        print(f"   Aura Lab: {data['aura_lab']['used']}/{data['aura_lab']['limit']} (remaining: {data['aura_lab']['remaining']})")
        print(f"   Coach: {data['coach']['used']}/{data['coach']['limit']} (remaining: {data['coach']['remaining']}, unlimited: {data['coach']['unlimited']})")
        print(f"   Creations: {data['creations']['used']}/{data['creations']['limit']} (remaining: {data['creations']['remaining']})")
        print(f"   Resets at: {data['resets_at']}")
        return data
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")
        return {}


async def test_usage_check(client: httpx.AsyncClient, token: str, feature: str) -> dict:
    """Test the /api/v1/usage/check/{feature} endpoint."""
    print(f"\n🔍 Testing GET /api/v1/usage/check/{feature}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get(f"{API_BASE}/api/v1/usage/check/{feature}", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Check for {feature}:")
        print(f"   Can use: {data['can_use']}")
        print(f"   Used: {data['used']}/{data['limit']}")
        print(f"   Remaining: {data['remaining']}")
        print(f"   Tier: {data['tier']}")
        if data.get('upgrade_message'):
            print(f"   Upgrade message: {data['upgrade_message']}")
        return data
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")
        return {}


async def upgrade_to_premium(client: httpx.AsyncClient, user_id: str) -> bool:
    """Upgrade user to premium tier directly in database."""
    print(f"\n⬆️ Upgrading user {user_id} to Pro tier...")
    
    # Supabase credentials from .env
    supabase_url = "https://qgyvdadgdomnubngfpun.supabase.co"
    supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneXZkYWRnZG9tbnVibmdmcHVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjU0MTMzMiwiZXhwIjoyMDgyMTE3MzMyfQ.IzBqHwcX2XvMam_0tBcD3QY4HEdNmQIfZcjOhPjTeX8"
    
    # Use Supabase REST API to update
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    
    response = await client.patch(
        f"{supabase_url}/rest/v1/users?id=eq.{user_id}",
        headers=headers,
        json={"subscription_tier": "pro", "subscription_status": "active"},
    )
    
    if response.status_code in (200, 204):
        print(f"✅ User upgraded to Pro tier")
        return True
    else:
        print(f"❌ Upgrade failed: {response.status_code} - {response.text}")
        return False


async def main():
    print("=" * 60)
    print("🧪 USAGE LIMITS SYSTEM TEST")
    print("=" * 60)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Step 1: Create or login test user
        auth_data = await signup_or_login(client)
        token = auth_data.get("access_token")
        user = auth_data.get("user", {})
        user_id = user.get("id")
        
        if not token:
            print("❌ No access token received")
            sys.exit(1)
        
        print(f"\n👤 User ID: {user_id}")
        print(f"   Tier: {user.get('subscription_tier', 'unknown')}")
        
        # Step 2: Test usage status
        status = await test_usage_status(client, token)
        
        # Step 3: Test usage check for each feature
        features = ["vibe_branding", "aura_lab", "coach", "creations"]
        for feature in features:
            await test_usage_check(client, token, feature)
        
        # Step 4: If user is free tier, upgrade to pro and test again
        if status.get("tier") == "free":
            print("\n" + "=" * 60)
            print("🔄 TESTING PREMIUM TIER")
            print("=" * 60)
            
            upgraded = await upgrade_to_premium(client, user_id)
            
            if upgraded:
                # Re-login to get fresh token with updated tier
                login_data = {
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD,
                }
                response = await client.post(f"{API_BASE}/api/v1/auth/login", json=login_data)
                if response.status_code == 200:
                    auth_data = response.json()
                    token = auth_data.get("access_token")
                    
                    # Test again with pro tier
                    await test_usage_status(client, token)
                    
                    for feature in features:
                        await test_usage_check(client, token, feature)
        
        print("\n" + "=" * 60)
        print("✅ USAGE LIMITS TEST COMPLETE")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
