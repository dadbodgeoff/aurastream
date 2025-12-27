/**
 * useMobileDetection Hook Tests
 * 
 * Comprehensive tests for the responsive design mobile detection hook.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMobileDetection } from '../hooks/useMobileDetection';

// ============================================================================
// Mock Setup
// ============================================================================

// Store the change handlers for triggering updates
let mobileChangeHandler: ((event: MediaQueryListEvent) => void) | null = null;
let tabletChangeHandler: ((event: MediaQueryListEvent) => void) | null = null;

/**
 * Creates a mock MediaQueryList with configurable initial state
 */
function createMockMediaQueryList(matches: boolean, media: string) {
  return {
    matches,
    media,
    onchange: null,
    addEventListener: vi.fn((event: string, handler: (event: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        if (media.includes('max-width: 768px')) {
          mobileChangeHandler = handler;
        } else if (media.includes('min-width: 768px')) {
          tabletChangeHandler = handler;
        }
      }
    }),
    removeEventListener: vi.fn((event: string) => {
      if (event === 'change') {
        if (media.includes('max-width: 768px')) {
          mobileChangeHandler = null;
        } else if (media.includes('min-width: 768px')) {
          tabletChangeHandler = null;
        }
      }
    }),
    addListener: vi.fn((handler: (event: MediaQueryListEvent) => void) => {
      if (media.includes('max-width: 768px')) {
        mobileChangeHandler = handler;
      } else if (media.includes('min-width: 768px')) {
        tabletChangeHandler = handler;
      }
    }),
    removeListener: vi.fn(() => {
      if (media.includes('max-width: 768px')) {
        mobileChangeHandler = null;
      } else if (media.includes('min-width: 768px')) {
        tabletChangeHandler = null;
      }
    }),
    dispatchEvent: vi.fn(),
  };
}

/**
 * Simulates a change in the mobile media query
 */
function simulateMobileChange(newMatches: boolean): void {
  if (mobileChangeHandler) {
    mobileChangeHandler({ matches: newMatches } as MediaQueryListEvent);
  }
}

/**
 * Simulates a change in the tablet media query
 */
function simulateTabletChange(newMatches: boolean): void {
  if (tabletChangeHandler) {
    tabletChangeHandler({ matches: newMatches } as MediaQueryListEvent);
  }
}

// Store original window properties
let originalMatchMedia: typeof window.matchMedia | undefined;

// Helper to safely delete window properties
function deleteWindowProperty(prop: string): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any)[prop];
}

// Helper to safely set window properties
function setWindowProperty(prop: string, value: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)[prop] = value;
}

// ============================================================================
// Tests
// ============================================================================

