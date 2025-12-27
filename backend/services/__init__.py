"""
Aurastream Services Package.

This package contains core business logic services for the application.
"""

# Password Service
from backend.services.password_service import (
    PasswordService,
    PasswordValidationResult,
    password_service,
    BCRYPT_COST_FACTOR,
    MIN_PASSWORD_LENGTH,
    MAX_PASSWORD_LENGTH,
)

# Exceptions
from backend.services.exceptions import (
    StreamerStudioError,
    TokenExpiredError,
    TokenInvalidError,
    TokenRevokedError,
    InvalidCredentialsError,
    EmailExistsError,
    UserNotFoundError,
    WeakPasswordError,
    RateLimitExceededError,
)

# JWT Service
from backend.services.jwt_service import (
    JWTService,
    TokenPayload,
)

# Auth Service
from backend.services.auth_service import (
    AuthService,
    TokenPair,
    User,
    get_auth_service,
)

__all__ = [
    # Password Service
    "PasswordService",
    "PasswordValidationResult",
    "password_service",
    "BCRYPT_COST_FACTOR",
    "MIN_PASSWORD_LENGTH",
    "MAX_PASSWORD_LENGTH",
    # Exceptions
    "StreamerStudioError",
    "TokenExpiredError",
    "TokenInvalidError",
    "TokenRevokedError",
    "InvalidCredentialsError",
    "EmailExistsError",
    "UserNotFoundError",
    "WeakPasswordError",
    "RateLimitExceededError",
    # JWT Service
    "JWTService",
    "TokenPayload",
    # Auth Service
    "AuthService",
    "TokenPair",
    "User",
    "get_auth_service",
]
