/**
 * Monthly Usage Limits Types for AuraStream.
 * 
 * Two-tier system:
 * - Free: 1 vibe, 2 aura lab, 1 coach, 3 creations
 * - Pro: 10 vibe, 25 aura lab, unlimited coach, 50 creations
 * 
 * @module types/usageLimits
 */

export type SubscriptionTier = 'free' | 'pro' | 'studio';

/**
 * Usage stats for a single feature
 */
export interface FeatureUsage {
  /** Number used this month */
  used: number;
  /** Monthly limit (-1 for unlimited) */
  limit: number;
  /** Remaining this month */
  remaining: number;
  /** Whether this feature is unlimited */
  unlimited: boolean;
}

/**
 * Complete usage status for all features
 */
export interface UsageStatus {
  /** User's subscription tier */
  tier: SubscriptionTier;
  /** Vibe Branding usage */
  vibeBranding: FeatureUsage;
  /** Aura Lab fusion usage */
  auraLab: FeatureUsage;
  /** Coach session usage */
  coach: FeatureUsage;
  /** Asset creation usage */
  creations: FeatureUsage;
  /** Profile Creator usage */
  profileCreator: FeatureUsage;
  /** When usage resets (ISO string) */
  resetsAt: string | null;
}

/**
 * Response from checking a specific feature
 */
export interface UsageCheckResponse {
  /** Whether user can use the feature */
  canUse: boolean;
  /** Number used this month */
  used: number;
  /** Monthly limit */
  limit: number;
  /** Remaining this month */
  remaining: number;
  /** User's tier */
  tier: SubscriptionTier;
  /** When usage resets */
  resetsAt: string | null;
  /** Upgrade message if limit reached */
  upgradeMessage: string | null;
}

/**
 * Tier limits configuration (for display purposes)
 */
export const TIER_LIMITS = {
  free: {
    vibeBranding: 1,
    auraLab: 2,
    coach: 1,
    creations: 3,
    profileCreator: 1,
  },
  pro: {
    vibeBranding: 10,
    auraLab: 25,
    coach: -1, // unlimited (counted in creations)
    creations: 50,
    profileCreator: 5,
  },
  studio: {
    vibeBranding: 10,
    auraLab: 25,
    coach: -1,
    creations: 50,
    profileCreator: 10,
  },
} as const;

/**
 * Feature display configuration
 */
export const FEATURE_CONFIG = {
  vibeBranding: {
    label: 'Vibe Branding',
    description: 'AI brand analysis',
    icon: 'palette',
    color: 'purple',
  },
  auraLab: {
    label: 'Aura Lab',
    description: 'Fusion experiments',
    icon: 'flask',
    color: 'cyan',
  },
  coach: {
    label: 'Coach',
    description: 'AI prompt help',
    icon: 'chat',
    color: 'amber',
  },
  creations: {
    label: 'Creations',
    description: 'Asset generation',
    icon: 'image',
    color: 'green',
  },
  profileCreator: {
    label: 'Profile Creator',
    description: 'Profile pics & logos',
    icon: 'user',
    color: 'pink',
  },
} as const;

export type FeatureType = keyof typeof FEATURE_CONFIG;
