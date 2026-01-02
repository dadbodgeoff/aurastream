"""
Unit tests for MediaAssetCompositor.

Tests the compositing logic without making actual HTTP requests.
"""

import io
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from PIL import Image

from backend.services.creator_media.compositor import (
    MediaAssetCompositor,
    PlacementSpec,
    get_media_compositor,
)


def create_test_image(width: int, height: int, color: tuple = (255, 0, 0, 255)) -> bytes:
    """Create a test image with the specified dimensions and color."""
    img = Image.new('RGBA', (width, height), color)
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer.read()


class TestPlacementParsing:
    """Tests for placement dictionary parsing."""
    
    def test_parse_camel_case_keys(self):
        """Should handle camelCase keys from frontend."""
        compositor = MediaAssetCompositor()
        placement = {
            'assetId': 'test-id',
            'displayName': 'Test Asset',
            'assetType': 'face',
            'url': 'https://example.com/image.png',
            'x': 50,
            'y': 50,
            'width': 20,
            'height': 20,
            'sizeUnit': 'percent',
            'zIndex': 2,
            'rotation': 45,
            'opacity': 80,
        }
        
        spec = compositor._parse_placement(placement, 1280, 720)
        
        assert spec.asset_id == 'test-id'
        assert spec.display_name == 'Test Asset'
        assert spec.asset_type == 'face'
        assert spec.x == 50
        assert spec.y == 50
        assert spec.width == 20
        assert spec.height == 20
        assert spec.z_index == 2
        assert spec.rotation == 45
        assert spec.opacity == 80
    
    def test_parse_snake_case_keys(self):
        """Should handle snake_case keys from Pydantic."""
        compositor = MediaAssetCompositor()
        placement = {
            'asset_id': 'test-id',
            'display_name': 'Test Asset',
            'asset_type': 'logo',
            'url': 'https://example.com/image.png',
            'x': 10,
            'y': 90,
            'width': 15,
            'height': 15,
            'size_unit': 'percent',
            'z_index': 1,
            'rotation': 0,
            'opacity': 100,
        }
        
        spec = compositor._parse_placement(placement, 1280, 720)
        
        assert spec.asset_id == 'test-id'
        assert spec.display_name == 'Test Asset'
        assert spec.asset_type == 'logo'
        assert spec.x == 10
        assert spec.y == 90
    
    def test_convert_pixel_to_percent(self):
        """Should convert pixel dimensions to percentages."""
        compositor = MediaAssetCompositor()
        placement = {
            'asset_id': 'test-id',
            'url': 'https://example.com/image.png',
            'x': 50,
            'y': 50,
            'width': 256,  # pixels
            'height': 144,  # pixels
            'size_unit': 'px',
        }
        
        spec = compositor._parse_placement(placement, 1280, 720)
        
        # 256/1280 = 20%, 144/720 = 20%
        assert spec.width == 20.0
        assert spec.height == 20.0
    
    def test_clamp_values_to_valid_range(self):
        """Should clamp out-of-range values."""
        compositor = MediaAssetCompositor()
        placement = {
            'asset_id': 'test-id',
            'url': 'https://example.com/image.png',
            'x': 150,  # > 100
            'y': -10,  # < 0
            'width': 200,  # > 100
            'height': 0.5,  # < MIN_SIZE_PERCENT
            'opacity': 150,  # > 100
            'rotation': 400,  # > 360
        }
        
        spec = compositor._parse_placement(placement, 1280, 720)
        
        assert spec.x == 100
        assert spec.y == 0
        assert spec.width == 100
        assert spec.height == 1.0  # MIN_SIZE_PERCENT
        assert spec.opacity == 100
        assert spec.rotation == 40  # 400 % 360


