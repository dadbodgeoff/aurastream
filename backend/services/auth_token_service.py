"""
Auth Token Service for Aurastream.

This service handles token-based operations for:
- Password reset tokens
- Email verification tokens

Security Notes:
- Tokens are generated using secrets.token_urlsafe(32)
- Tokens are hashed with SHA-256 before storage
- Password reset tokens expire in 1 hour
- Email verification tokens expire in 24 hours
- Tokens can only be used once
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from dataclasses import dataclass

from backend.database.supabase_client import get_supabase_client


@dataclass
class AuthToken:
    """Auth token data model."""
    id: str
    user_id: str
    token_type: str
    expires_at: datetime
    used_at: Optional[datetime]
    created_at: datetime


# Token expiration times
PASSWORD_RESET_EXPIRY_HOURS = 1
EMAIL_VERIFICATION_EXPIRY_HOURS = 24


class AuthTokenService:
    """
    Service for managing authentication tokens.
    
    Handles creation, validation, and usage of tokens for
    password reset and email verification flows.
    """
    
    def __init__(self):
        """Initialize the auth token service."""
        self._supabase = None
    
    @property
    def supabase(self):
        """Lazy-load Supabase client."""
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
    def _generate_token(self) -> Tuple[str, str]:
        """
        Generate a secure token and its hash.
        
        Returns:
            Tuple of (plain_token, token_hash)
        """
        token = secrets.token_urlsafe(32)
        token_hash = self._hash_token(token)
        return token, token_hash
    
    def _hash_token(self, token: str) -> str:
        """
        Hash a token for secure storage and comparison.
        
        Args:
            token: Plain text token
            
        Returns:
            SHA-256 hash of the token
        """
        return hashlib.sha256(token.encode()).hexdigest()
    
    async def create_password_reset_token(self, user_id: str) -> str:
        """
        Create a password reset token for a user.
        
        Invalidates any existing password reset tokens for the user
        before creating a new one.
        
        Args:
            user_id: User's UUID
            
        Returns:
            Plain text token to send to user
        """
        # Invalidate existing password reset tokens for this user
        await self._invalidate_existing_tokens(user_id, "password_reset")
        
        # Generate new token
        token, token_hash = self._generate_token()
        
        # Calculate expiration
        expires_at = datetime.now(timezone.utc) + timedelta(hours=PASSWORD_RESET_EXPIRY_HOURS)
        
        # Store token in database
        self.supabase.table("auth_tokens").insert({
            "user_id": user_id,
            "token_type": "password_reset",
            "token_hash": token_hash,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
        
        return token
    
    async def validate_password_reset_token(self, token: str) -> Optional[str]:
        """
        Validate a password reset token and return the user ID.
        
        Args:
            token: Plain text token from user
            
        Returns:
            User ID if token is valid, None otherwise
        """
        return await self._validate_token(token, "password_reset")
    
    async def create_email_verification_token(self, user_id: str) -> str:
        """
        Create an email verification token for a user.
        
        Invalidates any existing email verification tokens for the user
        before creating a new one.
        
        Args:
            user_id: User's UUID
            
        Returns:
            Plain text token to send to user
        """
        # Invalidate existing email verification tokens for this user
        await self._invalidate_existing_tokens(user_id, "email_verification")
        
        # Generate new token
        token, token_hash = self._generate_token()
        
        # Calculate expiration
        expires_at = datetime.now(timezone.utc) + timedelta(hours=EMAIL_VERIFICATION_EXPIRY_HOURS)
        
        # Store token in database
        self.supabase.table("auth_tokens").insert({
            "user_id": user_id,
            "token_type": "email_verification",
            "token_hash": token_hash,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
        
        return token
    
    async def validate_email_verification_token(self, token: str) -> Optional[str]:
        """
        Validate an email verification token and return the user ID.
        
        Args:
            token: Plain text token from user
            
        Returns:
            User ID if token is valid, None otherwise
        """
        return await self._validate_token(token, "email_verification")
    
    async def mark_token_used(self, token: str) -> bool:
        """
        Mark a token as used.
        
        Args:
            token: Plain text token
            
        Returns:
            True if token was marked as used, False if not found
        """
        token_hash = self._hash_token(token)
        
        result = self.supabase.table("auth_tokens").update({
            "used_at": datetime.now(timezone.utc).isoformat()
        }).eq("token_hash", token_hash).is_("used_at", "null").execute()
        
        return len(result.data) > 0 if result.data else False
    
    async def _validate_token(self, token: str, token_type: str) -> Optional[str]:
        """
        Validate a token and return the user ID.
        
        Args:
            token: Plain text token
            token_type: Type of token ('password_reset' or 'email_verification')
            
        Returns:
            User ID if token is valid, None otherwise
        """
        token_hash = self._hash_token(token)
        now = datetime.now(timezone.utc).isoformat()
        
        # Find token that matches hash, type, not expired, and not used
        result = self.supabase.table("auth_tokens").select("*").eq(
            "token_hash", token_hash
        ).eq(
            "token_type", token_type
        ).gt(
            "expires_at", now
        ).is_(
            "used_at", "null"
        ).execute()
        
        if not result.data:
            return None
        
        return result.data[0]["user_id"]
    
    async def _invalidate_existing_tokens(self, user_id: str, token_type: str) -> None:
        """
        Invalidate all existing tokens of a type for a user.
        
        Args:
            user_id: User's UUID
            token_type: Type of token to invalidate
        """
        now = datetime.now(timezone.utc).isoformat()
        
        # Mark all unused tokens as used
        self.supabase.table("auth_tokens").update({
            "used_at": now
        }).eq(
            "user_id", user_id
        ).eq(
            "token_type", token_type
        ).is_(
            "used_at", "null"
        ).execute()
    
    async def cleanup_expired_tokens(self) -> int:
        """
        Remove expired tokens from the database.
        
        This should be called periodically (e.g., via cron job) to
        clean up old tokens.
        
        Returns:
            Number of tokens deleted
        """
        now = datetime.now(timezone.utc).isoformat()
        
        result = self.supabase.table("auth_tokens").delete().lt(
            "expires_at", now
        ).execute()
        
        return len(result.data) if result.data else 0


# Singleton instance for convenience
_auth_token_service: Optional[AuthTokenService] = None


def get_auth_token_service() -> AuthTokenService:
    """Get or create the auth token service singleton."""
    global _auth_token_service
    if _auth_token_service is None:
        _auth_token_service = AuthTokenService()
    return _auth_token_service
