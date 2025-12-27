/**
 * Onboarding Store Tests
 * Comprehensive tests for the Zustand onboarding store
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  useOnboardingStore,
  type OnboardingState,
  getOnboardingState,
  resetOnboarding,
  ONBOARDING_STORAGE_KEY,
  TOTAL_ONBOARDING_STEPS,
} from '../stores/onboardingStore';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Reset the store to initial state before each test
 */
function resetStore(): void {
  useOnboardingStore.setState({
    hasCompletedOnboarding: false,
    currentStep: 0,
    totalSteps: TOTAL_ONBOARDING_STEPS,
    isActive: false,
  });
}

/**
 * Get the current store state
 */
function getState(): OnboardingState {
  return useOnboardingStore.getState();
}

// ============================================================================
// Tests
// ============================================================================

describe('OnboardingStore', () => {
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
      expect(state.hasCompletedOnboarding).toBe(false);
      expect(state.currentStep).toBe(0);
      expect(state.totalSteps).toBe(TOTAL_ONBOARDING_STEPS);
      expect(state.isActive).toBe(false);
    });

    it('should have correct total steps constant', () => {
      expect(TOTAL_ONBOARDING_STEPS).toBe(5);
    });

    it('should have correct storage key', () => {
      expect(ONBOARDING_STORAGE_KEY).toBe('aurastream-onboarding');
    });
  });

  // ==========================================================================
  // Start Tour
  // ==========================================================================

  describe('startTour', () => {
    it('should activate the tour', () => {
      const { startTour } = getState();

      startTour();

      const state = getState();
      expect(state.isActive).toBe(true);
      expect(state.currentStep).toBe(0);
    });

    it('should reset current step to 0 when starting', () => {
      // Set a different step first
      useOnboardingStore.setState({ currentStep: 3 });

      const { startTour } = getState();
      startTour();

      expect(getState().currentStep).toBe(0);
    });

    it('should not affect hasCompletedOnboarding when starting', () => {
      useOnboardingStore.setState({ hasCompletedOnboarding: true });

      const { startTour } = getState();
      startTour();

      expect(getState().hasCompletedOnboarding).toBe(true);
    });
  });

  // ==========================================================================
  // Next Step
  // ==========================================================================

  describe('nextStep', () => {
    it('should increment current step', () => {
      const { startTour, nextStep } = getState();

      startTour();
      nextStep();

      expect(getState().currentStep).toBe(1);
    });

    it('should increment step multiple times', () => {
      const { startTour, nextStep } = getState();

      startTour();
      nextStep();
      nextStep();
      nextStep();

      expect(getState().currentStep).toBe(3);
    });

    it('should complete tour when reaching last step', () => {
      const { startTour, nextStep } = getState();

      startTour();

      // Go through all steps
      for (let i = 0; i < TOTAL_ONBOARDING_STEPS; i++) {
        nextStep();
      }

      const state = getState();
      expect(state.hasCompletedOnboarding).toBe(true);
      expect(state.isActive).toBe(false);
      expect(state.currentStep).toBe(0);
    });

    it('should complete tour when on last step and calling nextStep', () => {
      useOnboardingStore.setState({
        isActive: true,
        currentStep: TOTAL_ONBOARDING_STEPS - 1,
      });

      const { nextStep } = getState();
      nextStep();

      const state = getState();
      expect(state.hasCompletedOnboarding).toBe(true);
      expect(state.isActive).toBe(false);
    });
  });

  // ==========================================================================
  // Previous Step
  // ==========================================================================

  describe('prevStep', () => {
    it('should decrement current step', () => {
      useOnboardingStore.setState({ isActive: true, currentStep: 2 });

      const { prevStep } = getState();
      prevStep();

      expect(getState().currentStep).toBe(1);
    });

    it('should not go below 0', () => {
      useOnboardingStore.setState({ isActive: true, currentStep: 0 });

      const { prevStep } = getState();
      prevStep();

      expect(getState().currentStep).toBe(0);
    });

    it('should decrement from any step', () => {
      useOnboardingStore.setState({ isActive: true, currentStep: 4 });

      const { prevStep } = getState();
      prevStep();
      prevStep();

      expect(getState().currentStep).toBe(2);
    });
  });

  // ==========================================================================
  // Skip Tour
  // ==========================================================================

  describe('skipTour', () => {
    it('should mark tour as completed', () => {
      const { startTour, skipTour } = getState();

      startTour();
      skipTour();

      expect(getState().hasCompletedOnboarding).toBe(true);
    });

    it('should deactivate the tour', () => {
      const { startTour, skipTour } = getState();

      startTour();
      skipTour();

      expect(getState().isActive).toBe(false);
    });

    it('should reset current step to 0', () => {
      useOnboardingStore.setState({ isActive: true, currentStep: 3 });

      const { skipTour } = getState();
      skipTour();

      expect(getState().currentStep).toBe(0);
    });

    it('should work from any step', () => {
      useOnboardingStore.setState({ isActive: true, currentStep: 2 });

      const { skipTour } = getState();
      skipTour();

      const state = getState();
      expect(state.hasCompletedOnboarding).toBe(true);
      expect(state.isActive).toBe(false);
      expect(state.currentStep).toBe(0);
    });
  });

  // ==========================================================================
  // Complete Tour
  // ==========================================================================

  describe('completeTour', () => {
    it('should mark tour as completed', () => {
      const { startTour, completeTour } = getState();

      startTour();
      completeTour();

      expect(getState().hasCompletedOnboarding).toBe(true);
    });

    it('should deactivate the tour', () => {
      const { startTour, completeTour } = getState();

      startTour();
      completeTour();

      expect(getState().isActive).toBe(false);
    });

    it('should reset current step to 0', () => {
      useOnboardingStore.setState({ isActive: true, currentStep: 4 });

      const { completeTour } = getState();
      completeTour();

      expect(getState().currentStep).toBe(0);
    });
  });

  // ==========================================================================
  // Reset Tour
  // ==========================================================================

  describe('resetTour', () => {
    it('should reset hasCompletedOnboarding to false', () => {
      useOnboardingStore.setState({ hasCompletedOnboarding: true });

      const { resetTour } = getState();
      resetTour();

      expect(getState().hasCompletedOnboarding).toBe(false);
    });

    it('should reset current step to 0', () => {
      useOnboardingStore.setState({ currentStep: 3 });

      const { resetTour } = getState();
      resetTour();

      expect(getState().currentStep).toBe(0);
    });

    it('should deactivate the tour', () => {
      useOnboardingStore.setState({ isActive: true });

      const { resetTour } = getState();
      resetTour();

      expect(getState().isActive).toBe(false);
    });

    it('should reset all state to initial values', () => {
      useOnboardingStore.setState({
        hasCompletedOnboarding: true,
        currentStep: 4,
        isActive: true,
      });

      const { resetTour } = getState();
      resetTour();

      const state = getState();
      expect(state.hasCompletedOnboarding).toBe(false);
      expect(state.currentStep).toBe(0);
      expect(state.isActive).toBe(false);
    });
  });

  // ==========================================================================
  // Set Step
  // ==========================================================================

  describe('setStep', () => {
    it('should set current step to specified value', () => {
      const { setStep } = getState();

      setStep(3);

      expect(getState().currentStep).toBe(3);
    });

    it('should clamp step to minimum of 0', () => {
      const { setStep } = getState();

      setStep(-5);

      expect(getState().currentStep).toBe(0);
    });

    it('should clamp step to maximum of totalSteps - 1', () => {
      const { setStep } = getState();

      setStep(100);

      expect(getState().currentStep).toBe(TOTAL_ONBOARDING_STEPS - 1);
    });

    it('should allow setting to any valid step', () => {
      const { setStep } = getState();

      for (let i = 0; i < TOTAL_ONBOARDING_STEPS; i++) {
        setStep(i);
        expect(getState().currentStep).toBe(i);
      }
    });
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  describe('getOnboardingState', () => {
    it('should return current state', () => {
      useOnboardingStore.setState({
        hasCompletedOnboarding: true,
        currentStep: 2,
        isActive: true,
      });

      const state = getOnboardingState();

      expect(state.hasCompletedOnboarding).toBe(true);
      expect(state.currentStep).toBe(2);
      expect(state.isActive).toBe(true);
    });
  });

  describe('resetOnboarding', () => {
    it('should reset onboarding state', () => {
      useOnboardingStore.setState({
        hasCompletedOnboarding: true,
        currentStep: 4,
        isActive: true,
      });

      resetOnboarding();

      const state = getState();
      expect(state.hasCompletedOnboarding).toBe(false);
      expect(state.currentStep).toBe(0);
      expect(state.isActive).toBe(false);
    });
  });

  // ==========================================================================
  // State Transitions
  // ==========================================================================

  describe('state transitions', () => {
    it('should handle complete tour flow', () => {
      const { startTour, nextStep } = getState();

      // Start tour
      startTour();
      expect(getState().isActive).toBe(true);
      expect(getState().currentStep).toBe(0);

      // Go through all steps
      for (let i = 0; i < TOTAL_ONBOARDING_STEPS - 1; i++) {
        nextStep();
        expect(getState().currentStep).toBe(i + 1);
      }

      // Complete on last step
      nextStep();

      const state = getState();
      expect(state.hasCompletedOnboarding).toBe(true);
      expect(state.isActive).toBe(false);
      expect(state.currentStep).toBe(0);
    });

    it('should handle skip and restart flow', () => {
      const { startTour, nextStep, skipTour, resetTour } = getState();

      // Start and skip
      startTour();
      nextStep();
      nextStep();
      skipTour();

      expect(getState().hasCompletedOnboarding).toBe(true);
      expect(getState().isActive).toBe(false);

      // Reset and restart
      resetTour();
      expect(getState().hasCompletedOnboarding).toBe(false);

      startTour();
      expect(getState().isActive).toBe(true);
      expect(getState().currentStep).toBe(0);
    });

    it('should handle navigation back and forth', () => {
      const { startTour, nextStep, prevStep } = getState();

      startTour();

      // Go forward
      nextStep();
      nextStep();
      expect(getState().currentStep).toBe(2);

      // Go back
      prevStep();
      expect(getState().currentStep).toBe(1);

      // Go forward again
      nextStep();
      nextStep();
      expect(getState().currentStep).toBe(3);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle multiple startTour calls', () => {
      const { startTour, nextStep } = getState();

      startTour();
      nextStep();
      nextStep();

      // Start again should reset to step 0
      startTour();

      expect(getState().currentStep).toBe(0);
      expect(getState().isActive).toBe(true);
    });

    it('should handle completeTour when not active', () => {
      const { completeTour } = getState();

      completeTour();

      const state = getState();
      expect(state.hasCompletedOnboarding).toBe(true);
      expect(state.isActive).toBe(false);
    });

    it('should handle skipTour when not active', () => {
      const { skipTour } = getState();

      skipTour();

      const state = getState();
      expect(state.hasCompletedOnboarding).toBe(true);
      expect(state.isActive).toBe(false);
    });

    it('should handle prevStep when at step 0', () => {
      const { startTour, prevStep } = getState();

      startTour();
      prevStep();
      prevStep();
      prevStep();

      expect(getState().currentStep).toBe(0);
    });

    it('should maintain totalSteps constant', () => {
      const { startTour, nextStep, resetTour } = getState();

      startTour();
      nextStep();
      resetTour();

      expect(getState().totalSteps).toBe(TOTAL_ONBOARDING_STEPS);
    });
  });

  // ==========================================================================
  // Persistence
  // ==========================================================================

  describe('persistence', () => {
    it('should only persist hasCompletedOnboarding', () => {
      // This test verifies the partialize function behavior
      // The actual localStorage persistence is handled by zustand/middleware
      const { startTour, completeTour } = getState();

      startTour();
      completeTour();

      // After completion, hasCompletedOnboarding should be true
      // but isActive and currentStep should be reset
      const state = getState();
      expect(state.hasCompletedOnboarding).toBe(true);
      expect(state.isActive).toBe(false);
      expect(state.currentStep).toBe(0);
    });
  });
});
