'use client';

import { useEffect, type RefObject } from 'react';

/**
 * useFocusTrap - Trap focus within a container for accessibility
 *
 * Essential for modal/drawer accessibility. Traps Tab and Shift+Tab
 * within the container and focuses first element on activation.
 *
 * @param containerRef - Ref to the container element
 * @param isActive - Whether trap is active
 *
 * @example
 * const modalRef = useRef<HTMLDivElement>(null);
 * useFocusTrap(modalRef, isOpen);
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  isActive: boolean
): void {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';

    // Get all focusable elements
    const getFocusableElements = () => {
      return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
    };

    // Focus first element on mount
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: go to last element if on first
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: go to first element if on last
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, isActive]);
}
