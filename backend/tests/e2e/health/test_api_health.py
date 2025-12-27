"""
API Server Health Tests.

Validates the FastAPI server is running and responding correctly.
Tests run first to ensure infrastructure is operational.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.mark.e2e
@pytest.mark.smoke
class TestAPIHealth:
    """
    Test suite for API server health endpoints.
    
    These tests validate that the FastAPI server is running correctly
    and all health-related endpoints are accessible and returning
    expected responses.
    """

    def test_health_endpoint_returns_200(self, client: TestClient) -> None:
        """
        Test that GET /health returns 200 with healthy status.
        
        The health endpoint is the primary indicator that the API server
        is operational. It should always return a 200 status code when
        the server is running correctly.
        
        Validates:
            - HTTP status code is 200
            - Response contains 'status' field
            - Status value indicates healthy state
        """
        response = client.get("/health")
        
        assert response.status_code == 200, (
            f"Health endpoint should return 200, got {response.status_code}"
        )
        
        data = response.json()
        assert "status" in data, "Health response should include 'status' field"
        assert data["status"] in ("healthy", "ok"), (
            f"Health status should be 'healthy' or 'ok', got '{data.get('status')}'"
        )

    def test_health_includes_version(self, client: TestClient) -> None:
        """
        Test that health response includes API version.
        
        The API version is important for debugging and ensuring clients
        are communicating with the expected server version.
        
        Validates:
            - Response contains 'version' field
            - Version is a non-empty string
        """
        response = client.get("/health")
        
        assert response.status_code == 200, (
            f"Health endpoint should return 200, got {response.status_code}"
        )
        
        data = response.json()
        assert "version" in data, "Health response should include 'version' field"
        assert isinstance(data["version"], str), (
            f"Version should be a string, got {type(data['version']).__name__}"
        )
        assert len(data["version"]) > 0, "Version should not be empty"

    def test_health_includes_timestamp(self, client: TestClient) -> None:
        """
        Test that health response includes server timestamp.
        
        The timestamp helps verify the server is responding with fresh data
        and can be used for latency calculations and debugging.
        
        Validates:
            - Response contains 'timestamp' field
            - Timestamp is a valid ISO format string or Unix timestamp
        """
        response = client.get("/health")
        
        assert response.status_code == 200, (
            f"Health endpoint should return 200, got {response.status_code}"
        )
        
        data = response.json()
        assert "timestamp" in data, "Health response should include 'timestamp' field"
        
        timestamp = data["timestamp"]
        # Accept either string (ISO format) or numeric (Unix timestamp)
        assert isinstance(timestamp, (str, int, float)), (
            f"Timestamp should be string or number, got {type(timestamp).__name__}"
        )
        
        if isinstance(timestamp, str):
            assert len(timestamp) > 0, "Timestamp string should not be empty"

    def test_health_includes_environment(self, client: TestClient) -> None:
        """
        Test that health response includes environment indicator.
        
        The environment field helps identify whether the server is running
        in test, development, staging, or production mode.
        
        Validates:
            - Response contains 'environment' or 'env' field
            - Environment is one of the expected values
        """
        response = client.get("/health")
        
        assert response.status_code == 200, (
            f"Health endpoint should return 200, got {response.status_code}"
        )
        
        data = response.json()
        
        # Check for either 'environment' or 'env' field
        env_field = data.get("environment") or data.get("env")
        assert env_field is not None, (
            "Health response should include 'environment' or 'env' field"
        )
        
        valid_environments = ("test", "development", "dev", "staging", "production", "prod")
        assert env_field.lower() in valid_environments, (
            f"Environment should be one of {valid_environments}, got '{env_field}'"
        )

    def test_openapi_docs_accessible(self, client: TestClient) -> None:
        """
        Test that GET /docs returns 200 (Swagger UI) if enabled.
        
        The OpenAPI documentation endpoint provides interactive API
        documentation via Swagger UI. It may be disabled in production.
        
        Validates:
            - HTTP status code is 200 or 404 (if disabled)
            - If 200, response contains HTML content
        """
        response = client.get("/docs")
        
        # Docs might be disabled in production
        if response.status_code == 404:
            pytest.skip("OpenAPI docs are disabled in this environment")
        
        assert response.status_code == 200, (
            f"OpenAPI docs endpoint should return 200, got {response.status_code}"
        )
        
        # Verify it returns HTML content (Swagger UI)
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type, (
            f"Docs endpoint should return HTML, got content-type: {content_type}"
        )

    def test_redoc_docs_accessible(self, client: TestClient) -> None:
        """
        Test that GET /redoc returns 200 (ReDoc documentation) if enabled.
        
        ReDoc provides an alternative documentation interface that some
        developers prefer. It may be disabled in production.
        
        Validates:
            - HTTP status code is 200 or 404 (if disabled)
            - If 200, response contains HTML content
        """
        response = client.get("/redoc")
        
        # Docs might be disabled in production
        if response.status_code == 404:
            pytest.skip("ReDoc docs are disabled in this environment")
        
        assert response.status_code == 200, (
            f"ReDoc endpoint should return 200, got {response.status_code}"
        )
        
        # Verify it returns HTML content (ReDoc)
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type, (
            f"ReDoc endpoint should return HTML, got content-type: {content_type}"
        )
