/**
 * Toast Notification System
 * 
 * A comprehensive toast notification system with auto-dismiss,
 * rarity-based styling, and an imperative API.
 * 
 * @module ui/Toast
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { create } from 'zustand';
import { cn } from '@/lib/utils';
import { useReducedMotion, useSwipeGesture, type RarityTier, RARITY_CONFIG } from '@aurastream/shared';

// ============================================================================
// Types
// ============================================================================

/**
 * Available toast variants for different notification types.
 */
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

/**
 * Action button configuration for toasts.
 */
export interface ToastAction {
  /** Button label text */
  label: string;
  /** Click handler for the action */
  onClick: () => void;
}

/**
 * Options for creating a toast notification.
 */
export interface ToastOptions {
  /** Main title text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Visual variant (success, error, warning, info) */
  variant?: ToastVariant;
  /** Optional rarity tier for special styling */
  rarity?: RarityTier;
  /** Auto-dismiss duration in milliseconds (default: 5000) */
  duration?: number;
  /** Optional action button */
  action?: ToastAction;
}

/**
 * Internal toast data structure with unique ID.
 */
export interface ToastData extends Required<Pick<ToastOptions, 'title' | 'variant'>> {
  /** Unique identifier for the toast */
  id: string;
  /** Optional description text */
  description?: string;
  /** Optional rarity tier for special styling */
  rarity?: RarityTier;
  /** Auto-dismiss duration in milliseconds */
  duration: number;
  /** Optional action button */
  action?: ToastAction;
  /** Timestamp when toast was created */
  createdAt: number;
  /** Whether the toast is currently exiting */
  isExiting: boolean;
}

/**
 * Props for the Toast component.
 */
export interface ToastProps {
  /** Toast data to render */
  toast: ToastData;
  /** Callback when toast should be dismissed */
  onDismiss: (id: string) => void;
}

/**
 * Props for the ToastContainer component.
 */
export interface ToastContainerProps {
  /** Maximum number of visible toasts (default: 5) */
  maxVisible?: number;
  /** Position of the toast container */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// ============================================================================
// Constants
// ============================================================================

/** Default auto-dismiss duration in milliseconds */
const DEFAULT_DURATION = 5000;

/** Maximum number of visible toasts */
const MAX_VISIBLE_TOASTS = 5;

/** Animation duration for enter/exit transitions */
const ANIMATION_DURATION = 300;

/**
 * Variant-specific styling configuration.
 */
const VARIANT_CONFIG: Record<ToastVariant, {
  icon: string;
  borderColor: string;
  iconColor: string;
  bgColor: string;
}> = {
  success: {
    icon: '✓',
    borderColor: 'border-l-green-500',
    iconColor: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  error: {
    icon: '✕',
    borderColor: 'border-l-red-500',
    iconColor: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  warning: {
    icon: '⚠',
    borderColor: 'border-l-yellow-500',
    iconColor: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  info: {
    icon: 'ℹ',
    borderColor: 'border-l-blue-500',
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
};

// ============================================================================
// Zustand Store
// ============================================================================

interface ToastStore {
  /** Array of active toasts */
  toasts: ToastData[];
  /** Add a new toast */
  addToast: (options: ToastOptions) => string;
  /** Remove a toast by ID */
  removeToast: (id: string) => void;
  /** Mark a toast as exiting (for animation) */
  setExiting: (id: string) => void;
  /** Remove all toasts */
  clearAll: () => void;
}

/**
 * Generate a unique ID for toasts.
 */
function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Internal Zustand store for toast state management.
 */
const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (options: ToastOptions): string => {
    const id = generateId();
    const newToast: ToastData = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant ?? 'info',
      rarity: options.rarity,
      duration: options.duration ?? DEFAULT_DURATION,
      action: options.action,
      createdAt: Date.now(),
      isExiting: false,
    };

    set((state) => {
      // FIFO queue - remove oldest if at max capacity
      const toasts = [...state.toasts, newToast];
      if (toasts.length > MAX_VISIBLE_TOASTS) {
        return { toasts: toasts.slice(-MAX_VISIBLE_TOASTS) };
      }
      return { toasts };
    });

    return id;
  },

  removeToast: (id: string): void => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  setExiting: (id: string): void => {
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, isExiting: true } : t
      ),
    }));
  },

  clearAll: (): void => {
    set({ toasts: [] });
  },
}));

// ============================================================================
// Imperative API
// ============================================================================

