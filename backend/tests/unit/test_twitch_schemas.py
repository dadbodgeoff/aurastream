"""
Unit tests for Twitch schemas module.

Tests cover:
- TwitchGenerateRequest validation
- custom_prompt max length enforcement
- text_overlay max length enforcement
- PackGenerateRequest validation
- Response schema serialization
"""

import pytest
from datetime import datetime, timezone
from pydantic import ValidationError

from backend.api.schemas.twitch import (
    TwitchAssetType,
    PackType,
    PackStatusEnum,
    TwitchGenerateRequest,
    PackGenerateRequest,
    AssetResponse,
    PackResponse,
    DimensionSpecResponse,
)


# =============================================================================
# Test TwitchGenerateRequest
# =============================================================================

class TestTwitchGenerateRequest:
    """Tests for TwitchGenerateRequest schema."""
    
    def test_valid_request_minimal(self):
        """Test valid request with minimal required fields."""
        request = TwitchGenerateRequest(
            asset_type="twitch_emote",
            brand_kit_id="550e8400-e29b-41d4-a716-446655440000"
        )
        assert request.asset_type == "twitch_emote"
        assert request.brand_kit_id == "550e8400-e29b-41d4-a716-446655440000"
        assert request.custom_prompt is None
        assert request.game_id is None
        assert request.text_overlay is None
        assert request.include_logo is False
    
    def test_valid_request_all_fields(self):
        """Test valid request with all fields."""
        request = TwitchGenerateRequest(
            asset_type="twitch_banner",
            brand_kit_id="550e8400-e29b-41d4-a716-446655440000",
            custom_prompt="Epic gaming banner",
            game_id="12345",
            text_overlay="LIVE NOW",
            include_logo=True
        )
        assert request.asset_type == "twitch_banner"
        assert request.brand_kit_id == "550e8400-e29b-41d4-a716-446655440000"
        assert request.custom_prompt == "Epic gaming banner"
        assert request.game_id == "12345"
        assert request.text_overlay == "LIVE NOW"
        assert request.include_logo is True
    
    def test_valid_asset_types(self):
        """Test all valid asset types are accepted."""
        valid_types = [
            "twitch_emote", "twitch_emote_112", "twitch_emote_56", "twitch_emote_28",
            "twitch_badge", "twitch_badge_36", "twitch_badge_18",
            "twitch_panel", "twitch_offline", "twitch_banner"
        ]
        for asset_type in valid_types:
            request = TwitchGenerateRequest(
                asset_type=asset_type,
                brand_kit_id="550e8400-e29b-41d4-a716-446655440000"
            )
            assert request.asset_type == asset_type
    
    def test_invalid_asset_type(self):
        """Test invalid asset type raises validation error."""
        with pytest.raises(ValidationError) as exc_info:
            TwitchGenerateRequest(
                asset_type="invalid_type",
                brand_kit_id="550e8400-e29b-41d4-a716-446655440000"
            )
        assert "asset_type" in str(exc_info.value)
    
    def test_missing_required_fields(self):
        """Test missing required fields raises validation error."""
        with pytest.raises(ValidationError):
            TwitchGenerateRequest()
    
    def test_missing_brand_kit_id(self):
        """Test missing brand_kit_id is allowed (optional field)."""
        # brand_kit_id is now optional - should not raise validation error
        request = TwitchGenerateRequest(asset_type="twitch_emote")
        assert request.brand_kit_id is None
        assert request.asset_type == "twitch_emote"
    
    def test_missing_asset_type(self):
        """Test missing asset_type raises validation error."""
        with pytest.raises(ValidationError):
            TwitchGenerateRequest(brand_kit_id="550e8400-e29b-41d4-a716-446655440000")


# =============================================================================
# Test Custom Prompt Max Length
# =============================================================================

