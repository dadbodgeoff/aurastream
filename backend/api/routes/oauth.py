"""
OAuth Route Handlers for Aurastream.

This module implements OAuth authentication endpoints:
- POST /api/v1/auth/oauth/{provider} - Initiate OAuth flow
- GET /api/v1/auth/oauth/{provider}/callback - Handle OAuth callback

Supported providers:
- Google
- Twitch
- Discord

Security Notes:
- State tokens are used for CSRF protection
- Tokens are never logged
- HTTP-only cookies are used for web clients
"""

from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse

from backend.api.config import get_settings
from backend.api.schemas.auth import OAuthInitiateResponse, LoginResponse, UserResponse
from backend.services.auth_service import get_auth_service, User, TokenPair
from backend.services.oauth_service import (
    get_oauth_service,
    OAuthError,
    OAuthProviderNotFoundError,
    OAuthStateError,
    OAuthTokenExchangeError,
    OAuthUserInfoError,
    OAuthUserInfo,
)
from backend.services.exceptions import StreamerStudioError


router = APIRouter()


def _user_to_response(user: User) -> UserResponse:
    """
    Convert User dataclass to UserResponse schema.
    
    Args:
        user: User dataclass from auth service
        
    Returns:
        UserResponse: Pydantic schema for API response
    """
    return UserResponse(
        id=user.id,
        email=user.email,
        email_verified=user.email_verified,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        subscription_tier=user.subscription_tier,
        subscription_status=user.subscription_status,
        assets_generated_this_month=user.assets_generated_this_month,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def _build_redirect_uri(request: Request, provider: str) -> str:
    """
    Build the OAuth callback redirect URI.
    
    Args:
        request: FastAPI request object
        provider: OAuth provider name
        
    Returns:
        Full callback URL
    """
    settings = get_settings()
    base_url = settings.API_BASE_URL.rstrip("/")
    return f"{base_url}/api/v1/auth/oauth/{provider}/callback"


def _build_frontend_redirect(success: bool, error: Optional[str] = None) -> str:
    """
    Build frontend redirect URL after OAuth callback.
    
    Args:
        success: Whether OAuth was successful
        error: Error message if failed
        
    Returns:
        Frontend URL with query parameters
    """
    settings = get_settings()
    
    # Get first allowed origin as frontend URL
    frontend_url = settings.allowed_origins_list[0] if settings.allowed_origins_list else "http://localhost:3000"
    frontend_url = frontend_url.rstrip("/")
    
    if success:
        return f"{frontend_url}/auth/callback?success=true"
    else:
        params = urlencode({"success": "false", "error": error or "Unknown error"})
        return f"{frontend_url}/auth/callback?{params}"


# =============================================================================
# POST /{provider} - Initiate OAuth flow
# =============================================================================

@router.post(
    "/{provider}",
    response_model=OAuthInitiateResponse,
    summary="Initiate OAuth authentication flow",
    description="""
    Start the OAuth authentication flow for the specified provider.
    
    **Supported Providers:**
    - `google` - Google OAuth 2.0
    - `twitch` - Twitch OAuth 2.0
    - `discord` - Discord OAuth 2.0
    
    **Flow:**
    1. Client calls this endpoint with the provider name
    2. Server generates a secure state token for CSRF protection
    3. Server returns the authorization URL
    4. Client redirects user to the authorization URL
    5. After user authorizes, provider redirects to callback endpoint
    
    **State Token:**
    - Valid for 10 minutes
    - One-time use (consumed on callback)
    - Stored server-side for validation
    """,
    responses={
        200: {"description": "OAuth flow initiated successfully"},
        404: {"description": "Unknown OAuth provider"},
    },
)
async def initiate_oauth(
    request: Request,
    provider: str,
) -> OAuthInitiateResponse:
    """
    Initiate OAuth authentication flow.
    
    Generates a state token and returns the authorization URL
    for the specified OAuth provider.
    
    Args:
        request: FastAPI request object
        provider: OAuth provider name (google, twitch, discord)
        
    Returns:
        OAuthInitiateResponse: Authorization URL and state token
        
    Raises:
        HTTPException: 404 if provider is not supported
    """
    oauth_service = get_oauth_service()
    
    try:
        # Get the provider (validates it exists)
        oauth_provider = oauth_service.get_provider(provider)
        
        # Generate state token for CSRF protection
        state = await oauth_service.generate_state(provider)
        
        # Build redirect URI
        redirect_uri = _build_redirect_uri(request, provider)
        
        # Get authorization URL
        authorization_url = oauth_provider.get_authorization_url(
            state=state,
            redirect_uri=redirect_uri,
        )
        
        return OAuthInitiateResponse(
            authorization_url=authorization_url,
            state=state,
        )
        
    except OAuthProviderNotFoundError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.to_dict(),
        )


# =============================================================================
# GET /{provider}/callback - Handle OAuth callback
# =============================================================================

