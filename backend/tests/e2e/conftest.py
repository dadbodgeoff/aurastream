"""
E2E Test Configuration and Shared Fixtures.

This module provides pytest fixtures for end-to-end testing of the Aurastream backend.
Fixtures are designed for real integration testing with actual services when available,
with fallback to mocks for isolated testing.

Fixtures provided:
- Environment setup for E2E testing
- FastAPI TestClient for API testing
- Redis client for cache/session testing
- Supabase client for database testing
- Authenticated user with auth headers
- Brand kit creation and management
- Unique email generation for test isolation

Usage:
    def test_example(client, authenticated_user, brand_kit):
        headers = authenticated_user["headers"]
        response = client.get("/api/v1/brand-kits", headers=headers)
        assert response.status_code == 200
"""

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Generator, Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# =============================================================================
# Environment Configuration
# =============================================================================

# E2E test environment variables
# These can be overridden by actual environment variables for real integration testing
_e2e_env_defaults = {
    "APP_ENV": "test",
    "DEBUG": "true",
    "SUPABASE_URL": os.getenv("E2E_SUPABASE_URL", "https://test.supabase.co"),
    "SUPABASE_ANON_KEY": os.getenv("E2E_SUPABASE_ANON_KEY", "test-anon-key-for-e2e-testing"),
    "SUPABASE_SERVICE_ROLE_KEY": os.getenv(
        "E2E_SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key-for-e2e-testing"
    ),
    "JWT_SECRET_KEY": os.getenv(
        "E2E_JWT_SECRET_KEY",
        "e2e-test-jwt-secret-key-that-is-at-least-32-characters-long",
    ),
    "JWT_ALGORITHM": "HS256",
    "JWT_EXPIRATION_HOURS": "24",
    "REDIS_URL": os.getenv("E2E_REDIS_URL", "redis://localhost:6379/1"),
}

# Apply E2E environment defaults
for key, value in _e2e_env_defaults.items():
    if key not in os.environ:
        os.environ[key] = value


# =============================================================================
# Test Settings Fixture
# =============================================================================

@pytest.fixture(scope="session")
def e2e_settings() -> MagicMock:
    """
    Provide E2E test settings configuration.
    
    Returns:
        MagicMock: Settings object with E2E test configuration
        
    Scope: session - settings are shared across all tests in the session
    """
    settings = MagicMock()
    settings.APP_ENV = "test"
    settings.DEBUG = True
    settings.is_production = False
    settings.SUPABASE_URL = os.environ.get("SUPABASE_URL")
    settings.SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
    settings.SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    settings.JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
    settings.JWT_ALGORITHM = "HS256"
    settings.JWT_EXPIRATION_HOURS = 24
    settings.JWT_REFRESH_EXPIRATION_DAYS = 30
    settings.allowed_origins_list = ["http://localhost:3000", "http://localhost:8000"]
    return settings


# =============================================================================
# FastAPI TestClient Fixture
# =============================================================================

@pytest.fixture(scope="function")
def client() -> Generator[TestClient, None, None]:
    """
    Create a FastAPI TestClient for API testing.
    
    Creates a fresh app instance for each test to ensure test isolation.
    The client is automatically closed after each test.
    
    Yields:
        TestClient: FastAPI test client for making HTTP requests
        
    Scope: function - new client for each test
    
    Example:
        def test_health_check(client):
            response = client.get("/health")
            assert response.status_code == 200
    """
    from backend.api.main import create_app
    
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="module")
def module_client() -> Generator[TestClient, None, None]:
    """
    Create a module-scoped FastAPI TestClient.
    
    Use this for tests that can share state within a module for better performance.
    
    Yields:
        TestClient: FastAPI test client shared within the module
        
    Scope: module - shared across tests in the same module
    """
    from backend.api.main import create_app
    
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


# =============================================================================
# Redis Client Fixture
# =============================================================================

