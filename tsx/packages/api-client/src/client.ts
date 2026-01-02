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
import type {
  SetSubjectResponse,
  FuseRequest,
  FuseResponse,
  InventoryResponse,
  InventoryFilters,
  UsageResponse,
  ElementsResponse,
  SuccessResponse,
} from './types/auraLab';
import type {
  AnalyzeResponse,
  AnalyzeUrlRequest,
  AnalyzeUploadOptions,
  UsageResponse as VibeBrandingUsageResponse,
} from './types/vibeBranding';
import type {
  CommunityPostWithAuthor,
  PaginatedPosts,
} from './types/community';

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
      return this.request<OAuthInitiateResponse>('POST', `/api/v1/auth/oauth/${provider}`, {
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

      // Transform media asset placements from camelCase to snake_case
      const mediaAssetPlacements = data.mediaAssetPlacements?.map(p => ({
        asset_id: p.assetId,
        display_name: p.displayName,
        asset_type: p.assetType,
        url: p.url,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        size_unit: p.sizeUnit,
        z_index: p.zIndex,
        rotation: p.rotation,
        opacity: p.opacity,
      }));

      return this.request<JobResponse>('POST', '/api/v1/generate', {
        body: {
          asset_type: data.assetType,
          brand_kit_id: data.brandKitId,
          custom_prompt: data.customPrompt,
          brand_customization: brandCustomization,
          media_asset_ids: data.mediaAssetIds,
          media_asset_placements: mediaAssetPlacements,
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

    /**
     * Refine a completed job with a simple tweak instruction.
     * Creates a new job with the original parameters + refinement.
     * 
     * This is the "Almost... tweak it" flow for Quick Create.
     * 
     * Tier access:
     * - Free: Cannot refine (upgrade required)
     * - Pro: 5 free refinements/month, then counts as creation
     * - Studio: Unlimited refinements
     */
    refineJob: async (
      jobId: string,
      data: { refinement: string }
    ): Promise<{
      newJob: JobResponse;
      originalJobId: string;
      refinementText: string;
    }> => {
      return this.request('POST', `/api/v1/jobs/${jobId}/refine`, {
        body: {
          refinement: data.refinement,
        },
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
  // Aura Lab Namespace
  // ==========================================================================

  auraLab = {
    /**
     * Upload and lock in a test subject for fusion experiments
     */
    setSubject: async (file: File): Promise<SetSubjectResponse> => {
      // For file uploads, we need to use FormData and a custom fetch
      // We'll handle auth manually but use the same token management
      return this.requestWithFormData<SetSubjectResponse>(
        '/api/v1/aura-lab/set-subject',
        file
      );
    },

    /**
     * Perform a fusion between test subject and element
     */
    fuse: async (data: FuseRequest): Promise<FuseResponse> => {
      return this.request<FuseResponse>('POST', '/api/v1/aura-lab/fuse', {
        body: {
          subject_id: data.subjectId,
          element_id: data.elementId,
        },
        requiresAuth: true,
      });
    },

    /**
     * Keep a fusion result and add it to inventory
     */
    keep: async (fusionId: string): Promise<SuccessResponse> => {
      return this.request<SuccessResponse>('POST', '/api/v1/aura-lab/keep', {
        body: {
          fusion_id: fusionId,
        },
        requiresAuth: true,
      });
    },

    /**
     * Trash a fusion result (discard without saving)
     */
    trash: async (fusionId: string): Promise<SuccessResponse> => {
      return this.request<SuccessResponse>('POST', '/api/v1/aura-lab/trash', {
        body: {
          fusion_id: fusionId,
        },
        requiresAuth: true,
      });
    },

    /**
     * Get user's saved fusion inventory
     */
    getInventory: async (filters?: InventoryFilters): Promise<InventoryResponse> => {
      const params = new URLSearchParams();
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.offset) params.append('offset', String(filters.offset));
      if (filters?.rarity) params.append('rarity', filters.rarity);

      const query = params.toString();
      const path = query ? `/api/v1/aura-lab/inventory?${query}` : '/api/v1/aura-lab/inventory';

      return this.request<InventoryResponse>('GET', path, {
        requiresAuth: true,
      });
    },

    /**
     * Get user's daily fusion usage
     */
    getUsage: async (): Promise<UsageResponse> => {
      return this.request<UsageResponse>('GET', '/api/v1/aura-lab/usage', {
        requiresAuth: true,
      });
    },

    /**
     * Get available elements for fusion
     */
    getElements: async (): Promise<ElementsResponse> => {
      return this.request<ElementsResponse>('GET', '/api/v1/aura-lab/elements', {
        requiresAuth: true,
      });
    },
  };

  // ==========================================================================
  // Promo Namespace
  // ==========================================================================

  promo = {
    /**
     * Create a Stripe checkout session for promo message
     */
    createCheckout: async (data: {
      content: string;
      linkUrl?: string;
      successUrl?: string;
      cancelUrl?: string;
    }): Promise<{ checkoutUrl: string; sessionId: string; pendingMessageId: string }> => {
      return this.request('POST', '/api/v1/promo/checkout', {
        body: {
          content: data.content,
          link_url: data.linkUrl,
          success_url: data.successUrl,
          cancel_url: data.cancelUrl,
        },
        requiresAuth: true,
      });
    },

    /**
     * Get paginated promo messages
     */
    getMessages: async (cursor?: string | null, limit = 20): Promise<{
      messages: unknown[];
      pinnedMessage: unknown | null;
      totalCount: number;
      hasMore: boolean;
      nextCursor: string | null;
    }> => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) params.set('cursor', cursor);
      return this.request('GET', `/api/v1/promo/messages?${params}`, {
        requiresAuth: false,
      });
    },

    /**
     * Get the currently pinned message
     */
    getPinnedMessage: async (): Promise<unknown | null> => {
      return this.request('GET', '/api/v1/promo/messages/pinned', {
        requiresAuth: false,
      });
    },

    /**
     * Delete own promo message
     */
    deleteMessage: async (messageId: string): Promise<void> => {
      return this.request('DELETE', `/api/v1/promo/messages/${messageId}`, {
        requiresAuth: true,
      });
    },

    /**
     * Get donation leaderboard
     */
    getLeaderboard: async (): Promise<{
      entries: unknown[];
      currentUserRank: number | null;
      currentUserTotal: number | null;
      updatedAt: string;
    }> => {
      return this.request('GET', '/api/v1/promo/leaderboard', {
        requiresAuth: false,
      });
    },
  };

  // ==========================================================================
  // Vibe Branding Namespace
  // ==========================================================================

  vibeBranding = {
    /**
     * Analyze an uploaded image and extract brand identity
     */
    analyzeUpload: async (
      file: File,
      options?: AnalyzeUploadOptions
    ): Promise<AnalyzeResponse> => {
      const params = new URLSearchParams();
      if (options?.autoCreateKit !== undefined) {
        params.append('auto_create_kit', String(options.autoCreateKit));
      }
      if (options?.kitName) {
        params.append('kit_name', options.kitName);
      }

      const queryString = params.toString();
      const path = `/api/v1/vibe-branding/analyze/upload${queryString ? '?' + queryString : ''}`;

      return this.requestWithFormData<AnalyzeResponse>(path, file);
    },

    /**
     * Analyze an image from URL and extract brand identity
     */
    analyzeUrl: async (data: AnalyzeUrlRequest): Promise<AnalyzeResponse> => {
      return this.request<AnalyzeResponse>('POST', '/api/v1/vibe-branding/analyze/url', {
        body: {
          image_url: data.imageUrl,
          auto_create_kit: data.autoCreateKit ?? true,
          kit_name: data.kitName,
        },
        requiresAuth: true,
      });
    },

    /**
     * Get user's vibe branding usage for current month
     */
    getUsage: async (): Promise<VibeBrandingUsageResponse> => {
      return this.request<VibeBrandingUsageResponse>('GET', '/api/v1/vibe-branding/usage', {
        requiresAuth: true,
      });
    },
  };

  // ==========================================================================
  // Community Namespace
  // ==========================================================================

  community = {
    /**
     * Create a new community post (share an asset)
     */
    createPost: async (data: {
      assetId: string;
      title: string;
      description?: string;
      tags?: string[];
      showPrompt?: boolean;
      inspiredByPostId?: string;
    }): Promise<CommunityPostWithAuthor> => {
      return this.request<CommunityPostWithAuthor>('POST', '/api/v1/community/posts', {
        body: {
          asset_id: data.assetId,
          title: data.title,
          description: data.description,
          tags: data.tags || [],
          show_prompt: data.showPrompt ?? false,
          inspired_by_post_id: data.inspiredByPostId,
        },
        requiresAuth: true,
      });
    },

    /**
     * Get community posts with pagination
     */
    listPosts: async (params?: {
      page?: number;
      limit?: number;
      sort?: string;
      assetType?: string;
      tags?: string[];
    }): Promise<PaginatedPosts> => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', String(params.page));
      if (params?.limit) searchParams.append('limit', String(params.limit));
      if (params?.sort) searchParams.append('sort', params.sort);
      if (params?.assetType) searchParams.append('asset_type', params.assetType);
      if (params?.tags?.length) searchParams.append('tags', params.tags.join(','));

      const query = searchParams.toString();
      const path = query ? `/api/v1/community/posts?${query}` : '/api/v1/community/posts';

      return this.request<PaginatedPosts>('GET', path, {
        requiresAuth: false,
      });
    },

    /**
     * Get a single community post by ID
     */
    getPost: async (postId: string): Promise<CommunityPostWithAuthor> => {
      return this.request<CommunityPostWithAuthor>('GET', `/api/v1/community/posts/${postId}`, {
        requiresAuth: false,
      });
    },

    /**
     * Update a community post
     */
    updatePost: async (
      postId: string,
      data: {
        title?: string;
        description?: string;
        tags?: string[];
        showPrompt?: boolean;
      }
    ): Promise<CommunityPostWithAuthor> => {
      return this.request<CommunityPostWithAuthor>('PUT', `/api/v1/community/posts/${postId}`, {
        body: {
          title: data.title,
          description: data.description,
          tags: data.tags,
          show_prompt: data.showPrompt,
        },
        requiresAuth: true,
      });
    },

    /**
     * Delete a community post
     */
    deletePost: async (postId: string): Promise<void> => {
      return this.request('DELETE', `/api/v1/community/posts/${postId}`, {
        requiresAuth: true,
      });
    },

    /**
     * Like a community post
     */
    likePost: async (postId: string): Promise<void> => {
      return this.request('POST', `/api/v1/community/posts/${postId}/like`, {
        requiresAuth: true,
      });
    },

    /**
     * Unlike a community post
     */
    unlikePost: async (postId: string): Promise<void> => {
      return this.request('DELETE', `/api/v1/community/posts/${postId}/like`, {
        requiresAuth: true,
      });
    },
  };

  // ==========================================================================
  // Coach Namespace
  // ==========================================================================

  coach = {
    /**
     * Refine a generated image using multi-turn conversation.
     * Uses Gemini's conversation context for cheaper refinements (~60-80% savings).
     * 
     * Tier access:
     * - Free: Cannot refine
     * - Pro: 5 free refinements/month, then counts as creation
     * - Studio: Unlimited refinements
     */
    refineImage: async (
      sessionId: string,
      data: { refinement: string }
    ): Promise<{
      jobId: string;
      status: string;
      message: string;
      refinementsUsed: number;
      refinementsRemaining: number;
      countedAsCreation: boolean;
    }> => {
      return this.request('POST', `/api/v1/coach/sessions/${sessionId}/refine`, {
        body: {
          refinement: data.refinement,
        },
        requiresAuth: true,
      });
    },

    /**
     * Generate an asset from a coach session
     */
    generateFromSession: async (
      sessionId: string,
      data?: {
        includeLogo?: boolean;
        logoType?: string;
        logoPosition?: string;
        mediaAssetIds?: string[];
        mediaAssetPlacements?: Array<{
          assetId: string;
          displayName: string;
          assetType: string;
          url: string;
          x: number;
          y: number;
          width: number;
          height: number;
          sizeUnit?: 'percent' | 'px';
          zIndex?: number;
          rotation?: number;
          opacity?: number;
        }>;
      }
    ): Promise<{
      jobId: string;
      status: string;
      message: string;
    }> => {
      const body: Record<string, unknown> = {
        include_logo: data?.includeLogo ?? false,
      };
      
      if (data?.logoType) body.logo_type = data.logoType;
      if (data?.logoPosition) body.logo_position = data.logoPosition;
      if (data?.mediaAssetIds) body.media_asset_ids = data.mediaAssetIds;
      if (data?.mediaAssetPlacements) {
        body.media_asset_placements = data.mediaAssetPlacements.map(p => ({
          asset_id: p.assetId,
          display_name: p.displayName,
          asset_type: p.assetType,
          url: p.url,
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
          size_unit: p.sizeUnit ?? 'percent',
          z_index: p.zIndex ?? 1,
          rotation: p.rotation ?? 0,
          opacity: p.opacity ?? 100,
        }));
      }

      return this.request('POST', `/api/v1/coach/sessions/${sessionId}/generate`, {
        body,
        requiresAuth: true,
      });
    },

    /**
     * Get session state
     */
    getSession: async (sessionId: string): Promise<{
      sessionId: string;
      status: 'active' | 'ended' | 'expired';
      turnsUsed: number;
      turnsRemaining: number;
      currentPrompt?: string;
      promptVersions: number;
    }> => {
      return this.request('GET', `/api/v1/coach/sessions/${sessionId}`, {
        requiresAuth: true,
      });
    },

    /**
     * Get assets generated from a coach session
     */
    getSessionAssets: async (sessionId: string): Promise<{
      assets: Array<{
        id: string;
        url: string;
        assetType: string;
        width: number;
        height: number;
        createdAt: string;
      }>;
    }> => {
      return this.request('GET', `/api/v1/coach/sessions/${sessionId}/assets`, {
        requiresAuth: true,
      });
    },
  };

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Make an HTTP request with FormData (for file uploads)
   */
  private async requestWithFormData<T>(
    path: string,
    file: File,
    fieldName: string = 'file'
  ): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const url = `${this.baseUrl}${path}`;

    let response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    // Handle 401 Unauthorized - attempt token refresh
    if (response.status === 401) {
      const refreshed = await this.handleUnauthorized();
      if (refreshed) {
        // Retry with new token
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        response = await fetch(url, {
          method: 'POST',
          headers,
          body: formData,
          credentials: 'include',
        });
      }
    }

    return this.parseResponse<T>(response);
  }

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
