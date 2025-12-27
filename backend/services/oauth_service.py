"""
OAuth Service for Aurastream.

This module provides OAuth authentication support for multiple providers:
- Google
- Twitch
- Discord

Security Notes:
- Never log tokens or secrets
- Use secure state tokens for CSRF protection
- Validate all OAuth responses before processing
"""

import secrets
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, Dict
from urllib.parse import urlencode

import httpx

from backend.api.config import get_settings
from backend.services.exceptions import StreamerStudioError


# =============================================================================
# OAuth Exceptions
# =============================================================================

class OAuthError(StreamerStudioError):
    """Base exception for OAuth-related errors."""
    
    def __init__(self, message: str, provider: str, details: Optional[dict] = None):
        super().__init__(
            message=message,
            code="OAUTH_ERROR",
            status_code=400,
            details={"provider": provider, **(details or {})}
        )


class OAuthProviderError(OAuthError):
    """Raised when OAuth provider returns an error."""
    
    def __init__(self, provider: str, error: str, error_description: Optional[str] = None):
        super().__init__(
            message=error_description or f"OAuth provider error: {error}",
            provider=provider,
            details={"error": error, "error_description": error_description}
        )
        self.code = "OAUTH_PROVIDER_ERROR"


class OAuthStateError(OAuthError):
    """Raised when OAuth state validation fails."""
    
    def __init__(self, provider: str):
        super().__init__(
            message="Invalid or expired OAuth state token",
            provider=provider,
        )
        self.code = "OAUTH_STATE_INVALID"
        self.status_code = 400


class OAuthTokenExchangeError(OAuthError):
    """Raised when token exchange fails."""
    
    def __init__(self, provider: str, reason: str):
        super().__init__(
            message=f"Failed to exchange authorization code: {reason}",
            provider=provider,
        )
        self.code = "OAUTH_TOKEN_EXCHANGE_FAILED"


class OAuthUserInfoError(OAuthError):
    """Raised when fetching user info fails."""
    
    def __init__(self, provider: str, reason: str):
        super().__init__(
            message=f"Failed to fetch user info: {reason}",
            provider=provider,
        )
        self.code = "OAUTH_USER_INFO_FAILED"


class OAuthProviderNotFoundError(OAuthError):
    """Raised when an unknown OAuth provider is requested."""
    
    def __init__(self, provider: str):
        super().__init__(
            message=f"Unknown OAuth provider: {provider}",
            provider=provider,
        )
        self.code = "OAUTH_PROVIDER_NOT_FOUND"
        self.status_code = 404


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class OAuthTokens:
    """OAuth tokens returned from provider."""
    access_token: str
    refresh_token: Optional[str]
    expires_in: int
    token_type: str


@dataclass
class OAuthUserInfo:
    """User information from OAuth provider."""
    provider: str
    provider_user_id: str
    email: str
    display_name: str
    avatar_url: Optional[str]


# =============================================================================
# Abstract Base Class
# =============================================================================

