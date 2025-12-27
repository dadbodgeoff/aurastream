"""
Unit tests for brand kit enhancement endpoints.

Tests cover the extended brand kit endpoints:
- PUT/GET /brand-kits/{id}/colors - Extended color palette
- PUT/GET /brand-kits/{id}/typography - Typography hierarchy
- PUT/GET /brand-kits/{id}/voice - Brand voice configuration
- PUT/GET /brand-kits/{id}/guidelines - Brand guidelines

All tests use mocked brand_kit_service to avoid database calls.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone
import uuid

from fastapi.testclient import TestClient

from backend.services.jwt_service import JWTService
from backend.services.exceptions import (
    BrandKitNotFoundError,
    AuthorizationError,
)


# =============================================================================
# Test Configuration
# =============================================================================

TEST_SECRET_KEY = "test-jwt-secret-key-that-is-at-least-32-characters-long-for-testing"


# =============================================================================
# Helper Functions
# =============================================================================

def create_mock_brand_kit(
    brand_kit_id=None,
    user_id=None,
    name="Test Brand Kit",
    is_active=False,
    colors_extended=None,
    typography=None,
    voice=None,
    guidelines=None,
):
    """Create a mock brand kit dictionary with extended fields."""
    if brand_kit_id is None:
        brand_kit_id = str(uuid.uuid4())
    if user_id is None:
        user_id = str(uuid.uuid4())
    
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": brand_kit_id,
        "user_id": user_id,
        "name": name,
        "is_active": is_active,
        "primary_colors": ["#FF5733", "#3498DB"],
        "accent_colors": ["#F1C40F"],
        "fonts": {"headline": "Montserrat", "body": "Inter"},
        "logo_url": None,
        "tone": "professional",
        "style_reference": "Test style",
        "extracted_from": None,
        "colors_extended": colors_extended or {},
        "typography": typography or {},
        "voice": voice or {},
        "guidelines": guidelines or {},
        "created_at": now,
        "updated_at": now,
    }


def create_mock_user_row(user_id=None, email="test@example.com"):
    """Create a mock database user row."""
    if user_id is None:
        user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": user_id,
        "email": email,
        "password_hash": "$2b$04$mock_hash",
        "email_verified": False,
        "display_name": "Test User",
        "avatar_url": None,
        "subscription_tier": "free",
        "subscription_status": "none",
        "assets_generated_this_month": 0,
        "created_at": now,
        "updated_at": now,
    }


def setup_mock_supabase(mock_supabase, user_exists=False, user_row=None):
    """Setup mock Supabase client with chainable methods."""
    mock_client = MagicMock()
    mock_supabase.return_value = mock_client
    
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    
    mock_select = MagicMock()
    mock_table.select.return_value = mock_select
    mock_eq = MagicMock()
    mock_select.eq.return_value = mock_eq
    
    mock_execute = MagicMock()
    mock_eq.execute.return_value = mock_execute
    
    if user_exists and user_row:
        mock_execute.data = [user_row]
    else:
        mock_execute.data = []
    
    return mock_client


def setup_mock_brand_kit_service(mock_bk_supabase, brand_kit=None, raise_not_found=False, raise_auth_error=False, brand_kit_id=None):
    """Setup mock brand kit service Supabase client."""
    mock_bk_client = MagicMock()
    mock_bk_supabase.return_value = mock_bk_client
    mock_table = MagicMock()
    mock_bk_client.table.return_value = mock_table
    
    # Mock select for get operations
    mock_select = MagicMock()
    mock_table.select.return_value = mock_select
    mock_eq = MagicMock()
    mock_select.eq.return_value = mock_eq
    mock_execute = MagicMock()
    mock_eq.execute.return_value = mock_execute
    
    if raise_not_found:
        mock_execute.data = []
    elif brand_kit:
        mock_execute.data = [brand_kit]
    else:
        mock_execute.data = []
    
    # Mock update for update operations
    mock_update = MagicMock()
    mock_table.update.return_value = mock_update
    mock_update_eq = MagicMock()
    mock_update.eq.return_value = mock_update_eq
    mock_update_execute = MagicMock()
    mock_update_eq.execute.return_value = mock_update_execute
    
    if brand_kit:
        mock_update_execute.data = [brand_kit]
    else:
        mock_update_execute.data = []
    
    return mock_bk_client


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def mock_settings():
    """Create mock settings."""
    settings = MagicMock()
    settings.JWT_SECRET_KEY = TEST_SECRET_KEY
    settings.JWT_ALGORITHM = "HS256"
    settings.JWT_EXPIRATION_HOURS = 24
    settings.is_production = False
    settings.DEBUG = True
    settings.APP_ENV = "test"
    settings.allowed_origins_list = ["http://localhost:3000"]
    return settings


@pytest.fixture
def jwt_service():
    """Create JWT service for testing."""
    return JWTService(secret_key=TEST_SECRET_KEY)


@pytest.fixture
def mock_user_id():
    """Generate a test user ID."""
    return str(uuid.uuid4())


@pytest.fixture
def mock_brand_kit_id():
    """Generate a test brand kit ID."""
    return str(uuid.uuid4())


@pytest.fixture
def valid_color_palette():
    """Valid extended color palette data."""
    return {
        "primary": [
            {"hex": "#FF5733", "name": "Brand Orange", "usage": "Main brand color"}
        ],
        "secondary": [
            {"hex": "#3498DB", "name": "Ocean Blue", "usage": "Secondary elements"}
        ],
        "accent": [
            {"hex": "#F1C40F", "name": "Gold", "usage": "Highlights and CTAs"}
        ],
        "neutral": [
            {"hex": "#2C3E50", "name": "Dark Slate", "usage": "Text and backgrounds"}
        ],
        "gradients": [
            {
                "name": "Brand Gradient",
                "type": "linear",
                "angle": 90,
                "stops": [
                    {"color": "#FF5733", "position": 0},
                    {"color": "#3498DB", "position": 100}
                ]
            }
        ]
    }


@pytest.fixture
def valid_typography():
    """Valid typography data."""
    return {
        "display": {"family": "Oswald", "weight": 700, "style": "normal"},
        "headline": {"family": "Montserrat", "weight": 600, "style": "normal"},
        "subheadline": {"family": "Montserrat", "weight": 500, "style": "normal"},
        "body": {"family": "Inter", "weight": 400, "style": "normal"},
        "caption": {"family": "Inter", "weight": 400, "style": "italic"},
        "accent": {"family": "Playfair Display", "weight": 700, "style": "italic"}
    }


@pytest.fixture
def valid_brand_voice():
    """Valid brand voice data."""
    return {
        "tone": "competitive",
        "personality_traits": ["Bold", "Energetic", "Authentic"],
        "tagline": "Level Up Your Stream",
        "catchphrases": ["Let's gooo!", "GG everyone", "Stay awesome"],
        "content_themes": ["Gaming", "Community", "Entertainment"]
    }


@pytest.fixture
def valid_guidelines():
    """Valid brand guidelines data."""
    return {
        "logo_min_size_px": 48,
        "logo_clear_space_ratio": 0.25,
        "primary_color_ratio": 60.0,
        "secondary_color_ratio": 30.0,
        "accent_color_ratio": 10.0,
        "prohibited_modifications": ["Stretching", "Color changes", "Adding effects"],
        "style_do": "Use bold colors, maintain consistent spacing",
        "style_dont": "Avoid cluttered layouts"
    }


# =============================================================================
# TestUpdateColors - PUT /brand-kits/{id}/colors
# =============================================================================

class TestUpdateColors:
    """Tests for PUT /api/v1/brand-kits/{brand_kit_id}/colors."""
    
    def test_update_colors_success(
        self, mock_user_id, mock_brand_kit_id, valid_color_palette, jwt_service, mock_settings
    ):
        """Test successful update returns ColorPaletteResponse."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            # Setup brand kit service mock
            mock_brand_kit = create_mock_brand_kit(
                brand_kit_id=mock_brand_kit_id,
                user_id=mock_user_id,
                colors_extended=valid_color_palette
            )
            setup_mock_brand_kit_service(mock_bk_supabase, brand_kit=mock_brand_kit)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.put(
                f"/api/v1/brand-kits/{mock_brand_kit_id}/colors",
                json=valid_color_palette,
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["brand_kit_id"] == mock_brand_kit_id
            assert "colors" in data

    
    def test_update_colors_not_found(
        self, mock_user_id, mock_brand_kit_id, valid_color_palette, jwt_service, mock_settings
    ):
        """Test 404 when brand kit not found."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            # Setup brand kit service mock - return empty (not found)
            setup_mock_brand_kit_service(mock_bk_supabase, raise_not_found=True)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            non_existent_id = str(uuid.uuid4())
            response = client.put(
                f"/api/v1/brand-kits/{non_existent_id}/colors",
                json=valid_color_palette,
                headers=headers
            )
            
            assert response.status_code == 404
    
    def test_update_colors_not_authorized(
        self, mock_user_id, mock_brand_kit_id, valid_color_palette, jwt_service, mock_settings
    ):
        """Test 403 when not authorized."""
        other_user_id = str(uuid.uuid4())
        
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            # Brand kit owned by different user
            other_brand_kit = create_mock_brand_kit(
                brand_kit_id=mock_brand_kit_id,
                user_id=other_user_id
            )
            setup_mock_brand_kit_service(mock_bk_supabase, brand_kit=other_brand_kit)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.put(
                f"/api/v1/brand-kits/{mock_brand_kit_id}/colors",
                json=valid_color_palette,
                headers=headers
            )
            
            assert response.status_code == 403


# =============================================================================
# TestGetColors - GET /brand-kits/{id}/colors
# =============================================================================

class TestGetColors:
    """Tests for GET /api/v1/brand-kits/{brand_kit_id}/colors."""
    
    def test_get_colors_success(
        self, mock_user_id, mock_brand_kit_id, valid_color_palette, jwt_service, mock_settings
    ):
        """Test successful get returns ColorPaletteResponse."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            mock_brand_kit = create_mock_brand_kit(
                brand_kit_id=mock_brand_kit_id,
                user_id=mock_user_id,
                colors_extended=valid_color_palette
            )
            setup_mock_brand_kit_service(mock_bk_supabase, brand_kit=mock_brand_kit)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.get(
                f"/api/v1/brand-kits/{mock_brand_kit_id}/colors",
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["brand_kit_id"] == mock_brand_kit_id
            assert "colors" in data
    
    def test_get_colors_returns_empty_when_not_set(
        self, mock_user_id, mock_brand_kit_id, jwt_service, mock_settings
    ):
        """Test returns empty ColorPalette when not set."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            mock_brand_kit = create_mock_brand_kit(
                brand_kit_id=mock_brand_kit_id,
                user_id=mock_user_id,
                colors_extended={}
            )
            setup_mock_brand_kit_service(mock_bk_supabase, brand_kit=mock_brand_kit)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.get(
                f"/api/v1/brand-kits/{mock_brand_kit_id}/colors",
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["brand_kit_id"] == mock_brand_kit_id
            assert data["colors"]["primary"] == []
            assert data["colors"]["secondary"] == []

    
    def test_get_colors_not_found(
        self, mock_user_id, mock_brand_kit_id, jwt_service, mock_settings
    ):
        """Test 404 when brand kit not found."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            setup_mock_brand_kit_service(mock_bk_supabase, raise_not_found=True)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            non_existent_id = str(uuid.uuid4())
            response = client.get(
                f"/api/v1/brand-kits/{non_existent_id}/colors",
                headers=headers
            )
            
            assert response.status_code == 404


# =============================================================================
# TestUpdateTypography - PUT /brand-kits/{id}/typography
# =============================================================================

class TestUpdateTypography:
    """Tests for PUT /api/v1/brand-kits/{brand_kit_id}/typography."""
    
    def test_update_typography_success(
        self, mock_user_id, mock_brand_kit_id, valid_typography, jwt_service, mock_settings
    ):
        """Test successful update returns TypographyResponse."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            mock_brand_kit = create_mock_brand_kit(
                brand_kit_id=mock_brand_kit_id,
                user_id=mock_user_id,
                typography=valid_typography
            )
            setup_mock_brand_kit_service(mock_bk_supabase, brand_kit=mock_brand_kit)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.put(
                f"/api/v1/brand-kits/{mock_brand_kit_id}/typography",
                json=valid_typography,
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["brand_kit_id"] == mock_brand_kit_id
            assert "typography" in data

    
    def test_update_typography_not_found(
        self, mock_user_id, mock_brand_kit_id, valid_typography, jwt_service, mock_settings
    ):
        """Test 404 when brand kit not found."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            setup_mock_brand_kit_service(mock_bk_supabase, raise_not_found=True)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            non_existent_id = str(uuid.uuid4())
            response = client.put(
                f"/api/v1/brand-kits/{non_existent_id}/typography",
                json=valid_typography,
                headers=headers
            )
            
            assert response.status_code == 404
    
    def test_update_typography_not_authorized(
        self, mock_user_id, mock_brand_kit_id, valid_typography, jwt_service, mock_settings
    ):
        """Test 403 when not authorized."""
        other_user_id = str(uuid.uuid4())
        
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            other_brand_kit = create_mock_brand_kit(
                brand_kit_id=mock_brand_kit_id,
                user_id=other_user_id
            )
            setup_mock_brand_kit_service(mock_bk_supabase, brand_kit=other_brand_kit)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.put(
                f"/api/v1/brand-kits/{mock_brand_kit_id}/typography",
                json=valid_typography,
                headers=headers
            )
            
            assert response.status_code == 403


# =============================================================================
# TestGetTypography - GET /brand-kits/{id}/typography
# =============================================================================

class TestGetTypography:
    """Tests for GET /api/v1/brand-kits/{brand_kit_id}/typography."""
    
    def test_get_typography_success(
        self, mock_user_id, mock_brand_kit_id, valid_typography, jwt_service, mock_settings
    ):
        """Test successful get returns TypographyResponse."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            mock_brand_kit = create_mock_brand_kit(
                brand_kit_id=mock_brand_kit_id,
                user_id=mock_user_id,
                typography=valid_typography
            )
            setup_mock_brand_kit_service(mock_bk_supabase, brand_kit=mock_brand_kit)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.get(
                f"/api/v1/brand-kits/{mock_brand_kit_id}/typography",
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["brand_kit_id"] == mock_brand_kit_id
            assert "typography" in data
    
    def test_get_typography_returns_empty_when_not_set(
        self, mock_user_id, mock_brand_kit_id, jwt_service, mock_settings
    ):
        """Test returns empty Typography when not set."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            mock_brand_kit = create_mock_brand_kit(
                brand_kit_id=mock_brand_kit_id,
                user_id=mock_user_id,
                typography={}
            )
            setup_mock_brand_kit_service(mock_bk_supabase, brand_kit=mock_brand_kit)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.get(
                f"/api/v1/brand-kits/{mock_brand_kit_id}/typography",
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["brand_kit_id"] == mock_brand_kit_id
            assert data["typography"]["display"] is None
            assert data["typography"]["headline"] is None


# =============================================================================
# TestUpdateVoice - PUT /brand-kits/{id}/voice
# =============================================================================

class TestUpdateVoice:
    """Tests for PUT /api/v1/brand-kits/{brand_kit_id}/voice."""
    
    def test_update_voice_success(
        self, mock_user_id, mock_brand_kit_id, valid_brand_voice, jwt_service, mock_settings
    ):
        """Test successful update returns VoiceResponse."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            mock_brand_kit = create_mock_brand_kit(
                brand_kit_id=mock_brand_kit_id,
                user_id=mock_user_id,
                voice=valid_brand_voice
            )
            setup_mock_brand_kit_service(mock_bk_supabase, brand_kit=mock_brand_kit)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.put(
                f"/api/v1/brand-kits/{mock_brand_kit_id}/voice",
                json=valid_brand_voice,
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["brand_kit_id"] == mock_brand_kit_id
            assert "voice" in data
    
    def test_update_voice_not_found(
        self, mock_user_id, mock_brand_kit_id, valid_brand_voice, jwt_service, mock_settings
    ):
        """Test 404 when brand kit not found."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            setup_mock_brand_kit_service(mock_bk_supabase, raise_not_found=True)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            non_existent_id = str(uuid.uuid4())
            response = client.put(
                f"/api/v1/brand-kits/{non_existent_id}/voice",
                json=valid_brand_voice,
                headers=headers
            )
            
            assert response.status_code == 404

    
    def test_update_voice_not_authorized(
        self, mock_user_id, mock_brand_kit_id, valid_brand_voice, jwt_service, mock_settings
    ):
        """Test 403 when not authorized."""
        other_user_id = str(uuid.uuid4())
        
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            other_brand_kit = create_mock_brand_kit(
                brand_kit_id=mock_brand_kit_id,
                user_id=other_user_id
            )
            setup_mock_brand_kit_service(mock_bk_supabase, brand_kit=other_brand_kit)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.put(
                f"/api/v1/brand-kits/{mock_brand_kit_id}/voice",
                json=valid_brand_voice,
                headers=headers
            )
            
            assert response.status_code == 403


# =============================================================================
# TestGetVoice - GET /brand-kits/{id}/voice
# =============================================================================

class TestGetVoice:
    """Tests for GET /api/v1/brand-kits/{brand_kit_id}/voice."""
    
    def test_get_voice_success(
        self, mock_user_id, mock_brand_kit_id, valid_brand_voice, jwt_service, mock_settings
    ):
        """Test successful get returns VoiceResponse."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            mock_brand_kit = create_mock_brand_kit(
                brand_kit_id=mock_brand_kit_id,
                user_id=mock_user_id,
                voice=valid_brand_voice
            )
            setup_mock_brand_kit_service(mock_bk_supabase, brand_kit=mock_brand_kit)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.get(
                f"/api/v1/brand-kits/{mock_brand_kit_id}/voice",
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["brand_kit_id"] == mock_brand_kit_id
            assert "voice" in data



# =============================================================================
# TestUpdateGuidelines - PUT /brand-kits/{id}/guidelines
# =============================================================================

class TestUpdateGuidelines:
    """Tests for PUT /api/v1/brand-kits/{brand_kit_id}/guidelines."""
    
    def test_update_guidelines_success(
        self, mock_user_id, mock_brand_kit_id, valid_guidelines, jwt_service, mock_settings
    ):
        """Test successful update returns GuidelinesResponse."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            mock_brand_kit = create_mock_brand_kit(
                brand_kit_id=mock_brand_kit_id,
                user_id=mock_user_id,
                guidelines=valid_guidelines
            )
            setup_mock_brand_kit_service(mock_bk_supabase, brand_kit=mock_brand_kit)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.put(
                f"/api/v1/brand-kits/{mock_brand_kit_id}/guidelines",
                json=valid_guidelines,
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["brand_kit_id"] == mock_brand_kit_id
            assert "guidelines" in data

    
    def test_update_guidelines_not_found(
        self, mock_user_id, mock_brand_kit_id, valid_guidelines, jwt_service, mock_settings
    ):
        """Test 404 when brand kit not found."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            setup_mock_brand_kit_service(mock_bk_supabase, raise_not_found=True)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            non_existent_id = str(uuid.uuid4())
            response = client.put(
                f"/api/v1/brand-kits/{non_existent_id}/guidelines",
                json=valid_guidelines,
                headers=headers
            )
            
            assert response.status_code == 404
    
    def test_update_guidelines_not_authorized(
        self, mock_user_id, mock_brand_kit_id, valid_guidelines, jwt_service, mock_settings
    ):
        """Test 403 when not authorized."""
        other_user_id = str(uuid.uuid4())
        
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            other_brand_kit = create_mock_brand_kit(
                brand_kit_id=mock_brand_kit_id,
                user_id=other_user_id
            )
            setup_mock_brand_kit_service(mock_bk_supabase, brand_kit=other_brand_kit)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.put(
                f"/api/v1/brand-kits/{mock_brand_kit_id}/guidelines",
                json=valid_guidelines,
                headers=headers
            )
            
            assert response.status_code == 403


# =============================================================================
# TestGetGuidelines - GET /brand-kits/{id}/guidelines
# =============================================================================

class TestGetGuidelines:
    """Tests for GET /api/v1/brand-kits/{brand_kit_id}/guidelines."""
    
    def test_get_guidelines_success(
        self, mock_user_id, mock_brand_kit_id, valid_guidelines, jwt_service, mock_settings
    ):
        """Test successful get returns GuidelinesResponse."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            mock_brand_kit = create_mock_brand_kit(
                brand_kit_id=mock_brand_kit_id,
                user_id=mock_user_id,
                guidelines=valid_guidelines
            )
            setup_mock_brand_kit_service(mock_bk_supabase, brand_kit=mock_brand_kit)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.get(
                f"/api/v1/brand-kits/{mock_brand_kit_id}/guidelines",
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["brand_kit_id"] == mock_brand_kit_id
            assert "guidelines" in data


# =============================================================================
# TestEnhancementEndpointsAuthentication
# =============================================================================

class TestEnhancementEndpointsAuthentication:
    """Tests for authentication requirements on enhancement endpoints."""
    
    def test_colors_endpoints_require_auth(self, mock_settings):
        """Test colors endpoints require authentication."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings:
            mock_get_settings.return_value = mock_settings
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            brand_kit_id = str(uuid.uuid4())
            
            # Test PUT without auth
            response = client.put(
                f"/api/v1/brand-kits/{brand_kit_id}/colors",
                json={"primary": [], "secondary": [], "accent": [], "neutral": [], "gradients": []}
            )
            assert response.status_code == 401
            
            # Test GET without auth
            response = client.get(f"/api/v1/brand-kits/{brand_kit_id}/colors")
            assert response.status_code == 401
    
    def test_typography_endpoints_require_auth(self, mock_settings):
        """Test typography endpoints require authentication."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings:
            mock_get_settings.return_value = mock_settings
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            brand_kit_id = str(uuid.uuid4())
            
            # Test PUT without auth
            response = client.put(
                f"/api/v1/brand-kits/{brand_kit_id}/typography",
                json={}
            )
            assert response.status_code == 401
            
            # Test GET without auth
            response = client.get(f"/api/v1/brand-kits/{brand_kit_id}/typography")
            assert response.status_code == 401
    
    def test_voice_endpoints_require_auth(self, mock_settings):
        """Test voice endpoints require authentication."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings:
            mock_get_settings.return_value = mock_settings
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            brand_kit_id = str(uuid.uuid4())
            
            # Test PUT without auth
            response = client.put(
                f"/api/v1/brand-kits/{brand_kit_id}/voice",
                json={"tone": "competitive"}
            )
            assert response.status_code == 401
            
            # Test GET without auth
            response = client.get(f"/api/v1/brand-kits/{brand_kit_id}/voice")
            assert response.status_code == 401
    
    def test_guidelines_endpoints_require_auth(self, mock_settings):
        """Test guidelines endpoints require authentication."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings:
            mock_get_settings.return_value = mock_settings
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            brand_kit_id = str(uuid.uuid4())
            
            # Test PUT without auth
            response = client.put(
                f"/api/v1/brand-kits/{brand_kit_id}/guidelines",
                json={"logo_min_size_px": 48, "logo_clear_space_ratio": 0.25}
            )
            assert response.status_code == 401
            
            # Test GET without auth
            response = client.get(f"/api/v1/brand-kits/{brand_kit_id}/guidelines")
            assert response.status_code == 401

    
    def test_invalid_token_rejected_on_enhancement_endpoints(self, mock_settings):
        """Test invalid token is rejected on all enhancement endpoints."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings:
            mock_get_settings.return_value = mock_settings
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            headers = {"Authorization": "Bearer invalid_token_here"}
            brand_kit_id = str(uuid.uuid4())
            
            # Test all enhancement endpoints with invalid token
            endpoints = [
                ("PUT", f"/api/v1/brand-kits/{brand_kit_id}/colors", {"primary": [], "secondary": [], "accent": [], "neutral": [], "gradients": []}),
                ("GET", f"/api/v1/brand-kits/{brand_kit_id}/colors", None),
                ("PUT", f"/api/v1/brand-kits/{brand_kit_id}/typography", {}),
                ("GET", f"/api/v1/brand-kits/{brand_kit_id}/typography", None),
                ("PUT", f"/api/v1/brand-kits/{brand_kit_id}/voice", {"tone": "competitive"}),
                ("GET", f"/api/v1/brand-kits/{brand_kit_id}/voice", None),
                ("PUT", f"/api/v1/brand-kits/{brand_kit_id}/guidelines", {"logo_min_size_px": 48, "logo_clear_space_ratio": 0.25}),
                ("GET", f"/api/v1/brand-kits/{brand_kit_id}/guidelines", None),
            ]
            
            for method, url, json_data in endpoints:
                if method == "PUT":
                    response = client.put(url, json=json_data, headers=headers)
                elif method == "GET":
                    response = client.get(url, headers=headers)
                
                assert response.status_code == 401, f"Expected 401 for {method} {url}, got {response.status_code}"


# =============================================================================
# TestEnhancementEndpointsValidation
# =============================================================================

class TestEnhancementEndpointsValidation:
    """Tests for validation on enhancement endpoints."""
    
    def test_colors_invalid_hex_rejected(
        self, mock_user_id, mock_brand_kit_id, jwt_service, mock_settings
    ):
        """Test invalid hex color is rejected."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            invalid_colors = {
                "primary": [
                    {"hex": "INVALID", "name": "Bad Color", "usage": "Test"}
                ],
                "secondary": [],
                "accent": [],
                "neutral": [],
                "gradients": []
            }
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.put(
                f"/api/v1/brand-kits/{mock_brand_kit_id}/colors",
                json=invalid_colors,
                headers=headers
            )
            
            assert response.status_code == 422

    
    def test_typography_invalid_weight_rejected(
        self, mock_user_id, mock_brand_kit_id, jwt_service, mock_settings
    ):
        """Test invalid font weight is rejected."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            invalid_typography = {
                "headline": {"family": "Inter", "weight": 999, "style": "normal"}
            }
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.put(
                f"/api/v1/brand-kits/{mock_brand_kit_id}/typography",
                json=invalid_typography,
                headers=headers
            )
            
            assert response.status_code == 422
    
    def test_voice_invalid_tone_rejected(
        self, mock_user_id, mock_brand_kit_id, jwt_service, mock_settings
    ):
        """Test invalid tone is rejected."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            invalid_voice = {
                "tone": "invalid_tone"
            }
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.put(
                f"/api/v1/brand-kits/{mock_brand_kit_id}/voice",
                json=invalid_voice,
                headers=headers
            )
            
            assert response.status_code == 422
    
    def test_guidelines_invalid_ratio_rejected(
        self, mock_user_id, mock_brand_kit_id, jwt_service, mock_settings
    ):
        """Test invalid color ratio (sum > 100) is rejected."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_row = create_mock_user_row(user_id=mock_user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            valid_token = jwt_service.create_access_token(
                user_id=mock_user_id,
                tier="free",
                email=user_row["email"],
            )
            
            invalid_guidelines = {
                "logo_min_size_px": 48,
                "logo_clear_space_ratio": 0.25,
                "primary_color_ratio": 60.0,
                "secondary_color_ratio": 50.0,
                "accent_color_ratio": 50.0  # Sum > 100
            }
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.put(
                f"/api/v1/brand-kits/{mock_brand_kit_id}/guidelines",
                json=invalid_guidelines,
                headers=headers
            )
            
            assert response.status_code == 422
