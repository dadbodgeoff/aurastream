"""
Unit tests for authentication endpoints.

Tests all auth endpoints with mocked dependencies:
- POST /api/v1/auth/signup
- POST /api/v1/auth/login
- POST /api/v1/auth/logout
- POST /api/v1/auth/refresh
- GET /api/v1/auth/me

All tests use mocked Supabase client to avoid real database calls.
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from datetime import datetime, timedelta, timezone
import uuid

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


def create_mock_user_row(
    user_id=None,
    email="test@example.com",
    display_name="Test User",
    password_hash=None,
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
        "display_name": display_name,
        "avatar_url": None,
        "subscription_tier": "free",
        "subscription_status": "none",
        "assets_generated_this_month": 0,
        "created_at": now,
        "updated_at": now,
    }


def setup_mock_supabase(mock_supabase, user_exists=False, user_row=None):
    """
    Setup mock Supabase client with chainable methods.
    
    Args:
        mock_supabase: The mock for get_supabase_client
        user_exists: Whether to simulate an existing user
        user_row: Optional user row to return for queries
    """
    mock_client = MagicMock()
    mock_supabase.return_value = mock_client
    
    # Setup chainable mock for table operations
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    
    # Select chain
    mock_select = MagicMock()
    mock_table.select.return_value = mock_select
    mock_eq = MagicMock()
    mock_select.eq.return_value = mock_eq
    
    # Execute for select
    mock_execute = MagicMock()
    mock_eq.execute.return_value = mock_execute
    
    if user_exists and user_row:
        mock_execute.data = [user_row]
    else:
        mock_execute.data = []
    
    # Insert chain
    mock_insert = MagicMock()
    mock_table.insert.return_value = mock_insert
    mock_insert_execute = MagicMock()
    mock_insert.execute.return_value = mock_insert_execute
    
    if user_row:
        mock_insert_execute.data = [user_row]
    else:
        mock_insert_execute.data = [create_mock_user_row()]
    
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
def jwt_service():
    """Create JWT service for testing."""
    return JWTService(secret_key=TEST_SECRET_KEY)


@pytest.fixture
def test_user_data():
    """Generate test user data."""
    return {
        "email": "test@example.com",
        "password": "SecurePass123!",
        "display_name": "Test User",
        "accept_terms": True,
        "terms_version": "1.0.0",
        "privacy_version": "1.0.0"
    }


# =============================================================================
# TestSignupEndpoint
# =============================================================================

class TestSignupEndpoint:
    """Tests for POST /api/v1/auth/signup"""
    
    def test_signup_success(self, test_user_data):
        """Test successful user registration."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            user_row = create_mock_user_row(
                email=test_user_data["email"],
                display_name=test_user_data["display_name"],
            )
            mock_client = setup_mock_supabase(mock_supabase, user_exists=False, user_row=user_row)
            
            # Reset singletons
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            response = client.post("/api/v1/auth/signup", json=test_user_data)
            
            assert response.status_code == 201
            data = response.json()
            assert "user" in data
            assert data["user"]["email"] == test_user_data["email"]
            assert data["user"]["display_name"] == test_user_data["display_name"]
            assert "message" in data
    
    def test_signup_email_exists(self, test_user_data):
        """Test signup with existing email returns 409."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            existing_user = create_mock_user_row(email=test_user_data["email"])
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=existing_user)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            response = client.post("/api/v1/auth/signup", json=test_user_data)
            
            assert response.status_code == 409
            data = response.json()
            # The error structure is {"error": "HTTPException", "message": {"error": {...}}}
            assert "message" in data
            assert data["message"]["error"]["code"] == "AUTH_EMAIL_EXISTS"
    
    def test_signup_weak_password(self):
        """Test signup with weak password returns 422."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            setup_mock_supabase(mock_supabase, user_exists=False)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            weak_password_data = {
                "email": "test@example.com",
                "password": "weak",  # Too short, no uppercase, no digit
                "display_name": "Test User"
            }
            
            response = client.post("/api/v1/auth/signup", json=weak_password_data)
            
            # Pydantic validation catches short password first
            assert response.status_code == 422
    
    def test_signup_invalid_email(self):
        """Test signup with invalid email format returns 422."""
        from backend.api.main import create_app
        app = create_app()
        client = TestClient(app)
        
        invalid_data = {
            "email": "not-an-email",
            "password": "SecurePass123!",
            "display_name": "Test User"
        }
        
        response = client.post("/api/v1/auth/signup", json=invalid_data)
        assert response.status_code == 422
    
    def test_signup_missing_fields(self):
        """Test signup with missing required fields returns 422."""
        from backend.api.main import create_app
        app = create_app()
        client = TestClient(app)
        
        incomplete_data = {
            "email": "test@example.com",
            "display_name": "Test User"
            # Missing password
        }
        
        response = client.post("/api/v1/auth/signup", json=incomplete_data)
        assert response.status_code == 422
    
    def test_signup_empty_display_name(self):
        """Test signup with empty display name returns 422."""
        from backend.api.main import create_app
        app = create_app()
        client = TestClient(app)
        
        invalid_data = {
            "email": "test@example.com",
            "password": "SecurePass123!",
            "display_name": ""
        }
        
        response = client.post("/api/v1/auth/signup", json=invalid_data)
        assert response.status_code == 422
    
    def test_signup_display_name_too_long(self):
        """Test signup with display name exceeding max length returns 422."""
        from backend.api.main import create_app
        app = create_app()
        client = TestClient(app)
        
        invalid_data = {
            "email": "test@example.com",
            "password": "SecurePass123!",
            "display_name": "A" * 51  # Max is 50
        }
        
        response = client.post("/api/v1/auth/signup", json=invalid_data)
        assert response.status_code == 422
    
    def test_signup_password_too_short(self):
        """Test signup with password shorter than 8 characters returns 422."""
        from backend.api.main import create_app
        app = create_app()
        client = TestClient(app)
        
        invalid_data = {
            "email": "test@example.com",
            "password": "Short1",  # Less than 8 chars
            "display_name": "Test User"
        }
        
        response = client.post("/api/v1/auth/signup", json=invalid_data)
        assert response.status_code == 422


