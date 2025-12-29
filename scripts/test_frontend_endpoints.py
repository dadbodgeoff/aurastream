#!/usr/bin/env python3
"""
Frontend Endpoint Test Suite for AuraStream.

Tests all major API endpoints from a frontend user perspective,
simulating the actual API calls the web app makes.
"""

import asyncio
import httpx
import json
import sys
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple

# Configuration
API_BASE = "http://127.0.0.1:8001"  # Docker-exposed port
TEST_EMAIL = "dadbodgeoff@gmail.com"
TEST_PASSWORD = "Password123!"

# Results tracking
results: List[Tuple[str, str, bool, str]] = []


def log(msg: str, status: str = "INFO"):
    """Log with timestamp."""
    colors = {
        "INFO": "\033[94m",
        "OK": "\033[92m",
        "FAIL": "\033[91m",
        "WARN": "\033[93m",
        "RESET": "\033[0m"
    }
    color = colors.get(status, colors["INFO"])
    reset = colors["RESET"]
    print(f"{color}[{status}]{reset} {msg}")


def record(category: str, endpoint: str, success: bool, detail: str = ""):
    """Record test result."""
    results.append((category, endpoint, success, detail))
    status = "OK" if success else "FAIL"
    log(f"{endpoint}: {detail}", status)


