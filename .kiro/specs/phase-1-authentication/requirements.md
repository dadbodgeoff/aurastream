# Phase 1: Authentication & User Management — Requirements

## Overview

This mini-spec implements user authentication for Streamer Studio, derived from the Master Schema Requirement 1 (User Authentication and Account Management). All implementations must conform to the canonical patterns defined in the master schema.

**Master Schema Reference:** `.kiro/specs/streamer-studio-master-schema/`
**Phase Duration:** Week 2
**Delegation Strategy:** All implementation tasks delegated to sub-agents; orchestrator enforces compliance.

---

## Requirements (From Master Schema)

### Requirement 1: User Authentication and Account Management

**User Story:** As a creator, I want to sign up and manage my account, so that I can access my generated assets and brand kits across sessions and devices.

#### Acceptance Criteria

1. WHEN a user signs up with email and password, THE Auth_System SHALL create a new account and send email verification
2. WHEN a user signs up via OAuth (Google, Twitch, Discord), THE Auth_System SHALL create or link an account without requiring password
3. WHEN a user logs in with valid credentials, THE Auth_System SHALL issue a JWT token with 24-hour expiration
4. WHEN a user's JWT token expires, THE Auth_System SHALL allow token refresh without re-authentication
5. WHEN a user logs out, THE Auth_System SHALL invalidate the current session and clear auth cookies
6. IF an invalid or expired token is provided, THEN THE Auth_System SHALL return 401 Unauthorized
7. WHEN a user upgrades to Pro or Studio tier, THE Account_System SHALL update subscription status and unlock features
8. THE Auth_System SHALL support both cookie-based (web) and header-based (mobile) authentication

---

## Canonical Data Models

### User Model (From Master Schema)
```typescript
interface User {
  id: string;                    // UUID, primary key
  email: string;                 // Unique, validated format
  email_verified: boolean;       // Default false
  display_name: string;          // 1-50 chars
  avatar_url: string | null;     // CDN URL or null
  subscription_tier: 'free' | 'pro' | 'studio';  // Default 'free'
  subscription_status: 'active' | 'past_due' | 'canceled' | 'none';
  stripe_customer_id: string | null;
  assets_generated_this_month: number;  // Reset on billing cycle
  created_at: string;            // ISO 8601
  updated_at: string;            // ISO 8601
}
```

### Token Models
```typescript
interface TokenPair {
  access_token: string;      // JWT, 24h expiry
  refresh_token: string;     // Opaque, 30d expiry
  expires_at: string;        // ISO 8601
}

interface TokenPayload {
  sub: string;               // user_id
  tier: string;              // subscription tier
  exp: number;               // expiration timestamp
  iat: number;               // issued at
}
```

---

## Canonical API Contracts

### Authentication Endpoints
```
POST   /api/v1/auth/signup          # Email/password signup
POST   /api/v1/auth/login           # Email/password login
POST   /api/v1/auth/logout          # Invalidate session
POST   /api/v1/auth/refresh         # Refresh JWT token
GET    /api/v1/auth/me              # Get current user
POST   /api/v1/auth/oauth/{provider}  # OAuth initiation (google, twitch, discord)
GET    /api/v1/auth/oauth/{provider}/callback  # OAuth callback
```

### Response Envelope (All Endpoints)
```typescript
// Success response
interface ApiResponse<T> {
  data: T;
  meta: {
    request_id: string;          // UUID for tracing
    timestamp: string;           // ISO 8601
  };
}

// Error response
interface ApiError {
  error: {
    message: string;             // Human-readable
    code: string;                // Machine-readable
    details: Record<string, any> | null;
  };
  meta: {
    request_id: string;
    timestamp: string;
  };
}
```

---

## Correctness Properties (From Master Schema)

### Property 1: JWT Token Round-Trip
*For any* valid token payload (user_id, tier, expiration), encoding then decoding the JWT SHALL produce an equivalent payload.

```python
@given(
    user_id=st.uuids().map(str),
    tier=st.sampled_from(['free', 'pro', 'studio']),
    exp_hours=st.integers(min_value=1, max_value=168)
)
def test_jwt_roundtrip(user_id, tier, exp_hours):
    payload = {"sub": user_id, "tier": tier, "exp": time.time() + exp_hours * 3600}
    token = encode_jwt(payload)
    decoded = decode_jwt(token)
    assert decoded["sub"] == user_id
    assert decoded["tier"] == tier
```

### Property 2: Password Hash Verification
*For any* valid password string, hashing then verifying SHALL return True, and verifying against a different password SHALL return False.

```python
@given(
    password=st.text(min_size=8, max_size=128, alphabet=st.characters(blacklist_categories=['Cs'])),
    wrong_password=st.text(min_size=8, max_size=128)
)
def test_password_hash_verification(password, wrong_password):
    assume(password != wrong_password)
    hashed = hash_password(password)
    assert verify_password(password, hashed) == True
    assert verify_password(wrong_password, hashed) == False
```

### Property 3: Expired Token Rejection
*For any* JWT token with expiration in the past, token validation SHALL raise an expiration error.

```python
@given(
    user_id=st.uuids().map(str),
    seconds_ago=st.integers(min_value=1, max_value=86400 * 365)
)
def test_expired_token_rejected(user_id, seconds_ago):
    payload = {"sub": user_id, "exp": time.time() - seconds_ago}
    token = encode_jwt(payload)
    with pytest.raises(TokenExpiredError):
        decode_jwt(token)
```

---

## Error Codes (Authentication Domain)

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Email/password mismatch |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT token has expired |
| `AUTH_TOKEN_INVALID` | 401 | JWT signature invalid or malformed |
| `AUTH_REFRESH_INVALID` | 401 | Refresh token invalid or revoked |
| `AUTH_EMAIL_EXISTS` | 409 | Email already registered |
| `AUTH_EMAIL_NOT_VERIFIED` | 403 | Email verification required |

---

## Verification Gate 1 Checklist

### Property Tests
- [ ] Property 1: JWT Token Round-Trip — 100+ iterations
- [ ] Property 2: Password Hash Verification — 100+ iterations
- [ ] Property 3: Expired Token Rejection — 100+ iterations

### Unit Tests
- [ ] POST /api/v1/auth/signup — happy path, validation errors, email exists
- [ ] POST /api/v1/auth/login — happy path, invalid credentials, user not found
- [ ] POST /api/v1/auth/logout — happy path, not authenticated
- [ ] POST /api/v1/auth/refresh — happy path, invalid refresh token
- [ ] GET /api/v1/auth/me — happy path, not authenticated

### Integration Tests
- [ ] Full OAuth flow with mocked provider (Google)
- [ ] Full OAuth flow with mocked provider (Twitch)
- [ ] Full OAuth flow with mocked provider (Discord)

### E2E Tests
- [ ] Signup → Login → Access protected route → Logout

### Platform Verification
- [ ] TSX web: Auth screens functional (login, signup)
- [ ] TSX mobile: Auth screens functional (login, signup)
- [ ] Swift: Auth screens functional (login, signup)

---

## Security Requirements (From Master Schema Requirement 14)

1. THE System SHALL encrypt all OAuth tokens at rest using AES-256
2. THE System SHALL never log sensitive data: passwords, tokens, API keys, PII
3. WHEN storing passwords, THE System SHALL use bcrypt with cost factor 12
4. THE System SHALL implement audit logging for: login attempts, subscription changes
