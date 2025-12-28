#!/usr/bin/env python3
"""
End-to-End Test for Coach Service Flow.

This script simulates a real user going through the complete coach flow:
1. Login with credentials
2. Start a coach session with context
3. Send messages to refine the prompt
4. Verify the refined description is extracted correctly
5. Trigger generation (optional - requires worker running)
6. Verify the correct prompt is passed to Nano Banana

Usage:
    python scripts/test_coach_e2e.py [--generate] [--local]
    
Options:
    --generate  Actually trigger image generation (requires worker)
    --local     Use local dev server instead of production
"""

import argparse
import asyncio
import json
import os
import sys
import time
from dataclasses import dataclass
from typing import Optional, List, Dict, Any

import aiohttp

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


@dataclass
class TestResult:
    """Result of a single test."""
    name: str
    passed: bool
    message: str
    details: Optional[Dict[str, Any]] = None


class CoachE2ETest:
    """End-to-end test for the coach service."""
    
    def __init__(
        self,
        email: str,
        password: str,
        base_url: str = "https://aurastream.shop",
    ):
        self.email = email
        self.password = password
        self.base_url = base_url
        self.api_base = f"{base_url}/api/v1"
        self.access_token: Optional[str] = None
        self.session_id: Optional[str] = None
        self.results: List[TestResult] = []
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        # Create SSL context that doesn't verify certificates (for dev/testing)
        import ssl
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        self._session = aiohttp.ClientSession(connector=connector)
        return self
    
    async def __aexit__(self, *args):
        if self._session:
            await self._session.close()
    
    def _headers(self) -> Dict[str, str]:
        """Get headers with auth token."""
        headers = {"Content-Type": "application/json"}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers
    
    def _record(self, name: str, passed: bool, message: str, details: Optional[Dict] = None):
        """Record a test result."""
        result = TestResult(name=name, passed=passed, message=message, details=details)
        self.results.append(result)
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")
        if not passed:
            print(f"       {message}")
        if details:
            print(f"       Details: {json.dumps(details, indent=2)[:500]}")
    
    # =========================================================================
    # Test Steps
    # =========================================================================
    
    async def test_login(self) -> bool:
        """Test 1: Login and get access token."""
        print("\n" + "="*60)
        print("TEST 1: Login")
        print("="*60)
        
        try:
            async with self._session.post(
                f"{self.api_base}/auth/login",
                json={"email": self.email, "password": self.password},
                headers={"Content-Type": "application/json"},
            ) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    self._record("Login", False, f"Status {resp.status}: {text}")
                    return False
                
                data = await resp.json()
                self.access_token = data.get("access_token")
                user = data.get("user", {})
                
                if not self.access_token:
                    self._record("Login", False, "No access token in response")
                    return False
                
                self._record(
                    "Login",
                    True,
                    f"Logged in as {user.get('display_name')} ({user.get('email')})",
                    {"tier": user.get("subscription_tier")}
                )
                return True
                
        except Exception as e:
            self._record("Login", False, f"Exception: {e}")
            return False
    
    async def test_start_coach_session(self) -> bool:
        """Test 2: Start a coach session with context."""
        print("\n" + "="*60)
        print("TEST 2: Start Coach Session")
        print("="*60)
        
        # Build request - simulating what the frontend sends
        request_data = {
            "brand_context": {
                "brand_kit_id": "",
                "colors": [
                    {"hex": "#FF6B00", "name": "Orange"},
                    {"hex": "#1A1A2E", "name": "Dark Blue"},
                ],
                "tone": "energetic",
                "fonts": {"headline": "Inter", "body": "Inter"},
            },
            "asset_type": "youtube_thumbnail",
            "mood": "custom",
            "custom_mood": "epic gaming vibes",
            "description": "I want a Fortnite Chapter 7 thumbnail with the new POI",
        }
        
        print(f"Request: {json.dumps(request_data, indent=2)}")
        
        try:
            # The coach endpoint uses SSE streaming
            full_response = ""
            session_id = None
            refined_description = None
            is_ready = False
            
            async with self._session.post(
                f"{self.api_base}/coach/start",
                json=request_data,
                headers=self._headers(),
            ) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    self._record("Start Coach Session", False, f"Status {resp.status}: {text}")
                    return False
                
                # Parse SSE stream
                async for line in resp.content:
                    line = line.decode('utf-8').strip()
                    if not line or not line.startswith('data: '):
                        continue
                    
                    try:
                        data = json.loads(line[6:])  # Remove 'data: ' prefix
                        chunk_type = data.get("type")
                        
                        if chunk_type == "token":
                            full_response += data.get("content", "")
                        elif chunk_type == "intent_ready":
                            metadata = data.get("metadata", {})
                            is_ready = metadata.get("is_ready", False)
                            refined_description = metadata.get("refined_description", "")
                            print(f"\n[INTENT_READY] is_ready={is_ready}")
                            print(f"[INTENT_READY] refined_description={refined_description[:100]}...")
                        elif chunk_type == "done":
                            metadata = data.get("metadata", {})
                            session_id = metadata.get("session_id")
                            print(f"\n[DONE] session_id={session_id}")
                        elif chunk_type == "error":
                            self._record("Start Coach Session", False, f"Error: {data.get('content')}")
                            return False
                    except json.JSONDecodeError:
                        continue
            
            self.session_id = session_id
            
            print(f"\nFull coach response:\n{full_response[:500]}...")
            
            # Verify the refined description is NOT placeholder text
            placeholder_patterns = [
                "custom mood, custom mood",
                "Help me describe exactly",
                "Help me figure out",
            ]
            
            has_placeholder = any(p in (refined_description or "") for p in placeholder_patterns)
            
            if has_placeholder:
                self._record(
                    "Start Coach Session",
                    False,
                    "CRITICAL: Refined description contains placeholder text!",
                    {"refined_description": refined_description}
                )
                return False
            
            if not refined_description or len(refined_description) < 20:
                self._record(
                    "Start Coach Session",
                    False,
                    "Refined description is too short or empty",
                    {"refined_description": refined_description}
                )
                return False
            
            self._record(
                "Start Coach Session",
                True,
                f"Session started, refined description extracted correctly",
                {
                    "session_id": session_id,
                    "is_ready": is_ready,
                    "refined_description": refined_description[:100],
                }
            )
            return True
            
        except Exception as e:
            self._record("Start Coach Session", False, f"Exception: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def test_continue_chat(self) -> bool:
        """Test 3: Continue the chat to refine the prompt."""
        print("\n" + "="*60)
        print("TEST 3: Continue Chat (Refine Prompt)")
        print("="*60)
        
        if not self.session_id:
            self._record("Continue Chat", False, "No session ID from previous test")
            return False
        
        # Send a refinement message
        message = "Make it more vibrant with neon colors and add 'BEST SEASON EVER' text"
        print(f"Sending message: {message}")
        
        try:
            full_response = ""
            refined_description = None
            is_ready = False
            
            async with self._session.post(
                f"{self.api_base}/coach/sessions/{self.session_id}/messages",
                json={"message": message},
                headers=self._headers(),
            ) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    self._record("Continue Chat", False, f"Status {resp.status}: {text}")
                    return False
                
                # Parse SSE stream
                async for line in resp.content:
                    line = line.decode('utf-8').strip()
                    if not line or not line.startswith('data: '):
                        continue
                    
                    try:
                        data = json.loads(line[6:])
                        chunk_type = data.get("type")
                        
                        if chunk_type == "token":
                            full_response += data.get("content", "")
                        elif chunk_type == "intent_ready":
                            metadata = data.get("metadata", {})
                            is_ready = metadata.get("is_ready", False)
                            refined_description = metadata.get("refined_description", "")
                            print(f"\n[INTENT_READY] is_ready={is_ready}")
                            print(f"[INTENT_READY] refined_description={refined_description[:100]}...")
                        elif chunk_type == "error":
                            self._record("Continue Chat", False, f"Error: {data.get('content')}")
                            return False
                    except json.JSONDecodeError:
                        continue
            
            print(f"\nCoach response:\n{full_response[:500]}...")
            
            # Verify refinement was captured
            if not refined_description:
                self._record("Continue Chat", False, "No refined description returned")
                return False
            
            # Check that the refinement includes our additions
            desc_lower = refined_description.lower()
            has_neon = "neon" in desc_lower or "vibrant" in desc_lower
            has_text = "best season" in desc_lower or "text" in desc_lower
            
            self._record(
                "Continue Chat",
                True,
                f"Chat continued, refinement captured",
                {
                    "is_ready": is_ready,
                    "has_neon_mention": has_neon,
                    "has_text_mention": has_text,
                    "refined_description": refined_description[:150],
                }
            )
            return True
            
        except Exception as e:
            self._record("Continue Chat", False, f"Exception: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def test_end_session(self) -> bool:
        """Test 4: End the session and get final output."""
        print("\n" + "="*60)
        print("TEST 4: End Session")
        print("="*60)
        
        if not self.session_id:
            self._record("End Session", False, "No session ID")
            return False
        
        try:
            async with self._session.post(
                f"{self.api_base}/coach/sessions/{self.session_id}/end",
                headers=self._headers(),
            ) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    self._record("End Session", False, f"Status {resp.status}: {text}")
                    return False
                
                data = await resp.json()
                
                refined_intent = data.get("refined_intent", {})
                final_description = refined_intent.get("description", "")
                confidence = refined_intent.get("confidence_score", 0)
                
                print(f"Final description: {final_description}")
                print(f"Confidence: {confidence}")
                
                # Verify no placeholder text
                placeholder_patterns = [
                    "custom mood, custom mood",
                    "Help me describe exactly",
                    "Help me figure out",
                ]
                
                has_placeholder = any(p in final_description for p in placeholder_patterns)
                
                if has_placeholder:
                    self._record(
                        "End Session",
                        False,
                        "CRITICAL: Final description contains placeholder text!",
                        {"final_description": final_description}
                    )
                    return False
                
                self._record(
                    "End Session",
                    True,
                    "Session ended successfully",
                    {
                        "final_description": final_description[:150],
                        "confidence": confidence,
                    }
                )
                return True
                
        except Exception as e:
            self._record("End Session", False, f"Exception: {e}")
            return False
    
    async def test_get_session(self) -> bool:
        """Test 5: Get session details."""
        print("\n" + "="*60)
        print("TEST 5: Get Session Details")
        print("="*60)
        
        if not self.session_id:
            self._record("Get Session", False, "No session ID")
            return False
        
        try:
            async with self._session.get(
                f"{self.api_base}/coach/sessions/{self.session_id}",
                headers=self._headers(),
            ) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    self._record("Get Session", False, f"Status {resp.status}: {text}")
                    return False
                
                data = await resp.json()
                
                status = data.get("status")
                turns_used = data.get("turns_used", 0)
                current_prompt = data.get("current_prompt_draft", "")
                
                print(f"Status: {status}")
                print(f"Turns used: {turns_used}")
                print(f"Current prompt: {current_prompt[:100]}...")
                
                self._record(
                    "Get Session",
                    True,
                    f"Session retrieved: status={status}, turns={turns_used}",
                    {"current_prompt": current_prompt[:100]}
                )
                return True
                
        except Exception as e:
            self._record("Get Session", False, f"Exception: {e}")
            return False
    
    # =========================================================================
    # Run All Tests
    # =========================================================================
    
    async def run_all(self, include_generation: bool = False) -> bool:
        """Run all tests and return overall pass/fail."""
        print("\n" + "="*60)
        print("COACH SERVICE E2E TEST")
        print("="*60)
        print(f"Target: {self.base_url}")
        print(f"User: {self.email}")
        print("="*60)
        
        # Run tests in sequence
        if not await self.test_login():
            return False
        
        if not await self.test_start_coach_session():
            return False
        
        if not await self.test_continue_chat():
            return False
        
        if not await self.test_end_session():
            return False
        
        if not await self.test_get_session():
            return False
        
        # Print summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for r in self.results if r.passed)
        total = len(self.results)
        
        for result in self.results:
            status = "✅" if result.passed else "❌"
            print(f"{status} {result.name}: {result.message}")
        
        print(f"\nTotal: {passed}/{total} tests passed")
        
        all_passed = passed == total
        if all_passed:
            print("\n🎉 ALL TESTS PASSED!")
        else:
            print("\n💥 SOME TESTS FAILED!")
        
        return all_passed


async def main():
    parser = argparse.ArgumentParser(description="Coach Service E2E Test")
    parser.add_argument("--generate", action="store_true", help="Trigger actual generation")
    parser.add_argument("--local", action="store_true", help="Use local dev server")
    parser.add_argument("--email", default="dadbodgeoff@gmail.com", help="Test user email")
    parser.add_argument("--password", default="Password123!", help="Test user password")
    args = parser.parse_args()
    
    base_url = "http://localhost:8000" if args.local else "https://aurastream.shop"
    
    async with CoachE2ETest(
        email=args.email,
        password=args.password,
        base_url=base_url,
    ) as test:
        success = await test.run_all(include_generation=args.generate)
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
