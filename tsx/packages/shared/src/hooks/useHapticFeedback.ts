/**
 * useHapticFeedback Hook
 * 
 * Mobile UX enhancement hook that provides haptic feedback using the Vibration API.
 * Automatically respects the user's reduced motion preference for accessibility.
 * 
 * @example
 * ```tsx
 * function ActionButton() {
 *   const { isSupported, trigger } = useHapticFeedback();
 *   
 *   const handleClick = () => {
 *     trigger('success');
 *     // ... perform action
 *   };
 *   
 *   return <button onClick={handleClick}>Confirm</button>;
 * }
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * Available haptic feedback patterns
 * 
 * - `light`: 10ms vibration for navigation taps
 * - `medium`: 20ms vibration for selections
 * - `heavy`: 30ms vibration for confirmations
 * - `success`: Pattern for success feedback
 * - `warning`: Pattern for warning feedback
 * - `error`: Pattern for error feedback
 */
export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Return type for the useHapticFeedback hook
 */
export interface UseHapticFeedbackReturn {
  /** Whether the Vibration API is supported on this device */
  isSupported: boolean;
  /** Trigger haptic feedback with the specified pattern */
  trigger: (pattern?: HapticPattern) => void;
}

/**
 * Vibration patterns in milliseconds
 * 
 * Single numbers represent vibration duration.
 * Arrays represent alternating vibration/pause patterns.
 */
const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  /** Light tap for navigation (10ms) */
  light: 10,
  /** Medium tap for selections (20ms) */
  medium: 20,
  /** Heavy tap for confirmations (30ms) */
  heavy: 30,
  /** Success pattern: short-pause-short */
  success: [10, 50, 10],
  /** Warning pattern: medium-pause-medium */
  warning: [20, 30, 20],
  /** Error pattern: long-pause-long-pause-long */
  error: [30, 20, 30, 20, 30],
};

/**
 * Default pattern when none is specified
 */
const DEFAULT_PATTERN: HapticPattern = 'light';

/**
 * Check if the Vibration API is supported
 * SSR-safe check for navigator.vibrate
 */
function checkVibrationSupport(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  if (typeof navigator === 'undefined') {
    return false;
  }
  
  return typeof navigator.vibrate === 'function';
}

/**
 * Hook to provide haptic feedback on supported devices.
 * 
 * This hook:
 * - Detects Vibration API support (SSR-safe)
 * - Provides preset vibration patterns for common use cases
 * - Automatically disables haptics when user prefers reduced motion
 * - Returns a stable trigger callback (memoized)
 * 
 * @returns {UseHapticFeedbackReturn} Object containing `isSupported` boolean and `trigger` function
 * 
 * @example
 * ```tsx
 * function InteractiveCard() {
 *   const { isSupported, trigger } = useHapticFeedback();
 *   
 *   return (
 *     <div
 *       onClick={() => trigger('light')}
 *       onLongPress={() => trigger('heavy')}
 *     >
 *       {isSupported && <span>Haptic feedback enabled</span>}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Form submission with feedback
 * function SubmitForm() {
 *   const { trigger } = useHapticFeedback();
 *   
 *   const handleSubmit = async () => {
 *     try {
 *       await submitData();
 *       trigger('success');
 *     } catch (error) {
 *       trigger('error');
 *     }
 *   };
 *   
 *   return <button onClick={handleSubmit}>Submit</button>;
 * }
 * ```
 */
export function useHapticFeedback(): UseHapticFeedbackReturn {
  // Check for reduced motion preference (accessibility)
  const prefersReducedMotion = useReducedMotion();
  
  // Memoize the support check to avoid recalculating on every render
  const isSupported = useMemo(() => checkVibrationSupport(), []);
  
  /**
   * Trigger haptic feedback with the specified pattern
   * 
   * @param pattern - The haptic pattern to use (defaults to 'light')
   */
  const trigger = useCallback(
    (pattern: HapticPattern = DEFAULT_PATTERN): void => {
      // Skip if not supported
      if (!isSupported) {
        return;
      }
      
      // Respect reduced motion preference for accessibility
      if (prefersReducedMotion) {
        return;
      }
      
      // Get the vibration pattern
      const vibrationPattern = HAPTIC_PATTERNS[pattern];
      
      // Trigger the vibration
      try {
        navigator.vibrate(vibrationPattern);
      } catch {
        // Silently fail if vibration fails (e.g., permission denied)
        // This is intentional - haptic feedback is a nice-to-have enhancement
      }
    },
    [isSupported, prefersReducedMotion]
  );
  
  return {
    isSupported,
    trigger,
  };
}