class TestCustomPromptMaxLength:
    """Tests for custom_prompt max length enforcement."""
    
    def test_custom_prompt_at_max_length(self):
        """Test custom_prompt at exactly 500 characters is valid."""
        prompt = "A" * 500
        request = TwitchGenerateRequest(
            asset_type="twitch_emote",
            brand_kit_id="550e8400-e29b-41d4-a716-446655440000",
            custom_prompt=prompt
        )
        assert len(request.custom_prompt) == 500
    
    def test_custom_prompt_exceeds_max_length(self):
        """Test custom_prompt exceeding 500 characters raises validation error."""
        prompt = "A" * 501
        with pytest.raises(ValidationError) as exc_info:
            TwitchGenerateRequest(
                asset_type="twitch_emote",
                brand_kit_id="550e8400-e29b-41d4-a716-446655440000",
                custom_prompt=prompt
            )
        assert "custom_prompt" in str(exc_info.value)
    
    def test_custom_prompt_empty_string(self):
        """Test custom_prompt as empty string is valid."""
        request = TwitchGenerateRequest(
            asset_type="twitch_emote",
            brand_kit_id="550e8400-e29b-41d4-a716-446655440000",
            custom_prompt=""
        )
        assert request.custom_prompt == ""


# =============================================================================
# Test Text Overlay Max Length
# =============================================================================

class TestTextOverlayMaxLength:
    """Tests for text_overlay max length enforcement."""
    
    def test_text_overlay_at_max_length(self):
        """Test text_overlay at exactly 100 characters is valid."""
        text = "A" * 100
        request = TwitchGenerateRequest(
            asset_type="twitch_emote",
            brand_kit_id="550e8400-e29b-41d4-a716-446655440000",
            text_overlay=text
        )
        assert len(request.text_overlay) == 100
    
    def test_text_overlay_exceeds_max_length(self):
        """Test text_overlay exceeding 100 characters raises validation error."""
        text = "A" * 101
        with pytest.raises(ValidationError) as exc_info:
            TwitchGenerateRequest(
                asset_type="twitch_emote",
                brand_kit_id="550e8400-e29b-41d4-a716-446655440000",
                text_overlay=text
            )
        assert "text_overlay" in str(exc_info.value)


# =============================================================================
# Test PackGenerateRequest
# =============================================================================

class TestPackGenerateRequest:
    """Tests for PackGenerateRequest schema."""
    
    def test_valid_request_minimal(self):
        """Test valid request with minimal required fields."""
        request = PackGenerateRequest(
            pack_type="emote",
            brand_kit_id="550e8400-e29b-41d4-a716-446655440000"
        )
        assert request.pack_type == "emote"
        assert request.brand_kit_id == "550e8400-e29b-41d4-a716-446655440000"
        assert request.custom_prompt is None
        assert request.game_id is None
    
    def test_valid_request_all_fields(self):
        """Test valid request with all fields."""
        request = PackGenerateRequest(
            pack_type="seasonal",
            brand_kit_id="550e8400-e29b-41d4-a716-446655440000",
            custom_prompt="Winter holiday theme",
            game_id="12345"
        )
        assert request.pack_type == "seasonal"
        assert request.brand_kit_id == "550e8400-e29b-41d4-a716-446655440000"
        assert request.custom_prompt == "Winter holiday theme"
        assert request.game_id == "12345"
    
    def test_valid_pack_types(self):
        """Test all valid pack types are accepted."""
        valid_types = ["seasonal", "emote", "stream"]
        for pack_type in valid_types:
            request = PackGenerateRequest(
                pack_type=pack_type,
                brand_kit_id="550e8400-e29b-41d4-a716-446655440000"
            )
            assert request.pack_type == pack_type
    
    def test_invalid_pack_type(self):
        """Test invalid pack type raises validation error."""
        with pytest.raises(ValidationError) as exc_info:
            PackGenerateRequest(
                pack_type="invalid_pack",
                brand_kit_id="550e8400-e29b-41d4-a716-446655440000"
            )
        assert "pack_type" in str(exc_info.value)
    
    def test_pack_custom_prompt_max_length(self):
        """Test pack custom_prompt max length enforcement."""
        prompt = "A" * 501
        with pytest.raises(ValidationError) as exc_info:
            PackGenerateRequest(
                pack_type="emote",
                brand_kit_id="550e8400-e29b-41d4-a716-446655440000",
                custom_prompt=prompt
            )
        assert "custom_prompt" in str(exc_info.value)
    
    def test_missing_required_fields(self):
        """Test missing required fields raises validation error."""
        with pytest.raises(ValidationError):
            PackGenerateRequest()


