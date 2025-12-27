# Phase 1: Authentication & User Management — Design

## Overview

This design document provides the implementation blueprint for Phase 1 Authentication. All patterns derive from the Master Schema design document.

---

## Architecture

### Auth Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│   │  Next.js    │    │   Expo      │    │   SwiftUI   │                     │
│   │  (Cookie)   │    │  (Header)   │    │  (Header)   │                     │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                     │
└──────────┼──────────────────┼──────────────────┼────────────────────────────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTH MIDDLEWARE                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  1. Extract token from Cookie OR Authorization header               │    │
│  │  2. Decode and validate JWT                                         │    │
│  │  3. Attach user_id to request state                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTH SERVICE                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Signup     │  │    Login     │  │   Refresh    │  │    OAuth     │    │
│  │   Handler    │  │   Handler    │  │   Handler    │  │   Handler    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  users table: id, email, password_hash, display_name, tier, etc.    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Service Interfaces

### AuthService Interface
```python
class AuthService:
    async def signup(email: str, password: str, display_name: str) -> User
    async def login(email: str, password: str) -> TokenPair
    async def logout(user_id: str) -> None
    async def refresh_token(refresh_token: str) -> TokenPair
    async def get_user(user_id: str) -> User
    async def oauth_initiate(provider: str) -> OAuthURL
    async def oauth_callback(provider: str, code: str, state: str) -> TokenPair
    async def verify_token(token: str) -> TokenPayload
```

### JWTService Interface
```python
class JWTService:
    def create_access_token(user_id: str, tier: str) -> str
    def create_refresh_token(user_id: str) -> str
    def decode_access_token(token: str) -> TokenPayload
    def decode_refresh_token(token: str) -> RefreshPayload
```

### PasswordService Interface
```python
class PasswordService:
    def hash_password(password: str) -> str
    def verify_password(password: str, hashed: str) -> bool
    def validate_password_strength(password: str) -> ValidationResult
```

---

## Implementation Patterns

### JWT Token Structure
```python
# Access Token Payload
{
    "sub": "user_uuid",           # Subject (user ID)
    "tier": "free|pro|studio",    # Subscription tier
    "type": "access",             # Token type
    "exp": 1234567890,            # Expiration (24h from issue)
    "iat": 1234567890,            # Issued at
    "jti": "unique_token_id"      # JWT ID for revocation
}

# Refresh Token Payload
{
    "sub": "user_uuid",
    "type": "refresh",
    "exp": 1234567890,            # Expiration (30d from issue)
    "iat": 1234567890,
    "jti": "unique_token_id"
}
```

### Password Hashing
```python
import bcrypt

BCRYPT_COST_FACTOR = 12

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=BCRYPT_COST_FACTOR)
    return bcrypt.hashpw(password.encode(), salt).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())
```

### Auth Middleware Pattern
```python
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer

security = HTTPBearer(auto_error=False)

async def get_current_user(request: Request) -> str:
    """Extract and validate user from token (cookie or header)."""
    # 1. Try cookie first (web clients)
    token = request.cookies.get("access_token")
    
    # 2. Fall back to Authorization header (mobile clients)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt_service.decode_access_token(token)
        return payload["sub"]
    except TokenExpiredError:
        raise HTTPException(
            status_code=401,
            detail={"message": "Token expired", "code": "AUTH_TOKEN_EXPIRED"}
        )
    except TokenInvalidError:
        raise HTTPException(
            status_code=401,
            detail={"message": "Invalid token", "code": "AUTH_TOKEN_INVALID"}
        )

async def get_current_user_optional(request: Request) -> str | None:
    """Same as above but returns None instead of raising."""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None
```

### OAuth Flow Pattern
```python
from authlib.integrations.starlette_client import OAuth

oauth = OAuth()

# Register providers
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    access_token_url='https://oauth2.googleapis.com/token',
    client_kwargs={'scope': 'openid email profile'},
)

oauth.register(
    name='twitch',
    client_id=settings.TWITCH_CLIENT_ID,
    client_secret=settings.TWITCH_CLIENT_SECRET,
    authorize_url='https://id.twitch.tv/oauth2/authorize',
    access_token_url='https://id.twitch.tv/oauth2/token',
    client_kwargs={'scope': 'user:read:email'},
)

oauth.register(
    name='discord',
    client_id=settings.DISCORD_CLIENT_ID,
    client_secret=settings.DISCORD_CLIENT_SECRET,
    authorize_url='https://discord.com/api/oauth2/authorize',
    access_token_url='https://discord.com/api/oauth2/token',
    client_kwargs={'scope': 'identify email'},
)
```

