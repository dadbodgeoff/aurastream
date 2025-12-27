/**
 * Auth Extended Types
 * Types for password reset, profile management, and account operations.
 */

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface ProfileUpdate {
  displayName?: string;
  avatarUrl?: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

export interface AccountDelete {
  password: string;
  confirmation: 'DELETE';
}

export interface MessageResponse {
  message: string;
}
