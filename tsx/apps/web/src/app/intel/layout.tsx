'use client';

/**
 * Intel Layout - Unified App Shell
 * 
 * THE primary layout for AuraStream. All authenticated routes use this.
 * Includes:
 * - Persistent header with stats and quick actions
 * - Unified navigation tabs
 * - Onboarding support
 * - Social hub
 * - Celebrations and undo system
 * 
 * @module app/intel/layout
 */

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@aurastream/shared';
import { useBrandKits } from '@aurastream/api-client';
import { useUsageStats } from '@/hooks/useUsageStats';
import { IntelLayoutHeader } from '@/components/intel/IntelLayoutHeader';
import { IntelTabs } from '@/components/intel/IntelTabs';
import { LoadingState } from '@/components/dashboard';
import { CelebrationOverlay } from '@/components/celebrations/CelebrationOverlay';
import { OnboardingProvider } from '@/providers/OnboardingProvider';
import { UndoToastContainer } from '@/components/undo';
import { SocialHub } from '@/components/social/SocialHub';

const DASHBOARD_BACKGROUND_URL = 'https://qgyvdadgdomnubngfpun.supabase.co/storage/v1/object/public/streamer-studio-assets/landing/dashboard-background.jpeg';

interface IntelLayoutProps {
  children: React.ReactNode;
}

export default function IntelLayout({ children }: IntelLayoutProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: brandKitsData } = useBrandKits();
  const { data: usageData } = useUsageStats();
  
  // Track if redirect has been initiated to prevent race conditions
  const isRedirectingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Only redirect once and only when auth is definitively not authenticated
    if (!authLoading && !isAuthenticated && !isRedirectingRef.current && isMountedRef.current) {
      isRedirectingRef.current = true;
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
  const isPremium = user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'studio' || user?.subscriptionTier === 'unlimited';
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
    <OnboardingProvider>
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
        
        {/* Unified Header + Tabs */}
        <div className="sticky top-0 z-40 relative">
          {/* Header */}
          <IntelLayoutHeader 
            stats={headerStats}
            isLoading={false}
            onCreateAsset={() => router.push('/intel/create')}
            onOpenSettings={() => router.push('/intel/settings')}
          />
          
          {/* Navigation Tabs */}
          <div className="bg-background-secondary/40 backdrop-blur-xl border-b border-white/[0.06]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <IntelTabs />
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
          {children}
        </main>
        
        {/* Overlays & Features */}
        <CelebrationOverlay />
        <UndoToastContainer />
        {user?.id && <SocialHub currentUserId={user.id} />}
      </div>
    </OnboardingProvider>
  );
}
