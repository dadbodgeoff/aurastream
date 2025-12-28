#!/usr/bin/env python3
"""
One-time script to gift a welcome promo message directly to the database.
This bypasses the API and Stripe, simulating a completed $1 purchase.
"""

import os
import sys
from datetime import datetime, timezone
from uuid import uuid4

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from supabase import create_client

# Supabase credentials from .env
SUPABASE_URL = "https://qgyvdadgdomnubngfpun.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneXZkYWRnZG9tbnVibmdmcHVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjU0MTMzMiwiZXhwIjoyMDgyMTE3MzMyfQ.IzBqHwcX2XvMam_0tBcD3QY4HEdNmQIfZcjOhPjTeX8"

# User ID for Dadbodgeoff@gmail.com
USER_ID = "61cfb147-f70a-4b04-ae70-e5b48b6d98d0"

# The welcome message
WELCOME_MESSAGE = """Thanks for checking out the app! If you run into any issues, have any questions, comments or concerns please reach out or let me know. If you guys want anything added or anything isn't working exactly how you want, I'm very proactive and quick to fix it!"""

def main():
    print("🎁 Gifting welcome promo message...")
    print(f"👤 User: Dadbodgeoff@gmail.com ({USER_ID})")
    print(f"📝 Message: {WELCOME_MESSAGE[:60]}...")
    print()

    # Connect to Supabase with service role (bypasses RLS)
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    now = datetime.now(timezone.utc).isoformat()
    payment_id = str(uuid4())
    message_id = str(uuid4())

    # 1. Create a "completed" payment record
    print("💳 Creating payment record...")
    payment_data = {
        "id": payment_id,
        "user_id": USER_ID,
        "stripe_checkout_session_id": f"gift_welcome_{uuid4()}",
        "stripe_payment_intent_id": f"gift_pi_welcome_{uuid4()}",
        "amount_cents": 100,
        "status": "completed",
        "pending_content": WELCOME_MESSAGE,
        "pending_link_url": None,
        "created_at": now,
        "completed_at": now,
    }
    
    result = supabase.table("promo_payments").insert(payment_data).execute()
    if not result.data:
        print("❌ Failed to create payment record")
        return
    print(f"✅ Payment record created: {payment_id}")

    # 2. Create the promo message
    print("📨 Creating promo message...")
    message_data = {
        "id": message_id,
        "user_id": USER_ID,
        "payment_id": payment_id,
        "content": WELCOME_MESSAGE,
        "link_url": None,
        "link_preview": None,
        "is_pinned": False,
        "reactions": {"fire": 0, "crown": 0, "heart": 0, "game": 0},
        "created_at": now,
    }
    
    result = supabase.table("promo_messages").insert(message_data).execute()
    if not result.data:
        print("❌ Failed to create message")
        return
    print(f"✅ Message created: {message_id}")

    # 3. Recalculate leaderboard
    print("🏆 Recalculating leaderboard...")
    try:
        supabase.rpc("recalculate_promo_leaderboard").execute()
        print("✅ Leaderboard updated")
    except Exception as e:
        print(f"⚠️  Leaderboard update failed (may not exist yet): {e}")

    print()
    print("🎉 SUCCESS! Welcome message has been posted to the promo chatroom!")
    print(f"   Message ID: {message_id}")

if __name__ == "__main__":
    main()
