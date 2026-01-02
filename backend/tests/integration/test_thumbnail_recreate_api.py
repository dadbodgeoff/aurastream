"""
Integration tests for Thumbnail Recreation API.

Tests the API endpoints - focuses on auth requirements and basic validation.
More complex scenarios are covered in unit tests.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi.testclient import TestClient


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def mock_analysis_data():
    """Create mock analysis data for requests."""
    return {
        "video_id": "test123",
        "title": "Test Video",
        "thumbnail_url": "https://i.ytimg.com/vi/test123/maxresdefault.jpg",
        "view_count": 1500000,
        "layout_type": "face-left-text-right",
        "text_placement": "right-side",
        "focal_point": "face",
        "dominant_colors": ["#FF0000", "#FFFFFF"],
        "color_mood": "high-energy",
        "background_style": "gradient",
        "has_face": True,
        "has_text": True,
        "text_content": "SHOCKING!",
        "has_border": False,
        "has_glow_effects": True,
        "has_arrows_circles": False,
        "face_expression": "shocked",
        "face_position": "left-third",
        "face_size": "large",
        "face_looking_direction": "camera",
        "layout_recipe": "Place face on left",
        "color_recipe": "Red and white",
        "why_it_works": "Strong emotion",
        "difficulty": "medium",
    }


@pytest.fixture
def mock_face_base64():
    """Create a minimal valid base64 PNG image."""
    # 1x1 transparent PNG
    return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="


# =============================================================================
# Authentication Tests
# =============================================================================

class TestAuthenticationRequired:
    """Tests that all endpoints require authentication."""

    def test_recreate_requires_auth(self, client, mock_analysis_data, mock_face_base64):
        """POST /thumbnails/recreate should return 401 without auth."""
        response = client.post(
            "/api/v1/thumbnails/recreate",
            json={
                "video_id": "test123",
                "thumbnail_url": "https://example.com/thumb.jpg",
                "analysis": mock_analysis_data,
                "face_image_base64": mock_face_base64,
            }
        )
        assert response.status_code == 401

    def test_status_requires_auth(self, client):
        """GET /thumbnails/recreate/{id} should return 401 without auth."""
        response = client.get("/api/v1/thumbnails/recreate/rec-123")
        assert response.status_code == 401

    def test_history_requires_auth(self, client):
        """GET /thumbnails/recreations should return 401 without auth."""
        response = client.get("/api/v1/thumbnails/recreations")
        assert response.status_code == 401

    def test_get_faces_requires_auth(self, client):
        """GET /thumbnails/faces should return 401 without auth."""
        response = client.get("/api/v1/thumbnails/faces")
        assert response.status_code == 401

    def test_upload_face_requires_auth(self, client, mock_face_base64):
        """POST /thumbnails/faces should return 401 without auth."""
        response = client.post(
            "/api/v1/thumbnails/faces",
            json={
                "image_base64": mock_face_base64,
                "display_name": "Test",
            }
        )
        assert response.status_code == 401

    def test_delete_face_requires_auth(self, client):
        """DELETE /thumbnails/faces/{id} should return 401 without auth."""
        response = client.delete("/api/v1/thumbnails/faces/face-123")
        assert response.status_code == 401


# =============================================================================
# Request Validation Tests (without auth)
# =============================================================================

class TestRequestValidation:
    """Tests for request body validation."""

    def test_recreate_missing_required_fields(self, client):
        """Should return 401 (auth first) then 422 for missing fields."""
        # Without auth, we get 401 first
        response = client.post(
            "/api/v1/thumbnails/recreate",
            json={"invalid": "data"}
        )
        # Auth check happens before validation
        assert response.status_code == 401

    def test_upload_face_missing_image(self, client):
        """Should return 401 (auth first) for missing image."""
        response = client.post(
            "/api/v1/thumbnails/faces",
            json={"display_name": "Test"}
        )
        assert response.status_code == 401


# =============================================================================
# Schema Validation Tests
# =============================================================================

class TestSchemaValidation:
    """Tests for Pydantic schema validation."""

    def test_recreate_request_schema(self, mock_analysis_data, mock_face_base64):
        """RecreateRequest schema should validate correctly."""
        from backend.api.schemas.thumbnail_recreate import RecreateRequest
        from backend.api.schemas.thumbnail_intel import ThumbnailAnalysisResponse
        
        # Create analysis response
        analysis = ThumbnailAnalysisResponse(**mock_analysis_data)
        
        # Create request
        request = RecreateRequest(
            video_id="test123",
            thumbnail_url="https://example.com/thumb.jpg",
            analysis=analysis,
            face_image_base64=mock_face_base64,
        )
        
        assert request.video_id == "test123"
        assert request.analysis.has_face is True
        assert request.face_image_base64 == mock_face_base64

    def test_recreate_request_optional_fields(self, mock_analysis_data):
        """RecreateRequest should allow optional fields."""
        from backend.api.schemas.thumbnail_recreate import RecreateRequest
        from backend.api.schemas.thumbnail_intel import ThumbnailAnalysisResponse
        
        analysis = ThumbnailAnalysisResponse(**mock_analysis_data)
        
        request = RecreateRequest(
            video_id="test123",
            thumbnail_url="https://example.com/thumb.jpg",
            analysis=analysis,
            custom_text="Custom",
            use_brand_colors=True,
            brand_kit_id="brand-123",
        )
        
        assert request.custom_text == "Custom"
        assert request.use_brand_colors is True
        assert request.brand_kit_id == "brand-123"

    def test_recreate_response_schema(self):
        """RecreateResponse schema should validate correctly."""
        from backend.api.schemas.thumbnail_recreate import RecreateResponse
        
        response = RecreateResponse(
            recreation_id="rec-123",
            job_id="job-123",
            status="queued",
            estimated_seconds=30,
            message="Recreation started",
        )
        
        assert response.recreation_id == "rec-123"
        assert response.status == "queued"

    def test_recreation_status_response_schema(self):
        """RecreationStatusResponse schema should validate correctly."""
        from backend.api.schemas.thumbnail_recreate import RecreationStatusResponse
        
        # Completed status
        response = RecreationStatusResponse(
            recreation_id="rec-123",
            job_id="job-123",
            status="completed",
            progress_percent=100,
            generated_thumbnail_url="https://storage.example.com/result.png",
            download_url="https://storage.example.com/result.png",
            asset_id="asset-123",
        )
        
        assert response.status == "completed"
        assert response.progress_percent == 100
        assert response.generated_thumbnail_url is not None

    def test_face_asset_schema(self):
        """FaceAsset schema should validate correctly."""
        from backend.api.schemas.thumbnail_recreate import FaceAsset
        
        face = FaceAsset(
            id="face-123",
            display_name="My Face",
            original_url="https://storage.example.com/face.png",
            processed_url=None,
            is_primary=True,
            created_at="2026-01-01T12:00:00Z",
        )
        
        assert face.id == "face-123"
        assert face.is_primary is True
        assert face.processed_url is None

    def test_upload_face_request_schema(self, mock_face_base64):
        """UploadFaceRequest schema should validate correctly."""
        from backend.api.schemas.thumbnail_recreate import UploadFaceRequest
        
        request = UploadFaceRequest(
            image_base64=mock_face_base64,
            display_name="My Face",
            set_as_primary=True,
        )
        
        assert request.image_base64 == mock_face_base64
        assert request.set_as_primary is True


# =============================================================================
# Route Registration Tests
# =============================================================================

class TestRouteRegistration:
    """Tests that routes are properly registered."""

    def test_recreate_route_exists(self, client):
        """POST /thumbnails/recreate route should exist."""
        response = client.post("/api/v1/thumbnails/recreate", json={})
        # 401 means route exists but auth failed
        assert response.status_code in [401, 422]

    def test_status_route_exists(self, client):
        """GET /thumbnails/recreate/{id} route should exist."""
        response = client.get("/api/v1/thumbnails/recreate/test-id")
        assert response.status_code == 401

    def test_history_route_exists(self, client):
        """GET /thumbnails/recreations route should exist."""
        response = client.get("/api/v1/thumbnails/recreations")
        assert response.status_code == 401

    def test_faces_route_exists(self, client):
        """GET /thumbnails/faces route should exist."""
        response = client.get("/api/v1/thumbnails/faces")
        assert response.status_code == 401

    def test_upload_face_route_exists(self, client):
        """POST /thumbnails/faces route should exist."""
        response = client.post("/api/v1/thumbnails/faces", json={})
        assert response.status_code in [401, 422]

    def test_delete_face_route_exists(self, client):
        """DELETE /thumbnails/faces/{id} route should exist."""
        response = client.delete("/api/v1/thumbnails/faces/test-id")
        assert response.status_code == 401
