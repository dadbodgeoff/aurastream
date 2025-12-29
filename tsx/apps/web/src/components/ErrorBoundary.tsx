/**
 * Enterprise Error Boundary System
 * 
 * Component-level error boundaries with recovery suggestions,
 * and user-friendly error display.
 * 
 * @module components/ErrorBoundary
 */

'use client';

import React, { Component, ErrorInfo, ReactNode, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

/**
 * Error recovery action configuration.
 */
export interface ErrorRecoveryAction {
  /** Button label */
  label: string;
  /** Action handler */
  onClick: () => void;
  /** Whether this is the primary action */
  primary?: boolean;
}

/**
 * Error boundary props.
 */
export interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Custom fallback component */
  fallback?: ReactNode | ((props: ErrorFallbackProps) => ReactNode);
  /** Error boundary name for analytics */
  name?: string;
  /** Custom recovery actions */
  recoveryActions?: ErrorRecoveryAction[];
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show error details (dev mode) */
  showDetails?: boolean;
  /** Custom error message */
  errorMessage?: string;
  /** Compact mode for inline components */
  compact?: boolean;
}

/**
 * Error boundary state.
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

/**
 * Props passed to fallback components.
 */
export interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  reset: () => void;
  retryCount: number;
  name?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_RETRY_COUNT = 3;

// ============================================================================
// Error Boundary Class Component
// ============================================================================

