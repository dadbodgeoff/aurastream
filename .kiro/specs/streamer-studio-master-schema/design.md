# Streamer Studio Master Schema — Design Document

## Overview

This design document provides the architectural blueprint, implementation patterns, and correctness properties for Streamer Studio. It serves as the binding reference for all child specs and parallel implementations (TSX + Swift).

**Design Principles:**
1. **API-First**: Backend contracts are immutable; clients adapt
2. **Property-Driven**: Every data transformation has testable invariants
3. **Phase-Gated**: No phase proceeds without verification gate passing
4. **Platform-Agnostic Core**: Business logic lives in backend; clients are thin
5. **Fail-Safe Defaults**: System degrades gracefully under failure

---

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────┬─────────────────┬─────────────────────────────────────────┤
│   Next.js Web   │  React Native   │           SwiftUI iOS                   │
│   (TSX)         │  (TSX/Expo)     │           (Swift)                       │
└────────┬────────┴────────┬────────┴──────────────────┬──────────────────────┘
         │                 │                           │
         └─────────────────┼───────────────────────────┘
                           │ HTTPS/WSS
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Rate Limit  │→ │    Auth     │→ │   CORS      │→ │  Security   │        │
│  │ Middleware  │  │ Middleware  │  │ Middleware  │  │  Headers    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FASTAPI APPLICATION                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                          ROUTE HANDLERS                               │   │
│  │  /auth/*  │  /brand-kits/*  │  /generate/*  │  /assets/*  │  /sub/*  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                 │                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                          SERVICE LAYER                                │   │
│  │  AuthService │ BrandKitService │ GenerationService │ StripeService   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│    SUPABASE     │   │     REDIS       │   │   S3 / BLOB     │
│   (PostgreSQL)  │   │  (Job Queue)    │   │   (Assets)      │
│                 │   │                 │   │                 │
│  - Users        │   │  - Bull Queue   │   │  - Generated    │
│  - BrandKits    │   │  - Job Status   │   │    Images       │
│  - Assets       │   │  - Rate Limits  │   │  - Logos        │
│  - Jobs         │   │                 │   │  - Uploads      │
│  - Connections  │   │                 │   │                 │
└─────────────────┘   └────────┬────────┘   └─────────────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │  WORKER PROCESS │
                    │                 │
                    │  - Job Consumer │
                    │  - Nano Banana  │
                    │    API Client   │
                    │  - Storage      │
                    │    Upload       │
                    └─────────────────┘
```


---

## Components and Interfaces

### Backend Service Interfaces

#### AuthService Interface
```python
class AuthService:
    async def signup(email: str, password: str) -> User
    async def login(email: str, password: str) -> TokenPair
    async def logout(user_id: str, token: str) -> None
    async def refresh_token(refresh_token: str) -> TokenPair
    async def get_user(user_id: str) -> User
    async def oauth_initiate(provider: str) -> OAuthURL
    async def oauth_callback(provider: str, code: str) -> TokenPair
    async def verify_token(token: str) -> TokenPayload
    
    # Token structure
    @dataclass
    class TokenPair:
        access_token: str      # JWT, 24h expiry
        refresh_token: str     # Opaque, 30d expiry
        expires_at: datetime
    
    @dataclass
    class TokenPayload:
        sub: str               # user_id
        tier: str              # subscription tier
        exp: int               # expiration timestamp
        iat: int               # issued at
```

#### BrandKitService Interface
```python
class BrandKitService:
    async def create(user_id: str, data: BrandKitCreate) -> BrandKit
    async def get(brand_kit_id: str) -> BrandKit
    async def list(user_id: str) -> List[BrandKit]
    async def update(brand_kit_id: str, data: BrandKitUpdate) -> BrandKit
    async def delete(brand_kit_id: str) -> None
    async def set_active(user_id: str, brand_kit_id: str) -> BrandKit
    async def analyze_uploads(user_id: str, files: List[UploadFile]) -> BrandKitExtraction
    
    @dataclass
    class BrandKitExtraction:
        primary_colors: List[str]    # Extracted hex codes
        accent_colors: List[str]
        detected_fonts: List[str]
        suggested_tone: str
        confidence: float            # 0-1
```

#### GenerationService Interface
```python
class GenerationService:
    async def create_job(user_id: str, request: GenerationRequest) -> GenerationJob
    async def create_batch_job(user_id: str, request: BatchRequest) -> GenerationJob
    async def get_job(job_id: str) -> GenerationJob
    async def list_jobs(user_id: str, filters: JobFilters) -> PaginatedList[GenerationJob]
    async def cancel_job(job_id: str) -> GenerationJob
    async def get_job_assets(job_id: str) -> List[Asset]
    
    @dataclass
    class GenerationRequest:
        asset_type: AssetType
        custom_prompt: Optional[str]
        brand_kit_id: Optional[str]
        platform_context: Optional[PlatformContext]
        variations: int = 1          # 1-5
    
    @dataclass
    class BatchRequest:
        assets: List[GenerationRequest]  # Max 15
```

#### PromptEngine Interface
```python
class PromptEngine:
    def construct_prompt(
        asset_type: AssetType,
        brand_kit: Optional[BrandKit],
        platform_context: Optional[PlatformContext],
        custom_input: Optional[str],
        template_version: str = "v1"
    ) -> ConstructedPrompt
    
    def sanitize_input(user_input: str) -> str
    def get_template(asset_type: AssetType, version: str) -> PromptTemplate
    
    @dataclass
    class ConstructedPrompt:
        full_prompt: str
        template_version: str
        injected_values: Dict[str, Any]
        quality_modifiers: List[str]
```


#### NanoBananaClient Interface
```python
class NanoBananaClient:
    async def generate_image(
        prompt: str,
        width: int,
        height: int,
        model: str = "gemini-2.5-flash"
    ) -> GeneratedImage
    
    async def generate_batch(
        requests: List[ImageRequest],
        max_concurrent: int = 5
    ) -> List[GeneratedImage]
    
    @dataclass
    class GeneratedImage:
        image_data: bytes
        format: str              # png, jpeg, webp
        width: int
        height: int
        generation_params: Dict[str, Any]
        
    # Retry configuration
    MAX_RETRIES = 3
    RETRY_DELAYS = [1, 2, 4]     # Exponential backoff in seconds
```

#### StorageService Interface
```python
class StorageService:
    async def upload_asset(
        image_data: bytes,
        asset_id: str,
        format: str
    ) -> StorageResult
    
    async def delete_asset(storage_key: str) -> None
    async def get_signed_url(storage_key: str, expires_in: int = 3600) -> str
    async def invalidate_cdn_cache(cdn_url: str) -> None
    
    @dataclass
    class StorageResult:
        storage_key: str         # S3 key
        cdn_url: str             # Public CDN URL
        shareable_url: str       # studio.domain.com/asset/{id}
```

#### ViralScorer Interface
```python
class ViralScorer:
    async def score_asset(asset: Asset) -> ViralScore
    async def get_suggestions(score: ViralScore) -> List[Suggestion]
    async def generate_variations(asset: Asset, count: int = 3) -> List[VariationSpec]
    
    @dataclass
    class ViralScore:
        overall: int             # 0-100
        components: Dict[str, int]  # text_readability, color_contrast, etc.
        computed_at: datetime
    
    @dataclass
    class Suggestion:
        category: str            # "text", "color", "composition"
        message: str             # Human-readable suggestion
        reasoning: str           # Why this improves CTR
        priority: int            # 1-5, higher = more impactful
```

---

### Frontend Component Patterns (TSX)

#### API Client Pattern
```typescript
// packages/api-client/src/client.ts
class APIClient {
  private baseUrl: string;
  private getToken: () => Promise<string | null>;
  
  constructor(config: APIClientConfig) {
    this.baseUrl = config.baseUrl;
    this.getToken = config.getToken;
  }
  
  async request<T>(
    method: string,
    path: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const token = await this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });
    
    if (!response.ok) {
      throw new APIError(await response.json());
    }
    
    return response.json();
  }
  
  // Typed methods
  auth = {
    signup: (data: SignupRequest) => this.request<User>('POST', '/auth/signup', { body: data }),
    login: (data: LoginRequest) => this.request<TokenPair>('POST', '/auth/login', { body: data }),
    logout: () => this.request<void>('POST', '/auth/logout'),
    me: () => this.request<User>('GET', '/auth/me'),
  };
  
  brandKits = {
    list: () => this.request<BrandKit[]>('GET', '/brand-kits'),
    create: (data: BrandKitCreate) => this.request<BrandKit>('POST', '/brand-kits', { body: data }),
    get: (id: string) => this.request<BrandKit>('GET', `/brand-kits/${id}`),
    update: (id: string, data: BrandKitUpdate) => this.request<BrandKit>('PUT', `/brand-kits/${id}`, { body: data }),
    delete: (id: string) => this.request<void>('DELETE', `/brand-kits/${id}`),
    activate: (id: string) => this.request<BrandKit>('POST', `/brand-kits/${id}/activate`),
  };
  
  generation = {
    create: (data: GenerationRequest) => this.request<GenerationJob>('POST', '/generate', { body: data }),
    createBatch: (data: BatchRequest) => this.request<GenerationJob>('POST', '/generate/batch', { body: data }),
    getJob: (id: string) => this.request<GenerationJob>('GET', `/jobs/${id}`),
    getJobAssets: (id: string) => this.request<Asset[]>('GET', `/jobs/${id}/assets`),
  };
  
  assets = {
    list: (params?: AssetFilters) => this.request<PaginatedList<Asset>>('GET', '/assets', { params }),
    get: (id: string) => this.request<Asset>('GET', `/assets/${id}`),
    delete: (id: string) => this.request<void>('DELETE', `/assets/${id}`),
    score: (id: string) => this.request<ViralScore>('POST', `/assets/${id}/score`),
  };
}
```


#### State Management Pattern (Zustand)
```typescript
// packages/shared/src/stores/authStore.ts
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  
  login: async (email, password) => {
    const { data } = await api.auth.login({ email, password });
    await tokenStorage.set(data.access_token, data.refresh_token);
    const { data: user } = await api.auth.me();
    set({ user, isAuthenticated: true });
  },
  
  logout: async () => {
    await api.auth.logout();
    await tokenStorage.clear();
    set({ user: null, isAuthenticated: false });
  },
  
  refreshUser: async () => {
    try {
      const { data: user } = await api.auth.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
```

#### Data Fetching Pattern (TanStack Query)
```typescript
// packages/api-client/src/hooks/useBrandKits.ts
export function useBrandKits() {
  return useQuery({
    queryKey: ['brandKits'],
    queryFn: () => api.brandKits.list(),
  });
}

export function useBrandKit(id: string) {
  return useQuery({
    queryKey: ['brandKits', id],
    queryFn: () => api.brandKits.get(id),
    enabled: !!id,
  });
}

export function useCreateBrandKit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: BrandKitCreate) => api.brandKits.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandKits'] });
    },
  });
}

// Generation with polling
export function useGenerationJob(jobId: string) {
  return useQuery({
    queryKey: ['jobs', jobId],
    queryFn: () => api.generation.getJob(jobId),
    refetchInterval: (data) => {
      // Poll every 2s while processing, stop when complete/failed
      if (data?.status === 'processing' || data?.status === 'queued') {
        return 2000;
      }
      return false;
    },
  });
}
```

---

### Frontend Component Patterns (Swift)

#### API Client Pattern (Swift)
```swift
// Core/Network/APIClient.swift
actor APIClient {
    private let baseURL: URL
    private let tokenProvider: TokenProvider
    
    init(baseURL: URL, tokenProvider: TokenProvider) {
        self.baseURL = baseURL
        self.tokenProvider = tokenProvider
    }
    
    func request<T: Decodable>(
        _ endpoint: Endpoint,
        responseType: T.Type
    ) async throws -> APIResponse<T> {
        var request = URLRequest(url: baseURL.appendingPathComponent(endpoint.path))
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = await tokenProvider.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = endpoint.body {
            request.httpBody = try JSONEncoder().encode(body)
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let error = try JSONDecoder().decode(APIErrorResponse.self, from: data)
            throw APIError.serverError(error)
        }
        
        return try JSONDecoder().decode(APIResponse<T>.self, from: data)
    }
}

// Endpoints
enum AuthEndpoint: Endpoint {
    case signup(SignupRequest)
    case login(LoginRequest)
    case logout
    case me
    
    var path: String {
        switch self {
        case .signup: return "/api/v1/auth/signup"
        case .login: return "/api/v1/auth/login"
        case .logout: return "/api/v1/auth/logout"
        case .me: return "/api/v1/auth/me"
        }
    }
    
    var method: HTTPMethod {
        switch self {
        case .signup, .login, .logout: return .post
        case .me: return .get
        }
    }
    
    var body: Encodable? {
        switch self {
        case .signup(let request): return request
        case .login(let request): return request
        default: return nil
        }
    }
}
```


#### State Management Pattern (Swift @Observable)
```swift
// Features/Auth/AuthViewModel.swift
@Observable
final class AuthViewModel {
    private let authService: AuthService
    
    var user: User?
    var isAuthenticated: Bool { user != nil }
    var isLoading = true
    var error: AuthError?
    
    init(authService: AuthService) {
        self.authService = authService
    }
    
    func login(email: String, password: String) async {
        do {
            let tokens = try await authService.login(email: email, password: password)
            try await TokenStorage.shared.save(tokens)
            user = try await authService.getCurrentUser()
        } catch let error as AuthError {
            self.error = error
        } catch {
            self.error = .unknown(error)
        }
    }
    
    func logout() async {
        do {
            try await authService.logout()
            try await TokenStorage.shared.clear()
            user = nil
        } catch {
            self.error = .unknown(error)
        }
    }
    
    func refreshUser() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            user = try await authService.getCurrentUser()
        } catch {
            user = nil
        }
    }
}
```

---

## Data Models

### Database Schema (Supabase/PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash TEXT,  -- NULL for OAuth-only users
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'studio')),
    subscription_status TEXT DEFAULT 'none' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'none')),
    stripe_customer_id TEXT,
    assets_generated_this_month INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brand kits table
CREATE TABLE brand_kits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    primary_colors TEXT[] NOT NULL,  -- Array of hex codes
    accent_colors TEXT[] DEFAULT '{}',
    fonts JSONB NOT NULL DEFAULT '{"headline": "Inter", "body": "Inter"}',
    logo_url TEXT,
    tone TEXT DEFAULT 'professional' CHECK (tone IN ('competitive', 'casual', 'educational', 'comedic', 'professional')),
    style_reference TEXT,
    extracted_from TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Only one active brand kit per user
    CONSTRAINT unique_active_brand_kit UNIQUE (user_id, is_active) 
        WHERE is_active = TRUE
);

-- Generation jobs table
CREATE TABLE generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_job_id UUID REFERENCES generation_jobs(id) ON DELETE CASCADE,
    
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'partial')),
    job_type TEXT DEFAULT 'single' CHECK (job_type IN ('single', 'batch', 'variation')),
    
    asset_type TEXT NOT NULL CHECK (asset_type IN ('thumbnail', 'overlay', 'banner', 'story_graphic', 'clip_cover')),
    custom_prompt TEXT,
    brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE SET NULL,
    platform_context JSONB,
    
    total_assets INTEGER DEFAULT 1,
    completed_assets INTEGER DEFAULT 0,
    failed_assets INTEGER DEFAULT 0,
    
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets table
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
    brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE SET NULL,
    
    asset_type TEXT NOT NULL CHECK (asset_type IN ('thumbnail', 'overlay', 'banner', 'story_graphic', 'clip_cover')),
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    format TEXT DEFAULT 'png' CHECK (format IN ('png', 'jpeg', 'webp')),
    
    cdn_url TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    shareable_url TEXT NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    
    prompt_used TEXT NOT NULL,
    generation_params JSONB NOT NULL,
    
    viral_score INTEGER CHECK (viral_score >= 0 AND viral_score <= 100),
    viral_suggestions TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ  -- NULL for paid tiers
);

-- Platform connections table
CREATE TABLE platform_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('twitch', 'youtube', 'tiktok')),
    
    platform_user_id TEXT NOT NULL,
    platform_username TEXT NOT NULL,
    
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    
    cached_metadata JSONB,
    metadata_updated_at TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (user_id, platform)
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'studio')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    
    assets_limit INTEGER NOT NULL,  -- 5, 100, or -1 (unlimited)
    assets_used INTEGER DEFAULT 0,
    platforms_limit INTEGER NOT NULL,  -- 1, 3, or -1 (unlimited)
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_brand_kits_user_id ON brand_kits(user_id);
CREATE INDEX idx_generation_jobs_user_id ON generation_jobs(user_id);
CREATE INDEX idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX idx_assets_user_id ON assets(user_id);
CREATE INDEX idx_assets_job_id ON assets(job_id);
CREATE INDEX idx_platform_connections_user_id ON platform_connections(user_id);
```


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: JWT Token Round-Trip
*For any* valid token payload (user_id, tier, expiration), encoding then decoding the JWT SHALL produce an equivalent payload.

```python
# Hypothesis property test
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

**Validates: Requirements 1.3, 1.4**

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

**Validates: Requirements 1.1, 14.6**

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

**Validates: Requirements 1.6**

### Property 4: Hex Color Validation
*For any* string, the hex color validator SHALL return True only for valid 6-digit hex codes (with or without #).

```python
@given(st.text(max_size=10))
def test_hex_validation_rejects_invalid(s):
    is_valid = is_valid_hex_color(s)
    if is_valid:
        # If valid, must match hex pattern
        assert re.match(r'^#?[0-9A-Fa-f]{6}$', s)

@given(st.from_regex(r'#[0-9A-Fa-f]{6}', fullmatch=True))
def test_hex_validation_accepts_valid(hex_color):
    assert is_valid_hex_color(hex_color) == True
```

**Validates: Requirements 2.7**

### Property 5: Brand Kit Serialization Round-Trip
*For any* valid BrandKit object, serializing to JSON then deserializing SHALL produce an equivalent object.

```python
@given(brand_kit=brand_kit_strategy())
def test_brand_kit_roundtrip(brand_kit):
    json_str = brand_kit.model_dump_json()
    restored = BrandKit.model_validate_json(json_str)
    assert restored == brand_kit
```

**Validates: Requirements 2.2, 2.3, 2.4**

### Property 6: Brand Kit Color Array Bounds
*For any* valid BrandKit, primary_colors SHALL have 1-5 elements and accent_colors SHALL have 0-3 elements.

```python
@given(brand_kit=brand_kit_strategy())
def test_brand_kit_color_bounds(brand_kit):
    assert 1 <= len(brand_kit.primary_colors) <= 5
    assert 0 <= len(brand_kit.accent_colors) <= 3
```

**Validates: Requirements 2.4**

### Property 7: Asset Dimensions Match Type
*For any* generated Asset, the width and height SHALL match the expected dimensions for its asset_type.

```python
EXPECTED_DIMENSIONS = {
    'thumbnail': (1280, 720),
    'overlay': (1920, 1080),
    'banner': (2560, 1440),
    'story_graphic': (1080, 1920),
    'clip_cover': (1280, 720),
}

@given(asset=asset_strategy())
def test_asset_dimensions_match_type(asset):
    expected = EXPECTED_DIMENSIONS[asset.asset_type]
    assert (asset.width, asset.height) == expected
```

**Validates: Requirements 3.5**

### Property 8: Prompt Contains Brand Kit Values
*For any* brand kit and asset type, the constructed prompt SHALL contain the brand kit's primary colors and tone.

```python
@given(
    brand_kit=brand_kit_strategy(),
    asset_type=st.sampled_from(['thumbnail', 'overlay', 'banner', 'story_graphic', 'clip_cover'])
)
def test_prompt_contains_brand_kit(brand_kit, asset_type):
    prompt = construct_prompt(asset_type, brand_kit, None, None)
    for color in brand_kit.primary_colors:
        assert color in prompt.full_prompt
    assert brand_kit.tone in prompt.full_prompt
```

**Validates: Requirements 2.5, 3.6, 9.2**

### Property 9: Job State Machine Validity
*For any* job status transition, the new status SHALL be a valid successor of the current status.

```python
VALID_TRANSITIONS = {
    'queued': ['processing', 'failed'],
    'processing': ['completed', 'failed', 'partial'],
    'completed': [],  # Terminal
    'failed': [],     # Terminal
    'partial': [],    # Terminal
}

@given(
    current_status=st.sampled_from(['queued', 'processing']),
    event=st.sampled_from(['start', 'complete', 'fail', 'partial_complete'])
)
def test_job_state_transitions(current_status, event):
    new_status = transition_job_status(current_status, event)
    assert new_status in VALID_TRANSITIONS[current_status]
```

**Validates: Requirements 3.4**


### Property 10: Batch Progress Calculation
*For any* batch job with N total assets, the progress percentage SHALL equal (completed + failed) / total * 100.

```python
@given(
    total=st.integers(min_value=1, max_value=15),
    completed=st.integers(min_value=0),
    failed=st.integers(min_value=0)
)
def test_batch_progress_calculation(total, completed, failed):
    assume(completed + failed <= total)
    job = GenerationJob(total_assets=total, completed_assets=completed, failed_assets=failed)
    expected_progress = (completed + failed) / total * 100
    assert job.progress_percent == expected_progress
```

**Validates: Requirements 4.7**

### Property 11: Batch Concurrent Limit
*For any* user, the number of concurrently processing jobs SHALL not exceed 5.

```python
@given(
    user_id=st.uuids().map(str),
    job_count=st.integers(min_value=1, max_value=20)
)
def test_batch_concurrent_limit(user_id, job_count):
    # Simulate creating jobs
    processing_count = count_processing_jobs(user_id)
    assert processing_count <= 5
```

**Validates: Requirements 4.3**

### Property 12: Batch Size Limit
*For any* batch request, the number of assets SHALL not exceed 15.

```python
@given(asset_count=st.integers(min_value=1, max_value=50))
def test_batch_size_limit(asset_count):
    assets = [GenerationRequest(asset_type='thumbnail') for _ in range(asset_count)]
    if asset_count > 15:
        with pytest.raises(ValidationError):
            BatchRequest(assets=assets)
    else:
        batch = BatchRequest(assets=assets)
        assert len(batch.assets) == asset_count
```

**Validates: Requirements 4.5**

### Property 13: Retry Count Limit
*For any* failed generation attempt, the retry count SHALL not exceed 3.

```python
@given(initial_retries=st.integers(min_value=0, max_value=10))
def test_retry_count_limit(initial_retries):
    job = GenerationJob(retry_count=initial_retries)
    if initial_retries < 3:
        job = increment_retry(job)
        assert job.retry_count == initial_retries + 1
    else:
        job = mark_failed(job)
        assert job.status == 'failed'
        assert job.retry_count == initial_retries
```

**Validates: Requirements 3.7**

### Property 14: Subscription Limit Enforcement
*For any* user with a subscription tier, generation SHALL be blocked when usage exceeds the tier limit (except Studio which is unlimited).

```python
@given(
    tier=st.sampled_from(['free', 'pro', 'studio']),
    usage=st.integers(min_value=0, max_value=200)
)
def test_subscription_limit_enforcement(tier, usage):
    limits = {'free': 5, 'pro': 100, 'studio': -1}
    limit = limits[tier]
    
    can_generate = check_can_generate(tier, usage)
    
    if limit == -1:  # Unlimited
        assert can_generate == True
    elif usage >= limit:
        assert can_generate == False
    else:
        assert can_generate == True
```

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 15: Viral Score Bounds
*For any* computed viral score, the value SHALL be between 0 and 100 inclusive.

```python
@given(asset=asset_strategy())
def test_viral_score_bounds(asset):
    score = compute_viral_score(asset)
    assert 0 <= score.overall <= 100
    for component_score in score.components.values():
        assert 0 <= component_score <= 100
```

**Validates: Requirements 7.1**

### Property 16: Low Score Generates Suggestions
*For any* viral score below 70, the system SHALL generate at least one improvement suggestion.

```python
@given(score=st.integers(min_value=0, max_value=69))
def test_low_score_generates_suggestions(score):
    viral_score = ViralScore(overall=score, components={})
    suggestions = get_suggestions(viral_score)
    assert len(suggestions) >= 1
```

**Validates: Requirements 7.3**

### Property 17: API Response Envelope Format
*For any* successful API response, the response SHALL contain 'data' and 'meta' keys with required fields.

```python
@given(data=st.dictionaries(st.text(), st.text()))
def test_api_response_envelope(data):
    response = create_api_response(data)
    assert 'data' in response
    assert 'meta' in response
    assert 'request_id' in response['meta']
    assert 'timestamp' in response['meta']
    # request_id should be valid UUID
    uuid.UUID(response['meta']['request_id'])
```

**Validates: Requirements 11.6**

### Property 18: Rate Limit Returns 429
*For any* request that exceeds the rate limit, the API SHALL return 429 with Retry-After header.

```python
@given(
    tier=st.sampled_from(['free', 'pro', 'studio']),
    request_count=st.integers(min_value=1, max_value=2000)
)
def test_rate_limit_returns_429(tier, request_count):
    limits = {'free': 60, 'pro': 300, 'studio': 1000}
    limit = limits[tier]
    
    response = simulate_requests(tier, request_count)
    
    if request_count > limit:
        assert response.status_code == 429
        assert 'Retry-After' in response.headers
    else:
        assert response.status_code != 429
```

**Validates: Requirements 11.5, 11.7**

### Property 19: PII Never in Logs
*For any* log entry, the content SHALL not contain email addresses, tokens, or passwords.

```python
@given(
    email=st.emails(),
    token=st.text(min_size=20, max_size=200),
    password=st.text(min_size=8, max_size=50)
)
def test_pii_never_in_logs(email, token, password):
    # Simulate logging with PII
    log_entry = create_log_entry(
        message="User action",
        context={"email": email, "token": token, "password": password}
    )
    
    assert email not in log_entry
    assert token not in log_entry
    assert password not in log_entry
    # Should contain redacted placeholders
    assert "[REDACTED]" in log_entry or "***" in log_entry
```

**Validates: Requirements 14.2**

### Property 20: OAuth Token Encryption Round-Trip
*For any* OAuth token, encrypting then decrypting SHALL produce the original token.

```python
@given(token=st.text(min_size=10, max_size=500))
def test_oauth_token_encryption_roundtrip(token):
    encrypted = encrypt_token(token)
    decrypted = decrypt_token(encrypted)
    assert decrypted == token
    # Encrypted should not contain original
    assert token not in encrypted
```

**Validates: Requirements 14.1**


---

## Error Handling

### Error Code Taxonomy

All errors follow this structure:
```typescript
interface APIError {
  error: {
    message: string;      // Human-readable
    code: string;         // Machine-readable (see below)
    details: object;      // Additional context
  };
  meta: {
    request_id: string;
    timestamp: string;
  };
}
```

### Error Codes by Domain

| Code | HTTP Status | Description |
|------|-------------|-------------|
| **Authentication** |
| `AUTH_INVALID_CREDENTIALS` | 401 | Email/password mismatch |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT token has expired |
| `AUTH_TOKEN_INVALID` | 401 | JWT signature invalid or malformed |
| `AUTH_REFRESH_INVALID` | 401 | Refresh token invalid or revoked |
| `AUTH_EMAIL_EXISTS` | 409 | Email already registered |
| `AUTH_EMAIL_NOT_VERIFIED` | 403 | Email verification required |
| **Authorization** |
| `AUTHZ_INSUFFICIENT_TIER` | 403 | Feature requires higher subscription tier |
| `AUTHZ_LIMIT_EXCEEDED` | 403 | Monthly asset limit reached |
| `AUTHZ_RESOURCE_FORBIDDEN` | 403 | User doesn't own this resource |
| **Validation** |
| `VALIDATION_FAILED` | 422 | Request body validation failed |
| `VALIDATION_HEX_COLOR` | 422 | Invalid hex color format |
| `VALIDATION_FONT_UNSUPPORTED` | 422 | Font not in supported list |
| `VALIDATION_BATCH_TOO_LARGE` | 422 | Batch exceeds 15 assets |
| **Resources** |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource doesn't exist |
| `RESOURCE_DELETED` | 410 | Resource was deleted |
| **Generation** |
| `GEN_QUEUE_FULL` | 503 | Generation queue at capacity |
| `GEN_API_ERROR` | 502 | Nano Banana API error |
| `GEN_TIMEOUT` | 504 | Generation timed out |
| `GEN_CONTENT_POLICY` | 400 | Prompt violates content policy |
| **Platform** |
| `PLATFORM_TOKEN_EXPIRED` | 401 | Platform OAuth token expired |
| `PLATFORM_API_ERROR` | 502 | Platform API returned error |
| `PLATFORM_NOT_CONNECTED` | 400 | Platform not connected |
| **Billing** |
| `BILLING_PAYMENT_FAILED` | 402 | Payment processing failed |
| `BILLING_CARD_DECLINED` | 402 | Card was declined |
| `BILLING_SUBSCRIPTION_INACTIVE` | 403 | Subscription not active |
| **Rate Limiting** |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| **Server** |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Error Handling Patterns

#### Backend (Python)
```python
# Custom exception classes
class StreamerStudioError(Exception):
    def __init__(self, code: str, message: str, details: dict = None, status_code: int = 400):
        self.code = code
        self.message = message
        self.details = details or {}
        self.status_code = status_code

class AuthError(StreamerStudioError):
    pass

class ValidationError(StreamerStudioError):
    pass

class ResourceNotFoundError(StreamerStudioError):
    def __init__(self, resource_type: str, resource_id: str):
        super().__init__(
            code="RESOURCE_NOT_FOUND",
            message=f"{resource_type} not found",
            details={"resource_type": resource_type, "resource_id": resource_id},
            status_code=404
        )

# Global exception handler
@app.exception_handler(StreamerStudioError)
async def handle_streamer_studio_error(request: Request, exc: StreamerStudioError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "message": exc.message,
                "code": exc.code,
                "details": exc.details if not IS_PRODUCTION else None
            },
            "meta": {
                "request_id": request.state.request_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    )
```

#### Frontend (TypeScript)
```typescript
// Error handling hook
function useAPIError() {
  const handleError = useCallback((error: unknown) => {
    if (error instanceof APIError) {
      switch (error.code) {
        case 'AUTH_TOKEN_EXPIRED':
          // Trigger token refresh
          authStore.refreshToken();
          break;
        case 'AUTHZ_LIMIT_EXCEEDED':
          // Show upgrade modal
          showUpgradeModal();
          break;
        case 'RATE_LIMIT_EXCEEDED':
          // Show rate limit message with retry time
          toast.error(`Too many requests. Try again in ${error.details.retryAfter}s`);
          break;
        default:
          toast.error(error.message);
      }
    } else {
      toast.error('An unexpected error occurred');
    }
  }, []);
  
  return { handleError };
}
```

---

## Testing Strategy

### Test Pyramid

```
                    ┌─────────────┐
                    │    E2E      │  5-10 tests
                    │   Tests     │  Critical journeys only
                    └──────┬──────┘
                           │
                ┌──────────┴──────────┐
                │   Integration       │  20-50 tests
                │      Tests          │  API + DB + External
                └──────────┬──────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │         Property Tests            │  50-100 properties
         │    (Hypothesis / fast-check)      │  100+ iterations each
         └─────────────────┬─────────────────┘
                           │
    ┌──────────────────────┴──────────────────────┐
    │              Unit Tests                      │  200+ tests
    │    Functions, Services, Components           │  80%+ coverage
    └──────────────────────────────────────────────┘
```

### Testing Tools by Platform

| Platform | Unit Tests | Property Tests | Integration | E2E |
|----------|------------|----------------|-------------|-----|
| Backend (Python) | pytest | Hypothesis | pytest + httpx | pytest + Playwright |
| TSX (TypeScript) | Vitest | fast-check | Vitest + MSW | Playwright |
| Swift | XCTest | SwiftCheck | XCTest | XCUITest |

### Property Test Configuration

```python
# conftest.py - Hypothesis settings
from hypothesis import settings, Verbosity

settings.register_profile("ci", max_examples=100, deadline=None)
settings.register_profile("dev", max_examples=20, deadline=None)
settings.register_profile("debug", max_examples=10, verbosity=Verbosity.verbose)

# Use CI profile in GitHub Actions
settings.load_profile(os.getenv("HYPOTHESIS_PROFILE", "dev"))
```

```typescript
// vitest.config.ts - fast-check settings
import { configureGlobal } from 'fast-check';

configureGlobal({
  numRuns: process.env.CI ? 100 : 20,
  verbose: process.env.DEBUG ? 2 : 0,
});
```

### Test Data Generators (Strategies)

```python
# tests/strategies.py
from hypothesis import strategies as st

def user_strategy():
    return st.builds(
        User,
        id=st.uuids().map(str),
        email=st.emails(),
        display_name=st.text(min_size=1, max_size=50),
        subscription_tier=st.sampled_from(['free', 'pro', 'studio']),
    )

def brand_kit_strategy():
    return st.builds(
        BrandKit,
        id=st.uuids().map(str),
        name=st.text(min_size=1, max_size=100),
        primary_colors=st.lists(
            st.from_regex(r'#[0-9A-Fa-f]{6}', fullmatch=True),
            min_size=1, max_size=5
        ),
        accent_colors=st.lists(
            st.from_regex(r'#[0-9A-Fa-f]{6}', fullmatch=True),
            min_size=0, max_size=3
        ),
        tone=st.sampled_from(['competitive', 'casual', 'educational', 'comedic', 'professional']),
    )

def generation_job_strategy():
    return st.builds(
        GenerationJob,
        id=st.uuids().map(str),
        status=st.sampled_from(['queued', 'processing', 'completed', 'failed', 'partial']),
        asset_type=st.sampled_from(['thumbnail', 'overlay', 'banner', 'story_graphic', 'clip_cover']),
        total_assets=st.integers(min_value=1, max_value=15),
    )
```

```typescript
// tests/arbitraries.ts
import * as fc from 'fast-check';

export const userArbitrary = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  displayName: fc.string({ minLength: 1, maxLength: 50 }),
  subscriptionTier: fc.constantFrom('free', 'pro', 'studio'),
});

export const brandKitArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  primaryColors: fc.array(
    fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
    { minLength: 1, maxLength: 5 }
  ),
  accentColors: fc.array(
    fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
    { minLength: 0, maxLength: 3 }
  ),
  tone: fc.constantFrom('competitive', 'casual', 'educational', 'comedic', 'professional'),
});
```


---

## Phase Implementation Details

### Phase 0: Foundation (Week 1)

#### Backend Setup
```bash
# Project structure
backend/
├── api/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   └── dependencies.py
├── tests/
│   └── conftest.py
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

```python
# api/main.py - Minimal FastAPI setup
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Streamer Studio API", version="0.1.0")

# Middleware stack (order matters)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "0.1.0",
        "timestamp": datetime.utcnow().isoformat()
    }
```

#### Database Migrations
```bash
# Run all migrations
supabase db push

# Verify tables created
supabase db dump --schema public
```

#### Design Token System (TSX)
```typescript
// packages/ui/src/tokens/colors.ts
export const colors = {
  // Brand colors (to be customized)
  primary: {
    50: '#f0fdf4',
    500: '#22c55e',  // Main
    600: '#16a34a',  // Hover
  },
  // ... rest of palette
};

// packages/ui/src/tokens/index.ts
export * from './colors';
export * from './spacing';
export * from './typography';
export * from './shadows';
```

#### Verification Gate 0 Checklist
- [ ] `docker-compose up` starts all services
- [ ] `/health` returns 200 with correct schema
- [ ] All database tables exist with correct columns
- [ ] TSX web builds without errors
- [ ] TSX mobile builds without errors
- [ ] Swift project compiles without errors

---

### Phase 1: Authentication (Week 2)

#### JWT Implementation
```python
# services/auth_service.py
from jose import jwt, JWTError
from datetime import datetime, timedelta

class AuthService:
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
    
    def create_access_token(self, user_id: str, tier: str) -> str:
        payload = {
            "sub": user_id,
            "tier": tier,
            "type": "access",
            "exp": datetime.utcnow() + timedelta(hours=24),
            "iat": datetime.utcnow(),
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def decode_token(self, token: str) -> dict:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise TokenExpiredError()
        except JWTError:
            raise TokenInvalidError()
```

#### Auth Middleware
```python
# api/middleware/auth.py
from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer(auto_error=False)

async def get_current_user(request: Request) -> str:
    # Try cookie first (web)
    token = request.cookies.get("access_token")
    
    # Fall back to header (mobile)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = auth_service.decode_token(token)
        return payload["sub"]
    except TokenExpiredError:
        raise HTTPException(status_code=401, detail="Token expired")
    except TokenInvalidError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

#### Phase 1 Property Tests
```python
# tests/properties/test_auth_properties.py
from hypothesis import given, strategies as st

@given(
    user_id=st.uuids().map(str),
    tier=st.sampled_from(['free', 'pro', 'studio'])
)
def test_jwt_roundtrip(user_id, tier):
    """Property 1: JWT encode/decode round-trip"""
    token = auth_service.create_access_token(user_id, tier)
    payload = auth_service.decode_token(token)
    assert payload["sub"] == user_id
    assert payload["tier"] == tier

@given(password=st.text(min_size=8, max_size=128))
def test_password_hash_roundtrip(password):
    """Property 2: Password hash verification"""
    hashed = hash_password(password)
    assert verify_password(password, hashed)
    assert not verify_password(password + "x", hashed)
```

#### Verification Gate 1 Checklist
- [ ] Property tests pass (100 iterations each)
- [ ] Unit tests for all auth endpoints pass
- [ ] Integration test: OAuth flow with mocked provider
- [ ] E2E test: Signup → Login → Access protected → Logout
- [ ] TSX: Auth screens functional
- [ ] Swift: Auth screens functional

---

### Phase 2: Brand Kit (Week 3)

#### Brand Kit Validation
```python
# api/schemas/brand_kit.py
from pydantic import BaseModel, field_validator
import re

HEX_PATTERN = re.compile(r'^#[0-9A-Fa-f]{6}$')
SUPPORTED_FONTS = ['Inter', 'Roboto', 'Montserrat', 'Open Sans', 'Poppins', ...]

class BrandKitCreate(BaseModel):
    name: str
    primary_colors: list[str]
    accent_colors: list[str] = []
    fonts: dict[str, str]
    tone: str
    
    @field_validator('primary_colors')
    @classmethod
    def validate_primary_colors(cls, v):
        if not 1 <= len(v) <= 5:
            raise ValueError('primary_colors must have 1-5 colors')
        for color in v:
            if not HEX_PATTERN.match(color):
                raise ValueError(f'Invalid hex color: {color}')
        return v
    
    @field_validator('fonts')
    @classmethod
    def validate_fonts(cls, v):
        for font in v.values():
            if font not in SUPPORTED_FONTS:
                raise ValueError(f'Unsupported font: {font}')
        return v
```

#### Phase 2 Property Tests
```python
# tests/properties/test_brand_kit_properties.py

@given(st.text(max_size=10))
def test_hex_validation_rejects_invalid(s):
    """Property 4: Hex color validation"""
    is_valid = HEX_PATTERN.match(s) is not None
    assert is_valid_hex_color(s) == is_valid

@given(brand_kit=brand_kit_strategy())
def test_brand_kit_serialization_roundtrip(brand_kit):
    """Property 5: Brand kit serialization round-trip"""
    json_str = brand_kit.model_dump_json()
    restored = BrandKit.model_validate_json(json_str)
    assert restored == brand_kit

@given(brand_kit=brand_kit_strategy())
def test_brand_kit_color_bounds(brand_kit):
    """Property 6: Brand kit color array bounds"""
    assert 1 <= len(brand_kit.primary_colors) <= 5
    assert 0 <= len(brand_kit.accent_colors) <= 3
```

#### Verification Gate 2 Checklist
- [ ] Property tests pass (100 iterations each)
- [ ] Unit tests for all brand kit endpoints pass
- [ ] Integration test: Upload → Extract → Create brand kit
- [ ] E2E test: Create → Activate → Verify in generation
- [ ] TSX: Brand kit UI functional
- [ ] Swift: Brand kit UI functional

---

### Phase 3-8: Subsequent Phases

Each subsequent phase follows the same pattern:
1. Implement backend services and endpoints
2. Write property tests for data transformations
3. Write unit tests for all functions
4. Write integration tests for workflows
5. Implement TSX UI components
6. Implement Swift UI components
7. Run verification gate checklist
8. Only proceed when all checks pass

Detailed implementation specs for Phases 3-8 will be created as child specs derived from this master schema.

---

## Parallel Development Strategy (TSX + Swift)

### Shared Contracts

Both TSX and Swift implementations MUST:
1. Use identical API endpoints (defined in this schema)
2. Use identical data models (field names, types, constraints)
3. Handle errors identically (same error codes, same user messages)
4. Implement identical business logic (validation, state management)

### Development Workflow

```
Week N:
├── Backend: Implement Phase N endpoints + tests
├── TSX: Implement Phase N UI + tests (parallel)
└── Swift: Implement Phase N UI + tests (parallel)

End of Week N:
├── All three pass verification gate
└── Proceed to Week N+1
```

### Contract Testing

```typescript
// Contract test: Ensure TSX models match API schema
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  display_name: z.string().min(1).max(50),
  subscription_tier: z.enum(['free', 'pro', 'studio']),
  // ... all fields from master schema
});

test('User model matches API contract', async () => {
  const response = await api.auth.me();
  expect(() => UserSchema.parse(response.data)).not.toThrow();
});
```

```swift
// Contract test: Ensure Swift models match API schema
func testUserModelMatchesContract() async throws {
    let response = try await api.auth.me()
    
    // Verify all required fields present
    XCTAssertNotNil(response.data.id)
    XCTAssertNotNil(response.data.email)
    XCTAssertNotNil(response.data.displayName)
    XCTAssertTrue(["free", "pro", "studio"].contains(response.data.subscriptionTier))
}
```

---

## Summary

This design document establishes:

1. **Architecture**: FastAPI backend + Supabase + Redis + S3, with TSX and Swift clients
2. **Data Models**: Canonical schemas for User, BrandKit, Asset, GenerationJob, etc.
3. **API Contracts**: RESTful endpoints with consistent response envelopes
4. **Correctness Properties**: 20 formal properties with Hypothesis/fast-check tests
5. **Error Handling**: Comprehensive error taxonomy with codes and handling patterns
6. **Testing Strategy**: Property tests, unit tests, integration tests, E2E tests
7. **Phase Implementation**: 8 phases with verification gates
8. **Parallel Development**: TSX + Swift with shared contracts

All child specs MUST derive from and conform to this master schema.


---

## Appendix A: Prompt Template System

### Template Architecture

Prompt templates are versioned, asset-type-specific structures with injectable placeholders. The system supports A/B testing different template versions.

```python
# services/prompt_engine.py

@dataclass
class PromptTemplate:
    id: str
    version: str                    # e.g., "v1.2"
    asset_type: AssetType
    base_template: str              # Template with {placeholders}
    required_placeholders: list[str]
    optional_placeholders: list[str]
    quality_modifiers: list[str]    # Always appended
    created_at: datetime
    is_active: bool

# Template storage structure
TEMPLATES_DIR = "prompts/"
# prompts/
# ├── thumbnail/
# │   ├── v1.0.yaml
# │   ├── v1.1.yaml
# │   └── v2.0.yaml
# ├── overlay/
# │   └── v1.0.yaml
# ├── banner/
# │   └── v1.0.yaml
# ├── story_graphic/
# │   └── v1.0.yaml
# └── clip_cover/
#     └── v1.0.yaml
```

### Template Schema (YAML)

```yaml
# prompts/thumbnail/v1.0.yaml
id: "thumbnail-v1.0"
version: "v1.0"
asset_type: "thumbnail"
is_active: true

base_template: |
  Create a viral YouTube thumbnail for a {game_category} video.
  
  Stream Context:
  - Title: {stream_title}
  - Mood: {tone}
  
  Brand Guidelines:
  - Primary colors: {primary_colors}
  - Accent colors: {accent_colors}
  - Style: {style_reference}
  
  Custom Instructions:
  {custom_input}
  
  Visual Requirements:
  - Large, bold text that is readable at 60px
  - High contrast between text and background
  - {face_instruction}
  - Dynamic composition with clear focal point

required_placeholders:
  - game_category
  - stream_title
  - tone
  - primary_colors

optional_placeholders:
  - accent_colors
  - style_reference
  - custom_input
  - face_instruction

quality_modifiers:
  - "4K resolution (1280x720 scaled up)"
  - "Professional streaming aesthetic"
  - "Text must be crisp and readable"
  - "Photorealistic quality"
  - "Trending YouTube gaming style 2025"

defaults:
  accent_colors: "complementary to primary"
  style_reference: "bold and energetic"
  custom_input: ""
  face_instruction: "Include expressive reaction if faces are present"
```

### Prompt Construction Flow

```python
class PromptEngine:
    def __init__(self, templates_dir: str = "prompts/"):
        self.templates_dir = templates_dir
        self.templates: dict[str, PromptTemplate] = {}
        self._load_templates()
    
    def construct_prompt(
        self,
        asset_type: AssetType,
        brand_kit: Optional[BrandKit],
        platform_context: Optional[PlatformContext],
        custom_input: Optional[str],
        template_version: Optional[str] = None
    ) -> ConstructedPrompt:
        # Get template (active version or specified)
        template = self._get_template(asset_type, template_version)
        
        # Build placeholder values
        values = self._build_values(brand_kit, platform_context, custom_input, template)
        
        # Construct prompt
        prompt = template.base_template.format(**values)
        
        # Append quality modifiers
        prompt += "\n\nQuality Requirements:\n"
        prompt += "\n".join(f"- {mod}" for mod in template.quality_modifiers)
        
        # Sanitize final prompt
        prompt = self._sanitize(prompt)
        
        return ConstructedPrompt(
            full_prompt=prompt,
            template_id=template.id,
            template_version=template.version,
            injected_values=values,
            quality_modifiers=template.quality_modifiers
        )
    
    def _build_values(
        self,
        brand_kit: Optional[BrandKit],
        platform_context: Optional[PlatformContext],
        custom_input: Optional[str],
        template: PromptTemplate
    ) -> dict:
        values = {}
        
        # From brand kit
        if brand_kit:
            values["primary_colors"] = ", ".join(brand_kit.primary_colors)
            values["accent_colors"] = ", ".join(brand_kit.accent_colors) if brand_kit.accent_colors else template.defaults.get("accent_colors", "")
            values["tone"] = brand_kit.tone
            values["style_reference"] = brand_kit.style_reference or template.defaults.get("style_reference", "")
        else:
            # Use defaults for no brand kit
            values["primary_colors"] = "#FF0000, #0066FF"  # Default gaming colors
            values["tone"] = "competitive"
            values["accent_colors"] = template.defaults.get("accent_colors", "")
            values["style_reference"] = template.defaults.get("style_reference", "")
        
        # From platform context
        if platform_context:
            values["game_category"] = platform_context.game_category or "gaming"
            values["stream_title"] = platform_context.stream_title or "Epic Gaming Moment"
        else:
            values["game_category"] = "gaming"
            values["stream_title"] = "Epic Gaming Moment"
        
        # Custom input
        values["custom_input"] = self._sanitize_input(custom_input) if custom_input else ""
        
        # Apply remaining defaults
        for placeholder in template.optional_placeholders:
            if placeholder not in values:
                values[placeholder] = template.defaults.get(placeholder, "")
        
        return values
    
    def _sanitize_input(self, user_input: str) -> str:
        """Sanitize user input to prevent prompt injection."""
        # Remove potential injection patterns
        dangerous_patterns = [
            "ignore previous instructions",
            "disregard above",
            "new instructions:",
            "system:",
            "assistant:",
        ]
        sanitized = user_input.lower()
        for pattern in dangerous_patterns:
            if pattern in sanitized:
                return "[Custom input removed - policy violation]"
        
        # Limit length
        return user_input[:500]
    
    def _sanitize(self, prompt: str) -> str:
        """Final sanitization of constructed prompt."""
        # Remove excessive whitespace
        prompt = re.sub(r'\n{3,}', '\n\n', prompt)
        prompt = re.sub(r' {2,}', ' ', prompt)
        return prompt.strip()
```

### Template Versioning and A/B Testing

```python
# Database table for template analytics
"""
CREATE TABLE prompt_template_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id TEXT NOT NULL,
    template_version TEXT NOT NULL,
    asset_id UUID REFERENCES assets(id),
    viral_score INTEGER,
    user_rating INTEGER,  -- 1-5 stars
    created_at TIMESTAMPTZ DEFAULT NOW()
);
"""

class TemplateAnalytics:
    async def record_generation(self, template_id: str, version: str, asset_id: str):
        """Record that a template was used for generation."""
        pass
    
    async def record_score(self, asset_id: str, viral_score: int):
        """Record viral score for template effectiveness tracking."""
        pass
    
    async def get_template_performance(self, template_id: str) -> dict:
        """Get average viral score and usage count per version."""
        pass
```

---

## Appendix B: Nano Banana Pro API Contract

### API Overview

Nano Banana Pro is Google's Gemini 2.5 Flash model optimized for image generation with superior text rendering.

```python
# services/nano_banana_client.py

@dataclass
class NanoBananaConfig:
    api_key: str
    model: str = "gemini-2.5-flash-preview"  # Nano Banana Pro
    base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    max_retries: int = 3
    retry_delays: list[float] = field(default_factory=lambda: [1.0, 2.0, 4.0])
    timeout: float = 120.0  # 2 minutes for image generation
    
class NanoBananaClient:
    def __init__(self, config: NanoBananaConfig):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def generate_image(
        self,
        prompt: str,
        width: int,
        height: int,
        response_format: str = "png"
    ) -> GeneratedImage:
        """
        Generate a single image using Nano Banana Pro.
        
        Args:
            prompt: The generation prompt
            width: Image width (must match asset type dimensions)
            height: Image height (must match asset type dimensions)
            response_format: Output format (png, jpeg, webp)
        
        Returns:
            GeneratedImage with image data and metadata
        
        Raises:
            NanoBananaAPIError: On API errors
            NanoBananaRateLimitError: On rate limit (429)
            NanoBananaContentPolicyError: On content policy violation
        """
        request_body = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "responseModalities": ["IMAGE"],
                "imageDimensions": {
                    "width": width,
                    "height": height
                }
            },
            "safetySettings": [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            ]
        }
        
        url = f"{self.config.base_url}/models/{self.config.model}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.config.api_key
        }
        
        for attempt in range(self.config.max_retries):
            try:
                async with self.session.post(url, json=request_body, headers=headers, timeout=self.config.timeout) as response:
                    if response.status == 200:
                        data = await response.json()
                        return self._parse_response(data, response_format)
                    elif response.status == 429:
                        if attempt < self.config.max_retries - 1:
                            await asyncio.sleep(self.config.retry_delays[attempt])
                            continue
                        raise NanoBananaRateLimitError("Rate limit exceeded")
                    elif response.status == 400:
                        error_data = await response.json()
                        if "SAFETY" in str(error_data):
                            raise NanoBananaContentPolicyError("Content policy violation")
                        raise NanoBananaAPIError(f"Bad request: {error_data}")
                    else:
                        raise NanoBananaAPIError(f"API error: {response.status}")
            except asyncio.TimeoutError:
                if attempt < self.config.max_retries - 1:
                    continue
                raise NanoBananaAPIError("Request timeout")
        
        raise NanoBananaAPIError("Max retries exceeded")
    
    def _parse_response(self, data: dict, response_format: str) -> GeneratedImage:
        """Parse API response and extract image data."""
        candidates = data.get("candidates", [])
        if not candidates:
            raise NanoBananaAPIError("No candidates in response")
        
        content = candidates[0].get("content", {})
        parts = content.get("parts", [])
        
        for part in parts:
            if "inlineData" in part:
                image_data = base64.b64decode(part["inlineData"]["data"])
                mime_type = part["inlineData"]["mimeType"]
                
                return GeneratedImage(
                    image_data=image_data,
                    format=mime_type.split("/")[1],
                    generation_params={
                        "model": self.config.model,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )
        
        raise NanoBananaAPIError("No image data in response")
```

### Batch Generation

```python
async def generate_batch(
    self,
    requests: list[ImageRequest],
    max_concurrent: int = 5
) -> list[GeneratedImage | NanoBananaAPIError]:
    """
    Generate multiple images concurrently.
    
    Args:
        requests: List of image generation requests
        max_concurrent: Maximum concurrent API calls (default 5)
    
    Returns:
        List of GeneratedImage or errors for each request
    """
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def generate_with_semaphore(request: ImageRequest) -> GeneratedImage | NanoBananaAPIError:
        async with semaphore:
            try:
                return await self.generate_image(
                    prompt=request.prompt,
                    width=request.width,
                    height=request.height,
                    response_format=request.format
                )
            except NanoBananaAPIError as e:
                return e
    
    tasks = [generate_with_semaphore(req) for req in requests]
    return await asyncio.gather(*tasks)
```

### Rate Limits and Pricing (Nano Banana Pro)

```python
# Rate limits (per minute)
RATE_LIMITS = {
    "requests_per_minute": 60,
    "images_per_minute": 60,
    "tokens_per_minute": 1_000_000,
}

# Pricing (as of Dec 2025)
PRICING = {
    "per_image_standard": 0.04,    # $0.04 per image (standard)
    "per_image_4k": 0.08,          # $0.08 per 4K image
    "batch_discount": 0.5,          # 50% discount for batch (5+ images)
}
```


---

## Appendix C: Platform API Integration (Twitch & YouTube)

### Getting API Credentials

#### Twitch API Setup

1. **Create Twitch Developer Application**
   - Go to: https://dev.twitch.tv/console/apps
   - Click "Register Your Application"
   - Fill in:
     - Name: "Streamer Studio"
     - OAuth Redirect URLs: `https://api.streamerstudio.com/api/v1/platforms/twitch/callback`
     - Category: "Application Integration"
   - Save and note your **Client ID** and **Client Secret**

2. **Required Scopes**
   ```
   user:read:email          # Get user email
   channel:read:stream_key  # Not needed, but useful
   clips:read               # Read clips
   user:read:broadcast      # Read broadcast info
   ```

3. **Environment Variables**
   ```bash
   TWITCH_CLIENT_ID=your_client_id
   TWITCH_CLIENT_SECRET=your_client_secret
   TWITCH_REDIRECT_URI=https://api.streamerstudio.com/api/v1/platforms/twitch/callback
   ```

#### YouTube API Setup

1. **Create Google Cloud Project**
   - Go to: https://console.cloud.google.com/
   - Create new project: "Streamer Studio"
   - Enable YouTube Data API v3

2. **Create OAuth 2.0 Credentials**
   - Go to: APIs & Services → Credentials
   - Create OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs: `https://api.streamerstudio.com/api/v1/platforms/youtube/callback`
   - Note your **Client ID** and **Client Secret**

3. **Required Scopes**
   ```
   https://www.googleapis.com/auth/youtube.readonly
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   ```

4. **Environment Variables**
   ```bash
   YOUTUBE_CLIENT_ID=your_client_id
   YOUTUBE_CLIENT_SECRET=your_client_secret
   YOUTUBE_REDIRECT_URI=https://api.streamerstudio.com/api/v1/platforms/youtube/callback
   ```

### Twitch API Client

```python
# services/platform_clients/twitch_client.py

@dataclass
class TwitchConfig:
    client_id: str
    client_secret: str
    redirect_uri: str
    base_url: str = "https://api.twitch.tv/helix"
    auth_url: str = "https://id.twitch.tv/oauth2"

class TwitchClient:
    def __init__(self, config: TwitchConfig):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
    
    def get_oauth_url(self, state: str) -> str:
        """Generate OAuth authorization URL."""
        params = {
            "client_id": self.config.client_id,
            "redirect_uri": self.config.redirect_uri,
            "response_type": "code",
            "scope": "user:read:email clips:read user:read:broadcast",
            "state": state,
        }
        return f"{self.config.auth_url}/authorize?{urlencode(params)}"
    
    async def exchange_code(self, code: str) -> TwitchTokens:
        """Exchange authorization code for tokens."""
        async with self.session.post(
            f"{self.config.auth_url}/token",
            data={
                "client_id": self.config.client_id,
                "client_secret": self.config.client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": self.config.redirect_uri,
            }
        ) as response:
            data = await response.json()
            return TwitchTokens(
                access_token=data["access_token"],
                refresh_token=data["refresh_token"],
                expires_in=data["expires_in"],
            )
    
    async def refresh_tokens(self, refresh_token: str) -> TwitchTokens:
        """Refresh expired tokens."""
        async with self.session.post(
            f"{self.config.auth_url}/token",
            data={
                "client_id": self.config.client_id,
                "client_secret": self.config.client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            }
        ) as response:
            data = await response.json()
            return TwitchTokens(
                access_token=data["access_token"],
                refresh_token=data["refresh_token"],
                expires_in=data["expires_in"],
            )
    
    async def get_user(self, access_token: str) -> TwitchUser:
        """Get authenticated user info."""
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Client-Id": self.config.client_id,
        }
        async with self.session.get(f"{self.config.base_url}/users", headers=headers) as response:
            data = await response.json()
            user_data = data["data"][0]
            return TwitchUser(
                id=user_data["id"],
                login=user_data["login"],
                display_name=user_data["display_name"],
                profile_image_url=user_data["profile_image_url"],
                email=user_data.get("email"),
            )
    
    async def get_channel_info(self, access_token: str, broadcaster_id: str) -> TwitchChannelInfo:
        """Get channel information."""
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Client-Id": self.config.client_id,
        }
        async with self.session.get(
            f"{self.config.base_url}/channels",
            params={"broadcaster_id": broadcaster_id},
            headers=headers
        ) as response:
            data = await response.json()
            channel = data["data"][0]
            return TwitchChannelInfo(
                broadcaster_id=channel["broadcaster_id"],
                broadcaster_name=channel["broadcaster_name"],
                game_name=channel["game_name"],
                game_id=channel["game_id"],
                title=channel["title"],
                broadcaster_language=channel["broadcaster_language"],
            )
    
    async def get_clips(
        self,
        access_token: str,
        broadcaster_id: str,
        first: int = 10,
        started_at: Optional[datetime] = None
    ) -> list[TwitchClip]:
        """Get top clips for a channel."""
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Client-Id": self.config.client_id,
        }
        params = {
            "broadcaster_id": broadcaster_id,
            "first": first,
        }
        if started_at:
            params["started_at"] = started_at.isoformat() + "Z"
        
        async with self.session.get(
            f"{self.config.base_url}/clips",
            params=params,
            headers=headers
        ) as response:
            data = await response.json()
            return [
                TwitchClip(
                    id=clip["id"],
                    url=clip["url"],
                    title=clip["title"],
                    view_count=clip["view_count"],
                    thumbnail_url=clip["thumbnail_url"],
                    created_at=clip["created_at"],
                    game_id=clip["game_id"],
                )
                for clip in data["data"]
            ]
    
    async def get_stream(self, access_token: str, user_id: str) -> Optional[TwitchStream]:
        """Get current live stream info (if live)."""
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Client-Id": self.config.client_id,
        }
        async with self.session.get(
            f"{self.config.base_url}/streams",
            params={"user_id": user_id},
            headers=headers
        ) as response:
            data = await response.json()
            if not data["data"]:
                return None
            stream = data["data"][0]
            return TwitchStream(
                id=stream["id"],
                user_id=stream["user_id"],
                game_name=stream["game_name"],
                title=stream["title"],
                viewer_count=stream["viewer_count"],
                started_at=stream["started_at"],
                thumbnail_url=stream["thumbnail_url"],
            )
```

### YouTube API Client

```python
# services/platform_clients/youtube_client.py

@dataclass
class YouTubeConfig:
    client_id: str
    client_secret: str
    redirect_uri: str
    base_url: str = "https://www.googleapis.com/youtube/v3"
    auth_url: str = "https://accounts.google.com/o/oauth2"
    token_url: str = "https://oauth2.googleapis.com/token"

class YouTubeClient:
    def __init__(self, config: YouTubeConfig):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
    
    def get_oauth_url(self, state: str) -> str:
        """Generate OAuth authorization URL."""
        params = {
            "client_id": self.config.client_id,
            "redirect_uri": self.config.redirect_uri,
            "response_type": "code",
            "scope": "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.email",
            "state": state,
            "access_type": "offline",
            "prompt": "consent",
        }
        return f"{self.config.auth_url}/auth?{urlencode(params)}"
    
    async def exchange_code(self, code: str) -> YouTubeTokens:
        """Exchange authorization code for tokens."""
        async with self.session.post(
            self.config.token_url,
            data={
                "client_id": self.config.client_id,
                "client_secret": self.config.client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": self.config.redirect_uri,
            }
        ) as response:
            data = await response.json()
            return YouTubeTokens(
                access_token=data["access_token"],
                refresh_token=data.get("refresh_token"),
                expires_in=data["expires_in"],
            )
    
    async def refresh_tokens(self, refresh_token: str) -> YouTubeTokens:
        """Refresh expired tokens."""
        async with self.session.post(
            self.config.token_url,
            data={
                "client_id": self.config.client_id,
                "client_secret": self.config.client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            }
        ) as response:
            data = await response.json()
            return YouTubeTokens(
                access_token=data["access_token"],
                refresh_token=refresh_token,  # Refresh token doesn't change
                expires_in=data["expires_in"],
            )
    
    async def get_channel(self, access_token: str) -> YouTubeChannel:
        """Get authenticated user's channel info."""
        headers = {"Authorization": f"Bearer {access_token}"}
        params = {
            "part": "snippet,statistics,brandingSettings",
            "mine": "true",
        }
        async with self.session.get(
            f"{self.config.base_url}/channels",
            params=params,
            headers=headers
        ) as response:
            data = await response.json()
            channel = data["items"][0]
            return YouTubeChannel(
                id=channel["id"],
                title=channel["snippet"]["title"],
                description=channel["snippet"]["description"],
                custom_url=channel["snippet"].get("customUrl"),
                thumbnail_url=channel["snippet"]["thumbnails"]["high"]["url"],
                banner_url=channel["brandingSettings"]["image"].get("bannerExternalUrl"),
                subscriber_count=int(channel["statistics"]["subscriberCount"]),
                video_count=int(channel["statistics"]["videoCount"]),
                view_count=int(channel["statistics"]["viewCount"]),
            )
    
    async def get_recent_videos(
        self,
        access_token: str,
        channel_id: str,
        max_results: int = 10
    ) -> list[YouTubeVideo]:
        """Get recent videos from channel."""
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # First, get video IDs from search
        search_params = {
            "part": "id",
            "channelId": channel_id,
            "order": "date",
            "type": "video",
            "maxResults": max_results,
        }
        async with self.session.get(
            f"{self.config.base_url}/search",
            params=search_params,
            headers=headers
        ) as response:
            search_data = await response.json()
            video_ids = [item["id"]["videoId"] for item in search_data.get("items", [])]
        
        if not video_ids:
            return []
        
        # Then, get full video details
        video_params = {
            "part": "snippet,statistics",
            "id": ",".join(video_ids),
        }
        async with self.session.get(
            f"{self.config.base_url}/videos",
            params=video_params,
            headers=headers
        ) as response:
            video_data = await response.json()
            return [
                YouTubeVideo(
                    id=video["id"],
                    title=video["snippet"]["title"],
                    description=video["snippet"]["description"],
                    thumbnail_url=video["snippet"]["thumbnails"]["high"]["url"],
                    published_at=video["snippet"]["publishedAt"],
                    tags=video["snippet"].get("tags", []),
                    view_count=int(video["statistics"].get("viewCount", 0)),
                    like_count=int(video["statistics"].get("likeCount", 0)),
                    comment_count=int(video["statistics"].get("commentCount", 0)),
                )
                for video in video_data.get("items", [])
            ]
```

### Platform Metadata Caching

```python
# services/platform_service.py

class PlatformService:
    def __init__(
        self,
        twitch_client: TwitchClient,
        youtube_client: YouTubeClient,
        db: SupabaseClient,
        encryption: EncryptionService
    ):
        self.twitch = twitch_client
        self.youtube = youtube_client
        self.db = db
        self.encryption = encryption
    
    async def get_cached_metadata(
        self,
        user_id: str,
        platform: str,
        max_age_minutes: int = 30
    ) -> Optional[dict]:
        """Get cached platform metadata, refresh if stale."""
        connection = await self.db.get_platform_connection(user_id, platform)
        if not connection:
            return None
        
        # Check if cache is fresh
        if connection.metadata_updated_at:
            age = datetime.utcnow() - connection.metadata_updated_at
            if age.total_seconds() < max_age_minutes * 60:
                return connection.cached_metadata
        
        # Refresh metadata
        try:
            metadata = await self._fetch_fresh_metadata(connection)
            await self.db.update_platform_metadata(connection.id, metadata)
            return metadata
        except Exception as e:
            # Return stale cache on error
            logger.warning(f"Failed to refresh {platform} metadata: {e}")
            return connection.cached_metadata
    
    async def _fetch_fresh_metadata(self, connection: PlatformConnection) -> dict:
        """Fetch fresh metadata from platform API."""
        access_token = self.encryption.decrypt(connection.access_token_encrypted)
        
        # Check if token needs refresh
        if datetime.utcnow() >= connection.token_expires_at - timedelta(minutes=5):
            refresh_token = self.encryption.decrypt(connection.refresh_token_encrypted)
            tokens = await self._refresh_platform_tokens(connection.platform, refresh_token)
            access_token = tokens.access_token
            # Update stored tokens
            await self._update_stored_tokens(connection.id, tokens)
        
        if connection.platform == "twitch":
            return await self._fetch_twitch_metadata(access_token, connection.platform_user_id)
        elif connection.platform == "youtube":
            return await self._fetch_youtube_metadata(access_token, connection.platform_user_id)
        else:
            raise ValueError(f"Unknown platform: {connection.platform}")
```


---

## Appendix D: Supabase Storage Configuration

### Bucket Structure

```sql
-- Create storage buckets via Supabase Dashboard or SQL

-- Public bucket for generated assets (CDN-served)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'assets',
    'assets',
    true,
    52428800,  -- 50MB max
    ARRAY['image/png', 'image/jpeg', 'image/webp']
);

-- Private bucket for user uploads (brand kit source files)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'uploads',
    'uploads',
    false,
    104857600,  -- 100MB max
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/quicktime']
);

-- Private bucket for user logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'logos',
    'logos',
    false,
    10485760,  -- 10MB max
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
);
```

### Storage Policies (Row Level Security)

```sql
-- Assets bucket: Public read, authenticated write (own assets only)
CREATE POLICY "Public asset read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

CREATE POLICY "Users can upload own assets"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own assets"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Uploads bucket: Private, owner only
CREATE POLICY "Users can access own uploads"
ON storage.objects FOR ALL
USING (
    bucket_id = 'uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Logos bucket: Private, owner only
CREATE POLICY "Users can access own logos"
ON storage.objects FOR ALL
USING (
    bucket_id = 'logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
```

### URL Patterns

```python
# services/storage_service.py

@dataclass
class SupabaseStorageConfig:
    url: str                    # https://xxx.supabase.co
    service_key: str            # Service role key for server-side ops
    anon_key: str               # Anon key for client-side
    
class StorageService:
    def __init__(self, config: SupabaseStorageConfig):
        self.config = config
        self.client = create_client(config.url, config.service_key)
    
    # URL Patterns:
    # Public assets:  {SUPABASE_URL}/storage/v1/object/public/assets/{user_id}/{asset_id}.{format}
    # Signed URLs:    {SUPABASE_URL}/storage/v1/object/sign/uploads/{user_id}/{file_id}?token=xxx
    # Shareable:      https://studio.streamerstudio.com/asset/{asset_id}
    
    def get_public_url(self, bucket: str, path: str) -> str:
        """Get public URL for an object."""
        return f"{self.config.url}/storage/v1/object/public/{bucket}/{path}"
    
    async def get_signed_url(self, bucket: str, path: str, expires_in: int = 3600) -> str:
        """Get signed URL for private object."""
        response = self.client.storage.from_(bucket).create_signed_url(path, expires_in)
        return response["signedURL"]
    
    async def upload_asset(
        self,
        user_id: str,
        asset_id: str,
        image_data: bytes,
        format: str = "png"
    ) -> StorageResult:
        """Upload generated asset to public bucket."""
        path = f"{user_id}/{asset_id}.{format}"
        
        # Upload to Supabase Storage
        self.client.storage.from_("assets").upload(
            path,
            image_data,
            {"content-type": f"image/{format}"}
        )
        
        # Generate URLs
        cdn_url = self.get_public_url("assets", path)
        shareable_url = f"https://studio.streamerstudio.com/asset/{asset_id}"
        
        return StorageResult(
            storage_key=f"assets/{path}",
            cdn_url=cdn_url,
            shareable_url=shareable_url
        )
    
    async def upload_logo(
        self,
        user_id: str,
        file_data: bytes,
        filename: str
    ) -> str:
        """Upload user logo to private bucket, return signed URL."""
        file_id = str(uuid.uuid4())
        ext = filename.split(".")[-1]
        path = f"{user_id}/{file_id}.{ext}"
        
        self.client.storage.from_("logos").upload(
            path,
            file_data,
            {"content-type": f"image/{ext}"}
        )
        
        # Return long-lived signed URL (30 days)
        return await self.get_signed_url("logos", path, expires_in=2592000)
    
    async def delete_asset(self, storage_key: str) -> None:
        """Delete asset from storage."""
        bucket, path = storage_key.split("/", 1)
        self.client.storage.from_(bucket).remove([path])
    
    async def upload_brand_kit_source(
        self,
        user_id: str,
        files: list[UploadFile]
    ) -> list[str]:
        """Upload source files for brand kit extraction."""
        urls = []
        for file in files:
            file_id = str(uuid.uuid4())
            ext = file.filename.split(".")[-1]
            path = f"{user_id}/brand-kit-sources/{file_id}.{ext}"
            
            content = await file.read()
            self.client.storage.from_("uploads").upload(
                path,
                content,
                {"content-type": file.content_type}
            )
            
            # Signed URL for processing (1 hour)
            url = await self.get_signed_url("uploads", path, expires_in=3600)
            urls.append(url)
        
        return urls
```

### CDN and Caching

```python
# Supabase Storage automatically serves from CDN with these headers:
# Cache-Control: public, max-age=31536000, immutable (for public bucket)

# For custom cache control, use transformations:
def get_optimized_url(self, cdn_url: str, width: int = None, quality: int = 80) -> str:
    """Get optimized/transformed image URL."""
    # Supabase image transformations
    params = []
    if width:
        params.append(f"width={width}")
    params.append(f"quality={quality}")
    
    if params:
        return f"{cdn_url}?{('&').join(params)}"
    return cdn_url
```

---

## Appendix E: Enterprise Component Library (2025)

### Design Token System

```typescript
// packages/ui/src/tokens/index.ts

export const tokens = {
  // Color Palette - Streamer Studio Brand
  colors: {
    // Primary - Electric Purple (Gaming/Creator vibe)
    primary: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',  // Main
      600: '#9333ea',  // Hover
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87',
    },
    
    // Accent - Neon Cyan (Energy/Action)
    accent: {
      50: '#ecfeff',
      100: '#cffafe',
      200: '#a5f3fc',
      300: '#67e8f9',
      400: '#22d3ee',
      500: '#06b6d4',  // Main
      600: '#0891b2',  // Hover
      700: '#0e7490',
      800: '#155e75',
      900: '#164e63',
    },
    
    // Semantic
    success: {
      light: '#86efac',
      main: '#22c55e',
      dark: '#16a34a',
    },
    warning: {
      light: '#fde047',
      main: '#eab308',
      dark: '#ca8a04',
    },
    error: {
      light: '#fca5a5',
      main: '#ef4444',
      dark: '#dc2626',
    },
    
    // Backgrounds (Dark Theme)
    background: {
      base: '#09090b',      // Zinc 950
      surface: '#18181b',   // Zinc 900
      elevated: '#27272a',  // Zinc 800
      card: '#3f3f46',      // Zinc 700
    },
    
    // Text
    text: {
      primary: '#fafafa',   // Zinc 50
      secondary: '#a1a1aa', // Zinc 400
      tertiary: '#71717a',  // Zinc 500
      muted: '#52525b',     // Zinc 600
    },
    
    // Borders
    border: {
      default: '#3f3f46',   // Zinc 700
      subtle: '#27272a',    // Zinc 800
      focus: '#a855f7',     // Primary 500
    },
  },
  
  // Typography
  typography: {
    fontFamily: {
      sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", monospace',
      display: '"Cal Sans", "Inter", sans-serif',  // For headlines
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
      '6xl': '3.75rem', // 60px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    lineHeight: {
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
    },
  },
  
  // Spacing (8px grid)
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
  },
  
  // Border Radius
  radius: {
    none: '0',
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    glow: {
      primary: '0 0 20px rgba(168, 85, 247, 0.4)',
      accent: '0 0 20px rgba(6, 182, 212, 0.4)',
    },
  },
  
  // Animation
  animation: {
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },
  
  // Z-Index
  zIndex: {
    dropdown: 1000,
    sticky: 1100,
    modal: 1200,
    popover: 1300,
    tooltip: 1400,
    toast: 1500,
  },
  
  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};
```


### Core Component Specifications

#### Button Component

```typescript
// packages/ui/src/components/Button/Button.tsx

interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  isDisabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

// Size specifications
const sizes = {
  xs: { height: 28, px: 8, fontSize: 12, iconSize: 14 },
  sm: { height: 32, px: 12, fontSize: 14, iconSize: 16 },
  md: { height: 40, px: 16, fontSize: 14, iconSize: 18 },
  lg: { height: 48, px: 20, fontSize: 16, iconSize: 20 },
  xl: { height: 56, px: 24, fontSize: 18, iconSize: 22 },
};

// Variant styles
const variants = {
  primary: {
    bg: 'primary.500',
    hoverBg: 'primary.600',
    activeBg: 'primary.700',
    text: 'white',
    shadow: 'glow.primary',
  },
  secondary: {
    bg: 'background.elevated',
    hoverBg: 'background.card',
    activeBg: 'border.default',
    text: 'text.primary',
    border: 'border.default',
  },
  ghost: {
    bg: 'transparent',
    hoverBg: 'background.elevated',
    activeBg: 'background.card',
    text: 'text.secondary',
  },
  danger: {
    bg: 'error.main',
    hoverBg: 'error.dark',
    text: 'white',
  },
  success: {
    bg: 'success.main',
    hoverBg: 'success.dark',
    text: 'white',
  },
};
```

#### Input Component

```typescript
// packages/ui/src/components/Input/Input.tsx

interface InputProps {
  variant: 'default' | 'filled' | 'flushed';
  size: 'sm' | 'md' | 'lg';
  label?: string;
  placeholder?: string;
  helperText?: string;
  errorMessage?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  type?: 'text' | 'email' | 'password' | 'number' | 'search';
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
}

// Size specifications
const sizes = {
  sm: { height: 32, fontSize: 14, labelSize: 12, px: 12 },
  md: { height: 40, fontSize: 14, labelSize: 14, px: 16 },
  lg: { height: 48, fontSize: 16, labelSize: 14, px: 16 },
};

// States
const states = {
  default: { borderColor: 'border.default' },
  hover: { borderColor: 'border.focus' },
  focus: { borderColor: 'primary.500', shadow: 'glow.primary' },
  error: { borderColor: 'error.main' },
  disabled: { bg: 'background.surface', opacity: 0.5 },
};
```

#### Card Component

```typescript
// packages/ui/src/components/Card/Card.tsx

interface CardProps {
  variant: 'default' | 'elevated' | 'outlined' | 'glass';
  padding: 'none' | 'sm' | 'md' | 'lg';
  isHoverable?: boolean;
  isClickable?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

// Variant styles
const variants = {
  default: {
    bg: 'background.surface',
    border: 'none',
    shadow: 'none',
  },
  elevated: {
    bg: 'background.elevated',
    border: 'none',
    shadow: 'lg',
  },
  outlined: {
    bg: 'background.surface',
    border: '1px solid',
    borderColor: 'border.default',
    shadow: 'none',
  },
  glass: {
    bg: 'rgba(24, 24, 27, 0.8)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(63, 63, 70, 0.5)',
    shadow: 'lg',
  },
};

// Padding
const padding = {
  none: 0,
  sm: 12,
  md: 16,
  lg: 24,
};
```

#### AssetCard Component (Domain-Specific)

```typescript
// packages/ui/src/components/AssetCard/AssetCard.tsx

interface AssetCardProps {
  asset: Asset;
  variant: 'grid' | 'list' | 'compact';
  showViralScore?: boolean;
  showActions?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
}

// Grid variant: 320x240 card with image preview
// List variant: Full width row with thumbnail + details
// Compact variant: Small thumbnail for batch selection

const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  variant = 'grid',
  showViralScore = true,
  showActions = true,
  isSelected,
  onSelect,
  onDelete,
  onDownload,
  onShare,
}) => {
  return (
    <Card
      variant={isSelected ? 'outlined' : 'default'}
      isClickable
      onClick={onSelect}
      className={cn(
        'group relative overflow-hidden',
        variant === 'grid' && 'w-80 h-60',
        variant === 'list' && 'w-full h-20',
        variant === 'compact' && 'w-24 h-24',
        isSelected && 'ring-2 ring-primary-500'
      )}
    >
      {/* Image Preview */}
      <div className="relative w-full h-full">
        <Image
          src={asset.cdn_url}
          alt={asset.asset_type}
          fill
          className="object-cover"
        />
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
          {showActions && (
            <div className="absolute bottom-4 left-4 right-4 flex gap-2">
              <IconButton icon={Download} onClick={onDownload} size="sm" />
              <IconButton icon={Share} onClick={onShare} size="sm" />
              <IconButton icon={Trash} onClick={onDelete} size="sm" variant="danger" />
            </div>
          )}
        </div>
        
        {/* Viral Score Badge */}
        {showViralScore && asset.viral_score !== null && (
          <ViralScoreBadge score={asset.viral_score} className="absolute top-2 right-2" />
        )}
        
        {/* Asset Type Badge */}
        <Badge variant="subtle" className="absolute top-2 left-2">
          {asset.asset_type}
        </Badge>
      </div>
    </Card>
  );
};
```

#### GenerationProgress Component

```typescript
// packages/ui/src/components/GenerationProgress/GenerationProgress.tsx

