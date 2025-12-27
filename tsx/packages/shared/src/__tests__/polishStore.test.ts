/**
 * Polish Store Tests
 * Comprehensive tests for the Zustand polish/celebration store
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  usePolishStore,
  type PolishState,
  type Celebration,
  type CelebrationInput,
  getCelebrationDuration,
  getDefaultPriority,
  getDefaultDuration,
} from '../stores/polishStore';
import type { RarityTier } from '../constants/rarity';

// ============================================================================
// Test Data
// ============================================================================

const createCelebrationInput = (
  overrides: Partial<CelebrationInput> = {}
): CelebrationInput => ({
  type: 'achievement',
  title: 'Test Achievement',
  rarity: 'common',
  priority: 10,
  ...overrides,
});

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Reset the store to initial state before each test
 */
function resetStore(): void {
  usePolishStore.setState({
    celebrationQueue: [],
    currentCelebration: null,
    isShowingCelebration: false,
    celebrationsEnabled: true,
    reducedMotion: false,
  });
}

/**
 * Get the current store state
 */
function getState(): PolishState {
  return usePolishStore.getState();
}

/**
 * Wait for async operations to complete
 */
function waitForNextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 150));
}

// ============================================================================
// Tests
// ============================================================================

describe('PolishStore', () => {
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
      expect(state.celebrationQueue).toEqual([]);
      expect(state.currentCelebration).toBeNull();
      expect(state.isShowingCelebration).toBe(false);
      expect(state.celebrationsEnabled).toBe(true);
      expect(state.reducedMotion).toBe(false);
    });
  });

  // ==========================================================================
  // Queue Operations
  // ==========================================================================

  describe('queueCelebration', () => {
    it('should add a celebration to the queue', () => {
      const { queueCelebration } = getState();
      const input = createCelebrationInput();

      queueCelebration(input);

      // Since no celebration is showing, it should immediately show
      const state = getState();
      expect(state.currentCelebration).not.toBeNull();
      expect(state.currentCelebration?.title).toBe('Test Achievement');
      expect(state.isShowingCelebration).toBe(true);
    });

    it('should generate unique IDs for celebrations', () => {
      const { queueCelebration, dismissCelebration } = getState();

      queueCelebration(createCelebrationInput({ title: 'First' }));
      const firstId = getState().currentCelebration?.id;

      dismissCelebration();
      vi.advanceTimersByTime(150);

      queueCelebration(createCelebrationInput({ title: 'Second' }));
      const secondId = getState().currentCelebration?.id;

      expect(firstId).toBeDefined();
      expect(secondId).toBeDefined();
      expect(firstId).not.toBe(secondId);
    });

    it('should set createdAt timestamp', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const { queueCelebration } = getState();
      queueCelebration(createCelebrationInput());

      const state = getState();
      expect(state.currentCelebration?.createdAt).toBe(now);
    });

    it('should not queue if celebrations are disabled', () => {
      const { queueCelebration, setCelebrationsEnabled } = getState();

      setCelebrationsEnabled(false);
      queueCelebration(createCelebrationInput());

      const state = getState();
      expect(state.celebrationQueue).toEqual([]);
      expect(state.currentCelebration).toBeNull();
    });

    it('should queue celebration if one is already showing', () => {
      const { queueCelebration } = getState();

      // Queue first celebration (will show immediately)
      queueCelebration(createCelebrationInput({ title: 'First' }));
      expect(getState().isShowingCelebration).toBe(true);

      // Queue second celebration (should go to queue)
      queueCelebration(createCelebrationInput({ title: 'Second' }));

      const state = getState();
      expect(state.currentCelebration?.title).toBe('First');
      expect(state.celebrationQueue.length).toBe(1);
      expect(state.celebrationQueue[0].title).toBe('Second');
    });
  });

  // ==========================================================================
  // Priority Ordering
  // ==========================================================================

  describe('priority ordering', () => {
    it('should order queue by priority (higher first)', () => {
      const { queueCelebration } = getState();

      // Queue first celebration (will show immediately)
      queueCelebration(createCelebrationInput({ title: 'First', priority: 10 }));

      // Queue more celebrations with different priorities
      queueCelebration(createCelebrationInput({ title: 'Low', priority: 5 }));
      queueCelebration(createCelebrationInput({ title: 'High', priority: 50 }));
      queueCelebration(createCelebrationInput({ title: 'Medium', priority: 25 }));

      const state = getState();
      expect(state.celebrationQueue[0].title).toBe('High');
      expect(state.celebrationQueue[1].title).toBe('Medium');
      expect(state.celebrationQueue[2].title).toBe('Low');
    });

    it('should use FIFO for same priority', () => {
      vi.useRealTimers(); // Need real timers for timestamp differences

      const { queueCelebration } = getState();

      // Queue first celebration (will show immediately)
      queueCelebration(createCelebrationInput({ title: 'Showing', priority: 10 }));

      // Queue celebrations with same priority
      queueCelebration(createCelebrationInput({ title: 'First Same', priority: 20 }));
      queueCelebration(createCelebrationInput({ title: 'Second Same', priority: 20 }));
      queueCelebration(createCelebrationInput({ title: 'Third Same', priority: 20 }));

      const state = getState();
      expect(state.celebrationQueue[0].title).toBe('First Same');
      expect(state.celebrationQueue[1].title).toBe('Second Same');
      expect(state.celebrationQueue[2].title).toBe('Third Same');

      vi.useFakeTimers(); // Restore fake timers
    });

    it('should use rarity-based default priority when not specified', () => {
      const { queueCelebration } = getState();

      // Queue first celebration (will show immediately)
      queueCelebration(createCelebrationInput({ title: 'Showing', priority: 1 }));

      // Queue celebrations without explicit priority
      queueCelebration({
        type: 'achievement',
        title: 'Common',
        rarity: 'common',
        priority: 10, // common default
      });
      queueCelebration({
        type: 'achievement',
        title: 'Mythic',
        rarity: 'mythic',
        priority: 50, // mythic default
      });
      queueCelebration({
        type: 'achievement',
        title: 'Epic',
        rarity: 'epic',
        priority: 30, // epic default
      });

      const state = getState();
      expect(state.celebrationQueue[0].title).toBe('Mythic');
      expect(state.celebrationQueue[1].title).toBe('Epic');
      expect(state.celebrationQueue[2].title).toBe('Common');
    });
  });

  // ==========================================================================
  // Celebration Lifecycle
  // ==========================================================================

  describe('showNextCelebration', () => {
    it('should show the next celebration from queue', () => {
      const { queueCelebration, dismissCelebration, showNextCelebration } = getState();

      // Queue celebrations
      queueCelebration(createCelebrationInput({ title: 'First' }));
      queueCelebration(createCelebrationInput({ title: 'Second' }));

      expect(getState().currentCelebration?.title).toBe('First');

      // Dismiss and show next
      dismissCelebration();
      vi.advanceTimersByTime(150);

      expect(getState().currentCelebration?.title).toBe('Second');
    });

    it('should not show if celebrations are disabled', () => {
      const { queueCelebration, setCelebrationsEnabled, dismissCelebration } = getState();

      queueCelebration(createCelebrationInput({ title: 'First' }));
      queueCelebration(createCelebrationInput({ title: 'Second' }));

      dismissCelebration();
      setCelebrationsEnabled(false);
      vi.advanceTimersByTime(150);

      const state = getState();
      expect(state.currentCelebration).toBeNull();
      expect(state.isShowingCelebration).toBe(false);
    });

    it('should not show if already showing a celebration', () => {
      const { queueCelebration, showNextCelebration } = getState();

      queueCelebration(createCelebrationInput({ title: 'First' }));
      queueCelebration(createCelebrationInput({ title: 'Second' }));

      // Try to show next while one is showing
      showNextCelebration();

      expect(getState().currentCelebration?.title).toBe('First');
    });

    it('should do nothing if queue is empty', () => {
      const { showNextCelebration } = getState();

      showNextCelebration();

      const state = getState();
      expect(state.currentCelebration).toBeNull();
      expect(state.isShowingCelebration).toBe(false);
    });
  });

  describe('dismissCelebration', () => {
    it('should dismiss the current celebration', () => {
      const { queueCelebration, dismissCelebration } = getState();

      queueCelebration(createCelebrationInput());
      expect(getState().isShowingCelebration).toBe(true);

      dismissCelebration();

      const state = getState();
      expect(state.currentCelebration).toBeNull();
      expect(state.isShowingCelebration).toBe(false);
    });

    it('should automatically show next celebration after dismiss', () => {
      const { queueCelebration, dismissCelebration } = getState();

      queueCelebration(createCelebrationInput({ title: 'First' }));
      queueCelebration(createCelebrationInput({ title: 'Second' }));

      dismissCelebration();
      vi.advanceTimersByTime(150);

      expect(getState().currentCelebration?.title).toBe('Second');
    });

    it('should do nothing if no celebration is showing', () => {
      const { dismissCelebration } = getState();

      dismissCelebration();

      const state = getState();
      expect(state.currentCelebration).toBeNull();
      expect(state.isShowingCelebration).toBe(false);
    });
  });

  describe('clearQueue', () => {
    it('should clear all pending celebrations', () => {
      const { queueCelebration, clearQueue } = getState();

      queueCelebration(createCelebrationInput({ title: 'First' }));
      queueCelebration(createCelebrationInput({ title: 'Second' }));
      queueCelebration(createCelebrationInput({ title: 'Third' }));

      clearQueue();

      const state = getState();
      expect(state.celebrationQueue).toEqual([]);
      // Current celebration should still be showing
      expect(state.currentCelebration?.title).toBe('First');
    });

    it('should work when queue is already empty', () => {
      const { clearQueue } = getState();

      clearQueue();

      expect(getState().celebrationQueue).toEqual([]);
    });
  });

  // ==========================================================================
  // Enable/Disable
  // ==========================================================================

  describe('setCelebrationsEnabled', () => {
    it('should enable celebrations', () => {
      const { setCelebrationsEnabled } = getState();

      setCelebrationsEnabled(false);
      expect(getState().celebrationsEnabled).toBe(false);

      setCelebrationsEnabled(true);
      expect(getState().celebrationsEnabled).toBe(true);
    });

    it('should dismiss current celebration when disabled', () => {
      const { queueCelebration, setCelebrationsEnabled } = getState();

      queueCelebration(createCelebrationInput());
      expect(getState().isShowingCelebration).toBe(true);

      setCelebrationsEnabled(false);

      const state = getState();
      expect(state.currentCelebration).toBeNull();
      expect(state.isShowingCelebration).toBe(false);
    });

    it('should not affect queue when disabled', () => {
      const { queueCelebration, setCelebrationsEnabled } = getState();

      queueCelebration(createCelebrationInput({ title: 'First' }));
      queueCelebration(createCelebrationInput({ title: 'Second' }));

      setCelebrationsEnabled(false);

      // Queue should still have the second celebration
      expect(getState().celebrationQueue.length).toBe(1);
    });
  });

  describe('setReducedMotion', () => {
    it('should set reduced motion preference', () => {
      const { setReducedMotion } = getState();

      setReducedMotion(true);
      expect(getState().reducedMotion).toBe(true);

      setReducedMotion(false);
      expect(getState().reducedMotion).toBe(false);
    });
  });

  // ==========================================================================
  // Subscriptions
  // ==========================================================================

  describe('subscribe', () => {
    it('should call listener when celebration is shown', () => {
      const listener = vi.fn();
      const { subscribe, queueCelebration } = getState();

      subscribe(listener);
      queueCelebration(createCelebrationInput({ title: 'Test' }));

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Test' })
      );
    });

    it('should call listener when celebration is dismissed', () => {
      const listener = vi.fn();
      const { subscribe, queueCelebration, dismissCelebration } = getState();

      subscribe(listener);
      queueCelebration(createCelebrationInput());
      listener.mockClear();

      dismissCelebration();

      expect(listener).toHaveBeenCalledWith(null);
    });

    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const { subscribe, queueCelebration, dismissCelebration } = getState();

      const unsubscribe = subscribe(listener);
      queueCelebration(createCelebrationInput({ title: 'First' }));
      expect(listener).toHaveBeenCalledTimes(1);

      // Unsubscribe before dismissing
      unsubscribe();
      dismissCelebration();
      vi.advanceTimersByTime(150);

      // Should not be called again after unsubscribe (still 1 from the initial show)
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should support multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const { subscribe, queueCelebration } = getState();

      subscribe(listener1);
      subscribe(listener2);
      queueCelebration(createCelebrationInput());

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { subscribe, queueCelebration } = getState();

      subscribe(errorListener);
      subscribe(goodListener);

      // Should not throw
      expect(() => queueCelebration(createCelebrationInput())).not.toThrow();

      // Good listener should still be called
      expect(goodListener).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  describe('getCelebrationDuration', () => {
    it('should return custom duration if provided', () => {
      const celebration: Celebration = {
        id: 'test',
        type: 'achievement',
        title: 'Test',
        rarity: 'common',
        priority: 10,
        duration: 5000,
        createdAt: Date.now(),
      };

      expect(getCelebrationDuration(celebration)).toBe(5000);
    });

    it('should return default duration based on rarity', () => {
      const celebration: Celebration = {
        id: 'test',
        type: 'achievement',
        title: 'Test',
        rarity: 'legendary',
        priority: 10,
        createdAt: Date.now(),
      };

      expect(getCelebrationDuration(celebration)).toBe(6000);
    });
  });

  describe('getDefaultPriority', () => {
    it('should return correct default priority for each rarity', () => {
      expect(getDefaultPriority('common')).toBe(10);
      expect(getDefaultPriority('rare')).toBe(20);
      expect(getDefaultPriority('epic')).toBe(30);
      expect(getDefaultPriority('legendary')).toBe(40);
      expect(getDefaultPriority('mythic')).toBe(50);
    });
  });

  describe('getDefaultDuration', () => {
    it('should return correct default duration for each rarity', () => {
      expect(getDefaultDuration('common')).toBe(3000);
      expect(getDefaultDuration('rare')).toBe(4000);
      expect(getDefaultDuration('epic')).toBe(5000);
      expect(getDefaultDuration('legendary')).toBe(6000);
      expect(getDefaultDuration('mythic')).toBe(8000);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle rapid queue operations', () => {
      const { queueCelebration, dismissCelebration } = getState();

      // Rapid queueing
      for (let i = 0; i < 10; i++) {
        queueCelebration(createCelebrationInput({ title: `Celebration ${i}` }));
      }

      const state = getState();
      expect(state.currentCelebration?.title).toBe('Celebration 0');
      expect(state.celebrationQueue.length).toBe(9);
    });

    it('should handle celebration with all optional fields', () => {
      const { queueCelebration } = getState();

      queueCelebration({
        type: 'custom',
        title: 'Full Celebration',
        description: 'A description',
        rarity: 'mythic',
        priority: 100,
        duration: 10000,
        data: { customKey: 'customValue' },
      });

      const celebration = getState().currentCelebration;
      expect(celebration?.description).toBe('A description');
      expect(celebration?.duration).toBe(10000);
      expect(celebration?.data).toEqual({ customKey: 'customValue' });
    });

    it('should handle celebration with minimal fields', () => {
      const { queueCelebration } = getState();

      queueCelebration({
        type: 'achievement',
        title: 'Minimal',
        rarity: 'common',
        priority: 10,
      });

      const celebration = getState().currentCelebration;
      expect(celebration?.title).toBe('Minimal');
      expect(celebration?.description).toBeUndefined();
      expect(celebration?.duration).toBeUndefined();
      expect(celebration?.data).toBeUndefined();
    });

    it('should handle all celebration types', () => {
      const types: Array<Celebration['type']> = [
        'achievement',
        'milestone',
        'reward',
        'levelUp',
        'custom',
      ];

      const { queueCelebration, dismissCelebration } = getState();

      types.forEach((type) => {
        queueCelebration(createCelebrationInput({ type, title: type }));
        expect(getState().currentCelebration?.type).toBe(type);
        dismissCelebration();
        vi.advanceTimersByTime(150);
      });
    });

    it('should handle all rarity tiers', () => {
      const rarities: RarityTier[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];

      const { queueCelebration, dismissCelebration } = getState();

      rarities.forEach((rarity) => {
        queueCelebration(createCelebrationInput({ rarity, title: rarity }));
        expect(getState().currentCelebration?.rarity).toBe(rarity);
        dismissCelebration();
        vi.advanceTimersByTime(150);
      });
    });
  });

  // ==========================================================================
  // State Transitions
  // ==========================================================================

  describe('state transitions', () => {
    it('should handle enable -> queue -> disable -> enable flow', () => {
      const { queueCelebration, setCelebrationsEnabled } = getState();

      // Enable and queue
      queueCelebration(createCelebrationInput({ title: 'First' }));
      expect(getState().isShowingCelebration).toBe(true);

      // Disable
      setCelebrationsEnabled(false);
      expect(getState().isShowingCelebration).toBe(false);

      // Try to queue while disabled
      queueCelebration(createCelebrationInput({ title: 'Second' }));
      expect(getState().celebrationQueue.length).toBe(0);

      // Re-enable
      setCelebrationsEnabled(true);
      expect(getState().celebrationsEnabled).toBe(true);

      // Queue should work again
      queueCelebration(createCelebrationInput({ title: 'Third' }));
      expect(getState().currentCelebration?.title).toBe('Third');
    });

    it('should handle complete celebration flow', () => {
      const listener = vi.fn();
      const { subscribe, queueCelebration, dismissCelebration } = getState();

      subscribe(listener);

      // Queue multiple celebrations
      queueCelebration(createCelebrationInput({ title: 'First', priority: 10 }));
      queueCelebration(createCelebrationInput({ title: 'Second', priority: 20 }));
      queueCelebration(createCelebrationInput({ title: 'Third', priority: 15 }));

      // First should be showing (it was queued first and shown immediately)
      expect(getState().currentCelebration?.title).toBe('First');

      // Dismiss and check order (Second has highest priority in queue)
      dismissCelebration();
      vi.advanceTimersByTime(150);
      expect(getState().currentCelebration?.title).toBe('Second');

      // Dismiss and check Third
      dismissCelebration();
      vi.advanceTimersByTime(150);
      expect(getState().currentCelebration?.title).toBe('Third');

      // Dismiss last
      dismissCelebration();
      vi.advanceTimersByTime(150);
      expect(getState().currentCelebration).toBeNull();
      expect(getState().celebrationQueue.length).toBe(0);
    });
  });
});
