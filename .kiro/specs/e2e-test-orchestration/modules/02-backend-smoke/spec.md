# Module 02: Backend Smoke Tests

## Overview
Endpoint reachability tests that validate all API routes are accessible and return expected status codes for unauthenticated requests.

## Test Files

### `backend/tests/e2e/smoke/test_auth_smoke.py`
```python
"""
Authentication Endpoint Smoke Tests.

Validates all auth endpoints are reachable.
"""

class TestAuthSmoke:
    def test_signup_endpoint_reachable(self, client):
        """POST /api/v1/auth/signup returns 422 for empty body."""
        
    def test_login_endpoint_reachable(self, client):
        """POST /api/v1/auth/login returns 422 for empty body."""
        
    def test_refresh_endpoint_reachable(self, client):
        """POST /api/v1/auth/refresh returns 422 for empty body."""
        
    def test_me_endpoint_requires_auth(self, client):
        """GET /api/v1/auth/me returns 401 without token."""
        
    def test_logout_endpoint_requires_auth(self, client):
        """POST /api/v1/auth/logout returns 401 without token."""
        
    def test_password_reset_request_reachable(self, client):
        """POST /api/v1/auth/password-reset/request returns 422 for empty body."""
        
    def test_password_reset_confirm_reachable(self, client):
        """POST /api/v1/auth/password-reset/confirm returns 422 for empty body."""
        
    def test_oauth_google_reachable(self, client):
        """POST /api/v1/oauth/google returns redirect or error."""
        
    def test_oauth_twitch_reachable(self, client):
        """POST /api/v1/oauth/twitch returns redirect or error."""
        
    def test_oauth_discord_reachable(self, client):
        """POST /api/v1/oauth/discord returns redirect or error."""
```

### `backend/tests/e2e/smoke/test_brand_kits_smoke.py`
```python
"""
Brand Kits Endpoint Smoke Tests.

Validates all brand kit endpoints require authentication.
"""

class TestBrandKitsSmoke:
    def test_list_requires_auth(self, client):
        """GET /api/v1/brand-kits returns 401."""
        
    def test_create_requires_auth(self, client):
        """POST /api/v1/brand-kits returns 401."""
        
    def test_get_active_requires_auth(self, client):
        """GET /api/v1/brand-kits/active returns 401."""
        
    def test_get_by_id_requires_auth(self, client):
        """GET /api/v1/brand-kits/{id} returns 401."""
        
    def test_update_requires_auth(self, client):
        """PUT /api/v1/brand-kits/{id} returns 401."""
        
    def test_delete_requires_auth(self, client):
        """DELETE /api/v1/brand-kits/{id} returns 401."""
        
    def test_activate_requires_auth(self, client):
        """POST /api/v1/brand-kits/{id}/activate returns 401."""
        
    def test_colors_get_requires_auth(self, client):
        """GET /api/v1/brand-kits/{id}/colors returns 401."""
        
    def test_colors_put_requires_auth(self, client):
        """PUT /api/v1/brand-kits/{id}/colors returns 401."""
        
    def test_typography_get_requires_auth(self, client):
        """GET /api/v1/brand-kits/{id}/typography returns 401."""
        
    def test_typography_put_requires_auth(self, client):
        """PUT /api/v1/brand-kits/{id}/typography returns 401."""
        
    def test_voice_get_requires_auth(self, client):
        """GET /api/v1/brand-kits/{id}/voice returns 401."""
        
    def test_voice_put_requires_auth(self, client):
        """PUT /api/v1/brand-kits/{id}/voice returns 401."""
        
    def test_guidelines_get_requires_auth(self, client):
        """GET /api/v1/brand-kits/{id}/guidelines returns 401."""
        
    def test_guidelines_put_requires_auth(self, client):
        """PUT /api/v1/brand-kits/{id}/guidelines returns 401."""
```

