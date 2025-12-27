"""
Unit tests for the Twitch QC Gate.

Tests cover:
- Dimension validation
- File size validation
- File size compression
- OCR gibberish detection
- Format validation
- Region blurring
"""

import pytest
from unittest.mock import patch, MagicMock
from io import BytesIO
from PIL import Image
from backend.services.twitch.qc_gate import QCGate


def create_test_image(width: int = 512, height: int = 512, mode: str = "RGB") -> bytes:
    """Create a test image and return as bytes."""
    image = Image.new(mode, (width, height), color=(255, 0, 0))
    output = BytesIO()
    image.save(output, format="PNG")
    output.seek(0)
    return output.read()


class TestQCGate:
    """Tests for QCGate class."""
    
    @pytest.fixture
    def qc_gate(self):
        """Create QCGate instance."""
        return QCGate()
    
    def test_file_size_limits(self, qc_gate):
        """Test that file size limits are defined correctly."""
        assert qc_gate.FILE_SIZE_LIMITS["twitch_emote"] == 1 * 1024 * 1024
        assert qc_gate.FILE_SIZE_LIMITS["youtube_thumbnail"] == 2 * 1024 * 1024
        assert qc_gate.FILE_SIZE_LIMITS["twitch_panel"] == 2.9 * 1024 * 1024
        assert qc_gate.FILE_SIZE_LIMITS["default"] == 10 * 1024 * 1024
    
    def test_gibberish_patterns(self, qc_gate):
        """Test that gibberish patterns are defined."""
        assert len(qc_gate.GIBBERISH_PATTERNS) > 0
    
    def test_text_check_types(self, qc_gate):
        """Test that text check types are defined."""
        assert "youtube_thumbnail" in qc_gate.TEXT_CHECK_TYPES
        assert "twitch_banner" in qc_gate.TEXT_CHECK_TYPES
        assert "twitch_emote" not in qc_gate.TEXT_CHECK_TYPES


class TestDimensionValidation:
    """Tests for dimension validation."""
    
    @pytest.fixture
    def qc_gate(self):
        return QCGate()
    
    @pytest.mark.asyncio
    async def test_passes_correct_dimensions(self, qc_gate):
        """Test that correct dimensions pass validation."""
        image_data = create_test_image(512, 512)
        
        passed, error, _ = await qc_gate.validate(
            image_data=image_data,
            asset_type="twitch_emote",
            expected_dimensions=(512, 512),
        )
        
        assert passed is True
        assert error is None
    
    @pytest.mark.asyncio
    async def test_fails_incorrect_dimensions(self, qc_gate):
        """Test that incorrect dimensions fail validation."""
        image_data = create_test_image(256, 256)
        
        passed, error, _ = await qc_gate.validate(
            image_data=image_data,
            asset_type="twitch_emote",
            expected_dimensions=(512, 512),
        )
        
        assert passed is False
        assert "Dimension mismatch" in error
    
    @pytest.mark.asyncio
    async def test_auto_detects_dimensions(self, qc_gate):
        """Test that dimensions are auto-detected from asset type."""
        # Create image at correct export size for twitch_emote (512x512)
        image_data = create_test_image(512, 512)
        
        passed, error, _ = await qc_gate.validate(
            image_data=image_data,
            asset_type="twitch_emote",
            expected_dimensions=None,  # Auto-detect
        )
        
        assert passed is True


class TestFileSizeValidation:
    """Tests for file size validation."""
    
    @pytest.fixture
    def qc_gate(self):
        return QCGate()
    
    @pytest.mark.asyncio
    async def test_passes_small_file(self, qc_gate):
        """Test that small files pass validation."""
        image_data = create_test_image(512, 512)
        
        passed, error, _ = await qc_gate.validate(
            image_data=image_data,
            asset_type="twitch_emote",
            expected_dimensions=(512, 512),
        )
        
        assert passed is True
    
    def test_get_file_size_limit(self, qc_gate):
        """Test getting file size limits."""
        assert qc_gate.get_file_size_limit("twitch_emote") == 1 * 1024 * 1024
        assert qc_gate.get_file_size_limit("unknown_type") == 10 * 1024 * 1024


