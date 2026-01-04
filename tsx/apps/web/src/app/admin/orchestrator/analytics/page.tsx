'use client';

/**
 * Orchestrator Analytics Page
 * Placeholder - redirects to main analytics
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OrchestratorAnalyticsPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/admin/analytics');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );
}
