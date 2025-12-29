/**
 * Enterprise Error Message Registry
 * 
 * Centralized error message mapping with user-friendly messages,
 * recovery suggestions, and action handlers.
 * 
 * @module utils/errorMessages
 */

// ============================================================================
// Types
// ============================================================================

export interface ErrorMessage {
  /** User-friendly error title */
  title: string;
  /** Detailed description of what went wrong */
  description: string;
  /** Suggestion for how to resolve the issue */
  suggestion?: string;
  /** Primary action button label */
  actionLabel?: string;
  /** Action type for routing */
  actionType?: 'retry' | 'navigate' | 'upgrade' | 'contact' | 'refresh';
  /** Navigation path if actionType is 'navigate' */
  actionPath?: string;
  /** Severity level for styling */
  severity: 'error' | 'warning' | 'info';
}

export interface ParsedApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  status?: number;
}

// ============================================================================
// Error Code Registry
// ============================================================================

export const ERROR_MESSAGES: Record<string, ErrorMessage> = {
  // Authentication Errors
  AUTH_INVALID_CREDENTIALS: {
    title: 'Invalid email or password',
    description: 'The credentials you entered are incorrect.',
    suggestion: 'Check your email and password, or reset your password if you forgot it.',
    actionLabel: 'Reset Password',
    actionType: 'navigate',
    actionPath: '/auth/forgot-password',
    severity: 'error',
  },
  AUTH_EMAIL_EXISTS: {
    title: 'Email already registered',
    description: 'An account with this email already exists.',
    suggestion: 'Try logging in instead, or use a different email.',
    actionLabel: 'Go to Login',
    actionType: 'navigate',
    actionPath: '/auth/login',
    severity: 'warning',
  },
  AUTH_TOKEN_EXPIRED: {
    title: 'Session expired',
    description: 'Your session has expired for security reasons.',
    suggestion: 'Please log in again to continue.',
    actionLabel: 'Log In',
    actionType: 'navigate',
    actionPath: '/auth/login',
    severity: 'warning',
  },
  AUTH_ACCOUNT_LOCKED: {
    title: 'Account temporarily locked',
    description: 'Too many failed login attempts.',
    suggestion: 'Wait 15 minutes or reset your password to unlock.',
    actionLabel: 'Reset Password',
    actionType: 'navigate',
    actionPath: '/auth/forgot-password',
    severity: 'error',
  },
  AUTH_EMAIL_NOT_VERIFIED: {
    title: 'Email not verified',
    description: 'Please verify your email address to continue.',
    suggestion: 'Check your inbox for the verification email.',
    actionLabel: 'Resend Email',
    actionType: 'retry',
    severity: 'warning',
  },

  // Brand Kit Errors
  BRAND_KIT_LIMIT_EXCEEDED: {
    title: 'Brand kit limit reached',
    description: 'You\'ve reached the maximum number of brand kits for your plan.',
    suggestion: 'Delete an unused brand kit or upgrade to create more.',
    actionLabel: 'View Brand Kits',
    actionType: 'navigate',
    actionPath: '/dashboard/brand-kits',
    severity: 'warning',
  },
  BRAND_KIT_NOT_FOUND: {
    title: 'Brand kit not found',
    description: 'This brand kit may have been deleted or you don\'t have access.',
    suggestion: 'Select a different brand kit or create a new one.',
    actionLabel: 'Create New',
    actionType: 'navigate',
    actionPath: '/dashboard/brand-kits/new',
    severity: 'error',
  },
  BRAND_KIT_UPLOAD_FAILED: {
    title: 'Logo upload failed',
    description: 'We couldn\'t upload your logo.',
    suggestion: 'Check your file size (max 10MB) and format (PNG, JPG, SVG).',
    actionLabel: 'Try Again',
    actionType: 'retry',
    severity: 'error',
  },

  // Generation Errors
  GENERATION_RATE_LIMIT: {
    title: 'Too many requests',
    description: 'You\'ve generated too many assets recently.',
    suggestion: 'Wait a few minutes before trying again.',
    actionLabel: 'Retry',
    actionType: 'retry',
    severity: 'warning',
  },
  
  // API Rate Limit (global)
  API_RATE_LIMIT_EXCEEDED: {
    title: 'Slow down',
    description: 'You\'re making requests too quickly.',
    suggestion: 'Wait a moment and try again.',
    actionLabel: 'Retry',
    actionType: 'retry',
    severity: 'warning',
  },
  GENERATION_LIMIT_EXCEEDED: {
    title: 'Monthly limit reached',
    description: 'You\'ve used all your asset generations for this month.',
    suggestion: 'Upgrade your plan for more generations or wait until next month.',
    actionLabel: 'Upgrade Plan',
    actionType: 'upgrade',
    severity: 'warning',
  },
  GENERATION_FAILED: {
    title: 'Generation failed',
    description: 'We couldn\'t generate your asset.',
    suggestion: 'Try adjusting your prompt or using a different style.',
    actionLabel: 'Try Again',
    actionType: 'retry',
    severity: 'error',
  },
  GENERATION_TIMEOUT: {
    title: 'Generation timed out',
    description: 'The generation took too long to complete.',
    suggestion: 'Try a simpler prompt or try again later.',
    actionLabel: 'Retry',
    actionType: 'retry',
    severity: 'warning',
  },
  GENERATION_CONTENT_POLICY: {
    title: 'Content policy violation',
    description: 'Your prompt may contain content that violates our guidelines.',
    suggestion: 'Please review our content policy and adjust your prompt.',
    actionLabel: 'View Guidelines',
    actionType: 'navigate',
    actionPath: '/help/content-policy',
    severity: 'error',
  },

  // Coach Errors
  COACH_SESSION_EXPIRED: {
    title: 'Coach session expired',
    description: 'Your coaching session has timed out.',
    suggestion: 'Start a new session to continue getting help.',
    actionLabel: 'New Session',
    actionType: 'retry',
    severity: 'info',
  },
  COACH_RATE_LIMIT: {
    title: 'Coach rate limit',
    description: 'You\'ve sent too many messages.',
    suggestion: 'Wait a moment before sending another message.',
    actionLabel: 'OK',
    actionType: 'retry',
    severity: 'warning',
  },
  COACH_TIER_REQUIRED: {
    title: 'Studio tier required',
    description: 'The Prompt Coach is available for Studio tier subscribers.',
    suggestion: 'Upgrade to Studio to unlock AI-powered coaching.',
    actionLabel: 'Upgrade',
    actionType: 'upgrade',
    severity: 'info',
  },

  // Community Errors
  COMMUNITY_POST_NOT_FOUND: {
    title: 'Post not found',
    description: 'This post may have been deleted or is no longer available.',
    suggestion: 'Browse other posts in the community.',
    actionLabel: 'Go to Community',
    actionType: 'navigate',
    actionPath: '/community',
    severity: 'error',
  },
  COMMUNITY_USER_BANNED: {
    title: 'Account restricted',
    description: 'Your community access has been restricted.',
    suggestion: 'Contact support if you believe this is an error.',
    actionLabel: 'Contact Support',
    actionType: 'contact',
    severity: 'error',
  },
  COMMUNITY_EDIT_WINDOW_CLOSED: {
    title: 'Edit window closed',
    description: 'Posts can only be edited within 24 hours of creation.',
    suggestion: 'You can delete and repost if needed.',
    severity: 'warning',
  },

  // Usage Errors
  USAGE_LIMIT_EXCEEDED: {
    title: 'Usage limit reached',
    description: 'You\'ve reached your plan\'s usage limit.',
    suggestion: 'Upgrade your plan for higher limits.',
    actionLabel: 'View Plans',
    actionType: 'upgrade',
    severity: 'warning',
  },

  // Network Errors
  NETWORK_ERROR: {
    title: 'Connection error',
    description: 'We couldn\'t connect to our servers.',
    suggestion: 'Check your internet connection and try again.',
    actionLabel: 'Retry',
    actionType: 'retry',
    severity: 'error',
  },
  NETWORK_TIMEOUT: {
    title: 'Request timed out',
    description: 'The server took too long to respond.',
    suggestion: 'Please try again in a moment.',
    actionLabel: 'Retry',
    actionType: 'retry',
    severity: 'warning',
  },

  // Generic Errors
  UNKNOWN_ERROR: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred.',
    suggestion: 'Please try again or contact support if the problem persists.',
    actionLabel: 'Retry',
    actionType: 'retry',
    severity: 'error',
  },
  VALIDATION_ERROR: {
    title: 'Invalid input',
    description: 'Please check your input and try again.',
    severity: 'warning',
  },
  FORBIDDEN: {
    title: 'Access denied',
    description: 'You don\'t have permission to perform this action.',
    suggestion: 'Contact support if you believe this is an error.',
    actionLabel: 'Contact Support',
    actionType: 'contact',
    severity: 'error',
  },
  NOT_FOUND: {
    title: 'Not found',
    description: 'The requested resource could not be found.',
    suggestion: 'It may have been moved or deleted.',
    actionLabel: 'Go Home',
    actionType: 'navigate',
    actionPath: '/dashboard',
    severity: 'error',
  },
};

