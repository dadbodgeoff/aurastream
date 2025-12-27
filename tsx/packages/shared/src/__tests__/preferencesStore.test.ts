/**
 * Preferences Store Tests
 * Comprehensive tests for the Zustand preferences store
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  usePreferencesStore,
  getPreferencesState,
  resetPreferences,
  waitForPreferencesHydration,
  PREFERENCES_STORAGE_KEY,
} from '../stores/preferencesStore';
import type { PreferencesState } from '../types/preferences';

// ============================================================================
// Mock localStorage
// ============================================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

// Replace global localStorage
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Reset the store to initial state before each test
 */
function resetStore(): void {
  usePreferencesStore.setState({
    lastBrandKitId: null,
    lastAssetType: null,
    lastLogoPosition: null,
    lastLogoSize: null,
    formHistory: {},
    soundEnabled: true,
    reducedCelebrations: false,
  });
}

/**
 * Get the current store state
 */
function getState(): PreferencesState {
  return usePreferencesStore.getState();
}

// ============================================================================
// Tests
// ============================================================================

describe('PreferencesStore', () => {
  beforeEach(() => {
    resetStore();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Initial State
  // ==========================================================================

  describe('initial state', () => {
    it('should have correct initial values', () => {
      resetStore();

      const state = getState();
      expect(state.lastBrandKitId).toBeNull();
      expect(state.lastAssetType).toBeNull();
      expect(state.lastLogoPosition).toBeNull();
      expect(state.lastLogoSize).toBeNull();
      expect(state.formHistory).toEqual({});
      expect(state.soundEnabled).toBe(true);
      expect(state.reducedCelebrations).toBe(false);
    });
  });

  // ==========================================================================
  // Last Used Values
  // ==========================================================================

  describe('setLastBrandKit', () => {
    it('should set the last brand kit ID', () => {
      const { setLastBrandKit } = getState();

      setLastBrandKit('brand-kit-123');

      expect(getState().lastBrandKitId).toBe('brand-kit-123');
    });

    it('should update when called multiple times', () => {
      const { setLastBrandKit } = getState();

      setLastBrandKit('brand-kit-1');
      expect(getState().lastBrandKitId).toBe('brand-kit-1');

      setLastBrandKit('brand-kit-2');
      expect(getState().lastBrandKitId).toBe('brand-kit-2');
    });
  });

  describe('setLastAssetType', () => {
    it('should set the last asset type', () => {
      const { setLastAssetType } = getState();

      setLastAssetType('twitch_emote');

      expect(getState().lastAssetType).toBe('twitch_emote');
    });

    it('should update when called multiple times', () => {
      const { setLastAssetType } = getState();

      setLastAssetType('twitch_emote');
      expect(getState().lastAssetType).toBe('twitch_emote');

      setLastAssetType('youtube_thumbnail');
      expect(getState().lastAssetType).toBe('youtube_thumbnail');
    });
  });

  describe('setLastLogoPosition', () => {
    it('should set the last logo position', () => {
      const { setLastLogoPosition } = getState();

      setLastLogoPosition('bottom-right');

      expect(getState().lastLogoPosition).toBe('bottom-right');
    });

    it('should accept any string position', () => {
      const { setLastLogoPosition } = getState();

      const positions = [
        'top-left',
        'top-center',
        'top-right',
        'center-left',
        'center',
        'center-right',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ];

      positions.forEach((position) => {
        setLastLogoPosition(position);
        expect(getState().lastLogoPosition).toBe(position);
      });
    });
  });

  describe('setLastLogoSize', () => {
    it('should set the last logo size', () => {
      const { setLastLogoSize } = getState();

      setLastLogoSize('medium');

      expect(getState().lastLogoSize).toBe('medium');
    });

    it('should accept any string size', () => {
      const { setLastLogoSize } = getState();

      const sizes = ['small', 'medium', 'large', 'extra-large'];

      sizes.forEach((size) => {
        setLastLogoSize(size);
        expect(getState().lastLogoSize).toBe(size);
      });
    });
  });

  // ==========================================================================
  // Form History
  // ==========================================================================

  describe('saveFormValues', () => {
    it('should save form values for a form ID', () => {
      const { saveFormValues } = getState();

      saveFormValues('generate-form', {
        prompt: 'Create an emote',
        style: 'cartoon',
      });

      const state = getState();
      expect(state.formHistory['generate-form']).toEqual({
        prompt: 'Create an emote',
        style: 'cartoon',
      });
    });

    it('should update existing form values', () => {
      const { saveFormValues } = getState();

      saveFormValues('generate-form', { prompt: 'First prompt' });
      saveFormValues('generate-form', { prompt: 'Updated prompt' });

      const state = getState();
      expect(state.formHistory['generate-form']).toEqual({
        prompt: 'Updated prompt',
      });
    });

    it('should store multiple forms independently', () => {
      const { saveFormValues } = getState();

      saveFormValues('form-1', { field1: 'value1' });
      saveFormValues('form-2', { field2: 'value2' });

      const state = getState();
      expect(state.formHistory['form-1']).toEqual({ field1: 'value1' });
      expect(state.formHistory['form-2']).toEqual({ field2: 'value2' });
    });

    it('should handle empty form values', () => {
      const { saveFormValues } = getState();

      saveFormValues('empty-form', {});

      const state = getState();
      expect(state.formHistory['empty-form']).toEqual({});
    });

    it('should trim form history when exceeding max entries', () => {
      const { saveFormValues } = getState();

      // Add 55 forms (exceeds MAX_FORM_HISTORY_ENTRIES of 50)
      for (let i = 0; i < 55; i++) {
        saveFormValues(`form-${i}`, { value: `value-${i}` });
      }

      const state = getState();
      const formCount = Object.keys(state.formHistory).length;

      // Should be trimmed to 50 or less
      expect(formCount).toBeLessThanOrEqual(50);
    });
  });

  describe('getFormDefaults', () => {
    it('should return saved form values', () => {
      const { saveFormValues, getFormDefaults } = getState();

      saveFormValues('my-form', { prompt: 'Test prompt', style: 'anime' });

      const defaults = getFormDefaults('my-form');
      expect(defaults).toEqual({ prompt: 'Test prompt', style: 'anime' });
    });

    it('should return empty object for unknown form', () => {
      const { getFormDefaults } = getState();

      const defaults = getFormDefaults('unknown-form');
      expect(defaults).toEqual({});
    });

    it('should return empty object after clearHistory', () => {
      const { saveFormValues, getFormDefaults, clearHistory } = getState();

      saveFormValues('my-form', { prompt: 'Test' });
      clearHistory();

      const defaults = getFormDefaults('my-form');
      expect(defaults).toEqual({});
    });
  });

  // ==========================================================================
  // Feature Preferences
  // ==========================================================================

  describe('setSoundEnabled', () => {
    it('should enable sound', () => {
      const { setSoundEnabled } = getState();

      setSoundEnabled(true);

      expect(getState().soundEnabled).toBe(true);
    });

    it('should disable sound', () => {
      const { setSoundEnabled } = getState();

      setSoundEnabled(false);

      expect(getState().soundEnabled).toBe(false);
    });

    it('should toggle sound', () => {
      const { setSoundEnabled } = getState();

      setSoundEnabled(false);
      expect(getState().soundEnabled).toBe(false);

      setSoundEnabled(true);
      expect(getState().soundEnabled).toBe(true);
    });
  });

  describe('setReducedCelebrations', () => {
    it('should enable reduced celebrations', () => {
      const { setReducedCelebrations } = getState();

      setReducedCelebrations(true);

      expect(getState().reducedCelebrations).toBe(true);
    });

    it('should disable reduced celebrations', () => {
      const { setReducedCelebrations } = getState();

      setReducedCelebrations(false);

      expect(getState().reducedCelebrations).toBe(false);
    });

    it('should toggle reduced celebrations', () => {
      const { setReducedCelebrations } = getState();

      setReducedCelebrations(true);
      expect(getState().reducedCelebrations).toBe(true);

      setReducedCelebrations(false);
      expect(getState().reducedCelebrations).toBe(false);
    });
  });

  // ==========================================================================
  // Clear History
  // ==========================================================================

  describe('clearHistory', () => {
    it('should clear all last used values', () => {
      const {
        setLastBrandKit,
        setLastAssetType,
        setLastLogoPosition,
        setLastLogoSize,
        clearHistory,
      } = getState();

      setLastBrandKit('brand-kit-123');
      setLastAssetType('twitch_emote');
      setLastLogoPosition('bottom-right');
      setLastLogoSize('medium');

      clearHistory();

      const state = getState();
      expect(state.lastBrandKitId).toBeNull();
      expect(state.lastAssetType).toBeNull();
      expect(state.lastLogoPosition).toBeNull();
      expect(state.lastLogoSize).toBeNull();
    });

    it('should clear form history', () => {
      const { saveFormValues, clearHistory } = getState();

      saveFormValues('form-1', { field: 'value' });
      saveFormValues('form-2', { field: 'value' });

      clearHistory();

      expect(getState().formHistory).toEqual({});
    });

    it('should NOT clear feature preferences', () => {
      const { setSoundEnabled, setReducedCelebrations, clearHistory } = getState();

      setSoundEnabled(false);
      setReducedCelebrations(true);

      clearHistory();

      const state = getState();
      // Feature preferences should remain unchanged
      expect(state.soundEnabled).toBe(false);
      expect(state.reducedCelebrations).toBe(true);
    });
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  describe('getPreferencesState', () => {
    it('should return current state', () => {
      const { setLastBrandKit } = getState();
      setLastBrandKit('test-brand-kit');

      const state = getPreferencesState();
      expect(state.lastBrandKitId).toBe('test-brand-kit');
    });
  });

  describe('resetPreferences', () => {
    it('should reset all preferences to defaults', () => {
      const {
        setLastBrandKit,
        setLastAssetType,
        setSoundEnabled,
        setReducedCelebrations,
        saveFormValues,
      } = getState();

      // Set various values
      setLastBrandKit('brand-kit-123');
      setLastAssetType('twitch_emote');
      setSoundEnabled(false);
      setReducedCelebrations(true);
      saveFormValues('form-1', { field: 'value' });

      // Reset
      resetPreferences();

      const state = getState();
      expect(state.lastBrandKitId).toBeNull();
      expect(state.lastAssetType).toBeNull();
      expect(state.lastLogoPosition).toBeNull();
      expect(state.lastLogoSize).toBeNull();
      expect(state.formHistory).toEqual({});
      expect(state.soundEnabled).toBe(true);
      expect(state.reducedCelebrations).toBe(false);
    });
  });

  describe('waitForPreferencesHydration', () => {
    it('should resolve when hydration is complete', async () => {
      // Mock hasHydrated to return true
      const originalHasHydrated = usePreferencesStore.persist.hasHydrated;
      usePreferencesStore.persist.hasHydrated = () => true;

      await expect(waitForPreferencesHydration()).resolves.toBeUndefined();

      // Restore
      usePreferencesStore.persist.hasHydrated = originalHasHydrated;
    });
  });

  // ==========================================================================
  // Persistence
  // ==========================================================================

  describe('persistence', () => {
    it('should use correct storage key', () => {
      expect(PREFERENCES_STORAGE_KEY).toBe('aurastream-preferences');
    });

    it('should have persist middleware configured', () => {
      // Verify the store has persist functionality
      expect(usePreferencesStore.persist).toBeDefined();
      expect(typeof usePreferencesStore.persist.hasHydrated).toBe('function');
      expect(typeof usePreferencesStore.persist.onFinishHydration).toBe('function');
    });
  });

  // ==========================================================================
  // State Transitions
  // ==========================================================================

  describe('state transitions', () => {
    it('should handle complete workflow', () => {
      const {
        setLastBrandKit,
        setLastAssetType,
        setLastLogoPosition,
        setLastLogoSize,
        saveFormValues,
        getFormDefaults,
        setSoundEnabled,
        setReducedCelebrations,
        clearHistory,
      } = getState();

      // Set all values
      setLastBrandKit('brand-kit-1');
      setLastAssetType('twitch_emote');
      setLastLogoPosition('bottom-right');
      setLastLogoSize('medium');
      saveFormValues('generate-form', {
        prompt: 'Create an emote',
        style: 'cartoon',
      });
      setSoundEnabled(false);
      setReducedCelebrations(true);

      // Verify all values
      let state = getState();
      expect(state.lastBrandKitId).toBe('brand-kit-1');
      expect(state.lastAssetType).toBe('twitch_emote');
      expect(state.lastLogoPosition).toBe('bottom-right');
      expect(state.lastLogoSize).toBe('medium');
      expect(getFormDefaults('generate-form')).toEqual({
        prompt: 'Create an emote',
        style: 'cartoon',
      });
      expect(state.soundEnabled).toBe(false);
      expect(state.reducedCelebrations).toBe(true);

      // Clear history
      clearHistory();

      // Verify history cleared but preferences remain
      state = getState();
      expect(state.lastBrandKitId).toBeNull();
      expect(state.lastAssetType).toBeNull();
      expect(state.formHistory).toEqual({});
      expect(state.soundEnabled).toBe(false);
      expect(state.reducedCelebrations).toBe(true);
    });

    it('should handle rapid updates', () => {
      const { setLastBrandKit, setLastAssetType } = getState();

      // Rapid updates
      for (let i = 0; i < 100; i++) {
        setLastBrandKit(`brand-kit-${i}`);
        setLastAssetType(`asset-type-${i}`);
      }

      const state = getState();
      expect(state.lastBrandKitId).toBe('brand-kit-99');
      expect(state.lastAssetType).toBe('asset-type-99');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle special characters in form IDs', () => {
      const { saveFormValues, getFormDefaults } = getState();

      const specialFormId = 'form/with:special-chars_and.dots';
      saveFormValues(specialFormId, { field: 'value' });

      expect(getFormDefaults(specialFormId)).toEqual({ field: 'value' });
    });

    it('should handle special characters in form values', () => {
      const { saveFormValues, getFormDefaults } = getState();

      saveFormValues('test-form', {
        prompt: 'Create an emote with "quotes" and <brackets>',
        unicode: '🎮 Gaming emote 🎯',
      });

      const defaults = getFormDefaults('test-form');
      expect(defaults.prompt).toBe('Create an emote with "quotes" and <brackets>');
      expect(defaults.unicode).toBe('🎮 Gaming emote 🎯');
    });

    it('should handle empty string values', () => {
      const { setLastBrandKit, setLastAssetType } = getState();

      setLastBrandKit('');
      setLastAssetType('');

      const state = getState();
      expect(state.lastBrandKitId).toBe('');
      expect(state.lastAssetType).toBe('');
    });

    it('should handle very long form values', () => {
      const { saveFormValues, getFormDefaults } = getState();

      const longValue = 'a'.repeat(10000);
      saveFormValues('long-form', { longField: longValue });

      const defaults = getFormDefaults('long-form');
      expect(defaults.longField).toBe(longValue);
    });
  });
});
