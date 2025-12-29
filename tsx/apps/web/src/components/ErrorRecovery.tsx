/**
 * Enterprise Error Recovery System
 * 
 * Contextual error recovery UI with guided resolution steps,
 * retry mechanisms, and navigation helpers.
 * 
 * @module components/ErrorRecovery
 */

'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  getErrorFromApi, 
  showErrorToast,
  type ErrorMessage,
  type ParsedApiError,
  parseApiError,
} from '@/utils/errorMessages';

// ============================================================================
// Types
// ============================================================================

export interface ErrorRecoveryProps {
  /** The error to display */
  error: unknown;
  /** Retry handler */
  onRetry?: () => void | Promise<void>;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Custom recovery actions */
  customActions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  /** Display variant */
  variant?: 'inline' | 'card' | 'fullscreen';
  /** Additional CSS classes */
  className?: string;
  /** Show countdown timer for rate limits */
  retryAfter?: number;
}

export interface UseErrorRecoveryOptions {
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Delay between retries (ms) */
  retryDelay?: number;
  /** Exponential backoff multiplier */
  backoffMultiplier?: number;
  /** Show toast on error */
  showToast?: boolean;
}

export interface UseErrorRecoveryReturn {
  /** Current error state */
  error: unknown | null;
  /** Parsed error info */
  errorInfo: ErrorMessage | null;
  /** Whether currently retrying */
  isRetrying: boolean;
  /** Current retry count */
  retryCount: number;
  /** Set error state */
  setError: (error: unknown | null) => void;
  /** Clear error state */
  clearError: () => void;
  /** Execute with retry logic */
  executeWithRetry: <T>(fn: () => Promise<T>) => Promise<T>;
  /** Manual retry trigger */
  retry: () => void;
}

// ============================================================================
// Hook: useErrorRecovery
// ============================================================================

/**
 * Hook for managing error state with retry logic.
 */
export function useErrorRecovery(
  options: UseErrorRecoveryOptions = {}
): UseErrorRecoveryReturn {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoffMultiplier = 2,
    showToast = true,
  } = options;

  const router = useRouter();
  const [error, setErrorState] = useState<unknown | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorMessage | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastOperation, setLastOperation] = useState<(() => Promise<unknown>) | null>(null);

  const setError = useCallback((err: unknown | null) => {
    setErrorState(err);
    if (err) {
      const info = getErrorFromApi(err);
      setErrorInfo(info);
      
      if (showToast) {
        showErrorToast(err, {
          onRetry: lastOperation ? () => {
            setRetryCount(0);
            lastOperation?.();
          } : undefined,
          onNavigate: (path) => router.push(path),
          onUpgrade: () => router.push('/pricing'),
          onContact: () => router.push('/support'),
        });
      }
    } else {
      setErrorInfo(null);
    }
  }, [showToast, router, lastOperation]);

  const clearError = useCallback(() => {
    setErrorState(null);
    setErrorInfo(null);
    setRetryCount(0);
  }, []);

  const executeWithRetry = useCallback(async <T,>(
    fn: () => Promise<T>
  ): Promise<T> => {
    setLastOperation(() => fn);
    setIsRetrying(true);
    
    let lastError: unknown;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        clearError();
        setIsRetrying(false);
        return result;
      } catch (err) {
        lastError = err;
        setRetryCount(attempt + 1);
        
        // Check if error is retryable
        const parsed = parseApiError(err);
        const nonRetryableCodes = [
          'AUTH_INVALID_CREDENTIALS',
          'FORBIDDEN',
          'NOT_FOUND',
          'VALIDATION_ERROR',
          'COMMUNITY_USER_BANNED',
        ];
        
        if (nonRetryableCodes.includes(parsed.code)) {
          break;
        }
        
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(backoffMultiplier, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    setIsRetrying(false);
    setError(lastError);
    throw lastError;
  }, [maxRetries, retryDelay, backoffMultiplier, setError, clearError]);

  const retry = useCallback(() => {
    if (lastOperation) {
      executeWithRetry(lastOperation);
    }
  }, [lastOperation, executeWithRetry]);

  return {
    error,
    errorInfo,
    isRetrying,
    retryCount,
    setError,
    clearError,
    executeWithRetry,
    retry,
  };
}

// ============================================================================
// ErrorRecovery Component
// ============================================================================

/**
 * Error recovery UI component with contextual guidance.
 */
