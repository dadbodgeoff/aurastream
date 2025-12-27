"""
Integration tests for Prompt Coach flow.

Tests the full coach workflow including:
- Premium tier gating
- Session lifecycle (start → chat → end)
- SSE streaming responses
- Validation in responses
- Tips endpoint for non-premium users
- Grounding triggers
- Session expiry

These tests verify the complete Prompt Coach workflow
with all components working together.
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


def parse_sse_events(response_text: str) -> list:
    """Parse SSE events from response text."""
    events = []
    for line in response_text.split("\n"):
        if line.startswith("data: "):
            try:
                data = json.loads(line[6:])
                events.append(data)
            except json.JSONDecodeError:
                pass
    return events


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
def sample_start_request():
    """Sample StartCoachRequest payload."""
    return {
        "brand_context": {
            "brand_kit_id": "test-kit-123",
            "colors": [
                {"hex": "#FF5733", "name": "Sunset Orange"},
                {"hex": "#3498DB", "name": "Ocean Blue"}
            ],
            "tone": "competitive",
            "fonts": {"headline": "Montserrat", "body": "Inter"},
            "logo_url": None
        },
        "asset_type": "twitch_emote",
        "mood": "hype",
        "game_id": "fortnite",
        "game_name": "Fortnite",
        "description": "Victory royale celebration emote"
    }


@pytest.fixture
def sample_continue_request():
    """Sample ContinueChatRequest payload."""
    return {
        "message": "Make the colors more vibrant and add more energy"
    }


# =============================================================================
# Mock Redis Client
# =============================================================================

class MockRedisClient:
    """Mock Redis client for session storage."""
    
    def __init__(self):
        self._store = {}
        self._ttls = {}
    
    async def get(self, key: str):
        return self._store.get(key)
    
    async def setex(self, key: str, ttl: int, value: str):
        self._store[key] = value
        self._ttls[key] = ttl
    
    async def delete(self, key: str):
        if key in self._store:
            del self._store[key]
            return 1
        return 0
    
    async def expire(self, key: str, ttl: int):
        if key in self._store:
            self._ttls[key] = ttl
            return True
        return False
    
    def clear(self):
        self._store.clear()
        self._ttls.clear()


# =============================================================================
# TestCoachAccess
# =============================================================================

class TestCoachAccess:
    """Tests for coach access checking."""
    
    def test_premium_user_has_full_access(self, mock_settings):
        """Test that premium users have full coach access."""
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
            assert data["upgrade_message"] is None

    
    def test_free_user_has_tips_only(self, mock_settings):
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
                email="free@example.com",
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
            assert data["grounding"] is False
            assert data["upgrade_message"] is not None
            assert "Studio" in data["upgrade_message"]
    
    def test_pro_user_has_tips_only(self, mock_settings):
        """Test that pro users only have tips access (not full coach)."""
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
                email="pro@example.com",
                password_hash=password_hash,
                subscription_tier="pro",
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



# =============================================================================
# TestCoachTips
# =============================================================================

class TestCoachTips:
    """Tests for static tips endpoint."""
    
    def test_tips_available_to_all_users(self, mock_settings):
        """Test that tips are available to all authenticated users."""
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
            response = client.get("/api/v1/coach/tips", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert data["feature"] == "tips_only"
            assert "tips" in data
            assert len(data["tips"]) > 0
    
    def test_tips_include_upgrade_cta(self, mock_settings):
        """Test that tips response includes upgrade CTA."""
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
                email="cta_test@example.com",
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
            response = client.get("/api/v1/coach/tips", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert "upgrade_cta" in data
            assert "title" in data["upgrade_cta"]
            assert "button_text" in data["upgrade_cta"]
    
    def test_tips_filter_by_asset_type(self, mock_settings):
        """Test that tips can be filtered by asset type."""
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
                email="filter_test@example.com",
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
            
            # Get tips for twitch_emote
            response = client.get(
                "/api/v1/coach/tips?asset_type=twitch_emote",
                headers=headers,
            )
            assert response.status_code == 200
            data = response.json()
            assert len(data["tips"]) > 0



# =============================================================================
# TestCoachPremiumGate
# =============================================================================

class TestCoachPremiumGate:
    """Tests for premium tier gating on coach endpoints."""
    
    def test_start_session_requires_premium(self, mock_settings, sample_start_request):
        """Test that starting a session requires premium subscription."""
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
                email="free_start@example.com",
                password_hash=password_hash,
                subscription_tier="free",  # Free user
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
            
            # Try to start session - should get 403
            response = client.post(
                "/api/v1/coach/start",
                json=sample_start_request,
                headers=headers,
            )
            assert response.status_code == 403
            data = response.json()
            assert data["message"]["error"] == "upgrade_required"
            assert "Studio" in data["message"]["message"]
    
    def test_get_session_requires_premium(self, mock_settings):
        """Test that getting session state requires premium subscription."""
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
                email="free_session@example.com",
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
            
            # Try to get session - should get 403
            fake_session_id = str(uuid.uuid4())
            response = client.get(
                f"/api/v1/coach/sessions/{fake_session_id}",
                headers=headers,
            )
            assert response.status_code == 403
    
    def test_end_session_requires_premium(self, mock_settings):
        """Test that ending a session requires premium subscription."""
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
                email="free_end@example.com",
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
            
            # Try to end session - should get 403
            fake_session_id = str(uuid.uuid4())
            response = client.post(
                f"/api/v1/coach/sessions/{fake_session_id}/end",
                headers=headers,
            )
            assert response.status_code == 403



# =============================================================================
# TestCoachSession
# =============================================================================

class TestCoachSession:
    """Tests for coach session lifecycle."""
    
    def test_start_session_creates_session(self, mock_settings, sample_start_request):
        """Test that premium users can start a session and receive SSE stream."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit, \
             patch("backend.services.coach.coach_service.get_session_manager") as mock_get_sm, \
             patch("backend.services.coach.coach_service.get_grounding_strategy") as mock_get_gs, \
             patch("backend.services.coach.coach_service.get_validator") as mock_get_val:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            mock_audit_instance = AsyncMock()
            mock_audit.return_value = mock_audit_instance
            
            # Setup mock session manager
            mock_redis = MockRedisClient()
            from backend.services.coach.session_manager import SessionManager
            from backend.services.coach.models import CoachSession
            
            mock_session_manager = AsyncMock(spec=SessionManager)
            mock_session = CoachSession(
                session_id=str(uuid.uuid4()),
                user_id="test-user",
                brand_context=sample_start_request["brand_context"],
                asset_type=sample_start_request["asset_type"],
                mood=sample_start_request["mood"],
            )
            mock_session_manager.create_with_context.return_value = mock_session
            mock_session_manager.add_message.return_value = mock_session
            mock_session_manager.add_prompt_suggestion.return_value = mock_session
            mock_get_sm.return_value = mock_session_manager
            
            # Setup mock grounding strategy
            from backend.services.coach.grounding import GroundingDecision
            mock_grounding = AsyncMock()
            mock_grounding.should_ground.return_value = GroundingDecision(
                should_ground=False,
                reason="No grounding needed",
            )
            mock_get_gs.return_value = mock_grounding
            
            # Setup mock validator
            from backend.services.coach.validator import ValidationResult
            mock_validator = MagicMock()
            mock_validator.validate.return_value = ValidationResult(
                is_valid=True,
                is_generation_ready=True,
                issues=[],
                quality_score=0.85,
            )
            mock_get_val.return_value = mock_validator
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="premium_start@example.com",
                password_hash=password_hash,
                subscription_tier="studio",
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            import backend.services.auth_service as auth_module
            import backend.services.coach.coach_service as coach_module
            auth_module._auth_service = None
            coach_module._coach_service = None
            
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
            
            # Start session
            response = client.post(
                "/api/v1/coach/start",
                json=sample_start_request,
                headers=headers,
            )
            assert response.status_code == 200
            assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
            
            # Parse SSE events
            events = parse_sse_events(response.text)
            assert len(events) > 0
            
            # Should have token and done events
            event_types = [e["type"] for e in events]
            assert "token" in event_types
            assert "done" in event_types
            
            # Done event should have session_id
            done_event = next(e for e in events if e["type"] == "done")
            assert "session_id" in done_event["metadata"]

    
    def test_continue_chat_requires_valid_session(self, mock_settings, sample_continue_request):
        """Test that continuing chat requires a valid session."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings, \
             patch("backend.services.coach.coach_service.get_session_manager") as mock_get_sm:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            # Setup mock session manager to raise SessionNotFoundError
            from backend.services.coach.session_manager import SessionManager, SessionNotFoundError
            mock_session_manager = AsyncMock(spec=SessionManager)
            mock_session_manager.get_or_raise.side_effect = SessionNotFoundError("test-session")
            mock_get_sm.return_value = mock_session_manager
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="continue_test@example.com",
                password_hash=password_hash,
                subscription_tier="studio",
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            import backend.services.auth_service as auth_module
            import backend.services.coach.coach_service as coach_module
            auth_module._auth_service = None
            coach_module._coach_service = None
            
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
            
            # Try to continue with invalid session
            fake_session_id = str(uuid.uuid4())
            response = client.post(
                f"/api/v1/coach/sessions/{fake_session_id}/messages",
                json=sample_continue_request,
                headers=headers,
            )
            assert response.status_code == 200  # SSE returns 200 with error in stream
            
            # Parse SSE events - should have error
            events = parse_sse_events(response.text)
            assert len(events) > 0
            error_event = events[0]
            assert error_event["type"] == "error"
            assert "not found" in error_event["content"].lower()
    
    def test_end_session_returns_final_prompt(self, mock_settings):
        """Test that ending a session returns the final prompt."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit, \
             patch("backend.services.coach.coach_service.get_session_manager") as mock_get_sm:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            mock_audit_instance = AsyncMock()
            mock_audit.return_value = mock_audit_instance
            
            # Setup mock session manager
            from backend.services.coach.session_manager import SessionManager
            from backend.services.coach.models import CoachSession, PromptSuggestion
            import time
            
            session_id = str(uuid.uuid4())
            mock_session = CoachSession(
                session_id=session_id,
                user_id="test-user",
                brand_context={},
                current_prompt_draft="A vibrant victory emote with orange and blue colors",
                turns_used=3,
                status="ended",
                prompt_history=[
                    PromptSuggestion(version=1, prompt="Initial prompt", timestamp=time.time()),
                    PromptSuggestion(version=2, prompt="Refined prompt", timestamp=time.time()),
                ],
            )
            
            mock_session_manager = AsyncMock(spec=SessionManager)
            mock_session_manager.end.return_value = mock_session
            mock_get_sm.return_value = mock_session_manager
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="end_test@example.com",
                password_hash=password_hash,
                subscription_tier="studio",
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            import backend.services.auth_service as auth_module
            import backend.services.coach.coach_service as coach_module
            auth_module._auth_service = None
            coach_module._coach_service = None
            
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
            
            # End session
            response = client.post(
                f"/api/v1/coach/sessions/{session_id}/end",
                headers=headers,
            )
            assert response.status_code == 200
            data = response.json()
            assert data["session_id"] == session_id
            assert data["final_prompt"] == "A vibrant victory emote with orange and blue colors"
            assert "confidence_score" in data
            assert "keywords" in data
            assert "metadata" in data