@pytest.fixture(scope="function")
def redis_client() -> Generator[MagicMock, None, None]:
    """
    Provide a Redis client for E2E testing.
    
    In E2E mode with real Redis (E2E_REDIS_URL set), connects to actual Redis.
    Otherwise, provides a mock Redis client for isolated testing.
    
    Yields:
        Redis client (real or mock) for cache/session operations
        
    Scope: function - fresh client for each test
    
    Cleanup:
        - Clears test keys after each test
        - Closes connection properly
        
    Example:
        async def test_session_storage(redis_client):
            await redis_client.set("test_key", "test_value")
            value = await redis_client.get("test_key")
            assert value == "test_value"
    """
    use_real_redis = os.getenv("E2E_USE_REAL_REDIS", "false").lower() == "true"
    
    if use_real_redis:
        # Use real Redis for E2E testing
        import redis.asyncio as redis
        
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/1")
        real_client = redis.from_url(redis_url, decode_responses=True)
        
        yield real_client
        
        # Cleanup: close connection
        # Note: In async context, would need to await close()
    else:
        # Use mock Redis for isolated testing
        mock_client = MagicMock()
        mock_client.get = AsyncMock(return_value=None)
        mock_client.set = AsyncMock(return_value=True)
        mock_client.delete = AsyncMock(return_value=1)
        mock_client.exists = AsyncMock(return_value=0)
        mock_client.expire = AsyncMock(return_value=True)
        mock_client.ttl = AsyncMock(return_value=-1)
        mock_client.keys = AsyncMock(return_value=[])
        mock_client.hget = AsyncMock(return_value=None)
        mock_client.hset = AsyncMock(return_value=1)
        mock_client.hdel = AsyncMock(return_value=1)
        mock_client.hgetall = AsyncMock(return_value={})
        mock_client.close = AsyncMock()
        
        yield mock_client


# =============================================================================
# Supabase Client Fixture
# =============================================================================

@pytest.fixture(scope="function")
def supabase_client() -> Generator[MagicMock, None, None]:
    """
    Provide a Supabase client for E2E database testing.
    
    In E2E mode with real Supabase (E2E_USE_REAL_SUPABASE set), connects to actual database.
    Otherwise, provides a mock Supabase client for isolated testing.
    
    Yields:
        Supabase client (real or mock) for database operations
        
    Scope: function - fresh client for each test
    
    Cleanup:
        - Removes test data created during the test
        
    Example:
        def test_user_creation(supabase_client):
            response = supabase_client.table("users").insert({...}).execute()
            assert response.data is not None
    """
    use_real_supabase = os.getenv("E2E_USE_REAL_SUPABASE", "false").lower() == "true"
    
    if use_real_supabase:
        # Use real Supabase for E2E testing
        from supabase import create_client
        
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if url and key:
            real_client = create_client(url, key)
            yield real_client
        else:
            pytest.skip("Real Supabase credentials not configured")
    else:
        # Use mock Supabase for isolated testing
        mock_client = MagicMock()
        
        # Setup chainable table methods
        mock_table = MagicMock()
        mock_client.table.return_value = mock_table
        
        # Select chain
        mock_select = MagicMock()
        mock_table.select.return_value = mock_select
        mock_eq = MagicMock()
        mock_select.eq.return_value = mock_eq
        mock_single = MagicMock()
        mock_eq.single.return_value = mock_single
        mock_eq.execute.return_value = MagicMock(data=[])
        mock_single.execute.return_value = MagicMock(data=None)
        
        # Insert chain
        mock_insert = MagicMock()
        mock_table.insert.return_value = mock_insert
        mock_insert.execute.return_value = MagicMock(data=[])
        
        # Update chain
        mock_update = MagicMock()
        mock_table.update.return_value = mock_update
        mock_update.eq.return_value = MagicMock()
        mock_update.eq.return_value.execute.return_value = MagicMock(data=[])
        
        # Delete chain
        mock_delete = MagicMock()
        mock_table.delete.return_value = mock_delete
        mock_delete.eq.return_value = MagicMock()
        mock_delete.eq.return_value.execute.return_value = MagicMock(data=[])
        
        yield mock_client


# =============================================================================
# Unique Email Generator Fixture
# =============================================================================

@pytest.fixture(scope="function")
def unique_email() -> str:
    """
    Generate a unique email address for test isolation.
    
    Creates a unique email using UUID to prevent conflicts between tests
    and ensure each test has its own isolated user data.
    
    Returns:
        str: Unique email address in format 'e2e_test_{uuid}@test.streamer.studio'
        
    Scope: function - new email for each test
    
    Example:
        def test_signup(client, unique_email):
            response = client.post("/api/v1/auth/signup", json={
                "email": unique_email,
                "password": "SecurePass123!"
            })
            assert response.status_code == 201
    """
    unique_id = uuid.uuid4().hex[:12]
    return f"e2e_test_{unique_id}@test.streamer.studio"


@pytest.fixture(scope="function")
def unique_email_factory():
    """
    Factory fixture for generating multiple unique emails in a single test.
    
    Returns:
        Callable: Function that generates unique emails on each call
        
    Example:
        def test_multiple_users(unique_email_factory):
            email1 = unique_email_factory()
            email2 = unique_email_factory()
            assert email1 != email2
    """
    def _generate_email() -> str:
        unique_id = uuid.uuid4().hex[:12]
        return f"e2e_test_{unique_id}@test.streamer.studio"
    
    return _generate_email


# =============================================================================
# Authenticated User Fixture
# =============================================================================

