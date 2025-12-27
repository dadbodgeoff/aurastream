/**
 * useUndo Hook
 *
 * A React hook that wraps the undoStore for component usage.
 * Provides a convenient API for pushing undo actions and handles cleanup on unmount.
 *
 * @module hooks/useUndo
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  useUndoStore,
  type UndoActionType,
  type UndoAction,
} from '@aurastream/shared';

/**
 * Return type for the useUndo hook
 */
export interface UseUndoReturn {
  /** Array of pending undo actions */
  actions: UndoAction[];
  /**
   * Push a new undo action to the stack
   * @param type - Type of action (delete_asset, delete_brand_kit, bulk_delete)
   * @param label - Human-readable label for the action
   * @param data - Data needed to restore the action
   * @param undoFn - Function to execute to undo the action
   * @returns The unique ID of the created undo action
   */
  pushUndo: (
    type: UndoActionType,
    label: string,
    data: unknown,
    undoFn: () => Promise<void>
  ) => string;
  /** Execute the undo function for a specific action */
  executeUndo: (id: string) => Promise<void>;
  /** Remove an action from the stack */
  removeAction: (id: string) => void;
  /** Clear all expired actions */
  clearExpired: () => void;
  /** Check if there are any pending undo actions */
  hasPendingActions: boolean;
}

/**
 * Hook for managing undo actions in components.
 *
 * Provides a simplified API for pushing undo actions and automatically
 * tracks actions created by this component instance for potential cleanup.
 *
 * @example
 * ```tsx
 * function DeleteAssetButton({ asset }) {
 *   const { pushUndo } = useUndo();
 *   const deleteAssetMutation = useDeleteAsset();
 *
 *   const handleDelete = async () => {
 *     // Perform the delete
 *     await deleteAssetMutation.mutateAsync(asset.id);
 *
 *     // Push undo action
 *     pushUndo(
 *       'delete_asset',
 *       `Deleted "${asset.name}"`,
 *       asset,
 *       async () => {
 *         // Restore the asset
 *         await restoreAsset(asset);
 *       }
 *     );
 *   };
 *
 *   return <button onClick={handleDelete}>Delete</button>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Bulk delete with undo
 * function BulkDeleteButton({ selectedAssets }) {
 *   const { pushUndo } = useUndo();
 *
 *   const handleBulkDelete = async () => {
 *     await bulkDeleteAssets(selectedAssets.map(a => a.id));
 *
 *     pushUndo(
 *       'bulk_delete',
 *       `Deleted ${selectedAssets.length} assets`,
 *       selectedAssets,
 *       async () => {
 *         await bulkRestoreAssets(selectedAssets);
 *       }
 *     );
 *   };
 *
 *   return <button onClick={handleBulkDelete}>Delete Selected</button>;
 * }
 * ```
 */
export function useUndo(): UseUndoReturn {
  // Get store state and actions
  const actions = useUndoStore((state) => state.actions);
  const pushAction = useUndoStore((state) => state.pushAction);
  const executeUndoAction = useUndoStore((state) => state.executeUndo);
  const removeAction = useUndoStore((state) => state.removeAction);
  const clearExpired = useUndoStore((state) => state.clearExpired);

  // Track action IDs created by this component instance
  const createdActionIds = useRef<Set<string>>(new Set());

  // Cleanup on unmount - optionally remove actions created by this component
  // Note: We don't automatically remove actions on unmount as the user
  // might still want to undo even after navigating away
  useEffect(() => {
    return () => {
      // Clear the tracking set on unmount
      createdActionIds.current.clear();
    };
  }, []);

  // Push undo helper
  const pushUndo = useCallback(
    (
      type: UndoActionType,
      label: string,
      data: unknown,
      undoFn: () => Promise<void>
    ): string => {
      const id = pushAction({
        type,
        label,
        data,
        undo: undoFn,
      });

      // Track this action
      createdActionIds.current.add(id);

      return id;
    },
    [pushAction]
  );

  // Execute undo wrapper
  const executeUndo = useCallback(
    async (id: string): Promise<void> => {
      await executeUndoAction(id);
      // Remove from tracking
      createdActionIds.current.delete(id);
    },
    [executeUndoAction]
  );

  // Remove action wrapper
  const handleRemoveAction = useCallback(
    (id: string): void => {
      removeAction(id);
      // Remove from tracking
      createdActionIds.current.delete(id);
    },
    [removeAction]
  );

  return {
    actions,
    pushUndo,
    executeUndo,
    removeAction: handleRemoveAction,
    clearExpired,
    hasPendingActions: actions.length > 0,
  };
}

export default useUndo;