# =============================================================================
# TestCoachStreaming
# =============================================================================

class TestCoachStreaming:
    """Tests for SSE streaming responses."""
    
    def test_start_streams_tokens(self, mock_settings, sample_start_request):
        """Test that start endpoint streams tokens via SSE."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit, \
             patch("backend.services.coach.coach_service.get_session_manager") as mock_get_sm, \
             patch("backend.services.coach.coach_service.get_grounding_strategy") as mock_get_gs, \
             patch("backend.services.coach.coach_service.get_validator") as mock_get_val:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            mock_audit_instance = AsyncMock()
            mock_audit.return_value = mock_audit_instance
            
            # Setup mock session manager
            from backend.services.coach.session_manager import SessionManager
            from backend.services.coach.models import CoachSession
            
            mock_session_manager = AsyncMock(spec=SessionManager)
            mock_session = CoachSession(
                session_id=str(uuid.uuid4()),
                user_id="test-user",
                brand_context=sample_start_request["brand_context"],
            )
            mock_session_manager.create_with_context.return_value = mock_session
            mock_session_manager.add_message.return_value = mock_session
            mock_session_manager.add_prompt_suggestion.return_value = mock_session
            mock_get_sm.return_value = mock_session_manager
            
            # Setup mock grounding strategy
            from backend.services.coach.grounding import GroundingDecision
            mock_grounding = AsyncMock()
            mock_grounding.should_ground.return_value = GroundingDecision(
                should_ground=False,
                reason="No grounding needed",
            )
            mock_get_gs.return_value = mock_grounding
            
            # Setup mock validator
            from backend.services.coach.validator import ValidationResult
            mock_validator = MagicMock()
            mock_validator.validate.return_value = ValidationResult(
                is_valid=True,
                is_generation_ready=True,
                issues=[],
                quality_score=0.85,
            )
            mock_get_val.return_value = mock_validator
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="stream_test@example.com",
                password_hash=password_hash,
                subscription_tier="studio",
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            import backend.services.auth_service as auth_module
            import backend.services.coach.coach_service as coach_module
            auth_module._auth_service = None
            coach_module._coach_service = None
            
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
            
            # Start session
            response = client.post(
                "/api/v1/coach/start",
                json=sample_start_request,
                headers=headers,
            )
            assert response.status_code == 200
            
            # Verify SSE format
            assert "text/event-stream" in response.headers["content-type"]
            
            # Parse events
            events = parse_sse_events(response.text)
            
            # Should have token events
            token_events = [e for e in events if e["type"] == "token"]
            assert len(token_events) > 0
            
            # Token events should have content
            for token_event in token_events:
                assert "content" in token_event
    
    def test_stream_includes_validation(self, mock_settings, sample_start_request):
        """Test that stream includes validation results."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit, \
             patch("backend.services.coach.coach_service.get_session_manager") as mock_get_sm, \
             patch("backend.services.coach.coach_service.get_grounding_strategy") as mock_get_gs, \
             patch("backend.services.coach.coach_service.get_validator") as mock_get_val:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            mock_audit_instance = AsyncMock()
            mock_audit.return_value = mock_audit_instance
            
            # Setup mock session manager
            from backend.services.coach.session_manager import SessionManager
            from backend.services.coach.models import CoachSession
            
            mock_session_manager = AsyncMock(spec=SessionManager)
            mock_session = CoachSession(
                session_id=str(uuid.uuid4()),
                user_id="test-user",
                brand_context=sample_start_request["brand_context"],
            )
            mock_session_manager.create_with_context.return_value = mock_session
            mock_session_manager.add_message.return_value = mock_session
            mock_session_manager.add_prompt_suggestion.return_value = mock_session
            mock_get_sm.return_value = mock_session_manager
            
            # Setup mock grounding strategy
            from backend.services.coach.grounding import GroundingDecision
            mock_grounding = AsyncMock()
            mock_grounding.should_ground.return_value = GroundingDecision(
                should_ground=False,
                reason="No grounding needed",
            )
            mock_get_gs.return_value = mock_grounding
            
            # Setup mock validator with specific validation result
            from backend.services.coach.validator import ValidationResult, ValidationIssue, ValidationSeverity
            mock_validator = MagicMock()
            mock_validator.validate.return_value = ValidationResult(
                is_valid=True,
                is_generation_ready=True,
                issues=[
                    ValidationIssue(
                        severity=ValidationSeverity.INFO,
                        code="COULD_ADD_DETAIL",
                        message="Consider adding more specific details",
                        suggestion="Specify the character's expression",
                    )
                ],
                quality_score=0.85,
            )
            mock_get_val.return_value = mock_validator
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="validation_test@example.com",
                password_hash=password_hash,
                subscription_tier="studio",
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            import backend.services.auth_service as auth_module
            import backend.services.coach.coach_service as coach_module
            auth_module._auth_service = None
            coach_module._coach_service = None
            
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
            
            # Start session
            response = client.post(
                "/api/v1/coach/start",
                json=sample_start_request,
                headers=headers,
            )
            assert response.status_code == 200
            
            # Parse events
            events = parse_sse_events(response.text)
            
            # Should have validation event
            validation_events = [e for e in events if e["type"] == "validation"]
            assert len(validation_events) > 0
            
            # Validation event should have metadata
            validation_event = validation_events[0]
            assert "metadata" in validation_event
            assert "is_valid" in validation_event["metadata"]
            assert "quality_score" in validation_event["metadata"]
            assert "issues" in validation_event["metadata"]



