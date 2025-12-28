/**
 * useLongPress Hook
 * 
 * Touch gesture hook for detecting long-press gestures on mobile devices.
 * Also supports right-click (context menu) on desktop for consistent UX.
 * Provides position tracking for menu placement.
 * 
 * @example
 * ```tsx
 * function LongPressableCard({ onShowMenu }) {
 *   const { handlers, state } = useLongPress({
 *     onLongPress: (position) => {
 *       onShowMenu(position);
 *     },
 *     duration: 500,
 *   });
 *   
 *   return (
 *     <div {...handlers}>
 *       <CardContent />
 *       {state.isLongPressing && (
 *         <ContextMenu position={state.position} />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { TouchEvent, MouseEvent } from 'react';

/**
 * Default duration in milliseconds to trigger a long press
 */
const DEFAULT_DURATION = 500;

/**
 * Default movement threshold in pixels to cancel long press
 */
const DEFAULT_MOVE_THRESHOLD = 10;

/**
 * Position coordinates for menu placement
 */
export interface LongPressPosition {
  x: number;
  y: number;
}

/**
 * State representing the current long press gesture
 */
export interface LongPressState {
  /** Whether long press is currently active */
  isLongPressing: boolean;
  /** Position where long press started (for menu placement) */
  position: LongPressPosition | null;
}

/**
 * Options for configuring the long press hook
 */
export interface UseLongPressOptions {
  /** Callback fired when long press is triggered */
  onLongPress: (position: LongPressPosition) => void;
  /** Duration in ms to trigger long press (default: 500) */
  duration?: number;
  /** Movement threshold to cancel in pixels (default: 10) */
  moveThreshold?: number;
  /** Whether long press is disabled */
  disabled?: boolean;
}

/**
 * Return type for the useLongPress hook
 */
export interface UseLongPressReturn {
  /** Event handlers to spread on the target element */
  handlers: {
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: () => void;
    onContextMenu: (e: MouseEvent) => void;
  };
  /** Current long press state */
  state: LongPressState;
  /** Reset the long press state (useful after handling the long press) */
  reset: () => void;
}

/**
 * Initial/default long press state
 */
const INITIAL_STATE: LongPressState = {
  isLongPressing: false,
  position: null,
};

/**
 * Hook to detect and handle long press gestures.
 * 
 * This hook:
 * - Starts a timer on touchStart
 * - Cancels the timer if finger moves beyond threshold on touchMove
 * - Cancels the timer on touchEnd if not yet triggered
 * - Triggers onLongPress callback when timer fires
 * - Supports right-click (contextmenu) on desktop for consistent UX
 * - Tracks press position for context menu placement
 * - Uses useCallback for stable handler references
 * - Cleans up timer on unmount
 * - SSR-safe implementation
 * 
 * @param options - Configuration options for the long press gesture
 * @returns Object containing handlers, state, and reset function
 * 
 * @example
 * ```tsx
 * function AssetCard({ asset, onShowActions }) {
 *   const { handlers, state, reset } = useLongPress({
 *     onLongPress: (position) => {
 *       onShowActions(asset.id, position);
 *     },
 *     duration: 400,
 *     moveThreshold: 15,
 *   });
 *   
 *   // Reset when menu closes
 *   useEffect(() => {
 *     if (!menuOpen) reset();
 *   }, [menuOpen, reset]);
 *   
 *   return (
 *     <div {...handlers} className="asset-card">
 *       <img src={asset.url} alt={asset.name} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useLongPress(options: UseLongPressOptions): UseLongPressReturn {
  const {
    onLongPress,
    duration = DEFAULT_DURATION,
    moveThreshold = DEFAULT_MOVE_THRESHOLD,
    disabled = false,
  } = options;

  // Current long press state
  const [state, setState] = useState<LongPressState>(INITIAL_STATE);

  // Refs for tracking touch position and timer
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPositionRef = useRef<LongPressPosition | null>(null);

  /**
   * Clear the long press timer
   */
  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * Reset the long press state
   */
  const reset = useCallback((): void => {
    clearTimer();
    setState(INITIAL_STATE);
    startPositionRef.current = null;
  }, [clearTimer]);

  /**
   * Trigger the long press callback
   */
  const triggerLongPress = useCallback(
    (position: LongPressPosition): void => {
      setState({
        isLongPressing: true,
        position,
      });
      onLongPress(position);
    },
    [onLongPress]
  );

  /**
   * Handler for touch start event
   * Records the initial touch position and starts the timer
   */
  const onTouchStart = useCallback(
    (e: TouchEvent): void => {
      if (disabled) return;

      const touch = e.touches[0];
      if (!touch) return;

      const position: LongPressPosition = {
        x: touch.clientX,
        y: touch.clientY,
      };

      startPositionRef.current = position;

      // Clear any existing timer
      clearTimer();

      // Start the long press timer
      timerRef.current = setTimeout(() => {
        triggerLongPress(position);
      }, duration);
    },
    [disabled, duration, clearTimer, triggerLongPress]
  );

  /**
   * Handler for touch move event
   * Cancels the timer if movement exceeds threshold
   */
  const onTouchMove = useCallback(
    (e: TouchEvent): void => {
      if (disabled || !startPositionRef.current) return;

      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = Math.abs(touch.clientX - startPositionRef.current.x);
      const deltaY = Math.abs(touch.clientY - startPositionRef.current.y);

      // If movement exceeds threshold, cancel the long press
      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        clearTimer();
      }
    },
    [disabled, moveThreshold, clearTimer]
  );

  /**
   * Handler for touch end event
   * Cancels the timer if still running
   */
  const onTouchEnd = useCallback((): void => {
    clearTimer();
  }, [clearTimer]);

  /**
   * Handler for context menu event (desktop right-click)
   * Prevents default and triggers long press callback
   */
  const onContextMenu = useCallback(
    (e: MouseEvent): void => {
      if (disabled) return;

      // Prevent the default context menu
      e.preventDefault();

      const position: LongPressPosition = {
        x: e.clientX,
        y: e.clientY,
      };

      triggerLongPress(position);
    },
    [disabled, triggerLongPress]
  );

  /**
   * Cleanup timer on unmount
   */
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onContextMenu,
    },
    state,
    reset,
  };
}

/**
 * Type export for consumers who need the return type
 */
export type { UseLongPressReturn as UseLongPressResult };
