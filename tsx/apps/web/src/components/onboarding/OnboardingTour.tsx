'use client';

/**
 * OnboardingTour Component
 *
 * Provides a guided tour for new users using driver.js.
 * Highlights key features and navigation elements.
 *
 * Features:
 * - Step-by-step guided tour
 * - AuraStream brand styling (purple/violet theme)
 * - Progress indicator
 * - Skip button
 * - Celebration on completion
 * - Keyboard navigation support
 *
 * @module components/onboarding/OnboardingTour
 */

import { useEffect, useRef, useCallback } from 'react';
import { useOnboardingStore, usePolishStore } from '@aurastream/shared';

// Dynamic import for driver.js to avoid SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DriverType = any;

/**
 * Tour step configuration
 */
interface TourStep {
  /** CSS selector for the element to highlight */
  element: string;
  /** Popover configuration */
  popover: {
    title: string;
    description: string;
    side?: 'top' | 'bottom' | 'left' | 'right' | 'over';
    align?: 'start' | 'center' | 'end';
  };
  /** Step title for internal tracking */
  title: string;
  /** Step description for internal tracking */
  description: string;
}

/**
 * Define the tour steps
 * Each step highlights a key feature of the platform
 */
const TOUR_STEPS: TourStep[] = [
  {
    element: '[data-tour="quick-create"]',
    popover: {
      title: '🚀 Welcome to AuraStream!',
      description:
        'Start creating stunning assets with Quick Create. Generate professional graphics for your stream in seconds!',
      side: 'bottom',
      align: 'start',
    },
    title: 'Welcome',
    description: 'Quick Create button',
  },
  {
    element: '[data-tour="brand-kits"]',
    popover: {
      title: '🎨 Brand Studio',
      description:
        'Set up your brand identity here. Define colors, fonts, and logos that will be applied to all your generated assets.',
      side: 'right',
      align: 'start',
    },
    title: 'Brand Kits',
    description: 'Brand Studio link',
  },
  {
    element: '[data-tour="assets"]',
    popover: {
      title: '📁 Asset Library',
      description:
        'All your generated assets are stored here. Browse, download, and manage your creations in one place.',
      side: 'right',
      align: 'start',
    },
    title: 'Assets',
    description: 'Asset Library link',
  },
  {
    element: 'body',
    popover: {
      title: '⌨️ Pro Tip: Command Palette',
      description:
        'Press ⌘K (or Ctrl+K on Windows) to open the command palette. Quickly navigate, search, and perform actions from anywhere!',
      side: 'over',
      align: 'center',
    },
    title: 'Command Palette',
    description: 'Keyboard shortcut hint',
  },
  {
    element: 'body',
    popover: {
      title: '🎉 You\'re All Set!',
      description:
        'You\'re ready to create amazing content! Start with Quick Create or explore the Brand Studio to set up your identity.',
      side: 'over',
      align: 'center',
    },
    title: 'Completion',
    description: 'Tour complete',
  },
];

/**
 * Custom CSS styles for the tour
 * Matches AuraStream brand colors (purple/violet theme)
 */
const TOUR_STYLES = `
  .driver-popover {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 12px;
    box-shadow: 0 0 40px rgba(139, 92, 246, 0.2), 0 4px 20px rgba(0, 0, 0, 0.4);
    color: #f8fafc;
    max-width: 340px;
  }

  .driver-popover-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #f8fafc;
    margin-bottom: 0.5rem;
  }

  .driver-popover-description {
    font-size: 0.875rem;
    color: #cbd5e1;
    line-height: 1.5;
  }

  .driver-popover-progress-text {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .driver-popover-navigation-btns {
    gap: 0.5rem;
  }

  .driver-popover-prev-btn,
  .driver-popover-next-btn {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .driver-popover-prev-btn {
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.3);
    color: #c4b5fd;
  }

  .driver-popover-prev-btn:hover {
    background: rgba(139, 92, 246, 0.2);
    border-color: rgba(139, 92, 246, 0.5);
  }

  .driver-popover-next-btn {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    border: none;
    color: white;
  }

  .driver-popover-next-btn:hover {
    background: linear-gradient(135deg, #9d6efa 0%, #8b5cf6 100%);
    transform: translateY(-1px);
  }

  .driver-popover-close-btn {
    color: #94a3b8;
    transition: color 0.2s ease;
  }

  .driver-popover-close-btn:hover {
    color: #f8fafc;
  }

  .driver-popover-arrow-side-left.driver-popover-arrow,
  .driver-popover-arrow-side-right.driver-popover-arrow,
  .driver-popover-arrow-side-top.driver-popover-arrow,
  .driver-popover-arrow-side-bottom.driver-popover-arrow {
    border-color: transparent;
  }

  .driver-popover-arrow-side-left.driver-popover-arrow {
    border-right-color: #1a1a2e;
  }

  .driver-popover-arrow-side-right.driver-popover-arrow {
    border-left-color: #1a1a2e;
  }

  .driver-popover-arrow-side-top.driver-popover-arrow {
    border-bottom-color: #1a1a2e;
  }

  .driver-popover-arrow-side-bottom.driver-popover-arrow {
    border-top-color: #1a1a2e;
  }

  .driver-overlay {
    background: rgba(0, 0, 0, 0.7);
  }

  .driver-active-element {
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.4), 0 0 20px rgba(139, 92, 246, 0.3);
    border-radius: 8px;
  }
`;