export function ErrorRecovery({
  error,
  onRetry,
  isRetrying = false,
  customActions,
  variant = 'card',
  className,
  retryAfter,
}: ErrorRecoveryProps): JSX.Element {
  const router = useRouter();
  const errorInfo = getErrorFromApi(error);
  const [countdown, setCountdown] = useState(retryAfter || 0);

  // Countdown timer for rate limits
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(c => Math.max(0, c - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  const handleAction = useCallback(() => {
    if (!errorInfo.actionType) return;
    
    switch (errorInfo.actionType) {
      case 'retry':
        onRetry?.();
        break;
      case 'navigate':
        if (errorInfo.actionPath) {
          router.push(errorInfo.actionPath);
        }
        break;
      case 'upgrade':
        router.push('/pricing');
        break;
      case 'contact':
        router.push('/support');
        break;
      case 'refresh':
        window.location.reload();
        break;
    }
  }, [errorInfo, onRetry, router]);

  // Inline variant
  if (variant === 'inline') {
    return (
      <div className={cn(
        'flex items-center gap-2 text-sm',
        errorInfo.severity === 'error' && 'text-red-600',
        errorInfo.severity === 'warning' && 'text-yellow-600',
        errorInfo.severity === 'info' && 'text-blue-600',
        className,
      )}>
        <span>⚠️ {errorInfo.title}</span>
        {onRetry && countdown === 0 && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="underline hover:no-underline disabled:opacity-50"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
        {countdown > 0 && (
          <span className="text-text-tertiary">
            Retry in {countdown}s
          </span>
        )}
      </div>
    );
  }

  // Card variant
  if (variant === 'card') {
    return (
      <div className={cn(
        'rounded-xl border p-6',
        errorInfo.severity === 'error' && 'bg-red-500/5 border-red-500/20',
        errorInfo.severity === 'warning' && 'bg-yellow-500/5 border-yellow-500/20',
        errorInfo.severity === 'info' && 'bg-blue-500/5 border-blue-500/20',
        className,
      )}>
        {/* Icon */}
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center mb-4',
          errorInfo.severity === 'error' && 'bg-red-500/10 text-red-500',
          errorInfo.severity === 'warning' && 'bg-yellow-500/10 text-yellow-500',
          errorInfo.severity === 'info' && 'bg-blue-500/10 text-blue-500',
        )}>
          {errorInfo.severity === 'error' && '✕'}
          {errorInfo.severity === 'warning' && '⚠'}
          {errorInfo.severity === 'info' && 'ℹ'}
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {errorInfo.title}
        </h3>
        <p className="text-sm text-text-secondary mb-2">
          {errorInfo.description}
        </p>
        {errorInfo.suggestion && (
          <p className="text-sm text-text-tertiary mb-4">
            💡 {errorInfo.suggestion}
          </p>
        )}

        {/* Countdown */}
        {countdown > 0 && (
          <p className="text-sm text-text-tertiary mb-4">
            You can retry in {countdown} seconds
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {errorInfo.actionLabel && countdown === 0 && (
            <button
              onClick={handleAction}
              disabled={isRetrying}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                'bg-interactive-600 text-white hover:bg-interactive-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isRetrying ? 'Please wait...' : errorInfo.actionLabel}
            </button>
          )}
          
          {customActions?.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                action.variant === 'primary'
                  ? 'bg-interactive-600 text-white hover:bg-interactive-500'
                  : 'bg-background-surface text-text-primary hover:bg-background-elevated border border-border-subtle',
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Fullscreen variant
  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-[400px] p-8 text-center',
      className,
    )}>
      {/* Large Icon */}
      <div className={cn(
        'w-16 h-16 rounded-full flex items-center justify-center mb-6 text-2xl',
        errorInfo.severity === 'error' && 'bg-red-500/10 text-red-500',
        errorInfo.severity === 'warning' && 'bg-yellow-500/10 text-yellow-500',
        errorInfo.severity === 'info' && 'bg-blue-500/10 text-blue-500',
      )}>
        {errorInfo.severity === 'error' && '✕'}
        {errorInfo.severity === 'warning' && '⚠'}
        {errorInfo.severity === 'info' && 'ℹ'}
      </div>

      <h2 className="text-2xl font-bold text-text-primary mb-3">
        {errorInfo.title}
      </h2>
      <p className="text-text-secondary max-w-md mb-2">
        {errorInfo.description}
      </p>
      {errorInfo.suggestion && (
        <p className="text-sm text-text-tertiary max-w-md mb-6">
          💡 {errorInfo.suggestion}
        </p>
      )}

      {countdown > 0 && (
        <p className="text-sm text-text-tertiary mb-6">
          You can retry in {countdown} seconds
        </p>
      )}

      <div className="flex flex-wrap gap-3 justify-center">
        {errorInfo.actionLabel && countdown === 0 && (
          <button
            onClick={handleAction}
            disabled={isRetrying}
            className={cn(
              'px-6 py-3 rounded-lg font-medium transition-colors',
              'bg-interactive-600 text-white hover:bg-interactive-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isRetrying ? 'Please wait...' : errorInfo.actionLabel}
          </button>
        )}
        
        {customActions?.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={cn(
              'px-6 py-3 rounded-lg font-medium transition-colors',
              action.variant === 'primary'
                ? 'bg-interactive-600 text-white hover:bg-interactive-500'
                : 'bg-background-surface text-text-primary hover:bg-background-elevated border border-border-subtle',
            )}
          >
            {action.label}
          </button>
        ))}

        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-3 rounded-lg font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

export default ErrorRecovery;
