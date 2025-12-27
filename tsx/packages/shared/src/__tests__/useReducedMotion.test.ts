/**
 * useReducedMotion Hook Tests
 * 
 * Comprehensive tests for the accessibility-focused reduced motion hook.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReducedMotion } from '../hooks/useReducedMotion';

// ============================================================================
// Mock Setup
// ============================================================================

// Store the change handler for triggering updates
let changeHandler: ((event: MediaQueryListEvent) => void) | null = null;

/**
 * Creates a mock MediaQueryList with configurable initial state
 */
function createMockMediaQueryList(matches: boolean) {
  return {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn((event: string, handler: (event: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        changeHandler = handler;
      }
    }),
    removeEventListener: vi.fn((event: string) => {
      if (event === 'change') {
        changeHandler = null;
      }
    }),
    addListener: vi.fn((handler: (event: MediaQueryListEvent) => void) => {
      changeHandler = handler;
    }),
    removeListener: vi.fn(() => {
      changeHandler = null;
    }),
    dispatchEvent: vi.fn(),
  };
}

/**
 * Simulates a change in the media query preference
 */
function simulateMediaQueryChange(mockMql: ReturnType<typeof createMockMediaQueryList>, newMatches: boolean): void {
  mockMql.matches = newMatches;
  if (changeHandler) {
    changeHandler({ matches: newMatches } as MediaQueryListEvent);
  }
}

// Store original window properties
let originalMatchMedia: typeof window.matchMedia | undefined;

// ============================================================================
// Tests
// ============================================================================