# =============================================================================
# TestCoachGrounding
# =============================================================================

class TestCoachGrounding:
    """Tests for grounding triggers (when LLM decides to search)."""
    
    def test_grounding_triggered_for_game_context(self, mock_settings, sample_start_request):
        """Test that grounding is triggered when game context is provided."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit, \
             patch("backend.services.coach.coach_service.get_session_manager") as mock_get_sm, \
             patch("backend.services.coach.coach_service.get_grounding_strategy") as mock_get_gs, \
             patch("backend.services.coach.coach_service.get_validator") as mock_get_val:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            mock_audit_instance = AsyncMock()
            mock_audit.return_value = mock_audit_instance
            
            # Setup mock session manager
            from backend.services.coach.session_manager import SessionManager
            from backend.services.coach.models import CoachSession
            
            mock_session_manager = AsyncMock(spec=SessionManager)
            mock_session = CoachSession(
                session_id=str(uuid.uuid4()),
                user_id="test-user",
                brand_context=sample_start_request["brand_context"],
            )
            mock_session_manager.create_with_context.return_value = mock_session
            mock_session_manager.add_message.return_value = mock_session
            mock_session_manager.add_prompt_suggestion.return_value = mock_session
            mock_get_sm.return_value = mock_session_manager
            
            # Setup mock grounding strategy to trigger grounding
            from backend.services.coach.grounding import GroundingDecision
            mock_grounding = AsyncMock()
            mock_grounding.should_ground.return_value = GroundingDecision(
                should_ground=True,
                reason="Game context requires current season info",
                query="Fortnite current season",
            )
            mock_get_gs.return_value = mock_grounding
            
            # Setup mock validator
            from backend.services.coach.validator import ValidationResult
            mock_validator = MagicMock()
            mock_validator.validate.return_value = ValidationResult(
                is_valid=True,
                is_generation_ready=True,
                issues=[],
                quality_score=0.85,
            )
            mock_get_val.return_value = mock_validator
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="grounding_test@example.com",
                password_hash=password_hash,
                subscription_tier="studio",
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            import backend.services.auth_service as auth_module
            import backend.services.coach.coach_service as coach_module
            auth_module._auth_service = None
            coach_module._coach_service = None
            
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
            
            # Start session with game context
            response = client.post(
                "/api/v1/coach/start",
                json=sample_start_request,
                headers=headers,
            )
            assert response.status_code == 200
            
            # Parse events
            events = parse_sse_events(response.text)
            
            # Should have grounding events
            grounding_events = [e for e in events if e["type"] == "grounding"]
            grounding_complete_events = [e for e in events if e["type"] == "grounding_complete"]
            
            assert len(grounding_events) > 0
            assert len(grounding_complete_events) > 0
            
            # Grounding event should have metadata about what's being searched
            grounding_event = grounding_events[0]
            assert "metadata" in grounding_event
            assert "searching" in grounding_event["metadata"]



# =============================================================================
# TestCoachValidation
# =============================================================================

class TestCoachValidation:
    """Tests for prompt validation in responses."""
    
    def test_validation_included_in_response(self, mock_settings, sample_start_request):
        """Test that validation is included in the response stream."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit, \
             patch("backend.services.coach.coach_service.get_session_manager") as mock_get_sm, \
             patch("backend.services.coach.coach_service.get_grounding_strategy") as mock_get_gs, \
             patch("backend.services.coach.coach_service.get_validator") as mock_get_val:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            mock_audit_instance = AsyncMock()
            mock_audit.return_value = mock_audit_instance
            
            # Setup mock session manager
            from backend.services.coach.session_manager import SessionManager
            from backend.services.coach.models import CoachSession
            
            mock_session_manager = AsyncMock(spec=SessionManager)
            mock_session = CoachSession(
                session_id=str(uuid.uuid4()),
                user_id="test-user",
                brand_context=sample_start_request["brand_context"],
            )
            mock_session_manager.create_with_context.return_value = mock_session
            mock_session_manager.add_message.return_value = mock_session
            mock_session_manager.add_prompt_suggestion.return_value = mock_session
            mock_get_sm.return_value = mock_session_manager
            
            # Setup mock grounding strategy
            from backend.services.coach.grounding import GroundingDecision
            mock_grounding = AsyncMock()
            mock_grounding.should_ground.return_value = GroundingDecision(
                should_ground=False,
                reason="No grounding needed",
            )
            mock_get_gs.return_value = mock_grounding
            
            # Setup mock validator
            from backend.services.coach.validator import ValidationResult
            mock_validator = MagicMock()
            mock_validator.validate.return_value = ValidationResult(
                is_valid=True,
                is_generation_ready=True,
                issues=[],
                quality_score=0.92,
            )
            mock_get_val.return_value = mock_validator
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="validation_included@example.com",
                password_hash=password_hash,
                subscription_tier="studio",
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            import backend.services.auth_service as auth_module
            import backend.services.coach.coach_service as coach_module
            auth_module._auth_service = None
            coach_module._coach_service = None
            
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
            
            # Start session
            response = client.post(
                "/api/v1/coach/start",
                json=sample_start_request,
                headers=headers,
            )
            assert response.status_code == 200
            
            # Parse events
            events = parse_sse_events(response.text)
            
            # Should have validation event
            validation_events = [e for e in events if e["type"] == "validation"]
            assert len(validation_events) > 0
            
            validation = validation_events[0]["metadata"]
            assert validation["is_valid"] is True
            assert validation["is_generation_ready"] is True
            assert validation["quality_score"] == 0.92
    
    def test_validation_catches_missing_elements(self, mock_settings, sample_start_request):
        """Test that validation catches missing elements in prompts."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit, \
             patch("backend.services.coach.coach_service.get_session_manager") as mock_get_sm, \
             patch("backend.services.coach.coach_service.get_grounding_strategy") as mock_get_gs, \
             patch("backend.services.coach.coach_service.get_validator") as mock_get_val:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            mock_audit_instance = AsyncMock()
            mock_audit.return_value = mock_audit_instance
            
            # Setup mock session manager
            from backend.services.coach.session_manager import SessionManager
            from backend.services.coach.models import CoachSession
            
            mock_session_manager = AsyncMock(spec=SessionManager)
            mock_session = CoachSession(
                session_id=str(uuid.uuid4()),
                user_id="test-user",
                brand_context=sample_start_request["brand_context"],
            )
            mock_session_manager.create_with_context.return_value = mock_session
            mock_session_manager.add_message.return_value = mock_session
            mock_session_manager.add_prompt_suggestion.return_value = mock_session
            mock_get_sm.return_value = mock_session_manager
            
            # Setup mock grounding strategy
            from backend.services.coach.grounding import GroundingDecision
            mock_grounding = AsyncMock()
            mock_grounding.should_ground.return_value = GroundingDecision(
                should_ground=False,
                reason="No grounding needed",
            )
            mock_get_gs.return_value = mock_grounding
            
            # Setup mock validator with issues
            from backend.services.coach.validator import (
                ValidationResult,
                ValidationIssue,
                ValidationSeverity,
            )
            mock_validator = MagicMock()
            mock_validator.validate.return_value = ValidationResult(
                is_valid=False,
                is_generation_ready=False,
                issues=[
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="MISSING_SUBJECT",
                        message="Prompt is missing a clear subject",
                        suggestion="Add a specific character or object as the main focus",
                    ),
                    ValidationIssue(
                        severity=ValidationSeverity.WARNING,
                        code="MISSING_STYLE",
                        message="No art style specified",
                        suggestion="Add a style like 'pixel art', 'anime', or 'realistic'",
                    ),
                ],
                quality_score=0.35,
            )
            mock_get_val.return_value = mock_validator
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="validation_issues@example.com",
                password_hash=password_hash,
                subscription_tier="studio",
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            import backend.services.auth_service as auth_module
            import backend.services.coach.coach_service as coach_module
            auth_module._auth_service = None
            coach_module._coach_service = None
            
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
            
            # Start session
            response = client.post(
                "/api/v1/coach/start",
                json=sample_start_request,
                headers=headers,
            )
            assert response.status_code == 200
            
            # Parse events
            events = parse_sse_events(response.text)
            
            # Should have validation event with issues
            validation_events = [e for e in events if e["type"] == "validation"]
            assert len(validation_events) > 0
            
            validation = validation_events[0]["metadata"]
            assert validation["is_valid"] is False
            assert validation["is_generation_ready"] is False
            assert len(validation["issues"]) == 2
            
            # Check issue details
            issue_codes = [i["code"] for i in validation["issues"]]
            assert "MISSING_SUBJECT" in issue_codes
            assert "MISSING_STYLE" in issue_codes



# =============================================================================
# TestCoachSessionExpiry
# =============================================================================

class TestCoachSessionExpiry:
    """Tests for session expiry handling."""
    
    @pytest.mark.skip(reason="Requires Redis to be running or more complex mocking")
    def test_expired_session_returns_410(self, mock_settings):
        """Test that accessing an expired session returns 410 Gone."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings, \
             patch("backend.api.routes.coach.get_session_manager") as mock_get_sm:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            # Setup mock session manager to raise SessionExpiredError
            from backend.services.coach.session_manager import SessionExpiredError
            mock_session_manager = AsyncMock()
            mock_session_manager.get_or_raise = AsyncMock(side_effect=SessionExpiredError("test-session"))
            mock_get_sm.return_value = mock_session_manager
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="expiry_test@example.com",
                password_hash=password_hash,
                subscription_tier="studio",
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            import backend.services.auth_service as auth_module
            import backend.services.coach.session_manager as sm_module
            auth_module._auth_service = None
            sm_module._session_manager = None
            
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
            
            # Try to get expired session
            expired_session_id = str(uuid.uuid4())
            response = client.get(
                f"/api/v1/coach/sessions/{expired_session_id}",
                headers=headers,
            )
            assert response.status_code == 410
            data = response.json()
            assert data["message"]["error"] == "session_expired"
    
    @pytest.mark.skip(reason="Requires Redis to be running or more complex mocking")
    def test_session_not_found_returns_404(self, mock_settings):
        """Test that accessing a non-existent session returns 404."""
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings, \
             patch("backend.api.routes.coach.get_session_manager") as mock_get_sm:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            # Setup mock session manager to raise SessionNotFoundError
            from backend.services.coach.session_manager import SessionNotFoundError
            mock_session_manager = AsyncMock()
            mock_session_manager.get_or_raise = AsyncMock(side_effect=SessionNotFoundError("test-session"))
            mock_get_sm.return_value = mock_session_manager
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="notfound_test@example.com",
                password_hash=password_hash,
                subscription_tier="studio",
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            import backend.services.auth_service as auth_module
            import backend.services.coach.session_manager as sm_module
            auth_module._auth_service = None
            sm_module._session_manager = None
            
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
            
            # Try to get non-existent session
            fake_session_id = str(uuid.uuid4())
            response = client.get(
                f"/api/v1/coach/sessions/{fake_session_id}",
                headers=headers,
            )
            assert response.status_code == 404
            data = response.json()
            assert data["message"]["error"] == "session_not_found"



