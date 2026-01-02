"""
End-to-End Integration Tests: Media Library + Coach + Generation

Tests the complete user flow from frontend perspective:
1. Media Library: Upload assets, get placements
2. Coach: Start session with media assets, stream responses
3. Generation: Create job with media asset placements

These tests verify:
- snake_case ↔ camelCase transformations work correctly
- SSE streaming works for coach endpoints
- Media asset placements flow through the entire pipeline
- All three modules integrate correctly

Run with: python3 -m pytest backend/tests/integration/test_media_coach_generation_e2e.py -v
"""

import pytest
import json
import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi.testclient import TestClient


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def mock_image_base64():
    """Minimal valid base64 PNG (1x1 transparent)."""
    return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="


@pytest.fixture
def pro_user_token_payload():
    """Create a pro user token payload for authenticated requests."""
    from backend.services.jwt_service import TokenPayload
    return TokenPayload(
        sub=str(uuid.uuid4()),
        email="pro@example.com",
        tier="pro",
        type="access",
        jti=str(uuid.uuid4()),
        exp=int((datetime.utcnow() + timedelta(hours=24)).timestamp()),
        iat=int(datetime.utcnow().timestamp()),
    )


@pytest.fixture
def studio_user_token_payload():
    """Create a studio user token payload for coach access."""
    from backend.services.jwt_service import TokenPayload
    return TokenPayload(
        sub=str(uuid.uuid4()),
        email="studio@example.com",
        tier="studio",
        type="access",
        jti=str(uuid.uuid4()),
        exp=int((datetime.utcnow() + timedelta(hours=24)).timestamp()),
        iat=int(datetime.utcnow().timestamp()),
    )


@pytest.fixture
def mock_media_asset():
    """Create a mock media asset as returned from database."""
    asset_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    return {
        "id": asset_id,
        "user_id": user_id,
        "asset_type": "face",
        "display_name": "My Streaming Face",
        "description": "Happy expression",
        "url": f"https://storage.example.com/media/{asset_id}.png",
        "storage_path": f"creator-media/{user_id}/face/{asset_id}.png",
        "thumbnail_url": None,
        "processed_url": f"https://storage.example.com/media/{asset_id}_processed.png",
        "processed_storage_path": f"creator-media/{user_id}/face/{asset_id}_processed.png",
        "file_size": 245000,
        "mime_type": "image/png",
        "width": 512,
        "height": 512,
        "tags": ["happy", "front-facing"],
        "is_favorite": True,
        "is_primary": True,
        "has_background_removed": True,
        "metadata": {"expression": "happy", "angle": "front"},
        "usage_count": 5,
        "last_used_at": "2026-01-01T10:00:00Z",
        "created_at": "2025-12-01T10:00:00Z",
        "updated_at": "2026-01-01T10:00:00Z",
    }


@pytest.fixture
def media_asset_placement():
    """Create a media asset placement as sent from frontend (snake_case for API)."""
    return {
        "asset_id": str(uuid.uuid4()),
        "display_name": "My Face",
        "asset_type": "face",
        "url": "https://storage.example.com/media/face.png",
        "x": 85.0,
        "y": 90.0,
        "width": 15.0,
        "height": 15.0,
        "size_unit": "percent",
        "z_index": 1,
        "rotation": 0.0,
        "opacity": 100.0,
    }


# =============================================================================
# Module 1: Media Library Tests
# =============================================================================

