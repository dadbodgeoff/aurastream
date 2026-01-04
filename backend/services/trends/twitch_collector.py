"""
Twitch Collector Service for AuraStream Trend Intelligence.

This service fetches data from the Twitch Helix API including:
- Top live streams
- Top games by viewers
- Top clips for games

The service handles OAuth app access token management with automatic
caching and refresh, as well as graceful error handling for API failures.

Twitch Helix API Reference:
- https://dev.twitch.tv/docs/api/reference

Rate Limits:
- 800 requests per minute for app access tokens
- Unlimited quota (no daily limits like YouTube)
"""

import asyncio
import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal

import httpx
import redis.asyncio as redis

from backend.services.distributed_lock import DistributedLock
from backend.services.exceptions import StreamerStudioError


logger = logging.getLogger(__name__)


# =============================================================================
# Exceptions
# =============================================================================


class TwitchAPIError(StreamerStudioError):
    """Base exception for Twitch API errors."""
    
    def __init__(
        self,
        message: str,
        code: str = "TWITCH_API_ERROR",
        status_code: int = 500,
        details: Optional[dict] = None
    ):
        super().__init__(
            message=message,
            code=code,
            status_code=status_code,
            details=details
        )


class TwitchAuthError(TwitchAPIError):
    """Raised when Twitch authentication fails."""
    
    def __init__(self, reason: str = "Authentication failed"):
        super().__init__(
            message=f"Twitch authentication error: {reason}",
            code="TWITCH_AUTH_ERROR",
            status_code=401,
            details={"reason": reason}
        )


class TwitchRateLimitError(TwitchAPIError):
    """Raised when Twitch rate limit is exceeded."""
    
    def __init__(self, retry_after: int = 60):
        super().__init__(
            message="Twitch API rate limit exceeded",
            code="TWITCH_RATE_LIMIT",
            status_code=429,
            details={"retry_after_seconds": retry_after}
        )
        self.retry_after = retry_after


class TwitchConfigError(TwitchAPIError):
    """Raised when Twitch configuration is missing."""
    
    def __init__(self, missing_var: str):
        super().__init__(
            message=f"Missing Twitch configuration: {missing_var}",
            code="TWITCH_CONFIG_ERROR",
            status_code=500,
            details={"missing_variable": missing_var}
        )


# =============================================================================
# Data Classes
# =============================================================================


@dataclass
class TwitchAccessToken:
    """Cached Twitch app access token."""
    access_token: str
    expires_at: datetime
    token_type: str = "bearer"
    
    @property
    def is_expired(self) -> bool:
        """Check if token is expired (with 5 minute buffer)."""
        buffer = timedelta(minutes=5)
        return datetime.now(timezone.utc) >= (self.expires_at - buffer)


@dataclass
class TwitchStream:
    """Twitch live stream data."""
    id: str
    user_id: str
    user_login: str
    user_name: str
    game_id: str
    game_name: str
    type: str  # "live" or ""
    title: str
    viewer_count: int
    started_at: datetime
    language: str
    thumbnail_url: str
    tags: List[str]
    is_mature: bool


@dataclass
class TwitchChannel:
    """Twitch channel/user data."""
    id: str
    login: str
    display_name: str
    description: str
    profile_image_url: str
    offline_image_url: str
    broadcaster_type: str  # "partner", "affiliate", ""
    created_at: datetime


@dataclass
class TwitchChannelFollowers:
    """Twitch channel follower count."""
    user_id: str
    follower_count: int


@dataclass
class TwitchGame:
    """Twitch game/category data."""
    id: str
    name: str
    box_art_url: str
    igdb_id: Optional[str] = None


@dataclass
class TwitchClip:
    """Twitch clip data."""
    id: str
    url: str
    embed_url: str
    broadcaster_id: str
    broadcaster_name: str
    creator_id: str
    creator_name: str
    video_id: str
    game_id: str
    language: str
    title: str
    view_count: int
    created_at: datetime
    thumbnail_url: str
    duration: float


