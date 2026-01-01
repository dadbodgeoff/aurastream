"""
Global API Rate Limiting Middleware for Aurastream.

Applies tier-based rate limiting to all API endpoints:
- anonymous: 30 requests/minute (by IP)
- free: 60 requests/minute (by user ID)
- pro: 120 requests/minute (by user ID)
- studio: 300 requests/minute (by user ID)

The middleware:
1. Extracts user info from JWT token (if present)
2. Looks up user's subscription tier
3. Applies appropriate rate limit
4. Adds rate limit headers to response

Headers added:
- X-RateLimit-Limit: Maximum requests allowed
- X-RateLimit-Remaining: Requests remaining in window
- X-RateLimit-Reset: Seconds until window resets
"""

import logging
from typing import Callable, Optional

import jwt
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.api.middleware.rate_limit import (
    API_RATE_LIMITS,
    API_RATE_WINDOW_SECONDS,
    RATE_LIMITING_ENABLED,
    get_client_ip,
    get_rate_limit_store,
)
from api.config import get_settings

logger = logging.getLogger(__name__)


# Paths to exclude from rate limiting
EXCLUDED_PATHS = {
    "/health",
    "/api/docs",
    "/api/redoc",
    "/api/openapi.json",
    "/api/v1/webhooks/stripe",  # Stripe webhooks need to always work
}

# Paths that are always anonymous (no auth check needed)
ANONYMOUS_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/signup",
    "/api/v1/auth/refresh",
    "/api/v1/auth/password-reset",
}


def _decode_jwt_for_rate_limit(token: str) -> Optional[dict]:
    """
    Decode JWT token to extract user_id and tier for rate limiting.
    
    This is a lightweight decode that doesn't validate expiration strictly
    since we just need the user identity for rate limiting purposes.
    """
    try:
        settings = get_settings()
        # Decode without full validation - we just need user_id and tier
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": False}  # Don't fail on expired tokens for rate limiting
        )
        return {
            "user_id": payload.get("sub"),
            "tier": payload.get("tier", "free")
        }
    except jwt.InvalidTokenError:
        return None
    except Exception as e:
        logger.debug(f"JWT decode error for rate limiting: {e}")
        return None


class APIRateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware that applies global API rate limiting.
    
    Rate limits are tier-based:
    - anonymous: 30/min (unauthenticated requests, by IP)
    - free: 60/min (free tier users)
    - pro: 120/min (pro tier users)
    - studio: 300/min (studio tier users)
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and apply rate limiting."""
        # Skip if rate limiting is disabled
        if not RATE_LIMITING_ENABLED:
            return await call_next(request)
        
        # Skip OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Skip excluded paths
        path = request.url.path
        if path in EXCLUDED_PATHS or any(path.startswith(p) for p in EXCLUDED_PATHS):
            return await call_next(request)
        
        # Only rate limit API paths
        if not path.startswith("/api/"):
            return await call_next(request)
        
        # Extract user info from request (set by auth middleware)
        user_id: Optional[str] = None
        tier: str = "anonymous"
        
        # Try to get user info from request state (set by auth dependency)
        if hasattr(request.state, "user"):
            user = request.state.user
            user_id = getattr(user, "sub", None)
            tier = getattr(user, "tier", "free")
        
        # If no user in state, try to decode JWT from Authorization header
        if not user_id:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]  # Remove "Bearer " prefix
                jwt_data = _decode_jwt_for_rate_limit(token)
                if jwt_data and jwt_data.get("user_id"):
                    user_id = jwt_data["user_id"]
                    tier = jwt_data.get("tier", "free")
        
        # Determine rate limit key
        if user_id:
            key = f"api:user:{user_id}"
            max_attempts = API_RATE_LIMITS.get(tier, API_RATE_LIMITS["free"])
        else:
            client_ip = get_client_ip(request)
            key = f"api:ip:{client_ip}"
            max_attempts = API_RATE_LIMITS["anonymous"]
        
        # Check rate limit
        store = get_rate_limit_store()
        is_allowed, retry_after = store.check_and_increment(
            key=key,
            max_attempts=max_attempts,
            window_seconds=API_RATE_WINDOW_SECONDS
        )
        
        # Get remaining for headers
        remaining = store.get_remaining(key, max_attempts)
        
        if not is_allowed:
            logger.warning(
                f"API rate limit exceeded: key={key}, tier={tier}, "
                f"limit={max_attempts}, retry_after={retry_after}"
            )
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "message": "Too many requests. Please slow down.",
                        "code": "API_RATE_LIMIT_EXCEEDED",
                        "details": {
                            "retry_after_seconds": retry_after,
                            "limit": max_attempts,
                            "window_seconds": API_RATE_WINDOW_SECONDS,
                        }
                    }
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(max_attempts),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(API_RATE_WINDOW_SECONDS),
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers to response
        response.headers["X-RateLimit-Limit"] = str(max_attempts)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining - 1))
        response.headers["X-RateLimit-Reset"] = str(API_RATE_WINDOW_SECONDS)
        
        return response


__all__ = ["APIRateLimitMiddleware"]
