'use client';

import { useEffect } from 'react';

/**
 * useScrollLock - Prevent body scroll without layout shift
 *
 * Handles scrollbar width compensation to prevent content jump
 * when modal/drawer opens.
 *
 * @param isLocked - Whether scroll should be locked
 *
 * @example
 * useScrollLock(isModalOpen);
 */
export function useScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalPaddingRight = document.body.style.paddingRight;
    const originalOverflow = document.body.style.overflow;

    // Apply scroll lock with compensation
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.style.overflow = 'hidden';

    return () => {
      // Restore original styles
      document.body.style.paddingRight = originalPaddingRight;
      document.body.style.overflow = originalOverflow;
    };
  }, [isLocked]);
}
