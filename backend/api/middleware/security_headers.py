"""
Security Headers Middleware for Aurastream.

Adds security headers to all HTTP responses:
- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from typing import Callable


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds security headers to all responses.
    
    These headers provide defense-in-depth against common web attacks:
    - XSS (Content-Security-Policy, X-XSS-Protection)
    - Clickjacking (X-Frame-Options)
    - MIME sniffing (X-Content-Type-Options)
    - Protocol downgrade (Strict-Transport-Security)
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Content Security Policy - restrict resource loading
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https: blob:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co; "
            "frame-src https://js.stripe.com https://hooks.stripe.com; "
            "frame-ancestors 'none';"
        )
        
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Force HTTPS (1 year, include subdomains, allow preload)
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )
        
        # XSS Protection (legacy browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer Policy - send origin only for cross-origin
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions Policy - disable unnecessary features
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=(self)"
        )
        
        return response
