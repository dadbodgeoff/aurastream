"""
Aurastream Backend - Common FastAPI Dependencies

This module provides reusable FastAPI dependencies for:
- Configuration access
- Authentication and authorization
- Database sessions
- Rate limiting
- Request context

Dependencies are designed to be composable and testable.
"""

from typing import Annotated, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from api.config import Settings, get_settings


# =============================================================================
# Configuration Dependencies
# =============================================================================

def get_settings_dependency() -> Settings:
    """
    FastAPI dependency for accessing application settings.
    
    This dependency provides access to the singleton Settings instance,
    allowing route handlers to access configuration values.
    
    Returns:
        Settings: The application settings instance
        
    Example:
        ```python
        @router.get("/config-example")
        async def example(settings: Annotated[Settings, Depends(get_settings_dependency)]):
            return {"environment": settings.APP_ENV}
        ```
    """
    return get_settings()


# Type alias for cleaner dependency injection
SettingsDep = Annotated[Settings, Depends(get_settings_dependency)]


# =============================================================================
# Request Context Dependencies
# =============================================================================

def get_request_id(request: Request) -> str:
    """
    Extract the request ID from the request state.
    
    The request ID is set by the RequestIDMiddleware and can be used
    for logging, tracing, and error correlation.
    
    Args:
        request: The FastAPI request object
        
    Returns:
        str: The unique request ID
        
    Example:
        ```python
        @router.get("/trace-example")
        async def example(request_id: Annotated[str, Depends(get_request_id)]):
            logger.info(f"Processing request {request_id}")
            return {"request_id": request_id}
        ```
    """
    return getattr(request.state, "request_id", "unknown")


# Type alias for request ID dependency
RequestIdDep = Annotated[str, Depends(get_request_id)]


# =============================================================================
# Authentication Dependencies
# =============================================================================

# HTTP Bearer token security scheme
bearer_scheme = HTTPBearer(auto_error=False)


class CurrentUser:
    """
    Placeholder class representing the authenticated user.
    
    This will be replaced with the actual User model from the database
    once the authentication system is fully implemented in Phase 1.
    
    Attributes:
        id: User's unique identifier (UUID)
        email: User's email address
        subscription_tier: User's subscription level (free, pro, studio)
    """
    
    def __init__(
        self,
        id: str,
        email: str,
        subscription_tier: str = "free",
    ):
        self.id = id
        self.email = email
        self.subscription_tier = subscription_tier


