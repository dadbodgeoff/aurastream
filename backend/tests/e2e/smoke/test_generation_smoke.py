"""
Generation Endpoints Smoke Tests.

Validates that all content generation-related endpoints are reachable
and properly protected by authentication. These tests verify endpoint
availability and auth requirements without testing full generation flows.
"""

import pytest
from fastapi.testclient import TestClient


# Test UUID for ID-based endpoint tests
TEST_UUID = "00000000-0000-0000-0000-000000000000"


@pytest.mark.e2e
@pytest.mark.smoke
class TestGenerationEndpointsSmoke:
    """
    Smoke tests for content generation endpoints.
    
    These tests validate that generation endpoints are properly
    configured and require authentication. All generation operations
    should return 401 Unauthorized when accessed without a valid token.
    """

    def test_generate_endpoint_requires_auth(self, client: TestClient) -> None:
        """
        Test that POST /api/v1/generate returns 401 without auth.
        
        The generate endpoint should require authentication to track
        usage, apply rate limits, and associate generated content
        with the authenticated user.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.post("/api/v1/generate", json={})
        
        assert response.status_code == 401, (
            f"Generate endpoint should return 401 without auth, got {response.status_code}"
        )


@pytest.mark.e2e
@pytest.mark.smoke
class TestJobsEndpointsSmoke:
    """
    Smoke tests for generation job management endpoints.
    
    These tests validate that job management endpoints are properly
    configured and require authentication. Job data should only be
    accessible to authenticated users.
    """

    def test_list_jobs_requires_auth(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/jobs returns 401 without auth.
        
        The list jobs endpoint should require authentication to
        retrieve only the authenticated user's generation jobs.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.get("/api/v1/jobs")
        
        assert response.status_code == 401, (
            f"List jobs should return 401 without auth, got {response.status_code}"
        )

    def test_get_job_requires_auth(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/jobs/{uuid} returns 401 without auth.
        
        The get job endpoint should require authentication to
        prevent unauthorized access to job details and status.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.get(f"/api/v1/jobs/{TEST_UUID}")
        
        assert response.status_code == 401, (
            f"Get job should return 401 without auth, got {response.status_code}"
        )

    def test_get_job_assets_requires_auth(self, client: TestClient) -> None:
        """
        Test that GET /api/v1/jobs/{uuid}/assets returns 401 without auth.
        
        The job assets endpoint should require authentication to
        prevent unauthorized access to generated content and assets.
        
        Validates:
            - Endpoint exists (not 404)
            - Returns 401 Unauthorized without authentication
        """
        response = client.get(f"/api/v1/jobs/{TEST_UUID}/assets")
        
        assert response.status_code == 401, (
            f"Get job assets should return 401 without auth, got {response.status_code}"
        )