@router.get(
    "/{provider}/callback",
    summary="Handle OAuth callback",
    description="""
    Handle the OAuth callback from the provider.
    
    **Flow:**
    1. Provider redirects user here with code and state
    2. Server validates the state token
    3. Server exchanges code for tokens
    4. Server fetches user info from provider
    5. Server creates or links user account
    6. Server generates JWT tokens
    7. Server sets HTTP-only cookie
    8. Server redirects to frontend with success/error
    
    **Account Linking:**
    - If email exists, links OAuth to existing account
    - If email is new, creates new account
    
    **Error Handling:**
    - Invalid state: Redirects with error
    - Token exchange failure: Redirects with error
    - User info failure: Redirects with error
    """,
    responses={
        302: {"description": "Redirect to frontend with result"},
        400: {"description": "Invalid state or OAuth error"},
    },
)
async def oauth_callback(
    request: Request,
    response: Response,
    provider: str,
    code: str = Query(..., description="Authorization code from OAuth provider"),
    state: str = Query(..., description="State parameter for CSRF validation"),
    error: Optional[str] = Query(None, description="Error from OAuth provider"),
    error_description: Optional[str] = Query(None, description="Error description from provider"),
) -> RedirectResponse:
    """
    Handle OAuth callback from provider.
    
    Validates the state, exchanges the code for tokens, fetches user info,
    creates or links the user account, and redirects to the frontend.
    
    Args:
        request: FastAPI request object
        response: FastAPI response object
        provider: OAuth provider name
        code: Authorization code from provider
        state: State token for CSRF validation
        error: Error code from provider (if authorization failed)
        error_description: Human-readable error description
        
    Returns:
        RedirectResponse: Redirect to frontend with success or error
    """
    settings = get_settings()
    oauth_service = get_oauth_service()
    auth_service = get_auth_service()
    
    # Handle provider-side errors
    if error:
        return RedirectResponse(
            url=_build_frontend_redirect(
                success=False,
                error=error_description or error,
            ),
            status_code=status.HTTP_302_FOUND,
        )
    
    try:
        # Validate state token
        is_valid = await oauth_service.validate_state(state, provider)
        if not is_valid:
            raise OAuthStateError(provider)
        
        # Get the provider
        oauth_provider = oauth_service.get_provider(provider)
        
        # Build redirect URI (must match the one used in initiation)
        redirect_uri = _build_redirect_uri(request, provider)
        
        # Exchange code for tokens
        tokens = await oauth_provider.exchange_code(code, redirect_uri)
        
        # Get user info from provider
        user_info = await oauth_provider.get_user_info(tokens.access_token)
        
        # Create or link user account
        user, token_pair = await _create_or_link_user(user_info)
        
        # Calculate cookie max_age
        max_age = settings.JWT_EXPIRATION_HOURS * 3600
        
        # Create redirect response
        redirect_response = RedirectResponse(
            url=_build_frontend_redirect(success=True),
            status_code=status.HTTP_302_FOUND,
        )
        
        # Set HTTP-only cookie for web clients
        redirect_response.set_cookie(
            key="access_token",
            value=token_pair.access_token,
            httponly=True,
            secure=settings.is_production,
            samesite="lax",
            max_age=max_age,
            path="/",
        )
        
        # Also set refresh token in cookie
        redirect_response.set_cookie(
            key="refresh_token",
            value=token_pair.refresh_token,
            httponly=True,
            secure=settings.is_production,
            samesite="lax",
            max_age=30 * 24 * 3600,  # 30 days
            path="/",
        )
        
        return redirect_response
        
    except OAuthStateError as e:
        return RedirectResponse(
            url=_build_frontend_redirect(
                success=False,
                error="Invalid or expired state token. Please try again.",
            ),
            status_code=status.HTTP_302_FOUND,
        )
        
    except OAuthProviderNotFoundError as e:
        return RedirectResponse(
            url=_build_frontend_redirect(
                success=False,
                error=f"Unknown OAuth provider: {provider}",
            ),
            status_code=status.HTTP_302_FOUND,
        )
        
    except OAuthTokenExchangeError as e:
        return RedirectResponse(
            url=_build_frontend_redirect(
                success=False,
                error="Failed to complete authentication. Please try again.",
            ),
            status_code=status.HTTP_302_FOUND,
        )
        
    except OAuthUserInfoError as e:
        return RedirectResponse(
            url=_build_frontend_redirect(
                success=False,
                error="Failed to retrieve user information. Please try again.",
            ),
            status_code=status.HTTP_302_FOUND,
        )
        
    except StreamerStudioError as e:
        return RedirectResponse(
            url=_build_frontend_redirect(
                success=False,
                error=e.message,
            ),
            status_code=status.HTTP_302_FOUND,
        )
        
    except Exception as e:
        # Log unexpected errors (but not tokens/secrets)
        # TODO: Add proper logging
        return RedirectResponse(
            url=_build_frontend_redirect(
                success=False,
                error="An unexpected error occurred. Please try again.",
            ),
            status_code=status.HTTP_302_FOUND,
        )


async def _create_or_link_user(user_info: OAuthUserInfo) -> tuple[User, TokenPair]:
    """
    Create a new user or link OAuth to existing account.
    
    If a user with the same email exists, returns that user.
    Otherwise, creates a new user with the OAuth provider info.
    
    Args:
        user_info: User information from OAuth provider
        
    Returns:
        Tuple of (User, TokenPair)
    """
    auth_service = get_auth_service()
    settings = get_settings()
    
    # Check if user with this email already exists
    existing_user = await auth_service.get_user_by_email(user_info.email)
    
    if existing_user:
        # User exists - create tokens for existing user
        # TODO: Link OAuth provider to user account in database
        user = existing_user
    else:
        # Create new user
        # Generate a random password since OAuth users don't need one
        import secrets
        random_password = secrets.token_urlsafe(32) + "Aa1!"  # Ensure password meets requirements
        
        user = await auth_service.signup(
            email=user_info.email,
            password=random_password,
            display_name=user_info.display_name,
        )
        
        # TODO: Store OAuth provider info in database
        # TODO: Update avatar_url if provided
    
    # Create JWT tokens
    from backend.services.jwt_service import JWTService
    
    jwt_service = JWTService(
        secret_key=settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    
    access_token = jwt_service.create_access_token(
        user_id=user.id,
        tier=user.subscription_tier,
        email=user.email,
    )
    
    refresh_token = jwt_service.create_refresh_token(user_id=user.id)
    
    expires_at = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    
    token_pair = TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
    )
    
    return user, token_pair


# =============================================================================
# Exports
# =============================================================================

__all__ = ["router"]
