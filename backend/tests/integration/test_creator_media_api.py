"""
Integration tests for Creator Media Library API.

Tests the API endpoints - focuses on auth requirements, validation, and route registration.
More complex scenarios are covered in unit tests.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi.testclient import TestClient


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def mock_image_base64():
    """Create a minimal valid base64 PNG image (1x1 transparent)."""
    return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="


# =============================================================================
# Authentication Tests
# =============================================================================

class TestAuthenticationRequired:
    """Tests that all endpoints require authentication."""

    def test_upload_requires_auth(self, client, mock_image_base64):
        """POST /media-library should return 401 without auth."""
        response = client.post(
            "/api/v1/media-library",
            json={
                "asset_type": "face",
                "display_name": "Test Face",
                "image_base64": mock_image_base64,
            }
        )
        assert response.status_code == 401

    def test_list_requires_auth(self, client):
        """GET /media-library should return 401 without auth."""
        response = client.get("/api/v1/media-library")
        assert response.status_code == 401

    def test_summary_requires_auth(self, client):
        """GET /media-library/summary should return 401 without auth."""
        response = client.get("/api/v1/media-library/summary")
        assert response.status_code == 401

    def test_get_asset_requires_auth(self, client):
        """GET /media-library/{id} should return 401 without auth."""
        response = client.get("/api/v1/media-library/asset-123")
        assert response.status_code == 401

    def test_update_requires_auth(self, client):
        """PATCH /media-library/{id} should return 401 without auth."""
        response = client.patch(
            "/api/v1/media-library/asset-123",
            json={"display_name": "New Name"}
        )
        assert response.status_code == 401

    def test_delete_requires_auth(self, client):
        """DELETE /media-library/{id} should return 401 without auth."""
        response = client.delete("/api/v1/media-library/asset-123")
        assert response.status_code == 401

    def test_bulk_delete_requires_auth(self, client):
        """POST /media-library/bulk-delete should return 401 without auth."""
        response = client.post(
            "/api/v1/media-library/bulk-delete",
            json=["asset-1", "asset-2"]
        )
        assert response.status_code == 401

    def test_for_prompt_requires_auth(self, client):
        """POST /media-library/for-prompt should return 401 without auth."""
        response = client.post(
            "/api/v1/media-library/for-prompt",
            json=["asset-1"]
        )
        assert response.status_code == 401

    def test_favorite_requires_auth(self, client):
        """POST /media-library/{id}/favorite should return 401 without auth."""
        response = client.post("/api/v1/media-library/asset-123/favorite")
        assert response.status_code == 401

    def test_set_primary_requires_auth(self, client):
        """POST /media-library/{id}/set-primary should return 401 without auth."""
        response = client.post("/api/v1/media-library/asset-123/set-primary")
        assert response.status_code == 401

    def test_get_primary_requires_auth(self, client):
        """GET /media-library/primary/{type} should return 401 without auth."""
        response = client.get("/api/v1/media-library/primary/face")
        assert response.status_code == 401


# =============================================================================
# Public Endpoint Tests
# =============================================================================

class TestPublicEndpoints:
    """Tests for endpoints that don't require authentication."""

    def test_get_types_no_auth_required(self, client):
        """GET /media-library/types should work without auth."""
        response = client.get("/api/v1/media-library/types")
        assert response.status_code == 200
        
        data = response.json()
        assert "types" in data
        assert "descriptions" in data
        assert "face" in data["types"]
        assert "logo" in data["types"]
        assert "character" in data["types"]


# =============================================================================
# Schema Validation Tests
# =============================================================================

