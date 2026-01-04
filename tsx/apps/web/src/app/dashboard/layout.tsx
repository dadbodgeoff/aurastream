'use client';

/**
 * Dashboard Layout - Redirect to Intel
 * 
 * The dashboard has been unified into the Intel experience.
 * This layout redirects all /dashboard/* routes to /intel/*.
 */

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@aurastream/shared';
import { LoadingState } from '@/components/dashboard';

// Route mapping from old dashboard to new intel
const ROUTE_MAP: Record<string, string> = {
  '/dashboard': '/intel',
  '/dashboard/studio': '/intel/create',
  '/dashboard/create': '/intel/create',
  '/dashboard/brand-kits': '/intel/brand-kits',
  '/dashboard/assets': '/intel/assets',
  '/dashboard/intel': '/intel',
  '/dashboard/profile-creator': '/intel/logos',
  '/dashboard/aura-lab': '/intel/aura-lab',
  '/dashboard/settings': '/intel/settings',
  '/dashboard/quick-create': '/intel/create',
  '/dashboard/generate': '/intel/generate',
  '/dashboard/coach': '/intel/create',
  '/dashboard/twitch': '/intel/create',
  '/dashboard/trends': '/intel/observatory',
  '/dashboard/clip-radar': '/intel/observatory',
  '/dashboard/playbook': '/intel',
  '/dashboard/templates': '/intel/create',
  '/dashboard/analytics': '/intel/settings',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Find the best matching redirect
    let redirectTo = '/intel';
    
    // Check exact match first
    if (ROUTE_MAP[pathname]) {
      redirectTo = ROUTE_MAP[pathname];
    } else {
      // Check prefix matches
      for (const [oldPath, newPath] of Object.entries(ROUTE_MAP)) {
        if (pathname.startsWith(oldPath + '/')) {
          // Preserve the rest of the path
          const suffix = pathname.slice(oldPath.length);
          redirectTo = newPath + suffix;
          break;
        }
      }
    }

    router.replace(redirectTo);
  }, [isLoading, isAuthenticated, pathname, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-background-default flex items-center justify-center">
      <LoadingState message="Redirecting..." size="lg" />
    </div>
  );
}