class TestCompression:
    """Tests for _compress method."""
    
    @pytest.fixture
    def qc_gate(self):
        return QCGate()
    
    def test_compresses_jpeg(self, qc_gate):
        """Test JPEG compression."""
        image = Image.new("RGB", (1280, 720), color=(255, 0, 0))
        max_size = 10 * 1024 * 1024  # 10MB
        
        result = qc_gate._compress(image, "youtube_thumbnail", max_size)
        
        # Should produce valid JPEG
        loaded = Image.open(BytesIO(result))
        assert loaded.format == "JPEG"
    
    def test_compresses_png(self, qc_gate):
        """Test PNG compression (optimize only)."""
        image = Image.new("RGBA", (512, 512), color=(255, 0, 0, 255))
        max_size = 10 * 1024 * 1024  # 10MB
        
        result = qc_gate._compress(image, "twitch_emote", max_size)
        
        # Should produce valid PNG
        loaded = Image.open(BytesIO(result))
        assert loaded.format == "PNG"
    
    def test_compresses_webp(self, qc_gate):
        """Test WebP compression."""
        image = Image.new("RGB", (1200, 480), color=(255, 0, 0))
        max_size = 10 * 1024 * 1024  # 10MB
        
        result = qc_gate._compress(image, "twitch_banner", max_size)
        
        # Should produce valid WebP
        loaded = Image.open(BytesIO(result))
        assert loaded.format == "WEBP"


class TestFormatValidation:
    """Tests for format validation."""
    
    @pytest.fixture
    def qc_gate(self):
        return QCGate()
    
    def test_get_expected_format_emote(self, qc_gate):
        """Test expected format for emotes."""
        assert qc_gate._get_expected_format("twitch_emote") == "PNG"
    
    def test_get_expected_format_thumbnail(self, qc_gate):
        """Test expected format for thumbnails."""
        assert qc_gate._get_expected_format("youtube_thumbnail") == "JPEG"
    
    def test_get_expected_format_banner(self, qc_gate):
        """Test expected format for banners."""
        assert qc_gate._get_expected_format("twitch_banner") == "WEBP"
    
    def test_ensure_format_png(self, qc_gate):
        """Test ensuring PNG format."""
        image = Image.new("RGB", (512, 512))
        result = qc_gate._ensure_format(image, "twitch_emote", "PNG")
        
        loaded = Image.open(BytesIO(result))
        assert loaded.format == "PNG"
        assert loaded.mode == "RGBA"
    
    def test_ensure_format_jpeg(self, qc_gate):
        """Test ensuring JPEG format."""
        image = Image.new("RGB", (1280, 720))
        result = qc_gate._ensure_format(image, "youtube_thumbnail", "JPEG")
        
        loaded = Image.open(BytesIO(result))
        assert loaded.format == "JPEG"
        assert loaded.mode == "RGB"
    
    def test_ensure_format_webp(self, qc_gate):
        """Test ensuring WebP format."""
        image = Image.new("RGB", (1200, 480))
        result = qc_gate._ensure_format(image, "twitch_banner", "WEBP")
        
        loaded = Image.open(BytesIO(result))
        assert loaded.format == "WEBP"
    
    def test_converts_rgba_to_rgb_for_jpeg(self, qc_gate):
        """Test RGBA to RGB conversion for JPEG."""
        image = Image.new("RGBA", (1280, 720), color=(255, 0, 0, 128))
        result = qc_gate._ensure_format(image, "youtube_thumbnail", "JPEG")
        
        loaded = Image.open(BytesIO(result))
        assert loaded.mode == "RGB"


class TestGibberishDetection:
    """Tests for gibberish detection."""
    
    @pytest.fixture
    def qc_gate(self):
        return QCGate()
    
    def test_check_gibberish_no_text(self, qc_gate):
        """Test gibberish check on image with no text."""
        image = Image.new("RGB", (512, 512), color=(255, 0, 0))
        
        # Create mock pytesseract module
        mock_pytesseract = MagicMock()
        mock_pytesseract.image_to_string.return_value = ""
        
        with patch.dict('sys.modules', {'pytesseract': mock_pytesseract}):
            has_gibberish, regions = qc_gate._check_gibberish(image)
            
            assert has_gibberish is False
            assert regions == []
    
    def test_check_gibberish_normal_text(self, qc_gate):
        """Test gibberish check on image with normal text."""
        image = Image.new("RGB", (512, 512), color=(255, 0, 0))
        
        # Create mock pytesseract module
        mock_pytesseract = MagicMock()
        mock_pytesseract.image_to_string.return_value = "Hello World"
        
        with patch.dict('sys.modules', {'pytesseract': mock_pytesseract}):
            has_gibberish, regions = qc_gate._check_gibberish(image)
            
            assert has_gibberish is False
    
    def test_check_gibberish_repeated_chars(self, qc_gate):
        """Test gibberish detection for repeated characters."""
        image = Image.new("RGB", (512, 512), color=(255, 0, 0))
        
        # Mock pytesseract to return gibberish
        mock_data = {
            'text': ['aaaaaa'],
            'left': [10],
            'top': [10],
            'width': [100],
            'height': [50],
        }
        
        # Create mock pytesseract module
        mock_pytesseract = MagicMock()
        mock_pytesseract.image_to_string.return_value = "aaaaaa"
        mock_pytesseract.image_to_data.return_value = mock_data
        mock_pytesseract.Output.DICT = 'dict'
        
        with patch.dict('sys.modules', {'pytesseract': mock_pytesseract}):
            has_gibberish, regions = qc_gate._check_gibberish(image)
            
            assert has_gibberish is True
    
    def test_check_gibberish_consonant_cluster(self, qc_gate):
        """Test gibberish detection for consonant clusters."""
        image = Image.new("RGB", (512, 512), color=(255, 0, 0))
        
        # Create mock pytesseract module
        mock_pytesseract = MagicMock()
        mock_pytesseract.image_to_string.return_value = "bcdfgh"
        
        with patch.dict('sys.modules', {'pytesseract': mock_pytesseract}):
            has_gibberish, _ = qc_gate._check_gibberish(image)
            
            assert has_gibberish is True
    
    def test_check_gibberish_handles_import_error(self, qc_gate):
        """Test graceful handling when pytesseract not installed."""
        image = Image.new("RGB", (512, 512), color=(255, 0, 0))
        
        with patch.dict('sys.modules', {'pytesseract': None}):
            with patch('builtins.__import__', side_effect=ImportError):
                has_gibberish, regions = qc_gate._check_gibberish(image)
                
                assert has_gibberish is False
                assert regions == []