class TestPositionCalculation:
    """Tests for pixel position calculation."""
    
    def test_center_position(self):
        """Should calculate center position correctly."""
        compositor = MediaAssetCompositor()
        spec = PlacementSpec(
            asset_id='test',
            url='',
            display_name='Test',
            asset_type='face',
            x=50,  # center
            y=50,  # center
            width=20,
            height=20,
            z_index=1,
            rotation=0,
            opacity=100,
        )
        
        # Canvas: 1280x720, Asset: 256x144 (20% of canvas)
        x, y = compositor._calculate_pixel_position(spec, 1280, 720, 256, 144)
        
        # Center point: (640, 360), offset by half asset size
        assert x == 640 - 128  # 512
        assert y == 360 - 72   # 288
    
    def test_top_left_position(self):
        """Should calculate top-left position correctly."""
        compositor = MediaAssetCompositor()
        spec = PlacementSpec(
            asset_id='test',
            url='',
            display_name='Test',
            asset_type='logo',
            x=10,
            y=10,
            width=10,
            height=10,
            z_index=1,
            rotation=0,
            opacity=100,
        )
        
        # Canvas: 1280x720, Asset: 128x72 (10% of canvas)
        x, y = compositor._calculate_pixel_position(spec, 1280, 720, 128, 72)
        
        # Center point: (128, 72), offset by half asset size
        assert x == 128 - 64  # 64
        assert y == 72 - 36   # 36
    
    def test_bottom_right_position(self):
        """Should calculate bottom-right position correctly."""
        compositor = MediaAssetCompositor()
        spec = PlacementSpec(
            asset_id='test',
            url='',
            display_name='Test',
            asset_type='face',
            x=90,
            y=90,
            width=10,
            height=10,
            z_index=1,
            rotation=0,
            opacity=100,
        )
        
        # Canvas: 1280x720, Asset: 128x72
        x, y = compositor._calculate_pixel_position(spec, 1280, 720, 128, 72)
        
        # Center point: (1152, 648), offset by half asset size
        assert x == 1152 - 64  # 1088
        assert y == 648 - 36   # 612


class TestScaling:
    """Tests for asset scaling."""
    
    def test_scale_to_percentage(self):
        """Should scale asset to percentage of canvas."""
        compositor = MediaAssetCompositor()
        spec = PlacementSpec(
            asset_id='test',
            url='',
            display_name='Test',
            asset_type='face',
            x=50,
            y=50,
            width=25,  # 25% of canvas width
            height=25,  # 25% of canvas height
            z_index=1,
            rotation=0,
            opacity=100,
        )
        
        # Create a 100x100 test image
        original = Image.new('RGBA', (100, 100), (255, 0, 0, 255))
        
        # Scale to 25% of 1280x720 canvas
        scaled = compositor._scale_asset(original, spec, 1280, 720)
        
        assert scaled.width == 320  # 25% of 1280
        assert scaled.height == 180  # 25% of 720


class TestOpacity:
    """Tests for opacity application."""
    
    def test_full_opacity(self):
        """Should not modify image at full opacity."""
        compositor = MediaAssetCompositor()
        original = Image.new('RGBA', (100, 100), (255, 0, 0, 255))
        
        result = compositor._apply_opacity(original, 100)
        
        # Should return same image (or equivalent)
        assert result.getpixel((50, 50))[3] == 255
    
    def test_half_opacity(self):
        """Should reduce alpha by half at 50% opacity."""
        compositor = MediaAssetCompositor()
        original = Image.new('RGBA', (100, 100), (255, 0, 0, 255))
        
        result = compositor._apply_opacity(original, 50)
        
        # Alpha should be ~127 (255 * 0.5)
        assert result.getpixel((50, 50))[3] == 127
    
    def test_zero_opacity(self):
        """Should make image fully transparent at 0% opacity."""
        compositor = MediaAssetCompositor()
        original = Image.new('RGBA', (100, 100), (255, 0, 0, 255))
        
        result = compositor._apply_opacity(original, 0)
        
        assert result.getpixel((50, 50))[3] == 0


class TestRotation:
    """Tests for rotation application."""
    
    def test_no_rotation(self):
        """Should not modify image with 0 rotation."""
        compositor = MediaAssetCompositor()
        original = Image.new('RGBA', (100, 100), (255, 0, 0, 255))
        
        result = compositor._apply_rotation(original, 0)
        
        assert result.size == (100, 100)
    
    def test_90_degree_rotation(self):
        """Should rotate image 90 degrees."""
        compositor = MediaAssetCompositor()
        # Create a non-square image to verify rotation
        original = Image.new('RGBA', (200, 100), (255, 0, 0, 255))
        
        result = compositor._apply_rotation(original, 90)
        
        # After 90 degree rotation with expand, dimensions swap
        assert result.width == 100
        assert result.height == 200


