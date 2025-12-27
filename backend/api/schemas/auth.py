"""
Pydantic schemas for authentication endpoints.

This module defines request/response schemas for:
- User signup and login
- Token refresh and logout
- OAuth flows
- Password validation

All schemas use Pydantic v2 syntax with comprehensive validation
and OpenAPI documentation.
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field, field_validator
import re

# ============================================================================
# Request Schemas
# ============================================================================

class SignupRequest(BaseModel):
    """Request body for user registration."""
    email: EmailStr = Field(
        ...,
        description="User's email address",
        examples=["creator@example.com"]
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password (8-128 characters, must include uppercase, lowercase, and number)",
        examples=["SecurePass123"]
    )
    display_name: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Display name shown to other users",
        examples=["StreamerPro"]
    )
    accept_terms: bool = Field(
        ...,
        description="User must accept Terms of Service and Privacy Policy"
    )
    terms_version: str = Field(
        default="1.0.0",
        description="Version of Terms of Service being accepted"
    )
    privacy_version: str = Field(
        default="1.0.0",
        description="Version of Privacy Policy being accepted"
    )
    
    @field_validator('accept_terms')
    @classmethod
    def validate_terms_accepted(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must accept the Terms of Service and Privacy Policy to create an account")
        return v
    
    @field_validator('display_name')
    @classmethod
    def validate_display_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Display name cannot be empty or whitespace only")
        # Allow letters, numbers, spaces, underscores, hyphens
        if not re.match(r'^[\w\s\-]+$', v):
            raise ValueError("Display name can only contain letters, numbers, spaces, underscores, and hyphens")
        return v

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "email": "creator@example.com",
                    "password": "SecurePass123",
                    "display_name": "StreamerPro",
                    "accept_terms": True,
                    "terms_version": "1.0.0",
                    "privacy_version": "1.0.0"
                }
            ]
        }
    }


class LoginRequest(BaseModel):
    """Request body for user login."""
    email: EmailStr = Field(
        ...,
        description="User's email address",
        examples=["creator@example.com"]
    )
    password: str = Field(
        ...,
        description="User's password",
        examples=["SecurePass123"]
    )
    remember_me: bool = Field(
        default=False,
        description="If true, extends token expiration"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "email": "creator@example.com",
                    "password": "SecurePass123",
                    "remember_me": False
                }
            ]
        }
    }


class RefreshRequest(BaseModel):
    """Request body for token refresh."""
    refresh_token: str = Field(
        ...,
        description="Refresh token from login response",
        examples=["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."]
    )


class OAuthCallbackRequest(BaseModel):
    """Query parameters for OAuth callback."""
    code: str = Field(..., description="Authorization code from OAuth provider")
    state: str = Field(..., description="State parameter for CSRF protection")


# ============================================================================
# Response Schemas
# ============================================================================

class UserResponse(BaseModel):
    """User data returned in API responses (excludes sensitive fields)."""
    id: str = Field(..., description="Unique user identifier (UUID)")
    email: str = Field(..., description="User's email address")
    email_verified: bool = Field(..., description="Whether email has been verified")
    display_name: str = Field(..., description="User's display name")
    avatar_url: Optional[str] = Field(None, description="URL to user's avatar image")
    subscription_tier: Literal['free', 'pro', 'studio'] = Field(
        ..., 
        description="Current subscription tier"
    )
    subscription_status: Literal['active', 'past_due', 'canceled', 'none'] = Field(
        ...,
        description="Current subscription status"
    )
    assets_generated_this_month: int = Field(
        ...,
        description="Number of assets generated in current billing period"
    )
    terms_accepted_at: Optional[datetime] = Field(
        None,
        description="Timestamp when Terms of Service were accepted"
    )
    terms_version: Optional[str] = Field(
        None,
        description="Version of Terms of Service accepted"
    )
    privacy_accepted_at: Optional[datetime] = Field(
        None,
        description="Timestamp when Privacy Policy was accepted"
    )
    privacy_version: Optional[str] = Field(
        None,
        description="Version of Privacy Policy accepted"
    )
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "email": "creator@example.com",
                    "email_verified": True,
                    "display_name": "StreamerPro",
                    "avatar_url": "https://cdn.streamerstudio.com/avatars/550e8400.jpg",
                    "subscription_tier": "pro",
                    "subscription_status": "active",
                    "assets_generated_this_month": 42,
                    "created_at": "2024-01-15T10:30:00Z",
                    "updated_at": "2024-01-20T14:22:00Z"
                }
            ]
        }
    }


class TokenResponse(BaseModel):
    """Token data returned after successful authentication."""
    access_token: str = Field(..., description="JWT access token (24h expiry)")
    refresh_token: str = Field(..., description="Refresh token (30d expiry)")
    token_type: str = Field(default="bearer", description="Token type")
    expires_at: datetime = Field(..., description="Access token expiration timestamp")


class SignupResponse(BaseModel):
    """Response for successful signup."""
    user: UserResponse
    message: str = Field(
        default="Account created successfully. Please check your email to verify your account.",
        description="Success message"
    )


class LoginResponse(BaseModel):
    """Response for successful login."""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="Refresh token")
    token_type: str = Field(default="bearer")
    expires_at: datetime = Field(..., description="Access token expiration")
    user: UserResponse
    csrf_token: Optional[str] = Field(
        None,
        description="CSRF token for web clients (also set in HTTP-only cookie)"
    )


class RefreshResponse(BaseModel):
    """Response for successful token refresh."""
    access_token: str = Field(..., description="New JWT access token")
    refresh_token: str = Field(
        ..., 
        description="New refresh token (token rotation for security)"
    )
    token_type: str = Field(default="bearer")
    expires_at: datetime = Field(..., description="New access token expiration")


class LogoutResponse(BaseModel):
    """Response for successful logout."""
    message: str = Field(default="Successfully logged out")


class OAuthInitiateResponse(BaseModel):
    """Response for OAuth flow initiation."""
    authorization_url: str = Field(..., description="URL to redirect user for OAuth")
    state: str = Field(..., description="State parameter for CSRF validation")


class PasswordStrengthResponse(BaseModel):
    """Response for password strength check."""
    is_valid: bool = Field(..., description="Whether password meets requirements")
    score: int = Field(..., ge=0, le=4, description="Strength score (0-4)")
    strength_label: str = Field(..., description="Human-readable strength label")
    failed_requirements: list[str] = Field(
        default_factory=list,
        description="List of unmet requirements"
    )
    suggestions: list[str] = Field(
        default_factory=list,
        description="Suggestions for improvement"
    )


# ============================================================================
# API Response Envelope
# ============================================================================

class ResponseMeta(BaseModel):
    """Metadata included in all API responses."""
    request_id: str = Field(..., description="Unique request identifier for tracing")
    timestamp: datetime = Field(..., description="Response timestamp")


class ApiResponse(BaseModel):
    """Standard API response envelope."""
    data: dict | list | None = Field(..., description="Response data")
    meta: ResponseMeta


class ApiErrorDetail(BaseModel):
    """Error detail structure."""
    message: str = Field(..., description="Human-readable error message")
    code: str = Field(..., description="Machine-readable error code")
    details: Optional[dict] = Field(None, description="Additional error context")


class ApiErrorResponse(BaseModel):
    """Standard API error response."""
    error: ApiErrorDetail
    meta: ResponseMeta


# ============================================================================
# Extended Auth Schemas
# ============================================================================

class PasswordResetRequest(BaseModel):
    """Request body for password reset initiation."""
    email: EmailStr = Field(
        ...,
        description="Email address associated with the account",
        examples=["creator@example.com"]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "email": "creator@example.com"
                }
            ]
        }
    }


class PasswordResetConfirm(BaseModel):
    """Request body for password reset confirmation."""
    token: str = Field(
        ...,
        description="Password reset token from email",
        examples=["abc123..."]
    )
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="New password (8-128 characters)",
        examples=["NewSecurePass123"]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "token": "abc123xyz789",
                    "new_password": "NewSecurePass123"
                }
            ]
        }
    }


class ProfileUpdate(BaseModel):
    """Request body for profile update."""
    display_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=50,
        description="New display name",
        examples=["StreamerPro"]
    )
    avatar_url: Optional[str] = Field(
        None,
        description="URL to new avatar image",
        examples=["https://cdn.example.com/avatar.jpg"]
    )
    
    @field_validator('display_name')
    @classmethod
    def validate_display_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Display name cannot be empty or whitespace only")
        # Allow letters, numbers, spaces, underscores, hyphens
        if not re.match(r'^[\w\s\-]+$', v):
            raise ValueError("Display name can only contain letters, numbers, spaces, underscores, and hyphens")
        return v

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "display_name": "NewDisplayName",
                    "avatar_url": "https://cdn.example.com/avatar.jpg"
                }
            ]
        }
    }


class PasswordChange(BaseModel):
    """Request body for password change."""
    current_password: str = Field(
        ...,
        description="Current password for verification",
        examples=["CurrentPass123"]
    )
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="New password (8-128 characters)",
        examples=["NewSecurePass123"]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "current_password": "CurrentPass123",
                    "new_password": "NewSecurePass123"
                }
            ]
        }
    }


class AccountDelete(BaseModel):
    """Request body for account deletion."""
    password: str = Field(
        ...,
        description="Current password for verification",
        examples=["CurrentPass123"]
    )
    confirmation: str = Field(
        ...,
        description="Must be exactly 'DELETE' to confirm",
        examples=["DELETE"]
    )
    
    @field_validator('confirmation')
    @classmethod
    def validate_confirmation(cls, v: str) -> str:
        if v != "DELETE":
            raise ValueError("Confirmation must be exactly 'DELETE'")
        return v

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "password": "CurrentPass123",
                    "confirmation": "DELETE"
                }
            ]
        }
    }


class MessageResponse(BaseModel):
    """Simple message response."""
    message: str = Field(..., description="Response message")
