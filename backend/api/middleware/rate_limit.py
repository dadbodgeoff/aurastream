"""
Rate Limiting Middleware for Aurastream.

This module provides rate limiting functionality to protect endpoints
from brute force attacks and abuse:

Authentication:
- Login: 5 attempts per email per 15 minutes
- Signup: 10 attempts per IP per hour

Coach:
- Messages: 10 per user per minute
- Sessions: 20 per user per hour

Global API (tier-based, requests per minute):
- anonymous: 30/min (by IP)
- free: 60/min (by user ID)
- pro: 120/min (by user ID)
- studio: 300/min (by user ID)

Features:
- Thread-safe in-memory storage with TTL
- Configurable limits via environment variables
- Returns 429 with Retry-After header when limit exceeded
- Decorator for easy application to routes
- Rate limit headers on all API responses

Security Notes:
- Rate limits are per-email for login (prevents credential stuffing)
- Rate limits are per-IP for signup (prevents mass account creation)
- Never log the actual passwords or tokens
"""

import os
import time
import threading
from dataclasses import dataclass, field
from functools import wraps
from typing import Callable, Dict, Optional, Tuple

from fastapi import HTTPException, Request, status


# =============================================================================
# Configuration
# =============================================================================

# Login rate limiting: 5 attempts per email per 15 minutes
LOGIN_MAX_ATTEMPTS = int(os.getenv("RATE_LIMIT_LOGIN_MAX_ATTEMPTS", "5"))
LOGIN_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_LOGIN_WINDOW_SECONDS", str(15 * 60)))  # 15 minutes

# Signup rate limiting: 10 attempts per IP per hour
SIGNUP_MAX_ATTEMPTS = int(os.getenv("RATE_LIMIT_SIGNUP_MAX_ATTEMPTS", "10"))
SIGNUP_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_SIGNUP_WINDOW_SECONDS", str(60 * 60)))  # 1 hour

# Coach rate limiting: messages per user per minute
COACH_MESSAGE_MAX_ATTEMPTS = int(os.getenv("RATE_LIMIT_COACH_MESSAGE_MAX_ATTEMPTS", "10"))
COACH_MESSAGE_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_COACH_MESSAGE_WINDOW_SECONDS", "60"))  # 1 minute

# Coach session start rate limiting: sessions per user per hour
COACH_SESSION_MAX_ATTEMPTS = int(os.getenv("RATE_LIMIT_COACH_SESSION_MAX_ATTEMPTS", "20"))
COACH_SESSION_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_COACH_SESSION_WINDOW_SECONDS", str(60 * 60)))  # 1 hour

# =============================================================================
# Global API Rate Limiting (per user/IP)
# =============================================================================

# Tier-based API rate limits (requests per minute)
API_RATE_LIMITS = {
    "free": int(os.getenv("RATE_LIMIT_API_FREE", "60")),      # 60 req/min
    "pro": int(os.getenv("RATE_LIMIT_API_PRO", "120")),       # 120 req/min
    "studio": int(os.getenv("RATE_LIMIT_API_STUDIO", "300")), # 300 req/min
    "anonymous": int(os.getenv("RATE_LIMIT_API_ANON", "30")), # 30 req/min (unauthenticated)
}
API_RATE_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_API_WINDOW_SECONDS", "60"))  # 1 minute

# Enable/disable rate limiting (useful for testing)
RATE_LIMITING_ENABLED = os.getenv("RATE_LIMITING_ENABLED", "true").lower() == "true"


# =============================================================================
# Rate Limit Entry
# =============================================================================

@dataclass
class RateLimitEntry:
    """
    Represents a rate limit entry for a specific key.
    
    Attributes:
        count: Number of attempts in the current window
        window_start: Unix timestamp when the window started
        expires_at: Unix timestamp when this entry expires
    """
    count: int = 0
    window_start: float = field(default_factory=time.time)
    expires_at: float = 0.0
    
    def is_expired(self) -> bool:
        """Check if this entry has expired."""
        return time.time() > self.expires_at
    
    def reset(self, window_seconds: int) -> None:
        """Reset the entry for a new window."""
        now = time.time()
        self.count = 0
        self.window_start = now
        self.expires_at = now + window_seconds