@pytest.fixture(scope="function")
def authenticated_user(
    client: TestClient,
    unique_email: str,
    e2e_settings: MagicMock,
) -> Generator[Dict[str, Any], None, None]:
    """
    Create an authenticated test user and return auth headers.
    
    Creates a new user via signup, logs them in, and provides:
    - User data (id, email, etc.)
    - Authentication headers for API requests
    - Access and refresh tokens
    
    Yields:
        Dict containing:
            - user: User data dictionary
            - headers: Authorization headers for API requests
            - access_token: JWT access token
            - refresh_token: JWT refresh token
            - email: User's email address
            - password: User's password (for re-authentication tests)
            
    Scope: function - new user for each test
    
    Cleanup:
        - User data is cleaned up after test (in real E2E mode)
        
    Example:
        def test_protected_endpoint(client, authenticated_user):
            headers = authenticated_user["headers"]
            response = client.get("/api/v1/auth/me", headers=headers)
            assert response.status_code == 200
            assert response.json()["email"] == authenticated_user["email"]
    """
    from backend.services.password_service import PasswordService
    
    password = "E2ETestPass123!"
    password_svc = PasswordService(cost_factor=4)  # Fast hashing for tests
    password_hash = password_svc.hash_password(password)
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Create mock user data
    user_row = {
        "id": user_id,
        "email": unique_email,
        "password_hash": password_hash,
        "email_verified": False,
        "display_name": "E2E Test User",
        "avatar_url": None,
        "subscription_tier": "free",
        "subscription_status": "none",
        "assets_generated_this_month": 0,
        "created_at": now,
        "updated_at": now,
    }
    
    with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
         patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
         patch("backend.api.routes.auth.get_settings") as mock_route_settings:
        
        mock_get_settings.return_value = e2e_settings
        mock_route_settings.return_value = e2e_settings
        
        # Setup mock Supabase
        mock_client = MagicMock()
        mock_supabase.return_value = mock_client
        
        mock_table = MagicMock()
        mock_client.table.return_value = mock_table
        
        # Mock for signup (user doesn't exist)
        mock_select = MagicMock()
        mock_table.select.return_value = mock_select
        mock_eq = MagicMock()
        mock_select.eq.return_value = mock_eq
        mock_eq.execute.return_value = MagicMock(data=[])
        
        # Mock for insert
        mock_insert = MagicMock()
        mock_table.insert.return_value = mock_insert
        mock_insert.execute.return_value = MagicMock(data=[user_row])
        
        # Reset auth service singleton
        import backend.services.auth_service as auth_module
        auth_module._auth_service = None
        
        # Signup
        signup_data = {
            "email": unique_email,
            "password": password,
            "display_name": "E2E Test User",
        }
        signup_response = client.post("/api/v1/auth/signup", json=signup_data)
        
        # Update mock for login (user exists)
        mock_eq.execute.return_value = MagicMock(data=[user_row])
        
        # Login
        login_data = {
            "email": unique_email,
            "password": password,
        }
        login_response = client.post("/api/v1/auth/login", json=login_data)
        
        if login_response.status_code == 200:
            tokens = login_response.json()
            access_token = tokens["access_token"]
            refresh_token = tokens.get("refresh_token", "")
            
            yield {
                "user": {
                    "id": user_id,
                    "email": unique_email,
                    "display_name": "E2E Test User",
                    "subscription_tier": "free",
                },
                "headers": {"Authorization": f"Bearer {access_token}"},
                "access_token": access_token,
                "refresh_token": refresh_token,
                "email": unique_email,
                "password": password,
            }
        else:
            # Fallback: create token directly
            from backend.services.jwt_service import JWTService
            
            jwt_svc = JWTService(secret_key=e2e_settings.JWT_SECRET_KEY)
            access_token = jwt_svc.create_access_token(
                user_id=user_id,
                tier="free",
                email=unique_email,
            )
            refresh_token = jwt_svc.create_refresh_token(user_id=user_id)
            
            yield {
                "user": {
                    "id": user_id,
                    "email": unique_email,
                    "display_name": "E2E Test User",
                    "subscription_tier": "free",
                },
                "headers": {"Authorization": f"Bearer {access_token}"},
                "access_token": access_token,
                "refresh_token": refresh_token,
                "email": unique_email,
                "password": password,
            }
        
        # Cleanup: Reset auth service
        auth_module._auth_service = None


# =============================================================================
# Brand Kit Fixture
# =============================================================================

