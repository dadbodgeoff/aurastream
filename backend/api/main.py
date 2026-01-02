"""
Aurastream Backend - FastAPI Application Factory

This module provides the application factory pattern for creating and configuring
the FastAPI application instance with all middleware, exception handlers, and routes.
"""

import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from typing import Any, Callable

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.gzip import GZipMiddleware

from api.config import get_settings
from api.middleware.security_headers import SecurityHeadersMiddleware
from api.middleware.api_rate_limit import APIRateLimitMiddleware

# =============================================================================
# Constants
# =============================================================================

APP_VERSION = "0.1.0"
APP_TITLE = "Aurastream API"
APP_DESCRIPTION = """
Aurastream Backend API - AI-powered asset generation for content creators.

## Features
- 🔐 Authentication & Authorization
- 🎨 Brand Kit Management
- 🖼️ AI Asset Generation
- 📊 Viral Score Analysis
- 💳 Subscription Management
"""


# =============================================================================
# Request ID Middleware
# =============================================================================

class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds a unique request ID to each request for tracing.
    
    The request ID is:
    - Generated as a UUID4 if not provided in the X-Request-ID header
    - Added to the request state for use in logging and error responses
    - Included in the response X-Request-ID header
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Any:
        """Process the request and add request ID."""
        # Get existing request ID from header or generate new one
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        
        # Store in request state for access in route handlers
        request.state.request_id = request_id
        
        # Process the request
        response = await call_next(request)
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response


# =============================================================================
# Exception Handlers
# =============================================================================

async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle uncaught exceptions with consistent error response format.
    
    Returns a JSON response with:
    - error: Error type name
    - message: Human-readable error message
    - request_id: Request ID for tracing
    - timestamp: ISO format timestamp
    
    In debug mode, includes additional details.
    """
    settings = get_settings()
    request_id = getattr(request.state, "request_id", "unknown")
    
    error_response = {
        "error": "InternalServerError",
        "message": "An unexpected error occurred. Please try again later.",
        "request_id": request_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    
    # Include details in debug mode only
    if settings.DEBUG:
        error_response["detail"] = str(exc)
        error_response["type"] = type(exc).__name__
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response,
    )


async def http_exception_handler(request: Request, exc: Any) -> JSONResponse:
    """
    Handle HTTP exceptions with consistent error response format.
    
    Provides structured error responses for all HTTP exceptions raised
    by FastAPI or application code.
    """
    from fastapi.exceptions import HTTPException
    
    request_id = getattr(request.state, "request_id", "unknown")
    
    error_response = {
        "error": exc.__class__.__name__,
        "message": exc.detail if hasattr(exc, "detail") else str(exc),
        "request_id": request_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    
    return JSONResponse(
        status_code=exc.status_code if hasattr(exc, "status_code") else 500,
        content=error_response,
    )


async def validation_exception_handler(request: Request, exc: Any) -> JSONResponse:
    """
    Handle request validation errors with detailed field information.
    
    Provides structured error responses for Pydantic validation errors,
    including field-level error details.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    
    # Extract validation errors
    errors = []
    if hasattr(exc, "errors"):
        for error in exc.errors():
            errors.append({
                "field": ".".join(str(loc) for loc in error.get("loc", [])),
                "message": error.get("msg", "Validation error"),
                "type": error.get("type", "value_error"),
            })
    
    error_response = {
        "error": "ValidationError",
        "message": "Request validation failed",
        "request_id": request_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": errors,
    }
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response,
    )


