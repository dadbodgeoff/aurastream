/**
 * useKeyboardAware Hook
 * 
 * Detects virtual keyboard presence and provides utilities for keyboard-aware UX.
 * Uses the VisualViewport API when available, with fallback to window resize detection.
 * 
 * @example
 * ```tsx
 * function ChatInput() {
 *   const { isKeyboardVisible, keyboardHeight, scrollToFocused } = useKeyboardAware();
 *   
 *   return (
 *     <div style={{ paddingBottom: isKeyboardVisible ? keyboardHeight : 0 }}>
 *       <input 
 *         onFocus={() => scrollToFocused()}
 *         placeholder="Type a message..."
 *       />
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Minimum height difference (in pixels) to consider keyboard visible.
 * This threshold accounts for browser chrome changes and minor viewport adjustments.
 * Soft keyboards typically have heights of 200-400px.
 */
const KEYBOARD_VISIBILITY_THRESHOLD = 150;

/**
 * State interface for keyboard awareness
 */
export interface KeyboardAwareState {
  /** Whether keyboard is currently visible */
  isKeyboardVisible: boolean;
  /** Height of keyboard in pixels (0 if not visible) */
  keyboardHeight: number;
  /** Scroll focused element into view */
  scrollToFocused: () => void;
}

/**
 * Default values for SSR and initial state
 */
const DEFAULT_STATE: Omit<KeyboardAwareState, 'scrollToFocused'> = {
  isKeyboardVisible: false,
  keyboardHeight: 0,
};

/**
 * Hook to detect virtual keyboard presence and provide keyboard-aware utilities.
 * 
 * This hook:
 * - Returns default values during SSR (server-side rendering)
 * - Uses the VisualViewport API when available for accurate keyboard detection
 * - Falls back to window resize detection when VisualViewport is not supported
 * - Calculates keyboard height from viewport difference
 * - Considers keyboard visible when height difference exceeds 150px threshold
 * - Provides utility to scroll focused element into view
 * - Properly cleans up event listeners on unmount
 * 
 * @returns {KeyboardAwareState} Object containing isKeyboardVisible, keyboardHeight, and scrollToFocused
 * 
 * @example
 * ```tsx
 * function FormWithKeyboard() {
 *   const { isKeyboardVisible, keyboardHeight, scrollToFocused } = useKeyboardAware();
 *   
 *   // Adjust layout when keyboard is visible
 *   const containerStyle = {
 *     paddingBottom: isKeyboardVisible ? keyboardHeight : 0,
 *     transition: 'padding-bottom 0.2s ease-out',
 *   };
 *   
 *   // Scroll input into view on focus
 *   const handleFocus = () => {
 *     // Small delay to allow keyboard to appear
 *     setTimeout(scrollToFocused, 100);
 *   };
 *   
 *   return (
 *     <div style={containerStyle}>
 *       <input onFocus={handleFocus} />
 *       {isKeyboardVisible && (
 *         <span>Keyboard height: {keyboardHeight}px</span>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useKeyboardAware(): KeyboardAwareState {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(DEFAULT_STATE.isKeyboardVisible);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(DEFAULT_STATE.keyboardHeight);

  /**
   * Scrolls the currently focused element into view.
   * Uses smooth scrolling and centers the element in the viewport.
   */
  const scrollToFocused = useCallback((): void => {
    // SSR check
    if (typeof document === 'undefined') {
      return;
    }

    const activeElement = document.activeElement;
    
    if (activeElement && activeElement !== document.body) {
      activeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, []);

  useEffect(() => {
    // SSR check - window is not available on the server
    if (typeof window === 'undefined') {
      return;
    }

    /**
     * Store the initial window height to calculate keyboard height.
     * This represents the full viewport height without keyboard.
     */
    let initialWindowHeight = window.innerHeight;

    /**
     * Calculate keyboard state from viewport dimensions.
     * @param viewportHeight - Current viewport height (from VisualViewport or window)
     */
    const updateKeyboardState = (viewportHeight: number): void => {
      const heightDifference = initialWindowHeight - viewportHeight;
      const isVisible = heightDifference > KEYBOARD_VISIBILITY_THRESHOLD;
      
      setIsKeyboardVisible(isVisible);
      setKeyboardHeight(isVisible ? heightDifference : 0);
    };

    /**
     * Handler for VisualViewport resize events.
     * VisualViewport provides accurate viewport dimensions excluding keyboard.
     */
    const handleVisualViewportResize = (): void => {
      const visualViewport = window.visualViewport;
      
      if (visualViewport) {
        updateKeyboardState(visualViewport.height);
      }
    };

    /**
     * Handler for window resize events (fallback).
     * Less accurate than VisualViewport but provides basic support.
     */
    const handleWindowResize = (): void => {
      updateKeyboardState(window.innerHeight);
    };

    /**
     * Handler for orientation change.
     * Reset initial height when device orientation changes.
     */
    const handleOrientationChange = (): void => {
      // Wait for orientation change to complete
      setTimeout(() => {
        initialWindowHeight = window.innerHeight;
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }, 100);
    };

    // Check if VisualViewport API is available
    const visualViewport = window.visualViewport;

    if (visualViewport) {
      // Use VisualViewport API (preferred method)
      // Set initial state
      updateKeyboardState(visualViewport.height);
      
      // Listen for viewport resize (keyboard show/hide)
      visualViewport.addEventListener('resize', handleVisualViewportResize);
      
      // Listen for orientation changes
      window.addEventListener('orientationchange', handleOrientationChange);

      // Cleanup
      return () => {
        visualViewport.removeEventListener('resize', handleVisualViewportResize);
        window.removeEventListener('orientationchange', handleOrientationChange);
      };
    } else {
      // Fallback to window resize detection
      // This is less accurate but provides basic support
      window.addEventListener('resize', handleWindowResize);
      window.addEventListener('orientationchange', handleOrientationChange);

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleWindowResize);
        window.removeEventListener('orientationchange', handleOrientationChange);
      };
    }
  }, []);

  return {
    isKeyboardVisible,
    keyboardHeight,
    scrollToFocused,
  };
}

/**
 * Type export for consumers who need the return type
 */
export type UseKeyboardAwareReturn = ReturnType<typeof useKeyboardAware>;
