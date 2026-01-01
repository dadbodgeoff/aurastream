'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useIntelPreferences } from '@aurastream/api-client';
import { useIntelStore } from '@/stores/intelStore';
import { IntelDashboard } from '@/components/intel/IntelDashboard';
import { IntelOnboarding } from '@/components/intel/IntelOnboarding';
import { IntelSkeleton } from '@/components/intel/IntelSkeleton';
import { IntelEmptyState } from '@/components/intel/IntelEmptyState';
import { PageContainer } from '@/components/dashboard';
import type { IntelTab } from '@/components/intel/IntelTabs';

// =============================================================================
// Tab Mapping
// =============================================================================

const TAB_MAP: Record<string, IntelTab> = {
  overview: 'overview',
  twitch: 'twitch',
  youtube: 'youtube',
  clips: 'clips',
  // Legacy redirects
  trends: 'overview',
};

// =============================================================================
// Main Page
// =============================================================================

export default function CreatorIntelPage() {
  const searchParams = useSearchParams();
  const { data: preferences, isLoading, error } = useIntelPreferences();
  const syncFromServer = useIntelStore(state => state.syncFromServer);
  const subscribedCategories = useIntelStore(state => state.subscribedCategories);
  
  // Get tab from URL query param
  const tabParam = searchParams.get('tab') || 'overview';
  const initialTab = TAB_MAP[tabParam] || 'overview';
  
  // Sync server state to Zustand store
  useEffect(() => {
    if (preferences) {
      syncFromServer(preferences);
    }
  }, [preferences, syncFromServer]);
  
  // Loading state
  if (isLoading) {
    return (
      <PageContainer>
        <IntelSkeleton />
      </PageContainer>
    );
  }
  
  // Error state
  if (error) {
    return (
      <PageContainer>
        <IntelEmptyState
          variant="error"
          title="Something went wrong"
          description="We couldn't load your Creator Intel dashboard."
          actionLabel="Try Again"
          onAction={() => window.location.reload()}
        />
      </PageContainer>
    );
  }
  
  // Show onboarding if no categories subscribed
  const hasCategories = subscribedCategories.length > 0;
  
  if (!hasCategories) {
    return (
      <PageContainer>
        <IntelOnboarding />
      </PageContainer>
    );
  }
  
  // Main dashboard
  return (
    <PageContainer>
      <IntelDashboard initialTab={initialTab} />
    </PageContainer>
  );
}