# =============================================================================
# Test AssetResponse Serialization
# =============================================================================

class TestAssetResponseSerialization:
    """Tests for AssetResponse schema serialization."""
    
    def test_asset_response_creation(self):
        """Test AssetResponse can be created with valid data."""
        now = datetime.now(timezone.utc)
        response = AssetResponse(
            id="660e8400-e29b-41d4-a716-446655440001",
            asset_type="twitch_emote",
            url="https://storage.example.com/assets/emote_123.png",
            width=512,
            height=512,
            file_size=45678,
            format="png",
            created_at=now
        )
        assert response.id == "660e8400-e29b-41d4-a716-446655440001"
        assert response.asset_type == "twitch_emote"
        assert response.url == "https://storage.example.com/assets/emote_123.png"
        assert response.width == 512
        assert response.height == 512
        assert response.file_size == 45678
        assert response.format == "png"
        assert response.created_at == now
    
    def test_asset_response_serialization(self):
        """Test AssetResponse serializes to dict correctly."""
        now = datetime.now(timezone.utc)
        response = AssetResponse(
            id="660e8400-e29b-41d4-a716-446655440001",
            asset_type="twitch_emote",
            url="https://storage.example.com/assets/emote_123.png",
            width=512,
            height=512,
            file_size=45678,
            format="png",
            created_at=now
        )
        data = response.model_dump()
        assert data["id"] == "660e8400-e29b-41d4-a716-446655440001"
        assert data["asset_type"] == "twitch_emote"
        assert data["width"] == 512
        assert data["height"] == 512
    
    def test_asset_response_invalid_width(self):
        """Test AssetResponse rejects invalid width."""
        with pytest.raises(ValidationError):
            AssetResponse(
                id="660e8400-e29b-41d4-a716-446655440001",
                asset_type="twitch_emote",
                url="https://storage.example.com/assets/emote_123.png",
                width=0,  # Invalid: must be > 0
                height=512,
                file_size=45678,
                format="png",
                created_at=datetime.now(timezone.utc)
            )
    
    def test_asset_response_invalid_height(self):
        """Test AssetResponse rejects invalid height."""
        with pytest.raises(ValidationError):
            AssetResponse(
                id="660e8400-e29b-41d4-a716-446655440001",
                asset_type="twitch_emote",
                url="https://storage.example.com/assets/emote_123.png",
                width=512,
                height=-1,  # Invalid: must be > 0
                file_size=45678,
                format="png",
                created_at=datetime.now(timezone.utc)
            )


# =============================================================================
# Test PackResponse Serialization
# =============================================================================

