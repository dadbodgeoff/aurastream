"""
Global API Rate Limiting Middleware for Aurastream (V2).

Uses the unified RateLimitService for consistent rate limiting across all endpoints.

Applies tier-based rate limiting to all API endpoints:
- anonymous: 60 requests/minute (by IP)
- free: 60 requests/minute (by user ID)
- pro: 240 requests/minute (by user ID)
- studio: 500 requests/minute (by user ID)

The middleware:
1. Extracts user info from JWT token (if present)
2. Looks up user's subscription tier
3. Applies appropriate rate limit using unified service
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

from backend.services.rate_limit import (
    get_rate_limit_service,
    get_client_ip,
    RATE_LIMITING_ENABLED,
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
    "/api/v1/webhooks/",  # All webhooks
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
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": False}
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


class APIRateLimitMiddlewareV2(BaseHTTPMiddleware):
    """
    Middleware that applies global API rate limiting using unified service.
    
    Rate limits are tier-based and configured in backend/services/rate_limit/config.py
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
        
        # Extract user info from request
        user_id: Optional[str] = None
        tier: str = "free"
        
        # Try to get user info from request state (set by auth dependency)
        if hasattr(request.state, "user"):
            user = request.state.user
            user_id = getattr(user, "sub", None)
            tier = getattr(user, "tier", "free")
        
        # If no user in state, try to decode JWT from Authorization header
        if not user_id:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]
                jwt_data = _decode_jwt_for_rate_limit(token)
                if jwt_data and jwt_data.get("user_id"):
                    user_id = jwt_data["user_id"]
                    tier = jwt_data.get("tier", "free")
        
        # Determine identifier (user_id or IP)
        if user_id:
            identifier = user_id
        else:
            identifier = get_client_ip(request)
            tier = "free"  # Anonymous uses free tier limits
        
        # Check rate limit using unified service
        service = get_rate_limit_service()
        result = await service.check("api_requests", identifier, tier)
        
        if not result.allowed:
            logger.warning(
                f"API rate limit exceeded: identifier={identifier[:20]}..., tier={tier}, "
                f"limit={result.limit}, retry_after={result.retry_after}"
            )
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "message": "Too many requests. Please slow down.",
                        "code": "API_RATE_LIMIT_EXCEEDED",
                        "details": {
                            "retry_after_seconds": result.retry_after or 60,
                            "limit": result.limit,
                            "used": result.used,
                            "window_seconds": 60,
                        }
                    }
                },
                headers={
                    "Retry-After": str(result.retry_after or 60),
                    "X-RateLimit-Limit": str(result.limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(result.retry_after or 60),
                }
            )
        
        # Increment the counter
        await service.increment("api_requests", identifier)
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers to response
        response.headers["X-RateLimit-Limit"] = str(result.limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, result.remaining - 1))
        response.headers["X-RateLimit-Reset"] = "60"
        
        return response


__all__ = ["APIRateLimitMiddlewareV2"]
