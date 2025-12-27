// Auth hooks for easy access to auth state and actions

import { useAuthStore } from '../stores/authStore';
import { useEffect } from 'react';

/**
 * Main auth hook - provides access to auth state and actions
 */
export function useAuth() {
  const store = useAuthStore();
  return store;
}

/**
 * Hook that returns the current user or null
 */
export function useUser() {
  return useAuthStore((state) => state.user);
}

/**
 * Hook that returns whether the user is authenticated
 */
export function useIsAuthenticated() {
  return useAuthStore((state) => state.isAuthenticated);
}

/**
 * Hook that redirects to login if not authenticated
 * For use in protected routes
 */
export function useRequireAuth(redirectTo: string = '/login') {
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect logic - will be implemented differently for web vs mobile
      if (typeof window !== 'undefined') {
        window.location.href = redirectTo;
      }
    }
  }, [isAuthenticated, isLoading, redirectTo]);

  return { isAuthenticated, isLoading };
}

/**
 * Hook that returns auth loading state
 */
export function useAuthLoading() {
  return useAuthStore((state) => state.isLoading);
}

/**
 * Hook that returns auth error
 */
export function useAuthError() {
  return useAuthStore((state) => state.error);
}
