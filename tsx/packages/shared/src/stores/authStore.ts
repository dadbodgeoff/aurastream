// Auth Store using Zustand
// Manages authentication state across the application

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@aurastream/api-client';
import { LEGAL_VERSIONS } from '../constants/legal';

export interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Auth actions (these call the API client)
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (email: string, password: string, displayName: string, acceptTerms?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // State setters
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Auth actions
      login: async (email, password, rememberMe = false) => {
        set({ isLoading: true, error: null });
        try {
          // Import API client dynamically to avoid circular deps
          const { apiClient } = await import('@aurastream/api-client');
          const response = await apiClient.auth.login({ email, password, rememberMe });
          apiClient.setTokens(response.accessToken, response.refreshToken);
          set({ user: response.user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      signup: async (email, password, displayName, acceptTerms = true) => {
        set({ isLoading: true, error: null });
        try {
          const { apiClient } = await import('@aurastream/api-client');
          const response = await apiClient.auth.signup({ 
            email, 
            password, 
            displayName,
            acceptTerms,
            termsVersion: LEGAL_VERSIONS.TERMS_OF_SERVICE,
            privacyVersion: LEGAL_VERSIONS.PRIVACY_POLICY,
          });
          set({ user: response.user, isAuthenticated: false, isLoading: false });
          // Note: User needs to login after signup
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          const { apiClient } = await import('@aurastream/api-client');
          await apiClient.auth.logout();
          apiClient.clearTokens();
          set({ user: null, isAuthenticated: false, isLoading: false, error: null });
        } catch (error) {
          // Still clear local state even if API call fails
          const { apiClient } = await import('@aurastream/api-client');
          apiClient.clearTokens();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      refreshUser: async () => {
        set({ isLoading: true });
        try {
          const { apiClient } = await import('@aurastream/api-client');
          const user = await apiClient.auth.me();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => {
        // Use localStorage for web, will be overridden for mobile
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
