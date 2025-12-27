/**
 * useDelayedLoading Hook
 * 
 * Prevents loading spinners from flashing for fast operations by delaying
 * the display of loading indicators until a threshold is reached.
 * 
 * This improves UX by:
 * - Not showing spinners for operations that complete quickly
 * - Preventing flicker when loading states change rapidly
 * - Optionally enforcing a minimum display duration once shown
 * 
 * @example
 * ```tsx
 * function DataLoader() {
 *   const { isLoading } = useQuery({ queryKey: ['data'], queryFn: fetchData });
 *   const showLoading = useDelayedLoading(isLoading);
 *   
 *   if (showLoading) {
 *     return <Spinner />;
 *   }
 *   
 *   return <DataDisplay />;
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // With custom delay and minimum duration
 * const showLoading = useDelayedLoading(isLoading, {
 *   delay: 300,        // Wait 300ms before showing spinner
 *   minDuration: 500,  // Show spinner for at least 500ms once shown
 * });
 * ```
 */

import { useState, useEffect, useRef } from 'react';

/**
 * Default delay before showing loading indicator (in milliseconds)
 */
const DEFAULT_DELAY = 200;

/**
 * Configuration options for the useDelayedLoading hook
 */
export interface UseDelayedLoadingOptions {
  /**
   * Delay in milliseconds before showing the loading indicator.
   * If loading completes before this delay, the indicator is never shown.
   * @default 200
   */
  delay?: number;
  
  /**
   * Minimum duration in milliseconds to show the loading indicator once shown.
   * This prevents flicker when loading completes shortly after the indicator appears.
   * @default undefined (no minimum duration)
   */
  minDuration?: number;
}

/**
 * Hook to delay showing loading indicators for fast operations.
 * 
 * This hook:
 * - Returns `false` initially, even if `isLoading` is `true`
 * - Only returns `true` after the specified delay if still loading
 * - Once shown, keeps showing until loading completes (and minDuration passes)
 * - Properly cleans up timers on unmount
 * - Handles multiple loading cycles correctly
 * 
 * @param isLoading - Whether the operation is currently loading
 * @param options - Configuration options for delay and minimum duration
 * @returns `true` if the loading indicator should be shown, `false` otherwise
 * 
 * @example
 * ```tsx
 * // Basic usage - spinner only shows if loading takes > 200ms
 * const showLoading = useDelayedLoading(isLoading);
 * 
 * // Custom delay - spinner only shows if loading takes > 500ms
 * const showLoading = useDelayedLoading(isLoading, { delay: 500 });
 * 
 * // With minimum duration - once shown, spinner stays for at least 400ms
 * const showLoading = useDelayedLoading(isLoading, { 
 *   delay: 200, 
 *   minDuration: 400 
 * });
 * ```
 */
export function useDelayedLoading(
  isLoading: boolean,
  options?: UseDelayedLoadingOptions
): boolean {
  const { delay = DEFAULT_DELAY, minDuration } = options ?? {};
  
  // Whether to show the loading indicator
  const [showLoading, setShowLoading] = useState<boolean>(false);
  
  // Track when loading indicator was first shown (for minDuration)
  const shownAtRef = useRef<number | null>(null);
  
  // Track timer IDs for cleanup
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    /**
     * Clears all active timers
     */
    const clearTimers = (): void => {
      if (delayTimerRef.current !== null) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
      if (minDurationTimerRef.current !== null) {
        clearTimeout(minDurationTimerRef.current);
        minDurationTimerRef.current = null;
      }
    };

    if (isLoading) {
      // Loading started - set up delay timer if not already showing
      if (!showLoading) {
        delayTimerRef.current = setTimeout(() => {
          setShowLoading(true);
          shownAtRef.current = Date.now();
          delayTimerRef.current = null;
        }, delay);
      }
    } else {
      // Loading finished
      clearTimers();
      
      if (showLoading) {
        // Loading indicator is currently shown
        if (minDuration !== undefined && shownAtRef.current !== null) {
          // Calculate remaining time for minimum duration
          const elapsed = Date.now() - shownAtRef.current;
          const remaining = minDuration - elapsed;
          
          if (remaining > 0) {
            // Keep showing for the remaining minimum duration
            minDurationTimerRef.current = setTimeout(() => {
              setShowLoading(false);
              shownAtRef.current = null;
              minDurationTimerRef.current = null;
            }, remaining);
          } else {
            // Minimum duration already passed, hide immediately
            setShowLoading(false);
            shownAtRef.current = null;
          }
        } else {
          // No minimum duration, hide immediately
          setShowLoading(false);
          shownAtRef.current = null;
        }
      }
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      clearTimers();
    };
  }, [isLoading, delay, minDuration, showLoading]);

  return showLoading;
}

/**
 * Type export for consumers who need the return type
 */
export type UseDelayedLoadingReturn = ReturnType<typeof useDelayedLoading>;

/**
 * Type export for the options interface
 */
export type { UseDelayedLoadingOptions as DelayedLoadingOptions };
