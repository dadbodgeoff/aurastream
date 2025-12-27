"""
Audit Service for Aurastream.

This module provides audit logging functionality for security-sensitive events:
- User signup
- Login (success and failure)
- Logout
- Token refresh
- Password changes
- Account modifications

Security Notes:
- NEVER log passwords, tokens, or full emails
- Emails are masked as u***@domain.com
- All events are JSON-serializable for structured logging
- Events are stored in memory (can be extended to database/external service)
"""

import os
import re
import json
import threading
from collections import deque
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Deque, Dict, List, Optional
from uuid import uuid4


# =============================================================================
# Configuration
# =============================================================================

# Maximum number of audit events to keep in memory
MAX_AUDIT_EVENTS = int(os.getenv("AUDIT_MAX_EVENTS", "10000"))

# Enable/disable audit logging
AUDIT_LOGGING_ENABLED = os.getenv("AUDIT_LOGGING_ENABLED", "true").lower() == "true"


# =============================================================================
# Audit Event Types
# =============================================================================

class AuditEventType(str, Enum):
    """Types of audit events that can be logged."""
    
    # Authentication events
    SIGNUP_SUCCESS = "signup_success"
    SIGNUP_FAILED = "signup_failed"
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    TOKEN_REFRESH = "token_refresh"
    TOKEN_REFRESH_FAILED = "token_refresh_failed"
    
    # Password events
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET_REQUEST = "password_reset_request"
    PASSWORD_RESET_COMPLETE = "password_reset_complete"
    
    # Account events
    EMAIL_VERIFICATION = "email_verification"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    ACCOUNT_DELETED = "account_deleted"
    
    # Security events
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    CSRF_VALIDATION_FAILED = "csrf_validation_failed"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"


# =============================================================================
# Audit Event Model
# =============================================================================

