"""
End-to-End Integration Tests for Generate Page + Coach Flow.

Tests the complete user journey from frontend to backend including:
- User authentication and tier verification
- Brand kit creation and management
- Coach access and session flow (premium users)
- Asset generation with brand customization
- URL parameter handling for coach redirect flow

These tests verify the full stack integration with all components
working together as they would in production.
"""

import pytest
import json
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient
from datetime import datetime, timezone
import uuid

from backend.api.main import create_app


# =============================================================================
# Test Configuration
# =============================================================================

TEST_SECRET_KEY = "test-jwt-secret-key-that-is-at-least-32-characters-long-for-testing"


# =============================================================================
# Helper Functions
# =============================================================================

def create_mock_supabase_response(data):
    """Create a mock Supabase response object."""
    mock_response = MagicMock()
    mock_response.data = data
    mock_response.count = len(data) if data else 0
    return mock_response


def create_mock_user_row(
    user_id=None,
    email="test@example.com",
    password_hash=None,
    subscription_tier="free",
):
    """Create a mock database user row."""
    if user_id is None:
        user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": user_id,
        "email": email,
        "password_hash": password_hash or "$2b$04$mock_hash",
        "email_verified": False,
        "display_name": "Test User",
        "avatar_url": None,
        "subscription_tier": subscription_tier,
        "subscription_status": "active" if subscription_tier != "free" else "none",
        "assets_generated_this_month": 0,
        "created_at": now,
        "updated_at": now,
    }


def create_mock_brand_kit(user_id, brand_kit_id=None, name="Test Brand Kit"):
    """Create a mock brand kit row."""
    if brand_kit_id is None:
        brand_kit_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": brand_kit_id,
        "user_id": user_id,
        "name": name,
        "is_active": True,
        "primary_colors": ["#1E3A5F", "#2563EB"],
        "accent_colors": ["#D97706"],
        "fonts": {"headline": "Inter", "body": "Inter"},
        "logo_url": None,
        "tone": "professional",
        "style_reference": "",
        "extracted_from": None,
        "created_at": now,
        "updated_at": now,
    }


def create_mock_generation_job(user_id, brand_kit_id, job_id=None):
    """Create a mock generation job row."""
    if job_id is None:
        job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": job_id,
        "user_id": user_id,
        "brand_kit_id": brand_kit_id,
        "asset_type": "thumbnail",
        "status": "queued",
        "progress": 0,
        "error_message": None,
        "custom_prompt": "Test prompt for generation",
        "parameters": {},
        "created_at": now,
        "updated_at": now,
        "completed_at": None,
    }


def setup_mock_supabase_for_auth(mock_supabase, user_row):
    """Setup mock Supabase client for auth operations."""
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
    mock_execute.data = [user_row]
    
    return mock_client


def setup_mock_supabase_for_brand_kits(mock_client, brand_kits):
    """Setup mock Supabase for brand kit operations."""
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    
    mock_select = MagicMock()
    mock_table.select.return_value = mock_select
    
    mock_eq = MagicMock()
    mock_select.eq.return_value = mock_eq
    
    mock_order = MagicMock()
    mock_eq.order.return_value = mock_order
    
    mock_execute = MagicMock()
    mock_order.execute.return_value = mock_execute
    mock_eq.execute.return_value = mock_execute
    mock_execute.data = brand_kits
    
    return mock_client


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
def sample_brand_kit_create():
    """Sample brand kit creation payload."""
    return {
        "name": "Enterprise Brand Kit",
        "primary_colors": ["#1E3A5F", "#2563EB"],
        "accent_colors": ["#D97706"],
        "fonts": {"headline": "Inter", "body": "Inter"},
        "tone": "professional",
    }


@pytest.fixture
def sample_generate_request():
    """Sample asset generation request payload."""
    return {
        "asset_type": "thumbnail",
        "brand_kit_id": "test-brand-kit-id",
        "custom_prompt": "Stream announcement with bold headline",
        "brand_customization": {
            "include_logo": False,
            "logo_type": "primary",
            "logo_position": "bottom-right",
            "logo_size": "medium",
            "brand_intensity": "balanced",
        },
    }


