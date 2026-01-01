'use client';

/**
 * Dashboard Intel Page - Redirects to /intel
 * 
 * This page is deprecated. All Creator Intel functionality
 * has been consolidated into the /intel/* routes.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardIntelPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/intel');
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-interactive-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">Redirecting to Creator Intel...</p>
      </div>
    </div>
  );
}