async def test_auth_endpoints(client: httpx.AsyncClient) -> Optional[str]:
    """Test authentication endpoints and return access token."""
    log("\n=== AUTHENTICATION ===", "INFO")
    
    # Login
    try:
        resp = await client.post(f"{API_BASE}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if resp.status_code == 200:
            data = resp.json()
            token = data.get("access_token")
            record("Auth", "POST /auth/login", True, f"Got token, user: {data.get('user', {}).get('display_name')}")
            return token
        else:
            record("Auth", "POST /auth/login", False, f"Status {resp.status_code}: {resp.text[:100]}")
            return None
    except Exception as e:
        record("Auth", "POST /auth/login", False, str(e))
        return None


async def test_user_endpoints(client: httpx.AsyncClient, token: str):
    """Test user-related endpoints."""
    log("\n=== USER ENDPOINTS ===", "INFO")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get current user
    try:
        resp = await client.get(f"{API_BASE}/api/v1/auth/me", headers=headers)
        if resp.status_code == 200:
            user = resp.json()
            record("User", "GET /auth/me", True, f"User: {user.get('display_name')}, Tier: {user.get('subscription_tier')}")
        else:
            record("User", "GET /auth/me", False, f"Status {resp.status_code}")
    except Exception as e:
        record("User", "GET /auth/me", False, str(e))


async def test_brand_kit_endpoints(client: httpx.AsyncClient, token: str) -> Optional[str]:
    """Test brand kit endpoints."""
    log("\n=== BRAND KITS ===", "INFO")
    headers = {"Authorization": f"Bearer {token}"}
    brand_kit_id = None
    
    # List brand kits
    try:
        resp = await client.get(f"{API_BASE}/api/v1/brand-kits", headers=headers)
        if resp.status_code == 200:
            kits = resp.json()
            count = len(kits) if isinstance(kits, list) else 0
            record("BrandKits", "GET /brand-kits", True, f"Found {count} brand kits")
            if count > 0:
                brand_kit_id = kits[0].get("id")
        else:
            record("BrandKits", "GET /brand-kits", False, f"Status {resp.status_code}")
    except Exception as e:
        record("BrandKits", "GET /brand-kits", False, str(e))
    
    # Get active brand kit
    try:
        resp = await client.get(f"{API_BASE}/api/v1/brand-kits/active", headers=headers)
        if resp.status_code in [200, 404]:
            record("BrandKits", "GET /brand-kits/active", True, 
                   "Has active kit" if resp.status_code == 200 else "No active kit")
        else:
            record("BrandKits", "GET /brand-kits/active", False, f"Status {resp.status_code}")
    except Exception as e:
        record("BrandKits", "GET /brand-kits/active", False, str(e))
    
    return brand_kit_id


async def test_asset_endpoints(client: httpx.AsyncClient, token: str):
    """Test asset endpoints."""
    log("\n=== ASSETS ===", "INFO")
    headers = {"Authorization": f"Bearer {token}"}
    
    # List assets
    try:
        resp = await client.get(f"{API_BASE}/api/v1/assets?limit=50", headers=headers)
        if resp.status_code == 200:
            assets = resp.json()
            count = len(assets) if isinstance(assets, list) else 0
            record("Assets", "GET /assets", True, f"Found {count} assets")
        else:
            record("Assets", "GET /assets", False, f"Status {resp.status_code}")
    except Exception as e:
        record("Assets", "GET /assets", False, str(e))
    
    # List jobs
    try:
        resp = await client.get(f"{API_BASE}/api/v1/jobs?limit=20", headers=headers)
        if resp.status_code == 200:
            jobs = resp.json()
            count = len(jobs) if isinstance(jobs, list) else 0
            record("Assets", "GET /jobs", True, f"Found {count} jobs")
        else:
            record("Assets", "GET /jobs", False, f"Status {resp.status_code}")
    except Exception as e:
        record("Assets", "GET /jobs", False, str(e))


async def test_usage_endpoints(client: httpx.AsyncClient, token: str):
    """Test usage/limits endpoints."""
    log("\n=== USAGE & LIMITS ===", "INFO")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Usage status
    try:
        resp = await client.get(f"{API_BASE}/api/v1/usage/status", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            record("Usage", "GET /usage/status", True, f"Tier: {data.get('tier')}")
        else:
            record("Usage", "GET /usage/status", False, f"Status {resp.status_code}")
    except Exception as e:
        record("Usage", "GET /usage/status", False, str(e))


async def test_coach_endpoints(client: httpx.AsyncClient, token: str):
    """Test coach endpoints."""
    log("\n=== PROMPT COACH ===", "INFO")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Coach access
    try:
        resp = await client.get(f"{API_BASE}/api/v1/coach/access", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            record("Coach", "GET /coach/access", True, f"Has access: {data.get('coach_access')}")
        else:
            record("Coach", "GET /coach/access", False, f"Status {resp.status_code}")
    except Exception as e:
        record("Coach", "GET /coach/access", False, str(e))
    
    # Coach tips
    try:
        resp = await client.get(f"{API_BASE}/api/v1/coach/tips?asset_type=twitch_emote", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            tips_count = len(data.get("tips", []))
            record("Coach", "GET /coach/tips", True, f"Got {tips_count} tips")
        else:
            record("Coach", "GET /coach/tips", False, f"Status {resp.status_code}")
    except Exception as e:
        record("Coach", "GET /coach/tips", False, str(e))


async def test_profile_creator_endpoints(client: httpx.AsyncClient, token: str):
    """Test profile creator endpoints."""
    log("\n=== PROFILE CREATOR ===", "INFO")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Access check
    try:
        resp = await client.get(f"{API_BASE}/api/v1/profile-creator/access", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            record("ProfileCreator", "GET /profile-creator/access", True, 
                   f"Can use: {data.get('can_use')}, Remaining: {data.get('remaining')}/{data.get('limit')}")
        else:
            record("ProfileCreator", "GET /profile-creator/access", False, f"Status {resp.status_code}")
    except Exception as e:
        record("ProfileCreator", "GET /profile-creator/access", False, str(e))
    
    # Gallery
    try:
        resp = await client.get(f"{API_BASE}/api/v1/profile-creator/gallery?limit=20&offset=0", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            count = data.get("total", 0)
            record("ProfileCreator", "GET /profile-creator/gallery", True, f"Found {count} items")
        else:
            record("ProfileCreator", "GET /profile-creator/gallery", False, f"Status {resp.status_code}")
    except Exception as e:
        record("ProfileCreator", "GET /profile-creator/gallery", False, str(e))


async def test_community_endpoints(client: httpx.AsyncClient, token: str):
    """Test community endpoints."""
    log("\n=== COMMUNITY ===", "INFO")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Community posts (not feed)
    try:
        resp = await client.get(f"{API_BASE}/api/v1/community/posts?limit=20", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            count = len(data.get("posts", []))
            record("Community", "GET /community/posts", True, f"Found {count} posts")
        else:
            record("Community", "GET /community/posts", False, f"Status {resp.status_code}")
    except Exception as e:
        record("Community", "GET /community/posts", False, str(e))
    
    # Spotlight creators
    try:
        resp = await client.get(f"{API_BASE}/api/v1/community/creators/spotlight", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            count = len(data) if isinstance(data, list) else 0
            record("Community", "GET /community/creators/spotlight", True, f"Found {count} creators")
        else:
            record("Community", "GET /community/creators/spotlight", False, f"Status {resp.status_code}")
    except Exception as e:
        record("Community", "GET /community/creators/spotlight", False, str(e))


async def test_social_endpoints(client: httpx.AsyncClient, token: str):
    """Test social/messaging endpoints."""
    log("\n=== SOCIAL & MESSAGING ===", "INFO")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Friends list
    try:
        resp = await client.get(f"{API_BASE}/api/v1/friends", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            count = len(data.get("friends", []))
            record("Social", "GET /friends", True, f"Found {count} friends")
        else:
            record("Social", "GET /friends", False, f"Status {resp.status_code}")
    except Exception as e:
        record("Social", "GET /friends", False, str(e))
    
    # Conversations
    try:
        resp = await client.get(f"{API_BASE}/api/v1/messages/conversations", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            count = len(data) if isinstance(data, list) else 0
            record("Social", "GET /messages/conversations", True, f"Found {count} conversations")
        else:
            record("Social", "GET /messages/conversations", False, f"Status {resp.status_code}")
    except Exception as e:
        record("Social", "GET /messages/conversations", False, str(e))
    
    # Unread count
    try:
        resp = await client.get(f"{API_BASE}/api/v1/messages/unread/count", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            record("Social", "GET /messages/unread/count", True, f"Unread: {data.get('count', 0)}")
        else:
            record("Social", "GET /messages/unread/count", False, f"Status {resp.status_code}")
    except Exception as e:
        record("Social", "GET /messages/unread/count", False, str(e))


async def test_templates_endpoints(client: httpx.AsyncClient, token: str):
    """Test template endpoints."""
    log("\n=== TEMPLATES ===", "INFO")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get templates for a category
    try:
        resp = await client.get(f"{API_BASE}/api/v1/templates/thumbnail", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            count = len(data.get("templates", []))
            record("Templates", "GET /templates/thumbnail", True, f"Found {count} templates")
        else:
            record("Templates", "GET /templates/thumbnail", False, f"Status {resp.status_code}")
    except Exception as e:
        record("Templates", "GET /templates/thumbnail", False, str(e))


async def test_aura_lab_endpoints(client: httpx.AsyncClient, token: str):
    """Test Aura Lab endpoints."""
    log("\n=== AURA LAB ===", "INFO")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Inventory
    try:
        resp = await client.get(f"{API_BASE}/api/v1/aura-lab/inventory", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            count = len(data.get("elements", []))
            record("AuraLab", "GET /aura-lab/inventory", True, f"Found {count} elements")
        else:
            record("AuraLab", "GET /aura-lab/inventory", False, f"Status {resp.status_code}")
    except Exception as e:
        record("AuraLab", "GET /aura-lab/inventory", False, str(e))
    
    # Usage
    try:
        resp = await client.get(f"{API_BASE}/api/v1/aura-lab/usage", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            record("AuraLab", "GET /aura-lab/usage", True, f"Fusions: {data.get('fusions_used', 0)}/{data.get('fusions_limit', 0)}")
        else:
            record("AuraLab", "GET /aura-lab/usage", False, f"Status {resp.status_code}")
    except Exception as e:
        record("AuraLab", "GET /aura-lab/usage", False, str(e))
    
    # Elements
    try:
        resp = await client.get(f"{API_BASE}/api/v1/aura-lab/elements", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            count = len(data.get("elements", []))
            record("AuraLab", "GET /aura-lab/elements", True, f"Found {count} base elements")
        else:
            record("AuraLab", "GET /aura-lab/elements", False, f"Status {resp.status_code}")
    except Exception as e:
        record("AuraLab", "GET /aura-lab/elements", False, str(e))


async def test_promo_endpoints(client: httpx.AsyncClient, token: str):
    """Test promo board endpoints."""
    log("\n=== PROMO BOARD ===", "INFO")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Promo messages
    try:
        resp = await client.get(f"{API_BASE}/api/v1/promo/messages?limit=20", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            count = len(data.get("messages", []))
            record("Promo", "GET /promo/messages", True, f"Found {count} messages")
        else:
            record("Promo", "GET /promo/messages", False, f"Status {resp.status_code}")
    except Exception as e:
        record("Promo", "GET /promo/messages", False, str(e))
    
    # Leaderboard
    try:
        resp = await client.get(f"{API_BASE}/api/v1/promo/leaderboard", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            count = len(data.get("entries", []))
            record("Promo", "GET /promo/leaderboard", True, f"Found {count} entries")
        else:
            record("Promo", "GET /promo/leaderboard", False, f"Status {resp.status_code}")
    except Exception as e:
        record("Promo", "GET /promo/leaderboard", False, str(e))


async def test_analytics_endpoints(client: httpx.AsyncClient, token: str):
    """Test analytics endpoints."""
    log("\n=== ANALYTICS ===", "INFO")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Analytics health
    try:
        resp = await client.get(f"{API_BASE}/api/v1/analytics/health", headers=headers)
        if resp.status_code == 200:
            record("Analytics", "GET /analytics/health", True, "Healthy")
        else:
            record("Analytics", "GET /analytics/health", False, f"Status {resp.status_code}")
    except Exception as e:
        record("Analytics", "GET /analytics/health", False, str(e))


async def test_vibe_branding_endpoints(client: httpx.AsyncClient, token: str):
    """Test vibe branding endpoints."""
    log("\n=== VIBE BRANDING ===", "INFO")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Vibe usage
    try:
        resp = await client.get(f"{API_BASE}/api/v1/vibe-branding/usage", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            record("VibeBranding", "GET /vibe-branding/usage", True, 
                   f"Used: {data.get('analyses_used', 0)}/{data.get('analyses_limit', 0)}")
        else:
            record("VibeBranding", "GET /vibe-branding/usage", False, f"Status {resp.status_code}")
    except Exception as e:
        record("VibeBranding", "GET /vibe-branding/usage", False, str(e))


async def main():
    """Run all endpoint tests."""
    log("=" * 60, "INFO")
    log("AuraStream Frontend Endpoint Test Suite", "INFO")
    log(f"API Base: {API_BASE}", "INFO")
    log(f"Started: {datetime.now().isoformat()}", "INFO")
    log("=" * 60, "INFO")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # First, authenticate
        token = await test_auth_endpoints(client)
        
        if not token:
            log("\nFailed to authenticate - cannot continue tests", "FAIL")
            sys.exit(1)
        
        # Run all endpoint tests
        await test_user_endpoints(client, token)
        await test_brand_kit_endpoints(client, token)
        await test_asset_endpoints(client, token)
        await test_usage_endpoints(client, token)
        await test_coach_endpoints(client, token)
        await test_profile_creator_endpoints(client, token)
        await test_community_endpoints(client, token)
        await test_social_endpoints(client, token)
        await test_templates_endpoints(client, token)
        await test_aura_lab_endpoints(client, token)
        await test_promo_endpoints(client, token)
        await test_analytics_endpoints(client, token)
        await test_vibe_branding_endpoints(client, token)
    
    # Summary
    log("\n" + "=" * 60, "INFO")
    log("TEST SUMMARY", "INFO")
    log("=" * 60, "INFO")
    
    passed = sum(1 for r in results if r[2])
    failed = sum(1 for r in results if not r[2])
    total = len(results)
    
    # Group by category
    categories = {}
    for cat, endpoint, success, detail in results:
        if cat not in categories:
            categories[cat] = {"passed": 0, "failed": 0}
        if success:
            categories[cat]["passed"] += 1
        else:
            categories[cat]["failed"] += 1
    
    for cat, stats in sorted(categories.items()):
        status = "OK" if stats["failed"] == 0 else "WARN" if stats["passed"] > 0 else "FAIL"
        log(f"  {cat}: {stats['passed']}/{stats['passed'] + stats['failed']} passed", status)
    
    log("", "INFO")
    log(f"Total: {passed}/{total} passed ({100*passed//total}%)", "OK" if failed == 0 else "WARN")
    
    if failed > 0:
        log("\nFailed endpoints:", "FAIL")
        for cat, endpoint, success, detail in results:
            if not success:
                log(f"  [{cat}] {endpoint}: {detail}", "FAIL")
    
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    asyncio.run(main())
