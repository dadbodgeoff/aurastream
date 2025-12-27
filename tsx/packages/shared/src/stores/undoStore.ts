/**
 * Undo Store using Zustand
 * Manages undo actions for destructive operations across the application
 *
 * Features:
 * - Push undo actions with automatic expiration
 * - Execute undo to restore deleted items
 * - Auto-cleanup of expired actions
 * - Stacking multiple undo actions
 *
 * @module stores/undoStore
 */

import { create } from 'zustand';

/**
 * Types of actions that can be undone
 */
export type UndoActionType = 'delete_asset' | 'delete_brand_kit' | 'bulk_delete';

/**
 * Represents an undoable action
 */
export interface UndoAction {
  /** Unique identifier for the action */
  id: string;
  /** Type of action that was performed */
  type: UndoActionType;
  /** Human-readable label for the action */
  label: string;
  /** Data needed to restore the action */
  data: unknown;
  /** Function to execute to undo the action */
  undo: () => Promise<void>;
  /** Timestamp when the action expires (ms since epoch) */
  expiresAt: number;
}

/**
 * Input type for pushing an undo action (id and expiresAt are auto-generated)
 */
export type UndoActionInput = Omit<UndoAction, 'id' | 'expiresAt'>;

/**
 * Undo store state interface
 */
export interface UndoStore {
  /** Array of pending undo actions */
  actions: UndoAction[];
  /** Push a new undo action to the stack */
  pushAction: (action: UndoActionInput) => string;
  /** Execute the undo function for a specific action */
  executeUndo: (id: string) => Promise<void>;
  /** Remove an action from the stack */
  removeAction: (id: string) => void;
  /** Clear all expired actions */
  clearExpired: () => void;
}

/**
 * Default timeout for undo actions in milliseconds
 */
export const DEFAULT_UNDO_TIMEOUT = 5000;

/**
 * Maximum number of undo actions to keep in the stack
 */
const MAX_UNDO_ACTIONS = 10;

/**
 * Generate a unique ID for undo actions
 * Uses crypto.randomUUID if available, falls back to timestamp-based ID
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `undo-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Undo store for managing undoable actions
 *
 * @example
 * ```typescript
 * import { useUndoStore } from '@aurastream/shared';
 *
 * function DeleteButton({ assetId, assetData }) {
 *   const { pushAction } = useUndoStore();
 *
 *   const handleDelete = async () => {
 *     // Perform delete
 *     await deleteAsset(assetId);
 *
 *     // Push undo action
 *     pushAction({
 *       type: 'delete_asset',
 *       label: 'Asset deleted',
 *       data: assetData,
 *       undo: async () => {
 *         await restoreAsset(assetData);
 *       },
 *     });
 *   };
 *
 *   return <button onClick={handleDelete}>Delete</button>;
 * }
 * ```
 */
export const useUndoStore = create<UndoStore>((set, get) => ({
  // Initial state
  actions: [],

  // Actions
  pushAction: (actionInput) => {
    const id = generateId();
    const expiresAt = Date.now() + DEFAULT_UNDO_TIMEOUT;

    const action: UndoAction = {
      ...actionInput,
      id,
      expiresAt,
    };

    set((state) => {
      // Add new action to the front of the array
      const newActions = [action, ...state.actions];

      // Limit the number of actions
      if (newActions.length > MAX_UNDO_ACTIONS) {
        return { actions: newActions.slice(0, MAX_UNDO_ACTIONS) };
      }

      return { actions: newActions };
    });

    return id;
  },

  executeUndo: async (id) => {
    const state = get();
    const action = state.actions.find((a) => a.id === id);

    if (!action) {
      console.warn(`Undo action not found: ${id}`);
      return;
    }

    // Check if action has expired
    if (Date.now() > action.expiresAt) {
      console.warn(`Undo action expired: ${id}`);
      get().removeAction(id);
      return;
    }

    // Remove the action first to prevent double execution
    get().removeAction(id);

    // Execute the undo function
    try {
      await action.undo();
    } catch (error) {
      console.error(`Error executing undo for ${id}:`, error);
      throw error;
    }
  },

  removeAction: (id) => {
    set((state) => ({
      actions: state.actions.filter((a) => a.id !== id),
    }));
  },

  clearExpired: () => {
    const now = Date.now();
    set((state) => ({
      actions: state.actions.filter((a) => a.expiresAt > now),
    }));
  },
}));

/**
 * Get the current undo store state (non-reactive)
 * Useful for accessing state outside of React components
 *
 * @returns Current undo store state
 *
 * @example
 * ```typescript
 * const state = getUndoState();
 * console.log('Pending undo actions:', state.actions.length);
 * ```
 */
export function getUndoState(): UndoStore {
  return useUndoStore.getState();
}

/**
 * Get the remaining time for an undo action in milliseconds
 *
 * @param action - The undo action to check
 * @returns Remaining time in milliseconds, or 0 if expired
 */
export function getRemainingTime(action: UndoAction): number {
  const remaining = action.expiresAt - Date.now();
  return Math.max(0, remaining);
}

/**
 * Check if an undo action has expired
 *
 * @param action - The undo action to check
 * @returns True if the action has expired
 */
export function isExpired(action: UndoAction): boolean {
  return Date.now() > action.expiresAt;
}