class TestPackResponseSerialization:
    """Tests for PackResponse schema serialization."""
    
    def test_pack_response_creation(self):
        """Test PackResponse can be created with valid data."""
        now = datetime.now(timezone.utc)
        response = PackResponse(
            id="770e8400-e29b-41d4-a716-446655440002",
            pack_type="emote",
            status="queued",
            progress=0,
            assets=[],
            created_at=now
        )
        assert response.id == "770e8400-e29b-41d4-a716-446655440002"
        assert response.pack_type == "emote"
        assert response.status == "queued"
        assert response.progress == 0
        assert response.assets == []
        assert response.created_at == now
    
    def test_pack_response_with_assets(self):
        """Test PackResponse with assets list."""
        now = datetime.now(timezone.utc)
        asset = AssetResponse(
            id="660e8400-e29b-41d4-a716-446655440001",
            asset_type="twitch_emote",
            url="https://storage.example.com/assets/emote_123.png",
            width=512,
            height=512,
            file_size=45678,
            format="png",
            created_at=now
        )
        response = PackResponse(
            id="770e8400-e29b-41d4-a716-446655440002",
            pack_type="emote",
            status="completed",
            progress=100,
            assets=[asset],
            created_at=now
        )
        assert len(response.assets) == 1
        assert response.assets[0].id == "660e8400-e29b-41d4-a716-446655440001"
    
    def test_pack_response_valid_statuses(self):
        """Test PackResponse accepts all valid statuses."""
        now = datetime.now(timezone.utc)
        valid_statuses = ["queued", "processing", "completed", "failed"]
        for status in valid_statuses:
            response = PackResponse(
                id="770e8400-e29b-41d4-a716-446655440002",
                pack_type="emote",
                status=status,
                progress=50,
                assets=[],
                created_at=now
            )
            assert response.status == status
    
    def test_pack_response_progress_bounds(self):
        """Test PackResponse progress bounds validation."""
        now = datetime.now(timezone.utc)
        
        # Valid: 0
        response = PackResponse(
            id="770e8400-e29b-41d4-a716-446655440002",
            pack_type="emote",
            status="queued",
            progress=0,
            assets=[],
            created_at=now
        )
        assert response.progress == 0
        
        # Valid: 100
        response = PackResponse(
            id="770e8400-e29b-41d4-a716-446655440002",
            pack_type="emote",
            status="completed",
            progress=100,
            assets=[],
            created_at=now
        )
        assert response.progress == 100
    
    def test_pack_response_invalid_progress_below_zero(self):
        """Test PackResponse rejects progress below 0."""
        with pytest.raises(ValidationError):
            PackResponse(
                id="770e8400-e29b-41d4-a716-446655440002",
                pack_type="emote",
                status="queued",
                progress=-1,
                assets=[],
                created_at=datetime.now(timezone.utc)
            )
    
    def test_pack_response_invalid_progress_above_100(self):
        """Test PackResponse rejects progress above 100."""
        with pytest.raises(ValidationError):
            PackResponse(
                id="770e8400-e29b-41d4-a716-446655440002",
                pack_type="emote",
                status="queued",
                progress=101,
                assets=[],
                created_at=datetime.now(timezone.utc)
            )
    
    def test_pack_response_serialization(self):
        """Test PackResponse serializes to dict correctly."""
        now = datetime.now(timezone.utc)
        response = PackResponse(
            id="770e8400-e29b-41d4-a716-446655440002",
            pack_type="seasonal",
            status="processing",
            progress=50,
            assets=[],
            created_at=now
        )
        data = response.model_dump()
        assert data["id"] == "770e8400-e29b-41d4-a716-446655440002"
        assert data["pack_type"] == "seasonal"
        assert data["status"] == "processing"
        assert data["progress"] == 50


# =============================================================================
# Test DimensionSpecResponse Serialization
# =============================================================================

class TestDimensionSpecResponseSerialization:
    """Tests for DimensionSpecResponse schema serialization."""
    
    def test_dimension_spec_response_creation(self):
        """Test DimensionSpecResponse can be created with valid data."""
        response = DimensionSpecResponse(
            asset_type="twitch_emote",
            generation_size=(1024, 1024),
            export_size=(512, 512),
            aspect_ratio="1:1"
        )
        assert response.asset_type == "twitch_emote"
        assert response.generation_size == (1024, 1024)
        assert response.export_size == (512, 512)
        assert response.aspect_ratio == "1:1"
    
    def test_dimension_spec_response_serialization(self):
        """Test DimensionSpecResponse serializes to dict correctly."""
        response = DimensionSpecResponse(
            asset_type="twitch_emote",
            generation_size=(1024, 1024),
            export_size=(512, 512),
            aspect_ratio="1:1"
        )
        data = response.model_dump()
        assert data["asset_type"] == "twitch_emote"
        assert data["generation_size"] == (1024, 1024)
        assert data["export_size"] == (512, 512)
        assert data["aspect_ratio"] == "1:1"
    
    def test_dimension_spec_response_json_serialization(self):
        """Test DimensionSpecResponse serializes to JSON correctly."""
        response = DimensionSpecResponse(
            asset_type="twitch_banner",
            generation_size=(1536, 640),
            export_size=(1200, 480),
            aspect_ratio="~3:1"
        )
        json_str = response.model_dump_json()
        assert "twitch_banner" in json_str
        assert "1536" in json_str
        assert "~3:1" in json_str
