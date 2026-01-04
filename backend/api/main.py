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
from api.middleware.prometheus_metrics import PrometheusMiddleware, get_metrics_router, METRICS_ENABLED

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

def _get_cors_headers(request: Request) -> dict:
    """Get CORS headers based on request origin."""
    settings = get_settings()
    origin = request.headers.get("origin", "")
    
    # Check if origin is allowed
    if origin in settings.allowed_origins_list:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    return {}


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
        headers=_get_cors_headers(request),
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
        headers=_get_cors_headers(request),
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
        headers=_get_cors_headers(request),
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
    
    NOTE: Background workers (clip_radar, playbook, analytics_flush, etc.) are now
    managed by the Head Orchestrator and run as separate Docker containers.
    See docker-compose.yml for worker configuration.
    
    Shutdown:
    - Close database connections
    - Clean up Redis connections
    """
    import asyncio
    import logging
    
    settings = get_settings()
    logger = logging.getLogger("aurastream.lifespan")
    
    # Startup
    logger.info("Starting Aurastream API...")
    logger.info("NOTE: Workers are managed by Head Orchestrator (separate containers)")
    
    logger.info("Aurastream API ready (workers managed by Head Orchestrator)")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Aurastream API...")
    logger.info("API shutdown complete")


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
    
    # Prometheus metrics middleware (collects HTTP request metrics)
    if METRICS_ENABLED:
        app.add_middleware(PrometheusMiddleware)
    
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
    from backend.api.routes.orchestrator import router as orchestrator_router
    from backend.api.routes.canvas_snapshot import router as canvas_snapshot_router
    from backend.api.routes.provenance import router as provenance_router
    from backend.api.routes.sse_recovery import router as sse_recovery_router
    from backend.api.routes.admin_rate_limits import router as admin_rate_limits_router
    
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
    app.include_router(canvas_snapshot_router, prefix="/api/v1/canvas-snapshot", tags=["Canvas Snapshot"])
    app.include_router(orchestrator_router, prefix="/api/v1", tags=["Orchestrator Dashboard"])
    app.include_router(provenance_router, prefix="/api/v1", tags=["Intelligence Provenance"])
    app.include_router(sse_recovery_router, prefix="/api/v1", tags=["SSE Recovery"])
    app.include_router(admin_rate_limits_router, prefix="/api/v1", tags=["Admin - Rate Limits"])
    
    # Prometheus metrics endpoint (if enabled)
    if METRICS_ENABLED:
        app.include_router(get_metrics_router())
    
    return app


# =============================================================================
# Application Instance
# =============================================================================

# Create the application instance for ASGI servers
# This allows importing as: from api.main import app
app = create_app()
