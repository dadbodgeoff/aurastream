/**
 * Onboarding Store using Zustand
 * Manages onboarding tour state across the application
 *
 * Features:
 * - Persists completion state to localStorage
 * - Step-by-step tour navigation
 * - Skip and reset functionality
 * - Integration with celebration system
 *
 * @module stores/onboardingStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Storage key for localStorage persistence
 */
export const ONBOARDING_STORAGE_KEY = 'aurastream-onboarding';

/**
 * Current schema version for migrations
 */
const SCHEMA_VERSION = 1;

/**
 * Total number of steps in the onboarding tour
 */
export const TOTAL_ONBOARDING_STEPS = 6;

/**
 * Onboarding store state interface
 */
export interface OnboardingState {
  /** Whether the user has completed the onboarding tour */
  hasCompletedOnboarding: boolean;
  /** Whether the user has opted out of seeing the tour */
  neverShowAgain: boolean;
  /** Current step index (0-based) */
  currentStep: number;
  /** Total number of steps in the tour */
  totalSteps: number;
  /** Whether the tour is currently active/running */
  isActive: boolean;

  // Actions
  /** Start the onboarding tour */
  startTour: () => void;
  /** Move to the next step */
  nextStep: () => void;
  /** Move to the previous step */
  prevStep: () => void;
  /** Skip the tour without completing */
  skipTour: (neverShow?: boolean) => void;
  /** Complete the tour successfully */
  completeTour: () => void;
  /** Reset the tour to initial state (for testing or re-onboarding) */
  resetTour: () => void;
  /** Set the current step directly */
  setStep: (step: number) => void;
  /** Set never show again preference */
  setNeverShowAgain: (value: boolean) => void;
}

/**
 * Persisted state shape (subset of full state)
 */
interface PersistedOnboardingState {
  hasCompletedOnboarding: boolean;
  neverShowAgain: boolean;
}

/**
 * Default state values
 */
const DEFAULT_STATE: PersistedOnboardingState = {
  hasCompletedOnboarding: false,
  neverShowAgain: false,
};

/**
 * Migrate persisted state from older versions
 * @param persistedState - The state loaded from storage
 * @param version - The version of the persisted state
 * @returns Migrated state
 */
function migrateState(
  persistedState: unknown,
  version: number
): PersistedOnboardingState {
  // If no version or version 0, this is fresh state
  if (version === 0 || !persistedState) {
    return DEFAULT_STATE;
  }

  // Type guard for persisted state
  const state = persistedState as Partial<PersistedOnboardingState>;

  // Version 1 is current, no migration needed
  if (version === SCHEMA_VERSION) {
    return {
      ...DEFAULT_STATE,
      ...state,
    };
  }

  // Future migrations would go here
  return {
    ...DEFAULT_STATE,
    ...state,
  };
}

/**
 * Onboarding store for managing tour state
 *
 * @example
 * ```typescript
 * import { useOnboardingStore } from '@aurastream/shared';
 *
 * function MyComponent() {
 *   const { hasCompletedOnboarding, startTour } = useOnboardingStore();
 *
 *   if (!hasCompletedOnboarding) {
 *     return <button onClick={startTour}>Start Tour</button>;
 *   }
 *
 *   return <div>Welcome back!</div>;
 * }
 * ```
 */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      // Initial state
      hasCompletedOnboarding: false,
      neverShowAgain: false,
      currentStep: 0,
      totalSteps: TOTAL_ONBOARDING_STEPS,
      isActive: false,

      // Actions
      startTour: () => {
        const { neverShowAgain, hasCompletedOnboarding } = get();
        // Don't start if user opted out or already completed
        if (neverShowAgain || hasCompletedOnboarding) {
          return;
        }
        set({
          isActive: true,
          currentStep: 0,
        });
      },

      nextStep: () => {
        const { currentStep, totalSteps } = get();
        const nextStepIndex = currentStep + 1;

        if (nextStepIndex >= totalSteps) {
          // Tour completed
          get().completeTour();
        } else {
          set({ currentStep: nextStepIndex });
        }
      },

      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 0) {
          set({ currentStep: currentStep - 1 });
        }
      },

      skipTour: (neverShow = false) => {
        set({
          isActive: false,
          hasCompletedOnboarding: true,
          neverShowAgain: neverShow,
          currentStep: 0,
        });
      },

      completeTour: () => {
        set({
          isActive: false,
          hasCompletedOnboarding: true,
          currentStep: 0,
        });
      },

      resetTour: () => {
        set({
          hasCompletedOnboarding: false,
          neverShowAgain: false,
          currentStep: 0,
          isActive: false,
        });
      },

      setStep: (step: number) => {
        const { totalSteps } = get();
        // Clamp step to valid range
        const clampedStep = Math.max(0, Math.min(step, totalSteps - 1));
        set({ currentStep: clampedStep });
      },

      setNeverShowAgain: (value: boolean) => {
        set({ neverShowAgain: value });
      },
    }),
    {
      name: ONBOARDING_STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: migrateState,
      // Persist completion state and never show preference
      partialize: (state): PersistedOnboardingState => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        neverShowAgain: state.neverShowAgain,
      }),
    }
  )
);

/**
 * Get the current onboarding state (non-reactive)
 * Useful for accessing state outside of React components
 *
 * @returns Current onboarding state
 *
 * @example
 * ```typescript
 * const state = getOnboardingState();
 * console.log('Completed:', state.hasCompletedOnboarding);
 * ```
 */
export function getOnboardingState(): OnboardingState {
  return useOnboardingStore.getState();
}

/**
 * Reset onboarding to default values
 * Clears completion state and resets tour
 *
 * @example
 * ```typescript
 * import { resetOnboarding } from '@aurastream/shared';
 *
 * function SettingsPage() {
 *   const handleReset = () => {
 *     resetOnboarding();
 *   };
 *
 *   return <button onClick={handleReset}>Restart Tour</button>;
 * }
 * ```
 */
export function resetOnboarding(): void {
  useOnboardingStore.getState().resetTour();
}

/**
 * Check if onboarding has been hydrated from storage
 * Useful for SSR scenarios where you need to wait for client-side hydration
 *
 * @returns Promise that resolves when hydration is complete
 *
 * @example
 * ```typescript
 * await waitForOnboardingHydration();
 * const state = getOnboardingState();
 * ```
 */
export function waitForOnboardingHydration(): Promise<void> {
  return new Promise((resolve) => {
    // Check if already hydrated
    if (useOnboardingStore.persist.hasHydrated()) {
      resolve();
      return;
    }

    // Wait for hydration
    const unsubscribe = useOnboardingStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}