/**
 * Imperative toast API for showing notifications from anywhere in the app.
 * 
 * @example
 * ```tsx
 * // Show a success toast
 * toast.success('Profile updated!');
 * 
 * // Show an error with description
 * toast.error('Upload failed', {
 *   description: 'Please try again later',
 * });
 * 
 * // Show a toast with rarity styling
 * toast.success('Achievement unlocked!', {
 *   rarity: 'legendary',
 *   description: 'You earned the "First Asset" badge',
 * });
 * 
 * // Show a toast with action
 * toast.info('New update available', {
 *   action: {
 *     label: 'Refresh',
 *     onClick: () => window.location.reload(),
 *   },
 * });
 * ```
 */
export const toast = {
  /**
   * Show a toast with full options.
   * @param options - Toast configuration options
   * @returns The unique ID of the created toast
   */
  show: (options: ToastOptions): string => {
    return useToastStore.getState().addToast(options);
  },

  /**
   * Show a success toast.
   * @param title - Toast title
   * @param options - Additional options
   * @returns The unique ID of the created toast
   */
  success: (title: string, options?: Partial<Omit<ToastOptions, 'title' | 'variant'>>): string => {
    return useToastStore.getState().addToast({
      ...options,
      title,
      variant: 'success',
    });
  },

  /**
   * Show an error toast.
   * @param title - Toast title
   * @param options - Additional options
   * @returns The unique ID of the created toast
   */
  error: (title: string, options?: Partial<Omit<ToastOptions, 'title' | 'variant'>>): string => {
    return useToastStore.getState().addToast({
      ...options,
      title,
      variant: 'error',
    });
  },

  /**
   * Show a warning toast.
   * @param title - Toast title
   * @param options - Additional options
   * @returns The unique ID of the created toast
   */
  warning: (title: string, options?: Partial<Omit<ToastOptions, 'title' | 'variant'>>): string => {
    return useToastStore.getState().addToast({
      ...options,
      title,
      variant: 'warning',
    });
  },

  /**
   * Show an info toast.
   * @param title - Toast title
   * @param options - Additional options
   * @returns The unique ID of the created toast
   */
  info: (title: string, options?: Partial<Omit<ToastOptions, 'title' | 'variant'>>): string => {
    return useToastStore.getState().addToast({
      ...options,
      title,
      variant: 'info',
    });
  },

  /**
   * Dismiss a specific toast by ID.
   * @param id - The toast ID to dismiss
   */
  dismiss: (id: string): void => {
    const store = useToastStore.getState();
    store.setExiting(id);
    // Remove after animation completes
    setTimeout(() => {
      store.removeToast(id);
    }, ANIMATION_DURATION);
  },

  /**
   * Dismiss all toasts immediately.
   */
  dismissAll: (): void => {
    useToastStore.getState().clearAll();
  },
};

// ============================================================================
// Toast Component
// ============================================================================

/**
 * Individual toast notification component.
 * 
 * Features:
 * - Variant-based styling (success, error, warning, info)
 * - Optional rarity-based styling for special notifications
 * - Auto-dismiss with configurable duration
 * - Click to dismiss
 * - Swipe-to-dismiss on touch devices (horizontal swipe)
 * - Slide-in/out animations
 * - Spring-back animation when released below threshold
 * - Respects reduced motion preference
 * - Accessible with role="alert" and aria-live
 */
