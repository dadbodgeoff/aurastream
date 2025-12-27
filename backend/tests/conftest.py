"""
Pytest configuration and fixtures for Aurastream tests.

This module provides:
- Environment variable setup for testing
- Hypothesis profile configuration
- Common fixtures for JWT, password, and auth services
- Test client and user data fixtures
"""

import os
import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock, AsyncMock

import pytest
from hypothesis import settings, Verbosity

# Set default test environment variables if not already set
# These are only used for testing and should never be used in production
_test_env_defaults = {
    "SUPABASE_URL": "https://test.supabase.co",
    "SUPABASE_ANON_KEY": "test-anon-key-for-testing-only",
    "SUPABASE_SERVICE_ROLE_KEY": "test-service-role-key-for-testing-only",
    "JWT_SECRET_KEY": "test-jwt-secret-key-that-is-at-least-32-characters-long-for-testing",
}

for key, value in _test_env_defaults.items():
    if key not in os.environ:
        os.environ[key] = value

# Configure Hypothesis profiles
settings.register_profile("ci", max_examples=100, deadline=None)
settings.register_profile("dev", max_examples=20, deadline=None)
settings.register_profile("debug", max_examples=10, verbosity=Verbosity.verbose)

# Load profile based on environment
profile = os.getenv("HYPOTHESIS_PROFILE", "dev")
settings.load_profile(profile)


# =============================================================================
# Core Service Fixtures
# =============================================================================

@pytest.fixture
def test_secret_key():
    """Provide a test secret key for JWT tests."""
    return "test-secret-key-for-testing-only-do-not-use-in-production"


@pytest.fixture
def jwt_service(test_secret_key):
    """Provide a configured JWT service for tests."""
    from backend.services.jwt_service import JWTService
    return JWTService(secret_key=test_secret_key)


@pytest.fixture
def password_svc():
    """Provide the password service for tests."""
    from backend.services.password_service import password_service
    return password_service


@pytest.fixture
def fast_password_svc():
    """Provide a fast password service for tests (lower cost factor)."""
    from backend.services.password_service import PasswordService
    return PasswordService(cost_factor=4)


# =============================================================================
# Test Client Fixtures
# =============================================================================

@pytest.fixture
def client():
    """Create test client for API testing."""
    from fastapi.testclient import TestClient
    from backend.api.main import create_app
    app = create_app()
    return TestClient(app)


@pytest.fixture
def app():
    """Create a fresh app instance for each test."""
    from backend.api.main import create_app
    return create_app()


# =============================================================================
# Test Data Fixtures
# =============================================================================

@pytest.fixture
def test_user_data():
    """Generate test user data."""
    return {
        "email": "test@example.com",
        "password": "SecurePass123!",
        "display_name": "Test User"
    }


@pytest.fixture
def unique_test_user_data():
    """Generate unique test user data for each test."""
    unique_id = uuid.uuid4().hex[:8]
    return {
        "email": f"test_{unique_id}@example.com",
        "password": "SecurePass123!",
        "display_name": f"Test User {unique_id}"
    }


@pytest.fixture
def mock_user():
    """Create a mock User object."""
    from backend.services.auth_service import User
    return User(
        id=str(uuid.uuid4()),
        email="test@example.com",
        email_verified=False,
        display_name="Test User",
        avatar_url=None,
        subscription_tier="free",
        subscription_status="none",
        assets_generated_this_month=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )


@pytest.fixture
def mock_pro_user():
    """Create a mock User object with pro subscription."""
    from backend.services.auth_service import User
    return User(
        id=str(uuid.uuid4()),
        email="pro@example.com",
        email_verified=True,
        display_name="Pro User",
        avatar_url="https://example.com/avatar.jpg",
        subscription_tier="pro",
        subscription_status="active",
        assets_generated_this_month=50,
        created_at=datetime.utcnow() - timedelta(days=30),
        updated_at=datetime.utcnow(),
    )


