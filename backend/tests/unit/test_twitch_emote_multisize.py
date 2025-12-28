"""
Unit tests for Twitch Emote Multi-Size Processing.

Tests cover:
- Multi-size emote generation (112x112, 56x56, 28x28)
- Background removal integration
- Storage service suffix parameter
- Worker detection of emote asset types
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from io import BytesIO
from PIL import Image


# =============================================================================
# Test Helpers
# =============================================================================

def create_test_image(width: int = 1024, height: int = 1024, mode: str = "RGB") -> bytes:
    """Create a test image and return as bytes."""
    image = Image.new(mode, (width, height), color=(255, 0, 0))
    output = BytesIO()
    image.save(output, format="PNG")
    output.seek(0)
    return output.read()


def create_rgba_test_image(width: int = 1024, height: int = 1024) -> bytes:
    """Create a test RGBA image with transparency."""
    image = Image.new("RGBA", (width, height), color=(255, 0, 0, 255))
    output = BytesIO()
    image.save(output, format="PNG")
    output.seek(0)
    return output.read()


# =============================================================================
# Test: is_twitch_emote Detection
# =============================================================================

class TestIsTwitchEmote:
    """Tests for is_twitch_emote helper function."""
    
    def test_detects_twitch_emote(self):
        """Test that twitch_emote is detected."""
        from backend.workers.generation_worker import is_twitch_emote
        assert is_twitch_emote("twitch_emote") is True
    
    def test_detects_twitch_emote_112(self):
        """Test that twitch_emote_112 is detected."""
        from backend.workers.generation_worker import is_twitch_emote
        assert is_twitch_emote("twitch_emote_112") is True
    
    def test_rejects_twitch_badge(self):
        """Test that twitch_badge is not detected as emote."""
        from backend.workers.generation_worker import is_twitch_emote
        assert is_twitch_emote("twitch_badge") is False
    
    def test_rejects_youtube_thumbnail(self):
        """Test that youtube_thumbnail is not detected as emote."""
        from backend.workers.generation_worker import is_twitch_emote
        assert is_twitch_emote("youtube_thumbnail") is False
    
    def test_rejects_twitch_emote_56(self):
        """Test that twitch_emote_56 is not detected (only base types trigger multi-size)."""
        from backend.workers.generation_worker import is_twitch_emote
        # Only twitch_emote and twitch_emote_112 should trigger multi-size
        assert is_twitch_emote("twitch_emote_56") is False
    
    def test_rejects_twitch_emote_28(self):
        """Test that twitch_emote_28 is not detected."""
        from backend.workers.generation_worker import is_twitch_emote
        assert is_twitch_emote("twitch_emote_28") is False


# =============================================================================
# Test: TWITCH_EMOTE_SIZES Constant
# =============================================================================

class TestTwitchEmoteSizes:
    """Tests for TWITCH_EMOTE_SIZES constant."""
    
    def test_contains_all_required_sizes(self):
        """Test that all Twitch-required sizes are present."""
        from backend.workers.generation_worker import TWITCH_EMOTE_SIZES
        assert 112 in TWITCH_EMOTE_SIZES
        assert 56 in TWITCH_EMOTE_SIZES
        assert 28 in TWITCH_EMOTE_SIZES
    
    def test_sizes_in_descending_order(self):
        """Test that sizes are in descending order (largest first)."""
        from backend.workers.generation_worker import TWITCH_EMOTE_SIZES
        assert TWITCH_EMOTE_SIZES == [112, 56, 28]
    
    def test_exactly_three_sizes(self):
        """Test that exactly 3 sizes are defined."""
        from backend.workers.generation_worker import TWITCH_EMOTE_SIZES
        assert len(TWITCH_EMOTE_SIZES) == 3


# =============================================================================
# Test: process_twitch_emote_sizes Function
# =============================================================================

class TestProcessTwitchEmoteSizes:
    """Tests for process_twitch_emote_sizes function."""
    
    @pytest.fixture
    def mock_generation_service(self):
        """Create mock generation service."""
        mock = MagicMock()
        mock.create_asset = AsyncMock()
        return mock
    
    @pytest.fixture
    def mock_storage_service(self):
        """Create mock storage service."""
        mock = MagicMock()
        mock.upload_asset = AsyncMock()
        return mock
    
    @pytest.fixture
    def mock_rembg(self):
        """Create mock rembg module."""
        mock_rgba = create_rgba_test_image()
        mock_module = MagicMock()
        mock_module.remove = MagicMock(return_value=mock_rgba)
        return mock_module
    
    @pytest.mark.asyncio
    async def test_creates_three_assets(self, mock_generation_service, mock_storage_service, mock_rembg):
        """Test that exactly 3 assets are created."""
        import sys
        
        # Setup mocks
        mock_storage_service.upload_asset.return_value = MagicMock(
            url="https://example.com/emote.png",
            path="user/job/emote.png",
            file_size=1000
        )
        
        mock_generation_service.create_asset.return_value = MagicMock(
            id="asset-123"
        )
        
        # Create test image
        image_data = create_test_image()
        
        # Mock rembg module
        with patch.dict(sys.modules, {'rembg': mock_rembg}):
            from backend.workers.generation_worker import process_twitch_emote_sizes
            
            result = await process_twitch_emote_sizes(
                image_data=image_data,
                user_id="user-123",
                job_id="job-456",
                generation_service=mock_generation_service,
                storage_service=mock_storage_service,
            )
        
        assert len(result) == 3
        assert mock_storage_service.upload_asset.call_count == 3
        assert mock_generation_service.create_asset.call_count == 3
    
    @pytest.mark.asyncio
    async def test_creates_correct_asset_types(self, mock_generation_service, mock_storage_service, mock_rembg):
        """Test that correct asset types are created for each size."""
        import sys
        
        # Setup mocks
        mock_storage_service.upload_asset.return_value = MagicMock(
            url="https://example.com/emote.png",
            path="user/job/emote.png",
            file_size=1000
        )
        
        created_asset_types = []
        
        async def capture_asset_type(**kwargs):
            created_asset_types.append(kwargs.get('asset_type'))
            return MagicMock(id=f"asset-{len(created_asset_types)}")
        
        mock_generation_service.create_asset = capture_asset_type
        
        image_data = create_test_image()
        
        with patch.dict(sys.modules, {'rembg': mock_rembg}):
            from backend.workers.generation_worker import process_twitch_emote_sizes
            
            await process_twitch_emote_sizes(
                image_data=image_data,
                user_id="user-123",
                job_id="job-456",
                generation_service=mock_generation_service,
                storage_service=mock_storage_service,
            )
        
        assert "twitch_emote_112" in created_asset_types
        assert "twitch_emote_56" in created_asset_types
        assert "twitch_emote_28" in created_asset_types
    
    @pytest.mark.asyncio
    async def test_creates_correct_dimensions(self, mock_generation_service, mock_storage_service, mock_rembg):
        """Test that assets have correct dimensions."""
        import sys
        
        # Setup mocks
        mock_storage_service.upload_asset.return_value = MagicMock(
            url="https://example.com/emote.png",
            path="user/job/emote.png",
            file_size=1000
        )
        
        created_dimensions = []
        
        async def capture_dimensions(**kwargs):
            created_dimensions.append((kwargs.get('width'), kwargs.get('height')))
            return MagicMock(id=f"asset-{len(created_dimensions)}")
        
        mock_generation_service.create_asset = capture_dimensions
        
        image_data = create_test_image()
        
        with patch.dict(sys.modules, {'rembg': mock_rembg}):
            from backend.workers.generation_worker import process_twitch_emote_sizes
            
            await process_twitch_emote_sizes(
                image_data=image_data,
                user_id="user-123",
                job_id="job-456",
                generation_service=mock_generation_service,
                storage_service=mock_storage_service,
            )
        
        assert (112, 112) in created_dimensions
        assert (56, 56) in created_dimensions
        assert (28, 28) in created_dimensions
    
    @pytest.mark.asyncio
    async def test_uses_suffix_for_storage(self, mock_generation_service, mock_storage_service, mock_rembg):
        """Test that storage uploads use size suffix."""
        import sys
        
        upload_suffixes = []
        
        async def capture_suffix(**kwargs):
            upload_suffixes.append(kwargs.get('suffix', ''))
            return MagicMock(
                url="https://example.com/emote.png",
                path="user/job/emote.png",
                file_size=1000
            )
        
        mock_storage_service.upload_asset = capture_suffix
        mock_generation_service.create_asset = AsyncMock(return_value=MagicMock(id="asset-123"))
        
        image_data = create_test_image()
        
        with patch.dict(sys.modules, {'rembg': mock_rembg}):
            from backend.workers.generation_worker import process_twitch_emote_sizes
            
            await process_twitch_emote_sizes(
                image_data=image_data,
                user_id="user-123",
                job_id="job-456",
                generation_service=mock_generation_service,
                storage_service=mock_storage_service,
            )
        
        assert "_112x112" in upload_suffixes
        assert "_56x56" in upload_suffixes
        assert "_28x28" in upload_suffixes
    
    @pytest.mark.asyncio
    async def test_returns_largest_first(self, mock_generation_service, mock_storage_service, mock_rembg):
        """Test that the first returned asset is the largest (112x112)."""
        import sys
        
        mock_storage_service.upload_asset.return_value = MagicMock(
            url="https://example.com/emote.png",
            path="user/job/emote.png",
            file_size=1000
        )
        mock_generation_service.create_asset = AsyncMock(return_value=MagicMock(id="asset-123"))
        
        image_data = create_test_image()
        
        with patch.dict(sys.modules, {'rembg': mock_rembg}):
            from backend.workers.generation_worker import process_twitch_emote_sizes
            
            result = await process_twitch_emote_sizes(
                image_data=image_data,
                user_id="user-123",
                job_id="job-456",
                generation_service=mock_generation_service,
                storage_service=mock_storage_service,
            )
        
        # First asset should be 112x112
        assert result[0]["width"] == 112
        assert result[0]["height"] == 112
    
    @pytest.mark.asyncio
    async def test_calls_rembg_once(self, mock_generation_service, mock_storage_service, mock_rembg):
        """Test that background removal is called only once."""
        import sys
        
        mock_storage_service.upload_asset.return_value = MagicMock(
            url="https://example.com/emote.png",
            path="user/job/emote.png",
            file_size=1000
        )
        mock_generation_service.create_asset = AsyncMock(return_value=MagicMock(id="asset-123"))
        
        image_data = create_test_image()
        
        with patch.dict(sys.modules, {'rembg': mock_rembg}):
            from backend.workers.generation_worker import process_twitch_emote_sizes
            
            await process_twitch_emote_sizes(
                image_data=image_data,
                user_id="user-123",
                job_id="job-456",
                generation_service=mock_generation_service,
                storage_service=mock_storage_service,
            )
        
        # rembg should only be called once, then we resize from that
        mock_rembg.remove.assert_called_once()


# =============================================================================
# Test: Storage Service Suffix Parameter
# =============================================================================

class TestStorageServiceSuffix:
    """Tests for storage service suffix parameter."""
    
    def test_build_storage_path_without_suffix(self):
        """Test path building without suffix."""
        from backend.services.storage_service import StorageService
        
        service = StorageService()
        path = service._build_storage_path("user-123", "job-456", "png")
        
        assert path.startswith("user-123/job-456/")
        assert path.endswith(".png")
        assert "_" not in path.split("/")[-1].replace(".png", "")[-10:]  # No suffix before extension
    
    def test_build_storage_path_with_suffix(self):
        """Test path building with suffix."""
        from backend.services.storage_service import StorageService
        
        service = StorageService()
        path = service._build_storage_path("user-123", "job-456", "png", "_112x112")
        
        assert path.startswith("user-123/job-456/")
        assert path.endswith("_112x112.png")
    
    def test_build_storage_path_with_empty_suffix(self):
        """Test path building with empty suffix."""
        from backend.services.storage_service import StorageService
        
        service = StorageService()
        path = service._build_storage_path("user-123", "job-456", "png", "")
        
        assert path.startswith("user-123/job-456/")
        assert path.endswith(".png")


# =============================================================================
# Test: Prompt Template Updates
# =============================================================================

class TestTwitchEmotePrompt:
    """Tests for updated Twitch emote prompt template."""
    
    def test_prompt_contains_scalability_requirements(self):
        """Test that prompt template contains scalability requirements."""
        import yaml
        
        with open("backend/prompts/twitch_emote/v1.0.yaml", "r") as f:
            template = yaml.safe_load(f)
        
        base_prompt = template["base_prompt"]
        
        assert "SCALABILITY" in base_prompt.upper()
        assert "vector" in base_prompt.lower() or "VECTOR" in base_prompt
        assert "28px" in base_prompt or "28 px" in base_prompt
    
    def test_prompt_contains_bold_outlines(self):
        """Test that prompt emphasizes bold outlines."""
        import yaml
        
        with open("backend/prompts/twitch_emote/v1.0.yaml", "r") as f:
            template = yaml.safe_load(f)
        
        base_prompt = template["base_prompt"].lower()
        quality_modifiers = [m.lower() for m in template.get("quality_modifiers", [])]
        
        # Check either in base prompt or quality modifiers
        has_bold_outlines = (
            "bold" in base_prompt and "outline" in base_prompt
        ) or any("bold" in m and "outline" in m for m in quality_modifiers)
        
        assert has_bold_outlines
    
    def test_quality_modifiers_include_vector_style(self):
        """Test that quality modifiers include vector style."""
        import yaml
        
        with open("backend/prompts/twitch_emote/v1.0.yaml", "r") as f:
            template = yaml.safe_load(f)
        
        quality_modifiers = [m.lower() for m in template.get("quality_modifiers", [])]
        
        has_vector = any("vector" in m for m in quality_modifiers)
        assert has_vector


# =============================================================================
# Test: Nano Banana Client Scalability Constraint
# =============================================================================

class TestNanoBananaScalabilityConstraint:
    """Tests for scalability constraint in Nano Banana client."""
    
    def test_strict_constraint_includes_scalability(self):
        """Test that strict content constraint includes scalability guidance."""
        from backend.services.nano_banana_client import NanoBananaClient
        
        constraint = NanoBananaClient.STRICT_CONTENT_CONSTRAINT
        
        assert "SCALABILITY" in constraint.upper()
        assert "emote" in constraint.lower() or "badge" in constraint.lower()
    
    def test_strict_constraint_mentions_28px(self):
        """Test that constraint mentions 28px size requirement."""
        from backend.services.nano_banana_client import NanoBananaClient
        
        constraint = NanoBananaClient.STRICT_CONTENT_CONSTRAINT
        
        assert "28" in constraint
    
    def test_strict_constraint_mentions_vector_style(self):
        """Test that constraint mentions vector style."""
        from backend.services.nano_banana_client import NanoBananaClient
        
        constraint = NanoBananaClient.STRICT_CONTENT_CONSTRAINT.lower()
        
        assert "vector" in constraint


# =============================================================================
# Test: Dimension Directive Updates
# =============================================================================

class TestDimensionDirectives:
    """Tests for updated dimension directives."""
    
    def test_twitch_emote_directive_includes_vector(self):
        """Test that twitch_emote directive includes vector style."""
        from backend.services.twitch.dimensions import ASSET_TYPE_DIRECTIVES
        
        directive = ASSET_TYPE_DIRECTIVES.get("twitch_emote", "").lower()
        
        assert "vector" in directive
    
    def test_twitch_emote_directive_includes_bold_outlines(self):
        """Test that twitch_emote directive includes bold outlines."""
        from backend.services.twitch.dimensions import ASSET_TYPE_DIRECTIVES
        
        directive = ASSET_TYPE_DIRECTIVES.get("twitch_emote", "").lower()
        
        assert "bold" in directive
        assert "outline" in directive
    
    def test_twitch_emote_directive_includes_flat_colors(self):
        """Test that twitch_emote directive includes flat colors."""
        from backend.services.twitch.dimensions import ASSET_TYPE_DIRECTIVES
        
        directive = ASSET_TYPE_DIRECTIVES.get("twitch_emote", "").lower()
        
        assert "flat" in directive


# =============================================================================
# Test: Image Resizing Quality
# =============================================================================

class TestImageResizingQuality:
    """Tests for image resizing quality."""
    
    def test_resize_uses_lanczos(self):
        """Test that resizing uses Lanczos algorithm."""
        from PIL import Image
        
        # Create a test image
        original = Image.new("RGBA", (1024, 1024), color=(255, 0, 0, 255))
        
        # Resize using Lanczos (same as in our code)
        resized = original.resize((112, 112), Image.Resampling.LANCZOS)
        
        assert resized.size == (112, 112)
        assert resized.mode == "RGBA"
    
    def test_resize_preserves_transparency(self):
        """Test that resizing preserves transparency."""
        from PIL import Image
        
        # Create image with partial transparency
        original = Image.new("RGBA", (1024, 1024), color=(255, 0, 0, 128))
        
        resized = original.resize((28, 28), Image.Resampling.LANCZOS)
        
        assert resized.mode == "RGBA"
        # Check that alpha channel exists
        assert resized.split()[3] is not None
    
    def test_all_sizes_are_square(self):
        """Test that all output sizes are square."""
        from backend.workers.generation_worker import TWITCH_EMOTE_SIZES
        from PIL import Image
        
        original = Image.new("RGBA", (1024, 1024), color=(255, 0, 0, 255))
        
        for size in TWITCH_EMOTE_SIZES:
            resized = original.resize((size, size), Image.Resampling.LANCZOS)
            assert resized.size[0] == resized.size[1] == size
