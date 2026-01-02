/**
 * TanStack Query hooks for extended auth operations.
 * Provides hooks for password reset, profile updates, and account management.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  PasswordResetRequest,
  PasswordResetConfirm,
  ProfileUpdate,
  PasswordChange,
  AccountDelete,
  MessageResponse,
} from '../types/auth';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : 'http://localhost:8000';

function getAccessToken(): string | null {
  return apiClient.getAccessToken();
}

// ============================================================================
// Query Keys
// ============================================================================

export const authExtendedKeys = {
  all: ['authExtended'] as const,
  user: () => ['user', 'me'] as const,
};

// ============================================================================
// Password Reset Hooks
// ============================================================================

/**
 * Request a password reset email
 * POST /auth/password-reset/request
 */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (data: PasswordResetRequest): Promise<MessageResponse> => {
      const response = await fetch(`${API_BASE}/api/v1/auth/password-reset/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || error.message || 'Failed to request password reset');
      }
      
      return response.json();
    },
  });
}

/**
 * Confirm password reset with token and new password
 * POST /auth/password-reset/confirm
 */
export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: async (data: PasswordResetConfirm): Promise<MessageResponse> => {
      const response = await fetch(`${API_BASE}/api/v1/auth/password-reset/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: data.token,
          new_password: data.newPassword,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || error.message || 'Failed to reset password');
      }
      
      return response.json();
    },
  });
}

// ============================================================================
// Email Verification Hooks
// ============================================================================

/**
 * Request email verification resend
 * POST /auth/email/verify/request
 */
export function useRequestEmailVerification() {
  return useMutation({
    mutationFn: async (): Promise<MessageResponse> => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/v1/auth/email/verify/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || error.message || 'Failed to request email verification');
      }
      
      return response.json();
    },
  });
}

// ============================================================================
// Profile Hooks
// ============================================================================

/**
 * Update user profile
 * PUT /auth/me
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: ProfileUpdate): Promise<MessageResponse> => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: data.displayName,
          avatar_url: data.avatarUrl,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || error.message || 'Failed to update profile');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authExtendedKeys.user() });
    },
  });
}

// ============================================================================
// Password Change Hooks
// ============================================================================

/**
 * Change user password
 * POST /auth/me/password
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: PasswordChange): Promise<MessageResponse> => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/v1/auth/me/password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: data.currentPassword,
          new_password: data.newPassword,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || error.message || 'Failed to change password');
      }
      
      return response.json();
    },
  });
}

// ============================================================================
// Account Deletion Hooks
// ============================================================================

/**
 * Delete user account
 * DELETE /auth/me
 */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (data: AccountDelete): Promise<MessageResponse> => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: data.password,
          confirmation: data.confirmation,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || error.message || 'Failed to delete account');
      }
      
      return response.json();
    },
  });
}
