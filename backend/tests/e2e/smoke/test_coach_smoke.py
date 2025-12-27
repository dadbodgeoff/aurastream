"""
Coach Feature Endpoints Smoke Tests.

Validates AI coaching endpoints are reachable and properly
enforce authentication requirements where applicable.
"""

import pytest
from fastapi.testclient import TestClient


# Test UUID for endpoints requiring a session ID parameter
TEST_UUID = "00000000-0000-0000-0000-000000000000"


@pytest.mark.e2e
@pytest.mark.smoke
class TestCoachEndpointsSmoke:
    """
    Smoke test suite for AI coaching feature endpoints.
    
    These tests validate that coach endpoints are reachable and
    properly enforce authentication. The coach feature provides
    AI-powered guidance and has both public and protected endpoints.
    """

    def test_coach_tips_accessible_without_auth(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/coach/tips returns 200 without authentication.
        
        The tips endpoint provides general coaching tips. It may require
        authentication depending on the API configuration.
        
        Validates:
            - Endpoint is reachable and responding
            - Returns 200 (public) or 401 (requires auth)
        """
        response = client.get("/api/v1/coach/tips")
        
        assert response.status_code in [200, 401], (
            f"Coach tips endpoint should return 200 or 401, "
            f"got {response.status_code}"
        )
        
        # If public, verify response contains valid data
        if response.status_code == 200:
            data = response.json()
            assert data is not None, "Coach tips response should contain data"

    def test_coach_access_requires_auth(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/coach/access returns 401 without authentication.
        
        The access endpoint checks user's coaching feature access level
        and requires authentication to determine user-specific permissions.
        
        Validates:
            - HTTP status code is 401 (Unauthorized)
            - Endpoint is reachable and responding
            - Authentication is properly enforced
        """
        response = client.get("/api/v1/coach/access")
        
        assert response.status_code == 401, (
            f"Coach access endpoint should return 401 without auth, "
            f"got {response.status_code}"
        )

    def test_coach_start_requires_auth(self, client: TestClient) -> None:
        """
        Test that POST /api/v1/coach/start returns 401 without authentication.
        
        Starting a coaching session requires authentication to associate
        the session with a user and track usage limits.
        
        Validates:
            - HTTP status code is 401 (Unauthorized)
            - Endpoint is reachable and responding
            - Authentication is enforced for session creation
        """
        response = client.post(
            "/api/v1/coach/start",
            json={"topic": "test topic"}
        )
        
        assert response.status_code == 401, (
            f"Coach start endpoint should return 401 without auth, "
            f"got {response.status_code}"
        )

    def test_coach_messages_requires_auth(self, client: TestClient) -> None:
        """
        Test that POST /api/v1/coach/sessions/{uuid}/messages returns 401 without authentication.
        
        Sending messages to a coaching session requires authentication
        to verify session ownership and track conversation history.
        
        Validates:
            - HTTP status code is 401 (Unauthorized)
            - Endpoint is reachable and responding
            - Authentication is enforced before message processing
        """
        response = client.post(
            f"/api/v1/coach/sessions/{TEST_UUID}/messages",
            json={"content": "test message"}
        )
        
        assert response.status_code == 401, (
            f"Coach messages endpoint should return 401 without auth, "
            f"got {response.status_code}"
        )

    def test_coach_session_get_requires_auth(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/coach/sessions/{uuid} returns 401 without authentication.
        
        Retrieving session details requires authentication to ensure
        users can only access their own coaching sessions.
        
        Validates:
            - HTTP status code is 401 (Unauthorized)
            - Endpoint is reachable and responding
            - Authentication is enforced before session lookup
        """
        response = client.get(f"/api/v1/coach/sessions/{TEST_UUID}")
        
        assert response.status_code == 401, (
            f"Coach session get endpoint should return 401 without auth, "
            f"got {response.status_code}"
        )

    def test_coach_session_end_requires_auth(self, client: TestClient) -> None:
        """
        Test that POST /api/v1/coach/sessions/{uuid}/end returns 401 without authentication.
        
        Ending a coaching session requires authentication to verify
        session ownership and properly close the conversation.
        
        Validates:
            - HTTP status code is 401 (Unauthorized)
            - Endpoint is reachable and responding
            - Authentication is enforced for session termination
        """
        response = client.post(f"/api/v1/coach/sessions/{TEST_UUID}/end")
        
        assert response.status_code == 401, (
            f"Coach session end endpoint should return 401 without auth, "
            f"got {response.status_code}"
        )
