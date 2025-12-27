/**
 * Query Key Factory for AuraStream
 *
 * This module provides type-safe, hierarchical query keys for TanStack Query.
 *
 * Benefits:
 * - Type-safe query keys with autocomplete
 * - Consistent cache invalidation patterns
 * - Hierarchical structure for granular invalidation
 * - Single source of truth for all query keys
 *
 * Usage:
 * ```typescript
 * // In a hook
 * useQuery({
 *   queryKey: queryKeys.brandKits.detail(id),
 *   queryFn: () => apiClient.brandKits.get(id),
 * });
 *
 * // For invalidation - invalidate all brand kit queries
 * queryClient.invalidateQueries({ queryKey: queryKeys.brandKits.all });
 *
 * // For invalidation - invalidate only brand kit lists
 * queryClient.invalidateQueries({ queryKey: queryKeys.brandKits.lists() });
 *
 * // For invalidation - invalidate a specific brand kit
 * queryClient.invalidateQueries({ queryKey: queryKeys.brandKits.detail(id) });
 * ```
 *
 * Hierarchy Pattern:
 * - `all`: Base key for the entire domain (e.g., ['brandKits'])
 * - `lists()`: All list queries (e.g., ['brandKits', 'list'])
 * - `list(filters)`: Specific list with filters (e.g., ['brandKits', 'list', { search: 'foo' }])
 * - `details()`: All detail queries (e.g., ['brandKits', 'detail'])
 * - `detail(id)`: Specific detail query (e.g., ['brandKits', 'detail', 'abc123'])
 */

// ============================================================================
// Filter Types
// ============================================================================

export interface BrandKitFilters {
  search?: string;
}

export interface JobFilters {
  status?: string;
  limit?: number;
  offset?: number;
}

export interface AssetFilters {
  assetType?: string;
  limit?: number;
  offset?: number;
}

export interface CoachSessionFilters {
  limit?: number;
  offset?: number;
}

// ============================================================================
// Query Key Factory
// ============================================================================

