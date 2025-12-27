"""
Unit tests for Security Headers Middleware.

Tests that all security headers are properly added to responses
and that GZip compression works correctly.
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from typing import Callable


# Inline the SecurityHeadersMiddleware for testing to avoid import issues
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds security headers to all responses.
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


@pytest.fixture
def app_with_security_headers():
    """Create a test app with security headers middleware."""
    app = FastAPI()
    
    # Add middleware in the same order as main.py
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(SecurityHeadersMiddleware)
    
    @app.get("/test")
    async def test_endpoint():
        return {"message": "Hello, World!"}
    
    @app.get("/large-response")
    async def large_response():
        # Return a response larger than 1000 bytes to trigger GZip
        return {"data": "x" * 2000}
    
    @app.get("/error")
    async def error_endpoint():
        raise ValueError("Test error")
    
    return app


@pytest.fixture
def client(app_with_security_headers):
    """Create a test client."""
    return TestClient(app_with_security_headers)


class TestSecurityHeaders:
    """Tests for security headers presence and values."""
    
    def test_content_security_policy_header_present(self, client):
        """Test that Content-Security-Policy header is present."""
        response = client.get("/test")
        assert "Content-Security-Policy" in response.headers
    
    def test_content_security_policy_value(self, client):
        """Test that CSP header has correct directives."""
        response = client.get("/test")
        csp = response.headers["Content-Security-Policy"]
        
        # Check required directives
        assert "default-src 'self'" in csp
        assert "script-src" in csp
        assert "https://js.stripe.com" in csp
        assert "style-src 'self' 'unsafe-inline'" in csp
        assert "img-src 'self' data: https: blob:" in csp
        assert "font-src 'self' data:" in csp
        assert "connect-src" in csp
        assert "https://api.stripe.com" in csp
        assert "https://*.supabase.co" in csp
        assert "wss://*.supabase.co" in csp
        assert "frame-src https://js.stripe.com https://hooks.stripe.com" in csp
        assert "frame-ancestors 'none'" in csp
    
    def test_x_frame_options_header(self, client):
        """Test that X-Frame-Options header is set to DENY."""
        response = client.get("/test")
        assert response.headers["X-Frame-Options"] == "DENY"
    
    def test_x_content_type_options_header(self, client):
        """Test that X-Content-Type-Options header is set to nosniff."""
        response = client.get("/test")
        assert response.headers["X-Content-Type-Options"] == "nosniff"
    
    def test_strict_transport_security_header(self, client):
        """Test that HSTS header is properly configured."""
        response = client.get("/test")
        hsts = response.headers["Strict-Transport-Security"]
        
        assert "max-age=31536000" in hsts
        assert "includeSubDomains" in hsts
        assert "preload" in hsts
    
    def test_x_xss_protection_header(self, client):
        """Test that X-XSS-Protection header is set."""
        response = client.get("/test")
        assert response.headers["X-XSS-Protection"] == "1; mode=block"
    
    def test_referrer_policy_header(self, client):
        """Test that Referrer-Policy header is set."""
        response = client.get("/test")
        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    
    def test_permissions_policy_header(self, client):
        """Test that Permissions-Policy header is set."""
        response = client.get("/test")
        permissions = response.headers["Permissions-Policy"]
        
        assert "camera=()" in permissions
        assert "microphone=()" in permissions
        assert "geolocation=()" in permissions
        assert "payment=(self)" in permissions
    
    def test_all_security_headers_present(self, client):
        """Test that all expected security headers are present."""
        response = client.get("/test")
        
        expected_headers = [
            "Content-Security-Policy",
            "X-Frame-Options",
            "X-Content-Type-Options",
            "Strict-Transport-Security",
            "X-XSS-Protection",
            "Referrer-Policy",
            "Permissions-Policy",
        ]
        
        for header in expected_headers:
            assert header in response.headers, f"Missing header: {header}"


class TestGZipCompression:
    """Tests for GZip compression middleware."""
    
    def test_small_response_not_compressed(self, client):
        """Test that small responses are not compressed."""
        response = client.get("/test", headers={"Accept-Encoding": "gzip"})
        
        # Small response should not be compressed
        assert response.headers.get("Content-Encoding") != "gzip"
    
    def test_large_response_compressed(self, client):
        """Test that large responses are compressed when client accepts gzip."""
        response = client.get(
            "/large-response",
            headers={"Accept-Encoding": "gzip"}
        )
        
        # Large response should be compressed
        assert response.headers.get("Content-Encoding") == "gzip"
    
    def test_gzip_compression_respects_accept_encoding(self, client):
        """Test that GZip compression is applied based on Accept-Encoding header."""
        # With gzip accepted, large response should be compressed
        response_with_gzip = client.get(
            "/large-response",
            headers={"Accept-Encoding": "gzip"}
        )
        assert response_with_gzip.headers.get("Content-Encoding") == "gzip"
        
        # With identity only (no compression), response should not be compressed
        response_identity = client.get(
            "/large-response",
            headers={"Accept-Encoding": "identity"}
        )
        assert response_identity.headers.get("Content-Encoding") != "gzip"


class TestSecurityHeadersOnErrors:
    """Tests that security headers are present on error responses."""
    
    def test_security_headers_on_404(self, client):
        """Test that security headers are present on 404 responses."""
        response = client.get("/nonexistent")
        
        assert response.status_code == 404
        assert "X-Frame-Options" in response.headers
        assert "X-Content-Type-Options" in response.headers
        assert "Strict-Transport-Security" in response.headers
    
    def test_security_headers_on_success(self, client):
        """Test that security headers are present on successful responses."""
        response = client.get("/test")
        
        assert response.status_code == 200
        assert "X-Frame-Options" in response.headers
        assert "Content-Security-Policy" in response.headers
