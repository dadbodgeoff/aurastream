# Module 03: Backend Flow Tests

## Overview
Complete user journey tests that validate end-to-end functionality with authenticated users and real data operations.

## Test Files

### `backend/tests/e2e/flows/test_auth_flow.py`
```python
"""
Authentication Flow E2E Tests.

Complete authentication lifecycle validation.
"""

class TestAuthFlow:
    def test_signup_creates_user(self, client, unique_email):
        """Signup creates user and returns tokens."""
        # POST /signup with valid data
        # Assert 201 with user data and tokens
        
    def test_login_returns_tokens(self, client, test_user):
        """Login with valid credentials returns tokens."""
        # POST /login with test_user credentials
        # Assert 200 with access_token and refresh_token
        
    def test_me_returns_user_profile(self, client, authenticated_user):
        """GET /me returns authenticated user profile."""
        # GET /me with valid token
        # Assert 200 with user data
        
    def test_token_refresh_works(self, client, authenticated_user):
        """Token refresh returns new access token."""
        # POST /refresh with refresh_token
        # Assert 200 with new access_token
        
    def test_logout_invalidates_session(self, client, authenticated_user):
        """Logout invalidates tokens."""
        # POST /logout
        # Assert 200
        # GET /me with old token returns 401
        
    def test_password_reset_flow(self, client, test_user):
        """Password reset request and confirm flow."""
        # POST /password-reset/request
        # Assert 200
        # POST /password-reset/confirm with token
        # Assert 200
        
    def test_rate_limiting_enforced(self, client):
        """Rate limiting blocks excessive login attempts."""
        # POST /login 6 times with wrong password
        # Assert 429 on 6th attempt
        
    def test_invalid_credentials_rejected(self, client):
        """Invalid credentials return 401."""
        # POST /login with wrong password
        # Assert 401
```

### `backend/tests/e2e/flows/test_brand_kit_flow.py`
```python
"""
Brand Kit Flow E2E Tests.

Complete brand kit lifecycle validation.
"""

class TestBrandKitFlow:
    def test_create_brand_kit(self, client, authenticated_user):
        """Create brand kit with required fields."""
        # POST /brand-kits with valid data
        # Assert 201 with brand kit data
        
    def test_list_brand_kits(self, client, authenticated_user, brand_kit):
        """List returns user's brand kits."""
        # GET /brand-kits
        # Assert 200 with array containing brand_kit
        
    def test_get_brand_kit_by_id(self, client, authenticated_user, brand_kit):
        """Get specific brand kit by ID."""
        # GET /brand-kits/{id}
        # Assert 200 with brand kit data
        
    def test_update_brand_kit(self, client, authenticated_user, brand_kit):
        """Update brand kit fields."""
        # PUT /brand-kits/{id} with updated data
        # Assert 200 with updated data
        
    def test_activate_brand_kit(self, client, authenticated_user, brand_kit):
        """Activate brand kit sets is_active."""
        # POST /brand-kits/{id}/activate
        # Assert 200 with is_active=True
        
    def test_delete_brand_kit(self, client, authenticated_user, brand_kit):
        """Delete brand kit removes it."""
        # DELETE /brand-kits/{id}
        # Assert 204
        # GET /brand-kits/{id} returns 404
        
    def test_extended_colors_crud(self, client, authenticated_user, brand_kit):
        """Extended colors CRUD operations."""
        # PUT /brand-kits/{id}/colors
        # GET /brand-kits/{id}/colors
        # Assert data matches
        
    def test_typography_crud(self, client, authenticated_user, brand_kit):
        """Typography CRUD operations."""
        # PUT /brand-kits/{id}/typography
        # GET /brand-kits/{id}/typography
        # Assert data matches
        
    def test_voice_crud(self, client, authenticated_user, brand_kit):
        """Brand voice CRUD operations."""
        # PUT /brand-kits/{id}/voice
        # GET /brand-kits/{id}/voice
        # Assert data matches
        
    def test_guidelines_crud(self, client, authenticated_user, brand_kit):
        """Brand guidelines CRUD operations."""
        # PUT /brand-kits/{id}/guidelines
        # GET /brand-kits/{id}/guidelines
        # Assert data matches
        
    def test_brand_kit_limit_enforced(self, client, authenticated_user):
        """Cannot create more than 10 brand kits."""
        # Create 10 brand kits
        # POST /brand-kits for 11th
        # Assert 400 with limit error
```

### `backend/tests/e2e/flows/test_generation_flow.py`
```python
"""
Generation Flow E2E Tests.

Complete asset generation lifecycle validation.
"""

class TestGenerationFlow:
    def test_create_generation_job(self, client, authenticated_user, brand_kit):
        """Create generation job returns job ID."""
        # POST /generate with asset_type and prompt
        # Assert 202 with job_id and status=queued
        
    def test_job_status_polling(self, client, authenticated_user, generation_job):
        """Job status can be polled."""
        # GET /jobs/{id}
        # Assert 200 with status field
        
    def test_job_with_brand_kit(self, client, authenticated_user, brand_kit):
        """Job with brand_kit_id uses brand context."""
        # POST /generate with brand_kit_id
        # Assert 202 with brand_kit_id in response
        
    def test_list_jobs_filtered(self, client, authenticated_user, generation_job):
        """List jobs with status filter."""
        # GET /jobs?status=queued
        # Assert 200 with filtered results
        
    def test_get_job_assets(self, client, authenticated_user, completed_job):
        """Get assets for completed job."""
        # GET /jobs/{id}/assets
        # Assert 200 with asset array
```