// ============================================================================
// Error Parsing Utilities
// ============================================================================

/**
 * Parse an API error response into a structured format.
 */
export function parseApiError(error: unknown): ParsedApiError {
  // Handle fetch Response errors
  if (error instanceof Response) {
    return {
      code: `HTTP_${error.status}`,
      message: error.statusText || 'Request failed',
      status: error.status,
    };
  }

  // Handle Error objects with response data
  if (error instanceof Error) {
    // Check for API error structure in message
    try {
      const parsed = JSON.parse(error.message);
      if (parsed.error) {
        return {
          code: parsed.error.code || 'UNKNOWN_ERROR',
          message: parsed.error.message || error.message,
          details: parsed.error.details,
        };
      }
    } catch {
      // Not JSON, use message as-is
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
    };
  }

  // Handle plain objects (API error responses)
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    
    // Standard API error format
    if (err.error && typeof err.error === 'object') {
      const apiError = err.error as Record<string, unknown>;
      return {
        code: (apiError.code as string) || 'UNKNOWN_ERROR',
        message: (apiError.message as string) || 'An error occurred',
        details: apiError.details as Record<string, unknown>,
      };
    }

    // Direct error format
    if (err.code || err.message) {
      return {
        code: (err.code as string) || 'UNKNOWN_ERROR',
        message: (err.message as string) || 'An error occurred',
        details: err.details as Record<string, unknown>,
      };
    }

    // HTTP status-based error
    if (err.status) {
      return {
        code: `HTTP_${err.status}`,
        message: (err.statusText as string) || 'Request failed',
        status: err.status as number,
      };
    }
  }

  // Fallback for unknown error types
  return {
    code: 'UNKNOWN_ERROR',
    message: String(error),
  };
}