class TestSchemaValidation:
    """Tests for Pydantic schema validation."""

    def test_upload_request_schema(self, mock_image_base64):
        """UploadMediaRequest schema should validate correctly."""
        from backend.api.schemas.creator_media import UploadMediaRequest
        
        request = UploadMediaRequest(
            asset_type="face",
            display_name="My Face",
            image_base64=mock_image_base64,
            description="Test description",
            tags=["happy", "front"],
            is_favorite=True,
            set_as_primary=True,
            metadata={"expression": "happy"},
        )
        
        assert request.asset_type == "face"
        assert request.display_name == "My Face"
        assert request.is_favorite is True
        assert request.metadata == {"expression": "happy"}

    def test_upload_request_minimal(self, mock_image_base64):
        """UploadMediaRequest should work with minimal fields."""
        from backend.api.schemas.creator_media import UploadMediaRequest
        
        request = UploadMediaRequest(
            asset_type="logo",
            display_name="Logo",
            image_base64=mock_image_base64,
        )
        
        assert request.asset_type == "logo"
        assert request.tags is None
        assert request.is_favorite is False

    def test_update_request_schema(self):
        """UpdateMediaRequest schema should validate correctly."""
        from backend.api.schemas.creator_media import UpdateMediaRequest
        
        request = UpdateMediaRequest(
            display_name="New Name",
            description="New description",
            tags=["new", "tags"],
            is_favorite=True,
            is_primary=True,
            metadata={"key": "value"},
        )
        
        assert request.display_name == "New Name"
        assert request.is_primary is True

    def test_update_request_partial(self):
        """UpdateMediaRequest should allow partial updates."""
        from backend.api.schemas.creator_media import UpdateMediaRequest
        
        request = UpdateMediaRequest(display_name="Only Name")
        
        assert request.display_name == "Only Name"
        assert request.description is None
        assert request.tags is None

    def test_media_asset_schema(self):
        """MediaAsset schema should validate correctly."""
        from backend.api.schemas.creator_media import MediaAsset
        
        asset = MediaAsset(
            id="asset-123",
            user_id="user-123",
            asset_type="face",
            display_name="My Face",
            url="https://example.com/face.png",
            storage_path="user-123/face/asset-123.png",
            tags=["happy"],
            is_favorite=True,
            is_primary=True,
            metadata={"expression": "happy"},
            usage_count=5,
            created_at="2026-01-01T12:00:00Z",
            updated_at="2026-01-01T12:00:00Z",
        )
        
        assert asset.id == "asset-123"
        assert asset.asset_type == "face"

    def test_list_response_schema(self):
        """ListMediaResponse schema should validate correctly."""
        from backend.api.schemas.creator_media import ListMediaResponse, MediaAsset
        
        asset = MediaAsset(
            id="asset-123",
            user_id="user-123",
            asset_type="face",
            display_name="Face",
            url="https://example.com/face.png",
            storage_path="path",
            created_at="2026-01-01T12:00:00Z",
            updated_at="2026-01-01T12:00:00Z",
        )
        
        response = ListMediaResponse(
            assets=[asset],
            total=1,
            limit=50,
            offset=0,
            has_more=False,
        )
        
        assert len(response.assets) == 1
        assert response.total == 1
        assert response.has_more is False

    def test_media_summary_schema(self):
        """MediaSummary schema should validate correctly."""
        from backend.api.schemas.creator_media import MediaSummary
        
        summary = MediaSummary(
            asset_type="face",
            total_count=10,
            favorite_count=3,
            latest_upload="2026-01-01T12:00:00Z",
        )
        
        assert summary.asset_type == "face"
        assert summary.total_count == 10

    def test_media_for_prompt_schema(self):
        """MediaForPrompt schema should validate correctly."""
        from backend.api.schemas.creator_media import MediaForPrompt
        
        media = MediaForPrompt(
            id="asset-123",
            asset_type="face",
            display_name="Face",
            url="https://example.com/face.png",
            metadata={"expression": "happy"},
        )
        
        assert media.id == "asset-123"
        
        # Test to_prompt_context method
        context = media.to_prompt_context()
        assert "[FACE] Face" in context
        assert "Expression: happy" in context

    def test_selected_media_for_generation_schema(self):
        """SelectedMediaForGeneration schema should validate correctly."""
        from backend.api.schemas.creator_media import SelectedMediaForGeneration
        
        selected = SelectedMediaForGeneration(
            face_id="face-123",
            logo_id="logo-123",
            reference_ids=["ref-1", "ref-2"],
        )
        
        assert selected.face_id == "face-123"
        assert selected.has_any() is True

    def test_selected_media_empty(self):
        """SelectedMediaForGeneration should detect empty selection."""
        from backend.api.schemas.creator_media import SelectedMediaForGeneration
        
        selected = SelectedMediaForGeneration()
        
        assert selected.has_any() is False


# =============================================================================
# Route Registration Tests
# =============================================================================

