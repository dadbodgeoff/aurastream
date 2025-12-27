/**
 * useDelayedLoading Hook Tests
 * 
 * Comprehensive tests for the delayed loading indicator hook.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDelayedLoading } from '../hooks/useDelayedLoading';

// ============================================================================
// Test Setup
// ============================================================================

describe('useDelayedLoading', () => {
  beforeEach(() => {
    // Use fake timers for precise control
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Basic Functionality
  // ==========================================================================

  describe('basic functionality', () => {
    it('should return false initially when not loading', () => {
      const { result } = renderHook(() => useDelayedLoading(false));

      expect(result.current).toBe(false);
    });

    it('should return false initially when loading starts', () => {
      const { result } = renderHook(() => useDelayedLoading(true));

      // Should not show loading immediately
      expect(result.current).toBe(false);
    });

    it('should return true after default delay when still loading', () => {
      const { result } = renderHook(() => useDelayedLoading(true));

      expect(result.current).toBe(false);

      // Advance past default delay (200ms)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current).toBe(true);
    });

    it('should use default delay of 200ms', () => {
      const { result } = renderHook(() => useDelayedLoading(true));

      // At 199ms, should still be false
      act(() => {
        vi.advanceTimersByTime(199);
      });
      expect(result.current).toBe(false);

      // At 200ms, should be true
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe(true);
    });
  });

  // ==========================================================================
  // Fast Loading (Completes Before Delay)
  // ==========================================================================

  describe('fast loading - completes before delay', () => {
    it('should never show loading if loading completes before delay', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading),
        { initialProps: { isLoading: true } }
      );

      expect(result.current).toBe(false);

      // Loading completes after 100ms (before 200ms delay)
      act(() => {
        vi.advanceTimersByTime(100);
      });
      
      rerender({ isLoading: false });

      expect(result.current).toBe(false);

      // Even after more time passes, should remain false
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe(false);
    });

    it('should never show loading for very fast operations', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading),
        { initialProps: { isLoading: true } }
      );

      // Loading completes almost immediately (10ms)
      act(() => {
        vi.advanceTimersByTime(10);
      });
      
      rerender({ isLoading: false });

      expect(result.current).toBe(false);
    });

    it('should never show loading when loading completes at exactly delay time', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading, { delay: 200 }),
        { initialProps: { isLoading: true } }
      );

      // Advance to just before delay
      act(() => {
        vi.advanceTimersByTime(199);
      });
      
      // Loading completes at 199ms
      rerender({ isLoading: false });

      expect(result.current).toBe(false);

      // Advance past delay - should still be false
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe(false);
    });
  });

  // ==========================================================================
  // Slow Loading (Shows After Delay)
  // ==========================================================================

  describe('slow loading - shows after delay', () => {
    it('should show loading after delay when still loading', () => {
      const { result } = renderHook(() => useDelayedLoading(true, { delay: 300 }));

      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe(true);
    });

    it('should hide loading when loading completes after being shown', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading),
        { initialProps: { isLoading: true } }
      );

      // Wait for loading to show
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe(true);

      // Loading completes
      rerender({ isLoading: false });

      expect(result.current).toBe(false);
    });

    it('should keep showing loading while still loading', () => {
      const { result } = renderHook(() => useDelayedLoading(true));

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe(true);

      // Continue loading for a long time
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current).toBe(true);
    });
  });

  // ==========================================================================
  // Custom Delay
  // ==========================================================================

  describe('custom delay', () => {
    it('should respect custom delay value', () => {
      const { result } = renderHook(() => useDelayedLoading(true, { delay: 500 }));

      act(() => {
        vi.advanceTimersByTime(499);
      });
      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe(true);
    });

    it('should work with zero delay', () => {
      const { result } = renderHook(() => useDelayedLoading(true, { delay: 0 }));

      // With 0 delay, should show immediately after timer fires
      act(() => {
        vi.advanceTimersByTime(0);
      });
      expect(result.current).toBe(true);
    });

    it('should work with very long delay', () => {
      const { result } = renderHook(() => useDelayedLoading(true, { delay: 5000 }));

      act(() => {
        vi.advanceTimersByTime(4999);
      });
      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe(true);
    });
  });

  // ==========================================================================
  // Minimum Duration
  // ==========================================================================

  describe('minimum duration', () => {
    it('should keep showing loading for minimum duration after loading completes', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading, { delay: 200, minDuration: 500 }),
        { initialProps: { isLoading: true } }
      );

      // Wait for loading to show
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe(true);

      // Loading completes after 100ms of showing (total 300ms)
      act(() => {
        vi.advanceTimersByTime(100);
      });
      rerender({ isLoading: false });

      // Should still show (minDuration not reached)
      expect(result.current).toBe(true);

      // Wait for remaining minDuration (500 - 100 = 400ms)
      act(() => {
        vi.advanceTimersByTime(399);
      });
      expect(result.current).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe(false);
    });

    it('should hide immediately if minDuration already passed', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading, { delay: 200, minDuration: 300 }),
        { initialProps: { isLoading: true } }
      );

      // Wait for loading to show
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe(true);

      // Loading continues for 500ms (past minDuration of 300ms)
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(result.current).toBe(true);

      // Loading completes - should hide immediately since minDuration passed
      rerender({ isLoading: false });
      expect(result.current).toBe(false);
    });

    it('should work without minDuration option', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading, { delay: 200 }),
        { initialProps: { isLoading: true } }
      );

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe(true);

      // Loading completes - should hide immediately
      rerender({ isLoading: false });
      expect(result.current).toBe(false);
    });

    it('should handle minDuration of zero', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading, { delay: 200, minDuration: 0 }),
        { initialProps: { isLoading: true } }
      );

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe(true);

      rerender({ isLoading: false });
      expect(result.current).toBe(false);
    });
  });

  // ==========================================================================
  // Multiple Loading Cycles
  // ==========================================================================

  describe('multiple loading cycles', () => {
    it('should handle multiple loading cycles correctly', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading),
        { initialProps: { isLoading: false } }
      );

      // First cycle - fast (no spinner)
      rerender({ isLoading: true });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      rerender({ isLoading: false });
      expect(result.current).toBe(false);

      // Second cycle - slow (shows spinner)
      rerender({ isLoading: true });
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe(true);
      rerender({ isLoading: false });
      expect(result.current).toBe(false);

      // Third cycle - fast again (no spinner)
      rerender({ isLoading: true });
      act(() => {
        vi.advanceTimersByTime(50);
      });
      rerender({ isLoading: false });
      expect(result.current).toBe(false);
    });

    it('should reset delay timer when loading restarts', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading, { delay: 200 }),
        { initialProps: { isLoading: true } }
      );

      // Advance 150ms
      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(result.current).toBe(false);

      // Stop loading
      rerender({ isLoading: false });

      // Start loading again
      rerender({ isLoading: true });

      // Advance another 150ms (total would be 300ms if timer wasn't reset)
      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(result.current).toBe(false);

      // Advance to complete the new 200ms delay
      act(() => {
        vi.advanceTimersByTime(50);
      });
      expect(result.current).toBe(true);
    });

    it('should handle rapid loading state changes', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading),
        { initialProps: { isLoading: false } }
      );

      // Rapid toggles
      for (let i = 0; i < 10; i++) {
        rerender({ isLoading: true });
        act(() => {
          vi.advanceTimersByTime(50);
        });
        rerender({ isLoading: false });
      }

      // Should never have shown loading
      expect(result.current).toBe(false);
    });
  });

  // ==========================================================================
  // Cleanup on Unmount
  // ==========================================================================

  describe('cleanup on unmount', () => {
    it('should clear delay timer on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = renderHook(() => useDelayedLoading(true));

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should clear minDuration timer on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { result, rerender, unmount } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading, { delay: 100, minDuration: 500 }),
        { initialProps: { isLoading: true } }
      );

      // Show loading
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(true);

      // Stop loading (starts minDuration timer)
      rerender({ isLoading: false });

      // Unmount before minDuration completes
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should not cause errors when unmounting during loading', () => {
      const { unmount } = renderHook(() => useDelayedLoading(true));

      // Unmount while loading
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should not cause errors when unmounting after loading shown', () => {
      const { result, unmount } = renderHook(() => useDelayedLoading(true));

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe(true);

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle undefined options', () => {
      const { result } = renderHook(() => useDelayedLoading(true, undefined));

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current).toBe(true);
    });

    it('should handle empty options object', () => {
      const { result } = renderHook(() => useDelayedLoading(true, {}));

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current).toBe(true);
    });

    it('should handle partial options', () => {
      const { result } = renderHook(() => useDelayedLoading(true, { delay: 100 }));

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe(true);
    });

    it('should always return boolean type', () => {
      const { result } = renderHook(() => useDelayedLoading(true));

      expect(typeof result.current).toBe('boolean');

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(typeof result.current).toBe('boolean');
    });

    it('should handle loading starting as false then becoming true', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading),
        { initialProps: { isLoading: false } }
      );

      expect(result.current).toBe(false);

      rerender({ isLoading: true });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current).toBe(true);
    });
  });

  // ==========================================================================
  // Type Safety
  // ==========================================================================

  describe('type safety', () => {
    it('should return boolean', () => {
      const { result } = renderHook(() => useDelayedLoading(false));

      const value: boolean = result.current;
      expect(typeof value).toBe('boolean');
    });

    it('should accept boolean isLoading parameter', () => {
      // These should compile without errors
      renderHook(() => useDelayedLoading(true));
      renderHook(() => useDelayedLoading(false));
    });

    it('should accept options with delay', () => {
      renderHook(() => useDelayedLoading(true, { delay: 100 }));
    });

    it('should accept options with minDuration', () => {
      renderHook(() => useDelayedLoading(true, { minDuration: 100 }));
    });

    it('should accept options with both delay and minDuration', () => {
      renderHook(() => useDelayedLoading(true, { delay: 100, minDuration: 200 }));
    });
  });

  // ==========================================================================
  // Integration Scenarios
  // ==========================================================================

  describe('integration scenarios', () => {
    it('should work for typical API call pattern', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading, { delay: 200, minDuration: 400 }),
        { initialProps: { isLoading: false } }
      );

      // User clicks button, API call starts
      rerender({ isLoading: true });
      expect(result.current).toBe(false);

      // API responds quickly (150ms) - no spinner shown
      act(() => {
        vi.advanceTimersByTime(150);
      });
      rerender({ isLoading: false });
      expect(result.current).toBe(false);
    });

    it('should work for slow API call pattern', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading, { delay: 200, minDuration: 400 }),
        { initialProps: { isLoading: false } }
      );

      // User clicks button, API call starts
      rerender({ isLoading: true });

      // API is slow, spinner shows after 200ms
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe(true);

      // API responds after 300ms total (100ms after spinner shown)
      act(() => {
        vi.advanceTimersByTime(100);
      });
      rerender({ isLoading: false });

      // Spinner stays for minDuration (400ms - 100ms = 300ms remaining)
      expect(result.current).toBe(true);

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe(false);
    });

    it('should work for very slow API call pattern', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading, { delay: 200, minDuration: 400 }),
        { initialProps: { isLoading: false } }
      );

      // User clicks button, API call starts
      rerender({ isLoading: true });

      // Spinner shows after 200ms
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe(true);

      // API responds after 2 seconds (well past minDuration)
      act(() => {
        vi.advanceTimersByTime(1800);
      });
      rerender({ isLoading: false });

      // Spinner hides immediately since minDuration already passed
      expect(result.current).toBe(false);
    });
  });
});
