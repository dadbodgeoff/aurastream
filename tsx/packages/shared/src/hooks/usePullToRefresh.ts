/**
 * usePullToRefresh Hook
 * 
 * Touch gesture hook for detecting pull-to-refresh gestures on mobile devices.
 * Only activates when the container is scrolled to the top.
 * 
 * @example
 * ```tsx
 * function RefreshableList({ onRefresh }) {
 *   const { handlers, state, containerRef } = usePullToRefresh({
 *     onRefresh: async () => {
 *       await fetchData();
 *     },
 *     threshold: 80,
 *   });
 *   
 *   return (
 *     <div ref={containerRef} {...handlers}>
 *       {state.isRefreshing && <Spinner />}
 *       <ListContent />
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useRef } from 'react';
import type { TouchEvent, RefObject } from 'react';

/**
 * Default threshold in pixels for triggering a refresh
 */
const DEFAULT_THRESHOLD = 80;

/**
 * Resistance factor for pull distance (creates rubber-band effect)
 */
const RESISTANCE_FACTOR = 0.5;

/**
 * State representing the current pull-to-refresh gesture
 */
export interface PullToRefreshState {
  /** Current pull distance in pixels */
  pullDistance: number;
  /** Whether threshold has been reached */
  isTriggered: boolean;
  /** Whether refresh is in progress */
  isRefreshing: boolean;
  /** Status of the refresh operation */
  status: 'idle' | 'pulling' | 'triggered' | 'refreshing' | 'success' | 'error';
}

/**
 * Options for configuring the pull-to-refresh hook
 */
export interface UsePullToRefreshOptions {
  /** Callback fired when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Threshold in pixels to trigger refresh (default: 80) */
  threshold?: number;
  /** Whether pull-to-refresh is disabled */
  disabled?: boolean;
}

/**
 * Return type for the usePullToRefresh hook
 */
export interface UsePullToRefreshReturn {
  /** Touch event handlers to spread on the target element */
  handlers: {
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: () => void;
  };
  /** Current pull-to-refresh state */
  state: PullToRefreshState;
  /** Ref to attach to the scrollable container */
  containerRef: RefObject<HTMLDivElement>;
}

/**
 * Initial/default pull-to-refresh state
 */
const INITIAL_STATE: PullToRefreshState = {
  pullDistance: 0,
  isTriggered: false,
  isRefreshing: false,
  status: 'idle',
};

/**
 * Duration to show success/error state before resetting (ms)
 */
const FEEDBACK_DURATION = 1000;

/**
 * Hook to detect and handle pull-to-refresh gestures.
 * 
 * This hook:
 * - Only activates when container is scrolled to top (scrollTop <= 0)
 * - Tracks touch start position on touchStart
 * - Calculates vertical pull distance on touchMove with resistance
 * - Only tracks downward pulls (ignores upward movement)
 * - On touchEnd, if distance exceeds threshold, calls onRefresh callback
 * - Shows success/error feedback briefly after refresh completes
 * - Resets state after refresh completes
 * - Uses useCallback for stable handler references
 * 
 * @param options - Configuration options for the pull-to-refresh gesture
 * @returns Object containing handlers, state, and containerRef
 * 
 * @example
 * ```tsx
 * function RefreshableContent({ fetchData }) {
 *   const { handlers, state, containerRef } = usePullToRefresh({
 *     onRefresh: fetchData,
 *     threshold: 100,
 *   });
 *   
 *   return (
 *     <div 
 *       ref={containerRef} 
 *       className="overflow-auto h-full"
 *       {...handlers}
 *     >
 *       {state.pullDistance > 0 && (
 *         <div style={{ height: state.pullDistance }}>
 *           {state.isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
 *         </div>
 *       )}
 *       <Content />
 *     </div>
 *   );
 * }
 * ```
 */
export function usePullToRefresh(options: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const { onRefresh, threshold = DEFAULT_THRESHOLD, disabled = false } = options;

  // Current pull-to-refresh state
  const [state, setState] = useState<PullToRefreshState>(INITIAL_STATE);

  // Refs to track touch position and gesture state
  const startYRef = useRef<number>(0);
  const isPullingRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Check if the container is scrolled to the top
   */
  const isAtTop = useCallback((): boolean => {
    if (!containerRef.current) return true;
    return containerRef.current.scrollTop <= 0;
  }, []);

  /**
   * Handler for touch start event
   * Records the initial touch position if at top of scroll
   */
  const onTouchStart = useCallback(
    (e: TouchEvent): void => {
      if (disabled || state.isRefreshing) return;

      // Only start tracking if we're at the top of the scroll container
      if (!isAtTop()) return;

      const touch = e.touches[0];
      if (!touch) return;

      startYRef.current = touch.clientY;
      isPullingRef.current = false;
    },
    [disabled, state.isRefreshing, isAtTop]
  );

  /**
   * Handler for touch move event
   * Calculates pull distance with resistance
   */
  const onTouchMove = useCallback(
    (e: TouchEvent): void => {
      if (disabled || state.isRefreshing) return;

      const touch = e.touches[0];
      if (!touch) return;

      const deltaY = touch.clientY - startYRef.current;

      // Only track downward pulls when at top
      if (deltaY <= 0 || !isAtTop()) {
        if (isPullingRef.current) {
          // Reset if we're no longer pulling down
          isPullingRef.current = false;
          setState((prev) => ({
            ...prev,
            pullDistance: 0,
            isTriggered: false,
            status: 'idle',
          }));
        }
        return;
      }

      // Mark that we're actively pulling
      isPullingRef.current = true;

      // Apply resistance to create rubber-band effect
      const pullDistance = deltaY * RESISTANCE_FACTOR;

      // Check if threshold is reached
      const isTriggered = pullDistance >= threshold;

      setState({
        pullDistance,
        isTriggered,
        isRefreshing: false,
        status: isTriggered ? 'triggered' : 'pulling',
      });
    },
    [disabled, state.isRefreshing, threshold, isAtTop]
  );

  /**
   * Handler for touch end event
   * Triggers refresh if threshold was reached, then resets state
   */
  const onTouchEnd = useCallback(async (): Promise<void> => {
    if (disabled || state.isRefreshing) return;

    // If threshold was reached, trigger refresh
    if (state.isTriggered) {
      setState((prev) => ({
        ...prev,
        pullDistance: threshold, // Keep at threshold during refresh
        isRefreshing: true,
        status: 'refreshing',
      }));

      try {
        await onRefresh();
        
        // Show success feedback briefly
        setState((prev) => ({
          ...prev,
          status: 'success',
        }));

        // Reset after feedback duration
        setTimeout(() => {
          setState(INITIAL_STATE);
        }, FEEDBACK_DURATION);
      } catch {
        // Show error feedback briefly
        setState((prev) => ({
          ...prev,
          status: 'error',
        }));

        // Reset after feedback duration
        setTimeout(() => {
          setState(INITIAL_STATE);
        }, FEEDBACK_DURATION);
      }
    } else {
      // Reset state if threshold wasn't reached
      setState(INITIAL_STATE);
    }

    isPullingRef.current = false;
  }, [disabled, state.isRefreshing, state.isTriggered, threshold, onRefresh]);

  return {
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    state,
    containerRef,
  };
}

/**
 * Type export for consumers who need the return type
 */
export type { UsePullToRefreshReturn as UsePullToRefreshResult };