interface GenerationProgressProps {
  job: GenerationJob;
  variant: 'inline' | 'card' | 'modal';
  showEstimate?: boolean;
  onCancel?: () => void;
}

const GenerationProgress: React.FC<GenerationProgressProps> = ({
  job,
  variant = 'card',
  showEstimate = true,
  onCancel,
}) => {
  const progress = (job.completed_assets + job.failed_assets) / job.total_assets * 100;
  const isComplete = job.status === 'completed' || job.status === 'partial';
  const isFailed = job.status === 'failed';
  
  return (
    <Card variant="elevated" padding="md">
      <div className="flex items-center gap-4">
        {/* Status Icon */}
        <div className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center',
          job.status === 'processing' && 'bg-primary-500/20 animate-pulse',
          job.status === 'completed' && 'bg-success-main/20',
          job.status === 'failed' && 'bg-error-main/20',
        )}>
          {job.status === 'processing' && <Loader className="animate-spin text-primary-500" />}
          {job.status === 'completed' && <Check className="text-success-main" />}
          {job.status === 'failed' && <X className="text-error-main" />}
          {job.status === 'queued' && <Clock className="text-text-secondary" />}
        </div>
        
        {/* Progress Info */}
        <div className="flex-1">
          <div className="flex justify-between mb-2">
            <Text variant="body" weight="medium">
              {job.status === 'queued' && 'Queued...'}
              {job.status === 'processing' && `Generating ${job.asset_type}...`}
              {job.status === 'completed' && 'Complete!'}
              {job.status === 'failed' && 'Generation failed'}
              {job.status === 'partial' && 'Partially complete'}
            </Text>
            <Text variant="caption" color="secondary">
              {job.completed_assets}/{job.total_assets}
            </Text>
          </div>
          
          {/* Progress Bar */}
          <ProgressBar
            value={progress}
            variant={isFailed ? 'error' : isComplete ? 'success' : 'primary'}
            showLabel={false}
          />
          
          {/* Estimate */}
          {showEstimate && job.status === 'processing' && (
            <Text variant="caption" color="tertiary" className="mt-1">
              ~{Math.ceil((job.total_assets - job.completed_assets) * 8)}s remaining
            </Text>
          )}
        </div>
        
        {/* Cancel Button */}
        {job.status === 'queued' && onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </Card>
  );
};
```

#### BrandKitEditor Component

```typescript
// packages/ui/src/components/BrandKitEditor/BrandKitEditor.tsx

