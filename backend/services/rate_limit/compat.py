"""
Backward Compatibility Layer for Rate Limiting.

This module provides the same interface as the old rate_limit.py middleware
but uses the new unified RateLimitService under the hood.

This allows gradual migration without breaking existing code.
"""

import os
from typing import Optional
from fastapi import HTTPException, Request, status

from backend.services.rate_limit.service import get_rate_limit_service, RateLimitResult
from backend.services.rate_limit.config import LIMIT_CONFIGS, get_limit


# Enable/disable rate limiting (useful for testing)
RATE_LIMITING_ENABLED = os.getenv("RATE_LIMITING_ENABLED", "true").lower() == "true"


def get_client_ip(request: Request) -> str:
    """
    Extract client IP address from request.
    
    Handles X-Forwarded-For header for requests behind proxies/load balancers.
    """
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    if request.client:
        return request.client.host
    
    return "unknown"


def create_rate_limit_response(retry_after: int, limit_key: str = "") -> HTTPException:
    """Create a 429 Too Many Requests response."""
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={
            "error": {
                "message": "Too many requests. Please try again later.",
                "code": "RATE_LIMIT_EXCEEDED",
                "details": {
                    "retry_after_seconds": retry_after,
                    "limit_key": limit_key,
                }
            }
        },
        headers={"Retry-After": str(retry_after)}
    )


# =============================================================================
# Authentication Rate Limiting
# =============================================================================

async def check_login_rate_limit(request: Request, email: str) -> None:
    """
    Check login rate limit.
    
    Args:
        request: FastAPI request object
        email: Email address to rate limit
        
    Raises:
        HTTPException: 429 if rate limit exceeded
    """
    if not RATE_LIMITING_ENABLED:
        return
    
    email = email.lower().strip()
    service = get_rate_limit_service()
    
    # Use email as identifier for login attempts
    result = await service.check_and_increment("login_attempts", email, "free")
    
    if not result.allowed:
        raise create_rate_limit_response(result.retry_after or 60, "login_attempts")


async def check_signup_rate_limit(request: Request) -> None:
    """
    Check signup rate limit.
    
    Args:
        request: FastAPI request object
        
    Raises:
        HTTPException: 429 if rate limit exceeded
    """
    if not RATE_LIMITING_ENABLED:
        return
    
    client_ip = get_client_ip(request)
    service = get_rate_limit_service()
    
    result = await service.check_and_increment("signup_attempts", client_ip, "free")
    
    if not result.allowed:
        raise create_rate_limit_response(result.retry_after or 60, "signup_attempts")


def reset_login_rate_limit(email: str) -> None:
    """
    Reset login rate limit for an email after successful login.
    
    Note: This is now a no-op since we use sliding window.
    The rate limit will naturally expire.
    """
    # With sliding window, we don't need to reset - it auto-expires
    pass


# =============================================================================
# Coach Rate Limiting
# =============================================================================

async def check_coach_message_rate_limit(user_id: str, tier: str = "free") -> None:
    """
    Check rate limit for coach messages.
    
    Args:
        user_id: User ID to rate limit
        tier: User's subscription tier
        
    Raises:
        HTTPException: 429 if rate limit exceeded
    """
    if not RATE_LIMITING_ENABLED:
        return
    
    service = get_rate_limit_service()
    result = await service.check_and_increment("coach_messages_per_minute", user_id, tier)
    
    if not result.allowed:
        raise create_rate_limit_response(result.retry_after or 60, "coach_messages_per_minute")


async def check_coach_session_rate_limit(user_id: str, tier: str = "free") -> None:
    """
    Check rate limit for starting coach sessions.
    
    Args:
        user_id: User ID to rate limit
        tier: User's subscription tier
        
    Raises:
        HTTPException: 429 if rate limit exceeded
    """
    if not RATE_LIMITING_ENABLED:
        return
    
    service = get_rate_limit_service()
    result = await service.check_and_increment("coach_sessions_per_hour", user_id, tier)
    
    if not result.allowed:
        raise create_rate_limit_response(result.retry_after or 60, "coach_sessions_per_hour")


async def get_coach_rate_limit_status(user_id: str, tier: str = "free") -> dict:
    """
    Get current rate limit status for coach endpoints.
    
    Args:
        user_id: User ID to check
        tier: User's subscription tier
        
    Returns:
        Dict with remaining attempts for messages and sessions
    """
    service = get_rate_limit_service()
    
    msg_result = await service.check("coach_messages_per_minute", user_id, tier)
    session_result = await service.check("coach_sessions_per_hour", user_id, tier)
    
    return {
        "messages": {
            "remaining": msg_result.remaining,
            "limit": msg_result.limit,
            "window_seconds": 60,
        },
        "sessions": {
            "remaining": session_result.remaining,
            "limit": session_result.limit,
            "window_seconds": 3600,
        },
    }


# =============================================================================
# Global API Rate Limiting
# =============================================================================

async def check_api_rate_limit(
    request: Request,
    user_id: Optional[str] = None,
    tier: str = "free"
) -> RateLimitResult:
    """
    Check global API rate limit based on user tier.
    
    Args:
        request: FastAPI request object
        user_id: Authenticated user ID (None for anonymous)
        tier: User's subscription tier
        
    Returns:
        RateLimitResult with status
        
    Raises:
        HTTPException: 429 if rate limit exceeded
    """
    if not RATE_LIMITING_ENABLED:
        return RateLimitResult(
            allowed=True,
            limit=-1,
            used=0,
            remaining=-1,
            limit_key="api_requests",
            tier=tier,
        )
    
    # Use user_id if authenticated, otherwise IP
    identifier = user_id if user_id else get_client_ip(request)
    effective_tier = tier if user_id else "free"  # Anonymous uses free tier limits
    
    service = get_rate_limit_service()
    result = await service.check_and_increment("api_requests", identifier, effective_tier)
    
    if not result.allowed:
        raise create_rate_limit_response(result.retry_after or 60, "api_requests")
    
    return result


# =============================================================================
# Generic Rate Limit Check
# =============================================================================

async def check_rate_limit(
    limit_key: str,
    identifier: str,
    tier: str = "free",
) -> RateLimitResult:
    """
    Generic rate limit check using the unified service.
    
    Args:
        limit_key: The limit to check (from config)
        identifier: User ID, IP, or email
        tier: User's subscription tier
        
    Returns:
        RateLimitResult
        
    Raises:
        HTTPException: 429 if rate limit exceeded
    """
    if not RATE_LIMITING_ENABLED:
        return RateLimitResult(
            allowed=True,
            limit=-1,
            used=0,
            remaining=-1,
            limit_key=limit_key,
            tier=tier,
        )
    
    service = get_rate_limit_service()
    result = await service.check_and_increment(limit_key, identifier, tier)
    
    if not result.allowed:
        raise create_rate_limit_response(result.retry_after or 60, limit_key)
    
    return result


async def check_rate_limit_no_increment(
    limit_key: str,
    identifier: str,
    tier: str = "free",
) -> RateLimitResult:
    """
    Check rate limit without incrementing (for display purposes).
    
    Args:
        limit_key: The limit to check
        identifier: User ID, IP, or email
        tier: User's subscription tier
        
    Returns:
        RateLimitResult
    """
    if not RATE_LIMITING_ENABLED:
        return RateLimitResult(
            allowed=True,
            limit=-1,
            used=0,
            remaining=-1,
            limit_key=limit_key,
            tier=tier,
        )
    
    service = get_rate_limit_service()
    return await service.check(limit_key, identifier, tier)
