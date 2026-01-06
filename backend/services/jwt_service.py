"""
JWT Token Service for Aurastream authentication.

This service handles creation and validation of JWT access and refresh tokens
using the python-jose library. Tokens include a unique JTI (JWT ID) for
revocation support.

Usage:
    from services.jwt_service import JWTService
    
    jwt_service = JWTService(secret_key="your-secret-key")
    
    # Create tokens
    access_token = jwt_service.create_access_token(
        user_id="user-123",
        tier="pro",
        email="user@example.com"
    )
    
    # Decode and validate tokens
    payload = jwt_service.decode_access_token(access_token)
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

from jose import jwt, JWTError, ExpiredSignatureError
from pydantic import BaseModel, Field

from backend.services.exceptions import TokenExpiredError, TokenInvalidError


# Default configuration values
DEFAULT_ALGORITHM = "HS256"
DEFAULT_ACCESS_TOKEN_EXPIRE_HOURS = 24
DEFAULT_REFRESH_TOKEN_EXPIRE_DAYS = 30


class TokenPayload(BaseModel):
    """
    Pydantic model for JWT token payload validation.
    
    Attributes:
        sub: User ID (subject)
        tier: Subscription tier (access tokens only)
        email: User email (access tokens only)
        type: Token type ("access" or "refresh")
        exp: Expiration timestamp (Unix epoch)
        iat: Issued at timestamp (Unix epoch)
        jti: JWT ID for revocation tracking
    """
    sub: str = Field(..., description="User ID (subject)")
    tier: Optional[str] = Field(None, description="Subscription tier")
    email: Optional[str] = Field(None, description="User email")
    type: str = Field(..., description="Token type: 'access' or 'refresh'")
    exp: int = Field(..., description="Expiration timestamp")
    iat: int = Field(..., description="Issued at timestamp")
    jti: str = Field(..., description="JWT ID for revocation")


class JWTService:
    """
    Service for creating and validating JWT tokens.
    
    Supports both access tokens (short-lived, contain user info) and
    refresh tokens (long-lived, minimal payload).
    
    Args:
        secret_key: Secret key for signing tokens
        algorithm: JWT algorithm (default: HS256)
        access_token_expire_hours: Access token lifetime in hours (default: 24)
        refresh_token_expire_days: Refresh token lifetime in days (default: 30)
    """
    
    def __init__(
        self,
        secret_key: str,
        algorithm: str = DEFAULT_ALGORITHM,
        access_token_expire_hours: int = DEFAULT_ACCESS_TOKEN_EXPIRE_HOURS,
        refresh_token_expire_days: int = DEFAULT_REFRESH_TOKEN_EXPIRE_DAYS
    ):
        if not secret_key:
            raise ValueError("JWT secret key cannot be empty")
        
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.access_token_expire_hours = access_token_expire_hours
        self.refresh_token_expire_days = refresh_token_expire_days
    
    def create_access_token(
        self,
        user_id: str,
        tier: str,
        email: str,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create a JWT access token with user information.
        
        Access tokens contain full user context (tier, email) for authorization
        decisions without database lookups.
        
        Args:
            user_id: Unique user identifier
            tier: User's subscription tier (e.g., "free", "pro", "enterprise")
            email: User's email address
            expires_delta: Custom expiration time (default: 24 hours)
        
        Returns:
            Encoded JWT access token string
        
        Example:
            token = jwt_service.create_access_token(
                user_id="user-123",
                tier="pro",
                email="user@example.com"
            )
        """
        now = datetime.now(timezone.utc)
        
        if expires_delta is None:
            expires_delta = timedelta(hours=self.access_token_expire_hours)
        
        expire = now + expires_delta
        
        payload = {
            "sub": user_id,
            "tier": tier,
            "email": email,
            "type": "access",
            "exp": int(expire.timestamp()),
            "iat": int(now.timestamp()),
            "jti": str(uuid.uuid4())
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(
        self,
        user_id: str,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create a JWT refresh token for obtaining new access tokens.
        
        Refresh tokens have a minimal payload (no tier/email) since they're
        only used to obtain new access tokens, not for authorization.
        
        Args:
            user_id: Unique user identifier
            expires_delta: Custom expiration time (default: 30 days)
        
        Returns:
            Encoded JWT refresh token string
        
        Example:
            refresh_token = jwt_service.create_refresh_token(user_id="user-123")
        """
        now = datetime.now(timezone.utc)
        
        if expires_delta is None:
            expires_delta = timedelta(days=self.refresh_token_expire_days)
        
        expire = now + expires_delta
        
        payload = {
            "sub": user_id,
            "type": "refresh",
            "exp": int(expire.timestamp()),
            "iat": int(now.timestamp()),
            "jti": str(uuid.uuid4())
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def decode_access_token(self, token: str) -> TokenPayload:
        """
        Decode and validate an access token.
        
        Verifies the token signature, expiration, and ensures it's an access token.
        
        Args:
            token: JWT access token string
        
        Returns:
            TokenPayload with decoded token data
        
        Raises:
            TokenExpiredError: If the token has expired
            TokenInvalidError: If the token is malformed, has invalid signature,
                              or is not an access token
        
        Example:
            try:
                payload = jwt_service.decode_access_token(token)
                print(f"User: {payload.sub}, Tier: {payload.tier}")
            except TokenExpiredError:
                # Handle expired token - try refresh
                pass
            except TokenInvalidError:
                # Handle invalid token - require re-login
                pass
        """
        payload_dict = self._decode_token(token)
        
        # Validate token type
        if payload_dict.get("type") != "access":
            raise TokenInvalidError("Token is not an access token")
        
        # Validate required fields for access token
        if not payload_dict.get("tier") or not payload_dict.get("email"):
            raise TokenInvalidError("Access token missing required claims")
        
        return TokenPayload(**payload_dict)
    
    def decode_refresh_token(self, token: str) -> TokenPayload:
        """
        Decode and validate a refresh token.
        
        Verifies the token signature, expiration, and ensures it's a refresh token.
        
        Args:
            token: JWT refresh token string
        
        Returns:
            TokenPayload with decoded token data
        
        Raises:
            TokenExpiredError: If the token has expired
            TokenInvalidError: If the token is malformed, has invalid signature,
                              or is not a refresh token
        
        Example:
            try:
                payload = jwt_service.decode_refresh_token(refresh_token)
                # Use payload.sub to look up user and create new access token
            except TokenExpiredError:
                # Refresh token expired - require full re-login
                pass
        """
        payload_dict = self._decode_token(token)
        
        # Validate token type
        if payload_dict.get("type") != "refresh":
            raise TokenInvalidError("Token is not a refresh token")
        
        return TokenPayload(**payload_dict)
    
    def get_token_jti(self, token: str) -> str:
        """
        Extract JTI from token without full validation.
        
        This is useful for blacklist checks where you need the JTI even if
        the token might be expired. Does NOT verify expiration.
        
        Args:
            token: JWT token string (access or refresh)
        
        Returns:
            JTI (JWT ID) string
        
        Raises:
            TokenInvalidError: If the token is malformed or has invalid signature
        
        Example:
            jti = jwt_service.get_token_jti(token)
            if is_blacklisted(jti):
                raise TokenRevokedError()
        """
        try:
            # Decode without verifying expiration
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
                options={"verify_exp": False}
            )
            
            jti = payload.get("jti")
            if not jti:
                raise TokenInvalidError("Token missing JTI claim")
            
            return jti
            
        except JWTError as e:
            raise TokenInvalidError(f"Invalid token: {str(e)}")
    
    def _decode_token(self, token: str) -> dict:
        """
        Internal method to decode and validate a token.
        
        Args:
            token: JWT token string
        
        Returns:
            Decoded payload dictionary
        
        Raises:
            TokenExpiredError: If the token has expired
            TokenInvalidError: If the token is invalid
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            
            # Validate required base claims
            required_claims = ["sub", "type", "exp", "iat", "jti"]
            for claim in required_claims:
                if claim not in payload:
                    raise TokenInvalidError(f"Token missing required claim: {claim}")
            
            return payload
            
        except ExpiredSignatureError:
            # Try to extract expiration time for error details
            try:
                expired_payload = jwt.decode(
                    token,
                    self.secret_key,
                    algorithms=[self.algorithm],
                    options={"verify_exp": False}
                )
                expired_at = datetime.fromtimestamp(expired_payload.get("exp", 0), tz=timezone.utc)
                raise TokenExpiredError(expired_at=expired_at)
            except JWTError:
                raise TokenExpiredError()
        
        except JWTError as e:
            raise TokenInvalidError(f"Invalid token: {str(e)}")


# ============================================================================
# OBS Token Functions (standalone for Alert Animation Studio)
# ============================================================================

DEFAULT_OBS_TOKEN_EXPIRE_DAYS = 30


class OBSTokenPayload(BaseModel):
    """
    Pydantic model for OBS browser source token payload.
    
    Attributes:
        sub: User ID (subject)
        project_id: Animation project ID
        type: Token type ("obs")
        exp: Expiration timestamp (Unix epoch)
        iat: Issued at timestamp (Unix epoch)
        jti: JWT ID for revocation tracking
    """
    sub: str = Field(..., description="User ID (subject)")
    project_id: str = Field(..., description="Animation project ID")
    type: str = Field(..., description="Token type: 'obs'")
    exp: int = Field(..., description="Expiration timestamp")
    iat: int = Field(..., description="Issued at timestamp")
    jti: str = Field(..., description="JWT ID for revocation")


def create_obs_token(
    project_id: str,
    user_id: str,
    expires_days: int = DEFAULT_OBS_TOKEN_EXPIRE_DAYS,
) -> str:
    """
    Create a long-lived JWT token for OBS browser source access.
    
    OBS tokens are designed for browser sources that need to access
    animation projects without requiring user re-authentication.
    They are scoped to a specific project and user.
    
    Args:
        project_id: Animation project UUID
        user_id: User UUID who owns the project
        expires_days: Token lifetime in days (default: 30)
    
    Returns:
        Encoded JWT token string
    
    Example:
        token = create_obs_token(
            project_id="proj-123",
            user_id="user-456"
        )
        # Use in OBS browser source URL:
        # https://app.aurastream.io/obs/alert/{project_id}?token={token}
    """
    from backend.core.config import settings
    
    secret_key = getattr(settings, "JWT_SECRET_KEY", settings.SECRET_KEY)
    
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=expires_days)
    
    payload = {
        "sub": user_id,
        "project_id": project_id,
        "type": "obs",
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "jti": str(uuid.uuid4()),
    }
    
    return jwt.encode(payload, secret_key, algorithm=DEFAULT_ALGORITHM)


def decode_obs_token(token: str) -> OBSTokenPayload:
    """
    Decode and validate an OBS browser source token.
    
    Verifies the token signature, expiration, and ensures it's an OBS token.
    
    Args:
        token: JWT OBS token string
    
    Returns:
        OBSTokenPayload with decoded token data
    
    Raises:
        TokenExpiredError: If the token has expired
        TokenInvalidError: If the token is malformed, has invalid signature,
                          or is not an OBS token
    
    Example:
        try:
            payload = decode_obs_token(token)
            # Verify project_id matches requested project
            if payload.project_id != requested_project_id:
                raise HTTPException(403, "Token not valid for this project")
        except TokenExpiredError:
            # Token expired - user needs to regenerate from dashboard
            pass
    """
    from backend.core.config import settings
    
    secret_key = getattr(settings, "JWT_SECRET_KEY", settings.SECRET_KEY)
    
    try:
        payload = jwt.decode(
            token,
            secret_key,
            algorithms=[DEFAULT_ALGORITHM]
        )
        
        # Validate token type
        if payload.get("type") != "obs":
            raise TokenInvalidError("Token is not an OBS token")
        
        # Validate required claims
        required_claims = ["sub", "project_id", "type", "exp", "iat", "jti"]
        for claim in required_claims:
            if claim not in payload:
                raise TokenInvalidError(f"Token missing required claim: {claim}")
        
        return OBSTokenPayload(**payload)
        
    except ExpiredSignatureError:
        try:
            expired_payload = jwt.decode(
                token,
                secret_key,
                algorithms=[DEFAULT_ALGORITHM],
                options={"verify_exp": False}
            )
            expired_at = datetime.fromtimestamp(expired_payload.get("exp", 0), tz=timezone.utc)
            raise TokenExpiredError(expired_at=expired_at)
        except JWTError:
            raise TokenExpiredError()
    
    except JWTError as e:
        raise TokenInvalidError(f"Invalid token: {str(e)}")


# Export for easy importing
__all__ = [
    "JWTService",
    "TokenPayload",
    "OBSTokenPayload",
    "DEFAULT_ALGORITHM",
    "DEFAULT_ACCESS_TOKEN_EXPIRE_HOURS",
    "DEFAULT_REFRESH_TOKEN_EXPIRE_DAYS",
    "DEFAULT_OBS_TOKEN_EXPIRE_DAYS",
    "create_obs_token",
    "decode_obs_token",
]
