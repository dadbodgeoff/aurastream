/**
 * useReducedMotion Hook
 * 
 * Accessibility-focused hook that detects the user's preference for reduced motion.
 * Respects the `prefers-reduced-motion: reduce` media query.
 * 
 * @example
 * ```tsx
 * function AnimatedComponent() {
 *   const prefersReducedMotion = useReducedMotion();
 *   
 *   return (
 *     <motion.div
 *       animate={{ opacity: 1 }}
 *       transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
 *     />
 *   );
 * }
 * ```
 */

import { useState, useEffect } from 'react';

/**
 * Media query string for detecting reduced motion preference
 */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Hook to detect if the user prefers reduced motion.
 * 
 * This hook:
 * - Returns `false` during SSR (server-side rendering)
 * - Detects the `prefers-reduced-motion: reduce` media query
 * - Listens for changes to the preference and updates accordingly
 * - Properly cleans up event listeners on unmount
 * 
 * @returns {boolean} `true` if the user prefers reduced motion, `false` otherwise
 * 
 * @example
 * ```tsx
 * const prefersReducedMotion = useReducedMotion();
 * 
 * // Use to conditionally disable animations
 * const animationDuration = prefersReducedMotion ? 0 : 300;
 * 
 * // Or skip animations entirely
 * if (!prefersReducedMotion) {
 *   playAnimation();
 * }
 * ```
 */
export function useReducedMotion(): boolean {
  // Default to false for SSR - animations enabled by default
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    // SSR check - window is not available on the server
    if (typeof window === 'undefined') {
      return;
    }

    // Check if matchMedia is supported
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    // Create the media query list
    const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);

    // Set initial value
    setPrefersReducedMotion(mediaQueryList.matches);

    /**
     * Handler for media query changes
     * Updates state when user changes their motion preference
     */
    const handleChange = (event: MediaQueryListEvent): void => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers use addEventListener
    // Older browsers use addListener (deprecated but still supported)
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange);
    } else if (mediaQueryList.addListener) {
      // Fallback for older browsers (Safari < 14)
      mediaQueryList.addListener(handleChange);
    }

    // Cleanup function
    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handleChange);
      } else if (mediaQueryList.removeListener) {
        // Fallback for older browsers (Safari < 14)
        mediaQueryList.removeListener(handleChange);
      }
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Type export for consumers who need the return type
 */
export type UseReducedMotionReturn = ReturnType<typeof useReducedMotion>;