# =============================================================================
# Lifespan Context Manager
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager for startup/shutdown events.
    
    Startup:
    - Initialize database connections
    - Set up Redis connection pool
    - Configure logging
    - Start background workers (clip radar, playbook, analytics, etc.)
    
    Shutdown:
    - Stop background workers
    - Close database connections
    - Clean up Redis connections
    - Flush any pending operations
    """
    import asyncio
    import logging
    
    settings = get_settings()
    logger = logging.getLogger("aurastream.lifespan")
    
    # Background task references
    background_tasks = []
    
    # Startup
    logger.info("Starting Aurastream API...")
    
    # =========================================================================
    # Start Clip Radar Background Worker (every 5 minutes)
    # =========================================================================
    try:
        from backend.workers.clip_radar_worker import run_poll
        from backend.services.clip_radar.constants import POLL_INTERVAL_MINUTES
        
        async def clip_radar_loop():
            """Background loop for clip radar polling."""
            poll_interval = POLL_INTERVAL_MINUTES * 60
            logger.info(f"Clip Radar worker started (polling every {POLL_INTERVAL_MINUTES} minutes)")
            
            try:
                await run_poll()
            except Exception as e:
                logger.error(f"Initial clip radar poll failed: {e}")
            
            while True:
                try:
                    await asyncio.sleep(poll_interval)
                    await run_poll()
                except asyncio.CancelledError:
                    logger.info("Clip Radar worker shutting down...")
                    break
                except Exception as e:
                    logger.error(f"Clip radar poll error: {e}")
                    await asyncio.sleep(30)
        
        clip_radar_task = asyncio.create_task(clip_radar_loop())
        background_tasks.append(clip_radar_task)
        logger.info("✓ Clip Radar background worker started")
        
    except Exception as e:
        logger.warning(f"✗ Failed to start Clip Radar worker: {e}")
    
    # =========================================================================
    # Start Playbook Background Worker (every 4 hours)
    # =========================================================================
    try:
        from backend.workers.playbook_worker import run_generation
        
        PLAYBOOK_INTERVAL = 4 * 60 * 60
        
        async def playbook_loop():
            """Background loop for playbook generation."""
            logger.info("Playbook worker started (generating every 4 hours)")
            
            try:
                result = await run_generation(force=False)
                if result.get("success"):
                    logger.info(f"Initial playbook generated: {result.get('headline', 'N/A')}")
                elif result.get("skipped"):
                    logger.info(f"Initial playbook skipped: {result.get('reason', 'N/A')}")
            except Exception as e:
                logger.error(f"Initial playbook generation failed: {e}")
            
            while True:
                try:
                    await asyncio.sleep(PLAYBOOK_INTERVAL)
                    result = await run_generation(force=False)
                    if result.get("success"):
                        logger.info(f"Playbook generated: {result.get('headline', 'N/A')}")
                except asyncio.CancelledError:
                    logger.info("Playbook worker shutting down...")
                    break
                except Exception as e:
                    logger.error(f"Playbook generation error: {e}")
                    await asyncio.sleep(300)
        
        playbook_task = asyncio.create_task(playbook_loop())
        background_tasks.append(playbook_task)
        logger.info("✓ Playbook background worker started")
        
    except Exception as e:
        logger.warning(f"✗ Failed to start Playbook worker: {e}")
    
    # =========================================================================
    # Start Analytics Flush Worker (every hour)
    # =========================================================================
    try:
        from backend.workers.analytics_flush_worker import run_flush
        
        ANALYTICS_FLUSH_INTERVAL = 60 * 60  # 1 hour
        
        async def analytics_flush_loop():
            """Background loop for analytics flushing."""
            logger.info("Analytics Flush worker started (flushing every hour)")
            
            while True:
                try:
                    await asyncio.sleep(ANALYTICS_FLUSH_INTERVAL)
                    # Run in thread pool since it's sync
                    loop = asyncio.get_event_loop()
                    result = await loop.run_in_executor(None, run_flush, False)
                    if result.get("events_flushed"):
                        logger.info(f"Analytics flushed: {result.get('events_flushed')} events")
                except asyncio.CancelledError:
                    logger.info("Analytics Flush worker shutting down...")
                    break
                except Exception as e:
                    logger.error(f"Analytics flush error: {e}")
                    await asyncio.sleep(300)
        
        analytics_task = asyncio.create_task(analytics_flush_loop())
        background_tasks.append(analytics_task)
        logger.info("✓ Analytics Flush background worker started")
        
    except Exception as e:
        logger.warning(f"✗ Failed to start Analytics Flush worker: {e}")
    
    # =========================================================================
    # Start Coach Cleanup Worker (every hour)
    # =========================================================================
    try:
        from backend.workers.coach_cleanup_worker import run_cleanup
        
        COACH_CLEANUP_INTERVAL = 60 * 60  # 1 hour
        
        async def coach_cleanup_loop():
            """Background loop for coach session cleanup."""
            logger.info("Coach Cleanup worker started (cleaning every hour)")
            
            while True:
                try:
                    await asyncio.sleep(COACH_CLEANUP_INTERVAL)
                    loop = asyncio.get_event_loop()
                    result = await loop.run_in_executor(None, run_cleanup, False, False)
                    if result.get("sessions_cleaned"):
                        logger.info(f"Coach sessions cleaned: {result.get('sessions_cleaned')}")
                except asyncio.CancelledError:
                    logger.info("Coach Cleanup worker shutting down...")
                    break
                except Exception as e:
                    logger.error(f"Coach cleanup error: {e}")
                    await asyncio.sleep(300)
        
        coach_cleanup_task = asyncio.create_task(coach_cleanup_loop())
        background_tasks.append(coach_cleanup_task)
        logger.info("✓ Coach Cleanup background worker started")
        
    except Exception as e:
        logger.warning(f"✗ Failed to start Coach Cleanup worker: {e}")
    
    # =========================================================================
    # Start Clip Radar Recap Worker (daily at 6am UTC)
    # =========================================================================
    try:
        from backend.workers.clip_radar_recap_worker import run_daily_recap
        
        async def clip_recap_loop():
            """Background loop for daily clip radar recaps."""
            logger.info("Clip Radar Recap worker started (daily at 6am UTC)")
            
            while True:
                try:
                    now = datetime.now(timezone.utc)
                    # Calculate next 6am UTC
                    next_run = now.replace(hour=6, minute=0, second=0, microsecond=0)
                    if now >= next_run:
                        next_run = next_run + timedelta(days=1)
                    
                    wait_seconds = (next_run - now).total_seconds()
                    logger.info(f"Clip Recap scheduled for {next_run.isoformat()} ({wait_seconds/3600:.1f}h)")
                    
                    await asyncio.sleep(wait_seconds)
                    await run_daily_recap()
                    
                    # Small delay to avoid double-runs
                    await asyncio.sleep(60)
                except asyncio.CancelledError:
                    logger.info("Clip Radar Recap worker shutting down...")
                    break
                except Exception as e:
                    logger.error(f"Clip recap error: {e}")
                    await asyncio.sleep(300)
        
        clip_recap_task = asyncio.create_task(clip_recap_loop())
        background_tasks.append(clip_recap_task)
        logger.info("✓ Clip Radar Recap background worker started")
        
    except Exception as e:
        logger.warning(f"✗ Failed to start Clip Radar Recap worker: {e}")
    
    # =========================================================================
    # Start Thumbnail Intel Worker (daily at 6am EST / 11am UTC)
    # =========================================================================
    try:
        from backend.services.thumbnail_intel import get_thumbnail_intel_service
        
        THUMBNAIL_SCHEDULE_HOUR_UTC = 11  # 6am EST
        
        async def thumbnail_intel_loop():
            """Background loop for daily thumbnail analysis."""
            logger.info("Thumbnail Intel worker started (daily at 6am EST / 11am UTC)")
            
            while True:
                try:
                    now = datetime.now(timezone.utc)
                    next_run = now.replace(hour=THUMBNAIL_SCHEDULE_HOUR_UTC, minute=0, second=0, microsecond=0)
                    if now >= next_run:
                        next_run = next_run + timedelta(days=1)
                    
                    wait_seconds = (next_run - now).total_seconds()
                    logger.info(f"Thumbnail Intel scheduled for {next_run.isoformat()} ({wait_seconds/3600:.1f}h)")
                    
                    await asyncio.sleep(wait_seconds)
                    
                    service = get_thumbnail_intel_service()
                    results = await service.run_daily_analysis()
                    logger.info(f"Thumbnail analysis complete: {len(results)} categories")
                    
                    await asyncio.sleep(60)
                except asyncio.CancelledError:
                    logger.info("Thumbnail Intel worker shutting down...")
                    break
                except Exception as e:
                    logger.error(f"Thumbnail intel error: {e}")
                    await asyncio.sleep(300)
        
        thumbnail_task = asyncio.create_task(thumbnail_intel_loop())
        background_tasks.append(thumbnail_task)
        logger.info("✓ Thumbnail Intel background worker started")
        
    except Exception as e:
        logger.warning(f"✗ Failed to start Thumbnail Intel worker: {e}")
    
    # =========================================================================
    # Start YouTube Trending Worker (every 30 minutes)
    # =========================================================================
    try:
        from backend.workers.youtube_worker import (
            fetch_all_trending,
            fetch_all_games,
            TRENDING_FETCH_INTERVAL,
            GAMES_FETCH_INTERVAL,
        )
        
        async def youtube_worker_loop():
            """Background loop for YouTube trending data fetching."""
            logger.info("YouTube worker started (trending every 30 min, games daily)")
            
            # Initial fetch
            try:
                logger.info("YouTube worker: Initial trending fetch...")
                await fetch_all_trending()
                logger.info("YouTube worker: Initial trending fetch complete")
            except Exception as e:
                logger.error(f"YouTube initial trending fetch failed: {e}")
            
            try:
                logger.info("YouTube worker: Initial games fetch...")
                await fetch_all_games()
                logger.info("YouTube worker: Initial games fetch complete")
            except Exception as e:
                logger.error(f"YouTube initial games fetch failed: {e}")
            
            # Track last fetch times
            last_trending = datetime.now()
            last_games = datetime.now()
            
            while True:
                try:
                    await asyncio.sleep(60)  # Check every minute
                    now = datetime.now()
                    
                    # Trending: every 30 minutes
                    if (now - last_trending).total_seconds() >= TRENDING_FETCH_INTERVAL:
                        await fetch_all_trending()
                        last_trending = now
                        logger.info("YouTube trending data refreshed")
                    
                    # Games: once daily (check if 24h passed)
                    if (now - last_games).total_seconds() >= GAMES_FETCH_INTERVAL:
                        await fetch_all_games()
                        last_games = now
                        logger.info("YouTube games data refreshed")
                        
                except asyncio.CancelledError:
                    logger.info("YouTube worker shutting down...")
                    break
                except Exception as e:
                    logger.error(f"YouTube worker error: {e}")
                    await asyncio.sleep(300)
        
        youtube_task = asyncio.create_task(youtube_worker_loop())
        background_tasks.append(youtube_task)
        logger.info("✓ YouTube Trending background worker started")
        
    except Exception as e:
        logger.warning(f"✗ Failed to start YouTube worker: {e}")
    
    logger.info(f"Aurastream API ready with {len(background_tasks)} background workers")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Aurastream API...")
    
    # Cancel all background tasks
    for task in background_tasks:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    
    logger.info("All background workers stopped")


# =============================================================================
# Application Factory
# =============================================================================

def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application instance.
    
    This factory function:
    1. Creates the FastAPI app with appropriate settings
    2. Configures CORS middleware
    3. Adds request ID middleware for tracing
    4. Sets up exception handlers for consistent error responses
    5. Registers health check endpoint
    6. Includes API routers (when implemented)
    
    Returns:
        FastAPI: Configured application instance
        
    Example:
        ```python
        from api.main import create_app
        
        app = create_app()
        # Run with: uvicorn api.main:app --reload
        ```
    """
    settings = get_settings()
    
    # Configure docs based on environment
    # Docs are only available in debug mode
    docs_url = "/api/docs" if settings.DEBUG else None
    redoc_url = "/api/redoc" if settings.DEBUG else None
    openapi_url = "/api/openapi.json" if settings.DEBUG else None
    
    # Create FastAPI application
    app = FastAPI(
        title=APP_TITLE,
        description=APP_DESCRIPTION,
        version=APP_VERSION,
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
        lifespan=lifespan,
    )
    
    # =========================================================================
    # Middleware Configuration
    # =========================================================================
    # Note: Middleware is executed in REVERSE order of addition.
    # First added = last to process request, first to process response.
    # Order below: RequestID -> CORS -> GZip -> SecurityHeaders
    
    # Request ID middleware (must be added first to ensure ID is available)
    app.add_middleware(RequestIDMiddleware)
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )
    
    # GZip compression for responses larger than 1000 bytes
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    # Global API rate limiting (tier-based)
    app.add_middleware(APIRateLimitMiddleware)
    
    # Security headers middleware (added last so headers are on final response)
    app.add_middleware(SecurityHeadersMiddleware)
    
    # =========================================================================
    # Exception Handlers
    # =========================================================================
    
    from fastapi.exceptions import HTTPException, RequestValidationError
    
    app.add_exception_handler(Exception, generic_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    
    # =========================================================================
    # Health Check Endpoint
    # =========================================================================
    
    @app.get(
        "/health",
        tags=["Health"],
        summary="Health Check",
        description="Returns the health status of the API service including Redis connectivity.",
        response_description="Health status with version, environment, and service health info",
    )
    async def health_check() -> dict:
        """
        Health check endpoint for monitoring and load balancer probes.
        
        Returns:
            dict: Health status including:
                - status: "healthy" if all services operational, "degraded" if Redis down
                - version: Current API version
                - timestamp: Current UTC timestamp in ISO format
                - environment: Current deployment environment
                - services: Health status of dependent services (Redis)
        """
        from backend.database.redis_client import get_resilient_redis_client
        
        # Check Redis health
        redis_client = get_resilient_redis_client()
        redis_health = await redis_client.health_check()
        
        # Determine overall status
        overall_status = "healthy" if redis_health.is_healthy else "degraded"
        
        return {
            "status": overall_status,
            "version": APP_VERSION,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "environment": settings.APP_ENV,
            "services": {
                "redis": {
                    "status": "healthy" if redis_health.is_healthy else "unhealthy",
                    "latency_ms": redis_health.latency_ms,
                    "circuit_state": redis_health.circuit_state.value,
                    "error": redis_health.error,
                }
            }
        }
    
    # =========================================================================
    # API Routers
    # =========================================================================
    
    from api.routes.auth import router as auth_router
    from api.routes.oauth import router as oauth_router
    from api.routes.brand_kits import router as brand_kits_router
    from api.routes.generation import router as generation_router
    from api.routes.assets import router as assets_router
    from api.routes.logos import router as logos_router
    from api.routes.logo_generation import router as logo_generation_router
    from api.routes.streamer_assets import router as streamer_assets_router
    from api.routes.coach import router as coach_router
    from api.routes.twitch import router as twitch_router
    from api.routes.analytics import router as analytics_router
    from api.routes.subscriptions import router as subscriptions_router
    from api.routes.webhooks import router as webhooks_router
    from api.routes.usage import router as usage_router
    from api.routes.site_analytics import router as site_analytics_router
    from api.routes.avatars import router as avatars_router
    from api.routes.enterprise_analytics import router as enterprise_analytics_router
    from api.routes.community import router as community_router
    from api.routes.community_engagement import router as community_engagement_router
    from api.routes.community_admin import router as community_admin_router
    from api.routes.vibe_branding import router as vibe_branding_router
    from api.routes.aura_lab import router as aura_lab_router
    from api.routes.promo import router as promo_router
    from api.routes.profile_creator import router as profile_creator_router
    from api.routes.templates import router as templates_router
    from api.routes.friends import router as friends_router
    from api.routes.messages import router as messages_router
    from api.routes.simple_analytics import router as simple_analytics_router
    from api.routes.trends import router as trends_router
    from api.routes.playbook import router as playbook_router
    from api.routes.thumbnail_intel import router as thumbnail_intel_router
    from api.routes.thumbnail_recreate import router as thumbnail_recreate_router
    from api.routes.clip_radar import router as clip_radar_router
    from api.routes.intel import router as intel_router
    from api.routes.creator_media import router as creator_media_router
    from backend.services.intel.api.routes import router as intel_v2_router
    
    app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
    app.include_router(oauth_router, prefix="/api/v1/auth/oauth", tags=["OAuth"])
    app.include_router(brand_kits_router, prefix="/api/v1/brand-kits", tags=["Brand Kits"])
    app.include_router(streamer_assets_router, prefix="/api/v1/brand-kits", tags=["Streamer Assets"])
    app.include_router(logos_router, prefix="/api/v1", tags=["Logos"])
    app.include_router(logo_generation_router, prefix="/api/v1/logos", tags=["Logo Generation"])
    app.include_router(generation_router, prefix="/api/v1", tags=["Generation"])
    app.include_router(assets_router, prefix="/api/v1", tags=["Assets"])
    app.include_router(coach_router, prefix="/api/v1/coach", tags=["Prompt Coach"])
    app.include_router(twitch_router, prefix="/api/v1", tags=["Twitch"])
    app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])
    app.include_router(site_analytics_router, prefix="/api/v1/site-analytics", tags=["Site Analytics"])
    app.include_router(enterprise_analytics_router, prefix="/api/v1/enterprise-analytics", tags=["Enterprise Analytics"])
    app.include_router(subscriptions_router, prefix="/api/v1/subscriptions", tags=["Subscriptions"])
    app.include_router(webhooks_router, prefix="/api/v1/webhooks", tags=["Webhooks"])
    app.include_router(usage_router, prefix="/api/v1/usage", tags=["Usage"])
    app.include_router(avatars_router, prefix="/api/v1/avatars", tags=["Avatars"])
    app.include_router(community_router, prefix="/api/v1", tags=["Community"])
    app.include_router(community_engagement_router, prefix="/api/v1", tags=["Community Engagement"])
    app.include_router(community_admin_router, prefix="/api/v1", tags=["Community Admin"])
    app.include_router(vibe_branding_router, tags=["Vibe Branding"])
    app.include_router(aura_lab_router, tags=["Aura Lab"])
    app.include_router(promo_router, prefix="/api/v1/promo", tags=["Promo Chatroom"])
    app.include_router(profile_creator_router, prefix="/api/v1/profile-creator", tags=["Profile Creator"])
    app.include_router(templates_router, prefix="/api/v1/templates", tags=["Templates"])
    app.include_router(friends_router, prefix="/api/v1", tags=["Friends"])
    app.include_router(messages_router, prefix="/api/v1", tags=["Messages"])
    app.include_router(simple_analytics_router, prefix="/api/v1/simple-analytics", tags=["Simple Analytics"])
    app.include_router(trends_router, prefix="/api/v1", tags=["Trends"])
    app.include_router(playbook_router, prefix="/api/v1", tags=["Playbook"])
    app.include_router(thumbnail_intel_router, prefix="/api/v1", tags=["Thumbnail Intelligence"])
    app.include_router(thumbnail_recreate_router, prefix="/api/v1", tags=["Thumbnail Recreation"])
    app.include_router(clip_radar_router, prefix="/api/v1", tags=["Clip Radar"])
    app.include_router(intel_router, prefix="/api/v1", tags=["Creator Intel"])
    app.include_router(intel_v2_router, tags=["Creator Intel V2"])
    app.include_router(creator_media_router, prefix="/api/v1", tags=["Creator Media Library"])
    
    return app


# =============================================================================
# Application Instance
# =============================================================================

# Create the application instance for ASGI servers
# This allows importing as: from api.main import app
app = create_app()