---

## Request/Response Schemas

### Signup
```python
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=50)

class SignupResponse(BaseModel):
    user: User
    message: str = "Account created. Please verify your email."
```

### Login
```python
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_at: datetime
    user: User
```

### Refresh
```python
class RefreshRequest(BaseModel):
    refresh_token: str

class RefreshResponse(BaseModel):
    access_token: str
    expires_at: datetime
```

### OAuth Initiate
```python
class OAuthInitiateResponse(BaseModel):
    authorization_url: str
    state: str
```

---

## Frontend Patterns

### TSX Auth Store (Zustand)
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  
  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const { data } = await api.auth.login({ email, password });
      // Token stored in HTTP-only cookie by server (web)
      // Or stored in secure storage (mobile)
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  logout: async () => {
    await api.auth.logout();
    set({ user: null, isAuthenticated: false });
  },
  
  refreshUser: async () => {
    try {
      const { data } = await api.auth.me();
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
```

### Swift AuthViewModel
```swift
@Observable
final class AuthViewModel {
    private let authService: AuthService
    private let tokenStorage: TokenStorage
    
    var user: User?
    var isAuthenticated: Bool { user != nil }
    var isLoading = true
    var error: AuthError?
    
    func login(email: String, password: String) async {
        isLoading = true
        error = nil
        
        do {
            let response = try await authService.login(email: email, password: password)
            try await tokenStorage.save(
                accessToken: response.accessToken,
                refreshToken: response.refreshToken
            )
            user = response.user
        } catch let authError as AuthError {
            error = authError
        } catch {
            self.error = .unknown(error)
        }
        
        isLoading = false
    }
    
    func logout() async {
        do {
            try await authService.logout()
            try await tokenStorage.clear()
            user = nil
        } catch {
            self.error = .unknown(error)
        }
    }
}
```

---

## Database Operations

### User CRUD
```python
async def create_user(email: str, password_hash: str, display_name: str) -> User:
    result = await supabase.table("users").insert({
        "email": email,
        "password_hash": password_hash,
        "display_name": display_name,
        "email_verified": False,
        "subscription_tier": "free",
        "subscription_status": "none",
    }).execute()
    return User(**result.data[0])

async def get_user_by_email(email: str) -> User | None:
    result = await supabase.table("users").select("*").eq("email", email).execute()
    if result.data:
        return User(**result.data[0])
    return None

async def get_user_by_id(user_id: str) -> User | None:
    result = await supabase.table("users").select("*").eq("id", user_id).execute()
    if result.data:
        return User(**result.data[0])
    return None
```

---

## File Structure

```
backend/
├── api/
│   ├── routes/
│   │   └── auth.py              # Auth endpoints
│   ├── schemas/
│   │   └── auth.py              # Request/response models
│   └── middleware/
│       └── auth.py              # Auth middleware
├── services/
│   ├── auth_service.py          # Auth business logic
│   ├── jwt_service.py           # JWT operations
│   └── password_service.py      # Password hashing
└── tests/
    ├── properties/
    │   └── test_auth_properties.py
    ├── unit/
    │   └── test_auth.py
    └── integration/
        └── test_auth_flow.py

tsx/
├── packages/
│   ├── api-client/
│   │   └── src/
│   │       └── auth.ts          # Auth API methods
│   └── shared/
│       └── src/
│           └── stores/
│               └── authStore.ts # Auth state
├── apps/
│   ├── web/
│   │   └── src/
│   │       └── app/
│   │           └── (auth)/
│   │               ├── login/
│   │               └── signup/
│   └── mobile/
│       └── src/
│           └── app/
│               └── (auth)/
│                   ├── login.tsx
│                   └── signup.tsx

swift/
└── Sources/
    └── StreamerStudioCore/
        ├── Features/
        │   └── Auth/
        │       ├── AuthService.swift
        │       ├── AuthViewModel.swift
        │       ├── LoginView.swift
        │       └── SignupView.swift
        └── Core/
            └── TokenStorage.swift
```
