'use client';

/**
 * Intel Layout
 * 
 * Main layout for Creator Intel - THE NEW HOME
 * Includes persistent header with stats, quick actions, and usage.
 * Uses dashboard authentication wrapper.
 * 
 * @module app/intel/layout
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@aurastream/shared';
import { useBrandKits } from '@aurastream/api-client';
import { useUsageStats } from '@/hooks/useUsageStats';
import { IntelLayoutHeader } from '@/components/intel/IntelLayoutHeader';
import { IntelTabs } from '@/components/intel/IntelTabs';
import { LoadingState } from '@/components/dashboard';
import { CelebrationOverlay } from '@/components/celebrations/CelebrationOverlay';
import { UndoToastContainer } from '@/components/undo';

const DASHBOARD_BACKGROUND_URL = 'https://qgyvdadgdomnubngfpun.supabase.co/storage/v1/object/public/streamer-studio-assets/landing/dashboard-background.jpeg';

interface IntelLayoutProps {
  children: React.ReactNode;
}

export default function IntelLayout({ children }: IntelLayoutProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: brandKitsData } = useBrandKits();
  const { data: usageData } = useUsageStats();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <LoadingState message="Loading..." size="lg" />
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const brandKits = brandKitsData?.brandKits ?? [];
  const isPremium = user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'studio';
  const assetsUsed = usageData?.generationsUsed ?? user?.assetsGeneratedThisMonth ?? 0;
  const assetsLimit = usageData?.generationsLimit ?? (isPremium ? -1 : 10);

  // Stats for header
  const headerStats = {
    assetsThisMonth: assetsUsed,
    assetsLimit: assetsLimit,
    brandKitCount: brandKits.length,
    tier: user?.subscriptionTier || 'free',
    displayName: user?.displayName || 'Creator',
  };

  return (
    <div className="min-h-screen bg-background-primary relative">
      {/* Dashboard background image - dimmed for better readability */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: `url(${DASHBOARD_BACKGROUND_URL})`,
          opacity: 0.18,
        }}
      />
      
      {/* Overlay for readability */}
      <div className="fixed inset-0 bg-gradient-to-br from-background-primary/70 via-background-primary/60 to-background-primary/80 pointer-events-none" />
      
      {/* Persistent Header with Stats */}
      <div className="relative z-10">
        <IntelLayoutHeader 
          stats={headerStats}
          isLoading={false}
          onCreateAsset={() => router.push('/intel/create')}
          onOpenSettings={() => router.push('/intel/settings')}
        />
      </div>
      
      {/* Intel Navigation Tabs */}
      <div className="border-b border-border-primary bg-background-secondary/50 backdrop-blur-sm sticky top-0 z-40 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <IntelTabs />
        </div>
      </div>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {children}
      </main>
      
      {/* Overlays */}
      <CelebrationOverlay />
      <UndoToastContainer />
    </div>
  );
}