@pytest.fixture
def sample_coach_start_request():
    """Sample coach session start request."""
    return {
        "brand_context": {
            "brand_kit_id": "test-kit-123",
            "colors": [
                {"hex": "#1E3A5F", "name": "Navy Blue"},
                {"hex": "#2563EB", "name": "Interactive Blue"}
            ],
            "tone": "professional",
            "fonts": {"headline": "Inter", "body": "Inter"},
            "logo_url": None
        },
        "asset_type": "youtube_thumbnail",
        "mood": "hype",
        "game_id": None,
        "game_name": None,
        "description": "Stream announcement thumbnail"
    }


# =============================================================================
# TestUserAuthentication - Auth Flow Tests
# =============================================================================

class TestUserAuthentication:
    """Tests for user authentication flow."""
    
    def test_login_returns_200_with_valid_credentials(self, mock_settings):
        """Test that login returns 200 and tokens with valid credentials."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="test@example.com",
                password_hash=password_hash,
                subscription_tier="free",
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            app = create_app()
            client = TestClient(app)
            
            response = client.post("/api/v1/auth/login", json={
                "email": user_row["email"],
                "password": test_password,
            })
            
            assert response.status_code == 200
            data = response.json()
            assert "access_token" in data
            assert "refresh_token" in data
            assert "user" in data
            assert data["user"]["email"] == user_row["email"]
    
    def test_premium_user_has_studio_tier(self, mock_settings):
        """Test that premium users have studio subscription tier."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="premium@example.com",
                password_hash=password_hash,
                subscription_tier="studio",
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            app = create_app()
            client = TestClient(app)
            
            response = client.post("/api/v1/auth/login", json={
                "email": user_row["email"],
                "password": test_password,
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["user"]["subscription_tier"] == "studio"


# =============================================================================
# TestBrandKitFlow - Brand Kit CRUD Tests
# =============================================================================

class TestBrandKitFlow:
    """Tests for brand kit creation and management flow."""
    
    def test_create_brand_kit_returns_201(self, mock_settings, sample_brand_kit_create):
        """Test that creating a brand kit returns 201."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            mock_audit.return_value = AsyncMock()
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="brandkit@example.com",
                password_hash=password_hash,
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            # Setup brand kit supabase mock
            mock_bk_client = MagicMock()
            mock_bk_supabase.return_value = mock_bk_client
            
            brand_kit_id = str(uuid.uuid4())
            created_brand_kit = create_mock_brand_kit(user_id, brand_kit_id, sample_brand_kit_create["name"])
            
            mock_table = MagicMock()
            mock_bk_client.table.return_value = mock_table
            
            # Mock count query for limit check
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            mock_eq = MagicMock()
            mock_select.eq.return_value = mock_eq
            mock_count_execute = MagicMock()
            mock_eq.execute.return_value = mock_count_execute
            mock_count_execute.data = []  # No existing brand kits
            mock_count_execute.count = 0
            
            # Mock insert
            mock_insert = MagicMock()
            mock_table.insert.return_value = mock_insert
            mock_insert_execute = MagicMock()
            mock_insert.execute.return_value = mock_insert_execute
            mock_insert_execute.data = [created_brand_kit]
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            app = create_app()
            client = TestClient(app)
            
            # Login first
            login_response = client.post("/api/v1/auth/login", json={
                "email": user_row["email"],
                "password": test_password,
            })
            assert login_response.status_code == 200
            access_token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Create brand kit
            response = client.post(
                "/api/v1/brand-kits",
                json=sample_brand_kit_create,
                headers=headers,
            )
            
            assert response.status_code == 201
            data = response.json()
            assert data["name"] == sample_brand_kit_create["name"]
            assert "id" in data
    
    def test_list_brand_kits_returns_200(self, mock_settings):
        """Test that listing brand kits returns 200."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="listbk@example.com",
                password_hash=password_hash,
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            # Setup brand kit list mock
            mock_bk_client = MagicMock()
            mock_bk_supabase.return_value = mock_bk_client
            
            brand_kits = [
                create_mock_brand_kit(user_id, name="Brand Kit 1"),
                create_mock_brand_kit(user_id, name="Brand Kit 2"),
            ]
            setup_mock_supabase_for_brand_kits(mock_bk_client, brand_kits)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            app = create_app()
            client = TestClient(app)
            
            # Login
            login_response = client.post("/api/v1/auth/login", json={
                "email": user_row["email"],
                "password": test_password,
            })
            assert login_response.status_code == 200
            access_token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # List brand kits
            response = client.get("/api/v1/brand-kits", headers=headers)
            
            assert response.status_code == 200
            data = response.json()
            assert "brand_kits" in data
            assert "total" in data


# =============================================================================
# TestCoachAccessFlow - Coach Access and Tier Gating Tests
# =============================================================================

class TestCoachAccessFlow:
    """Tests for coach access based on subscription tier."""
    
    def test_free_user_gets_tips_only_access(self, mock_settings):
        """Test that free users only have tips access."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="free_coach@example.com",
                password_hash=password_hash,
                subscription_tier="free",
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            app = create_app()
            client = TestClient(app)
            
            # Login
            login_response = client.post("/api/v1/auth/login", json={
                "email": user_row["email"],
                "password": test_password,
            })
            assert login_response.status_code == 200
            access_token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Check access
            response = client.get("/api/v1/coach/access", headers=headers)
            
            assert response.status_code == 200
            data = response.json()
            assert data["has_access"] is False
            assert data["feature"] == "tips_only"
            assert "upgrade_message" in data
    
    def test_studio_user_gets_full_coach_access(self, mock_settings):
        """Test that studio users have full coach access."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="studio_coach@example.com",
                password_hash=password_hash,
                subscription_tier="studio",
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            app = create_app()
            client = TestClient(app)
            
            # Login
            login_response = client.post("/api/v1/auth/login", json={
                "email": user_row["email"],
                "password": test_password,
            })
            assert login_response.status_code == 200
            access_token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Check access
            response = client.get("/api/v1/coach/access", headers=headers)
            
            assert response.status_code == 200
            data = response.json()
            assert data["has_access"] is True
            assert data["feature"] == "full_coach"
            assert data["grounding"] is True
    
    def test_tips_endpoint_returns_200_for_all_tiers(self, mock_settings):
        """Test that tips endpoint works for all subscription tiers."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="tips_test@example.com",
                password_hash=password_hash,
                subscription_tier="free",
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            app = create_app()
            client = TestClient(app)
            
            # Login
            login_response = client.post("/api/v1/auth/login", json={
                "email": user_row["email"],
                "password": test_password,
            })
            assert login_response.status_code == 200
            access_token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Get tips
            response = client.get("/api/v1/coach/tips?asset_type=youtube_thumbnail", headers=headers)
            
            assert response.status_code == 200
            data = response.json()
            assert "tips" in data
            assert len(data["tips"]) > 0
            assert "upgrade_cta" in data


# =============================================================================
# TestGenerationFlow - Asset Generation Tests
# =============================================================================

class TestGenerationFlow:
    """Tests for asset generation flow."""
    
    def test_create_generation_job_returns_201(self, mock_settings, sample_generate_request):
        """Test that creating a generation job returns 201."""
        from backend.services.generation_service import GenerationJob, JobStatus
        
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit, \
             patch("backend.workers.generation_worker.enqueue_generation_job") as mock_enqueue:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            mock_audit.return_value = AsyncMock()
            mock_enqueue.return_value = None
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="generate@example.com",
                password_hash=password_hash,
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            # Setup generation service mock
            brand_kit_id = str(uuid.uuid4())
            job_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)
            
            mock_job = GenerationJob(
                id=job_id,
                user_id=user_id,
                brand_kit_id=brand_kit_id,
                asset_type="thumbnail",
                status=JobStatus.QUEUED,
                prompt="Test prompt for generation",
                progress=0,
                error_message=None,
                parameters={},
                created_at=now,
                updated_at=now,
                completed_at=None,
            )
            
            mock_gen_service = MagicMock()
            mock_gen_service.create_job = AsyncMock(return_value=mock_job)
            
            import backend.services.auth_service as auth_module
            import backend.services.generation_service as gen_module
            auth_module._auth_service = None
            # Set the singleton to our mock
            gen_module._generation_service = mock_gen_service
            
            app = create_app()
            client = TestClient(app)
            
            # Login
            login_response = client.post("/api/v1/auth/login", json={
                "email": user_row["email"],
                "password": test_password,
            })
            assert login_response.status_code == 200
            access_token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Update request with valid brand kit ID
            request_data = sample_generate_request.copy()
            request_data["brand_kit_id"] = brand_kit_id
            
            # Create generation job
            response = client.post(
                "/api/v1/generate",
                json=request_data,
                headers=headers,
            )
            
            assert response.status_code == 201
            data = response.json()
            assert "id" in data
            assert data["asset_type"] == "thumbnail"
            assert data["status"] == "queued"
    
    def test_list_jobs_returns_200(self, mock_settings):
        """Test that listing generation jobs returns 200."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.generation_service.get_supabase_client") as mock_gen_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="listjobs@example.com",
                password_hash=password_hash,
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            # Setup generation jobs mock
            brand_kit_id = str(uuid.uuid4())
            jobs = [
                create_mock_generation_job(user_id, brand_kit_id),
                create_mock_generation_job(user_id, brand_kit_id),
            ]
            
            mock_gen_client = MagicMock()
            mock_gen_supabase.return_value = mock_gen_client
            mock_gen_table = MagicMock()
            mock_gen_client.table.return_value = mock_gen_table
            mock_gen_select = MagicMock()
            mock_gen_table.select.return_value = mock_gen_select
            mock_gen_eq = MagicMock()
            mock_gen_select.eq.return_value = mock_gen_eq
            mock_gen_order = MagicMock()
            mock_gen_eq.order.return_value = mock_gen_order
            mock_gen_limit = MagicMock()
            mock_gen_order.limit.return_value = mock_gen_limit
            mock_gen_offset = MagicMock()
            mock_gen_limit.offset.return_value = mock_gen_offset
            mock_gen_execute = MagicMock()
            mock_gen_offset.execute.return_value = mock_gen_execute
            mock_gen_execute.data = jobs
            
            import backend.services.auth_service as auth_module
            import backend.services.generation_service as gen_module
            auth_module._auth_service = None
            gen_module._generation_service = None
            
            app = create_app()
            client = TestClient(app)
            
            # Login
            login_response = client.post("/api/v1/auth/login", json={
                "email": user_row["email"],
                "password": test_password,
            })
            assert login_response.status_code == 200
            access_token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # List jobs
            response = client.get("/api/v1/jobs", headers=headers)
            
            assert response.status_code == 200
            data = response.json()
            assert "jobs" in data
            assert "total" in data


# =============================================================================
# TestCoachToGenerateFlow - Full Coach to Generate Integration Tests
# =============================================================================

class TestCoachToGenerateFlow:
    """Tests for the complete coach to generate page flow."""
    
    def test_coach_start_blocked_for_free_users(self, mock_settings, sample_coach_start_request):
        """Test that free users cannot start coach sessions."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            mock_audit.return_value = AsyncMock()
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="free_coach_start@example.com",
                password_hash=password_hash,
                subscription_tier="free",
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            app = create_app()
            client = TestClient(app)
            
            # Login
            login_response = client.post("/api/v1/auth/login", json={
                "email": user_row["email"],
                "password": test_password,
            })
            assert login_response.status_code == 200
            access_token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Try to start coach session - should be blocked
            response = client.post(
                "/api/v1/coach/start",
                json=sample_coach_start_request,
                headers=headers,
            )
            
            assert response.status_code == 403
            data = response.json()
            assert "upgrade_required" in str(data)
    
    def test_full_flow_brand_kit_to_generation(self, mock_settings):
        """Test the complete flow from brand kit creation to asset generation."""
        from backend.services.generation_service import GenerationJob, JobStatus
        
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit, \
             patch("backend.workers.generation_worker.enqueue_generation_job") as mock_enqueue:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            mock_audit.return_value = AsyncMock()
            mock_enqueue.return_value = None
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="fullflow@example.com",
                password_hash=password_hash,
                subscription_tier="studio",
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            # Setup brand kit mock
            brand_kit_id = str(uuid.uuid4())
            brand_kit = create_mock_brand_kit(user_id, brand_kit_id, "Full Flow Brand Kit")
            
            mock_bk_client = MagicMock()
            mock_bk_supabase.return_value = mock_bk_client
            mock_bk_table = MagicMock()
            mock_bk_client.table.return_value = mock_bk_table
            
            # For list/count
            mock_bk_select = MagicMock()
            mock_bk_table.select.return_value = mock_bk_select
            mock_bk_eq = MagicMock()
            mock_bk_select.eq.return_value = mock_bk_eq
            mock_bk_order = MagicMock()
            mock_bk_eq.order.return_value = mock_bk_order
            mock_bk_execute = MagicMock()
            mock_bk_order.execute.return_value = mock_bk_execute
            mock_bk_eq.execute.return_value = mock_bk_execute
            mock_bk_execute.data = [brand_kit]
            mock_bk_execute.count = 1
            
            # Setup generation service mock
            job_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)
            mock_job = GenerationJob(
                id=job_id,
                user_id=user_id,
                brand_kit_id=brand_kit_id,
                asset_type="thumbnail",
                status=JobStatus.QUEUED,
                prompt="Stream announcement with bold headline and schedule details",
                progress=0,
                error_message=None,
                parameters={},
                created_at=now,
                updated_at=now,
                completed_at=None,
            )
            
            mock_gen_service = MagicMock()
            mock_gen_service.create_job = AsyncMock(return_value=mock_job)
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            import backend.services.generation_service as gen_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            # Set the singleton to our mock
            gen_module._generation_service = mock_gen_service
            
            app = create_app()
            client = TestClient(app)
            
            # Step 1: Login
            login_response = client.post("/api/v1/auth/login", json={
                "email": user_row["email"],
                "password": test_password,
            })
            assert login_response.status_code == 200
            access_token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Step 2: Check coach access (should have full access as studio user)
            access_response = client.get("/api/v1/coach/access", headers=headers)
            assert access_response.status_code == 200
            assert access_response.json()["has_access"] is True
            
            # Step 3: List brand kits
            bk_response = client.get("/api/v1/brand-kits", headers=headers)
            assert bk_response.status_code == 200
            
            # Step 4: Create generation job with brand kit
            generate_request = {
                "asset_type": "thumbnail",
                "brand_kit_id": brand_kit_id,
                "custom_prompt": "Stream announcement with bold headline and schedule details",
                "brand_customization": {
                    "include_logo": False,
                    "logo_type": "primary",
                    "logo_position": "bottom-right",
                    "logo_size": "medium",
                    "brand_intensity": "balanced",
                },
            }
            
            gen_response = client.post(
                "/api/v1/generate",
                json=generate_request,
                headers=headers,
            )
            assert gen_response.status_code == 201
            job_data = gen_response.json()
            assert job_data["status"] == "queued"
            assert job_data["asset_type"] == "thumbnail"


# =============================================================================
# TestBrandCustomizationParameters - Brand Customization Tests
# =============================================================================

class TestBrandCustomizationParameters:
    """Tests for brand customization parameters in generation."""
    
    def test_generation_with_logo_options(self, mock_settings):
        """Test generation with logo customization options."""
        from backend.services.generation_service import GenerationJob, JobStatus
        
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit, \
             patch("backend.workers.generation_worker.enqueue_generation_job") as mock_enqueue:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            mock_audit.return_value = AsyncMock()
            mock_enqueue.return_value = None
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="logo_test@example.com",
                password_hash=password_hash,
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            # Setup generation service mock
            brand_kit_id = str(uuid.uuid4())
            job_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)
            
            mock_job = GenerationJob(
                id=job_id,
                user_id=user_id,
                brand_kit_id=brand_kit_id,
                asset_type="thumbnail",
                status=JobStatus.QUEUED,
                prompt="Gaming highlight with logo",
                progress=0,
                error_message=None,
                parameters={"include_logo": True, "logo_type": "primary", "logo_position": "top-right", "logo_size": "large", "brand_intensity": "strong"},
                created_at=now,
                updated_at=now,
                completed_at=None,
            )
            
            mock_gen_service = MagicMock()
            mock_gen_service.create_job = AsyncMock(return_value=mock_job)
            
            import backend.services.auth_service as auth_module
            import backend.services.generation_service as gen_module
            auth_module._auth_service = None
            # Set the singleton to our mock
            gen_module._generation_service = mock_gen_service
            
            app = create_app()
            client = TestClient(app)
            
            # Login
            login_response = client.post("/api/v1/auth/login", json={
                "email": user_row["email"],
                "password": test_password,
            })
            assert login_response.status_code == 200
            access_token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Create generation with logo options
            generate_request = {
                "asset_type": "thumbnail",
                "brand_kit_id": brand_kit_id,
                "custom_prompt": "Gaming highlight with logo",
                "brand_customization": {
                    "include_logo": True,
                    "logo_type": "primary",
                    "logo_position": "top-right",
                    "logo_size": "large",
                    "brand_intensity": "strong",
                },
            }
            
            response = client.post(
                "/api/v1/generate",
                json=generate_request,
                headers=headers,
            )
            
            assert response.status_code == 201
            data = response.json()
            assert data["status"] == "queued"
    
    def test_generation_with_all_brand_intensities(self, mock_settings):
        """Test generation with different brand intensity levels."""
        from backend.services.generation_service import GenerationJob, JobStatus
        
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit, \
             patch("backend.workers.generation_worker.enqueue_generation_job") as mock_enqueue:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            mock_audit.return_value = AsyncMock()
            mock_enqueue.return_value = None
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="intensity_test@example.com",
                password_hash=password_hash,
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            brand_kit_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)
            
            # Setup generation service mock
            mock_gen_service = MagicMock()
            
            import backend.services.auth_service as auth_module
            import backend.services.generation_service as gen_module
            auth_module._auth_service = None
            # Set the singleton to our mock
            gen_module._generation_service = mock_gen_service
            
            app = create_app()
            client = TestClient(app)
            
            # Login
            login_response = client.post("/api/v1/auth/login", json={
                "email": user_row["email"],
                "password": test_password,
            })
            assert login_response.status_code == 200
            access_token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Test all brand intensities
            intensities = ["subtle", "balanced", "strong"]
            
            for intensity in intensities:
                job_id = str(uuid.uuid4())
                mock_job = GenerationJob(
                    id=job_id,
                    user_id=user_id,
                    brand_kit_id=brand_kit_id,
                    asset_type="thumbnail",
                    status=JobStatus.QUEUED,
                    prompt=f"Test with {intensity} intensity",
                    progress=0,
                    error_message=None,
                    parameters={"brand_intensity": intensity},
                    created_at=now,
                    updated_at=now,
                    completed_at=None,
                )
                mock_gen_service.create_job = AsyncMock(return_value=mock_job)
                
                generate_request = {
                    "asset_type": "thumbnail",
                    "brand_kit_id": brand_kit_id,
                    "custom_prompt": f"Test with {intensity} intensity",
                    "brand_customization": {
                        "include_logo": False,
                        "brand_intensity": intensity,
                    },
                }
                
                response = client.post(
                    "/api/v1/generate",
                    json=generate_request,
                    headers=headers,
                )
                
                assert response.status_code == 201, f"Failed for intensity: {intensity}"


# =============================================================================
# TestAssetTypeValidation - Asset Type Tests
# =============================================================================

class TestAssetTypeValidation:
    """Tests for asset type validation in generation."""
    
    def test_all_asset_types_accepted(self, mock_settings):
        """Test that all valid asset types are accepted."""
        from backend.services.generation_service import GenerationJob, JobStatus
        
        asset_types = ["thumbnail", "overlay", "banner", "story_graphic", "clip_cover"]
        
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit, \
             patch("backend.workers.generation_worker.enqueue_generation_job") as mock_enqueue:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            mock_audit.return_value = AsyncMock()
            mock_enqueue.return_value = None
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="asset_types@example.com",
                password_hash=password_hash,
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            brand_kit_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)
            
            # Setup generation service mock
            mock_gen_service = MagicMock()
            
            import backend.services.auth_service as auth_module
            import backend.services.generation_service as gen_module
            auth_module._auth_service = None
            # Set the singleton to our mock
            gen_module._generation_service = mock_gen_service
            
            app = create_app()
            client = TestClient(app)
            
            # Login
            login_response = client.post("/api/v1/auth/login", json={
                "email": user_row["email"],
                "password": test_password,
            })
            assert login_response.status_code == 200
            access_token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            
            for asset_type in asset_types:
                job_id = str(uuid.uuid4())
                mock_job = GenerationJob(
                    id=job_id,
                    user_id=user_id,
                    brand_kit_id=brand_kit_id,
                    asset_type=asset_type,
                    status=JobStatus.QUEUED,
                    prompt=f"Test {asset_type}",
                    progress=0,
                    error_message=None,
                    parameters={},
                    created_at=now,
                    updated_at=now,
                    completed_at=None,
                )
                mock_gen_service.create_job = AsyncMock(return_value=mock_job)
                
                generate_request = {
                    "asset_type": asset_type,
                    "brand_kit_id": brand_kit_id,
                    "custom_prompt": f"Test {asset_type}",
                }
                
                response = client.post(
                    "/api/v1/generate",
                    json=generate_request,
                    headers=headers,
                )
                
                assert response.status_code == 201, f"Failed for asset type: {asset_type}"
                assert response.json()["asset_type"] == asset_type


__all__ = [
    "TestUserAuthentication",
    "TestBrandKitFlow",
    "TestCoachAccessFlow",
    "TestGenerationFlow",
    "TestCoachToGenerateFlow",
    "TestBrandCustomizationParameters",
    "TestAssetTypeValidation",
]
