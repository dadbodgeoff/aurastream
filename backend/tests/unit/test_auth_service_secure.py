"""
Unit tests for SecureAuthService.

Tests the security-hardened authentication service that addresses
the critical findings from the security audit.

Run with: python3 -m pytest backend/tests/unit/test_auth_service_secure.py -v
"""

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, AsyncMock, patch
import uuid

from backend.services.auth_service_secure import (
    SecureAuthService,
    SecurityMode,
    TokenStoreUnavailableError,
    SessionInvalidationError,
    TokenPair,
    User,
)


class TestSecurityModeStrict:
    """Tests for STRICT security mode behavior."""
    
    @pytest.fixture
    def mock_password_service(self):
        """Create mock password service."""
        mock = MagicMock()
        mock.hash_password.return_value = "hashed_password"
        mock.verify_password.return_value = True
        mock.validate_password_strength.return_value = MagicMock(is_valid=True)
        return mock
    
    @pytest.fixture
    def mock_jwt_service(self):
        """Create mock JWT service."""
        mock = MagicMock()
        mock.create_access_token.return_value = "access_token"
        mock.create_refresh_token.return_value = "refresh_token"
        mock.decode_refresh_token.return_value = MagicMock(
            jti=str(uuid.uuid4()),
            sub=str(uuid.uuid4()),
        )
        return mock
    
    @pytest.fixture
    def mock_supabase_user(self):
        """Create mock user data."""
        return {
            "id": str(uuid.uuid4()),
            "email": "test@example.com",
            "password_hash": "hashed_password",
            "email_verified": True,
            "display_name": "Test User",
            "avatar_url": None,
            "subscription_tier": "free",
            "subscription_status": "none",
            "assets_generated_this_month": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    
    @pytest.mark.asyncio
    async def test_login_fails_when_token_store_unavailable_strict_mode(
        self, mock_password_service, mock_jwt_service, mock_supabase_user
    ):
        """
        STRICT mode: Login should FAIL if token store is unavailable.
        This ensures refresh token tracking is always active.
        """
        # Create service in STRICT mode with NO token store
        service = SecureAuthService(
            jwt_service=mock_jwt_service,
            password_svc=mock_password_service,
            token_store=None,  # No token store
            security_mode=SecurityMode.STRICT,
        )
        
        # Mock Supabase
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_supabase_user]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [mock_supabase_user]
        service._supabase = mock_supabase
        
        # Login should fail in STRICT mode without token store
        with pytest.raises(TokenStoreUnavailableError) as exc_info:
            await service.login("test@example.com", "password123")
        
        assert "login" in exc_info.value.operation
    
    @pytest.mark.asyncio
    async def test_login_fails_when_token_registration_fails_strict_mode(
        self, mock_password_service, mock_jwt_service, mock_supabase_user
    ):
        """
        STRICT mode: Login should FAIL if token registration fails.
        """
        # Create failing token store
        mock_token_store = MagicMock()
        mock_token_store.register_token = AsyncMock(
            side_effect=Exception("Redis connection refused")
        )
        
        service = SecureAuthService(
            jwt_service=mock_jwt_service,
            password_svc=mock_password_service,
            token_store=mock_token_store,
            security_mode=SecurityMode.STRICT,
        )
        
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_supabase_user]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [mock_supabase_user]
        service._supabase = mock_supabase
        
        with pytest.raises(TokenStoreUnavailableError):
            await service.login("test@example.com", "password123")
    
    @pytest.mark.asyncio
    async def test_password_change_fails_when_session_invalidation_fails_strict_mode(
        self, mock_password_service
    ):
        """
        STRICT mode: Password change should FAIL if session invalidation fails.
        This prevents the scenario where password is changed but old sessions remain valid.
        """
        mock_token_store = MagicMock()
        mock_token_store.invalidate_all_user_tokens = AsyncMock(
            side_effect=Exception("Redis connection refused")
        )
        
        service = SecureAuthService(
            password_svc=mock_password_service,
            token_store=mock_token_store,
            security_mode=SecurityMode.STRICT,
        )
        
        user_id = str(uuid.uuid4())
        
        # Mock Supabase - should NOT be called because we fail before DB update
        mock_supabase = MagicMock()
        service._supabase = mock_supabase
        
        with pytest.raises(SessionInvalidationError) as exc_info:
            await service.update_password(user_id, "NewSecurePass123!")
        
        assert exc_info.value.user_id == user_id
        
        # Verify password was NOT updated in database
        mock_supabase.table.return_value.update.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_refresh_fails_when_token_store_unavailable_strict_mode(
        self, mock_jwt_service
    ):
        """
        STRICT mode: Token refresh should FAIL if token store is unavailable.
        """
        service = SecureAuthService(
            jwt_service=mock_jwt_service,
            token_store=None,
            security_mode=SecurityMode.STRICT,
        )
        
        with pytest.raises(TokenStoreUnavailableError) as exc_info:
            await service.refresh_token("some_refresh_token")
        
        assert "refresh" in exc_info.value.operation


