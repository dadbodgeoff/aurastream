"""
Authentication Endpoints Smoke Tests.

Validates that all authentication-related endpoints are reachable
and return expected status codes. These tests verify endpoint
availability without testing full authentication flows.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.mark.e2e
@pytest.mark.smoke
class TestAuthEndpointsSmoke:
    """
    Smoke tests for authentication endpoints.
    
    These tests validate that auth endpoints are properly configured
    and responding. They check for expected error codes when called
    without proper authentication or request bodies.
    """

    def test_signup_endpoint_reachable(self, client: TestClient) -> None:
        """
        Test that POST /api/v1/auth/signup returns 422 for empty body.
        
        The signup endpoint should be reachable and return a validation
        error (422) when called with an empty request body, indicating
        the endpoint is properly configured and validating input.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 422 Unprocessable Entity for missing required fields
        """
        response = client.post("/api/v1/auth/signup", json={})
        
        assert response.status_code == 422, (
            f"Signup endpoint should return 422 for empty body, got {response.status_code}"
        )

    def test_login_endpoint_reachable(self, client: TestClient) -> None:
        """
        Test that POST /api/v1/auth/login returns 422 for empty body.
        
        The login endpoint should be reachable and return a validation
        error when called without credentials.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 422 Unprocessable Entity for missing credentials
        """
        response = client.post("/api/v1/auth/login", json={})
        
        assert response.status_code == 422, (
            f"Login endpoint should return 422 for empty body, got {response.status_code}"
        )

    def test_refresh_endpoint_reachable(self, client: TestClient) -> None:
        """
        Test that POST /api/v1/auth/refresh returns 422 for empty body.
        
        The token refresh endpoint should be reachable and return a
        validation error when called without a refresh token.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 422 Unprocessable Entity for missing refresh token
        """
        response = client.post("/api/v1/auth/refresh", json={})
        
        assert response.status_code == 422, (
            f"Refresh endpoint should return 422 for empty body, got {response.status_code}"
        )

    def test_me_endpoint_requires_auth(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/auth/me returns 401 without token.
        
        The user profile endpoint should require authentication and
        return 401 Unauthorized when accessed without a valid token.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.get("/api/v1/auth/me")
        
        assert response.status_code == 401, (
            f"Me endpoint should return 401 without auth, got {response.status_code}"
        )

    def test_logout_endpoint_requires_auth(self, client: TestClient) -> None:
        """
        Test that POST /api/v1/auth/logout returns 401 without token.
        
        The logout endpoint should require authentication to invalidate
        the current session/token.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.post("/api/v1/auth/logout")
        
        assert response.status_code == 401, (
            f"Logout endpoint should return 401 without auth, got {response.status_code}"
        )

    def test_password_reset_request_reachable(self, client: TestClient) -> None:
        """
        Test that POST /api/v1/auth/password-reset/request returns 422 for empty body.
        
        The password reset request endpoint should be publicly accessible
        but require a valid email address in the request body.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 422 Unprocessable Entity for missing email
        """
        response = client.post("/api/v1/auth/password-reset/request", json={})
        
        assert response.status_code == 422, (
            f"Password reset request should return 422 for empty body, got {response.status_code}"
        )


@pytest.mark.e2e
@pytest.mark.smoke
class TestOAuthEndpointsSmoke:
    """
    Smoke tests for OAuth provider endpoints.
    
    These tests validate that OAuth endpoints are configured and
    responding. OAuth endpoints typically redirect to the provider
    or return an error if misconfigured, but should never return 404.
    """

    def test_oauth_google_endpoint_exists(self, client: TestClient) -> None:
        """
        Test that POST /api/v1/auth/oauth/google returns redirect or error (not 404).
        
        The Google OAuth endpoint should either redirect to Google's
        OAuth flow or return a configuration error, but should never
        return 404 indicating the endpoint doesn't exist.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns redirect (3xx) or client error (4xx) but not 404
        """
        response = client.post("/api/v1/auth/oauth/google", json={}, follow_redirects=False)
        
        assert response.status_code != 404, (
            f"Google OAuth endpoint should exist (got {response.status_code})"
        )
        
        # OAuth endpoints typically redirect (3xx) or return error if not configured
        valid_status_codes = list(range(200, 400)) + list(range(400, 500))
        assert response.status_code in valid_status_codes, (
            f"Google OAuth endpoint returned unexpected status {response.status_code}"
        )

    def test_oauth_twitch_endpoint_exists(self, client: TestClient) -> None:
        """
        Test that POST /api/v1/auth/oauth/twitch returns redirect or error (not 404).
        
        The Twitch OAuth endpoint should either redirect to Twitch's
        OAuth flow or return a configuration error, but should never
        return 404 indicating the endpoint doesn't exist.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns redirect (3xx) or client error (4xx) but not 404
        """
        response = client.post("/api/v1/auth/oauth/twitch", json={}, follow_redirects=False)
        
        assert response.status_code != 404, (
            f"Twitch OAuth endpoint should exist (got {response.status_code})"
        )
        
        # OAuth endpoints typically redirect (3xx) or return error if not configured
        valid_status_codes = list(range(200, 400)) + list(range(400, 500))
        assert response.status_code in valid_status_codes, (
            f"Twitch OAuth endpoint returned unexpected status {response.status_code}"
        )