export function Toast({ toast: toastData, onDismiss }: ToastProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { id, title, description, variant, rarity, duration, action, isExiting } = toastData;

  // Get variant configuration
  const variantConfig = VARIANT_CONFIG[variant];

  // Get rarity configuration if provided
  const rarityConfig = rarity ? RARITY_CONFIG[rarity] : null;

  // Handle click to dismiss (defined before useSwipeGesture to use in callback)
  const handleDismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    onDismiss(id);
  }, [id, onDismiss]);

  // Swipe-to-dismiss gesture handling
  const { handlers, state: swipeState, style: swipeStyle } = useSwipeGesture({
    onSwipe: () => handleDismiss(),
    threshold: 100,
    disabled: prefersReducedMotion,
  });

  // Handle auto-dismiss
  useEffect(() => {
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        onDismiss(id);
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [id, duration, onDismiss]);

  // Handle action click
  const handleActionClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    action?.onClick();
    handleDismiss();
  }, [action, handleDismiss]);

  // Handle keyboard dismiss
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Enter') {
      handleDismiss();
    }
  }, [handleDismiss]);

  // Build animation classes (only apply when not actively swiping)
  const animationClasses = prefersReducedMotion
    ? ''
    : swipeState.offset !== 0
      ? '' // No animation classes during active swipe
      : cn(
          'toast-animated',
          isExiting
            ? 'opacity-0 translate-x-full'
            : 'opacity-100 translate-x-0 animate-slide-in-right'
        );

  // Build border/glow styles based on rarity or variant
  const borderStyles = rarityConfig
    ? `border-l-4`
    : `border-l-4 ${variantConfig.borderColor}`;

  const glowStyles = rarityConfig
    ? { boxShadow: `0 0 20px ${rarityConfig.colors.glow}` }
    : undefined;

  const borderColorStyle = rarityConfig
    ? { borderLeftColor: rarityConfig.colors.solid }
    : undefined;

  // Merge swipe styles with existing styles
  // When actively swiping (offset !== 0), use swipe transform and opacity
  // When not swiping (offset === 0), use default styles with spring-back transition
  const mergedStyles: React.CSSProperties = {
    ...glowStyles,
    ...borderColorStyle,
    minWidth: '320px',
    maxWidth: '420px',
    // Apply swipe transform when actively swiping
    ...(swipeState.offset !== 0 && !prefersReducedMotion
      ? {
          transform: swipeStyle.transform,
          opacity: swipeStyle.opacity,
        }
      : {}),
    // Spring-back transition when released below threshold
    transition: swipeState.offset === 0 && !prefersReducedMotion
      ? 'transform 0.2s ease-out, opacity 0.2s ease-out'
      : 'none',
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      tabIndex={0}
      onClick={handleDismiss}
      onKeyDown={handleKeyDown}
      {...handlers}
      className={cn(
        // Base styles
        'relative flex items-start gap-3 p-4 rounded-lg cursor-pointer',
        'bg-background-surface/95 backdrop-blur-sm',
        'shadow-lg',
        borderStyles,
        // Animation
        animationClasses,
        // Focus styles
        'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:ring-offset-2',
        // Hover state
        'hover:bg-background-surface',
        // Touch action for swipe gesture
        'touch-pan-y',
      )}
      style={mergedStyles}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold',
          rarityConfig ? rarityConfig.colors.bg : variantConfig.bgColor,
          rarityConfig ? rarityConfig.colors.text : variantConfig.iconColor,
        )}
        aria-hidden="true"
      >
        {variantConfig.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-semibold text-text-primary',
            rarityConfig && rarityConfig.colors.text,
          )}
        >
          {title}
        </p>
        {description && (
          <p className="mt-1 text-sm text-text-secondary line-clamp-2">
            {description}
          </p>
        )}
        {action && (
          <button
            type="button"
            onClick={handleActionClick}
            className={cn(
              'mt-2 text-sm font-medium underline-offset-2 hover:underline',
              rarityConfig ? rarityConfig.colors.text : 'text-interactive-500',
              'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:ring-offset-1 rounded',
            )}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Close button - 44x44px touch target */}
      <button
        type="button"
        onClick={handleDismiss}
        className={cn(
          'flex-shrink-0 flex items-center justify-center w-11 h-11 -mr-2 -mt-2',
          'rounded-lg',
          'text-text-tertiary hover:text-text-primary',
          'hover:bg-background-elevated',
          'active:bg-background-elevated active:scale-95',
          'focus:outline-none focus:ring-2 focus:ring-interactive-500',
          'transition-all duration-75',
        )}
        aria-label="Dismiss notification"
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

      {/* Rarity shimmer effect */}
      {rarityConfig && !prefersReducedMotion && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <div
            className={cn(
              'absolute inset-0 opacity-10',
              `bg-gradient-to-r ${rarityConfig.colors.gradient}`,
              'animate-shimmer',
            )}
            style={{
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      )}
    </div>
  );
}

Toast.displayName = 'Toast';

// ============================================================================
// ToastContainer Component
// ============================================================================

/**
 * Container component for rendering and managing toast notifications.
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
 *         <ToastContainer />
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function ToastContainer({
  maxVisible = MAX_VISIBLE_TOASTS,
  position = 'top-right',
}: ToastContainerProps = {}): JSX.Element | null {
  const toasts = useToastStore((state) => state.toasts);

  // Handle dismiss with animation
  const handleDismiss = useCallback((id: string) => {
    toast.dismiss(id);
  }, []);

  // Get visible toasts (limited by maxVisible)
  const visibleToasts = toasts.slice(-maxVisible);

  // Position classes
  const positionClasses: Record<typeof position, string> = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  if (visibleToasts.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-2',
        positionClasses[position],
      )}
      aria-label="Notifications"
    >
      {visibleToasts.map((toastData) => (
        <Toast
          key={toastData.id}
          toast={toastData}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
}

ToastContainer.displayName = 'ToastContainer';

// ============================================================================
// Hook for accessing toast state
// ============================================================================

/**
 * Hook to access the current toast state.
 * Useful for custom toast rendering or monitoring.
 * 
 * @returns Array of current toast data
 */
export function useToasts(): ToastData[] {
  return useToastStore((state) => state.toasts);
}

export default Toast;
