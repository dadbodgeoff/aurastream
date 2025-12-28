"""
Custom exceptions for Aurastream.

All exceptions inherit from StreamerStudioError and provide structured error
information including error codes, HTTP status codes, and optional details.

Security Note: Never include sensitive data (passwords, full tokens, etc.) in
exception details. Emails should be partially masked when included.
"""

from datetime import datetime
from typing import Optional


class StreamerStudioError(Exception):
    """
    Base exception for all Aurastream errors.
    
    Provides a consistent error structure with:
    - message: Human-readable error message
    - code: Machine-readable error code for client handling
    - status_code: HTTP status code for API responses
    - details: Additional context (never include sensitive data)
    """
    
    def __init__(
        self, 
        message: str, 
        code: str, 
        status_code: int = 400, 
        details: Optional[dict] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)
    
    def to_dict(self) -> dict:
        """Convert exception to dictionary for API responses."""
        return {
            "error": {
                "message": self.message,
                "code": self.code,
                "details": self.details
            }
        }


class TokenExpiredError(StreamerStudioError):
    """
    Raised when a JWT token has expired.
    
    This indicates the token was valid but has passed its expiration time.
    The client should attempt to refresh the token or re-authenticate.
    """
    
    def __init__(self, expired_at: Optional[datetime] = None):
        super().__init__(
            message="Token has expired",
            code="AUTH_TOKEN_EXPIRED",
            status_code=401,
            details={"expired_at": expired_at.isoformat() if expired_at else None}
        )


class TokenInvalidError(StreamerStudioError):
    """
    Raised when a JWT token is invalid (malformed, bad signature, etc.).
    
    This indicates the token could not be decoded or verified. The client
    should re-authenticate to obtain a new token.
    """
    
    def __init__(self, reason: str = "Invalid token"):
        super().__init__(
            message=reason,
            code="AUTH_TOKEN_INVALID",
            status_code=401,
            details={"reason": reason}
        )


class TokenRevokedError(StreamerStudioError):
    """
    Raised when a JWT token has been revoked/blacklisted.
    
    This indicates the token was valid but has been explicitly revoked
    (e.g., due to logout, password change, or security concern).
    """
    
    def __init__(self):
        super().__init__(
            message="Token has been revoked",
            code="AUTH_TOKEN_REVOKED",
            status_code=401
        )


class InvalidCredentialsError(StreamerStudioError):
    """
    Raised when login credentials are invalid.
    
    This is intentionally vague to prevent user enumeration attacks.
    Do not specify whether the email or password was incorrect.
    """
    
    def __init__(self):
        super().__init__(
            message="Invalid email or password",
            code="AUTH_INVALID_CREDENTIALS",
            status_code=401
        )


class EmailExistsError(StreamerStudioError):
    """
    Raised when trying to register with an existing email.
    
    The email is partially masked in details to prevent full disclosure
    while still providing useful feedback.
    """
    
    def __init__(self, email: str):
        # Mask email: show first 3 chars only
        masked_email = email[:3] + "***" if len(email) > 3 else "***"
        super().__init__(
            message="An account with this email already exists",
            code="AUTH_EMAIL_EXISTS",
            status_code=409,
            details={"email": masked_email}
        )


class UserNotFoundError(StreamerStudioError):
    """
    Raised when a user is not found.
    
    Used for operations that require an existing user (e.g., profile updates,
    password reset for known user). Do not use for login - use InvalidCredentialsError
    instead to prevent user enumeration.
    """
    
    def __init__(self, identifier: Optional[str] = None):
        super().__init__(
            message="User not found",
            code="RESOURCE_NOT_FOUND",
            status_code=404,
            details={"resource_type": "user"}
        )


class NotFoundError(StreamerStudioError):
    """
    Generic not found error for any resource type.
    
    Used when a resource (avatar, asset, etc.) is not found.
    Provides a consistent error structure with resource type and ID.
    """
    
    def __init__(self, resource_type: str, resource_id: Optional[str] = None):
        super().__init__(
            message=f"{resource_type} not found",
            code="RESOURCE_NOT_FOUND",
            status_code=404,
            details={
                "resource_type": resource_type.lower(),
                "resource_id": resource_id
            } if resource_id else {"resource_type": resource_type.lower()}
        )


class WeakPasswordError(StreamerStudioError):
    """
    Raised when password doesn't meet strength requirements.
    
    Includes specific requirements that failed to help users create
    a compliant password.
    """
    
    def __init__(self, requirements: list[str]):
        super().__init__(
            message="Password does not meet security requirements",
            code="VALIDATION_FAILED",
            status_code=422,
            details={"failed_requirements": requirements}
        )


class ValidationError(StreamerStudioError):
    """
    Raised when input validation fails.
    
    Generic validation error for request data that doesn't meet
    expected format or constraints.
    """
    
    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=422,
            details={"field": field} if field else {}
        )


class RateLimitExceededError(StreamerStudioError):
    """
    Raised when rate limit is exceeded.
    
    Includes retry_after_seconds to inform clients when they can retry.
    """
    
    def __init__(self, retry_after: int):
        super().__init__(
            message="Too many requests. Please try again later.",
            code="RATE_LIMIT_EXCEEDED",
            status_code=429,
            details={"retry_after_seconds": retry_after}
        )


