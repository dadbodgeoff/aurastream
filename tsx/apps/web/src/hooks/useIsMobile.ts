'use client';

import { useMediaQuery } from './useMediaQuery';

/**
 * useIsMobile - Detect mobile viewport
 *
 * Uses 768px breakpoint (md in Tailwind)
 * Returns false during SSR to prevent hydration mismatch
 *
 * @returns boolean - true if viewport < 768px
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}
