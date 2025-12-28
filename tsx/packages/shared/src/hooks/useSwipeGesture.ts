/**
 * useSwipeGesture Hook
 * 
 * Touch gesture hook for detecting horizontal swipe gestures on mobile devices.
 * Provides visual feedback during swipe and triggers callbacks when threshold is reached.
 * 
 * @example
 * ```tsx
 * function SwipeableCard({ onDelete, onArchive }) {
 *   const { handlers, state, style } = useSwipeGesture({
 *     onSwipe: (direction) => {
 *       if (direction === 'left') onDelete();
 *       if (direction === 'right') onArchive();
 *     },
 *     threshold: 100,
 *   });
 *   
 *   return (
 *     <div {...handlers} style={style}>
 *       <CardContent />
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useRef } from 'react';
import type { TouchEvent, CSSProperties } from 'react';

/**
 * Default threshold in pixels for triggering a swipe action
 */
const DEFAULT_THRESHOLD = 100;

/**
 * State representing the current swipe gesture
 */
export interface SwipeState {
  /** Current swipe offset in pixels */
  offset: number;
  /** Whether swipe threshold has been reached */
  isTriggered: boolean;
  /** Direction of swipe */
  direction: 'left' | 'right' | null;
}

/**
 * Options for configuring the swipe gesture hook
 */
export interface UseSwipeGestureOptions {
  /** Callback fired when swipe threshold is reached */
  onSwipe: (direction: 'left' | 'right') => void;
  /** Threshold in pixels to trigger swipe (default: 100) */
  threshold?: number;
  /** Whether swipe gestures are disabled */
  disabled?: boolean;
}

/**
 * Return type for the useSwipeGesture hook
 */
export interface UseSwipeGestureReturn {
  /** Touch event handlers to spread on the target element */
  handlers: {
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: () => void;
  };
  /** Current swipe state */
  state: SwipeState;
  /** CSS transform style for visual feedback */
  style: CSSProperties;
}

/**
 * Initial/default swipe state
 */
const INITIAL_STATE: SwipeState = {
  offset: 0,
  isTriggered: false,
  direction: null,
};

/**
 * Hook to detect and handle horizontal swipe gestures.
 * 
 * This hook:
 * - Tracks touch start position on touchStart
 * - Calculates horizontal offset on touchMove
 * - Determines if horizontal swipe (vs vertical scroll) by comparing X vs Y movement
 * - Only tracks horizontal swipes (ignores if Y movement > X movement initially)
 * - On touchEnd, if offset exceeds threshold, calls onSwipe callback
 * - Resets state after swipe completes
 * - Provides CSS transform style for visual feedback during swipe
 * - Uses useCallback for stable handler references
 * 
 * @param options - Configuration options for the swipe gesture
 * @returns Object containing handlers, state, and style for the swipeable element
 * 
 * @example
 * ```tsx
 * function SwipeableListItem({ item, onDelete }) {
 *   const { handlers, state, style } = useSwipeGesture({
 *     onSwipe: (direction) => {
 *       if (direction === 'left') {
 *         onDelete(item.id);
 *       }
 *     },
 *     threshold: 80,
 *   });
 *   
 *   return (
 *     <li {...handlers} style={{ ...style, transition: state.offset === 0 ? 'transform 0.2s' : 'none' }}>
 *       {item.name}
 *     </li>
 *   );
 * }
 * ```
 */
export function useSwipeGesture(options: UseSwipeGestureOptions): UseSwipeGestureReturn {
  const { onSwipe, threshold = DEFAULT_THRESHOLD, disabled = false } = options;

  // Current swipe state
  const [state, setState] = useState<SwipeState>(INITIAL_STATE);

  // Refs to track touch position and gesture type
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  /**
   * Handler for touch start event
   * Records the initial touch position
   */
  const onTouchStart = useCallback(
    (e: TouchEvent): void => {
      if (disabled) return;

      const touch = e.touches[0];
      if (!touch) return;

      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      isHorizontalSwipeRef.current = null; // Reset gesture type detection
    },
    [disabled]
  );

  /**
   * Handler for touch move event
   * Calculates offset and determines swipe direction
   */
  const onTouchMove = useCallback(
    (e: TouchEvent): void => {
      if (disabled) return;

      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;

      // Determine if this is a horizontal or vertical gesture on first significant movement
      if (isHorizontalSwipeRef.current === null) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // Need some movement to determine direction
        if (absX < 5 && absY < 5) return;

        // If vertical movement is greater, this is a scroll, not a swipe
        isHorizontalSwipeRef.current = absX > absY;
      }

      // Only track horizontal swipes
      if (!isHorizontalSwipeRef.current) return;

      // Calculate swipe direction
      const direction: 'left' | 'right' | null = deltaX < 0 ? 'left' : deltaX > 0 ? 'right' : null;

      // Check if threshold is reached
      const isTriggered = Math.abs(deltaX) >= threshold;

      setState({
        offset: deltaX,
        isTriggered,
        direction,
      });
    },
    [disabled, threshold]
  );

  /**
   * Handler for touch end event
   * Triggers swipe callback if threshold was reached, then resets state
   */
  const onTouchEnd = useCallback((): void => {
    if (disabled) {
      setState(INITIAL_STATE);
      return;
    }

    // If threshold was reached and we have a direction, trigger the callback
    if (state.isTriggered && state.direction) {
      onSwipe(state.direction);
    }

    // Reset state
    setState(INITIAL_STATE);
    isHorizontalSwipeRef.current = null;
  }, [disabled, state.isTriggered, state.direction, onSwipe]);

  /**
   * CSS style for visual feedback during swipe
   * Applies transform and opacity based on current offset
   */
  const style: CSSProperties = {
    transform: `translateX(${state.offset}px)`,
    opacity: 1 - Math.abs(state.offset) / (threshold * 2),
  };

  return {
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    state,
    style,
  };
}

/**
 * Type export for consumers who need the return type
 */
export type { UseSwipeGestureReturn as UseSwipeGestureResult };