class TestRouteRegistration:
    """Tests that routes are properly registered."""

    def test_upload_route_exists(self, client):
        """POST /media-library route should exist."""
        response = client.post("/api/v1/media-library", json={})
        # 401 means route exists but auth failed
        assert response.status_code in [401, 422]

    def test_list_route_exists(self, client):
        """GET /media-library route should exist."""
        response = client.get("/api/v1/media-library")
        assert response.status_code == 401

    def test_summary_route_exists(self, client):
        """GET /media-library/summary route should exist."""
        response = client.get("/api/v1/media-library/summary")
        assert response.status_code == 401

    def test_types_route_exists(self, client):
        """GET /media-library/types route should exist."""
        response = client.get("/api/v1/media-library/types")
        assert response.status_code == 200

    def test_get_asset_route_exists(self, client):
        """GET /media-library/{id} route should exist."""
        response = client.get("/api/v1/media-library/test-id")
        assert response.status_code == 401

    def test_update_route_exists(self, client):
        """PATCH /media-library/{id} route should exist."""
        response = client.patch("/api/v1/media-library/test-id", json={})
        assert response.status_code == 401

    def test_delete_route_exists(self, client):
        """DELETE /media-library/{id} route should exist."""
        response = client.delete("/api/v1/media-library/test-id")
        assert response.status_code == 401

    def test_bulk_delete_route_exists(self, client):
        """POST /media-library/bulk-delete route should exist."""
        response = client.post("/api/v1/media-library/bulk-delete", json=[])
        assert response.status_code in [401, 400]

    def test_for_prompt_route_exists(self, client):
        """POST /media-library/for-prompt route should exist."""
        response = client.post("/api/v1/media-library/for-prompt", json=[])
        assert response.status_code == 401

    def test_favorite_route_exists(self, client):
        """POST /media-library/{id}/favorite route should exist."""
        response = client.post("/api/v1/media-library/test-id/favorite")
        assert response.status_code == 401

    def test_set_primary_route_exists(self, client):
        """POST /media-library/{id}/set-primary route should exist."""
        response = client.post("/api/v1/media-library/test-id/set-primary")
        assert response.status_code == 401

    def test_get_primary_route_exists(self, client):
        """GET /media-library/primary/{type} route should exist."""
        response = client.get("/api/v1/media-library/primary/face")
        assert response.status_code == 401


# =============================================================================
# Asset Type Validation Tests
# =============================================================================

class TestAssetTypeValidation:
    """Tests for asset type validation in types endpoint."""

    def test_all_asset_types_returned(self, client):
        """Should return all supported asset types."""
        response = client.get("/api/v1/media-library/types")
        data = response.json()
        
        expected_types = [
            "logo", "face", "character", "game_skin", "object", "background",
            "reference", "overlay", "emote", "badge", "panel", "alert",
            "facecam_frame", "stinger"
        ]
        
        assert data["types"] == expected_types

    def test_all_descriptions_present(self, client):
        """Should return descriptions for all types."""
        response = client.get("/api/v1/media-library/types")
        data = response.json()
        
        for asset_type in data["types"]:
            assert asset_type in data["descriptions"]
            assert len(data["descriptions"][asset_type]) > 0


# =============================================================================
# Query Parameter Tests
# =============================================================================

class TestQueryParameters:
    """Tests for query parameter handling."""

    def test_list_with_asset_type_filter(self, client):
        """List endpoint should accept asset_type filter."""
        # Just verify the route accepts the parameter (auth will fail)
        response = client.get("/api/v1/media-library?asset_type=face")
        assert response.status_code == 401

    def test_list_with_tags_filter(self, client):
        """List endpoint should accept tags filter."""
        response = client.get("/api/v1/media-library?tags=happy,front")
        assert response.status_code == 401

    def test_list_with_favorites_filter(self, client):
        """List endpoint should accept favorites_only filter."""
        response = client.get("/api/v1/media-library?favorites_only=true")
        assert response.status_code == 401

    def test_list_with_search(self, client):
        """List endpoint should accept search parameter."""
        response = client.get("/api/v1/media-library?search=face")
        assert response.status_code == 401

    def test_list_with_pagination(self, client):
        """List endpoint should accept pagination parameters."""
        response = client.get("/api/v1/media-library?limit=10&offset=20")
        # 401 = auth required, 429 = rate limited (both mean route exists)
        assert response.status_code in [401, 429]

    def test_list_with_sorting(self, client):
        """List endpoint should accept sorting parameters."""
        response = client.get("/api/v1/media-library?sort_by=usage_count&sort_order=desc")
        assert response.status_code in [401, 429]
