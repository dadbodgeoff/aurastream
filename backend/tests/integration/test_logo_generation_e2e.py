"""
End-to-End Tests for Logo Management and Generation Flow.

Tests the complete user journey:
1. Create brand kit
2. Upload logos
3. Set default logo
4. Generate assets with/without brand kit
5. Verify logo inclusion in generated assets
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from datetime import datetime, timezone

# Test fixtures
TEST_USER_ID = str(uuid4())
TEST_BRAND_KIT_ID = str(uuid4())
TEST_JOB_ID = str(uuid4())


class TestLogoManagementE2E:
    """E2E tests for logo management flow."""
    
    @pytest.fixture
    def mock_supabase(self):
        """Create mock Supabase client."""
        mock = MagicMock()
        mock.storage.from_.return_value.upload.return_value = {"path": "test/path"}
        mock.storage.from_.return_value.create_signed_url.return_value = {
            "signedURL": "https://example.com/signed-url"
        }
        mock.storage.from_.return_value.remove.return_value = None
        mock.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"default_logo_type": "primary"}
        )
        mock.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock()
        return mock
    
    @pytest.mark.asyncio
    async def test_upload_logo_success(self, mock_supabase):
        """Test successful logo upload."""
        from backend.services.logo_service import LogoService
        
        service = LogoService(supabase_client=mock_supabase)
        
        result = await service.upload_logo(
            user_id=TEST_USER_ID,
            brand_kit_id=TEST_BRAND_KIT_ID,
            logo_type="primary",
            file_data=b"fake image data",
            content_type="image/png",
            filename="logo.png"
        )
        
        assert result["type"] == "primary"
        assert "url" in result
        assert result["content_type"] == "image/png"
    
    @pytest.mark.asyncio
    async def test_upload_logo_invalid_type(self, mock_supabase):
        """Test logo upload with invalid type."""
        from backend.services.logo_service import LogoService
        
        service = LogoService(supabase_client=mock_supabase)
        
        with pytest.raises(ValueError, match="Invalid logo type"):
            await service.upload_logo(
                user_id=TEST_USER_ID,
                brand_kit_id=TEST_BRAND_KIT_ID,
                logo_type="invalid_type",
                file_data=b"fake image data",
                content_type="image/png",
            )
    
    @pytest.mark.asyncio
    async def test_upload_logo_invalid_mime_type(self, mock_supabase):
        """Test logo upload with invalid MIME type."""
        from backend.services.logo_service import LogoService
        
        service = LogoService(supabase_client=mock_supabase)
        
        with pytest.raises(ValueError, match="Invalid file type"):
            await service.upload_logo(
                user_id=TEST_USER_ID,
                brand_kit_id=TEST_BRAND_KIT_ID,
                logo_type="primary",
                file_data=b"fake data",
                content_type="application/pdf",
            )
    
    @pytest.mark.asyncio
    async def test_get_default_logo_type(self, mock_supabase):
        """Test getting default logo type."""
        from backend.services.logo_service import LogoService
        
        service = LogoService(supabase_client=mock_supabase)
        
        result = await service.get_default_logo_type(
            user_id=TEST_USER_ID,
            brand_kit_id=TEST_BRAND_KIT_ID,
        )
        
        assert result == "primary"
    
    @pytest.mark.asyncio
    async def test_set_default_logo_type(self, mock_supabase):
        """Test setting default logo type."""
        from backend.services.logo_service import LogoService
        
        service = LogoService(supabase_client=mock_supabase)
        
        # Should not raise
        await service.set_default_logo_type(
            user_id=TEST_USER_ID,
            brand_kit_id=TEST_BRAND_KIT_ID,
            logo_type="secondary",
        )
        
        # Verify update was called
        mock_supabase.table.return_value.update.assert_called()
    
    @pytest.mark.asyncio
    async def test_set_default_logo_type_invalid(self, mock_supabase):
        """Test setting invalid default logo type."""
        from backend.services.logo_service import LogoService
        
        service = LogoService(supabase_client=mock_supabase)
        
        with pytest.raises(ValueError, match="Invalid logo type"):
            await service.set_default_logo_type(
                user_id=TEST_USER_ID,
                brand_kit_id=TEST_BRAND_KIT_ID,
                logo_type="invalid",
            )
    
    @pytest.mark.asyncio
    async def test_list_logos(self, mock_supabase):
        """Test listing all logos."""
        from backend.services.logo_service import LogoService
        
        service = LogoService(supabase_client=mock_supabase)
        
        result = await service.list_logos(
            user_id=TEST_USER_ID,
            brand_kit_id=TEST_BRAND_KIT_ID,
        )
        
        # Should return dict with all logo types
        assert "primary" in result
        assert "secondary" in result
        assert "icon" in result
        assert "monochrome" in result
        assert "watermark" in result


class TestGenerationWithOptionalBrandKit:
    """E2E tests for generation with optional brand kit."""
    
    @pytest.fixture
    def mock_brand_kit_service(self):
        """Create mock brand kit service."""
        mock = AsyncMock()
        mock.get.return_value = {
            "id": TEST_BRAND_KIT_ID,
            "user_id": TEST_USER_ID,
            "name": "Test Brand",
            "primary_colors": ["#FF0000", "#00FF00"],
            "accent_colors": ["#0000FF"],
            "tone": "energetic",
        }
        return mock
    
    @pytest.fixture
    def mock_prompt_engine(self):
        """Create mock prompt engine."""
        mock = MagicMock()
        mock.build_prompt_v2.return_value = "Test prompt with brand"
        mock.build_prompt_no_brand.return_value = "Test prompt without brand"
        mock.load_template.return_value = MagicMock(quality_modifiers=["high quality"])
        mock.sanitize_input.return_value = "sanitized prompt"
        return mock
    
    @pytest.mark.asyncio
    async def test_create_job_with_brand_kit(self, mock_brand_kit_service, mock_prompt_engine):
        """Test creating generation job with brand kit."""
        from backend.services.generation_service import GenerationService
        from datetime import datetime, timezone
        
        now = datetime.now(timezone.utc).isoformat()
        mock_job_data = {
            "id": TEST_JOB_ID,
            "user_id": TEST_USER_ID,
            "brand_kit_id": TEST_BRAND_KIT_ID,
            "asset_type": "thumbnail",
            "status": "queued",
            "prompt": "Test prompt",
            "progress": 0,
            "error_message": None,
            "parameters": None,
            "created_at": now,
            "updated_at": now,
            "completed_at": None,
        }
        
        with patch('backend.services.generation_service.get_brand_kit_service', return_value=mock_brand_kit_service):
            with patch('backend.services.generation_service.get_prompt_engine', return_value=mock_prompt_engine):
                service = GenerationService()
                service._supabase = MagicMock()
                service._supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
                    data=[mock_job_data]
                )
                
                job = await service.create_job(
                    user_id=TEST_USER_ID,
                    brand_kit_id=TEST_BRAND_KIT_ID,
                    asset_type="thumbnail",
                    custom_prompt="Test prompt",
                )
                
                assert job.brand_kit_id == TEST_BRAND_KIT_ID
                mock_prompt_engine.build_prompt_v2.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_job_without_brand_kit(self, mock_prompt_engine):
        """Test creating generation job without brand kit (AI defaults)."""
        from backend.services.generation_service import GenerationService
        from datetime import datetime, timezone
        
        now = datetime.now(timezone.utc).isoformat()
        mock_job_data = {
            "id": TEST_JOB_ID,
            "user_id": TEST_USER_ID,
            "brand_kit_id": None,
            "asset_type": "thumbnail",
            "status": "queued",
            "prompt": "Test prompt",
            "progress": 0,
            "error_message": None,
            "parameters": None,
            "created_at": now,
            "updated_at": now,
            "completed_at": None,
        }
        
        with patch('backend.services.generation_service.get_prompt_engine', return_value=mock_prompt_engine):
            service = GenerationService()
            service._supabase = MagicMock()
            service._supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
                data=[mock_job_data]
            )
            
            job = await service.create_job(
                user_id=TEST_USER_ID,
                brand_kit_id=None,  # No brand kit
                asset_type="thumbnail",
                custom_prompt="Test prompt",
            )
            
            assert job.brand_kit_id is None
            mock_prompt_engine.build_prompt_no_brand.assert_called_once()


class TestPromptEngineNoBrand:
    """Tests for prompt engine without brand kit."""
    
    def test_build_prompt_no_brand_with_custom(self):
        """Test building prompt without brand kit but with custom prompt."""
        from backend.services.prompt_engine import PromptEngine, AssetType
        
        engine = PromptEngine()
        
        prompt = engine.build_prompt_no_brand(
            asset_type=AssetType.THUMBNAIL,
            custom_prompt="Epic gaming moment",
        )
        
        assert "thumbnail" in prompt.lower()
        assert "epic gaming moment" in prompt.lower() or "Content:" in prompt
        assert "Quality:" in prompt
    
    def test_build_prompt_no_brand_without_custom(self):
        """Test building prompt without brand kit and without custom prompt."""
        from backend.services.prompt_engine import PromptEngine, AssetType
        
        engine = PromptEngine()
        
        prompt = engine.build_prompt_no_brand(
            asset_type=AssetType.BANNER,
            custom_prompt=None,
        )
        
        assert "banner" in prompt.lower()
        assert "Style:" in prompt
        # Should have default content guidance
        assert "Content:" in prompt
    
    def test_build_prompt_no_brand_with_string_asset_type(self):
        """Test building prompt with string asset type (auto-conversion)."""
        from backend.services.prompt_engine import PromptEngine
        
        engine = PromptEngine()
        
        # Should auto-convert string to AssetType
        prompt = engine.build_prompt_no_brand(
            asset_type="thumbnail",
            custom_prompt="Test prompt",
        )
        
        assert "thumbnail" in prompt.lower()


class TestGenerationSchemaValidation:
    """Tests for generation request schema validation."""
    
    def test_generate_request_with_brand_kit(self):
        """Test GenerateRequest with brand kit ID."""
        from backend.api.schemas.generation import GenerateRequest
        
        request = GenerateRequest(
            asset_type="thumbnail",
            brand_kit_id=TEST_BRAND_KIT_ID,
            custom_prompt="Test prompt",
        )
        
        assert request.asset_type == "thumbnail"
        assert request.brand_kit_id == TEST_BRAND_KIT_ID
    
    def test_generate_request_without_brand_kit(self):
        """Test GenerateRequest without brand kit ID (AI defaults)."""
        from backend.api.schemas.generation import GenerateRequest
        
        request = GenerateRequest(
            asset_type="thumbnail",
            custom_prompt="Test prompt",
        )
        
        assert request.asset_type == "thumbnail"
        assert request.brand_kit_id is None
    
    def test_job_response_with_optional_brand_kit(self):
        """Test JobResponse with optional brand kit ID."""
        from backend.api.schemas.generation import JobResponse
        from datetime import datetime
        
        # With brand kit
        response_with = JobResponse(
            id=TEST_JOB_ID,
            user_id=TEST_USER_ID,
            brand_kit_id=TEST_BRAND_KIT_ID,
            asset_type="thumbnail",
            status="queued",
            progress=0,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        assert response_with.brand_kit_id == TEST_BRAND_KIT_ID
        
        # Without brand kit
        response_without = JobResponse(
            id=TEST_JOB_ID,
            user_id=TEST_USER_ID,
            brand_kit_id=None,
            asset_type="thumbnail",
            status="queued",
            progress=0,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        assert response_without.brand_kit_id is None


class TestLogoRoutesE2E:
    """E2E tests for logo API routes."""
    
    @pytest.fixture
    def mock_logo_service(self):
        """Create mock logo service."""
        mock = AsyncMock()
        mock.list_logos.return_value = {
            "primary": "https://example.com/primary.png",
            "secondary": None,
            "icon": None,
            "monochrome": None,
            "watermark": None,
        }
        mock.get_default_logo_type.return_value = "primary"
        mock.set_default_logo_type.return_value = None
        return mock
    
    @pytest.mark.asyncio
    async def test_list_logos_includes_default_type(self, mock_logo_service):
        """Test that list logos response includes default logo type."""
        from backend.api.routes.logos import LogoListResponse
        
        logos = await mock_logo_service.list_logos(TEST_USER_ID, TEST_BRAND_KIT_ID)
        default_type = await mock_logo_service.get_default_logo_type(TEST_USER_ID, TEST_BRAND_KIT_ID)
        
        response = LogoListResponse(
            brand_kit_id=TEST_BRAND_KIT_ID,
            logos=logos,
            default_logo_type=default_type,
        )
        
        assert response.default_logo_type == "primary"
        assert response.logos["primary"] == "https://example.com/primary.png"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
