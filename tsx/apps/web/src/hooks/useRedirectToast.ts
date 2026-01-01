'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

export type RedirectKey = 
  | 'quick-create' 
  | 'coach' 
  | 'promo' 
  | 'trends' 
  | 'playbook' 
  | 'clip-radar';

export interface UseRedirectToastOptions {
  /** Auto-dismiss timeout in milliseconds (default: 5000) */
  autoDismissMs?: number;
  /** Whether to persist dismissal in localStorage (default: true) */
  persist?: boolean;
}

export interface UseRedirectToastReturn {
  /** Whether the toast should be shown */
  showToast: boolean;
  /** Function to dismiss the toast */
  dismissToast: () => void;
  /** The message to display */
  message: string;
}

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'aurastream_redirect_toasts_shown';
const DEFAULT_AUTO_DISMISS_MS = 5000;

/**
 * Predefined redirect messages from the spec
 */
export const REDIRECT_MESSAGES: Record<RedirectKey, string> = {
  'quick-create': 'Quick Create moved to Create → Templates',
  'coach': 'AI Coach moved to Create → AI Coach tab',
  'promo': 'Promo Board moved to Community → Promo tab',
  'trends': 'Trends moved to Creator Intel → Trends tab',
  'playbook': 'Playbook moved to Creator Intel → Playbook tab',
  'clip-radar': 'Clip Radar moved to Creator Intel → Clips tab',
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the set of already-shown toast keys from localStorage
 */
function getShownToasts(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set();
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch (error) {
    // If parsing fails, return empty set
    console.warn('Failed to parse redirect toasts from localStorage:', error);
  }
  
  return new Set();
}

/**
 * Save the set of shown toast keys to localStorage
 */
function saveShownToasts(shown: Set<string>): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(shown)));
  } catch (error) {
    console.warn('Failed to save redirect toasts to localStorage:', error);
  }
}

/**
 * Mark a specific toast as shown
 */
function markToastAsShown(key: string): void {
  const shown = getShownToasts();
  shown.add(key);
  saveShownToasts(shown);
}

/**
 * Check if a toast has already been shown
 */
function hasToastBeenShown(key: string): boolean {
  const shown = getShownToasts();
  return shown.has(key);
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to show one-time redirect notification toasts.
 * 
 * Uses localStorage to track which toasts have been shown, ensuring
 * users only see each redirect notification once.
 * 
 * @param redirectKey - The key identifying the redirect type
 * @param customMessage - Optional custom message (defaults to predefined message)
 * @param options - Configuration options
 * 
 * @example
 * ```tsx
 * function QuickCreateRedirectPage() {
 *   const { showToast, dismissToast, message } = useRedirectToast('quick-create');
 *   
 *   return (
 *     <>
 *       {showToast && (
 *         <RedirectToast message={message} onDismiss={dismissToast} />
 *       )}
 *       <Redirect to="/dashboard/create?tab=templates" />
 *     </>
 *   );
 * }
 * ```
 */
export function useRedirectToast(
  redirectKey: RedirectKey,
  customMessage?: string,
  options: UseRedirectToastOptions = {}
): UseRedirectToastReturn {
  const {
    autoDismissMs = DEFAULT_AUTO_DISMISS_MS,
    persist = true,
  } = options;

  // Get the message (custom or predefined)
  const message = customMessage ?? REDIRECT_MESSAGES[redirectKey] ?? '';

  // Track whether toast should be shown
  const [showToast, setShowToast] = useState(false);
  
  // Ref to track if we've initialized (for SSR safety)
  const initializedRef = useRef(false);
  
  // Ref for auto-dismiss timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize on mount (client-side only)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Check if this toast has already been shown
    const alreadyShown = hasToastBeenShown(redirectKey);
    
    if (!alreadyShown) {
      setShowToast(true);
      
      // Mark as shown immediately if persisting
      if (persist) {
        markToastAsShown(redirectKey);
      }
    }
  }, [redirectKey, persist]);

  // Set up auto-dismiss timer
  useEffect(() => {
    if (showToast && autoDismissMs > 0) {
      timerRef.current = setTimeout(() => {
        setShowToast(false);
      }, autoDismissMs);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [showToast, autoDismissMs]);

  // Dismiss handler
  const dismissToast = useCallback(() => {
    // Clear any pending timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    setShowToast(false);
    
    // Mark as shown if not already persisted
    if (persist && !hasToastBeenShown(redirectKey)) {
      markToastAsShown(redirectKey);
    }
  }, [redirectKey, persist]);

  return {
    showToast,
    dismissToast,
    message,
  };
}

// =============================================================================
// Utility Functions (exported for testing/advanced usage)
// =============================================================================

/**
 * Clear all stored redirect toast states (useful for testing or reset)
 */
export function clearAllRedirectToasts(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear redirect toasts from localStorage:', error);
  }
}

/**
 * Clear a specific redirect toast state
 */
export function clearRedirectToast(key: RedirectKey): void {
  const shown = getShownToasts();
  shown.delete(key);
  saveShownToasts(shown);
}

/**
 * Check if a specific redirect toast has been shown
 */
export function isRedirectToastShown(key: RedirectKey): boolean {
  return hasToastBeenShown(key);
}

// =============================================================================
// Default Export
// =============================================================================

export default useRedirectToast;
