'use client';

/**
 * Dashboard Overview Page
 * 
 * REDIRECTS TO /intel - Creator Intel is now the home
 * 
 * @module app/dashboard/page
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/components/dashboard';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new Creator Intel home
    router.replace('/intel');
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingState message="Redirecting to Creator Intel..." size="lg" />
    </div>
  );
}
