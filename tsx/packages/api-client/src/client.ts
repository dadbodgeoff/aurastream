// API Client for Aurastream
// Provides typed methods for all backend API endpoints

import type {
  User,
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  RefreshResponse,
  LogoutResponse,
  OAuthInitiateResponse,
  APIError,
} from './types';
import type {
  BrandKit,
  BrandKitCreate,
  BrandKitUpdate,
  BrandKitListResponse,
} from './types/brandKit';
import type {
  GenerateRequest,
  JobResponse,
  JobListResponse,
  AssetResponse,
  AssetListResponse,
  AssetVisibilityUpdate,
  JobFilters,
  AssetFilters,
} from './types/generation';
import type {
  TwitchAssetType,
  PackType,
  TwitchGenerateRequest,
  PackGenerateRequest,
  TwitchJobResponse,
  PackResponse,
  DimensionSpecResponse,
  GameMetaResponse,
} from './types/twitch';
import type {
  CheckoutRequest,
  CheckoutResponse,
  PortalRequest,
  PortalResponse,
  SubscriptionStatusResponse,
  CancelResponse,
} from './types/subscription';

// ============================================================================
// Types
// ============================================================================

export interface APIClientConfig {
  baseUrl: string;
  onUnauthorized?: () => void;
}

export class APIClientError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly statusCode: number;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIClientError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ============================================================================
// API Client
// ============================================================================