/**
 * Props for OnboardingTour component
 */
export interface OnboardingTourProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * OnboardingTour - Guided tour component for new users
 *
 * Uses driver.js to highlight key features and guide users
 * through the platform. Integrates with the onboarding store
 * for state management and celebration system for completion.
 *
 * @example
 * ```tsx
 * // In your layout or provider
 * <OnboardingTour />
 * ```
 */
export function OnboardingTour({ className }: OnboardingTourProps): JSX.Element | null {
  const driverRef = useRef<DriverType | null>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // Onboarding store
  const isActive = useOnboardingStore((state) => state.isActive);
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const totalSteps = useOnboardingStore((state) => state.totalSteps);
  const setStep = useOnboardingStore((state) => state.setStep);
  const completeTour = useOnboardingStore((state) => state.completeTour);
  const skipTour = useOnboardingStore((state) => state.skipTour);

  // Polish store for celebrations
  const queueCelebration = usePolishStore((state) => state.queueCelebration);

  /**
   * Handle tour completion with celebration
   */
  const handleComplete = useCallback(() => {
    completeTour();

    // Queue a celebration for completing the tour
    queueCelebration({
      type: 'achievement',
      title: 'Tour Complete!',
      description: 'You\'re ready to create amazing content with AuraStream.',
      rarity: 'rare',
      priority: 25,
    });
  }, [completeTour, queueCelebration]);

  /**
   * Handle tour skip
   */
  const handleSkip = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
    }
    skipTour();
  }, [skipTour]);

  /**
   * Initialize driver.js and inject custom styles
   */
  useEffect(() => {
    // Inject custom styles
    if (!styleRef.current) {
      const style = document.createElement('style');
      style.textContent = TOUR_STYLES;
      document.head.appendChild(style);
      styleRef.current = style;
    }

    return () => {
      // Cleanup styles on unmount
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
    };
  }, []);

  /**
   * Start/stop tour based on isActive state
   */
  useEffect(() => {
    if (!isActive) {
      // Destroy driver if tour is not active
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
      return;
    }

    // Dynamically import driver.js to avoid SSR issues
    const initDriver = async () => {
      try {
        const { driver } = await import('driver.js');
        // CSS is imported via link tag in the head instead of dynamic import
        // to avoid TypeScript module resolution issues
        if (!document.querySelector('link[href*="driver.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.css';
          document.head.appendChild(link);
        }

        // Create driver instance
        const driverInstance = driver({
          showProgress: true,
          showButtons: ['next', 'previous', 'close'],
          steps: TOUR_STEPS.map((step, index) => ({
            element: step.element,
            popover: {
              ...step.popover,
              progressText: `Step ${index + 1} of ${totalSteps}`,
            },
          })),
          nextBtnText: currentStep === totalSteps - 1 ? 'Finish' : 'Next',
          prevBtnText: 'Back',
          doneBtnText: 'Finish',
          onNextClick: () => {
            const nextIndex = driverInstance.getActiveIndex();
            if (nextIndex !== undefined) {
              if (nextIndex >= totalSteps - 1) {
                driverInstance.destroy();
                handleComplete();
              } else {
                setStep(nextIndex + 1);
                driverInstance.moveNext();
              }
            }
          },
          onPrevClick: () => {
            const prevIndex = driverInstance.getActiveIndex();
            if (prevIndex !== undefined && prevIndex > 0) {
              setStep(prevIndex - 1);
              driverInstance.movePrevious();
            }
          },
          onCloseClick: () => {
            handleSkip();
          },
          onDestroyStarted: () => {
            // Only skip if not completing normally
            if (driverInstance.getActiveIndex() !== totalSteps - 1) {
              handleSkip();
            }
          },
        });

        driverRef.current = driverInstance;

        // Start the tour at the current step
        driverInstance.drive(currentStep);
      } catch (error) {
        console.error('Failed to initialize driver.js:', error);
      }
    };

    initDriver();

    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, [isActive, currentStep, totalSteps, setStep, handleComplete, handleSkip]);

  // This component doesn't render anything visible
  // driver.js handles all the UI
  return null;
}

export default OnboardingTour;