@pytest.fixture
def mock_db_user_row():
    """Create a mock database user row."""
    user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    return {
        "id": user_id,
        "email": "test@example.com",
        "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYWWQQQQQQQQ",
        "email_verified": False,
        "display_name": "Test User",
        "avatar_url": None,
        "subscription_tier": "free",
        "subscription_status": "none",
        "assets_generated_this_month": 0,
        "created_at": now,
        "updated_at": now,
    }


# =============================================================================
# Token Fixtures
# =============================================================================

@pytest.fixture
def mock_token_pair():
    """Create a mock TokenPair object."""
    from backend.services.auth_service import TokenPair
    return TokenPair(
        access_token="mock_access_token_12345",
        refresh_token="mock_refresh_token_67890",
        expires_at=datetime.utcnow() + timedelta(hours=24),
    )


@pytest.fixture
def mock_token_payload(mock_user):
    """Create a mock TokenPayload object."""
    from backend.services.jwt_service import TokenPayload
    return TokenPayload(
        sub=mock_user.id,
        email=mock_user.email,
        tier=mock_user.subscription_tier,
        type="access",
        jti=str(uuid.uuid4()),
        exp=int((datetime.utcnow() + timedelta(hours=24)).timestamp()),
        iat=int(datetime.utcnow().timestamp()),
    )


@pytest.fixture
def valid_access_token(jwt_service, mock_user):
    """Create a valid access token for testing."""
    return jwt_service.create_access_token(
        user_id=mock_user.id,
        tier=mock_user.subscription_tier,
        email=mock_user.email,
    )


@pytest.fixture
def valid_refresh_token(jwt_service, mock_user):
    """Create a valid refresh token for testing."""
    return jwt_service.create_refresh_token(user_id=mock_user.id)


@pytest.fixture
def expired_access_token(jwt_service, mock_user):
    """Create an expired access token for testing."""
    return jwt_service.create_access_token(
        user_id=mock_user.id,
        tier=mock_user.subscription_tier,
        email=mock_user.email,
        expires_delta=timedelta(seconds=-3600),  # Expired 1 hour ago
    )


# =============================================================================
# Auth Service Fixtures
# =============================================================================

