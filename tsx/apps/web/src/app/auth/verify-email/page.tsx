'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { showErrorToast, showSuccessToast } from '@/utils/errorMessages';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorRecovery } from '@/components/ErrorRecovery';

type VerificationStatus = 'loading' | 'success' | 'error' | 'invalid';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [message, setMessage] = useState('');
  const [apiError, setApiError] = useState<Error | null>(null);

  const verifyEmail = useCallback(async (token: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/v1/auth/email/verify/${token}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        setStatus('success');
        setMessage('Your email has been verified successfully!');
        showSuccessToast('Email verified!', {
          description: 'You can now sign in to your account.',
          actionLabel: 'Sign in',
          onAction: () => router.push('/login'),
        });
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login?verified=true');
        }, 3000);
      } else {
        const data = await response.json().catch(() => ({}));
        setStatus('error');
        const errorMessage = data.detail?.message || data.message || 'Verification failed. The link may have expired.';
        setApiError(new Error(errorMessage));
        setMessage(errorMessage);
        showErrorToast(data, {
          onNavigate: (path) => router.push(path),
        });
      }
    } catch (error) {
      setStatus('error');
      const errorMessage = 'An error occurred while verifying your email. Please try again.';
      setApiError(error instanceof Error ? error : new Error(errorMessage));
      setMessage(errorMessage);
      showErrorToast(error, {
        onRetry: () => verifyEmail(token),
      });
    }
  }, [router]);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('invalid');
      setMessage('Invalid verification link. Please check your email for the correct link.');
      return;
    }

    verifyEmail(token);
  }, [searchParams, verifyEmail]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-base px-4">
      <div className="max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="w-12 h-12 border-4 border-interactive-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <h1 className="text-xl font-semibold text-text-primary">Verifying your email...</h1>
            <p className="text-text-secondary">Please wait while we verify your email address.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-success-dark/20 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-success-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-text-primary">Email Verified!</h1>
            <p className="text-text-secondary">{message}</p>
            <p className="text-sm text-text-tertiary">Redirecting to login...</p>
            <Link
              href="/login"
              className="inline-block mt-4 px-6 py-3 min-h-[44px] bg-interactive-600 text-white rounded-lg hover:bg-interactive-500 transition-colors font-medium"
            >
              Sign in now
            </Link>
          </div>
        )}

        {status === 'error' && apiError && (
          <ErrorRecovery
            error={apiError}
            variant="fullscreen"
            onRetry={() => {
              const token = searchParams.get('token');
              if (token) {
                setStatus('loading');
                verifyEmail(token);
              }
            }}
            customActions={[
              {
                label: 'Request new link',
                onClick: () => router.push('/login'),
                variant: 'secondary',
              },
            ]}
          />
        )}

        {status === 'invalid' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-error-dark/20 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-error-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-text-primary">Invalid Link</h1>
            <p className="text-text-secondary">{message}</p>
            <p className="text-sm text-text-tertiary mt-2">
              💡 Check your email for the correct verification link, or request a new one.
            </p>
            <div className="pt-4 space-y-2">
              <Link
                href="/login"
                className="block w-full px-4 py-3 min-h-[44px] bg-interactive-600 text-white rounded-lg hover:bg-interactive-500 transition-colors font-medium"
              >
                Go to Login
              </Link>
              <Link
                href="/"
                className="block w-full px-4 py-3 min-h-[44px] text-text-secondary hover:text-text-primary transition-colors"
              >
                Return Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-base px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <Skeleton width={48} height={48} rounded="full" className="mx-auto" aria-label="Loading icon" />
        <Skeleton className="h-6 w-48 mx-auto" aria-label="Loading title" />
        <Skeleton className="h-4 w-64 mx-auto" aria-label="Loading description" />
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
