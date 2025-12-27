"""
Logo Management Endpoints Smoke Tests.

Validates brand kit logo endpoints are reachable and properly
enforce authentication requirements.
"""

import pytest
from fastapi.testclient import TestClient


# Test UUID for endpoints requiring a brand kit ID parameter
TEST_UUID = "00000000-0000-0000-0000-000000000000"


@pytest.mark.e2e
@pytest.mark.smoke
class TestLogoEndpointsSmoke:
    """
    Smoke test suite for brand kit logo management endpoints.
    
    These tests validate that logo endpoints are reachable and
    properly enforce authentication. Logo management is part of
    the brand kit feature and requires user authentication.
    """

    def test_upload_logo_requires_auth(self, client: TestClient) -> None:
        """
        Test that POST /api/v1/brand-kits/{uuid}/logos returns 401 without authentication.
        
        Logo upload requires authentication to associate the logo with
        a user's brand kit and validate storage permissions.
        
        Validates:
            - HTTP status code is 401 (Unauthorized)
            - Endpoint is reachable and responding
            - Authentication is enforced for file uploads
        """
        # Create minimal file-like data for the upload test
        files = {"file": ("test.png", b"fake image data", "image/png")}
        response = client.post(
            f"/api/v1/brand-kits/{TEST_UUID}/logos",
            files=files
        )
        
        assert response.status_code == 401, (
            f"Upload logo endpoint should return 401 without auth, "
            f"got {response.status_code}"
        )

    def test_list_logos_requires_auth(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/brand-kits/{uuid}/logos returns 401 without authentication.
        
        Listing logos requires authentication to ensure users can only
        view logos belonging to their own brand kits.
        
        Validates:
            - HTTP status code is 401 (Unauthorized)
            - Endpoint is reachable and responding
            - Authentication is properly enforced
        """
        response = client.get(f"/api/v1/brand-kits/{TEST_UUID}/logos")
        
        assert response.status_code == 401, (
            f"List logos endpoint should return 401 without auth, "
            f"got {response.status_code}"
        )

    def test_get_logo_type_requires_auth(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/brand-kits/{uuid}/logos/primary returns 401 without authentication.
        
        Retrieving a specific logo type requires authentication to verify
        brand kit ownership before returning logo data.
        
        Validates:
            - HTTP status code is 401 (Unauthorized)
            - Endpoint is reachable and responding
            - Authentication is enforced before resource lookup
        """
        response = client.get(f"/api/v1/brand-kits/{TEST_UUID}/logos/primary")
        
        assert response.status_code == 401, (
            f"Get logo type endpoint should return 401 without auth, "
            f"got {response.status_code}"
        )

    def test_delete_logo_requires_auth(self, client: TestClient) -> None:
        """
        Test that DELETE /api/v1/brand-kits/{uuid}/logos/primary returns 401 without authentication.
        
        Logo deletion is a destructive operation that requires authentication
        to prevent unauthorized removal of brand assets.
        
        Validates:
            - HTTP status code is 401 (Unauthorized)
            - Endpoint is reachable and responding
            - Authentication is enforced for destructive operations
        """
        response = client.delete(f"/api/v1/brand-kits/{TEST_UUID}/logos/primary")
        
        assert response.status_code == 401, (
            f"Delete logo endpoint should return 401 without auth, "
            f"got {response.status_code}"
        )

    def test_set_default_logo_requires_auth(self, client: TestClient) -> None:
        """
        Test that PUT /api/v1/brand-kits/{uuid}/logos/default returns 401 without authentication.
        
        Setting the default logo requires authentication to verify brand kit
        ownership and authorize the configuration change.
        
        Validates:
            - HTTP status code is 401 (Unauthorized)
            - Endpoint is reachable and responding
            - Authentication is enforced for configuration changes
        """
        response = client.put(
            f"/api/v1/brand-kits/{TEST_UUID}/logos/default",
            json={"logo_type": "primary"}
        )
        
        assert response.status_code == 401, (
            f"Set default logo endpoint should return 401 without auth, "
            f"got {response.status_code}"
        )
