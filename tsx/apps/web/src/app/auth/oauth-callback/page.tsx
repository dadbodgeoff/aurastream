'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type CallbackStatus = 'processing' | 'success' | 'error';

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    // Handle OAuth error
    if (error) {
      setStatus('error');
      setErrorMessage(errorDescription || `OAuth error: ${error}`);
      return;
    }

    // Validate required parameters
    if (!code || !state) {
      setStatus('error');
      setErrorMessage('Invalid OAuth callback. Missing required parameters.');
      return;
    }

    // The backend handles the actual token exchange via the callback endpoint
    // which sets cookies. We just need to redirect to the dashboard.
    // The backend callback should have already processed the code and state.
    
    // Check if we have a session by trying to fetch user info
    const checkSession = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          setStatus('success');
          // Redirect to intel (main app) after brief success message
          setTimeout(() => {
            router.push('/intel');
          }, 1500);
        } else {
          // Session not established, might need to complete OAuth flow
          setStatus('error');
          setErrorMessage('Failed to establish session. Please try signing in again.');
        }
      } catch (error) {
        setStatus('error');
        setErrorMessage('An error occurred during sign in. Please try again.');
      }
    };

    checkSession();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-base px-4">
      <div className="max-w-md w-full text-center">
        {status === 'processing' && (
          <div className="space-y-4">
            <div className="w-12 h-12 border-4 border-interactive-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <h1 className="text-xl font-semibold text-text-primary">Completing sign in...</h1>
            <p className="text-text-secondary">Please wait while we finish setting up your session.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-text-primary">Sign in successful!</h1>
            <p className="text-text-secondary">Redirecting to your workspace...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-text-primary">Sign in failed</h1>
            <p className="text-text-secondary">{errorMessage}</p>
            <div className="pt-4 space-y-2">
              <Link
                href="/auth/login"
                className="block w-full px-4 py-2 bg-interactive-600 text-white rounded-lg hover:bg-interactive-500 transition-colors"
              >
                Try Again
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

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OAuthCallbackContent />
    </Suspense>
  );
}