### `backend/tests/e2e/smoke/test_generation_smoke.py`
```python
"""
Generation Endpoint Smoke Tests.

Validates all generation endpoints require authentication.
"""

class TestGenerationSmoke:
    def test_generate_requires_auth(self, client):
        """POST /api/v1/generate returns 401."""
        
    def test_list_jobs_requires_auth(self, client):
        """GET /api/v1/jobs returns 401."""
        
    def test_get_job_requires_auth(self, client):
        """GET /api/v1/jobs/{id} returns 401."""
        
    def test_get_job_assets_requires_auth(self, client):
        """GET /api/v1/jobs/{id}/assets returns 401."""
```

### `backend/tests/e2e/smoke/test_assets_smoke.py`
```python
"""
Assets Endpoint Smoke Tests.

Validates asset endpoints and public access.
"""

class TestAssetsSmoke:
    def test_list_requires_auth(self, client):
        """GET /api/v1/assets returns 401."""
        
    def test_get_requires_auth(self, client):
        """GET /api/v1/assets/{id} returns 401."""
        
    def test_delete_requires_auth(self, client):
        """DELETE /api/v1/assets/{id} returns 401."""
        
    def test_visibility_requires_auth(self, client):
        """PUT /api/v1/assets/{id}/visibility returns 401."""
        
    def test_public_asset_returns_404_for_invalid(self, client):
        """GET /api/v1/asset/{invalid_id} returns 404."""
```

### `backend/tests/e2e/smoke/test_twitch_smoke.py`
```python
"""
Twitch Endpoint Smoke Tests.

Validates all Twitch endpoints require authentication.
"""

class TestTwitchSmoke:
    def test_dimensions_requires_auth(self, client):
        """GET /api/v1/twitch/dimensions returns 401."""
        
    def test_generate_requires_auth(self, client):
        """POST /api/v1/twitch/generate returns 401."""
        
    def test_packs_create_requires_auth(self, client):
        """POST /api/v1/twitch/packs returns 401."""
        
    def test_packs_get_requires_auth(self, client):
        """GET /api/v1/twitch/packs/{id} returns 401."""
        
    def test_game_meta_requires_auth(self, client):
        """GET /api/v1/twitch/game-meta/{id} returns 401."""
```

### `backend/tests/e2e/smoke/test_coach_smoke.py`
```python
"""
Coach Endpoint Smoke Tests.

Validates coach endpoints and tier access.
"""

class TestCoachSmoke:
    def test_tips_accessible_without_auth(self, client):
        """GET /api/v1/coach/tips returns 200 (all tiers)."""
        
    def test_access_requires_auth(self, client):
        """GET /api/v1/coach/access returns 401."""
        
    def test_start_requires_auth(self, client):
        """POST /api/v1/coach/start returns 401."""
        
    def test_messages_requires_auth(self, client):
        """POST /api/v1/coach/sessions/{id}/messages returns 401."""
        
    def test_session_get_requires_auth(self, client):
        """GET /api/v1/coach/sessions/{id} returns 401."""
        
    def test_session_end_requires_auth(self, client):
        """POST /api/v1/coach/sessions/{id}/end returns 401."""
```

### `backend/tests/e2e/smoke/test_logos_smoke.py`
```python
"""
Logos Endpoint Smoke Tests.

Validates all logo endpoints require authentication.
"""

class TestLogosSmoke:
    def test_upload_requires_auth(self, client):
        """POST /api/v1/brand-kits/{id}/logos returns 401."""
        
    def test_list_requires_auth(self, client):
        """GET /api/v1/brand-kits/{id}/logos returns 401."""
        
    def test_get_type_requires_auth(self, client):
        """GET /api/v1/brand-kits/{id}/logos/{type} returns 401."""
        
    def test_delete_requires_auth(self, client):
        """DELETE /api/v1/brand-kits/{id}/logos/{type} returns 401."""
        
    def test_set_default_requires_auth(self, client):
        """PUT /api/v1/brand-kits/{id}/logos/default returns 401."""
```

## Expected Status Codes

| Endpoint Type | Without Auth | With Invalid Body |
|---------------|--------------|-------------------|
| Public (tips) | 200 | N/A |
| Auth required | 401 | 401 |
| Validation | 422 | 422 |
| Not found | 404 | 404 |

## Timeout
- Individual test: 5 seconds
- Module total: 120 seconds

## Dependencies
- Phase 1 (Health) must pass

## Parallel Execution
All 7 smoke test files can run in parallel.
