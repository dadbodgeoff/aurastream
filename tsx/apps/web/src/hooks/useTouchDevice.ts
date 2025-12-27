'use client';

import { useState, useEffect } from 'react';

/**
 * useTouchDevice - Detect touch-capable device
 *
 * Checks for touch events and pointer type
 * Returns false during SSR
 *
 * @returns boolean - true if device supports touch
 */
export function useTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const hasTouch = 'ontouchstart' in window ||
                     navigator.maxTouchPoints > 0;
    setIsTouch(hasTouch);
  }, []);

  return isTouch;
}
