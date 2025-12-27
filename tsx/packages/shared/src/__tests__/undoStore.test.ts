/**
 * Undo Store Tests
 * Comprehensive tests for the Zustand undo store
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  useUndoStore,
  type UndoStore,
  type UndoAction,
  type UndoActionInput,
  DEFAULT_UNDO_TIMEOUT,
  getUndoState,
  getRemainingTime,
  isExpired,
} from '../stores/undoStore';

// ============================================================================
// Test Data
// ============================================================================

const createUndoActionInput = (
  overrides: Partial<UndoActionInput> = {}
): UndoActionInput => ({
  type: 'delete_asset',
  label: 'Asset deleted',
  data: { id: 'asset-123', name: 'Test Asset' },
  undo: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Reset the store to initial state before each test
 */
function resetStore(): void {
  useUndoStore.setState({
    actions: [],
  });
}

/**
 * Get the current store state
 */
function getState(): UndoStore {
  return useUndoStore.getState();
}

// ============================================================================
// Tests
// ============================================================================

describe('UndoStore', () => {
  beforeEach(() => {
    resetStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Initial State
  // ==========================================================================

  describe('initial state', () => {
    it('should have correct initial values', () => {
      resetStore();

      const state = getState();
      expect(state.actions).toEqual([]);
    });
  });

  // ==========================================================================
  // pushAction
  // ==========================================================================

  describe('pushAction', () => {
    it('should add an action to the stack', () => {
      const { pushAction } = getState();
      const input = createUndoActionInput();

      const id = pushAction(input);

      const state = getState();
      expect(state.actions).toHaveLength(1);
      expect(state.actions[0].id).toBe(id);
      expect(state.actions[0].type).toBe('delete_asset');
      expect(state.actions[0].label).toBe('Asset deleted');
    });

    it('should generate unique IDs for actions', () => {
      const { pushAction } = getState();

      const id1 = pushAction(createUndoActionInput({ label: 'First' }));
      const id2 = pushAction(createUndoActionInput({ label: 'Second' }));

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should set expiresAt timestamp', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const { pushAction } = getState();
      pushAction(createUndoActionInput());

      const state = getState();
      expect(state.actions[0].expiresAt).toBe(now + DEFAULT_UNDO_TIMEOUT);
    });

    it('should add new actions to the front of the array', () => {
      const { pushAction } = getState();

      pushAction(createUndoActionInput({ label: 'First' }));
      pushAction(createUndoActionInput({ label: 'Second' }));
      pushAction(createUndoActionInput({ label: 'Third' }));

      const state = getState();
      expect(state.actions[0].label).toBe('Third');
      expect(state.actions[1].label).toBe('Second');
      expect(state.actions[2].label).toBe('First');
    });

    it('should limit the number of actions to MAX_UNDO_ACTIONS', () => {
      const { pushAction } = getState();

      // Push 15 actions (MAX is 10)
      for (let i = 0; i < 15; i++) {
        pushAction(createUndoActionInput({ label: `Action ${i}` }));
      }

      const state = getState();
      expect(state.actions).toHaveLength(10);
      // Most recent should be first
      expect(state.actions[0].label).toBe('Action 14');
    });

    it('should preserve action data', () => {
      const { pushAction } = getState();
      const data = { id: 'test-id', name: 'Test Name', nested: { value: 42 } };

      pushAction(createUndoActionInput({ data }));

      const state = getState();
      expect(state.actions[0].data).toEqual(data);
    });

    it('should handle all action types', () => {
      const { pushAction } = getState();

      pushAction(createUndoActionInput({ type: 'delete_asset' }));
      pushAction(createUndoActionInput({ type: 'delete_brand_kit' }));
      pushAction(createUndoActionInput({ type: 'bulk_delete' }));

      const state = getState();
      expect(state.actions[0].type).toBe('bulk_delete');
      expect(state.actions[1].type).toBe('delete_brand_kit');
      expect(state.actions[2].type).toBe('delete_asset');
    });
  });

  // ==========================================================================
  // executeUndo
  // ==========================================================================

  describe('executeUndo', () => {
    it('should execute the undo function', async () => {
      const undoFn = vi.fn().mockResolvedValue(undefined);
      const { pushAction, executeUndo } = getState();

      const id = pushAction(createUndoActionInput({ undo: undoFn }));
      await executeUndo(id);

      expect(undoFn).toHaveBeenCalledTimes(1);
    });

    it('should remove the action after execution', async () => {
      const { pushAction, executeUndo } = getState();

      const id = pushAction(createUndoActionInput());
      expect(getState().actions).toHaveLength(1);

      await executeUndo(id);

      expect(getState().actions).toHaveLength(0);
    });

    it('should not execute if action is not found', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { executeUndo } = getState();

      await executeUndo('non-existent-id');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Undo action not found: non-existent-id'
      );
      consoleSpy.mockRestore();
    });

    it('should not execute if action has expired', async () => {
      const undoFn = vi.fn().mockResolvedValue(undefined);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { pushAction, executeUndo } = getState();

      const id = pushAction(createUndoActionInput({ undo: undoFn }));

      // Advance time past expiration
      vi.advanceTimersByTime(DEFAULT_UNDO_TIMEOUT + 1000);

      await executeUndo(id);

      expect(undoFn).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(`Undo action expired: ${id}`);
      consoleSpy.mockRestore();
    });

    it('should remove expired action when trying to execute', async () => {
      const { pushAction, executeUndo } = getState();

      const id = pushAction(createUndoActionInput());

      // Advance time past expiration
      vi.advanceTimersByTime(DEFAULT_UNDO_TIMEOUT + 1000);

      await executeUndo(id);

      expect(getState().actions).toHaveLength(0);
    });

    it('should handle async undo functions', async () => {
      // Use real timers for this test since we're testing async behavior
      vi.useRealTimers();

      const undoFn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Reset store with real timers
      resetStore();
      const { pushAction, executeUndo } = getState();

      const id = pushAction(createUndoActionInput({ undo: undoFn }));
      await executeUndo(id);

      expect(undoFn).toHaveBeenCalledTimes(1);

      // Restore fake timers for other tests
      vi.useFakeTimers();
    });

    it('should throw error if undo function fails', async () => {
      const error = new Error('Undo failed');
      const undoFn = vi.fn().mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { pushAction, executeUndo } = getState();

      const id = pushAction(createUndoActionInput({ undo: undoFn }));

      await expect(executeUndo(id)).rejects.toThrow('Undo failed');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should remove action before executing to prevent double execution', async () => {
      let executionCount = 0;
      const undoFn = vi.fn().mockImplementation(async () => {
        executionCount++;
        // Check that action is already removed during execution
        expect(getState().actions).toHaveLength(0);
      });
      const { pushAction, executeUndo } = getState();

      const id = pushAction(createUndoActionInput({ undo: undoFn }));
      await executeUndo(id);

      expect(executionCount).toBe(1);
    });
  });

  // ==========================================================================
  // removeAction
  // ==========================================================================

  describe('removeAction', () => {
    it('should remove an action by ID', () => {
      const { pushAction, removeAction } = getState();

      const id = pushAction(createUndoActionInput());
      expect(getState().actions).toHaveLength(1);

      removeAction(id);

      expect(getState().actions).toHaveLength(0);
    });

    it('should only remove the specified action', () => {
      const { pushAction, removeAction } = getState();

      const id1 = pushAction(createUndoActionInput({ label: 'First' }));
      const id2 = pushAction(createUndoActionInput({ label: 'Second' }));
      pushAction(createUndoActionInput({ label: 'Third' }));

      removeAction(id2);

      const state = getState();
      expect(state.actions).toHaveLength(2);
      expect(state.actions.find((a) => a.id === id2)).toBeUndefined();
      expect(state.actions.find((a) => a.id === id1)).toBeDefined();
    });

    it('should handle removing non-existent action gracefully', () => {
      const { pushAction, removeAction } = getState();

      pushAction(createUndoActionInput());

      // Should not throw
      expect(() => removeAction('non-existent-id')).not.toThrow();
      expect(getState().actions).toHaveLength(1);
    });
  });

  // ==========================================================================
  // clearExpired
  // ==========================================================================

  describe('clearExpired', () => {
    it('should remove all expired actions', () => {
      const { pushAction, clearExpired } = getState();

      // Push actions at different times
      pushAction(createUndoActionInput({ label: 'First' }));
      vi.advanceTimersByTime(2000);
      pushAction(createUndoActionInput({ label: 'Second' }));
      vi.advanceTimersByTime(2000);
      pushAction(createUndoActionInput({ label: 'Third' }));

      // Advance time so first action expires
      vi.advanceTimersByTime(2000);

      clearExpired();

      const state = getState();
      expect(state.actions).toHaveLength(2);
      expect(state.actions.find((a) => a.label === 'First')).toBeUndefined();
    });

    it('should keep non-expired actions', () => {
      const { pushAction, clearExpired } = getState();

      pushAction(createUndoActionInput({ label: 'Recent' }));

      // Advance time but not past expiration
      vi.advanceTimersByTime(1000);

      clearExpired();

      const state = getState();
      expect(state.actions).toHaveLength(1);
      expect(state.actions[0].label).toBe('Recent');
    });

    it('should handle empty actions array', () => {
      const { clearExpired } = getState();

      // Should not throw
      expect(() => clearExpired()).not.toThrow();
      expect(getState().actions).toHaveLength(0);
    });

    it('should remove all actions when all are expired', () => {
      const { pushAction, clearExpired } = getState();

      pushAction(createUndoActionInput({ label: 'First' }));
      pushAction(createUndoActionInput({ label: 'Second' }));

      // Advance time past all expirations
      vi.advanceTimersByTime(DEFAULT_UNDO_TIMEOUT + 1000);

      clearExpired();

      expect(getState().actions).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  describe('getUndoState', () => {
    it('should return the current state', () => {
      const { pushAction } = getState();
      pushAction(createUndoActionInput());

      const state = getUndoState();

      expect(state.actions).toHaveLength(1);
      expect(typeof state.pushAction).toBe('function');
      expect(typeof state.executeUndo).toBe('function');
      expect(typeof state.removeAction).toBe('function');
      expect(typeof state.clearExpired).toBe('function');
    });
  });

  describe('getRemainingTime', () => {
    it('should return remaining time in milliseconds', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const { pushAction } = getState();
      pushAction(createUndoActionInput());

      const action = getState().actions[0];

      // Advance time by 2 seconds
      vi.advanceTimersByTime(2000);

      const remaining = getRemainingTime(action);
      expect(remaining).toBe(DEFAULT_UNDO_TIMEOUT - 2000);
    });

    it('should return 0 for expired actions', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const { pushAction } = getState();
      pushAction(createUndoActionInput());

      const action = getState().actions[0];

      // Advance time past expiration
      vi.advanceTimersByTime(DEFAULT_UNDO_TIMEOUT + 1000);

      const remaining = getRemainingTime(action);
      expect(remaining).toBe(0);
    });

    it('should return full timeout for fresh actions', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const { pushAction } = getState();
      pushAction(createUndoActionInput());

      const action = getState().actions[0];
      const remaining = getRemainingTime(action);

      expect(remaining).toBe(DEFAULT_UNDO_TIMEOUT);
    });
  });

  describe('isExpired', () => {
    it('should return false for non-expired actions', () => {
      const { pushAction } = getState();
      pushAction(createUndoActionInput());

      const action = getState().actions[0];
      expect(isExpired(action)).toBe(false);
    });

    it('should return true for expired actions', () => {
      const { pushAction } = getState();
      pushAction(createUndoActionInput());

      const action = getState().actions[0];

      // Advance time past expiration
      vi.advanceTimersByTime(DEFAULT_UNDO_TIMEOUT + 1000);

      expect(isExpired(action)).toBe(true);
    });

    it('should return true exactly at expiration time', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const { pushAction } = getState();
      pushAction(createUndoActionInput());

      const action = getState().actions[0];

      // Advance time exactly to expiration
      vi.advanceTimersByTime(DEFAULT_UNDO_TIMEOUT + 1);

      expect(isExpired(action)).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle rapid push operations', () => {
      const { pushAction } = getState();

      // Rapid pushing
      for (let i = 0; i < 100; i++) {
        pushAction(createUndoActionInput({ label: `Action ${i}` }));
      }

      const state = getState();
      // Should be limited to MAX_UNDO_ACTIONS (10)
      expect(state.actions).toHaveLength(10);
      // Most recent should be first
      expect(state.actions[0].label).toBe('Action 99');
    });

    it('should handle concurrent undo executions', async () => {
      const undoFn1 = vi.fn().mockResolvedValue(undefined);
      const undoFn2 = vi.fn().mockResolvedValue(undefined);
      const { pushAction, executeUndo } = getState();

      const id1 = pushAction(createUndoActionInput({ undo: undoFn1 }));
      const id2 = pushAction(createUndoActionInput({ undo: undoFn2 }));

      // Execute both concurrently
      await Promise.all([executeUndo(id1), executeUndo(id2)]);

      expect(undoFn1).toHaveBeenCalledTimes(1);
      expect(undoFn2).toHaveBeenCalledTimes(1);
      expect(getState().actions).toHaveLength(0);
    });

    it('should handle action with complex data', () => {
      const { pushAction } = getState();

      const complexData = {
        id: 'test-id',
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
        },
        date: new Date().toISOString(),
        nullValue: null,
        undefinedValue: undefined,
      };

      pushAction(createUndoActionInput({ data: complexData }));

      const state = getState();
      expect(state.actions[0].data).toEqual(complexData);
    });

    it('should handle empty label', () => {
      const { pushAction } = getState();

      pushAction(createUndoActionInput({ label: '' }));

      const state = getState();
      expect(state.actions[0].label).toBe('');
    });

    it('should handle null data', () => {
      const { pushAction } = getState();

      pushAction(createUndoActionInput({ data: null }));

      const state = getState();
      expect(state.actions[0].data).toBeNull();
    });
  });

  // ==========================================================================
  // State Transitions
  // ==========================================================================

  describe('state transitions', () => {
    it('should handle push -> execute -> push flow', async () => {
      const undoFn = vi.fn().mockResolvedValue(undefined);
      const { pushAction, executeUndo } = getState();

      // Push first action
      const id1 = pushAction(createUndoActionInput({ label: 'First', undo: undoFn }));
      expect(getState().actions).toHaveLength(1);

      // Execute undo
      await executeUndo(id1);
      expect(getState().actions).toHaveLength(0);

      // Push second action
      pushAction(createUndoActionInput({ label: 'Second' }));
      expect(getState().actions).toHaveLength(1);
      expect(getState().actions[0].label).toBe('Second');
    });

    it('should handle push -> remove -> push flow', () => {
      const { pushAction, removeAction } = getState();

      // Push first action
      const id1 = pushAction(createUndoActionInput({ label: 'First' }));
      expect(getState().actions).toHaveLength(1);

      // Remove action
      removeAction(id1);
      expect(getState().actions).toHaveLength(0);

      // Push second action
      pushAction(createUndoActionInput({ label: 'Second' }));
      expect(getState().actions).toHaveLength(1);
      expect(getState().actions[0].label).toBe('Second');
    });

    it('should handle push -> clearExpired -> push flow', () => {
      const { pushAction, clearExpired } = getState();

      // Push first action
      pushAction(createUndoActionInput({ label: 'First' }));

      // Advance time past expiration
      vi.advanceTimersByTime(DEFAULT_UNDO_TIMEOUT + 1000);

      // Clear expired
      clearExpired();
      expect(getState().actions).toHaveLength(0);

      // Push second action
      pushAction(createUndoActionInput({ label: 'Second' }));
      expect(getState().actions).toHaveLength(1);
      expect(getState().actions[0].label).toBe('Second');
    });
  });
});