@dataclass
class AuditEvent:
    """
    Represents a single audit event.
    
    All sensitive data is masked before storage:
    - Emails: u***@domain.com
    - Passwords: Never stored
    - Tokens: Never stored
    
    Attributes:
        id: Unique event identifier
        timestamp: ISO 8601 timestamp in UTC
        event_type: Type of event (from AuditEventType)
        user_id: User ID if known (None for failed logins with unknown email)
        ip_address: Client IP address
        user_agent: Client user agent string
        email_masked: Masked email address (u***@domain.com)
        success: Whether the operation succeeded
        failure_reason: Reason for failure (if applicable)
        metadata: Additional event-specific data (never contains sensitive info)
    """
    
    event_type: AuditEventType
    ip_address: str
    user_agent: str
    id: str = field(default_factory=lambda: str(uuid4()))
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    user_id: Optional[str] = None
    email_masked: Optional[str] = None
    success: bool = True
    failure_reason: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for JSON serialization."""
        result = asdict(self)
        result["event_type"] = self.event_type.value
        return result
    
    def to_json(self) -> str:
        """Convert event to JSON string."""
        return json.dumps(self.to_dict(), default=str)


# =============================================================================
# Email Masking Utility
# =============================================================================

def mask_email(email: Optional[str]) -> Optional[str]:
    """
    Mask an email address for audit logging.
    
    Transforms email to format: u***@domain.com
    - Shows first character of local part
    - Hides rest of local part with ***
    - Shows full domain
    
    Args:
        email: Email address to mask
        
    Returns:
        Masked email or None if input is None
        
    Examples:
        >>> mask_email("user@example.com")
        'u***@example.com'
        >>> mask_email("a@test.org")
        'a***@test.org'
        >>> mask_email(None)
        None
    """
    if email is None:
        return None
    
    email = email.strip().lower()
    
    # Validate email format
    if "@" not in email:
        return "***@invalid"
    
    local_part, domain = email.rsplit("@", 1)
    
    if not local_part:
        return f"***@{domain}"
    
    # Show first character, mask the rest
    masked_local = local_part[0] + "***"
    return f"{masked_local}@{domain}"


# =============================================================================
# Audit Service
# =============================================================================

class AuditService:
    """
    Service for logging and querying audit events.
    
    Thread-safe implementation using a deque with maximum size.
    Events are stored in memory and can be queried by various criteria.
    
    In production, this can be extended to:
    - Write to database
    - Send to external logging service (e.g., Splunk, ELK)
    - Stream to message queue for async processing
    """
    
    def __init__(self, max_events: int = MAX_AUDIT_EVENTS):
        """
        Initialize the audit service.
        
        Args:
            max_events: Maximum number of events to keep in memory
        """
        self._events: Deque[AuditEvent] = deque(maxlen=max_events)
        self._lock = threading.Lock()
        self._max_events = max_events
    
    def log_event(
        self,
        event_type: AuditEventType,
        ip_address: str,
        user_agent: str,
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        success: bool = True,
        failure_reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditEvent:
        """
        Log an audit event.
        
        Args:
            event_type: Type of event
            ip_address: Client IP address
            user_agent: Client user agent
            user_id: User ID if known
            email: Email address (will be masked)
            success: Whether operation succeeded
            failure_reason: Reason for failure
            metadata: Additional event data (must not contain sensitive info)
            
        Returns:
            The created AuditEvent
        """
        if not AUDIT_LOGGING_ENABLED:
            # Return a dummy event when logging is disabled
            return AuditEvent(
                event_type=event_type,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        
        # Sanitize metadata to ensure no sensitive data
        safe_metadata = self._sanitize_metadata(metadata or {})
        
        event = AuditEvent(
            event_type=event_type,
            ip_address=ip_address,
            user_agent=user_agent,
            user_id=user_id,
            email_masked=mask_email(email),
            success=success,
            failure_reason=failure_reason,
            metadata=safe_metadata,
        )
        
        with self._lock:
            self._events.append(event)
        
        return event
    
    def _sanitize_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize metadata to remove any potentially sensitive data.
        
        Removes or masks fields that might contain sensitive information.
        
        Args:
            metadata: Raw metadata dictionary
            
        Returns:
            Sanitized metadata dictionary
        """
        # Fields that should never be in metadata
        sensitive_fields = {
            "password", "password_hash", "token", "access_token",
            "refresh_token", "secret", "api_key", "authorization",
            "cookie", "session", "csrf_token"
        }
        
        sanitized = {}
        for key, value in metadata.items():
            key_lower = key.lower()
            
            # Skip sensitive fields
            if any(sensitive in key_lower for sensitive in sensitive_fields):
                continue
            
            # Mask email fields
            if "email" in key_lower and isinstance(value, str):
                sanitized[key] = mask_email(value)
            else:
                sanitized[key] = value
        
        return sanitized
    
    # =========================================================================
    # Convenience Methods for Common Events
    # =========================================================================
    
    def log_signup_success(
        self,
        user_id: str,
        email: str,
        ip_address: str,
        user_agent: str
    ) -> AuditEvent:
        """Log successful user signup."""
        return self.log_event(
            event_type=AuditEventType.SIGNUP_SUCCESS,
            ip_address=ip_address,
            user_agent=user_agent,
            user_id=user_id,
            email=email,
            success=True,
        )
    
    def log_signup_failed(
        self,
        email: str,
        ip_address: str,
        user_agent: str,
        reason: str
    ) -> AuditEvent:
        """Log failed signup attempt."""
        return self.log_event(
            event_type=AuditEventType.SIGNUP_FAILED,
            ip_address=ip_address,
            user_agent=user_agent,
            email=email,
            success=False,
            failure_reason=reason,
        )
    
    def log_login_success(
        self,
        user_id: str,
        email: str,
        ip_address: str,
        user_agent: str,
        remember_me: bool = False
    ) -> AuditEvent:
        """Log successful login."""
        return self.log_event(
            event_type=AuditEventType.LOGIN_SUCCESS,
            ip_address=ip_address,
            user_agent=user_agent,
            user_id=user_id,
            email=email,
            success=True,
            metadata={"remember_me": remember_me},
        )
    
    def log_login_failed(
        self,
        email: str,
        ip_address: str,
        user_agent: str,
        reason: str = "Invalid credentials"
    ) -> AuditEvent:
        """Log failed login attempt."""
        return self.log_event(
            event_type=AuditEventType.LOGIN_FAILED,
            ip_address=ip_address,
            user_agent=user_agent,
            email=email,
            success=False,
            failure_reason=reason,
        )
    
    def log_logout(
        self,
        user_id: str,
        ip_address: str,
        user_agent: str
    ) -> AuditEvent:
        """Log user logout."""
        return self.log_event(
            event_type=AuditEventType.LOGOUT,
            ip_address=ip_address,
            user_agent=user_agent,
            user_id=user_id,
            success=True,
        )
    
    def log_token_refresh(
        self,
        user_id: str,
        ip_address: str,
        user_agent: str
    ) -> AuditEvent:
        """Log successful token refresh."""
        return self.log_event(
            event_type=AuditEventType.TOKEN_REFRESH,
            ip_address=ip_address,
            user_agent=user_agent,
            user_id=user_id,
            success=True,
        )
    
    def log_token_refresh_failed(
        self,
        ip_address: str,
        user_agent: str,
        reason: str
    ) -> AuditEvent:
        """Log failed token refresh."""
        return self.log_event(
            event_type=AuditEventType.TOKEN_REFRESH_FAILED,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            failure_reason=reason,
        )
    
    async def log(
        self,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ) -> AuditEvent:
        """
        Log a generic audit event for resource operations.
        
        This is a simplified interface for logging CRUD operations on resources
        like brand kits, assets, etc.
        
        Args:
            user_id: ID of the user performing the action
            action: Action being performed (e.g., "brand_kit.create")
            resource_type: Type of resource (e.g., "brand_kit")
            resource_id: ID of the resource being acted upon
            details: Additional details about the operation
            ip_address: Client IP address (optional)
            
        Returns:
            The created AuditEvent
        """
        if not AUDIT_LOGGING_ENABLED:
            # Return a dummy event when logging is disabled
            return AuditEvent(
                event_type=AuditEventType.SIGNUP_SUCCESS,  # Placeholder
                ip_address=ip_address or "unknown",
                user_agent="",
            )
        
        # Sanitize details
        safe_details = self._sanitize_metadata(details or {})
        safe_details["action"] = action
        safe_details["resource_type"] = resource_type
        safe_details["resource_id"] = resource_id
        
        event = AuditEvent(
            event_type=AuditEventType.SIGNUP_SUCCESS,  # Using as placeholder for custom events
            ip_address=ip_address or "unknown",
            user_agent="",
            user_id=user_id,
            success=True,
            metadata=safe_details,
        )
        
        with self._lock:
            self._events.append(event)
        
        return event
    
    def log_rate_limit_exceeded(
        self,
        ip_address: str,
        user_agent: str,
        endpoint: str,
        email: Optional[str] = None
    ) -> AuditEvent:
        """Log rate limit exceeded event."""
        return self.log_event(
            event_type=AuditEventType.RATE_LIMIT_EXCEEDED,
            ip_address=ip_address,
            user_agent=user_agent,
            email=email,
            success=False,
            failure_reason="Rate limit exceeded",
            metadata={"endpoint": endpoint},
        )
    
    def log_csrf_validation_failed(
        self,
        ip_address: str,
        user_agent: str,
        user_id: Optional[str] = None
    ) -> AuditEvent:
        """Log CSRF validation failure."""
        return self.log_event(
            event_type=AuditEventType.CSRF_VALIDATION_FAILED,
            ip_address=ip_address,
            user_agent=user_agent,
            user_id=user_id,
            success=False,
            failure_reason="CSRF token validation failed",
        )
    
    # =========================================================================
    # Query Methods
    # =========================================================================
    
    def get_events(
        self,
        limit: int = 100,
        event_type: Optional[AuditEventType] = None,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        success: Optional[bool] = None
    ) -> List[AuditEvent]:
        """
        Query audit events with optional filters.
        
        Args:
            limit: Maximum number of events to return
            event_type: Filter by event type
            user_id: Filter by user ID
            ip_address: Filter by IP address
            success: Filter by success status
            
        Returns:
            List of matching events (most recent first)
        """
        with self._lock:
            events = list(self._events)
        
        # Apply filters
        if event_type is not None:
            events = [e for e in events if e.event_type == event_type]
        
        if user_id is not None:
            events = [e for e in events if e.user_id == user_id]
        
        if ip_address is not None:
            events = [e for e in events if e.ip_address == ip_address]
        
        if success is not None:
            events = [e for e in events if e.success == success]
        
        # Return most recent first, limited
        return list(reversed(events))[:limit]
    
    def get_failed_login_attempts(
        self,
        email: Optional[str] = None,
        ip_address: Optional[str] = None,
        limit: int = 100
    ) -> List[AuditEvent]:
        """
        Get failed login attempts, optionally filtered.
        
        Args:
            email: Filter by email (will be masked for comparison)
            ip_address: Filter by IP address
            limit: Maximum number of events to return
            
        Returns:
            List of failed login events
        """
        events = self.get_events(
            limit=limit * 2,  # Get more to account for filtering
            event_type=AuditEventType.LOGIN_FAILED,
            ip_address=ip_address,
            success=False,
        )
        
        if email is not None:
            masked = mask_email(email)
            events = [e for e in events if e.email_masked == masked]
        
        return events[:limit]
    
    def get_user_activity(self, user_id: str, limit: int = 100) -> List[AuditEvent]:
        """
        Get all activity for a specific user.
        
        Args:
            user_id: User ID to query
            limit: Maximum number of events to return
            
        Returns:
            List of events for the user
        """
        return self.get_events(limit=limit, user_id=user_id)
    
    def count_events(
        self,
        event_type: Optional[AuditEventType] = None,
        success: Optional[bool] = None
    ) -> int:
        """
        Count events matching criteria.
        
        Args:
            event_type: Filter by event type
            success: Filter by success status
            
        Returns:
            Number of matching events
        """
        with self._lock:
            events = list(self._events)
        
        if event_type is not None:
            events = [e for e in events if e.event_type == event_type]
        
        if success is not None:
            events = [e for e in events if e.success == success]
        
        return len(events)
    
    def clear_events(self) -> None:
        """Clear all audit events. Useful for testing."""
        with self._lock:
            self._events.clear()


# =============================================================================
# Singleton Instance
# =============================================================================

_audit_service: Optional[AuditService] = None


def get_audit_service() -> AuditService:
    """Get or create the audit service singleton."""
    global _audit_service
    if _audit_service is None:
        _audit_service = AuditService()
    return _audit_service


__all__ = [
    # Configuration
    "MAX_AUDIT_EVENTS",
    "AUDIT_LOGGING_ENABLED",
    # Types
    "AuditEventType",
    "AuditEvent",
    # Utilities
    "mask_email",
    # Service
    "AuditService",
    "get_audit_service",
]
