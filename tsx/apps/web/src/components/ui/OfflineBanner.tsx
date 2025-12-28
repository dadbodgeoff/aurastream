'use client';

/**
 * OfflineBanner Component
 *
 * A persistent banner that displays when the user loses network connectivity.
 * Shows a dismissible offline notification and displays a brief toast when
 * connectivity is restored.
 *
 * Features:
 * - Integrates with useNetworkStatus hook for real-time connectivity detection
 * - Dismissible banner that reappears on next offline event
 * - "Back online" toast notification on reconnection
 * - Configurable position (top or bottom of viewport)
 * - Respects reduced motion preferences for animations
 * - Accessible with proper ARIA attributes
 *
 * @module ui/OfflineBanner
 *
 * @example
 * ```tsx
 * // Basic usage in layout.tsx
 * import { OfflineBanner } from '@/components/ui/OfflineBanner';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <OfflineBanner />
 *         {children}
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom messages and position
 * <OfflineBanner
 *   offlineMessage="No internet connection. Working in offline mode."
 *   reconnectedMessage="Connection restored!"
 *   reconnectedDuration={3000}
 *   position="bottom"
 * />
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkStatus, useReducedMotion } from '@aurastream/shared';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the OfflineBanner component.
 */
export interface OfflineBannerProps {
  /**
   * Custom message to display when offline.
   * @default "You're offline. Some features may be unavailable."
   */
  offlineMessage?: string;

  /**
   * Custom message to display in the toast when reconnected.
   * @default "Back online!"
   */
  reconnectedMessage?: string;

  /**
   * Duration in milliseconds to show the reconnected toast.
   * @default 3000
   */
  reconnectedDuration?: number;

  /**
   * Position of the banner on the viewport.
   * @default 'top'
   */
  position?: 'top' | 'bottom';

  /**
   * Additional CSS class names to apply to the banner.
   */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default offline message */
const DEFAULT_OFFLINE_MESSAGE = "You're offline. Some features may be unavailable.";

/** Default reconnected message */
const DEFAULT_RECONNECTED_MESSAGE = 'Back online!';

/** Default duration for reconnected toast (ms) */
const DEFAULT_RECONNECTED_DURATION = 3000;

// ============================================================================
// Component
// ============================================================================

/**
 * OfflineBanner displays a persistent notification when the user loses
 * network connectivity and shows a toast when connectivity is restored.
 *
 * The banner can be dismissed by the user, but will reappear if the
 * connection is lost again. The reconnection toast is shown automatically
 * when the network status changes from offline to online.
 *
 * @param props - Component props
 * @returns The OfflineBanner component or null if online and not showing
 *
 * @example
 * ```tsx
 * // In your root layout
 * <OfflineBanner />
 * ```
 */
export function OfflineBanner({
  offlineMessage = DEFAULT_OFFLINE_MESSAGE,
  reconnectedMessage = DEFAULT_RECONNECTED_MESSAGE,
  reconnectedDuration = DEFAULT_RECONNECTED_DURATION,
  position = 'top',
  className,
}: OfflineBannerProps): JSX.Element | null {
  // Track network status
  const { isOnline, hasChanged } = useNetworkStatus();

  // Track if user has dismissed the banner
  const [isDismissed, setIsDismissed] = useState(false);

  // Track if banner is animating out
  const [isExiting, setIsExiting] = useState(false);

  // Track previous online state to detect transitions
  const wasOnlineRef = useRef<boolean | null>(null);

  // Check for reduced motion preference
  const prefersReducedMotion = useReducedMotion();

  // Reset dismissed state when going offline again
  useEffect(() => {
    if (!isOnline) {
      setIsDismissed(false);
      setIsExiting(false);
    }
  }, [isOnline]);

  // Show toast when coming back online
  useEffect(() => {
    // Only show toast if:
    // 1. Status has changed (hasChanged is true)
    // 2. We're now online
    // 3. We were previously offline (wasOnlineRef.current === false)
    if (hasChanged && isOnline && wasOnlineRef.current === false) {
      toast.success(reconnectedMessage, {
        duration: reconnectedDuration,
      });
    }

    // Update the ref to track current state for next comparison
    wasOnlineRef.current = isOnline;
  }, [isOnline, hasChanged, reconnectedMessage, reconnectedDuration]);

  /**
   * Handle dismiss button click.
   * Triggers exit animation before hiding the banner.
   */
  const handleDismiss = useCallback(() => {
    if (prefersReducedMotion) {
      // Skip animation if reduced motion is preferred
      setIsDismissed(true);
    } else {
      // Trigger exit animation
      setIsExiting(true);
      // Hide after animation completes
      setTimeout(() => {
        setIsDismissed(true);
        setIsExiting(false);
      }, 300);
    }
  }, [prefersReducedMotion]);

  /**
   * Handle keyboard events for accessibility.
   * Allows dismissing with Enter or Space keys.
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleDismiss();
      }
    },
    [handleDismiss]
  );

  // Don't render if online or dismissed
  if (isOnline || isDismissed) {
    return null;
  }

  // Position classes
  const positionClasses = position === 'top' ? 'top-0' : 'bottom-0';

  // Animation classes based on position and state
  const getAnimationClasses = (): string => {
    if (prefersReducedMotion) {
      return '';
    }

    // Use existing animation classes from globals.css
    // animate-slide-in-down for top position (slides down from top)
    // animate-slide-in-up for bottom position (slides up from bottom)
    const enterAnimation = position === 'top' ? 'animate-slide-in-down' : 'animate-slide-in-up';
    const exitTransform = position === 'top' ? '-translate-y-full' : 'translate-y-full';

    if (isExiting) {
      return `transition-all duration-300 ease-in-out opacity-0 ${exitTransform}`;
    }

    return `transition-all duration-300 ease-out ${enterAnimation}`;
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        // Base positioning
        'fixed left-0 right-0 z-50',
        positionClasses,
        // Padding and layout
        'px-4 py-3',
        // Background and visual styling
        'bg-amber-500/90 backdrop-blur-sm',
        // Animation
        getAnimationClasses(),
        // Custom classes
        className
      )}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Offline icon and message */}
        <div className="flex items-center gap-3">
          {/* Offline icon */}
          <svg
            className="w-5 h-5 text-white flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>

          {/* Message text */}
          <span className="text-white font-medium text-sm">{offlineMessage}</span>
        </div>

        {/* Dismiss button - 44x44px touch target for accessibility */}
        <button
          type="button"
          onClick={handleDismiss}
          onKeyDown={handleKeyDown}
          className={cn(
            // Size and layout - 44x44px touch target
            'flex items-center justify-center w-11 h-11 -mr-2',
            // Visual styling
            'rounded-lg',
            'text-white/80 hover:text-white',
            // Interaction states
            'hover:bg-white/10',
            'active:bg-white/20 active:scale-95',
            // Focus styles for accessibility
            'focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-amber-500',
            // Transition
            'transition-all duration-150'
          )}
          aria-label="Dismiss offline notification"
        >
          {/* X icon */}
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

OfflineBanner.displayName = 'OfflineBanner';

export default OfflineBanner;