/**
 * Get user-friendly error message from error code.
 */
export function getErrorMessage(code: string): ErrorMessage {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Get error message from parsed API error.
 */
export function getErrorFromApi(error: unknown): ErrorMessage & { originalMessage?: string } {
  const parsed = parseApiError(error);
  const errorMessage = getErrorMessage(parsed.code);
  
  return {
    ...errorMessage,
    originalMessage: parsed.message,
  };
}

/**
 * Map HTTP status codes to error codes.
 */
export function httpStatusToErrorCode(status: number): string {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'AUTH_TOKEN_EXPIRED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 408:
      return 'NETWORK_TIMEOUT';
    case 429:
      return 'GENERATION_RATE_LIMIT';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'UNKNOWN_ERROR';
    default:
      return 'UNKNOWN_ERROR';
  }
}

// ============================================================================
// Toast Integration
// ============================================================================

import { toast, type ToastAction } from '@/components/ui/Toast';

/**
 * Show an error toast with recovery action.
 */
export function showErrorToast(
  error: unknown,
  options?: {
    onRetry?: () => void;
    onNavigate?: (path: string) => void;
    onUpgrade?: () => void;
    onContact?: () => void;
  }
): string {
  const errorInfo = getErrorFromApi(error);
  
  let action: ToastAction | undefined;
  
  if (errorInfo.actionLabel && errorInfo.actionType) {
    switch (errorInfo.actionType) {
      case 'retry':
        if (options?.onRetry) {
          action = { label: errorInfo.actionLabel, onClick: options.onRetry };
        }
        break;
      case 'navigate':
        if (options?.onNavigate && errorInfo.actionPath) {
          action = { 
            label: errorInfo.actionLabel, 
            onClick: () => options.onNavigate!(errorInfo.actionPath!) 
          };
        }
        break;
      case 'upgrade':
        if (options?.onUpgrade) {
          action = { label: errorInfo.actionLabel, onClick: options.onUpgrade };
        }
        break;
      case 'contact':
        if (options?.onContact) {
          action = { label: errorInfo.actionLabel, onClick: options.onContact };
        }
        break;
      case 'refresh':
        action = { 
          label: errorInfo.actionLabel, 
          onClick: () => window.location.reload() 
        };
        break;
    }
  }

  return toast.error(errorInfo.title, {
    description: errorInfo.suggestion || errorInfo.description,
    action,
  });
}

/**
 * Show a success toast with optional next action.
 */
export function showSuccessToast(
  title: string,
  options?: {
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
  }
): string {
  return toast.success(title, {
    description: options?.description,
    action: options?.actionLabel && options?.onAction
      ? { label: options.actionLabel, onClick: options.onAction }
      : undefined,
  });
}

export default ERROR_MESSAGES;
