/**
 * Celebration overlay component that displays achievements and rewards.
 * Subscribes to the polish store for celebration state management.
 *
 * Features:
 * - Full-screen overlay with backdrop blur
 * - Rarity-based styling and confetti
 * - Queue indicator for pending celebrations
 * - Skip button for dismissal
 * - Auto-dismiss after duration
 * - Keyboard accessibility (Escape to dismiss)
 * - Focus trap for accessibility
 *
 * @module celebrations/CelebrationOverlay
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  usePolishStore,
  getCelebrationDuration,
  RARITY_CONFIG,
  useReducedMotion,
} from '@aurastream/shared';
import type { RarityTier } from '@aurastream/shared';
import { cn } from '@/lib/utils';
import { Confetti } from './Confetti';

/**
 * Props for the CelebrationOverlay component.
 */
export interface CelebrationOverlayProps {
  /** Additional CSS classes to apply to the overlay */
  className?: string;
}

/**
 * Get confetti colors based on rarity tier.
 *
 * @param rarity - The rarity tier
 * @returns Array of hex color strings
 */
function getConfettiColors(rarity: RarityTier): string[] {
  const config = RARITY_CONFIG[rarity];
  const baseColor = config.colors.solid;

  // Generate a palette based on the rarity
  switch (rarity) {
    case 'common':
      return ['#9CA3AF', '#6B7280', '#D1D5DB', '#E5E7EB'];
    case 'rare':
      return ['#32B8C6', '#21808D', '#66BDC3', '#99D3D7'];
    case 'epic':
      return ['#66BDC3', '#21808D', '#99D3D7', '#CCE9EB'];
    case 'legendary':
      return ['#FBBF24', '#F59E0B', '#FCD34D', '#FDE68A', '#FB923C'];
    case 'mythic':
      return ['#EC4899', '#21808D', '#06B6D4', '#F472B6', '#32B8C6', '#22D3EE'];
    default:
      return [baseColor];
  }
}

/**
 * Get the particle count based on rarity tier.
 *
 * @param rarity - The rarity tier
 * @returns Number of confetti particles
 */
function getParticleCount(rarity: RarityTier): number {
  return RARITY_CONFIG[rarity].particleCount;
}

/**
 * CelebrationOverlay - Full-screen celebration display component.
 *
 * Displays celebrations from the polish store queue with rarity-based
 * styling, confetti effects, and auto-dismiss functionality.
 *
 * @example
 * ```tsx
 * // Add to your app layout
 * <CelebrationOverlay />
 *
 * // With custom styling
 * <CelebrationOverlay className="z-[100]" />
 * ```
 */
