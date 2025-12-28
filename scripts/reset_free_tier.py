#!/usr/bin/env python3
"""
Reset free tier usage for a user or upgrade them to pro.

Usage:
    python scripts/reset_free_tier.py --user-id <uuid> --action reset
    python scripts/reset_free_tier.py --user-id <uuid> --action upgrade
"""

import argparse
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database.supabase_client import get_supabase_client


def main():
    parser = argparse.ArgumentParser(description="Reset free tier usage or upgrade user")
    parser.add_argument("--user-id", required=True, help="User UUID")
    parser.add_argument("--action", choices=["reset", "upgrade"], default="reset",
                        help="reset = clear cooldowns, upgrade = set to pro tier")
    parser.add_argument("--feature", choices=["coach", "aura_lab", "vibe_branding", "all"], 
                        default="all", help="Feature to reset (only for reset action)")
    args = parser.parse_args()
    
    db = get_supabase_client()
    
    if args.action == "upgrade":
        result = db.table("users").update({
            "subscription_tier": "pro"
        }).eq("id", args.user_id).execute()
        
        if result.data:
            print(f"✅ User {args.user_id} upgraded to 'pro' tier")
        else:
            print(f"❌ User not found: {args.user_id}")
    
    elif args.action == "reset":
        updates = {}
        if args.feature in ("coach", "all"):
            updates["free_coach_used_at"] = None
        if args.feature in ("aura_lab", "all"):
            updates["free_aura_lab_used_at"] = None
        if args.feature in ("vibe_branding", "all"):
            updates["free_vibe_branding_used_at"] = None
        
        result = db.table("users").update(updates).eq("id", args.user_id).execute()
        
        if result.data:
            features = args.feature if args.feature != "all" else "all features"
            print(f"✅ Reset free tier cooldown for {features} for user {args.user_id}")
        else:
            print(f"❌ User not found: {args.user_id}")


if __name__ == "__main__":
    main()