# =============================================================================
# TestCoachFullFlow
# =============================================================================

class TestCoachFullFlow:
    """Tests for complete coach flow: start → chat → end."""
    
    def test_complete_coach_flow(self, mock_settings, sample_start_request, sample_continue_request):
        """
        Test: start → chat → end flow
        
        This test verifies the complete coach session lifecycle.
        """
        with patch("backend.services.auth_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.auth_service.get_settings") as mock_auth_settings, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit, \
             patch("backend.services.coach.coach_service.get_session_manager") as mock_get_sm, \
             patch("backend.services.coach.coach_service.get_grounding_strategy") as mock_get_gs, \
             patch("backend.services.coach.coach_service.get_validator") as mock_get_val:
            
            mock_auth_settings.return_value = mock_settings
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            mock_audit_instance = AsyncMock()
            mock_audit.return_value = mock_audit_instance
            
            # Setup mock session manager
            from backend.services.coach.session_manager import SessionManager
            from backend.services.coach.models import CoachSession, CoachMessage, PromptSuggestion
            import time
            
            session_id = str(uuid.uuid4())
            mock_session = CoachSession(
                session_id=session_id,
                user_id="test-user",
                brand_context=sample_start_request["brand_context"],
                asset_type=sample_start_request["asset_type"],
                mood=sample_start_request["mood"],
            )
            
            mock_session_manager = AsyncMock(spec=SessionManager)
            mock_session_manager.create_with_context.return_value = mock_session
            mock_session_manager.add_message.return_value = mock_session
            mock_session_manager.add_prompt_suggestion.return_value = mock_session
            
            # For continue_chat
            mock_session_with_history = CoachSession(
                session_id=session_id,
                user_id="test-user",
                brand_context=sample_start_request["brand_context"],
                asset_type=sample_start_request["asset_type"],
                mood=sample_start_request["mood"],
                turns_used=1,
                messages=[
                    CoachMessage(role="user", content="Initial message", timestamp=time.time()),
                    CoachMessage(role="assistant", content="Initial response", timestamp=time.time()),
                ],
                current_prompt_draft="Initial prompt draft",
            )
            mock_session_manager.get_or_raise.return_value = mock_session_with_history
            mock_session_manager.check_limits.return_value = {
                "can_continue": True,
                "turns_remaining": 9,
                "turns_exceeded": False,
                "tokens_in_exceeded": False,
                "tokens_out_exceeded": False,
            }
            
            # For end_session
            mock_session_ended = CoachSession(
                session_id=session_id,
                user_id="test-user",
                brand_context=sample_start_request["brand_context"],
                current_prompt_draft="Final refined prompt with vibrant colors",
                turns_used=2,
                status="ended",
                prompt_history=[
                    PromptSuggestion(version=1, prompt="Initial prompt", timestamp=time.time()),
                    PromptSuggestion(version=2, prompt="Refined prompt", timestamp=time.time()),
                ],
            )
            mock_session_manager.end.return_value = mock_session_ended
            
            mock_get_sm.return_value = mock_session_manager
            
            # Setup mock grounding strategy
            from backend.services.coach.grounding import GroundingDecision
            mock_grounding = AsyncMock()
            mock_grounding.should_ground.return_value = GroundingDecision(
                should_ground=False,
                reason="No grounding needed",
            )
            mock_get_gs.return_value = mock_grounding
            
            # Setup mock validator
            from backend.services.coach.validator import ValidationResult
            mock_validator = MagicMock()
            mock_validator.validate.return_value = ValidationResult(
                is_valid=True,
                is_generation_ready=True,
                issues=[],
                quality_score=0.90,
            )
            mock_get_val.return_value = mock_validator
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="full_flow@example.com",
                password_hash=password_hash,
                subscription_tier="studio",
            )
            
            setup_mock_supabase_for_auth(mock_supabase, user_row)
            
            import backend.services.auth_service as auth_module
            import backend.services.coach.coach_service as coach_module
            auth_module._auth_service = None
            coach_module._coach_service = None
            
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
            
            # Step 2: Start session
            start_response = client.post(
                "/api/v1/coach/start",
                json=sample_start_request,
                headers=headers,
            )
            assert start_response.status_code == 200
            
            start_events = parse_sse_events(start_response.text)
            done_event = next(e for e in start_events if e["type"] == "done")
            received_session_id = done_event["metadata"]["session_id"]
            
            # Step 3: Continue chat
            continue_response = client.post(
                f"/api/v1/coach/sessions/{received_session_id}/messages",
                json=sample_continue_request,
                headers=headers,
            )
            assert continue_response.status_code == 200
            
            continue_events = parse_sse_events(continue_response.text)
            assert any(e["type"] == "token" for e in continue_events)
            assert any(e["type"] == "done" for e in continue_events)
            
            # Step 4: End session
            end_response = client.post(
                f"/api/v1/coach/sessions/{received_session_id}/end",
                headers=headers,
            )
            assert end_response.status_code == 200
            
            end_data = end_response.json()
            assert "final_prompt" in end_data
            assert "confidence_score" in end_data
            assert "keywords" in end_data
            assert "metadata" in end_data
            assert end_data["metadata"]["turns_used"] == 2
            assert end_data["metadata"]["prompt_versions"] == 2


