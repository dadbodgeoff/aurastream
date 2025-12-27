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
 * - Skip button with "Don't show again" option
 * - Celebration on completion
 * - Keyboard navigation support
 *
 * @module components/onboarding/OnboardingTour
 */

import { useEffect, useRef, useCallback, useState } from 'react';
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
    element: '[data-tour="coach"]',
    popover: {
      title: '🤖 Your Free AI Coach Session',
      description:
        'Get AI-powered help crafting the perfect prompt. You have 1 free trial session included with your account!',
      side: 'right',
      align: 'start',
    },
    title: 'Prompt Coach',
    description: 'AI Coach with free trial',
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
 * Matches AuraStream brand colors (purple/violet theme with orange accents)
 */
const TOUR_STYLES = `
  .driver-popover {
    background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
    border: 1px solid rgba(139, 92, 246, 0.4);
    border-radius: 16px;
    box-shadow: 0 0 60px rgba(139, 92, 246, 0.25), 0 8px 32px rgba(0, 0, 0, 0.5);
    color: #f8fafc;
    max-width: 380px;
    padding: 1.25rem;
  }

  .driver-popover-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #f8fafc;
    margin-bottom: 0.75rem;
    letter-spacing: -0.01em;
  }

  .driver-popover-description {
    font-size: 0.9rem;
    color: #cbd5e1;
    line-height: 1.6;
  }

  .driver-popover-progress-text {
    font-size: 0.75rem;
    color: #8b5cf6;
    font-weight: 500;
  }

  .driver-popover-navigation-btns {
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .driver-popover-prev-btn,
  .driver-popover-next-btn {
    padding: 0.625rem 1.25rem;
    border-radius: 10px;
    font-size: 0.875rem;
    font-weight: 600;
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .driver-popover-prev-btn {
    background: rgba(139, 92, 246, 0.15);
    border: 1px solid rgba(139, 92, 246, 0.4);
    color: #c4b5fd;
  }

  .driver-popover-prev-btn:hover {
    background: rgba(139, 92, 246, 0.25);
    border-color: rgba(139, 92, 246, 0.6);
    transform: translateY(-1px);
  }

  .driver-popover-next-btn {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    border: none;
    color: white;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
  }

  .driver-popover-next-btn:hover {
    background: linear-gradient(135deg, #9d6efa 0%, #8b5cf6 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(139, 92, 246, 0.5);
  }

  .driver-popover-close-btn {
    color: #64748b;
    transition: all 0.2s ease;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
  }

  .driver-popover-close-btn:hover {
    color: #f8fafc;
    background: rgba(139, 92, 246, 0.2);
  }

  .driver-popover-arrow-side-left.driver-popover-arrow,
  .driver-popover-arrow-side-right.driver-popover-arrow,
  .driver-popover-arrow-side-top.driver-popover-arrow,
  .driver-popover-arrow-side-bottom.driver-popover-arrow {
    border-color: transparent;
  }

  .driver-popover-arrow-side-left.driver-popover-arrow {
    border-right-color: #0f0f1a;
  }

  .driver-popover-arrow-side-right.driver-popover-arrow {
    border-left-color: #0f0f1a;
  }

  .driver-popover-arrow-side-top.driver-popover-arrow {
    border-bottom-color: #0f0f1a;
  }

  .driver-popover-arrow-side-bottom.driver-popover-arrow {
    border-top-color: #0f0f1a;
  }

  .driver-overlay {
    background: rgba(0, 0, 0, 0.75);
  }

  .driver-active-element {
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.5), 0 0 30px rgba(139, 92, 246, 0.4);
    border-radius: 12px;
  }

  /* AuraStream branding footer */
  .driver-popover-footer {
    border-top: 1px solid rgba(139, 92, 246, 0.2);
    padding-top: 0.75rem;
    margin-top: 0.75rem;
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
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [neverShowChecked, setNeverShowChecked] = useState(false);

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
   * Handle tour skip - show confirmation modal
   */
  const handleSkipClick = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
    }
    setShowSkipModal(true);
  }, []);

  /**
   * Confirm skip with optional "never show again"
   */
  const confirmSkip = useCallback(() => {
    skipTour(neverShowChecked);
    setShowSkipModal(false);
    setNeverShowChecked(false);
  }, [skipTour, neverShowChecked]);

  /**
   * Cancel skip and resume tour
   */
  const cancelSkip = useCallback(() => {
    setShowSkipModal(false);
    setNeverShowChecked(false);
    // Resume the tour
    if (driverRef.current) {
      driverRef.current.drive(currentStep);
    }
  }, [currentStep]);

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
            handleSkipClick();
          },
          onDestroyStarted: () => {
            // Only show skip modal if not completing normally
            if (driverInstance.getActiveIndex() !== totalSteps - 1) {
              handleSkipClick();
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
  }, [isActive, currentStep, totalSteps, setStep, handleComplete, handleSkipClick]);

  // Render skip confirmation modal
  if (showSkipModal) {
    return (
      <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-md rounded-2xl border border-violet-500/30 bg-gradient-to-br from-[#0f0f1a] to-[#1a1a2e] p-6 shadow-2xl shadow-violet-500/20">
          {/* AuraStream Logo/Header */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white">AuraStream</span>
          </div>

          <h3 className="mb-2 text-xl font-bold text-white">Skip the Tour?</h3>
          <p className="mb-6 text-sm leading-relaxed text-slate-400">
            You can always restart the tour from Settings if you change your mind.
          </p>

          {/* Don't show again checkbox */}
          <label className="mb-6 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 transition-colors hover:border-violet-500/30 hover:bg-slate-800/50">
            <input
              type="checkbox"
              checked={neverShowChecked}
              onChange={(e) => setNeverShowChecked(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
            />
            <span className="text-sm text-slate-300">Don&apos;t show this tour again</span>
          </label>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={cancelSkip}
              className="flex-1 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-300 transition-all hover:border-violet-500/50 hover:bg-violet-500/20"
            >
              Continue Tour
            </button>
            <button
              onClick={confirmSkip}
              className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition-all hover:from-violet-500 hover:to-purple-500 hover:shadow-violet-500/40"
            >
              Skip Tour
            </button>
          </div>
        </div>
      </div>
    );
  }

  // This component doesn't render anything visible when tour is active
  // driver.js handles all the UI
  return null;
}

export default OnboardingTour;
