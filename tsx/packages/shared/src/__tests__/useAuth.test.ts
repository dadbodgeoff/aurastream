/**
 * Auth Hooks Tests
 * Comprehensive tests for authentication hooks
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useAuth,
  useUser,
  useIsAuthenticated,
  useRequireAuth,
  useAuthLoading,
  useAuthError,
} from '../hooks/useAuth';
import { useAuthStore } from '../stores/authStore';
import type { User } from '@aurastream/api-client';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock user data
const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  emailVerified: true,
  displayName: 'Test User',
  avatarUrl: null,
  subscriptionTier: 'free',
  subscriptionStatus: 'active',
  assetsGeneratedThisMonth: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Mock window.location
const mockLocation = {
  href: '',
};

// Store original window.location
const originalLocation = global.window?.location;

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Reset the store to initial state before each test
 */
function resetStore() {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });
}

/**
 * Set up authenticated state
 */
function setAuthenticatedState() {
  useAuthStore.setState({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    error: null,
  });
}

/**
 * Set up loading state
 */
function setLoadingState() {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });
}

/**
 * Set up error state
 */
function setErrorState(error: string) {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error,
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('Auth Hooks', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
    
    // Mock window.location
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });
      mockLocation.href = '';
    }
  });

  afterEach(() => {
    vi.resetAllMocks();
    
    // Restore original window.location
    if (typeof window !== 'undefined' && originalLocation) {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    }
  });

  // ==========================================================================
  // useAuth Hook
  // ==========================================================================

  describe('useAuth', () => {
    it('should return the complete auth store state', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
    });

    it('should return auth actions', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current).toHaveProperty('login');
      expect(result.current).toHaveProperty('signup');
      expect(result.current).toHaveProperty('logout');
      expect(result.current).toHaveProperty('refreshUser');
      expect(result.current).toHaveProperty('setUser');
      expect(result.current).toHaveProperty('setLoading');
      expect(result.current).toHaveProperty('setError');
      expect(result.current).toHaveProperty('clearError');
    });

    it('should return initial unauthenticated state', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return authenticated state when user is logged in', () => {
      setAuthenticatedState();
      
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should update when store state changes', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.isAuthenticated).toBe(false);
      
      act(() => {
        useAuthStore.setState({ user: mockUser, isAuthenticated: true });
      });
      
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it('should return loading state correctly', () => {
      setLoadingState();
      
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.isLoading).toBe(true);
    });

    it('should return error state correctly', () => {
      const errorMessage = 'Authentication failed';
      setErrorState(errorMessage);
      
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.error).toBe(errorMessage);
    });
  });

  // ==========================================================================
  // useUser Hook
  // ==========================================================================

  describe('useUser', () => {
    it('should return null when not authenticated', () => {
      const { result } = renderHook(() => useUser());
      
      expect(result.current).toBeNull();
    });

    it('should return current user when authenticated', () => {
      setAuthenticatedState();
      
      const { result } = renderHook(() => useUser());
      
      expect(result.current).toEqual(mockUser);
    });

    it('should update when user changes', () => {
      const { result } = renderHook(() => useUser());
      
      expect(result.current).toBeNull();
      
      act(() => {
        useAuthStore.setState({ user: mockUser, isAuthenticated: true });
      });
      
      expect(result.current).toEqual(mockUser);
    });

    it('should return null after logout', () => {
      setAuthenticatedState();
      
      const { result } = renderHook(() => useUser());
      
      expect(result.current).toEqual(mockUser);
      
      act(() => {
        useAuthStore.setState({ user: null, isAuthenticated: false });
      });
      
      expect(result.current).toBeNull();
    });

    it('should return updated user data after refresh', () => {
      setAuthenticatedState();
      
      const { result } = renderHook(() => useUser());
      
      const updatedUser = { ...mockUser, displayName: 'Updated Name' };
      
      act(() => {
        useAuthStore.setState({ user: updatedUser });
      });
      
      expect(result.current?.displayName).toBe('Updated Name');
    });
  });

  // ==========================================================================
  // useIsAuthenticated Hook
  // ==========================================================================

  describe('useIsAuthenticated', () => {
    it('should return false when not authenticated', () => {
      const { result } = renderHook(() => useIsAuthenticated());
      
      expect(result.current).toBe(false);
    });

    it('should return true when authenticated', () => {
      setAuthenticatedState();
      
      const { result } = renderHook(() => useIsAuthenticated());
      
      expect(result.current).toBe(true);
    });

    it('should update when authentication state changes', () => {
      const { result } = renderHook(() => useIsAuthenticated());
      
      expect(result.current).toBe(false);
      
      act(() => {
        useAuthStore.setState({ user: mockUser, isAuthenticated: true });
      });
      
      expect(result.current).toBe(true);
    });

    it('should return false after logout', () => {
      setAuthenticatedState();
      
      const { result } = renderHook(() => useIsAuthenticated());
      
      expect(result.current).toBe(true);
      
      act(() => {
        useAuthStore.setState({ user: null, isAuthenticated: false });
      });
      
      expect(result.current).toBe(false);
    });
  });

  // ==========================================================================
  // useRequireAuth Hook
  // ==========================================================================

  describe('useRequireAuth', () => {
    it('should return isAuthenticated and isLoading', () => {
      const { result } = renderHook(() => useRequireAuth());
      
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('isLoading');
    });

    it('should redirect to /login when not authenticated and not loading', async () => {
      const { result } = renderHook(() => useRequireAuth());
      
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });
      
      // Check redirect happened
      if (typeof window !== 'undefined') {
        expect(mockLocation.href).toBe('/login');
      }
    });

    it('should redirect to custom path when specified', async () => {
      const customPath = '/auth/signin';
      
      const { result } = renderHook(() => useRequireAuth(customPath));
      
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });
      
      if (typeof window !== 'undefined') {
        expect(mockLocation.href).toBe(customPath);
      }
    });

    it('should not redirect when authenticated', async () => {
      setAuthenticatedState();
      
      const { result } = renderHook(() => useRequireAuth());
      
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
      
      // Should not redirect
      if (typeof window !== 'undefined') {
        expect(mockLocation.href).toBe('');
      }
    });

    it('should not redirect while loading', async () => {
      setLoadingState();
      
      const { result } = renderHook(() => useRequireAuth());
      
      expect(result.current.isLoading).toBe(true);
      
      // Should not redirect while loading
      if (typeof window !== 'undefined') {
        expect(mockLocation.href).toBe('');
      }
    });

    it('should redirect after loading completes if not authenticated', async () => {
      setLoadingState();
      
      const { result } = renderHook(() => useRequireAuth());
      
      // Initially loading, no redirect
      expect(result.current.isLoading).toBe(true);
      if (typeof window !== 'undefined') {
        expect(mockLocation.href).toBe('');
      }
      
      // Complete loading without authentication
      act(() => {
        useAuthStore.setState({ isLoading: false, isAuthenticated: false });
      });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      // Now should redirect
      if (typeof window !== 'undefined') {
        expect(mockLocation.href).toBe('/login');
      }
    });

    it('should not redirect after loading completes if authenticated', async () => {
      setLoadingState();
      
      const { result } = renderHook(() => useRequireAuth());
      
      // Complete loading with authentication
      act(() => {
        useAuthStore.setState({
          isLoading: false,
          isAuthenticated: true,
          user: mockUser,
        });
      });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isAuthenticated).toBe(true);
      });
      
      // Should not redirect
      if (typeof window !== 'undefined') {
        expect(mockLocation.href).toBe('');
      }
    });
  });

  // ==========================================================================
  // useAuthLoading Hook
  // ==========================================================================

  describe('useAuthLoading', () => {
    it('should return false when not loading', () => {
      const { result } = renderHook(() => useAuthLoading());
      
      expect(result.current).toBe(false);
    });

    it('should return true when loading', () => {
      setLoadingState();
      
      const { result } = renderHook(() => useAuthLoading());
      
      expect(result.current).toBe(true);
    });

    it('should update when loading state changes', () => {
      const { result } = renderHook(() => useAuthLoading());
      
      expect(result.current).toBe(false);
      
      act(() => {
        useAuthStore.setState({ isLoading: true });
      });
      
      expect(result.current).toBe(true);
      
      act(() => {
        useAuthStore.setState({ isLoading: false });
      });
      
      expect(result.current).toBe(false);
    });
  });

  // ==========================================================================
  // useAuthError Hook
  // ==========================================================================

  describe('useAuthError', () => {
    it('should return null when no error', () => {
      const { result } = renderHook(() => useAuthError());
      
      expect(result.current).toBeNull();
    });

    it('should return error message when error exists', () => {
      const errorMessage = 'Invalid credentials';
      setErrorState(errorMessage);
      
      const { result } = renderHook(() => useAuthError());
      
      expect(result.current).toBe(errorMessage);
    });

    it('should update when error state changes', () => {
      const { result } = renderHook(() => useAuthError());
      
      expect(result.current).toBeNull();
      
      act(() => {
        useAuthStore.setState({ error: 'New error' });
      });
      
      expect(result.current).toBe('New error');
    });

    it('should return null after error is cleared', () => {
      setErrorState('Some error');
      
      const { result } = renderHook(() => useAuthError());
      
      expect(result.current).toBe('Some error');
      
      act(() => {
        useAuthStore.setState({ error: null });
      });
      
      expect(result.current).toBeNull();
    });
  });

  // ==========================================================================
  // Hook Integration Tests
  // ==========================================================================

  describe('hook integration', () => {
    it('should all hooks reflect consistent state', () => {
      setAuthenticatedState();
      
      const { result: authResult } = renderHook(() => useAuth());
      const { result: userResult } = renderHook(() => useUser());
      const { result: isAuthResult } = renderHook(() => useIsAuthenticated());
      const { result: loadingResult } = renderHook(() => useAuthLoading());
      const { result: errorResult } = renderHook(() => useAuthError());
      
      expect(authResult.current.user).toEqual(userResult.current);
      expect(authResult.current.isAuthenticated).toBe(isAuthResult.current);
      expect(authResult.current.isLoading).toBe(loadingResult.current);
      expect(authResult.current.error).toBe(errorResult.current);
    });

    it('should all hooks update together when state changes', () => {
      const { result: authResult } = renderHook(() => useAuth());
      const { result: userResult } = renderHook(() => useUser());
      const { result: isAuthResult } = renderHook(() => useIsAuthenticated());
      
      // Initial state
      expect(authResult.current.isAuthenticated).toBe(false);
      expect(userResult.current).toBeNull();
      expect(isAuthResult.current).toBe(false);
      
      // Update state
      act(() => {
        useAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
        });
      });
      
      // All hooks should reflect new state
      expect(authResult.current.isAuthenticated).toBe(true);
      expect(authResult.current.user).toEqual(mockUser);
      expect(userResult.current).toEqual(mockUser);
      expect(isAuthResult.current).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle rapid state changes', () => {
      const { result } = renderHook(() => useAuth());
      
      act(() => {
        useAuthStore.setState({ isLoading: true });
        useAuthStore.setState({ isLoading: false, user: mockUser, isAuthenticated: true });
        useAuthStore.setState({ error: 'Error' });
        useAuthStore.setState({ error: null });
      });
      
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should handle user with minimal data', () => {
      const minimalUser: User = {
        id: 'min-user',
        email: 'min@test.com',
        emailVerified: false,
        displayName: '',
        avatarUrl: null,
        subscriptionTier: 'free',
        subscriptionStatus: 'none',
        assetsGeneratedThisMonth: 0,
        createdAt: '',
        updatedAt: '',
      };
      
      act(() => {
        useAuthStore.setState({ user: minimalUser, isAuthenticated: true });
      });
      
      const { result } = renderHook(() => useUser());
      
      expect(result.current).toEqual(minimalUser);
    });

    it('should handle multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useIsAuthenticated());
      const { result: result2 } = renderHook(() => useIsAuthenticated());
      const { result: result3 } = renderHook(() => useIsAuthenticated());
      
      expect(result1.current).toBe(false);
      expect(result2.current).toBe(false);
      expect(result3.current).toBe(false);
      
      act(() => {
        useAuthStore.setState({ isAuthenticated: true, user: mockUser });
      });
      
      expect(result1.current).toBe(true);
      expect(result2.current).toBe(true);
      expect(result3.current).toBe(true);
    });
  });
});
