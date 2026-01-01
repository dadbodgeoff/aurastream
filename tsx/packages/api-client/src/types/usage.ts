/**
 * Usage tracking types for AuraStream.
 * 
 * @module types/usage
 */

export type SubscriptionTier = 'free' | 'pro' | 'studio' | 'unlimited';

export interface UsageStats {
  /** Current subscription tier */
  tier: SubscriptionTier;
  /** Human-readable tier name */
  tierDisplay: string;
  
  /** Assets generated this billing period */
  generationsUsed: number;
  /** Monthly generation limit (-1 for unlimited) */
  generationsLimit: number;
  /** Generations remaining this period */
  generationsRemaining: number;
  /** Percentage of limit used (0-100) */
  generationsPercentage: number;
  
  /** Whether coach is available to user */
  coachAvailable: boolean;
  /** Max messages per coach session */
  coachMessagesPerSession: number;
  /** Whether free trial is available */
  coachTrialAvailable: boolean;
  /** Whether free trial has been used */
  coachTrialUsed: boolean;
  
  /** Current billing period start (ISO) */
  periodStart: string | null;
  /** Current billing period end (ISO) */
  periodEnd: string | null;
  /** Days remaining in period */
  daysRemaining: number | null;
  
  /** Whether user can upgrade */
  canUpgrade: boolean;
  /** Benefits of upgrading */
  upgradeBenefits: string[];
}

/**
 * Tier display configuration
 */
export const TIER_DISPLAY: Record<SubscriptionTier, {
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  free: {
    name: 'Free',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
  },
  pro: {
    name: 'Pro',
    color: 'text-interactive-400',
    bgColor: 'bg-interactive-500/10',
    borderColor: 'border-interactive-500/30',
  },
  studio: {
    name: 'Studio',
    color: 'text-accent-400',
    bgColor: 'bg-accent-500/10',
    borderColor: 'border-accent-500/30',
  },
  unlimited: {
    name: 'Unlimited',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
};
