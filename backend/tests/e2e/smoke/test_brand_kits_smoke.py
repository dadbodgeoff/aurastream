"""
Brand Kits Endpoints Smoke Tests.

Validates that all brand kit-related endpoints are reachable
and properly protected by authentication. These tests verify
endpoint availability and auth requirements without testing
full CRUD operations.
"""

import pytest
from fastapi.testclient import TestClient


# Test UUID for ID-based endpoint tests
TEST_UUID = "00000000-0000-0000-0000-000000000000"


@pytest.mark.e2e
@pytest.mark.smoke
class TestBrandKitsEndpointsSmoke:
    """
    Smoke tests for brand kit CRUD endpoints.
    
    These tests validate that brand kit endpoints are properly
    configured and require authentication. All brand kit operations
    should return 401 Unauthorized when accessed without a valid token.
    """

    def test_list_brand_kits_requires_auth(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/brand-kits returns 401 without auth.
        
        The list brand kits endpoint should require authentication
        to prevent unauthorized access to user brand kit data.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.get("/api/v1/brand-kits")
        
        assert response.status_code == 401, (
            f"List brand kits should return 401 without auth, got {response.status_code}"
        )

    def test_create_brand_kit_requires_auth(self, client: TestClient) -> None:
        """
        Test that POST /api/v1/brand-kits returns 401 without auth.
        
        The create brand kit endpoint should require authentication
        to associate new brand kits with the authenticated user.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.post("/api/v1/brand-kits", json={})
        
        assert response.status_code == 401, (
            f"Create brand kit should return 401 without auth, got {response.status_code}"
        )

    def test_get_active_brand_kit_requires_auth(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/brand-kits/active returns 401 without auth.
        
        The active brand kit endpoint should require authentication
        to retrieve the user's currently active brand kit.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.get("/api/v1/brand-kits/active")
        
        assert response.status_code == 401, (
            f"Get active brand kit should return 401 without auth, got {response.status_code}"
        )

    def test_get_brand_kit_by_id_requires_auth(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/brand-kits/{uuid} returns 401 without auth.
        
        The get brand kit by ID endpoint should require authentication
        to prevent unauthorized access to specific brand kit data.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.get(f"/api/v1/brand-kits/{TEST_UUID}")
        
        assert response.status_code == 401, (
            f"Get brand kit by ID should return 401 without auth, got {response.status_code}"
        )

    def test_update_brand_kit_requires_auth(self, client: TestClient) -> None:
        """
        Test that PUT /api/v1/brand-kits/{uuid} returns 401 without auth.
        
        The update brand kit endpoint should require authentication
        to ensure only authorized users can modify brand kits.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.put(f"/api/v1/brand-kits/{TEST_UUID}", json={})
        
        assert response.status_code == 401, (
            f"Update brand kit should return 401 without auth, got {response.status_code}"
        )

    def test_delete_brand_kit_requires_auth(self, client: TestClient) -> None:
        """
        Test that DELETE /api/v1/brand-kits/{uuid} returns 401 without auth.
        
        The delete brand kit endpoint should require authentication
        to prevent unauthorized deletion of brand kits.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.delete(f"/api/v1/brand-kits/{TEST_UUID}")
        
        assert response.status_code == 401, (
            f"Delete brand kit should return 401 without auth, got {response.status_code}"
        )

    def test_activate_brand_kit_requires_auth(self, client: TestClient) -> None:
        """
        Test that POST /api/v1/brand-kits/{uuid}/activate returns 401 without auth.
        
        The activate brand kit endpoint should require authentication
        to set a brand kit as the user's active kit.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.post(f"/api/v1/brand-kits/{TEST_UUID}/activate")
        
        assert response.status_code == 401, (
            f"Activate brand kit should return 401 without auth, got {response.status_code}"
        )


@pytest.mark.e2e
@pytest.mark.smoke
class TestBrandKitExtendedEndpointsSmoke:
    """
    Smoke tests for brand kit extended feature endpoints.
    
    These tests validate that extended brand kit feature endpoints
    (colors, typography, voice, guidelines) are properly configured
    and require authentication.
    """

    def test_get_extended_colors_requires_auth(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/brand-kits/{uuid}/colors returns 401 without auth.
        
        The extended colors endpoint should require authentication
        to access brand kit color palette data.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.get(f"/api/v1/brand-kits/{TEST_UUID}/colors")
        
        assert response.status_code == 401, (
            f"Get extended colors should return 401 without auth, got {response.status_code}"
        )

    def test_update_extended_colors_requires_auth(self, client: TestClient) -> None:
        """
        Test that PUT /api/v1/brand-kits/{uuid}/colors returns 401 without auth.
        
        The update extended colors endpoint should require authentication
        to modify brand kit color palette data.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.put(f"/api/v1/brand-kits/{TEST_UUID}/colors", json={})
        
        assert response.status_code == 401, (
            f"Update extended colors should return 401 without auth, got {response.status_code}"
        )

    def test_get_typography_requires_auth(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/brand-kits/{uuid}/typography returns 401 without auth.
        
        The typography endpoint should require authentication
        to access brand kit typography settings.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.get(f"/api/v1/brand-kits/{TEST_UUID}/typography")
        
        assert response.status_code == 401, (
            f"Get typography should return 401 without auth, got {response.status_code}"
        )

    def test_update_typography_requires_auth(self, client: TestClient) -> None:
        """
        Test that PUT /api/v1/brand-kits/{uuid}/typography returns 401 without auth.
        
        The update typography endpoint should require authentication
        to modify brand kit typography settings.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.put(f"/api/v1/brand-kits/{TEST_UUID}/typography", json={})
        
        assert response.status_code == 401, (
            f"Update typography should return 401 without auth, got {response.status_code}"
        )

    def test_get_voice_requires_auth(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/brand-kits/{uuid}/voice returns 401 without auth.
        
        The voice endpoint should require authentication
        to access brand kit voice and tone settings.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.get(f"/api/v1/brand-kits/{TEST_UUID}/voice")
        
        assert response.status_code == 401, (
            f"Get voice should return 401 without auth, got {response.status_code}"
        )

    def test_update_voice_requires_auth(self, client: TestClient) -> None:
        """
        Test that PUT /api/v1/brand-kits/{uuid}/voice returns 401 without auth.
        
        The update voice endpoint should require authentication
        to modify brand kit voice and tone settings.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.put(f"/api/v1/brand-kits/{TEST_UUID}/voice", json={})
        
        assert response.status_code == 401, (
            f"Update voice should return 401 without auth, got {response.status_code}"
        )

    def test_get_guidelines_requires_auth(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/brand-kits/{uuid}/guidelines returns 401 without auth.
        
        The guidelines endpoint should require authentication
        to access brand kit usage guidelines.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.get(f"/api/v1/brand-kits/{TEST_UUID}/guidelines")
        
        assert response.status_code == 401, (
            f"Get guidelines should return 401 without auth, got {response.status_code}"
        )

    def test_update_guidelines_requires_auth(self, client: TestClient) -> None:
        """
        Test that PUT /api/v1/brand-kits/{uuid}/guidelines returns 401 without auth.
        
        The update guidelines endpoint should require authentication
        to modify brand kit usage guidelines.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.put(f"/api/v1/brand-kits/{TEST_UUID}/guidelines", json={})
        
        assert response.status_code == 401, (
            f"Update guidelines should return 401 without auth, got {response.status_code}"
        )
