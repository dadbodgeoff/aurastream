/**
 * Subscription TypeScript types for Streamer Studio.
 * Handles Stripe subscription management, checkout, and billing portal.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Available subscription tiers for users.
 * - free: Basic tier with limited features
 * - pro: Professional tier with enhanced features
 * - studio: Premium tier with full access including Prompt Coach
 */
export type SubscriptionTier = 'free' | 'pro' | 'studio';

/**
 * Current status of a user's subscription.
 * - active: Subscription is active and in good standing
 * - past_due: Payment failed, subscription at risk
 * - canceled: Subscription has been canceled
 * - none: No subscription (free tier)
 */
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'none';

/**
 * Plan types available for purchase (excludes free tier).
 */
export type PlanType = 'pro' | 'studio';

// ============================================================================
// Request Types
// ============================================================================

/**
 * Request payload for creating a Stripe checkout session.
 */
export interface CheckoutRequest {
  /** The plan to subscribe to */
  plan: PlanType;
  /** URL to redirect to after successful checkout */
  successUrl?: string;
  /** URL to redirect to if checkout is canceled */
  cancelUrl?: string;
}

/**
 * Request payload for creating a Stripe billing portal session.
 */
export interface PortalRequest {
  /** URL to redirect to after leaving the portal */
  returnUrl?: string;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Response from creating a Stripe checkout session.
 */
export interface CheckoutResponse {
  /** URL to redirect the user to for checkout */
  checkoutUrl: string;
  /** Stripe checkout session ID */
  sessionId: string;
}

/**
 * Response from creating a Stripe billing portal session.
 */
export interface PortalResponse {
  /** URL to redirect the user to for the billing portal */
  portalUrl: string;
}

/**
 * Response containing the user's current subscription status.
 */
export interface SubscriptionStatusResponse {
  /** Whether the user has an active paid subscription */
  hasSubscription: boolean;
  /** Current subscription tier */
  tier: SubscriptionTier;
  /** Current subscription status */
  status: SubscriptionStatus;
  /** ISO 8601 timestamp when the current billing period ends, null if no subscription */
  currentPeriodEnd: string | null;
  /** Whether the subscription will cancel at the end of the current period */
  cancelAtPeriodEnd: boolean;
  /** Whether the user can upgrade their subscription */
  canUpgrade: boolean;
  /** Whether the user can downgrade their subscription */
  canDowngrade: boolean;
}

/**
 * Response from canceling a subscription.
 */
export interface CancelResponse {
  /** Confirmation message */
  message: string;
}

// All types are already exported inline above