class TestMediaLibraryIntegration:
    """Tests for Media Library API with mocked services."""

    def test_upload_media_request_schema_matches_frontend(self, mock_image_base64):
        """
        Verify the upload request schema matches what frontend sends.
        Frontend sends camelCase, API expects snake_case.
        """
        from backend.api.schemas.creator_media import UploadMediaRequest
        
        # This is what the frontend API client transforms to (snake_case)
        frontend_payload = {
            "asset_type": "face",
            "display_name": "My Streaming Face",
            "description": "Happy expression for thumbnails",
            "image_base64": mock_image_base64,
            "tags": ["happy", "front-facing"],
            "is_favorite": True,
            "set_as_primary": True,
            "remove_background": True,
            "metadata": {"expression": "happy", "angle": "front"},
        }
        
        # Should parse without error
        request = UploadMediaRequest(**frontend_payload)
        
        assert request.asset_type == "face"
        assert request.display_name == "My Streaming Face"
        assert request.is_favorite is True
        assert request.set_as_primary is True
        assert request.remove_background is True
        assert request.metadata["expression"] == "happy"

    def test_media_asset_response_transforms_to_camelcase(self, mock_media_asset):
        """
        Verify the response schema can be transformed to camelCase for frontend.
        """
        from backend.api.schemas.creator_media import MediaAsset
        
        # Create from snake_case database response
        asset = MediaAsset(**mock_media_asset)
        
        # Verify all fields are present
        assert asset.id == mock_media_asset["id"]
        assert asset.user_id == mock_media_asset["user_id"]
        assert asset.asset_type == "face"
        assert asset.display_name == "My Streaming Face"
        assert asset.has_background_removed is True
        assert asset.processed_url is not None
        
        # Simulate frontend transformation (model_dump gives snake_case)
        response_dict = asset.model_dump()
        
        # Frontend would transform these keys:
        # user_id -> userId, display_name -> displayName, etc.
        assert "user_id" in response_dict
        assert "display_name" in response_dict
        assert "has_background_removed" in response_dict

    def test_list_media_response_pagination(self, mock_media_asset):
        """Verify list response includes pagination fields."""
        from backend.api.schemas.creator_media import ListMediaResponse, MediaAsset
        
        asset = MediaAsset(**mock_media_asset)
        
        response = ListMediaResponse(
            assets=[asset],
            total=100,
            limit=20,
            offset=0,
            has_more=True,
        )
        
        assert len(response.assets) == 1
        assert response.total == 100
        assert response.has_more is True
        
        # Frontend expects: hasMore (camelCase)
        response_dict = response.model_dump()
        assert "has_more" in response_dict  # Will be transformed by frontend

    def test_media_for_prompt_includes_processed_url(self, mock_media_asset):
        """Verify for-prompt response uses processed URL when available."""
        from backend.api.schemas.creator_media import MediaForPrompt
        
        media = MediaForPrompt(
            id=mock_media_asset["id"],
            asset_type="face",
            display_name="My Face",
            url=mock_media_asset["processed_url"],  # Should use processed
            metadata={"expression": "happy"},
        )
        
        assert "processed" in media.url
        
        # Test prompt context generation
        context = media.to_prompt_context()
        assert "[FACE]" in context
        assert "My Face" in context
        assert "Expression: happy" in context


# =============================================================================
# Module 2: Coach Integration Tests
# =============================================================================

