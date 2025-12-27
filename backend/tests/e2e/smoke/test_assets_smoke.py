"""
Asset Endpoints Smoke Tests.

Validates asset management endpoints are reachable and properly
enforce authentication requirements.
"""

import pytest
from fastapi.testclient import TestClient


# Test UUID for endpoints requiring an ID parameter
TEST_UUID = "00000000-0000-0000-0000-000000000000"


@pytest.mark.e2e
@pytest.mark.smoke
class TestAssetEndpointsSmoke:
    """
    Smoke test suite for asset management endpoints.
    
    These tests validate that asset endpoints are reachable and
    properly enforce authentication. They verify the API contract
    without requiring actual authentication or asset data.
    """

    def test_list_assets_requires_auth(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/assets returns 401 without authentication.
        
        The assets list endpoint should require authentication to prevent
        unauthorized access to user asset data.
        
        Validates:
            - HTTP status code is 401 (Unauthorized)
            - Endpoint is reachable and responding
            - Authentication is properly enforced
        """
        response = client.get("/api/v1/assets")
        
        assert response.status_code == 401, (
            f"List assets endpoint should return 401 without auth, "
            f"got {response.status_code}"
        )

    def test_get_asset_requires_auth(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/assets/{uuid} returns 401 without authentication.
        
        Individual asset retrieval should require authentication to protect
        user-specific asset data from unauthorized access.
        
        Validates:
            - HTTP status code is 401 (Unauthorized)
            - Endpoint is reachable and responding
            - Authentication is enforced before resource lookup
        """
        response = client.get(f"/api/v1/assets/{TEST_UUID}")
        
        assert response.status_code == 401, (
            f"Get asset endpoint should return 401 without auth, "
            f"got {response.status_code}"
        )

    def test_delete_asset_requires_auth(self, client: TestClient) -> None:
        """
        Test that DELETE /api/v1/assets/{uuid} returns 401 without authentication.
        
        Asset deletion is a destructive operation that must require
        authentication to prevent unauthorized data removal.
        
        Validates:
            - HTTP status code is 401 (Unauthorized)
            - Endpoint is reachable and responding
            - Authentication is enforced for destructive operations
        """
        response = client.delete(f"/api/v1/assets/{TEST_UUID}")
        
        assert response.status_code == 401, (
            f"Delete asset endpoint should return 401 without auth, "
            f"got {response.status_code}"
        )

    def test_update_visibility_requires_auth(self, client: TestClient) -> None:
        """
        Test that PUT /api/v1/assets/{uuid}/visibility returns 401 without authentication.
        
        Changing asset visibility affects access control and must require
        authentication to prevent unauthorized modifications.
        
        Validates:
            - HTTP status code is 401 (Unauthorized)
            - Endpoint is reachable and responding
            - Authentication is enforced for visibility changes
        """
        response = client.put(
            f"/api/v1/assets/{TEST_UUID}/visibility",
            json={"visibility": "public"}
        )
        
        assert response.status_code == 401, (
            f"Update visibility endpoint should return 401 without auth, "
            f"got {response.status_code}"
        )

    def test_public_asset_returns_404_for_invalid(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/asset/{invalid_uuid} returns 404 for non-existent asset.
        
        The public asset endpoint allows unauthenticated access to public assets.
        When an asset doesn't exist, it should return 404 rather than an auth error.
        
        Validates:
            - HTTP status code is 404 (Not Found)
            - Endpoint is publicly accessible
            - Non-existent assets return proper error
        """
        response = client.get(f"/api/v1/asset/{TEST_UUID}")
        
        assert response.status_code == 404, (
            f"Public asset endpoint should return 404 for invalid UUID, "
            f"got {response.status_code}"
        )
