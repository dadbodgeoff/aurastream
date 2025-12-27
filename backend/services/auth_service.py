"""
Authentication Service for Aurastream.

This service handles all authentication operations including:
- User signup with email/password
- User login with credential verification
- Token refresh with reuse detection
- Logout (token invalidation)
- Current user retrieval

Security Notes:
- Never log passwords or tokens
- Use timing-safe password comparison
- Validate all inputs before processing
- Refresh token reuse detection invalidates all user sessions
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from dataclasses import dataclass

from backend.api.config import get_settings
from backend.services.jwt_service import JWTService, TokenPayload
from backend.services.password_service import PasswordService, password_service as default_password_service
from backend.services.exceptions import (
    InvalidCredentialsError,
    EmailExistsError,
    UserNotFoundError,
    WeakPasswordError,
    TokenExpiredError,
    TokenInvalidError,
)
from backend.database.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


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
        )


def _parse_datetime(value) -> datetime:
    """Parse datetime from database value."""
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        # Handle ISO format with Z suffix
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    raise ValueError(f"Cannot parse datetime from {type(value)}: {value}")


def _parse_datetime_optional(value) -> Optional[datetime]:
    """Parse optional datetime from database value."""
    if value is None:
        return None
    return _parse_datetime(value)


class AuthService:
    """
    Service for handling authentication operations.
    
    This service coordinates between JWT tokens, password hashing,
    and the user database to provide secure authentication.
    
    Security Features:
    - Refresh token reuse detection (invalidates all sessions on reuse)
    - Token rotation on refresh
    - Redis-backed token tracking
    """
    
    def __init__(
        self,
        jwt_service: Optional[JWTService] = None,
        password_svc: Optional[PasswordService] = None,
        token_store=None,
    ):
        """
        Initialize the auth service.
        
        Args:
            jwt_service: JWT service instance (created from settings if not provided)
            password_svc: Password service instance (uses singleton if not provided)
            token_store: Token store instance for refresh token tracking (optional)
        """
        settings = get_settings()
        self.jwt_service = jwt_service or JWTService(
            secret_key=settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )
        self.password_service = password_svc or default_password_service
        self._supabase = None
        self._token_store = token_store
    
    @property
    def token_store(self):
        """Lazy-load token store."""
        if self._token_store is None:
            try:
                from backend.services.token_store import get_token_store
                self._token_store = get_token_store()
            except Exception as e:
                logger.warning(f"Token store not available: {e}")
                # Return None to indicate token store is not available
                # This allows the service to work without Redis
                return None
        return self._token_store
    
    @property
    def supabase(self):
        """Lazy-load Supabase client."""
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
    async def signup(
        self,
        email: str,
        password: str,
        display_name: str,
        accept_terms: bool = True,
        terms_version: str = "1.0.0",
        privacy_version: str = "1.0.0",
    ) -> User:
        """
        Register a new user with email and password.
        
        Args:
            email: User's email address (will be lowercased)
            password: Plain text password (must meet strength requirements)
            display_name: User's display name
            accept_terms: Whether user accepted Terms of Service
            terms_version: Version of Terms of Service accepted
            privacy_version: Version of Privacy Policy accepted
        
        Returns:
            Created User object
        
        Raises:
            EmailExistsError: If email is already registered
            WeakPasswordError: If password doesn't meet requirements
            ValueError: If terms not accepted
        """
        # Validate terms acceptance
        if not accept_terms:
            raise ValueError("You must accept the Terms of Service and Privacy Policy to create an account")
        
        # Normalize email
        email = email.lower().strip()
        display_name = display_name.strip()
        
        # Validate password strength
        validation = self.password_service.validate_password_strength(password)
        if not validation.is_valid:
            raise WeakPasswordError(validation.failed_requirements)
        
        # Check if email already exists
        existing = self.supabase.table("users").select("id").eq("email", email).execute()
        if existing.data:
            raise EmailExistsError(email)
        
        # Hash password
        password_hash = self.password_service.hash_password(password)
        
        # Create user in database
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
        
        Args:
            email: User's email address
            password: Plain text password
            remember_me: If True, extends token expiration
        
        Returns:
            Tuple of (TokenPair, User)
        
        Raises:
            InvalidCredentialsError: If email/password combination is invalid
        """
        # Normalize email
        email = email.lower().strip()
        
        # Find user by email
        result = self.supabase.table("users").select("*").eq("email", email).execute()
        
        if not result.data:
            # User not found - use same error as wrong password to prevent enumeration
            raise InvalidCredentialsError()
        
        user_row = result.data[0]
        
        # Verify password
        if not self.password_service.verify_password(password, user_row.get("password_hash", "")):
            raise InvalidCredentialsError()
        
        # Create tokens
        user = User.from_db_row(user_row)
        
        # Extended expiration for "remember me"
        access_expires = timedelta(hours=168) if remember_me else None  # 7 days vs default 24h
        
        access_token = self.jwt_service.create_access_token(
            user_id=user.id,
            tier=user.subscription_tier,
            email=user.email,
            expires_delta=access_expires,
        )
        
        refresh_token = self.jwt_service.create_refresh_token(user_id=user.id)
        
        # Calculate expiration time
        settings = get_settings()
        expires_hours = 168 if remember_me else settings.JWT_EXPIRATION_HOURS
        expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_hours)
        
        # Register refresh token for reuse detection
        if self.token_store:
            try:
                refresh_payload = self.jwt_service.decode_refresh_token(refresh_token)
                refresh_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
                await self.token_store.register_token(
                    jti=refresh_payload.jti,
                    user_id=user.id,
                    expires_at=refresh_expires_at,
                )
                logger.debug(
                    "Registered refresh token on login",
                    extra={"user_id": user.id, "jti": refresh_payload.jti}
                )
            except Exception as e:
                logger.warning(f"Failed to register refresh token: {e}")
        
        token_pair = TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
        )
        
        return token_pair, user
    
    async def logout(self, user_id: str, token_jti: Optional[str] = None) -> None:
        """
        Log out a user by invalidating their token.
        
        Args:
            user_id: User's ID
            token_jti: JWT ID to blacklist (optional, for token revocation)
        
        Note:
            Invalidates the specific token in the token store if available.
        """
        if token_jti and self.token_store:
            try:
                await self.token_store.invalidate_token(token_jti)
                logger.info(
                    "Token invalidated on logout",
                    extra={"user_id": user_id, "jti": token_jti}
                )
            except Exception as e:
                logger.warning(f"Failed to invalidate token on logout: {e}")
    
    async def refresh_token(self, refresh_token: str) -> TokenPair:
        """
        Generate new access token using refresh token.
        
        Implements refresh token rotation with reuse detection:
        1. Decode and validate the refresh token
        2. Check if token was already used (reuse detection)
        3. If reused: SECURITY ALERT - invalidate ALL user tokens
        4. If valid: Mark as used, issue new tokens
        
        Args:
            refresh_token: Valid refresh token
        
        Returns:
            New TokenPair with fresh access and refresh tokens
        
        Raises:
            TokenExpiredError: If refresh token has expired
            TokenInvalidError: If refresh token is invalid or reused
            UserNotFoundError: If user no longer exists
        """
        from backend.services.token_store import TokenReuseDetectedError
        
        # Decode refresh token
        payload = self.jwt_service.decode_refresh_token(refresh_token)
        
        # Create new refresh token for rotation
        new_refresh_token = self.jwt_service.create_refresh_token(user_id=payload.sub)
        new_refresh_payload = self.jwt_service.decode_refresh_token(new_refresh_token)
        
        # Check for token reuse if token store is available
        token_store = self.token_store
        if token_store:
            try:
                # Attempt to use the old token (this will detect reuse)
                success, error_reason = await token_store.use_token(
                    jti=payload.jti,
                    user_id=payload.sub,
                    new_jti=new_refresh_payload.jti,
                )
                
                if not success:
                    if error_reason == "invalid":
                        # Token not in store - could be old token before reuse detection
                        # Allow it but log a warning
                        logger.warning(
                            "Refresh token not found in store (legacy token?)",
                            extra={"jti": payload.jti, "user_id": payload.sub}
                        )
                    elif error_reason == "wrong_user":
                        logger.critical(
                            "SECURITY ALERT: Token user mismatch",
                            extra={"jti": payload.jti, "user_id": payload.sub}
                        )
                        raise TokenInvalidError("Token user mismatch")
                
            except TokenReuseDetectedError as e:
                # Token reuse detected - all user tokens have been invalidated
                logger.critical(
                    "SECURITY ALERT: Refresh token reuse detected - all sessions invalidated",
                    extra={"user_id": e.user_id, "jti": e.jti}
                )
                raise TokenInvalidError(
                    "Security alert: This refresh token has already been used. "
                    "All sessions have been invalidated for your security. "
                    "Please log in again."
                )
            except Exception as e:
                # Redis connection error or other issue - log and continue
                # We don't want to break refresh if Redis is temporarily unavailable
                logger.warning(f"Token store error during refresh (continuing): {e}")
        
        # Get user to ensure they still exist and get current tier
        result = self.supabase.table("users").select("*").eq("id", payload.sub).execute()
        
        if not result.data:
            raise UserNotFoundError()
        
        user = User.from_db_row(result.data[0])
        
        # Create new access token
        access_token = self.jwt_service.create_access_token(
            user_id=user.id,
            tier=user.subscription_tier,
            email=user.email,
        )
        
        # Register the new refresh token for tracking
        if token_store:
            try:
                refresh_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
                await token_store.register_token(
                    jti=new_refresh_payload.jti,
                    user_id=user.id,
                    expires_at=refresh_expires_at,
                )
                logger.debug(
                    "Registered new refresh token after rotation",
                    extra={"user_id": user.id, "jti": new_refresh_payload.jti}
                )
            except Exception as e:
                logger.warning(f"Failed to register new refresh token: {e}")
        
        settings = get_settings()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
        
        return TokenPair(
            access_token=access_token,
            refresh_token=new_refresh_token,  # Return NEW refresh token (rotation)
            expires_at=expires_at,
        )
    
    async def get_user(self, user_id: str) -> User:
        """
        Get user by ID.
        
        Args:
            user_id: User's UUID
        
        Returns:
            User object
        
        Raises:
            UserNotFoundError: If user doesn't exist
        """
        result = self.supabase.table("users").select("*").eq("id", user_id).execute()
        
        if not result.data:
            raise UserNotFoundError()
        
        return User.from_db_row(result.data[0])
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email address.
        
        Args:
            email: User's email address
        
        Returns:
            User object or None if not found
        """
        email = email.lower().strip()
        result = self.supabase.table("users").select("*").eq("email", email).execute()
        
        if not result.data:
            return None
        
        return User.from_db_row(result.data[0])
    
    async def update_password(self, user_id: str, new_password: str) -> None:
        """
        Update a user's password.
        
        Also invalidates all refresh tokens for security.
        
        Args:
            user_id: User's UUID
            new_password: New plain text password
            
        Raises:
            UserNotFoundError: If user doesn't exist
            WeakPasswordError: If password doesn't meet requirements
        """
        # Validate password strength
        validation = self.password_service.validate_password_strength(new_password)
        if not validation.is_valid:
            raise WeakPasswordError(validation.failed_requirements)
        
        # Hash new password
        password_hash = self.password_service.hash_password(new_password)
        
        # Update password in database
        now = datetime.now(timezone.utc).isoformat()
        result = self.supabase.table("users").update({
            "password_hash": password_hash,
            "updated_at": now,
        }).eq("id", user_id).execute()
        
        if not result.data:
            raise UserNotFoundError()
        
        # Invalidate all refresh tokens for security
        if self.token_store:
            try:
                count = await self.token_store.invalidate_all_user_tokens(user_id)
                logger.info(
                    "Invalidated all user tokens after password change",
                    extra={"user_id": user_id, "invalidated_count": count}
                )
            except Exception as e:
                logger.warning(f"Failed to invalidate tokens after password change: {e}")
    
    async def verify_password(self, user_id: str, password: str) -> bool:
        """
        Verify a user's password.
        
        Args:
            user_id: User's UUID
            password: Plain text password to verify
            
        Returns:
            True if password is correct, False otherwise
            
        Raises:
            UserNotFoundError: If user doesn't exist
        """
        result = self.supabase.table("users").select("password_hash").eq("id", user_id).execute()
        
        if not result.data:
            raise UserNotFoundError()
        
        password_hash = result.data[0].get("password_hash", "")
        return self.password_service.verify_password(password, password_hash)
    
    async def verify_email(self, user_id: str) -> None:
        """
        Mark a user's email as verified.
        
        Args:
            user_id: User's UUID
            
        Raises:
            UserNotFoundError: If user doesn't exist
        """
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
        """
        Update a user's profile.
        
        Args:
            user_id: User's UUID
            display_name: New display name (optional)
            avatar_url: New avatar URL (optional)
            
        Returns:
            Updated User object
            
        Raises:
            UserNotFoundError: If user doesn't exist
        """
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
        """
        Delete a user account.
        
        This permanently deletes the user and all associated data.
        
        Args:
            user_id: User's UUID
            
        Raises:
            UserNotFoundError: If user doesn't exist
        """
        result = self.supabase.table("users").delete().eq("id", user_id).execute()
        
        if not result.data:
            raise UserNotFoundError()
    
    def verify_access_token(self, token: str) -> TokenPayload:
        """
        Verify and decode an access token.
        
        Args:
            token: JWT access token
        
        Returns:
            TokenPayload with decoded claims
        
        Raises:
            TokenExpiredError: If token has expired
            TokenInvalidError: If token is invalid
        """
        return self.jwt_service.decode_access_token(token)


# Singleton instance for convenience
_auth_service: Optional[AuthService] = None


def get_auth_service() -> AuthService:
    """Get or create the auth service singleton."""
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service
