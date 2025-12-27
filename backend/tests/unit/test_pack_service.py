"""
Unit tests for the Pack Generation Service.

Tests cover:
- Pack definitions
- Pack creation
- Sequential pack generation
- Parallel pack generation
- Single asset generation
- Error handling
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from PIL import Image
from io import BytesIO
from backend.services.twitch.pack_service import (
    PackAsset,
    AssetPack,
    PackGenerationService,
    get_pack_service,
)
from backend.services.twitch.context_engine import GenerationContext


def create_mock_context() -> GenerationContext:
    """Create a mock GenerationContext."""
    return GenerationContext(
        primary_colors=[{"hex": "#FF5733"}],
        secondary_colors=[],
        accent_colors=[],
        gradients=[],
        display_font=None,
        headline_font=None,
        body_font=None,
        tone="professional",
        personality_traits=[],
        tagline="",
        primary_logo_url=None,
        watermark_url=None,
        watermark_opacity=50,
        style_reference=None,
        game_meta=None,
        season_context=None,
        asset_type="pack",
        asset_directive="",
    )


def create_mock_image_bytes(width: int, height: int, mode: str = "RGB") -> bytes:
    """Create mock image bytes for testing."""
    img = Image.new(mode, (width, height), color=(128, 128, 128))
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer.read()


def create_mock_asset_pipeline():
    """Create a mock asset pipeline that doesn't require rembg."""
    mock_pipeline = MagicMock()
    
    async def mock_process(image_data, asset_type, context, **kwargs):
        # Return processed image data (just resize to export size)
        from backend.services.twitch.dimensions import get_dimension_spec
        spec = get_dimension_spec(asset_type)
        img = Image.open(BytesIO(image_data))
        img = img.resize(spec.export_size, Image.Resampling.LANCZOS)
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        return buffer.read()
    
    mock_pipeline.process = mock_process
    mock_pipeline.get_export_format = MagicMock(return_value="PNG")
    return mock_pipeline


def create_mock_qc_gate():
    """Create a mock QC gate that always passes."""
    mock_qc = MagicMock()
    
    async def mock_validate(image_data, asset_type, expected_dimensions=None):
        return True, None, image_data
    
    mock_qc.validate = mock_validate
    return mock_qc


class TestPackAsset:
    """Tests for PackAsset dataclass."""
    
    def test_creation(self):
        """Test creating a PackAsset."""
        asset = PackAsset(
            id="test-id",
            asset_type="twitch_emote",
            image_data=b"test",
            filename="emote_0.png",
            width=512,
            height=512,
            file_size=100,
            format="PNG",
        )
        
        assert asset.id == "test-id"
        assert asset.asset_type == "twitch_emote"
        assert asset.width == 512
        assert asset.format == "PNG"
    
    def test_has_created_at(self):
        """Test that PackAsset has created_at timestamp."""
        asset = PackAsset(
            id="test-id",
            asset_type="twitch_emote",
            image_data=b"test",
            filename="emote_0.png",
            width=512,
            height=512,
            file_size=100,
            format="PNG",
        )
        
        assert asset.created_at is not None


class TestAssetPack:
    """Tests for AssetPack dataclass."""
    
    def test_creation(self):
        """Test creating an AssetPack."""
        pack = AssetPack(
            id="pack-id",
            pack_type="seasonal",
            brand_kit_id="kit-id",
            user_id="user-id",
            status="queued",
            progress=0,
        )
        
        assert pack.id == "pack-id"
        assert pack.pack_type == "seasonal"
        assert pack.status == "queued"
        assert pack.progress == 0
        assert pack.assets == []
    
    def test_has_timestamps(self):
        """Test that AssetPack has timestamps."""
        pack = AssetPack(
            id="pack-id",
            pack_type="seasonal",
            brand_kit_id="kit-id",
            user_id="user-id",
            status="queued",
            progress=0,
        )
        
        assert pack.created_at is not None
        assert pack.completed_at is None


