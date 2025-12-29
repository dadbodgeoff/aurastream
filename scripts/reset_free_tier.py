#!/usr/bin/env python3
"""
Reset monthly usage limits for a user or upgrade them to pro.

Usage:
    python scripts/reset_free_tier.py --user-id <uuid> --action reset
    python scripts/reset_free_tier.py --user-id <uuid> --action upgrade
    python scripts/reset_free_tier.py --user-id <uuid> --action status
"""

import argparse
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database.supabase_client import get_supabase_client


def main():
    parser = argparse.ArgumentParser(description="Reset monthly usage or upgrade user")
    parser.add_argument("--user-id", required=True, help="User UUID")
    parser.add_argument("--action", choices=["reset", "upgrade", "status"], default="reset",
                        help="reset = clear monthly usage, upgrade = set to pro tier, status = show current usage")
    parser.add_argument("--feature", choices=["coach", "aura_lab", "vibe_branding", "creations", "profile_creator", "all"], 
                        default="all", help="Feature to reset (only for reset action)")
    args = parser.parse_args()
    
    db = get_supabase_client()
    
    if args.action == "status":
        # Get current usage status
        result = db.rpc("get_usage_status", {"p_user_id": args.user_id}).execute()
        
        if result.data and not result.data.get("error"):
            data = result.data
            print(f"\n📊 Usage Status for {args.user_id}")
            print(f"   Tier: {data.get('tier', 'unknown')}")
            print(f"   Resets at: {data.get('resets_at', 'unknown')}")
            print()
            for feature in ["vibe_branding", "aura_lab", "coach", "creations", "profile_creator"]:
                if feature in data:
                    f = data[feature]
                    limit_str = "unlimited" if f.get("limit") == -1 else str(f.get("limit", 0))
                    print(f"   {feature}: {f.get('used', 0)}/{limit_str} (remaining: {f.get('remaining', 0)})")
            print()
        else:
            print(f"❌ User not found or error: {args.user_id}")
    
    elif args.action == "upgrade":
        result = db.table("users").update({
            "subscription_tier": "pro"
        }).eq("id", args.user_id).execute()
        
        if result.data:
            print(f"✅ User {args.user_id} upgraded to 'pro' tier")
        else:
            print(f"❌ User not found: {args.user_id}")
    
    elif args.action == "reset":
        # Reset monthly usage counters (new system from migration 031)
        updates = {"usage_reset_at": "now()"}
        
        if args.feature in ("coach", "all"):
            updates["monthly_coach_used"] = 0
        if args.feature in ("aura_lab", "all"):
            updates["monthly_aura_lab_used"] = 0
        if args.feature in ("vibe_branding", "all"):
            updates["monthly_vibe_branding_used"] = 0
        if args.feature in ("creations", "all"):
            updates["monthly_creations_used"] = 0
        if args.feature in ("profile_creator", "all"):
            updates["monthly_profile_creator_used"] = 0
        
        result = db.table("users").update(updates).eq("id", args.user_id).execute()
        
        if result.data:
            features = args.feature if args.feature != "all" else "all features"
            print(f"✅ Reset monthly usage for {features} for user {args.user_id}")
        else:
            print(f"❌ User not found: {args.user_id}")


if __name__ == "__main__":
    main()