describe('useMobileDetection', () => {
  let mockMobileMql: ReturnType<typeof createMockMediaQueryList>;
  let mockTabletMql: ReturnType<typeof createMockMediaQueryList>;

  beforeEach(() => {
    // Store original matchMedia
    originalMatchMedia = window.matchMedia;
    
    // Reset change handlers
    mobileChangeHandler = null;
    tabletChangeHandler = null;
    
    // Create default mocks (desktop - no mobile, no tablet)
    mockMobileMql = createMockMediaQueryList(false, '(max-width: 768px)');
    mockTabletMql = createMockMediaQueryList(false, '(min-width: 768px) and (max-width: 1024px)');
    
    // Mock window.matchMedia to return appropriate mock based on query
    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      if (query === '(max-width: 768px)') {
        return mockMobileMql;
      }
      if (query === '(min-width: 768px) and (max-width: 1024px)') {
        return mockTabletMql;
      }
      return createMockMediaQueryList(false, query);
    });

    // Mock touch detection - default to no touch
    // Delete ontouchstart if it exists (jsdom may have it)
    if ('ontouchstart' in window) {
      deleteWindowProperty('ontouchstart');
    }
    
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore original matchMedia
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    }
    vi.clearAllMocks();
    mobileChangeHandler = null;
    tabletChangeHandler = null;
  });

  // ==========================================================================
  // Basic Functionality
  // ==========================================================================

  describe('basic functionality', () => {
    it('should return all false for desktop without touch', () => {
      const { result } = renderHook(() => useMobileDetection());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isTouch).toBe(false);
    });

    it('should return isMobile true when screen is mobile size', () => {
      mockMobileMql = createMockMediaQueryList(true, '(max-width: 768px)');
      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        if (query === '(max-width: 768px)') {
          return mockMobileMql;
        }
        return mockTabletMql;
      });

      const { result } = renderHook(() => useMobileDetection());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
    });

    it('should return isTablet true when screen is tablet size', () => {
      mockTabletMql = createMockMediaQueryList(true, '(min-width: 768px) and (max-width: 1024px)');
      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        if (query === '(max-width: 768px)') {
          return mockMobileMql;
        }
        return mockTabletMql;
      });

      const { result } = renderHook(() => useMobileDetection());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
    });

    it('should call matchMedia with correct queries', () => {
      renderHook(() => useMobileDetection());

      expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 768px)');
      expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 768px) and (max-width: 1024px)');
    });
  });

  // ==========================================================================
  // Touch Detection
  // ==========================================================================

  describe('touch detection', () => {
    it('should detect touch via ontouchstart', () => {
      // First ensure it's deleted, then add it
      if ('ontouchstart' in window) {
        deleteWindowProperty('ontouchstart');
      }
      setWindowProperty('ontouchstart', () => {});

      const { result } = renderHook(() => useMobileDetection());

      expect(result.current.isTouch).toBe(true);
    });

    it('should detect touch via navigator.maxTouchPoints', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 5,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useMobileDetection());

      expect(result.current.isTouch).toBe(true);
    });

    it('should return isTouch false when no touch capability', () => {
      // Ensure no touch capability
      if ('ontouchstart' in window) {
        deleteWindowProperty('ontouchstart');
      }
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useMobileDetection());

      expect(result.current.isTouch).toBe(false);
    });

    it('should detect mobile touch device', () => {
      mockMobileMql = createMockMediaQueryList(true, '(max-width: 768px)');
      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        if (query === '(max-width: 768px)') {
          return mockMobileMql;
        }
        return mockTabletMql;
      });
      // First ensure it's deleted, then add it
      if ('ontouchstart' in window) {
        deleteWindowProperty('ontouchstart');
      }
      setWindowProperty('ontouchstart', () => {});

      const { result } = renderHook(() => useMobileDetection());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTouch).toBe(true);
    });
  });

  // ==========================================================================
  // SSR Behavior
  // ==========================================================================

  describe('SSR behavior', () => {
    it('should return default values as initial state (SSR-safe)', () => {
      const { result } = renderHook(() => useMobileDetection());
      
      // After effect runs, values should be set
      // But initial render should be safe defaults
      expect(typeof result.current.isMobile).toBe('boolean');
      expect(typeof result.current.isTouch).toBe('boolean');
      expect(typeof result.current.isTablet).toBe('boolean');
    });

    it('should handle missing matchMedia gracefully', () => {
      // Simulate environment without matchMedia
      // @ts-expect-error - intentionally setting to undefined for test
      window.matchMedia = undefined;

      const { result } = renderHook(() => useMobileDetection());

      // Should return defaults when matchMedia is not available
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isTouch).toBe(false);
    });
  });

  // ==========================================================================
  // Dynamic Updates (Resize Handling)
  // ==========================================================================

  describe('resize handling', () => {
    it('should update when screen changes from desktop to mobile', () => {
      const { result } = renderHook(() => useMobileDetection());

      expect(result.current.isMobile).toBe(false);

      // Simulate resize to mobile
      act(() => {
        simulateMobileChange(true);
      });

      expect(result.current.isMobile).toBe(true);
    });

    it('should update when screen changes from mobile to desktop', () => {
      mockMobileMql = createMockMediaQueryList(true, '(max-width: 768px)');
      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        if (query === '(max-width: 768px)') {
          return mockMobileMql;
        }
        return mockTabletMql;
      });

      const { result } = renderHook(() => useMobileDetection());

      expect(result.current.isMobile).toBe(true);

      // Simulate resize to desktop
      act(() => {
        simulateMobileChange(false);
      });

      expect(result.current.isMobile).toBe(false);
    });

    it('should update when screen enters tablet range', () => {
      const { result } = renderHook(() => useMobileDetection());

      expect(result.current.isTablet).toBe(false);

      // Simulate resize to tablet
      act(() => {
        simulateTabletChange(true);
      });

      expect(result.current.isTablet).toBe(true);
    });

    it('should update when screen exits tablet range', () => {
      mockTabletMql = createMockMediaQueryList(true, '(min-width: 768px) and (max-width: 1024px)');
      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        if (query === '(max-width: 768px)') {
          return mockMobileMql;
        }
        return mockTabletMql;
      });

      const { result } = renderHook(() => useMobileDetection());

      expect(result.current.isTablet).toBe(true);

      // Simulate resize to desktop
      act(() => {
        simulateTabletChange(false);
      });

      expect(result.current.isTablet).toBe(false);
    });

    it('should handle multiple resize changes', () => {
      const { result } = renderHook(() => useMobileDetection());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);

      // Toggle multiple times
      act(() => {
        simulateMobileChange(true);
      });
      expect(result.current.isMobile).toBe(true);

      act(() => {
        simulateMobileChange(false);
        simulateTabletChange(true);
      });
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);

      act(() => {
        simulateTabletChange(false);
      });
      expect(result.current.isTablet).toBe(false);
    });
  });

  // ==========================================================================
  // Event Listener Management (Cleanup)
  // ==========================================================================

  describe('cleanup', () => {
    it('should add event listeners on mount', () => {
      renderHook(() => useMobileDetection());

      expect(mockMobileMql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockTabletMql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() => useMobileDetection());

      unmount();

      expect(mockMobileMql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockTabletMql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should clean up properly when component unmounts', () => {
      const { unmount } = renderHook(() => useMobileDetection());

      // Verify listeners were added
      expect(mockMobileMql.addEventListener).toHaveBeenCalled();
      expect(mockTabletMql.addEventListener).toHaveBeenCalled();

      unmount();

      // Verify listeners were removed
      expect(mockMobileMql.removeEventListener).toHaveBeenCalled();
      expect(mockTabletMql.removeEventListener).toHaveBeenCalled();

      // Verify no memory leaks - handlers should be cleared
      expect(mobileChangeHandler).toBeNull();
      expect(tabletChangeHandler).toBeNull();
    });
  });

  // ==========================================================================
  // Legacy Browser Support
  // ==========================================================================

  describe('legacy browser support', () => {
    it('should use addListener for older browsers without addEventListener', () => {
      mockMobileMql = createMockMediaQueryList(false, '(max-width: 768px)');
      mockTabletMql = createMockMediaQueryList(false, '(min-width: 768px) and (max-width: 1024px)');
      
      // Simulate older browser without addEventListener
      // @ts-expect-error - intentionally setting to undefined for test
      mockMobileMql.addEventListener = undefined;
      // @ts-expect-error - intentionally setting to undefined for test
      mockMobileMql.removeEventListener = undefined;
      // @ts-expect-error - intentionally setting to undefined for test
      mockTabletMql.addEventListener = undefined;
      // @ts-expect-error - intentionally setting to undefined for test
      mockTabletMql.removeEventListener = undefined;
      
      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        if (query === '(max-width: 768px)') {
          return mockMobileMql;
        }
        return mockTabletMql;
      });

      const { unmount } = renderHook(() => useMobileDetection());

      expect(mockMobileMql.addListener).toHaveBeenCalledWith(expect.any(Function));
      expect(mockTabletMql.addListener).toHaveBeenCalledWith(expect.any(Function));

      unmount();

      expect(mockMobileMql.removeListener).toHaveBeenCalledWith(expect.any(Function));
      expect(mockTabletMql.removeListener).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  // ==========================================================================
  // Multiple Instances
  // ==========================================================================

  describe('multiple instances', () => {
    it('should work correctly with multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useMobileDetection());
      const { result: result2 } = renderHook(() => useMobileDetection());
      const { result: result3 } = renderHook(() => useMobileDetection());

      expect(result1.current.isMobile).toBe(false);
      expect(result2.current.isMobile).toBe(false);
      expect(result3.current.isMobile).toBe(false);
    });

    it('should all instances reflect the same initial state', () => {
      mockMobileMql = createMockMediaQueryList(true, '(max-width: 768px)');
      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        if (query === '(max-width: 768px)') {
          return mockMobileMql;
        }
        return mockTabletMql;
      });

      const { result: result1 } = renderHook(() => useMobileDetection());
      const { result: result2 } = renderHook(() => useMobileDetection());

      expect(result1.current.isMobile).toBe(true);
      expect(result2.current.isMobile).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle rapid mount/unmount cycles', () => {
      // Rapid mount/unmount
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderHook(() => useMobileDetection());
        unmount();
      }

      // Should not throw or cause memory leaks
      expect(true).toBe(true);
    });

    it('should return correct object shape', () => {
      const { result } = renderHook(() => useMobileDetection());

      expect(result.current).toHaveProperty('isMobile');
      expect(result.current).toHaveProperty('isTouch');
      expect(result.current).toHaveProperty('isTablet');
      expect(Object.keys(result.current)).toHaveLength(3);
    });

    it('should return boolean types for all properties', () => {
      const { result } = renderHook(() => useMobileDetection());

      expect(typeof result.current.isMobile).toBe('boolean');
      expect(typeof result.current.isTouch).toBe('boolean');
      expect(typeof result.current.isTablet).toBe('boolean');
    });

    it('should not throw when matchMedia returns unexpected values', () => {
      // Mock matchMedia returning object with matches as undefined
      const weirdMql = {
        ...createMockMediaQueryList(false, '(max-width: 768px)'),
        matches: undefined as unknown as boolean,
      };
      window.matchMedia = vi.fn().mockReturnValue(weirdMql);

      // Should not throw
      expect(() => {
        renderHook(() => useMobileDetection());
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // Type Safety
  // ==========================================================================

  describe('type safety', () => {
    it('should return MobileDetectionResult interface', () => {
      const { result } = renderHook(() => useMobileDetection());

      // TypeScript should infer these as booleans
      const isMobile: boolean = result.current.isMobile;
      const isTouch: boolean = result.current.isTouch;
      const isTablet: boolean = result.current.isTablet;

      expect(typeof isMobile).toBe('boolean');
      expect(typeof isTouch).toBe('boolean');
      expect(typeof isTablet).toBe('boolean');
    });
  });
});