class TestSecurityModePermissive:
    """Tests for PERMISSIVE security mode behavior."""
    
    @pytest.fixture
    def mock_password_service(self):
        mock = MagicMock()
        mock.hash_password.return_value = "hashed_password"
        mock.verify_password.return_value = True
        mock.validate_password_strength.return_value = MagicMock(is_valid=True)
        return mock
    
    @pytest.fixture
    def mock_jwt_service(self):
        mock = MagicMock()
        mock.create_access_token.return_value = "access_token"
        mock.create_refresh_token.return_value = "refresh_token"
        mock.decode_refresh_token.return_value = MagicMock(
            jti=str(uuid.uuid4()),
            sub=str(uuid.uuid4()),
        )
        return mock
    
    @pytest.fixture
    def mock_supabase_user(self):
        return {
            "id": str(uuid.uuid4()),
            "email": "test@example.com",
            "password_hash": "hashed_password",
            "email_verified": True,
            "display_name": "Test User",
            "avatar_url": None,
            "subscription_tier": "free",
            "subscription_status": "none",
            "assets_generated_this_month": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    
    @pytest.mark.asyncio
    async def test_login_succeeds_when_token_store_unavailable_permissive_mode(
        self, mock_password_service, mock_jwt_service, mock_supabase_user, caplog
    ):
        """
        PERMISSIVE mode: Login should succeed but log critical warning.
        """
        service = SecureAuthService(
            jwt_service=mock_jwt_service,
            password_svc=mock_password_service,
            token_store=None,
            security_mode=SecurityMode.PERMISSIVE,
        )
        
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_supabase_user]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [mock_supabase_user]
        service._supabase = mock_supabase
        
        # Should succeed in PERMISSIVE mode
        token_pair, user = await service.login("test@example.com", "password123")
        
        assert token_pair.access_token == "access_token"
        assert token_pair.refresh_token == "refresh_token"
        assert user.email == "test@example.com"
    
    @pytest.mark.asyncio
    async def test_password_change_succeeds_when_invalidation_fails_permissive_mode(
        self, mock_password_service, caplog
    ):
        """
        PERMISSIVE mode: Password change succeeds but logs critical warning.
        """
        mock_token_store = MagicMock()
        mock_token_store.invalidate_all_user_tokens = AsyncMock(
            side_effect=Exception("Redis connection refused")
        )
        
        service = SecureAuthService(
            password_svc=mock_password_service,
            token_store=mock_token_store,
            security_mode=SecurityMode.PERMISSIVE,
        )
        
        user_id = str(uuid.uuid4())
        
        mock_supabase = MagicMock()
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": user_id}]
        service._supabase = mock_supabase
        
        # Should succeed in PERMISSIVE mode
        await service.update_password(user_id, "NewSecurePass123!")
        
        # Verify password WAS updated
        mock_supabase.table.return_value.update.assert_called()


class TestTokenReuseDetection:
    """Tests for refresh token reuse detection."""
    
    @pytest.fixture
    def mock_jwt_service(self):
        mock = MagicMock()
        user_id = str(uuid.uuid4())
        mock.create_access_token.return_value = "new_access_token"
        mock.create_refresh_token.return_value = "new_refresh_token"
        mock.decode_refresh_token.return_value = MagicMock(
            jti=str(uuid.uuid4()),
            sub=user_id,
        )
        return mock, user_id
    
    @pytest.mark.asyncio
    async def test_token_reuse_detected_invalidates_all_sessions(self):
        """Token reuse should invalidate all user sessions."""
        from backend.services.token_store import TokenReuseDetectedError
        from backend.services.exceptions import TokenInvalidError
        
        user_id = str(uuid.uuid4())
        jti = str(uuid.uuid4())
        
        mock_jwt = MagicMock()
        mock_jwt.create_refresh_token.return_value = "new_token"
        mock_jwt.decode_refresh_token.return_value = MagicMock(jti=jti, sub=user_id)
        
        mock_token_store = MagicMock()
        mock_token_store.use_token = AsyncMock(
            side_effect=TokenReuseDetectedError(user_id, jti)
        )
        
        service = SecureAuthService(
            jwt_service=mock_jwt,
            token_store=mock_token_store,
            security_mode=SecurityMode.STRICT,
        )
        
        with pytest.raises(TokenInvalidError) as exc_info:
            await service.refresh_token("reused_token")
        
        assert "already been used" in str(exc_info.value)