/**
 * Enterprise-grade error boundary with analytics, recovery, and user feedback.
 * 
 * Features:
 * - Catches JavaScript errors in child component tree
 * - Logs errors to analytics
 * - Provides retry mechanism with count limit
 * - Customizable fallback UI
 * - Recovery action buttons
 * - Compact mode for inline components
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <ErrorBoundary name="BrandKitForm">
 *   <BrandKitForm />
 * </ErrorBoundary>
 * 
 * // With custom recovery actions
 * <ErrorBoundary
 *   name="AssetGenerator"
 *   recoveryActions={[
 *     { label: 'Go to Dashboard', onClick: () => router.push('/dashboard') },
 *   ]}
 * >
 *   <AssetGenerator />
 * </ErrorBoundary>
 * 
 * // Compact mode for inline components
 * <ErrorBoundary name="UserAvatar" compact>
 *   <UserAvatar />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { name, onError } = this.props;

    // Update state with error info
    this.setState({ errorInfo });

    // Log error to console
    console.error(`[ErrorBoundary:${name || 'unknown'}]`, error, errorInfo.componentStack);

    // Call custom error handler
    onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ErrorBoundary:${name || 'unknown'}]`, error);
      console.error('Component Stack:', errorInfo.componentStack);
    }
  }

  reset = (): void => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { children, fallback, name, recoveryActions, showDetails, errorMessage, compact } = this.props;

    if (hasError) {
      // Custom fallback component
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback({ error, errorInfo, reset: this.reset, retryCount, name });
        }
        return fallback;
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          reset={this.reset}
          retryCount={retryCount}
          name={name}
          recoveryActions={recoveryActions}
          showDetails={showDetails}
          errorMessage={errorMessage}
          compact={compact}
          maxRetries={MAX_RETRY_COUNT}
        />
      );
    }

    return children;
  }
}

// ============================================================================
// Default Error Fallback Component
// ============================================================================

interface DefaultErrorFallbackProps extends ErrorFallbackProps {
  recoveryActions?: ErrorRecoveryAction[];
  showDetails?: boolean;
  errorMessage?: string;
  compact?: boolean;
  maxRetries: number;
}

function DefaultErrorFallback({
  error,
  reset,
  retryCount,
  name,
  recoveryActions,
  showDetails,
  errorMessage,
  compact,
  maxRetries,
}: DefaultErrorFallbackProps): JSX.Element {
  const [showStack, setShowStack] = useState(false);
  const canRetry = retryCount < maxRetries;

  const handleRetry = useCallback(() => {
    if (canRetry) {
      reset();
    }
  }, [canRetry, reset]);

  // Compact mode for inline components
  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
        <span className="text-red-500 text-sm">⚠️</span>
        <span className="text-sm text-red-600">Failed to load</span>
        {canRetry && (
          <button
            onClick={handleRetry}
            className="text-sm text-red-600 underline hover:no-underline"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-red-500/5 border border-red-500/20">
      {/* Error Icon */}
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      {/* Error Title */}
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        Something went wrong
      </h3>

      {/* Error Message */}
      <p className="text-sm text-text-secondary text-center max-w-md mb-4">
        {errorMessage || "We couldn't load this section. This has been logged and we're looking into it."}
      </p>

      {/* Retry Count Warning */}
      {retryCount > 0 && retryCount < maxRetries && (
        <p className="text-xs text-yellow-600 mb-4">
          Retry attempt {retryCount} of {maxRetries}
        </p>
      )}

      {/* Max Retries Reached */}
      {!canRetry && (
        <p className="text-xs text-red-600 mb-4">
          Maximum retry attempts reached. Please refresh the page or contact support.
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        {canRetry && (
          <button
            onClick={handleRetry}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              'bg-interactive-600 text-white hover:bg-interactive-500',
              'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:ring-offset-2',
            )}
          >
            Try again
          </button>
        )}

        {recoveryActions?.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              action.primary
                ? 'bg-interactive-600 text-white hover:bg-interactive-500'
                : 'bg-background-surface text-text-primary hover:bg-background-elevated border border-border-subtle',
              'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:ring-offset-2',
            )}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Error Details (Development) */}
      {(showDetails || process.env.NODE_ENV === 'development') && error && (
        <div className="mt-4 w-full max-w-lg">
          <button
            onClick={() => setShowStack(!showStack)}
            className="text-xs text-text-tertiary hover:text-text-secondary underline"
          >
            {showStack ? 'Hide' : 'Show'} error details
          </button>

          {showStack && (
            <div className="mt-2 p-3 rounded-lg bg-background-base border border-border-subtle overflow-auto max-h-48">
              <p className="text-xs font-mono text-red-500 mb-2">
                {error.name}: {error.message}
              </p>
              {name && (
                <p className="text-xs text-text-tertiary mb-2">
                  Boundary: {name}
                </p>
              )}
              <pre className="text-xs font-mono text-text-tertiary whitespace-pre-wrap">
                {error.stack}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Functional Wrapper Hook
// ============================================================================

/**
 * Hook to create error boundary reset functionality in functional components.
 */
export function useErrorBoundary(): {
  showBoundary: (error: Error) => void;
} {
  const [, setError] = useState<Error | null>(null);

  const showBoundary = useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);

  return { showBoundary };
}

// ============================================================================
// Specialized Error Boundaries
// ============================================================================

/**
 * Error boundary for form components with form-specific recovery.
 */
export function FormErrorBoundary({
  children,
  onReset,
  formName,
}: {
  children: ReactNode;
  onReset?: () => void;
  formName?: string;
}): JSX.Element {
  return (
    <ErrorBoundary
      name={`Form:${formName || 'unknown'}`}
      errorMessage="There was a problem with this form. Your data may not have been saved."
      recoveryActions={
        onReset
          ? [{ label: 'Reset Form', onClick: onReset }]
          : undefined
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Error boundary for async data components.
 */
export function AsyncErrorBoundary({
  children,
  onRefetch,
  resourceName,
}: {
  children: ReactNode;
  onRefetch?: () => void;
  resourceName?: string;
}): JSX.Element {
  return (
    <ErrorBoundary
      name={`Async:${resourceName || 'unknown'}`}
      errorMessage={`Failed to load ${resourceName || 'data'}. Please try again.`}
      recoveryActions={
        onRefetch
          ? [{ label: 'Refresh Data', onClick: onRefetch, primary: true }]
          : undefined
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Error boundary for modal/dialog components.
 */
export function ModalErrorBoundary({
  children,
  onClose,
  modalName,
}: {
  children: ReactNode;
  onClose?: () => void;
  modalName?: string;
}): JSX.Element {
  return (
    <ErrorBoundary
      name={`Modal:${modalName || 'unknown'}`}
      errorMessage="This dialog encountered an error."
      compact
      recoveryActions={
        onClose
          ? [{ label: 'Close', onClick: onClose }]
          : undefined
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