class TestBlurRegions:
    """Tests for _blur_regions method."""
    
    @pytest.fixture
    def qc_gate(self):
        return QCGate()
    
    def test_blurs_single_region(self, qc_gate):
        """Test blurring a single region."""
        image = Image.new("RGB", (512, 512), color=(255, 0, 0))
        regions = [(100, 100, 200, 200)]
        
        result = qc_gate._blur_regions(image, regions)
        
        # Result should be different from input
        assert result is not image
        assert result.size == image.size
    
    def test_blurs_multiple_regions(self, qc_gate):
        """Test blurring multiple regions."""
        image = Image.new("RGB", (512, 512), color=(255, 0, 0))
        regions = [(50, 50, 100, 100), (200, 200, 300, 300)]
        
        result = qc_gate._blur_regions(image, regions)
        
        assert result.size == image.size
    
    def test_handles_empty_regions(self, qc_gate):
        """Test handling empty regions list."""
        image = Image.new("RGB", (512, 512), color=(255, 0, 0))
        regions = []
        
        result = qc_gate._blur_regions(image, regions)
        
        assert result.size == image.size
    
    def test_handles_out_of_bounds_regions(self, qc_gate):
        """Test handling regions outside image bounds."""
        image = Image.new("RGB", (512, 512), color=(255, 0, 0))
        regions = [(-10, -10, 600, 600)]  # Extends beyond image
        
        result = qc_gate._blur_regions(image, regions)
        
        assert result.size == image.size
    
    def test_handles_invalid_regions(self, qc_gate):
        """Test handling invalid regions (x2 <= x1)."""
        image = Image.new("RGB", (512, 512), color=(255, 0, 0))
        regions = [(200, 200, 100, 100)]  # Invalid: x2 < x1
        
        result = qc_gate._blur_regions(image, regions)
        
        assert result.size == image.size


class TestFullValidation:
    """Tests for the full validate method."""
    
    @pytest.fixture
    def qc_gate(self):
        return QCGate()
    
    @pytest.mark.asyncio
    async def test_validate_emote_success(self, qc_gate):
        """Test successful emote validation."""
        image_data = create_test_image(512, 512, "RGBA")
        
        passed, error, result_data = await qc_gate.validate(
            image_data=image_data,
            asset_type="twitch_emote",
            expected_dimensions=(512, 512),
        )
        
        assert passed is True
        assert error is None
        
        # Verify output is valid PNG
        loaded = Image.open(BytesIO(result_data))
        assert loaded.format == "PNG"
    
    @pytest.mark.asyncio
    async def test_validate_thumbnail_success(self, qc_gate):
        """Test successful thumbnail validation."""
        image_data = create_test_image(1280, 720)
        
        passed, error, result_data = await qc_gate.validate(
            image_data=image_data,
            asset_type="youtube_thumbnail",
            expected_dimensions=(1280, 720),
        )
        
        assert passed is True
        assert error is None
        
        # Verify output is valid JPEG
        loaded = Image.open(BytesIO(result_data))
        assert loaded.format == "JPEG"
    
    @pytest.mark.asyncio
    async def test_validate_unknown_asset_type(self, qc_gate):
        """Test validation of unknown asset type."""
        image_data = create_test_image(512, 512)
        
        passed, error, result_data = await qc_gate.validate(
            image_data=image_data,
            asset_type="unknown_type",
            expected_dimensions=None,
        )
        
        # Should pass with auto-detected dimensions
        assert passed is True