class TestPackGenerationService:
    """Tests for PackGenerationService class."""
    
    @pytest.fixture
    def service(self):
        """Create PackGenerationService with mocked dependencies."""
        mock_context_engine = MagicMock()
        mock_context_engine.build_context = AsyncMock(return_value=create_mock_context())
        
        return PackGenerationService(
            context_engine=mock_context_engine,
            asset_pipeline=create_mock_asset_pipeline(),
            qc_gate=create_mock_qc_gate(),
        )
    
    def test_pack_definitions_exist(self, service):
        """Test that pack definitions are defined."""
        assert "seasonal" in service.PACK_DEFINITIONS
        assert "emote" in service.PACK_DEFINITIONS
        assert "stream" in service.PACK_DEFINITIONS
    
    def test_seasonal_pack_definition(self, service):
        """Test seasonal pack definition."""
        definition = service.get_pack_definition("seasonal")
        
        # Should have story, thumbnail, and emotes
        types = [item["type"] for item in definition]
        assert "tiktok_story" in types
        assert "youtube_thumbnail" in types
        assert "twitch_emote" in types
    
    def test_emote_pack_definition(self, service):
        """Test emote pack definition."""
        definition = service.get_pack_definition("emote")
        
        assert len(definition) == 1
        assert definition[0]["type"] == "twitch_emote"
        assert definition[0]["count"] == 5
    
    def test_stream_pack_definition(self, service):
        """Test stream pack definition."""
        definition = service.get_pack_definition("stream")
        
        types = [item["type"] for item in definition]
        assert "twitch_panel" in types
        assert "twitch_offline" in types
    
    def test_unknown_pack_type_raises(self, service):
        """Test that unknown pack type raises ValueError."""
        with pytest.raises(ValueError, match="Unknown pack type"):
            service.get_pack_definition("unknown")
    
    def test_get_total_asset_count_seasonal(self, service):
        """Test total asset count for seasonal pack."""
        count = service.get_total_asset_count("seasonal")
        assert count == 5  # 1 + 1 + 3
    
    def test_get_total_asset_count_emote(self, service):
        """Test total asset count for emote pack."""
        count = service.get_total_asset_count("emote")
        assert count == 5
    
    def test_get_total_asset_count_stream(self, service):
        """Test total asset count for stream pack."""
        count = service.get_total_asset_count("stream")
        assert count == 4  # 3 + 1


class TestCreatePack:
    """Tests for create_pack method."""
    
    @pytest.fixture
    def service(self):
        mock_context_engine = MagicMock()
        mock_context_engine.build_context = AsyncMock(return_value=create_mock_context())
        return PackGenerationService(
            context_engine=mock_context_engine,
            asset_pipeline=create_mock_asset_pipeline(),
            qc_gate=create_mock_qc_gate(),
        )
    
    @pytest.mark.asyncio
    async def test_creates_pack_in_queued_state(self, service):
        """Test that create_pack returns pack in queued state."""
        pack = await service.create_pack(
            user_id="user-id",
            brand_kit_id="kit-id",
            pack_type="seasonal",
        )
        
        assert pack.status == "queued"
        assert pack.progress == 0
        assert pack.pack_type == "seasonal"
    
    @pytest.mark.asyncio
    async def test_creates_pack_with_uuid(self, service):
        """Test that create_pack generates UUID."""
        pack = await service.create_pack(
            user_id="user-id",
            brand_kit_id="kit-id",
            pack_type="emote",
        )
        
        assert pack.id is not None
        assert len(pack.id) == 36  # UUID format
    
    @pytest.mark.asyncio
    async def test_validates_brand_kit(self, service):
        """Test that create_pack validates brand kit ownership."""
        await service.create_pack(
            user_id="user-id",
            brand_kit_id="kit-id",
            pack_type="seasonal",
        )
        
        service.context_engine.build_context.assert_called_once()


