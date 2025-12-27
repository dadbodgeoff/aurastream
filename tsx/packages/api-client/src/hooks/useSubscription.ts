/**
 * TanStack Query hooks for subscription operations.
 * Handles Stripe subscription management, checkout, and billing portal.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';
import type {
  CheckoutRequest,
  CheckoutResponse,
  PortalRequest,
  PortalResponse,
  SubscriptionStatusResponse,
  CancelResponse,
} from '../types/subscription';

// ============================================================================
// Query Keys (Legacy - use queryKeys.subscriptions from '../queryKeys' instead)
// ============================================================================

/**
 * Query keys for subscription-related queries.
 * Used for cache management and query invalidation.
 *
 * @deprecated Use `queryKeys.subscriptions` from '../queryKeys' for new code.
 * This export is maintained for backward compatibility.
 */
export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  status: () => [...subscriptionKeys.all, 'status'] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to fetch the current user's subscription status.
 * 
 * @returns Query result containing subscription status information including:
 *   - hasSubscription: Whether the user has an active paid subscription
 *   - tier: Current subscription tier (free, pro, studio)
 *   - status: Current subscription status (active, past_due, canceled, none)
 *   - currentPeriodEnd: When the current billing period ends
 *   - cancelAtPeriodEnd: Whether subscription will cancel at period end
 *   - canUpgrade/canDowngrade: Whether tier changes are available
 * 
 * @example
 * ```tsx
 * const { data: status, isLoading } = useSubscriptionStatus();
 * 
 * if (isLoading) return <Spinner />;
 * 
 * return (
 *   <div>
 *     <p>Current tier: {status?.tier}</p>
 *     <p>Status: {status?.status}</p>
 *   </div>
 * );
 * ```
 */
export function useSubscriptionStatus() {
  return useQuery({
    queryKey: queryKeys.subscriptions.status(),
    queryFn: () => apiClient.subscriptions.getStatus(),
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to create a Stripe checkout session for subscription purchase.
 * 
 * On success, invalidates the subscription status query to ensure
 * fresh data is fetched after the user completes checkout.
 * 
 * @returns Mutation object with mutate/mutateAsync functions
 * 
 * @example
 * ```tsx
 * const createCheckout = useCreateCheckout();
 * 
 * const handleUpgrade = async () => {
 *   const { checkoutUrl } = await createCheckout.mutateAsync({
 *     plan: 'pro',
 *     successUrl: window.location.origin + '/subscription/success',
 *     cancelUrl: window.location.origin + '/pricing',
 *   });
 *   
 *   // Redirect to Stripe checkout
 *   window.location.href = checkoutUrl;
 * };
 * ```
 */
export function useCreateCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CheckoutRequest): Promise<CheckoutResponse> =>
      apiClient.subscriptions.createCheckout(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.status() });
    },
  });
}

/**
 * Hook to create a Stripe billing portal session.
 * 
 * The billing portal allows users to manage their subscription,
 * update payment methods, view invoices, and cancel their subscription.
 * 
 * On success, invalidates the subscription status query to ensure
 * fresh data is fetched after the user returns from the portal.
 * 
 * @returns Mutation object with mutate/mutateAsync functions
 * 
 * @example
 * ```tsx
 * const createPortal = useCreatePortal();
 * 
 * const handleManageSubscription = async () => {
 *   const { portalUrl } = await createPortal.mutateAsync({
 *     returnUrl: window.location.href,
 *   });
 *   
 *   // Redirect to Stripe billing portal
 *   window.location.href = portalUrl;
 * };
 * ```
 */
export function useCreatePortal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: PortalRequest): Promise<PortalResponse> =>
      apiClient.subscriptions.createPortal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.status() });
    },
  });
}

/**
 * Hook to cancel the current subscription at the end of the billing period.
 * 
 * The subscription will remain active until the current period ends,
 * then automatically downgrade to the free tier.
 * 
 * On success, invalidates the subscription status query to reflect
 * the updated cancelAtPeriodEnd status.
 * 
 * @returns Mutation object with mutate/mutateAsync functions
 * 
 * @example
 * ```tsx
 * const cancelSubscription = useCancelSubscription();
 * 
 * const handleCancel = async () => {
 *   if (confirm('Are you sure you want to cancel?')) {
 *     const { message } = await cancelSubscription.mutateAsync();
 *     toast.success(message);
 *   }
 * };
 * ```
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (): Promise<CancelResponse> =>
      apiClient.subscriptions.cancel(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.status() });
    },
  });
}