# =============================================================================
# Thread-Safe Rate Limit Store
# =============================================================================

class RateLimitStore:
    """
    Thread-safe in-memory storage for rate limit counters.
    
    Uses a dictionary with TTL-based expiration. Entries are cleaned up
    lazily when accessed or periodically via cleanup method.
    
    Thread Safety:
    - All operations are protected by a threading.Lock
    - Safe for use in multi-threaded ASGI servers
    """
    
    def __init__(self):
        """Initialize the rate limit store."""
        self._store: Dict[str, RateLimitEntry] = {}
        self._lock = threading.Lock()
        self._last_cleanup = time.time()
        self._cleanup_interval = 300  # Clean up every 5 minutes
    
    def _maybe_cleanup(self) -> None:
        """
        Periodically clean up expired entries.
        
        Called internally during operations to prevent memory growth.
        Must be called while holding the lock.
        """
        now = time.time()
        if now - self._last_cleanup > self._cleanup_interval:
            expired_keys = [
                key for key, entry in self._store.items()
                if entry.is_expired()
            ]
            for key in expired_keys:
                del self._store[key]
            self._last_cleanup = now
    
    def check_and_increment(
        self,
        key: str,
        max_attempts: int,
        window_seconds: int
    ) -> Tuple[bool, int]:
        """
        Check if rate limit is exceeded and increment counter.
        
        Args:
            key: Unique identifier for the rate limit (e.g., email or IP)
            max_attempts: Maximum allowed attempts in the window
            window_seconds: Duration of the rate limit window
            
        Returns:
            Tuple of (is_allowed, retry_after_seconds)
            - is_allowed: True if request should be allowed
            - retry_after_seconds: Seconds until rate limit resets (0 if allowed)
        """
        with self._lock:
            self._maybe_cleanup()
            
            now = time.time()
            entry = self._store.get(key)
            
            # Create new entry if doesn't exist or expired
            if entry is None or entry.is_expired():
                entry = RateLimitEntry()
                entry.reset(window_seconds)
                self._store[key] = entry
            
            # Check if within same window but window has passed
            if now - entry.window_start >= window_seconds:
                entry.reset(window_seconds)
            
            # Check if limit exceeded
            if entry.count >= max_attempts:
                retry_after = int(entry.expires_at - now)
                return False, max(retry_after, 1)
            
            # Increment counter
            entry.count += 1
            return True, 0
    
    def get_remaining(self, key: str, max_attempts: int) -> int:
        """
        Get remaining attempts for a key.
        
        Args:
            key: Unique identifier for the rate limit
            max_attempts: Maximum allowed attempts
            
        Returns:
            Number of remaining attempts
        """
        with self._lock:
            entry = self._store.get(key)
            if entry is None or entry.is_expired():
                return max_attempts
            return max(0, max_attempts - entry.count)
    
    def reset(self, key: str) -> None:
        """
        Reset rate limit for a key.
        
        Useful for clearing rate limits after successful authentication
        or for administrative purposes.
        
        Args:
            key: Unique identifier to reset
        """
        with self._lock:
            if key in self._store:
                del self._store[key]
    
    def clear_all(self) -> None:
        """Clear all rate limit entries. Useful for testing."""
        with self._lock:
            self._store.clear()


# Global rate limit store instance
_rate_limit_store: Optional[RateLimitStore] = None


def get_rate_limit_store() -> RateLimitStore:
    """Get or create the global rate limit store."""
    global _rate_limit_store
    if _rate_limit_store is None:
        _rate_limit_store = RateLimitStore()
    return _rate_limit_store


# =============================================================================
# Helper Functions
# =============================================================================

def get_client_ip(request: Request) -> str:
    """
    Extract client IP address from request.
    
    Handles X-Forwarded-For header for requests behind proxies/load balancers.
    Falls back to direct client host if header not present.
    
    Args:
        request: FastAPI request object
        
    Returns:
        Client IP address string
    """
    # Check X-Forwarded-For header (set by proxies/load balancers)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP (original client)
        return forwarded_for.split(",")[0].strip()
    
    # Check X-Real-IP header (alternative proxy header)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    # Fall back to direct client
    if request.client:
        return request.client.host
    
    return "unknown"


