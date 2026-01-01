#!/usr/bin/env python3
"""
End-to-end test for Playbook generation.

Tests:
1. Playbook generation via orchestrator
2. Database storage and retrieval
3. API endpoints

Usage:
    python scripts/test_playbook_e2e.py
    
    # Test against production
    python scripts/test_playbook_e2e.py --prod
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime

import httpx

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def print_header(title: str):
    """Print a formatted header."""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_success(msg: str):
    """Print success message."""
    print(f"  ✅ {msg}")


def print_error(msg: str):
    """Print error message."""
    print(f"  ❌ {msg}")


def print_info(msg: str):
    """Print info message."""
    print(f"  ℹ️  {msg}")


async def test_orchestrator():
    """Test the playbook orchestrator directly."""
    print_header("Testing Playbook Orchestrator")
    
    try:
        from backend.services.playbook import get_playbook_service
        
        service = get_playbook_service()
        
        print_info("Generating playbook (this may take a moment)...")
        playbook = await service.generate_playbook(save_to_db=True)
        
        print_success(f"Playbook generated successfully!")
        print_info(f"  Headline: {playbook.headline}")
        print_info(f"  Mood: {playbook.mood}")
        print_info(f"  Date: {playbook.playbook_date}")
        print_info(f"  Generated at: {playbook.generated_at}")
        print_info(f"  Golden Hours: {len(playbook.golden_hours)}")
        print_info(f"  Niche Opportunities: {len(playbook.niche_opportunities)}")
        print_info(f"  Viral Hooks: {len(playbook.viral_hooks)}")
        print_info(f"  Title Formulas: {len(playbook.title_formulas)}")
        print_info(f"  Thumbnail Recipes: {len(playbook.thumbnail_recipes)}")
        print_info(f"  Strategies: {len(playbook.strategies)}")
        print_info(f"  Insight Cards: {len(playbook.insight_cards)}")
        print_info(f"  Trending Hashtags: {len(playbook.trending_hashtags)}")
        print_info(f"  Title Keywords: {len(playbook.title_keywords)}")
        print_info(f"  Daily Mantra: {playbook.daily_mantra[:50]}...")
        
        return True
        
    except Exception as e:
        print_error(f"Orchestrator test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_repository():
    """Test the playbook repository."""
    print_header("Testing Playbook Repository")
    
    try:
        from backend.services.playbook import get_playbook_service
        
        service = get_playbook_service()
        
        # Test get latest
        print_info("Fetching latest playbook...")
        latest = await service.get_latest_playbook()
        
        if latest:
            print_success(f"Latest playbook retrieved: {latest.headline}")
        else:
            print_error("No playbook found in database")
            return False
        
        # Test list reports
        print_info("Listing recent reports...")
        reports = await service.list_reports(limit=5)
        print_success(f"Found {len(reports)} recent reports")
        
        for report in reports[:3]:
            print_info(f"  - {report.playbook_date}: {report.headline}")
        
        return True
        
    except Exception as e:
        print_error(f"Repository test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_api_endpoints(base_url: str):
    """Test the playbook API endpoints."""
    print_header(f"Testing API Endpoints ({base_url})")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Test /playbook/latest
        print_info("Testing GET /api/v1/playbook/latest...")
        try:
            resp = await client.get(f"{base_url}/api/v1/playbook/latest")
            if resp.status_code == 200:
                data = resp.json()
                print_success(f"Latest playbook: {data.get('headline', 'N/A')}")
                print_info(f"  Mood: {data.get('mood')}")
                print_info(f"  Golden Hours: {len(data.get('golden_hours', []))}")
                print_info(f"  Strategies: {len(data.get('strategies', []))}")
            elif resp.status_code == 404:
                print_info("No playbook available yet (404)")
            else:
                print_error(f"Unexpected status: {resp.status_code}")
                print_info(f"  Response: {resp.text[:200]}")
        except Exception as e:
            print_error(f"Request failed: {e}")
        
        # Test /playbook/reports
        print_info("Testing GET /api/v1/playbook/reports...")
        try:
            resp = await client.get(f"{base_url}/api/v1/playbook/reports?limit=5")
            if resp.status_code == 200:
                reports = resp.json()
                print_success(f"Found {len(reports)} reports")
                for r in reports[:3]:
                    print_info(f"  - {r.get('reportDate')}: {r.get('headline', 'N/A')[:40]}...")
            else:
                print_error(f"Unexpected status: {resp.status_code}")
        except Exception as e:
            print_error(f"Request failed: {e}")
    
    return True


async def test_data_quality():
    """Test the quality of generated data."""
    print_header("Testing Data Quality")
    
    try:
        from backend.services.playbook import get_playbook_service
        
        service = get_playbook_service()
        playbook = await service.get_latest_playbook()
        
        if not playbook:
            print_error("No playbook to test")
            return False
        
        issues = []
        
        # Check golden hours
        if len(playbook.golden_hours) == 0:
            issues.append("No golden hours generated")
        else:
            for gh in playbook.golden_hours:
                if gh.opportunity_score < 0 or gh.opportunity_score > 100:
                    issues.append(f"Invalid opportunity score: {gh.opportunity_score}")
                if gh.start_hour < 0 or gh.start_hour > 23:
                    issues.append(f"Invalid start hour: {gh.start_hour}")
        
        # Check niche opportunities
        if len(playbook.niche_opportunities) == 0:
            issues.append("No niche opportunities generated")
        else:
            for niche in playbook.niche_opportunities:
                if niche.saturation_score < 0 or niche.saturation_score > 100:
                    issues.append(f"Invalid saturation score: {niche.saturation_score}")
        
        # Check viral hooks
        if len(playbook.viral_hooks) == 0:
            issues.append("No viral hooks generated")
        else:
            for hook in playbook.viral_hooks:
                if hook.virality_score < 0 or hook.virality_score > 100:
                    issues.append(f"Invalid virality score: {hook.virality_score}")
        
        # Check strategies
        if len(playbook.strategies) == 0:
            issues.append("No strategies generated")
        else:
            for strategy in playbook.strategies:
                if not strategy.steps:
                    issues.append(f"Strategy '{strategy.title}' has no steps")
        
        # Check insight cards
        if len(playbook.insight_cards) == 0:
            issues.append("No insight cards generated")
        
        # Report results
        if issues:
            print_error(f"Found {len(issues)} data quality issues:")
            for issue in issues:
                print_info(f"  - {issue}")
            return False
        else:
            print_success("All data quality checks passed!")
            print_info(f"  Golden Hours: {len(playbook.golden_hours)} (valid)")
            print_info(f"  Niche Opportunities: {len(playbook.niche_opportunities)} (valid)")
            print_info(f"  Viral Hooks: {len(playbook.viral_hooks)} (valid)")
            print_info(f"  Strategies: {len(playbook.strategies)} (valid)")
            print_info(f"  Insight Cards: {len(playbook.insight_cards)} (valid)")
            return True
        
    except Exception as e:
        print_error(f"Data quality test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    parser = argparse.ArgumentParser(description="Test Playbook E2E")
    parser.add_argument("--prod", action="store_true", help="Test against production")
    parser.add_argument("--api-only", action="store_true", help="Only test API endpoints")
    parser.add_argument("--generate", action="store_true", help="Force generate a new playbook")
    args = parser.parse_args()
    
    base_url = "https://aurastream.shop" if args.prod else "http://localhost:8001"
    
    print("\n" + "🎮" * 20)
    print("  PLAYBOOK E2E TEST")
    print("🎮" * 20)
    print(f"\nTarget: {base_url}")
    print(f"Time: {datetime.now().isoformat()}")
    
    results = {}
    
    if args.api_only:
        results["api"] = await test_api_endpoints(base_url)
    else:
        if args.generate:
            results["orchestrator"] = await test_orchestrator()
        
        results["repository"] = await test_repository()
        results["data_quality"] = await test_data_quality()
        results["api"] = await test_api_endpoints(base_url)
    
    # Summary
    print_header("TEST SUMMARY")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name}: {status}")
    
    print(f"\n  Total: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n  🎉 All tests passed!")
        return 0
    else:
        print("\n  ⚠️  Some tests failed")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