@pytest.fixture
def mock_auth_service():
    """Create mocked auth service for unit tests."""
    from backend.services.auth_service import AuthService, User, TokenPair
    
    mock_service = MagicMock(spec=AuthService)
    
    # Setup default return values
    mock_user = User(
        id=str(uuid.uuid4()),
        email="test@example.com",
        email_verified=False,
        display_name="Test User",
        avatar_url=None,
        subscription_tier="free",
        subscription_status="none",
        assets_generated_this_month=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    mock_token_pair = TokenPair(
        access_token="mock_access_token",
        refresh_token="mock_refresh_token",
        expires_at=datetime.utcnow() + timedelta(hours=24),
    )
    
    mock_service.signup = AsyncMock(return_value=mock_user)
    mock_service.login = AsyncMock(return_value=(mock_token_pair, mock_user))
    mock_service.logout = AsyncMock(return_value=None)
    mock_service.refresh_token = AsyncMock(return_value=mock_token_pair)
    mock_service.get_user = AsyncMock(return_value=mock_user)
    mock_service.get_user_by_email = AsyncMock(return_value=mock_user)
    
    return mock_service


@pytest.fixture
def auth_headers(client, test_user_data, mock_user, mock_token_pair):
    """Get auth headers for authenticated requests."""
    from unittest.mock import patch
    
    with patch("backend.api.routes.auth.get_auth_service") as mock_get_service, \
         patch("backend.api.middleware.auth.get_settings") as mock_settings:
        
        # Setup settings
        settings = MagicMock()
        settings.JWT_SECRET_KEY = "test-secret-key-for-testing-only-do-not-use-in-production"
        settings.JWT_ALGORITHM = "HS256"
        settings.JWT_EXPIRATION_HOURS = 24
        settings.is_production = False
        mock_settings.return_value = settings
        
        # Setup auth service
        mock_service = MagicMock()
        mock_service.login = AsyncMock(return_value=(mock_token_pair, mock_user))
        mock_get_service.return_value = mock_service
        
        # Login to get token
        login_data = {
            "email": test_user_data["email"],
            "password": test_user_data["password"],
        }
        response = client.post("/api/v1/auth/login", json=login_data)
        
        if response.status_code == 200:
            token = response.json()["access_token"]
            return {"Authorization": f"Bearer {token}"}
        
        # Fallback: create token directly
        from backend.services.jwt_service import JWTService
        jwt_svc = JWTService(secret_key=settings.JWT_SECRET_KEY)
        token = jwt_svc.create_access_token(
            user_id=mock_user.id,
            tier=mock_user.subscription_tier,
            email=mock_user.email,
        )
        return {"Authorization": f"Bearer {token}"}


# =============================================================================
# Mock Supabase Fixtures
# =============================================================================

@pytest.fixture
def mock_supabase_client():
    """Create a mock Supabase client."""
    mock_client = MagicMock()
    
    # Setup chainable methods
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    
    mock_select = MagicMock()
    mock_table.select.return_value = mock_select
    
    mock_eq = MagicMock()
    mock_select.eq.return_value = mock_eq
    
    mock_execute = MagicMock()
    mock_eq.execute.return_value = mock_execute
    mock_execute.data = []
    
    mock_insert = MagicMock()
    mock_table.insert.return_value = mock_insert
    mock_insert.execute.return_value = mock_execute
    
    return mock_client


def create_mock_supabase_response(data):
    """Helper function to create mock Supabase response."""
    mock_response = MagicMock()
    mock_response.data = data
    return mock_response


# =============================================================================
# Settings Fixtures
# =============================================================================

@pytest.fixture
def mock_settings():
    """Create mock settings for testing."""
    settings = MagicMock()
    settings.JWT_SECRET_KEY = "test-secret-key-for-testing-only-do-not-use-in-production"
    settings.JWT_ALGORITHM = "HS256"
    settings.JWT_EXPIRATION_HOURS = 24
    settings.JWT_REFRESH_EXPIRATION_DAYS = 30
    settings.is_production = False
    settings.DEBUG = True
    settings.APP_ENV = "test"
    settings.allowed_origins_list = ["http://localhost:3000"]
    return settings


# =============================================================================
# Service Reset Fixtures
# =============================================================================

@pytest.fixture(autouse=True)
def reset_service_singletons():
    """Reset all service singletons before each test to ensure test isolation."""
    # Clear settings cache first
    from backend.api.config import get_settings
    get_settings.cache_clear()
    
    # Reset before test
    import backend.services.auth_service as auth_module
    import backend.services.brand_kit_service as bk_module
    import backend.services.generation_service as gen_module
    import backend.services.logo_service as logo_module
    
    auth_module._auth_service = None
    bk_module._brand_kit_service = None
    gen_module._generation_service = None
    logo_module._logo_service = None
    
    # Reset coach service if it exists
    try:
        import backend.services.coach.coach_service as coach_module
        coach_module._coach_service = None
    except (ImportError, AttributeError):
        pass
    
    # Reset session manager if it exists
    try:
        import backend.services.coach.session_manager as sm_module
        sm_module._session_manager = None
    except (ImportError, AttributeError):
        pass
    
    yield
    
    # Reset after test
    auth_module._auth_service = None
    bk_module._brand_kit_service = None
    gen_module._generation_service = None
    logo_module._logo_service = None
    
    # Reset coach service after test
    try:
        import backend.services.coach.coach_service as coach_module
        coach_module._coach_service = None
    except (ImportError, AttributeError):
        pass
    
    # Reset webhook queue service after test
    try:
        import backend.services.webhook_queue as wq_module
        wq_module._webhook_queue = None
    except (ImportError, AttributeError):
        pass
    
    # Clear settings cache after test
    get_settings.cache_clear()