interface BrandKitEditorProps {
  brandKit?: BrandKit;
  onSave: (data: BrandKitCreate | BrandKitUpdate) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const BrandKitEditor: React.FC<BrandKitEditorProps> = ({
  brandKit,
  onSave,
  onCancel,
  isLoading,
}) => {
  const [name, setName] = useState(brandKit?.name ?? '');
  const [primaryColors, setPrimaryColors] = useState<string[]>(brandKit?.primary_colors ?? ['#a855f7']);
  const [accentColors, setAccentColors] = useState<string[]>(brandKit?.accent_colors ?? []);
  const [fonts, setFonts] = useState(brandKit?.fonts ?? { headline: 'Inter', body: 'Inter' });
  const [tone, setTone] = useState(brandKit?.tone ?? 'professional');
  const [logoUrl, setLogoUrl] = useState(brandKit?.logo_url ?? null);
  
  return (
    <div className="space-y-6">
      {/* Name */}
      <Input
        label="Brand Kit Name"
        value={name}
        onChange={setName}
        placeholder="My Gaming Brand"
        isRequired
      />
      
      {/* Primary Colors */}
      <div>
        <Label>Primary Colors (1-5)</Label>
        <ColorPicker
          colors={primaryColors}
          onChange={setPrimaryColors}
          min={1}
          max={5}
        />
      </div>
      
      {/* Accent Colors */}
      <div>
        <Label>Accent Colors (0-3)</Label>
        <ColorPicker
          colors={accentColors}
          onChange={setAccentColors}
          min={0}
          max={3}
        />
      </div>
      
      {/* Fonts */}
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Headline Font"
          value={fonts.headline}
          onChange={(v) => setFonts({ ...fonts, headline: v })}
          options={SUPPORTED_FONTS}
        />
        <Select
          label="Body Font"
          value={fonts.body}
          onChange={(v) => setFonts({ ...fonts, body: v })}
          options={SUPPORTED_FONTS}
        />
      </div>
      
      {/* Tone */}
      <Select
        label="Brand Tone"
        value={tone}
        onChange={setTone}
        options={[
          { value: 'competitive', label: 'Competitive' },
          { value: 'casual', label: 'Casual' },
          { value: 'educational', label: 'Educational' },
          { value: 'comedic', label: 'Comedic' },
          { value: 'professional', label: 'Professional' },
        ]}
      />
      
      {/* Logo Upload */}
      <div>
        <Label>Logo</Label>
        <LogoUploader
          currentUrl={logoUrl}
          onUpload={setLogoUrl}
          onRemove={() => setLogoUrl(null)}
        />
      </div>
      
      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => onSave({ name, primary_colors: primaryColors, accent_colors: accentColors, fonts, tone, logo_url: logoUrl })}
          isLoading={isLoading}
        >
          {brandKit ? 'Save Changes' : 'Create Brand Kit'}
        </Button>
      </div>
    </div>
  );
};
```

#### ViralScoreDisplay Component

```typescript
// packages/ui/src/components/ViralScoreDisplay/ViralScoreDisplay.tsx

