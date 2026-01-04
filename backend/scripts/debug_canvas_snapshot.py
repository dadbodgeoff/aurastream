#!/usr/bin/env python3
"""
Debug script to check if canvas_snapshot_url is stored in job parameters.
Run with: python3 scripts/debug_canvas_snapshot.py <job_id>
"""

import sys
import os
import json
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/debug_canvas_snapshot.py <job_id>")
        print("Example: python3 scripts/debug_canvas_snapshot.py debaaf62-8207-434b-b966-1f18c5d1cfd2")
        sys.exit(1)
    
    job_id = sys.argv[1]
    
    # Create Supabase client
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        print("❌ Missing SUPABASE_URL or SUPABASE_KEY in environment")
        sys.exit(1)
    
    db = create_client(url, key)
    result = db.table("generation_jobs") \
        .select("id, parameters, prompt, status, asset_type") \
        .eq("id", job_id) \
        .execute()
    
    if not result.data:
        print(f"❌ Job not found: {job_id}")
        sys.exit(1)
    
    job = result.data[0]
    params = job.get("parameters") or {}
    
    print(f"\n{'='*60}")
    print(f"JOB DEBUG: {job_id}")
    print(f"{'='*60}")
    print(f"Status: {job.get('status')}")
    print(f"Asset Type: {job.get('asset_type')}")
    print(f"\n--- Parameters ---")
    print(f"All keys: {list(params.keys())}")
    print(f"\n--- Canvas Snapshot ---")
    print(f"canvas_snapshot_url present: {'canvas_snapshot_url' in params}")
    if 'canvas_snapshot_url' in params:
        print(f"canvas_snapshot_url: {params['canvas_snapshot_url']}")
    print(f"canvas_snapshot_description present: {'canvas_snapshot_description' in params}")
    if 'canvas_snapshot_description' in params:
        print(f"canvas_snapshot_description: {params['canvas_snapshot_description'][:200]}...")
    
    print(f"\n--- Full Parameters (JSON) ---")
    print(json.dumps(params, indent=2, default=str))
    
    print(f"\n--- Prompt Preview ---")
    prompt = job.get('prompt') or ''
    print(prompt[:500] + "..." if len(prompt) > 500 else prompt)
    print(f"{'='*60}\n")

if __name__ == "__main__":
    main()
