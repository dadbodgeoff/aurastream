"""
Secure Authentication Service for Aurastream.

This module provides security-hardened authentication operations that
address the critical findings from the security audit:

1. Token store failures are explicit (fail-closed for critical operations)
2. Password change fails if session invalidation fails
3. Configurable security mode (strict vs permissive)

Usage:
    from backend.services.auth_service_secure import get_secure_auth_service
    
    auth_service = get_secure_auth_service()
    # In strict mode, operations fail if Redis is unavailable
"""

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from backend.api.config import get_settings
from backend.services.jwt_service import JWTService, TokenPayload
from backend.services.password_service import PasswordService, password_service as default_password_service
from backend.services.exceptions import (
    InvalidCredentialsError,
    EmailExistsError,
    UserNotFoundError,
    WeakPasswordError,
    TokenInvalidError,
)
from backend.database.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class SecurityMode(Enum):
    """
    Security mode for auth operations.
    
    STRICT: Fail operations if security infrastructure (Redis) is unavailable.
            Recommended for production.
    
    PERMISSIVE: Allow operations to continue with degraded security.
                Logs critical warnings. Use only for development/testing.
    """
    STRICT = "strict"
    PERMISSIVE = "permissive"


class TokenStoreUnavailableError(Exception):
    """Raised when token store is required but unavailable."""
    def __init__(self, operation: str):
        self.operation = operation
        super().__init__(
            f"Token store unavailable during {operation}. "
            "This operation requires Redis for security. "
            "Please ensure Redis is running and accessible."
        )


class SessionInvalidationError(Exception):
    """Raised when session invalidation fails during password change."""
    def __init__(self, user_id: str, reason: str):
        self.user_id = user_id
        self.reason = reason
        super().__init__(
            f"Failed to invalidate sessions for user {user_id}: {reason}. "
            "Password change aborted for security."
        )


@dataclass
class TokenPair:
    """Access and refresh token pair."""
    access_token: str
    refresh_token: str
    expires_at: datetime


@dataclass
class User:
    """User data model (excludes sensitive fields)."""
    id: str
    email: str
    email_verified: bool
    display_name: str
    avatar_url: Optional[str]
    subscription_tier: str
    subscription_status: str
    assets_generated_this_month: int
    terms_accepted_at: Optional[datetime]
    terms_version: Optional[str]
    privacy_accepted_at: Optional[datetime]
    privacy_version: Optional[str]
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime]
    
    @classmethod
    def from_db_row(cls, row: dict) -> "User":
        """Create User from database row."""
        return cls(
            id=row["id"],
            email=row["email"],
            email_verified=row.get("email_verified", False),
            display_name=row["display_name"],
            avatar_url=row.get("avatar_url"),
            subscription_tier=row.get("subscription_tier", "free"),
            subscription_status=row.get("subscription_status", "none"),
            assets_generated_this_month=row.get("assets_generated_this_month", 0),
            terms_accepted_at=_parse_datetime_optional(row.get("terms_accepted_at")),
            terms_version=row.get("terms_version"),
            privacy_accepted_at=_parse_datetime_optional(row.get("privacy_accepted_at")),
            privacy_version=row.get("privacy_version"),
            created_at=_parse_datetime(row["created_at"]),
            updated_at=_parse_datetime(row["updated_at"]),
            last_login_at=_parse_datetime_optional(row.get("last_login_at")),
        )


def _parse_datetime(value) -> datetime:
    """Parse datetime from database value."""
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    raise ValueError(f"Cannot parse datetime from {type(value)}: {value}")


def _parse_datetime_optional(value) -> Optional[datetime]:
    """Parse optional datetime from database value."""
    if value is None:
        return None
    return _parse_datetime(value)


