import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMicroInteraction } from '../useMicroInteraction';

// Mock useReducedMotion
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

describe('useMicroInteraction', () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    mockElement = document.createElement('div');
    mockElement.animate = vi.fn().mockReturnValue({
      onfinish: null,
      cancel: vi.fn(),
    });
  });

  it('should return all interaction functions', () => {
    const { result } = renderHook(() => useMicroInteraction());

    expect(typeof result.current.triggerSuccess).toBe('function');
    expect(typeof result.current.triggerError).toBe('function');
    expect(typeof result.current.triggerLoading).toBe('function');
    expect(typeof result.current.triggerHover).toBe('function');
    expect(typeof result.current.triggerPress).toBe('function');
    expect(typeof result.current.triggerBounce).toBe('function');
  });

  it('should trigger success animation on element', () => {
    const { result } = renderHook(() => useMicroInteraction());

    result.current.triggerSuccess(mockElement);

    expect(mockElement.animate).toHaveBeenCalled();
  });

  it('should trigger error animation on element', () => {
    const { result } = renderHook(() => useMicroInteraction());

    result.current.triggerError(mockElement);

    expect(mockElement.animate).toHaveBeenCalled();
  });

  it('should return cleanup function for loading animation', () => {
    const { result } = renderHook(() => useMicroInteraction());

    const cleanup = result.current.triggerLoading(mockElement);

    expect(typeof cleanup).toBe('function');
    expect(mockElement.animate).toHaveBeenCalled();
  });

  it('should trigger press animation on element', () => {
    const { result } = renderHook(() => useMicroInteraction());

    result.current.triggerPress(mockElement);

    expect(mockElement.animate).toHaveBeenCalled();
  });

  it('should trigger bounce animation on element', () => {
    const { result } = renderHook(() => useMicroInteraction());

    result.current.triggerBounce(mockElement);

    expect(mockElement.animate).toHaveBeenCalled();
  });

  it('should accept ref objects', () => {
    const { result } = renderHook(() => useMicroInteraction());
    const ref = { current: mockElement };

    result.current.triggerSuccess(ref);

    expect(mockElement.animate).toHaveBeenCalled();
  });

  it('should trigger hover animation on element', () => {
    const { result } = renderHook(() => useMicroInteraction());

    result.current.triggerHover(mockElement);

    expect(mockElement.animate).toHaveBeenCalled();
  });

  it('should call onComplete callback when animation finishes', () => {
    const onComplete = vi.fn();
    const mockAnimation = {
      onfinish: null as (() => void) | null,
      cancel: vi.fn(),
    };
    mockElement.animate = vi.fn().mockReturnValue(mockAnimation);

    const { result } = renderHook(() => useMicroInteraction());

    result.current.triggerSuccess(mockElement, { onComplete });

    // Simulate animation finish
    if (mockAnimation.onfinish) {
      mockAnimation.onfinish();
    }

    expect(onComplete).toHaveBeenCalled();
  });

  it('should use custom duration when provided', () => {
    const { result } = renderHook(() => useMicroInteraction());

    result.current.triggerSuccess(mockElement, { duration: 500 });

    expect(mockElement.animate).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ duration: 500 })
    );
  });

  it('should handle null element gracefully', () => {
    const { result } = renderHook(() => useMicroInteraction());
    const ref = { current: null };

    // Should not throw
    expect(() => result.current.triggerSuccess(ref as React.RefObject<HTMLElement>)).not.toThrow();
  });

  it('should cleanup previous animation before starting new one', () => {
    const cancelFn = vi.fn();
    const mockAnimation = {
      onfinish: null as (() => void) | null,
      cancel: cancelFn,
    };
    mockElement.animate = vi.fn().mockReturnValue(mockAnimation);

    const { result } = renderHook(() => useMicroInteraction());

    // Trigger first animation
    result.current.triggerSuccess(mockElement);
    
    // Trigger second animation on same element
    result.current.triggerSuccess(mockElement);

    // First animation should be cancelled
    expect(cancelFn).toHaveBeenCalled();
  });

  describe('reduced motion', () => {
    it('should skip animations when reduced motion is preferred', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);

      const { result } = renderHook(() => useMicroInteraction());

      result.current.triggerSuccess(mockElement);

      expect(mockElement.animate).not.toHaveBeenCalled();
    });

    it('should still call onComplete when reduced motion is preferred', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);

      const onComplete = vi.fn();
      const { result } = renderHook(() => useMicroInteraction());

      result.current.triggerSuccess(mockElement, { onComplete });

      expect(onComplete).toHaveBeenCalled();
    });

    it('should return noop cleanup for loading when reduced motion is preferred', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);

      const { result } = renderHook(() => useMicroInteraction());

      const cleanup = result.current.triggerLoading(mockElement);

      expect(typeof cleanup).toBe('function');
      expect(mockElement.animate).not.toHaveBeenCalled();
    });

    it('should expose prefersReducedMotion state', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);

      const { result } = renderHook(() => useMicroInteraction());

      expect(result.current.prefersReducedMotion).toBe(true);
    });
  });
});