# =============================================================================
# TestLoginEndpoint
# =============================================================================

class TestLoginEndpoint:
    """Tests for POST /api/v1/auth/login"""
    
    def test_login_success(self, test_user_data, mock_settings):
        """Test successful login returns tokens and sets cookie."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.api.routes.auth.get_settings") as mock_get_settings:
            
            mock_get_settings.return_value = mock_settings
            
            # Create user with hashed password
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            password_hash = password_svc.hash_password(test_user_data["password"])
            
            user_row = create_mock_user_row(
                email=test_user_data["email"],
                password_hash=password_hash,
            )
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            login_data = {
                "email": test_user_data["email"],
                "password": test_user_data["password"],
                "remember_me": False
            }
            
            response = client.post("/api/v1/auth/login", json=login_data)
            
            assert response.status_code == 200
            data = response.json()
            assert "access_token" in data
            assert "refresh_token" in data
            assert "token_type" in data
            assert data["token_type"] == "bearer"
            assert "expires_at" in data
            assert "user" in data
            assert data["user"]["email"] == test_user_data["email"]
            
            # Check that cookie was set
            assert "access_token" in response.cookies
    
    def test_login_wrong_password(self, test_user_data):
        """Test login with wrong password returns 401."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            # Create user with different password
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            password_hash = password_svc.hash_password("DifferentPassword123!")
            
            user_row = create_mock_user_row(
                email=test_user_data["email"],
                password_hash=password_hash,
            )
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            login_data = {
                "email": test_user_data["email"],
                "password": "WrongPassword123!",
            }
            
            response = client.post("/api/v1/auth/login", json=login_data)
            
            assert response.status_code == 401
            data = response.json()
            assert "message" in data
            assert data["message"]["error"]["code"] == "AUTH_INVALID_CREDENTIALS"
    
    def test_login_user_not_found(self, test_user_data):
        """Test login with non-existent email returns 401."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            setup_mock_supabase(mock_supabase, user_exists=False)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            login_data = {
                "email": "nonexistent@example.com",
                "password": "SecurePass123!",
            }
            
            response = client.post("/api/v1/auth/login", json=login_data)
            
            assert response.status_code == 401
            data = response.json()
            assert "message" in data
            assert data["message"]["error"]["code"] == "AUTH_INVALID_CREDENTIALS"
    
    def test_login_remember_me(self, test_user_data, mock_settings):
        """Test login with remember_me extends token expiration."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.api.routes.auth.get_settings") as mock_get_settings:
            
            mock_get_settings.return_value = mock_settings
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            password_hash = password_svc.hash_password(test_user_data["password"])
            
            user_row = create_mock_user_row(
                email=test_user_data["email"],
                password_hash=password_hash,
            )
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            # Login without remember_me
            login_data_normal = {
                "email": test_user_data["email"],
                "password": test_user_data["password"],
                "remember_me": False,
            }
            response_normal = client.post("/api/v1/auth/login", json=login_data_normal)
            assert response_normal.status_code == 200
            expires_normal = datetime.fromisoformat(
                response_normal.json()["expires_at"].replace("Z", "+00:00")
            )
            
            # Login with remember_me
            login_data_remember = {
                "email": test_user_data["email"],
                "password": test_user_data["password"],
                "remember_me": True,
            }
            response_remember = client.post("/api/v1/auth/login", json=login_data_remember)
            assert response_remember.status_code == 200
            expires_remember = datetime.fromisoformat(
                response_remember.json()["expires_at"].replace("Z", "+00:00")
            )
            
            # Remember me should have longer expiration
            assert expires_remember > expires_normal
    
    def test_login_missing_email(self):
        """Test login without email returns 422."""
        from backend.api.main import create_app
        app = create_app()
        client = TestClient(app)
        
        login_data = {"password": "SecurePass123!"}
        response = client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == 422
    
    def test_login_missing_password(self):
        """Test login without password returns 422."""
        from backend.api.main import create_app
        app = create_app()
        client = TestClient(app)
        
        login_data = {"email": "test@example.com"}
        response = client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == 422
    
    def test_login_invalid_email_format(self):
        """Test login with invalid email format returns 422."""
        from backend.api.main import create_app
        app = create_app()
        client = TestClient(app)
        
        login_data = {
            "email": "not-an-email",
            "password": "SecurePass123!",
        }
        response = client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == 422


