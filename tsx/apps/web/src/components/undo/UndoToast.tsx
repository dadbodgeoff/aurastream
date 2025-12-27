/**
 * Undo Toast Component
 *
 * Displays undo notifications with countdown timer for destructive actions.
 * Provides a safety net allowing users to reverse recent deletions.
 *
 * Features:
 * - Countdown timer (default 5 seconds)
 * - "Undo" button to restore deleted items
 * - Auto-dismisses when timer expires
 * - Stacks multiple undo actions
 * - Respects reduced motion preference
 *
 * @module components/undo/UndoToast
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  useUndoStore,
  type UndoAction,
  getRemainingTime,
  DEFAULT_UNDO_TIMEOUT,
} from '@aurastream/shared';
import { useReducedMotion } from '@aurastream/shared';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the UndoToastItem component
 */
export interface UndoToastItemProps {
  /** The undo action to display */
  action: UndoAction;
  /** Callback when the undo button is clicked */
  onUndo: (id: string) => void;
  /** Callback when the toast should be dismissed */
  onDismiss: (id: string) => void;
}

/**
 * Props for the UndoToastContainer component
 */
export interface UndoToastContainerProps {
  /** Maximum number of visible toasts (default: 3) */
  maxVisible?: number;
  /** Position of the toast container */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// ============================================================================
// Constants
// ============================================================================

/** Update interval for countdown timer in milliseconds */
const COUNTDOWN_INTERVAL = 100;

/** Animation duration for enter/exit transitions */
const ANIMATION_DURATION = 300;

// ============================================================================
// UndoToastItem Component
// ============================================================================

/**
 * Individual undo toast notification component.
 *
 * Displays a countdown timer and undo button for a single action.
 */
export function UndoToastItem({
  action,
  onUndo,
  onDismiss,
}: UndoToastItemProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const [remainingTime, setRemainingTime] = useState(() =>
    getRemainingTime(action)
  );
  const [isExiting, setIsExiting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update countdown timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const remaining = getRemainingTime(action);
      setRemainingTime(remaining);

      if (remaining <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        handleDismiss();
      }
    }, COUNTDOWN_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [action]);

  // Handle dismiss with animation
  const handleDismiss = useCallback(() => {
    if (isExiting) return;

    setIsExiting(true);

    if (prefersReducedMotion) {
      onDismiss(action.id);
    } else {
      setTimeout(() => {
        onDismiss(action.id);
      }, ANIMATION_DURATION);
    }
  }, [action.id, isExiting, onDismiss, prefersReducedMotion]);

  // Handle undo click
  const handleUndo = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      onUndo(action.id);
    },
    [action.id, onUndo]
  );

  // Handle keyboard interaction
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    },
    [handleDismiss]
  );

  // Calculate progress percentage
  const progress = (remainingTime / DEFAULT_UNDO_TIMEOUT) * 100;
  const secondsRemaining = Math.ceil(remainingTime / 1000);

  // Build animation classes
  const animationClasses = prefersReducedMotion
    ? ''
    : cn(
        'transition-all duration-300 ease-out',
        isExiting
          ? 'opacity-0 translate-x-full'
          : 'opacity-100 translate-x-0 animate-slide-in-right'
      );

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        // Base styles
        'relative flex items-center gap-3 p-4 rounded-lg overflow-hidden',
        'bg-background-surface/95 backdrop-blur-sm',
        'shadow-lg border border-border-subtle',
        // Animation
        animationClasses,
        // Focus styles
        'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:ring-offset-2'
      )}
      style={{
        minWidth: '320px',
        maxWidth: '420px',
      }}
    >
      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-1 bg-interactive-500 transition-all duration-100"
        style={{ width: `${progress}%` }}
        aria-hidden="true"
      />

      {/* Icon */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-yellow-500/10 text-yellow-500"
        aria-hidden="true"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{action.label}</p>
        <p className="text-xs text-text-secondary mt-0.5">
          {secondsRemaining}s to undo
        </p>
      </div>

      {/* Undo button */}
      <button
        type="button"
        onClick={handleUndo}
        className={cn(
          'flex-shrink-0 px-3 py-1.5 rounded-md',
          'text-sm font-medium',
          'bg-interactive-500 text-white',
          'hover:bg-interactive-600',
          'active:bg-interactive-700 active:scale-95',
          'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:ring-offset-2',
          'transition-all duration-75'
        )}
      >
        Undo
      </button>

      {/* Close button - 44x44px touch target */}
      <button
        type="button"
        onClick={handleDismiss}
        className={cn(
          'flex-shrink-0 flex items-center justify-center w-11 h-11 -mr-2',
          'rounded-lg',
          'text-text-tertiary hover:text-text-primary',
          'hover:bg-background-elevated',
          'active:bg-background-elevated active:scale-95',
          'focus:outline-none focus:ring-2 focus:ring-interactive-500',
          'transition-all duration-75'
        )}
        aria-label="Dismiss"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

UndoToastItem.displayName = 'UndoToastItem';

// ============================================================================
// UndoToastContainer Component
// ============================================================================

/**
 * Container component for rendering and managing undo toast notifications.
 *
 * Place this component once at the root of your application (e.g., in layout.tsx).
 *
 * @example
 * ```tsx
 * // In your root layout
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <UndoToastContainer />
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function UndoToastContainer({
  maxVisible = 3,
  position = 'bottom-left',
}: UndoToastContainerProps = {}): JSX.Element | null {
  const actions = useUndoStore((state) => state.actions);
  const executeUndo = useUndoStore((state) => state.executeUndo);
  const removeAction = useUndoStore((state) => state.removeAction);
  const clearExpired = useUndoStore((state) => state.clearExpired);

  // Periodically clear expired actions
  useEffect(() => {
    const interval = setInterval(() => {
      clearExpired();
    }, 1000);

    return () => clearInterval(interval);
  }, [clearExpired]);

  // Handle undo
  const handleUndo = useCallback(
    async (id: string) => {
      try {
        await executeUndo(id);
      } catch (error) {
        console.error('Failed to undo action:', error);
      }
    },
    [executeUndo]
  );

  // Handle dismiss
  const handleDismiss = useCallback(
    (id: string) => {
      removeAction(id);
    },
    [removeAction]
  );

  // Get visible actions (limited by maxVisible)
  const visibleActions = actions.slice(0, maxVisible);

  // Position classes
  const positionClasses: Record<typeof position, string> = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-2',
        positionClasses[position]
      )}
      aria-label="Undo notifications"
    >
      {visibleActions.map((action) => (
        <UndoToastItem
          key={action.id}
          action={action}
          onUndo={handleUndo}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
}

UndoToastContainer.displayName = 'UndoToastContainer';

export default UndoToastContainer;