export const queryKeys = {
  // =========================================================================
  // Authentication
  // =========================================================================
  auth: {
    /** Base key for all auth queries */
    all: ['auth'] as const,
    /** Current user profile */
    me: () => [...queryKeys.auth.all, 'me'] as const,
    /** User session state */
    session: () => [...queryKeys.auth.all, 'session'] as const,
  },

  // =========================================================================
  // Brand Kits
  // =========================================================================
  brandKits: {
    /** Base key for all brand kit queries */
    all: ['brandKits'] as const,
    /** All brand kit list queries */
    lists: () => [...queryKeys.brandKits.all, 'list'] as const,
    /** Brand kit list with optional filters */
    list: (filters?: BrandKitFilters) =>
      filters
        ? ([...queryKeys.brandKits.lists(), filters] as const)
        : queryKeys.brandKits.lists(),
    /** All brand kit detail queries */
    details: () => [...queryKeys.brandKits.all, 'detail'] as const,
    /** Specific brand kit by ID */
    detail: (id: string) => [...queryKeys.brandKits.details(), id] as const,
    /** Active brand kit query */
    active: () => [...queryKeys.brandKits.all, 'active'] as const,
    /** Extended colors for a brand kit */
    colors: (id: string) => [...queryKeys.brandKits.detail(id), 'colors'] as const,
    /** Typography settings for a brand kit */
    typography: (id: string) => [...queryKeys.brandKits.detail(id), 'typography'] as const,
    /** Voice settings for a brand kit */
    voice: (id: string) => [...queryKeys.brandKits.detail(id), 'voice'] as const,
    /** Brand guidelines for a brand kit */
    guidelines: (id: string) => [...queryKeys.brandKits.detail(id), 'guidelines'] as const,
    /** All logos for a brand kit */
    logos: (id: string) => [...queryKeys.brandKits.detail(id), 'logos'] as const,
    /** Specific logo type for a brand kit */
    logo: (id: string, logoType: string) =>
      [...queryKeys.brandKits.logos(id), logoType] as const,
  },

  // =========================================================================
  // Generation Jobs
  // =========================================================================
  jobs: {
    /** Base key for all job queries */
    all: ['jobs'] as const,
    /** All job list queries */
    lists: () => [...queryKeys.jobs.all, 'list'] as const,
    /** Job list with optional filters */
    list: (filters?: JobFilters) =>
      filters
        ? ([...queryKeys.jobs.lists(), filters] as const)
        : queryKeys.jobs.lists(),
    /** All job detail queries */
    details: () => [...queryKeys.jobs.all, 'detail'] as const,
    /** Specific job by ID */
    detail: (id: string) => [...queryKeys.jobs.details(), id] as const,
    /** Assets for a specific job */
    assets: (jobId: string) => [...queryKeys.jobs.detail(jobId), 'assets'] as const,
  },

  // =========================================================================
  // Assets
  // =========================================================================
  assets: {
    /** Base key for all asset queries */
    all: ['assets'] as const,
    /** All asset list queries */
    lists: () => [...queryKeys.assets.all, 'list'] as const,
    /** Asset list with optional filters */
    list: (filters?: AssetFilters) =>
      filters
        ? ([...queryKeys.assets.lists(), filters] as const)
        : queryKeys.assets.lists(),
    /** All asset detail queries */
    details: () => [...queryKeys.assets.all, 'detail'] as const,
    /** Specific asset by ID */
    detail: (id: string) => [...queryKeys.assets.details(), id] as const,
    /** Public asset (no auth required) */
    public: (id: string) => [...queryKeys.assets.all, 'public', id] as const,
  },

  // =========================================================================
  // Subscriptions
  // =========================================================================
  subscriptions: {
    /** Base key for all subscription queries */
    all: ['subscriptions'] as const,
    /** Current subscription status */
    status: () => [...queryKeys.subscriptions.all, 'status'] as const,
    /** Subscription plans/pricing */
    plans: () => [...queryKeys.subscriptions.all, 'plans'] as const,
  },

  // =========================================================================
  // Prompt Coach
  // =========================================================================
  coach: {
    /** Base key for all coach queries */
    all: ['coach'] as const,
    /** Coach access/tier check */
    access: () => [...queryKeys.coach.all, 'access'] as const,
    /** Tips for a specific asset type */
    tips: (assetType: string) => [...queryKeys.coach.all, 'tips', assetType] as const,
    /** All coach session queries */
    sessions: () => [...queryKeys.coach.all, 'sessions'] as const,
    /** Coach session list with optional filters */
    sessionList: (filters?: CoachSessionFilters) =>
      filters
        ? ([...queryKeys.coach.sessions(), 'list', filters] as const)
        : ([...queryKeys.coach.sessions(), 'list'] as const),
    /** Specific coach session by ID */
    session: (id: string) => [...queryKeys.coach.sessions(), id] as const,
    /** Assets generated in a coach session */
    sessionAssets: (sessionId: string) =>
      [...queryKeys.coach.session(sessionId), 'assets'] as const,
  },

  // =========================================================================
  // Twitch
  // =========================================================================
  twitch: {
    /** Base key for all Twitch queries */
    all: ['twitch'] as const,
    /** Twitch asset dimension specifications */
    dimensions: () => [...queryKeys.twitch.all, 'dimensions'] as const,
    /** Game metadata for context */
    gameMeta: (gameId: string) => [...queryKeys.twitch.all, 'game', gameId] as const,
    /** All Twitch pack queries */
    packs: () => [...queryKeys.twitch.all, 'packs'] as const,
    /** Specific Twitch pack by ID */
    pack: (id: string) => [...queryKeys.twitch.packs(), id] as const,
  },

  // =========================================================================
  // Analytics
  // =========================================================================
  analytics: {
    /** Base key for all analytics queries */
    all: ['analytics'] as const,
    /** Analytics summary/dashboard */
    summary: () => [...queryKeys.analytics.all, 'summary'] as const,
    /** Popular asset types */
    popularAssets: () => [...queryKeys.analytics.all, 'popular'] as const,
    /** Flush status */
    flushStatus: () => [...queryKeys.analytics.all, 'flush-status'] as const,
  },

  // =========================================================================
  // User (for profile-related queries)
  // =========================================================================
  user: {
    /** Base key for all user queries */
    all: ['user'] as const,
    /** Current user profile (alias for auth.me) */
    me: () => [...queryKeys.user.all, 'me'] as const,
    /** User preferences */
    preferences: () => [...queryKeys.user.all, 'preferences'] as const,
  },
} as const;

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Type representing the entire query keys object
 */
export type QueryKeys = typeof queryKeys;

/**
 * Helper type for extracting the return type of a query key function
 *
 * @example
 * type BrandKitDetailKey = QueryKeyOf<typeof queryKeys.brandKits.detail>;
 * // Result: readonly ["brandKits", "detail", string]
 */
export type QueryKeyOf<T extends (...args: any[]) => readonly unknown[]> = ReturnType<T>;

/**
 * Helper type for extracting all possible query keys for a domain
 *
 * @example
 * type BrandKitKeys = DomainQueryKeys<typeof queryKeys.brandKits>;
 */
export type DomainQueryKeys<T extends Record<string, unknown>> = T[keyof T];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a query key with optional parameters
 * Useful for dynamic key generation in generic components
 *
 * @example
 * const key = createQueryKey('brandKits', 'detail', id);
 */
export function createQueryKey<T extends readonly unknown[]>(
  ...parts: T
): T {
  return parts;
}

/**
 * Checks if a query key matches a prefix
 * Useful for selective cache invalidation
 *
 * @example
 * const shouldInvalidate = matchesQueryKey(
 *   ['brandKits', 'detail', 'abc123'],
 *   queryKeys.brandKits.all
 * );
 * // Result: true
 */
export function matchesQueryKey(
  queryKey: readonly unknown[],
  prefix: readonly unknown[]
): boolean {
  if (queryKey.length < prefix.length) return false;
  return prefix.every((part, index) => queryKey[index] === part);
}