def create_rate_limit_response(retry_after: int) -> HTTPException:
    """
    Create a 429 Too Many Requests response.
    
    Args:
        retry_after: Seconds until the client can retry
        
    Returns:
        HTTPException with proper status code and headers
    """
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={
            "error": {
                "message": "Too many requests. Please try again later.",
                "code": "RATE_LIMIT_EXCEEDED",
                "details": {
                    "retry_after_seconds": retry_after
                }
            }
        },
        headers={"Retry-After": str(retry_after)}
    )


# =============================================================================
# Rate Limit Decorators
# =============================================================================

def rate_limit_login(func: Callable) -> Callable:
    """
    Decorator to apply login rate limiting.
    
    Rate limits by email address: 5 attempts per 15 minutes.
    The email is extracted from the request body.
    
    Usage:
        @router.post("/login")
        @rate_limit_login
        async def login(request: Request, data: LoginRequest):
            ...
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        if not RATE_LIMITING_ENABLED:
            return await func(*args, **kwargs)
        
        # Extract request and data from kwargs
        request: Optional[Request] = kwargs.get("request")
        data = kwargs.get("data")
        
        if request is None or data is None:
            # Can't rate limit without request/data, proceed anyway
            return await func(*args, **kwargs)
        
        # Get email from request data
        email = getattr(data, "email", None)
        if email is None:
            return await func(*args, **kwargs)
        
        # Normalize email for consistent rate limiting
        email = email.lower().strip()
        key = f"login:{email}"
        
        store = get_rate_limit_store()
        is_allowed, retry_after = store.check_and_increment(
            key=key,
            max_attempts=LOGIN_MAX_ATTEMPTS,
            window_seconds=LOGIN_WINDOW_SECONDS
        )
        
        if not is_allowed:
            raise create_rate_limit_response(retry_after)
        
        return await func(*args, **kwargs)
    
    return wrapper


def rate_limit_signup(func: Callable) -> Callable:
    """
    Decorator to apply signup rate limiting.
    
    Rate limits by IP address: 10 attempts per hour.
    
    Usage:
        @router.post("/signup")
        @rate_limit_signup
        async def signup(request: Request, data: SignupRequest):
            ...
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        if not RATE_LIMITING_ENABLED:
            return await func(*args, **kwargs)
        
        # Extract request from kwargs
        request: Optional[Request] = kwargs.get("request")
        
        if request is None:
            return await func(*args, **kwargs)
        
        # Get client IP
        client_ip = get_client_ip(request)
        key = f"signup:{client_ip}"
        
        store = get_rate_limit_store()
        is_allowed, retry_after = store.check_and_increment(
            key=key,
            max_attempts=SIGNUP_MAX_ATTEMPTS,
            window_seconds=SIGNUP_WINDOW_SECONDS
        )
        
        if not is_allowed:
            raise create_rate_limit_response(retry_after)
        
        return await func(*args, **kwargs)
    
    return wrapper


