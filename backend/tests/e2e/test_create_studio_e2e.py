"""
E2E Test: Create Studio Full Flow
Tests the complete user journey from login to asset generation.

This test validates:
1. User authentication (login)
2. Brand kit retrieval
3. Asset generation request (Build Your Own flow)
4. Job status polling
5. Asset retrieval

Run with: python -m pytest backend/tests/e2e/test_create_studio_e2e.py -v -s
"""

import os
import sys
import time
import requests
from typing import Optional

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

# Configuration
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:8000')
TEST_EMAIL = "tester50@aurastream.shop"
TEST_PASSWORD = "AuraTest2025!"


class CreateStudioE2ETest:
    """E2E test for Create Studio flow."""
    
    def __init__(self):
        self.session = requests.Session()
        self.access_token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.brand_kit_id: Optional[str] = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log with timestamp."""
        timestamp = time.strftime("%H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def step(self, name: str):
        """Log a test step."""
        print(f"\n{'='*60}")
        print(f"STEP: {name}")
        print(f"{'='*60}")
        
    def auth_headers(self) -> dict:
        """Get authorization headers."""
        if not self.access_token:
            raise ValueError("Not authenticated")
        return {"Authorization": f"Bearer {self.access_token}"}
    
    # =========================================================================
    # Step 1: Login
    # =========================================================================
    def test_login(self) -> bool:
        """Test user login."""
        self.step("1. User Login")
        
        url = f"{API_BASE_URL}/api/v1/auth/login"
        payload = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        self.log(f"POST {url}")
        self.log(f"Email: {TEST_EMAIL}")
        
        try:
            response = self.session.post(url, json=payload)
            self.log(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.user_id = data.get("user", {}).get("id")
                
                self.log(f"✅ Login successful!")
                self.log(f"User ID: {self.user_id}")
                self.log(f"Tier: {data.get('user', {}).get('subscription_tier', 'unknown')}")
                return True
            else:
                self.log(f"❌ Login failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login error: {e}", "ERROR")
            return False
    
    # =========================================================================
    # Step 2: Get User Profile
    # =========================================================================
    def test_get_profile(self) -> bool:
        """Test getting user profile."""
        self.step("2. Get User Profile")
        
        url = f"{API_BASE_URL}/api/v1/auth/me"
        
        self.log(f"GET {url}")
        
        try:
            response = self.session.get(url, headers=self.auth_headers())
            self.log(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Profile retrieved!")
                self.log(f"Email: {data.get('email')}")
                self.log(f"Display Name: {data.get('display_name')}")
                self.log(f"Tier: {data.get('subscription_tier')}")
                self.log(f"Assets This Month: {data.get('assets_generated_this_month')}")
                return True
            else:
                self.log(f"❌ Profile fetch failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Profile error: {e}", "ERROR")
            return False
    
    # =========================================================================
    # Step 3: Get Brand Kits
    # =========================================================================
    def test_get_brand_kits(self) -> bool:
        """Test getting brand kits."""
        self.step("3. Get Brand Kits")
        
        url = f"{API_BASE_URL}/api/v1/brand-kits"
        
        self.log(f"GET {url}")
        
        try:
            response = self.session.get(url, headers=self.auth_headers())
            self.log(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                brand_kits = data.get("brand_kits", [])
                self.log(f"✅ Found {len(brand_kits)} brand kit(s)")
                
                # Find active brand kit or use first one
                for kit in brand_kits:
                    self.log(f"  - {kit.get('name')} (ID: {kit.get('id')[:8]}..., Active: {kit.get('is_active')})")
                    if kit.get('is_active'):
                        self.brand_kit_id = kit.get('id')
                
                if not self.brand_kit_id and brand_kits:
                    self.brand_kit_id = brand_kits[0].get('id')
                    
                if self.brand_kit_id:
                    self.log(f"Using brand kit: {self.brand_kit_id[:8]}...")
                else:
                    self.log("No brand kit selected (will generate without)")
                    
                return True
            else:
                self.log(f"❌ Brand kits fetch failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Brand kits error: {e}", "ERROR")
            return False
    
    # =========================================================================
    # Step 4: Generate Asset (Build Your Own Flow)
    # =========================================================================
    def test_generate_asset(self) -> Optional[str]:
        """Test asset generation - simulates Build Your Own flow."""
        self.step("4. Generate Asset (Build Your Own)")
        
        url = f"{API_BASE_URL}/api/v1/generate"
        
        # Simulate the Build Your Own flow with manual prompt
        payload = {
            "asset_type": "thumbnail",
            "custom_prompt": "A vibrant gaming thumbnail with neon colors and epic action scene",
        }
        
        # Add brand kit if available
        if self.brand_kit_id:
            payload["brand_kit_id"] = self.brand_kit_id
            
        self.log(f"POST {url}")
        self.log(f"Asset Type: {payload['asset_type']}")
        self.log(f"Prompt: {payload['custom_prompt'][:50]}...")
        self.log(f"Brand Kit: {self.brand_kit_id[:8] if self.brand_kit_id else 'None'}...")
        
        try:
            response = self.session.post(url, json=payload, headers=self.auth_headers())
            self.log(f"Status: {response.status_code}")
            
            if response.status_code in [200, 201, 202]:
                data = response.json()
                job_id = data.get("id") or data.get("job_id")
                
                self.log(f"✅ Generation job created!")
                self.log(f"Job ID: {job_id}")
                self.log(f"Status: {data.get('status')}")
                return job_id
            else:
                self.log(f"❌ Generation failed: {response.text}", "ERROR")
                return None
                
        except Exception as e:
            self.log(f"❌ Generation error: {e}", "ERROR")
            return None
    
    # =========================================================================
    # Step 5: Poll Job Status
    # =========================================================================
    def test_poll_job(self, job_id: str, max_attempts: int = 30) -> bool:
        """Poll job status until completion."""
        self.step("5. Poll Job Status")
        
        url = f"{API_BASE_URL}/api/v1/jobs/{job_id}"
        
        self.log(f"Polling job: {job_id}")
        self.log(f"Max attempts: {max_attempts}")
        
        for attempt in range(max_attempts):
            try:
                response = self.session.get(url, headers=self.auth_headers())
                
                if response.status_code == 200:
                    data = response.json()
                    status = data.get("status")
                    
                    self.log(f"Attempt {attempt + 1}: Status = {status}")
                    
                    if status == "completed":
                        self.log(f"✅ Job completed!")
                        return True
                    elif status == "failed":
                        self.log(f"❌ Job failed: {data.get('error_message')}", "ERROR")
                        return False
                    elif status in ["queued", "processing"]:
                        time.sleep(2)  # Wait 2 seconds before next poll
                    else:
                        self.log(f"Unknown status: {status}", "WARN")
                        time.sleep(2)
                else:
                    self.log(f"Poll failed: {response.status_code}", "WARN")
                    time.sleep(2)
                    
            except Exception as e:
                self.log(f"Poll error: {e}", "WARN")
                time.sleep(2)
        
        self.log(f"❌ Job did not complete within {max_attempts} attempts", "ERROR")
        return False
    
    # =========================================================================
    # Step 6: Get Generated Assets
    # =========================================================================
    def test_get_assets(self, job_id: str) -> bool:
        """Get assets from completed job."""
        self.step("6. Get Generated Assets")
        
        url = f"{API_BASE_URL}/api/v1/jobs/{job_id}/assets"
        
        self.log(f"GET {url}")
        
        try:
            response = self.session.get(url, headers=self.auth_headers())
            self.log(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                assets = data.get("assets", []) if isinstance(data, dict) else data
                
                self.log(f"✅ Found {len(assets)} asset(s)")
                
                for asset in assets:
                    self.log(f"  - Asset ID: {asset.get('id', 'N/A')[:8]}...")
                    self.log(f"    Type: {asset.get('asset_type')}")
                    self.log(f"    Size: {asset.get('width')}x{asset.get('height')}")
                    self.log(f"    URL: {asset.get('url', 'N/A')[:50]}...")
                    
                return len(assets) > 0
            else:
                self.log(f"❌ Assets fetch failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Assets error: {e}", "ERROR")
            return False
    
    # =========================================================================
    # Run Full Test
    # =========================================================================
    def run(self) -> bool:
        """Run the full E2E test."""
        print("\n" + "="*60)
        print("CREATE STUDIO E2E TEST")
        print("="*60)
        print(f"API: {API_BASE_URL}")
        print(f"User: {TEST_EMAIL}")
        print("="*60)
        
        # Step 1: Login
        if not self.test_login():
            return False
            
        # Step 2: Get Profile
        if not self.test_get_profile():
            return False
            
        # Step 3: Get Brand Kits
        if not self.test_get_brand_kits():
            return False
            
        # Step 4: Generate Asset
        job_id = self.test_generate_asset()
        if not job_id:
            return False
            
        # Step 5: Poll Job Status
        if not self.test_poll_job(job_id):
            return False
            
        # Step 6: Get Assets
        if not self.test_get_assets(job_id):
            return False
        
        # Success!
        print("\n" + "="*60)
        print("✅ ALL TESTS PASSED!")
        print("="*60)
        return True


def main():
    """Run the E2E test."""
    test = CreateStudioE2ETest()
    success = test.run()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