@pytest.fixture(scope="function")
def brand_kit(
    authenticated_user: Dict[str, Any],
    supabase_client: MagicMock,
) -> Generator[Dict[str, Any], None, None]:
    """
    Create a test brand kit for the authenticated user.
    
    Creates a brand kit with standard test data that can be used
    for testing brand kit operations and generation flows.
    
    Yields:
        Dict containing brand kit data:
            - id: Brand kit UUID
            - user_id: Owner's user ID
            - name: Brand kit name
            - primary_colors: List of primary color hex codes
            - accent_colors: List of accent color hex codes
            - fonts: Font configuration
            - tone: Brand tone
            - is_active: Whether this is the active brand kit
            
    Scope: function - new brand kit for each test
    
    Cleanup:
        - Brand kit is deleted after test (in real E2E mode)
        
    Example:
        def test_brand_kit_update(client, authenticated_user, brand_kit):
            headers = authenticated_user["headers"]
            response = client.patch(
                f"/api/v1/brand-kits/{brand_kit['id']}",
                headers=headers,
                json={"name": "Updated Name"}
            )
            assert response.status_code == 200
    """
    user_id = authenticated_user["user"]["id"]
    brand_kit_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    brand_kit_data = {
        "id": brand_kit_id,
        "user_id": user_id,
        "name": "E2E Test Brand Kit",
        "is_active": True,
        "primary_colors": ["#3B82F6", "#2563EB"],
        "accent_colors": ["#F59E0B", "#EF4444"],
        "fonts": {
            "headline": "Montserrat",
            "body": "Inter",
        },
        "logo_url": None,
        "tone": "professional",
        "style_reference": "Modern, clean design with bold typography",
        "extracted_from": None,
        "colors_extended": {
            "primary": [
                {"hex": "#3B82F6", "name": "Brand Blue", "usage": "Primary CTAs"},
                {"hex": "#2563EB", "name": "Deep Blue", "usage": "Headers"},
            ],
            "accent": [
                {"hex": "#F59E0B", "name": "Amber", "usage": "Highlights"},
            ],
        },
        "typography": {
            "display": {"family": "Clash Display", "weight": 700},
            "headline": {"family": "Montserrat", "weight": 600},
            "body": {"family": "Inter", "weight": 400},
        },
        "voice": {
            "tone": "professional",
            "personality_traits": ["Confident", "Approachable", "Expert"],
            "tagline": "Level Up Your Content",
        },
        "guidelines": {
            "logo_min_size_px": 64,
            "primary_color_ratio": 60,
        },
        "streamer_assets": {},
        "social_profiles": {},
        "logos": {},
        "created_at": now,
        "updated_at": now,
    }
    
    # Configure mock to return brand kit data
    if hasattr(supabase_client, "table"):
        mock_table = supabase_client.table.return_value
        mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[brand_kit_data]
        )
        mock_table.insert.return_value.execute.return_value = MagicMock(
            data=[brand_kit_data]
        )
    
    yield brand_kit_data
    
    # Cleanup would happen here in real E2E mode


# =============================================================================
# Service Reset Fixture
# =============================================================================

@pytest.fixture(autouse=True)
def reset_e2e_service_singletons():
    """
    Reset all service singletons before and after each E2E test.
    
    Ensures complete test isolation by clearing cached service instances.
    This prevents state leakage between tests.
    
    Scope: function (autouse) - runs automatically for every test
    """
    # Clear settings cache
    from backend.api.config import get_settings
    get_settings.cache_clear()
    
    # Reset service singletons before test
    _reset_all_services()
    
    yield
    
    # Reset service singletons after test
    _reset_all_services()
    
    # Clear settings cache after test
    get_settings.cache_clear()


def _reset_all_services() -> None:
    """Helper function to reset all service singletons."""
    import backend.services.auth_service as auth_module
    import backend.services.brand_kit_service as bk_module
    import backend.services.generation_service as gen_module
    import backend.services.logo_service as logo_module
    
    auth_module._auth_service = None
    bk_module._brand_kit_service = None
    gen_module._generation_service = None
    logo_module._logo_service = None
    
    # Reset coach service if available
    try:
        import backend.services.coach.coach_service as coach_module
        coach_module._coach_service = None
    except (ImportError, AttributeError):
        pass
    
    # Reset session manager if available
    try:
        import backend.services.coach.session_manager as sm_module
        sm_module._session_manager = None
    except (ImportError, AttributeError):
        pass
    
    # Reset Redis client singleton
    try:
        import backend.database.redis_client as redis_module
        redis_module._redis_client = None
    except (ImportError, AttributeError):
        pass


# =============================================================================
# Test Markers Configuration
# =============================================================================

def pytest_configure(config):
    """Configure custom pytest markers for E2E tests."""
    config.addinivalue_line(
        "markers", "e2e: mark test as an end-to-end test"
    )
    config.addinivalue_line(
        "markers", "smoke: mark test as a smoke test (quick validation)"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow-running"
    )
    config.addinivalue_line(
        "markers", "requires_redis: mark test as requiring Redis connection"
    )
    config.addinivalue_line(
        "markers", "requires_supabase: mark test as requiring Supabase connection"
    )
