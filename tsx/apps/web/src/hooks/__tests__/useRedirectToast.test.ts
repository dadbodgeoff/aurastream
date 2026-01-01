/**
 * useRedirectToast Hook Tests
 * 
 * Unit tests for the redirect toast notification hook.
 * Tests localStorage persistence, auto-dismiss, and message handling.
 * 
 * @module hooks/__tests__/useRedirectToast
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { 
  useRedirectToast, 
  REDIRECT_MESSAGES,
  clearAllRedirectToasts,
  clearRedirectToast,
  isRedirectToastShown,
  type RedirectKey 
} from '../useRedirectToast';

// =============================================================================
// Mocks
// =============================================================================

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// =============================================================================
// Test Suite
// =============================================================================

describe('useRedirectToast', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should show toast on first visit', () => {
      const { result } = renderHook(() => useRedirectToast('quick-create'));
      
      expect(result.current.showToast).toBe(true);
      expect(result.current.message).toBe(REDIRECT_MESSAGES['quick-create']);
    });

    it('should not show toast if already shown', () => {
      // Mark as shown
      localStorageMock.setItem(
        'aurastream_redirect_toasts_shown',
        JSON.stringify(['quick-create'])
      );

      const { result } = renderHook(() => useRedirectToast('quick-create'));
      
      expect(result.current.showToast).toBe(false);
    });

    it('should use custom message when provided', () => {
      const customMessage = 'Custom redirect message';
      const { result } = renderHook(() => 
        useRedirectToast('quick-create', customMessage)
      );
      
      expect(result.current.message).toBe(customMessage);
    });
  });

  describe('Predefined Messages', () => {
    const redirectKeys: RedirectKey[] = [
      'quick-create',
      'coach',
      'promo',
      'trends',
      'playbook',
      'clip-radar',
    ];

    redirectKeys.forEach((key) => {
      it(`should have predefined message for ${key}`, () => {
        expect(REDIRECT_MESSAGES[key]).toBeDefined();
        expect(typeof REDIRECT_MESSAGES[key]).toBe('string');
        expect(REDIRECT_MESSAGES[key].length).toBeGreaterThan(0);
      });
    });

    it('should return correct message for quick-create', () => {
      const { result } = renderHook(() => useRedirectToast('quick-create'));
      expect(result.current.message).toContain('Quick Create');
      expect(result.current.message).toContain('Templates');
    });

    it('should return correct message for coach', () => {
      const { result } = renderHook(() => useRedirectToast('coach'));
      expect(result.current.message).toContain('AI Coach');
    });

    it('should return correct message for promo', () => {
      const { result } = renderHook(() => useRedirectToast('promo'));
      expect(result.current.message).toContain('Promo Board');
      expect(result.current.message).toContain('Community');
    });
  });

  describe('Dismiss Functionality', () => {
    it('should hide toast when dismissToast is called', () => {
      const { result } = renderHook(() => useRedirectToast('quick-create'));
      
      expect(result.current.showToast).toBe(true);
      
      act(() => {
        result.current.dismissToast();
      });
      
      expect(result.current.showToast).toBe(false);
    });

    it('should persist dismissal to localStorage', () => {
      const { result } = renderHook(() => useRedirectToast('quick-create'));
      
      act(() => {
        result.current.dismissToast();
      });
      
      // Check localStorage was updated
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('Auto-Dismiss', () => {
    it('should auto-dismiss after default timeout', async () => {
      const { result } = renderHook(() => useRedirectToast('quick-create'));
      
      expect(result.current.showToast).toBe(true);
      
      // Fast-forward past default timeout (5000ms)
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      expect(result.current.showToast).toBe(false);
    });

    it('should auto-dismiss after custom timeout', async () => {
      const { result } = renderHook(() => 
        useRedirectToast('quick-create', undefined, { autoDismissMs: 2000 })
      );
      
      expect(result.current.showToast).toBe(true);
      
      // Fast-forward past custom timeout
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      
      expect(result.current.showToast).toBe(false);
    });

    it('should not auto-dismiss if timeout is 0', async () => {
      const { result } = renderHook(() => 
        useRedirectToast('quick-create', undefined, { autoDismissMs: 0 })
      );
      
      expect(result.current.showToast).toBe(true);
      
      // Fast-forward a long time
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      
      // Should still be showing
      expect(result.current.showToast).toBe(true);
    });

    it('should clear timer when dismissed manually', () => {
      const { result } = renderHook(() => useRedirectToast('quick-create'));
      
      // Dismiss manually before auto-dismiss
      act(() => {
        result.current.dismissToast();
      });
      
      expect(result.current.showToast).toBe(false);
      
      // Fast-forward - should not cause any issues
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      
      expect(result.current.showToast).toBe(false);
    });
  });

  describe('Persistence Options', () => {
    it('should persist by default', () => {
      renderHook(() => useRedirectToast('quick-create'));
      
      // Should have saved to localStorage
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should not persist when persist option is false', () => {
      localStorageMock.setItem.mockClear();
      
      renderHook(() => 
        useRedirectToast('quick-create', undefined, { persist: false })
      );
      
      // Should not have saved to localStorage on mount
      // (only saves on dismiss when persist is false)
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Redirect Keys', () => {
    it('should track different redirect keys independently', () => {
      // Show quick-create toast
      const { result: result1 } = renderHook(() => useRedirectToast('quick-create'));
      expect(result1.current.showToast).toBe(true);
      
      // Dismiss it
      act(() => {
        result1.current.dismissToast();
      });
      
      // Coach toast should still show
      const { result: result2 } = renderHook(() => useRedirectToast('coach'));
      expect(result2.current.showToast).toBe(true);
    });

    it('should not show toast for already-shown key', () => {
      // Mark multiple as shown
      localStorageMock.setItem(
        'aurastream_redirect_toasts_shown',
        JSON.stringify(['quick-create', 'coach'])
      );

      const { result: result1 } = renderHook(() => useRedirectToast('quick-create'));
      const { result: result2 } = renderHook(() => useRedirectToast('coach'));
      const { result: result3 } = renderHook(() => useRedirectToast('promo'));
      
      expect(result1.current.showToast).toBe(false);
      expect(result2.current.showToast).toBe(false);
      expect(result3.current.showToast).toBe(true); // Not in list
    });
  });

  describe('Utility Functions', () => {
    describe('clearAllRedirectToasts', () => {
      it('should clear all stored toast states', () => {
        localStorageMock.setItem(
          'aurastream_redirect_toasts_shown',
          JSON.stringify(['quick-create', 'coach'])
        );
        
        clearAllRedirectToasts();
        
        expect(localStorageMock.removeItem).toHaveBeenCalledWith(
          'aurastream_redirect_toasts_shown'
        );
      });
    });

    describe('clearRedirectToast', () => {
      it('should clear specific toast state', () => {
        localStorageMock.setItem(
          'aurastream_redirect_toasts_shown',
          JSON.stringify(['quick-create', 'coach'])
        );
        
        clearRedirectToast('quick-create');
        
        // Should have updated localStorage
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });
    });

    describe('isRedirectToastShown', () => {
      it('should return true for shown toast', () => {
        localStorageMock.setItem(
          'aurastream_redirect_toasts_shown',
          JSON.stringify(['quick-create'])
        );
        
        expect(isRedirectToastShown('quick-create')).toBe(true);
      });

      it('should return false for not-shown toast', () => {
        localStorageMock.setItem(
          'aurastream_redirect_toasts_shown',
          JSON.stringify(['quick-create'])
        );
        
        expect(isRedirectToastShown('coach')).toBe(false);
      });

      it('should return false when no toasts stored', () => {
        expect(isRedirectToastShown('quick-create')).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json');
      
      // Should not throw
      const { result } = renderHook(() => useRedirectToast('quick-create'));
      
      // Should show toast (treats as not shown)
      expect(result.current.showToast).toBe(true);
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full');
      });
      
      // Should not throw
      const { result } = renderHook(() => useRedirectToast('quick-create'));
      
      expect(result.current.showToast).toBe(true);
    });
  });
});
