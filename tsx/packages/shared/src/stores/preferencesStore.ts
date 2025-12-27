/**
 * Preferences Store using Zustand
 * Manages user preferences and smart defaults across the application
 *
 * Features:
 * - Persists to localStorage with migration support
 * - Tracks last used values for brand kits, asset types, etc.
 * - Stores form history for intelligent defaults
 * - Feature preferences (sound, celebrations)
 *
 * @module stores/preferencesStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type {
  PreferencesState,
  FormValues,
  FormHistory,
  PersistedPreferences,
} from '../types/preferences';

/**
 * Storage key for localStorage persistence
 */
export const PREFERENCES_STORAGE_KEY = 'aurastream-preferences';

/**
 * Current schema version for migrations
 */
const SCHEMA_VERSION = 1;

/**
 * Default state values
 */
const DEFAULT_STATE: PersistedPreferences = {
  lastBrandKitId: null,
  lastAssetType: null,
  lastLogoPosition: null,
  lastLogoSize: null,
  formHistory: {},
  soundEnabled: true,
  reducedCelebrations: false,
};

/**
 * Maximum number of forms to keep in history
 * Prevents unbounded growth of localStorage
 */
const MAX_FORM_HISTORY_ENTRIES = 50;

/**
 * Migrate persisted state from older versions
 * @param persistedState - The state loaded from storage
 * @param version - The version of the persisted state
 * @returns Migrated state
 */
function migrateState(
  persistedState: unknown,
  version: number
): PersistedPreferences {
  // If no version or version 0, this is fresh state
  if (version === 0 || !persistedState) {
    return DEFAULT_STATE;
  }

  // Type guard for persisted state
  const state = persistedState as Partial<PersistedPreferences>;

  // Version 1 is current, no migration needed
  if (version === SCHEMA_VERSION) {
    return {
      ...DEFAULT_STATE,
      ...state,
    };
  }

  // Future migrations would go here
  // Example:
  // if (version < 2) {
  //   // Migrate from v1 to v2
  //   state.newField = state.oldField;
  //   delete state.oldField;
  // }

  return {
    ...DEFAULT_STATE,
    ...state,
  };
}

/**
 * Trim form history to prevent unbounded growth
 * Keeps the most recently used forms
 */
function trimFormHistory(history: FormHistory): FormHistory {
  const entries = Object.entries(history);
  if (entries.length <= MAX_FORM_HISTORY_ENTRIES) {
    return history;
  }

  // Keep only the most recent entries
  // Since we don't track timestamps, we just keep the last N entries
  const trimmedEntries = entries.slice(-MAX_FORM_HISTORY_ENTRIES);
  return Object.fromEntries(trimmedEntries);
}

/**
 * Preferences store for managing user preferences and smart defaults
 *
 * @example
 * ```typescript
 * import { usePreferencesStore } from '@aurastream/shared';
 *
 * function MyComponent() {
 *   const { lastBrandKitId, setLastBrandKit } = usePreferencesStore();
 *
 *   const handleBrandKitSelect = (id: string) => {
 *     setLastBrandKit(id);
 *   };
 *
 *   return <BrandKitSelector defaultValue={lastBrandKitId} onChange={handleBrandKitSelect} />;
 * }
 * ```
 */
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_STATE,

      // Actions
      setLastBrandKit: (id: string) => {
        set({ lastBrandKitId: id });
      },

      setLastAssetType: (type: string) => {
        set({ lastAssetType: type });
      },

      setLastLogoPosition: (position: string) => {
        set({ lastLogoPosition: position });
      },

      setLastLogoSize: (size: string) => {
        set({ lastLogoSize: size });
      },

      saveFormValues: (formId: string, values: FormValues) => {
        set((state) => {
          const newHistory = {
            ...state.formHistory,
            [formId]: values,
          };
          return {
            formHistory: trimFormHistory(newHistory),
          };
        });
      },

      getFormDefaults: (formId: string): FormValues => {
        const state = get();
        return state.formHistory[formId] ?? {};
      },

      setSoundEnabled: (enabled: boolean) => {
        set({ soundEnabled: enabled });
      },

      setReducedCelebrations: (reduced: boolean) => {
        set({ reducedCelebrations: reduced });
      },

      clearHistory: () => {
        set({
          lastBrandKitId: null,
          lastAssetType: null,
          lastLogoPosition: null,
          lastLogoSize: null,
          formHistory: {},
        });
      },
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: migrateState,
      partialize: (state): PersistedPreferences => ({
        lastBrandKitId: state.lastBrandKitId,
        lastAssetType: state.lastAssetType,
        lastLogoPosition: state.lastLogoPosition,
        lastLogoSize: state.lastLogoSize,
        formHistory: state.formHistory,
        soundEnabled: state.soundEnabled,
        reducedCelebrations: state.reducedCelebrations,
      }),
    }
  )
);

/**
 * Get the current preferences state (non-reactive)
 * Useful for accessing state outside of React components
 *
 * @returns Current preferences state
 *
 * @example
 * ```typescript
 * const state = getPreferencesState();
 * console.log('Last brand kit:', state.lastBrandKitId);
 * ```
 */
export function getPreferencesState(): PreferencesState {
  return usePreferencesStore.getState();
}

/**
 * Reset preferences to default values
 * Clears all stored preferences and history
 *
 * @example
 * ```typescript
 * import { resetPreferences } from '@aurastream/shared';
 *
 * function SettingsPage() {
 *   const handleReset = () => {
 *     resetPreferences();
 *   };
 *
 *   return <button onClick={handleReset}>Reset Preferences</button>;
 * }
 * ```
 */
export function resetPreferences(): void {
  usePreferencesStore.setState({
    ...DEFAULT_STATE,
  });
}

/**
 * Check if preferences have been hydrated from storage
 * Useful for SSR scenarios where you need to wait for client-side hydration
 *
 * @returns Promise that resolves when hydration is complete
 *
 * @example
 * ```typescript
 * await waitForPreferencesHydration();
 * const state = getPreferencesState();
 * ```
 */
export function waitForPreferencesHydration(): Promise<void> {
  return new Promise((resolve) => {
    // Check if already hydrated
    if (usePreferencesStore.persist.hasHydrated()) {
      resolve();
      return;
    }

    // Wait for hydration
    const unsubscribe = usePreferencesStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}
