/**
 * Auth Store Tests
 * Comprehensive tests for the Zustand auth store
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAuthStore, type AuthState } from '../stores/authStore';
import type { User, LoginResponse, SignupResponse } from '@aurastream/api-client';

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

const mockLoginResponse: LoginResponse = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  tokenType: 'Bearer',
  expiresAt: '2024-01-01T01:00:00Z',
  user: mockUser,
};

const mockSignupResponse: SignupResponse = {
  user: mockUser,
  message: 'User created successfully',
};

// Mock API client
const mockApiClient = {
  auth: {
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
};

// Mock the dynamic import of api-client
vi.mock('@aurastream/api-client', () => ({
  apiClient: mockApiClient,
}));

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
 * Get the current store state
 */
function getState(): AuthState {
  return useAuthStore.getState();
}

// ============================================================================
// Tests
// ============================================================================

describe('AuthStore', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================================================
  // State Setters
  // ==========================================================================

  describe('setUser', () => {
    it('should set user and mark as authenticated when user is provided', () => {
      const { setUser } = getState();
      
      setUser(mockUser);
      
      const state = getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should clear user and mark as not authenticated when null is provided', () => {
      // First set a user
      useAuthStore.setState({ user: mockUser, isAuthenticated: true });
      
      const { setUser } = getState();
      setUser(null);
      
      const state = getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setLoading', () => {
    it('should set loading state to true', () => {
      const { setLoading } = getState();
      
      setLoading(true);
      
      expect(getState().isLoading).toBe(true);
    });

    it('should set loading state to false', () => {
      useAuthStore.setState({ isLoading: true });
      
      const { setLoading } = getState();
      setLoading(false);
      
      expect(getState().isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      const { setError } = getState();
      const errorMessage = 'Something went wrong';
      
      setError(errorMessage);
      
      expect(getState().error).toBe(errorMessage);
    });

    it('should clear error when null is provided', () => {
      useAuthStore.setState({ error: 'Previous error' });
      
      const { setError } = getState();
      setError(null);
      
      expect(getState().error).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear the error state', () => {
      useAuthStore.setState({ error: 'Some error' });
      
      const { clearError } = getState();
      clearError();
      
      expect(getState().error).toBeNull();
    });
  });

  // ==========================================================================
  // Login Action
  // ==========================================================================

  describe('login', () => {
    it('should update state on successful login', async () => {
      mockApiClient.auth.login.mockResolvedValueOnce(mockLoginResponse);
      
      const { login } = getState();
      await login('test@example.com', 'password123');
      
      const state = getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should call API client with correct parameters', async () => {
      mockApiClient.auth.login.mockResolvedValueOnce(mockLoginResponse);
      
      const { login } = getState();
      await login('test@example.com', 'password123', true);
      
      expect(mockApiClient.auth.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      });
    });

    it('should set tokens on successful login', async () => {
      mockApiClient.auth.login.mockResolvedValueOnce(mockLoginResponse);
      
      const { login } = getState();
      await login('test@example.com', 'password123');
      
      expect(mockApiClient.setTokens).toHaveBeenCalledWith(
        'mock-access-token',
        'mock-refresh-token'
      );
    });

    it('should set loading state during login', async () => {
      let loadingDuringRequest = false;
      
      mockApiClient.auth.login.mockImplementationOnce(async () => {
        loadingDuringRequest = getState().isLoading;
        return mockLoginResponse;
      });
      
      const { login } = getState();
      await login('test@example.com', 'password123');
      
      expect(loadingDuringRequest).toBe(true);
      expect(getState().isLoading).toBe(false);
    });

    it('should set error on failed login', async () => {
      const errorMessage = 'Invalid credentials';
      mockApiClient.auth.login.mockRejectedValueOnce(new Error(errorMessage));
      
      const { login } = getState();
      
      await expect(login('test@example.com', 'wrongpassword')).rejects.toThrow(errorMessage);
      
      const state = getState();
      expect(state.error).toBe(errorMessage);
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it('should clear previous error before login attempt', async () => {
      useAuthStore.setState({ error: 'Previous error' });
      
      let errorDuringRequest: string | null = 'not-checked';
      mockApiClient.auth.login.mockImplementationOnce(async () => {
        errorDuringRequest = getState().error;
        return mockLoginResponse;
      });
      
      const { login } = getState();
      await login('test@example.com', 'password123');
      
      expect(errorDuringRequest).toBeNull();
    });

    it('should handle rememberMe parameter defaulting to false', async () => {
      mockApiClient.auth.login.mockResolvedValueOnce(mockLoginResponse);
      
      const { login } = getState();
      await login('test@example.com', 'password123');
      
      expect(mockApiClient.auth.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      });
    });
  });

  // ==========================================================================
  // Signup Action
  // ==========================================================================

  describe('signup', () => {
    it('should update state on successful signup', async () => {
      mockApiClient.auth.signup.mockResolvedValueOnce(mockSignupResponse);
      
      const { signup } = getState();
      await signup('test@example.com', 'password123', 'Test User');
      
      const state = getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(false); // User needs to login after signup
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should call API client with correct parameters', async () => {
      mockApiClient.auth.signup.mockResolvedValueOnce(mockSignupResponse);
      
      const { signup } = getState();
      await signup('test@example.com', 'password123', 'Test User');
      
      expect(mockApiClient.auth.signup).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      });
    });

    it('should set loading state during signup', async () => {
      let loadingDuringRequest = false;
      
      mockApiClient.auth.signup.mockImplementationOnce(async () => {
        loadingDuringRequest = getState().isLoading;
        return mockSignupResponse;
      });
      
      const { signup } = getState();
      await signup('test@example.com', 'password123', 'Test User');
      
      expect(loadingDuringRequest).toBe(true);
      expect(getState().isLoading).toBe(false);
    });

    it('should set error on failed signup', async () => {
      const errorMessage = 'Email already exists';
      mockApiClient.auth.signup.mockRejectedValueOnce(new Error(errorMessage));
      
      const { signup } = getState();
      
      await expect(signup('test@example.com', 'password123', 'Test User')).rejects.toThrow(errorMessage);
      
      const state = getState();
      expect(state.error).toBe(errorMessage);
      expect(state.isLoading).toBe(false);
      expect(state.user).toBeNull();
    });

    it('should not set isAuthenticated to true after signup', async () => {
      mockApiClient.auth.signup.mockResolvedValueOnce(mockSignupResponse);
      
      const { signup } = getState();
      await signup('test@example.com', 'password123', 'Test User');
      
      // User should not be authenticated until they login
      expect(getState().isAuthenticated).toBe(false);
    });

    it('should clear previous error before signup attempt', async () => {
      useAuthStore.setState({ error: 'Previous error' });
      
      let errorDuringRequest: string | null = 'not-checked';
      mockApiClient.auth.signup.mockImplementationOnce(async () => {
        errorDuringRequest = getState().error;
        return mockSignupResponse;
      });
      
      const { signup } = getState();
      await signup('test@example.com', 'password123', 'Test User');
      
      expect(errorDuringRequest).toBeNull();
    });
  });

  // ==========================================================================
  // Logout Action
  // ==========================================================================

  describe('logout', () => {
    beforeEach(() => {
      // Set up authenticated state before logout tests
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    });

    it('should clear user and tokens on logout', async () => {
      mockApiClient.auth.logout.mockResolvedValueOnce({ message: 'Logged out' });
      
      const { logout } = getState();
      await logout();
      
      const state = getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should call API client logout', async () => {
      mockApiClient.auth.logout.mockResolvedValueOnce({ message: 'Logged out' });
      
      const { logout } = getState();
      await logout();
      
      expect(mockApiClient.auth.logout).toHaveBeenCalled();
    });

    it('should clear tokens via API client', async () => {
      mockApiClient.auth.logout.mockResolvedValueOnce({ message: 'Logged out' });
      
      const { logout } = getState();
      await logout();
      
      expect(mockApiClient.clearTokens).toHaveBeenCalled();
    });

    it('should clear state even if API call fails', async () => {
      mockApiClient.auth.logout.mockRejectedValueOnce(new Error('Network error'));
      
      const { logout } = getState();
      await logout();
      
      const state = getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(mockApiClient.clearTokens).toHaveBeenCalled();
    });

    it('should set loading state during logout', async () => {
      let loadingDuringRequest = false;
      
      mockApiClient.auth.logout.mockImplementationOnce(async () => {
        loadingDuringRequest = getState().isLoading;
        return { message: 'Logged out' };
      });
      
      const { logout } = getState();
      await logout();
      
      expect(loadingDuringRequest).toBe(true);
      expect(getState().isLoading).toBe(false);
    });
  });

  // ==========================================================================
  // Refresh User Action
  // ==========================================================================

  describe('refreshUser', () => {
    it('should update user data on successful refresh', async () => {
      const updatedUser = { ...mockUser, displayName: 'Updated Name' };
      mockApiClient.auth.me.mockResolvedValueOnce(updatedUser);
      
      const { refreshUser } = getState();
      await refreshUser();
      
      const state = getState();
      expect(state.user).toEqual(updatedUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should call API client me endpoint', async () => {
      mockApiClient.auth.me.mockResolvedValueOnce(mockUser);
      
      const { refreshUser } = getState();
      await refreshUser();
      
      expect(mockApiClient.auth.me).toHaveBeenCalled();
    });

    it('should set loading state during refresh', async () => {
      let loadingDuringRequest = false;
      
      mockApiClient.auth.me.mockImplementationOnce(async () => {
        loadingDuringRequest = getState().isLoading;
        return mockUser;
      });
      
      const { refreshUser } = getState();
      await refreshUser();
      
      expect(loadingDuringRequest).toBe(true);
      expect(getState().isLoading).toBe(false);
    });

    it('should clear user on failed refresh', async () => {
      useAuthStore.setState({ user: mockUser, isAuthenticated: true });
      mockApiClient.auth.me.mockRejectedValueOnce(new Error('Unauthorized'));
      
      const { refreshUser } = getState();
      await refreshUser();
      
      const state = getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('should not throw error on failed refresh', async () => {
      mockApiClient.auth.me.mockRejectedValueOnce(new Error('Network error'));
      
      const { refreshUser } = getState();
      
      // Should not throw
      await expect(refreshUser()).resolves.toBeUndefined();
    });
  });

  // ==========================================================================
  // Initial State
  // ==========================================================================

  describe('initial state', () => {
    it('should have correct initial values', () => {
      resetStore();
      
      const state = getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  // ==========================================================================
  // State Transitions
  // ==========================================================================

  describe('state transitions', () => {
    it('should handle login -> logout flow correctly', async () => {
      mockApiClient.auth.login.mockResolvedValueOnce(mockLoginResponse);
      mockApiClient.auth.logout.mockResolvedValueOnce({ message: 'Logged out' });
      
      // Login
      const { login } = getState();
      await login('test@example.com', 'password123');
      
      expect(getState().isAuthenticated).toBe(true);
      expect(getState().user).toEqual(mockUser);
      
      // Logout
      const { logout } = getState();
      await logout();
      
      expect(getState().isAuthenticated).toBe(false);
      expect(getState().user).toBeNull();
    });

    it('should handle signup -> login flow correctly', async () => {
      mockApiClient.auth.signup.mockResolvedValueOnce(mockSignupResponse);
      mockApiClient.auth.login.mockResolvedValueOnce(mockLoginResponse);
      
      // Signup
      const { signup } = getState();
      await signup('test@example.com', 'password123', 'Test User');
      
      expect(getState().isAuthenticated).toBe(false);
      expect(getState().user).toEqual(mockUser);
      
      // Login
      const { login } = getState();
      await login('test@example.com', 'password123');
      
      expect(getState().isAuthenticated).toBe(true);
      expect(getState().user).toEqual(mockUser);
    });

    it('should handle error -> success transition', async () => {
      // First, fail login
      mockApiClient.auth.login.mockRejectedValueOnce(new Error('Invalid credentials'));
      
      const { login } = getState();
      await expect(login('test@example.com', 'wrongpassword')).rejects.toThrow();
      
      expect(getState().error).toBe('Invalid credentials');
      
      // Then, succeed login
      mockApiClient.auth.login.mockResolvedValueOnce(mockLoginResponse);
      
      await login('test@example.com', 'password123');
      
      expect(getState().error).toBeNull();
      expect(getState().isAuthenticated).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle rapid state changes', () => {
      const { setLoading, setUser, setError } = getState();
      
      // Rapid state changes should all be applied
      setLoading(true);
      setLoading(false);
      setUser(mockUser);
      setError('Error');
      setError(null);
      
      expect(getState().isAuthenticated).toBe(true);
      expect(getState().error).toBeNull();
      expect(getState().isLoading).toBe(false);
    });

    it('should handle empty error message', async () => {
      mockApiClient.auth.login.mockRejectedValueOnce(new Error(''));
      
      const { login } = getState();
      
      await expect(login('test@example.com', 'password')).rejects.toThrow();
      
      expect(getState().error).toBe('');
    });

    it('should handle undefined error message', async () => {
      const errorWithoutMessage = { message: undefined };
      mockApiClient.auth.login.mockRejectedValueOnce(errorWithoutMessage);
      
      const { login } = getState();
      
      await expect(login('test@example.com', 'password')).rejects.toBeDefined();
    });
  });
});
