"""
Unit tests for Creator Media Library Service.

Tests the business logic for media library operations without external dependencies.
"""

import pytest
import base64
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone

from backend.services.creator_media.constants import (
    MEDIA_ASSET_TYPES,
    ASSET_LIMITS_PRO,
    ASSET_LIMITS_STUDIO,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
    TOTAL_ASSET_LIMIT,
    MAX_PROMPT_INJECTION_ASSETS,
    ALLOWED_TIERS,
    get_asset_limits,
    can_access_media_library,
)
from backend.services.creator_media.models import (
    MediaAssetModel,
    MediaSummaryModel,
    MediaForPromptModel,
    UploadResult,
    ListQuery,
)
from backend.services.creator_media.storage import MediaStorageService
from backend.services.creator_media.repository import MediaRepository
from backend.services.creator_media.prompt_injector import PromptInjector
from backend.services.creator_media.service import (
    CreatorMediaService,
    get_creator_media_service,
)


# =============================================================================
# Test Data Fixtures
# =============================================================================

@pytest.fixture
def valid_png_base64():
    """Create a minimal valid base64 PNG image (1x1 transparent)."""
    return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="


@pytest.fixture
def valid_png_bytes():
    """Create valid PNG bytes."""
    return base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )


@pytest.fixture
def mock_asset_model():
    """Create a mock MediaAssetModel."""
    return MediaAssetModel(
        id="asset-123",
        user_id="user-123",
        asset_type="face",
        display_name="My Face",
        url="https://storage.example.com/face.png",
        storage_path="user-123/face/asset-123.png",
        description="Test face asset",
        tags=["happy", "front"],
        is_favorite=True,
        is_primary=True,
        metadata={"expression": "happy", "angle": "front"},
        usage_count=5,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def mock_upload_result():
    """Create a mock UploadResult."""
    return UploadResult(
        storage_path="user-123/face/asset-123.png",
        url="https://storage.example.com/face.png",
        file_size=1024,
        mime_type="image/png",
    )


# =============================================================================
# Constants Tests
# =============================================================================

class TestConstants:
    """Tests for constants module."""

    def test_media_asset_types_complete(self):
        """Should have all expected asset types."""
        expected = [
            "logo", "face", "character", "game_skin", "object", "background",
            "reference", "overlay", "emote", "badge", "panel", "alert",
            "facecam_frame", "stinger"
        ]
        assert MEDIA_ASSET_TYPES == expected

    def test_allowed_tiers(self):
        """Only pro and studio should have access."""
        assert ALLOWED_TIERS == ["pro", "studio"]

    def test_total_asset_limit(self):
        """Total asset limit should be 25."""
        assert TOTAL_ASSET_LIMIT == 25

    def test_max_prompt_injection_assets(self):
        """Max assets per prompt should be 2."""
        assert MAX_PROMPT_INJECTION_ASSETS == 2

    def test_can_access_media_library_free(self):
        """Free tier should not have access."""
        assert can_access_media_library("free") is False

    def test_can_access_media_library_pro(self):
        """Pro tier should have access."""
        assert can_access_media_library("pro") is True

    def test_can_access_media_library_studio(self):
        """Studio tier should have access."""
        assert can_access_media_library("studio") is True

    def test_asset_limits_pro_tier(self):
        """Pro tier should have per-type limits."""
        assert ASSET_LIMITS_PRO["logo"] == 5
        assert ASSET_LIMITS_PRO["face"] == 5
        for asset_type in MEDIA_ASSET_TYPES:
            assert ASSET_LIMITS_PRO[asset_type] >= 5

    def test_asset_limits_studio_tier(self):
        """Studio tier should have same limits as pro."""
        assert ASSET_LIMITS_STUDIO == ASSET_LIMITS_PRO

    def test_get_asset_limits_free(self):
        """get_asset_limits should return zero limits for free tier."""
        limits = get_asset_limits("free")
        for asset_type in MEDIA_ASSET_TYPES:
            assert limits[asset_type] == 0

    def test_get_asset_limits_pro(self):
        """get_asset_limits should return pro limits for pro tier."""
        limits = get_asset_limits("pro")
        assert limits == ASSET_LIMITS_PRO

    def test_get_asset_limits_studio(self):
        """get_asset_limits should return studio limits for studio tier."""
        limits = get_asset_limits("studio")
        assert limits == ASSET_LIMITS_STUDIO

    def test_get_asset_limits_unknown_defaults_to_zero(self):
        """get_asset_limits should default to zero for unknown tier."""
        limits = get_asset_limits("unknown")
        for asset_type in MEDIA_ASSET_TYPES:
            assert limits[asset_type] == 0

    def test_allowed_mime_types(self):
        """Should allow common image types."""
        assert "image/png" in ALLOWED_MIME_TYPES
        assert "image/jpeg" in ALLOWED_MIME_TYPES
        assert "image/webp" in ALLOWED_MIME_TYPES
        assert "image/gif" in ALLOWED_MIME_TYPES
        assert "image/svg+xml" in ALLOWED_MIME_TYPES

    def test_max_file_size(self):
        """Max file size should be 10MB."""
        assert MAX_FILE_SIZE == 10 * 1024 * 1024


# =============================================================================
# Models Tests
# =============================================================================

class TestMediaAssetModel:
    """Tests for MediaAssetModel."""

    def test_from_db_row(self):
        """Should create model from database row."""
        row = {
            "id": "asset-123",
            "user_id": "user-123",
            "asset_type": "face",
            "display_name": "My Face",
            "url": "https://example.com/face.png",
            "storage_path": "user-123/face/asset-123.png",
            "description": "Test",
            "tags": ["happy"],
            "is_favorite": True,
            "is_primary": False,
            "metadata": {"expression": "happy"},
            "usage_count": 5,
            "created_at": "2026-01-01T12:00:00Z",
            "updated_at": "2026-01-01T12:00:00Z",
        }
        
        model = MediaAssetModel.from_db_row(row)
        
        assert model.id == "asset-123"
        assert model.asset_type == "face"
        assert model.tags == ["happy"]
        assert model.metadata == {"expression": "happy"}

    def test_to_dict(self, mock_asset_model):
        """Should convert model to dictionary."""
        result = mock_asset_model.to_dict()
        
        assert result["id"] == "asset-123"
        assert result["asset_type"] == "face"
        assert result["is_favorite"] is True


class TestMediaForPromptModel:
    """Tests for MediaForPromptModel."""

    def test_from_asset(self, mock_asset_model):
        """Should create prompt model from asset model."""
        prompt_model = MediaForPromptModel.from_asset(mock_asset_model)
        
        assert prompt_model.id == mock_asset_model.id
        assert prompt_model.asset_type == mock_asset_model.asset_type
        assert prompt_model.url == mock_asset_model.url
        assert prompt_model.metadata == mock_asset_model.metadata


# =============================================================================
# Storage Service Tests
# =============================================================================

class TestMediaStorageService:
    """Tests for MediaStorageService."""

    @pytest.fixture
    def storage_service(self):
        """Create storage service with mocked Supabase."""
        service = MediaStorageService()
        service._supabase = MagicMock()
        return service

    def test_detect_mime_type_png(self, storage_service, valid_png_bytes):
        """Should detect PNG MIME type."""
        mime_type = storage_service.detect_mime_type(valid_png_bytes)
        assert mime_type == "image/png"

    def test_detect_mime_type_jpeg(self, storage_service):
        """Should detect JPEG MIME type."""
        jpeg_bytes = b'\xff\xd8\xff\xe0' + b'\x00' * 100
        mime_type = storage_service.detect_mime_type(jpeg_bytes)
        assert mime_type == "image/jpeg"

    def test_detect_mime_type_webp(self, storage_service):
        """Should detect WebP MIME type."""
        webp_bytes = b'RIFF' + b'\x00' * 4 + b'WEBP' + b'\x00' * 100
        mime_type = storage_service.detect_mime_type(webp_bytes)
        assert mime_type == "image/webp"

    def test_detect_mime_type_gif(self, storage_service):
        """Should detect GIF MIME type."""
        gif_bytes = b'GIF89a' + b'\x00' * 100
        mime_type = storage_service.detect_mime_type(gif_bytes)
        assert mime_type == "image/gif"

    def test_validate_file_success(self, storage_service, valid_png_bytes):
        """Should validate valid file."""
        mime_type = storage_service.validate_file(valid_png_bytes)
        assert mime_type == "image/png"

    def test_validate_file_too_large(self, storage_service):
        """Should reject file that's too large."""
        large_data = b'\x89PNG\r\n\x1a\n' + b'\x00' * (MAX_FILE_SIZE + 1)
        
        with pytest.raises(ValueError, match="File too large"):
            storage_service.validate_file(large_data)

    @pytest.mark.asyncio
    async def test_upload_success(self, storage_service, valid_png_bytes):
        """Should upload file successfully."""
        storage_service.db.storage.from_.return_value.upload.return_value = {}
        storage_service.db.storage.from_.return_value.get_public_url.return_value = "https://example.com/file.png"
        
        result = await storage_service.upload(
            user_id="user-123",
            asset_type="face",
            asset_id="asset-123",
            data=valid_png_bytes,
            mime_type="image/png",
        )
        
        assert result.storage_path == "user-123/face/asset-123.png"
        assert result.url == "https://example.com/file.png"
        assert result.mime_type == "image/png"

    @pytest.mark.asyncio
    async def test_delete_success(self, storage_service):
        """Should delete file successfully."""
        storage_service.db.storage.from_.return_value.remove.return_value = {}
        
        result = await storage_service.delete("user-123/face/asset-123.png")
        
        assert result is True


# =============================================================================
# Repository Tests
# =============================================================================

class TestMediaRepository:
    """Tests for MediaRepository."""

    @pytest.fixture
    def repository(self):
        """Create repository with mocked Supabase."""
        repo = MediaRepository()
        repo._supabase = MagicMock()
        return repo

    @pytest.mark.asyncio
    async def test_insert_success(self, repository):
        """Should insert record successfully."""
        mock_result = MagicMock()
        mock_result.data = [{
            "id": "asset-123",
            "user_id": "user-123",
            "asset_type": "face",
            "display_name": "Test",
            "url": "https://example.com/face.png",
            "storage_path": "user-123/face/asset-123.png",
            "tags": [],
            "metadata": {},
        }]
        repository.db.table.return_value.insert.return_value.execute.return_value = mock_result
        
        result = await repository.insert({
            "id": "asset-123",
            "user_id": "user-123",
            "asset_type": "face",
            "display_name": "Test",
            "url": "https://example.com/face.png",
            "storage_path": "user-123/face/asset-123.png",
        })
        
        assert result.id == "asset-123"

    @pytest.mark.asyncio
    async def test_get_by_id_found(self, repository):
        """Should return asset when found."""
        mock_result = MagicMock()
        mock_result.data = [{
            "id": "asset-123",
            "user_id": "user-123",
            "asset_type": "face",
            "display_name": "Test",
            "url": "https://example.com/face.png",
            "storage_path": "path",
            "tags": [],
            "metadata": {},
        }]
        repository.db.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
        
        result = await repository.get_by_id("user-123", "asset-123")
        
        assert result is not None
        assert result.id == "asset-123"

    @pytest.mark.asyncio
    async def test_get_by_id_not_found(self, repository):
        """Should return None when not found."""
        mock_result = MagicMock()
        mock_result.data = []
        repository.db.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
        
        result = await repository.get_by_id("user-123", "nonexistent")
        
        assert result is None

    @pytest.mark.asyncio
    async def test_count_by_type(self, repository):
        """Should count assets by type."""
        mock_result = MagicMock()
        mock_result.count = 5
        repository.db.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
        
        result = await repository.count_by_type("user-123", "face")
        
        assert result == 5


# =============================================================================
# Prompt Injector Tests
# =============================================================================

class TestPromptInjector:
    """Tests for PromptInjector."""

    @pytest.fixture
    def injector(self):
        """Create prompt injector."""
        return PromptInjector()

    def test_format_face_asset(self, injector):
        """Should format face asset with metadata."""
        asset = MediaForPromptModel(
            id="asset-123",
            asset_type="face",
            display_name="My Face",
            url="https://example.com/face.png",
            metadata={"expression": "happy", "angle": "front"},
        )
        
        result = injector.format_asset(asset)
        
        assert "[FACE] My Face" in result
        assert "Expression: happy" in result
        assert "Angle: front" in result

    def test_format_character_asset(self, injector):
        """Should format character asset with metadata."""
        asset = MediaForPromptModel(
            id="asset-123",
            asset_type="character",
            display_name="My Avatar",
            url="https://example.com/char.png",
            metadata={"style": "anime", "outfit": "casual"},
        )
        
        result = injector.format_asset(asset)
        
        assert "[CHARACTER] My Avatar" in result
        assert "Style: anime" in result
        assert "Outfit: casual" in result

    def test_format_game_skin_asset(self, injector):
        """Should format game skin asset with metadata."""
        asset = MediaForPromptModel(
            id="asset-123",
            asset_type="game_skin",
            display_name="Fortnite Skin",
            url="https://example.com/skin.png",
            metadata={"game": "fortnite", "character_name": "Jonesy"},
        )
        
        result = injector.format_asset(asset)
        
        assert "[GAME_SKIN] Fortnite Skin" in result
        assert "Game: fortnite" in result
        assert "Character: Jonesy" in result

    def test_build_prompt_section(self, injector):
        """Should build complete prompt section."""
        assets = [
            MediaForPromptModel(
                id="1", asset_type="face", display_name="Face",
                url="https://example.com/face.png", metadata={}
            ),
            MediaForPromptModel(
                id="2", asset_type="logo", display_name="Logo",
                url="https://example.com/logo.png", metadata={}
            ),
        ]
        
        result = injector.build_prompt_section(assets, "My Assets")
        
        assert "## My Assets" in result
        assert "[FACE] Face" in result
        assert "[LOGO] Logo" in result
        assert "https://example.com/face.png" in result

    def test_build_injection_context(self, injector):
        """Should build structured injection context."""
        face = MediaForPromptModel(
            id="1", asset_type="face", display_name="Face",
            url="https://example.com/face.png", metadata={}
        )
        logo = MediaForPromptModel(
            id="2", asset_type="logo", display_name="Logo",
            url="https://example.com/logo.png", metadata={}
        )
        
        result = injector.build_injection_context(face=face, logo=logo)
        
        assert result["has_injections"] is True
        assert len(result["assets"]) == 2
        assert len(result["prompt_additions"]) == 2


# =============================================================================
# Main Service Tests
# =============================================================================

class TestCreatorMediaService:
    """Tests for CreatorMediaService."""

    @pytest.fixture
    def mock_storage(self, mock_upload_result):
        """Create mock storage service."""
        storage = MagicMock(spec=MediaStorageService)
        storage.validate_file.return_value = "image/png"
        storage.upload = AsyncMock(return_value=mock_upload_result)
        storage.delete = AsyncMock(return_value=True)
        return storage

    @pytest.fixture
    def mock_repository(self, mock_asset_model):
        """Create mock repository."""
        repo = MagicMock(spec=MediaRepository)
        repo.count_by_type = AsyncMock(return_value=0)
        repo.count_total = AsyncMock(return_value=0)  # Under the 25 limit
        repo.insert = AsyncMock(return_value=mock_asset_model)
        repo.get_by_id = AsyncMock(return_value=mock_asset_model)
        repo.update = AsyncMock(return_value=mock_asset_model)
        repo.delete = AsyncMock(return_value=True)
        repo.unset_primary = AsyncMock()
        repo.list = AsyncMock(return_value=([mock_asset_model], 1))
        repo.get_primary = AsyncMock(return_value=mock_asset_model)
        repo.get_summary = AsyncMock(return_value=([], 0, 0))
        repo.get_by_ids = AsyncMock(return_value=[mock_asset_model])
        repo.increment_usage = AsyncMock()
        return repo

    @pytest.fixture
    def service(self, mock_storage, mock_repository):
        """Create service with mocked dependencies."""
        return CreatorMediaService(
            storage=mock_storage,
            repository=mock_repository,
        )

    @pytest.mark.asyncio
    async def test_upload_success(self, service, valid_png_base64):
        """Should upload asset successfully for pro tier."""
        result = await service.upload(
            user_id="user-123",
            asset_type="face",
            display_name="My Face",
            image_base64=valid_png_base64,
            user_tier="pro",  # Pro tier has access
        )
        
        assert result.id == "asset-123"
        assert result.asset_type == "face"

    @pytest.mark.asyncio
    async def test_upload_free_tier_denied(self, service, valid_png_base64):
        """Should reject free tier users."""
        with pytest.raises(PermissionError, match="Pro and Studio"):
            await service.upload(
                user_id="user-123",
                asset_type="face",
                display_name="Test",
                image_base64=valid_png_base64,
                user_tier="free",
            )

    @pytest.mark.asyncio
    async def test_upload_invalid_asset_type(self, service, valid_png_base64):
        """Should reject invalid asset type."""
        with pytest.raises(ValueError, match="Invalid asset type"):
            await service.upload(
                user_id="user-123",
                asset_type="invalid_type",
                display_name="Test",
                image_base64=valid_png_base64,
                user_tier="pro",
            )

    @pytest.mark.asyncio
    async def test_upload_total_limit_exceeded(self, service, mock_repository, valid_png_base64):
        """Should reject when total limit (25) exceeded."""
        mock_repository.count_total = AsyncMock(return_value=25)
        
        with pytest.raises(ValueError, match="Total asset limit reached"):
            await service.upload(
                user_id="user-123",
                asset_type="face",
                display_name="Test",
                image_base64=valid_png_base64,
                user_tier="pro",
            )

    @pytest.mark.asyncio
    async def test_upload_invalid_base64(self, service):
        """Should reject invalid base64."""
        with pytest.raises(ValueError, match="Invalid base64"):
            await service.upload(
                user_id="user-123",
                asset_type="face",
                display_name="Test",
                image_base64="not-valid-base64!!!",
                user_tier="pro",
            )

    @pytest.mark.asyncio
    async def test_get_success(self, service):
        """Should get asset successfully."""
        result = await service.get("user-123", "asset-123")
        
        assert result.id == "asset-123"

    @pytest.mark.asyncio
    async def test_get_not_found(self, service, mock_repository):
        """Should raise error when not found."""
        mock_repository.get_by_id = AsyncMock(return_value=None)
        
        with pytest.raises(ValueError, match="not found"):
            await service.get("user-123", "nonexistent")

    @pytest.mark.asyncio
    async def test_update_success(self, service):
        """Should update asset successfully."""
        result = await service.update(
            user_id="user-123",
            asset_id="asset-123",
            display_name="New Name",
        )
        
        assert result.id == "asset-123"

    @pytest.mark.asyncio
    async def test_delete_success(self, service):
        """Should delete asset successfully."""
        result = await service.delete("user-123", "asset-123")
        
        assert result is True

    @pytest.mark.asyncio
    async def test_list_success(self, service):
        """Should list assets successfully."""
        assets, total = await service.list("user-123")
        
        assert len(assets) == 1
        assert total == 1

    @pytest.mark.asyncio
    async def test_get_for_prompt(self, service):
        """Should get assets for prompt injection for pro tier."""
        result = await service.get_for_prompt("user-123", ["asset-123"], user_tier="pro")
        
        assert len(result) == 1
        assert result[0].id == "asset-123"

    @pytest.mark.asyncio
    async def test_get_for_prompt_free_tier_denied(self, service):
        """Should reject free tier users."""
        with pytest.raises(PermissionError, match="Pro and Studio"):
            await service.get_for_prompt("user-123", ["asset-123"], user_tier="free")

    @pytest.mark.asyncio
    async def test_get_for_prompt_max_assets_exceeded(self, service):
        """Should reject when more than 2 assets requested."""
        with pytest.raises(ValueError, match="Maximum 2 assets"):
            await service.get_for_prompt(
                "user-123", 
                ["asset-1", "asset-2", "asset-3"], 
                user_tier="pro"
            )


# =============================================================================
# Singleton Tests
# =============================================================================

class TestServiceSingleton:
    """Tests for service singleton pattern."""

    def test_get_service_returns_same_instance(self):
        """Should return the same service instance."""
        # Reset singleton
        import backend.services.creator_media.service as module
        module._service = None
        
        service1 = get_creator_media_service()
        service2 = get_creator_media_service()
        
        assert service1 is service2

    def test_service_lazy_loads_dependencies(self):
        """Service should lazy-load its dependencies."""
        service = CreatorMediaService()
        
        assert service._storage is None
        assert service._repository is None
        assert service._injector is None


# =============================================================================
# Background Removal Tests
# =============================================================================

class TestBackgroundRemovalConstants:
    """Tests for background removal constants and helpers."""

    def test_bg_removal_default_types(self):
        """Should have correct default types for background removal."""
        from backend.services.creator_media.constants import (
            BG_REMOVAL_DEFAULT_TYPES,
            should_remove_background_by_default,
        )
        
        # These types should have bg removal by default
        assert "face" in BG_REMOVAL_DEFAULT_TYPES
        assert "logo" in BG_REMOVAL_DEFAULT_TYPES
        assert "character" in BG_REMOVAL_DEFAULT_TYPES
        assert "object" in BG_REMOVAL_DEFAULT_TYPES
        assert "emote" in BG_REMOVAL_DEFAULT_TYPES
        assert "badge" in BG_REMOVAL_DEFAULT_TYPES
        assert "game_skin" in BG_REMOVAL_DEFAULT_TYPES
        
        # These should NOT have bg removal by default
        assert "background" not in BG_REMOVAL_DEFAULT_TYPES
        assert "reference" not in BG_REMOVAL_DEFAULT_TYPES
        assert "panel" not in BG_REMOVAL_DEFAULT_TYPES

    def test_bg_removal_excluded_types(self):
        """Should have correct excluded types for background removal."""
        from backend.services.creator_media.constants import (
            BG_REMOVAL_EXCLUDED_TYPES,
            can_remove_background,
        )
        
        # These types should NOT allow bg removal
        assert "background" in BG_REMOVAL_EXCLUDED_TYPES
        assert "reference" in BG_REMOVAL_EXCLUDED_TYPES
        assert "panel" in BG_REMOVAL_EXCLUDED_TYPES
        assert "overlay" in BG_REMOVAL_EXCLUDED_TYPES
        
        # These should allow bg removal
        assert "face" not in BG_REMOVAL_EXCLUDED_TYPES
        assert "logo" not in BG_REMOVAL_EXCLUDED_TYPES

    def test_should_remove_background_by_default(self):
        """Should correctly determine default bg removal behavior."""
        from backend.services.creator_media.constants import should_remove_background_by_default
        
        assert should_remove_background_by_default("face") is True
        assert should_remove_background_by_default("logo") is True
        assert should_remove_background_by_default("character") is True
        assert should_remove_background_by_default("background") is False
        assert should_remove_background_by_default("reference") is False

    def test_can_remove_background(self):
        """Should correctly determine if bg removal is allowed."""
        from backend.services.creator_media.constants import can_remove_background
        
        assert can_remove_background("face") is True
        assert can_remove_background("logo") is True
        assert can_remove_background("background") is False
        assert can_remove_background("reference") is False
        assert can_remove_background("panel") is False


class TestBackgroundRemovalService:
    """Tests for BackgroundRemovalService."""

    @pytest.fixture
    def bg_service(self):
        """Create background removal service."""
        from backend.services.creator_media.background_removal import BackgroundRemovalService
        return BackgroundRemovalService()

    @pytest.mark.asyncio
    async def test_remove_background_success(self, bg_service, valid_png_bytes):
        """Should remove background successfully when rembg is available."""
        import sys
        from unittest.mock import MagicMock
        
        # Mock rembg module
        mock_rembg = MagicMock()
        mock_rembg.remove.return_value = valid_png_bytes
        
        with patch.dict(sys.modules, {'rembg': mock_rembg}):
            result = await bg_service.remove_background(valid_png_bytes)
            
            assert isinstance(result, bytes)
            assert len(result) > 0
            mock_rembg.remove.assert_called_once()

    @pytest.mark.asyncio
    async def test_remove_background_rembg_not_installed(self, bg_service, valid_png_bytes):
        """Should raise error when rembg is not installed."""
        import sys
        
        # Remove rembg from modules if present
        with patch.dict(sys.modules, {'rembg': None}):
            # Force ImportError
            with patch('builtins.__import__', side_effect=ImportError("No module named 'rembg'")):
                with pytest.raises(ValueError, match="unavailable"):
                    await bg_service.remove_background(valid_png_bytes)


class TestUploadWithBackgroundRemoval:
    """Tests for upload with background removal."""

    @pytest.fixture
    def mock_bg_service(self, valid_png_bytes):
        """Create mock background removal service."""
        from backend.services.creator_media.background_removal import BackgroundRemovalService
        bg = MagicMock(spec=BackgroundRemovalService)
        bg.remove_background = AsyncMock(return_value=valid_png_bytes)
        return bg

    @pytest.fixture
    def mock_storage_with_processed(self, mock_upload_result):
        """Create mock storage that handles both original and processed uploads."""
        storage = MagicMock(spec=MediaStorageService)
        storage.validate_file.return_value = "image/png"
        
        # Return different results for original and processed uploads
        processed_result = UploadResult(
            storage_path="user-123/face/asset-123_processed.png",
            url="https://storage.example.com/face_processed.png",
            file_size=800,
            mime_type="image/png",
        )
        storage.upload = AsyncMock(side_effect=[mock_upload_result, processed_result])
        storage.delete = AsyncMock(return_value=True)
        return storage

    @pytest.fixture
    def mock_repository_with_bg(self):
        """Create mock repository that returns asset with bg removal fields."""
        repo = MagicMock(spec=MediaRepository)
        repo.count_by_type = AsyncMock(return_value=0)
        repo.count_total = AsyncMock(return_value=0)
        repo.unset_primary = AsyncMock()
        
        # Return asset with background removal fields
        asset_with_bg = MediaAssetModel(
            id="asset-123",
            user_id="user-123",
            asset_type="face",
            display_name="My Face",
            url="https://storage.example.com/face.png",
            storage_path="user-123/face/asset-123.png",
            processed_url="https://storage.example.com/face_processed.png",
            processed_storage_path="user-123/face/asset-123_processed.png",
            has_background_removed=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        repo.insert = AsyncMock(return_value=asset_with_bg)
        return repo

    @pytest.fixture
    def mock_storage_single(self, mock_upload_result):
        """Create mock storage for single upload (no bg removal)."""
        storage = MagicMock(spec=MediaStorageService)
        storage.validate_file.return_value = "image/png"
        storage.upload = AsyncMock(return_value=mock_upload_result)
        storage.delete = AsyncMock(return_value=True)
        return storage

    @pytest.fixture
    def mock_repository_no_bg(self, mock_asset_model):
        """Create mock repository for assets without bg removal."""
        repo = MagicMock(spec=MediaRepository)
        repo.count_by_type = AsyncMock(return_value=0)
        repo.count_total = AsyncMock(return_value=0)
        repo.unset_primary = AsyncMock()
        repo.insert = AsyncMock(return_value=mock_asset_model)
        return repo

    @pytest.mark.asyncio
    async def test_upload_with_bg_removal_default_for_face(
        self, mock_storage_with_processed, mock_repository_with_bg, mock_bg_service, valid_png_base64
    ):
        """Should auto-remove background for face assets by default."""
        service = CreatorMediaService(
            storage=mock_storage_with_processed,
            repository=mock_repository_with_bg,
            bg_removal=mock_bg_service,
        )
        
        result = await service.upload(
            user_id="user-123",
            asset_type="face",
            display_name="My Face",
            image_base64=valid_png_base64,
            user_tier="pro",
            # remove_background=None means use default (True for face)
        )
        
        # Should have called bg removal
        mock_bg_service.remove_background.assert_called_once()
        
        # Should have uploaded twice (original + processed)
        assert mock_storage_with_processed.upload.call_count == 2

    @pytest.mark.asyncio
    async def test_upload_without_bg_removal_for_background_type(
        self, mock_storage_single, mock_repository_no_bg, valid_png_base64
    ):
        """Should NOT remove background for background asset type."""
        service = CreatorMediaService(
            storage=mock_storage_single,
            repository=mock_repository_no_bg,
        )
        
        result = await service.upload(
            user_id="user-123",
            asset_type="background",
            display_name="My Background",
            image_base64=valid_png_base64,
            user_tier="pro",
        )
        
        # Should only upload once (no processed version)
        assert mock_storage_single.upload.call_count == 1

    @pytest.mark.asyncio
    async def test_upload_explicit_bg_removal_false(
        self, mock_storage_single, mock_repository_no_bg, valid_png_base64
    ):
        """Should skip bg removal when explicitly set to False."""
        service = CreatorMediaService(
            storage=mock_storage_single,
            repository=mock_repository_no_bg,
        )
        
        result = await service.upload(
            user_id="user-123",
            asset_type="face",
            display_name="My Face",
            image_base64=valid_png_base64,
            remove_background=False,  # Explicitly disable
            user_tier="pro",
        )
        
        # Should only upload once (no processed version)
        assert mock_storage_single.upload.call_count == 1

    @pytest.mark.asyncio
    async def test_upload_bg_removal_blocked_for_excluded_type(
        self, mock_storage_single, mock_repository_no_bg, valid_png_base64
    ):
        """Should block bg removal for excluded types even if requested."""
        service = CreatorMediaService(
            storage=mock_storage_single,
            repository=mock_repository_no_bg,
        )
        
        result = await service.upload(
            user_id="user-123",
            asset_type="reference",
            display_name="Reference Image",
            image_base64=valid_png_base64,
            remove_background=True,  # Try to enable, but should be blocked
            user_tier="pro",
        )
        
        # Should only upload once (bg removal blocked for reference type)
        assert mock_storage_single.upload.call_count == 1
