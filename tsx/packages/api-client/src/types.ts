// API Types for Streamer Studio
// Matches backend Pydantic schemas (using camelCase in TypeScript)

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string | null;
  subscriptionTier: 'free' | 'pro' | 'studio';
  subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'none';
  assetsGeneratedThisMonth: number;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
  privacyAcceptedAt: string | null;
  privacyVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Auth Request Types
// ============================================================================

export interface SignupRequest {
  email: string;
  password: string;
  displayName: string;
  acceptTerms: boolean;
  termsVersion?: string;
  privacyVersion?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface OAuthCallbackRequest {
  code: string;
  state: string;
}

// ============================================================================
// Auth Response Types
// ============================================================================

export interface SignupResponse {
  user: User;
  message: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: string;
  user: User;
  csrfToken?: string;
}

export interface RefreshResponse {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
}

export interface LogoutResponse {
  message: string;
}

export interface OAuthInitiateResponse {
  authorizationUrl: string;
  state: string;
}

export interface PasswordStrengthResponse {
  isValid: boolean;
  score: number;
  strengthLabel: string;
  failedRequirements: string[];
  suggestions: string[];
}

// ============================================================================
// Error Types
// ============================================================================

export interface APIErrorDetail {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface APIError {
  error: APIErrorDetail;
  meta?: ResponseMeta;
}

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
}

// ============================================================================
// API Response Envelope
// ============================================================================

export interface APIResponse<T> {
  data: T;
  meta: ResponseMeta;
}

// ============================================================================
// Feature Types (Brand Kit, Generation, Assets)
// ============================================================================

export interface BrandKit {
  id: string;
  userId: string;
  name: string;
  primaryColors: string[];
  accentColors: string[];
  fontPrimary: string | null;
  fontSecondary: string | null;
  logoUrl: string | null;
  tone: string;
  keywords: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationJob {
  id: string;
  userId: string;
  brandKitId: string | null;
  assetType: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'partial';
  prompt: string;
  parameters: Record<string, unknown>;
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface Asset {
  id: string;
  userId: string;
  jobId: string;
  brandKitId: string | null;
  assetType: string;
  cdnUrl: string;
  thumbnailUrl: string | null;
  metadata: Record<string, unknown>;
  viralScore: number | null;
  isFavorite: boolean;
  createdAt: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export type SubscriptionTier = User['subscriptionTier'];
export type SubscriptionStatus = User['subscriptionStatus'];
export type JobStatus = GenerationJob['status'];