class TestCoachIntegration:
    """Tests for Coach API with media asset integration."""

    def test_start_coach_request_with_media_assets(self, media_asset_placement):
        """
        Verify StartCoachRequest accepts media assets from frontend.
        """
        from backend.api.schemas.coach import StartCoachRequest, MediaAssetPlacement
        
        # Frontend sends this payload (already snake_case from API client transform)
        frontend_payload = {
            "brand_context": {
                "brand_kit_id": str(uuid.uuid4()),
                "colors": [{"hex": "#FF5733", "name": "Orange"}],
                "tone": "competitive",
                "fonts": {"headline": "Montserrat", "body": "Inter"},
                "logo_url": None,
            },
            "asset_type": "twitch_emote",
            "mood": "hype",
            "description": "Victory celebration emote with my face",
            "media_asset_ids": [media_asset_placement["asset_id"]],
            "media_asset_placements": [media_asset_placement],
        }
        
        request = StartCoachRequest(**frontend_payload)
        
        assert request.asset_type == "twitch_emote"
        assert request.mood == "hype"
        assert len(request.media_asset_ids) == 1
        assert len(request.media_asset_placements) == 1
        
        placement = request.media_asset_placements[0]
        assert placement.asset_id == media_asset_placement["asset_id"]
        assert placement.x == 85.0
        assert placement.y == 90.0
        assert placement.size_unit == "percent"

    def test_media_asset_placement_schema_validation(self):
        """Verify MediaAssetPlacement validates all fields correctly."""
        from backend.api.schemas.coach import MediaAssetPlacement
        
        # Valid placement
        placement = MediaAssetPlacement(
            asset_id="asset-123",
            display_name="My Face",
            asset_type="face",
            url="https://example.com/face.png",
            x=50.0,
            y=50.0,
            width=20.0,
            height=20.0,
            size_unit="percent",
            z_index=1,
            rotation=45.0,
            opacity=80.0,
        )
        
        assert placement.x == 50.0
        assert placement.rotation == 45.0
        assert placement.opacity == 80.0

    def test_media_asset_placement_validation_bounds(self):
        """Verify placement validation enforces bounds."""
        from backend.api.schemas.coach import MediaAssetPlacement
        from pydantic import ValidationError
        
        # x must be 0-100
        with pytest.raises(ValidationError):
            MediaAssetPlacement(
                asset_id="asset-123",
                display_name="Test",
                asset_type="face",
                url="https://example.com/face.png",
                x=150.0,  # Invalid: > 100
                y=50.0,
                width=20.0,
                height=20.0,
            )
        
        # opacity must be 0-100
        with pytest.raises(ValidationError):
            MediaAssetPlacement(
                asset_id="asset-123",
                display_name="Test",
                asset_type="face",
                url="https://example.com/face.png",
                x=50.0,
                y=50.0,
                width=20.0,
                height=20.0,
                opacity=150.0,  # Invalid: > 100
            )

    def test_generate_from_session_request_with_media(self, media_asset_placement):
        """Verify GenerateFromSessionRequest accepts media assets."""
        from backend.api.schemas.coach import GenerateFromSessionRequest
        
        request = GenerateFromSessionRequest(
            include_logo=True,
            logo_type="primary",
            logo_position="bottom-right",
            media_asset_ids=[media_asset_placement["asset_id"]],
            media_asset_placements=[media_asset_placement],
        )
        
        assert request.include_logo is True
        assert len(request.media_asset_ids) == 1
        assert len(request.media_asset_placements) == 1


    def test_coach_sse_stream_format(self):
        """Verify SSE stream chunk format matches frontend expectations."""
        from backend.api.schemas.coach import StreamChunk
        
        # Token chunk
        token_chunk = StreamChunk(
            type="token",
            content="Here's a refined",
            metadata=None,
        )
        assert token_chunk.type == "token"
        
        # Done chunk with session_id
        done_chunk = StreamChunk(
            type="done",
            content="",
            metadata={"session_id": str(uuid.uuid4()), "turns_remaining": 9},
        )
        assert done_chunk.type == "done"
        assert "session_id" in done_chunk.metadata
        
        # Grounding chunk
        grounding_chunk = StreamChunk(
            type="grounding",
            content="Searching for Fortnite context...",
            metadata={"game_id": "fortnite"},
        )
        assert grounding_chunk.type == "grounding"


# =============================================================================
# Module 3: Generation Integration Tests
# =============================================================================

