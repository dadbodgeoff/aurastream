"""
Token Store Service for refresh token tracking and reuse detection.

This service provides Redis-backed tracking of refresh tokens to detect
token theft through reuse detection. When a rotated token is reused,
it indicates the token was stolen and all user sessions are invalidated.

Security Pattern:
1. On token creation: Register token with user_id
2. On token use: Check if already used
3. If reused: Invalidate ALL user tokens (security breach)
4. If valid: Mark as used, allow new token issuance
"""

import logging
from datetime import datetime, timezone
from typing import Optional, Tuple

import redis

logger = logging.getLogger(__name__)


class TokenReuseDetectedError(Exception):
    """Raised when a refresh token reuse is detected (potential theft)."""
    def __init__(self, user_id: str, jti: str):
        self.user_id = user_id
        self.jti = jti
        super().__init__(f"Token reuse detected for user {user_id}")


class TokenStore:
    """
    Redis-backed token tracking for refresh token reuse detection.
    
    Keys:
    - refresh_token:{jti} -> Hash with user_id, created_at, used, used_at
    - user_tokens:{user_id} -> Set of active token JTIs
    
    TTL: Tokens expire after 30 days (matching refresh token lifetime)
    """
    
    TOKEN_PREFIX = "refresh_token:"
    USER_TOKENS_PREFIX = "user_tokens:"
    TOKEN_TTL_DAYS = 30
    
    def __init__(self, redis_client: redis.Redis):
        """
        Initialize token store with Redis client.
        
        Args:
            redis_client: Redis client instance
        """
        self.redis = redis_client
        logger.info("TokenStore initialized")
    
    async def register_token(
        self,
        jti: str,
        user_id: str,
        expires_at: datetime,
    ) -> None:
        """
        Register a new refresh token for tracking.
        
        Args:
            jti: JWT ID (unique token identifier)
            user_id: User who owns this token
            expires_at: When the token expires
        """
        key = f"{self.TOKEN_PREFIX}{jti}"
        ttl = int((expires_at - datetime.now(timezone.utc)).total_seconds())
        
        # Ensure positive TTL
        if ttl <= 0:
            ttl = self.TOKEN_TTL_DAYS * 86400
        
        # Store token data
        self.redis.hset(key, mapping={
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "used": "false",
            "used_at": "",
            "replaced_by": "",
        })
        self.redis.expire(key, ttl)
        
        # Add to user's token set
        user_key = f"{self.USER_TOKENS_PREFIX}{user_id}"
        self.redis.sadd(user_key, jti)
        self.redis.expire(user_key, self.TOKEN_TTL_DAYS * 86400)
        
        logger.debug(
            "Registered refresh token",
            extra={"jti": jti, "user_id": user_id, "ttl": ttl}
        )
    
    async def use_token(
        self,
        jti: str,
        user_id: str,
        new_jti: Optional[str] = None,
    ) -> Tuple[bool, Optional[str]]:
        """
        Attempt to use a refresh token.
        
        This is the core reuse detection logic:
        - If token doesn't exist: Invalid token
        - If token was already used: SECURITY ALERT - token theft detected
        - If token is valid: Mark as used and allow
        
        Args:
            jti: JWT ID of the token being used
            user_id: User attempting to use the token
            new_jti: JTI of the new token being issued (for tracking)
            
        Returns:
            Tuple of (success, error_reason)
            - (True, None): Token is valid and can be used
            - (False, "invalid"): Token doesn't exist
            - (False, "reused"): Token was already used (SECURITY ALERT)
            - (False, "wrong_user"): Token belongs to different user
            
        Raises:
            TokenReuseDetectedError: When reuse is detected (after invalidating all tokens)
        """
        key = f"{self.TOKEN_PREFIX}{jti}"
        token_data = self.redis.hgetall(key)
        
        # Token doesn't exist
        if not token_data:
            logger.warning(
                "Token not found in store",
                extra={"jti": jti, "user_id": user_id}
            )
            return (False, "invalid")
        
        # Decode bytes to strings
        token_data = {k.decode() if isinstance(k, bytes) else k: 
                      v.decode() if isinstance(v, bytes) else v 
                      for k, v in token_data.items()}
        
        # Verify user ownership
        if token_data.get("user_id") != user_id:
            logger.warning(
                "Token user mismatch",
                extra={
                    "jti": jti,
                    "expected_user": token_data.get("user_id"),
                    "actual_user": user_id,
                }
            )
            return (False, "wrong_user")
        
        # Check if already used - SECURITY ALERT
        if token_data.get("used") == "true":
            logger.critical(
                "SECURITY ALERT: Refresh token reuse detected!",
                extra={
                    "jti": jti,
                    "user_id": user_id,
                    "original_used_at": token_data.get("used_at"),
                    "replaced_by": token_data.get("replaced_by"),
                }
            )
            
            # Invalidate ALL user tokens
            invalidated_count = await self.invalidate_all_user_tokens(user_id)
            
            logger.critical(
                "Invalidated all user tokens due to reuse detection",
                extra={"user_id": user_id, "invalidated_count": invalidated_count}
            )
            
            raise TokenReuseDetectedError(user_id, jti)
        
        # Mark token as used
        self.redis.hset(key, mapping={
            "used": "true",
            "used_at": datetime.now(timezone.utc).isoformat(),
            "replaced_by": new_jti or "",
        })
        
        logger.debug(
            "Token marked as used",
            extra={"jti": jti, "user_id": user_id, "replaced_by": new_jti}
        )
        
        return (True, None)
    
    async def invalidate_token(self, jti: str) -> bool:
        """
        Invalidate a specific token (e.g., on logout).
        
        Args:
            jti: JWT ID to invalidate
            
        Returns:
            True if token was found and invalidated
        """
        key = f"{self.TOKEN_PREFIX}{jti}"
        
        # Get user_id before deleting
        user_id = self.redis.hget(key, "user_id")
        if user_id:
            user_id = user_id.decode() if isinstance(user_id, bytes) else user_id
            user_key = f"{self.USER_TOKENS_PREFIX}{user_id}"
            self.redis.srem(user_key, jti)
        
        deleted = self.redis.delete(key)
        
        logger.debug(
            "Token invalidated",
            extra={"jti": jti, "deleted": bool(deleted)}
        )
        
        return bool(deleted)
    
    async def invalidate_all_user_tokens(self, user_id: str) -> int:
        """
        Invalidate ALL refresh tokens for a user.
        
        Called when:
        - Token reuse is detected (security breach)
        - User requests logout from all devices
        - User changes password
        - Account is compromised
        
        Args:
            user_id: User whose tokens should be invalidated
            
        Returns:
            Number of tokens invalidated
        """
        user_key = f"{self.USER_TOKENS_PREFIX}{user_id}"
        token_jtis = self.redis.smembers(user_key)
        
        count = 0
        for jti in token_jtis:
            jti_str = jti.decode() if isinstance(jti, bytes) else jti
            key = f"{self.TOKEN_PREFIX}{jti_str}"
            if self.redis.delete(key):
                count += 1
        
        # Clear the user's token set
        self.redis.delete(user_key)
        
        logger.info(
            "Invalidated all user tokens",
            extra={"user_id": user_id, "count": count}
        )
        
        return count
    
    async def get_user_token_count(self, user_id: str) -> int:
        """
        Get the number of active tokens for a user.
        
        Args:
            user_id: User to check
            
        Returns:
            Number of active refresh tokens
        """
        user_key = f"{self.USER_TOKENS_PREFIX}{user_id}"
        return self.redis.scard(user_key)
    
    async def is_token_valid(self, jti: str) -> bool:
        """
        Check if a token exists and hasn't been used.
        
        Args:
            jti: JWT ID to check
            
        Returns:
            True if token exists and hasn't been used
        """
        key = f"{self.TOKEN_PREFIX}{jti}"
        token_data = self.redis.hgetall(key)
        
        if not token_data:
            return False
        
        # Decode bytes to strings
        used = token_data.get(b"used") or token_data.get("used")
        if isinstance(used, bytes):
            used = used.decode()
        
        return used != "true"


# Singleton instance
_token_store: Optional[TokenStore] = None


def get_token_store() -> TokenStore:
    """
    Get or create the token store singleton.
    
    Returns:
        TokenStore instance
        
    Raises:
        RuntimeError: If Redis is not configured
    """
    global _token_store
    
    if _token_store is None:
        from backend.api.config import get_settings
        settings = get_settings()
        
        redis_client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=False,  # We handle decoding manually
        )
        
        _token_store = TokenStore(redis_client)
    
    return _token_store


def reset_token_store() -> None:
    """
    Reset the token store singleton (for testing).
    """
    global _token_store
    _token_store = None


__all__ = [
    "TokenStore",
    "TokenReuseDetectedError",
    "get_token_store",
    "reset_token_store",
]
