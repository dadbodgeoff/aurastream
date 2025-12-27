"""
Middleware package for Aurastream API.

This package contains FastAPI middleware and dependencies for:
- Authentication (JWT token validation)
- Authorization (tier-based access control)
- Security headers (CSP, HSTS, etc.)
"""

from backend.api.middleware.auth import (
    get_current_user,
    get_current_user_optional,
    require_tier,
    TIER_HIERARCHY,
)
from backend.api.middleware.security_headers import SecurityHeadersMiddleware

__all__ = [
    "get_current_user",
    "get_current_user_optional",
    "require_tier",
    "TIER_HIERARCHY",
    "SecurityHeadersMiddleware",
]