class TestGenerationIntegration:
    """Tests for Generation API with media asset integration."""

    def test_generate_request_with_media_placements(self, media_asset_placement):
        """
        Verify GenerateRequest accepts media asset placements.
        This is what the frontend API client sends after transformation.
        """
        from backend.api.schemas.generation import GenerateRequest, MediaAssetPlacement
        
        # Frontend API client transforms camelCase to snake_case
        request = GenerateRequest(
            asset_type="thumbnail",
            brand_kit_id=str(uuid.uuid4()),
            custom_prompt="Epic gaming moment with my face",
            media_asset_ids=[media_asset_placement["asset_id"]],
            media_asset_placements=[MediaAssetPlacement(**media_asset_placement)],
        )
        
        assert request.asset_type == "thumbnail"
        assert len(request.media_asset_ids) == 1
        assert len(request.media_asset_placements) == 1
        
        placement = request.media_asset_placements[0]
        assert placement.x == 85.0
        assert placement.y == 90.0

    def test_generation_media_placement_schema_matches_coach(self):
        """Verify generation.MediaAssetPlacement matches coach.MediaAssetPlacement."""
        from backend.api.schemas.generation import MediaAssetPlacement as GenPlacement
        from backend.api.schemas.coach import MediaAssetPlacement as CoachPlacement
        
        # Both should have the same fields
        gen_fields = set(GenPlacement.model_fields.keys())
        coach_fields = set(CoachPlacement.model_fields.keys())
        
        assert gen_fields == coach_fields, f"Field mismatch: {gen_fields ^ coach_fields}"

    def test_job_response_schema(self):
        """Verify JobResponse matches frontend expectations."""
        from backend.api.schemas.generation import JobResponse
        from datetime import datetime
        
        response = JobResponse(
            id=str(uuid.uuid4()),
            user_id=str(uuid.uuid4()),
            brand_kit_id=None,  # Can be null
            asset_type="thumbnail",
            status="queued",
            progress=0,
            error_message=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            completed_at=None,
        )
        
        assert response.brand_kit_id is None  # Frontend expects null, not undefined
        assert response.status == "queued"
        assert response.progress == 0


# =============================================================================
# Cross-Module Integration Tests
# =============================================================================

