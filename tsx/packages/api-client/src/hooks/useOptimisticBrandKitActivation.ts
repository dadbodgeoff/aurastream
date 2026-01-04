/**
 * Optimistic Brand Kit Activation Hook
 *
 * Provides instant UI feedback when activating a brand kit by optimistically
 * updating the cache before the server responds. Automatically rolls back
 * on error and shows user feedback via toast notifications.
 *
 * @module hooks/useOptimisticBrandKitActivation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useCallback } from 'react';
import { apiClient } from '../client';
import { brandKitKeys } from './useBrandKits';
import type { BrandKit, BrandKitListResponse } from '../types/brandKit';

/**
 * Context type for rollback on error
 */
interface OptimisticContext {
  /** Previous brand kit list data for rollback */
  previousList: BrandKitListResponse | undefined;
  /** Previous active brand kit data for rollback */
  previousActive: BrandKit | null | undefined;
}

/**
 * Options for the optimistic brand kit activation hook
 */
export interface UseOptimisticBrandKitActivationOptions {
  /**
   * Callback when activation fails
   * @param error - The error that occurred
   * @param brandKitId - The ID of the brand kit that failed to activate
   */
  onError?: (error: Error, brandKitId: string) => void;
  /**
   * Callback when activation succeeds
   * @param brandKit - The activated brand kit
   */
  onSuccess?: (brandKit: BrandKit) => void;
}

/**
 * Hook for optimistically activating a brand kit.
 *
 * This hook provides instant UI feedback by:
 * 1. Canceling any outgoing refetches to prevent race conditions
 * 2. Snapshotting the current cache state for potential rollback
 * 3. Optimistically updating the cache to show the new active state
 * 4. Rolling back on error and showing an error toast
 * 5. Invalidating queries on settlement to ensure server consistency
 * 6. Deduplicating rapid clicks to prevent race conditions
 *
 * @example
 * ```tsx
 * import { useOptimisticBrandKitActivation } from '@aurastream/api-client';
 * import { toast } from '@/components/ui/Toast';
 *
 * function BrandKitCard({ brandKit }) {
 *   const { activate, isPending } = useOptimisticBrandKitActivation({
 *     onError: (error) => toast.error('Failed to activate brand kit'),
 *     onSuccess: (kit) => toast.success(`${kit.name} is now active`),
 *   });
 *
 *   return (
 *     <button
 *       onClick={() => activate(brandKit.id)}
 *       disabled={isPending}
 *     >
 *       {brandKit.is_active ? 'Active' : 'Activate'}
 *     </button>
 *   );
 * }
 * ```
 *
 * @param options - Optional callbacks for error and success handling
 * @returns Object with activate function and mutation state
 */
export function useOptimisticBrandKitActivation(
  options?: UseOptimisticBrandKitActivationOptions
) {
  const queryClient = useQueryClient();
  
  // Track in-flight activation to prevent race conditions from rapid clicks
  const pendingActivationRef = useRef<string | null>(null);

  const mutation = useMutation<BrandKit, Error, string, OptimisticContext>({
    mutationFn: (brandKitId: string) => apiClient.brandKits.activate(brandKitId),

    onMutate: async (brandKitId: string): Promise<OptimisticContext> => {
      // Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: brandKitKeys.all });

      // Snapshot the previous values for rollback
      const previousList = queryClient.getQueryData<BrandKitListResponse>(
        brandKitKeys.list()
      );
      const previousActive = queryClient.getQueryData<BrandKit | null>(
        brandKitKeys.active()
      );

      // Optimistically update the brand kit list
      if (previousList) {
        queryClient.setQueryData<BrandKitListResponse>(
          brandKitKeys.list(),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              activeId: brandKitId,
              brandKits: old.brandKits.map((kit) => ({
                ...kit,
                is_active: kit.id === brandKitId,
              })),
            };
          }
        );
      }

      // Optimistically update the active brand kit query
      if (previousList) {
        const newActiveKit = previousList.brandKits.find(
          (kit) => kit.id === brandKitId
        );
        if (newActiveKit) {
          queryClient.setQueryData<BrandKit>(brandKitKeys.active(), {
            ...newActiveKit,
            is_active: true,
          });
        }
      }

      // Return context with previous values for rollback
      return { previousList, previousActive };
    },

    onError: (error: Error, brandKitId: string, context?: OptimisticContext) => {
      // Rollback to the previous state on error
      if (context?.previousList) {
        queryClient.setQueryData<BrandKitListResponse>(
          brandKitKeys.list(),
          context.previousList
        );
      }
      if (context?.previousActive !== undefined) {
        queryClient.setQueryData<BrandKit | null>(
          brandKitKeys.active(),
          context.previousActive
        );
      }

      // Log error for debugging
      console.error('Failed to activate brand kit:', error);

      // Call user-provided error handler
      options?.onError?.(error, brandKitId);
    },

    onSuccess: (data: BrandKit) => {
      // Call user-provided success handler
      options?.onSuccess?.(data);
    },

    onSettled: (_data, _error, brandKitId) => {
      // Clear pending activation tracking
      if (pendingActivationRef.current === brandKitId) {
        pendingActivationRef.current = null;
      }
      // Always invalidate to ensure server state consistency
      queryClient.invalidateQueries({ queryKey: brandKitKeys.all });
    },
  });

  // Wrapped activate function with deduplication
  const activate = useCallback((brandKitId: string) => {
    // Prevent rapid clicks on the same or different brand kits
    if (pendingActivationRef.current !== null) {
      return;
    }
    pendingActivationRef.current = brandKitId;
    mutation.mutate(brandKitId);
  }, [mutation]);

  return {
    activate,
    mutate: activate, // Alias for backward compatibility
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

export default useOptimisticBrandKitActivation;
