"""
Authentication Middleware for Aurastream.

This module provides FastAPI dependencies for authentication:
- get_current_user: Requires valid JWT token
- get_current_user_optional: Returns user if authenticated, None otherwise
- CSRF protection for state-changing requests

These dependencies extract and validate JWT tokens from:
1. Authorization header (Bearer token) - for API clients
2. HTTP-only cookie (access_token) - for web clients

CSRF Protection:
- CSRF token is generated on login and stored in HTTP-only cookie
- State-changing requests (POST, PUT, DELETE) must include X-CSRF-Token header
- Token is validated against the cookie value
"""

import os
import secrets
from typing import Annotated, Optional

from fastapi import Cookie, Depends, Header, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.api.config import get_settings, Settings
from backend.services.jwt_service import JWTService, TokenPayload
from backend.services.exceptions import TokenExpiredError, TokenInvalidError


# =============================================================================
# Configuration
# =============================================================================

# CSRF token length in bytes (32 bytes = 256 bits)
CSRF_TOKEN_BYTES = int(os.getenv("CSRF_TOKEN_BYTES", "32"))

# CSRF cookie name
CSRF_COOKIE_NAME = os.getenv("CSRF_COOKIE_NAME", "csrf_token")

# CSRF header name
CSRF_HEADER_NAME = os.getenv("CSRF_HEADER_NAME", "X-CSRF-Token")

# Enable/disable CSRF protection (useful for testing)
CSRF_PROTECTION_ENABLED = os.getenv("CSRF_PROTECTION_ENABLED", "true").lower() == "true"

# Methods that require CSRF validation
CSRF_PROTECTED_METHODS = {"POST", "PUT", "DELETE", "PATCH"}

# Paths exempt from CSRF validation (e.g., login, signup which don't have CSRF token yet)
CSRF_EXEMPT_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/signup",
    "/api/v1/auth/refresh",
    "/api/v1/oauth/callback/google",
    "/api/v1/oauth/callback/twitch",
    "/api/v1/oauth/callback/discord",
    "/api/v1/oauth/callback/youtube",
}


# HTTP Bearer token security scheme (auto_error=False to allow cookie fallback)
bearer_scheme = HTTPBearer(auto_error=False)


def _get_jwt_service(settings: Settings) -> JWTService:
    """Create JWT service from settings."""
    return JWTService(
        secret_key=settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def _extract_token(
    credentials: Optional[HTTPAuthorizationCredentials],
    access_token_cookie: Optional[str],
) -> Optional[str]:
    """
    Extract JWT token from Authorization header or cookie.
    
    Priority:
    1. Authorization header (Bearer token)
    2. HTTP-only cookie (access_token)
    
    Args:
        credentials: HTTP Bearer credentials from Authorization header
        access_token_cookie: Token from HTTP-only cookie
        
    Returns:
        JWT token string or None if not found
    """
    # First try Authorization header
    if credentials is not None:
        return credentials.credentials
    
    # Fall back to cookie
    if access_token_cookie:
        return access_token_cookie
    
    return None


async def get_current_user(
    request: Request,
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
    access_token: Annotated[Optional[str], Cookie()] = None,
) -> TokenPayload:
    """
    Dependency to get the current authenticated user from JWT token.
    
    Extracts JWT token from Authorization header or HTTP-only cookie,
    validates it, and returns the decoded token payload.
    
    Args:
        request: FastAPI request object
        credentials: HTTP Bearer token credentials from header
        access_token: JWT token from HTTP-only cookie
        
    Returns:
        TokenPayload: Decoded JWT token payload with user info
        
    Raises:
        HTTPException: 401 if no token provided or token is invalid/expired
        
    Example:
        ```python
        @router.get("/protected")
        async def protected_route(
            current_user: TokenPayload = Depends(get_current_user)
        ):
            return {"user_id": current_user.sub, "email": current_user.email}
        ```
    """
    settings = get_settings()
    
    # Extract token from header or cookie
    token = _extract_token(credentials, access_token)
    
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "message": "Authentication required. Please provide a valid Bearer token.",
                    "code": "AUTH_REQUIRED",
                }
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Validate and decode token
    jwt_service = _get_jwt_service(settings)
    
    try:
        payload = jwt_service.decode_access_token(token)
        return payload
    except TokenExpiredError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.to_dict(),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except TokenInvalidError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.to_dict(),
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_optional(
    request: Request,
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
    access_token: Annotated[Optional[str], Cookie()] = None,
) -> Optional[TokenPayload]:
    """
    Dependency to optionally get the current user if authenticated.
    
    Unlike get_current_user, this dependency does not raise an exception
    if no token is provided. Useful for endpoints that have different
    behavior for authenticated vs anonymous users.
    
    Args:
        request: FastAPI request object
        credentials: HTTP Bearer token credentials (optional)
        access_token: JWT token from HTTP-only cookie (optional)
        
    Returns:
        Optional[TokenPayload]: The decoded token payload or None if not authenticated
        
    Example:
        ```python
        @router.get("/public-with-user-context")
        async def public_route(
            current_user: Optional[TokenPayload] = Depends(get_current_user_optional)
        ):
            if current_user:
                return {"message": f"Hello, {current_user.email}!"}
            return {"message": "Hello, anonymous user!"}
        ```
    """
    settings = get_settings()
    
    # Extract token from header or cookie
    token = _extract_token(credentials, access_token)
    
    if token is None:
        return None
    
    # Try to validate and decode token
    jwt_service = _get_jwt_service(settings)
    
    try:
        payload = jwt_service.decode_access_token(token)
        return payload
    except (TokenExpiredError, TokenInvalidError):
        # Token is invalid or expired, treat as unauthenticated
        return None