def rate_limit(
    key_func: Callable[[Request], str],
    max_attempts: int,
    window_seconds: int
) -> Callable:
    """
    Generic rate limit decorator with custom key function.
    
    Args:
        key_func: Function that extracts the rate limit key from request
        max_attempts: Maximum allowed attempts in the window
        window_seconds: Duration of the rate limit window
        
    Usage:
        @rate_limit(
            key_func=lambda r: f"api:{get_client_ip(r)}",
            max_attempts=100,
            window_seconds=60
        )
        async def my_endpoint(request: Request):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if not RATE_LIMITING_ENABLED:
                return await func(*args, **kwargs)
            
            request: Optional[Request] = kwargs.get("request")
            if request is None:
                # Try to find request in args
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            if request is None:
                return await func(*args, **kwargs)
            
            key = key_func(request)
            store = get_rate_limit_store()
            is_allowed, retry_after = store.check_and_increment(
                key=key,
                max_attempts=max_attempts,
                window_seconds=window_seconds
            )
            
            if not is_allowed:
                raise create_rate_limit_response(retry_after)
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


# =============================================================================
# FastAPI Dependency for Rate Limiting
# =============================================================================

async def check_login_rate_limit(request: Request, email: str) -> None:
    """
    FastAPI dependency to check login rate limit.
    
    Args:
        request: FastAPI request object
        email: Email address to rate limit
        
    Raises:
        HTTPException: 429 if rate limit exceeded
    """
    if not RATE_LIMITING_ENABLED:
        return
    
    email = email.lower().strip()
    key = f"login:{email}"
    
    store = get_rate_limit_store()
    is_allowed, retry_after = store.check_and_increment(
        key=key,
        max_attempts=LOGIN_MAX_ATTEMPTS,
        window_seconds=LOGIN_WINDOW_SECONDS
    )
    
    if not is_allowed:
        raise create_rate_limit_response(retry_after)


async def check_signup_rate_limit(request: Request) -> None:
    """
    FastAPI dependency to check signup rate limit.
    
    Args:
        request: FastAPI request object
        
    Raises:
        HTTPException: 429 if rate limit exceeded
    """
    if not RATE_LIMITING_ENABLED:
        return
    
    client_ip = get_client_ip(request)
    key = f"signup:{client_ip}"
    
    store = get_rate_limit_store()
    is_allowed, retry_after = store.check_and_increment(
        key=key,
        max_attempts=SIGNUP_MAX_ATTEMPTS,
        window_seconds=SIGNUP_WINDOW_SECONDS
    )
    
    if not is_allowed:
        raise create_rate_limit_response(retry_after)


def reset_login_rate_limit(email: str) -> None:
    """
    Reset login rate limit for an email after successful login.
    
    Call this after successful authentication to clear the rate limit
    counter for the user.
    
    Args:
        email: Email address to reset
    """
    email = email.lower().strip()
    key = f"login:{email}"
    get_rate_limit_store().reset(key)


# =============================================================================
# Coach Rate Limiting
# =============================================================================

async def check_coach_message_rate_limit(user_id: str) -> None:
    """
    Check rate limit for coach messages.
    
    Limits users to COACH_MESSAGE_MAX_ATTEMPTS messages per minute.
    This prevents abuse of the LLM API.
    
    Args:
        user_id: User ID to rate limit
        
    Raises:
        HTTPException: 429 if rate limit exceeded
    """
    if not RATE_LIMITING_ENABLED:
        return
    
    key = f"coach:message:{user_id}"
    
    store = get_rate_limit_store()
    is_allowed, retry_after = store.check_and_increment(
        key=key,
        max_attempts=COACH_MESSAGE_MAX_ATTEMPTS,
        window_seconds=COACH_MESSAGE_WINDOW_SECONDS
    )
    
    if not is_allowed:
        raise create_rate_limit_response(retry_after)


async def check_coach_session_rate_limit(user_id: str) -> None:
    """
    Check rate limit for starting coach sessions.
    
    Limits users to COACH_SESSION_MAX_ATTEMPTS new sessions per hour.
    This prevents excessive session creation.
    
    Args:
        user_id: User ID to rate limit
        
    Raises:
        HTTPException: 429 if rate limit exceeded
    """
    if not RATE_LIMITING_ENABLED:
        return
    
    key = f"coach:session:{user_id}"
    
    store = get_rate_limit_store()
    is_allowed, retry_after = store.check_and_increment(
        key=key,
        max_attempts=COACH_SESSION_MAX_ATTEMPTS,
        window_seconds=COACH_SESSION_WINDOW_SECONDS
    )
    
    if not is_allowed:
        raise create_rate_limit_response(retry_after)


def get_coach_rate_limit_status(user_id: str) -> dict:
    """
    Get current rate limit status for coach endpoints.
    
    Useful for displaying remaining attempts to users.
    
    Args:
        user_id: User ID to check
        
    Returns:
        Dict with remaining attempts for messages and sessions
    """
    store = get_rate_limit_store()
    
    return {
        "messages": {
            "remaining": store.get_remaining(f"coach:message:{user_id}", COACH_MESSAGE_MAX_ATTEMPTS),
            "limit": COACH_MESSAGE_MAX_ATTEMPTS,
            "window_seconds": COACH_MESSAGE_WINDOW_SECONDS,
        },
        "sessions": {
            "remaining": store.get_remaining(f"coach:session:{user_id}", COACH_SESSION_MAX_ATTEMPTS),
            "limit": COACH_SESSION_MAX_ATTEMPTS,
            "window_seconds": COACH_SESSION_WINDOW_SECONDS,
        },
    }


# =============================================================================
# Global API Rate Limiting
# =============================================================================

async def check_api_rate_limit(
    request: Request,
    user_id: Optional[str] = None,
    tier: str = "anonymous"
) -> None:
    """
    Check global API rate limit based on user tier.
    
    Rate limits (requests per minute):
    - anonymous: 30/min (by IP)
    - free: 60/min (by user ID)
    - pro: 120/min (by user ID)
    - studio: 300/min (by user ID)
    
    Args:
        request: FastAPI request object
        user_id: Authenticated user ID (None for anonymous)
        tier: User's subscription tier
        
    Raises:
        HTTPException: 429 if rate limit exceeded
    """
    if not RATE_LIMITING_ENABLED:
        return
    
    # Determine rate limit key and max attempts
    if user_id:
        key = f"api:user:{user_id}"
        max_attempts = API_RATE_LIMITS.get(tier, API_RATE_LIMITS["free"])
    else:
        client_ip = get_client_ip(request)
        key = f"api:ip:{client_ip}"
        max_attempts = API_RATE_LIMITS["anonymous"]
    
    store = get_rate_limit_store()
    is_allowed, retry_after = store.check_and_increment(
        key=key,
        max_attempts=max_attempts,
        window_seconds=API_RATE_WINDOW_SECONDS
    )
    
    if not is_allowed:
        raise create_rate_limit_response(retry_after)


def get_api_rate_limit_status(
    request: Request,
    user_id: Optional[str] = None,
    tier: str = "anonymous"
) -> dict:
    """
    Get current API rate limit status.
    
    Args:
        request: FastAPI request object
        user_id: Authenticated user ID (None for anonymous)
        tier: User's subscription tier
        
    Returns:
        Dict with remaining requests and limit info
    """
    store = get_rate_limit_store()
    
    if user_id:
        key = f"api:user:{user_id}"
        max_attempts = API_RATE_LIMITS.get(tier, API_RATE_LIMITS["free"])
    else:
        client_ip = get_client_ip(request)
        key = f"api:ip:{client_ip}"
        max_attempts = API_RATE_LIMITS["anonymous"]
    
    remaining = store.get_remaining(key, max_attempts)
    
    return {
        "remaining": remaining,
        "limit": max_attempts,
        "window_seconds": API_RATE_WINDOW_SECONDS,
        "tier": tier if user_id else "anonymous",
    }


__all__ = [
    # Configuration
    "LOGIN_MAX_ATTEMPTS",
    "LOGIN_WINDOW_SECONDS",
    "SIGNUP_MAX_ATTEMPTS",
    "SIGNUP_WINDOW_SECONDS",
    "COACH_MESSAGE_MAX_ATTEMPTS",
    "COACH_MESSAGE_WINDOW_SECONDS",
    "COACH_SESSION_MAX_ATTEMPTS",
    "COACH_SESSION_WINDOW_SECONDS",
    "API_RATE_LIMITS",
    "API_RATE_WINDOW_SECONDS",
    "RATE_LIMITING_ENABLED",
    # Store
    "RateLimitStore",
    "RateLimitEntry",
    "get_rate_limit_store",
    # Helpers
    "get_client_ip",
    "create_rate_limit_response",
    # Decorators
    "rate_limit_login",
    "rate_limit_signup",
    "rate_limit",
    # Dependencies
    "check_login_rate_limit",
    "check_signup_rate_limit",
    "reset_login_rate_limit",
    # Coach Rate Limiting
    "check_coach_message_rate_limit",
    "check_coach_session_rate_limit",
    "get_coach_rate_limit_status",
    # Global API Rate Limiting
    "check_api_rate_limit",
    "get_api_rate_limit_status",
]
