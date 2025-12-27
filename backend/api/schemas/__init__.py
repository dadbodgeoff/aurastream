"""
API Schemas Package

This package contains Pydantic schemas for request/response validation
and OpenAPI documentation.
"""

from .auth import (
    # Request schemas
    SignupRequest,
    LoginRequest,
    RefreshRequest,
    OAuthCallbackRequest,
    # Response schemas
    UserResponse,
    TokenResponse,
    SignupResponse,
    LoginResponse,
    RefreshResponse,
    LogoutResponse,
    OAuthInitiateResponse,
    PasswordStrengthResponse,
    # API envelope schemas
    ResponseMeta,
    ApiResponse,
    ApiErrorDetail,
    ApiErrorResponse,
)

__all__ = [
    # Request schemas
    "SignupRequest",
    "LoginRequest",
    "RefreshRequest",
    "OAuthCallbackRequest",
    # Response schemas
    "UserResponse",
    "TokenResponse",
    "SignupResponse",
    "LoginResponse",
    "RefreshResponse",
    "LogoutResponse",
    "OAuthInitiateResponse",
    "PasswordStrengthResponse",
    # API envelope schemas
    "ResponseMeta",
    "ApiResponse",
    "ApiErrorDetail",
    "ApiErrorResponse",
]