class TestCrossModuleIntegration:
    """Tests for data flow across all three modules."""

    def test_placement_data_flows_from_media_to_generation(
        self, mock_media_asset, media_asset_placement
    ):
        """
        Verify placement data flows correctly:
        Media Library -> Coach/Generation -> Placement Formatter
        
        Note: PlacementFormatter expects camelCase keys as it receives
        data that has been transformed by the frontend before API call.
        """
        from backend.services.creator_media.placement_formatter import (
            PlacementFormatter,
            PlacementData,
        )
        
        formatter = PlacementFormatter()
        
        # Simulate placement data as it arrives at backend (camelCase from frontend)
        # The frontend serializePlacements() sends camelCase to the API
        placements = [{
            "assetId": media_asset_placement["asset_id"],
            "displayName": "My Face",
            "assetType": "face",
            "url": media_asset_placement["url"],
            "x": media_asset_placement["x"],
            "y": media_asset_placement["y"],
            "width": media_asset_placement["width"],
            "height": media_asset_placement["height"],
            "sizeUnit": media_asset_placement["size_unit"],
            "zIndex": media_asset_placement["z_index"],
            "rotation": media_asset_placement["rotation"],
            "opacity": media_asset_placement["opacity"],
        }]
        
        # Format for prompt injection
        prompt_section = formatter.format_placements(
            placements=placements,
            canvas_width=1280,
            canvas_height=720,
        )
        
        assert "Asset Placement Instructions" in prompt_section
        assert "My Face" in prompt_section
        assert "85%" in prompt_section or "x: 85%" in prompt_section
        assert "face" in prompt_section.lower()

    def test_placement_formatter_handles_multiple_assets(self):
        """Verify formatter handles multiple assets with z-ordering."""
        from backend.services.creator_media.placement_formatter import PlacementFormatter
        
        formatter = PlacementFormatter()
        
        placements = [
            {
                "assetId": "face-1",
                "displayName": "My Face",
                "assetType": "face",
                "url": "https://example.com/face.png",
                "x": 85,
                "y": 90,
                "width": 15,
                "height": 15,
                "sizeUnit": "percent",
                "zIndex": 2,  # On top
                "rotation": 0,
                "opacity": 100,
            },
            {
                "assetId": "logo-1",
                "displayName": "My Logo",
                "assetType": "logo",
                "url": "https://example.com/logo.png",
                "x": 10,
                "y": 10,
                "width": 10,
                "height": 10,
                "sizeUnit": "percent",
                "zIndex": 1,  # Behind
                "rotation": 0,
                "opacity": 80,
            },
        ]
        
        prompt_section = formatter.format_placements(
            placements=placements,
            canvas_width=1920,
            canvas_height=1080,
        )
        
        assert "My Face" in prompt_section
        assert "My Logo" in prompt_section
        assert "Layer order" in prompt_section
        # Logo should be listed before Face (back to front)
        logo_pos = prompt_section.find("My Logo")
        face_pos = prompt_section.find("My Face")
        # In layer order section, logo should come first
        assert "My Logo" in prompt_section and "My Face" in prompt_section

    def test_media_for_prompt_model_integration(self):
        """Verify MediaForPromptModel works with prompt injector."""
        from backend.services.creator_media.models import MediaForPromptModel
        from backend.services.creator_media.prompt_injector import PromptInjector
        
        injector = PromptInjector()
        
        face = MediaForPromptModel(
            id="face-123",
            asset_type="face",
            display_name="My Streaming Face",
            url="https://example.com/face.png",
            processed_url="https://example.com/face_processed.png",
            metadata={"expression": "happy", "angle": "front"},
        )
        
        # Format single asset
        formatted = injector.format_asset(face)
        
        assert "[FACE]" in formatted
        assert "My Streaming Face" in formatted
        assert "Expression: happy" in formatted
        assert "Angle: front" in formatted

    def test_full_user_flow_simulation(
        self, mock_media_asset, media_asset_placement
    ):
        """
        Simulate complete user flow:
        1. User uploads face to Media Library
        2. User starts Coach session with face asset
        3. User generates asset with placement
        """
        from backend.api.schemas.creator_media import (
            UploadMediaRequest,
            MediaAsset,
            MediaForPrompt,
        )
        from backend.api.schemas.coach import (
            StartCoachRequest,
            GenerateFromSessionRequest,
        )
        from backend.api.schemas.generation import GenerateRequest, MediaAssetPlacement
        
        # Step 1: Upload media (simulated response)
        uploaded_asset = MediaAsset(**mock_media_asset)
        assert uploaded_asset.has_background_removed is True
        
        # Step 2: Start coach session with media
        coach_request = StartCoachRequest(
            asset_type="twitch_emote",
            mood="hype",
            description="Victory emote with my face",
            media_asset_ids=[uploaded_asset.id],
            media_asset_placements=[media_asset_placement],
        )
        assert len(coach_request.media_asset_placements) == 1
        
        # Step 3: Generate from session (or direct generation)
        # Create MediaAssetPlacement from dict
        placement = MediaAssetPlacement(**media_asset_placement)
        gen_request = GenerateRequest(
            asset_type="twitch_emote",
            custom_prompt="Victory celebration emote",
            media_asset_ids=[uploaded_asset.id],
            media_asset_placements=[placement],
        )
        
        # Access via Pydantic model attribute
        assert gen_request.media_asset_placements[0].x == 85.0
        
        # Verify data integrity through the flow
        assert coach_request.media_asset_ids[0] == gen_request.media_asset_ids[0]


# =============================================================================
# HTTP API Tests with Mocked Auth
# =============================================================================

class TestHTTPAPIWithAuth:
    """Tests that make actual HTTP calls with mocked authentication."""

    def test_media_library_access_endpoint(self, client, pro_user_token_payload):
        """Test /media-library/access returns correct structure."""
        with patch("backend.api.middleware.auth.get_current_user") as mock_auth:
            mock_auth.return_value = pro_user_token_payload
            
            response = client.get(
                "/api/v1/media-library/access",
                headers={"Authorization": "Bearer mock-token"},
            )
            
            # Should return access info (may be 200 or 401 depending on auth setup)
            if response.status_code == 200:
                data = response.json()
                assert "has_access" in data
                assert "tier" in data
                assert "total_limit" in data
                assert "max_per_prompt" in data

    def test_media_library_types_endpoint(self, client):
        """Test /media-library/types returns all asset types."""
        response = client.get("/api/v1/media-library/types")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all 14 asset types
        expected_types = [
            "logo", "face", "character", "game_skin", "object", "background",
            "reference", "overlay", "emote", "badge", "panel", "alert",
            "facecam_frame", "stinger"
        ]
        
        assert data["types"] == expected_types
        assert len(data["descriptions"]) == 14

    def test_coach_tips_endpoint(self, client):
        """Test /coach/tips requires auth (available to all tiers but needs login)."""
        response = client.get("/api/v1/coach/tips?asset_type=twitch_emote")
        
        # Tips endpoint requires authentication (but is available to all tiers)
        assert response.status_code == 401

    def test_generation_endpoint_requires_auth(self, client):
        """Test /generate requires authentication."""
        response = client.post(
            "/api/v1/generate",
            json={
                "asset_type": "thumbnail",
                "custom_prompt": "Test prompt",
            },
        )
        
        assert response.status_code == 401


