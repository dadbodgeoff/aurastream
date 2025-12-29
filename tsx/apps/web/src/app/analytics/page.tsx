'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect old analytics page to new dashboard
 */
export default function AnalyticsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/analytics');
  }, [router]);

  return (
    <div className="min-h-screen bg-background-base flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-interactive-600 mx-auto mb-4" />
        <p className="text-text-secondary">Redirecting to analytics dashboard...</p>
      </div>
    </div>
  );
}