class AuthorizationError(StreamerStudioError):
    """
    Raised when user is not authorized to access a resource.
    
    Used when a user attempts to access a resource they don't own
    or don't have permission to access.
    """
    
    def __init__(self, resource_type: str = "resource"):
        super().__init__(
            message="You are not authorized to access this resource",
            code="AUTHORIZATION_ERROR",
            status_code=403,
            details={"resource_type": resource_type}
        )


# ============================================================================
# Brand Kit Exceptions
# ============================================================================

# Import SUPPORTED_FONTS lazily to avoid circular imports
def _get_supported_fonts():
    """Lazy import of SUPPORTED_FONTS to avoid circular imports."""
    from backend.api.schemas.brand_kit import SUPPORTED_FONTS
    return SUPPORTED_FONTS


class BrandKitError(StreamerStudioError):
    """
    Base class for brand kit errors.
    
    All brand kit-specific exceptions inherit from this class.
    """
    
    def __init__(
        self, 
        code: str, 
        message: str, 
        details: dict = None, 
        status_code: int = 400
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=status_code,
            details=details
        )


class BrandKitNotFoundError(BrandKitError):
    """
    Raised when a brand kit is not found.
    
    Used when attempting to access, update, or delete a brand kit
    that doesn't exist or doesn't belong to the user.
    """
    
    def __init__(self, brand_kit_id: str):
        super().__init__(
            code="RESOURCE_NOT_FOUND",
            message="Brand kit not found",
            details={"resource_type": "brand_kit", "resource_id": brand_kit_id},
            status_code=404
        )


class BrandKitLimitExceededError(BrandKitError):
    """
    Raised when user has reached maximum brand kit limit.
    
    Users are limited to a maximum number of brand kits based on
    their subscription tier.
    """
    
    def __init__(self, current_count: int, max_count: int = 10):
        super().__init__(
            code="BRAND_KIT_LIMIT_EXCEEDED",
            message=f"Maximum brand kits ({max_count}) reached",
            details={"current_count": current_count, "max_count": max_count},
            status_code=403
        )


class HexColorValidationError(BrandKitError):
    """
    Raised when a hex color format is invalid.
    
    Hex colors must match the pattern #RRGGBB (6 hex digits).
    """
    
    def __init__(self, color: str):
        super().__init__(
            code="VALIDATION_HEX_COLOR",
            message=f"Invalid hex color format: {color}",
            details={"color": color, "expected_format": "#RRGGBB"},
            status_code=422
        )


class UnsupportedFontError(BrandKitError):
    """
    Raised when a font is not in the supported fonts list.
    
    Only fonts from the SUPPORTED_FONTS list can be used in brand kits.
    """
    
    def __init__(self, font: str):
        super().__init__(
            code="VALIDATION_FONT_UNSUPPORTED",
            message=f"Unsupported font: {font}",
            details={"font": font, "supported_fonts": _get_supported_fonts()},
            status_code=422
        )


# ============================================================================
# Prompt Engine Exceptions
# ============================================================================


class PromptEngineError(StreamerStudioError):
    """
    Base class for prompt engine errors.
    
    All prompt engine-specific exceptions inherit from this class.
    """
    
    def __init__(
        self, 
        code: str, 
        message: str, 
        details: dict = None, 
        status_code: int = 400
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=status_code,
            details=details
        )


class TemplateNotFoundError(PromptEngineError):
    """
    Raised when a prompt template cannot be found or loaded.
    
    This can occur when:
    - The template file doesn't exist
    - The template file is malformed YAML
    - The template is missing required fields
    - The version format is invalid
    """
    
    def __init__(self, asset_type: str, version: str, reason: str = "Template not found"):
        super().__init__(
            code="TEMPLATE_NOT_FOUND",
            message=f"Template not found for {asset_type} version {version}: {reason}",
            details={
                "asset_type": asset_type,
                "version": version,
                "reason": reason
            },
            status_code=404
        )


# ============================================================================
# Asset Generation Exceptions
# ============================================================================


class GenerationError(StreamerStudioError):
    """
    Base class for asset generation errors.
    
    All generation-specific exceptions inherit from this class.
    Used for errors during AI image generation operations.
    """
    
    def __init__(
        self,
        message: str,
        code: str = "GENERATION_ERROR",
        status_code: int = 500,
        details: Optional[dict] = None
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=status_code,
            details=details
        )


class RateLimitError(GenerationError):
    """
    Raised when the AI provider returns a 429 rate limit response.
    
    Includes the Retry-After header value to inform clients when
    they can retry the request.
    """
    
    def __init__(self, retry_after: int = 60):
        super().__init__(
            message="Rate limit exceeded. Please try again later.",
            code="GENERATION_RATE_LIMIT",
            status_code=429,
            details={"retry_after_seconds": retry_after}
        )
        self.retry_after = retry_after