class TestGeneratePack:
    """Tests for generate_pack method."""
    
    @pytest.fixture
    def service(self):
        mock_context_engine = MagicMock()
        mock_context_engine.build_context = AsyncMock(return_value=create_mock_context())
        return PackGenerationService(
            context_engine=mock_context_engine,
            asset_pipeline=create_mock_asset_pipeline(),
            qc_gate=create_mock_qc_gate(),
        )
    
    @pytest.mark.asyncio
    async def test_generates_emote_pack(self, service):
        """Test generating an emote pack."""
        pack = await service.generate_pack(
            user_id="user-id",
            brand_kit_id="kit-id",
            pack_type="emote",
        )
        
        assert pack.status == "completed"
        assert pack.progress == 100
        assert len(pack.assets) == 5
    
    @pytest.mark.asyncio
    async def test_generates_seasonal_pack(self, service):
        """Test generating a seasonal pack."""
        pack = await service.generate_pack(
            user_id="user-id",
            brand_kit_id="kit-id",
            pack_type="seasonal",
        )
        
        assert pack.status == "completed"
        assert len(pack.assets) == 5
    
    @pytest.mark.asyncio
    async def test_generates_stream_pack(self, service):
        """Test generating a stream pack."""
        pack = await service.generate_pack(
            user_id="user-id",
            brand_kit_id="kit-id",
            pack_type="stream",
        )
        
        assert pack.status == "completed"
        assert len(pack.assets) == 4
    
    @pytest.mark.asyncio
    async def test_sets_completed_at(self, service):
        """Test that completed_at is set on completion."""
        pack = await service.generate_pack(
            user_id="user-id",
            brand_kit_id="kit-id",
            pack_type="emote",
        )
        
        assert pack.completed_at is not None
    
    @pytest.mark.asyncio
    async def test_all_assets_have_correct_type(self, service):
        """Test that all assets in emote pack are emotes."""
        pack = await service.generate_pack(
            user_id="user-id",
            brand_kit_id="kit-id",
            pack_type="emote",
        )
        
        for asset in pack.assets:
            assert asset.asset_type == "twitch_emote"


class TestGeneratePackParallel:
    """Tests for generate_pack_parallel method."""
    
    @pytest.fixture
    def service(self):
        mock_context_engine = MagicMock()
        mock_context_engine.build_context = AsyncMock(return_value=create_mock_context())
        return PackGenerationService(
            context_engine=mock_context_engine,
            asset_pipeline=create_mock_asset_pipeline(),
            qc_gate=create_mock_qc_gate(),
        )
    
    @pytest.mark.asyncio
    async def test_generates_pack_parallel(self, service):
        """Test parallel pack generation."""
        pack = await service.generate_pack_parallel(
            user_id="user-id",
            brand_kit_id="kit-id",
            pack_type="emote",
        )
        
        assert pack.status == "completed"
        assert len(pack.assets) == 5
    
    @pytest.mark.asyncio
    async def test_parallel_same_result_as_sequential(self, service):
        """Test that parallel produces same asset count as sequential."""
        pack_seq = await service.generate_pack(
            user_id="user-id",
            brand_kit_id="kit-id",
            pack_type="seasonal",
        )
        
        pack_par = await service.generate_pack_parallel(
            user_id="user-id",
            brand_kit_id="kit-id",
            pack_type="seasonal",
        )
        
        assert len(pack_seq.assets) == len(pack_par.assets)


class TestSingleAssetGeneration:
    """Tests for _generate_single_asset method."""
    
    @pytest.fixture
    def service(self):
        mock_context_engine = MagicMock()
        mock_context_engine.build_context = AsyncMock(return_value=create_mock_context())
        return PackGenerationService(
            context_engine=mock_context_engine,
            asset_pipeline=create_mock_asset_pipeline(),
            qc_gate=create_mock_qc_gate(),
        )
    
    @pytest.mark.asyncio
    async def test_generates_asset_with_correct_dimensions(self, service):
        """Test that generated asset has correct dimensions."""
        context = create_mock_context()
        
        asset = await service._generate_single_asset(
            base_context=context,
            asset_type="twitch_emote",
            custom_prompt=None,
            index=0,
            image_generator=None,
        )
        
        assert asset.width == 512
        assert asset.height == 512
    
    @pytest.mark.asyncio
    async def test_generates_asset_with_filename(self, service):
        """Test that generated asset has correct filename."""
        context = create_mock_context()
        
        asset = await service._generate_single_asset(
            base_context=context,
            asset_type="twitch_emote",
            custom_prompt=None,
            index=2,
            image_generator=None,
        )
        
        assert "twitch_emote_2" in asset.filename
    
    @pytest.mark.asyncio
    async def test_generates_asset_with_format(self, service):
        """Test that generated asset has correct format."""
        context = create_mock_context()
        
        asset = await service._generate_single_asset(
            base_context=context,
            asset_type="twitch_emote",
            custom_prompt=None,
            index=0,
            image_generator=None,
        )
        
        assert asset.format == "PNG"


class TestGetPackService:
    """Tests for get_pack_service singleton."""
    
    def test_returns_service(self):
        """Test that get_pack_service returns a service."""
        service = get_pack_service()
        assert isinstance(service, PackGenerationService)
    
    def test_returns_same_instance(self):
        """Test that get_pack_service returns singleton."""
        service1 = get_pack_service()
        service2 = get_pack_service()
        assert service1 is service2
