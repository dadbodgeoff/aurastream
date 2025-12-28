#!/usr/bin/env python3
"""
Test script to gift a promo message without payment.
Usage: python scripts/test_promo_gift.py --token YOUR_JWT_TOKEN [--local]
"""

import argparse
import requests
import json

# The welcome message content
WELCOME_MESSAGE = """Thanks for checking out the app! If you run into any issues, have any questions, comments or concerns please reach out or let me know. If you guys want anything added or anything isn't working exactly how you want, I'm very proactive and quick to fix it!"""

def main():
    parser = argparse.ArgumentParser(description="Gift a promo message for testing")
    parser.add_argument("--token", required=True, help="Your JWT access token")
    parser.add_argument("--local", action="store_true", help="Use local dev server (localhost:8000)")
    parser.add_argument("--message", default=WELCOME_MESSAGE, help="Custom message content")
    args = parser.parse_args()

    base_url = "http://localhost:8000" if args.local else "https://aurastream.shop"
    endpoint = f"{base_url}/api/v1/promo/dev/gift-message"

    headers = {
        "Authorization": f"Bearer {args.token}",
        "Content-Type": "application/json",
    }

    payload = {
        "content": args.message,
        "link_url": None,
    }

    print(f"🎁 Gifting promo message to: {endpoint}")
    print(f"📝 Message: {args.message[:50]}...")
    print()

    try:
        response = requests.post(endpoint, headers=headers, json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ SUCCESS! Message created:")
            print(json.dumps(data, indent=2))
        else:
            print(f"❌ FAILED with status {response.status_code}")
            print(response.text)
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to {base_url}")
        print("Make sure the server is running!")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
