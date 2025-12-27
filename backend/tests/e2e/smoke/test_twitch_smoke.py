"""
Twitch Integration Endpoints Smoke Tests.

Validates Twitch-related endpoints are reachable and properly
enforce authentication requirements.
"""

import pytest
from fastapi.testclient import TestClient


# Test UUID for endpoints requiring an ID parameter
TEST_UUID = "00000000-0000-0000-0000-000000000000"

# Test game ID for game metadata endpoint
TEST_GAME_ID = "12345"


@pytest.mark.e2e
@pytest.mark.smoke
class TestTwitchEndpointsSmoke:
    """
    Smoke test suite for Twitch integration endpoints.
    
    These tests validate that Twitch-related endpoints are reachable
    and properly respond. They verify the API contract
    for Twitch emote and pack generation features.
    """

    def test_twitch_dimensions_endpoint_exists(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/twitch/dimensions is accessible.
        
        The dimensions endpoint provides Twitch emote size specifications.
        It may be public or require authentication.
        
        Validates:
            - Endpoint is reachable and responding
            - Returns 200 (public) or 401 (requires auth)
        """
        response = client.get("/api/v1/twitch/dimensions")
        
        assert response.status_code in [200, 401], (
            f"Twitch dimensions endpoint should return 200 or 401, "
            f"got {response.status_code}"
        )

    def test_twitch_generate_requires_auth(self, client: TestClient) -> None:
        """
        Test that POST /api/v1/twitch/generate returns 401 without authentication.
        
        The generate endpoint creates Twitch emotes and requires authentication
        to track usage and associate generated content with users.
        
        Validates:
            - HTTP status code is 401 (Unauthorized)
            - Endpoint is reachable and responding
            - Authentication is enforced for generation requests
        """
        response = client.post(
            "/api/v1/twitch/generate",
            json={"prompt": "test emote"}
        )
        
        assert response.status_code == 401, (
            f"Twitch generate endpoint should return 401 without auth, "
            f"got {response.status_code}"
        )

    def test_twitch_packs_create_requires_auth(self, client: TestClient) -> None:
        """
        Test that POST /api/v1/twitch/packs returns 401 without authentication.
        
        Creating emote packs requires authentication to associate the pack
        with a user account and track resource usage.
        
        Validates:
            - HTTP status code is 401 (Unauthorized)
            - Endpoint is reachable and responding
            - Authentication is enforced for pack creation
        """
        response = client.post(
            "/api/v1/twitch/packs",
            json={"name": "test pack"}
        )
        
        assert response.status_code == 401, (
            f"Twitch packs create endpoint should return 401 without auth, "
            f"got {response.status_code}"
        )

    def test_twitch_packs_get_requires_auth(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/twitch/packs/{uuid} returns 401 without authentication.
        
        Retrieving pack details requires authentication to ensure users
        can only access their own packs or authorized shared packs.
        
        Validates:
            - HTTP status code is 401 (Unauthorized)
            - Endpoint is reachable and responding
            - Authentication is enforced before resource lookup
        """
        response = client.get(f"/api/v1/twitch/packs/{TEST_UUID}")
        
        assert response.status_code == 401, (
            f"Twitch packs get endpoint should return 401 without auth, "
            f"got {response.status_code}"
        )

    def test_twitch_game_meta_endpoint_exists(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/twitch/game-meta/{game_id} is accessible.
        
        Game metadata retrieval may require authentication or be public.
        
        Validates:
            - Endpoint is reachable and responding
            - Returns 200, 401, or 404 (valid game_id required)
        """
        response = client.get(f"/api/v1/twitch/game-meta/{TEST_GAME_ID}")
        
        assert response.status_code in [200, 401, 404], (
            f"Twitch game meta endpoint should return 200, 401, or 404, "
            f"got {response.status_code}"
        )
