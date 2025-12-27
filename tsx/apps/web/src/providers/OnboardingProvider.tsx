'use client';

/**
 * OnboardingProvider
 *
 * Provider component that manages the onboarding tour lifecycle.
 * Auto-starts the tour for new users and provides restart functionality.
 *
 * Features:
 * - Auto-starts tour for new users (checks hasCompletedOnboarding)
 * - Provides restart tour function via context
 * - Waits for hydration before checking onboarding state
 * - Renders OnboardingTour component
 *
 * @module providers/OnboardingProvider
 *
 * @example
 * ```tsx
 * // In your app layout
 * <OnboardingProvider>
 *   <App />
 * </OnboardingProvider>
 * ```
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  useOnboardingStore,
  waitForOnboardingHydration,
} from '@aurastream/shared';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';

/**
 * Context value interface
 */
interface OnboardingContextValue {
  /** Restart the onboarding tour */
  restartTour: () => void;
  /** Whether the tour has been completed */
  hasCompletedOnboarding: boolean;
  /** Whether the tour is currently active */
  isActive: boolean;
  /** Current step in the tour */
  currentStep: number;
  /** Total steps in the tour */
  totalSteps: number;
}

/**
 * Onboarding context
 */
const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/**
 * Props for OnboardingProvider
 */
interface OnboardingProviderProps {
  children: ReactNode;
  /** Whether to auto-start the tour for new users (default: true) */
  autoStart?: boolean;
  /** Delay before auto-starting the tour in ms (default: 1000) */
  autoStartDelay?: number;
}

/**
 * OnboardingProvider - Manages onboarding tour lifecycle
 *
 * Wraps children with onboarding context and renders the tour component.
 * Automatically starts the tour for new users after hydration.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <OnboardingProvider>
 *   <Dashboard />
 * </OnboardingProvider>
 *
 * // With custom options
 * <OnboardingProvider autoStart={false} autoStartDelay={2000}>
 *   <Dashboard />
 * </OnboardingProvider>
 * ```
 */
export function OnboardingProvider({
  children,
  autoStart = true,
  autoStartDelay = 1000,
}: OnboardingProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  // Onboarding store state
  const hasCompletedOnboarding = useOnboardingStore(
    (state) => state.hasCompletedOnboarding
  );
  const isActive = useOnboardingStore((state) => state.isActive);
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const totalSteps = useOnboardingStore((state) => state.totalSteps);
  const startTour = useOnboardingStore((state) => state.startTour);
  const resetTour = useOnboardingStore((state) => state.resetTour);

  /**
   * Restart the tour (resets completion state and starts)
   */
  const restartTour = useCallback(() => {
    resetTour();
    // Small delay to ensure state is reset before starting
    setTimeout(() => {
      startTour();
    }, 100);
  }, [resetTour, startTour]);

  /**
   * Wait for hydration before checking onboarding state
   */
  useEffect(() => {
    waitForOnboardingHydration().then(() => {
      setIsHydrated(true);
    });
  }, []);

  /**
   * Auto-start tour for new users after hydration
   */
  useEffect(() => {
    if (!isHydrated || !autoStart) {
      return;
    }

    // Check if user is new (hasn't completed onboarding)
    const state = useOnboardingStore.getState();
    if (!state.hasCompletedOnboarding && !state.isActive) {
      // Delay the start to allow the page to fully render
      const timer = setTimeout(() => {
        startTour();
      }, autoStartDelay);

      return () => clearTimeout(timer);
    }
  }, [isHydrated, autoStart, autoStartDelay, startTour]);

  // Context value
  const contextValue: OnboardingContextValue = {
    restartTour,
    hasCompletedOnboarding,
    isActive,
    currentStep,
    totalSteps,
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
      <OnboardingTour />
    </OnboardingContext.Provider>
  );
}

/**
 * Hook to access onboarding context
 *
 * @returns Onboarding context value
 * @throws Error if used outside of OnboardingProvider
 *
 * @example
 * ```tsx
 * function SettingsPage() {
 *   const { restartTour, hasCompletedOnboarding } = useOnboardingContext();
 *
 *   return (
 *     <button onClick={restartTour} disabled={!hasCompletedOnboarding}>
 *       Restart Tour
 *     </button>
 *   );
 * }
 * ```
 */
export function useOnboardingContext(): OnboardingContextValue {
  const context = useContext(OnboardingContext);

  if (!context) {
    throw new Error(
      'useOnboardingContext must be used within an OnboardingProvider'
    );
  }

  return context;
}

export default OnboardingProvider;