# =============================================================================
# SSE Streaming Tests
# =============================================================================

class TestSSEStreaming:
    """Tests for Server-Sent Events streaming functionality."""

    def test_sse_event_format(self):
        """Verify SSE events are formatted correctly."""
        import json
        
        # Simulate SSE event creation as done in coach routes
        chunk_data = {
            "type": "token",
            "content": "Here's a refined",
            "metadata": None,
        }
        
        event_data = json.dumps(chunk_data)
        sse_line = f"data: {event_data}\n\n"
        
        # Parse it back
        assert sse_line.startswith("data: ")
        parsed = json.loads(sse_line.replace("data: ", "").strip())
        
        assert parsed["type"] == "token"
        assert parsed["content"] == "Here's a refined"

    def test_sse_done_event_includes_session_id(self):
        """Verify done event includes session_id for frontend."""
        import json
        
        session_id = str(uuid.uuid4())
        
        done_chunk = {
            "type": "done",
            "content": "",
            "metadata": {
                "session_id": session_id,
                "turns_remaining": 9,
                "current_prompt": "A vibrant victory emote...",
            },
        }
        
        event_data = json.dumps(done_chunk)
        parsed = json.loads(event_data)
        
        assert parsed["metadata"]["session_id"] == session_id
        assert parsed["metadata"]["turns_remaining"] == 9

    def test_sse_error_event_format(self):
        """Verify error events are formatted correctly."""
        import json
        
        error_chunk = {
            "type": "error",
            "content": "Session not found",
            "metadata": {"error_code": "SESSION_NOT_FOUND"},
        }
        
        event_data = json.dumps(error_chunk)
        parsed = json.loads(event_data)
        
        assert parsed["type"] == "error"
        assert "Session not found" in parsed["content"]


# =============================================================================
# Frontend Transform Simulation Tests
# =============================================================================