# =============================================================================
# Twitch Collector Service
# =============================================================================


class TwitchCollector:
    """
    Service for collecting data from Twitch Helix API.
    
    This service handles:
    - OAuth app access token management with Redis caching
    - Fetching top live streams
    - Fetching top games by viewers
    - Fetching top clips for games
    
    Token management uses Redis for distributed caching and a distributed
    lock to prevent race conditions during token refresh.
    
    Usage:
        collector = TwitchCollector()
        streams = await collector.fetch_top_streams(limit=100)
        games = await collector.fetch_top_games(limit=50)
        clips = await collector.fetch_clips(game_id="12345", period="day")
    """
    
    # Twitch API endpoints
    TOKEN_URL = "https://id.twitch.tv/oauth2/token"
    HELIX_BASE_URL = "https://api.twitch.tv/helix"
    
    # Redis keys for token caching
    REDIS_TOKEN_KEY = "twitch:access_token"
    REDIS_TOKEN_LOCK_KEY = "twitch:token_refresh_lock"
    
    # Lock timeout for token refresh (seconds)
    TOKEN_REFRESH_LOCK_TIMEOUT = 30
    
    # Clip period options
    ClipPeriod = Literal["day", "week", "month", "all"]
    
    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        redis_url: Optional[str] = None
    ):
        """
        Initialize the Twitch collector.
        
        Args:
            client_id: Twitch application client ID (defaults to env var)
            client_secret: Twitch application client secret (defaults to env var)
            redis_url: Redis connection URL (defaults to REDIS_URL env var)
            
        Raises:
            TwitchConfigError: If required credentials are not provided
        """
        self.client_id = client_id or os.getenv("TWITCH_CLIENT_ID")
        self.client_secret = client_secret or os.getenv("TWITCH_CLIENT_SECRET")
        self._redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        
        # Validate configuration
        if not self.client_id:
            raise TwitchConfigError("TWITCH_CLIENT_ID")
        if not self.client_secret:
            raise TwitchConfigError("TWITCH_CLIENT_SECRET")
        
        # Redis client for token caching (lazy initialization)
        self._redis_client: Optional[redis.Redis] = None
        
        # Distributed lock for token refresh
        self._lock = DistributedLock(redis_url=self._redis_url)
        
        logger.info("TwitchCollector initialized with Redis token caching")
    
    # =========================================================================
    # Redis Client Management
    # =========================================================================
    
    async def _get_redis_client(self) -> redis.Redis:
        """Get or create Redis client for token caching."""
        if self._redis_client is None:
            self._redis_client = redis.from_url(self._redis_url, decode_responses=True)
        return self._redis_client
    
    # =========================================================================
    # Token Management (Redis-cached with distributed lock)
    # =========================================================================
    
    async def _get_cached_token(self) -> Optional[str]:
        """
        Get cached token from Redis if valid.
        
        Returns:
            Valid access token string or None if not cached/expired
        """
        try:
            client = await self._get_redis_client()
            token_data = await client.get(self.REDIS_TOKEN_KEY)
            
            if not token_data:
                return None
            
            # Parse cached token data
            data = json.loads(token_data)
            expires_at = datetime.fromisoformat(data["expires_at"])
            
            # Check if token is expired (with 5 minute buffer)
            buffer = timedelta(minutes=5)
            if datetime.now(timezone.utc) >= (expires_at - buffer):
                logger.debug("Cached Twitch token is expired or expiring soon")
                return None
            
            return data["access_token"]
            
        except (redis.ConnectionError, json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Error reading cached Twitch token: {e}")
            return None
    
    async def _cache_token(self, access_token: str, expires_in: int) -> None:
        """
        Cache token in Redis with expiration.
        
        Args:
            access_token: The access token to cache
            expires_in: Token lifetime in seconds
        """
        try:
            client = await self._get_redis_client()
            
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
            token_data = json.dumps({
                "access_token": access_token,
                "expires_at": expires_at.isoformat(),
            })
            
            # Set with expiration (slightly less than token lifetime for safety)
            ttl = max(expires_in - 300, 60)  # At least 60 seconds, 5 min buffer
            await client.set(self.REDIS_TOKEN_KEY, token_data, ex=ttl)
            
            logger.debug(f"Twitch token cached in Redis with TTL {ttl}s")
            
        except redis.ConnectionError as e:
            logger.warning(f"Failed to cache Twitch token in Redis: {e}")
    
    async def _clear_cached_token(self) -> None:
        """Clear the cached token from Redis."""
        try:
            client = await self._get_redis_client()
            await client.delete(self.REDIS_TOKEN_KEY)
            logger.debug("Cleared cached Twitch token from Redis")
        except redis.ConnectionError as e:
            logger.warning(f"Failed to clear cached Twitch token: {e}")
    
    async def _fetch_new_token(self) -> str:
        """
        Fetch a new OAuth app access token from Twitch.
        
        Returns:
            New access token string
            
        Raises:
            TwitchAuthError: If token fetch fails
        """
        logger.info("Fetching new Twitch app access token")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.TOKEN_URL,
                    data={
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "grant_type": "client_credentials",
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=30.0,
                )
                
                if response.status_code != 200:
                    error_data = response.json() if response.content else {}
                    error_msg = error_data.get("message", "Token request failed")
                    logger.error(f"Twitch token request failed: {error_msg}")
                    raise TwitchAuthError(error_msg)
                
                data = response.json()
                access_token = data["access_token"]
                expires_in = data.get("expires_in", 3600)
                
                # Cache the token in Redis
                await self._cache_token(access_token, expires_in)
                
                logger.info(f"Twitch access token obtained, expires in {expires_in}s")
                return access_token
                
            except httpx.RequestError as e:
                logger.error(f"Network error fetching Twitch token: {e}")
                raise TwitchAuthError(f"Network error: {str(e)}")
    
    async def _get_access_token(self) -> str:
        """
        Get a valid OAuth app access token.
        
        Uses Redis for distributed caching and a distributed lock to prevent
        race conditions when multiple concurrent requests need to refresh
        the token.
        
        Returns:
            Valid access token string
            
        Raises:
            TwitchAuthError: If token fetch fails
        """
        # First, try to get cached token from Redis (fast path)
        cached_token = await self._get_cached_token()
        if cached_token:
            return cached_token
        
        # Token needs refresh - acquire distributed lock to prevent race condition
        # Use blocking mode with short timeout since token refresh is quick
        async with self._lock.acquire_lock(
            self.REDIS_TOKEN_LOCK_KEY,
            timeout=self.TOKEN_REFRESH_LOCK_TIMEOUT,
            blocking=True,
            blocking_timeout=10,
            raise_on_failure=False,
        ) as acquired:
            if not acquired:
                # Another process is refreshing, wait and retry cache
                logger.debug("Token refresh lock held by another process, waiting...")
                # Brief wait then check cache again
                await asyncio.sleep(0.5)
                cached_token = await self._get_cached_token()
                if cached_token:
                    return cached_token
                # If still no token, try to fetch anyway (lock may have expired)
                logger.warning("No cached token after waiting, fetching new token")
                return await self._fetch_new_token()
            
            # We have the lock - double-check cache (another process may have just refreshed)
            cached_token = await self._get_cached_token()
            if cached_token:
                logger.debug("Token was refreshed by another process while waiting for lock")
                return cached_token
            
            # Fetch new token while holding the lock
            return await self._fetch_new_token()
    
    def _get_headers(self, access_token: str) -> dict:
        """Get headers for Twitch Helix API requests."""
        return {
            "Authorization": f"Bearer {access_token}",
            "Client-Id": self.client_id,
        }
    
    async def _make_request(
        self,
        endpoint: str,
        params: Optional[dict] = None,
        retry_on_auth_error: bool = True
    ) -> dict:
        """
        Make an authenticated request to Twitch Helix API.
        
        Args:
            endpoint: API endpoint path (e.g., "/streams")
            params: Query parameters
            retry_on_auth_error: Whether to retry with fresh token on 401
            
        Returns:
            JSON response data
            
        Raises:
            TwitchAPIError: If request fails
            TwitchRateLimitError: If rate limit exceeded
            TwitchAuthError: If authentication fails
        """
        access_token = await self._get_access_token()
        url = f"{self.HELIX_BASE_URL}{endpoint}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    params=params,
                    headers=self._get_headers(access_token),
                    timeout=30.0,
                )
                
                # Handle rate limiting
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Ratelimit-Reset", 60))
                    logger.warning(f"Twitch rate limit hit, retry after {retry_after}s")
                    raise TwitchRateLimitError(retry_after)
                
                # Handle auth errors with retry
                if response.status_code == 401:
                    if retry_on_auth_error:
                        logger.warning("Twitch token expired, refreshing...")
                        await self._clear_cached_token()  # Clear cached token from Redis
                        return await self._make_request(
                            endpoint, params, retry_on_auth_error=False
                        )
                    raise TwitchAuthError("Token invalid or expired")
                
                # Handle other errors
                if response.status_code != 200:
                    error_data = response.json() if response.content else {}
                    error_msg = error_data.get("message", f"Request failed with status {response.status_code}")
                    logger.error(f"Twitch API error: {error_msg}")
                    raise TwitchAPIError(
                        message=error_msg,
                        status_code=response.status_code,
                        details={"endpoint": endpoint, "status": response.status_code}
                    )
                
                return response.json()
                
            except httpx.RequestError as e:
                logger.error(f"Network error calling Twitch API: {e}")
                raise TwitchAPIError(
                    message=f"Network error: {str(e)}",
                    details={"endpoint": endpoint}
                )
    
    # =========================================================================
    # Public API Methods
    # =========================================================================
    
    async def fetch_streams_paginated(
        self,
        game_id: str,
        max_streams: int = 500,
        language: Optional[str] = None
    ) -> List[TwitchStream]:
        """
        Fetch streams with pagination for more accurate viewer counts.
        
        Args:
            game_id: Game/category ID to fetch streams for
            max_streams: Maximum total streams to fetch (will paginate)
            language: Filter by stream language (optional)
            
        Returns:
            List of TwitchStream objects sorted by viewer count
        """
        all_streams = []
        cursor = None
        pages_fetched = 0
        max_pages = (max_streams + 99) // 100  # Ceiling division
        
        while pages_fetched < max_pages:
            params = {"first": 100, "game_id": game_id}
            if language:
                params["language"] = language
            if cursor:
                params["after"] = cursor
            
            data = await self._make_request("/streams", params)
            
            for item in data.get("data", []):
                try:
                    stream = TwitchStream(
                        id=item["id"],
                        user_id=item["user_id"],
                        user_login=item["user_login"],
                        user_name=item["user_name"],
                        game_id=item.get("game_id", ""),
                        game_name=item.get("game_name", ""),
                        type=item.get("type", ""),
                        title=item.get("title", ""),
                        viewer_count=item.get("viewer_count", 0),
                        started_at=datetime.fromisoformat(
                            item["started_at"].replace("Z", "+00:00")
                        ),
                        language=item.get("language", ""),
                        thumbnail_url=item.get("thumbnail_url", ""),
                        tags=item.get("tags", []),
                        is_mature=item.get("is_mature", False),
                    )
                    all_streams.append(stream)
                except (KeyError, ValueError) as e:
                    logger.warning(f"Failed to parse stream data: {e}")
                    continue
            
            # Check for next page
            pagination = data.get("pagination", {})
            cursor = pagination.get("cursor")
            pages_fetched += 1
            
            # Stop if no more pages or we have enough streams
            if not cursor or len(all_streams) >= max_streams:
                break
        
        logger.info(f"Fetched {len(all_streams)} streams for game {game_id} ({pages_fetched} pages)")
        return all_streams[:max_streams]
    async def fetch_top_streams(
        self,
        limit: int = 100,
        game_id: Optional[str] = None,
        language: Optional[str] = None
    ) -> List[TwitchStream]:
        """
        Fetch top live streams by viewer count.
        
        Args:
            limit: Maximum number of streams to return (1-100)
            game_id: Filter by game/category ID (optional)
            language: Filter by stream language (optional, e.g., "en")
            
        Returns:
            List of TwitchStream objects sorted by viewer count
            
        Raises:
            TwitchAPIError: If request fails
        """
        # Clamp limit to valid range
        limit = max(1, min(100, limit))
        
        params = {"first": limit}
        if game_id:
            params["game_id"] = game_id
        if language:
            params["language"] = language
        
        logger.info(f"Fetching top {limit} Twitch streams")
        
        data = await self._make_request("/streams", params)
        
        streams = []
        for item in data.get("data", []):
            try:
                stream = TwitchStream(
                    id=item["id"],
                    user_id=item["user_id"],
                    user_login=item["user_login"],
                    user_name=item["user_name"],
                    game_id=item.get("game_id", ""),
                    game_name=item.get("game_name", ""),
                    type=item.get("type", ""),
                    title=item.get("title", ""),
                    viewer_count=item.get("viewer_count", 0),
                    started_at=datetime.fromisoformat(
                        item["started_at"].replace("Z", "+00:00")
                    ),
                    language=item.get("language", ""),
                    thumbnail_url=item.get("thumbnail_url", ""),
                    tags=item.get("tags", []),
                    is_mature=item.get("is_mature", False),
                )
                streams.append(stream)
            except (KeyError, ValueError) as e:
                logger.warning(f"Failed to parse stream data: {e}")
                continue
        
        logger.info(f"Fetched {len(streams)} Twitch streams")
        return streams
    
    async def fetch_top_games(self, limit: int = 50) -> List[TwitchGame]:
        """
        Fetch top games/categories by viewer count.
        
        Args:
            limit: Maximum number of games to return (1-100)
            
        Returns:
            List of TwitchGame objects sorted by viewer count
            
        Raises:
            TwitchAPIError: If request fails
        """
        # Clamp limit to valid range
        limit = max(1, min(100, limit))
        
        params = {"first": limit}
        
        logger.info(f"Fetching top {limit} Twitch games")
        
        data = await self._make_request("/games/top", params)
        
        games = []
        for item in data.get("data", []):
            try:
                game = TwitchGame(
                    id=item["id"],
                    name=item["name"],
                    box_art_url=item.get("box_art_url", ""),
                    igdb_id=item.get("igdb_id"),
                )
                games.append(game)
            except (KeyError, ValueError) as e:
                logger.warning(f"Failed to parse game data: {e}")
                continue
        
        logger.info(f"Fetched {len(games)} Twitch games")
        return games
    
    async def fetch_clips(
        self,
        game_id: str,
        period: ClipPeriod = "day",
        limit: int = 20
    ) -> List[TwitchClip]:
        """
        Fetch top clips for a game/category.
        
        Args:
            game_id: Game/category ID to fetch clips for
            period: Time period for clips ("day", "week", "month", "all")
            limit: Maximum number of clips to return (1-100)
            
        Returns:
            List of TwitchClip objects sorted by view count
            
        Raises:
            TwitchAPIError: If request fails
        """
        # Clamp limit to valid range
        limit = max(1, min(100, limit))
        
        # Calculate time range based on period
        now = datetime.now(timezone.utc)
        if period == "day":
            started_at = now - timedelta(days=1)
        elif period == "week":
            started_at = now - timedelta(weeks=1)
        elif period == "month":
            started_at = now - timedelta(days=30)
        else:  # "all"
            started_at = None
        
        params = {
            "game_id": game_id,
            "first": limit,
        }
        
        if started_at:
            params["started_at"] = started_at.strftime("%Y-%m-%dT%H:%M:%SZ")
            params["ended_at"] = now.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        logger.info(f"Fetching top {limit} clips for game {game_id} ({period})")
        
        data = await self._make_request("/clips", params)
        
        clips = []
        for item in data.get("data", []):
            try:
                clip = TwitchClip(
                    id=item["id"],
                    url=item["url"],
                    embed_url=item["embed_url"],
                    broadcaster_id=item["broadcaster_id"],
                    broadcaster_name=item["broadcaster_name"],
                    creator_id=item["creator_id"],
                    creator_name=item["creator_name"],
                    video_id=item.get("video_id", ""),
                    game_id=item.get("game_id", ""),
                    language=item.get("language", ""),
                    title=item.get("title", ""),
                    view_count=item.get("view_count", 0),
                    created_at=datetime.fromisoformat(
                        item["created_at"].replace("Z", "+00:00")
                    ),
                    thumbnail_url=item.get("thumbnail_url", ""),
                    duration=item.get("duration", 0.0),
                )
                clips.append(clip)
            except (KeyError, ValueError) as e:
                logger.warning(f"Failed to parse clip data: {e}")
                continue
        
        logger.info(f"Fetched {len(clips)} clips for game {game_id}")
        return clips
    
    # =========================================================================
    # Response Transformation Methods
    # =========================================================================
    
    def stream_to_dict(self, stream: TwitchStream) -> dict:
        """
        Transform TwitchStream to dictionary matching Pydantic schema.
        
        Args:
            stream: TwitchStream dataclass instance
            
        Returns:
            Dictionary with snake_case keys for API response
        """
        return {
            "user_id": stream.user_id,
            "user_name": stream.user_name,
            "game_id": stream.game_id,
            "game_name": stream.game_name,
            "viewer_count": stream.viewer_count,
            "peak_viewers": None,  # Not available from streams endpoint
            "thumbnail": stream.thumbnail_url.replace("{width}", "320").replace("{height}", "180"),
            "title": stream.title,
            "started_at": stream.started_at.isoformat(),
            "velocity": None,  # Calculated separately
            "insight": None,  # Generated by AI
        }
    
    def game_to_dict(self, game: TwitchGame) -> dict:
        """
        Transform TwitchGame to dictionary matching Pydantic schema.
        
        Args:
            game: TwitchGame dataclass instance
            
        Returns:
            Dictionary with snake_case keys for API response
        """
        return {
            "game_id": game.id,
            "name": game.name,
            "twitch_viewers": 0,  # Needs to be aggregated from streams
            "twitch_streams": 0,  # Needs to be aggregated from streams
            "youtube_videos": None,
            "youtube_total_views": None,
            "trend": None,  # Calculated separately
            "box_art_url": game.box_art_url.replace("{width}", "285").replace("{height}", "380"),
        }
    
    def clip_to_dict(self, clip: TwitchClip) -> dict:
        """
        Transform TwitchClip to dictionary.
        
        Args:
            clip: TwitchClip dataclass instance
            
        Returns:
            Dictionary with clip data
        """
        return {
            "id": clip.id,
            "url": clip.url,
            "embed_url": clip.embed_url,
            "broadcaster_id": clip.broadcaster_id,
            "broadcaster_name": clip.broadcaster_name,
            "creator_id": clip.creator_id,
            "creator_name": clip.creator_name,
            "video_id": clip.video_id,
            "game_id": clip.game_id,
            "language": clip.language,
            "title": clip.title,
            "view_count": clip.view_count,
            "created_at": clip.created_at.isoformat(),
            "thumbnail_url": clip.thumbnail_url,
            "duration": clip.duration,
        }
    
    async def fetch_channels(self, user_ids: List[str]) -> List[TwitchChannel]:
        """
        Fetch channel information for multiple users.
        
        Args:
            user_ids: List of Twitch user IDs (max 100)
            
        Returns:
            List of TwitchChannel objects
        """
        if not user_ids:
            return []
        
        # Limit to 100 users per request
        user_ids = user_ids[:100]
        
        params = {"id": user_ids}
        
        logger.info(f"Fetching channel info for {len(user_ids)} users")
        
        data = await self._make_request("/users", params)
        
        channels = []
        for item in data.get("data", []):
            try:
                created_at = datetime.fromisoformat(
                    item["created_at"].replace("Z", "+00:00")
                ) if item.get("created_at") else datetime.now(timezone.utc)
                
                channel = TwitchChannel(
                    id=item["id"],
                    login=item["login"],
                    display_name=item["display_name"],
                    description=item.get("description", ""),
                    profile_image_url=item.get("profile_image_url", ""),
                    offline_image_url=item.get("offline_image_url", ""),
                    broadcaster_type=item.get("broadcaster_type", ""),
                    created_at=created_at,
                )
                channels.append(channel)
            except (KeyError, ValueError) as e:
                logger.warning(f"Failed to parse channel data: {e}")
                continue
        
        logger.info(f"Fetched {len(channels)} channels")
        return channels
    
    async def fetch_channel_followers(self, broadcaster_id: str) -> Optional[TwitchChannelFollowers]:
        """
        Fetch follower count for a channel.
        
        Note: This endpoint requires user access token for full data,
        but with app token we can still get the total count.
        
        Args:
            broadcaster_id: Twitch broadcaster user ID
            
        Returns:
            TwitchChannelFollowers or None if failed
        """
        params = {
            "broadcaster_id": broadcaster_id,
            "first": 1,  # We only need the total count
        }
        
        try:
            data = await self._make_request("/channels/followers", params)
            total = data.get("total", 0)
            return TwitchChannelFollowers(
                user_id=broadcaster_id,
                follower_count=total,
            )
        except TwitchAPIError as e:
            # This endpoint may fail with app token for some channels
            logger.warning(f"Failed to fetch followers for {broadcaster_id}: {e}")
            return None
    
    async def fetch_multiple_channel_followers(self, broadcaster_ids: List[str]) -> dict[str, int]:
        """
        Fetch follower counts for multiple channels.
        
        Args:
            broadcaster_ids: List of Twitch broadcaster user IDs
            
        Returns:
            Dictionary mapping user_id to follower_count
        """
        results = {}
        for bid in broadcaster_ids[:20]:  # Limit to avoid rate limits
            followers = await self.fetch_channel_followers(bid)
            if followers:
                results[followers.user_id] = followers.follower_count
        return results


# =============================================================================
# Singleton Instance
# =============================================================================


_twitch_collector: Optional[TwitchCollector] = None


def get_twitch_collector() -> TwitchCollector:
    """
    Get or create the TwitchCollector singleton.
    
    Returns:
        TwitchCollector instance
        
    Raises:
        TwitchConfigError: If Twitch credentials are not configured
    """
    global _twitch_collector
    if _twitch_collector is None:
        _twitch_collector = TwitchCollector()
    return _twitch_collector


# =============================================================================
# Exports
# =============================================================================


__all__ = [
    # Main class
    "TwitchCollector",
    "get_twitch_collector",
    # Data classes
    "TwitchAccessToken",
    "TwitchStream",
    "TwitchGame",
    "TwitchClip",
    "TwitchChannel",
    "TwitchChannelFollowers",
    # Exceptions
    "TwitchAPIError",
    "TwitchAuthError",
    "TwitchRateLimitError",
    "TwitchConfigError",
]
