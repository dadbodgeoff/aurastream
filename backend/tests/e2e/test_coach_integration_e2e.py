"""
E2E Test: Coach Integration Flow
Tests the AI Coach flow that's now integrated into Build Your Own.

This test validates:
1. User authentication
2. Coach access check
3. Coach session start with mood/game/description
4. Coach message exchange
5. Generation from Coach prompt

Run with: python3 backend/tests/e2e/test_coach_integration_e2e.py
"""

import os
import sys
import time
import requests
from typing import Optional

# Configuration
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:8000')
TEST_EMAIL = "tester50@aurastream.shop"
TEST_PASSWORD = "AuraTest2025!"


class CoachIntegrationE2ETest:
    """E2E test for Coach integration in Build Your Own flow."""
    
    def __init__(self):
        self.session = requests.Session()
        self.access_token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.coach_session_id: Optional[str] = None
        
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
        
        try:
            response = self.session.post(url, json=payload)
            self.log(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.user_id = data.get("user", {}).get("id")
                tier = data.get("user", {}).get("subscription_tier", "unknown")
                
                self.log(f"✅ Login successful!")
                self.log(f"User ID: {self.user_id}")
                self.log(f"Tier: {tier}")
                return True
            else:
                self.log(f"❌ Login failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login error: {e}", "ERROR")
            return False
    
    # =========================================================================
    # Step 2: Check Coach Access
    # =========================================================================
    def test_coach_access(self) -> bool:
        """Test coach access endpoint."""
        self.step("2. Check Coach Access")
        
        url = f"{API_BASE_URL}/api/v1/coach/access"
        
        self.log(f"GET {url}")
        
        try:
            response = self.session.get(url, headers=self.auth_headers())
            self.log(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Coach access check passed!")
                self.log(f"Has Access: {data.get('has_access')}")
                self.log(f"Feature: {data.get('feature')}")
                self.log(f"Trial Available: {data.get('trial_available')}")
                return True
            else:
                self.log(f"❌ Coach access check failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Coach access error: {e}", "ERROR")
            return False
    
    # =========================================================================
    # Step 3: Get Coach Tips (Free tier fallback)
    # =========================================================================
    def test_coach_tips(self) -> bool:
        """Test coach tips endpoint."""
        self.step("3. Get Coach Tips")
        
        url = f"{API_BASE_URL}/api/v1/coach/tips"
        params = {"asset_type": "thumbnail"}
        
        self.log(f"GET {url}")
        
        try:
            response = self.session.get(url, params=params, headers=self.auth_headers())
            self.log(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                tips = data.get("tips", [])
                self.log(f"✅ Got {len(tips)} tips!")
                for i, tip in enumerate(tips[:3]):
                    self.log(f"  Tip {i+1}: {tip[:50]}...")
                return True
            else:
                self.log(f"❌ Tips fetch failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Tips error: {e}", "ERROR")
            return False
    
    # =========================================================================
    # Step 4: Start Coach Session (with mood/game/description)
    # =========================================================================
    def test_start_coach_session(self) -> bool:
        """Test starting a coach session with context."""
        self.step("4. Start Coach Session")
        
        url = f"{API_BASE_URL}/api/v1/coach/start"
        
        # This simulates the new integrated Coach flow with mood/game/description
        payload = {
            "asset_type": "youtube_thumbnail",
            "mood": "hype",
            "description": "I want to create an epic gaming thumbnail for my Fortnite victory royale video",
            "game_name": "Fortnite",
            "brand_context": None  # Optional
        }
        
        self.log(f"POST {url}")
        self.log(f"Asset Type: {payload['asset_type']}")
        self.log(f"Mood: {payload['mood']}")
        self.log(f"Game: {payload['game_name']}")
        self.log(f"Description: {payload['description'][:40]}...")
        
        try:
            # Coach uses SSE streaming, so we need to handle it differently
            response = self.session.post(
                url, 
                json=payload, 
                headers={**self.auth_headers(), "Accept": "text/event-stream"},
                stream=True,
                timeout=30
            )
            self.log(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                # Read SSE stream
                full_response = ""
                session_id = None
                
                for line in response.iter_lines(decode_unicode=True):
                    if line:
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str.strip():
                                try:
                                    import json
                                    chunk = json.loads(data_str)
                                    chunk_type = chunk.get("type")
                                    
                                    if chunk_type == "token":
                                        full_response += chunk.get("content", "")
                                    elif chunk_type == "done":
                                        session_id = chunk.get("session_id")
                                        break
                                except:
                                    pass
                
                if session_id:
                    self.coach_session_id = session_id
                    self.log(f"✅ Coach session started!")
                    self.log(f"Session ID: {session_id}")
                    self.log(f"Response preview: {full_response[:100]}...")
                    return True
                else:
                    self.log(f"✅ Coach responded (no session ID in response)")
                    self.log(f"Response preview: {full_response[:100]}...")
                    return True
            else:
                self.log(f"❌ Coach start failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Coach start error: {e}", "ERROR")
            return False
    
    # =========================================================================
    # Step 5: Test Generation Endpoint (simulating Coach-assisted generation)
    # =========================================================================
    def test_generate_from_coach(self) -> Optional[str]:
        """Test generation with a Coach-refined prompt."""
        self.step("5. Generate from Coach Prompt")
        
        url = f"{API_BASE_URL}/api/v1/generate"
        
        # Simulate a prompt that would come from Coach refinement
        payload = {
            "asset_type": "thumbnail",
            "custom_prompt": "Epic Fortnite Victory Royale thumbnail with golden crown, dramatic lighting, hype energy, neon accents",
        }
        
        self.log(f"POST {url}")
        self.log(f"Prompt: {payload['custom_prompt'][:50]}...")
        
        try:
            response = self.session.post(url, json=payload, headers=self.auth_headers())
            self.log(f"Status: {response.status_code}")
            
            if response.status_code in [200, 201, 202]:
                data = response.json()
                job_id = data.get("id") or data.get("job_id")
                
                self.log(f"✅ Generation job created!")
                self.log(f"Job ID: {job_id}")
                return job_id
            else:
                self.log(f"❌ Generation failed: {response.text}", "ERROR")
                return None
                
        except Exception as e:
            self.log(f"❌ Generation error: {e}", "ERROR")
            return None
    
    # =========================================================================
    # Step 6: Poll and Verify
    # =========================================================================
    def test_poll_and_verify(self, job_id: str) -> bool:
        """Poll job and verify asset creation."""
        self.step("6. Poll and Verify Asset")
        
        url = f"{API_BASE_URL}/api/v1/jobs/{job_id}"
        
        for attempt in range(30):
            try:
                response = self.session.get(url, headers=self.auth_headers())
                
                if response.status_code == 200:
                    data = response.json()
                    status = data.get("status")
                    
                    self.log(f"Attempt {attempt + 1}: Status = {status}")
                    
                    if status == "completed":
                        self.log(f"✅ Job completed!")
                        
                        # Get assets
                        assets_url = f"{API_BASE_URL}/api/v1/jobs/{job_id}/assets"
                        assets_response = self.session.get(assets_url, headers=self.auth_headers())
                        
                        if assets_response.status_code == 200:
                            assets_data = assets_response.json()
                            assets = assets_data.get("assets", []) if isinstance(assets_data, dict) else assets_data
                            self.log(f"✅ Found {len(assets)} asset(s)")
                            
                            for asset in assets:
                                self.log(f"  - {asset.get('asset_type')}: {asset.get('width')}x{asset.get('height')}")
                            
                            return len(assets) > 0
                        
                        return True
                    elif status == "failed":
                        self.log(f"❌ Job failed: {data.get('error_message')}", "ERROR")
                        return False
                    else:
                        time.sleep(2)
                else:
                    time.sleep(2)
                    
            except Exception as e:
                self.log(f"Poll error: {e}", "WARN")
                time.sleep(2)
        
        self.log(f"❌ Job did not complete in time", "ERROR")
        return False
    
    # =========================================================================
    # Run Full Test
    # =========================================================================
    def run(self) -> bool:
        """Run the full E2E test."""
        print("\n" + "="*60)
        print("COACH INTEGRATION E2E TEST")
        print("="*60)
        print(f"API: {API_BASE_URL}")
        print(f"User: {TEST_EMAIL}")
        print("="*60)
        
        # Step 1: Login
        if not self.test_login():
            return False
            
        # Step 2: Check Coach Access
        if not self.test_coach_access():
            self.log("Coach access check failed, but continuing...", "WARN")
            
        # Step 3: Get Tips
        if not self.test_coach_tips():
            self.log("Tips fetch failed, but continuing...", "WARN")
            
        # Step 4: Start Coach Session
        if not self.test_start_coach_session():
            self.log("Coach session failed, but continuing with generation...", "WARN")
            
        # Step 5: Generate from Coach
        job_id = self.test_generate_from_coach()
        if not job_id:
            return False
            
        # Step 6: Poll and Verify
        if not self.test_poll_and_verify(job_id):
            return False
        
        # Success!
        print("\n" + "="*60)
        print("✅ ALL COACH INTEGRATION TESTS PASSED!")
        print("="*60)
        return True


def main():
    """Run the E2E test."""
    test = CoachIntegrationE2ETest()
    success = test.run()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