class TestCompositing:
    """Tests for full compositing workflow."""
    
    @pytest.mark.asyncio
    async def test_composite_single_asset(self):
        """Should composite a single asset onto base image."""
        compositor = MediaAssetCompositor()
        
        # Create test images
        base_image = create_test_image(1280, 720, (0, 0, 255, 255))  # Blue
        asset_image = create_test_image(100, 100, (255, 0, 0, 255))  # Red
        
        placements = [{
            'asset_id': 'test-1',
            'display_name': 'Test Asset',
            'asset_type': 'face',
            'url': 'https://example.com/asset.png',
            'x': 50,
            'y': 50,
            'width': 10,
            'height': 10,
            'size_unit': 'percent',
            'z_index': 1,
            'rotation': 0,
            'opacity': 100,
        }]
        
        # Mock the fetch to return our test asset
        with patch.object(compositor, '_fetch_asset', new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = asset_image
            
            result = await compositor.composite(
                base_image=base_image,
                placements=placements,
                canvas_width=1280,
                canvas_height=720,
            )
        
        assert result.assets_composited == 1
        assert len(result.errors) == 0
        assert len(result.image_data) > 0
        
        # Verify the result is a valid image
        result_img = Image.open(io.BytesIO(result.image_data))
        assert result_img.size == (1280, 720)
    
    @pytest.mark.asyncio
    async def test_composite_multiple_assets_z_order(self):
        """Should composite multiple assets in z-index order."""
        compositor = MediaAssetCompositor()
        
        base_image = create_test_image(1280, 720, (0, 0, 255, 255))
        asset1 = create_test_image(100, 100, (255, 0, 0, 255))  # Red
        asset2 = create_test_image(100, 100, (0, 255, 0, 255))  # Green
        
        placements = [
            {
                'asset_id': 'test-1',
                'display_name': 'Bottom Asset',
                'asset_type': 'face',
                'url': 'https://example.com/asset1.png',
                'x': 50,
                'y': 50,
                'width': 20,
                'height': 20,
                'z_index': 1,  # Behind
            },
            {
                'asset_id': 'test-2',
                'display_name': 'Top Asset',
                'asset_type': 'logo',
                'url': 'https://example.com/asset2.png',
                'x': 50,
                'y': 50,
                'width': 10,
                'height': 10,
                'z_index': 2,  # In front
            },
        ]
        
        # Mock fetch to return different assets
        async def mock_fetch(url):
            if 'asset1' in url:
                return asset1
            return asset2
        
        with patch.object(compositor, '_fetch_asset', side_effect=mock_fetch):
            result = await compositor.composite(
                base_image=base_image,
                placements=placements,
                canvas_width=1280,
                canvas_height=720,
            )
        
        assert result.assets_composited == 2
        assert len(result.errors) == 0
    
    @pytest.mark.asyncio
    async def test_composite_handles_fetch_failure(self):
        """Should continue compositing if one asset fails to fetch."""
        compositor = MediaAssetCompositor()
        
        base_image = create_test_image(1280, 720, (0, 0, 255, 255))
        asset = create_test_image(100, 100, (255, 0, 0, 255))
        
        placements = [
            {
                'asset_id': 'test-1',
                'display_name': 'Failed Asset',
                'url': 'https://example.com/missing.png',
                'x': 25,
                'y': 25,
                'width': 10,
                'height': 10,
                'z_index': 1,
            },
            {
                'asset_id': 'test-2',
                'display_name': 'Success Asset',
                'url': 'https://example.com/exists.png',
                'x': 75,
                'y': 75,
                'width': 10,
                'height': 10,
                'z_index': 2,
            },
        ]
        
        async def mock_fetch(url):
            if 'missing' in url:
                return None  # Simulate fetch failure
            return asset
        
        with patch.object(compositor, '_fetch_asset', side_effect=mock_fetch):
            result = await compositor.composite(
                base_image=base_image,
                placements=placements,
                canvas_width=1280,
                canvas_height=720,
            )
        
        assert result.assets_composited == 1
        assert len(result.errors) == 1
        assert 'Failed Asset' in result.errors[0]
    
    @pytest.mark.asyncio
    async def test_composite_empty_placements(self):
        """Should return original image with empty placements."""
        compositor = MediaAssetCompositor()
        
        base_image = create_test_image(1280, 720, (0, 0, 255, 255))
        
        result = await compositor.composite(
            base_image=base_image,
            placements=[],
            canvas_width=1280,
            canvas_height=720,
        )
        
        assert result.assets_composited == 0
        assert result.image_data == base_image


class TestSingleton:
    """Tests for singleton pattern."""
    
    def test_get_media_compositor_returns_same_instance(self):
        """Should return the same compositor instance."""
        compositor1 = get_media_compositor()
        compositor2 = get_media_compositor()
        
        assert compositor1 is compositor2