class ContentPolicyError(GenerationError):
    """
    Raised when the AI provider rejects content due to policy violations.
    
    This indicates the prompt or generated content violated the
    provider's content policy guidelines.
    """
    
    def __init__(self, reason: str = "Content policy violation"):
        super().__init__(
            message="Content was blocked due to policy violation",
            code="GENERATION_CONTENT_POLICY",
            status_code=400,
            details={"reason": reason}
        )
        self.reason = reason


class GenerationTimeoutError(GenerationError):
    """
    Raised when an image generation request times out.
    
    This indicates the request took longer than the configured
    timeout period to complete.
    """
    
    def __init__(self, timeout_seconds: int = 30):
        super().__init__(
            message=f"Generation request timed out after {timeout_seconds} seconds",
            code="GENERATION_TIMEOUT",
            status_code=504,
            details={"timeout_seconds": timeout_seconds}
        )
        self.timeout_seconds = timeout_seconds


# ============================================================================
# Generation Job Exceptions
# ============================================================================


class JobNotFoundError(StreamerStudioError):
    """
    Raised when a generation job is not found.
    
    Used when attempting to access, update, or query a job
    that doesn't exist or doesn't belong to the user.
    """
    
    def __init__(self, job_id: str):
        super().__init__(
            message="Generation job not found",
            code="RESOURCE_NOT_FOUND",
            status_code=404,
            details={"resource_type": "generation_job", "resource_id": job_id}
        )


class InvalidStateTransitionError(StreamerStudioError):
    """
    Raised when an invalid job state transition is attempted.
    
    Job state machine only allows specific transitions:
    - queued → processing
    - processing → completed
    - processing → partial
    - processing → failed
    """
    
    def __init__(self, current_status: str, target_status: str):
        super().__init__(
            message=f"Invalid state transition from '{current_status}' to '{target_status}'",
            code="INVALID_STATE_TRANSITION",
            status_code=400,
            details={
                "current_status": current_status,
                "target_status": target_status,
                "valid_transitions": {
                    "queued": ["processing"],
                    "processing": ["completed", "partial", "failed"],
                    "completed": [],
                    "partial": [],
                    "failed": []
                }
            }
        )


# ============================================================================
# Storage Exceptions
# ============================================================================


class StorageError(StreamerStudioError):
    """
    Base class for storage errors.
    
    All storage-specific exceptions inherit from this class.
    Used for errors during file storage operations in Supabase Storage.
    """
    
    def __init__(
        self,
        message: str,
        code: str = "STORAGE_ERROR",
        status_code: int = 500,
        details: Optional[dict] = None
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=status_code,
            details=details
        )


class StorageUploadError(StorageError):
    """
    Raised when a file upload to storage fails.
    
    This can occur due to:
    - Network issues
    - Invalid file data
    - Storage quota exceeded
    - Permission issues
    """
    
    def __init__(self, reason: str = "Upload failed", path: Optional[str] = None):
        super().__init__(
            message=f"Failed to upload file: {reason}",
            code="STORAGE_UPLOAD_ERROR",
            status_code=500,
            details={"reason": reason, "path": path} if path else {"reason": reason}
        )
        self.reason = reason
        self.path = path


class StorageDeleteError(StorageError):
    """
    Raised when a file deletion from storage fails.
    
    This can occur due to:
    - File not found
    - Permission issues
    - Network issues
    """
    
    def __init__(self, reason: str = "Delete failed", path: Optional[str] = None):
        super().__init__(
            message=f"Failed to delete file: {reason}",
            code="STORAGE_DELETE_ERROR",
            status_code=500,
            details={"reason": reason, "path": path} if path else {"reason": reason}
        )
        self.reason = reason
        self.path = path


class AssetNotFoundError(StorageError):
    """
    Raised when an asset doesn't exist in storage.
    
    Used when attempting to access, download, or modify an asset
    that doesn't exist at the specified path.
    """
    
    def __init__(self, path: str):
        super().__init__(
            message=f"Asset not found at path: {path}",
            code="ASSET_NOT_FOUND",
            status_code=404,
            details={"path": path}
        )
        self.path = path


# Export all exceptions for easy importing
__all__ = [
    "StreamerStudioError",
    "TokenExpiredError",
    "TokenInvalidError",
    "TokenRevokedError",
    "InvalidCredentialsError",
    "EmailExistsError",
    "UserNotFoundError",
    "NotFoundError",
    "WeakPasswordError",
    "ValidationError",
    "RateLimitExceededError",
    "AuthorizationError",
    # Brand Kit Exceptions
    "BrandKitError",
    "BrandKitNotFoundError",
    "BrandKitLimitExceededError",
    "HexColorValidationError",
    "UnsupportedFontError",
    # Prompt Engine Exceptions
    "PromptEngineError",
    "TemplateNotFoundError",
    # Asset Generation Exceptions
    "GenerationError",
    "RateLimitError",
    "ContentPolicyError",
    "GenerationTimeoutError",
    # Generation Job Exceptions
    "JobNotFoundError",
    "InvalidStateTransitionError",
    # Storage Exceptions
    "StorageError",
    "StorageUploadError",
    "StorageDeleteError",
    "AssetNotFoundError",
]