export class APIClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private onUnauthorized?: () => void;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;
  private csrfToken: string | null = null;

  constructor(config: APIClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.onUnauthorized = config.onUnauthorized;
  }

  // ==========================================================================
  // Token Management
  // ==========================================================================

  /**
   * Set access and refresh tokens for authenticated requests
   */
  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  /**
   * Clear all stored tokens (used on logout)
   */
  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.csrfToken = null;
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Get the current refresh token
   */
  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /**
   * Check if the client has tokens set
   */
  hasTokens(): boolean {
    return this.accessToken !== null && this.refreshToken !== null;
  }

  // ==========================================================================
  // Auth Namespace
  // ==========================================================================

  auth = {
    /**
     * Register a new user account
     */
    signup: async (data: SignupRequest): Promise<SignupResponse> => {
      return this.request<SignupResponse>('POST', '/api/v1/auth/signup', {
        body: {
          email: data.email,
          password: data.password,
          display_name: data.displayName,
          accept_terms: data.acceptTerms,
          terms_version: data.termsVersion || '1.0.0',
          privacy_version: data.privacyVersion || '1.0.0',
        },
        requiresAuth: false,
      });
    },

    /**
     * Login with email and password
     */
    login: async (data: LoginRequest): Promise<LoginResponse> => {
      const response = await this.request<LoginResponse>('POST', '/api/v1/auth/login', {
        body: {
          email: data.email,
          password: data.password,
          remember_me: data.rememberMe ?? false,
        },
        requiresAuth: false,
      });

      // Automatically store tokens on successful login
      this.setTokens(response.accessToken, response.refreshToken);

      // Store CSRF token if provided
      if (response.csrfToken) {
        this.csrfToken = response.csrfToken;
      }

      return response;
    },

    /**
     * Logout the current user
     */
    logout: async (): Promise<void> => {
      try {
        await this.request<LogoutResponse>('POST', '/api/v1/auth/logout', {
          requiresAuth: true,
        });
      } finally {
        // Always clear tokens, even if the request fails
        this.clearTokens();
      }
    },

    /**
     * Refresh the access token using a refresh token
     */
    refresh: async (data: RefreshRequest): Promise<RefreshResponse> => {
      const response = await this.request<RefreshResponse>('POST', '/api/v1/auth/refresh', {
        body: {
          refresh_token: data.refreshToken,
        },
        requiresAuth: false,
      });

      // Update the access token
      if (this.refreshToken) {
        this.accessToken = response.accessToken;
      }

      return response;
    },

    /**
     * Get the current authenticated user's profile
     */
    me: async (): Promise<User> => {
      return this.request<User>('GET', '/api/v1/auth/me', {
        requiresAuth: true,
      });
    },

    /**
     * Initiate OAuth flow for a provider (google, twitch, discord)
     */
    oauthInitiate: async (provider: string): Promise<OAuthInitiateResponse> => {
      return this.request<OAuthInitiateResponse>('GET', `/api/v1/oauth/${provider}/initiate`, {
        requiresAuth: false,
      });
    },
  };

  // ==========================================================================
  // Brand Kits Namespace
  // ==========================================================================

  brandKits = {
    /**
     * List all brand kits for the current user
     */
    list: async (): Promise<BrandKitListResponse> => {
      return this.request<BrandKitListResponse>('GET', '/api/v1/brand-kits', {
        requiresAuth: true,
      });
    },

    /**
     * Create a new brand kit
     */
    create: async (data: BrandKitCreate): Promise<BrandKit> => {
      return this.request<BrandKit>('POST', '/api/v1/brand-kits', {
        body: data,
        requiresAuth: true,
      });
    },

    /**
     * Get a specific brand kit by ID
     */
    get: async (id: string): Promise<BrandKit> => {
      return this.request<BrandKit>('GET', `/api/v1/brand-kits/${id}`, {
        requiresAuth: true,
      });
    },

    /**
     * Update an existing brand kit
     */
    update: async (id: string, data: BrandKitUpdate): Promise<BrandKit> => {
      return this.request<BrandKit>('PUT', `/api/v1/brand-kits/${id}`, {
        body: data,
        requiresAuth: true,
      });
    },

    /**
     * Delete a brand kit
     */
    delete: async (id: string): Promise<void> => {
      return this.request<void>('DELETE', `/api/v1/brand-kits/${id}`, {
        requiresAuth: true,
      });
    },

    /**
     * Activate a brand kit (set as the active brand kit)
     */
    activate: async (id: string): Promise<BrandKit> => {
      return this.request<BrandKit>('POST', `/api/v1/brand-kits/${id}/activate`, {
        requiresAuth: true,
      });
    },

    /**
     * Get the currently active brand kit
     */
    getActive: async (): Promise<BrandKit | null> => {
      return this.request<BrandKit | null>('GET', '/api/v1/brand-kits/active', {
        requiresAuth: true,
      });
    },
  };

  // ==========================================================================
  // Generation Namespace
  // ==========================================================================

  generation = {
    /**
     * Create a new generation job
     */
    create: async (data: GenerateRequest): Promise<JobResponse> => {
      // Use brandCustomization if provided, otherwise build from legacy fields
      let brandCustomization = data.brandCustomization;
      
      if (!brandCustomization && data.includeLogo) {
        brandCustomization = {
          include_logo: true,
          logo_type: data.logoType || 'primary',
          logo_position: data.logoPosition || 'bottom-right',
          logo_size: data.logoSize || 'medium',
          brand_intensity: 'balanced',
        };
      }

      return this.request<JobResponse>('POST', '/api/v1/generate', {
        body: {
          asset_type: data.assetType,
          brand_kit_id: data.brandKitId,
          custom_prompt: data.customPrompt,
          brand_customization: brandCustomization,
        },
        requiresAuth: true,
      });
    },

    /**
     * Get a generation job by ID
     */
    getJob: async (jobId: string): Promise<JobResponse> => {
      return this.request<JobResponse>('GET', `/api/v1/jobs/${jobId}`, {
        requiresAuth: true,
      });
    },

    /**
     * List generation jobs with optional filters
     */
    listJobs: async (filters?: JobFilters): Promise<JobListResponse> => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.offset) params.append('offset', String(filters.offset));
      
      const query = params.toString();
      const path = query ? `/api/v1/jobs?${query}` : '/api/v1/jobs';
      
      return this.request<JobListResponse>('GET', path, {
        requiresAuth: true,
      });
    },

    /**
     * Get assets for a specific job
     */
    getJobAssets: async (jobId: string): Promise<AssetResponse[]> => {
      return this.request<AssetResponse[]>('GET', `/api/v1/jobs/${jobId}/assets`, {
        requiresAuth: true,
      });
    },
  };

  // ==========================================================================
  // Assets Namespace
  // ==========================================================================

  assets = {
    /**
     * List assets with optional filters
     */
    list: async (filters?: AssetFilters): Promise<AssetListResponse> => {
      const params = new URLSearchParams();
      if (filters?.assetType) params.append('asset_type', filters.assetType);
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.offset) params.append('offset', String(filters.offset));
      
      const query = params.toString();
      const path = query ? `/api/v1/assets?${query}` : '/api/v1/assets';
      
      return this.request<AssetListResponse>('GET', path, {
        requiresAuth: true,
      });
    },

    /**
     * Get an asset by ID
     */
    get: async (assetId: string): Promise<AssetResponse> => {
      return this.request<AssetResponse>('GET', `/api/v1/assets/${assetId}`, {
        requiresAuth: true,
      });
    },

    /**
     * Delete an asset
     */
    delete: async (assetId: string): Promise<void> => {
      return this.request<void>('DELETE', `/api/v1/assets/${assetId}`, {
        requiresAuth: true,
      });
    },

    /**
     * Update asset visibility
     */
    updateVisibility: async (assetId: string, data: AssetVisibilityUpdate): Promise<AssetResponse> => {
      return this.request<AssetResponse>('PUT', `/api/v1/assets/${assetId}/visibility`, {
        body: { is_public: data.isPublic },
        requiresAuth: true,
      });
    },
  };

  // ==========================================================================
  // Twitch Namespace
  // ==========================================================================

  twitch = {
    /**
     * Generate a single Twitch asset
     */
    generate: async (data: TwitchGenerateRequest): Promise<TwitchJobResponse> => {
      return this.request<TwitchJobResponse>('POST', '/api/v1/twitch/generate', {
        body: {
          asset_type: data.assetType,
          brand_kit_id: data.brandKitId,
          custom_prompt: data.customPrompt,
          game_id: data.gameId,
          text_overlay: data.textOverlay,
          include_logo: data.includeLogo,
        },
        requiresAuth: true,
      });
    },

    /**
     * Generate a pack of Twitch assets
     */
    generatePack: async (data: PackGenerateRequest): Promise<PackResponse> => {
      return this.request<PackResponse>('POST', '/api/v1/twitch/packs', {
        body: {
          pack_type: data.packType,
          brand_kit_id: data.brandKitId,
          custom_prompt: data.customPrompt,
          game_id: data.gameId,
        },
        requiresAuth: true,
      });
    },

    /**
     * Get pack status and assets
     */
    getPackStatus: async (packId: string): Promise<PackResponse> => {
      return this.request<PackResponse>('GET', `/api/v1/twitch/packs/${packId}`, {
        requiresAuth: true,
      });
    },

    /**
     * Get dimension specifications for all asset types
     */
    getDimensions: async (): Promise<DimensionSpecResponse[]> => {
      return this.request<DimensionSpecResponse[]>('GET', '/api/v1/twitch/dimensions', {
        requiresAuth: true,
      });
    },

    /**
     * Get game metadata for context
     */
    getGameMeta: async (gameId: string): Promise<GameMetaResponse> => {
      return this.request<GameMetaResponse>('GET', `/api/v1/twitch/game-meta/${gameId}`, {
        requiresAuth: true,
      });
    },
  };

  // ==========================================================================
  // Subscriptions Namespace
  // ==========================================================================

  subscriptions = {
    /**
     * Create a Stripe checkout session for subscription purchase
     */
    createCheckout: async (data: CheckoutRequest): Promise<CheckoutResponse> => {
      return this.request<CheckoutResponse>('POST', '/api/v1/subscriptions/checkout', {
        body: {
          plan: data.plan,
          success_url: data.successUrl,
          cancel_url: data.cancelUrl,
        },
        requiresAuth: true,
      });
    },

    /**
     * Create a Stripe billing portal session
     */
    createPortal: async (data?: PortalRequest): Promise<PortalResponse> => {
      return this.request<PortalResponse>('POST', '/api/v1/subscriptions/portal', {
        body: {
          return_url: data?.returnUrl,
        },
        requiresAuth: true,
      });
    },

    /**
     * Get the current user's subscription status
     */
    getStatus: async (): Promise<SubscriptionStatusResponse> => {
      return this.request<SubscriptionStatusResponse>('GET', '/api/v1/subscriptions/status', {
        requiresAuth: true,
      });
    },

    /**
     * Cancel the current subscription at period end
     */
    cancel: async (): Promise<CancelResponse> => {
      return this.request<CancelResponse>('POST', '/api/v1/subscriptions/cancel', {
        requiresAuth: true,
      });
    },
  };

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Make an HTTP request to the API
   */
  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      requiresAuth?: boolean;
      skipRefresh?: boolean;
    }
  ): Promise<T> {
    const { body, requiresAuth = false, skipRefresh = false } = options ?? {};

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // Add authorization header if required and token is available
    if (requiresAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // Add CSRF token for state-changing requests
    if (this.csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include', // Include cookies for web auth
    });

    // Handle 401 Unauthorized - attempt token refresh
    if (response.status === 401 && requiresAuth && !skipRefresh) {
      const refreshed = await this.handleUnauthorized();
      if (refreshed) {
        // Retry the request with the new token
        return this.request<T>(method, path, { ...options, skipRefresh: true });
      }
    }

    // Parse response
    const responseData = await this.parseResponse<T>(response);

    return responseData;
  }

  /**
   * Parse API response and handle errors
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    let data: unknown;

    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new APIClientError(
        'Failed to parse response',
        'PARSE_ERROR',
        response.status
      );
    }

    if (!response.ok) {
      const errorData = data as APIError | null;
      throw new APIClientError(
        errorData?.error?.message ?? `Request failed with status ${response.status}`,
        errorData?.error?.code ?? 'UNKNOWN_ERROR',
        response.status,
        errorData?.error?.details
      );
    }

    // Transform snake_case to camelCase for response data
    return this.transformResponse<T>(data);
  }

  /**
   * Handle 401 Unauthorized by attempting token refresh
   */
  private async handleUnauthorized(): Promise<boolean> {
    // If no refresh token, can't refresh
    if (!this.refreshToken) {
      this.onUnauthorized?.();
      return false;
    }

    // If already refreshing, wait for that to complete
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.attemptTokenRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Attempt to refresh the access token
   */
  private async attemptTokenRefresh(): Promise<boolean> {
    try {
      const response = await this.request<RefreshResponse>(
        'POST',
        '/api/v1/auth/refresh',
        {
          body: { refresh_token: this.refreshToken },
          requiresAuth: false,
          skipRefresh: true,
        }
      );

      this.accessToken = response.accessToken;
      return true;
    } catch {
      // Refresh failed, clear tokens and notify
      this.clearTokens();
      this.onUnauthorized?.();
      return false;
    }
  }

  /**
   * Transform snake_case keys to camelCase recursively
   */
  private transformResponse<T>(data: unknown): T {
    if (data === null || data === undefined) {
      return data as T;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.transformResponse(item)) as T;
    }

    if (typeof data === 'object') {
      const transformed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        const camelKey = this.snakeToCamel(key);
        transformed[camelKey] = this.transformResponse(value);
      }
      return transformed as T;
    }

    return data as T;
  }

  /**
   * Convert snake_case string to camelCase
   */
  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default API client instance
 * Configure with environment variable NEXT_PUBLIC_API_URL or defaults to localhost
 */
export const apiClient = new APIClient({
  baseUrl: typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:8000',
});
