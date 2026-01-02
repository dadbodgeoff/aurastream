"""
Unit tests for Thumbnail Recreation Service.

Tests the business logic for thumbnail recreation without external dependencies.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone

from backend.services.thumbnail_recreate_service import (
    ThumbnailRecreateService,
    get_thumbnail_recreate_service,
)
from backend.api.schemas.thumbnail_intel import ThumbnailAnalysisResponse


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def service():
    """Create a fresh service instance for each test."""
    return ThumbnailRecreateService()


@pytest.fixture
def mock_analysis():
    """Create a mock thumbnail analysis response."""
    return ThumbnailAnalysisResponse(
        video_id="test123",
        title="Test Video Title",
        thumbnail_url="https://i.ytimg.com/vi/test123/maxresdefault.jpg",
        view_count=1500000,
        layout_type="face-left-text-right",
        text_placement="right-side",
        focal_point="face",
        dominant_colors=["#FF0000", "#FFFFFF", "#000000"],
        color_mood="high-energy",
        background_style="gradient",
        has_face=True,
        has_text=True,
        text_content="SHOCKING!",
        has_border=False,
        has_glow_effects=True,
        has_arrows_circles=False,
        face_expression="shocked",
        face_position="left-third",
        face_size="large",
        face_looking_direction="camera",
        layout_recipe="Place face on left third, text on right",
        color_recipe="Use red/white high contrast",
        why_it_works="Strong emotion + clear text",
        difficulty="medium",
    )


@pytest.fixture
def mock_analysis_no_face():
    """Create a mock thumbnail analysis without face."""
    return ThumbnailAnalysisResponse(
        video_id="test456",
        title="No Face Video",
        thumbnail_url="https://i.ytimg.com/vi/test456/maxresdefault.jpg",
        view_count=500000,
        layout_type="text-centered",
        text_placement="center",
        focal_point="text",
        dominant_colors=["#0000FF", "#FFFFFF"],
        color_mood="calm",
        background_style="solid",
        has_face=False,
        has_text=True,
        text_content="TUTORIAL",
        has_border=True,
        has_glow_effects=False,
        has_arrows_circles=True,
        face_expression=None,
        face_position=None,
        face_size=None,
        face_looking_direction=None,
        layout_recipe="Center text with border",
        color_recipe="Blue and white contrast",
        why_it_works="Clear and readable",
        difficulty="easy",
    )


# =============================================================================
# Prompt Building Tests
# =============================================================================

class TestBuildRecreationPrompt:
    """Tests for _build_recreation_prompt method."""

    def test_prompt_includes_layout_info(self, service, mock_analysis):
        """Prompt should include layout type and recipe."""
        prompt = service._build_recreation_prompt(mock_analysis)
        
        assert "face-left-text-right" in prompt
        assert "Place face on left third, text on right" in prompt

    def test_prompt_includes_color_info(self, service, mock_analysis):
        """Prompt should include color information."""
        prompt = service._build_recreation_prompt(mock_analysis)
        
        assert "#FF0000" in prompt
        assert "high-energy" in prompt
        assert "Use red/white high contrast" in prompt

    def test_prompt_includes_face_instructions_when_face_present(self, service, mock_analysis):
        """Prompt should include face swap instructions when face detected."""
        prompt = service._build_recreation_prompt(mock_analysis)
        
        assert "FACE REPLACEMENT INSTRUCTIONS" in prompt
        assert "shocked" in prompt
        assert "left-third" in prompt
        assert "large" in prompt
        assert "camera" in prompt

    def test_prompt_excludes_face_instructions_when_no_face(self, service, mock_analysis_no_face):
        """Prompt should not include face instructions when no face detected."""
        prompt = service._build_recreation_prompt(mock_analysis_no_face)
        
        assert "FACE REPLACEMENT INSTRUCTIONS" not in prompt

    def test_prompt_includes_text_content(self, service, mock_analysis):
        """Prompt should include text content."""
        prompt = service._build_recreation_prompt(mock_analysis)
        
        assert 'TEXT CONTENT: "SHOCKING!"' in prompt

    def test_prompt_uses_custom_text_when_provided(self, service, mock_analysis):
        """Prompt should use custom text when provided."""
        prompt = service._build_recreation_prompt(
            mock_analysis,
            custom_text="MY CUSTOM TEXT"
        )
        
        assert 'TEXT CONTENT: "MY CUSTOM TEXT"' in prompt

    def test_prompt_uses_brand_colors_when_provided(self, service, mock_analysis):
        """Prompt should use brand colors when provided."""
        brand_colors = ["#00FF00", "#FF00FF", "#FFFF00"]
        prompt = service._build_recreation_prompt(
            mock_analysis,
            brand_colors=brand_colors
        )
        
        assert "#00FF00" in prompt
        assert "#FF00FF" in prompt

    def test_prompt_includes_additional_instructions(self, service, mock_analysis):
        """Prompt should include additional instructions when provided."""
        prompt = service._build_recreation_prompt(
            mock_analysis,
            additional_instructions="Make it more dramatic"
        )
        
        assert "Make it more dramatic" in prompt

    def test_prompt_includes_design_elements(self, service, mock_analysis):
        """Prompt should include design element flags."""
        prompt = service._build_recreation_prompt(mock_analysis)
        
        assert "Has Border: False" in prompt
        assert "Has Glow Effects: True" in prompt
        assert "Has Arrows/Circles: False" in prompt

    def test_prompt_includes_why_it_works(self, service, mock_analysis):
        """Prompt should include why the thumbnail works."""
        prompt = service._build_recreation_prompt(mock_analysis)
        
        assert "Strong emotion + clear text" in prompt


# =============================================================================
# Face Data Tests
# =============================================================================

class TestGetFaceData:
    """Tests for _get_face_data method."""

    @pytest.mark.asyncio
    async def test_returns_base64_when_provided(self, service):
        """Should return base64 data when provided directly."""
        face_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        result = await service._get_face_data(
            user_id="user123",
            face_image_base64=face_base64,
            face_asset_id=None
        )
        
        assert result is not None
        assert result["base64"] == face_base64
        assert result["source"] == "upload"

    @pytest.mark.asyncio
    async def test_returns_none_when_no_face_provided(self, service):
        """Should return None when no face data provided."""
        result = await service._get_face_data(
            user_id="user123",
            face_image_base64=None,
            face_asset_id=None
        )
        
        assert result is None

    @pytest.mark.asyncio
    async def test_loads_face_from_asset_id(self, service):
        """Should load face from saved asset when asset_id provided."""
        # Mock the database and HTTP client
        mock_db = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [{
            "id": "asset123",
            "original_url": "https://storage.example.com/face.png",
            "processed_url": None,
        }]
        mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
        
        service._supabase = mock_db
        
        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.content = b"fake_image_data"
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
            
            result = await service._get_face_data(
                user_id="user123",
                face_image_base64=None,
                face_asset_id="asset123"
            )
        
        assert result is not None
        assert result["source"] == "saved"
        assert result["asset_id"] == "asset123"


# =============================================================================
# Recreation Record Tests
# =============================================================================

class TestSaveRecreationRecord:
    """Tests for _save_recreation_record method."""

    @pytest.mark.asyncio
    async def test_saves_record_with_all_fields(self, service, mock_analysis):
        """Should save recreation record with all required fields."""
        mock_db = MagicMock()
        mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock()
        service._supabase = mock_db
        
        await service._save_recreation_record(
            recreation_id="rec123",
            user_id="user123",
            job_id="job123",
            video_id="test123",
            thumbnail_url="https://example.com/thumb.jpg",
            analysis=mock_analysis,
            custom_text="Custom",
            use_brand_colors=True,
            brand_kit_id="brand123",
        )
        
        # Verify insert was called
        mock_db.table.assert_called_with("thumbnail_recreations")
        insert_call = mock_db.table.return_value.insert.call_args
        data = insert_call[0][0]
        
        assert data["id"] == "rec123"
        assert data["user_id"] == "user123"
        assert data["job_id"] == "job123"
        assert data["reference_video_id"] == "test123"
        assert data["custom_text"] == "Custom"
        assert data["use_brand_colors"] is True
        assert data["brand_kit_id"] == "brand123"
        assert data["status"] == "queued"


# =============================================================================
# Singleton Tests
# =============================================================================

class TestServiceSingleton:
    """Tests for service singleton pattern."""

    def test_get_service_returns_same_instance(self):
        """Should return the same service instance."""
        # Reset singleton
        import backend.services.thumbnail_recreate_service as module
        module._service = None
        
        service1 = get_thumbnail_recreate_service()
        service2 = get_thumbnail_recreate_service()
        
        assert service1 is service2

    def test_service_lazy_loads_dependencies(self, service):
        """Service should lazy-load its dependencies."""
        # Initially None
        assert service._supabase is None
        assert service._generation_service is None
        assert service._brand_kit_service is None


# =============================================================================
# Status Tests
# =============================================================================

class TestGetStatus:
    """Tests for get_status method."""

    @pytest.mark.asyncio
    async def test_raises_error_for_not_found(self, service):
        """Should raise ValueError when recreation not found."""
        mock_db = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
        service._supabase = mock_db
        
        with pytest.raises(ValueError, match="Recreation not found"):
            await service.get_status(
                user_id="user123",
                recreation_id="nonexistent"
            )


# =============================================================================
# History Tests
# =============================================================================

class TestGetHistory:
    """Tests for get_history method."""

    @pytest.mark.asyncio
    async def test_returns_paginated_history(self, service):
        """Should return paginated recreation history."""
        mock_db = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": "rec1",
                "reference_video_id": "vid1",
                "reference_thumbnail_url": "https://example.com/1.jpg",
                "generated_url": "https://example.com/gen1.jpg",
                "custom_text": None,
                "status": "completed",
                "created_at": "2026-01-01T12:00:00Z",
            },
            {
                "id": "rec2",
                "reference_video_id": "vid2",
                "reference_thumbnail_url": "https://example.com/2.jpg",
                "generated_url": None,
                "custom_text": "Custom",
                "status": "queued",
                "created_at": "2026-01-01T11:00:00Z",
            },
        ]
        mock_result.count = 2
        mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result
        service._supabase = mock_db
        
        result = await service.get_history(
            user_id="user123",
            limit=20,
            offset=0
        )
        
        assert result["total"] == 2
        assert len(result["recreations"]) == 2
        assert result["recreations"][0]["id"] == "rec1"
        assert result["recreations"][0]["status"] == "completed"
        assert result["recreations"][1]["custom_text"] == "Custom"
