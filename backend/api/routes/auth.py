"""
Authentication Route Handlers for Aurastream.

This module implements all authentication endpoints:
- POST /signup - Register a new user account
- POST /login - Authenticate and get tokens
- POST /logout - Log out and clear session
- POST /refresh - Refresh access token
- GET /me - Get current user profile

All endpoints follow REST conventions and return consistent error responses.

Security Features:
- Rate limiting on login (5 attempts per email per 15 minutes)
- Rate limiting on signup (10 attempts per IP per hour)
- Audit logging for all auth events
- CSRF protection for state-changing requests
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from backend.api.config import get_settings
from backend.api.middleware.auth import (
    get_current_user,
    generate_csrf_token,
    set_csrf_cookie,
    clear_csrf_cookie,
)
from backend.services.rate_limit import (
    check_login_rate_limit,
    check_signup_rate_limit,
    reset_login_rate_limit,
    get_client_ip,
)
from backend.api.schemas.auth import (
    SignupRequest,
    SignupResponse,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    RefreshResponse,
    LogoutResponse,
    UserResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
    ProfileUpdate,
    PasswordChange,
    AccountDelete,
    MessageResponse,
)
from backend.api.service_dependencies import (
    AuthServiceDep,
    AuditServiceDep,
    AuthTokenServiceDep,
)
from backend.services.auth_service import User
from backend.services.jwt_service import TokenPayload
from backend.services.exceptions import (
    InvalidCredentialsError,
    EmailExistsError,
    WeakPasswordError,
    TokenExpiredError,
    TokenInvalidError,
    UserNotFoundError,
)


router = APIRouter()


def _get_user_agent(request: Request) -> str:
    """Extract user agent from request headers."""
    return request.headers.get("User-Agent", "unknown")


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
        terms_accepted_at=user.terms_accepted_at,
        terms_version=user.terms_version,
        privacy_accepted_at=user.privacy_accepted_at,
        privacy_version=user.privacy_version,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


# =============================================================================
# POST /signup - Register a new user account
# =============================================================================

@router.post(
    "/signup",
    response_model=SignupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
    description="""
    Create a new user account with email and password.
    
    **Rate Limiting:**
    - 10 signup attempts per IP per hour
    
    **Validation Requirements:**
    - Email: Must be a valid email format
    - Password: 8-128 characters, must include uppercase, lowercase, and number
    - Display Name: 1-50 characters, letters, numbers, spaces, underscores, hyphens
    
    **Error Responses:**
    - 409: Email already registered
    - 422: Validation failed (weak password, invalid email, etc.)
    - 429: Rate limit exceeded
    """,
    responses={
        201: {"description": "Account created successfully"},
        409: {"description": "Email already exists"},
        422: {"description": "Validation error"},
        429: {"description": "Rate limit exceeded"},
    },
)
async def signup(
    request: Request,
    data: SignupRequest,
    auth_service: AuthServiceDep,
    audit_service: AuditServiceDep,
) -> SignupResponse:
    """
    Register a new user account.
    
    Creates a new user with the provided email, password, and display name.
    The password is hashed before storage and never logged.
    
    Args:
        request: FastAPI request object
        data: SignupRequest with email, password, and display_name
        auth_service: Injected AuthService
        audit_service: Injected AuditService
        
    Returns:
        SignupResponse: Created user data with success message
        
    Raises:
        HTTPException: 409 if email already exists
        HTTPException: 422 if password doesn't meet requirements
        HTTPException: 429 if rate limit exceeded
    """
    ip_address = get_client_ip(request)
    user_agent = _get_user_agent(request)
    
    # Check rate limit
    await check_signup_rate_limit(request)
    
    try:
        user = await auth_service.signup(
            email=data.email,
            password=data.password,
            display_name=data.display_name,
            accept_terms=data.accept_terms,
            terms_version=data.terms_version,
            privacy_version=data.privacy_version,
        )
        
        # Log successful signup
        audit_service.log_signup_success(
            user_id=user.id,
            email=data.email,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        
        return SignupResponse(
            user=_user_to_response(user),
            message="Account created successfully. Please check your email to verify your account.",
        )
        
    except EmailExistsError as e:
        # Log failed signup
        audit_service.log_signup_failed(
            email=data.email,
            ip_address=ip_address,
            user_agent=user_agent,
            reason="Email already exists",
        )
        raise HTTPException(
            status_code=e.status_code,
            detail=e.to_dict(),
        )
    except WeakPasswordError as e:
        # Log failed signup
        audit_service.log_signup_failed(
            email=data.email,
            ip_address=ip_address,
            user_agent=user_agent,
            reason="Weak password",
        )
        raise HTTPException(
            status_code=e.status_code,
            detail=e.to_dict(),
        )


# =============================================================================
# POST /login - Authenticate and get tokens
# =============================================================================

@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Authenticate user and get tokens",
    description="""
    Authenticate with email and password to receive access and refresh tokens.
    
    **Rate Limiting:**
    - 5 login attempts per email per 15 minutes
    
    **Token Delivery:**
    - Tokens are returned in the response body for mobile/API clients
    - An HTTP-only cookie is also set for web clients (SameSite=Lax, Secure in production)
    - CSRF token is set in HTTP-only cookie for web clients
    
    **Remember Me:**
    - If `remember_me` is true, token expiration is extended to 7 days
    - Default expiration is 24 hours
    
    **Error Responses:**
    - 401: Invalid email or password
    - 429: Rate limit exceeded
    """,
    responses={
        200: {"description": "Authentication successful"},
        401: {"description": "Invalid credentials"},
        429: {"description": "Rate limit exceeded"},
    },
)
async def login(
    request: Request,
    response: Response,
    data: LoginRequest,
    auth_service: AuthServiceDep,
    audit_service: AuditServiceDep,
) -> LoginResponse:
    """
    Authenticate user and return tokens.
    
    Validates credentials and returns JWT access and refresh tokens.
    Also sets an HTTP-only cookie for web client authentication.
    
    Args:
        request: FastAPI request object
        response: FastAPI response object for setting cookies
        data: LoginRequest with email, password, and optional remember_me
        auth_service: Injected AuthService
        audit_service: Injected AuditService
        
    Returns:
        LoginResponse: Access token, refresh token, expiration, user data, and CSRF token
        
    Raises:
        HTTPException: 401 if credentials are invalid
        HTTPException: 429 if rate limit exceeded
    """
    settings = get_settings()
    
    ip_address = get_client_ip(request)
    user_agent = _get_user_agent(request)
    
    # Check rate limit
    await check_login_rate_limit(request, data.email)
    
    try:
        token_pair, user = await auth_service.login(
            email=data.email,
            password=data.password,
            remember_me=data.remember_me,
        )
        
        # Reset rate limit on successful login
        reset_login_rate_limit(data.email)
        
        # Log successful login
        audit_service.log_login_success(
            user_id=user.id,
            email=data.email,
            ip_address=ip_address,
            user_agent=user_agent,
            remember_me=data.remember_me,
        )
        
        # Calculate cookie max_age based on remember_me
        if data.remember_me:
            max_age = 7 * 24 * 3600  # 7 days in seconds
        else:
            max_age = settings.JWT_EXPIRATION_HOURS * 3600
        
        # Set HTTP-only cookie for web clients
        response.set_cookie(
            key="access_token",
            value=token_pair.access_token,
            httponly=True,
            secure=settings.is_production,
            samesite="lax",
            max_age=max_age,
            path="/",
        )
        
        # Generate and set CSRF token
        csrf_token = generate_csrf_token()
        set_csrf_cookie(response, csrf_token)
        
        return LoginResponse(
            access_token=token_pair.access_token,
            refresh_token=token_pair.refresh_token,
            token_type="bearer",
            expires_at=token_pair.expires_at,
            user=_user_to_response(user),
            csrf_token=csrf_token,
        )
        
    except InvalidCredentialsError as e:
        # Log failed login
        audit_service.log_login_failed(
            email=data.email,
            ip_address=ip_address,
            user_agent=user_agent,
            reason="Invalid credentials",
        )
        raise HTTPException(
            status_code=e.status_code,
            detail=e.to_dict(),
        )


# =============================================================================
# POST /logout - Log out and clear session
# =============================================================================

@router.post(
    "/logout",
    response_model=LogoutResponse,
    summary="Log out current user",
    description="""
    Log out the current authenticated user.
    
    **Actions:**
    - Clears the HTTP-only access_token cookie
    - Clears the CSRF token cookie
    - In the future, will invalidate the token server-side
    
    **Note:** Requires authentication via Bearer token or cookie.
    """,
    responses={
        200: {"description": "Successfully logged out"},
        401: {"description": "Authentication required"},
    },
)
async def logout(
    request: Request,
    response: Response,
    current_user: TokenPayload = Depends(get_current_user),
    auth_service: AuthServiceDep = None,
    audit_service: AuditServiceDep = None,
) -> LogoutResponse:
    """
    Log out current user.
    
    Clears the access token cookie and invalidates the session.
    
    Args:
        request: FastAPI request object
        response: FastAPI response object for clearing cookies
        current_user: Authenticated user's token payload
        auth_service: Injected AuthService
        audit_service: Injected AuditService
        
    Returns:
        LogoutResponse: Success message
    """
    ip_address = get_client_ip(request)
    user_agent = _get_user_agent(request)
    
    # Invalidate token server-side (currently a no-op, will use Redis blacklist)
    await auth_service.logout(
        user_id=current_user.sub,
        token_jti=current_user.jti,
    )
    
    # Log logout event
    audit_service.log_logout(
        user_id=current_user.sub,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    
    # Clear the HTTP-only cookie
    response.delete_cookie(
        key="access_token",
        path="/",
    )
    
    # Clear CSRF token cookie
    clear_csrf_cookie(response)
    
    return LogoutResponse(message="Successfully logged out")


# =============================================================================
# POST /refresh - Refresh access token
# =============================================================================

@router.post(
    "/refresh",
    response_model=RefreshResponse,
    summary="Refresh access token",
    description="""
    Get new access and refresh tokens using a valid refresh token.
    
    **Token Rotation:**
    - A NEW refresh token is issued with each refresh (token rotation)
    - The old refresh token is invalidated
    - This provides protection against token theft
    
    **Reuse Detection:**
    - If a refresh token is used more than once, it indicates potential theft
    - ALL user sessions will be invalidated for security
    - User must log in again
    
    **Error Responses:**
    - 401: Refresh token is invalid, expired, or reused
    """,
    responses={
        200: {"description": "Token refreshed successfully"},
        401: {"description": "Invalid, expired, or reused refresh token"},
    },
)
async def refresh_token(
    request: Request,
    data: RefreshRequest,
    auth_service: AuthServiceDep,
    audit_service: AuditServiceDep,
) -> RefreshResponse:
    """
    Refresh access token using refresh token.
    
    Validates the refresh token and issues new access and refresh tokens.
    Implements token rotation with reuse detection for security.
    
    Args:
        request: FastAPI request object
        data: RefreshRequest with refresh_token
        auth_service: Injected AuthService
        audit_service: Injected AuditService
        
    Returns:
        RefreshResponse: New access token, new refresh token, and expiration
        
    Raises:
        HTTPException: 401 if refresh token is invalid, expired, or reused
    """
    ip_address = get_client_ip(request)
    user_agent = _get_user_agent(request)
    
    try:
        token_pair = await auth_service.refresh_token(
            refresh_token=data.refresh_token,
        )
        
        # Log successful token refresh
        from backend.services.audit_service import AuditEventType
        audit_service.log_event(
            event_type=AuditEventType.TOKEN_REFRESH,
            ip_address=ip_address,
            user_agent=user_agent,
            success=True,
        )
        
        return RefreshResponse(
            access_token=token_pair.access_token,
            refresh_token=token_pair.refresh_token,
            token_type="bearer",
            expires_at=token_pair.expires_at,
        )
        
    except TokenExpiredError as e:
        # Log failed token refresh
        audit_service.log_token_refresh_failed(
            ip_address=ip_address,
            user_agent=user_agent,
            reason="Token expired",
        )
        raise HTTPException(
            status_code=e.status_code,
            detail=e.to_dict(),
        )
    except TokenInvalidError as e:
        # Log failed token refresh (includes reuse detection)
        audit_service.log_token_refresh_failed(
            ip_address=ip_address,
            user_agent=user_agent,
            reason=e.message,
        )
        raise HTTPException(
            status_code=e.status_code,
            detail=e.to_dict(),
        )
    except UserNotFoundError as e:
        # Log failed token refresh
        audit_service.log_token_refresh_failed(
            ip_address=ip_address,
            user_agent=user_agent,
            reason="User not found",
        )
        # User was deleted after token was issued
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "message": "User account no longer exists",
                    "code": "AUTH_USER_NOT_FOUND",
                }
            },
        )


# =============================================================================
# GET /me - Get current user profile
# =============================================================================

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
    description="""
    Get the profile of the currently authenticated user.
    
    **Returns:**
    - User ID, email, display name
    - Subscription tier and status
    - Asset generation usage for current month
    - Account timestamps
    
    **Note:** Sensitive fields like password hash are never returned.
    """,
    responses={
        200: {"description": "User profile retrieved successfully"},
        401: {"description": "Authentication required"},
    },
)
async def get_me(
    current_user: TokenPayload = Depends(get_current_user),
    auth_service: AuthServiceDep = None,
) -> UserResponse:
    """
    Get current authenticated user's profile.
    
    Fetches the full user profile from the database using the
    user ID from the JWT token.
    
    Args:
        current_user: Authenticated user's token payload
        auth_service: Injected AuthService
        
    Returns:
        UserResponse: Full user profile (excluding sensitive fields)
        
    Raises:
        HTTPException: 401 if not authenticated
        HTTPException: 404 if user no longer exists
    """
    try:
        user = await auth_service.get_user(user_id=current_user.sub)
        return _user_to_response(user)
        
    except UserNotFoundError:
        # User was deleted after token was issued
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "message": "User account not found",
                    "code": "RESOURCE_NOT_FOUND",
                    "details": {"resource_type": "user"},
                }
            },
        )


# =============================================================================
# POST /password-reset/request - Request password reset
# =============================================================================

@router.post(
    "/password-reset/request",
    response_model=MessageResponse,
    summary="Request password reset",
    description="""
    Request a password reset email.
    
    **Security:**
    - Always returns 200 OK regardless of whether the email exists
    - This prevents email enumeration attacks
    - If the email exists, a reset token is generated and would be sent via email
    
    **Token Expiration:**
    - Password reset tokens expire in 1 hour
    """,
    responses={
        200: {"description": "Password reset request processed"},
    },
)
async def request_password_reset(
    request: Request,
    data: PasswordResetRequest,
    auth_service: AuthServiceDep,
    auth_token_service: AuthTokenServiceDep,
    audit_service: AuditServiceDep,
) -> MessageResponse:
    """
    Request a password reset.
    
    Always returns success to prevent email enumeration.
    If the email exists, generates a reset token.
    
    Args:
        request: FastAPI request object
        data: PasswordResetRequest with email
        auth_service: Injected AuthService
        auth_token_service: Injected AuthTokenService
        audit_service: Injected AuditService
        
    Returns:
        MessageResponse: Success message (always)
    """
    ip_address = get_client_ip(request)
    user_agent = _get_user_agent(request)
    
    # Try to find user by email
    user = await auth_service.get_user_by_email(data.email)
    
    if user:
        # Generate password reset token
        token = await auth_token_service.create_password_reset_token(user.id)
        
        # In production, send email with token here
        # For now, just log the event
        audit_service.log_event(
            event_type="PASSWORD_RESET_REQUESTED",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=True,
        )
    
    # Always return success to prevent email enumeration
    return MessageResponse(
        message="If an account with that email exists, a password reset link has been sent."
    )


# =============================================================================
# POST /password-reset/confirm - Confirm password reset
# =============================================================================

@router.post(
    "/password-reset/confirm",
    response_model=MessageResponse,
    summary="Confirm password reset",
    description="""
    Reset password using a valid reset token.
    
    **Requirements:**
    - Valid, non-expired reset token
    - New password meeting strength requirements (8-128 characters)
    
    **Error Responses:**
    - 400: Invalid or expired token
    - 422: Password doesn't meet requirements
    """,
    responses={
        200: {"description": "Password reset successful"},
        400: {"description": "Invalid or expired token"},
        422: {"description": "Password validation failed"},
    },
)
async def confirm_password_reset(
    request: Request,
    data: PasswordResetConfirm,
    auth_service: AuthServiceDep,
    auth_token_service: AuthTokenServiceDep,
    audit_service: AuditServiceDep,
) -> MessageResponse:
    """
    Confirm password reset with token.
    
    Validates the token and updates the user's password.
    
    Args:
        request: FastAPI request object
        data: PasswordResetConfirm with token and new_password
        auth_service: Injected AuthService
        auth_token_service: Injected AuthTokenService
        audit_service: Injected AuditService
        
    Returns:
        MessageResponse: Success message
        
    Raises:
        HTTPException: 400 if token is invalid or expired
        HTTPException: 422 if password doesn't meet requirements
    """
    ip_address = get_client_ip(request)
    user_agent = _get_user_agent(request)
    
    # Validate token
    user_id = await auth_token_service.validate_password_reset_token(data.token)
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "message": "Invalid or expired password reset token",
                    "code": "AUTH_TOKEN_INVALID",
                }
            },
        )
    
    try:
        # Update password
        await auth_service.update_password(user_id, data.new_password)
        
        # Mark token as used
        await auth_token_service.mark_token_used(data.token)
        
        # Log successful password reset
        audit_service.log_event(
            event_type="PASSWORD_RESET_COMPLETED",
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=True,
        )
        
        return MessageResponse(message="Password has been reset successfully.")
        
    except WeakPasswordError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.to_dict(),
        )


# =============================================================================
# POST /email/verify/request - Request email verification
# =============================================================================

@router.post(
    "/email/verify/request",
    response_model=MessageResponse,
    summary="Request email verification",
    description="""
    Request a new email verification link.
    
    **Requirements:**
    - User must be authenticated
    - Generates a new verification token
    
    **Token Expiration:**
    - Email verification tokens expire in 24 hours
    """,
    responses={
        200: {"description": "Verification email sent"},
        401: {"description": "Authentication required"},
    },
)
async def request_email_verification(
    request: Request,
    current_user: TokenPayload = Depends(get_current_user),
    auth_token_service: AuthTokenServiceDep = None,
    audit_service: AuditServiceDep = None,
) -> MessageResponse:
    """
    Request email verification.
    
    Generates a new email verification token for the current user.
    
    Args:
        request: FastAPI request object
        current_user: Authenticated user's token payload
        auth_token_service: Injected AuthTokenService
        audit_service: Injected AuditService
        
    Returns:
        MessageResponse: Success message
    """
    ip_address = get_client_ip(request)
    user_agent = _get_user_agent(request)
    
    # Generate email verification token
    token = await auth_token_service.create_email_verification_token(current_user.sub)
    
    # In production, send email with token here
    # For now, just log the event
    audit_service.log_event(
        event_type="EMAIL_VERIFICATION_REQUESTED",
        user_id=current_user.sub,
        ip_address=ip_address,
        user_agent=user_agent,
        success=True,
    )
    
    return MessageResponse(message="Verification email has been sent.")


# =============================================================================
# GET /email/verify/{token} - Verify email with token
# =============================================================================

@router.get(
    "/email/verify/{token}",
    response_model=MessageResponse,
    summary="Verify email with token",
    description="""
    Verify email address using a verification token.
    
    **Requirements:**
    - Valid, non-expired verification token
    
    **Error Responses:**
    - 400: Invalid or expired token
    """,
    responses={
        200: {"description": "Email verified successfully"},
        400: {"description": "Invalid or expired token"},
    },
)
async def verify_email(
    request: Request,
    token: str,
    auth_service: AuthServiceDep,
    auth_token_service: AuthTokenServiceDep,
    audit_service: AuditServiceDep,
) -> MessageResponse:
    """
    Verify email with token.
    
    Validates the token and marks the user's email as verified.
    
    Args:
        request: FastAPI request object
        token: Email verification token from URL
        auth_service: Injected AuthService
        auth_token_service: Injected AuthTokenService
        audit_service: Injected AuditService
        
    Returns:
        MessageResponse: Success message
        
    Raises:
        HTTPException: 400 if token is invalid or expired
    """
    ip_address = get_client_ip(request)
    user_agent = _get_user_agent(request)
    
    # Validate token
    user_id = await auth_token_service.validate_email_verification_token(token)
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "message": "Invalid or expired email verification token",
                    "code": "AUTH_TOKEN_INVALID",
                }
            },
        )
    
    try:
        # Mark email as verified
        await auth_service.verify_email(user_id)
        
        # Mark token as used
        await auth_token_service.mark_token_used(token)
        
        # Log successful email verification
        audit_service.log_event(
            event_type="EMAIL_VERIFIED",
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=True,
        )
        
        return MessageResponse(message="Email has been verified successfully.")
        
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "message": "User account not found",
                    "code": "RESOURCE_NOT_FOUND",
                }
            },
        )


# =============================================================================
# PUT /me - Update profile
# =============================================================================

@router.put(
    "/me",
    response_model=UserResponse,
    summary="Update user profile",
    description="""
    Update the current user's profile.
    
    **Updatable Fields:**
    - display_name: New display name (1-50 characters)
    - avatar_url: URL to new avatar image
    
    **Note:** At least one field must be provided.
    """,
    responses={
        200: {"description": "Profile updated successfully"},
        401: {"description": "Authentication required"},
        422: {"description": "Validation error"},
    },
)
async def update_profile(
    request: Request,
    data: ProfileUpdate,
    current_user: TokenPayload = Depends(get_current_user),
    auth_service: AuthServiceDep = None,
    audit_service: AuditServiceDep = None,
) -> UserResponse:
    """
    Update current user's profile.
    
    Args:
        request: FastAPI request object
        data: ProfileUpdate with optional display_name and avatar_url
        current_user: Authenticated user's token payload
        auth_service: Injected AuthService
        audit_service: Injected AuditService
        
    Returns:
        UserResponse: Updated user profile
        
    Raises:
        HTTPException: 401 if not authenticated
        HTTPException: 422 if validation fails
    """
    ip_address = get_client_ip(request)
    user_agent = _get_user_agent(request)
    
    try:
        user = await auth_service.update_profile(
            user_id=current_user.sub,
            display_name=data.display_name,
            avatar_url=data.avatar_url,
        )
        
        # Log profile update
        audit_service.log_event(
            event_type="PROFILE_UPDATED",
            user_id=current_user.sub,
            ip_address=ip_address,
            user_agent=user_agent,
            success=True,
        )
        
        return _user_to_response(user)
        
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "message": "User account not found",
                    "code": "RESOURCE_NOT_FOUND",
                    "details": {"resource_type": "user"},
                }
            },
        )


# =============================================================================
# POST /me/password - Change password
# =============================================================================

@router.post(
    "/me/password",
    response_model=MessageResponse,
    summary="Change password",
    description="""
    Change the current user's password.
    
    **Requirements:**
    - Current password must be correct
    - New password must meet strength requirements (8-128 characters)
    
    **Error Responses:**
    - 401: Current password is incorrect
    - 422: New password doesn't meet requirements
    """,
    responses={
        200: {"description": "Password changed successfully"},
        401: {"description": "Current password incorrect or not authenticated"},
        422: {"description": "Password validation failed"},
    },
)
async def change_password(
    request: Request,
    data: PasswordChange,
    current_user: TokenPayload = Depends(get_current_user),
    auth_service: AuthServiceDep = None,
    audit_service: AuditServiceDep = None,
) -> MessageResponse:
    """
    Change current user's password.
    
    Args:
        request: FastAPI request object
        data: PasswordChange with current_password and new_password
        current_user: Authenticated user's token payload
        auth_service: Injected AuthService
        audit_service: Injected AuditService
        
    Returns:
        MessageResponse: Success message
        
    Raises:
        HTTPException: 401 if current password is incorrect
        HTTPException: 422 if new password doesn't meet requirements
    """
    ip_address = get_client_ip(request)
    user_agent = _get_user_agent(request)
    
    try:
        # Verify current password
        is_valid = await auth_service.verify_password(current_user.sub, data.current_password)
        
        if not is_valid:
            audit_service.log_event(
                event_type="PASSWORD_CHANGE_FAILED",
                user_id=current_user.sub,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                details={"reason": "Invalid current password"},
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "message": "Current password is incorrect",
                        "code": "AUTH_INVALID_CREDENTIALS",
                    }
                },
            )
        
        # Update password
        await auth_service.update_password(current_user.sub, data.new_password)
        
        # Log successful password change
        audit_service.log_event(
            event_type="PASSWORD_CHANGED",
            user_id=current_user.sub,
            ip_address=ip_address,
            user_agent=user_agent,
            success=True,
        )
        
        return MessageResponse(message="Password has been changed successfully.")
        
    except WeakPasswordError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.to_dict(),
        )
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "message": "User account not found",
                    "code": "RESOURCE_NOT_FOUND",
                }
            },
        )


# =============================================================================
# DELETE /me - Delete account
# =============================================================================

@router.delete(
    "/me",
    response_model=MessageResponse,
    summary="Delete account",
    description="""
    Permanently delete the current user's account.
    
    **Requirements:**
    - Password must be correct
    - Confirmation must be exactly "DELETE"
    
    **Warning:** This action is irreversible. All user data will be permanently deleted.
    
    **Error Responses:**
    - 401: Password is incorrect
    - 422: Confirmation is not "DELETE"
    """,
    responses={
        200: {"description": "Account deleted successfully"},
        401: {"description": "Password incorrect or not authenticated"},
        422: {"description": "Validation error"},
    },
)
async def delete_account(
    request: Request,
    response: Response,
    data: AccountDelete,
    current_user: TokenPayload = Depends(get_current_user),
    auth_service: AuthServiceDep = None,
    audit_service: AuditServiceDep = None,
) -> MessageResponse:
    """
    Delete current user's account.
    
    Args:
        request: FastAPI request object
        response: FastAPI response object for clearing cookies
        data: AccountDelete with password and confirmation
        current_user: Authenticated user's token payload
        auth_service: Injected AuthService
        audit_service: Injected AuditService
        
    Returns:
        MessageResponse: Success message
        
    Raises:
        HTTPException: 401 if password is incorrect
        HTTPException: 422 if confirmation is not "DELETE"
    """
    ip_address = get_client_ip(request)
    user_agent = _get_user_agent(request)
    
    try:
        # Verify password
        is_valid = await auth_service.verify_password(current_user.sub, data.password)
        
        if not is_valid:
            audit_service.log_event(
                event_type="ACCOUNT_DELETE_FAILED",
                user_id=current_user.sub,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                details={"reason": "Invalid password"},
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "message": "Password is incorrect",
                        "code": "AUTH_INVALID_CREDENTIALS",
                    }
                },
            )
        
        # Delete account
        await auth_service.delete_account(current_user.sub)
        
        # Log account deletion
        audit_service.log_event(
            event_type="ACCOUNT_DELETED",
            user_id=current_user.sub,
            ip_address=ip_address,
            user_agent=user_agent,
            success=True,
        )
        
        # Clear cookies
        response.delete_cookie(key="access_token", path="/")
        clear_csrf_cookie(response)
        
        return MessageResponse(message="Account has been permanently deleted.")
        
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "message": "User account not found",
                    "code": "RESOURCE_NOT_FOUND",
                }
            },
        )


__all__ = ["router"]