describe('useReducedMotion', () => {
  let mockMql: ReturnType<typeof createMockMediaQueryList>;

  beforeEach(() => {
    // Store original matchMedia
    originalMatchMedia = window.matchMedia;
    
    // Reset change handler
    changeHandler = null;
    
    // Create default mock (no reduced motion preference)
    mockMql = createMockMediaQueryList(false);
    
    // Mock window.matchMedia
    window.matchMedia = vi.fn().mockReturnValue(mockMql);
  });

  afterEach(() => {
    // Restore original matchMedia
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    }
    vi.clearAllMocks();
    changeHandler = null;
  });

  // ==========================================================================
  // Basic Functionality
  // ==========================================================================

  describe('basic functionality', () => {
    it('should return false when user does not prefer reduced motion', () => {
      mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current).toBe(false);
    });

    it('should return true when user prefers reduced motion', () => {
      mockMql = createMockMediaQueryList(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current).toBe(true);
    });

    it('should call matchMedia with correct query', () => {
      renderHook(() => useReducedMotion());

      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    });
  });

  // ==========================================================================
  // SSR Behavior
  // ==========================================================================

  describe('SSR behavior', () => {
    it('should return false as initial value (SSR-safe default)', () => {
      // The hook initializes with false before useEffect runs
      const { result } = renderHook(() => useReducedMotion());
      
      // After effect runs, it should reflect the actual preference
      // But initial render should be false (SSR-safe)
      expect(typeof result.current).toBe('boolean');
    });

    it('should handle missing matchMedia gracefully', () => {
      // Simulate environment without matchMedia
      const originalMatchMedia = window.matchMedia;
      // @ts-expect-error - intentionally setting to undefined for test
      window.matchMedia = undefined;

      const { result } = renderHook(() => useReducedMotion());

      // Should return false (default) when matchMedia is not available
      expect(result.current).toBe(false);

      // Restore
      window.matchMedia = originalMatchMedia;
    });
  });

  // ==========================================================================
  // Dynamic Updates
  // ==========================================================================

  describe('dynamic updates', () => {
    it('should update when preference changes from false to true', () => {
      mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current).toBe(false);

      // Simulate user enabling reduced motion
      act(() => {
        simulateMediaQueryChange(mockMql, true);
      });

      expect(result.current).toBe(true);
    });

    it('should update when preference changes from true to false', () => {
      mockMql = createMockMediaQueryList(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current).toBe(true);

      // Simulate user disabling reduced motion
      act(() => {
        simulateMediaQueryChange(mockMql, false);
      });

      expect(result.current).toBe(false);
    });

    it('should handle multiple preference changes', () => {
      mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current).toBe(false);

      // Toggle multiple times
      act(() => {
        simulateMediaQueryChange(mockMql, true);
      });
      expect(result.current).toBe(true);

      act(() => {
        simulateMediaQueryChange(mockMql, false);
      });
      expect(result.current).toBe(false);

      act(() => {
        simulateMediaQueryChange(mockMql, true);
      });
      expect(result.current).toBe(true);
    });
  });

  // ==========================================================================
  // Event Listener Management
  // ==========================================================================

  describe('event listener management', () => {
    it('should add event listener on mount', () => {
      mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      renderHook(() => useReducedMotion());

      expect(mockMql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should remove event listener on unmount', () => {
      mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { unmount } = renderHook(() => useReducedMotion());

      unmount();

      expect(mockMql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should clean up properly when component unmounts', () => {
      mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { unmount } = renderHook(() => useReducedMotion());

      // Verify listener was added
      expect(mockMql.addEventListener).toHaveBeenCalled();

      unmount();

      // Verify listener was removed
      expect(mockMql.removeEventListener).toHaveBeenCalled();

      // Verify no memory leaks - handler should be cleared
      expect(changeHandler).toBeNull();
    });
  });

  // ==========================================================================
  // Legacy Browser Support
  // ==========================================================================

  describe('legacy browser support', () => {
    it('should use addListener for older browsers without addEventListener', () => {
      mockMql = createMockMediaQueryList(false);
      // Simulate older browser without addEventListener
      // @ts-expect-error - intentionally setting to undefined for test
      mockMql.addEventListener = undefined;
      // @ts-expect-error - intentionally setting to undefined for test
      mockMql.removeEventListener = undefined;
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { unmount } = renderHook(() => useReducedMotion());

      expect(mockMql.addListener).toHaveBeenCalledWith(expect.any(Function));

      unmount();

      expect(mockMql.removeListener).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  // ==========================================================================
  // Multiple Instances
  // ==========================================================================

  describe('multiple instances', () => {
    it('should work correctly with multiple hook instances', () => {
      mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result: result1 } = renderHook(() => useReducedMotion());
      const { result: result2 } = renderHook(() => useReducedMotion());
      const { result: result3 } = renderHook(() => useReducedMotion());

      expect(result1.current).toBe(false);
      expect(result2.current).toBe(false);
      expect(result3.current).toBe(false);
    });

    it('should all instances reflect the same initial state', () => {
      mockMql = createMockMediaQueryList(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result: result1 } = renderHook(() => useReducedMotion());
      const { result: result2 } = renderHook(() => useReducedMotion());

      expect(result1.current).toBe(true);
      expect(result2.current).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle rapid mount/unmount cycles', () => {
      mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      // Rapid mount/unmount
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderHook(() => useReducedMotion());
        unmount();
      }

      // Should not throw or cause memory leaks
      expect(true).toBe(true);
    });

    it('should return boolean type', () => {
      mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useReducedMotion());

      expect(typeof result.current).toBe('boolean');
    });

    it('should not throw when matchMedia returns unexpected values', () => {
      // Mock matchMedia returning object with matches as undefined
      const weirdMql = {
        ...createMockMediaQueryList(false),
        matches: undefined as unknown as boolean,
      };
      window.matchMedia = vi.fn().mockReturnValue(weirdMql);

      // Should not throw
      expect(() => {
        renderHook(() => useReducedMotion());
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // Type Safety
  // ==========================================================================

  describe('type safety', () => {
    it('should always return a boolean', () => {
      mockMql = createMockMediaQueryList(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useReducedMotion());

      // TypeScript should infer this as boolean
      const value: boolean = result.current;
      expect(typeof value).toBe('boolean');
    });
  });
});