# =============================================================================
# TestCoachErrorHandling
# =============================================================================

class TestCoachErrorHandling:
    """Tests for error handling in coach flows."""
    
    def test_unauthorized_access_without_token(self, mock_settings):
        """Test that coach endpoints require authentication."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings:
            mock_get_settings.return_value = mock_settings
            
            app = create_app()
            client = TestClient(app)
            
            # Try to access coach endpoints without token
            response = client.get("/api/v1/coach/access")
            assert response.status_code == 401
            
            response = client.get("/api/v1/coach/tips")
            assert response.status_code == 401
    
    def test_invalid_start_request_validation(self, mock_settings):
        """Test that invalid start requests are rejected."""
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
                email="validation_error@example.com",
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
            
            # Try to start with invalid request (missing required fields)
            invalid_request = {
                "brand_context": {
                    "brand_kit_id": "test",
                    # Missing colors, tone, fonts
                },
                "asset_type": "twitch_emote",
                "mood": "hype",
                "description": "Test",
            }
            
            response = client.post(
                "/api/v1/coach/start",
                json=invalid_request,
                headers=headers,
            )
            assert response.status_code == 422  # Validation error
    
    def test_custom_mood_requires_custom_mood_field(self, mock_settings):
        """Test that custom mood requires custom_mood field."""
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
                email="custom_mood@example.com",
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
            
            # Try to start with custom mood but no custom_mood field
            request_with_custom_mood = {
                "brand_context": {
                    "brand_kit_id": "test-kit-123",
                    "colors": [{"hex": "#FF5733", "name": "Orange"}],
                    "tone": "competitive",
                    "fonts": {"headline": "Montserrat", "body": "Inter"},
                    "logo_url": None
                },
                "asset_type": "twitch_emote",
                "mood": "custom",  # Custom mood selected
                # custom_mood field is missing
                "description": "Test description",
            }
            
            response = client.post(
                "/api/v1/coach/start",
                json=request_with_custom_mood,
                headers=headers,
            )
            assert response.status_code == 422  # Validation error
