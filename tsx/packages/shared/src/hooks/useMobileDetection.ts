/**
 * useMobileDetection Hook
 * 
 * Responsive design hook that detects mobile devices, tablets, and touch capability.
 * Uses media queries and touch detection for comprehensive device identification.
 * 
 * @example
 * ```tsx
 * function ResponsiveComponent() {
 *   const { isMobile, isTouch, isTablet } = useMobileDetection();
 *   
 *   if (isMobile) {
 *     return <MobileLayout />;
 *   }
 *   
 *   if (isTablet) {
 *     return <TabletLayout />;
 *   }
 *   
 *   return <DesktopLayout />;
 * }
 * ```
 */

import { useState, useEffect } from 'react';

/**
 * Media query string for detecting mobile devices (max-width: 768px)
 */
const MOBILE_QUERY = '(max-width: 768px)';

/**
 * Media query string for detecting tablet devices (768px - 1024px)
 */
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1024px)';

/**
 * Result interface for mobile detection
 */
export interface MobileDetectionResult {
  /** True if screen width is <= 768px */
  isMobile: boolean;
  /** True if device has touch capability */
  isTouch: boolean;
  /** True if screen width is between 768px and 1024px */
  isTablet: boolean;
}

/**
 * Default values for SSR and initial state
 */
const DEFAULT_RESULT: MobileDetectionResult = {
  isMobile: false,
  isTouch: false,
  isTablet: false,
};

/**
 * Detects if the device has touch capability
 * @returns True if touch is supported
 */
function detectTouch(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return (
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
  );
}

/**
 * Hook to detect mobile devices, tablets, and touch capability.
 * 
 * This hook:
 * - Returns default values during SSR (server-side rendering)
 * - Detects mobile screens using `(max-width: 768px)` media query
 * - Detects tablet screens using `(min-width: 768px) and (max-width: 1024px)` media query
 * - Detects touch capability using `ontouchstart` or `navigator.maxTouchPoints`
 * - Listens for resize changes and updates accordingly
 * - Properly cleans up event listeners on unmount
 * 
 * @returns {MobileDetectionResult} Object containing isMobile, isTouch, and isTablet booleans
 * 
 * @example
 * ```tsx
 * const { isMobile, isTouch, isTablet } = useMobileDetection();
 * 
 * // Use for responsive layouts
 * const columns = isMobile ? 1 : isTablet ? 2 : 4;
 * 
 * // Use for touch-specific interactions
 * const interactionType = isTouch ? 'tap' : 'click';
 * 
 * // Combine for device-specific behavior
 * if (isMobile && isTouch) {
 *   enableMobileGestures();
 * }
 * ```
 */
export function useMobileDetection(): MobileDetectionResult {
  // Default to false for SSR - desktop layout by default
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isTablet, setIsTablet] = useState<boolean>(false);
  const [isTouch, setIsTouch] = useState<boolean>(false);

  useEffect(() => {
    // SSR check - window is not available on the server
    if (typeof window === 'undefined') {
      return;
    }

    // Check if matchMedia is supported
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    // Create the media query lists
    const mobileMediaQueryList = window.matchMedia(MOBILE_QUERY);
    const tabletMediaQueryList = window.matchMedia(TABLET_QUERY);

    // Set initial values
    setIsMobile(mobileMediaQueryList.matches);
    setIsTablet(tabletMediaQueryList.matches);
    setIsTouch(detectTouch());

    /**
     * Handler for mobile media query changes
     * Updates state when screen size crosses mobile threshold
     */
    const handleMobileChange = (event: MediaQueryListEvent): void => {
      setIsMobile(event.matches);
    };

    /**
     * Handler for tablet media query changes
     * Updates state when screen size enters/exits tablet range
     */
    const handleTabletChange = (event: MediaQueryListEvent): void => {
      setIsTablet(event.matches);
    };

    // Add event listeners for mobile query
    // Modern browsers use addEventListener
    // Older browsers use addListener (deprecated but still supported)
    if (mobileMediaQueryList.addEventListener) {
      mobileMediaQueryList.addEventListener('change', handleMobileChange);
    } else if (mobileMediaQueryList.addListener) {
      // Fallback for older browsers (Safari < 14)
      mobileMediaQueryList.addListener(handleMobileChange);
    }

    // Add event listeners for tablet query
    if (tabletMediaQueryList.addEventListener) {
      tabletMediaQueryList.addEventListener('change', handleTabletChange);
    } else if (tabletMediaQueryList.addListener) {
      // Fallback for older browsers (Safari < 14)
      tabletMediaQueryList.addListener(handleTabletChange);
    }

    // Cleanup function
    return () => {
      // Remove mobile query listener
      if (mobileMediaQueryList.removeEventListener) {
        mobileMediaQueryList.removeEventListener('change', handleMobileChange);
      } else if (mobileMediaQueryList.removeListener) {
        // Fallback for older browsers (Safari < 14)
        mobileMediaQueryList.removeListener(handleMobileChange);
      }

      // Remove tablet query listener
      if (tabletMediaQueryList.removeEventListener) {
        tabletMediaQueryList.removeEventListener('change', handleTabletChange);
      } else if (tabletMediaQueryList.removeListener) {
        // Fallback for older browsers (Safari < 14)
        tabletMediaQueryList.removeListener(handleTabletChange);
      }
    };
  }, []);

  return { isMobile, isTouch, isTablet };
}

/**
 * Type export for consumers who need the return type
 */
export type UseMobileDetectionReturn = ReturnType<typeof useMobileDetection>;
