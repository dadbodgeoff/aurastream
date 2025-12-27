"""
Users API Smoke Tests

Validates user profile endpoints are operational.
Note: User endpoints are under /api/v1/auth/me in this API.
"""

import pytest
from starlette.testclient import TestClient


@pytest.mark.e2e
@pytest.mark.smoke
class TestUsersSmoke:
    """Smoke tests for user profile endpoints."""

    def test_users_me_endpoint_exists(self, client: TestClient):
        """Verify users/me endpoint responds."""
        response = client.get("/api/v1/auth/me")
        # Should return 401 without auth, not 404
        assert response.status_code in [200, 401, 403], (
            f"Users me endpoint should exist (got {response.status_code})"
        )

    def test_users_me_update_endpoint(self, client: TestClient):
        """Verify user update endpoint exists."""
        response = client.put("/api/v1/auth/me", json={"display_name": "Test"})
        # Should return 401 without auth, not 404
        assert response.status_code in [200, 401, 403, 422], (
            f"Users update endpoint should exist (got {response.status_code})"
        )

    def test_users_password_change_endpoint(self, client: TestClient):
        """Verify password change endpoint exists."""
        response = client.post("/api/v1/auth/me/password", json={
            "current_password": "test",
            "new_password": "test123"
        })
        # Should return 401 without auth, not 404
        assert response.status_code in [200, 401, 403, 422], (
            f"Password change endpoint should exist (got {response.status_code})"
        )
