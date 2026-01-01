'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { useBrandKits } from '@aurastream/api-client';
import { PageContainer } from '@/components/dashboard';
import { VibeBrandingModal } from '@/components/vibe-branding';
import { BrandKitSuite } from '@/components/brand-kit';
import { BrandStudioLanding, QuickSetupWizard } from '@/components/brand-studio';
import { AsyncErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorRecovery } from '@/components/ErrorRecovery';
import { BrandKitCardSkeleton } from '@/components/ui/skeletons';
import { showSuccessToast, showErrorToast } from '@/utils/errorMessages';

/**
 * Brand Studio Page - Enterprise UX
 * 
 * Three views:
 * 1. Landing - Path selection + existing kits grid
 * 2. Quick Setup - Simplified creation wizard
 * 3. Editor - Full brand kit editing (BrandKitSuite)
 * 
 * Plus: Vibe Branding modal overlay
 */

type PageView = 'landing' | 'quick-setup' | 'editor';

export default function BrandKitsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, isLoading, error, refetch } = useBrandKits();
  
  // Determine view from URL params
  const editingId = searchParams.get('id');
  const isNewParam = searchParams.get('new') === 'true';
  const modeParam = searchParams.get('mode');
  
  // State
  const [showVibeBranding, setShowVibeBranding] = useState(false);
  
  // Determine current view
  const getView = (): PageView => {
    if (editingId) return 'editor';
    if (isNewParam && modeParam !== 'vibe') return 'quick-setup';
    return 'landing';
  };
  
  const view = getView();

  // Handle ?vibe=true or ?new=true&mode=vibe to auto-open modal
  useEffect(() => {
    if (searchParams.get('vibe') === 'true' || modeParam === 'vibe') {
      setShowVibeBranding(true);
      // Clean up URL
      router.replace('/dashboard/brand-kits');
    }
  }, [searchParams, modeParam, router]);

  // Navigation handlers
  const handleOpenVibeBranding = useCallback(() => {
    setShowVibeBranding(true);
  }, []);

  const handleOpenQuickSetup = useCallback(() => {
    router.push('/dashboard/brand-kits?new=true');
  }, [router]);

  const handleEditKit = useCallback((id: string) => {
    router.push(`/dashboard/brand-kits?id=${id}`);
  }, [router]);

  const handleBackToLanding = useCallback(() => {
    router.push('/dashboard/brand-kits');
  }, [router]);

  const handleQuickSetupComplete = useCallback((brandKitId: string) => {
    router.push('/dashboard/brand-kits');
    refetch();
  }, [router, refetch]);

  const handleVibeKitCreated = useCallback((kitId?: string) => {
    setShowVibeBranding(false);
    refetch();
    
    showSuccessToast('Brand kit created from image!', {
      description: 'Your brand colors and style have been extracted',
      actionLabel: 'Edit Brand Kit',
      onAction: () => {
        if (kitId) {
          router.push(`/dashboard/brand-kits?id=${kitId}`);
        }
      },
    });
  }, [refetch, router]);

  // Loading state
  if (isLoading && view === 'landing') {
    return (
      <PageContainer title="Brand Studio" description="Manage your brand identities">
        <div className="space-y-10">
          {/* Path cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-background-surface/50 rounded-2xl animate-pulse" />
            <div className="h-64 bg-background-surface/50 rounded-2xl animate-pulse" />
          </div>
          {/* Brand kits skeleton */}
          <BrandKitCardSkeleton count={4} />
        </div>
      </PageContainer>
    );
  }

  // Error state
  if (error && view === 'landing') {
    return (
      <PageContainer title="Brand Studio" description="Manage your brand identities">
        <ErrorRecovery
          error={error}
          onRetry={() => { refetch(); }}
          variant="card"
        />
      </PageContainer>
    );
  }

  // Editor view (existing BrandKitSuite)
  if (view === 'editor') {
    return (
      <AsyncErrorBoundary 
        resourceName="Brand Kit Editor" 
        onRefetch={handleBackToLanding}
      >
        <div className="min-h-screen bg-background-base">
          {/* Back button header */}
          <div className="border-b border-border-subtle bg-background-surface/50">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <button
                onClick={handleBackToLanding}
                className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Brand Studio
              </button>
            </div>
          </div>
          
          {/* Brand Kit Suite */}
          <div className="p-8">
            <BrandKitSuite brandKitId={editingId || undefined} />
          </div>
        </div>
      </AsyncErrorBoundary>
    );
  }

  // Quick Setup view
  if (view === 'quick-setup') {
    return (
      <PageContainer title="Brand Studio" description="Create a new brand kit">
        <div className="max-w-2xl mx-auto">
          <QuickSetupWizard
            onComplete={handleQuickSetupComplete}
            onCancel={handleBackToLanding}
          />
        </div>
      </PageContainer>
    );
  }

  // Landing view (default)
  return (
    <PageContainer 
      title="Brand Studio" 
      description="Create and manage your brand identities for consistent asset generation"
    >
      <BrandStudioLanding
        onOpenVibeBranding={handleOpenVibeBranding}
        onOpenQuickSetup={handleOpenQuickSetup}
        onEditKit={handleEditKit}
      />

      {/* Vibe Branding Modal */}
      <VibeBrandingModal
        isOpen={showVibeBranding}
        onClose={() => setShowVibeBranding(false)}
        onKitCreated={handleVibeKitCreated}
      />
    </PageContainer>
  );
}
