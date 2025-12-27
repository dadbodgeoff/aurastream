/**
 * Optimistic Asset Deletion Hook
 *
 * Provides instant UI feedback when deleting an asset by optimistically
 * removing it from the cache before the server responds. Automatically
 * rolls back on error and shows user feedback via toast notifications.
 *
 * @module hooks/useOptimisticAssetDeletion
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { generationKeys } from './useGeneration';
import type { AssetResponse, AssetListResponse } from '../types/generation';

/**
 * Context type for rollback on error
 */
interface OptimisticContext {
  /** Previous asset list data for rollback (keyed by query key string) */
  previousLists: Map<string, AssetListResponse>;
  /** Previous individual asset data for rollback */
  previousAsset: AssetResponse | undefined;
  /** The deleted asset for potential restoration */
  deletedAsset: AssetResponse | undefined;
}

/**
 * Options for the optimistic asset deletion hook
 */
export interface UseOptimisticAssetDeletionOptions {
  /**
   * Callback when deletion fails
   * @param error - The error that occurred
   * @param assetId - The ID of the asset that failed to delete
   */
  onError?: (error: Error, assetId: string) => void;
  /**
   * Callback when deletion succeeds
   * @param assetId - The ID of the deleted asset
   */
  onSuccess?: (assetId: string) => void;
}

/**
 * Hook for optimistically deleting an asset.
 *
 * This hook provides instant UI feedback by:
 * 1. Canceling any outgoing refetches to prevent race conditions
 * 2. Snapshotting the current cache state for potential rollback
 * 3. Optimistically removing the asset from all cached lists
 * 4. Rolling back on error and showing an error toast
 * 5. Invalidating queries on settlement to ensure server consistency
 *
 * @example
 * ```tsx
 * import { useOptimisticAssetDeletion } from '@aurastream/api-client';
 * import { toast } from '@/components/ui/Toast';
 *
 * function AssetCard({ asset }) {
 *   const deleteMutation = useOptimisticAssetDeletion({
 *     onError: () => toast.error('Failed to delete asset'),
 *     onSuccess: () => toast.success('Asset deleted'),
 *   });
 *
 *   return (
 *     <button
 *       onClick={() => deleteMutation.mutate(asset.id)}
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
export function useOptimisticAssetDeletion(
  options?: UseOptimisticAssetDeletionOptions
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, OptimisticContext>({
    mutationFn: (assetId: string) => apiClient.assets.delete(assetId),

    onMutate: async (assetId: string): Promise<OptimisticContext> => {
      // Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: generationKeys.assets() });

      // Store previous lists for rollback
      const previousLists = new Map<string, AssetListResponse>();
      let deletedAsset: AssetResponse | undefined;

      // Get all cached asset list queries
      const assetQueries = queryClient.getQueriesData<AssetListResponse>({
        queryKey: generationKeys.assets(),
      });

      // Snapshot and optimistically update each cached list
      for (const [queryKey, data] of assetQueries) {
        if (data) {
          // Store the previous data for rollback
          previousLists.set(JSON.stringify(queryKey), data);

          // Find the asset being deleted (for potential restoration)
          if (!deletedAsset) {
            deletedAsset = data.assets.find((asset) => asset.id === assetId);
          }

          // Optimistically remove the asset from this list
          queryClient.setQueryData<AssetListResponse>(queryKey, {
            ...data,
            assets: data.assets.filter((asset) => asset.id !== assetId),
            total: Math.max(0, data.total - 1),
          });
        }
      }

      // Snapshot the individual asset query
      const previousAsset = queryClient.getQueryData<AssetResponse>(
        generationKeys.asset(assetId)
      );

      // Remove the individual asset from cache
      queryClient.removeQueries({ queryKey: generationKeys.asset(assetId) });

      // Return context with previous values for rollback
      return { previousLists, previousAsset, deletedAsset };
    },

    onError: (error: Error, assetId: string, context?: OptimisticContext) => {
      // Rollback all asset lists to their previous state
      if (context?.previousLists) {
        for (const [queryKeyStr, data] of context.previousLists) {
          const queryKey = JSON.parse(queryKeyStr);
          queryClient.setQueryData<AssetListResponse>(queryKey, data);
        }
      }

      // Restore the individual asset query
      if (context?.previousAsset) {
        queryClient.setQueryData<AssetResponse>(
          generationKeys.asset(assetId),
          context.previousAsset
        );
      }

      // Log error for debugging
      console.error('Failed to delete asset:', error);

      // Call user-provided error handler
      options?.onError?.(error, assetId);
    },

    onSuccess: (_: void, assetId: string) => {
      // Call user-provided success handler
      options?.onSuccess?.(assetId);
    },

    onSettled: () => {
      // Always invalidate to ensure server state consistency
      queryClient.invalidateQueries({ queryKey: generationKeys.assets() });
    },
  });
}

/**
 * Hook for optimistically deleting multiple assets in bulk.
 *
 * This hook provides instant UI feedback by removing all selected assets
 * from the cache immediately, then rolling back if any deletion fails.
 *
 * @example
 * ```tsx
 * import { useOptimisticBulkAssetDeletion } from '@aurastream/api-client';
 * import { toast } from '@/components/ui/Toast';
 *
 * function AssetGrid({ selectedAssets }) {
 *   const bulkDeleteMutation = useOptimisticBulkAssetDeletion({
 *     onError: (error, count) => toast.error(`Failed to delete ${count} assets`),
 *     onSuccess: (count) => toast.success(`Deleted ${count} assets`),
 *   });
 *
 *   return (
 *     <button
 *       onClick={() => bulkDeleteMutation.mutate(Array.from(selectedAssets))}
 *       disabled={bulkDeleteMutation.isPending}
 *     >
 *       Delete Selected ({selectedAssets.size})
 *     </button>
 *   );
 * }
 * ```
 *
 * @param options - Optional callbacks for error and success handling
 * @returns TanStack Query mutation object with optimistic update behavior
 */
