'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type VerificationStatus = 'loading' | 'success' | 'error' | 'invalid';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('invalid');
      setMessage('Invalid verification link. Please check your email for the correct link.');
      return;
    }

    const verifyEmail = async () => {
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
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/auth/login?verified=true');
          }, 3000);
        } else {
          const data = await response.json().catch(() => ({}));
          setStatus('error');
          setMessage(data.detail?.message || data.message || 'Verification failed. The link may have expired.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred while verifying your email. Please try again.');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

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
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-text-primary">Email Verified!</h1>
            <p className="text-text-secondary">{message}</p>
            <p className="text-sm text-text-tertiary">Redirecting to login...</p>
          </div>
        )}

        {(status === 'error' || status === 'invalid') && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-text-primary">Verification Failed</h1>
            <p className="text-text-secondary">{message}</p>
            <div className="pt-4 space-y-2">
              <Link
                href="/auth/login"
                className="block w-full px-4 py-2 bg-interactive-600 text-white rounded-lg hover:bg-interactive-500 transition-colors"
              >
                Go to Login
              </Link>
              <Link
                href="/"
                className="block w-full px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
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
        <div className="w-12 h-12 border-4 border-interactive-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h1 className="text-xl font-semibold text-text-primary">Loading...</h1>
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
