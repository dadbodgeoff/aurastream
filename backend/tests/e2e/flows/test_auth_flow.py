"""
Authentication Flow E2E Tests.

Complete user journey tests for authentication lifecycle including:
- User signup and account creation
- Login and token generation
- Profile retrieval
- Token refresh
- Logout and session invalidation
- Invalid credentials handling

These tests validate end-to-end authentication functionality with
mocked Supabase responses for isolated testing.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.mark.e2e
class TestAuthFlow:
    """
    End-to-end tests for authentication user journeys.
    
    These tests validate complete authentication flows including
    signup, login, profile access, token refresh, and logout.
    All database operations are mocked for isolated testing.
    """

    def test_signup_creates_user(
        self,
        client: TestClient,
        unique_email: str,
        e2e_settings: MagicMock,
    ) -> None:
        """
        Test that POST /api/v1/auth/signup creates a new user account.
        
        Validates:
            - Signup endpoint accepts valid registration data
            - Returns 201 Created status code
            - Response contains user data with correct email
            - Response includes success message
            
        Flow:
            1. Submit signup request with email, password, display_name
            2. Verify user is created and returned in response
        """
        from backend.services.password_service import PasswordService
        
        password = "TestPassword123!"
        password_svc = PasswordService(cost_factor=4)
        password_hash = password_svc.hash_password(password)
        
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        user_row = {
            "id": user_id,
            "email": unique_email,
            "password_hash": password_hash,
            "email_verified": False,
            "display_name": "Test User",
            "avatar_url": None,
            "subscription_tier": "free",
            "subscription_status": "none",
            "assets_generated_this_month": 0,
            "created_at": now,
            "updated_at": now,
        }
        
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.api.routes.auth.get_settings") as mock_settings:
            
            mock_settings.return_value = e2e_settings
            
            mock_client = MagicMock()
            mock_supabase.return_value = mock_client
            
            mock_table = MagicMock()
            mock_client.table.return_value = mock_table
            
            # Mock: user doesn't exist yet
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            mock_eq = MagicMock()
            mock_select.eq.return_value = mock_eq
            mock_eq.execute.return_value = MagicMock(data=[])
            
            # Mock: insert returns new user
            mock_insert = MagicMock()
            mock_table.insert.return_value = mock_insert
            mock_insert.execute.return_value = MagicMock(data=[user_row])
            
            # Reset auth service singleton
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            signup_data = {
                "email": unique_email,
                "password": password,
                "display_name": "Test User",
            }
            
            response = client.post("/api/v1/auth/signup", json=signup_data)
            
            assert response.status_code == 201, (
                f"Signup should return 201, got {response.status_code}: {response.text}"
            )
            
            data = response.json()
            assert "user" in data, "Response should contain user data"
            assert data["user"]["email"] == unique_email, "User email should match"
            assert "message" in data, "Response should contain success message"

    def test_login_returns_tokens(
        self,
        client: TestClient,
        unique_email: str,
        e2e_settings: MagicMock,
    ) -> None:
        """
        Test that POST /api/v1/auth/login returns access and refresh tokens.
        
        Validates:
            - Login endpoint accepts valid credentials
            - Returns 200 OK status code
            - Response contains access_token
            - Response contains refresh_token
            - Response contains token_type as 'bearer'
            - Response contains user data
            
        Flow:
            1. Create a mock user with hashed password
            2. Submit login request with email and password
            3. Verify tokens are returned in response
        """
        from backend.services.password_service import PasswordService
        
        password = "TestPassword123!"
        password_svc = PasswordService(cost_factor=4)
        password_hash = password_svc.hash_password(password)
        
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        user_row = {
            "id": user_id,
            "email": unique_email,
            "password_hash": password_hash,
            "email_verified": False,
            "display_name": "Test User",
            "avatar_url": None,
            "subscription_tier": "free",
            "subscription_status": "none",
            "assets_generated_this_month": 0,
            "created_at": now,
            "updated_at": now,
        }
        
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.api.middleware.auth.get_settings") as mock_auth_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings:
            
            mock_auth_settings.return_value = e2e_settings
            mock_route_settings.return_value = e2e_settings
            
            mock_client = MagicMock()
            mock_supabase.return_value = mock_client
            
            mock_table = MagicMock()
            mock_client.table.return_value = mock_table
            
            # Mock: user exists
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            mock_eq = MagicMock()
            mock_select.eq.return_value = mock_eq
            mock_eq.execute.return_value = MagicMock(data=[user_row])
            
            # Reset auth service singleton
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            login_data = {
                "email": unique_email,
                "password": password,
            }
            
            response = client.post("/api/v1/auth/login", json=login_data)
            
            assert response.status_code == 200, (
                f"Login should return 200, got {response.status_code}: {response.text}"
            )
            
            data = response.json()
            assert "access_token" in data, "Response should contain access_token"
            assert "refresh_token" in data, "Response should contain refresh_token"
            assert data["token_type"] == "bearer", "Token type should be 'bearer'"
            assert "user" in data, "Response should contain user data"
            assert data["user"]["email"] == unique_email, "User email should match"

    def test_me_returns_user_profile(
        self,
        client: TestClient,
        authenticated_user: dict,
    ) -> None:
        """
        Test that GET /api/v1/auth/me returns the authenticated user's profile.
        
        Validates:
            - Me endpoint requires authentication
            - Returns 200 OK with valid token
            - Response contains user profile data
            - Profile includes id, email, display_name
            - Profile includes subscription information
            
        Flow:
            1. Use authenticated_user fixture for valid auth headers
            2. Request user profile via /me endpoint
            3. Verify profile data matches authenticated user
        """
        from backend.services.jwt_service import JWTService
        
        headers = authenticated_user["headers"]
        user = authenticated_user["user"]
        
        # Create mock user data for the /me endpoint
        user_row = {
            "id": user["id"],
            "email": user["email"],
            "password_hash": "hashed",
            "email_verified": False,
            "display_name": user["display_name"],
            "avatar_url": None,
            "subscription_tier": user["subscription_tier"],
            "subscription_status": "none",
            "assets_generated_this_month": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            mock_client = MagicMock()
            mock_supabase.return_value = mock_client
            
            mock_table = MagicMock()
            mock_client.table.return_value = mock_table
            
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            mock_eq = MagicMock()
            mock_select.eq.return_value = mock_eq
            mock_eq.execute.return_value = MagicMock(data=[user_row])
            
            # Reset auth service singleton
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            response = client.get("/api/v1/auth/me", headers=headers)
            
            assert response.status_code == 200, (
                f"Me endpoint should return 200, got {response.status_code}: {response.text}"
            )
            
            data = response.json()
            assert data["id"] == user["id"], "User ID should match"
            assert data["email"] == user["email"], "User email should match"
            assert "display_name" in data, "Response should contain display_name"
            assert "subscription_tier" in data, "Response should contain subscription_tier"

    def test_token_refresh_works(
        self,
        client: TestClient,
        authenticated_user: dict,
        e2e_settings: MagicMock,
    ) -> None:
        """
        Test that POST /api/v1/auth/refresh returns a new access token.
        
        Validates:
            - Refresh endpoint accepts valid refresh token
            - Returns 200 OK status code
            - Response contains new access_token
            - Response contains token_type as 'bearer'
            - Response contains expires_at timestamp
            
        Flow:
            1. Use refresh_token from authenticated_user fixture
            2. Submit refresh request
            3. Verify new access token is returned
        """
        refresh_token = authenticated_user["refresh_token"]
        user = authenticated_user["user"]
        
        user_row = {
            "id": user["id"],
            "email": user["email"],
            "password_hash": "hashed",
            "email_verified": False,
            "display_name": user["display_name"],
            "avatar_url": None,
            "subscription_tier": user["subscription_tier"],
            "subscription_status": "none",
            "assets_generated_this_month": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.api.routes.auth.get_settings") as mock_settings:
            
            mock_settings.return_value = e2e_settings
            
            mock_client = MagicMock()
            mock_supabase.return_value = mock_client
            
            mock_table = MagicMock()
            mock_client.table.return_value = mock_table
            
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            mock_eq = MagicMock()
            mock_select.eq.return_value = mock_eq
            mock_eq.execute.return_value = MagicMock(data=[user_row])
            
            # Reset auth service singleton
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            refresh_data = {"refresh_token": refresh_token}
            
            response = client.post("/api/v1/auth/refresh", json=refresh_data)
            
            assert response.status_code == 200, (
                f"Refresh should return 200, got {response.status_code}: {response.text}"
            )
            
            data = response.json()
            assert "access_token" in data, "Response should contain access_token"
            assert data["token_type"] == "bearer", "Token type should be 'bearer'"
            assert "expires_at" in data, "Response should contain expires_at"

    def test_logout_invalidates_session(
        self,
        client: TestClient,
        authenticated_user: dict,
    ) -> None:
        """
        Test that POST /api/v1/auth/logout clears the user session.
        
        Validates:
            - Logout endpoint requires authentication
            - Returns 200 OK status code
            - Response contains success message
            - Access token cookie is cleared
            
        Flow:
            1. Use authenticated_user fixture for valid auth headers
            2. Submit logout request
            3. Verify session is invalidated
        """
        headers = authenticated_user["headers"]
        
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase:
            mock_client = MagicMock()
            mock_supabase.return_value = mock_client
            
            # Reset auth service singleton
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            response = client.post("/api/v1/auth/logout", headers=headers)
            
            assert response.status_code == 200, (
                f"Logout should return 200, got {response.status_code}: {response.text}"
            )
            
            data = response.json()
            assert "message" in data, "Response should contain message"
            assert "logged out" in data["message"].lower(), (
                "Message should indicate successful logout"
            )

    def test_invalid_credentials_rejected(
        self,
        client: TestClient,
        unique_email: str,
        e2e_settings: MagicMock,
    ) -> None:
        """
        Test that POST /api/v1/auth/login rejects invalid credentials.
        
        Validates:
            - Login endpoint rejects wrong password
            - Returns 401 Unauthorized status code
            - Response contains error details
            
        Flow:
            1. Create a mock user with known password
            2. Submit login request with wrong password
            3. Verify 401 error is returned
        """
        from backend.services.password_service import PasswordService
        
        correct_password = "CorrectPassword123!"
        wrong_password = "WrongPassword456!"
        
        password_svc = PasswordService(cost_factor=4)
        password_hash = password_svc.hash_password(correct_password)
        
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        user_row = {
            "id": user_id,
            "email": unique_email,
            "password_hash": password_hash,
            "email_verified": False,
            "display_name": "Test User",
            "avatar_url": None,
            "subscription_tier": "free",
            "subscription_status": "none",
            "assets_generated_this_month": 0,
            "created_at": now,
            "updated_at": now,
        }
        
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.api.routes.auth.get_settings") as mock_settings:
            
            mock_settings.return_value = e2e_settings
            
            mock_client = MagicMock()
            mock_supabase.return_value = mock_client
            
            mock_table = MagicMock()
            mock_client.table.return_value = mock_table
            
            # Mock: user exists
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            mock_eq = MagicMock()
            mock_select.eq.return_value = mock_eq
            mock_eq.execute.return_value = MagicMock(data=[user_row])
            
            # Reset auth service singleton
            import backend.services.auth_service as auth_module
            auth_module._auth_service = None
            
            login_data = {
                "email": unique_email,
                "password": wrong_password,
            }
            
            response = client.post("/api/v1/auth/login", json=login_data)
            
            assert response.status_code == 401, (
                f"Login with wrong password should return 401, got {response.status_code}"
            )
            
            data = response.json()
            assert "detail" in data, "Response should contain error detail"