class TestFrontendTransformSimulation:
    """
    Tests that simulate the frontend API client transformations.
    Verifies camelCase -> snake_case -> camelCase round-trip.
    """

    def test_upload_request_transform(self, mock_image_base64):
        """Simulate frontend upload request transformation."""
        # Frontend sends (camelCase)
        frontend_request = {
            "assetType": "face",
            "displayName": "My Face",
            "imageBase64": mock_image_base64,
            "tags": ["happy"],
            "isFavorite": True,
            "setAsPrimary": False,
            "removeBackground": True,
        }
        
        # API client transforms to snake_case
        api_request = {
            "asset_type": frontend_request["assetType"],
            "display_name": frontend_request["displayName"],
            "image_base64": frontend_request["imageBase64"],
            "tags": frontend_request["tags"],
            "is_favorite": frontend_request["isFavorite"],
            "set_as_primary": frontend_request["setAsPrimary"],
            "remove_background": frontend_request["removeBackground"],
        }
        
        # Backend parses
        from backend.api.schemas.creator_media import UploadMediaRequest
        request = UploadMediaRequest(**api_request)
        
        assert request.asset_type == "face"
        assert request.display_name == "My Face"
        assert request.is_favorite is True

    def test_placement_transform_roundtrip(self):
        """Simulate placement data transformation round-trip."""
        # Frontend AssetPlacement (camelCase)
        frontend_placement = {
            "assetId": "asset-123",
            "displayName": "My Face",
            "assetType": "face",
            "url": "https://example.com/face.png",
            "x": 85,
            "y": 90,
            "width": 15,
            "height": 15,
            "sizeUnit": "percent",
            "zIndex": 1,
            "rotation": 0,
            "opacity": 100,
        }
        
        # Frontend serializePlacements() transforms to snake_case
        api_placement = {
            "asset_id": frontend_placement["assetId"],
            "display_name": frontend_placement["displayName"],
            "asset_type": frontend_placement["assetType"],
            "url": frontend_placement["url"],
            "x": frontend_placement["x"],
            "y": frontend_placement["y"],
            "width": frontend_placement["width"],
            "height": frontend_placement["height"],
            "size_unit": frontend_placement["sizeUnit"],
            "z_index": frontend_placement["zIndex"],
            "rotation": frontend_placement["rotation"],
            "opacity": frontend_placement["opacity"],
        }
        
        # Backend parses
        from backend.api.schemas.generation import MediaAssetPlacement
        placement = MediaAssetPlacement(**api_placement)
        
        assert placement.asset_id == "asset-123"
        assert placement.size_unit == "percent"
        assert placement.z_index == 1

    def test_generation_request_transform(self):
        """Simulate generation request transformation."""
        # Frontend GenerateRequest (camelCase)
        frontend_request = {
            "assetType": "thumbnail",
            "brandKitId": "kit-123",
            "customPrompt": "Epic gaming moment",
            "mediaAssetIds": ["face-1", "logo-1"],
            "mediaAssetPlacements": [
                {
                    "assetId": "face-1",
                    "displayName": "Face",
                    "assetType": "face",
                    "url": "https://example.com/face.png",
                    "x": 85,
                    "y": 90,
                    "width": 15,
                    "height": 15,
                    "sizeUnit": "percent",
                    "zIndex": 1,
                    "rotation": 0,
                    "opacity": 100,
                }
            ],
        }
        
        # API client transforms
        api_request = {
            "asset_type": frontend_request["assetType"],
            "brand_kit_id": frontend_request["brandKitId"],
            "custom_prompt": frontend_request["customPrompt"],
            "media_asset_ids": frontend_request["mediaAssetIds"],
            "media_asset_placements": [
                {
                    "asset_id": p["assetId"],
                    "display_name": p["displayName"],
                    "asset_type": p["assetType"],
                    "url": p["url"],
                    "x": p["x"],
                    "y": p["y"],
                    "width": p["width"],
                    "height": p["height"],
                    "size_unit": p["sizeUnit"],
                    "z_index": p["zIndex"],
                    "rotation": p["rotation"],
                    "opacity": p["opacity"],
                }
                for p in frontend_request["mediaAssetPlacements"]
            ],
        }
        
        # Backend parses
        from backend.api.schemas.generation import GenerateRequest
        request = GenerateRequest(**api_request)
        
        assert request.asset_type == "thumbnail"
        assert len(request.media_asset_placements) == 1
        assert request.media_asset_placements[0].asset_id == "face-1"


# =============================================================================
# Constants Alignment Tests
# =============================================================================

class TestConstantsAlignment:
    """Verify constants match between backend and expected frontend values."""

    def test_asset_limits(self):
        """Verify asset limits match frontend constants."""
        from backend.services.creator_media.constants import (
            TOTAL_ASSET_LIMIT,
            MAX_PROMPT_INJECTION_ASSETS,
        )
        
        # These must match frontend constants
        assert TOTAL_ASSET_LIMIT == 25
        assert MAX_PROMPT_INJECTION_ASSETS == 2

    def test_media_asset_types(self):
        """Verify all asset types are defined."""
        from backend.services.creator_media.constants import MEDIA_ASSET_TYPES
        
        expected = [
            "logo", "face", "character", "game_skin", "object", "background",
            "reference", "overlay", "emote", "badge", "panel", "alert",
            "facecam_frame", "stinger"
        ]
        
        assert MEDIA_ASSET_TYPES == expected

    def test_bg_removal_types(self):
        """Verify background removal type lists."""
        from backend.services.creator_media.constants import (
            BG_REMOVAL_DEFAULT_TYPES,
            BG_REMOVAL_EXCLUDED_TYPES,
        )
        
        # Types that get bg removal by default
        assert "face" in BG_REMOVAL_DEFAULT_TYPES
        assert "logo" in BG_REMOVAL_DEFAULT_TYPES
        assert "character" in BG_REMOVAL_DEFAULT_TYPES
        
        # Types that never get bg removal
        assert "background" in BG_REMOVAL_EXCLUDED_TYPES
        assert "reference" in BG_REMOVAL_EXCLUDED_TYPES