interface ViralScoreDisplayProps {
  score: ViralScore;
  suggestions?: Suggestion[];
  variant: 'badge' | 'card' | 'detailed';
}

const ViralScoreDisplay: React.FC<ViralScoreDisplayProps> = ({
  score,
  suggestions,
  variant = 'card',
}) => {
  const getScoreColor = (value: number) => {
    if (value >= 80) return 'success';
    if (value >= 60) return 'warning';
    return 'error';
  };
  
  if (variant === 'badge') {
    return (
      <Badge variant={getScoreColor(score.overall)}>
        {score.overall}
      </Badge>
    );
  }
  
  return (
    <Card variant="elevated" padding="lg">
      {/* Overall Score */}
      <div className="flex items-center gap-4 mb-6">
        <CircularProgress
          value={score.overall}
          size={80}
          strokeWidth={8}
          color={getScoreColor(score.overall)}
        >
          <Text variant="h3" weight="bold">{score.overall}</Text>
        </CircularProgress>
        <div>
          <Text variant="h4" weight="semibold">Viral Potential</Text>
          <Text variant="body" color="secondary">
            {score.overall >= 80 && 'Excellent! High click-through potential.'}
            {score.overall >= 60 && score.overall < 80 && 'Good, but room for improvement.'}
            {score.overall < 60 && 'Consider the suggestions below.'}
          </Text>
        </div>
      </div>
      
      {/* Component Scores */}
      {variant === 'detailed' && (
        <div className="space-y-3 mb-6">
          {Object.entries(score.components).map(([key, value]) => (
            <div key={key} className="flex items-center gap-3">
              <Text variant="caption" color="secondary" className="w-32 capitalize">
                {key.replace('_', ' ')}
              </Text>
              <ProgressBar value={value} variant={getScoreColor(value)} className="flex-1" />
              <Text variant="caption" weight="medium" className="w-8">{value}</Text>
            </div>
          ))}
        </div>
      )}
      
      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div>
          <Text variant="label" weight="semibold" className="mb-3">Suggestions</Text>
          <div className="space-y-2">
            {suggestions.map((suggestion, i) => (
              <div key={i} className="flex gap-3 p-3 bg-background-surface rounded-lg">
                <Lightbulb className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5" />
                <div>
                  <Text variant="body" weight="medium">{suggestion.message}</Text>
                  <Text variant="caption" color="tertiary">{suggestion.reasoning}</Text>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
```


---

## Appendix F: Queue Job Schemas (Bull/Redis)

### Job Queue Configuration

```python
# workers/queue_config.py

from redis import Redis
from rq import Queue

# Queue names
QUEUES = {
    'generation': 'streamer-studio:generation',
    'batch': 'streamer-studio:batch',
    'scoring': 'streamer-studio:scoring',
    'platform_sync': 'streamer-studio:platform-sync',
}

# Queue priorities
QUEUE_PRIORITIES = {
    'generation': 'high',
    'batch': 'default',
    'scoring': 'low',
    'platform_sync': 'low',
}

# Job timeouts (seconds)
JOB_TIMEOUTS = {
    'generation': 180,      # 3 minutes per image
    'batch': 900,           # 15 minutes for batch
    'scoring': 60,          # 1 minute for scoring
    'platform_sync': 120,   # 2 minutes for API calls
}

# Retry configuration
RETRY_CONFIG = {
    'generation': {'max_retries': 3, 'backoff': [10, 30, 60]},
    'batch': {'max_retries': 2, 'backoff': [30, 120]},
    'scoring': {'max_retries': 2, 'backoff': [5, 15]},
    'platform_sync': {'max_retries': 3, 'backoff': [10, 30, 60]},
}
```

### Generation Job Payload

```python
# workers/schemas.py

@dataclass
class GenerationJobPayload:
    """Payload for single asset generation job."""
    job_id: str                     # UUID of GenerationJob record
    user_id: str                    # User requesting generation
    asset_type: str                 # thumbnail, overlay, etc.
    prompt: str                     # Fully constructed prompt
    width: int                      # Target width
    height: int                     # Target height
    format: str                     # png, jpeg, webp
    brand_kit_id: Optional[str]     # Brand kit used (for metadata)
    template_version: str           # Prompt template version
    
    # Metadata for tracking
    created_at: str                 # ISO timestamp
    priority: int                   # 1-10, higher = more urgent
    
    def to_dict(self) -> dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: dict) -> 'GenerationJobPayload':
        return cls(**data)

@dataclass
class BatchJobPayload:
    """Payload for batch generation job."""
    parent_job_id: str              # UUID of parent GenerationJob
    user_id: str
    child_jobs: list[GenerationJobPayload]
    max_concurrent: int = 5
    
    # Callback configuration
    webhook_url: Optional[str] = None
    notify_on_each: bool = False    # Notify after each child completes
    
    def to_dict(self) -> dict:
        return {
            'parent_job_id': self.parent_job_id,
            'user_id': self.user_id,
            'child_jobs': [j.to_dict() for j in self.child_jobs],
            'max_concurrent': self.max_concurrent,
            'webhook_url': self.webhook_url,
            'notify_on_each': self.notify_on_each,
        }

@dataclass
class ScoringJobPayload:
    """Payload for viral scoring job."""
    asset_id: str
    user_id: str
    cdn_url: str
    asset_type: str
    
@dataclass
class PlatformSyncPayload:
    """Payload for platform metadata sync job."""
    connection_id: str
    user_id: str
    platform: str
    force_refresh: bool = False
```

### Worker Implementation

```python
# workers/generation_worker.py

import asyncio
from rq import Worker, Queue
from redis import Redis

class GenerationWorker:
    def __init__(self, redis_url: str, nano_banana_client: NanoBananaClient, storage: StorageService):
        self.redis = Redis.from_url(redis_url)
        self.nano_banana = nano_banana_client
        self.storage = storage
        self.db = SupabaseClient()
    
    async def process_generation_job(self, payload: GenerationJobPayload) -> dict:
        """Process a single generation job."""
        job_id = payload.job_id
        
        try:
            # Update job status to processing
            await self.db.update_job_status(job_id, 'processing', started_at=datetime.utcnow())
            
            # Generate image
            result = await self.nano_banana.generate_image(
                prompt=payload.prompt,
                width=payload.width,
                height=payload.height,
                response_format=payload.format
            )
            
            # Upload to storage
            asset_id = str(uuid.uuid4())
            storage_result = await self.storage.upload_asset(
                user_id=payload.user_id,
                asset_id=asset_id,
                image_data=result.image_data,
                format=payload.format
            )
            
            # Create asset record
            asset = await self.db.create_asset(
                id=asset_id,
                user_id=payload.user_id,
                job_id=job_id,
                brand_kit_id=payload.brand_kit_id,
                asset_type=payload.asset_type,
                width=payload.width,
                height=payload.height,
                format=payload.format,
                cdn_url=storage_result.cdn_url,
                storage_key=storage_result.storage_key,
                shareable_url=storage_result.shareable_url,
                prompt_used=payload.prompt,
                generation_params={
                    'model': 'gemini-2.5-flash',
                    'template_version': payload.template_version,
                }
            )
            
            # Update job status to completed
            await self.db.update_job_status(
                job_id,
                'completed',
                completed_at=datetime.utcnow(),
                asset_ids=[asset_id]
            )
            
            # Increment user's monthly usage
            await self.db.increment_user_usage(payload.user_id)
            
            return {'status': 'completed', 'asset_id': asset_id}
            
        except NanoBananaContentPolicyError as e:
            await self.db.update_job_status(job_id, 'failed', error_message='Content policy violation')
            raise
            
        except NanoBananaAPIError as e:
            # Check retry count
            job = await self.db.get_job(job_id)
            if job.retry_count < 3:
                await self.db.increment_retry_count(job_id)
                raise  # Will be retried by RQ
            else:
                await self.db.update_job_status(job_id, 'failed', error_message=str(e))
                raise
    
    async def process_batch_job(self, payload: BatchJobPayload) -> dict:
        """Process a batch generation job."""
        parent_job_id = payload.parent_job_id
        
        # Update parent to processing
        await self.db.update_job_status(parent_job_id, 'processing', started_at=datetime.utcnow())
        
        # Process children with concurrency limit
        semaphore = asyncio.Semaphore(payload.max_concurrent)
        results = []
        
        async def process_child(child_payload: GenerationJobPayload):
            async with semaphore:
                try:
                    result = await self.process_generation_job(child_payload)
                    results.append(('success', result))
                    
                    # Update parent progress
                    await self.db.increment_job_progress(parent_job_id, completed=1)
                    
                    # Notify if configured
                    if payload.notify_on_each and payload.webhook_url:
                        await self._send_webhook(payload.webhook_url, {
                            'event': 'child_completed',
                            'parent_job_id': parent_job_id,
                            'child_job_id': child_payload.job_id,
                            'result': result
                        })
                        
                except Exception as e:
                    results.append(('failed', str(e)))
                    await self.db.increment_job_progress(parent_job_id, failed=1)
        
        # Run all children
        await asyncio.gather(*[process_child(c) for c in payload.child_jobs])
        
        # Determine final status
        successes = sum(1 for r in results if r[0] == 'success')
        failures = sum(1 for r in results if r[0] == 'failed')
        
        if failures == 0:
            status = 'completed'
        elif successes == 0:
            status = 'failed'
        else:
            status = 'partial'
        
        await self.db.update_job_status(
            parent_job_id,
            status,
            completed_at=datetime.utcnow()
        )
        
        # Final webhook
        if payload.webhook_url:
            await self._send_webhook(payload.webhook_url, {
                'event': 'batch_completed',
                'job_id': parent_job_id,
                'status': status,
                'successes': successes,
                'failures': failures
            })
        
        return {'status': status, 'successes': successes, 'failures': failures}
```

---

## Appendix G: Webhook and WebSocket Contracts

### Webhook Payloads

```typescript
// Webhook event types
type WebhookEvent = 
  | 'job.completed'
  | 'job.failed'
  | 'batch.progress'
  | 'batch.completed'
  | 'subscription.updated'
  | 'platform.disconnected';

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;           // ISO 8601
  data: WebhookEventData;
  signature: string;           // HMAC-SHA256 of payload
}

// Job completed
interface JobCompletedData {
  job_id: string;
  user_id: string;
  status: 'completed' | 'partial';
  asset_ids: string[];
  assets: Array<{
    id: string;
    cdn_url: string;
    shareable_url: string;
    asset_type: string;
    viral_score: number | null;
  }>;
}

// Job failed
interface JobFailedData {
  job_id: string;
  user_id: string;
  error_code: string;
  error_message: string;
  retry_count: number;
}

// Batch progress
interface BatchProgressData {
  job_id: string;
  user_id: string;
  total: number;
  completed: number;
  failed: number;
  progress_percent: number;
  latest_asset?: {
    id: string;
    cdn_url: string;
  };
}
```

### Webhook Signature Verification

```python
# services/webhook_service.py

import hmac
import hashlib

class WebhookService:
    def __init__(self, signing_secret: str):
        self.signing_secret = signing_secret
    
    def sign_payload(self, payload: dict) -> str:
        """Generate HMAC-SHA256 signature for payload."""
        payload_str = json.dumps(payload, sort_keys=True, separators=(',', ':'))
        signature = hmac.new(
            self.signing_secret.encode(),
            payload_str.encode(),
            hashlib.sha256
        ).hexdigest()
        return f"sha256={signature}"
    
    def verify_signature(self, payload: dict, signature: str) -> bool:
        """Verify webhook signature."""
        expected = self.sign_payload(payload)
        return hmac.compare_digest(expected, signature)
    
    async def send_webhook(self, url: str, event: str, data: dict) -> bool:
        """Send webhook to user-configured URL."""
        payload = {
            'event': event,
            'timestamp': datetime.utcnow().isoformat(),
            'data': data,
        }
        payload['signature'] = self.sign_payload(payload)
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    json=payload,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                ) as response:
                    return response.status < 400
        except Exception as e:
            logger.error(f"Webhook delivery failed: {e}")
            return False
```

### WebSocket Protocol

```typescript
// WebSocket message types
type WSMessageType = 
  | 'subscribe'
  | 'unsubscribe'
  | 'job.status'
  | 'job.progress'
  | 'job.completed'
  | 'job.failed'
  | 'ping'
  | 'pong';

interface WSMessage {
  type: WSMessageType;
  payload: any;
  timestamp: string;
}

// Client → Server
interface SubscribeMessage {
  type: 'subscribe';
  payload: {
    job_ids: string[];
  };
}

interface UnsubscribeMessage {
  type: 'unsubscribe';
  payload: {
    job_ids: string[];
  };
}

// Server → Client
interface JobStatusMessage {
  type: 'job.status';
  payload: {
    job_id: string;
    status: JobStatus;
    progress_percent: number;
    completed_assets: number;
    total_assets: number;
  };
}

interface JobCompletedMessage {
  type: 'job.completed';
  payload: {
    job_id: string;
    assets: Asset[];
  };
}
```

### WebSocket Server Implementation

```python
# api/websocket.py

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set

class ConnectionManager:
    def __init__(self):
        # user_id -> set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # job_id -> set of user_ids subscribed
        self.job_subscriptions: Dict[str, Set[str]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
    
    def subscribe_to_job(self, user_id: str, job_id: str):
        if job_id not in self.job_subscriptions:
            self.job_subscriptions[job_id] = set()
        self.job_subscriptions[job_id].add(user_id)
    
    def unsubscribe_from_job(self, user_id: str, job_id: str):
        if job_id in self.job_subscriptions:
            self.job_subscriptions[job_id].discard(user_id)
    
    async def broadcast_job_update(self, job_id: str, message: dict):
        """Send job update to all subscribed users."""
        if job_id not in self.job_subscriptions:
            return
        
        for user_id in self.job_subscriptions[job_id]:
            if user_id in self.active_connections:
                for websocket in self.active_connections[user_id]:
                    try:
                        await websocket.send_json(message)
                    except Exception:
                        pass  # Connection may be closed

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Authenticate via query param or first message
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return
    
    try:
        payload = auth_service.decode_token(token)
        user_id = payload["sub"]
    except Exception:
        await websocket.close(code=4001)
        return
    
    await manager.connect(websocket, user_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data["type"] == "subscribe":
                for job_id in data["payload"]["job_ids"]:
                    # Verify user owns the job
                    job = await db.get_job(job_id)
                    if job and job.user_id == user_id:
                        manager.subscribe_to_job(user_id, job_id)
            
            elif data["type"] == "unsubscribe":
                for job_id in data["payload"]["job_ids"]:
                    manager.unsubscribe_from_job(user_id, job_id)
            
            elif data["type"] == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.utcnow().isoformat()})
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
```

---

## Summary of Appendices

| Appendix | Content | Purpose |
|----------|---------|---------|
| A | Prompt Template System | Structure for versioned, injectable prompt templates |
| B | Nano Banana Pro API | Google Gemini 2.5 Flash integration contract |
| C | Platform APIs | Twitch/YouTube OAuth setup and API clients |
| D | Supabase Storage | Bucket configuration, policies, URL patterns |
| E | Component Library | Enterprise-grade 2025 UI components |
| F | Queue Job Schemas | Bull/Redis job payloads and worker implementation |
| G | Webhook/WebSocket | Real-time communication contracts |

All child specs MUST reference these appendices for implementation details.
