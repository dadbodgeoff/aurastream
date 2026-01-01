'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Create Page Redirect
 * 
 * Redirects to /dashboard/studio (the new Create Studio).
 * Preserves any existing query params (tab, platform, etc.).
 * 
 * This ensures old bookmarks and links continue to work.
 */
export default function CreateRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Preserve all query params when redirecting
    const params = searchParams.toString();
    const redirectUrl = params 
      ? `/dashboard/studio?${params}` 
      : '/dashboard/studio';
    
    // Use replace to avoid adding to history
    router.replace(redirectUrl);
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background-base">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-interactive-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-text-secondary">Redirecting to Create Studio...</p>
      </div>
    </div>
  );
}
