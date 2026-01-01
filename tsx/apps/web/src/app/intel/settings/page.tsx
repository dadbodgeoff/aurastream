'use client';

/**
 * Intel Settings Page
 * 
 * Redirects to the dashboard settings page.
 * TODO: Migrate settings to /intel/settings
 */

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingState } from '@/components/dashboard';

export default function IntelSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const params = searchParams.toString();
    const url = params ? `/dashboard/settings?${params}` : '/dashboard/settings';
    router.replace(url);
  }, [router, searchParams]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingState message="Loading settings..." size="lg" />
    </div>
  );
}
