import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewTransition } from '../useViewTransition';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('useViewTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any document modifications
    if (typeof document !== 'undefined') {
      document.documentElement.style.removeProperty('--view-transition-name');
    }
  });

  it('should return isSupported based on browser capability', () => {
    const { result } = renderHook(() => useViewTransition());
    
    // In test environment, startViewTransition is not available
    expect(result.current.isSupported).toBe(false);
  });

  it('should return isTransitioning as false initially', () => {
    const { result } = renderHook(() => useViewTransition());
    
    expect(result.current.isTransitioning).toBe(false);
  });

  it('should fall back to normal navigation when not supported', () => {
    const { result } = renderHook(() => useViewTransition());
    
    act(() => {
      result.current.navigateWithTransition('/test-page');
    });

    expect(mockPush).toHaveBeenCalledWith('/test-page');
  });

  it('should provide navigateWithTransition function', () => {
    const { result } = renderHook(() => useViewTransition());
    
    expect(typeof result.current.navigateWithTransition).toBe('function');
  });

  it('should handle options parameter', () => {
    const onTransitionStart = vi.fn();
    const { result } = renderHook(() => useViewTransition());
    
    act(() => {
      result.current.navigateWithTransition('/test', {
        transitionName: 'custom',
        onTransitionStart,
      });
    });

    // In unsupported browser, callbacks are not called
    expect(mockPush).toHaveBeenCalledWith('/test');
  });
});