async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
    settings: SettingsDep,
) -> CurrentUser:
    """
    Dependency to get the current authenticated user from JWT token.
    
    This is a placeholder implementation that will be completed in Phase 1
    when the full authentication system is implemented.
    
    Args:
        credentials: HTTP Bearer token credentials
        settings: Application settings for JWT configuration
        
    Returns:
        CurrentUser: The authenticated user object
        
    Raises:
        HTTPException: 401 if no token provided or token is invalid
        HTTPException: 403 if token is expired or user lacks permissions
        
    Example:
        ```python
        @router.get("/protected")
        async def protected_route(user: Annotated[CurrentUser, Depends(get_current_user)]):
            return {"user_id": user.id, "email": user.email}
        ```
    
    TODO (Phase 1):
        - Implement JWT token decoding using settings.JWT_SECRET_KEY
        - Validate token expiration
        - Fetch user from database
        - Handle token refresh logic
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    
    # TODO: Implement actual JWT decoding and validation
    # This is a placeholder that will be replaced in Phase 1
    #
    # Implementation will include:
    # 1. Decode JWT using settings.JWT_SECRET_KEY and settings.JWT_ALGORITHM
    # 2. Validate token expiration
    # 3. Extract user_id from token payload
    # 4. Fetch user from Supabase database
    # 5. Return CurrentUser (or actual User model)
    #
    # Example implementation:
    # try:
    #     payload = jwt.decode(
    #         token,
    #         settings.JWT_SECRET_KEY,
    #         algorithms=[settings.JWT_ALGORITHM]
    #     )
    #     user_id = payload.get("sub")
    #     if user_id is None:
    #         raise HTTPException(status_code=401, detail="Invalid token payload")
    #     
    #     user = await get_user_from_db(user_id)
    #     if user is None:
    #         raise HTTPException(status_code=401, detail="User not found")
    #     
    #     return user
    # except jwt.ExpiredSignatureError:
    #     raise HTTPException(status_code=401, detail="Token has expired")
    # except jwt.InvalidTokenError:
    #     raise HTTPException(status_code=401, detail="Invalid token")
    
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Authentication not yet implemented. Coming in Phase 1.",
    )


# Type alias for current user dependency
CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]


async def get_current_user_optional(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
    settings: SettingsDep,
) -> Optional[CurrentUser]:
    """
    Dependency to optionally get the current user if authenticated.
    
    Unlike get_current_user, this dependency does not raise an exception
    if no token is provided. Useful for endpoints that have different
    behavior for authenticated vs anonymous users.
    
    Args:
        credentials: HTTP Bearer token credentials (optional)
        settings: Application settings for JWT configuration
        
    Returns:
        Optional[CurrentUser]: The authenticated user or None if not authenticated
        
    Example:
        ```python
        @router.get("/public-with-user-context")
        async def public_route(
            user: Annotated[Optional[CurrentUser], Depends(get_current_user_optional)]
        ):
            if user:
                return {"message": f"Hello, {user.email}!"}
            return {"message": "Hello, anonymous user!"}
        ```
    """
    if credentials is None:
        return None
    
    try:
        return await get_current_user(credentials, settings)
    except HTTPException:
        return None


# Type alias for optional current user dependency
CurrentUserOptionalDep = Annotated[Optional[CurrentUser], Depends(get_current_user_optional)]


# =============================================================================
# Authorization Dependencies
# =============================================================================

def require_subscription_tier(required_tier: str):
    """
    Factory function to create a dependency that requires a minimum subscription tier.
    
    Args:
        required_tier: The minimum required tier ("free", "pro", or "studio")
        
    Returns:
        Dependency function that validates user's subscription tier
        
    Example:
        ```python
        @router.post("/premium-feature")
        async def premium_feature(
            user: CurrentUserDep,
            _: Annotated[None, Depends(require_subscription_tier("pro"))]
        ):
            return {"message": "Welcome to the premium feature!"}
        ```
    
    TODO (Phase 1):
        - Implement tier hierarchy validation
        - Add grace period handling for expired subscriptions
    """
    tier_hierarchy = {"free": 0, "pro": 1, "studio": 2}
    required_level = tier_hierarchy.get(required_tier, 0)
    
    async def check_tier(user: CurrentUserDep) -> None:
        user_level = tier_hierarchy.get(user.subscription_tier, 0)
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This feature requires a {required_tier} subscription or higher.",
            )
    
    return check_tier


# Convenience dependencies for common tier requirements
RequireProTier = Depends(require_subscription_tier("pro"))
RequireStudioTier = Depends(require_subscription_tier("studio"))


# =============================================================================
# Database Dependencies (Placeholder)
# =============================================================================

# TODO (Phase 1): Implement database session dependency
# async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
#     """
#     Dependency to get a database session.
#     
#     Yields:
#         AsyncSession: SQLAlchemy async session
#     """
#     async with async_session_maker() as session:
#         try:
#             yield session
#             await session.commit()
#         except Exception:
#             await session.rollback()
#             raise
#         finally:
#             await session.close()


# =============================================================================
# Rate Limiting Dependencies (Placeholder)
# =============================================================================

# TODO (Phase 2): Implement rate limiting dependency
# async def check_rate_limit(
#     request: Request,
#     user: CurrentUserOptionalDep,
#     settings: SettingsDep,
# ) -> None:
#     """
#     Dependency to check and enforce rate limits.
#     
#     Rate limits are based on:
#     - User's subscription tier
#     - Endpoint being accessed
#     - Time window (requests per minute/hour)
#     """
#     pass