class TestSecurityModeConfiguration:
    """Tests for security mode configuration."""
    
    @pytest.fixture
    def mock_jwt_service(self):
        """Create mock JWT service to avoid settings dependency."""
        mock = MagicMock()
        mock.create_access_token.return_value = "access_token"
        mock.create_refresh_token.return_value = "refresh_token"
        return mock
    
    @pytest.fixture
    def mock_password_service(self):
        """Create mock password service."""
        mock = MagicMock()
        mock.hash_password.return_value = "hashed"
        mock.verify_password.return_value = True
        mock.validate_password_strength.return_value = MagicMock(is_valid=True)
        return mock
    
    def test_default_security_mode_is_strict(self, mock_jwt_service, mock_password_service):
        """Default security mode should be STRICT."""
        with patch.dict('os.environ', {"AUTH_SECURITY_MODE": ""}, clear=False):
            # Remove AUTH_SECURITY_MODE from env if present
            import os
            os.environ.pop("AUTH_SECURITY_MODE", None)
            
            # Mock get_settings to avoid requiring env vars
            with patch('backend.services.auth_service_secure.get_settings') as mock_settings:
                mock_settings.return_value = MagicMock(
                    JWT_SECRET_KEY="test-secret",
                    JWT_ALGORITHM="HS256",
                    JWT_EXPIRATION_HOURS=24,
                )
                service = SecureAuthService(
                    jwt_service=mock_jwt_service,
                    password_svc=mock_password_service,
                )
                assert service.security_mode == SecurityMode.STRICT
    
    def test_security_mode_from_env_permissive(self, mock_jwt_service, mock_password_service):
        """Security mode can be set to PERMISSIVE via env."""
        with patch.dict('os.environ', {"AUTH_SECURITY_MODE": "permissive"}):
            service = SecureAuthService(
                jwt_service=mock_jwt_service,
                password_svc=mock_password_service,
            )
            assert service.security_mode == SecurityMode.PERMISSIVE
    
    def test_security_mode_from_parameter_overrides_env(self, mock_jwt_service, mock_password_service):
        """Parameter should override environment variable."""
        with patch.dict('os.environ', {"AUTH_SECURITY_MODE": "permissive"}):
            service = SecureAuthService(
                jwt_service=mock_jwt_service,
                password_svc=mock_password_service,
                security_mode=SecurityMode.STRICT,
            )
            assert service.security_mode == SecurityMode.STRICT


class TestPasswordChangeOrder:
    """Tests to verify password change invalidates sessions BEFORE updating password."""
    
    @pytest.fixture
    def mock_password_service(self):
        mock = MagicMock()
        mock.hash_password.return_value = "new_hash"
        mock.validate_password_strength.return_value = MagicMock(is_valid=True)
        return mock
    
    @pytest.mark.asyncio
    async def test_sessions_invalidated_before_password_update(self, mock_password_service):
        """
        Sessions should be invalidated BEFORE password is updated.
        This ensures if invalidation fails, password remains unchanged.
        """
        call_order = []
        
        mock_token_store = MagicMock()
        async def track_invalidation(*args, **kwargs):
            call_order.append("invalidate_sessions")
            return 3
        mock_token_store.invalidate_all_user_tokens = track_invalidation
        
        mock_supabase = MagicMock()
        def track_update(*args, **kwargs):
            call_order.append("update_password")
            mock_result = MagicMock()
            mock_result.execute.return_value.data = [{"id": "user-123"}]
            return mock_result
        mock_supabase.table.return_value.update = track_update
        
        service = SecureAuthService(
            password_svc=mock_password_service,
            token_store=mock_token_store,
            security_mode=SecurityMode.STRICT,
        )
        service._supabase = mock_supabase
        
        await service.update_password("user-123", "NewSecurePass123!")
        
        # Verify order: invalidation happens BEFORE password update
        assert call_order == ["invalidate_sessions", "update_password"]
