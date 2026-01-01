'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRedirectToast } from '@/hooks/useRedirectToast';

/**
 * Coach Redirect Page
 * 
 * Redirects to /dashboard/create?tab=coach
 * Preserves any existing query params.
 * Shows one-time toast notification about the move.
 * 
 * Part of UX Consolidation 2025 - Task 2.8
 */
export default function CoachRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, dismissToast, message } = useRedirectToast('coach');

  useEffect(() => {
    // Build the new URL, preserving any existing query params
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'coach');
    
    // Use replace for soft redirect (307-like behavior, doesn't add to history)
    router.replace(`/dashboard/studio?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background-base">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-interactive-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-text-secondary">Redirecting...</p>
      </div>
      
      {showToast && (
        <div 
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-background-surface border border-border-subtle rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2 duration-300"
          role="alert"
        >
          <span className="text-interactive-400">ℹ️</span>
          <span className="text-sm text-text-primary">{message}</span>
          <button
            onClick={dismissToast}
            className="ml-2 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