export function CelebrationOverlay({
  className,
}: CelebrationOverlayProps = {}): JSX.Element | null {
  const overlayRef = useRef<HTMLDivElement>(null);
  const skipButtonRef = useRef<HTMLButtonElement>(null);
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Subscribe to polish store
  const currentCelebration = usePolishStore((state) => state.currentCelebration);
  const isShowingCelebration = usePolishStore((state) => state.isShowingCelebration);
  const celebrationQueue = usePolishStore((state) => state.celebrationQueue);
  const dismissCelebration = usePolishStore((state) => state.dismissCelebration);

  const queueCount = celebrationQueue.length;

  /**
   * Handle skip/dismiss button click.
   */
  const handleSkip = useCallback(() => {
    dismissCelebration();
  }, [dismissCelebration]);

  /**
   * Handle keyboard events for accessibility.
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isShowingCelebration) {
        event.preventDefault();
        handleSkip();
      }
    },
    [isShowingCelebration, handleSkip]
  );

  /**
   * Set up auto-dismiss timer when celebration is shown.
   */
  useEffect(() => {
    if (!currentCelebration || !isShowingCelebration) {
      return;
    }

    const duration = getCelebrationDuration(currentCelebration);

    // Clear any existing timer
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
    }

    // Set up auto-dismiss
    autoDismissTimerRef.current = setTimeout(() => {
      dismissCelebration();
    }, duration);

    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = null;
      }
    };
  }, [currentCelebration, isShowingCelebration, dismissCelebration]);

  /**
   * Set up keyboard event listener.
   */
  useEffect(() => {
    if (isShowingCelebration) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isShowingCelebration, handleKeyDown]);

  /**
   * Focus management for accessibility.
   */
  useEffect(() => {
    if (isShowingCelebration && skipButtonRef.current) {
      // Focus the skip button when overlay appears
      skipButtonRef.current.focus();
    }
  }, [isShowingCelebration]);

  // Don't render if no celebration is showing
  if (!isShowingCelebration || !currentCelebration) {
    return null;
  }

  const { title, description, rarity, type } = currentCelebration;
  const rarityConfig = RARITY_CONFIG[rarity];
  const confettiColors = getConfettiColors(rarity);
  const particleCount = getParticleCount(rarity);

  // Determine if we should show confetti (skip for common rarity or reduced motion)
  const showConfetti = rarity !== 'common' && !prefersReducedMotion;

  return (
    <div
      ref={overlayRef}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-black/60 backdrop-blur-sm',
        'animate-fade-in motion-reduce:animate-none',
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
      aria-describedby={description ? 'celebration-description' : undefined}
      data-testid="celebration-overlay"
    >
      {/* Confetti layer (behind the card) */}
      {showConfetti && (
        <Confetti
          particleCount={particleCount}
          colors={confettiColors}
          duration={getCelebrationDuration(currentCelebration)}
        />
      )}

      {/* Skip button in corner */}
      <button
        ref={skipButtonRef}
        onClick={handleSkip}
        className={cn(
          'absolute top-4 right-4 z-60',
          'px-4 py-2 rounded-lg',
          'bg-white/10 hover:bg-white/20',
          'text-white/80 hover:text-white',
          'text-sm font-medium',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent'
        )}
        aria-label="Skip celebration"
        data-testid="celebration-skip-button"
      >
        Skip
      </button>

      {/* Queue indicator */}
      {queueCount > 0 && (
        <div
          className={cn(
            'absolute top-4 left-4 z-60',
            'px-3 py-1.5 rounded-full',
            'bg-white/10 backdrop-blur-sm',
            'text-white/70 text-sm font-medium'
          )}
          aria-label={`${queueCount} more celebration${queueCount > 1 ? 's' : ''} pending`}
          data-testid="celebration-queue-indicator"
        >
          +{queueCount} more
        </div>
      )}

      {/* Celebration card */}
      <div
        className={cn(
          'relative z-50 max-w-md w-full mx-4',
          'p-8 rounded-2xl',
          'bg-background-surface/90 backdrop-blur-md',
          'border-2',
          rarityConfig.colors.border,
          'shadow-2xl',
          'animate-scale-in motion-reduce:animate-none'
        )}
        style={{
          boxShadow: `0 0 60px ${rarityConfig.colors.glow}, 0 0 120px ${rarityConfig.colors.glow}`,
        }}
        data-testid="celebration-card"
      >
        {/* Rarity glow effect */}
        <div
          className={cn(
            'absolute inset-0 rounded-2xl opacity-20 pointer-events-none',
            `bg-gradient-to-br ${rarityConfig.colors.gradient}`
          )}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative z-10 text-center">
          {/* Celebration type icon/badge */}
          <div
            className={cn(
              'inline-flex items-center justify-center',
              'w-16 h-16 mb-4 rounded-full',
              `bg-gradient-to-br ${rarityConfig.colors.gradient}`,
              'shadow-lg'
            )}
            aria-hidden="true"
          >
            {getCelebrationIcon(type)}
          </div>

          {/* Rarity badge */}
          <div
            className={cn(
              'inline-block px-3 py-1 mb-3 rounded-full',
              'text-xs font-bold uppercase tracking-wider',
              `bg-gradient-to-r ${rarityConfig.colors.gradient}`,
              'text-white'
            )}
            data-testid="celebration-rarity-badge"
          >
            {rarityConfig.label}
          </div>

          {/* Title */}
          <h2
            id="celebration-title"
            className={cn(
              'text-2xl font-bold mb-2',
              'text-text-primary'
            )}
          >
            {title}
          </h2>

          {/* Description */}
          {description && (
            <p
              id="celebration-description"
              className="text-text-secondary text-base"
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Get the icon for a celebration type.
 *
 * @param type - The celebration type
 * @returns JSX element for the icon
 */
function getCelebrationIcon(type: string): JSX.Element {
  switch (type) {
    case 'achievement':
      return (
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'milestone':
      return (
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
          />
        </svg>
      );
    case 'reward':
      return (
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'levelUp':
      return (
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      );
    case 'custom':
    default:
      return (
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
      );
  }
}

export default CelebrationOverlay;
