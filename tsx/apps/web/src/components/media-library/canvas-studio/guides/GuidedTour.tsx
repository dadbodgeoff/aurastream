/**
 * Guided Tour Component
 * 
 * First-time user tour that walks through Canvas Studio features.
 * Shows tooltips highlighting key UI elements with step-by-step instructions.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector or element ID
  position: 'top' | 'bottom' | 'left' | 'right';
  highlight?: boolean;
}

interface GuidedTourProps {
  steps: TourStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  className?: string;
}

// ============================================================================
// Default Tour Steps
// ============================================================================

export const CANVAS_STUDIO_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Canvas Studio! 🎨',
    description: 'Create professional graphics in minutes. Let me show you around.',
    target: '[data-tour="canvas-area"]',
    position: 'bottom',
    highlight: true,
  },
  {
    id: 'mode-toggle',
    title: 'Easy & Pro Modes',
    description: 'Start in Easy mode for guided design, or switch to Pro for full control.',
    target: '[data-tour="mode-toggle"]',
    position: 'bottom',
    highlight: true,
  },
  {
    id: 'templates',
    title: 'Start with Templates',
    description: 'Pick a template to get a head start. Templates position your assets automatically.',
    target: '[data-tour="template-selector"]',
    position: 'right',
    highlight: true,
  },
  {
    id: 'add-assets',
    title: 'Add Your Assets',
    description: 'Click here to add images, logos, and other assets from your media library.',
    target: '[data-tour="add-assets"]',
    position: 'left',
    highlight: true,
  },
  {
    id: 'magic-toolbar',
    title: 'Smart Layout Tools',
    description: 'Use auto-arrange and alignment tools to perfect your design with one click.',
    target: '[data-tour="magic-toolbar"]',
    position: 'bottom',
    highlight: true,
  },
  {
    id: 'suggestions',
    title: 'Smart Suggestions',
    description: 'Get tips to improve your design. Click "Apply Fix" to make changes instantly.',
    target: '[data-tour="suggestions"]',
    position: 'left',
    highlight: true,
  },
  {
    id: 'export',
    title: 'Export Your Design',
    description: 'When you\'re happy, export your design in the perfect format for any platform.',
    target: '[data-tour="export-button"]',
    position: 'top',
    highlight: true,
  },
];

// ============================================================================
// Icons
// ============================================================================

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ============================================================================
// Tooltip Component
// ============================================================================

interface TooltipProps {
  step: TourStep;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

function TourTooltip({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onComplete,
}: TooltipProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalSteps - 1;
  
  // Calculate position based on target element
  useEffect(() => {
    const targetEl = document.querySelector(step.target);
    if (!targetEl) {
      // Fallback to center of screen
      setPosition({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 150,
      });
      return;
    }
    
    const rect = targetEl.getBoundingClientRect();
    const tooltipWidth = 300;
    const tooltipHeight = 180;
    const padding = 16;
    
    let top = 0;
    let left = 0;
    
    switch (step.position) {
      case 'top':
        top = rect.top - tooltipHeight - padding;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = rect.bottom + padding;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - padding;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + padding;
        break;
    }
    
    // Keep within viewport
    top = Math.max(padding, Math.min(window.innerHeight - tooltipHeight - padding, top));
    left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, left));
    
    setPosition({ top, left });
  }, [step]);
  
  return (
    <div
      className="fixed z-[100] w-[300px] bg-background-surface rounded-xl border border-border-subtle shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300"
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-subtle">
        <h3 className="font-semibold text-text-primary">{step.title}</h3>
        <button
          onClick={onSkip}
          className="p-1 rounded hover:bg-background-elevated text-text-muted hover:text-text-primary transition-colors"
        >
          <XIcon />
        </button>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-text-secondary">{step.description}</p>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-border-subtle bg-background-elevated/50 rounded-b-xl">
        {/* Progress */}
        <div className="flex items-center gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                i === currentIndex
                  ? 'bg-interactive-500'
                  : i < currentIndex
                  ? 'bg-interactive-500/50'
                  : 'bg-border-subtle'
              )}
            />
          ))}
        </div>
        
        {/* Navigation */}
        <div className="flex items-center gap-2">
          {!isFirst && (
            <button
              onClick={onPrev}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
            >
              <ArrowLeftIcon />
              Back
            </button>
          )}
          
          {isLast ? (
            <button
              onClick={onComplete}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            >
              <CheckIcon />
              Done
            </button>
          ) : (
            <button
              onClick={onNext}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-interactive-500 text-white hover:bg-interactive-600 transition-colors"
            >
              Next
              <ArrowRightIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Spotlight Overlay
// ============================================================================

interface SpotlightProps {
  target: string;
  active: boolean;
}

function Spotlight({ target, active }: SpotlightProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  
  useEffect(() => {
    if (!active) {
      setRect(null);
      return;
    }
    
    const targetEl = document.querySelector(target);
    if (targetEl) {
      setRect(targetEl.getBoundingClientRect());
    }
  }, [target, active]);
  
  if (!active || !rect) return null;
  
  const padding = 8;
  
  return (
    <div className="fixed inset-0 z-[99] pointer-events-none">
      {/* Dark overlay with cutout */}
      <svg className="w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - padding}
              y={rect.top - padding}
              width={rect.width + padding * 2}
              height={rect.height + padding * 2}
              rx="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.7)"
          mask="url(#spotlight-mask)"
        />
      </svg>
      
      {/* Highlight border */}
      <div
        className="absolute border-2 border-interactive-500 rounded-lg animate-pulse"
        style={{
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        }}
      />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GuidedTour({
  steps,
  isActive,
  onComplete,
  onSkip,
  className,
}: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Reset when tour becomes active
  useEffect(() => {
    if (isActive) {
      setCurrentStep(0);
    }
  }, [isActive]);
  
  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, steps.length]);
  
  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);
  
  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);
  
  const handleSkip = useCallback(() => {
    onSkip();
  }, [onSkip]);
  
  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStep === steps.length - 1) {
          handleComplete();
        } else {
          handleNext();
        }
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStep, steps.length, handleNext, handlePrev, handleComplete, handleSkip]);
  
  if (!isActive || steps.length === 0) return null;
  
  const step = steps[currentStep];
  
  return (
    <div className={cn('guided-tour', className)}>
      {/* Spotlight overlay */}
      {step.highlight && (
        <Spotlight target={step.target} active={true} />
      )}
      
      {/* Tooltip */}
      <TourTooltip
        step={step}
        currentIndex={currentStep}
        totalSteps={steps.length}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={handleSkip}
        onComplete={handleComplete}
      />
    </div>
  );
}

// ============================================================================
// Hook for Tour State
// ============================================================================

const TOUR_STORAGE_KEY = 'canvas-studio-tour-completed';

export function useTourState() {
  const [hasCompletedTour, setHasCompletedTour] = useState(true); // Default to true to prevent flash
  const [isTourActive, setIsTourActive] = useState(false);
  
  // Check localStorage on mount
  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    setHasCompletedTour(completed === 'true');
  }, []);
  
  const startTour = useCallback(() => {
    setIsTourActive(true);
  }, []);
  
  const completeTour = useCallback(() => {
    setIsTourActive(false);
    setHasCompletedTour(true);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  }, []);
  
  const skipTour = useCallback(() => {
    setIsTourActive(false);
    setHasCompletedTour(true);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  }, []);
  
  const resetTour = useCallback(() => {
    setHasCompletedTour(false);
    localStorage.removeItem(TOUR_STORAGE_KEY);
  }, []);
  
  return {
    hasCompletedTour,
    isTourActive,
    startTour,
    completeTour,
    skipTour,
    resetTour,
  };
}
