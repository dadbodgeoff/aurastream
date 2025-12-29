'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log error to console in development
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background-base">
      <h1 className="text-4xl font-bold text-text-primary">500</h1>
      <p className="mt-4 text-text-secondary">Something went wrong</p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-interactive-600 px-4 py-2 text-white hover:bg-interactive-500"
      >
        Try again
      </button>
    </div>
  );
}