### `backend/tests/e2e/flows/test_twitch_flow.py`
```python
"""
Twitch Integration Flow E2E Tests.

Complete Twitch asset generation validation.
"""

class TestTwitchFlow:
    def test_get_dimensions(self, client, authenticated_user):
        """Get Twitch dimension specifications."""
        # GET /twitch/dimensions
        # Assert 200 with dimension specs
        
    def test_get_game_meta(self, client, authenticated_user):
        """Get game metadata."""
        # GET /twitch/game-meta/{game_id}
        # Assert 200 with game metadata
        
    def test_generate_single_asset(self, client, authenticated_user, brand_kit):
        """Generate single Twitch asset."""
        # POST /twitch/generate with asset_type
        # Assert 202 with job_id
        
    def test_generate_pack(self, client, authenticated_user, brand_kit):
        """Generate Twitch asset pack."""
        # POST /twitch/packs with pack_type
        # Assert 202 with pack_id
        
    def test_pack_status_polling(self, client, authenticated_user, twitch_pack):
        """Pack status can be polled."""
        # GET /twitch/packs/{id}
        # Assert 200 with status and assets
```

### `backend/tests/e2e/flows/test_coach_flow.py`
```python
"""
Coach Flow E2E Tests.

Complete prompt coaching validation.
"""

class TestCoachFlow:
    def test_get_tips_all_tiers(self, client):
        """Tips accessible without authentication."""
        # GET /coach/tips
        # Assert 200 with tips array
        
    def test_check_access_free_tier(self, client, free_user):
        """Free tier has limited access."""
        # GET /coach/access
        # Assert 200 with access=false for premium features
        
    def test_check_access_premium_tier(self, client, premium_user):
        """Premium tier has full access."""
        # GET /coach/access
        # Assert 200 with access=true
        
    def test_start_session_premium(self, client, premium_user):
        """Premium user can start coach session."""
        # POST /coach/start with initial prompt
        # Assert 200 with session_id (SSE stream)
        
    def test_continue_session(self, client, premium_user, coach_session):
        """Continue coach session with message."""
        # POST /coach/sessions/{id}/messages
        # Assert 200 (SSE stream)
        
    def test_get_session_state(self, client, premium_user, coach_session):
        """Get current session state."""
        # GET /coach/sessions/{id}
        # Assert 200 with session state
        
    def test_end_session(self, client, premium_user, coach_session):
        """End session returns final prompt."""
        # POST /coach/sessions/{id}/end
        # Assert 200 with final_prompt
        
    def test_turn_limit_enforced(self, client, premium_user, coach_session):
        """Session ends after 10 turns."""
        # Send 10 messages
        # Assert session auto-ends
```

## Fixtures Required

```python
# backend/tests/e2e/fixtures/auth_fixtures.py

@pytest.fixture
def unique_email():
    """Generate unique email for signup tests."""
    return f"test_{uuid.uuid4().hex[:8]}@example.com"

@pytest.fixture
def test_user(client, unique_email):
    """Create and return test user."""
    response = client.post("/api/v1/auth/signup", json={
        "email": unique_email,
        "password": "TestPass123!",
        "display_name": "Test User"
    })
    return response.json()

@pytest.fixture
def authenticated_user(client, test_user):
    """Return test user with auth headers."""
    return {
        "user": test_user,
        "headers": {"Authorization": f"Bearer {test_user['access_token']}"}
    }

@pytest.fixture
def free_user(authenticated_user):
    """User with free tier."""
    return authenticated_user

@pytest.fixture
def premium_user(client, unique_email):
    """User with premium tier (mocked)."""
    # Create user with premium subscription
    pass
```

```python
# backend/tests/e2e/fixtures/brand_kit_fixtures.py

@pytest.fixture
def brand_kit(client, authenticated_user):
    """Create and return test brand kit."""
    response = client.post(
        "/api/v1/brand-kits",
        headers=authenticated_user["headers"],
        json={
            "name": "Test Brand Kit",
            "primary_colors": ["#FF5500"],
            "fonts": {"headline": "Inter", "body": "Inter"},
            "tone": "competitive"
        }
    )
    return response.json()
```

```python
# backend/tests/e2e/fixtures/generation_fixtures.py

@pytest.fixture
def generation_job(client, authenticated_user, brand_kit):
    """Create and return test generation job."""
    response = client.post(
        "/api/v1/generate",
        headers=authenticated_user["headers"],
        json={
            "asset_type": "thumbnail",
            "brand_kit_id": brand_kit["id"],
            "custom_prompt": "Test generation"
        }
    )
    return response.json()
```

## Timeout
- Individual test: 30 seconds
- Module total: 180 seconds

## Dependencies
- Phase 1 (Health) must pass
- Phase 2 (Smoke) must pass

## Execution Order
Flow tests run sequentially due to data dependencies between tests.