# Type aliases for cleaner dependency injection
CurrentUserDep = Annotated[TokenPayload, Depends(get_current_user)]
CurrentUserOptionalDep = Annotated[Optional[TokenPayload], Depends(get_current_user_optional)]


# =============================================================================
# Authorization Dependencies
# =============================================================================

# Tier hierarchy for authorization checks
TIER_HIERARCHY = {"free": 0, "pro": 1, "studio": 2}


def require_tier(required_tier: str):
    """
    Factory function to create a dependency that requires a minimum subscription tier.
    
    Args:
        required_tier: The minimum required tier ("free", "pro", or "studio")
        
    Returns:
        Dependency function that validates user's subscription tier
        
    Example:
        ```python
        @router.post("/premium-feature")
        async def premium_feature(
            current_user: TokenPayload = Depends(get_current_user),
            _: None = Depends(require_tier("pro"))
        ):
            return {"message": "Welcome to the premium feature!"}
        ```
    """
    required_level = TIER_HIERARCHY.get(required_tier, 0)
    
    async def check_tier(
        current_user: TokenPayload = Depends(get_current_user),
    ) -> None:
        user_level = TIER_HIERARCHY.get(current_user.tier or "free", 0)
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "message": f"This feature requires a {required_tier} subscription or higher.",
                        "code": "INSUFFICIENT_TIER",
                        "details": {
                            "required_tier": required_tier,
                            "current_tier": current_user.tier,
                        },
                    }
                },
            )
    
    return check_tier


__all__ = [
    "get_current_user",
    "get_current_user_optional",
    "CurrentUserDep",
    "CurrentUserOptionalDep",
    "require_tier",
    "TIER_HIERARCHY",
    # CSRF Protection
    "generate_csrf_token",
    "set_csrf_cookie",
    "validate_csrf_token",
    "CSRFProtection",
    "CSRF_COOKIE_NAME",
    "CSRF_HEADER_NAME",
    "CSRF_PROTECTION_ENABLED",
    "CSRF_EXEMPT_PATHS",
]


# =============================================================================
# CSRF Protection
# =============================================================================

def generate_csrf_token() -> str:
    """
    Generate a cryptographically secure CSRF token.
    
    Returns:
        URL-safe base64 encoded token string
    """
    return secrets.token_urlsafe(CSRF_TOKEN_BYTES)


def set_csrf_cookie(response: Response, token: str) -> None:
    """
    Set CSRF token in HTTP-only cookie.
    
    The cookie is:
    - HTTP-only: Not accessible via JavaScript
    - Secure: Only sent over HTTPS in production
    - SameSite=Strict: Not sent with cross-site requests
    
    Args:
        response: FastAPI response object
        token: CSRF token to set
    """
    settings = get_settings()
    
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.is_production,
        samesite="strict",
        path="/",
        max_age=24 * 3600,  # 24 hours
    )


def clear_csrf_cookie(response: Response) -> None:
    """
    Clear CSRF token cookie on logout.
    
    Args:
        response: FastAPI response object
    """
    response.delete_cookie(
        key=CSRF_COOKIE_NAME,
        path="/",
    )


async def validate_csrf_token(
    request: Request,
    csrf_cookie: Annotated[Optional[str], Cookie(alias=CSRF_COOKIE_NAME)] = None,
    csrf_header: Annotated[Optional[str], Header(alias=CSRF_HEADER_NAME)] = None,
) -> None:
    """
    Validate CSRF token for state-changing requests.
    
    Compares the CSRF token from the HTTP-only cookie with the token
    provided in the X-CSRF-Token header.
    
    Args:
        request: FastAPI request object
        csrf_cookie: CSRF token from cookie
        csrf_header: CSRF token from header
        
    Raises:
        HTTPException: 403 if CSRF validation fails
    """
    # Skip if CSRF protection is disabled
    if not CSRF_PROTECTION_ENABLED:
        return
    
    # Skip for non-protected methods
    if request.method not in CSRF_PROTECTED_METHODS:
        return
    
    # Skip for exempt paths
    if request.url.path in CSRF_EXEMPT_PATHS:
        return
    
    # Validate tokens
    if csrf_cookie is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "message": "CSRF token missing from cookie",
                    "code": "CSRF_TOKEN_MISSING",
                }
            },
        )
    
    if csrf_header is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "message": f"CSRF token missing from {CSRF_HEADER_NAME} header",
                    "code": "CSRF_TOKEN_MISSING",
                }
            },
        )
    
    # Use secrets.compare_digest for timing-safe comparison
    if not secrets.compare_digest(csrf_cookie, csrf_header):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "message": "CSRF token validation failed",
                    "code": "CSRF_TOKEN_INVALID",
                }
            },
        )


class CSRFProtection:
    """
    CSRF protection dependency class.
    
    Can be used as a FastAPI dependency to protect routes:
    
    Example:
        ```python
        @router.post("/protected")
        async def protected_route(
            _csrf: None = Depends(CSRFProtection())
        ):
            return {"message": "CSRF validated"}
        ```
    """
    
    def __init__(self, exempt: bool = False):
        """
        Initialize CSRF protection.
        
        Args:
            exempt: If True, skip CSRF validation for this route
        """
        self.exempt = exempt
    
    async def __call__(
        self,
        request: Request,
        csrf_cookie: Annotated[Optional[str], Cookie(alias=CSRF_COOKIE_NAME)] = None,
        csrf_header: Annotated[Optional[str], Header(alias=CSRF_HEADER_NAME)] = None,
    ) -> None:
        """Validate CSRF token."""
        if self.exempt:
            return
        
        await validate_csrf_token(request, csrf_cookie, csrf_header)