# =============================================================================
# TestLogoutEndpoint
# =============================================================================

class TestLogoutEndpoint:
    """Tests for POST /api/v1/auth/logout"""
    
    def test_logout_success(self, jwt_service, mock_settings):
        """Test successful logout clears cookie."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            
            mock_get_settings.return_value = mock_settings
            setup_mock_supabase(mock_supabase)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            # Create a valid token
            valid_token = jwt_service.create_access_token(
                user_id=str(uuid.uuid4()),
                tier="free",
                email="test@example.com",
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.post("/api/v1/auth/logout", headers=headers)
            
            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            assert "logged out" in data["message"].lower()
    
    def test_logout_not_authenticated(self, mock_settings):
        """Test logout without auth returns 401."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings:
            mock_get_settings.return_value = mock_settings
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            response = client.post("/api/v1/auth/logout")
            
            assert response.status_code == 401
            data = response.json()
            assert "message" in data
            assert data["message"]["error"]["code"] == "AUTH_REQUIRED"
    
    def test_logout_invalid_token(self, mock_settings):
        """Test logout with invalid token returns 401."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings:
            mock_get_settings.return_value = mock_settings
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            headers = {"Authorization": "Bearer invalid_token_here"}
            response = client.post("/api/v1/auth/logout", headers=headers)
            
            assert response.status_code == 401
    
    def test_logout_expired_token(self, mock_settings):
        """Test logout with expired token returns 401.
        
        Note: This test verifies that expired tokens are rejected.
        The token expiration is tested more thoroughly in property-based tests.
        """
        # Clear the settings cache
        from backend.api.config import get_settings
        get_settings.cache_clear()
        
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings:
            mock_get_settings.return_value = mock_settings
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            # Create JWT service with same secret as mock_settings
            jwt_svc = JWTService(secret_key=mock_settings.JWT_SECRET_KEY)
            
            # Create an expired token (use large negative delta to avoid timezone issues)
            expired_token = jwt_svc.create_access_token(
                user_id=str(uuid.uuid4()),
                tier="free",
                email="test@example.com",
                expires_delta=timedelta(days=-1),  # 1 day ago
            )
            
            headers = {"Authorization": f"Bearer {expired_token}"}
            response = client.post("/api/v1/auth/logout", headers=headers)
            
            # Should be rejected as expired or invalid
            assert response.status_code == 401


# =============================================================================
# TestRefreshEndpoint
# =============================================================================

class TestRefreshEndpoint:
    """Tests for POST /api/v1/auth/refresh"""
    
    def test_refresh_success(self, mock_settings):
        """Test successful token refresh."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            
            user_id = str(uuid.uuid4())
            user_row = create_mock_user_row(user_id=user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            # Create JWT service with same secret as mock_settings
            jwt_svc = JWTService(secret_key=mock_settings.JWT_SECRET_KEY)
            
            # Create a valid refresh token
            refresh_token = jwt_svc.create_refresh_token(user_id=user_id)
            
            refresh_data = {"refresh_token": refresh_token}
            response = client.post("/api/v1/auth/refresh", json=refresh_data)
            
            assert response.status_code == 200
            data = response.json()
            assert "access_token" in data
            assert "token_type" in data
            assert data["token_type"] == "bearer"
            assert "expires_at" in data
    
    def test_refresh_invalid_token(self):
        """Test refresh with invalid token returns 401."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            setup_mock_supabase(mock_supabase)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            refresh_data = {"refresh_token": "invalid_refresh_token"}
            response = client.post("/api/v1/auth/refresh", json=refresh_data)
            
            assert response.status_code == 401
            data = response.json()
            assert "message" in data
            assert data["message"]["error"]["code"] == "AUTH_TOKEN_INVALID"
    
    def test_refresh_expired_token(self, mock_settings):
        """Test refresh with expired token returns 401."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            setup_mock_supabase(mock_supabase)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            # Create JWT service with same secret as mock_settings
            jwt_svc = JWTService(secret_key=mock_settings.JWT_SECRET_KEY)
            
            # Create an expired refresh token (use large negative delta)
            expired_refresh = jwt_svc.create_refresh_token(
                user_id=str(uuid.uuid4()),
                expires_delta=timedelta(days=-1),  # 1 day ago
            )
            
            refresh_data = {"refresh_token": expired_refresh}
            response = client.post("/api/v1/auth/refresh", json=refresh_data)
            
            assert response.status_code == 401
            data = response.json()
            assert "message" in data
            # Could be expired or invalid depending on how the token is processed
            assert data["message"]["error"]["code"] in ["AUTH_TOKEN_EXPIRED", "AUTH_TOKEN_INVALID"]
    
    def test_refresh_missing_token(self):
        """Test refresh without token returns 422."""
        from backend.api.main import create_app
        app = create_app()
        client = TestClient(app)
        
        response = client.post("/api/v1/auth/refresh", json={})
        assert response.status_code == 422
    
    def test_refresh_user_not_found(self, jwt_service):
        """Test refresh when user no longer exists returns 401."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            # User doesn't exist
            setup_mock_supabase(mock_supabase, user_exists=False)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            # Create a valid refresh token for non-existent user
            refresh_token = jwt_service.create_refresh_token(user_id=str(uuid.uuid4()))
            
            refresh_data = {"refresh_token": refresh_token}
            response = client.post("/api/v1/auth/refresh", json=refresh_data)
            
            assert response.status_code == 401


# =============================================================================
# TestMeEndpoint
# =============================================================================

class TestMeEndpoint:
    """Tests for GET /api/v1/auth/me"""
    
    def test_me_success(self, jwt_service, mock_settings):
        """Test getting current user profile."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_id = str(uuid.uuid4())
            user_row = create_mock_user_row(user_id=user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            # Create a valid token
            valid_token = jwt_service.create_access_token(
                user_id=user_id,
                tier="free",
                email=user_row["email"],
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.get("/api/v1/auth/me", headers=headers)
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == user_id
            assert data["email"] == user_row["email"]
            assert data["display_name"] == user_row["display_name"]
            assert data["subscription_tier"] == user_row["subscription_tier"]
    
    def test_me_not_authenticated(self, mock_settings):
        """Test me without auth returns 401."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings:
            mock_get_settings.return_value = mock_settings
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            response = client.get("/api/v1/auth/me")
            
            assert response.status_code == 401
            data = response.json()
            assert "message" in data
            assert data["message"]["error"]["code"] == "AUTH_REQUIRED"
    
    def test_me_invalid_token(self, mock_settings):
        """Test me with invalid token returns 401."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings:
            mock_get_settings.return_value = mock_settings
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            headers = {"Authorization": "Bearer invalid_token_here"}
            response = client.get("/api/v1/auth/me", headers=headers)
            
            assert response.status_code == 401
    
    def test_me_expired_token(self, mock_settings):
        """Test me with expired token returns 401."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings:
            mock_get_settings.return_value = mock_settings
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            # Create JWT service with same secret as mock_settings
            jwt_svc = JWTService(secret_key=mock_settings.JWT_SECRET_KEY)
            
            # Create an expired token (use large negative delta)
            expired_token = jwt_svc.create_access_token(
                user_id=str(uuid.uuid4()),
                tier="free",
                email="test@example.com",
                expires_delta=timedelta(days=-1),  # 1 day ago
            )
            
            headers = {"Authorization": f"Bearer {expired_token}"}
            response = client.get("/api/v1/auth/me", headers=headers)
            
            assert response.status_code == 401
    
    def test_me_user_deleted(self, jwt_service, mock_settings):
        """Test me when user has been deleted returns 404."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            
            mock_get_settings.return_value = mock_settings
            # User doesn't exist
            setup_mock_supabase(mock_supabase, user_exists=False)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            # Create a valid token for non-existent user
            valid_token = jwt_service.create_access_token(
                user_id=str(uuid.uuid4()),
                tier="free",
                email="deleted@example.com",
            )
            
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = client.get("/api/v1/auth/me", headers=headers)
            
            assert response.status_code == 404
    
    def test_me_with_cookie_auth(self, jwt_service, mock_settings):
        """Test me endpoint with cookie-based authentication."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            
            mock_get_settings.return_value = mock_settings
            
            user_id = str(uuid.uuid4())
            user_row = create_mock_user_row(user_id=user_id)
            setup_mock_supabase(mock_supabase, user_exists=True, user_row=user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            # Create a valid token
            valid_token = jwt_service.create_access_token(
                user_id=user_id,
                tier="free",
                email=user_row["email"],
            )
            
            # Set cookie instead of header
            client.cookies.set("access_token", valid_token)
            response = client.get("/api/v1/auth/me")
            
            assert response.status_code == 200
            data = response.json()
            assert data["email"] == user_row["email"]


# =============================================================================
# Additional Edge Case Tests
# =============================================================================

class TestAuthEdgeCases:
    """Additional edge case tests for authentication endpoints."""
    
    def test_signup_special_characters_in_display_name(self, test_user_data):
        """Test signup with allowed special characters in display name."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            user_row = create_mock_user_row(display_name="Test_User-123")
            setup_mock_supabase(mock_supabase, user_exists=False, user_row=user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            test_data = {
                "email": "test@example.com",
                "password": "SecurePass123!",
                "display_name": "Test_User-123",  # Underscores and hyphens allowed
                "accept_terms": True,
                "terms_version": "1.0.0",
                "privacy_version": "1.0.0"
            }
            
            response = client.post("/api/v1/auth/signup", json=test_data)
            assert response.status_code == 201
    
    def test_signup_invalid_special_characters_in_display_name(self):
        """Test signup with invalid special characters in display name."""
        from backend.api.main import create_app
        app = create_app()
        client = TestClient(app)
        
        test_data = {
            "email": "test@example.com",
            "password": "SecurePass123!",
            "display_name": "Test@User!",  # @ and ! not allowed
            "accept_terms": True,
            "terms_version": "1.0.0",
            "privacy_version": "1.0.0"
        }
        
        response = client.post("/api/v1/auth/signup", json=test_data)
        assert response.status_code == 422
    
    def test_content_type_json_required(self):
        """Test that endpoints require JSON content type."""
        from backend.api.main import create_app
        app = create_app()
        client = TestClient(app)
        
        response = client.post(
            "/api/v1/auth/signup",
            data="email=test@example.com&password=SecurePass123!",
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 422
    
    def test_empty_request_body(self):
        """Test endpoints with empty request body."""
        from backend.api.main import create_app
        app = create_app()
        client = TestClient(app)
        
        response = client.post("/api/v1/auth/signup", json={})
        assert response.status_code == 422
    
    def test_null_values_in_request(self):
        """Test endpoints with null values."""
        from backend.api.main import create_app
        app = create_app()
        client = TestClient(app)
        
        test_data = {
            "email": None,
            "password": "SecurePass123!",
            "display_name": "Test User"
        }
        
        response = client.post("/api/v1/auth/signup", json=test_data)
        assert response.status_code == 422
    
    def test_whitespace_only_display_name(self):
        """Test signup with whitespace-only display name."""
        from backend.api.main import create_app
        app = create_app()
        client = TestClient(app)
        
        test_data = {
            "email": "test@example.com",
            "password": "SecurePass123!",
            "display_name": "   "
        }
        
        response = client.post("/api/v1/auth/signup", json=test_data)
        assert response.status_code == 422
    
    def test_extra_fields_ignored(self, test_user_data):
        """Test that extra fields in request are ignored."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            user_row = create_mock_user_row()
            setup_mock_supabase(mock_supabase, user_exists=False, user_row=user_row)
            
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            from backend.api.main import create_app
            app = create_app()
            client = TestClient(app)
            
            test_data = {
                "email": "test@example.com",
                "password": "SecurePass123!",
                "display_name": "Test User",
                "accept_terms": True,
                "terms_version": "1.0.0",
                "privacy_version": "1.0.0",
                "extra_field": "should be ignored",
                "another_extra": 12345
            }
            
            response = client.post("/api/v1/auth/signup", json=test_data)
            assert response.status_code == 201