class SecureAuthService:
    """
    Security-hardened authentication service.
    
    Key differences from standard AuthService:
    1. Configurable security mode (strict/permissive)
    2. Token store failures are explicit in strict mode
    3. Password change fails if session invalidation fails
    4. Comprehensive security event logging
    
    Security Features:
    - Refresh token reuse detection (invalidates all sessions on reuse)
    - Token rotation on refresh
    - Redis-backed token tracking (required in strict mode)
    """
    
    def __init__(
        self,
        jwt_service: Optional[JWTService] = None,
        password_svc: Optional[PasswordService] = None,
        token_store=None,
        security_mode: Optional[SecurityMode] = None,
    ):
        """
        Initialize the secure auth service.
        
        Args:
            jwt_service: JWT service instance
            password_svc: Password service instance
            token_store: Token store instance for refresh token tracking
            security_mode: STRICT (fail if Redis unavailable) or PERMISSIVE
        """
        settings = get_settings()
        self.jwt_service = jwt_service or JWTService(
            secret_key=settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )
        self.password_service = password_svc or default_password_service
        self._supabase = None
        self._token_store = token_store
        
        # Determine security mode from env or parameter
        if security_mode is None:
            mode_str = os.getenv("AUTH_SECURITY_MODE", "strict").lower()
            self.security_mode = SecurityMode.STRICT if mode_str == "strict" else SecurityMode.PERMISSIVE
        else:
            self.security_mode = security_mode
        
        logger.info(f"SecureAuthService initialized in {self.security_mode.value} mode")
    
    @property
    def token_store(self):
        """Lazy-load token store."""
        if self._token_store is None:
            try:
                from backend.services.token_store import get_token_store
                self._token_store = get_token_store()
            except Exception as e:
                logger.error(f"Token store initialization failed: {e}")
                return None
        return self._token_store
    
    @property
    def supabase(self):
        """Lazy-load Supabase client."""
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
    def _require_token_store(self, operation: str):
        """
        Ensure token store is available for security-critical operations.
        
        In STRICT mode, raises TokenStoreUnavailableError if Redis is down.
        In PERMISSIVE mode, logs a critical warning and returns False.
        
        Returns:
            True if token store is available, False otherwise (permissive mode only)
        """
        if self.token_store is None:
            if self.security_mode == SecurityMode.STRICT:
                logger.critical(
                    f"SECURITY: Token store unavailable during {operation} in STRICT mode",
                    extra={"operation": operation, "security_mode": "strict"}
                )
                raise TokenStoreUnavailableError(operation)
            else:
                logger.critical(
                    f"SECURITY WARNING: Token store unavailable during {operation}. "
                    f"Operating in PERMISSIVE mode - security features degraded!",
                    extra={"operation": operation, "security_mode": "permissive"}
                )
                return False
        return True
    
    async def signup(
        self,
        email: str,
        password: str,
        display_name: str,
        accept_terms: bool = True,
        terms_version: str = "1.0.0",
        privacy_version: str = "1.0.0",
    ) -> User:
        """Register a new user with email and password."""
        if not accept_terms:
            raise ValueError("You must accept the Terms of Service and Privacy Policy")
        
        email = email.lower().strip()
        display_name = display_name.strip()
        
        validation = self.password_service.validate_password_strength(password)
        if not validation.is_valid:
            raise WeakPasswordError(validation.failed_requirements)
        
        existing = self.supabase.table("users").select("id").eq("email", email).execute()
        if existing.data:
            raise EmailExistsError(email)
        
        password_hash = self.password_service.hash_password(password)
        
        now = datetime.now(timezone.utc).isoformat()
        result = self.supabase.table("users").insert({
            "email": email,
            "password_hash": password_hash,
            "display_name": display_name,
            "email_verified": False,
            "subscription_tier": "free",
            "subscription_status": "none",
            "assets_generated_this_month": 0,
            "terms_accepted_at": now,
            "terms_version": terms_version,
            "privacy_accepted_at": now,
            "privacy_version": privacy_version,
            "created_at": now,
            "updated_at": now,
        }).execute()
        
        if not result.data:
            raise Exception("Failed to create user")
        
        return User.from_db_row(result.data[0])
    
    async def login(
        self,
        email: str,
        password: str,
        remember_me: bool = False
    ) -> Tuple[TokenPair, User]:
        """
        Authenticate user with email and password.
        
        SECURITY: In STRICT mode, fails if token store is unavailable.
        This ensures refresh token tracking is always active.
        """
        email = email.lower().strip()
        
        result = self.supabase.table("users").select("*").eq("email", email).execute()
        
        if not result.data:
            raise InvalidCredentialsError()
        
        user_row = result.data[0]
        
        if not self.password_service.verify_password(password, user_row.get("password_hash", "")):
            raise InvalidCredentialsError()
        
        # Update last_login_at
        now = datetime.now(timezone.utc).isoformat()
        try:
            self.supabase.table("users").update({
                "last_login_at": now,
                "updated_at": now,
            }).eq("id", user_row["id"]).execute()
            user_row["last_login_at"] = now
            user_row["updated_at"] = now
        except Exception as e:
            logger.warning(f"Failed to update last_login_at: {e}")
        
        user = User.from_db_row(user_row)
        
        access_expires = timedelta(hours=168) if remember_me else None
        
        access_token = self.jwt_service.create_access_token(
            user_id=user.id,
            tier=user.subscription_tier,
            email=user.email,
            expires_delta=access_expires,
        )
        
        refresh_token = self.jwt_service.create_refresh_token(user_id=user.id)
        
        settings = get_settings()
        expires_hours = 168 if remember_me else settings.JWT_EXPIRATION_HOURS
        expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_hours)
        
        # Register refresh token - SECURITY CRITICAL
        token_store_available = self._require_token_store("login")
        if token_store_available:
            try:
                refresh_payload = self.jwt_service.decode_refresh_token(refresh_token)
                refresh_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
                await self.token_store.register_token(
                    jti=refresh_payload.jti,
                    user_id=user.id,
                    expires_at=refresh_expires_at,
                )
                logger.info(
                    "Refresh token registered successfully",
                    extra={"user_id": user.id, "jti": refresh_payload.jti}
                )
            except Exception as e:
                if self.security_mode == SecurityMode.STRICT:
                    logger.critical(f"Token registration failed in STRICT mode: {e}")
                    raise TokenStoreUnavailableError("login - token registration")
                else:
                    logger.critical(
                        f"SECURITY WARNING: Token registration failed: {e}. "
                        "Refresh token reuse detection DISABLED for this session!"
                    )
        
        return TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
        ), user
    
    async def logout(self, user_id: str, token_jti: Optional[str] = None) -> None:
        """Log out a user by invalidating their token."""
        if token_jti and self.token_store:
            try:
                await self.token_store.invalidate_token(token_jti)
                logger.info("Token invalidated on logout", extra={"user_id": user_id, "jti": token_jti})
            except Exception as e:
                logger.warning(f"Failed to invalidate token on logout: {e}")

    
    async def refresh_token(self, refresh_token: str) -> TokenPair:
        """
        Generate new access token using refresh token.
        
        SECURITY: Implements refresh token rotation with reuse detection.
        In STRICT mode, requires Redis for reuse detection.
        """
        from backend.services.token_store import TokenReuseDetectedError
        
        payload = self.jwt_service.decode_refresh_token(refresh_token)
        new_refresh_token = self.jwt_service.create_refresh_token(user_id=payload.sub)
        new_refresh_payload = self.jwt_service.decode_refresh_token(new_refresh_token)
        
        # Check for token reuse - SECURITY CRITICAL
        token_store = self.token_store
        if token_store:
            try:
                success, error_reason = await token_store.use_token(
                    jti=payload.jti,
                    user_id=payload.sub,
                    new_jti=new_refresh_payload.jti,
                )
                
                if not success:
                    if error_reason == "invalid":
                        logger.warning(
                            "Refresh token not found in store (legacy token?)",
                            extra={"jti": payload.jti, "user_id": payload.sub}
                        )
                    elif error_reason == "wrong_user":
                        logger.critical("SECURITY ALERT: Token user mismatch")
                        raise TokenInvalidError("Token user mismatch")
                
            except TokenReuseDetectedError as e:
                logger.critical(
                    "SECURITY ALERT: Refresh token reuse detected - all sessions invalidated",
                    extra={"user_id": e.user_id, "jti": e.jti}
                )
                raise TokenInvalidError(
                    "Security alert: This refresh token has already been used. "
                    "All sessions have been invalidated. Please log in again."
                )
            except Exception as e:
                if self.security_mode == SecurityMode.STRICT:
                    logger.critical(f"Token store error in STRICT mode: {e}")
                    raise TokenStoreUnavailableError("refresh - reuse detection")
                else:
                    logger.critical(
                        f"SECURITY WARNING: Token store error during refresh: {e}. "
                        "Reuse detection BYPASSED!"
                    )
        else:
            # No token store available
            self._require_token_store("refresh")
        
        # Get user to ensure they still exist
        result = self.supabase.table("users").select("*").eq("id", payload.sub).execute()
        if not result.data:
            raise UserNotFoundError()
        
        user = User.from_db_row(result.data[0])
        
        access_token = self.jwt_service.create_access_token(
            user_id=user.id,
            tier=user.subscription_tier,
            email=user.email,
        )
        
        # Register new refresh token
        if token_store:
            try:
                refresh_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
                await token_store.register_token(
                    jti=new_refresh_payload.jti,
                    user_id=user.id,
                    expires_at=refresh_expires_at,
                )
            except Exception as e:
                logger.warning(f"Failed to register new refresh token: {e}")
        
        settings = get_settings()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
        
        return TokenPair(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_at=expires_at,
        )
    
    async def update_password(self, user_id: str, new_password: str) -> None:
        """
        Update a user's password.
        
        SECURITY CRITICAL: This operation MUST invalidate all sessions.
        In STRICT mode, fails if session invalidation fails.
        """
        validation = self.password_service.validate_password_strength(new_password)
        if not validation.is_valid:
            raise WeakPasswordError(validation.failed_requirements)
        
        password_hash = self.password_service.hash_password(new_password)
        
        # FIRST: Attempt to invalidate all sessions BEFORE changing password
        # This ensures we don't change the password if we can't invalidate sessions
        token_store_available = self._require_token_store("password_change")
        
        if token_store_available:
            try:
                count = await self.token_store.invalidate_all_user_tokens(user_id)
                logger.info(
                    "Pre-emptively invalidated all user tokens before password change",
                    extra={"user_id": user_id, "invalidated_count": count}
                )
            except Exception as e:
                error_msg = f"Failed to invalidate sessions: {e}"
                if self.security_mode == SecurityMode.STRICT:
                    logger.critical(
                        f"SECURITY: Password change ABORTED - {error_msg}",
                        extra={"user_id": user_id}
                    )
                    raise SessionInvalidationError(user_id, str(e))
                else:
                    logger.critical(
                        f"SECURITY WARNING: {error_msg}. "
                        "Proceeding with password change in PERMISSIVE mode - "
                        "OLD SESSIONS MAY REMAIN VALID!",
                        extra={"user_id": user_id}
                    )
        
        # NOW update password in database
        now = datetime.now(timezone.utc).isoformat()
        result = self.supabase.table("users").update({
            "password_hash": password_hash,
            "updated_at": now,
        }).eq("id", user_id).execute()
        
        if not result.data:
            raise UserNotFoundError()
        
        logger.info("Password updated successfully", extra={"user_id": user_id})
    
    async def get_user(self, user_id: str) -> User:
        """Get user by ID."""
        result = self.supabase.table("users").select("*").eq("id", user_id).execute()
        if not result.data:
            raise UserNotFoundError()
        return User.from_db_row(result.data[0])
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email address."""
        email = email.lower().strip()
        result = self.supabase.table("users").select("*").eq("email", email).execute()
        if not result.data:
            return None
        return User.from_db_row(result.data[0])
    
    async def verify_password(self, user_id: str, password: str) -> bool:
        """Verify a user's password."""
        result = self.supabase.table("users").select("password_hash").eq("id", user_id).execute()
        if not result.data:
            raise UserNotFoundError()
        password_hash = result.data[0].get("password_hash", "")
        return self.password_service.verify_password(password, password_hash)
    
    async def verify_email(self, user_id: str) -> None:
        """Mark a user's email as verified."""
        now = datetime.now(timezone.utc).isoformat()
        result = self.supabase.table("users").update({
            "email_verified": True,
            "updated_at": now,
        }).eq("id", user_id).execute()
        if not result.data:
            raise UserNotFoundError()
    
    async def update_profile(
        self,
        user_id: str,
        display_name: Optional[str] = None,
        avatar_url: Optional[str] = None
    ) -> User:
        """Update a user's profile."""
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        if display_name is not None:
            update_data["display_name"] = display_name.strip()
        if avatar_url is not None:
            update_data["avatar_url"] = avatar_url
        
        result = self.supabase.table("users").update(update_data).eq("id", user_id).execute()
        if not result.data:
            raise UserNotFoundError()
        return User.from_db_row(result.data[0])
    
    async def delete_account(self, user_id: str) -> None:
        """Delete a user account."""
        # Invalidate all tokens first
        if self.token_store:
            try:
                await self.token_store.invalidate_all_user_tokens(user_id)
            except Exception as e:
                logger.warning(f"Failed to invalidate tokens during account deletion: {e}")
        
        result = self.supabase.table("users").delete().eq("id", user_id).execute()
        if not result.data:
            raise UserNotFoundError()
    
    def verify_access_token(self, token: str) -> TokenPayload:
        """Verify and decode an access token."""
        return self.jwt_service.decode_access_token(token)


# Singleton instance
_secure_auth_service: Optional[SecureAuthService] = None


def get_secure_auth_service() -> SecureAuthService:
    """Get or create the secure auth service singleton."""
    global _secure_auth_service
    if _secure_auth_service is None:
        _secure_auth_service = SecureAuthService()
    return _secure_auth_service


def reset_secure_auth_service() -> None:
    """Reset the singleton (for testing)."""
    global _secure_auth_service
    _secure_auth_service = None


__all__ = [
    "SecureAuthService",
    "SecurityMode",
    "TokenStoreUnavailableError",
    "SessionInvalidationError",
    "TokenPair",
    "User",
    "get_secure_auth_service",
    "reset_secure_auth_service",
]
