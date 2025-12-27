"""
Integration tests for complete authentication flows.

Tests end-to-end flows with mocked database:
- Complete signup → login → access protected → logout flow
- Token refresh flow
- Concurrent login sessions
- Session invalidation

These tests verify the complete authentication workflow
with all components working together.
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import uuid

from backend.api.main import create_app
from backend.services.auth_service import AuthService
from backend.services.jwt_service import JWTService


# =============================================================================
# Test Configuration
# =============================================================================

# Use the same secret key as conftest.py sets in environment
TEST_SECRET_KEY = "test-jwt-secret-key-that-is-at-least-32-characters-long-for-testing"


# =============================================================================
# Helper Functions
# =============================================================================

def create_mock_supabase_response(data):
    """Create a mock Supabase response object."""
    mock_response = MagicMock()
    mock_response.data = data
    return mock_response


def create_mock_user_row(user_id=None, email="test@example.com", password_hash=None):
    """Create a mock database user row."""
    if user_id is None:
        user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    return {
        "id": user_id,
        "email": email,
        "password_hash": password_hash or "$2b$04$mock_hash",
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
    
    mock_insert = MagicMock()
    mock_table.insert.return_value = mock_insert
    mock_insert_execute = MagicMock()
    mock_insert.execute.return_value = mock_insert_execute
    mock_insert_execute.data = [user_row or create_mock_user_row()]
    
    return mock_client


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def test_user_data():
    """Generate unique test user data."""
    unique_id = uuid.uuid4().hex[:8]
    return {
        "email": f"test_{unique_id}@example.com",
        "password": "SecurePass123!",
        "display_name": "Test User"
    }


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


# =============================================================================
# TestAuthenticationFlow
# =============================================================================

class TestAuthenticationFlow:
    """Test complete authentication flows."""
    
    def test_complete_auth_flow(self, test_user_data, mock_settings):
        """
        Test: signup → login → access /me → logout
        
        This test verifies the complete authentication lifecycle.
        """
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings:
            
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            # Create user row with hashed password
            user_id = str(uuid.uuid4())
            password_hash = password_svc.hash_password(test_user_data["password"])
            user_row = create_mock_user_row(
                user_id=user_id,
                email=test_user_data["email"],
                password_hash=password_hash,
            )
            
            mock_client = setup_mock_supabase(mock_supabase, user_exists=False, user_row=user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            # Step 1: Signup
            signup_response = client.post("/api/v1/auth/signup", json=test_user_data)
            assert signup_response.status_code == 201
            signup_data = signup_response.json()
            assert "user" in signup_data
            
            # Step 2: Login
            # Update mock to return user for login
            mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = \
                create_mock_supabase_response([user_row])
            
            login_data = {
                "email": test_user_data["email"],
                "password": test_user_data["password"],
            }
            login_response = client.post("/api/v1/auth/login", json=login_data)
            assert login_response.status_code == 200
            tokens = login_response.json()
            assert "access_token" in tokens
            access_token = tokens["access_token"]
            
            # Step 3: Access /me with token
            headers = {"Authorization": f"Bearer {access_token}"}
            me_response = client.get("/api/v1/auth/me", headers=headers)
            assert me_response.status_code == 200
            me_data = me_response.json()
            assert me_data["email"] == test_user_data["email"]
            
            # Step 4: Logout
            logout_response = client.post("/api/v1/auth/logout", headers=headers)
            assert logout_response.status_code == 200
            assert "logged out" in logout_response.json()["message"].lower()

    
    def test_token_refresh_flow(self, mock_settings):
        """
        Test: login → refresh → access /me
        
        This test verifies that token refresh works correctly.
        """
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings:
            
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            test_password = "SecurePass123!"
            user_id = str(uuid.uuid4())
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                password_hash=password_hash,
            )
            
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            # Step 1: Login
            login_data = {
                "email": user_row["email"],
                "password": test_password,
            }
            login_response = client.post("/api/v1/auth/login", json=login_data)
            assert login_response.status_code == 200
            tokens = login_response.json()
            refresh_token = tokens["refresh_token"]
            
            # Step 2: Refresh token
            refresh_data = {"refresh_token": refresh_token}
            refresh_response = client.post("/api/v1/auth/refresh", json=refresh_data)
            assert refresh_response.status_code == 200
            new_tokens = refresh_response.json()
            assert "access_token" in new_tokens
            new_access_token = new_tokens["access_token"]
            
            # Step 3: Access /me with new token
            headers = {"Authorization": f"Bearer {new_access_token}"}
            me_response = client.get("/api/v1/auth/me", headers=headers)
            assert me_response.status_code == 200
    
    def test_concurrent_sessions(self, mock_settings):
        """
        Test: login from multiple clients, all sessions valid
        
        This test verifies that multiple login sessions can coexist.
        """
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings:
            
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            test_password = "SecurePass123!"
            user_id = str(uuid.uuid4())
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                password_hash=password_hash,
            )
            
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            login_data = {
                "email": user_row["email"],
                "password": test_password,
            }
            
            # Login from "client 1"
            login_response_1 = client.post("/api/v1/auth/login", json=login_data)
            assert login_response_1.status_code == 200
            token_1 = login_response_1.json()["access_token"]
            
            # Login from "client 2"
            login_response_2 = client.post("/api/v1/auth/login", json=login_data)
            assert login_response_2.status_code == 200
            token_2 = login_response_2.json()["access_token"]
            
            # Both tokens should be different (different JTIs)
            assert token_1 != token_2
            
            # Both tokens should be valid
            headers_1 = {"Authorization": f"Bearer {token_1}"}
            headers_2 = {"Authorization": f"Bearer {token_2}"}
            
            me_response_1 = client.get("/api/v1/auth/me", headers=headers_1)
            me_response_2 = client.get("/api/v1/auth/me", headers=headers_2)
            
            assert me_response_1.status_code == 200
            assert me_response_2.status_code == 200

    
    def test_logout_invalidates_session(self, mock_settings):
        """
        Test: login → logout → access /me fails
        
        Note: Currently logout only clears the cookie. Token blacklisting
        is not yet implemented, so the token remains valid until expiration.
        This test documents the current behavior.
        """
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings:
            
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            test_password = "SecurePass123!"
            user_id = str(uuid.uuid4())
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                password_hash=password_hash,
            )
            
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            # Step 1: Login
            login_data = {
                "email": user_row["email"],
                "password": test_password,
            }
            login_response = client.post("/api/v1/auth/login", json=login_data)
            assert login_response.status_code == 200
            access_token = login_response.json()["access_token"]
            
            # Step 2: Logout
            headers = {"Authorization": f"Bearer {access_token}"}
            logout_response = client.post("/api/v1/auth/logout", headers=headers)
            assert logout_response.status_code == 200
            
            # Step 3: Try to access /me
            # Note: Without token blacklisting, the token is still valid
            me_response = client.get("/api/v1/auth/me", headers=headers)
            # Currently returns 200 because token blacklisting is not implemented
            assert me_response.status_code == 200  # TODO: Change to 401 when blacklisting is implemented


# =============================================================================
# TestRememberMe
# =============================================================================

class TestRememberMe:
    """Test remember me functionality."""
    
    def test_remember_me_extends_expiration(self, mock_settings):
        """Test that remember_me flag extends token expiration."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings:
            
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(password_hash=password_hash)
            
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            # Login without remember_me
            login_data_normal = {
                "email": user_row["email"],
                "password": test_password,
                "remember_me": False,
            }
            response_normal = client.post("/api/v1/auth/login", json=login_data_normal)
            assert response_normal.status_code == 200
            expires_normal = datetime.fromisoformat(
                response_normal.json()["expires_at"].replace("Z", "+00:00")
            )
            
            # Login with remember_me
            login_data_remember = {
                "email": user_row["email"],
                "password": test_password,
                "remember_me": True,
            }
            response_remember = client.post("/api/v1/auth/login", json=login_data_remember)
            assert response_remember.status_code == 200
            expires_remember = datetime.fromisoformat(
                response_remember.json()["expires_at"].replace("Z", "+00:00")
            )
            
            # Remember me should have longer expiration (7 days vs 24 hours)
            assert expires_remember > expires_normal


# =============================================================================
# TestCookieAuthentication
# =============================================================================

class TestCookieAuthentication:
    """Test cookie-based authentication."""
    
    def test_login_sets_cookie(self, mock_settings):
        """Test that login sets HTTP-only cookie."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings:
            
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(password_hash=password_hash)
            
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            login_data = {
                "email": user_row["email"],
                "password": test_password,
            }
            response = client.post("/api/v1/auth/login", json=login_data)
            
            assert response.status_code == 200
            assert "access_token" in response.cookies
