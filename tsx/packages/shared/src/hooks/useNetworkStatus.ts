/**
 * useNetworkStatus Hook
 * 
 * Tracks browser online/offline status with change detection and timestamps.
 * Useful for showing connectivity indicators and handling offline scenarios.
 * 
 * @example
 * ```tsx
 * function NetworkIndicator() {
 *   const { isOnline, hasChanged, lastChanged } = useNetworkStatus();
 *   
 *   if (!isOnline) {
 *     return <OfflineBanner />;
 *   }
 *   
 *   if (hasChanged && isOnline) {
 *     return <ReconnectedToast />;
 *   }
 *   
 *   return null;
 * }
 * ```
 */

import { useState, useEffect } from 'react';

/**
 * Network status state interface
 */
export interface NetworkStatusState {
  /** Current online status */
  isOnline: boolean;
  /** Whether status has changed since mount */
  hasChanged: boolean;
  /** Timestamp of last status change (null if never changed) */
  lastChanged: number | null;
}

/**
 * Hook to track browser online/offline status.
 * 
 * This hook:
 * - Returns default values during SSR (assumes online)
 * - Uses `navigator.onLine` for initial state
 * - Listens to `online` and `offline` window events
 * - Tracks whether status has changed since mount
 * - Records timestamp of last status change
 * - Properly cleans up event listeners on unmount
 * 
 * @returns {NetworkStatusState} Object containing isOnline, hasChanged, and lastChanged
 * 
 * @example
 * ```tsx
 * const { isOnline, hasChanged, lastChanged } = useNetworkStatus();
 * 
 * // Show offline indicator
 * if (!isOnline) {
 *   return <div>You are offline</div>;
 * }
 * 
 * // Show reconnection message
 * if (hasChanged && isOnline) {
 *   return <div>Back online!</div>;
 * }
 * 
 * // Calculate time since last change
 * if (lastChanged) {
 *   const secondsAgo = Math.floor((Date.now() - lastChanged) / 1000);
 *   console.log(`Status changed ${secondsAgo} seconds ago`);
 * }
 * ```
 */
export function useNetworkStatus(): NetworkStatusState {
  // Initialize state - default to online for SSR safety
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    // SSR check - navigator is not available on the server
    if (typeof navigator === 'undefined') {
      return true;
    }
    return navigator.onLine;
  });
  
  const [hasChanged, setHasChanged] = useState<boolean>(false);
  const [lastChanged, setLastChanged] = useState<number | null>(null);

  useEffect(() => {
    // SSR check - window is not available on the server
    if (typeof window === 'undefined') {
      return;
    }

    // Update initial state on mount (in case SSR value differs)
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    /**
     * Handler for online event
     * Updates state when browser comes online
     */
    const handleOnline = (): void => {
      setIsOnline(true);
      setHasChanged(true);
      setLastChanged(Date.now());
    };

    /**
     * Handler for offline event
     * Updates state when browser goes offline
     */
    const handleOffline = (): void => {
      setIsOnline(false);
      setHasChanged(true);
      setLastChanged(Date.now());
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup function - remove event listeners on unmount
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, hasChanged, lastChanged };
}

/**
 * Type export for consumers who need the return type
 */
export type UseNetworkStatusReturn = ReturnType<typeof useNetworkStatus>;
