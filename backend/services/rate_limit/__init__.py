"""
Unified Rate Limiting Service for AuraStream.

This module provides a consolidated rate limiting system with:
- Two-tier support (Free/Premium)
- Redis-backed storage for production
- In-memory fallback for development
- Admin API for configuration management
- Per-minute, per-hour, and monthly limits

Usage:
    from backend.services.rate_limit import get_rate_limit_service, RateLimitService
    
    service = get_rate_limit_service()
    
    # Check if action is allowed
    result = await service.check("creations", user_id, tier="free")
    if result.allowed:
        # Perform action
        await service.increment("creations", user_id)
    else:
        # Return 429 with result.retry_after
        pass
"""

from backend.services.rate_limit.service import (
    RateLimitService,
    RateLimitResult,
    get_rate_limit_service,
)
from backend.services.rate_limit.config import (
    RATE_LIMITS,
    LimitType,
    get_limit,
    get_all_limits_for_tier,
    LIMIT_CONFIGS,
)
from backend.services.rate_limit.compat import (
    check_login_rate_limit,
    check_signup_rate_limit,
    reset_login_rate_limit,
    check_coach_message_rate_limit,
    check_coach_session_rate_limit,
    get_coach_rate_limit_status,
    check_api_rate_limit,
    check_rate_limit,
    check_rate_limit_no_increment,
    get_client_ip,
    create_rate_limit_response,
    RATE_LIMITING_ENABLED,
)

__all__ = [
    # Service
    "RateLimitService",
    "RateLimitResult",
    "get_rate_limit_service",
    # Config
    "RATE_LIMITS",
    "LimitType",
    "get_limit",
    "get_all_limits_for_tier",
    "LIMIT_CONFIGS",
    # Compat functions
    "check_login_rate_limit",
    "check_signup_rate_limit",
    "reset_login_rate_limit",
    "check_coach_message_rate_limit",
    "check_coach_session_rate_limit",
    "get_coach_rate_limit_status",
    "check_api_rate_limit",
    "check_rate_limit",
    "check_rate_limit_no_increment",
    "get_client_ip",
    "create_rate_limit_response",
    "RATE_LIMITING_ENABLED",
]