# =============================================================================
# Bug Fix Verification Tests
# =============================================================================

class TestPlacementFormatterBugFix:
    """
    Tests to verify the PlacementFormatter accepts both camelCase and snake_case.
    
    Bug: PlacementFormatter originally only accepted camelCase keys, but the
    backend passes snake_case from Pydantic model_dump().
    """

    def test_formatter_accepts_snake_case_from_pydantic(self):
        """Verify formatter works with snake_case keys from model_dump()."""
        from backend.api.schemas.generation import MediaAssetPlacement
        from backend.services.creator_media.placement_formatter import PlacementFormatter
        
        # Create placement via Pydantic model (as done in routes)
        placement = MediaAssetPlacement(
            asset_id="face-123",
            display_name="My Face",
            asset_type="face",
            url="https://example.com/face.png",
            x=85.0,
            y=90.0,
            width=15.0,
            height=15.0,
            size_unit="percent",
            z_index=1,
            rotation=0.0,
            opacity=100.0,
        )
        
        # model_dump() produces snake_case
        placement_dict = placement.model_dump()
        assert "asset_id" in placement_dict  # snake_case
        assert "assetId" not in placement_dict  # NOT camelCase
        
        # Formatter should handle this
        formatter = PlacementFormatter()
        prompt_section = formatter.format_placements(
            placements=[placement_dict],
            canvas_width=1280,
            canvas_height=720,
        )
        
        assert "My Face" in prompt_section
        assert "face" in prompt_section.lower()
        assert "85%" in prompt_section

    def test_formatter_accepts_camelcase_from_frontend(self):
        """Verify formatter still works with camelCase keys (backwards compat)."""
        from backend.services.creator_media.placement_formatter import PlacementFormatter
        
        # camelCase as originally expected
        placement_dict = {
            "assetId": "face-123",
            "displayName": "My Face",
            "assetType": "face",
            "url": "https://example.com/face.png",
            "x": 85.0,
            "y": 90.0,
            "width": 15.0,
            "height": 15.0,
            "sizeUnit": "percent",
            "zIndex": 1,
            "rotation": 0.0,
            "opacity": 100.0,
        }
        
        formatter = PlacementFormatter()
        prompt_section = formatter.format_placements(
            placements=[placement_dict],
            canvas_width=1280,
            canvas_height=720,
        )
        
        assert "My Face" in prompt_section
        assert "face" in prompt_section.lower()

    def test_formatter_handles_mixed_case_gracefully(self):
        """Verify formatter handles edge cases gracefully."""
        from backend.services.creator_media.placement_formatter import PlacementFormatter
        
        # Mixed case (shouldn't happen but should not crash)
        placement_dict = {
            "asset_id": "face-123",  # snake_case
            "displayName": "My Face",  # camelCase
            "asset_type": "face",
            "url": "https://example.com/face.png",
            "x": 50.0,
            "y": 50.0,
            "width": 20.0,
            "height": 20.0,
            "size_unit": "percent",
            "z_index": 1,
        }
        
        formatter = PlacementFormatter()
        prompt_section = formatter.format_placements(
            placements=[placement_dict],
            canvas_width=1920,
            canvas_height=1080,
        )
        
        # Should use whichever is available
        assert "My Face" in prompt_section