class OAuthProvider(ABC):
    """Abstract base class for OAuth providers."""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name identifier."""
        pass
    
    @abstractmethod
    def get_authorization_url(self, state: str, redirect_uri: str) -> str:
        """
        Generate OAuth authorization URL.
        
        Args:
            state: CSRF protection state token
            redirect_uri: Callback URL after authorization
            
        Returns:
            Full authorization URL to redirect user to
        """
        pass
    
    @abstractmethod
    async def exchange_code(self, code: str, redirect_uri: str) -> OAuthTokens:
        """
        Exchange authorization code for tokens.
        
        Args:
            code: Authorization code from OAuth callback
            redirect_uri: Same redirect URI used in authorization
            
        Returns:
            OAuthTokens with access token and optional refresh token
            
        Raises:
            OAuthTokenExchangeError: If token exchange fails
        """
        pass
    
    @abstractmethod
    async def get_user_info(self, access_token: str) -> OAuthUserInfo:
        """
        Get user info from provider.
        
        Args:
            access_token: Valid access token from provider
            
        Returns:
            OAuthUserInfo with user details
            
        Raises:
            OAuthUserInfoError: If fetching user info fails
        """
        pass


# =============================================================================
# Google OAuth Provider
# =============================================================================

class GoogleOAuthProvider(OAuthProvider):
    """Google OAuth 2.0 provider implementation."""
    
    AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USER_INFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    SCOPES = "openid email profile"
    
    @property
    def name(self) -> str:
        return "google"
    
    def __init__(self):
        settings = get_settings()
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
    
    def get_authorization_url(self, state: str, redirect_uri: str) -> str:
        """Generate Google OAuth authorization URL."""
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": self.SCOPES,
            "state": state,
            "access_type": "offline",
            "prompt": "consent",
        }
        return f"{self.AUTHORIZATION_URL}?{urlencode(params)}"
    
    async def exchange_code(self, code: str, redirect_uri: str) -> OAuthTokens:
        """Exchange authorization code for Google tokens."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.TOKEN_URL,
                    data={
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri,
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                
                if response.status_code != 200:
                    error_data = response.json() if response.content else {}
                    raise OAuthTokenExchangeError(
                        provider=self.name,
                        reason=error_data.get("error_description", "Token exchange failed")
                    )
                
                data = response.json()
                return OAuthTokens(
                    access_token=data["access_token"],
                    refresh_token=data.get("refresh_token"),
                    expires_in=data.get("expires_in", 3600),
                    token_type=data.get("token_type", "Bearer"),
                )
                
            except httpx.RequestError as e:
                raise OAuthTokenExchangeError(
                    provider=self.name,
                    reason=f"Network error: {str(e)}"
                )
    
    async def get_user_info(self, access_token: str) -> OAuthUserInfo:
        """Get user info from Google."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.USER_INFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                
                if response.status_code != 200:
                    raise OAuthUserInfoError(
                        provider=self.name,
                        reason="Failed to fetch user info from Google"
                    )
                
                data = response.json()
                return OAuthUserInfo(
                    provider=self.name,
                    provider_user_id=data["id"],
                    email=data["email"],
                    display_name=data.get("name", data["email"].split("@")[0]),
                    avatar_url=data.get("picture"),
                )
                
            except httpx.RequestError as e:
                raise OAuthUserInfoError(
                    provider=self.name,
                    reason=f"Network error: {str(e)}"
                )


# =============================================================================
# Twitch OAuth Provider
# =============================================================================

class TwitchOAuthProvider(OAuthProvider):
    """Twitch OAuth 2.0 provider implementation."""
    
    AUTHORIZATION_URL = "https://id.twitch.tv/oauth2/authorize"
    TOKEN_URL = "https://id.twitch.tv/oauth2/token"
    USER_INFO_URL = "https://api.twitch.tv/helix/users"
    SCOPES = "user:read:email"
    
    @property
    def name(self) -> str:
        return "twitch"
    
    def __init__(self):
        settings = get_settings()
        self.client_id = settings.TWITCH_CLIENT_ID
        self.client_secret = settings.TWITCH_CLIENT_SECRET
    
    def get_authorization_url(self, state: str, redirect_uri: str) -> str:
        """Generate Twitch OAuth authorization URL."""
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": self.SCOPES,
            "state": state,
        }
        return f"{self.AUTHORIZATION_URL}?{urlencode(params)}"
    
    async def exchange_code(self, code: str, redirect_uri: str) -> OAuthTokens:
        """Exchange authorization code for Twitch tokens."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.TOKEN_URL,
                    data={
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri,
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                
                if response.status_code != 200:
                    error_data = response.json() if response.content else {}
                    raise OAuthTokenExchangeError(
                        provider=self.name,
                        reason=error_data.get("message", "Token exchange failed")
                    )
                
                data = response.json()
                return OAuthTokens(
                    access_token=data["access_token"],
                    refresh_token=data.get("refresh_token"),
                    expires_in=data.get("expires_in", 3600),
                    token_type=data.get("token_type", "Bearer"),
                )
                
            except httpx.RequestError as e:
                raise OAuthTokenExchangeError(
                    provider=self.name,
                    reason=f"Network error: {str(e)}"
                )
    
    async def get_user_info(self, access_token: str) -> OAuthUserInfo:
        """Get user info from Twitch."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.USER_INFO_URL,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Client-Id": self.client_id,
                    },
                )
                
                if response.status_code != 200:
                    raise OAuthUserInfoError(
                        provider=self.name,
                        reason="Failed to fetch user info from Twitch"
                    )
                
                data = response.json()
                if not data.get("data"):
                    raise OAuthUserInfoError(
                        provider=self.name,
                        reason="No user data returned from Twitch"
                    )
                
                user_data = data["data"][0]
                return OAuthUserInfo(
                    provider=self.name,
                    provider_user_id=user_data["id"],
                    email=user_data.get("email", ""),
                    display_name=user_data.get("display_name", user_data.get("login", "")),
                    avatar_url=user_data.get("profile_image_url"),
                )
                
            except httpx.RequestError as e:
                raise OAuthUserInfoError(
                    provider=self.name,
                    reason=f"Network error: {str(e)}"
                )


# =============================================================================
# Discord OAuth Provider
# =============================================================================

class DiscordOAuthProvider(OAuthProvider):
    """Discord OAuth 2.0 provider implementation."""
    
    AUTHORIZATION_URL = "https://discord.com/api/oauth2/authorize"
    TOKEN_URL = "https://discord.com/api/oauth2/token"
    USER_INFO_URL = "https://discord.com/api/users/@me"
    SCOPES = "identify email"
    
    @property
    def name(self) -> str:
        return "discord"
    
    def __init__(self):
        settings = get_settings()
        self.client_id = settings.DISCORD_CLIENT_ID
        self.client_secret = settings.DISCORD_CLIENT_SECRET
    
    def get_authorization_url(self, state: str, redirect_uri: str) -> str:
        """Generate Discord OAuth authorization URL."""
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": self.SCOPES,
            "state": state,
        }
        return f"{self.AUTHORIZATION_URL}?{urlencode(params)}"
    
    async def exchange_code(self, code: str, redirect_uri: str) -> OAuthTokens:
        """Exchange authorization code for Discord tokens."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.TOKEN_URL,
                    data={
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri,
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                
                if response.status_code != 200:
                    error_data = response.json() if response.content else {}
                    raise OAuthTokenExchangeError(
                        provider=self.name,
                        reason=error_data.get("error_description", "Token exchange failed")
                    )
                
                data = response.json()
                return OAuthTokens(
                    access_token=data["access_token"],
                    refresh_token=data.get("refresh_token"),
                    expires_in=data.get("expires_in", 604800),  # Discord default is 7 days
                    token_type=data.get("token_type", "Bearer"),
                )
                
            except httpx.RequestError as e:
                raise OAuthTokenExchangeError(
                    provider=self.name,
                    reason=f"Network error: {str(e)}"
                )
    
    async def get_user_info(self, access_token: str) -> OAuthUserInfo:
        """Get user info from Discord."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.USER_INFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                
                if response.status_code != 200:
                    raise OAuthUserInfoError(
                        provider=self.name,
                        reason="Failed to fetch user info from Discord"
                    )
                
                data = response.json()
                
                # Build avatar URL if avatar hash exists
                avatar_url = None
                if data.get("avatar"):
                    avatar_url = f"https://cdn.discordapp.com/avatars/{data['id']}/{data['avatar']}.png"
                
                # Discord may not return email if not verified or scope not granted
                email = data.get("email", "")
                
                return OAuthUserInfo(
                    provider=self.name,
                    provider_user_id=data["id"],
                    email=email,
                    display_name=data.get("global_name") or data.get("username", ""),
                    avatar_url=avatar_url,
                )
                
            except httpx.RequestError as e:
                raise OAuthUserInfoError(
                    provider=self.name,
                    reason=f"Network error: {str(e)}"
                )


# =============================================================================
# OAuth Service
# =============================================================================

class OAuthService:
    """
    Service for managing OAuth authentication flows.
    
    This service coordinates OAuth providers and handles:
    - State token generation and validation
    - Provider selection
    - Token exchange and user info retrieval
    """
    
    # In-memory state storage (TODO: Replace with Redis)
    # Format: {state_token: {"provider": str, "created_at": float}}
    _state_store: Dict[str, dict] = {}
    
    # State token TTL in seconds (10 minutes)
    STATE_TTL_SECONDS = 600
    
    def __init__(self):
        """Initialize OAuth service with all providers."""
        self.providers: Dict[str, OAuthProvider] = {
            "google": GoogleOAuthProvider(),
            "twitch": TwitchOAuthProvider(),
            "discord": DiscordOAuthProvider(),
        }
    
    def get_provider(self, name: str) -> OAuthProvider:
        """
        Get OAuth provider by name.
        
        Args:
            name: Provider name (google, twitch, discord)
            
        Returns:
            OAuthProvider instance
            
        Raises:
            OAuthProviderNotFoundError: If provider doesn't exist
        """
        provider = self.providers.get(name.lower())
        if not provider:
            raise OAuthProviderNotFoundError(name)
        return provider
    
    async def generate_state(self, provider: str) -> str:
        """
        Generate secure state token for CSRF protection.
        
        Args:
            provider: OAuth provider name
            
        Returns:
            Secure random state token
        """
        import time
        
        state = secrets.token_urlsafe(32)
        
        # Store state with metadata
        # TODO: Replace with Redis storage with TTL
        self._state_store[state] = {
            "provider": provider,
            "created_at": time.time(),
        }
        
        # Clean up expired states (simple cleanup, not production-ready)
        self._cleanup_expired_states()
        
        return state
    
    async def validate_state(self, state: str, provider: str) -> bool:
        """
        Validate state token.
        
        Args:
            state: State token from OAuth callback
            provider: Expected provider name
            
        Returns:
            True if state is valid
            
        Note:
            State is consumed after validation (one-time use)
        """
        import time
        
        state_data = self._state_store.get(state)
        
        if not state_data:
            return False
        
        # Check if state has expired
        if time.time() - state_data["created_at"] > self.STATE_TTL_SECONDS:
            del self._state_store[state]
            return False
        
        # Check if provider matches
        if state_data["provider"] != provider:
            return False
        
        # Consume state (one-time use)
        del self._state_store[state]
        
        return True
    
    def _cleanup_expired_states(self) -> None:
        """Remove expired state tokens from storage."""
        import time
        
        current_time = time.time()
        expired_states = [
            state for state, data in self._state_store.items()
            if current_time - data["created_at"] > self.STATE_TTL_SECONDS
        ]
        
        for state in expired_states:
            del self._state_store[state]


# =============================================================================
# Singleton Instance
# =============================================================================

_oauth_service: Optional[OAuthService] = None


def get_oauth_service() -> OAuthService:
    """Get or create the OAuth service singleton."""
    global _oauth_service
    if _oauth_service is None:
        _oauth_service = OAuthService()
    return _oauth_service


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    # Data classes
    "OAuthTokens",
    "OAuthUserInfo",
    # Base class
    "OAuthProvider",
    # Providers
    "GoogleOAuthProvider",
    "TwitchOAuthProvider",
    "DiscordOAuthProvider",
    # Service
    "OAuthService",
    "get_oauth_service",
    # Exceptions
    "OAuthError",
    "OAuthProviderError",
    "OAuthStateError",
    "OAuthTokenExchangeError",
    "OAuthUserInfoError",
    "OAuthProviderNotFoundError",
]