export interface UseOptimisticBulkAssetDeletionOptions {
  /**
   * Callback when bulk deletion fails
   * @param error - The error that occurred
   * @param failedCount - Number of assets that failed to delete
   */
  onError?: (error: Error, failedCount: number) => void;
  /**
   * Callback when bulk deletion succeeds
   * @param deletedCount - Number of assets successfully deleted
   */
  onSuccess?: (deletedCount: number) => void;
}

interface BulkOptimisticContext {
  previousLists: Map<string, AssetListResponse>;
  deletedAssets: AssetResponse[];
}

export function useOptimisticBulkAssetDeletion(
  options?: UseOptimisticBulkAssetDeletionOptions
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string[], BulkOptimisticContext>({
    mutationFn: async (assetIds: string[]) => {
      // Delete all assets in parallel
      await Promise.all(assetIds.map((id) => apiClient.assets.delete(id)));
    },

    onMutate: async (assetIds: string[]): Promise<BulkOptimisticContext> => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: generationKeys.assets() });

      const previousLists = new Map<string, AssetListResponse>();
      const deletedAssets: AssetResponse[] = [];
      const assetIdSet = new Set(assetIds);

      // Get all cached asset list queries
      const assetQueries = queryClient.getQueriesData<AssetListResponse>({
        queryKey: generationKeys.assets(),
      });

      // Snapshot and optimistically update each cached list
      for (const [queryKey, data] of assetQueries) {
        if (data) {
          previousLists.set(JSON.stringify(queryKey), data);

          // Collect deleted assets for potential restoration
          const assetsToDelete = data.assets.filter((asset) =>
            assetIdSet.has(asset.id)
          );
          deletedAssets.push(...assetsToDelete);

          // Optimistically remove all selected assets
          queryClient.setQueryData<AssetListResponse>(queryKey, {
            ...data,
            assets: data.assets.filter((asset) => !assetIdSet.has(asset.id)),
            total: Math.max(0, data.total - assetsToDelete.length),
          });
        }
      }

      // Remove individual asset queries
      for (const assetId of assetIds) {
        queryClient.removeQueries({ queryKey: generationKeys.asset(assetId) });
      }

      return { previousLists, deletedAssets };
    },

    onError: (error: Error, assetIds: string[], context?: BulkOptimisticContext) => {
      // Rollback all asset lists
      if (context?.previousLists) {
        for (const [queryKeyStr, data] of context.previousLists) {
          const queryKey = JSON.parse(queryKeyStr);
          queryClient.setQueryData<AssetListResponse>(queryKey, data);
        }
      }

      console.error('Failed to delete assets:', error);
      options?.onError?.(error, assetIds.length);
    },

    onSuccess: (_: void, assetIds: string[]) => {
      options?.onSuccess?.(assetIds.length);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: generationKeys.assets() });
    },
  });
}

export default useOptimisticAssetDeletion;
