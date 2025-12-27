/**
 * Optimistic Brand Kit Deletion Hook
 *
 * Provides instant UI feedback when deleting a brand kit by optimistically
 * removing it from the cache before the server responds. Automatically
 * rolls back on error and shows user feedback via toast notifications.
 *
 * @module hooks/useOptimisticBrandKitDeletion
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  /** The deleted brand kit for potential restoration */
  deletedBrandKit: BrandKit | undefined;
}

/**
 * Options for the optimistic brand kit deletion hook
 */
export interface UseOptimisticBrandKitDeletionOptions {
  /**
   * Callback when deletion fails
   * @param error - The error that occurred
   * @param brandKitId - The ID of the brand kit that failed to delete
   */
  onError?: (error: Error, brandKitId: string) => void;
  /**
   * Callback when deletion succeeds
   * @param brandKitId - The ID of the deleted brand kit
   */
  onSuccess?: (brandKitId: string) => void;
}

/**
 * Hook for optimistically deleting a brand kit.
 *
 * This hook provides instant UI feedback by:
 * 1. Canceling any outgoing refetches to prevent race conditions
 * 2. Snapshotting the current cache state for potential rollback
 * 3. Optimistically removing the brand kit from the cached list
 * 4. Handling active brand kit state if the deleted kit was active
 * 5. Rolling back on error and showing an error toast
 * 6. Invalidating queries on settlement to ensure server consistency
 *
 * @example
 * ```tsx
 * import { useOptimisticBrandKitDeletion } from '@aurastream/api-client';
 * import { toast } from '@/components/ui/Toast';
 *
 * function BrandKitCard({ brandKit }) {
 *   const deleteMutation = useOptimisticBrandKitDeletion({
 *     onError: () => toast.error('Failed to delete brand kit'),
 *     onSuccess: () => toast.success('Brand kit deleted'),
 *   });
 *
 *   return (
 *     <button
 *       onClick={() => deleteMutation.mutate(brandKit.id)}
 *       disabled={deleteMutation.isPending}
 *     >
 *       Delete
 *     </button>
 *   );
 * }
 * ```
 *
 * @param options - Optional callbacks for error and success handling
 * @returns TanStack Query mutation object with optimistic update behavior
 */
export function useOptimisticBrandKitDeletion(
  options?: UseOptimisticBrandKitDeletionOptions
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, OptimisticContext>({
    mutationFn: (brandKitId: string) => apiClient.brandKits.delete(brandKitId),

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

      // Find the brand kit being deleted
      const deletedBrandKit = previousList?.brandKits.find(
        (kit) => kit.id === brandKitId
      );

      // Optimistically update the brand kit list
      if (previousList) {
        const updatedBrandKits = previousList.brandKits.filter(
          (kit) => kit.id !== brandKitId
        );

        // Determine new active ID
        let newActiveId = previousList.activeId;
        if (previousList.activeId === brandKitId) {
          // If we're deleting the active kit, clear the active ID
          // (or optionally set to first remaining kit)
          newActiveId = null;
        }

        queryClient.setQueryData<BrandKitListResponse>(brandKitKeys.list(), {
          ...previousList,
          brandKits: updatedBrandKits,
          total: Math.max(0, previousList.total - 1),
          activeId: newActiveId,
        });
      }

      // If the deleted brand kit was active, clear the active query
      if (previousActive?.id === brandKitId) {
        queryClient.setQueryData<BrandKit | null>(brandKitKeys.active(), null);
      }

      // Remove the individual brand kit detail query
      queryClient.removeQueries({ queryKey: brandKitKeys.detail(brandKitId) });

      // Return context with previous values for rollback
      return { previousList, previousActive, deletedBrandKit };
    },

    onError: (error: Error, brandKitId: string, context?: OptimisticContext) => {
      // Rollback the brand kit list to its previous state
      if (context?.previousList) {
        queryClient.setQueryData<BrandKitListResponse>(
          brandKitKeys.list(),
          context.previousList
        );
      }

      // Rollback the active brand kit query
      if (context?.previousActive !== undefined) {
        queryClient.setQueryData<BrandKit | null>(
          brandKitKeys.active(),
          context.previousActive
        );
      }

      // Restore the individual brand kit detail query if we had the data
      if (context?.deletedBrandKit) {
        queryClient.setQueryData<BrandKit>(
          brandKitKeys.detail(brandKitId),
          context.deletedBrandKit
        );
      }

      // Log error for debugging
      console.error('Failed to delete brand kit:', error);

      // Call user-provided error handler
      options?.onError?.(error, brandKitId);
    },

    onSuccess: (_: void, brandKitId: string) => {
      // Call user-provided success handler
      options?.onSuccess?.(brandKitId);
    },

    onSettled: () => {
      // Always invalidate to ensure server state consistency
      queryClient.invalidateQueries({ queryKey: brandKitKeys.all });
    },
  });
}

export default useOptimisticBrandKitDeletion;
